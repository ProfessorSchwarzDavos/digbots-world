import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { aquariumBodyBounds, exhibitBodyBounds } from "../app/game/habitat-body.ts";
import { buildAquariumTopology, isAquariumCreature, sampleAquariumPose, type AquariumResident } from "../app/game/aquarium.ts";
import { buildExhibitTopology, sampleExhibitResidentPose, SMALL_EXHIBIT_CREATURE_KINDS, type ExhibitResident } from "../app/game/butterfly-exhibit.ts";
import type { CelestialBounds } from "../app/game/celestial-terrain.ts";
import type { CreatureMetadata } from "../app/game/creature-cage.ts";
import { VoxelEngine } from "../app/game/engine.ts";
import { applyOceanCreaturePose } from "../app/game/mob-models.ts";
import { BUTTERFLY_ORDER, MOB_DEFS, MOB_ORDER, type CoreMobKind, type MobKind } from "../app/game/mobs.ts";
import { isSharedModelGeometry } from "../app/game/shared-model-geometry.ts";

const positions = [{ x: 2, y: 3, z: -4 }, { x: 2, y: 4, z: -4 }, { x: 2, y: 5, z: -4 }];
const aquarium = buildAquariumTopology(positions, positions[0]);
const exhibit = buildExhibitTopology(positions, positions[0]);
const metadata = (kind: MobKind): CreatureMetadata => ({
  schema: 1, entityId: `body-${kind}`, kind, health: MOB_DEFS[kind].health, maxHealth: MOB_DEFS[kind].health,
  ageTicks: 24000, baby: false, temperament: MOB_DEFS[kind].temperament, hostile: false,
  tamed: false, ownerId: null, name: null, geneticSeed: 5, command: null, custom: { retained: [1, "exact"] },
});
const resident = (kind: MobKind): AquariumResident => ({ id: `body-${kind}`, metadata: metadata(kind), storedAt: 123 });
function exhibitResident(kind: MobKind): ExhibitResident {
  const common = { schema: 1 as const, id: `body-${kind}`, kind, capturedAt: 123, ageTicks: 24000, name: null, geneticSeed: 5, custom: { retained: "exact" } };
  return (BUTTERFLY_ORDER.includes(kind as typeof BUTTERFLY_ORDER[number])
    ? { ...common, source: "butterfly" } : { ...common, source: "cage", metadata: metadata(kind) }) as ExhibitResident;
}
function inside(point: THREE.Vector3, envelope: CelestialBounds) {
  return point.x >= envelope.minX && point.x <= envelope.maxX && point.y >= envelope.minY
    && point.y <= envelope.maxY && point.z >= envelope.minZ && point.z <= envelope.maxZ;
}
function verticesInside(root: THREE.Object3D, envelopes: readonly CelestialBounds[], label: string) {
  root.updateMatrixWorld(true);
  const point = new THREE.Vector3();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const vertices = object.geometry.getAttribute("position");
    for (let index = 0; index < vertices.count; index++) {
      point.fromBufferAttribute(vertices, index).applyMatrix4(object.matrixWorld);
      assert.ok(envelopes.some(envelope => inside(point, envelope)), `${label}: ${object.name} vertex ${index}: ${point.toArray()}`);
    }
  });
}
function dispose(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    if (!isSharedModelGeometry(object.geometry)) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
}

for (const kind of MOB_ORDER.filter(isAquariumCreature)) test(`aquarium production vertices and analytic motion extremes: ${kind}`, () => {
  const source = resident(kind), before = JSON.stringify(source), envelopes = aquariumBodyBounds(aquarium, [source]);
  const group = VoxelEngine.prototype.createAquariumVisual(aquarium, [source]);
  try {
    const wrapper = group.children.find(child => child.userData.aquariumResidentIndex === 0)!;
    const model = wrapper.userData.modelRoot as THREE.Object3D;
    for (const elapsed of [0, .123, .713, 1.43, 3.97, 7.2, 21.7, 105.3, 10001.93]) {
      const pose = sampleAquariumPose(source, aquarium, elapsed);
      wrapper.position.set(pose.x, pose.y + Number(wrapper.userData.poseYOffset), pose.z); wrapper.rotation.y = pose.yaw;
      applyOceanCreaturePose(model, kind as CoreMobKind, elapsed, pose.crawling ? .18 : .32, 0);
      verticesInside(group, envelopes, `${kind}@${elapsed}`);
    }
    // The analytic proof allows unrestricted joint rotation and the full legal
    // mantle scale maximum (even larger than the aquarium's travel=.18 value).
    // These adversarial transforms exercise that guarantee beyond sampled time.
    model.traverse(part => {
      if (part !== model) part.rotation.set(2.31, -.971, 1.371);
      if (part.name === `${kind}-mantle`) part.scale.z = 1.045;
    });
    verticesInside(wrapper, [envelopes.at(-1)!], `${kind}: unrestricted rotation / analytic maximum`);
    assert.equal(JSON.stringify(source), before);
  } finally { dispose(group); }
});

for (const kind of [...BUTTERFLY_ORDER, ...SMALL_EXHIBIT_CREATURE_KINDS]) test(`exhibit production vertices at flight/perch/hop and joint extrema: ${kind}`, () => {
  const source = exhibitResident(kind), before = JSON.stringify(source), envelopes = exhibitBodyBounds(exhibit, [source]);
  const group = VoxelEngine.prototype.createExhibitVisual("exhibit:2,3,-4", exhibit, [source]);
  try {
    const wrapper = group.children.find(child => child.userData.specimenIndex === 0)!;
    for (const elapsed of [0, .123, .713, 1.43, 3.97, 5.8, 7.2, 21.7, 105.3]) {
      const pose = sampleExhibitResidentPose(source, exhibit, elapsed);
      wrapper.position.set(pose.x, pose.y + Number(wrapper.userData.poseYOffset ?? 0), pose.z); wrapper.rotation.y = pose.yaw;
      for (const wing of wrapper.userData.wings ?? []) wing.rotation.z = Number(wing.userData.wingSide ?? 1) * (pose.landed ? .12 : .55 + Math.sin(elapsed * 14) * .42);
      verticesInside(group, envelopes, `${kind}@${elapsed}`);
    }
    for (const wing of wrapper.userData.wings ?? []) wing.rotation.set(2.31, -.971, 1.371);
    wrapper.rotation.y = -2.789;
    verticesInside(wrapper, [envelopes.at(-1)!], `${kind}: unrestricted wing/yaw`);
    assert.equal(JSON.stringify(source), before);
  } finally { dispose(group); }
});

test("exterior rails and canopy exceed centered voxels even with no residents or live visuals", () => {
  const topology = buildExhibitTopology([{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }], { x: 0, y: 0, z: 0 });
  const envelopes = exhibitBodyBounds(topology, []);
  assert.ok(envelopes.some(bounds => bounds.maxX >= .5275));
  assert.ok(envelopes.some(bounds => bounds.minX <= -.5275));
  assert.ok(envelopes.some(bounds => bounds.maxY >= 1.5325));
  assert.ok(Object.isFrozen(envelopes) && envelopes.every(Object.isFrozen));
  const outside = buildExhibitTopology([{ x: 1, y: 0, z: 0 }], { x: 1, y: 0, z: 0 });
  assert.ok(exhibitBodyBounds(outside, []).some(bounds => bounds.minX < .5), "outside-root rail crosses the neighboring frame edge");
});

test("pose center intervals use full sine extrema and the producer's fixed assigned cell", () => {
  const fish = resident("pocket-goldfish"), source = aquariumBodyBounds(aquarium, [fish]).at(-1)!;
  const cell = aquarium.blocks.find(cell => cell.key === sampleAquariumPose(fish, aquarium, 0).cellKey)!;
  assert.ok(Math.abs((source.maxX + source.minX) / 2 - cell.x) < 1e-12);
  assert.ok(Math.abs((source.maxY + source.minY) / 2 - cell.y) < 1e-12);
  assert.ok(Math.abs((source.maxX - source.minX) - (source.maxY - source.minY) - .18) < 1e-12);
  const slug = aquariumBodyBounds(aquarium, [resident("sunset-sea-slug")]).at(-1)!;
  assert.ok(Math.abs((slug.maxX - slug.minX) - (slug.maxY - slug.minY) - .56) < 1e-12);
});

test("unsupported kinds/source and incomplete topology fail explicitly without altering inputs", () => {
  assert.throws(() => aquariumBodyBounds(aquarium, [resident("mossling")]), /Unsupported aquarium body kind/);
  assert.throws(() => exhibitBodyBounds(exhibit, [{ ...exhibitResident("mossling"), source: "butterfly" } as ExhibitResident]), /Unsupported exhibit body kind\/source/);
  assert.throws(() => exhibitBodyBounds(exhibit, [{ ...exhibitResident("meadowwing"), source: "cage" } as ExhibitResident]), /Unsupported exhibit body kind\/source/);
  assert.throws(() => exhibitBodyBounds({ ...exhibit, truncated: true }, []), /Truncated/);
  assert.throws(() => aquariumBodyBounds({ ...aquarium, blocks: [] }, []), /topology/);
});

test("detached measuring preserves a live production model and shared geometry objects", () => {
  const source = resident("pocket-goldfish"), group = VoxelEngine.prototype.createAquariumVisual(aquarium, [source]);
  let disposals = 0;
  const matrices: string[] = [];
  group.updateMatrixWorld(true);
  group.traverse(object => {
    matrices.push(object.matrixWorld.toArray().join(","));
    if (object instanceof THREE.Mesh && isSharedModelGeometry(object.geometry)) object.geometry.addEventListener("dispose", () => { disposals++; });
  });
  try {
    aquariumBodyBounds(aquarium, [source]);
    const after: string[] = []; group.traverse(object => { after.push(object.matrixWorld.toArray().join(",")); });
    assert.deepEqual(after, matrices); assert.equal(disposals, 0);
  } finally { dispose(group); }
});
