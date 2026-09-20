import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BlockId } from "../app/game/data";
import { VoxelEngine } from "../app/game/engine";
import { MIN_Y, MAX_Y } from "../app/game/world";

function attemptSpawn(ground: number, valid: boolean) {
  const placements: number[] = [], supportReads: number[] = [], rejections: string[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    world: { celestialTerrain: { kind: "morrow" }, generateChunk: () => {}, surfaceAt: () => ground,
      getBlock: (_x: number, y: number) => {
        assert.ok(valid, "invalid support must be rejected before any sentinel block read");
        supportReads.push(y); return y === ground ? BlockId.PaleRegolith : BlockId.Air;
      }, isWalkThrough: (block: BlockId) => block === BlockId.Air },
    worldOptions: { mobDensity: 1 }, touchMode: false, multiplayer: null, worldTime: .02, mobs: [],
    naturalSpawnInterestCursor: 0, ecologyDiagnostics: { attempts: 0, successes: 0, lastSuccess: null },
    simulationInterestPoints: () => [{ id: "local", x: 3.5, y: 32.5, z: 1 }], naturalPopulationRecords: () => [],
    ecologyAllowsSpecies: () => true, naturalSpawnVisibleToPlayer: () => false,
    spawnMob: (_kind: string, position: THREE.Vector3) => { placements.push(position.y); return {}; },
    noteEcologyRejection: (reason: string) => rejections.push(reason),
  }) as VoxelEngine;
  const random = Math.random;
  try { Math.random = () => 0; engine.trySpawnMob("passive"); }
  finally { Math.random = random; }
  return { placements, supportReads, rejections };
}

for (const ground of [NaN, Infinity, -Infinity, MIN_Y - 1, MAX_Y - 1, MAX_Y, MAX_Y + 1, 32.5]) {
  test(`Morrow rejects invalid support ${ground} before sentinel reads`, () => {
    const result = attemptSpawn(ground, false);
    assert.deepEqual(result.placements, []);
    assert.deepEqual(result.supportReads, []);
    assert.deepEqual(result.rejections, ["morrow-bounded-placement"]);
  });
}
for (const ground of [MIN_Y, 33, MAX_Y - 2]) {
  test(`Morrow accepts real support ${ground} with two in-world clearance cells`, () => {
    const result = attemptSpawn(ground, true);
    assert.deepEqual(result.placements, [ground + .5]);
    assert.deepEqual(result.supportReads, [ground, ground + 1, ground + 2]);
    assert.deepEqual(result.rejections, []);
  });
}
