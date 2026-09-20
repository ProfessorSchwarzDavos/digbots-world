import * as THREE from "three";
import { homeLocation, locationId, parseLocationId, universeId, locationStamp as validateLocationStamp, type LocationStamp } from "./location-address";
import { celestialTerrainSeed, createCelestialTerrain, MORROW_REGIONS, type CelestialTerrain } from "./celestial-terrain";
import { ChunkMemoryCache, ChunkPersistentCache, type CachedChunkData } from "./chunk-cache";
import { TerrainBufferPipeline, type TerrainMergedGeometry, type TerrainSectionGeometry } from "./terrain-buffer-pipeline";
import { TerrainGenerationPipeline, type TerrainGenerationResult } from "./terrain-generation-pipeline";
import {
  adventureClearanceBounds,
  adventureDungeonCandidateForChunk,
  adventureMarkersForChunk,
  adventurePlacementsForChunk,
  adventurePoiCandidateForChunk,
  planAdventureStructure,
  type AdventureBiome,
} from "./adventure-content";
import { paintBiomeSurfaceAtlasTile } from "./biome-atmosphere";
import { mythicSiteByStructureKind, validateMythicSitePlacement } from "./mythic-frontiers";
import {
  APPLE_CRATE_SIDE_TILE,
  APPLE_CRATE_TOP_TILE,
  BREAD_CRATE_SIDE_TILE,
  BREAD_CRATE_TOP_TILE,
  BLOCKS,
  BRINEGRASS_TILE,
  CACTUS_TOP_TILE,
  DEEPGEAR_BRICK_TILE,
  DEEPGEAR_LANTERN_TILE,
  DRAGON_HOARD_COIN_TILE,
  DRAGON_HOARD_GOLD_TILE,
  DRAGON_HOARD_JEWEL_TILE,
  DREAMCAP_TILE,
  FROSTPEAR_CRATE_SIDE_TILE,
  FROSTPEAR_CRATE_TOP_TILE,
  FROSTPEAR_FRUIT_TILE,
  FROSTPEAR_LEAVES_TILE,
  FROSTPEAR_SAPLING_TILE,
  FEATHERWRACK_TILE,
  FLOUR_CRATE_SIDE_TILE,
  FLOUR_CRATE_TOP_TILE,
  GIANT_MUSHROOM_GILLS_TILE,
  GIANT_MUSHROOM_SIDE_TILE,
  GIANT_MUSHROOM_TOP_TILE,
  LEAF_BLOCKS,
  MOONBERRY_CRATE_SIDE_TILE,
  MOONBERRY_CRATE_TOP_TILE,
  MOONBERRY_COOKIE_CRATE_SIDE_TILE,
  MOONBERRY_COOKIE_CRATE_TOP_TILE,
  MOONBOUGH_LEAVES_TILE,
  MOONFELT_MYCELIUM_TILE,
  PEARLFAN_TILE,
  REED_BLOOM_CROWN_TILE,
  REED_BLOOM_STEM_TILE,
  RIVER_RIBBON_TILE,
  RIVETED_BRASS_TILE,
  ROOTWEAVE_SOIL_SIDE_TILE,
  SAILKELP_TILE,
  STAR_CRYSTAL_ORE_TILE,
  WHEAT_MILL_SIDE_TILE,
  WHEAT_MILL_TOP_TILE,
  STARFERN_TILE,
  SHELLFRUIT_CRATE_SIDE_TILE,
  SHELLFRUIT_CRATE_TOP_TILE,
  SHELLFRUIT_CROP_TILE,
  SHELLFRUIT_SPROUT_TILE,
  SHELLFRUIT_YOUNG_TILE,
  STAR_CRYSTAL_BLOCK_BOTTOM_TILE,
  STAR_CRYSTAL_BLOCK_SIDE_TILE,
  STAR_CRYSTAL_BLOCK_TOP_TILE,
  SUNBERRY_CRATE_SIDE_TILE,
  SUNBERRY_CRATE_TOP_TILE,
  BlockId,
  archiveShelfBookCount,
  blockContainsWater,
  blockEmitsLight,
  isWaterloggedFloraBlock,
  type RenderLayer,
} from "./data";
import {
  CAVE_ENTRANCE_CELL_SIZE,
  caveEntranceSampleForSite,
  caveFeatureAt,
  resolveSafeCaveEntranceSite,
  type SafeCaveEntranceSite,
} from "./caves";
import { CHEST_VISUAL } from "./chest-model";
import { doorIsOpen, doorState, doorUsesXAxis, isDoorBlock } from "./doors";
import { DENSE_CUTOUT_LEAF_POLICY, planFullTree, planSubmergedFlora, planSyrupPondsForChunk, syrupPondColumnAt, wildPeppermintHeight, type TreeForm, type TreePlanBlock } from "./ecology";
import { dragonLairMarkersForChunk, dragonLairPlacementsForChunk, dragonLairsIntersectingChunk, repairGeneratedTreePlan } from "./dragon-world";
import { NPC_FACTION_IDS, normalizeEnabledFactions, type NpcFactionId } from "./factions";
import { isRootableTreeSoil, planFrostpearTree } from "./farming";
import { GUILD_NPCS, compatibleGuildIdsForSettlement, planGuildHalls, type GuildHallCandidate, type GuildHallState, type GuildId } from "./guilds";
import {
  planBiomeVegetation,
  planStructure,
  structureBiomeFromId,
  structureCandidateForChunk,
  structureClearanceBounds,
  structureMarkersForChunk,
  structurePlacementsForChunk,
  rollStructureLoot,
  type PlannedBlock,
  type StructureKind,
  type StructureMarker,
} from "./structures";
import {
  SETTLEMENT_SIZE_RULES,
  alignedCreatureSpawnRadius,
  createSettlementState,
  planSettlementCandidate,
  planSettlementLayout,
  settlementWinsSpacingTieBreak,
  type SettlementBiome,
  type SettlementCandidate,
  type SettlementLayoutPlan,
  type SettlementResident,
} from "./settlements";
import {
  DEFAULT_SETTLEMENT_ORIGIN_SEARCH_RADIUS,
  SettlementIndex,
  normalizeSettlementOriginSearchRadius,
  normalizeSettlementPlacementOptions,
  normalizeWorldOriginPreference,
  type LargeTownFrequency,
  type RoadCoverage,
  type SettlementClustering,
  type SettlementIndexResult,
  type SettlementPattern,
  type SettlementQuery,
  type SettlementRoadConnection,
  type SettlementTerrainSampler,
  type WorldOriginPreference,
} from "./settlement-index";
import { SEA_DRAGON_NEST_MAX_RADIUS, planSeaDragonNest } from "./v1-cultures";
import { planDoubleTallGrassReplacement } from "./tall-grass";
import { planRegionalRoadGraph, planTerrainFollowingRoad, type RoadEdge, type RoadPoint } from "./surface-roads";
import { LEGENDARY_SITE_CELL_CHUNKS, planLegendaryEncounterSite, type LegendaryEncounterId } from "./legendary-encounters";
import {
  UndergroundBiomeId,
  CAVE_GRAPH_MAX_RADIUS,
  caveGraphEdgesInBounds,
  caveGraphNodesInBounds,
  nearestUpperCaveNode,
  undergroundBiomeAt as sampleUndergroundBiome,
} from "./underground";
import { LightChannel, MAX_LIGHT_LEVEL, VoxelLightEngine, lightChannel, perceivedBlockLight, type VoxelLightInitializationTask } from "./lighting";
import {
  BLOCK_FACING_NORTH,
  blockFacingRight,
  isDirectionallyPlacedBlock,
  normalizeBlockFacing,
  rotateBlockOffset,
  type BlockFacing,
} from "./block-facing";

export const CHUNK_SIZE = 16;
export const MIN_Y = -64;
export const MAX_Y = 127;
export const WORLD_HEIGHT = MAX_Y - MIN_Y + 1;
export const SEA_LEVEL = 32;
export const SECTION_HEIGHT = 16;
export const SECTION_COUNT = WORLD_HEIGHT / SECTION_HEIGHT;
export const GENERATOR_VERSION = 18;
/** v1.8.4: conventional ore rolls are 25% richer before the world's abundance setting. */
export const ORE_SPAWN_RATE_MULTIPLIER = 1.25;
/** Shared vein cells were 2 x 2 x 2; broader 3 x 2 x 3 cells permit larger, still porous seams. */
export const ORE_VEIN_CELL_SIZE = Object.freeze({ horizontal: 3, vertical: 2 });
/** Desert cacti now appear at 15% of their original 1.5% per-column roll. */
export const DESERT_CACTUS_SPAWN_CHANCE = 0.00225;

export type SettlementWorldPlan = Readonly<{
  candidate: SettlementCandidate;
  layout: SettlementLayoutPlan;
}>;

export type WorldGenerationOptions = {
  profile: "legacy-v14" | "world-below-v15";
  caveFrequency: number;
  biomeScale: number;
  resourceAbundance: number;
  structures: boolean;
  /** Empty means a wilderness world; biome generation is never faction-gated. */
  enabledFactions: readonly NpcFactionId[];
  settlementPattern: SettlementPattern;
  settlementDensity: number;
  settlementClustering: SettlementClustering;
  roadCoverage: RoadCoverage;
  largeTownFrequency: LargeTownFrequency;
  origin: WorldOriginPreference;
};

export const DEFAULT_WORLD_GENERATION_OPTIONS: Readonly<WorldGenerationOptions> = Object.freeze({
  profile: "world-below-v15",
  caveFrequency: 1,
  /** v1.4 regions average roughly 35% wider without turning into continent-long monocultures. */
  biomeScale: 1.35,
  resourceAbundance: 1,
  structures: true,
  enabledFactions: Object.freeze([...NPC_FACTION_IDS]),
  settlementPattern: "heartlands-v2",
  settlementDensity: 1,
  settlementClustering: "regional",
  roadCoverage: "regional",
  largeTownFrequency: "balanced",
  origin: Object.freeze({ mode: "wilderness" }),
});

export enum BiomeId {
  DeepOcean = 0,
  Ocean = 1,
  Beach = 2,
  Meadow = 3,
  Wildwood = 4,
  Frostpine = 5,
  Desert = 6,
  Savanna = 7,
  Siltfen = 8,
  Snowfield = 9,
  Badlands = 10,
  Birchlight = 11,
  Bloomwood = 12,
  Highlands = 13,
  Volcanic = 14,
  MushroomFen = 15,
  River = 16,
  CloudreedGlen = 17,
  RainveilJungle = 18,
  SakurabloomGrove = 19,
  LumenTrench = 20,
  SugarplumVale = 21,
  Glimmerwood = 22,
  SnowcapRange = 23,
  PaleRegolithSea = 24,
  StarshadowCraters = 25,
  MoonSlateHighlands = 26,
  IceLanternRilles = 27,
  BuriedWaystoneGalleries = 28,
  OrbitalVoid = 29,
}

function aquaticSurfaceBiome(biome: BiomeId) {
  return biome === BiomeId.River
    || biome === BiomeId.Ocean
    || biome === BiomeId.DeepOcean
    || biome === BiomeId.LumenTrench
    || biome === BiomeId.Beach;
}

export const BIOME_NAMES: Record<number, string> = {
  [BiomeId.DeepOcean]: "Abyssal Ocean",
  [BiomeId.Ocean]: "Brightwater Ocean",
  [BiomeId.Beach]: "Sunwash Coast",
  [BiomeId.Meadow]: "Flower Meadow",
  [BiomeId.Wildwood]: "Wildwood Forest",
  [BiomeId.Frostpine]: "Frostpine Taiga",
  [BiomeId.Desert]: "Sunglass Desert",
  [BiomeId.Savanna]: "Sunstep Savanna",
  [BiomeId.Siltfen]: "Siltfen Swamp",
  [BiomeId.Snowfield]: "Whispering Snowfield",
  [BiomeId.Badlands]: "Painted Badlands",
  [BiomeId.Birchlight]: "Birchlight Grove",
  [BiomeId.Bloomwood]: "Bloomwood Vale",
  [BiomeId.Highlands]: "Cloudbreak Highlands",
  [BiomeId.Volcanic]: "Ember Wastes",
  [BiomeId.MushroomFen]: "Mooncap Fen",
  [BiomeId.River]: "Wandering River",
  [BiomeId.CloudreedGlen]: "Cloudreed Glen",
  [BiomeId.RainveilJungle]: "Rainveil Jungle",
  [BiomeId.SakurabloomGrove]: "Sakurabloom Grove",
  [BiomeId.LumenTrench]: "Lumen Trench",
  [BiomeId.SugarplumVale]: "Sugarplum Vale",
  [BiomeId.Glimmerwood]: "Glimmerwood",
  [BiomeId.SnowcapRange]: "Snowcap Range",
  [BiomeId.PaleRegolithSea]: "Pale Regolith Sea",
  [BiomeId.StarshadowCraters]: "Starshadow Craters",
  [BiomeId.MoonSlateHighlands]: "Moon-Slate Highlands",
  [BiomeId.IceLanternRilles]: "Ice-Lantern Rilles",
  [BiomeId.BuriedWaystoneGalleries]: "Buried Waystone Galleries",
  [BiomeId.OrbitalVoid]: "Orbital Void",
};

export function guildLodgeGuildsForBiome(biome: BiomeId): readonly GuildId[] {
  return biome === BiomeId.SugarplumVale
    ? ["sugarcourt-makers", "hearthroad", "waykeeper"]
    : [BiomeId.Beach, BiomeId.River].includes(biome)
      ? ["tideglass", "hearthroad", "waykeeper"]
      : [BiomeId.Highlands, BiomeId.SnowcapRange, BiomeId.Badlands, BiomeId.Volcanic].includes(biome)
        ? ["deepgear", "hearthroad", "brassroot"]
        : [BiomeId.Wildwood, BiomeId.Birchlight, BiomeId.Bloomwood, BiomeId.Glimmerwood, BiomeId.RainveilJungle, BiomeId.SakurabloomGrove, BiomeId.MushroomFen].includes(biome)
          ? ["moonbough", "waykeeper", "hearthroad"]
          : [BiomeId.Desert, BiomeId.Savanna].includes(biome)
            ? ["brassroot", "hearthroad", "waykeeper"]
            : ["waykeeper", "hearthroad", "brassroot"];
}

/** Pure rarity/culture plan; terrain validation remains in the chunk author. */
export function planGuildLodgeForRegion(seed: number, regionX: number, regionZ: number, biome: BiomeId) {
  if (hash2(regionX, regionZ, seed ^ 0x6a09e667) >= .1) return null;
  const guilds = guildLodgeGuildsForBiome(biome);
  const index = Math.floor(hash2(regionX, regionZ, seed ^ 0xbb67ae85) * guilds.length) % guilds.length;
  return Object.freeze({ guildId: guilds[index] });
}

export function adventureBiomeFromId(biome: BiomeId): AdventureBiome | null {
  if ([BiomeId.Beach, BiomeId.Ocean, BiomeId.DeepOcean, BiomeId.LumenTrench].includes(biome)) return "coast";
  if (biome === BiomeId.Meadow || biome === BiomeId.CloudreedGlen) return "meadow";
  if ([BiomeId.Wildwood, BiomeId.Birchlight, BiomeId.Bloomwood, BiomeId.RainveilJungle, BiomeId.SakurabloomGrove].includes(biome)) return "forest";
  if ([BiomeId.Frostpine, BiomeId.Snowfield, BiomeId.SnowcapRange].includes(biome)) return "snow";
  if (biome === BiomeId.Desert) return "desert";
  if (biome === BiomeId.Badlands) return "badlands";
  if (biome === BiomeId.Savanna) return "savanna";
  if (biome === BiomeId.Siltfen) return "swamp";
  if (biome === BiomeId.Highlands) return "highlands";
  if (biome === BiomeId.Volcanic) return "volcanic";
  if (biome === BiomeId.MushroomFen) return "mushroom";
  if (biome === BiomeId.Glimmerwood) return "glimmerwood";
  if (biome === BiomeId.SugarplumVale) return "sugarplum";
  return null;
}

/** Small deterministic amenity pass layered onto the older landmark shells. */
export function planPoiAmenities(kind: StructureKind, origin: Readonly<{ x: number; y: number; z: number }>): readonly PlannedBlock[] {
  const at = (dx: number, dy: number, dz: number, block: BlockId, variant = "poi-amenity"): PlannedBlock => ({
    x: origin.x + dx,
    y: origin.y + dy,
    z: origin.z + dz,
    block,
    variant,
  });
  if (kind === "desert-temple") return [
    at(0, 1, 6, BlockId.DoorClosedLower, "temple-door"), at(0, 2, 6, BlockId.DoorClosedUpper, "temple-door"),
    at(-2, 2, -2, BlockId.TorchWallSouth, "temple-sconce"), at(2, 2, -2, BlockId.TorchWallSouth, "temple-sconce"),
    at(-2, 1, 1, BlockId.WildwoodTable), at(-3, 1, 1, BlockId.WildwoodStool), at(3, 1, -1, BlockId.SealedBarrel),
  ];
  if (kind === "forest-temple") return [
    at(0, 1, 5, BlockId.DoorClosedLower, "temple-door"), at(0, 2, 5, BlockId.DoorClosedUpper, "temple-door"),
    at(-1, 3, 5, BlockId.TorchWallEast, "temple-sconce"), at(1, 3, 5, BlockId.TorchWallWest, "temple-sconce"),
    at(-2, 1, 2, BlockId.WildwoodTable), at(-3, 1, 2, BlockId.WildwoodStool), at(2, 1, 3, BlockId.WildwoodShelf),
  ];
  if (kind === "sunbun-grove") return [
    at(-2, 1, -3, BlockId.WildwoodTable), at(-3, 1, -3, BlockId.WildwoodStool), at(-1, 1, -3, BlockId.WildwoodStool),
    at(4, 1, 3, BlockId.SealedBarrel), at(-4, 2, 0, BlockId.TorchWallEast), at(4, 2, 0, BlockId.TorchWallWest),
  ];
  if (kind === "meadow-butterfly-sanctuary") return [
    at(-3, 1, 0, BlockId.WildwoodStool), at(3, 1, 0, BlockId.WildwoodStool), at(0, 1, -3, BlockId.WildwoodTable),
  ];
  if (kind === "abandoned-apiary") return [
    at(0, 2, 2, BlockId.WildwoodTable), at(-1, 2, 2, BlockId.WildwoodStool), at(3, 2, -2, BlockId.SealedBarrel),
    at(-3, 2, -2, BlockId.WildwoodShelf), at(0, 2, -2, BlockId.Torch),
  ];
  return [
    at(-3, 1, 0, BlockId.WildwoodStool), at(3, 1, 0, BlockId.WildwoodStool),
    at(0, 1, -3, BlockId.WildwoodTable),
    at(0, 1, 5, BlockId.MoonSlate, "grotto-sconce-support"), at(0, 2, 5, BlockId.MoonSlate, "grotto-sconce-support"),
    at(0, 2, 4, BlockId.TorchWallNorth, "grotto-sconce"),
  ];
}

export function settlementBiomeFromId(biome: BiomeId): SettlementBiome | null {
  if (biome === BiomeId.Meadow) return "flower-meadow";
  if (biome === BiomeId.Wildwood) return "wildwood";
  if (biome === BiomeId.Birchlight || biome === BiomeId.Bloomwood) return "forest";
  if (biome === BiomeId.Highlands) return "highlands";
  if (biome === BiomeId.Badlands) return "badlands";
  if (biome === BiomeId.CloudreedGlen) return "cloudreed-glen";
  if (biome === BiomeId.RainveilJungle || biome === BiomeId.SakurabloomGrove) return "forest";
  if (biome === BiomeId.DeepOcean) return "deep-ocean";
  if (biome === BiomeId.LumenTrench) return "lumen-trench";
  if (biome === BiomeId.SugarplumVale) return "sugarplum-vale";
  if (biome === BiomeId.Glimmerwood) return "glimmerwood";
  if (biome === BiomeId.SnowcapRange) return "snowcap-range";
  return null;
}

function legendaryHabitatKey(biome: BiomeId) {
  if (biome === BiomeId.DeepOcean) return "deep-ocean";
  if (biome === BiomeId.Ocean) return "ocean";
  if (biome === BiomeId.LumenTrench) return "lumen-trench";
  if (biome === BiomeId.Meadow) return "flower-meadow";
  if (biome === BiomeId.Wildwood) return "wildwood";
  if (biome === BiomeId.River) return "river";
  if (biome === BiomeId.Glimmerwood) return "glimmerwood";
  if (biome === BiomeId.Highlands) return "highlands";
  if (biome === BiomeId.SnowcapRange) return "snowcap-range";
  if (biome === BiomeId.Badlands) return "badlands";
  if (biome === BiomeId.CloudreedGlen) return "cloudreed-glen";
  if (biome === BiomeId.Savanna) return "savanna";
  if (biome === BiomeId.SugarplumVale) return "sugarplum-vale";
  return "other";
}

function settlementResidentMobKind(resident: SettlementResident, faction: "hobbits" | "goblins" | "atlantians" | "sugarcourt" | "wood-elves" | "dwarves") {
  if (faction === "wood-elves") {
    if (resident.profession === "wood-elf-elderweaver") return "wood-elf-elderweaver";
    if (resident.profession === "wood-elf-leafwarden") return "wood-elf-leafwarden";
    if (resident.profession === "wood-elf-bow-warden") return "wood-elf-bow-warden";
    if (resident.profession === "wood-elf-grovekeeper") return "wood-elf-grovekeeper";
    if (resident.profession === "wood-elf-tomekeeper") return "wood-elf-tomekeeper";
    if (resident.profession === "wood-elf-potioner") return "wood-elf-potioner";
    return "wood-elf-moonbroker";
  }
  if (faction === "dwarves") {
    if (resident.profession === "dwarf-thane") return "dwarf-thane";
    if (resident.profession === "dwarf-gatewarden") return "dwarf-gatewarden";
    if (resident.profession === "dwarf-delver") return "dwarf-delver";
    if (resident.profession === "dwarf-gearwright") return "dwarf-gearwright";
    if (resident.profession === "dwarf-golemsmith") return "dwarf-golemsmith";
    if (resident.profession === "dwarf-powderwright") return "dwarf-powderwright";
    return "dwarf-provisioner";
  }
  if (faction === "sugarcourt") {
    if (resident.profession === "sugarcourt-crown-confectioner") return "sugarcourt-crown-confectioner";
    if (resident.profession === "sugarcourt-brittle-guard") return "sugarcourt-brittle-guard";
    if (resident.profession === "sugarcourt-gumdrop-gardener") return "sugarcourt-gumdrop-gardener";
    if (resident.profession === "sugarcourt-sweetbroker") return "sugarcourt-sweetbroker";
    if (resident.profession === "sugarcourt-kennelkeeper") return "sugarcourt-kennelkeeper";
    if (resident.profession === "sugarcourt-sugarboiler") return "sugarcourt-sugarboiler";
    return "sugarcourt-candysmith";
  }
  if (faction === "atlantians") {
    if (resident.profession === "atlantian-tidewarden") return "atlantian-tidewarden";
    if (resident.profession === "atlantian-trident-guard") return "atlantian-trident-guard";
    if (resident.profession === "atlantian-kelpkeeper") return "atlantian-kelpkeeper";
    if (resident.profession === "atlantian-coralwright") return "atlantian-coralwright";
    if (resident.profession === "atlantian-pearlbroker") return "atlantian-pearlbroker";
    return "atlantian-glowmender";
  }
  if (faction === "hobbits") {
    if (resident.profession === "mayor") return "hobbit-mayor";
    if (resident.profession === "warrior") return resident.equipment.weapon === "crossbow" ? "hobbit-crossbow-guard" : "hobbit-hammer-guard";
    if (resident.profession === "farmer") return "hobbit-farmer";
    if (resident.profession === "miner" || resident.profession === "blacksmith") return "hobbit-miner";
    if (resident.profession === "banker") return "hobbit-banker";
    return "hobbit-merchant";
  }
  if (resident.profession === "mayor") return "goblin-chieftain";
  if (resident.profession === "warrior") return "goblin-spear-guard";
  if (resident.profession === "miner" || resident.profession === "blacksmith") return "goblin-miner";
  if (resident.profession === "alchemist") return "goblin-alchemist";
  return "goblin-worker";
}

export type SettlementBlockPalette = Readonly<{
  path: BlockId;
  perimeterWall: BlockId;
  tower: BlockId;
  lightBase: BlockId;
  buildingWall: BlockId;
  corner: BlockId;
  roof: BlockId;
  floor: BlockId;
  hallFloor: BlockId;
}>;

/** Keyed palettes keep new cultures from silently inheriting Goblin materials. */
export function settlementBlockPalette(factionId: string): SettlementBlockPalette {
  if (factionId === "hobbits") return Object.freeze({
    path: BlockId.Gravel, perimeterWall: BlockId.WildwoodFence, tower: BlockId.WildwoodLog, lightBase: BlockId.WildwoodFence,
    buildingWall: BlockId.Planks, corner: BlockId.WildwoodLog, roof: BlockId.HobbitThatch, floor: BlockId.Planks, hallFloor: BlockId.StoneBrick,
  });
  if (factionId === "goblins") return Object.freeze({
    path: BlockId.GoblinBrasswork, perimeterWall: BlockId.GoblinBrasswork, tower: BlockId.GoblinBrasswork, lightBase: BlockId.GoblinBrasswork,
    buildingWall: BlockId.GoblinBrasswork, corner: BlockId.StoneBrick, roof: BlockId.GoblinBrasswork, floor: BlockId.Planks, hallFloor: BlockId.StoneBrick,
  });
  if (factionId === "atlantians") return Object.freeze({
    path: BlockId.StarCoral, perimeterWall: BlockId.StarCoral, tower: BlockId.MoonSlate, lightBase: BlockId.StarCoral,
    buildingWall: BlockId.Glass, corner: BlockId.MoonSlate, roof: BlockId.StarCoral, floor: BlockId.MoonSlate, hallFloor: BlockId.MoonSlate,
  });
  if (factionId === "sugarcourt") return Object.freeze({
    path: BlockId.SugarSoil, perimeterWall: BlockId.BoiledSugarbrick, tower: BlockId.CandywoodLog, lightBase: BlockId.CandywoodLog,
    buildingWall: BlockId.BoiledSugarbrick, corner: BlockId.CandywoodLog, roof: BlockId.BoiledSugarbrick, floor: BlockId.CandywoodLog, hallFloor: BlockId.BoiledSugarbrick,
  });
  if (factionId === "wood-elves") return Object.freeze({
    path: BlockId.MoonboughLog, perimeterWall: BlockId.MoonboughLeaves, tower: BlockId.MoonboughLog, lightBase: BlockId.MoonboughLog,
    buildingWall: BlockId.MoonboughLog, corner: BlockId.MoonboughLog, roof: BlockId.MoonboughLeaves, floor: BlockId.GlimmerGrass, hallFloor: BlockId.Moonwell,
  });
  if (factionId === "dwarves") return Object.freeze({
    path: BlockId.DeepgearBrick, perimeterWall: BlockId.DeepgearBrick, tower: BlockId.RivetedBrass, lightBase: BlockId.RivetedBrass,
    buildingWall: BlockId.DeepgearBrick, corner: BlockId.RivetedBrass, roof: BlockId.DeepgearBrick, floor: BlockId.DeepgearBrick, hallFloor: BlockId.RivetedBrass,
  });
  return Object.freeze({
    path: BlockId.Gravel, perimeterWall: BlockId.StoneBrick, tower: BlockId.StoneBrick, lightBase: BlockId.StoneBrick,
    buildingWall: BlockId.Planks, corner: BlockId.WildwoodLog, roof: BlockId.Planks, floor: BlockId.Planks, hallFloor: BlockId.StoneBrick,
  });
}

/** The gate rails run along the wall edge while the opening faces outward. */
export function settlementGateBlockForFacing(facing: number) {
  return normalizeBlockFacing(facing) % 2 === 0 ? BlockId.FenceGateNorthSouthClosed : BlockId.FenceGateEastWestClosed;
}

/** Complete two-cell bed placement for authored settlement interiors. */
export function settlementBedBlocksForFacing(facing: number) {
  const normalized = normalizeBlockFacing(facing);
  if (normalized === 1) return { foot: BlockId.BedEastFoot, head: BlockId.BedEastHead, dx: 1, dz: 0 } as const;
  if (normalized === 2) return { foot: BlockId.BedSouthFoot, head: BlockId.BedSouthHead, dx: 0, dz: 1 } as const;
  if (normalized === 3) return { foot: BlockId.BedWestFoot, head: BlockId.BedWestHead, dx: -1, dz: 0 } as const;
  return { foot: BlockId.BedNorthFoot, head: BlockId.BedNorthHead, dx: 0, dz: -1 } as const;
}

/** A restrained accent palette gives each hall an identity without making it
 * look imported from a different voxel language than its host settlement. */
export function guildHallBlockPalette(guildId: GuildId, state: GuildHallState): SettlementBlockPalette {
  const established = state !== "lodge";
  const charter = state === "charter";
  if (guildId === "tideglass") return Object.freeze({
    path: BlockId.StarCoral, perimeterWall: BlockId.MoonSlate, tower: BlockId.Glowstone, lightBase: BlockId.StarCoral,
    buildingWall: BlockId.Glass, corner: BlockId.MoonSlate, roof: charter ? BlockId.Glowstone : BlockId.StarCoral, floor: BlockId.MoonSlate, hallFloor: BlockId.MoonSlate,
  });
  if (guildId === "moonbough") return Object.freeze({
    path: BlockId.GlimmerGrass, perimeterWall: BlockId.MoonboughLeaves, tower: BlockId.MoonboughLog, lightBase: BlockId.Moonwell,
    buildingWall: BlockId.MoonboughLog, corner: BlockId.LivingRoot, roof: established ? BlockId.MoonboughLeaves : BlockId.MoonboughLog, floor: BlockId.GlimmerGrass, hallFloor: BlockId.Moonwell,
  });
  if (guildId === "brassroot") return Object.freeze({
    path: BlockId.Gravel, perimeterWall: BlockId.GoblinBrasswork, tower: BlockId.RivetedBrass, lightBase: BlockId.GoblinBrasswork,
    buildingWall: BlockId.GoblinBrasswork, corner: BlockId.RivetedBrass, roof: charter ? BlockId.RuneStone : BlockId.StoneBrick, floor: BlockId.Planks, hallFloor: BlockId.StoneBrick,
  });
  if (guildId === "deepgear") return Object.freeze({
    path: BlockId.DeepgearBrick, perimeterWall: BlockId.DeepgearBrick, tower: BlockId.RivetedBrass, lightBase: BlockId.RivetedBrass,
    buildingWall: BlockId.DeepgearBrick, corner: BlockId.RivetedBrass, roof: BlockId.DeepgearBrick, floor: BlockId.DeepgearBrick, hallFloor: BlockId.RivetedBrass,
  });
  if (guildId === "sugarcourt-makers") return Object.freeze({
    path: BlockId.SugarSoil, perimeterWall: BlockId.BoiledSugarbrick, tower: BlockId.CandywoodLog, lightBase: BlockId.CandywoodLog,
    buildingWall: BlockId.BoiledSugarbrick, corner: BlockId.CandywoodLog, roof: charter ? BlockId.Glowstone : BlockId.CandywoodLeaves, floor: BlockId.CandywoodLog, hallFloor: BlockId.BoiledSugarbrick,
  });
  if (guildId === "waykeeper") return Object.freeze({
    path: BlockId.Gravel, perimeterWall: BlockId.LivingRoot, tower: BlockId.WildwoodLog, lightBase: BlockId.WildwoodFence,
    buildingWall: BlockId.Planks, corner: BlockId.LivingRoot, roof: established ? BlockId.WildwoodLeaves : BlockId.HobbitThatch, floor: BlockId.Planks, hallFloor: BlockId.MeadowGrass,
  });
  return Object.freeze({
    path: BlockId.Gravel, perimeterWall: BlockId.StoneBrick, tower: BlockId.WildwoodLog, lightBase: BlockId.WildwoodFence,
    buildingWall: BlockId.Planks, corner: BlockId.WildwoodLog, roof: established ? BlockId.HobbitThatch : BlockId.Planks, floor: BlockId.Planks, hallFloor: BlockId.StoneBrick,
  });
}

function guildNpcMobKind(factionId: SettlementCandidate["factionId"], index: number) {
  if (factionId === "atlantians") return ["atlantian-tidewarden", "atlantian-kelpkeeper", "atlantian-glowmender"][index % 3];
  if (factionId === "wood-elves") return ["wood-elf-elderweaver", "wood-elf-tomekeeper", "wood-elf-leafwarden"][index % 3];
  if (factionId === "dwarves") return ["dwarf-thane", "dwarf-delver", "dwarf-gearwright"][index % 3];
  if (factionId === "goblins") return ["goblin-chieftain", "goblin-worker", "goblin-spear-guard"][index % 3];
  if (factionId === "sugarcourt") return ["sugarcourt-crown-confectioner", "sugarcourt-sweetbroker", "sugarcourt-candysmith"][index % 3];
  return ["hobbit-mayor", "hobbit-merchant", "hobbit-hammer-guard"][index % 3];
}

function legendarySitePalette(encounterId: LegendaryEncounterId) {
  if (encounterId === "walking-spring") return { floor: BlockId.MeadowGrass, accent: BlockId.LivingRoot, light: BlockId.Glowstone } as const;
  if (encounterId === "reef-that-swims") return { floor: BlockId.MoonSlate, accent: BlockId.StarCoral, light: BlockId.Glowstone } as const;
  if (encounterId === "oath-under-stone") return { floor: BlockId.DeepgearBrick, accent: BlockId.RivetedBrass, light: BlockId.DeepgearLantern } as const;
  if (encounterId === "where-storms-run") return { floor: BlockId.SnowcapStone, accent: BlockId.CrystalBlock, light: BlockId.Glowstone } as const;
  if (encounterId === "red-banner") return { floor: BlockId.RedSand, accent: BlockId.GoblinBrasswork, light: BlockId.Torch } as const;
  return { floor: BlockId.BoiledSugarbrick, accent: BlockId.CandywoodLog, light: BlockId.Glowstone } as const;
}

type WorldRenderLayer = Exclude<RenderLayer, "none"> | "water" | "glass";
const WORLD_RENDER_LAYERS = ["opaque", "cutout", "emissive", "translucentSolid", "water", "transparent", "glass"] as const satisfies readonly WorldRenderLayer[];
const worldRenderOrder = (layer: WorldRenderLayer) => layer === "glass" ? 6
  : layer === "transparent" ? 5
    : layer === "water" ? 4
      : layer === "translucentSolid" ? 3
        : layer === "emissive" ? 2
          : layer === "cutout" ? 1 : 0;

export type VoxelInterfaceFaceOwner = "current" | "neighbor" | "none";

/** Assigns a shared voxel interface to one side so translucent media cannot z-fight. */
export function voxelInterfaceFaceOwner(type: BlockId, neighbor: BlockId): VoxelInterfaceFaceOwner {
  if (neighbor === BlockId.Air) return "current";
  if (blockContainsWater(type) && blockContainsWater(neighbor)) return "none";
  const current = BLOCKS[type];
  const next = BLOCKS[neighbor];
  if (!current || !next) return "current";
  const fullCube = (definition: typeof current) => !definition.shape || definition.shape === "cube";
  const mediumRank = (block: BlockId, definition: typeof current) => blockContainsWater(block) ? 1
    : definition.layer === "transparent" ? (block === BlockId.Glass ? 3 : 2)
      : definition.layer === "translucentSolid" ? 4 : 0;
  const currentRank = fullCube(current) ? mediumRank(type, current) : 0;
  const nextRank = fullCube(next) ? mediumRank(neighbor, next) : 0;
  if (currentRank > 0 && nextRank > 0) {
    if (type === neighbor) return "none";
    if (currentRank !== nextRank) return currentRank > nextRank ? "current" : "neighbor";
    return type > neighbor ? "current" : "neighbor";
  }
  const nextOccludes = fullCube(next) && next.solid && next.layer !== "transparent"
    && next.layer !== "translucentSolid" && next.layer !== "cutout";
  if (current.layer === "transparent" || current.layer === "translucentSolid") {
    return neighbor !== type && !nextOccludes ? "current" : "neighbor";
  }
  if (current.layer === "cutout" || (current.layer === "emissive" && !current.solid)) {
    return neighbor !== type && !nextOccludes ? "current" : "neighbor";
  }
  return nextOccludes ? "neighbor" : "current";
}
type ChunkMeshes = {
  opaque?: THREE.Mesh;
  cutout?: THREE.Mesh;
  translucentSolid?: THREE.Mesh;
  water?: THREE.Mesh;
  transparent?: THREE.Mesh;
  glass?: THREE.Mesh;
  emissive?: THREE.Mesh;
};

export type Chunk = {
  key: string;
  cx: number;
  cz: number;
  /** Word-sized since The World Below; all pre-overhaul numeric block ids remain stable. */
  blocks: Uint16Array;
  heightmap: Int16Array;
  biomes: Uint8Array;
  group: THREE.Group;
  sections: Map<number, ChunkMeshes>;
  /** One submitted mesh per material layer; section geometries remain CPU-editable. */
  combinedMeshes: ChunkMeshes;
  dirty: Set<number>;
  sectionBlockCounts: Uint16Array;
  /** Highest full opaque cube in each column, maintained independently from terrain height. */
  skyTops: Int16Array;
  /** Packed four-bit skylight/red/green/blue values, derived from block state. */
  light: Uint16Array;
  lightInitialized: boolean;
  lightIndices: Set<number>;
  /** Sparse foliage index used by the constant-cost ambient leaf emitter. */
  leafIndices: Set<number>;
};

export type PlayerEditFeedbackKind = "break" | "place" | "tree-fell";

type PlayerEditFeedbackRecord = {
  id: number;
  kind: PlayerEditFeedbackKind;
  inputStartedAt: number;
  mutationStartedAt?: number;
  staleGeometryHiddenAt?: number;
  localMeshVisibleAt?: number;
  proxyStartedAt?: number;
  completedAt?: number;
  consolidatedAt?: number;
  pendingConsolidations: Set<string>;
};

const LEAF_BLOCK_SET = new Set<BlockId>(LEAF_BLOCKS);
const GENERATED_TREE_BLOCK_SET = new Set<BlockId>([
  ...LEAF_BLOCKS,
  BlockId.WildwoodLog,
  BlockId.PineLog,
  BlockId.BirchLog,
  BlockId.BloomLog,
  BlockId.JungleLog,
  BlockId.SakuraLog,
  BlockId.CandywoodLog,
  BlockId.MoonboughLog,
  BlockId.FrostpearLeaves,
]);
const GENERATED_GROWTH_BLOCK_SET = new Set<BlockId>([
  BlockId.WildwoodLog,
  BlockId.PineLog,
  BlockId.BirchLog,
  BlockId.BloomLog,
  ...LEAF_BLOCKS,
  BlockId.Cactus,
  BlockId.MushroomCap,
  BlockId.TallGrass,
  BlockId.DoubleTallGrassLower,
  BlockId.DoubleTallGrassUpper,
  BlockId.RedFlower,
  BlockId.BlueFlower,
  BlockId.WheatCrop,
  BlockId.WildwoodSapling,
  BlockId.Sunpetal,
  BlockId.MoonOrchid,
  BlockId.Cloudbell,
  BlockId.ReedBloom,
  BlockId.RiverRibbon,
  BlockId.DesertShrub,
  BlockId.BananaPlant,
  BlockId.JungleLog,
  BlockId.JungleLeaves,
  BlockId.SakuraLog,
  BlockId.SakuraLeaves,
  BlockId.Saltbrush,
  BlockId.CoastAster,
  BlockId.SakuraBloom,
  BlockId.Dreamblossom,
  BlockId.GiantDreamblossom,
  BlockId.RainveilFern,
  BlockId.LanternLotus,
  BlockId.JungleSapling,
  BlockId.SakuraSapling,
  BlockId.MoonriceSprout,
  BlockId.MoonriceYoung,
  BlockId.MoonriceCrop,
  BlockId.SunrootSprout,
  BlockId.SunrootYoung,
  BlockId.SunrootCrop,
  BlockId.LumenKelp,
  BlockId.StarCoral,
  BlockId.AbyssBloom,
  BlockId.Tidevine,
  BlockId.CandywoodLog,
  BlockId.CandywoodLeaves,
  BlockId.CandywoodSapling,
  BlockId.GumdropBush,
  BlockId.PeppermintTuft,
  BlockId.LollipopOrchid,
  BlockId.MarshmallowShrub,
  BlockId.PeppermintSprout,
  BlockId.PeppermintYoung,
  BlockId.PeppermintCrop,
  BlockId.CocoaSprout,
  BlockId.CocoaYoung,
  BlockId.CocoaCrop,
  BlockId.MoonboughLog,
  BlockId.MoonboughLeaves,
  BlockId.Moonpetal,
  BlockId.Starfern,
  BlockId.Dreamcap,
  BlockId.Lumenreed,
  BlockId.CottonSprout,
  BlockId.CottonYoung,
  BlockId.CottonCrop,
  BlockId.SunCarrotSprout,
  BlockId.SunCarrotYoung,
  BlockId.SunCarrotCrop,
  BlockId.BluepodSprout,
  BlockId.BluepodYoung,
  BlockId.BluepodCrop,
  BlockId.FrostpearSapling,
  BlockId.FrostpearLeaves,
  BlockId.FrostpearFruit,
]);

export type ColumnSample = {
  height: number;
  waterline: number;
  biome: BiomeId;
  temperature: number;
  moisture: number;
  continental: number;
  river: number;
  mountain: number;
};

type Face = {
  direction: [number, number, number];
  shade: number;
  corners: [number, number, number][];
};

type GeometryBucket = {
  positions: number[];
  normals: number[];
  colors: number[];
  lights: number[];
  emissions: number[];
  occlusions: number[];
  uvs: number[];
  indices: number[];
};

type ChunkGenerationStage = "terrain" | "caves" | "features" | "finalize" | "complete";

type ChunkGenerationTask = {
  key: string;
  cx: number;
  cz: number;
  chunk: Chunk;
  samples: Map<string, ColumnSample>;
  sample: (x: number, z: number) => ColumnSample;
  aquiferColumns: Map<string, Readonly<{ wet: boolean; waterTable: number }>>;
  aquiferColumn: (x: number, z: number) => Readonly<{ wet: boolean; waterTable: number }>;
  stage: ChunkGenerationStage;
  nextLocalX: number;
  nextSection: number;
  editsApplied: boolean;
};

type MeshBuildTask = {
  key: string;
  section: number;
  buckets: Record<WorldRenderLayer, GeometryBucket>;
  nextLocalX: number;
};

export type ChunkWorkFrameReport = Readonly<{
  schedulingMilliseconds: number;
  generationMilliseconds: number;
  lightingMilliseconds: number;
  meshingMilliseconds: number;
  installationMilliseconds: number;
  generationSlices: number;
  lightingSlices: number;
  meshSlices: number;
  installationSlices: number;
}>;

export const DEFAULT_STREAMING_FRAME_BUDGET_MS = 5;

// Biome tints deliberately use a little overbright headroom. Packing colors
// relative to this range preserves those tints while allowing normalized bytes.
export const PACKED_VERTEX_COLOR_RANGE = 1.1;

function packSnorm8(values: readonly number[]) {
  const packed = new Int8Array(values.length);
  for (let index = 0; index < values.length; index += 1) packed[index] = Math.round(clamp(values[index], -1, 1) * 127);
  return packed;
}

function packColorUnorm8(values: readonly number[]) {
  const packed = new Uint8Array(values.length);
  for (let index = 0; index < values.length; index += 1) packed[index] = Math.round(clamp(values[index] / PACKED_VERTEX_COLOR_RANGE, 0, 1) * 255);
  return packed;
}

function packUnorm16(values: readonly number[]) {
  const packed = new Uint16Array(values.length);
  for (let index = 0; index < values.length; index += 1) packed[index] = Math.round(clamp(values[index], 0, 1) * 65535);
  return packed;
}

function packLightUnorm8(values: readonly number[]) {
  const packed = new Uint8Array(values.length);
  for (let index = 0; index < values.length; index += 1) packed[index] = Math.round(clamp(values[index] / MAX_LIGHT_LEVEL, 0, 1) * 255);
  return packed;
}

function packScalarUnorm8(values: readonly number[]) {
  const packed = new Uint8Array(values.length);
  for (let index = 0; index < values.length; index += 1) packed[index] = Math.round(clamp(values[index], 0, 1) * 255);
  return packed;
}

export type VoxelLightingEnvironment = Readonly<{
  skyColor: THREE.ColorRepresentation;
  skyIntensity: number;
  sunColor: THREE.ColorRepresentation;
  sunDirection: THREE.Vector3;
  sunIntensity: number;
  blockIntensity?: number;
  minimumAmbient?: number;
}>;

export type VoxelHeldLight = Readonly<{
  position: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
  radius: number;
}>;
export type VoxelMachineLight = VoxelHeldLight;

type VoxelLightingUniforms = {
  voxelSkyColor: { value: THREE.Color };
  voxelSkyIntensity: { value: number };
  voxelSunColor: { value: THREE.Color };
  voxelSunDirection: { value: THREE.Vector3 };
  voxelSunIntensity: { value: number };
  voxelBlockIntensity: { value: number };
  voxelMinimumAmbient: { value: number };
  voxelHeldLightPosition: { value: THREE.Vector3 };
  voxelHeldLightColor: { value: THREE.Color };
  voxelHeldLightIntensity: { value: number };
  voxelHeldLightRadius: { value: number };
  voxelMachineLightPosition: { value: THREE.Vector3 };
  voxelMachineLightColor: { value: THREE.Color };
  voxelMachineLightIntensity: { value: number };
  voxelMachineLightRadius: { value: number };
  voxelWaterPhase: { value: number };
};

function createVoxelWorldMaterial(
  atlas: THREE.Texture,
  uniforms: VoxelLightingUniforms,
  options: Readonly<{ alphaTest?: number; transparent?: boolean; opacity?: number; depthWrite?: boolean; side?: THREE.Side; animateWater?: boolean }> = {},
) {
  const material = new THREE.MeshBasicMaterial({
    map: atlas,
    vertexColors: true,
    alphaTest: options.alphaTest ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    depthWrite: options.depthWrite ?? true,
    side: options.side ?? THREE.FrontSide,
    fog: true,
  });
  material.userData.voxelLightingUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
attribute vec4 voxelLight;
attribute float voxelEmission;
attribute float voxelOcclusion;
varying vec4 vVoxelLight;
varying float vVoxelEmission;
varying float vVoxelOcclusion;
varying vec3 vVoxelNormal;
varying vec3 vVoxelWorldPosition;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
vVoxelLight = voxelLight;
vVoxelEmission = voxelEmission;
vVoxelOcclusion = voxelOcclusion;
vVoxelNormal = normalize(normal);
vVoxelWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
uniform vec3 voxelSkyColor;
uniform float voxelSkyIntensity;
uniform vec3 voxelSunColor;
uniform vec3 voxelSunDirection;
uniform float voxelSunIntensity;
uniform float voxelBlockIntensity;
uniform float voxelMinimumAmbient;
uniform vec3 voxelHeldLightPosition;
uniform vec3 voxelHeldLightColor;
uniform float voxelHeldLightIntensity;
uniform float voxelHeldLightRadius;
uniform vec3 voxelMachineLightPosition;
uniform vec3 voxelMachineLightColor;
uniform float voxelMachineLightIntensity;
uniform float voxelMachineLightRadius;
uniform float voxelWaterPhase;
varying vec4 vVoxelLight;
varying float vVoxelEmission;
varying float vVoxelOcclusion;
varying vec3 vVoxelNormal;
varying vec3 vVoxelWorldPosition;`)
      .replace("#include <opaque_fragment>", `
float voxelSky = pow(clamp(vVoxelLight.x, 0.0, 1.0), 1.22);
vec3 voxelBlock = pow(clamp(vVoxelLight.yzw, 0.0, 1.0), vec3(1.32));
float voxelSunFacing = max(dot(normalize(vVoxelNormal), normalize(voxelSunDirection)), 0.0);
vec3 voxelIllumination = vec3(voxelMinimumAmbient)
  + voxelSkyColor * voxelSky * voxelSkyIntensity
  + voxelSunColor * voxelSunFacing * voxelSky * voxelSunIntensity
  + voxelBlock * voxelBlockIntensity;
vec3 voxelHeldDelta = voxelHeldLightPosition - vVoxelWorldPosition;
float voxelHeldDistance = length(voxelHeldDelta);
float voxelHeldAttenuation = voxelHeldLightRadius > 0.0
  ? pow(clamp(1.0 - voxelHeldDistance / voxelHeldLightRadius, 0.0, 1.0), 1.45)
  : 0.0;
float voxelHeldFacing = voxelHeldDistance > 0.0001
  ? max(dot(normalize(vVoxelNormal), voxelHeldDelta / voxelHeldDistance), 0.0)
  : 1.0;
voxelIllumination += voxelHeldLightColor * voxelHeldLightIntensity * voxelHeldAttenuation * (0.16 + voxelHeldFacing * 0.84);
vec3 voxelMachineDelta = voxelMachineLightPosition - vVoxelWorldPosition;
float voxelMachineDistance = length(voxelMachineDelta);
float voxelMachineAttenuation = voxelMachineLightRadius > 0.0
  ? pow(clamp(1.0 - voxelMachineDistance / voxelMachineLightRadius, 0.0, 1.0), 1.7)
  : 0.0;
float voxelMachineFacing = voxelMachineDistance > 0.0001
  ? max(dot(normalize(vVoxelNormal), voxelMachineDelta / voxelMachineDistance), 0.0)
  : 1.0;
voxelIllumination += voxelMachineLightColor * voxelMachineLightIntensity * voxelMachineAttenuation * (0.2 + voxelMachineFacing * 0.8);
voxelIllumination *= vVoxelOcclusion;
outgoingLight *= voxelIllumination;
outgoingLight += diffuseColor.rgb * vVoxelEmission;
#include <opaque_fragment>`);
    if (options.animateWater) shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
#ifdef USE_MAP
  vec2 voxelTile = floor(vMapUv * 16.0);
  vec2 voxelLocalUv = fract(vMapUv * 16.0);
  voxelLocalUv.x = fract(voxelLocalUv.x + voxelWaterPhase);
  voxelLocalUv = clamp(voxelLocalUv, vec2(0.014), vec2(0.986));
  vec2 voxelAnimatedUv = (voxelTile + voxelLocalUv) / 16.0;
  vec4 sampledDiffuseColor = texture2D(map, voxelAnimatedUv);
  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);
  #endif
  diffuseColor *= sampledDiffuseColor;
#endif`);
  };
  material.customProgramCacheKey = () => "blockwild-voxel-light-v4-machine";
  return material;
}

export type ChunkEditSave = Record<string, Array<[number, number]>>;

const FACES: Face[] = [
  { direction: [1, 0, 0], shade: 0.82, corners: [[0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]] },
  { direction: [-1, 0, 0], shade: 0.7, corners: [[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]] },
  { direction: [0, 1, 0], shade: 1, corners: [[-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]] },
  { direction: [0, -1, 0], shade: 0.54, corners: [[-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5]] },
  { direction: [0, 0, 1], shade: 0.88, corners: [[0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, -0.5, 0.5]] },
  { direction: [0, 0, -1], shade: 0.76, corners: [[-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, -0.5, -0.5]] },
];

const BIOME_TINT: Record<number, [number, number, number]> = {
  [BiomeId.DeepOcean]: [0.72, 0.83, 0.98],
  [BiomeId.Ocean]: [0.8, 0.9, 1],
  [BiomeId.Beach]: [1.04, 1.01, 0.86],
  [BiomeId.Meadow]: [0.84, 0.98, 0.82],
  [BiomeId.Wildwood]: [0.74, 0.93, 0.69],
  [BiomeId.Frostpine]: [0.74, 0.92, 0.88],
  [BiomeId.Desert]: [1.1, 0.96, 0.72],
  [BiomeId.Savanna]: [1.03, 0.96, 0.69],
  [BiomeId.Siltfen]: [0.64, 0.78, 0.63],
  [BiomeId.Snowfield]: [0.92, 1.01, 1.08],
  [BiomeId.Badlands]: [1.08, 0.78, 0.65],
  [BiomeId.Birchlight]: [0.95, 1.08, 0.83],
  [BiomeId.Bloomwood]: [1.08, 0.91, 1.02],
  [BiomeId.Highlands]: [0.88, 0.93, 0.95],
  [BiomeId.Volcanic]: [0.76, 0.7, 0.72],
  [BiomeId.MushroomFen]: [0.96, 0.78, 0.94],
  [BiomeId.River]: [0.82, 0.94, 0.94],
  [BiomeId.CloudreedGlen]: [0.76, 1.02, 0.91],
  [BiomeId.RainveilJungle]: [0.62, 1.01, 0.73],
  [BiomeId.SakurabloomGrove]: [1.05, 0.9, 1.01],
  [BiomeId.LumenTrench]: [0.62, 0.78, 1.08],
  [BiomeId.SugarplumVale]: [1.08, 0.88, 1.04],
  [BiomeId.Glimmerwood]: [0.64, 1.01, 0.9],
  [BiomeId.SnowcapRange]: [0.88, 0.96, 1.03],
};

/**
 * Fits an aquatic settlement to the water volume at every authored point.
 * The candidate's center is already re-anchored to its real seabed; this
 * second pass handles relief across wide towns and keeps roofs, paths, lights,
 * furniture and patrol approaches at least one cell below the local surface.
 * A candidate is rejected only when a building footprint has no physically
 * valid submerged vertical range.
 */
function fitUnderwaterSettlementLayout(
  layout: SettlementLayoutPlan,
  sample: (x: number, z: number) => ColumnSample,
): SettlementLayoutPlan | null {
  if (layout.environment !== "underwater") return layout;
  let invalid = false;
  const clampWaterPoint = <T extends Readonly<{ x: number; z: number; y?: number }>>(point: T): T => {
    const column = sample(point.x, point.z);
    const minimum = column.height + 1;
    const maximum = column.waterline - 1;
    if (minimum > maximum) invalid = true;
    const requested = point.y ?? minimum;
    return { ...point, y: Math.max(minimum, Math.min(maximum, requested)) };
  };
  const buildings = layout.buildings.map((building) => {
    const halfWidth = Math.floor(building.width / 2);
    const halfDepth = Math.floor(building.depth / 2);
    let highestBed = MIN_Y;
    let lowestSurface = MAX_Y;
    for (let x = building.position.x - halfWidth; x <= building.position.x + halfWidth; x += 1) {
      for (let z = building.position.z - halfDepth; z <= building.position.z + halfDepth; z += 1) {
        const column = sample(x, z);
        highestBed = Math.max(highestBed, column.height);
        lowestSurface = Math.min(lowestSurface, column.waterline);
      }
    }
    // Underwater world placement raises the roof by four cells for one floor
    // and five cells for two floors from the chosen base plane.
    const roofRise = Math.min(5, building.floors * 3 + 1);
    const minimumY = highestBed + 2;
    const maximumY = lowestSurface - roofRise;
    if (minimumY > maximumY) invalid = true;
    const previousY = building.position.y ?? minimumY;
    const positionY = Math.max(minimumY, Math.min(maximumY, previousY));
    const deltaY = positionY - previousY;
    return {
      ...building,
      position: { ...building.position, y: positionY },
      furniture: building.furniture.map((furniture) => ({
        ...furniture,
        position: clampWaterPoint({
          ...furniture.position,
          y: (furniture.position.y ?? previousY) + deltaY,
        }),
      })),
    };
  });
  if (invalid) return null;
  const center = clampWaterPoint(layout.center);
  const paths = layout.paths.map(clampWaterPoint);
  const approaches = layout.approaches.map((approach) => ({ ...approach, position: clampWaterPoint(approach.position) }));
  const lights = layout.lights.map((light) => ({ ...light, position: clampWaterPoint(light.position) }));
  const centerColumn = sample(center.x, center.z);
  const minimumLayer = centerColumn.height + 1;
  const maximumLayer = centerColumn.waterline - 1;
  const verticalLayers = layout.verticalLayers.map((layer) => ({
    ...layer,
    y: Math.max(minimumLayer, Math.min(maximumLayer, layer.y)),
  }));
  if (invalid || minimumLayer > maximumLayer) return null;
  return { ...layout, center, buildings, paths, approaches, lights, verticalLayers };
}

const TILE_COLORS = [
  "#65a441", "#775338", "#795338", "#7b8181", "#d7c27b", "#735033", "#9d7446", "#3f7d36",
  "#3d85c8", "#4a4e50", "#737a7b", "#b9864c", "#91786e", "#bde4e2", "#e5c35a", "#303334",
  "#e5ecea", "#8d927f", "#604634", "#8b6846", "#2f6042", "#d0c8ab", "#b8ab8b", "#73a54c",
  "#bd7046", "#8998a0", "#4f913e", "#4f4034", "#5b7339", "#4a5136", "#aaa04f", "#8b793d",
  "#7b4f58", "#a36e78", "#d887ad", "#6b716f", "#a36b3c", "#8d592f", "#686e70", "#f2b94b",
  "#b56f50", "#d4af3f", "#60d8e1", "#3d4448", "#ed642f", "#a74e62", "#4b8245", "#85817c",
  "#8fd0e2", "#3b3538", "#29213d", "#61dce5", "#9f6b35", "#65a842", "#d54f48", "#548ed8",
  "#caa64c", "#6d452b", "#69422a", "#5e9d43", "#9b6839", "#666666", "#555555", "#444444",
  "#568e43", "#6f4f34", "#f4ca4f", "#b59be8", "#a88a48", "#72a94a", "#b8ded9", "#d7b667",
  "#53735d",
  "#5f7f47", "#4f7c42", "#704b8e", "#718943", "#63833d", "#d89542", "#659b48", "#4f8a40",
  "#c84b40", "#79a54f", "#aab14d", "#523824", "#9a693c", "#d8cca4", "#4e5765", "#b96845",
  "#9f6b35", "#b9874e", "#bd7b32", "#efc451", "#d7a33d", "#6f5745", "#62d8d4",
  "#d8c999", "#775c3d", "#75628e", "#5ca4a0",
  // 100-128: Shoreline flora, new biome surfaces/wood, crops and furniture.
  "#8da77a", "#d9b8ed", "#368d51", "#6a4b34", "#684527", "#9a6f43", "#257a49",
  "#5d994d", "#765747", "#76514e", "#a67a75", "#ec9fc5", "#f3a7cd", "#ae8de8",
  "#63f0c8", "#ef798f", "#8f8cff", "#4db8a1", "#77a879", "#8ebd93", "#c9d8b1",
  "#77a64f", "#94b958", "#e3b64b", "#43a864", "#f3a765", "#9c6c3e", "#8a5b36", "#936136",
  // 129-143: Sugarplum terrain, Candywood, liquids, flora, crops and Sugarworks.
  "#8f6ac2", "#8a5ca2", "#76506f", "#9a557c", "#d58bad", "#e88fba", "#ef9ab9",
  "#b76532", "#dda32f", "#d95d9a", "#e94f61", "#754838", "#f3a2d0", "#f6e5eb", "#e58fb9",
  // 144: dense woven Hearthkin roof that no longer reuses transparent wheat art.
  "#c7a75d",
  // 145-148: dedicated dragon egg shells (fire, ice, steel, sea) so eggs no
  // longer borrow bookshelf tome tiles.
  "#8e3324", "#bfe4f0", "#5d676e", "#2f8f96",
  // 149-150: Glimmerwood grass top/side. 151-153: v1.3.5 waypost materials.
  "#315f4d", "#263f38", "#b58c62", "#397f86", "#765268",
  // 154-157: mythic dragonstone and metallic eggs.
  "#6f4b17", "#4d5d73", "#d49b1f", "#aabdd2",
  // 158-159: connected lower and upper halves of tall meadow grass.
  "#5f9e3f", "#79b54f",
  // 160-161: blue-black wrought iron and its pale hammered fittings.
  "#303b42", "#87949a",
  // 162: connected peppermint stem. 163-165: Dragonwake hoard ingot,
  // coin and jewel cells. 166-168 remain reserved renderer contracts.
  "#d9ece8", "#d5a42f", "#efc747", "#5ed7cf", "#777777", "#777777", "#777777",
  // 169-174: Rootweave Grotto earth, roots, moss and shelves.
  "#493d2e", "#6c5131", "#7fc66d", "#527d47", "#89673d", "#4f4735",
  // 175-180: Starbloom Hollows caps, stems, gills, blooms, spores and carpets.
  "#765cc4", "#b3a5c7", "#86e3d4", "#e7bb62", "#a66de0", "#55a578",
  // 181-187: Glasswater stone, shale, reeds, algae, pads, eggs and crust.
  "#526f76", "#638597", "#6ba5a3", "#4fd4c1", "#557d68", "#98a967", "#b3a27d",
  // 188-190: Pillarstone geology.
  "#76736e", "#b7a77d", "#8d8876",
  // 191-195: Crystaldeep stone and crystal growth stages.
  "#323f50", "#7189e8", "#5d6e9e", "#8ba9ff", "#8996ad",
  // 196-200: Emberdeep sulfur, vents and mineral terraces.
  "#93853d", "#d0b943", "#51443c", "#5e4137", "#9d7650",
  // 201-209: unresolved Veinmetal, traversal pieces, guano, bridge and lift.
  "#586f68", "#7b9b91", "#67513a", "#9b7446", "#737b7e", "#e2bc56", "#6e644a", "#655143", "#667278",
  // 210-213: Deepgear masonry/brass, Rootweave soil side, and framed lantern.
  "#515c62", "#a77943", "#493d2e", "#d6a84d",
];

export const MEADOW_GRASS_PALETTE = Object.freeze({
  top: "#568e43",
  topDark: "#3d7136",
  topLight: "#79ac58",
  clover: "#a8ca70",
  flower: "#e2c45e",
  sideDirt: "#6f4f34",
  sideGrass: "#5c9447",
});

/** Restores the airy leaf pixels; fuller crowns come from geometry, not opacity. */
export const LEAF_TEXTURE_CUTOUT_CHANCE = 1 - DENSE_CUTOUT_LEAF_POLICY.exteriorPixelCoverage;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export function normalizeWorldGenerationOptions(value?: Partial<WorldGenerationOptions> | null): WorldGenerationOptions {
  const finiteOption = (candidate: unknown, fallback: number, min: number, max: number) => {
    const resolved = typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback;
    return Math.round(clamp(resolved, min, max) * 100) / 100;
  };
  const enabledFactions = normalizeEnabledFactions(value?.enabledFactions);
  const settlement = normalizeSettlementPlacementOptions({
    settlementPattern: value?.settlementPattern ?? (value?.profile === "legacy-v14" ? "legacy-scattered-v1" : undefined),
    settlementDensity: value?.settlementDensity,
    settlementClustering: value?.settlementClustering,
    roadCoverage: value?.roadCoverage,
    largeTownFrequency: value?.largeTownFrequency,
    structures: typeof value?.structures === "boolean" ? value.structures : DEFAULT_WORLD_GENERATION_OPTIONS.structures,
    enabledFactions,
  });
  return {
    profile: value?.profile === "legacy-v14" ? "legacy-v14" : "world-below-v15",
    caveFrequency: finiteOption(value?.caveFrequency, DEFAULT_WORLD_GENERATION_OPTIONS.caveFrequency, 0, 3),
    biomeScale: finiteOption(value?.biomeScale, DEFAULT_WORLD_GENERATION_OPTIONS.biomeScale, 0.25, 4),
    resourceAbundance: finiteOption(value?.resourceAbundance, DEFAULT_WORLD_GENERATION_OPTIONS.resourceAbundance, 0.25, 4),
    structures: settlement.structures,
    enabledFactions,
    settlementPattern: settlement.settlementPattern,
    settlementDensity: settlement.settlementDensity,
    settlementClustering: settlement.settlementClustering,
    roadCoverage: settlement.roadCoverage,
    largeTownFrequency: settlement.largeTownFrequency,
    origin: normalizeWorldOriginPreference(value?.origin, enabledFactions),
  };
}
/**
 * Lava pools are broad luminous surfaces, not thousands of independent point
 * lights. One representative per small world-aligned cell keeps generation,
 * edits and queries bounded while still giving every pool local illumination.
 */
export const LAVA_LIGHT_CELL_SIZE = Object.freeze({ xz: 4, y: 3 } as const);

function lavaLightCellOrigin(x: number, y: number, z: number) {
  return {
    x: Math.floor(x / LAVA_LIGHT_CELL_SIZE.xz) * LAVA_LIGHT_CELL_SIZE.xz,
    y: MIN_Y + Math.floor((y - MIN_Y) / LAVA_LIGHT_CELL_SIZE.y) * LAVA_LIGHT_CELL_SIZE.y,
    z: Math.floor(z / LAVA_LIGHT_CELL_SIZE.xz) * LAVA_LIGHT_CELL_SIZE.xz,
  } as const;
}

function lavaLightCellKey(x: number, y: number, z: number) {
  const origin = lavaLightCellOrigin(x, y, z);
  return `${origin.x},${origin.y},${origin.z}`;
}
/** Lower/middle Wild Peppermint segments use a full-height repeating cane tile. */
export const WILD_PEPPERMINT_STEM_TILE = 162;
const ATLAS_GRID = 16;
const ATLAS_PAD = 0.0008;
const TILE_UVS = Array.from({ length: ATLAS_GRID * ATLAS_GRID }, (_, tile) => {
  const column = tile % ATLAS_GRID;
  const row = Math.floor(tile / ATLAS_GRID);
  return [column / ATLAS_GRID + ATLAS_PAD, 1 - (row + 1) / ATLAS_GRID + ATLAS_PAD, (column + 1) / ATLAS_GRID - ATLAS_PAD, 1 - row / ATLAS_GRID - ATLAS_PAD] as const;
});
export const GLASS_OPACITY = 0.42;
/** Liquid tops sit below the voxel rim; bottoms remain flush with supporting blocks. */
export const LIQUID_SURFACE_INSET = 0.09;
/** Each horizontal flow level loses visible depth, from source 0 to thin edge 7. */
export const FLOWING_WATER_LEVEL_INSET = 0.11;

/** Only the uppermost water cell is lowered; submerged cells remain seamless. */
export function liquidSurfaceInsetForCell(
  type: BlockId,
  above: BlockId | undefined,
  level = 0,
  falling = false,
) {
  if (!blockContainsWater(type) || blockContainsWater(above)) return 0;
  const flowingLevel = falling ? 0 : Math.max(0, Math.min(7, Math.round(level)));
  return -Math.min(0.86, LIQUID_SURFACE_INSET + flowingLevel * FLOWING_WATER_LEVEL_INSET);
}

/** A cube with every face remapped to the same atlas contract used by chunk meshes. */
export function createAtlasBlockGeometry(type: BlockId, size = 1) {
  const definition = BLOCKS[type];
  const geometry = new THREE.BoxGeometry(size, size, size);
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  // Three BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z.
  const tiles = [definition.side, definition.side, definition.top, definition.bottom, definition.side, definition.side];
  for (let face = 0; face < 6; face += 1) {
    const [u0, v0, u1, v1] = TILE_UVS[tiles[face]];
    for (let vertex = 0; vertex < 4; vertex += 1) {
      const index = face * 4 + vertex;
      const sourceU = uv.getX(index);
      const sourceV = uv.getY(index);
      uv.setXY(index, lerp(u0, u1, sourceU), lerp(v0, v1, sourceV));
    }
  }
  uv.needsUpdate = true;
  return geometry;
}

/** A vertical atlas-mapped plane for crossed flora models used in-world and in-hand. */
export function createAtlasTilePlaneGeometry(type: BlockId, width = 0.72, height = 0.86) {
  const geometry = new THREE.PlaneGeometry(width, height);
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  const [u0, v0, u1, v1] = TILE_UVS[BLOCKS[type].side];
  for (let vertex = 0; vertex < uv.count; vertex += 1) {
    uv.setXY(vertex, lerp(u0, u1, uv.getX(vertex)), lerp(v0, v1, uv.getY(vertex)));
  }
  uv.needsUpdate = true;
  return geometry;
}

function blocksSky(type: BlockId) {
  const definition = BLOCKS[type];
  const fullCube = !definition?.shape || definition.shape === "cube";
  return Boolean(definition?.solid && fullCube && definition.layer !== "transparent" && definition.layer !== "cutout");
}

/**
 * Natural surface plants require a real dry supporting block and an empty
 * destination. Passing the cave-mouth flag keeps the same rule explicit in
 * tests even when a sampled terrain height points at carved air.
 */
export function canGenerateSurfaceFlora(
  ground: BlockId | undefined,
  above: BlockId | undefined,
  caveMouth = false,
) {
  if (caveMouth || ground === undefined || ground === BlockId.Air || above !== BlockId.Air) return false;
  const groundDefinition = BLOCKS[ground];
  return Boolean(groundDefinition?.solid && !groundDefinition.liquid && !groundDefinition.waterlogged);
}

export function seedToInt(seed: string) {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function hash2(x: number, z: number, seed: number) {
  let n = Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(seed, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function hash3(x: number, y: number, z: number, seed: number) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 1103515245) + Math.imul(z, 668265263) + Math.imul(seed, 1597334677);
  n = Math.imul(n ^ (n >>> 15), 2246822519);
  return ((n ^ (n >>> 13)) >>> 0) / 4294967295;
}

export function selectSettlementSite(input: Readonly<{
  worldSeed: string;
  seed: number;
  regionX: number;
  regionZ: number;
  enabledFactions: readonly NpcFactionId[];
  sample: (x: number, z: number) => ColumnSample;
}>): SettlementCandidate | null {
  const regionSize = 32 * CHUNK_SIZE;
  const regionOriginX = input.regionX * regionSize;
  const regionOriginZ = input.regionZ * regionSize;
  let best: Readonly<{ candidate: SettlementCandidate; score: number }> | null = null;
  for (let siteIndex = 0; siteIndex < 16; siteIndex += 1) {
    const gridX = siteIndex % 4;
    const gridZ = Math.floor(siteIndex / 4);
    const jitterX = Math.floor((hash2(input.regionX * 31 + siteIndex, input.regionZ, input.seed ^ 0x51a7e5) - 0.5) * 46);
    const jitterZ = Math.floor((hash2(input.regionX, input.regionZ * 31 + siteIndex, input.seed ^ 0x7e115e) - 0.5) * 46);
    const siteX = regionOriginX + 80 + gridX * 112 + jitterX;
    const siteZ = regionOriginZ + 80 + gridZ * 112 + jitterZ;
    const probe = input.sample(siteX, siteZ);
    const probeBiome = settlementBiomeFromId(probe.biome);
    if (!probeBiome) continue;
    const planned = planSettlementCandidate({
      worldSeed: input.worldSeed,
      regionX: input.regionX,
      regionZ: input.regionZ,
      biome: probeBiome,
      existing: [],
      floorY: probe.height,
      enabledFactions: input.enabledFactions,
      siteSearch: true,
    });
    if (!planned) continue;
    const underwaterSite = planned.environment === "underwater";
    if (underwaterSite ? probe.height >= probe.waterline - 5 : probe.height <= probe.waterline + 3) continue;
    const footprintProbe = Math.min(12, SETTLEMENT_SIZE_RULES[planned.size].radiusBlocks);
    const neighborHeights = [[footprintProbe, 0], [-footprintProbe, 0], [0, footprintProbe], [0, -footprintProbe]]
      .map(([dx, dz]) => input.sample(siteX + dx, siteZ + dz).height);
    const relief = Math.max(...neighborHeights.map((height) => Math.abs(height - probe.height)));
    const reliefLimit = underwaterSite ? 7 : planned.environment === "underground" ? 12 : 5;
    if (relief > reliefLimit) continue;
    if (!underwaterSite && syrupPondColumnAt(input.worldSeed, siteX, siteZ, input.sample, BiomeId.SugarplumVale)) continue;
    const floorY = underwaterSite ? probe.height
      : planned.environment === "underground" ? Math.max(MIN_Y + 10, probe.height - 18)
        : undefined;
    const candidate: SettlementCandidate = {
      ...planned,
      center: { x: siteX, z: siteZ, ...(floorY === undefined ? {} : { y: floorY + 2 }) },
      ...(floorY === undefined ? {} : { floorY }),
    };
    const waterAccess = Math.abs(probe.height - probe.waterline) <= 8 ? 1 : 0;
    const culturePriority = candidate.factionId === "dwarves" || candidate.factionId === "sugarcourt" || candidate.factionId === "wood-elves" ? 9
      : candidate.factionId === "goblins" ? 5 : candidate.factionId === "atlantians" ? 2 : 0;
    const score = relief * 12 - waterAccess * 4 - culturePriority + hash2(siteX, siteZ, input.seed ^ 0x510e5e) * 3;
    if (!best || score < best.score) best = { candidate, score };
  }
  if (!best) return null;
  const regionalChance = best.candidate.factionId === "hobbits" ? 0.06
    : best.candidate.factionId === "atlantians" ? 0.18
      : best.candidate.factionId === "goblins" ? 0.58
        : best.candidate.factionId === "wood-elves" ? 0.82
          : best.candidate.factionId === "sugarcourt" ? 0.9 : 0.9;
  return hash2(input.regionX, input.regionZ, input.seed ^ 0x2e1b2138) <= regionalChance ? best.candidate : null;
}

export type DeepgearMineRoadPoint = Readonly<{ x: number; y: number; z: number }>;

function walkDeepgearGridLine(
  from: Readonly<{ x: number; z: number }>,
  to: Readonly<{ x: number; z: number }>,
) {
  const points: Array<{ x: number; z: number }> = [{ x: Math.round(from.x), z: Math.round(from.z) }];
  const targetX = Math.round(to.x);
  const targetZ = Math.round(to.z);
  let x = points[0].x;
  let z = points[0].z;
  while (x !== targetX || z !== targetZ) {
    const remainingX = targetX - x;
    const remainingZ = targetZ - z;
    if (remainingX !== 0 && (remainingZ === 0 || Math.abs(remainingX) >= Math.abs(remainingZ))) x += Math.sign(remainingX);
    else z += Math.sign(remainingZ);
    points.push({ x, z });
  }
  return points;
}

/**
 * Plans a walkable, deterministic mine road between a hold and its cave hub.
 * Tall mountain holds receive a triangular switchback so every vertical step
 * also advances horizontally and no authored stair rises or drops by >1.
 */
export function planDeepgearMineRoad(
  from: DeepgearMineRoadPoint,
  to: DeepgearMineRoadPoint,
): readonly DeepgearMineRoadPoint[] {
  const start = { x: Math.round(from.x), y: Math.round(from.y), z: Math.round(from.z) };
  const target = { x: Math.round(to.x), y: Math.round(to.y), z: Math.round(to.z) };
  const dx = target.x - start.x;
  const dz = target.z - start.z;
  const baseSteps = Math.abs(dx) + Math.abs(dz);
  const verticalSteps = Math.abs(target.y - start.y);
  const requiredSteps = verticalSteps + 8;
  const detour = baseSteps < requiredSteps ? Math.ceil((requiredSteps - baseSteps) / 2) + 4 : 0;
  const direction = ((start.x ^ start.z ^ target.x ^ target.z) & 1) === 0 ? 1 : -1;
  const midpoint = { x: Math.round((start.x + target.x) / 2), z: Math.round((start.z + target.z) / 2) };
  const waypoint = Math.abs(dx) >= Math.abs(dz)
    ? { x: midpoint.x, z: midpoint.z + detour * direction }
    : { x: midpoint.x + detour * direction, z: midpoint.z };
  const horizontal = detour > 0
    ? [...walkDeepgearGridLine(start, waypoint), ...walkDeepgearGridLine(waypoint, target).slice(1)]
    : walkDeepgearGridLine(start, target);
  const seen = new Set<string>();
  const unique = horizontal.filter((point) => {
    const key = `${point.x},${point.z}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const denominator = Math.max(1, unique.length - 1);
  return unique.map((point, index) => ({
    ...point,
    y: Math.round(lerp(start.y, target.y, index / denominator)),
  }));
}

/**
 * Chooses a readable perimeter lift instead of assuming the east wall is the
 * highest side of an irregular mountain shelf. A compact supported gate tower
 * is used when every perimeter shelf falls below the minimum lift rise.
 */
export function selectDeepgearLiftSite(
  center: Readonly<{ x: number; z: number }>,
  radiusBlocks: number,
  holdY: number,
  sample: (x: number, z: number) => Readonly<{ height: number }>,
) {
  const offset = Math.max(7, radiusBlocks - 5);
  const offsets = [[offset, 0], [0, offset], [-offset, 0], [0, -offset], [offset, offset], [-offset, offset], [-offset, -offset], [offset, -offset]] as const;
  const liftBottomY = holdY + 1;
  const sites = offsets.map(([dx, dz], order) => {
    const x = center.x + dx, z = center.z + dz;
    const surfaceY = sample(x, z).height;
    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([nx, nz]) => sample(x + nx * 2, z + nz * 2).height);
    const slope = Math.max(...neighbors.map((height) => Math.abs(height - surfaceY)));
    const rise = surfaceY + 1 - liftBottomY;
    return { x, z, surfaceY, liftBottomY, liftTopY: Math.max(surfaceY + 1, liftBottomY + 5), rise, slope, order };
  });
  sites.sort((left, right) => Number(right.rise >= 5) - Number(left.rise >= 5)
    || (right.rise - right.slope * 1.75) - (left.rise - left.slope * 1.75)
    || left.order - right.order);
  const selected = sites[0];
  return Object.freeze({
    x: selected.x,
    z: selected.z,
    surfaceY: selected.surfaceY,
    liftBottomY: selected.liftBottomY,
    liftTopY: selected.liftTopY,
  });
}

function valueNoise2(x: number, z: number, seed: number) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const tz = fade(z - z0);
  const a = lerp(hash2(x0, z0, seed), hash2(x0 + 1, z0, seed), tx);
  const b = lerp(hash2(x0, z0 + 1, seed), hash2(x0 + 1, z0 + 1, seed), tx);
  return lerp(a, b, tz) * 2 - 1;
}

function valueNoise3(x: number, y: number, z: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const tz = fade(z - z0);
  const at = (dx: number, dy: number, dz: number) => hash3(x0 + dx, y0 + dy, z0 + dz, seed) * 2 - 1;
  const x00 = lerp(at(0, 0, 0), at(1, 0, 0), tx);
  const x10 = lerp(at(0, 1, 0), at(1, 1, 0), tx);
  const x01 = lerp(at(0, 0, 1), at(1, 0, 1), tx);
  const x11 = lerp(at(0, 1, 1), at(1, 1, 1), tx);
  return lerp(lerp(x00, x10, ty), lerp(x01, x11, ty), tz);
}

function fbm2(x: number, z: number, seed: number, frequency: number, octaves: number) {
  let value = 0;
  let amplitude = 0.55;
  let total = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    value += valueNoise2(x * frequency, z * frequency, seed + octave * 977) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / total;
}

function continentOffset(value: number) {
  const points: Array<[number, number]> = [[-1, -24], [-0.62, -17], [-0.42, -11], [-0.25, -6], [-0.12, -2], [-0.03, 1], [0.2, 7], [0.45, 15], [0.7, 25], [1, 34]];
  for (let index = 0; index < points.length - 1; index += 1) {
    const [a, ay] = points[index];
    const [b, by] = points[index + 1];
    if (value <= b) return lerp(ay, by, smoothstep(a, b, value));
  }
  return points[points.length - 1][1];
}

/**
 * New-generator land biomes begin as large jittered Voronoi provinces rather
 * than as narrow intersections of several unrelated noise thresholds. The
 * 36-slot cycle keeps common families common while guaranteeing that every
 * uncommon land family recurs across an ordinary expedition-sized region.
 */
export const SURFACE_REGION_CELL_SIZE = 420;
const REGIONAL_LAND_BIOME_CYCLE: readonly BiomeId[] = Object.freeze([
  BiomeId.Meadow, BiomeId.Wildwood, BiomeId.Birchlight, BiomeId.Savanna, BiomeId.Frostpine, BiomeId.Desert,
  BiomeId.Meadow, BiomeId.Wildwood, BiomeId.Birchlight, BiomeId.Savanna, BiomeId.Frostpine, BiomeId.Desert,
  BiomeId.Meadow, BiomeId.Wildwood, BiomeId.Birchlight, BiomeId.Savanna, BiomeId.Frostpine, BiomeId.Desert,
  BiomeId.Meadow, BiomeId.Wildwood, BiomeId.Birchlight, BiomeId.Savanna, BiomeId.Frostpine, BiomeId.Desert,
  BiomeId.Meadow,
  BiomeId.RainveilJungle, BiomeId.Siltfen, BiomeId.Bloomwood, BiomeId.SakurabloomGrove,
  BiomeId.SugarplumVale, BiomeId.Glimmerwood, BiomeId.MushroomFen, BiomeId.CloudreedGlen,
  BiomeId.Badlands, BiomeId.Highlands, BiomeId.Snowfield,
]);

export type SurfaceRegionSample = Readonly<{
  biome: BiomeId;
  coreBiome: BiomeId;
  neighborBiome: BiomeId;
  cellX: number;
  cellZ: number;
  boundary: number;
}>;

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function regionalLandBiome(seed: number, cellX: number, cellZ: number) {
  const phase = Math.floor(hash2(0, 0, seed ^ 0x6a09e667) * REGIONAL_LAND_BIOME_CYCLE.length);
  const strides = [5, 7, 11, 13] as const;
  const xStride = strides[seed & 3];
  const zStride = strides[(seed >>> 3) & 3];
  return REGIONAL_LAND_BIOME_CYCLE[positiveModulo(cellX * xStride + cellZ * zStride + phase, REGIONAL_LAND_BIOME_CYCLE.length)];
}

function transitionLandBiome(first: BiomeId, second: BiomeId, temperature: number, moisture: number) {
  if (first === second) return first;
  const cold = [BiomeId.Frostpine, BiomeId.Snowfield, BiomeId.Highlands].includes(first)
    || [BiomeId.Frostpine, BiomeId.Snowfield, BiomeId.Highlands].includes(second);
  const dry = [BiomeId.Desert, BiomeId.Badlands, BiomeId.Savanna].includes(first)
    || [BiomeId.Desert, BiomeId.Badlands, BiomeId.Savanna].includes(second);
  const wet = [BiomeId.Siltfen, BiomeId.MushroomFen, BiomeId.RainveilJungle].includes(first)
    || [BiomeId.Siltfen, BiomeId.MushroomFen, BiomeId.RainveilJungle].includes(second);
  if (cold && temperature < 0.48) return BiomeId.Frostpine;
  if (dry && (temperature > 0.52 || moisture < 0.42)) return BiomeId.Savanna;
  if (wet && moisture > 0.56) return BiomeId.Wildwood;
  return moisture > 0.53 ? BiomeId.Birchlight : BiomeId.Meadow;
}

export function surfaceRegionAt(seed: number, x: number, z: number, temperature = 0.5, moisture = 0.5): SurfaceRegionSample {
  const baseCellX = Math.floor(x / SURFACE_REGION_CELL_SIZE);
  const baseCellZ = Math.floor(z / SURFACE_REGION_CELL_SIZE);
  const candidates: Array<{ cellX: number; cellZ: number; biome: BiomeId; distance: number }> = [];
  for (let cellX = baseCellX - 1; cellX <= baseCellX + 1; cellX += 1) for (let cellZ = baseCellZ - 1; cellZ <= baseCellZ + 1; cellZ += 1) {
    const jitterX = (hash2(cellX, cellZ, seed ^ 0xbb67ae85) - 0.5) * SURFACE_REGION_CELL_SIZE * 0.42;
    const jitterZ = (hash2(cellX, cellZ, seed ^ 0x3c6ef372) - 0.5) * SURFACE_REGION_CELL_SIZE * 0.42;
    const centerX = (cellX + 0.5) * SURFACE_REGION_CELL_SIZE + jitterX;
    const centerZ = (cellZ + 0.5) * SURFACE_REGION_CELL_SIZE + jitterZ;
    candidates.push({ cellX, cellZ, biome: regionalLandBiome(seed, cellX, cellZ), distance: Math.hypot(x - centerX, z - centerZ) });
  }
  candidates.sort((left, right) => left.distance - right.distance || left.cellX - right.cellX || left.cellZ - right.cellZ);
  const first = candidates[0];
  const second = candidates[1] ?? first;
  const boundary = clamp(1 - (second.distance - first.distance) / 90, 0, 1);
  return {
    biome: boundary > 0 ? transitionLandBiome(first.biome, second.biome, temperature, moisture) : first.biome,
    coreBiome: first.biome,
    neighborBiome: second.biome,
    cellX: first.cellX,
    cellZ: first.cellZ,
    boundary,
  };
}

export function chunkKey(cx: number, cz: number) {
  return `${cx},${cz}`;
}

/** High view distances use a radial window; defaults retain their exact square policy. */
export const RADIAL_STREAMING_DISTANCE_THRESHOLD = 12;

/** Squared distance, in chunk units, from the player chunk center to a target chunk AABB. */
export function chunkAabbRadialDistanceSquared(offsetX: number, offsetZ: number) {
  const nearestX = Math.max(0, Math.abs(offsetX) - 0.5);
  const nearestZ = Math.max(0, Math.abs(offsetZ) - 0.5);
  return nearestX * nearestX + nearestZ * nearestZ;
}

export function chunkWithinStreamingRadius(offsetX: number, offsetZ: number, radius: number, radial: boolean) {
  if (!radial) return Math.max(Math.abs(offsetX), Math.abs(offsetZ)) <= radius;
  return chunkAabbRadialDistanceSquared(offsetX, offsetZ) <= radius * radius;
}

export const GUARANTEED_DETAIL_STREAMING_RADIUS = 4;

/**
 * Full-detail generation is guaranteed near the player and then biased toward
 * the camera hemisphere. The BasicWorldRenderer remains responsible for the
 * inexpensive horizon until the player turns or travels toward it.
 */
export function chunkWithinDirectionalStreamingWindow(
  offsetX: number,
  offsetZ: number,
  radius: number,
  radial: boolean,
  forwardX: number,
  forwardZ: number,
) {
  if (!chunkWithinStreamingRadius(offsetX, offsetZ, radius, radial)) return false;
  const distance = Math.hypot(offsetX, offsetZ);
  if (distance <= GUARANTEED_DETAIL_STREAMING_RADIUS || distance <= 1e-6) return true;
  const forwardLength = Math.hypot(forwardX, forwardZ);
  if (forwardLength <= 1e-6) return true;
  const facing = (offsetX * forwardX + offsetZ * forwardZ) / (distance * forwardLength);
  return facing >= -0.18;
}

export function chunksWithinStreamingRadius(radius: number, radial: boolean) {
  const boundedRadius = Math.max(0, Math.floor(radius));
  if (!radial) return (boundedRadius * 2 + 1) ** 2;
  let count = 0;
  for (let offsetX = -boundedRadius; offsetX <= boundedRadius; offsetX += 1) {
    for (let offsetZ = -boundedRadius; offsetZ <= boundedRadius; offsetZ += 1) {
      if (chunkWithinStreamingRadius(offsetX, offsetZ, boundedRadius, true)) count += 1;
    }
  }
  return count;
}

function chunkStreamingSortDistance(offsetX: number, offsetZ: number, radial: boolean) {
  return radial
    ? chunkAabbRadialDistanceSquared(offsetX, offsetZ)
    : Math.max(Math.abs(offsetX), Math.abs(offsetZ));
}

export function splitCoordinate(value: number) {
  const chunk = Math.floor(value / CHUNK_SIZE);
  return { chunk, local: value - chunk * CHUNK_SIZE };
}

export function blockIndex(localX: number, y: number, localZ: number) {
  return localX + localZ * CHUNK_SIZE + (y - MIN_Y) * CHUNK_SIZE * CHUNK_SIZE;
}

function sectionForY(y: number) {
  return Math.floor((y - MIN_Y) / SECTION_HEIGHT);
}

function emptyBucket(): GeometryBucket {
  return { positions: [], normals: [], colors: [], lights: [], emissions: [], occlusions: [], uvs: [], indices: [] };
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function shadeColor(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

export function createBlockAtlas() {
  const tile = 16;
  const grid = ATLAS_GRID;
  const canvas = document.createElement("canvas");
  canvas.width = tile * grid;
  canvas.height = tile * grid;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Canvas textures are unavailable.");
  context.imageSmoothingEnabled = false;
  let randomState = 0x72a4f11d;
  const random = () => {
    randomState = Math.imul(randomState ^ (randomState >>> 15), 2246822519);
    randomState = Math.imul(randomState ^ (randomState >>> 13), 3266489917);
    return ((randomState ^ (randomState >>> 16)) >>> 0) / 4294967295;
  };
  const pixel = (index: number, x: number, y: number, color: string, alpha = 1) => {
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillRect((index % grid) * tile + x, Math.floor(index / grid) * tile + y, 1, 1);
    context.globalAlpha = 1;
  };

  const oreTiles = new Set([9, 10, 40, 41]);
  const leafTiles = new Set([7, 20, 23, 34, 80, 106, 111, 134, MOONBOUGH_LEAVES_TILE]);
  const logSideTiles = new Set([5, 18, 21, 32, 104, 109, 132]);
  const logTopTiles = new Set([6, 19, 22, 33, 105, 110, 133]);
  const crossTiles = new Set([39, 53, 54, 55, 56, 59, 66, 67, 68, 69, 73, 74, 75, 76, 77, 78, 79, 81, 82, 83,
    100, 101, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 138, 139, 140, 141, 142, 158, 159,
    173, 177, 178, 179, 180, 183, 184, 185, 186, 194, 197, 203, 204, 205, 206, STARFERN_TILE, DREAMCAP_TILE]);
  for (let index = 0; index < grid * grid; index += 1) {
    const base = TILE_COLORS[index] ?? "#777777";
    const ox = (index % grid) * tile;
    const oy = Math.floor(index / grid) * tile;
    if (index === 13) {
      context.clearRect(ox, oy, tile, tile);
      for (let y = 0; y < tile; y += 1) for (let x = 0; x < tile; x += 1) {
        const edge = x < 2 || y < 2 || x > 13 || y > 13;
        if (edge || (x + y) % 13 === 0) pixel(index, x, y, edge ? "#b7dfdf" : "#d7f1ed", edge ? 0.78 : 0.34);
      }
      continue;
    }
    if (index >= 151 && index <= 153) {
      context.fillStyle = base;
      context.fillRect(ox, oy, tile, tile);
      if (index === 151) {
        for (let y = 0; y < tile; y += 4) {
          context.fillStyle = y % 8 ? "#8f674d" : "#d0ac78";
          context.fillRect(ox, oy + y, tile, 1);
        }
        for (let x = 1; x < tile; x += 4) for (let y = 1; y < tile; y += 4) pixel(index, x, y, "#efe0b5");
        for (let x = 2; x < tile; x += 5) pixel(index, x, (x * 3) % 15, "#5d876b");
      } else if (index === 152) {
        context.fillStyle = "#183e50";
        context.fillRect(ox, oy, tile, tile);
        for (let n = 0; n < 22; n += 1) {
          const x = (n * 7 + 3) % 16;
          const y = (n * 11 + 5) % 16;
          pixel(index, x, y, n % 3 ? "#65e2d0" : "#c3fff1");
          if (x + 1 < 16 && n % 2 === 0) pixel(index, x + 1, y, "#438d9c");
        }
        for (let y = 2; y < 15; y += 4) for (let x = 2; x < 15; x += 5) pixel(index, x, y, "#8ff5df", 0.72);
      } else {
        context.fillStyle = "#4d334d";
        context.fillRect(ox, oy, tile, tile);
        for (let y = 0; y < 16; y += 5) {
          context.fillStyle = "#9a6c78";
          context.fillRect(ox, oy + y, tile, 1);
          const offset = y % 10 === 0 ? 0 : 4;
          for (let x = offset; x < 16; x += 8) context.fillRect(ox + x, oy + y, 1, 5);
        }
        for (let y = 2; y < 16; y += 5) for (let x = 2; x < 16; x += 6) pixel(index, x, y, "#d3b889");
      }
      continue;
    }
    if (crossTiles.has(index)) {
      context.clearRect(ox, oy, tile, tile);
      if (index === 39) {
        for (let y = 7; y < 16; y += 1) {
          pixel(index, 7, y, y % 3 === 0 ? "#6b3d20" : "#9b6030");
          pixel(index, 8, y, "#c07a38");
        }
        for (const [x, y, color] of [[7, 6, "#ffd85a"], [8, 6, "#fff0a0"], [6, 5, "#f09132"], [7, 4, "#ffb43f"], [8, 3, "#ffe56d"], [9, 5, "#db5a27"]] as Array<[number, number, string]>) pixel(index, x, y, color);
      } else if (index === 138) {
        // Shared by gumdrop bushes and young Candywood: a full silhouette
        // with jewel fruit stays legible at both world and inventory scale.
        for (let y = 8; y < 16; y += 1) pixel(index, 7, y, y % 2 ? "#81513f" : "#a46851");
        for (let y = 4; y <= 13; y += 1) for (let x = 2; x <= 13; x += 1) {
          const dx = (x - 7.5) / 5.8;
          const dy = (y - 8.5) / 4.7;
          if (dx * dx + dy * dy > 1 || (x * 7 + y * 11) % 17 === 0) continue;
          pixel(index, x, y, (x + y) % 3 ? "#77b85f" : "#9bd274");
        }
        for (const [x, y, color] of [[3, 8, "#ef6aa3"], [7, 5, "#7ed36f"], [10, 7, "#79b9ed"], [6, 10, "#f4c553"], [11, 11, "#b487e7"]] as Array<[number, number, string]>) {
          pixel(index, x, y, color); pixel(index, Math.min(15, x + 1), y, shadeColor(color, 24));
          if (y + 1 < 16) pixel(index, x, y + 1, shadeColor(color, -24));
        }
      } else if (index === 139) {
        for (const x of [5, 8, 11]) for (let y = 4; y < 16; y += 1) pixel(index, x, y, (y + x) % 4 < 2 ? "#f5eee7" : "#e64d5f");
        for (const [x, y] of [[4, 8], [6, 10], [7, 6], [9, 9], [10, 5], [12, 8]] as Array<[number, number]>) pixel(index, x, y, "#6aa657");
      } else if (index === 140) {
        for (const x of [5, 8, 11]) for (let y = 6; y < 16; y += 1) pixel(index, x, y, "#659552");
        for (const [x, y] of [[4, 8], [6, 6], [8, 10], [10, 7], [12, 9]] as Array<[number, number]>) {
          pixel(index, x, y, "#6d4032"); pixel(index, Math.min(15, x + 1), y, "#a86c50");
        }
      } else if (index === 141) {
        for (let y = 7; y < 16; y += 1) pixel(index, 7, y, y % 3 ? "#68a456" : "#8bc268");
        for (let radius = 4; radius >= 1; radius -= 1) for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 10) {
          const x = Math.round(8 + Math.cos(angle) * radius);
          const y = Math.round(5 + Math.sin(angle) * radius);
          pixel(index, x, y, radius % 2 ? "#fff0f8" : radius === 4 ? "#ee6cad" : "#f4a5d1");
        }
        pixel(index, 8, 5, "#f9d35a");
      } else if (index === 142) {
        for (let y = 9; y < 16; y += 1) pixel(index, 7, y, "#89a96f");
        for (const [x, y] of [[4, 10], [6, 7], [9, 8], [11, 10], [8, 5]] as Array<[number, number]>) {
          pixel(index, x, y, "#f7e8ed"); pixel(index, x + 1, y, "#fff8f8"); pixel(index, x, y + 1, "#e6cdd8");
        }
      } else if (index >= 173 && index <= 206) {
        const palettes: Record<number, readonly [string, string, string]> = {
          173: ["#6b4f31", "#9b7445", "#bb925c"], 177: ["#6cc8be", "#a7fff0", "#4c8191"],
          178: ["#c78b38", "#ffe37b", "#fff5b7"], 179: ["#7546aa", "#bd7bea", "#e7b6ff"],
          180: ["#3f7c5a", "#72c693", "#b0ffd4"], 183: ["#4a7772", "#84bebb", "#bce2d5"],
          184: ["#319e92", "#68ead2", "#b6fff1"], 185: ["#345d4b", "#6f9b76", "#9ac19a"],
          186: ["#6c8147", "#b4c879", "#e0dfaa"], 194: ["#536cc6", "#93b1ff", "#d5e2ff"],
          197: ["#9d8729", "#e4cf4f", "#fff39b"], 203: ["#56422e", "#806647", "#b4986c"],
          204: ["#71512f", "#a87b46", "#d6ac70"], 205: ["#596164", "#8e999d", "#d0d7d8"],
          206: ["#9e6d27", "#e7c059", "#fff0a1"],
        };
        const [dark, mid, bright] = palettes[index] ?? [shadeColor(base, -28), base, shadeColor(base, 35)];
        if (index === 203 || index === 205 || index === 206) {
          for (let y = 6; y < 15; y += 1) pixel(index, 7, y, y % 2 ? dark : mid);
          for (let x = 4; x <= 11; x += 1) pixel(index, x, 6, x === 4 || x === 11 ? dark : mid);
          if (index === 206) for (const [x, y] of [[6, 3], [7, 2], [8, 3], [5, 4], [9, 4]] as Array<[number, number]>) pixel(index, x, y, bright);
        } else if (index === 204) {
          for (const x of [4, 11]) for (let y = 0; y < 16; y += 1) pixel(index, x, y, y % 3 ? mid : dark);
          for (let y = 2; y < 16; y += 4) for (let x = 5; x < 11; x += 1) pixel(index, x, y, bright);
        } else if (index === 185) {
          for (let y = 6; y <= 11; y += 1) for (let x = 2; x <= 13; x += 1) {
            const dx = (x - 7.5) / 6; const dy = (y - 8.5) / 3;
            if (dx * dx + dy * dy <= 1) pixel(index, x, y, (x + y) % 3 ? mid : dark);
          }
          pixel(index, 7, 7, bright); pixel(index, 8, 7, bright);
        } else if (index === 194 || index === 197) {
          for (const [x, height] of [[3, 7], [6, 12], [9, 9], [12, 6]] as Array<[number, number]>) {
            for (let step = 0; step < height; step += 1) {
              const width = Math.max(0, Math.floor((height - step) / 5));
              for (let dx = -width; dx <= width; dx += 1) pixel(index, x + dx, 15 - step, step % 3 ? mid : bright);
            }
          }
        } else {
          for (const [x, lean, height] of [[4, -1, 9], [7, 0, 14], [10, 1, 11], [12, 0, 7]] as Array<[number, number, number]>) {
            for (let step = 0; step < height; step += 1) {
              const px = x + Math.round(lean * step / height);
              const py = 15 - step;
              pixel(index, px, py, step % 3 ? mid : dark);
              if (step > 3 && step % 4 === 0) pixel(index, Math.max(0, px - 1), py, bright);
            }
          }
        }
      } else if (index >= 73 && index <= 78) {
        const young = index === 73 || index === 76;
        const ripe = index === 75 || index === 78;
        const leafA = index <= 75 ? "#4f7f43" : "#698c42";
        const leafB = index <= 75 ? "#72a554" : "#91ad50";
        const berry = index <= 75 ? "#955cbb" : "#eda748";
        const height = young ? 8 : 13;
        for (const [x, lean] of [[4, -1], [7, 0], [10, 1], [12, -1]] as Array<[number, number]>) {
          for (let step = 0; step < height; step += 1) {
            const px = x + Math.round(lean * step / Math.max(1, height));
            const py = 15 - step;
            pixel(index, px, py, step % 3 ? "#55783d" : "#7b9150");
            if (step > 2 && step % 3 === 0) {
              pixel(index, Math.max(0, px - 1), py, leafA);
              pixel(index, Math.min(15, px + 1), py - 1, leafB);
            }
          }
        }
        if (ripe) for (const [x, y] of [[4, 7], [7, 4], [9, 9], [12, 6], [6, 11]] as Array<[number, number]>) {
          pixel(index, x, y, berry);
          if (x < 15) pixel(index, x + 1, y, index <= 75 ? "#c38bdd" : "#ffd36b");
        }
      } else if (index === 79) {
        for (let y = 7; y < 16; y += 1) pixel(index, 7, y, "#744525");
        for (const [x, y] of [[5, 9], [4, 8], [6, 6], [9, 9], [10, 7], [8, 5], [7, 3]] as Array<[number, number]>) {
          pixel(index, x, y, "#4f8a40");
          if (x + 1 < 16) pixel(index, x + 1, y, "#79b55a");
        }
      } else if (index === 81) {
        for (let y = 1; y < 7; y += 1) pixel(index, 8, y, "#6b4226");
        for (let y = 6; y < 14; y += 1) for (let x = 4; x < 13; x += 1) {
          const dx = x - 8; const dy = y - 9;
          if (dx * dx + dy * dy <= 17) pixel(index, x, y, dx < -1 ? "#a83834" : dx > 2 ? "#e0644c" : "#c8493e");
        }
        pixel(index, 6, 6, "#62954a"); pixel(index, 7, 5, "#78aa55");
      } else if (index === 82 || index === 83) {
        const height = index === 82 ? 6 : 10;
        for (const [x, lean] of [[5, -1], [8, 0], [11, 1]] as Array<[number, number]>) {
          for (let step = 0; step < height; step += 1) pixel(index, x + Math.round(lean * step / height), 15 - step, step % 2 ? "#7ea04c" : "#a5ad4d");
          if (index === 83) { pixel(index, x - 1, 5, "#c0a848"); pixel(index, x + 1, 6, "#d0ba54"); }
        }
      } else if (index === 158) {
        // Every lower blade reaches the tile's top edge at the same x position
        // where the upper tile begins, avoiding the old floating-half seam.
        for (const x of [4, 7, 10, 12]) for (let y = 0; y < 16; y += 1) {
          pixel(index, x, y, (x + y) % 3 ? "#5f9e3f" : "#88bf58");
          if (y > 5 && (x + y) % 5 === 0) pixel(index, Math.max(0, x - 1), y, "#74ad49");
        }
        for (const [x, y] of [[3, 8], [5, 5], [6, 11], [8, 7], [9, 4], [11, 10], [13, 6]] as Array<[number, number]>) pixel(index, x, y, "#74ad49");
      } else if (index === 159) {
        for (const [startX, lean, height] of [[4, -2, 14], [7, -1, 12], [10, 1, 15], [12, 2, 11]] as Array<[number, number, number]>) {
          for (let step = 0; step < height; step += 1) {
            const y = 15 - step;
            const x = startX + Math.round(lean * step / Math.max(1, height - 1));
            pixel(index, x, y, step % 3 ? "#68a846" : "#93c85e");
            if (step > 4 && step % 3 === 0) pixel(index, Math.max(0, Math.min(15, x + Math.sign(lean || 1))), y + 1, "#7db651");
          }
        }
        for (const [x, y] of [[2, 4], [4, 2], [6, 7], [8, 4], [11, 2], [13, 6], [14, 3]] as Array<[number, number]>) pixel(index, x, y, "#91c85d");
      } else if (index === 53) {
        for (const [x, lean, height] of [[4, -1, 8], [7, 0, 12], [10, 1, 10], [12, 0, 6]] as Array<[number, number, number]>) {
          for (let step = 0; step < height; step += 1) pixel(index, x + Math.round((lean * step) / height), 15 - step, step % 3 ? "#65a844" : "#86bd58");
        }
      } else if (index === 59) {
        for (let y = 8; y < 16; y += 1) pixel(index, 7, y, "#704325");
        for (const [x, y] of [[5, 8], [4, 7], [6, 6], [9, 8], [10, 7], [8, 5], [7, 4]]) {
          pixel(index, x, y, "#4b8d3c");
          if (x + 1 < 16) pixel(index, x + 1, y, "#75b653");
        }
      } else if (index === 66 || index === 67) {
        for (let y = 7; y < 16; y += 1) pixel(index, 7 + (y % 5 === 0 ? 1 : 0), y, "#578641");
        const bloom = index === 66 ? "#f4c84e" : "#a68de1";
        const highlight = index === 66 ? "#fff1a2" : "#e5ddff";
        for (const [dx, dy] of [[0, -3], [-2, -1], [2, -1], [-2, 1], [2, 1], [0, 2]] as Array<[number, number]>) pixel(index, 8 + dx, 5 + dy, bloom);
        pixel(index, 8, 5, highlight);
      } else if (index === 68) {
        for (const [x, lean, height] of [[4, -1, 7], [7, 1, 10], [10, -1, 8], [12, 0, 5]] as Array<[number, number, number]>) {
          for (let step = 0; step < height; step += 1) pixel(index, x + Math.round((lean * step) / height), 15 - step, step % 2 ? "#9d843f" : "#c2a65a");
        }
      } else if (index === 69) {
        for (let y = 8; y < 16; y += 1) pixel(index, 7, y, "#698a39");
        for (const side of [-1, 1]) for (let step = 0; step < 5; step += 1) pixel(index, 7 + side * (step + 1), 9 - Math.floor(step / 2), step % 2 ? "#83b34f" : "#5c963d");
        for (const [x, y] of [[6, 7], [8, 6], [9, 8], [7, 9]] as Array<[number, number]>) pixel(index, x, y, "#f0d34f");
      } else {
        const stem = index === 56 ? "#9a7a32" : "#54843b";
        for (let y = 7; y < 16; y += 1) pixel(index, 7 + (y % 4 === 0 ? 1 : 0), y, stem);
        if (index === 56) {
          for (let y = 3; y < 10; y += 2) {
            pixel(index, 6, y, "#d7b84e"); pixel(index, 8, y + 1, "#edce62"); pixel(index, 9, y, "#bd9637");
          }
        } else {
          const bloom = index === 54 ? "#e54f49" : index === 55 ? "#5796e5" : base;
          for (const [dx, dy] of [[0, -2], [-2, 0], [2, 0], [0, 2], [-1, -1], [1, -1]]) pixel(index, 8 + dx, 5 + dy, bloom);
          pixel(index, 8, 5, index === 54 ? "#ffd75e" : shadeColor(bloom, 52));
        }
      }
      continue;
    }
    for (let y = 0; y < tile; y += 1) for (let x = 0; x < tile; x += 1) {
      const variation = random() < 0.14 ? -18 : random() > 0.88 ? 15 : 0;
      pixel(index, x, y, shadeColor(base, variation));
    }
    if (index >= 169 && index <= 209) {
      const accent = index === 171 ? "#b7f49b" : index === 175 ? "#c795ff" : index === 181 ? "#77a9ad"
        : index === 182 ? "#a5d4df" : index === 187 ? "#e4d19b" : index === 188 ? "#a09a8f"
          : index === 189 ? "#e0c891" : index === 190 ? "#d7c8a0" : index === 192 ? "#a8bcff"
            : index === 193 ? "#8097d8" : index === 195 ? "#d1e2ee" : index === 198 ? "#f2a14a"
              : index === 199 ? "#c76d48" : index === 200 ? "#d5a271" : index === 201 ? "#87c2a8"
                : index === 202 ? "#c8ffe3" : index === 207 ? "#958564" : index === 208 ? "#967458" : index === 209 ? "#b5c1c4" : shadeColor(base, 32);
      if ([170, 171, 176, 201, 202].includes(index)) {
        for (let path = 0; path < 3; path += 1) {
          let x = 2 + path * 5;
          for (let y = 0; y < tile; y += 1) {
            x = Math.max(0, Math.min(15, x + ((y * 5 + path * 7) % 9 === 0 ? 1 : (y * 7 + path) % 11 === 0 ? -1 : 0)));
            pixel(index, x, y, accent);
            if ((y + path) % 5 === 0 && x + 1 < 16) pixel(index, x + 1, y, shadeColor(accent, -24));
          }
        }
      } else if ([181, 182, 187, 188, 189, 190, 191, 193, 195, 196, 199, 200, 207].includes(index)) {
        for (let y = 2; y < tile; y += 4) for (let x = (y * 3 + index) % 5; x < tile; x += 6) {
          pixel(index, x, y, accent, 0.82);
          if (x + 1 < tile) pixel(index, x + 1, y + (index % 2), shadeColor(accent, -28), 0.65);
        }
        if (index === 190) for (const [x, y] of [[3, 4], [10, 8], [6, 13]] as Array<[number, number]>) {
          pixel(index, x, y, "#e6d7b5"); pixel(index, x + 1, y, "#e6d7b5"); pixel(index, x, y + 1, "#8b806b");
        }
      } else if ([175, 192, 198].includes(index)) {
        for (const [x, y] of [[2, 3], [5, 10], [9, 5], [12, 12], [14, 2]] as Array<[number, number]>) {
          pixel(index, x, y, accent); if (x + 1 < 16) pixel(index, x + 1, y, "#fff4ce", 0.8);
        }
      } else if (index === 208) {
        context.fillStyle = accent;
        for (let y = 0; y < tile; y += 4) context.fillRect(ox, oy + y, tile, 1);
        for (let y = 2; y < tile; y += 4) for (const x of [3, 12]) pixel(index, x, y, "#3e3731");
      } else if (index === 209) {
        context.fillStyle = "#3f494e";
        for (let y = 0; y < tile; y += 5) context.fillRect(ox, oy + y, tile, 1);
        for (let x = 1; x < tile; x += 5) context.fillRect(ox + x, oy, 1, tile);
        for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]] as Array<[number, number]>) {
          pixel(index, x, y, accent); pixel(index, x + 1, y, "#252c30");
        }
      }
    }
    if (index === DEEPGEAR_BRICK_TILE) {
      context.fillStyle = "#505a60";
      context.fillRect(ox, oy, tile, tile);
      for (let course = 0; course < 4; course += 1) {
        const y = course * 4;
        const offset = course % 2 ? 4 : 0;
        context.fillStyle = "#2f393f";
        context.fillRect(ox, oy + y, tile, 1);
        for (let x = offset; x < tile; x += 8) context.fillRect(ox + x, oy + y, 1, 4);
        context.fillStyle = "#778188";
        context.fillRect(ox + 1, oy + y + 1, tile - 2, 1);
      }
      for (const [x, y] of [[2, 2], [13, 6], [5, 10], [10, 14]] as const) pixel(index, x, y, "#9ba4a8");
    }
    if (index === RIVETED_BRASS_TILE) {
      context.fillStyle = "#946837";
      context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#5b3d24";
      for (let y = 0; y < tile; y += 8) context.fillRect(ox, oy + y, tile, 1);
      for (let x = 0; x < tile; x += 8) context.fillRect(ox + x, oy, 1, tile);
      context.fillStyle = "#c7924d";
      for (let y = 1; y < tile; y += 8) for (let x = 1; x < tile; x += 8) context.fillRect(ox + x, oy + y, 6, 1);
      for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]] as const) {
        pixel(index, x, y, "#ead085");
        pixel(index, Math.max(0, x - 1), y, "#4d3927");
      }
      for (const [x, y] of [[5, 6], [11, 10]] as const) pixel(index, x, y, "#4f8776", .75);
    }
    if (index === ROOTWEAVE_SOIL_SIDE_TILE) {
      context.fillStyle = "#493d2e";
      context.fillRect(ox, oy, tile, tile);
      for (let y = 3; y < tile; y += 4) {
        context.fillStyle = y % 8 === 3 ? "#62503a" : "#352f27";
        context.fillRect(ox, oy + y, tile, 1);
      }
      for (const [x, length] of [[2, 7], [6, 11], [10, 6], [13, 9]] as const) {
        for (let y = 0; y < length; y += 1) pixel(index, x + (y > 5 && (x + y) % 4 === 0 ? 1 : 0), y, y % 3 ? "#725536" : "#9a7446");
      }
    }
    if (index === DEEPGEAR_LANTERN_TILE) {
      context.fillStyle = "#273239";
      context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#8a673b";
      context.fillRect(ox + 1, oy + 1, 14, 2); context.fillRect(ox + 1, oy + 13, 14, 2);
      context.fillRect(ox + 1, oy + 1, 2, 14); context.fillRect(ox + 13, oy + 1, 2, 14);
      context.fillStyle = "#5a7480";
      context.fillRect(ox + 4, oy + 4, 8, 8);
      context.fillStyle = "#e0ad4b";
      context.fillRect(ox + 5, oy + 5, 6, 6);
      context.fillStyle = "#fff0a4";
      context.fillRect(ox + 6, oy + 5, 2, 5); context.fillRect(ox + 8, oy + 6, 2, 2);
      for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]] as const) pixel(index, x, y, "#d8c38d");
    }
    if (index === 129) {
      context.fillStyle = "#8964bc"; context.fillRect(ox, oy, tile, tile);
      for (let y = 0; y < tile; y += 1) for (let x = 0; x < tile; x += 1) {
        if ((x * 7 + y * 5) % 19 === 0) pixel(index, x, y, "#b58ad8");
        else if ((x * 11 + y * 3) % 29 === 0) pixel(index, x, y, "#6b9e67");
        else if ((x * 13 + y * 17) % 61 === 0) pixel(index, x, y, "#f0b1d5");
      }
    } else if (index === 130) {
      context.fillStyle = "#76506f"; context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#8f6ac2"; context.fillRect(ox, oy, tile, 5);
      for (let x = 0; x < tile; x += 2) context.fillRect(ox + x, oy + 4, 1, 2 + (x % 4));
    } else if (index === 131) {
      context.fillStyle = "#76506f"; context.fillRect(ox, oy, tile, tile);
      for (let y = 2; y < tile; y += 5) for (let x = (y * 3) % 7; x < tile; x += 7) pixel(index, x, y, "#925f86");
    } else if (index === 135) {
      context.fillStyle = "#ef9ab9"; context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#c96f97";
      for (let y = 0; y < tile; y += 5) context.fillRect(ox, oy + y, tile, 1);
      for (let row = 0; row < 4; row += 1) for (let x = (row % 2 ? 3 : 7); x < tile; x += 8) context.fillRect(ox + x, oy + row * 5, 1, 5);
      context.fillStyle = "rgba(255,241,248,.7)"; context.fillRect(ox + 2, oy + 2, 5, 1);
    } else if (index === 136 || index === 137) {
      const dark = index === 136 ? "#8b431f" : "#b6731f";
      const shine = index === 136 ? "#dc8b4b" : "#ffd461";
      for (let y = 2; y < tile; y += 4) for (let x = 0; x < tile; x += 1) if ((x + y) % 3 !== 0) pixel(index, x, y, shine, 0.5);
      for (const [x, y] of [[3, 6], [9, 3], [12, 11]] as Array<[number, number]>) {
        pixel(index, x, y, dark, 0.7); pixel(index, Math.min(15, x + 1), y, shine, 0.68);
      }
    } else if (index === 143) {
      context.fillStyle = "#e58fb9"; context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#9b5479";
      context.fillRect(ox, oy, tile, 2); context.fillRect(ox, oy + 14, tile, 2);
      context.fillRect(ox, oy, 2, tile); context.fillRect(ox + 14, oy, 2, tile);
      context.fillStyle = "#f4cf56"; context.fillRect(ox + 4, oy + 5, 8, 6);
      context.fillStyle = "#fff0f5"; context.fillRect(ox + 6, oy + 6, 4, 1);
      context.fillStyle = "#75413f"; context.fillRect(ox + 7, oy + 8, 2, 5);
    } else if (index === 144) {
      context.fillStyle = "#c7a75d"; context.fillRect(ox, oy, tile, tile);
      for (let y = 1; y < tile; y += 4) {
        context.fillStyle = y % 8 === 1 ? "#8f7139" : "#a98643";
        context.fillRect(ox, oy + y, tile, 2);
        for (let x = (y % 8 === 1 ? 1 : 3); x < tile; x += 5) {
          context.fillStyle = "#e2c77a";
          context.fillRect(ox + x, oy + Math.max(0, y - 1), 1, 4);
        }
      }
      context.fillStyle = "rgba(255,235,167,.55)";
      for (let x = 2; x < tile; x += 5) context.fillRect(ox + x, oy, 1, tile);
    }
    if (index === 1 || index === 17 || index === 29 || index === 31 || index === 103 || index === 108) {
      const topColor = index === 17 ? "#e9efed" : index === 29 ? "#586f37" : index === 31 ? "#aaa04f"
        : index === 103 ? "#368d51" : index === 108 ? "#5d994d" : "#66a441";
      for (let y = 0; y < 5; y += 1) for (let x = 0; x < tile; x += 1) pixel(index, x, y, random() > 0.24 ? topColor : shadeColor(topColor, -20));
    }
    if (logSideTiles.has(index)) for (let x = 2; x < tile; x += 4) for (let y = 0; y < tile; y += 1) pixel(index, x, y, shadeColor(base, -35));
    if (logTopTiles.has(index)) {
      context.strokeStyle = shadeColor(base, -42);
      context.strokeRect(ox + 3.5, oy + 3.5, 9, 9);
      context.strokeRect(ox + 6.5, oy + 6.5, 3, 3);
    }
    if (index === 91) {
      for (let y = 2; y < tile; y += 4) for (let x = 0; x < tile; x += 1) pixel(index, x, y, "#754522");
      for (const [x, y] of [[3, 5], [11, 9], [7, 13]] as Array<[number, number]>) {
        pixel(index, x, y, "#f4d455"); pixel(index, x + 1, y, "#2d251e"); pixel(index, x + 2, y, "#f4d455");
      }
    } else if (index === 92) {
      for (let y = 2; y < 15; y += 4) for (let x = (y / 4) % 2 ? 1 : 3; x < 15; x += 6) {
        for (const [dx, dy] of [[1, 0], [2, 0], [0, 1], [3, 1], [1, 2], [2, 2]] as Array<[number, number]>) pixel(index, x + dx, y + dy, "#8d5b22");
      }
    } else if (index === 93) {
      for (let y = 1; y < 16; y += 3) for (let x = 0; x < 16; x += 1) pixel(index, x, y, y % 2 ? "#9a6227" : "#f0bd48");
      for (let y = 9; y < 14; y += 1) for (let x = 6; x < 10; x += 1) pixel(index, x, y, "#33251b");
    } else if (index === 94) {
      for (let y = 1; y < 16; y += 5) for (let x = 0; x < 16; x += 1) pixel(index, x, y, "#b8b29d");
      for (let x = 2; x < 16; x += 6) for (let y = 0; y < 16; y += 1) pixel(index, x, y, "#3b3534");
    } else if (index === 95) {
      for (let y = 1; y < 15; y += 4) for (let x = 1; x < 15; x += 4) {
        pixel(index, x, y, "#d9ffff"); pixel(index, x + 1, y, "#8ff5ee"); pixel(index, x, y + 1, "#67d8d4");
      }
    } else if (index === 96) {
      context.fillStyle = "#d8c999"; context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#8a7551";
      context.fillRect(ox, oy, tile, 1); context.fillRect(ox, oy + 15, tile, 1);
      context.fillRect(ox, oy, 1, tile); context.fillRect(ox + 15, oy, 1, tile);
      context.fillStyle = "#6e9f63";
      context.fillRect(ox + 3, oy + 4, 5, 3); context.fillRect(ox + 9, oy + 9, 4, 3);
      context.fillStyle = "#5597b2";
      context.fillRect(ox + 2, oy + 10, 6, 1); context.fillRect(ox + 7, oy + 7, 1, 4); context.fillRect(ox + 11, oy + 3, 1, 5);
      context.fillStyle = "#c05d4d"; context.fillRect(ox + 11, oy + 5, 2, 2);
    } else if (index === 97) {
      context.fillStyle = "#65503a"; context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#987744";
      for (let y = 1; y < tile; y += 5) context.fillRect(ox, oy + y, tile, 2);
      context.fillStyle = "#c7a548";
      for (const [x, y] of [[2, 2], [12, 2], [2, 12], [12, 12], [7, 7]] as Array<[number, number]>) context.fillRect(ox + x, oy + y, 2, 2);
    } else if (index === 98) {
      context.clearRect(ox, oy, tile, tile);
      context.fillStyle = "rgba(90,72,112,.88)"; context.fillRect(ox + 2, oy + 2, 12, 12);
      context.fillStyle = "#b69ed5";
      context.fillRect(ox + 7, oy + 2, 2, 12); context.fillRect(ox + 3, oy + 7, 10, 2);
      context.fillStyle = "#6be0cf"; context.fillRect(ox + 7, oy + 7, 2, 2);
    } else if (index === 99) {
      context.fillStyle = "#3d6665"; context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#79d8cd";
      context.fillRect(ox + 7, oy + 2, 2, 12); context.fillRect(ox + 4, oy + 5, 8, 2); context.fillRect(ox + 5, oy + 10, 6, 2);
      context.fillStyle = "#d8fff5"; context.fillRect(ox + 7, oy + 6, 2, 2);
    }
    if (leafTiles.has(index) && LEAF_TEXTURE_CUTOUT_CHANCE > 0) {
      for (let y = 0; y < tile; y += 1) for (let x = 0; x < tile; x += 1) {
        if (random() < LEAF_TEXTURE_CUTOUT_CHANCE) context.clearRect(ox + x, oy + y, 1, 1);
      }
    }
    if (oreTiles.has(index)) {
      const oreColor = index === 9 ? "#25282a" : index === 10 ? "#a85f3f" : index === 40 ? "#d27854" : "#f0c94f";
      for (let i = 0; i < 20; i += 1) pixel(index, Math.floor(random() * tile), Math.floor(random() * tile), oreColor);
    }
    if (index === STAR_CRYSTAL_ORE_TILE) {
      // A dark load-bearing host frames one continuous mineral seam. Matching
      // edge exits let adjacent ore faces read as one deposit rather than cyan
      // confetti, while the luminous core remains well below 25% coverage.
      context.fillStyle = "#29323b";
      context.fillRect(ox, oy, tile, tile);
      for (let y = 0; y < tile; y += 1) for (let x = 0; x < tile; x += 1) {
        if ((x * 11 + y * 7 + 5) % 29 === 0) pixel(index, x, y, "#43505a");
        else if ((x * 5 + y * 13 + 3) % 31 === 0) pixel(index, x, y, "#1e272f");
        else if (y % 6 === 1 && (x + y * 3) % 5 < 2) pixel(index, x, y, "#343f49");
      }
      const seam = [
        [0, 12], [1, 12], [2, 11], [3, 11], [4, 10], [5, 9], [6, 9], [7, 8],
        [8, 8], [9, 9], [10, 10], [11, 10], [12, 11], [13, 11], [14, 12], [15, 12],
        [5, 0], [5, 1], [6, 2], [6, 3], [7, 4], [7, 5], [6, 6], [7, 7],
        [8, 9], [7, 10], [7, 11], [6, 12], [6, 13], [5, 14], [5, 15],
      ] as const;
      const seamKeys = new Set(seam.map(([x, y]) => `${x},${y}`));
      for (const [x, y] of seam) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const sx = x + dx, sy = y + dy;
        if (sx >= 0 && sx < tile && sy >= 0 && sy < tile && !seamKeys.has(`${sx},${sy}`)) pixel(index, sx, sy, "#173844");
      }
      for (const [offset, [x, y]] of seam.entries()) pixel(index, x, y, offset % 4 === 0 ? "#83f4f2" : offset % 3 === 0 ? "#4bcbd3" : "#3298ad");
      for (const [x, y, color] of [
        [2, 11, "#d8ffff"], [5, 9, "#b6ffff"], [7, 8, "#e9ffff"], [10, 10, "#9ef7ff"],
        [13, 11, "#d8ffff"], [6, 3, "#aab6ff"], [7, 5, "#dcffff"], [6, 12, "#9daeff"],
      ] as Array<[number, number, string]>) {
        pixel(index, x, y, color);
        if ((x + y) % 2 === 0 && x + 1 < tile) pixel(index, x + 1, y, "#6edee6", 0.92);
      }
    }
    if (index === 8 || index === 44) {
      for (let y = 2; y < tile; y += 5) for (let x = 0; x < tile; x += 1) if ((x + y) % 3) pixel(index, x, y, index === 8 ? "#75b8e5" : "#ffb33d", 0.55);
    }
    if (index === 11) for (let y = 0; y < tile; y += 4) for (let x = 0; x < tile; x += 1) pixel(index, x, y, "#76502f");
    if (index === 12) {
      for (let y = 0; y < tile; y += 5) for (let x = 0; x < tile; x += 1) pixel(index, x, y, "#56504c");
      for (let x = 0; x < tile; x += 8) for (let y = 0; y < tile; y += 1) pixel(index, x + (Math.floor(y / 5) % 2) * 4, y, "#56504c");
    }
    if (index === 38) {
      context.fillStyle = "#242727";
      context.fillRect(ox + 2, oy + 3, 12, 10);
      context.fillStyle = "#131515";
      context.fillRect(ox + 4, oy + 6, 8, 5);
      context.fillStyle = "#d2843c";
      context.fillRect(ox + 5, oy + 8, 6, 2);
      context.fillStyle = "#f5b348";
      context.fillRect(ox + 7, oy + 7, 2, 2);
    }
    if (index === 36) {
      context.fillStyle = "#5a351f";
      context.fillRect(ox, oy, 16, 2); context.fillRect(ox, oy + 14, 16, 2); context.fillRect(ox, oy, 2, 16); context.fillRect(ox + 14, oy, 2, 16);
      context.fillStyle = "#d0a25e";
      for (let p = 4; p <= 12; p += 4) { context.fillRect(ox + p, oy + 2, 1, 12); context.fillRect(ox + 2, oy + p, 12, 1); }
      context.fillStyle = "#3f4341";
      context.fillRect(ox + 5, oy + 5, 6, 2); context.fillRect(ox + 7, oy + 3, 2, 6);
    }
    if (index === 37) {
      context.fillStyle = "#5a351f";
      context.fillRect(ox, oy, 16, 2); context.fillRect(ox, oy + 14, 16, 2);
      context.fillStyle = "#d7ad67";
      context.fillRect(ox + 3, oy + 4, 10, 1); context.fillRect(ox + 3, oy + 10, 10, 1);
      context.fillStyle = "#59605d";
      context.fillRect(ox + 5, oy + 6, 7, 2); context.fillRect(ox + 4, oy + 8, 2, 3);
    }
    if (index === 52) {
      context.fillStyle = "#633d20";
      context.fillRect(ox, oy + 2, 16, 2); context.fillRect(ox, oy + 12, 16, 2); context.fillRect(ox + 1, oy, 2, 16); context.fillRect(ox + 13, oy, 2, 16);
      context.fillStyle = "#d5a04c";
      context.fillRect(ox + 6, oy + 6, 4, 5);
      context.fillStyle = "#5a4531";
      context.fillRect(ox + 7, oy + 7, 2, 2);
    }
    if (index === 60) {
      context.fillStyle = "#5d371f";
      context.fillRect(ox, oy, 2, 16); context.fillRect(ox + 14, oy, 2, 16); context.fillRect(ox, oy, 16, 2); context.fillRect(ox, oy + 14, 16, 2);
      context.fillStyle = "#c18a4b";
      context.fillRect(ox + 3, oy + 3, 10, 9);
      context.fillStyle = "#6b4428";
      context.fillRect(ox + 3, oy + 7, 10, 2); context.fillRect(ox + 7, oy + 2, 2, 12);
      context.fillStyle = "#e9c366";
      context.fillRect(ox + 11, oy + 3, 2, 2);
    }
    if (index === 61) {
      context.fillStyle = "#5d371f";
      context.fillRect(ox, oy, 2, 16); context.fillRect(ox + 14, oy, 2, 16); context.fillRect(ox, oy, 16, 2); context.fillRect(ox, oy + 14, 16, 2);
      context.fillStyle = "#b77d42";
      context.fillRect(ox + 3, oy + 3, 10, 10);
      // The upper door pane is actual transparency in the cutout atlas, not
      // blue-painted wood. A few opaque glints keep the glass readable while
      // the world behind it remains visible.
      context.clearRect(ox + 4, oy + 4, 8, 6);
      context.fillStyle = "#d9eee7";
      context.fillRect(ox + 5, oy + 5, 2, 1); context.fillRect(ox + 9, oy + 5, 2, 1);
      context.fillStyle = "#5d371f";
      context.fillRect(ox + 7, oy + 3, 2, 8); context.fillRect(ox + 3, oy + 9, 10, 2);
    }
    if (index === 160 || index === 161) {
      context.fillStyle = index === 160 ? "#263139" : "#718087";
      context.fillRect(ox, oy, tile, tile);
      context.fillStyle = index === 160 ? "#43515a" : "#a8b2b5";
      for (let y = 1; y < tile; y += 4) context.fillRect(ox, oy + y, tile, 1);
      context.fillStyle = index === 160 ? "#182229" : "#515f66";
      for (let x = 2; x < tile; x += 5) context.fillRect(ox + x, oy, 1, tile);
    }
    if (index === WILD_PEPPERMINT_STEM_TILE) {
      context.clearRect(ox, oy, tile, tile);
      for (const x of [5, 8, 11]) for (let y = 0; y < 16; y += 1) {
        pixel(index, x, y, (y + x) % 4 < 2 ? "#f5eee7" : "#e64d5f");
        if ((y + x) % 7 === 0 && x > 5) pixel(index, x - 1, y, "#6aa657");
      }
    }
    if (index === DRAGON_HOARD_GOLD_TILE) {
      // Hammered, stacked ingots with warm edge highlights. This replaces the
      // old borrowed Gold Ore texture on crafted blocks and lair wealth.
      context.fillStyle = "#a96c15";
      context.fillRect(ox, oy, tile, tile);
      for (let y = 0; y < tile; y += 4) {
        const offset = y % 8 === 0 ? 0 : 4;
        context.fillStyle = "#e1aa2c";
        context.fillRect(ox, oy + y, tile, 3);
        context.fillStyle = "#ffe477";
        for (let x = offset; x < tile; x += 8) context.fillRect(ox + x + 1, oy + y, 5, 1);
        context.fillStyle = "#7f4e10";
        for (let x = offset; x < tile; x += 8) context.fillRect(ox + x + 6, oy + y + 1, 1, 2);
      }
      for (const [x, y] of [[2, 2], [11, 5], [5, 10], [13, 13]] as Array<[number, number]>) {
        pixel(index, x, y, "#fff3a5");
        if (x + 1 < tile) pixel(index, x + 1, y, "#efc44f");
      }
    }
    if (index === DRAGON_HOARD_COIN_TILE) {
      context.fillStyle = "#9a6418";
      context.fillRect(ox, oy, tile, tile);
      for (let y = 1; y < tile; y += 4) for (let x = (y % 8 ? 1 : 4); x < tile; x += 7) {
        pixel(index, x, y, "#7b4b0d");
        pixel(index, Math.min(15, x + 1), y, "#d99f24");
        pixel(index, Math.min(15, x + 2), y, "#ffdf67");
        if (y + 1 < tile) {
          pixel(index, x, y + 1, "#b87916");
          pixel(index, Math.min(15, x + 1), y + 1, "#efbd3e");
          pixel(index, Math.min(15, x + 2), y + 1, "#9b6111");
        }
      }
      for (const [x, y, color] of [[4, 6, "#d95770"], [12, 3, "#5fd8d0"], [9, 12, "#a77be8"]] as Array<[number, number, string]>) {
        pixel(index, x, y, color); pixel(index, x + 1, y, shadeColor(color, 36));
        if (y + 1 < tile) pixel(index, x, y + 1, shadeColor(color, -32));
      }
    }
    if (index === DRAGON_HOARD_JEWEL_TILE) {
      context.fillStyle = "#173c43";
      context.fillRect(ox, oy, tile, tile);
      for (const [x, y, color] of [[3, 3, "#d95770"], [11, 2, "#60e4dc"], [7, 9, "#a77be8"], [13, 12, "#fff1a0"], [2, 13, "#65a8ef"]] as Array<[number, number, string]>) {
        pixel(index, x, y, shadeColor(color, -42)); pixel(index, x + 1, y - 1, color);
        pixel(index, x + 2, y, shadeColor(color, 38)); pixel(index, x + 1, y + 1, shadeColor(color, -18));
      }
    }
    if (index === 62) {
      context.fillStyle = "#6a3d22";
      context.fillRect(ox, oy, 16, 16);
      context.fillStyle = "#9a6235";
      for (let x = 2; x < 16; x += 4) context.fillRect(ox + x, oy, 2, 16);
      context.fillStyle = "#c18448";
      for (let y = 1; y < 16; y += 5) context.fillRect(ox, oy + y, 16, 1);
      context.fillStyle = "#4c2c1b";
      context.fillRect(ox, oy, 1, 16); context.fillRect(ox + 15, oy, 1, 16);
    }
    if (index === 63) {
      context.fillStyle = "#7f292c";
      context.fillRect(ox, oy, 16, 16);
      context.fillStyle = "#ad4141";
      context.fillRect(ox + 1, oy + 1, 14, 14);
      context.fillStyle = "#c55c4f";
      for (let y = 3; y < 16; y += 5) context.fillRect(ox + 1, oy + y, 14, 1);
      context.fillStyle = "#e9a26e";
      for (let x = 3; x < 16; x += 6) for (let y = 2; y < 16; y += 6) context.fillRect(ox + x, oy + y, 2, 2);
    }
    if (index === 64) {
      context.fillStyle = MEADOW_GRASS_PALETTE.top;
      context.fillRect(ox, oy, tile, tile);
      for (let y = 0; y < tile; y += 1) for (let x = 0; x < tile; x += 1) {
        if ((x * 5 + y * 3) % 19 === 0) pixel(index, x, y, MEADOW_GRASS_PALETTE.topDark);
        else if ((x * 7 + y * 11) % 23 === 0) pixel(index, x, y, MEADOW_GRASS_PALETTE.topLight);
        else if ((x * 11 + y * 5) % 41 === 0) pixel(index, x, y, MEADOW_GRASS_PALETTE.clover);
        else if ((x * 13 + y * 17) % 67 === 0) pixel(index, x, y, MEADOW_GRASS_PALETTE.flower);
      }
    }
    if (index === 65) {
      context.fillStyle = MEADOW_GRASS_PALETTE.sideDirt;
      context.fillRect(ox, oy, tile, tile);
      context.fillStyle = MEADOW_GRASS_PALETTE.sideGrass;
      context.fillRect(ox, oy, tile, 5);
      for (let x = 0; x < tile; x += 2) context.fillRect(ox + x, oy + 4, 1, 2 + (x % 3));
    }
    if (index === 70) {
      context.clearRect(ox, oy, tile, tile);
      context.fillStyle = "rgba(185,229,224,.22)";
      context.fillRect(ox + 2, oy + 2, 12, 12);
      context.fillStyle = "#8f6237";
      context.fillRect(ox, oy, 2, tile); context.fillRect(ox + 14, oy, 2, tile);
      context.fillRect(ox, oy, tile, 2); context.fillRect(ox, oy + 14, tile, 2);
      context.fillStyle = "rgba(232,255,249,.72)";
      context.fillRect(ox + 3, oy + 3, 1, 6); context.fillRect(ox + 4, oy + 3, 5, 1);
    }
    if (index === 71) {
      context.fillStyle = "#d7b768";
      context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#a9803f";
      for (let y = 0; y < tile; y += 5) context.fillRect(ox, oy + y, tile, 1);
      context.fillRect(ox + 7, oy + 3, 2, 10); context.fillRect(ox + 4, oy + 7, 8, 2);
      context.fillStyle = "#f4d98b";
      context.fillRect(ox + 7, oy + 7, 2, 2);
    }
    if (index === 72) {
      // Wild Rune Stone is old fieldstone first: irregular cool-grey grains,
      // shallow fractures, and only a sparse dusting of shiny green mineral.
      // Its light comes from those inclusions rather than a painted rune.
      context.fillStyle = "#555d58";
      context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#69716b";
      for (const [x, y] of [[1, 1], [5, 2], [11, 1], [14, 4], [3, 7], [8, 6], [12, 9], [1, 13], [6, 14], [14, 13]] as const) {
        context.fillRect(ox + x, oy + y, 2, 1);
      }
      context.fillStyle = "#3d4641";
      context.fillRect(ox + 0, oy + 5, 5, 1); context.fillRect(ox + 4, oy + 6, 1, 3);
      context.fillRect(ox + 9, oy + 11, 5, 1); context.fillRect(ox + 9, oy + 9, 1, 3);
      context.fillStyle = "#69c685";
      for (const [x, y] of [[2, 3], [7, 4], [12, 2], [5, 10], [13, 7], [3, 14], [10, 13]] as const) context.fillRect(ox + x, oy + y, 1, 1);
      context.fillStyle = "#b6f1c4";
      for (const [x, y] of [[8, 3], [2, 11], [12, 14]] as const) context.fillRect(ox + x, oy + y, 1, 1);
    }
    if (index === 84) {
      context.fillStyle = "#523824";
      context.fillRect(ox, oy, tile, tile);
      for (let x = 1; x < tile; x += 4) {
        context.fillStyle = x % 8 === 1 ? "#735139" : "#67452f";
        context.fillRect(ox + x, oy, 2, tile);
      }
      context.fillStyle = "rgba(76,139,171,.52)";
      for (let y = 3; y < tile; y += 6) context.fillRect(ox, oy + y, tile, 1);
    }
    if (index === 85) {
      context.fillStyle = "#895b35";
      context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#b17b47";
      for (let x = 2; x < tile; x += 5) context.fillRect(ox + x, oy, 2, tile);
      context.fillStyle = "#624127";
      context.fillRect(ox, oy + 4, tile, 1); context.fillRect(ox, oy + 11, tile, 1);
    }
    if (index === 86) {
      context.fillStyle = "#d8cca4"; context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#b9aa83";
      for (let y = 3; y < tile; y += 5) context.fillRect(ox, oy + y, tile, 1);
      for (let y = 0; y < tile; y += 5) context.fillRect(ox + ((y / 5) % 2 ? 4 : 10), oy + y, 1, 4);
    }
    if (index === 87) {
      context.fillStyle = "#4e5765"; context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#76808d";
      for (let y = 2; y < tile; y += 4) context.fillRect(ox, oy + y, tile, 1);
      context.fillStyle = "#353d49";
      context.fillRect(ox + 4, oy, 1, tile); context.fillRect(ox + 11, oy, 1, tile);
    }
    if (index === 88) {
      context.fillStyle = "#b96845"; context.fillRect(ox, oy, tile, tile);
      for (let y = 2; y < tile; y += 4) {
        context.fillStyle = y % 8 === 2 ? "#d38458" : "#934d3a";
        context.fillRect(ox, oy + y, tile, 2);
      }
    }
    if (index === 89) {
      context.fillStyle = "#9f6b35"; context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#633d20";
      context.fillRect(ox, oy + 2, tile, 2); context.fillRect(ox, oy + 12, tile, 2);
      context.fillRect(ox + 1, oy, 2, tile); context.fillRect(ox + 13, oy, 2, tile);
      context.fillStyle = "#d5a04c"; context.fillRect(ox + 6, oy + 6, 4, 5);
      context.fillStyle = "#51402f"; context.fillRect(ox + 7, oy + 7, 2, 2);
    }
    if (index === 90) {
      context.fillStyle = "#b9874e"; context.fillRect(ox, oy, tile, tile);
      context.fillStyle = "#704724";
      context.fillRect(ox, oy, tile, 2); context.fillRect(ox, oy + 14, tile, 2);
      context.fillRect(ox, oy, 2, tile); context.fillRect(ox + 14, oy, 2, tile);
      context.fillStyle = "#d2a463"; context.fillRect(ox + 3, oy + 3, 10, 10);
      context.fillStyle = "#8b5b31"; context.fillRect(ox + 7, oy + 3, 2, 10);
    }
    if (index >= 145 && index <= 148) {
      // Dragon egg shells: mottled scales with an element-lit hairline crack
      // (fire/ice/sea) or riveted plating (steel). Deterministic patterns keep
      // every client's atlas identical.
      const egg = [
        { dark: "#6b2118", light: "#a84a31", vein: "#ff9c46", core: "#ffd27a", speck: "#38201b" },
        { dark: "#93c3d6", light: "#e2f5fb", vein: "#67e0f2", core: "#eafdff", speck: "#ffffff" },
        { dark: "#454d53", light: "#78848c", vein: "#2f363b", core: "#cfdbe1", speck: "#9aa7ae" },
        { dark: "#23707a", light: "#43aeb0", vein: "#8ff2df", core: "#e8fbf4", speck: "#b7f0e2" },
      ][index - 145];
      context.fillStyle = base;
      context.fillRect(ox, oy, tile, tile);
      for (let y = 0; y < tile; y += 1) for (let x = 0; x < tile; x += 1) {
        if ((x * 5 + y * 7) % 19 === 0) pixel(index, x, y, egg.dark);
        else if ((x * 11 + y * 3) % 23 === 0) pixel(index, x, y, egg.light);
      }
      if (index === 147) {
        for (const seam of [5, 11]) for (let x = 0; x < tile; x += 1) pixel(index, x, seam, egg.vein);
        for (let y = 0; y < tile; y += 1) pixel(index, y < 5 ? 8 : y < 11 ? 3 : 12, y, egg.vein);
        for (const [x, y] of [[8, 5], [3, 5], [13, 5], [3, 11], [12, 11], [8, 2], [12, 14]] as Array<[number, number]>) pixel(index, x, y, egg.core);
      } else {
        for (const [x, y] of [[4, 1], [5, 2], [5, 3], [6, 4], [6, 5], [7, 6], [7, 7], [8, 8], [8, 9], [9, 10], [9, 11], [10, 12], [10, 13], [11, 14]] as Array<[number, number]>) pixel(index, x, y, egg.vein);
        for (const [x, y] of [[8, 8], [9, 7], [10, 6], [11, 6]] as Array<[number, number]>) pixel(index, x, y, egg.vein);
        pixel(index, 7, 7, egg.core); pixel(index, 8, 9, egg.core); pixel(index, 10, 6, egg.core);
      }
      for (const [x, y] of [[2, 6], [13, 3], [12, 9], [2, 13], [14, 12], [5, 11]] as Array<[number, number]>) pixel(index, x, y, egg.speck, 0.85);
    }
    if (index === 154 || index === 155) {
      const gold = index === 154;
      const stone = gold
        ? { base: "#5a3b13", mid: "#8d641e", bright: "#e4b93f", glow: "#fff1a0", dark: "#2f210f" }
        : { base: "#3e4b5f", mid: "#71849c", bright: "#cbd9e7", glow: "#f5fbff", dark: "#252e3c" };
      context.fillStyle = stone.base;
      context.fillRect(ox, oy, tile, tile);
      for (let y = 0; y < tile; y += 1) for (let x = 0; x < tile; x += 1) {
        if ((x * 13 + y * 7 + index) % 29 === 0) pixel(index, x, y, stone.mid);
        if ((x * 5 + y * 17 + index) % 41 === 0) pixel(index, x, y, stone.dark);
      }
      const vein = gold
        ? [[0, 11], [1, 10], [2, 10], [3, 9], [4, 8], [5, 8], [6, 7], [7, 6], [8, 6], [9, 5], [10, 4], [11, 4], [12, 3], [13, 2], [14, 2], [15, 1]]
        : [[0, 3], [1, 4], [2, 4], [3, 5], [4, 6], [5, 6], [6, 7], [7, 8], [8, 8], [9, 9], [10, 10], [11, 10], [12, 11], [13, 12], [14, 12], [15, 13]];
      for (const [x, y] of vein) { pixel(index, x, y, stone.bright); if ((x + y) % 4 === 0) pixel(index, x, Math.max(0, y - 1), stone.glow); }
      for (const [x, y] of [[2, 2], [13, 6], [4, 13], [11, 14], [8, 1]] as Array<[number, number]>) pixel(index, x, y, stone.glow, 0.9);
    }
    if (index === 156 || index === 157) {
      const gold = index === 156;
      const egg = gold
        ? { base: "#a66d12", dark: "#5f3b0d", plate: "#e2ac2d", edge: "#ffe47a", core: "#fffbd2" }
        : { base: "#778aa1", dark: "#3d4a5e", plate: "#b8c9dc", edge: "#e4f1ff", core: "#ffffff" };
      context.fillStyle = egg.base;
      context.fillRect(ox, oy, tile, tile);
      for (let y = 0; y < tile; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < tile; x += 4) {
        pixel(index, x, y, egg.dark); pixel(index, x + 1, y, egg.plate); pixel(index, x, Math.min(15, y + 1), egg.plate);
      }
      const rune = gold
        ? [[8, 1], [8, 2], [7, 3], [9, 3], [6, 4], [10, 4], [5, 5], [11, 5], [8, 6], [8, 7], [7, 8], [9, 8], [6, 9], [10, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14]]
        : [[11, 2], [9, 2], [8, 3], [7, 4], [6, 5], [5, 7], [5, 9], [6, 11], [7, 12], [8, 13], [10, 14], [12, 13], [10, 12], [9, 11], [8, 9], [8, 7], [9, 5], [10, 4]];
      for (const [x, y] of rune) pixel(index, x, y, egg.edge);
      for (const [x, y] of rune.filter((_, i) => i % 4 === 0)) pixel(index, x, y, egg.core);
      for (const [x, y] of [[2, 3], [13, 4], [3, 12], [12, 10]] as Array<[number, number]>) pixel(index, x, y, egg.core, 0.95);
    }
    // Production biome surfaces are painted last so their authored motifs
    // replace the older generic noise without disturbing unrelated blocks.
    paintBiomeSurfaceAtlasTile(context, index, ox, oy, tile);
  }

  const fillTile = (index: number, color: string) => {
    const ox = (index % grid) * tile;
    const oy = Math.floor(index / grid) * tile;
    context.globalAlpha = 1;
    context.fillStyle = color;
    context.fillRect(ox, oy, tile, tile);
  };
  const crateTop = (index: number, fruit: string, highlight: string) => {
    fillTile(index, "#8a5b35");
    for (let offset = 0; offset < 3; offset += 1) {
      context.fillStyle = offset === 1 ? "#c18a50" : "#5a3a25";
      context.fillRect((index % grid) * tile + offset, Math.floor(index / grid) * tile + offset, tile - offset * 2, offset === 1 ? 1 : 1);
      context.fillRect((index % grid) * tile + offset, Math.floor(index / grid) * tile + tile - 1 - offset, tile - offset * 2, 1);
      context.fillRect((index % grid) * tile + offset, Math.floor(index / grid) * tile + offset, 1, tile - offset * 2);
      context.fillRect((index % grid) * tile + tile - 1 - offset, Math.floor(index / grid) * tile + offset, 1, tile - offset * 2);
    }
    for (const [x, y] of [[5, 5], [9, 5], [7, 8], [11, 9], [4, 11]] as Array<[number, number]>) {
      pixel(index, x, y, fruit); pixel(index, x + 1, y, highlight); pixel(index, x, y + 1, fruit);
    }
    for (const [x, y] of [[6, 4], [10, 7], [5, 10]] as Array<[number, number]>) pixel(index, x, y, "#5f843e");
  };
  const cookieCrateTop = (index: number) => {
    fillTile(index, "#8a5b35");
    const ox = (index % grid) * tile;
    const oy = Math.floor(index / grid) * tile;
    for (let offset = 0; offset < 3; offset += 1) {
      context.fillStyle = offset === 1 ? "#c18a50" : "#5a3a25";
      context.fillRect(ox + offset, oy + offset, tile - offset * 2, 1);
      context.fillRect(ox + offset, oy + tile - 1 - offset, tile - offset * 2, 1);
      context.fillRect(ox + offset, oy + offset, 1, tile - offset * 2);
      context.fillRect(ox + tile - 1 - offset, oy + offset, 1, tile - offset * 2);
    }
    // Four clearly grouped trail bakes replace the random-fruit scatter used
    // by produce crates. Purple pockets and pale moon presses tie them to the
    // Glimmerwood without turning the timber crate into neon confectionery.
    for (const [cx, cy] of [[5, 5], [10, 5], [6, 10], [11, 10]] as Array<[number, number]>) {
      for (const [dx, dy] of [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]] as Array<[number, number]>) pixel(index, cx + dx, cy + dy, dy < 0 ? "#e8bb70" : "#b87943");
      pixel(index, cx - 1, cy, "#74438f");
      pixel(index, cx + 1, cy + (cy % 2 ? 0 : 1), "#a66bc0");
      pixel(index, cx, cy - 1, "#f4dfaa");
    }
  };
  const crateSide = (index: number, fruit: string, highlight: string, glyph: "berry" | "apple" | "pear" | "shellfruit" | "cookie" | "flour" | "bread") => {
    fillTile(index, "#9a673c");
    for (const y of [0, 5, 10, 15]) {
      context.fillStyle = y % 10 === 0 ? "#5a3924" : "#c0874a";
      context.fillRect((index % grid) * tile, Math.floor(index / grid) * tile + y, tile, 1);
    }
    for (const x of [1, 14]) {
      context.fillStyle = "#62412b";
      context.fillRect((index % grid) * tile + x, Math.floor(index / grid) * tile, 2, tile);
      for (const y of [2, 12]) pixel(index, x, y, "#d1a15c");
    }
    context.fillStyle = "#e2c98d";
    context.fillRect((index % grid) * tile + 4, Math.floor(index / grid) * tile + 5, 8, 6);
    if (glyph === "berry") {
      for (const [x, y] of [[6, 8], [8, 7], [9, 9]] as Array<[number, number]>) { pixel(index, x, y, fruit); pixel(index, x + 1, y, highlight); }
    } else if (glyph === "cookie") {
      for (const [x, y] of [[7, 6], [8, 6], [6, 7], [7, 7], [8, 7], [9, 7], [6, 8], [7, 8], [8, 8], [9, 8], [7, 9], [8, 9]] as Array<[number, number]>) pixel(index, x, y, y === 6 ? highlight : fruit);
      pixel(index, 6, 7, "#74438f"); pixel(index, 9, 8, "#a66bc0");
      pixel(index, 8, 7, "#f6e2ae"); pixel(index, 8, 8, "#e8c98e");
    } else if (glyph === "flour") {
      for (let y = 6; y <= 10; y += 1) for (let x = 6 + Math.abs(8 - y); x <= 9 - Math.abs(8 - y); x += 1) pixel(index, x, y, y < 8 ? highlight : fruit);
      pixel(index, 7, 6, "#876f48"); pixel(index, 8, 6, "#876f48");
    } else if (glyph === "bread") {
      for (let y = 7; y <= 10; y += 1) for (let x = 5; x <= 10; x += 1) pixel(index, x, y, y === 7 ? highlight : fruit);
      pixel(index, 6, 8, "#f1cb7c"); pixel(index, 8, 8, "#f1cb7c");
    } else if (glyph === "shellfruit") {
      for (const [x, y] of [[6, 7], [7, 6], [8, 6], [9, 7], [5, 8], [6, 9], [7, 9], [8, 9], [9, 9], [10, 8]] as Array<[number, number]>) pixel(index, x, y, fruit);
      for (const [x, y] of [[7, 7], [8, 7], [7, 8], [8, 8]] as Array<[number, number]>) pixel(index, x, y, highlight);
      pixel(index, 6, 6, "#f2d7ae"); pixel(index, 9, 6, "#f2d7ae");
    } else {
      for (const [x, y] of glyph === "apple" ? [[7, 7], [8, 7], [7, 8], [8, 8], [7, 9], [8, 9]] : [[7, 7], [8, 7], [6, 8], [7, 8], [8, 8], [9, 8], [7, 9], [8, 9]] as Array<[number, number]>) pixel(index, x, y, fruit);
      pixel(index, 8, 6, "#5d7f3d"); pixel(index, 9, 6, highlight);
    }
  };

  // Giant Mooncaps now have a radial spotted crown, scalloped side and pale
  // gills instead of borrowing the old generic magenta cube texture.
  fillTile(GIANT_MUSHROOM_TOP_TILE, "#7f2943");
  for (let ring = 0; ring < 7; ring += 1) {
    const inset = ring;
    context.strokeStyle = ring % 2 ? "#b84a62" : "#96334d";
    context.strokeRect((GIANT_MUSHROOM_TOP_TILE % grid) * tile + inset, Math.floor(GIANT_MUSHROOM_TOP_TILE / grid) * tile + inset, tile - inset * 2, tile - inset * 2);
  }
  for (const [x, y, size] of [[3, 3, 2], [11, 4, 2], [6, 8, 2], [12, 11, 1], [3, 12, 2]] as Array<[number, number, number]>) {
    for (let dx = 0; dx < size; dx += 1) for (let dy = 0; dy < size; dy += 1) pixel(GIANT_MUSHROOM_TOP_TILE, x + dx, y + dy, "#efcf9b");
  }
  fillTile(GIANT_MUSHROOM_SIDE_TILE, "#8f3049");
  for (let x = 0; x < tile; x += 1) {
    const scallop = 10 + Math.floor(Math.sin(x * Math.PI / 4) * 2);
    for (let y = scallop; y < tile; y += 1) pixel(GIANT_MUSHROOM_SIDE_TILE, x, y, y === scallop ? "#e2b781" : "#674039");
    if (x % 4 === 1) for (let y = 2; y < scallop - 1; y += 1) pixel(GIANT_MUSHROOM_SIDE_TILE, x, y, y % 3 ? "#a94459" : "#c06070");
  }
  fillTile(GIANT_MUSHROOM_GILLS_TILE, "#ead8b3");
  for (let x = 0; x < tile; x += 1) for (let y = 0; y < tile; y += 1) {
    const dx = x - 7.5; const dy = y - 7.5; const angle = Math.atan2(dy, dx);
    if (Math.floor((angle + Math.PI) * 8 / Math.PI) % 2 === 0) pixel(GIANT_MUSHROOM_GILLS_TILE, x, y, "#c99c82");
  }
  for (let x = 5; x <= 10; x += 1) for (let y = 5; y <= 10; y += 1) pixel(GIANT_MUSHROOM_GILLS_TILE, x, y, "#8a5c50");

  crateTop(MOONBERRY_CRATE_TOP_TILE, "#704395", "#b887d5");
  crateSide(MOONBERRY_CRATE_SIDE_TILE, "#704395", "#b887d5", "berry");
  crateTop(SUNBERRY_CRATE_TOP_TILE, "#d47d2e", "#ffd46b");
  crateSide(SUNBERRY_CRATE_SIDE_TILE, "#d47d2e", "#ffd46b", "berry");
  crateTop(APPLE_CRATE_TOP_TILE, "#b83f36", "#ef8064");
  crateSide(APPLE_CRATE_SIDE_TILE, "#b83f36", "#ef8064", "apple");
  crateTop(FROSTPEAR_CRATE_TOP_TILE, "#8bc4c7", "#d7fbef");
  crateSide(FROSTPEAR_CRATE_SIDE_TILE, "#8bc4c7", "#d7fbef", "pear");
  cookieCrateTop(MOONBERRY_COOKIE_CRATE_TOP_TILE);
  crateSide(MOONBERRY_COOKIE_CRATE_SIDE_TILE, "#b87943", "#e8bb70", "cookie");
  crateTop(FLOUR_CRATE_TOP_TILE, "#e3d2a6", "#fff2c8");
  crateSide(FLOUR_CRATE_SIDE_TILE, "#ddc993", "#fff0bd", "flour");
  crateTop(BREAD_CRATE_TOP_TILE, "#b96f35", "#f0bd69");
  crateSide(BREAD_CRATE_SIDE_TILE, "#b96f35", "#f0bd69", "bread");

  // The mill reads as a maintained Hearthkin machine: timber housing, a
  // pale stone runner, iron axle pins, and a shallow grain hopper.
  fillTile(WHEAT_MILL_TOP_TILE, "#8a5a34");
  for (let y = 2; y <= 13; y += 1) for (let x = 2; x <= 13; x += 1) {
    const distance = Math.hypot(x - 7.5, y - 7.5);
    if (distance < 5.2) pixel(WHEAT_MILL_TOP_TILE, x, y, distance < 1.7 ? "#544635" : (x + y) % 3 ? "#b8aa8b" : "#8f856f");
  }
  for (const x of [1, 14]) for (let y = 0; y < tile; y += 1) pixel(WHEAT_MILL_TOP_TILE, x, y, "#5b3924");
  fillTile(WHEAT_MILL_SIDE_TILE, "#9a673a");
  for (const y of [1, 7, 14]) for (let x = 0; x < tile; x += 1) pixel(WHEAT_MILL_SIDE_TILE, x, y, y === 7 ? "#d0a05e" : "#5b3a25");
  for (const [x, y] of [[3, 4], [12, 4], [3, 11], [12, 11]] as Array<[number, number]>) {
    pixel(WHEAT_MILL_SIDE_TILE, x, y, "#d3c5a5"); pixel(WHEAT_MILL_SIDE_TILE, x + (x < 8 ? 1 : -1), y, "#6f6759");
  }
  const clearTile = (index: number) => context.clearRect((index % grid) * tile, Math.floor(index / grid) * tile, tile, tile);

  // Star Crystal is a fused, tileable lattice. Every sample is derived from
  // mirrored coordinates, so all three faces repeat on both axes without a
  // directional crest or the old noisy edge discontinuity.
  const paintStarCrystalFace = (index: number, palette: readonly [string, string, string, string, string], intensity: number) => {
    for (let y = 0; y < tile; y += 1) for (let x = 0; x < tile; x += 1) {
      const mx = Math.min(x, 15 - x);
      const my = Math.min(y, 15 - y);
      const dx = Math.abs(x - 7.5);
      const dy = Math.abs(y - 7.5);
      const centralFacet = dx + dy <= 3.5 + intensity;
      const crossFacet = (dx <= 0.5 + intensity * .2 && dy <= 6.5) || (dy <= 0.5 + intensity * .2 && dx <= 6.5);
      const diagonalVein = Math.abs(mx - my) <= (intensity > .5 ? 0 : -1) && mx >= 2;
      const lattice = ((mx * 3 + my * 5) % 7 === 0) && mx > 0 && my > 0;
      const color = centralFacet ? (dx + dy <= 1.5 ? palette[4] : palette[3])
        : crossFacet ? palette[2]
          : diagonalVein ? palette[2]
            : lattice ? palette[1] : palette[0];
      pixel(index, x, y, color);
    }
  };
  paintStarCrystalFace(STAR_CRYSTAL_BLOCK_TOP_TILE, ["#123a47", "#1b5665", "#43aeba", "#8dece8", "#efffff"], 1);
  paintStarCrystalFace(STAR_CRYSTAL_BLOCK_SIDE_TILE, ["#153e4a", "#205967", "#378b98", "#71d7d7", "#d9ffff"], .45);
  paintStarCrystalFace(STAR_CRYSTAL_BLOCK_BOTTOM_TILE, ["#0e303a", "#184754", "#286d78", "#52aeb5", "#a9e7e5"], .12);

  // River Ribbon uses a periodic current curve: the first and final texture
  // rows are identical, so stacked blocks read as one broad plant rather than
  // a set of disconnected cards.
  clearTile(RIVER_RIBBON_TILE);
  for (let y = 0; y < tile; y += 1) {
    const phase = y / 15 * Math.PI * 2;
    const centerA = Math.round(5 + Math.sin(phase) * 2);
    const centerB = Math.round(11 + Math.sin(phase + Math.PI) * 1.5);
    for (const [center, dark, mid, light] of [
      [centerA, "#173f38", "#34755f", "#72b08b"],
      [centerB, "#1d4b41", "#40856b", "#8bc39a"],
    ] as Array<[number, string, string, string]>) {
      for (const [offset, color] of [[-2, dark], [-1, mid], [0, light], [1, mid]] as Array<[number, string]>) {
        const x = center + offset;
        if (x >= 0 && x < tile) pixel(RIVER_RIBBON_TILE, x, y, color);
      }
    }
  }

  // Reed Bloom is now a jointed waterside reed rather than a recycled flower
  // sprite. Middle segments carry uninterrupted teal stems; only the top
  // segment opens its amber seed-cups and paired blue-green flags.
  const paintReedStem = (index: number) => {
    clearTile(index);
    for (let y = 0; y < tile; y += 1) {
      for (const [x, color] of [[5, "#244f4a"], [6, "#5c9180"], [10, "#2f6256"], [11, "#76aa8b"]] as Array<[number, string]>) pixel(index, x, y, color);
      if (y === 4 || y === 11) {
        pixel(index, 4, y, "#315f53"); pixel(index, 7, y, "#80a98b");
        pixel(index, 9, y, "#396d5c"); pixel(index, 12, y, "#91b894");
      }
    }
  };
  paintReedStem(REED_BLOOM_STEM_TILE);
  paintReedStem(REED_BLOOM_CROWN_TILE);
  for (const [cx, cy] of [[5, 4], [11, 6]] as Array<[number, number]>) {
    for (const [dx, dy, color] of [
      [-2, 0, "#8a5a32"], [-1, -1, "#c4873f"], [0, -2, "#f0c968"], [1, -1, "#e0a64c"], [2, 0, "#8a5a32"],
      [-1, 0, "#e5b753"], [0, 0, "#fff0a1"], [1, 0, "#c98a3d"], [0, 1, "#7b4b2d"],
    ] as Array<[number, number, string]>) pixel(REED_BLOOM_CROWN_TILE, cx + dx, cy + dy, color);
  }
  for (const [x, y, color] of [[2, 8, "#4d8876"], [3, 9, "#77ad8d"], [8, 10, "#3c7568"], [9, 9, "#6ba389"], [13, 11, "#8ab494"]] as Array<[number, number, string]>) pixel(REED_BLOOM_CROWN_TILE, x, y, color);

  // Shellfruit grows as a low seafloor rosette. Each stage adds fronds and
  // then opens warm scalloped shells around a pale edible pearl.
  const paintShellfruitStage = (index: number, stage: 0 | 1 | 2) => {
    clearTile(index);
    const fronds = stage === 0 ? [[7, 8, -1], [9, 9, 1]] : [[4, 7, -1], [7, 5, -1], [10, 6, 1], [12, 8, 1]];
    for (const [baseX, topY, lean] of fronds as Array<[number, number, number]>) {
      for (let y = 15; y >= topY; y -= 1) pixel(index, baseX + Math.round((15 - y) / 4) * lean, y, (y + baseX) % 3 ? "#4b977c" : "#82c4a1");
    }
    const shells = stage === 0 ? [[8, 12]] : stage === 1 ? [[6, 11], [10, 10]] : [[4, 11], [8, 9], [12, 11]];
    for (const [cx, cy] of shells as Array<[number, number]>) {
      for (const [dx, dy] of [[-2, 1], [-1, 0], [0, -1], [1, 0], [2, 1], [-1, 1], [0, 1], [1, 1], [-1, 2], [0, 2], [1, 2]] as Array<[number, number]>) {
        pixel(index, cx + dx, cy + dy, dy === -1 ? "#f3d8b3" : dx < 0 ? "#bd795d" : "#df9d70");
      }
      if (stage === 2) { pixel(index, cx, cy, "#fff4c7"); pixel(index, cx + 1, cy, "#ffd57e"); }
    }
    for (let x = 2; x < 15; x += 4) pixel(index, x, 15, "#6f7f72");
  };
  paintShellfruitStage(SHELLFRUIT_SPROUT_TILE, 0);
  paintShellfruitStage(SHELLFRUIT_YOUNG_TILE, 1);
  paintShellfruitStage(SHELLFRUIT_CROP_TILE, 2);
  crateTop(SHELLFRUIT_CRATE_TOP_TILE, "#c9835f", "#fff0bb");
  crateSide(SHELLFRUIT_CRATE_SIDE_TILE, "#c9835f", "#fff0bb", "shellfruit");

  // Ordinary seas are grounded by two matte staples and two restrained
  // accents. Every tall texture reaches both tile edges so adjacent segments
  // overlap into one continuous organism in the aquatic mesh.
  clearTile(BRINEGRASS_TILE);
  for (const [baseX, lean, height, dark, light] of [
    [2, 1, 12, "#183f37", "#4e9476"],
    [5, -1, 15, "#245548", "#70ae86"],
    [8, 1, 13, "#1d4a40", "#5da17e"],
    [11, -1, 11, "#285d4d", "#78b58b"],
    [14, -1, 14, "#183f37", "#4d8d70"],
  ] as Array<[number, number, number, string, string]>) {
    for (let step = 0; step <= height; step += 1) {
      const y = 15 - step;
      const x = Math.max(0, Math.min(15, baseX + Math.round(step / 5) * lean));
      pixel(BRINEGRASS_TILE, x, y, step % 4 === 0 ? light : dark);
      if (step > 2 && step % 3 !== 0 && x + 1 < tile) pixel(BRINEGRASS_TILE, x + 1, y, light, .92);
    }
    pixel(BRINEGRASS_TILE, baseX, 15, "#102e29");
  }
  for (const x of [5, 8, 14]) pixel(BRINEGRASS_TILE, x, 0, "#75b58a");

  clearTile(SAILKELP_TILE);
  for (let y = 0; y < tile; y += 1) {
    pixel(SAILKELP_TILE, 7, y, y % 4 ? "#4a4929" : "#6b6937");
    pixel(SAILKELP_TILE, 8, y, y % 5 ? "#777541" : "#aaa75c");
  }
  for (const [startY, direction, span] of [[1, -1, 5], [4, 1, 6], [8, -1, 6], [11, 1, 5]] as Array<[number, number, number]>) {
    for (let step = 1; step <= span; step += 1) {
      const x = direction < 0 ? 7 - step : 8 + step;
      const y = Math.min(15, startY + Math.floor(step * .62));
      pixel(SAILKELP_TILE, x, y, step === span ? "#aab064" : step % 3 === 0 ? "#8e914d" : "#706f3d");
      if (y + 1 < tile && step < span) pixel(SAILKELP_TILE, x, y + 1, "#4e4e2c");
    }
  }
  for (const [x, y] of [[7, 0], [8, 0], [7, 15], [8, 15]] as Array<[number, number]>) pixel(SAILKELP_TILE, x, y, y === 0 ? "#aeb768" : "#3d3d26");

  clearTile(FEATHERWRACK_TILE);
  for (let y = 0; y < tile; y += 1) {
    pixel(FEATHERWRACK_TILE, 7, y, y % 4 ? "#6e3938" : "#9a5148");
    if (y % 3 !== 1) pixel(FEATHERWRACK_TILE, 8, y, "#b76a57");
  }
  for (const [y, reach] of [[2, 3], [5, 5], [8, 4], [11, 5], [13, 3]] as Array<[number, number]>) {
    for (let step = 1; step <= reach; step += 1) {
      const rise = Math.floor(step / 2);
      pixel(FEATHERWRACK_TILE, 7 - step, Math.max(0, y - rise), step === reach ? "#d38b6d" : "#9f554b");
      pixel(FEATHERWRACK_TILE, 8 + step, Math.min(15, y + rise), step === reach ? "#c77c62" : "#85413e");
    }
  }
  pixel(FEATHERWRACK_TILE, 7, 0, "#d18a68"); pixel(FEATHERWRACK_TILE, 7, 15, "#4f2c2f");

  clearTile(PEARLFAN_TILE);
  for (let y = 9; y < tile; y += 1) {
    pixel(PEARLFAN_TILE, 7, y, y > 13 ? "#4f5558" : "#89847f");
    pixel(PEARLFAN_TILE, 8, y, y > 13 ? "#66605c" : "#c5b7aa");
  }
  for (let row = 0; row < 8; row += 1) {
    const half = Math.min(7, 2 + row);
    const y = 8 - row;
    for (let x = 8 - half; x <= 7 + half; x += 1) {
      const edge = x === 8 - half || x === 7 + half;
      if ((x + row) % 3 === 0 && !edge) continue;
      pixel(PEARLFAN_TILE, x, y, edge ? "#6c6871" : row % 3 === 0 ? "#eee1ca" : row % 2 ? "#b8aeb2" : "#d5c8bd");
    }
  }
  for (const [x, y] of [[2, 2], [5, 0], [9, 1], [13, 3]] as Array<[number, number]>) pixel(PEARLFAN_TILE, x, y, "#fff3d9");

  // Moonfelt is a building substrate, not a crossed plant. Its subdued
  // toroidal grain and wrapping hyphae repeat cleanly over floors, walls, and
  // ceilings without an obvious grass top or directional border.
  fillTile(MOONFELT_MYCELIUM_TILE, "#5b5066");
  const moonfeltBase = ["#51495d", "#5b5066", "#65586f", "#706179"] as const;
  for (let y = 0; y < tile; y += 1) for (let x = 0; x < tile; x += 1) {
    const grain = (x * 5 + y * 3 + x * y * 2) & 15;
    pixel(MOONFELT_MYCELIUM_TILE, x, y, moonfeltBase[grain & 3]);
    const descendingThread = ((x - y + 16) & 7) === 0;
    const risingThread = ((x + y * 2) & 7) === 0;
    if (descendingThread && ((x + y) & 3) !== 1) pixel(MOONFELT_MYCELIUM_TILE, x, y, "#8d7b9c");
    if (risingThread && ((x + y * 3) & 7) < 5) pixel(MOONFELT_MYCELIUM_TILE, x, y, "#a08caf");
    if (descendingThread && risingThread) pixel(MOONFELT_MYCELIUM_TILE, x, y, "#d0bfda");
  }
  for (const [x, y] of [[1, 3], [6, 6], [12, 1], [14, 9], [4, 13], [10, 11]] as Array<[number, number]>) {
    pixel(MOONFELT_MYCELIUM_TILE, x, y, "#b6a2c4");
    pixel(MOONFELT_MYCELIUM_TILE, (x + 1) & 15, y, "#796986");
  }

  clearTile(FROSTPEAR_SAPLING_TILE);
  for (let y = 5; y < 16; y += 1) pixel(FROSTPEAR_SAPLING_TILE, 7, y, y % 3 ? "#755138" : "#9b7248");
  for (const [x, y] of [[5, 5], [9, 4], [4, 8], [10, 8], [6, 11], [9, 12]] as Array<[number, number]>) {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]] as Array<[number, number]>) pixel(FROSTPEAR_SAPLING_TILE, x + dx, y + dy, dy ? "#47766b" : "#6c9d86");
  }
  clearTile(FROSTPEAR_LEAVES_TILE);
  for (let x = 0; x < tile; x += 1) for (let y = 0; y < tile; y += 1) {
    const edge = Math.min(x, y, 15 - x, 15 - y);
    const grain = (x * 11 + y * 17 + x * y * 3) % 31;
    // Irregular pinholes and a slightly ragged edge keep adjacent blocks full
    // while breaking the old flat, moss-like sheet into visible leaf clusters.
    if (grain < (edge === 0 ? 8 : edge === 1 ? 5 : 3)) continue;
    const color = grain < 8 ? "#294f4b"
      : grain < 14 ? "#37675e"
        : grain < 21 ? "#4f7f70"
          : grain < 27 ? "#6b9b87" : "#91b6a1";
    pixel(FROSTPEAR_LEAVES_TILE, x, y, color);
  }
  // Paired two- and three-pixel leaflets provide readable little blades at
  // nearest filtering; cool tips retain Frostpear's wintry orchard identity.
  for (const [x, y, flip] of [[2, 2, 0], [6, 1, 1], [11, 2, 0], [4, 5, 1], [9, 5, 0], [13, 6, 1], [1, 9, 0], [6, 9, 1], [10, 10, 0], [4, 13, 0], [9, 14, 1], [13, 12, 0]] as Array<[number, number, number]>) {
    pixel(FROSTPEAR_LEAVES_TILE, x, y, flip ? "#a8cbb4" : "#7eab94");
    if (x + 1 < tile) pixel(FROSTPEAR_LEAVES_TILE, x + 1, y + (flip ? 1 : 0), "#c2ddc8");
    if (y + 1 < tile) pixel(FROSTPEAR_LEAVES_TILE, x, y + 1, "#557f6f");
  }
  for (const [x, y] of [[3, 3], [7, 3], [10, 6], [8, 8], [5, 11], [11, 12]] as Array<[number, number]>) pixel(FROSTPEAR_LEAVES_TILE, x, y, "#d9ead2");
  clearTile(FROSTPEAR_FRUIT_TILE);
  for (let x = 5; x <= 10; x += 1) for (let y = 5; y <= 12; y += 1) {
    const width = y < 8 ? 2 : y < 11 ? 3 : 2;
    if (Math.abs(x - 7.5) <= width) pixel(FROSTPEAR_FRUIT_TILE, x, y, x < 7 ? "#76aeb4" : x > 9 ? "#c9eee7" : "#9bd0cf");
  }
  pixel(FROSTPEAR_FRUIT_TILE, 8, 3, "#6a4b32"); pixel(FROSTPEAR_FRUIT_TILE, 8, 4, "#6a4b32"); pixel(FROSTPEAR_FRUIT_TILE, 9, 3, "#6f9258");

  // Cactus sides read as ribbed living tissue rather than flat green noise;
  // the dedicated top tile exposes a compact rosette and pale spine clusters.
  fillTile(26, "#397839");
  for (let x = 0; x < tile; x += 1) {
    const rib = x % 5;
    const color = rib === 0 ? "#24592f" : rib === 1 ? "#63a94d" : rib === 2 ? "#4b9140" : "#347336";
    context.fillStyle = color;
    context.fillRect((26 % grid) * tile + x, Math.floor(26 / grid) * tile, 1, tile);
  }
  for (const [x, y] of [[1, 2], [6, 5], [11, 3], [1, 11], [6, 14], [11, 10], [15, 7]] as Array<[number, number]>) {
    pixel(26, x, y, "#e7dfb0");
    if (x + 1 < tile) pixel(26, x + 1, y, "#9fc572");
  }
  fillTile(CACTUS_TOP_TILE, "#245b31");
  for (let ring = 1; ring <= 6; ring += 1) {
    const color = ring % 2 === 0 ? "#4c9241" : "#37783a";
    context.strokeStyle = color;
    context.strokeRect((CACTUS_TOP_TILE % grid) * tile + ring, Math.floor(CACTUS_TOP_TILE / grid) * tile + ring, tile - ring * 2, tile - ring * 2);
  }
  for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12], [8, 2], [2, 8], [13, 8], [8, 13]] as Array<[number, number]>) pixel(CACTUS_TOP_TILE, x, y, "#eadfaf");
  for (const [x, y] of [[7, 7], [8, 7], [7, 8], [8, 8]] as Array<[number, number]>) pixel(CACTUS_TOP_TILE, x, y, "#82bd57");

  // Moonbough crowns are dense, irregular leaf clusters with restrained
  // moonlit flecks—not the four-petal flower cell they previously borrowed.
  clearTile(MOONBOUGH_LEAVES_TILE);
  for (let x = 0; x < tile; x += 1) for (let y = 0; y < tile; y += 1) {
    const edge = Math.min(x, y, 15 - x, 15 - y);
    if ((x * 7 + y * 11 + x * y) % 23 < (edge === 0 ? 8 : 3)) continue;
    const leafColor = (x * 3 + y * 5) % 11 < 3 ? "#2f6156" : (x + y * 2) % 7 < 2 ? "#70a98c" : "#477d69";
    pixel(MOONBOUGH_LEAVES_TILE, x, y, leafColor);
  }
  for (const [x, y] of [[2, 4], [12, 2], [7, 6], [4, 12], [13, 10], [9, 14]] as Array<[number, number]>) {
    pixel(MOONBOUGH_LEAVES_TILE, x, y, "#b9f3d2");
    if (x + 1 < tile) pixel(MOONBOUGH_LEAVES_TILE, x + 1, y, "#8cbfa5");
  }

  // A many-frond fern silhouette with a bright central rachis and cool tips.
  clearTile(STARFERN_TILE);
  for (let y = 3; y < tile; y += 1) {
    const stemX = 7 + Math.round(Math.sin(y * 0.42));
    pixel(STARFERN_TILE, stemX, y, y < 7 ? "#b9ffe1" : "#67c99b");
    if (y >= 5 && y <= 13) {
      const reach = y < 8 ? 2 : y < 11 ? 4 : 5;
      for (let step = 1; step <= reach; step += 1) {
        const rise = Math.floor(step / 2);
        pixel(STARFERN_TILE, stemX - step, y - rise, step === reach ? "#a9f6d1" : "#3b9b75");
        pixel(STARFERN_TILE, stemX + step, y - rise - (y % 2), step === reach ? "#d2ffe9" : "#53bd8c");
      }
    }
  }
  for (const [x, y] of [[5, 15], [7, 14], [9, 15]] as Array<[number, number]>) pixel(STARFERN_TILE, x, y, "#2b795e");

  // Dreamcaps form a readable mushroom cluster with layered caps, gills and
  // stems so both the crossed world mesh and its held model stay distinctive.
  clearTile(DREAMCAP_TILE);
  for (const [stemX, capY, capRadius] of [[4, 8, 3], [9, 5, 4], [12, 10, 2]] as Array<[number, number, number]>) {
    for (let y = capY + 2; y < 16; y += 1) {
      pixel(DREAMCAP_TILE, stemX, y, y % 3 === 0 ? "#c9c3df" : "#eee8f4");
      if (y > capY + 5 && stemX + 1 < tile) pixel(DREAMCAP_TILE, stemX + 1, y, "#a99fbd");
    }
    for (let dx = -capRadius; dx <= capRadius; dx += 1) {
      const height = Math.max(1, capRadius - Math.floor(Math.abs(dx) / 2));
      for (let dy = 0; dy <= height; dy += 1) {
        const x = stemX + dx;
        const y = capY + dy;
        if (x < 0 || x >= tile || y < 0 || y >= tile) continue;
        pixel(DREAMCAP_TILE, x, y, dy === height ? "#674b9d" : dx < 0 ? "#8565c5" : "#ae8cf0");
      }
      const gillX = stemX + dx;
      if (gillX >= 0 && gillX < tile) pixel(DREAMCAP_TILE, gillX, capY + height + 1, dx % 2 ? "#d8c4ef" : "#f1ddff");
    }
  }
  for (const [x, y] of [[3, 8], [8, 5], [10, 6], [12, 10]] as Array<[number, number]>) pixel(DREAMCAP_TILE, x, y, "#e5d5ff");
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class ChunkWorld {
  celestialTerrain: CelestialTerrain | null = null;
  /** Local derived-system invalidation. Observers do not own or serialize blocks. */
  readonly blockEditObservers = new Set<(point: { x: number; y: number; z: number }) => void>();
  group = new THREE.Group();
  chunks = new Map<string, Chunk>();
  edits = new Map<string, Map<number, BlockId>>();
  private chunkEditSignatureCache = new Map<string, string>();
  /** Monotonic session-local revision for optimistic agent commands. */
  mutationRevision = 0;
  /** Every coordinate-keyed map below belongs to this runtime owner. */
  locationScope: LocationStamp = { locationId: locationId(homeLocation(universeId(`preview-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`))), epoch: 1, revision: 0 };
  private locationLoadEpoch = 0;
  get runtimeLocationEpoch() { return this.locationLoadEpoch; }
  structureMarkers = new Map<string, StructureMarker>();
  settlementPlans = new Map<string, SettlementWorldPlan>();
  private readonly settlementIndex = new SettlementIndex();
  private settlementCandidateCache = new Map<string, SettlementCandidate | null>();
  private settlementValidatedCandidateCache = new Map<string, SettlementCandidate | null>();
  private surfaceRoadGraphCache = new Map<string, readonly RoadEdge[]>();
  private surfaceRoadCache = new Map<string, readonly RoadPoint[]>();
  private safeCaveEntranceCache = new Map<string, SafeCaveEntranceSite | null>();
  generationQueue: Array<{ cx: number; cz: number; distance: number }> = [];
  generationQueued = new Set<string>();
  generationEnqueuedAt = new Map<string, number>();
  activeGenerationTask: ChunkGenerationTask | null = null;
  generationTasks = new Map<string, ChunkGenerationTask>();
  lightInitializationQueue: string[] = [];
  lightInitializationQueueHead = 0;
  lightInitializationQueued = new Set<string>();
  lightInitializationEnqueuedAt = new Map<string, number>();
  activeLightInitialization: { key: string; task: VoxelLightInitializationTask } | null = null;
  lightInitializationTasks = new Map<string, VoxelLightInitializationTask>();
  lightReconciliationQueue: Array<{ key: string; task: VoxelLightInitializationTask }> = [];
  lightReconciliationQueued = new Set<string>();
  activeLightReconciliation: { key: string; task: VoxelLightInitializationTask } | null = null;
  meshQueue: Array<{ key: string; section: number }> = [];
  meshQueueHead = 0;
  meshQueued = new Set<string>();
  meshEnqueuedAt = new Map<string, number>();
  consolidationQueue: Array<{ key: string; layer: WorldRenderLayer }> = [];
  consolidationQueued = new Set<string>();
  consolidationEnqueuedAt = new Map<string, number>();
  consolidationRevision = new Map<string, number>();
  consolidationDirtyLayers = new Map<string, Set<WorldRenderLayer>>();
  pendingConsolidations = new Set<string>();
  completedConsolidations: Array<{ key: string; layer: WorldRenderLayer; revision: number; geometry: TerrainMergedGeometry | null }> = [];
  staleConsolidations = 0;
  coalescedConsolidations = 0;
  invalidatedCombinedMeshes = 0;
  terrainBufferPipeline = new TerrainBufferPipeline();
  terrainGenerationPipeline = new TerrainGenerationPipeline();
  pendingWorkerGeneration = new Set<string>();
  completedWorkerGeneration: TerrainGenerationResult[] = [];
  staleWorkerGeneration = 0;
  terrainGeometriesCreated = 0;
  terrainGeometriesDisposed = 0;
  liveTerrainGeometryBytes = 0;
  private terrainGeometryBytes = new WeakMap<THREE.BufferGeometry, number>();
  urgentMeshQueue: Array<{ key: string; section: number }> = [];
  urgentMeshQueueHead = 0;
  urgentMeshQueued = new Set<string>();
  /** Sections whose old consolidated geometry still contains a now-resolved chunk-edge face. */
  seamMeshRebuilds = new Set<string>();
  /** New sections held back until every already-present neighbor has retired its speculative edge. */
  seamPresentationPending = new Map<string, { key: string; section: number; urgent: boolean; blockers: Set<string> }>();
  activeMeshTask: MeshBuildTask | null = null;
  lightSectionQueue: Array<{ key: string; section: number }> = [];
  lightSectionQueueHead = 0;
  lightSectionQueued = new Set<string>();
  lightSectionsPendingByChunk = new Map<string, number>();
  private nextPlayerEditFeedbackId = 1;
  private activePlayerEditFeedback: PlayerEditFeedbackRecord | null = null;
  private playerEditFeedbackRecords: PlayerEditFeedbackRecord[] = [];
  private playerEditConsolidationWaiters = new Map<string, Set<number>>();
  seedText = "WILDERNESS";
  seed = seedToInt(this.seedText);
  renderDistance = 10;
  retentionPadding = 2;
  generationWorkPerFrame = 1;
  meshWorkPerFrame = 2;
  streamingFrameBudgetMilliseconds = DEFAULT_STREAMING_FRAME_BUDGET_MS;
  streamingLookaheadChunkX = 0;
  streamingLookaheadChunkZ = 0;
  streamingViewX = 0;
  streamingViewZ = 1;
  streamingViewSector = 0;
  scheduledViewSector = Number.NaN;
  renderDrawCallPressure = 0;
  renderFramePressureMilliseconds = 16.7;
  streamingCompleted = { generation: 0, lighting: 0, meshing: 0 };
  streamingCanceled = { generation: 0, lighting: 0, meshing: 0 };
  playerUnreadyStartedAt: number | null = null;
  playerReadinessEpisodes: number[] = [];
  chunkMemoryCache = new ChunkMemoryCache();
  chunkPersistentCache = new ChunkPersistentCache();
  pendingPersistentChunks = new Set<string>();
  persistentCacheHits = 0;
  persistentCacheMisses = 0;
  generationOptions = normalizeWorldGenerationOptions();
  playerChunkX = Number.NaN;
  playerChunkZ = Number.NaN;
  playerSection = sectionForY(0);
  frame = 0;
  atlas: THREE.Texture;
  materials: Record<WorldRenderLayer, THREE.Material>;
  lightEngine: VoxelLightEngine;
  private readonly lightingUniforms: VoxelLightingUniforms = {
    voxelSkyColor: { value: new THREE.Color(0xb9ddff) },
    voxelSkyIntensity: { value: 0.82 },
    voxelSunColor: { value: new THREE.Color(0xfff1ce) },
    voxelSunDirection: { value: new THREE.Vector3(0.45, 0.8, 0.32).normalize() },
    voxelSunIntensity: { value: 0.28 },
    voxelBlockIntensity: { value: 1.35 },
    voxelMinimumAmbient: { value: 0.028 },
    voxelHeldLightPosition: { value: new THREE.Vector3() },
    voxelHeldLightColor: { value: new THREE.Color(0xffb45e) },
    voxelHeldLightIntensity: { value: 0 },
    voxelHeldLightRadius: { value: 0 },
    voxelMachineLightPosition: { value: new THREE.Vector3() },
    voxelMachineLightColor: { value: new THREE.Color(0xffa45a) },
    voxelMachineLightIntensity: { value: 0 },
    voxelMachineLightRadius: { value: 0 },
    voxelWaterPhase: { value: 0 },
  };
  private readonly surfaceLightSample: [number, number, number, number] = [0, 0, 0, 0];
  /**
   * Open chests are drawn by the engine as articulated models. Keeping their
   * static chunk geometry out of the same frame avoids the dark z-fighting
   * seams that appeared through the animated lid and body.
   */
  hiddenChestVisuals = new Set<string>();
  /** Sparse metadata: only player-placed asymmetric blocks with non-default facing need entries. */
  blockFacings = new Map<string, BlockFacing>();
  private waterAnimationFrame = -1;
  private liquidCellProvider: ((x: number, y: number, z: number) => Readonly<{
    level: number;
    source: boolean;
    falling: boolean;
  }> | undefined) | null = null;

  constructor() {
    this.atlas = typeof document === "undefined"
      ? new THREE.DataTexture(new Uint8Array([127, 127, 127, 255]), 1, 1, THREE.RGBAFormat)
      : createBlockAtlas();
    this.atlas.needsUpdate = true;
    this.materials = {
      opaque: createVoxelWorldMaterial(this.atlas, this.lightingUniforms),
      cutout: createVoxelWorldMaterial(this.atlas, this.lightingUniforms, { alphaTest: 0.32, side: THREE.DoubleSide }),
      translucentSolid: createVoxelWorldMaterial(this.atlas, this.lightingUniforms, { transparent: true, opacity: 0.86, depthWrite: true }),
      water: createVoxelWorldMaterial(this.atlas, this.lightingUniforms, { transparent: true, opacity: 0.76, depthWrite: false, side: THREE.DoubleSide, animateWater: true }),
      transparent: createVoxelWorldMaterial(this.atlas, this.lightingUniforms, { transparent: true, opacity: 0.76, depthWrite: false, side: THREE.DoubleSide }),
      glass: createVoxelWorldMaterial(this.atlas, this.lightingUniforms, { transparent: true, opacity: GLASS_OPACITY, depthWrite: false, side: THREE.DoubleSide }),
      emissive: createVoxelWorldMaterial(this.atlas, this.lightingUniforms, { alphaTest: 0.2, side: THREE.DoubleSide }),
    };
    // Packed vertex colors are stored as color / 1.1. Restoring that scale on
    // the shared material keeps the existing overbright biome tint contract.
    for (const material of Object.values(this.materials)) if (material instanceof THREE.MeshBasicMaterial) material.color.setScalar(PACKED_VERTEX_COLOR_RANGE);
    this.lightEngine = new VoxelLightEngine({
      chunkSize: CHUNK_SIZE,
      minY: MIN_Y,
      maxY: MAX_Y,
      sectionHeight: SECTION_HEIGHT,
      getChunk: (cx, cz) => this.chunks.get(chunkKey(cx, cz)),
      getDefinition: (type) => BLOCKS[type],
      markLightDirty: (x, y, z) => this.queueLightSectionAt(x, y, z),
    });
  }

  /** Supplies sparse runtime flow metadata without coupling world storage to the simulator. */
  setLiquidCellProvider(provider: typeof this.liquidCellProvider) {
    this.liquidCellProvider = provider;
  }

  setLightingEnvironment(environment: VoxelLightingEnvironment) {
    this.lightingUniforms.voxelSkyColor.value.set(environment.skyColor);
    this.lightingUniforms.voxelSkyIntensity.value = Math.max(0, environment.skyIntensity);
    this.lightingUniforms.voxelSunColor.value.set(environment.sunColor);
    this.lightingUniforms.voxelSunDirection.value.copy(environment.sunDirection).normalize();
    this.lightingUniforms.voxelSunIntensity.value = Math.max(0, environment.sunIntensity);
    this.lightingUniforms.voxelBlockIntensity.value = Math.max(0, environment.blockIntensity ?? 1.35);
    this.lightingUniforms.voxelMinimumAmbient.value = Math.max(0, environment.minimumAmbient ?? 0.028);
  }

  /** Advances a shader uniform; no canvas redraw or full-atlas GPU upload occurs. */
  updateWaterAnimation(timeMilliseconds: number) {
    const frame = Math.floor(timeMilliseconds / 120);
    if (frame === this.waterAnimationFrame) return;
    this.waterAnimationFrame = frame;
    this.lightingUniforms.voxelWaterPhase.value = (frame % 16) / 16;
  }

  setRenderDistance(distance: number) {
    this.renderDistance = clamp(Math.round(distance), 2, 16);
    this.playerChunkX = Number.NaN;
  }

  setRetentionPadding(padding: number) {
    this.retentionPadding = clamp(Math.round(padding), 2, 6);
  }

  setStreamingBudgets(chunkGenerations: number, chunkMeshSections: number, frameMilliseconds?: number) {
    this.generationWorkPerFrame = clamp(Math.round(chunkGenerations), 1, 3);
    this.meshWorkPerFrame = clamp(Math.round(chunkMeshSections), 1, 8);
    // Count limits preserve adaptive throughput; this wall-clock guard keeps a
    // high-headroom burst from turning back into a long exploration frame.
    this.streamingFrameBudgetMilliseconds = clamp(
      frameMilliseconds ?? 5.5 + this.generationWorkPerFrame * 0.5 + this.meshWorkPerFrame * 0.25,
      2,
      10,
    );
  }

  reset(
    seedText: string,
    savedEdits?: ChunkEditSave,
    generationOptions?: Partial<WorldGenerationOptions>,
    savedFacings?: Readonly<Record<string, number>>,
    scope?: LocationStamp,
  ) {
    this.locationLoadEpoch += 1;
    if (scope) this.locationScope = validateLocationStamp(scope);
    // Drop old callbacks and their transferred buffers before admitting work
    // for a different owner, even when its seed and coordinates are identical.
    this.terrainGenerationPipeline.dispose();
    this.terrainBufferPipeline.dispose();
    this.terrainGenerationPipeline = new TerrainGenerationPipeline();
    this.terrainBufferPipeline = new TerrainBufferPipeline();
    this.disposeChunks();
    this.generationQueue = [];
    this.generationQueued.clear();
    this.generationEnqueuedAt.clear();
    this.activeGenerationTask = null;
    this.generationTasks.clear();
    this.lightInitializationQueue = [];
    this.lightInitializationQueueHead = 0;
    this.lightInitializationQueued.clear();
    this.lightInitializationEnqueuedAt.clear();
    this.activeLightInitialization = null;
    this.lightInitializationTasks.clear();
    this.lightReconciliationQueue = [];
    this.lightReconciliationQueued.clear();
    this.activeLightReconciliation = null;
    this.meshQueue = [];
    this.meshQueueHead = 0;
    this.meshQueued.clear();
    this.meshEnqueuedAt.clear();
    this.consolidationQueue = [];
    this.consolidationQueued.clear();
    this.consolidationEnqueuedAt.clear();
    this.consolidationRevision.clear();
    this.consolidationDirtyLayers.clear();
    this.pendingConsolidations.clear();
    this.completedConsolidations = [];
    this.staleConsolidations = 0;
    this.coalescedConsolidations = 0;
    this.invalidatedCombinedMeshes = 0;
    this.pendingWorkerGeneration.clear();
    this.completedWorkerGeneration = [];
    this.staleWorkerGeneration = 0;
    this.terrainGeometriesCreated = 0;
    this.terrainGeometriesDisposed = 0;
    this.liveTerrainGeometryBytes = 0;
    this.terrainGeometryBytes = new WeakMap();
    this.urgentMeshQueue = [];
    this.urgentMeshQueueHead = 0;
    this.urgentMeshQueued.clear();
    this.seamMeshRebuilds.clear();
    this.seamPresentationPending.clear();
    this.activeMeshTask = null;
    this.streamingCompleted = { generation: 0, lighting: 0, meshing: 0 };
    this.streamingCanceled = { generation: 0, lighting: 0, meshing: 0 };
    this.playerUnreadyStartedAt = null;
    this.playerReadinessEpisodes = [];
    this.pendingPersistentChunks.clear();
    this.persistentCacheHits = 0;
    this.persistentCacheMisses = 0;
    this.lightSectionQueue = [];
    this.lightSectionQueueHead = 0;
    this.lightSectionQueued.clear();
    this.lightSectionsPendingByChunk.clear();
    this.nextPlayerEditFeedbackId = 1;
    this.activePlayerEditFeedback = null;
    this.playerEditFeedbackRecords = [];
    this.playerEditConsolidationWaiters.clear();
    this.edits.clear();
    this.chunkEditSignatureCache.clear();
    this.mutationRevision = 0;
    this.structureMarkers.clear();
    this.settlementPlans.clear();
    this.settlementCandidateCache.clear();
    this.settlementValidatedCandidateCache.clear();
    this.surfaceRoadGraphCache.clear();
    this.surfaceRoadCache.clear();
    this.safeCaveEntranceCache.clear();
    this.settlementIndex.clear();
    this.hiddenChestVisuals.clear();
    this.blockFacings.clear();
    this.seedText = seedText || "WILDERNESS";
    this.seed = seedToInt(this.seedText);
    const address = parseLocationId(this.locationScope.locationId);
    this.celestialTerrain = createCelestialTerrain({ location: address, seed: celestialTerrainSeed(this.seedText) });
    if (!this.celestialTerrain && !(address.bodyId === "blockwild" && address.kind === "surface")) throw Error("This destination has no supported terrain generator.");
    this.generationOptions = normalizeWorldGenerationOptions(generationOptions);
    this.chunkMemoryCache.clear();
    this.playerChunkX = Number.NaN;
    this.playerChunkZ = Number.NaN;
    this.playerSection = sectionForY(0);
    this.scheduledViewSector = Number.NaN;
    if (savedEdits) {
      for (const [key, pairs] of Object.entries(savedEdits)) {
        const map = new Map<number, BlockId>();
        for (const [index, type] of pairs) map.set(index, type as BlockId);
        this.edits.set(key, map);
      }
    }
    if (savedFacings) {
      for (const [key, rawFacing] of Object.entries(savedFacings).slice(0, 65_536)) {
        if (!/^-?\d+,-?\d+,-?\d+$/u.test(key)) continue;
        const facing = normalizeBlockFacing(rawFacing);
        if (facing !== BLOCK_FACING_NORTH) this.blockFacings.set(key, facing);
      }
    }
  }

  blockFacingAt(x: number, y: number, z: number): BlockFacing {
    return this.blockFacings.get(`${Math.trunc(x)},${Math.trunc(y)},${Math.trunc(z)}`) ?? BLOCK_FACING_NORTH;
  }

  setBlockFacing(x: number, y: number, z: number, facing: BlockFacing, immediate = false) {
    const key = `${Math.trunc(x)},${Math.trunc(y)},${Math.trunc(z)}`;
    const normalized = normalizeBlockFacing(facing);
    const previous = this.blockFacings.get(key) ?? BLOCK_FACING_NORTH;
    if (previous === normalized) return false;
    if (normalized === BLOCK_FACING_NORTH) this.blockFacings.delete(key);
    else this.blockFacings.set(key, normalized);
    const sx = splitCoordinate(x);
    const sz = splitCoordinate(z);
    this.markPlayerEditMutation();
    const type = this.getBlock(x, y, z) ?? BlockId.Air;
    const affectedLayers = this.renderLayersAffectedByEdit(x, y, z, type, type);
    this.refreshEditedBlock(sx.chunk, sz.chunk, sx.local, y, sz.local, immediate, affectedLayers);
    if (immediate) this.markPlayerEditLocalMeshVisible();
    return true;
  }

  serializeBlockFacings() {
    return Object.fromEntries(this.blockFacings.entries());
  }

  serializeSurfaceRoadGraph() {
    return Object.fromEntries([...this.surfaceRoadGraphCache.entries()].map(([region, edges]) => [region, edges.map((edge) => ({
      ...edge,
      from: { ...edge.from },
      to: { ...edge.to },
    }))]));
  }

  restoreSurfaceRoadGraph(value: unknown) {
    if (!value || typeof value !== "object") return;
    for (const [region, rawEdges] of Object.entries(value as Record<string, unknown>)) {
      if (!/^(?:roads|heartroads):-?\d+,-?\d+$/u.test(region) || !Array.isArray(rawEdges)) continue;
      const edges = rawEdges.flatMap((raw): RoadEdge[] => {
        if (!raw || typeof raw !== "object") return [];
        const edge = raw as Partial<RoadEdge>;
        if (typeof edge.id !== "string" || !edge.from || !edge.to
          || !Number.isFinite(edge.from.x) || !Number.isFinite(edge.from.z)
          || !Number.isFinite(edge.to.x) || !Number.isFinite(edge.to.z)) return [];
        return [Object.freeze({
          id: edge.id.slice(0, 256),
          from: Object.freeze({ ...edge.from }),
          to: Object.freeze({ ...edge.to }),
          length: Math.max(0, Number(edge.length) || Math.hypot(edge.to.x - edge.from.x, edge.to.z - edge.from.z)),
          loop: Boolean(edge.loop),
          ...(edge.tier === "local" || edge.tier === "regional" || edge.tier === "trunk" ? { tier: edge.tier } : {}),
          ...(typeof edge.ownerProvinceId === "string" ? { ownerProvinceId: edge.ownerProvinceId.slice(0, 128) } : {}),
        })];
      }).slice(0, 96);
      if (edges.length) this.surfaceRoadGraphCache.set(region, Object.freeze(edges));
    }
  }

  initializeAround(x: number, z: number) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    for (let radius = 0; radius <= 1; radius += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) for (let dz = -radius; dz <= radius; dz += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        this.generateChunk(cx + dx, cz + dz);
      }
    }
    for (const chunk of this.chunks.values()) for (let section = 0; section < SECTION_COUNT; section += 1) this.rebuildSection(chunk, section);
    this.scheduleAround(x, z, true);
  }

  update(x: number, z: number, y?: number, velocityX = 0, velocityZ = 0): ChunkWorkFrameReport {
    let schedulingMilliseconds = 0;
    let generationMilliseconds = 0;
    let lightingMilliseconds = 0;
    let meshingMilliseconds = 0;
    let installationMilliseconds = 0;
    let generationSlices = 0;
    let lightingSlices = 0;
    let meshSlices = 0;
    let installationSlices = 0;
    this.frame += 1;
    const streamingStartedAt = performance.now();
    this.releaseOrphanedSeamPresentationBlockers();
    schedulingMilliseconds += performance.now() - streamingStartedAt;
    const deadline = streamingStartedAt + this.streamingFrameBudgetMilliseconds;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const speed = Math.hypot(velocityX, velocityZ);
    const lookaheadChunks = speed > 0.5 ? clamp(Math.ceil(speed * 1.75 / CHUNK_SIZE), 1, 6) : 0;
    this.streamingLookaheadChunkX = lookaheadChunks ? Math.round(velocityX / speed * lookaheadChunks) : 0;
    this.streamingLookaheadChunkZ = lookaheadChunks ? Math.round(velocityZ / speed * lookaheadChunks) : 0;
    const focusSection = Number.isFinite(y) ? clamp(sectionForY(y!), 0, SECTION_COUNT - 1) : this.playerSection;
    if (cx !== this.playerChunkX || cz !== this.playerChunkZ || focusSection !== this.playerSection
      || this.streamingViewSector !== this.scheduledViewSector || this.frame % 180 === 0) {
      const startedAt = performance.now();
      this.scheduleAround(x, z, false, y);
      schedulingMilliseconds += performance.now() - startedAt;
    }
    // A missing player chunk is a correctness problem, not ordinary backlog.
    // Spend the bounded frame allowance on its next required stage and follow
    // stage transitions immediately (terrain -> light -> local-height mesh).
    // Once it is drawable, the fair background rotation below resumes.
    let completedWork = false;
    for (let pass = 0; pass < 64 && (!completedWork || performance.now() < deadline); pass += 1) {
      const stage = this.playerChunkStreamingState().playerChunkStage;
      if (stage === "ready") break;
      const startedAt = performance.now();
      if (stage === "generation") {
        if (!this.processGenerationSlice()) break;
        generationMilliseconds += performance.now() - startedAt;
        generationSlices += 1;
      } else if (stage === "lighting") {
        const currentKey = chunkKey(this.playerChunkX, this.playerChunkZ);
        const processed = this.lightReconciliationQueued.has(currentKey) || this.activeLightReconciliation?.key === currentKey
          ? this.processLightReconciliation()
          : this.processLightInitialization();
        if (!processed) break;
        lightingMilliseconds += performance.now() - startedAt;
        lightingSlices += 1;
      } else {
        this.ensurePlayerChunkMeshQueue();
        if (!this.processMesh(chunkKey(this.playerChunkX, this.playerChunkZ))) break;
        meshingMilliseconds += performance.now() - startedAt;
        meshSlices += 1;
      }
      completedWork = true;
    }
    // Correctness lane B: keep the full immediate ring warm, not merely the
    // occupied chunk. A small reserve survives an exhausted background budget
    // so crossing a seam does not begin a multi-stage repair from zero.
    const immediateRingDeadline = Math.max(deadline, performance.now() + 0.65);
    for (let pass = 0; pass < 1 && performance.now() < immediateRingDeadline; pass += 1) {
      const work = this.immediateRingWorkState();
      if (!work) break;
      const startedAt = performance.now();
      if (work.stage === "generation") {
        if (!this.processGenerationSlice(work.key)) break;
        generationMilliseconds += performance.now() - startedAt;
        generationSlices += 1;
      } else if (work.stage === "lighting") {
        const processed = this.lightReconciliationQueued.has(work.key) || this.activeLightReconciliation?.key === work.key
          ? this.processLightReconciliation(work.key)
          : this.processLightInitialization(work.key);
        if (!processed) break;
        lightingMilliseconds += performance.now() - startedAt;
        lightingSlices += 1;
      } else {
        this.ensurePlayerChunkMeshQueue(work.key);
        if (!this.processMesh(work.key)) break;
        meshingMilliseconds += performance.now() - startedAt;
        meshSlices += 1;
      }
      completedWork = true;
    }
    // Round-robin the four streaming categories. The start category rotates
    // each frame, so a single unusually dense terrain/light/mesh slice cannot
    // starve the other queues when it consumes the remaining time budget.
    const remaining = [
      this.generationWorkPerFrame,
      this.meshWorkPerFrame * 2,
      Math.max(1, Math.ceil(this.meshWorkPerFrame / 2)),
      this.meshWorkPerFrame * 2,
    ];
    let cursor = this.frame % remaining.length;
    while (remaining.some((count) => count > 0) && (!completedWork || performance.now() < deadline)) {
      let foundWork = false;
      for (let offset = 0; offset < remaining.length; offset += 1) {
        const category = (cursor + offset) % remaining.length;
        if (remaining[category] <= 0) continue;
        remaining[category] -= 1;
        const startedAt = performance.now();
        if (category === 0) {
          const processed = this.processGenerationSlice();
          generationMilliseconds += performance.now() - startedAt;
          if (!processed) continue;
          generationSlices += 1;
        } else if (category === 1) {
          const processed = this.processLightingSlice();
          lightingMilliseconds += performance.now() - startedAt;
          if (!processed) continue;
          lightingSlices += 1;
        } else if (category === 2) {
          if (this.lightSectionQueued.size === 0) continue;
          this.processLightSection();
          lightingMilliseconds += performance.now() - startedAt;
          lightingSlices += 1;
        } else {
          const processed = this.processMesh();
          meshingMilliseconds += performance.now() - startedAt;
          if (!processed) continue;
          meshSlices += 1;
        }
        cursor = (category + 1) % remaining.length;
        completedWork = true;
        foundWork = true;
        break;
      }
      if (!foundWork) break;
    }
    const consolidationPressure = this.renderDrawCallPressure >= 300
      || this.renderFramePressureMilliseconds >= 24
      || this.consolidationQueue.length >= 48
      || this.completedConsolidations.length > 0;
    const consolidationDeadline = consolidationPressure
      ? Math.max(deadline, performance.now() + 0.75)
      : deadline;
    const consolidationLimit = consolidationPressure ? Math.max(2, this.meshWorkPerFrame) : this.meshWorkPerFrame;
    for (let index = 0; index < consolidationLimit && performance.now() < consolidationDeadline; index += 1) {
      const startedAt = performance.now();
      if (!this.processConsolidation()) break;
      installationSlices += 1;
      installationMilliseconds += performance.now() - startedAt;
    }
    this.recordPlayerReadiness(performance.now());
    return {
      schedulingMilliseconds,
      generationMilliseconds,
      lightingMilliseconds,
      meshingMilliseconds,
      installationMilliseconds,
      generationSlices,
      lightingSlices,
      meshSlices,
      installationSlices,
    };
  }

  scheduleAround(x: number, z: number, force = false, y?: number) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const focusSection = Number.isFinite(y) ? clamp(sectionForY(y!), 0, SECTION_COUNT - 1) : this.playerSection;
    if (!force && cx === this.playerChunkX && cz === this.playerChunkZ && focusSection === this.playerSection
      && this.streamingViewSector === this.scheduledViewSector) return;
    this.playerChunkX = cx;
    this.playerChunkZ = cz;
    this.playerSection = focusSection;
    this.scheduledViewSector = this.streamingViewSector;
    const generationRadius = this.renderDistance + 1;
    const radialStreaming = this.renderDistance > RADIAL_STREAMING_DISTANCE_THRESHOLD;
    const withinGenerationWindow = (offsetX: number, offsetZ: number) => chunkWithinDirectionalStreamingWindow(
      offsetX,
      offsetZ,
      generationRadius,
      radialStreaming,
      this.streamingViewX,
      this.streamingViewZ,
    );
    const currentKey = chunkKey(cx, cz);
    if (this.activeGenerationTask) {
      const active = this.activeGenerationTask;
      const activeIsRetained = withinGenerationWindow(active.cx - cx, active.cz - cz);
      const currentNeedsGeneration = !this.chunks.has(currentKey) && active.key !== currentKey;
      if (!activeIsRetained || currentNeedsGeneration) {
        if (!activeIsRetained) {
          this.generationQueued.delete(active.key);
          this.generationEnqueuedAt.delete(active.key);
          this.generationTasks.delete(active.key);
          this.streamingCanceled.generation += 1;
        }
        this.activeGenerationTask = null;
      }
    }
    this.generationQueue = this.generationQueue
      .filter((entry) => {
        const key = chunkKey(entry.cx, entry.cz);
        return key !== this.activeGenerationTask?.key
          && !this.chunks.has(key)
          && withinGenerationWindow(entry.cx - cx, entry.cz - cz);
      })
      .map((entry) => ({ ...entry, distance: chunkStreamingSortDistance(entry.cx - cx, entry.cz - cz, radialStreaming) }));
    for (const [key, task] of this.generationTasks) {
      if (key === this.activeGenerationTask?.key) continue;
      if (this.chunks.has(key) || !withinGenerationWindow(task.cx - cx, task.cz - cz)) {
        this.generationTasks.delete(key);
      }
    }
    this.generationQueued = new Set([
      ...this.generationQueue.map((entry) => chunkKey(entry.cx, entry.cz)),
      ...(this.activeGenerationTask ? [this.activeGenerationTask.key] : []),
      ...this.pendingWorkerGeneration,
    ]);
    for (const key of [...this.generationEnqueuedAt.keys()]) {
      if (this.generationQueued.has(key)) continue;
      this.generationEnqueuedAt.delete(key);
      this.streamingCanceled.generation += 1;
    }
    const activeMeshQueued = this.meshQueued;
    const seenMeshEntries = new Set<string>();
    this.meshQueue = this.meshQueue.slice(this.meshQueueHead).filter((entry) => {
      const queueKey = `${entry.key}:${entry.section}`;
      if (!activeMeshQueued.has(queueKey) || seenMeshEntries.has(queueKey)) return false;
      const chunk = this.chunks.get(entry.key);
      if (!chunk) return false;
      if (!chunkWithinStreamingRadius(chunk.cx - cx, chunk.cz - cz, this.renderDistance, radialStreaming)) return false;
      seenMeshEntries.add(queueKey);
      return true;
    });
    this.meshQueueHead = 0;
    this.meshQueued = new Set(this.meshQueue.map((entry) => `${entry.key}:${entry.section}`));
    const activeUrgentMeshQueued = this.urgentMeshQueued;
    const seenUrgentMeshEntries = new Set<string>();
    this.urgentMeshQueue = this.urgentMeshQueue.slice(this.urgentMeshQueueHead).filter((entry) => {
      const queueKey = `${entry.key}:${entry.section}`;
      if (!activeUrgentMeshQueued.has(queueKey) || seenUrgentMeshEntries.has(queueKey)) return false;
      const chunk = this.chunks.get(entry.key);
      if (!chunk) return false;
      if (!chunkWithinStreamingRadius(chunk.cx - cx, chunk.cz - cz, this.renderDistance, radialStreaming)) return false;
      seenUrgentMeshEntries.add(queueKey);
      return true;
    });
    this.urgentMeshQueueHead = 0;
    this.urgentMeshQueued = new Set(this.urgentMeshQueue.map((entry) => `${entry.key}:${entry.section}`));
    const activeMeshQueueKey = this.activeMeshTask ? `${this.activeMeshTask.key}:${this.activeMeshTask.section}` : null;
    for (const queueKey of [...this.meshEnqueuedAt.keys()]) {
      if (queueKey === activeMeshQueueKey || this.meshQueued.has(queueKey) || this.urgentMeshQueued.has(queueKey)) continue;
      this.meshEnqueuedAt.delete(queueKey);
      this.streamingCanceled.meshing += 1;
    }
    for (let dx = -generationRadius; dx <= generationRadius; dx += 1) {
      for (let dz = -generationRadius; dz <= generationRadius; dz += 1) {
        if (!withinGenerationWindow(dx, dz)) continue;
        const key = chunkKey(cx + dx, cz + dz);
        const distance = chunkStreamingSortDistance(dx, dz, radialStreaming);
        let chunk = this.chunks.get(key);
        if (!chunk) {
          const cacheKey = this.chunkCacheKey(key);
          if (this.chunkMemoryCache.has(cacheKey)) {
            const cached = this.chunkMemoryCache.take(cacheKey);
            if (cached) chunk = this.restoreCachedChunk(cached);
          }
        }
        if (!chunk && key !== this.activeGenerationTask?.key && !this.generationQueued.has(key)) {
          if (distance <= 2 && this.requestPersistentChunk(key, cx + dx, cz + dz, distance)) continue;
          this.generationQueue.push({ cx: cx + dx, cz: cz + dz, distance });
          this.generationQueued.add(key);
          this.generationEnqueuedAt.set(key, performance.now());
        } else if (chunk && chunkWithinStreamingRadius(dx, dz, this.renderDistance, radialStreaming)) {
          chunk.group.visible = true;
          if (!chunk.lightInitialized) this.queueLightInitialization(key);
          else if (this.chunkLightPresentationReady(key)) for (let section = 0; section < SECTION_COUNT; section += 1) {
            if (this.seamPresentationPending.has(`${key}:${section}`)) continue;
            if (chunk.dirty.has(section) || (!chunk.sections.has(section) && chunk.sectionBlockCounts[section] > 0)) this.queueMesh(key, section);
          }
        }
      }
    }
    const generationPriority = (entry: Readonly<{ cx: number; cz: number }>) => {
      const key = chunkKey(entry.cx, entry.cz);
      return this.agedStreamingPriority(
        this.coordinateStreamingPriority(entry.cx, entry.cz),
        this.generationEnqueuedAt.get(key),
      );
    };
    // processGenerationSlice pops from the end, so keep the strongest item
    // last while preserving deterministic coordinate ties.
    this.generationQueue.sort((a, b) => generationPriority(b) - generationPriority(a)
      || b.cx - a.cx || b.cz - a.cz);
    this.sortMeshQueues();
    this.preemptMeshForPlayer();

    const retainRadius = this.renderDistance + this.retentionPadding;
    for (const [key, chunk] of this.chunks.entries()) {
      const offsetX = chunk.cx - cx;
      const offsetZ = chunk.cz - cz;
      if (!chunkWithinStreamingRadius(offsetX, offsetZ, retainRadius, radialStreaming)) this.unloadChunk(key);
      else chunk.group.visible = chunkWithinStreamingRadius(offsetX, offsetZ, this.renderDistance, radialStreaming);
    }
    this.reprioritizeLightInitialization();
    if (this.activeMeshTask && !this.chunks.get(this.activeMeshTask.key)?.group.visible) this.activeMeshTask = null;
  }

  private coordinateStreamingPriority(cx: number, cz: number) {
    const radialStreaming = this.renderDistance > RADIAL_STREAMING_DISTANCE_THRESHOLD;
    const dx = cx - this.playerChunkX;
    const dz = cz - this.playerChunkZ;
    const base = chunkStreamingSortDistance(dx, dz, radialStreaming);
    const lookahead = chunkStreamingSortDistance(
      dx - this.streamingLookaheadChunkX,
      dz - this.streamingLookaheadChunkZ,
      radialStreaming,
    );
    const length = Math.hypot(dx, dz);
    const cameraDot = length > 1e-6 ? (dx * this.streamingViewX + dz * this.streamingViewZ) / length : 1;
    const cameraBias = cameraDot >= 0
      ? -Math.min(1.2, base * 0.22) * cameraDot
      : Math.min(0.45, base * 0.08) * -cameraDot;
    return Math.max(0, base + Math.min(0, lookahead - base) * 0.5 + cameraBias);
  }

  private chunkStreamingPriority(key: string) {
    const chunk = this.chunks.get(key);
    return chunk ? this.coordinateStreamingPriority(chunk.cx, chunk.cz) : Number.POSITIVE_INFINITY;
  }

  /**
   * Valid nearby work gains bounded priority after four seconds. It can pass
   * newer mid-ring work, but never the occupied chunk or immediate ring.
   */
  private agedStreamingPriority(base: number, enqueuedAt: number | undefined, now = performance.now()) {
    if (!Number.isFinite(base) || base <= 1 || enqueuedAt === undefined) return base;
    const promotion = Math.max(0, now - enqueuedAt - 4_000) / 8_000;
    return Math.max(1.05, base - promotion);
  }

  private compareMeshPriority(
    left: Readonly<{ key: string; section: number }>,
    right: Readonly<{ key: string; section: number }>,
  ) {
    const leftChunk = this.chunks.get(left.key);
    const rightChunk = this.chunks.get(right.key);
    const now = performance.now();
    const leftPriority = this.agedStreamingPriority(
      this.chunkStreamingPriority(left.key),
      this.meshEnqueuedAt.get(`${left.key}:${left.section}`),
      now,
    );
    const rightPriority = this.agedStreamingPriority(
      this.chunkStreamingPriority(right.key),
      this.meshEnqueuedAt.get(`${right.key}:${right.section}`),
      now,
    );
    const distanceDifference = leftPriority - rightPriority;
    return distanceDifference
      || Math.abs(left.section - this.playerSection) - Math.abs(right.section - this.playerSection)
      || (leftChunk?.cx ?? Infinity) - (rightChunk?.cx ?? Infinity)
      || (leftChunk?.cz ?? Infinity) - (rightChunk?.cz ?? Infinity)
      || left.section - right.section;
  }

  private sortMeshQueues() {
    this.meshQueue = this.meshQueue.slice(this.meshQueueHead)
      .filter((entry) => this.meshQueued.has(`${entry.key}:${entry.section}`))
      .sort((left, right) => this.compareMeshPriority(left, right));
    this.meshQueueHead = 0;
    this.urgentMeshQueue = this.urgentMeshQueue.slice(this.urgentMeshQueueHead)
      .filter((entry) => this.urgentMeshQueued.has(`${entry.key}:${entry.section}`))
      .sort((left, right) => this.compareMeshPriority(left, right));
    this.urgentMeshQueueHead = 0;
  }

  private preemptMeshForPlayer() {
    const active = this.activeMeshTask;
    if (!active) return;
    const currentKey = chunkKey(this.playerChunkX, this.playerChunkZ);
    const candidates = [...this.urgentMeshQueue.slice(this.urgentMeshQueueHead), ...this.meshQueue.slice(this.meshQueueHead)]
      .filter((entry) => entry.key === currentKey
        && (this.urgentMeshQueued.has(`${entry.key}:${entry.section}`) || this.meshQueued.has(`${entry.key}:${entry.section}`)));
    const best = candidates.sort((left, right) => this.compareMeshPriority(left, right))[0];
    if (!best || this.compareMeshPriority(best, active) >= 0) return;
    this.activeMeshTask = null;
    this.queueMesh(active.key, active.section);
  }

  private reprioritizeLightInitialization() {
    const currentKey = chunkKey(this.playerChunkX, this.playerChunkZ);
    if (this.activeLightInitialization
      && this.activeLightInitialization.key !== currentKey
      && this.lightInitializationQueued.has(currentKey)) {
      this.lightInitializationQueue.push(this.activeLightInitialization.key);
      this.activeLightInitialization = null;
    }
    const candidates: string[] = [];
    for (const key of this.lightInitializationQueued) {
      if (key === this.activeLightInitialization?.key) continue;
      const chunk = this.chunks.get(key);
      if (!chunk || !chunk.group.visible || chunk.lightInitialized) {
        this.lightInitializationQueued.delete(key);
        this.lightInitializationEnqueuedAt.delete(key);
        this.lightInitializationTasks.delete(key);
        continue;
      }
      candidates.push(key);
    }
    candidates.sort((left, right) => this.agedStreamingPriority(
      this.chunkStreamingPriority(left),
      this.lightInitializationEnqueuedAt.get(left),
    ) - this.agedStreamingPriority(
      this.chunkStreamingPriority(right),
      this.lightInitializationEnqueuedAt.get(right),
    ) || left.localeCompare(right));
    this.lightInitializationQueue = candidates;
    this.lightInitializationQueueHead = 0;
  }

  private prepareGeneratedChunk(chunk: Chunk) {
    this.setChunkStreamingVisibility(chunk);
    if (!chunk.lightInitialized) {
      if (chunk.group.visible) this.queueLightInitialization(chunk.key);
      return;
    }
    if (this.chunkLightPresentationReady(chunk.key)) this.queueChunkMeshesAndSeams(chunk);
  }

  private setChunkStreamingVisibility(chunk: Chunk) {
    const offsetX = chunk.cx - this.playerChunkX;
    const offsetZ = chunk.cz - this.playerChunkZ;
    const radialStreaming = this.renderDistance > RADIAL_STREAMING_DISTANCE_THRESHOLD;
    chunk.group.visible = chunkWithinStreamingRadius(offsetX, offsetZ, this.renderDistance, radialStreaming);
  }

  private chunkLightPresentationReady(key: string) {
    const chunk = this.chunks.get(key);
    return Boolean(chunk?.lightInitialized)
      && !this.lightReconciliationQueued.has(key)
      && this.activeLightReconciliation?.key !== key;
  }

  private chunkEditSignature(key: string) {
    const cached = this.chunkEditSignatureCache.get(key);
    if (cached !== undefined) return cached;
    const edits = this.edits.get(key);
    if (!edits?.size) {
      this.chunkEditSignatureCache.set(key, "0");
      return "0";
    }
    let hash = 0x811c9dc5;
    for (const [index, type] of [...edits].sort((left, right) => left[0] - right[0])) {
      hash = Math.imul(hash ^ index, 0x01000193) >>> 0;
      hash = Math.imul(hash ^ type, 0x01000193) >>> 0;
    }
    const signature = hash.toString(36);
    this.chunkEditSignatureCache.set(key, signature);
    return signature;
  }

  private chunkCacheKey(key: string) {
    // Generated terrain is disposable, while player edits are not. Including
    // the generator version prevents a persistent v17 chunk from being
    // restored beside a freshly generated v18 neighbor after an update. That
    // mixed-generation boundary was the source of terrain, grass, and liquid
    // discontinuities that could otherwise survive indefinitely in a save.
    // v4 adds semantic structure markers to worker/cache payloads. Invalidating
    // older voxel-only records is required: their buildings still exist, but
    // their POIs, chests, residents, and encounters cannot be rediscovered.
    // v5 also includes the one-chunk edit halo. Edge faces, corner occlusion,
    // and propagated light are neighbor-dependent; restoring a chunk cached
    // before an adjacent torch/wall/water edit could otherwise reintroduce a
    // stale bright or dark stripe until another full lighting mutation.
    const [cx, cz] = key.split(",").map(Number);
    const editHalo = Array.from({ length: 9 }, (_, index) => {
      const dx = index % 3 - 1;
      const dz = Math.floor(index / 3) - 1;
      return this.chunkEditSignature(chunkKey(cx + dx, cz + dz));
    }).join(".");
    return `terrain-location-v1|${this.locationScope.locationId}|g${GENERATOR_VERSION}|${this.seedText}|${JSON.stringify(this.generationOptions)}|${key}|${editHalo}`;
  }

  private generationNamespace(key: string) { return `${this.locationLoadEpoch}|${this.chunkCacheKey(key)}`; }

  private structureMarkerEntriesForChunk(cx: number, cz: number) {
    return [...this.structureMarkers.entries()].filter(([, marker]) => (
      Math.floor(marker.position.x / CHUNK_SIZE) === cx
      && Math.floor(marker.position.z / CHUNK_SIZE) === cz
    ));
  }

  private restoreStructureMarkerEntries(entries: readonly (readonly [string, StructureMarker])[]) {
    for (const [key, marker] of entries) this.structureMarkers.set(key, marker);
  }

  private cachedChunkData(chunk: Chunk): CachedChunkData {
    return {
      cacheKey: this.chunkCacheKey(chunk.key),
      key: chunk.key,
      cx: chunk.cx,
      cz: chunk.cz,
      blocks: chunk.blocks,
      heightmap: chunk.heightmap,
      biomes: chunk.biomes,
      sectionBlockCounts: chunk.sectionBlockCounts,
      skyTops: chunk.skyTops,
      light: chunk.light,
      lightInitialized: chunk.lightInitialized,
      lightIndices: [...chunk.lightIndices],
      leafIndices: [...chunk.leafIndices],
      structureMarkers: this.structureMarkerEntriesForChunk(chunk.cx, chunk.cz),
    };
  }

  private restoreCachedChunk(data: CachedChunkData) {
    if (data.cacheKey !== this.chunkCacheKey(data.key) || this.chunks.has(data.key)) return undefined;
    const chunk: Chunk = {
      key: data.key,
      cx: data.cx,
      cz: data.cz,
      blocks: data.blocks,
      heightmap: data.heightmap,
      biomes: data.biomes,
      group: new THREE.Group(),
      sections: new Map(),
      combinedMeshes: {},
      dirty: new Set(),
      sectionBlockCounts: data.sectionBlockCounts,
      skyTops: data.skyTops,
      light: data.light,
      lightInitialized: data.lightInitialized,
      lightIndices: new Set(data.lightIndices),
      leafIndices: new Set(data.leafIndices),
    };
    chunk.group.position.set(chunk.cx * CHUNK_SIZE, 0, chunk.cz * CHUNK_SIZE);
    this.chunks.set(chunk.key, chunk);
    this.group.add(chunk.group);
    this.freezeTerrainTransform(chunk.group);
    this.restoreStructureMarkerEntries(data.structureMarkers);
    this.setChunkStreamingVisibility(chunk);
    if (chunk.lightInitialized) this.queueLightReconciliation(chunk);
    else this.prepareGeneratedChunk(chunk);
    return chunk;
  }

  private requestPersistentChunk(key: string, cx: number, cz: number, distance: number) {
    const cacheKey = this.chunkCacheKey(key);
    const ownerEpoch = this.locationLoadEpoch;
    if (!this.chunkPersistentCache.supported || this.pendingPersistentChunks.has(cacheKey)) return false;
    const queueGenerationFallback = () => {
      if (ownerEpoch !== this.locationLoadEpoch || cacheKey !== this.chunkCacheKey(key) || this.chunks.has(key)) return;
      const radialStreaming = this.renderDistance > RADIAL_STREAMING_DISTANCE_THRESHOLD;
      if (!chunkWithinStreamingRadius(cx - this.playerChunkX, cz - this.playerChunkZ, this.renderDistance + 1, radialStreaming)) return;
      if (this.generationQueued.has(key) || this.activeGenerationTask?.key === key) return;
      this.generationQueue.push({ cx, cz, distance });
      this.generationQueued.add(key);
      this.generationEnqueuedAt.set(key, performance.now());
      this.generationQueue.sort((left, right) => right.distance - left.distance || right.cx - left.cx || right.cz - left.cz);
    };
    this.pendingPersistentChunks.add(cacheKey);
    void this.chunkPersistentCache.get(cacheKey).then((data) => {
      if (ownerEpoch !== this.locationLoadEpoch) return;
      this.pendingPersistentChunks.delete(cacheKey);
      if (cacheKey !== this.chunkCacheKey(key) || this.chunks.has(key)) return;
      if (data) {
        this.persistentCacheHits += 1;
        this.restoreCachedChunk(data);
        return;
      }
      this.persistentCacheMisses += 1;
      queueGenerationFallback();
    }).catch(() => {
      if (ownerEpoch !== this.locationLoadEpoch) return;
      this.pendingPersistentChunks.delete(cacheKey);
      this.persistentCacheMisses += 1;
      queueGenerationFallback();
    });
    return true;
  }

  private queueChunkMeshesAndSeams(chunk: Chunk) {
    if (!this.chunkLightPresentationReady(chunk.key)) return;
    const blockersBySection = Array.from({ length: SECTION_COUNT }, () => new Set<string>());
    // A hidden generation-halo chunk still changes face visibility at the seam
    // of an already rendered neighbor. Rebuild only that visible neighbor; the
    // halo itself remains unmeshed until it enters render distance.
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const neighbor = this.chunks.get(chunkKey(chunk.cx + dx, chunk.cz + dz));
      if (!neighbor || !neighbor.group.visible || !neighbor.lightInitialized) continue;
      for (let section = 0; section < SECTION_COUNT; section += 1) {
        const sectionWasBuilt = neighbor.sections.has(section);
        const sectionIsBuilding = this.activeMeshTask?.key === neighbor.key && this.activeMeshTask.section === section;
        if (neighbor.sectionBlockCounts[section] > 0 && (sectionWasBuilt || sectionIsBuilding)) {
          // Cross-chunk faces are speculative only until the generation halo
          // exists. Reconcile them ahead of ordinary background meshing so a
          // water wall, grass slit, or solid-block crack cannot linger while
          // the player is already looking at the boundary.
          const blocker = `${neighbor.key}:${section}`;
          this.seamMeshRebuilds.add(blocker);
          this.queueMesh(neighbor.key, section, true);
          blockersBySection[section].add(blocker);
        }
      }
    }
    if (chunk.group.visible) {
      const immediate = Math.max(Math.abs(chunk.cx - this.playerChunkX), Math.abs(chunk.cz - this.playerChunkZ)) <= 1;
      const required = immediate ? new Set(this.playerRequiredMeshSections(chunk)) : null;
      for (let section = 0; section < SECTION_COUNT; section += 1) {
        if (chunk.sectionBlockCounts[section] <= 0) continue;
        const queueKey = `${chunk.key}:${section}`;
        const blockers = blockersBySection[section];
        if (blockers.size > 0) {
          // Present the two sides as one atomic section transition. The old
          // neighbor stays intact while its speculative edge is rebuilt; the
          // arriving section becomes mesh-eligible only after every matching
          // edge replacement is installed.
          this.seamPresentationPending.set(queueKey, {
            key: chunk.key,
            section,
            urgent: Boolean(required?.has(section)),
            blockers,
          });
          continue;
        }
        this.queueMesh(chunk.key, section, Boolean(required?.has(section)));
      }
    }
    this.preemptMeshForPlayer();
  }

  private releaseSeamPresentationBlocker(blocker: string) {
    for (const [queueKey, pending] of this.seamPresentationPending) {
      if (!pending.blockers.delete(blocker) || pending.blockers.size > 0) continue;
      this.seamPresentationPending.delete(queueKey);
      const chunk = this.chunks.get(pending.key);
      if (!chunk?.group.visible || !this.chunkLightPresentationReady(pending.key)) continue;
      this.queueMesh(pending.key, pending.section, pending.urgent);
    }
  }

  private releaseOrphanedSeamPresentationBlockers() {
    if (this.seamPresentationPending.size === 0) return;
    const active = this.activeMeshTask ? `${this.activeMeshTask.key}:${this.activeMeshTask.section}` : null;
    const blockers = new Set<string>();
    for (const pending of this.seamPresentationPending.values()) for (const blocker of pending.blockers) blockers.add(blocker);
    for (const blocker of blockers) {
      const owned = this.meshQueued.has(blocker) || this.urgentMeshQueued.has(blocker) || active === blocker;
      if (this.seamMeshRebuilds.has(blocker) && owned) continue;
      this.seamMeshRebuilds.delete(blocker);
      this.releaseSeamPresentationBlocker(blocker);
    }
  }

  processGeneration() {
    if (this.activeGenerationTask) {
      const task = this.activeGenerationTask;
      this.activeGenerationTask = null;
      const chunk = this.completeChunkGenerationSynchronously(task);
      this.generationTasks.delete(task.key);
      this.prepareGeneratedChunk(chunk);
      return chunk;
    }
    const next = this.generationQueue.pop();
    if (!next) return;
    const key = chunkKey(next.cx, next.cz);
    this.generationQueued.delete(key);
    this.generationEnqueuedAt.delete(key);
    if (this.chunks.has(key)) return;
    const task = this.generationTasks.get(key);
    const chunk = task ? this.completeChunkGenerationSynchronously(task) : this.generateChunk(next.cx, next.cz);
    this.generationTasks.delete(key);
    this.prepareGeneratedChunk(chunk);
    return chunk;
  }

  private takeQueuedGeneration(preferredKey?: string) {
    if (!preferredKey) return this.generationQueue.pop();
    const index = this.generationQueue.findIndex((entry) => chunkKey(entry.cx, entry.cz) === preferredKey);
    if (index < 0) return undefined;
    return this.generationQueue.splice(index, 1)[0];
  }

  processGenerationSlice(preferredKey?: string) {
    if (this.terrainGenerationPipeline.supported) {
      const completedIndex = preferredKey
        ? this.completedWorkerGeneration.findIndex((entry) => entry.key === preferredKey)
        : (this.completedWorkerGeneration.length ? 0 : -1);
      const completed = completedIndex >= 0 ? this.completedWorkerGeneration.splice(completedIndex, 1)[0] : undefined;
      if (completed) {
        this.pendingWorkerGeneration.delete(completed.key);
        const radialStreaming = this.renderDistance > RADIAL_STREAMING_DISTANCE_THRESHOLD;
        const retained = chunkWithinStreamingRadius(
          completed.cx - this.playerChunkX,
          completed.cz - this.playerChunkZ,
          this.renderDistance + 1,
          radialStreaming,
        );
        if (completed.namespace !== this.generationNamespace(completed.key) || !retained || this.chunks.has(completed.key)) {
          this.generationQueued.delete(completed.key);
          this.generationEnqueuedAt.delete(completed.key);
          this.staleWorkerGeneration += 1;
          return true;
        }
        const chunk: Chunk = {
          key: completed.key,
          cx: completed.cx,
          cz: completed.cz,
          blocks: completed.blocks,
          heightmap: completed.heightmap,
          biomes: completed.biomes,
          group: new THREE.Group(),
          sections: new Map(),
          combinedMeshes: {},
          dirty: new Set(),
          sectionBlockCounts: completed.sectionBlockCounts,
          skyTops: completed.skyTops,
          light: completed.light,
          lightInitialized: true,
          lightIndices: new Set(completed.lightIndices),
          leafIndices: new Set(completed.leafIndices),
        };
        chunk.group.position.set(chunk.cx * CHUNK_SIZE, 0, chunk.cz * CHUNK_SIZE);
        this.chunks.set(chunk.key, chunk);
        this.group.add(chunk.group);
        this.freezeTerrainTransform(chunk.group);
        this.restoreStructureMarkerEntries(completed.structureMarkers);
        this.generationQueued.delete(chunk.key);
        this.generationEnqueuedAt.delete(chunk.key);
        this.streamingCompleted.generation += 1;
        this.setChunkStreamingVisibility(chunk);
        this.queueLightReconciliation(chunk);
        return true;
      }
      if (this.terrainGenerationPipeline.availableSlots <= 0) return false;
      if (!preferredKey && this.terrainGenerationPipeline.availableSlots <= 1
        && (this.generationQueue.at(-1)?.distance ?? Number.POSITIVE_INFINITY) > 1) return false;
      const currentKey = chunkKey(this.playerChunkX, this.playerChunkZ);
      const downstreamDebt = this.lightInitializationQueued.size + this.lightReconciliationQueued.size
        + Math.ceil((this.meshQueued.size + this.urgentMeshQueued.size) / 4);
      const nearestQueuedDistance = this.generationQueue.at(-1)?.distance ?? Number.POSITIVE_INFINITY;
      if (this.chunks.has(currentKey) && downstreamDebt >= 32 && nearestQueuedDistance > 1) return false;
      while (this.generationQueue.length) {
        const next = this.takeQueuedGeneration(preferredKey);
        if (!next) return false;
        const key = chunkKey(next.cx, next.cz);
        if (this.chunks.has(key) || this.pendingWorkerGeneration.has(key)) continue;
        const request = {
          namespace: this.generationNamespace(key),
          locationScope: this.locationScope,
          seedText: this.seedText,
          generationOptions: this.generationOptions as unknown as Readonly<Record<string, unknown>>,
          key,
          cx: next.cx,
          cz: next.cz,
          edits: [...(this.edits.get(key) ?? new Map<number, BlockId>())],
        };
        if (!this.terrainGenerationPipeline.submit(
          request,
          (result) => {
            if (request.namespace !== this.generationNamespace(key)) { this.staleWorkerGeneration += 1; return; }
            this.completedWorkerGeneration.push(result);
          },
          () => {
            if (request.namespace !== this.generationNamespace(key)) return;
            this.pendingWorkerGeneration.delete(key);
            const radialStreaming = this.renderDistance > RADIAL_STREAMING_DISTANCE_THRESHOLD;
            const retained = chunkWithinStreamingRadius(
              next.cx - this.playerChunkX,
              next.cz - this.playerChunkZ,
              this.renderDistance + 1,
              radialStreaming,
            );
            if (request.namespace !== this.generationNamespace(key) || !retained || this.chunks.has(key)) {
              this.generationQueued.delete(key);
              this.generationEnqueuedAt.delete(key);
              return;
            }
            this.generationQueue.push(next);
          },
        )) {
          this.generationQueue.push(next);
          return false;
        }
        this.pendingWorkerGeneration.add(key);
        return true;
      }
      return false;
    }
    if (preferredKey && this.activeGenerationTask && this.activeGenerationTask.key !== preferredKey) {
      const interrupted = this.activeGenerationTask;
      this.activeGenerationTask = null;
      this.generationQueue.push({
        cx: interrupted.cx,
        cz: interrupted.cz,
        distance: chunkStreamingSortDistance(
          interrupted.cx - this.playerChunkX,
          interrupted.cz - this.playerChunkZ,
          this.renderDistance > RADIAL_STREAMING_DISTANCE_THRESHOLD,
        ),
      });
    }
    while (!this.activeGenerationTask) {
      const next = this.takeQueuedGeneration(preferredKey);
      if (!next) return false;
      const key = chunkKey(next.cx, next.cz);
      if (this.chunks.has(key)) {
        this.generationQueued.delete(key);
        this.generationEnqueuedAt.delete(key);
        this.generationTasks.delete(key);
        continue;
      }
      this.activeGenerationTask = this.generationTasks.get(key) ?? this.createChunkGenerationTask(next.cx, next.cz);
      this.generationTasks.set(key, this.activeGenerationTask);
    }
    const task = this.activeGenerationTask;
    const completed = this.advanceChunkGeneration(task, 2, 1);
    if (completed) {
      this.activeGenerationTask = null;
      this.generationTasks.delete(task.key);
      this.prepareGeneratedChunk(completed);
    }
    return true;
  }

  private queueLightInitialization(key: string) {
    const chunk = this.chunks.get(key);
    if (!chunk || chunk.lightInitialized || !chunk.group.visible
      || this.lightInitializationQueued.has(key) || this.activeLightInitialization?.key === key) return;
    this.lightInitializationQueued.add(key);
    if (!this.lightInitializationEnqueuedAt.has(key)) this.lightInitializationEnqueuedAt.set(key, performance.now());
    this.lightInitializationQueue.push(key);
    if (this.activeLightInitialization
      && this.chunkStreamingPriority(key) < this.chunkStreamingPriority(this.activeLightInitialization.key)) {
      this.lightInitializationQueue.push(this.activeLightInitialization.key);
      this.activeLightInitialization = null;
    }
  }

  private deferLightRebuildAround(changes: ReadonlyArray<{ x: number; z: number }>) {
    const rebuild = new Set<string>();
    for (const change of changes) {
      const centerX = Math.floor(change.x / CHUNK_SIZE);
      const centerZ = Math.floor(change.z / CHUNK_SIZE);
      for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) {
        rebuild.add(chunkKey(centerX + dx, centerZ + dz));
      }
    }
    for (const key of rebuild) {
      const chunk = this.chunks.get(key);
      if (!chunk) continue;
      if (this.activeLightInitialization?.key === key) {
        this.activeLightInitialization = null;
        // takeQueuedLightInitialization already consumed the queue entry while
        // the membership bit stayed set for the active task. Clear the bit so
        // invalidation can append a fresh resumable task.
        this.lightInitializationQueued.delete(key);
      }
      this.lightInitializationTasks.delete(key);
      chunk.lightInitialized = false;
      this.queueLightInitialization(key);
    }
  }

  private takeQueuedLightInitialization(preferredKey?: string) {
    let bestIndex = -1;
    let bestPriority = Number.POSITIVE_INFINITY;
    for (let index = this.lightInitializationQueueHead; index < this.lightInitializationQueue.length; index += 1) {
      const key = this.lightInitializationQueue[index];
      if (!this.lightInitializationQueued.has(key)) continue;
      const chunk = this.chunks.get(key);
      if (!chunk || !chunk.group.visible || chunk.lightInitialized) {
        this.lightInitializationQueued.delete(key);
        this.lightInitializationTasks.delete(key);
        continue;
      }
      if (preferredKey && key === preferredKey) {
        bestIndex = index;
        break;
      }
      if (preferredKey) continue;
      const priority = this.agedStreamingPriority(
        this.chunkStreamingPriority(key),
        this.lightInitializationEnqueuedAt.get(key),
      );
      if (priority < bestPriority || (priority === bestPriority && key < (this.lightInitializationQueue[bestIndex] ?? ""))) {
        bestPriority = priority;
        bestIndex = index;
      }
    }
    if (bestIndex < 0) {
      this.lightInitializationQueue = [];
      this.lightInitializationQueueHead = 0;
      return undefined;
    }
    const head = this.lightInitializationQueueHead;
    [this.lightInitializationQueue[head], this.lightInitializationQueue[bestIndex]] = [
      this.lightInitializationQueue[bestIndex],
      this.lightInitializationQueue[head],
    ];
    const key = this.lightInitializationQueue[head];
    this.lightInitializationQueueHead += 1;
    if (this.lightInitializationQueueHead >= 256
      && this.lightInitializationQueueHead * 2 >= this.lightInitializationQueue.length) {
      this.lightInitializationQueue = this.lightInitializationQueue.slice(this.lightInitializationQueueHead);
      this.lightInitializationQueueHead = 0;
    }
    return key;
  }

  processLightInitialization(preferredKey?: string) {
    if (preferredKey && this.activeLightInitialization && this.activeLightInitialization.key !== preferredKey) {
      this.lightInitializationQueue.push(this.activeLightInitialization.key);
      this.activeLightInitialization = null;
    }
    while (!this.activeLightInitialization) {
      const key = this.takeQueuedLightInitialization(preferredKey);
      if (!key) return false;
      const chunk = this.chunks.get(key);
      if (!this.lightInitializationQueued.has(key) || !chunk || !chunk.group.visible || chunk.lightInitialized) {
        this.lightInitializationQueued.delete(key);
        this.lightInitializationTasks.delete(key);
        continue;
      }
      const task = this.lightInitializationTasks.get(key) ?? this.lightEngine.beginChunkInitialization(chunk);
      this.lightInitializationTasks.set(key, task);
      this.activeLightInitialization = { key, task };
    }
    const active = this.activeLightInitialization;
    const chunk = this.chunks.get(active.key);
    if (!chunk || !chunk.group.visible) {
      this.lightInitializationQueued.delete(active.key);
      this.lightInitializationTasks.delete(active.key);
      this.activeLightInitialization = null;
      return true;
    }
    if (this.lightEngine.stepChunkInitialization(active.task, 1_024)) {
      this.lightInitializationQueued.delete(active.key);
      this.lightInitializationEnqueuedAt.delete(active.key);
      this.lightInitializationTasks.delete(active.key);
      this.activeLightInitialization = null;
      this.streamingCompleted.lighting += 1;
      this.queueChunkMeshesAndSeams(chunk);
    }
    return true;
  }

  private queueLightReconciliation(chunk: Chunk) {
    if (this.lightReconciliationQueued.has(chunk.key) || this.activeLightReconciliation?.key === chunk.key) return;
    this.lightReconciliationQueued.add(chunk.key);
    const queued = { key: chunk.key, task: this.lightEngine.beginChunkBoundaryReconciliation(chunk) };
    this.lightReconciliationQueue.push(queued);
    if (this.activeLightReconciliation
      && this.chunkStreamingPriority(chunk.key) < this.chunkStreamingPriority(this.activeLightReconciliation.key)) {
      this.lightReconciliationQueue.push(this.activeLightReconciliation);
      this.activeLightReconciliation = null;
    }
    this.lightReconciliationQueue.sort((left, right) => this.chunkStreamingPriority(left.key) - this.chunkStreamingPriority(right.key));
  }

  private processLightReconciliation(preferredKey?: string) {
    if (preferredKey && this.activeLightReconciliation && this.activeLightReconciliation.key !== preferredKey) {
      this.lightReconciliationQueue.push(this.activeLightReconciliation);
      this.activeLightReconciliation = null;
    }
    while (!this.activeLightReconciliation) {
      const preferredIndex = preferredKey
        ? this.lightReconciliationQueue.findIndex((entry) => entry.key === preferredKey)
        : -1;
      const next = preferredIndex >= 0
        ? this.lightReconciliationQueue.splice(preferredIndex, 1)[0]
        : preferredKey ? undefined : this.lightReconciliationQueue.shift();
      if (!next) return false;
      if (!this.lightReconciliationQueued.has(next.key) || !this.chunks.has(next.key)) continue;
      this.activeLightReconciliation = next;
    }
    const active = this.activeLightReconciliation;
    if (!this.chunks.has(active.key)) {
      this.lightReconciliationQueued.delete(active.key);
      this.activeLightReconciliation = null;
      return true;
    }
    if (this.lightEngine.stepChunkInitialization(active.task, 2_048)) {
      const chunk = this.chunks.get(active.key);
      this.lightReconciliationQueued.delete(active.key);
      this.activeLightReconciliation = null;
      this.streamingCompleted.lighting += 1;
      if (chunk) this.prepareGeneratedChunk(chunk);
    }
    return true;
  }

  private processLightingSlice() {
    const currentStage = this.playerChunkStreamingState().playerChunkStage;
    if (currentStage === "lighting") {
      const currentKey = chunkKey(this.playerChunkX, this.playerChunkZ);
      if (this.lightReconciliationQueued.has(currentKey) || this.activeLightReconciliation?.key === currentKey) {
        return this.processLightReconciliation();
      }
      return this.processLightInitialization();
    }
    if (this.frame % 2 === 0) return this.processLightReconciliation() || this.processLightInitialization();
    return this.processLightInitialization() || this.processLightReconciliation();
  }

  processMesh(preferredKey?: string) {
    if (preferredKey && this.activeMeshTask && this.activeMeshTask.key !== preferredKey) {
      const interrupted = this.activeMeshTask;
      this.activeMeshTask = null;
      this.queueMesh(interrupted.key, interrupted.section);
    }
    while (!this.activeMeshTask) {
      const next = this.takeQueuedMesh(true, preferredKey) ?? this.takeQueuedMesh(false, preferredKey);
      if (!next) return false;
      const chunk = this.chunks.get(next.key);
      if (!chunk || !chunk.group.visible) continue;
      if (!chunk.lightInitialized) {
        this.queueLightInitialization(chunk.key);
        continue;
      }
      if (!this.chunkLightPresentationReady(next.key) || this.seamPresentationPending.has(`${next.key}:${next.section}`)) continue;
      if (chunk.sectionBlockCounts[next.section] === 0) {
        this.rebuildSection(chunk, next.section);
        return true;
      }
      this.activeMeshTask = {
        key: next.key,
        section: next.section,
        buckets: { opaque: emptyBucket(), cutout: emptyBucket(), emissive: emptyBucket(), translucentSolid: emptyBucket(), water: emptyBucket(), transparent: emptyBucket(), glass: emptyBucket() },
        nextLocalX: 0,
      };
    }
    const active = this.activeMeshTask;
    const chunk = this.chunks.get(active.key);
    if (!chunk || !chunk.group.visible || !this.chunkLightPresentationReady(chunk.key)) {
      this.activeMeshTask = null;
      return true;
    }
    const startLocalX = active.nextLocalX;
    const endLocalX = Math.min(CHUNK_SIZE, startLocalX + 1);
    const finalize = endLocalX >= CHUNK_SIZE;
    this.rebuildSection(chunk, active.section, {
      buckets: active.buckets,
      startLocalX,
      endLocalX,
      finalize,
    });
    active.nextLocalX = endLocalX;
    if (finalize) {
      const queueKey = `${active.key}:${active.section}`;
      const requeued = this.meshQueued.has(queueKey) || this.urgentMeshQueued.has(queueKey);
      this.activeMeshTask = null;
      if (!requeued) {
        this.meshEnqueuedAt.delete(queueKey);
        this.streamingCompleted.meshing += 1;
      }
      if (requeued) chunk.dirty.add(active.section);
    }
    return true;
  }

  beginPlayerEditFeedback(kind: PlayerEditFeedbackKind, inputStartedAt = performance.now()) {
    if (this.activePlayerEditFeedback) this.completePlayerEditFeedback(this.activePlayerEditFeedback.id);
    const record: PlayerEditFeedbackRecord = {
      id: this.nextPlayerEditFeedbackId++,
      kind,
      inputStartedAt,
      pendingConsolidations: new Set(),
    };
    this.activePlayerEditFeedback = record;
    this.playerEditFeedbackRecords.push(record);
    while (this.playerEditFeedbackRecords.length > 64) {
      const removed = this.playerEditFeedbackRecords.shift()!;
      for (const queueKey of removed.pendingConsolidations) {
        const waiters = this.playerEditConsolidationWaiters.get(queueKey);
        waiters?.delete(removed.id);
        if (waiters?.size === 0) this.playerEditConsolidationWaiters.delete(queueKey);
      }
    }
    return record.id;
  }

  markPlayerEditProxyStarted(id: number, now = performance.now()) {
    const record = this.playerEditFeedbackRecords.findLast((entry) => entry.id === id);
    if (record) record.proxyStartedAt = now;
  }

  completePlayerEditFeedback(id: number, now = performance.now()) {
    const record = this.playerEditFeedbackRecords.findLast((entry) => entry.id === id);
    if (!record) return;
    record.completedAt = now;
    if (!record.pendingConsolidations.size) record.consolidatedAt = now;
    if (this.activePlayerEditFeedback?.id === id) this.activePlayerEditFeedback = null;
  }

  private markPlayerEditMutation(now = performance.now()) {
    if (this.activePlayerEditFeedback && this.activePlayerEditFeedback.mutationStartedAt === undefined) {
      this.activePlayerEditFeedback.mutationStartedAt = now;
    }
  }

  private markPlayerEditLocalMeshVisible(now = performance.now()) {
    if (!this.activePlayerEditFeedback) return;
    this.activePlayerEditFeedback.staleGeometryHiddenAt ??= now;
    this.activePlayerEditFeedback.localMeshVisibleAt = now;
  }

  private notePlayerEditConsolidation(queueKey: string) {
    const record = this.activePlayerEditFeedback;
    if (!record || record.pendingConsolidations.has(queueKey)) return;
    record.pendingConsolidations.add(queueKey);
    const waiters = this.playerEditConsolidationWaiters.get(queueKey) ?? new Set<number>();
    waiters.add(record.id);
    this.playerEditConsolidationWaiters.set(queueKey, waiters);
  }

  private resolvePlayerEditConsolidation(queueKey: string, now = performance.now()) {
    const waiters = this.playerEditConsolidationWaiters.get(queueKey);
    if (!waiters) return;
    for (const id of waiters) {
      const record = this.playerEditFeedbackRecords.findLast((entry) => entry.id === id);
      if (!record) continue;
      record.pendingConsolidations.delete(queueKey);
      if (!record.pendingConsolidations.size) record.consolidatedAt = now;
    }
    this.playerEditConsolidationWaiters.delete(queueKey);
  }

  private queueChunkConsolidation(chunk: Chunk, layers: Iterable<WorldRenderLayer> = WORLD_RENDER_LAYERS) {
    let dirtyLayers = this.consolidationDirtyLayers.get(chunk.key);
    if (!dirtyLayers) {
      dirtyLayers = new Set();
      this.consolidationDirtyLayers.set(chunk.key, dirtyLayers);
    }
    for (const layer of layers) {
      const queueKey = `${chunk.key}:${layer}`;
      if (dirtyLayers.has(layer) || this.consolidationQueued.has(queueKey) || this.pendingConsolidations.has(queueKey)) {
        this.coalescedConsolidations += 1;
      }
      dirtyLayers.add(layer);
      this.consolidationRevision.set(queueKey, (this.consolidationRevision.get(queueKey) ?? 0) + 1);
      this.notePlayerEditConsolidation(queueKey);
      if (!this.consolidationEnqueuedAt.has(queueKey)) this.consolidationEnqueuedAt.set(queueKey, performance.now());
      if (this.consolidationQueued.has(queueKey)) continue;
      this.consolidationQueued.add(queueKey);
      this.consolidationQueue.push({ key: chunk.key, layer });
    }
  }

  private renderLayersAffectedByEdit(x: number, y: number, z: number, previous: BlockId, next: BlockId) {
    const layers = new Set<WorldRenderLayer>();
    const add = (type: BlockId | undefined) => {
      if (type === undefined || type === BlockId.Air) return;
      layers.add((BLOCKS[type]?.layer ?? "opaque") as WorldRenderLayer);
    };
    add(previous);
    add(next);
    // A changed cube can expose or cover one face owned by each neighbor. Keep
    // the immediate invalidation exact to those materials instead of waking
    // every render layer in the chunk.
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
      add(this.getBlock(x + dx, y + dy, z + dz));
    }
    return layers;
  }

  private invalidateCombinedMeshesForImmediateEdit(
    chunk: Chunk,
    layers: Iterable<WorldRenderLayer> = WORLD_RENDER_LAYERS,
  ) {
    const invalidatedLayers: WorldRenderLayer[] = [];
    for (const layer of new Set(layers)) {
      const mesh = chunk.combinedMeshes[layer];
      if (!mesh) continue;
      chunk.group.remove(mesh);
      this.disposeTerrainGeometry(mesh.geometry);
      delete chunk.combinedMeshes[layer];
      invalidatedLayers.push(layer);
    }
    if (!invalidatedLayers.length) return;
    this.invalidatedCombinedMeshes += invalidatedLayers.length;
    for (const section of chunk.sections.values()) {
      for (const layer of invalidatedLayers) if (section[layer]) section[layer]!.visible = true;
    }
    // Invalidate in-flight snapshots before rebuilding. The directly edited
    // section becomes the temporary presentation source; one stable merge is
    // queued after all local/seam/light work for the chunk settles.
    this.queueChunkConsolidation(chunk, invalidatedLayers);
  }

  private sectionCanAffectLayer(chunk: Chunk, section: number, layer: WorldRenderLayer) {
    const meshes = chunk.sections.get(section);
    // An unbuilt occupied section has unknown layer composition. Once a
    // source exists, unrelated layers no longer hold one another hostage.
    if (!meshes) return chunk.sectionBlockCounts[section] > 0;
    return Boolean(meshes[layer]);
  }

  private chunkConsolidationSourcesStable(chunk: Chunk, layer: WorldRenderLayer) {
    const hasDirtyGeometrySource = [...chunk.dirty]
      .some((section) => this.sectionCanAffectLayer(chunk, section, layer));
    const activeMeshCanAffectLayer = this.activeMeshTask?.key === chunk.key
      && this.sectionCanAffectLayer(chunk, this.activeMeshTask.section, layer);
    let layerLightingPending = false;
    if ((this.lightSectionsPendingByChunk.get(chunk.key) ?? 0) > 0) {
      for (let section = 0; section < SECTION_COUNT; section += 1) {
        if (this.lightSectionQueued.has(`${chunk.key}:${section}`)
          && this.sectionCanAffectLayer(chunk, section, layer)) {
          layerLightingPending = true;
          break;
        }
      }
    }
    return !hasDirtyGeometrySource
      && !activeMeshCanAffectLayer
      && !layerLightingPending;
  }

  private consolidationPriority(entry: Readonly<{ key: string; layer: WorldRenderLayer }>, now: number) {
    const base = this.agedStreamingPriority(
      this.chunkStreamingPriority(entry.key),
      this.consolidationEnqueuedAt.get(`${entry.key}:${entry.layer}`),
      now,
    );
    if (base <= 1) return base;
    const chunk = this.chunks.get(entry.key);
    if (!chunk) return Number.POSITIVE_INFINITY;
    let visibleSources = 0;
    if (chunk.group.visible) {
      for (const section of chunk.sections.values()) if (section[entry.layer]?.visible) visibleSources += 1;
    }
    return Math.max(1.02, base - Math.min(0.8, visibleSources * 0.05));
  }

  private freezeTerrainTransform(object: THREE.Object3D) {
    object.matrixAutoUpdate = false;
    object.updateMatrix();
    object.updateMatrixWorld(true);
    object.matrixWorldAutoUpdate = false;
  }

  private terrainSectionGeometry(geometry: THREE.BufferGeometry): TerrainSectionGeometry {
    const attribute = <T extends THREE.TypedArray>(name: string) => {
      const array = (geometry.getAttribute(name) as unknown as { array: T }).array;
      return array.slice() as T;
    };
    const rawIndex = geometry.getIndex()?.array;
    const indices = rawIndex instanceof Uint32Array ? rawIndex.slice() : new Uint16Array(rawIndex ?? []);
    return {
      positions: attribute<Float32Array>("position"),
      normals: attribute<Int8Array>("normal"),
      colors: attribute<Uint8Array>("color"),
      lights: attribute<Uint8Array>("voxelLight"),
      emissions: attribute<Uint8Array>("voxelEmission"),
      occlusions: attribute<Uint8Array>("voxelOcclusion"),
      uvs: attribute<Uint16Array>("uv"),
      indices,
    };
  }

  private registerTerrainGeometry(geometry: THREE.BufferGeometry) {
    let bytes = geometry.getIndex()?.array.byteLength ?? 0;
    for (const attribute of Object.values(geometry.attributes)) {
      bytes += (attribute as THREE.BufferAttribute).array.byteLength;
    }
    this.terrainGeometryBytes.set(geometry, bytes);
    this.liveTerrainGeometryBytes += bytes;
    this.terrainGeometriesCreated += 1;
  }

  private disposeTerrainGeometry(geometry: THREE.BufferGeometry) {
    const bytes = this.terrainGeometryBytes.get(geometry) ?? 0;
    this.liveTerrainGeometryBytes = Math.max(0, this.liveTerrainGeometryBytes - bytes);
    this.terrainGeometryBytes.delete(geometry);
    this.terrainGeometriesDisposed += 1;
    geometry.dispose();
  }

  private installCombinedGeometry(key: string, layer: WorldRenderLayer, payload: TerrainMergedGeometry | null) {
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    const old = chunk.combinedMeshes[layer];
    if (old) {
      chunk.group.remove(old);
      this.disposeTerrainGeometry(old.geometry);
      delete chunk.combinedMeshes[layer];
    }
    if (!payload) {
      for (const section of chunk.sections.values()) if (section[layer]) section[layer]!.visible = true;
      return;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(payload.positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(payload.normals, 3, true));
    geometry.setAttribute("color", new THREE.BufferAttribute(payload.colors, 3, true));
    geometry.setAttribute("voxelLight", new THREE.BufferAttribute(payload.lights, 4, true));
    geometry.setAttribute("voxelEmission", new THREE.BufferAttribute(payload.emissions, 1, true));
    geometry.setAttribute("voxelOcclusion", new THREE.BufferAttribute(payload.occlusions, 1, true));
    geometry.setAttribute("uv", new THREE.BufferAttribute(payload.uvs, 2, true));
    geometry.setIndex(new THREE.BufferAttribute(payload.indices, 1));
    geometry.computeBoundingSphere();
    this.registerTerrainGeometry(geometry);
    const mesh = new THREE.Mesh(geometry, this.materials[layer]);
    mesh.renderOrder = worldRenderOrder(layer);
    chunk.group.add(mesh);
    this.freezeTerrainTransform(mesh);
    chunk.combinedMeshes[layer] = mesh;
    for (const section of chunk.sections.values()) if (section[layer]) section[layer]!.visible = false;
  }

  /** Dispatches or installs one layer; stale worker results can never overwrite a newer edit. */
  processConsolidation() {
    const completed = this.completedConsolidations.shift();
    if (completed) {
      const queueKey = `${completed.key}:${completed.layer}`;
      if (completed.revision === this.consolidationRevision.get(queueKey)) {
        this.installCombinedGeometry(completed.key, completed.layer, completed.geometry);
        this.resolvePlayerEditConsolidation(queueKey);
        this.consolidationEnqueuedAt.delete(queueKey);
      } else this.staleConsolidations += 1;
      return true;
    }
    const attempts = this.consolidationQueue.length;
    if (attempts > 1) {
      const now = performance.now();
      let bestIndex = 0;
      let bestPriority = this.consolidationPriority(this.consolidationQueue[0], now);
      for (let index = 1; index < attempts; index += 1) {
        const priority = this.consolidationPriority(this.consolidationQueue[index], now);
        if (priority < bestPriority) {
          bestPriority = priority;
          bestIndex = index;
        }
      }
      if (bestIndex > 0) [this.consolidationQueue[0], this.consolidationQueue[bestIndex]] = [
        this.consolidationQueue[bestIndex],
        this.consolidationQueue[0],
      ];
    }
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const next = this.consolidationQueue.shift()!;
      const queueKey = `${next.key}:${next.layer}`;
      if (!this.consolidationQueued.delete(queueKey)) continue;
      const chunk = this.chunks.get(next.key);
      if (!chunk) {
        this.consolidationEnqueuedAt.delete(queueKey);
        continue;
      }
      const dirtyLayers = this.consolidationDirtyLayers.get(next.key);
      if (!dirtyLayers?.has(next.layer)) {
        this.consolidationEnqueuedAt.delete(queueKey);
        continue;
      }
      if (this.pendingConsolidations.has(queueKey) || !this.chunkConsolidationSourcesStable(chunk, next.layer)) {
        this.consolidationQueued.add(queueKey);
        this.consolidationQueue.push(next);
        continue;
      }
      const parts: TerrainSectionGeometry[] = [];
      for (const section of chunk.sections.values()) {
        const mesh = section[next.layer];
        if (mesh) parts.push(this.terrainSectionGeometry(mesh.geometry));
      }
      const revision = this.consolidationRevision.get(queueKey) ?? 0;
      const ownerEpoch = this.locationLoadEpoch;
      dirtyLayers.delete(next.layer);
      if (!dirtyLayers.size) this.consolidationDirtyLayers.delete(next.key);
      this.pendingConsolidations.add(queueKey);
      this.terrainBufferPipeline.submit(
        parts,
        (geometry) => {
          if (ownerEpoch !== this.locationLoadEpoch) { this.staleConsolidations += 1; return; }
          this.pendingConsolidations.delete(queueKey);
          this.completedConsolidations.push({ key: next.key, layer: next.layer, revision, geometry });
        },
        () => {
          if (ownerEpoch !== this.locationLoadEpoch) return;
          this.pendingConsolidations.delete(queueKey);
          if (!this.chunks.has(next.key) || revision !== this.consolidationRevision.get(queueKey)) return;
          const retryLayers = this.consolidationDirtyLayers.get(next.key) ?? new Set<WorldRenderLayer>();
          retryLayers.add(next.layer);
          this.consolidationDirtyLayers.set(next.key, retryLayers);
          this.consolidationQueued.add(queueKey);
          this.consolidationQueue.push(next);
        },
      );
      return true;
    }
    return false;
  }

  private queueLightSection(key: string, section: number) {
    if (section < 0 || section >= SECTION_COUNT || !this.chunks.has(key)) return;
    const queueKey = `${key}:${section}`;
    if (this.lightSectionQueued.has(queueKey)) return;
    this.lightSectionQueued.add(queueKey);
    this.lightSectionsPendingByChunk.set(key, (this.lightSectionsPendingByChunk.get(key) ?? 0) + 1);
    this.lightSectionQueue.push({ key, section });
  }

  private queueLightSectionAt(x: number, y: number, z: number) {
    for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
      const sx = splitCoordinate(x + dx);
      const sz = splitCoordinate(z + dz);
      this.queueLightSection(chunkKey(sx.chunk, sz.chunk), sectionForY(y + dy));
    }
  }

  private takeQueuedLightSection() {
    while (this.lightSectionQueueHead < this.lightSectionQueue.length) {
      const next = this.lightSectionQueue[this.lightSectionQueueHead];
      this.lightSectionQueueHead += 1;
      if (!this.lightSectionQueued.delete(`${next.key}:${next.section}`)) continue;
      const remaining = Math.max(0, (this.lightSectionsPendingByChunk.get(next.key) ?? 1) - 1);
      if (remaining) this.lightSectionsPendingByChunk.set(next.key, remaining);
      else this.lightSectionsPendingByChunk.delete(next.key);
      if (this.lightSectionQueueHead >= 256 && this.lightSectionQueueHead * 2 >= this.lightSectionQueue.length) {
        this.lightSectionQueue = this.lightSectionQueue.slice(this.lightSectionQueueHead);
        this.lightSectionQueueHead = 0;
      }
      return next;
    }
    this.lightSectionQueue = [];
    this.lightSectionQueueHead = 0;
    return undefined;
  }

  processLightSection() {
    while (true) {
      const next = this.takeQueuedLightSection();
      if (!next) return;
      const chunk = this.chunks.get(next.key);
      if (!chunk || !chunk.group.visible || !chunk.sections.has(next.section)) continue;
      const updatedLayers = this.updateSectionLighting(chunk, next.section);
      this.queueChunkConsolidation(chunk, updatedLayers);
      return;
    }
  }

  private surfaceLightAt(worldX: number, worldY: number, worldZ: number, normalX: number, normalY: number, normalZ: number): [number, number, number, number] {
    const axis = Math.abs(normalX) >= Math.abs(normalY) && Math.abs(normalX) >= Math.abs(normalZ) ? 0
      : Math.abs(normalY) >= Math.abs(normalZ) ? 1 : 2;
    const axisCoordinate = axis === 0 ? worldX : axis === 1 ? worldY : worldZ;
    const axisNormal = axis === 0 ? normalX : axis === 1 ? normalY : normalZ;
    const fixed = Math.round(axisCoordinate + Math.sign(axisNormal || 1) * 0.51);
    const coordinateA = axis === 0 ? worldY : worldX;
    const coordinateB = axis === 2 ? worldY : worldZ;
    const minimumA = Math.floor(coordinateA);
    const maximumA = Math.ceil(coordinateA);
    const minimumB = Math.floor(coordinateB);
    const maximumB = Math.ceil(coordinateB);
    let totalSky = 0; let totalRed = 0; let totalGreen = 0; let totalBlue = 0;
    let maximumSky = 0; let maximumRed = 0; let maximumGreen = 0; let maximumBlue = 0;
    for (let sampleIndex = 0; sampleIndex < 4; sampleIndex += 1) {
      const a = sampleIndex & 1 ? maximumA : minimumA;
      const b = sampleIndex & 2 ? maximumB : minimumB;
      const sampleX = axis === 0 ? fixed : a;
      const sampleY = axis === 1 ? fixed : axis === 0 ? a : b;
      const sampleZ = axis === 2 ? fixed : b;
      const packed = this.lightEngine.getPacked(sampleX, sampleY, sampleZ);
      const sky = lightChannel(packed, LightChannel.Sky);
      const red = lightChannel(packed, LightChannel.Red);
      const green = lightChannel(packed, LightChannel.Green);
      const blue = lightChannel(packed, LightChannel.Blue);
      totalSky += sky; totalRed += red; totalGreen += green; totalBlue += blue;
      maximumSky = Math.max(maximumSky, sky);
      maximumRed = Math.max(maximumRed, red);
      maximumGreen = Math.max(maximumGreen, green);
      maximumBlue = Math.max(maximumBlue, blue);
    }
    const output = this.surfaceLightSample;
    const hasDirectSample = maximumSky > 0 || maximumRed > 0 || maximumGreen > 0 || maximumBlue > 0;
    if (!hasDirectSample) {
      const centerX = Math.round(worldX);
      const centerY = Math.round(worldY);
      const centerZ = Math.round(worldZ);
      for (let direction = 0; direction < 6; direction += 1) {
        const dx = direction === 0 ? 1 : direction === 1 ? -1 : 0;
        const dy = direction === 2 ? 1 : direction === 3 ? -1 : 0;
        const dz = direction === 4 ? 1 : direction === 5 ? -1 : 0;
        const packed = this.lightEngine.getPacked(centerX + dx, centerY + dy, centerZ + dz);
        maximumSky = Math.max(maximumSky, lightChannel(packed, LightChannel.Sky));
        maximumRed = Math.max(maximumRed, lightChannel(packed, LightChannel.Red));
        maximumGreen = Math.max(maximumGreen, lightChannel(packed, LightChannel.Green));
        maximumBlue = Math.max(maximumBlue, lightChannel(packed, LightChannel.Blue));
      }
      output[0] = maximumSky; output[1] = maximumRed; output[2] = maximumGreen; output[3] = maximumBlue;
      return output;
    }
    output[0] = totalSky * 0.18 + maximumSky * 0.28;
    output[1] = totalRed * 0.18 + maximumRed * 0.28;
    output[2] = totalGreen * 0.18 + maximumGreen * 0.28;
    output[3] = totalBlue * 0.18 + maximumBlue * 0.28;
    return output;
  }

  private updateSectionLighting(chunk: Chunk, section: number) {
    const meshes = chunk.sections.get(section);
    if (!meshes) return [] as WorldRenderLayer[];
    const updatedLayers: WorldRenderLayer[] = [];
    for (const layer of WORLD_RENDER_LAYERS) {
      const mesh = meshes[layer];
      if (!mesh) continue;
      const position = mesh.geometry.getAttribute("position");
      const normal = mesh.geometry.getAttribute("normal");
      if (!position || !normal) continue;
      const lights = new Uint8Array(position.count * 4);
      for (let index = 0; index < position.count; index += 1) {
        const sampled = this.surfaceLightAt(
          chunk.cx * CHUNK_SIZE + position.getX(index),
          position.getY(index),
          chunk.cz * CHUNK_SIZE + position.getZ(index),
          normal.getX(index), normal.getY(index), normal.getZ(index),
        );
        for (let channel = 0; channel < 4; channel += 1) lights[index * 4 + channel] = Math.round(clamp(sampled[channel] / MAX_LIGHT_LEVEL, 0, 1) * 255);
      }
      mesh.geometry.setAttribute("voxelLight", new THREE.BufferAttribute(lights, 4, true));
      updatedLayers.push(layer);
    }
    return updatedLayers;
  }

  flushLightSections(maximum = 64) {
    for (let index = 0; index < maximum && this.lightSectionQueued.size > 0; index += 1) this.processLightSection();
  }

  takeQueuedMesh(urgent: boolean, preferredKey?: string) {
    let queue = urgent ? this.urgentMeshQueue : this.meshQueue;
    let head = urgent ? this.urgentMeshQueueHead : this.meshQueueHead;
    const queued = urgent ? this.urgentMeshQueued : this.meshQueued;
    let bestIndex = -1;
    for (let index = head; index < queue.length; index += 1) {
      const entry = queue[index];
      if (preferredKey && entry.key !== preferredKey) continue;
      if (!queued.has(`${entry.key}:${entry.section}`)) continue;
      if (bestIndex < 0 || this.compareMeshPriority(entry, queue[bestIndex]) < 0) bestIndex = index;
    }
    if (preferredKey && bestIndex < 0) return undefined;
    if (bestIndex >= 0 && bestIndex !== head) [queue[head], queue[bestIndex]] = [queue[bestIndex], queue[head]];
    while (head < queue.length) {
      const next = queue[head];
      head += 1;
      const queueKey = `${next.key}:${next.section}`;
      if (!queued.delete(queueKey)) continue;
      if (head >= 256 && head * 2 >= queue.length) {
        queue = queue.slice(head);
        head = 0;
      }
      if (urgent) {
        this.urgentMeshQueue = queue;
        this.urgentMeshQueueHead = head;
      } else {
        this.meshQueue = queue;
        this.meshQueueHead = head;
      }
      return next;
    }
    queue = [];
    if (urgent) {
      this.urgentMeshQueue = queue;
      this.urgentMeshQueueHead = 0;
    } else {
      this.meshQueue = queue;
      this.meshQueueHead = 0;
    }
    return undefined;
  }

  queueMesh(key: string, section: number, urgent = false) {
    if (section < 0 || section >= SECTION_COUNT) return;
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    const existing = chunk.sections.get(section);
    const hasGeometry = existing ? Object.values(existing).some(Boolean) : false;
    if (chunk.sectionBlockCounts[section] === 0 && !hasGeometry) {
      chunk.dirty.delete(section);
      return;
    }
    chunk.dirty.add(section);
    const queueKey = `${key}:${section}`;
    if (urgent) {
      if (this.urgentMeshQueued.has(queueKey)) return;
      this.meshQueued.delete(queueKey);
      this.urgentMeshQueued.add(queueKey);
      if (!this.meshEnqueuedAt.has(queueKey)) this.meshEnqueuedAt.set(queueKey, performance.now());
      this.urgentMeshQueue.push({ key, section });
      return;
    }
    if (this.meshQueued.has(queueKey) || this.urgentMeshQueued.has(queueKey)) return;
    this.meshQueued.add(queueKey);
    if (!this.meshEnqueuedAt.has(queueKey)) this.meshEnqueuedAt.set(queueKey, performance.now());
    this.meshQueue.push({ key, section });
  }

  cancelQueuedMesh(key: string, section: number) {
    const queueKey = `${key}:${section}`;
    this.meshQueued.delete(queueKey);
    this.urgentMeshQueued.delete(queueKey);
    if (this.seamMeshRebuilds.delete(queueKey)) this.releaseSeamPresentationBlocker(queueKey);
    if (this.meshEnqueuedAt.delete(queueKey)) this.streamingCanceled.meshing += 1;
    if (this.activeMeshTask?.key === key && this.activeMeshTask.section === section) this.activeMeshTask = null;
  }

  sampleColumn(x: number, z: number): ColumnSample {
    if (this.celestialTerrain) {
      const column = this.celestialTerrain.column(Math.floor(x), Math.floor(z));
      return { height: column.height, waterline: column.waterline,
        biome: column.region ? BiomeId.PaleRegolithSea + MORROW_REGIONS.findIndex(region => region.id === column.region) : BiomeId.OrbitalVoid,
        temperature: 0, moisture: 0, continental: 1, river: 0, mountain: column.region === "moon-slate-highlands" ? 1 : 0 };
    }
    const biomeScale = this.generationOptions.profile === "legacy-v14" ? 1 : this.generationOptions.biomeScale;
    const sampleX = x / biomeScale;
    const sampleZ = z / biomeScale;
    const warpX = sampleX + 34 * fbm2(sampleX, sampleZ, this.seed ^ 0x1f123bb5, 1 / 420, 3);
    const warpZ = sampleZ + 34 * fbm2(sampleX, sampleZ, this.seed ^ 0x72e8a1d3, 1 / 420, 3);
    const continental = 0.72 * fbm2(warpX, warpZ, this.seed ^ 0x9e3779b9, 1 / 720, 5) + 0.28 * fbm2(warpX, warpZ, this.seed ^ 0x85ebca6b, 1 / 240, 3);
    const temperature = clamp(0.5 + 0.5 * (0.78 * fbm2(sampleX, sampleZ, this.seed ^ 0xc2b2ae35, 1 / 560, 4) + 0.22 * fbm2(sampleX, sampleZ, this.seed ^ 0x27d4eb2d, 1 / 140, 2)), 0, 1);
    const moisture = clamp(0.5 + 0.5 * (0.8 * fbm2(sampleX, sampleZ, this.seed ^ 0x165667b1, 1 / 510, 4) + 0.2 * fbm2(sampleX, sampleZ, this.seed ^ 0xd3a2646c, 1 / 125, 2)), 0, 1);
    const erosion = clamp(0.5 + 0.5 * fbm2(warpX, warpZ, this.seed ^ 0xfd7046c5, 1 / 390, 4), 0, 1);
    const region = clamp(0.5 + 0.5 * fbm2(warpX, warpZ, this.seed ^ 0xb55a4f09, 1 / 440, 3), 0, 1);
    const variant = clamp(0.5 + 0.5 * fbm2(warpX - 900, warpZ + 600, this.seed ^ 0x94d049bb, 1 / 270, 3), 0, 1);
    const ridge = Math.pow(Math.max(0, 1 - Math.abs(fbm2(warpX, warpZ, this.seed ^ 0x369dea0f, 1 / 165, 4))), 3);
    const mountain = smoothstep(0.25, 0.58, continental) * smoothstep(0.56, 0.8, region) * (1 - 0.65 * erosion);
    const detail = (5.5 - 3.7 * erosion) * fbm2(warpX, warpZ, this.seed ^ 0x7f4a7c15, 1 / 92, 4) + 1.2 * fbm2(warpX, warpZ, this.seed ^ 0x632be59b, 1 / 24, 2);
    let height = SEA_LEVEL + continentOffset(continental) + detail + mountain * (6 + 30 * ridge);
    // Continental shelves now step down into broad basins and narrow trenches
    // instead of settling on one nearly level ocean floor. The bounded terms
    // preserve deterministic sampling while producing navigable depth bands.
    const oceanWeight = 1 - smoothstep(-0.26, -0.03, continental);
    const oceanBasin = 0.5 + 0.5 * fbm2(warpX + 731, warpZ - 419, this.seed ^ 0x41c64e6d, 1 / 210, 4);
    const trenchField = Math.pow(Math.max(0, 1 - Math.abs(fbm2(warpX - 503, warpZ + 887, this.seed ^ 0x9f4a7c31, 1 / 185, 4))), 5);
    height -= oceanWeight * (2.5 + oceanBasin * 7 + trenchField * 17);
    const riverField = Math.abs(fbm2(warpX + 211, warpZ - 173, this.seed ^ 0x85157af5, 1 / 320, 3));
    const river = (1 - smoothstep(0.018, 0.066, riverField)) * smoothstep(-0.16, 0.06, continental) * (1 - 0.75 * mountain);
    // A connected surface-water system must have one datum. Vary the bed and
    // banks, never the fill plane: the former continental formula introduced
    // abrupt 32/33 transitions where rivers, coasts, or adjacent chunks met.
    const waterline = SEA_LEVEL;
    const riverBedNoise = 0.5 + 0.5 * fbm2(warpX - 377, warpZ + 229, this.seed ^ 0xa511e9b3, 1 / 74, 3);
    const broadChannel = smoothstep(0.12, 0.78, river);
    height = lerp(height, waterline - (2.5 + riverBedNoise * 2), broadChannel * 0.92);
    const swampWeight = smoothstep(0.7, 0.86, moisture) * smoothstep(0.38, 0.57, temperature) * (1 - smoothstep(SEA_LEVEL + 10, SEA_LEVEL + 18, height));
    height = lerp(height, SEA_LEVEL + 2 + 1.4 * fbm2(warpX, warpZ, this.seed ^ 0xe17a1465, 1 / 42, 2), swampWeight * 0.76);
    const dryWeight = smoothstep(0.6, 0.77, temperature) * (1 - smoothstep(0.23, 0.36, moisture));
    height += 3.6 * dryWeight * Math.pow(1 - Math.abs(fbm2(warpX, warpZ, this.seed ^ 0xa24baed4, 1 / 50, 3)), 2);
    // Fine relief is climate-weighted: dry shelves, wet hummocks, and cold
    // ridges now read differently without adding another biome lookup.
    const localRelief = fbm2(warpX + 53, warpZ - 91, this.seed ^ 0x4cf5ad43, 1 / 46, 3);
    const reliefAmplitude = 1.15 + dryWeight * 2.15 + moisture * 0.65 + mountain * 1.5;
    // Fine land relief fades toward the channel so it cannot accidentally
    // refill a river after the broad valley has been carved.
    height += localRelief * reliefAmplitude * (1 - smoothstep(0.2, 0.7, river) * 0.9);
    // Sugarplum country has low rolling mounds rather than generic meadow
    // flats. The same broad variant band below selects the actual biome.
    const sugarplumRelief = smoothstep(0.68, 0.78, variant) * (1 - smoothstep(0.91, 0.98, variant))
      * smoothstep(0.32, 0.46, moisture) * (1 - smoothstep(0.76, 0.9, moisture));
    height += sugarplumRelief * (1.1 + 1.35 * fbm2(warpX + 193, warpZ - 307, this.seed ^ 0x7c15a4f3, 1 / 38, 3)) * (1 - river);

    // Broad rolling landforms keep non-mountain country from collapsing into
    // a single elevation. Climate-weighted erosion still leaves true flats in
    // marshes and river plains.
    const worldBelow = this.generationOptions.profile === "world-below-v15";
    const macroRoll = fbm2(warpX - 119, warpZ + 287, this.seed ^ 0xd807aa98, 1 / 260, 4);
    const hillCountry = smoothstep(-0.02, 0.42, continental) * (1 - mountain) * (1 - swampWeight) * (1 - river);
    if (worldBelow) height += hillCountry * (3.2 * macroRoll + 4.4 * Math.max(0, macroRoll) ** 2);

    const surfaceRegion = worldBelow ? surfaceRegionAt(this.seed, sampleX, sampleZ, temperature, moisture) : null;
    // Landform follows the owning regional core and fades fully to the shared
    // macro terrain through boundary belts. Surface identity can transition
    // sooner, but it no longer swaps height formulas at that first threshold.
    if (surfaceRegion && height > SEA_LEVEL + 1 && continental > -0.08 && river < 0.5) {
      const identity = surfaceRegion.coreBiome;
      const strength = 0.78 * (1 - smoothstep(0, 0.92, surfaceRegion.boundary));
      const broad = fbm2(warpX + 947, warpZ - 613, this.seed ^ 0x510e527f, 1 / 150, 4);
      const folded = Math.max(0, 1 - Math.abs(fbm2(warpX - 283, warpZ + 719, this.seed ^ 0x9b05688c, 1 / 105, 4)));
      if (identity === BiomeId.Meadow) {
        height = lerp(height, SEA_LEVEL + 8 + broad * 2.2, strength * 0.42);
      } else if (identity === BiomeId.Siltfen || identity === BiomeId.MushroomFen) {
        height = lerp(height, SEA_LEVEL + 3.2 + broad * 1.8, strength * 0.8);
      } else if (identity === BiomeId.Wildwood || identity === BiomeId.Birchlight) {
        height += strength * (2.3 * broad + 3.1 * folded);
      } else if (identity === BiomeId.Bloomwood || identity === BiomeId.SakurabloomGrove || identity === BiomeId.Glimmerwood) {
        height += strength * (3.4 * broad + 4.6 * folded);
      } else if (identity === BiomeId.SugarplumVale) {
        height += strength * (2.5 + 4.2 * Math.max(0, broad) ** 2);
      } else if (identity === BiomeId.Savanna) {
        const plateau = Math.round((height + broad * 3) / 3) * 3;
        height = lerp(height, plateau + 2.5 * folded, strength * 0.62);
      } else if (identity === BiomeId.Desert) {
        height += strength * (1.8 + 5.2 * folded ** 2 + broad * 1.4);
      } else if (identity === BiomeId.Badlands) {
        const mesa = Math.round((Math.max(height, SEA_LEVEL + 9) + folded * 13) / 5) * 5;
        height = lerp(height, mesa, strength * 0.76);
      } else if (identity === BiomeId.RainveilJungle) {
        height += strength * (8 * folded + 7 * broad);
      } else if (identity === BiomeId.CloudreedGlen) {
        height += strength * (5 + 8 * folded + broad * 3);
      } else if (identity === BiomeId.Highlands) {
        const highlandTarget = SEA_LEVEL + 42 + folded * 38 + broad * 8;
        height = lerp(height, Math.max(height, highlandTarget), strength * 0.88);
      } else if (identity === BiomeId.Snowfield || identity === BiomeId.Frostpine) {
        height += strength * (2.5 * broad + 4 * folded);
      }
    }

    // Each 768-sample macrocell owns one deterministic rare-biome reserve.
    // Cycling the reserve family by hash makes every seed supply an endless,
    // discoverable sequence instead of relying on narrow threshold luck.
    const reserveCellSize = 768;
    const reserveCellX = Math.floor(sampleX / reserveCellSize);
    const reserveCellZ = Math.floor(sampleZ / reserveCellSize);
    const reserveCenterX = reserveCellX * reserveCellSize + 128 + hash2(reserveCellX, reserveCellZ, this.seed ^ 0x243f6a88) * (reserveCellSize - 256);
    const reserveCenterZ = reserveCellZ * reserveCellSize + 128 + hash2(reserveCellX, reserveCellZ, this.seed ^ 0x85a308d3) * (reserveCellSize - 256);
    const reserveRadius = 82 + hash2(reserveCellX, reserveCellZ, this.seed ^ 0x13198a2e) * 38;
    const reserveEdgeNoise = fbm2(sampleX, sampleZ, this.seed ^ 0x3707344, 1 / 62, 2) * 13;
    const reserveDistance = Math.hypot(sampleX - reserveCenterX, sampleZ - reserveCenterZ) + reserveEdgeNoise;
    const reserveStrength = worldBelow ? 1 - smoothstep(reserveRadius * 0.48, reserveRadius, reserveDistance) : 0;
    const reserveBiomes = [
      BiomeId.CloudreedGlen,
      BiomeId.RainveilJungle,
      BiomeId.SakurabloomGrove,
      BiomeId.MushroomFen,
      BiomeId.SugarplumVale,
      BiomeId.Glimmerwood,
      BiomeId.SnowcapRange,
      BiomeId.Volcanic,
      BiomeId.LumenTrench,
    ] as const;
    const reserveIndex = Math.min(reserveBiomes.length - 1, Math.floor(hash2(reserveCellX, reserveCellZ, this.seed ^ 0xa4093822) * reserveBiomes.length));
    const reserveBiome = reserveBiomes[reserveIndex];
    if (reserveStrength > 0) {
      const reserveRelief = fbm2(sampleX + 913, sampleZ - 271, this.seed ^ 0x299f31d0, 1 / 46, 3);
      if (reserveBiome === BiomeId.LumenTrench) {
        height = lerp(height, SEA_LEVEL - 28 - 7 * Math.max(0, reserveRelief), reserveStrength * 0.96);
      } else if (reserveBiome === BiomeId.SnowcapRange) {
        const alpineTarget = SEA_LEVEL + 58 + 28 * Math.max(0, 1 - Math.abs(reserveRelief));
        height = lerp(height, Math.max(height, alpineTarget), reserveStrength * 0.96);
      } else if (reserveBiome === BiomeId.Volcanic) {
        const calderaRim = SEA_LEVEL + 28 + 26 * Math.max(0, 1 - Math.abs(reserveRelief)) + reserveRelief * 4;
        height = lerp(height, Math.max(height, calderaRim), reserveStrength * 0.92);
      } else if (reserveBiome === BiomeId.MushroomFen) {
        height = lerp(height, SEA_LEVEL + 3 + reserveRelief * 2, reserveStrength * 0.88);
      } else {
        const livingTarget = SEA_LEVEL + 8 + reserveRelief * (reserveBiome === BiomeId.CloudreedGlen ? 6 : 4);
        height = lerp(height, Math.max(height, livingTarget), reserveStrength * 0.86);
      }
    }
    if (river > 0.52) {
      const channelDepth = 3 + Math.floor(smoothstep(0.52, 0.9, river) * 3 + riverBedNoise * 2);
      height = Math.min(height, waterline - channelDepth);
    }
    height = clamp(Math.round(height), MIN_Y + 7, MAX_Y - 8);

    let biome = BiomeId.Meadow;
    // River identity follows the channel field, not its freshly deepened bed;
    // checking ocean depth first would relabel every useful river as ocean.
    if (river > 0.52) biome = BiomeId.River;
    else if (height <= SEA_LEVEL - 23 && trenchField > 0.34) biome = BiomeId.LumenTrench;
    else if (height <= SEA_LEVEL - 10) biome = BiomeId.DeepOcean;
    else if (height <= SEA_LEVEL - 2) biome = temperature < 0.15 ? BiomeId.Snowfield : BiomeId.Ocean;
    else if (height <= (worldBelow ? SEA_LEVEL : SEA_LEVEL + 2)) biome = BiomeId.Beach;
    else if (worldBelow && surfaceRegion) {
      if (height >= 96 && temperature < 0.62) biome = BiomeId.SnowcapRange;
      else if (height >= 76 && ![BiomeId.Badlands, BiomeId.Desert].includes(surfaceRegion.biome)) biome = temperature < 0.42 ? BiomeId.Snowfield : BiomeId.Highlands;
      else biome = surfaceRegion.biome;
    }
    else if (variant > 0.8 && mountain > 0.12 && temperature > 0.4) biome = BiomeId.Volcanic;
    else if ((mountain > 0.52 || height >= 76) && temperature < 0.58) biome = BiomeId.SnowcapRange;
    else if (mountain > 0.36 || height >= 68) biome = temperature < 0.35 || height > 78 ? BiomeId.Snowfield : BiomeId.Highlands;
    else if (temperature < 0.2) biome = BiomeId.Snowfield;
    else if (temperature < 0.36 && moisture >= 0.42) biome = BiomeId.Frostpine;
    else if (height < 68 && temperature >= 0.38 && temperature <= 0.7 && moisture >= 0.33 && moisture <= 0.76 && variant >= 0.7 && variant <= 0.93) biome = BiomeId.SugarplumVale;
    // Keep Glimmerwood cool enough that warm, very wet Rainveil jungle seeds
    // retain their established identity and save-compatible tree fixtures.
    else if (temperature >= 0.32 && temperature <= 0.55 && moisture >= 0.64 && variant >= 0.18 && variant <= 0.43) biome = BiomeId.Glimmerwood;
    else if (temperature > 0.62 && moisture < 0.2 && variant > 0.52) biome = BiomeId.Badlands;
    else if (temperature > 0.64 && moisture < 0.3) biome = BiomeId.Desert;
    else if (temperature > 0.58 && moisture < 0.54) biome = BiomeId.Savanna;
    else if (height >= 42 && height <= 66 && temperature >= 0.3 && temperature <= 0.55 && moisture >= 0.68 && moisture <= 0.92 && variant < 0.58) biome = BiomeId.CloudreedGlen;
    else if (temperature > 0.57 && moisture > 0.72 && variant < 0.78) biome = BiomeId.RainveilJungle;
    else if (temperature >= 0.34 && temperature <= 0.62 && moisture > 0.55 && variant > 0.42 && variant < 0.68) biome = BiomeId.SakurabloomGrove;
    else if (moisture > 0.74 && height < SEA_LEVEL + 14) biome = variant > 0.74 ? BiomeId.MushroomFen : BiomeId.Siltfen;
    else if (moisture > 0.63 && variant > 0.72) biome = BiomeId.Bloomwood;
    else if (moisture > 0.54 && variant > 0.55) biome = BiomeId.Birchlight;
    else if (moisture > 0.56) biome = BiomeId.Wildwood;
    if (reserveStrength > 0.62 && river < 0.58) biome = reserveBiome;
    return { height, waterline, biome, temperature, moisture, continental, river, mountain };
  }

  private createChunkGenerationTask(cx: number, cz: number): ChunkGenerationTask {
    const key = chunkKey(cx, cz);
    const chunk: Chunk = {
      key,
      cx,
      cz,
      blocks: new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT),
      heightmap: new Int16Array(CHUNK_SIZE * CHUNK_SIZE),
      biomes: new Uint8Array(CHUNK_SIZE * CHUNK_SIZE),
      group: new THREE.Group(),
      sections: new Map(),
      combinedMeshes: {},
      dirty: new Set(),
      sectionBlockCounts: new Uint16Array(SECTION_COUNT),
      skyTops: new Int16Array(CHUNK_SIZE * CHUNK_SIZE).fill(MIN_Y - 1),
      light: new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT),
      lightInitialized: false,
      lightIndices: new Set(),
      leafIndices: new Set(),
    };
    chunk.group.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
    const samples = new Map<string, ColumnSample>();
    const sample = (x: number, z: number) => {
      const sampleKey = `${x},${z}`;
      let value = samples.get(sampleKey);
      if (!value) { value = this.sampleColumn(x, z); samples.set(sampleKey, value); }
      return value;
    };
    const aquiferColumns = new Map<string, Readonly<{ wet: boolean; waterTable: number }>>();
    const aquiferColumn = (x: number, z: number) => {
      const aquiferKey = `${x},${z}`;
      let value = aquiferColumns.get(aquiferKey);
      if (!value) {
        value = Object.freeze({
          waterTable: -4 + Math.floor(7 * fbm2(x, z, this.seed ^ 0x7ed55d16, 1 / 170, 2)),
          wet: valueNoise2(x / 64, z / 64, this.seed ^ 0x94d049bd) > 0.28,
        });
        aquiferColumns.set(aquiferKey, value);
      }
      return value;
    };

    return {
      key,
      cx,
      cz,
      chunk,
      samples,
      sample,
      aquiferColumns,
      aquiferColumn,
      stage: "terrain",
      nextLocalX: 0,
      nextSection: 0,
      editsApplied: false,
    };
  }

  private generateTerrainSlice(task: ChunkGenerationTask, localXColumns = 2) {
    const { chunk, cx, cz, sample, aquiferColumn } = task;
    const endLocalX = Math.min(CHUNK_SIZE, task.nextLocalX + Math.max(1, Math.floor(localXColumns)));
    const caveFrequency = this.generationOptions.caveFrequency;
    const resourceAbundance = this.generationOptions.resourceAbundance;

    for (let lx = task.nextLocalX; lx < endLocalX; lx += 1) {
      for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
        const gx = cx * CHUNK_SIZE + lx;
        const gz = cz * CHUNK_SIZE + lz;
        const column = sample(gx, gz);
        chunk.heightmap[lx + lz * CHUNK_SIZE] = column.height;
        chunk.biomes[lx + lz * CHUNK_SIZE] = column.biome;
        if (this.celestialTerrain) {
          const celestial = this.celestialTerrain.column(gx, gz);
          for (let y = Math.max(MIN_Y, this.celestialTerrain.bounds.minY); y <= Math.min(MAX_Y, celestial.maxY); y++) {
            const type = this.celestialTerrain.block(gx, y, gz, celestial);
            if (type !== BlockId.Air) chunk.blocks[blockIndex(lx, y, lz)] = type;
          }
          continue;
        }
        const [top, filler] = this.surfaceBlocks(column.biome, column.height, column.temperature);
        const extraBedrock = 1 + Math.floor(hash2(gx, gz, this.seed ^ 0x4cf5ad43) * 4);
        const tunnelWarp = valueNoise2(gx / 76, gz / 76, this.seed ^ 0x91e10da5) * 4;
        const ravineLine = Math.abs(fbm2(gx, gz, this.seed ^ 0x165667c5, 1 / 230, 2));
        const ravineSegment = fbm2(gx, gz, this.seed ^ 0x9e3779f9, 1 / 520, 2);
        const ravineTop = column.height - 5;
        const ravineBottom = Math.max(MIN_Y + 5, column.height - 38);
        const aquifer = aquiferColumn(gx, gz);
        const neighboringAquifers = [
          aquiferColumn(gx - 1, gz),
          aquiferColumn(gx + 1, gz),
          aquiferColumn(gx, gz - 1),
          aquiferColumn(gx, gz + 1),
        ];
        const caveEntrance = caveFrequency > 0 ? this.safeCaveEntranceAt(gx, gz, column, sample) : null;
        const bankRing = [
          sample(gx - 3, gz), sample(gx + 3, gz), sample(gx, gz - 3), sample(gx, gz + 3),
          sample(gx - 2, gz - 2), sample(gx + 2, gz - 2), sample(gx - 2, gz + 2), sample(gx + 2, gz + 2),
        ];
        const nearAquaticBank = bankRing.some((neighbor) => aquaticSurfaceBiome(neighbor.biome)
          || neighbor.height <= neighbor.waterline + 2);
        const protectedCaveRoofY = nearAquaticBank
          ? Math.min(column.height - 7, Math.min(...bankRing.map((neighbor) => neighbor.height)) - 3)
          : column.height - 4;
        for (let y = MIN_Y; y <= Math.max(column.height, column.waterline); y += 1) {
          let type = BlockId.Air;
          if (y <= MIN_Y + extraBedrock) type = BlockId.Bedrock;
          else if (y <= column.height) {
            if (y === column.height) type = top;
            else if (y >= column.height - (column.biome === BiomeId.Desert || column.biome === BiomeId.Beach ? 5 : 3)) type = filler;
            else type = y < MIN_Y + 18 ? BlockId.Basalt : y < -10 ? BlockId.Deepstone : column.biome === BiomeId.Volcanic ? BlockId.Basalt : BlockId.Stone;

            const surfaceMouth = caveEntrance !== null && y >= caveEntrance.floorY && y <= column.height;
            if (caveFrequency > 0 && (y < protectedCaveRoofY || surfaceMouth) && y > MIN_Y + 4) {
              const depth = column.height - y;
              const baseCheeseThreshold = lerp(0.5, 0.34, smoothstep(12, 52, depth));
              const cheeseThreshold = caveFrequency === 1 ? baseCheeseThreshold : baseCheeseThreshold + (1 - caveFrequency) * 0.1;
              const cheeseField = valueNoise3(gx / 42, y / 50, gz / 42, this.seed ^ 0x6d2b79f5) * 0.72
                + valueNoise3(gx / 18, y / 22, gz / 18, this.seed ^ 0x27d4eb2f) * 0.28;
              const cheese = cheeseField > cheeseThreshold;
              const spaghettiWidth = caveFrequency === 1 ? 0.052 : 0.052 * caveFrequency;
              const spaghettiDepth = caveFrequency === 1 ? 0.16 : 0.16 * Math.sqrt(caveFrequency);
              const spaghetti = Math.abs(Math.sin(gx * 0.115 + y * 0.083 + gz * 0.041 + tunnelWarp)) < spaghettiWidth
                && Math.abs(Math.sin(gz * 0.129 - y * 0.071 + gx * 0.033 - tunnelWarp)) < spaghettiDepth;
              const cavernThreshold = caveFrequency === 1 ? 0.47 : 0.47 + (1 - caveFrequency) * 0.08;
              const deepCavern = y < -24 && valueNoise3(gx / 68, y / 58, gz / 68, this.seed ^ 0x5bd1e995) > cavernThreshold
                && Math.sin(gx * 0.09 + gz * 0.07 + y * 0.11) > -0.05;
              const ravineP = (y - ravineBottom) / Math.max(1, ravineTop - ravineBottom);
              const ravineWidth = caveFrequency === 1 ? 0.02 : 0.02 * caveFrequency;
              const ravine = ravineSegment > 0.1 && y > ravineBottom && y < ravineTop && ravineLine < ravineWidth * (0.35 + 0.65 * Math.sin(Math.PI * ravineP));
              const feature = caveFeatureAt(this.seed, gx, y, gz, column.height, caveFrequency);
              if (cheese || spaghetti || deepCavern || ravine || feature.chamber || feature.chimney || surfaceMouth) {
                if (y <= MIN_Y + 7) type = BlockId.Lava;
                else if (aquifer.wet && y <= aquifer.waterTable) type = BlockId.Water;
                // A cave may cut through an aquifer, but it cannot expose a
                // hydrostatic volume directly to dry air. Keep the first dry
                // cell around every wet column as its deterministic stone
                // envelope. Looking up all four world-space neighbors makes
                // the rule identical on either side of a chunk boundary.
                else if (!neighboringAquifers.some((neighbor) => neighbor.wet && y <= neighbor.waterTable)) type = BlockId.Air;
              }
            }

            if (this.generationOptions.profile === "world-below-v15" && (type === BlockId.Stone || type === BlockId.Deepstone || type === BlockId.Basalt)) {
              const effectiveAbundance = resourceAbundance * ORE_SPAWN_RATE_MULTIPLIER;
              const cellHash = hash3(Math.floor(gx / ORE_VEIN_CELL_SIZE.horizontal), Math.floor(y / ORE_VEIN_CELL_SIZE.vertical), Math.floor(gz / ORE_VEIN_CELL_SIZE.horizontal), this.seed ^ 0x1234567);
              const detailHash = hash3(gx, y, gz, this.seed ^ 0x89abcdef);
              if (y < 66 && cellHash > 1 - 0.008 * effectiveAbundance && detailHash > 0.25) type = BlockId.CoalOre;
              if (y < 48 && cellHash < 0.008 * effectiveAbundance && detailHash > 0.3) type = BlockId.IronOre;
              if (y < 54 && Math.abs(cellHash - 0.985) < 0.002 * effectiveAbundance && detailHash > 0.35) type = BlockId.CopperOre;
              if (y < 8 && Math.abs(cellHash - 0.97725) < 0.00125 * effectiveAbundance && detailHash > 0.4) type = BlockId.GoldOre;
              if (y < -24 && Math.abs(cellHash - 0.97075) < 0.00075 * effectiveAbundance && detailHash > 0.5) type = BlockId.CrystalOre;
            }
            if (type === BlockId.Stone || type === BlockId.Deepstone || type === BlockId.Basalt) {
              const veinField = hash3(Math.floor(gx / 3), Math.floor(y / 2), Math.floor(gz / 3), this.seed ^ 0x8f1bbcdc);
              const veinDetail = hash3(gx, y, gz, this.seed ^ 0x5a17d3e9);
              if (y < -16 && veinField > 1 - 0.0022 * resourceAbundance) {
                type = veinDetail > 0.992 ? BlockId.VeinmetalHeart : BlockId.LivingVein;
              }
            }
            if (type === BlockId.Stone || type === BlockId.Deepstone || type === BlockId.Basalt) {
              const accent = hash3(Math.floor(gx / 3), Math.floor(y / 3), Math.floor(gz / 3), this.seed ^ 0x73a2d49b);
              const limestoneBiome = [BiomeId.Desert, BiomeId.Beach, BiomeId.Highlands, BiomeId.Savanna].includes(column.biome);
              const slateBiome = [BiomeId.Frostpine, BiomeId.Snowfield, BiomeId.Bloomwood, BiomeId.MushroomFen].includes(column.biome);
              if (limestoneBiome && y > column.height - 24 && accent > 0.58) type = BlockId.Limestone;
              else if (slateBiome && y < column.height - 12 && accent < 0.34) type = BlockId.MoonSlate;
            }
          } else if (y <= column.waterline) {
            type = column.temperature < 0.14 && y === column.waterline ? BlockId.Ice : BlockId.Water;
          }
          if (type !== BlockId.Air) chunk.blocks[blockIndex(lx, y, lz)] = type;
        }
      }
    }

    task.nextLocalX = endLocalX;
    if (task.nextLocalX >= CHUNK_SIZE) task.stage = "caves";
  }

  private advanceChunkGeneration(task: ChunkGenerationTask, localXColumns = 2, finalizeSections = 1) {
    if (task.stage === "terrain") {
      this.generateTerrainSlice(task, localXColumns);
      return undefined;
    }
    if (task.stage === "caves") {
      if (!this.celestialTerrain && this.generationOptions.profile === "world-below-v15") this.carveGraphCaves(task.chunk, task.sample);
      task.stage = "features";
      return undefined;
    }
    if (task.stage === "features") {
      if (!this.celestialTerrain) this.generateFeatures(task.chunk, task.sample);
      task.stage = "finalize";
      return undefined;
    }
    if (task.stage !== "finalize") return task.chunk;

    const { chunk, key } = task;
    if (!task.editsApplied) {
      const saved = this.edits.get(key);
      if (saved) for (const [index, type] of saved.entries()) chunk.blocks[index] = type;
      task.editsApplied = true;
    }
    const sectionVolume = CHUNK_SIZE * CHUNK_SIZE * SECTION_HEIGHT;
    const indexedLavaCells = new Set<string>();
    const endSection = Math.min(SECTION_COUNT, task.nextSection + Math.max(1, Math.floor(finalizeSections)));
    for (let section = task.nextSection; section < endSection; section += 1) {
      const end = (section + 1) * sectionVolume;
      let occupied = 0;
      for (let index = section * sectionVolume; index < end; index += 1) {
        const type = chunk.blocks[index] as BlockId;
        if (type === BlockId.Air) continue;
        occupied += 1;
        if (type === BlockId.Lava) {
          const layer = Math.floor(index / (CHUNK_SIZE * CHUNK_SIZE));
          const horizontal = index % (CHUNK_SIZE * CHUNK_SIZE);
          const localZ = Math.floor(horizontal / CHUNK_SIZE);
          const localX = horizontal % CHUNK_SIZE;
          const cell = lavaLightCellKey(chunk.cx * CHUNK_SIZE + localX, MIN_Y + layer, chunk.cz * CHUNK_SIZE + localZ);
          if (!indexedLavaCells.has(cell)) {
            indexedLavaCells.add(cell);
            chunk.lightIndices.add(index);
          }
        } else if (blockEmitsLight(type)) chunk.lightIndices.add(index);
        if (LEAF_BLOCK_SET.has(type)) chunk.leafIndices.add(index);
        if (blocksSky(type)) chunk.skyTops[index % (CHUNK_SIZE * CHUNK_SIZE)] = MIN_Y + Math.floor(index / (CHUNK_SIZE * CHUNK_SIZE));
      }
      chunk.sectionBlockCounts[section] = occupied;
    }
    task.nextSection = endSection;
    if (task.nextSection < SECTION_COUNT) return undefined;
    this.chunks.set(key, chunk);
    this.group.add(chunk.group);
    this.freezeTerrainTransform(chunk.group);
    this.generationQueued.delete(key);
    this.generationEnqueuedAt.delete(key);
    this.streamingCompleted.generation += 1;
    task.stage = "complete";
    return chunk;
  }

  private completeChunkGenerationSynchronously(task: ChunkGenerationTask) {
    while (task.stage !== "complete") this.advanceChunkGeneration(task, CHUNK_SIZE, SECTION_COUNT);
    if (!task.chunk.lightInitialized) this.lightEngine.initializeChunk(task.chunk);
    return task.chunk;
  }

  /** Worker entry point: deterministic terrain/features/finalization without neighbor-sensitive lighting. */
  generateChunkTerrainOnly(cx: number, cz: number) {
    const key = chunkKey(cx, cz);
    const existing = this.chunks.get(key);
    if (existing) return existing;
    const task = this.createChunkGenerationTask(cx, cz);
    while (task.stage !== "complete") this.advanceChunkGeneration(task, CHUNK_SIZE, SECTION_COUNT);
    return task.chunk;
  }

  generateChunk(cx: number, cz: number) {
    const key = chunkKey(cx, cz);
    const existing = this.chunks.get(key);
    if (existing) {
      if (!existing.lightInitialized) {
        if (this.activeLightInitialization?.key === key) this.activeLightInitialization = null;
        this.lightInitializationQueued.delete(key);
        this.lightInitializationTasks.delete(key);
        this.lightEngine.initializeChunk(existing);
      }
      return existing;
    }
    let task: ChunkGenerationTask;
    if (this.activeGenerationTask?.key === key) {
      task = this.activeGenerationTask;
      this.activeGenerationTask = null;
    } else task = this.generationTasks.get(key) ?? this.createChunkGenerationTask(cx, cz);
    this.generationTasks.delete(key);
    this.generationQueued.delete(key);
    return this.completeChunkGenerationSynchronously(task);
  }

  surfaceBlocks(biome: BiomeId, height: number, temperature: number): [BlockId, BlockId] {
    if (biome === BiomeId.LumenTrench) return [BlockId.MoonSlate, hash2(height, biome, this.seed) > 0.45 ? BlockId.Deepstone : BlockId.Clay];
    if (biome === BiomeId.DeepOcean || biome === BiomeId.Ocean || biome === BiomeId.River) return [BlockId.Gravel, hash2(height, biome, this.seed) > 0.5 ? BlockId.Clay : BlockId.Sand];
    if (biome === BiomeId.Beach || biome === BiomeId.Desert) return [BlockId.Sand, BlockId.Sand];
    if (biome === BiomeId.Badlands) return [BlockId.RedSand, BlockId.SunbakedClay];
    if (biome === BiomeId.Siltfen || biome === BiomeId.MushroomFen) return [BlockId.SwampGrass, BlockId.Mud];
    if (biome === BiomeId.Savanna) return [BlockId.SavannaGrass, BlockId.Dirt];
    if (biome === BiomeId.SugarplumVale) return [BlockId.SugarplumGrass, BlockId.SugarSoil];
    if (biome === BiomeId.Glimmerwood) return [BlockId.GlimmerGrass, BlockId.Dirt];
    if (biome === BiomeId.SnowcapRange) return [BlockId.SnowyGrass, BlockId.SnowcapStone];
    if (biome === BiomeId.Snowfield || (height > 72 && temperature < 0.48)) return [BlockId.SnowyGrass, BlockId.Dirt];
    if (biome === BiomeId.Volcanic) return [BlockId.Basalt, BlockId.Basalt];
    if (biome === BiomeId.Highlands) return [height > 76 ? BlockId.Snow : BlockId.Stone, BlockId.Stone];
    if (biome === BiomeId.Meadow) return [BlockId.MeadowGrass, BlockId.Dirt];
    if (biome === BiomeId.CloudreedGlen) return [BlockId.CloudreedGrass, BlockId.Dirt];
    if (biome === BiomeId.RainveilJungle) return [BlockId.JungleGrass, BlockId.Dirt];
    if (biome === BiomeId.SakurabloomGrove) return [BlockId.SakuraGrass, BlockId.Dirt];
    return [BlockId.Grass, BlockId.Dirt];
  }

  safeCaveEntranceSiteForCell(
    cellX: number,
    cellZ: number,
    sampleColumn: (x: number, z: number) => ColumnSample = (x, z) => this.sampleColumn(x, z),
  ) {
    const key = `${cellX},${cellZ}`;
    if (this.safeCaveEntranceCache.has(key)) return this.safeCaveEntranceCache.get(key) ?? null;
    const site = resolveSafeCaveEntranceSite(this.seed, cellX, cellZ, (x, z) => {
      const column = sampleColumn(x, z);
      return {
        surfaceY: column.height,
        waterline: column.waterline,
        aquatic: aquaticSurfaceBiome(column.biome),
      };
    });
    this.safeCaveEntranceCache.set(key, site);
    return site;
  }

  safeCaveEntranceAt(
    x: number,
    z: number,
    column = this.sampleColumn(x, z),
    sampleColumn: (sampleX: number, sampleZ: number) => ColumnSample = (sampleX, sampleZ) => this.sampleColumn(sampleX, sampleZ),
  ) {
    const cellX = Math.floor(x / CAVE_ENTRANCE_CELL_SIZE);
    const cellZ = Math.floor(z / CAVE_ENTRANCE_CELL_SIZE);
    const site = this.safeCaveEntranceSiteForCell(cellX, cellZ, sampleColumn);
    const entrance = caveEntranceSampleForSite(site, x, z);
    return entrance && column.height >= site!.minimumSurfaceY ? entrance : null;
  }

  undergroundBiomeAt(x: number, y: number, z: number) {
    return sampleUndergroundBiome(this.seed, x, y, z);
  }

  /**
   * Deterministic graph-first cave pass. Noise remains as irregular secondary
   * texture, but every authored mouth is joined to a globally connected hub
   * lattice before ecological rooms are decorated.
   */
  private carveGraphCaves(chunk: Chunk, sample: (x: number, z: number) => ColumnSample) {
    const frequency = this.generationOptions.caveFrequency;
    if (frequency <= 0) return;
    const minX = chunk.cx * CHUNK_SIZE;
    const minZ = chunk.cz * CHUNK_SIZE;
    const maxX = minX + CHUNK_SIZE - 1;
    const maxZ = minZ + CHUNK_SIZE - 1;
    const volume = CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT;
    const carveMask = new Uint8Array(volume);
    const biomeMask = new Uint8Array(volume);
    const roadMask = new Uint8Array(volume);
    const streamMask = new Uint8Array(volume);
    const waterfallMask = new Uint8Array(volume);
    const basinMask = new Uint8Array(volume);
    const basinSealMask = new Uint8Array(volume);
    const radiusScale = clamp(0.72 + Math.sqrt(frequency) * 0.28, 0.72, 1.35);

    const mark = (
      x: number,
      y: number,
      z: number,
      biome = UndergroundBiomeId.OrdinaryTunnel,
      road = false,
      liquidSurface = MIN_Y - 1,
      allowSurface = false,
      settleStream = false,
      settleBasin = false,
    ) => {
      if (x < minX || x > maxX || z < minZ || z > maxZ || y <= MIN_Y + 4 || y > MAX_Y) return -1;
      const column = sample(x, z);
      if (y > column.height || (!allowSurface && y > column.height - 4)) return -1;
      const index = blockIndex(x - minX, y, z - minZ);
      carveMask[index] = 1;
      if (biome !== UndergroundBiomeId.OrdinaryTunnel) biomeMask[index] = biome;
      if (road) roadMask[index] = 1;
      if (settleStream) streamMask[index] = 1;
      if (settleBasin) {
        if (y <= liquidSurface) basinMask[index] = biome === UndergroundBiomeId.EmberdeepFumaroles ? 2 : 1;
      }
      return index;
    };

    const sphere = (
      centerX: number,
      centerY: number,
      centerZ: number,
      radiusX: number,
      radiusY: number,
      radiusZ: number,
      biome = UndergroundBiomeId.OrdinaryTunnel,
      road = false,
      liquidSurface = MIN_Y - 1,
      allowSurface = false,
      settleStream = false,
      settleBasin = false,
    ) => {
      const startX = Math.max(minX, Math.floor(centerX - radiusX));
      const endX = Math.min(maxX, Math.ceil(centerX + radiusX));
      const startZ = Math.max(minZ, Math.floor(centerZ - radiusZ));
      const endZ = Math.min(maxZ, Math.ceil(centerZ + radiusZ));
      const startY = Math.max(MIN_Y + 5, Math.floor(centerY - radiusY));
      const endY = Math.min(MAX_Y, Math.ceil(centerY + radiusY));
      for (let x = startX; x <= endX; x += 1) for (let z = startZ; z <= endZ; z += 1) for (let y = startY; y <= endY; y += 1) {
        const distance = ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2 + ((z - centerZ) / radiusZ) ** 2;
        if (distance <= 1) mark(x, y, z, biome, road, liquidSurface, allowSurface, settleStream, settleBasin);
      }
      if (settleBasin && liquidSurface > MIN_Y - 1) {
        // A pool is a water-bearing geological room, not a free-standing
        // liquid ellipsoid. Author its stone envelope from the same global
        // shape so intersections with noise caves or other graph rooms cannot
        // punch open its floor and submerged sides. The expanded bounds make
        // the seal deterministic across chunk seams.
        const shell = 1.5;
        const sealStartX = Math.max(minX, Math.floor(centerX - radiusX - shell));
        const sealEndX = Math.min(maxX, Math.ceil(centerX + radiusX + shell));
        const sealStartZ = Math.max(minZ, Math.floor(centerZ - radiusZ - shell));
        const sealEndZ = Math.min(maxZ, Math.ceil(centerZ + radiusZ + shell));
        const sealStartY = Math.max(MIN_Y + 5, Math.floor(centerY - radiusY - shell));
        const sealEndY = Math.min(MAX_Y, Math.min(liquidSurface, Math.ceil(centerY + radiusY + shell)));
        const sealType = biome === UndergroundBiomeId.EmberdeepFumaroles ? 2 : 1;
        for (let x = sealStartX; x <= sealEndX; x += 1) for (let z = sealStartZ; z <= sealEndZ; z += 1) for (let y = sealStartY; y <= sealEndY; y += 1) {
          const innerDistance = ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2 + ((z - centerZ) / radiusZ) ** 2;
          if (innerDistance <= 1) continue;
          const outerDistance = ((x - centerX) / (radiusX + shell)) ** 2
            + ((y - centerY) / (radiusY + shell)) ** 2
            + ((z - centerZ) / (radiusZ + shell)) ** 2;
          if (outerDistance > 1) continue;
          const column = sample(x, z);
          if (y > column.height - 4) continue;
          basinSealMask[blockIndex(x - minX, y, z - minZ)] = sealType;
        }
      }
    };

    const tunnel = (
      from: Readonly<{ x: number; y: number; z: number }>,
      to: Readonly<{ x: number; y: number; z: number }>,
      radius: number,
      road = false,
      allowSurface = false,
      biome = UndergroundBiomeId.OrdinaryTunnel,
      settleStream = false,
      fallingWater = false,
    ) => {
      const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
      const steps = Math.max(1, Math.ceil(distance / 1.35));
      for (let step = 0; step <= steps; step += 1) {
        const progress = step / steps;
        const wobble = Math.sin(progress * Math.PI * 4 + from.x * 0.031 + from.z * 0.023) * 0.7;
        sphere(
          lerp(from.x, to.x, progress) + wobble,
          lerp(from.y, to.y, progress) + Math.sin(progress * Math.PI * 2) * 0.45,
          lerp(from.z, to.z, progress) - wobble * 0.65,
          radius,
          radius * 0.86,
          radius,
          biome,
          road,
          MIN_Y - 1,
          allowSurface,
          settleStream,
          false,
        );
      }
      if (fallingWater) {
        // Waterfalls follow the tunnel centerline as a narrow cascade. Filling
        // each tunnel sphere to its roof produced four-to-five-block-wide
        // tubes whose exposed sides read as gigantic freestanding pillars.
        const cascadeSteps = Math.max(1, Math.ceil(distance / 0.55));
        let previous: Readonly<{ x: number; y: number; z: number }> | null = null;
        const fillCascadeCell = (x: number, y: number, z: number) => {
          const index = mark(x, y, z, biome);
          if (index >= 0) waterfallMask[index] = 1;
        };
        for (let step = 0; step <= cascadeSteps; step += 1) {
          const progress = step / cascadeSteps;
          const wobble = Math.sin(progress * Math.PI * 4 + from.x * 0.031 + from.z * 0.023) * 0.7;
          const x = Math.round(lerp(from.x, to.x, progress) + wobble);
          const y = Math.round(lerp(from.y, to.y, progress) + Math.sin(progress * Math.PI * 2) * 0.45);
          const z = Math.round(lerp(from.z, to.z, progress) - wobble * 0.65);
          if (previous) {
            // Rounding a diagonal line can otherwise make two liquid voxels
            // touch only at an edge. Bridge each changed axis in a stable
            // order so the narrow cascade is physically face-connected.
            let bridgeX: number = previous.x;
            let bridgeY: number = previous.y;
            let bridgeZ: number = previous.z;
            while (bridgeY !== y) { bridgeY += Math.sign(y - bridgeY); fillCascadeCell(bridgeX, bridgeY, bridgeZ); }
            while (bridgeX !== x) { bridgeX += Math.sign(x - bridgeX); fillCascadeCell(bridgeX, bridgeY, bridgeZ); }
            while (bridgeZ !== z) { bridgeZ += Math.sign(z - bridgeZ); fillCascadeCell(bridgeX, bridgeY, bridgeZ); }
          } else fillCascadeCell(x, y, z);
          previous = { x, y, z };
        }
      }
    };

    const expanded = CAVE_GRAPH_MAX_RADIUS + 8;
    const edges = caveGraphEdgesInBounds(this.seed, minX - expanded, maxX + expanded, minZ - expanded, maxZ + expanded);
    for (const edge of edges) {
      const edgeMinX = Math.min(edge.from.x, edge.to.x) - edge.radius - 2;
      const edgeMaxX = Math.max(edge.from.x, edge.to.x) + edge.radius + 2;
      const edgeMinZ = Math.min(edge.from.z, edge.to.z) - edge.radius - 2;
      const edgeMaxZ = Math.max(edge.from.z, edge.to.z) + edge.radius + 2;
      if (edgeMaxX < minX || edgeMinX > maxX || edgeMaxZ < minZ || edgeMinZ > maxZ) continue;
      const edgeRadius = edge.radius * radiusScale;
      const waterBiome = edge.flow === "dry" ? UndergroundBiomeId.OrdinaryTunnel : UndergroundBiomeId.GlasswaterDeeps;
      tunnel(edge.from, edge.to, edgeRadius, edge.stoneRoad, false, waterBiome, edge.flow === "stream", edge.flow === "waterfall");
    }

    const nodes = caveGraphNodesInBounds(this.seed, minX - expanded, maxX + expanded, minZ - expanded, maxZ + expanded);
    for (const node of nodes) {
      const liquid = node.biome === UndergroundBiomeId.GlasswaterDeeps
        ? Math.floor(node.y - Math.max(1, node.radiusY * 0.22))
        : node.biome === UndergroundBiomeId.EmberdeepFumaroles && node.y < -34
          ? Math.floor(node.y - Math.max(3, node.radiusY * 0.56)) : MIN_Y - 1;
      sphere(
        node.x,
        node.y,
        node.z,
        node.radiusX * radiusScale,
        node.radiusY * radiusScale,
        node.radiusZ * radiusScale,
        node.biome,
        false,
        liquid,
        false,
        false,
        liquid > MIN_Y - 1,
      );
    }

    // Every eligible surface funnel gets an explicit descending connector.
    const entranceMinCellX = Math.floor((minX - expanded) / CAVE_ENTRANCE_CELL_SIZE);
    const entranceMaxCellX = Math.floor((maxX + expanded) / CAVE_ENTRANCE_CELL_SIZE);
    const entranceMinCellZ = Math.floor((minZ - expanded) / CAVE_ENTRANCE_CELL_SIZE);
    const entranceMaxCellZ = Math.floor((maxZ + expanded) / CAVE_ENTRANCE_CELL_SIZE);
    for (let cellX = entranceMinCellX; cellX <= entranceMaxCellX; cellX += 1) for (let cellZ = entranceMinCellZ; cellZ <= entranceMaxCellZ; cellZ += 1) {
      const entrance = this.safeCaveEntranceSiteForCell(cellX, cellZ, sample);
      if (!entrance) continue;
      const column = sample(entrance.centerX, entrance.centerZ);
      const target = nearestUpperCaveNode(this.seed, entrance.centerX, entrance.centerZ);
      const throatTarget = {
        x: entrance.centerX,
        y: Math.min(column.height - 7, entrance.rimY - 6),
        z: entrance.centerZ,
      };
      tunnel({ x: entrance.centerX, y: entrance.rimY - 1, z: entrance.centerZ }, throatTarget, Math.max(1.55, entrance.radius * 0.45) * radiusScale, false, true);
      tunnel(throatTarget, target, 2.15 * radiusScale, false, false);
    }

    const isFluid = (block: BlockId) => block === BlockId.Water || block === BlockId.Lava;
    const floorBlock = (biome: UndergroundBiomeId, hash: number) => biome === UndergroundBiomeId.RootweaveGrotto
      ? (hash > 0.46 ? BlockId.RootweaveSoil : BlockId.GrottoMoss)
      : biome === UndergroundBiomeId.StarbloomHollows ? (hash > 0.58 ? BlockId.GrottoMoss : BlockId.RootweaveSoil)
        : biome === UndergroundBiomeId.GlasswaterDeeps ? (hash > 0.72 ? BlockId.MineralCrust : BlockId.GlasswaterStone)
          : biome === UndergroundBiomeId.PillarstoneReaches ? (hash > 0.82 ? BlockId.FossilStone : hash > 0.4 ? BlockId.Flowstone : BlockId.Pillarstone)
            : biome === UndergroundBiomeId.CrystaldeepGallery ? (hash > 0.82 ? BlockId.BuddingCrystal : BlockId.CrystaldeepStone)
              : (hash > 0.74 ? BlockId.MineralTerrace : hash > 0.42 ? BlockId.SulfurStone : BlockId.HeatCrackedRock);
    // The legacy noise pass can leave aquifer water immediately outside a dry
    // graph tunnel. Seal a one-block shell before carving so routes travel
    // through rock rather than becoming impossible air tubes inside water.
    // Wet graph rooms and stream cells are already in carveMask, so their
    // authored water remains connected and large underwater caves survive.
    const dryShellMask = new Uint8Array(volume);
    for (let index = 0; index < volume; index += 1) {
      if (!carveMask[index]) continue;
      const layer = Math.floor(index / (CHUNK_SIZE * CHUNK_SIZE));
      const y = MIN_Y + layer;
      const horizontal = index % (CHUNK_SIZE * CHUNK_SIZE);
      const lx = horizontal % CHUNK_SIZE;
      const lz = Math.floor(horizontal / CHUNK_SIZE);
      for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        const shellX = lx + dx;
        const shellY = y + dy;
        const shellZ = lz + dz;
        if (shellX < 0 || shellX >= CHUNK_SIZE || shellZ < 0 || shellZ >= CHUNK_SIZE || shellY < MIN_Y || shellY > MAX_Y) continue;
        const shellIndex = blockIndex(shellX, shellY, shellZ);
        if (!carveMask[shellIndex]) dryShellMask[shellIndex] = 1;
      }
    }
    for (let index = 0; index < volume; index += 1) {
      if (!dryShellMask[index] || !isFluid(chunk.blocks[index] as BlockId)) continue;
      const y = MIN_Y + Math.floor(index / (CHUNK_SIZE * CHUNK_SIZE));
      chunk.blocks[index] = y < MIN_Y + 18 ? BlockId.Basalt : y < -10 ? BlockId.Deepstone : BlockId.Stone;
    }
    for (let index = 0; index < volume; index += 1) {
      if (!carveMask[index]) continue;
      const current = chunk.blocks[index] as BlockId;
      if (current === BlockId.Bedrock) continue;
      chunk.blocks[index] = BlockId.Air;
    }

    // Restore the geological shell after all cave volumes have been unioned.
    // This makes water/lava rooms watertight without a flood-fill dependency
    // on neighboring chunk load order. Existing solid strata remain intact;
    // only openings and unrelated legacy fluid inside the authored annulus are
    // replaced with the ecological room's wall material.
    for (let index = 0; index < volume; index += 1) {
      const sealType = basinSealMask[index];
      if (!sealType || basinMask[index]) continue;
      const current = chunk.blocks[index] as BlockId;
      if (current !== BlockId.Air && !isFluid(current)) continue;
      const layer = Math.floor(index / (CHUNK_SIZE * CHUNK_SIZE));
      const y = MIN_Y + layer;
      const horizontal = index % (CHUNK_SIZE * CHUNK_SIZE);
      const lx = horizontal % CHUNK_SIZE;
      const lz = Math.floor(horizontal / CHUNK_SIZE);
      const biome = sealType === 2 ? UndergroundBiomeId.EmberdeepFumaroles : UndergroundBiomeId.GlasswaterDeeps;
      chunk.blocks[index] = floorBlock(biome, hash3(minX + lx, y, minZ + lz, this.seed ^ 0x2d98c47a));
    }

    // Ecological pools keep their authored ellipsoid and liquid plane. Their
    // new annulus supplies the floor and banks, so volume no longer needs to
    // be conserved by stacking a column through a lower intersecting cavern.
    for (let index = 0; index < volume; index += 1) {
      const basinType = basinMask[index];
      if (!basinType || chunk.blocks[index] === BlockId.Bedrock) continue;
      chunk.blocks[index] = basinType === 2 ? BlockId.Lava : BlockId.Water;
    }

    // Intentional falls are the sole uncontained vertical liquid. They are a
    // one-block centerline, never the full width of their surrounding tunnel.
    for (let index = 0; index < volume; index += 1) {
      if (!waterfallMask[index] || basinMask[index] === 2 || chunk.blocks[index] === BlockId.Bedrock) continue;
      chunk.blocks[index] = BlockId.Water;
    }

    // Horizontal cave streams are authored as tunnel volumes, then settled
    // independently in each column. Painting them at the tunnel center made a
    // suspended sheet whenever an edge crossed a cathedral-sized chamber.
    // Following the contiguous open column keeps the water on the local cave
    // floor even when the graph route intersects an older noise cavern. A solid
    // voxel or an existing basin stops the descent. Waterfalls keep their
    // narrow centerline while ecological basins keep their sealed volume.
    for (let lz = 0; lz < CHUNK_SIZE; lz += 1) for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
      let y = MIN_Y + 5;
      while (y <= MAX_Y) {
        let index = blockIndex(lx, y, lz);
        if (!streamMask[index]) {
          y += 1;
          continue;
        }

        const runBottom = y;
        while (y <= MAX_Y && streamMask[blockIndex(lx, y, lz)]) y += 1;

        let settledY = runBottom;
        while (settledY > MIN_Y + 5) {
          const belowIndex = blockIndex(lx, settledY - 1, lz);
          if (!carveMask[belowIndex] && chunk.blocks[belowIndex] !== BlockId.Air) break;
          settledY -= 1;
        }
        index = blockIndex(lx, settledY, lz);
        const biome = biomeMask[index] as UndergroundBiomeId;
        chunk.blocks[index] = biome === UndergroundBiomeId.EmberdeepFumaroles ? BlockId.Lava : BlockId.Water;
      }
    }

    for (let index = 0; index < volume; index += 1) {
      if (!carveMask[index]) continue;
      const biome = biomeMask[index] as UndergroundBiomeId;
      if (biome === UndergroundBiomeId.OrdinaryTunnel && !roadMask[index]) continue;
      const layer = Math.floor(index / (CHUNK_SIZE * CHUNK_SIZE));
      const y = MIN_Y + layer;
      if (y <= MIN_Y + 5 || y >= MAX_Y - 1) continue;
      const columnIndex = index % (CHUNK_SIZE * CHUNK_SIZE);
      const lx = columnIndex % CHUNK_SIZE;
      const lz = Math.floor(columnIndex / CHUNK_SIZE);
      const x = minX + lx;
      const z = minZ + lz;
      const belowIndex = index - CHUNK_SIZE * CHUNK_SIZE;
      const aboveIndex = index + CHUNK_SIZE * CHUNK_SIZE;
      const current = chunk.blocks[index] as BlockId;
      const below = chunk.blocks[belowIndex] as BlockId;
      const above = chunk.blocks[aboveIndex] as BlockId;
      const detail = hash3(x, y, z, this.seed ^ 0x4f1bbcdc);
      const belowSolid = below !== BlockId.Air && !isFluid(below) && BLOCKS[below]?.solid;
      const aboveSolid = above !== BlockId.Air && !isFluid(above) && BLOCKS[above]?.solid;
      if (roadMask[index] && belowSolid) {
        chunk.blocks[belowIndex] = detail > 0.78 ? BlockId.CaveBridge : BlockId.StoneBrick;
        if (current === BlockId.Air && detail > 0.992) chunk.blocks[index] = BlockId.CaveMarker;
        continue;
      }
      if (biome === UndergroundBiomeId.OrdinaryTunnel) continue;
      if (belowSolid) {
        chunk.blocks[belowIndex] = floorBlock(biome, detail);
        if ((biome === UndergroundBiomeId.CrystaldeepGallery || biome === UndergroundBiomeId.PillarstoneReaches) && detail > 0.993) {
          chunk.blocks[belowIndex] = detail > 0.9985 ? BlockId.VeinmetalHeart : BlockId.LivingVein;
        }
        if (current === BlockId.Air) {
          if (biome === UndergroundBiomeId.RootweaveGrotto && detail > 0.94) chunk.blocks[index] = BlockId.LivingRoot;
          else if (biome === UndergroundBiomeId.StarbloomHollows && detail > 0.965 && y + 1 <= MAX_Y && chunk.blocks[aboveIndex] === BlockId.Air) {
            chunk.blocks[index] = BlockId.StarbloomStem;
            chunk.blocks[aboveIndex] = BlockId.StarbloomCap;
          } else if (biome === UndergroundBiomeId.StarbloomHollows && detail > 0.9) chunk.blocks[index] = detail > 0.945 ? BlockId.LanternBloom : BlockId.SporePod;
          else if (biome === UndergroundBiomeId.CrystaldeepGallery && detail > 0.91) chunk.blocks[index] = BlockId.CrystalCluster;
          else if (biome === UndergroundBiomeId.EmberdeepFumaroles && detail > 0.94) chunk.blocks[index] = detail > 0.982 ? BlockId.FumaroleVent : BlockId.SulfurGrowth;
        } else if (current === BlockId.Water && biome === UndergroundBiomeId.GlasswaterDeeps && detail > 0.91) {
          chunk.blocks[index] = detail > 0.965 ? BlockId.EggReed : detail > 0.935 ? BlockId.LuminousAlgae : BlockId.CaveReed;
        }
      }
      if (aboveSolid) {
        chunk.blocks[aboveIndex] = floorBlock(biome, 1 - detail);
        if (current === BlockId.Air) {
          if (biome === UndergroundBiomeId.RootweaveGrotto && detail < 0.055) chunk.blocks[index] = detail < 0.018 ? BlockId.LuminousRoot : BlockId.HangingRoot;
          else if (biome === UndergroundBiomeId.StarbloomHollows && detail < 0.05) chunk.blocks[index] = BlockId.LuminousGills;
        }
      }
    }

    for (const node of nodes) {
      if (node.x < minX || node.x > maxX || node.z < minZ || node.z > maxZ || !node.poi) continue;
      const lx = node.x - minX;
      const lz = node.z - minZ;
      let floorY = Math.floor(node.y);
      while (floorY > MIN_Y + 5) {
        const block = chunk.blocks[blockIndex(lx, floorY, lz)] as BlockId;
        if (block !== BlockId.Air && !isFluid(block) && BLOCKS[block]?.solid) break;
        floorY -= 1;
      }
      const standY = floorY + 1;
      const setLocal = (dx: number, dy: number, dz: number, block: BlockId) => {
        const x = node.x + dx; const y = standY + dy; const z = node.z + dz;
        if (x < minX || x > maxX || z < minZ || z > maxZ || y < MIN_Y || y > MAX_Y) return;
        chunk.blocks[blockIndex(x - minX, y, z - minZ)] = block;
      };
      if (node.poi === "delver-camp") {
        for (let dx = -2; dx <= 2; dx += 1) for (let dz = -2; dz <= 2; dz += 1) setLocal(dx, -1, dz, BlockId.CaveBridge);
        setLocal(-1, 0, 0, BlockId.Torch); setLocal(1, 0, 0, BlockId.Chest);
      } else if (node.poi === "fossil-bed") {
        for (let dx = -3; dx <= 3; dx += 1) setLocal(dx, -1, (dx * dx + node.cellZ) % 3 - 1, BlockId.FossilStone);
      } else if (node.poi === "fungal-sanctum") {
        setLocal(0, 0, 0, BlockId.StarbloomStem); setLocal(0, 1, 0, BlockId.StarbloomCap);
        for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) setLocal(dx, 0, dz, BlockId.LanternBloom);
      } else if (node.poi === "drowned-ruin") {
        for (let dx = -2; dx <= 2; dx += 1) for (let dz = -2; dz <= 2; dz += 1) if (Math.abs(dx) === 2 || Math.abs(dz) === 2) setLocal(dx, 0, dz, BlockId.ReflectiveShale);
        setLocal(0, 0, 0, BlockId.Chest);
      } else if (node.poi === "rope-bridge") {
        for (let dx = -5; dx <= 5; dx += 1) setLocal(dx, 0, 0, BlockId.CaveBridge);
        setLocal(-5, 1, 0, BlockId.RopeAnchor); setLocal(5, 1, 0, BlockId.RopeAnchor);
      } else if (node.poi === "crystal-shrine") {
        for (let dy = 0; dy <= 3; dy += 1) setLocal(0, dy, 0, dy === 3 ? BlockId.ResonantCrystal : BlockId.CrystaldeepStone);
        for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) setLocal(dx, 0, dz, BlockId.CrystalCluster);
      } else if (node.poi === "challenge-vault") {
        for (let dx = -2; dx <= 2; dx += 1) for (let dz = -2; dz <= 2; dz += 1) if (Math.abs(dx) === 2 || Math.abs(dz) === 2) setLocal(dx, 0, dz, BlockId.StoneBrick);
        setLocal(0, 0, 0, BlockId.Chest); setLocal(0, 1, -2, BlockId.CaveMarker);
      } else if (node.poi === "vent-forge") {
        setLocal(0, 0, 0, BlockId.Furnace); setLocal(-2, 0, 0, BlockId.FumaroleVent); setLocal(2, 0, 0, BlockId.FumaroleVent);
      } else {
        for (let dy = 0; dy < 3; dy += 1) setLocal(0, dy, 0, dy === 2 ? BlockId.CaveMarker : BlockId.Pillarstone);
      }

      const markerPosition = { x: node.x, y: standY + 1, z: node.z };
      const landmark: StructureMarker = { type: "landmark", id: node.id, position: markerPosition, tag: `underground:${node.poi}:${node.biome}`, mapLayer: "underground" };
      this.structureMarkers.set(`${node.id}:landmark`, landmark);
      if (["delver-camp", "drowned-ruin", "challenge-vault"].includes(node.poi)) {
        const chestPosition = { x: node.x + (node.poi === "delver-camp" ? 1 : 0), y: standY, z: node.z };
        const chest: StructureMarker = { type: "chest", id: `${node.id}:cache`, position: chestPosition, lootTable: "adventure-cache", loot: rollStructureLoot("adventure-cache", `${this.seedText}:${node.id}`, node.grand ? 6 : 4) };
        this.structureMarkers.set(`${node.id}:chest`, chest);
      }
      const mobKind = node.biome === UndergroundBiomeId.RootweaveGrotto ? "grotto-grazer"
        : node.biome === UndergroundBiomeId.StarbloomHollows ? "chimewing"
          : node.biome === UndergroundBiomeId.GlasswaterDeeps ? (node.grand ? "lanternray" : "glassback-newt")
            : node.biome === UndergroundBiomeId.PillarstoneReaches ? (node.grand ? "grotto-grazer" : "ashnose-bat")
              : node.biome === UndergroundBiomeId.CrystaldeepGallery ? (node.grand ? "prismtail-swift" : "veinling")
                : (node.grand ? "cinder-kite" : "ashnose-bat");
      const spawn: StructureMarker = { type: "spawn", id: `${node.id}:ecology`, position: markerPosition, mobKind, count: node.grand ? 3 : 2, radius: Math.max(5, Math.floor(node.ecologyRadius)), persistent: true, tags: ["dungeon", `underground-biome:${node.biome}`, `cave-node:${node.id}`, "ecological-center:true"] };
      this.structureMarkers.set(`${node.id}:spawn`, spawn);
    }
  }

  generateFeatures(chunk: Chunk, sample: (x: number, z: number) => ColumnSample) {
    const minX = chunk.cx * CHUNK_SIZE;
    const minZ = chunk.cz * CHUNK_SIZE;
    const inside = (x: number, z: number) => x >= minX && x < minX + CHUNK_SIZE && z >= minZ && z < minZ + CHUNK_SIZE;
    const legacyClearings: Array<Readonly<{ minX: number; maxX: number; minZ: number; maxZ: number }>> = [];
    const plannedTreeLogs: TreePlanBlock[] = [];
    const plannedTreeLeaves: TreePlanBlock[] = [];
    const generatedTreePlans: TreePlanBlock[][] = [];
    const suppressedTreePlans = new Set<number>();
    const treeBlockKey = (placement: Pick<TreePlanBlock, "x" | "y" | "z">) => `${placement.x},${placement.y},${placement.z}`;
    const queueTreePlan = (plan: TreePlanBlock[]) => {
      generatedTreePlans.push(plan);
      for (const placement of plan) (LEAF_BLOCK_SET.has(placement.block) ? plannedTreeLeaves : plannedTreeLogs).push(placement);
    };
    const set = (x: number, y: number, z: number, type: BlockId, onlyAir = true) => {
      if (!inside(x, z) || y < MIN_Y || y > MAX_Y) return;
      const lx = x - minX;
      const lz = z - minZ;
      const index = blockIndex(lx, y, lz);
      const current = chunk.blocks[index] as BlockId;
      // Generated flora may replace another plant, but never a liquid. This
      // keeps vegetation from plugging rivers or the new syrup/honey cells.
      if (onlyAir && BLOCKS[current]?.liquid) return;
      if (!onlyAir || current === BlockId.Air || BLOCKS[current]?.replaceable) {
        for (const edit of planDoubleTallGrassReplacement(current, type, { x, y, z }, (bx, by, bz) => {
          if (!inside(bx, bz) || by < MIN_Y || by > MAX_Y) return undefined;
          return chunk.blocks[blockIndex(bx - minX, by, bz - minZ)] as BlockId;
        })) chunk.blocks[blockIndex(edit.x - minX, edit.y, edit.z - minZ)] = edit.type;
        chunk.blocks[index] = type;
      }
    };
    const clearGeneratedGrowth = (bounds: Readonly<{ minX: number; maxX: number; minZ: number; maxZ: number }>) => {
      // Rectangular padding can always slice a different tree at its outer
      // edge. Instead, any generated tree touching the requested clearing is
      // suppressed as one deterministic plan, including its cross-chunk crown.
      const newlySuppressed: number[] = [];
      for (let planIndex = 0; planIndex < generatedTreePlans.length; planIndex += 1) {
        if (suppressedTreePlans.has(planIndex)) continue;
        const plan = generatedTreePlans[planIndex];
        if (!plan.some((placement) => placement.x >= bounds.minX && placement.x <= bounds.maxX
          && placement.z >= bounds.minZ && placement.z <= bounds.maxZ)) continue;
        suppressedTreePlans.add(planIndex);
        newlySuppressed.push(planIndex);
      }
      const affectedTreeCells = new Set<string>();
      for (const planIndex of newlySuppressed) for (const placement of generatedTreePlans[planIndex]) {
        if (inside(placement.x, placement.z)) affectedTreeCells.add(treeBlockKey(placement));
      }
      const survivingTreeCells = new Map<string, TreePlanBlock>();
      if (affectedTreeCells.size) for (let planIndex = 0; planIndex < generatedTreePlans.length; planIndex += 1) {
        if (suppressedTreePlans.has(planIndex)) continue;
        for (const placement of generatedTreePlans[planIndex]) {
          const key = treeBlockKey(placement);
          if (!affectedTreeCells.has(key)) continue;
          const existing = survivingTreeCells.get(key);
          if (!existing || (LEAF_BLOCK_SET.has(existing.block) && !LEAF_BLOCK_SET.has(placement.block))) survivingTreeCells.set(key, placement);
        }
      }
      for (const key of affectedTreeCells) {
        const [x, y, z] = key.split(",").map(Number);
        const index = blockIndex(x - minX, y, z - minZ);
        const current = chunk.blocks[index] as BlockId;
        // A later authored structure may overlap a clearing processed earlier;
        // never erase it merely because a natural tree used to own this cell.
        if (!GENERATED_TREE_BLOCK_SET.has(current)) continue;
        chunk.blocks[index] = survivingTreeCells.get(key)?.block ?? BlockId.Air;
      }

      const startX = Math.max(minX, Math.floor(bounds.minX));
      const endX = Math.min(minX + CHUNK_SIZE - 1, Math.ceil(bounds.maxX));
      const startZ = Math.max(minZ, Math.floor(bounds.minZ));
      const endZ = Math.min(minZ + CHUNK_SIZE - 1, Math.ceil(bounds.maxZ));
      if (startX > endX || startZ > endZ) return;
      for (let x = startX; x <= endX; x += 1) for (let z = startZ; z <= endZ; z += 1) {
        const lx = x - minX;
        const lz = z - minZ;
        for (let y = MIN_Y; y <= MAX_Y; y += 1) {
          const index = blockIndex(lx, y, lz);
          const growth = chunk.blocks[index] as BlockId;
          if (GENERATED_GROWTH_BLOCK_SET.has(growth)) chunk.blocks[index] = isWaterloggedFloraBlock(growth) ? BlockId.Water : BlockId.Air;
        }
      }
    };

    const syrupPondCells = new Set<string>();
    const syrupPonds = planSyrupPondsForChunk({
      seed: this.seedText,
      chunkX: chunk.cx,
      chunkZ: chunk.cz,
      chunkSize: CHUNK_SIZE,
      sample,
      sugarplumBiome: BiomeId.SugarplumVale,
    });
    for (const pond of syrupPonds) for (const column of pond.columns) {
      const lx = column.x - minX;
      const lz = column.z - minZ;
      syrupPondCells.add(`${column.x},${column.z}`);
      for (let y = column.bedY + 1; y <= Math.max(column.surfaceY, column.originalSurfaceY); y += 1) set(column.x, y, column.z, BlockId.Air, false);
      set(column.x, column.bedY, column.z, column.floor, false);
      for (let y = column.bedY + 1; y <= column.surfaceY; y += 1) set(column.x, y, column.z, column.liquid, false);
      chunk.heightmap[lx + lz * CHUNK_SIZE] = column.bedY;
    }

    // Tree centers live on a coarse jittered lattice with an eight-block
    // minimum axis separation. Broad crowns may mingle, but authored wood from
    // neighboring trees can no longer merge into one accidental trunk entity.
    const cellSize = 9;
    for (let cellX = Math.floor((minX - 8) / cellSize); cellX <= Math.floor((minX + CHUNK_SIZE + 8) / cellSize); cellX += 1) {
      for (let cellZ = Math.floor((minZ - 8) / cellSize); cellZ <= Math.floor((minZ + CHUNK_SIZE + 8) / cellSize); cellZ += 1) {
        const x = cellX * cellSize + 4 + Math.floor(hash2(cellX, cellZ, this.seed ^ 0x11111111) * 2);
        const z = cellZ * cellSize + 4 + Math.floor(hash2(cellX, cellZ, this.seed ^ 0x22222222) * 2);
        if (x * x + z * z < 28) continue;
        const column = sample(x, z);
        if (this.safeCaveEntranceAt(x, z, column)) continue;
        if (syrupPondColumnAt(this.seedText, x, z, sample, BiomeId.SugarplumVale)) continue;
        const roll = hash2(cellX, cellZ, this.seed ^ 0x33333333);
        const density: Partial<Record<BiomeId, number>> = {
          [BiomeId.Meadow]: 0.06,
          [BiomeId.Wildwood]: 0.42,
          [BiomeId.Frostpine]: 0.33,
          [BiomeId.Savanna]: 0.11,
          [BiomeId.Siltfen]: 0.2,
          [BiomeId.Birchlight]: 0.34,
          [BiomeId.Bloomwood]: 0.38,
          [BiomeId.Snowfield]: 0.07,
          [BiomeId.MushroomFen]: 0.23,
          [BiomeId.CloudreedGlen]: 0.16,
          [BiomeId.RainveilJungle]: 0.5,
          [BiomeId.SakurabloomGrove]: 0.36,
          [BiomeId.SugarplumVale]: 0.34,
          [BiomeId.Glimmerwood]: 0.43,
          [BiomeId.SnowcapRange]: 0.18,
        };
        // The larger cell has 81/16 the area of the legacy lattice. Scale the
        // chance accordingly so forests remain full even though trunks no
        // longer spawn close enough to fuse.
        const treeChance = Math.min(0.98, (density[column.biome] ?? 0) * (cellSize * cellSize / 16));
        if (roll < treeChance && column.height > column.waterline + 1) {
          const trunk = column.biome === BiomeId.Frostpine || column.biome === BiomeId.Snowfield ? BlockId.PineLog
            : column.biome === BiomeId.SnowcapRange ? BlockId.PineLog
            : column.biome === BiomeId.Birchlight ? BlockId.BirchLog
              : column.biome === BiomeId.Bloomwood ? BlockId.BloomLog
                : column.biome === BiomeId.RainveilJungle ? BlockId.JungleLog
                  : column.biome === BiomeId.SakurabloomGrove ? BlockId.SakuraLog
                    : column.biome === BiomeId.SugarplumVale ? BlockId.CandywoodLog
                      : column.biome === BiomeId.Glimmerwood ? BlockId.MoonboughLog
                      : column.biome === BiomeId.CloudreedGlen ? BlockId.BirchLog : BlockId.WildwoodLog;
          const leaves = trunk === BlockId.PineLog ? BlockId.PineLeaves
            : trunk === BlockId.BirchLog ? BlockId.BirchLeaves
              : trunk === BlockId.BloomLog ? BlockId.BloomLeaves
                : trunk === BlockId.JungleLog ? BlockId.JungleLeaves
                  : trunk === BlockId.SakuraLog ? BlockId.SakuraLeaves
                  : trunk === BlockId.CandywoodLog ? BlockId.CandywoodLeaves : BlockId.WildwoodLeaves;
          const resolvedLeaves = trunk === BlockId.MoonboughLog ? BlockId.MoonboughLeaves : leaves;
          const height = trunk === BlockId.PineLog ? 6 + Math.floor(hash2(x, z, this.seed) * 3) : 4 + Math.floor(hash2(x, z, this.seed) * 3);
          const treeForbiddenColumns = new Set(syrupPondCells);
          if (column.biome === BiomeId.SugarplumVale) for (let treeX = x - 6; treeX <= x + 6; treeX += 1) for (let treeZ = z - 6; treeZ <= z + 6; treeZ += 1) {
            if (syrupPondColumnAt(this.seedText, treeX, treeZ, sample, BiomeId.SugarplumVale)) treeForbiddenColumns.add(`${treeX},${treeZ}`);
          }
          const frostpearTree = column.biome === BiomeId.Frostpine
            && hash2(x, z, this.seed ^ 0x6f12a4b9) > 0.8;
          if (frostpearTree) {
            const root = { x, y: column.height + 1, z };
            const frostpearPlan = planFrostpearTree(root, `${this.seedText}:frostpear:${x},${z}`)
              .map((placement) => ({ x: placement.x, y: placement.y, z: placement.z, block: placement.type }));
            queueTreePlan(repairGeneratedTreePlan({
              plan: frostpearPlan,
              root,
              logBlock: BlockId.PineLog,
              forbiddenColumns: treeForbiddenColumns,
            }));
          } else if (trunk === BlockId.PineLog) {
            const pinePlan: TreePlanBlock[] = [];
            for (let y = 1; y <= height; y += 1) pinePlan.push({ x, y: column.height + y, z, block: trunk });
            for (let dy = -3; dy <= 1; dy += 1) {
              const radius = dy % 2 === 0 ? 2 : 1;
              for (let dx = -radius; dx <= radius; dx += 1) for (let dz = -radius; dz <= radius; dz += 1) if (Math.abs(dx) + Math.abs(dz) <= radius + 1) {
                pinePlan.push({ x: x + dx, y: column.height + height + dy, z: z + dz, block: resolvedLeaves });
              }
            }
            queueTreePlan(repairGeneratedTreePlan({
              plan: pinePlan,
              root: { x, y: column.height + 1, z },
              logBlock: trunk,
              forbiddenColumns: treeForbiddenColumns,
            }));
          } else {
            const formRoll = hash2(x, z, this.seed ^ 0x51a6c72d);
            const form: TreeForm = column.biome === BiomeId.SugarplumVale ? (formRoll > 0.91 ? "ancient" : formRoll > 0.36 ? "layered" : "rounded")
              : column.biome === BiomeId.RainveilJungle && formRoll > 0.42 ? "ancient"
              : formRoll > 0.975 ? "ancient"
              : column.biome === BiomeId.CloudreedGlen || formRoll > 0.77 ? "windswept"
                : formRoll > 0.45 ? "layered" : "rounded";
            const root = { x, y: column.height + 1, z };
            queueTreePlan(repairGeneratedTreePlan({
              plan: planFullTree(`${this.seedText}:${x},${z}`, root, form, trunk, resolvedLeaves, {
                groundYAt: (treeX, treeZ) => sample(treeX, treeZ).height,
                canRootAt: (treeX, treeZ) => {
                  const treeColumn = sample(treeX, treeZ);
                  return isRootableTreeSoil(this.surfaceBlocks(treeColumn.biome, treeColumn.height, treeColumn.temperature)[0]);
                },
              }),
              root,
              logBlock: trunk,
              forbiddenColumns: treeForbiddenColumns,
            }));
          }
        }
      }
    }

    // Compose every overlapping tree with explicit wood priority. Applying all
    // logs first and leaves through the replaceable-only path prevents a later
    // crown from cutting a leaf-shaped hole through an earlier trunk.
    for (const planned of plannedTreeLogs) if (!syrupPondCells.has(`${planned.x},${planned.z}`)) set(planned.x, planned.y, planned.z, planned.block, false);
    for (const planned of plannedTreeLeaves) if (!syrupPondCells.has(`${planned.x},${planned.z}`)) set(planned.x, planned.y, planned.z, planned.block, true);

    for (let lx = 0; lx < CHUNK_SIZE; lx += 1) for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
      const x = minX + lx;
      const z = minZ + lz;
      const column = sample(x, z);
      if (column.height <= column.waterline) continue;
      const caveMouth = Boolean(this.safeCaveEntranceAt(x, z, column));
      if (caveMouth || syrupPondCells.has(`${x},${z}`)) continue;
      const aboveIndex = blockIndex(lx, column.height + 1, lz);
      const ground = chunk.blocks[blockIndex(lx, column.height, lz)] as BlockId;
      const above = chunk.blocks[aboveIndex] as BlockId;
      if (!canGenerateSurfaceFlora(ground, above, caveMouth)) continue;
      const roll = hash2(x, z, this.seed ^ 0x44444444);
      if (column.biome === BiomeId.Desert && roll > 1 - DESERT_CACTUS_SPAWN_CHANCE) {
        const cactusHeight = 2 + Math.floor(hash2(x, z, this.seed ^ 0x55555555) * 3);
        for (let y = 1; y <= cactusHeight; y += 1) set(x, column.height + y, z, BlockId.Cactus);
      } else if (column.biome === BiomeId.Beach) {
        if (roll > 0.986) set(x, column.height + 1, z, BlockId.CoastAster);
        else if (roll > 0.965) set(x, column.height + 1, z, BlockId.Saltbrush);
      } else if (column.biome === BiomeId.Volcanic) {
        if (roll > 0.991) set(x, column.height + 1, z, BlockId.RedFlower);
        else if (roll > 0.975) set(x, column.height + 1, z, BlockId.DesertShrub);
      } else if (column.biome === BiomeId.Highlands) {
        if (roll > 0.988) set(x, column.height + 1, z, BlockId.Cloudbell);
        else if (roll > 0.965) set(x, column.height + 1, z, BlockId.TallGrass);
      } else if (column.biome === BiomeId.SnowcapRange) {
        if (roll > 0.992) set(x, column.height + 1, z, BlockId.Dreamcap);
        else if (roll > 0.978) set(x, column.height + 1, z, BlockId.Starfern);
      } else if (column.biome === BiomeId.Frostpine) {
        // Frostpine should feel alive beneath the conifers: sparse edible
        // color, hardy fern structure and a readable snowy grass floor.
        if (roll > 0.992) set(x, column.height + 1, z, BlockId.MoonberryBushRipe);
        else if (roll > 0.982) set(x, column.height + 1, z, BlockId.SunberryBushRipe);
        else if (roll > 0.955) set(x, column.height + 1, z, BlockId.Starfern);
        else if (roll > 0.88) set(x, column.height + 1, z, BlockId.TallGrass);
      } else if ([BiomeId.Meadow, BiomeId.Wildwood, BiomeId.Birchlight, BiomeId.Bloomwood, BiomeId.Savanna, BiomeId.Siltfen, BiomeId.CloudreedGlen, BiomeId.RainveilJungle, BiomeId.SakurabloomGrove, BiomeId.SugarplumVale, BiomeId.Glimmerwood].includes(column.biome)) {
        const patch = 0.72 * valueNoise2(x / 19, z / 19, this.seed ^ 0x35f1a93b) + 0.28 * valueNoise2(x / 6, z / 6, this.seed ^ 0x6c8e9cf5);
        const density = column.biome === BiomeId.Meadow ? 0.72 : column.biome === BiomeId.Bloomwood ? 0.79
          : column.biome === BiomeId.SugarplumVale ? 0.8 : column.biome === BiomeId.Savanna ? 0.9 : 0.84;
        if (roll + patch * 0.11 <= density) continue;
        const flowerBias = column.biome === BiomeId.Meadow || column.biome === BiomeId.Bloomwood || column.biome === BiomeId.CloudreedGlen || column.biome === BiomeId.SakurabloomGrove;
        const wheatPatch = hash2(x, z, this.seed ^ 0x7a9d35f1) > 0.986;
        const fieldCropRoll = hash2(x, z, this.seed ^ 0x4d37a1c9);
        const cottonPatch = [BiomeId.Meadow, BiomeId.Wildwood, BiomeId.Birchlight, BiomeId.Bloomwood].includes(column.biome) && fieldCropRoll > 0.972;
        const carrotPatch = [BiomeId.Meadow, BiomeId.Savanna].includes(column.biome) && fieldCropRoll > 0.977;
        const bluepodPatch = [BiomeId.Siltfen, BiomeId.RainveilJungle, BiomeId.Birchlight].includes(column.biome) && fieldCropRoll > 0.98;
        const plant = cottonPatch ? BlockId.CottonCrop
          : carrotPatch ? BlockId.SunCarrotCrop
            : bluepodPatch ? BlockId.BluepodCrop
        : column.biome === BiomeId.Glimmerwood && roll > 0.968 ? BlockId.Moonpetal
          : column.biome === BiomeId.Glimmerwood && roll > 0.925 ? BlockId.Dreamcap
            : column.biome === BiomeId.Glimmerwood ? BlockId.Starfern
        : column.biome === BiomeId.SugarplumVale && roll > 0.976 ? BlockId.LollipopOrchid
          : column.biome === BiomeId.SugarplumVale && roll > 0.95 ? BlockId.MarshmallowShrub
            : column.biome === BiomeId.SugarplumVale && roll > 0.89 ? BlockId.GumdropBush
              : column.biome === BiomeId.SugarplumVale ? BlockId.PeppermintTuft
          : column.biome === BiomeId.RainveilJungle && roll > 0.972 ? BlockId.LanternLotus
          : column.biome === BiomeId.RainveilJungle && roll > 0.88 ? BlockId.RainveilFern
            : column.biome === BiomeId.SakurabloomGrove && roll > 0.974 ? BlockId.Dreamblossom
              : column.biome === BiomeId.SakurabloomGrove && roll > 0.89 ? BlockId.SakuraBloom
                : column.biome === BiomeId.Siltfen && roll > 0.988 ? BlockId.MoonriceCrop
                  : column.biome === BiomeId.Savanna && roll > 0.992 ? BlockId.SunrootCrop
                    : column.biome === BiomeId.CloudreedGlen && roll > 0.955 ? BlockId.Cloudbell
          : column.biome === BiomeId.CloudreedGlen && roll > 0.905 ? BlockId.TallGrass
            : flowerBias && roll > 0.965 ? BlockId.BlueFlower
              : flowerBias && roll > 0.925 ? BlockId.RedFlower
                : wheatPatch ? BlockId.WheatCrop : BlockId.TallGrass;
        if (plant === BlockId.PeppermintTuft) {
          const caneHeight = wildPeppermintHeight(this.seedText, x, z);
          for (let dy = 1; dy <= caneHeight; dy += 1) {
            if (chunk.blocks[blockIndex(lx, column.height + dy, lz)] !== BlockId.Air) break;
            set(x, column.height + dy, z, plant);
          }
        } else if (plant === BlockId.TallGrass
          && hash2(x, z, this.seed ^ 0x13813813) > 0.82
          && chunk.blocks[blockIndex(lx, column.height + 2, lz)] === BlockId.Air) {
          set(x, column.height + 1, z, BlockId.DoubleTallGrassLower);
          set(x, column.height + 2, z, BlockId.DoubleTallGrassUpper);
        } else set(x, column.height + 1, z, plant);
      } else if (column.biome === BiomeId.MushroomFen && roll > 0.9) {
        set(x, column.height + 1, z, BlockId.MushroomCap);
      }
    }

    if (this.generationOptions.structures) {
      const regionSize = 96;
      for (let rx = Math.floor((minX - 10) / regionSize); rx <= Math.floor((minX + CHUNK_SIZE + 10) / regionSize); rx += 1) {
        for (let rz = Math.floor((minZ - 10) / regionSize); rz <= Math.floor((minZ + CHUNK_SIZE + 10) / regionSize); rz += 1) {
          // Legacy glowstone/chest ruins and cabins are intentionally sparser
          // than before; authored landmark POIs retain their own wider grid.
          if (hash2(rx, rz, this.seed ^ 0x66666666) < 0.72) continue;
          const x = rx * regionSize + 18 + Math.floor(hash2(rx, rz, this.seed ^ 0x77777777) * (regionSize - 36));
          const z = rz * regionSize + 18 + Math.floor(hash2(rx, rz, this.seed ^ 0x88888888) * (regionSize - 36));
          const column = sample(x, z);
          if (column.height <= column.waterline + 2 || [BiomeId.Ocean, BiomeId.DeepOcean, BiomeId.River].includes(column.biome)) continue;
          if (syrupPondColumnAt(this.seedText, x, z, sample, BiomeId.SugarplumVale)) continue;
          const cabin = hash2(rx, rz, this.seed ^ 0x99999999) > 0.63 && [BiomeId.Wildwood, BiomeId.Birchlight, BiomeId.Frostpine].includes(column.biome);
          const legacyClearing = { minX: x - 6, maxX: x + 6, minZ: z - 6, maxZ: z + 6 } as const;
          legacyClearings.push(legacyClearing);
          clearGeneratedGrowth(legacyClearing);
          if (cabin) {
            for (let dx = -3; dx <= 3; dx += 1) for (let dz = -3; dz <= 3; dz += 1) set(x + dx, column.height, z + dz, BlockId.Planks, false);
            for (let dy = 1; dy <= 3; dy += 1) for (let dx = -3; dx <= 3; dx += 1) for (let dz = -3; dz <= 3; dz += 1) {
              const wall = Math.abs(dx) === 3 || Math.abs(dz) === 3;
              if (wall && !(dz === -3 && dx === 0 && dy < 3)) set(x + dx, column.height + dy, z + dz, (Math.abs(dx) === 3 && Math.abs(dz) === 3) ? BlockId.WildwoodLog : BlockId.Planks, false);
            }
            for (let dx = -4; dx <= 4; dx += 1) for (let dz = -4; dz <= 4; dz += 1) set(x + dx, column.height + 4 + (Math.abs(dx) <= 2 && Math.abs(dz) <= 2 ? 1 : 0), z + dz, BlockId.Planks);
            set(x - 2, column.height + 1, z + 1, BlockId.CraftingTable, false);
            set(x + 2, column.height + 1, z + 1, BlockId.Chest, false);
            set(x, column.height + 1, z - 3, BlockId.DoorClosedLower, false);
            set(x, column.height + 2, z - 3, BlockId.DoorClosedUpper, false);
            set(x, column.height + 2, z + 2, BlockId.TorchWallNorth, false);
            set(x - 1, column.height + 1, z, BlockId.WildwoodTable, false);
            set(x - 2, column.height + 1, z, BlockId.WildwoodStool, false);
            set(x + 2, column.height + 1, z - 1, BlockId.WildwoodShelf, false);
            set(x + 2, column.height + 1, z + 2, BlockId.SealedBarrel, false);
            set(x - 2, column.height + 1, z + 2, BlockId.HearthFireplace, false);
          } else {
            for (let dx = -2; dx <= 2; dx += 1) for (let dz = -2; dz <= 2; dz += 1) if (Math.abs(dx) === 2 || Math.abs(dz) === 2 || (dx === 0 && dz === 0)) set(x + dx, column.height, z + dz, hash2(x + dx, z + dz, this.seed) > 0.25 ? BlockId.StoneBrick : BlockId.Moss, false);
            for (let dy = 1; dy <= 4; dy += 1) set(x, column.height + dy, z, dy === 4 ? BlockId.Glowstone : BlockId.StoneBrick, false);
            set(x + 2, column.height + 1, z + 2, BlockId.Chest, false);
          }
        }
      }
    }

    const mapVegetationBlock = (placement: PlannedBlock) => {
      if (placement.variant === "dry-shrub") return BlockId.DesertShrub;
      if (placement.variant === "buttercup" || placement.variant === "butterfly-host") return BlockId.Sunpetal;
      if (placement.variant === "violet-star") return BlockId.MoonOrchid;
      return placement.block;
    };
    const centerBiome = sample(minX + CHUNK_SIZE / 2, minZ + CHUNK_SIZE / 2).biome;
    if (centerBiome === BiomeId.Desert || centerBiome === BiomeId.Badlands || centerBiome === BiomeId.Meadow) {
      const vegetation = planBiomeVegetation({
        seed: this.seedText,
        biome: centerBiome === BiomeId.Meadow ? "meadow" : "desert",
        chunkX: chunk.cx,
        chunkZ: chunk.cz,
        surfaceYAt: (x, z) => sample(x, z).height,
      });
      for (const placement of vegetation.placements) {
        const column = sample(placement.x, placement.z);
        const inWaterway = column.height <= column.waterline
          || [BiomeId.DeepOcean, BiomeId.Ocean, BiomeId.River].includes(column.biome);
        const overCaveMouth = this.safeCaveEntranceAt(placement.x, placement.z, column) !== null;
        const inLegacyClearing = legacyClearings.some((bounds) => placement.x >= bounds.minX && placement.x <= bounds.maxX
          && placement.z >= bounds.minZ && placement.z <= bounds.maxZ);
        if (inWaterway || overCaveMouth || inLegacyClearing) continue;
        set(placement.x, placement.y, placement.z, mapVegetationBlock(placement));
      }
    }

    // Aquatic flora is stored as a real waterlogged block rather than a
    // renderer-only decoration. It can therefore be targeted, harvested,
    // replanted and grown without removing the source-water contract.
    for (let lx = 0; lx < CHUNK_SIZE; lx += 1) for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
      const x = minX + lx;
      const z = minZ + lz;
      const column = sample(x, z);
      if (syrupPondCells.has(`${x},${z}`)) continue;
      const waterDepth = column.waterline - column.height;
      if (waterDepth < 2) continue;
      const habitat = column.biome === BiomeId.LumenTrench ? "lumen-trench"
        : column.biome === BiomeId.DeepOcean ? "deep-ocean"
          : column.biome === BiomeId.Ocean ? "ocean"
            : column.biome === BiomeId.Beach ? "coast"
              : column.biome === BiomeId.River ? "river" : null;
      if (!habitat) continue;
      for (const placement of planSubmergedFlora(this.seedText, x, column.height, z, waterDepth, habitat)) {
        const current = chunk.blocks[blockIndex(lx, placement.y, lz)] as BlockId;
        if (current === BlockId.Water) set(placement.x, placement.y, placement.z, placement.block, false);
      }
    }

    if (this.generationOptions.structures) {
      // Named plans can span one chunk seam, so every chunk also inspects the
      // eight neighboring candidate chunks and applies only its own slice.
      for (let originCx = chunk.cx - 1; originCx <= chunk.cx + 1; originCx += 1) {
        for (let originCz = chunk.cz - 1; originCz <= chunk.cz + 1; originCz += 1) {
          const originX = originCx * CHUNK_SIZE + Math.floor(CHUNK_SIZE / 2);
          const originZ = originCz * CHUNK_SIZE + Math.floor(CHUNK_SIZE / 2);
          const originColumn = sample(originX, originZ);
          const structureBiome = structureBiomeFromId(originColumn.biome);
          if (!structureBiome || originColumn.height <= originColumn.waterline + 2) continue;
          if (syrupPondColumnAt(this.seedText, originX, originZ, sample, BiomeId.SugarplumVale)) continue;
          const kind = structureCandidateForChunk({ seed: this.seedText, chunkX: originCx, chunkZ: originCz, biome: structureBiome });
          if (!kind) continue;
          const plan = planStructure(kind, { x: originX, y: originColumn.height, z: originZ }, this.seedText);
          clearGeneratedGrowth(structureClearanceBounds(plan));
          const amenities = planPoiAmenities(kind, plan.origin).filter((placement) =>
            splitCoordinate(placement.x).chunk === chunk.cx && splitCoordinate(placement.z).chunk === chunk.cz);
          for (const placement of [...structurePlacementsForChunk(plan, chunk.cx, chunk.cz, CHUNK_SIZE), ...amenities]) {
            let type = placement.block;
            if (kind === "desert-temple" && (type === BlockId.StoneBrick || type === BlockId.Sand)) type = BlockId.TempleSandstone;
            else if (kind === "forest-temple" && placement.variant === "root-altar") type = BlockId.RuneStone;
            else if ((kind === "sunbun-grove" || kind === "meadow-butterfly-sanctuary") && type === BlockId.Grass) type = BlockId.MeadowGrass;
            else if (kind === "sunbun-grove" && placement.variant === "golden-clover") type = BlockId.BananaPlant;
            else if (kind === "meadow-butterfly-sanctuary" && placement.variant === "buttercup") type = BlockId.Sunpetal;
            else if (kind === "meadow-butterfly-sanctuary" && placement.variant === "violet-star") type = BlockId.MoonOrchid;
            set(placement.x, placement.y, placement.z, type, false);
          }
          for (const marker of structureMarkersForChunk(plan, chunk.cx, chunk.cz, CHUNK_SIZE)) this.structureMarkers.set(`${plan.id}:${marker.type}:${marker.id}`, marker);
        }
      }
    }
    if (this.generationOptions.structures) {
      // V1.3 landmarks and dungeons use their own sparse regional grids so
      // their exact archetype catalogue remains stable without perturbing old
      // save seeds. Each chunk examines only the neighboring candidate cells
      // and applies its own slice, making multi-room plans seam-safe.
      for (let originCx = chunk.cx - 1; originCx <= chunk.cx + 1; originCx += 1) {
        for (let originCz = chunk.cz - 1; originCz <= chunk.cz + 1; originCz += 1) {
          const originX = originCx * CHUNK_SIZE + Math.floor(CHUNK_SIZE / 2);
          const originZ = originCz * CHUNK_SIZE + Math.floor(CHUNK_SIZE / 2);
          const originColumn = sample(originX, originZ);
          const adventureBiome = adventureBiomeFromId(originColumn.biome);
          const coastCandidate = adventureBiome === "coast";
          if (!adventureBiome || (!coastCandidate && originColumn.height <= originColumn.waterline + 2)) continue;
          if (syrupPondColumnAt(this.seedText, originX, originZ, sample, BiomeId.SugarplumVale)) continue;
          const kinds = [
            adventurePoiCandidateForChunk({ seed: this.seedText, chunkX: originCx, chunkZ: originCz, biome: adventureBiome }),
            adventureDungeonCandidateForChunk({ seed: this.seedText, chunkX: originCx, chunkZ: originCz, biome: adventureBiome }),
          ].filter((kind) => kind !== undefined);
          for (const kind of kinds) {
            const mythicSite = mythicSiteByStructureKind(kind);
            const planOriginY = mythicSite?.layer === "underwater" ? originColumn.waterline : originColumn.height;
            const plan = planAdventureStructure(kind, { x: originX, y: planOriginY, z: originZ }, this.seedText);
            if (mythicSite) {
              const surfaceSamples = [[0, 0], [-8, -8], [8, -8], [-8, 8], [8, 8]].map(([dx, dz]) => sample(originX + dx, originZ + dz));
              const relief = Math.max(...surfaceSamples.map((entry) => entry.height)) - Math.min(...surfaceSamples.map((entry) => entry.height));
              if (mythicSite.layer === "underwater" ? originColumn.waterline - originColumn.height < 10 : mythicSite.layer === "surface" && relief > 10) continue;
              const settlementRegionX = Math.floor(originX / (32 * CHUNK_SIZE));
              const settlementRegionZ = Math.floor(originZ / (32 * CHUNK_SIZE));
              let settlementDistance = Number.POSITIVE_INFINITY;
              let dwarfSettlementDistance = Number.POSITIVE_INFINITY;
              for (let regionDx = -1; regionDx <= 1; regionDx += 1) for (let regionDz = -1; regionDz <= 1; regionDz += 1) {
                const settlement = this.validatedSettlementCandidateForRegion(settlementRegionX + regionDx, settlementRegionZ + regionDz, sample);
                if (!settlement) continue;
                const distance = Math.hypot(settlement.center.x - originX, settlement.center.z - originZ);
                settlementDistance = Math.min(settlementDistance, distance);
                if (settlement.factionId === "dwarves") dwarfSettlementDistance = Math.min(dwarfSettlementDistance, distance);
              }
              const roadDistance = [...this.surfaceRoadGraphCache.values()].flat().reduce((nearest, edge) => {
                const dx = edge.to.x - edge.from.x;
                const dz = edge.to.z - edge.from.z;
                const lengthSquared = dx * dx + dz * dz;
                const along = lengthSquared <= 0 ? 0 : Math.max(0, Math.min(1, ((originX - edge.from.x) * dx + (originZ - edge.from.z) * dz) / lengthSquared));
                return Math.min(nearest, Math.hypot(originX - (edge.from.x + dx * along), originZ - (edge.from.z + dz * along)));
              }, Number.POSITIVE_INFINITY);
              const placement = validateMythicSitePlacement(plan, {
                siteId: mythicSite.id,
                roadDistance,
                settlementDistance,
                dwarfSettlementDistance,
                connectedEntrance: true,
                waterShellCount: mythicSite.sealedUnderwater ? Math.max(0, originColumn.waterline - originColumn.height) : 0,
                explicitFloodedRoomCount: mythicSite.explicitFloodedRooms,
                returnPathConnected: true,
              });
              if (!placement.ok) continue;
            }
            clearGeneratedGrowth(adventureClearanceBounds(plan));
            for (const placement of adventurePlacementsForChunk(plan, chunk.cx, chunk.cz, CHUNK_SIZE)) {
              set(placement.x, placement.y, placement.z, placement.block, false);
            }
            for (const marker of adventureMarkersForChunk(plan, chunk.cx, chunk.cz, CHUNK_SIZE)) {
              this.structureMarkers.set(`${plan.id}:${marker.type}:${marker.id}`, marker);
            }
          }
        }
      }
      this.generateSettlementsForChunk(chunk, sample, set, clearGeneratedGrowth);
      for (const lair of dragonLairsIntersectingChunk({
        seed: this.seedText,
        chunkX: chunk.cx,
        chunkZ: chunk.cz,
        chunkSize: CHUNK_SIZE,
        surfaceYAt: (x, z) => sample(x, z).height,
      })) {
        for (const placement of dragonLairPlacementsForChunk(lair, chunk.cx, chunk.cz, CHUNK_SIZE)) {
          set(placement.x, placement.y, placement.z, placement.block, false);
        }
        for (const marker of dragonLairMarkersForChunk(lair, chunk.cx, chunk.cz, CHUNK_SIZE)) {
          this.structureMarkers.set(`${lair.id}:${marker.type}:${marker.id}`, marker);
        }
      }
      this.generateSeaDragonNestsForChunk(chunk, sample, set);
      if (this.generationOptions.profile === "world-below-v15") this.generateLegendaryEncounterSitesForChunk(chunk, sample, set);
    }
  }

  private generateLegendaryEncounterSitesForChunk(
    chunk: Chunk,
    sample: (x: number, z: number) => ColumnSample,
    set: (x: number, y: number, z: number, type: BlockId, onlyAir?: boolean) => void,
  ) {
    const minX = chunk.cx * CHUNK_SIZE;
    const minZ = chunk.cz * CHUNK_SIZE;
    const maxX = minX + CHUNK_SIZE - 1;
    const maxZ = minZ + CHUNK_SIZE - 1;
    const cellBlocks = LEGENDARY_SITE_CELL_CHUNKS * CHUNK_SIZE;
    const reach = 20;
    const startCellX = Math.floor((minX - reach) / cellBlocks);
    const endCellX = Math.floor((maxX + reach) / cellBlocks);
    const startCellZ = Math.floor((minZ - reach) / cellBlocks);
    const endCellZ = Math.floor((maxZ + reach) / cellBlocks);
    const inside = (x: number, z: number) => x >= minX && x <= maxX && z >= minZ && z <= maxZ;
    for (let cellX = startCellX; cellX <= endCellX; cellX += 1) for (let cellZ = startCellZ; cellZ <= endCellZ; cellZ += 1) {
      const site = planLegendaryEncounterSite({
        seed: this.seedText,
        cellX,
        cellZ,
        sample: (x, z) => {
          const column = sample(x, z);
          return { height: column.height, waterline: column.waterline, habitatKey: legendaryHabitatKey(column.biome) };
        },
      });
      if (!site || site.center.x + site.radius < minX || site.center.x - site.radius > maxX || site.center.z + site.radius < minZ || site.center.z - site.radius > maxZ) continue;
      const palette = legendarySitePalette(site.encounterId);
      for (let x = Math.max(minX, site.center.x - site.radius); x <= Math.min(maxX, site.center.x + site.radius); x += 1) {
        for (let z = Math.max(minZ, site.center.z - site.radius); z <= Math.min(maxZ, site.center.z + site.radius); z += 1) {
          const distance = Math.hypot(x - site.center.x, z - site.center.z);
          if (distance > site.radius) continue;
          if (site.underground) {
            const dx = (x - site.center.x) / site.radius;
            const dz = (z - site.center.z) / site.radius;
            const ceiling = 4 + Math.max(0, Math.floor((1 - dx * dx - dz * dz) * 4));
            for (let dy = 0; dy <= ceiling; dy += 1) set(x, site.center.y + dy, z, BlockId.Air, false);
            set(x, site.center.y - 1, z, distance < 4 || Math.abs(distance - site.radius * .72) < .8 ? palette.floor : BlockId.Deepstone, false);
          } else if (site.aquatic) {
            const floorY = sample(x, z).height + 1;
            if (distance < 4 || Math.abs(distance - site.radius * .62) < .8 || (hash2(x, z, this.seed) > .96 && distance < site.radius * .85)) set(x, floorY, z, palette.floor, false);
            if (Math.abs(distance - site.radius * .62) < .8 && ((x + z) & 3) === 0) set(x, floorY + 1, z, palette.accent, false);
          } else {
            const ground = sample(x, z).height;
            if (distance < 3 || Math.abs(distance - site.radius * .72) < .65) set(x, ground, z, palette.floor, false);
            if (Math.abs(distance - site.radius * .72) < .65 && ((x + z) & 7) === 0) set(x, ground + 1, z, palette.accent, false);
          }
        }
      }
      // Clue pylons visually teach the first encounter objective before the
      // player ever opens the quest page.
      for (let index = 0; index < site.clueCount; index += 1) {
        const angle = index * Math.PI * 2 / Math.max(1, site.clueCount) + hash2(cellX, cellZ, this.seed) * Math.PI;
        const x = Math.round(site.center.x + Math.cos(angle) * site.radius * .74);
        const z = Math.round(site.center.z + Math.sin(angle) * site.radius * .74);
        if (!inside(x, z)) continue;
        const y = site.underground ? site.center.y : site.aquatic ? sample(x, z).height + 1 : sample(x, z).height + 1;
        set(x, y, z, palette.accent, false);
        set(x, y + 1, z, palette.light, false);
        this.structureMarkers.set(`${site.id}:clue:${index}`, {
          type: "landmark",
          id: `${site.id}:clue:${index}`,
          position: { x, y: y + 1, z },
          tag: `legendary-clue:${site.encounterId}:${site.id}:observe-sign:${index}`,
          mapLayer: site.underground ? "underground" : site.aquatic ? "underwater" : "surface",
        });
      }
      if (inside(site.center.x, site.center.z)) {
        const spawnY = site.underground ? site.center.y : site.center.y + 1;
        this.structureMarkers.set(`${site.id}:landmark`, {
          type: "landmark", id: site.id, position: site.center, tag: `legendary-encounter:${site.encounterId}:dormant`,
          mapLayer: site.underground ? "underground" : site.aquatic ? "underwater" : "surface",
        });
        this.structureMarkers.set(`${site.id}:spawn`, {
          type: "spawn", id: `${site.id}:guardian`, position: { ...site.center, y: spawnY }, mobKind: site.kind,
          count: 1, radius: 1, persistent: true,
          tags: [`legendary-encounter:${site.encounterId}`, `legendary-site:${site.id}`, "permanent:true", "guardian:true", ...(site.aquatic ? ["aquatic:true"] : [])],
        });
      }
    }
  }

  /**
   * Sea dragons use rare, open-water nests rather than terrestrial dragon
   * caverns. The planner is deterministic and shared with Atlantian charts;
   * this pass only authors the slice that belongs to the current chunk.
   */
  private generateSeaDragonNestsForChunk(
    chunk: Chunk,
    sample: (x: number, z: number) => ColumnSample,
    set: (x: number, y: number, z: number, type: BlockId, onlyAir?: boolean) => void,
  ) {
    const minX = chunk.cx * CHUNK_SIZE;
    const minZ = chunk.cz * CHUNK_SIZE;
    const maxX = minX + CHUNK_SIZE - 1;
    const maxZ = minZ + CHUNK_SIZE - 1;
    const regionSize = 48 * CHUNK_SIZE;
    const reach = SEA_DRAGON_NEST_MAX_RADIUS;
    const startRegionX = Math.floor((minX - reach) / regionSize);
    const endRegionX = Math.floor((maxX + reach) / regionSize);
    const startRegionZ = Math.floor((minZ - reach) / regionSize);
    const endRegionZ = Math.floor((maxZ + reach) / regionSize);
    const inside = (x: number, z: number) => x >= minX && x <= maxX && z >= minZ && z <= maxZ;

    for (let regionX = startRegionX; regionX <= endRegionX; regionX += 1) for (let regionZ = startRegionZ; regionZ <= endRegionZ; regionZ += 1) {
      const probe = planSeaDragonNest({ seed: this.seedText, regionX, regionZ, oceanFloorY: -48, biome: "lumen-trench" });
      if (!probe) continue;
      const centerColumn = sample(probe.center.x, probe.center.z);
      if (![BiomeId.DeepOcean, BiomeId.LumenTrench].includes(centerColumn.biome) || centerColumn.height > centerColumn.waterline - 8) continue;
      const nest = planSeaDragonNest({
        seed: this.seedText,
        regionX,
        regionZ,
        oceanFloorY: centerColumn.height,
        biome: centerColumn.biome === BiomeId.LumenTrench ? "lumen-trench" : "deep-ocean",
      });
      if (!nest) continue;
      if (nest.center.x + nest.radius < minX || nest.center.x - nest.radius > maxX || nest.center.z + nest.radius < minZ || nest.center.z - nest.radius > maxZ) continue;

      for (let x = Math.max(minX, nest.center.x - nest.radius); x <= Math.min(maxX, nest.center.x + nest.radius); x += 1) {
        for (let z = Math.max(minZ, nest.center.z - nest.radius); z <= Math.min(maxZ, nest.center.z + nest.radius); z += 1) {
          const dx = x - nest.center.x;
          const dz = z - nest.center.z;
          const distance = Math.hypot(dx, dz);
          if (distance > nest.radius) continue;
          const localFloor = sample(x, z).height;
          const innerBowl = distance <= nest.radius * 0.27;
          const middleRidge = Math.abs(distance - nest.radius * 0.52) < 1.15;
          const outerRidge = Math.abs(distance - nest.radius * 0.84) < 0.85;
          const spiral = Math.sin(Math.atan2(dz, dx) * 3 + distance * 0.62) > 0.72;
          if (innerBowl || middleRidge || outerRidge || spiral && distance < nest.radius * 0.9) {
            set(x, localFloor + 1, z, BlockId.MoonSlate, false);
            if (innerBowl && distance < nest.radius * 0.18) set(x, localFloor + 2, z, BlockId.MoonSlate, false);
          }
          const ornament = hash2(x, z, this.seed ^ 0x5ea0d6a1);
          if (!innerBowl && distance < nest.radius * 0.76 && ornament > 0.955) {
            set(x, localFloor + 2, z, ornament > 0.982 ? BlockId.AbyssBloom : BlockId.StarCoral, false);
          } else if (outerRidge && ornament > 0.91) {
            set(x, localFloor + 2, z, BlockId.Glass, false);
          }
        }
      }

      const nestFloorY = centerColumn.height + 2;
      for (let index = 0; index < nest.eggs; index += 1) {
        const eggX = nest.center.x + (index * 2 - (nest.eggs - 1));
        const eggZ = nest.center.z + 1;
        if (inside(eggX, eggZ)) set(eggX, nestFloorY, eggZ, BlockId.SeaDragonEggBlock, false);
      }

      const chestX = nest.center.x + Math.min(6, nest.radius - 4);
      const chestZ = nest.center.z - 2;
      if (nest.guardianStage >= 4 && inside(chestX, chestZ)) {
        const chestPosition = { x: chestX, y: sample(chestX, chestZ).height + 2, z: chestZ };
        set(chestPosition.x, chestPosition.y, chestPosition.z, BlockId.Chest, false);
        const marker: StructureMarker = {
          type: "chest",
          id: `${nest.id}:hoard`,
          position: chestPosition,
          lootTable: "desert-temple",
          loot: [
            { itemKey: "gold-ingot", count: 6 + nest.guardianStage * 3 },
            { itemKey: "sea-dragon-scale", count: nest.guardianStage - 2 },
            { itemKey: "water-breathing-potion", count: 1 },
          ],
        };
        this.structureMarkers.set(`${nest.id}:chest:${marker.id}`, marker);
      }

      if (inside(nest.center.x, nest.center.z)) {
        const guardian: StructureMarker = {
          type: "spawn",
          id: `${nest.id}:guardian`,
          position: { x: nest.center.x, y: nestFloorY + 2, z: nest.center.z },
          mobKind: "sea-dragon",
          count: 1,
          radius: 2,
          persistent: true,
          tags: [
            "dragon:sea", `stage:${nest.guardianStage}`, `sex:${nest.guardianSex}`,
            `lair:${nest.id}`, "permanent:true", "guardian:true", "aquatic:true",
          ],
        };
        const landmark: StructureMarker = {
          type: "landmark",
          id: nest.id,
          position: nest.center,
          tag: `dragon-nest:sea:stage-${nest.guardianStage}:${nest.guardianSex}`,
          mapLayer: "underwater",
        };
        this.structureMarkers.set(`${nest.id}:spawn:${guardian.id}`, guardian);
        this.structureMarkers.set(`${nest.id}:landmark:${landmark.id}`, landmark);
      }
    }
  }

  private settlementCandidateForRegion(regionX: number, regionZ: number, sample: (x: number, z: number) => ColumnSample) {
    if (this.generationOptions.settlementPattern === "heartlands-v2") {
      return this.settlementIndex.candidateForRegion(this.seedText, this.generationOptions, regionX, regionZ, this.settlementTerrainSampler(sample));
    }
    const cacheKey = `${regionX},${regionZ}`;
    if (this.settlementCandidateCache.has(cacheKey)) return this.settlementCandidateCache.get(cacheKey) ?? null;
    const regionSize = 32 * CHUNK_SIZE;
    const candidate = this.generationOptions.profile === "world-below-v15"
      ? selectSettlementSite({
        worldSeed: this.seedText,
        seed: this.seed,
        regionX,
        regionZ,
        enabledFactions: this.generationOptions.enabledFactions,
        sample,
      })
      : (() => {
        const probe = sample(regionX * regionSize + regionSize / 2, regionZ * regionSize + regionSize / 2);
        const probeBiome = settlementBiomeFromId(probe.biome);
        return probeBiome ? planSettlementCandidate({
          worldSeed: this.seedText,
          regionX,
          regionZ,
          biome: probeBiome,
          existing: [],
          floorY: probe.height,
          enabledFactions: this.generationOptions.enabledFactions,
        }) : null;
      })();
    this.settlementCandidateCache.set(cacheKey, candidate);
    return candidate;
  }

  private validatedSettlementCandidateForRegion(regionX: number, regionZ: number, sample: (x: number, z: number) => ColumnSample) {
    if (this.generationOptions.settlementPattern === "heartlands-v2") {
      return this.settlementIndex.candidateForRegion(this.seedText, this.generationOptions, regionX, regionZ, this.settlementTerrainSampler(sample));
    }
    const cacheKey = `${regionX},${regionZ}`;
    if (this.settlementValidatedCandidateCache.has(cacheKey)) return this.settlementValidatedCandidateCache.get(cacheKey) ?? null;
    const planned = this.settlementCandidateForRegion(regionX, regionZ, sample);
    if (!planned) {
      this.settlementValidatedCandidateCache.set(cacheKey, null);
      return null;
    }
    const contenders: SettlementCandidate[] = [];
    for (let dx = -2; dx <= 2; dx += 1) for (let dz = -2; dz <= 2; dz += 1) {
      if (dx === 0 && dz === 0) continue;
      const contender = this.settlementCandidateForRegion(regionX + dx, regionZ + dz, sample);
      if (contender) contenders.push(contender);
    }
    if (!settlementWinsSpacingTieBreak(planned, contenders)) {
      this.settlementValidatedCandidateCache.set(cacheKey, null);
      return null;
    }
    const centerColumn = sample(planned.center.x, planned.center.z);
    const actualBiome = settlementBiomeFromId(centerColumn.biome);
    const underwater = planned.environment === "underwater";
    const underground = planned.environment === "underground";
    let valid = Boolean(actualBiome && actualBiome === planned.biome)
      && !(underwater ? centerColumn.height >= centerColumn.waterline - 5 : centerColumn.height <= centerColumn.waterline + 3);
    if (valid && !underwater) {
      const pondProbe = Math.min(12, SETTLEMENT_SIZE_RULES[planned.size].radiusBlocks);
      valid = ![[0, 0], [pondProbe, 0], [-pondProbe, 0], [0, pondProbe], [0, -pondProbe]]
        .some(([dx, dz]) => syrupPondColumnAt(this.seedText, planned.center.x + dx, planned.center.z + dz, sample, BiomeId.SugarplumVale));
    }
    if (valid) {
      const nearbyHeights = [[4, 0], [-4, 0], [0, 4], [0, -4]].map(([dx, dz]) => sample(planned.center.x + dx, planned.center.z + dz).height);
      valid = !nearbyHeights.some((height) => Math.abs(height - centerColumn.height) > (underwater ? 7 : underground ? 12 : 4));
    }
    if (!valid) {
      this.settlementValidatedCandidateCache.set(cacheKey, null);
      return null;
    }
    const accepted: SettlementCandidate = underwater ? {
      ...planned,
      floorY: centerColumn.height,
      center: { ...planned.center, y: centerColumn.height + 2 },
    } : underground ? {
      ...planned,
      floorY: Math.max(MIN_Y + 10, centerColumn.height - 18),
      center: { ...planned.center, y: Math.max(MIN_Y + 12, centerColumn.height - 16) },
    } : planned;
    this.settlementValidatedCandidateCache.set(cacheKey, accepted);
    return accepted;
  }

  setHeldLight(light: VoxelHeldLight) {
    this.lightingUniforms.voxelHeldLightPosition.value.copy(light.position);
    this.lightingUniforms.voxelHeldLightColor.value.copy(light.color);
    this.lightingUniforms.voxelHeldLightIntensity.value = Math.max(0, light.intensity);
    this.lightingUniforms.voxelHeldLightRadius.value = Math.max(0, light.radius);
  }

  setMachineLight(light: VoxelMachineLight) {
    this.lightingUniforms.voxelMachineLightPosition.value.copy(light.position);
    this.lightingUniforms.voxelMachineLightColor.value.copy(light.color);
    this.lightingUniforms.voxelMachineLightIntensity.value = Math.max(0, light.intensity);
    this.lightingUniforms.voxelMachineLightRadius.value = Math.max(0, light.radius);
  }

  private settlementTerrainSampler(sample: (x: number, z: number) => ColumnSample = (x, z) => this.sampleColumn(x, z)): SettlementTerrainSampler {
    return (x, z) => {
      const column = sample(x, z);
      const biome = settlementBiomeFromId(column.biome);
      return {
        height: column.height,
        waterline: column.waterline,
        biome,
        forbidden: biome !== "deep-ocean" && biome !== "lumen-trench"
          ? Boolean(syrupPondColumnAt(this.seedText, x, z, sample, BiomeId.SugarplumVale))
          : false,
      };
    };
  }

  queryNearestSettlement(query: SettlementQuery): SettlementIndexResult | null {
    return this.settlementIndex.queryNearest(this.seedText, this.generationOptions, query, this.settlementTerrainSampler());
  }

  queryNearestSettlements(query: SettlementQuery): readonly SettlementIndexResult[] {
    return this.settlementIndex.queryNearestMany(this.seedText, this.generationOptions, query, this.settlementTerrainSampler());
  }

  settlementRoadNeighbors(settlementId: string): readonly SettlementRoadConnection[] {
    return this.settlementIndex.roadNeighbors(this.seedText, this.generationOptions, settlementId, this.settlementTerrainSampler());
  }

  resolveSettlementOrigin(preference: WorldOriginPreference, breathesWater = false, maxRegionRadius = DEFAULT_SETTLEMENT_ORIGIN_SEARCH_RADIUS) {
    if (preference.mode === "wilderness" || !this.generationOptions.structures || this.generationOptions.settlementDensity <= 0) return null;
    const sizes: SettlementCandidate["size"][] = preference.mode === "culture-settlement"
      ? preference.minimumSize === "town" ? ["town"] : preference.minimumSize === "village" ? ["village", "town"] : ["hamlet", "village", "town"]
      : ["hamlet", "village", "town"];
    const result = this.queryNearestSettlement({
      origin: { x: 0, z: 0 },
      ...(preference.mode === "culture-settlement" ? { factionIds: [preference.factionId] } : {}),
      sizes,
      maxRegionRadius: normalizeSettlementOriginSearchRadius(maxRegionRadius),
    });
    if (!result) return null;
    const layout = planSettlementLayout(result.candidate);
    const publicAnchor = layout.gates[0]?.position ?? layout.approaches[0]?.position ?? layout.center;
    const environment = result.candidate.environment ?? "surface";
    const column = this.sampleColumn(Math.round(publicAnchor.x), Math.round(publicAnchor.z));
    const offset = layout.gates[0]
      ? ([[0, -4], [4, 0], [0, 4], [-4, 0]] as const)[layout.gates[0].facing]
      : [0, 0] as const;
    const x = Math.round(publicAnchor.x + offset[0]);
    const z = Math.round(publicAnchor.z + offset[1]);
    const y = environment === "underwater" && breathesWater
      ? Math.max((result.candidate.floorY ?? column.height) + 2, publicAnchor.y ?? column.height + 2)
      : environment === "underwater"
        ? column.waterline + 1.51
        : environment === "underground"
          ? column.height + 1.51
          : column.height + 1.51;
    return Object.freeze({ ...result, position: Object.freeze({ x, y, z }), anchorKind: environment === "underground" ? "surface-entry" : environment === "underwater" && !breathesWater ? "reef-air-arrival" : "public-approach" as const });
  }

  private generateHeartlandRoadsForChunk(
    chunk: Chunk,
    sample: (x: number, z: number) => ColumnSample,
    set: (x: number, y: number, z: number, type: BlockId, onlyAir?: boolean) => void,
  ) {
    if (this.generationOptions.roadCoverage === "none") return;
    const minX = chunk.cx * CHUNK_SIZE;
    const minZ = chunk.cz * CHUNK_SIZE;
    const maxX = minX + CHUNK_SIZE - 1;
    const maxZ = minZ + CHUNK_SIZE - 1;
    const provinceBlocks = 8 * 32 * CHUNK_SIZE;
    const provinceX = Math.floor(minX / provinceBlocks);
    const provinceZ = Math.floor(minZ / provinceBlocks);
    const insideChunk = (x: number, z: number) => x >= minX && x <= maxX && z >= minZ && z <= maxZ;
    const connections = new Map<string, SettlementRoadConnection>();
    const terrainSampler = this.settlementTerrainSampler(sample);
    // One-province halo is sufficient because every cross-boundary edge is
    // owned by one of its endpoint provinces. It also lets a long trunk road
    // rasterize through the neighboring province without order dependence.
    for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) {
      const ownerX = provinceX + dx;
      const ownerZ = provinceZ + dz;
      const graphKey = `heartroads:${ownerX},${ownerZ}`;
      const planned = this.settlementIndex.roadConnectionsForProvince(this.seedText, this.generationOptions, ownerX, ownerZ, terrainSampler);
      if (!this.surfaceRoadGraphCache.has(graphKey)) this.surfaceRoadGraphCache.set(graphKey, Object.freeze(planned.map((edge) => ({
        id: edge.id,
        from: { id: edge.from.id, x: edge.from.center.x, z: edge.from.center.z, y: edge.from.center.y, factionId: edge.from.factionId, settlementSize: edge.from.size },
        to: { id: edge.to.id, x: edge.to.center.x, z: edge.to.center.z, y: edge.to.center.y, factionId: edge.to.factionId, settlementSize: edge.to.size },
        length: edge.length,
        loop: edge.loop,
        tier: edge.tier,
        ownerProvinceId: edge.ownerProvinceId,
      }))));
      for (const edge of planned) connections.set(edge.id, edge);
    }
    for (const edge of connections.values()) {
      const routePadding = edge.tier === "trunk" ? 196 : 144;
      const edgeMinX = Math.min(edge.from.center.x, edge.to.center.x) - routePadding;
      const edgeMaxX = Math.max(edge.from.center.x, edge.to.center.x) + routePadding;
      const edgeMinZ = Math.min(edge.from.center.z, edge.to.center.z) - routePadding;
      const edgeMaxZ = Math.max(edge.from.center.z, edge.to.center.z) + routePadding;
      if (maxX < edgeMinX || minX > edgeMaxX || maxZ < edgeMinZ || minZ > edgeMaxZ) continue;
      const length = Math.max(1, edge.length);
      const ux = (edge.to.center.x - edge.from.center.x) / length;
      const uz = (edge.to.center.z - edge.from.center.z) / length;
      const fromInset = SETTLEMENT_SIZE_RULES[edge.from.size].radiusBlocks + 3;
      const toInset = SETTLEMENT_SIZE_RULES[edge.to.size].radiusBlocks + 3;
      const from = { id: edge.from.id, x: Math.round(edge.from.center.x + ux * fromInset), z: Math.round(edge.from.center.z + uz * fromInset), factionId: edge.from.factionId, settlementSize: edge.from.size };
      const to = { id: edge.to.id, x: Math.round(edge.to.center.x - ux * toInset), z: Math.round(edge.to.center.z - uz * toInset), factionId: edge.to.factionId, settlementSize: edge.to.size };
      let road = this.surfaceRoadCache.get(edge.id);
      if (!road) {
        road = planTerrainFollowingRoad(from, to, (roadX, roadZ) => {
          const column = sample(roadX, roadZ);
          const around = [[4, 0], [-4, 0], [0, 4], [0, -4]].map(([ox, oz]) => sample(roadX + ox, roadZ + oz).height);
          return {
            height: column.height,
            waterline: column.waterline,
            water: column.height <= column.waterline,
            slopeRisk: Math.max(...around.map((height) => Math.abs(height - column.height))),
          };
        }, edge.tier === "trunk" ? 6 : 4);
        this.surfaceRoadCache.set(edge.id, road);
      }
      const halfWidth = edge.tier === "trunk" ? 2 : edge.tier === "regional" ? 1 : 0;
      for (let pointIndex = 0; pointIndex < road.length; pointIndex += 1) {
        const point = road[pointIndex];
        if (!insideChunk(point.x, point.z) || point.kind === "ferry") continue;
        const column = sample(point.x, point.z);
        const roadBlock = point.kind === "bridge" || point.kind === "causeway" ? BlockId.CaveBridge
          : edge.from.factionId === "sugarcourt" ? BlockId.BoiledSugarbrick
            : edge.from.factionId === "wood-elves" ? BlockId.RootweaveSoil : BlockId.Gravel;
        const previous = road[Math.max(0, pointIndex - 1)];
        const next = road[Math.min(road.length - 1, pointIndex + 1)];
        const tangentX = next.x - previous.x;
        const tangentZ = next.z - previous.z;
        const sideX = Math.abs(tangentZ) >= Math.abs(tangentX) ? Math.sign(tangentZ || 1) : 0;
        const sideZ = sideX === 0 ? Math.sign(tangentX || 1) : 0;
        for (let width = -halfWidth; width <= halfWidth; width += 1) {
          const roadX = point.x + sideX * width;
          const roadZ = point.z - sideZ * width;
          if (!insideChunk(roadX, roadZ)) continue;
          const roadColumn = sample(roadX, roadZ);
          for (let fillY = Math.max(roadColumn.height + 1, point.y - 3); fillY < point.y; fillY += 1) set(roadX, fillY, roadZ, BlockId.Cobblestone, false);
          set(roadX, point.y, roadZ, roadBlock, false);
          for (let clearY = point.y + 1; clearY <= Math.min(point.y + 3, roadColumn.height + 4); clearY += 1) set(roadX, clearY, roadZ, BlockId.Air, false);
        }
        const signInterval = edge.tier === "trunk" ? 96 : edge.tier === "regional" ? 128 : 192;
        if (pointIndex === 0 || pointIndex === road.length - 1 || pointIndex % signInterval === 0) {
          const toward = pointIndex < road.length / 2 ? edge.to : edge.from;
          const signX = point.x + sideX * (halfWidth + 1);
          const signZ = point.z - sideZ * (halfWidth + 1);
          if (insideChunk(signX, signZ) && column.height > column.waterline) set(signX, point.y + 1, signZ, BlockId.CaveMarker, true);
          const markerId = `surface-road-sign:${edge.id}:${pointIndex}`;
          this.structureMarkers.set(markerId, {
            type: "landmark", id: markerId, position: { x: signX, y: point.y + 1, z: signZ },
            tag: `surface-road-sign:${edge.tier}:${toward.id}:${toward.factionId}:${toward.size}:${Math.round(toward.center.x)}:${Math.round(toward.center.z)}:${Math.round(Math.hypot(toward.center.x - point.x, toward.center.z - point.z))}`,
          });
        }
      }
    }
  }

  private generateRegionalRoadsForChunk(
    chunk: Chunk,
    sample: (x: number, z: number) => ColumnSample,
    set: (x: number, y: number, z: number, type: BlockId, onlyAir?: boolean) => void,
  ) {
    if (this.generationOptions.profile !== "world-below-v15") return;
    if (this.generationOptions.settlementPattern === "heartlands-v2") {
      this.generateHeartlandRoadsForChunk(chunk, sample, set);
      return;
    }
    const minX = chunk.cx * CHUNK_SIZE;
    const minZ = chunk.cz * CHUNK_SIZE;
    const maxX = minX + CHUNK_SIZE - 1;
    const maxZ = minZ + CHUNK_SIZE - 1;
    const regionSize = 32 * CHUNK_SIZE;
    const macroRegions = 4;
    const macroBlocks = regionSize * macroRegions;
    const routePadding = 144;
    const startMacroX = Math.floor((minX - routePadding) / macroBlocks);
    const endMacroX = Math.floor((maxX + routePadding) / macroBlocks);
    const startMacroZ = Math.floor((minZ - routePadding) / macroBlocks);
    const endMacroZ = Math.floor((maxZ + routePadding) / macroBlocks);
    const insideChunk = (x: number, z: number) => x >= minX && x <= maxX && z >= minZ && z <= maxZ;

    for (let macroX = startMacroX; macroX <= endMacroX; macroX += 1) for (let macroZ = startMacroZ; macroZ <= endMacroZ; macroZ += 1) {
      const graphKey = `roads:${macroX},${macroZ}`;
      const candidates = new Map<string, SettlementCandidate>();
      const nodes = [] as Array<{ id: string; x: number; z: number; y: number; factionId: string; settlementSize: SettlementCandidate["size"] }>;
      for (let dx = 0; dx < macroRegions; dx += 1) for (let dz = 0; dz < macroRegions; dz += 1) {
        const regionX = macroX * macroRegions + dx;
        const regionZ = macroZ * macroRegions + dz;
        const candidate = this.validatedSettlementCandidateForRegion(regionX, regionZ, sample);
        if (!candidate || candidate.environment === "underwater" || candidate.environment === "underground") continue;
        const participation = candidate.size === "town" ? .6 : candidate.size === "village" ? .35 : .1;
        if (hash2(regionX, regionZ, this.seed ^ 0x726f6164) >= participation) continue;
        candidates.set(candidate.id, candidate);
        nodes.push({ id: candidate.id, x: candidate.center.x, z: candidate.center.z, y: candidate.center.y ?? candidate.floorY ?? sample(candidate.center.x, candidate.center.z).height, factionId: candidate.factionId, settlementSize: candidate.size });
      }
      let graph = this.surfaceRoadGraphCache.get(graphKey);
      if (!graph) {
        graph = planRegionalRoadGraph(nodes);
        this.surfaceRoadGraphCache.set(graphKey, graph);
      }
      for (const edge of graph) {
        const fromCandidate = candidates.get(edge.from.id);
        const toCandidate = candidates.get(edge.to.id);
        if (!fromCandidate || !toCandidate) continue;
        const edgeMinX = Math.min(edge.from.x, edge.to.x) - routePadding;
        const edgeMaxX = Math.max(edge.from.x, edge.to.x) + routePadding;
        const edgeMinZ = Math.min(edge.from.z, edge.to.z) - routePadding;
        const edgeMaxZ = Math.max(edge.from.z, edge.to.z) + routePadding;
        if (maxX < edgeMinX || minX > edgeMaxX || maxZ < edgeMinZ || minZ > edgeMaxZ) continue;
        const length = Math.max(1, edge.length);
        const ux = (edge.to.x - edge.from.x) / length;
        const uz = (edge.to.z - edge.from.z) / length;
        const fromInset = SETTLEMENT_SIZE_RULES[fromCandidate.size].radiusBlocks + 3;
        const toInset = SETTLEMENT_SIZE_RULES[toCandidate.size].radiusBlocks + 3;
        const from = { ...edge.from, x: Math.round(edge.from.x + ux * fromInset), z: Math.round(edge.from.z + uz * fromInset) };
        const to = { ...edge.to, x: Math.round(edge.to.x - ux * toInset), z: Math.round(edge.to.z - uz * toInset) };
        let road = this.surfaceRoadCache.get(edge.id);
        if (!road) {
          const protectedSettlements = [...candidates.values()].filter((candidate) => candidate.id !== fromCandidate.id && candidate.id !== toCandidate.id);
          road = planTerrainFollowingRoad(from, to, (roadX, roadZ) => {
            const column = sample(roadX, roadZ);
            const around = [[4, 0], [-4, 0], [0, 4], [0, -4]].map(([ox, oz]) => sample(roadX + ox, roadZ + oz).height);
            const forbidden = protectedSettlements.some((candidate) => {
              const radius = SETTLEMENT_SIZE_RULES[candidate.size].radiusBlocks + 8;
              return (candidate.center.x - roadX) ** 2 + (candidate.center.z - roadZ) ** 2 <= radius * radius;
            });
            return {
              height: column.height,
              waterline: column.waterline,
              water: column.height <= column.waterline,
              forbidden,
              slopeRisk: Math.max(...around.map((height) => Math.abs(height - column.height))),
            };
          });
          this.surfaceRoadCache.set(edge.id, road);
        }
        for (let pointIndex = 0; pointIndex < road.length; pointIndex += 1) {
          const point = road[pointIndex];
          if (!insideChunk(point.x, point.z) || point.kind === "ferry") continue;
          const column = sample(point.x, point.z);
          const roadBlock = point.kind === "bridge" || point.kind === "causeway" ? BlockId.CaveBridge : BlockId.Gravel;
          for (let fillY = Math.max(column.height + 1, point.y - 3); fillY < point.y; fillY += 1) set(point.x, fillY, point.z, point.kind === "road" ? BlockId.Cobblestone : BlockId.StoneBrick, false);
          set(point.x, point.y, point.z, roadBlock, false);
          for (let clearY = point.y + 1; clearY <= Math.min(point.y + 3, column.height + 4); clearY += 1) set(point.x, clearY, point.z, BlockId.Air, false);
          const previous = road[Math.max(0, pointIndex - 1)], next = road[Math.min(road.length - 1, pointIndex + 1)];
          const tangentX = next.x - previous.x, tangentZ = next.z - previous.z;
          const sideX = Math.abs(tangentZ) >= Math.abs(tangentX) ? Math.sign(tangentZ || 1) : 0;
          const sideZ = sideX === 0 ? Math.sign(tangentX || 1) : 0;
          for (const side of [-1, 1] as const) {
            const shoulderX = point.x + sideX * side, shoulderZ = point.z - sideZ * side;
            if (!insideChunk(shoulderX, shoulderZ)) continue;
            const shoulder = sample(shoulderX, shoulderZ);
            if (Math.abs(shoulder.height - point.y) <= 1 && shoulder.height > shoulder.waterline) set(shoulderX, shoulder.height, shoulderZ, roadBlock, false);
          }
          if (previous.kind === "ferry" || next.kind === "ferry") {
            set(point.x, point.y, point.z, BlockId.Planks, false);
            for (const side of [-1, 1] as const) {
              const dockX = point.x + sideX * side;
              const dockZ = point.z - sideZ * side;
              if (insideChunk(dockX, dockZ)) set(dockX, point.y, dockZ, BlockId.Planks, false);
            }
            const ferryId = `surface-road-ferry:${edge.id}:${pointIndex}`;
            this.structureMarkers.set(ferryId, {
              type: "landmark", id: ferryId, position: { x: point.x, y: point.y + 1, z: point.z },
              tag: `surface-road-ferry:${fromCandidate.factionId}:${toCandidate.factionId}`,
            });
          }
          if (pointIndex % 64 === 0) this.structureMarkers.set(`surface-road:${edge.id}:${pointIndex}`, {
            type: "landmark", id: `surface-road:${edge.id}:${pointIndex}`, position: { x: point.x, y: point.y + 1, z: point.z },
            tag: `surface-road:${fromCandidate.factionId}:${toCandidate.factionId}:${edge.loop ? "loop" : "spine"}`,
          });
        }
      }
    }
  }

  private generateSettlementsForChunk(
    chunk: Chunk,
    sample: (x: number, z: number) => ColumnSample,
    set: (x: number, y: number, z: number, type: BlockId, onlyAir?: boolean) => void,
    clearGeneratedGrowth: (bounds: Readonly<{ minX: number; maxX: number; minZ: number; maxZ: number }>) => void,
  ) {
    const minX = chunk.cx * CHUNK_SIZE;
    const minZ = chunk.cz * CHUNK_SIZE;
    const regionSize = 32 * CHUNK_SIZE;
    // Tiled v1 settlements can be wider than the legacy town radius. Scan far
    // enough across region seams to author every connected wall and building.
    // Deepgear switchbacks can extend beyond a town wall while descending
    // from a high mountain shelf to the nearest graph hub. This remains a
    // fixed bounded neighborhood rather than an unbounded structure scan.
    const reach = Math.max(208, SETTLEMENT_SIZE_RULES.town.radiusBlocks + 3);
    const startRegionX = Math.floor((minX - reach) / regionSize);
    const endRegionX = Math.floor((minX + CHUNK_SIZE + reach) / regionSize);
    const startRegionZ = Math.floor((minZ - reach) / regionSize);
    const endRegionZ = Math.floor((minZ + CHUNK_SIZE + reach) / regionSize);
    const insideChunk = (x: number, z: number) => x >= minX && x < minX + CHUNK_SIZE && z >= minZ && z < minZ + CHUNK_SIZE;
    const setGeneratedFacing = (x: number, y: number, z: number, facing: number) => {
      if (!insideChunk(x, z) || y < MIN_Y || y > MAX_Y) return;
      const index = blockIndex(x - minX, y, z - minZ);
      // Player edits and serialized facings always outrank regenerated decor.
      if (this.edits.get(chunk.key)?.has(index)) return;
      const key = `${x},${y},${z}`;
      if (this.blockFacings.has(key)) return;
      const normalized = normalizeBlockFacing(facing);
      if (normalized !== BLOCK_FACING_NORTH) this.blockFacings.set(key, normalized);
    };

    this.generateRegionalRoadsForChunk(chunk, sample, set);

    for (let regionX = startRegionX; regionX <= endRegionX; regionX += 1) for (let regionZ = startRegionZ; regionZ <= endRegionZ; regionZ += 1) {
      const candidateForRegion = (candidateRegionX: number, candidateRegionZ: number) => this.settlementCandidateForRegion(candidateRegionX, candidateRegionZ, sample);
      const validatedCandidateForRegion = (candidateRegionX: number, candidateRegionZ: number) => this.validatedSettlementCandidateForRegion(candidateRegionX, candidateRegionZ, sample);
      const plannedCandidate = candidateForRegion(regionX, regionZ);
      if (!plannedCandidate) {
        // Regions that cannot support a full culturally valid settlement still
        // leave a modest inhabited trace instead of silently becoming empty.
        if (this.generationOptions.profile === "legacy-v14") continue;
        // Heartlands deliberately preserve broad wild bands. Their wayposts
        // are sparse route discoveries, not one fallback structure per empty
        // settlement region as in the legacy scattered profile.
        if (this.generationOptions.settlementPattern === "heartlands-v2"
          && hash2(regionX, regionZ, this.seed ^ 0x77617970) > 0.012 * this.generationOptions.settlementDensity) continue;
        const waypostX = regionX * regionSize + 190 + Math.floor(hash2(regionX, regionZ, this.seed ^ 0x243f6a88) * 132);
        const waypostZ = regionZ * regionSize + 190 + Math.floor(hash2(regionX, regionZ, this.seed ^ 0x85a308d3) * 132);
        const waypostColumn = sample(waypostX, waypostZ);
        if (waypostColumn.height > waypostColumn.waterline + 3) {
          const y = waypostColumn.height + 1;
          const lodgePlan = planGuildLodgeForRegion(this.seed, regionX, regionZ, waypostColumn.biome);
          if (lodgePlan) {
            const guildId = lodgePlan.guildId;
            const lodge = guildHallBlockPalette(guildId, "lodge");
            clearGeneratedGrowth({ minX: waypostX - 4, maxX: waypostX + 4, minZ: waypostZ - 4, maxZ: waypostZ + 4 });
            for (let dz = -3; dz <= 3; dz += 1) for (let dx = -3; dx <= 3; dx += 1) {
              set(waypostX + dx, y, waypostZ + dz, lodge.hallFloor, false);
              if (Math.abs(dx) === 3 || Math.abs(dz) === 3) {
                if (!(dz === -3 && Math.abs(dx) <= 1)) for (let dy = 1; dy <= 3; dy += 1) set(waypostX + dx, y + dy, waypostZ + dz, (Math.abs(dx) === 3 && Math.abs(dz) === 3) ? lodge.corner : lodge.buildingWall, false);
              }
              set(waypostX + dx, y + 4, waypostZ + dz, lodge.roof, false);
            }
            set(waypostX - 2, y + 1, waypostZ - 4, lodge.corner, false);
            set(waypostX + 2, y + 1, waypostZ - 4, lodge.corner, false);
            set(waypostX - 2, y + 2, waypostZ - 4, BlockId.Torch, false);
            set(waypostX + 2, y + 2, waypostZ - 4, BlockId.Torch, false);
            set(waypostX + 2, y + 1, waypostZ + 1, BlockId.Chest, false);
            if (insideChunk(waypostX, waypostZ)) {
              const id = `guild-lodge:${guildId}:${regionX}:${regionZ}`;
              this.structureMarkers.set(id, { type: "landmark", id, position: { x: waypostX, y: y + 1, z: waypostZ - 4 }, tag: `guild-lodge:${guildId}:${BIOME_NAMES[waypostColumn.biome]}` });
              this.structureMarkers.set(`${id}:chest`, { type: "chest", id: `${id}:locker`, position: { x: waypostX + 2, y: y + 1, z: waypostZ + 1 }, lootTable: "adventure-cache", loot: rollStructureLoot("adventure-cache", `${this.seedText}:${id}`, 3) });
            }
          } else {
            for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as const) set(waypostX + dx, y, waypostZ + dz, BlockId.CaveBridge, false);
            set(waypostX, y + 1, waypostZ, BlockId.CaveMarker, false);
            set(waypostX + 1, y + 1, waypostZ + 1, BlockId.Torch, false);
            if (insideChunk(waypostX, waypostZ)) this.structureMarkers.set(`inhabited-waypost:${regionX}:${regionZ}`, {
              type: "landmark",
              id: `inhabited-waypost:${regionX}:${regionZ}`,
              position: { x: waypostX, y: y + 1, z: waypostZ },
              tag: `inhabited-waypost:${BIOME_NAMES[waypostColumn.biome]}`,
            });
          }
        }
        continue;
      }
      const candidate = validatedCandidateForRegion(regionX, regionZ);
      if (!candidate) continue;
      const centerColumn = sample(candidate.center.x, candidate.center.z);
      const underwater = candidate.environment === "underwater";
      const underground = candidate.environment === "underground";

      // Surface roads are authored by the chunk-local regional graph pass
      // above; Deepgear holds retain their protected switchback/lift network.
      // Hall placement is resolved from the complete four-by-four regional
      // settlement cluster, not from chunk load order. Each accepted town can
      // surrender at most one non-civic parcel, while each guild receives a
      // deterministic regional quota and culture compatibility check.
      const hallMacroX = Math.floor(regionX / 4) * 4;
      const hallMacroZ = Math.floor(regionZ / 4) * 4;
      const hallRegionId = `settlement-cluster:${Math.floor(regionX / 4)}:${Math.floor(regionZ / 4)}`;
      const hallCandidates: GuildHallCandidate[] = [];
      for (let hallDx = 0; hallDx < 4; hallDx += 1) for (let hallDz = 0; hallDz < 4; hallDz += 1) {
        const accepted = validatedCandidateForRegion(hallMacroX + hallDx, hallMacroZ + hallDz);
        if (!accepted) continue;
        hallCandidates.push({
          settlementId: accepted.id,
          factionId: accepted.factionId,
          size: accepted.size,
          regionId: hallRegionId,
          civicParcelId: `${accepted.id}:guild-parcel`,
          compatibleGuildIds: compatibleGuildIdsForSettlement(accepted.factionId, accepted.environment ?? "surface"),
        });
      }
      const hallPlacement = planGuildHalls(this.seedText, hallCandidates).find((entry) => entry.settlementId === candidate.id) ?? null;
      let plannedLayout = planSettlementLayout(candidate);
      if (hallPlacement) {
        const replaceable = plannedLayout.buildings.filter((building) => ![
          "mayor-hall", "tide-hall", "sugar-palace", "moonbough-hall", "deepgear-hall", "guardhouse", "entrance-barracks",
        ].includes(building.role));
        const replacement = replaceable[Math.floor(hash2(candidate.center.x, candidate.center.z, this.seed ^ 0x71a11) * Math.max(1, replaceable.length))] ?? plannedLayout.buildings.at(-1);
        if (replacement) plannedLayout = {
          ...plannedLayout,
          buildings: Object.freeze(plannedLayout.buildings.map((building) => building.id !== replacement.id ? building : Object.freeze({
            ...building,
            width: Math.max(7, building.width),
            depth: Math.max(7, building.depth),
            materialPalette: Object.freeze([...building.materialPalette, `guild:${hallPlacement.guildId}`, `hall-state:${hallPlacement.state}`]),
            furniture: Object.freeze([
              ...building.furniture,
              { kind: "table" as const, position: building.position, facing: building.facing, functional: true },
              { kind: "chair" as const, position: { ...building.position, x: building.position.x + 2 }, facing: ((building.facing + 2) & 3) as 0 | 1 | 2 | 3, functional: true },
              { kind: "chair" as const, position: { ...building.position, x: building.position.x - 2 }, facing: building.facing, functional: true },
            ]),
            guildHall: Object.freeze({ placementId: hallPlacement.id, guildId: hallPlacement.guildId, state: hallPlacement.state, variantId: hallPlacement.variantId }),
          }))),
        };
      }
      const layout = underwater ? fitUnderwaterSettlementLayout(plannedLayout, sample) : plannedLayout;
      if (!layout) continue;
      const palette = settlementBlockPalette(candidate.factionId);
      this.settlementPlans.set(candidate.id, { candidate, layout });
      let deepgearApproachPath: readonly DeepgearMineRoadPoint[] = [];
      if (underground && this.generationOptions.profile === "world-below-v15") {
        // Every Deepgear hold is a real cave-graph anchor. A broad mine road
        // reaches the nearest upper hub, while paired lift platforms provide a
        // reliable surface route even before the player owns ropes or a mount.
        const holdY = candidate.floorY ?? Math.max(MIN_Y + 10, centerColumn.height - 18);
        const graphTarget = nearestUpperCaveNode(this.seed, candidate.center.x, candidate.center.z);
        const approachStart = { x: candidate.center.x, y: holdY + 2, z: candidate.center.z };
        const approachPath = planDeepgearMineRoad(approachStart, graphTarget);
        deepgearApproachPath = approachPath;
        // Carve first across the complete local path. A descending stair's
        // headroom overlaps the previous tread, so placing floors in this same
        // pass would let later clear operations erase the road behind them.
        for (const point of approachPath) {
          const { x: roadX, y: roadY, z: roadZ } = point;
          for (let dy = 0; dy <= 3; dy += 1) for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) {
            if (Math.abs(dx) + Math.abs(dz) > 1) continue;
            set(roadX + dx, roadY + dy, roadZ + dz, BlockId.Air, false);
          }
        }
        for (const point of approachPath) set(point.x, point.y - 1, point.z, BlockId.DeepgearBrick, false);
        const approachColumns = new Set(approachPath.map((point) => `${point.x},${point.z}`));
        for (let index = 0; index < approachPath.length; index += 18) {
          const point = approachPath[index];
          const lampOffset = [[1, 0], [-1, 0], [0, 1], [0, -1]]
            .find(([dx, dz]) => !approachColumns.has(`${point.x + dx},${point.z + dz}`));
          if (lampOffset) set(point.x + lampOffset[0], point.y + 1, point.z + lampOffset[1], BlockId.DeepgearLantern, false);
        }

        const lift = selectDeepgearLiftSite(candidate.center, layout.radiusBlocks, holdY, sample);
        const liftX = lift.x;
        const liftZ = lift.z;
        const liftBottomY = lift.liftBottomY;
        const liftTopY = lift.liftTopY;
        if (liftTopY - liftBottomY >= 5) {
          for (let shaftY = liftBottomY + 1; shaftY < liftTopY; shaftY += 1) {
            for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) set(liftX + dx, shaftY, liftZ + dz, BlockId.Air, false);
            if ((shaftY - liftBottomY) % 16 === 8) set(liftX + 2, shaftY, liftZ, BlockId.DeepgearLantern, false);
          }
          // A mountain hold should announce itself at the surface. The low
          // gatehouse also keeps the lift mouth readable in snow, broken
          // highland terrain, and badlands shelves without flattening a broad
          // piece of the regional landform.
          for (let dx = -2; dx <= 2; dx += 1) for (let dz = -2; dz <= 2; dz += 1) {
            // Keep a solid landing ring without capping the 3x3 lift shaft.
            // The paired platforms need continuous vertical clearance even
            // when the surface gate lands on a steep mountain shelf.
            if (Math.max(Math.abs(dx), Math.abs(dz)) === 2) {
              set(liftX + dx, liftTopY - 1, liftZ + dz, BlockId.DeepgearBrick, false);
            } else set(liftX + dx, liftTopY - 1, liftZ + dz, BlockId.Air, false);
          }
          // A sharp shelf drop becomes a compact supported gate tower rather
          // than a floating platform. Only the four perimeter piers descend;
          // the central 3x3 shaft remains clear and surrounding relief stays.
          for (let supportY = lift.surfaceY + 1; supportY < liftTopY - 1; supportY += 1) for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]] as const) {
            set(liftX + dx, supportY, liftZ + dz, BlockId.DeepgearBrick, false);
          }
          for (let dy = 1; dy <= 3; dy += 1) {
            set(liftX - 2, liftTopY + dy, liftZ, BlockId.RivetedBrass, false);
            set(liftX + 2, liftTopY + dy, liftZ, BlockId.RivetedBrass, false);
          }
          for (let dx = -2; dx <= 2; dx += 1) set(liftX + dx, liftTopY + 4, liftZ, BlockId.DeepgearBrick, false);
          set(liftX - 2, liftTopY + 2, liftZ + 1, BlockId.DeepgearLantern, false);
          set(liftX + 2, liftTopY + 2, liftZ + 1, BlockId.DeepgearLantern, false);
          set(liftX, liftBottomY, liftZ, BlockId.DeepgearLift, false);
          set(liftX, liftTopY, liftZ, BlockId.DeepgearLift, false);
          set(liftX, liftTopY + 1, liftZ, BlockId.Air, false);
          set(liftX, liftTopY + 2, liftZ, BlockId.Air, false);
          if (insideChunk(liftX, liftZ)) this.structureMarkers.set(`${candidate.id}:deepgear-lift`, {
            type: "landmark",
            id: `${candidate.id}:deepgear-lift`,
            position: { x: liftX, y: liftTopY + 1, z: liftZ },
            tag: `deepgear-lift:${candidate.id}:cave-graph-anchor`,
          });
        }
      }
      const bounds = {
        minX: candidate.center.x - layout.radiusBlocks - 2,
        maxX: candidate.center.x + layout.radiusBlocks + 2,
        minZ: candidate.center.z - layout.radiusBlocks - 2,
        maxZ: candidate.center.z + layout.radiusBlocks + 2,
      };
      if (bounds.maxX < minX || bounds.minX >= minX + CHUNK_SIZE || bounds.maxZ < minZ || bounds.minZ >= minZ + CHUNK_SIZE) continue;
      clearGeneratedGrowth(bounds);

      for (const point of layout.paths) if (insideChunk(point.x, point.z)) {
        const column = sample(point.x, point.z);
        if (underwater || underground) {
          const pathY = point.y ?? column.height + 1;
          set(point.x, pathY, point.z, palette.path, false);
          if (underground) for (let y = 1; y <= 3; y += 1) {
            set(point.x, pathY + y, point.z, BlockId.Air, false);
            if (y <= 2) {
              set(point.x + 1, pathY + y, point.z, BlockId.Air, false);
              set(point.x - 1, pathY + y, point.z, BlockId.Air, false);
              set(point.x, pathY + y, point.z + 1, BlockId.Air, false);
              set(point.x, pathY + y, point.z - 1, BlockId.Air, false);
            }
          }
        }
        else if (column.height > column.waterline) set(point.x, column.height, point.z, palette.path, false);
      }

      for (const node of layout.wall) if (insideChunk(node.position.x, node.position.z)) {
        const ground = sample(node.position.x, node.position.z).height;
        set(node.position.x, ground + 1, node.position.z, palette.perimeterWall, false);
        if (node.kind === "tower") {
          set(node.position.x, ground + 2, node.position.z, palette.tower, false);
          set(node.position.x, ground + 3, node.position.z, BlockId.Torch, false);
        }
      }
      for (const gate of layout.gates) if (insideChunk(gate.position.x, gate.position.z)) {
        const ground = sample(gate.position.x, gate.position.z).height;
        const gateBlock = settlementGateBlockForFacing(gate.facing);
        set(gate.position.x, ground + 1, gate.position.z, gateBlock, false);
      }
      for (const light of layout.lights) if (insideChunk(light.position.x, light.position.z)) {
        const ground = sample(light.position.x, light.position.z).height;
        if (underwater) set(light.position.x, light.position.y ?? ground + 2, light.position.z, BlockId.Glowstone, false);
        else if (underground) set(light.position.x, light.position.y ?? (candidate.floorY ?? ground) + 2, light.position.z, BlockId.DeepgearLantern, false);
        else {
          set(light.position.x, ground + 1, light.position.z, palette.lightBase, false);
          set(light.position.x, ground + 2, light.position.z, BlockId.Torch, false);
        }
      }

      const buildingInteriorY = new Map<string, number>();
      for (const building of layout.buildings) {
        const buildingPalette = building.guildHall ? guildHallBlockPalette(building.guildHall.guildId, building.guildHall.state) : palette;
        const halfWidth = Math.floor(building.width / 2);
        const halfDepth = Math.floor(building.depth / 2);
        const rotatedFootprint = building.facing % 2 === 1;
        const extentX = rotatedFootprint ? halfDepth : halfWidth;
        const extentZ = rotatedFootprint ? halfWidth : halfDepth;
        const buildingBounds = {
          minX: building.position.x - extentX,
          maxX: building.position.x + extentX,
          minZ: building.position.z - extentZ,
          maxZ: building.position.z + extentZ,
        };
        if (buildingBounds.maxX < minX || buildingBounds.minX >= minX + CHUNK_SIZE || buildingBounds.maxZ < minZ || buildingBounds.minZ >= minZ + CHUNK_SIZE) continue;
        const baseY = underwater
          ? Math.max(sample(building.position.x, building.position.z).height + 1, (building.position.y ?? candidate.floorY ?? centerColumn.height) - 1)
          : underground ? (building.position.y ?? candidate.floorY ?? centerColumn.height - 18) - 1
          : sample(building.position.x, building.position.z).height;
        buildingInteriorY.set(building.id, baseY + 1);
        const wallHeight = building.floors * 3 + 1;
        const localCoordinates = (x: number, z: number) => {
          const dx = x - building.position.x;
          const dz = z - building.position.z;
          if (building.facing === 1) return { u: dz, v: -dx };
          if (building.facing === 2) return { u: -dx, v: -dz };
          if (building.facing === 3) return { u: -dz, v: dx };
          return { u: dx, v: dz };
        };
        const worldFromLocal = (u: number, v: number) => building.facing === 1
          ? { x: building.position.x - v, z: building.position.z + u }
          : building.facing === 2 ? { x: building.position.x - u, z: building.position.z - v }
            : building.facing === 3 ? { x: building.position.x + v, z: building.position.z - u }
              : { x: building.position.x + u, z: building.position.z + v };
        const civic = ["mayor-hall", "tide-hall", "sugar-palace", "moonbough-hall", "deepgear-hall"].includes(building.role);
        if (candidate.factionId === "wood-elves" && building.role === "moonwell") {
          // Moonwells are open living courtyards rather than sealed houses.
          // Their shallow source pond gives Glowfin a real water habitat and
          // leaves waterlogged Lumenreed available for gathering/replanting.
          for (let x = building.position.x - 2; x <= building.position.x + 2; x += 1) for (let z = building.position.z - 2; z <= building.position.z + 2; z += 1) {
            if (!insideChunk(x, z)) continue;
            for (let y = baseY + 1; y <= baseY + 4; y += 1) set(x, y, z, BlockId.Air, false);
            const edge = Math.max(Math.abs(x - building.position.x), Math.abs(z - building.position.z)) === 2;
            if (edge) set(x, baseY, z, BlockId.MoonSlate, false);
            else {
              set(x, baseY - 1, z, BlockId.MoonSlate, false);
              const reed = (Math.abs(x - building.position.x) === 1 && z === building.position.z)
                || (Math.abs(z - building.position.z) === 1 && x === building.position.x);
              set(x, baseY, z, reed ? BlockId.Lumenreed : BlockId.Water, false);
            }
          }
          if (insideChunk(building.position.x + 2, building.position.z)) {
            set(building.position.x + 2, baseY + 1, building.position.z, BlockId.Moonwell, false);
          }
          if (insideChunk(building.position.x, building.position.z)) {
            const glowfinMarker: StructureMarker = {
              type: "spawn",
              id: `${building.id}:glowfin-shoal`,
              position: { x: building.position.x, y: baseY, z: building.position.z },
              mobKind: "glowfin",
              count: 2,
              radius: 1.25,
              persistent: true,
              tags: [`settlement:${candidate.id}`, "faction:wood-elves", "habitat:glimmer-pond", "aligned:true"],
            };
            this.structureMarkers.set(`${candidate.id}:spawn:${glowfinMarker.id}`, glowfinMarker);
          }
          continue;
        }
        for (let x = buildingBounds.minX; x <= buildingBounds.maxX; x += 1) for (let z = buildingBounds.minZ; z <= buildingBounds.maxZ; z += 1) {
          if (!insideChunk(x, z)) continue;
          const { u, v } = localCoordinates(x, z);
          const chamferedCorner = civic && Math.abs(u) === halfWidth && Math.abs(v) === halfDepth;
          if (underwater) {
            const edgeX = Math.abs(u) === halfWidth;
            const edgeZ = Math.abs(v) === halfDepth;
            const corner = edgeX && edgeZ;
            const arch = edgeX || edgeZ;
            if (chamferedCorner) continue;
            if (arch) set(x, baseY, z, BlockId.MoonSlate, false);
            if (corner) for (let y = 1; y <= Math.min(4, wallHeight); y += 1) set(x, baseY + y, z, buildingPalette.corner, false);
            else if (arch && ((x + z) & 3) === 0) set(x, baseY + 2, z, buildingPalette.buildingWall, false);
            if (arch && ((Math.abs(x - building.position.x) + Math.abs(z - building.position.z)) & 1) === 0) {
              set(x, baseY + Math.min(5, wallHeight), z, buildingPalette.roof, false);
            }
            continue;
          }
          if (underground) {
            for (let y = baseY; y <= baseY + wallHeight + 2; y += 1) set(x, y, z, BlockId.Air, false);
            set(x, baseY, z, building.guildHall || building.role === "deepgear-hall" || building.role === "golem-forge" ? buildingPalette.hallFloor : buildingPalette.floor, false);
            const edgeX = Math.abs(u) === halfWidth;
            const edgeZ = Math.abs(v) === halfDepth;
            if (chamferedCorner) continue;
            if (edgeX || edgeZ) for (let y = 1; y <= wallHeight; y += 1) {
              const corner = edgeX && edgeZ;
              const window = !corner && y === 2 && ((x + z) & 3) === 0;
              set(x, baseY + y, z, window ? BlockId.RivetedBrass : corner ? buildingPalette.corner : buildingPalette.buildingWall, false);
            }
            const archRise = Math.max(0, 2 - Math.floor(Math.abs(u) / Math.max(1, halfWidth / 2)));
            set(x, baseY + wallHeight + 1 + archRise, z, buildingPalette.roof, false);
            continue;
          }
          const localHeight = sample(x, z).height;
          for (let y = Math.min(localHeight + 1, baseY); y <= baseY; y += 1) set(x, y, z, buildingPalette.corner, false);
          for (let y = baseY + 1; y <= Math.max(baseY + wallHeight + 2, localHeight + 2); y += 1) set(x, y, z, BlockId.Air, false);
          set(x, baseY, z, building.guildHall || building.role === "mayor-hall" || building.role === "sugar-palace" || building.role === "moonbough-hall" ? buildingPalette.hallFloor : buildingPalette.floor, false);
          const edgeX = Math.abs(u) === halfWidth;
          const edgeZ = Math.abs(v) === halfDepth;
          if (chamferedCorner) continue;
          if (edgeX || edgeZ) for (let y = 1; y <= wallHeight; y += 1) {
            const corner = edgeX && edgeZ;
            const window = !corner && y % 3 === 2 && ((x + z) & 3) === 0;
            set(x, baseY + y, z, window ? BlockId.Glass : corner ? buildingPalette.corner : buildingPalette.buildingWall, false);
          }
          const roofRise = candidate.factionId === "hobbits"
            ? Math.max(0, 2 - Math.floor(Math.abs(v) / Math.max(1, halfDepth / 2)))
            : candidate.factionId === "sugarcourt"
              ? Math.max(0, 3 - Math.floor((Math.abs(u) + Math.abs(v)) / Math.max(1, Math.min(halfWidth, halfDepth))))
              : candidate.factionId === "wood-elves"
                ? Math.max(0, 2 - Math.floor(Math.hypot(u / Math.max(1, halfWidth), v / Math.max(1, halfDepth)) * 2))
                : candidate.factionId === "goblins" ? (u + halfWidth) % 3 === 0 ? 2 : 0
                  : (Math.abs(u) + Math.abs(v)) % 3 === 0 ? 1 : 0;
          set(x, baseY + wallHeight + 1 + roofRise, z, buildingPalette.roof, false);
        }
        const door = worldFromLocal(0, -halfDepth);
        const doorX = door.x;
        const doorZ = door.z;
        if ((!underwater || underground) && insideChunk(doorX, doorZ)) {
          const xAxisDoor = building.facing % 2 === 1;
          set(doorX, baseY + 1, doorZ, xAxisDoor ? BlockId.DoorXClosedLower : BlockId.DoorClosedLower, false);
          set(doorX, baseY + 2, doorZ, xAxisDoor ? BlockId.DoorXClosedUpper : BlockId.DoorClosedUpper, false);
        }
        for (const furniture of building.furniture) {
          if (furniture.kind === "door") continue;
          const fy = underwater || underground ? furniture.position.y ?? baseY + 1 : baseY + 1;
          const bed = furniture.kind === "bed" ? settlementBedBlocksForFacing(furniture.facing) : null;
          const footInside = insideChunk(furniture.position.x, furniture.position.z);
          const headInside = bed ? insideChunk(furniture.position.x + bed.dx, furniture.position.z + bed.dz) : false;
          if (!footInside && !headInside) continue;
          const furnitureBlock = furniture.kind === "rest-alcove" || furniture.kind === "nest" ? BlockId.HearthChair
            : furniture.kind === "kelp-trough" ? BlockId.LumenKelp
              : furniture.kind === "coral-loom" ? BlockId.CartographyTable
                : furniture.kind === "pearl-counter" ? BlockId.Chest
                  : furniture.kind === "glow-basin" ? BlockId.AlchemyStand
                    : furniture.kind === "sugarworks-kettle" || furniture.kind === "syrup-vat" ? BlockId.Sugarworks
                      : furniture.kind === "confection-counter" ? BlockId.WildwoodTable
                        : furniture.kind === "pet-bed" ? BlockId.HearthChair
                          : furniture.kind === "golem-cradle" ? BlockId.GolemForge
                            : furniture.kind === "mana-conduit" ? BlockId.AetherConduit
                              : furniture.kind === "powder-bench" ? BlockId.Powderworks
                                : furniture.kind === "gear-table" ? BlockId.GearTable
                                  : furniture.kind === "bright-lantern" ? BlockId.DeepgearLantern
                                    : furniture.kind === "moonwell-basin" ? BlockId.Moonwell
                                      : furniture.kind === "tome-lectern" ? BlockId.TomeDisplay
                                        : furniture.kind === "living-chair" ? BlockId.MoonboughChair
                                          : furniture.kind === "wheat-mill" ? BlockId.WheatMill
                    : furniture.kind === "bed" ? bed!.foot
            : furniture.kind === "chair" ? BlockId.HearthChair
              : furniture.kind === "distillery" || furniture.kind === "barrel" ? BlockId.Distillery
                : furniture.kind === "forge" ? BlockId.Furnace
                  : furniture.kind === "bank-counter" || furniture.kind === "merchant-counter" ? BlockId.Chest
                    : furniture.kind === "table" ? BlockId.CartographyTable
                      : BlockId.CraftingTable;
          if (footInside) set(furniture.position.x, fy, furniture.position.z, furnitureBlock, false);
          if (footInside && isDirectionallyPlacedBlock(furnitureBlock)) setGeneratedFacing(furniture.position.x, fy, furniture.position.z, furniture.facing);
          if (bed) set(furniture.position.x + bed.dx, fy, furniture.position.z + bed.dz, bed.head, false);
        }
        if (building.guildHall) {
          const hall = building.guildHall;
          const front = worldFromLocal(0, -halfDepth - 1);
          const crestY = baseY + wallHeight + 2;
          const accent = buildingPalette.corner;
          // Lodge: a readable paired crest. Established: lit corner standards.
          // Charter: an extra central spire. Upgrades are additive so old
          // worlds never require destructive structure rewrites.
          for (const side of [-1, 1] as const) {
            const post = worldFromLocal(side * 2, -halfDepth - 1);
            set(post.x, baseY + 1, post.z, accent, false);
            set(post.x, baseY + 2, post.z, hall.guildId === "tideglass" ? BlockId.Glowstone : BlockId.Torch, false);
          }
          if (hall.state !== "lodge") for (const [u, v] of [[-halfWidth, -halfDepth], [halfWidth, -halfDepth], [-halfWidth, halfDepth], [halfWidth, halfDepth]] as const) {
            const post = worldFromLocal(u, v);
            set(post.x, crestY, post.z, accent, false);
            set(post.x, crestY + 1, post.z, BlockId.Torch, false);
          }
          if (hall.state === "charter") {
            set(building.position.x, crestY + 1, building.position.z, accent, false);
            set(building.position.x, crestY + 2, building.position.z, BlockId.Glowstone, false);
          }
          if (insideChunk(building.position.x, building.position.z)) {
            this.structureMarkers.set(`${candidate.id}:guild-hall:${hall.placementId}`, {
              type: "landmark",
              id: hall.placementId,
              position: { x: front.x, y: baseY + 1, z: front.z },
              tag: `guild-hall:${hall.guildId}:${hall.state}:${candidate.id}`,
            });
          }
          const principals = GUILD_NPCS.filter((npc) => npc.guildId === hall.guildId);
          principals.forEach((npc, index) => {
            const local = worldFromLocal((index - 1) * 2, index === 1 ? 1 : 0);
            if (!insideChunk(local.x, local.z)) return;
            const marker: StructureMarker = {
              type: "spawn",
              id: `guild-npc:${npc.id}:${candidate.id}`,
              position: { x: local.x, y: baseY + 1, z: local.z },
              mobKind: guildNpcMobKind(candidate.factionId, index),
              count: 1,
              radius: .25,
              persistent: true,
              tags: [
                `settlement:${candidate.id}`, `resident:guild-npc:${npc.id}:${candidate.id}`, `name:${npc.name}`,
                `profession:guild:${hall.guildId}:${npc.id}`, `faction:${candidate.factionId}`, `guild:${hall.guildId}`,
                `guild-role:${npc.role}`, `schedule:${npc.homeSchedule.join("|")}`, ...(npc.recruitable ? ["recruitable:true"] : []),
              ],
            };
            this.structureMarkers.set(`${candidate.id}:spawn:${marker.id}`, marker);
          });
        }
      }

      // Settlement shells are stamped after the mine road so doors, roofs, or
      // furniture can otherwise recap a tread. Restore a narrow protected
      // easement outside the civic center after all buildings are complete;
      // the wider original cutting remains wherever it was unobstructed.
      for (const point of deepgearApproachPath) {
        if (!insideChunk(point.x, point.z) || Math.hypot(point.x - candidate.center.x, point.z - candidate.center.z) < 6) continue;
        set(point.x, point.y - 1, point.z, BlockId.DeepgearBrick, false);
        for (let dy = 0; dy <= 3; dy += 1) set(point.x, point.y + dy, point.z, BlockId.Air, false);
      }

      if (insideChunk(candidate.center.x, candidate.center.z)) {
        const marker: StructureMarker = {
          type: "landmark",
          id: candidate.id,
          position: { x: candidate.center.x, y: candidate.center.y ?? centerColumn.height + 2, z: candidate.center.z },
          tag: `settlement:${candidate.factionId}:${candidate.size}`,
          mapLayer: candidate.environment,
        };
        this.structureMarkers.set(`${candidate.id}:landmark:${candidate.id}`, marker);
      }
      const state = createSettlementState("world", candidate, layout);
      for (const resident of state.residents) if (insideChunk(resident.position.x, resident.position.z)) {
        const mobKind = settlementResidentMobKind(resident, candidate.factionId);
        const interiorY = resident.homeBuildingId ? buildingInteriorY.get(resident.homeBuildingId) : undefined;
        const marker: StructureMarker = {
          type: "spawn",
          id: resident.id,
          position: { x: resident.position.x, y: interiorY ?? resident.position.y ?? sample(resident.position.x, resident.position.z).height + 1, z: resident.position.z },
          mobKind,
          count: 1,
          radius: 0.25,
          persistent: true,
          tags: [`settlement:${candidate.id}`, `resident:${resident.id}`, `name:${resident.name}`, `profession:${resident.profession}`, `faction:${candidate.factionId}`, "authored-interior-spawn"],
        };
        this.structureMarkers.set(`${candidate.id}:spawn:${resident.id}`, marker);
      }
      for (const creature of state.alignedCreatures) if (insideChunk(creature.position.x, creature.position.z)) {
        const marker: StructureMarker = {
          type: "spawn",
          id: creature.id,
          position: { x: creature.position.x, y: creature.position.y ?? sample(creature.position.x, creature.position.z).height + 1, z: creature.position.z },
          mobKind: creature.kind,
          count: 1,
          radius: alignedCreatureSpawnRadius(creature.kind),
          persistent: true,
          tags: [`settlement:${candidate.id}`, `faction:${creature.factionId}`, "aligned:true"],
        };
        this.structureMarkers.set(`${candidate.id}:spawn:${creature.id}`, marker);
      }
    }
  }

  structureMarkersNear(x: number, y: number, z: number, radius = 48) {
    const radiusSquared = radius * radius;
    return [...this.structureMarkers.entries()].filter(([, marker]) => {
      const dx = marker.position.x - x;
      const dy = marker.position.y - y;
      const dz = marker.position.z - z;
      return dx * dx + dy * dy + dz * dz <= radiusSquared;
    });
  }

  structureMarkerAt(x: number, y: number, z: number, type?: StructureMarker["type"]) {
    return [...this.structureMarkers.entries()].find(([, marker]) => marker.position.x === x && marker.position.y === y && marker.position.z === z && (!type || marker.type === type));
  }

  getBlock(x: number, y: number, z: number): BlockId | undefined {
    if (y > MAX_Y) return BlockId.Air;
    if (y < MIN_Y) return BlockId.Bedrock;
    const sx = splitCoordinate(x);
    const sz = splitCoordinate(z);
    const chunk = this.chunks.get(chunkKey(sx.chunk, sz.chunk));
    if (!chunk) return undefined;
    return chunk.blocks[blockIndex(sx.local, y, sz.local)] as BlockId;
  }

  getBlockForMesh(x: number, y: number, z: number) {
    return this.getBlock(x, y, z) ?? BlockId.Air;
  }

  writeChunkBlock(chunk: Chunk, index: number, type: BlockId) {
    const previous = chunk.blocks[index] as BlockId;
    if (previous === type) return;
    chunk.blocks[index] = type;
    const columnArea = CHUNK_SIZE * CHUNK_SIZE;
    const section = Math.floor(index / (columnArea * SECTION_HEIGHT));
    const column = index % columnArea;
    const y = MIN_Y + Math.floor(index / columnArea);
    if (previous === BlockId.Air && type !== BlockId.Air) chunk.sectionBlockCounts[section] += 1;
    else if (previous !== BlockId.Air && type === BlockId.Air) chunk.sectionBlockCounts[section] -= 1;
    // Lava is reindexed once per bounded spatial cell after the edit completes.
    if (blockEmitsLight(type) && type !== BlockId.Lava) chunk.lightIndices.add(index);
    else chunk.lightIndices.delete(index);
    if (LEAF_BLOCK_SET.has(type)) chunk.leafIndices.add(index);
    else chunk.leafIndices.delete(index);
    const previousBlockedSky = blocksSky(previous);
    const nextBlocksSky = blocksSky(type);
    const previousSkyTop = chunk.skyTops[column];
    if (nextBlocksSky && y > previousSkyTop) chunk.skyTops[column] = y;
    else if (previousBlockedSky && !nextBlocksSky && chunk.skyTops[column] === y) {
      let nextTop = MIN_Y - 1;
      for (let scanY = y - 1, scanIndex = index - columnArea; scanY >= MIN_Y; scanY -= 1, scanIndex -= columnArea) {
        if (!blocksSky(chunk.blocks[scanIndex] as BlockId)) continue;
        nextTop = scanY;
        break;
      }
      chunk.skyTops[column] = nextTop;
    }
    // Propagated skylight updates mesh light attributes without rebuilding
    // unchanged positions, UVs, normals, or indices in lower sections.
  }

  private refreshLavaLightCell(x: number, y: number, z: number) {
    const origin = lavaLightCellOrigin(x, y, z);
    const sx = splitCoordinate(origin.x);
    const sz = splitCoordinate(origin.z);
    const chunk = this.chunks.get(chunkKey(sx.chunk, sz.chunk));
    if (!chunk) return;
    let representative = -1;
    const maxY = Math.min(MAX_Y, origin.y + LAVA_LIGHT_CELL_SIZE.y - 1);
    for (let cellY = origin.y; cellY <= maxY; cellY += 1) {
      for (let cellZ = origin.z; cellZ < origin.z + LAVA_LIGHT_CELL_SIZE.xz; cellZ += 1) {
        for (let cellX = origin.x; cellX < origin.x + LAVA_LIGHT_CELL_SIZE.xz; cellX += 1) {
          const localX = cellX - sx.chunk * CHUNK_SIZE;
          const localZ = cellZ - sz.chunk * CHUNK_SIZE;
          const index = blockIndex(localX, cellY, localZ);
          if ((chunk.blocks[index] as BlockId) !== BlockId.Lava) continue;
          chunk.lightIndices.delete(index);
          if (representative < 0) representative = index;
        }
      }
    }
    if (representative >= 0) chunk.lightIndices.add(representative);
  }

  skyTopAt(x: number, z: number) {
    const sx = splitCoordinate(x);
    const sz = splitCoordinate(z);
    const chunk = this.chunks.get(chunkKey(sx.chunk, sz.chunk));
    return chunk?.skyTops[sx.local + sz.local * CHUNK_SIZE];
  }

  setBlock(x: number, y: number, z: number, type: BlockId, record = true, immediate = false) {
    if (y < MIN_Y || y > MAX_Y) return false;
    const sx = splitCoordinate(x);
    const sz = splitCoordinate(z);
    const key = chunkKey(sx.chunk, sz.chunk);
    const chunk = this.chunks.get(key) ?? this.generateChunk(sx.chunk, sz.chunk);
    const index = blockIndex(sx.local, y, sz.local);
    const previousType = chunk.blocks[index] as BlockId;
    const resolvedType = type === BlockId.Air && isWaterloggedFloraBlock(previousType) ? BlockId.Water : type;
    if (previousType === resolvedType) return true;
    this.mutationRevision += 1;
    const affectedLayers = this.renderLayersAffectedByEdit(x, y, z, previousType, resolvedType);
    this.markPlayerEditMutation();
    if (!isDirectionallyPlacedBlock(resolvedType)) this.blockFacings.delete(`${x},${y},${z}`);
    this.writeChunkBlock(chunk, index, resolvedType);
    for (const observe of this.blockEditObservers) observe({ x, y, z });
    this.lightEngine.updateBlock({ x, y, z, previous: previousType, next: resolvedType });
    if (previousType === BlockId.Lava || resolvedType === BlockId.Lava) this.refreshLavaLightCell(x, y, z);
    if (record) {
      let edits = this.edits.get(key);
      if (!edits) { edits = new Map(); this.edits.set(key, edits); }
      edits.set(index, resolvedType);
      this.chunkEditSignatureCache.delete(key);
    }
    this.refreshEditedBlock(sx.chunk, sz.chunk, sx.local, y, sz.local, immediate, affectedLayers);
    if (immediate) this.flushLightSections();
    if (immediate) this.markPlayerEditLocalMeshVisible();
    return true;
  }

  setChestVisualHidden(x: number, y: number, z: number, hidden: boolean) {
    const visualKey = `${x},${y},${z}`;
    if (this.hiddenChestVisuals.has(visualKey) === hidden) return false;
    if (hidden) this.hiddenChestVisuals.add(visualKey);
    else this.hiddenChestVisuals.delete(visualKey);

    const sx = splitCoordinate(x);
    const sz = splitCoordinate(z);
    const key = chunkKey(sx.chunk, sz.chunk);
    const chunk = this.chunks.get(key);
    if (!chunk) return true;
    const section = sectionForY(y);
    if (chunk.group.visible) {
      this.cancelQueuedMesh(key, section);
      this.rebuildSection(chunk, section);
    } else this.queueMesh(key, section, true);
    return true;
  }

  setBlocksBatch(
    changes: Array<{ x: number; y: number; z: number; type: BlockId }>,
    record = true,
    immediate = false,
    deferLighting = false,
  ) {
    const affected = new Set<string>();
    const directlyAffected = new Set<string>();
    const affectedLayersByEntry = new Map<string, Set<WorldRenderLayer>>();
    const markAffected = (entry: string, layers: Iterable<WorldRenderLayer>) => {
      affected.add(entry);
      const recorded = affectedLayersByEntry.get(entry) ?? new Set<WorldRenderLayer>();
      for (const layer of layers) recorded.add(layer);
      affectedLayersByEntry.set(entry, recorded);
    };
    const affectedLavaCells = new Map<string, { x: number; y: number; z: number }>();
    const lightChanges: Array<{ x: number; y: number; z: number; previous: BlockId; next: BlockId }> = [];
    const batchRelight = changes.length > 12;
    let mutated = false;
    for (const change of changes) {
      if (change.y < MIN_Y || change.y > MAX_Y) continue;
      const sx = splitCoordinate(change.x);
      const sz = splitCoordinate(change.z);
      const key = chunkKey(sx.chunk, sz.chunk);
      const chunk = this.chunks.get(key) ?? this.generateChunk(sx.chunk, sz.chunk);
      const index = blockIndex(sx.local, change.y, sz.local);
      const previousType = chunk.blocks[index] as BlockId;
      const resolvedType = change.type === BlockId.Air && isWaterloggedFloraBlock(previousType) ? BlockId.Water : change.type;
      if (previousType === resolvedType) continue;
      mutated = true;
      const affectedLayers = this.renderLayersAffectedByEdit(change.x, change.y, change.z, previousType, resolvedType);
      this.markPlayerEditMutation();
      if (!isDirectionallyPlacedBlock(resolvedType)) this.blockFacings.delete(`${change.x},${change.y},${change.z}`);
      this.writeChunkBlock(chunk, index, resolvedType);
      for (const observe of this.blockEditObservers) observe({ x: change.x, y: change.y, z: change.z });
      const lightChange = { x: change.x, y: change.y, z: change.z, previous: previousType, next: resolvedType };
      if (batchRelight) lightChanges.push(lightChange);
      else this.lightEngine.updateBlock(lightChange);
      if (previousType === BlockId.Lava || resolvedType === BlockId.Lava) {
        affectedLavaCells.set(lavaLightCellKey(change.x, change.y, change.z), change);
      }
      if (record) {
        let edits = this.edits.get(key);
        if (!edits) { edits = new Map(); this.edits.set(key, edits); }
        edits.set(index, resolvedType);
        this.chunkEditSignatureCache.delete(key);
      }
      const section = sectionForY(change.y);
      const directEntry = `${key}:${section}`;
      directlyAffected.add(directEntry);
      markAffected(directEntry, affectedLayers);
      if ((change.y - MIN_Y) % SECTION_HEIGHT === 0) markAffected(`${key}:${section - 1}`, affectedLayers);
      if ((change.y - MIN_Y) % SECTION_HEIGHT === SECTION_HEIGHT - 1) markAffected(`${key}:${section + 1}`, affectedLayers);
      if (sx.local === 0) markAffected(`${chunkKey(sx.chunk - 1, sz.chunk)}:${section}`, affectedLayers);
      if (sx.local === CHUNK_SIZE - 1) markAffected(`${chunkKey(sx.chunk + 1, sz.chunk)}:${section}`, affectedLayers);
      if (sz.local === 0) markAffected(`${chunkKey(sx.chunk, sz.chunk - 1)}:${section}`, affectedLayers);
      if (sz.local === CHUNK_SIZE - 1) markAffected(`${chunkKey(sx.chunk, sz.chunk + 1)}:${section}`, affectedLayers);
    }
    if (mutated) this.mutationRevision += 1;
    if (lightChanges.length > 0) {
      if (deferLighting) this.deferLightRebuildAround(lightChanges);
      else this.lightEngine.rebuildAround(lightChanges);
    }
    for (const change of affectedLavaCells.values()) this.refreshLavaLightCell(change.x, change.y, change.z);
    for (const entry of affected) {
      const separator = entry.lastIndexOf(":");
      const key = entry.slice(0, separator);
      const section = Number(entry.slice(separator + 1));
      if (section < 0 || section >= SECTION_COUNT) continue;
      const chunk = this.chunks.get(key);
      // Large animated removals need their old voxels gone before the proxy
      // begins moving, but synchronously rebuilding every exposed neighbor
      // recreates the tree-felling hitch. With deferred lighting, rebuild only
      // sections that actually contained an edit and leave seam/light work on
      // the urgent frame-budgeted queues.
      const rebuildNow = immediate && (!deferLighting || directlyAffected.has(entry));
      if (rebuildNow && chunk?.group.visible) {
        this.invalidateCombinedMeshesForImmediateEdit(chunk, affectedLayersByEntry.get(entry) ?? WORLD_RENDER_LAYERS);
        this.cancelQueuedMesh(key, section);
        this.rebuildSection(chunk, section);
      }
      else this.queueMesh(key, section, true);
    }
    if (immediate && !deferLighting) this.flushLightSections();
    if (immediate) this.markPlayerEditLocalMeshVisible();
  }

  refreshEditedBlock(
    cx: number,
    cz: number,
    localX: number,
    y: number,
    localZ: number,
    immediate: boolean,
    affectedLayers: Iterable<WorldRenderLayer> = WORLD_RENDER_LAYERS,
  ) {
    const section = sectionForY(y);
    const targets: Array<[string, number]> = [[chunkKey(cx, cz), section]];
    if ((y - MIN_Y) % SECTION_HEIGHT === 0) targets.push([chunkKey(cx, cz), section - 1]);
    if ((y - MIN_Y) % SECTION_HEIGHT === SECTION_HEIGHT - 1) targets.push([chunkKey(cx, cz), section + 1]);
    if (localX === 0) targets.push([chunkKey(cx - 1, cz), section]);
    if (localX === CHUNK_SIZE - 1) targets.push([chunkKey(cx + 1, cz), section]);
    if (localZ === 0) targets.push([chunkKey(cx, cz - 1), section]);
    if (localZ === CHUNK_SIZE - 1) targets.push([chunkKey(cx, cz + 1), section]);
    for (const [key, targetSection] of targets) {
      if (targetSection < 0 || targetSection >= SECTION_COUNT) continue;
      const targetChunk = this.chunks.get(key);
      if (immediate && targetChunk?.group.visible) {
        this.invalidateCombinedMeshesForImmediateEdit(targetChunk, affectedLayers);
        this.cancelQueuedMesh(key, targetSection);
        this.rebuildSection(targetChunk, targetSection);
      }
      else this.queueMesh(key, targetSection, true);
    }
  }

  isWalkThrough(type: BlockId | undefined) {
    if (type === undefined) return false;
    return type === BlockId.Air
      || (isDoorBlock(type) && doorIsOpen(type))
      || [BlockId.FenceGateNorthSouthOpen, BlockId.FenceGateEastWestOpen].includes(type)
      || ["cross", "tall-flower", "aquatic", "torch", "bush", "fruit", "stool"].includes(BLOCKS[type]?.shape ?? "");
  }

  biomeAt(x: number, z: number) {
    const sx = splitCoordinate(x);
    const sz = splitCoordinate(z);
    const chunk = this.chunks.get(chunkKey(sx.chunk, sz.chunk));
    return chunk ? chunk.biomes[sx.local + sz.local * CHUNK_SIZE] as BiomeId : this.sampleColumn(x, z).biome;
  }

  surfaceAt(x: number, z: number) {
    const sx = splitCoordinate(x);
    const sz = splitCoordinate(z);
    const chunk = this.chunks.get(chunkKey(sx.chunk, sz.chunk));
    return chunk ? chunk.heightmap[sx.local + sz.local * CHUNK_SIZE] : this.sampleColumn(x, z).height;
  }

  lightSourcesNear(x: number, y: number, z: number, radius = 18) {
    const radiusSquared = radius * radius;
    const sources: Array<{ x: number; y: number; z: number; type: BlockId; distanceSquared: number }> = [];
    const minChunkX = Math.floor((x - radius) / CHUNK_SIZE);
    const maxChunkX = Math.floor((x + radius) / CHUNK_SIZE);
    const minChunkZ = Math.floor((z - radius) / CHUNK_SIZE);
    const maxChunkZ = Math.floor((z + radius) / CHUNK_SIZE);
    for (let cx = minChunkX; cx <= maxChunkX; cx += 1) {
      for (let cz = minChunkZ; cz <= maxChunkZ; cz += 1) {
        const chunk = this.chunks.get(chunkKey(cx, cz));
        if (!chunk || chunk.lightIndices.size === 0) continue;
        for (const index of chunk.lightIndices) {
          const layer = Math.floor(index / (CHUNK_SIZE * CHUNK_SIZE));
          const horizontal = index % (CHUNK_SIZE * CHUNK_SIZE);
          const localZ = Math.floor(horizontal / CHUNK_SIZE);
          const localX = horizontal % CHUNK_SIZE;
          const worldX = cx * CHUNK_SIZE + localX;
          const worldY = MIN_Y + layer;
          const worldZ = cz * CHUNK_SIZE + localZ;
          const distanceSquared = (worldX - x) ** 2 + (worldY - y) ** 2 + (worldZ - z) ** 2;
          if (distanceSquared <= radiusSquared) sources.push({ x: worldX, y: worldY, z: worldZ, type: chunk.blocks[index] as BlockId, distanceSquared });
        }
      }
    }
    return sources.sort((a, b) => a.distanceSquared - b.distanceSquared);
  }

  leafBlocksNear(x: number, y: number, z: number, radius = 32) {
    const boundedRadius = Math.max(4, Math.min(40, radius));
    const radiusSquared = boundedRadius * boundedRadius;
    const leaves: Array<{ x: number; y: number; z: number; type: BlockId }> = [];
    const minChunkX = Math.floor((x - boundedRadius) / CHUNK_SIZE);
    const maxChunkX = Math.floor((x + boundedRadius) / CHUNK_SIZE);
    const minChunkZ = Math.floor((z - boundedRadius) / CHUNK_SIZE);
    const maxChunkZ = Math.floor((z + boundedRadius) / CHUNK_SIZE);
    for (let cx = minChunkX; cx <= maxChunkX; cx += 1) for (let cz = minChunkZ; cz <= maxChunkZ; cz += 1) {
      const chunk = this.chunks.get(chunkKey(cx, cz));
      if (!chunk?.group.visible || chunk.leafIndices.size === 0) continue;
      for (const index of chunk.leafIndices) {
        const layer = Math.floor(index / (CHUNK_SIZE * CHUNK_SIZE));
        const horizontal = index % (CHUNK_SIZE * CHUNK_SIZE);
        const localZ = Math.floor(horizontal / CHUNK_SIZE);
        const localX = horizontal % CHUNK_SIZE;
        const worldX = cx * CHUNK_SIZE + localX;
        const worldY = MIN_Y + layer;
        const worldZ = cz * CHUNK_SIZE + localZ;
        if ((worldX - x) ** 2 + (worldY - y) ** 2 + (worldZ - z) ** 2 > radiusSquared) continue;
        leaves.push({ x: worldX, y: worldY, z: worldZ, type: chunk.blocks[index] as BlockId });
      }
    }
    return leaves;
  }

  skyVisibilityAt(x: number, y: number, z: number) {
    const sampleY = Math.floor(y);
    const sampleX = Math.floor(x + 0.5);
    const sampleZ = Math.floor(z + 0.5);
    let sky = 0;
    let samples = 0;
    for (const [dx, dz, weight] of [[0, 0, 2], [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1]] as const) {
      const packed = this.lightEngine.getPacked(sampleX + dx, sampleY, sampleZ + dz);
      sky += lightChannel(packed, LightChannel.Sky) * weight;
      samples += weight;
    }
    return samples > 0 ? clamp(sky / (samples * MAX_LIGHT_LEVEL), 0, 1) : 0;
  }

  /** Continuous cave presentation input: roofs matter, but depth prevents an ordinary house from becoming a cave. */
  subterraneanBlendAt(x: number, y: number, z: number) {
    const visibility = this.skyVisibilityAt(x, y, z);
    const depth = this.surfaceAt(Math.floor(x), Math.floor(z)) - y;
    const skyOcclusion = 1 - smoothstep(0.08, 0.68, visibility);
    const depthWeight = 0.16 + smoothstep(0.5, 8, depth) * 0.84;
    return clamp(skyOcclusion * depthWeight, 0, 1);
  }

  lightAt(x: number, y: number, z: number) {
    return this.lightEngine.getLevels(Math.floor(x), Math.floor(y), Math.floor(z));
  }

  /** Authoritative gameplay brightness. Block light remains effective at night and underground. */
  gameplayLightAt(x: number, y: number, z: number, daylight = 1) {
    const packed = this.lightEngine.getPacked(Math.floor(x), Math.floor(y), Math.floor(z));
    return Math.max(
      perceivedBlockLight(packed),
      lightChannel(packed, LightChannel.Sky) * clamp(daylight, 0, 1),
    );
  }

  lightingProbeAt(x: number, y: number, z: number) {
    const levels = this.lightAt(x, y, z);
    return {
      ...levels,
      skyVisibility: this.skyVisibilityAt(x, y, z),
      subterraneanBlend: this.subterraneanBlendAt(x, y, z),
      queuedSections: this.lightSectionQueued.size,
      derivedBytes: this.chunks.size * CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT * Uint16Array.BYTES_PER_ELEMENT,
    };
  }

  findWalkableY(x: number, z: number, aroundY = MAX_Y) {
    const top = clamp(Math.round(aroundY + 8), MIN_Y + 1, MAX_Y - 2);
    const bottom = clamp(Math.round(aroundY - 16), MIN_Y + 1, MAX_Y - 2);
    for (let y = top; y >= bottom; y -= 1) {
      const ground = this.getBlock(x, y, z);
      const feet = this.getBlock(x, y + 1, z);
      const head = this.getBlock(x, y + 2, z);
      if (ground !== undefined && BLOCKS[ground]?.solid && this.isWalkThrough(feet) && this.isWalkThrough(head)) return y;
    }
    return this.surfaceAt(x, z);
  }

  faceVisible(type: BlockId, neighbor: BlockId) {
    return voxelInterfaceFaceOwner(type, neighbor) === "current";
  }

  setStreamingViewHint(forwardX: number, forwardZ: number) {
    const length = Math.hypot(forwardX, forwardZ);
    if (length <= 1e-6) return;
    this.streamingViewX = forwardX / length;
    this.streamingViewZ = forwardZ / length;
    this.streamingViewSector = Math.round(Math.atan2(this.streamingViewZ, this.streamingViewX) / (Math.PI / 4));
  }

  setPresentationPressure(drawCalls: number, frameMilliseconds: number) {
    this.renderDrawCallPressure = Math.max(0, Math.round(Number(drawCalls) || 0));
    this.renderFramePressureMilliseconds = Math.max(0, Number(frameMilliseconds) || 0);
  }

  rebuildSection(chunk: Chunk, section: number, slice?: Readonly<{
    buckets: Record<WorldRenderLayer, GeometryBucket>;
    startLocalX: number;
    endLocalX: number;
    finalize: boolean;
  }>) {
    const old = chunk.sections.get(section);
    const oldLayers = old ? WORLD_RENDER_LAYERS.filter((layer) => Boolean(old[layer])) : [];
    if (!slice && old) {
      for (const mesh of Object.values(old)) if (mesh) { chunk.group.remove(mesh); this.disposeTerrainGeometry(mesh.geometry); }
    }
    if (chunk.sectionBlockCounts[section] === 0) {
      if (slice && old) for (const mesh of Object.values(old)) if (mesh) { chunk.group.remove(mesh); this.disposeTerrainGeometry(mesh.geometry); }
      chunk.sections.set(section, {});
      chunk.dirty.delete(section);
      this.queueChunkConsolidation(chunk, oldLayers);
      return;
    }
    const buckets: Record<WorldRenderLayer, GeometryBucket> = slice?.buckets
      ?? { opaque: emptyBucket(), cutout: emptyBucket(), emissive: emptyBucket(), translucentSolid: emptyBucket(), water: emptyBucket(), transparent: emptyBucket(), glass: emptyBucket() };
    const startY = MIN_Y + section * SECTION_HEIGHT;
    const endY = Math.min(MAX_Y, startY + SECTION_HEIGHT - 1);
    const west = this.chunks.get(chunkKey(chunk.cx - 1, chunk.cz));
    const east = this.chunks.get(chunkKey(chunk.cx + 1, chunk.cz));
    const north = this.chunks.get(chunkKey(chunk.cx, chunk.cz - 1));
    const south = this.chunks.get(chunkKey(chunk.cx, chunk.cz + 1));
    const neighborAt = (localX: number, y: number, localZ: number) => {
      if (y > MAX_Y) return BlockId.Air;
      if (y < MIN_Y) return BlockId.Bedrock;
      if (localX >= 0 && localX < CHUNK_SIZE && localZ >= 0 && localZ < CHUNK_SIZE) return chunk.blocks[blockIndex(localX, y, localZ)] as BlockId;
      if (localX < 0) return west ? west.blocks[blockIndex(CHUNK_SIZE - 1, y, localZ)] as BlockId : BlockId.Air;
      if (localX >= CHUNK_SIZE) return east ? east.blocks[blockIndex(0, y, localZ)] as BlockId : BlockId.Air;
      if (localZ < 0) return north ? north.blocks[blockIndex(localX, y, CHUNK_SIZE - 1)] as BlockId : BlockId.Air;
      return south ? south.blocks[blockIndex(localX, y, 0)] as BlockId : BlockId.Air;
    };
    const liquidSurfaceInsetAt = (localX: number, y: number, localZ: number, type: BlockId) => {
      const cell = this.liquidCellProvider?.(
        chunk.cx * CHUNK_SIZE + localX,
        y,
        chunk.cz * CHUNK_SIZE + localZ,
      );
      return liquidSurfaceInsetForCell(type, neighborAt(localX, y + 1, localZ), cell?.level, cell?.falling);
    };
    const occlusionCacheWidth = CHUNK_SIZE + 2;
    const occlusionCache = new Uint8Array(occlusionCacheWidth * occlusionCacheWidth * (SECTION_HEIGHT + 2));
    const lightOccludesAt = (localX: number, y: number, localZ: number) => {
      const cacheX = localX + 1;
      const cacheY = y - startY + 1;
      const cacheZ = localZ + 1;
      if (cacheX < 0 || cacheX >= occlusionCacheWidth || cacheY < 0 || cacheY >= SECTION_HEIGHT + 2 || cacheZ < 0 || cacheZ >= occlusionCacheWidth) {
        return (BLOCKS[neighborAt(localX, y, localZ)]?.lightDampening ?? 0) >= MAX_LIGHT_LEVEL;
      }
      const index = cacheX + occlusionCacheWidth * (cacheZ + occlusionCacheWidth * cacheY);
      const cached = occlusionCache[index];
      if (cached !== 0) return cached === 2;
      const occludes = (BLOCKS[neighborAt(localX, y, localZ)]?.lightDampening ?? 0) >= MAX_LIGHT_LEVEL;
      occlusionCache[index] = occludes ? 2 : 1;
      return occludes;
    };
    const vertexBiomeTintCache = new Map<string, [number, number, number]>();
    const biomeTintForColumn = (worldX: number, worldZ: number) => {
      const sx = splitCoordinate(worldX);
      const sz = splitCoordinate(worldZ);
      const owner = this.chunks.get(chunkKey(sx.chunk, sz.chunk));
      const biome = owner
        ? owner.biomes[sx.local + sz.local * CHUNK_SIZE] as BiomeId
        : this.sampleColumn(worldX, worldZ).biome;
      return BIOME_TINT[biome] ?? [1, 1, 1] as [number, number, number];
    };
    /**
     * Terrain tint belongs to a world-space vertex, not to whichever chunk
     * happened to author the face. Averaging the columns that touch a vertex
     * gives both sides of a chunk boundary byte-identical colors while still
     * allowing biome palettes to transition over the width of a block.
     */
    const biomeTintForVertex = (localX: number, localZ: number) => {
      const key = `${localX},${localZ}`;
      const cached = vertexBiomeTintCache.get(key);
      if (cached) return cached;
      const worldX = chunk.cx * CHUNK_SIZE + localX;
      const worldZ = chunk.cz * CHUNK_SIZE + localZ;
      const x0 = Math.floor(worldX);
      const x1 = Math.ceil(worldX);
      const z0 = Math.floor(worldZ);
      const z1 = Math.ceil(worldZ);
      const samples = new Map<string, [number, number, number]>();
      for (const sampleX of [x0, x1]) for (const sampleZ of [z0, z1]) {
        samples.set(`${sampleX},${sampleZ}`, biomeTintForColumn(sampleX, sampleZ));
      }
      const result: [number, number, number] = [0, 0, 0];
      for (const sample of samples.values()) {
        result[0] += sample[0];
        result[1] += sample[1];
        result[2] += sample[2];
      }
      result[0] /= samples.size;
      result[1] /= samples.size;
      result[2] /= samples.size;
      vertexBiomeTintCache.set(key, result);
      return result;
    };
    const surfaceOcclusionAt = (localX: number, localY: number, localZ: number, normalX: number, normalY: number, normalZ: number) => {
      const axis = Math.abs(normalX) >= Math.abs(normalY) && Math.abs(normalX) >= Math.abs(normalZ) ? 0
        : Math.abs(normalY) >= Math.abs(normalZ) ? 1 : 2;
      const insideX = Math.round(localX - normalX * 0.51);
      const insideY = Math.round(localY - normalY * 0.51);
      const insideZ = Math.round(localZ - normalZ * 0.51);
      const outwardX = insideX + (axis === 0 ? Math.sign(normalX || 1) : 0);
      const outwardY = insideY + (axis === 1 ? Math.sign(normalY || 1) : 0);
      const outwardZ = insideZ + (axis === 2 ? Math.sign(normalZ || 1) : 0);
      const coordinateA = axis === 0 ? localY : localX;
      const coordinateB = axis === 2 ? localY : localZ;
      const centerA = axis === 0 ? insideY : insideX;
      const centerB = axis === 2 ? insideY : insideZ;
      const signA = coordinateA >= centerA ? 1 : -1;
      const signB = coordinateB >= centerB ? 1 : -1;
      const ax = axis === 0 ? 0 : signA; const ay = axis === 0 ? signA : 0;
      const by = axis === 2 ? signB : 0; const bz = axis === 2 ? 0 : signB;
      const sideA = lightOccludesAt(outwardX + ax, outwardY + ay, outwardZ);
      const sideB = lightOccludesAt(outwardX, outwardY + by, outwardZ + bz);
      const corner = lightOccludesAt(outwardX + ax, outwardY + ay + by, outwardZ + bz);
      return 1 - (sideA ? 0.15 : 0) - (sideB ? 0.15 : 0) - (corner && !(sideA && sideB) ? 0.12 : 0);
    };
    // Shape builders historically accepted a baked environment multiplier.
    // Real illumination now arrives through the packed voxelLight attribute,
    // so this compatibility value is deliberately constant and allocation-free.
    const shadeAt = (localX: number, y: number, localZ: number) => {
      void localX;
      void y;
      void localZ;
      return 1;
    };
    let activeEmissiveStrength = 0;
    let activeAmbientOcclusion = false;
    let activeCellTint: [number, number, number] = [1, 1, 1];
    const addQuad = (
      bucket: GeometryBucket,
      corners: ReadonlyArray<readonly [number, number, number]>,
      normal: [number, number, number],
      tile: number,
      shade: number,
      tint: [number, number, number],
      offsetX = 0,
      offsetY = 0,
      offsetZ = 0,
      topOffset = 0,
      _environment = 1,
    ) => {
      void _environment;
      const base = bucket.positions.length / 3;
      for (const corner of corners) {
        const localX = corner[0] + offsetX;
        const localY = corner[1] + offsetY + (corner[1] > 0 ? topOffset : 0);
        const localZ = corner[2] + offsetZ;
        bucket.positions.push(localX, localY, localZ);
        bucket.normals.push(normal[0], normal[1], normal[2]);
        const vertexTint = tint === activeCellTint ? biomeTintForVertex(localX, localZ) : tint;
        bucket.colors.push(shade * vertexTint[0], shade * vertexTint[1], shade * vertexTint[2]);
        const light = this.surfaceLightAt(
          chunk.cx * CHUNK_SIZE + localX,
          localY,
          chunk.cz * CHUNK_SIZE + localZ,
          normal[0], normal[1], normal[2],
        );
        bucket.lights.push(light[0], light[1], light[2], light[3]);
        bucket.emissions.push(activeEmissiveStrength);
        bucket.occlusions.push(activeAmbientOcclusion
          ? surfaceOcclusionAt(localX, localY, localZ, normal[0], normal[1], normal[2])
          : 1);
      }
      const [u0, v0, u1, v1] = TILE_UVS[tile];
      bucket.uvs.push(u0, v0, u0, v1, u1, v1, u1, v0);
      bucket.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };

    const addTexturedCuboid = (
      bucket: GeometryBucket,
      x0: number,
      y0: number,
      z0: number,
      x1: number,
      y1: number,
      z1: number,
      sideTile: number,
      topTile = sideTile,
      bottomTile = sideTile,
      tint: [number, number, number] = [1, 1, 1],
      environment = 1,
    ) => {
      addQuad(bucket, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], sideTile, 0.82, tint, 0, 0, 0, 0, environment);
      addQuad(bucket, [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], [-1, 0, 0], sideTile, 0.72, tint, 0, 0, 0, 0, environment);
      addQuad(bucket, [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], [0, 1, 0], topTile, 1, tint, 0, 0, 0, 0, environment);
      addQuad(bucket, [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]], [0, -1, 0], bottomTile, 0.55, tint, 0, 0, 0, 0, environment);
      addQuad(bucket, [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]], [0, 0, 1], sideTile, 0.9, tint, 0, 0, 0, 0, environment);
      addQuad(bucket, [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], [0, 0, -1], sideTile, 0.76, tint, 0, 0, 0, 0, environment);
    };

    const addFacingCuboid = (
      bucket: GeometryBucket,
      centerX: number,
      centerZ: number,
      facing: BlockFacing,
      x0: number,
      y0: number,
      z0: number,
      x1: number,
      y1: number,
      z1: number,
      sideTile: number,
      topTile = sideTile,
      bottomTile = sideTile,
      cuboidTint: [number, number, number] = [1, 1, 1],
      environment = 1,
    ) => {
      const corner0 = rotateBlockOffset(x0 - centerX, z0 - centerZ, facing);
      const corner1 = rotateBlockOffset(x1 - centerX, z1 - centerZ, facing);
      addTexturedCuboid(
        bucket,
        centerX + Math.min(corner0.x, corner1.x),
        y0,
        centerZ + Math.min(corner0.z, corner1.z),
        centerX + Math.max(corner0.x, corner1.x),
        y1,
        centerZ + Math.max(corner0.z, corner1.z),
        sideTile,
        topTile,
        bottomTile,
        cuboidTint,
        environment,
      );
    };

    const addImplicitWaterCell = (localX: number, y: number, localZ: number, tint: [number, number, number]) => {
      const surfaceInset = liquidSurfaceInsetForCell(
        neighborAt(localX, y, localZ),
        neighborAt(localX, y + 1, localZ),
      );
      for (const face of FACES) {
        const [dx, dy, dz] = face.direction;
        const neighbor = neighborAt(localX + dx, y + dy, localZ + dz);
        // Match an ordinary water cell: do not draw a hidden water skin flush
        // against opaque ground or walls. Those coplanar boundaries produced
        // the pale rectangular patch beside waterlogged flora.
        if (!this.faceVisible(BlockId.Water, neighbor)) continue;
        addQuad(buckets.water, face.corners, face.direction, BLOCKS[BlockId.Water].side, face.shade, tint,
          localX, y, localZ, surfaceInset, shadeAt(localX + dx, y + dy, localZ + dz));
      }
    };

    for (let lx = slice?.startLocalX ?? 0; lx < (slice?.endLocalX ?? CHUNK_SIZE); lx += 1) for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
      const tint = BIOME_TINT[chunk.biomes[lx + lz * CHUNK_SIZE]] ?? [1, 1, 1];
      for (let y = startY; y <= endY; y += 1) {
        const type = chunk.blocks[blockIndex(lx, y, lz)] as BlockId;
        if (type === BlockId.Air) continue;
        if (type === BlockId.Chest && this.hiddenChestVisuals.has(`${chunk.cx * CHUNK_SIZE + lx},${y},${chunk.cz * CHUNK_SIZE + lz}`)) continue;
        const definition = BLOCKS[type];
        if (!definition || definition.layer === "none") continue;
        const worldX = chunk.cx * CHUNK_SIZE + lx;
        const worldZ = chunk.cz * CHUNK_SIZE + lz;
        const facing = isDirectionallyPlacedBlock(type) ? this.blockFacingAt(worldX, y, worldZ) : BLOCK_FACING_NORTH;
        activeCellTint = tint;
        activeEmissiveStrength = definition.emissiveStrength ?? 0;
        activeAmbientOcclusion = definition.solid
          && (!definition.shape || definition.shape === "cube")
          && definition.layer !== "transparent"
          && definition.layer !== "cutout";
        if (definition.waterlogged) addImplicitWaterCell(lx, y, lz, tint);
        const bucket = buckets[definition.liquid === "water" ? "water" : type === BlockId.Glass ? "glass" : definition.layer as Exclude<RenderLayer, "none">];
        if (definition.shape === "torch") {
          const tile = definition.side;
          const environment = Math.max(0.82, shadeAt(lx, y, lz));
          const outward = type === BlockId.TorchWallNorth ? [0, 0, -1]
            : type === BlockId.TorchWallSouth ? [0, 0, 1]
              : type === BlockId.TorchWallEast ? [1, 0, 0]
                : type === BlockId.TorchWallWest ? [-1, 0, 0]
                  : null;
          const base = outward
            ? [lx - outward[0] * 0.47, y - 0.18, lz - outward[2] * 0.47]
            : [lx, y - 0.49, lz];
          const tip = outward
            ? [base[0] + outward[0] * 0.34, y + 0.48, base[2] + outward[2] * 0.34]
            : [lx, y + 0.41, lz];
          const axis = new THREE.Vector3(tip[0] - base[0], tip[1] - base[1], tip[2] - base[2]).normalize();
          const widthA = outward
            ? new THREE.Vector3(-outward[2], 0, outward[0]).normalize()
            : new THREE.Vector3(1, 0, 0);
          const widthB = new THREE.Vector3().crossVectors(axis, widthA).normalize();
          const addTorchSprite = (width: THREE.Vector3, shade: number) => {
            const half = width.clone().multiplyScalar(0.22);
            const corners = [
              [base[0] - half.x, base[1] - half.y, base[2] - half.z],
              [tip[0] - half.x, tip[1] - half.y, tip[2] - half.z],
              [tip[0] + half.x, tip[1] + half.y, tip[2] + half.z],
              [base[0] + half.x, base[1] + half.y, base[2] + half.z],
            ] as [number, number, number][];
            const normal = new THREE.Vector3().crossVectors(width, axis).normalize();
            addQuad(bucket, corners, [normal.x, normal.y, normal.z], tile, shade, [1, 1, 1], 0, 0, 0, 0, environment);
          };
          addTorchSprite(widthA, 1);
          addTorchSprite(widthB, 0.91);
          continue;
        }
        if (definition.shape === "mooncap") {
          const environment = shadeAt(lx, y, lz);
          // Gameplay collision remains one solid block. Only the rendered
          // underside pulls inward into a stout stem beneath the full crown.
          addTexturedCuboid(bucket, lx - 0.22, y - 0.5, lz - 0.22, lx + 0.22, y + 0.18, lz + 0.22,
            definition.bottom, definition.bottom, definition.bottom, tint, environment);
          addTexturedCuboid(bucket, lx - 0.5, y + 0.12, lz - 0.5, lx + 0.5, y + 0.5, lz + 0.5,
            definition.side, definition.top, definition.bottom, tint, environment);
          continue;
        }
        if (definition.shape === "bush" || definition.shape === "fruit") {
          const tile = definition.side;
          const environment = shadeAt(lx, y, lz);
          const halfWidth = definition.shape === "fruit" ? 0.24 : 0.48;
          const y0 = definition.shape === "fruit" ? y - 0.17 : y - 0.5;
          const y1 = definition.shape === "fruit" ? y + 0.44 : y + 0.48;
          addQuad(bucket, [[lx - halfWidth, y0, lz - halfWidth], [lx - halfWidth, y1, lz - halfWidth], [lx + halfWidth, y1, lz + halfWidth], [lx + halfWidth, y0, lz + halfWidth]], [0.7, 0, -0.7], tile, 1, tint, 0, 0, 0, 0, environment);
          addQuad(bucket, [[lx + halfWidth, y0, lz - halfWidth], [lx + halfWidth, y1, lz - halfWidth], [lx - halfWidth, y1, lz + halfWidth], [lx - halfWidth, y0, lz + halfWidth]], [-0.7, 0, -0.7], tile, 0.92, tint, 0, 0, 0, 0, environment);
          if (definition.shape === "bush") {
            addQuad(bucket, [[lx, y0, lz - halfWidth], [lx, y1, lz - halfWidth], [lx, y1, lz + halfWidth], [lx, y0, lz + halfWidth]], [-1, 0, 0], tile, 0.96, tint, 0, 0, 0, 0, environment);
          }
          continue;
        }
        if (definition.shape === "cross" || definition.shape === "aquatic" || definition.shape === "tall-flower") {
          let tile = definition.side;
          const environment = definition.layer === "emissive" ? Math.max(0.82, shadeAt(lx, y, lz)) : shadeAt(lx, y, lz);
          const addFullCross = (half: number, y0: number, y1: number, shade = 1, offsetX = 0, offsetZ = 0, tileOverride = tile) => {
            const cx = lx + offsetX;
            const cz = lz + offsetZ;
            addQuad(bucket, [[cx - half, y0, cz - half], [cx - half, y1, cz - half], [cx + half, y1, cz + half], [cx + half, y0, cz + half]], [0.7, 0, -0.7], tileOverride, shade, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[cx + half, y0, cz - half], [cx + half, y1, cz - half], [cx - half, y1, cz + half], [cx - half, y0, cz + half]], [-0.7, 0, -0.7], tileOverride, shade * 0.92, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[cx - half, y0, cz], [cx - half, y1, cz], [cx + half, y1, cz], [cx + half, y0, cz]], [0, 0, -1], tileOverride, shade * 0.96, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[cx, y0, cz - half], [cx, y1, cz - half], [cx, y1, cz + half], [cx, y0, cz + half]], [-1, 0, 0], tileOverride, shade * 0.9, tint, 0, 0, 0, 0, environment);
          };
          if (definition.shape === "aquatic") {
            // A connection is species-specific. Adjacent kelp can overlap into
            // one stem, but a ribbon plant can no longer fuse into coral or a
            // cave reed merely because all three happen to be waterlogged.
            const connectedBelow = definition.verticalConnectGroup !== undefined
              && BLOCKS[neighborAt(lx, y - 1, lz)]?.verticalConnectGroup === definition.verticalConnectGroup;
            const connectedAbove = definition.verticalConnectGroup !== undefined
              && BLOCKS[neighborAt(lx, y + 1, lz)]?.verticalConnectGroup === definition.verticalConnectGroup;
            const profile = definition.aquaticProfile ?? "reed";
            const overlap = profile === "kelp" || profile === "ribbon" || profile === "vine" || profile === "sail" ? 0.64
              : profile === "wrack" ? .61 : profile === "reed" || profile === "grass" ? 0.59 : 0.56;
            const y0 = y - (connectedBelow ? overlap : 0.5);
            const y1 = y + (connectedAbove ? overlap : 0.5);
            const worldX = chunk.cx * CHUNK_SIZE + lx;
            const worldZ = chunk.cz * CHUNK_SIZE + lz;
            const lean = (hash2(worldX, worldZ, this.seed ^ (type * 7919)) - 0.5) * 0.15;
            if (profile === "ribbon") {
              addFullCross(0.38, y0, y1, 0.96, lean, -lean * 0.45, RIVER_RIBBON_TILE);
              addFullCross(0.2, y0, y1, 0.82, -lean * 0.55, lean * 0.8, RIVER_RIBBON_TILE);
            } else if (profile === "kelp") {
              addFullCross(0.46, y0, y1, 1, lean * 0.35, lean);
              addFullCross(0.25, y0 + 0.12, y1, 0.86, -lean, lean * 0.25);
            } else if (profile === "coral") {
              addFullCross(0.44, y0, y1 - 0.08, 1);
              addFullCross(0.26, y0 + 0.1, y1, 0.9, lean, -lean);
            } else if (profile === "bloom") {
              addFullCross(0.37, y0, y1 - 0.12, 0.94, lean * 0.4, 0);
              addFullCross(0.48, Math.max(y0, y1 - 0.46), y1, 1.04, -lean * 0.25, lean * 0.25);
            } else if (profile === "reed-bloom") {
              addFullCross(0.2, y0, y1, 0.94, lean * .22, 0, REED_BLOOM_STEM_TILE);
              addFullCross(0.16, y0, y1, 0.84, -lean * .2, lean * .25, REED_BLOOM_STEM_TILE);
              if (!connectedAbove) {
                addFullCross(0.48, Math.max(y0, y1 - .78), y1, 1.04, lean * .15, -lean * .12, REED_BLOOM_CROWN_TILE);
              }
            } else if (profile === "vine") {
              addFullCross(0.32, y0, y1, 0.95, lean, lean * 0.4);
              addFullCross(0.16, y0 + 0.04, y1 - 0.03, 0.8, -lean * 0.7, -lean);
            } else if (profile === "algae") {
              addFullCross(0.45, y0, y1 - 0.14, 0.9);
              addFullCross(0.29, y0 + 0.18, y1, 1.02, lean, -lean);
            } else if (profile === "grass") {
              const grassTop = connectedAbove ? y1 : y + .34;
              addFullCross(.13, y0, grassTop, .94, -.21 + lean * .35, -.12);
              addFullCross(.16, y0 + .02, grassTop - .06, 1, .08, .17 + lean * .2);
              addFullCross(.11, y0 + .04, grassTop - .14, .84, .24 - lean * .3, -.18);
            } else if (profile === "sail") {
              addFullCross(.47, y0, y1, 1, lean * .25, lean * .5);
              addFullCross(.24, y0 + .08, y1 - .04, .84, -lean * .65, -.12);
              addFullCross(.12, y0, y1, .76, .16, .18);
            } else if (profile === "wrack") {
              addFullCross(.18, y0, y1, .88, lean * .15, 0);
              addFullCross(.4, y0 + .08, y1 - .1, 1, lean, -.08);
              addFullCross(.27, y0 + .2, y1, .9, -.16, lean * .7);
            } else if (profile === "fan") {
              addFullCross(.13, y0, y + .03, .82);
              addFullCross(.49, y - .08, y1, 1, lean * .35, 0);
              addFullCross(.31, y + .02, y1 - .03, .9, -.09, lean * .25);
            } else {
              addFullCross(0.28, y0, y1, 0.96, lean * 0.3, 0);
              addFullCross(0.14, y0 + 0.06, y1 - 0.03, 0.84, -lean * 0.5, lean);
            }
          } else if (definition.shape === "tall-flower") {
            addFullCross(0.41, y - 0.5, y + 0.12, 0.94);
            addFullCross(0.48, y - 0.08, y + 0.58);
          } else {
            const connectedBelow = definition.verticalConnectGroup !== undefined
              && BLOCKS[neighborAt(lx, y - 1, lz)]?.verticalConnectGroup === definition.verticalConnectGroup;
            const connectedAbove = definition.verticalConnectGroup !== undefined
              && BLOCKS[neighborAt(lx, y + 1, lz)]?.verticalConnectGroup === definition.verticalConnectGroup;
            if (type === BlockId.PeppermintTuft && connectedAbove) tile = WILD_PEPPERMINT_STEM_TILE;
            addFullCross(0.44, y - (connectedBelow ? 0.54 : 0.5), y + (connectedAbove ? 0.54 : 0.5));
          }
          continue;
        }
        if (definition.shape === "aquarium") {
          const environment = shadeAt(lx, y, lz);
          const same = (dx: number, dy: number, dz: number) => neighborAt(lx + dx, y + dy, lz + dz) === BlockId.GlassAquarium;
          // One glass skin around the connected component: internal faces are
          // absent, eliminating the coplanar tearing of stacked tank blocks.
          for (const face of FACES) {
            const [dx, dy, dz] = face.direction;
            if (same(dx, dy, dz)) continue;
            addQuad(buckets.transparent, face.corners, face.direction, 13, face.shade, [0.86, 1, 1], lx, y, lz, 0, environment);
          }
          const waterX0 = same(-1, 0, 0) ? lx - 0.5 : lx - 0.43;
          const waterX1 = same(1, 0, 0) ? lx + 0.5 : lx + 0.43;
          const waterY0 = same(0, -1, 0) ? y - 0.5 : y - 0.38;
          const waterY1 = same(0, 1, 0) ? y + 0.5 : y + 0.43;
          const waterZ0 = same(0, 0, -1) ? lz - 0.5 : lz - 0.43;
          const waterZ1 = same(0, 0, 1) ? lz + 0.5 : lz + 0.43;
          addTexturedCuboid(buckets.transparent, waterX0, waterY0, waterZ0, waterX1, waterY1, waterZ1, 8, 8, 8, [0.72, 0.9, 1], 1);
          if (!same(0, -1, 0)) {
            addTexturedCuboid(buckets.opaque, lx - 0.44, y - 0.43, lz - 0.44, lx + 0.44, y - 0.35, lz + 0.44, 47, 47, 47, [0.95, 0.92, 0.84], environment);
            const decorationRoll = hash2(chunk.cx * CHUNK_SIZE + lx, chunk.cz * CHUNK_SIZE + lz, this.seed ^ 0x6ea125cf);
            if (decorationRoll > 0.66) {
              addTexturedCuboid(buckets.opaque, lx - 0.22, y - 0.35, lz + 0.1, lx - 0.05, y - 0.22, lz + 0.27, 35, 35, 35, tint, environment);
              addTexturedCuboid(buckets.opaque, lx + 0.12, y - 0.35, lz - 0.22, lx + 0.29, y - 0.25, lz - 0.05, 97, 97, 97, tint, environment);
            }
          }
          continue;
        }
        if (definition.shape === "fireplace") {
          const environment = shadeAt(lx, y, lz);
          // The asymmetric firebox masonry follows placement facing, while the flame
          // remains in the stateful display layer so it keeps its living flicker.
          addFacingCuboid(buckets.opaque, lx, lz, facing, lx - 0.48, y - 0.5, lz - 0.38, lx + 0.48, y - 0.34, lz + 0.38, 12, 12, 3, tint, environment);
          addFacingCuboid(buckets.opaque, lx, lz, facing, lx - 0.48, y - 0.34, lz - 0.34, lx - 0.31, y + 0.34, lz + 0.34, 12, 12, 12, tint, environment);
          addFacingCuboid(buckets.opaque, lx, lz, facing, lx + 0.31, y - 0.34, lz - 0.34, lx + 0.48, y + 0.34, lz + 0.34, 12, 12, 12, tint, environment);
          addFacingCuboid(buckets.opaque, lx, lz, facing, lx - 0.5, y + 0.31, lz - 0.4, lx + 0.5, y + 0.48, lz + 0.4, 12, 12, 12, tint, environment);
          addFacingCuboid(buckets.opaque, lx, lz, facing, lx - 0.3, y - 0.31, lz + 0.245, lx + 0.3, y + 0.3, lz + 0.35, 49, 49, 49, [0.48, 0.43, 0.4], environment);
          for (const barX of [-0.25, -0.08, 0.09, 0.26]) addFacingCuboid(buckets.opaque, lx, lz, facing, lx + barX - 0.025, y - 0.3, lz - 0.23, lx + barX + 0.025, y - 0.17, lz + 0.24, 97, 97, 97, [0.52, 0.49, 0.45], environment);
          for (const [offset, lift] of [[-0.1, 0], [0.1, 0.025]] as const) addFacingCuboid(buckets.opaque, lx, lz, facing, lx - 0.27, y - 0.25 + lift, lz + offset - 0.05, lx + 0.27, y - 0.15 + lift, lz + offset + 0.05, 11, 11, 11, [0.5, 0.32, 0.22], environment);
          continue;
        }
        if (definition.shape === "apiary") {
          const environment = shadeAt(lx, y, lz);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.4, y - 0.46, lz - 0.36, lx + 0.4, y + 0.18, lz + 0.36, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.46, y + 0.18, lz - 0.42, lx + 0.46, y + 0.36, lz + 0.42, definition.top, definition.top, definition.side, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.13, y - 0.06, lz - 0.405, lx + 0.13, y + 0.13, lz - 0.355, 92, 92, 92, [1, 1, 1], environment);
          continue;
        }
        if (definition.shape === "wild-hive") {
          const environment = shadeAt(lx, y, lz);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.35, y - 0.46, lz - 0.35, lx + 0.35, y - 0.17, lz + 0.35, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.45, y - 0.17, lz - 0.42, lx + 0.45, y + 0.16, lz + 0.42, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.33, y + 0.16, lz - 0.32, lx + 0.33, y + 0.42, lz + 0.32, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.11, y - 0.03, lz - 0.455, lx + 0.11, y + 0.13, lz - 0.405, 94, 94, 94, [0.55, 0.48, 0.4], environment);
          continue;
        }
        if (definition.shape === "orb-rack") {
          const environment = shadeAt(lx, y, lz);
          const right = blockFacingRight(facing);
          const sameRack = (dx: number, dy: number, dz: number) => neighborAt(lx + dx, y + dy, lz + dz) === BlockId.CaptureOrbRack
            && this.blockFacingAt(worldX + dx, y + dy, worldZ + dz) === facing;
          const joinsLeft = sameRack(-right.x, 0, -right.z);
          const joinsRight = sameRack(right.x, 0, right.z);
          const joinsBelow = sameRack(0, -1, 0);
          const joinsAbove = sameRack(0, 1, 0);
          const spanX0 = lx - (joinsLeft ? 0.5 : 0.43);
          const spanX1 = lx + (joinsRight ? 0.5 : 0.43);
          if (!joinsBelow) addFacingCuboid(bucket, lx, lz, facing, spanX0, y - 0.48, lz - 0.38, spanX1, y - 0.34, lz + 0.38, definition.side, definition.top, definition.bottom, tint, environment);
          const postBottom = joinsBelow ? y - 0.5 : y - 0.34;
          const postTop = joinsAbove ? y + 0.5 : y + 0.42;
          if (!joinsLeft) addFacingCuboid(bucket, lx, lz, facing, lx - 0.43, postBottom, lz - 0.11, lx - 0.34, postTop, lz + 0.11, definition.side, definition.top, definition.bottom, tint, environment);
          if (!joinsRight) addFacingCuboid(bucket, lx, lz, facing, lx + 0.34, postBottom, lz - 0.11, lx + 0.43, postTop, lz + 0.11, definition.side, definition.top, definition.bottom, tint, environment);
          for (const railY of [y - 0.17, y + 0.18]) addFacingCuboid(bucket, lx, lz, facing, spanX0, railY - 0.045, lz - 0.13, spanX1, railY + 0.045, lz + 0.13, definition.side, definition.top, definition.bottom, tint, environment);
          if (!joinsAbove) addFacingCuboid(bucket, lx, lz, facing, spanX0, y + 0.38, lz - 0.14, spanX1, y + 0.46, lz + 0.14, definition.side, definition.top, definition.bottom, tint, environment);
          // Empty cradles are part of the chunk mesh; Capture Orbs themselves
          // are stateful engine visuals and appear only for occupied slots.
          for (const socketY of [y - 0.1, y + 0.25]) for (const socketX of [lx - 0.27, lx - 0.09, lx + 0.09, lx + 0.27]) {
            addFacingCuboid(bucket, lx, lz, facing, socketX - 0.065, socketY - 0.025, lz - 0.11, socketX + 0.065, socketY + 0.01, lz + 0.11, definition.side, definition.top, definition.bottom, tint, environment);
            addFacingCuboid(bucket, lx, lz, facing, socketX - 0.075, socketY, lz - 0.12, socketX - 0.045, socketY + 0.055, lz + 0.12, definition.side, definition.top, definition.bottom, tint, environment);
            addFacingCuboid(bucket, lx, lz, facing, socketX + 0.045, socketY, lz - 0.12, socketX + 0.075, socketY + 0.055, lz + 0.12, definition.side, definition.top, definition.bottom, tint, environment);
          }
          continue;
        }
        if (definition.shape === "orb-healer") {
          const environment = shadeAt(lx, y, lz);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.48, y - 0.48, lz - 0.48, lx + 0.48, y - 0.3, lz + 0.48, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.42, y - 0.3, lz - 0.42, lx + 0.42, y + 0.06, lz + 0.42, definition.side, definition.top, definition.bottom, tint, environment);
          // A low basin floor and four raised rim pieces make the top visibly
          // concave while leaving the four dynamic orb sockets unobstructed.
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.34, y + 0.06, lz - 0.32, lx + 0.34, y + 0.1, lz + 0.32, definition.side, definition.top, definition.bottom, [0.76, 0.9, 0.86], environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.46, y + 0.06, lz - 0.46, lx + 0.46, y + 0.2, lz - 0.34, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.46, y + 0.06, lz + 0.34, lx + 0.46, y + 0.2, lz + 0.46, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.46, y + 0.06, lz - 0.34, lx - 0.34, y + 0.2, lz + 0.34, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx + 0.34, y + 0.06, lz - 0.34, lx + 0.46, y + 0.2, lz + 0.34, definition.side, definition.top, definition.bottom, tint, environment);
          for (const [dx, dz] of [[-0.23, -0.22], [0.23, -0.22], [-0.23, 0.22], [0.23, 0.22]] as Array<[number, number]>) {
            addFacingCuboid(bucket, lx, lz, facing, lx + dx - 0.08, y + 0.085, lz + dz - 0.08, lx + dx + 0.08, y + 0.12, lz + dz + 0.08, definition.side, definition.top, definition.bottom, [0.58, 0.76, 0.71], environment);
          }
          // Static frame for the state-driven Cave Gel reservoir.
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.3, y - 0.27, lz - 0.485, lx + 0.3, y - 0.21, lz - 0.43, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.3, y - 0.05, lz - 0.485, lx + 0.3, y + 0.01, lz - 0.43, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.3, y - 0.21, lz - 0.485, lx - 0.25, y - 0.05, lz - 0.43, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx + 0.25, y - 0.21, lz - 0.485, lx + 0.3, y - 0.05, lz - 0.43, definition.side, definition.top, definition.bottom, tint, environment);
          continue;
        }
        if (definition.shape === "cartography") {
          const environment = shadeAt(lx, y, lz);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.5, y + 0.21, lz - 0.5, lx + 0.5, y + 0.45, lz + 0.5, definition.side, definition.top, definition.bottom, tint, environment);
          for (const [dx, dz] of [[-0.42, -0.42], [0.28, -0.42], [-0.42, 0.28], [0.28, 0.28]] as Array<[number, number]>) {
            addFacingCuboid(bucket, lx, lz, facing, lx + dx, y - 0.5, lz + dz, lx + dx + 0.14, y + 0.22, lz + dz + 0.14, definition.side, definition.top, definition.bottom, tint, environment);
          }
          continue;
        }
        if (definition.shape === "alchemy") {
          const environment = shadeAt(lx, y, lz);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.42, y - 0.5, lz - 0.42, lx + 0.42, y - 0.36, lz + 0.42, 98, 98, 3, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.09, y - 0.36, lz - 0.09, lx + 0.09, y + 0.33, lz + 0.09, 98, 98, 98, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.38, y + 0.18, lz - 0.08, lx + 0.38, y + 0.3, lz + 0.08, 98, 98, 98, tint, environment);
          for (const x of [lx - 0.29, lx, lx + 0.29]) {
            addFacingCuboid(buckets.emissive, lx, lz, facing, x - 0.09, y - 0.1, lz - 0.11, x + 0.09, y + 0.17, lz + 0.11, 98, 98, 98, [1, 1, 1], 1);
          }
          continue;
        }
        if (definition.shape === "sugarworks") {
          const environment = shadeAt(lx, y, lz);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.47, y - 0.5, lz - 0.43, lx + 0.47, y - 0.35, lz + 0.43, 143, 143, 135, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.4, y - 0.35, lz - 0.36, lx + 0.4, y + 0.18, lz + 0.36, 143, 143, 135, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.34, y + 0.18, lz - 0.31, lx + 0.34, y + 0.31, lz + 0.31, 143, 143, 143, [1, 1, 1], environment);
          for (const x of [lx - 0.24, lx + 0.13]) {
            addFacingCuboid(bucket, lx, lz, facing, x, y - 0.09, lz - 0.5, x + 0.11, y + 0.39, lz - 0.35, 143, 143, 143, [1, 1, 1], environment);
          }
          addFacingCuboid(buckets.transparent, lx, lz, facing, lx - 0.22, y + 0.29, lz - 0.22, lx + 0.22, y + 0.35, lz + 0.22, 136, 136, 136, [1, 1, 1], 1);
          addFacingCuboid(buckets.emissive, lx, lz, facing, lx + 0.24, y + 0.31, lz - 0.08, lx + 0.32, y + 0.48, lz + 0.08, 143, 143, 143, [1, 1, 1], 1);
          continue;
        }
        if (definition.shape === "morph-loom") {
          const environment = shadeAt(lx, y, lz);
          // Grounded three-layer machine language: load-bearing Deepgear base,
          // exposed brass mechanism, then a restrained star-crystal focus.
          addTexturedCuboid(buckets.opaque, lx - 0.47, y - 0.5, lz - 0.43, lx + 0.47, y - 0.33, lz + 0.43, DEEPGEAR_BRICK_TILE, DEEPGEAR_BRICK_TILE, DEEPGEAR_BRICK_TILE, [0.82, 0.8, 0.78], environment);
          addTexturedCuboid(buckets.opaque, lx - 0.37, y - 0.33, lz - 0.32, lx + 0.37, y - 0.21, lz + 0.32, 127, 127, 11, [0.84, 0.76, 0.64], environment);
          for (const x of [lx - 0.38, lx + 0.28]) {
            addTexturedCuboid(buckets.opaque, x, y - 0.27, lz - 0.14, x + 0.1, y + 0.35, lz + 0.14, RIVETED_BRASS_TILE, RIVETED_BRASS_TILE, DEEPGEAR_BRICK_TILE, [0.9, 0.82, 0.65], environment);
          }
          addTexturedCuboid(buckets.opaque, lx - 0.34, y + 0.27, lz - 0.12, lx + 0.34, y + 0.38, lz + 0.12, RIVETED_BRASS_TILE, RIVETED_BRASS_TILE, DEEPGEAR_BRICK_TILE, [0.92, 0.84, 0.66], environment);
          addTexturedCuboid(buckets.opaque, lx - 0.18, y - 0.19, lz - 0.18, lx + 0.18, y - 0.13, lz + 0.18, RIVETED_BRASS_TILE, RIVETED_BRASS_TILE, DEEPGEAR_BRICK_TILE, [0.88, 0.78, 0.58], environment);
          for (const x of [lx - 0.21, lx + 0.15]) addTexturedCuboid(buckets.opaque, x, y - 0.13, lz - 0.19, x + 0.06, y + 0.05, lz + 0.19, RIVETED_BRASS_TILE, RIVETED_BRASS_TILE, DEEPGEAR_BRICK_TILE, [0.88, 0.78, 0.58], environment);
          addTexturedCuboid(buckets.transparent, lx - 0.26, y - 0.08, lz - 0.23, lx + 0.26, y + 0.27, lz + 0.23, 13, 13, 13, [0.7, 0.92, 0.9], 1);
          addTexturedCuboid(buckets.emissive, lx - 0.055, y + 0.34, lz - 0.055, lx + 0.055, y + 0.48, lz + 0.055, 51, 51, 51, [0.7, 1, 0.98], 1);
          continue;
        }
        if (definition.shape === "gold-pile") {
          const environment = shadeAt(lx, y, lz);
          // Hoards are authored as loose stacks rather than three rectangular
          // ore slabs: long ingots establish the silhouette, thin coin towers
          // break its outline, and three jewel colors punctuate the gold.
          for (const [index, [x0, z0, x1, z1, level]] of [
            [-0.43, -0.34, -0.08, -0.12, 0], [-0.04, -0.38, 0.34, -0.16, 0], [0.12, 0.08, 0.43, 0.31, 0],
            [-0.35, 0.12, -0.02, 0.35, 0], [-0.16, -0.09, 0.2, 0.13, 1], [0.03, -0.27, 0.33, -0.07, 1],
          ].entries() as IterableIterator<[number, [number, number, number, number, number]]>) {
            const bottom = y - 0.5 + level * 0.105;
            addTexturedCuboid(bucket, lx + x0, bottom, lz + z0, lx + x1, bottom + 0.095, lz + z1, DRAGON_HOARD_GOLD_TILE, DRAGON_HOARD_GOLD_TILE, DRAGON_HOARD_GOLD_TILE, index % 2 ? [1, 0.92, 0.62] : [1, 1, 1], environment);
          }
          for (const [stack, [dx, dz, count]] of [[-0.29, -0.02, 3], [-0.1, 0.26, 5], [0.3, -0.04, 4], [0.23, 0.29, 2], [-0.38, -0.28, 2]].entries() as IterableIterator<[number, [number, number, number]]>) {
            for (let coin = 0; coin < count; coin += 1) {
              const offset = (coin + stack) % 2 ? 0.012 : -0.008;
              const bottom = y - 0.5 + coin * 0.045;
              addTexturedCuboid(bucket, lx + dx - 0.075 + offset, bottom, lz + dz - 0.075, lx + dx + 0.075 + offset, bottom + 0.04, lz + dz + 0.075, DRAGON_HOARD_COIN_TILE, DRAGON_HOARD_COIN_TILE, DRAGON_HOARD_GOLD_TILE, [1, 1, 1], environment);
            }
          }
          for (const [index, [dx, dy, dz, tint]] of [
            [-0.2, -0.22, -0.22, [1, 0.45, 0.56]], [0.07, -0.12, 0.03, [0.48, 1, 0.94]], [0.3, -0.28, 0.2, [0.72, 0.58, 1]],
          ].entries() as IterableIterator<[number, [number, number, number, [number, number, number]]]>) {
            addTexturedCuboid(buckets.emissive, lx + dx - 0.055, y + dy - 0.055, lz + dz - 0.055, lx + dx + 0.055, y + dy + 0.055, lz + dz + 0.055, DRAGON_HOARD_JEWEL_TILE, DRAGON_HOARD_JEWEL_TILE, DRAGON_HOARD_JEWEL_TILE, tint, 0.9);
            if (index === 1) addTexturedCuboid(bucket, lx + dx - 0.09, y + dy - 0.07, lz + dz - 0.09, lx + dx + 0.09, y + dy - 0.045, lz + dz + 0.09, DRAGON_HOARD_GOLD_TILE, DRAGON_HOARD_GOLD_TILE, DRAGON_HOARD_GOLD_TILE, [1, 1, 1], environment);
          }
          continue;
        }
        if (definition.shape === "lightning-bug-jar") {
          const environment = shadeAt(lx, y, lz);
          addTexturedCuboid(bucket, lx - 0.24, y - 0.5, lz - 0.24, lx + 0.24, y - 0.42, lz + 0.24, 41, 41, 41, [0.72, 0.58, 0.32], environment);
          addTexturedCuboid(bucket, lx - 0.26, y + 0.08, lz - 0.26, lx + 0.26, y + 0.18, lz + 0.26, 41, 41, 41, [0.78, 0.56, 0.25], environment);
          for (const x of [lx - 0.235, lx + 0.205]) addTexturedCuboid(buckets.transparent, x, y - 0.42, lz - 0.22, x + 0.03, y + 0.08, lz + 0.22, 12, 12, 12, [0.82, 1, 0.92], 1);
          for (const z of [lz - 0.235, lz + 0.205]) addTexturedCuboid(buckets.transparent, lx - 0.22, y - 0.42, z, lx + 0.22, y + 0.08, z + 0.03, 12, 12, 12, [0.82, 1, 0.92], 1);
          addTexturedCuboid(buckets.emissive, lx - 0.07, y - 0.2, lz - 0.04, lx + 0.07, y - 0.05, lz + 0.1, 13, 13, 13, [0.84, 1, 0.32], 1);
          addTexturedCuboid(buckets.emissive, lx - 0.18, y - 0.14, lz - 0.02, lx - 0.04, y - 0.11, lz + 0.08, 13, 13, 13, [0.72, 0.92, 0.44], 1);
          addTexturedCuboid(buckets.emissive, lx + 0.04, y - 0.14, lz - 0.02, lx + 0.18, y - 0.11, lz + 0.08, 13, 13, 13, [0.72, 0.92, 0.44], 1);
          continue;
        }
        if (definition.shape === "dragon-egg") {
          const environment = definition.layer === "emissive" ? 1 : shadeAt(lx, y, lz);
          const tile = definition.side;
          // Five tiers read as a rounded ovoid instead of a stepped crate stack.
          addTexturedCuboid(bucket, lx - 0.2, y - 0.5, lz - 0.2, lx + 0.2, y - 0.44, lz + 0.2, tile, tile, tile, [1, 1, 1], environment);
          addTexturedCuboid(bucket, lx - 0.3, y - 0.44, lz - 0.3, lx + 0.3, y - 0.2, lz + 0.3, tile, tile, tile, [1, 1, 1], environment);
          addTexturedCuboid(bucket, lx - 0.34, y - 0.2, lz - 0.34, lx + 0.34, y + 0.14, lz + 0.34, tile, tile, tile, [1, 1, 1], environment);
          addTexturedCuboid(bucket, lx - 0.27, y + 0.14, lz - 0.27, lx + 0.27, y + 0.34, lz + 0.27, tile, tile, tile, [1, 1, 1], environment);
          addTexturedCuboid(bucket, lx - 0.16, y + 0.34, lz - 0.16, lx + 0.16, y + 0.46, lz + 0.16, tile, tile, tile, [1, 1, 1], environment);
          continue;
        }
        if (definition.shape === "incubator") {
          const environment = shadeAt(lx, y, lz);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.48, y - 0.5, lz - 0.48, lx + 0.48, y - 0.31, lz + 0.48, 50, 51, 43, [1, 1, 1], environment);
          for (const [dx, dz] of [[-0.43, -0.43], [0.31, -0.43], [-0.43, 0.31], [0.31, 0.31]] as Array<[number, number]>) {
            addFacingCuboid(bucket, lx, lz, facing, lx + dx, y - 0.31, lz + dz, lx + dx + 0.12, y + 0.37, lz + dz + 0.12, 50, 50, 43, [1, 1, 1], environment);
          }
          addFacingCuboid(buckets.transparent, lx, lz, facing, lx - 0.34, y - 0.27, lz - 0.34, lx + 0.34, y + 0.3, lz + 0.34, 13, 13, 13, [1, 1, 1], 1);
          addFacingCuboid(buckets.emissive, lx, lz, facing, lx - 0.16, y - 0.18, lz - 0.16, lx + 0.16, y + 0.15, lz + 0.16, 51, 51, 51, [1, 1, 1], 1);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.43, y + 0.34, lz - 0.43, lx + 0.43, y + 0.47, lz + 0.43, 50, 51, 43, [1, 1, 1], environment);
          continue;
        }
        if (definition.shape === "archive-shelf") {
          const environment = shadeAt(lx, y, lz);
          for (const x of [lx - 0.48, lx + 0.36]) addFacingCuboid(bucket, lx, lz, facing, x, y - 0.5, lz - 0.22, x + 0.12, y + 0.48, lz + 0.22, 127, 127, 11, tint, environment);
          for (const shelfY of [y - 0.45, y - 0.03, y + 0.39]) addFacingCuboid(bucket, lx, lz, facing, lx - 0.48, shelfY, lz - 0.24, lx + 0.48, shelfY + 0.1, lz + 0.24, 127, 127, 11, tint, environment);
          const visibleTomes = archiveShelfBookCount(type) ?? 0;
          for (let index = 0; index < visibleTomes; index += 1) {
            const tier = Math.floor(index / 3);
            const x = lx - 0.34 + (index % 3) * 0.27;
            const tomeTile = [45, 48, 35][index % 3];
            const baseY = y - 0.34 + tier * 0.42;
            addFacingCuboid(bucket, lx, lz, facing, x, baseY, lz - 0.27, x + 0.17, baseY + 0.29, lz - 0.08, tomeTile, tomeTile, tomeTile, [1, 1, 1], environment);
          }
          continue;
        }
        if (definition.shape === "tome-display") {
          const environment = shadeAt(lx, y, lz);
          // Carved lectern only. A spell-school-colored open tome is supplied
          // by the stateful display layer and therefore never appears empty.
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.4, y - 0.5, lz - 0.35, lx + 0.4, y - 0.37, lz + 0.35, 11, 11, 11, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.3, y - 0.37, lz - 0.25, lx + 0.3, y - 0.3, lz + 0.25, 127, 127, 11, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.1, y - 0.3, lz - 0.1, lx + 0.1, y + 0.08, lz + 0.1, 127, 127, 11, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.35, y + 0.06, lz - 0.26, lx + 0.35, y + 0.16, lz + 0.26, 127, 127, 11, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.37, y + 0.14, lz + 0.2, lx + 0.37, y + 0.23, lz + 0.29, 127, 127, 11, tint, environment);
          for (const finialX of [lx - 0.34, lx + 0.29]) addFacingCuboid(bucket, lx, lz, facing, finialX, y + 0.21, lz + 0.2, finialX + 0.05, y + 0.31, lz + 0.27, DRAGON_HOARD_GOLD_TILE, DRAGON_HOARD_GOLD_TILE, DRAGON_HOARD_GOLD_TILE, [0.9, 0.82, 0.58], environment);
          continue;
        }
        if (definition.shape === "wayshrine") {
          const environment = shadeAt(lx, y, lz);
          addFacingCuboid(buckets.opaque, lx, lz, facing, lx - 0.46, y - 0.5, lz - 0.46, lx + 0.46, y - 0.28, lz + 0.46, 97, 97, 3, [0.82, 0.9, 0.88], environment);
          addFacingCuboid(buckets.opaque, lx, lz, facing, lx - 0.27, y - 0.28, lz - 0.22, lx + 0.27, y + 0.34, lz + 0.22, 99, 99, 99, [0.72, 0.82, 0.8], environment);
          addFacingCuboid(buckets.emissive, lx, lz, facing, lx - 0.12, y - 0.04, lz - 0.235, lx + 0.12, y + 0.22, lz - 0.205, 99, 99, 99, [1, 1, 1], 1);
          addFacingCuboid(buckets.opaque, lx, lz, facing, lx - 0.36, y + 0.34, lz - 0.3, lx + 0.36, y + 0.48, lz + 0.3, 97, 99, 97, [0.86, 0.92, 0.9], environment);
          continue;
        }
        if (definition.shape === "distillery") {
          const environment = shadeAt(lx, y, lz);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.42, y - 0.48, lz - 0.4, lx + 0.42, y + 0.3, lz + 0.4, 91, 92, 11, tint, environment);
          for (const ringY of [y - 0.28, y + 0.12]) addFacingCuboid(bucket, lx, lz, facing, lx - 0.45, ringY, lz - 0.43, lx + 0.45, ringY + 0.08, lz + 0.43, 97, 97, 97, [0.86, 0.74, 0.5], environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.07, y - 0.03, lz - 0.5, lx + 0.07, y + 0.12, lz - 0.39, 97, 97, 97, [0.9, 0.75, 0.45], environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.13, y + 0.3, lz - 0.13, lx + 0.13, y + 0.49, lz + 0.13, 91, 92, 11, tint, environment);
          continue;
        }
        if (["table", "stool", "shelf", "barrel"].includes(definition.shape ?? "")) {
          const environment = shadeAt(lx, y, lz);
          if (definition.shape === "table") {
            addFacingCuboid(bucket, lx, lz, facing, lx - 0.48, y + 0.22, lz - 0.42, lx + 0.48, y + 0.42, lz + 0.42, definition.side, definition.top, definition.bottom, tint, environment);
            for (const [dx, dz] of [[-0.4, -0.34], [0.28, -0.34], [-0.4, 0.22], [0.28, 0.22]] as Array<[number, number]>) {
              addFacingCuboid(bucket, lx, lz, facing, lx + dx, y - 0.5, lz + dz, lx + dx + 0.12, y + 0.23, lz + dz + 0.12, definition.side, definition.top, definition.bottom, tint, environment);
            }
          } else if (definition.shape === "stool") {
            addTexturedCuboid(bucket, lx - 0.34, y - 0.03, lz - 0.34, lx + 0.34, y + 0.14, lz + 0.34, definition.side, definition.top, definition.bottom, tint, environment);
            for (const [dx, dz] of [[-0.27, -0.27], [0.17, -0.27], [-0.27, 0.17], [0.17, 0.17]] as Array<[number, number]>) {
              addTexturedCuboid(bucket, lx + dx, y - 0.5, lz + dz, lx + dx + 0.1, y - 0.02, lz + dz + 0.1, definition.side, definition.top, definition.bottom, tint, environment);
            }
          } else if (definition.shape === "shelf") {
            for (const x of [lx - 0.47, lx + 0.35]) addFacingCuboid(bucket, lx, lz, facing, x, y - 0.5, lz - 0.18, x + 0.12, y + 0.48, lz + 0.18, definition.side, definition.top, definition.bottom, tint, environment);
            for (const shelfY of [y - 0.42, y - 0.02, y + 0.38]) addFacingCuboid(bucket, lx, lz, facing, lx - 0.47, shelfY, lz - 0.2, lx + 0.47, shelfY + 0.1, lz + 0.2, definition.side, definition.top, definition.bottom, tint, environment);
          } else {
            addTexturedCuboid(bucket, lx - 0.4, y - 0.48, lz - 0.4, lx + 0.4, y + 0.46, lz + 0.4, definition.side, definition.top, definition.bottom, tint, environment);
            for (const ringY of [y - 0.32, y + 0.26]) addTexturedCuboid(bucket, lx - 0.44, ringY, lz - 0.44, lx + 0.44, ringY + 0.08, lz + 0.44, 97, 97, 97, [0.82, 0.75, 0.6], environment);
          }
          continue;
        }
        if (definition.shape === "chair") {
          const environment = shadeAt(lx, y, lz);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.37, y - 0.08, lz - 0.34, lx + 0.37, y + 0.08, lz + 0.34, 11, 11, 11, tint, environment);
          for (const [dx, dz] of [[-0.32, -0.29], [0.22, -0.29], [-0.32, 0.19], [0.22, 0.19]] as Array<[number, number]>) {
            addFacingCuboid(bucket, lx, lz, facing, lx + dx, y - 0.5, lz + dz, lx + dx + 0.1, y - 0.07, lz + dz + 0.1, 11, 11, 11, tint, environment);
          }
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.37, y + 0.08, lz + 0.24, lx + 0.37, y + 0.48, lz + 0.36, 11, 11, 11, tint, environment);
          continue;
        }
        if (definition.shape === "fence" || definition.shape === "gate") {
          const tile = definition.side;
          const environment = shadeAt(lx, y, lz);
          const addWoodCuboid = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
            addQuad(bucket, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], tile, 0.82, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], [-1, 0, 0], tile, 0.72, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], [0, 1, 0], tile, 1, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]], [0, -1, 0], tile, 0.55, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]], [0, 0, 1], tile, 0.9, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], [0, 0, -1], tile, 0.76, tint, 0, 0, 0, 0, environment);
          };
          if (definition.shape === "fence") {
            addWoodCuboid(lx - 0.14, y - 0.5, lz - 0.14, lx + 0.14, y + 0.75, lz + 0.14);
            const connectable = (dx: number, dz: number) => {
              const neighbor = neighborAt(lx + dx, y, lz + dz);
              const next = BLOCKS[neighbor];
              return next?.connectGroup === "fence" || Boolean(next?.solid && (!next.shape || next.shape === "cube"));
            };
            if (connectable(1, 0)) for (const railY of [-0.06, 0.38]) addWoodCuboid(lx + 0.08, y + railY - 0.1, lz - 0.09, lx + 0.5, y + railY + 0.1, lz + 0.09);
            if (connectable(-1, 0)) for (const railY of [-0.06, 0.38]) addWoodCuboid(lx - 0.5, y + railY - 0.1, lz - 0.09, lx - 0.08, y + railY + 0.1, lz + 0.09);
            if (connectable(0, 1)) for (const railY of [-0.06, 0.38]) addWoodCuboid(lx - 0.09, y + railY - 0.1, lz + 0.08, lx + 0.09, y + railY + 0.1, lz + 0.5);
            if (connectable(0, -1)) for (const railY of [-0.06, 0.38]) addWoodCuboid(lx - 0.09, y + railY - 0.1, lz - 0.5, lx + 0.09, y + railY + 0.1, lz - 0.08);
          } else {
            const northSouth = type === BlockId.FenceGateNorthSouthClosed || type === BlockId.FenceGateNorthSouthOpen;
            const open = type === BlockId.FenceGateNorthSouthOpen || type === BlockId.FenceGateEastWestOpen;
            if (northSouth) {
              addWoodCuboid(lx - 0.48, y - 0.5, lz - 0.12, lx - 0.34, y + 0.72, lz + 0.12);
              addWoodCuboid(lx + 0.34, y - 0.5, lz - 0.12, lx + 0.48, y + 0.72, lz + 0.12);
              if (open) {
                for (const railY of [-0.06, 0.36]) {
                  addWoodCuboid(lx - 0.46, y + railY - 0.09, lz - 0.12, lx - 0.34, y + railY + 0.09, lz + 0.34);
                  addWoodCuboid(lx + 0.34, y + railY - 0.09, lz - 0.12, lx + 0.46, y + railY + 0.09, lz + 0.34);
                }
              } else for (const railY of [-0.06, 0.36]) addWoodCuboid(lx - 0.36, y + railY - 0.09, lz - 0.08, lx + 0.36, y + railY + 0.09, lz + 0.08);
            } else {
              addWoodCuboid(lx - 0.12, y - 0.5, lz - 0.48, lx + 0.12, y + 0.72, lz - 0.34);
              addWoodCuboid(lx - 0.12, y - 0.5, lz + 0.34, lx + 0.12, y + 0.72, lz + 0.48);
              if (open) {
                for (const railY of [-0.06, 0.36]) {
                  addWoodCuboid(lx - 0.12, y + railY - 0.09, lz - 0.46, lx + 0.34, y + railY + 0.09, lz - 0.34);
                  addWoodCuboid(lx - 0.12, y + railY - 0.09, lz + 0.34, lx + 0.34, y + railY + 0.09, lz + 0.46);
                }
              } else for (const railY of [-0.06, 0.36]) addWoodCuboid(lx - 0.08, y + railY - 0.09, lz - 0.36, lx + 0.08, y + railY + 0.09, lz + 0.36);
            }
          }
          continue;
        }
        if (definition.shape === "exhibit") {
          // Conservatory blocks visually fuse into one habitat. Interior faces
          // disappear and exposed faces use unframed glass; the engine draws a
          // single component perimeter so coplanar blocks cannot z-fight or
          // retain the old one-frame-per-block grid.
          for (const face of FACES) {
            const [dx, dy, dz] = face.direction;
            if (neighborAt(lx + dx, y + dy, lz + dz) === BlockId.ButterflyExhibit) continue;
            const environment = shadeAt(lx + dx, y + dy, lz + dz);
            addQuad(bucket, face.corners, face.direction, definition.top, face.shade, [1, 1, 1], lx, y, lz, 0, environment);
          }
          continue;
        }
        if (definition.shape === "chest") {
          const environment = shadeAt(lx, y, lz);
          const right = blockFacingRight(facing);
          const sameFacingChest = (dx: number, dz: number) => neighborAt(lx + dx, y, lz + dz) === BlockId.Chest
            && this.blockFacingAt(worldX + dx, y, worldZ + dz) === facing;
          const joinsLeft = sameFacingChest(-right.x, -right.z);
          const joinsRight = sameFacingChest(right.x, right.z);
          // Close the cosmetic air seam between paired standing chests. The
          // open runtime model uses the same continuous footprint, so opening
          // a double chest no longer changes its apparent overall size.
          const bodyX0 = lx - (joinsLeft ? 0.5 : 0.44);
          const bodyX1 = lx + (joinsRight ? 0.5 : 0.44);
          const lidX0 = lx - (joinsLeft ? 0.5 : 0.46);
          const lidX1 = lx + (joinsRight ? 0.5 : 0.46);
          addFacingCuboid(bucket, lx, lz, facing, bodyX0, y + CHEST_VISUAL.bodyBottom, lz - CHEST_VISUAL.bodyDepth / 2, bodyX1, y + CHEST_VISUAL.bodyTop, lz + CHEST_VISUAL.bodyDepth / 2, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lidX0, y + CHEST_VISUAL.lidBottom, lz - CHEST_VISUAL.lidDepth / 2, lidX1, y + CHEST_VISUAL.lidTop, lz + CHEST_VISUAL.lidDepth / 2, definition.side, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - CHEST_VISUAL.latchWidth / 2, y + CHEST_VISUAL.latchBottom, lz + CHEST_VISUAL.latchCenterZ - CHEST_VISUAL.latchDepth / 2, lx + CHEST_VISUAL.latchWidth / 2, y + CHEST_VISUAL.latchTop, lz + CHEST_VISUAL.latchCenterZ + CHEST_VISUAL.latchDepth / 2, DRAGON_HOARD_GOLD_TILE, DRAGON_HOARD_GOLD_TILE, DRAGON_HOARD_GOLD_TILE, tint, environment);
          continue;
        }
        if (definition.shape === "door") {
          const tile = definition.side;
          const environment = shadeAt(lx, y, lz);
          const open = doorIsOpen(type);
          const xAxis = doorUsesXAxis(type);
          const planeAlongZ = xAxis !== open;
          if (doorState(type)?.family === "wrought-iron") {
            const thinCenterX = planeAlongZ ? lx + (open ? -0.42 : 0) : lx;
            const thinCenterZ = planeAlongZ ? lz : lz + (open ? -0.42 : 0);
            const ironCuboid = (along0: number, y0: number, along1: number, y1: number, fitting = false) => {
              if (planeAlongZ) addTexturedCuboid(bucket, thinCenterX - 0.07, y0, lz + along0, thinCenterX + 0.07, y1, lz + along1, fitting ? 161 : 160, fitting ? 161 : 160, fitting ? 161 : 160, tint, environment);
              else addTexturedCuboid(bucket, lx + along0, y0, thinCenterZ - 0.07, lx + along1, y1, thinCenterZ + 0.07, fitting ? 161 : 160, fitting ? 161 : 160, fitting ? 161 : 160, tint, environment);
            };
            for (const along of [-0.44, -0.22, 0, 0.22, 0.44]) ironCuboid(along - (Math.abs(along) > 0.4 ? 0.045 : 0.025), y - 0.5, along + (Math.abs(along) > 0.4 ? 0.045 : 0.025), y + 0.5);
            for (const railY of [y - 0.46, y + 0.38]) ironCuboid(-0.48, railY, 0.48, railY + 0.08);
            ironCuboid(0.27, y - 0.06, 0.43, y + 0.1, true);
            continue;
          }
          if (planeAlongZ) {
            const x0 = lx + (open ? -0.5 : -0.08);
            const x1 = lx + (open ? -0.34 : 0.08);
            addQuad(bucket, [[x0, y - 0.5, lz - 0.48], [x0, y + 0.5, lz - 0.48], [x0, y + 0.5, lz + 0.48], [x0, y - 0.5, lz + 0.48]], [-1, 0, 0], tile, 0.88, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[x1, y - 0.5, lz + 0.48], [x1, y + 0.5, lz + 0.48], [x1, y + 0.5, lz - 0.48], [x1, y - 0.5, lz - 0.48]], [1, 0, 0], tile, 0.78, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[x0, y + 0.5, lz - 0.48], [x0, y + 0.5, lz + 0.48], [x1, y + 0.5, lz + 0.48], [x1, y + 0.5, lz - 0.48]], [0, 1, 0], 62, 0.94, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[x0, y - 0.5, lz + 0.48], [x0, y - 0.5, lz - 0.48], [x1, y - 0.5, lz - 0.48], [x1, y - 0.5, lz + 0.48]], [0, -1, 0], 62, 0.58, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[x1, y - 0.5, lz + 0.48], [x1, y + 0.5, lz + 0.48], [x0, y + 0.5, lz + 0.48], [x0, y - 0.5, lz + 0.48]], [0, 0, 1], 62, 0.84, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[x0, y - 0.5, lz - 0.48], [x0, y + 0.5, lz - 0.48], [x1, y + 0.5, lz - 0.48], [x1, y - 0.5, lz - 0.48]], [0, 0, -1], 62, 0.72, tint, 0, 0, 0, 0, environment);
          } else {
            const z0 = lz + (open ? -0.5 : -0.08);
            const z1 = lz + (open ? -0.34 : 0.08);
            addQuad(bucket, [[lx + 0.48, y - 0.5, z0], [lx + 0.48, y + 0.5, z0], [lx - 0.48, y + 0.5, z0], [lx - 0.48, y - 0.5, z0]], [0, 0, -1], tile, 0.9, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[lx - 0.48, y - 0.5, z1], [lx - 0.48, y + 0.5, z1], [lx + 0.48, y + 0.5, z1], [lx + 0.48, y - 0.5, z1]], [0, 0, 1], tile, 0.8, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[lx - 0.48, y + 0.5, z0], [lx - 0.48, y + 0.5, z1], [lx + 0.48, y + 0.5, z1], [lx + 0.48, y + 0.5, z0]], [0, 1, 0], 62, 0.94, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[lx - 0.48, y - 0.5, z1], [lx - 0.48, y - 0.5, z0], [lx + 0.48, y - 0.5, z0], [lx + 0.48, y - 0.5, z1]], [0, -1, 0], 62, 0.58, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[lx + 0.48, y - 0.5, z0], [lx + 0.48, y + 0.5, z0], [lx + 0.48, y + 0.5, z1], [lx + 0.48, y - 0.5, z1]], [1, 0, 0], 62, 0.82, tint, 0, 0, 0, 0, environment);
            addQuad(bucket, [[lx - 0.48, y - 0.5, z1], [lx - 0.48, y + 0.5, z1], [lx - 0.48, y + 0.5, z0], [lx - 0.48, y - 0.5, z0]], [-1, 0, 0], 62, 0.7, tint, 0, 0, 0, 0, environment);
          }
          continue;
        }
        if (definition.shape === "bed") {
          const environment = shadeAt(lx, y, lz);
          const direction = [BlockId.BedNorthFoot, BlockId.BedNorthHead].includes(type) ? [0, -1]
            : [BlockId.BedSouthFoot, BlockId.BedSouthHead].includes(type) ? [0, 1]
              : [BlockId.BedEastFoot, BlockId.BedEastHead].includes(type) ? [1, 0]
                : [-1, 0];
          const head = [BlockId.BedNorthHead, BlockId.BedSouthHead, BlockId.BedEastHead, BlockId.BedWestHead].includes(type);
          const addCuboid = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, sideTile: number, topTile = sideTile, bottomTile = sideTile) => {
            addQuad(bucket, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], sideTile, 0.82, [1, 1, 1], 0, 0, 0, 0, environment);
            addQuad(bucket, [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], [-1, 0, 0], sideTile, 0.72, [1, 1, 1], 0, 0, 0, 0, environment);
            addQuad(bucket, [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], [0, 1, 0], topTile, 1, [1, 1, 1], 0, 0, 0, 0, environment);
            addQuad(bucket, [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]], [0, -1, 0], bottomTile, 0.56, [1, 1, 1], 0, 0, 0, 0, environment);
            addQuad(bucket, [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]], [0, 0, 1], sideTile, 0.88, [1, 1, 1], 0, 0, 0, 0, environment);
            addQuad(bucket, [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], [0, 0, -1], sideTile, 0.76, [1, 1, 1], 0, 0, 0, 0, environment);
          };
          addCuboid(lx - 0.45, y - 0.5, lz - 0.45, lx + 0.45, y - 0.31, lz + 0.45, 62, 11, 11);
          addCuboid(lx - 0.46, y - 0.3, lz - 0.46, lx + 0.46, y + 0.04, lz + 0.46, 63);
          if (head) {
            const [dx, dz] = direction;
            const pillowX0 = dx > 0 ? lx + 0.08 : dx < 0 ? lx - 0.39 : lx - 0.34;
            const pillowX1 = dx > 0 ? lx + 0.39 : dx < 0 ? lx - 0.08 : lx + 0.34;
            const pillowZ0 = dz > 0 ? lz + 0.08 : dz < 0 ? lz - 0.39 : lz - 0.34;
            const pillowZ1 = dz > 0 ? lz + 0.39 : dz < 0 ? lz - 0.08 : lz + 0.34;
            addQuad(bucket, [[pillowX0, y + 0.055, pillowZ0], [pillowX0, y + 0.055, pillowZ1], [pillowX1, y + 0.055, pillowZ1], [pillowX1, y + 0.055, pillowZ0]], [0, 1, 0], 16, 1, [1, 1, 1], 0, 0, 0, 0, environment);
            const boardX0 = dx > 0 ? lx + 0.39 : dx < 0 ? lx - 0.49 : lx - 0.46;
            const boardX1 = dx > 0 ? lx + 0.49 : dx < 0 ? lx - 0.39 : lx + 0.46;
            const boardZ0 = dz > 0 ? lz + 0.39 : dz < 0 ? lz - 0.49 : lz - 0.46;
            const boardZ1 = dz > 0 ? lz + 0.49 : dz < 0 ? lz - 0.39 : lz + 0.46;
            addCuboid(boardX0, y - 0.5, boardZ0, boardX1, y + 0.31, boardZ1, 62, 62, 11);
          }
          continue;
        }
        if (type === BlockId.Furnace) {
          const environment = shadeAt(lx, y, lz);
          // Furnace masonry is neutral on three sides; one shallow face plate
          // carries the authored furnace-front atlas tile and rotates with the
          // builder's placement facing.
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.5, y - 0.5, lz - 0.5, lx + 0.5, y + 0.5, lz + 0.5, definition.bottom, definition.top, definition.bottom, tint, environment);
          addFacingCuboid(bucket, lx, lz, facing, lx - 0.43, y - 0.4, lz - 0.506, lx + 0.43, y + 0.4, lz - 0.499, definition.side, definition.side, definition.side, tint, environment);
          continue;
        }
        for (const face of FACES) {
          const [dx, dy, dz] = face.direction;
          const neighbor = neighborAt(lx + dx, y + dy, lz + dz);
          const liquidSurfaceInset = definition.liquid
            ? liquidSurfaceInsetAt(lx, y, lz, type)
            : 0;
          if (definition.liquid === "water" && dy === 0 && blockContainsWater(neighbor)) {
            const neighborSurfaceInset = liquidSurfaceInsetAt(lx + dx, y, lz + dz, neighbor);
            if (liquidSurfaceInset <= neighborSurfaceInset + 1e-6) continue;
            const exposedCorners = face.corners.map(([cornerX, cornerY, cornerZ]) => [
              cornerX,
              0.5 + (cornerY > 0 ? liquidSurfaceInset : neighborSurfaceInset),
              cornerZ,
            ] as [number, number, number]);
            addQuad(bucket, exposedCorners, face.direction, definition.side, face.shade, tint, lx, y, lz, 0,
              shadeAt(lx + dx, y + dy, lz + dz));
            continue;
          }
          const internalLeafFace = LEAF_BLOCK_SET.has(type)
            && neighbor === type
            && dx + dy + dz > 0
            && hash3(chunk.cx * CHUNK_SIZE + lx + dx, y + dy, chunk.cz * CHUNK_SIZE + lz + dz, this.seed ^ 0x37b41cd9) < DENSE_CUTOUT_LEAF_POLICY.renderInternalFaceFraction;
          if (!this.faceVisible(type, neighbor) && !internalLeafFace) continue;
          const tile = dy > 0 ? definition.top : dy < 0 ? definition.bottom : definition.side;
          const environment = definition.layer === "emissive"
            ? Math.max(0.82, shadeAt(lx + dx, y + dy, lz + dz))
            : shadeAt(lx + dx, y + dy, lz + dz);
          addQuad(bucket, face.corners, face.direction, tile, face.shade, tint, lx, y, lz, liquidSurfaceInset, environment);
        }
      }
    }

    if (slice && !slice.finalize) return;
    if (slice && old) for (const mesh of Object.values(old)) if (mesh) { chunk.group.remove(mesh); this.disposeTerrainGeometry(mesh.geometry); }
    const queueKey = `${chunk.key}:${section}`;
    const completingSeamRebuild = this.seamMeshRebuilds.has(queueKey)
      && !this.meshQueued.has(queueKey)
      && !this.urgentMeshQueued.has(queueKey);
    const invalidatedLayers: WorldRenderLayer[] = [];
    if (completingSeamRebuild) {
      this.seamMeshRebuilds.delete(queueKey);
      // Consolidated geometry owns the section's previous edge faces. Retire
      // it only when the replacement section is ready, avoiding both a stale
      // seam and a transient hole while the urgent rebuild is in progress.
      for (const layer of WORLD_RENDER_LAYERS) {
        const combined = chunk.combinedMeshes[layer];
        if (!combined) continue;
        chunk.group.remove(combined);
        this.disposeTerrainGeometry(combined.geometry);
        delete chunk.combinedMeshes[layer];
        invalidatedLayers.push(layer);
      }
      for (const meshes of chunk.sections.values()) {
        for (const layer of WORLD_RENDER_LAYERS) if (meshes[layer]) meshes[layer]!.visible = true;
      }
      this.invalidatedCombinedMeshes += invalidatedLayers.length;
    }
    const nextMeshes: ChunkMeshes = {};
    for (const layer of WORLD_RENDER_LAYERS) {
      const bucket = buckets[layer];
      if (!bucket.positions.length) continue;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(bucket.positions, 3));
      geometry.setAttribute("normal", new THREE.BufferAttribute(packSnorm8(bucket.normals), 3, true));
      geometry.setAttribute("color", new THREE.BufferAttribute(packColorUnorm8(bucket.colors), 3, true));
      geometry.setAttribute("voxelLight", new THREE.BufferAttribute(packLightUnorm8(bucket.lights), 4, true));
      geometry.setAttribute("voxelEmission", new THREE.BufferAttribute(packScalarUnorm8(bucket.emissions), 1, true));
      geometry.setAttribute("voxelOcclusion", new THREE.BufferAttribute(packScalarUnorm8(bucket.occlusions), 1, true));
      geometry.setAttribute("uv", new THREE.BufferAttribute(packUnorm16(bucket.uvs), 2, true));
      geometry.setIndex(bucket.indices);
      this.registerTerrainGeometry(geometry);
      const centerY = (startY + endY) / 2;
      geometry.boundingSphere = new THREE.Sphere(
        new THREE.Vector3((CHUNK_SIZE - 1) / 2, centerY, (CHUNK_SIZE - 1) / 2),
        Math.sqrt(2 * (CHUNK_SIZE / 2) ** 2 + ((endY - startY + 1) / 2) ** 2),
      );
      const mesh = new THREE.Mesh(geometry, this.materials[layer]);
      mesh.renderOrder = worldRenderOrder(layer);
      mesh.visible = !chunk.combinedMeshes[layer];
      chunk.group.add(mesh);
      this.freezeTerrainTransform(mesh);
      nextMeshes[layer] = mesh;
    }
    chunk.sections.set(section, nextMeshes);
    chunk.dirty.delete(section);
    const changedLayers = WORLD_RENDER_LAYERS.filter((layer) => Boolean(
      old?.[layer] || nextMeshes[layer] || invalidatedLayers.includes(layer),
    ));
    this.queueChunkConsolidation(chunk, changedLayers);
    if (completingSeamRebuild) this.releaseSeamPresentationBlocker(queueKey);
  }

  /** Direct presentation exposure, separate from propagated skylight. */
  directSkyExposureAt(x: number, y: number, z: number) {
    const sampleX = Math.floor(x + 0.5);
    const sampleZ = Math.floor(z + 0.5);
    const sampleY = Math.floor(y + 0.5);
    let open = 0;
    let total = 0;
    for (const [dx, dz, weight] of [[0, 0, 3], [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1]] as const) {
      const top = this.skyTopAt(sampleX + dx, sampleZ + dz);
      total += weight;
      if (top !== undefined && top < sampleY) open += weight;
    }
    return total > 0 ? clamp(open / total, 0, 1) : 0;
  }

  /** Sparse conservative voxel ray used only for sun/moon presentation. */
  celestialVisibleAt(
    x: number,
    y: number,
    z: number,
    direction: Readonly<{ x: number; y: number; z: number }>,
  ) {
    const length = Math.hypot(direction.x, direction.y, direction.z);
    if (length <= 0.0001 || direction.y <= 0.015) return false;
    if (this.directSkyExposureAt(x, y, z) >= 0.99) return true;
    const dx = direction.x / length;
    const dy = direction.y / length;
    const dz = direction.z / length;
    const maxDistance = Math.min(224, Math.max(8, (MAX_Y + 1 - y) / dy));
    const step = 0.55;
    for (let distance = step; distance <= maxDistance; distance += step) {
      const sampleX = Math.floor(x + dx * distance + 0.5);
      const sampleY = Math.floor(y + dy * distance + 0.5);
      const sampleZ = Math.floor(z + dz * distance + 0.5);
      if (sampleY > MAX_Y) return true;
      const type = this.getBlock(sampleX, sampleY, sampleZ);
      if (type === undefined) return false;
      if (blocksSky(type)) return false;
    }
    return false;
  }

  unloadChunk(key: string) {
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    const cached = this.cachedChunkData(chunk);
    this.chunkMemoryCache.set(cached);
    void this.chunkPersistentCache.set(cached);
    this.lightInitializationQueued.delete(key);
    this.lightInitializationEnqueuedAt.delete(key);
    this.lightReconciliationQueued.delete(key);
    this.lightSectionsPendingByChunk.delete(key);
    if (this.activeLightReconciliation?.key === key) this.activeLightReconciliation = null;
    this.generationEnqueuedAt.delete(key);
    this.lightInitializationTasks.delete(key);
    if (this.activeLightInitialization?.key === key) this.activeLightInitialization = null;
    if (this.activeMeshTask?.key === key) this.activeMeshTask = null;
    for (let section = 0; section < SECTION_COUNT; section += 1) {
      const queueKey = `${key}:${section}`;
      this.meshQueued.delete(queueKey);
      this.urgentMeshQueued.delete(queueKey);
      if (this.seamMeshRebuilds.delete(queueKey)) this.releaseSeamPresentationBlocker(queueKey);
      this.seamPresentationPending.delete(queueKey);
      this.meshEnqueuedAt.delete(queueKey);
      this.lightSectionQueued.delete(queueKey);
    }
    for (const section of chunk.sections.values()) for (const mesh of Object.values(section)) if (mesh) this.disposeTerrainGeometry(mesh.geometry);
    for (const mesh of Object.values(chunk.combinedMeshes)) if (mesh) this.disposeTerrainGeometry(mesh.geometry);
    this.consolidationDirtyLayers.delete(key);
    for (const layer of WORLD_RENDER_LAYERS) {
      const queueKey = `${key}:${layer}`;
      this.consolidationQueued.delete(queueKey);
      this.consolidationEnqueuedAt.delete(queueKey);
      this.consolidationRevision.delete(queueKey);
      this.resolvePlayerEditConsolidation(queueKey);
    }
    this.group.remove(chunk.group);
    this.chunks.delete(key);
  }

  disposeChunks() {
    for (const key of [...this.chunks.keys()]) this.unloadChunk(key);
  }

  serializeEdits(): ChunkEditSave {
    const result: ChunkEditSave = {};
    for (const [key, edits] of this.edits.entries()) result[key] = [...edits.entries()].map(([index, type]) => [index, type]);
    return result;
  }

  get loadedCount() {
    return this.chunks.size;
  }

  get queuedCount() {
    return this.generationQueue.length
      + (this.activeGenerationTask ? 1 : 0)
      + this.pendingWorkerGeneration.size
      + this.lightInitializationQueued.size
      + this.lightReconciliationQueued.size
      + this.meshQueued.size
      + this.urgentMeshQueued.size
      + (this.activeMeshTask ? 1 : 0);
  }

  private chunkStreamingState(key: string) {
    const chunk = this.chunks.get(key);
    if (!chunk) {
      const task = this.activeGenerationTask?.key === key
        ? this.activeGenerationTask
        : this.generationTasks.get(key);
      return {
        playerChunkReady: false,
        playerChunkStage: "generation" as const,
        playerChunkDetail: task?.stage ?? (this.generationQueued.has(key) ? "queued" : "missing"),
      };
    }
    if (!this.chunkLightPresentationReady(key)) return {
      playerChunkReady: false,
      playerChunkStage: "lighting" as const,
      playerChunkDetail: this.activeLightReconciliation?.key === key
        ? `seam-${this.activeLightReconciliation.task.phase}`
        : this.lightReconciliationQueued.has(key)
          ? "seam-queued"
          : this.activeLightInitialization?.key === key
        ? this.activeLightInitialization.task.phase
        : this.lightInitializationTasks.get(key)?.phase ?? "queued",
    };
    const requiredSections = this.playerRequiredMeshSections(chunk);
    const missingSection = requiredSections.find((section) => !chunk.sections.has(section));
    if (missingSection !== undefined) return {
      playerChunkReady: false,
      playerChunkStage: "meshing" as const,
      playerChunkDetail: `section-${missingSection}`,
    };
    return {
      playerChunkReady: true,
      playerChunkStage: "ready" as const,
      playerChunkDetail: `section-${this.playerSection}`,
    };
  }

  private playerChunkStreamingState() {
    return this.chunkStreamingState(chunkKey(this.playerChunkX, this.playerChunkZ));
  }

  private immediateRingWorkState() {
    const offsets: Array<{ x: number; z: number; key: string; priority: number }> = [];
    for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) {
      const key = chunkKey(this.playerChunkX + dx, this.playerChunkZ + dz);
      offsets.push({ x: dx, z: dz, key, priority: this.chunkStreamingPriority(key) });
    }
    offsets.sort((left, right) => left.priority - right.priority || left.x - right.x || left.z - right.z);
    for (const candidate of offsets) {
      const state = this.chunkStreamingState(candidate.key);
      if (state.playerChunkStage === "ready") continue;
      if (state.playerChunkStage === "generation") {
        const completed = this.completedWorkerGeneration.some((entry) => entry.key === candidate.key);
        const active = this.activeGenerationTask?.key === candidate.key;
        if (this.pendingWorkerGeneration.has(candidate.key) && !completed) continue;
        if (!completed && !active && !this.generationQueued.has(candidate.key)) continue;
      }
      return { key: candidate.key, stage: state.playerChunkStage } as const;
    }
    return null;
  }

  private playerRequiredMeshSections(chunk: Chunk) {
    return [this.playerSection, this.playerSection - 1]
      .filter((section, index, all) => section >= 0 && section < SECTION_COUNT && all.indexOf(section) === index)
      .filter((section) => chunk.sectionBlockCounts[section] > 0);
  }

  private recordPlayerReadiness(now: number) {
    const ready = this.playerChunkStreamingState().playerChunkReady;
    if (!ready && this.playerUnreadyStartedAt === null) this.playerUnreadyStartedAt = now;
    if (ready && this.playerUnreadyStartedAt !== null) {
      this.playerReadinessEpisodes.push(Math.max(0, now - this.playerUnreadyStartedAt));
      if (this.playerReadinessEpisodes.length > 256) this.playerReadinessEpisodes.shift();
      this.playerUnreadyStartedAt = null;
    }
  }

  private ringCompleteness(radius: number) {
    let desired = 0;
    let ready = 0;
    for (let dx = -radius; dx <= radius; dx += 1) for (let dz = -radius; dz <= radius; dz += 1) {
      desired += 1;
      const chunk = this.chunks.get(chunkKey(this.playerChunkX + dx, this.playerChunkZ + dz));
      if (!chunk || !this.chunkLightPresentationReady(chunk.key)) continue;
      if (this.playerRequiredMeshSections(chunk).every((section) => chunk.sections.has(section))) ready += 1;
    }
    return { desired, ready, ratio: desired ? ready / desired : 1 } as const;
  }

  private streamingDebt(now: number) {
    let weightedDebt = 0;
    let oldestNearJobMilliseconds = 0;
    const add = (key: string, enqueuedAt: number, weight: number) => {
      const separator = key.indexOf(",");
      const cx = Number(key.slice(0, separator));
      const cz = Number(key.slice(separator + 1));
      const distance = Math.max(Math.abs(cx - this.playerChunkX), Math.abs(cz - this.playerChunkZ));
      weightedDebt += weight / Math.max(1, distance + 0.5);
      if (distance <= 4) oldestNearJobMilliseconds = Math.max(oldestNearJobMilliseconds, now - enqueuedAt);
    };
    for (const [key, enqueuedAt] of this.generationEnqueuedAt) add(key, enqueuedAt, 3);
    for (const [key, enqueuedAt] of this.lightInitializationEnqueuedAt) add(key, enqueuedAt, 2);
    for (const [queueKey, enqueuedAt] of this.meshEnqueuedAt) add(queueKey.slice(0, queueKey.lastIndexOf(":")), enqueuedAt, 1);
    for (const [queueKey, enqueuedAt] of this.consolidationEnqueuedAt) add(queueKey.slice(0, queueKey.lastIndexOf(":")), enqueuedAt, 0.75);
    return { weightedDebt, oldestNearJobMilliseconds } as const;
  }

  terrainSubmissionDiagnostics() {
    let sectionMeshes = 0;
    let visibleSectionMeshes = 0;
    let combinedMeshes = 0;
    let visibleCombinedMeshes = 0;
    for (const chunk of this.chunks.values()) {
      for (const section of chunk.sections.values()) for (const mesh of Object.values(section)) if (mesh) {
        sectionMeshes += 1;
        if (chunk.group.visible && mesh.visible) visibleSectionMeshes += 1;
      }
      for (const mesh of Object.values(chunk.combinedMeshes)) if (mesh) {
        combinedMeshes += 1;
        if (chunk.group.visible && mesh.visible) visibleCombinedMeshes += 1;
      }
    }
    return {
      sectionMeshes,
      visibleSectionMeshes,
      combinedMeshes,
      visibleCombinedMeshes,
      submittedMeshes: visibleSectionMeshes + visibleCombinedMeshes,
      geometriesCreated: this.terrainGeometriesCreated,
      geometriesDisposed: this.terrainGeometriesDisposed,
      liveGeometryBytes: this.liveTerrainGeometryBytes,
      invalidatedCombinedMeshes: this.invalidatedCombinedMeshes,
      coalescedConsolidations: this.coalescedConsolidations,
    } as const;
  }

  resetPlayerEditFeedbackDiagnostics() {
    if (this.activePlayerEditFeedback) return false;
    this.playerEditFeedbackRecords = [];
    this.playerEditConsolidationWaiters.clear();
    return true;
  }

  private playerEditFeedbackDiagnostics() {
    const records = this.playerEditFeedbackRecords;
    const duration = (start: number | undefined, end: number | undefined) => start === undefined || end === undefined
      ? undefined : Math.max(0, end - start);
    const summarize = (values: Array<number | undefined>) => {
      const sorted = values.filter((value): value is number => Number.isFinite(value)).sort((left, right) => left - right);
      const percentile = (fraction: number) => sorted.length
        ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)]
        : 0;
      return {
        count: sorted.length,
        p50Milliseconds: percentile(0.5),
        p95Milliseconds: percentile(0.95),
        maxMilliseconds: sorted.at(-1) ?? 0,
      } as const;
    };
    const latest = records.at(-1);
    return {
      total: records.length,
      byKind: records.reduce<Record<PlayerEditFeedbackKind, number>>((counts, record) => {
        counts[record.kind] += 1;
        return counts;
      }, { break: 0, place: 0, "tree-fell": 0 }),
      pendingConsolidationTransactions: records.filter((record) => record.pendingConsolidations.size > 0).length,
      inputToMutation: summarize(records.map((record) => duration(record.inputStartedAt, record.mutationStartedAt))),
      mutationToStaleGeometryHidden: summarize(records.map((record) => duration(record.mutationStartedAt, record.staleGeometryHiddenAt))),
      mutationToLocalMeshVisible: summarize(records.map((record) => duration(record.mutationStartedAt, record.localMeshVisibleAt))),
      localMeshToConsolidated: summarize(records.map((record) => duration(record.localMeshVisibleAt, record.consolidatedAt))),
      treeProxyAfterStaleGeometryHidden: summarize(records
        .filter((record) => record.kind === "tree-fell")
        .map((record) => duration(record.staleGeometryHiddenAt, record.proxyStartedAt))),
      last: latest ? {
        id: latest.id,
        kind: latest.kind,
        inputToMutationMilliseconds: duration(latest.inputStartedAt, latest.mutationStartedAt) ?? null,
        mutationToStaleGeometryHiddenMilliseconds: duration(latest.mutationStartedAt, latest.staleGeometryHiddenAt) ?? null,
        mutationToLocalMeshVisibleMilliseconds: duration(latest.mutationStartedAt, latest.localMeshVisibleAt) ?? null,
        localMeshToConsolidatedMilliseconds: duration(latest.localMeshVisibleAt, latest.consolidatedAt) ?? null,
        treeProxyAfterStaleGeometryHiddenMilliseconds: duration(latest.staleGeometryHiddenAt, latest.proxyStartedAt) ?? null,
        pendingConsolidations: latest.pendingConsolidations.size,
      } : null,
    } as const;
  }

  private ensurePlayerChunkMeshQueue(key = chunkKey(this.playerChunkX, this.playerChunkZ)) {
    const chunk = this.chunks.get(key);
    if (!chunk?.lightInitialized || !chunk.group.visible || !this.chunkLightPresentationReady(key)) return;
    for (const section of this.playerRequiredMeshSections(chunk)) {
      if (chunk.sections.has(section)) continue;
      if (this.activeMeshTask?.key === key && this.activeMeshTask.section === section) continue;
      const queueKey = `${key}:${section}`;
      if (this.seamPresentationPending.has(queueKey)) continue;
      if (this.meshQueued.has(queueKey) || this.urgentMeshQueued.has(queueKey)) continue;
      this.queueMesh(key, section);
    }
  }

  streamingDiagnostics() {
    const playerState = this.playerChunkStreamingState();
    const now = performance.now();
    const episodes = [...this.playerReadinessEpisodes].sort((left, right) => left - right);
    const currentUnreadyMilliseconds = this.playerUnreadyStartedAt === null ? 0 : now - this.playerUnreadyStartedAt;
    const percentile = (fraction: number) => episodes.length
      ? episodes[Math.min(episodes.length - 1, Math.ceil(episodes.length * fraction) - 1)]
      : 0;
    return {
      ...playerState,
      playerChunk: chunkKey(this.playerChunkX, this.playerChunkZ),
      playerSection: this.playerSection,
      generationQueued: this.generationQueue.length + (this.activeGenerationTask ? 1 : 0) + this.pendingWorkerGeneration.size,
      generationStage: this.activeGenerationTask?.stage ?? (this.pendingWorkerGeneration.size ? "worker" : null),
      generationWorker: { ...this.terrainGenerationPipeline.diagnostics(), staleResults: this.staleWorkerGeneration },
      lightingQueued: this.lightInitializationQueued.size + this.lightReconciliationQueued.size,
      lightingStage: this.activeLightInitialization?.task.phase ?? this.activeLightReconciliation?.task.phase ?? null,
      lightInitializationQueued: this.lightInitializationQueued.size,
      lightReconciliationQueued: this.lightReconciliationQueued.size,
      meshSectionsQueued: this.meshQueued.size + this.urgentMeshQueued.size + (this.activeMeshTask ? 1 : 0),
      activeMeshChunk: this.activeMeshTask?.key ?? null,
      activeMeshSection: this.activeMeshTask?.section ?? null,
      meshSliceProgress: this.activeMeshTask ? this.activeMeshTask.nextLocalX / CHUNK_SIZE : null,
      seamPresentationSections: this.seamPresentationPending.size,
      relightSectionsQueued: this.lightSectionQueued.size,
      consolidationLayersQueued: this.consolidationQueued.size,
      terrainWorker: {
        ...this.terrainBufferPipeline.diagnostics(),
        staleResults: this.staleConsolidations,
        coalescedRequests: this.coalescedConsolidations,
      },
      terrainSubmission: this.terrainSubmissionDiagnostics(),
      playerEdits: this.playerEditFeedbackDiagnostics(),
      generationBudget: this.generationWorkPerFrame,
      meshSliceBudget: this.meshWorkPerFrame,
      frameBudgetMilliseconds: this.streamingFrameBudgetMilliseconds,
      immediateRing: this.ringCompleteness(1),
      midRing: this.ringCompleteness(Math.min(4, this.renderDistance)),
      debt: this.streamingDebt(now),
      throughput: { ...this.streamingCompleted },
      canceled: { ...this.streamingCanceled },
      cache: {
        memory: this.chunkMemoryCache.diagnostics(),
        persistentSupported: this.chunkPersistentCache.supported,
        persistentHits: this.persistentCacheHits,
        persistentMisses: this.persistentCacheMisses,
        pendingReads: this.pendingPersistentChunks.size,
      },
      lookahead: { x: this.streamingLookaheadChunkX, z: this.streamingLookaheadChunkZ },
      lanes: {
        immediateRingReady: this.ringCompleteness(1).ratio,
        viewDirection: { x: this.streamingViewX, z: this.streamingViewZ, sector: this.streamingViewSector },
        reservedGenerationSlot: this.terrainGenerationPipeline.supported,
        consolidationReserveActive: this.renderDrawCallPressure >= 300
          || this.renderFramePressureMilliseconds >= 24
          || this.consolidationQueue.length >= 48,
      },
      readinessEpisodes: {
        completed: episodes.length,
        currentMilliseconds: currentUnreadyMilliseconds,
        p95Milliseconds: percentile(0.95),
        p99Milliseconds: percentile(0.99),
        maxMilliseconds: Math.max(currentUnreadyMilliseconds, episodes.at(-1) ?? 0),
      },
    };
  }

  dispose() {
    this.locationLoadEpoch += 1;
    this.disposeChunks();
    this.terrainBufferPipeline.dispose();
    this.terrainGenerationPipeline.dispose();
    this.atlas.dispose();
    for (const material of Object.values(this.materials)) material.dispose();
  }
}
