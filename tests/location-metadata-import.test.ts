import assert from "node:assert/strict";
import test from "node:test";
import { homeLocation, locationId, universeId } from "../app/game/location-address";
import { remapLocationMetadata } from "../app/game/location-metadata-import";
import { remapStationRegistry, validateStationRegistrySave } from "../app/game/orbital-station";
import type { SaveFields } from "../app/game/universe-save";
import { locationMetadataFixture } from "./location-metadata-fixtures";

const source = locationId({ ...homeLocation(universeId("metadata-source")), kind: "orbit", instanceId: "low" });
const targetUniverse = universeId("metadata-imported");
const target = locationId({ ...homeLocation(targetUniverse), kind: "orbit", instanceId: "low" });

test("import remaps only explicit owners and airlock zone identities, preserving all finite resources and opaque cargo", () => {
  const fields = locationMetadataFixture(source), before = structuredClone(fields);
  const output = remapLocationMetadata(fields, source, targetUniverse);
  const expected = structuredClone(fields);
  expected.wayworks["8,33,0"].locationId = target;
  expected.pressure.zones = expected.pressure.zones.map(zone => ({ ...zone, locationId: target,
    zoneId: `${target}:air:${zone.membershipDigest}` }));
  expected.pressure.devices["12,32,0"].airlock!.links!.interiorZoneId = expected.pressure.zones[0].zoneId;
  expected.orbitalStations = remapStationRegistry(fields.orbitalStations, targetUniverse);
  assert.deepEqual(output, expected); assert.deepEqual(fields, before);
  const station = validateStationRegistrySave(output.orbitalStations, target);
  assert.equal(station.revision, 0); assert.deepEqual(station.journal, []);
  assert.deepEqual(station.stations["station-one"].pressureZoneIds, [expected.pressure.zones[0].zoneId]);
  assert.equal(station.stations["station-one"].wayanchorLeases[0].locationId, target);
  assert.equal(expected.pressure.devices["13,32,0"].airlock!.links, null);
  assert.equal(expected.pressure.devices["16,32,0"].airlock, null);
});

test("empty legacy fields and absent optional airlocks remain compatible", () => {
  assert.deepEqual(remapLocationMetadata({ edits: {}, furnaces: {}, chests: {} }, source, targetUniverse), { edits: {}, furnaces: {}, chests: {} });
  const fields: SaveFields = { pressure: { zones: [], devices: { "0,32,0": { installationId: "legacy" } } } };
  assert.deepEqual(remapLocationMetadata(fields, source, targetUniverse), fields);
});

test("foreign machine, room and airlock identities reject without mutation", () => {
  const baseline = locationMetadataFixture(source);
  for (const mutate of [
    (value: typeof baseline) => { value.wayworks["8,33,0"].locationId = target; },
    (value: typeof baseline) => { value.pressure.zones = value.pressure.zones.map(zone => ({ ...zone, locationId: target })); },
    (value: typeof baseline) => { value.pressure.zones = value.pressure.zones.map(zone => ({ ...zone, zoneId: "foreign:air:0000000000000000" })); },
    (value: typeof baseline) => { value.pressure.devices["12,32,0"].airlock!.links!.interiorZoneId = "foreign-room"; },
  ]) {
    const fields = structuredClone(baseline); mutate(fields); const before = structuredClone(fields);
    assert.throws(() => remapLocationMetadata(fields, source, targetUniverse), /mismatch/); assert.deepEqual(fields, before);
  }
  assert.throws(() => remapLocationMetadata(baseline, source, universeId("metadata-source")), /new universe/);
});
