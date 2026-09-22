import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine, type SavedCreature } from "../app/game/engine";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb } from "../app/game/capture-orbs";
import { createDigitalCreatureArchive, createDigitalItemVault } from "../app/game/digital-storage";
import { createApiary } from "../app/game/apiary";
import { Item } from "../app/game/data";
import { createPrimeEncounterState, planPrimeEncounter, transferPrimeEncounterCustody } from "../app/game/creature-rarity";
import { homeLocation, locationId, universeId } from "../app/game/location-address";

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
    primeEncounters: new Map(), legendaryEncounters: new Map(),
    apiaries: new Map([["1,30,2", hive]]), aquariums: new Map(), fieldPerches: new Map(),
    mobs: [{ id: 1, beeHiveKey: "1,30,2", group: { position: new THREE.Vector3(1, 30.86, 2) } }], sleepingCreatures: [], temporarySummons: new Map(),
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
  assert.deepEqual(snapshot.custody.holders.stored[0].holder, { kind: "player", playerId: "local", storage: "host" });
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
    assert.throws(() => engine.snapshotAttachmentCreatureSources(), /current host/);
  }
  for (const name of ["agentBuildJobs", "agentBuildPreviews", "agentRuntimeTasks"]) {
    const { engine } = fixture(); Object.assign(engine, { [name]: new Map([["active", {}]]) });
    assert.throws(() => engine.snapshotAttachmentCreatureCustody(), /active agent work/);
    assert.throws(() => engine.snapshotAttachmentCreatureSources(), /active agent work/);
  }
});

test("raw host source preserves unresolved remote-history custody while the local wrapper still refuses it", () => {
  const { engine } = fixture(), anchor = "prime:petalfox:0:0";
  const filled = captureOrbInventorySlot(captureIntoOrb(createEmptyCaptureOrb("remote-prime-orb"), {
    schema: 1, entityId: "remote-prime-specimen", kind: "petalfox", health: 5, maxHealth: 7, ageTicks: 123, baby: false,
    temperament: "Gentle", hostile: false, tamed: true, ownerId: "keeper", name: null, geneticSeed: 321, command: null,
    custom: { primeAnchorId: anchor },
  }, 42)!);
  engine.inventory = [filled];
  const before = JSON.stringify(filled), now = Date.now;
  Date.now = () => { throw Error("raw custody source read clock"); };
  try {
    const raw = engine.snapshotAttachmentCreatureSources();
    assert.deepEqual(raw.source.inventory, [filled]);
    assert.deepEqual(raw.encounterSources, { primeEncounters: {}, legendaryEncounters: {} });
    assert(!Object.hasOwn(raw, "custody")); assert(!Object.hasOwn(raw, "encounters"));
    assert(Object.isFrozen(raw.source.inventory));
    assert.throws(() => engine.snapshotAttachmentCreatureCustody(), /unresolved Prime/);
  } finally { Date.now = now; }
  assert.equal(JSON.stringify(filled), before); assert.equal(engine.primeEncounters.size, 0);
});

test("raw source does not erase own undefined before semantic validation or execute metadata accessors", () => {
  const { engine, filled } = fixture();
  Object.assign(filled.metadata!, { futureField: undefined });
  const raw = engine.snapshotAttachmentCreatureSources();
  assert(Object.hasOwn(raw.source.inventory[0]!.metadata!, "futureField"));
  assert.equal(raw.source.inventory[0]!.metadata!.futureField, undefined);
  assert.throws(() => engine.snapshotAttachmentCreatureCustody());
  let accessed = false;
  Object.defineProperty(filled.metadata!, "futureField", { enumerable: true, configurable: true,
    get: () => { accessed = true; return "not raw"; } });
  assert.throws(() => engine.snapshotAttachmentCreatureSources(), /accessors/);
  assert.equal(accessed, false);
});

test("raw hive, sleeping and live body preimages precede lossy semantic projections", () => {
  const { engine, hive } = fixture();
  Object.assign(hive, { futureField: undefined });
  const sleeping: SavedCreature = { id: 2, kind: "peelop", x: 0, y: 30, z: 0, yaw: 0, health: 5, age: 12 };
  Object.assign(sleeping, { futureField: undefined }); engine.sleepingCreatures = [sleeping];
  Object.assign(engine.mobs[0], { futureField: undefined, milkCooldown: -2 });
  const raw = engine.snapshotAttachmentCreatureSources();
  assert(Object.hasOwn(raw.source.apiaries!["1,30,2"], "futureField"));
  assert(Object.hasOwn(raw.source.sleepingCreatures![0], "futureField"));
  assert(Object.hasOwn(raw.bodySource[0].fields, "futureField"));
  assert.equal(raw.bodySource[0].fields.milkCooldown, -2);
  assert.throws(() => engine.snapshotAttachmentCreatureCustody());
  for (const value of [hive, sleeping, engine.mobs[0]]) {
    let accessed = false;
    Object.defineProperty(value, "futureField", { enumerable: true, configurable: true, get() { accessed = true; return 1; } });
    assert.throws(() => engine.snapshotAttachmentCreatureSources(), /accessors/); assert.equal(accessed, false);
    Object.defineProperty(value, "futureField", { enumerable: true, configurable: true, value: undefined });
  }
});

test("actual host snapshot reconciles canonical encounter maps and refuses stale body references without repairing history", () => {
  const { engine } = fixture(), anchor = "prime:petalfox:0:0";
  engine.inventory = [captureOrbInventorySlot(captureIntoOrb(createEmptyCaptureOrb("prime-orb"), {
    schema: 1, entityId: "prime-specimen", kind: "petalfox", health: 5, maxHealth: 7, ageTicks: 123, baby: false,
    temperament: "Gentle", hostile: false, tamed: true, ownerId: "keeper", name: null, geneticSeed: 321, command: null, custom: { primeAnchorId: anchor },
  }, 42)!)];
  const state = transferPrimeEncounterCustody(createPrimeEncounterState(planPrimeEncounter("petalfox", { worldSeed: "fixture", x: 0, z: 0, y: 30,
    surfaceY: 30, biomeName: "Glimmerwood", weather: "clear", daylight: .8 })!, "petalfox", 23, 100), "captured", "prime-specimen", "orb:prime-orb", null, 200);
  engine.primeEncounters.set(anchor, state);
  const snapshot = engine.snapshotAttachmentCreatureCustody();
  assert.deepEqual(snapshot.encounters.primeOwners[0].owner!.path, ["inventory", 0]);
  assert.equal(snapshot.encounters.primeOwners[0].owner!.body, null);
  assert.equal(engine.primeEncounters.get(anchor), state);
  const stale = { ...state, entityId: 23 }; engine.primeEncounters.set(anchor, stale);
  assert.throws(() => engine.snapshotAttachmentCreatureCustody(), /current body\/specimen/);
  assert.equal(engine.primeEncounters.get(anchor), stale);
});

test("actual engine global read joins a carried remote history after repository observation without passing through local assumptions", async () => {
  const { engine } = fixture(), universe = universeId("runtime-global-custody"), home = locationId(homeLocation(universe));
  const orbit = locationId({ ...homeLocation(universe), kind: "orbit", instanceId: "low" }), anchor = "prime:petalfox:0:0";
  const value = captureIntoOrb(createEmptyCaptureOrb("remote-orb"), { schema: 1, entityId: "remote-specimen", kind: "petalfox",
    health: 5, maxHealth: 7, ageTicks: 123, baby: false, temperament: "Gentle", hostile: false, tamed: true, ownerId: "keeper",
    name: null, geneticSeed: 321, command: null, custom: { primeAnchorId: anchor } }, 42)!;
  const state = transferPrimeEncounterCustody(createPrimeEncounterState(planPrimeEncounter("petalfox", { worldSeed: "fixture", x: 0, z: 0,
    y: 30, surfaceY: 30, biomeName: "Glimmerwood", weather: "clear", daylight: .8 })!, "petalfox", 23, 100),
  "captured", "remote-specimen", "orb:remote-orb", null, 200);
  const manifest = { id: universe, universeId: universe, revision: 7, currentLocationId: home, currentPlayerId: "host", deletedAt: null };
  // Declared verified-repository transport adapter, not native IndexedDB proof.
  const repository = { snapshot: { manifest, universe: { fields: {} },
    players: [{ playerId: "host", locationId: home, fields: { inventory: [] } }], locations: [
      { descriptor: { id: home, universeId: universe, revision: 6 }, fields: { furnaces: {}, chests: {} } },
      { descriptor: { id: orbit, universeId: universe, revision: 2 }, fields: { furnaces: {}, chests: {}, primeEncounters: { [anchor]: state } } },
    ] }, source: ["repository-test-adapter"] };
  let reads = 0, mutate: (() => void) | null = null;
  const storage = { currentManifest: manifest, currentStamp: { locationId: home, epoch: 1, revision: 6 },
    snapshotAttachmentSource: async () => { reads++; mutate?.(); return repository; } };
  Object.assign(engine, { inventory: [captureOrbInventorySlot(value)], worldStorage: storage, persistenceRevision: 11,
    position: new THREE.Vector3(0, 30, 0), playerVariant: "male", crouching: false, mountedBoatId: null, mountedCreatureId: null,
    mountedCreatureSeat: null, creatureMountSeats: new Map(), remotePlayers: new Map(), agentAuthority: { list: () => [] } });
  assert.throws(() => engine.snapshotAttachmentCreatureCustody(), /unresolved Prime/);
  const before = JSON.stringify(engine.inventory), result = await engine.snapshotUniverseCreatureCustody();
  assert.equal(reads, 1); assert.equal(result.custody.encounters.primeOwners[0].locationId, orbit);
  assert.equal(result.custody.encounters.primeOwners[0].owner?.encounterOriginLocationId, null);
  assert.deepEqual(result.custody.encounters.primeOwners[0].owner?.path, ["player", "host", "inventory", 0]);
  assert.equal(result.runtime.actorId, "local"); assert.equal(result.custody.activePlayer.playerId, "host");
  assert.equal(JSON.stringify(engine.inventory), before); assert.equal(engine.primeEncounters.size, 0);
  assert(!Object.isFrozen(repository));
  mutate = () => { engine.inventory[0]!.metadata!.changedDuringAwait = true; };
  await assert.rejects(engine.snapshotUniverseCreatureCustody(), /changed during repository/);
  Reflect.deleteProperty(engine.inventory[0]!.metadata!, "changedDuringAwait");
  mutate = () => { Object.assign(engine, { worldStorage: { ...storage } }); };
  await assert.rejects(engine.snapshotUniverseCreatureCustody(), /pending world\/cargo/);
  Object.assign(engine, { worldStorage: storage }); mutate = null;
  for (const field of ["checkpointPromise", "pendingFieldSurvey", "pendingSpaceArrival", "locationTransitioning", "evaCargoLine"]) {
    Object.assign(engine, { [field]: true }); const prior: number = reads;
    await assert.rejects(engine.snapshotUniverseCreatureCustody(), /pending world\/cargo/); assert.equal(reads, prior);
    Object.assign(engine, { [field]: null });
  }
});
