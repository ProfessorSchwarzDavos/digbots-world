import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry, expandAsteroidRegistry } from "../app/game/asteroid-custody";
import { asteroidAttachmentContains, createAsteroidAttachmentFrame, rebaseAsteroidPosition } from "../app/game/asteroid-attachment-frame";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
const orbit = locationAddress({ ...homeLocation(universeId("centered-frames")), kind: "orbit", instanceId: "low" });
const initial = createAsteroidRegistry(orbit, 902);
const registry = expandAsteroidRegistry(initial, 3, { orbit, seed: initial.seed, epoch: initial.epoch, expectedRevision: initial.revision });
const first = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
test("continuous frame left edge includes the complete first centered voxel", () => {
  const point = { x: first.localBounds.minX - .25, y: 32, z: 0 };
  assert(asteroidAttachmentContains(first, { x: Math.floor(point.x + .5), y: 32, z: 0 }, "local"));
  assert.doesNotThrow(() => rebaseAsteroidPosition(first, point, "local"));
});
test("continuous frame right edge excludes points belonging to the next centered voxel", () => {
  const point = { x: first.localBounds.maxX + .75, y: 32, z: 0 };
  assert(!asteroidAttachmentContains(first, { x: Math.floor(point.x + .5), y: 32, z: 0 }, "local"));
  assert.throws(() => rebaseAsteroidPosition(first, point, "local"), /boundary/);
});
test("all252 frames use the same centered-cell half-open edges on every axis in both views", () => {
  assert.equal(registry.asteroids.length, 252);
  for (const asteroid of registry.asteroids) {
    const frame = createAsteroidAttachmentFrame(registry, asteroid.descriptor.id);
    for (const view of ["orbit", "local"] as const) {
      const bounds = view === "orbit" ? frame.orbitBounds : frame.localBounds;
      const center = view === "orbit" ? { ...asteroid.descriptor.center } : { x: 0, y: 32, z: 0 };
      for (const [axis, min, max] of [["x", bounds.minX, bounds.maxX], ["y", bounds.minY, bounds.maxY], ["z", bounds.minZ, bounds.maxZ]] as const) {
        for (const value of [min - .5, min - .25, min, max, max + .25, max + .5 - 1 / 1024]) {
          const point = { ...center, [axis]: value }, cell = { x: Math.floor(point.x + .5), y: Math.floor(point.y + .5), z: Math.floor(point.z + .5) };
          assert(asteroidAttachmentContains(frame, cell, view));
          const projected = rebaseAsteroidPosition(frame, point, view);
          assert.deepEqual(rebaseAsteroidPosition(frame, projected, view === "orbit" ? "local" : "orbit"), point);
        }
        for (const value of [min - .5 - 1 / 1024, max + .5])
          assert.throws(() => rebaseAsteroidPosition(frame, { ...center, [axis]: value }, view), /boundary/);
      }
    }
  }
});
