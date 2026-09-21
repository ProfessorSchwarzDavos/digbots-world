import assert from "node:assert/strict";
import test from "node:test";
import { VoxelEngine, type SavedCreature } from "../app/game/engine";
import { createApiary, APIARY_FORAGING_SCAN } from "../app/game/apiary";
import { BlockId } from "../app/game/data";

test("engine snapshot reads hive/free/sleep/display sources without invoking mutating world serialization", () => {
  const hive = createApiary("queen", [], 77, 3), creatures: SavedCreature[] = [
    { id: 1, kind: "peelop", x: .1, y: 32, z: 0, yaw: 0, health: 5, age: 1 },
    { id: 2, kind: "hive-queen", x: 0, y: 32.86, z: 0, yaw: 0, health: 5, age: 1, apiaryBee: hive.queen },
    { id: 3, kind: "peelop", x: 80, y: 32, z: 0, yaw: 0, health: 5, age: 1 },
  ];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), { multiplayer: null,
    apiaries: new Map([["0,32,0", hive]]), sleepingCreatures: [creatures[2]],
    mobs: [{ id: 1, beeHiveKey: null }, { id: 2, beeHiveKey: "0,32,0" }, { id: 99, beeHiveKey: null }],
    temporarySummons: new Map([[99, {}]]), serializeCreature: (mob: { id: number }) => creatures.find(value => value.id === mob.id)!,
    serialize: () => { throw Error("Must not capture asteroid edits for a read-only snapshot."); },
  }) as VoxelEngine;
  const snapshot = engine.snapshotAttachmentApiarySources();
  assert.deepEqual(snapshot, { apiaries: { "0,32,0": hive }, creatures: [creatures[0]], sleepingCreatures: [creatures[2]],
    visuals: [{ hiveKey: "0,32,0", creature: creatures[1] }] });
  assert.ok(Object.isFrozen(snapshot)); assert.ok(Object.isFrozen(snapshot.apiaries["0,32,0"].queen));
  assert.equal(Object.isFrozen(hive.queen), false);
  Object.assign(hive, { honey: 3 }); creatures[0].x = 99;
  assert.equal(snapshot.apiaries["0,32,0"].honey, 0); assert.equal(snapshot.creatures[0].x, .1);
  for (const session of [{ role: "guest", state: "connected" }, { role: "host", state: "disconnected" }]) {
    Object.assign(engine, { multiplayer: session }); assert.throws(() => engine.snapshotAttachmentApiarySources(), /current host/);
  }
});

test("live flower scan keeps its original circular radius and seven-cell vertical search", () => {
  const scanned: [number, number, number][] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), { world: { getBlock: (x: number, y: number, z: number) => {
    scanned.push([x, y, z]); return BlockId.Air;
  } } }) as VoxelEngine;
  assert.deepEqual(engine.apiaryFlowersNear("0,32,0"), []);
  const expected: [number, number, number][] = [];
  for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) {
    if (x * x + z * z > 25) continue;
    for (let y = 29; y <= 35; y++) expected.push([x, y, z]);
  }
  assert.deepEqual(scanned, expected); assert.deepEqual(APIARY_FORAGING_SCAN, { radius: 5, verticalRadius: 3 });
});
