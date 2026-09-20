import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { applyMorrowCreaturePose, createMorrowCreatureVisual, MORROW_VISUAL_KINDS, type MorrowVisualKind } from "../app/game/morrow-creature-models";
import { sharedBoxGeometry } from "../app/game/shared-model-geometry";

function object(root: THREE.Object3D, kind: MorrowVisualKind, name: string) {
  const found = root.getObjectByName(`${kind}-${name}`);
  assert.ok(found, `${kind} needs functional ${name}`);
  return found;
}

function snapshot(root: THREE.Object3D) {
  const result: (number | boolean)[] = [];
  root.traverse((part) => {
    result.push(...part.position.toArray(), part.rotation.x, part.rotation.y, part.rotation.z, ...part.scale.toArray(), part.visible);
    if (part instanceof THREE.Mesh) {
      const mats = Array.isArray(part.material) ? part.material : [part.material];
      for (const mat of mats) {
        result.push(mat.opacity);
        if (mat instanceof THREE.MeshStandardMaterial) result.push(mat.emissiveIntensity);
      }
    }
  });
  return result;
}

test("all four Morrow silhouettes have cubic shared geometry, real contact planes and named articulation", (context) => {
  const signatures = new Set<string>();
  for (const kind of MORROW_VISUAL_KINDS) {
    const model = createMorrowCreatureVisual(kind, 7);
    assert.equal(model.group.children[0], model.visual);
    assert.equal(model.visual.userData.modelStyle, "high-detail-cubic");
    assert.ok(model.parts.head.length > 0);
    assert.ok(model.parts.body.length > 0);
    let meshes = 0;
    const names = new Set<string>();
    model.visual.traverse((part) => {
      assert.ok(!names.has(part.name), `duplicate functional part ${part.name}`);
      names.add(part.name);
      if (!(part instanceof THREE.Mesh)) return;
      meshes++;
      assert.equal(part.geometry, sharedBoxGeometry());
      assert.ok(part.scale.toArray().every((axis) => axis > 0 && Number.isFinite(axis)));
      const vertices = part.geometry.getAttribute("position");
      for (let i = 0; i < vertices.count; i++) assert.ok([vertices.getX(i), vertices.getY(i), vertices.getZ(i)].every(Number.isFinite));
    });
    assert.ok(meshes >= 35 && meshes <= 100, `${kind}: detailed but bounded mesh count ${meshes}`);
    const bounds = new THREE.Box3().setFromObject(model.visual);
    assert.ok(Math.abs(bounds.min.y) < 1e-8, `${kind} initial ground contact ${bounds.min.y}`);
    const size = bounds.getSize(new THREE.Vector3());
    context.diagnostic(`${kind}: ${meshes} meshes; bounds XYZ ${size.toArray().map((value) => value.toFixed(3)).join(" x ")}; ground ${bounds.min.y.toFixed(6)}`);
    assert.ok(size.x > .45 && size.x < 3 && size.y > .3 && size.y < 1.6 && size.z > .5 && size.z < 3);
    assert.ok(object(model.visual, kind, "head-pivot").position.z < 0, `${kind} faces -Z`);
    signatures.add([meshes, ...size.toArray().map((value) => value.toFixed(3)), model.parts.legs.length, model.parts.wings.length].join(":"));
  }
  assert.equal(signatures.size, 4, "four distinct silhouettes and anatomical layouts");
});

test("poses are finite, absolute and id-deterministic while preserving integration transforms", () => {
  for (const kind of MORROW_VISUAL_KINDS) {
    const model = createMorrowCreatureVisual(kind, 81);
    const twin = createMorrowCreatureVisual(kind, 81);
    model.group.position.set(90, 70, -10);
    model.group.rotation.y = 1.2;
    model.visual.position.y = .3;
    model.visual.scale.setScalar(.7);
    assert.equal(applyMorrowCreaturePose(model.visual, kind, .42, .73, .26), true);
    const target = snapshot(model.visual);
    applyMorrowCreaturePose(model.visual, kind, 19.27, 0, 1);
    applyMorrowCreaturePose(model.visual, kind, -7.4, 1, 0);
    applyMorrowCreaturePose(model.visual, kind, .42, .73, .26);
    assert.deepEqual(snapshot(model.visual), target, `${kind} must not accumulate transform/material drift`);
    assert.deepEqual(model.group.position.toArray(), [90, 70, -10]);
    assert.equal(model.group.rotation.y, 1.2);
    assert.equal(model.visual.position.y, .3);
    assert.deepEqual(model.visual.scale.toArray(), [.7, .7, .7]);
    twin.visual.position.y = .3;
    twin.visual.scale.setScalar(.7);
    applyMorrowCreaturePose(twin.group, kind, .42, .73, .26);
    assert.deepEqual(snapshot(twin.visual), target, `${kind} creation + absolute pose is reproducible`);
    for (const time of [-100, 0, 6.1, NaN, Infinity, -Infinity, Number.MAX_VALUE, -Number.MAX_VALUE]) {
      applyMorrowCreaturePose(model.visual, kind, time, NaN, Infinity);
      assert.ok(snapshot(model.visual).every((value) => typeof value === "boolean" || Number.isFinite(value)), `${kind} finite transforms and materials`);
    }
    applyMorrowCreaturePose(model.visual, kind, .5, 0, 0);
    const idle = snapshot(model.visual);
    applyMorrowCreaturePose(model.visual, kind, 1.7, 0, 0);
    assert.notDeepEqual(snapshot(model.visual), idle, `${kind} has living idle motion`);
    applyMorrowCreaturePose(model.visual, kind, .5, 1, 0);
    assert.notDeepEqual(snapshot(model.visual), idle, `${kind} has travel motion`);
    applyMorrowCreaturePose(model.visual, kind, .5, 0, 1);
    assert.notDeepEqual(snapshot(model.visual), idle, `${kind} has alert motion`);
  }
});

test("Rillehopper's four contact pads launch sequentially and elastic legs remain attached", () => {
  const kind = "rillehopper";
  const model = createMorrowCreatureVisual(kind, 0);
  assert.equal(model.parts.legs.length, 4);
  const lifted = new Set<number>();
  for (let step = 0; step < 100; step++) {
    applyMorrowCreaturePose(model.visual, kind, step / 60 + .011, 1, 0);
    let airFeet = 0;
    for (let i = 0; i < 4; i++) {
      const foot = object(model.visual, kind, `foot-${i}`);
      if (foot.position.y > 1e-6) { airFeet++; lifted.add(i); }
      assert.ok(foot.position.y >= 0 && foot.position.y <= .131);
      const spring = object(model.visual, kind, `spring-${i}`);
      const top = foot.position.y + spring.position.y + spring.scale.y / 2;
      const hip = object(model.visual, kind, `hip-${i}`);
      const torso = object(model.visual, kind, "body-pivot");
      assert.ok(top > torso.position.y + hip.position.y - hip.scale.y / 2);
      assert.ok(top < torso.position.y + hip.position.y + hip.scale.y / 2);
    }
    assert.ok(airFeet <= 1, "four-foot sequence is not diagonal-pair trot");
  }
  assert.deepEqual([...lifted].sort(), [0, 1, 2, 3]);
  applyMorrowCreaturePose(model.visual, kind, 2, 0, 0);
  for (let i = 0; i < 4; i++) assert.equal(object(model.visual, kind, `foot-${i}`).position.y, 0);
});

test("Vacuum Lantern retains six sealing panels, anchored light and six delicate independent palps", () => {
  const kind = "vacuum-lantern";
  const model = createMorrowCreatureVisual(kind, 8);
  assert.equal(model.parts.legs.length, 6);
  for (const side of [-1, 1]) {
    for (const panel of ["side", "face", "cap"]) {
      const mesh = object(model.visual, kind, `chamber-${panel}-${side}`) as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      assert.ok(mat.transparent && mat.opacity > 0 && mat.opacity < .5 && !mat.depthWrite);
    }
  }
  const core = object(model.visual, kind, "core") as THREE.Mesh;
  const material = core.material as THREE.MeshStandardMaterial;
  assert.ok(material.emissiveIntensity > 0);
  applyMorrowCreaturePose(model.visual, kind, 0, 1, 0);
  const first = model.parts.legs.map((part) => part.rotation.x);
  applyMorrowCreaturePose(model.visual, kind, .35, 1, .5);
  assert.notDeepEqual(model.parts.legs.map((part) => part.rotation.x), first);
  assert.ok(object(model.visual, kind, "core-anchor"));
});

test("Slatefin uses broad fin roots, delayed articulated tail and a reversible burrow pose", () => {
  const kind = "slatefin-burrower";
  const model = createMorrowCreatureVisual(kind, 0);
  assert.equal(model.parts.wings.length, 4);
  assert.equal(model.parts.legs.length, 0);
  assert.equal(object(model.visual, kind, "tail-2").parent, object(model.visual, kind, "tail-1"));
  applyMorrowCreaturePose(model.visual, kind, .4, 1, 0);
  const turns = [0, 1, 2].map((index) => object(model.visual, kind, `tail-${index}`).rotation.y);
  assert.equal(new Set(turns.map((turn) => turn.toFixed(4))).size, 3);
  applyMorrowCreaturePose(model.visual, kind, .4, 1, 1);
  assert.ok(object(model.visual, kind, "body-pivot").position.y < -.1);
  assert.ok(object(model.visual, kind, "body-pivot").rotation.x < 0);
  applyMorrowCreaturePose(model.visual, kind, .4, 0, 0);
  assert.ok(Math.abs(object(model.visual, kind, "body-pivot").position.y) < 1e-12);
});

test("Morrow Owl has paired wing and eye rigs with brief travel-only dream veil", () => {
  const kind = "morrow-owl";
  const model = createMorrowCreatureVisual(kind, 0);
  assert.equal(model.parts.wings.length, 2);
  const veil = object(model.visual, kind, "dream-veil");
  const ribbon = object(model.visual, kind, "veil-ribbon-1-0") as THREE.Mesh;
  const material = ribbon.material as THREE.MeshStandardMaterial;
  let visibleFrames = 0;
  for (let tick = 0; tick < 300; tick++) {
    const time = tick * .05;
    applyMorrowCreaturePose(model.visual, kind, time, 1, .4);
    if (veil.visible) visibleFrames++;
    assert.ok(material.opacity >= 0 && material.opacity <= .38);
    assert.ok(Math.abs(object(model.visual, kind, "wing--1").rotation.z + object(model.visual, kind, "wing-1").rotation.z) < 1e-12);
  }
  assert.ok(visibleFrames >= 15 && visibleFrames <= 22, `brief pulse duty cycle ${visibleFrames}/300`);
  applyMorrowCreaturePose(model.visual, kind, .55, 1, 0);
  assert.ok(veil.visible && material.opacity > .3);
  applyMorrowCreaturePose(model.visual, kind, .55, 0, 1);
  assert.equal(veil.visible, false);
  assert.equal(material.opacity, 0);
  assert.equal(object(model.visual, kind, "left-eye").parent, object(model.visual, kind, "head-pivot"));
});

test("pose dispatch rejects wrong or missing rigs without mutating them", () => {
  const model = createMorrowCreatureVisual("rillehopper", 1);
  const initial = snapshot(model.visual);
  assert.equal(applyMorrowCreaturePose(model.visual, "morrow-owl", 1, 1, 1), false);
  assert.deepEqual(snapshot(model.visual), initial);
  assert.equal(applyMorrowCreaturePose(new THREE.Group(), "rillehopper", 1, 1, 1), false);
});
