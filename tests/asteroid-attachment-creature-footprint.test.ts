import assert from "node:assert/strict";
import test from "node:test";
import type { SavedCreature } from "../app/game/engine";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, asteroidAttachmentPhysicalBounds, rebaseAsteroidPosition } from "../app/game/asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide, asteroidCreatureFootprintSide } from "../app/game/asteroid-attachment-creature-footprint";
import { rebaseAsteroidEntities } from "../app/game/asteroid-attachment-entities";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { createDragonState } from "../app/game/dragons";
import { createCreatureWorkState } from "../app/game/creature-ecology";
const orbit = locationAddress({ ...homeLocation(universeId("entity-footprints")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const b = asteroidAttachmentPhysicalBounds(frame, "local");
function creature(): SavedCreature { return { id: 1, kind: "peelop", x: 0, y: 32, z: 0, yaw: 0, health: 5, age: 42 }; }
test("whole physical volume classifies complete inside/outside and rejects any partial intersection", () => {
  assert.equal(asteroidAttachmentVolumeSide(frame, b, "local"), true);
  const outside = { ...b, minX: b.maxX, maxX: b.maxX + 10 };
  assert.equal(asteroidAttachmentVolumeSide(frame, outside, "local"), false);
  assert.throws(() => asteroidAttachmentVolumeSide(frame, { ...outside, minX: b.maxX - .1 }, "local"), /boundary/);
  assert.throws(() => asteroidAttachmentVolumeSide(frame, { ...b, minZ: b.minZ - 1 }, "local"), /boundary/);
  assert.throws(() => asteroidAttachmentVolumeSide(frame, { ...b, minY: NaN }, "local"), /Invalid/);
  assert.throws(() => asteroidAttachmentVolumeSide(frame, { ...b, minX: b.maxX + 1 }, "local"), /Invalid/);
});
test("zero-width points and guard planes follow half-open edges without inventing overlap", () => {
  const point = (x: number) => ({ minX: x, maxX: x, minY: 32, maxY: 32, minZ: 0, maxZ: 0 });
  assert(asteroidAttachmentVolumeSide(frame, point(b.minX), "local"));
  assert(!asteroidAttachmentVolumeSide(frame, point(b.maxX), "local"));
  assert(!asteroidAttachmentVolumeSide(frame, { ...b, minY: b.maxY, maxY: b.maxY }, "local"));
});
test("creature contact body catches inside-center and outside-center boundary intrusion", () => {
  assert(asteroidCreatureFootprintSide(frame, creature(), "local"));
  assert(!asteroidCreatureFootprintSide(frame, { ...creature(), x: b.maxX + 10 }, "local"));
  for (const x of [b.maxX - .01, b.maxX + .01, b.minX - .01, b.minX + .01])
    assert.throws(() => asteroidCreatureFootprintSide(frame, { ...creature(), x }, "local"), /boundary/);
  assert.throws(() => asteroidCreatureFootprintSide(frame, { ...creature(), y: b.maxY - .01 }, "local"), /boundary/);
});
test("orbit/local complete body classification agrees and never mutates saved contents", () => {
  const local = creature(), before = structuredClone(local), canonical = { ...local, ...rebaseAsteroidPosition(frame, local, "local") };
  assert(asteroidCreatureFootprintSide(frame, local, "local"));
  assert(asteroidCreatureFootprintSide(frame, canonical, "orbit"));
  const projected = rebaseAsteroidEntities(frame, { creatures: [canonical], sleepingCreatures: [], boats: [], drops: [], leads: [] }, "orbit", []);
  assert(asteroidCreatureFootprintSide(frame, projected.creatures[0], "local"));
  assert.deepEqual(local, before);
});
test("roost and work anchors cannot point across either direction of the ownership boundary", () => {
  for (const inside of [true, false]) {
    const body = { ...creature(), x: inside ? 0 : b.maxX + 10 };
    const other = { x: inside ? b.maxX + 10 : 0, y: 32, z: 0 };
    assert.throws(() => asteroidCreatureFootprintSide(frame, { ...body, morrowRoost: other }, "local"), /anchor/);
    assert.throws(() => asteroidCreatureFootprintSide(frame, { ...body,
      creatureWork: { ...createCreatureWorkState("peelop"), home: other } }, "local"), /anchor/);
  }
});
test("whole dragon home guard rejects a crossing area even when its anchor or sampled corners are outside", () => {
  const dragon = (x: number, z: number, homeX = x, homeZ = z): SavedCreature => ({ ...creature(), kind: "fire-dragon", x, z,
    dragonState: createDragonState("fire", { dragonId: "guard", ageDays: 20,
      home: { lairId: "guard-home", dimension: "overworld", position: { x: homeX, y: 32, z: homeZ }, guardRadius: 12 } }) });
  assert(asteroidCreatureFootprintSide(frame, dragon(0, 0), "local"));
  assert.throws(() => asteroidCreatureFootprintSide(frame, dragon(b.maxX - 8, 0), "local"), /boundary/);
  assert.throws(() => asteroidCreatureFootprintSide(frame, dragon(b.maxX + 8, b.maxZ + 8), "local"), /boundary/);
  assert(!asteroidCreatureFootprintSide(frame, dragon(b.maxX + 20, 0), "local"));
  assert.throws(() => asteroidCreatureFootprintSide(frame, dragon(0, 0, b.maxX + 20, 0), "local"), /anchor/);
});
