import { CELESTIAL_MAX_Y, CELESTIAL_MIN_Y, type CelestialPoint } from "./celestial-terrain";
import { createAsteroidAttachmentFrame, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import type { createAsteroidAttachmentWorld } from "./asteroid-attachment-world";
import { alchemyHasWaterSource, effectiveLiquidAt, greenhouseSkyVisible, machineEnvironmentInputs, pumpHasWaterSource, type MachineEnvironmentContext } from "./environment-queries";
import { liquidKindForBlock, type LiquidCell } from "./liquids";
import { parseCustodyCellKey } from "./chest-custody-owner";
import { assertExactKeys, canonicalJson, cloneUniverseJson, freezeUniverseJson } from "./universe-json";
import type { MachineKind } from "./wayworks";

/** Optional canonical light field, not a new frame-owned light simulation.
 * Missing/unready light is unknown, never a fabricated zero/sky brightness.
 * Caller must bind this provider and its availability to the same source epoch
 * before simulation/admission; this read-only adapter grants neither. */
export type AsteroidCanonicalLight = Readonly<{
  gameplayLightAt(orbit: CelestialPoint, daylight: number): number | undefined;
}>;

/** Translated queries read the entire canonical orbit, including outside the
 * attachment's owned cells and clipped-away roofs. Never use rebaseAsteroidCell
 * for these reads: that helper intentionally enforces the write/custody bounds.
 * A future runtime adapter must keep one canonical fluid/pressure/light owner. */
export function createAsteroidEnvironmentQueries(inputFrame: AsteroidAttachmentFrame,
  world: ReturnType<typeof createAsteroidAttachmentWorld>, liquidRows: readonly (readonly [string, LiquidCell])[],
  light?: AsteroidCanonicalLight) {
  const frame = freezeUniverseJson(cloneUniverseJson(inputFrame));
  if (canonicalJson(frame) !== canonicalJson(createAsteroidAttachmentFrame(world.source.registry, frame.asteroidId)))
    throw Error("Environment frame differs from its canonical world.");
  const liquids = new Map<string, LiquidCell>();
  // Validate the actual rows before cloning: canonical JSON would otherwise
  // silently drop an unsupported own-undefined field before this exact check.
  for (const row of liquidRows) {
    if (!Array.isArray(row) || row.length !== 2) throw Error("Invalid canonical environment liquid row.");
    const [key, value] = row; parseCustodyCellKey(key);
    assertExactKeys(value, ["kind", "level", "source", "falling"], "Environment liquid");
    if (liquids.has(key) || !["water", "lava", "honey", "syrup"].includes(value.kind)
      || !Number.isSafeInteger(value.level) || typeof value.source !== "boolean" || typeof value.falling !== "boolean"
      || (value.source ? value.level !== 0 || value.falling : value.level < 1 || value.level > 15)
      || liquidKindForBlock(world.block(key)) !== value.kind) throw Error("Invalid canonical environment liquid state.");
    liquids.set(key, freezeUniverseJson(cloneUniverseJson(value)));
  }
  const rows = freezeUniverseJson(cloneUniverseJson(liquidRows));
  const orbitPoint = (point: CelestialPoint): CelestialPoint => {
    const result = { x: point.x + frame.offset.x, y: point.y + frame.offset.y, z: point.z + frame.offset.z };
    if (![point.x, point.y, point.z, result.x, result.y, result.z].every(Number.isSafeInteger))
      throw Error("Invalid translated environment coordinate.");
    return result;
  };
  const orbitKey = (point: CelestialPoint) => { const p = orbitPoint(point); return `${p.x},${p.y},${p.z}`; };
  const reads = Object.freeze({ minY: CELESTIAL_MIN_Y - frame.offset.y, maxY: CELESTIAL_MAX_Y - frame.offset.y,
    blockAt: (point: CelestialPoint) => world.block(orbitKey(point)),
    trackedLiquidAt: (point: CelestialPoint) => liquids.get(orbitKey(point)) });
  return Object.freeze({ ...reads,
    sourceBaseline: canonicalJson({ frame, world: world.source, liquidRows: rows }),
    facingAt: (point: CelestialPoint) => world.facing(orbitKey(point)),
    skyTopAt(x: number, z: number): number {
      const p = orbitPoint({ x, y: 0, z }); return world.skyTopAt(p.x, p.z) - frame.offset.y;
    },
    effectiveLiquidAt: (point: CelestialPoint) => effectiveLiquidAt(reads, point),
    pumpHasWaterSource: (point: CelestialPoint) => pumpHasWaterSource(reads, point),
    alchemyHasWaterSource(point: CelestialPoint): boolean { orbitPoint(point); return alchemyHasWaterSource(reads, point); },
    greenhouseSkyVisible(point: CelestialPoint): boolean {
      orbitPoint(point); return greenhouseSkyVisible(reads, point);
    },
    machineInputs: (point: CelestialPoint, kind: MachineKind, context: MachineEnvironmentContext) => machineEnvironmentInputs(reads, point, kind, context),
    gameplayLightAt(point: CelestialPoint, daylight: number): number | undefined {
      if (!Number.isFinite(daylight)) throw Error("Invalid environment daylight.");
      const orbit = orbitPoint(point), value = light?.gameplayLightAt(orbit, daylight);
      if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 15)) throw Error("Invalid canonical gameplay light.");
      return value;
    },
  });
}
