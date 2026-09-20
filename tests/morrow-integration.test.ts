import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { Item, RECIPES, type InventorySlot } from "../app/game/data";
import { VoxelEngine } from "../app/game/engine";
import { BlockId } from "../app/game/data";
import { MORROW_MOB_KINDS } from "../app/game/morrow-ecology";
import { MOB_DEFS, MOB_ORDER } from "../app/game/mobs";
import { createMobVisual } from "../app/game/mob-models";
import { creatureProfile } from "../app/game/creature-profiles";
import { creatureEcologyContract } from "../app/game/creature-ecology";
import { habitatOccupantOxygenDemand } from "../app/game/pressure-occupants";
import { captureLanternJar, readLanternJar } from "../app/game/lantern-jar";
import { createAirZoneState, discoverAirZone } from "../app/game/airzone";
import { type CreatureMetadata } from "../app/game/creature-cage";
import { migrateCreatureProgression } from "../app/game/creature-progression";

const specimen: CreatureMetadata = { schema: 1, entityId: "lantern-original", kind: "vacuum-lantern", health: 7, maxHealth: 12,
  ageTicks: 12345, baby: false, temperament: "Gentle", hostile: false, tamed: false, ownerId: null,
  name: "Low Light", geneticSeed: 4321, command: null, custom: { nested: { retained: [1, "exact", true] }, morrowExposure: { exposureSeconds: 0, veilSeconds: 0 } } };
const topology = discoverAirZone({ epochs: { locationId: "morrow-jar", generation: 1, topologyRevision: 1, requestId: 1 },
  seed: { x: 0, y: 0, z: 0 }, cells: [{ x: 0, y: 0, z: 0, passable: true, sealMask: 63, controllerIds: ["life"] }] });
const safe = createAirZoneState(topology, { oxygenMilliMoles: 8700, inertMilliMoles: 32800, co2MilliMoles: 10 });

test("all four production registries dispatch authored bounded models and explicit profiles", () => {
  for (const kind of MORROW_MOB_KINDS) {
    assert.ok(MOB_ORDER.includes(kind));
    assert.equal(creatureProfile(kind).authorship, "explicit");
    assert.ok(creatureProfile(kind).moves.basicMoveId);
    assert.equal(creatureEcologyContract(kind).authorship, "explicit");
    const model = createMobVisual(kind, 4), bounds = new THREE.Box3().setFromObject(model.group);
    assert.equal(model.visual.userData.wildlifeRig, kind);
    assert.ok(Math.abs(bounds.min.y) < .025, `${kind} authored ground`);
    assert.equal(MOB_DEFS[kind].footOffset, .5, "ground-center plus half block reaches surface");
    if (kind !== "morrow-owl") assert.equal(habitatOccupantOxygenDemand(MOB_DEFS[kind]), 0);
  }
});

test("normal jar recipe and exact metadata custody never create stacked or malformed specimens", () => {
  assert.ok(RECIPES.some(recipe => recipe.output.item === Item.SpecimenJar));
  const empty = { item: Item.SpecimenJar, count: 1 }, filled = captureLanternJar(empty, specimen, "jar-1", 123)!;
  assert.deepEqual(readLanternJar(filled), specimen); assert.equal(empty.item, Item.SpecimenJar);
  const copy = readLanternJar(filled)!; copy.name = "changed"; assert.equal(readLanternJar(filled)!.name, "Low Light");
  assert.equal(captureLanternJar({ ...empty, count: 2 }, specimen, "bad", 123), null);
  assert.equal(readLanternJar({ ...filled, count: 2 }), null);
  assert.equal(readLanternJar({ item: Item.VacuumLanternJar, count: 1 }), null);
});

test("actual host jar action checks both room locations and retires only after inventory custody", () => {
  const messages: string[] = [], mob = { id: 1, kind: "vacuum-lantern", health: 7, group: new THREE.Group(), specimenId: specimen.entityId,
    progression: migrateCreatureProgression({ kind: "vacuum-lantern", entityId: 1, maximumLevel: 50, defaultMoveIds: [] }) };
  let removed = false;
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    inventory: [{ item: Item.SpecimenJar, count: 1 }] as (InventorySlot | null)[], selected: 0, position: new THREE.Vector3(),
    targetMob: mob, mobs: [mob], sleepingCreatures: [], multiplayer: null, bestiary: {},
    events: { onToast: (message: string) => messages.push(message) }, localPlayerId: () => "local",
    pressureRuntime: { zoneAt: () => undefined }, creatureMetadataForMob: () => specimen,
    grantCardforgeCapture: () => {}, dispatchGuildEvent: () => {}, saveSoon: () => {}, emitHud: () => {},
    removeMob: () => { assert.equal(engine.inventory[0]?.item, Item.VacuumLanternJar); removed = true; },
  }) as VoxelEngine;
  assert.equal(engine.useLanternJar(), true); assert.equal(removed, false);
  assert.equal(engine.inventory[0]?.item, Item.SpecimenJar); assert.match(messages.at(-1)!, /same sealed room/);
  Reflect.set(engine, "pressureRuntime", { zoneAt: (point: { x: number }) => point.x === 0 ? safe : { ...safe, zoneId: "other" } });
  mob.group.position.x = 1;
  engine.useLanternJar(); assert.equal(removed, false, "separate breathable rooms do not qualify");
  Reflect.set(engine, "multiplayer", { role: "guest" }); engine.useLanternJar(); assert.equal(removed, false);
  assert.match(messages.at(-1)!, /host keeper/);
  Reflect.set(engine, "multiplayer", null); Reflect.set(engine, "pressureRuntime", { zoneAt: () => safe });
  engine.useLanternJar(); assert.equal(removed, true); assert.equal(engine.inventory[0]?.item, Item.VacuumLanternJar);
  assert.equal(mob.progression.captureHistory.captureCount, 1);
  const filled = structuredClone(engine.inventory[0]);
  Object.assign(engine, { target: null, camera: new THREE.PerspectiveCamera(), spawnCreatureMetadata: () => null, mobs: [] });
  engine.useLanternJar(); assert.deepEqual(engine.inventory[0], filled, "blocked release retains exact custody");
  let released: CreatureMetadata | null = null;
  Reflect.set(engine, "spawnCreatureMetadata", (value: CreatureMetadata) => { released = value; return {}; });
  engine.useLanternJar(); assert.deepEqual(released, specimen); assert.equal(engine.inventory[0]?.item, Item.SpecimenJar);
});

test("native moon spawn dispatch never falls through to Home fauna or hostile tables", () => {
  const calls: unknown[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), { world: { celestialTerrain: { kind: "morrow" } },
    trySpawnMorrowMob: (focus: unknown) => calls.push(focus), bodyContext: () => { throw Error("Home ecology leaked"); } }) as VoxelEngine;
  engine.trySpawnMob("passive"); engine.trySpawnMob("hostile"); assert.equal(calls.length, 1);
});

test("indoor jar release stays below the ceiling and rejects blocked or unloaded footprints", () => {
  let blocked = false, missing = false;
  const engine = Object.assign(Object.create(VoxelEngine.prototype), { world: {
    findWalkableY: () => { throw Error("Top-down release would teleport through the habitat roof"); },
    getBlock: (_x: number, y: number) => missing ? undefined
      : y === 32 || y === 36 || blocked && y === 33 ? BlockId.StoneBrick : BlockId.Air,
  } }) as VoxelEngine;
  assert.deepEqual(engine.creatureReleasePosition(specimen, new THREE.Vector3(8, 33, 0))?.toArray(), [8, 32.5, 0]);
  blocked = true;
  assert.equal(engine.creatureReleasePosition(specimen, new THREE.Vector3(8, 33, 0)), null);
  blocked = false; missing = true;
  assert.equal(engine.creatureReleasePosition(specimen, new THREE.Vector3(8, 33, 0)), null);
  assert.equal(engine.creatureReleasePosition(specimen, new THREE.Vector3(NaN, 33, 0)), null);
});

test("actual Owl controller makes bounded crossings and rests on its real dream refuge", () => {
  const mob = { id: 1, kind: "morrow-owl", definition: MOB_DEFS["morrow-owl"], group: new THREE.Group(), health: 20,
    morrowExposure: { exposureSeconds: 0, veilSeconds: 8 }, morrowRoost: { x: -120, y: .5, z: 120 },
    age: 0, state: "recover", hurtTimer: 0, angle: 0, baseY: .5 };
  mob.group.position.set(-120, .5, 120);
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    mobs: [mob], multiplayer: null, pressureRuntime: { zoneAt: () => undefined },
    bodyContext: () => ({ home: false, environment: { breathable: false, gravityG: .19 } }),
    world: { celestialTerrain: { kind: "morrow" }, surfaceAt: () => 0, getBlock: (_x: number, y: number) => y === 0 ? BlockId.RuneStone : BlockId.Air },
    mobTerrainClearAt: () => true, animateMob: () => {}, refreshMobSpatialEntry: () => {}, markPersistenceDirty: () => {},
    applyCombatDamageToMob: (_mob: unknown, damage: number) => { mob.health -= damage; }, killMob: () => {},
  }) as VoxelEngine;
  const flight = Reflect.get(engine, "updateMorrowOwl").bind(engine), exposure = Reflect.get(engine, "updatePlanetaryCreatureHealth").bind(engine);
  let airborne = false, rested = false, minimumVeil = 8;
  for (let frame = 0; frame < 1000; frame++) {
    mob.age += .05; flight(mob, .05); exposure(.05);
    airborne ||= mob.group.position.y > .8; rested ||= mob.age > 8 && mob.state === "recover" && mob.morrowExposure.veilSeconds === 8;
    minimumVeil = Math.min(minimumVeil, mob.morrowExposure.veilSeconds);
    assert.ok(mob.group.position.distanceTo(new THREE.Vector3(-120, .5, 120)) <= 3.3);
  }
  assert.ok(airborne); assert.ok(rested); assert.ok(minimumVeil < 7); assert.equal(mob.health, 20);
  Reflect.set(engine, "world", { celestialTerrain: { kind: "morrow" }, surfaceAt: () => 0, getBlock: () => BlockId.PaleRegolith });
  for (let i = 0; i < 40; i++) exposure(1);
  assert.ok(mob.health < 20, "ordinary lunar soil does not replenish a refuge");
});

test("actual Slatefin moves inside loose regolith without destroying voxels or entering stone", () => {
  const mob = { id: 3, kind: "slatefin-burrower", definition: MOB_DEFS["slatefin-burrower"], group: new THREE.Group(),
    age: 0, state: "wander", hurtTimer: 0, angle: 0, desiredAngle: 0, wanderTimer: 2, baseY: .5 };
  mob.group.position.y = .5;
  let material = BlockId.PaleRegolith;
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    position: new THREE.Vector3(20, 1, 0), selectedSlot: () => null,
    world: { surfaceAt: () => 0, getBlock: (_x: number, y: number) => y <= 0 ? material : BlockId.Air },
    animateMob: () => {}, refreshMobSpatialEntry: () => {},
  }) as VoxelEngine;
  const step = Reflect.get(engine, "updateSlatefinBurrower").bind(engine);
  step(mob, .1); assert.ok(mob.group.position.x > 0); assert.ok(mob.group.position.y < 0);
  material = BlockId.Stone; step(mob, .1);
  assert.equal(mob.group.position.y, .5, "emerges onto hard stone instead of swimming through it");
});
