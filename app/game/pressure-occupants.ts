import type { AirZoneState } from "./airzone";
import type { MobDefinition } from "./mobs";

/** Loaded habitat occupants only. Planetary and aquatic physiology remain separate. */
export const HABITAT_EXPOSURE_GRACE_SECONDS = 15;
type Biology = Pick<MobDefinition, "kind" | "family" | "movement">;

export function habitatOccupantBreathes(definition: Biology): boolean {
  return definition.movement !== "aquatic"
    && definition.family !== "undead" && definition.family !== "construct"
    && definition.family !== "summon"
    // Legacy Rattlekin predates families; its authored body is animated stone.
    && definition.kind !== "rattlekin";
}

/** The runtime remains the sole authority that converts this demand to CO2. */
export function habitatOccupantOxygenDemand(definition: Biology & Pick<MobDefinition, "height">): number {
  return habitatOccupantBreathes(definition) ? definition.height > 2 ? 6 : 2 : 0;
}

export function normalizeHabitatExposure(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(HABITAT_EXPOSURE_GRACE_SECONDS, value)) : 0;
}

/** Pure health dose: never consumes gas or changes the room. Unknown topology
 * freezes the dose, rather than turning discovery latency into suffocation.
 * Physical readings, not a room's seal label, determine biological safety. */
export function stepHabitatOccupantExposure(input: {
  definition: Biology; exposureSeconds?: number; elapsedSeconds: number;
  zone: Readonly<AirZoneState> | null | undefined; isHost: boolean;
}): { exposureSeconds: number; damage: number } {
  const previous = normalizeHabitatExposure(input.exposureSeconds);
  const unchanged = { exposureSeconds: previous, damage: 0 };
  if (!input.isHost || !Number.isFinite(input.elapsedSeconds) || input.elapsedSeconds <= 0) return unchanged;
  if (!habitatOccupantBreathes(input.definition)) return { exposureSeconds: 0, damage: 0 };
  const zone = input.zone;
  if (!zone || !["sealed", "leaking", "depressurized"].includes(zone.status)) return unchanged;
  const total = zone.oxygenMilliMoles + zone.inertMilliMoles + zone.co2MilliMoles;
  const oxygenPa = total > 0 ? zone.pressureMilliKPa * zone.oxygenMilliMoles / total : 0;
  const carbonFraction = total > 0 ? zone.co2MilliMoles / total : 0;
  const unsafe = zone.pressureMilliKPa < 60000 || zone.pressureMilliKPa > 120000
    || oxygenPa < 16000 || oxygenPa > 30000 || carbonFraction > .005;
  if (!unsafe) return { exposureSeconds: Math.max(0, previous - input.elapsedSeconds * 2), damage: 0 };
  const unprotectedSeconds = Math.max(0, input.elapsedSeconds - (HABITAT_EXPOSURE_GRACE_SECONDS - previous));
  return { exposureSeconds: Math.min(HABITAT_EXPOSURE_GRACE_SECONDS, previous + input.elapsedSeconds), damage: unprotectedSeconds };
}
