import { encodeAttachmentSource } from "./attachment-source-preimage";
import { asteroidEntityCompoundId } from "./asteroid-attachment-relationships";
import { historicalResidentReference } from "./authored-residents";
import { readCreatureOrigins } from "./creature-origins";
import { parseLocationId, type LocationId } from "./location-address";
import { assertExactKeys, freezeUniverseJson, isUniverseRecord } from "./universe-json";
import type { SaveFields } from "./universe-save";

export type AuthoredSiteSources = Readonly<{
  settlements: readonly (readonly [string, unknown])[];
  merchants: readonly (readonly [string, unknown])[];
  /** Raw body fields, before serializeCreature can omit unsupported references. */
  creatures: readonly unknown[];
  sleepingCreatures: readonly unknown[];
}>;
type SiteKind = "poi" | "settlement" | "resident" | "prime" | "legendary" | "dragon-lair";
type SiteReference = Readonly<{ collection: "creatures" | "sleepingCreatures"; bodyId: number;
  kind: SiteKind; id: string; originLocationId: LocationId | null }>;

function identifier(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value || value.trim() !== value) throw Error("Invalid authored-site identity.");
}
function array(value: unknown): asserts value is unknown[] {
  if (!Array.isArray(value) || Object.keys(value).length !== value.length) throw Error("Invalid authored-site source array.");
}
function table(rows: AuthoredSiteSources["settlements"], family: string) {
  array(rows); const seen = new Set<string>();
  return rows.map(row => {
    if (!Array.isArray(row) || row.length !== 2) throw Error("Invalid authored-site owner row.");
    const [id, value] = row; identifier(id);
    if (seen.has(id) || !isUniverseRecord(value) || value.id !== id || value.schema !== 1)
      throw Error(`Duplicate or mismatched authored ${family} owner.`);
    identifier(value.authorityId);
    if (!Number.isSafeInteger(value.revision) || (value.revision as number) < 0) throw Error("Invalid authored-site authority revision.");
    array(value.recentEventIds); value.recentEventIds.forEach(identifier);
    if (new Set(value.recentEventIds).size !== value.recentEventIds.length) throw Error("Duplicate authored-site event receipt.");
    seen.add(id);
    // Retain the WHOLE unknown/additive record. This is an unresolved physical
    // owner census, never a validator that approves its finite/state semantics.
    return { id, state: value, status: "unresolved-physical-owner" as const };
  });
}

/** Observe every saved instantiated site/merchant and every active/sleeping body
 * reference. No loaded marker cache, guessed coordinate, normalization, history
 * replay or positive geometry claim. Even off-frame and bodyless owners remain
 * unresolved until a complete shared generation/ownership producer handles them.
 */
export function observeAsteroidAuthoredSites(locationId: LocationId, input: AuthoredSiteSources) {
  const source = encodeAttachmentSource({ locationId, input }), location = parseLocationId(locationId);
  assertExactKeys(input, ["settlements", "merchants", "creatures", "sleepingCreatures"], "Authored site source");
  const settlements = table(input.settlements, "settlement"), merchants = table(input.merchants, "merchant");
  const references: SiteReference[] = [], bodies = new Set<number>();
  const historicalResidents: { collection: "creatures" | "sleepingCreatures"; bodyId: number;
    reference: ReturnType<typeof historicalResidentReference> }[] = [];
  for (const collection of ["creatures", "sleepingCreatures"] as const) {
    const records = input[collection]; array(records);
    for (const raw of records) {
      if (!isUniverseRecord(raw) || !Number.isSafeInteger(raw.id) || (raw.id as number) < 0 || bodies.has(raw.id as number))
        throw Error("Invalid or duplicate authored-site body source.");
      const bodyId = raw.id as number; bodies.add(bodyId);
      const origins = readCreatureOrigins(raw);
      for (const origin of Object.values(origins)) if (parseLocationId(origin).universeId !== location.universeId)
        throw Error("Authored-site body has foreign universe provenance.");
      const add = (kind: SiteKind, id: unknown, originLocationId: LocationId | null = locationId) => {
        identifier(id); references.push({ collection, bodyId, kind, id, originLocationId });
      };
      // Undefined is normal for optional live MobEntity fields. Its exact own
      // presence remains in source; this does not normalize a save for writing.
      if (raw.poiMarkerId != null) add("poi", raw.poiMarkerId);
      if (raw.settlementId != null) add("settlement", raw.settlementId);
      if (raw.residentId != null && raw.settlementId != null) {
        identifier(raw.residentId); identifier(raw.settlementId);
        add("resident", asteroidEntityCompoundId(raw.settlementId, raw.residentId));
      } else if (raw.residentId != null) {
        identifier(raw.residentId);
        historicalResidents.push({ collection, bodyId, reference: historicalResidentReference(raw.residentId) });
      }
      if (raw.primeAnchorId != null) add("prime", raw.primeAnchorId, origins.encounterOriginLocationId ?? null);
      if (raw.legendaryEncounterId != null || raw.legendarySiteId != null) {
        identifier(raw.legendaryEncounterId); identifier(raw.legendarySiteId);
        add("legendary", asteroidEntityCompoundId(raw.legendaryEncounterId, raw.legendarySiteId), origins.encounterOriginLocationId ?? null);
      }
      if (raw.dragonState != null) {
        if (!isUniverseRecord(raw.dragonState)) throw Error("Invalid authored dragon site source.");
        const home = raw.dragonState.home;
        if (home != null) {
          if (!isUniverseRecord(home)) throw Error("Invalid authored dragon home source.");
          identifier(home.dimension); identifier(home.lairId);
          add("dragon-lair", asteroidEntityCompoundId(home.dimension, home.lairId));
        }
      }
    }
  }
  // The empty result only proves absence from these observed source families;
  // it is NOT full site/admission/relationship clearance.
  return freezeUniverseJson(structuredClone({ source, locationId, settlements, merchants, references, historicalResidents,
    status: settlements.length || merchants.length || references.length ? "unresolved" as const : "no-observed-site-records" as const }));
}

/** Adapt canonical saved field representations without repairing old records.
 * Field absence follows WorldSave's empty optional ledger semantics. Explicit
 * undefined, duplicate IDs, bad map keys or malformed arrays refuse unchanged. */
export function savedAuthoredSiteSources(fields: SaveFields): AuthoredSiteSources {
  encodeAttachmentSource(fields); // Reject accessors before reading any field.
  const value = (key: string, fallback: unknown) => Object.hasOwn(fields, key) ? fields[key] : fallback;
  const settlements = value("settlements", []), merchants = value("merchants", {});
  const creatures = value("creatures", []), sleepingCreatures = value("sleepingCreatures", []);
  array(settlements); array(creatures); array(sleepingCreatures);
  if (!isUniverseRecord(merchants)) throw Error("Invalid saved authored merchant map.");
  return { settlements: settlements.map(state => {
    if (!isUniverseRecord(state)) throw Error("Invalid saved authored settlement.");
    identifier(state.id); return [state.id, state] as const;
  }), merchants: Object.entries(merchants), creatures, sleepingCreatures };
}
