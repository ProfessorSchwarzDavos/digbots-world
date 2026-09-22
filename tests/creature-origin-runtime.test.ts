import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine, apiaryBeeCaptureSlot, apiaryWorkerTransferFromInventorySlot } from "../app/game/engine";
import { BlockId, Item } from "../app/game/data";
import { createMobVisual } from "../app/game/mob-models";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { readCreatureOrigins } from "../app/game/creature-origins";
import { captureIntoOrb, captureOrbFromInventorySlot, captureOrbInventorySlot, createEmptyCaptureOrb } from "../app/game/capture-orbs";
import { validatePayload, type MobSnapshotEntry } from "../app/game/multiplayer";
import { captureWorkerBeeItem, createApiary, createEmptyApiaryBlock, insertApiaryBee, stepApiary, workerBeeFromInventorySlot } from "../app/game/apiary";
import { readStoredCreatureCustody } from "../app/game/stored-creature-custody";

const home = locationId(homeLocation(universeId("origin-runtime")));
const orbit = locationId(locationAddress({ ...homeLocation(universeId("origin-runtime")), kind: "orbit", instanceId: "low" }));
function fixture(location = home) {
  // Actual spawn/model/metadata/save/restore functions; world grounding and
  // presentation synchronization are isolated adapters, not a browser journey.
  return Object.assign(Object.create(VoxelEngine.prototype), {
    nextMobId: 1, day: 1, mobs: [], sleepingCreatures: [], creatureGroup: new THREE.Group(),
    primeEncounters: new Map(), chests: new Map(), createMobVisual,
    world: { seedText: "same-seed", locationScope: { locationId: location, epoch: 1, revision: 0 },
      celestialTerrain: { kind: "morrow" }, surfaceAt: () => 33, biomeAt: () => 0,
      getBlock: (_x: number, y: number) => y === 33 ? BlockId.PaleRegolith : BlockId.Air,
      isWalkThrough: (block: BlockId) => block === BlockId.Air, findWalkableY: () => 33 },
    bodyContext: () => ({ environment: { gravityG: .192 } }), worldSimulationSeconds: () => 0,
    applyMobScale: () => {}, syncWoolhornCoat: () => {}, syncCreatureWorkVisual: () => {}, refreshMobSpatialEntry: () => {},
    daylightAmount: () => 1, weatherState: { kind: "clear" },
    creatureReleasePosition: (_metadata: unknown, position: THREE.Vector3) => position,
  }) as VoxelEngine;
}

test("actual new spawn stamps origin, while default and legacy restoration never infer it", () => {
  const engine = fixture(), position = new THREE.Vector3(3, 33.5, 1);
  const fresh = engine.spawnMob("slatefin-burrower", position, { newSpecimen: true, specimenId: "unchanged-bare-id", geneticSeed: 321 });
  assert.deepEqual(readCreatureOrigins(fresh), { specimenOriginLocationId: home });
  assert.equal(fresh.specimenId, "unchanged-bare-id");
  const unknown = engine.spawnMob("slatefin-burrower", position, { specimenId: "legacy" });
  assert.deepEqual(readCreatureOrigins(unknown), {});
  const saved = JSON.parse(JSON.stringify(engine.serializeCreature(unknown)));
  const restored = fixture(orbit).restoreCreature(saved)!;
  assert.deepEqual(readCreatureOrigins(restored), {});
  assert(!Object.hasOwn(saved, "specimenOriginLocationId"));
  const nextId = engine.nextMobId, count = engine.mobs.length;
  assert.throws(() => engine.spawnMob("slatefin-burrower", position, { newSpecimen: true, custodyOrigins: {} }), /cannot replace/);
  assert.equal(engine.nextMobId, nextId); assert.equal(engine.mobs.length, count);
});

test("actual capture, cross-location release, serialization and cold restoration preserve the same origin", () => {
  const engine = fixture(), position = new THREE.Vector3(3, 33.5, 1);
  const original = engine.spawnMob("slatefin-burrower", position, { newSpecimen: true, specimenId: "carried-original", geneticSeed: 321,
    creatureTamed: true, creatureOwnerId: "local", age: 123, yaw: .2 });
  const metadata = engine.creatureMetadataForMob(original), before = structuredClone(metadata);
  const captured = captureIntoOrb(createEmptyCaptureOrb("origin-orb"), metadata, 42, "local"); assert(captured);
  const stored = captureOrbFromInventorySlot(JSON.parse(JSON.stringify(captureOrbInventorySlot(captured)))); assert(stored?.creature);
  const destination = fixture(orbit), released = destination.spawnCreatureMetadata(stored.creature, position); assert(released);
  assert.deepEqual(readCreatureOrigins(released), { specimenOriginLocationId: home });
  const saved = JSON.parse(JSON.stringify(destination.serializeCreature(released)));
  const cold = fixture(orbit), restored = cold.restoreCreature(saved)!;
  assert.deepEqual(readCreatureOrigins(restored), { specimenOriginLocationId: home });
  assert.deepEqual(cold.creatureMetadataForMob(restored).custom.specimenOriginLocationId, home);
  assert.equal(restored.specimenId, original.specimenId);
  assert.deepEqual(metadata, before);
});

test("same bare Prime identity can carry distinct explicit new origins without rewriting its ID", () => {
  const spawn = (engine: VoxelEngine) => engine.spawnMob("petalfox", new THREE.Vector3(3, 33.5, 1), {
    newSpecimen: true, primeAnchorId: "prime:petalfox:0:0", geneticSeed: 321,
  });
  const a = spawn(fixture()), b = spawn(fixture(orbit));
  assert.equal(a.specimenId, b.specimenId);
  assert.deepEqual(readCreatureOrigins(a), { specimenOriginLocationId: home, encounterOriginLocationId: home });
  assert.deepEqual(readCreatureOrigins(b), { specimenOriginLocationId: orbit, encounterOriginLocationId: orbit });
});

test("wire provenance is additive for legacy peers and rejects malformed present origins", () => {
  const entry: MobSnapshotEntry = { id: 1, kind: "slatefin-burrower", x: 0, y: 33.5, z: 0, yaw: 0, health: 5, state: "wander" };
  const payload = (mob: unknown) => ({ tick: 1, scope: { centerPlayerId: "origin-player", radius: 64, epoch: 1 }, mobs: [mob] });
  assert.equal(validatePayload("mob-snapshot", payload(entry)), true);
  assert.equal(validatePayload("mob-snapshot", payload({ ...entry, specimenOriginLocationId: home })), true);
  for (const value of [null, undefined, "home", 5])
    assert.equal(validatePayload("mob-snapshot", payload({ ...entry, specimenOriginLocationId: value })), false);
});

test("actual apiary queen insertion, display, release and cold restore retain captured origin", () => {
  const source = fixture(), position = new THREE.Vector3(3, 33.5, 1);
  const original = source.spawnMob("hive-queen", position, { newSpecimen: true,
    apiaryBee: createApiary("origin-queen", [], 42).queen });
  original.hostile = false;
  assert.deepEqual(readCreatureOrigins(original.apiaryBee), { specimenOriginLocationId: home });
  const orb = captureIntoOrb(createEmptyCaptureOrb("queen-origin-orb"), source.creatureMetadataForMob(original), 42)!;
  const slot = captureOrbInventorySlot(orb), destination = fixture(orbit), key = "0,33,0";
  Object.assign(destination, { apiaries: new Map([[key, createEmptyApiaryBlock()]]), persistentMachineLastStep: new Map(),
    events: { onToast: () => {} }, position, settings: { simulationDistance: 4 } });
  assert.equal(destination.insertQueenCell(key, slot), true);
  const housed = destination.apiaries.get(key)!; assert(housed.queen);
  assert.deepEqual(readCreatureOrigins(housed.queen), { specimenOriginLocationId: home });
  destination.syncApiaryWorkerMobs(key, { ...housed, queenDisplayEnabled: true }, "day");
  assert.equal(destination.mobs.length, 1);
  assert.deepEqual(readCreatureOrigins(destination.mobs[0]), { specimenOriginLocationId: home });
  const capturedAgain = captureOrbFromInventorySlot(apiaryBeeCaptureSlot(housed.queen)); assert(capturedAgain?.creature);
  assert.deepEqual(readCreatureOrigins(capturedAgain.creature.custom), { specimenOriginLocationId: home });
  // Avoid deleting a real visual in this adapter; release uses the actual
  // canonical resident and actual spawn, with an empty presentation collection.
  destination.mobs = [];
  destination.releaseApiaryResidents(key, { queen: housed.queen, workers: [], storedNectar: 0 }, position);
  const saved = JSON.parse(JSON.stringify(destination.serializeCreature(destination.mobs[0])));
  const restored = fixture(orbit).restoreCreature(saved)!;
  assert.deepEqual(readCreatureOrigins(restored), { specimenOriginLocationId: home });
  assert.deepEqual(readCreatureOrigins(restored.apiaryBee), { specimenOriginLocationId: home });
  assert.equal(slot.count, 0);
});

test("worker housing and both transfer formats preserve origins without modifying exact stored orb", () => {
  const source = fixture(), resident = createApiary("queen", ["worker"], 42).workers[0];
  const original = source.spawnMob("honeybee", new THREE.Vector3(3, 33.5, 1), { newSpecimen: true, apiaryBee: resident });
  const orb = captureIntoOrb(createEmptyCaptureOrb("worker-origin-orb"), source.creatureMetadataForMob(original), 42)!;
  const slot = captureOrbInventorySlot(orb), transfer = apiaryWorkerTransferFromInventorySlot(slot)!;
  const inserted = insertApiaryBee(createApiary("housed-queen", [], 1), transfer.worker, "local");
  assert.equal(inserted.inserted, true);
  const housed = inserted.state.workers[0];
  assert.deepEqual(readCreatureOrigins(housed), { specimenOriginLocationId: home });
  assert.equal(captureWorkerBeeItem(housed)!.metadata!.captureOrb, slot.metadata!.captureOrb);
  const capsule = captureWorkerBeeItem({ ...housed, storedOrb: null })!;
  assert.deepEqual(readCreatureOrigins(workerBeeFromInventorySlot(JSON.parse(JSON.stringify(capsule)))), { specimenOriginLocationId: home });
  assert.equal(insertApiaryBee(createApiary("other", [], 1), { ...housed, specimenOriginLocationId: undefined }, "local").inserted, false);
  const nextId = source.nextMobId;
  assert.throws(() => source.spawnMob("honeybee", new THREE.Vector3(), { apiaryBee: housed, custodyOrigins: { specimenOriginLocationId: orbit } }), /provenance disagree/);
  assert.equal(source.nextMobId, nextId);
  const conflicting = structuredClone(orb);
  Object.assign(conflicting.creature!.custom.apiaryBee!, { specimenOriginLocationId: orbit });
  const badSlot = captureOrbInventorySlot(conflicting);
  assert.equal(apiaryWorkerTransferFromInventorySlot(badSlot), null);
  assert.throws(() => readStoredCreatureCustody(badSlot), /provenance disagree/);
});

test("apiary births use their explicit birth location, not the carried queen's origin", () => {
  const engine = fixture(orbit), key = "0,33,0";
  Object.assign(engine, { apiaries: new Map([[key, createEmptyApiaryBlock()]]), persistentMachineLastStep: new Map(), events: { onToast: () => {} } });
  assert.equal(engine.insertQueenCell(key, { item: Item.QueenCell, count: 1 }), true);
  assert.deepEqual(readCreatureOrigins(engine.apiaries.get(key)!.queen), { specimenOriginLocationId: orbit });
  const hive = createApiary("carried-queen", [], 42), carried = { ...hive, queen: { ...hive.queen, specimenOriginLocationId: home } };
  const grown = stepApiary(carried, { phase: "night", nearbyFlowers: 8, attached: true, deltaSeconds: 300, creationLocationId: orbit });
  assert(grown.events.includes("worker-created"));
  assert.deepEqual(readCreatureOrigins(grown.state.queen), { specimenOriginLocationId: home });
  assert.deepEqual(readCreatureOrigins(grown.state.workers[0]), { specimenOriginLocationId: orbit });
  assert.equal(carried.workers.length, 0);
});

test("successive actual guest snapshots reconstruct changed provenance and never retain legacy-omitted origins", () => {
  const guest = fixture(orbit);
  // Removal is a presentation adapter. Snapshot reconciliation and new model
  // reconstruction are the actual engine functions.
  guest.removeMob = (index: number) => { guest.mobs.splice(index, 1); };
  const receive = guest as unknown as { applyNetworkMobSnapshot(entries: MobSnapshotEntry[], tick: number): void };
  const base: MobSnapshotEntry = { id: 9, specimenId: "replicated", kind: "slatefin-burrower", x: 3, y: 33.5, z: 1, yaw: 0, health: 5, state: "wander" };
  receive.applyNetworkMobSnapshot([{ ...base, specimenOriginLocationId: home }], 1);
  const first = guest.mobs[0];
  receive.applyNetworkMobSnapshot([{ ...base, specimenOriginLocationId: home }], 2);
  assert.equal(guest.mobs[0], first);
  receive.applyNetworkMobSnapshot([{ ...base, specimenOriginLocationId: orbit }], 3);
  assert.notEqual(guest.mobs[0], first);
  assert.deepEqual(readCreatureOrigins(first), { specimenOriginLocationId: home });
  assert.deepEqual(readCreatureOrigins(guest.mobs[0]), { specimenOriginLocationId: orbit });
  receive.applyNetworkMobSnapshot([base], 4);
  assert.deepEqual(readCreatureOrigins(guest.mobs[0]), {});
  assert(!Object.hasOwn(guest.mobs[0], "specimenOriginLocationId"));
});

test("actual leviathan transformation preserves specimen and encounter origins with all encounter links", () => {
  const engine = fixture();
  engine.removeMob = (index: number) => { engine.mobs.splice(index, 1); };
  const original = engine.spawnMob("aetherbell-larva", new THREE.Vector3(3, 33.5, 1), { newSpecimen: true,
    legendaryEncounterId: "quiet-bells", legendarySiteId: "legendary-site:test", groundedSummonLineageId: "lineage-test", groundedSummonEntityId: "entity-test" });
  const grown = fixture().spawnMob("aetherbell-leviathan", new THREE.Vector3(3, 33.5, 1));
  const replacement = engine.transformLeviathan(original, grown.leviathanGrowth!);
  assert.equal(replacement.specimenId, original.specimenId);
  assert.deepEqual(readCreatureOrigins(replacement), { specimenOriginLocationId: home, encounterOriginLocationId: home });
  for (const key of ["legendaryEncounterId", "legendarySiteId", "groundedSummonLineageId", "groundedSummonEntityId"] as const)
    assert.equal(replacement[key], original[key]);
});
