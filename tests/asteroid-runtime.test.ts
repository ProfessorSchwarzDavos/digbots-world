import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine } from "../app/game/engine";
import { BlockId } from "../app/game/data";
import { asteroidBlockAt, asteroidVoxelToView, applyAsteroidAction, type AsteroidAction } from "../app/game/asteroid-custody";
import { asteroidAtPoint, asteroidOrbitFor, captureAsteroidEdits, prepareAsteroidLocation, projectAsteroidEdits, remapAsteroidFields, validateAsteroidFields } from "../app/game/asteroid-runtime";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { ChunkWorld, type ChunkEditSave } from "../app/game/world";
import { composeUniverseSave, splitUniverseSave } from "../app/game/universe-save";
import { flightFixture } from "./spaceflight-fixtures";
import type { AsteroidManagementIntent } from "../app/game/spaceflight-mission";

const universe = universeId("asteroid-runtime"), orbit = locationAddress({ ...homeLocation(universe), kind: "orbit", instanceId: "low" });
const seed = "CF6-ASTEROID-RUNTIME", center = { x: 0, y: 32, z: 0 };
function fixture() {
  const prepared = prepareAsteroidLocation(undefined, orbit, seed, {}), registry = prepared.registry!;
  const asteroid = registry.asteroids[0].descriptor, point = asteroidVoxelToView(registry, asteroid.id, center, orbit);
  const address = locationAddress({ ...orbit, kind: "asteroid", instanceId: asteroid.id });
  return { ...prepared, registry, asteroid, point, address };
}
function editAt(point: { x: number; y: number; z: number }, block: BlockId): ChunkEditSave {
  const cx = Math.floor(point.x / 16), cz = Math.floor(point.z / 16);
  return { [`${cx},${cz}`]: [[(point.y + 64) * 256 + (point.z - cz * 16) * 16 + point.x - cx * 16, block]] };
}
test("asteroid fields have exactly one universe owner and strict import identity", () => {
  const f = fixture(), world = flightFixture(universe).world.save;
  world.asteroidFields = f.save;
  const parts = splitUniverseSave(world);
  assert.deepEqual(parts.universe.asteroidFields, f.save);
  assert(!("asteroidFields" in parts.location)); assert(!("asteroidFields" in parts.player));
  assert.deepEqual(composeUniverseSave(parts).asteroidFields, f.save);
  assert.throws(() => validateAsteroidFields(f.save, universeId("foreign")), /Foreign/);
  assert.throws(() => validateAsteroidFields({ ...f.save, fields: { wrong: f.registry } }), /Foreign/);
  const imported = remapAsteroidFields(f.save, universe, universeId("imported"));
  const registry = Object.values(imported.fields)[0];
  assert.equal(registry.orbit.universeId, "imported"); assert.equal(registry.epoch, f.registry.epoch + 1);
  assert.deepEqual(registry.asteroids, f.registry.asteroids);
  assert.deepEqual(validateAsteroidFields(undefined).fields, {});
});
test("old real chunk edits migrate once; canonical depletion defeats stale orbit mirrors", () => {
  const f = fixture(), mined = editAt(f.point, BlockId.Air);
  assert.notEqual(asteroidBlockAt(f.registry, f.asteroid.id, center), BlockId.Air);
  const migrated = prepareAsteroidLocation(undefined, orbit, seed, mined);
  assert.equal(asteroidBlockAt(migrated.registry!, f.asteroid.id, center), BlockId.Air);
  const stale = editAt(f.point, BlockId.GoldOre);
  const loaded = prepareAsteroidLocation(migrated.save, orbit, seed, stale);
  assert.deepEqual(loaded.edits, mined);
  assert.deepEqual(loaded.save, migrated.save);
  assert.throws(() => prepareAsteroidLocation(migrated.save, orbit, "changed", {}), /seed/);
  assert.throws(() => prepareAsteroidLocation(undefined, f.address, seed, {}), /existing orbit/);
});
test("actual ChunkWorld extraction, cold regeneration and local-frame projection share finite voxels", () => {
  const f = fixture(), world = new ChunkWorld();
  try {
    const stamp = { locationId: locationId(orbit), epoch: 1, revision: 1 };
    world.reset(seed, f.edits, undefined, undefined, stamp);
    world.generateChunk(Math.floor(f.point.x / 16), Math.floor(f.point.z / 16));
    const material = world.getBlock(f.point.x, f.point.y, f.point.z);
    assert.equal(material, asteroidBlockAt(f.registry, f.asteroid.id, center));
    assert.notEqual(material, BlockId.Air);
    world.setBlock(f.point.x, f.point.y, f.point.z, BlockId.Air);
    const saved = captureAsteroidEdits(f.save, orbit, world.serializeEdits());
    const cold = prepareAsteroidLocation(JSON.parse(JSON.stringify(saved)), orbit, seed, {});
    world.reset(seed, cold.edits, undefined, undefined, { ...stamp, revision: 2 });
    world.generateChunk(Math.floor(f.point.x / 16), Math.floor(f.point.z / 16));
    assert.equal(world.getBlock(f.point.x, f.point.y, f.point.z), BlockId.Air);
    // Coordinate projection only; no second engine-level metadata view is exposed.
    const local = projectAsteroidEdits(cold.registry!, f.address, {});
    world.reset(seed, local, undefined, undefined, { ...stamp, locationId: locationId(f.address) });
    world.generateChunk(0, 0);
    assert.equal(world.getBlock(0, 32, 0), BlockId.Air);
    world.setBlock(0, 32, 0, BlockId.StationTruss);
    const placed = captureAsteroidEdits(saved, f.address, world.serializeEdits());
    const returned = prepareAsteroidLocation(placed, orbit, seed, cold.edits);
    world.reset(seed, returned.edits, undefined, undefined, stamp);
    world.generateChunk(Math.floor(f.point.x / 16), Math.floor(f.point.z / 16));
    assert.equal(world.getBlock(f.point.x, f.point.y, f.point.z), BlockId.StationTruss);
  } finally { world.dispose(); }
});
test("checkpoint reconciliation retains claim policy and is stable without new mutations", () => {
  const f = fixture(); let registry = f.registry;
  for (const type of ["discover", "claim"] as const) {
    const request: AsteroidAction = { type, operationId: type, asteroidId: f.asteroid.id, location: orbit, epoch: registry.epoch, expectedRevision: registry.revision };
    registry = applyAsteroidAction(registry, request, { actorId: "local", location: orbit }).registry;
  }
  const save = { schema: 1 as const, fields: { [locationId(orbit)]: registry } };
  const mined = captureAsteroidEdits(save, orbit, editAt(f.point, BlockId.Air));
  const after = mined.fields[locationId(orbit)];
  assert.deepEqual(after.asteroids[0].claim, registry.asteroids[0].claim);
  assert.equal(after.epoch, registry.epoch + 1); assert.deepEqual(after.journal, []);
  assert.deepEqual(captureAsteroidEdits(mined, orbit, editAt(f.point, BlockId.Air)), mined);
});
test("bounded frame lookup respects body/band, canonical local coordinates and empty corridor", () => {
  const f = fixture();
  assert.equal(asteroidAtPoint(f.registry, f.point, orbit)?.id, f.asteroid.id);
  assert.equal(asteroidAtPoint(f.registry, center, f.address)?.id, f.asteroid.id);
  assert.equal(asteroidAtPoint(f.registry, { x: 0, y: 32, z: 0 }, orbit), null);
  assert.equal(asteroidAtPoint(f.registry, f.point, locationAddress({ ...orbit, instanceId: "high" })), null);
  assert.equal(asteroidOrbitFor(homeLocation(universe)), null);
  assert.equal(asteroidOrbitFor(locationAddress({ ...f.address, instanceId: "asteroid-moon-transfer-n2-p1" }))?.instanceId, "moon-transfer");
  assert.throws(() => captureAsteroidEdits(f.save, orbit, { "0,0": [[-1, 0]] }), /index/);
});

function engineFixture() {
  const f = fixture(), messages: string[] = [], opened: string[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    asteroidFields: f.save, orbitalStations: null, persistent: true, activeWorldId: universe, multiplayer: null,
    locationTransitioning: false, spaceflightBusy: false, pendingSpaceArrival: null,
    activeAsteroidPoint: null, position: new THREE.Vector3(f.point.x, f.point.y, f.point.z + 2),
    inventory: [{ item: BlockId.Stone, count: 7 }], events: { onToast: (message: string) => messages.push(message) },
    emitHud: () => {}, saveSoon: () => {},
    world: { locationScope: { locationId: locationId(orbit), epoch: 1, revision: 0 }, serializeEdits: () => ({}), getBlock: () => BlockId.Stone },
    openOverlay: (kind: string, key: string) => { opened.push(kind); const [x, y, z] = key.split(",").map(Number); Reflect.set(engine, "activeAsteroidPoint", { x, y, z }); },
  }) as VoxelEngine;
  const inspect = () => Reflect.get(engine, "inspectNearbyAsteroid").call(engine, f.point) as boolean;
  const access = (actor: string, permission: "build" | "extract", point = f.point) =>
    Reflect.get(engine, "stationActorAccess").call(engine, actor, point.x, point.y, point.z, permission) as boolean;
  const registry = () => engine.asteroidFields.fields[locationId(orbit)];
  const claim = (): AsteroidManagementIntent => ({ kind: "asteroid-claim", asteroidId: f.asteroid.id, epoch: registry().epoch, registryRevision: registry().revision });
  return { ...f, engine, messages, opened, inspect, access, registry, claim };
}

test("actual nearby inspector discovers only reached rock and host claim creates no materials", async () => {
  const f = engineFixture(), before = structuredClone(f.engine.inventory);
  assert.equal(f.access("local", "build"), false); assert.equal(f.access("guest", "extract"), true);
  assert.equal(await f.engine.spaceflightAction(f.claim()), false, "no active physical inspection");
  f.engine.position.z += 10; assert.equal(f.inspect(), true); assert.deepEqual(f.opened, []);
  f.engine.position.z -= 10; assert.equal(f.inspect(), true); assert.deepEqual(f.opened, ["spaceflight"]);
  assert.deepEqual(f.registry().asteroids[0].discoveredBy, ["local"]);
  assert(f.registry().asteroids.slice(1).every(entry => !entry.discoveredBy.length), "no field-wide discovery");
  const intent = f.claim(); assert.equal(await f.engine.spaceflightAction(intent), true);
  assert.equal(await f.engine.spaceflightAction(intent), false, "stale duplicate creates no second claim");
  assert.equal(f.access("local", "build"), true); assert.equal(f.access("guest", "extract"), false);
  assert.deepEqual(f.engine.inventory, before); assert(f.registry().asteroids.every(entry => !entry.pages.length));
});

test("actual claim actions fail closed for guest, stale epoch/revision, distance and missing rock", async () => {
  const f = engineFixture(); f.inspect(); const intent = f.claim(), before = f.registry();
  Reflect.set(f.engine, "multiplayer", { role: "guest", identity: { id: "guest" } });
  assert.equal(await f.engine.spaceflightAction(intent), false); Reflect.set(f.engine, "multiplayer", null);
  assert.equal(await f.engine.spaceflightAction({ ...intent, epoch: intent.epoch + 1 }), false);
  assert.equal(await f.engine.spaceflightAction({ ...intent, registryRevision: intent.registryRevision + 1 }), false);
  f.engine.position.x += 10; assert.equal(await f.engine.spaceflightAction(intent), false); f.engine.position.x -= 10;
  f.engine.world.getBlock = () => BlockId.Air; assert.equal(await f.engine.spaceflightAction(intent), false);
  assert.deepEqual(f.registry(), before);
});

test("host, authenticated peer and drone boundaries honor independent grants and revocation", async () => {
  const f = engineFixture(); f.inspect(); assert.equal(await f.engine.spaceflightAction(f.claim()), true);
  const update = (build: "owner" | "trusted" | "public", extract: "owner" | "trusted" | "public") =>
    f.engine.spaceflightAction({ ...f.claim(), kind: "asteroid-access", trustedIds: ["drone"], build, extract });
  assert.equal(await update("owner", "trusted"), true);
  assert.equal(f.access("drone", "extract"), true); assert.equal(f.access("drone", "build"), false);
  assert.equal(f.access("guest", "extract"), false);
  assert.equal(await update("trusted", "owner"), true);
  assert.equal(f.access("drone", "extract"), false); assert.equal(f.access("drone", "build"), true);
  Reflect.set(f.engine, "multiplayer", { role: "host", identity: { id: "host-network-id" } });
  assert.equal(f.access("host-network-id", "build"), true);
  assert.equal(await update("public", "public"), true); assert.equal(f.access("guest", "build"), true);
  assert.equal(await update("owner", "owner"), true); assert.equal(f.access("drone", "build"), false);
  assert.equal(f.access("drone", "build", { x: 0, y: 32, z: 0 }), true, "claim does not protect empty orbital corridor");
});

test("normal human mining rejects a foreign claim before terrain, loot or tools mutate", async () => {
  const f = engineFixture(); f.inspect(); await f.engine.spaceflightAction(f.claim());
  const foreign = structuredClone(f.registry());
  Reflect.set(foreign.asteroids[0], "claim", { ownerId: "other", trustedIds: [], build: "owner", extract: "owner" });
  Reflect.set(foreign.asteroids[0], "discoveredBy", ["local", "other"]);
  f.engine.asteroidFields = validateAsteroidFields({ schema: 1, fields: { [locationId(orbit)]: foreign } });
  Reflect.set(f.engine, "target", { ...f.point, type: BlockId.Stone });
  const before = structuredClone(f.engine.inventory); f.engine.breakTarget();
  assert.match(f.messages.at(-1)!, /not granted extraction/); assert.deepEqual(f.engine.inventory, before);
});
