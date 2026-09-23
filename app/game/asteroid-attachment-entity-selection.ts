import type { AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { rebaseAsteroidEntities, type AsteroidAttachedEntities } from "./asteroid-attachment-entities";
import { captureAsteroidEntityUnit, type AsteroidDropOrigins } from "./asteroid-attachment-entity-capture";
import { asteroidEntityRelationshipPartition, type AsteroidRelationshipContext } from "./asteroid-attachment-relationships";
import { asteroidAttachmentVolumeSide, asteroidCreatureFootprintSide } from "./asteroid-attachment-creature-footprint";
import { asteroidSailboatFootprintSide } from "./asteroid-attachment-vehicle-footprint";
import { asteroidAttachedDropIndices, captureAsteroidDrops, projectAsteroidDrops } from "./asteroid-attachment-drops";
import { canonicalJson } from "./universe-json";
import { mergeSelectedAttachmentRecords } from "./attachment-array-merge";
import { readCreatureOrigins } from "./creature-origins";
import type { SavedCreature } from "./engine";

/** Only identity and partition-relevant claims belong in this comparison.
 * Ordinary current pose, health, age and care can legitimately outpace a save;
 * a saved social, authored, owner or provenance link cannot be hidden by the
 * active-array override just because its numeric body ID still exists. */
function creatureRelationshipIdentity(creature: SavedCreature): string {
  const owned = (state: { tamed?: boolean; ownerId?: string | null } | null | undefined) => state
    ? { tamed: state.tamed === true, ownerId: state.ownerId ?? null } : null;
  return canonicalJson({ kind: creature.kind, specimenId: creature.specimenId,
    origins: readCreatureOrigins(creature), socialGroupId: creature.socialGroupId,
    poiMarkerId: creature.poiMarkerId, legendaryEncounterId: creature.legendaryEncounterId,
    legendarySiteId: creature.legendarySiteId, primeAnchorId: creature.primeAnchorId,
    groundedSummonLineageId: creature.groundedSummonLineageId,
    groundedSummonEntityId: creature.groundedSummonEntityId,
    settlementId: creature.settlementId ?? null, residentId: creature.residentId ?? null,
    apiaryBee: creature.apiaryBee ?? null, attunedOrbId: creature.attunedOrbId ?? null,
    dragon: creature.dragonState ? { ...owned(creature.dragonState), command: creature.dragonState.command ?? null,
      home: creature.dragonState.home ?? null, onShoulder: creature.dragonState.onShoulder === true } : null,
    pet: creature.petState ? { ...owned(creature.petState), command: creature.petState.command ?? null } : null,
    shade: owned(creature.shadeState), reedstrider: owned(creature.reedstriderBond),
    courser: owned(creature.courserBond), leviathan: owned(creature.leviathanGrowth),
    hiredByPlayerId: creature.hiredByPlayerId ?? null,
    followCommand: creature.followCommand === "hold" ? "hold" : "follow",
    creatureTamed: creature.creatureTamed === true, creatureOwnerId: creature.creatureOwnerId ?? null });
}

/** Global custody deliberately substitutes the active location's live arrays.
 * Inspect raw persisted identities and relationship claims before using that
 * projection: a saved body, boat, lead or drop cannot disappear merely because
 * its live counterpart is absent or changed. This is a refusal check, not
 * reconciliation or authority to copy persisted records. */
export function assertNoPersistedOnlyCurrentEntityAnchors(fields: Readonly<Record<string, unknown>>,
  active: AsteroidAttachedEntities): void {
  const rows = (name: string): readonly unknown[] => {
    const value = fields[name];
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw Error(`Invalid persisted current ${name} source.`);
    return value;
  };
  const creaturesById = new Map([...active.creatures, ...active.sleepingCreatures].map(value => [value.id, value]));
  const savedCreatureIds = new Set<number>();
  for (const value of [...rows("creatures"), ...rows("sleepingCreatures")]) {
    const id = value && typeof value === "object" && !Array.isArray(value) ? (value as { id?: unknown }).id : undefined;
    if (!Number.isSafeInteger(id) || !creaturesById.has(id as number) || savedCreatureIds.has(id as number))
      throw Error("Unresolved persisted-only current creature relationship.");
    savedCreatureIds.add(id as number);
    if (creatureRelationshipIdentity(value as SavedCreature) !== creatureRelationshipIdentity(creaturesById.get(id as number)!))
      throw Error("Unresolved persisted current creature relationship or provenance.");
  }
  const boatsById = new Map(active.boats.map(value => [value.id, value]));
  const savedBoatIds = new Set<string>();
  for (const value of rows("boats")) {
    if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== "string"
      || !value[1] || typeof value[1] !== "object" || Array.isArray(value[1])
      || (value[1] as { id?: unknown }).id !== value[0] || !boatsById.has(value[0]) || savedBoatIds.has(value[0]))
      throw Error("Unresolved persisted-only current boat relationship.");
    savedBoatIds.add(value[0]);
    const savedPassengers = (value[1] as { passengers?: unknown }).passengers;
    if (!Array.isArray(savedPassengers) || canonicalJson(savedPassengers) !== canonicalJson(boatsById.get(value[0])!.passengers))
      throw Error("Unresolved persisted current boat passenger relationship.");
  }
  const leadsById = new Map(active.leads.map(value => [value.mobId, value]));
  const savedLeadIds = new Set<number>();
  for (const value of rows("leads")) {
    const id = value && typeof value === "object" && !Array.isArray(value) ? (value as { mobId?: unknown }).mobId : undefined;
    if (!Number.isSafeInteger(id) || !leadsById.has(id as number) || savedLeadIds.has(id as number))
      throw Error("Unresolved persisted-only current lead relationship.");
    savedLeadIds.add(id as number);
    const saved = value as { ownerId?: unknown; fence?: unknown; maximumLength?: unknown };
    const live = leadsById.get(id as number)!;
    if (canonicalJson({ ownerId: saved.ownerId, fence: saved.fence, maximumLength: saved.maximumLength })
      !== canonicalJson({ ownerId: live.ownerId, fence: live.fence, maximumLength: live.maximumLength }))
      throw Error("Unresolved persisted current lead anchor relationship.");
  }
  // Saved drops have no durable per-drop identity. Even an apparently matching
  // multiset could silently substitute an identical new drop for an old one.
  // Require exact current array correspondence until an atomic capture supplies
  // explicit host-owned lineage; never infer it from item/position similarity.
  const persistedDrops = rows("drops");
  if (persistedDrops.length && canonicalJson(persistedDrops) !== canonicalJson(active.drops))
    throw Error("Unresolved persisted current drop lineage.");
}

export type AsteroidEntityProjection = Readonly<{
  entities: AsteroidAttachedEntities;
  actorIds: readonly string[];
  dropSourceIndices: readonly number[];
  /** Ephemeral preimage binding, not persisted identity or an authority grant. */
  relationshipBaseline: string;
}>;
const actorIds = (frame: AsteroidAttachmentFrame, context: AsteroidRelationshipContext) => context.actors
  .filter(actor => asteroidAttachmentVolumeSide(frame, actor.bounds, "orbit")).map(actor => actor.id).sort();

/** Project one whole spatial/relationship selection from COMPLETE canonical
 * orbit arrays. Required actor/dependency contexts must come from the host's
 * canonical owners; this pure selector does not authenticate their assertions. */
export function projectAsteroidEntityCollection(frame: AsteroidAttachmentFrame, canonical: AsteroidAttachedEntities,
  context: AsteroidRelationshipContext): AsteroidEntityProjection {
  canonicalJson(canonical);
  const selected = asteroidEntityRelationshipPartition(frame, canonical, "orbit", context);
  const creatures = new Set(selected.creatureIds), boats = new Set(selected.boatIds), leads = new Set(selected.leadMobIds);
  const moving = actorIds(frame, context), drops = projectAsteroidDrops(frame, canonical.drops);
  const unit: AsteroidAttachedEntities = { creatures: canonical.creatures.filter(value => creatures.has(value.id)),
    sleepingCreatures: canonical.sleepingCreatures.filter(value => creatures.has(value.id)),
    boats: canonical.boats.filter(value => boats.has(value.id)), leads: canonical.leads.filter(value => leads.has(value.mobId)),
    drops: drops.sourceIndices.map(index => canonical.drops[index]) };
  return { entities: rebaseAsteroidEntities(frame, unit, "orbit", moving, context.localActorId), actorIds: moving,
    dropSourceIndices: drops.sourceIndices, relationshipBaseline: canonicalJson(context) };
}

/** Exact full-array capture, not a durable write. Before/after contexts are
 * host-owned canonical orbit-coordinate snapshots, including all OUTSIDE
 * actors/dependencies. Caller binds the preimage owner revision, authentic drop
 * lineage, consent and finite-resource events in the same atomic transaction.
 * Live/sleep changes and new/removal records are not independent authority. */
export function captureAsteroidEntityCollection(frame: AsteroidAttachmentFrame, canonical: AsteroidAttachedEntities,
  baseline: AsteroidEntityProjection, edited: AsteroidAttachedEntities,
  contexts: Readonly<{ before: AsteroidRelationshipContext; after: AsteroidRelationshipContext }>,
  dropOrigins: AsteroidDropOrigins): AsteroidAttachedEntities {
  const expected = projectAsteroidEntityCollection(frame, canonical, contexts.before);
  if (canonicalJson(expected) !== canonicalJson(baseline)) throw Error("Stale asteroid entity collection projection.");
  if (contexts.before.localActorId !== contexts.after.localActorId) throw Error("Attachment local actor identity changed.");
  for (const creature of [...edited.creatures, ...edited.sleepingCreatures])
    if (!asteroidCreatureFootprintSide(frame, creature, "local")) throw Error("Edited creature is outside the attached frame.");
  for (const boat of edited.boats)
    if (!asteroidSailboatFootprintSide(frame, boat, "local")) throw Error("Edited boat is outside the attached frame.");
  if (asteroidAttachedDropIndices(frame, edited.drops, "local").length !== edited.drops.length)
    throw Error("Edited drop is outside the attached frame.");
  const selected = asteroidEntityRelationshipPartition(frame, canonical, "orbit", contexts.before);
  const creatures = new Set(selected.creatureIds), boats = new Set(selected.boatIds), leads = new Set(selected.leadMobIds);
  const original: AsteroidAttachedEntities = { creatures: canonical.creatures.filter(value => creatures.has(value.id)),
    sleepingCreatures: canonical.sleepingCreatures.filter(value => creatures.has(value.id)),
    boats: canonical.boats.filter(value => boats.has(value.id)), leads: canonical.leads.filter(value => leads.has(value.mobId)),
    drops: expected.dropSourceIndices.map(index => canonical.drops[index]) };
  const moving = [...new Set([...expected.actorIds, ...actorIds(frame, contexts.after)])];
  const captured = captureAsteroidEntityUnit(frame, original, expected.entities, edited, moving, dropOrigins, contexts.before.localActorId);
  const output: AsteroidAttachedEntities = {
    creatures: mergeSelectedAttachmentRecords(canonical.creatures, captured.creatures, creatures, value => value.id),
    sleepingCreatures: mergeSelectedAttachmentRecords(canonical.sleepingCreatures, captured.sleepingCreatures, creatures, value => value.id),
    boats: mergeSelectedAttachmentRecords(canonical.boats, captured.boats, boats, value => value.id),
    leads: mergeSelectedAttachmentRecords(canonical.leads, captured.leads, leads, value => value.mobId),
    drops: captureAsteroidDrops(frame, canonical.drops, { drops: expected.entities.drops, sourceIndices: expected.dropSourceIndices }, edited.drops, dropOrigins),
  };
  // Full global validation catches new/outside ID collisions, split social units,
  // changed passenger/follower/lead links and unresolved outside dependencies.
  asteroidEntityRelationshipPartition(frame, output, "orbit", contexts.after);
  return output;
}
