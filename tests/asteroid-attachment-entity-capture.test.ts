import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { rebaseAsteroidEntities, type AsteroidAttachedEntities } from "../app/game/asteroid-attachment-entities";
import { captureAsteroidEntityUnit } from "../app/game/asteroid-attachment-entity-capture";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { createDragonState } from "../app/game/dragons";
import { createCreatureWorkState } from "../app/game/creature-ecology";
import { Item } from "../app/game/data";

const orbit = locationAddress({ ...homeLocation(universeId("entity-capture")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902);
const frame = registry.asteroids.map(entry => createAsteroidAttachmentFrame(registry, entry.descriptor.id))
  .find(value => value.offset.y !== 0 && value.orbitBounds.minY <= .1 && value.orbitBounds.maxY >= .1)!;
const point = { x: frame.offset.x + .125, y: .1, z: frame.offset.z - .375 };
function fixture(): AsteroidAttachedEntities {
  const cargo = { item: Item.FieldWrench, count: 1, durability: 57,
    metadata: { x: 777, y: .1, z: 999, sealed: { fuelMl: 1700, oxygenMl: 421, heatJ: 981 } } };
  return {
    creatures: [{ id: 7, specimenId: "seven", kind: "fire-dragon", ...point, yaw: .5, health: 10, age: 42,
      celestialVelocity: [.125, -.5, 1], morrowRoost: { ...point, y: .3 },
      creatureWork: { ...createCreatureWorkState("fire-dragon"), home: { ...point, y: .7 }, completedCycles: 71 },
      dragonState: createDragonState("fire", { dragonId: "one-dragon", geneticSeed: 321, ageDays: 29,
        home: { lairId: "lair-opaque", dimension: "overworld", position: { ...point, y: .9 }, guardRadius: 12 } }) }],
    sleepingCreatures: [{ id: 8, specimenId: "eight", kind: "peelop", ...point, yaw: 1, health: 5, age: 100 }],
    boats: [{ id: "boat-one", ...point, yaw: 2, velocity: .625, passengers: ["host"], inventory: [cargo], ownerId: "host" },
      { id: "boat-two", ...point, y: .2, yaw: 1, velocity: .5, passengers: [], inventory: [], ownerId: "host" }],
    drops: [{ ...structuredClone(cargo), ...point, age: 35, velocity: [.25, -.5, .75] },
      { ...structuredClone(cargo), ...point, y: .2, count: 2, age: 36, velocity: [.5, .25, -.5] }],
    leads: [{ mobId: 7, fence: { x: frame.offset.x, y: 32, z: frame.offset.z }, maximumLength: 9 },
      { mobId: 8, ownerId: "host", maximumLength: 8 }],
  };
}
const project = (value: AsteroidAttachedEntities) => rebaseAsteroidEntities(frame, value, "orbit", ["host"]);

test("baseline capture avoids demonstrated floating-point drift and retains finite opaque metadata", () => {
  const canonical = fixture(), before = structuredClone(canonical), baseline = project(canonical);
  assert.notEqual(rebaseAsteroidEntities(frame, baseline, "local", ["host"]).creatures[0].y, canonical.creatures[0].y);
  const captured = captureAsteroidEntityUnit(frame, canonical, baseline, baseline, ["host"], [0, 1]);
  assert.deepEqual(captured, canonical);
  assert.deepEqual(canonical, before);
  captured.boats[0].inventory[0]!.count = 90;
  assert.deepEqual(canonical, before); assert.deepEqual(baseline, project(canonical));
});

test("one hundred cold JSON projection/capture cycles have zero coordinate or resource drift", () => {
  const canonical = fixture(); let current = structuredClone(canonical);
  for (let cycle = 0; cycle < 100; cycle++) {
    const baseline = project(current), edited = JSON.parse(JSON.stringify(baseline)) as AsteroidAttachedEntities;
    current = JSON.parse(JSON.stringify(captureAsteroidEntityUnit(frame, current, baseline, edited, ["host"], [0, 1])));
  }
  assert.deepEqual(current, canonical);
});

test("live/sleep transfer and boat/drop reordering match stable identities and explicit lineage", () => {
  const canonical = fixture(), baseline = project(canonical), edited = structuredClone(baseline);
  const changes: AsteroidAttachedEntities = { ...edited, creatures: [...edited.sleepingCreatures], sleepingCreatures: [...edited.creatures],
    boats: [...edited.boats].reverse(), drops: [...edited.drops].reverse() };
  changes.sleepingCreatures[0].age += 1; changes.drops[0].age += 2;
  const captured = captureAsteroidEntityUnit(frame, canonical, baseline, changes, ["host"], [1, 0]);
  assert.deepEqual(captured.creatures, canonical.sleepingCreatures);
  assert.deepEqual(captured.sleepingCreatures, [{ ...canonical.creatures[0], age: 43 }]);
  assert.deepEqual(captured.boats, [...canonical.boats].reverse());
  assert.deepEqual(captured.drops, [{ ...canonical.drops[1], age: 38 }, canonical.drops[0]]);
});

test("changed axes and simulation fields change without disturbing untouched fractional anchors", () => {
  const canonical = fixture(), baseline = project(canonical), edited = structuredClone(baseline);
  edited.creatures[0].x += .25; edited.creatures[0].age += 1;
  edited.creatures[0].morrowRoost!.z += .125;
  edited.creatures[0].creatureWork = { ...edited.creatures[0].creatureWork!, completedCycles: 72,
    home: { ...edited.creatures[0].creatureWork!.home!, x: edited.creatures[0].creatureWork!.home!.x + .5 } };
  const editedDragon = edited.creatures[0].dragonState!, editedHome = editedDragon.home!;
  edited.creatures[0].dragonState = { ...editedDragon, home: { ...editedHome,
    position: { ...editedHome.position, x: editedHome.position.x + .75 } } };
  edited.boats[0].z += .125; edited.drops[0].x += .5;
  const captured = captureAsteroidEntityUnit(frame, canonical, baseline, edited, ["host"], [0, 1]);
  const expected = structuredClone(canonical);
  expected.creatures[0].x += .25; expected.creatures[0].age += 1;
  expected.creatures[0].morrowRoost!.z += .125;
  expected.creatures[0].creatureWork = { ...expected.creatures[0].creatureWork!, completedCycles: 72,
    home: { ...expected.creatures[0].creatureWork!.home!, x: expected.creatures[0].creatureWork!.home!.x + .5 } };
  const expectedDragon = expected.creatures[0].dragonState!, expectedHome = expectedDragon.home!;
  expected.creatures[0].dragonState = { ...expectedDragon, home: { ...expectedHome,
    position: { ...expectedHome.position, x: expectedHome.position.x + .75 } } };
  expected.boats[0].z += .125; expected.drops[0].x += .5;
  assert.deepEqual(captured, expected);
});

test("new drops need null lineage and removals do not reconstruct expired or collected cargo", () => {
  const canonical = fixture(), baseline = project(canonical);
  const fresh = { ...structuredClone(baseline.drops[0]), x: 2, y: 32, z: 1, age: 0 };
  const edited = { ...baseline, drops: [baseline.drops[1], fresh] };
  const captured = captureAsteroidEntityUnit(frame, canonical, baseline, edited, ["host"], [1, null]);
  assert.deepEqual(captured.drops[0], canonical.drops[1]);
  assert.deepEqual(captured.drops[1], { ...fresh, x: frame.offset.x + 2, y: frame.offset.y + 32, z: frame.offset.z + 1 });
  assert.deepEqual(captureAsteroidEntityUnit(frame, canonical, baseline, { ...baseline, drops: [] }, ["host"], []).drops, []);
});

test("missing duplicate malformed and out-of-range lineage rejects without mutating any input", () => {
  for (const origins of [[], [0], [0, 0], [-1, 1], [.5, 1], [2, 1], [NaN, 1], [Infinity, 1]]) {
    const canonical = fixture(), baseline = project(canonical), edited = structuredClone(baseline);
    const before = structuredClone({ canonical, baseline, edited });
    assert.throws(() => captureAsteroidEntityUnit(frame, canonical, baseline, edited, ["host"], origins), /lineage/);
    assert.deepEqual({ canonical, baseline, edited }, before);
  }
});

test("stale baseline or canonical payload cannot overwrite a newer finite unit", () => {
  const canonical = fixture(), baseline = project(canonical), edited = structuredClone(baseline);
  const stale = structuredClone(baseline); stale.drops[0].count++;
  assert.throws(() => captureAsteroidEntityUnit(frame, canonical, stale, edited, ["host"], [0, 1]), /Stale/);
  const current = structuredClone(canonical); current.boats[0].inventory[0]!.durability!--;
  assert.throws(() => captureAsteroidEntityUnit(frame, current, baseline, edited, ["host"], [0, 1]), /Stale/);
});

test("changed specimen identities, duplicate IDs and broken relationships reject before capture", () => {
  const canonical = fixture(), baseline = project(canonical);
  for (const mutate of [
    (value: AsteroidAttachedEntities) => { value.creatures[0].specimenId = "replacement"; },
    (value: AsteroidAttachedEntities) => { value.sleepingCreatures[0].id = 7; },
    (value: AsteroidAttachedEntities) => { value.boats[0].passengers.push("left-behind"); },
  ]) {
    const edited = structuredClone(baseline); mutate(edited); const before = structuredClone(edited);
    assert.throws(() => captureAsteroidEntityUnit(frame, canonical, baseline, edited, ["host"], [0, 1]), /identity|Duplicate|outside/);
    assert.deepEqual(edited, before);
  }
});

test("cross-frame entity and anchor changes fail rather than clamping or restoring old positions", () => {
  const canonical = fixture(), baseline = project(canonical);
  for (const mutate of [
    (value: AsteroidAttachedEntities) => { value.creatures[0].x = 32; },
    (value: AsteroidAttachedEntities) => { value.creatures[0].morrowRoost!.z = -33; },
    (value: AsteroidAttachedEntities) => { value.boats[0].y = frame.localBounds.maxY + 1; },
    (value: AsteroidAttachedEntities) => { value.drops[0].x = NaN; },
  ]) {
    const edited = structuredClone(baseline); mutate(edited);
    assert.throws(() => captureAsteroidEntityUnit(frame, canonical, baseline, edited, ["host"], [0, 1]), /boundary|finite/);
  }
});
