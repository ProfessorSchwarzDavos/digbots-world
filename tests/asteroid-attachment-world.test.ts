import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { captureAsteroidEdits } from "../app/game/asteroid-runtime";
import { createAsteroidAttachmentFrame, rebaseAsteroidCell } from "../app/game/asteroid-attachment-frame";
import { createAsteroidAttachmentWorld, assertAsteroidAttachmentWorldUnchanged, type AsteroidAttachmentWorldSource } from "../app/game/asteroid-attachment-world";
import { CELESTIAL_TERRAIN_VERSION, createCelestialTerrain } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { canonicalJson } from "../app/game/universe-json";
import type { ChunkEditSave } from "../app/game/world";

const orbit = locationAddress({ ...homeLocation(universeId("attachment-world")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 953), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const terrain = createCelestialTerrain({ location: orbit, seed: registry.seed, expansionLevel: registry.expansionLevel })!;
const point = (key: string) => { const [x, y, z] = key.split(",").map(Number); return { x, y, z }; };
const key = (local: string) => rebaseAsteroidCell(frame, local, "local");
function edits(...entries: Array<[string, BlockId]>): ChunkEditSave {
  const result: ChunkEditSave = {};
  for (const [cell, block] of entries) {
    const { x, y, z } = point(cell), cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    (result[`${cx},${cz}`] ??= []).push([(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, block]);
  }
  return result;
}
function fixture(changes: ChunkEditSave = {}): AsteroidAttachmentWorldSource {
  const captured = captureAsteroidEdits({ schema: 1, fields: { [frame.orbitId]: registry } }, orbit, changes).fields[frame.orbitId];
  return { locationId: frame.orbitId, terrainVersion: CELESTIAL_TERRAIN_VERSION, terrainSeed: terrain.seed,
    expansionLevel: 0, registry: captured, edits: changes, blockFacings: {} };
}

test("complete orbital reader resolves unloaded terrain and empty space without a live chunk/cache", () => {
  const reader = createAsteroidAttachmentWorld(fixture());
  for (const { descriptor } of registry.asteroids) for (const delta of [-25, -8, 0, 8, 25]) {
    const { x, y, z } = descriptor.center;
    assert.equal(reader.block(`${x + delta},${y},${z}`), terrain.block(x + delta, y, z));
  }
  assert.equal(reader.block("100000,20,100000"), BlockId.Air);
  assert.equal(reader.block("0,-65,0"), BlockId.Bedrock); assert.equal(reader.block("0,128,0"), BlockId.Air);
  assert.equal(reader.facing(key("0,32,0")), 0);
});

test("captured finite mining and out-of-rock construction/facings share one exact immutable image", () => {
  const mined = key("0,32,0"), built = key("30,32,0");
  const source: AsteroidAttachmentWorldSource & { blockFacings: Record<string, 0 | 1 | 2 | 3> } = {
    ...fixture(edits([mined, BlockId.Air], [built, BlockId.ReinforcedWindow])), blockFacings: { [built]: 3 } };
  const reader = createAsteroidAttachmentWorld(source), baseline = canonicalJson(source);
  assert.equal(reader.block(mined), BlockId.Air); assert.equal(reader.block(built), BlockId.ReinforcedWindow); assert.equal(reader.facing(built), 3);
  assertAsteroidAttachmentWorldUnchanged(reader, JSON.parse(baseline));
  for (const values of Object.values(source.edits)) values.forEach(entry => { entry[1] = BlockId.GoldOre; });
  source.blockFacings[built] = 1;
  assert.equal(reader.block(mined), BlockId.Air); assert.equal(reader.block(built), BlockId.ReinforcedWindow); assert.equal(reader.facing(built), 3);
  assert.throws(() => assertAsteroidAttachmentWorldUnchanged(reader, source), /Stale/);
  assert(Object.isFrozen(reader.source)); assert.equal(reader.sourceBaseline, baseline);
});

test("uncaptured finite edits and contradictory stale mirrors fail before any terrain is admitted", () => {
  const mined = key("0,32,0"), source = fixture(edits([mined, BlockId.Air]));
  assert.notEqual(terrain.block(...Object.values(point(mined)) as [number, number, number]), BlockId.Air);
  assert.throws(() => createAsteroidAttachmentWorld({ ...source, registry }), /Uncaptured/);
  assert.throws(() => createAsteroidAttachmentWorld({ ...source, edits: edits([mined, BlockId.GoldOre]) }), /Uncaptured/);
  assert.equal(createAsteroidAttachmentWorld({ ...source, edits: {} }).block(mined), BlockId.Air, "Canonical pages work without redundant mirrors");
});

test("foreign generation, invalid coordinates/facings and stale source counters reject without mutation", () => {
  const source = fixture(), baseline = canonicalJson(source);
  for (const change of [{ terrainVersion: 999 }, { terrainSeed: source.terrainSeed + 1 }, { expansionLevel: 1 },
    { locationId: locationId(homeLocation(universeId("foreign"))) }, { blockFacings: { "-0,32,0": 0 } },
    { blockFacings: { "0,32,0": 4 } }, { blockFacings: { "0,128,0": 0 } }])
    assert.throws(() => createAsteroidAttachmentWorld({ ...source, ...change } as AsteroidAttachmentWorldSource));
  const reader = createAsteroidAttachmentWorld(source);
  for (const cell of ["-0,0,0", "0.5,0,0", "x,0,0", "9007199254740992,0,0"])
    assert.throws(() => reader.block(cell));
  assert.throws(() => assertAsteroidAttachmentWorldUnchanged(reader, { ...source, registry: { ...source.registry, revision: 1 } }), /Stale/);
  assert.equal(canonicalJson(source), baseline);
});

test("one hundred cold reads preserve finite pages, construction, facing and generator source exactly", () => {
  const source = fixture(edits([key("0,32,0"), BlockId.Air], [key("30,32,0"), BlockId.StationTruss]));
  const encoded = canonicalJson(source), expected = createAsteroidAttachmentWorld(source);
  const now = Date.now; Date.now = () => { throw Error("source reader must not advance clocks"); };
  try { for (let i = 0; i < 100; i++) {
    const reader = createAsteroidAttachmentWorld(JSON.parse(encoded));
    assert.equal(reader.sourceBaseline, expected.sourceBaseline);
    assert.equal(reader.block(key("0,32,0")), BlockId.Air); assert.equal(reader.block(key("30,32,0")), BlockId.StationTruss);
  } } finally { Date.now = now; }
  assert.equal(canonicalJson(source), encoded);
});
