import { parseLocationId, type LocationId } from "./location-address";
import { isUniverseRecord } from "./universe-json";

/** Immutable provenance, not the creature's current holder or physical location.
 * Absence means legacy/unknown; it must never be filled from a later holder. */
export type CreatureOrigins = Readonly<{
  specimenOriginLocationId?: LocationId;
  encounterOriginLocationId?: LocationId;
}>;
const fields = ["specimenOriginLocationId", "encounterOriginLocationId"] as const;

/** Read only the explicit provenance fields from a body or metadata.custom.
 * No normalization, location inference, migration, clock or identity allocation. */
export function readCreatureOrigins(source: unknown): CreatureOrigins {
  if (!isUniverseRecord(source)) throw Error("Invalid creature origin source.");
  const result: { -readonly [K in keyof CreatureOrigins]: CreatureOrigins[K] } = {};
  for (const field of fields) {
    if (!Object.hasOwn(source, field)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, field)!;
    if (!Object.hasOwn(descriptor, "value")) throw Error("Creature origin cannot be an accessor.");
    parseLocationId(descriptor.value);
    result[field] = descriptor.value as LocationId;
  }
  if (result.specimenOriginLocationId && result.encounterOriginLocationId
    && parseLocationId(result.specimenOriginLocationId).universeId !== parseLocationId(result.encounterOriginLocationId).universeId)
    throw Error("Creature origins belong to different universes.");
  return Object.freeze(result);
}

/** Only a genuinely new creature producer may establish its birth provenance. */
export function newCreatureOrigins(location: LocationId, hasEncounter: boolean): CreatureOrigins {
  parseLocationId(location);
  return Object.freeze({ specimenOriginLocationId: location, ...(hasEncounter ? { encounterOriginLocationId: location } : {}) });
}

export function assertCreatureOriginsAgree(left: unknown, right: unknown): void {
  const a = readCreatureOrigins(left), b = readCreatureOrigins(right);
  if (fields.some(field => a[field] !== b[field])) throw Error("Creature body and stored origin provenance disagree.");
}

/** Captured bee records can also carry their canonical apiary representation.
 * An absent nested origin is legacy; an explicit one cannot contradict or add
 * to the captured creature's root provenance. */
export function readCreatureMetadataOrigins(custom: unknown): CreatureOrigins {
  const origins = readCreatureOrigins(custom);
  const descriptor = Object.getOwnPropertyDescriptor(custom, "apiaryBee");
  if (!descriptor) return origins;
  if (!Object.hasOwn(descriptor, "value")) throw Error("Apiary metadata cannot be an accessor.");
  if (descriptor.value !== null && descriptor.value !== undefined) {
    const nested = readCreatureOrigins(descriptor.value);
    if (Object.keys(nested).length) assertCreatureOriginsAgree(origins, nested);
  }
  return origins;
}

export function validCreatureOrigins(value: unknown): boolean {
  try { readCreatureOrigins(value); return true; } catch { return false; }
}
