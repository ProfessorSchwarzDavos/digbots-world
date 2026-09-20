import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { PRESSURE_MODEL_KINDS, createPressureModel, isPressureModelKind, updatePressureModel, type PressureModelKind } from "../app/game/pressure-models.ts";

const doors = new Set<PressureModelKind>(["pressure-door", "horizon-door", "emergency-shutter"]);
const faces = ["front", "back", "left", "right", "top", "bottom"] as const;
function resources(root: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  return { geometries, materials };
}
function bounds(root: THREE.Group, width: number, height: number) {
  const box = new THREE.Box3().setFromObject(root, true);
  assert.ok(box.min.x >= -width / 2 - .00001 && box.max.x <= width / 2 + .00001, `${root.name} X ${box.min.x}..${box.max.x}`);
  assert.ok(box.min.z >= -.50001 && box.max.z <= .50001, `${root.name} Z ${box.min.z}..${box.max.z}`);
  assert.ok(box.min.y >= -.00001 && box.max.y <= height + .00001, `${root.name} Y ${box.min.y}..${box.max.y}`);
}

test("all 26 authored kinds have bounded finite geometry and modest materials through animation", () => {
  assert.equal(PRESSURE_MODEL_KINDS.length, 26);
  for (const kind of PRESSURE_MODEL_KINDS) {
    assert.equal(isPressureModelKind(kind), true);
    const root = createPressureModel(kind);
    for (const geometry of resources(root).geometries) {
      for (const attribute of ["position", "normal"]) for (const value of geometry.getAttribute(attribute).array) assert.ok(Number.isFinite(value), `${kind} ${attribute}`);
    }
    for (let frame = 0; frame < 50; frame++) {
      updatePressureModel(root, { time: frame * .17, active: true, fill: 1, fluidFill: 1, open: frame / 49, alarm: true, locked: frame % 2 === 0 });
      bounds(root, kind === "hangar-pressure-gate" ? 3 : 1, kind === "hangar-pressure-gate" ? 3 : doors.has(kind) ? 2 : 1);
    }
    for (const surface of resources(root).materials) if (surface instanceof THREE.MeshStandardMaterial) {
      assert.ok(surface.metalness <= .12); assert.equal(surface.envMap, null);
      if (surface.transparent) { assert.equal(surface.depthWrite, false); assert.ok(surface.opacity < .6); }
    }
  }
  for (const value of ["unknown", "grid-cable", null, 0, {}]) assert.equal(isPressureModelKind(value), false);
  assert.throws(() => createPressureModel("unknown" as PressureModelKind), /Unknown pressure model/);
});

test("each mechanism has its own recognizable named assembly", () => {
  const signatures: Record<PressureModelKind, string> = {
    "liquid-pipe": "liquid-inspection-strip", gasline: "gas-direction-chevron", "heat-conduit": "ceramic-thermal-break",
    "atmospheric-condenser": "condenser-intake-fan", electrolyzer: "oxygen-separation-vessel", "gas-compressor": "compressor-reciprocating-crosshead",
    "fluid-refinery": "fractionating-tower", "chemical-mixer": "mixer-paddle-head", "reaction-chamber": "reactor-observation-glass",
    "carbon-scrubber": "replaceable-filter-cartridge", "life-support-controller": "oxygen-dial", "thermal-regulator": "thermal-exchanger-fin",
    "hydrogen-turbine": "hydrogen-turbine-rotor", "methane-reformer": "reformer-catalyst-column", "gas-engine": "gas-engine-flywheel",
    "pressure-door": "narrow-reinforced-vision-glass", "horizon-door": "door-leaf-1-1", "hangar-pressure-gate": "hangar-shutter-11",
    "airlock-controller": "airlock-cycle-wheel", "atmosphere-vent": "directional-vent-vane", "equalization-vent": "vent-check-valve-wheel",
    "recovery-pump": "glass-moisture-trap", "pressure-sensor": "pressure-threshold-dial-needle", "emergency-shutter": "failsafe-charge-cassette",
    "reinforced-window": "thick-laminated-glass", "hangar-frame": "hangar-gusset-rib",
  };
  for (const kind of PRESSURE_MODEL_KINDS) assert.ok(createPressureModel(kind).getObjectByName(signatures[kind]), `${kind}: ${signatures[kind]}`);
});

test("machine and pipe ports preserve all six Wayworks overlay normals", () => {
  const normals = [[0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0], [0, 1, 0], [0, -1, 0]];
  for (const kind of PRESSURE_MODEL_KINDS.filter(k => k !== "reinforced-window" && k !== "hangar-frame")) {
    const root = createPressureModel(kind);
    faces.forEach((face, i) => {
      const port = root.getObjectByName(`port-${face}`)!; assert.ok(port, `${kind} ${face}`);
      assert.equal(port.userData.wayworksFace, face);
      assert.ok(new THREE.Vector3(0, 0, -1).applyQuaternion(port.quaternion).distanceTo(new THREE.Vector3(...normals[i])) < 1e-6);
    });
  }
});

test("idle mechanisms and ribbons stop; fluid and progress telemetry remain independent of power", () => {
  const motions: [PressureModelKind, string, "position" | "rotation", "y" | "z"][] = [
    ["atmospheric-condenser", "condenser-intake-fan", "rotation", "z"],
    ["gas-compressor", "compressor-reciprocating-crosshead", "position", "y"],
    ["chemical-mixer", "mixer-paddle-head", "rotation", "y"],
    ["thermal-regulator", "thermal-circulation-fan", "rotation", "z"],
    ["hydrogen-turbine", "hydrogen-turbine-rotor", "rotation", "z"],
    ["gas-engine", "gas-engine-flywheel", "rotation", "z"],
    ["recovery-pump", "recovery-drive-piston", "position", "y"],
  ];
  for (const [kind, name, transform, axis] of motions) {
    const root = createPressureModel(kind), part = root.getObjectByName(name)!;
    const initial = part[transform][axis]; updatePressureModel(root, { active: true, time: .3 }); assert.notEqual(part[transform][axis], initial);
    updatePressureModel(root, { active: false, time: 5 }); assert.equal(part[transform][axis], initial);
    updatePressureModel(root, { active: true, time: 0 }); assert.equal(part[transform][axis], initial);
  }
  for (const kind of ["atmosphere-vent", "equalization-vent"] as const) {
    const root = createPressureModel(kind); const ribbons: THREE.Object3D[] = [];
    root.traverse(o => { if (o.name === "active-flow-ribbon") ribbons.push(o); });
    assert.equal(ribbons.length, kind === "equalization-vent" ? 2 : 1);
    assert.ok(ribbons.every(r => !r.visible)); updatePressureModel(root, { active: true }); assert.ok(ribbons.every(r => r.visible));
    updatePressureModel(root, { active: false }); assert.ok(ribbons.every(r => !r.visible));
  }
  const root = createPressureModel("electrolyzer", { fill: 1, fluidFill: 0, progress: .25 });
  const column = root.getObjectByName("oxygen-sight-column")!, needle = root.getObjectByName("process-dial-needle")!;
  assert.equal(column.visible, false); const angle = needle.rotation.z;
  updatePressureModel(root, { fill: 0, fluidFill: .5 }); assert.equal(column.scale.y, .5); assert.equal(needle.rotation.z, angle);
});

test("personnel leaves and hangar shutters actually clear their passage; locks and alarms have geometry", () => {
  for (const kind of doors) {
    const root = createPressureModel(kind, { open: 0, locked: true });
    const leaf = root.getObjectByName("door-leaf-1-0")!;
    assert.ok(new THREE.Box3().setFromObject(leaf).min.x < .01);
    updatePressureModel(root, { open: 1, locked: false, alarm: true });
    const box = new THREE.Box3().setFromObject(leaf);
    assert.ok(kind === "emergency-shutter" ? box.min.y > 1.85 : box.min.x > .4, `${kind} clear opening`);
    assert.equal(root.getObjectByName("door-locking-dog")!.rotation.z, Math.PI / 2);
    assert.equal(root.getObjectByName("mechanical-alarm-flag")!.visible, true);
    updatePressureModel(root, { open: 0, locked: true, alarm: false }); assert.ok(new THREE.Box3().setFromObject(leaf).min.x < .01);
    assert.equal(root.getObjectByName("door-locking-dog")!.rotation.z, 0);
    assert.equal(root.getObjectByName("mechanical-alarm-flag")!.visible, false);
  }
  const gate = createPressureModel("hangar-pressure-gate"); const refs = resources(gate);
  for (const size of [-10, 3, 5, 9, 30, NaN, Infinity]) {
    const normalized = Number.isFinite(size) ? Math.min(9, Math.max(3, Math.round(size))) : 3;
    for (const open of [0, .5, 1]) {
      updatePressureModel(gate, { gateWidth: size, gateHeight: size, open, locked: false }); bounds(gate, normalized, normalized);
      if (open === 1) for (let i = 0; i < 12; i++) assert.ok(new THREE.Box3().setFromObject(gate.getObjectByName(`hangar-shutter-${i}`)!).min.y > normalized - .3);
    }
  }
  assert.deepEqual(resources(gate), refs, "dimension updates reuse GPU resources");
});

test("pipe connectivity and connected window borders reflect only supplied state", () => {
  const pipe = createPressureModel("gasline", { connected: { front: false, top: true } });
  assert.equal(pipe.getObjectByName("port-front")!.visible, false); assert.equal(pipe.getObjectByName("port-top")!.visible, true);
  updatePressureModel(pipe, { connected: { left: true } }); assert.equal(pipe.getObjectByName("port-front")!.visible, false);
  assert.equal(pipe.getObjectByName("connected-left")!.visible, true);
  const window = createPressureModel("reinforced-window", { connected: { left: true } });
  assert.equal(window.getObjectByName("connected-border-left")!.visible, false);
  assert.equal(window.getObjectByName("connected-border-right")!.visible, true);
  const frame = createPressureModel("hangar-frame", { connected: { left: false, right: true } });
  assert.equal(frame.getObjectByName("connected-border-left")!.visible, true, "structural frame stays intact");
});

test("invalid telemetry clamps safely and updates retain object and GPU identity", () => {
  for (const kind of PRESSURE_MODEL_KINDS) {
    const root = createPressureModel(kind, { fill: .5, open: .25 }), before = resources(root);
    const objects: THREE.Object3D[] = []; root.traverse(o => objects.push(o));
    for (const time of [NaN, Infinity, Number.MAX_VALUE, -Number.MAX_VALUE]) {
      updatePressureModel(root, { time, active: true, fill: NaN, fluidFill: Infinity, progress: -1, open: 2 });
      root.traverse(o => assert.ok([...o.position.toArray(), ...o.scale.toArray(), o.rotation.x, o.rotation.y, o.rotation.z].every(Number.isFinite)));
    }
    assert.equal(root.userData.pressureFill, 0); assert.equal(root.userData.pressureOpen, 1);
    assert.deepEqual(resources(root), before); const after: THREE.Object3D[] = []; root.traverse(o => after.push(o)); assert.deepEqual(after, objects);
    updatePressureModel(root, { time: 0 }); assert.equal(root.userData.pressureOpen, 1);
  }
  assert.doesNotThrow(() => updatePressureModel(new THREE.Group(), { fill: 1 }));
});

test("independent model resources are reachable for ordinary renderer disposal", () => {
  for (const kind of PRESSURE_MODEL_KINDS) {
    const first = resources(createPressureModel(kind)), second = resources(createPressureModel(kind)); let disposed = 0;
    for (const resource of [...first.geometries, ...first.materials]) {
      assert.ok(!second.geometries.has(resource as THREE.BufferGeometry)); assert.ok(!second.materials.has(resource as THREE.Material));
      resource.addEventListener("dispose", () => { disposed++; }); resource.dispose();
    }
    assert.equal(disposed, first.geometries.size + first.materials.size);
  }
});
