import { BlockId } from "./data";
import { rotateBlockOffset, type BlockFacing } from "./block-facing";
import type { CelestialBounds, CelestialPoint } from "./celestial-terrain";

/** Shared with the placed renderer: these small protrusions are real geometry,
 * not decorative permission to split a holder at a coordinate-frame boundary. */
export const FURNACE_FRONT_PLATE = Object.freeze({ minZ: -.506, maxZ: -.499 });
export const HEALER_ACTIVE_FUEL = Object.freeze({ width: .16, height: .045, depth: .018, x: 0, y: -.12, z: -.493 });

export const CUSTODY_BLOCK_MODELS = Object.freeze({
  furnaces: { block: BlockId.Furnace, facing: true, min: [-.5, -.5, FURNACE_FRONT_PLATE.minZ], max: [.5, .5, .5] },
  wheatMills: { block: BlockId.WheatMill, facing: false, min: [-.5, -.5, -.5], max: [.5, .5, .5] },
  // Union of all rack joins and all occupied socket displays.
  orbRacks: { block: BlockId.CaptureOrbRack, facing: true, min: [-.5, -.5, -.38], max: [.5, .5, .38] },
  healingStations: { block: BlockId.CreatureHealer, facing: true,
    min: [-.48, -.48, HEALER_ACTIVE_FUEL.z - HEALER_ACTIVE_FUEL.depth / 2], max: [.48, .3105, .48] },
  // Ring, orb, band and motes at every animation phase fit the static loom.
  morphLooms: { block: BlockId.ChrysalisLoom, facing: false, min: [-.47, -.5, -.43], max: [.47, .48, .43] },
  // A housed perch resident is metadata, not a separately rendered live body.
  fieldPerches: { block: BlockId.FieldPerch, facing: false, min: [-.34, -.5, -.34], max: [.34, .14, .34] },
} as const);
export type CustodyBlockField = keyof typeof CUSTODY_BLOCK_MODELS;

/** All-phase placed model envelope. Definitions match World.buildChunkGeometry
 * and VoxelEngine's rack/healer/loom display builders; held/drop models differ.
 * This is not a collider, inventory validator or transfer authority. */
export function custodyBlockBodyBounds(field: CustodyBlockField, point: CelestialPoint, facing: BlockFacing): CelestialBounds {
  if (!Object.hasOwn(CUSTODY_BLOCK_MODELS, field) || ![point.x, point.y, point.z].every(Number.isSafeInteger)
    || ![0, 1, 2, 3].includes(facing)) throw Error("Invalid custody block body pose.");
  const model = CUSTODY_BLOCK_MODELS[field], rotation = model.facing ? facing : 0;
  const corners = [model.min[0], model.max[0]].flatMap(x => [model.min[2], model.max[2]].map(z => rotateBlockOffset(x, z, rotation)));
  return { minX: point.x + Math.min(...corners.map(p => p.x)), maxX: point.x + Math.max(...corners.map(p => p.x)),
    minY: point.y + model.min[1], maxY: point.y + model.max[1],
    minZ: point.z + Math.min(...corners.map(p => p.z)), maxZ: point.z + Math.max(...corners.map(p => p.z)) };
}
