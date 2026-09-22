import { readCreatureOrigins } from "./creature-origins";
import type { LocationId } from "./location-address";

/** Only explicit specimen provenance disambiguates a bare identity. Holder
 * location and encounter provenance must never be substituted here. */
export function creatureSpecimenIdentityKey(id: string, source: unknown): string {
  return JSON.stringify([id, readCreatureOrigins(source).specimenOriginLocationId ?? null]);
}

/** A collection's independent owners/bodies, not a deployed-owner join. */
export class CreatureSpecimenIdentitySet {
  private readonly origins = new Map<string, Set<LocationId | null>>();

  add(id: string, source: unknown, duplicateMessage: string): void {
    const origin = readCreatureOrigins(source).specimenOriginLocationId ?? null;
    const previous = this.origins.get(id);
    if (previous) {
      if (origin === null || previous.has(null) || previous.has(origin)) throw Error(duplicateMessage);
      previous.add(origin);
    } else this.origins.set(id, new Set([origin]));
  }
}
