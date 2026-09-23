import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data.ts";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address.ts";
import { ChunkWorld, type Chunk } from "../app/game/world.ts";

function createWorld() {
  const world = new ChunkWorld();
  // This fixture exercises real generation/lighting, not persistent cache IO.
  world.chunkPersistentCache.set = async () => true;
  world.reset("light-probe", undefined, undefined, undefined, {
    locationId: locationId(locationAddress({ ...homeLocation(universeId("light-probe")), kind: "orbit", instanceId: "low" })),
    epoch: 1,
    revision: 1,
  });
  world.playerChunkX = 0;
  world.playerChunkZ = 0;
  return world;
}

type LightingScheduler = {
  queueLightReconciliation(chunk: Chunk): void;
  processLightReconciliation(): boolean;
};

function scheduler(world: ChunkWorld) { return world as unknown as LightingScheduler; }

function drain(world: ChunkWorld) {
  let steps = 0;
  while (world.lightInitializationQueued.size || world.activeLightInitialization
    || world.lightReconciliationQueued.size || world.activeLightReconciliation) {
    assert.ok(steps++ < 10_000, "lighting must complete within the fixture budget");
    world.processLightInitialization();
    scheduler(world).processLightReconciliation();
  }
}

const sample = Object.freeze({ x: 8, y: 63, z: 8 });
function readyWorld() {
  const world = createWorld();
  for (let x = -1; x <= 1; x += 1) for (let z = -1; z <= 1; z += 1) world.generateChunk(x, z);
  return world;
}

for (const active of [false, true]) test(`deferred rebuild cancels ${active ? "active" : "queued"} boundary reconciliation`, () => {
  const world = createWorld();
  try {
    const chunk = world.generateChunk(0, 0);
    scheduler(world).queueLightReconciliation(chunk);
    if (active) scheduler(world).processLightReconciliation();
    world.setBlocksBatch(Array.from({ length: 14 }, (_, x) => ({ x, y: 64, z: 0, type: BlockId.Stone })), true, false, true);
    assert.equal(chunk.lightInitialized, false);
    assert.equal(world.lightReconciliationQueued.has(chunk.key), false, "old boundary work must not overwrite rebuild readiness");
    assert.equal(world.activeLightReconciliation, null);
    drain(world);
    assert.equal(chunk.lightInitialized, true);
    const rebuilt = world.gameplayLightAt(5, 63, 0);
    world.lightEngine.initializeChunk(chunk);
    assert.equal(rebuilt, world.gameplayLightAt(5, 63, 0), "scheduled rebuild must agree with fresh initialization");
    assert.equal(rebuilt, 14);
  } finally { world.dispose(); }
});

test("same-key unload and reload cannot revive reconciliation for the old chunk", () => {
  const world = createWorld();
  try {
    const old = world.generateChunk(0, 0);
    scheduler(world).queueLightReconciliation(old);
    world.unloadChunk(old.key);
    const current = world.generateChunk(0, 0);
    assert.notEqual(current, old);
    scheduler(world).queueLightReconciliation(current);
    scheduler(world).processLightReconciliation();
    assert.equal(world.activeLightReconciliation?.task.chunk, current);
    drain(world);
    assert.equal(current.lightInitialized, true);
  } finally { world.dispose(); }
});

test("ready light shares actual sky and colored block brightness at day and night", () => {
  const world = readyWorld();
  try {
    world.setBlock(8, 64, 8, BlockId.Stone);
    world.setBlock(9, 63, 8, BlockId.Torch);
    const observation = world.captureGameplayLight([sample]);
    assert.ok(observation);
    for (const daylight of [0, 0.3, 1]) {
      assert.equal(observation.gameplayLightAt(sample, daylight), world.gameplayLightAt(8, 63, 8, daylight));
      assert.equal(world.readyGameplayLightAt(8, 63, 8, daylight), world.gameplayLightAt(8, 63, 8, daylight));
    }
    assert.ok(observation.gameplayLightAt(sample, 0)! > 0, "real emitted light remains effective at night");
    assert.equal(observation.gameplayLightAt({ ...sample, x: 7 }, 1), undefined, "undeclared cells are unknown");
    assert.equal(observation.gameplayLightAt(sample, Number.NaN), undefined);
    assert.ok(Object.isFrozen(observation.source.readings));
  } finally { world.dispose(); }
});

test("missing coverage and incomplete neighbor light remain unknown without advancing work", () => {
  const world = createWorld();
  try {
    const chunk = world.generateChunk(0, 0);
    const before = chunk.light.slice();
    assert.equal(world.captureGameplayLight([sample]), undefined);
    assert.equal(world.readyGameplayLightAt(8, 63, 8), undefined);
    assert.equal(world.readyGameplayLightAt(8, 1_000, 8), undefined);
    assert.equal(world.chunks.size, 1);
    assert.deepEqual(chunk.light, before);
    for (let x = -1; x <= 1; x += 1) for (let z = -1; z <= 1; z += 1) world.generateChunk(x, z);
    const neighbor = world.chunks.get("1,0")!;
    neighbor.lightInitialized = false;
    assert.equal(world.readyGameplayLightAt(8, 63, 8), undefined);
    neighbor.lightInitialized = true;
    scheduler(world).queueLightReconciliation(neighbor);
    const task = world.lightReconciliationQueue[0].task;
    const cursor = task.cursor;
    assert.equal(world.captureGameplayLight([sample]), undefined);
    assert.equal(world.readyGameplayLightAt(8, 63, 8), undefined);
    assert.equal(task.cursor, cursor);
    drain(world);
    assert.notEqual(world.readyGameplayLightAt(8, 63, 8), undefined);
  } finally { world.dispose(); }
});

test("edit observers cannot observe ready light before single or deferred batch lighting catches up", () => {
  const world = readyWorld();
  try {
    let observed = 0;
    const check = () => {
      observed += 1;
      assert.equal(world.readyGameplayLightAt(8, 63, 8), undefined);
      assert.equal(world.captureGameplayLight([sample]), undefined);
    };
    world.blockEditObservers.add(check);
    world.setBlock(8, 64, 8, BlockId.Stone);
    assert.equal(observed, 1);
    assert.notEqual(world.readyGameplayLightAt(8, 63, 8), undefined);
    world.setBlocksBatch(Array.from({ length: 14 }, (_, x) => ({ x, y: 65, z: 0, type: BlockId.Stone })), true, false, true);
    assert.equal(observed, 15);
    assert.equal(world.readyGameplayLightAt(8, 63, 8), undefined);
    drain(world);
    assert.notEqual(world.readyGameplayLightAt(8, 63, 8), undefined);
  } finally { world.dispose(); }
});

test("exact light observation detects same-revision value, readiness and coverage changes across await", async () => {
  const world = readyWorld();
  try {
    const revision = world.mutationRevision;
    const changed = world.captureGameplayLight([sample])!;
    await Promise.resolve();
    const chunk = world.chunks.get("0,0")!;
    const old = chunk.light.slice();
    chunk.light.fill(0);
    assert.equal(changed.isCurrent(), false);
    assert.equal(changed.gameplayLightAt(sample, 1), undefined);
    chunk.light.set(old);
    const pending = world.captureGameplayLight([sample])!;
    world.chunks.get("1,0")!.lightInitialized = false;
    assert.equal(pending.isCurrent(), false);
    world.chunks.get("1,0")!.lightInitialized = true;
    const reloaded = world.captureGameplayLight([sample])!;
    world.unloadChunk("1,0");
    world.generateChunk(1, 0);
    assert.equal(reloaded.isCurrent(), false, "equal-coordinate chunks are distinct incarnations");
    assert.equal(world.mutationRevision, revision);
  } finally { world.dispose(); }
});

test("same-location reset and disposal invalidate captured light owner", () => {
  const world = readyWorld();
  try {
    const beforeReset = world.captureGameplayLight([sample])!;
    const scope = world.locationScope;
    world.reset("light-probe", undefined, undefined, undefined, scope);
    for (let x = -1; x <= 1; x += 1) for (let z = -1; z <= 1; z += 1) world.generateChunk(x, z);
    assert.equal(beforeReset.isCurrent(), false);
    const beforeDispose = world.captureGameplayLight([sample])!;
    world.dispose();
    assert.equal(beforeDispose.isCurrent(), false);
  } finally { world.dispose(); }
});
