import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  SPACEFLIGHT_MODEL_KINDS, createSpaceflightModel, isSpaceflightModelKind, updateSpaceflightModel,
  type SpaceflightModelKind,
} from "../app/game/spaceflight-models.ts";

function resources(root: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  return { geometries, materials };
}

function visibleBounds(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  root.traverseVisible(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.computeBoundingBox();
    bounds.union(object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld));
  });
  return bounds;
}

test("all eleven authored models have finite geometry, bounded poses and readable materials", () => {
  assert.equal(SPACEFLIGHT_MODEL_KINDS.length, 11);
  for (const kind of SPACEFLIGHT_MODEL_KINDS) {
    const root = createSpaceflightModel(kind);
    assert.equal(root.name, `spaceflight-${kind}`);
    assert.equal(root.userData.spaceflightKind, kind);
    assert.equal(isSpaceflightModelKind(kind), true);
    for (const geometry of resources(root).geometries) {
      for (const attribute of ["position", "normal"]) for (const value of geometry.getAttribute(attribute).array) assert.ok(Number.isFinite(value), `${kind} ${attribute}`);
    }
    for (let frame = 0; frame <= 40; frame++) {
      updateSpaceflightModel(root, { time: frame * .23, active: frame % 2 === 0, fill: frame / 40, landingGear: frame / 40 });
      const bounds = visibleBounds(root), radius = kind === "survey-hopper" ? 1.55 : .50001;
      const height = kind === "survey-hopper" ? 4.4 : 1;
      assert.ok(bounds.min.x >= -radius && bounds.max.x <= radius, `${kind} X ${bounds.min.x}..${bounds.max.x}`);
      assert.ok(bounds.min.z >= -radius && bounds.max.z <= radius, `${kind} Z ${bounds.min.z}..${bounds.max.z}`);
      assert.ok(bounds.min.y >= -.00001 && bounds.max.y <= height + .00001, `${kind} Y ${bounds.min.y}..${bounds.max.y}`);
    }
    for (const surface of resources(root).materials) {
      assert.ok(surface instanceof THREE.MeshStandardMaterial);
      assert.ok(surface.metalness <= .12); assert.equal(surface.envMap, null);
      assert.ok(surface.emissiveIntensity > 0);
      if (surface.transparent) assert.equal(surface.depthWrite, false);
    }
  }
  for (const invalid of [null, "unknown", "pressure-door", 1, {}]) assert.equal(isSpaceflightModelKind(invalid), false);
  assert.throws(() => createSpaceflightModel("unknown" as SpaceflightModelKind), /Unknown spaceflight model/);
});

test("each infrastructure identity has a distinct named working assembly", () => {
  const signatures: Record<SpaceflightModelKind, string> = {
    "survey-hopper": "wraparound-teal-cockpit", "launch-pad": "exhaust-channel-grate", "fuel-gantry": "retractable-service-arm",
    "mission-console": "sloped-orbital-chart", "tracking-beacon": "faceted-tracking-dish", "orbital-dock": "docking-capture-collar",
    "recovery-crane": "open-recovery-hook", "station-core": "station-registry-seal", "station-truss": "truss-diagonal-web",
    "station-radiator": "radiator-capillary-fin", "station-observatory": "telescope-recessed-lens",
  };
  const fingerprints = new Set<string>();
  for (const kind of SPACEFLIGHT_MODEL_KINDS) {
    const root = createSpaceflightModel(kind); assert.ok(root.getObjectByName(signatures[kind]), kind);
    const names: string[] = []; root.traverse(object => names.push(object.name)); fingerprints.add(names.join("/"));
  }
  assert.equal(fingerprints.size, SPACEFLIGHT_MODEL_KINDS.length);
});

test("capsule has front cockpit, rear cargo, separate shape-coded supplies and four grounded feet", () => {
  const root = createSpaceflightModel("survey-hopper");
  assert.ok(visibleBounds(root.getObjectByName("wraparound-teal-cockpit")!).max.z < 0);
  assert.ok(root.getObjectByName("rear-cargo-hatch")!.position.z > .9);
  assert.ok(root.getObjectByName("open-engine-bell"));
  const fuel = root.getObjectByName("fuel-feed-port")!, oxygen = root.getObjectByName("oxygen-feed-port")!;
  const fuelSurface = (fuel.getObjectByName("keyed-feed-port") as THREE.Mesh).material as THREE.MeshStandardMaterial;
  const oxygenSurface = (oxygen.getObjectByName("keyed-feed-port") as THREE.Mesh).material as THREE.MeshStandardMaterial;
  assert.notEqual(fuelSurface.color.getHex(), oxygenSurface.color.getHex());
  assert.equal(fuel.children.filter(o => o.name === "feed-key").length, 1);
  assert.equal(oxygen.children.filter(o => o.name === "feed-key").length, 2);
  root.updateMatrixWorld(true);
  for (let i = 0; i < 4; i++) {
    const foot = root.getObjectByName(`landing-leg-${i}`)!.getObjectByName("landing-foot")!;
    assert.ok(Math.abs(new THREE.Box3().setFromObject(foot).min.y) < .00001);
  }
  const deployed = visibleBounds(root);
  assert.ok(deployed.max.y > 4.3 && deployed.max.x - deployed.min.x > 2.5);
  updateSpaceflightModel(root, { landingGear: 0 });
  assert.ok(visibleBounds(root).max.x - visibleBounds(root).min.x < deployed.max.x - deployed.min.x);
});

test("throttle plume varies with thrust and time without overriding independent landing gear", () => {
  const root = createSpaceflightModel("survey-hopper"), exhaust = root.getObjectByName("throttle-exhaust")!;
  assert.equal(exhaust.visible, false);
  updateSpaceflightModel(root, { active: true, time: 2 }); assert.equal(exhaust.visible, false);
  updateSpaceflightModel(root, { thrust: .2, landingGear: .3, time: 0 });
  const lowThrottle = exhaust.scale.y, gearRotation = root.getObjectByName("landing-leg-0")!.rotation.z;
  updateSpaceflightModel(root, { thrust: 1, time: 0 }); assert.ok(exhaust.scale.y > lowThrottle);
  const fullThrottle = exhaust.scale.y;
  updateSpaceflightModel(root, { time: .125 }); assert.notEqual(exhaust.scale.y, fullThrottle);
  assert.equal(root.getObjectByName("landing-leg-0")!.rotation.z, gearRotation);
  assert.ok(visibleBounds(root).min.y < 0, "powered plume extends below the floor datum");
  updateSpaceflightModel(root, { thrust: 0 }); assert.equal(exhaust.visible, false);
});

test("pilot interior replaces the occluding shell without changing the external capsule", () => {
  const root = createSpaceflightModel("survey-hopper"), exterior = visibleBounds(root);
  const hull = root.getObjectByName("riveted-pressure-hull")!, interior = root.getObjectByName("pilot-cockpit-interior")!;
  assert.equal(interior.visible, false);
  updateSpaceflightModel(root, { cockpit: true, thrust: 1 });
  assert.equal(hull.visible, false); assert.equal(interior.visible, true);
  assert.equal(root.getObjectByName("throttle-exhaust")!.visible, false);
  root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 3.17, -.15), new THREE.Vector3(0, 0, -1));
  assert.equal(ray.intersectObjects(interior.children, true).length, 0, "forward pilot sightline stays clear");
  updateSpaceflightModel(root, { cockpit: false, thrust: 0 });
  assert.equal(hull.visible, true); assert.equal(interior.visible, false);
  assert.ok(visibleBounds(root).equals(exterior));
});

test("gantry retracts, radar sweeps and crane cable tracks hook; inactive and zero-time poses are stable", () => {
  const gantry = createSpaceflightModel("fuel-gantry"), arm = gantry.getObjectByName("retractable-service-arm")!;
  const stowed = arm.rotation.x;
  updateSpaceflightModel(gantry, { active: true }); assert.notEqual(arm.rotation.x, stowed);
  updateSpaceflightModel(gantry, { active: false }); assert.equal(arm.rotation.x, stowed);
  const beacon = createSpaceflightModel("tracking-beacon"), radar = beacon.getObjectByName("tracking-radar-sweep")!;
  updateSpaceflightModel(beacon, { active: true, time: 1 }); assert.notEqual(radar.rotation.y, 0);
  updateSpaceflightModel(beacon, { active: false, time: 5 }); assert.equal(radar.rotation.y, 0);
  updateSpaceflightModel(beacon, { active: true, time: 0 }); assert.equal(radar.rotation.y, 0);
  const crane = createSpaceflightModel("recovery-crane"), hook = crane.getObjectByName("recovery-hook")!;
  const cable = crane.getObjectByName("recovery-hoist-cable")!, rest = hook.position.y;
  updateSpaceflightModel(crane, { active: true, time: 1 }); assert.ok(hook.position.y > rest);
  assert.ok(Math.abs(cable.position.y - .19 * cable.scale.y - hook.position.y) < 1e-9);
  assert.ok(Math.abs(cable.position.y + .19 * cable.scale.y - .82) < 1e-9);
  updateSpaceflightModel(crane, { active: false, time: 2 }); assert.equal(hook.position.y, rest);
});

test("visual reserve column is bottom anchored and omitted state does not erase telemetry or external yaw", () => {
  const root = createSpaceflightModel("fuel-gantry", { fill: .5 }), column = root.getObjectByName("service-reserve-level")!;
  assert.equal(column.scale.y, .5);
  assert.ok(Math.abs(column.position.y - .27 * column.scale.y / 2 - .22) < 1e-9);
  root.rotation.y = .73; updateSpaceflightModel(root, { active: true, time: 2 });
  assert.equal(root.rotation.y, .73); assert.equal(column.scale.y, .5);
  updateSpaceflightModel(root, { fill: 0, yaw: 1.5 }); assert.equal(column.visible, false); assert.equal(root.rotation.y, 1.5);
  updateSpaceflightModel(root, { fill: 1 }); assert.equal(column.visible, true); assert.equal(column.scale.y, 1);
});

test("nonfinite and extreme telemetry stays finite, updates reuse objects and GPU resources", () => {
  for (const kind of SPACEFLIGHT_MODEL_KINDS) {
    const root = createSpaceflightModel(kind), original = resources(root), objects: THREE.Object3D[] = [];
    root.traverse(object => objects.push(object));
    for (const value of [NaN, Infinity, -Infinity, Number.MAX_VALUE, -Number.MAX_VALUE]) {
      updateSpaceflightModel(root, { active: true, time: value, yaw: value, fill: value, thrust: value, landingGear: value });
      root.traverse(object => assert.ok([...object.position.toArray(), ...object.scale.toArray(), object.rotation.x, object.rotation.y, object.rotation.z].every(Number.isFinite), `${kind} ${object.name}`));
    }
    assert.deepEqual(resources(root), original);
    const after: THREE.Object3D[] = []; root.traverse(object => after.push(object)); assert.deepEqual(after, objects);
  }
  assert.doesNotThrow(() => updateSpaceflightModel(new THREE.Group(), { thrust: 1 }));
});

test("each instance owns all disposable resources and cannot dispose another instance's materials or geometries", () => {
  const previous = new Set<THREE.BufferGeometry | THREE.Material>();
  for (const kind of SPACEFLIGHT_MODEL_KINDS) for (let instance = 0; instance < 2; instance++) {
    const refs = resources(createSpaceflightModel(kind)); let disposed = 0;
    for (const resource of [...refs.geometries, ...refs.materials]) {
      assert.ok(!previous.has(resource), `${kind} shared GPU resource`); previous.add(resource);
      resource.addEventListener("dispose", () => disposed++); resource.dispose();
    }
    assert.equal(disposed, refs.geometries.size + refs.materials.size);
  }
});
