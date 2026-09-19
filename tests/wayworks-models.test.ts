import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createWayworksModel, updateWayworksModel, type WayworksModelKind } from "../app/game/wayworks-models.ts";

const kinds: readonly WayworksModelKind[] = [
  "hand-dynamo", "sunplate-array", "field-battery", "charging-pedestal", "grid-cable",
  "heat-engine", "wind-rotor", "waterwheel-generator", "biofuel-engine", "grid-battery", "ship-battery-bank",
  "powered-crusher", "enrichment-mill", "electric-smelter", "alloy-infuser", "plate-press", "precision-sawmill",
  "fluid-pump", "fluid-tank", "gas-tank",
];
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
      for (const time of [0, 0.37, 1.1, 4.7, NaN, Infinity, Number.MAX_VALUE, -Number.MAX_VALUE]) {
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
    "heat-engine": ["hearth-masonry-jamb", "heat-engine-piston", "heat-exchanger-fin"],
    "wind-rotor": ["cloth-wind-rotor", "cream-cloth-panel", "wind-timber-mast"],
    "waterwheel-generator": ["wildwood-waterwheel", "waterwheel-paddle", "waterwheel-rear-dynamo"],
    "biofuel-engine": ["biofuel-copper-vat", "biofuel-iron-cylinder", "biofuel-piston"],
    "grid-battery": ["grid-accumulator-cell", "grid-busbar", "bank-charge-column-1"],
    "ship-battery-bank": ["ship-replaceable-module-2", "ship-module-retaining-rail", "ship-shock-mount"],
    "powered-crusher": ["crusher-left-roller", "crusher-right-roller", "crusher-flared-hopper"],
    "enrichment-mill": ["enrichment-separator-drum", "mill-separator-rib", "concentrate-tray"],
    "electric-smelter": ["smelter-kiln-back", "smelter-heating-element", "kiln-slide-tray"],
    "alloy-infuser": ["alloy-ceramic-crucible", "alloy-stirring-head", "infusion-copper-reservoir"],
    "plate-press": ["plate-press-ram", "press-anvil", "press-guide-rod"],
    "precision-sawmill": ["precision-saw-blade", "saw-cutting-tooth", "sawmill-split-table"],
    "fluid-pump": ["pump-volute-body", "pump-impeller", "pump-rising-outlet"],
    "fluid-tank": ["fluid-level-window", "tank-frame-upright", "fluid-drain-valve"],
    "gas-tank": ["gas-pressure-shoulder", "gas-safe-vent-handwheel", "pressure-rating-plate"],
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

test("powered mechanisms move only while active and return to their readable idle pose", () => {
  const moving: [WayworksModelKind, string, "rotation" | "position", "x" | "y" | "z"][] = [
    ["heat-engine", "heat-engine-piston", "position", "y"],
    ["wind-rotor", "cloth-wind-rotor", "rotation", "z"],
    ["waterwheel-generator", "wildwood-waterwheel", "rotation", "z"],
    ["biofuel-engine", "biofuel-piston", "position", "z"],
    ["powered-crusher", "crusher-left-roller", "rotation", "z"],
    ["enrichment-mill", "enrichment-separator-drum", "rotation", "z"],
    ["alloy-infuser", "alloy-stirring-head", "rotation", "y"],
    ["plate-press", "plate-press-ram", "position", "y"],
    ["precision-sawmill", "precision-saw-blade", "rotation", "z"],
    ["fluid-pump", "pump-impeller", "rotation", "z"],
  ];
  for (const [kind, name, transform, axis] of moving) {
    const root = createWayworksModel(kind);
    const part = root.getObjectByName(name)!;
    const initial = part[transform][axis];
    updateWayworksModel(root, { active: true, time: .37 });
    assert.notEqual(part[transform][axis], initial, `${kind} moves`);
    updateWayworksModel(root, { active: false, time: 3 });
    assert.equal(part[transform][axis], initial, `${kind} returns to idle pose`);
    updateWayworksModel(root, { active: true, time: 0 });
    assert.equal(part[transform][axis], initial, `${kind} reduced motion`);
  }
});

test("full mechanism cycles respect the block envelope and use reflection-independent materials", () => {
  for (const kind of kinds) {
    const root = createWayworksModel(kind, { active: true, fill: 1, fluidFill: 1, progress: 1 });
    for (let frame = 0; frame < 160; frame += 1) {
      updateWayworksModel(root, { time: frame * .05 });
      const bounds = new THREE.Box3().setFromObject(root, true);
      assert.ok(bounds.min.x >= -.5 && bounds.max.x <= .5, `${kind} x sweep`);
      assert.ok(bounds.min.z >= -.5 && bounds.max.z <= .5, `${kind} z sweep`);
      assert.ok(bounds.min.y >= -.001 && bounds.max.y <= 1.001, `${kind} y sweep`);
    }
    for (const surface of resources(root).materials) {
      if (surface instanceof THREE.MeshStandardMaterial) {
        assert.ok(surface.metalness <= .15, `${kind} does not require missing environment reflections`);
        assert.ok(Number.isFinite(surface.emissiveIntensity));
      }
    }
  }
});

test("tank quantity is independent of energy and transparent contents do not cast shadows", () => {
  for (const kind of ["fluid-tank", "gas-tank"] as const) {
    const root = createWayworksModel(kind, { fill: 1, fluidFill: 0 });
    const window = root.getObjectByName(kind === "fluid-tank" ? "fluid-level-window" : "gas-quantity-window") as THREE.Mesh;
    assert.equal(window.visible, false, "charged tank must not invent contents");
    updateWayworksModel(root, { fluidFill: .25 });
    assert.equal(window.scale.y, .25);
    assert.ok(Math.abs(window.position.y - .35) < .00001);
    const needle = root.getObjectByName("gauge-needle")!;
    assert.ok(Math.abs(needle.rotation.z - Math.PI * .35) < .00001, "tank gauge measures contents");
    updateWayworksModel(root, { fill: .6, time: 2 });
    assert.equal(window.scale.y, .25, "partial energy updates preserve fluid quantity");
    updateWayworksModel(root, { fluidFill: NaN });
    assert.equal(window.visible, false);
    const surface = window.material as THREE.MeshStandardMaterial;
    assert.equal(surface.transparent, true);
    assert.ok(surface.opacity >= .4 && surface.opacity <= .8);
    assert.equal(surface.depthWrite, false);
    assert.equal(window.castShadow, false);
    assert.equal(window.receiveShadow, false);
  }
});

test("process gauges preserve normalized progress independently from charge", () => {
  const root = createWayworksModel("plate-press", { fill: 1, progress: .25 });
  const needle = root.getObjectByName("gauge-needle")!;
  const initial = needle.rotation.z;
  updateWayworksModel(root, { fill: 0 });
  assert.equal(needle.rotation.z, initial);
  updateWayworksModel(root, { progress: 1 });
  assert.notEqual(needle.rotation.z, initial);
  updateWayworksModel(root, { progress: Infinity });
  assert.equal(root.userData.wayworksProgress, 0);
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
