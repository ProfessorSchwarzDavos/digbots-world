import type { SavedCreature } from "./engine";
import type { CelestialBounds, CelestialPoint } from "./celestial-terrain";
import { creatureBodyBounds } from "./creature-body";
import { asteroidAttachmentContainsPosition, asteroidAttachmentPhysicalBounds,
  type AsteroidAttachmentFrame, type AsteroidAttachmentView } from "./asteroid-attachment-frame";

/** Classify a complete conservative physical AABB, including outside-origin
 * overlaps. Mere surface contact is allowed; a zero-width axis is a point and
 * follows the frame's half-open rule. This grants no ownership or permission. */
export function asteroidAttachmentVolumeSide(frame: AsteroidAttachmentFrame, volume: CelestialBounds,
  view: AsteroidAttachmentView): boolean {
  const b = asteroidAttachmentPhysicalBounds(frame, view);
  const axes = [[volume.minX, volume.maxX, b.minX, b.maxX], [volume.minY, volume.maxY, b.minY, b.maxY],
    [volume.minZ, volume.maxZ, b.minZ, b.maxZ]];
  if (axes.some(values => !values.every(Number.isFinite) || values[0] > values[1])) throw Error("Invalid attachment physical volume.");
  const contained = axes.every(([min, max, low, high]) => min >= low && min < high && max <= high);
  const intersects = axes.every(([min, max, low, high]) => min === max ? min >= low && min < high : max > low && min < high);
  if (intersects && !contained) throw Error("Physical volume crosses the asteroid frame boundary.");
  return contained;
}

/** Spatial footprint only: the caller must separately close authored, social,
 * lead/passenger/agent and owner relationships and validate the saved schema.
 * Uses the engine's exact contact body, including nonblocking small animals.
 * Dragon home guards are X/Z areas in the current AI, not 3D spheres; their
 * conservative disk AABB and the home altitude must remain on the body's side.
 */
export function asteroidCreatureFootprintSide(frame: AsteroidAttachmentFrame, creature: SavedCreature,
  view: AsteroidAttachmentView): boolean {
  const side = asteroidAttachmentVolumeSide(frame, creatureBodyBounds(creature, creature), view);
  const anchor = (point: CelestialPoint) => {
    if (![point.x, point.y, point.z].every(Number.isFinite)) throw Error("Invalid attached creature anchor.");
    if (asteroidAttachmentContainsPosition(frame, point, view) !== side)
      throw Error("Creature anchor crosses the asteroid frame boundary.");
  };
  if (creature.morrowRoost) anchor(creature.morrowRoost);
  if (creature.creatureWork?.home) anchor(creature.creatureWork.home);
  if (creature.dragonState?.home) {
    const { position, guardRadius } = creature.dragonState.home;
    anchor(position);
    if (!Number.isFinite(guardRadius) || guardRadius <= 0) throw Error("Invalid attached creature guard radius.");
    if (asteroidAttachmentVolumeSide(frame, { minX: position.x - guardRadius, maxX: position.x + guardRadius,
      minY: position.y, maxY: position.y, minZ: position.z - guardRadius, maxZ: position.z + guardRadius }, view) !== side)
      throw Error("Creature guard crosses the asteroid frame boundary.");
  }
  return side;
}
