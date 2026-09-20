import { BlockId } from "./data";
import { locationAddress, type LocationAddress } from "./location-address";

/** Independent of home generator 18. Persist this version with celestial locations. */
export const CELESTIAL_TERRAIN_VERSION = 1;
export const CELESTIAL_MIN_Y = -64;
export const CELESTIAL_MAX_Y = 127;
export const ORBIT_BANDS = ["low", "high", "moon-transfer"] as const;
export type OrbitBand = typeof ORBIT_BANDS[number];
/** Public generation context only. Claims, discoveries and finite stores stay private. */
export type CelestialGenerationState = Readonly<{ expansionLevel: number }>;
export function validCelestialGenerationState(value: unknown): value is CelestialGenerationState {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 1 || !Object.hasOwn(value, "expansionLevel") || !("expansionLevel" in value)) return false;
  return typeof value.expansionLevel === "number" && Number.isInteger(value.expansionLevel) && value.expansionLevel >= 0 && value.expansionLevel <= 3;
}
export function normalizeCelestialGenerationState(value?: unknown, location?: LocationAddress): CelestialGenerationState {
  const state = value === undefined ? { expansionLevel: 0 } : value;
  if (!validCelestialGenerationState(state)) throw Error("Invalid celestial expansion state.");
  if (location && !["orbit", "station", "asteroid"].includes(locationAddress(location).kind) && state.expansionLevel !== 0) throw Error("This location cannot have an orbital expansion.");
  return Object.freeze({ expansionLevel: state.expansionLevel });
}
export type CelestialPoint = Readonly<{ x: number; y: number; z: number }>;
export type CelestialBounds = Readonly<{ minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }>;
export const MORROW_REGIONS = [
  { id: "pale-regolith-sea", name: "Pale Regolith Sea", x: 0, z: 0 },
  { id: "starshadow-craters", name: "Starshadow Craters", x: -120, z: -100 },
  { id: "moon-slate-highlands", name: "Moon-Slate Highlands", x: 120, z: -100 },
  { id: "ice-lantern-rilles", name: "Ice-Lantern Rilles", x: 120, z: 120 },
  { id: "buried-waystone-galleries", name: "Buried Waystone Galleries", x: -120, z: 120 },
] as const;
export type MorrowRegion = typeof MORROW_REGIONS[number]["id"];
export type CelestialPalette = Readonly<{ regolith: BlockId; slate: BlockId; mineralFrost: BlockId; waystone: BlockId }>;
export const DEFAULT_CELESTIAL_PALETTE: CelestialPalette = Object.freeze({
  regolith: BlockId.PaleRegolith, slate: BlockId.MoonSlate, mineralFrost: BlockId.MineralFrost, waystone: BlockId.RuneStone,
});
/** Optional authored append-only definitions. No numeric IDs are allocated here. */
export const CELESTIAL_CONTENT_SUGGESTIONS = Object.freeze([
  "Pale Regolith: pale grey-green granular full cube; shovel; lunar soil",
  "Mineral Frost: luminous blue-green full cube; mineable frozen feedstock for Rillehopper ecology",
] as const);
export type AsteroidComposition = "silicate" | "metallic" | "icy";
export type AsteroidDescriptor = Readonly<{
  id: string; bodyId: string; band: OrbitBand; shapeSeed: number; compositionSeed: number;
  composition: AsteroidComposition; center: CelestialPoint; radii: CelestialPoint;
  localFrameId: string; spinPolicy: "sky-only"; spinRadiansPerSecond: number;
  /** Claims belong to persistent host authority; generation never manufactures an owner. */
  initialClaim: null;
}>;
export type MorrowSite = Readonly<{
  id: string; kind: "observatory" | "prospector" | "rescue-shelter" | "waystone-gallery";
  name: string; center: CelestialPoint; radius: number;
}>;
export type CelestialColumn = Readonly<{
  x: number; z: number; height: number;
  /** Inclusive generation ceiling: authored roofs can stand above the terrain height. */
  maxY: number; waterline: number; region: MorrowRegion | null;
  /** Site and candidate list are resolved once per column, never per voxel. */
  site: MorrowSite | null; asteroids: readonly AsteroidDescriptor[];
}>;
export type CelestialArrival = Readonly<{
  position: CelestialPoint; yaw: number; support: "solid" | "ship-or-eva";
  breathable: false; clearanceRadius: number;
}>;
export type CelestialTerrain = Readonly<{
  version: number; kind: "morrow" | "orbit" | "station" | "asteroid"; seed: number;
  bounds: CelestialBounds; expansionLevel: number; band: OrbitBand | null;
  asteroids: readonly AsteroidDescriptor[]; sites: readonly MorrowSite[]; arrival: CelestialArrival;
  contains(x: number, y: number, z: number): boolean;
  column(x: number, z: number): CelestialColumn;
  block(x: number, y: number, z: number, column?: CelestialColumn): BlockId;
}>;
export type CelestialTerrainOptions = Readonly<{
  location: LocationAddress; seed: number; band?: OrbitBand; expansionLevel?: number;
  /** For an asteroid location, select a descriptor from its body's orbit catalog. */
  asteroidId?: string; palette?: CelestialPalette;
}>;

/** Versioned FNV-1a over UTF-16 code units; terrain identity, never security. */
export function celestialTerrainSeed(...parts: readonly (string | number)[]): number {
  let hash = 0x811c9dc5;
  for (const char of JSON.stringify(["celestial-terrain-v1", ...parts])) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }
  return hash;
}

function random(seed: number, x: number, z: number, y = 0): number {
  let h = seed ^ Math.imul(x, 0x1f123bb5) ^ Math.imul(z, 0x5f356495) ^ Math.imul(y, 0x6c8e9cf5);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(seed: number, x: number, z: number, scale: number): number {
  const gx = Math.floor(x / scale), gz = Math.floor(z / scale);
  const fx = x / scale - gx, fz = z / scale - gz;
  const tx = fx * fx * (3 - 2 * fx), tz = fz * fz * (3 - 2 * fz);
  const a = random(seed, gx, gz), b = random(seed, gx + 1, gz);
  const c = random(seed, gx, gz + 1), d = random(seed, gx + 1, gz + 1);
  return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
}
function point(x: number, y: number, z: number): CelestialPoint { return Object.freeze({ x, y, z }); }
function bounds(radius: number): CelestialBounds {
  return Object.freeze({ minX: -radius, maxX: radius - 1, minY: CELESTIAL_MIN_Y, maxY: CELESTIAL_MAX_Y, minZ: -radius, maxZ: radius - 1 });
}
function coordinate(value: number): void {
  if (!Number.isSafeInteger(value)) throw new Error("Celestial voxel coordinates must be safe integers.");
}

/** Expansions only expose additional fixed 64-block cells; existing IDs/shape/ore never change. */
export function orbitAsteroids(seed: number, bodyId: string, band: OrbitBand, expansionLevel = 0): readonly AsteroidDescriptor[] {
  if (!Number.isSafeInteger(seed) || !ORBIT_BANDS.includes(band) || !Number.isInteger(expansionLevel) || expansionLevel < 0 || expansionLevel > 3) {
    throw new Error("Invalid orbit seed, band or expansion level (0..3).");
  }
  const radius = 128 * (expansionLevel + 1), cells = radius / 64;
  const result: AsteroidDescriptor[] = [];
  for (let cx = -cells; cx < cells; cx += 1) for (let cz = -cells; cz < cells; cz += 1) {
    // Keep a 96-block-wide insertion/first-station corridor empty.
    if (Math.abs(cx + 0.5) < 1 && Math.abs(cz + 0.5) < 1) continue;
    const shapeSeed = celestialTerrainSeed(seed, bodyId, band, cx, cz, "shape");
    const compositionSeed = celestialTerrainSeed(seed, bodyId, band, cx, cz, "composition");
    const id = `asteroid-${band}-${cx < 0 ? "n" : "p"}${Math.abs(cx)}-${cz < 0 ? "n" : "p"}${Math.abs(cz)}`;
    const compositions: readonly AsteroidComposition[] = ["silicate", "metallic", "icy"];
    result.push(Object.freeze({ id, bodyId, band, shapeSeed, compositionSeed,
      composition: compositions[((cx + cz) % 3 + 3) % 3],
      center: point(cx * 64 + 32, 16 + Math.floor(random(shapeSeed, 0, 0) * 42), cz * 64 + 32),
      radii: point(10 + Math.floor(random(shapeSeed, 1, 0) * 8), 8 + Math.floor(random(shapeSeed, 2, 0) * 9), 10 + Math.floor(random(shapeSeed, 3, 0) * 8)),
      localFrameId: `${bodyId}:${id}:frame-v1`, spinPolicy: "sky-only", spinRadiansPerSecond: 0.0005 + random(shapeSeed, 4, 0) * 0.001,
      initialClaim: null,
    }));
  }
  return Object.freeze(result);
}

function asteroidBlock(asteroid: AsteroidDescriptor, x: number, y: number, z: number, palette: CelestialPalette): BlockId {
  // Inputs are already asteroid-local (centre 0,32,0), avoiding allocations per voxel.
  const dx = x / asteroid.radii.x;
  const dy = (y - 32) / asteroid.radii.y;
  const dz = z / asteroid.radii.z;
  const d = dx * dx + dy * dy + dz * dz;
  if (d > 1.2) return BlockId.Air;
  const roughness = random(asteroid.shapeSeed, Math.floor(x / 3), Math.floor(z / 3), Math.floor(y / 3));
  if (d > 0.83 + roughness * 0.3) return BlockId.Air;
  const ore = random(asteroid.compositionSeed, Math.floor(x / 2), Math.floor(z / 2), Math.floor(y / 2));
  if (asteroid.composition === "icy") return ore < 0.66 ? BlockId.Ice : ore < 0.77 ? BlockId.CrystalOre : palette.slate;
  if (asteroid.composition === "metallic") return ore < 0.46 ? BlockId.IronOre : ore < 0.66 ? BlockId.CopperOre : ore < 0.69 ? BlockId.GoldOre : BlockId.Basalt;
  return ore < 0.10 ? BlockId.CopperOre : ore < 0.17 ? BlockId.CrystalOre : palette.slate;
}

/** Repeating 512-block region mosaic. The canonical five regions are all reachable near origin. */
export function morrowRegionAt(x: number, z: number): MorrowRegion {
  coordinate(x); coordinate(z);
  const mx = ((x + 256) % 512 + 512) % 512 - 256;
  const mz = ((z + 256) % 512 + 512) % 512 - 256;
  let chosen: typeof MORROW_REGIONS[number] = MORROW_REGIONS[0], nearest = Infinity;
  for (const region of MORROW_REGIONS) {
    const distance = (mx - region.x) ** 2 + (mz - region.z) ** 2;
    if (distance < nearest) { nearest = distance; chosen = region; }
  }
  return chosen.id;
}
function morrowHeight(seed: number, x: number, z: number, region: MorrowRegion): number {
  const rolling = noise(seed, x, z, 45) * 6 + noise(seed ^ 0x513abc, x, z, 14) * 2;
  let height = 30 + rolling;
  if (region === "moon-slate-highlands") height += 12 + noise(seed ^ 0x291, x, z, 54) * 20;
  if (region === "starshadow-craters") {
    const cellX = Math.floor((x + 48) / 96), cellZ = Math.floor((z + 48) / 96);
    const centerX = cellX * 96 + (random(seed, cellX, cellZ) - 0.5) * 14;
    const centerZ = cellZ * 96 + (random(seed ^ 91, cellX, cellZ) - 0.5) * 14;
    const r = Math.hypot(x - centerX, z - centerZ) / 35;
    height += r < 0.8 ? -15 * (1 - (r / 0.8) ** 2) : r < 1.1 ? 7 * Math.sin((r - 0.8) / 0.3 * Math.PI) : 0;
  }
  if (region === "ice-lantern-rilles") {
    const rille = Math.abs(Math.sin(x / 24 + Math.sin(z / 40) * 0.9));
    height -= Math.max(0, 1 - rille / 0.24) * 12;
  }
  // A permanent level arrival clearing; no structure or excavation can spawn into it.
  const distance = Math.max(Math.abs(x), Math.abs(z));
  if (distance <= 9) return 32;
  if (distance < 18) height = 32 + (height - 32) * (distance - 9) / 9;
  return Math.floor(height);
}

function morrowSites(seed: number): readonly MorrowSite[] {
  const definitions = [
    { id: "morrow-first-light", name: "First Light Observatory", kind: "observatory", x: 120, z: -100, radius: 8 },
    { id: "morrow-rille-prospect", name: "Rille Prospect", kind: "prospector", x: 120, z: 120, radius: 6 },
    { id: "morrow-quiet-refuge", name: "Quiet Refuge", kind: "rescue-shelter", x: 28, z: 8, radius: 6 },
    { id: "morrow-buried-steps", name: "Buried Waystone Steps", kind: "waystone-gallery", x: -120, z: 120, radius: 16 },
  ] as const;
  return Object.freeze(definitions.map((site) => Object.freeze({ id: site.id, name: site.name, kind: site.kind, radius: site.radius,
    center: point(site.x, morrowHeight(seed, site.x, site.z, morrowRegionAt(site.x, site.z)), site.z),
  })));
}

/** undefined means leave native terrain; Air is an intentional carved opening. */
function siteBlock(site: MorrowSite, x: number, y: number, z: number, palette: CelestialPalette): BlockId | undefined {
  const dx = x - site.center.x, dz = z - site.center.z, dy = y - site.center.y;
  if (site.kind === "waystone-gallery") {
    // Descending open stair at the south entrance joins a buried barrel gallery.
    if (Math.abs(dx) <= 2 && dz >= 5 && dz <= 16) {
      const floor = -12 + (dz - 5);
      if (dy === floor) return palette.slate;
      if (dy > floor && dy <= 4) return BlockId.Air;
    }
    if (Math.abs(dx) <= 10 && Math.abs(dz) <= 5) {
      if (dy === -12) return Math.abs(dx) % 4 === 0 ? palette.waystone : palette.slate;
      const ceiling = -5 - Math.floor(Math.abs(dz) / 2);
      if (dy === ceiling || (Math.abs(dx) === 10 && dy > -12 && dy <= ceiling)) return palette.waystone;
      if (dy > -12 && dy < ceiling) return BlockId.Air;
    }
    return undefined;
  }
  const width = site.kind === "observatory" ? 5 : 4;
  const depth = site.kind === "prospector" ? 3 : 4;
  if (Math.abs(dx) > width || Math.abs(dz) > depth) return undefined;
  if (dy === 0) return palette.slate;
  if (dy < 1 || dy > 6) return undefined;
  const wall = Math.abs(dx) === width || Math.abs(dz) === depth;
  const roof = site.kind === "observatory" ? 5 + (Math.abs(dx) < 3 && Math.abs(dz) < 3 ? 1 : 0) : 4;
  if (dy === roof) return site.kind === "observatory" ? BlockId.Glass : BlockId.StoneBrick;
  if (dy > roof) return BlockId.Air;
  // Accessible unpowered shelters, with open doors. This does not claim breathable air.
  if (dz === depth && Math.abs(dx) <= 1 && dy <= 3) return BlockId.Air;
  if (wall) return dy === 3 && dx === width && Math.abs(dz) <= 1 ? BlockId.Glass : BlockId.StoneBrick;
  if (dy === 1 && dx === -width + 1 && dz === -depth + 1) return BlockId.Glowstone;
  return BlockId.Air;
}

/** Resolve once per world/worker initialization. Home must keep its existing generation path. */
export function createCelestialTerrain(options: CelestialTerrainOptions): CelestialTerrain | null {
  const location = locationAddress(options.location);
  if (!Number.isSafeInteger(options.seed)) throw new Error("Celestial terrain needs a safe integer seed.");
  const isMorrow = location.kind === "surface" && location.bodyId === "blockwild/morrow";
  if (!isMorrow && !["orbit", "station", "asteroid"].includes(location.kind)) return null;
  const kind = isMorrow ? "morrow" : location.kind as "orbit" | "station" | "asteroid";
  const identityBand = ORBIT_BANDS.find(value => kind === "asteroid" ? location.instanceId.startsWith(`asteroid-${value}-`) : location.instanceId === value);
  if (options.band && identityBand && options.band !== identityBand) throw Error("Celestial band differs from canonical location identity.");
  const band = options.band ?? identityBand ?? "low";
  const expansionLevel = options.expansionLevel ?? 0;
  if (!ORBIT_BANDS.includes(band) || !Number.isInteger(expansionLevel) || expansionLevel < 0 || expansionLevel > 3) throw new Error("Invalid celestial band/expansion.");
  const seed = celestialTerrainSeed(options.seed, location.systemId, location.bodyId);
  const palette = Object.freeze({ ...DEFAULT_CELESTIAL_PALETTE, ...options.palette });
  if (Object.values(palette).some((id) => !Number.isInteger(id) || id <= BlockId.Air || id > 65535)) throw new Error("Invalid celestial material palette.");
  const catalog = kind === "morrow" ? [] : orbitAsteroids(seed, location.bodyId, band, expansionLevel);
  let asteroids: readonly AsteroidDescriptor[] = kind === "station" ? [] : catalog;
  if (kind === "asteroid") {
    const original = catalog.find((entry) => entry.id === (options.asteroidId ?? location.instanceId));
    if (!original) throw new Error("Unknown asteroid in this orbit shard; supply its band and unlocked expansion.");
    // Keep composition/shape in asteroid-local coordinates for identical extraction across views.
    asteroids = [Object.freeze({ ...original, center: point(0, 32, 0) })];
  }
  asteroids = Object.freeze(asteroids);
  const limits = bounds(kind === "morrow" ? 1_048_576 : kind === "asteroid" ? 48 : 128 * (expansionLevel + 1));
  const sites = kind === "morrow" ? morrowSites(seed) : Object.freeze([]);
  const contains = (x: number, y: number, z: number) => Number.isSafeInteger(x) && Number.isSafeInteger(y) && Number.isSafeInteger(z)
    && x >= limits.minX && x <= limits.maxX && y >= limits.minY && y <= limits.maxY && z >= limits.minZ && z <= limits.maxZ;
  const column = (x: number, z: number): CelestialColumn => {
    coordinate(x); coordinate(z);
    const inside = contains(x, 0, z);
    const region = kind === "morrow" && inside ? morrowRegionAt(x, z) : null;
    const site = region ? sites.find((entry) => Math.abs(x - entry.center.x) <= entry.radius && Math.abs(z - entry.center.z) <= entry.radius) ?? null : null;
    const candidates = inside ? asteroids.filter((entry) => Math.abs(x - entry.center.x) <= entry.radii.x * 1.1 && Math.abs(z - entry.center.z) <= entry.radii.z * 1.1) : [];
    const height = region ? site ? site.center.y : morrowHeight(seed, x, z, region) : candidates.reduce((top, entry) => Math.max(top, Math.ceil(entry.center.y + entry.radii.y * 1.1)), CELESTIAL_MIN_Y - 1);
    return Object.freeze({ x, z, height, maxY: Math.min(CELESTIAL_MAX_Y, site && site.kind !== "waystone-gallery" ? height + 6 : height),
      waterline: CELESTIAL_MIN_Y - 1, region, site, asteroids: Object.freeze(candidates) });
  };
  const block = (x: number, y: number, z: number, sampled?: CelestialColumn): BlockId => {
    if (!contains(x, y, z)) return BlockId.Air;
    const col = sampled ?? column(x, z);
    if (col.x !== x || col.z !== z) throw new Error("Celestial column does not match voxel coordinates.");
    if (kind !== "morrow") {
      for (const asteroid of col.asteroids) {
        // Sample shape and composition in the stable local frame in BOTH orbit and asteroid views.
        const value = asteroidBlock(asteroid, x - asteroid.center.x, y - asteroid.center.y + 32, z - asteroid.center.z, palette);
        if (value !== BlockId.Air) return value;
      }
      return BlockId.Air;
    }
    if (col.site) {
      const authored = siteBlock(col.site, x, y, z, palette);
      if (authored !== undefined) return authored;
    }
    if (y > col.height) return BlockId.Air;
    if (y <= CELESTIAL_MIN_Y + 1) return BlockId.Bedrock;
    const depth = col.height - y;
    if (depth < 3) {
      if (col.region === "ice-lantern-rilles") return random(seed ^ 0x1ce, Math.floor(x / 3), Math.floor(z / 3)) < 0.65 ? palette.mineralFrost : palette.slate;
      return col.region === "moon-slate-highlands" ? palette.slate : palette.regolith;
    }
    // Subsurface gallery corridors recur only inside their named region; authored entrance is separate.
    if (col.region === "buried-waystone-galleries" && depth >= 8 && depth <= 12 && Math.abs(Math.sin(x / 14)) < 0.17) return BlockId.Air;
    const ore = random(seed ^ 0x0ae, Math.floor(x / 3), Math.floor(z / 3), Math.floor(y / 3));
    if (ore < 0.045) return BlockId.CopperOre;
    if (ore < 0.07) return BlockId.CrystalOre;
    if (col.region === "ice-lantern-rilles" && ore < 0.24) return BlockId.Ice;
    return palette.slate;
  };
  let arrivalY = 33;
  if (kind === "asteroid") {
    arrivalY = CELESTIAL_MAX_Y;
    // Find a flat-enough safe footprint with three full air cells over all four corners.
    let found = false;
    for (let y = 90; y >= 0; y -= 1) {
      if ([-1, 0, 1].every((x) => [-1, 0, 1].every((z) => block(x, y, z) !== BlockId.Air && [1, 2, 3].every((dy) => block(x, y + dy, z) === BlockId.Air)))) {
        arrivalY = y + 1; found = true; break;
      }
    }
    // Irregular rock need only support the player's centre; ship docking uses host collision validation.
    if (!found) for (let y = 90; y >= 0; y -= 1) if (block(0, y, 0) !== BlockId.Air) { arrivalY = y + 1; break; }
  }
  const arrival = Object.freeze({ position: point(0.5, arrivalY, 0.5), yaw: 0, support: kind === "morrow" || kind === "asteroid" ? "solid" as const : "ship-or-eva" as const,
    breathable: false as const, clearanceRadius: kind === "morrow" ? 8 : kind === "asteroid" ? 0.3 : 12 });
  return Object.freeze({ version: CELESTIAL_TERRAIN_VERSION, kind, seed, bounds: limits, expansionLevel, band: kind === "morrow" ? null : band, asteroids, sites, arrival, contains, column, block });
}
