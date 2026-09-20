import { BlockId, BLOCKS } from "./data";
import { asteroidVoxelFromView, createAsteroidReader, parseAsteroidRegistry, type AsteroidRegistry } from "./asteroid-custody";
import { asteroidAtPoint, asteroidOrbitFor } from "./asteroid-runtime";
import { captureAsteroidBlocks, opaqueAsteroidBlockCodec, projectAsteroidBlocks } from "./asteroid-attachment-blocks";
import type { AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { locationId, type LocationAddress } from "./location-address";
import { isUniverseRecord } from "./universe-json";
import type { ChunkEditSave } from "./world";

function cells(edits: ChunkEditSave): Record<string, BlockId> {
  if (!isUniverseRecord(edits)) throw Error("Invalid attached voxel edits.");
  const output: Record<string, BlockId> = {};
  for (const [key, entries] of Object.entries(edits)) {
    if (!/^-?\d+,-?\d+$/.test(key)) throw Error("Invalid attached chunk key.");
    const [cx, cz] = key.split(",").map(Number);
    if (![cx * 16, cz * 16, cx * 16 + 15, cz * 16 + 15].every(Number.isSafeInteger)
      || key !== `${cx},${cz}` || !Array.isArray(entries)) throw Error("Noncanonical attached chunk key or entries.");
    const seen = new Set<number>();
    for (const entry of entries) {
      if (!Array.isArray(entry) || entry.length !== 2) throw Error("Invalid attached chunk entry.");
      const [index, block] = entry;
      if (!Number.isSafeInteger(index) || index < 0 || index >= 16 * 16 * 192 || seen.has(index)
        || !Number.isSafeInteger(block) || !Object.hasOwn(BLOCKS, block)) throw Error("Invalid or duplicate attached voxel.");
      seen.add(index);
      output[`${cx * 16 + index % 16},${Math.floor(index / 256) - 64},${cz * 16 + Math.floor(index / 16) % 16}`] = block;
    }
  }
  return output;
}
function indexFor(key: string) {
  const [x, y, z] = key.split(",").map(Number), cx = Math.floor(x / 16), cz = Math.floor(z / 16);
  return { chunk: `${cx},${cz}`, index: (y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16 };
}
/** Preserve existing entry/chunk order, including empty chunks, where possible. */
function chunks(values: Record<string, BlockId>, original: ChunkEditSave = {}): ChunkEditSave {
  const pending = new Map<string, Map<number, BlockId>>(), output: ChunkEditSave = {};
  for (const [key, block] of Object.entries(values)) {
    const { chunk, index } = indexFor(key), entries = pending.get(chunk) ?? new Map<number, BlockId>();
    entries.set(index, block); pending.set(chunk, entries);
  }
  for (const [chunk, entries] of Object.entries(original)) {
    const remaining = pending.get(chunk), retained: Array<[number, number]> = [];
    for (const [index] of entries) if (remaining?.has(index)) { retained.push([index, remaining.get(index)!]); remaining.delete(index); }
    if (retained.length || !entries.length) output[chunk] = retained;
  }
  for (const [chunk, remaining] of pending) if (remaining.size) (output[chunk] ??= []).push(...remaining);
  return output;
}
const voxelCodec = opaqueAsteroidBlockCodec<BlockId>();

/** Construction-edit projection only. Canonical finite asteroid pages must be
 * projected separately by projectAsteroidEdits; this creates no new ore owner. */
export function projectAsteroidVoxelEdits(frame: AsteroidAttachmentFrame, canonical: ChunkEditSave): ChunkEditSave {
  return chunks(projectAsteroidBlocks(frame, cells(canonical), voxelCodec));
}
/** Data merge, not build/extract authority. The host must atomically capture
 * finite asteroid pages and inventory with these edits before removing mirrors. */
export function captureAsteroidVoxelEdits(frame: AsteroidAttachmentFrame, canonical: ChunkEditSave,
  baseline: ChunkEditSave, edited: ChunkEditSave): ChunkEditSave {
  return chunks(captureAsteroidBlocks(frame, cells(canonical), cells(baseline), cells(edited), voxelCodec), canonical);
}

/** Removes ONLY redundant finite-page mirrors after exact canonical readback.
 * A missing/stale capture rejects the entire operation. Non-asteroid construction
 * and original inputs remain exact; there is no write or extraction credit here.
 * This prerequisite is not yet used by normal storage or runtime checkpoints. */
export function stripCapturedAsteroidEditMirrors(raw: AsteroidRegistry, location: LocationAddress, edits: ChunkEditSave): ChunkEditSave {
  const registry = parseAsteroidRegistry(raw), orbit = asteroidOrbitFor(location);
  if (!orbit || locationId(orbit) !== locationId(registry.orbit)
    || location.kind === "asteroid" && !registry.asteroids.some(entry => entry.descriptor.id === location.instanceId))
    throw Error("Foreign or unknown asteroid edit owner.");
  const source = cells(edits), reader = createAsteroidReader(registry), retained: Record<string, BlockId> = {};
  for (const [key, block] of Object.entries(source)) {
    const [x, y, z] = key.split(",").map(Number), point = { x, y, z }, asteroid = asteroidAtPoint(registry, point, location);
    if (!asteroid) { retained[key] = block; continue; }
    if (reader.blockAt(asteroid.id, asteroidVoxelFromView(registry, asteroid.id, point, location)) !== block)
      throw Error("Uncaptured asteroid voxel mirror; retain the original checkpoint.");
  }
  return chunks(retained, edits);
}
