import { BLOCKS, BlockId, blockContainsWater } from "./data";
import { hasAlchemyWaterSourceWithin } from "./alchemy";
import { liquidKindForBlock, type LiquidCell } from "./liquids";
import type { CelestialPoint } from "./celestial-terrain";
import type { MachineKind } from "./wayworks";

export type EnvironmentVoxelQueries = Readonly<{
  maxY: number;
  blockAt(point: CelestialPoint): BlockId | undefined;
  trackedLiquidAt(point: CelestialPoint): LiquidCell | undefined;
}>;

/** The terrain light/sky-column predicate, not pressure solidity or a solar
 * panel's obstruction rule. Transparent full cubes do not set skyTop. */
export function blocksSky(type: BlockId): boolean {
  const definition = BLOCKS[type], fullCube = !definition?.shape || definition.shape === "cube";
  return Boolean(definition?.solid && fullCube && definition.layer !== "transparent" && definition.layer !== "cutout");
}

/** Glazed roofs pass greenhouse light but still seal pressure. Unknown cells
 * fail closed. maxY must be the complete source column, not a view boundary. */
export function greenhouseSkyVisible(world: Pick<EnvironmentVoxelQueries, "maxY" | "blockAt">, point: CelestialPoint): boolean {
  for (let y = point.y + 1; y <= world.maxY; y++) {
    const block = world.blockAt({ ...point, y });
    if (block === undefined || block !== BlockId.ReinforcedWindow && (BLOCKS[block]?.lightDampening ?? 15) >= 15) return false;
  }
  return true;
}

/** Preserve explicit flowing cells versus implicit full sources. A pump and a
 * waterwheel intentionally do not use this broad waterlogged-flora predicate. */
export function effectiveLiquidAt(world: Pick<EnvironmentVoxelQueries, "blockAt" | "trackedLiquidAt">, point: CelestialPoint): LiquidCell | undefined {
  const tracked = world.trackedLiquidAt(point); if (tracked) return tracked;
  const kind = liquidKindForBlock(world.blockAt(point));
  return kind ? { kind, level: 0, source: true, falling: false } : undefined;
}

export function pumpHasWaterSource(world: Pick<EnvironmentVoxelQueries, "blockAt" | "trackedLiquidAt">, point: CelestialPoint): boolean {
  return world.blockAt(point) === BlockId.Water && world.trackedLiquidAt(point)?.source !== false;
}

export const ALCHEMY_WATER_SOURCE_RADIUS = 5;
export function alchemyWaterSourceAt(world: Pick<EnvironmentVoxelQueries, "blockAt" | "trackedLiquidAt">, point: CelestialPoint): boolean {
  return blockContainsWater(world.blockAt(point)) && world.trackedLiquidAt(point)?.source !== false;
}
/** Actual catalyst query: implicit waterlogged sources count, tracked flow does
 * not. This intentionally differs from a pump's Water-only intake rule. */
export function alchemyHasWaterSource(world: Pick<EnvironmentVoxelQueries, "blockAt" | "trackedLiquidAt">, point: CelestialPoint): boolean {
  return hasAlchemyWaterSourceWithin(point, ALCHEMY_WATER_SOURCE_RADIUS,
    (x, y, z) => alchemyWaterSourceAt(world, { x, y, z }));
}
/** Visit the complete exact domain without early success, for source binding.
 * Reuses the runtime sphere enumerator rather than approximating it by a box. */
export function alchemyWaterQueryCells(point: CelestialPoint): CelestialPoint[] {
  const cells: CelestialPoint[] = [];
  hasAlchemyWaterSourceWithin(point, ALCHEMY_WATER_SOURCE_RADIUS, (x, y, z) => { cells.push({ x, y, z }); return false; });
  return cells;
}

export type MachineEnvironmentContext = Readonly<{
  daylight: number; eclipse: number; weatherKind: string; weatherWindSpeed: number;
  orbitDistanceAu: number; biomeName: string; pressureKPa: number; wind: number;
}>;

/** Shared by actual power simulation and translated read-only views. This
 * preserves the existing second eclipse factor (daylight already includes one)
 * rather than changing balancing during a coordinate-ownership refactor. */
export function machineEnvironmentInputs(world: EnvironmentVoxelQueries, point: CelestialPoint, kind: MachineKind, context: MachineEnvironmentContext) {
  const { x, y, z } = point;
  let exposed = true;
  if (kind === "sunplate-array" || kind === "wind-rotor") for (let skyY = y + 1; skyY <= world.maxY; skyY++) {
    const overhead = world.blockAt({ x, y: skyY, z });
    if (overhead === undefined || BLOCKS[overhead]?.solid) { exposed = false; break; }
  }
  const solarExposure = exposed ? context.daylight * (1 - context.eclipse) * (context.weatherKind === "clear" ? 1 : .35)
    / Math.max(1, context.orbitDistanceAu ** 2) : 0;
  const biomeName = context.biomeName.toLowerCase();
  const biomeWind = /forest|wood|jungle/.test(biomeName) ? .55 : /mountain|peak|cliff/.test(biomeName) ? 1.2 : 1;
  const clearRotor = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => {
    const neighbor = world.blockAt({ x: x + dx, y: y + 1, z: z + dz }); return neighbor !== undefined && !BLOCKS[neighbor]?.solid;
  });
  const windExposure = exposed && clearRotor && context.pressureKPa > 0
    ? Math.min(1, context.wind * biomeWind * Math.max(.1, context.weatherWindSpeed) / 2.5) : 0;
  const flowingNeighbors = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]].filter(([dx, dy, dz]) => {
    const neighbor = { x: x + dx, y: y + dy, z: z + dz }, cell = world.trackedLiquidAt(neighbor);
    return world.blockAt(neighbor) === BlockId.Water && cell?.kind === "water" && !cell.source && (cell.falling || cell.level > 0);
  }).length;
  return { solarExposure, windExposure, waterFlow: Math.min(1, flowingNeighbors / 2) };
}
