import assert from "node:assert/strict";
import test from "node:test";
import { VoxelEngine } from "../app/game/engine";
import { MOB_DEFS, MOB_ORDER, type MobDefinition } from "../app/game/mobs";
import { creatureBodyBounds, creatureBodyScale, creatureFootY, creatureRuntimeBodyProfile,
  creatureRuntimeCollisionProfile, type CreatureBodyState } from "../app/game/creature-body";
import { creatureCollisionProfile, creatureBodyMass } from "../app/game/creature-pathing";
import { creatureAppearance } from "../app/game/creature-appearance";
import { PRIME_FORM_PROFILES } from "../app/game/creature-rarity";
import { husbandryAgeScale } from "../app/game/fauna";
import { shadecrawlerScale, createShadecrawlerState } from "../app/game/shadecrawler";
import { migrateCreatureProgression } from "../app/game/creature-progression";

/** Independent snapshot of pre-extraction engine formulas (626604f). */
function previousEngineGeometry(state: CreatureBodyState, definition: MobDefinition) {
  const base = state.dragonState ? state.dragonState.growthScale
    : state.leviathanGrowth ? state.leviathanGrowth.growthScale
      : state.shadeState ? shadecrawlerScale(state.shadeState)
        : husbandryAgeScale(state.kind, Boolean(state.petState?.baby || state.careState?.baby));
  const appearanceScale = state.progression ? creatureAppearance(state.kind, state.progression).sizeScale : 1;
  const primeScale = state.progression?.rarityForm === "prime" ? PRIME_FORM_PROFILES[state.kind]?.sizeScale ?? 1 : 1;
  const scale = base * appearanceScale * primeScale;
  let collision = creatureCollisionProfile(definition, scale, Boolean(state.dragonState?.stage === 1
    || state.petState?.baby || state.careState?.baby || state.leviathanGrowth && state.leviathanGrowth.stage !== "adult"));
  if (state.dragonState && state.dragonState.stage !== 1) collision = { solid: true, size: "large",
    radius: Math.max(.48, Math.min(2.8, definition.radius * scale * .72)),
    height: Math.max(.8, definition.height * scale), visualScale: scale };
  const radius = collision.solid ? collision.radius : Math.max(.12, Math.min(.42, definition.radius * scale * .72));
  const height = collision.solid ? collision.height : Math.max(.16, definition.height * scale);
  return { scale, collision, body: { ...collision, radius, height, mass: creatureBodyMass({ size: collision.size, radius, height }) } };
}
function compare(state: CreatureBodyState) {
  const definition = MOB_DEFS[state.kind], expected = previousEngineGeometry(state, definition);
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const point = { x: -.1, y: 32.125, z: 1 / 3 }, mob = { ...state, definition, group: { position: point } };
  const before = structuredClone(state);
  assert.equal(creatureBodyScale(state), expected.scale);
  assert.deepEqual(creatureRuntimeCollisionProfile(definition, state), expected.collision);
  assert.deepEqual(creatureRuntimeBodyProfile(definition, expected.collision, expected.scale), expected.body);
  assert.equal(engine.mobBaseScale(mob as never), expected.scale);
  assert.deepEqual(engine.mobCollisionProfile(mob as never), expected.collision);
  assert.deepEqual(engine.mobBodyProfile(mob as never), expected.body);
  const foot = point.y - definition.footOffset + .5;
  assert.equal(engine.mobFootY(mob as never), foot); assert.equal(creatureFootY(definition, point.y), foot);
  assert.deepEqual(creatureBodyBounds(state, point), { minX: point.x - expected.body.radius, maxX: point.x + expected.body.radius,
    minY: foot, maxY: foot + expected.body.height, minZ: point.z - expected.body.radius, maxZ: point.z + expected.body.radius });
  assert.deepEqual(state, before);
}
test("every catalog body retains exact legacy adult/baby, phenotype and prime collision semantics", () => {
  for (const kind of MOB_ORDER) {
    compare({ kind }); compare({ kind, petState: { baby: true } }); compare({ kind, careState: { baby: true } });
    const progression = migrateCreatureProgression({ kind, entityId: "body-fixture", maximumLevel: 50, defaultMoveIds: [] });
    compare({ kind, progression });
    compare({ kind, progression: { ...progression, rarityForm: "prime" } });
  }
});
test("dragon growth, leviathan stages and shade growth preserve live precedence and scaled bodies", () => {
  for (const growthScale of [.25, .6, 1, 2.3, 4]) {
    for (const stage of [1, 2, 3, 4, 5]) compare({ kind: "fire-dragon", dragonState: { growthScale, stage } });
    for (const stage of ["larva", "juvenile", "adult"]) compare({ kind: "worldshell-leviathan", leviathanGrowth: { growthScale, stage } });
  }
  for (const growth of [0, .3, 1]) compare({ kind: "shadecrawler", shadeState: { ...createShadecrawlerState(), growth } });
  compare({ kind: "fire-dragon", dragonState: { growthScale: 2, stage: 4 },
    leviathanGrowth: { growthScale: 4, stage: "adult" }, shadeState: { ...createShadecrawlerState(), growth: 1 } });
});
test("physical bounds include nonblocking small animals and preserve the engine foot plane", () => {
  const state = { kind: "peelop", petState: { baby: true } } as const;
  const collision = creatureRuntimeCollisionProfile(MOB_DEFS.peelop, state);
  assert.equal(collision.solid, false); assert.equal(collision.radius, 0);
  const bounds = creatureBodyBounds(state, { x: 0, y: 32, z: 0 });
  assert(bounds.maxX > bounds.minX); assert(bounds.maxY > bounds.minY);
  assert.equal(bounds.minY, 32 - MOB_DEFS.peelop.footOffset + .5);
});
test("engine override hooks retain their body-profile behavior", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.mobBaseScale = () => 2;
  const state = { kind: "peelop" } as const, definition = MOB_DEFS.peelop;
  const mob = { ...state, definition };
  const collision = creatureRuntimeCollisionProfile(definition, state, 2);
  assert.deepEqual(engine.mobCollisionProfile(mob as never), collision);
  engine.mobCollisionProfile = () => ({ ...collision, solid: true, radius: .9, height: 1.4 });
  assert.deepEqual(engine.mobBodyProfile(mob as never), creatureRuntimeBodyProfile(definition,
    { ...collision, solid: true, radius: .9, height: 1.4 }, 2));
});
test("selector geometry rejects invalid positions or nonpositive/nonfinite growth without normalization", () => {
  for (const x of [NaN, Infinity, -Infinity]) assert.throws(() => creatureBodyBounds({ kind: "peelop" }, { x, y: 32, z: 0 }), /geometry/);
  for (const growthScale of [NaN, Infinity, 0, -1]) assert.throws(() => creatureBodyBounds({ kind: "fire-dragon",
    dragonState: { growthScale, stage: 3 } }, { x: 0, y: 32, z: 0 }), /geometry/);
});
