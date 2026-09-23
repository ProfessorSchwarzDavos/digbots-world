import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { bodyEnvironment } from "../app/game/celestial-environment";
import { createDigitalCreatureArchive, createDigitalItemVault } from "../app/game/digital-storage";
import { BlockId } from "../app/game/data";
import { VoxelEngine } from "../app/game/engine";
import { PressureRuntime } from "../app/game/pressure-runtime";
import { createWaystarCatalog } from "../app/game/celestial-catalog";
import { CHUNK_SIZE, ChunkWorld } from "../app/game/world";
import { emptyAuthoredSiteFixture } from "./empty-authored-site-fixtures";

const additionalMaps = ["saplings", "veinRegrowth", "roadEvents", "golemForges", "alchemyStands", "distilleries", "sugarworks",
  "archiveShelves", "tomeDisplays", "settlements", "merchants", "liquidCells", "ecologySectors", "multiplayerPlayerProgressions",
  "multiplayerPlayerWallets", "rangedLoaded", "tidemendSites", "leadAnchors", "contextualLootContainers", "persistentMachineLastStep",
  "apiaryFlowerCache", "socialMotions", "celestialCreatureVelocity", "multiplayerBoatInputs", "capturePacification"] as const;

function engineFixture(world: ChunkWorld, f: ReturnType<typeof emptyAuthoredSiteFixture>) {
  const names = [...additionalMaps, "furnaces", "wheatMills", "wayworks", "chests", "boats", "orbRacks", "healingStations",
    "morphLooms", "multiplayerPlayerStates", "apiaries", "aquariums", "fieldPerches", "temporarySummons", "primeEncounters",
    "legendaryEncounters", "agentBuildJobs", "agentBuildPreviews", "agentRuntimeTasks", "agentInventories", "agentEquipment",
    "agentReturningMaterials", "agentInventoryRevisions", "remotePlayers", "creatureMountSeats", "temporarySpellBlocks"];
  const maps = Object.fromEntries(names.map(name => [name, new Map()]));
  const engine = Object.assign(Object.create(VoxelEngine.prototype), maps, {
    multiplayer: null, persistenceRevision: 11, inventory: [], cursor: null, trash: null, craftGrid: [],
    equipment: { head: null, chest: null, legs: null, feet: null, back: null }, offhand: null,
    digitalItemVault: createDigitalItemVault(), digitalCreatureArchive: createDigitalCreatureArchive(),
    spacefleet: { schema: 1, vehicles: {} }, drops: [], mobs: [], sleepingCreatures: [], mountedBoatId: null,
    mountedCreatureId: null, mountedCreatureSeat: null, position: new THREE.Vector3(), spawn: new THREE.Vector3(0, 32, 0),
    yaw: 0, pitch: 0, velocity: new THREE.Vector3(), playerVariant: "male", crouching: false, creativeFlying: false,
    agentAuthority: { list: () => [] }, orbitalStations: null,
    worldStorage: { currentStamp: world.locationScope, currentManifest: f.repository.snapshot.manifest,
      currentCatalog: f.repository.snapshot.catalog, snapshotAttachmentSource: async () => f.repository },
    asteroidFields: { schema: 1, fields: { [world.locationScope.locationId]: f.live.world.registry } },
    world, bodyContext: () => { throw Error("No mutable body cache"); }, serialize: () => { throw Error("No mutating serialization"); },
    saveSoon: () => { throw Error("No persistence"); }, advanceUniverseClock: () => { throw Error("No clock reconciliation"); },
    fastTravelChannel: null, rangedReloadItem: null, fallingTrees: [], projectiles: [], dragonEffects: [], activeSpellFields: [],
    playerCombatStatuses: [], stormstepDashSeconds: 0, liquidSimulator: { pendingCount: 0 }, acquiredLootUniqueIds: new Set(),
    activatedStructureMarkers: new Set(), mode: "survival", health: 10, hunger: 10, selected: 0, xp: 0, level: 1,
    day: 1, worldTime: .2, weather: "clear", weatherState: { kind: "clear" }, saveExtensions: {}, worldOptions: f.live.options,
    bestiary: {}, lifeSupportState: {},
  }) as VoxelEngine;
  const catalog = createWaystarCatalog(), body = catalog.bodies.find(value => value.id === "blockwild")!;
  engine.pressureRuntime = new PressureRuntime({ locationId: world.locationScope.locationId, generation: 3, minY: -64, maxY: 127,
    blockAt: point => world.getBlock(point.x, point.y, point.z), skyTopAt: (x, z) => world.skyTopAt(x, z), loadedColumns: () => [],
    machines: engine.wayworks, environment: () => bodyEnvironment(body, "orbit"), daylight: () => 0, occupants: () => [],
    obstructed: () => false, actorStillHolding: () => false, changed: () => undefined, alarm: () => undefined });
  return engine;
}

function generateLightCoverage(world: ChunkWorld, point: Readonly<{ x: number; y: number; z: number }>) {
  const radius = 15;
  for (let cx = Math.floor((point.x - radius) / CHUNK_SIZE); cx <= Math.floor((point.x + radius) / CHUNK_SIZE); cx += 1)
    for (let cz = Math.floor((point.z - radius) / CHUNK_SIZE); cz <= Math.floor((point.z + radius) / CHUNK_SIZE); cz += 1)
      world.generateChunk(cx, cz);
}

test("scoped attachment environment binds live light, fluid and pressure sources across repository await", async () => {
  const f = emptyAuthoredSiteFixture("r18-environment-live-light");
  const { world } = f, asteroidId = f.live.frame.asteroidId;
  const body = f.repository.snapshot.catalog.bodies.find(value => value.id === "blockwild")!;
  const localPoint = { x: 20, y: 32, z: 20 };
  const orbitPoint = { x: localPoint.x + f.live.frame.offset.x, y: localPoint.y + f.live.frame.offset.y,
    z: localPoint.z + f.live.frame.offset.z };
  const engine = engineFixture(world, f);
  try {
    assert.equal(world.captureGameplayLight([orbitPoint]), undefined, "missing loaded light coverage stays unknown");
    generateLightCoverage(world, orbitPoint);
    const capturedLight = world.captureGameplayLight([orbitPoint]);
    assert(capturedLight, "real ChunkWorld coverage should be ready after synchronous generation");
    const lightValue = capturedLight.gameplayLightAt(orbitPoint, 1);
    assert.notEqual(lightValue, undefined);
    const pressure = engine.pressureRuntime!;
    const ambient = bodyEnvironment(body, "orbit");
    const pressureBefore = JSON.stringify(pressure.snapshotAttachmentSource());
    assert.deepEqual(pressure.attachmentEnvironmentAt({ x: orbitPoint.x + 1000, y: orbitPoint.y, z: orbitPoint.z }, ambient),
      { kind: "unknown" }, "unloaded topology is not known ambient pressure");
    const skyTop = world.skyTopAt(orbitPoint.x, orbitPoint.z);
    assert.notEqual(skyTop, undefined);
    const exteriorPoint = { ...orbitPoint, y: skyTop! + 2 };
    assert.equal(pressure.attachmentEnvironmentAt(exteriorPoint, ambient).kind, "exterior");
    assert.equal(JSON.stringify(pressure.snapshotAttachmentSource()), pressureBefore,
      "read-only pressure inspection must not warm the captured roof cache");
    const chunkX = Math.floor(orbitPoint.x / CHUNK_SIZE), chunkZ = Math.floor(orbitPoint.z / CHUNK_SIZE);
    const chunkKey = `${chunkX},${chunkZ}`, originalChunk = world.chunks.get(chunkKey);
    assert(originalChunk, "the declared light point must have a concrete chunk owner");
    const observationBefore = JSON.stringify(engine.snapshotAttachmentSourceObservation(asteroidId));
    let replacement: typeof originalChunk | null = null;
    Object.assign(engine.worldStorage!, { snapshotAttachmentSource: async () => {
      await Promise.resolve();
      const current = world.chunks.get(chunkKey)!;
      world.chunks.delete(chunkKey);
      current.group.removeFromParent();
      replacement = world.generateChunk(chunkX, chunkZ);
      assert.notEqual(replacement, originalChunk, "the same coordinate now has a new real Chunk object");
      assert.equal(JSON.stringify(engine.snapshotAttachmentSourceObservation(asteroidId)), observationBefore,
        "the existing serialized runtime preimage does not describe derived chunk incarnation");
      const nextLight = world.captureGameplayLight([orbitPoint]);
      assert(nextLight, "equivalent regenerated light coverage remains available");
      assert.equal(nextLight.gameplayLightAt(orbitPoint, 1), lightValue, "the value is unchanged while its owner changes");
      assert.equal(capturedLight.isCurrent(), false, "the real light witness detects same-key owner replacement");
      return f.repository;
    } });

    await assert.rejects(engine.snapshotScopedAttachmentUniverseSource(asteroidId, [localPoint]),
      /changed during repository observation|light|environment/i);
    assert(replacement);

    Object.assign(engine.worldStorage!, { snapshotAttachmentSource: async () => f.repository });
    const joined = await engine.snapshotScopedAttachmentUniverseSource(asteroidId, [localPoint]);
    assert(joined.environment, "a declared light read set has a bound environment source");
    const currentLight = world.captureGameplayLight([orbitPoint]);
    assert(currentLight, "the ready point remains available after the replacement");
    assert.deepEqual(joined.environment.light.source, currentLight.source);
    assert.deepEqual(joined.environment.light.readings, [{ point: localPoint,
      value: currentLight.gameplayLightAt(orbitPoint, 1) }]);
    assert.equal(typeof joined.environment.sourceBaseline, "string");
    assert.equal(joined.environment.samples.length, 1);
    assert.deepEqual(joined.environment.samples[0].point, localPoint);
    assert.equal(joined.environment.samples[0].trackedLiquid, null);
    assert.equal(typeof joined.environment.samples[0].skyTopAt, "number");
    assert.deepEqual(joined.environment.pressure.readings, [{ point: localPoint,
      value: pressure.attachmentEnvironmentAt(orbitPoint, ambient) }]);
    assert.deepEqual(joined.environment.pressure.source, pressure.snapshotAttachmentSource());

    world.setBlock(orbitPoint.x, orbitPoint.y, orbitPoint.z, BlockId.Water);
    const liquidKey = `${orbitPoint.x},${orbitPoint.y},${orbitPoint.z}`;
    engine.liquidCells.set(liquidKey, { kind: "water", level: 4, source: false, falling: false });
    Object.assign(engine.worldStorage!, { snapshotAttachmentSource: async () => {
      engine.liquidCells.set(liquidKey, { kind: "water", level: 5, source: false, falling: false });
      return f.repository;
    } });
    await assert.rejects(engine.snapshotScopedAttachmentUniverseSource(asteroidId), /changed during repository observation/,
      "a valid flowing-liquid level change must invalidate the async source");
    Object.assign(engine.worldStorage!, { snapshotAttachmentSource: async () => {
      pressure.boundary.admitted.oxygenMilliMoles++;
      return f.repository;
    } });
    await assert.rejects(engine.snapshotScopedAttachmentUniverseSource(asteroidId), /changed during repository observation/,
      "the real pressure authority must also invalidate the async source");
  } finally { world.dispose(); }
});

test("production bodyContext pressure callback is not an attachment ambient authority", async () => {
  const f = emptyAuthoredSiteFixture("r18-pressure-ambient-cache");
  const { world } = f, engine = engineFixture(world, f);
  const catalog = f.repository.snapshot.catalog, body = catalog.bodies.find(value => value.id === "blockwild")!;
  const canonicalAmbient = bodyEnvironment(body, "orbit");
  const bodyContext = (VoxelEngine.prototype as unknown as { bodyContext(this: VoxelEngine): {
    environment: typeof canonicalAmbient } }).bodyContext;
  const pressure = engine.pressureRuntime!;
  pressure.host.environment = () => bodyContext.call(engine).environment;
  try {
    const point = { x: f.live.frame.offset.x + 20, y: 100, z: f.live.frame.offset.z + 20 };
    generateLightCoverage(world, point);
    const top = world.skyTopAt(point.x, point.z);
    assert.notEqual(top, undefined);
    const exterior = { ...point, y: top! + 2 };
    const before = engine as unknown as { celestialContextCache?: unknown; celestialSample?: unknown };
    const cacheBefore = before.celestialContextCache, sampleBefore = before.celestialSample;
    assert.deepEqual(pressure.attachmentEnvironmentAt(exterior, canonicalAmbient),
      { kind: "exterior", environment: canonicalAmbient });
    assert.equal(before.celestialContextCache === cacheBefore, true,
      "attachment inspection must not warm production bodyContext");
    assert.equal(before.celestialSample, sampleBefore, "attachment inspection must not clear the sky sample");
    const stale = bodyContext.call(engine);
    Object.assign(stale, { environment: { ...canonicalAmbient, pressureKPa: -999 } });
    assert.deepEqual(pressure.attachmentEnvironmentAt(exterior, canonicalAmbient),
      { kind: "exterior", environment: canonicalAmbient }, "matching catalog identity cannot authorize stale cached ambient");
    const local = { x: exterior.x - f.live.frame.offset.x, y: exterior.y - f.live.frame.offset.y,
      z: exterior.z - f.live.frame.offset.z };
    const joined = await engine.snapshotScopedAttachmentUniverseSource(f.live.frame.asteroidId, [local]);
    assert.deepEqual(joined.environment?.pressure.readings, [{ point: local,
      value: { kind: "exterior", environment: canonicalAmbient } }]);
    assert.equal(before.celestialContextCache, stale, "scoped inspection must leave stale gameplay cache untouched");
    assert.deepEqual(pressure.attachmentEnvironmentAt({ ...exterior, x: exterior.x + 1000 }, canonicalAmbient),
      { kind: "unknown" });
    Object.assign(engine.worldStorage!, { snapshotAttachmentSource: async () => {
      pressure.boundary.admitted.oxygenMilliMoles++;
      return f.repository;
    } });
    await assert.rejects(engine.snapshotScopedAttachmentUniverseSource(f.live.frame.asteroidId, [local]),
      /changed during repository observation/, "production-wired pressure source changes must invalidate the async read");
  } finally { world.dispose(); }
});
