import * as THREE from "three";
import { createSpaceflightModel, SURVEY_HOPPER_MOTION } from "./spaceflight-models";
import type { CelestialBounds } from "./celestial-terrain";
import type { SpaceVehicleState } from "./space-vehicle";

let cachedRadius: number | undefined;
/** Rotation-independent envelope of the actual authored capsule, including
 * cockpit/exterior alternatives, the complete leg sweep and maximum plume.
 * Triangle inequality over child translations/rotations/scales is conservative
 * at every phase, not an animation sample or the forgiving ray-pick radius. */
function branchRadius(node: THREE.Object3D): number {
  let radius = 0;
  if (node instanceof THREE.Mesh) {
    const p = node.geometry.getAttribute("position");
    if (!p?.count) throw Error("Missing Survey Hopper geometry.");
    for (let i = 0; i < p.count; i++) radius = Math.max(radius, Math.hypot(p.getX(i), p.getY(i), p.getZ(i)));
  }
  for (const child of node.children) {
    const y = /^landing-leg-\d+$/.test(child.name)
      ? Math.max(Math.abs(child.position.y), SURVEY_HOPPER_MOTION.gearBaseY + SURVEY_HOPPER_MOTION.gearLift + SURVEY_HOPPER_MOTION.gearArc)
      : Math.abs(child.position.y);
    const scale = Math.max(Math.abs(child.scale.x), Math.abs(child.scale.y), Math.abs(child.scale.z),
      child.name === "throttle-exhaust" ? 1 + SURVEY_HOPPER_MOTION.plumeFlutterFast + SURVEY_HOPPER_MOTION.plumeFlutterSlow : 0);
    radius = Math.max(radius, Math.hypot(child.position.x, y, child.position.z) + scale * branchRadius(child));
  }
  return radius;
}
export function surveyHopperBodyRadius(): number {
  if (cachedRadius !== undefined) return cachedRadius;
  const root = createSpaceflightModel("survey-hopper");
  try {
    const radius = branchRadius(root) * Math.max(Math.abs(root.scale.x), Math.abs(root.scale.y), Math.abs(root.scale.z));
    if (!Number.isFinite(radius) || radius <= 0) throw Error("Invalid Survey Hopper body envelope.");
    cachedRadius = radius; return radius;
  } finally {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    root.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      geometries.add(node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
}
/** No cargo, passenger, docking, consent or flight authority is inferred here. */
export function surveyHopperBodyBounds(vehicle: Pick<SpaceVehicleState, "definitionId" | "transform">): CelestialBounds {
  if (vehicle.definitionId !== "survey-hopper" || vehicle.transform.position.length !== 3 || vehicle.transform.rotation.length !== 3
    || ![...vehicle.transform.position, ...vehicle.transform.rotation].every(Number.isFinite)) throw Error("Invalid Survey Hopper body pose.");
  const [x, y, z] = vehicle.transform.position, r = surveyHopperBodyRadius();
  const b = { minX: x - r, maxX: x + r, minY: y - r, maxY: y + r, minZ: z - r, maxZ: z + r };
  if (!Object.values(b).every(Number.isFinite)) throw Error("Survey Hopper body exceeds finite coordinates.");
  return b;
}
