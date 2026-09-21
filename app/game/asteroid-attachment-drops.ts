import type { WorldSave } from "./engine";
import type { AsteroidAttachmentFrame, AsteroidAttachmentView } from "./asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";
import { worldDropBodyBounds } from "./world-drop-body";
import { assertKnownAsteroidEntityFields, rebaseAsteroidEntities, type AsteroidAttachedEntities } from "./asteroid-attachment-entities";
import { captureAsteroidEntityUnit, type AsteroidDropOrigins } from "./asteroid-attachment-entity-capture";
import { canonicalJson, cloneUniverseJson } from "./universe-json";

type SavedDrops = NonNullable<WorldSave["drops"]>;
export type AsteroidDropProjection = Readonly<{ drops: SavedDrops; sourceIndices: readonly number[] }>;
const dropUnit = (drops: SavedDrops): AsteroidAttachedEntities => ({ creatures: [], sleepingCreatures: [], boats: [], leads: [], drops });

/** Indices refer to the exact canonical input array, never stable saved IDs.
 * Callers retain this source lineage with host live objects through reorder,
 * merge/split/creation. Opaque cargo and outside records are not rewritten. */
export function asteroidAttachedDropIndices(frame: AsteroidAttachmentFrame, drops: NonNullable<WorldSave["drops"]>,
  view: AsteroidAttachmentView): number[] {
  const selected: number[] = [];
  drops.forEach((drop, index) => {
    if (asteroidAttachmentVolumeSide(frame, worldDropBodyBounds(drop), view)) selected.push(index);
  });
  return selected;
}

/** Detached local projection with exact indices in the canonical orbit array.
 * The host must bind this projection to its owner epoch/revision; this pure
 * helper neither authenticates lineage nor authorizes finite cargo changes. */
export function projectAsteroidDrops(frame: AsteroidAttachmentFrame, canonical: SavedDrops): AsteroidDropProjection {
  assertKnownAsteroidEntityFields(dropUnit(canonical));
  // Validate outside opaque records too, without normalizing their contents.
  canonicalJson(canonical);
  const sourceIndices = asteroidAttachedDropIndices(frame, canonical, "orbit");
  return { sourceIndices, drops: rebaseAsteroidEntities(frame,
    dropUnit(sourceIndices.map(index => canonical[index])), "orbit", []).drops };
}

/** Merge a host-owned local selection back into the complete orbit collection.
 * Origins index the SELECTED baseline, not the full canonical array. Existing
 * records keep their original array slots relative to outside records, even
 * when live objects reorder. Removed records disappear; new records append in
 * edited order. Identical drops are never guessed, merged, or given saved IDs.
 * Caller must atomically bind owner revision and inventory/resource events. */
export function captureAsteroidDrops(frame: AsteroidAttachmentFrame, canonical: SavedDrops,
  baseline: AsteroidDropProjection, edited: SavedDrops, origins: AsteroidDropOrigins): SavedDrops {
  const expected = projectAsteroidDrops(frame, canonical);
  if (canonicalJson(expected) !== canonicalJson(baseline)) throw Error("Stale asteroid drop projection.");
  if (asteroidAttachedDropIndices(frame, edited, "local").length !== edited.length)
    throw Error("Edited drop is outside the asteroid frame boundary.");
  const captured = captureAsteroidEntityUnit(frame,
    dropUnit(expected.sourceIndices.map(index => canonical[index])), dropUnit(expected.drops), dropUnit(edited), [], origins).drops;
  if (asteroidAttachedDropIndices(frame, captured, "orbit").length !== captured.length)
    throw Error("Captured drop is outside the asteroid frame boundary.");
  const selected = new Set(expected.sourceIndices), replacements = new Map<number, SavedDrops[number]>(), created: SavedDrops = [];
  captured.forEach((drop, index) => {
    const origin = origins[index];
    if (origin === null) created.push(drop);
    else replacements.set(expected.sourceIndices[origin], drop);
  });
  const output: SavedDrops = [];
  canonical.forEach((drop, index) => {
    if (!selected.has(index)) output.push(cloneUniverseJson(drop));
    else if (replacements.has(index)) output.push(replacements.get(index)!);
  });
  output.push(...created);
  // Recheck the complete merged collection, including outside-origin overlaps.
  projectAsteroidDrops(frame, output);
  return output;
}
