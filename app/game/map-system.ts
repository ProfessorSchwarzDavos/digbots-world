import { parseLocationId } from "./location-address";

export const MAP_SCHEMA = 1 as const;
export const CARTOGRAPHY_SCHEMA = 1 as const;
export const MAP_CHUNK_SIZE = 16;
export const MAX_EXPLORED_CHUNKS = 262_144;
export const MAX_MAP_MARKERS = 4_096;
export const MAX_FAST_TRAVEL_CHARGES = 999;
export const FAST_TRAVEL_DEFAULT_CHARGE_COST = 1;
export const FAST_TRAVEL_MANUAL_CHARGE_COST = 2;
export const FAST_TRAVEL_CHANNEL_SECONDS = 5;
export const FAST_TRAVEL_STILL_RADIUS = 0.12;
export const WAYSHRINE_USE_RADIUS = 3.5;
export const MAP_VIEW_SCHEMA = 1 as const;
export const MIN_MAP_ZOOM = 0.05;
export const MAX_MAP_ZOOM = 12;
export const ABSOLUTE_MIN_MAP_ZOOM = 0.01;
export const MAX_MAP_PAN_CHUNKS = 1_048_576;
export const DEFAULT_MAP_OPEN_SPAN_BLOCKS = 1_024;
export const MAP_WATER_SURFACE_COLOR = "#3e83c6";

export type WorldPoint = Readonly<{ x: number; y: number; z: number }>;
export type ChunkCoordinate = Readonly<{ x: number; z: number }>;
export type MapBiomeReference = number | string;
export type MapSurfaceSample = readonly [string, string, string, string];
export type UndergroundDepthBand = "upper" | "middle" | "deep";
export type MapUndergroundBandSample = Readonly<{
  biome: string;
  elevation: number;
}>;
export type MapUndergroundSample = Readonly<{
  biome: string;
  elevation: number;
  /** New saves retain one explored sample per depth band without revealing adjacent caves. */
  bands?: Readonly<Partial<Record<UndergroundDepthBand, MapUndergroundBandSample>>>;
}>;
export type MapChunkDiscovery = ChunkCoordinate & Readonly<{
  biome?: MapBiomeReference | null;
  /** Four averaged top-block colors: northwest, northeast, southwest, southeast. */
  surfaceColors?: MapSurfaceSample | null;
}>;
export type MapTerrainPalette = Readonly<{
  fill: string;
  stroke: string;
  label: string;
  water: boolean;
}>;
export type MapViewState = Readonly<{
  schema: typeof MAP_VIEW_SCHEMA;
  zoom: number;
  panX: number;
  panZ: number;
}>;
export type MapZoomLimits = Readonly<{ minimum?: number; maximum?: number }>;
export type MapViewportBounds = Readonly<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
export type MapViewportProjection = Readonly<{
  scale: number;
  offsetX: number;
  offsetY: number;
  contentWidth: number;
  contentHeight: number;
}>;
export type MapPlayerMarker = Readonly<{
  id: string;
  name: string;
  position: WorldPoint;
  headingRadians?: number;
  color?: string;
}>;
export type MapMarkerKind = "natural-poi" | "manual" | "bed-spawn" | "wayshrine" | "settlement";
export type MapMarkerLayer = "surface" | "underground" | "underwater" | "sky";
export type SettlementKnowledge = "rumored" | "charted" | "visited";

export type MapMarker = Readonly<{
  id: string;
  kind: MapMarkerKind;
  name: string;
  position: WorldPoint;
  discoveredAt: number;
  updatedAt: number;
  discoveredBy: string;
  ownerId: string | null;
  icon: string | null;
  layer: MapMarkerLayer;
  settlementKnowledge?: SettlementKnowledge;
  factionId?: string;
  settlementSize?: "hamlet" | "village" | "town";
}>;

export type MapKnowledge = Readonly<{
  schema: typeof MAP_SCHEMA;
  worldId: string;
  playerId: string;
  revision: number;
  exploredChunks: readonly string[];
  /**
   * Sparse biome samples captured when a chunk first reaches the render
   * horizon. Missing entries are valid legacy data and use the land palette.
   */
  terrainByChunk: Readonly<Record<string, MapBiomeReference>>;
  /** Optional close-zoom ink; sampled once in a small bounded background budget. */
  surfaceByChunk: Readonly<Record<string, MapSurfaceSample>>;
  /** Sparse cave-biome knowledge. A chunk appears here only after it is entered underground. */
  undergroundByChunk: Readonly<Record<string, MapUndergroundSample>>;
  markers: readonly MapMarker[];
  activeBedId: string | null;
  fastTravelCharges: number;
}>;

export type MarkerInput = Readonly<{
  id: string;
  name: string;
  position: WorldPoint;
  playerId: string;
  discoveredAt: number;
  icon?: string | null;
  layer?: MapMarkerLayer;
  updatedAt?: number;
  settlementKnowledge?: SettlementKnowledge;
  factionId?: string;
  settlementSize?: "hamlet" | "village" | "town";
}>;

export type CartographySession = Readonly<{
  schema: typeof CARTOGRAPHY_SCHEMA;
  tableId: string;
  participants: readonly string[];
  revision: number;
}>;

export type FastTravelMode = "map-charge" | "wayshrine-network";
export type FastTravelChannelStatus = "channeling" | "completed" | "cancelled";

export type FastTravelChannel = Readonly<{
  id: string;
  mode: FastTravelMode;
  destinationId: string;
  destination: WorldPoint;
  originWayshrineId: string | null;
  origin: WorldPoint;
  startedAt: number;
  durationSeconds: typeof FAST_TRAVEL_CHANNEL_SECONDS;
  chargeCost: number;
  damageRevision: number;
  status: FastTravelChannelStatus;
  cancelledReason: "moved" | "damaged" | null;
}>;

const finite = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const integer = (value: unknown, fallback = 0) => Math.trunc(finite(value, fallback));
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const cleanId = (value: unknown, fallback: string) => {
  const cleaned = typeof value === "string" ? value.trim().replace(/[^a-zA-Z0-9:_-]+/gu, "-").slice(0, 96) : "";
  return cleaned || fallback;
};
// Location ownership is a canonical tuple, not a display slug. Slugging or
// truncating it would alias different bodies/instances in the same universe.
const mapWorldId = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.startsWith("location:")) {
    parseLocationId(value.slice("location:".length));
    return value;
  }
  return cleanId(value, fallback);
};
const cleanName = (value: unknown, fallback: string) => {
  const cleaned = typeof value === "string" ? value.trim().replace(/\s+/gu, " ").slice(0, 48) : "";
  return cleaned || fallback;
};
const cleanPoint = (value: Partial<WorldPoint> | null | undefined): WorldPoint => ({
  x: finite(value?.x),
  y: finite(value?.y),
  z: finite(value?.z),
});
const distanceSquared = (left: WorldPoint, right: WorldPoint) => (
  (left.x - right.x) ** 2 + (left.y - right.y) ** 2 + (left.z - right.z) ** 2
);

const BIOME_TERRAIN_PALETTES: Readonly<Record<number, MapTerrainPalette>> = Object.freeze({
  0: { fill: "#315f82", stroke: "#244866", label: "Deep ocean", water: true },
  1: { fill: "#4f86a7", stroke: "#376a8b", label: "Ocean", water: true },
  2: { fill: "#c9aa68", stroke: "#9e7f45", label: "Coast", water: false },
  3: { fill: "#668d52", stroke: "#496a3c", label: "Meadow", water: false },
  4: { fill: "#3f7046", stroke: "#315a39", label: "Forest", water: false },
  5: { fill: "#789282", stroke: "#586f65", label: "Cold forest", water: false },
  6: { fill: "#c99c52", stroke: "#9f7137", label: "Desert", water: false },
  7: { fill: "#9b9b4d", stroke: "#737435", label: "Savanna", water: false },
  8: { fill: "#57795e", stroke: "#3c5b45", label: "Swamp", water: false },
  9: { fill: "#d4ded8", stroke: "#a5b6b1", label: "Snowfield", water: false },
  10: { fill: "#aa704d", stroke: "#7c4e38", label: "Badlands", water: false },
  11: { fill: "#88a76c", stroke: "#627f4c", label: "Birch grove", water: false },
  12: { fill: "#719959", stroke: "#50733f", label: "Bloomwood", water: false },
  13: { fill: "#7c876c", stroke: "#5d6752", label: "Highlands", water: false },
  14: { fill: "#705b57", stroke: "#4c3e3d", label: "Volcanic", water: false },
  15: { fill: "#665f70", stroke: "#484252", label: "Mushroom fen", water: false },
  16: { fill: "#5d94b0", stroke: "#3c718d", label: "River", water: true },
  17: { fill: "#789c76", stroke: "#577756", label: "Cloudreed glen", water: false },
  18: { fill: "#32744f", stroke: "#24593c", label: "Rainveil jungle", water: false },
  19: { fill: "#c1849b", stroke: "#996477", label: "Sakurabloom grove", water: false },
  20: { fill: "#274f79", stroke: "#1b385d", label: "Lumen trench", water: true },
  21: { fill: "#c46fa5", stroke: "#984f7d", label: "Sugarplum vale", water: false },
  22: { fill: "#4b8978", stroke: "#326a5c", label: "Glimmerwood", water: false },
  23: { fill: "#becbc6", stroke: "#899b97", label: "Snowcap range", water: false },
});

const DEFAULT_LAND_PALETTE: MapTerrainPalette = Object.freeze({
  fill: "#668252",
  stroke: "#4b623d",
  label: "Uncharted land",
  water: false,
});

const NAMED_TERRAIN_HINTS: ReadonlyArray<readonly [RegExp, number]> = Object.freeze([
  [/deep.?ocean|abyss|trench|lumen/iu, 20],
  [/ocean|sea|water/iu, 1],
  [/river/iu, 16],
  [/coast|beach|sunwash/iu, 2],
  [/sugar|sweet|candy|pink/iu, 21],
  [/sakura|cherry/iu, 19],
  [/glimmer|wood.?elf|biolum/iu, 22],
  [/snowcap|dwarf|mountain/iu, 23],
  [/snow|frost|ice/iu, 9],
  [/desert|sand/iu, 6],
  [/badland/iu, 10],
  [/volcan|ember|ash/iu, 14],
  [/swamp|fen|mushroom/iu, 8],
  [/jungle|rainveil/iu, 18],
  [/forest|wood|grove/iu, 4],
  [/meadow|field|land/iu, 3],
]);

function normalizeBiomeReference(value: unknown): MapBiomeReference | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 65_535) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/gu, " ").slice(0, 48);
  return cleaned || null;
}

function normalizeMapColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const short = /^#([0-9a-f]{3})$/iu.exec(value.trim());
  if (short) return `#${[...short[1]].map((part) => `${part}${part}`).join("")}`.toLowerCase();
  const full = /^#([0-9a-f]{6})$/iu.exec(value.trim());
  return full ? `#${full[1].toLowerCase()}` : null;
}

function normalizeSurfaceSample(value: unknown): MapSurfaceSample | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const colors = value.map(normalizeMapColor);
  return colors.every((entry): entry is string => entry !== null)
    ? [colors[0], colors[1], colors[2], colors[3]]
    : null;
}

export function undergroundDepthBandForY(elevation: number): UndergroundDepthBand {
  return elevation >= -4 ? "upper" : elevation >= -32 ? "middle" : "deep";
}

/** Surface parchment includes water and sky landmarks; cave knowledge remains tied to entered depth bands. */
export function mapMarkerMatchesLayer(marker: Pick<MapMarker, "layer" | "position">, underground: boolean, band: UndergroundDepthBand) {
  if (underground) return marker.layer === "underground" && undergroundDepthBandForY(marker.position.y) === band;
  return marker.layer !== "underground";
}

function normalizeUndergroundBandSample(value: unknown): MapUndergroundBandSample | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<MapUndergroundBandSample>;
  const biome = cleanName(input.biome, "");
  if (!biome) return null;
  return { biome, elevation: clamp(integer(input.elevation), -64, 255) };
}

function normalizeUndergroundSample(value: unknown): MapUndergroundSample | null {
  const base = normalizeUndergroundBandSample(value);
  if (!base) return null;
  const rawBands = (value as Partial<MapUndergroundSample>).bands;
  if (!rawBands || typeof rawBands !== "object" || Array.isArray(rawBands)) return base;
  const bands: Partial<Record<UndergroundDepthBand, MapUndergroundBandSample>> = {};
  for (const band of ["upper", "middle", "deep"] as const) {
    const sample = normalizeUndergroundBandSample(rawBands[band]);
    if (sample) bands[band] = sample;
  }
  return Object.keys(bands).length ? { ...base, bands } : base;
}

export function undergroundSampleForBand(sample: MapUndergroundSample | null | undefined, band: UndergroundDepthBand) {
  if (!sample) return null;
  return sample.bands?.[band] ?? (undergroundDepthBandForY(sample.elevation) === band ? { biome: sample.biome, elevation: sample.elevation } : null);
}

/** Small RGB average used by the engine's bounded top-block survey sampler. */
export function averageMapColors(colors: readonly string[], fallback = "#668252") {
  const parsed = colors.map(normalizeMapColor).filter((entry): entry is string => entry !== null);
  if (!parsed.length) return normalizeMapColor(fallback) ?? "#668252";
  const totals = parsed.reduce((sum, color) => ({
    r: sum.r + Number.parseInt(color.slice(1, 3), 16),
    g: sum.g + Number.parseInt(color.slice(3, 5), 16),
    b: sum.b + Number.parseInt(color.slice(5, 7), 16),
  }), { r: 0, g: 0, b: 0 });
  const channel = (value: number) => Math.round(value / parsed.length).toString(16).padStart(2, "0");
  return `#${channel(totals.r)}${channel(totals.g)}${channel(totals.b)}`;
}

/** Water owns a detailed-map cell whenever any bounded sample sees it. */
export function mapSurfaceQuadrantColor(colors: readonly string[], containsWater: boolean) {
  return containsWater ? MAP_WATER_SURFACE_COLOR : averageMapColors(colors);
}

/** Stable map ink for numeric biome ids and future content-pack biome names. */
export function mapTerrainPalette(biome: MapBiomeReference | null | undefined): MapTerrainPalette {
  if (typeof biome === "number") return BIOME_TERRAIN_PALETTES[biome] ?? DEFAULT_LAND_PALETTE;
  if (typeof biome === "string") {
    const numeric = Number(biome);
    if (Number.isInteger(numeric) && BIOME_TERRAIN_PALETTES[numeric]) return BIOME_TERRAIN_PALETTES[numeric];
    const match = NAMED_TERRAIN_HINTS.find(([pattern]) => pattern.test(biome));
    if (match) return BIOME_TERRAIN_PALETTES[match[1]];
  }
  return DEFAULT_LAND_PALETTE;
}

export function createMapViewState(): MapViewState {
  return { schema: MAP_VIEW_SCHEMA, zoom: 1, panX: 0, panZ: 0 };
}

/** The map always opens to a predictable square around the player. */
export function mapOpeningBounds(currentChunkX: number, currentChunkZ: number, spanBlocks = DEFAULT_MAP_OPEN_SPAN_BLOCKS): MapViewportBounds {
  const spanChunks = Math.max(8, Math.round(Math.max(MAP_CHUNK_SIZE, finite(spanBlocks, DEFAULT_MAP_OPEN_SPAN_BLOCKS)) / MAP_CHUNK_SIZE));
  const half = spanChunks / 2;
  const centerX = finite(currentChunkX);
  const centerZ = finite(currentChunkZ);
  return { minX: centerX - half, maxX: centerX + half, minZ: centerZ - half, maxZ: centerZ + half };
}

/** Old, missing and malformed view state starts at the authored default scale. */
function normalizedZoomLimits(limits: MapZoomLimits = {}) {
  const minimum = clamp(finite(limits.minimum, MIN_MAP_ZOOM), ABSOLUTE_MIN_MAP_ZOOM, MAX_MAP_ZOOM);
  const maximum = clamp(finite(limits.maximum, MAX_MAP_ZOOM), minimum, MAX_MAP_ZOOM);
  return { minimum, maximum };
}

export function normalizeMapViewState(value: unknown, limits: MapZoomLimits = {}): MapViewState {
  if (!value || typeof value !== "object") return createMapViewState();
  const input = value as Partial<MapViewState>;
  if (input.schema !== MAP_VIEW_SCHEMA) return createMapViewState();
  const resolved = normalizedZoomLimits(limits);
  return {
    schema: MAP_VIEW_SCHEMA,
    zoom: clamp(finite(input.zoom, 1), resolved.minimum, resolved.maximum),
    panX: clamp(finite(input.panX), -MAX_MAP_PAN_CHUNKS, MAX_MAP_PAN_CHUNKS),
    panZ: clamp(finite(input.panZ), -MAX_MAP_PAN_CHUNKS, MAX_MAP_PAN_CHUNKS),
  };
}

export function setMapZoom(state: MapViewState, zoom: number, limits: MapZoomLimits = {}): MapViewState {
  const resolved = normalizedZoomLimits(limits);
  const normalized = normalizeMapViewState(state, resolved);
  const nextZoom = clamp(finite(zoom, normalized.zoom), resolved.minimum, resolved.maximum);
  return nextZoom === normalized.zoom ? normalized : { ...normalized, zoom: nextZoom };
}

export function stepMapZoom(state: MapViewState, direction: 1 | -1, limits: MapZoomLimits = {}): MapViewState {
  const factor = direction > 0 ? 1.35 : 1 / 1.35;
  return setMapZoom(state, state.zoom * factor, limits);
}

export function panMapView(state: MapViewState, deltaX: number, deltaZ: number, limits: MapZoomLimits = {}): MapViewState {
  const normalized = normalizeMapViewState(state, limits);
  return normalizeMapViewState({
    ...normalized,
    panX: normalized.panX + finite(deltaX),
    panZ: normalized.panZ + finite(deltaZ),
  }, limits);
}

/**
 * Panning is intentionally independent of explored bounds. The parchment is a
 * viewport over world coordinates, not a movable image cropped to yesterday's
 * discovery shape.
 */
export function constrainMapViewState(_base: MapViewportBounds, state: MapViewState, limits: MapZoomLimits = {}): MapViewState {
  return normalizeMapViewState(state, limits);
}

/** Keeps x and z in chunk space; zoom changes only the visible span. */
export function mapViewportBounds(base: MapViewportBounds, state: MapViewState, limits: MapZoomLimits = {}): MapViewportBounds {
  const view = normalizeMapViewState(state, limits);
  const baseWidth = Math.max(1, finite(base.maxX) - finite(base.minX));
  const baseHeight = Math.max(1, finite(base.maxZ) - finite(base.minZ));
  const width = baseWidth / view.zoom;
  const height = baseHeight / view.zoom;
  const centerX = (finite(base.minX) + finite(base.maxX)) / 2 + view.panX;
  const centerZ = (finite(base.minZ) + finite(base.maxZ)) / 2 + view.panZ;
  return {
    minX: centerX - width / 2,
    maxX: centerX + width / 2,
    minZ: centerZ - height / 2,
    maxZ: centerZ + height / 2,
  };
}

/** One shared scale keeps map chunks square regardless of the panel aspect ratio. */
export function mapViewportProjection(
  bounds: MapViewportBounds,
  viewportWidth: number,
  viewportHeight: number,
): MapViewportProjection {
  const width = Math.max(1, finite(viewportWidth, 1));
  const height = Math.max(1, finite(viewportHeight, 1));
  const chunkWidth = Math.max(1, finite(bounds.maxX) - finite(bounds.minX));
  const chunkHeight = Math.max(1, finite(bounds.maxZ) - finite(bounds.minZ));
  const scale = Math.max(Number.EPSILON, Math.min(width / chunkWidth, height / chunkHeight));
  const contentWidth = chunkWidth * scale;
  const contentHeight = chunkHeight * scale;
  return {
    scale,
    contentWidth,
    contentHeight,
    offsetX: (width - contentWidth) / 2,
    offsetY: (height - contentHeight) / 2,
  };
}

export function projectMapWorldPoint(
  position: Pick<WorldPoint, "x" | "z">,
  bounds: MapViewportBounds,
  viewportWidth: number,
  viewportHeight: number,
) {
  const projection = mapViewportProjection(bounds, viewportWidth, viewportHeight);
  return {
    x: projection.offsetX + (finite(position.x) / MAP_CHUNK_SIZE - bounds.minX) * projection.scale,
    y: projection.offsetY + (finite(position.z) / MAP_CHUNK_SIZE - bounds.minZ) * projection.scale,
  };
}

export function mapChunkAtViewportPoint(
  pixelX: number,
  pixelY: number,
  bounds: MapViewportBounds,
  viewportWidth: number,
  viewportHeight: number,
): ChunkCoordinate | null {
  const projection = mapViewportProjection(bounds, viewportWidth, viewportHeight);
  const localX = finite(pixelX) - projection.offsetX;
  const localY = finite(pixelY) - projection.offsetY;
  if (localX < 0 || localY < 0 || localX >= projection.contentWidth || localY >= projection.contentHeight) return null;
  return {
    x: Math.floor(bounds.minX + localX / projection.scale),
    z: Math.floor(bounds.minZ + localY / projection.scale),
  };
}

export function chunkKey(chunk: ChunkCoordinate) {
  return `${integer(chunk.x)},${integer(chunk.z)}`;
}

export function parseChunkKey(key: string): ChunkCoordinate | null {
  const match = /^(-?\d+),(-?\d+)$/u.exec(key);
  if (!match) return null;
  return { x: Number(match[1]), z: Number(match[2]) };
}

/** Culls the terrain layer before React/canvas work; zoomed views never scan the DOM. */
export function mapChunksInViewport(
  exploredChunks: readonly string[],
  bounds: MapViewportBounds,
  padding = 0,
) {
  const margin = Math.max(0, finite(padding));
  const result: Array<ChunkCoordinate & Readonly<{ key: string }>> = [];
  for (const key of exploredChunks) {
    const chunk = parseChunkKey(key);
    if (!chunk || chunk.x + 1 < bounds.minX - margin || chunk.x > bounds.maxX + margin
      || chunk.z + 1 < bounds.minZ - margin || chunk.z > bounds.maxZ + margin) continue;
    result.push({ ...chunk, key });
  }
  return result;
}

export function chunkAtWorldPosition(position: Pick<WorldPoint, "x" | "z">, chunkSize = MAP_CHUNK_SIZE): ChunkCoordinate {
  const size = Math.max(1, integer(chunkSize, MAP_CHUNK_SIZE));
  return { x: Math.floor(finite(position.x) / size), z: Math.floor(finite(position.z) / size) };
}

export function createMapKnowledge(worldId: string, playerId: string): MapKnowledge {
  return {
    schema: MAP_SCHEMA,
    worldId: mapWorldId(worldId, "world"),
    playerId: cleanId(playerId, "player"),
    revision: 0,
    exploredChunks: [],
    terrainByChunk: {},
    surfaceByChunk: {},
    undergroundByChunk: {},
    markers: [],
    activeBedId: null,
    fastTravelCharges: 0,
  };
}

function normalizeMarker(value: unknown): MapMarker | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<MapMarker>;
  if (!(input.kind === "natural-poi" || input.kind === "manual" || input.kind === "bed-spawn" || input.kind === "wayshrine" || input.kind === "settlement")) return null;
  const id = cleanId(input.id, "");
  if (!id) return null;
  const position = cleanPoint(input.position);
  const layer: MapMarkerLayer = input.layer === "surface" || input.layer === "underground"
    || input.layer === "underwater" || input.layer === "sky"
    ? input.layer
    : position.y < 24 ? "underground" : "surface";
  return {
    id,
    kind: input.kind,
    name: cleanName(input.name, input.kind === "bed-spawn" ? "Bed Spawn" : "Map Marker"),
    position,
    discoveredAt: Math.max(0, integer(input.discoveredAt)),
    updatedAt: Math.max(0, integer(input.updatedAt, integer(input.discoveredAt))),
    discoveredBy: cleanId(input.discoveredBy, "unknown"),
    ownerId: input.ownerId === null ? null : cleanId(input.ownerId, "unknown"),
    icon: typeof input.icon === "string" ? input.icon.slice(0, 48) : null,
    layer,
    ...(input.kind === "settlement" ? {
      settlementKnowledge: input.settlementKnowledge === "visited" || input.settlementKnowledge === "charted" ? input.settlementKnowledge : "rumored",
      ...(typeof input.factionId === "string" ? { factionId: input.factionId.slice(0, 48) } : {}),
      ...(input.settlementSize === "hamlet" || input.settlementSize === "village" || input.settlementSize === "town" ? { settlementSize: input.settlementSize } : {}),
    } : {}),
  };
}

export function normalizeMapKnowledge(value: unknown, fallbackWorldId = "world", fallbackPlayerId = "player"): MapKnowledge {
  if (!value || typeof value !== "object") return createMapKnowledge(fallbackWorldId, fallbackPlayerId);
  const input = value as Partial<MapKnowledge>;
  const exploredChunks = [...new Set((Array.isArray(input.exploredChunks) ? input.exploredChunks : [])
    .filter((entry): entry is string => typeof entry === "string" && parseChunkKey(entry) !== null))]
    .sort()
    .slice(0, MAX_EXPLORED_CHUNKS);
  const exploredSet = new Set(exploredChunks);
  const rawTerrain = input.terrainByChunk && typeof input.terrainByChunk === "object" && !Array.isArray(input.terrainByChunk)
    ? input.terrainByChunk
    : ((input as Partial<MapKnowledge> & { chunkBiomes?: unknown }).chunkBiomes ?? {});
  const terrainEntries: Array<readonly [string, MapBiomeReference]> = [];
  if (rawTerrain && typeof rawTerrain === "object" && !Array.isArray(rawTerrain)) {
    for (const [key, rawBiome] of Object.entries(rawTerrain as Record<string, unknown>)) {
      if (terrainEntries.length >= MAX_EXPLORED_CHUNKS || !exploredSet.has(key) || !parseChunkKey(key)) continue;
      const biome = normalizeBiomeReference(rawBiome);
      if (biome !== null) terrainEntries.push([key, biome]);
    }
  }
  terrainEntries.sort(([left], [right]) => left.localeCompare(right));
  const terrainByChunk = Object.fromEntries(terrainEntries);
  const surfaceEntries: Array<readonly [string, MapSurfaceSample]> = [];
  const rawSurface = input.surfaceByChunk && typeof input.surfaceByChunk === "object" && !Array.isArray(input.surfaceByChunk)
    ? input.surfaceByChunk
    : {};
  for (const [key, rawSample] of Object.entries(rawSurface as Record<string, unknown>)) {
    if (surfaceEntries.length >= MAX_EXPLORED_CHUNKS || !exploredSet.has(key) || !parseChunkKey(key)) continue;
    const sample = normalizeSurfaceSample(rawSample);
    if (sample) surfaceEntries.push([key, sample]);
  }
  surfaceEntries.sort(([left], [right]) => left.localeCompare(right));
  const surfaceByChunk = Object.fromEntries(surfaceEntries);
  const undergroundEntries: Array<readonly [string, MapUndergroundSample]> = [];
  const rawUnderground = input.undergroundByChunk && typeof input.undergroundByChunk === "object" && !Array.isArray(input.undergroundByChunk)
    ? input.undergroundByChunk
    : {};
  for (const [key, rawSample] of Object.entries(rawUnderground as Record<string, unknown>)) {
    if (undergroundEntries.length >= MAX_EXPLORED_CHUNKS || !exploredSet.has(key) || !parseChunkKey(key)) continue;
    const sample = normalizeUndergroundSample(rawSample);
    if (sample) undergroundEntries.push([key, sample]);
  }
  undergroundEntries.sort(([left], [right]) => left.localeCompare(right));
  const undergroundByChunk = Object.fromEntries(undergroundEntries);
  const markerById = new Map<string, MapMarker>();
  for (const raw of Array.isArray(input.markers) ? input.markers : []) {
    const marker = normalizeMarker(raw);
    if (!marker) continue;
    const previous = markerById.get(marker.id);
    if (!previous || compareMarkerFreshness(marker, previous) > 0) markerById.set(marker.id, marker);
    if (markerById.size >= MAX_MAP_MARKERS) break;
  }
  const markers = [...markerById.values()].sort((left, right) => left.id.localeCompare(right.id));
  const activeBedId = typeof input.activeBedId === "string"
    && markers.some((marker) => marker.id === input.activeBedId && marker.kind === "bed-spawn")
    ? input.activeBedId
    : null;
  return {
    schema: MAP_SCHEMA,
    worldId: mapWorldId(input.worldId, mapWorldId(fallbackWorldId, "world")),
    playerId: cleanId(input.playerId, cleanId(fallbackPlayerId, "player")),
    revision: Math.max(0, integer(input.revision)),
    exploredChunks,
    terrainByChunk,
    surfaceByChunk,
    undergroundByChunk,
    markers,
    activeBedId,
    fastTravelCharges: clamp(integer(input.fastTravelCharges), 0, MAX_FAST_TRAVEL_CHARGES),
  };
}

/** Call once when a chunk becomes renderable; repeated renders are idempotent. */
export function markChunkRendered(state: MapKnowledge, chunk: MapChunkDiscovery): MapKnowledge {
  return markChunksRendered(state, [chunk]);
}

const EXPLORED_CHUNK_SET_CACHE = new WeakMap<readonly string[], ReadonlySet<string>>();

function exploredChunkSet(chunks: readonly string[]) {
  const cached = EXPLORED_CHUNK_SET_CACHE.get(chunks);
  if (cached) return cached;
  const created = new Set(chunks);
  EXPLORED_CHUNK_SET_CACHE.set(chunks, created);
  return created;
}

function surfaceSamplesEqual(left: MapSurfaceSample | undefined, right: MapSurfaceSample | null) {
  return right === null || (left !== undefined
    && left[0] === right[0] && left[1] === right[1] && left[2] === right[2] && left[3] === right[3]);
}

/**
 * Batches a render-distance ring into one revision. The common steady-state
 * path performs only cached membership lookups and does not clone or sort the
 * complete explored map every 720 ms.
 */
export function markChunksRendered(state: MapKnowledge, chunks: readonly MapChunkDiscovery[]): MapKnowledge {
  if (!chunks.length) return state;
  const known = exploredChunkSet(state.exploredChunks);
  const newKeys = new Set<string>();
  const pending = new Map<string, Readonly<{
    biome: MapBiomeReference | null;
    surface: MapSurfaceSample | null;
  }>>();
  let projectedSize = known.size;
  for (const chunk of chunks) {
    const key = chunkKey(chunk);
    const isKnown = known.has(key) || newKeys.has(key);
    if (!isKnown) {
      if (projectedSize >= MAX_EXPLORED_CHUNKS) continue;
      newKeys.add(key);
      projectedSize += 1;
    }
    const biome = normalizeBiomeReference(chunk.biome);
    const surface = normalizeSurfaceSample(chunk.surfaceColors);
    const biomeChanged = biome !== null && state.terrainByChunk?.[key] !== biome;
    const surfaceChanged = !surfaceSamplesEqual(state.surfaceByChunk?.[key], surface);
    if (!isKnown || biomeChanged || surfaceChanged) pending.set(key, { biome, surface });
  }
  if (!pending.size) return state;

  const terrainChanged = [...pending.entries()].some(([key, entry]) => entry.biome !== null && state.terrainByChunk?.[key] !== entry.biome);
  const surfaceChanged = [...pending.entries()].some(([key, entry]) => !surfaceSamplesEqual(state.surfaceByChunk?.[key], entry.surface));
  const terrainByChunk: Readonly<Record<string, MapBiomeReference>> = terrainChanged
    ? { ...(state.terrainByChunk ?? {}) }
    : state.terrainByChunk;
  const surfaceByChunk: Readonly<Record<string, MapSurfaceSample>> = surfaceChanged
    ? { ...(state.surfaceByChunk ?? {}) }
    : state.surfaceByChunk;
  if (terrainChanged) for (const [key, entry] of pending) {
    if (entry.biome !== null) (terrainByChunk as Record<string, MapBiomeReference>)[key] = entry.biome;
  }
  if (surfaceChanged) for (const [key, entry] of pending) {
    if (entry.surface) (surfaceByChunk as Record<string, MapSurfaceSample>)[key] = entry.surface;
  }
  const exploredChunks = newKeys.size
    ? [...state.exploredChunks, ...newKeys].sort()
    : state.exploredChunks;
  if (newKeys.size) EXPLORED_CHUNK_SET_CACHE.set(exploredChunks, new Set([...known, ...newKeys]));
  return {
    ...state,
    revision: state.revision + 1,
    exploredChunks,
    terrainByChunk,
    surfaceByChunk,
  };
}

export function markWorldPositionRendered(
  state: MapKnowledge,
  position: Pick<WorldPoint, "x" | "z">,
  chunkSize = MAP_CHUNK_SIZE,
  biome?: MapBiomeReference | null,
) {
  return markChunksRendered(state, [{ ...chunkAtWorldPosition(position, chunkSize), biome }]);
}

/** Records only the cave layer the player has physically entered. */
export function markUndergroundChunk(
  state: MapKnowledge,
  input: ChunkCoordinate & Readonly<{ biome: string; elevation: number }>,
): MapKnowledge {
  const key = chunkKey(input);
  const sample = normalizeUndergroundSample(input);
  if (!sample) return state;
  const withChunk = exploredChunkSet(state.exploredChunks).has(key)
    ? state
    : markChunkRendered(state, input);
  const previous = withChunk.undergroundByChunk?.[key];
  const band = undergroundDepthBandForY(sample.elevation);
  const previousBand = undergroundSampleForBand(previous, band);
  if (previousBand?.biome === sample.biome && previousBand.elevation === sample.elevation) return withChunk;
  const bands = { ...(previous?.bands ?? {}), [band]: sample };
  return {
    ...withChunk,
    revision: withChunk.revision + 1,
    undergroundByChunk: { ...(withChunk.undergroundByChunk ?? {}), [key]: { ...sample, bands } },
  };
}

function compareMarkerFreshness(left: MapMarker, right: MapMarker) {
  if (left.updatedAt !== right.updatedAt) return left.updatedAt - right.updatedAt;
  const leftStable = `${left.kind}|${left.layer}|${left.name}|${left.position.x},${left.position.y},${left.position.z}|${left.discoveredBy}`;
  const rightStable = `${right.kind}|${right.layer}|${right.name}|${right.position.x},${right.position.y},${right.position.z}|${right.discoveredBy}`;
  return leftStable.localeCompare(rightStable);
}

function upsertMarker(state: MapKnowledge, marker: MapMarker): MapKnowledge {
  const normalized = normalizeMapKnowledge(state, state.worldId, state.playerId);
  const existing = normalized.markers.find((entry) => entry.id === marker.id);
  if (existing && compareMarkerFreshness(marker, existing) <= 0) return normalized;
  if (!existing && normalized.markers.length >= MAX_MAP_MARKERS) return normalized;
  const markers = [...normalized.markers.filter((entry) => entry.id !== marker.id), marker]
    .sort((left, right) => left.id.localeCompare(right.id));
  return { ...normalized, revision: normalized.revision + 1, markers };
}

function markerFromInput(kind: MapMarkerKind, input: MarkerInput, ownerId: string | null): MapMarker {
  const discoveredAt = Math.max(0, integer(input.discoveredAt));
  const position = cleanPoint(input.position);
  return {
    id: cleanId(input.id, `${kind}-marker`),
    kind,
    name: cleanName(input.name, kind === "bed-spawn" ? "Bed Spawn" : kind === "wayshrine" ? "Wayshrine" : "Map Marker"),
    position,
    discoveredAt,
    updatedAt: Math.max(discoveredAt, integer(input.updatedAt, discoveredAt)),
    discoveredBy: cleanId(input.playerId, "player"),
    ownerId,
    icon: typeof input.icon === "string" ? input.icon.slice(0, 48) : null,
    layer: input.layer === "surface" || input.layer === "underground" || input.layer === "underwater" || input.layer === "sky"
      ? input.layer
      : position.y < 24 ? "underground" : "surface",
    ...(kind === "settlement" ? {
      settlementKnowledge: input.settlementKnowledge === "visited" || input.settlementKnowledge === "charted" ? input.settlementKnowledge : "rumored",
      ...(typeof input.factionId === "string" ? { factionId: input.factionId.slice(0, 48) } : {}),
      ...(input.settlementSize ? { settlementSize: input.settlementSize } : {}),
    } : {}),
  };
}

export function discoverNaturalPoi(state: MapKnowledge, input: MarkerInput) {
  return upsertMarker(state, markerFromInput("natural-poi", input, null));
}

export function placeManualMapMarker(state: MapKnowledge, input: MarkerInput) {
  return upsertMarker(state, markerFromInput("manual", input, cleanId(input.playerId, state.playerId)));
}

export function discoverSettlement(state: MapKnowledge, input: MarkerInput & Readonly<{ settlementKnowledge: SettlementKnowledge }>) {
  const existing = state.markers.find((marker) => marker.id === input.id && marker.kind === "settlement");
  const rank = (knowledge: SettlementKnowledge | undefined) => knowledge === "visited" ? 3 : knowledge === "charted" ? 2 : 1;
  const settlementKnowledge = rank(existing?.settlementKnowledge) > rank(input.settlementKnowledge)
    ? existing!.settlementKnowledge! : input.settlementKnowledge;
  return upsertMarker(state, markerFromInput("settlement", { ...input, settlementKnowledge }, null));
}

export function placeWayshrine(state: MapKnowledge, input: MarkerInput) {
  return upsertMarker(state, markerFromInput("wayshrine", input, cleanId(input.playerId, state.playerId)));
}

export function setBedSpawn(state: MapKnowledge, input: MarkerInput): MapKnowledge {
  const normalized = normalizeMapKnowledge(state, state.worldId, state.playerId);
  const marker = markerFromInput("bed-spawn", input, normalized.playerId);
  const withoutOldBed = normalized.markers.filter((entry) => entry.id !== normalized.activeBedId && entry.id !== marker.id);
  const markers = [...withoutOldBed, marker].sort((left, right) => left.id.localeCompare(right.id));
  return { ...normalized, revision: normalized.revision + 1, markers, activeBedId: marker.id };
}

export function clearBedSpawn(state: MapKnowledge) {
  const normalized = normalizeMapKnowledge(state, state.worldId, state.playerId);
  if (!normalized.activeBedId) return normalized;
  return {
    ...normalized,
    revision: normalized.revision + 1,
    markers: normalized.markers.filter((marker) => marker.id !== normalized.activeBedId),
    activeBedId: null,
  };
}

export function renameWayshrine(state: MapKnowledge, markerId: string, name: string, updatedAt: number) {
  const normalized = normalizeMapKnowledge(state, state.worldId, state.playerId);
  const marker = normalized.markers.find((entry) => entry.id === markerId);
  if (!marker || marker.kind !== "wayshrine") return normalized;
  return upsertMarker(normalized, { ...marker, name: cleanName(name, marker.name), updatedAt: Math.max(marker.updatedAt + 1, integer(updatedAt)) });
}

export function removeManualMapMarker(state: MapKnowledge, markerId: string) {
  const normalized = normalizeMapKnowledge(state, state.worldId, state.playerId);
  const marker = normalized.markers.find((entry) => entry.id === markerId);
  if (!marker || marker.kind !== "manual") return normalized;
  return { ...normalized, revision: normalized.revision + 1, markers: normalized.markers.filter((entry) => entry.id !== markerId) };
}

export function bankFastTravelCharges(state: MapKnowledge, amount = 1) {
  const normalized = normalizeMapKnowledge(state, state.worldId, state.playerId);
  const fastTravelCharges = clamp(normalized.fastTravelCharges + integer(amount), 0, MAX_FAST_TRAVEL_CHARGES);
  return fastTravelCharges === normalized.fastTravelCharges ? normalized : { ...normalized, revision: normalized.revision + 1, fastTravelCharges };
}

export function createCartographySession(tableId: string, firstPlayerId: string): CartographySession {
  return {
    schema: CARTOGRAPHY_SCHEMA,
    tableId: cleanId(tableId, "cartography-table"),
    participants: [cleanId(firstPlayerId, "player")],
    revision: 0,
  };
}

export function joinCartographySession(session: CartographySession, playerId: string) {
  const id = cleanId(playerId, "player");
  if (session.participants.includes(id)) return { session, joined: true, reason: null } as const;
  if (session.participants.length >= 2) return { session, joined: false, reason: "table-full" } as const;
  return { session: { ...session, participants: [...session.participants, id], revision: session.revision + 1 }, joined: true, reason: null } as const;
}

export function leaveCartographySession(session: CartographySession, playerId: string): CartographySession {
  const participants = session.participants.filter((entry) => entry !== playerId);
  return participants.length === session.participants.length ? session : { ...session, participants, revision: session.revision + 1 };
}

function mergeTransferredKnowledge(local: MapKnowledge, remote: MapKnowledge): MapKnowledge {
  if (local.worldId !== remote.worldId) return local;
  const exploredChunks = [...new Set([...local.exploredChunks, ...remote.exploredChunks])].sort().slice(0, MAX_EXPLORED_CHUNKS);
  const terrainByChunk: Record<string, MapBiomeReference> = {};
  const surfaceByChunk: Record<string, MapSurfaceSample> = {};
  const undergroundByChunk: Record<string, MapUndergroundSample> = {};
  for (const key of exploredChunks) {
    const localTerrain = local.terrainByChunk?.[key];
    const remoteTerrain = remote.terrainByChunk?.[key];
    const biome = normalizeBiomeReference(localTerrain ?? remoteTerrain);
    if (biome !== null) terrainByChunk[key] = biome;
    const surface = normalizeSurfaceSample(local.surfaceByChunk?.[key] ?? remote.surfaceByChunk?.[key]);
    if (surface) surfaceByChunk[key] = surface;
    const localUnderground = normalizeUndergroundSample(local.undergroundByChunk?.[key]);
    const remoteUnderground = normalizeUndergroundSample(remote.undergroundByChunk?.[key]);
    const underground = localUnderground ?? remoteUnderground;
    if (underground) {
      const bands: Partial<Record<UndergroundDepthBand, MapUndergroundBandSample>> = {};
      for (const band of ["upper", "middle", "deep"] as const) {
        const sample = undergroundSampleForBand(localUnderground, band) ?? undergroundSampleForBand(remoteUnderground, band);
        if (sample) bands[band] = sample;
      }
      undergroundByChunk[key] = Object.keys(bands).length ? { ...underground, bands } : underground;
    }
  }
  const markerById = new Map(local.markers.map((marker) => [marker.id, marker]));
  for (const remoteMarker of remote.markers) {
    if (remoteMarker.kind === "bed-spawn") continue;
    const existing = markerById.get(remoteMarker.id);
    if (!existing || compareMarkerFreshness(remoteMarker, existing) > 0) markerById.set(remoteMarker.id, remoteMarker);
  }
  const markers = [...markerById.values()].sort((left, right) => left.id.localeCompare(right.id)).slice(0, MAX_MAP_MARKERS);
  const changed = exploredChunks.length !== local.exploredChunks.length
    || markers.length !== local.markers.length
    || exploredChunks.some((entry, index) => entry !== local.exploredChunks[index])
    || markers.some((entry, index) => entry !== local.markers[index])
    || Object.keys(terrainByChunk).length !== Object.keys(local.terrainByChunk ?? {}).length
    || Object.entries(terrainByChunk).some(([key, biome]) => local.terrainByChunk?.[key] !== biome)
    || Object.keys(surfaceByChunk).length !== Object.keys(local.surfaceByChunk ?? {}).length
    || Object.entries(surfaceByChunk).some(([key, surface]) => surface.join("|") !== local.surfaceByChunk?.[key]?.join("|"))
    || Object.keys(undergroundByChunk).length !== Object.keys(local.undergroundByChunk ?? {}).length
    || Object.entries(undergroundByChunk).some(([key, sample]) => {
      const existing = local.undergroundByChunk?.[key];
      return existing?.biome !== sample.biome || existing.elevation !== sample.elevation
        || JSON.stringify(existing?.bands ?? {}) !== JSON.stringify(sample.bands ?? {});
    });
  return changed ? { ...local, revision: local.revision + 1, exploredChunks, terrainByChunk, surfaceByChunk, undergroundByChunk, markers } : local;
}

/**
 * A table has exactly two seats. Both maps receive the same transferable
 * exploration/marker union in one atomic operation; personal beds and potion
 * charges never leak to the other player.
 */
export function shareMapsAtCartographyTable(
  session: CartographySession,
  leftPlayerId: string,
  left: MapKnowledge,
  rightPlayerId: string,
  right: MapKnowledge,
) {
  const seated = session.participants.length === 2
    && session.participants.includes(leftPlayerId)
    && session.participants.includes(rightPlayerId)
    && leftPlayerId !== rightPlayerId;
  if (!seated) return { ok: false, reason: "both-players-must-be-seated", left, right } as const;
  if (left.worldId !== right.worldId) return { ok: false, reason: "different-worlds", left, right } as const;
  const nextLeft = mergeTransferredKnowledge(left, right);
  const nextRight = mergeTransferredKnowledge(right, left);
  return { ok: true, reason: null, left: nextLeft, right: nextRight } as const;
}

export function fastTravelDestination(state: MapKnowledge, markerId: string) {
  const marker = state.markers.find((entry) => entry.id === markerId);
  if (!marker) return null;
  if (marker.kind === "settlement" && marker.settlementKnowledge !== "visited") return null;
  if (marker.kind === "bed-spawn" && marker.id !== state.activeBedId) return null;
  return marker;
}

export function fastTravelChargeCost(marker: Pick<MapMarker, "kind">) {
  return marker.kind === "manual" ? FAST_TRAVEL_MANUAL_CHARGE_COST : FAST_TRAVEL_DEFAULT_CHARGE_COST;
}

export function beginFastTravel(
  state: MapKnowledge,
  request: Readonly<{ id: string; mode: FastTravelMode; destinationId: string; originWayshrineId?: string | null }>,
  currentPosition: WorldPoint,
  startedAt: number,
  damageRevision: number,
) {
  const normalized = normalizeMapKnowledge(state, state.worldId, state.playerId);
  const destination = fastTravelDestination(normalized, request.destinationId);
  if (!destination) return { ok: false, reason: "illegal-destination" } as const;
  const origin = cleanPoint(currentPosition);
  let originWayshrineId: string | null = null;
  let chargeCost = 0;
  if (request.mode === "map-charge") {
    chargeCost = fastTravelChargeCost(destination);
    if (normalized.fastTravelCharges < chargeCost) return { ok: false, reason: "no-banked-travel" } as const;
  } else {
    const originShrine = normalized.markers.find((marker) => marker.id === request.originWayshrineId && marker.kind === "wayshrine");
    if (!originShrine || destination.kind !== "wayshrine" || distanceSquared(origin, originShrine.position) > WAYSHRINE_USE_RADIUS ** 2) {
      return { ok: false, reason: "wayshrine-network-unavailable" } as const;
    }
    originWayshrineId = originShrine.id;
  }
  const channel: FastTravelChannel = {
    id: cleanId(request.id, `travel-${request.destinationId}`),
    mode: request.mode,
    destinationId: destination.id,
    destination: destination.position,
    originWayshrineId,
    origin,
    startedAt: Math.max(0, finite(startedAt)),
    durationSeconds: FAST_TRAVEL_CHANNEL_SECONDS,
    chargeCost,
    damageRevision: Math.max(0, integer(damageRevision)),
    status: "channeling",
    cancelledReason: null,
  };
  return { ok: true, channel } as const;
}

export function advanceFastTravelChannel(
  channel: FastTravelChannel,
  currentPosition: WorldPoint,
  now: number,
  damageRevision: number,
): FastTravelChannel {
  if (channel.status !== "channeling") return channel;
  if (integer(damageRevision) !== channel.damageRevision) return { ...channel, status: "cancelled", cancelledReason: "damaged" };
  if (distanceSquared(cleanPoint(currentPosition), channel.origin) > FAST_TRAVEL_STILL_RADIUS ** 2) {
    return { ...channel, status: "cancelled", cancelledReason: "moved" };
  }
  if (finite(now) - channel.startedAt >= channel.durationSeconds) return { ...channel, status: "completed" };
  return channel;
}

export function commitFastTravel(state: MapKnowledge, channel: FastTravelChannel) {
  const normalized = normalizeMapKnowledge(state, state.worldId, state.playerId);
  if (channel.status !== "completed") return { ok: false, reason: "channel-incomplete", state: normalized } as const;
  const destination = fastTravelDestination(normalized, channel.destinationId);
  if (!destination) return { ok: false, reason: "destination-lost", state: normalized } as const;
  if (channel.mode === "wayshrine-network") {
    const origin = normalized.markers.find((marker) => marker.id === channel.originWayshrineId && marker.kind === "wayshrine");
    if (!origin || destination.kind !== "wayshrine") return { ok: false, reason: "wayshrine-network-lost", state: normalized } as const;
    return { ok: true, state: normalized, position: destination.position, chargeSpent: 0 } as const;
  }
  const chargeCost = fastTravelChargeCost(destination);
  if (normalized.fastTravelCharges < chargeCost) return { ok: false, reason: "no-banked-travel", state: normalized } as const;
  return {
    ok: true,
    state: { ...normalized, revision: normalized.revision + 1, fastTravelCharges: normalized.fastTravelCharges - chargeCost },
    position: destination.position,
    chargeSpent: chargeCost,
  } as const;
}
