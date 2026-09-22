import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data";
import { ChunkWorld } from "../app/game/world";
import type { CachedChunkData } from "../app/game/chunk-cache";
import { locationAddress, locationId, type LocationStamp } from "../app/game/location-address";

const seed = "v1-body-8addb687";
const stamp = (kind: "orbit" | "surface", epoch = 1): LocationStamp => ({
  locationId: locationId(locationAddress({ universeId: "cache-lifecycle", systemId: "waystar",
    bodyId: "blockwild/morrow", kind, instanceId: kind === "orbit" ? "low" : "main" })), epoch, revision: 0,
});
type Internals = {
  chunkCacheKey(key: string): string;
  cachedChunkData(chunk: ReturnType<ChunkWorld["generateChunk"]>): CachedChunkData;
  restoreCachedChunk(data: CachedChunkData): ReturnType<ChunkWorld["generateChunk"]> | undefined;
  requestPersistentChunk(key: string, x: number, z: number, distance: number): boolean;
  pendingPersistentChunks: Set<string>;
};
const internals = (world: ChunkWorld) => world as unknown as Internals;
function isolatedWorld() {
  const world = new ChunkWorld(), writes: CachedChunkData[] = [];
  world.chunkPersistentCache.set = async data => { writes.push(structuredClone(data)); return true; };
  return { world, writes };
}

for (const outgoing of ["orbit", "surface"] as const) {
  test(`same-seed ${outgoing} reset caches the outgoing owner and agrees with fresh terrain`, () => {
    const incoming = outgoing === "orbit" ? "surface" : "orbit";
    const { world, writes } = isolatedWorld(), { world: fresh } = isolatedWorld();
    try {
      world.reset(seed, undefined, undefined, undefined, stamp(outgoing));
      const original = world.generateChunk(2, 0);
      world.setBlock(40, 60, 8, BlockId.GoldOre, true, true);
      const edits = world.serializeEdits(), expectedBlocks = original.blocks.slice(), expectedHeights = original.heightmap.slice();
      const oldKey = internals(world).chunkCacheKey("2,0");
      world.reset(seed, undefined, undefined, undefined, stamp(incoming, 2));
      assert.equal(writes.length, 1);
      assert.equal(writes[0].cacheKey, oldKey, "outgoing location and edit signature own disposal");
      assert.deepEqual(writes[0].blocks, expectedBlocks);
      assert.deepEqual(writes[0].heightmap, expectedHeights);
      assert.equal(internals(world).restoreCachedChunk(writes[0]), undefined, "incoming owner cannot restore outgoing payload");
      const regenerated = world.generateChunk(2, 0);
      fresh.reset(seed, undefined, undefined, undefined, stamp(incoming, 2));
      const control = fresh.generateChunk(2, 0);
      assert.deepEqual(regenerated.blocks, control.blocks);
      assert.deepEqual(regenerated.heightmap, control.heightmap);
      world.reset(seed, edits, undefined, undefined, stamp(outgoing, 3));
      const restored = internals(world).restoreCachedChunk(writes[0]);
      assert.ok(restored);
      fresh.reset(seed, edits, undefined, undefined, stamp(outgoing, 3));
      const freshOriginal = fresh.generateChunk(2, 0);
      assert.deepEqual(restored.blocks, freshOriginal.blocks);
      assert.deepEqual(restored.heightmap, freshOriginal.heightmap);
      assert.deepEqual(world.serializeEdits(), edits, "cache rotation never rewrites durable edits");
    } finally { world.dispose(); fresh.dispose(); }
  });
}

test("invalid incoming scope leaves epoch, chunks, cache writes and seed untouched", () => {
  const { world, writes } = isolatedWorld();
  try {
    world.reset(seed, undefined, undefined, undefined, stamp("surface"));
    const chunk = world.generateChunk(2, 0), epoch = world.runtimeLocationEpoch;
    const key = internals(world).chunkCacheKey("2,0");
    assert.throws(() => world.reset("invalid-reset", undefined, undefined, undefined, { ...stamp("orbit"), epoch: 0 }));
    assert.equal(world.runtimeLocationEpoch, epoch);
    assert.equal(world.seedText, seed);
    assert.equal(world.generateChunk(2, 0), chunk);
    assert.equal(internals(world).chunkCacheKey("2,0"), key);
    assert.equal(writes.length, 0);
  } finally { world.dispose(); }
});

test("v1 poisoned derived cache is rejected without deleting its record", () => {
  const { world, writes } = isolatedWorld();
  try {
    world.reset(seed, undefined, undefined, undefined, stamp("orbit"));
    const empty = structuredClone(internals(world).cachedChunkData(world.generateChunk(2, 0)));
    world.reset(seed, undefined, undefined, undefined, stamp("surface", 2));
    const currentKey = internals(world).chunkCacheKey("2,0");
    const poisoned = { ...empty, cacheKey: currentKey.replace(/^terrain-location-v\d+\|/, "terrain-location-v1|") };
    const retained = structuredClone(poisoned);
    assert.match(currentKey, /^terrain-location-v3\|authored:1\|celestial:/);
    assert.equal(internals(world).restoreCachedChunk(poisoned), undefined);
    assert.deepEqual(poisoned, retained);
    assert.equal(writes.length, 1, "only ordinary outgoing cache write occurred");
    world.generateChunk(2, 0);
    assert.equal(world.surfaceAt(47, 14), 33, "historical bad-birth column regenerates as lunar ground");
  } finally { world.dispose(); }
});

test("late cache hits cannot restore old A-B-A owner or consume current pending request", async () => {
  const { world } = isolatedWorld(), resolvers: Array<(data: CachedChunkData) => void> = [];
  Reflect.set(world, "chunkPersistentCache", { supported: true, set: async () => true,
    get: () => new Promise<CachedChunkData>(resolve => resolvers.push(resolve)) });
  try {
    world.reset(seed, undefined, undefined, undefined, stamp("surface"));
    const cached = structuredClone(internals(world).cachedChunkData(world.generateChunk(2, 0)));
    world.disposeChunks();
    internals(world).requestPersistentChunk("2,0", 2, 0, 0);
    world.reset(seed, undefined, undefined, undefined, stamp("orbit", 2));
    world.reset(seed, undefined, undefined, undefined, stamp("surface", 3));
    internals(world).requestPersistentChunk("2,0", 2, 0, 0);
    resolvers[0](cached); await Promise.resolve(); await Promise.resolve();
    assert.equal(world.loadedCount, 0);
    assert.equal(internals(world).pendingPersistentChunks.has(cached.cacheKey), true);
    resolvers[1](cached); await Promise.resolve(); await Promise.resolve();
    assert.equal(world.loadedCount, 1);
    assert.equal(internals(world).pendingPersistentChunks.has(cached.cacheKey), false);
    assert.equal(world.surfaceAt(47, 14), 33);
  } finally { world.dispose(); }
});
