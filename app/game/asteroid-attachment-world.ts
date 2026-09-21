import { BlockId } from "./data";
import { BLOCK_FACING_NORTH, type BlockFacing } from "./block-facing";
import { createAsteroidReader, type AsteroidRegistry } from "./asteroid-custody";
import { asteroidAtPoint, projectAsteroidEdits } from "./asteroid-runtime";
import { asteroidVoxelEditCells, stripCapturedAsteroidEditMirrors } from "./asteroid-attachment-voxels";
import { CELESTIAL_MAX_Y, CELESTIAL_MIN_Y, CELESTIAL_TERRAIN_VERSION, createCelestialTerrain } from "./celestial-terrain";
import { parseCustodyCellKey } from "./chest-custody-owner";
import { locationId, type LocationId } from "./location-address";
import { canonicalJson, cloneUniverseJson, freezeUniverseJson } from "./universe-json";
import type { ChunkEditSave } from "./world";
import { blocksSky } from "./environment-queries";

/** One detached ORBIT preimage. Capture live finite edits into a proposed registry
 * first; this reader refuses uncaptured/stale mirrors instead of restoring ore.
 * It is not a world loader, storage commit, generator migration or travel grant.
 */
export type AsteroidAttachmentWorldSource = Readonly<{
  locationId: LocationId; terrainVersion: number; terrainSeed: number; expansionLevel: number;
  registry: AsteroidRegistry; edits: ChunkEditSave; blockFacings: Readonly<Record<string, BlockFacing>>;
}>;

/** Complete canonical lookup independent of loaded/rendered chunks. Only the
 * pinned orbital generator is supported; unknown versions fail before queries.
 * Missing facing means north by the same rule as World.blockFacingAt, but invalid
 * explicit values are rejected, never normalized into a different source image.
 */
export function createAsteroidAttachmentWorld(input: AsteroidAttachmentWorldSource) {
  const source = freezeUniverseJson(cloneUniverseJson(input));
  const finite = createAsteroidReader(source.registry), registry = finite.registry;
  const terrain = createCelestialTerrain({ location: registry.orbit, seed: registry.seed, expansionLevel: registry.expansionLevel });
  if (!terrain || terrain.kind !== "orbit" || source.locationId !== locationId(registry.orbit)
    || source.terrainVersion !== CELESTIAL_TERRAIN_VERSION || source.terrainVersion !== terrain.version
    || source.terrainSeed !== terrain.seed || source.expansionLevel !== registry.expansionLevel)
    throw Error("Attachment world differs from its canonical orbital generator.");
  const construction = asteroidVoxelEditCells(stripCapturedAsteroidEditMirrors(registry, registry.orbit, source.edits));
  // Orbital generator v1 produces only natural rock/ore/air. Every installed
  // block therefore comes from these complete pages + construction overrides,
  // not from loaded chunks or an inventory ledger that may not exist yet.
  const authoredVoxels = freezeUniverseJson(asteroidVoxelEditCells(projectAsteroidEdits(registry, registry.orbit, source.edits)));
  for (const [key, facing] of Object.entries(source.blockFacings)) {
    const [, y] = parseCustodyCellKey(key);
    if (y < CELESTIAL_MIN_Y || y > CELESTIAL_MAX_Y || ![0, 1, 2, 3].includes(facing))
      throw Error("Invalid canonical attachment facing.");
  }
  const sourceBaseline = canonicalJson(source);
  const columns = new Map<string, number>();
  const block = (key: string): BlockId => {
    const [x, y, z] = parseCustodyCellKey(key);
    // Match World.getBlock's vertical sentinels; unloaded X/Z is NOT a sentinel.
    if (y < CELESTIAL_MIN_Y) return BlockId.Bedrock;
    if (y > CELESTIAL_MAX_Y) return BlockId.Air;
    if (Object.hasOwn(construction, key)) return construction[key];
    const point = { x, y, z }, asteroid = asteroidAtPoint(registry, point, registry.orbit);
    return asteroid ? finite.blockInView(asteroid.id, point, registry.orbit) : terrain.block(x, y, z);
  };
  return Object.freeze({ source, sourceBaseline, authoredVoxels, block,
    skyTopAt(x: number, z: number): number {
      if (![x, z].every(Number.isSafeInteger)) throw Error("Invalid canonical sky column.");
      const key = `${x},${z}`, cached = columns.get(key); if (cached !== undefined) return cached;
      let top = CELESTIAL_MIN_Y - 1;
      for (let y = CELESTIAL_MAX_Y; y >= CELESTIAL_MIN_Y; y--) if (blocksSky(block(`${x},${y},${z}`))) { top = y; break; }
      columns.set(key, top); return top;
    },
    facing(key: string): BlockFacing {
      parseCustodyCellKey(key); return source.blockFacings[key] ?? BLOCK_FACING_NORTH;
    },
  });
}

/** Revision counters alone miss direct dirty writes. A future async proposal
 * must compare its exact current source, including pages and generator identity.
 */
export function assertAsteroidAttachmentWorldUnchanged(reader: Pick<ReturnType<typeof createAsteroidAttachmentWorld>, "sourceBaseline">,
  current: AsteroidAttachmentWorldSource): void {
  if (canonicalJson(current) !== reader.sourceBaseline) throw Error("Stale attachment world source.");
}
