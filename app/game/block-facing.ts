import { BLOCKS, BlockId } from "./data";

/** Cardinal front direction for an asymmetric placed block. */
export type BlockFacing = 0 | 1 | 2 | 3;

export const BLOCK_FACING_NORTH = 0 as const;
export const BLOCK_FACING_EAST = 1 as const;
export const BLOCK_FACING_SOUTH = 2 as const;
export const BLOCK_FACING_WEST = 3 as const;

const DIRECTIONAL_SHAPES = new Set([
  "wayworks",
  "chest",
  "fireplace",
  "apiary",
  "wild-hive",
  "orb-rack",
  "orb-healer",
  "cartography",
  "alchemy",
  "wayshrine",
  "distillery",
  "sugarworks",
  "incubator",
  "archive-shelf",
  "tome-display",
  "chair",
  "table",
  "shelf",
]);

/** Cubic legacy workstations whose authored front is their side atlas tile. */
const DIRECTIONAL_CUBES = new Set<BlockId>([
  BlockId.HandDynamo, BlockId.SunplateArray, BlockId.FieldBattery, BlockId.ChargingPedestal, BlockId.GridCable,
  BlockId.CraftingTable,
  BlockId.Furnace,
  BlockId.GolemForge,
  BlockId.Powderworks,
  BlockId.WaygridVaultTerminal,
  BlockId.WaygridCreatureArchive,
]);

export function isDirectionallyPlacedBlock(type: BlockId | undefined): boolean {
  if (type === undefined) return false;
  return DIRECTIONAL_CUBES.has(type) || DIRECTIONAL_SHAPES.has(BLOCKS[type]?.shape ?? "");
}

/**
 * Placeable fronts face the builder, matching familiar furnace/chest behavior.
 * Yaw zero looks north, so the block in front of that builder faces south.
 */
export function blockFacingForYaw(yaw: number): BlockFacing {
  const towardPlayerX = Math.sin(Number.isFinite(yaw) ? yaw : 0);
  const towardPlayerZ = Math.cos(Number.isFinite(yaw) ? yaw : 0);
  if (Math.abs(towardPlayerX) > Math.abs(towardPlayerZ)) {
    return towardPlayerX >= 0 ? BLOCK_FACING_EAST : BLOCK_FACING_WEST;
  }
  return towardPlayerZ >= 0 ? BLOCK_FACING_SOUTH : BLOCK_FACING_NORTH;
}

export function normalizeBlockFacing(value: unknown): BlockFacing {
  const facing = Math.trunc(Number(value));
  return facing >= 0 && facing <= 3 ? facing as BlockFacing : BLOCK_FACING_NORTH;
}

/** Clockwise cardinal rotation of an X/Z offset authored with front at -Z. */
export function rotateBlockOffset(x: number, z: number, facing: BlockFacing) {
  const rotated = facing === BLOCK_FACING_EAST ? { x: -z, z: x }
    : facing === BLOCK_FACING_SOUTH ? { x: -x, z: -z }
      : facing === BLOCK_FACING_WEST ? { x: z, z: -x }
        : { x, z };
  return { x: rotated.x || 0, z: rotated.z || 0 } as const;
}

export function blockFacingYaw(facing: BlockFacing) {
  return facing === BLOCK_FACING_NORTH ? 0 : -facing * Math.PI / 2;
}

export function blockFacingFront(facing: BlockFacing) {
  return rotateBlockOffset(0, -1, facing);
}

export function blockFacingRight(facing: BlockFacing) {
  return rotateBlockOffset(1, 0, facing);
}
