import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { ITEMS, Item } from "../app/game/data";
import { createAvatarHeldItemModel } from "../app/game/held-items";
import { WORLD_DROP_VISUAL, worldDropBodyBounds, worldDropBodyRadius, worldDropUsesFilledOrb } from "../app/game/world-drop-body";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb, captureOrbFromInventorySlot } from "../app/game/capture-orbs";
import { normalizeCreatureMetadata } from "../app/game/creature-cage";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, asteroidAttachmentPhysicalBounds } from "../app/game/asteroid-attachment-frame";
import { asteroidAttachedDropIndices } from "../app/game/asteroid-attachment-drops";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";

function dispose(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  root.traverse(node => { if (node instanceof THREE.Mesh) { geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material); } });
  for (const geometry of geometries) geometry.dispose(); for (const material of materials) material.dispose();
}
test("all catalog drop models and filled orbs have finite conservative bounds covering real vertices", t => {
  const items = Object.keys(ITEMS).map(Number), anchor = new THREE.Vector3(17.125, 32, -9.5);
  for (const item of items) for (const filled of item === Item.CaptureOrb ? [false, true] : [false]) {
    const radius = worldDropBodyRadius(item, filled), model = createAvatarHeldItemModel(item, { filledCaptureOrb: filled });
    assert(model, `item${item} has no model`); assert(radius >= .15 && Number.isFinite(radius));
    // Snapshot pre-extraction engine scale; overwrite the held root translation.
    model.scale.multiplyScalar(.52); model.position.copy(anchor);
    try {
      for (const age of [0, .75, 3.25]) {
        model.rotation.set(Math.sin(age * .9) * .035, age * 2.5, .12);
        model.traverse(node => {
          if (node.userData.jarBug) {
            node.position.y = (Number(node.userData.baseY) || 0) + Math.sin(age * 2.6 + item) * .045;
            node.rotation.y = Math.sin(age * 1.7) * .48;
          } else if (node.userData.jarBugWing) node.rotation.z = (Number(node.userData.side) || 1) * (.14 + Math.sin(age * 18) * .25);
          if (node.userData.eggShimmer) {
            node.scale.setScalar(.88 + Math.sin(age * 3.2 + Number(node.userData.shimmerPhase ?? 0)) * .14);
            node.rotation.y = age * (.45 + Number(node.userData.shimmerPhase ?? 0) * .04);
          }
        });
        model.updateMatrixWorld(true);
        model.traverse(node => {
          if (!(node instanceof THREE.Mesh)) return;
          const positions = node.geometry.getAttribute("position");
          for (let index = 0; index < positions.count; index++) {
            const point = new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(node.matrixWorld);
            assert(point.distanceTo(anchor) <= radius + 1e-12, `item${item}/${node.name}/age${age} escapes radius${radius}`);
          }
        });
      }
    } finally { dispose(model); }
  }
  t.diagnostic(`Covered ${items.length} catalog items plus the filled Capture Orb variant.`);
});
test("shared constants and filled-orb predicate exactly match prior engine behavior", () => {
  assert.deepEqual(WORLD_DROP_VISUAL, { scale: .52, jarBob: .045, eggShimmerBase: .88, eggShimmerAmplitude: .14, groundProbeOffset: .15 });
  const creature = normalizeCreatureMetadata({ schema: 1, entityId: "drop-specimen", kind: "peelop", health: 5, maxHealth: 7 })!;
  const filled = captureOrbInventorySlot(captureIntoOrb(createEmptyCaptureOrb("drop-orb"), creature, 42)!);
  const empty = captureOrbInventorySlot(createEmptyCaptureOrb("empty"));
  for (const item of [Item.CaptureOrb, Item.FieldWrench]) for (const metadata of [undefined, {}, filled.metadata, empty.metadata, { captureOrb: "invalid" }]) {
    const before = structuredClone(metadata);
    assert.equal(worldDropUsesFilledOrb(item, metadata), item === Item.CaptureOrb
      && Boolean(captureOrbFromInventorySlot({ item, count: 1, ...(metadata ? { metadata } : {}) })?.creature));
    assert.deepEqual(metadata, before);
  }
  assert(worldDropUsesFilledOrb(Item.CaptureOrb, filled.metadata));
  assert(!worldDropUsesFilledOrb(Item.CaptureOrb, empty.metadata));
});
test("bounds preserve resource metadata and return detached values", () => {
  const drop = { item: Item.LightningBugJar, count: 3, durability: 19, x: .1, y: 32.25, z: -.7, age: 99,
    metadata: { x: 999, sealed: { oxygenMl: 4000, fuelMl: 17, specimenId: "opaque" } } };
  const before = structuredClone(drop), bounds = worldDropBodyBounds(drop);
  assert.deepEqual(drop, before); assert(bounds.minY <= drop.y - .15);
  Object.assign(bounds, { minX: -999 }); assert.notEqual(worldDropBodyBounds(drop).minX, -999);
  for (const item of [-1, NaN, Infinity, 999999999]) assert.throws(() => worldDropBodyRadius(item), /Unknown/);
  assert.throws(() => worldDropBodyBounds({ ...drop, x: NaN }), /Invalid/);
});
test("drop selection uses complete footprints and exact canonical source indices without sorting or merging", () => {
  const orbit = locationAddress({ ...homeLocation(universeId("drop-footprint")), kind: "orbit", instanceId: "low" });
  const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
  const b = asteroidAttachmentPhysicalBounds(frame, "local");
  const drop = { item: Item.FieldWrench, count: 1, durability: 51, x: 0, y: 32, z: 0, age: 4 };
  const input = [{ ...drop, x: 80 }, drop, { ...drop, x: 1 }, { ...drop, x: -80 }], before = structuredClone(input);
  assert.deepEqual(asteroidAttachedDropIndices(frame, input, "local"), [1, 2]); assert.deepEqual(input, before);
  for (const x of [b.maxX - .01, b.maxX + .01])
    assert.throws(() => asteroidAttachedDropIndices(frame, [{ ...drop, x }], "local"), /boundary/);
});
