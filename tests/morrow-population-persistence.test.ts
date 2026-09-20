import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine } from "../app/game/engine";
import { BlockId } from "../app/game/data";
import { MORROW_MOB_KINDS } from "../app/game/morrow-ecology";
import { createMobVisual } from "../app/game/mob-models";
import { naturalPopulationCost, naturalPopulationSnapshot } from "../app/game/ecology-population";

function engineFixture() {
  return Object.assign(Object.create(VoxelEngine.prototype), {
    nextMobId: 1, day: 1, mobs: [], sleepingCreatures: [], creatureGroup: new THREE.Group(),
    primeEncounters: new Map(), chests: new Map(), createMobVisual,
    world: { seedText: "morrow-pool-custody", celestialTerrain: { kind: "morrow" }, surfaceAt: () => 33,
      getBlock: (_x: number, y: number) => y === 33 ? BlockId.PaleRegolith : BlockId.Air,
      isWalkThrough: (block: BlockId) => block === BlockId.Air, findWalkableY: () => 33 },
    bodyContext: () => ({ environment: { gravityG: .192 } }), worldSimulationSeconds: () => 0,
    applyMobScale: () => {}, syncWoolhornCoat: () => {}, syncCreatureWorkVisual: () => {}, refreshMobSpatialEntry: () => {},
  }) as VoxelEngine;
}

for (const kind of MORROW_MOB_KINDS) {
  test(`Morrow ${kind} cold restoration preserves its birth pool, cost and full specimen metadata`, () => {
    const live = engineFixture();
    const original = live.spawnMob(kind, new THREE.Vector3(3, 33.5, 1), {
      naturalSpawned: true, naturalPool: "surface-animal", age: 123, geneticSeed: 314159,
      specimenId: `morrow-original-${kind}`, yaw: .25,
    });
    const saved = JSON.parse(JSON.stringify(live.serializeCreature(original)));
    const cold = engineFixture(), restored = cold.restoreCreature(saved)!;
    assert.ok(restored);
    assert.deepEqual(cold.serializeCreature(restored), saved, "all persisted fields, including pool, remain exact");
    const record = (mob: typeof original) => ({ pool: mob.naturalPool, cost: naturalPopulationCost(mob.definition), x: 3, z: 1, eligible: true });
    assert.deepEqual(naturalPopulationSnapshot([record(restored)]), naturalPopulationSnapshot([record(original)]),
      "reloading must not create space in Morrow's surface population budget");
  });
}

test("previously misclassified Morrow pool migrates without changing the input or other metadata", () => {
  const live = engineFixture();
  const mob = live.spawnMob("slatefin-burrower", new THREE.Vector3(3, 33.5, 1), {
    naturalSpawned: true, naturalPool: "surface-animal", specimenId: "retained-slatefin", geneticSeed: 0,
  });
  const canonical = JSON.parse(JSON.stringify(live.serializeCreature(mob)));
  const old = { ...canonical, naturalPool: "underground" };
  const snapshot = structuredClone(old), cold = engineFixture();
  assert.deepEqual(cold.serializeCreature(cold.restoreCreature(old)!), canonical);
  assert.deepEqual(old, snapshot, "migration is additive in the loaded copy, never mutates its source");
});

test("owned non-natural Morrow creatures do not acquire population-budget membership on reload", () => {
  const live = engineFixture();
  const mob = live.spawnMob("slatefin-burrower", new THREE.Vector3(3, 33.5, 1), {
    naturalSpawned: false, naturalPool: null, specimenId: "owned-slatefin", geneticSeed: 13,
    creatureTamed: true, creatureOwnerId: "keeper",
  });
  const saved = JSON.parse(JSON.stringify(live.serializeCreature(mob))), cold = engineFixture();
  const restored = cold.restoreCreature(saved)!;
  assert.equal(restored.naturalPool, null);
  assert.deepEqual(cold.serializeCreature(restored), saved);
});
