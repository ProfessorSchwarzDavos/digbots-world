import type { AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { rebaseAsteroidEntities, type AsteroidAttachedEntities } from "./asteroid-attachment-entities";
import { captureAsteroidEntityUnit, type AsteroidDropOrigins } from "./asteroid-attachment-entity-capture";
import { asteroidEntityRelationshipPartition, type AsteroidRelationshipContext } from "./asteroid-attachment-relationships";
import { asteroidAttachmentVolumeSide, asteroidCreatureFootprintSide } from "./asteroid-attachment-creature-footprint";
import { asteroidSailboatFootprintSide } from "./asteroid-attachment-vehicle-footprint";
import { asteroidAttachedDropIndices, captureAsteroidDrops, projectAsteroidDrops } from "./asteroid-attachment-drops";
import { canonicalJson } from "./universe-json";
import { mergeSelectedAttachmentRecords } from "./attachment-array-merge";

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
