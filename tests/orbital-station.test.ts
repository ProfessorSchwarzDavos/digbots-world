import assert from "node:assert/strict";
import test from "node:test";
import { discoverAirZone } from "../app/game/airzone.ts";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address.ts";
import {
  applyStationAction, createStationRegistry, STATION_JOURNAL_LIMIT, STATION_PERMISSIONS, stationAllows, validateStationRegistrySave,
  type StationAccess, type StationAction, type StationActionContext, type StationActor, type StationRegistrySave,
} from "../app/game/orbital-station.ts";

const universe = universeId("station-test");
const orbit = locationId(locationAddress({ ...homeLocation(universe), kind: "orbit", instanceId: "low" }));
const other = locationId(locationAddress({ ...homeLocation(universeId("other")), kind: "orbit", instanceId: "low" }));
const high = locationId(locationAddress({ ...homeLocation(universe), kind: "orbit", instanceId: "high" }));
const zone = discoverAirZone({ epochs: { locationId: orbit, generation: 1, topologyRevision: 1, requestId: 1 },
  seed: { x: 0, y: 0, z: 0 }, cells: [{ x: 0, y: 0, z: 0, passable: true, sealMask: 63 }] }).zoneId;
const pilot: StationActor = { actorId: "pilot", factionIds: [], guildIds: [] };
const friend: StationActor = { actorId: "friend", factionIds: ["explorers"], guildIds: ["builders"] };
const stranger: StationActor = { actorId: "stranger", factionIds: [], guildIds: [] };
const privateAccess = (): StationAccess => Object.fromEntries(STATION_PERMISSIONS.map(p => [p, "private"])) as StationAccess;
const clone = <T>(input: T): T => structuredClone(input);
function context(registry: StationRegistrySave, extra: Partial<StationActionContext> = {}): StationActionContext {
  return { actor: pilot, locationId: orbit, expectedRevision: registry.revision, ...extra };
}
function act(registry: StationRegistrySave, action: Omit<StationAction, "actionId" | "stationId"> & Record<string, unknown>, extra: Partial<StationActionContext> = {}) {
  return applyStationAction(registry, context(registry, extra), { actionId: `action-${registry.revision}`, stationId: "outpost", ...action } as StationAction);
}
function creation() {
  const registry = createStationRegistry(orbit);
  const ctx = context(registry, { placements: [
    { receiptId: "place-core", actorId: "pilot", locationId: orbit, expectedRevision: 0, kind: "core", position: [0, 64, 0] },
    { receiptId: "place-collar", actorId: "pilot", locationId: orbit, expectedRevision: 0, kind: "docking-collar", position: [1, 64, 0] },
  ] });
  const action: StationAction = { type: "create", actionId: "create-outpost", stationId: "outpost", band: "low", name: "Home Observatory", icon: "observatory", coreReceiptId: "place-core", dockId: "berth", dockReceiptId: "place-collar" };
  return { registry, ctx, action };
}
function fresh(): StationRegistrySave { const { registry, ctx, action } = creation(); return applyStationAction(registry, ctx, action).registry; }
function vehicle(registry: StationRegistrySave, owner = pilot, id = "hopper", revision = 3): Partial<StationActionContext> {
  return { actor: owner, vehicle: { vehicleId: id, ownerId: owner.actorId, locationId: registry.locationId, revision } };
}
function publicDock(): StationRegistrySave { return act(fresh(), { type: "access", memberIds: [], association: null, access: { ...privateAccess(), dock: "public" } }).registry; }

test("registry creation requires explicit orbital identity and migration does not hide corrupt data", () => {
  assert.equal(createStationRegistry(orbit).revision, 0);
  assert.throws(() => createStationRegistry(locationId(homeLocation(universe))), /orbital location/);
  for (const bad of [undefined, null, {}, { ...fresh(), schema: 2 }, { ...fresh(), unexpected: true }]) {
    assert.throws(() => validateStationRegistrySave(bad));
  }
  assert.throws(() => validateStationRegistrySave(fresh(), high), /location mismatch/);
  assert.throws(() => validateStationRegistrySave({ ...fresh(), universeId: "other" }), /universe/);
});

test("core and collar must have valid host placement receipts, with no block/resource manufacture", () => {
  const { registry, ctx, action } = creation();
  const result = applyStationAction(registry, ctx, action);
  assert.equal(result.registry.revision, 1); assert.equal(result.station.revision, 1);
  assert.equal(result.station.ownerId, "pilot"); assert.deepEqual(result.station.corePosition, [0, 64, 0]);
  assert.equal(registry.revision, 0); assert.deepEqual(registry.stations, {});
  assert.deepEqual(result.station.pressureZoneIds, []); assert.deepEqual(result.station.wayanchorLeases, []);
  assert.equal(result.station.docks.berth.occupant, null); assert.ok(Object.isFrozen(result.station.docks.berth.position));
  ctx.placements![0].position[0] = 100;
  assert.equal(result.station.corePosition[0], 0);
  assert.throws(() => applyStationAction(registry, context(registry), action), /placement receipt/);
  for (const patch of [{ actorId: "intruder" }, { locationId: other }, { expectedRevision: 4 }, { position: [NaN, 64, 0] }]) {
    const candidate = creation(); Object.assign(candidate.ctx.placements![0], patch);
    assert.throws(() => applyStationAction(candidate.registry, candidate.ctx, candidate.action));
  }
  assert.throws(() => applyStationAction(registry, creation().ctx, { ...action, band: "high" }), /band\/location/);
});

test("each permission grant is independent, owner has rights, malformed principals fail closed", () => {
  const station = fresh().stations.outpost;
  for (const permission of STATION_PERMISSIONS) {
    assert.equal(stationAllows(station, pilot, permission), true);
    assert.equal(stationAllows(station, stranger, permission), false);
    for (const grant of ["private", "trusted", "faction", "public"] as const) {
      const candidate = clone(station); candidate.access[permission] = grant;
      candidate.memberIds = [friend.actorId]; candidate.association = { kind: "faction", id: "explorers" };
      assert.equal(stationAllows(candidate, friend, permission), grant !== "private");
      assert.equal(stationAllows(candidate, stranger, permission), grant === "public");
      for (const otherPermission of STATION_PERMISSIONS.filter(p => p !== permission)) {
        assert.equal(stationAllows(candidate, friend, otherPermission), false);
      }
    }
  }
  const guild = clone(station); guild.association = { kind: "guild", id: "builders" }; guild.access.build = "faction";
  assert.equal(stationAllows(guild, friend, "build"), true);
  assert.equal(stationAllows(guild, { ...friend, guildIds: [] }, "build"), false);
  assert.equal(stationAllows(guild, { actorId: "pilot" } as StationActor, "build"), false);
  assert.equal(stationAllows(guild, pilot, "invented" as "build"), false);
  guild.corePosition[0] = Infinity; assert.equal(stationAllows(guild, pilot, "build"), false);
});

test("administration and life support do not follow public build access", () => {
  let registry = act(fresh(), { type: "access", memberIds: [friend.actorId], association: null, access: { ...privateAccess(), build: "public", "life-support": "trusted" } }).registry;
  assert.throws(() => act(registry, { type: "rename", name: "Stolen", icon: "station" }, { actor: friend }), /administer/);
  assert.throws(() => act(registry, { type: "access", access: privateAccess(), memberIds: [], association: null }, { actor: stranger }), /administer/);
  const leases = [{ anchorId: "anchor", leaseId: "lease-1", locationId: orbit }];
  assert.throws(() => act(registry, { type: "habitat", pressureZoneIds: [zone], wayanchorLeases: leases }, { actor: friend }), /waylink/);
  registry = act(registry, { type: "access", memberIds: [friend.actorId], association: null, access: { ...registry.stations.outpost.access, waylink: "trusted" } }).registry;
  registry = act(registry, { type: "habitat", pressureZoneIds: [zone], wayanchorLeases: leases }, { actor: friend }).registry;
  assert.deepEqual(registry.stations.outpost.pressureZoneIds, [zone]);
  assert.throws(() => act(registry, { type: "habitat", pressureZoneIds: [zone.replace(orbit, high)], wayanchorLeases: leases }), /pressure zone location/);
  assert.deepEqual(registry.stations.outpost.wayanchorLeases, leases);
  assert.throws(() => act(registry, { type: "habitat", pressureZoneIds: [], wayanchorLeases: [] }, { actor: stranger }), /life-support/);
  assert.throws(() => act(registry, { type: "habitat", pressureZoneIds: [], wayanchorLeases: [{ ...leases[0], locationId: other }] }), /lease location/);
});

test("exact replay is inert; same action ID with changed actor, payload, revision or evidence rejects", () => {
  const { registry, ctx, action } = creation(); const first = applyStationAction(registry, ctx, action);
  const replay = applyStationAction(first.registry, ctx, action);
  assert.equal(replay.replayed, true); assert.deepEqual(replay.registry, first.registry); assert.deepEqual(replay.receipt, first.receipt);
  assert.throws(() => applyStationAction(first.registry, ctx, { ...action, name: "Another" }), /payload mismatch/);
  assert.throws(() => applyStationAction(first.registry, { ...ctx, actor: friend }, action), /payload mismatch|wrong-owner/);
  assert.throws(() => applyStationAction(first.registry, { ...ctx, expectedRevision: 1 }, action), /payload mismatch|stale/);
  const different = clone(ctx); different.placements![0].position[0]++;
  assert.throws(() => applyStationAction(first.registry, different, action), /payload mismatch/);
  assert.throws(() => applyStationAction(first.registry, ctx, { ...action, actionId: "new-id" }), /stale/);
});

test("registry and station revisions advance monotonically; replay after intervening work does not roll back", () => {
  const { registry, ctx, action } = creation(); let next = applyStationAction(registry, ctx, action).registry;
  next = act(next, { type: "rename", name: "Renamed", icon: "observatory" }).registry;
  const replay = applyStationAction(next, ctx, action);
  assert.equal(replay.registry.revision, 2); assert.equal(replay.station.name, "Renamed"); assert.equal(replay.station.revision, 2);
  const exhausted = clone(next); exhausted.revision = Number.MAX_SAFE_INTEGER;
  assert.throws(() => applyStationAction(exhausted, context(exhausted), { type: "rename", name: "Too late", icon: "station", actionId: "late", stationId: "outpost" }));
});

test("journal is bounded and original requests beyond retention remain stale", () => {
  const { registry, ctx, action } = creation(); let next = applyStationAction(registry, ctx, action).registry;
  for (let index = 0; index < STATION_JOURNAL_LIMIT + 3; index++) next = act(next, { type: "rename", name: `Station ${index}`, icon: "station" }).registry;
  assert.equal(next.journal.length, STATION_JOURNAL_LIMIT);
  assert.equal(next.journal[0].revision, next.revision - STATION_JOURNAL_LIMIT + 1);
  assert.throws(() => applyStationAction(next, ctx, action), /stale/);
  assert.deepEqual(validateStationRegistrySave(JSON.parse(JSON.stringify(next))), next);
});

test("dock requires ship owner and separate station dock grant; busy berths cannot be overwritten", () => {
  const privateRegistry = fresh();
  assert.throws(() => act(privateRegistry, { type: "dock", dockId: "berth", vehicleId: "visitor", vehicleRevision: 3 }, vehicle(privateRegistry, friend, "visitor")), /permission denied: dock/);
  const registry = publicDock(); const dockAction = { type: "dock" as const, dockId: "berth", vehicleId: "hopper", vehicleRevision: 3 };
  const occupied = act(registry, dockAction, vehicle(registry)).registry;
  assert.equal(occupied.stations.outpost.docks.berth.occupant?.ownerId, "pilot");
  assert.throws(() => act(occupied, { ...dockAction, vehicleId: "visitor" }, vehicle(occupied, friend, "visitor")), /busy/);
  assert.throws(() => act(registry, dockAction, { ...vehicle(registry), actor: stranger }), /vehicle owner/);
  assert.throws(() => act(registry, dockAction, { vehicle: { vehicleId: "hopper", ownerId: "pilot", locationId: other, revision: 3 } }), /vehicle evidence/);
  assert.throws(() => act(registry, { ...dockAction, vehicleRevision: 2 }, vehicle(registry)), /vehicle evidence/);
  assert.deepEqual(registry.stations.outpost.docks.berth.occupant, null);
});

test("owner can undock after grant revocation but station admin cannot evict another owner's ship", () => {
  let registry = publicDock();
  registry = act(registry, { type: "dock", dockId: "berth", vehicleId: "visitor", vehicleRevision: 3 }, vehicle(registry, friend, "visitor")).registry;
  registry = act(registry, { type: "access", memberIds: [], association: null, access: privateAccess() }).registry;
  assert.throws(() => act(registry, { type: "undock", dockId: "berth", vehicleId: "visitor", vehicleRevision: 3 }, { actor: pilot, vehicle: { vehicleId: "visitor", ownerId: "friend", locationId: orbit, revision: 3 } }), /vehicle owner/);
  assert.throws(() => act(registry, { type: "undock", dockId: "berth", vehicleId: "hopper", vehicleRevision: 3 }, vehicle(registry)), /own dock occupancy/);
  assert.throws(() => act(registry, { type: "undock", dockId: "berth", vehicleId: "visitor", vehicleRevision: 2 }, vehicle(registry, friend, "visitor", 2)), /own dock occupancy/);
  const result = act(registry, { type: "undock", dockId: "berth", vehicleId: "visitor", vehicleRevision: 4 }, vehicle(registry, friend, "visitor", 4));
  assert.equal(result.station.docks.berth.occupant, null);
});

test("one vehicle cannot occupy multiple berths and placement receipts/coordinates are unique", () => {
  let registry = publicDock();
  const ctx = { placements: [{ receiptId: "collar-2", actorId: "pilot", locationId: orbit, expectedRevision: registry.revision, kind: "docking-collar" as const, position: [3, 64, 0] as [number, number, number] }] };
  registry = act(registry, { type: "register-dock", dockId: "second", placementReceiptId: "collar-2" }, ctx).registry;
  registry = act(registry, { type: "dock", dockId: "berth", vehicleId: "hopper", vehicleRevision: 3 }, vehicle(registry)).registry;
  assert.throws(() => act(registry, { type: "dock", dockId: "second", vehicleId: "hopper", vehicleRevision: 3 }, vehicle(registry)), /duplicate docked vehicle/);
  assert.throws(() => act(registry, { type: "register-dock", dockId: "berth", placementReceiptId: "collar-2" }, { placements: ctx.placements.map(r => ({ ...r, expectedRevision: registry.revision })) }), /already registered/);
  for (const patch of [{ receiptId: "place-core" }, { position: [0, 64, 0] }]) {
    const receipt = { ...ctx.placements[0], expectedRevision: registry.revision, ...patch };
    assert.throws(() => act(registry, { type: "register-dock", dockId: "third", placementReceiptId: receipt.receiptId }, { placements: [receipt] } as Partial<StationActionContext>), /duplicate/);
  }
});

test("persistence rejects bad bands, identities, aliases, revision gaps, gas payloads and nonfinite coordinates", () => {
  const mutations = [
    (r: StationRegistrySave) => { r.stations.outpost.band = "high"; },
    (r: StationRegistrySave) => { r.stations.outpost.locationId = other; },
    (r: StationRegistrySave) => { r.stations.outpost.universeId = universeId("other"); },
    (r: StationRegistrySave) => { r.stations.outpost.corePosition[0] = Infinity; },
    (r: StationRegistrySave) => { r.stations.outpost.docks.berth.position[1] = 1.5; },
    (r: StationRegistrySave) => { r.stations.outpost.revision = 5; },
    (r: StationRegistrySave) => { r.journal[0].revision = 0; },
    (r: StationRegistrySave) => { r.journal[0].binding = "not-json"; },
    (r: StationRegistrySave) => { r.journal[0].binding = "{}"; },
    (r: StationRegistrySave) => { r.journal[0].actionId = "substituted"; },
    (r: StationRegistrySave) => { r.journal = []; },
    (r: StationRegistrySave) => { r.stations.outpost.memberIds = ["friend", "friend"]; },
    (r: StationRegistrySave) => { r.stations.outpost.pressureZoneIds = ["zone", "zone"]; },
    (r: StationRegistrySave) => { Object.assign(r.stations.outpost, { oxygenMl: 500 }); },
    (r: StationRegistrySave) => { r.stations.outpost.access.build = "everyone" as "public"; },
  ];
  for (const mutate of mutations) { const candidate = clone(fresh()); mutate(candidate); assert.throws(() => validateStationRegistrySave(candidate)); }
  const input = clone(fresh()); const output = validateStationRegistrySave(input); input.stations.outpost.name = "Changed outside";
  assert.equal(output.stations.outpost.name, "Home Observatory");
});

test("typed action boundary rejects unknown fields/types, wrong locations and unauthorized changes atomically", () => {
  const registry = fresh(), before = clone(registry);
  for (const action of [
    { type: "rename", name: "Valid", icon: "station", oxygenMl: 50 },
    { type: "constructor", name: "Invalid", icon: "station" },
    { type: "rename", name: "", icon: "station" },
    { type: "rename", name: "Valid", icon: "__proto__" },
  ]) assert.throws(() => act(registry, action as Parameters<typeof act>[1]));
  for (const location of [other, high]) assert.throws(() => act(registry, { type: "rename", name: "Invalid", icon: "station" }, { locationId: location }), /location\/universe mismatch/);
  assert.deepEqual(registry, before);
});
