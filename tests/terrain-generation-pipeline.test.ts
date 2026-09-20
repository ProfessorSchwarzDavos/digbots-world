import assert from "node:assert/strict";
import test from "node:test";
import { TerrainGenerationPipeline, TERRAIN_WORKER_PROTOCOL } from "../app/game/terrain-generation-pipeline.ts";
import { ChunkWorld } from "../app/game/world.ts";

class FailingWorker {
  static instances: FailingWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  constructor() { FailingWorker.instances.push(this); }
  postMessage() {}
  terminate() {}
  ready(protocol = TERRAIN_WORKER_PROTOCOL) { this.onmessage?.({ data: { type: "ready", protocol } } as MessageEvent); }
  fail() { this.onerror?.({} as ErrorEvent); }
}

const withFakeBrowserWorker = (run: () => void) => {
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const workerDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  FailingWorker.instances = [];
  Object.defineProperty(globalThis, "document", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "Worker", { configurable: true, value: FailingWorker });
  try {
    run();
  } finally {
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor);
    else delete (globalThis as { document?: unknown }).document;
    if (workerDescriptor) Object.defineProperty(globalThis, "Worker", workerDescriptor);
    else delete (globalThis as { Worker?: unknown }).Worker;
  }
};

test("a failed generation worker releases its job to the synchronous fallback", () => {
  withFakeBrowserWorker(() => {
    const pipeline = new TerrainGenerationPipeline(1, 0);
    FailingWorker.instances[0].ready();
    let failed = 0;
    assert.equal(pipeline.submit({
      namespace: "test",
      seedText: "seed",
      generationOptions: {},
      key: "0,0",
      cx: 0,
      cz: 0,
      edits: [],
    }, () => assert.fail("failed worker must not complete"), () => { failed += 1; }), true);
    FailingWorker.instances[0].fail();
    assert.equal(failed, 1);
    assert.equal(pipeline.supported, false);
    assert.equal(pipeline.diagnostics().failed, 1);
    pipeline.dispose();
  });
});

test("an old worker cannot silently ignore expanded generation context", () => {
  withFakeBrowserWorker(() => {
    const pipeline = new TerrainGenerationPipeline(1, 0);
    FailingWorker.instances[0].ready(1);
    assert.equal(pipeline.supported, false);
    assert.match(pipeline.diagnostics().lastError!.message, /incompatible/);
    pipeline.dispose();
  });
});

test("worker terrain entry point is byte-exact before neighbor-sensitive lighting", () => {
  const full = new ChunkWorld();
  const worker = new ChunkWorld();
  full.reset("WORKER-PARITY", undefined, { structures: false });
  worker.reset("WORKER-PARITY", undefined, { structures: false });
  const expected = full.generateChunk(2, -3);
  const actual = worker.generateChunkTerrainOnly(2, -3);
  assert.deepEqual(actual.blocks, expected.blocks);
  assert.deepEqual(actual.heightmap, expected.heightmap);
  assert.deepEqual(actual.biomes, expected.biomes);
  assert.deepEqual(actual.sectionBlockCounts, expected.sectionBlockCounts);
  assert.deepEqual(actual.skyTops, expected.skyTops);
  assert.deepEqual([...actual.lightIndices], [...expected.lightIndices]);
  assert.deepEqual([...actual.leafIndices], [...expected.leafIndices]);
  assert.equal(actual.lightInitialized, false, "lighting remains ordered on the main world after installation");
  full.dispose();
  worker.dispose();
});

test("isolated worker lighting reconciles to the sequential cross-chunk solution", () => {
  const reference = new ChunkWorld();
  const isolatedLeft = new ChunkWorld();
  const isolatedRight = new ChunkWorld();
  const installed = new ChunkWorld();
  for (const world of [reference, isolatedLeft, isolatedRight, installed]) {
    world.reset("WORKER-LIGHT-SEAM", undefined, { structures: false });
  }
  const expectedLeft = reference.generateChunk(0, 0);
  const expectedRight = reference.generateChunk(1, 0);
  const leftLight = isolatedLeft.generateChunk(0, 0).light.slice();
  const rightLight = isolatedRight.generateChunk(1, 0).light.slice();
  const actualLeft = installed.generateChunkTerrainOnly(0, 0);
  const actualRight = installed.generateChunkTerrainOnly(1, 0);
  actualLeft.light.set(leftLight);
  actualRight.light.set(rightLight);
  actualLeft.lightInitialized = true;
  actualRight.lightInitialized = true;
  let slices = 0;
  for (const chunk of [actualLeft, actualRight]) {
    const task = installed.lightEngine.beginChunkBoundaryReconciliation(chunk);
    while (!installed.lightEngine.stepChunkInitialization(task, 2_048)) slices += 1;
  }
  assert.ok(slices > 2, "seam reconciliation must remain resumable instead of becoming a hidden frame spike");
  assert.deepEqual(actualLeft.light, expectedLeft.light);
  assert.deepEqual(actualRight.light, expectedRight.light);
  for (const world of [reference, isolatedLeft, isolatedRight, installed]) world.dispose();
});
