import type { CelestialBounds } from "./celestial-terrain";
import type { BlockFacing } from "./block-facing";
import { CHEST_MAX_OPEN_ANGLE, CHEST_VISUAL, chestLatchCenters, chestModelPose } from "./chest-model";

export type ChestCell = readonly [number, number, number];
export function validateChestCells(cells: readonly ChestCell[]): void {
  if (![1, 2].includes(cells.length) || cells.some(cell => cell.length !== 3 || !cell.every(Number.isSafeInteger))
    || cells.length === 2 && (cells[0][1] !== cells[1][1]
      || Math.abs(cells[0][0] - cells[1][0]) + Math.abs(cells[0][2] - cells[1][2]) !== 1))
    throw Error("Invalid physical chest component.");
}
function arcRange(a: number, b: number) {
  const angles = [0, CHEST_MAX_OPEN_ANGLE], stationary = Math.atan2(b, a);
  for (let turn = -2; turn <= 2; turn++) {
    const angle = stationary + turn * Math.PI;
    if (angle > 0 && angle < CHEST_MAX_OPEN_ANGLE) angles.push(angle);
  }
  const values = angles.map(angle => a * Math.cos(angle) + b * Math.sin(angle));
  return [Math.min(...values), Math.max(...values)] as const;
}

/** Actual closed block collision plus the complete articulated lid sweep.
 * Analytic extrema cover interior angles as well as the two endpoints, without
 * relying on sampled poses. Shared dimensions/pose/angle leave visuals unchanged. */
export function chestBodyBounds(cells: readonly ChestCell[], facing: BlockFacing): CelestialBounds {
  validateChestCells(cells);
  if (![0, 1, 2, 3].includes(facing)) throw Error("Invalid chest body facing.");
  const pose = chestModelPose(cells, facing), c = Math.round(Math.cos(pose.rotationY)), s = Math.round(Math.sin(pose.rotationY));
  const { layout } = pose;
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  const point = (x: number, y: number, z: number) => {
    const wx = pose.x + x * c + z * s, wy = pose.y + y, wz = pose.z - x * s + z * c;
    bounds.minX = Math.min(bounds.minX, wx); bounds.maxX = Math.max(bounds.maxX, wx);
    bounds.minY = Math.min(bounds.minY, wy); bounds.maxY = Math.max(bounds.maxY, wy);
    bounds.minZ = Math.min(bounds.minZ, wz); bounds.maxZ = Math.max(bounds.maxZ, wz);
  };
  const box = (xs: readonly number[], ys: readonly number[], zs: readonly number[]) => {
    for (const x of xs) for (const y of ys) for (const z of zs) point(x, y, z);
  };
  box([-layout.width / 2, layout.width / 2], [CHEST_VISUAL.bodyBottom, CHEST_VISUAL.bodyTop], [-layout.depth / 2, layout.depth / 2]);
  for (const x of chestLatchCenters(layout.large)) box([x - CHEST_VISUAL.latchWidth / 2, x + CHEST_VISUAL.latchWidth / 2],
    [CHEST_VISUAL.latchBottom, CHEST_VISUAL.latchTop], [CHEST_VISUAL.latchCenterZ - CHEST_VISUAL.latchDepth / 2, CHEST_VISUAL.latchCenterZ + CHEST_VISUAL.latchDepth / 2]);
  for (const y of [0, CHEST_VISUAL.lidTop - CHEST_VISUAL.lidBottom]) for (const z of [-layout.lidDepth, 0]) {
    const yr = arcRange(y, -z).map(value => value + CHEST_VISUAL.lidBottom);
    const zr = arcRange(z, y).map(value => value + layout.lidDepth / 2);
    box([-layout.lidWidth / 2, layout.lidWidth / 2], yr, zr);
  }
  for (const [x, y, z] of cells) {
    bounds.minX = Math.min(bounds.minX, x - .5); bounds.maxX = Math.max(bounds.maxX, x + .5);
    bounds.minY = Math.min(bounds.minY, y - .5); bounds.maxY = Math.max(bounds.maxY, y + .5);
    bounds.minZ = Math.min(bounds.minZ, z - .5); bounds.maxZ = Math.max(bounds.maxZ, z + .5);
  }
  return bounds;
}
