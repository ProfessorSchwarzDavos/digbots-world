import { MOB_DEFS, type MobDefinition, type MobKind } from "./mobs";
import { creatureAppearance } from "./creature-appearance";
import type { CreatureProgressionV2 } from "./creature-progression";
import { PRIME_FORM_PROFILES } from "./creature-rarity";
import { husbandryAgeScale } from "./fauna";
import { shadecrawlerScale, type ShadecrawlerState } from "./shadecrawler";
import { creatureBodyMass, creatureCollisionProfile, type CreatureCollisionProfile } from "./creature-pathing";
import type { CelestialBounds, CelestialPoint } from "./celestial-terrain";

/** The exact fields affecting the live body's size; no entity/resource cloning. */
export type CreatureBodyState = Readonly<{
  kind: MobKind;
  dragonState?: Readonly<{ growthScale: number; stage: number }> | null;
  leviathanGrowth?: Readonly<{ growthScale: number; stage: string }> | null;
  shadeState?: ShadecrawlerState | null;
  petState?: Readonly<{ baby: boolean }> | null;
  careState?: Readonly<{ baby: boolean }> | null;
  progression?: CreatureProgressionV2 | null;
}>;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** Shared with the engine, including its legacy missing-progression fallback. */
export function creatureBodyScale(state: CreatureBodyState): number {
  const base = state.dragonState ? state.dragonState.growthScale
    : state.leviathanGrowth ? state.leviathanGrowth.growthScale
      : state.shadeState ? shadecrawlerScale(state.shadeState)
        : husbandryAgeScale(state.kind, Boolean(state.petState?.baby || state.careState?.baby));
  const appearance = state.progression ? creatureAppearance(state.kind, state.progression).sizeScale : 1;
  const prime = state.progression?.rarityForm === "prime" ? PRIME_FORM_PROFILES[state.kind]?.sizeScale ?? 1 : 1;
  return base * appearance * prime;
}

export function creatureRuntimeCollisionProfile(definition: MobDefinition, state: CreatureBodyState,
  scale = creatureBodyScale(state)): CreatureCollisionProfile {
  const profile = creatureCollisionProfile(definition, scale, Boolean(state.dragonState?.stage === 1
    || state.petState?.baby || state.careState?.baby || state.leviathanGrowth && state.leviathanGrowth.stage !== "adult"));
  if (!state.dragonState || state.dragonState.stage === 1) return profile;
  return { solid: true, size: "large", radius: clamp(definition.radius * scale * .72, .48, 2.8),
    height: Math.max(.8, definition.height * scale), visualScale: scale };
}

/** Physical contact includes small creatures that are not hard navigation blockers. */
export function creatureRuntimeBodyProfile(definition: MobDefinition, collision: CreatureCollisionProfile, scale: number) {
  const radius = collision.solid ? collision.radius : clamp(definition.radius * scale * .72, .12, .42);
  const height = collision.solid ? collision.height : Math.max(.16, definition.height * scale);
  return { ...collision, radius, height, mass: creatureBodyMass({ size: collision.size, radius, height }) };
}
export function creatureFootY(definition: Pick<MobDefinition, "footOffset">, groupY: number): number {
  return groupY - definition.footOffset + .5;
}

/** Conservative axis-aligned contact body, derived from the SAME live collision
 * formulas. Includes the whole cylinder, not only its center. This does not cover
 * AI guard/home volumes, leads/passengers or authored/agent relationships. A frame
 * selector must add those separately and reject partial intersections.
 */
export function creatureBodyBounds(state: CreatureBodyState, position: CelestialPoint): CelestialBounds {
  const definition = MOB_DEFS[state.kind];
  if (!definition) throw Error("Invalid creature body geometry.");
  const scale = creatureBodyScale(state);
  if (![position.x, position.y, position.z, scale].every(Number.isFinite) || scale <= 0)
    throw Error("Invalid creature body geometry.");
  const body = creatureRuntimeBodyProfile(definition, creatureRuntimeCollisionProfile(definition, state, scale), scale);
  const bottom = creatureFootY(definition, position.y);
  const bounds = { minX: position.x - body.radius, maxX: position.x + body.radius, minY: bottom, maxY: bottom + body.height,
    minZ: position.z - body.radius, maxZ: position.z + body.radius };
  if (!Object.values(bounds).every(Number.isFinite) || body.radius <= 0 || body.height <= 0) throw Error("Invalid creature body geometry.");
  return bounds;
}
