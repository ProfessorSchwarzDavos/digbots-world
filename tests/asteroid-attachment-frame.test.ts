import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { asteroidAttachmentContains, createAsteroidAttachmentFrame, rebaseAsteroidAquariums, rebaseAsteroidCell,
  rebaseAsteroidKeyed, rebaseAsteroidMachines, rebaseAsteroidPressure } from "../app/game/asteroid-attachment-frame";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { createAirZoneState, discoverAirZone, normalizeAirZoneState, rebaseAirZoneState } from "../app/game/airzone";
import { createPressureDevice } from "../app/game/pressure-devices";
import { createAirlockState } from "../app/game/pressure-airlock";
import { PressureTopology } from "../app/game/pressure-topology";
import { createMachine } from "../app/game/wayworks";
import { Item } from "../app/game/data";
import type { PressureSave } from "../app/game/pressure-runtime";
import type { AquariumState } from "../app/game/aquarium";
import { ASTEROID_ATTACHMENT_FIELD_POLICY, assertKnownAsteroidAttachmentFields } from "../app/game/asteroid-attachment-policy";
import { GUEST_LOCATION_FIELDS, WORLD_SAVE_OWNERS } from "../app/game/universe-save";
import { createStationRegistry, STATION_PERMISSIONS, validateStationRegistrySave, type StationAccess } from "../app/game/orbital-station";
import { parseLocationId } from "../app/game/location-address";

const orbit = locationAddress({ ...homeLocation(universeId("attachment-test")), kind: "orbit", instanceId: "high" });
const registry = createAsteroidRegistry(orbit, 733, 3);
const frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const localKey = "0,32,0", orbitKey = rebaseAsteroidCell(frame, localKey, "local");
const fromLocal = (key: string) => rebaseAsteroidCell(frame, key, "local");
function pressureFixture(): PressureSave {
  const [x, y, z] = orbitKey.split(",").map(Number), point = { x, y, z };
  const room = discoverAirZone({ epochs: { locationId: frame.orbitId, generation: 3, topologyRevision: 6, requestId: 2 },
    seed: point, cells: [{ ...point, passable: true, sealMask: 63, controllerIds: [orbitKey] }] });
  const zone = createAirZoneState(room, { oxygenMilliMoles: 8700, inertMilliMoles: 32800, co2MilliMoles: 10 }, 19876);
  const device = createPressureDevice("installation:stable:17");
  device.links = { room: orbitKey, exterior: "exterior", reserve: fromLocal("1,32,0") };
  device.bindings = { [fromLocal("1,32,0")]: "installation:stable:18" };
  device.airlock = createAirlockState({ controllerKey: orbitKey, innerDoorKey: fromLocal("2,32,0"), outerDoorKey: fromLocal("3,32,0"),
    recoveryPumpKey: fromLocal("4,32,0"), reserveKey: fromLocal("1,32,0"), chamberZoneId: orbitKey,
    interiorZoneId: zone.zoneId, exteriorZoneId: "exterior" });
  device.airlock.phaseElapsedMs = 1234; device.airlock.cycleElapsedMs = 5123; device.airlock.sequence = 7;
  const flux = { oxygenMilliMoles: 47, inertMilliMoles: 151, co2MilliMoles: 3, thermalEnergyMilliJ: 981234 };
  return { schema: 1, nextInstallation: 19, zones: [zone], devices: { [orbitKey]: device },
    boundary: { admitted: { ...flux }, released: { ...flux }, topologyLost: { ...flux } } };
}

test("all 252 attachment columns are disjoint and round-trip negative/high-band coordinates", () => {
  const origins = new Set<string>();
  for (const { descriptor } of registry.asteroids) {
    const current = createAsteroidAttachmentFrame(registry, descriptor.id), b = current.localBounds;
    assert(!origins.has(`${current.orbitBounds.minX},${current.orbitBounds.minZ}`));
    origins.add(`${current.orbitBounds.minX},${current.orbitBounds.minZ}`);
    for (const x of [b.minX, 0, b.maxX]) for (const y of [b.minY, 32, b.maxY]) for (const z of [b.minZ, 0, b.maxZ]) {
      const key = `${x},${y},${z}`, projected = rebaseAsteroidCell(current, key, "local");
      assert.equal(rebaseAsteroidCell(current, projected, "orbit"), key);
    }
    assert.equal(rebaseAsteroidCell(current, `${descriptor.center.x},${descriptor.center.y},${descriptor.center.z}`, "orbit"), localKey);
    assert(current.localId.includes("asteroid-high-"));
    assert.throws(() => rebaseAsteroidCell(current, "32,32,0", "local"), /boundary/);
    assert.throws(() => rebaseAsteroidCell(current, `0,${b.maxY + 1},0`, "local"), /boundary/);
  }
  assert.equal(origins.size, 252);
});
test("frame admission rejects missing identity and malformed/aliased cell keys", () => {
  assert.throws(() => createAsteroidAttachmentFrame(registry, "missing"), /Unknown/);
  for (const key of ["-0,32,0", "00,32,0", "0,32.5,0", "0,32,0,1", "NaN,32,0", "9007199254740992,32,0"])
    assert.throws(() => rebaseAsteroidCell(frame, key, "local"), /cell key/);
  assert(!asteroidAttachmentContains(frame, { x: 0, y: 32.5, z: 0 }, "local"));
});
test("keyed contents detach deeply but keep portable coordinates and finite metadata opaque", () => {
  const input = { [orbitKey]: { inventory: [{ item: Item.FieldWrench, count: 1, metadata: { x: 998, y: -7, z: 41,
    specimenId: "one-creature", sealedMachine: { locationId: "portable-origin", energyJ: 734, heatJ: 812, waterMl: 251 } } }] } };
  const before = structuredClone(input), local = rebaseAsteroidKeyed(frame, input, "orbit");
  assert.deepEqual(local[localKey], input[orbitKey]);
  assert.deepEqual(rebaseAsteroidKeyed(frame, local, "local"), input);
  local[localKey].inventory[0].metadata.sealedMachine.energyJ = 0;
  assert.deepEqual(input, before);
  assert.throws(() => rebaseAsteroidKeyed(frame, { ...input, "0,32,0": { inventory: [] } }, "orbit"), /boundary/);
  assert.deepEqual(input, before);
});
test("machine frame changes only address and top-level key, never stores, revision, facing or installation", () => {
  const machine = createMachine("life-support-controller", frame.orbitId, "host", 3);
  machine.energyJ = 54321; machine.revision = 92; machine.workshop.heatJ = 711; machine.workshop.chemical = { resource: "oxygen", amount: 19991 };
  machine.workshop.slots.input = { item: Item.FieldWrench, count: 1, metadata: { x: 31, locationId: "portable-original" } };
  const input = { [orbitKey]: machine }, before = structuredClone(input), output = rebaseAsteroidMachines(frame, input, "orbit");
  assert.deepEqual(output, { [localKey]: { ...machine, locationId: frame.localId } });
  assert.deepEqual(rebaseAsteroidMachines(frame, output, "local"), input); assert.deepEqual(input, before);
  assert.throws(() => rebaseAsteroidMachines(frame, { [orbitKey]: { ...machine, locationId: "foreign" } }, "orbit"), /Foreign/);
});
test("whole aquariums retain exact resident identity, metadata and breeding epoch", () => {
  const resident = { id: "fish-one", metadata: { specimenId: "fish-one", x: 111, y: 222, z: 333 }, storedAt: 771 };
  const input = { [orbitKey]: { schema: 1, blockKeys: [orbitKey, fromLocal("1,32,0")], residents: [resident], lastBreedingCycle: 93 } } as unknown as Record<string, AquariumState>;
  const local = rebaseAsteroidAquariums(frame, input, "orbit");
  assert.deepEqual(local[localKey].blockKeys, [localKey, "1,32,0"]);
  assert.deepEqual(local[localKey].residents, input[orbitKey].residents);
  assert.deepEqual(rebaseAsteroidAquariums(frame, local, "local"), input);
  const crossing = structuredClone(input); crossing[orbitKey] = { ...crossing[orbitKey], blockKeys: [orbitKey, "0,32,0"] };
  const before = structuredClone(crossing);
  assert.throws(() => rebaseAsteroidAquariums(frame, crossing, "orbit"), /boundary/); assert.deepEqual(crossing, before);
});
test("pressure round trip preserves every molecule, heat unit, identity, deadline and boundary total", () => {
  const input = pressureFixture(), before = structuredClone(input), local = rebaseAsteroidPressure(frame, input, "orbit");
  assert.equal(local.zones[0].locationId, frame.localId); assert.deepEqual(local.zones[0].cellKeys, [localKey]);
  assert.deepEqual(local.zones[0].controllerIds, [localKey]); assert(normalizeAirZoneState(local.zones[0]));
  for (const field of ["oxygenMilliMoles", "inertMilliMoles", "co2MilliMoles", "thermalEnergyMilliJ", "resourceRevision", "topologyRevision", "pressureMilliKPa", "temperatureMilliC"] as const)
    assert.equal(local.zones[0][field], input.zones[0][field]);
  assert.deepEqual(local.boundary, input.boundary);
  const device = local.devices[localKey]; assert.equal(device.installationId, input.devices[orbitKey].installationId);
  assert.equal(device.airlock!.links!.chamberZoneId, localKey); assert.equal(device.airlock!.links!.interiorZoneId, local.zones[0].zoneId);
  assert.equal(local.zones[0].zoneId, `${frame.localId}:air:${local.zones[0].membershipDigest}`);
  assert.equal(device.airlock!.phaseElapsedMs, 1234); assert.equal(device.airlock!.cycleElapsedMs, 5123);
  assert.deepEqual(rebaseAsteroidPressure(frame, local, "local"), input); assert.deepEqual(input, before);
  const topology = new PressureTopology({ flagsAt: () => 0, sectionLoaded: () => true }, frame.localId, 99, () => {}, JSON.parse(JSON.stringify(local.zones)));
  const loaded = topology.zoneAt({ x: 0, y: 32, z: 0 }); assert(loaded);
  assert.equal(loaded.oxygenMilliMoles, input.zones[0].oxygenMilliMoles);
  assert.equal(loaded.thermalEnergyMilliJ, input.zones[0].thermalEnergyMilliJ);
});
test("cross-frame room membership, links and foreign pressure owners reject without source mutation", () => {
  for (const mutate of [
    (save: PressureSave) => { save.devices[orbitKey].links.reserve = "0,32,0"; },
    (save: PressureSave) => { save.devices[orbitKey].bindings["0,32,0"] = "outside"; },
    (save: PressureSave) => { save.devices[orbitKey].airlock!.links!.innerDoorKey = "0,32,0"; },
    (save: PressureSave) => { save.zones[0] = { ...save.zones[0], locationId: "foreign" }; },
    (save: PressureSave) => { save.zones[0] = rebaseAirZoneState(save.zones[0], frame.orbitId, () => "0,32,0"); },
  ]) {
    const input = pressureFixture(); mutate(input); const before = structuredClone(input);
    assert.throws(() => rebaseAsteroidPressure(frame, input, "orbit"), /boundary|Foreign/); assert.deepEqual(input, before);
  }
});
test("room rebasing refuses malformed membership or invalid gas and does not mutate input", () => {
  const input = pressureFixture().zones[0], before = structuredClone(input);
  assert.throws(() => rebaseAirZoneState({ ...input, oxygenMilliMoles: -1 }, frame.localId, () => localKey), /invalid/);
  assert.throws(() => rebaseAirZoneState(input, "", () => localKey), /invalid/);
  assert.throws(() => rebaseAirZoneState(input, frame.localId, () => "-0,32,0"), /invalid/);
  assert.deepEqual(input, before);
});
test("overlapping rooms, duplicate installations and unsupported component schemas cannot lose custody during hydration", () => {
  const input = pressureFixture(), overlap = structuredClone(input);
  overlap.zones.push({ ...overlap.zones[0], zoneId: "other-room-same-cell" });
  assert.throws(() => rebaseAsteroidPressure(frame, overlap, "orbit"), /Overlapping/);
  const duplicate = structuredClone(input);
  duplicate.devices[fromLocal("5,32,0")] = structuredClone(input.devices[orbitKey]);
  assert.throws(() => rebaseAsteroidPressure(frame, duplicate, "orbit"), /Duplicate/);
  const unsupported = structuredClone(input); (unsupported.devices[orbitKey] as { schema: number }).schema = 2;
  assert.throws(() => rebaseAsteroidPressure(frame, unsupported, "orbit"), /unsupported/);
  assert.deepEqual(input, pressureFixture());
});
test("every current location field and guest subpartition has an explicit policy; unknown owners fail closed", () => {
  const expected = [...Object.entries(WORLD_SAVE_OWNERS).filter(([, owner]) => owner === "location").map(([key]) => key), GUEST_LOCATION_FIELDS].sort();
  assert.deepEqual(Object.keys(ASTEROID_ATTACHMENT_FIELD_POLICY).sort(), expected);
  const input = Object.fromEntries(expected.map(key => [key, null]));
  assert.doesNotThrow(() => assertKnownAsteroidAttachmentFields(input));
  for (const key of ["futureResourceCargo", "inventory", "spacefleet", "asteroidFields", "__proto__", "constructor"])
    assert.throws(() => assertKnownAsteroidAttachmentFields(Object.fromEntries([[key, { amount: 4 }]])), /Unsupported/);
});
test("rebased pressure identities remain valid station references in the destination frame", () => {
  const local = rebaseAsteroidPressure(frame, pressureFixture(), "orbit"), address = parseLocationId(frame.localId);
  const registry = structuredClone(createStationRegistry(frame.localId));
  registry.stations.attached = { id: "attached", universeId: address.universeId, locationId: registry.locationId, band: "high",
    corePosition: [0, 32, 0], corePlacementReceiptId: "core-receipt", name: "Attached", icon: "station", ownerId: "host",
    memberIds: [], association: null, access: Object.fromEntries(STATION_PERMISSIONS.map(permission => [permission, "private"])) as StationAccess,
    docks: { berth: { id: "berth", position: [1, 32, 0], placementReceiptId: "dock-receipt", occupant: null } },
    pressureZoneIds: [local.zones[0].zoneId], wayanchorLeases: [], revision: 0 };
  assert.doesNotThrow(() => validateStationRegistrySave(registry));
});
