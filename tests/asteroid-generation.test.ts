import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data";
import { createAsteroidRegistry, asteroidBlockAt } from "../app/game/asteroid-custody";
import { celestialTerrainSeed, createCelestialTerrain, normalizeCelestialGenerationState } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { ChunkWorld, GENERATOR_VERSION } from "../app/game/world";
import { captureAsteroidEdits, prepareAsteroidLocation } from "../app/game/asteroid-runtime";
import { VoxelEngine } from "../app/game/engine";
import { validatePayload, type WorldSnapshot } from "../app/game/multiplayer";
import { TERRAIN_WORKER_PROTOCOL, type TerrainGenerationRequest, type TerrainGenerationResult } from "../app/game/terrain-generation-pipeline";

const seed = "CF6-EXPANDED-FIELD", home = homeLocation(universeId("expanded-field"));
const orbit = locationAddress({ ...home, kind: "orbit", instanceId: "high" });
const field = createAsteroidRegistry(orbit, celestialTerrainSeed(seed), 1);
const outer = field.asteroids.find(entry => Math.abs(entry.descriptor.center.x) > 128)!;
const stamp = (address = orbit) => ({ locationId: locationId(address), epoch: 1, revision: 0 });
const reset = (world: ChunkWorld, address = orbit, expansionLevel = 1) =>
  world.reset(seed, undefined, undefined, undefined, stamp(address), { expansionLevel });

test("expanded canonical field reaches actual ChunkWorld generation and cache identity", () => {
  const world = new ChunkWorld(), point = outer.descriptor.center;
  const key = () => Reflect.get(world, "chunkCacheKey").call(world, `${Math.floor(point.x / 16)},${Math.floor(point.z / 16)}`);
  try {
    reset(world, orbit, 0); const originalKey = key();
    reset(world); world.generateChunk(Math.floor(point.x / 16), Math.floor(point.z / 16));
    assert.equal(world.celestialTerrain?.expansionLevel, 1);
    assert.notEqual(key(), originalKey, "old empty cached chunks must not hide unlocked rock");
    assert.equal(world.getBlock(point.x, point.y, point.z), asteroidBlockAt(field, outer.descriptor.id, { x: 0, y: 32, z: 0 }));
    assert.notEqual(world.getBlock(point.x, point.y, point.z), BlockId.Air);
    world.setBlock(point.x, point.y, point.z, BlockId.Air);
    const saved = captureAsteroidEdits({ schema: 1, fields: { [locationId(orbit)]: field } }, orbit, world.serializeEdits());
    const cold = prepareAsteroidLocation(JSON.parse(JSON.stringify(saved)), orbit, seed, {});
    world.reset(seed, cold.edits, undefined, undefined, stamp(), { expansionLevel: cold.registry!.expansionLevel });
    world.generateChunk(Math.floor(point.x / 16), Math.floor(point.z / 16));
    assert.equal(world.getBlock(point.x, point.y, point.z), BlockId.Air, "expanded-field extraction remains depleted after cold generation");
  } finally { world.dispose(); }
});

test("generation state is exact and surface expansion/band confusion fails closed", () => {
  assert.deepEqual(normalizeCelestialGenerationState(undefined, home), { expansionLevel: 0 });
  for (const value of [null, {}, { expansionLevel: 1, claims: [] }, { expansionLevel: "1" }]) assert.throws(() => normalizeCelestialGenerationState(value), /expansion/);
  assert.throws(() => normalizeCelestialGenerationState({ expansionLevel: 1 }, home), /expansion/);
  assert.throws(() => createCelestialTerrain({ location: orbit, seed: 1, band: "low" }), /canonical/);
});

const snapshot: WorldSnapshot = { tick: 1, seed, generatorVersion: GENERATOR_VERSION, players: [], blockEdits: [], mobs: [], drops: [],
  mobScope: { centerPlayerId: "guest-expanded", radius: 64, epoch: 1 }, dropScope: { centerPlayerId: "guest-expanded", radius: 64, epoch: 1 },
  time: { tick: 1, worldTime: .2, day: 1, weather: "clear" } };
test("public snapshots accept only bounded generation state, never claim data", () => {
  assert.equal(validatePayload("snapshot", snapshot), true, "legacy missing context defaults to level zero");
  for (const expansionLevel of [0, 1, 2, 3]) assert.equal(validatePayload("snapshot", { ...snapshot, celestialGeneration: { expansionLevel } }), true);
  for (const celestialGeneration of [{ expansionLevel: 4 }, { expansionLevel: 1, claims: field.asteroids }, null])
    assert.equal(validatePayload("snapshot", { ...snapshot, celestialGeneration }), false);
});
test("guest rejects invalid surface expansion before clearing its active entities", () => {
  const engine = Object.assign(Object.create(VoxelEngine.prototype), { multiplayer: { locationScope: stamp(home) }, multiplayerState: { error: null },
    resetLocationRuntime: () => assert.fail("invalid generation state must not destroy active runtime") }) as VoxelEngine;
  Reflect.get(engine, "applyInitialWorldSnapshot").call(engine, { ...snapshot, celestialGeneration: { expansionLevel: 1 } }, { identity: { id: "host" } });
  assert.match(engine.multiplayerState.error!, /expansion/);
});

test("actual worker entry generates byte-identical expanded high-band terrain", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "self"), world = new ChunkWorld();
  const messages: { type: string; protocol?: number; result?: TerrainGenerationResult; message?: string }[] = [];
  const worker = { postMessage: (data: typeof messages[number]) => messages.push(data), onmessage: null as null | ((event: { data: { id: number; request: TerrainGenerationRequest } }) => void) };
  Object.defineProperty(globalThis, "self", { configurable: true, value: worker });
  try {
    await import("../app/game/terrain-generation-worker");
    assert.equal(messages[0].protocol, TERRAIN_WORKER_PROTOCOL);
    reset(world); const p = outer.descriptor.center, cx = Math.floor(p.x / 16), cz = Math.floor(p.z / 16), expected = world.generateChunk(cx, cz);
    worker.onmessage!({ data: { id: 1, request: { namespace: "expanded-high", seedText: seed, locationScope: stamp(), celestialGeneration: { expansionLevel: 1 },
      generationOptions: {}, key: `${cx},${cz}`, cx, cz, edits: [] } } });
    assert.equal(messages.at(-1)!.type, "result", messages.at(-1)!.message);
    assert.deepEqual(messages.at(-1)!.result!.blocks, expected.blocks);
    assert.deepEqual(messages.at(-1)!.result!.heightmap, expected.heightmap);
  } finally {
    world.dispose(); if (previous) Object.defineProperty(globalThis, "self", previous); else delete (globalThis as { self?: unknown }).self;
  }
});

test("canonical non-low asteroid frame infers its own band and expansion", () => {
  const world = new ChunkWorld(), local = locationAddress({ ...orbit, kind: "asteroid", instanceId: outer.descriptor.id });
  try {
    reset(world, local); world.generateChunk(0, 0);
    assert.equal(world.celestialTerrain?.band, "high");
    assert.equal(world.getBlock(0, 32, 0), asteroidBlockAt(field, outer.descriptor.id, { x: 0, y: 32, z: 0 }));
  } finally { world.dispose(); }
});

test("invalid generation state rejects before destroying the current world", () => {
  const world = new ChunkWorld();
  try {
    reset(world, home, 0); world.generateChunk(0, 0); const chunk = world.chunks.get("0,0"), scope = world.locationScope;
    for (const expansionLevel of [-1, 4, 1.5, NaN]) assert.throws(() => reset(world, orbit, expansionLevel), /expansion/i);
    assert.equal(world.chunks.get("0,0"), chunk); assert.deepEqual(world.locationScope, scope);
  } finally { world.dispose(); }
});
