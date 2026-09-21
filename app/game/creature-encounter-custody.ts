import type { SavedCreature } from "./engine";
import type { CreatureMetadata } from "./creature-cage";
import type { CaptureOrb } from "./capture-orbs";
import { indexCreatureCustody, type CreatureCustodyBody, type CreatureCustodyPath, type CreatureCustodySources } from "./creature-custody-index";
import { normalizePrimeEncounterStates, transferPrimeEncounterCustody, type PrimeEncounterState } from "./creature-rarity";
import { LEGENDARY_ENCOUNTERS, normalizeLegendaryEncounterState, transferLegendaryCustody, type LegendaryEncounterState } from "./legendary-encounters";
import { custodyJsonIdentity } from "./wayworks-custody";
import { assertExactKeys, canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

export type CreatureEncounterSources = Readonly<{
  primeEncounters: Readonly<Record<string, PrimeEncounterState>>;
  legendaryEncounters: Readonly<Record<string, LegendaryEncounterState>>;
}>;
export type CreatureEncounterOwner = Readonly<{
  specimenId: string | null;
  kind: SavedCreature["kind"];
  path: CreatureCustodyPath | null;
  body: Readonly<{ collection: CreatureCustodyBody["collection"]; id: number }> | null;
}>;
type References = Readonly<{ prime: string | null; legendary: Readonly<{ encounterId: string; siteId: string }> | null }>;
type Unit = Readonly<{ owner: CreatureEncounterOwner; references: References; custodyId: string | null }>;

function identifier(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value || value.trim() !== value) throw Error("Invalid creature encounter identity.");
}
function plainTable(value: unknown): asserts value is Record<string, unknown> {
  if (!isUniverseRecord(value) || Reflect.ownKeys(value).some(key => typeof key !== "string"
    || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, "value")))
    throw Error("Invalid canonical creature encounter table.");
}
function references(value: Pick<SavedCreature, "primeAnchorId" | "legendaryEncounterId" | "legendarySiteId"> | CreatureMetadata["custom"]): References {
  let prime: string | null = null;
  if (Object.hasOwn(value, "primeAnchorId")) { const id = value.primeAnchorId; identifier(id); prime = id; }
  const hasLegendary = Object.hasOwn(value, "legendaryEncounterId") || Object.hasOwn(value, "legendarySiteId");
  if (!hasLegendary) return { prime, legendary: null };
  identifier(value.legendaryEncounterId); identifier(value.legendarySiteId);
  return { prime, legendary: { encounterId: value.legendaryEncounterId, siteId: value.legendarySiteId } };
}

/** Exact inspection only. Normalizers are equality validators, never replacement
 * values. Missing optional first-draft Prime fields remain missing; unsupported
 * or lossy state needs an explicit migration before attachment admission. */
export function validateCreatureEncounterSources(sources: CreatureEncounterSources): void {
  plainTable(sources);
  assertExactKeys(sources, ["primeEncounters", "legendaryEncounters"], "Creature encounter sources");
  plainTable(sources.primeEncounters); plainTable(sources.legendaryEncounters);
  for (const state of [...Object.values(sources.primeEncounters), ...Object.values(sources.legendaryEncounters)]) custodyJsonIdentity(state);
  if (canonicalJson(Object.fromEntries(normalizePrimeEncounterStates(sources.primeEncounters))) !== canonicalJson(sources.primeEncounters))
    throw Error("Prime encounter history requires lossy normalization.");
  for (const [siteId, state] of Object.entries(sources.legendaryEncounters)) {
    identifier(siteId);
    if (!isUniverseRecord(state) || !Object.hasOwn(LEGENDARY_ENCOUNTERS, state.encounterId)
      || canonicalJson(normalizeLegendaryEncounterState(state, state.encounterId, siteId)) !== canonicalJson(state))
      throw Error("Legendary encounter history requires lossy normalization.");
    if ((state.status === "resolved") !== (state.outcome !== null)
      || (state.outcome === "capture") !== (state.custodyEntityId !== null))
      throw Error("Inconsistent legendary encounter resolution custody.");
  }
}

/** Bind current creature ownership to canonical encounter history. Historical
 * anchor/site IDs are NOT physical positions or attachment membership. A stored
 * orb plus its deployed body is one unit. Callers must still prove all source
 * owners, physical site/environment closure, source revisions and atomic rights.
 * This does not migrate history, resolve an encounter, grant rewards or travel. */
export function reconcileCreatureEncounterCustody(custody: CreatureCustodySources, sources: CreatureEncounterSources) {
  validateCreatureEncounterSources(sources);
  const index = indexCreatureCustody(custody), units: Unit[] = [];
  const bodyOwner = (body: CreatureCustodyBody) => ({ collection: body.collection, id: body.creature.id });
  for (const stored of index.stored) {
    const { creature } = stored.custody, refs = references(creature.custom);
    if (stored.body && canonicalJson(references(stored.body.creature)) !== canonicalJson(refs))
      throw Error("Deployed creature encounter links differ from its stored identity.");
    units.push({ owner: { specimenId: creature.entityId, kind: creature.kind, path: stored.path,
      body: stored.body ? bodyOwner(stored.body) : null }, references: refs,
      custodyId: stored.custody.format === "lantern-jar" ? `jar:${stored.custody.containerId}` : `orb:${stored.custody.containerId}` });
  }
  for (const resident of index.residents) {
    const prefix = resident.path[0] === "aquariums" ? "aquarium" : resident.path[0] === "fieldPerches" ? "perch" : null;
    units.push({ owner: { specimenId: resident.creature.entityId, kind: resident.creature.kind, path: resident.path, body: null },
      references: references(resident.creature.custom), custodyId: prefix ? `${prefix}:${resident.creature.entityId}` : null });
  }
  for (const body of index.freeBodies) units.push({ owner: { specimenId: body.creature.specimenId ?? null, kind: body.creature.kind,
    path: null, body: bodyOwner(body) }, references: references(body.creature), custodyId: null });
  const primes = new Map<string, Unit>(), legendaries = new Map<string, Unit>();
  for (const unit of units) {
    if (unit.references.prime !== null) {
      const id = unit.references.prime;
      if (primes.has(id) || !Object.hasOwn(sources.primeEncounters, id)) throw Error("Duplicate or unresolved Prime owner.");
      primes.set(id, unit);
    }
    if (unit.references.legendary !== null) {
      const { siteId, encounterId } = unit.references.legendary;
      if (legendaries.has(siteId) || !Object.hasOwn(sources.legendaryEncounters, siteId)
        || sources.legendaryEncounters[siteId].encounterId !== encounterId) throw Error("Duplicate or unresolved legendary owner.");
      legendaries.set(siteId, unit);
    }
  }
  const primeOwners: { anchorId: string; owner: CreatureEncounterOwner | null }[] = [];
  for (const [anchorId, state] of Object.entries(sources.primeEncounters).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const unit = primes.get(anchorId), owner = unit?.owner ?? null;
    if (state.status === "defeated") {
      if (owner || state.entityId !== null || state.custodyId != null) throw Error("Defeated Prime still has living custody.");
    } else {
      if (!unit || !owner || owner.kind !== state.kind || state.specimenId !== undefined && state.specimenId !== owner.specimenId
        || state.entityId !== (owner.body?.id ?? null)) throw Error("Prime history does not match its current body/specimen.");
      if (state.status === "captured") {
        if (!state.specimenId || !state.custodyId || state.custodyId !== unit.custodyId || owner.path === null)
          throw Error("Captured Prime has no exact current container owner.");
      } else if (owner.path !== null || owner.body === null || state.custodyId != null)
        throw Error("Free Prime has an incompatible stored owner.");
    }
    primeOwners.push({ anchorId, owner });
  }
  const legendaryOwners: { siteId: string; owner: CreatureEncounterOwner | null }[] = [];
  for (const [siteId, state] of Object.entries(sources.legendaryEncounters).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const unit = legendaries.get(siteId), owner = unit?.owner ?? null;
    if (owner && owner.kind !== LEGENDARY_ENCOUNTERS[state.encounterId].kind) throw Error("Legendary owner has the wrong authored species.");
    if (state.outcome === "capture") {
      // Deployment moves legendary custody to the current body. Prime custody
      // above deliberately remains orb-owned: these are distinct live rules.
      const current = owner?.body ? `creature:${owner.body.id}` : unit?.custodyId;
      if (!owner || current !== state.custodyEntityId || !owner.body && !current?.startsWith("orb:"))
        throw Error("Captured legendary has no exact current body/orb owner.");
    } else if (owner && (owner.path !== null || state.status === "dormant" || state.outcome === "defeat" || state.outcome === "release"))
      throw Error("Legendary history is incompatible with its current owner.");
    // Dormant sites and completed release/defeat histories have no live owner;
    // active/covenant sites may be unmaterialized. Generated-site closure is a
    // separate selector, never manufactured from this history record.
    legendaryOwners.push({ siteId, owner });
  }
  return freezeUniverseJson(cloneUniverseJson({ custodyBaseline: index.sourceBaseline,
    sourceBaseline: canonicalJson(sources), history: sources, primeOwners, legendaryOwners }));
}

/** Preflight the existing live recall transition, before any owner is written.
 * Only these exact current encounter references may change; no resolution,
 * objective, reward, site history or specimen identity is newly created. */
export function planCreatureEncounterRecall(body: Readonly<{
  id: number; specimenId: string; kind: SavedCreature["kind"];
  primeAnchorId: string | null; legendaryEncounterId: string | null; legendarySiteId: string | null;
}>, orb: CaptureOrb, current: Readonly<{ prime: PrimeEncounterState | null; legendary: LegendaryEncounterState | null }>, now: number) {
  if (!Number.isSafeInteger(body.id) || body.id < 0 || !Number.isFinite(now) || now < 0
    || orb.attunement?.activeEntityId !== String(body.id) || orb.creature?.entityId !== body.specimenId || orb.creature.kind !== body.kind)
    throw Error("Recall does not match the current creature identity.");
  const bodyReferences = references({ ...(body.primeAnchorId !== null ? { primeAnchorId: body.primeAnchorId } : {}),
    ...(body.legendaryEncounterId !== null ? { legendaryEncounterId: body.legendaryEncounterId } : {}),
    ...(body.legendarySiteId !== null ? { legendarySiteId: body.legendarySiteId } : {}) });
  if (canonicalJson(bodyReferences) !== canonicalJson(references(orb.creature.custom)))
    throw Error("Recall encounter references differ from the stored identity.");
  if ((body.primeAnchorId !== null) !== (current.prime !== null)
    || (bodyReferences.legendary !== null) !== (current.legendary !== null)) throw Error("Recall encounter history is missing or unrelated.");
  validateCreatureEncounterSources({ primeEncounters: current.prime ? { [current.prime.anchorId]: current.prime } : {},
    legendaryEncounters: current.legendary ? { [current.legendary.siteId]: current.legendary } : {} });
  const custodyId = `orb:${orb.orbId}`;
  let prime = current.prime, legendary = current.legendary;
  if (prime) {
    if (prime.anchorId !== body.primeAnchorId || prime.status !== "captured" || prime.kind !== body.kind
      || prime.specimenId !== body.specimenId || prime.custodyId !== custodyId || prime.entityId !== body.id)
      throw Error("Recall cannot replace another Prime custody reference.");
    prime = transferPrimeEncounterCustody(prime, "captured", body.specimenId, custodyId, null, now);
  }
  if (legendary) {
    if (legendary.siteId !== body.legendarySiteId || legendary.encounterId !== body.legendaryEncounterId
      || LEGENDARY_ENCOUNTERS[legendary.encounterId].kind !== body.kind || legendary.outcome !== "capture"
      || legendary.custodyEntityId !== `creature:${body.id}` || !Number.isSafeInteger(legendary.revision + 1))
      throw Error("Recall cannot replace another legendary custody reference.");
    legendary = transferLegendaryCustody(legendary, `creature:${body.id}`, custodyId);
  }
  return { prime, legendary };
}
