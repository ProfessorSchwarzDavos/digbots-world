import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine } from "../app/game/engine";
import { BlockId, Item } from "../app/game/data";
import { PressureRuntime } from "../app/game/pressure-runtime";
import { bodyEnvironment } from "../app/game/celestial-environment";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { celestialTerrainSeed, createCelestialTerrain } from "../app/game/celestial-terrain";
import { createWaystarCatalog } from "../app/game/celestial-catalog";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { createDigitalCreatureArchive, createDigitalItemVault } from "../app/game/digital-storage";
import { canonicalJson } from "../app/game/universe-json";
import { createGolemForgeState } from "../app/game/v1-cultures";
import { SPELL_TOME_ITEMS } from "../app/game/dragon-world";
import type { ChunkEditSave } from "../app/game/world";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb } from "../app/game/capture-orbs";
import { createPrimeEncounterState, planPrimeEncounter, transferPrimeEncounterCustody } from "../app/game/creature-rarity";
import { prepareWaygridCapacity } from "../app/game/waygrid-capacity";
import { emptyAuthoredSiteFixture } from "./empty-authored-site-fixtures";
import { MOB_DEFS } from "../app/game/mobs";
import { createGuildBook, recordGuildServiceFlag } from "../app/game/guilds";

const additionalMaps = ["saplings", "veinRegrowth", "roadEvents", "golemForges", "alchemyStands", "distilleries", "sugarworks",
  "archiveShelves", "tomeDisplays", "settlements", "merchants", "liquidCells", "ecologySectors", "multiplayerPlayerProgressions",
  "multiplayerPlayerWallets", "rangedLoaded", "tidemendSites", "leadAnchors", "contextualLootContainers", "persistentMachineLastStep",
  "apiaryFlowerCache", "socialMotions", "celestialCreatureVelocity", "multiplayerBoatInputs", "capturePacification"] as const;
function fixture() {
  const orbit = locationAddress({ ...homeLocation(universeId("runtime-complete-source")), kind: "orbit", instanceId: "low" });
  const seed = celestialTerrainSeed("source-fixture");
  const registry = createAsteroidRegistry(orbit, seed), asteroid = registry.asteroids[0].descriptor;
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
    world: { locationScope: stamp, celestialTerrain: createCelestialTerrain({ location: orbit, seed }),
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

test("attachment follower snapshot uses the live formation predicate", () => {
  const { engine } = fixture(), actorId = engine.localPlayerId();
  const mob = { id: 7, definition: MOB_DEFS.peelop,
    petState: { tamed: true, ownerId: actorId, command: "follow" } };
  engine.mobs = [mob as never];
  const snapshot = () => (engine as unknown as { snapshotAttachmentActiveFollowers(actors: readonly { id: string }[]):
    readonly (readonly [string, readonly number[]])[] }).snapshotAttachmentActiveFollowers([{ id: actorId }]);
  assert.deepEqual(snapshot(), [[actorId, [7]]]);
  mob.petState.command = "stay";
  assert.deepEqual(snapshot(), [[actorId, []]]);
  mob.petState.command = "follow";
  engine.leadAnchors.set(7, { mobId: "7", maximumLength: 7 });
  assert.deepEqual(snapshot(), [[actorId, []]]);
});

test("actual engine empty-site join uses branded World and refuses same-revision changes across repository await", async () => {
  for (const fault of ["none", "seed", "queued-generation", "live-merchant", "persisted-merchant", "facade"] as const) {
    const { engine, asteroid } = fixture(), f = emptyAuthoredSiteFixture("runtime-complete-source");
    try {
      let reads = 0;
      const storage = { currentStamp: f.world.locationScope, currentManifest: f.repository.snapshot.manifest,
        currentCatalog: f.repository.snapshot.catalog, snapshotAttachmentSource: async () => {
          reads++;
          if (fault === "seed") f.world.seedText = "same-revision-changed";
          if (fault === "queued-generation") f.world.generationQueue.push({ cx: 0, cz: 0, distance: 0 });
          if (fault === "live-merchant") engine.merchants.set("new-owner", { schema: 1, id: "new-owner", authorityId: "host", revision: 0, recentEventIds: [] } as never);
          if (fault === "persisted-merchant") Object.assign(f.repository.snapshot.locations[0].fields,
            { merchants: { bodyless: { schema: 1, id: "bodyless", authorityId: "host", revision: 0, recentEventIds: [] } } });
          if (fault === "facade") Object.assign(engine, { worldStorage: { ...storage } });
          return f.repository;
        } };
      Object.assign(engine, { world: f.world, worldStorage: storage, worldOptions: f.live.options, startingSettlementId: null,
        asteroidFields: { schema: 1, fields: { [f.world.locationScope.locationId]: f.live.world.registry } } });
      if (fault === "none") {
        const result = await engine.snapshotEmptyAuthoredAttachmentUniverseSource(asteroid.id);
        assert.equal(result.clearance.kind, "proven-empty-authored-sites"); assert(Object.isFrozen(result));
      } else await assert.rejects(() => engine.snapshotEmptyAuthoredAttachmentUniverseSource(asteroid.id),
        /changed|reset-established|pending terrain|Unresolved global/);
      assert.equal(reads, 1);
    } finally { f.world.dispose(); }
  }
  const fake = fixture();
  await assert.rejects(() => fake.engine.snapshotEmptyAuthoredAttachmentUniverseSource(fake.asteroid.id), { name: "TypeError" });
});

test("actual full source refuses orphan architecture and observes exact paired cells", () => {
  const { engine, asteroid, edits } = fixture();
  const x = asteroid.center.x, y = asteroid.center.y + 10, z = asteroid.center.z;
  const cx = Math.floor(x / 16), cz = Math.floor(z / 16), chunk = `${cx},${cz}`;
  const index = (y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16;
  edits[chunk] = [[index, BlockId.DoorClosedLower]];
  assert.throws(() => engine.snapshotAttachmentSourceObservation(asteroid.id), /counterpart/);
  edits[chunk].push([index + 256, BlockId.DoorClosedUpper]);
  const source = engine.snapshotAttachmentSourceObservation(asteroid.id);
  assert.equal(source.architecture.installations.length, 1);
  assert.equal(source.architecture.installations[0].cells.length, 2);
  assert.equal(source.architecture.installations[0].attached, true);
  edits[chunk][1][1] = BlockId.DoorOpenUpper;
  assert.throws(() => engine.snapshotAttachmentSourceObservation(asteroid.id), /counterpart/);
});

test("actual full scoped source observes remote history before physical selection and rechecks every authority input", async () => {
  const { engine, asteroid, pressure, edits } = fixture(), universe = universeId("runtime-complete-source");
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
  const physicalFields = { generatorVersion: 18, generatorProfile: "world-below-v15", seed: "source-fixture", edits: {} };
  const repository = { snapshot: { manifest, universe: { fields: { asteroidFields: engine.asteroidFields } },
    players: [{ playerId: "host", locationId: orbit, fields: { inventory: [] } }], locations: [
      { descriptor: { id: orbit, universeId: universe, revision: 7 }, fields: { ...physicalFields, furnaces: {}, chests: {} } },
      { descriptor: { id: home, universeId: universe, revision: 2 }, fields: { ...physicalFields, furnaces: {}, chests: {}, primeEncounters: { [anchor]: history } } },
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
  assert.equal(result.waygrid.bindings.length, 0); assert.equal(result.waygrid.ownership.starters.length, 2);
  assert.equal(result.authoredSites.locations.length, 2); assert.deepEqual(result.authoredSites.unresolvedLocations, []);
  const localActorId = engine.snapshotAttachmentActorBodies()[0].id, boatId = "outside-passenger-boat";
  engine.mountedBoatId = boatId;
  engine.boats.set(boatId, { save: { id: boatId, x: asteroid.center.x + 100, y: asteroid.center.y, z: asteroid.center.z,
    yaw: 0, velocity: 0, passengers: [localActorId], inventory: Array.from({ length: 18 }, () => null), ownerId: localActorId },
    group: new THREE.Group() });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /Boat passenger.*boundary/);
  engine.mountedBoatId = null; engine.boats.clear();
  Object.assign(repository.snapshot.locations[0].fields, { boats: [[boatId, {
    id: boatId, x: asteroid.center.x + 100, y: asteroid.center.y, z: asteroid.center.z,
    yaw: 0, velocity: 0, passengers: [localActorId], inventory: Array.from({ length: 18 }, () => null), ownerId: localActorId,
  }]] });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /persisted-only.*boat|unresolved.*boat/i);
  delete (repository.snapshot.locations[0].fields as Record<string, unknown>).boats;
  Object.assign(repository.snapshot.locations[0].fields, { leads: [{ mobId: 999, maximumLength: 7 }] });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /persisted-only.*lead/i);
  delete (repository.snapshot.locations[0].fields as Record<string, unknown>).leads;
  const insideBoat = { id: boatId, x: asteroid.center.x, y: asteroid.center.y, z: asteroid.center.z,
    yaw: 0, velocity: 0, passengers: [], inventory: Array.from({ length: 18 }, () => null), ownerId: localActorId };
  engine.boats.set(boatId, { save: insideBoat, group: new THREE.Group() });
  Object.assign(repository.snapshot.locations[0].fields, { boats: [[boatId, { ...insideBoat, passengers: [localActorId] }]] });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /persisted.*boat.*passenger/i,
    "a matching boat ID cannot suppress a saved passenger link");
  engine.boats.clear(); delete (repository.snapshot.locations[0].fields as Record<string, unknown>).boats;
  const sleeper = { id: 37, specimenId: "same-id-sleeper", specimenOriginLocationId: engine.world.locationScope.locationId,
    kind: "peelop" as const, x: asteroid.center.x, y: asteroid.center.y, z: asteroid.center.z,
    yaw: 0, health: 5, age: 20 };
  engine.sleepingCreatures = [sleeper];
  await assert.doesNotReject(engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    "one current sleeping body with explicit origin remains a valid live source");
  Object.assign(repository.snapshot.locations[0].fields, { sleepingCreatures: [{ ...sleeper, socialGroupId: "saved-group" }] });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /persisted.*creature.*relationship/i,
    "a matching creature ID cannot suppress a saved social group");
  engine.sleepingCreatures = []; delete (repository.snapshot.locations[0].fields as Record<string, unknown>).sleepingCreatures;
  const bee = { id: "free-worker", role: "worker" as const, alive: true, home: false, outbound: true,
    carryingNectar: 2, lastReturnDay: 4, disconnectedDay: null, geneticSeed: 71,
    angry: false, tamed: true, ownerId: "host", storedOrb: null,
    specimenOriginLocationId: engine.world.locationScope.locationId };
  const beeBody = { ...sleeper, kind: "honeybee" as const, apiaryBee: bee };
  engine.sleepingCreatures = [beeBody];
  Object.assign(repository.snapshot.locations[0].fields, { sleepingCreatures: [{ ...beeBody,
    apiaryBee: { ...bee, home: true, outbound: false, carryingNectar: 0,
      lastReturnDay: 3, angry: true } }] });
  await assert.doesNotReject(engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    "normal saved bee care drift must not hide unchanged origin and owner");
  Object.assign(repository.snapshot.locations[0].fields, { sleepingCreatures: [{ ...beeBody,
    apiaryBee: { ...bee, carryingNectar: 4 } }] });
  await assert.doesNotReject(engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    "the canonical nectar maximum is still valid unsaved care drift");
  Object.assign(repository.snapshot.locations[0].fields, { sleepingCreatures: [{ ...beeBody,
    apiaryBee: { ...bee, carryingNectar: 5 } }] });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    /Invalid.*bee|Unresolved.*bee/i,
    "an invalid persisted nectar amount cannot hide behind a valid same-ID live bee");
  Object.assign(repository.snapshot.locations[0].fields, { sleepingCreatures: [{ ...beeBody,
    apiaryBee: { ...bee, ownerId: "outside" } }] });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /persisted.*creature.*relationship/i);
  engine.sleepingCreatures = []; delete (repository.snapshot.locations[0].fields as Record<string, unknown>).sleepingCreatures;
  const roadAnchor = "unique-current-road", roadEvent = { schema: 1 as const, anchorId: roadAnchor,
    kind: "creature-crossing" as const, status: "triggered" as const, triggeredDay: 4, revision: 1 };
  const roadBody = { ...sleeper, kind: "thimbledeer" as const, residentId: `road-event:${roadAnchor}` };
  engine.sleepingCreatures = [roadBody]; engine.roadEvents.set(roadAnchor, roadEvent); engine.guildBook = createGuildBook();
  Object.assign(repository.snapshot.locations[0].fields, { roadEvents: { [roadAnchor]: roadEvent } });
  await assert.doesNotReject(engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    "one actual current road body may bind its uniquely identified location history");
  const remoteRoadBodies = [38, 39].map(id => ({ id, kind: "thimbledeer" as const, x: 0, y: 32, z: 0,
    yaw: 0, health: 5, age: 20, residentId: `road-event:${roadAnchor}` }));
  Object.assign(repository.snapshot.locations[1].fields, { creatures: remoteRoadBodies });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    /Road-event resident differs from its authored spawn history/i,
    "one current body plus two remote copies cannot exceed the two authored crossing deer");
  delete (repository.snapshot.locations[1].fields as Record<string, unknown>).creatures;
  Object.assign(repository.snapshot.locations[0].fields, { roadEvents: { [roadAnchor]: { ...roadEvent, kind: "ambush" } } });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    /Saved current road-event provenance/i, "a saved same-anchor authored kind cannot hide behind live history");
  Object.assign(repository.snapshot.locations[0].fields, { roadEvents: { [roadAnchor]: roadEvent } });
  Object.assign(repository.snapshot.locations[1].fields, { roadEvents: { [roadAnchor]: roadEvent } });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /Ambiguous.*road-event/i,
    "the same anchor in a second location cannot become an inferred history origin");
  engine.roadEvents.clear(); delete (repository.snapshot.locations[0].fields as Record<string, unknown>).roadEvents;
  await assert.doesNotReject(engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    "a unique remote location history can remain shared while its physical body is current");
  engine.roadEvents.set(7 as never, roadEvent);
  assert.throws(() => engine.snapshotAttachmentSourceObservation(asteroid.id), /non-string key/,
    "a raw non-string map key cannot silently become an authored anchor");
  engine.roadEvents.clear();
  delete (repository.snapshot.locations[1].fields as Record<string, unknown>).roadEvents;
  engine.sleepingCreatures = [];
  const companion = { ...sleeper, kind: "burrowbell" as const, residentId: "guild-companion:pella-reedshoe",
    persistentPoiResident: true };
  const recruitBook = recordGuildServiceFlag(createGuildBook(), "waykeeper", "recruit:pella-reedshoe");
  engine.sleepingCreatures = [companion]; engine.guildBook = recruitBook;
  Object.assign(repository.snapshot.players[0].fields, { guildBook: createGuildBook() });
  await assert.doesNotReject(engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    "an unsaved current recruit is sourced from the live current player book");
  Object.assign(repository.snapshot.players[0].fields, { guildBook: recruitBook });
  engine.guildBook = createGuildBook();
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    /Saved guild-companion recruit provenance/i,
    "a persisted player recruit cannot disappear behind the live book");
  engine.guildBook = recruitBook;
  repository.snapshot.players.push({ playerId: "guest", locationId: home, fields: { inventory: [] } });
  Object.assign(repository.snapshot.players[1].fields, { guildBook: recruitBook });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    /Ambiguous guild-companion history/i,
    "two player books cannot claim one companion by position or hired actor");
  repository.snapshot.players.pop();
  Object.assign(repository.snapshot.locations[1].fields, { creatures: [{ ...companion, id: 39, specimenId: "remote-companion-copy" }] });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    /Unresolved canonical guild-companion resident/i,
    "one live companion plus a remote copy exceeds its authored multiplicity");
  delete (repository.snapshot.locations[1].fields as Record<string, unknown>).creatures;
  delete (repository.snapshot.players[0].fields as Record<string, unknown>).guildBook;
  engine.guildBook = createGuildBook(); engine.sleepingCreatures = [];
  const keeperId = engine.localPlayerId(), currentOrigin = engine.world.locationScope.locationId;
  const heldOrb = captureIntoOrb(createEmptyCaptureOrb("current-deployed"), {
    schema: 1, entityId: "current-deployed-specimen", kind: "peelop", health: 5, maxHealth: 7,
    ageTicks: 20, baby: false, temperament: "Gentle", hostile: false, tamed: true,
    ownerId: keeperId, name: null, geneticSeed: 321, command: null,
    custom: { specimenOriginLocationId: currentOrigin },
  }, 42)!;
  const deployedOrb = { ...heldOrb, attunement: { ownerId: keeperId, attunedAt: 50,
    activeEntityId: "37", recalledAt: 0, recallCount: 0, fainted: false } };
  engine.inventory = [captureOrbInventorySlot(value), captureOrbInventorySlot(deployedOrb)];
  engine.sleepingCreatures = [{ ...sleeper, specimenId: "current-deployed-specimen",
    geneticSeed: 321, attunedOrbId: "current-deployed", creatureOwnerId: keeperId }];
  await assert.doesNotReject(engine.snapshotScopedAttachmentUniverseSource(asteroid.id),
    "a deployed orb and its same-side body have a reconciled canonical holder");
  engine.inventory = [captureOrbInventorySlot(value)]; engine.sleepingCreatures = [];
  Object.assign(repository.snapshot.locations[0].fields, { drops: [{ item: Item.RawIron, count: 1,
    x: asteroid.center.x, y: asteroid.center.y, z: asteroid.center.z, age: 0 }] });
  await assert.rejects(() => engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /persisted.*drop.*lineage/i,
    "an old saved drop cannot disappear merely because the live current array is empty");
  delete (repository.snapshot.locations[0].fields as Record<string, unknown>).drops;
  for (const fault of ["inventory", "pressure", "environment", "catalog", "catalogUndefined", "architecture", "effects", "facade", "waygrid", "settlement", "merchant"] as const) {
    const priorInventory = engine.inventory, priorHealth = engine.health, priorCatalog = storage.currentCatalog;
    const oldInstallation = pressure.nextInstallation;
    const priorVault = engine.digitalItemVault;
    mutate = () => {
      if (fault === "inventory") engine.inventory = [];
      if (fault === "pressure") pressure.nextInstallation++;
      if (fault === "environment") engine.health--;
      if (fault === "catalog") storage.currentCatalog = { ...priorCatalog!, catalogVersion: priorCatalog!.catalogVersion + 1 };
      if (fault === "catalogUndefined") Object.assign(storage, { currentCatalog: { ...priorCatalog, rawExtension: undefined } });
      if (fault === "architecture") {
        const { x, y, z } = asteroid.center, cx = Math.floor(x / 16), cz = Math.floor(z / 16);
        const index = (y + 74) * 256 + (z - cz * 16) * 16 + x - cx * 16;
        edits[`${cx},${cz}`] = [[index, BlockId.DoorClosedLower], [index + 256, BlockId.DoorClosedUpper]];
      }
      if (fault === "effects") engine.projectiles.push({} as never);
      if (fault === "facade") Object.assign(engine, { worldStorage: { ...storage } });
      if (fault === "waygrid") engine.digitalItemVault = { ...priorVault, cells: [] };
      if (fault === "settlement") engine.settlements.set("new-site", { schema: 1, id: "new-site", authorityId: "host", revision: 0, recentEventIds: [] } as never);
      if (fault === "merchant") engine.merchants.set("trader", { schema: 1, id: "trader", authorityId: "host", revision: 0, recentEventIds: [], gold: 1 } as never);
    };
    await assert.rejects(engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /changed during repository|active effects/, fault);
    engine.inventory = priorInventory; engine.health = priorHealth; pressure.nextInstallation = oldInstallation;
    engine.digitalItemVault = priorVault;
    engine.settlements.clear(); engine.merchants.clear();
    for (const key of Object.keys(edits)) delete edits[key];
    storage.currentCatalog = priorCatalog; engine.projectiles.length = 0; Object.assign(engine, { worldStorage: storage });
  }
  mutate = null;
  for (const field of ["checkpointPromise", "pendingFieldSurvey", "pendingSpaceArrival", "locationTransitioning", "evaCargoLine"]) {
    Object.assign(engine, { [field]: true }); const prior: number = reads;
    await assert.rejects(engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /pending world\/cargo/); assert.equal(reads, prior);
    Object.assign(engine, { [field]: null });
  }
  const types = [BlockId.WaygridVaultTerminal, BlockId.WaygridCreatureArchive, BlockId.WaygridCellI, BlockId.WaygridCellII, BlockId.WaygridCellIII];
  const changes = types.map((after, index) => ({ x: asteroid.center.x + index, y: asteroid.center.y + 10,
    z: asteroid.center.z, before: BlockId.Air, after }));
  const plan = prepareWaygridCapacity(orbit, engine.digitalItemVault, engine.digitalCreatureArchive, changes);
  for (const { x, y, z, after } of changes) {
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    (edits[`${cx},${cz}`] ??= []).push([(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, after]);
  }
  engine.digitalItemVault = plan.vault; engine.digitalCreatureArchive = plan.archive;
  const installed = await engine.snapshotScopedAttachmentUniverseSource(asteroid.id);
  assert.equal(installed.waygrid.bindings.length, 5); assert(installed.waygrid.bindings.every(row => row.side === "attached"));
  engine.digitalItemVault = createDigitalItemVault();
  await assert.rejects(engine.snapshotScopedAttachmentUniverseSource(asteroid.id), /registrations disagree|registration/);
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
