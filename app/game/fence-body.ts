import { BLOCKS, type BlockId } from "./data";

/** Shared with actual chunk rendering; fence posts exceed their unit cell. */
export const FENCE_POST_TOP = .75;
export const FENCE_GATE_TOP = .72;
export function fenceConnectsTo(type: BlockId | undefined): boolean {
  const definition = type === undefined ? undefined : BLOCKS[type];
  return definition?.connectGroup === "fence" || Boolean(definition?.solid && (!definition.shape || definition.shape === "cube"));
}
