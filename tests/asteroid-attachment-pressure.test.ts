import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, rebaseAsteroidCell } from "../app/game/asteroid-attachment-frame";
import { captureAsteroidPressure, projectAsteroidPressure } from "../app/game/asteroid-attachment-pressure";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { createAirZoneState, discoverAirZone } from "../app/game/airzone";
import { createPressureDevice } from "../app/game/pressure-devices";
import type { PressureSave } from "../app/game/pressure-runtime";

const orbit = locationAddress({ ...homeLocation(universeId("pressure-owner-test")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 800);
const frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const insideKey = rebaseAsteroidCell(frame, "0,32,0", "local"), outsideKey = "0,32,0";
function room(key: string, oxygenMilliMoles: number) {
  const [x, y, z] = key.split(",").map(Number), point = { x, y, z };
  const topology = discoverAirZone({ epochs: { locationId: frame.orbitId, generation: 1, topologyRevision: 3, requestId: 7 }, seed: point,
    cells: [{ ...point, passable: true, sealMask: 63, controllerIds: [key] }] });
  return createAirZoneState(topology, { oxygenMilliMoles, inertMilliMoles: 30000, co2MilliMoles: 71 }, 19500);
}
function fixture(): PressureSave {
  const inside = createPressureDevice("p-10"), outside = createPressureDevice("p-11");
  inside.links.room = insideKey; outside.links.room = outsideKey;
  const flux = { oxygenMilliMoles: 31, inertMilliMoles: 57, co2MilliMoles: 11, thermalEnergyMilliJ: 12345 };
  return { schema: 1, nextInstallation: 12, zones: [room(outsideKey, 5000), room(insideKey, 7000), room("5,32,0", 9000)],
    devices: { [insideKey]: inside, [outsideKey]: outside }, boundary: { admitted: { ...flux }, released: { ...flux }, topologyLost: { ...flux } } };
}
test("an unchanged projected pressure view round-trips to its one canonical owner exactly", () => {
  const source = fixture(), before = structuredClone(source), view = projectAsteroidPressure(frame, source);
  assert.equal(view.zones.length, 1); assert.deepEqual(Object.keys(view.devices), ["0,32,0"]);
  assert.deepEqual(view.boundary, source.boundary); assert.equal(view.nextInstallation, 12);
  assert.deepEqual(captureAsteroidPressure(frame, source, view, structuredClone(view)), source);
  assert.deepEqual(source, before);
  view.devices["0,32,0"].installationId = "mutated";
  assert.deepEqual(source, before, "projection never aliases canonical devices");
});
test("local resource changes update only selected rooms and keep global counters/flux once", () => {
  const source = fixture(), before = structuredClone(source), baseline = projectAsteroidPressure(frame, source), edited = structuredClone(baseline);
  edited.zones[0] = { ...edited.zones[0], oxygenMilliMoles: edited.zones[0].oxygenMilliMoles - 10,
    thermalEnergyMilliJ: edited.zones[0].thermalEnergyMilliJ - 500, resourceRevision: edited.zones[0].resourceRevision + 1 };
  edited.devices["1,32,0"] = createPressureDevice("p-12"); edited.nextInstallation = 13;
  edited.boundary!.released.oxygenMilliMoles += 10; edited.boundary!.released.thermalEnergyMilliJ += 500;
  const output = captureAsteroidPressure(frame, source, baseline, edited);
  assert.equal(output.nextInstallation, 13); assert.equal(output.boundary!.released.oxygenMilliMoles, 41);
  assert.equal(output.boundary!.released.thermalEnergyMilliJ, 12845);
  assert.deepEqual(output.boundary!.admitted, source.boundary!.admitted);
  assert.deepEqual(output.zones[0], source.zones[0]); assert.deepEqual(output.zones[2], source.zones[2]);
  assert.equal(output.zones[1].oxygenMilliMoles, 6990);
  for (const field of ["oxygenMilliMoles", "inertMilliMoles", "co2MilliMoles", "thermalEnergyMilliJ"] as const)
    assert.equal(output.zones.reduce((sum, zone) => sum + zone[field], 0) + output.boundary!.released[field],
      source.zones.reduce((sum, zone) => sum + zone[field], 0) + source.boundary!.released[field]);
  assert.deepEqual(output.devices[outsideKey], source.devices[outsideKey]);
  assert.equal(output.devices[rebaseAsteroidCell(frame, "1,32,0", "local")].installationId, "p-12");
  assert.deepEqual(source, before);
  assert.deepEqual(captureAsteroidPressure(frame, output, projectAsteroidPressure(frame, output), projectAsteroidPressure(frame, output)), output);
});
test("a projection cannot overwrite changed selected custody, shared counters or cumulative ledgers", () => {
  const source = fixture(), baseline = projectAsteroidPressure(frame, source);
  for (const mutate of [
    (value: PressureSave) => { value.nextInstallation++; },
    (value: PressureSave) => { value.boundary!.admitted.inertMilliMoles++; },
    (value: PressureSave) => { value.zones[1] = { ...value.zones[1], oxygenMilliMoles: 6999 }; },
    (value: PressureSave) => { value.devices[insideKey].open = true; },
  ]) {
    const changed = structuredClone(source); mutate(changed); const before = structuredClone(changed);
    assert.throws(() => captureAsteroidPressure(frame, changed, baseline, baseline), /Stale/); assert.deepEqual(changed, before);
  }
  const independent = structuredClone(source); independent.zones[0] = { ...independent.zones[0], oxygenMilliMoles: 4999 };
  assert.deepEqual(captureAsteroidPressure(frame, independent, baseline, baseline).zones[0], independent.zones[0]);
});
test("crossing room membership and inward/outward links reject before splitting their ownership", () => {
  for (const direction of ["outward", "inward"] as const) {
    const source = fixture();
    source.devices[direction === "outward" ? insideKey : outsideKey].links.reserve = direction === "outward" ? outsideKey : insideKey;
    const before = structuredClone(source);
    assert.throws(() => projectAsteroidPressure(frame, source), /crosses/); assert.deepEqual(source, before);
  }
  const source = fixture(), boundary = { x: frame.orbitBounds.maxX, y: 32, z: frame.offset.z };
  const next = { ...boundary, x: boundary.x + 1 };
  const topology = discoverAirZone({ epochs: { locationId: frame.orbitId, generation: 1, topologyRevision: 3, requestId: 7 }, seed: boundary,
    cells: [{ ...boundary, passable: true, sealMask: 62, controllerIds: [insideKey] }, { ...next, passable: true, sealMask: 61 }] });
  assert.equal(topology.cellCount, 2); source.zones = [createAirZoneState(topology, { oxygenMilliMoles: 300, inertMilliMoles: 500, co2MilliMoles: 7 })];
  assert.throws(() => projectAsteroidPressure(frame, source), /crosses/);
});
test("counter/ledger rewind, disappeared totals and outside installation collisions cannot commit", () => {
  const source = fixture(), baseline = projectAsteroidPressure(frame, source);
  for (const mutate of [
    (value: PressureSave) => { value.nextInstallation--; },
    (value: PressureSave) => { value.boundary!.released.oxygenMilliMoles--; },
    (value: PressureSave) => { delete value.boundary; },
    (value: PressureSave) => { value.devices["1,32,0"] = createPressureDevice("p-11"); },
    (value: PressureSave) => { value.devices["32,32,0"] = createPressureDevice("p-12"); },
  ]) {
    const edited = structuredClone(baseline); mutate(edited); const before = structuredClone(source);
    assert.throws(() => captureAsteroidPressure(frame, source, baseline, edited), /rewind|discard|Duplicate|boundary/); assert.deepEqual(source, before);
  }
});
