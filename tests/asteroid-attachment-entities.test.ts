import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, rebaseAsteroidPosition } from "../app/game/asteroid-attachment-frame";
import { rebaseAsteroidEntities, type AsteroidAttachedEntities } from "../app/game/asteroid-attachment-entities";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { createDragonState } from "../app/game/dragons";
import { createCreatureWorkState } from "../app/game/creature-ecology";
import { Item } from "../app/game/data";

const orbit = locationAddress({ ...homeLocation(universeId("attached-entities")), kind: "orbit", instanceId: "moon-transfer" });
const registry = createAsteroidRegistry(orbit, 902);
const frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
function fixture(): AsteroidAttachedEntities {
  const point = { x: 0.125, y: 32.5, z: -1.25 };
  const dragon = createDragonState("fire", { dragonId: "one-dragon", geneticSeed: 321, ageDays: 29,
    home: { lairId: "lair-opaque", dimension: "overworld", position: { x: 2, y: 33, z: 0 }, guardRadius: 4 } });
  const creature = { id: 7, specimenId: "unique-seven", kind: "fire-dragon" as const, ...point, yaw: .5, health: 10, age: 42,
    dragonState: dragon, celestialVelocity: [.125, -.5, 1] as [number, number, number], morrowRoost: { x: 1, y: 32, z: 1 },
    creatureWork: { ...createCreatureWorkState("fire-dragon"), home: { x: -2, y: 32, z: 0 }, completedCycles: 71 } };
  const cargo = [{ item: Item.FieldWrench, count: 1, durability: 57, metadata: { specimenId: "portable-eight", x: 777, y: 888, z: 999,
    sealed: { energyJ: 500, fuelMl: 1700, oxygenMl: 421 } } }];
  return { creatures: [creature], sleepingCreatures: [{ id: 8, specimenId: "unique-eight", kind: "peelop", ...point, yaw: 1, health: 5, age: 100 }],
    boats: [{ id: "boat-one", ...point, yaw: 2, velocity: .625, passengers: ["host"], inventory: cargo, ownerId: "host" }],
    drops: [{ ...cargo[0], ...point, age: 35, velocity: [.25, -.5, .75] }],
    leads: [{ mobId: 7, fence: { x: 1, y: 32, z: 0 }, maximumLength: 9 }, { mobId: 8, ownerId: "host", maximumLength: 8 }] };
}
test("creatures, sleeping identities, anchors, boat cargo, drops and leads round-trip without duplication", () => {
  const input = fixture(), before = structuredClone(input), projected = rebaseAsteroidEntities(frame, input, "local", ["host"]);
  assert.deepEqual(projected.creatures[0].celestialVelocity, input.creatures[0].celestialVelocity);
  assert.deepEqual(projected.boats[0].inventory, input.boats[0].inventory);
  assert.deepEqual(projected.drops[0].metadata, input.drops[0].metadata);
  assert.deepEqual(projected.drops[0].velocity, input.drops[0].velocity);
  assert.equal(projected.creatures[0].dragonState!.home!.dimension, "overworld");
  assert.equal(projected.creatures[0].dragonState!.home!.lairId, "lair-opaque");
  assert.deepEqual(projected.creatures[0].dragonState!.home!.position, rebaseAsteroidPosition(frame, { x: 2, y: 33, z: 0 }, "local"));
  assert.deepEqual(rebaseAsteroidEntities(frame, projected, "orbit", ["host"]), input);
  assert.deepEqual(input, before);
  projected.boats[0].inventory[0]!.count = 2;
  assert.deepEqual(input, before);
});
test("duplicate live/sleeping/specimen/boat identities and cross-unit relationships reject atomically", () => {
  const mutations = [
    (input: AsteroidAttachedEntities) => { input.sleepingCreatures[0].id = 7; },
    (input: AsteroidAttachedEntities) => { input.sleepingCreatures[0].specimenId = "unique-seven"; },
    (input: AsteroidAttachedEntities) => { input.boats[0].passengers.push("host"); },
    (input: AsteroidAttachedEntities) => { input.boats[0].passengers = ["left-behind"]; },
    (input: AsteroidAttachedEntities) => { input.creatures[0].morrowRoost = { x: 32, y: 32, z: 0 }; },
    (input: AsteroidAttachedEntities) => { input.creatures[0].creatureWork = { ...input.creatures[0].creatureWork!, home: { x: 99, y: 32, z: 0 } }; },
    (input: AsteroidAttachedEntities) => { input.creatures[0].dragonState = { ...input.creatures[0].dragonState!, home: { ...input.creatures[0].dragonState!.home!, position: { x: -33, y: 32, z: 0 } } }; },
  ];
  for (const mutate of mutations) {
    const input = fixture(); mutate(input); const before = structuredClone(input);
    assert.throws(() => rebaseAsteroidEntities(frame, input, "local", ["host"]), /Duplicate|outside|boundary/);
    assert.deepEqual(input, before);
  }
  const input = fixture();
  assert.throws(() => rebaseAsteroidEntities(frame, { ...input, boats: [] }, "local", []), /keeper/);
  assert.throws(() => rebaseAsteroidEntities(frame, { ...input, leads: [{ mobId: 99, maximumLength: 8 }] }, "local", ["host"]), /lead/);
  assert.throws(() => rebaseAsteroidEntities(frame, { ...input, leads: [{ mobId: 7, fence: { x: 32, y: 32, z: 0 }, maximumLength: 8 }] }, "local", ["host"]), /boundary/);
});
test("continuous positions are not rounded; invalid or outside coordinates reject", () => {
  const point = { x: 31.875, y: 32.25, z: -.125 }, output = rebaseAsteroidPosition(frame, point, "local");
  assert.deepEqual(rebaseAsteroidPosition(frame, output, "orbit"), point);
  for (const x of [32, -32.001, NaN, Infinity]) assert.throws(() => rebaseAsteroidPosition(frame, { ...point, x }, "local"), /boundary/);
});
test("unknown entity resource fields fail closed instead of being silently left in another frame", () => {
  for (const key of ["creatures", "sleepingCreatures", "boats", "drops", "leads"] as const) {
    const input = fixture(); Object.assign(input[key][0], { futureSpatialCargo: { x: 300, count: 99 } });
    const before = structuredClone(input);
    assert.throws(() => rebaseAsteroidEntities(frame, input, "local", ["host"]), /Unsupported/);
    assert.deepEqual(input, before);
  }
});
