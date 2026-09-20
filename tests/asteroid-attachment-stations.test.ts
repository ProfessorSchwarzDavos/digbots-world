import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, rebaseAsteroidCell } from "../app/game/asteroid-attachment-frame";
import { applyAsteroidStationMetadata, projectAsteroidStations, type AsteroidStationSources, type AsteroidStationMetadataAction } from "../app/game/asteroid-attachment-stations";
import { createAirZoneState, discoverAirZone } from "../app/game/airzone";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { applyStationAction, createStationRegistry, validateStationRegistrySave, type StationPosition, type StationRegistrySave } from "../app/game/orbital-station";
import { canonicalJson } from "../app/game/universe-json";
import { createSurveyHopper } from "../app/game/space-vehicle";
import { planStationDock } from "../app/game/station-runtime";
import { BlockId, Item } from "../app/game/data";

const orbit = locationAddress({ ...homeLocation(universeId("station-frames")), kind: "orbit", instanceId: "low" });
const asteroids = createAsteroidRegistry(orbit, 218), frame = createAsteroidAttachmentFrame(asteroids, asteroids.asteroids[0].descriptor.id);
const actor = { actorId: "host", factionIds: [], guildIds: [] };
const cell = (key: string) => rebaseAsteroidCell(frame, key, "local");
const point = (key: string) => cell(key).split(",").map(Number) as StationPosition;
function addStation(registry: StationRegistrySave, id: string, core: StationPosition) {
  const placements = [
    { receiptId: `${id}:core`, actorId: actor.actorId, locationId: frame.orbitId, expectedRevision: registry.revision, kind: "core" as const, position: core },
    { receiptId: `${id}:dock`, actorId: actor.actorId, locationId: frame.orbitId, expectedRevision: registry.revision, kind: "docking-collar" as const,
      position: [core[0] + 2, core[1], core[2]] as StationPosition },
  ];
  return applyStationAction(registry, { actor, locationId: frame.orbitId, expectedRevision: registry.revision, placements },
    { type: "create", stationId: id, actionId: `create:${id}`, name: id, icon: "station", band: "low",
      coreReceiptId: `${id}:core`, dockReceiptId: `${id}:dock`, dockId: "dock" }).registry;
}
function fixture(): AsteroidStationSources {
  const [x, y, z] = point("0,32,0");
  const topology = discoverAirZone({ epochs: { locationId: frame.orbitId, generation: 1, topologyRevision: 1, requestId: 1 },
    seed: { x, y, z }, cells: [{ x, y, z, passable: true, sealMask: 63 }] });
  const zone = createAirZoneState(topology, { oxygenMilliMoles: 7000, inertMilliMoles: 30000, co2MilliMoles: 42 }, 19000);
  let registry = addStation(createStationRegistry(frame.orbitId), "inside", [x, y, z]);
  registry = addStation(registry, "outside", [x - 100, y, z]);
  registry = applyStationAction(registry, { actor, locationId: frame.orbitId, expectedRevision: registry.revision },
    { type: "habitat", actionId: "attach:habitat", stationId: "inside", pressureZoneIds: [zone.zoneId],
      wayanchorLeases: [{ anchorId: "anchor-one", leaseId: "lease-one", locationId: frame.orbitId }] }).registry;
  return { registry, pressure: { schema: 1, nextInstallation: 13, zones: [zone], devices: {} }, fleet: { schema: 1, vehicles: {} },
    wayanchorCells: { "anchor-one": cell("3,32,0") } };
}
test("station view translates known references without duplicating or rewriting canonical history", () => {
  const source = fixture(), before = structuredClone(source), view = projectAsteroidStations(frame, source);
  assert.deepEqual(Object.keys(view.stations), ["inside"]);
  assert.deepEqual(view.stations.inside.corePosition, [0, 32, 0]);
  assert.deepEqual(view.stations.inside.docks.dock.position, [2, 32, 0]);
  assert.equal(view.stations.inside.wayanchorLeases[0].locationId, frame.localId);
  assert.ok(view.stations.inside.pressureZoneIds[0].startsWith(`${frame.localId}:air:`));
  assert.equal(view.canonicalRevision, 3); assert.equal("journal" in view, false);
  assert.throws(() => validateStationRegistrySave(view), /Station/);
  view.stations.inside.name = "ephemeral";
  assert.deepEqual(source, before);
});
test("local metadata actions use canonical permissions, exact replay binding and original history", () => {
  const source = fixture(), before = structuredClone(source), action = {
    type: "rename" as const, stationId: "inside", actionId: "rename:local", name: "Attached Observatory", icon: "observatory",
  };
  const result = applyAsteroidStationMetadata(frame, source, actor, 3, action);
  assert.equal(result.registry.locationId, frame.orbitId); assert.equal(result.registry.revision, 4);
  assert.deepEqual(result.registry.journal.slice(0, 3), source.registry.journal);
  assert.deepEqual(result.registry.stations.outside, source.registry.stations.outside);
  assert.equal(JSON.parse(result.receipt.binding).context.locationId, frame.orbitId);
  assert.deepEqual(result.registry.stations.inside.pressureZoneIds, source.registry.stations.inside.pressureZoneIds);
  assert.deepEqual(validateStationRegistrySave(JSON.parse(JSON.stringify(result.registry)), frame.orbitId), result.registry);
  const repeated = applyAsteroidStationMetadata(frame, { ...source, registry: result.registry }, actor, 3, action);
  assert.equal(repeated.replayed, true); assert.deepEqual(repeated.registry, result.registry);
  assert.throws(() => applyAsteroidStationMetadata(frame, { ...source, registry: result.registry }, actor, 3, { ...action, name: "Tampered" }), /replayed/);
  assert.throws(() => applyAsteroidStationMetadata(frame, source, { ...actor, actorId: "guest" }, 3, action), /permission/);
  assert.throws(() => applyAsteroidStationMetadata(frame, source, actor, 2, action), /stale/);
  assert.throws(() => applyAsteroidStationMetadata(frame, source, actor, 3, { ...action, stationId: "outside" }), /outside/);
  assert.deepEqual(source, before);
});
test("habitat proposals map only real selected room and Wayanchor references back to the one owner", () => {
  const source = fixture(), view = projectAsteroidStations(frame, source), station = view.stations.inside;
  const action = { type: "habitat" as const, actionId: "habitat:local", stationId: "inside",
    pressureZoneIds: station.pressureZoneIds, wayanchorLeases: station.wayanchorLeases };
  const result = applyAsteroidStationMetadata(frame, source, actor, 3, action);
  assert.deepEqual(result.station.pressureZoneIds, source.registry.stations.inside.pressureZoneIds);
  assert.deepEqual(result.station.wayanchorLeases, source.registry.stations.inside.wayanchorLeases);
  assert.equal(canonicalJson(source.pressure), canonicalJson(fixture().pressure));
  assert.throws(() => applyAsteroidStationMetadata(frame, source, actor, 3, { ...action, pressureZoneIds: [source.pressure.zones[0].zoneId] }), /outside/);
  assert.throws(() => applyAsteroidStationMetadata(frame, source, actor, 3, { ...action, wayanchorLeases: [{ ...action.wayanchorLeases[0], anchorId: "unknown" }] }), /outside/);
  assert.throws(() => applyAsteroidStationMetadata(frame, source, actor, 3, { type: "dock" } as unknown as AsteroidStationMetadataAction), /physical\/fleet/);
});
test("whole station claims and inward references reject before touching any canonical resources", () => {
  for (const mutate of [
    (s: AsteroidStationSources) => { s.registry.stations.inside.corePosition[0] += 9; },
    (s: AsteroidStationSources) => { s.registry.stations.outside.corePosition[0] = frame.orbitBounds.minX - 10; },
    (s: AsteroidStationSources) => { s.registry.stations.outside.docks.dock.position = point("4,32,0"); },
    (s: AsteroidStationSources) => { s.registry.stations.inside.docks.dock.position = point("31,32,0"); },
    (s: AsteroidStationSources) => { s.registry.stations.outside.pressureZoneIds = s.registry.stations.inside.pressureZoneIds; s.registry.stations.inside.pressureZoneIds = []; },
    (s: AsteroidStationSources) => { s.registry.stations.outside.wayanchorLeases = s.registry.stations.inside.wayanchorLeases; s.registry.stations.inside.wayanchorLeases = []; },
    (s: AsteroidStationSources) => { s.registry.stations.inside.docks.dock.occupant = { vehicleId: "missing", ownerId: "host", vehicleRevision: 0 }; },
  ]) {
    const source = structuredClone(fixture()); mutate(source); const before = structuredClone(source);
    assert.throws(() => projectAsteroidStations(frame, source), /crosses|custody|vehicle|occupancy/);
    assert.deepEqual(source, before);
  }
  const source = fixture();
  assert.throws(() => projectAsteroidStations(frame, { ...source, wayanchorCells: {} }), /unresolved/);
  assert.throws(() => projectAsteroidStations(frame, { ...source, pressure: { ...source.pressure, zones: [] } }), /unresolved/);
});
test("an outside collar's diagonal approach overlap cannot evade frame boundary checks", () => {
  const source = structuredClone(fixture()), b = frame.orbitBounds;
  source.registry.stations.outside.docks.dock.position = [b.maxX + 1, point("0,32,0")[1], b.minZ - 1];
  const before = structuredClone(source);
  assert.throws(() => projectAsteroidStations(frame, source), /approach.*boundary/);
  assert.deepEqual(source, before);
});
test("viewing and administering an occupied station preserves its canonical ship and finite cargo exactly", () => {
  const source = fixture(), station = source.registry.stations.inside, dock = station.docks.dock;
  const ship = structuredClone(createSurveyHopper("hopper", "host", frame.orbitId, [dock.position[0], dock.position[1] + .51, dock.position[2]]));
  ship.phase = "orbit"; ship.fuelMl = 371; ship.oxidizerMl = 593; ship.oxygenMl = 113; ship.batteryJoules = 823;
  ship.cargo[0] = { item: Item.FieldWrench, count: 1, durability: 51, metadata: { x: 912, stationId: "portable" } };
  ship.cargoOwnership[0] = "one-finite-tool";
  const docked = planStationDock({ registry: source.registry, fleet: { schema: 1, vehicles: { hopper: ship } }, actor,
    vehicleId: ship.vehicleId, stationId: station.id, dockId: dock.id, expectedRegistryRevision: 3, expectedVehicleRevision: 0,
    actionId: "dock:canonical", undock: false, blockAt: (x, y, z) => {
      const key = `${x},${y},${z}`;
      return key === station.corePosition.join(",") ? BlockId.StationCore : key === dock.position.join(",") ? BlockId.OrbitalDock : BlockId.Air;
    } });
  const input = { ...source, ...docked }, before = structuredClone(input), view = projectAsteroidStations(frame, input);
  assert.equal(view.stations.inside.docks.dock.occupant!.vehicleId, "hopper");
  const result = applyAsteroidStationMetadata(frame, input, actor, 4,
    { type: "rename", stationId: "inside", actionId: "rename:occupied", name: "Occupied Station", icon: "station" });
  assert.deepEqual(input, before); assert.deepEqual(result.registry.journal.slice(0, 4), input.registry.journal);
  assert.deepEqual(result.registry.stations.inside.docks, input.registry.stations.inside.docks);
  projectAsteroidStations(frame, { ...input, registry: result.registry });
  assert.deepEqual(input.fleet, before.fleet);
});
