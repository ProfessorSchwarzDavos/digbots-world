import * as THREE from "three";
import { cloneSlot, type InventorySlot } from "./data";

export const SAILBOAT_CAPACITY = 2;
export const SAILBOAT_STORAGE_SIZE = 18;
export const SAILBOAT_MAX_SPEED = 6.2;

export type SailboatSave = {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  velocity: number;
  passengers: string[];
  inventory: Array<InventorySlot | null>;
  ownerId: string | null;
};

export type SailboatInput = {
  forward: number;
  turn: number;
};

export type SailboatKinematics = Pick<SailboatSave, "x" | "y" | "z" | "yaw" | "velocity">;

/** Shared with conservative whole-vessel attachment bounds. */
export const SAILBOAT_VISUAL_MOTION = Object.freeze({ maximumBobMultiplier: 1.8, bobAmplitude: .025, pitchAmplitude: .018, rollAmplitude: .025 });

/** Preserve the engine's existing equations and three clock samples in order. */
export function sailboatVisualPose(boat: Pick<SailboatSave, "x" | "y" | "z" | "yaw">, gravityG: number, sampleTimeMs: () => number) {
  const bob = Math.min(SAILBOAT_VISUAL_MOTION.maximumBobMultiplier, Math.sqrt(gravityG));
  const y = boat.y + Math.sin(sampleTimeMs() * .0018 + boat.x) * SAILBOAT_VISUAL_MOTION.bobAmplitude * bob;
  const pitch = Math.sin(sampleTimeMs() * .0013 + boat.z) * SAILBOAT_VISUAL_MOTION.pitchAmplitude * bob;
  const roll = Math.sin(sampleTimeMs() * .0016 + boat.x) * SAILBOAT_VISUAL_MOTION.rollAmplitude * bob;
  return { x: boat.x, y, z: boat.z, pitch, yaw: boat.yaw, roll };
}

const finite = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const wrapAngle = (value: number) => Math.atan2(Math.sin(value), Math.cos(value));

export function emptySailboatInventory() {
  return Array.from({ length: SAILBOAT_STORAGE_SIZE }, () => null as InventorySlot | null);
}

export function normalizeSailboatSave(value: Partial<SailboatSave> | null | undefined, fallbackId = "boat") : SailboatSave {
  const inventory = emptySailboatInventory();
  for (let index = 0; index < Math.min(inventory.length, value?.inventory?.length ?? 0); index += 1) {
    const slot = value?.inventory?.[index];
    if (slot && Number.isInteger(slot.item) && slot.count > 0) inventory[index] = cloneSlot(slot);
  }
  const passengers = [...new Set((value?.passengers ?? []).filter((entry): entry is string => typeof entry === "string" && entry.length > 0))]
    .slice(0, SAILBOAT_CAPACITY);
  return {
    id: typeof value?.id === "string" && value.id ? value.id.slice(0, 80) : fallbackId,
    x: finite(value?.x),
    y: finite(value?.y),
    z: finite(value?.z),
    yaw: wrapAngle(finite(value?.yaw)),
    velocity: clamp(finite(value?.velocity), -SAILBOAT_MAX_SPEED * 0.45, SAILBOAT_MAX_SPEED),
    passengers,
    inventory,
    ownerId: typeof value?.ownerId === "string" && value.ownerId ? value.ownerId.slice(0, 160) : null,
  };
}

export function sailboatInventoryIsEmpty(inventory: readonly (InventorySlot | null)[]) {
  return inventory.every((slot) => !slot || slot.count <= 0);
}

/** Forgiving boarding target: raycast hulls are thin and bob between frames. */
export function sailboatRayPickDistance(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  boat: Pick<SailboatSave, "x" | "y" | "z">,
  reach: number,
) {
  const center = new THREE.Vector3(boat.x, boat.y + 0.72, boat.z);
  const offset = center.sub(origin);
  const along = offset.dot(direction);
  if (along < 0 || along > reach) return null;
  const radialSq = Math.max(0, offset.lengthSq() - along * along);
  return radialSq <= 1.72 * 1.72 ? along : null;
}

export function canBoardSailboat(passengers: readonly string[], playerId: string) {
  return passengers.includes(playerId) || passengers.length < SAILBOAT_CAPACITY;
}

export function boardSailboat(passengers: readonly string[], playerId: string) {
  if (passengers.includes(playerId)) return [...passengers];
  return canBoardSailboat(passengers, playerId) ? [...passengers, playerId] : [...passengers];
}

export function leaveSailboat(passengers: readonly string[], playerId: string) {
  return passengers.filter((passenger) => passenger !== playerId);
}

export function sailboatSeatOffset(index: number, yaw: number) {
  const clamped = clamp(Math.trunc(index), 0, SAILBOAT_CAPACITY - 1);
  const localX = clamped === 0 ? -0.34 : 0.34;
  const localZ = clamped === 0 ? 0.18 : 0.22;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  return new THREE.Vector3(localX * cos + localZ * sin, 0.55, -localX * sin + localZ * cos);
}

/**
 * Integrates the low-frequency boat body. The caller owns collision/water
 * sampling; returning the candidate separately keeps the engine from moving a
 * boat onto dry land when the bow leaves a river or ocean cell.
 */
export function integrateSailboat(
  current: SailboatKinematics,
  input: SailboatInput,
  deltaSeconds: number,
  waterAt: (x: number, z: number) => boolean,
  gravityG = 1,
): SailboatKinematics {
  const dt = clamp(deltaSeconds, 0, 0.1);
  if (gravityG === 0 && !waterAt(current.x, current.z)) {
    // A sail/rudder cannot accelerate in vacuum. Retain the existing hull
    // momentum; powered zero-G vehicles are a separate equipment system.
    return { ...current, x: current.x - Math.sin(current.yaw) * current.velocity * dt,
      z: current.z - Math.cos(current.yaw) * current.velocity * dt };
  }
  const throttle = clamp(input.forward, -1, 1);
  // Screen-space horizontal controls are intentionally reversed at the boat
  // boundary: D/starboard turns the bow to the player's right in the camera's
  // forward view.  Reverse travel still inverts the rudder naturally below.
  const steer = -clamp(input.turn, -1, 1);
  const targetSpeed = throttle >= 0 ? throttle * SAILBOAT_MAX_SPEED : throttle * SAILBOAT_MAX_SPEED * 0.38;
  const velocity = current.velocity + (targetSpeed - current.velocity) * (1 - Math.exp(-dt * (throttle ? 2.7 : 1.55) * Math.sqrt(Math.max(.05, gravityG))));
  const steeringAuthority = 0.38 + Math.min(1, Math.abs(velocity) / SAILBOAT_MAX_SPEED) * 0.92;
  const yaw = wrapAngle(current.yaw + steer * steeringAuthority * dt * (velocity < 0 ? -1 : 1));
  const nextX = current.x - Math.sin(yaw) * velocity * dt;
  const nextZ = current.z - Math.cos(yaw) * velocity * dt;
  const bowX = nextX - Math.sin(yaw) * 1.15;
  const bowZ = nextZ - Math.cos(yaw) * 1.15;
  const sternX = nextX + Math.sin(yaw) * 0.92;
  const sternZ = nextZ + Math.cos(yaw) * 0.92;
  if (!waterAt(nextX, nextZ) || !waterAt(bowX, bowZ) || !waterAt(sternX, sternZ)) {
    return { ...current, yaw, velocity: Math.min(0, velocity * -0.12) };
  }
  return { x: nextX, y: current.y, z: nextZ, yaw, velocity };
}

function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  color: THREE.ColorRepresentation,
  position: [number, number, number],
  name: string,
  transparent = false,
) {
  const material = new THREE.MeshLambertMaterial({ color, transparent, opacity: transparent ? 0.88 : 1, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

/** A chunky two-seat sailboat, deliberately larger than a one-person dinghy. */
export function createSailboatVisual(id: string) {
  const group = new THREE.Group();
  group.name = `sailboat-${id}`;
  group.userData.boatId = id;
  const hull = new THREE.Group();
  hull.rotation.x = 0.015;
  group.add(hull);

  box(hull, [1.72, 0.34, 3.15], 0x81502d, [0, 0.1, 0], "boat-hull");
  box(hull, [1.45, 0.22, 2.64], 0xc58a4c, [0, 0.32, 0.08], "boat-deck");
  box(hull, [0.18, 0.46, 2.66], 0x5c351f, [-0.78, 0.35, 0.06], "boat-port-rail");
  box(hull, [0.18, 0.46, 2.66], 0x5c351f, [0.78, 0.35, 0.06], "boat-starboard-rail");
  box(hull, [1.36, 0.42, 0.22], 0x5c351f, [0, 0.34, 1.38], "boat-stern-rail");
  box(hull, [0.9, 0.34, 0.58], 0x6d4328, [0, 0.5, 0.82], "boat-storage-chest");
  box(hull, [0.56, 0.16, 0.52], 0xd4a364, [-0.35, 0.53, 0.05], "boat-seat-one");
  box(hull, [0.56, 0.16, 0.52], 0xd4a364, [0.35, 0.53, 0.05], "boat-seat-two");

  box(group, [0.14, 2.85, 0.14], 0x4e3120, [0, 1.62, -0.46], "boat-mast");
  const sail = box(group, [0.08, 1.88, 1.45], 0xf3ead2, [0.06, 1.93, -0.93], "boat-sail", true);
  sail.rotation.x = -0.03;
  box(group, [0.09, 0.09, 1.66], 0x5c3821, [0.05, 1.07, -0.96], "boat-boom");
  const pennant = box(group, [0.04, 0.28, 0.58], 0xdd6b45, [0.06, 3.05, -0.67], "boat-pennant", true);
  pennant.rotation.x = -0.2;
  box(group, [0.12, 0.7, 0.34], 0x5b3823, [0, 0.2, 1.74], "boat-rudder");

  group.traverse((object) => { object.userData.boatId = id; });
  return group;
}

export function disposeSailboatVisual(group: THREE.Object3D) {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.dispose();
  });
}
