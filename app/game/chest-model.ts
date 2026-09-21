import { blockFacingRight, blockFacingYaw, type BlockFacing } from "./block-facing";

/**
 * One production geometry contract shared by chunk-authored closed chests and
 * the articulated runtime model. Values are relative to a chest block center.
 */
export const CHEST_VISUAL = Object.freeze({
  bodyBottom: -0.5,
  bodyTop: 0.13,
  bodyDepth: 0.88,
  lidBottom: 0.16,
  lidTop: 0.37,
  lidDepth: 0.92,
  latchWidth: 0.18,
  latchBottom: 0.03,
  latchTop: 0.24,
  latchDepth: 0.065,
  latchCenterZ: -0.4575,
} as const);

export function chestLatchCenters(large: boolean) {
  return large ? [-0.5, 0.5] as const : [0] as const;
}

export const CHEST_MAX_OPEN_ANGLE = 1.08;
export const chestLidRotation = (openAmount: number) => openAmount * CHEST_MAX_OPEN_ANGLE;

export function chestModelLayout(positions: ReadonlyArray<readonly [number, number, number]>) {
  const large = positions.length > 1;
  const pairAlongX = large && positions.every(position => position[2] === positions[0][2]);
  // The local model is wider left-to-right; rotate Z-adjacent legacy pairs.
  return { large, width: large ? 1.88 : 0.88, depth: CHEST_VISUAL.bodyDepth,
    lidWidth: large ? 1.92 : 0.92, lidDepth: CHEST_VISUAL.lidDepth,
    rotationY: large && !pairAlongX ? Math.PI / 2 : 0 } as const;
}

/** Shared unchanged runtime placement, including old pairs with a facing that
 * does not agree with their existing physical axis. Never reorder the halves. */
export function chestModelPose(positions: ReadonlyArray<readonly [number, number, number]>, facing: BlockFacing) {
  const layout = chestModelLayout(positions), right = blockFacingRight(facing);
  const pairMatchesFacing = positions.length < 2 || Math.abs((positions[1][0] - positions[0][0]) * right.z
    - (positions[1][2] - positions[0][2]) * right.x) < 0.001;
  return { layout, x: positions.reduce((sum, value) => sum + value[0], 0) / positions.length,
    y: positions[0][1], z: positions.reduce((sum, value) => sum + value[2], 0) / positions.length,
    rotationY: pairMatchesFacing ? blockFacingYaw(facing) : layout.rotationY };
}
