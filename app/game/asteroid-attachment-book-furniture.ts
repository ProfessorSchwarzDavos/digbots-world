import { archiveShelfBookCount, BlockId, Item } from "./data";
import { normalizeArchiveShelf, normalizeTomeDisplay } from "./dragon-world";
import type { WorldSave } from "./engine";
import { encodeAttachmentSource } from "./attachment-source-preimage";
import { parseCustodyCellKey } from "./chest-custody-owner";
import { createAsteroidAttachmentFrame, asteroidAttachmentContainsCell, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";
import type { createAsteroidAttachmentWorld } from "./asteroid-attachment-world";
import { canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

export type AsteroidBookFurnitureSources = Pick<WorldSave, "archiveShelves" | "tomeDisplays">;
const fields = ["archiveShelves", "tomeDisplays"] as const;

/** Read-only canonical book furniture. A missing shelf ledger can still imply
 * finite BoundBooks from its authored block variant; never materialize that
 * fallback while selecting. Stored books are item codes, not creature holders.
 * Both chunk furniture and the maximum-scale separate tome model fit one cell. */
export function selectAsteroidBookFurniture(frame: AsteroidAttachmentFrame, source: AsteroidBookFurnitureSources,
  world: ReturnType<typeof createAsteroidAttachmentWorld>) {
  if (canonicalJson(frame) !== canonicalJson(createAsteroidAttachmentFrame(world.source.registry, frame.asteroidId)))
    throw Error("Book furniture frame differs from its canonical world.");
  if (!isUniverseRecord(source) || Object.keys(source).some(key => !fields.includes(key as typeof fields[number])))
    throw Error("Invalid book furniture source.");
  const encodedSource = encodeAttachmentSource(source);
  for (const field of fields) {
    const records = source[field];
    if (records === undefined) {
      if (Object.hasOwn(source, field)) throw Error("Invalid book furniture undefined table.");
      continue;
    }
    if (!isUniverseRecord(records)) throw Error("Invalid book furniture table.");
    for (const [key, value] of Object.entries(records)) {
      try { parseCustodyCellKey(key); } catch { throw Error("Invalid book furniture key."); }
      const block = world.block(key), shelfCount = archiveShelfBookCount(block);
      if (field === "archiveShelves" ? shelfCount === null : block !== BlockId.TomeDisplay)
        throw Error("Recorded book furniture has no matching canonical block.");
      const normalized = field === "archiveShelves" ? normalizeArchiveShelf(value) : normalizeTomeDisplay(value);
      if (JSON.stringify(encodeAttachmentSource(value)) !== JSON.stringify(encodeAttachmentSource(normalized)))
        throw Error("Book furniture state requires lossy normalization.");
      if ("tomes" in normalized && normalized.tomes.length !== shelfCount)
        throw Error("Archive shelf contents disagree with its canonical block count.");
    }
  }
  const installations = Object.entries(world.authoredVoxels).sort(([a], [b]) => a.localeCompare(b)).flatMap(([key, block]) => {
    const shelfCount = archiveShelfBookCount(block);
    const field = shelfCount !== null ? "archiveShelves" : block === BlockId.TomeDisplay ? "tomeDisplays" : null;
    if (!field) return [];
    const [x, y, z] = parseCustodyCellKey(key), attached = asteroidAttachmentContainsCell(frame, key, "orbit");
    if (asteroidAttachmentVolumeSide(frame, { minX: x - .5, maxX: x + .5, minY: y - .5, maxY: y + .5,
      minZ: z - .5, maxZ: z + .5 }, "orbit") !== attached) throw Error("Book furniture body crosses its boundary.");
    const records = source[field], recorded = !!records && Object.hasOwn(records, key);
    return [{ field, key, block, attached, facing: world.facing(key), recorded,
      state: recorded ? cloneUniverseJson(records![key]) : null,
      // This describes the existing lazy fallback; it is not a new inventory.
      implicitBooks: !recorded && shelfCount !== null ? { item: Item.BoundBook, count: shelfCount } : null }];
  });
  return freezeUniverseJson({ source: encodedSource, worldBaseline: world.sourceBaseline, installations });
}
