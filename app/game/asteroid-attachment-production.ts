import { BlockId } from "./data";
import { normalizeAlchemyStand, normalizeDistillery } from "./alchemy";
import { normalizeSugarworks } from "./candyworks";
import { normalizeGolemForgeState } from "./v1-cultures";
import type { WorldSave } from "./engine";
import type { LiquidCell } from "./liquids";
import { encodeAttachmentSource } from "./attachment-source-preimage";
import { parseCustodyCellKey } from "./chest-custody-owner";
import { createAsteroidAttachmentFrame, asteroidAttachmentContainsCell, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";
import type { createAsteroidAttachmentWorld } from "./asteroid-attachment-world";
import { createAsteroidEnvironmentQueries } from "./asteroid-environment-queries";
import { alchemyWaterQueryCells, alchemyWaterSourceAt } from "./environment-queries";
import { canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

export type AsteroidProductionSources = Pick<WorldSave, "golemForges" | "alchemyStands" | "distilleries" | "sugarworks">;
export const ASTEROID_PRODUCTION_STATIONS = Object.freeze({
  golemForges: { block: BlockId.GolemForge, normalize: normalizeGolemForgeState },
  alchemyStands: { block: BlockId.AlchemyStand, normalize: normalizeAlchemyStand },
  distilleries: { block: BlockId.Distillery, normalize: normalizeDistillery },
  sugarworks: { block: BlockId.Sugarworks, normalize: normalizeSugarworks },
} satisfies Record<keyof AsteroidProductionSources, { block: BlockId; normalize(value: unknown): unknown }>);

/** Physical installations and finite station ledgers, not creature inventories.
 * No recipe tick, lazy initialization, output/orb allocation or owner transfer.
 * Alchemy may READ across a frame boundary through the canonical environment
 * adapter; its water is not copied or consumed by this read-only selection. */
export function selectAsteroidProductionStations(frame: AsteroidAttachmentFrame, source: AsteroidProductionSources,
  world: ReturnType<typeof createAsteroidAttachmentWorld>, liquids: readonly (readonly [string, LiquidCell])[]) {
  if (canonicalJson(frame) !== canonicalJson(createAsteroidAttachmentFrame(world.source.registry, frame.asteroidId)))
    throw Error("Production frame differs from its canonical world.");
  if (!isUniverseRecord(source) || Object.keys(source).some(key => !Object.hasOwn(ASTEROID_PRODUCTION_STATIONS, key)))
    throw Error("Invalid production station source.");
  const encodedSource = encodeAttachmentSource(source), environment = createAsteroidEnvironmentQueries(frame, world, liquids);
  for (const [field, definition] of Object.entries(ASTEROID_PRODUCTION_STATIONS)) {
    const records = source[field as keyof AsteroidProductionSources];
    if (records === undefined) {
      if (Object.hasOwn(source, field)) throw Error("Invalid production station undefined table.");
      continue;
    }
    if (!isUniverseRecord(records)) throw Error("Invalid production station table.");
    for (const [key, value] of Object.entries(records)) {
      try { parseCustodyCellKey(key); } catch { throw Error("Invalid production station key."); }
      if (world.block(key) !== definition.block) throw Error("Recorded production station has no matching canonical block.");
      // Normalizers are used only as a pure validity oracle. Any repair,
      // truncation, unknown field or nested undefined difference is rejected.
      if (JSON.stringify(encodeAttachmentSource(value)) !== JSON.stringify(encodeAttachmentSource(definition.normalize(value))))
        throw Error("Production station state requires lossy normalization.");
    }
  }
  const installations = Object.entries(world.authoredVoxels).sort(([a], [b]) => a.localeCompare(b)).flatMap(([key, block]) => {
    const field = (Object.keys(ASTEROID_PRODUCTION_STATIONS) as (keyof AsteroidProductionSources)[])
      .find(name => ASTEROID_PRODUCTION_STATIONS[name].block === block);
    if (!field) return [];
    const [x, y, z] = parseCustodyCellKey(key), attached = asteroidAttachmentContainsCell(frame, key, "orbit");
    if (asteroidAttachmentVolumeSide(frame, { minX: x - .5, maxX: x + .5, minY: y - .5, maxY: y + .5,
      minZ: z - .5, maxZ: z + .5 }, "orbit") !== attached) throw Error("Production station body crosses its boundary.");
    const records = source[field], recorded = !!records && Object.hasOwn(records, key);
    const point = { x: x - frame.offset.x, y: y - frame.offset.y, z: z - frame.offset.z };
    const water = field === "alchemyStands" ? alchemyWaterQueryCells(point).map(cell => {
      const orbit = { x: cell.x + frame.offset.x, y: cell.y + frame.offset.y, z: cell.z + frame.offset.z };
      return { key: `${orbit.x},${orbit.y},${orbit.z}`, block: environment.blockAt(cell),
        source: alchemyWaterSourceAt(environment, cell), tracked: environment.trackedLiquidAt(cell) ?? null };
    }) : null;
    return [{ field, key, attached, recorded, facing: world.facing(key),
      state: recorded ? cloneUniverseJson(records![key]) : null,
      water: water ? { hasSource: water.some(cell => cell.source), cells: water } : null }];
  });
  return freezeUniverseJson({ source: encodedSource, environmentBaseline: environment.sourceBaseline, installations });
}
