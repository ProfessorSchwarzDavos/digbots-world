import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createAirZoneState, discoverAirZone, stepAirZone, totalAirGas, type AirPoint, type AirZoneState } from "../app/game/airzone";
import { VoxelEngine, type SavedCreature } from "../app/game/engine";
import { MOB_DEFS, type MobKind } from "../app/game/mobs";
import { habitatOccupantBreathes, habitatOccupantOxygenDemand, normalizeHabitatExposure, stepHabitatOccupantExposure } from "../app/game/pressure-occupants";

const topology = discoverAirZone({ epochs: { locationId: "occupant-test", generation: 1, topologyRevision: 1, requestId: 1 },
  seed: { x: 0, y: 0, z: 0 }, cells: [{ x: 0, y: 0, z: 0, passable: true, sealMask: 63, controllerIds: ["life"] }] });
const safe = createAirZoneState(topology, { oxygenMilliMoles: 8700, inertMilliMoles: 32800, co2MilliMoles: 10 });
const vacuum = createAirZoneState(topology);
const depleted = createAirZoneState(topology, { oxygenMilliMoles: 0, inertMilliMoles: 41000, co2MilliMoles: 0 });
const step = (kind: MobKind, zone: AirZoneState | undefined, exposureSeconds = 0, elapsedSeconds = 20, isHost = true) =>
  stepHabitatOccupantExposure({ definition: MOB_DEFS[kind], zone, exposureSeconds, elapsedSeconds, isHost });

test("ordinary animal and NPC accumulate a bounded grace then damage in depleted air and vacuum", () => {
  for (const kind of ["woolhorn", "hobbit-farmer"] as const) for (const zone of [vacuum, depleted]) {
    assert.deepEqual(step(kind, zone, 0, 15), { exposureSeconds: 15, damage: 0 });
    assert.deepEqual(step(kind, zone, 15, 3), { exposureSeconds: 15, damage: 3 });
    assert.deepEqual(step(kind, zone, 0, 18), { exposureSeconds: 15, damage: 3 });
  }
});

test("safe air immediately arrests damage and restores the grace, including a leaking breathable room", () => {
  assert.deepEqual(step("woolhorn", safe, 15, 2), { exposureSeconds: 11, damage: 0 });
  assert.deepEqual(step("hobbit-farmer", { ...safe, status: "leaking" }, 15, 8), { exposureSeconds: 0, damage: 0 });
  assert.equal(step("woolhorn", { ...safe, co2MilliMoles: 1000 }, 15, 1).damage, 1);
  assert.equal(step("woolhorn", { ...safe, pressureMilliKPa: 170000 }, 15, 1).damage, 1);
});

test("authored nonbreathers and aquatic movement have neither room oxygen demand nor exposure", () => {
  for (const definition of Object.values(MOB_DEFS).filter(d => d.family === "construct" || d.family === "undead" || d.family === "summon" || d.movement === "aquatic" || d.kind === "rattlekin")) {
    assert.equal(habitatOccupantBreathes(definition), false, definition.kind);
    assert.equal(habitatOccupantOxygenDemand(definition), 0, definition.kind);
    assert.deepEqual(step(definition.kind, vacuum, 15, 20), { exposureSeconds: 0, damage: 0 }, definition.kind);
  }
});

test("guest, absent room and unresolved topology do not simulate dose or damage", () => {
  assert.deepEqual(step("woolhorn", vacuum, 9, 100, false), { exposureSeconds: 9, damage: 0 });
  for (const zone of [undefined, ...(["unknown", "checking", "over-capacity"] as const).map(status => ({ ...vacuum, status }))])
    assert.deepEqual(step("woolhorn", zone, 9, 100), { exposureSeconds: 9, damage: 0 });
  for (const dt of [NaN, Infinity, -1, 0]) assert.deepEqual(step("woolhorn", vacuum, 9, dt), { exposureSeconds: 9, damage: 0 });
});

test("exposure is frame-partition independent and old or malformed saves normalize safely", () => {
  let exposure = 0, damage = 0;
  for (let i = 0; i < 100; i++) { const result = step("woolhorn", vacuum, exposure, .2); exposure = result.exposureSeconds; damage += result.damage; }
  assert.ok(Math.abs(damage - step("woolhorn", vacuum).damage) < 1e-9);
  for (const value of [undefined, null, "12", NaN, Infinity, -10]) assert.equal(normalizeHabitatExposure(value), 0);
  assert.equal(normalizeHabitatExposure(100), 15);
  assert.equal(normalizeHabitatExposure(12.5), 12.5);
});

test("health evaluation leaves all gas untouched; existing runtime reaction alone accounts O2 to CO2", () => {
  const before = structuredClone(safe);
  const kinds = ["woolhorn", "hobbit-farmer", "zombie", "reliquary-sentinel"] as const;
  for (const kind of kinds) step(kind, safe, 15, 100);
  assert.deepEqual(safe, before);
  const result = stepAirZone(safe, { consumers: kinds.map(kind => ({ id: kind, kind: "creature" as const,
    oxygenMilliMoles: habitatOccupantOxygenDemand(MOB_DEFS[kind]), co2MilliMoles: habitatOccupantOxygenDemand(MOB_DEFS[kind]) })) });
  assert.equal(result.consumedOxygenMilliMoles, 4);
  assert.equal(result.producedCo2MilliMoles, 4);
  assert.equal(totalAirGas(result.state), totalAirGas(before));
  assert.equal(result.state.thermalEnergyMilliJ, before.thermalEnergyMilliJ);
});

type Mob = Parameters<VoxelEngine["serializeCreature"]>[0];
type TestEngine = { updateHabitatOccupantHealth(dt: number): void };
function engineFixture(kind: MobKind, zone: AirZoneState | undefined = vacuum) {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const mob = { id: 7, kind, definition: MOB_DEFS[kind], name: MOB_DEFS[kind].name, health: 20, maxHealth: 20,
    group: new THREE.Group(), hurtTimer: 0, age: 0, angle: 0, progression: { level: 1 }, resolvedTypes: { types: ["neutral"] },
    typeSources: [], combatStatuses: [], threatLedger: [], creatureEquipment: {}, followDistance: "dynamic", followCommand: "follow" } as unknown as Mob;
  engine.mobs = [mob]; engine.capturePacification = new Map();
  const points: unknown[] = [];
  engine.pressureRuntime = { zoneAt: (point: AirPoint) => { points.push(point); return zone; } } as unknown as VoxelEngine["pressureRuntime"];
  const deaths: Mob[] = [];
  Object.assign(engine, { worldSimulationSeconds: () => 42, killMob: (dead: Mob) => { deaths.push(dead); engine.mobs = engine.mobs.filter(entry => entry !== dead); } });
  return { engine, mob, deaths, points, advance: (dt: number) => (engine as unknown as TestEngine).updateHabitatOccupantHealth(dt) };
}

test("actual host hook applies real combat health mutations with environmental credit and existing death dispatch", () => {
  for (const kind of ["woolhorn", "hobbit-farmer"] as const) {
    const f = engineFixture(kind);
    f.advance(15); assert.equal(f.mob.health, 20);
    f.advance(3); assert.ok(f.mob.health < 20);
    assert.equal(f.mob.group.userData.cardforgeLastPlayerAttackerId, undefined);
    assert.equal(f.mob.threatLedger[0]?.source.kind, "environment");
    assert.deepEqual(f.points[0], { x: 0, y: 1, z: 0 });
    f.advance(100); assert.equal(f.deaths.length, 1); assert.equal(f.mob.health, 0);
  }
});

test("actual guest hook is inert and safe-room recovery never heals lost hit points", () => {
  const guest = engineFixture("woolhorn"); guest.engine.multiplayer = { role: "guest" } as VoxelEngine["multiplayer"];
  guest.advance(100); assert.equal(guest.mob.health, 20); assert.equal(guest.points.length, 0);
  const recovered = engineFixture("woolhorn", safe); recovered.mob.habitatExposureSeconds = 15; recovered.mob.health = 7;
  recovered.advance(8); assert.equal(recovered.mob.health, 7); assert.equal(recovered.mob.habitatExposureSeconds, 0);
  const outdoor = engineFixture("woolhorn", undefined);
  outdoor.engine.pressureRuntime = { zoneAt: () => undefined } as unknown as VoxelEngine["pressureRuntime"];
  outdoor.advance(100); assert.equal(outdoor.mob.health, 20);
});

test("actual serialize and restore boundary preserves dose so reload does not replenish grace", () => {
  const f = engineFixture("woolhorn"); f.advance(14);
  const saved = JSON.parse(JSON.stringify(f.engine.serializeCreature(f.mob))) as SavedCreature;
  assert.equal(saved.habitatExposureSeconds, 14);
  Object.assign(f.engine, { bodyContext: () => ({ environment: { gravityG: 0 } }), world: {}, spawnMob: () => f.mob });
  f.mob.habitatExposureSeconds = 0;
  assert.equal(f.engine.restoreCreature(saved)?.habitatExposureSeconds, 14);
  f.advance(2); assert.ok(f.mob.health < 20);
  assert.equal(f.engine.restoreCreature({ ...saved, habitatExposureSeconds: NaN })?.habitatExposureSeconds, 0);
});
