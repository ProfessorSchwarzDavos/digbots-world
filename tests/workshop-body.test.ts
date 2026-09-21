import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { workshopBodyBounds, workshopBodyRadius } from "../app/game/workshop-body";
import { createWorkshopModel, updateWorkshopModel } from "../app/game/workshop-models";
import { WAYWORKS_BLOCKS } from "../app/game/wayworks-integration";
import { createMachine, type MachineKind, type MachineState } from "../app/game/wayworks";
import { BlockId } from "../app/game/data";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, rebaseAsteroidCell } from "../app/game/asteroid-attachment-frame";
import { projectAsteroidMachines, captureAsteroidMachines } from "../app/game/asteroid-attachment-machines";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { canonicalJson } from "../app/game/universe-json";
import { RECOVERY_CRANE_MOTION } from "../app/game/spaceflight-models";
import { TRANSPORT_CONNECTOR_MAX_REACH } from "../app/game/transport-model-connectors";
import { PRESSURE_GATE_SIZE } from "../app/game/pressure-models";

function dispose(root: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
const kinds = Object.values(WAYWORKS_BLOCKS);
test("analytic workshop envelopes contain every model vertex over fill, activity, rotation and mechanism phases", () => {
  for (const kind of kinds) {
    const model = createWorkshopModel(kind), point = { x: 10, y: 37, z: -23 };
    try {
      const radius = workshopBodyRadius(kind); assert.ok(Number.isFinite(radius) && radius > 0, kind);
      for (const time of [0, .017, .19, .7, 1.1, Math.PI, 11.913, 9381.277]) for (const fill of [0, .1, .5, 1]) {
        const facing = Math.floor(time * 71) % 4, bounds = workshopBodyBounds(kind, point, facing);
        model.position.set(point.x, point.y - .5, point.z); model.rotation.y = facing * Math.PI / 2;
        updateWorkshopModel(model, { time, active: fill !== .1, fill, fluidFill: 1 - fill, progress: fill,
          open: fill, locked: fill > .4, alarm: true, gateWidth: 3 + Math.round(fill * 6), gateHeight: 9 - Math.round(fill * 6),
          connected: { front: true, back: true, left: true, right: true, top: true, bottom: true },
          connectionTargets: { front: [.5, .8, -.6], back: [-.5, .2, .6], left: [-.6, .9, .5], right: [.6, .1, -.5],
            top: [.3, 1.6, -.3], bottom: [-.3, -.6, .3] } });
        model.updateMatrixWorld(true);
        model.traverse(node => {
          if (!(node instanceof THREE.Mesh)) return;
          const positions = node.geometry.getAttribute("position"), p = new THREE.Vector3();
          for (let i = 0; i < positions.count; i++) {
            p.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld);
            assert.ok(p.x >= bounds.minX - 1e-9 && p.x <= bounds.maxX + 1e-9 && p.y >= bounds.minY - 1e-9
              && p.y <= bounds.maxY + 1e-9 && p.z >= bounds.minZ - 1e-9 && p.z <= bounds.maxZ + 1e-9, `${kind}/${node.name}/${time}/${fill}`);
          }
        });
      }
      assert.equal(workshopBodyRadius(kind), radius);
    } finally { dispose(model); }
  }
});

test("crane equations and connector reach are exactly unchanged", () => {
  assert.equal(TRANSPORT_CONNECTOR_MAX_REACH, 1);
  assert.deepEqual(PRESSURE_GATE_SIZE, { minimum: 3, maximum: 9 });
  assert.deepEqual(RECOVERY_CRANE_MOTION, { hookBaseY: .44, liftAmplitude: .17, cableTopY: .82, cableLength: .38 });
  const model = createWorkshopModel("recovery-crane");
  try {
    for (const active of [false, true]) for (const time of [0, .1, 1, 3, 91812.124]) {
      updateWorkshopModel(model, { active, time });
      const lift = active ? .17 * (1 - Math.cos(time % (Math.PI * 2) * 1.5)) : 0;
      assert.equal(model.getObjectByName("recovery-hook")!.position.y, .44 + lift);
      assert.equal(model.getObjectByName("recovery-hoist-cable")!.scale.y, (.38 - lift) / .38);
      assert.equal(model.getObjectByName("recovery-hoist-cable")!.position.y, .82 - (.38 - lift) / 2);
    }
  } finally { dispose(model); }
});

test("every supported gate width and height stays inside the maximal analytic envelope while opening", () => {
  const model = createWorkshopModel("hangar-pressure-gate"), radius = workshopBodyRadius("hangar-pressure-gate");
  try {
    for (let width = 3; width <= 9; width++) for (let height = 3; height <= 9; height++) for (const open of [0, .3, .7, 1]) {
      updateWorkshopModel(model, { gateWidth: width, gateHeight: height, open }); model.updateMatrixWorld(true);
      model.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        const positions = node.geometry.getAttribute("position"), p = new THREE.Vector3();
        for (let i = 0; i < positions.count; i++) {
          p.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld);
          assert.ok(p.length() <= radius + 1e-9, `${width}/${height}/${open}/${node.name}`);
        }
      });
    }
  } finally { dispose(model); }
});

const orbit = locationAddress({ ...homeLocation(universeId("workshop-body")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const key = (x: number) => `${frame.offset.x + x},${frame.offset.y + 32},${frame.offset.z}`;
function source(kind: MachineKind, at: string) {
  const machine = createMachine(kind, frame.orbitId, "local"), block = Number(Object.entries(WAYWORKS_BLOCKS).find(([, value]) => value === kind)![0]) as BlockId;
  const machines = { [at]: machine }, voxel = (cell: string) => cell === at ? block : BlockId.Air;
  return { machines, voxel, block };
}
test("whole machine selection rejects inside and outside origins whose mechanisms cross a frame", () => {
  for (const kind of kinds) for (const x of [31, 32]) {
    const f = source(kind, key(x));
    assert.throws(() => projectAsteroidMachines(frame, f.machines, f.voxel), /crosses/, `${kind}/${x}`);
  }
});
test("complete network and physical captures remain exact through one hundred cold cycles", () => {
  const f = source("recovery-crane", key(0)); f.machines[key(0)].energyJ = 716;
  const before = canonicalJson(f.machines); let machines: Record<string, MachineState> = f.machines;
  for (let i = 0; i < 100; i++) {
    const local = projectAsteroidMachines(frame, machines, f.voxel);
    machines = JSON.parse(JSON.stringify(captureAsteroidMachines(frame, machines, local, local, { before: f.voxel, after: f.voxel })));
    assert.equal(canonicalJson(machines), before);
  }
  const baseline = projectAsteroidMachines(frame, machines, f.voxel), moved = { "31,32,0": baseline["0,32,0"] };
  assert.throws(() => captureAsteroidMachines(frame, machines, baseline, moved,
    { before: f.voxel, after: cell => cell === key(31) ? f.block : BlockId.Air }), /crosses/);
  assert.equal(canonicalJson(machines), before);
  assert.equal(rebaseAsteroidCell(frame, key(0), "orbit"), "0,32,0");
});
test("invalid kinds and poses cannot receive a guessed body", () => {
  assert.throws(() => workshopBodyRadius("invented" as MachineKind), /Unknown/);
  for (const point of [{ x: .5, y: 0, z: 0 }, { x: 0, y: Infinity, z: 0 }]) assert.throws(() => workshopBodyBounds("grid-cable", point, 0));
  for (const facing of [-1, .5, 4, NaN]) assert.throws(() => workshopBodyBounds("grid-cable", { x: 0, y: 0, z: 0 }, facing));
});
