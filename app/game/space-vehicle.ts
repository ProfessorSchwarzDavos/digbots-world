import { cloneSlot, ITEMS, type InventorySlot, type ItemCode } from "./data";
import { locationId, locationStamp, parseLocationId, sameLocationStamp, universeId, type LocationId, type LocationStamp, type UniverseId } from "./location-address";
import { assertExactKeys, canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

export type VehicleVector = [number, number, number];
export const VEHICLE_PHASES = ["parked", "fueling", "countdown", "ascent", "orbit", "transfer", "approach", "descent", "landed", "disabled"] as const;
export type VehiclePhase = typeof VEHICLE_PHASES[number];
export const VEHICLE_RESOURCES = ["fuelMl", "oxidizerMl", "oxygenMl", "batteryJoules"] as const;
export type VehicleResource = typeof VEHICLE_RESOURCES[number];
export type VehicleResources = Record<VehicleResource, number>;
export const SURVEY_HOPPER_CAPACITY: Readonly<VehicleResources> = Object.freeze({ fuelMl: 120_000, oxidizerMl: 180_000, oxygenMl: 60_000, batteryJoules: 240_000 });
export const VEHICLE_PERMISSIONS = ["read", "configure", "insert", "extract", "operate", "dock", "board", "administer"] as const;
export type VehiclePermission = typeof VEHICLE_PERMISSIONS[number];
export type VehicleAccess = Record<VehiclePermission, "private" | "trusted" | "public">;
export type VehicleTravelStep = { phase: "ascent" | "orbit" | "transfer" | "approach" | "descent"; cost: VehicleResources };
export type VehicleTrip = {
  id: string;
  origin: LocationId;
  destination: LocationId;
  originStamp: LocationStamp;
  destinationStamp: LocationStamp;
  departurePhase: "parked" | "landed" | "orbit";
  status: "reserved" | "committed" | "commit-ready";
  stepIndex: number;
  reserved: VehicleResources;
  spent: VehicleResources;
  steps: VehicleTravelStep[];
  passengerIds: string[];
};
export type VehicleReceipt = { actionId: string; kind: string; revision: number; transactionId: string | null };
export type VehicleFlightControl = {
  schema: 1; phaseTimeMs: number; throttlePermille: number; pitchPermille: number;
  headingMilliRadians: number; originPosition: VehicleVector; progressPermille: number;
};
/** All public factory/validator/action results are detached and deeply frozen at runtime. */
export type SpaceVehicleState = {
  vehicleId: string;
  definitionId: "survey-hopper";
  ownerId: string;
  locationId: LocationId;
  revision: number;
  transitionRevision: number;
  phase: VehiclePhase;
  transform: { position: VehicleVector; rotation: VehicleVector };
  velocity: VehicleVector;
  hull: number;
  fuelMl: number;
  oxidizerMl: number;
  oxygenMl: number;
  batteryJoules: number;
  passengers: { actorId: string; seat: 0; consent: boolean; connected: boolean }[];
  cargo: (InventorySlot | null)[];
  /** One stable custody identity per occupied stack; never an item type ID. */
  cargoOwnership: (string | null)[];
  modules: { id: string; kind: string; integrity: number; metadata: Record<string, unknown> }[];
  trustedIds: string[];
  access: VehicleAccess;
  trip: VehicleTrip | null;
  journal: VehicleReceipt[];
  /** Host-simulated visual/interactive phase clock; no separate cargo authority. */
  flight?: VehicleFlightControl;
  cabinClockMs?: number;
};
export type SpacefleetSave = { schema: 1; vehicles: Record<string, SpaceVehicleState> };
export type VehicleTransferSource = {
  id: string; revision: number; locationId: LocationId; resources: VehicleResources;
  cargo: (InventorySlot | null)[]; cargoOwnership: (string | null)[];
};
/** Source, actor and stamps MUST be resolved by the host, never accepted as client assertions. */
export type VehicleActionContext = {
  actorId: string; locationId: LocationId; expectedVehicleRevision: number;
  source?: VehicleTransferSource;
  originStamp?: LocationStamp; destinationStamp?: LocationStamp;
};
export type SpaceVehicleAction = { vehicleId: string; actionId: string } & (
  | { type: "board" }
  | { type: "consent"; consent: boolean }
  | { type: "disconnect" | "reconnect" | "leave" | "abort" | "step" }
  | { type: "supply"; resource: VehicleResource; amount: number; sourceId: string; sourceRevision: number }
  | { type: "cargo-in"; sourceId: string; sourceRevision: number; sourceSlot: number; vehicleSlot: number }
  | { type: "cargo-out"; vehicleSlot: number }
  | { type: "reserve"; transactionId: string }
  | { type: "access"; trustedIds: string[]; access: VehicleAccess }
);
export type VehicleExternalWrite =
  | { kind: "resource-debit"; sourceId: string; expectedRevision: number; resource: VehicleResource; amount: number }
  | { kind: "cargo-debit"; sourceId: string; expectedRevision: number; slot: number; cargo: InventorySlot; ownershipId: string }
  | { kind: "cargo-credit"; actorId: string; cargo: InventorySlot; ownershipId: string }
  | { kind: "passenger-release"; actorId: string; locationId: LocationId; position: VehicleVector };
export type VehicleActionResult = { fleet: SpacefleetSave; vehicle: SpaceVehicleState; externalWrites: VehicleExternalWrite[]; receipt: VehicleReceipt };

function fail(message: string): never { throw new Error(`Space vehicle: ${message}`); }
function token(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.length || value.length > 200 || /[\u0000-\u001f]/.test(value)
    || ["__proto__", "constructor", "prototype"].includes(value)) fail(`invalid ${label}.`);
}
function integer(value: unknown, label: string, max = Number.MAX_SAFE_INTEGER): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > max) fail(`invalid ${label}.`);
}
function exact(value: unknown, keys: readonly string[], label: string): asserts value is Record<string, unknown> {
  if (!isUniverseRecord(value)) fail(`invalid ${label}.`);
  assertExactKeys(value, keys, label);
}
function vector(value: unknown): asserts value is VehicleVector {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(n => typeof n === "number" && Number.isFinite(n))) fail("invalid transform/velocity.");
}
function bool(value: unknown): asserts value is boolean { if (typeof value !== "boolean") fail("invalid boolean."); }
function ids(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value)) fail(`invalid ${label}.`);
  value.forEach(v => token(v, label));
  if (new Set(value).size !== value.length) fail(`duplicate ${label}.`);
}
function resources(value: unknown): asserts value is VehicleResources {
  exact(value, VEHICLE_RESOURCES, "resources");
  for (const key of VEHICLE_RESOURCES) integer(value[key], key, SURVEY_HOPPER_CAPACITY[key]);
}
function zero(): VehicleResources { return { fuelMl: 0, oxidizerMl: 0, oxygenMl: 0, batteryJoules: 0 }; }
function sumCosts(steps: VehicleTravelStep[]): VehicleResources {
  const total = zero();
  for (const step of steps) for (const key of VEHICLE_RESOURCES) total[key] += step.cost[key];
  resources(total);
  return total;
}
function sameResources(a: VehicleResources, b: VehicleResources): boolean { return VEHICLE_RESOURCES.every(key => a[key] === b[key]); }
function metadata(value: unknown): void {
  if (!isUniverseRecord(value)) fail("invalid metadata.");
  canonicalJson(value);
  // Canonical JSON deliberately drops undefined object fields elsewhere. Cargo/module
  // payloads cannot use that normalization: it would silently alter exact item state.
  const visit = (entry: unknown): void => {
    if (entry === undefined) fail("metadata must contain only durable JSON values.");
    if (Array.isArray(entry)) {
      for (let i = 0; i < entry.length; i++) {
        if (!(i in entry)) fail("metadata cannot contain sparse arrays.");
        visit(entry[i]);
      }
    } else if (isUniverseRecord(entry)) Object.values(entry).forEach(visit);
  };
  visit(value);
}
function slot(value: unknown): asserts value is InventorySlot {
  if (!isUniverseRecord(value) || Object.keys(value).some(k => !["item", "count", "durability", "metadata"].includes(k))) fail("invalid cargo slot.");
  integer(value.item, "item");
  if (!ITEMS[value.item as ItemCode]) fail("unknown cargo item.");
  integer(value.count, "cargo count", ITEMS[value.item as ItemCode].maxStack);
  if (value.count === 0) fail("empty cargo must be null.");
  if (value.durability !== undefined && (typeof value.durability !== "number" || !Number.isFinite(value.durability) || value.durability < 0)) fail("invalid cargo durability.");
  if (value.metadata !== undefined) metadata(value.metadata);
  canonicalJson(value);
}
function access(value: unknown): asserts value is VehicleAccess {
  exact(value, VEHICLE_PERMISSIONS, "access");
  if (Object.values(value).some(v => !["private", "trusted", "public"].includes(v as string))) fail("invalid access mode.");
  if (value.administer !== "private") fail("administration is owner-only.");
}
function routeSteps(origin: LocationId, destination: LocationId): VehicleTravelStep[] {
  const from = parseLocationId(origin), to = parseLocationId(destination);
  if (origin === destination || from.universeId !== to.universeId || from.systemId !== to.systemId
    || !["blockwild", "blockwild/morrow"].includes(from.bodyId) || !["blockwild", "blockwild/morrow"].includes(to.bodyId)
    || !["surface", "orbit", "station"].includes(from.kind) || !["surface", "orbit", "station"].includes(to.kind)) fail("route outside Survey Hopper reach.");
  // Each surface launch commits an actual origin orbit location before further travel.
  if (from.kind === "surface" && (to.kind !== "orbit" || to.bodyId !== from.bodyId)) fail("surface launch must first reach origin orbit.");
  const steps: VehicleTravelStep[] = [];
  if (from.kind === "surface") steps.push({ phase: "ascent", cost: { fuelMl: 18_000, oxidizerMl: 27_000, oxygenMl: 800, batteryJoules: 12_000 } }, { phase: "orbit", cost: { fuelMl: 4_000, oxidizerMl: 6_000, oxygenMl: 400, batteryJoules: 4_000 } });
  else steps.push({ phase: "transfer", cost: { fuelMl: from.bodyId === to.bodyId ? 2_000 : 12_000, oxidizerMl: from.bodyId === to.bodyId ? 3_000 : 18_000, oxygenMl: from.bodyId === to.bodyId ? 300 : 3_000, batteryJoules: from.bodyId === to.bodyId ? 3_000 : 16_000 } });
  steps.push({ phase: "approach", cost: { fuelMl: 1_000, oxidizerMl: 1_500, oxygenMl: 300, batteryJoules: 2_000 } });
  steps.push({ phase: "descent", cost: { fuelMl: to.kind === "surface" ? 5_000 : 500, oxidizerMl: to.kind === "surface" ? 7_500 : 750, oxygenMl: 500, batteryJoules: 4_000 } });
  return steps;
}
function validateTrip(trip: unknown, v: SpaceVehicleState): asserts trip is VehicleTrip {
  exact(trip, ["id", "origin", "destination", "originStamp", "destinationStamp", "departurePhase", "status", "stepIndex", "reserved", "spent", "steps", "passengerIds"], "trip");
  token(trip.id, "transaction ID");
  const source = locationStamp(trip.originStamp), target = locationStamp(trip.destinationStamp);
  if (source.locationId !== trip.origin || target.locationId !== trip.destination || trip.origin !== v.locationId) fail("trip location mismatch.");
  if (!["parked", "landed", "orbit"].includes(trip.departurePhase as string) || !["reserved", "committed", "commit-ready"].includes(trip.status as string)) fail("invalid trip state.");
  const expectedSteps = routeSteps(source.locationId, target.locationId);
  if (canonicalJson(trip.steps) !== canonicalJson(expectedSteps)) fail("trip route/cost mismatch.");
  integer(trip.stepIndex, "trip step", expectedSteps.length);
  resources(trip.reserved); resources(trip.spent);
  if (!sameResources(trip.reserved, sumCosts(expectedSteps)) || !sameResources(trip.spent, sumCosts(expectedSteps.slice(0, trip.stepIndex)))) fail("trip resource accounting mismatch.");
  ids(trip.passengerIds, "passenger custody");
  if (!trip.passengerIds.length || canonicalJson(trip.passengerIds) !== canonicalJson(v.passengers.map(p => p.actorId))) fail("trip passenger custody mismatch.");
  if (trip.status === "reserved" ? trip.stepIndex !== 0 || v.phase !== "countdown" : trip.stepIndex === 0 || v.phase !== expectedSteps[trip.stepIndex - 1].phase) fail("trip phase mismatch.");
  if ((trip.status === "commit-ready") !== (trip.stepIndex === expectedSteps.length)) fail("trip commit readiness mismatch.");
  for (const key of VEHICLE_RESOURCES) if (v[key] < trip.reserved[key] - trip.spent[key]) fail(`reserved ${key} is missing.`);
  if (v.passengers.some(p => !p.consent || (trip.status === "reserved" && !p.connected))) fail("trip requires passenger consent.");
}

export function validateSpacefleetSave(value: unknown): SpacefleetSave {
  if (value === undefined) return freezeUniverseJson({ schema: 1, vehicles: {} }) as SpacefleetSave;
  // Validate before cloning: JSON normalization must never hide nonfinite numbers or cycles.
  canonicalJson(value);
  exact(value, ["schema", "vehicles"], "spacefleet");
  if (value.schema !== 1 || !isUniverseRecord(value.vehicles)) fail("unsupported spacefleet schema.");
  const passengers = new Set<string>(), cargoOwners = new Set<string>();
  for (const [key, raw] of Object.entries(value.vehicles)) {
    exact(raw, ["vehicleId", "definitionId", "ownerId", "locationId", "revision", "transitionRevision", "phase", "transform", "velocity", "hull", ...VEHICLE_RESOURCES, "passengers", "cargo", "cargoOwnership", "modules", "trustedIds", "access", "trip", "journal", ...(isUniverseRecord(raw) && Object.hasOwn(raw, "flight") ? ["flight"] : []), ...(isUniverseRecord(raw) && Object.hasOwn(raw, "cabinClockMs") ? ["cabinClockMs"] : [])], "vehicle");
    if (raw.cabinClockMs !== undefined) integer(raw.cabinClockMs, "cabin clock", 999);
    if (raw.flight !== undefined) {
      exact(raw.flight, ["schema", "phaseTimeMs", "throttlePermille", "pitchPermille", "headingMilliRadians", "originPosition", "progressPermille"], "flight control");
      if (raw.flight.schema !== 1 || raw.trip === null) fail("flight control requires an active trip.");
      integer(raw.flight.phaseTimeMs, "flight clock", 600000); integer(raw.flight.throttlePermille, "throttle", 1000);
      integer(raw.flight.pitchPermille, "pitch", 1000); integer(raw.flight.progressPermille, "flight progress", 1000);
      if (!Number.isSafeInteger(raw.flight.headingMilliRadians) || Math.abs(Number(raw.flight.headingMilliRadians)) > 100000) fail("invalid heading.");
      vector(raw.flight.originPosition);
    }
    token(key, "vehicle ID"); token(raw.ownerId, "owner ID");
    if (raw.vehicleId !== key || raw.definitionId !== "survey-hopper") fail("vehicle identity mismatch.");
    parseLocationId(raw.locationId);
    integer(raw.revision, "revision"); integer(raw.transitionRevision, "transition revision", raw.revision);
    if (!VEHICLE_PHASES.includes(raw.phase as VehiclePhase)) fail("invalid phase.");
    exact(raw.transform, ["position", "rotation"], "transform"); vector(raw.transform.position); vector(raw.transform.rotation); vector(raw.velocity);
    integer(raw.hull, "hull", 1000);
    for (const resource of VEHICLE_RESOURCES) integer(raw[resource], resource, SURVEY_HOPPER_CAPACITY[resource]);
    if (!Array.isArray(raw.passengers) || raw.passengers.length > 1) fail("Hopper has one seat.");
    for (const passenger of raw.passengers) {
      exact(passenger, ["actorId", "seat", "consent", "connected"], "passenger"); token(passenger.actorId, "passenger ID"); bool(passenger.consent); bool(passenger.connected);
      if (passenger.seat !== 0 || passengers.has(passenger.actorId)) fail("duplicate passenger custody.");
      passengers.add(passenger.actorId);
    }
    if (!Array.isArray(raw.cargo) || raw.cargo.length !== 9 || !Array.isArray(raw.cargoOwnership) || raw.cargoOwnership.length !== 9) fail("Hopper has nine cargo slots.");
    raw.cargo.forEach((entry, index) => {
      const owner = (raw.cargoOwnership as unknown[])[index];
      if (entry === null) { if (owner !== null) fail("empty cargo has custody."); return; }
      slot(entry); token(owner, "cargo custody ID");
      if (cargoOwners.has(owner)) fail("duplicate cargo custody.");
      cargoOwners.add(owner);
    });
    if (!Array.isArray(raw.modules) || raw.modules.length > 32) fail("invalid modules.");
    const moduleIds = new Set<string>();
    for (const component of raw.modules) {
      exact(component, ["id", "kind", "integrity", "metadata"], "module"); token(component.id, "module ID"); token(component.kind, "module kind"); integer(component.integrity, "module integrity", 1000);
      metadata(component.metadata);
      if (moduleIds.has(component.id)) fail("invalid/duplicate module.");
      moduleIds.add(component.id);
    }
    ids(raw.trustedIds, "trusted ID"); access(raw.access);
    if (!Array.isArray(raw.journal) || raw.journal.length !== raw.revision) fail("action journal/revision mismatch.");
    const actionIds = new Set<string>();
    for (const [index, receipt] of raw.journal.entries()) {
      exact(receipt, ["actionId", "kind", "revision", "transactionId"], "receipt"); token(receipt.actionId, "action ID"); token(receipt.kind, "action kind");
      if (receipt.transactionId !== null) token(receipt.transactionId, "transaction ID");
      if (receipt.revision !== index + 1 || actionIds.has(receipt.actionId)) fail("invalid/replayed journal action.");
      actionIds.add(receipt.actionId);
    }
    const vehicle = raw as unknown as SpaceVehicleState;
    if (vehicle.trip !== null) validateTrip(vehicle.trip, vehicle);
    else if (["countdown", "ascent", "transfer", "approach", "descent"].includes(vehicle.phase)) fail("travel phase has no transaction.");
  }
  const result = cloneUniverseJson(value) as unknown as SpacefleetSave;
  for (const vehicle of Object.values(result.vehicles)) vehicle.cargo = vehicle.cargo.map(cloneSlot);
  return freezeUniverseJson(result) as SpacefleetSave;
}

export function createSurveyHopper(id: string, ownerId: string, locationId: LocationId, position: VehicleVector): SpaceVehicleState {
  token(id, "vehicle ID"); token(ownerId, "owner ID"); parseLocationId(locationId); vector(position);
  const vehicle: SpaceVehicleState = {
    vehicleId: id, definitionId: "survey-hopper", ownerId, locationId, revision: 0, transitionRevision: 0,
    phase: "parked", transform: { position: [...position], rotation: [0, 0, 0] }, velocity: [0, 0, 0], hull: 1000, ...zero(),
    passengers: [], cargo: Array.from({ length: 9 }, () => null), cargoOwnership: Array.from({ length: 9 }, () => null),
    modules: ["engine", "avionics", "life-support"].map(kind => ({ id: `${id}:${kind}`, kind, integrity: 1000,
      metadata: kind === "avionics" ? { homeBerth: { locationId, position: [...position] } } : {} })),
    trustedIds: [], access: Object.fromEntries(VEHICLE_PERMISSIONS.map(permission => [permission, "private"])) as VehicleAccess,
    trip: null, journal: [],
  };
  return validateSpacefleetSave({ schema: 1, vehicles: { [id]: vehicle } }).vehicles[id];
}

export function vehicleAllows(vehicle: SpaceVehicleState, actorId: string, permission: VehiclePermission): boolean {
  return actorId === vehicle.ownerId || vehicle.access[permission] === "public"
    || (vehicle.access[permission] === "trusted" && vehicle.trustedIds.includes(actorId));
}
function permit(vehicle: SpaceVehicleState, actorId: string, permission: VehiclePermission): void {
  if (!vehicleAllows(vehicle, actorId, permission)) fail(`permission denied: ${permission}.`);
}
function docked(vehicle: SpaceVehicleState): void {
  if (vehicle.trip || !["parked", "fueling", "landed", "orbit", "disabled"].includes(vehicle.phase)) fail("transfers are frozen during travel.");
}
/** Exact capacity quote: never debits a source until the caller atomically applies returned writes. */
export function quoteVehicleSupply(vehicle: SpaceVehicleState, resource: VehicleResource, requested: number, available: number): number {
  if (!VEHICLE_RESOURCES.includes(resource)) fail("unknown resource.");
  integer(requested, "supply amount"); integer(available, "source amount"); docked(vehicle);
  integer(vehicle[resource], resource, SURVEY_HOPPER_CAPACITY[resource]);
  return Math.min(requested, available, SURVEY_HOPPER_CAPACITY[resource] - vehicle[resource]);
}
export function planSpaceVehicleTravel(input: SpaceVehicleState, originStamp: LocationStamp, destinationStamp: LocationStamp, transactionId: string): VehicleTrip {
  const vehicle = validateSpacefleetSave({ schema: 1, vehicles: { [input.vehicleId]: input } }).vehicles[input.vehicleId];
  token(transactionId, "transaction ID");
  const source = locationStamp(originStamp), target = locationStamp(destinationStamp);
  if (vehicle.modules.some(module => module.kind === "avionics" && module.metadata.stationDock !== undefined)) fail("undock from the station before reserving a route.");
  if (source.locationId !== vehicle.locationId || vehicle.trip || !["parked", "landed", "orbit"].includes(vehicle.phase)) fail("vehicle cannot reserve this route.");
  if (vehicle.hull === 0 || ["engine", "avionics", "life-support"].some(kind => !vehicle.modules.some(module => module.kind === kind && module.integrity > 0))) fail("hull/modules not flight-ready.");
  if (!vehicle.passengers.length || vehicle.passengers.some(p => !p.consent || !p.connected)) fail("all passengers must be connected and consent.");
  const steps = routeSteps(source.locationId, target.locationId), reserved = sumCosts(steps);
  for (const resource of VEHICLE_RESOURCES) if (vehicle[resource] < reserved[resource]) fail(`insufficient ${resource}.`);
  return freezeUniverseJson({ id: transactionId, origin: source.locationId, destination: target.locationId, originStamp: source, destinationStamp: target,
    departurePhase: vehicle.phase as VehicleTrip["departurePhase"], status: "reserved", stepIndex: 0, reserved, spent: zero(), steps,
    passengerIds: vehicle.passengers.map(p => p.actorId) }) as VehicleTrip;
}
function record(vehicle: SpaceVehicleState, actionId: string, kind: string, transactionId: string | null): VehicleReceipt {
  token(actionId, "action ID");
  if (vehicle.journal.some(entry => entry.actionId === actionId)) fail("replayed action ID.");
  if (vehicle.revision === Number.MAX_SAFE_INTEGER) fail("revision exhausted.");
  const receipt = { actionId, kind, revision: ++vehicle.revision, transactionId };
  vehicle.journal.push(receipt);
  return receipt;
}
function abort(vehicle: SpaceVehicleState): void {
  if (!vehicle.trip || vehicle.trip.status !== "reserved") fail("abort is only available during countdown.");
  vehicle.phase = vehicle.trip.departurePhase;
  vehicle.trip = null;
  delete vehicle.flight;
  vehicle.transitionRevision++;
}

/** No external mutation. Fleet and externalWrites must be one host-owned durable transaction. */
export function applySpaceVehicleAction(input: SpacefleetSave, context: VehicleActionContext, action: SpaceVehicleAction): VehicleActionResult {
  const fleet = cloneUniverseJson(validateSpacefleetSave(input));
  token(context.actorId, "actor ID"); parseLocationId(context.locationId); token(action.actionId, "action ID");
  const vehicle = fleet.vehicles[action.vehicleId];
  if (!vehicle) fail("unknown vehicle.");
  if (vehicle.journal.some(entry => entry.actionId === action.actionId)) fail("replayed action ID.");
  if (context.expectedVehicleRevision !== vehicle.revision) fail("stale vehicle revision.");
  if (context.locationId !== vehicle.locationId) fail("actor location mismatch.");
  const externalWrites: VehicleExternalWrite[] = [];
  const transactionId = vehicle.trip?.id ?? (action.type === "reserve" ? action.transactionId : null);
  const occupant = vehicle.passengers.find(p => p.actorId === context.actorId);
  const release = () => {
    vehicle.passengers = vehicle.passengers.filter(p => p.actorId !== context.actorId);
    externalWrites.push({ kind: "passenger-release", actorId: context.actorId, locationId: vehicle.locationId, position: [...vehicle.transform.position] });
  };
  const source = (id: string, revision: number): VehicleTransferSource => {
    const value = context.source;
    if (!value || value.id !== id || value.revision !== revision || value.locationId !== vehicle.locationId) fail("stale or unavailable transfer source.");
    integer(value.revision, "source revision");
    return value;
  };
  switch (action.type) {
    case "board":
      permit(vehicle, context.actorId, "board"); docked(vehicle);
      if (vehicle.passengers.length || Object.values(fleet.vehicles).some(v => v.passengers.some(p => p.actorId === context.actorId))) fail("seat occupied or passenger already in custody.");
      vehicle.passengers.push({ actorId: context.actorId, seat: 0, consent: false, connected: true }); break;
    case "consent":
      bool(action.consent);
      if (!occupant || (vehicle.trip && vehicle.trip.status !== "reserved")) fail("consent cannot change after departure.");
      occupant.consent = action.consent;
      if (!action.consent && vehicle.trip) abort(vehicle);
      break;
    case "disconnect":
      if (!occupant) fail("actor is not aboard.");
      if (vehicle.trip?.status === "reserved") abort(vehicle);
      if (vehicle.trip) occupant.connected = false; else release();
      break;
    case "reconnect":
      if (!occupant) fail("actor is not in vehicle custody.");
      occupant.connected = true; break;
    case "leave":
      if (!occupant || vehicle.trip) fail("cannot leave vehicle during travel.");
      release(); break;
    case "abort":
      if (!occupant) permit(vehicle, context.actorId, "operate");
      abort(vehicle); break;
    case "access":
      permit(vehicle, context.actorId, "administer"); access(action.access); ids(action.trustedIds, "trusted ID");
      vehicle.access = cloneUniverseJson(action.access); vehicle.trustedIds = [...action.trustedIds]; break;
    case "supply": {
      permit(vehicle, context.actorId, "insert");
      const origin = source(action.sourceId, action.sourceRevision);
      if (!VEHICLE_RESOURCES.includes(action.resource)) fail("unknown resource.");
      const amount = quoteVehicleSupply(vehicle, action.resource, action.amount, origin.resources[action.resource]);
      if (amount <= 0) fail("source empty or vehicle capacity full.");
      vehicle[action.resource] += amount;
      externalWrites.push({ kind: "resource-debit", sourceId: origin.id, expectedRevision: origin.revision, resource: action.resource, amount });
      break;
    }
    case "cargo-in": {
      permit(vehicle, context.actorId, "insert"); docked(vehicle);
      const origin = source(action.sourceId, action.sourceRevision);
      integer(action.vehicleSlot, "cargo slot", 8); integer(action.sourceSlot, "source slot", origin.cargo.length - 1);
      const cargo = origin.cargo[action.sourceSlot], ownershipId = origin.cargoOwnership[action.sourceSlot];
      if (!cargo || vehicle.cargo[action.vehicleSlot]) fail("cargo source empty or target occupied.");
      slot(cargo); token(ownershipId, "cargo custody ID");
      if (Object.values(fleet.vehicles).some(v => v.cargoOwnership.includes(ownershipId))) fail("duplicate cargo custody.");
      vehicle.cargo[action.vehicleSlot] = cloneSlot(cargo); vehicle.cargoOwnership[action.vehicleSlot] = ownershipId;
      externalWrites.push({ kind: "cargo-debit", sourceId: origin.id, expectedRevision: origin.revision, slot: action.sourceSlot, cargo: cloneSlot(cargo)!, ownershipId }); break;
    }
    case "cargo-out": {
      permit(vehicle, context.actorId, "extract"); docked(vehicle); integer(action.vehicleSlot, "cargo slot", 8);
      const cargo = vehicle.cargo[action.vehicleSlot], ownershipId = vehicle.cargoOwnership[action.vehicleSlot];
      if (!cargo || !ownershipId) fail("cargo slot empty.");
      externalWrites.push({ kind: "cargo-credit", actorId: context.actorId, cargo: cloneSlot(cargo)!, ownershipId });
      vehicle.cargo[action.vehicleSlot] = null; vehicle.cargoOwnership[action.vehicleSlot] = null; break;
    }
    case "reserve":
      permit(vehicle, context.actorId, "operate");
      if (!context.originStamp || !context.destinationStamp) fail("route stamps required.");
      if (vehicle.journal.some(r => r.transactionId === action.transactionId)) fail("replayed transaction ID.");
      vehicle.trip = cloneUniverseJson(planSpaceVehicleTravel(vehicle, context.originStamp, context.destinationStamp, action.transactionId));
      vehicle.phase = "countdown"; vehicle.transitionRevision++; break;
    case "step": {
      permit(vehicle, context.actorId, "operate");
      const trip = vehicle.trip;
      if (!trip || trip.status === "commit-ready") fail("no flight step available.");
      if (!context.originStamp || !context.destinationStamp || !sameLocationStamp(locationStamp(context.originStamp), trip.originStamp)
        || !sameLocationStamp(locationStamp(context.destinationStamp), trip.destinationStamp)) fail("stale route stamp.");
      const next = trip.steps[trip.stepIndex];
      for (const resource of VEHICLE_RESOURCES) {
        if (vehicle[resource] < next.cost[resource]) fail(`insufficient ${resource}.`);
        vehicle[resource] -= next.cost[resource]; trip.spent[resource] += next.cost[resource];
      }
      vehicle.phase = next.phase; trip.stepIndex++; vehicle.transitionRevision++;
      trip.status = trip.stepIndex === trip.steps.length ? "commit-ready" : "committed";
      break;
    }
    default: fail("unknown action.");
  }
  const receipt = record(vehicle, action.actionId, action.type, transactionId);
  const validated = validateSpacefleetSave(fleet);
  return freezeUniverseJson({ fleet: validated, vehicle: validated.vehicles[action.vehicleId], externalWrites, receipt }) as VehicleActionResult;
}

export function assertVehicleCommitReady(vehicle: SpaceVehicleState, transactionId: string, originStamp: LocationStamp, destinationStamp: LocationStamp): void {
  const validated = validateSpacefleetSave({ schema: 1, vehicles: { [vehicle.vehicleId]: vehicle } }).vehicles[vehicle.vehicleId];
  const trip = validated.trip;
  if (!trip || trip.status !== "commit-ready" || trip.id !== transactionId
    || !sameLocationStamp(locationStamp(originStamp), trip.originStamp) || !sameLocationStamp(locationStamp(destinationStamp), trip.destinationStamp)) fail("vehicle is not ready for this location commit.");
}
/** STORAGE-ONLY: invoke inside the CF1 atomic origin/destination checkpoint transaction. */
export function commitVehicleArrival(vehicle: SpaceVehicleState, commit: {
  transactionId: string; originStamp: LocationStamp; destinationStamp: LocationStamp; position: VehicleVector; actionId: string;
}): SpaceVehicleState {
  assertVehicleCommitReady(vehicle, commit.transactionId, commit.originStamp, commit.destinationStamp); vector(commit.position);
  const next = cloneUniverseJson(vehicle);
  next.locationId = commit.destinationStamp.locationId;
  next.transform.position = [...commit.position];
  next.velocity = [0, 0, 0];
  next.phase = parseLocationId(next.locationId).kind === "orbit" ? "orbit" : "landed";
  next.trip = null; next.transitionRevision++;
  delete next.flight;
  record(next, commit.actionId, "arrival", commit.transactionId);
  return validateSpacefleetSave({ schema: 1, vehicles: { [next.vehicleId]: next } }).vehicles[next.vehicleId];
}

export function validateSpacefleetUniverse(fleet: SpacefleetSave, expectedUniverseId: UniverseId): SpacefleetSave {
  const validated = validateSpacefleetSave(fleet);
  universeId(expectedUniverseId);
  for (const vehicle of Object.values(validated.vehicles)) {
    const locations = [vehicle.locationId, ...(vehicle.trip ? [vehicle.trip.origin, vehicle.trip.destination] : [])];
    if (locations.some(id => parseLocationId(id).universeId !== expectedUniverseId)) fail("vehicle belongs to another universe.");
  }
  return validated;
}

/** Archive import only. Receipts remain inert replay tombstones; no old request can become executable. */
export function remapSpacefleetUniverse(fleet: SpacefleetSave, from: UniverseId, to: UniverseId): SpacefleetSave {
  const next = cloneUniverseJson(validateSpacefleetUniverse(fleet, from));
  universeId(to);
  if (from === to) return validateSpacefleetSave(next);
  const remap = (id: LocationId) => locationId({ ...parseLocationId(id), universeId: to });
  for (const vehicle of Object.values(next.vehicles)) {
    vehicle.locationId = remap(vehicle.locationId);
    const berth = vehicle.modules.find(component => component.kind === "avionics")?.metadata.homeBerth;
    if (isUniverseRecord(berth) && typeof berth.locationId === "string" && parseLocationId(berth.locationId).universeId === from) berth.locationId = remap(berth.locationId as LocationId);
    const dock = vehicle.modules.find(component => component.kind === "avionics")?.metadata.stationDock;
    if (isUniverseRecord(dock) && typeof dock.locationId === "string" && parseLocationId(dock.locationId).universeId === from) dock.locationId = remap(dock.locationId as LocationId);
    if (vehicle.trip) {
      vehicle.trip.origin = remap(vehicle.trip.origin); vehicle.trip.destination = remap(vehicle.trip.destination);
      vehicle.trip.originStamp = { ...vehicle.trip.originStamp, locationId: vehicle.trip.origin };
      vehicle.trip.destinationStamp = { ...vehicle.trip.destinationStamp, locationId: vehicle.trip.destination };
    }
    record(vehicle, `import:${vehicle.revision + 1}:${to}`, "import-boundary", vehicle.trip?.id ?? null);
  }
  return validateSpacefleetUniverse(next, to);
}
