import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data.ts";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address.ts";
import { ChunkWorld, blockIndex } from "../app/game/world.ts";

function createWorld() {
  const world = new ChunkWorld();
  // Keep the fixture on generated world data without persistent cache IO.
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

function readyWorld() {
  const world = createWorld();
  for (let x = -1; x <= 1; x += 1) for (let z = -1; z <= 1; z += 1) world.generateChunk(x, z);
  drain(world);
  return world;
}

type Point = Readonly<{ x: number; y: number; z: number }>;

function rgb(world: ChunkWorld, point: Point) {
  const { red, green, blue } = world.lightAt(point.x, point.y, point.z);
  return { red, green, blue };
}

const torch = Object.freeze({ x: 15, y: 100, z: 8 });
const crossSeamAir = Object.freeze({ x: 16, y: 100, z: 8 });
const nearbyAir: readonly Point[] = Object.freeze([
  torch,
  crossSeamAir,
  { x: 17, y: 100, z: 8 },
  { x: 16, y: 99, z: 8 },
  { x: 16, y: 101, z: 8 },
  { x: 16, y: 100, z: 7 },
  { x: 16, y: 100, z: 9 },
]);

test("deferred multichunk torch removal matches a fresh RGB light field after all drains", () => {
  const world = readyWorld();
  const reference = readyWorld();
  try {
    for (const point of [...nearbyAir, ...[
      ...Array.from({ length: 7 }, (_, index) => ({ x: 2 + index, y: 100, z: 2 })),
      ...Array.from({ length: 7 }, (_, index) => ({ x: 24 + index, y: 100, z: 14 })),
    ]]) assert.equal(world.getBlock(point.x, point.y, point.z), BlockId.Air, `fixture cell ${point.x},${point.y},${point.z} must start as air`);

    world.setBlock(torch.x, torch.y, torch.z, BlockId.Torch);
    drain(world);
    const sourceLightAcrossSeam = rgb(world, crossSeamAir);
    assert.ok(Math.max(sourceLightAcrossSeam.red, sourceLightAcrossSeam.green, sourceLightAcrossSeam.blue) > 0,
      "the real torch must propagate colored block light into the neighboring chunk");

    const benignEdits = [
      ...Array.from({ length: 7 }, (_, index) => ({ x: 2 + index, y: 100, z: 2, type: BlockId.Stone })),
      ...Array.from({ length: 7 }, (_, index) => ({ x: 24 + index, y: 100, z: 14, type: BlockId.Stone })),
    ];
    assert.equal(benignEdits.length + 1 > 12, true, "the removal batch must take the deferred relight path");
    world.setBlocksBatch([{ ...torch, type: BlockId.Air }, ...benignEdits], true, false, true);
    reference.setBlocksBatch(benignEdits, true, false, true);
    drain(world);
    drain(reference);

    for (const point of nearbyAir) assert.equal(world.getBlock(point.x, point.y, point.z), BlockId.Air,
      `nearby comparison cell ${point.x},${point.y},${point.z} must be air after removal`);
    assert.deepEqual(
      nearbyAir.map(point => rgb(world, point)),
      nearbyAir.map(point => rgb(reference, point)),
      "settled red, green, and blue in nearby air must match a fresh world with the same benign edits",
    );
    assert.equal(world.readyGameplayLightAt(crossSeamAir.x, crossSeamAir.y, crossSeamAir.z, 0),
      reference.readyGameplayLightAt(crossSeamAir.x, crossSeamAir.y, crossSeamAir.z, 0),
      "ready gameplay block light across the seam must match the fresh reference after all light work drains");
  } finally {
    world.dispose();
    reference.dispose();
  }
});

test("reentrant observer removal cannot leave torch emission in air", () => {
  const world = readyWorld();
  try {
    let removed = false;
    const removeDuringPlacement = ({ x, y, z }: Point) => {
      if (removed || x !== torch.x || y !== torch.y || z !== torch.z || world.getBlock(x, y, z) !== BlockId.Torch) return;
      removed = true;
      world.setBlock(x, y, z, BlockId.Air);
    };
    world.blockEditObservers.add(removeDuringPlacement);
    world.setBlock(torch.x, torch.y, torch.z, BlockId.Torch);
    world.blockEditObservers.delete(removeDuringPlacement);
    drain(world);

    assert.equal(removed, true, "observer must remove the just-placed torch reentrantly");
    assert.equal(world.getBlock(torch.x, torch.y, torch.z), BlockId.Air);
    for (const point of nearbyAir) {
      assert.equal(world.getBlock(point.x, point.y, point.z), BlockId.Air,
        `light comparison cell ${point.x},${point.y},${point.z} must be air`);
      assert.deepEqual(rgb(world, point), { red: 0, green: 0, blue: 0 },
        `removed torch must leave no RGB emission at ${point.x},${point.y},${point.z}`);
      assert.equal(world.gameplayLightAt(point.x, point.y, point.z, 0), 0,
        `gameplay block light must be zero at ${point.x},${point.y},${point.z}`);
      // x=17 needs chunk 2 as part of its full radius-15 dependency halo;
      // this fixture deliberately loads only chunks -1..1.
      assert.equal(world.readyGameplayLightAt(point.x, point.y, point.z, 0), point.x === 17 ? undefined : 0,
        `ready gameplay block light must respect loaded coverage at ${point.x},${point.y},${point.z}`);
    }
  } finally { world.dispose(); }
});

test("batched edit observers see committed light and preserve a nested replacement", () => {
  const world = readyWorld();
  try {
    let observed = 0;
    world.blockEditObservers.add(({ x, y, z }) => {
      if (x !== torch.x || y !== torch.y || z !== torch.z || world.getBlock(x, y, z) !== BlockId.Torch) return;
      observed += 1;
      assert.equal(world.readyGameplayLightAt(x, y, z, 0), undefined,
        "the enclosing batch must stay unreadable during its observer callback");
      world.setBlock(x, y, z, BlockId.Air);
    });
    const benignEdits = Array.from({ length: 14 }, (_, x) => ({ x: x + 1, y: 100, z: 2, type: BlockId.Stone }));
    world.setBlocksBatch([{ ...torch, type: BlockId.Torch }, ...benignEdits], true, false, true);
    drain(world);
    assert.equal(observed, 1);
    assert.equal(world.getBlock(torch.x, torch.y, torch.z), BlockId.Air);
    assert.equal(new Map(world.serializeEdits()["0,0"]).get(blockIndex(15, torch.y, 8)), BlockId.Air,
      "the nested replacement must remain the persisted edit");
    assert.deepEqual(rgb(world, torch), { red: 0, green: 0, blue: 0 });
    assert.equal(world.readyGameplayLightAt(torch.x, torch.y, torch.z, 0), 0);
  } finally { world.dispose(); }
});
