import type { SavedCreature } from "./engine";
import type { CelestialBounds, CelestialPoint } from "./celestial-terrain";
import { MOB_DEFS } from "./mobs";
import { SAILBOAT_CAPACITY } from "./boats";
import { historicalResidentReference, type HistoricalResidentKind } from "./authored-residents";
import { assertCreatureOriginsAgree } from "./creature-origins";
import { creatureSpecimenIdentityKey, CreatureSpecimenIdentitySet } from "./creature-specimen-identity";
import type { LocationId } from "./location-address";
import { assertKnownAsteroidEntityFields, type AsteroidAttachedEntities } from "./asteroid-attachment-entities";
import { asteroidAttachmentVolumeSide, asteroidCreatureFootprintSide } from "./asteroid-attachment-creature-footprint";
import { asteroidSailboatFootprintSide } from "./asteroid-attachment-vehicle-footprint";
import { asteroidAttachmentContainsCell, asteroidAttachmentPhysicalBounds,
  type AsteroidAttachmentFrame, type AsteroidAttachmentView } from "./asteroid-attachment-frame";

export type AsteroidEntityDependencyKind = "poi" | "legendary" | "prime" | "summon" | "settlement" | "resident" | "apiary-bee" | "orb" | "dragon-lair";
/** Ephemeral results from each canonical owner's whole-component selector.
 * These are NOT save records, guest claims, or permission grants. A boolean
 * alone cannot establish an owner's geometry, revision or finite custody. */
export type AsteroidEntityDependency = Readonly<{
  kind: Exclude<AsteroidEntityDependencyKind, "apiary-bee">; id: string; attached: boolean;
} | {
  kind: "apiary-bee"; id: string; attached: boolean; specimenOriginLocationId?: LocationId;
} | {
  /** Shared canonical history, not a structure that must move with its body. */
  kind: HistoricalResidentKind | "summon"; id: string; attached: null;
}>;
export type AsteroidRelationshipActor = Readonly<{
  id: string; position: CelestialPoint; bounds: CelestialBounds;
  mountedCreatureId: number | null;
  /** Complete host-derived active links, including special AI/agent followers. */
  followingCreatureIds: readonly number[];
}>;
export type AsteroidRelationshipContext = Readonly<{
  localActorId: string;
  actors: readonly AsteroidRelationshipActor[];
  dependencies: readonly AsteroidEntityDependency[];
}>;

const dependencyKinds = new Set<AsteroidEntityDependencyKind>(["poi", "legendary", "prime", "summon", "settlement", "resident", "apiary-bee", "orb", "dragon-lair"]);
const idKey = (kind: string, id: string) => JSON.stringify([kind, id]);
/** Compound authored identities are encoded without delimiter ambiguity. */
export function asteroidEntityCompoundId(...parts: readonly string[]): string {
  for (const part of parts) identifier(part);
  return JSON.stringify(parts);
}
function identifier(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value || value.trim() !== value) throw Error("Invalid attachment relationship identity.");
}
function numericId(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw Error("Invalid attachment creature identity.");
}
function sameSide(left: boolean, right: boolean, label: string) {
  if (left !== right) throw Error(`${label} crosses the asteroid relationship boundary.`);
}
function pointInBounds(point: CelestialPoint, b: CelestialBounds) {
  return [point.x, point.y, point.z].every(Number.isFinite)
    && point.x >= b.minX && point.x <= b.maxX && point.y >= b.minY && point.y <= b.maxY && point.z >= b.minZ && point.z <= b.maxZ;
}

/** A rope with both endpoints outside can still pass through the selected
 * frame. Check the whole segment, not only endpoint membership. Surface contact
 * is conservative here: refusing a tangent never clips or duplicates a lead. */
export function assertAsteroidLeadSegmentOutside(frame: AsteroidAttachmentFrame, from: CelestialPoint,
  to: CelestialPoint, view: AsteroidAttachmentView): void {
  if (![from.x, from.y, from.z, to.x, to.y, to.z].every(Number.isFinite)) throw Error("Invalid attachment lead endpoint.");
  const b = asteroidAttachmentPhysicalBounds(frame, view);
  let low = 0, high = 1;
  for (const [a, z, min, max] of [[from.x, to.x, b.minX, b.maxX], [from.y, to.y, b.minY, b.maxY], [from.z, to.z, b.minZ, b.maxZ]]) {
    const delta = z - a;
    if (!Number.isFinite(delta)) throw Error("Attachment lead span exceeds finite coordinates.");
    if (delta === 0) { if (a < min || a > max) return; continue; }
    const enter = (min - a) / delta, leave = (max - a) / delta;
    low = Math.max(low, Math.min(enter, leave)); high = Math.min(high, Math.max(enter, leave));
    if (low > high) return;
  }
  throw Error("Outside lead segment crosses the asteroid frame boundary.");
}

function configuredFollowerOwners(creature: SavedCreature): string[] {
  const owners: (string | null | undefined)[] = [];
  if (creature.dragonState?.tamed && creature.dragonState.command === "follow") owners.push(creature.dragonState.ownerId);
  if (creature.followCommand !== "hold") {
    // Aquatic/airborne bonded followers and generic tamed AI do not pass
    // through the ground-formation branch below. They still cannot cross a
    // whole-entity attachment boundary away from their configured keeper.
    if (creature.leviathanGrowth?.tamed) owners.push(creature.leviathanGrowth.ownerId);
    if (creature.creatureTamed) owners.push(creature.creatureOwnerId);
  }
  const movement = MOB_DEFS[creature.kind].movement;
  if (movement !== "flying" && movement !== "aquatic") {
    if (creature.petState?.tamed && creature.petState.command === "follow") owners.push(creature.petState.ownerId);
    if (creature.followCommand !== "hold") {
      if (creature.shadeState?.tamed) owners.push(creature.shadeState.ownerId);
      if (creature.reedstriderBond?.tamed) owners.push(creature.reedstriderBond.ownerId);
      if (creature.courserBond?.tamed) owners.push(creature.courserBond.ownerId);
      if (creature.hiredByPlayerId) owners.push(creature.hiredByPlayerId);
    }
  }
  // An unresolved configured follower is conservatively refused, even if its
  // owner is currently disconnected. This does not change ordinary engine AI.
  for (const owner of owners) identifier(owner);
  return [...new Set(owners as string[])];
}

/** Validate one proposed partition of a COMPLETE canonical entity collection.
 * Physical creature/boat checks are derived here. Dependency results and actor
 * body/active-link snapshots must come from complete host-owned selectors at the
 * same revision. Missing adapters fail closed; this helper cannot attest those
 * inputs, grant consent, spend resources, capture a save, or open local travel.
 * Historical owner IDs alone do not force an idle pet/empty boat to follow.
 */
export function asteroidEntityRelationshipPartition(frame: AsteroidAttachmentFrame, input: AsteroidAttachedEntities,
  view: AsteroidAttachmentView, context: AsteroidRelationshipContext): Readonly<{
    creatureIds: readonly number[]; boatIds: readonly string[]; leadMobIds: readonly number[];
  }> {
  assertKnownAsteroidEntityFields(input);
  identifier(context.localActorId);
  const creatures = new Map<number, SavedCreature>(), sides = new Map<number, boolean>(), specimens = new CreatureSpecimenIdentitySet();
  const groups = new Map<string, boolean>();
  for (const creature of [...input.creatures, ...input.sleepingCreatures]) {
    numericId(creature.id);
    if (creatures.has(creature.id)) throw Error("Duplicate attachment creature identity.");
    if (creature.specimenId !== undefined) {
      identifier(creature.specimenId);
      specimens.add(creature.specimenId, creature, "Duplicate attachment specimen identity.");
    }
    creatures.set(creature.id, creature);
    const side = asteroidCreatureFootprintSide(frame, creature, view); sides.set(creature.id, side);
    if (creature.socialGroupId !== undefined) {
      // Conservatively retain a whole saved label, including sleeping members
      // and mixed modes. Never infer that inactive/hidden members may be split.
      identifier(creature.socialGroupId);
      if (groups.has(creature.socialGroupId)) sameSide(side, groups.get(creature.socialGroupId)!, "Social group");
      groups.set(creature.socialGroupId, side);
    }
  }
  const creatureSide = (id: number) => {
    numericId(id);
    if (!sides.has(id)) throw Error("Unresolved attachment creature relationship.");
    return sides.get(id)!;
  };
  const actors = new Map<string, { value: AsteroidRelationshipActor; side: boolean }>();
  for (const actor of context.actors) {
    identifier(actor.id);
    if (actors.has(actor.id)) throw Error("Duplicate attachment actor identity.");
    const side = asteroidAttachmentVolumeSide(frame, actor.bounds, view);
    if (actor.bounds.minX === actor.bounds.maxX || actor.bounds.minY === actor.bounds.maxY || actor.bounds.minZ === actor.bounds.maxZ)
      throw Error("Actor physical bounds must have positive volume.");
    if (!pointInBounds(actor.position, actor.bounds)) throw Error("Actor anchor is outside its physical bounds.");
    actors.set(actor.id, { value: actor, side });
  }
  const actorFor = (id: string) => {
    identifier(id); const actor = actors.get(id);
    if (!actor) throw Error("Unresolved attachment actor relationship.");
    return actor;
  };
  actorFor(context.localActorId);
  const occupiedActors = new Set<string>(), boatIds: string[] = [], seenBoats = new Set<string>();
  for (const boat of input.boats) {
    identifier(boat.id);
    if (seenBoats.has(boat.id)) throw Error("Duplicate attachment boat.");
    seenBoats.add(boat.id); const side = asteroidSailboatFootprintSide(frame, boat, view);
    if (boat.passengers.length > SAILBOAT_CAPACITY) throw Error("Attachment boat has too many passengers.");
    for (const id of boat.passengers) {
      const actor = actorFor(id);
      if (occupiedActors.has(id)) throw Error("Duplicate attachment passenger seat.");
      occupiedActors.add(id); sameSide(side, actor.side, "Boat passenger");
    }
    if (side) boatIds.push(boat.id);
  }
  const mounted = new Set<number>(), followerOwners = new Map<number, string>();
  for (const { value: actor, side } of actors.values()) {
    if (actor.mountedCreatureId !== null) {
      if (occupiedActors.has(actor.id)) throw Error("Actor occupies a boat and a creature seat.");
      occupiedActors.add(actor.id); mounted.add(actor.mountedCreatureId);
      sameSide(side, creatureSide(actor.mountedCreatureId), "Creature rider");
    }
    const followed = new Set<number>();
    for (const id of actor.followingCreatureIds) {
      if (followed.has(id)) throw Error("Duplicate attachment follower link.");
      if (followerOwners.has(id)) throw Error("Creature has multiple active follower owners.");
      followerOwners.set(id, actor.id);
      followed.add(id); sameSide(side, creatureSide(id), "Active follower");
    }
  }
  const leadMobIds: number[] = [], led = new Set<number>();
  for (const lead of input.leads) {
    const side = creatureSide(lead.mobId), creature = creatures.get(lead.mobId)!;
    if (led.has(lead.mobId) || !Number.isFinite(lead.maximumLength) || lead.maximumLength <= 0) throw Error("Invalid or duplicate attachment lead.");
    led.add(lead.mobId);
    let anchor: CelestialPoint;
    if (lead.fence) {
      if (![lead.fence.x, lead.fence.y, lead.fence.z].every(Number.isSafeInteger)) throw Error("Invalid attachment fence anchor.");
      sameSide(side, asteroidAttachmentContainsCell(frame, `${lead.fence.x},${lead.fence.y},${lead.fence.z}`, view), "Lead fence");
      anchor = { ...lead.fence, y: lead.fence.y + .35 };
    } else {
      const actor = actorFor(lead.ownerId ?? context.localActorId);
      sameSide(side, actor.side, "Lead keeper"); anchor = { ...actor.value.position, y: actor.value.position.y + 1.05 };
    }
    if (!side) assertAsteroidLeadSegmentOutside(frame, creature, anchor, view);
    else {
      const b = asteroidAttachmentPhysicalBounds(frame, view);
      if (!pointInBounds(anchor, b)) throw Error("Lead endpoint crosses the asteroid frame boundary.");
      leadMobIds.push(lead.mobId);
    }
  }
  const dependencies = new Map<string, AsteroidEntityDependency>(), usedDependencies = new Set<string>();
  const beeDependencies = new CreatureSpecimenIdentitySet(), beeActors = new CreatureSpecimenIdentitySet();
  for (const dependency of context.dependencies) {
    identifier(dependency.id);
    if (dependency.kind === "apiary-bee") beeDependencies.add(dependency.id, dependency, "Invalid or duplicate attachment dependency.");
    const key = idKey(dependency.kind, dependency.kind === "apiary-bee"
      ? creatureSpecimenIdentityKey(dependency.id, dependency) : dependency.id);
    const historical = dependency.kind === "road-event" || dependency.kind === "guild-companion";
    const sharedSummon = dependency.kind === "summon" && dependency.attached === null;
    if ((!sharedSummon && (historical ? dependency.attached !== null : !dependencyKinds.has(dependency.kind as AsteroidEntityDependencyKind)
      || typeof dependency.attached !== "boolean")) || dependencies.has(key)) throw Error("Invalid or duplicate attachment dependency.");
    dependencies.set(key, dependency);
  }
  for (const creature of creatures.values()) {
    const side = sides.get(creature.id)!;
    const requireDependency = (kind: AsteroidEntityDependencyKind, id: string, originSource?: unknown) => {
      identifier(id); const key = idKey(kind, kind === "apiary-bee" ? creatureSpecimenIdentityKey(id, originSource) : id), dependency = dependencies.get(key);
      if (!dependency || dependency.attached === null && kind !== "summon") throw Error(`Unresolved attachment ${kind} dependency.`);
      usedDependencies.add(key);
      if (dependency.attached !== null) sameSide(side, dependency.attached, `${kind} dependency`);
    };
    if (creature.poiMarkerId !== undefined) requireDependency("poi", creature.poiMarkerId);
    // This is also a retention/protection flag for hatched pets, apiary releases
    // and guild companions. It is not an implicit, missing POI identity. Actual
    // marker/home/guard/encounter references still require their own closure.
    if (creature.persistentPoiResident !== undefined && typeof creature.persistentPoiResident !== "boolean")
      throw Error("Invalid persistent creature retention flag.");
    if (creature.legendaryEncounterId !== undefined || creature.legendarySiteId !== undefined) {
      identifier(creature.legendaryEncounterId); identifier(creature.legendarySiteId);
      requireDependency("legendary", asteroidEntityCompoundId(creature.legendaryEncounterId, creature.legendarySiteId));
    }
    if (creature.primeAnchorId !== undefined) requireDependency("prime", creature.primeAnchorId);
    if (creature.groundedSummonLineageId !== undefined || creature.groundedSummonEntityId !== undefined) {
      identifier(creature.groundedSummonLineageId); identifier(creature.groundedSummonEntityId);
      requireDependency("summon", asteroidEntityCompoundId(creature.groundedSummonLineageId, creature.groundedSummonEntityId));
    }
    if (creature.settlementId != null) requireDependency("settlement", creature.settlementId);
    if (creature.residentId != null) {
      identifier(creature.residentId);
      if (creature.settlementId != null) requireDependency("resident", asteroidEntityCompoundId(creature.settlementId, creature.residentId));
      else {
        const reference = historicalResidentReference(creature.residentId), key = idKey(reference.kind, reference.id);
        if (dependencies.get(key)?.attached !== null) throw Error(`Unresolved attachment ${reference.kind} history.`);
        usedDependencies.add(key);
      }
    }
    if (creature.apiaryBee) {
      assertCreatureOriginsAgree(creature, creature.apiaryBee);
      beeActors.add(creature.apiaryBee.id, creature.apiaryBee, "Duplicate attachment bee identity.");
      requireDependency("apiary-bee", creature.apiaryBee.id, creature.apiaryBee);
    }
    if (creature.attunedOrbId != null) requireDependency("orb", creature.attunedOrbId);
    if (creature.dragonState?.home) requireDependency("dragon-lair", asteroidEntityCompoundId(creature.dragonState.home.dimension, creature.dragonState.home.lairId));
    if (creature.dragonState?.onShoulder) {
      identifier(creature.dragonState.ownerId);
      sameSide(side, actorFor(creature.dragonState.ownerId).side, "Shoulder creature");
    }
    if (!led.has(creature.id) && !mounted.has(creature.id)) for (const owner of configuredFollowerOwners(creature))
      sameSide(side, actorFor(owner).side, "Configured follower");
  }
  if (usedDependencies.size !== dependencies.size) throw Error("Unmatched attachment dependency.");
  return { creatureIds: [...sides].filter(([, side]) => side).map(([id]) => id), boatIds, leadMobIds };
}
