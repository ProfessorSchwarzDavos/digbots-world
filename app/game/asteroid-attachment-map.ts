import { MAP_CHUNK_SIZE, markChunksRendered, markUndergroundChunk, normalizeMapKnowledge, undergroundDepthBandForY,
  type ChunkCoordinate, type MapChunkDiscovery, type MapKnowledge, type MapMarker, type MapUndergroundSample, type WorldPoint } from "./map-system";
import { asteroidAttachmentContainsPosition, rebaseAsteroidPosition, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { asteroidHistoryRegionCoordinates, asteroidHistoryRegionTouches } from "./asteroid-history-regions";
import { assertExactKeys, canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

/** Private transient chart, deliberately NOT MapKnowledge. Original chunk keys,
 * marker identities and depth-band samples stay canonical. Local coordinates
 * are display/query hints, never a second discovery or fast-travel ledger. */
export type AsteroidMapView = Readonly<{
  frameId: string; canonicalWorldId: string; canonicalPlayerId: string; canonicalRevision: number;
  sourceBaseline: string;
  chunks: readonly Readonly<{ canonicalKey: string; localChunk: ChunkCoordinate;
    terrain?: MapKnowledge["terrainByChunk"][string]; surface?: MapKnowledge["surfaceByChunk"][string];
    underground?: MapUndergroundSample }>[];
  markers: readonly Readonly<{ canonical: MapMarker; localPosition: WorldPoint }>[];
}>;
export type AsteroidMapObservations = Readonly<{
  renderedChunks: readonly MapChunkDiscovery[];
  /** Actual local body positions observed entering a cave, not inferred layers. */
  caveVisits: readonly Readonly<{ position: WorldPoint; biome: string }>[];
}>;
const mapFields = { schema: true, worldId: true, playerId: true, revision: true, exploredChunks: true, terrainByChunk: true,
  surfaceByChunk: true, undergroundByChunk: true, markers: true, activeBedId: true, fastTravelCharges: true } satisfies Record<keyof MapKnowledge, true>;
const discoveryFields = { x: true, z: true, biome: true, surfaceColors: true } satisfies Record<keyof MapChunkDiscovery, true>;

function validateMap(frame: AsteroidAttachmentFrame, state: MapKnowledge) {
  canonicalJson(state); assertExactKeys(state, Object.keys(mapFields), "Attached map knowledge");
  if (state.worldId !== `location:${frame.orbitId}` || !Number.isSafeInteger(state.revision) || state.revision < 0
    || canonicalJson(normalizeMapKnowledge(state, state.worldId, state.playerId)) !== canonicalJson(state))
    throw Error("Invalid or lossy canonical attached map knowledge.");
  for (const key of state.exploredChunks) asteroidHistoryRegionCoordinates(key, MAP_CHUNK_SIZE);
  for (const marker of state.markers) {
    assertExactKeys(marker.position, ["x", "y", "z"], "Attached map marker position");
    if (!Object.values(marker.position).every(Number.isFinite)) throw Error("Invalid attached map marker position.");
  }
}

/** Grid alignment is exact in XZ. The centered negative edge touches half a
 * cell in the preceding chart chunk; do not drop that already-known strip. */
export function asteroidMapCanonicalChunk(frame: AsteroidAttachmentFrame, chunk: ChunkCoordinate): ChunkCoordinate {
  assertExactKeys(chunk, ["x", "z"], "Local map chunk");
  if (![chunk.x, chunk.z, frame.offset.x / MAP_CHUNK_SIZE, frame.offset.z / MAP_CHUNK_SIZE].every(Number.isSafeInteger))
    throw Error("Invalid local map chunk or frame alignment.");
  const result = { x: chunk.x + frame.offset.x / MAP_CHUNK_SIZE, z: chunk.z + frame.offset.z / MAP_CHUNK_SIZE };
  if (!asteroidHistoryRegionTouches(frame, `${result.x},${result.z}`, MAP_CHUNK_SIZE)) throw Error("Map observation is outside the attached frame.");
  return result;
}
/** Depth bands belong to the original world elevation, not the display origin. */
export function asteroidMapDepthBand(frame: AsteroidAttachmentFrame, localY: number) {
  if (!Number.isFinite(localY) || localY < frame.localBounds.minY - .5 || localY >= frame.localBounds.maxY + .5)
    throw Error("Map depth query is outside the attached frame.");
  return undergroundDepthBandForY(localY + frame.offset.y);
}
export function projectAsteroidMap(frame: AsteroidAttachmentFrame, canonical: MapKnowledge): AsteroidMapView {
  validateMap(frame, canonical);
  const chunks: AsteroidMapView["chunks"][number][] = [];
  for (const key of canonical.exploredChunks) if (asteroidHistoryRegionTouches(frame, key, MAP_CHUNK_SIZE)) {
    const [x, z] = asteroidHistoryRegionCoordinates(key, MAP_CHUNK_SIZE);
    chunks.push({ canonicalKey: key, localChunk: { x: x - frame.offset.x / MAP_CHUNK_SIZE, z: z - frame.offset.z / MAP_CHUNK_SIZE },
      ...(Object.hasOwn(canonical.terrainByChunk, key) ? { terrain: canonical.terrainByChunk[key] } : {}),
      ...(Object.hasOwn(canonical.surfaceByChunk, key) ? { surface: canonical.surfaceByChunk[key] } : {}),
      ...(Object.hasOwn(canonical.undergroundByChunk, key) ? { underground: canonical.undergroundByChunk[key] } : {}) });
  }
  const markers = canonical.markers.filter(marker => asteroidAttachmentContainsPosition(frame, marker.position, "orbit"))
    .map(marker => ({ canonical: marker, localPosition: rebaseAsteroidPosition(frame, marker.position, "orbit") }));
  return freezeUniverseJson(cloneUniverseJson({ frameId: frame.frameId, canonicalWorldId: canonical.worldId,
    canonicalPlayerId: canonical.playerId, canonicalRevision: canonical.revision, sourceBaseline: canonicalJson(canonical), chunks, markers }));
}

/** Host-observed discovery data merge using the original canonical reducers.
 * The host must separately prove actual rendered chunks/cave entry and bind the
 * current actor/owner revision atomically. This is NOT a guest command, map
 * sharing grant, fast-travel action, bed change, or arbitrary map replacement. */
export function recordAsteroidMapObservations(frame: AsteroidAttachmentFrame, canonical: MapKnowledge,
  baseline: AsteroidMapView, observations: AsteroidMapObservations): MapKnowledge {
  if (canonicalJson(projectAsteroidMap(frame, canonical)) !== canonicalJson(baseline)) throw Error("Stale attached map view.");
  canonicalJson(observations); assertExactKeys(observations, ["renderedChunks", "caveVisits"], "Attached map observations");
  if (!Array.isArray(observations.renderedChunks) || !Array.isArray(observations.caveVisits)) throw Error("Invalid attached map observations.");
  const chunks = observations.renderedChunks.map(chunk => {
    if (!isUniverseRecord(chunk) || typeof chunk.x !== "number" || typeof chunk.z !== "number"
      || Object.keys(chunk).some(key => !Object.hasOwn(discoveryFields, key))) throw Error("Unsupported attached chunk observation.");
    const position = asteroidMapCanonicalChunk(frame, { x: chunk.x, z: chunk.z });
    if (chunk.biome !== undefined && chunk.biome !== null && !(typeof chunk.biome === "number" && Number.isInteger(chunk.biome)
      && chunk.biome >= 0 && chunk.biome <= 65535) && !validBiome(chunk.biome)) throw Error("Invalid attached observed biome.");
    if (chunk.surfaceColors !== undefined && chunk.surfaceColors !== null && (!Array.isArray(chunk.surfaceColors) || chunk.surfaceColors.length !== 4
      || chunk.surfaceColors.some(color => typeof color !== "string" || !/^#[0-9a-f]{6}$/.test(color)))) throw Error("Invalid attached observed surface.");
    return { ...cloneUniverseJson(chunk), ...position };
  });
  let result = markChunksRendered(canonical, chunks);
  for (const visit of observations.caveVisits) {
    assertExactKeys(visit, ["position", "biome"], "Attached cave visit");
    assertExactKeys(visit.position, ["x", "y", "z"], "Attached cave visit position");
    if (!validBiome(visit.biome)) throw Error("Invalid attached cave biome.");
    const p = rebaseAsteroidPosition(frame, visit.position, "local");
    result = markUndergroundChunk(result, { x: Math.floor(p.x / MAP_CHUNK_SIZE), z: Math.floor(p.z / MAP_CHUNK_SIZE),
      biome: visit.biome, elevation: Math.floor(p.y) });
  }
  validateMap(frame, result);
  const retained = new Set(result.exploredChunks);
  if (canonical.exploredChunks.some(key => !retained.has(key))) throw Error("Map capacity would discard existing discovery history.");
  if (result.fastTravelCharges !== canonical.fastTravelCharges || result.activeBedId !== canonical.activeBedId
    || result.worldId !== canonical.worldId || result.playerId !== canonical.playerId || canonicalJson(result.markers) !== canonicalJson(canonical.markers))
    throw Error("Map observations changed unrelated canonical authority.");
  return cloneUniverseJson(result);
}
function validBiome(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 48 && value === value.trim().replace(/\s+/gu, " ");
}
