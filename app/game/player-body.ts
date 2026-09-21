import type { FactionRace } from "./factions";
import { CHARACTER_RACES } from "./character-profiles";
import { playerModelHeightScale, type PlayerVariant } from "./player-model";
import type { CelestialBounds, CelestialPoint } from "./celestial-terrain";

export const PLAYER_HEIGHT = 1.8;
export const CROUCH_HEIGHT = 1.48;
export const PLAYER_RADIUS = .3;
export type HumanBodyState = Readonly<{ variant: PlayerVariant; race: FactionRace; crouching: boolean }>;

/** Exact existing local-engine formula, including existing model defaults. */
export function playerBodyHeight(variant: PlayerVariant, race: FactionRace, crouching: boolean): number {
  return (crouching ? CROUCH_HEIGHT : PLAYER_HEIGHT) * playerModelHeightScale(variant, race);
}

/** Strict human transfer geometry, not a normalizer or remote authority check.
 * The live controller anchor is feet. Drones need their separate model/motion
 * contract and must never be silently treated as ordinary human collision. */
export function humanBodyBounds(position: CelestialPoint, state: HumanBodyState): CelestialBounds {
  if (![position.x, position.y, position.z].every(Number.isFinite)
    || !["male", "female"].includes(state.variant) || !(CHARACTER_RACES as readonly string[]).includes(state.race)
    || typeof state.crouching !== "boolean") throw Error("Invalid human attachment body state.");
  const height = playerBodyHeight(state.variant, state.race, state.crouching);
  const bounds = { minX: position.x - PLAYER_RADIUS, maxX: position.x + PLAYER_RADIUS, minY: position.y, maxY: position.y + height,
    minZ: position.z - PLAYER_RADIUS, maxZ: position.z + PLAYER_RADIUS };
  if (!Object.values(bounds).every(Number.isFinite)) throw Error("Human body bounds exceed finite coordinates.");
  return bounds;
}
