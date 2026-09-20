import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { captureAsteroidAttachmentCatalog, hydrateAsteroidAttachmentLocation, readAsteroidAttachmentCatalog } from "../app/game/asteroid-attachment-catalog";
import { celestialTerrainSeed } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { BlockId } from "../app/game/data";
import type { AsteroidFieldsSave } from "../app/game/asteroid-runtime";

const universe = universeId("owner-catalog"), home = homeLocation(universe);
const a = locationAddress({ ...home, kind: "orbit", instanceId: "low" }), b = locationAddress({ ...home, kind: "orbit", instanceId: "high" });
const aId = locationId(a), bId = locationId(b), aSeed = "owner-A", bSeed = "owner-B";
const fields: AsteroidFieldsSave = { schema: 1, fields: { [aId]: createAsteroidRegistry(a, celestialTerrainSeed(aSeed)), [bId]: createAsteroidRegistry(b, celestialTerrainSeed(bSeed)) } };
const location = (seed: string, count: number) => ({ seed, generatorVersion: 18, spawn: { x: 0, y: 32, z: 0 }, edits: {}, furnaces: {},
  chests: { "0,32,0": [{ item: BlockId.Stone, count, metadata: { x: 736, note: "portable unchanged" } }] } });
test("legacy orbit locations remain unchanged until explicit admission", () => {
  const input = location(aSeed, 17), before = structuredClone(input);
  const legacy = captureAsteroidAttachmentCatalog(undefined, fields, fields, aId, input, { unknownLegacy: true });
  assert.deepEqual(legacy.catalog.owners, {}); assert.deepEqual(legacy.location, input);
  assert.deepEqual(hydrateAsteroidAttachmentLocation(legacy.catalog, fields, aId, legacy.location), input);
  assert.throws(() => captureAsteroidAttachmentCatalog(undefined, fields, fields, aId, input, { unknownLegacy: true }, true), /extensions/);
  assert.deepEqual(input, before);
});
test("two orbit owners remain independent while read/write projections preserve the flat engine contract", () => {
  const first = captureAsteroidAttachmentCatalog(undefined, fields, fields, aId, location(aSeed, 17), {}, true);
  const second = captureAsteroidAttachmentCatalog(first.catalog, fields, fields, bId, location(bSeed, 29), {}, true);
  assert.deepEqual(second.catalog.owners[aId], first.catalog.owners[aId]);
  assert.ok(!("chests" in first.location)); assert.ok(!("chests" in second.location));
  const changed = captureAsteroidAttachmentCatalog(second.catalog, fields, fields, aId, location(aSeed, 16), {});
  assert.equal(changed.catalog.owners[aId].revision, 1); assert.deepEqual(changed.catalog.owners[bId], second.catalog.owners[bId]);
  assert.deepEqual(hydrateAsteroidAttachmentLocation(changed.catalog, fields, aId, changed.location), location(aSeed, 16));
  assert.deepEqual(hydrateAsteroidAttachmentLocation(changed.catalog, fields, bId, second.location), location(bSeed, 29));
  assert.throws(() => captureAsteroidAttachmentCatalog(second.catalog, fields, fields, aId, location(aSeed, 17), {}, true), /already exists/);
  assert.throws(() => hydrateAsteroidAttachmentLocation(changed.catalog, fields, aId, location(aSeed, 16)), /duplicate/);
});
test("catalog identity, missing fields, foreign universes and unsupported admission locations reject", () => {
  const admitted = captureAsteroidAttachmentCatalog(undefined, fields, fields, aId, location(aSeed, 17), {}, true);
  assert.deepEqual(readAsteroidAttachmentCatalog(JSON.parse(JSON.stringify(admitted.catalog)), fields, universe), admitted.catalog);
  assert.throws(() => readAsteroidAttachmentCatalog(admitted.catalog, { schema: 1, fields: {} }), /missing/);
  assert.throws(() => readAsteroidAttachmentCatalog({ ...admitted.catalog, extra: true }, fields), /unsupported/);
  assert.throws(() => readAsteroidAttachmentCatalog({ schema: 1, owners: { [bId]: admitted.catalog.owners[aId] } }, fields), /foreign/);
  assert.throws(() => readAsteroidAttachmentCatalog(admitted.catalog, fields, universeId("foreign")), /Foreign/);
  assert.throws(() => captureAsteroidAttachmentCatalog(undefined, fields, fields, locationId(home), location(aSeed, 17), {}, true), /orbital/);
  const localId = locationId({ ...a, kind: "asteroid", instanceId: fields.fields[aId].asteroids[0].descriptor.id });
  assert.throws(() => hydrateAsteroidAttachmentLocation(admitted.catalog, fields, localId, location(aSeed, 17)), /complete frame adapter/);
  assert.throws(() => captureAsteroidAttachmentCatalog(admitted.catalog, fields, fields, localId, location(aSeed, 17), {}), /complete frame adapter/);
});
