import type { VoxelEngine } from "./engine";
import { assertExactKeys, cloneUniverseJson, isUniverseRecord } from "./universe-json";

/** Only durable player bindings to entities in this location. Connection
 * grants and other players' vacant seats are deliberately not restored. */
export type LocationPlayerState = Readonly<{
  schema: 1;
  creativeFlying: boolean;
  boatId: string | null;
  creatureId: number | null;
  creatureSeat: number | null;
}>;

export function validateLocationPlayerState(value: unknown): LocationPlayerState | null {
  if (value === undefined) return null;
  if (!isUniverseRecord(value)) throw new Error("Invalid location player binding.");
  assertExactKeys(value, ["schema", "creativeFlying", "boatId", "creatureId", "creatureSeat"], "Location player binding");
  if (value.schema !== 1 || typeof value.creativeFlying !== "boolean"
    || (value.boatId !== null && (typeof value.boatId !== "string" || !/^[A-Za-z0-9_.:-]{1,160}$/.test(value.boatId)))
    || (value.creatureId !== null && (!Number.isSafeInteger(value.creatureId) || Number(value.creatureId) < 0))
    || (value.creatureSeat !== null && (!Number.isSafeInteger(value.creatureSeat) || Number(value.creatureSeat) < 0 || Number(value.creatureSeat) > 31))
    || (value.boatId !== null && value.creatureId !== null)
    || (value.creatureId === null && value.creatureSeat !== null)) throw new Error("Invalid location player binding.");
  return cloneUniverseJson(value) as LocationPlayerState;
}

/** Neutral state for every entry, including A-B-A and title previews. These
 * clocks describe in-flight work, not progression, and must not cross owners. */
export const LOCATION_TRANSIENT_DEFAULTS = Object.freeze({
  fallVelocity: 0, fallDistance: 0, fallCuePlayed: false, wasInWater: false, headSubmerged: false,
  liquidTickAccumulator: 0, mineHeld: false, miningProgress: 0, miningSoundTimer: 0,
  placeCooldown: 0, attackCooldown: 0, playerInvulnerability: 0, fluidDamageTimer: 0,
  fumaroleDamageTimer: 0, fumaroleParticleTimer: 0, undergroundAmbienceTimer: 3, regenTimer: 0,
  footstepDistance: 0, mobSpawnTimer: 2, passiveMobSpawnTimer: 0.8, zombieVoiceCooldown: 0,
  combatMusicTimer: 0, heldSwing: 0, heldUse: 0, activeRecipe: null, craftingSize: 2,
  gameplayOverlayOpen: true, autoSaveAccumulator: 0, sleepingCreatureWakeTimer: 0,
  lastForwardTap: -Infinity, sprintLatched: false, lastCreativeJumpTap: -Infinity,
  creativeFlying: false, activePet: null, activeDragon: null,
} satisfies Partial<VoxelEngine>);

export function resetLocationTransients(engine: Pick<VoxelEngine, keyof typeof LOCATION_TRANSIENT_DEFAULTS>): void {
  Object.assign(engine, LOCATION_TRANSIENT_DEFAULTS);
}
