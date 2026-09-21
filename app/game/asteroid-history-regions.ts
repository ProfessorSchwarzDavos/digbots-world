import { asteroidAttachmentPhysicalBounds, type AsteroidAttachmentFrame, type AsteroidAttachmentView } from "./asteroid-attachment-frame";

/** Persisted ecology/cooldown keys identify their ORIGINAL coordinate grid,
 * not portable cells. Continuous centered-voxel borders can overlap the next
 * history region even when every block center belongs to one column. */
type HistoryRegionSize = 16 | 64;
export function asteroidHistoryRegionCoordinates(key: string, size: HistoryRegionSize): [number, number] {
  if (![16, 64].includes(size) || !/^-?\d+,-?\d+$/.test(key)) throw Error("Invalid canonical history region key.");
  const result = key.split(",").map(Number) as [number, number];
  if (result.join(",") !== key || result.some(n => !Number.isSafeInteger(n * size)
    || !Number.isSafeInteger((n + 1) * size))) throw Error("Invalid canonical history region coordinate.");
  return result;
}
export function asteroidHistoryRegionTouches(frame: AsteroidAttachmentFrame, key: string, size: HistoryRegionSize): boolean {
  const [x, z] = asteroidHistoryRegionCoordinates(key, size), b = asteroidAttachmentPhysicalBounds(frame, "orbit");
  return x * size < b.maxX && (x + 1) * size > b.minX && z * size < b.maxZ && (z + 1) * size > b.minZ;
}
export function asteroidHistoryRegionKey(frame: AsteroidAttachmentFrame, x: number, z: number,
  view: AsteroidAttachmentView, size: HistoryRegionSize): string {
  const b = asteroidAttachmentPhysicalBounds(frame, view);
  if (![16, 64].includes(size) || ![x, z].every(Number.isFinite) || x < b.minX || x >= b.maxX || z < b.minZ || z >= b.maxZ)
    throw Error("History query is outside the attached frame.");
  return `${Math.floor((x + (view === "local" ? frame.offset.x : 0)) / size)},${Math.floor((z + (view === "local" ? frame.offset.z : 0)) / size)}`;
}
