import type { SavedCreature } from "./engine";
import { readAsteroidAttachmentCatalog, hydrateAsteroidAttachmentLocation } from "./asteroid-attachment-catalog";
import { asteroidEntityCompoundId } from "./asteroid-attachment-relationships";
import { validateAsteroidFields } from "./asteroid-runtime";
import { parseLocationId, universeId, type LocationId } from "./location-address";
import { createSummonContractState, manifestSummon, normalizeSummonContractState,
  SUMMON_CONTRACTS, type SummonContractState } from "./summon-contracts";
import type { SummonedCreatureKind } from "./mobs";
import type { UniverseSnapshot } from "./universe-storage";
import { assertExactKeys, canonicalJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

function contract(value: unknown, label: string): SummonContractState {
  if (!isUniverseRecord(value)) throw Error(`Invalid ${label} summon contract.`);
  assertExactKeys(value, ["schema", "ownerId", "records", "revision"], `${label} summon contract`);
  if (value.schema !== 1 || typeof value.ownerId !== "string" || !value.ownerId || value.ownerId.trim() !== value.ownerId
    || !isUniverseRecord(value.records)) throw Error(`Invalid ${label} summon contract.`);
  const normalized = normalizeSummonContractState(value, value.ownerId);
  if (canonicalJson(normalized) !== canonicalJson(value)) throw Error(`${label} summon contract requires lossy normalization.`);
  for (const [kind, raw] of Object.entries(value.records)) {
    if (!Object.hasOwn(SUMMON_CONTRACTS, kind) || !isUniverseRecord(raw)) throw Error(`Invalid ${label} summon kind.`);
    const expected = manifestSummon(createSummonContractState(value.ownerId), kind as SummonedCreatureKind, 0)
      .state.records[kind as SummonedCreatureKind]!;
    if (raw.lineageId !== expected.lineageId || raw.phenotypeSeed !== expected.phenotypeSeed
      || raw.groundedEntityId !== null && (!raw.groundedEntityId || !Array.isArray(raw.groundingHistory)
        || raw.groundingHistory.length === 0)) throw Error(`Invalid ${label} summon lineage.`);
  }
  return value as SummonContractState;
}

function bodyCollection(value: unknown, lineages: ReadonlySet<string>, entities: ReadonlySet<string>): SavedCreature[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(body => !isUniverseRecord(body)))
    throw Error("Invalid saved grounded summon creature collection.");
  return (value as SavedCreature[]).filter(body =>
    (typeof body.groundedSummonLineageId === "string" && lineages.has(body.groundedSummonLineageId))
    || (typeof body.groundedSummonEntityId === "string" && entities.has(body.groundedSummonEntityId)));
}

/** A player-owned contract is shared historical provenance. It cannot be
 * assigned the body's current asteroid side. The current live contract may
 * advance beyond its persisted preimage, but an existing grounded reference
 * cannot silently disappear or change identity across that boundary. */
export function selectUniverseSummonHistory(snapshot: UniverseSnapshot, live: Readonly<{
  locationId: LocationId; playerId: string; summonContracts: SummonContractState;
}>, currentCreatures: readonly SavedCreature[]) {
  const current = currentCreatures.filter(body => body.groundedSummonLineageId !== undefined
    || body.groundedSummonEntityId !== undefined);
  if (!current.length) return freezeUniverseJson({ dependencies: [], origins: [] });
  const manifest = snapshot.manifest, universe = universeId(manifest.universeId);
  if (manifest.id !== universe || manifest.deletedAt !== null || manifest.currentLocationId !== live.locationId
    || manifest.currentPlayerId !== live.playerId || parseLocationId(live.locationId).universeId !== universe)
    throw Error("Summon history differs from the current repository owner.");
  const liveState = contract(live.summonContracts, "live");
  const lineages = new Set<string>(), entities = new Set<string>();
  for (const body of current) {
    if (typeof body.groundedSummonLineageId !== "string" || !body.groundedSummonLineageId
      || typeof body.groundedSummonEntityId !== "string" || !body.groundedSummonEntityId
      || !Object.hasOwn(SUMMON_CONTRACTS, body.kind)) throw Error("Unresolved grounded summon body identity.");
    lineages.add(body.groundedSummonLineageId);
    if (entities.has(body.groundedSummonEntityId)) throw Error("Duplicate grounded summon entity identity.");
    entities.add(body.groundedSummonEntityId);
  }
  const fields = validateAsteroidFields(snapshot.universe.fields.asteroidFields, universe);
  const catalog = readAsteroidAttachmentCatalog(snapshot.universe.attachmentOwners, fields, universe);
  const playerIds = new Set<string>();
  const owners = new Map<string, { playerId: string; kind: SummonedCreatureKind; state: SummonContractState }>();
  let currentPlayerFound = false;
  for (const row of snapshot.players) {
    if (playerIds.has(row.playerId) || parseLocationId(row.locationId).universeId !== universe)
      throw Error("Duplicate or foreign summon player contract.");
    playerIds.add(row.playerId);
    const isCurrent = row.playerId === live.playerId;
    if (isCurrent && row.locationId !== live.locationId) throw Error("Summon current player owner differs from repository.");
    currentPlayerFound ||= isCurrent;
    const saved = row.fields.summonContracts === undefined ? undefined : contract(row.fields.summonContracts, "saved");
    const state = isCurrent ? liveState : saved;
    if (!state) continue;
    for (const [key, record] of Object.entries(state.records)) {
      const kind = key as SummonedCreatureKind;
      if (record && record.groundedEntityId && entities.has(record.groundedEntityId)
        && !lineages.has(record.lineageId)) throw Error("Ambiguous grounded summon entity identity across player contracts.");
      if (!record || !lineages.has(record.lineageId)) continue;
      const prior = saved?.records[kind];
      if (isCurrent && prior && (prior.lineageId !== record.lineageId
        || prior.groundedEntityId !== null && prior.groundedEntityId !== record.groundedEntityId))
        throw Error("Saved summon grounding provenance differs from live player history.");
      if (owners.has(record.lineageId)) throw Error("Ambiguous summon history across player contracts.");
      owners.set(record.lineageId, { playerId: row.playerId, kind, state });
    }
    if (isCurrent && saved) for (const [kind, prior] of Object.entries(saved.records)) {
      if (prior && lineages.has(prior.lineageId) && !state.records[kind as SummonedCreatureKind])
        throw Error("Saved summon grounding provenance differs from live player history.");
    }
  }
  if (!currentPlayerFound || owners.size !== lineages.size)
    throw Error("Unresolved source-qualified summon history.");
  const bodies = [...current], seenLocations = new Set<string>();
  for (const row of snapshot.locations) {
    const locationId = row.descriptor.id;
    if (parseLocationId(locationId).universeId !== universe || row.descriptor.universeId !== universe
      || seenLocations.has(locationId)) throw Error("Duplicate or foreign summon location.");
    seenLocations.add(locationId);
    const hydrated = hydrateAsteroidAttachmentLocation(catalog, fields, locationId, row.fields);
    if (locationId !== live.locationId)
      bodies.push(...bodyCollection(hydrated.creatures, lineages, entities),
        ...bodyCollection(hydrated.sleepingCreatures, lineages, entities));
  }
  if (!seenLocations.has(live.locationId)) throw Error("Summon history lacks current location.");
  for (const body of bodies) if (entities.has(body.groundedSummonEntityId ?? "")
    && !lineages.has(body.groundedSummonLineageId ?? ""))
    throw Error("Conflicting grounded summon entity lineage across locations.");
  const dependencies = [...lineages].map(lineageId => {
    const owner = owners.get(lineageId)!, record = owner.state.records[owner.kind]!;
    const related = bodies.filter(body => body.groundedSummonLineageId === lineageId);
    if (related.length !== 1) throw Error("Duplicate grounded summon lineage across locations.");
    if (record.groundedEntityId === null || related[0].groundedSummonEntityId !== record.groundedEntityId
      || related[0].kind !== owner.kind) throw Error("Unresolved grounded summon contract/body relationship.");
    return { kind: "summon" as const, id: asteroidEntityCompoundId(lineageId, record.groundedEntityId), attached: null };
  });
  return freezeUniverseJson({ dependencies, origins: [...owners].map(([lineageId, owner]) => ({ lineageId, playerId: owner.playerId })) });
}
