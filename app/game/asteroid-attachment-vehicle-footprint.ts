import * as THREE from "three";
import { createSailboatVisual, disposeSailboatVisual, SAILBOAT_VISUAL_MOTION, type SailboatSave } from "./boats";
import type { CelestialBounds } from "./celestial-terrain";
import type { AsteroidAttachmentFrame, AsteroidAttachmentView } from "./asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";

type BoatShape = Readonly<{ bounds: CelestialBounds; radius: number }>;
let shape: BoatShape | undefined;
function corners(b: CelestialBounds) {
  return [b.minX, b.maxX].flatMap(x => [b.minY, b.maxY].flatMap(y => [b.minZ, b.maxZ].map(z => ({ x, y, z }))));
}
/** Derive once from the SAME authored hull/mast/sail/chest/rail/rudder model.
 * No WebGL context, hand-maintained guessed radius, retained model or save data.
 * The local AABB includes each part's existing local rotation. */
function boatShape(): BoatShape {
  if (shape) return shape;
  const visual = createSailboatVisual("attachment-shape");
  try {
    const box = new THREE.Box3().setFromObject(visual);
    const bounds = Object.freeze({ minX: box.min.x, maxX: box.max.x, minY: box.min.y, maxY: box.max.y, minZ: box.min.z, maxZ: box.max.z });
    const radius = Math.max(...corners(bounds).map(p => Math.hypot(p.x, p.y, p.z)));
    if (!Number.isFinite(radius) || radius <= 0) throw Error("Invalid authored sailboat attachment shape.");
    shape = Object.freeze({ bounds, radius }); return shape;
  } finally { disposeSailboatVisual(visual); }
}

/** Full vessel, not the forgiving ray-pick sphere or two water probe points.
 * Includes ALL possible bob/pitch/roll phases up to the engine's gravity cap.
 * For XYZ Euler motion, ||Rx Ry Rz v - Ry v|| <=
 * 2r(sin(maxPitch/2) + sin(maxRoll/2)); expand the yawed authored AABB by that
 * conservative tilt envelope plus vertical bob. Does not include passengers:
 * their actual body footprints and seat/actor relations are checked separately.
 */
export function sailboatAttachmentBodyBounds(boat: Pick<SailboatSave, "x" | "y" | "z" | "yaw">): CelestialBounds {
  if (![boat.x, boat.y, boat.z, boat.yaw].every(Number.isFinite)) throw Error("Invalid sailboat attachment pose.");
  const { bounds, radius } = boatShape(), sin = Math.sin(boat.yaw), cos = Math.cos(boat.yaw);
  const points = corners(bounds).map(p => ({ x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos }));
  const motion = SAILBOAT_VISUAL_MOTION, cap = motion.maximumBobMultiplier;
  const tilt = 2 * radius * (Math.sin(motion.pitchAmplitude * cap / 2) + Math.sin(motion.rollAmplitude * cap / 2));
  const bob = motion.bobAmplitude * cap;
  const result = { minX: boat.x + Math.min(...points.map(p => p.x)) - tilt, maxX: boat.x + Math.max(...points.map(p => p.x)) + tilt,
    minY: boat.y + bounds.minY - tilt - bob, maxY: boat.y + bounds.maxY + tilt + bob,
    minZ: boat.z + Math.min(...points.map(p => p.z)) - tilt, maxZ: boat.z + Math.max(...points.map(p => p.z)) + tilt };
  if (!Object.values(result).every(Number.isFinite)) throw Error("Sailboat footprint exceeds finite coordinates.");
  return result;
}

export function asteroidSailboatFootprintSide(frame: AsteroidAttachmentFrame, boat: Pick<SailboatSave, "x" | "y" | "z" | "yaw">,
  view: AsteroidAttachmentView): boolean {
  return asteroidAttachmentVolumeSide(frame, sailboatAttachmentBodyBounds(boat), view);
}
