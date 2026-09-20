import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BlockId, Item, type ItemCode } from "../app/game/data";
import { VoxelEngine } from "../app/game/engine";

function fixture(item: ItemCode, target = [10, 34, 1], player = [10, 32.5, 1]) {
  const writes: unknown[] = [], messages: string[] = [];
  const cells = new Map<string, BlockId>();
  const [x, y, z] = target;
  if (item !== BlockId.OrbitalDock) cells.set(`${x},${y - 1},${z}`, BlockId.Stone);
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    world: { getBlock: (a: number, b: number, c: number) => cells.get(`${a},${b},${c}`) ?? BlockId.Air,
      setBlock: (a: number, b: number, c: number, type: BlockId) => { writes.push([a, b, c, type]); cells.set(`${a},${b},${c}`, type); return true; },
      setBlocksBatch: (edits: { x: number; y: number; z: number; type: BlockId }[]) => { for (const e of edits) { writes.push(e); cells.set(`${e.x},${e.y},${e.z}`, e.type); } },
      setBlockFacing: (...args: unknown[]) => writes.push(args), getBlockFacing: () => 0 },
    position: new THREE.Vector3(...player), playerVariant: "male", crouching: false, yaw: 0,
    target: { x, y: y - 1, z, placeX: x, placeY: y, placeZ: z, type: BlockId.Stone, distance: 1 },
    placeCooldown: 0, selected: 0, inventory: [{ item, count: 1 }], mode: "survival",
    wayworks: new Map(), remotePlayers: new Map(), events: { onToast: (message: string) => messages.push(message) },
  }) as VoxelEngine;
  return { engine, writes, messages, cells };
}

test("habitation seating and standing never embed the player in a collision box", () => {
  const f = fixture(BlockId.StationHull, [5, 35, 5], [4, 32.51, 6]);
  f.cells.set("4,33,4", BlockId.StationHabitation);
  Object.assign(f.engine, { velocity: new THREE.Vector3(), audio: { play: () => {} } });
  assert.equal(f.engine.toggleSeat(4, 33, 4, BlockId.StationHabitation), true);
  assert.deepEqual(f.engine.position.toArray(), [4, 32.51, 4]);
  assert.equal(f.engine.collidesAt(f.engine.position), false, "seated pose must also be safe to persist and reload");
  f.engine.leaveSeat();
  assert.equal(f.engine.collidesAt(f.engine.position, 1.8), false, "standing cannot be trapped inside the bench");
  for (const z of [4, 4.1, 4.3, 4.6, 5]) assert.equal(f.engine.collidesAt(new THREE.Vector3(4, 32.51, z), 1.8), false);
  assert.equal(f.engine.collidesAt(f.engine.position, 1.8, [{ x: 5, y: 35, z: 5, type: BlockId.StationHull }]), false,
    "an unrelated overhead placement is not rejected by the existing seat");
});

test("rejected occupied collar never writes transient topology, facing, or air rollback", () => {
  const f = fixture(BlockId.OrbitalDock), before = structuredClone(f.engine.inventory);
  assert.equal(f.engine.collidesAt(f.engine.position), false, "the unchanged room is clear");
  f.engine.placeBlock();
  assert.deepEqual(f.writes, [], "no world edits means no pressure topology invalidation or gas displacement");
  assert.deepEqual(f.engine.inventory, before);
  assert.equal(f.engine.wayworks.size, 0);
  assert.match(f.messages.at(-1)!, /inside yourself/);
});

test("proposed collision reads retain thin-door geometry without changing the live cell", () => {
  const f = fixture(BlockId.OrbitalDock, [10, 34, 1], [10, 33.5, 1.4]);
  const door = [{ x: 10, y: 34, z: 1, type: BlockId.DoorClosedLower }];
  assert.equal(f.engine.collidesAt(f.engine.position, 1.8, door), false, "standing beside the thin slab remains clear");
  assert.equal(f.engine.collidesAt(new THREE.Vector3(10, 33.5, 1), 1.8, door), true);
  assert.equal(f.engine.world.getBlock(10, 34, 1), BlockId.Air);
  assert.deepEqual(f.writes, []);
});

test("a remote player in a pressure door upper half rejects the whole pair before writing", () => {
  const f = fixture(BlockId.PressureDoor, [3, 33, 0], [10, 32.5, 1]);
  f.engine.remotePlayers.set("guest", { model: { modelKind: "human" }, target: { x: 3, y: 34.4, z: 0, variant: "male" } } as never);
  f.engine.placeBlock();
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.engine.inventory, [{ item: BlockId.PressureDoor, count: 1 }]);
  assert.match(f.messages.at(-1)!, /another player/);
});

test("a remote player in the second bed cell rejects the whole pair without rollback edits", () => {
  const f = fixture(Item.WildwoodBed, [3, 33, 0], [10, 32.5, 1]);
  f.cells.set("3,32,-1", BlockId.Stone);
  f.engine.remotePlayers.set("guest", { model: { modelKind: "human" }, target: { x: 3, y: 32.5, z: -1, variant: "male" } } as never);
  f.engine.placeBlock();
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.engine.inventory, [{ item: Item.WildwoodBed, count: 1 }]);
});
