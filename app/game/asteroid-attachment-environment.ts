import { type BlockId } from "./data";
import { liquidKindForBlock, type LiquidCell } from "./liquids";
import { ECOLOGY_SECTOR_SIZE, type EcologySectorSave } from "./ecology-population";
import { asteroidAttachmentContainsCell, rebaseAsteroidCell,
  type AsteroidAttachmentFrame, type AsteroidAttachmentView } from "./asteroid-attachment-frame";
import { assertExactKeys, canonicalJson, cloneUniverseJson, isUniverseRecord } from "./universe-json";
import { mergeSelectedAttachmentRecords } from "./attachment-array-merge";
import { asteroidHistoryRegionCoordinates, asteroidHistoryRegionKey, asteroidHistoryRegionTouches } from "./asteroid-history-regions";

export type AsteroidLiquidRecords = readonly (readonly [string, LiquidCell])[];
/** Must read the complete host-owned voxel preimage/after-image in the named
 * coordinate view, including finite asteroid pages and waterlogged flora. */
export type AsteroidLiquidVoxels = (key: string) => BlockId | undefined;
const liquidFields = { kind: true, level: true, source: true, falling: true } satisfies Record<keyof LiquidCell, true>;
function liquidSelection(frame: AsteroidAttachmentFrame, values: AsteroidLiquidRecords, view: AsteroidAttachmentView,
  voxel: AsteroidLiquidVoxels): Set<string> {
  canonicalJson(values);
  const seen = new Set<string>(), selected = new Set<string>();
  for (const row of values) {
    if (!Array.isArray(row) || row.length !== 2) throw Error("Invalid attached liquid row.");
    const [key, cell] = row, inside = asteroidAttachmentContainsCell(frame, key, view);
    if (seen.has(key)) throw Error("Duplicate attached liquid cell."); seen.add(key);
    assertExactKeys(cell, Object.keys(liquidFields), "Attached liquid cell");
    if (!["water", "lava", "honey", "syrup"].includes(cell.kind) || typeof cell.source !== "boolean" || typeof cell.falling !== "boolean"
      || !Number.isSafeInteger(cell.level) || (cell.source ? cell.level !== 0 || cell.falling : cell.level < 1 || cell.level > 15))
      throw Error("Invalid attached liquid state.");
    if (liquidKindForBlock(voxel(key)) !== cell.kind) throw Error("Attached liquid disagrees with its canonical voxel.");
    if (inside) selected.add(key);
    const p = key.split(",").map(Number);
    // Do not divide one tracked fluid boundary from adjacent liquid voxels,
    // including generated sources without an explicit liquidLevels row.
    for (let axis = 0; axis < 3; axis++) for (const delta of [-1, 1]) {
      const neighbor = [...p]; neighbor[axis] += delta; const next = neighbor.join(",");
      if (asteroidAttachmentContainsCell(frame, next, view) === inside) continue;
      const block = voxel(next);
      if (block === undefined) throw Error("Unresolved liquid frame boundary.");
      if (liquidKindForBlock(block)) throw Error("Liquid component crosses the attached frame boundary.");
    }
  }
  return selected;
}
export function projectAsteroidLiquids(frame: AsteroidAttachmentFrame, canonical: AsteroidLiquidRecords,
  voxel: AsteroidLiquidVoxels): [string, LiquidCell][] {
  const selected = liquidSelection(frame, canonical, "orbit", voxel);
  return canonical.filter(([key]) => selected.has(key)).map(([key, cell]) => [rebaseAsteroidCell(frame, key, "orbit"), cloneUniverseJson(cell)]);
}
/** Exact full-array merge, not a fluid simulation or creation/removal grant.
 * The owner transaction must include the matching voxel changes. The after
 * reader addresses ORBIT coordinates; local edited cells are checked through it. */
export function captureAsteroidLiquids(frame: AsteroidAttachmentFrame, canonical: AsteroidLiquidRecords,
  baseline: AsteroidLiquidRecords, edited: AsteroidLiquidRecords,
  voxels: Readonly<{ before: AsteroidLiquidVoxels; after: AsteroidLiquidVoxels }>): [string, LiquidCell][] {
  if (canonicalJson(projectAsteroidLiquids(frame, canonical, voxels.before)) !== canonicalJson(baseline))
    throw Error("Stale attached liquid projection.");
  // First validate/rebase cell keys, then validate the complete merged ORBIT
  // after-image, so adjacency outside the local view is never guessed as air.
  canonicalJson(edited);
  const incoming: [string, LiquidCell][] = edited.map(row => {
    if (!Array.isArray(row) || row.length !== 2) throw Error("Invalid attached liquid row.");
    return [rebaseAsteroidCell(frame, row[0], "local"), cloneUniverseJson(row[1])];
  });
  liquidSelection(frame, incoming, "orbit", voxels.after);
  const selected = liquidSelection(frame, canonical, "orbit", voxels.before);
  const retained = new Set(incoming.map(([key]) => key));
  if ([...selected].some(key => !retained.has(key) && liquidKindForBlock(voxels.after(key))))
    throw Error("Removed liquid state still has a liquid voxel; refusing implicit source creation.");
  const output = mergeSelectedAttachmentRecords(canonical, incoming, selected, value => value[0]);
  liquidSelection(frame, output, "orbit", voxels.after);
  return output.map(([key, cell]) => [key, cell]);
}

/** Ecology history is NOT physical cargo. A local 64-cell column is offset by
 * half a sector and the continuous negative edge can overlap another sector.
 * Keep original ORBIT keys; translated queries address the ONE canonical map.
 * This transient view deliberately is not a WorldSave ecologySectors record. */
export type AsteroidEcologyView = Readonly<{
  frameId: string; canonicalLocationId: AsteroidAttachmentFrame["orbitId"];
  sectors: Readonly<Record<string, EcologySectorSave>>;
}>;
const ecologyFields = { schema: true, lastUpdatedTick: true, recentKills: true } satisfies Record<keyof EcologySectorSave, true>;
function sectorCoordinates(key: string): [number, number] {
  return asteroidHistoryRegionCoordinates(key, ECOLOGY_SECTOR_SIZE);
}
function sectorTouches(frame: AsteroidAttachmentFrame, key: string): boolean {
  return asteroidHistoryRegionTouches(frame, key, ECOLOGY_SECTOR_SIZE);
}
function validateEcology(sectors: Readonly<Record<string, EcologySectorSave>>) {
  canonicalJson(sectors);
  if (!isUniverseRecord(sectors)) throw Error("Invalid attached ecology map.");
  for (const [key, value] of Object.entries(sectors)) {
    sectorCoordinates(key); assertExactKeys(value, Object.keys(ecologyFields), "Attached ecology sector");
    if (value.schema !== 1 || !Number.isFinite(value.lastUpdatedTick) || value.lastUpdatedTick < 0
      || value.lastUpdatedTick > Number.MAX_SAFE_INTEGER || !value.recentKills || Array.isArray(value.recentKills)
      || typeof value.recentKills !== "object" || Object.entries(value.recentKills).some(([kind, pressure]) => !kind
        || !Number.isFinite(pressure) || pressure < 0)) throw Error("Invalid attached ecology history.");
  }
}
export function asteroidEcologySectorKey(frame: AsteroidAttachmentFrame, x: number, z: number, view: AsteroidAttachmentView): string {
  return asteroidHistoryRegionKey(frame, x, z, view, ECOLOGY_SECTOR_SIZE);
}
export function projectAsteroidEcology(frame: AsteroidAttachmentFrame, canonical: Readonly<Record<string, EcologySectorSave>>): AsteroidEcologyView {
  validateEcology(canonical);
  return { frameId: frame.frameId, canonicalLocationId: frame.orbitId,
    sectors: cloneUniverseJson(Object.fromEntries(Object.entries(canonical).filter(([key]) => sectorTouches(frame, key)))) };
}
/** Single-owner replacement of explicitly queried history. No decay, rounding,
 * inferred sector duplication or addition of two cumulative history ledgers.
 * Caller binds clock/owner revision and validates actual simulation events. */
export function captureAsteroidEcology(frame: AsteroidAttachmentFrame, canonical: Readonly<Record<string, EcologySectorSave>>,
  baseline: AsteroidEcologyView, edited: AsteroidEcologyView): Record<string, EcologySectorSave> {
  if (canonicalJson(projectAsteroidEcology(frame, canonical)) !== canonicalJson(baseline)) throw Error("Stale attached ecology projection.");
  assertExactKeys(edited, ["frameId", "canonicalLocationId", "sectors"], "Attached ecology view");
  if (edited.frameId !== frame.frameId || edited.canonicalLocationId !== frame.orbitId) throw Error("Foreign attached ecology view.");
  validateEcology(edited.sectors);
  if (Object.keys(edited.sectors).some(key => !sectorTouches(frame, key))) throw Error("Edited ecology sector is outside the attached frame.");
  if (Object.entries(edited.sectors).some(([key, value]) => baseline.sectors[key]
    && value.lastUpdatedTick < baseline.sectors[key].lastUpdatedTick)) throw Error("Attached ecology clock cannot rewind.");
  return cloneUniverseJson({ ...Object.fromEntries(Object.entries(canonical).filter(([key]) => !sectorTouches(frame, key))), ...edited.sectors });
}
