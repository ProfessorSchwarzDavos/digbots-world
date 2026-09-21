import * as THREE from "three";
import { BlockPlayerModel, DRONE_VISUAL_MOTION } from "./player-model";
import type { CelestialBounds, CelestialPoint } from "./celestial-terrain";

let radius: number | undefined;
/** Radius around each node under arbitrary child rotations, including the
 * continuously rotating scanner and pulsing lens. Hidden human rig is excluded. */
function branchRadius(node: THREE.Object3D): number {
  if (!node.visible) return 0;
  let result = 0;
  if (node instanceof THREE.Mesh) {
    const vertices = node.geometry.getAttribute("position");
    if (!vertices?.count) throw Error("Missing drone body geometry.");
    for (let index = 0; index < vertices.count; index++)
      result = Math.max(result, Math.hypot(vertices.getX(index), vertices.getY(index), vertices.getZ(index)));
  }
  for (const child of node.children) {
    if (!child.visible) continue;
    const scale = Math.max(Math.abs(child.scale.x), Math.abs(child.scale.y), Math.abs(child.scale.z),
      child.name === "drone-lens" ? 1 + DRONE_VISUAL_MOTION.lensAmplitude : 0);
    result = Math.max(result, child.position.length() + scale * branchRadius(child));
  }
  return result;
}

/** Owns a short-lived factory instance, caches only a number. Never borrows a
 * live model or includes hidden human equipment as the drone's physical body. */
export function droneBodyRadius(): number {
  if (radius !== undefined) return radius;
  const model = new BlockPlayerModel({ modelKind: "drone" });
  try {
    const root = model.group.getObjectByName("agent-drone-rig");
    if (!root || !root.visible) throw Error("Missing drone body rig.");
    const measured = branchRadius(root) * Math.max(Math.abs(root.scale.x), Math.abs(root.scale.y), Math.abs(root.scale.z));
    if (!Number.isFinite(measured) || measured <= 0) throw Error("Invalid drone body envelope.");
    radius = measured; return radius;
  } finally { model.dispose(); }
}

/** Conservative visible-body envelope at every yaw/hover/roll/scanner phase.
 * Includes the controller anchor below the hovering body, since relationships
 * use that anchor. This is NOT human collision, agent presence, cargo location,
 * session authentication, a saved body, or permission to move an agent. */
export function droneBodyBounds(position: CelestialPoint): CelestialBounds {
  if (![position.x, position.y, position.z].every(Number.isFinite)) throw Error("Invalid drone body position.");
  const r = droneBodyRadius(), low = Math.min(DRONE_VISUAL_MOTION.initialY, DRONE_VISUAL_MOTION.hoverY - DRONE_VISUAL_MOTION.hoverAmplitude);
  const high = Math.max(DRONE_VISUAL_MOTION.initialY, DRONE_VISUAL_MOTION.hoverY + DRONE_VISUAL_MOTION.hoverAmplitude);
  const bounds = { minX: position.x - r, maxX: position.x + r, minY: position.y + Math.min(0, low - r),
    maxY: position.y + Math.max(0, high + r), minZ: position.z - r, maxZ: position.z + r };
  if (!Object.values(bounds).every(Number.isFinite)) throw Error("Drone body bounds exceed finite coordinates.");
  return bounds;
}
