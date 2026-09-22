import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BLOCKS, CREATIVE_ITEMS, TORCH_BLOCKS, BlockId, ITEMS, Item, RECIPES, type InventorySlot } from "../app/game/data.ts";
import { LEGACY_LENS_ORB_ITEMS, LEGACY_SPECIES_ORB_ITEMS } from "../app/game/capture-orbs.ts";
import { homeLocation, locationId, universeId } from "../app/game/location-address.ts";
import {
  DEFAULT_UNARMED_DAMAGE,
  DEFAULT_WORLD_OPTIONS,
  FOOD_USAGE_MULTIPLIER,
  POINTER_LOCK_REACQUIRE_SUPPRESSION_EVENTS,
  POINTER_LOOK_MAX_RADIANS_PER_FRAME,
  POINTER_LOOK_STALE_AFTER_MS,
  VoxelEngine,
  bedCounterpart,
  bedPlacementForYaw,
  bedRespawnCandidates,
  boundLookDeltaForFrame,
  chestModelLayout,
  combatSceneForEncounter,
  findAquaticSpawnColumn,
  findCaveAirY,
  findCaveFloorY,
  fishHabitatForSpawnSite,
  fishHabitatSupportsNaturalPool,
  fishKindForNaturalPool,
  fallDamageForDistance,
  gatePointerLockMovement,
  isInstantBreakBlock,
  initialInventoryForMode,
  migrateSavedWorld,
  mobPopulationCaps,
  naturalMobPopulation,
  nextPeelopBananaShedSeconds,
  nextSleepTransition,
  positionInPlayerViewCone,
  restoreChestStorage,
  regenerationFoodUsage,
  resolveCreativeFlightTap,
  shouldBypassOpenableUse,
  survivalFoodUsagePerSecond,
  torchBlockForPlacement,
  type WorldSave,
} from "../app/game/engine.ts";

test("player fall damage begins only after four blocks", () => {
  assert.equal(fallDamageForDistance(3.99), 0);
  assert.equal(fallDamageForDistance(4), 0);
  assert.equal(fallDamageForDistance(4.01), 1);
  assert.equal(fallDamageForDistance(7.2), 4);
  assert.equal(fallDamageForDistance(99), 6);
});

test("authoritative ground snaps become short monotonic visual step offsets", () => {
  const steppedUp = accumulateGroundStepPresentationOffset(0, 0.5, 1.5);
  assert.equal(steppedUp, -1);
  const firstFrame = stepGroundPresentationOffset(steppedUp, 1 / 60);
  assert.ok(firstFrame > steppedUp && firstFrame < 0);
  let settled = firstFrame;
  for (let frame = 0; frame < 14; frame += 1) settled = stepGroundPresentationOffset(settled, 1 / 60);
  assert.equal(settled, 0);
  assert.equal(accumulateGroundStepPresentationOffset(0, 1.5, 0.5), 1);
  assert.equal(accumulateGroundStepPresentationOffset(0.4, 0.5, 3.5), 0);
});

test("Giant Mooncaps keep full collision while rendering an inset stem", () => {
  assert.equal(BLOCKS[BlockId.MushroomCap].solid, true);
  assert.equal(BLOCKS[BlockId.MushroomCap].shape, "mooncap");
  assert.equal(BLOCKS[BlockId.MushroomCap].lightDampening, 15);
});
import { harvestPlant } from "../app/game/farming.ts";
import { CHEST_VISUAL, chestLatchCenters } from "../app/game/chest-model.ts";
import { ChunkWorld, BIOME_NAMES, BiomeId, CHUNK_SIZE, FLOWING_WATER_LEVEL_INSET, GENERATOR_VERSION, GLASS_OPACITY, LIQUID_SURFACE_INSET, MAX_Y, MIN_Y, PACKED_VERTEX_COLOR_RANGE, RADIAL_STREAMING_DISTANCE_THRESHOLD, SECTION_HEIGHT, WORLD_HEIGHT, blockIndex, chunkAabbRadialDistanceSquared, chunkKey, chunkWithinDirectionalStreamingWindow, chunkWithinStreamingRadius, chunksWithinStreamingRadius, liquidSurfaceInsetForCell, splitCoordinate } from "../app/game/world.ts";
import { MOB_DEFS, MOB_ORDER } from "../app/game/mobs.ts";
import { accumulateGroundStepPresentationOffset, stepGroundPresentationOffset } from "../app/game/creature-pathing.ts";
import { createHeldToolSpec, createRidgebackSpec, createZombieSpec, INSPECTOR_MODEL_SPECS, RIDGEBACK_GROUND_LIFT } from "../app/game/model-specs.ts";

test("chunk coordinates remain correct across negative boundaries", () => {
  assert.equal(MIN_Y, -64);
  assert.equal(WORLD_HEIGHT, 192);
  const cases = [
    [-17, -2, 15],
    [-16, -1, 0],
    [-1, -1, 15],
    [0, 0, 0],
    [15, 0, 15],
    [16, 1, 0],
  ];
  for (const [value, expectedChunk, expectedLocal] of cases) {
    assert.deepEqual(splitCoordinate(value), { chunk: expectedChunk, local: expectedLocal });
  }
});

test("survival food expenditure is doubled for travel and regeneration", () => {
  assert.equal(FOOD_USAGE_MULTIPLIER, 2);
  assert.equal(survivalFoodUsagePerSecond(false), 0.0048);
  assert.equal(survivalFoodUsagePerSecond(true), 0.018);
  assert.equal(survivalFoodUsagePerSecond(true, 0.5, 2), 0.0045);
  assert.equal(regenerationFoodUsage(), 0.7);
  assert.equal(regenerationFoodUsage(2), 0.35);
});

test("pointer-lock reacquisition discards browser recenter deltas without replaying them", () => {
  let remaining = POINTER_LOCK_REACQUIRE_SUPPRESSION_EVENTS;
  for (let index = 0; index < POINTER_LOCK_REACQUIRE_SUPPRESSION_EVENTS; index += 1) {
    const gated = gatePointerLockMovement(800, -600, remaining);
    assert.equal(gated.apply, false);
    assert.equal(gated.reason, "reacquire");
    remaining = gated.remainingSuppressedEvents;
  }

  assert.equal(remaining, 0);
  assert.deepEqual(gatePointerLockMovement(4, -3, remaining), {
    apply: true,
    remainingSuppressedEvents: 0,
    reason: "accepted",
  });
  assert.equal(gatePointerLockMovement(Number.NaN, 4, remaining).reason, "invalid");
});

test("pointer look rejects input queued during a stalled frame", () => {
  assert.equal(
    gatePointerLockMovement(20, 0, 0, { eventAgeMs: POINTER_LOOK_STALE_AFTER_MS + 1 }).reason,
    "stale",
  );
  assert.equal(
    gatePointerLockMovement(20, 0, 0, { frameAgeMs: POINTER_LOOK_STALE_AFTER_MS + 1 }).reason,
    "stale",
  );
  assert.equal(
    gatePointerLockMovement(20, 0, 0, {
      eventAgeMs: POINTER_LOOK_STALE_AFTER_MS,
      frameAgeMs: POINTER_LOOK_STALE_AFTER_MS,
    }).reason,
    "accepted",
  );
});

test("pointer and touch look cannot rotate farther than the per-frame camera budget", () => {
  const sensitivity = 0.002;
  const ordinary = boundLookDeltaForFrame(4, -3, sensitivity);
  assert.deepEqual(ordinary, { deltaX: 4, deltaY: -3, totalX: 4, totalY: -3, clamped: false });

  const huge = boundLookDeltaForFrame(2_000, 2_000, sensitivity);
  assert.equal(huge.clamped, true);
  assert.ok(
    Math.hypot(huge.totalX, huge.totalY) * sensitivity <= POINTER_LOOK_MAX_RADIANS_PER_FRAME + 1e-12,
  );

  const sameFrame = boundLookDeltaForFrame(
    2_000,
    0,
    sensitivity,
    huge.totalX,
    huge.totalY,
  );
  assert.ok(
    Math.hypot(sameFrame.totalX, sameFrame.totalY) * sensitivity <= POINTER_LOOK_MAX_RADIANS_PER_FRAME + 1e-12,
  );

  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    settings: { sensitivity },
    yaw: 0,
    pitch: 0,
    lookDeltaXThisFrame: 0,
    lookDeltaYThisFrame: 0,
  });
  engine.look(4_000, -3_000);
  engine.look(4_000, -3_000);
  assert.ok(Math.hypot(engine.yaw, engine.pitch) <= POINTER_LOOK_MAX_RADIANS_PER_FRAME + 1e-12);
  engine.resetLookFrameBudget();
  const priorYaw = engine.yaw;
  engine.look(4, 0);
  assert.equal(engine.yaw, priorYaw - 4 * sensitivity);
});

test("tree and aquatic growth schedules use the same fivefold plant pace", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.saplings = new Map();
  engine.world = { getBlock: () => BlockId.Sand, seedText: "SHELLFRUIT-SCHEDULE" } as unknown as VoxelEngine["world"];
  const now = Date.now();
  engine.schedulePlantGrowth(3, 40, 5, BlockId.WildwoodSapling);
  const treeDelay = (engine.saplings.get("3,40,5") ?? 0) - now;
  assert.ok(treeDelay >= 375_000 && treeDelay <= 750_100, `tree delay was ${treeDelay}ms`);

  engine.schedulePlantGrowth(4, 20, 6, BlockId.GlowKelp);
  const aquaticDelay = (engine.saplings.get("4,20,6") ?? 0) - now;
  assert.ok(aquaticDelay >= 250_000 && aquaticDelay <= 600_100, `aquatic delay was ${aquaticDelay}ms`);

  engine.schedulePlantGrowth(5, 18, 7, BlockId.ShellfruitSprout);
  const shellfruitDelay = (engine.saplings.get("5,18,7") ?? 0) - now;
  assert.ok(shellfruitDelay >= 289_000 && shellfruitDelay <= 417_000, `Shellfruit stage delay was ${shellfruitDelay}ms`);
});

test("world generation is deterministic and seed-sensitive", () => {
  const first = new ChunkWorld();
  const second = new ChunkWorld();
  const third = new ChunkWorld();
  first.reset("SAME-SEED");
  second.reset("SAME-SEED");
  third.reset("DIFFERENT-SEED");
  const a = first.generateChunk(-2, 3).blocks;
  const b = second.generateChunk(-2, 3).blocks;
  const c = third.generateChunk(-2, 3).blocks;
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  first.dispose();
  second.dispose();
  third.dispose();
});

test("resumable chunk generation and lighting are bit-exact", () => {
  const synchronous = new ChunkWorld();
  const resumable = new ChunkWorld();
  synchronous.reset("STREAMING-PARITY", undefined, { structures: false });
  resumable.reset("STREAMING-PARITY", undefined, { structures: false });
  const expected = synchronous.generateChunk(0, 0);
  resumable.playerChunkX = 0;
  resumable.playerChunkZ = 0;
  resumable.generationQueue = [{ cx: 0, cz: 0, distance: 0 }];
  resumable.generationQueued = new Set([chunkKey(0, 0)]);
  let generationSlices = 0;
  while (!resumable.chunks.has(chunkKey(0, 0))) {
    assert.equal(resumable.processGenerationSlice(), true);
    generationSlices += 1;
    assert.ok(generationSlices < 100, "resumable generation must converge");
  }
  const actual = resumable.chunks.get(chunkKey(0, 0))!;
  let lightingSlices = 0;
  while (!actual.lightInitialized) {
    assert.equal(resumable.processLightInitialization(), true);
    lightingSlices += 1;
    assert.ok(lightingSlices < 10_000, "resumable lighting must converge");
  }
  assert.ok(generationSlices > 8, "terrain and finalization must yield across frames");
  assert.ok(lightingSlices > 1, "lighting must yield across frames");
  assert.equal(
    resumable.lightSectionQueued.size,
    0,
    "a full resumable relight must not publish partially propagated light to visible section attributes",
  );
  assert.deepEqual(actual.blocks, expected.blocks);
  assert.deepEqual(actual.heightmap, expected.heightmap);
  assert.deepEqual(actual.biomes, expected.biomes);
  assert.deepEqual(actual.light, expected.light);
  synchronous.dispose();
  resumable.dispose();
});

test("resumable meshing preserves every packed geometry buffer", () => {
  const synchronous = new ChunkWorld();
  const resumable = new ChunkWorld();
  synchronous.reset("MESH-SLICE-PARITY", undefined, { structures: false });
  resumable.reset("MESH-SLICE-PARITY", undefined, { structures: false });
  const expectedChunk = synchronous.generateChunk(0, 0);
  const actualChunk = resumable.generateChunk(0, 0);
  const section = expectedChunk.sectionBlockCounts.findIndex((count) => count > 0);
  assert.ok(section >= 0);
  synchronous.rebuildSection(expectedChunk, section);
  resumable.queueMesh(actualChunk.key, section);
  let slices = 0;
  while (resumable.processMesh()) {
    slices += 1;
    if (resumable.queuedCount === 0) break;
    assert.ok(slices < 20, "resumable meshing must converge");
  }
  assert.ok(slices >= 16, "a 16-column section must be built one bounded column at a time");
  const expectedMeshes = expectedChunk.sections.get(section)!;
  const actualMeshes = actualChunk.sections.get(section)!;
  for (const layer of ["opaque", "cutout", "transparent", "glass", "emissive"] as const) {
    const expected = expectedMeshes[layer]?.geometry;
    const actual = actualMeshes[layer]?.geometry;
    assert.equal(Boolean(actual), Boolean(expected), `${layer} presence differs`);
    if (!expected || !actual) continue;
    assert.deepEqual(Array.from(actual.index?.array ?? []), Array.from(expected.index?.array ?? []), `${layer} indices differ`);
    for (const attribute of ["position", "normal", "color", "voxelLight", "voxelEmission", "voxelOcclusion", "uv"] as const) {
      assert.deepEqual(Array.from(actual.getAttribute(attribute).array), Array.from(expected.getAttribute(attribute).array), `${layer}.${attribute} differs`);
    }
  }
  synchronous.dispose();
  resumable.dispose();
});

test("the hard streaming budget rotates priority instead of starving queues", () => {
  const world = new ChunkWorld();
  world.reset("STREAMING-FAIRNESS", undefined, { structures: false });
  world.playerChunkX = 0;
  world.playerChunkZ = 0;
  world.scheduledViewSector = world.streamingViewSector;
  const playerChunk = world.generateChunk(0, 0);
  for (const section of [3, 4]) if (playerChunk.sectionBlockCounts[section] > 0) world.rebuildSection(playerChunk, section);
  world.streamingFrameBudgetMilliseconds = 0;
  world.generationWorkPerFrame = 1;
  world.meshWorkPerFrame = 1;
  world.lightSectionQueued.add("fixture:0");
  const order: string[] = [];
  world.processGenerationSlice = (() => { order.push("generation"); return true; }) as typeof world.processGenerationSlice;
  world.processLightInitialization = (() => { order.push("initial-light"); return true; }) as typeof world.processLightInitialization;
  world.processLightSection = (() => { order.push("relight"); }) as typeof world.processLightSection;
  world.processMesh = (() => { order.push("mesh"); return true; }) as typeof world.processMesh;
  for (let frame = 0; frame < 4; frame += 1) world.update(0, 0);
  assert.deepEqual(order, ["initial-light", "relight", "mesh", "generation"]);
  world.dispose();
});

test("streaming preempts resumable generation and lighting for the player chunk", () => {
  const generationWorld = new ChunkWorld();
  generationWorld.reset("PLAYER-FIRST-GENERATION", undefined, { structures: false });
  generationWorld.setRenderDistance(2);
  generationWorld.scheduleAround(0, 0, true, 32);
  assert.equal(generationWorld.processGenerationSlice(), true);
  const pausedGeneration = generationWorld.activeGenerationTask;
  assert.equal(pausedGeneration?.key, chunkKey(0, 0));
  generationWorld.scheduleAround(CHUNK_SIZE, 0, true, 32);
  assert.equal(generationWorld.activeGenerationTask, null, "crossing into a missing chunk must pause older terrain work");
  assert.equal(generationWorld.generationTasks.get(chunkKey(0, 0)), pausedGeneration, "partial deterministic terrain work is retained");
  assert.equal(generationWorld.processGenerationSlice(), true);
  assert.equal((generationWorld.activeGenerationTask as { key: string } | null)?.key, chunkKey(1, 0), "the occupied chunk starts before retained neighbors");
  generationWorld.dispose();

  const lightingWorld = new ChunkWorld();
  lightingWorld.reset("PLAYER-FIRST-LIGHTING", undefined, { structures: false });
  lightingWorld.setRenderDistance(2);
  const near = lightingWorld.generateChunk(0, 0);
  const far = lightingWorld.generateChunk(1, 0);
  for (const chunk of [near, far]) {
    chunk.light.fill(0);
    chunk.lightInitialized = false;
  }
  lightingWorld.scheduleAround(CHUNK_SIZE, 0, true, 32);
  assert.equal(lightingWorld.processLightInitialization(), true);
  const pausedLighting = lightingWorld.activeLightInitialization?.task;
  assert.equal(lightingWorld.activeLightInitialization?.key, far.key);
  lightingWorld.scheduleAround(0, 0, true, 32);
  assert.equal(lightingWorld.activeLightInitialization, null, "the newly occupied unlit chunk preempts background lighting");
  assert.equal(lightingWorld.lightInitializationTasks.get(far.key), pausedLighting, "partial lighting state is resumable");
  assert.equal(lightingWorld.processLightInitialization(), true);
  assert.equal((lightingWorld.activeLightInitialization as { key: string } | null)?.key, near.key);
  assert.equal(lightingWorld.streamingDiagnostics().playerChunkStage, "lighting");
  let lightingSlices = 1;
  while (!near.lightInitialized || !far.lightInitialized) {
    assert.equal(lightingWorld.processLightInitialization(), true);
    lightingSlices += 1;
    assert.ok(lightingSlices < 20_000, "preempted lighting tasks must converge");
  }
  const lightingReference = new ChunkWorld();
  lightingReference.reset("PLAYER-FIRST-LIGHTING", undefined, { structures: false });
  const expectedNear = lightingReference.generateChunk(0, 0);
  const expectedFar = lightingReference.generateChunk(1, 0);
  assert.deepEqual(near.light, expectedNear.light, "preemption must preserve the near chunk's exact packed light");
  assert.deepEqual(far.light, expectedFar.light, "resuming must preserve the far chunk's exact packed light");
  lightingReference.dispose();
  lightingWorld.dispose();
});

test("mesh selection is player- and height-aware even when nearer work was appended later", () => {
  const world = new ChunkWorld();
  world.reset("PLAYER-FIRST-MESH", undefined, { structures: false });
  const near = world.generateChunk(0, 0);
  const far = world.generateChunk(2, 0);
  const nearSection = near.sectionBlockCounts.findIndex((count) => count > 0);
  const farSection = far.sectionBlockCounts.findIndex((count) => count > 0);
  assert.ok(nearSection >= 0 && farSection >= 0);
  world.playerChunkX = 0;
  world.playerChunkZ = 0;
  world.playerSection = nearSection;
  world.queueMesh(far.key, farSection, true);
  assert.equal(world.streamingDiagnostics().playerChunkStage, "meshing");
  world.streamingFrameBudgetMilliseconds = 0;
  world.update(0, 0, MIN_Y + nearSection * SECTION_HEIGHT + 2);
  assert.equal(world.activeMeshTask?.key, near.key);
  assert.equal(world.activeMeshTask?.section, nearSection);
  world.dispose();
});

test("aquatic habitat resolution accepts real volumes and rejects decorative puddles", () => {
  const blocks = new Map<string, BlockId>();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  for (let x = -1; x <= 1; x += 1) for (let z = -1; z <= 1; z += 1) {
    blocks.set(key(x, 4, z), BlockId.Stone);
    for (let y = 5; y <= 8; y += 1) blocks.set(key(x, y, z), BlockId.Water);
  }
  const fixture = {
    getBlock: (x: number, y: number, z: number) => blocks.get(key(x, y, z)) ?? BlockId.Air,
    isWalkThrough: (type: BlockId | undefined) => type === BlockId.Air,
  };
  assert.deepEqual(findAquaticSpawnColumn(fixture, 0, 0, 7, 0, 12), {
    floorY: 4, bottomY: 5, surfaceY: 8, liquid: "water", neighborCells: 9,
  });
  assert.equal(findCaveFloorY(fixture, 0, 0, 7, 8), null, "a submerged floor is not dry cave footing");
  assert.equal(findCaveAirY(fixture, 0, 0, 7, 8), 9, "dry cave air remains independently discoverable");

  blocks.clear();
  blocks.set(key(0, 4, 0), BlockId.Stone);
  blocks.set(key(0, 5, 0), BlockId.Water);
  assert.equal(findAquaticSpawnColumn(fixture, 0, 0, 5, 0, 10), null, "one-cell water cannot seed wildlife");
  blocks.delete(key(0, 5, 0));
  assert.equal(findCaveFloorY(fixture, 0, 0, 6, 8), 4);
});

test("fish population selection respects habitat, pool, and renewable resource needs", () => {
  assert.equal(fishHabitatForSpawnSite(BiomeId.Glimmerwood, false, "water"), "glimmer-pond");
  assert.equal(fishHabitatForSpawnSite(BiomeId.SugarplumVale, false, "syrup"), "syrup-pond");
  assert.equal(fishHabitatForSpawnSite(BiomeId.Ocean, true, "water"), "underground");
  assert.equal(fishHabitatSupportsNaturalPool("river", "water-ambient"), true);
  assert.equal(fishHabitatSupportsNaturalPool("river", "water-animal"), false);
  for (const roll of [0, 0.27, 0.71, 0.999]) {
    const kind = fishKindForNaturalPool("underground", "cave-water", true, false, Item.RawFish, roll);
    assert.ok(kind);
    assert.ok(MOB_DEFS[kind].drops?.some((drop) => drop.item === Item.RawFish && drop.chance > 0));
  }
});

test("nearby-water spawning works from a shoreline and in a generated Glasswater cavern", () => {
  const surfaceWorld = new ChunkWorld();
  surfaceWorld.reset("WILDERNESS");
  const surfaceEngine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(surfaceEngine, { world: surfaceWorld, naturalSpawnInterestCursor: 0 });
  const shoreline = surfaceWorld.sampleColumn(-1024, -904);
  assert.ok(![BiomeId.DeepOcean, BiomeId.Ocean, BiomeId.River, BiomeId.LumenTrench].includes(shoreline.biome));
  const shoreCandidates = surfaceEngine.naturalAquaticSpawnCandidates({
    id: "shore", x: -1024, y: shoreline.height + 2, z: -904, yaw: 0,
  }, false);
  assert.ok(shoreCandidates.some((candidate) => candidate.habitat === "ocean" && candidate.distance <= 56));
  surfaceWorld.dispose();

  const caveWorld = new ChunkWorld();
  caveWorld.reset("WILDERNESS");
  const caveEngine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(caveEngine, { world: caveWorld, naturalSpawnInterestCursor: 0 });
  const caveCandidates = caveEngine.naturalAquaticSpawnCandidates({
    id: "cave", x: -855, y: -55, z: -354, yaw: 0,
  }, true);
  assert.ok(caveCandidates.length >= 4, "the generated Glasswater cathedral should expose several valid pools");
  assert.ok(caveCandidates.every((candidate) => candidate.underground && candidate.habitat === "underground"));
  assert.ok(caveCandidates.every((candidate) => candidate.column.surfaceY < caveWorld.surfaceAt(candidate.x, candidate.z) - 2));
  caveWorld.dispose();
});

test("the natural spawn loop fills the independent cave-water pool in Glasswater", () => {
  const world = new ChunkWorld();
  world.reset("WILDERNESS");
  const focus = { id: "local", x: -855, y: -55, z: -354, yaw: 0 };
  const spawns: Array<{ kind: string; pool: string; aquatic: boolean; underground: boolean; position: THREE.Vector3 }> = [];
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    world,
    worldOptions: { ...DEFAULT_WORLD_OPTIONS, mobDensity: 1 },
    touchMode: false,
    skyVisibility: 0,
    naturalSpawnInterestCursor: 0,
    worldTime: 0.5,
    weatherState: { kind: "clear" },
    mobs: [],
    ecologyDiagnostics: { attempts: 0, successes: 0, aquaticCandidates: 0, lastSuccess: null, rejections: {} },
    simulationInterestPoints: () => [focus],
    localPlayerId: () => "local",
    naturalPopulationRecords: () => [],
    daylightAmount: () => 0,
    naturalSpawnVisibleToPlayer: () => false,
    ecologyAllowsSpecies: () => true,
    spawnNaturalGroup: (kind: string, position: THREE.Vector3, _maximum: number, pool: string, aquatic: boolean, underground: boolean) => {
      spawns.push({ kind, pool, aquatic, underground, position: position.clone() });
      return [{}];
    },
  });
  engine.trySpawnMob("passive", focus);
  assert.equal(spawns.length, 1);
  assert.equal(spawns[0].pool, "cave-water");
  assert.equal(spawns[0].aquatic, true);
  assert.equal(spawns[0].underground, true);
  assert.ok(spawns[0].position.y < world.surfaceAt(Math.round(spawns[0].position.x), Math.round(spawns[0].position.z)) - 2);
  assert.ok(MOB_DEFS[spawns[0].kind as keyof typeof MOB_DEFS].aquatic);
  world.dispose();
});

test("zero-density worlds skip habitat scans as well as natural population creation", () => {
  const focus = { id: "local", x: 0, y: 32, z: 0, yaw: 0 };
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    world: { celestialTerrain: null },
    worldOptions: { ...DEFAULT_WORLD_OPTIONS, mobDensity: 0 },
    skyVisibility: 1,
    naturalSpawnInterestCursor: 0,
    simulationInterestPoints: () => [focus],
    localPlayerId: () => "local",
    naturalAquaticSpawnCandidates: () => {
      assert.fail("zero-density worlds must not scan aquatic habitat");
    },
  });
  engine.trySpawnMob("passive", focus);
});

test("chunk edits survive unload and deterministic regeneration", () => {
  const world = new ChunkWorld();
  world.reset("EDIT-TEST");
  world.generateChunk(-1, -1);
  world.setBlock(-1, 12, -1, BlockId.Glowstone);
  const edits = world.serializeEdits();
  assert.equal(edits[chunkKey(-1, -1)].length, 1);
  world.reset("EDIT-TEST", edits);
  const regenerated = world.generateChunk(-1, -1);
  assert.equal(regenerated.blocks[blockIndex(15, 12, 15)], BlockId.Glowstone);
  world.dispose();
});

test("engine storm rendering hides the sun, moon, and stars behind a full overcast dome", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 1, 100);
  Object.assign(engine, {
    running: false,
    titleMode: false,
    paused: true,
    worldTime: 0.5,
    day: 2,
    worldOptions: { dayLengthMinutes: 20 },
    weatherState: {
      kind: "thunder",
      cycle: 1,
      elapsedSeconds: 30,
      durationSeconds: 180,
      intensity: 0.9,
      windAngle: 0,
      windSpeed: 5,
    },
    dawnSkyColor: new THREE.Color(),
    skyColor: new THREE.Color(),
    nightSkyColor: new THREE.Color("#11172a"),
    daylightSkyColor: new THREE.Color("#78b9eb"),
    weatherSkyColor: new THREE.Color(),
    camera: new THREE.PerspectiveCamera(),
    scene,
    skyVisibility: 1,
    settings: { renderDistance: 10 },
    hemisphere: new THREE.HemisphereLight(),
    directional: new THREE.DirectionalLight(),
    sun: new THREE.Sprite(),
    moon: new THREE.Sprite(),
    stars: new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ transparent: true, opacity: 1 })),
    celestialDirection: new THREE.Vector3(),
    position: new THREE.Vector3(0, 40, 0),
    weather: "rain",
    combatMusicTimer: 0,
    audio: { setDepth() {}, setMusicScene() {} },
    world: {
      getBlock: () => BlockId.Air,
      biomeAt: () => 3,
    },
  });
  engine.updateDayNight(0);
  assert.equal(engine.sun.visible, false);
  assert.equal(engine.moon.visible, false);
  assert.equal((engine.stars.material as THREE.PointsMaterial).opacity, 0);
  assert.ok((engine.scene.background as THREE.Color).getHex() !== engine.daylightSkyColor.getHex());
});

test("wall torch attachment direction is encoded in the block edit and survives regeneration", () => {
  const target = { x: 4, y: 20, z: 7, placeX: 5, placeY: 20, placeZ: 7 };
  assert.equal(torchBlockForPlacement(target), BlockId.TorchWallEast);
  assert.equal(torchBlockForPlacement({ ...target, placeX: 3 }), BlockId.TorchWallWest);
  assert.equal(torchBlockForPlacement({ ...target, placeX: 4, placeZ: 6 }), BlockId.TorchWallNorth);
  assert.equal(torchBlockForPlacement({ ...target, placeX: 4, placeZ: 8 }), BlockId.TorchWallSouth);
  assert.equal(torchBlockForPlacement({ ...target, placeX: 4, placeY: 21 }), BlockId.Torch);
  assert.equal(torchBlockForPlacement({ ...target, placeX: 4, placeY: 19 }), null);

  const world = new ChunkWorld();
  world.reset("WALL-TORCH-SAVE");
  world.generateChunk(0, 0);
  world.setBlock(5, 20, 7, BlockId.TorchWallEast, true, true);
  const edits = world.serializeEdits();
  assert.deepEqual(edits["0,0"].map((entry) => entry[1]), [BlockId.TorchWallEast]);
  world.reset("WALL-TORCH-SAVE", edits);
  world.generateChunk(0, 0);
  assert.equal(world.getBlock(5, 20, 7), BlockId.TorchWallEast);
  assert.deepEqual(world.lightSourcesNear(5, 20, 7, 1).map((source) => source.type), [BlockId.TorchWallEast]);
  world.dispose();
});

test("empty-bucket raycasts stop on liquids while normal interaction rays still pass through", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  (engine as unknown as { world: { getBlock: (x: number, y: number, z: number) => BlockId } }).world = {
    getBlock: (x, y, z) => x === 1 && y === 0 && z === 0 ? BlockId.Water : x === 2 && y === 0 && z === 0 ? BlockId.Stone : BlockId.Air,
  };
  const origin = new THREE.Vector3(0, 0, 0);
  const direction = new THREE.Vector3(1, 0, 0);
  assert.equal(engine.castVoxel(origin, direction, 6, true)?.type, BlockId.Water);
  assert.equal(engine.castVoxel(origin, direction, 6, false)?.type, BlockId.Stone);
});

test("breaking an orchard support leaf clears and drops its hanging apple", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const edits: Array<{ x: number; y: number; z: number; type: BlockId }> = [];
  const drops: Array<{ type: BlockId; x: number; y: number; z: number }> = [];
  const blocks = new Map<string, BlockId>([["3,19,-2", BlockId.AppleFruit]]);
  (engine as unknown as {
    world: {
      getBlock: (x: number, y: number, z: number) => BlockId;
      setBlock: (x: number, y: number, z: number, type: BlockId) => void;
    };
  }).world = {
    getBlock: (x, y, z) => blocks.get(`${x},${y},${z}`) ?? BlockId.Air,
    setBlock: (x, y, z, type) => { blocks.set(`${x},${y},${z}`, type); },
  };
  engine.mode = "survival";
  engine.breakUnsupportedAbove = () => undefined;
  engine.publishBlockEdits = (next) => { edits.push(...next); };
  engine.dropBlockLoot = (type, x, y, z) => { drops.push({ type, x, y, z }); };
  engine.breakUnsupportedAround(3, 20, -2);
  assert.equal(blocks.get("3,19,-2"), BlockId.Air);
  assert.deepEqual(edits, [{ x: 3, y: 19, z: -2, type: BlockId.Air }]);
  assert.deepEqual(drops, [{ type: BlockId.AppleFruit, x: 3, y: 19, z: -2 }]);
  assert.deepEqual(harvestPlant(BlockId.AppleFruit), { replacement: BlockId.Air, drops: [{ item: Item.Apple, count: 1 }], replanted: false });
});

test("reusable containers preserve stacked inputs and return their empty shells", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const runtime = engine as unknown as {
    mode: "survival";
    selected: number;
    inventory: Array<InventorySlot | null>;
    addItem: (item: number, count: number) => number;
  };
  runtime.mode = "survival";
  runtime.selected = 0;
  runtime.inventory = [{ item: Item.WaterBucket, count: 1 }];
  runtime.addItem = () => 0;
  engine.replaceSelectedUnit(Item.Bucket);
  assert.deepEqual(runtime.inventory[0], { item: Item.Bucket, count: 1 });

  let filledAdded = 0;
  runtime.inventory[0] = { item: Item.Bucket, count: 2 };
  runtime.addItem = (item, count) => {
    if (item === Item.WaterBucket) filledAdded += count;
    return 0;
  };
  engine.replaceSelectedUnit(Item.WaterBucket);
  assert.deepEqual(runtime.inventory[0], { item: Item.Bucket, count: 1 });
  assert.equal(filledAdded, 1);

  let bottlesReturned = 0;
  runtime.inventory[0] = { item: Item.HealthPotion, count: 3 };
  runtime.addItem = (item, count) => {
    if (item === Item.GlassBottle) bottlesReturned += count;
    return 0;
  };
  engine.replaceSelectedUnit(Item.GlassBottle);
  assert.deepEqual(runtime.inventory[0], { item: Item.HealthPotion, count: 2 });
  assert.equal(bottlesReturned, 1);
});

test("bed orientation, counterpart lookup, recipe, and dawn/dusk transitions stay deterministic", () => {
  assert.deepEqual(bedPlacementForYaw(0), { foot: BlockId.BedNorthFoot, head: BlockId.BedNorthHead, dx: 0, dz: -1 });
  assert.deepEqual(bedPlacementForYaw(-Math.PI / 2), { foot: BlockId.BedEastFoot, head: BlockId.BedEastHead, dx: 1, dz: 0 });
  assert.deepEqual(bedCounterpart(BlockId.BedNorthHead, 2, 8, -4), { x: 2, y: 8, z: -3, type: BlockId.BedNorthFoot });
  assert.equal(RECIPES.find((recipe) => recipe.id === "bed")?.output.item, Item.WildwoodBed);
  assert.deepEqual(nextSleepTransition(0.1, 3, "morning"), { worldTime: 0.27, day: 3 });
  assert.deepEqual(nextSleepTransition(0.5, 3, "morning"), { worldTime: 0.27, day: 4 });
  assert.deepEqual(nextSleepTransition(0.5, 3, "night"), { worldTime: 0.77, day: 3 });
  assert.deepEqual(nextSleepTransition(0.9, 3, "night"), { worldTime: 0.77, day: 4 });

  const world = new ChunkWorld();
  world.reset("BED-SAVE");
  world.generateChunk(0, 0);
  world.setBlocksBatch([
    { x: 6, y: 30, z: 6, type: BlockId.BedNorthFoot },
    { x: 6, y: 30, z: 5, type: BlockId.BedNorthHead },
  ], true, true);
  const edits = world.serializeEdits();
  world.reset("BED-SAVE", edits);
  world.generateChunk(0, 0);
  assert.equal(world.getBlock(6, 30, 6), BlockId.BedNorthFoot);
  assert.equal(world.getBlock(6, 30, 5), BlockId.BedNorthHead);
  world.dispose();
});

test("v0.6 interaction policies keep respawns, instant flora, placement bypass, reduced spawn pressure, and combat tracks deterministic", () => {
  const candidates = bedRespawnCandidates(BlockId.BedNorthFoot, 0, 10, 0);
  assert.equal(candidates.some((candidate) => candidate.x === 0 && candidate.z === -1), false, "the head cell is not a respawn candidate");
  assert.ok(candidates.length >= 6);
  assert.equal(isInstantBreakBlock(BlockId.RedFlower), true);
  assert.equal(isInstantBreakBlock(BlockId.AppleFruit), true);
  assert.equal(isInstantBreakBlock(BlockId.Stone), false);
  assert.equal(shouldBypassOpenableUse(true, true, BlockId.Chest), true);
  assert.equal(shouldBypassOpenableUse(false, true, BlockId.Chest), false);
  assert.deepEqual(mobPopulationCaps(22), { total: 22, passive: 15, hostile: 2 });
  assert.equal(positionInPlayerViewCone(0, 0, -10), true);
  assert.equal(positionInPlayerViewCone(0, 0, 10), false);
  assert.equal(DEFAULT_UNARMED_DAMAGE, 1);
  assert.equal(nextPeelopBananaShedSeconds(7, 2), nextPeelopBananaShedSeconds(7, 2));
  assert.ok(nextPeelopBananaShedSeconds(7, 2) >= 135 && nextPeelopBananaShedSeconds(7, 2) <= 210);
  assert.deepEqual([0, 1, 2, 3].map(combatSceneForEncounter), ["combatA", "combatB", "combatA", "combatB"]);

  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.spawn = new THREE.Vector3();
  engine.events = { onToast() {} } as never;
  engine.saveSoon = () => undefined;
  engine.world = {
    locationScope: { locationId: locationId(homeLocation(universeId("bed-respawn-test"))), epoch: 1, revision: 0 },
    getBlock: (x: number, y: number, z: number) => x === 0 && y === 9 && z === 1 ? BlockId.Stone : BlockId.Air,
    isWalkThrough: (type: BlockId) => type === BlockId.Air,
  } as never;
  assert.equal(engine.setRespawnFromBed(0, 10, 0, BlockId.BedNorthFoot), true);
  assert.deepEqual(engine.spawn.toArray(), [0, 9.51, 1]);

  engine.mode = "survival";
  engine.selected = 0;
  engine.inventory = [{ item: Item.Berry, count: 2 }];
  engine.consumeSelectedUnit();
  assert.deepEqual(engine.inventory[0], { item: Item.Berry, count: 1 }, "planting a Moonberry consumes the selected unit");
});

test("persistent town and POI residents never consume the natural wildlife cap", () => {
  const residents = Array.from({ length: 26 }, (_, index) => ({
    hostile: index % 6 === 0,
    persistentPoiResident: true,
  }));
  const wildlife = [
    { hostile: false, persistentPoiResident: false },
    { hostile: false },
    { hostile: true },
  ];
  assert.deepEqual(naturalMobPopulation([...residents, ...wildlife]), { total: 3, passive: 2, hostile: 1 });
  assert.ok(residents.length > mobPopulationCaps(22).total, "one authored town is large enough to reproduce the old cap starvation bug");
  assert.deepEqual(naturalMobPopulation(residents), { total: 0, passive: 0, hostile: 0 });
});

test("line of sight ignores glass but blocks acquisition through opaque full cubes", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  let blocker = BlockId.Stone;
  engine.world = {
    getBlock: (x: number) => x === 2 ? blocker : BlockId.Air,
    isWalkThrough: (type: BlockId) => type === BlockId.Air,
  } as never;
  assert.equal(engine.hasClearLineOfSight(new THREE.Vector3(0, 0, 0), new THREE.Vector3(4, 0, 0)), false);
  blocker = BlockId.Glass;
  assert.equal(engine.hasClearLineOfSight(new THREE.Vector3(0, 0, 0), new THREE.Vector3(4, 0, 0)), true);
});

test("generator-v2 saves migrate their voxel edit indices into the deeper world", () => {
  const legacy = {
    version: 2,
    generatorVersion: 2,
    seed: "LEGACY-WORLD",
    edits: { "0,0": [[8192, BlockId.Glowstone]] },
  } as unknown as WorldSave;
  const migrated = migrateSavedWorld(legacy);
  assert.equal(migrated?.generatorVersion, GENERATOR_VERSION);
  assert.deepEqual(migrated?.edits["0,0"], [[16384, BlockId.Glowstone]], "an old y=0 edit must remain at y=0 after MIN_Y moves from -32 to -64");
});

test("Home climate sampler produces every Home biome and excludes destination-only biomes", () => {
  const world = new ChunkWorld();
  world.reset("BIOME-SAFARI");
  const biomes = new Set<number>();
  for (let index = 0; index < 200_000; index += 1) {
    const x = ((index * 7919) % 200_000) - 100_000;
    const z = ((index * 104729) % 240_000) - 120_000;
    biomes.add(world.sampleColumn(x, z).biome);
  }
  const destinationOnly = new Set([BiomeId.PaleRegolithSea, BiomeId.StarshadowCraters, BiomeId.MoonSlateHighlands,
    BiomeId.IceLanternRilles, BiomeId.BuriedWaystoneGalleries, BiomeId.OrbitalVoid]);
  const homeBiomes = Object.keys(BIOME_NAMES).map(Number).filter(id => !destinationOnly.has(id));
  assert.deepEqual([...biomes].sort((a, b) => a - b), homeBiomes.sort((a, b) => a - b));
  world.dispose();
});

test("the initial 3×3 playable area generates within a bounded budget", () => {
  const world = new ChunkWorld();
  world.reset("PERFORMANCE-CHECK");
  const start = performance.now();
  for (let cx = -1; cx <= 1; cx += 1) for (let cz = -1; cz <= 1; cz += 1) world.generateChunk(cx, cz);
  const elapsed = performance.now() - start;
  assert.equal(world.loadedCount, 9);
  assert.ok(elapsed < 2500, `spawn generation took ${Math.round(elapsed)}ms`);
  world.dispose();
});

test("zombie data, bestiary registration, and shared model orientation stay coherent", () => {
  assert.equal(MOB_ORDER.includes("zombie"), true);
  assert.equal(MOB_DEFS.zombie.hostile, true);
  assert.equal(MOB_DEFS.zombie.health, 10);
  assert.equal(ITEMS[Item.RottenFlesh].name, "Rotten Flesh");
  const zombie = createZombieSpec();
  const semanticParts = new Set(zombie.boxes.map((part) => part.part));
  for (const required of ["body", "head", "leftArm", "rightArm", "leftLeg", "rightLeg"]) assert.equal(semanticParts.has(required), true, `missing ${required}`);
  const head = zombie.boxes.find((part) => part.id === "head")!;
  const eyes = zombie.boxes.filter((part) => part.id.endsWith("eye"));
  assert.ok(eyes.every((eye) => eye.position[2] < head.position[2]), "eyes must sit on the declared local -Z front");
});

test("Ridgeback production and inspection models put every hoof exactly on the block top", () => {
  const spec = createRidgebackSpec();
  assert.equal(INSPECTOR_MODEL_SPECS.some((candidate) => candidate.id === "ridgeback"), true);
  assert.equal(spec.groundY, 0);
  assert.equal(RIDGEBACK_GROUND_LIFT, 0.66);

  const boundsFor = (id?: string) => {
    const boxes = id ? spec.boxes.filter((modelBox) => modelBox.id === id) : spec.boxes;
    const points = boxes.flatMap((modelBox) => {
      const half = modelBox.size.map((value) => value / 2) as [number, number, number];
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(modelBox.rotation ?? [0, 0, 0]), "XYZ"));
      const position = new THREE.Vector3(...modelBox.position);
      return [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => (
        new THREE.Vector3(x * half[0], y * half[1], z * half[2]).applyQuaternion(rotation).add(position)
      ))));
    });
    return new THREE.Box3().setFromPoints(points);
  };

  assert.ok(Math.abs(boundsFor().min.y) < 1e-9, "the canonical Ridgeback must not penetrate its local ground plane");
  for (const contactId of spec.groundContactBoxIds ?? []) {
    assert.ok(Math.abs(boundsFor(contactId).min.y) < 1e-9, `${contactId} must touch local ground Y=0`);
  }

  // findWalkableY reports the supporting solid block's center. With normalized
  // hooves at local Y=0, a +0.5 group offset lands them on its top face.
  assert.equal(MOB_DEFS.ridgeback.footOffset + boundsFor().min.y, 0.5);

  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const visual = engine.createMobVisual("ridgeback", 9001);
  visual.group.updateMatrixWorld(true);
  const productionBounds = new THREE.Box3().setFromObject(visual.visual);
  assert.ok(Math.abs(productionBounds.min.y) < 1e-6, `production Ridgeback hoof plane was ${productionBounds.min.y}`);
  visual.group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.dispose();
  });
});

test("held-tool production specs form connected silhouettes without floating heads", () => {
  for (const kind of ["pickaxe", "axe", "shovel", "sword"] as const) {
    const spec = createHeldToolSpec(kind, "#888");
    const structural = spec.boxes.filter((part) => part.part === "handle" || part.part === "guard" || part.part === "head");
    const connected = new Set([structural[0].id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of structural) {
        if (connected.has(candidate.id)) continue;
        const touches = structural.some((other) => {
          if (!connected.has(other.id)) return false;
          return [0, 1, 2].every((axis) => Math.abs(candidate.position[axis] - other.position[axis]) <= (candidate.size[axis] + other.size[axis]) / 2 + 0.075);
        });
        if (touches) { connected.add(candidate.id); changed = true; }
      }
    }
    assert.equal(connected.size, structural.length, `${kind} contains a visually detached component`);
  }
});

test("spawn search finds dry, walkable land across varied seeds", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.world = new ChunkWorld();
  for (let index = 0; index < 40; index += 1) {
    engine.world.reset(`SPAWN-${index}`);
    const spawn = engine.findSpawn();
    const column = engine.world.sampleColumn(spawn.x, spawn.z);
    assert.ok(column.height > column.waterline + 2, `SPAWN-${index} selected submerged terrain at ${spawn.x},${spawn.z}`);
  }
  engine.world.dispose();
});

test("high-distance chunk AABB windows have exact counts and preserve cardinal and seam halos", () => {
  assert.equal(RADIAL_STREAMING_DISTANCE_THRESHOLD, 12);
  assert.equal(chunksWithinStreamingRadius(10, false), 441, "the default square policy remains unchanged");
  assert.equal(chunksWithinStreamingRadius(12, false), 625, "distance twelve still uses the legacy square policy");
  assert.deepEqual([13, 14, 15, 16].map((radius) => chunksWithinStreamingRadius(radius, true)), [593, 673, 777, 877]);
  assert.deepEqual([13, 14, 15, 16].map((radius) => chunksWithinStreamingRadius(radius + 1, true)), [673, 777, 877, 981], "the generation halo remains one chunk wider");
  assert.deepEqual([13, 14, 15, 16].map((radius) => chunksWithinStreamingRadius(radius + 2, true)), [777, 877, 981, 1093], "the default retention padding remains two chunks wider");

  assert.equal(chunkAabbRadialDistanceSquared(13, 0), 12.5 ** 2);
  assert.equal(chunkWithinStreamingRadius(13, 0, 13, true), true, "the complete cardinal radius must remain visible");
  assert.equal(chunkWithinStreamingRadius(9, 9, 13, true), true, "a diagonal chunk whose AABB reaches the radius remains visible");
  assert.equal(chunkWithinStreamingRadius(10, 10, 13, true), false, "a diagonal AABB wholly beyond the radius is clipped");
  assert.equal(chunkWithinStreamingRadius(10, 10, 10, false), true, "the default-distance corner stays square");

  for (const radius of [13, 14, 15, 16]) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      for (let offsetZ = -radius; offsetZ <= radius; offsetZ += 1) {
        if (!chunkWithinStreamingRadius(offsetX, offsetZ, radius, true)) continue;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          assert.equal(chunkWithinStreamingRadius(offsetX + dx, offsetZ + dz, radius + 1, true), true, `missing ${radius}-chunk seam halo at ${offsetX + dx},${offsetZ + dz}`);
        }
      }
    }
  }
});

test("high-distance generation order re-centers deterministically after a teleport", () => {
  const world = new ChunkWorld();
  world.reset("RADIAL-QUEUE-TELEPORT", undefined, { structures: false });
  world.setRenderDistance(13);
  world.scheduleAround(0, 0, true);
  let expectedDirectionalChunks = 0;
  for (let dx = -14; dx <= 14; dx += 1) for (let dz = -14; dz <= 14; dz += 1) {
    if (chunkWithinDirectionalStreamingWindow(dx, dz, 14, true, 0, 1)) expectedDirectionalChunks += 1;
  }
  assert.equal(world.generationQueue.length, expectedDirectionalChunks);
  assert.equal(world.generationQueued.size, world.generationQueue.length);
  assert.deepEqual(world.generationQueue.at(-1), { cx: 0, cz: 0, distance: 0 }, "generation still starts at the player chunk");
  assert.equal(world.generationQueued.has(chunkKey(14, 0)), true, "the cardinal generation halo is retained");
  assert.equal(world.generationQueued.has(chunkKey(14, 14)), false, "the guaranteed-clipped halo corner is omitted");
  const initialOrder = world.generationQueue.map((entry) => ({ cx: entry.cx, cz: entry.cz, distance: entry.distance }));

  const teleportCx = 100;
  const teleportCz = -100;
  world.scheduleAround(teleportCx * 16, teleportCz * 16, true);
  assert.equal(world.generationQueue.length, expectedDirectionalChunks);
  assert.equal(world.generationQueued.size, world.generationQueue.length);
  assert.ok(world.generationQueue.every((entry) => chunkWithinDirectionalStreamingWindow(
    entry.cx - teleportCx,
    entry.cz - teleportCz,
    14,
    true,
    0,
    1,
  )));
  assert.deepEqual(
    world.generationQueue.map((entry) => ({ cx: entry.cx - teleportCx, cz: entry.cz - teleportCz, distance: entry.distance })),
    initialOrder,
    "relative generation order must not depend on the prior streaming center",
  );
  world.dispose();
});

test("high-distance visibility retains radial edge chunks without meshing clipped diagonals", () => {
  const legacy = new ChunkWorld();
  legacy.reset("DEFAULT-SQUARE-CORNER", undefined, { structures: false });
  legacy.setRenderDistance(10);
  const legacyCorner = legacy.generateChunk(10, 10);
  legacy.scheduleAround(0, 0, true);
  assert.equal(legacyCorner.group.visible, true, "distance ten keeps the established square corner");
  legacy.dispose();

  const world = new ChunkWorld();
  world.reset("RADIAL-VISIBILITY", undefined, { structures: false });
  world.setRenderDistance(13);
  const cardinalEdge = world.generateChunk(13, 0);
  const diagonalEdge = world.generateChunk(9, 9);
  const retainedDiagonal = world.generateChunk(10, 10);
  const cardinalHalo = world.generateChunk(14, 0);
  const clippedCornerKey = world.generateChunk(13, 13).key;
  world.scheduleAround(0, 0, true);

  assert.equal(cardinalEdge.group.visible, true);
  assert.equal(diagonalEdge.group.visible, true);
  assert.equal(retainedDiagonal.group.visible, false);
  assert.equal(cardinalHalo.group.visible, false);
  assert.equal(world.chunks.has(retainedDiagonal.key), true, "the remesh/retention margin remains available");
  assert.equal(world.chunks.has(cardinalHalo.key), true, "the generation halo remains resident but hidden");
  assert.equal(world.chunks.has(clippedCornerKey), false, "a corner beyond even the padded radial window is unloaded");
  assert.equal([...world.meshQueued].some((entry) => entry.startsWith(`${retainedDiagonal.key}:`) || entry.startsWith(`${cardinalHalo.key}:`)), false, "hidden radial chunks must not consume mesh work");
  world.dispose();
});

test("the radial generation halo remeshes its visible cardinal neighbor", () => {
  const world = new ChunkWorld();
  world.reset("RADIAL-REMESH-HALO", undefined, { structures: false });
  world.setRenderDistance(13);
  const visibleEdge = world.generateChunk(13, 0);
  const visibleSection = visibleEdge.sectionBlockCounts.findIndex((count) => count > 0);
  assert.ok(visibleSection >= 0);
  world.rebuildSection(visibleEdge, visibleSection);
  world.scheduleAround(0, 0, true);
  world.generationQueue = [{ cx: 14, cz: 0, distance: 13.5 }];
  world.generationQueued = new Set([chunkKey(14, 0)]);
  world.meshQueue = [];
  world.meshQueueHead = 0;
  world.meshQueued.clear();
  world.urgentMeshQueue = [];
  world.urgentMeshQueueHead = 0;
  world.urgentMeshQueued.clear();

  const halo = world.processGeneration();
  assert.equal(halo?.group.visible, false);
  assert.equal(world.urgentMeshQueued.has(`${visibleEdge.key}:${visibleSection}`), true, "the hidden halo must urgently reconcile its already-rendered seam neighbor");
  assert.equal([...world.urgentMeshQueued].filter((entry) => entry.startsWith(`${visibleEdge.key}:`)).length, 1, "unbuilt sections already see the halo on their first mesh and need no duplicate rebuild");
  assert.equal(world.seamMeshRebuilds.has(`${visibleEdge.key}:${visibleSection}`), true, "the old consolidated boundary must be retired with the replacement section");
  assert.equal([...world.urgentMeshQueued].some((entry) => entry.startsWith(`${halo?.key}:`)), false, "the hidden halo itself must not be meshed");
  world.dispose();
});

test("streaming queues re-center after a long-distance jump", () => {
  const world = new ChunkWorld();
  world.reset("QUEUE-REBASE");
  world.setRenderDistance(2);
  world.scheduleAround(0, 0, true);
  world.scheduleAround(1600, -1600, true);
  assert.ok(world.generationQueue.length > 0);
  assert.ok(world.generationQueue.every((entry) => Math.max(Math.abs(entry.cx - 100), Math.abs(entry.cz + 100)) <= 3));
  assert.equal(world.generationQueued.size, world.generationQueue.length);
  world.dispose();
});

test("streaming skips empty sections, lazily cancels stale mesh work, and keeps the generation halo hidden", () => {
  const world = new ChunkWorld();
  world.reset("STREAMING-BUDGETS");
  world.setRenderDistance(6);
  assert.equal(world.renderDistance, 6);
  world.setRenderDistance(2);
  world.playerChunkX = 0;
  world.playerChunkZ = 0;

  const chunk = world.generateChunk(0, 0);
  const emptySection = chunk.sectionBlockCounts.findIndex((count) => count === 0);
  const occupiedSection = chunk.sectionBlockCounts.findIndex((count) => count > 0);
  assert.ok(emptySection >= 0, "the upper air sections should be tracked without scanning their 4,096 voxels");
  assert.ok(occupiedSection >= 0);
  world.queueMesh(chunk.key, emptySection);
  assert.equal(world.queuedCount, 0, "an untouched empty section should not enter the mesh queue");

  for (let section = 0; section < WORLD_HEIGHT / SECTION_HEIGHT; section += 1) world.rebuildSection(chunk, section);
  let rebuilds = 0;
  const rebuildSection = world.rebuildSection.bind(world);
  world.rebuildSection = ((target, section, slice) => {
    if (!slice || slice.finalize) rebuilds += 1;
    rebuildSection(target, section, slice);
  }) as typeof world.rebuildSection;
  world.queueMesh(chunk.key, occupiedSection);
  world.cancelQueuedMesh(chunk.key, occupiedSection);
  chunk.dirty.delete(occupiedSection); // mirrors the immediate rebuild that consumes a canceled edit
  assert.equal(world.queuedCount, 0, "canceling an edit should be O(1) from the active queue's perspective");
  world.scheduleAround(0, 0, true);
  assert.equal(world.meshQueued.size + world.urgentMeshQueued.size, 0, "re-centering must not resurrect a lazily canceled entry");
  world.generationQueue = [];
  world.generationQueued.clear();
  world.queueMesh(chunk.key, occupiedSection, true);
  for (let index = 0; index < 20 && world.streamingDiagnostics().meshSectionsQueued > 0; index += 1) world.processMesh();
  assert.equal(rebuilds, 1, "the lazily canceled normal entry must not cause a duplicate rebuild");

  const haloKey = chunkKey(3, 0);
  world.generationQueue.push({ cx: 3, cz: 0, distance: 3 });
  world.generationQueued.add(haloKey);
  world.processGeneration();
  const halo = world.chunks.get(haloKey);
  assert.equal(halo?.group.visible, false);
  assert.equal([...world.meshQueued].some((entry) => entry.startsWith(`${haloKey}:`)), false, "prefetched halo chunks should not consume mesh time");
  world.dispose();
});

test("section occupancy and nearby-light indices stay incremental as blocks change", () => {
  const world = new ChunkWorld();
  world.reset("SPATIAL-INDICES");
  const chunk = world.generateChunk(0, 0);
  let airIndex = -1;
  for (let index = chunk.blocks.length - 1; index >= 0; index -= 1) {
    if (chunk.blocks[index] === BlockId.Air) { airIndex = index; break; }
  }
  assert.ok(airIndex >= 0);
  const layer = Math.floor(airIndex / (16 * 16));
  const horizontal = airIndex % (16 * 16);
  const localZ = Math.floor(horizontal / 16);
  const localX = horizontal % 16;
  const y = MIN_Y + layer;
  const section = Math.floor(layer / SECTION_HEIGHT);
  const before = chunk.sectionBlockCounts[section];
  world.setBlock(localX, y, localZ, BlockId.Torch, false, false);
  assert.equal(chunk.sectionBlockCounts[section], before + 1);
  assert.deepEqual(world.lightSourcesNear(localX, y, localZ, 1).map((source) => source.type), [BlockId.Torch]);
  world.setBlock(localX, y, localZ, BlockId.Air, false, true);
  assert.equal(chunk.sectionBlockCounts[section], before);
  assert.equal(world.lightSourcesNear(localX, y, localZ, 1).length, 0);

  // Nearby light lookup addresses only intersecting chunk keys; it must not scan
  // every retained chunk as render distance grows.
  const originalValues = world.chunks.values.bind(world.chunks);
  Object.defineProperty(world.chunks, "values", { configurable: true, value: () => { throw new Error("full chunk scan"); } });
  assert.doesNotThrow(() => world.lightSourcesNear(0, MAX_Y, 0, 20));
  Object.defineProperty(world.chunks, "values", { configurable: true, value: originalValues });
  world.dispose();
});

test("world-space skylight stays attached to exposed and roofed columns", () => {
  const world = new ChunkWorld();
  world.reset("SKYLIGHT-COLUMNS");
  const chunk = world.generateChunk(0, 0);
  const x = 3;
  const z = 4;
  const originalTop = world.skyTopAt(x, z)!;
  const roofY = Math.min(MAX_Y, originalTop + 8);
  const exposedSky = world.lightAt(x, roofY - 1, z).sky;
  world.setBlock(x, roofY, z, BlockId.Stone, false, false);
  assert.equal(world.skyTopAt(x, z), roofY, "a placed roof must darken the column beneath it");
  assert.ok(world.lightAt(x, roofY - 1, z).sky < exposedSky, "an opaque roof must reduce authoritative skylight");
  world.setBlock(x, roofY, z, BlockId.Air, false, false);
  assert.equal(world.skyTopAt(x, z), originalTop, "breaking the roof must restore the exposed column immediately");
  assert.equal(world.lightAt(x, roofY - 1, z).sky, exposedSky, "breaking the roof restores skylight without a mesh rebuild");
  assert.equal(chunk.skyTops[x + z * 16], originalTop);
  world.dispose();
});

test("adjacent blocks across a chunk seam do not render hidden faces", () => {
  const world = new ChunkWorld();
  world.reset("SEAM-TEST");
  const left = world.generateChunk(0, 0);
  const right = world.generateChunk(1, 0);
  left.blocks.fill(BlockId.Air);
  right.blocks.fill(BlockId.Air);
  left.blocks[blockIndex(15, 0, 0)] = BlockId.Stone;
  right.blocks[blockIndex(0, 0, 0)] = BlockId.Stone;
  const section = Math.floor((0 - MIN_Y) / SECTION_HEIGHT);
  world.rebuildSection(left, section);
  world.rebuildSection(right, section);
  const vertexCount = [left, right].reduce((total, chunk) => {
    const mesh = chunk.sections.get(section)?.opaque;
    return total + (mesh?.geometry.getAttribute("position").count ?? 0);
  }, 0);
  assert.equal(vertexCount, 40, "two touching cubes should expose exactly ten quads");
  world.dispose();
});

test("Creative starts empty, exposes every player-facing item, and toggles flight on a deliberate double jump", () => {
  assert.ok(initialInventoryForMode("builder").every((slot) => slot === null));
  assert.deepEqual(initialInventoryForMode("survival")[0], { item: Item.Berry, count: 3 });

  const retired = new Set([Item.LegacyCaptureOrb, ...LEGACY_LENS_ORB_ITEMS, ...LEGACY_SPECIES_ORB_ITEMS]);
  const pairedOnly = new Set([BlockId.PressureDoorUpper, BlockId.HorizonDoorUpper, BlockId.EmergencyShutterUpper]);
  const expected = Object.values(ITEMS).filter((definition) => !retired.has(definition.id) && !pairedOnly.has(definition.id));
  assert.equal(CREATIVE_ITEMS.length, expected.length);
  for (const definition of expected) assert.ok(CREATIVE_ITEMS.includes(definition.id), `${definition.name} is searchable in Creative`);
  for (const item of retired) assert.equal(CREATIVE_ITEMS.includes(item), false);
  for (const item of pairedOnly) assert.equal(CREATIVE_ITEMS.includes(item), false, "upper halves are supplied only by their complete door item");

  const first = resolveCreativeFlightTap(false, -Infinity, 1_000);
  assert.equal(first.toggled, false);
  const airborne = resolveCreativeFlightTap(first.flying, first.previousTap, 1_180);
  assert.deepEqual({ flying: airborne.flying, toggled: airborne.toggled }, { flying: true, toggled: true });
  const armedLanding = resolveCreativeFlightTap(airborne.flying, airborne.previousTap, 2_000);
  const landed = resolveCreativeFlightTap(armedLanding.flying, armedLanding.previousTap, 2_190);
  assert.deepEqual({ flying: landed.flying, toggled: landed.toggled }, { flying: false, toggled: true });
});

test("Creative damage authority rejects the shared direct damage path", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.mode = "builder";
  engine.health = 3;
  engine.playerInvulnerability = 0;
  engine.spawnProtection = 0;
  engine.damagePlayer(100, "a test hazard", true);
  assert.equal(engine.health, 3);
});

test("water and ground share world-space biome tint vertices across chunk seams", () => {
  for (const [type, layer] of [[BlockId.Water, "water"], [BlockId.Grass, "opaque"]] as const) {
    const world = new ChunkWorld();
    world.reset(`VERTEX-TINT-SEAM-${type}`, undefined, { structures: false });
    const left = world.generateChunk(0, 0);
    const right = world.generateChunk(1, 0);
    for (const chunk of [left, right]) {
      chunk.blocks.fill(BlockId.Air);
      chunk.sectionBlockCounts.fill(0);
      chunk.lightIndices.clear();
      chunk.skyTops.fill(MIN_Y - 1);
    }
    left.biomes.fill(BiomeId.Desert);
    right.biomes.fill(BiomeId.Frostpine);
    world.lightEngine.initializeChunk(left);
    world.lightEngine.initializeChunk(right);
    world.setBlock(CHUNK_SIZE - 1, 0, 0, type, false, false);
    world.setBlock(CHUNK_SIZE, 0, 0, type, false, false);
    const section = Math.floor((0 - MIN_Y) / SECTION_HEIGHT);
    world.rebuildSection(left, section);
    world.rebuildSection(right, section);

    const seamColors = (chunk: typeof left) => {
      const geometry = chunk.sections.get(section)?.[layer]?.geometry;
      assert.ok(geometry);
      const position = geometry.getAttribute("position") as THREE.BufferAttribute;
      const normal = geometry.getAttribute("normal") as THREE.BufferAttribute;
      const color = geometry.getAttribute("color") as THREE.BufferAttribute;
      const raw = color.array as Uint8Array;
      const result = new Map<number, readonly number[]>();
      for (let index = 0; index < position.count; index += 1) {
        const worldX = position.getX(index) + chunk.cx * CHUNK_SIZE;
        if (Math.abs(worldX - (CHUNK_SIZE - 0.5)) > 1e-6 || normal.getY(index) < 0.99) continue;
        const worldZ = position.getZ(index) + chunk.cz * CHUNK_SIZE;
        result.set(worldZ, [raw[index * 3], raw[index * 3 + 1], raw[index * 3 + 2]]);
      }
      return result;
    };

    assert.deepEqual(
      [...seamColors(left).entries()].sort(([a], [b]) => a - b),
      [...seamColors(right).entries()].sort(([a], [b]) => a - b),
      `${BLOCKS[type].name} must not reveal chunk ownership through a color discontinuity`,
    );
    world.dispose();
  }
});

test("chunk meshes pack normalized attributes without losing UV or bright biome tint ranges", () => {
  const world = new ChunkWorld();
  world.reset("PACKED-CHUNK-ATTRIBUTES", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  chunk.sectionBlockCounts.fill(0);
  chunk.lightIndices.clear();
  chunk.skyTops.fill(MIN_Y - 1);
  chunk.biomes.fill(BiomeId.Desert);
  world.setBlock(2, 0, 2, BlockId.Stone, false, false);
  world.setBlock(4, 0, 2, BlockId.TorchWallEast, false, false);
  const section = Math.floor((0 - MIN_Y) / SECTION_HEIGHT);
  world.rebuildSection(chunk, section);

  const geometry = chunk.sections.get(section)?.opaque?.geometry;
  assert.ok(geometry);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normal = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const color = geometry.getAttribute("color") as THREE.BufferAttribute;
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  assert.ok(position.array instanceof Float32Array, "positions retain full world-space precision");
  assert.ok(normal.array instanceof Int8Array);
  assert.ok(color.array instanceof Uint8Array);
  assert.ok(uv.array instanceof Uint16Array);
  assert.equal(normal.normalized, true);
  assert.equal(color.normalized, true);
  assert.equal(uv.normalized, true);

  const upwardVertex = Array.from({ length: normal.count }, (_, index) => index).find((index) => normal.getY(index) > 0.99);
  assert.notEqual(upwardVertex, undefined);
  assert.ok(Math.abs(normal.getY(upwardVertex!) - 1) < 1e-9, "axis normals survive signed-byte packing exactly");
  assert.ok(Math.abs(color.getX(upwardVertex!) * PACKED_VERTEX_COLOR_RANGE - 1.1) <= PACKED_VERTEX_COLOR_RANGE / 255, "the overbright desert tint survives byte packing");
  assert.equal((world.materials.opaque as THREE.MeshBasicMaterial).color.r, PACKED_VERTEX_COLOR_RANGE, "the voxel material restores packed color headroom");
  const voxelLight = geometry.getAttribute("voxelLight") as THREE.BufferAttribute;
  const voxelEmission = geometry.getAttribute("voxelEmission") as THREE.BufferAttribute;
  const voxelOcclusion = geometry.getAttribute("voxelOcclusion") as THREE.BufferAttribute;
  assert.ok(voxelLight.array instanceof Uint8Array && voxelLight.normalized);
  assert.ok(voxelEmission.array instanceof Uint8Array && voxelEmission.normalized);
  assert.ok(voxelOcclusion.array instanceof Uint8Array && voxelOcclusion.normalized);

  const spriteNormal = chunk.sections.get(section)?.emissive?.geometry.getAttribute("normal") as THREE.BufferAttribute;
  assert.ok(spriteNormal.array instanceof Int8Array);
  const angledVertex = Array.from({ length: spriteNormal.count }, (_, index) => index).find((index) => (
    Math.abs(spriteNormal.getX(index)) > 0.05 && Math.abs(spriteNormal.getX(index)) < 0.95
  ));
  assert.notEqual(angledVertex, undefined);
  const packedNormalLength = Math.hypot(spriteNormal.getX(angledVertex!), spriteNormal.getY(angledVertex!), spriteNormal.getZ(angledVertex!));
  assert.ok(Math.abs(packedNormalLength - 1) < 0.01, "angled sprite normals stay unit-length within signed-byte precision");

  const tile = BLOCKS[BlockId.Stone].side;
  const expectedUvs = [
    (tile % 16) / 16 + 0.0008,
    1 - (Math.floor(tile / 16) + 1) / 16 + 0.0008,
    (tile % 16 + 1) / 16 - 0.0008,
    1 - Math.floor(tile / 16) / 16 - 0.0008,
  ];
  for (let index = 0; index < Math.min(4, uv.count); index += 1) {
    assert.ok(expectedUvs.some((value) => Math.abs(uv.getX(index) - value) <= 1 / 65535), "packed U remains within one 16-bit quantization step");
    assert.ok(expectedUvs.some((value) => Math.abs(uv.getY(index) - value) <= 1 / 65535), "packed V remains within one 16-bit quantization step");
  }
  world.dispose();
});

test("light-only edits update the packed vertex attribute without rebuilding geometry", () => {
  const world = new ChunkWorld();
  world.reset("SECTION-SHADE-CACHE", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  chunk.sectionBlockCounts.fill(0);
  chunk.lightIndices.clear();
  chunk.skyTops.fill(MIN_Y - 1);
  world.lightEngine.initializeChunk(chunk);
  world.setBlock(3, 15, 3, BlockId.Stone, false, false);
  const section = Math.floor((15 - MIN_Y) / SECTION_HEIGHT);
  world.rebuildSection(chunk, section);
  const geometry = chunk.sections.get(section)?.opaque?.geometry;
  assert.ok(geometry);
  const originalGeometry = geometry;
  const stoneTopRed = () => {
    assert.ok(geometry);
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const normal = geometry.getAttribute("normal") as THREE.BufferAttribute;
    const light = geometry.getAttribute("voxelLight") as THREE.BufferAttribute;
    const vertex = Array.from({ length: position.count }, (_, index) => index).find((index) => (
      normal.getY(index) > 0.99
      && Math.abs(position.getY(index) - 15.5) < 1e-6
      && position.getX(index) >= 2.5 && position.getX(index) <= 3.5
      && position.getZ(index) >= 2.5 && position.getZ(index) <= 3.5
    ));
    assert.notEqual(vertex, undefined);
    return Math.max(light.getY(vertex!), light.getZ(vertex!), light.getW(vertex!));
  };

  const caveShade = stoneTopRed();
  world.setBlock(4, 17, 3, BlockId.Torch, false, true);
  const litShade = stoneTopRed();
  assert.ok(litShade > caveShade + 0.2, "a newly placed torch must update the vertex light buffer");
  assert.equal(chunk.sections.get(section)?.opaque?.geometry, originalGeometry, "unaffected block geometry is retained");
  world.setBlock(4, 17, 3, BlockId.Air, false, true);
  const restoredShade = stoneTopRed();
  assert.ok(Math.abs(restoredShade - caveShade) <= 1 / 255, "removing the torch clears the vertex light buffer");
  world.dispose();
});

test("voxel corner occlusion is a separate bounded shading attribute", () => {
  const world = new ChunkWorld();
  world.reset("VOXEL-CORNER-OCCLUSION", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  chunk.sectionBlockCounts.fill(0);
  world.lightEngine.initializeChunk(chunk);
  world.setBlocksBatch([
    { x: 3, y: 0, z: 3, type: BlockId.Stone },
    { x: 4, y: 1, z: 3, type: BlockId.Stone },
    { x: 3, y: 1, z: 4, type: BlockId.Stone },
  ], false, false);
  const section = Math.floor((0 - MIN_Y) / SECTION_HEIGHT);
  world.rebuildSection(chunk, section);
  const occlusion = chunk.sections.get(section)?.opaque?.geometry.getAttribute("voxelOcclusion") as THREE.BufferAttribute;
  assert.ok(occlusion);
  const values = Array.from({ length: occlusion.count }, (_, index) => occlusion.getX(index));
  assert.ok(Math.min(...values) < 0.9, "a tight solid corner should receive ambient occlusion");
  assert.ok(Math.min(...values) >= 0.57 && Math.max(...values) <= 1, "AO stays bounded and cannot blacken texture color");
  world.dispose();
});

test("no-op block batches do not record edits or enqueue redundant mesh work", () => {
  const world = new ChunkWorld();
  world.reset("NO-OP-BATCH", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  world.edits.clear();
  world.meshQueued.clear();
  world.urgentMeshQueued.clear();
  world.lightSectionQueued.clear();
  world.setBlocksBatch([
    { x: 2, y: 2, z: 2, type: BlockId.Air },
    { x: 2, y: 2, z: 2, type: BlockId.Air },
  ], true, true, true);
  assert.equal(world.edits.size, 0);
  assert.equal(world.meshQueued.size + world.urgentMeshQueued.size + world.lightSectionQueued.size, 0);
  world.dispose();
});

test("deferred batch lighting requeues an invalidated active chunk task", () => {
  const world = new ChunkWorld();
  world.reset("DEFERRED-LIGHT-BATCH", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  chunk.group.visible = true;
  const key = "0,0";
  world.activeLightInitialization = { key, task: world.lightEngine.beginChunkInitialization(chunk) };
  world.lightInitializationQueued.add(key);
  world.lightInitializationQueue = [];
  world.lightInitializationQueueHead = 0;
  world.setBlocksBatch([
    { x: 2, y: 2, z: 2, type: BlockId.Stone },
    ...Array.from({ length: 12 }, (_, index) => ({ x: 3 + index, y: 2, z: 2, type: BlockId.Air })),
  ], false, false, true);
  assert.equal(world.activeLightInitialization, null);
  assert.equal(world.lightInitializationQueued.has(key), true);
  assert.equal(world.lightInitializationQueue.slice(world.lightInitializationQueueHead).includes(key), true);
  world.dispose();
});

test("partial block shapes preserve the full cube faces beside them", () => {
  const world = new ChunkWorld();
  world.reset("PARTIAL-FACE");
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  world.lightEngine.initializeChunk(chunk);
  world.setBlock(0, 0, 0, BlockId.Stone, false);
  world.setBlock(1, 0, 0, BlockId.Chest, false);
  const section = Math.floor((0 - MIN_Y) / SECTION_HEIGHT);
  world.rebuildSection(chunk, section);

  const vertexCount = chunk.sections.get(section)?.opaque?.geometry.getAttribute("position").count ?? 0;
  assert.equal(vertexCount, 96, "the closed chest body, separate lid, and latch must not remove the neighboring stone face");
  world.setChestVisualHidden(1, 0, 0, true);
  assert.equal(chunk.sections.get(section)?.opaque?.geometry.getAttribute("position").count, 24, "the articulated open model must replace, not overlap, the closed chunk chest");
  world.setChestVisualHidden(1, 0, 0, false);
  assert.equal(chunk.sections.get(section)?.opaque?.geometry.getAttribute("position").count, 96, "closing restores the standing chest mesh without mutating its block");
  assert.equal(world.faceVisible(BlockId.Stone, BlockId.Chest), true);
  assert.equal(world.faceVisible(BlockId.Stone, BlockId.DoorClosedLower), true);
  assert.equal(world.faceVisible(BlockId.Stone, BlockId.Stone), false);
  assert.equal((world.materials.glass as THREE.MeshLambertMaterial).opacity, GLASS_OPACITY);
  world.dispose();
});

test("submerged waterlogged plants meet stacked water without an air seam", () => {
  assert.equal(liquidSurfaceInsetForCell(BlockId.GlowKelp, BlockId.Water), 0);
  assert.equal(liquidSurfaceInsetForCell(BlockId.GlowKelp, BlockId.Air), -LIQUID_SURFACE_INSET);

  const world = new ChunkWorld();
  world.reset("WATERLOGGED-SEAM");
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  world.setBlock(2, 0, 2, BlockId.GlowKelp, false, false);
  world.setBlock(2, 1, 2, BlockId.Water, false, false);
  const section = Math.floor((0 - MIN_Y) / SECTION_HEIGHT);
  world.rebuildSection(chunk, section);

  const positions = chunk.sections.get(section)?.water?.geometry.getAttribute("position");
  assert.ok(positions, "the waterlogged plant should emit its implicit water boundary");
  const boundaryY = Array.from({ length: positions?.count ?? 0 }, (_, index) => ({
    x: positions?.getX(index) ?? Number.NaN,
    y: positions?.getY(index) ?? Number.NaN,
  }))
    .filter((vertex) => Math.abs(vertex.x - 2.5) < 1e-6)
    .map((vertex) => vertex.y);
  assert.equal(boundaryY.some((y) => Math.abs(y - (0.5 - LIQUID_SURFACE_INSET)) < 1e-6), false, "a submerged cell must not stop below the next water block");
  assert.ok(boundaryY.filter((y) => Math.abs(y - 0.5) < 1e-6).length >= 4, "the lower and upper water faces should meet on the block boundary");
  world.dispose();
});

test("waterlogged flora does not draw pale implicit-water faces against solid ground or walls", () => {
  const world = new ChunkWorld();
  world.reset("WATERLOGGED-SOLID-SEAM");
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  world.setBlock(2, 0, 2, BlockId.GlowKelp, false, false);
  world.setBlock(3, 0, 2, BlockId.Stone, false, false);
  world.setBlock(2, -1, 2, BlockId.Stone, false, false);
  const section = Math.floor((0 - MIN_Y) / SECTION_HEIGHT);
  world.rebuildSection(chunk, section);
  const normals = chunk.sections.get(section)?.water?.geometry.getAttribute("normal");
  assert.ok(normals);
  const emitted = Array.from({ length: normals?.count ?? 0 }, (_, index) => [
    normals?.getX(index) ?? 0,
    normals?.getY(index) ?? 0,
    normals?.getZ(index) ?? 0,
  ] as const);
  assert.equal(emitted.some(([x, y]) => x > 0.9 && Math.abs(y) < 0.1), false, "east wall boundary must stay hidden");
  assert.equal(emitted.some(([x, y, z]) => y < -0.9 && Math.abs(x) < 0.1 && Math.abs(z) < 0.1), false, "ground boundary must stay hidden");
  assert.equal(emitted.some(([, y]) => y > 0.9), true, "the open water surface must remain rendered");
  world.dispose();
});

test("held-light uniforms stay independent from propagated chunk light", () => {
  const world = new ChunkWorld();
  const position = new THREE.Vector3(3, 7, -2);
  const color = new THREE.Color(0xffa34f);
  world.setHeldLight({ position, color, intensity: 1.25, radius: 13.5 });
  const uniforms = world.materials.opaque.userData.voxelLightingUniforms as Record<string, { value: unknown }>;
  assert.deepEqual((uniforms.voxelHeldLightPosition.value as THREE.Vector3).toArray(), position.toArray());
  assert.equal((uniforms.voxelHeldLightColor.value as THREE.Color).getHex(), color.getHex());
  assert.equal(uniforms.voxelHeldLightIntensity.value, 1.25);
  assert.equal(uniforms.voxelHeldLightRadius.value, 13.5);
  world.dispose();
});

test("pointer-lock reacquisition discards menu cursor deltas without replaying them later", () => {
  let remaining = POINTER_LOCK_REACQUIRE_SUPPRESSION_EVENTS;
  for (const [x, y] of [[920, -410], [-330, 240]] as const) {
    const gated = gatePointerLockMovement(x, y, remaining);
    assert.equal(gated.apply, false);
    remaining = gated.remainingSuppressedEvents;
  }
  const live = gatePointerLockMovement(4, -3, remaining);
  assert.equal(live.apply, true);
  assert.equal(live.remainingSuppressedEvents, 0);
  assert.equal(gatePointerLockMovement(Number.NaN, 1, 0).apply, false);
});

test("placed lights use data-driven colored voxel emission", () => {
  assert.equal(BLOCKS[BlockId.Torch].lightEmission, 14);
  assert.deepEqual(BLOCKS[BlockId.Torch].lightColor, [1, 0.58, 0.24]);
  assert.ok((BLOCKS[BlockId.Lava].lightEmission ?? 0) >= 14);
  assert.equal(BLOCKS[BlockId.CrystalOre].lightEmission, 9);
  assert.deepEqual(BLOCKS[BlockId.CrystalOre].lightColor, [0.34, 0.95, 1]);
  assert.equal(BLOCKS[BlockId.CrystalOre].emissiveStrength, 0.68);
  assert.ok((BLOCKS[BlockId.CrystalOre].lightEmission ?? 0) < (BLOCKS[BlockId.CrystalBlock].lightEmission ?? 0), "unrefined ore should glow more softly than a finished crystal block");
  assert.ok((BLOCKS[BlockId.Dreamblossom].emissiveStrength ?? 0) > 0);
});

test("every directional torch, a placed lava pool, and Star Crystal Ore enter the nearest-first light index", () => {
  const world = new ChunkWorld();
  world.reset("ALL-PLACED-LIGHTS", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  chunk.lightIndices.clear();
  const lights = [...TORCH_BLOCKS, BlockId.Lava, BlockId.CrystalOre] as const;
  lights.forEach((type, index) => world.setBlock(2 + index, 4, 2, type, false, false));
  const found = world.lightSourcesNear(4, 4, 2, 12).map((source) => source.type);
  for (const type of lights) assert.ok(found.includes(type), `${BLOCKS[type].name} missing from light index`);
  world.dispose();
});

test("dense lava is spatially coalesced while all nearby torches remain indexed", () => {
  const world = new ChunkWorld();
  world.reset("BOUNDED-LAVA-LIGHTS", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  chunk.lightIndices.clear();
  const changes: Array<{ x: number; y: number; z: number; type: BlockId }> = [];
  for (let y = -19; y < -7; y += 1) for (let z = 0; z < 16; z += 1) for (let x = 0; x < 16; x += 1) {
    changes.push({ x, y, z, type: BlockId.Lava });
  }
  for (let index = 0; index < 12; index += 1) changes.push({ x: index, y: 6, z: 15, type: BlockId.Torch });
  const startedAt = performance.now();
  world.setBlocksBatch(changes, false, false);
  const elapsed = performance.now() - startedAt;
  const indexed = world.lightSourcesNear(8, -6, 8, 32);
  const lava = indexed.filter((source) => source.type === BlockId.Lava);
  const torches = indexed.filter((source) => source.type === BlockId.Torch);
  assert.ok(lava.length > 0 && lava.length <= 64, `3,072 lava voxels produced ${lava.length} indexed lights`);
  assert.equal(torches.length, 12, "lava coalescing must never consume independent torch entries");
  assert.ok(elapsed < 500, `bounded lava indexing took ${elapsed.toFixed(1)}ms`);

  world.setBlocksBatch([{ x: 1, y: -19, z: 1, type: BlockId.Air }], false, false);
  assert.ok(world.lightSourcesNear(1, -19, 1, 8).some((source) => source.type === BlockId.Lava), "removing the old representative must promote another lava cell member");
  world.dispose();
});

test("leaf canopies soften skylight without turning an open forest into a cave", () => {
  const world = new ChunkWorld();
  world.reset("CANOPY-SKYLIGHT", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  const samples = [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]] as const;
  for (const [dx, dz] of samples) for (let y = 1; y <= 7; y += 1) world.setBlock(8 + dx, y, 8 + dz, BlockId.WildwoodLeaves, false, false);
  const canopy = world.skyVisibilityAt(8, 0, 8);
  assert.ok(canopy >= 0.35 && canopy < 1, `leaf canopy skylight was ${canopy}`);
  const roof = Array.from({ length: 16 * 16 }, (_, index) => ({ x: index % 16, y: 8, z: Math.floor(index / 16), type: BlockId.Stone }));
  const roofStart = performance.now();
  world.setBlocksBatch(roof, false, false);
  assert.ok(performance.now() - roofStart < 750, "a large lighting edit should use one bounded halo relight");
  assert.equal(world.skyVisibilityAt(8, 0, 8), 0, "a complete solid roof must block skylight");
  world.dispose();
});

test("standing double chests close their visual seam", () => {
  const world = new ChunkWorld();
  world.reset("DOUBLE-CHEST-SEAM");
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  chunk.blocks[blockIndex(1, 0, 1)] = BlockId.Chest;
  chunk.blocks[blockIndex(2, 0, 1)] = BlockId.Chest;
  const section = Math.floor((0 - MIN_Y) / SECTION_HEIGHT);
  world.rebuildSection(chunk, section);
  const positions = chunk.sections.get(section)?.opaque?.geometry.getAttribute("position");
  const seamVertices = Array.from({ length: positions?.count ?? 0 }, (_, index) => positions?.getX(index) ?? Number.NaN)
    .filter((x) => Math.abs(x - 1.5) < 1e-6);
  assert.ok(seamVertices.length > 0, "paired chest bodies and lids meet on the shared block boundary");
  world.dispose();
});

test("urgent edits rebuild the visible section immediately and keep the light index current", () => {
  const world = new ChunkWorld();
  world.reset("URGENT-EDIT");
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  chunk.lightIndices.clear();
  const y = 0;
  const section = Math.floor((y - MIN_Y) / SECTION_HEIGHT);
  world.rebuildSection(chunk, section);

  world.setBlock(3, y, 4, BlockId.Stone, true, true);
  assert.equal(chunk.sections.get(section)?.opaque?.geometry.getAttribute("position").count, 24, "a placed cube should be visible without waiting for the mesh queue");

  world.setBlock(3, y, 4, BlockId.Air, true, true);
  assert.equal(chunk.sections.get(section)?.opaque, undefined, "a broken cube should disappear in the same update");

  world.setBlock(5, y, 6, BlockId.Torch, true, true);
  assert.deepEqual(world.lightSourcesNear(5, y, 6, 2).map((source) => source.type), [BlockId.Torch]);
  world.setBlock(5, y, 4, BlockId.Stone, true, true);
  assert.deepEqual(world.lightSourcesNear(5, y, 2, 8).map((source) => source.type), [BlockId.Torch], "an intervening wall must not evict a nearby placed light");
  world.setBlock(5, y, 4, BlockId.Air, true, true);
  world.setBlocksBatch([{ x: 5, y, z: 6, type: BlockId.Air }], true, true);
  assert.equal(world.lightSourcesNear(5, y, 6, 2).length, 0, "breaking a light source must remove it from the pooled-light index");
  world.dispose();
});

test("deferred animated removals hide edited voxels immediately without synchronously rebuilding neighbor seams", () => {
  const world = new ChunkWorld();
  world.reset("ANIMATED-BATCH-VISIBILITY", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  const neighbor = world.generateChunk(1, 0);
  chunk.blocks.fill(BlockId.Air);
  neighbor.blocks.fill(BlockId.Air);
  chunk.sectionBlockCounts.fill(0);
  neighbor.sectionBlockCounts.fill(0);
  world.lightEngine.initializeChunk(chunk);
  world.lightEngine.initializeChunk(neighbor);
  const y = 0;
  const section = Math.floor((y - MIN_Y) / SECTION_HEIGHT);
  world.setBlock(16, y, 4, BlockId.Stone, false, true);
  world.setBlock(15, y, 4, BlockId.WildwoodLog, false, true);
  world.rebuildSection(neighbor, section);

  const rebuilt: string[] = [];
  const rebuildSection = world.rebuildSection.bind(world);
  world.rebuildSection = ((target, targetSection, slice) => {
    rebuilt.push(`${target.key}:${targetSection}`);
    rebuildSection(target, targetSection, slice);
  }) as typeof world.rebuildSection;

  world.setBlocksBatch([{ x: 15, y, z: 4, type: BlockId.Air }], true, true, true);

  assert.equal(chunk.sections.get(section)?.opaque, undefined, "the standing log mesh must disappear in the felling update");
  assert.deepEqual(rebuilt, [`${chunk.key}:${section}`], "only the section containing removed voxels should rebuild synchronously");
  assert.equal(neighbor.dirty.has(section), true, "the newly exposed neighbor seam remains queued for the frame budget");
  world.dispose();
});

test("edits to retained invisible chunks remesh when the chunk becomes visible again", () => {
  const world = new ChunkWorld();
  world.reset("RETAINED-REMESH");
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  const y = 0;
  const section = Math.floor((y - MIN_Y) / SECTION_HEIGHT);
  for (let current = 0; current < WORLD_HEIGHT / SECTION_HEIGHT; current += 1) world.rebuildSection(chunk, current);
  chunk.group.visible = false;

  world.setBlock(2, y, 2, BlockId.Stone, true, false);
  world.processMesh();
  assert.equal(chunk.sections.get(section)?.opaque, undefined, "hidden chunks should avoid wasted remesh work");
  assert.equal(chunk.dirty.has(section), true, "the skipped remesh must remain dirty");

  world.scheduleAround(0, 0, true);
  for (let index = 0; index < 80 && world.streamingDiagnostics().meshSectionsQueued > 0; index += 1) world.processMesh();
  assert.equal(chunk.sections.get(section)?.opaque?.geometry.getAttribute("position").count, 24);
  assert.equal(chunk.dirty.has(section), false);
  world.dispose();
});

test("stack inventory fills existing stacks before empty slots", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.inventory = Array.from({ length: 36 }, () => null);
  engine.inventory[0] = { item: Item.Coal, count: 60 };
  assert.equal(engine.addItem(Item.Coal, 10), 0);
  assert.equal(engine.inventory[0]?.count, 64);
  assert.deepEqual(engine.inventory[1], { item: Item.Coal, count: 6 });
});

test("shift-click moves stacks both ways between the player and an open chest", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.inventory = Array.from({ length: 36 }, () => null);
  engine.inventory[0] = { item: Item.Coal, count: 10 };
  engine.chests = new Map([["0,0,0", [{ item: Item.Coal, count: 60 }, ...Array.from({ length: 26 }, () => null)]]]);
  engine.activeChestKey = "0,0,0";
  engine.activeFurnaceKey = null;
  engine.equipment = { head: null, chest: null, legs: null, feet: null, back: null };
  engine.audio = { play: () => undefined } as unknown as VoxelEngine["audio"];
  engine.saveSoon = () => undefined;
  engine.emitHud = () => undefined;

  engine.inventoryClick(0, "left", true);
  const chest = engine.chests.get("0,0,0")!;
  assert.equal(engine.inventory[0], null);
  assert.deepEqual(chest[0], { item: Item.Coal, count: 64 });
  assert.deepEqual(chest[1], { item: Item.Coal, count: 6 });

  engine.machineClick("chest", 1, "left", true);
  assert.deepEqual(engine.inventory[9], { item: Item.Coal, count: 6 });
  assert.equal(chest[1], null);
});

test("an open container wins over armor auto-equip when shift-clicking", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.inventory = Array.from({ length: 36 }, () => null);
  engine.inventory[0] = { item: Item.HideHood, count: 1, durability: 90 };
  engine.equipment = { head: null, chest: null, legs: null, feet: null, back: null };
  engine.chests = new Map([["0,0,0", Array.from({ length: 27 }, () => null)]]);
  engine.activeChestKey = "0,0,0";
  engine.activeFurnaceKey = null;
  engine.saveSoon = () => undefined;
  engine.shiftMove(0);
  assert.equal(engine.equipment.head, null);
  assert.deepEqual(engine.chests.get("0,0,0")?.[0], { item: Item.HideHood, count: 1, durability: 90 });
});

test("double-click collection gathers matching visible stacks up to the stack limit", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.inventory = Array.from({ length: 36 }, () => null);
  engine.inventory[0] = { item: Item.Coal, count: 20 };
  engine.inventory[9] = { item: Item.Coal, count: 30 };
  engine.craftGrid = Array.from({ length: 9 }, () => null);
  engine.craftGrid[0] = { item: Item.Coal, count: 10 };
  engine.chests = new Map([["0,0,0", [{ item: Item.Coal, count: 12 }, ...Array.from({ length: 26 }, () => null)]]]);
  engine.activeChestKey = "0,0,0";
  engine.activeFurnaceKey = null;
  engine.cursor = null;
  engine.audio = { play: () => undefined } as unknown as VoxelEngine["audio"];
  engine.saveSoon = () => undefined;
  engine.emitHud = () => undefined;

  engine.collectMatching(Item.Coal);
  assert.deepEqual(engine.cursor, { item: Item.Coal, count: 64 });
  assert.equal(engine.inventory[0], null);
  assert.equal(engine.inventory[9], null);
  assert.equal(engine.craftGrid[0], null);
  assert.deepEqual(engine.chests.get("0,0,0")?.[0], { item: Item.Coal, count: 8 });
});

test("adjacent chests merge into one canonical 54-slot double chest", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const first: Array<InventorySlot | null> = [{ item: Item.Coal, count: 1 }, ...Array.from({ length: 26 }, () => null)];
  const second: Array<InventorySlot | null> = [{ item: Item.Stick, count: 2 }, ...Array.from({ length: 26 }, () => null)];
  engine.chests = new Map([["0,0,0", first], ["1,0,0", second]]);
  engine.world = {
    getBlock: (x: number, y: number, z: number) => y === 0 && z === 0 && (x === 0 || x === 1) ? BlockId.Chest : BlockId.Air,
  } as unknown as VoxelEngine["world"];

  const key = engine.resolveChest("0,0,0");
  assert.equal(key, "0,0,0|1,0,0");
  assert.equal(engine.chests.get(key)?.length, 54);
  assert.deepEqual(engine.chests.get(key)?.[0], { item: Item.Coal, count: 1 });
  assert.deepEqual(engine.chests.get(key)?.[27], { item: Item.Stick, count: 2 });
  assert.equal(engine.chests.has("0,0,0"), false);
  assert.equal(engine.chests.has("1,0,0"), false);
});

test("double-chest storage preserves all 54 slots when a world is rehydrated", () => {
  const saved: Array<InventorySlot | null> = Array.from({ length: 54 }, () => null);
  saved[0] = { item: Item.Coal, count: 3 };
  saved[53] = { item: Item.CrystalShard, count: 2 };
  const restored = restoreChestStorage({ "0,0,0|1,0,0": saved });
  assert.equal(restored.get("0,0,0|1,0,0")?.length, 54);
  assert.deepEqual(restored.get("0,0,0|1,0,0")?.[0], { item: Item.Coal, count: 3 });
  assert.deepEqual(restored.get("0,0,0|1,0,0")?.[53], { item: Item.CrystalShard, count: 2 });
});

test("shift-click equips armor and armor reduces damage while losing durability", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const playedSamples: string[] = [];
  engine.inventory = Array.from({ length: 36 }, () => null);
  engine.inventory[0] = { item: Item.IronPlate, count: 1, durability: 100 };
  engine.equipment = { head: null, chest: null, legs: null, feet: null, back: null };
  engine.activeChestKey = null;
  engine.activeFurnaceKey = null;
  engine.saveSoon = () => undefined;
  engine.shiftMove(0);
  assert.deepEqual(engine.equipment.chest, { item: Item.IronPlate, count: 1, durability: 100 });
  assert.equal(engine.inventory[0], null);
  assert.equal(engine.armorPoints(), 4);

  engine.mode = "survival";
  engine.health = 10;
  engine.playerInvulnerability = 0;
  engine.spawnProtection = 0;
  engine.audio = {
    play: () => undefined,
    playSample: (sample: string) => { playedSamples.push(sample); },
  } as unknown as VoxelEngine["audio"];
  engine.events = { onToast: () => undefined } as unknown as VoxelEngine["events"];
  engine.damagePlayer(4, "ridgeback");
  assert.equal(engine.health, 6.5);
  assert.equal(engine.equipment.chest?.durability, 99);
  assert.deepEqual(playedSamples, ["playerDirectDamage"]);
});

test("player impacts double horizontal recoil and add a bounded grounded hop", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.position = new THREE.Vector3(0, 4, 0);
  engine.velocity = new THREE.Vector3();
  engine.yaw = 0;
  engine.mountedCreatureId = null;
  engine.mountedBoatId = null;
  engine.seatedAt = null;
  engine.grounded = true;
  engine.world = { getBlock: () => BlockId.Air } as unknown as VoxelEngine["world"];

  const applied = engine.applyPlayerKnockback({ x: -1, z: 0 }, 2.4);
  assert.equal(applied, 4.8);
  assert.ok(engine.velocity.x > 4.7);
  assert.equal(engine.velocity.y, 3.8);
  assert.equal(engine.grounded, false);
  for (let index = 0; index < 8; index += 1) engine.applyPlayerKnockback({ x: -1, z: 0 }, 4.6);
  assert.ok(Math.hypot(engine.velocity.x, engine.velocity.z) <= 9.5 + Number.EPSILON);
});

test("mob recoil stops at terrain and the recovery probe extracts an embedded ground creature", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.mountedCreatureId = null;
  engine.refreshMobSpatialEntry = () => undefined;
  engine.mobBodyProfile = () => ({ solid: true, size: "medium", radius: 0.5, height: 1.1, visualScale: 1, mass: 1 });
  engine.mobMoveTarget = () => 0.5;
  engine.mobTerrainClearAt = (_mob, x) => x <= 0.34;
  const mob = {
    id: 1,
    kind: "peelop",
    definition: MOB_DEFS.peelop,
    group: new THREE.Group(),
    baseY: 0.5,
    state: "wander",
    stateTimer: 0,
    pushVelocity: new THREE.Vector2(),
  } as never;
  (mob as { group: THREE.Group }).group.position.set(0, 0.5, 0);

  engine.applyMobKnockback(mob, { x: -1, z: 0 }, 4);
  for (let frame = 0; frame < 90; frame += 1) engine.advanceMobKnockback(mob, 1 / 60);
  assert.ok((mob as { group: THREE.Group }).group.position.x > 0.2);
  assert.ok((mob as { group: THREE.Group }).group.position.x <= 0.34, "the impact must stop before the wall");
  assert.equal((mob as { pushVelocity: THREE.Vector2 }).pushVelocity.length(), 0);

  (mob as { group: THREE.Group }).group.position.x = 0.5;
  assert.equal(engine.recoverMobFromTerrain(mob), true);
  assert.ok((mob as { group: THREE.Group }).group.position.x <= 0.34, "the safety probe relocates the body to clear terrain");
});

test("overlapping ground mobs separate with the smaller body yielding farther", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.mountedCreatureId = null;
  const small = { id: 1, kind: "meadow-cottontail", definition: MOB_DEFS["meadow-cottontail"], group: new THREE.Group() };
  const large = { id: 2, kind: "ridgeback", definition: MOB_DEFS.ridgeback, group: new THREE.Group() };
  small.group.position.set(0, 0.5, 0);
  large.group.position.set(0.6, 0.5, 0);
  engine.mobs = [small, large] as never;
  engine.mobBodyProfile = (mob) => ({
    solid: true,
    size: mob.id === 1 ? "small" : "large",
    radius: 0.5,
    height: 1,
    visualScale: 1,
    mass: mob.id === 1 ? 0.4 : 2.4,
  });
  engine.mobFootY = () => 0;
  engine.ensureMobSpatialIndex = () => ({
    queryCircle: () => [
      { id: 1, value: small },
      { id: 2, value: large },
    ],
  }) as never;
  engine.moveMobWithTerrain = (mob, dx, dz) => {
    mob.group.position.x += dx;
    mob.group.position.z += dz;
    return Math.hypot(dx, dz);
  };

  for (let frame = 0; frame < 20; frame += 1) engine.resolveMobBodyOverlaps(1 / 30);
  assert.ok(Math.abs(small.group.position.x) > Math.abs(large.group.position.x - 0.6));
  assert.ok(large.group.position.x - small.group.position.x >= 1.02 - 0.00001);
});

test("door interaction updates both halves with an immediate batch edit", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const writes: Array<{ x: number; y: number; z: number; type: BlockId }> = [];
  let immediate = false;
  engine.world = {
    setBlocksBatch: (changes: typeof writes, _record?: boolean, urgent?: boolean) => { writes.push(...changes); immediate = Boolean(urgent); },
  } as unknown as VoxelEngine["world"];
  engine.audio = { play: () => undefined } as unknown as VoxelEngine["audio"];
  engine.saveSoon = () => undefined;
  engine.toggleDoor(4, 9, 2, BlockId.DoorClosedUpper);
  assert.deepEqual(writes, [
    { x: 4, y: 8, z: 2, type: BlockId.DoorOpenLower },
    { x: 4, y: 9, z: 2, type: BlockId.DoorOpenUpper },
  ]);
  assert.equal(immediate, true);

  writes.length = 0;
  engine.toggleDoor(6, 11, 3, BlockId.WroughtIronDoorXClosedUpper);
  assert.deepEqual(writes, [
    { x: 6, y: 10, z: 3, type: BlockId.WroughtIronDoorXOpenLower },
    { x: 6, y: 11, z: 3, type: BlockId.WroughtIronDoorXOpenUpper },
  ], "a wrought leaf preserves its material family and axis while toggling");
});

test("door collision matches the thin closed slab and the edge-hinged open slab", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  assert.equal(engine.playerIntersectsDoorCell(new THREE.Vector3(0, 0, 0), 0, 0, 0, BlockId.DoorClosedLower), true);
  assert.equal(engine.playerIntersectsDoorCell(new THREE.Vector3(0, 0, 0.4), 0, 0, 0, BlockId.DoorClosedLower), false);
  assert.equal(engine.playerIntersectsDoorCell(new THREE.Vector3(0, 0, 0), 0, 0, 0, BlockId.DoorOpenLower), false);
  assert.equal(engine.playerIntersectsDoorCell(new THREE.Vector3(-0.42, 0, 0), 0, 0, 0, BlockId.DoorOpenLower), true);
});

test("a door cannot close around the player and X-axis doors keep their orientation", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const writes: Array<{ x: number; y: number; z: number; type: BlockId }> = [];
  engine.world = { setBlocksBatch: (changes: typeof writes) => writes.push(...changes) } as unknown as VoxelEngine["world"];
  engine.audio = { play: () => undefined } as unknown as VoxelEngine["audio"];
  engine.events = { onToast: () => undefined } as unknown as VoxelEngine["events"];
  engine.saveSoon = () => undefined;
  engine.position = new THREE.Vector3(0, 0, 0);
  engine.toggleDoor(0, 0, 0, BlockId.DoorOpenLower);
  assert.equal(writes.length, 0);

  engine.position.set(3, 0, 3);
  engine.toggleDoor(0, 0, 0, BlockId.DoorXClosedLower);
  assert.deepEqual(writes, [
    { x: 0, y: 0, z: 0, type: BlockId.DoorXOpenLower },
    { x: 0, y: 1, z: 0, type: BlockId.DoorXOpenUpper },
  ]);
});

test("fence gates use a thin collision slab and cannot close through an occupant", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const writes: BlockId[] = [];
  engine.world = { setBlock: (_x: number, _y: number, _z: number, type: BlockId) => { writes.push(type); } } as unknown as VoxelEngine["world"];
  engine.audio = { playSample: () => undefined } as unknown as VoxelEngine["audio"];
  engine.events = { onToast: () => undefined } as unknown as VoxelEngine["events"];
  engine.publishBlockEdits = () => undefined;
  engine.saveSoon = () => undefined;
  engine.remotePlayers = new Map();
  engine.mobs = [];
  engine.position = new THREE.Vector3(0, 0, 0);

  assert.equal(engine.playerIntersectsFenceGateCell(engine.position, 0, 0, 0, BlockId.FenceGateNorthSouthClosed), true);
  assert.equal(engine.playerIntersectsFenceGateCell(new THREE.Vector3(0, 0, 0.5), 0, 0, 0, BlockId.FenceGateNorthSouthClosed), false);
  assert.equal(engine.toggleFenceGateAt(0, 0, 0, BlockId.FenceGateNorthSouthOpen), false);
  assert.equal(writes.length, 0, "closing through the player must not mutate the gate");

  engine.position.set(3, 0, 3);
  assert.equal(engine.toggleFenceGateAt(0, 0, 0, BlockId.FenceGateNorthSouthOpen), true);
  assert.deepEqual(writes, [BlockId.FenceGateNorthSouthClosed]);
});

test("sentient ground routes open a closed gate and close it after clearing the passage", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const blocks = new Map([["1,1,0", BlockId.FenceGateNorthSouthClosed]]);
  engine.world = {
    getBlock: (x: number, y: number, z: number) => blocks.get(`${x},${y},${z}`) ?? BlockId.Air,
    setBlock: (x: number, y: number, z: number, type: BlockId) => { blocks.set(`${x},${y},${z}`, type); },
  } as unknown as VoxelEngine["world"];
  engine.audio = { playSample: () => undefined } as unknown as VoxelEngine["audio"];
  engine.events = { onToast: () => undefined } as unknown as VoxelEngine["events"];
  engine.publishBlockEdits = () => undefined;
  engine.saveSoon = () => undefined;
  engine.remotePlayers = new Map();
  engine.mobs = [];
  engine.position = new THREE.Vector3(20, 0, 20);
  engine.mobBaseScale = () => 1;
  type SentientFixture = {
    age: number;
    definition: { sentient: boolean; footOffset: number; height: number; radius: number };
    group: THREE.Group;
    openedPassage?: { kind: string };
  };
  const mob: SentientFixture = {
    age: 0,
    definition: { sentient: true, footOffset: 0, height: 1, radius: 0.25 },
    group: new THREE.Group(),
  };
  const passageApi = engine as unknown as {
    tryOpenSentientPassage(subject: SentientFixture, heading: number, lookahead: number): boolean;
    updateSentientPassage(subject: SentientFixture): void;
  };
  assert.equal(passageApi.tryOpenSentientPassage(mob, 0, 1), true);
  assert.equal(blocks.get("1,1,0"), BlockId.FenceGateNorthSouthOpen);
  assert.equal(mob.openedPassage?.kind, "gate");

  mob.age = 3;
  mob.group.position.set(3, 0, 0);
  passageApi.updateSentientPassage(mob);
  assert.equal(blocks.get("1,1,0"), BlockId.FenceGateNorthSouthClosed);
});

test("due saplings remain scheduled while their chunk is unloaded", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.saplings = new Map([["64,10,64", 0]]);
  engine.saplingCheckTimer = 0;
  engine.world = { getBlock: () => undefined } as unknown as VoxelEngine["world"];
  engine.updateSaplings(1);
  assert.equal(engine.saplings.has("64,10,64"), true);
  assert.ok((engine.saplings.get("64,10,64") ?? 0) > Date.now());
});

test("tree felling takes only the rooted vertical trunk and leaves attached builds intact", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.world = new ChunkWorld();
  engine.world.reset("TREE-OWNERSHIP");
  const chunk = engine.world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  engine.world.setBlock(4, 0, 4, BlockId.Dirt, false);
  for (let y = 1; y <= 3; y += 1) engine.world.setBlock(4, y, 4, BlockId.WildwoodLog, false);
  engine.world.setBlock(5, 1, 4, BlockId.WildwoodLog, false);
  for (const [dx, dy, dz] of [[-2, 0, -1], [-2, 0, 0], [-2, 0, 1], [-1, 0, -2], [-1, 0, -1], [-1, 0, 0], [-1, 0, 1], [-1, 0, 2], [0, 1, -1], [0, 1, 1]] as Array<[number, number, number]>) {
    engine.world.setBlock(4 + dx, 3 + dy, 4 + dz, BlockId.WildwoodLeaves, false);
  }
  engine.scene = new THREE.Scene();
  engine.position = new THREE.Vector3(0, 1, 0);
  engine.fallingTrees = [];
  engine.mode = "builder";
  engine.persistent = false;
  engine.yaw = 0;
  engine.audio = { play: () => undefined } as unknown as VoxelEngine["audio"];
  engine.events = { onToast: () => undefined } as unknown as VoxelEngine["events"];
  assert.equal(engine.tryFellTree(4, 1, 4, BlockId.WildwoodLog), true);
  assert.equal(engine.fallingTrees[0]?.logCount, 3);
  assert.equal(engine.world.getBlock(5, 1, 4), BlockId.WildwoodLog, "a touching horizontal build log must not join the tree entity");
  for (const tree of engine.fallingTrees) engine.disposeObject(tree.group);
  engine.world.dispose();
});

test("furnaces complete smelting even when the surrounding game simulation is paused", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.furnaces = new Map([["0,0,0", { input: { item: Item.RawIron, count: 1 }, fuel: { item: Item.Coal, count: 1 }, output: null, progress: 0, burn: 0, burnMax: 0 }]]);
  engine.audio = { play: () => undefined } as unknown as VoxelEngine["audio"];
  engine.saveSoon = () => undefined;
  engine.paused = true;
  engine.updateFurnaces(8.1);
  assert.deepEqual(engine.furnaces.get("0,0,0")?.output, { item: Item.IronIngot, count: 1 });
  assert.equal(engine.furnaces.get("0,0,0")?.input, null);
});

test("2×2 and 3×3 crafting recognize shaped recipes", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.craftGrid = Array.from({ length: 9 }, () => null);
  engine.craftingSize = 2;
  engine.craftGrid[0] = { item: BlockId.WildwoodLog, count: 1 };
  assert.equal(engine.findRecipe()?.recipe.id, "planks");

  engine.craftGrid = Array.from({ length: 9 }, () => null);
  for (const index of [0, 1, 3, 4]) engine.craftGrid[index] = { item: BlockId.Planks, count: 1 };
  assert.equal(engine.findRecipe()?.recipe.id, "table");

  engine.craftingSize = 3;
  engine.craftGrid = Array.from({ length: 9 }, () => null);
  for (const index of [0, 1, 2]) engine.craftGrid[index] = { item: BlockId.Cobblestone, count: 1 };
  for (const index of [4, 7]) engine.craftGrid[index] = { item: Item.Stick, count: 1 };
  assert.equal(engine.findRecipe()?.recipe.id, "stone_pick");

  engine.audio = { play: () => undefined } as unknown as VoxelEngine["audio"];
  engine.saveSoon = () => undefined;
  engine.emitHud = () => undefined;
  engine.craftOutputClick();
  assert.equal(engine.cursor?.durability, ITEMS[Item.StonePickaxe].maxDurability, "manually crafted tools start at full durability");
});

test("rejected solid placement never mutates the world and player chests start empty", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const writes: Array<{ type: BlockId; record?: boolean }> = [];
  engine.world = {
    getBlock: () => BlockId.TallGrass,
    setBlock: (_x: number, _y: number, _z: number, type: BlockId, record?: boolean) => { writes.push({ type, record }); return true; },
  } as unknown as VoxelEngine["world"];
  engine.target = { x: 2, y: 4, z: 6, placeX: 2, placeY: 5, placeZ: 6, type: BlockId.TallGrass, distance: 1 };
  engine.placeCooldown = 0;
  engine.selected = 0;
  engine.inventory = Array.from({ length: 36 }, () => null);
  engine.inventory[0] = { item: BlockId.Stone, count: 1 };
  engine.mode = "survival";
  engine.position = new THREE.Vector3();
  engine.collidesAt = () => true;
  engine.events = { onToast: () => undefined } as unknown as VoxelEngine["events"];
  engine.placeBlock();
  assert.deepEqual(writes, [], "preflight preserves the replaceable cell without a transient solid or rollback record");
  assert.deepEqual(engine.inventory[0], { item: BlockId.Stone, count: 1 });

  writes.length = 0;
  engine.inventory[0] = { item: BlockId.Chest, count: 1 };
  engine.collidesAt = () => false;
  engine.chests = new Map();
  engine.furnaces = new Map();
  engine.audio = { play: () => undefined } as unknown as VoxelEngine["audio"];
  engine.spawnParticles = () => undefined;
  engine.saveSoon = () => undefined;
  engine.emitHud = () => undefined;
  engine.placeBlock();
  const chest = engine.chests.get("2,4,6");
  assert.equal(chest?.length, 27);
  assert.ok(chest?.every((slot) => slot === null), "player-crafted chests must not inherit structure loot");
});

test("generator-v3 through v13 fallback saves advance without moving existing voxel edits", () => {
  for (const generatorVersion of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
    const previous = {
      version: 2,
      generatorVersion,
      seed: "WAYFINDER-MIGRATION",
      edits: { "-2,3": [[24_731, BlockId.MeadowGrass], [24_732, BlockId.Air]] },
    } as unknown as WorldSave;
    const migrated = migrateSavedWorld(previous);
    assert.equal(migrated?.generatorVersion, GENERATOR_VERSION);
    assert.deepEqual(migrated?.edits, previous.edits);
  }
});

test("door meshes include textured top, bottom, and narrow side edges", () => {
  const world = new ChunkWorld();
  world.reset("DOOR-EDGE-MESH");
  const chunk = world.generateChunk(0, 0);
  const y = 100;
  world.setBlock(2, y, 2, BlockId.DoorClosedLower, true, false);
  const section = Math.floor((y - MIN_Y) / SECTION_HEIGHT);
  world.rebuildSection(chunk, section);
  const geometry = chunk.sections.get(section)?.cutout?.geometry;
  assert.equal(geometry?.index?.count, 36, "a six-faced thin door slab should emit six textured quads");
  assert.equal(geometry?.getAttribute("position").count, 24);

  world.setBlock(4, y, 4, BlockId.WroughtIronDoorClosedLower, true, false);
  world.rebuildSection(chunk, section);
  const wroughtGeometry = chunk.sections.get(section)?.cutout?.geometry;
  assert.ok((wroughtGeometry?.index?.count ?? 0) > 36, "wrought doors are built from real separated bars rather than a painted solid pane");
  world.dispose();
});

test("the runtime chest lid opens upward around its rear hinge", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.activeChestModel = new THREE.Group();
  engine.chestLidPivot = new THREE.Group();
  engine.activeChestKey = "0,0,0";
  engine.chestOpenAmount = 0;
  engine.updateChestModel(0.2);
  assert.ok(engine.chestOpenAmount > 0);
  assert.ok(engine.chestLidPivot.rotation.x > 0, "positive X raises the front edge instead of folding through the chest");
  const eastWest = chestModelLayout([[0, 0, 0], [1, 0, 0]]);
  const northSouth = chestModelLayout([[0, 0, 0], [0, 0, 1]]);
  assert.equal(eastWest.width, northSouth.width);
  assert.equal(eastWest.depth, northSouth.depth, "double chests stay shallow instead of opening a longways lid");
  assert.equal(eastWest.rotationY, 0);
  assert.equal(northSouth.rotationY, Math.PI / 2, "a north-south pair rotates so its hinge remains behind the chest");
  assert.equal(eastWest.depth, CHEST_VISUAL.bodyDepth);
  assert.equal(eastWest.lidDepth, CHEST_VISUAL.lidDepth);
  assert.deepEqual(chestLatchCenters(false), [0]);
  assert.deepEqual(chestLatchCenters(true), [-0.5, 0.5], "closed and articulated double chests both retain one latch per block");
});

test("placing a bed reserves two supported cells and writes its oriented halves as one batch", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const cells = new Map<string, BlockId>([
    ["2,3,6", BlockId.Stone],
    ["2,3,5", BlockId.Stone],
  ]);
  const writes: Array<{ x: number; y: number; z: number; type: BlockId }> = [];
  engine.world = {
    getBlock: (x: number, y: number, z: number) => cells.get(`${x},${y},${z}`) ?? BlockId.Air,
    setBlocksBatch: (changes: typeof writes) => {
      writes.push(...changes);
      for (const change of changes) cells.set(`${change.x},${change.y},${change.z}`, change.type);
    },
  } as unknown as VoxelEngine["world"];
  engine.target = { x: 2, y: 3, z: 6, placeX: 2, placeY: 4, placeZ: 6, type: BlockId.Stone, distance: 1 };
  engine.placeCooldown = 0;
  engine.yaw = 0;
  engine.selected = 0;
  engine.inventory = Array.from({ length: 36 }, () => null);
  engine.inventory[0] = { item: Item.WildwoodBed, count: 1 };
  engine.mode = "survival";
  engine.position = new THREE.Vector3(20, 20, 20);
  engine.collidesAt = () => false;
  engine.events = { onToast: () => undefined } as unknown as VoxelEngine["events"];
  engine.publishBlockEdits = () => undefined;
  engine.audio = { play: () => undefined } as unknown as VoxelEngine["audio"];
  engine.spawnParticles = () => undefined;
  engine.saveSoon = () => undefined;
  engine.emitHud = () => undefined;
  engine.placeBlock();
  assert.deepEqual(writes, [
    { x: 2, y: 4, z: 6, type: BlockId.BedNorthFoot },
    { x: 2, y: 4, z: 5, type: BlockId.BedNorthHead },
  ]);
  assert.equal(engine.inventory[0], null);
});

test("all ordinary saplings can be placed directly on Meadow Grass", () => {
  for (const [item, expectedBlock] of [
    [BlockId.WildwoodSapling, BlockId.WildwoodSapling],
    [Item.RainveilSapling, BlockId.JungleSapling],
    [Item.SakurabloomSapling, BlockId.SakuraSapling],
  ] as const) {
    const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
    const writes: Array<{ x: number; y: number; z: number; type: BlockId }> = [];
    engine.world = {
      getBlock: (_x: number, y: number) => y === 3 ? BlockId.MeadowGrass : BlockId.Air,
      setBlock: (x: number, y: number, z: number, type: BlockId) => { writes.push({ x, y, z, type }); return true; },
    } as unknown as VoxelEngine["world"];
    engine.target = { x: 2, y: 3, z: 6, placeX: 2, placeY: 4, placeZ: 6, type: BlockId.MeadowGrass, distance: 1 };
    engine.placeCooldown = 0;
    engine.selected = 0;
    engine.inventory = Array.from({ length: 36 }, () => null);
    engine.inventory[0] = { item, count: 1 };
    engine.mode = "survival";
    engine.events = { onToast: () => undefined } as unknown as VoxelEngine["events"];
    engine.publishBlockEdits = () => undefined;
    engine.notifyLiquidChanged = () => undefined;
    engine.schedulePlantGrowth = () => undefined;
    engine.audio = { play: () => undefined } as unknown as VoxelEngine["audio"];
    engine.spawnParticles = () => undefined;
    engine.saveSoon = () => undefined;
    engine.emitHud = () => undefined;

    engine.placeBlock();

    assert.deepEqual(writes, [{ x: 2, y: 4, z: 6, type: expectedBlock }]);
    assert.equal(engine.inventory[0], null, `${ITEMS[item].name} should be consumed after planting`);
  }
});

test("dropped tools preserve their remaining durability", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.drops = [];
  engine.nextDropId = 1;
  engine.dropModelTemplates = new Map();
  engine.dropGroup = new THREE.Group();
  engine.spawnDrop(Item.StonePickaxe, 1, new THREE.Vector3(), 37);
  assert.equal(engine.drops[0]?.durability, 37);
});

test("oversized world drops split into legal stacks instead of losing items on save", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.drops = [];
  engine.nextDropId = 1;
  engine.dropModelTemplates = new Map();
  engine.dropGroup = new THREE.Group();
  engine.spawnDrop(BlockId.WildwoodLog, 96, new THREE.Vector3());
  assert.deepEqual(engine.drops.map((drop) => drop.count), [64, 32]);
  assert.equal(engine.drops.reduce((total, drop) => total + drop.count, 0), 96);
});

test("mob deaths detach semantic body blocks and fully burn them away", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.scene = new THREE.Scene();
  engine.creatureGroup = new THREE.Group();
  engine.mobs = [];
  engine.mobRemains = [];
  engine.nextMobId = 1;
  engine.world = { getBlock: () => BlockId.Air } as unknown as VoxelEngine["world"];
  const zombie = engine.spawnMob("zombie", new THREE.Vector3(0, 1, 0));
  engine.spawnMobRemains(zombie);
  assert.ok(engine.mobRemains[0]?.fragments.length >= 8);
  const parts = new Set(engine.mobRemains[0]?.fragments.map((fragment) => fragment.mesh.userData.bodyPart));
  for (const required of ["body", "head", "leftArm", "rightArm", "leftLeg", "rightLeg"]) assert.equal(parts.has(required), true, `death breakup missing ${required}`);
  engine.removeMob(0);
  engine.updateMobRemains(2.4);
  assert.equal(engine.mobRemains.length, 0, "burn-away fragments must have a finite lifetime");
});

test("ever-led protection survives creature serialization and restoration", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.creatureGroup = new THREE.Group();
  engine.mobs = [];
  engine.nextMobId = 1;
  engine.world = {
    getBlock: (_x: number, y: number) => y <= 0 ? BlockId.Stone : BlockId.Air,
    isWalkThrough: (type: BlockId | undefined) => type === BlockId.Air,
    findWalkableY: () => 0,
    surfaceAt: () => 0,
  } as unknown as VoxelEngine["world"];
  const original = engine.spawnMob("meadow-cow", new THREE.Vector3(2, 1, 3), { naturalSpawned: true, everLed: true });
  const saved = engine.serializeCreature(original);
  assert.equal(saved.everLed, true);
  engine.mobs = [];
  const restored = engine.restoreCreature(saved);
  assert.equal(restored?.everLed, true);
  assert.equal(restored?.naturalSpawned, true);
});

test("terrain sections consolidate to at most one visible submission per render layer", () => {
  const world = new ChunkWorld();
  world.reset("DRAW-SUBMISSION-PARITY", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  for (let section = 0; section < chunk.sectionBlockCounts.length; section += 1) {
    if (chunk.sectionBlockCounts[section] > 0) world.rebuildSection(chunk, section);
  }
  const sectionMeshes = [...chunk.sections.values()].flatMap((section) => Object.values(section).filter(Boolean));
  assert.ok(sectionMeshes.length > 5, "the fixture must span enough sections/layers to prove consolidation");
  world.flushLightSections(256);
  for (let guard = 0; guard < 100 && world.processConsolidation(); guard += 1) {
    assert.ok(guard < 99, "consolidation must converge");
  }
  const combined = Object.values(chunk.combinedMeshes).filter(Boolean);
  assert.ok(combined.length > 0 && combined.length <= 5);
  assert.equal(sectionMeshes.filter((mesh) => mesh?.visible).length, 0);
  assert.equal(chunk.group.matrixAutoUpdate, false, "static chunk transforms should not be recomposed every render");
  assert.ok(combined.every((mesh) => mesh?.matrixAutoUpdate === false), "static combined terrain transforms should remain frozen");
  assert.ok(world.terrainBufferPipeline.diagnostics().submitted <= 5, "stable layers should merge once instead of once per completed section");
  world.dispose();
});

test("flowing water renders a seven-level taper with closed step faces", () => {
  assert.equal(liquidSurfaceInsetForCell(BlockId.Water, BlockId.Air, 0, false), -LIQUID_SURFACE_INSET);
  assert.equal(liquidSurfaceInsetForCell(BlockId.Water, BlockId.Air, 1, false), -(LIQUID_SURFACE_INSET + FLOWING_WATER_LEVEL_INSET));
  assert.equal(liquidSurfaceInsetForCell(BlockId.Water, BlockId.Air, 7, false), -0.86);
  assert.equal(liquidSurfaceInsetForCell(BlockId.Water, BlockId.Air, 7, true), -LIQUID_SURFACE_INSET, "falling columns stay visually continuous");

  const world = new ChunkWorld();
  const levels = new Map([
    ["2,0,2", { level: 1, source: false, falling: false }],
    ["3,0,2", { level: 7, source: false, falling: false }],
  ]);
  world.setLiquidCellProvider((x, y, z) => levels.get(`${x},${y},${z}`));
  world.reset("FLOWING-WATER-TAPER");
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  world.setBlock(2, 0, 2, BlockId.Water, false, false);
  world.setBlock(3, 0, 2, BlockId.Water, false, false);
  const section = Math.floor((0 - MIN_Y) / SECTION_HEIGHT);
  world.rebuildSection(chunk, section);

  const positions = chunk.sections.get(section)?.water?.geometry.getAttribute("position");
  assert.ok(positions);
  const vertices = Array.from({ length: positions?.count ?? 0 }, (_, index) => ({
    x: positions?.getX(index) ?? Number.NaN,
    y: positions?.getY(index) ?? Number.NaN,
    z: positions?.getZ(index) ?? Number.NaN,
  }));
  const levelOneTop = 0.5 - LIQUID_SURFACE_INSET - FLOWING_WATER_LEVEL_INSET;
  const levelSevenTop = 0.5 - 0.86;
  assert.ok(vertices.some((vertex) => Math.abs(vertex.y - levelOneTop) < 1e-6));
  assert.ok(vertices.some((vertex) => Math.abs(vertex.y - levelSevenTop) < 1e-6));
  const sharedStep = vertices.filter((vertex) => Math.abs(vertex.x - 2.5) < 1e-6 && Math.abs(vertex.z - 2) <= 0.51);
  assert.ok(sharedStep.some((vertex) => Math.abs(vertex.y - levelOneTop) < 1e-6));
  assert.ok(sharedStep.some((vertex) => Math.abs(vertex.y - levelSevenTop) < 1e-6), "the taller cell must close the exposed face down to its lower neighbor");
  world.dispose();
});

test("chunk cache restoration preserves landmark metadata for map discovery", () => {
  const world = new ChunkWorld();
  world.reset("POI-CACHE-TEST", undefined, { structures: false });
  world.generateChunk(0, 0);
  world.structureMarkers.set("audit:surface-poi", {
    type: "landmark",
    id: "audit:surface-poi",
    position: { x: 8, y: 40, z: 8 },
    tag: "adventure-poi:forest-watch",
    mapLayer: "surface",
  });

  world.unloadChunk("0,0");
  world.structureMarkers.clear();
  world.scheduleAround(8, 8, true, 40);

  assert.equal(world.chunks.has("0,0"), true, "the nearby chunk should restore from the memory cache immediately");
  assert.equal(world.structureMarkers.get("audit:surface-poi")?.type, "landmark");
  world.dispose();
});

test("chunk cache identity follows neighboring edits that can change a presented seam", () => {
  const world = new ChunkWorld();
  world.reset("CARDINAL-CACHE-HALO", undefined, { structures: false });
  const cacheKey = (world as unknown as { chunkCacheKey: (key: string) => string }).chunkCacheKey.bind(world);
  const centerKey = chunkKey(0, 0);
  const before = cacheKey(centerKey);
  world.generateChunk(1, 0);
  world.setBlock(CHUNK_SIZE, 0, 0, BlockId.Torch, true, true);
  const afterAdjacentEdit = cacheKey(centerKey);
  assert.notEqual(afterAdjacentEdit, before, "adjacent light and geometry edits must invalidate the cached edge presentation");
  world.generateChunk(1, 1);
  world.setBlock(CHUNK_SIZE, 0, CHUNK_SIZE, BlockId.Torch, true, true);
  assert.notEqual(cacheKey(centerKey), afterAdjacentEdit, "diagonal light can reach a chunk corner and belongs to the same cache halo");
  world.dispose();
});

test("generator-v17 saves keep edits and modern settlement options while terrain caches advance to v18", () => {
  const previous = {
    version: 2,
    generatorVersion: 17,
    generatorProfile: "world-below-v15",
    seed: "SEAMWATER-MIGRATION",
    options: { settlementPattern: "heartlands-v2" },
    edits: { "1,-1": [[19_337, BlockId.CrystalBlock], [19_338, BlockId.Air]] },
  } as unknown as WorldSave;
  const migrated = migrateSavedWorld(previous);
  assert.equal(migrated?.generatorVersion, GENERATOR_VERSION);
  assert.equal(migrated?.options?.settlementPattern, "heartlands-v2");
  assert.deepEqual(migrated?.edits, previous.edits);
});

test("a late neighboring chunk urgently removes speculative water and terrain edge faces", () => {
  const world = new ChunkWorld();
  world.reset("LATE-SEAM-RECONCILIATION", undefined, { structures: false });
  const left = world.generateChunk(0, 0);
  left.blocks.fill(BlockId.Air);
  left.sectionBlockCounts.fill(0);
  world.lightEngine.initializeChunk(left);
  world.setBlock(15, 0, 0, BlockId.Water, false, false);
  const section = Math.floor((0 - MIN_Y) / SECTION_HEIGHT);
  world.rebuildSection(left, section);
  assert.equal(left.sections.get(section)?.water?.geometry.getAttribute("position").count, 24, "the absent neighbor initially exposes six water faces");

  const right = world.generateChunk(1, 0);
  right.blocks.fill(BlockId.Air);
  right.sectionBlockCounts.fill(0);
  world.lightEngine.initializeChunk(right);
  world.setBlock(16, 0, 0, BlockId.Water, false, false);
  world.meshQueue = [];
  world.meshQueueHead = 0;
  world.meshQueued.clear();
  world.urgentMeshQueue = [];
  world.urgentMeshQueueHead = 0;
  world.urgentMeshQueued.clear();
  (world as unknown as { queueChunkMeshesAndSeams: (chunk: typeof right) => void }).queueChunkMeshesAndSeams(right);
  assert.equal(world.urgentMeshQueued.has(`${left.key}:${section}`), true);
  assert.equal(world.seamPresentationPending.has(`${right.key}:${section}`), true, "the arriving section must wait for the old edge replacement");
  assert.equal(world.meshQueued.has(`${right.key}:${section}`), false, "both sides of an unresolved seam must never be presented together");
  for (let slice = 0; slice < 20; slice += 1) world.processMesh(left.key);
  assert.equal(left.sections.get(section)?.water?.geometry.getAttribute("position").count, 20, "water beside water must have no internal chunk-wall quad");
  assert.equal(world.seamMeshRebuilds.has(`${left.key}:${section}`), false);
  assert.equal(world.seamPresentationPending.has(`${right.key}:${section}`), false, "installing the corrected edge must release its arriving section");
  assert.equal(world.meshQueued.has(`${right.key}:${section}`), true, "the coherent arriving section should become eligible immediately");
  for (let slice = 0; slice < 20; slice += 1) world.processMesh(right.key);
  assert.equal(right.sections.get(section)?.water?.geometry.getAttribute("position").count, 20);
  world.dispose();
});

test("worker-light reconciliation completes before an arriving chunk can mesh", () => {
  const world = new ChunkWorld();
  world.reset("ATOMIC-LIGHT-SEAM", undefined, { structures: false });
  world.playerChunkX = 1;
  world.playerChunkZ = 0;
  const chunk = world.generateChunk(1, 0);
  chunk.blocks.fill(BlockId.Air);
  chunk.sectionBlockCounts.fill(0);
  world.lightEngine.initializeChunk(chunk);
  world.setBlock(16, 0, 0, BlockId.Water, false, false);
  const section = Math.floor((0 - MIN_Y) / SECTION_HEIGHT);
  world.meshQueue = [];
  world.meshQueueHead = 0;
  world.meshQueued.clear();
  world.urgentMeshQueue = [];
  world.urgentMeshQueueHead = 0;
  world.urgentMeshQueued.clear();

  const internals = world as unknown as {
    queueLightReconciliation: (target: typeof chunk) => void;
    queueChunkMeshesAndSeams: (target: typeof chunk) => void;
    processLightReconciliation: () => boolean;
  };
  internals.queueLightReconciliation(chunk);
  internals.queueChunkMeshesAndSeams(chunk);
  assert.equal(world.meshQueued.has(`${chunk.key}:${section}`), false, "isolated worker light must not reach a visible mesh");
  assert.equal(world.streamingDiagnostics().playerChunkStage, "lighting");
  for (let guard = 0; world.lightReconciliationQueued.size > 0; guard += 1) {
    assert.ok(guard < 32, "bounded seam light should reconcile promptly");
    internals.processLightReconciliation();
  }
  assert.equal(
    world.meshQueued.has(`${chunk.key}:${section}`) || world.urgentMeshQueued.has(`${chunk.key}:${section}`),
    true,
    "the section becomes eligible only with reconciled boundary light",
  );
  world.dispose();
});

test("player edits invalidate consolidated terrain before the local mesh is presented", () => {
  const world = new ChunkWorld();
  world.reset("CONSOLIDATED-EDIT-FEEDBACK", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  chunk.sectionBlockCounts.fill(0);
  world.lightEngine.initializeChunk(chunk);
  const y = 0;
  const section = Math.floor((y - MIN_Y) / SECTION_HEIGHT);
  world.setBlock(3, y, 4, BlockId.Stone, false, true);
  for (let guard = 0; guard < 20 && world.processConsolidation(); guard += 1) assert.ok(guard < 19);
  assert.ok(chunk.combinedMeshes.opaque, "the production edit path must begin from consolidated terrain");
  assert.equal(chunk.sections.get(section)?.opaque?.visible, false);

  const feedback = world.beginPlayerEditFeedback("break", performance.now());
  world.setBlock(3, y, 4, BlockId.Air, true, true);
  world.completePlayerEditFeedback(feedback);

  assert.equal(chunk.combinedMeshes.opaque, undefined, "the stale combined layer must be detached in the edit transaction");
  assert.equal(chunk.sections.get(section)?.opaque, undefined, "the directly edited source section must show the removed block immediately");
  const diagnostics = world.streamingDiagnostics().playerEdits;
  assert.equal(diagnostics.total, 1);
  assert.equal(diagnostics.byKind.break, 1);
  assert.equal(diagnostics.mutationToLocalMeshVisible.count, 1);
  assert.ok(diagnostics.last && diagnostics.last.mutationToLocalMeshVisibleMilliseconds! >= 0);
  world.dispose();
});

test("immediate edits keep unaffected consolidated render layers installed", () => {
  const world = new ChunkWorld();
  world.reset("LAYER-SCOPED-EDIT", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  chunk.sectionBlockCounts.fill(0);
  world.lightEngine.initializeChunk(chunk);
  world.setBlock(3, 0, 4, BlockId.Stone, false, true);
  world.setBlock(9, 20, 9, BlockId.Water, false, true);
  for (let guard = 0; guard < 40 && world.processConsolidation(); guard += 1) assert.ok(guard < 39);
  const water = chunk.combinedMeshes.water;
  assert.ok(chunk.combinedMeshes.opaque && water, "the fixture must begin with independently consolidated solid and water layers");

  world.setBlock(3, 0, 4, BlockId.Air, true, true);

  assert.equal(chunk.combinedMeshes.opaque, undefined, "the edited opaque layer must be detached immediately");
  assert.equal(chunk.combinedMeshes.water, water, "an unrelated water layer must stay consolidated and submitted once");
  world.dispose();
});

test("consolidation can retire a stable layer while another layer remains dirty", () => {
  const world = new ChunkWorld();
  world.reset("LAYER-STABLE-CONSOLIDATION", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  chunk.blocks.fill(BlockId.Air);
  chunk.sectionBlockCounts.fill(0);
  world.lightEngine.initializeChunk(chunk);
  world.setBlock(3, 0, 4, BlockId.Stone, false, true);
  world.setBlock(9, 20, 9, BlockId.TallGrass, false, true);
  for (let guard = 0; guard < 40 && world.processConsolidation(); guard += 1) assert.ok(guard < 39);
  const cutoutSection = Math.floor((20 - MIN_Y) / SECTION_HEIGHT);
  world.queueMesh(chunk.key, cutoutSection);
  const submittedBefore = world.terrainBufferPipeline.diagnostics().submitted;

  world.setBlock(3, 0, 4, BlockId.Air, true, true);
  assert.equal(world.processConsolidation(), true, "dirty cutout work must not hold a stable opaque snapshot hostage");
  assert.equal(world.terrainBufferPipeline.diagnostics().submitted, submittedBefore + 1);
  world.dispose();
});

test("bounded queue aging promotes old nearby work without overtaking the immediate ring", () => {
  const world = new ChunkWorld();
  world.reset("BOUNDED-AGE-PROMOTION", undefined, { structures: false });
  world.playerChunkX = 0;
  world.playerChunkZ = 0;
  for (const cx of [1, 2, 4]) world.generateChunk(cx, 0);
  const now = performance.now();
  world.meshEnqueuedAt.set("4,0:0", now - 60_000);
  world.meshEnqueuedAt.set("2,0:0", now);
  world.meshEnqueuedAt.set("1,0:0", now);
  const compare = (world as unknown as {
    compareMeshPriority(left: { key: string; section: number }, right: { key: string; section: number }): number;
  }).compareMeshPriority.bind(world);

  assert.ok(compare({ key: "4,0", section: 0 }, { key: "2,0", section: 0 }) < 0, "aged mid-ring work should pass newer mid-ring work");
  assert.ok(compare({ key: "4,0", section: 0 }, { key: "1,0", section: 0 }) > 0, "aged work must remain behind the immediate ring");
  world.dispose();
});

test("terrain consolidation defers unstable chunks and queue debt drops reconciled timestamps", () => {
  const world = new ChunkWorld();
  world.reset("STABLE-CONSOLIDATION-DEBT", undefined, { structures: false });
  const chunk = world.generateChunk(0, 0);
  const sections = [...chunk.sectionBlockCounts.keys()].filter((section) => chunk.sectionBlockCounts[section] > 0);
  assert.ok(sections.length >= 2);
  world.rebuildSection(chunk, sections[0]);
  world.queueMesh(chunk.key, sections[1]);
  assert.equal(world.processConsolidation(), false, "a dirty source section must prevent an intermediate worker merge");
  assert.equal(world.terrainBufferPipeline.diagnostics().submitted, 0);
  world.cancelQueuedMesh(chunk.key, sections[1]);
  world.rebuildSection(chunk, sections[1]);
  world.flushLightSections(256);
  assert.equal(world.processConsolidation(), true);

  world.generationEnqueuedAt.set("99,99", performance.now() - 60_000);
  world.meshEnqueuedAt.set("99,99:0", performance.now() - 60_000);
  world.lightInitializationQueued.add("99,99");
  world.lightInitializationEnqueuedAt.set("99,99", performance.now() - 60_000);
  world.scheduleAround(0, 0, true, 0);
  assert.equal(world.generationEnqueuedAt.has("99,99"), false);
  assert.equal(world.meshEnqueuedAt.has("99,99:0"), false);
  assert.equal(world.lightInitializationEnqueuedAt.has("99,99"), false);
  assert.ok(world.streamingDiagnostics().debt.oldestNearJobMilliseconds < 60_000);
  world.dispose();
});
