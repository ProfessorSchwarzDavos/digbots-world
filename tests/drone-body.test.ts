import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BlockPlayerModel, DRONE_VISUAL_MOTION, droneVisualPose } from "../app/game/player-model";
import { droneBodyBounds, droneBodyRadius } from "../app/game/drone-body";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, asteroidAttachmentPhysicalBounds } from "../app/game/asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide } from "../app/game/asteroid-attachment-creature-footprint";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";

test("shared drone motion exactly preserves old equations and wrapped scanner accumulation", () => {
  assert.deepEqual(DRONE_VISUAL_MOTION, { initialY: 1.28, hoverY: 1.3, hoverAmplitude: .055, rollAmplitude: .025, lensAmplitude: .08 });
  const wrap = (value: number) => Math.atan2(Math.sin(value), Math.cos(value));
  for (const time of [0, .1, .25, .75, 1.75, 3.25, 100]) for (const yaw of [-3, 0, 3]) for (const delta of [0, .016, .2, 2]) {
    const pose = droneVisualPose(time, yaw, delta);
    assert.equal(pose.y, 1.3 + Math.sin(time * 2.1) * .055);
    assert.equal(pose.roll, Math.sin(time * 1.35) * .025);
    assert.equal(pose.pulse, 1 + Math.sin(time * 4.8) * .08);
    assert.equal(pose.scannerYaw, wrap(yaw + delta * 1.7));
  }
  const model = new BlockPlayerModel({ modelKind: "drone" });
  try {
    const root = model.group.getObjectByName("agent-drone-rig")!, scanner = model.group.getObjectByName("drone-scanner-crown")!;
    const lens = model.group.getObjectByName("drone-lens")!;
    assert.equal(root.position.y, 1.28); let time = 0;
    for (const delta of [0, .2, .3, 2, 4]) {
      time += delta; const expected = droneVisualPose(time, scanner.rotation.y, delta); model.update(delta);
      assert.equal(root.position.y, expected.y); assert.equal(root.rotation.z, expected.roll);
      assert.equal(scanner.rotation.y, expected.scannerYaw); assert.deepEqual(lens.scale.toArray(), [expected.pulse, expected.pulse, 1]);
    }
  } finally { model.dispose(); }
});

test("every visible drone vertex fits all-phase bounds over initial and animated poses at multiple headings", () => {
  const anchor = new THREE.Vector3(.125, 32, -.25), bounds = droneBodyBounds(anchor), r = droneBodyRadius();
  assert(Number.isFinite(r) && r > .8); assert(bounds.minY <= anchor.y);
  for (const variant of ["male", "female"] as const) for (const race of ["wayfarer", "dwarf", "atlantian"] as const) {
    const model = new BlockPlayerModel({ modelKind: "drone", variant, race }); model.group.position.copy(anchor);
    try {
      for (const delta of [null, 0, .1, .25, .7, 1.9, 3.4, 11]) {
        if (delta !== null) model.update(delta);
        for (const yaw of [-Math.PI, -1.25, 0, .6, Math.PI / 2, 2.7]) {
          model.group.rotation.y = yaw; model.group.updateMatrixWorld(true);
          model.group.traverseVisible(node => {
            if (!(node instanceof THREE.Mesh)) return;
            const points = node.geometry.getAttribute("position");
            for (let i = 0; i < points.count; i++) {
              const p = new THREE.Vector3().fromBufferAttribute(points, i).applyMatrix4(node.matrixWorld);
              assert(p.x >= bounds.minX - 1e-12 && p.x <= bounds.maxX + 1e-12 && p.y >= bounds.minY - 1e-12
                && p.y <= bounds.maxY + 1e-12 && p.z >= bounds.minZ - 1e-12 && p.z <= bounds.maxZ + 1e-12, node.name);
            }
          });
        }
      }
    } finally { model.dispose(); }
  }
});

test("drone transfer bodies include the anchor and reject either-direction frame intrusion", () => {
  const orbit = locationAddress({ ...homeLocation(universeId("drone-body")), kind: "orbit", instanceId: "low" });
  const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
  const b = asteroidAttachmentPhysicalBounds(frame, "local"), position = { x: 0, y: 32, z: 0 }, before = { ...position };
  assert(asteroidAttachmentVolumeSide(frame, droneBodyBounds(position), "local"));
  for (const x of [b.maxX - .01, b.maxX + .01])
    assert.throws(() => asteroidAttachmentVolumeSide(frame, droneBodyBounds({ ...position, x }), "local"), /boundary/);
  assert.deepEqual(position, before);
  const first = droneBodyBounds(position); Object.assign(first, { maxX: 1e6 }); assert.notEqual(droneBodyBounds(position).maxX, 1e6);
  for (const x of [NaN, Infinity, -Infinity]) assert.throws(() => droneBodyBounds({ ...position, x }), /Invalid/);
});
