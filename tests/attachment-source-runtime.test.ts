import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine } from "../app/game/engine";
import { BlockId, Item } from "../app/game/data";
import { PressureRuntime } from "../app/game/pressure-runtime";
import { bodyEnvironment } from "../app/game/celestial-environment";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createCelestialTerrain } from "../app/game/celestial-terrain";
import { createWaystarCatalog } from "../app/game/celestial-catalog";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { createDigitalCreatureArchive, createDigitalItemVault } from "../app/game/digital-storage";
import { canonicalJson } from "../app/game/universe-json";
import { createGolemForgeState } from "../app/game/v1-cultures";
import { SPELL_TOME_ITEMS } from "../app/game/dragon-world";
import type { ChunkEditSave } from "../app/game/world";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb } from "../app/game/capture-orbs";
import { createPrimeEncounterState, planPrimeEncounter, transferPrimeEncounterCustody } from "../app/game/creature-rarity";

const additionalMaps = ["saplings", "veinRegrowth", "roadEvents", "golemForges", "alchemyStands", "distilleries", "sugarworks",
  "archiveShelves", "tomeDisplays", "settlements", "merchants", "liquidCells", "ecologySectors", "multiplayerPlayerProgressions",
  "multiplayerPlayerWallets", "rangedLoaded", "tidemendSites", "leadAnchors", "contextualLootContainers", "persistentMachineLastStep",
  "apiaryFlowerCache", "socialMotions", "celestialCreatureVelocity", "multiplayerBoatInputs", "capturePacification"] as const;
function fixture() {
  const orbit = locationAddress({ ...homeLocation(universeId("runtime-complete-source")), kind: "orbit", instanceId: "low" });
  const registry = createAsteroidRegistry(orbit, 953), asteroid = registry.asteroids[0].descriptor;
  const stamp = { locationId: locationId(orbit), epoch: 3, revision: 7 };
  const maps = Object.fromEntries([...additionalMaps, "furnaces", "wheatMills", "wayworks", "chests", "boats", "orbRacks",
    "healingStations", "morphLooms", "multiplayerPlayerStates", "apiaries", "aquariums", "fieldPerches", "temporarySummons",
    "primeEncounters", "legendaryEncounters", "agentBuildJobs", "agentBuildPreviews", "agentRuntimeTasks", "agentInventories",
    "agentEquipment", "agentReturningMaterials", "agentInventoryRevisions", "remotePlayers", "creatureMountSeats",
    "temporarySpellBlocks"].map(name => [name, new Map()]));
  const pressure = { schema: 1, nextInstallation: 1, zones: [], devices: {} };
  const edits: ChunkEditSave = {};
  const engine = Object.assign(Object.create(VoxelEngine.prototype), maps, { multiplayer: null, persistenceRevision: 11,
    inventory: [{ item: Item.RawIron, count: 9, metadata: { opaque: { x: 999 } } }], cursor: null, trash: null, craftGrid: [],
    equipment: { head: null, chest: null, legs: null, feet: null, back: null }, offhand: null,
    digitalItemVault: createDigitalItemVault(), digitalCreatureArchive: createDigitalCreatureArchive(), spacefleet: { schema: 1, vehicles: {} },
    drops: [], mobs: [], sleepingCreatures: [], mountedBoatId: null, mountedCreatureId: null, mountedCreatureSeat: null,
    position: new THREE.Vector3(asteroid.center.x, asteroid.center.y, asteroid.center.z), spawn: new THREE.Vector3(0, 32, 0),
    yaw: .2, pitch: .1, velocity: new THREE.Vector3(.1, .2, .3), playerVariant: "male", crouching: false, creativeFlying: false,
    agentAuthority: { list: () => [] }, pressureRuntime: { snapshot: () => structuredClone(pressure), snapshotAttachmentSource: () => structuredClone(pressure) },
    orbitalStations: null, worldStorage: { currentStamp: stamp, currentManifest: { currentLocationId: stamp.locationId, revision: 5 }, currentCatalog: createWaystarCatalog() },
    asteroidFields: { schema: 1, fields: { [stamp.locationId]: registry } },
    world: { locationScope: stamp, celestialTerrain: createCelestialTerrain({ location: orbit, seed: 953 }),
      generationOptions: { profile: "world-below-v15" }, seedText: "source-fixture", serializeEdits: () => structuredClone(edits), serializeBlockFacings: () => ({}),
      serializeSurfaceRoadGraph: () => ({ schema: 1, edges: [] }), getBlock: () => { throw Error("No loaded chunks"); } },
    bodyContext: () => { throw Error("No mutable body cache"); }, serialize: () => { throw Error("No mutating serialization"); },
    saveSoon: () => { throw Error("No persistence"); }, advanceUniverseClock: () => { throw Error("No clock reconciliation"); },
    fastTravelChannel: null, rangedReloadItem: null, fallingTrees: [], projectiles: [], dragonEffects: [], activeSpellFields: [],
    playerCombatStatuses: [], stormstepDashSeconds: 0, liquidSimulator: { pendingCount: 0 },
    acquiredLootUniqueIds: new Set(), activatedStructureMarkers: new Set(), mode: "survival", health: 10, hunger: 10,
    selected: 0, xp: 0, level: 1, day: 1, worldTime: .2, weather: "clear", weatherState: { kind: "clear" },
    saveExtensions: {}, worldOptions: { dayLengthMinutes: 20 }, bestiary: {}, lifeSupportState: {},
  }) as VoxelEngine;
  return { engine, asteroid, pressure, edits };
}

test("actual full scoped source observes remote history before physical selection and rechecks every authority input", async () => {
  const { engine, asteroid, pressure } = fixture(), universe = universeId("runtime-complete-source");
  const home = locationId(homeLocation(universe)), orbit = engine.worldStorage.currentStamp!.locationId;
  const anchor = "prime:petalfox:0:0", value = captureIntoOrb(createEmptyCaptureOrb("remote-orb"), {
    schema: 1, entityId: "remote-specimen", kind: "petalfox", health: 5, maxHealth: 7, ageTicks: 123, baby: false,
    temperament: "Gentle", hostile: false, tamed: true, ownerId: "local", name: null, geneticSeed: 321, command: null,
    custom: { primeAnchorId: anchor } }, 42)!;
  const history = transferPrimeEncounterCustody(createPrimeEncounterState(planPrimeEncounter("petalfox", { worldSeed: "fixture", x: 0,
    z: 0, y: 30, surfaceY: 30, biomeName: "Glimmerwood", weather: "clear", daylight: .8 })!, "petalfox", 23, 100),
    "captured", "remote-specimen", "orb:remote-orb", null, 200);
  const manifest = { id: universe, universeId: universe, revision: 5, currentLocationId: orbit, currentPlayerId: "host", deletedAt: null };
  // Existing exact repository API is represented by a declared transport adapter;
  // this exercises real engine observation/selection, not native IDB or consent.
  const repository = { snapshot: { manifest, universe: { fields: {} },
    players: [{ playerId: "host", locationId: orbit, fields: { inventory: [] } }], locations: [
      { descriptor: { id: orbit, universeId: universe, revision: 7 }, fields: { furnaces: {}, chests: {} } },
      { descriptor: { id: home, universeId: universe, revision: 2 }, fields: { furnaces: {}, chests: {}, primeEncounters: { [anchor]: history } } },
    ] }, source: ["repository-adapter"] };
  let mutate: (() => void) | null = null, reads = 0;
  const storage = { ...engine.worldStorage, currentManifest: manifest,
    currentCatalog: engine.worldStorage.currentCatalog, currentStamp: engine.worldStorage.currentStamp,
    snapshotAttachmentSource: async () => { reads++; mutate?.(); return repository; } };
  Object.assign(engine, { worldStorage: storage, inventory: [captureOrbInventorySlot(value)] });
  assert.throws(() => engine.snapshotAttachmentSource(asteroid.id), /unresolved Prime/);
  const raw = engine.snapshotAttachmentSourceObservation(asteroid.id);
  assert.equal(raw.physical.encounterSources.primeEncounters[anchor], undefined);
  const before = JSON.stringify(engine.inventory), result = await engine.snapshotScopedAttachmentUniverseSource(asteroid.id);
  assert.equal(reads, 1); assert.equal(result.physical.stored[0].side, "attached");
  assert.equal(result.physical.custody.encounters.primeOwners[0].locationId, home);
  assert.equal(result.physical.custody.encounters.primeOwners[0].owner?.encounterOriginLocationId, null);
  assert.equal(JSON.stringify(engine.inventory), before); assert(!Object.isFrozen(repository));
  assert(Object.isFrozen(result.runtime)); assert.equal(engine.primeEncounters.size, 0);
  for (const fault of ["inventory", "pressure", "environment", "catalog", "catalogUndefined", "effects", "facade"] as const) {
    const priorInventory = engine.inventory, priorHealth = engine.health, priorCatalog = storage.currentCatalog;
    const oldInstallation = pressure.nextInstallation;
    mutate = () => {
      if (fault === "inventory") engine.inventory = [];
      if (fault === "pressure") pressure.nextInstallation++;
      if (fault === "environment") engine.health--;
      if (fault === "catalog") storage.currentCatalog = { ...priorCatalog!, catalogVersion: priorCatalog!.catalogVersion + 1 };
      if (fault === "catalogUndefined") Object.assign(storage, { currentCatalog: { ...priorCatalog, rawExtension: undefined } });
      if (fault === "effects") engine.projectiles.push({} as never);
      if (fault === "facade") Object.assign(engine, { worldStorage: { ...storage } });
    };
    await assert.rejects(engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /changed during repository|active effects/, fault);
    engine.inventory = priorInventory; engine.health = priorHealth; pressure.nextInstallation = oldInstallation;
    storage.currentCatalog = priorCatalog; engine.projectiles.length = 0; Object.assign(engine, { worldStorage: storage });
  }
  mutate = null;
  for (const field of ["checkpointPromise", "pendingFieldSurvey", "pendingSpaceArrival", "locationTransitioning", "evaCargoLine"]) {
    Object.assign(engine, { [field]: true }); const prior: number = reads;
    await assert.rejects(engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /pending world\/cargo/); assert.equal(reads, prior);
    Object.assign(engine, { [field]: null });
  }
});

test("actual exhaustive source binds installed production and detects ledger changes at the same revision", () => {
  const { engine, asteroid, edits } = fixture(), { x, y, z } = asteroid.center;
  const cx = Math.floor(x / 16), cz = Math.floor(z / 16), key = `${x},${y},${z}`;
  edits[`${cx},${cz}`] = [[(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, BlockId.GolemForge]];
  const unopened = engine.snapshotAttachmentSource(asteroid.id);
  assert.equal(unopened.production.installations.length, 1);
  assert.equal(unopened.production.installations[0].recorded, false);
  assert.equal(engine.golemForges.size, 0);
  engine.golemForges.set(key, { ...createGolemForgeState(), storedMana: 17, completed: ["copper-scout"] });
  const source = engine.snapshotAttachmentSource(asteroid.id);
  assert.equal(source.production.installations[0].recorded, true);
  assert.deepEqual(source.production.installations[0].state, engine.golemForges.get(key));
  engine.assertAttachmentSourceUnchanged(source);
  engine.golemForges.set(key, { ...engine.golemForges.get(key)!, storedMana: 18 });
  assert.equal(engine.persistenceRevision, 11);
  assert.throws(() => engine.assertAttachmentSourceUnchanged(source), /Stale attachment source/);
  engine.golemForges.delete(key);
  engine.assertAttachmentSourceUnchanged(unopened);
});

test("actual exhaustive source binds implicit shelf counts and exact stored spell identities", () => {
  const { engine, asteroid, edits } = fixture(), { x, y, z } = asteroid.center;
  const cx = Math.floor(x / 16), cz = Math.floor(z / 16), cell = `${x},${y},${z}`;
  const index = (y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16;
  edits[`${cx},${cz}`] = [[index, BlockId.ArchiveShelfTwo]];
  const unopened = engine.snapshotAttachmentSource(asteroid.id);
  assert.deepEqual(unopened.bookFurniture.installations[0].implicitBooks, { item: Item.BoundBook, count: 2 });
  assert.equal(engine.archiveShelves.size, 0);
  engine.archiveShelves.set(cell, { schema: 1, tomes: [Item.BoundBook, SPELL_TOME_ITEMS[0]] });
  const source = engine.snapshotAttachmentSource(asteroid.id);
  assert.equal(source.bookFurniture.installations[0].recorded, true);
  assert.equal(source.bookFurniture.installations[0].implicitBooks, null);
  engine.assertAttachmentSourceUnchanged(source);
  engine.archiveShelves.set(cell, { schema: 1, tomes: [Item.BoundBook, SPELL_TOME_ITEMS[1]] });
  assert.equal(engine.persistenceRevision, 11);
  assert.throws(() => engine.assertAttachmentSourceUnchanged(source), /Stale attachment source/);
  engine.archiveShelves.delete(cell);
  engine.assertAttachmentSourceUnchanged(unopened);
  edits[`${cx},${cz}`] = [[index, BlockId.ArchiveShelfThree]];
  assert.throws(() => engine.assertAttachmentSourceUnchanged(unopened), /Stale attachment source/);
});

test("actual universe source join rechecks live runtime after an asynchronous repository observation", async () => {
  for (const mutate of [false, true]) {
    const { engine, asteroid } = fixture(); let reads = 0;
    Object.assign(engine.worldStorage!, { snapshotAttachmentSource: async () => {
      reads++; await Promise.resolve(); if (mutate) engine.inventory[0]!.count--;
      return { snapshot: { manifest: { currentLocationId: engine.world.locationScope.locationId } }, testDouble: true };
    } });
    if (mutate) await assert.rejects(() => engine.snapshotAttachmentUniverseSource(asteroid.id), /Stale attachment source/);
    else { const result = await engine.snapshotAttachmentUniverseSource(asteroid.id); assert(Object.isFrozen(result)); }
    assert.equal(reads, 1); assert.equal(engine.persistenceRevision, 11);
  }
  const { engine, asteroid } = fixture();
  Object.assign(engine.worldStorage!, { snapshotAttachmentSource: async () => ({ snapshot: { manifest: { currentLocationId: "another-location" } } }) });
  await assert.rejects(() => engine.snapshotAttachmentUniverseSource(asteroid.id), /differs from the active orbital source/);
});

test("actual exhaustive engine source is cache/clock/normalization free and detects direct changes", () => {
  const { engine, asteroid } = fixture(), registry = engine.asteroidFields, inventory = engine.inventory;
  const before = canonicalJson({ registry, inventory }), now = Date.now;
  Date.now = () => { throw Error("No clock"); };
  let source: ReturnType<VoxelEngine["snapshotAttachmentSource"]>;
  try { source = engine.snapshotAttachmentSource(asteroid.id); engine.assertAttachmentSourceUnchanged(source); }
  finally { Date.now = now; }
  assert(Object.isFrozen(source.source)); assert.equal(engine.asteroidFields, registry); assert.equal(engine.inventory, inventory);
  assert.equal(canonicalJson({ registry, inventory }), before);
  engine.inventory[0]!.metadata!.opaque = { x: 998 };
  assert.equal(engine.persistenceRevision, 11);
  assert.throws(() => engine.assertAttachmentSourceUnchanged(source), /Stale attachment source/);
  const fresh = fixture(), unchanged = fresh.engine.snapshotAttachmentSource(fresh.asteroid.id);
  Object.assign(fresh.engine, { saveExtensions: { ownUndefined: undefined } });
  assert.throws(() => fresh.engine.assertAttachmentSourceUnchanged(unchanged), /Stale attachment source/);
});

test("actual adapter covers additional raw maps without dirty-counter, decay, clamp or history truncation", () => {
  for (const name of additionalMaps) {
    const { engine, asteroid } = fixture(), source = engine.snapshotAttachmentSource(asteroid.id);
    const map = (engine as unknown as Record<string, unknown>)[name] as Map<unknown, unknown>;
    map.set("raw-key", name === "celestialCreatureVelocity" ? new THREE.Vector3(1, 2, 3) : { raw: true, optional: undefined });
    assert.equal(engine.persistenceRevision, 11);
    const expected = ["golemForges", "alchemyStands", "distilleries", "sugarworks"].includes(name) ? /production station key/
      : ["archiveShelves", "tomeDisplays"].includes(name) ? /book furniture key/
      : name === "liquidCells" ? /canonical storage cell key/ : /Stale attachment source/;
    assert.throws(() => engine.assertAttachmentSourceUnchanged(source), expected, name);
  }
  const { engine, asteroid } = fixture();
  for (let index = 0; index < 4200; index++) engine.roadEvents.set(`history-${index}`, { raw: index } as never);
  for (let index = 0; index < 600; index++) engine.tidemendSites.set(`site-${index}`, index);
  const source = engine.snapshotAttachmentSource(asteroid.id);
  engine.roadEvents.delete("history-0");
  assert.throws(() => engine.assertAttachmentSourceUnchanged(source), /Stale/);
  assert.equal(engine.tidemendSites.size, 600);
});

test("raw scalar, optional, set and owner-extension changes invalidate the exact preimage", () => {
  const names = ["startingSettlementId", "bestiary", "selected", "health", "hunger", "xp", "level", "worldTime", "day",
    "universeTimeSeconds", "clockLocalTime", "clockLocalDay", "weather", "weatherState", "summonContractState", "guildBook",
    "mapKnowledge", "questBook", "sideQuestDefinitions", "blueprints", "plantBestiary", "magicState", "skillState", "goldWallet",
    "factionRelations", "bankAccount", "stockMarket", "potionBuffs", "cardforgeState", "agentWorldState", "lifeSupportState",
    "worldOptions", "saveExtensions", "ironwakeWard", "agentWorldFingerprint", "agentTestWorld", "persistentMachineTimer",
    "persistentMachineCursor", "liquidTickAccumulator", "nextMobId", "nextDropId", "nextBoatId"];
  for (const name of names) {
    const { engine, asteroid } = fixture(), source = engine.snapshotAttachmentSource(asteroid.id);
    Object.assign(engine, { [name]: { mutation: true } });
    assert.throws(() => engine.assertAttachmentSourceUnchanged(source), /Stale attachment source|numbers must be finite/, name);
    assert.equal(engine.persistenceRevision, 11);
  }
  for (const name of ["activatedStructureMarkers", "acquiredLootUniqueIds"] as const) {
    const { engine, asteroid } = fixture(), source = engine.snapshotAttachmentSource(asteroid.id);
    engine[name].add("unrecorded-new-value");
    assert.throws(() => engine.assertAttachmentSourceUnchanged(source), /Stale/);
  }
});

test("active effect, travel, liquid and pressure work cannot be captured as quiescent", () => {
  const pending: Record<string, unknown> = { fastTravelChannel: {}, rangedReloadItem: Item.RawIron,
    fallingTrees: [{}], projectiles: [{}], dragonEffects: [{}], activeSpellFields: [{}], playerCombatStatuses: [{}],
    temporarySummons: new Map([[1, {}]]), temporarySpellBlocks: new Map([["x", {}]]), stormstepDashSeconds: .1,
    liquidSimulator: { pendingCount: 1 } };
  for (const [name, value] of Object.entries(pending)) {
    const { engine, asteroid } = fixture(); Object.assign(engine, { [name]: value });
    assert.throws(() => engine.snapshotAttachmentSource(asteroid.id), /Finish/);
  }
  const { engine, asteroid } = fixture();
  Object.assign(engine.pressureRuntime!, { snapshotAttachmentSource() { throw Error("pending-pressure"); } });
  assert.throws(() => engine.snapshotAttachmentSource(asteroid.id), /pending-pressure/);
});

test("raw creature projection never filters or normalizes own gameplay fields", () => {
  const { engine, asteroid } = fixture(), physical = engine.snapshotAttachmentPhysicalCustodySource(asteroid.id);
  // Isolate raw projection from the already-tested physical selector. This is
  // not a fixture claiming admission for an incomplete test creature body.
  engine.snapshotAttachmentPhysicalCustodySource = () => physical;
  const mob = { id: 1, group: { position: new THREE.Vector3(1, 2, 3) }, health: 5, maxHealth: 6,
    milkCooldown: -2, outOfRangeSeconds: -1, morrowExposure: { optional: undefined },
    pushVelocity: new THREE.Vector2(.1, .2), newGameplayField: { finite: 7 }, visual: new THREE.Group() };
  engine.mobs = [mob] as never;
  const source = engine.snapshotAttachmentSource(asteroid.id);
  assert.equal(mob.milkCooldown, -2); assert.equal(mob.outOfRangeSeconds, -1);
  assert.match(JSON.stringify(source.source), /newGameplayField/);
  mob.newGameplayField.finite++;
  assert.throws(() => engine.assertAttachmentSourceUnchanged(source), /Stale attachment source/);
  mob.newGameplayField.finite--;
  mob.pushVelocity.x += .1;
  assert.throws(() => engine.assertAttachmentSourceUnchanged(source), /Stale attachment source/);
});

test("full engine source binds real pressure authority and rejects later pending topology", () => {
  const { engine, asteroid } = fixture(); let callbacks = 0;
  const runtime = new PressureRuntime({ locationId: engine.world.locationScope.locationId, generation: 3, minY: -64, maxY: 127,
    blockAt: () => { callbacks++; return BlockId.Air; }, skyTopAt: () => { callbacks++; return -65; }, loadedColumns: () => [],
    machines: engine.wayworks, environment: () => bodyEnvironment(createWaystarCatalog().bodies.find(body => body.id === "blockwild")!, "orbit"),
    daylight: () => 0, occupants: () => [], obstructed: () => false, actorStillHolding: () => false,
    changed: () => { callbacks++; }, alarm: () => { callbacks++; } });
  engine.pressureRuntime = runtime;
  try {
    const before = callbacks, source = engine.snapshotAttachmentSource(asteroid.id);
    engine.assertAttachmentSourceUnchanged(source); assert.equal(callbacks, before);
    runtime.boundary.admitted.oxygenMilliMoles++;
    assert.throws(() => engine.assertAttachmentSourceUnchanged(source), /Stale/);
    runtime.topology.invalidate({ x: 0, y: 0, z: 0 });
    // Without a worker, an authority that is no longer pristine cannot be
    // relabelled as a safe empty source after an edit.
    assert.throws(() => engine.snapshotAttachmentSource(asteroid.id), /pressure-attachment/);
  } finally { runtime.dispose(); }
});
