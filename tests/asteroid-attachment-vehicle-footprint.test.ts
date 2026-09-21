import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createSailboatVisual, disposeSailboatVisual, sailboatVisualPose, type SailboatSave } from "../app/game/boats";
import { asteroidSailboatFootprintSide, sailboatAttachmentBodyBounds } from "../app/game/asteroid-attachment-vehicle-footprint";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { asteroidAttachmentPhysicalBounds, createAsteroidAttachmentFrame, rebaseAsteroidPosition } from "../app/game/asteroid-attachment-frame";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
const orbit = locationAddress({ ...homeLocation(universeId("vehicle-footprints")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const boat = (): SailboatSave => ({ id: "boat", x: 0, y: 32, z: 0, yaw: 0, velocity: 1, passengers: [], ownerId: "host",
  inventory: [{ item: 100, count: 2, metadata: { x: 9000, sealedEnergyJ: 4123 } }] });
test("shared pose preserves the old three-sample engine equations exactly", () => {
  for (const gravity of [0, .02, .166, 1, 2, 4, 100]) for (const now of [0, 12.345, 123456, 1e9]) {
    const source = { ...boat(), x: 7.125, z: -3.1, yaw: .72 }, before = structuredClone(source);
    const times = [now, now + .02, now + .034]; let index = 0;
    const actual = sailboatVisualPose(source, gravity, () => times[index++]);
    const bob = Math.min(1.8, Math.sqrt(gravity));
    assert.deepEqual(actual, { x: source.x, y: source.y + Math.sin(times[0] * .0018 + source.x) * .025 * bob, z: source.z,
      pitch: Math.sin(times[1] * .0013 + source.z) * .018 * bob, yaw: source.yaw,
      roll: Math.sin(times[2] * .0016 + source.x) * .025 * bob });
    assert.equal(index, 3); assert.deepEqual(source, before);
  }
});
test("conservative full model bounds enclose every rendered vertex over yaw, gravity and animation phases", () => {
  const visual = createSailboatVisual("footprint-oracle");
  try {
    for (const yaw of [0, .2, Math.PI / 4, Math.PI / 2, Math.PI, 5.7]) for (const gravity of [0, .166, 1, 3.24, 100])
      for (const time of [0, 103, 611, 1500, 9876, 12895]) {
        const source = { ...boat(), x: 10.125, z: -7.5, yaw }, b = sailboatAttachmentBodyBounds(source);
        const pose = sailboatVisualPose(source, gravity, () => time);
        visual.position.set(pose.x, pose.y, pose.z); visual.rotation.set(pose.pitch, pose.yaw, pose.roll); visual.updateMatrixWorld(true);
        visual.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          const positions = object.geometry.getAttribute("position");
          for (let i = 0; i < positions.count; i++) {
            const p = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
            assert(p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY && p.z >= b.minZ && p.z <= b.maxZ,
              `${object.name} escaped at yaw${yaw}/gravity${gravity}/time${time}`);
          }
        });
      }
  } finally { disposeSailboatVisual(visual); }
});
test("full vessel catches inside and outside origin intrusions, including sail height", () => {
  const b = asteroidAttachmentPhysicalBounds(frame, "local"), source = boat();
  assert(asteroidSailboatFootprintSide(frame, source, "local"));
  assert(!asteroidSailboatFootprintSide(frame, { ...source, x: b.maxX + 10 }, "local"));
  for (const x of [b.maxX - .1, b.maxX + .1])
    assert.throws(() => asteroidSailboatFootprintSide(frame, { ...source, x }, "local"), /boundary/);
  assert.throws(() => asteroidSailboatFootprintSide(frame, { ...source, y: b.maxY - 1 }, "local"), /boundary/);
});
test("yaw changes complete extent and orbit/local projection preserves finite cargo", () => {
  const source = boat(), before = structuredClone(source), b = sailboatAttachmentBodyBounds(source), turned = sailboatAttachmentBodyBounds({ ...source, yaw: Math.PI / 2 });
  assert(b.maxZ - b.minZ > b.maxX - b.minX); assert(turned.maxX - turned.minX > turned.maxZ - turned.minZ);
  const canonical = { ...source, ...rebaseAsteroidPosition(frame, source, "local") };
  assert(asteroidSailboatFootprintSide(frame, canonical, "orbit")); assert.deepEqual(source, before);
  Object.assign(b, { minX: -9000 }); assert.notEqual(sailboatAttachmentBodyBounds(source).minX, -9000);
});
test("malformed vessel poses reject instead of being normalized", () => {
  for (const field of ["x", "y", "z", "yaw"] as const) for (const value of [NaN, Infinity, -Infinity])
    assert.throws(() => sailboatAttachmentBodyBounds({ ...boat(), [field]: value }), /Invalid/);
});
