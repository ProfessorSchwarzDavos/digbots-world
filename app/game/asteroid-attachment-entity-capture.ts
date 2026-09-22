import type { SavedCreature } from "./engine";
import type { CelestialPoint } from "./celestial-terrain";
import type { AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { rebaseAsteroidEntities, type AsteroidAttachedEntities } from "./asteroid-attachment-entities";
import { canonicalJson } from "./universe-json";
import { assertCreatureOriginsAgree } from "./creature-origins";

/** Ephemeral host-side lineage, never guest input or another saved resource ID.
 * A source is an index in the exact baseline drop array, not the edited array.
 * Null means newly created. Runtime adapters must retain this alongside their
 * live drop objects through reordering; guessing by item or position is unsafe.
 */
export type AsteroidDropOrigins = readonly (number | null)[];

function retainUnchangedAxes(canonical: CelestialPoint, baseline: CelestialPoint,
  edited: CelestialPoint, captured: CelestialPoint): CelestialPoint {
  return { x: edited.x === baseline.x ? canonical.x : captured.x,
    y: edited.y === baseline.y ? canonical.y : captured.y,
    z: edited.z === baseline.z ? canonical.z : captured.z };
}

function retainCreatureAnchors(canonical: SavedCreature, baseline: SavedCreature,
  edited: SavedCreature, captured: SavedCreature): void {
  if (canonical.specimenId !== edited.specimenId) throw Error("Attached creature specimen identity changed.");
  assertCreatureOriginsAgree(canonical, edited);
  Object.assign(captured, retainUnchangedAxes(canonical, baseline, edited, captured));
  if (canonical.morrowRoost && baseline.morrowRoost && edited.morrowRoost && captured.morrowRoost)
    captured.morrowRoost = retainUnchangedAxes(canonical.morrowRoost, baseline.morrowRoost, edited.morrowRoost, captured.morrowRoost);
  if (canonical.creatureWork?.home && baseline.creatureWork?.home && edited.creatureWork?.home && captured.creatureWork?.home)
    captured.creatureWork = { ...captured.creatureWork, home: retainUnchangedAxes(canonical.creatureWork.home,
      baseline.creatureWork.home, edited.creatureWork.home, captured.creatureWork.home) };
  if (canonical.dragonState?.home && baseline.dragonState?.home && edited.dragonState?.home && captured.dragonState?.home
    && canonical.dragonState.home.lairId === edited.dragonState.home.lairId
    && canonical.dragonState.home.dimension === edited.dragonState.home.dimension)
    captured.dragonState = { ...captured.dragonState, home: { ...captured.dragonState.home,
      position: retainUnchangedAxes(canonical.dragonState.home.position, baseline.dragonState.home.position,
        edited.dragonState.home.position, captured.dragonState.home.position) } };
}

/** Capture one ALREADY selected whole entity unit into orbit coordinates.
 * This is not a selector or permission check. Caller must validate complete
 * colliders/guard regions/POI/agent relationships, then bind owner epoch/revision
 * and all finite resource changes in the same host-authorized transaction.
 *
 * Arithmetic alone is not an exact no-op: e.g. (0.1 - 32) + 32 loses bits.
 * Retain original canonical axes when their projected value did not change.
 * Identity matching survives live/sleep transfers and reordered creature/boat
 * arrays. Drops have no saved identity, so explicit host lineage is mandatory.
 */
export function captureAsteroidEntityUnit(frame: AsteroidAttachmentFrame, canonical: AsteroidAttachedEntities,
  baseline: AsteroidAttachedEntities, edited: AsteroidAttachedEntities, movingActorIds: readonly string[],
  dropOrigins: AsteroidDropOrigins, localActorId = "local"): AsteroidAttachedEntities {
  const projected = rebaseAsteroidEntities(frame, canonical, "orbit", movingActorIds, localActorId);
  if (canonicalJson(projected) !== canonicalJson(baseline)) throw Error("Stale asteroid entity projection.");
  if (dropOrigins.length !== edited.drops.length) throw Error("Missing attached drop lineage.");
  const used = new Set<number>();
  for (const origin of dropOrigins) {
    if (origin === null) continue;
    if (!Number.isSafeInteger(origin) || origin < 0 || origin >= canonical.drops.length || used.has(origin))
      throw Error("Invalid or duplicate attached drop lineage.");
    used.add(origin);
  }
  const output = rebaseAsteroidEntities(frame, edited, "local", movingActorIds, localActorId);
  const creatures = (unit: AsteroidAttachedEntities) => new Map([...unit.creatures, ...unit.sleepingCreatures].map(value => [value.id, value]));
  const originals = creatures(canonical), before = creatures(projected), changes = creatures(edited);
  for (const captured of [...output.creatures, ...output.sleepingCreatures]) {
    const original = originals.get(captured.id), base = before.get(captured.id);
    if (original && base) retainCreatureAnchors(original, base, changes.get(captured.id)!, captured);
  }
  const originalBoats = new Map(canonical.boats.map(value => [value.id, value]));
  const projectedBoats = new Map(projected.boats.map(value => [value.id, value]));
  const editedBoats = new Map(edited.boats.map(value => [value.id, value]));
  for (const boat of output.boats) {
    const original = originalBoats.get(boat.id), base = projectedBoats.get(boat.id);
    if (original && base) Object.assign(boat, retainUnchangedAxes(original, base, editedBoats.get(boat.id)!, boat));
  }
  for (let index = 0; index < output.drops.length; index++) {
    const origin = dropOrigins[index];
    if (origin !== null) Object.assign(output.drops[index], retainUnchangedAxes(canonical.drops[origin],
      projected.drops[origin], edited.drops[index], output.drops[index]));
  }
  // Retained originals must still satisfy the canonical frame/identity contract.
  rebaseAsteroidEntities(frame, output, "orbit", movingActorIds, localActorId);
  return output;
}
