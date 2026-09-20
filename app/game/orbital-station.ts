import type { OrbitBand } from "./celestial-terrain";
import { locationId, parseLocationId, type LocationId, type UniverseId } from "./location-address";
import { assertExactKeys, canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

export const STATION_PERMISSIONS = ["build", "container", "airlock", "dock", "waylink", "life-support", "administer"] as const;
export const STATION_GRANTS = ["private", "trusted", "faction", "public"] as const;
export const STATION_JOURNAL_LIMIT = 128;
export type StationPermission = typeof STATION_PERMISSIONS[number];
export type StationGrant = typeof STATION_GRANTS[number];
export type StationAccess = Record<StationPermission, StationGrant>;
export type StationPosition = [number, number, number];
/** Supplied by authenticated host membership authority, never by a guest's request. */
export type StationActor = { actorId: string; factionIds: string[]; guildIds: string[] };
export type StationAssociation = { kind: "faction" | "guild"; id: string } | null;
export type StationDock = {
  id: string; position: StationPosition; placementReceiptId: string;
  occupant: { vehicleId: string; ownerId: string; vehicleRevision: number } | null;
};
/** References only: actual gas and Wayanchor energy/leases remain in their existing authorities. */
export type StationWayanchorLease = { anchorId: string; leaseId: string; locationId: LocationId };
export type OrbitalStation = {
  id: string; universeId: UniverseId; locationId: LocationId; band: OrbitBand;
  corePosition: StationPosition; corePlacementReceiptId: string; name: string; icon: string;
  ownerId: string; memberIds: string[]; association: StationAssociation; access: StationAccess;
  docks: Record<string, StationDock>; pressureZoneIds: string[]; wayanchorLeases: StationWayanchorLease[]; revision: number;
};
export type StationReceipt = { actionId: string; stationId: string; revision: number; binding: string };
export type StationRegistrySave = {
  schema: 1; universeId: UniverseId; locationId: LocationId; revision: number;
  stations: Record<string, OrbitalStation>; journal: StationReceipt[];
};
/**
 * Trusted adapter evidence, not proof supplied by a guest. The host validates ordinary
 * placement, inventory debit, claim bounds and collision rules, and atomically commits
 * those writes with this registry. This module neither places blocks nor establishes
 * physical existence. A core receipt includes the first normally placed docking collar.
 */
export type StationPlacementReceipt = {
  receiptId: string; actorId: string; locationId: LocationId; expectedRevision: number;
  kind: "core" | "docking-collar"; position: StationPosition;
};
export type StationVehicleEvidence = { vehicleId: string; ownerId: string; locationId: LocationId; revision: number };
export type StationActionContext = {
  actor: StationActor; locationId: LocationId; expectedRevision: number;
  placements?: StationPlacementReceipt[]; vehicle?: StationVehicleEvidence;
};
type ActionBase = { actionId: string; stationId: string };
export type StationAction = ActionBase & (
  | { type: "create"; band: OrbitBand; name: string; icon: string; coreReceiptId: string; dockId: string; dockReceiptId: string }
  | { type: "rename"; name: string; icon: string }
  | { type: "access"; memberIds: string[]; association: StationAssociation; access: StationAccess }
  | { type: "habitat"; pressureZoneIds: string[]; wayanchorLeases: StationWayanchorLease[] }
  | { type: "register-dock"; dockId: string; placementReceiptId: string }
  | { type: "dock" | "undock"; dockId: string; vehicleId: string; vehicleRevision: number }
);
export type StationActionResult = { registry: StationRegistrySave; station: OrbitalStation; receipt: StationReceipt; replayed: boolean };

function fail(message: string): never { throw new Error(`Station: ${message}`); }
function exact(value: unknown, keys: readonly string[], label: string): asserts value is Record<string, unknown> {
  if (!isUniverseRecord(value)) fail(`invalid ${label}.`);
  assertExactKeys(value, keys, `Station ${label}`);
}
function token(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$/.test(value)
    || ["__proto__", "constructor", "prototype"].includes(value)) fail(`invalid ${label}.`);
}
function integer(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) fail(`invalid ${label}.`);
}
function position(value: unknown): asserts value is StationPosition {
  if (!Array.isArray(value) || value.length !== 3 || value.some(v => !Number.isSafeInteger(v) || Math.abs(v) > 30_000_000)) fail("invalid block position.");
}
function ids(value: unknown, label: string, max = 256): asserts value is string[] {
  if (!Array.isArray(value) || value.length > max) fail(`invalid ${label}.`);
  for (const id of value) token(id, label);
  if (new Set(value).size !== value.length) fail(`duplicate ${label}.`);
}
function actor(value: unknown): asserts value is StationActor {
  exact(value, ["actorId", "factionIds", "guildIds"], "actor");
  token(value.actorId, "actor ID"); ids(value.factionIds, "faction ID"); ids(value.guildIds, "guild ID");
}
function access(value: unknown): asserts value is StationAccess {
  exact(value, STATION_PERMISSIONS, "access");
  for (const key of STATION_PERMISSIONS) if (!STATION_GRANTS.includes(value[key] as StationGrant)) fail("invalid access grant.");
}
function association(value: unknown): asserts value is StationAssociation {
  if (value === null) return;
  exact(value, ["kind", "id"], "association"); token(value.id, "association ID");
  if (value.kind !== "faction" && value.kind !== "guild") fail("invalid association kind.");
}
function nameIcon(name: unknown, icon: unknown): void {
  if (typeof name !== "string" || !name.trim() || name !== name.trim() || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) fail("invalid name.");
  token(icon, "icon");
}
function band(value: unknown, owner: LocationId): asserts value is OrbitBand {
  if (!["low", "high", "moon-transfer"].includes(value as string)) fail("invalid orbit band.");
  const address = parseLocationId(owner);
  if (!["orbit", "station", "asteroid"].includes(address.kind)) fail("station requires an orbital location.");
  if (address.kind === "orbit" && address.instanceId !== value) fail("orbit band/location mismatch.");
}
function leases(value: unknown, owner: LocationId): asserts value is StationWayanchorLease[] {
  if (!Array.isArray(value) || value.length > 128) fail("invalid Wayanchor leases.");
  const anchors = new Set<string>(), leaseIds = new Set<string>();
  for (const lease of value) {
    exact(lease, ["anchorId", "leaseId", "locationId"], "Wayanchor lease"); token(lease.anchorId, "anchor ID"); token(lease.leaseId, "lease ID");
    if (lease.locationId !== owner) fail("Wayanchor lease location mismatch.");
    if (anchors.has(lease.anchorId) || leaseIds.has(lease.leaseId)) fail("duplicate Wayanchor lease.");
    anchors.add(lease.anchorId); leaseIds.add(lease.leaseId);
  }
}
function pressureZones(value: unknown, owner: LocationId): asserts value is string[] {
  if (!Array.isArray(value) || value.length > 256 || new Set(value).size !== value.length) fail("invalid pressure zone references.");
  const prefix = `${owner}:air:`;
  for (const id of value) {
    if (typeof id !== "string" || !id.startsWith(prefix) || !/^[a-f0-9]{16}$/.test(id.slice(prefix.length))) fail("invalid pressure zone location or identity.");
  }
}
const stationKeys = ["id", "universeId", "locationId", "band", "corePosition", "corePlacementReceiptId", "name", "icon", "ownerId", "memberIds", "association", "access", "docks", "pressureZoneIds", "wayanchorLeases", "revision"];
function station(value: unknown): asserts value is OrbitalStation {
  exact(value, stationKeys, "record"); token(value.id, "station ID");
  const address = parseLocationId(value.locationId);
  if (value.universeId !== address.universeId) fail("station universe mismatch.");
  band(value.band, value.locationId as LocationId); position(value.corePosition); token(value.corePlacementReceiptId, "core receipt ID");
  nameIcon(value.name, value.icon); token(value.ownerId, "owner ID"); ids(value.memberIds, "member ID"); association(value.association); access(value.access);
  integer(value.revision, "station revision"); pressureZones(value.pressureZoneIds, value.locationId as LocationId); leases(value.wayanchorLeases, value.locationId as LocationId);
  if (!isUniverseRecord(value.docks) || !Object.keys(value.docks).length || Object.keys(value.docks).length > 64) fail("invalid docking registry.");
  for (const [id, dock] of Object.entries(value.docks)) {
    token(id, "dock ID"); exact(dock, ["id", "position", "placementReceiptId", "occupant"], "dock");
    if (dock.id !== id) fail("dock identity mismatch."); position(dock.position); token(dock.placementReceiptId, "dock receipt ID");
    if (dock.occupant !== null) {
      exact(dock.occupant, ["vehicleId", "ownerId", "vehicleRevision"], "dock occupant");
      token(dock.occupant.vehicleId, "vehicle ID"); token(dock.occupant.ownerId, "vehicle owner"); integer(dock.occupant.vehicleRevision, "vehicle revision");
    }
  }
}

/** Missing saves migrate only via createStationRegistry, which requires an explicit location. */
export function validateStationRegistrySave(value: unknown, expectedLocationId?: LocationId): StationRegistrySave {
  exact(value, ["schema", "universeId", "locationId", "revision", "stations", "journal"], "registry");
  if (value.schema !== 1) fail("unsupported registry schema.");
  const owner = parseLocationId(value.locationId);
  if (!["orbit", "station", "asteroid"].includes(owner.kind)) fail("registry requires an orbital location.");
  if (owner.kind === "orbit") band(owner.instanceId, value.locationId as LocationId);
  if (owner.universeId !== value.universeId || (expectedLocationId !== undefined && expectedLocationId !== value.locationId)) fail("registry universe/location mismatch.");
  integer(value.revision, "registry revision");
  if (!isUniverseRecord(value.stations) || Object.keys(value.stations).length > 256) fail("invalid stations.");
  const occupied = new Set<string>(), receipts = new Set<string>(), positions = new Set<string>(), zones = new Set<string>(), anchors = new Set<string>();
  const unique = (set: Set<string>, id: string, label: string) => { if (set.has(id)) fail(`duplicate ${label}.`); set.add(id); };
  for (const [id, entry] of Object.entries(value.stations)) {
    token(id, "station ID"); station(entry);
    if (id !== entry.id || entry.locationId !== value.locationId || entry.universeId !== value.universeId || entry.revision > value.revision) fail("station identity/revision mismatch.");
    unique(receipts, entry.corePlacementReceiptId, "placement receipt"); unique(positions, canonicalJson(entry.corePosition), "structure position");
    for (const zone of entry.pressureZoneIds) unique(zones, zone, "pressure zone reference");
    for (const lease of entry.wayanchorLeases) unique(anchors, lease.anchorId, "Wayanchor reference");
    for (const dock of Object.values(entry.docks)) {
      unique(receipts, dock.placementReceiptId, "placement receipt"); unique(positions, canonicalJson(dock.position), "structure position");
      if (dock.occupant) unique(occupied, dock.occupant.vehicleId, "docked vehicle");
    }
  }
  if (!Array.isArray(value.journal) || value.journal.length !== Math.min(value.revision, STATION_JOURNAL_LIMIT)) fail("invalid bounded journal length.");
  const actionIds = new Set<string>();
  for (const [index, receipt] of value.journal.entries()) {
    exact(receipt, ["actionId", "stationId", "revision", "binding"], "action receipt"); token(receipt.actionId, "action ID"); token(receipt.stationId, "station ID");
    if (receipt.revision !== value.revision - value.journal.length + index + 1 || !Object.hasOwn(value.stations, receipt.stationId)) fail("invalid journal revision/station.");
    if (typeof receipt.binding !== "string" || !receipt.binding.length || receipt.binding.length > 100_000) fail("invalid payload binding.");
    let bound: unknown;
    try { bound = JSON.parse(receipt.binding); } catch { fail("invalid payload binding JSON."); }
    exact(bound, ["context", "action"], "payload binding"); validateAction(bound.action);
    validateContext(bound.context);
    if (canonicalJson(bound) !== receipt.binding || bound.action.actionId !== receipt.actionId || bound.action.stationId !== receipt.stationId
      || bound.context.expectedRevision !== Number(receipt.revision) - 1 || bound.context.locationId !== value.locationId) fail("journal payload binding mismatch.");
    unique(actionIds, receipt.actionId, "action ID");
  }
  return freezeUniverseJson(cloneUniverseJson(value)) as unknown as StationRegistrySave;
}

export function createStationRegistry(locationId: LocationId): StationRegistrySave {
  return validateStationRegistrySave({ schema: 1, universeId: parseLocationId(locationId).universeId, locationId, revision: 0, stations: {}, journal: [] });
}

/** Imported worlds start a new action history; physical references retain their local identity. */
export function remapStationRegistry(input: StationRegistrySave, destinationUniverse: UniverseId): StationRegistrySave {
  const registry = cloneUniverseJson(validateStationRegistrySave(input));
  const oldLocation = registry.locationId;
  registry.locationId = locationId({ ...parseLocationId(oldLocation), universeId: destinationUniverse });
  if (registry.locationId === oldLocation) fail("import requires a different universe.");
  registry.universeId = destinationUniverse; registry.revision = 0; registry.journal = [];
  for (const entry of Object.values(registry.stations)) {
    entry.universeId = destinationUniverse; entry.locationId = registry.locationId; entry.revision = 0;
    entry.pressureZoneIds = entry.pressureZoneIds.map(id => registry.locationId + id.slice(oldLocation.length));
    entry.wayanchorLeases = entry.wayanchorLeases.map(lease => ({ ...lease, locationId: registry.locationId }));
  }
  return validateStationRegistrySave(registry);
}

export const STATION_CLAIM_RADIUS = 24;
export function stationAt(registry: StationRegistrySave | null | undefined, point: StationPosition): OrbitalStation | null {
  return Object.values(registry?.stations ?? {}).find(entry => entry.corePosition.every((value, axis) => Math.abs(value - point[axis]) <= STATION_CLAIM_RADIUS)) ?? null;
}
/** Fail closed for malformed actors, records and permission names; grants are independent. */
export function stationAllows(value: OrbitalStation, principal: StationActor, permission: StationPermission): boolean {
  try {
    station(value); actor(principal);
    if (!STATION_PERMISSIONS.includes(permission)) return false;
    if (value.ownerId === principal.actorId) return true;
    const grant = value.access[permission];
    return grant === "public" || (grant === "trusted" && value.memberIds.includes(principal.actorId))
      || (grant === "faction" && value.association !== null && (value.association.kind === "faction" ? principal.factionIds : principal.guildIds).includes(value.association.id));
  } catch { return false; }
}

function validateAction(value: unknown): asserts value is StationAction {
  if (!isUniverseRecord(value)) fail("invalid action.");
  const fields: Record<string, string[]> = {
    create: ["band", "name", "icon", "coreReceiptId", "dockId", "dockReceiptId"], rename: ["name", "icon"],
    access: ["memberIds", "association", "access"], habitat: ["pressureZoneIds", "wayanchorLeases"],
    "register-dock": ["dockId", "placementReceiptId"], dock: ["dockId", "vehicleId", "vehicleRevision"], undock: ["dockId", "vehicleId", "vehicleRevision"],
  };
  if (typeof value.type !== "string" || !Object.hasOwn(fields, value.type)) fail("unknown action.");
  exact(value, ["actionId", "stationId", "type", ...fields[value.type]], "action"); token(value.actionId, "action ID"); token(value.stationId, "station ID");
  // Canonical encoding rejects nonfinite, cyclic and non-JSON nested payloads before replay lookup.
  canonicalJson(value);
}

function validateContext(value: unknown): asserts value is StationActionContext {
  if (!isUniverseRecord(value) || Object.keys(value).some(k => !["actor", "locationId", "expectedRevision", "placements", "vehicle"].includes(k))) fail("invalid action context.");
  actor(value.actor); integer(value.expectedRevision, "expected revision"); parseLocationId(value.locationId);
  if (Object.hasOwn(value, "placements")) {
    if (!Array.isArray(value.placements) || value.placements.length > 2) fail("invalid placement evidence.");
    for (const receipt of value.placements) {
      exact(receipt, ["receiptId", "actorId", "locationId", "expectedRevision", "kind", "position"], "placement receipt");
      token(receipt.receiptId, "receipt ID"); token(receipt.actorId, "receipt actor ID"); position(receipt.position); integer(receipt.expectedRevision, "receipt revision");
      if (receipt.kind !== "core" && receipt.kind !== "docking-collar") fail("invalid placement kind.");
      if (receipt.locationId !== value.locationId || receipt.actorId !== value.actor.actorId || receipt.expectedRevision !== value.expectedRevision) fail("stale or wrong-owner/location placement receipt.");
    }
    if (new Set(value.placements.map(r => r.receiptId)).size !== value.placements.length) fail("duplicate placement evidence.");
  }
  if (Object.hasOwn(value, "vehicle")) {
    exact(value.vehicle, ["vehicleId", "ownerId", "locationId", "revision"], "vehicle evidence");
    token(value.vehicle.vehicleId, "vehicle ID"); token(value.vehicle.ownerId, "vehicle owner"); integer(value.vehicle.revision, "vehicle revision");
    if (value.vehicle.locationId !== value.locationId) fail("wrong-location vehicle evidence.");
  }
}

/**
 * Pure proposal. The host must commit registry + physical placement + vehicle docking
 * custody together. No gas, items, energy or physical vehicle state is created here.
 * Last 128 requests have exact replay responses. Older original requests are rejected
 * by expectedRevision even after their receipt ages out. Do not recycle action IDs.
 */
export function applyStationAction(input: StationRegistrySave, context: StationActionContext, action: StationAction): StationActionResult {
  const registry = cloneUniverseJson(validateStationRegistrySave(input));
  validateContext(context); validateAction(action);
  if (context.locationId !== registry.locationId) fail("actor location/universe mismatch.");
  const binding = canonicalJson({ context, action });
  if (binding.length > 100_000) fail("action exceeds binding limit.");
  const prior = registry.journal.find(r => r.actionId === action.actionId);
  if (prior) {
    if (prior.binding !== binding) fail("replayed action payload mismatch.");
    return freezeUniverseJson({ registry, station: registry.stations[action.stationId], receipt: prior, replayed: true }) as StationActionResult;
  }
  if (context.expectedRevision !== registry.revision) fail("stale registry revision.");
  if (registry.revision === Number.MAX_SAFE_INTEGER) fail("registry revision exhausted.");
  const placement = (id: string, kind: StationPlacementReceipt["kind"]): StationPlacementReceipt => {
    token(id, "placement receipt ID");
    if (!Array.isArray(context.placements) || context.placements.length > 2) fail("validated placement receipt required.");
    const result = context.placements.find(r => r.receiptId === id && r.kind === kind);
    if (!result) fail("validated placement receipt required.");
    return result;
  };
  let current = Object.hasOwn(registry.stations, action.stationId) ? registry.stations[action.stationId] : undefined;
  const permit = (permission: StationPermission) => { if (!current || !stationAllows(current, context.actor, permission)) fail(`permission denied: ${permission}.`); };
  if (action.type === "create") {
    if (current) fail("station already registered.");
    nameIcon(action.name, action.icon); band(action.band, registry.locationId); token(action.dockId, "dock ID");
    const core = placement(action.coreReceiptId, "core"), dock = placement(action.dockReceiptId, "docking-collar");
    current = { id: action.stationId, universeId: registry.universeId, locationId: registry.locationId, band: action.band,
      corePosition: [...core.position], corePlacementReceiptId: core.receiptId, name: action.name, icon: action.icon,
      ownerId: context.actor.actorId, memberIds: [], association: null,
      access: Object.fromEntries(STATION_PERMISSIONS.map(key => [key, "private"])) as StationAccess,
      docks: { [action.dockId]: { id: action.dockId, position: [...dock.position], placementReceiptId: dock.receiptId, occupant: null } },
      pressureZoneIds: [], wayanchorLeases: [], revision: 0 };
    registry.stations[current.id] = current;
  } else {
    if (!current) fail("unknown station.");
    switch (action.type) {
      case "rename": permit("administer"); nameIcon(action.name, action.icon); current.name = action.name; current.icon = action.icon; break;
      case "access":
        permit("administer"); access(action.access); ids(action.memberIds, "member ID"); association(action.association);
        current.access = cloneUniverseJson(action.access); current.memberIds = [...action.memberIds]; current.association = cloneUniverseJson(action.association); break;
      case "habitat":
        permit("life-support"); pressureZones(action.pressureZoneIds, registry.locationId); leases(action.wayanchorLeases, registry.locationId);
        if (canonicalJson(current.wayanchorLeases) !== canonicalJson(action.wayanchorLeases)) permit("waylink");
        current.pressureZoneIds = [...action.pressureZoneIds]; current.wayanchorLeases = cloneUniverseJson(action.wayanchorLeases); break;
      case "register-dock": {
        permit("build"); token(action.dockId, "dock ID");
        if (Object.hasOwn(current.docks, action.dockId)) fail("dock already registered.");
        const receipt = placement(action.placementReceiptId, "docking-collar");
        current.docks[action.dockId] = { id: action.dockId, position: [...receipt.position], placementReceiptId: receipt.receiptId, occupant: null }; break;
      }
      case "dock": case "undock": {
        token(action.dockId, "dock ID"); token(action.vehicleId, "vehicle ID"); integer(action.vehicleRevision, "vehicle revision");
        const vehicle = context.vehicle;
        exact(vehicle, ["vehicleId", "ownerId", "locationId", "revision"], "vehicle evidence");
        token(vehicle.vehicleId, "vehicle ID"); token(vehicle.ownerId, "vehicle owner"); integer(vehicle.revision, "vehicle revision");
        if (vehicle.locationId !== registry.locationId || vehicle.vehicleId !== action.vehicleId || vehicle.revision !== action.vehicleRevision) fail("stale or wrong-location vehicle evidence.");
        if (vehicle.ownerId !== context.actor.actorId) fail("vehicle owner required.");
        const dock = Object.hasOwn(current.docks, action.dockId) ? current.docks[action.dockId] : undefined;
        if (!dock) fail("unknown dock.");
        if (action.type === "dock") {
          permit("dock"); if (dock.occupant) fail("dock busy.");
          dock.occupant = { vehicleId: action.vehicleId, ownerId: vehicle.ownerId, vehicleRevision: action.vehicleRevision };
        } else {
          // An owner can depart after access is revoked. Station admin cannot steal custody.
          if (!dock.occupant || dock.occupant.vehicleId !== vehicle.vehicleId || dock.occupant.ownerId !== vehicle.ownerId
            || vehicle.revision < dock.occupant.vehicleRevision) fail("vehicle does not own dock occupancy.");
          dock.occupant = null;
        }
        break;
      }
    }
  }
  if (current.revision === Number.MAX_SAFE_INTEGER) fail("station revision exhausted.");
  current.revision++; registry.revision++;
  const receipt: StationReceipt = { actionId: action.actionId, stationId: action.stationId, revision: registry.revision, binding };
  registry.journal.push(receipt); registry.journal = registry.journal.slice(-STATION_JOURNAL_LIMIT);
  const validated = validateStationRegistrySave(registry);
  return freezeUniverseJson({ registry: validated, station: validated.stations[action.stationId], receipt, replayed: false }) as StationActionResult;
}
