import { BlockId } from "./data";
import { ASTEROID_PAGE_VOXELS, asteroidVoxelFromView, asteroidVoxelLayout, asteroidVoxelToView, createAsteroidRegistry,
  parseAsteroidRegistry, reconcileAsteroidVoxels, remapAsteroidRegistry, type AsteroidRegistry } from "./asteroid-custody";
import { celestialTerrainSeed, ORBIT_BANDS, type AsteroidDescriptor, type CelestialPoint, type OrbitBand } from "./celestial-terrain";
import { locationAddress, locationId, type LocationAddress, type UniverseId } from "./location-address";
import { assertExactKeys, freezeUniverseJson, isUniverseRecord } from "./universe-json";
import type { ChunkEditSave } from "./world";

/** One authoritative field per body/band, shared by its orbit/local coordinate views. */
export type AsteroidFieldsSave = Readonly<{ schema: 1; fields: Readonly<Record<string, AsteroidRegistry>> }>;
export function validateAsteroidFields(raw: unknown, expectedUniverse?: UniverseId): AsteroidFieldsSave {
  if (raw === undefined) return Object.freeze({ schema: 1, fields: Object.freeze({}) });
  if (!isUniverseRecord(raw)) throw Error("Invalid asteroid fields.");
  assertExactKeys(raw, ["schema", "fields"], "Asteroid fields");
  if (raw.schema !== 1 || !isUniverseRecord(raw.fields) || Object.keys(raw.fields).length > 128) throw Error("Invalid asteroid field catalog.");
  const fields: Record<string, AsteroidRegistry> = {};
  for (const [key, value] of Object.entries(raw.fields)) {
    const registry = parseAsteroidRegistry(value);
    if (key !== locationId(registry.orbit) || expectedUniverse && registry.orbit.universeId !== expectedUniverse) throw Error("Foreign asteroid field.");
    fields[key] = registry;
  }
  return freezeUniverseJson({ schema: 1 as const, fields });
}
export function remapAsteroidFields(raw: unknown, source: UniverseId, destination: UniverseId): AsteroidFieldsSave {
  const save = validateAsteroidFields(raw, source), fields: Record<string, AsteroidRegistry> = {};
  for (const value of Object.values(save.fields)) {
    const registry = remapAsteroidRegistry(value, destination); fields[locationId(registry.orbit)] = registry;
  }
  return freezeUniverseJson({ schema: 1 as const, fields });
}
export function asteroidOrbitFor(location: LocationAddress): LocationAddress | null {
  const address = locationAddress(location);
  if (address.kind === "orbit") return ORBIT_BANDS.includes(address.instanceId as OrbitBand) ? address : null;
  if (address.kind !== "asteroid") return null;
  const band = ORBIT_BANDS.find(value => address.instanceId.startsWith(`asteroid-${value}-`));
  if (!band) throw Error("Invalid asteroid local-frame identity.");
  return locationAddress({ ...address, kind: "orbit", instanceId: band });
}
export function asteroidAtPoint(registry: AsteroidRegistry | null | undefined, point: CelestialPoint, location: LocationAddress): AsteroidDescriptor | null {
  if (!registry || ![point.x, point.y, point.z].every(Number.isSafeInteger)) return null;
  if (locationId(asteroidOrbitFor(location) ?? location) !== locationId(registry.orbit)) return null;
  for (const { descriptor } of registry.asteroids) {
    if (location.kind === "asteroid" && location.instanceId !== descriptor.id) continue;
    const center = location.kind === "asteroid" ? { x: 0, y: 32, z: 0 } : descriptor.center;
    if ((["x", "y", "z"] as const).every(axis => Math.abs(point[axis] - center[axis]) <= Math.floor(descriptor.radii[axis] * 1.1))) return descriptor;
  }
  return null;
}
function editsInField(edits: ChunkEditSave, registry: AsteroidRegistry, location: LocationAddress) {
  const result: { asteroidId: string; position: CelestialPoint; block: BlockId }[] = [];
  for (const [key, entries] of Object.entries(edits)) {
    if (!/^-?\d+,-?\d+$/.test(key)) throw Error("Invalid asteroid chunk coordinate.");
    const [cx, cz] = key.split(",").map(Number);
    for (const [index, block] of entries) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= 16 * 16 * 192) throw Error("Invalid asteroid chunk edit index.");
      const point = { x: cx * 16 + index % 16, y: Math.floor(index / 256) - 64, z: cz * 16 + Math.floor(index / 16) % 16 };
      const descriptor = asteroidAtPoint(registry, point, location);
      if (descriptor) result.push({ asteroidId: descriptor.id, position: asteroidVoxelFromView(registry, descriptor.id, point, location), block });
    }
  }
  return result;
}
const binding = (registry: AsteroidRegistry) => ({ orbit: registry.orbit, seed: registry.seed, epoch: registry.epoch, expectedRevision: registry.revision });
export function withAsteroidField(save: AsteroidFieldsSave, registry: AsteroidRegistry): AsteroidFieldsSave {
  return freezeUniverseJson({ schema: 1 as const, fields: { ...save.fields, [locationId(registry.orbit)]: registry } });
}
/** Captures only host-owned world mutations; never awards inventory or bypasses actor permissions. */
export function captureAsteroidEdits(save: AsteroidFieldsSave, location: LocationAddress, edits: ChunkEditSave): AsteroidFieldsSave {
  const orbit = asteroidOrbitFor(location); if (!orbit) return save;
  const registry = save.fields[locationId(orbit)]; if (!registry) throw Error("Missing authoritative asteroid field.");
  return withAsteroidField(save, reconcileAsteroidVoxels(registry, editsInField(edits, registry, location), binding(registry)));
}
/** Saved canonical pages override stale local edit mirrors before any chunk/cache is admitted. */
export function projectAsteroidEdits(registry: AsteroidRegistry, location: LocationAddress, edits: ChunkEditSave): ChunkEditSave {
  if (locationId(asteroidOrbitFor(location) ?? location) !== locationId(registry.orbit)) throw Error("Asteroid projection location mismatch.");
  const chunks = new Map(Object.entries(edits).map(([key, entries]) => [key, new Map(entries)]));
  for (const entry of registry.asteroids) {
    if (location.kind === "asteroid" && location.instanceId !== entry.descriptor.id) continue;
    const layout = asteroidVoxelLayout(entry.descriptor);
    for (const page of entry.pages) for (let slot = 0; slot < page.data.length / 4; slot++) {
      const code = page.data.slice(slot * 4, slot * 4 + 4); if (code === "----") continue;
      const index = page.index * ASTEROID_PAGE_VOXELS + slot;
      const local = { x: layout.min.x + index % layout.size.x,
        y: layout.min.y + Math.floor(index / (layout.size.x * layout.size.z)),
        z: layout.min.z + Math.floor(index / layout.size.x) % layout.size.z };
      const point = asteroidVoxelToView(registry, entry.descriptor.id, local, location), cx = Math.floor(point.x / 16), cz = Math.floor(point.z / 16);
      const key = `${cx},${cz}`, chunk = chunks.get(key) ?? new Map<number, number>();
      chunk.set((point.y + 64) * 256 + (point.z - cz * 16) * 16 + point.x - cx * 16, Number.parseInt(code, 16)); chunks.set(key, chunk);
    }
  }
  return Object.fromEntries([...chunks].map(([key, values]) => [key, [...values].sort(([a], [b]) => a - b)]));
}
/** Older orbit saves migrate their existing edits once. Existing fields always win
 * on load; a stale location mirror cannot restore already extracted material. */
export function prepareAsteroidLocation(raw: unknown, location: LocationAddress, seedText: string, edits: ChunkEditSave) {
  let save = validateAsteroidFields(raw, location.universeId);
  const orbit = asteroidOrbitFor(location); if (!orbit) return { save, registry: null, edits };
  const key = locationId(orbit); let registry = save.fields[key];
  if (!registry) {
    if (location.kind !== "orbit") throw Error("An asteroid local frame requires its existing orbit field.");
    registry = createAsteroidRegistry(orbit, celestialTerrainSeed(seedText));
    registry = reconcileAsteroidVoxels(registry, editsInField(edits, registry, location), binding(registry));
    save = withAsteroidField(save, registry);
  } else if (location.kind === "orbit" && registry.seed !== celestialTerrainSeed(seedText)) throw Error("Asteroid field differs from captured terrain seed.");
  return { save, registry, edits: projectAsteroidEdits(registry, location, edits) };
}
