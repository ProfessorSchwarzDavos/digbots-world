import * as THREE from "three";
import { createWorkshopModel, updateWorkshopModel } from "./workshop-models";
import { wayworksModelMotionEnvelopes } from "./wayworks-models";
import { pressureModelMotionEnvelopes, PRESSURE_GATE_SIZE } from "./pressure-models";
import { spaceflightInfrastructureMotionEnvelopes } from "./spaceflight-models";
import { transportConnectorMotionEnvelopes } from "./transport-model-connectors";
import { authoredModelMotionRadius, includeModelMotion, type ModelMotionEnvelope } from "./model-motion-bounds";
import { WAYWORKS_BLOCKS } from "./wayworks-integration";
import type { MachineKind } from "./wayworks";
import type { CelestialBounds, CelestialPoint } from "./celestial-terrain";

const radii = new Map<MachineKind, number>();
/** Conservative rotation-independent full-model radius, including moving
 * mechanisms, all sockets and the maximum legal gate. Not a collision radius. */
export function workshopBodyRadius(kind: MachineKind): number {
  if (!Object.values(WAYWORKS_BLOCKS).includes(kind)) throw Error("Unknown workshop body kind.");
  const cached = radii.get(kind); if (cached !== undefined) return cached;
  const model = createWorkshopModel(kind);
  try {
    updateWorkshopModel(model, { fill: 1, fluidFill: 1, progress: 1, active: true, open: 0, locked: false,
      alarm: true, gateWidth: PRESSURE_GATE_SIZE.maximum, gateHeight: PRESSURE_GATE_SIZE.maximum, time: 0 });
    const envelopes = new Map<THREE.Object3D, ModelMotionEnvelope>();
    for (const source of [wayworksModelMotionEnvelopes(model), pressureModelMotionEnvelopes(model),
      spaceflightInfrastructureMotionEnvelopes(model), transportConnectorMotionEnvelopes(model)])
      for (const [node, value] of source) includeModelMotion(envelopes, node, value.translationRadius, value.scale);
    const radius = authoredModelMotionRadius(model, envelopes); radii.set(kind, radius); return radius;
  } finally {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    model.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      geometries.add(node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
}
/** Placed workshop models use the block center minus half a block in Y. */
export function workshopBodyBounds(kind: MachineKind, point: CelestialPoint, facing: number): CelestialBounds {
  if (![point.x, point.y, point.z].every(Number.isSafeInteger) || !Number.isInteger(facing) || facing < 0 || facing > 3)
    throw Error("Invalid workshop body pose.");
  const r = workshopBodyRadius(kind), y = point.y - .5;
  return { minX: point.x - r, maxX: point.x + r, minY: y - r, maxY: y + r, minZ: point.z - r, maxZ: point.z + r };
}
