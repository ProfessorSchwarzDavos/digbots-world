import { BlockId } from "./data";

/** One bed item owns two exact, orientation-matched world cells. */
export function bedCounterpart(type: BlockId, x: number, y: number, z: number) {
  switch (type) {
    case BlockId.BedNorthFoot: return { x, y, z: z - 1, type: BlockId.BedNorthHead };
    case BlockId.BedNorthHead: return { x, y, z: z + 1, type: BlockId.BedNorthFoot };
    case BlockId.BedSouthFoot: return { x, y, z: z + 1, type: BlockId.BedSouthHead };
    case BlockId.BedSouthHead: return { x, y, z: z - 1, type: BlockId.BedSouthFoot };
    case BlockId.BedEastFoot: return { x: x + 1, y, z, type: BlockId.BedEastHead };
    case BlockId.BedEastHead: return { x: x - 1, y, z, type: BlockId.BedEastFoot };
    case BlockId.BedWestFoot: return { x: x - 1, y, z, type: BlockId.BedWestHead };
    case BlockId.BedWestHead: return { x: x + 1, y, z, type: BlockId.BedWestFoot };
    default: return null;
  }
}
