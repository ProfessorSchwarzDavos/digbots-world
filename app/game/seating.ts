import { BLOCKS, BlockId } from "./data";
import { blockFacingYaw, normalizeBlockFacing, rotateBlockOffset, type BlockFacing } from "./block-facing";

export type SeatAnchor = Readonly<{
  x: number;
  y: number;
  z: number;
  /** Chairs have a visible back and therefore a canonical facing. */
  yaw?: number;
}>;

const SEAT_BLOCKS = new Set<BlockId>([
  BlockId.WildwoodStool,
  BlockId.DwarfStool,
  BlockId.HearthChair,
  BlockId.MoonboughChair,
  BlockId.StationHabitation,
]);

export function isSeatBlock(block: BlockId | undefined) {
  return block !== undefined && SEAT_BLOCKS.has(block);
}
/**
 * Player feet remain on the floor beneath the furniture while the crouched
 * rig's hips align with the authored seat board. This avoids turning chairs
 * into invisible moving platforms and keeps the pose stable in multiplayer.
 */
export function seatAnchorForBlock(block: BlockId, x: number, y: number, z: number, facing: BlockFacing = 0): SeatAnchor | null {
  if (!isSeatBlock(block)) return null;
  const chair = BLOCKS[block]?.shape === "chair";
  const normalizedFacing = normalizeBlockFacing(facing);
  const offset = rotateBlockOffset(0, chair ? -0.06 : 0, normalizedFacing);
  return {
    x: x + offset.x,
    y: y - 0.49,
    z: z + offset.z,
    ...(chair ? { yaw: blockFacingYaw(normalizedFacing) } : {}),
  };
}
