import assert from "node:assert/strict";
import test from "node:test";
import { VoxelEngine } from "../app/game/engine";
import { CHARACTER_RACES, characterRaceTraits } from "../app/game/character-profiles";
import { humanBodyBounds, playerBodyHeight } from "../app/game/player-body";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, asteroidAttachmentPhysicalBounds } from "../app/game/asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide } from "../app/game/asteroid-attachment-creature-footprint";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";

test("human transfer height and live engine preserve every sex/race/crouch formula", () => {
  for (const variant of ["male", "female"] as const) for (const race of CHARACTER_RACES) for (const crouching of [false, true]) {
    const expected = (crouching ? 1.48 : 1.8) * ((variant === "female" ? .8 : 1) * characterRaceTraits(race).heightScale);
    assert.equal(playerBodyHeight(variant, race, crouching), expected);
    const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
    engine.playerVariant = variant; engine.crouching = crouching;
    Object.assign(engine, { activeCharacterProfile: { appearance: { race } } });
    assert.equal(engine.currentPlayerHeight(), expected);
    const bounds = humanBodyBounds({ x: .125, y: 32, z: -.25 }, { variant, race, crouching });
    assert.deepEqual(bounds, { minX: .125 - .3, maxX: .125 + .3, minY: 32, maxY: 32 + expected, minZ: -.25 - .3, maxZ: -.25 + .3 });
  }
});
test("missing local profile keeps the existing wayfarer default and override hooks remain callable", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.playerVariant = "female"; engine.crouching = true;
  assert.equal(engine.currentPlayerHeight(), 1.48 * .8);
  engine.currentPlayerHeight = () => 2.75;
  assert.equal(engine.currentPlayerHeight(), 2.75);
});
test("whole human bodies catch outside-origin intrusion and preserve exact state", () => {
  const orbit = locationAddress({ ...homeLocation(universeId("human-body")), kind: "orbit", instanceId: "low" });
  const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
  const b = asteroidAttachmentPhysicalBounds(frame, "local"), state = { variant: "female" as const, race: "hearthkin" as const, crouching: true };
  const position = { x: 0, y: 32, z: 0 }, before = structuredClone({ position, state });
  assert(asteroidAttachmentVolumeSide(frame, humanBodyBounds(position, state), "local"));
  for (const x of [b.maxX - .01, b.maxX + .01])
    assert.throws(() => asteroidAttachmentVolumeSide(frame, humanBodyBounds({ ...position, x }, state), "local"), /boundary/);
  assert.deepEqual({ position, state }, before);
});
test("transfer geometry refuses unknown races, malformed poses and nonboolean stance instead of normalizing", () => {
  const state = { variant: "male" as const, race: "wayfarer" as const, crouching: false }, position = { x: 0, y: 32, z: 0 };
  for (const point of [{ ...position, x: NaN }, { ...position, y: Infinity }]) assert.throws(() => humanBodyBounds(point, state), /Invalid/);
  for (const patch of [{ variant: "other" }, { race: "other" }, { crouching: 1 }])
    assert.throws(() => humanBodyBounds(position, { ...state, ...patch } as typeof state), /Invalid/);
});
