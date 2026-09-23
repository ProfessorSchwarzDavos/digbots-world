import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, asteroidAttachmentPhysicalBounds } from "../app/game/asteroid-attachment-frame";
import { projectAsteroidEntityCollection, captureAsteroidEntityCollection,
  assertNoPersistedOnlyCurrentEntityAnchors } from "../app/game/asteroid-attachment-entity-selection";
import type { AsteroidAttachedEntities } from "../app/game/asteroid-attachment-entities";
import type { AsteroidRelationshipContext } from "../app/game/asteroid-attachment-relationships";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { humanBodyBounds } from "../app/game/player-body";
import { canonicalJson } from "../app/game/universe-json";
import { Item } from "../app/game/data";
import type { SavedCreature } from "../app/game/engine";

const orbit = locationAddress({ ...homeLocation(universeId("entity-selection")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902);
const frame = registry.asteroids.map(entry => createAsteroidAttachmentFrame(registry, entry.descriptor.id))
  .find(value => value.offset.y !== 0 && value.orbitBounds.minY < -8 && value.orbitBounds.maxY > 16)!;
const point = { x: frame.offset.x + .125, y: .1, z: frame.offset.z - .375 };
const creature = (id: number, x: number): SavedCreature => ({ id, specimenId: `specimen-${id}`, kind: "peelop",
  ...point, x: point.x + x, yaw: .2, health: 5, age: 42 });
function context(): AsteroidRelationshipContext {
  return { localActorId: "host", dependencies: [], actors: [0, 80].map(x => {
    const position = { ...point, x: point.x + x };
    return { id: x ? "outside" : "host", position, bounds: humanBodyBounds(position,
      { variant: "female", race: "wayfarer", crouching: false }), mountedCreatureId: null, followingCreatureIds: [] };
  }) };
}
function fixture(): AsteroidAttachedEntities {
  const cargo = { item: Item.FieldWrench, count: 1, durability: 51, metadata: { x: 777, y: .1, sealed: { fuelMl: 17, oxygenMl: 421 } } };
  const boat = (id: string, x: number, passengers: string[] = []) => ({ id, ...point, x: point.x + x, yaw: 0,
    velocity: .2, passengers, inventory: [structuredClone(cargo)], ownerId: "historical" });
  return { creatures: [creature(50, 80), creature(1, 0), creature(51, -80), creature(2, 2)],
    sleepingCreatures: [creature(52, 80), creature(3, -2)],
    boats: [boat("b0", 80, ["outside"]), boat("b1", 4, ["host"]), boat("b2", -80), boat("b3", -5)],
    drops: [80, 0, -80, 1].map(x => ({ ...structuredClone(cargo), ...point, x: point.x + x, age: 30 })),
    leads: [{ mobId: 50, fence: { x: frame.offset.x + 80, y: 1, z: frame.offset.z }, maximumLength: 7 },
      { mobId: 1, maximumLength: 7 }] };
}

test("saved current boat passengers and lead endpoints cannot hide behind matching live IDs", () => {
  const active = fixture(), boat = active.boats[1], lead = active.leads[1];
  assert.doesNotThrow(() => assertNoPersistedOnlyCurrentEntityAnchors({
    boats: [[boat.id, structuredClone(boat)]], leads: [structuredClone(lead)],
  }, active));
  assert.throws(() => assertNoPersistedOnlyCurrentEntityAnchors({
    boats: [[boat.id, { ...boat, passengers: ["outside"] }]],
  }, active), /persisted.*boat.*passenger/i);
  assert.throws(() => assertNoPersistedOnlyCurrentEntityAnchors({
    leads: [{ ...lead, ownerId: "outside" }],
  }, active), /persisted.*lead.*anchor/i);
});

test("saved current creature identity and relationship claims cannot hide behind matching live IDs", () => {
  const active = fixture(), body = active.creatures[1];
  assert.doesNotThrow(() => assertNoPersistedOnlyCurrentEntityAnchors({
    creatures: [{ ...body, x: body.x + 1, health: body.health - 1 }],
  }, active), "ordinary unsaved pose and health can differ without hiding a relationship");
  for (const saved of [
    { ...body, socialGroupId: "outside-group" },
    { ...body, specimenOriginLocationId: locationId(orbit) },
    { ...body, creatureTamed: true, creatureOwnerId: "outside", followCommand: "follow" },
  ]) assert.throws(() => assertNoPersistedOnlyCurrentEntityAnchors({ creatures: [saved] }, active),
    /persisted.*creature.*relationship/i);
});

test("saved current bee care may drift while bee identity and keeper remain fixed", () => {
  const active = fixture(), bee = { id: "worker-one", role: "worker" as const, alive: true,
    home: false, outbound: true, carryingNectar: 2, lastReturnDay: 4,
    disconnectedDay: null, geneticSeed: 71, angry: false, tamed: true,
    ownerId: "host", storedOrb: null };
  const current = { ...active, creatures: active.creatures.map((body, index) => index === 1
    ? { ...body, kind: "honeybee" as const, apiaryBee: bee } : body) };
  const saved = { ...current.creatures[1], apiaryBee: { ...bee, home: true,
    outbound: false, carryingNectar: 0, lastReturnDay: 3, angry: true } };
  assert.doesNotThrow(() => assertNoPersistedOnlyCurrentEntityAnchors({ creatures: [saved] }, current),
    "ordinary bee flight/nectar/anger drift is not an owner change");
  assert.throws(() => assertNoPersistedOnlyCurrentEntityAnchors({ creatures: [{ ...saved,
    apiaryBee: { ...saved.apiaryBee, ownerId: "outside" } }] }, current), /persisted.*creature.*relationship/i);
  assert.throws(() => assertNoPersistedOnlyCurrentEntityAnchors({ creatures: [{ ...saved,
    apiaryBee: { ...saved.apiaryBee, geneticSeed: 72 } }] }, current), /persisted.*creature.*relationship/i);
});

test("saved current drops cannot disappear through an unproved live-array lineage", () => {
  const active = fixture(), saved = structuredClone(active.drops);
  assert.doesNotThrow(() => assertNoPersistedOnlyCurrentEntityAnchors({ drops: saved }, active));
  assert.throws(() => assertNoPersistedOnlyCurrentEntityAnchors({ drops: [...saved, { ...saved[0], x: saved[0].x + 80 }] }, active),
    /persisted.*drop.*lineage/i);
  assert.throws(() => assertNoPersistedOnlyCurrentEntityAnchors({ drops: saved.map((drop, index) => index
    ? drop : { ...drop, count: drop.count + 1 }) }, active), /persisted.*drop.*lineage/i);
  assert.throws(() => assertNoPersistedOnlyCurrentEntityAnchors({ drops: saved.map((drop, index) => index
    ? drop : { ...drop, age: drop.age + 1 }) }, active), /persisted.*drop.*lineage/i,
    "ordinary drop aging remains fail-closed until an atomic source can identify each drop");
});

test("complete entity projection selects exact whole records and resolves undefined keeper through explicit local actor", () => {
  const input = fixture(), ctx = context(), before = structuredClone({ input, ctx });
  const projected = projectAsteroidEntityCollection(frame, input, ctx);
  assert.deepEqual(projected.entities.creatures.map(value => value.id), [1, 2]);
  assert.deepEqual(projected.entities.sleepingCreatures.map(value => value.id), [3]);
  assert.deepEqual(projected.entities.boats.map(value => value.id), ["b1", "b3"]);
  assert.deepEqual(projected.entities.leads, [{ mobId: 1, maximumLength: 7 }]);
  assert.deepEqual(projected.dropSourceIndices, [1, 3]); assert.deepEqual(projected.actorIds, ["host"]);
  assert.equal(projected.entities.creatures[0].x, .125);
  assert.deepEqual({ input, ctx }, before);
});

test("one hundred cold whole-collection cycles preserve exact fractional axes, outside records and every array order", () => {
  const original = fixture(), ctx = context(); let current = structuredClone(original);
  for (let i = 0; i < 100; i++) {
    const baseline = projectAsteroidEntityCollection(frame, current, ctx);
    current = JSON.parse(JSON.stringify(captureAsteroidEntityCollection(frame, current, baseline,
      JSON.parse(JSON.stringify(baseline.entities)), { before: ctx, after: ctx }, [0, 1])));
  }
  assert.equal(canonicalJson(current), canonicalJson(original)); assert.equal(current.creatures[1].y, .1);
});

test("reordered selected arrays retain original slots while live/sleep transfers and new records append safely", () => {
  const input = fixture(), ctx = context(), baseline = projectAsteroidEntityCollection(frame, input, ctx);
  const local = structuredClone(baseline.entities), changed = { ...local,
    creatures: [local.sleepingCreatures[0], { ...local.creatures[0], id: 4, specimenId: "specimen-4" }],
    sleepingCreatures: [local.creatures[0]], boats: [...local.boats].reverse(), drops: [...local.drops].reverse() };
  changed.sleepingCreatures[0].age += 5; changed.drops[0].count = 2;
  const result = captureAsteroidEntityCollection(frame, input, baseline, changed, { before: ctx, after: ctx }, [1, 0]);
  assert.deepEqual(result.creatures.map(value => value.id), [50, 51, 3, 4]);
  assert.deepEqual(result.sleepingCreatures.map(value => value.id), [52, 1]);
  assert.equal(result.sleepingCreatures[1].age, 47); assert.equal(result.sleepingCreatures[1].y, .1);
  assert.deepEqual(result.boats, input.boats); assert.equal(result.drops[3].count, 2);
  assert.deepEqual(result.drops.slice(0, 3), input.drops.slice(0, 3));
  for (const id of [50, 51]) assert.deepEqual(result.creatures.find(value => value.id === id), input.creatures.find(value => value.id === id));
  assert.deepEqual(result.sleepingCreatures[0], input.sleepingCreatures[0]); assert.deepEqual(result.leads, input.leads);
  result.boats[0].inventory[0]!.metadata!.x = -1; assert.equal(input.boats[0].inventory[0]!.metadata!.x, 777);
});

test("global after-image rejects new IDs/specimens colliding with outside records instead of overwriting them", () => {
  const input = fixture(), before = structuredClone(input), ctx = context(), baseline = projectAsteroidEntityCollection(frame, input, ctx);
  const local = baseline.entities;
  const variants: AsteroidAttachedEntities[] = [
    { ...local, creatures: [...local.creatures, { ...local.creatures[0], id: 50, specimenId: "new" }] },
    { ...local, creatures: [...local.creatures, { ...local.creatures[0], id: 4, specimenId: "specimen-50" }] },
    { ...local, boats: [...local.boats, { ...local.boats[1], id: "b0" }] },
    { ...local, leads: [...local.leads, { mobId: 50, maximumLength: 7 }] },
  ];
  for (const edited of variants) assert.throws(() => captureAsteroidEntityCollection(frame, input, baseline, edited, { before: ctx, after: ctx }, [0, 1]));
  assert.deepEqual(input, before);
});

test("merged relationships reject new cross-frame social, passenger, follower and authored links", () => {
  const initial = fixture(), input = { ...initial, creatures: initial.creatures.map(value => value.id === 50 ? { ...value, socialGroupId: "outside" } : value) };
  const ctx = context(), baseline = projectAsteroidEntityCollection(frame, input, ctx), local = baseline.entities;
  for (const patch of [{ socialGroupId: "outside" }, { poiMarkerId: "missing" }]) {
    const edited = { ...local, creatures: [{ ...local.creatures[0], ...patch }, local.creatures[1]] };
    assert.throws(() => captureAsteroidEntityCollection(frame, input, baseline, edited, { before: ctx, after: ctx }, [0, 1]), /boundary|Unresolved/);
  }
  const outsider = ctx.actors[1];
  const movedHost = { ...ctx, actors: [{ ...ctx.actors[0], position: outsider.position, bounds: outsider.bounds }, outsider] };
  assert.throws(() => captureAsteroidEntityCollection(frame, input, baseline, local, { before: ctx, after: movedHost }, [0, 1]), /passenger|keeper/);
  const linked = { ...ctx, actors: [{ ...ctx.actors[0], followingCreatureIds: [50] }, outsider] };
  assert.throws(() => captureAsteroidEntityCollection(frame, input, baseline, local, { before: ctx, after: linked }, [0, 1]), /follower/);
});

test("stale preimage contexts, changed local identity and incomplete body edits fail closed", () => {
  const input = fixture(), ctx = context(), baseline = projectAsteroidEntityCollection(frame, input, ctx), local = baseline.entities;
  const changedBefore = { ...ctx, actors: [{ ...ctx.actors[0], followingCreatureIds: [1] }, ctx.actors[1]] };
  assert.throws(() => captureAsteroidEntityCollection(frame, input, baseline, local, { before: changedBefore, after: changedBefore }, [0, 1]), /Stale/);
  assert.throws(() => captureAsteroidEntityCollection(frame, input, baseline, local, { before: ctx, after: { ...ctx, localActorId: "outside" } }, [0, 1]), /identity changed/);
  const b = asteroidAttachmentPhysicalBounds(frame, "local");
  for (const x of [b.maxX - .01, b.maxX + 80]) {
    assert.throws(() => captureAsteroidEntityCollection(frame, input, baseline,
      { ...local, creatures: [{ ...local.creatures[0], x }, local.creatures[1]] }, { before: ctx, after: ctx }, [0, 1]), /boundary|outside/);
    assert.throws(() => captureAsteroidEntityCollection(frame, input, baseline,
      { ...local, boats: [{ ...local.boats[0], x }, local.boats[1]] }, { before: ctx, after: ctx }, [0, 1]), /boundary|outside/);
  }
  assert.throws(() => captureAsteroidEntityCollection(frame, input, baseline, local, { before: ctx, after: ctx }, [0, 0]), /lineage/);
});
