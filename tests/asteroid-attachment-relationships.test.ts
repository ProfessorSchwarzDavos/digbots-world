import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { asteroidEntityRelationshipPartition, asteroidEntityCompoundId, assertAsteroidLeadSegmentOutside,
  type AsteroidRelationshipContext, type AsteroidRelationshipActor, type AsteroidEntityDependency } from "../app/game/asteroid-attachment-relationships";
import type { AsteroidAttachedEntities } from "../app/game/asteroid-attachment-entities";
import type { SavedCreature } from "../app/game/engine";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { createPeelopState } from "../app/game/peelop";
import { createDragonState } from "../app/game/dragons";
import { createApiary } from "../app/game/apiary";
import { LEGENDARY_ENCOUNTER_ORDER } from "../app/game/legendary-encounters";

const orbit = locationAddress({ ...homeLocation(universeId("entity-relationships")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const creature = (id = 1, x = 0): SavedCreature => ({ id, specimenId: `specimen-${id}`, kind: "peelop", x, y: 32, z: 0, yaw: 0, health: 5, age: 42 });
const actor = (id = "host", x = 0): AsteroidRelationshipActor => ({ id, position: { x, y: 32, z: 0 },
  bounds: { minX: x - .3, maxX: x + .3, minY: 31.5, maxY: 33.4, minZ: -.3, maxZ: .3 }, mountedCreatureId: null, followingCreatureIds: [] });
const context = (): AsteroidRelationshipContext => ({ localActorId: "host", actors: [actor(), actor("outside", 80)], boats: [], dependencies: [] });
const fixture = (): AsteroidAttachedEntities => ({ creatures: [creature()], sleepingCreatures: [creature(2, 80)], boats: [], drops: [], leads: [] });
const select = (input = fixture(), ctx = context()) => asteroidEntityRelationshipPartition(frame, input, "local", ctx);
function rejectsUnchanged(input: AsteroidAttachedEntities, ctx: AsteroidRelationshipContext, pattern: RegExp) {
  const before = structuredClone({ input, ctx }); assert.throws(() => select(input, ctx), pattern); assert.deepEqual({ input, ctx }, before);
}

test("physical live/sleep partition is deterministic, detached and non-mutating", () => {
  const input = fixture(), ctx = context(), before = structuredClone({ input, ctx });
  assert.deepEqual(select(input, ctx), { creatureIds: [1], boatIds: [], leadMobIds: [] });
  assert.deepEqual({ input, ctx }, before);
});
test("duplicate live/sleep and specimen identities fail before selection", () => {
  rejectsUnchanged({ ...fixture(), sleepingCreatures: [creature(1, 80)] }, context(), /Duplicate/);
  rejectsUnchanged({ ...fixture(), sleepingCreatures: [{ ...creature(2, 80), specimenId: "specimen-1" }] }, context(), /Duplicate/);
  rejectsUnchanged({ ...fixture(), creatures: [{ ...creature(), id: NaN }] }, context(), /identity/);
});
test("outside body intrusion and actor body intrusion fail even with outside anchors", () => {
  rejectsUnchanged({ ...fixture(), sleepingCreatures: [creature(2, 31.51)] }, context(), /boundary/);
  rejectsUnchanged(fixture(), { ...context(), actors: [actor(), actor("outside", 31.51)] }, /boundary/);
  rejectsUnchanged(fixture(), { ...context(), actors: [{ ...actor(), position: { x: 90, y: 32, z: 0 } }] }, /bounds/);
});
test("social labels cannot split live/sleep members even if their bodies fit separately", () => {
  rejectsUnchanged({ ...fixture(), creatures: [{ ...creature(), socialGroupId: "herd" }],
    sleepingCreatures: [{ ...creature(2, 80), socialGroupId: "herd" }] }, context(), /Social group/);
  const input = { ...fixture(), sleepingCreatures: [creature(2, 3)] };
  input.creatures[0].socialGroupId = "group"; input.sleepingCreatures[0].socialGroupId = "group";
  assert.deepEqual(select(input).creatureIds, [1, 2]);
});
test("historical owner alone does not force an idle creature to move with its owner", () => {
  const petState = { ...createPeelopState(4), tamed: true, ownerId: "outside", command: "stay" as const };
  assert.deepEqual(select({ ...fixture(), creatures: [{ ...creature(), petState, creatureOwnerId: "outside" }] }).creatureIds, [1]);
});
test("configured follower links cannot cross either direction and missing owners fail closed", () => {
  for (const [x, ownerId] of [[0, "outside"], [80, "host"], [0, "disconnected"]] as const) {
    const petState = { ...createPeelopState(4), tamed: true, ownerId, command: "follow" as const };
    rejectsUnchanged({ ...fixture(), creatures: [{ ...creature(1, x), petState }] }, context(), /follower|actor relationship/);
  }
  assert.deepEqual(select({ ...fixture(), creatures: [{ ...creature(), petState: { ...createPeelopState(4), tamed: true,
    ownerId: "host", command: "follow" } }] }).creatureIds, [1]);
});
test("host-derived special followers require one resolved same-side actor", () => {
  rejectsUnchanged(fixture(), { ...context(), actors: [{ ...actor(), followingCreatureIds: [2] }, actor("outside", 80)] }, /Active follower/);
  rejectsUnchanged(fixture(), { ...context(), actors: [{ ...actor(), followingCreatureIds: [99] }] }, /Unresolved/);
  rejectsUnchanged(fixture(), { ...context(), actors: [{ ...actor(), followingCreatureIds: [1, 1] }] }, /Duplicate/);
  rejectsUnchanged(fixture(), { ...context(), actors: [{ ...actor(), followingCreatureIds: [1] }, { ...actor("second"), followingCreatureIds: [1] }] }, /multiple/);
});
test("fenced leads and resolved legacy local keeper follow creature membership", () => {
  assert.deepEqual(select({ ...fixture(), leads: [{ mobId: 1, maximumLength: 7, fence: { x: 3, y: 32, z: 0 } }] }).leadMobIds, [1]);
  assert.deepEqual(select({ ...fixture(), leads: [{ mobId: 1, maximumLength: 7 }] }).leadMobIds, [1]);
  rejectsUnchanged({ ...fixture(), leads: [{ mobId: 2, maximumLength: 7 }] }, context(), /Lead keeper/);
  rejectsUnchanged({ ...fixture(), leads: [{ mobId: 1, maximumLength: 7, fence: { x: 80, y: 32, z: 0 } }] }, context(), /Lead fence/);
  rejectsUnchanged({ ...fixture(), leads: [{ mobId: 1, maximumLength: 7, ownerId: "missing" }] }, context(), /Unresolved/);
  rejectsUnchanged({ ...fixture(), leads: [{ mobId: 99, maximumLength: 7 }] }, context(), /Unresolved/);
  rejectsUnchanged({ ...fixture(), leads: [{ mobId: 1, maximumLength: 7 }, { mobId: 1, maximumLength: 7 }] }, context(), /duplicate/);
});
test("outside rope whose two endpoints straddle the frame rejects without clipping", () => {
  const input = { ...fixture(), sleepingCreatures: [creature(2, -80)], leads: [{ mobId: 2, ownerId: "outside", maximumLength: 200 }] };
  rejectsUnchanged(input, context(), /Outside lead segment/);
  assert.deepEqual(select({ ...input, sleepingCreatures: [creature(2, 75)] }).leadMobIds, []);
});
test("segment slab intersection catches diagonal crossings and validates all axes first", () => {
  const p = (x: number, y: number, z: number) => ({ x, y, z });
  for (const [a, b] of [[p(-80, 32, -80), p(80, 32, 80)], [p(0, -100, 0), p(0, 300, 0)]])
    assert.throws(() => assertAsteroidLeadSegmentOutside(frame, a, b, "local"), /crosses/);
  assert.doesNotThrow(() => assertAsteroidLeadSegmentOutside(frame, p(-80, 32, -80), p(-80, 32, 80), "local"));
  assert.throws(() => assertAsteroidLeadSegmentOutside(frame, p(100, NaN, 0), p(200, 32, 0), "local"), /Invalid/);
});
function withBoat(): { input: AsteroidAttachedEntities; ctx: AsteroidRelationshipContext } {
  return { input: { ...fixture(), boats: [{ id: "boat", x: 0, y: 32, z: 0, yaw: 0, velocity: 0,
    ownerId: "outside", passengers: ["host"], inventory: [] }] }, ctx: { ...context(), boats: [{ id: "boat", attached: true }] } };
}
test("whole boat result and every passenger must agree; historical boat owner is not a passenger", () => {
  const { input, ctx } = withBoat(); assert.deepEqual(select(input, ctx).boatIds, ["boat"]);
  rejectsUnchanged(input, { ...ctx, boats: [{ id: "boat", attached: false }] }, /Boat passenger/);
  rejectsUnchanged(input, { ...ctx, boats: [] }, /unresolved/);
  rejectsUnchanged(input, { ...ctx, boats: [...ctx.boats, { id: "ghost", attached: true }] }, /Unmatched/);
  input.boats[0].passengers = ["host", "host"]; rejectsUnchanged(input, ctx, /Duplicate/);
});
test("creature mount cannot cross, refer to a missing creature or double-book a boat passenger", () => {
  rejectsUnchanged(fixture(), { ...context(), actors: [{ ...actor(), mountedCreatureId: 2 }, actor("outside", 80)] }, /Creature rider/);
  rejectsUnchanged(fixture(), { ...context(), actors: [{ ...actor(), mountedCreatureId: 99 }] }, /Unresolved/);
  const { input, ctx } = withBoat(); rejectsUnchanged(input, { ...ctx, actors: [{ ...actor(), mountedCreatureId: 1 }] }, /boat and a creature/);
  assert.deepEqual(select(fixture(), { ...context(), actors: [{ ...actor(), mountedCreatureId: 1 }, actor("outside", 80)] }).creatureIds, [1]);
});
const dependencies: readonly Readonly<{ name: string; patch: Partial<SavedCreature>; dependency: AsteroidEntityDependency }>[] = [
  { name: "legendary", patch: { legendaryEncounterId: LEGENDARY_ENCOUNTER_ORDER[0], legendarySiteId: "site" },
    dependency: { kind: "legendary", id: asteroidEntityCompoundId(LEGENDARY_ENCOUNTER_ORDER[0], "site"), attached: true } },
  { name: "poi", patch: { poiMarkerId: "marker", persistentPoiResident: true }, dependency: { kind: "poi", id: "marker", attached: true } },
  { name: "prime", patch: { primeAnchorId: "prime" }, dependency: { kind: "prime", id: "prime", attached: true } },
  { name: "summon", patch: { groundedSummonLineageId: "lineage", groundedSummonEntityId: "entity" }, dependency: { kind: "summon", id: asteroidEntityCompoundId("lineage", "entity"), attached: true } },
  { name: "settlement", patch: { settlementId: "village" }, dependency: { kind: "settlement", id: "village", attached: true } },
  { name: "orb", patch: { attunedOrbId: "orb" }, dependency: { kind: "orb", id: "orb", attached: true } },
  { name: "apiary", patch: { apiaryBee: createApiary("queen", [], 44).queen }, dependency: { kind: "apiary-bee", id: createApiary("queen", [], 44).queen.id, attached: true } },
];
for (const { name, patch, dependency } of dependencies) test(`${name} requires exact canonical-owner endpoint and never crosses or invents one`, () => {
  const input = { ...fixture(), creatures: [{ ...creature(), ...patch }] };
  rejectsUnchanged(input, context(), /Unresolved/);
  rejectsUnchanged(input, { ...context(), dependencies: [{ ...dependency, attached: false }] }, /boundary/);
  assert.deepEqual(select(input, { ...context(), dependencies: [dependency] }).creatureIds, [1]);
});
test("resident identity requires its exact settlement and resident composite", () => {
  const input = { ...fixture(), creatures: [{ ...creature(), settlementId: "village", residentId: "resident" }] };
  const deps: AsteroidEntityDependency[] = [{ kind: "settlement", id: "village", attached: true },
    { kind: "resident", id: asteroidEntityCompoundId("village", "resident"), attached: true }];
  assert.deepEqual(select(input, { ...context(), dependencies: deps }).creatureIds, [1]);
  rejectsUnchanged(input, { ...context(), dependencies: deps.slice(0, 1) }, /Unresolved/);
  assert.notEqual(asteroidEntityCompoundId("a:b", "c"), asteroidEntityCompoundId("a", "b:c"));
});
test("shoulder dragon keeps its actor and its separate whole lair dependency", () => {
  const dragonState = { ...createDragonState("fire", { dragonId: "young", ownerId: "host", tamed: true, ageDays: 1 }),
    onShoulder: true, command: "stay" as const, home: null };
  const input = { ...fixture(), creatures: [{ ...creature(), kind: "fire-dragon" as const, dragonState }] };
  assert.deepEqual(select(input).creatureIds, [1]);
  input.creatures[0].dragonState = { ...dragonState, ownerId: "outside" };
  rejectsUnchanged(input, context(), /Shoulder creature/);
});
test("dragon lair cannot be omitted just because its coordinates fit inside", () => {
  const dragonState = createDragonState("fire", { dragonId: "guard", ageDays: 20,
    home: { lairId: "lair", dimension: "overworld", position: { x: 0, y: 32, z: 0 }, guardRadius: 4 } });
  const input = { ...fixture(), creatures: [{ ...creature(), kind: "fire-dragon" as const, dragonState }] };
  rejectsUnchanged(input, context(), /Unresolved attachment dragon-lair/);
  const dependency: AsteroidEntityDependency = { kind: "dragon-lair", id: asteroidEntityCompoundId("overworld", "lair"), attached: true };
  assert.deepEqual(select(input, { ...context(), dependencies: [dependency] }).creatureIds, [1]);
  rejectsUnchanged(input, { ...context(), dependencies: [{ ...dependency, attached: false }] }, /boundary/);
});
test("unresolved outside authored identities also reject instead of orphaning unseen owners", () => {
  const input = { ...fixture(), sleepingCreatures: [{ ...creature(2, 80), attunedOrbId: "outside-orb" }] };
  rejectsUnchanged(input, context(), /Unresolved/);
  const dependency: AsteroidEntityDependency = { kind: "orb", id: "outside-orb", attached: false };
  assert.deepEqual(select(input, { ...context(), dependencies: [dependency] }).creatureIds, [1]);
  rejectsUnchanged(input, { ...context(), dependencies: [{ ...dependency, attached: true }] }, /boundary/);
});
test("malformed authored pairs, zero-volume actor bodies and false local aliases reject", () => {
  for (const patch of [{ residentId: "resident" }, { groundedSummonLineageId: "lineage" },
    { legendarySiteId: "site" }, { persistentPoiResident: true }])
    rejectsUnchanged({ ...fixture(), creatures: [{ ...creature(), ...patch }] }, context(), /identity|Unresolved/);
  rejectsUnchanged(fixture(), { ...context(), localActorId: "local" }, /Unresolved/);
  rejectsUnchanged(fixture(), { ...context(), actors: [{ ...actor(), bounds: { ...actor().bounds, minX: 0, maxX: 0 } }] }, /positive volume/);
  assert.throws(() => asteroidEntityCompoundId("", "other"), /identity/);
});
test("unknown additive fields, unused dependencies and duplicate actor/binding identities fail closed", () => {
  const input = fixture(); Object.assign(input.creatures[0], { futureOwner: { fuel: 10 } });
  rejectsUnchanged(input, context(), /Unsupported/);
  rejectsUnchanged(fixture(), { ...context(), actors: [actor(), actor()] }, /Duplicate/);
  rejectsUnchanged(fixture(), { ...context(), dependencies: [{ kind: "orb", id: "unreferenced", attached: true }] }, /Unmatched/);
  rejectsUnchanged(fixture(), { ...context(), dependencies: [dependencies[0].dependency, dependencies[0].dependency] }, /duplicate/);
});
