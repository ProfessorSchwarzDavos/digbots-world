import assert from "node:assert/strict";
import test from "node:test";
import { ChunkWorld } from "../app/game/world";
import { createCelestialTerrain, celestialTerrainSeed } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import type { CachedChunkData } from "../app/game/chunk-cache";
import type { TerrainGenerationRequest, TerrainGenerationResult } from "../app/game/terrain-generation-pipeline";

const address = locationAddress({ ...homeLocation(universeId("generation-proof")), kind: "orbit", instanceId: "low" });
const scope = { locationId: locationId(address), epoch: 3, revision: 4 }, seed = "generated-absence";
type Internals = { cachedChunkData(chunk: ReturnType<ChunkWorld["generateChunk"]>): CachedChunkData;
  restoreCachedChunk(data: CachedChunkData): ReturnType<ChunkWorld["generateChunk"]> | undefined };
const internals = (world: ChunkWorld) => world as unknown as Internals;
function fixture() {
  const world = new ChunkWorld(); world.chunkPersistentCache.set = async () => true;
  world.reset(seed, undefined, undefined, undefined, scope); return world;
}

test("factory-bound orbital reset and both ordinary generation entry points prove the same empty rule", () => {
  const world = fixture(), worker = fixture();
  try {
    const initial = world.snapshotEmptyAuthoredOrbitGeneration(); assert.equal(initial.descriptor.kind, "orbit");
    assert.deepEqual(initial.descriptor.sites, []); assert.deepEqual(initial.chunks, []);
    const normal = world.generateChunk(0, 0), terrainOnly = worker.generateChunkTerrainOnly(0, 0);
    assert.deepEqual(normal.blocks, terrainOnly.blocks);
    assert.deepEqual(world.snapshotEmptyAuthoredOrbitGeneration().chunks, ["0,0"]);
    assert.equal(world.snapshotGenerationProducer(), worker.snapshotGenerationProducer());
    assert.equal(world.structureMarkers.size, 0); assert.equal(worker.structureMarkers.size, 0);
    // Direct public feature entry shares the rule; the sample callback would
    // throw if the legacy structure/cave/settlement path were entered.
    world.generateFeatures(normal, () => { throw Error("Legacy feature path entered orbit"); });
    assert.deepEqual(world.snapshotEmptyAuthoredOrbitGeneration().chunks, ["0,0"]);
  } finally { world.dispose(); worker.dispose(); }
});

test("never-reset, non-orbit, substituted factory and direct generator mutations have no proof", () => {
  const pristine = new ChunkWorld(); try { assert.throws(() => pristine.snapshotEmptyAuthoredOrbitGeneration(), /reset-established/); } finally { pristine.dispose(); }
  for (const fault of ["terrain", "seed", "options", "epoch", "expansion", "home"] as const) {
    const world = fixture();
    try {
      if (fault === "terrain") world.celestialTerrain = createCelestialTerrain({ location: address, seed: celestialTerrainSeed(seed) });
      if (fault === "seed") world.seedText = "changed";
      if (fault === "options") world.generationOptions = { ...world.generationOptions, structures: false };
      if (fault === "epoch") world.locationScope = { ...scope, epoch: 5 };
      if (fault === "expansion") world.celestialGeneration = { expansionLevel: 1 };
      if (fault === "home") world.reset(seed, undefined, undefined, undefined, { ...scope, locationId: locationId(homeLocation(universeId("generation-proof"))) });
      assert.throws(() => world.snapshotEmptyAuthoredOrbitGeneration(), /reset-established/, fault);
    } finally { world.dispose(); }
  }
});

test("bound current-rule cache retains proof across a cold lease epoch without rewriting input", () => {
  const world = fixture(), cold = fixture();
  try {
    const cached = structuredClone(internals(world).cachedChunkData(world.generateChunk(0, 0))), before = structuredClone(cached);
    cold.reset(seed, undefined, undefined, undefined, { ...scope, epoch: 10 });
    assert(internals(cold).restoreCachedChunk(cached));
    assert.deepEqual(cold.snapshotEmptyAuthoredOrbitGeneration().chunks, ["0,0"]);
    assert.deepEqual(cached, before); assert.equal(cold.snapshotEmptyAuthoredOrbitGeneration().scope.epoch, 10);
  } finally { world.dispose(); cold.dispose(); }
});

test("unknown cache source or orbital marker contamination cannot produce clearance or be laundered by recaching", () => {
  for (const fault of ["missing-source", "wrong-source", "marker"] as const) {
    const source = fixture(), target = fixture(), again = fixture();
    try {
      const valid = structuredClone(internals(source).cachedChunkData(source.generateChunk(0, 0)));
      const bad: CachedChunkData = { ...valid, ...(fault === "missing-source" ? { generationSource: undefined }
        : fault === "wrong-source" ? { generationSource: "unknown" } : { structureMarkers: [["imported-site", {
          type: "landmark", id: "imported-site", tag: "guild-hall:test", position: { x: 0, y: 32, z: 0 },
        }]] }) };
      const before = structuredClone(bad), restored = internals(target).restoreCachedChunk(bad)!;
      assert(restored); assert.throws(() => target.snapshotEmptyAuthoredOrbitGeneration(), /cached or worker/);
      assert.deepEqual(bad, before);
      const recached = internals(target).cachedChunkData(restored); assert.equal(recached.generationSource, null);
      internals(again).restoreCachedChunk(recached); assert.throws(() => again.snapshotEmptyAuthoredOrbitGeneration(), /cached or worker/);
      if (fault === "marker") assert(target.structureMarkers.has("imported-site"), "unresolved evidence is not erased");
    } finally { source.dispose(); target.dispose(); again.dispose(); }
  }
});

test("bad coordinates and old cache namespaces refuse restoration without changing either source", () => {
  const source = fixture(), target = fixture();
  try {
    const valid = structuredClone(internals(source).cachedChunkData(source.generateChunk(0, 0)));
    const obsolete = { ...valid, cacheKey: valid.cacheKey.replace("terrain-location-v3", "terrain-location-v2") };
    const obsoleteBefore = structuredClone(obsolete);
    assert.equal(internals(target).restoreCachedChunk(obsolete), undefined); assert.deepEqual(obsolete, obsoleteBefore);
    assert.deepEqual(target.snapshotEmptyAuthoredOrbitGeneration().chunks, []);
    const bad = { ...valid, cx: 1 }, before = structuredClone(bad);
    assert.equal(internals(target).restoreCachedChunk(bad), undefined); assert.deepEqual(bad, before);
    assert.throws(() => target.snapshotEmptyAuthoredOrbitGeneration(), /cached or worker/);
  } finally { source.dispose(); target.dispose(); }
});

test("pending callbacks, authored precursor maps and unproven loaded chunks block runtime proof", () => {
  for (const fault of ["queue", "persistent", "worker", "marker", "plan", "road", "chunk"] as const) {
    const world = fixture();
    try {
      if (fault === "queue") world.generationQueue.push({ cx: 0, cz: 0, distance: 0 });
      if (fault === "persistent") world.pendingPersistentChunks.add("pending");
      if (fault === "worker") Reflect.set(world, "completedWorkerGeneration", [{}]);
      if (fault === "marker") world.structureMarkers.set("site", { type: "landmark", id: "site", tag: "guild-hall:test", position: { x: 0, y: 32, z: 0 } });
      if (fault === "plan") world.settlementPlans.set("site", {} as never);
      if (fault === "road") Reflect.set(world, "surfaceRoadGraphCache", new Map([["roads:0,0", []]]));
      if (fault === "chunk") {
        const chunk = world.generateChunk(0, 0); world.chunks.set("0,0", { ...chunk });
      }
      assert.throws(() => world.snapshotEmptyAuthoredOrbitGeneration(), /pending|precursor|provenance/);
    } finally { world.dispose(); }
  }
});

test("actual worker admission binds returned coordinates, namespace, producer and marker absence", () => {
  for (const fault of ["none", "namespace", "key", "coordinates", "producer", "marker"] as const) {
    const source = fixture(), world = fixture();
    try {
      let request: TerrainGenerationRequest | undefined, complete: ((result: TerrainGenerationResult) => void) | undefined;
      world.terrainGenerationPipeline.dispose();
      Reflect.set(world, "terrainGenerationPipeline", { supported: true, availableSlots: 2,
        submit: (next: TerrainGenerationRequest, callback: typeof complete) => { request = next; complete = callback; return true; }, dispose() {} });
      world.playerChunkX = 0; world.playerChunkZ = 0; world.renderDistance = 2;
      world.generationQueue.push({ cx: 0, cz: 0, distance: 0 }); world.generationQueued.add("0,0");
      assert.equal(world.processGenerationSlice("0,0"), true); assert(request && complete);
      const cached = internals(source).cachedChunkData(source.generateChunk(0, 0));
      const result: TerrainGenerationResult = { ...cached, namespace: fault === "namespace" ? "wrong" : request.namespace,
        ...(fault === "key" ? { key: "1,0" }
          : fault === "coordinates" ? { cx: 1 } : fault === "producer" ? { generationSource: "unknown" }
            : fault === "marker" ? { structureMarkers: [["site", { type: "landmark", id: "site", tag: "guild-hall:test", position: { x: 0, y: 32, z: 0 } }]] } : {}) };
      complete(result);
      if (["none", "producer", "marker"].includes(fault)) world.processGenerationSlice("0,0");
      if (fault === "none") assert.deepEqual(world.snapshotEmptyAuthoredOrbitGeneration().chunks, ["0,0"]);
      else assert.throws(() => world.snapshotEmptyAuthoredOrbitGeneration(), /cached or worker/);
      if (fault === "marker") assert(world.structureMarkers.has("site"), "source evidence is retained on refused proof");
    } finally { source.dispose(); world.dispose(); }
  }
});
