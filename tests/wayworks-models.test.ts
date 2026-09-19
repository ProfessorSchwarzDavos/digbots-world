import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createWayworksModel, updateWayworksModel, type WayworksModelKind } from "../app/game/wayworks-models.ts";

const kinds: readonly WayworksModelKind[] = ["hand-dynamo", "sunplate-array", "field-battery", "charging-pedestal", "grid-cable"];
const faces = ["front", "back", "left", "right", "top", "bottom"];

function resources(root: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  return { geometries, materials };
}

test("machine meshes remain finite and inside one cell at all sampled animation poses", () => {
  for (const kind of kinds) {
    const root = createWayworksModel(kind);
    for (const geometry of resources(root).geometries) {
      const positions = geometry.getAttribute("position");
      for (const number of positions.array) assert.ok(Number.isFinite(number), `${kind} finite vertices`);
      const normals = geometry.getAttribute("normal");
      for (const number of normals.array) assert.ok(Number.isFinite(number), `${kind} finite normals`);
    }
    for (const fill of [0, 0.5, 1, NaN, Infinity, -1, 2]) {
      for (const time of [0, 0.37, 1.1, 4.7, NaN, Infinity]) {
        updateWayworksModel(root, { fill, active: true, time });
        const bounds = new THREE.Box3().setFromObject(root, true);
        assert.ok(bounds.min.x >= -0.5 && bounds.max.x <= 0.5, `${kind} x bounds ${bounds.min.x},${bounds.max.x}`);
        assert.ok(bounds.min.z >= -0.5 && bounds.max.z <= 0.5, `${kind} z bounds ${bounds.min.z},${bounds.max.z}`);
        assert.ok(bounds.min.y >= -0.001 && bounds.max.y <= 1.001, `${kind} y bounds ${bounds.min.y},${bounds.max.y}`);
      }
    }
  }
});

test("every machine has six oriented local sockets that follow root facing", () => {
  const expected: Record<string, THREE.Vector3> = {
    front: new THREE.Vector3(0, 0, -1), back: new THREE.Vector3(0, 0, 1),
    left: new THREE.Vector3(-1, 0, 0), right: new THREE.Vector3(1, 0, 0),
    top: new THREE.Vector3(0, 1, 0), bottom: new THREE.Vector3(0, -1, 0),
  };
  for (const kind of kinds) {
    const root = createWayworksModel(kind);
    for (const face of faces) {
      const port = root.getObjectByName(`port-${face}`);
      assert.ok(port, `${kind} ${face} socket`);
      assert.equal(port.userData.wayworksFace, face);
      const normal = new THREE.Vector3(0, 0, -1).applyQuaternion(port.quaternion);
      assert.ok(normal.distanceTo(expected[face]) < 0.00001, `${kind} ${face} normal`);
    }
    root.rotation.y = Math.PI / 2;
    root.updateMatrixWorld(true);
    const front = root.getObjectByName("port-front")!;
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(front.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(direction.distanceTo(new THREE.Vector3(-1, 0, 0)) < 0.00001);
  }
});

test("models carry distinct authored mechanisms and truthful battery and empty-cradle states", () => {
  const signatures: Record<WayworksModelKind, string[]> = {
    "hand-dynamo": ["dynamo-flywheel", "leather-crank-grip", "flywheel-spoke-2"],
    "sunplate-array": ["tilted-sunplate", "sun-cell-0-0", "sun-cell-3-2"],
    "field-battery": ["battery-charge-column", "battery-cage-upright", "battery-carry-handle"],
    "charging-pedestal": ["charging-dish", "charging-induction-ring", "cell-contact"],
    "grid-cable": ["x-cable-insulation", "y-copper-conductor", "z-copper-conductor"],
  };
  for (const kind of kinds) {
    const root = createWayworksModel(kind);
    for (const name of signatures[kind]) assert.ok(root.getObjectByName(name), `${kind}: ${name}`);
    assert.ok(resources(root).geometries.size > 20, `${kind} has an authored assembly`);
  }
  const panel = createWayworksModel("sunplate-array").getObjectByName("tilted-sunplate")!;
  assert.ok(Math.abs(panel.rotation.x) > 0.3);
  const battery = createWayworksModel("field-battery", { fill: 0 });
  const core = battery.getObjectByName("battery-charge-column")!;
  assert.equal(core.visible, false);
  updateWayworksModel(battery, { fill: 0.5 });
  assert.equal(core.visible, true);
  assert.equal(core.scale.y, 0.5);
  assert.ok(Math.abs(core.position.y - 0.425) < 0.00001);
  updateWayworksModel(battery, { fill: 1 });
  assert.equal(core.scale.y, 1);
  assert.ok(Math.abs(core.position.y - 0.54) < 0.00001);
  const charger = createWayworksModel("charging-pedestal", { active: true });
  assert.equal(charger.getObjectByName("inserted-cell"), undefined, "an energized charger does not manufacture an inserted cell");
});

test("updates reuse scene and GPU references, clamp state, and support stable reduced motion", () => {
  for (const kind of kinds) {
    const root = createWayworksModel(kind, { fill: 0.3 });
    const before = resources(root);
    const objects: THREE.Object3D[] = [];
    root.traverse((object) => objects.push(object));
    for (let index = 0; index < 100; index += 1) updateWayworksModel(root, { fill: index / 100, active: true, time: index / 10 });
    const after = resources(root);
    assert.deepEqual(after, before);
    const next: THREE.Object3D[] = [];
    root.traverse((object) => next.push(object));
    assert.deepEqual(next, objects);
    updateWayworksModel(root, { fill: Infinity, active: false });
    assert.equal(root.userData.wayworksFill, 0);
    updateWayworksModel(root, { fill: 2 });
    assert.equal(root.userData.wayworksFill, 1);
    updateWayworksModel(root, { time: 0, active: true });
    const snapshot = objects.map((object) => [object.position.toArray(), object.rotation.toArray(), object.scale.toArray()]);
    updateWayworksModel(root, { time: 0 });
    assert.deepEqual(objects.map((object) => [object.position.toArray(), object.rotation.toArray(), object.scale.toArray()]), snapshot);
    assert.equal(root.userData.wayworksFill, 1, "partial animation updates preserve fill");
  }
  const dynamo = createWayworksModel("hand-dynamo", { active: true });
  updateWayworksModel(dynamo, { time: 0.4 });
  assert.equal(dynamo.getObjectByName("dynamo-flywheel")!.rotation.z, -0.8);
  updateWayworksModel(dynamo, { active: false, time: 0.8 });
  assert.equal(dynamo.getObjectByName("dynamo-flywheel")!.rotation.z, 0);
  assert.doesNotThrow(() => updateWayworksModel(new THREE.Group(), { fill: 1 }));
});

test("disposal traversal reaches model resources without sharing them with another instance", () => {
  for (const kind of kinds) {
    const first = resources(createWayworksModel(kind));
    const second = resources(createWayworksModel(kind));
    let disposed = 0;
    for (const resource of [...first.geometries, ...first.materials]) {
      assert.ok(!second.geometries.has(resource as THREE.BufferGeometry));
      assert.ok(!second.materials.has(resource as THREE.Material));
      resource.addEventListener("dispose", () => { disposed += 1; });
      resource.dispose();
    }
    assert.equal(disposed, first.geometries.size + first.materials.size);
  }
});
