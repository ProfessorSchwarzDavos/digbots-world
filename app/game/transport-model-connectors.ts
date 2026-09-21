import * as THREE from "three";
import type { PowerTopologyFace } from "./wayworks-network";
import { includeModelMotion, type ModelMotionEnvelope } from "./model-motion-bounds";

export type TransportTargets = Readonly<Partial<Record<PowerTopologyFace, readonly [number, number, number]>>>;
export type TransportConnectorState = Readonly<{
  connected?: Readonly<Partial<Record<PowerTopologyFace, boolean>>>;
  /** Neighbor's authored socket in this model's floor-origin local coordinates. */
  connectionTargets?: TransportTargets;
}>;
const directions = { front: [0, 0, -1], back: [0, 0, 1], left: [-1, 0, 0], right: [1, 0, 0], top: [0, 1, 0], bottom: [0, -1, 0] } as const;
type Rig = { signature: string; targets: TransportTargets; connected: TransportConnectorState["connected"];
  arms: Record<PowerTopologyFace, { group: THREE.Group; segments: THREE.Mesh[] }> };
const rigs = new WeakMap<THREE.Group, Rig>();
export const TRANSPORT_CONNECTOR_MAX_REACH = 1;

/** Every right-angle segment stays within one reach of its authored face
 * endpoint. Include all configured socket alternatives, even currently hidden. */
export function transportConnectorMotionEnvelopes(root: THREE.Group) {
  const result = new Map<THREE.Object3D, ModelMotionEnvelope>(), rig = rigs.get(root);
  if (!rig) return result;
  for (const face of Object.keys(directions) as PowerTopologyFace[]) {
    const direction = directions[face], startRadius = Math.hypot(direction[0] * .5, .5 + direction[1] * .5, direction[2] * .5);
    for (const segment of rig.arms[face].segments) includeModelMotion(result, segment, startRadius + TRANSPORT_CONNECTOR_MAX_REACH,
      Math.max(1, TRANSPORT_CONNECTOR_MAX_REACH));
  }
  return result;
}

/** Reusable, presentation-only elbow stubs bridge off-center machine sockets.
 * Pipes meet one another at cell boundaries and do not need these adapters. */
export function createTransportConnectors(root: THREE.Group, material: THREE.Material, radius: number) {
  const rig: Rig = { signature: "", targets: {}, connected: {}, arms: {} as Rig["arms"] }; rigs.set(root, rig);
  for (const face of Object.keys(directions) as PowerTopologyFace[]) {
    const group = new THREE.Group(); group.name = `socket-adapter-${face}`; group.visible = false; root.add(group);
    const segments = Array.from({ length: 3 }, (_, i) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 8), material);
      mesh.name = `socket-adapter-segment-${i}`; mesh.castShadow = mesh.receiveShadow = true;
      mesh.scale.y = .001; mesh.position.y = .5; group.add(mesh); return mesh;
    });
    rig.arms[face] = { group, segments };
  }
}

export function updateTransportConnectors(root: THREE.Group, state: TransportConnectorState) {
  const rig = rigs.get(root); if (!rig || state.connectionTargets === undefined && state.connected === undefined) return;
  if (state.connectionTargets !== undefined) rig.targets = state.connectionTargets;
  if (state.connected !== undefined) rig.connected = state.connected;
  const signature = JSON.stringify([rig.connected, rig.targets]); if (rig.signature === signature) return;
  rig.signature = signature;
  for (const face of Object.keys(directions) as PowerTopologyFace[]) {
    const arm = rig.arms[face], end = rig.targets[face], direction = directions[face];
    const start = new THREE.Vector3(direction[0] * .5, .5 + direction[1] * .5, direction[2] * .5);
    arm.group.visible = !!rig.connected?.[face] && !!end && end.every(Number.isFinite) && start.distanceTo(new THREE.Vector3(...end)) < TRANSPORT_CONNECTOR_MAX_REACH;
    if (!arm.group.visible || !end) continue;
    // Tangential axes first, face-normal axis last: a right-angle machine elbow.
    const axes = direction[0] ? [1, 2, 0] : direction[2] ? [1, 0, 2] : [0, 2, 1];
    const point = start.clone();
    arm.segments.forEach((segment, i) => {
      const next = point.clone().setComponent(axes[i], end[axes[i]]), delta = next.clone().sub(point), length = delta.length();
      segment.visible = length > .002;
      if (segment.visible) {
        segment.position.copy(point).add(next).multiplyScalar(.5); segment.scale.y = length;
        segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.divideScalar(length));
      }
      point.copy(next);
    });
  }
}
