import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createFieldWrenchModel } from "../app/game/wayworks-wrench-model.ts";

function resources(root: THREE.Group) {
  const resources = new Set<THREE.BufferGeometry | THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material);
  });
  return resources;
}

test("field wrench has real open jaws, grip origin, and a compact finite silhouette", () => {
  const root = createFieldWrenchModel();
  const bounds = new THREE.Box3().setFromObject(root, true);
  assert.ok(bounds.min.y >= -.3 && bounds.max.y <= .6);
  assert.ok(bounds.max.x - bounds.min.x < .4);
  assert.ok(bounds.max.z - bounds.min.z < .15);
  for (const name of ["wrench-fixed-jaw", "wrench-adjustable-jaw", "wrench-knurled-adjuster", "leather-wrapped-grip", "wrench-tether-eye", "field-mode-selector-recess"]) {
    assert.ok(root.getObjectByName(name), name);
  }
  const grip = new THREE.Box3().setFromObject(root.getObjectByName("leather-wrapped-grip")!, true);
  assert.ok(grip.containsPoint(new THREE.Vector3()), "hand origin lies within the wrapped grip");
  // Looking straight through the fork mouth must not hit an invisible face or
  // generic solid tool-head box.
  root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(.015, .48, -.3), new THREE.Vector3(0, 0, 1));
  assert.equal(ray.intersectObject(root, true).length, 0, "open wrench mouth");
  for (const resource of resources(root)) {
    if (resource instanceof THREE.BufferGeometry) {
      for (const value of resource.getAttribute("position").array) assert.ok(Number.isFinite(value));
    }
  }
});

test("field wrench resources are self-owned and reachable by normal disposal traversal", () => {
  const first = resources(createFieldWrenchModel());
  const second = resources(createFieldWrenchModel());
  let disposed = 0;
  for (const resource of first) {
    assert.ok(!second.has(resource));
    resource.addEventListener("dispose", () => { disposed += 1; });
    resource.dispose();
  }
  assert.equal(disposed, first.size);
});
