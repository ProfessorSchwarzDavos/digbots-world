import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine, type SavedCreature } from "../app/game/engine";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb } from "../app/game/capture-orbs";
import { createDigitalCreatureArchive, createDigitalItemVault } from "../app/game/digital-storage";
import { createApiary } from "../app/game/apiary";
import { Item } from "../app/game/data";

const blankEquipment = () => ({ head: null, chest: null, legs: null, feet: null, back: null });

function fixture() {
  const filled = captureOrbInventorySlot(captureIntoOrb(createEmptyCaptureOrb("runtime-orb"), {
    schema: 1, entityId: "runtime-specimen", kind: "peelop", health: 5, maxHealth: 7, ageTicks: 123,
    baby: false, temperament: "Gentle", hostile: false, tamed: true, ownerId: "keeper", name: null,
    geneticSeed: 321, command: null, custom: { foreignPosition: { x: 777, y: .125, z: -888 } },
  }, 42)!);
  const hive = createApiary("queen", [], 42, 3);
  const saved: SavedCreature = { id: 1, kind: "hive-queen", x: 1, y: 30.86, z: 2, yaw: 0, health: 5, age: 12, apiaryBee: hive.queen };
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    multiplayer: null, inventory: [filled], cursor: null, trash: null, craftGrid: [], equipment: blankEquipment(), offhand: null,
    furnaces: new Map(), wheatMills: new Map(), wayworks: new Map(), chests: new Map(), boats: new Map(),
    drops: [{ item: Item.RawIron, count: 3, age: .125, mesh: { position: new THREE.Vector3(1.125, 30.5, -2.25) }, velocity: new THREE.Vector3(.1, .2, .3) }],
    orbRacks: new Map(), healingStations: new Map(), morphLooms: new Map(), digitalItemVault: createDigitalItemVault(),
    digitalCreatureArchive: createDigitalCreatureArchive(), multiplayerPlayerStates: new Map(), spacefleet: { schema: 1, vehicles: {} },
    apiaries: new Map([["1,30,2", hive]]), aquariums: new Map(), fieldPerches: new Map(),
    mobs: [{ id: 1, beeHiveKey: "1,30,2" }], sleepingCreatures: [], temporarySummons: new Map(),
    agentBuildJobs: new Map(), agentBuildPreviews: new Map(), agentRuntimeTasks: new Map(), agentInventories: new Map(),
    agentEquipment: new Map([["equipment-only", blankEquipment()]]), agentReturningMaterials: new Map([["returning-only", [{ item: Item.RawIron, count: 2000 }]]]),
    agentInventoryRevisions: new Map([["revision-only", 17]]),
    serializeCreature: () => saved,
    serialize: () => { throw Error("Read-only custody must not call serialize"); },
    serializeAgentCustody: () => { throw Error("Read-only custody must not convert agent reservations"); },
  }) as VoxelEngine;
  return { engine, filled, hive };
}

test("actual engine custody snapshot reads exact owner tables without serialization, migration, clocks or map writes", () => {
  const { engine, filled, hive } = fixture(), inventory = engine.inventory, equipment = engine.agentEquipment;
  const now = Date.now; Date.now = () => { throw Error("read-only custody consulted clock"); };
  let snapshot: ReturnType<VoxelEngine["snapshotAttachmentCreatureCustody"]>;
  try { snapshot = engine.snapshotAttachmentCreatureCustody(); } finally { Date.now = now; }
  assert.equal(snapshot.custody.index.stored.length, 1); assert.equal(snapshot.apiaryVisuals.length, 1);
  assert.equal(snapshot.source.creatures!.length, 0); assert.deepEqual(snapshot.source.inventory[0], filled);
  assert.deepEqual(snapshot.source.drops![0].velocity, [.1, .2, .3]);
  assert.deepEqual(Object.keys(snapshot.source.agentCustody!.agents).sort(), ["equipment-only", "returning-only", "revision-only"]);
  assert.equal(snapshot.source.agentCustody!.agents["returning-only"].returning[0].count, 2000);
  assert.equal(snapshot.source.agentCustody!.agents["revision-only"].revision, 17);
  assert.equal(engine.inventory, inventory); assert.equal(engine.agentEquipment, equipment);
  assert.equal(engine.agentInventories.size, 0); assert(!Object.isFrozen(hive)); assert(Object.isFrozen(snapshot.source.apiaries));
  filled.metadata!.name = "changed later";
  assert.notEqual(snapshot.source.inventory[0]!.metadata!.name, "changed later");
});

test("guest/stale-host sessions and active agent jobs, previews or tasks cannot preflight a custody transition", () => {
  for (const multiplayer of [{ role: "guest", state: "connected" }, { role: "host", state: "disconnected" }]) {
    const { engine } = fixture(); Object.assign(engine, { multiplayer });
    assert.throws(() => engine.snapshotAttachmentCreatureCustody(), /current host/);
  }
  for (const name of ["agentBuildJobs", "agentBuildPreviews", "agentRuntimeTasks"]) {
    const { engine } = fixture(); Object.assign(engine, { [name]: new Map([["active", {}]]) });
    assert.throws(() => engine.snapshotAttachmentCreatureCustody(), /active agent work/);
  }
});
