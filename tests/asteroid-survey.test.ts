import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine, type WorldSave } from "../app/game/engine";
import { BlockId } from "../app/game/data";
import { prepareAsteroidSurvey, type AsteroidSurveyIntent } from "../app/game/asteroid-survey";
import { createAsteroidRegistry, expandAsteroidRegistry } from "../app/game/asteroid-custody";
import { projectAsteroidEdits } from "../app/game/asteroid-runtime";
import { celestialTerrainSeed } from "../app/game/celestial-terrain";
import { homeLocation, locationId, universeId } from "../app/game/location-address";
import { createMachine } from "../app/game/wayworks";
import { workshopHeatCapacity } from "../app/game/wayworks-stores";
import { flightFixture } from "./spaceflight-fixtures";
import type { ChunkEditSave } from "../app/game/world";

function fixture() {
  const f = flightFixture("survey-fixture"), address = { ...homeLocation(universeId(f.world.metadata.id)), kind: "orbit" as const, instanceId: "low" };
  const location = locationId(address), key = "8,33,0", registry = createAsteroidRegistry(address, celestialTerrainSeed(f.world.save.seed));
  const machine = createMachine("station-observatory", location, "local"); machine.energyJ = 4000; machine.workshop.heatJ = 137;
  const save: WorldSave = { ...f.world.save, spacefleet: { schema: 1, vehicles: {} }, wayworks: { [key]: machine }, asteroidFields: { schema: 1, fields: { [location]: registry } } };
  const intent: AsteroidSurveyIntent = { kind: "asteroid-survey", epoch: registry.epoch, registryRevision: registry.revision };
  return { ...f, save, location, key, registry, machine, intent };
}

test("survey expands exactly one ring and changes only the field and instrument energy/heat/revision", () => {
  const f = fixture(), original = structuredClone(f.save);
  const result = prepareAsteroidSurvey(f.save, f.location, f.key, 0, f.intent);
  const field = result.asteroidFields!.fields[f.location];
  assert.equal(field.expansionLevel, 1); assert.equal(field.asteroids.length, 60);
  for (const old of f.registry.asteroids) assert.deepEqual(field.asteroids.find(entry => entry.descriptor.id === old.descriptor.id), old);
  for (const added of field.asteroids.filter(entry => !f.registry.asteroids.some(old => old.descriptor.id === entry.descriptor.id))) {
    assert.deepEqual(added.discoveredBy, []); assert.equal(added.claim, null); assert.deepEqual(added.pages, []);
  }
  assert.deepEqual(result.wayworks![f.key], { ...f.machine, energyJ: 3000, revision: 1, workshop: { ...f.machine.workshop, heatJ: 1137 } });
  assert.deepEqual({ ...result, wayworks: original.wayworks, asteroidFields: original.asteroidFields }, original);
  assert.deepEqual(f.save, original, "pure preparation cannot charge or expand the live view");
});

test("survey rejects stale identity/revisions, insufficient energy/heat, wrong hardware and maximum extent without mutation", () => {
  const f = fixture(), run = (save = f.save, revision = 0, intent = f.intent, location = f.location) => prepareAsteroidSurvey(save, location, f.key, revision, intent);
  const original = structuredClone(f.save);
  assert.throws(() => run(f.save, 1), /Inspect/);
  assert.throws(() => run(f.save, 0, { ...f.intent, epoch: f.intent.epoch + 1 }), /stale/);
  assert.throws(() => run(f.save, 0, { ...f.intent, registryRevision: f.intent.registryRevision + 1 }), /stale/);
  assert.throws(() => run(f.save, 0, f.intent, locationId(homeLocation(universeId(f.world.metadata.id)))), /orbital/);
  for (const change of [{ energyJ: 999 }, { enabled: false }, { ownerId: "guest" }, { locationId: "foreign" }, { kind: "station-radiator" as const },
    { workshop: { ...f.machine.workshop, heatJ: workshopHeatCapacity(f.machine.workshop) - 999 } }]) {
    const save = { ...f.save, wayworks: { [f.key]: { ...f.machine, ...change } } }, before = structuredClone(save);
    assert.throws(() => run(save)); assert.deepEqual(save, before);
  }
  const max = expandAsteroidRegistry(f.registry, 3, { orbit: f.registry.orbit, seed: f.registry.seed, epoch: f.registry.epoch, expectedRevision: f.registry.revision });
  assert.throws(() => run({ ...f.save, asteroidFields: { schema: 1, fields: { [f.location]: max } } }, 0,
    { ...f.intent, epoch: max.epoch, registryRevision: max.revision }), /within 0\.\.3/);
  assert.deepEqual(f.save, original);
});

function voxelEdit(point: { x: number; y: number; z: number }, block: BlockId): ChunkEditSave {
  const { x, y, z } = point, cx = Math.floor(x / 16), cz = Math.floor(z / 16);
  return { [`${cx},${cz}`]: [[(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, block]] };
}

test("survey captures existing construction newly covered by the ring without charging twice or rewriting old asteroids", () => {
  const f = fixture(), expanded = expandAsteroidRegistry(f.registry, 1,
    { orbit: f.registry.orbit, seed: f.registry.seed, epoch: f.registry.epoch, expectedRevision: f.registry.revision });
  const added = expanded.asteroids.find(entry => !f.registry.asteroids.some(old => old.descriptor.id === entry.descriptor.id))!;
  f.save.edits = { ...f.save.edits, ...voxelEdit(added.descriptor.center, BlockId.ReinforcedWindow) };
  const before = structuredClone(f.save), result = prepareAsteroidSurvey(f.save, f.location, f.key, 0, f.intent);
  const field = result.asteroidFields!.fields[f.location];
  assert.deepEqual(projectAsteroidEdits(field, field.orbit, f.save.edits), f.save.edits);
  assert.ok(field.asteroids.find(entry => entry.descriptor.id === added.descriptor.id)!.pages.length > 0);
  for (const old of f.registry.asteroids) assert.deepEqual(field.asteroids.find(entry => entry.descriptor.id === old.descriptor.id), old);
  assert.equal(result.wayworks![f.key].energyJ, 3000); assert.equal(result.wayworks![f.key].workshop.heatJ, 1137);
  assert.deepEqual(result.inventory, before.inventory); assert.deepEqual(f.save, before);
  assert.deepEqual(prepareAsteroidSurvey(f.save, f.location, f.key, 0, f.intent), result, "same candidate is deterministic");
});

test("survey refuses uncheckpointed old asteroid edits before any instrument debit", () => {
  const f = fixture(); f.save.edits = { ...f.save.edits, ...voxelEdit(f.registry.asteroids[0].descriptor.center, BlockId.Air) };
  const before = structuredClone(f.save);
  assert.throws(() => prepareAsteroidSurvey(f.save, f.location, f.key, 0, f.intent), /Checkpoint existing asteroid/);
  assert.deepEqual(f.save, before);
});

function engineFixture() {
  const f = fixture(), calls: string[] = [], messages: string[] = [], attempts: { save: WorldSave; id: string }[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    persistent: true, activeWorldId: f.world.metadata.id, multiplayer: null, locationTransitioning: false, spaceflightBusy: false,
    pendingSpaceArrival: null, pendingFieldSurvey: null, running: true, paused: true, gameplayOverlayOpen: true,
    spacefleet: f.save.spacefleet, asteroidFields: f.save.asteroidFields, activeWayworksKey: f.key,
    wayworks: new Map([[f.key, f.machine]]), position: new THREE.Vector3(8, 32.5, 2),
    world: { locationScope: { locationId: f.location }, getBlock: () => BlockId.StationObservatory },
    stationActorAccess: () => true, events: { onToast: (s: string) => messages.push(s) }, emitHud: () => {}, reportPersistence: () => {},
    saveNow: async () => { calls.push("save-origin"); return true; }, serialize: () => structuredClone(f.save),
    loadWorld: () => { calls.push("load"); },
    worldStorage: { commitReloadCheckpoint: async (_worldId: string, save: WorldSave, id: string) => {
      calls.push("commit"); attempts.push(structuredClone({ save, id })); return { ok: true, value: { ...f.world, save } };
    }, acknowledgeReloadCheckpoint: () => { calls.push("ack"); } },
  }) as VoxelEngine;
  return { ...f, engine, calls, messages, attempts };
}

test("ordinary engine survey checks actual host hardware/permission and only loads after commit", async () => {
  const f = engineFixture();
  assert.equal(await f.engine.spaceflightAction(f.intent), false);
  Reflect.set(f.engine, "stationActorAccess", () => false); assert.equal(await f.engine.spaceflightAction(f.intent, 0), false);
  Reflect.set(f.engine, "stationActorAccess", () => true);
  f.engine.position.x += 10; assert.equal(await f.engine.spaceflightAction(f.intent, 0), false); f.engine.position.x -= 10;
  for (const role of ["guest", "host"]) {
    Reflect.set(f.engine, "multiplayer", { role }); assert.equal(await f.engine.spaceflightAction(f.intent, 0), false);
  }
  Reflect.set(f.engine, "multiplayer", null);
  assert.deepEqual(f.calls, []); assert.equal(await f.engine.spaceflightAction(f.intent, 0), true, f.messages.at(-1));
  assert.deepEqual(f.calls, ["save-origin", "commit", "load", "ack"]);
  assert.deepEqual(f.attempts[0].save, prepareAsteroidSurvey(f.save, f.location, f.key, 0, f.intent));
  assert.equal(f.engine.fieldSurveyPending, false); assert.equal(f.engine.running, true);
});

for (const failure of ["commit", "load"] as const) test(`engine ${failure} failure freezes old runtime, blocks overwrites and retries the exact paid candidate`, async () => {
  const f = engineFixture(); let first = true;
  Reflect.set(f.engine, "serialize", () => f.save); // Runtime serializers may return nested live metadata.
  const originalCommit = f.engine.worldStorage.commitReloadCheckpoint;
  f.engine.worldStorage.commitReloadCheckpoint = async (...args) => {
    const result = await originalCommit(...args);
    if (failure === "commit" && first) { first = false; return { ok: false, error: { code: "unavailable", message: "Injected uncertain acknowledgement" } }; }
    return result;
  };
  f.engine.loadWorld = () => { f.calls.push("load"); if (failure === "load" && first) { first = false; throw Error("Injected hydration failure"); } };
  assert.equal(await f.engine.spaceflightAction(f.intent, 0), false);
  assert.equal(f.engine.fieldSurveyPending, true); assert.equal(f.engine.running, false); assert.equal(f.engine.paused, true);
  f.save.chests["3,40,-2"]![0]!.count = 999;
  assert.equal(await VoxelEngine.prototype.saveNow.call(f.engine, false), false);
  assert.equal(await f.engine.spaceflightAction(f.intent, 0), false);
  assert.equal(f.engine.workshopAction({ kind: "crank" }, 0), false);
  f.engine.activate(); assert.equal(f.engine.running, false);
  assert.equal(await VoxelEngine.prototype.saveNow.call(f.engine, true), true, "normal Retry checkpoint is the recovery control");
  assert.deepEqual(f.attempts[0], f.attempts[1]); assert.equal(f.calls.filter(call => call === "save-origin").length, 1);
  assert.equal(f.attempts[1].save.chests["3,40,-2"]![0]!.count, 11, "pending candidate cannot alias live metadata");
  assert.equal(f.calls.filter(call => call === "ack").length, 1); assert.equal(f.engine.fieldSurveyPending, false);
});

test("failed origin checkpoint neither charges nor retires the active view", async () => {
  const f = engineFixture(); f.engine.saveNow = async () => false;
  assert.equal(await f.engine.spaceflightAction(f.intent, 0), false);
  assert.deepEqual(f.calls, []); assert.equal(f.engine.running, true); assert.equal(f.engine.fieldSurveyPending, false);
});
