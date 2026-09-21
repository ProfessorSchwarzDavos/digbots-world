import * as THREE from "three";
import { Item, ITEMS, type ItemCode } from "./data";
import { createAvatarHeldItemModel } from "./held-items";
import { captureOrbFromInventorySlot } from "./capture-orbs";
import type { CelestialBounds } from "./celestial-terrain";
import type { WorldSave } from "./engine";

/** Existing visual scale/animation and vertical terrain-contact probe. */
export const WORLD_DROP_VISUAL = Object.freeze({ scale: .52, jarBob: .045, eggShimmerBase: .88, eggShimmerAmplitude: .14, groundProbeOffset: .15 });
type DropShape = Pick<NonNullable<WorldSave["drops"]>[number], "item" | "metadata" | "x" | "y" | "z">;
const radii = new Map<string, number>();

export function worldDropUsesFilledOrb(item: ItemCode, metadata?: Record<string, unknown>): boolean {
  return item === Item.CaptureOrb && Boolean(captureOrbFromInventorySlot({ item, count: 1, ...(metadata ? { metadata } : {}) })?.creature);
}

/** Conservative origin radius under arbitrary child rotations. Translation and
 * scale envelopes cover the only internal animations applied by updateDrops.
 * Child transforms count; the ROOT translation does not, because spawnDrop
 * overwrites it with the saved anchor. Root scale is retained and multiplied. */
function subtreeRadius(node: THREE.Object3D): number {
  let radius = 0;
  if (node instanceof THREE.Mesh) {
    const positions = node.geometry.getAttribute("position");
    if (!positions || !positions.count) throw Error("Missing world-drop model geometry.");
    for (let index = 0; index < positions.count; index++)
      radius = Math.max(radius, Math.hypot(positions.getX(index), positions.getY(index), positions.getZ(index)));
  }
  for (const child of node.children) {
    const baseY = Number(child.userData.baseY) || 0;
    const yExtent = child.userData.jarBug ? Math.max(Math.abs(child.position.y), Math.abs(baseY) + WORLD_DROP_VISUAL.jarBob) : Math.abs(child.position.y);
    const translation = Math.hypot(child.position.x, yExtent, child.position.z);
    radius = Math.max(radius, translation + scaleEnvelope(child) * subtreeRadius(child));
  }
  return radius;
}
function scaleEnvelope(node: THREE.Object3D) {
  const original = Math.max(Math.abs(node.scale.x), Math.abs(node.scale.y), Math.abs(node.scale.z));
  return node.userData.eggShimmer ? Math.max(original, WORLD_DROP_VISUAL.eggShimmerBase + WORLD_DROP_VISUAL.eggShimmerAmplitude) : original;
}
function disposeTemplate(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

/** Same bounded template key as spawnDrop; cached numbers own no GPU resources.
 * Atlas material does not alter held-model geometry. Every factory instance
 * owns its geometry/materials; no live-world template is borrowed or disposed. */
export function worldDropBodyRadius(item: ItemCode, filledCaptureOrb = false): number {
  if (!Number.isSafeInteger(item) || !Object.hasOwn(ITEMS, item)) throw Error("Unknown world-drop item geometry.");
  const filled = item === Item.CaptureOrb && filledCaptureOrb;
  const key = `${item}:${filled ? "filled" : "empty"}`, existing = radii.get(key);
  if (existing !== undefined) return existing;
  const model = createAvatarHeldItemModel(item, { filledCaptureOrb: filled });
  if (!model) throw Error("Missing world-drop item model.");
  try {
    const visualRadius = subtreeRadius(model) * scaleEnvelope(model) * WORLD_DROP_VISUAL.scale;
    if (!Number.isFinite(visualRadius) || visualRadius <= 0) throw Error("Invalid world-drop physical radius.");
    const radius = Math.max(visualRadius, WORLD_DROP_VISUAL.groundProbeOffset);
    radii.set(key, radius); return radius;
  } finally { disposeTemplate(model); }
}

/** Physical footprint only. Count/durability/metadata remain opaque and exact;
 * this grants no pickup, split, merge, lineage or inventory authority. Root
 * motion changes the saved anchor itself; it is not an extra hidden offset. */
export function worldDropBodyBounds(drop: DropShape): CelestialBounds {
  if (![drop.x, drop.y, drop.z].every(Number.isFinite)) throw Error("Invalid world-drop position.");
  const radius = worldDropBodyRadius(drop.item, worldDropUsesFilledOrb(drop.item, drop.metadata));
  const bounds = { minX: drop.x - radius, maxX: drop.x + radius, minY: drop.y - radius, maxY: drop.y + radius,
    minZ: drop.z - radius, maxZ: drop.z + radius };
  if (!Object.values(bounds).every(Number.isFinite)) throw Error("World-drop bounds exceed finite coordinates.");
  return bounds;
}
