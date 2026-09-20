import type { SavedCreature, WorldSave } from "./engine";
import type { SailboatSave } from "./boats";
import type { SavedLeadAnchor } from "./farming";
import { cloneUniverseJson } from "./universe-json";
import { rebaseAsteroidPosition, type AsteroidAttachmentFrame, type AsteroidAttachmentView } from "./asteroid-attachment-frame";

export type AsteroidAttachedEntities = Readonly<{
  creatures: readonly SavedCreature[]; sleepingCreatures: readonly SavedCreature[];
  boats: readonly SailboatSave[]; drops: NonNullable<WorldSave["drops"]>; leads: readonly SavedLeadAnchor[];
}>;
/** This list is deliberately exhaustive. Nested portable/progression metadata
 * stays opaque; the three known world-anchor families are handled explicitly.
 */
const CREATURE_FIELDS = {
  id: true, habitatExposureSeconds: true, morrowExposure: true, morrowRoost: true, celestialVelocity: true,
  specimenId: true, geneticSeed: true, kind: true, name: true, x: true, y: true, z: true, yaw: true, health: true, age: true,
  naturalSpawned: true, everLed: true, naturalPool: true, outOfRangeSeconds: true, persistentPoiResident: true,
  poiMarkerId: true, legendaryEncounterId: true, legendarySiteId: true, primeAnchorId: true, groundedSummonLineageId: true,
  groundedSummonEntityId: true, enclosed: true, petState: true, careState: true, shadeState: true, reedstriderBond: true,
  courserBond: true, leviathanGrowth: true, aetherbellMorph: true, apiaryBee: true, socialGroupId: true,
  peelopShedding: true, mythicShed: true, milkCooldown: true, woolRegrowSeconds: true, factionId: true, profession: true,
  settlementId: true, residentId: true, aligned: true, hiredByPlayerId: true, followDistance: true, followCommand: true,
  dragonState: true, attunedOrbId: true, progression: true, typeSources: true, combatStatuses: true, mountExertion: true,
  mountMode: true, mountVerticalVelocity: true, creatureWork: true, creatureEquipment: true, creatureOwnerId: true, creatureTamed: true,
} satisfies Record<keyof SavedCreature, true>;
const BOAT_FIELDS = { id: true, x: true, y: true, z: true, yaw: true, velocity: true, passengers: true, inventory: true, ownerId: true } satisfies Record<keyof SailboatSave, true>;
const LEAD_FIELDS = { mobId: true, ownerId: true, fence: true, maximumLength: true } satisfies Record<keyof SavedLeadAnchor, true>;
const DROP_FIELDS = { item: true, count: true, durability: true, metadata: true, x: true, y: true, z: true, age: true, velocity: true } satisfies Record<keyof NonNullable<WorldSave["drops"]>[number], true>;
const ENTITY_COLLECTIONS = { creatures: true, sleepingCreatures: true, boats: true, drops: true, leads: true } satisfies Record<keyof AsteroidAttachedEntities, true>;
function supported(value: object, fields: object) {
  if (Object.keys(value).some(key => !Object.hasOwn(fields, key))) throw Error("Unsupported attached entity field.");
}

/** Pure whole-unit transform, not entity selection, travel consent or a save.
 * movingActorIds comes from the authenticated transition, never guest claims.
 * Reject cross-unit leads/passengers before changing any input. The full selector
 * still needs collider/guard-region/POI and agent relationship checks.
 */
export function rebaseAsteroidEntities(frame: AsteroidAttachmentFrame, input: AsteroidAttachedEntities,
  from: AsteroidAttachmentView, movingActorIds: readonly string[]): AsteroidAttachedEntities {
  supported(input, ENTITY_COLLECTIONS);
  const output = cloneUniverseJson(input), ids = new Set<number>(), specimens = new Set<string>(), boats = new Set<string>();
  const moving = new Set(movingActorIds), seated = new Set<string>();
  const point = (p: { x: number; y: number; z: number }) => rebaseAsteroidPosition(frame, p, from);
  for (const creature of [...output.creatures, ...output.sleepingCreatures]) {
    supported(creature, CREATURE_FIELDS);
    if (!Number.isSafeInteger(creature.id) || creature.id < 0 || ids.has(creature.id)
      || creature.specimenId !== undefined && (!creature.specimenId || specimens.has(creature.specimenId))) throw Error("Duplicate or invalid attached creature identity.");
    ids.add(creature.id); if (creature.specimenId) specimens.add(creature.specimenId);
    Object.assign(creature, point(creature));
    if (creature.morrowRoost) creature.morrowRoost = point(creature.morrowRoost);
    if (creature.creatureWork?.home) creature.creatureWork = { ...creature.creatureWork, home: point(creature.creatureWork.home) };
    // Existing dragon AI treats home.position as current-runtime coordinates;
    // its legacy dimension/lair identity is preserved, never reinterpreted.
    if (creature.dragonState?.home) creature.dragonState = { ...creature.dragonState,
      home: { ...creature.dragonState.home, position: point(creature.dragonState.home.position) } };
  }
  for (const boat of output.boats) {
    supported(boat, BOAT_FIELDS);
    if (!boat.id || boats.has(boat.id)) throw Error("Duplicate or invalid attached boat identity.");
    boats.add(boat.id);
    for (const passenger of boat.passengers) {
      if (!moving.has(passenger) || seated.has(passenger)) throw Error("Attached boat passenger is outside the moving unit or has duplicate seats.");
      seated.add(passenger);
    }
    Object.assign(boat, point(boat));
  }
  for (const drop of output.drops) { supported(drop, DROP_FIELDS); Object.assign(drop, point(drop)); }
  const led = new Set<number>();
  const leads = output.leads.map(lead => {
    supported(lead, LEAD_FIELDS);
    if (!ids.has(lead.mobId) || led.has(lead.mobId)) throw Error("Attached lead lacks one unique creature owner.");
    led.add(lead.mobId);
    if (lead.fence) {
      if (![lead.fence.x, lead.fence.y, lead.fence.z].every(Number.isSafeInteger)) throw Error("Invalid attached lead fence.");
      return { ...lead, fence: point(lead.fence) };
    }
    if (!moving.has(lead.ownerId ?? "local")) throw Error("Attached lead keeper is outside the moving unit.");
    return lead;
  });
  return { ...output, leads };
}
