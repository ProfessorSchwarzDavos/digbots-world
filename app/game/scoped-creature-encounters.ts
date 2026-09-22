import { encodeAttachmentSource } from "./attachment-source-preimage";
import { creatureCustodyPathKey, type CreatureCustodyPath } from "./creature-custody-index";
import { assertLegendaryCreatureEncounterOwner, assertPrimeCreatureEncounterOwner, readCreatureEncounterReferences,
  validateCreatureEncounterSources, type CreatureEncounterOwner, type CreatureEncounterSources, type CreatureEncounterUnit } from "./creature-encounter-custody";
import { readCreatureMetadataOrigins, readCreatureOrigins, type CreatureOrigins } from "./creature-origins";
import { parseLocationId, universeId, type LocationId, type UniverseId } from "./location-address";
import { indexScopedCreatureCustody, type ScopedCreatureCustodyBody, type ScopedCreatureCustodySources } from "./scoped-creature-custody-index";
import { canonicalJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

export type ScopedCreatureEncounterHistory = Readonly<{ locationId: LocationId; sources: CreatureEncounterSources }>;
export type CreatureResidentFamily = Readonly<{ path: CreatureCustodyPath; family: "aquariums" | "fieldPerches" }>;
export type ScopedCreatureEncounterOwner = Omit<CreatureEncounterOwner, "body"> & Readonly<{
  body: Readonly<{ collection: ScopedCreatureCustodyBody["collection"]; locationId: LocationId; id: number }> | null;
  holderLocationId: LocationId | null;
  specimenOriginLocationId: LocationId | null;
  encounterOriginLocationId: LocationId | null;
}>;
type Unit = Omit<CreatureEncounterUnit, "owner"> & Readonly<{ owner: ScopedCreatureEncounterOwner }>;

function exactKeys(value: unknown, keys: readonly string[]) {
  if (!isUniverseRecord(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key)))
    throw Error("Invalid scoped encounter source fields.");
}
const sorted = <T>(table: Readonly<Record<string, T>>) => Object.entries(table).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
const originFields = (origins: CreatureOrigins) => ({ specimenOriginLocationId: origins.specimenOriginLocationId ?? null,
  encounterOriginLocationId: origins.encounterOriginLocationId ?? null });

/** Reconcile all supplied location-owned histories against all supplied custody
 * units BEFORE selecting a physical subset. The universe collector supplies the
 * actual complete owner set and explicit resident families; prefixed paths are
 * not parsed heuristically. A unique legacy association never invents provenance.
 * No history, reward, clock, origin, specimen, vessel or travel state is written. */
export function reconcileScopedCreatureEncounterCustody(custody: ScopedCreatureCustodySources,
  history: readonly ScopedCreatureEncounterHistory[], residentFamilies: readonly CreatureResidentFamily[], expectedUniverseId: UniverseId) {
  const source = encodeAttachmentSource({ custody, history, residentFamilies, expectedUniverseId });
  universeId(expectedUniverseId);
  if (!Array.isArray(history) || !Array.isArray(residentFamilies)) throw Error("Invalid scoped encounter source collections.");
  const histories = new Map<LocationId, CreatureEncounterSources>();
  for (const row of history) {
    exactKeys(row, ["locationId", "sources"]);
    if (parseLocationId(row.locationId).universeId !== expectedUniverseId || histories.has(row.locationId))
      throw Error("Duplicate or foreign encounter history location.");
    validateCreatureEncounterSources(row.sources); histories.set(row.locationId, row.sources);
  }
  const index = indexScopedCreatureCustody(custody, expectedUniverseId), families = new Map<string, CreatureResidentFamily["family"]>();
  for (const row of residentFamilies) {
    exactKeys(row, ["path", "family"]);
    const path = creatureCustodyPathKey(row.path);
    if (!["aquariums", "fieldPerches"].includes(row.family) || families.has(path)) throw Error("Invalid or duplicate resident family provenance.");
    families.set(path, row.family);
  }
  if (families.size !== index.residents.length) throw Error("Resident family provenance does not match actual custody.");
  const bodyOwner = (body: ScopedCreatureCustodyBody) => ({ collection: body.collection, locationId: body.locationId, id: body.creature.id });
  const units: Unit[] = [];
  for (const stored of index.stored) {
    const creature = stored.custody.creature, references = readCreatureEncounterReferences(creature.custom);
    if (stored.body && canonicalJson(readCreatureEncounterReferences(stored.body.creature)) !== canonicalJson(references))
      throw Error("Deployed creature encounter links differ from its stored identity.");
    units.push({ owner: { specimenId: creature.entityId, kind: creature.kind, path: stored.path,
      body: stored.body ? bodyOwner(stored.body) : null, holderLocationId: stored.locationId,
      ...originFields(readCreatureMetadataOrigins(creature.custom)) }, references,
    custodyId: `${stored.custody.format === "lantern-jar" ? "jar" : "orb"}:${stored.custody.containerId}` });
  }
  for (const resident of index.residents) {
    const family = families.get(creatureCustodyPathKey(resident.path));
    if (!family) throw Error("Missing actual resident family provenance.");
    units.push({ owner: { specimenId: resident.creature.entityId, kind: resident.creature.kind, path: resident.path, body: null,
      holderLocationId: resident.locationId, ...originFields(readCreatureMetadataOrigins(resident.creature.custom)) },
    references: readCreatureEncounterReferences(resident.creature.custom),
    custodyId: `${family === "aquariums" ? "aquarium" : "perch"}:${resident.creature.entityId}` });
  }
  for (const body of index.freeBodies) units.push({ owner: { specimenId: body.creature.specimenId ?? null, kind: body.creature.kind,
    path: null, body: bodyOwner(body), holderLocationId: body.locationId, ...originFields(readCreatureOrigins(body.creature)) },
  references: readCreatureEncounterReferences(body.creature), custodyId: null });

  const primes = new Map<string, Unit>(), legendaries = new Map<string, Unit>();
  const compatible = (check: () => void) => { try { check(); return true; } catch { return false; } };
  const bind = (candidates: readonly LocationId[], id: string, unit: Unit, bindings: Map<string, Unit>, label: string) => {
    if (candidates.length !== 1) throw Error(`Ambiguous or unresolved ${label} encounter origin.`);
    const location = candidates[0], key = canonicalJson([location, id]);
    if (bindings.has(key)) throw Error(`Duplicate qualified ${label} encounter owner.`);
    bindings.set(key, unit); return location;
  };
  for (const unit of units) {
    const origin = unit.owner.encounterOriginLocationId, candidates = [...histories].filter(([location]) => origin === null || origin === location);
    let primeLocation: LocationId | null = null;
    if (unit.references.prime !== null) {
      const id = unit.references.prime;
      primeLocation = bind(candidates.filter(([, sources]) => Object.hasOwn(sources.primeEncounters, id)
        && compatible(() => assertPrimeCreatureEncounterOwner(sources.primeEncounters[id], unit))).map(([location]) => location),
      id, unit, primes, "Prime");
    }
    if (unit.references.legendary !== null) {
      const { siteId, encounterId } = unit.references.legendary;
      const location = bind(candidates.filter(([, sources]) => Object.hasOwn(sources.legendaryEncounters, siteId)
        && sources.legendaryEncounters[siteId].encounterId === encounterId
        && compatible(() => assertLegendaryCreatureEncounterOwner(sources.legendaryEncounters[siteId], unit))).map(([location]) => location),
      siteId, unit, legendaries, "legendary");
      if (primeLocation !== null && primeLocation !== location) throw Error("One creature has incompatible encounter origin locations.");
    }
  }
  const primeOwners: { locationId: LocationId; anchorId: string; owner: ScopedCreatureEncounterOwner | null }[] = [];
  const legendaryOwners: { locationId: LocationId; siteId: string; owner: ScopedCreatureEncounterOwner | null }[] = [];
  for (const [locationId, sources] of [...histories].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    for (const [anchorId, state] of sorted(sources.primeEncounters)) {
      const unit = primes.get(canonicalJson([locationId, anchorId])) ?? null;
      assertPrimeCreatureEncounterOwner(state, unit); primeOwners.push({ locationId, anchorId, owner: unit?.owner ?? null });
    }
    for (const [siteId, state] of sorted(sources.legendaryEncounters)) {
      const unit = legendaries.get(canonicalJson([locationId, siteId])) ?? null;
      assertLegendaryCreatureEncounterOwner(state, unit); legendaryOwners.push({ locationId, siteId, owner: unit?.owner ?? null });
    }
  }
  return freezeUniverseJson(structuredClone({ source, custodyBaseline: index.sourceBaseline, history, primeOwners, legendaryOwners }));
}
