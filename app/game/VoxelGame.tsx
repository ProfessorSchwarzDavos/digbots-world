"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as THREE from "three";
import {
  BlockId,
  BLOCKS,
  BIOME_NAMES,
  CREATIVE_ITEMS,
  ITEMS,
  Item,
  MOB_DEFS,
  MOB_ORDER,
  RECIPES,
  VoxelEngine,
  isEditableKeyboardTarget,
  readSettings,
  type GameMode,
  type GameSettings,
  type HudState,
  type OrbMorphLoomHudState,
  type InventoryDragTarget,
  type InventorySlot,
  type ItemCode,
  type MobKind,
  type OverlayKind,
  type PlayerVariant,
  type Recipe,
  type RecipePlanResult,
} from "./engine";
import { BUTTERFLY_ORDER } from "./mobs";
import type { AgentCapability, AgentChatMessage, AgentSessionRecord, AgentTaskRecord, AgentWaypointRecord } from "./agent-platform";
import { createAgentBrowserBridge, type AgentBrowserBridge } from "./agent-bridge";
import type { BestiaryFieldNote, BestiaryNoteMetric, MobDefinition } from "./mobs";
import { creatureProfile } from "./creature-profiles";
import { captureKnowledgeForResearch } from "./creature-capture";
import { CREATURE_MOVES } from "./creature-moves";
import { statsAtLevel, statBand } from "./creature-stats";
import { CREATURE_TYPES } from "./creature-types";
import { normalizeCreatureCareState, type CreatureCareAction } from "./creature-care";
import type { CreatureProgressionV2 } from "./creature-progression";
import { MOUNT_PROFILES } from "./creature-mounts";
import { PRIME_FORM_PROFILES, PRIME_ROUTE_PROFILES, type PrimeEligibleKind } from "./creature-rarity";
import { creatureEcologyContract, normalizeCreatureWorkState, type CreatureShellModule } from "./creature-ecology";
import { createAvatarHeldItemModel } from "./held-items";
import { fallbackInventoryIconKind, itemPresentationFamily } from "./item-presentation";
import { legendaryContractForItem } from "./legendary-items";
import { captureOrbFromInventorySlot } from "./capture-orbs";
import {
  canAttuneCreature,
  creatureRehabilitationStage,
  creatureRelationshipPolicy,
  normalizeCreatureRelationship,
  preferredRelationshipFood,
} from "./creature-relationships";
import { BlockPlayerModel, type PlayerEquipmentAppearance } from "./player-model";
import { GAME_RELEASE_NAME, GAME_VERSION, GAME_VERSION_LABEL } from "./version";
import { WHEAT_MILL_CYCLE_SECONDS } from "./wheat-mill";
import { createBlockAtlas, GENERATOR_VERSION } from "./world";
import { TYPESCRIPT_UI_PREFERENCES_KEY } from "./edition";
import { collectPreviousEditionBackup, countPreviousEditionLocalStorageRecords } from "./previous-edition-backup";
import {
  DEFAULT_WORLD_OPTIONS,
  WORLD_OWNERSHIP_NOTICE,
  type WorldMetadata,
  type WorldOptions,
} from "./world-storage";
import { UniverseWorldStorage as WorldStorage } from "./universe-world-storage";
import { UniverseStorage } from "./universe-storage";
import {
  HobbitBankPanel,
  MapPanel,
  QuestPanel,
  SentientDialoguePanel,
  SettlementPanel,
  StationPanel,
  TradePanel,
  isResidentProfession,
  sentientPortraitPath,
} from "./HearthroadsPanels";
import { ALCHEMY_RECIPES, DISTILLERY_RECIPES } from "./alchemy";
import { SUGARWORKS_RECIPES, createSugarworks } from "./candyworks";
import { createBlueprintState } from "./blueprints";
import {
  createBankAccount,
  createGoldWallet,
  createMerchant,
  createStockMarket,
  type GoldAmount,
  type MerchantStack,
  type MerchantTradeDirection,
  type StockSymbol,
} from "./economy";
import {
  alignmentFor,
  createFactionRelations,
  FACTIONS,
  isNpcFactionId,
  NPC_FACTION_IDS,
  type FactionId,
  type NpcFactionId,
} from "./factions";
import { commerceItemCode, commerceKeyForItem, inventoryResourceCounts, playerCommerceItem } from "./hearthroads-adapter";
import { distributeInventoryCursor, inventorySlotStackLimit, inventorySlotsCanStack } from "./inventory-convenience";
import { ITEM_GUIDE_ENTRIES, itemGuideMatches, type ItemGuideProcess } from "./item-guide";
import { WIKI_CATEGORY_ORDER, WIKI_ENTRIES, wikiEntryMatches, type WikiCategory } from "./wiki-content";
import { ResourceTelemetryLog, telemetryFileName, type ResourceTelemetryReport, type ResourceTelemetryStopReason } from "./performance-log";
import { createMapKnowledge, type MapMarker } from "./map-system";
import { PLANTS, createPlantBestiaryState, nativeBiomesForPlant, plantForBlock, type PlantCategory, type PlantDefinition } from "./plants";
import { createQuestBook, type QuestObjective, type QuestSource } from "./quests";
import { createSettlementState, isMayorProfession, type ResidentProfession, type SettlementCandidate } from "./settlements";
import {
  DEFAULT_SETTLEMENT_ORIGIN_SEARCH_RADIUS,
  MAX_SETTLEMENT_ORIGIN_SEARCH_RADIUS,
} from "./settlement-index";
import { DragonPanel } from "./DragonPanel";
import { DragonMagicPanel, ManaHud, SpellWheelPanel } from "./DragonMagicPanels";
import { GolemForgePanel } from "./GolemForgePanel";
import type { GolemType } from "./v1-cultures";
import { createMagicState } from "./magic";
import {
  createSkillState,
  explorationMinimumMapZoom,
  explorationShowsDistantPoiLabels,
  explorationTracksAtAnyDistance,
} from "./skills";
import { MinimapHud, NavigationHud, StatusEffectsHud } from "./NavigationHud";
import { statusEffectViewsFromBuffs } from "./status-effects";
import { WaygridCreaturePanel, WaygridItemPanel } from "./WaygridPanels";
import { CharacterStudio } from "./CharacterStudio";
import { AquariumPanel } from "./AquariumPanel";
import { GuildPanel } from "./GuildPanel";
import { CardforgePanel } from "./CardforgePanel";
import { GUILDS, createGuildBook } from "./guilds";
import { createTcgPlayerState } from "./tcg/collection";
import { TCG_NPC_OPPONENTS } from "./tcg/match";
import { TCG_CATALOG_REVISION } from "./tcg/types";
import {
  CharacterProfileStore,
  FALLBACK_CHARACTER_CATALOG,
  FALLBACK_CHARACTER_PROFILE,
  type CharacterAppearance,
  type CharacterProfile,
  type CharacterProfileCatalog,
} from "./character-profiles";

type WorkstationOverlay = "apiary" | "morph-loom" | "orb-rack" | "healing-station" | "sugarworks" | "wheat-mill";
type CivicAuditMode = "atlantian-dialogue" | "atlantian-trade" | "atlantian-settlement";
type Overlay = "title" | "new" | "pause" | "help" | "settings" | OverlayKind | null;
type TitleMenuView = "main" | "characters" | "worlds";
export type BestiaryFilter = "all" | "surface" | "humanoids" | "rabbits" | "birds" | "butterflies" | "aquatic" | "sea-slugs" | "golems" | "monsters" | "companions";
type BestiaryQuickFilter = "all" | "discovered" | "captured";
export type BestiarySort = "catalog" | "name" | "observed" | "research" | "level" | "rarity";
type BestiaryPageTab = "overview" | "ecology" | "combat" | "care" | "research" | "specimens" | "variants";
type FieldGuideSection = "creatures" | "plants";
type ContextReferenceTarget = Readonly<{
  item: ItemCode;
  field?: Readonly<{ kind: "creature"; id: MobKind } | { kind: "plant"; id: string }>;
}>;
export const BESTIARY_FACET_KEYS = ["habitat", "type", "relationship", "movement", "temperament", "research", "rarity", "utility", "guild"] as const;
export type BestiaryFacetKey = (typeof BESTIARY_FACET_KEYS)[number];
export type BestiaryFacetSelections = Readonly<Record<BestiaryFacetKey, readonly string[]>>;
export type BestiaryFacetRecord = Readonly<{
  id: string;
  name: string;
  catalogIndex: number;
  lastObservedAt: number | null;
  researchCompletion: number;
  creatureLevel: number;
  rarityRank: number;
  facets: Readonly<Record<BestiaryFacetKey, readonly string[]>>;
}>;
type BestiaryFacetChip = Readonly<{ facet: BestiaryFacetKey; value: string; label: string }>;
type InventoryDragGesture = {
  pointerId: number;
  button: "left" | "right";
  targets: InventoryDragTarget[];
  keys: Set<string>;
};
type PetCommand = NonNullable<HudState["activePet"]>["command"];

const PLANT_FILTERS: ReadonlyArray<["all" | PlantCategory, string]> = [
  ["all", "All plants"],
  ["tree", "Trees"],
  ["farm", "Farm"],
  ["bush", "Bushes"],
  ["flower", "Flowers"],
  ["aquatic", "Aquatic"],
  ["wild", "Wild"],
];

const BESTIARY_FACET_LABELS: Readonly<Record<BestiaryFacetKey, string>> = Object.freeze({
  habitat: "Habitat",
  type: "Type",
  relationship: "Relationship",
  movement: "Movement",
  temperament: "Temperament",
  research: "Research",
  rarity: "Rarity & form",
  utility: "Utility role",
  guild: "Guild relevance",
});

const BESTIARY_GUILD_LABELS: Readonly<Record<string, string>> = Object.freeze({
  waykeeper: "Waykeeper Conservancy",
  tideglass: "Tideglass Menagerie",
  moonbough: "Moonbough Arcanum",
  brassroot: "Brassroot Freeblades",
  deepgear: "Deepgear Delvers' Union",
  hearthroad: "Hearthroad League",
  "sugarcourt-makers": "Sugarcourt Makers",
});

export function createEmptyBestiaryFacetSelections(): BestiaryFacetSelections {
  return Object.freeze(Object.fromEntries(BESTIARY_FACET_KEYS.map((facet) => [facet, Object.freeze([])])) as unknown as Record<BestiaryFacetKey, readonly string[]>);
}

export function toggleBestiaryFacetValue(selections: BestiaryFacetSelections, facet: BestiaryFacetKey, value: string): BestiaryFacetSelections {
  const current = selections[facet];
  const next = current.includes(value) ? current.filter((candidate) => candidate !== value) : [...current, value];
  return Object.freeze({ ...selections, [facet]: Object.freeze(next) });
}

/** OR within a facet, AND between facets. `ignoreFacet` drives contextual counts. */
export function matchesBestiaryFacets(record: BestiaryFacetRecord, selections: BestiaryFacetSelections, ignoreFacet?: BestiaryFacetKey) {
  return BESTIARY_FACET_KEYS.every((facet) => facet === ignoreFacet || selections[facet].length === 0
    || selections[facet].some((value) => record.facets[facet].includes(value)));
}

export function filterBestiaryFacetRecords(records: readonly BestiaryFacetRecord[], selections: BestiaryFacetSelections) {
  return records.filter((record) => matchesBestiaryFacets(record, selections));
}

export function bestiaryFacetOptionCounts(
  records: readonly BestiaryFacetRecord[],
  selections: BestiaryFacetSelections,
  facet: BestiaryFacetKey,
  options: readonly string[],
) {
  const context = records.filter((record) => matchesBestiaryFacets(record, selections, facet));
  return Object.freeze(Object.fromEntries(options.map((option) => [option, context.filter((record) => record.facets[facet].includes(option)).length])) as Record<string, number>);
}

export function sortBestiaryFacetRecords(records: readonly BestiaryFacetRecord[], sort: BestiarySort) {
  return [...records].sort((left, right) => {
    if (sort === "name") return left.name.localeCompare(right.name) || left.catalogIndex - right.catalogIndex;
    if (sort === "observed") return (right.lastObservedAt ?? -1) - (left.lastObservedAt ?? -1) || left.catalogIndex - right.catalogIndex;
    if (sort === "research") return right.researchCompletion - left.researchCompletion || left.catalogIndex - right.catalogIndex;
    if (sort === "level") return right.creatureLevel - left.creatureLevel || left.catalogIndex - right.catalogIndex;
    if (sort === "rarity") return right.rarityRank - left.rarityRank || left.catalogIndex - right.catalogIndex;
    return left.catalogIndex - right.catalogIndex;
  });
}

const SENTIENT_FACTION_COPY: Readonly<Record<NpcFactionId, Readonly<{
  fallbackName: string;
  greeting: string;
  settlementChoice: string;
  settlementChoiceDescription: string;
}>>> = {
  hobbits: {
    fallbackName: "Hearthkin Neighbor",
    greeting: "Come in from the road. There is always room by a warm hearth.",
    settlementChoice: "Ask about this town",
    settlementChoiceDescription: "Find its mayor, tradespeople, gates, and residents.",
  },
  goblins: {
    fallbackName: "Brassroot Neighbor",
    greeting: "State your business plainly, traveler, and we will get along.",
    settlementChoice: "Ask about this clanhold",
    settlementChoiceDescription: "Find its Roadboss, workshops, gates, and residents.",
  },
  atlantians: {
    fallbackName: "Lumen Currentkeeper",
    greeting: "Breathe slowly, surface-friend. The tidemoot has light enough to guide you home.",
    settlementChoice: "Ask about this tidemoot",
    settlementChoiceDescription: "Find its Tidewarden, reefworkers, glowmenders, and open current lanes.",
  },
  sugarcourt: {
    fallbackName: "Sugarcourt Neighbor",
    greeting: "Mind the warm syrup, traveler. A careful sweetmaker always leaves room at the counter.",
    settlementChoice: "Ask about this borough",
    settlementChoiceDescription: "Find its Crown Confectioner, Candysmiths, kennels, gates, and Sugarworks.",
  },
  "wood-elves": {
    fallbackName: "Moonbough Neighbor",
    greeting: "Walk softly beneath the glimmerleaves, traveler. The grove remembers every kind footfall.",
    settlementChoice: "Ask about this enclave",
    settlementChoiceDescription: "Find its Elderweaver, Leafwardens, moonwell, library, and living gardens.",
  },
  dwarves: {
    fallbackName: "Deepgear Neighbor",
    greeting: "Mind the rail and follow the lanterns. The mountain rewards careful hands.",
    settlementChoice: "Ask about this hold",
    settlementChoiceDescription: "Find its Thane, gatewardens, delvers, golem forge, and powderworks.",
  },
};

const SETTLEMENT_DISPLAY_NAMES: Readonly<Record<FactionId, string>> = {
  player: "Wayfarer Holding",
  hobbits: "Hearthkin Freehold",
  goblins: "Brassroot Clanhold",
  atlantians: "Lumen Tidemoot",
  sugarcourt: "Bonbon Borough",
  "wood-elves": "Moonbough Enclave",
  dwarves: "Deepgear Hold",
};

export function sentientProfession(value: unknown, factionId: NpcFactionId): ResidentProfession {
  if (isResidentProfession(value)) return value;
  return factionId === "atlantians" ? "atlantian-tidewarden"
    : factionId === "sugarcourt" ? "sugarcourt-crown-confectioner"
      : factionId === "wood-elves" ? "wood-elf-elderweaver"
        : factionId === "dwarves" ? "dwarf-thane"
      : "general";
}

const ATLANTIAN_UI_AUDIT_CANDIDATE: SettlementCandidate = {
  schema: 1,
  id: "tidehold-ui-audit",
  worldSeed: "TIDELIGHT-UI",
  regionX: 0,
  regionZ: 0,
  center: { x: 0, y: -26, z: 0 },
  size: "hamlet",
  factionId: "atlantians",
  biome: "lumen-trench",
  environment: "underwater",
  floorY: -28,
};
const ATLANTIAN_UI_AUDIT_SETTLEMENT = createSettlementState("ui-audit", ATLANTIAN_UI_AUDIT_CANDIDATE);
const ATLANTIAN_UI_AUDIT_MERCHANT = createMerchant("ui-audit", "ui-audit-pearlbroker", "atlantians", "atlantian-pearlbroker", 420);
const ATLANTIAN_UI_AUDIT_WALLET = createGoldWallet("ui-audit", "ui-audit-player", 800);

type MultiplayerPeerView = {
  token?: string;
  id?: string;
  name?: string;
  identity?: { id?: string; name?: string; peerKind?: "human" | "agent" } | null;
  state?: string;
  latencyMs?: number | null;
};

type MultiplayerViewState = {
  supported: boolean;
  reasons: string[];
  status: string;
  role: "host" | "guest" | null;
  peers: MultiplayerPeerView[];
  inviteCode: string;
  answerCode: string;
  roomCode: string;
  rendezvousStatus: "opening" | "waiting" | "retrying" | "exchanging" | "connected" | "closed" | "error" | "idle";
  error: string | null;
  agents: AgentSessionRecord[];
  chat: AgentChatMessage[];
  newestChatSequence: number;
  agentTasks: AgentTaskRecord[];
  agentWaypoints: AgentWaypointRecord[];
};

export function multiplayerViewStatesEqual(left: MultiplayerViewState, right: MultiplayerViewState) {
  if (left.supported !== right.supported
    || left.status !== right.status
    || left.role !== right.role
    || left.inviteCode !== right.inviteCode
    || left.answerCode !== right.answerCode
    || left.roomCode !== right.roomCode
    || left.rendezvousStatus !== right.rendezvousStatus
    || left.error !== right.error
    || left.newestChatSequence !== right.newestChatSequence
    || left.reasons.length !== right.reasons.length
    || left.peers.length !== right.peers.length
    || left.agents.length !== right.agents.length
    || left.chat.length !== right.chat.length
    || left.agentTasks.length !== right.agentTasks.length
    || left.agentWaypoints.length !== right.agentWaypoints.length) return false;
  if (left.reasons.some((reason, index) => reason !== right.reasons[index])) return false;
  const peersEqual = left.peers.every((peer, index) => {
    const other = right.peers[index];
    return peer.token === other.token
      && peer.id === other.id
      && peer.name === other.name
      && peer.identity?.id === other.identity?.id
      && peer.identity?.name === other.identity?.name
      && peer.state === other.state
      && peer.latencyMs === other.latencyMs;
  });
  if (!peersEqual) return false;
  const agentsEqual = left.agents.every((agent, index) => {
    const other = right.agents[index];
    return agent.agentId === other.agentId
      && agent.status === other.status
      && agent.muted === other.muted
      && agent.updatedAt === other.updatedAt
      && agent.granted.join("|") === other.granted.join("|");
  });
  if (!agentsEqual) return false;
  if (left.agentTasks.some((task, index) => {
    const other = right.agentTasks[index];
    return task.id !== other.id || task.updatedAt !== other.updatedAt || task.status !== other.status || task.note !== other.note;
  })) return false;
  return !left.agentWaypoints.some((waypoint, index) => {
    const other = right.agentWaypoints[index];
    return waypoint.id !== other.id || waypoint.name !== other.name || waypoint.position.x !== other.position.x || waypoint.position.y !== other.position.y || waypoint.position.z !== other.position.z;
  });
}

type MultiplayerActionResult = string | { inviteCode?: string; answerCode?: string } | void;

type MultiplayerEngineApi = {
  getMultiplayerState?: () => Partial<MultiplayerViewState>;
  hostMultiplayer?: (playerName: string) => MultiplayerActionResult | Promise<MultiplayerActionResult>;
  joinMultiplayer?: (inviteCode: string, playerName: string) => MultiplayerActionResult | Promise<MultiplayerActionResult>;
  acceptMultiplayerAnswer?: (answerCode: string) => void | Promise<void>;
  createMultiplayerRoom?: (roomCode: string, playerName: string) => Promise<{ roomCode: string }>;
  joinMultiplayerRoom?: (roomCode: string, playerName: string) => Promise<{ hostName: string; seed?: string; worldReady?: boolean }>;
  suggestMultiplayerRoomCode?: () => string;
  disconnectMultiplayer?: () => void | Promise<void>;
  downloadMultiplayerDiagnostics?: () => unknown;
  approveAgent?: (agentId: string, grants?: readonly AgentCapability[]) => boolean;
  setAgentCapability?: (agentId: string, capability: AgentCapability, granted: boolean) => boolean;
  pauseAgent?: (agentId: string) => boolean;
  resumeAgent?: (agentId: string) => boolean;
  revokeAgent?: (agentId: string) => boolean;
  muteAgent?: (agentId: string, muted: boolean) => boolean;
  setLocalAgentVoiceMuted?: (agentId: string, muted: boolean) => void;
  isLocalAgentVoiceMuted?: (agentId: string) => boolean;
  setLocalAgentVoiceGain?: (agentId: string, gain: number) => void;
  getLocalAgentVoiceGain?: (agentId: string) => number;
  stopAgent?: (agentId: string) => boolean;
  getAgentInventory?: (agentId: string) => Array<InventorySlot | null>;
  updateAgentTaskFromHost?: (taskId: string, input: Readonly<{ status?: AgentTaskRecord["status"]; note?: string; title?: string }>) => boolean;
  removeAgentTaskFromHost?: (taskId: string) => boolean;
  removeAgentWaypointFromHost?: (waypointId: string) => boolean;
  sendMultiplayerChat?: (text: string, channel?: "local" | "party" | "global") => boolean;
};

type WorkstationEngineApi = {
  machineClick?: (machine: WorkstationOverlay, index: number, button: "left" | "right", shift?: boolean) => void;
  toggleApiaryQueenDisplay?: () => boolean;
  startActiveOrbMorph?: () => boolean;
  cancelActiveOrbMorph?: () => boolean;
};

/**
 * The Hearthroads simulation deliberately stays engine-owned.  This narrow UI
 * surface lets the panels remain useful while individual authority-checked
 * mutations are added without coupling React to engine internals.
 */
type HearthroadsEngineApi = {
  acceptQuestById?: (questId: string) => boolean;
  pinQuestById?: (questId: string | null) => void;
  abandonQuestById?: (questId: string) => boolean;
  turnInQuestById?: (questId: string) => boolean;
  trackQuestTurnIn?: (questId: string) => string | null;
  addManualMapMarker?: (name: string) => string;
  removeMapMarker?: (markerId: string) => boolean;
  renameWayshrineMarker?: (markerId: string, name: string) => boolean;
  requestFastTravel?: (markerId: string) => boolean;
  startStationBatch?: (machine: "alchemy" | "distillery" | "sugarworks", recipeId: string) => boolean;
  collectStationOutput?: (machine: "alchemy" | "distillery" | "sugarworks") => boolean;
  tradeWithActiveMerchant?: (direction: MerchantTradeDirection, itemKey: string, quantity: number) => boolean;
  depositGold?: (amount: GoldAmount) => boolean;
  withdrawGold?: (amount: GoldAmount) => boolean;
  buyStockShares?: (symbol: StockSymbol, shares: GoldAmount) => boolean;
  sellStockShares?: (symbol: StockSymbol, shares: GoldAmount) => boolean;
  setSettlementRoleWaypoint?: (profession: ResidentProfession) => boolean;
  setNearestFactionTownWaypoint?: () => string | null;
  selectSettlementResident?: (residentId: string) => string | null;
  shareCartographyMaps?: () => boolean;
  commandActiveFollower?: (command: string) => boolean;
  hireResidentFromMayor?: (residentId: string) => boolean;
  renameActiveHireling?: (name: string) => boolean;
  claimActiveSettlement?: () => boolean;
};

const EMPTY_MULTIPLAYER_STATE: MultiplayerViewState = {
  supported: false,
  reasons: [],
  status: "idle",
  role: null,
  peers: [],
  inviteCode: "",
  answerCode: "",
  roomCode: "",
  rendezvousStatus: "idle",
  error: null,
  agents: [],
  chat: [],
  newestChatSequence: 0,
  agentTasks: [],
  agentWaypoints: [],
};

type ApiaryBeeHud = { alive?: boolean; home?: boolean; id?: string; name?: string };
export type ApiaryHudState = {
  queen?: boolean | ApiaryBeeHud | null;
  queenPresent?: boolean;
  queenName?: string;
  workers?: readonly ApiaryBeeHud[];
  workerCount?: number;
  maxWorkers?: number;
  nectar?: number;
  nectarStatus?: string;
  honey?: number;
  honeyMax?: number;
  royalJelly?: number;
  royalJellyMax?: number;
  productionProgress?: number;
  workerGrowthProgress?: number;
  queenDisplayEnabled?: boolean;
  queenDisplayAvailable?: boolean;
  honeyClock?: number;
  honeyCycleSeconds?: number;
  slots?: readonly (InventorySlot | null)[];
};

export type OrbRackHudState = {
  slots?: readonly (InventorySlot | null)[];
};

export type HealingStationHudState = OrbRackHudState & {
  gelUnits?: number;
  gelFuelSeconds?: number;
  gelFuelMaxSeconds?: number;
  fuelActive?: boolean;
  healClock?: number;
  healIntervalSeconds?: number;
  healingProgress?: readonly number[];
};

type ExtendedHudState = HudState & {
  activeApiary?: ApiaryHudState | null;
  activeOrbRack?: OrbRackHudState | null;
  activeHealingStation?: HealingStationHudState | null;
};

export type ApiaryUiState = {
  queenPresent: boolean;
  queenName: string;
  workerCount: number;
  maxWorkers: number;
  nectarStatus: string;
  honey: number;
  honeyMax: number;
  royalJelly: number;
  royalJellyMax: number;
  productionProgress: number;
  workerGrowthProgress: number;
  queenDisplayEnabled: boolean;
  queenDisplayAvailable: boolean;
  slots: Array<InventorySlot | null>;
};

const finiteNumber = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const boundedInteger = (value: unknown, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, Math.floor(finiteNumber(value, minimum))));
const normalizedProgress = (value: unknown) => {
  const numeric = finiteNumber(value);
  return Math.min(1, Math.max(0, numeric > 1 ? numeric / 100 : numeric));
};

export function normalizeApiaryUiState(state?: ApiaryHudState | null): ApiaryUiState {
  const queen = state?.queen;
  const queenRecord = queen && typeof queen === "object" ? queen : null;
  const queenPresent = state?.queenPresent ?? (queen === true || Boolean(queenRecord && queenRecord.alive !== false));
  const livingWorkers = state?.workers?.filter((worker) => worker.alive !== false) ?? [];
  const maxWorkers = boundedInteger(state?.maxWorkers ?? 8, 1, 8);
  const workerCount = boundedInteger(state?.workerCount ?? livingWorkers.length, 0, maxWorkers);
  const awayWorkers = livingWorkers.filter((worker) => worker.home === false).length;
  const nectar = Math.max(0, finiteNumber(state?.nectar));
  const nectarStatus = state?.nectarStatus?.trim()
    || (!queenPresent ? "Awaiting a queen"
      : workerCount === 0 ? "Awaiting worker bees"
        : awayWorkers > 0 ? `${awayWorkers} foraging · nectar return pending`
          : nectar > 0 ? "Workers home · nectar returned"
            : "Workers home · awaiting daylight");
  const honeyMax = boundedInteger(state?.honeyMax ?? 12, 1, 12);
  const royalJellyMax = boundedInteger(state?.royalJellyMax ?? 12, 1, 12);
  const honey = boundedInteger(state?.honey, 0, honeyMax);
  const royalJelly = boundedInteger(state?.royalJelly, 0, royalJellyMax);
  const fallbackProgress = finiteNumber(state?.honeyClock) / Math.max(1, finiteNumber(state?.honeyCycleSeconds, 180));
  return {
    queenPresent,
    queenName: state?.queenName?.trim() || queenRecord?.name?.trim() || (queenPresent ? "Resident Queen" : "No Queen"),
    workerCount,
    maxWorkers,
    nectarStatus,
    honey,
    honeyMax,
    royalJelly,
    royalJellyMax,
    productionProgress: normalizedProgress(state?.productionProgress ?? fallbackProgress),
    workerGrowthProgress: normalizedProgress(state?.workerGrowthProgress),
    queenDisplayEnabled: state?.queenDisplayEnabled === true,
    queenDisplayAvailable: state?.queenDisplayAvailable === true,
    slots: Array.from({ length: 11 }, (_, index) => state?.slots?.[index] ?? null),
  };
}

export type OrbSlotUiState = {
  hasOrb: boolean;
  occupied: boolean;
  kind: MobKind | null;
  name: string;
  health: number;
  maxHealth: number;
  healthProgress: number;
  hostile: boolean;
  baby: boolean;
  tamed: boolean;
  fullyHealed: boolean;
};

const isKnownMobKind = (value: unknown): value is MobKind => typeof value === "string" && Object.prototype.hasOwnProperty.call(MOB_DEFS, value);

export function captureOrbUiState(slot: InventorySlot | null | undefined): OrbSlotUiState {
  const orb = captureOrbFromInventorySlot(slot);
  const creature = orb?.creature;
  const metadata = slot?.metadata;
  const kindValue = creature?.kind ?? metadata?.species ?? metadata?.kind ?? metadata?.mobKind;
  const kind = isKnownMobKind(kindValue) ? kindValue : null;
  const hasOrb = slot?.item === Item.CaptureOrb;
  const occupied = Boolean(creature || kind || (hasOrb && (typeof metadata?.name === "string" || typeof metadata?.species === "string")));
  const health = Math.max(0, finiteNumber(creature?.health ?? metadata?.health));
  const maxHealth = Math.max(0, finiteNumber(creature?.maxHealth ?? metadata?.maxHealth));
  const definition = kind ? MOB_DEFS[kind] : null;
  const metadataName = typeof metadata?.name === "string" ? metadata.name.trim() : "";
  const name = creature?.name?.trim() || metadataName || definition?.name || (occupied ? "Unknown Specimen" : hasOrb ? "Ready Capture Orb" : "Empty Rack");
  return {
    hasOrb,
    occupied,
    kind,
    name,
    health,
    maxHealth,
    healthProgress: maxHealth > 0 ? Math.min(1, health / maxHealth) : 0,
    hostile: creature?.hostile ?? (metadata?.hostile === true),
    baby: creature?.baby ?? (metadata?.baby === true),
    tamed: creature?.tamed ?? (metadata?.tamed === true),
    fullyHealed: occupied && maxHealth > 0 && health >= maxHealth,
  };
}

export function healingProgressForOrb(slot: InventorySlot | null | undefined, state: HealingStationHudState | null | undefined, index: number) {
  const specimen = captureOrbUiState(slot);
  if (!specimen.occupied) return 0;
  if (specimen.fullyHealed) return 1;
  const explicit = state?.healingProgress?.[index];
  if (explicit !== undefined) return normalizedProgress(explicit);
  return normalizedProgress(finiteNumber(state?.healClock) / Math.max(1, finiteNumber(state?.healIntervalSeconds, 20)));
}

function workstationAuditOrb(kind: MobKind, name: string, health: number, maxHealth: number): InventorySlot {
  const definition = MOB_DEFS[kind];
  return {
    item: Item.CaptureOrb,
    count: 1,
    metadata: {
      name,
      species: kind,
      hostile: definition.hostile,
      health,
      maxHealth,
      captureOrb: JSON.stringify({
        schema: 1,
        orbId: `audit-${kind}`,
        capturedAt: 1,
        creature: {
          schema: 1,
          entityId: `audit-${kind}`,
          kind,
          health,
          maxHealth,
          ageTicks: 1200,
          baby: false,
          temperament: definition.temperament,
          hostile: definition.hostile,
          tamed: kind === "peelop",
          ownerId: kind === "peelop" ? "audit-player" : null,
          name,
          geneticSeed: 42,
          command: kind === "peelop" ? "follow" : null,
          custom: {},
        },
      }),
    },
  };
}

function workstationAuditMorphLoom(): OrbMorphLoomHudState {
  const inputSlot = workstationAuditOrb("mossling", "Mallow", MOB_DEFS.mossling.health, MOB_DEFS.mossling.health);
  const inputOrb = captureOrbFromInventorySlot(inputSlot)!;
  return {
    schema: 2,
    selectedRecipeId: "mossling-to-moonbrawn",
    inputOrb,
    outputOrb: null,
    moonberries: 7,
    starCrystals: 2,
    legacyRoyalJelly: 0,
    activeJob: { recipeId: "mossling-to-moonbrawn", progressSeconds: 21, durationSeconds: 48, startedAt: 1 },
    completedMorphs: 4,
    inputSlot,
    outputSlot: null,
    progress: 21 / 48,
  };
}

export const INITIAL_GAME_SETTINGS: Readonly<GameSettings> = Object.freeze({
  volume: 0.55,
  musicVolume: 0.72,
  muted: false,
  sensitivity: 0.0022,
  fov: 72,
  weather: "clear",
  renderDistance: 10,
  simulationDistance: 8,
  basicRenderDistance: 20,
  showFps: false,
  showMinimap: false,
  showBreakingTexture: true,
  showBreakProgress: false,
  showToolEffectiveness: true,
  debugTelemetry: false,
  debugTelemetryMaxMinutes: 60,
  resourceMode: "auto",
  agentVoiceMode: "spatial",
});

export function initialHydrationSettings(): GameSettings {
  return { ...INITIAL_GAME_SETTINGS };
}

function downloadResourceTelemetryReport(report: ResourceTelemetryReport) {
  if (typeof document === "undefined" || typeof URL === "undefined") return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = telemetryFileName();
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export type TouchControlsMode = "auto" | "off" | "on";
export type PrimaryPointerKind = "unknown" | "mouse" | "pen" | "touch";
export type InputCapabilities = {
  coarsePrimary: boolean;
  hoverNone: boolean;
  anyFine: boolean;
  primaryPointer: PrimaryPointerKind;
};
export type UiPreferences = {
  touchControls: TouchControlsMode;
  targetOutlineOpacity: number;
  showReferenceHints: boolean;
};

export const INITIAL_UI_PREFERENCES: Readonly<UiPreferences> = Object.freeze({
  touchControls: "auto",
  targetOutlineOpacity: 0.9,
  showReferenceHints: true,
});

const UI_PREFERENCES_KEY = TYPESCRIPT_UI_PREFERENCES_KEY;
const INITIAL_INPUT_CAPABILITIES: Readonly<InputCapabilities> = Object.freeze({
  coarsePrimary: false,
  hoverNone: false,
  anyFine: true,
  primaryPointer: "unknown",
});

export function sanitizeUiPreferences(value: unknown): UiPreferences {
  const parsed = value && typeof value === "object" ? value as Partial<UiPreferences> : {};
  const touchControls = parsed.touchControls === "off" || parsed.touchControls === "on" ? parsed.touchControls : "auto";
  const rawOpacity = Number(parsed.targetOutlineOpacity ?? INITIAL_UI_PREFERENCES.targetOutlineOpacity);
  const targetOutlineOpacity = Number.isFinite(rawOpacity) ? Math.min(1, Math.max(0.05, rawOpacity)) : INITIAL_UI_PREFERENCES.targetOutlineOpacity;
  const showReferenceHints = parsed.showReferenceHints !== false;
  return { touchControls, targetOutlineOpacity, showReferenceHints };
}

export function resolveTouchControls(mode: TouchControlsMode, capabilities: InputCapabilities) {
  if (mode === "on") return true;
  if (mode === "off") return false;
  if (capabilities.primaryPointer === "touch") return true;
  if (capabilities.primaryPointer === "mouse" || capabilities.primaryPointer === "pen") return false;
  // Hybrid laptops often advertise a coarse primary touchscreen even while a
  // mouse is available. Do not cover their desktop HUD before the player has
  // actually used touch; pure touch devices still opt in immediately.
  return !capabilities.anyFine && (capabilities.coarsePrimary || capabilities.hoverNone);
}

/** Prevent the pointer event that opened a container from landing on a slot. */
export function slotInteractionAllowed(readyAt: number, now = performance.now()) {
  return now >= readyAt;
}

export function shouldCloseSpellWheelOnKeyRelease(code: string, overlay: Overlay) {
  return code === "KeyQ" && overlay === "spell-wheel";
}

export function shouldCloseItemGuideOnEscape(code: string, itemGuideOpen: boolean) {
  return code === "Escape" && itemGuideOpen;
}

export type SingleFlightGate = { current: Promise<unknown> | null };

export async function runSingleFlight<T>(gate: SingleFlightGate, operation: () => Promise<T>) {
  if (gate.current) return { started: false as const };
  const flight = Promise.resolve().then(operation);
  gate.current = flight;
  try {
    return { started: true as const, value: await flight };
  } finally {
    if (gate.current === flight) gate.current = null;
  }
}

export function formatMultiplayerError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/user[- ]initiated.*(?:abort|close)|(?:abort|close).*called|session (?:changed|closed)|setup was cancelled/iu.test(message)) {
    return "That connection attempt was cancelled safely because the session changed. Keep the host room open, then try the invite code again.";
  }
  if (/missing local offer description/iu.test(message)) {
    return "The host connection restarted before its offer finished. Keep the host room open, then try Join again.";
  }
  if (/no host|no .*answered|peer .*unavailable/iu.test(message)) {
    return "No host is visible for that code yet. Check the code, leave the host room open, and try again.";
  }
  if (/timed? ?out/iu.test(message)) {
    return "The host did not finish the secure exchange in time. Keep the room open and try Join again.";
  }
  return message;
}

export function clearFirstPersonHeldPresentation(engine: VoxelEngine) {
  for (const child of [...engine.heldRoot.children]) {
    engine.disposeObject(child);
    engine.heldRoot.remove(child);
  }
  engine.heldRoot.visible = false;
  for (const child of [...(engine.offhandRoot?.children ?? [])]) {
    engine.disposeObject(child);
    engine.offhandRoot?.remove(child);
  }
  if (engine.offhandRoot) engine.offhandRoot.visible = false;
  engine.heldItemCode = engine.selectedSlot()?.item ?? -1;
  if ("offhandItemCode" in engine) engine.offhandItemCode = engine.offhand?.item ?? -1;
}

export function prepareFirstPersonHeldPresentation(engine: VoxelEngine) {
  engine.heldItemCode = -1;
  if ("offhandItemCode" in engine) engine.offhandItemCode = -1;
  engine.heldRoot.visible = true;
  if (engine.offhandRoot) engine.offhandRoot.visible = true;
}

export function normalizeMultiplayerRoomCode(value: string) {
  return value.toLocaleUpperCase().replace(/[^A-Z0-9-]/gu, "").replace(/-{2,}/gu, "-").slice(0, 24);
}

type HeldStackPositionTarget = {
  style: Pick<CSSStyleDeclaration, "left" | "top" | "transform">;
};

export function createHeldStackPositionController(
  scheduleFrame: (callback: () => void) => number,
  cancelFrame: (frame: number) => void,
) {
  let target: HeldStackPositionTarget | null = null;
  let scheduledFrame: number | null = null;
  let x = 0;
  let y = 0;
  const apply = () => {
    scheduledFrame = null;
    if (!target) return;
    target.style.left = "0px";
    target.style.top = "0px";
    target.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-18px, -18px)`;
  };
  const cancelScheduledFrame = () => {
    if (scheduledFrame === null) return;
    cancelFrame(scheduledFrame);
    scheduledFrame = null;
  };
  return {
    attach(next: HeldStackPositionTarget | null) {
      cancelScheduledFrame();
      target = next;
      apply();
    },
    seed(nextX: number, nextY: number) {
      x = nextX;
      y = nextY;
    },
    track(nextX: number, nextY: number, active: boolean) {
      if (!active) return false;
      x = nextX;
      y = nextY;
      if (target && scheduledFrame === null) scheduledFrame = scheduleFrame(apply);
      return true;
    },
    dispose() {
      cancelScheduledFrame();
      target = null;
    },
  };
}

const formatPlayTime = (milliseconds: number) => {
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  if (minutes < 60) return `${minutes}m played`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m played`;
};

const formatWorldDate = (timestamp: number | null) => timestamp
  ? new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  : "Never played";

const gameModeLabel = (mode: GameMode) => mode === "builder" ? "Creative" : "Survival";

/** Compact combat readout: precise to hundredths without noisy zeroes. */
export function formatHudHealth(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(Math.max(0, value) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/u, "").replace(/\.$/u, "");
}

const blankSlots = (count: number) => Array.from({ length: count }, () => null as InventorySlot | null);

const INITIAL_HUD: ExtendedHudState = {
  health: 10,
  hunger: 10,
  xp: 0,
  level: 0,
  inventory: blankSlots(36),
  cursor: null,
  trash: null,
  craftGrid: blankSlots(9),
  craftOutput: null,
  craftingSize: 2,
  activeFurnace: null,
  activeWheatMill: null,
  activeChest: null,
  activeChestTitle: "Wildwood Chest",
  equipment: { head: null, chest: null, legs: null, feet: null },
  offhand: null,
  shieldRaised: false,
  armor: 0,
  bestiary: Object.fromEntries(MOB_ORDER.map((kind) => [kind, { seen: false, kills: 0, captures: 0 }])) as HudState["bestiary"],
  selected: 0,
  targetName: null,
  targetCollectible: true,
  targetMob: null,
  breakProgress: 0,
  day: 1,
  clock: "8:00 AM",
  biome: "Flower Meadow",
  depth: "Surface",
  coordinates: [0, 0, 0],
  mapHeading: 0,
  mapPlayers: [],
  debug: false,
  lighting: { sky: 15, red: 0, green: 0, blue: 0, skyVisibility: 1, subterraneanBlend: 0, queuedSections: 0, derivedBytes: 0 },
  mode: "survival",
  weather: "clear",
  loadedChunks: 9,
  queuedChunks: 0,
  fullscreen: false,
  cameraMode: "first",
  crouching: false,
  sprinting: false,
  flying: false,
  onlinePlayers: 1,
  playerVariant: "male",
  oxygen: 12,
  maxOxygen: 12,
  submerged: false,
  averageFps: 60,
  simulationDistance: 8,
  weatherKind: "clear",
  activePet: null,
  activeCampOrbId: null,
  mountedBoat: false,
  mountedCreature: false,
  mapKnowledge: createMapKnowledge("preview", "local"),
  questBook: createQuestBook(),
  questDefinitions: [],
  blueprints: createBlueprintState(),
  plantBestiary: createPlantBestiaryState(),
  activeAlchemy: null,
  activeAlchemyHasWaterSource: false,
  activeDistillery: null,
  activeSugarworks: null,
  goldWallet: createGoldWallet("preview", "local"),
  factionRelations: createFactionRelations("preview"),
  settlements: [],
  activeSettlementId: null,
  activeMerchant: null,
  activeAquarium: null,
  bankAccount: createBankAccount("preview", "local"),
  stockMarket: createStockMarket("preview", "local", "WILDERNESS"),
  potionBuffs: {},
  fastTravelChannel: null,
  rangedWeapon: null,
  activeDragon: null,
  magic: createMagicState(),
  skills: createSkillState(),
  spellWheelOpen: false,
  guildBook: createGuildBook(),
  cardforge: {
    catalogRevision: TCG_CATALOG_REVISION,
    player: createTcgPlayerState("local"),
    packBatches: [],
    lastPackReveal: null,
    merchant: null,
    activeMatch: null,
    opponents: TCG_NPC_OPPONENTS,
    challenges: [],
    trades: [],
    peers: [],
    settlementName: null,
    challengerStatus: "Visit a generated settlement to find Waytable challengers.",
    recoveryIssues: [],
  },
};

export function itemIconKind(item: ItemCode) {
  const definition = ITEMS[item];
  if (item === Item.StarrootScepter) return "scepter";
  if (definition?.toolKind) return `tool-${definition.toolKind}`;
  if (definition?.equipmentSlot && definition.dragonType && ["fire", "ice", "steel"].includes(definition.dragonType)) return `dragon-player-${definition.dragonType}-${definition.equipmentSlot}`;
  if (definition?.equipmentSlot) return `armor-${definition.equipmentSlot}`;
  if (definition?.useKind === "hoe") return "hoe";
  if (definition?.useKind === "scythe") return "scythe";
  if (definition?.useKind === "spell-tome") return "tome";
  switch (item) {
    case BlockId.CraftingTable: return "crafting-table";
    case BlockId.CrystalBlock: return "star-crystal-block";
    case BlockId.Torch: return "torch";
    case BlockId.RedFlower: return "world-flora-red";
    case BlockId.BlueFlower: return "world-flora-blue";
    case BlockId.Sunpetal: return "world-flora-sun";
    case BlockId.MoonOrchid: return "world-flora-moon";
    case BlockId.Cactus: return "cactus";
    case BlockId.DesertShrub: return "shrub";
    case BlockId.BananaPlant: return "banana-plant";
    case BlockId.ButterflyExhibit: return "exhibit";
    case BlockId.TallGrass: return "grass";
    case BlockId.WheatCrop: return "wheat";
    case BlockId.WildwoodSapling: return "sapling";
    case Item.Stick: return "stick";
    case Item.Coal:
    case Item.Charcoal: return "coal";
    case Item.RawIron:
    case Item.RawGold: return "ore-chunk";
    case Item.IronIngot:
    case Item.GoldIngot: return "ingot";
    case Item.CrystalShard: return "star-crystal";
    case Item.Berry: return "berries";
    case Item.Apple: return "apple";
    case Item.Bread: return "bread";
    case Item.RawMeat:
    case Item.CookedMeat: return "meat";
    case Item.RottenFlesh: return "rotten-flesh";
    case Item.Fiber: return "fiber";
    case Item.Hide: return "hide";
    case Item.BoneShard: return "bone";
    case Item.GlowDust: return "glow-dust";
    case Item.Wool: return "wool";
    case Item.Wheat: return "wheat";
    case Item.Flint:
    case Item.ShadowShard: return "shard";
    case Item.CaveGel: return "gel";
    case Item.WildwoodDoor: return "door";
    case Item.WildwoodBed: return "bed";
    case Item.Sailboat: return "sailboat";
    case Item.CreatureCage: return "capture-orb";
    case Item.Banana: return "banana";
    case Item.Shellfruit: return "shellfruit";
    case Item.Feather: return "feather";
    case Item.RawFish: return "fish-raw";
    case Item.CookedFish: return "fish-cooked";
    case Item.GlowScale: return "scale";
    case Item.BreatherCharm: return "charm";
    case Item.SunwardCompass: return "compass";
    case Item.Saddle: return "saddle";
    case Item.NocturneHeart: return "nocturne-heart";
    case Item.ButterflyNet: return "net";
    case Item.MeadowwingJar:
    case Item.AzureSkipperJar:
    case Item.EmbertipJar:
    case Item.FrostveilJar:
    case Item.BloomMonarchJar:
    case Item.FenLanternJar: return "jar";
    default:
      if (definition?.worldTextureBlock !== undefined) return "world-texture";
      if (definition?.iconKind) return definition.iconKind;
      return fallbackInventoryIconKind(item);
  }
}

export function itemHoverText(slot: InventorySlot | null, fallback = "Empty slot") {
  if (!slot) return fallback;
  const definition = ITEMS[slot.item];
  const details = [inventorySlotDisplayName(slot)];
  if (definition?.food) details.push(`Food +${definition.food}`);
  if (definition?.damage) details.push(`${definition.damage} attack damage`);
  const legendary = legendaryContractForItem(slot.item);
  if (legendary) details.push(`Legendary · ${legendary.infiniteDurability ? "Infinite durability" : `${slot.durability ?? definition?.maxDurability} durability`} · ${legendary.mechanic}`);
  else if (slot.durability !== undefined) details.push(`${slot.durability} durability`);
  const metadata = itemMetadataSummary(slot).replace(/^\s*·\s*/u, "");
  if (metadata) details.push(metadata);
  const orb = captureOrbFromInventorySlot(slot);
  if (orb?.creature) {
    const relationship = normalizeCreatureRelationship(orb.creature);
    const relationshipLabel = relationship.status === "companion" ? "Companion"
      : relationship.status === "bond-ready" ? "Bond-ready"
        : relationship.status === "acclimating" ? "Acclimating"
          : relationship.status === "relocation-only" ? "Relocation-only"
            : relationship.status.replaceAll("-", " ");
    details.push("Custody: Captured", `Relationship: ${relationshipLabel}`);
  }
  return details.join(" · ");
}

/** The held-item title names the exact resident carried by a filled orb. */
export function inventorySlotDisplayName(slot: InventorySlot | null, fallback = "Empty Hand") {
  if (!slot) return fallback;
  const baseName = ITEMS[slot.item]?.name ?? "Unknown Item";
  const orb = captureOrbFromInventorySlot(slot);
  if (!orb?.creature) return baseName;
  const species = MOB_DEFS[orb.creature.kind]?.name ?? orb.creature.kind.replace(/[-_]/gu, " ");
  const creatureName = orb.creature.name?.trim();
  return `${baseName} · ${creatureName && creatureName.toLocaleLowerCase() !== species.toLocaleLowerCase() ? `${creatureName} (${species})` : species}`;
}

export function acceptsTextInput(target: EventTarget | null) {
  return isEditableKeyboardTarget(target);
}

export function shouldSuppressGameContextMenu(started: boolean, target: EventTarget | null) {
  return started && !acceptsTextInput(target);
}

function questObjectiveTarget(objective: QuestObjective) {
  if (objective.kind === "survive-day") return objective.targetDay;
  if (objective.kind === "discover-town") return 1;
  return objective.count;
}

type BestiaryProgressEntry = Pick<HudState["bestiary"][MobKind], "seen" | "kills" | "captures"> & Partial<Pick<HudState["bestiary"][MobKind], "tames" | "breeds" | "secretUnlocked" | "milestones">>;

function bestiaryMetricValue(metric: BestiaryNoteMetric, progress: BestiaryProgressEntry) {
  if (metric === "seen") return progress.seen ? 1 : 0;
  return progress[metric] ?? 0;
}

export function bestiaryFieldNoteUnlocked(note: BestiaryFieldNote, progress: BestiaryProgressEntry) {
  return note.requires.every((requirement) => "metric" in requirement
    ? bestiaryMetricValue(requirement.metric, progress) >= requirement.atLeast
    : (progress.milestones?.[requirement.milestone] ?? 0) >= (requirement.atLeast ?? 1));
}

export function bestiaryEntryCompletion(definition: MobDefinition, progress: BestiaryProgressEntry) {
  if (definition.fieldNotes?.length) {
    return Math.round(definition.fieldNotes.filter((note) => bestiaryFieldNoteUnlocked(note, progress)).length / definition.fieldNotes.length * 100);
  }
  const tasks = [progress.seen];
  if (definition.family === "butterfly") tasks.push((progress.captures ?? 0) > 0);
  else if (definition.hostile) tasks.push(progress.kills > 0);
  if (definition.tameable) tasks.push((progress.tames ?? 0) > 0);
  if (definition.breedable) tasks.push((progress.breeds ?? 0) > 0);
  if (definition.postTameNotes) tasks.push(Boolean(progress.secretUnlocked));
  return Math.round(tasks.filter(Boolean).length / tasks.length * 100);
}

function bestiaryResearchLevel(progress: HudState["bestiary"][MobKind]) {
  const completedResearch = Object.values(progress.research ?? {}).filter((node) => node.unlockedAt !== null).length;
  if (progress.secretUnlocked || completedResearch >= 2) return 3;
  if (completedResearch > 0 || progress.captures > 0) return 2;
  return progress.seen ? 1 : 0;
}

export function bestiaryKindsForFilter(filter: BestiaryFilter): MobKind[] {
  return MOB_ORDER.filter((kind) => {
    const definition = MOB_DEFS[kind];
    if (filter === "all") return true;
    if (filter === "humanoids") return definition.family === "sentient" || definition.sentient === true;
    if (filter === "rabbits") return definition.family === "rabbit";
    if (filter === "birds") return definition.family === "bird";
    if (filter === "butterflies") return definition.family === "butterfly";
    if (filter === "aquatic") return definition.aquatic === true || definition.movement === "aquatic" || ["fish", "sea-slug", "leviathan"].includes(definition.family ?? "");
    if (filter === "sea-slugs") return definition.family === "sea-slug";
    if (filter === "golems") return definition.family === "construct";
    if (filter === "monsters") return definition.family !== "construct" && (definition.hostile || definition.family === "undead");
    if (filter === "companions") return Boolean(definition.tameable || definition.family === "pet");
    return !definition.hostile
      && definition.sentient !== true
      && !["sentient", "rabbit", "bird", "butterfly", "fish", "sea-slug", "leviathan", "construct", "undead"].includes(definition.family ?? "surface");
  });
}

export type BestiarySpecimenSummary = Readonly<{
  entityId: string;
  kind: MobKind;
  name: string | null;
  capturedAt: number;
  progression: CreatureProgressionV2 | null;
}>;

const SUMMON_KINDS = new Set<MobKind>(["asterjaw", "vellum-warden", "choir-of-one", "glasswake-stag"]);
const bestiarySlug = (value: string) => value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
const uniqueBestiaryValues = (values: readonly string[]) => Object.freeze([...new Set(values.filter(Boolean))]);

function bestiaryGuildFacets(
  definition: MobDefinition,
  naturalTypes: readonly string[],
  progress: HudState["bestiary"][MobKind],
  habitats: readonly string[],
) {
  const guilds = new Set<string>();
  for (const link of progress.guildLinks ?? []) {
    const normalized = bestiarySlug(link);
    const guildId = Object.keys(GUILDS).find((candidate) => normalized === candidate || normalized.startsWith(`${candidate}-`) || normalized.includes(candidate));
    if (guildId) guilds.add(guildId);
  }
  const faction = `${definition.faction ?? ""} ${definition.factionAffinity ?? ""} ${definition.culture ?? ""}`.toLocaleLowerCase();
  if (faction.includes("atlantian")) guilds.add("tideglass");
  if (faction.includes("wood-elf")) guilds.add("moonbough");
  if (faction.includes("goblin")) guilds.add("brassroot");
  if (faction.includes("dwarf")) guilds.add("deepgear");
  if (faction.includes("hobbit")) guilds.add("hearthroad");
  if (faction.includes("sugarcourt")) guilds.add("sugarcourt-makers");
  if (habitats.includes("aquatic")) guilds.add("tideglass");
  if (habitats.includes("underground") || definition.family === "construct") guilds.add("deepgear");
  if (naturalTypes.some((type) => ["arcane", "dream", "echo", "hush", "mirror"].includes(type)) || SUMMON_KINDS.has(definition.kind)) guilds.add("moonbough");
  if (naturalTypes.includes("confection")) guilds.add("sugarcourt-makers");
  if (MOUNT_PROFILES[definition.kind]) guilds.add("hearthroad");
  if (!definition.sentient && creatureProfile(definition.kind).captureProfile !== "uncapturable") guilds.add("waykeeper");
  return Object.freeze([...guilds]);
}

export function bestiaryFacetRecordForKind(
  kind: MobKind,
  progress: HudState["bestiary"][MobKind],
  specimens: readonly BestiarySpecimenSummary[] = [],
): BestiaryFacetRecord {
  const definition = MOB_DEFS[kind];
  const profile = creatureProfile(kind);
  const habitatText = definition.habitat.toLocaleLowerCase();
  const habitats: string[] = [];
  const aquatic = Boolean(definition.aquatic || definition.movement === "aquatic" || definition.movement === "amphibious" || ["fish", "sea-slug", "leviathan"].includes(definition.family ?? ""));
  const underground = /\b(cave|cavern|grotto|mine|underground|underworld|world below|deepgear|tunnel|burrow|crypt|abyss|subterranean)\b/iu.test(habitatText);
  if (!aquatic || definition.movement === "amphibious") habitats.push("surface");
  if (aquatic) habitats.push("aquatic");
  if (underground) habitats.push("underground");
  for (const biomeName of Object.values(BIOME_NAMES)) if (habitatText.includes(biomeName.toLocaleLowerCase())) habitats.push(`biome:${bestiarySlug(biomeName)}`);

  const naturalTypes = profile.naturalTypes.map(String);
  const movement = new Set<string>([definition.movement ?? "ground"]);
  const mountProfile = MOUNT_PROFILES[kind];
  for (const capability of mountProfile?.capabilities ?? []) movement.add(capability === "land" ? "ground" : capability === "swim" ? "aquatic" : capability === "fly" ? "flying" : capability);
  if (movement.has("ground") && movement.has("aquatic")) movement.add("amphibious");

  const relationships = new Set<string>();
  if (profile.captureProfile !== "uncapturable") relationships.add("capturable");
  if (progress.captures > 0 || (progress.specimenIds?.length ?? 0) > 0) relationships.add("captured");
  if (definition.tameable) relationships.add("tameable");
  if (definition.breedable) relationships.add("breedable");
  if (mountProfile) relationships.add("mount");
  if (SUMMON_KINDS.has(kind) || (progress.summonOrigins?.length ?? 0) > 0 || Object.values(progress.forms ?? {}).some((form) => form.category === "summoned")) relationships.add("summon");
  if (specimens.some((specimen) => ["trusted", "partnered", "kindred"].includes(specimen.progression?.bondTier ?? ""))) relationships.add("bonded");

  const completion = bestiaryEntryCompletion(definition, progress);
  const research = !progress.seen ? "unknown" : completion >= 100 ? "mastered"
    : completion > 0 || Object.keys(progress.research ?? {}).length > 0 ? "in-progress" : "observed";
  const formRecords = Object.values(progress.forms ?? {});
  const legendary = definition.family === "legendary" || ["dragon", "leviathan"].includes(definition.family ?? "") || profile.captureProfile === "legendary";
  const summoned = SUMMON_KINDS.has(kind) || (progress.summonOrigins?.length ?? 0) > 0 || formRecords.some((form) => form.category === "summoned");
  const rarity = new Set<string>();
  if (!legendary && !summoned) rarity.add("ordinary");
  if (legendary) rarity.add("legendary");
  if (summoned) rarity.add("summoned");
  for (const form of formRecords) {
    rarity.add(form.category);
    if (["regional", "seasonal", "story"].includes(form.category)) rarity.add("variant");
  }
  const rarityRank = summoned ? 6 : legendary ? 5 : rarity.has("prime") ? 4 : rarity.has("shiny") ? 3 : rarity.has("variant") ? 2 : 1;
  const creatureLevel = specimens.reduce((highest, specimen) => Math.max(highest, specimen.progression?.level ?? 0), 0);

  return Object.freeze({
    id: kind,
    name: definition.name,
    catalogIndex: MOB_ORDER.indexOf(kind),
    lastObservedAt: progress.lastObservedAt ?? null,
    researchCompletion: completion,
    creatureLevel,
    rarityRank,
    facets: Object.freeze({
      habitat: uniqueBestiaryValues(habitats),
      type: uniqueBestiaryValues(naturalTypes),
      relationship: uniqueBestiaryValues([...relationships]),
      movement: uniqueBestiaryValues([...movement]),
      temperament: Object.freeze([definition.temperament.toLocaleLowerCase()]),
      research: Object.freeze([research]),
      rarity: uniqueBestiaryValues([...rarity]),
      utility: uniqueBestiaryValues(profile.ecologyRoles),
      guild: bestiaryGuildFacets(definition, naturalTypes, progress, habitats),
    }),
  });
}

function bestiaryFacetValueLabel(facet: BestiaryFacetKey, value: string) {
  if (facet === "type") return CREATURE_TYPES[value as keyof typeof CREATURE_TYPES]?.name ?? value;
  if (facet === "guild") return BESTIARY_GUILD_LABELS[value] ?? value;
  if (value.startsWith("biome:")) return value.slice(6).replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toLocaleUpperCase());
  return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toLocaleUpperCase());
}

function bestiaryRecordTimestamp(value: number | null) {
  return value === null ? "Not recorded" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function undiscoveredHabitatHint(definition: MobDefinition) {
  return definition.discoveryHint ?? `Search ${definition.habitat.charAt(0).toLocaleLowerCase()}${definition.habitat.slice(1)}.`;
}

function bestiaryObservation(definition: MobDefinition, progress: BestiaryProgressEntry) {
  if (definition.family === "butterfly") return `${progress.captures ?? 0} captured`;
  if (definition.tameable && (progress.tames ?? 0) > 0) return `${progress.tames} tamed`;
  if (definition.breedable && (progress.breeds ?? 0) > 0) return `${progress.breeds} bred`;
  if (definition.hostile) return `${progress.kills} defeated`;
  return progress.seen ? "observed in the wild" : "not yet observed";
}

function itemMetadataSummary(slot: InventorySlot | null) {
  if (!slot?.metadata) return "";
  const orb = captureOrbFromInventorySlot(slot);
  if (orb?.creature) {
    const creature = orb.creature;
    const details = [
      creature.tamed ? "Tamed" : "",
      creature.baby ? "Baby" : "",
      `${formatHudHealth(creature.health)}/${formatHudHealth(creature.maxHealth)} health`,
      orb.attunement ? orb.attunement.activeEntityId ? "Deployed" : "Attuned" : "",
    ].filter(Boolean);
    return ` · ${details.join(" · ")}`;
  }
  const metadata = slot.metadata;
  const name = typeof metadata.name === "string" ? metadata.name : typeof metadata.customName === "string" ? metadata.customName : "";
  const species = typeof metadata.species === "string" ? metadata.species : typeof metadata.kind === "string" ? metadata.kind : typeof metadata.mobKind === "string" ? metadata.mobKind : "";
  const traits = [metadata.tamed === true ? "Tamed" : "", metadata.baby === true || metadata.isBaby === true ? "Baby" : ""].filter(Boolean);
  const details = [name ? `“${name}”` : "", species ? species.replace(/[-_]/g, " ") : "", ...traits].filter(Boolean);
  return details.length ? ` · ${details.join(" · ")}` : " · Preserved creature data";
}

function ItemIcon({ item, slot, small = false }: { item: ItemCode; slot?: InventorySlot | null; small?: boolean }) {
  const definition = ITEMS[item];
  const iconKind = itemIconKind(item);
  const isTool = Boolean(definition?.toolKind) && iconKind.startsWith("tool-");
  const custom = !isTool;
  const capturedCreature = item === Item.CaptureOrb ? captureOrbFromInventorySlot(slot)?.creature : null;
  const filledCaptureOrb = Boolean(capturedCreature);
  return (
    <span
      className={`item-icon item-icon-kind-${iconKind} ${filledCaptureOrb ? "item-icon-filled" : ""} ${small ? "item-icon-small" : ""} ${isTool ? `tool-icon tool-${definition.toolKind}` : custom ? "custom-item-icon" : "block-item-icon"}`}
      style={{ "--item-color": definition?.color ?? "#777" } as CSSProperties}
      data-item-icon={iconKind}
      data-item-id={item}
      data-creature-kind={capturedCreature?.kind}
      data-world-texture={definition?.worldTextureBlock}
      data-presentation-family={itemPresentationFamily(item)}
      aria-hidden="true"
    />
  );
}

/** A deterministic drill-down target for an ingredient shown on the pattern board. */
export function recipeForOutputItem(item: ItemCode, recipes: readonly Recipe[] = RECIPES): Recipe | null {
  return recipes.find((recipe) => recipe.output.item === item) ?? null;
}

export function RecipePreviewIngredient({ item, label, onNavigate }: {
  item: ItemCode;
  label: string;
  onNavigate: (recipeId: string) => void;
}) {
  const target = recipeForOutputItem(item);
  if (!target) {
    return <span className="recipe-preview-slot" title={label} aria-label={label}><ItemIcon item={item} small /></span>;
  }
  return (
    <button
      type="button"
      className="recipe-preview-slot recipe-ingredient-link"
      title={`View ${target.name} recipe`}
      aria-label={`${label}: view ${target.name} recipe`}
      data-recipe-target={target.id}
      onClick={() => onNavigate(target.id)}
    >
      <ItemIcon item={item} small />
    </button>
  );
}

const creaturePortraitPath = (kind: MobKind) => `/creatures/${BUTTERFLY_ORDER.includes(kind as (typeof BUTTERFLY_ORDER)[number]) ? `butterfly-${kind}` : kind}.svg`;

function CreaturePortrait({ kind, seen, mini = false }: { kind: MobKind; seen: boolean; mini?: boolean }) {
  const definition = MOB_DEFS[kind];
  return (
    <span
      className={`creature-render ${mini ? "creature-render-mini" : "creature-render-hero"} ${seen ? "seen" : "unknown"}`}
      data-creature-kind={kind}
      style={{
        "--mob-color": `#${definition.colors[0].toString(16).padStart(6, "0")}`,
        "--mob-accent": `#${definition.colors[1].toString(16).padStart(6, "0")}`,
      } as CSSProperties}
    >
      {/* Generated local SVGs preserve the exact production-model framing; image optimization would only proxy them. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={creaturePortraitPath(kind)} alt={mini ? "" : seen ? `${definition.name} three-dimensional model` : "Undiscovered creature silhouette"} aria-hidden={mini || undefined} />
      {!seen && <b aria-hidden="true">?</b>}
    </span>
  );
}

const plantPortraitPath = (plantId: string) => `/plants/${plantId}.svg`;

function PlantPortrait({ plant, seen, mini = false }: { plant: PlantDefinition; seen: boolean; mini?: boolean }) {
  return (
    <span className={`plant-render ${mini ? "plant-render-mini" : "plant-render-hero"} ${seen ? "seen" : "unknown"}`} data-plant-id={plant.id}>
      {/* Generated from the field-guide plant model catalog, including complete tree examples. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={plantPortraitPath(plant.id)} alt={mini ? "" : seen ? `${plant.name} three-dimensional field specimen` : "Undiscovered plant silhouette"} aria-hidden={mini || undefined} />
      {!seen && <b aria-hidden="true">?</b>}
    </span>
  );
}

function WikiPortraitImage({ src, className, lazy = false }: Readonly<{ src: string; className: string; lazy?: boolean }>) {
  // These are tiny deterministic local SVGs shared with the Bestiary; an image
  // optimization hop would cost more than the source asset and break that path.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt="" loading={lazy ? "lazy" : "eager"} decoding="async" />;
}

let avatarPreviewAtlas: THREE.Texture | null = null;

function createPreviewHeldItem(item: ItemCode | undefined) {
  if (item === undefined) return null;
  avatarPreviewAtlas ??= createBlockAtlas();
  return createAvatarHeldItemModel(item, { atlas: avatarPreviewAtlas });
}

function disposePreviewObject(object: THREE.Object3D | null) {
  object?.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material.dispose();
  });
}

const AVATAR_PREVIEW_FRAME_INTERVAL_MS = 1000 / 22;
const AVATAR_PREVIEW_RENDERER_IDLE_MS = 30_000;

type AvatarPreviewFrameTask = {
  isConnected: () => boolean;
  render: (now: number) => void;
  onError?: (error: unknown) => void;
};

export function createAvatarPreviewFrameScheduler(
  requestFrame: (callback: (now: number) => void) => number,
  cancelFrame: (frame: number) => void,
  frameIntervalMs = AVATAR_PREVIEW_FRAME_INTERVAL_MS,
) {
  type Entry = AvatarPreviewFrameTask & { visible: boolean };
  const entries = new Set<Entry>();
  let animationFrame: number | null = null;
  let lastRenderedAt = Number.NEGATIVE_INFINITY;

  const runnableEntries = () => [...entries].filter((entry) => entry.visible && entry.isConnected());
  const cancelIfIdle = () => {
    if (animationFrame === null || runnableEntries().length > 0) return;
    cancelFrame(animationFrame);
    animationFrame = null;
  };
  const schedule = () => {
    if (animationFrame !== null || runnableEntries().length === 0) return;
    animationFrame = requestFrame(renderFrame);
  };
  function renderFrame(now: number) {
    animationFrame = null;
    const runnable = runnableEntries();
    if (runnable.length === 0) return;
    if (now - lastRenderedAt >= frameIntervalMs) {
      lastRenderedAt = now;
      for (const entry of runnable) {
        try {
          entry.render(now);
        } catch (error) {
          entry.onError?.(error);
        }
      }
    }
    schedule();
  }

  return {
    register(task: AvatarPreviewFrameTask, initiallyVisible = true) {
      const entry: Entry = { ...task, visible: initiallyVisible };
      entries.add(entry);
      schedule();
      return {
        setVisible(visible: boolean) {
          if (entry.visible === visible) return;
          entry.visible = visible;
          if (visible) schedule();
          else cancelIfIdle();
        },
        dispose() {
          entries.delete(entry);
          cancelIfIdle();
        },
      };
    },
  };
}

type AvatarPreviewVisibilityEntry = Pick<IntersectionObserverEntry, "intersectionRatio" | "isIntersecting" | "target">;
type AvatarPreviewVisibilityObserver = Pick<IntersectionObserver, "disconnect" | "observe">;
type AvatarPreviewVisibilityObserverFactory = (
  callback: (entries: ReadonlyArray<AvatarPreviewVisibilityEntry>) => void,
) => AvatarPreviewVisibilityObserver | null;

function createBrowserAvatarPreviewVisibilityObserver(
  callback: (entries: ReadonlyArray<AvatarPreviewVisibilityEntry>) => void,
): AvatarPreviewVisibilityObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  return new IntersectionObserver((entries) => callback(entries));
}

export function observeAvatarPreviewVisibility(
  element: Element,
  onVisibilityChange: (visible: boolean) => void,
  createObserver: AvatarPreviewVisibilityObserverFactory | null = createBrowserAvatarPreviewVisibilityObserver,
) {
  let observer: AvatarPreviewVisibilityObserver | null = null;
  try {
    observer = createObserver?.((entries) => {
      const entry = entries.find((candidate) => candidate.target === element);
      if (entry) onVisibilityChange(entry.isIntersecting && entry.intersectionRatio > 0);
    }) ?? null;
  } catch {
    observer = null;
  }
  // Unsupported or broken observers should never leave a blank avatar.
  if (!observer) {
    onVisibilityChange(true);
    return () => undefined;
  }
  try {
    observer.observe(element);
  } catch {
    observer.disconnect();
    onVisibilityChange(true);
    return () => undefined;
  }
  return () => observer.disconnect();
}

type AvatarPreviewRendererResource = {
  dispose: () => void;
  forceContextLoss: () => void;
};

export function createAvatarPreviewRendererPool<Renderer extends AvatarPreviewRendererResource, TimerHandle>({
  createRenderer,
  scheduleRelease,
  cancelRelease,
  idleMs = AVATAR_PREVIEW_RENDERER_IDLE_MS,
  onCreateError,
}: {
  createRenderer: () => Renderer;
  scheduleRelease: (callback: () => void, delayMs: number) => TimerHandle;
  cancelRelease: (timer: TimerHandle) => void;
  idleMs?: number;
  onCreateError?: (error: unknown) => void;
}) {
  let renderer: Renderer | null = null;
  let users = 0;
  let releaseTimer: TimerHandle | null = null;
  let unavailable = false;

  return {
    acquire() {
      if (releaseTimer !== null) {
        cancelRelease(releaseTimer);
        releaseTimer = null;
      }
      users += 1;
      if (renderer || unavailable) return renderer;
      try {
        renderer = createRenderer();
      } catch (error) {
        unavailable = true;
        onCreateError?.(error);
      }
      return renderer;
    },
    release() {
      users = Math.max(0, users - 1);
      if (users > 0 || releaseTimer !== null || !renderer) return;
      releaseTimer = scheduleRelease(() => {
        releaseTimer = null;
        if (users > 0 || !renderer) return;
        const releasedRenderer = renderer;
        renderer = null;
        releasedRenderer.dispose();
        releasedRenderer.forceContextLoss();
      }, idleMs);
    },
  };
}

// Character previews share one off-screen WebGL context and one capped frame
// scheduler. Each result is copied into a cheap 2D canvas, so inactive overlays
// add neither a context nor their own animation loop.
const sharedAvatarPreviewFrameScheduler = createAvatarPreviewFrameScheduler(
  (callback) => requestAnimationFrame(callback),
  (frame) => cancelAnimationFrame(frame),
);
const sharedAvatarPreviewRendererPool = createAvatarPreviewRendererPool<THREE.WebGLRenderer, ReturnType<typeof setTimeout>>({
  createRenderer: () => {
    const surface = document.createElement("canvas");
    const renderer = new THREE.WebGLRenderer({
      canvas: surface,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0x000000, 0);
    return renderer;
  },
  scheduleRelease: (callback, delayMs) => setTimeout(callback, delayMs),
  cancelRelease: (timer) => clearTimeout(timer),
  onCreateError: (error) => {
    // A 2D avatar below keeps every menu usable even on hardware/browser
    // configurations where no spare WebGL context can be allocated.
    console.warn("Blockwild character preview is using its 2D fallback.", error);
  },
});

function acquireAvatarPreviewRenderer() {
  return sharedAvatarPreviewRendererPool.acquire();
}

function releaseAvatarPreviewRenderer() {
  sharedAvatarPreviewRendererPool.release();
}

function drawAvatarPreviewFallback(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  variant: PlayerVariant,
  equipmentAppearance: PlayerEquipmentAppearance,
  heldItem: ItemCode | undefined,
  offhandItem: ItemCode | undefined,
  characterAppearance?: CharacterAppearance,
) {
  context.clearRect(0, 0, width, height);
  const scale = Math.max(1, Math.min(width / 112, height / 180));
  const centerX = width * 0.5;
  const top = height * 0.09;
  const fill = (color: THREE.ColorRepresentation | null | undefined, x: number, y: number, w: number, h: number) => {
    context.fillStyle = color instanceof THREE.Color
      ? `#${color.getHexString()}`
      : typeof color === "number" ? `#${color.toString(16).padStart(6, "0")}` : color ?? "#777";
    context.fillRect(Math.round(centerX + x * scale), Math.round(top + y * scale), Math.ceil(w * scale), Math.ceil(h * scale));
  };
  context.save();
  context.translate(0.5, 0.5);
  context.shadowColor = "rgba(21, 18, 15, .24)";
  context.shadowBlur = 7 * scale;
  context.shadowOffsetY = 4 * scale;
  const colors = characterAppearance?.colors;
  fill(colors?.hair ?? (variant === "female" ? "#171313" : "#4d3424"), -25, 0, 50, variant === "female" ? 28 : 23);
  fill(colors?.skin ?? "#bf815e", -22, 13, 44, 38);
  fill(equipmentAppearance.head, -26, 5, 52, 20);
  fill(equipmentAppearance.chest ?? colors?.shirt ?? (variant === "female" ? "#674f79" : "#557080"), -25, 52, 50, 56);
  fill(colors?.skin ?? "#bf815e", -39, 55, 13, 59);
  fill(colors?.skin ?? "#bf815e", 26, 55, 13, 59);
  fill(equipmentAppearance.legs ?? colors?.trousers ?? "#3a4652", -22, 108, 20, 51);
  fill(equipmentAppearance.legs ?? colors?.trousers ?? "#3a4652", 3, 108, 20, 51);
  fill(equipmentAppearance.feet ?? "#2f2823", -23, 157, 21, 13);
  fill(equipmentAppearance.feet ?? "#2f2823", 3, 157, 21, 13);
  if (heldItem !== undefined) {
    fill(ITEMS[heldItem]?.color ?? "#9b7c4a", 36, 78, 11, 50);
  }
  if (offhandItem !== undefined) {
    const shield = ITEMS[offhandItem]?.iconKind === "shield";
    fill(ITEMS[offhandItem]?.color ?? "#9b7c4a", shield ? -48 : -45, shield ? 64 : 78, shield ? 24 : 11, shield ? 48 : 50);
  }
  context.restore();
}

function PlayerAvatarPreview({
  variant,
  appearance,
  equipment,
  heldItem,
  offhandItem,
  compact = false,
}: {
  variant: PlayerVariant;
  appearance?: CharacterAppearance;
  equipment?: HudState["equipment"];
  heldItem?: ItemCode;
  offhandItem?: ItemCode;
  compact?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const head = equipment?.head?.item;
  const chest = equipment?.chest?.item;
  const legs = equipment?.legs?.item;
  const feet = equipment?.feet?.item;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const renderer = acquireAvatarPreviewRenderer();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(compact ? 28 : 31, 1, 0.1, 20);
    camera.position.set(compact ? 1.9 : 2.65, compact ? 1.92 : 2.18, compact ? -3.25 : -4.3);
    camera.lookAt(0, 1.02, 0);
    scene.add(new THREE.HemisphereLight(0xe7f4ff, 0x604c38, 2.1));
    const key = new THREE.DirectionalLight(0xfff2cf, 2.6);
    key.position.set(-3, 5, -4);
    key.castShadow = true;
    scene.add(key);
    const model = new BlockPlayerModel({ variant, race: appearance?.race, colors: appearance?.colors, mode: "local", castShadow: true, receiveShadow: true });
    if (appearance) model.setAppearance(appearance);
    const equipmentAppearance: PlayerEquipmentAppearance = {
      head: head === undefined ? null : ITEMS[head]?.color,
      chest: chest === undefined ? null : ITEMS[chest]?.color,
      legs: legs === undefined ? null : ITEMS[legs]?.color,
      feet: feet === undefined ? null : ITEMS[feet]?.color,
    };
    model.setEquipmentAppearance(equipmentAppearance);
    model.group.rotation.y = -0.32;
    scene.add(model.group);
    const held = createPreviewHeldItem(heldItem);
    const offhand = createPreviewHeldItem(offhandItem);
    model.setHeldItem(held);
    model.setOffhandItem(offhand, offhandItem !== undefined && ITEMS[offhandItem]?.iconKind === "shield");
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.15, 32), new THREE.ShadowMaterial({ opacity: 0.28 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    let previous = performance.now();
    let width = 120;
    let height = 150;
    let pixelRatio = 1;
    const resize = () => {
      width = Math.max(120, Math.round(canvas.clientWidth));
      height = Math.max(150, Math.round(canvas.clientHeight));
      pixelRatio = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      renderer?.setPixelRatio(pixelRatio);
      renderer?.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    const frameRegistration = sharedAvatarPreviewFrameScheduler.register({
      isConnected: () => canvas.isConnected,
      render: (now) => {
        const dt = Math.min(0.05, (now - previous) / 1000);
        previous = now;
        model.update(dt, { locomotion: "idle", headYaw: Math.sin(now * 0.0007) * 0.08 });
        model.group.rotation.y = -0.32 + Math.sin(now * 0.00035) * 0.045;
        if (renderer && !renderer.getContext().isContextLost()) {
          try {
            renderer.setPixelRatio(pixelRatio);
            renderer.setSize(width, height, false);
            renderer.render(scene, camera);
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(renderer.domElement, 0, 0, canvas.width, canvas.height);
          } catch {
            drawAvatarPreviewFallback(context, canvas.width, canvas.height, variant, equipmentAppearance, heldItem, offhandItem, appearance);
          }
        } else {
          drawAvatarPreviewFallback(context, canvas.width, canvas.height, variant, equipmentAppearance, heldItem, offhandItem, appearance);
        }
      },
      onError: () => {
        drawAvatarPreviewFallback(context, canvas.width, canvas.height, variant, equipmentAppearance, heldItem, offhandItem, appearance);
      },
    }, false);
    const stopVisibilityObservation = observeAvatarPreviewVisibility(canvas, frameRegistration.setVisible);
    return () => {
      stopVisibilityObservation();
      frameRegistration.dispose();
      resizeObserver.disconnect();
      model.setHeldItem(null);
      model.setOffhandItem(null);
      disposePreviewObject(held);
      disposePreviewObject(offhand);
      model.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      releaseAvatarPreviewRenderer();
    };
  }, [variant, appearance, head, chest, legs, feet, heldItem, offhandItem, compact]);

  return <canvas ref={canvasRef} className={`player-avatar-preview ${compact ? "compact" : ""}`} aria-label={`${variant === "female" ? "Female" : "Male"} ${appearance?.race ?? "wayfarer"} player model preview`} />;
}

export function recipePreviewGrid(recipe: Recipe): Array<ItemCode | 0> {
  const cells = Array.from({ length: 9 }, () => 0 as ItemCode | 0);
  for (let y = 0; y < recipe.height; y += 1) for (let x = 0; x < recipe.width; x += 1) {
    const ingredient = recipe.pattern[y * recipe.width + x];
    cells[y * 3 + x] = ingredient === 0 ? 0 : Array.isArray(ingredient) ? ingredient[0] : ingredient;
  }
  return cells;
}

export function recipeIngredientLabels(recipe: Recipe) {
  return [...new Set(recipe.pattern.flatMap((ingredient) => {
    if (ingredient === 0) return [];
    const alternatives = Array.isArray(ingredient) ? ingredient : [ingredient];
    return [alternatives.map((item) => ITEMS[item]?.name ?? "Unknown item").join(" or ")];
  }))];
}

function recipePreviewLabels(recipe: Recipe): Array<string | null> {
  const labels = Array.from({ length: 9 }, () => null as string | null);
  for (let y = 0; y < recipe.height; y += 1) for (let x = 0; x < recipe.width; x += 1) {
    const ingredient = recipe.pattern[y * recipe.width + x];
    if (ingredient === 0) continue;
    const alternatives = Array.isArray(ingredient) ? ingredient : [ingredient];
    labels[y * 3 + x] = alternatives.map((item) => ITEMS[item]?.name ?? "Unknown item").join(" or ");
  }
  return labels;
}

export function recipeMatchesQuery(recipe: Recipe, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  const ingredientNames = recipe.pattern.flatMap((ingredient) => ingredient === 0 ? [] : (Array.isArray(ingredient) ? ingredient : [ingredient]))
    .map((item) => ITEMS[item]?.name ?? "");
  return [recipe.name, ITEMS[recipe.output.item]?.name ?? "", ...ingredientNames].some((name) => name.toLocaleLowerCase().includes(normalized));
}

function PixelButton({
  children,
  className = "",
  disabled = false,
  onClick,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button type="button" className={`pixel-button ${className}`} disabled={disabled} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

function StatPips({ kind, value }: { kind: "heart" | "hunger"; value: number }) {
  return (
    <div className={`stat-pips stat-${kind}`} aria-label={`${kind === "heart" ? "Health" : "Hunger"}: ${kind === "heart" ? formatHudHealth(value) : Math.ceil(value)} of 10`}>
      {Array.from({ length: 10 }, (_, index) => (
        <span key={index} className={index < Math.ceil(value) ? "filled" : "empty"}>{kind === "heart" ? "♥" : "◆"}</span>
      ))}
    </div>
  );
}

function ArmorPips({ value }: { value: number }) {
  return (
    <div className="stat-pips stat-armor" aria-label={`Armor: ${value} points`}>
      {Array.from({ length: 10 }, (_, index) => <span key={index} className={index < Math.ceil(value / 1.2) ? "filled" : "empty"}>⬟</span>)}
    </div>
  );
}

function OxygenPips({ value, maximum }: { value: number; maximum: number }) {
  const filled = Math.ceil(Math.max(0, Math.min(1, maximum > 0 ? value / maximum : 0)) * 10);
  return (
    <div className="oxygen-pips" aria-label={`Oxygen: ${Math.ceil(value)} of ${Math.ceil(maximum)} seconds`}>
      {Array.from({ length: 10 }, (_, index) => <span key={index} className={index < filled ? "filled" : "empty"}>○</span>)}
    </div>
  );
}

function SlotContents({ slot }: { slot: InventorySlot | null }) {
  if (!slot) return null;
  const definition = ITEMS[slot.item];
  const maxDurability = definition?.maxDurability;
  const durability = slot.durability ?? maxDurability;
  const infiniteDurability = definition?.infiniteDurability === true;
  return (
    <>
      <ItemIcon item={slot.item} slot={slot} />
      {slot.count > 1 && <span className="item-count">{slot.count}</span>}
      {infiniteDurability && <span className="item-count" aria-label="Infinite durability">∞</span>}
      {!infiniteDurability && maxDurability && durability !== undefined && (
        <span className="durability-track"><span style={{ width: `${Math.max(0, durability / maxDurability) * 100}%` }} /></span>
      )}
    </>
  );
}

const DRAGON_ASSET_AUDIT_ITEMS = new Set<ItemCode>([
  Item.GoldBlockItem, Item.GoldPileItem, Item.DragonSaddle, Item.DragonChestModule,
  Item.FireDragonArmorModule, Item.IceDragonArmorModule, Item.SteelDragonArmorModule,
  Item.TideglassDragonArmorModule, Item.GoldDragonArmorModule, Item.SilverDragonArmorModule,
  Item.FireScaleHelm, Item.FireScalePlate, Item.FireScaleGreaves, Item.FireScaleBoots,
  Item.IceScaleHelm, Item.IceScalePlate, Item.IceScaleGreaves, Item.IceScaleBoots,
  Item.SteelScaleHelm, Item.SteelScalePlate, Item.SteelScaleGreaves, Item.SteelScaleBoots,
]);

const RESOURCE_ASSET_AUDIT_ITEMS = new Set<ItemCode>([
  Item.CrystalShard,
  BlockId.CrystalBlock,
  Item.Shellfruit,
  BlockId.ShellfruitCrate,
  Item.DeepgearLanternItem,
  Item.Flour,
  Item.WheatMillItem,
  BlockId.FlourCrate,
  BlockId.BreadCrate,
  Item.WildwoodStoolItem,
  Item.WildwoodFenceGate,
  BlockId.WildwoodFence,
  BlockId.CaptureOrbRack,
]);

export default function VoxelGame({ agentMode = false }: Readonly<{ agentMode?: boolean }>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const worldStorageRef = useRef<WorldStorage | null>(null);
  const characterStoreRef = useRef<CharacterProfileStore | null>(null);
  const activeWorldIdRef = useRef<string | null>(null);
  const importWorldInputRef = useRef<HTMLInputElement>(null);
  const titleContentRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const overlayRef = useRef<Overlay>("title");
  const titleMenuViewRef = useRef<TitleMenuView>("main");
  const toastTimerRef = useRef<number>(0);
  const lookPointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const activePetDraftIdRef = useRef<number | null>(null);
  const multiplayerFlightRef = useRef<Promise<unknown> | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatOpenRef = useRef(false);
  const slotInteractionReadyAtRef = useRef(0);
  const inventoryDragRef = useRef<InventoryDragGesture | null>(null);
  const suppressSlotClickRef = useRef<{ target: EventTarget | null; at: number } | null>(null);
  const pendingSingleSlotReleaseRef = useRef<{
    target: EventTarget | null;
    onLeft: (shift: boolean) => void;
    shift: boolean;
    timer: number;
  } | null>(null);
  const heldStackElementRef = useRef<HTMLDivElement | null>(null);
  const heldStackPositionRef = useRef<ReturnType<typeof createHeldStackPositionController> | null>(null);
  const bestiaryFiltersOpenRef = useRef(false);
  const bestiaryFilterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const bestiaryFilterPanelRef = useRef<HTMLElement | null>(null);
  const telemetryLogRef = useRef(new ResourceTelemetryLog());
  const contextReferenceRef = useRef<ContextReferenceTarget | null>(null);
  const itemGuideOpenRef = useRef(false);

  const [overlay, setOverlayState] = useState<Overlay>("title");
  const [titleMenuView, setTitleMenuViewState] = useState<TitleMenuView>("main");
  const [started, setStarted] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [hud, setHud] = useState<ExtendedHudState>(INITIAL_HUD);
  const [toast, setToast] = useState("There is always another horizon. Usually with teeth.");
  const [savedPulse, setSavedPulse] = useState(false);
  const [persistenceState, setPersistenceState] = useState<{ dirty: boolean; saving: boolean; error: string | null }>({ dirty: false, saving: false, error: null });
  const [storageStatus, setStorageStatus] = useState<{ phase: string; message: string }>({ phase: "opening", message: "Opening browser universe storage…" });
  const [worldActionBusy, setWorldActionBusy] = useState(false);
  const [inventoryDragRevision, setInventoryDragRevision] = useState(0);
  const [worlds, setWorlds] = useState<WorldMetadata[]>([]);
  const [characterCatalog, setCharacterCatalog] = useState<CharacterProfileCatalog>(FALLBACK_CHARACTER_CATALOG);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [worldName, setWorldName] = useState("Untamed World");
  const [worldOptions, setWorldOptions] = useState<WorldOptions>(() => ({
    ...DEFAULT_WORLD_OPTIONS,
    enabledFactions: [...DEFAULT_WORLD_OPTIONS.enabledFactions],
  }));
  const [originPreview, setOriginPreview] = useState<ReturnType<VoxelEngine["previewWorldOrigin"]>>(null);
  const [originPreviewPending, setOriginPreviewPending] = useState(false);
  const [originSearchRadius, setOriginSearchRadius] = useState(DEFAULT_SETTLEMENT_ORIGIN_SEARCH_RADIUS);
  const [worldNotice, setWorldNotice] = useState("");
  const [previousEditionDataCount, setPreviousEditionDataCount] = useState(0);
  const [seed, setSeed] = useState("WILDERNESS");
  const [currentWorldSeed, setCurrentWorldSeed] = useState("WILDERNESS");
  const [mode, setMode] = useState<GameMode>("survival");
  const [settings, setSettingsState] = useState<GameSettings>(initialHydrationSettings);
  const [mutedDroneVoices, setMutedDroneVoices] = useState<ReadonlySet<string>>(() => new Set());
  const [droneVoiceVolumes, setDroneVoiceVolumes] = useState<Readonly<Record<string, number>>>({});
  const [uiPreferences, setUiPreferencesState] = useState<UiPreferences>(() => ({ ...INITIAL_UI_PREFERENCES }));
  const [inputCapabilities, setInputCapabilities] = useState<InputCapabilities>(() => ({ ...INITIAL_INPUT_CAPABILITIES }));
  const [settingsReturn, setSettingsReturn] = useState<"title" | "pause">("title");
  const [webglError, setWebglError] = useState(false);
  const [inventoryTab, setInventoryTab] = useState<"inventory" | "recipes" | "creative">("inventory");
  const [creativeQuery, setCreativeQuery] = useState("");
  const [recipeQuery, setRecipeQuery] = useState("");
  const [previewRecipeId, setPreviewRecipeId] = useState<string | null>(null);
  const [recipeFeedback, setRecipeFeedback] = useState<RecipePlanResult | null>(null);
  const [itemGuideOpen, setItemGuideOpen] = useState(false);
  const [itemGuideQuery, setItemGuideQuery] = useState("");
  const [itemGuideItem, setItemGuideItem] = useState<ItemCode | null>(null);
  const [itemGuideCategory, setItemGuideCategory] = useState<WikiCategory>("item");
  const [itemGuideEntryKey, setItemGuideEntryKey] = useState("system:getting-started");
  const [contextReference, setContextReference] = useState<ContextReferenceTarget | null>(null);
  const [telemetryRunning, setTelemetryRunning] = useState(false);
  const [telemetrySamples, setTelemetrySamples] = useState(0);
  const [petNameDraft, setPetNameDraft] = useState("");
  const [selectedBestiary, setSelectedBestiary] = useState<MobKind>("mossling");
  const [bestiaryFacets, setBestiaryFacets] = useState<BestiaryFacetSelections>(createEmptyBestiaryFacetSelections);
  const [bestiaryQuickFilter, setBestiaryQuickFilter] = useState<BestiaryQuickFilter>("all");
  const [bestiarySearch, setBestiarySearch] = useState("");
  const [bestiarySort, setBestiarySort] = useState<BestiarySort>("catalog");
  const [bestiaryFiltersOpen, setBestiaryFiltersOpen] = useState(false);
  const [bestiaryPageTab, setBestiaryPageTab] = useState<BestiaryPageTab>("overview");
  const [campCompareOrbId, setCampCompareOrbId] = useState("");
  const [campNameDraft, setCampNameDraft] = useState("");
  const [campTransferRecipientId, setCampTransferRecipientId] = useState("");
  const [fieldGuideSection, setFieldGuideSection] = useState<FieldGuideSection>("creatures");

  const setItemGuideVisible = useCallback((next: boolean) => {
    itemGuideOpenRef.current = next;
    setItemGuideOpen(next);
  }, []);
  const [selectedPlantId, setSelectedPlantId] = useState(PLANTS[0]?.id ?? "");
  const [plantFilter, setPlantFilter] = useState<"all" | PlantCategory>("all");
  const [selectedMapMarkerId, setSelectedMapMarkerId] = useState<string | null>(null);
  const [trackedNavigationId, setTrackedNavigationId] = useState<string | null>(null);
  const [selectedAlchemyRecipe, setSelectedAlchemyRecipe] = useState<string | null>(null);
  const [selectedDistilleryRecipe, setSelectedDistilleryRecipe] = useState<string | null>(null);
  const [selectedSugarworksRecipe, setSelectedSugarworksRecipe] = useState<string | null>(null);
  const [selectedGolemType, setSelectedGolemType] = useState<GolemType>("copper-scout");
  const [hirelingNameDraft, setHirelingNameDraft] = useState("");
  const [multiplayerName, setMultiplayerName] = useState("Trailkeeper");
  const [multiplayerRoomCode, setMultiplayerRoomCode] = useState("");
  const [multiplayerInvite, setMultiplayerInvite] = useState("");
  const [multiplayerAnswer, setMultiplayerAnswer] = useState("");
  const [multiplayerState, setMultiplayerState] = useState<MultiplayerViewState>(EMPTY_MULTIPLAYER_STATE);
  const droneVoiceSpeakers = useMemo(() => {
    const latest = new Map<string, { agentId: string; name: string }>();
    for (const message of multiplayerState.chat) if (message.peerKind === "agent") {
      latest.set(message.authorId, { agentId: message.authorId, name: message.authorName });
    }
    return [...latest.values()];
  }, [multiplayerState.chat]);
  const [multiplayerBusy, setMultiplayerBusy] = useState(false);
  const [multiplayerReturn, setMultiplayerReturn] = useState<"title" | "pause">("title");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatChannel, setChatChannel] = useState<"local" | "party" | "global">("global");
  const [iconAuditMode, setIconAuditMode] = useState<"all" | "tomes" | "dragons" | "alchemy" | "resources" | null>(null);
  const [civicAuditMode, setCivicAuditMode] = useState<CivicAuditMode | null>(null);
  const [heldAuditMode, setHeldAuditMode] = useState(false);
  const [spellWheelAuditMode, setSpellWheelAuditMode] = useState(false);
  const [workstationAuditMode, setWorkstationAuditMode] = useState<WorkstationOverlay | null>(null);
  const showTouchControls = resolveTouchControls(uiPreferences.touchControls, inputCapabilities);
  const activeCharacterProfile = characterCatalog.profiles.find((profile) => profile.id === characterCatalog.selectedProfileId)
    ?? characterCatalog.profiles[0]
    ?? FALLBACK_CHARACTER_PROFILE;

  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);

  useEffect(() => {
    if (overlay !== "new" || worldOptions.origin.mode === "wilderness" || !worldOptions.structures || worldOptions.settlementDensity <= 0) {
      setOriginPreview(null);
      setOriginPreviewPending(false);
      return;
    }
    setOriginPreviewPending(true);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const preview = engineRef.current?.previewWorldOrigin(seed, worldOptions, originSearchRadius) ?? null;
      if (!cancelled) {
        setOriginPreview(preview);
        setOriginPreviewPending(false);
      }
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeCharacterProfile.id, originSearchRadius, overlay, seed, worldOptions]);

  useEffect(() => {
    if (hud.mode !== "builder" && inventoryTab === "creative") setInventoryTab("inventory");
  }, [hud.mode, inventoryTab]);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const iconAudit = parameters.get("icon-audit");
    setIconAuditMode(iconAudit === "tomes" ? "tomes"
      : iconAudit === "dragons" ? "dragons"
        : iconAudit === "alchemy" ? "alchemy"
          : iconAudit === "resources" ? "resources"
            : iconAudit === "1" ? "all" : null);
    setHeldAuditMode(parameters.get("held-audit") === "1");
    setSpellWheelAuditMode(parameters.get("spell-wheel-audit") === "empty");
    const inventoryAudit = parameters.get("inventory-audit");
    if (inventoryAudit === "1" || inventoryAudit === "cave-gel" || inventoryAudit === "moonberry-cookie") {
      overlayRef.current = "inventory";
      setOverlayState("inventory");
      if (inventoryAudit === "cave-gel" || inventoryAudit === "moonberry-cookie") window.setTimeout(() => setHud((current) => {
        const inventory = [...current.inventory];
        inventory[0] = inventoryAudit === "moonberry-cookie"
          ? { item: Item.MoonberryCookie, count: 16 }
          : { item: Item.CaveGel, count: 16 };
        return { ...current, inventory, selected: 0 };
      }), 250);
    }
    const bestiaryAudit = parameters.get("bestiary-audit");
    if (["1", "filters", "variants", "research", "care", "ammonarch"].includes(bestiaryAudit ?? "")) {
      window.setTimeout(() => {
        overlayRef.current = "bestiary";
        setOverlayState("bestiary");
        setFieldGuideSection("creatures");
        setBestiaryFiltersOpen(bestiaryAudit === "filters");
        if (bestiaryAudit === "ammonarch") {
          setSelectedBestiary("ammonarch");
          setHud((current) => ({
            ...current,
            bestiary: {
              ...current.bestiary,
              ammonarch: { ...current.bestiary.ammonarch, seen: true, firstSeenAt: Date.UTC(2026, 6, 19, 12) },
            },
          }));
        }
        if (["variants", "research", "care"].includes(bestiaryAudit ?? "")) {
          setSelectedBestiary("cragglass-basilisk");
          setBestiaryPageTab(bestiaryAudit as BestiaryPageTab);
          const observedAt = Date.UTC(2026, 6, 18, 14, 30);
          if (bestiaryAudit === "variants") engineRef.current?.primeEncounters.set("prime:cragglass-basilisk:audit", Object.freeze({
            schema: 1,
            anchorId: "prime:cragglass-basilisk:audit",
            kind: "cragglass-basilisk",
            status: "observed",
            entityId: 17,
            firstActivatedAt: observedAt - 7_200_000,
            lastUpdatedAt: observedAt,
            completedRouteVerbs: Object.freeze([PRIME_ROUTE_PROFILES["cragglass-basilisk"][0].id]),
            routeProgress: 1,
          }));
          setHud((current) => ({
            ...current,
            bestiary: {
              ...current.bestiary,
              "cragglass-basilisk": {
                ...current.bestiary["cragglass-basilisk"],
                seen: true,
                captures: 1,
                tames: 1,
                firstSeenAt: observedAt - 86_400_000,
                lastObservedAt: observedAt,
                firstCapturedAt: observedAt - 3_600_000,
                research: { "audit-observation": { id: "audit-observation", title: "Field observation", progress: 1, goal: 1, unlockedAt: observedAt } },
                forms: { "prime:mirror-crown": { id: "prime:mirror-crown", category: "prime", firstRecordedAt: observedAt, sightings: 1 } },
                specimenIds: ["cragglass-basilisk:audit:17"],
                summonOrigins: [],
                guildLinks: ["waykeeper:prime-route"],
                sections: {},
              },
            },
          }));
        }
      }, 250);
    }
    const workstationAudit = parameters.get("workstation-audit");
    setWorkstationAuditMode(workstationAudit === "apiary" || workstationAudit === "morph-loom" || workstationAudit === "orb-rack" || workstationAudit === "healing-station" || workstationAudit === "sugarworks" || workstationAudit === "wheat-mill" ? workstationAudit : null);
    const civicAudit = parameters.get("civic-audit");
    setCivicAuditMode(civicAudit === "atlantian-dialogue" || civicAudit === "atlantian-trade" || civicAudit === "atlantian-settlement" ? civicAudit : null);
  }, []);

  useEffect(() => {
    const controller = createHeldStackPositionController(
      (callback) => window.requestAnimationFrame(callback),
      (frame) => window.cancelAnimationFrame(frame),
    );
    heldStackPositionRef.current = controller;
    controller.attach(heldStackElementRef.current);
    return () => {
      controller.dispose();
      if (heldStackPositionRef.current === controller) heldStackPositionRef.current = null;
    };
  }, []);

  const setHeldStackElement = useCallback((element: HTMLDivElement | null) => {
    heldStackElementRef.current = element;
    heldStackPositionRef.current?.attach(element);
  }, []);

  const visibleCreativeBlocks = useMemo(() => {
    const query = creativeQuery.trim().toLocaleLowerCase();
    if (!query) return CREATIVE_ITEMS;
    return CREATIVE_ITEMS.filter((item) => {
      const definition = ITEMS[item];
      const placeBlock = definition?.placeBlock === undefined ? "" : BLOCKS[definition.placeBlock]?.name ?? "";
      return [definition?.name, definition?.id, definition?.useKind, definition?.toolKind, definition?.equipmentSlot, definition?.rarity, placeBlock, itemPresentationFamily(item)]
        .some((value) => String(value ?? "").toLocaleLowerCase().includes(query));
    });
  }, [creativeQuery]);

  useEffect(() => {
    if (overlay !== "pet") {
      activePetDraftIdRef.current = null;
      return;
    }
    if (hud.activePet && activePetDraftIdRef.current !== hud.activePet.id) {
      activePetDraftIdRef.current = hud.activePet.id;
      setPetNameDraft(hud.activePet.name);
    }
  }, [overlay, hud.activePet]);

  useEffect(() => {
    if (overlay !== "title") return;
    const frame = window.requestAnimationFrame(() => titleContentRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    return () => window.cancelAnimationFrame(frame);
  }, [overlay, titleMenuView]);

  const setTitleMenuView = useCallback((next: TitleMenuView) => {
    titleMenuViewRef.current = next;
    setTitleMenuViewState(next);
  }, []);

  const setOverlay = useCallback((next: Overlay) => {
    if (next === "title") {
      titleMenuViewRef.current = "main";
      setTitleMenuViewState("main");
    }
    overlayRef.current = next;
    setOverlayState(next);
  }, []);

  const showToast = useCallback((message: string, durationMs = 4300) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), durationMs);
  }, []);

  const refreshWorldCatalog = useCallback((storage = worldStorageRef.current) => {
    if (!storage) return;
    const nextWorlds = storage.listWorlds({ sortBy: "lastPlayedAt", direction: "desc" });
    setWorlds(nextWorlds);
    setHasSave(nextWorlds.length > 0);
    setSelectedWorldId((current) => {
      if (current && nextWorlds.some((world) => world.id === current)) return current;
      if (storage.activeWorldId && nextWorlds.some((world) => world.id === storage.activeWorldId)) return storage.activeWorldId;
      return nextWorlds[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let browserStorage: Storage | null = null;
    try { browserStorage = window.localStorage; } catch { /* WorldStorage reports browser storage unavailability. */ }
    const storage = new WorldStorage(browserStorage, new UniverseStorage({ allowSyntheticLocations: agentMode && new URLSearchParams(window.location.search).get("testAdmin") === "1" }));
    const unsubscribeStorage = storage.subscribe(setStorageStatus);
    const characterStore = new CharacterProfileStore(browserStorage);
    characterStoreRef.current = characterStore;
    const selectedCharacter = characterStore.selectedProfile;
    worldStorageRef.current = storage;
    const initialWorlds = storage.listWorlds({ sortBy: "lastPlayedAt", direction: "desc" });
    const initialWorld = initialWorlds.find((world) => world.id === storage.activeWorldId) ?? initialWorlds[0];
    let detectedPreviousEditionData = 0;
    try {
      if (browserStorage) detectedPreviousEditionData = countPreviousEditionLocalStorageRecords(browserStorage);
    } catch { /* Detection is informational and never blocks the TypeScript edition. */ }
    window.queueMicrotask(() => {
      refreshWorldCatalog(storage);
      setCharacterCatalog(characterStore.catalog);
      setMultiplayerName(selectedCharacter.name);
      setPreviousEditionDataCount(detectedPreviousEditionData);
      if (storage.issues.length) setWorldNotice(storage.issues.map((issue) => issue.message).join(" "));
      if (initialWorld) {
        setSelectedWorldId(initialWorld.id);
        setSeed(initialWorld.seed);
        setCurrentWorldSeed(initialWorld.seed);
      }
    });
    let engine: VoxelEngine;
    try {
      engine = new VoxelEngine(canvas, {
        onHud: setHud,
        onSelectedSlot: (selected) => setHud((current) => current.selected === selected ? current : { ...current, selected }),
        onToast: showToast,
        onLockChange: (locked) => {
          if (!agentMode && !locked && startedRef.current && overlayRef.current === null) setOverlay("pause");
        },
        onOverlayRequest: (kind: OverlayKind, key?: string) => {
          if (!startedRef.current) return;
          if (kind === "spell-wheel" && key === "close") {
            setOverlay(null);
            engine.activate();
            return;
          }
          if (kind === "inventory" || kind === "crafting") setInventoryTab(kind === "inventory" ? "inventory" : "recipes");
          if (kind === "bestiary" && key?.startsWith("creature:")) {
            const creatureKind = key.slice("creature:".length) as MobKind;
            if (MOB_DEFS[creatureKind]) {
              setFieldGuideSection("creatures");
              setSelectedBestiary(creatureKind);
            }
          } else if (kind === "bestiary" && key?.startsWith("plant:")) {
            const plantId = key.slice("plant:".length);
            if (PLANTS.some((plant) => plant.id === plantId)) {
              setFieldGuideSection("plants");
              setSelectedPlantId(plantId);
            }
          }
          if (["inventory", "crafting", "furnace", "wheat-mill", "chest", "apiary", "morph-loom", "aquarium", "orb-rack", "healing-station", "waygrid-items", "waygrid-creatures"].includes(kind)) slotInteractionReadyAtRef.current = performance.now() + 180;
          setOverlay(kind as Overlay);
        },
        onDeath: () => undefined,
        onSave: () => {
          activeWorldIdRef.current = engineRef.current?.activeWorldId ?? activeWorldIdRef.current;
          refreshWorldCatalog(storage);
          setSavedPulse(true);
          window.setTimeout(() => setSavedPulse(false), 1300);
        },
        onPersistence: setPersistenceState,
        onMultiplayerWorldReady: (hostSeed) => {
          // Manual exchange returns its answer before the host accepts it. The
          // shell must enter play on the actual snapshot, not on answer creation.
          window.queueMicrotask(() => {
            if (engineRef.current !== engine || engine.multiplayer?.role !== "guest") return;
            activeWorldIdRef.current = null;
            setCurrentWorldSeed(hostSeed);
            setMultiplayerReturn("pause");
            if (!startedRef.current) {
              startedRef.current = true;
              setStarted(true);
              setOverlay(null);
              engine.activate();
            }
          });
        },
        onMultiplayerEnded: (reason) => {
          window.queueMicrotask(async () => {
            if (engineRef.current !== engine) return;
            clearFirstPersonHeldPresentation(engine);
            if (!await engine.quitToTitle()) return;
            engine.previewWorld("WILDERNESS");
            startedRef.current = false;
            setStarted(false);
            activeWorldIdRef.current = null;
            setMultiplayerState(EMPTY_MULTIPLAYER_STATE);
            setMultiplayerRoomCode("");
            setOverlay("title");
            showToast(reason);
          });
        },
        onRendererState: (lost) => setWebglError(lost),
      }, settings, { agentMode, agentTestAdmin: agentMode && new URLSearchParams(window.location.search).get("testAdmin") === "1" });
    } catch {
      window.queueMicrotask(() => setWebglError(true));
      return;
    }
    // React and the engine share one in-memory catalog so browser-local CRUD,
    // autosaves, and play-time accounting cannot diverge or double-commit.
    engine.worldStorage.dispose();
    engine.worldStorage = storage;
    (engine as VoxelEngine & { setCharacterProfile?: (profile: CharacterProfile) => void }).setCharacterProfile?.(selectedCharacter);
    engine.localPlayerModel.setAppearance(selectedCharacter.appearance).setPlayerName(selectedCharacter.name);
    engineRef.current = engine;
    void storage.ready.then(() => {
      if (engineRef.current !== engine) return;
      refreshWorldCatalog(storage);
      if (storage.issues.length) setWorldNotice(storage.issues.map((entry) => entry.message).join(" "));
      const current = storage.listWorlds()[0];
      if (current && !startedRef.current && !agentMode) {
        setSelectedWorldId(storage.activeWorldId ?? current.id);
        setSeed(current.seed); setCurrentWorldSeed(current.seed);
        engine.previewWorld(current.seed);
      }
    });
    const automationWindow = window as Window & {
      render_game_to_text?: () => string;
      advanceTime?: (milliseconds: number) => Promise<void>;
      blockwildAgent?: AgentBrowserBridge;
      set_game_key?: (code: string, down: boolean) => void;
    };
    automationWindow.render_game_to_text = () => engine.renderGameToText();
    automationWindow.set_game_key = (code, down) => engine.setVirtualKey(code, down);
    automationWindow.advanceTime = async (milliseconds: number) => {
      engine.advanceSimulation(milliseconds);
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    };
    if (agentMode) automationWindow.blockwildAgent = createAgentBrowserBridge({
      getStatus: () => {
        const state = engine.getMultiplayerState();
        return {
          connected: state.status === "connected",
          role: state.role,
          roomCode: state.roomCode,
          agentName: engine.multiplayer?.identity.name ?? "Field Drone",
          testAdmin: engine.agentTestAdmin,
        };
      },
      connect: async (roomCode, name) => {
        const result = await engine.joinMultiplayerRoom(roomCode, name);
        if (result.worldReady) {
          startedRef.current = true;
          overlayRef.current = null;
          setStarted(true);
          setOverlayState(null);
          engine.activate();
        }
        return { hostName: result.hostName };
      },
      host: async (roomCode, name) => {
        if (!engine.agentTestAdmin || !engine.agentTestWorld) throw new Error("Create or load an explicit local agent test world before hosting.");
        await engine.createMultiplayerRoom(roomCode, name);
      },
      observe: () => engine.getLatestAgentObservation(),
      latestResult: () => engine.getLatestAgentResult(),
      sendCommand: (command) => engine.submitAgentCommand(command),
      sendChat: (text, channel) => engine.sendMultiplayerChat(text, channel),
      publishVoice: (input) => engine.publishAgentVoice(input),
      worldList: () => engine.listAgentTestWorlds(),
      worldCreate: (input) => engine.createAgentTestWorld({ ...input, options: input.options as Partial<WorldOptions> | undefined }),
      worldLoad: (worldId) => engine.loadAgentTestWorld(worldId),
      worldTransition: (destination) => engine.transitionAgentTestLocation(destination),
      worldExport: (worldId) => engine.exportAgentTestWorld(worldId),
      worldImport: (json) => engine.importAgentTestWorld(json),
      worldDelete: (worldId, confirm) => engine.deleteAgentTestWorld(worldId, confirm),
      diagnosticsStart: (input) => engine.startLocalAgentDiagnostics(input),
      diagnosticsExport: () => engine.exportLocalAgentDiagnostics(),
      diagnosticsStop: () => engine.stopLocalAgentDiagnostics(),
      diagnosticsNoteScreenshot: () => engine.noteLocalAgentScreenshot(),
      diagnosticsNoteFallback: (reason) => engine.noteLocalAgentManualFallback(reason),
      testPause: (paused) => engine.setLocalAgentTestPaused(paused),
      testAdvance: (milliseconds) => engine.advanceLocalAgentTest(milliseconds),
      disconnect: () => engine.disconnectMultiplayer(),
    });
    const auditParameters = new URLSearchParams(window.location.search);
    const mapNavigationAudit = auditParameters.get("map-audit") === "1";
    const waystoneIconAudit = auditParameters.get("waystone-icon-audit") === "1";
    const generatedPoiAudit = auditParameters.get("generated-poi-audit") === "1";
    const chestAudit = auditParameters.get("chest-audit") === "open";
    const caveLiquidAudit = auditParameters.get("cave-liquid-audit") === "1";
    const waterPhysicsAuditMode = auditParameters.get("water-physics-audit");
    const waterPhysicsAudit = waterPhysicsAuditMode === "flow" || waterPhysicsAuditMode === "swim";
    const iceWaterAuditMode = auditParameters.get("ice-water-audit");
    const iceWaterAudit = iceWaterAuditMode === "1" || iceWaterAuditMode === "underwater";
    const oceanFloraAudit = auditParameters.get("ocean-flora-audit") === "1";
    const creatureCollisionAudit = auditParameters.get("mob-collision-audit") === "1";
    const moonfeltAudit = auditParameters.get("moonfelt-audit") === "1";
    const treeFallAudit = auditParameters.get("tree-fall-audit") === "1";
    const agentDroneAudit = auditParameters.get("agent-drone-audit") === "1";
    const cardforgeAuditMode = auditParameters.get("cardforge-audit");
    const cardforgeAudit = cardforgeAuditMode === "1" || cardforgeAuditMode === "battle";
    const settlementOriginAudit = auditParameters.get("origin-audit") === "wood-elf-remote";
    const itemGuideAuditMode = auditParameters.get("item-guide-audit");
    const itemGuideAudit = itemGuideAuditMode === "1" || itemGuideAuditMode === "inventory";
    const placementAuditOverlay: Overlay = mapNavigationAudit || waystoneIconAudit || generatedPoiAudit
      ? "map"
      : itemGuideAuditMode === "inventory"
        ? "inventory"
        : cardforgeAudit ? "cardforge" : null;
    const placementAudit = auditParameters.get("placement-audit") === "1" || mapNavigationAudit || waystoneIconAudit || generatedPoiAudit || chestAudit || caveLiquidAudit || waterPhysicsAudit || iceWaterAudit || oceanFloraAudit || creatureCollisionAudit || moonfeltAudit || treeFallAudit || agentDroneAudit || cardforgeAudit || settlementOriginAudit || itemGuideAudit;
    let treeFallTimer: number | undefined;
    if (placementAudit) {
      void engine.createWorld(
        settlementOriginAudit ? "WOOD-ELF-REMOTE-1" : caveLiquidAudit ? "WILDERNESS" : iceWaterAudit ? "ICE-WATER-AUDIT" : waterPhysicsAudit ? "WATER-PHYSICS-AUDIT" : oceanFloraAudit ? "OCEAN-FLORA-AUDIT" : creatureCollisionAudit ? "MOB-COLLISION-AUDIT" : moonfeltAudit ? "MOONFELT-MYCELIUM-AUDIT" : treeFallAudit ? "TREE-FALL-LIGHT-AUDIT" : generatedPoiAudit ? "GENERATED-POI-METADATA-AUDIT" : cardforgeAudit ? "CARDFORGE-AUDIT" : mapNavigationAudit || waystoneIconAudit ? "MAP-NAVIGATION-AUDIT" : "DIRECTIONAL-PLACEMENT-AUDIT",
        "builder",
        settlementOriginAudit ? {
          ...DEFAULT_WORLD_OPTIONS,
          enabledFactions: ["wood-elves"],
          origin: { mode: "culture-settlement", factionId: "wood-elves", minimumSize: "village" },
          weather: false,
          mobDensity: 0,
          butterflyDensity: 0,
        } : generatedPoiAudit ? {
          ...DEFAULT_WORLD_OPTIONS,
          origin: { mode: "wilderness" },
          weather: false,
          mobDensity: 0,
          butterflyDensity: 0,
        } : { structures: false, weather: false, mobDensity: 0, butterflyDensity: 0 },
        settlementOriginAudit ? "Remote Wood Elf Origin Audit" : caveLiquidAudit ? "Cave Liquid Audit" : iceWaterAudit ? "Ice Water Audit" : waterPhysicsAudit ? "Water Physics Audit" : oceanFloraAudit ? "Ocean Flora Audit" : creatureCollisionAudit ? "Creature Collision Audit" : moonfeltAudit ? "Moonfelt Mycelium Audit" : treeFallAudit ? "Tree Fall Light Audit" : generatedPoiAudit ? "Generated POI Metadata Audit" : cardforgeAudit ? "Cardforge Audit" : mapNavigationAudit || waystoneIconAudit ? "Map Navigation Audit" : "Directional Placement Audit",
        settlementOriginAudit ? MAX_SETTLEMENT_ORIGIN_SEARCH_RADIUS : DEFAULT_SETTLEMENT_ORIGIN_SEARCH_RADIUS,
      ).then((created) => {
      if (!created || engineRef.current !== engine) return;
      const auditMarkerId = mapNavigationAudit || waystoneIconAudit ? engine.primeMapNavigationAudit(auditParameters.get("far-track") === "1", waystoneIconAudit) : null;
      if (generatedPoiAudit) engine.primeGeneratedPoiAudit();
      const auditChestKey = !mapNavigationAudit && !waystoneIconAudit && !generatedPoiAudit && !caveLiquidAudit && !waterPhysicsAudit && !oceanFloraAudit && !creatureCollisionAudit && !moonfeltAudit && !treeFallAudit && !agentDroneAudit && !cardforgeAudit && !settlementOriginAudit && !itemGuideAudit ? engine.primeDirectionalPlacementAudit() : null;
      if (caveLiquidAudit) engine.primeCaveLiquidAudit();
      if (waterPhysicsAudit) engine.primeWaterPhysicsAudit(waterPhysicsAuditMode);
      if (iceWaterAudit) engine.primeIceWaterAudit(iceWaterAuditMode === "underwater");
      if (oceanFloraAudit) engine.primeOceanFloraAudit();
      if (creatureCollisionAudit) engine.primeCreatureCollisionAudit();
      if (moonfeltAudit) engine.primeMoonfeltMyceliumAudit();
      const treeFallRoot = treeFallAudit ? engine.primeTreeFallAudit() : null;
      if (treeFallRoot) treeFallTimer = window.setTimeout(() => {
        engine.tryFellTree(treeFallRoot.x, treeFallRoot.y, treeFallRoot.z, BlockId.WildwoodLog);
      }, 900);
      if (agentDroneAudit) engine.primeAgentDroneAudit();
      if (chestAudit && auditChestKey) engine.primeOpenChestAudit(auditChestKey);
      startedRef.current = true;
      overlayRef.current = placementAuditOverlay;
      if (cardforgeAudit) {
        engine.primeCardforgeAudit(cardforgeAuditMode === "battle");
        engine.openCardforge();
      }
      window.queueMicrotask(() => {
        setStarted(true);
        setOverlayState(placementAuditOverlay);
        if (auditMarkerId) {
          setSelectedMapMarkerId(auditMarkerId);
          setTrackedNavigationId(auditMarkerId);
        }
        if (itemGuideAudit) {
          setItemGuideItem(Item.Stick);
          setItemGuideCategory("item");
          setItemGuideVisible(true);
        }
      });
      });
    } else if (agentMode) {
      engine.previewWorld("AGENT-CLIENT-PREVIEW");
      overlayRef.current = "multiplayer";
      window.queueMicrotask(() => {
        setMultiplayerReturn("title");
        setMultiplayerName(new URLSearchParams(window.location.search).get("agentName")?.slice(0, 32) || "Field Drone");
        setOverlayState("multiplayer");
      });
    } else if (initialWorld) engine.previewWorld(initialWorld.seed);
    return () => {
      unsubscribeStorage();
      window.clearTimeout(toastTimerRef.current);
      if (treeFallTimer !== undefined) window.clearTimeout(treeFallTimer);
      engine.dispose();
      engineRef.current = null;
      worldStorageRef.current = null;
      characterStoreRef.current = null;
      delete automationWindow.render_game_to_text;
      delete automationWindow.advanceTime;
      delete automationWindow.blockwildAgent;
      delete automationWindow.set_game_key;
    };
    // The engine owns its listeners for the lifetime of the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentMode, refreshWorldCatalog, setOverlay, showToast]);

  useEffect(() => {
    const stored = readSettings();
    setSettingsState(stored);
    engineRef.current?.setSettings(stored);
  }, []);

  useEffect(() => {
    if (!telemetryRunning) return;
    const sample = () => {
      const engine = engineRef.current;
      if (!engine) return;
      telemetryLogRef.current.record(engine.performanceTelemetrySnapshot());
      setTelemetrySamples(telemetryLogRef.current.sampleCount);
      if (telemetryLogRef.current.hasReachedLimit(settings.debugTelemetryMaxMinutes)) {
        const report = telemetryLogRef.current.stop("time-limit");
        if (report) downloadResourceTelemetryReport(report);
        setTelemetryRunning(false);
      }
    };
    sample();
    const interval = window.setInterval(sample, 1000);
    return () => window.clearInterval(interval);
  }, [settings.debugTelemetryMaxMinutes, telemetryRunning]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(UI_PREFERENCES_KEY) ?? "null") as unknown;
      if (stored) setUiPreferencesState(sanitizeUiPreferences(stored));
    } catch { /* UI preferences remain session-local when browser storage is unavailable. */ }

    const coarsePrimary = window.matchMedia("(pointer: coarse)");
    const hoverNone = window.matchMedia("(hover: none)");
    const anyFine = window.matchMedia("(any-pointer: fine)");
    const refreshCapabilities = () => setInputCapabilities((current) => ({
      ...current,
      coarsePrimary: coarsePrimary.matches,
      hoverNone: hoverNone.matches,
      anyFine: anyFine.matches,
    }));
    const rememberPrimaryPointer = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      const primaryPointer: PrimaryPointerKind = event.pointerType === "touch" || event.pointerType === "pen" || event.pointerType === "mouse"
        ? event.pointerType
        : "unknown";
      setInputCapabilities((current) => current.primaryPointer === primaryPointer ? current : { ...current, primaryPointer });
    };

    refreshCapabilities();
    coarsePrimary.addEventListener("change", refreshCapabilities);
    hoverNone.addEventListener("change", refreshCapabilities);
    anyFine.addEventListener("change", refreshCapabilities);
    window.addEventListener("pointerdown", rememberPrimaryPointer, true);
    return () => {
      coarsePrimary.removeEventListener("change", refreshCapabilities);
      hoverNone.removeEventListener("change", refreshCapabilities);
      anyFine.removeEventListener("change", refreshCapabilities);
      window.removeEventListener("pointerdown", rememberPrimaryPointer, true);
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.touchMode = showTouchControls;
  }, [showTouchControls]);

  useEffect(() => {
    const material = engineRef.current?.selection.material;
    if (!material || Array.isArray(material)) return;
    const outline = material as THREE.LineBasicMaterial;
    outline.opacity = uiPreferences.targetOutlineOpacity;
    outline.transparent = uiPreferences.targetOutlineOpacity < 1;
    outline.needsUpdate = true;
  }, [uiPreferences.targetOutlineOpacity]);

  useEffect(() => {
    bestiaryFiltersOpenRef.current = bestiaryFiltersOpen;
    if (!bestiaryFiltersOpen) return;
    const trigger = bestiaryFilterTriggerRef.current;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : trigger;
    const frame = window.requestAnimationFrame(() => {
      const panel = bestiaryFilterPanelRef.current;
      (panel?.querySelector<HTMLElement>("[data-bestiary-filter-option]:not(:disabled)")
        ?? panel?.querySelector<HTMLElement>("button:not(:disabled)"))?.focus();
    });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.code !== "Tab") return;
      const panel = bestiaryFilterPanelRef.current;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>("button:not(:disabled), summary, select, input, [tabindex]:not([tabindex='-1'])")]
        .filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", trapFocus);
      (trigger?.isConnected ? trigger : returnFocus)?.focus();
    };
  }, [bestiaryFiltersOpen]);

  useEffect(() => {
    const referenceForElement = (target: EventTarget | null): ContextReferenceTarget | null => {
      if (!(target instanceof Element)) return null;
      const icon = target.closest<HTMLElement>("[data-item-id]");
      if (!icon) return null;
      const item = Number(icon.dataset.itemId) as ItemCode;
      if (!Number.isFinite(item) || !ITEMS[item]) return null;
      const creatureKind = icon.dataset.creatureKind as MobKind | undefined;
      if (creatureKind && MOB_DEFS[creatureKind]) return { item, field: { kind: "creature", id: creatureKind } };
      const definition = ITEMS[item];
      const plant = plantForBlock(definition?.placeBlock ?? definition?.worldTextureBlock);
      return plant ? { item, field: { kind: "plant", id: plant.id } } : { item };
    };
    const commit = (next: ContextReferenceTarget | null) => {
      const current = contextReferenceRef.current;
      if (current?.item === next?.item && current?.field?.kind === next?.field?.kind && current?.field?.id === next?.field?.id) return;
      contextReferenceRef.current = next;
      setContextReference(next);
    };
    const enter = (event: Event) => commit(referenceForElement(event.target));
    const leave = (event: PointerEvent) => {
      if (referenceForElement(event.relatedTarget)) return;
      commit(null);
    };
    document.addEventListener("pointerover", enter);
    document.addEventListener("pointerout", leave);
    document.addEventListener("focusin", enter);
    return () => {
      document.removeEventListener("pointerover", enter);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("focusin", enter);
    };
  }, []);

  useEffect(() => {
    const handleMenuKeys = (event: KeyboardEvent) => {
      const current = overlayRef.current;
      const engine = engineRef.current;
      if (chatOpenRef.current && event.code === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        chatOpenRef.current = false;
        setChatOpen(false);
        setChatInput("");
        engine?.activate();
        return;
      }
      if (event.code === "Enter" && current === null && startedRef.current && !acceptsTextInput(event.target)) {
        const session = (engine as unknown as MultiplayerEngineApi | null)?.getMultiplayerState?.();
        if (session?.role) {
          event.preventDefault();
          event.stopImmediatePropagation();
          chatOpenRef.current = true;
          setChatOpen(true);
          if (document.pointerLockElement) void document.exitPointerLock();
          window.requestAnimationFrame(() => chatInputRef.current?.focus());
          return;
        }
      }
      if (acceptsTextInput(event.target) && event.code !== "Escape") return;
      if ((event.key === "?" || (event.code === "Slash" && event.shiftKey)) && current && current !== "title" && current !== "new") {
        const reference = contextReferenceRef.current;
        if (!reference) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        setItemGuideItem(reference.item);
        setItemGuideCategory("item");
        setItemGuideVisible(true);
        return;
      }
      if (event.code === "KeyB" && current && current !== "title" && current !== "new") {
        event.preventDefault();
        event.stopImmediatePropagation();
        const field = contextReferenceRef.current?.field;
        if (field?.kind === "plant") {
          setFieldGuideSection("plants");
          setSelectedPlantId(field.id);
        } else {
          setFieldGuideSection("creatures");
          if (field?.kind === "creature") setSelectedBestiary(field.id);
        }
        setOverlay("bestiary");
        return;
      }
      if (event.code === "KeyE" && ["inventory", "crafting", "furnace", "wheat-mill", "chest", "apiary", "aquarium", "orb-rack", "healing-station", "waygrid-items", "waygrid-creatures", "pet"].includes(current ?? "")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        engine?.closeContainer();
        setOverlay(null);
        engine?.activate();
        return;
      }
      if (event.code !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      if (shouldCloseItemGuideOnEscape(event.code, itemGuideOpenRef.current)) {
        setItemGuideVisible(false);
        return;
      }
      if (current === "bestiary" && bestiaryFiltersOpenRef.current) {
        bestiaryFiltersOpenRef.current = false;
        setBestiaryFiltersOpen(false);
        return;
      }
      if (current === "spell-wheel") {
        engine?.closeSpellWheel();
        setOverlay(null);
        return;
      }
      if (current !== null) {
        if (["inventory", "crafting", "furnace", "wheat-mill", "chest", "apiary", "aquarium", "orb-rack", "healing-station", "waygrid-items", "waygrid-creatures", "pet", "dragon", "library", "incubator"].includes(current)) engine?.closeContainer();
        if (startedRef.current) {
          if (current === "pause") { setOverlay(null); engine?.activate(); }
          else if (current === "settings" || current === "help" || current === "bestiary" || current === "multiplayer") setOverlay("pause");
          else { setOverlay(null); engine?.activate(); }
        } else if (current !== "title") setOverlay("title");
        else if (titleMenuViewRef.current !== "main") setTitleMenuView("main");
      } else if (startedRef.current) {
        engine?.pause();
        setOverlay("pause");
      }
    };
    const handleMenuKeyUp = (event: KeyboardEvent) => {
      if (!shouldCloseSpellWheelOnKeyRelease(event.code, overlayRef.current)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const engine = engineRef.current;
      engine?.closeSpellWheel();
      setOverlay(null);
    };
    window.addEventListener("keydown", handleMenuKeys, true);
    window.addEventListener("keyup", handleMenuKeyUp, true);
    return () => {
      window.removeEventListener("keydown", handleMenuKeys, true);
      window.removeEventListener("keyup", handleMenuKeyUp, true);
    };
  }, [setItemGuideVisible, setOverlay, setTitleMenuView]);

  const applyCharacterProfile = (profile: CharacterProfile) => {
    setMultiplayerName(profile.name);
    const engine = engineRef.current;
    if (!engine) return;
    (engine as VoxelEngine & { setCharacterProfile?: (profile: CharacterProfile) => void }).setCharacterProfile?.(profile);
    engine.setPlayerVariant(profile.appearance.sex);
    engine.localPlayerModel.setAppearance(profile.appearance).setPlayerName(profile.name);
  };

  const selectCharacterProfile = (profileId: string) => {
    const store = characterStoreRef.current;
    if (!store) return;
    const profile = store.select(profileId);
    setCharacterCatalog(store.catalog);
    applyCharacterProfile(profile);
  };

  const createCharacterProfile = () => {
    const store = characterStoreRef.current;
    if (!store) return;
    const profile = store.create({ name: `Trailkeeper ${store.catalog.profiles.length + 1}` });
    if (!profile) { showToast("This browser already holds twelve saved characters."); return; }
    setCharacterCatalog(store.catalog);
    applyCharacterProfile(profile);
  };

  const updateCharacterProfile = (profileId: string, patch: Partial<Pick<CharacterProfile, "name" | "appearance" | "startingSkills">>) => {
    const store = characterStoreRef.current;
    if (!store) return;
    const profile = store.update(profileId, patch);
    if (!profile) return;
    setCharacterCatalog(store.catalog);
    if (profile.id === store.catalog.selectedProfileId) applyCharacterProfile(profile);
  };

  const removeCharacterProfile = (profileId: string) => {
    const store = characterStoreRef.current;
    if (!store?.remove(profileId)) return;
    setCharacterCatalog(store.catalog);
    applyCharacterProfile(store.selectedProfile);
  };

  const beginNewWorld = () => {
    const engine = engineRef.current;
    if (engine) setSeed(engine.randomSeed());
    setWorldName(`Untamed World ${worlds.length + 1}`);
    setWorldOptions({ ...DEFAULT_WORLD_OPTIONS, enabledFactions: [...DEFAULT_WORLD_OPTIONS.enabledFactions] });
    setOriginSearchRadius(DEFAULT_SETTLEMENT_ORIGIN_SEARCH_RADIUS);
    setOriginPreview(null);
    setWorldNotice("");
    setOverlay("new");
  };

  const createWorld = async () => {
    const engine = engineRef.current;
    if (!engine || worldActionBusy) return;
    setWorldActionBusy(true);
    prepareFirstPersonHeldPresentation(engine);
    applyCharacterProfile(activeCharacterProfile);
    let created: WorldMetadata | null = null;
    try { created = await engine.createWorld(seed, mode, worldOptions, worldName, originSearchRadius); }
    catch (error) { setWorldNotice(error instanceof Error ? error.message : "Creating this world failed."); }
    finally { setWorldActionBusy(false); }
    const storage = worldStorageRef.current;
    if (created) {
      activeWorldIdRef.current = created.id;
      setSelectedWorldId(created.id);
      refreshWorldCatalog(storage);
    } else {
      activeWorldIdRef.current = null;
      setWorldNotice("The first checkpoint did not commit. Retry when storage is available; no saved-world success was recorded.");
      if (engine.persistent) {
        setCurrentWorldSeed(engine.world.seedText);
        startedRef.current = true; setStarted(true);
        engine.pause(); setOverlay("pause");
      }
      return;
    }
    setCurrentWorldSeed(engine.world.seedText);
    startedRef.current = true;
    setStarted(true);
    setOverlay(null);
    engine.activate();
    showToast("WASD move · Space jump/swim · Shift crouch · Ctrl sprint · V camera · Left harvest/attack · Right use/build · E inventory · Esc menu", 8500);
  };

  const playWorld = async (worldId: string) => {
    const engine = engineRef.current;
    const storage = worldStorageRef.current;
    if (!engine || !storage || worldActionBusy) return;
    setWorldActionBusy(true);
    if (!await engine.loadStoredWorld(worldId)) { setWorldActionBusy(false); setWorldNotice(storage.currentStatus.message); return; }
    const loaded = await storage.loadWorld(worldId, false);
    setWorldActionBusy(false);
    if (!loaded.ok) {
      setWorldNotice(loaded.error.message);
      return;
    }
    prepareFirstPersonHeldPresentation(engine);
    applyCharacterProfile(activeCharacterProfile);
    activeWorldIdRef.current = worldId;
    setSelectedWorldId(worldId);
    setMode(loaded.value.metadata.mode);
    setWorldOptions(loaded.value.options);
    setCurrentWorldSeed(loaded.value.save.seed);
    startedRef.current = true;
    setStarted(true);
    setOverlay(null);
    engine.activate();
    refreshWorldCatalog(storage);
    if (loaded.warnings?.length) setWorldNotice(loaded.warnings.map((warning) => warning.message).join(" "));
    showToast(`Welcome back to ${loaded.value.metadata.name}. The horizon kept going without you.`);
  };

  const continueWorld = () => {
    if (selectedWorldId) playWorld(selectedWorldId);
    else beginNewWorld();
  };

  const selectWorld = (world: WorldMetadata) => {
    const storage = worldStorageRef.current;
    const selected = storage?.setActiveWorld(world.id);
    if (selected && !selected.ok) {
      setWorldNotice(selected.error.message);
      return;
    }
    setSelectedWorldId(world.id);
    setSeed(world.seed);
    setCurrentWorldSeed(world.seed);
    engineRef.current?.previewWorld(world.seed);
  };

  const renameSelectedWorld = async () => {
    const storage = worldStorageRef.current;
    const world = worlds.find((candidate) => candidate.id === selectedWorldId);
    if (!storage || !world) return;
    const name = window.prompt("Rename this browser-local world", world.name);
    if (name === null) return;
    const renamed = await storage.renameWorld(world.id, name);
    if (!renamed.ok) setWorldNotice(renamed.error.message);
    else {
      setWorldNotice(`Renamed to ${renamed.value.name}.`);
      refreshWorldCatalog(storage);
    }
  };

  const duplicateSelectedWorld = async () => {
    const storage = worldStorageRef.current;
    if (!storage || !selectedWorldId) return;
    const duplicated = await storage.duplicateWorld(selectedWorldId);
    if (!duplicated.ok) setWorldNotice(duplicated.error.message);
    else {
      setSelectedWorldId(duplicated.value.id);
      setWorldNotice(`Created ${duplicated.value.name} in this browser.`);
      refreshWorldCatalog(storage);
    }
  };

  const deleteSelectedWorld = async () => {
    const storage = worldStorageRef.current;
    const world = worlds.find((candidate) => candidate.id === selectedWorldId);
    if (!storage || !world || !window.confirm(`Remove “${world.name}” from this browser's world list? Recovery records and original legacy data are retained.`)) return;
    const deleted = await storage.deleteWorld(world.id);
    if (!deleted.ok) setWorldNotice(deleted.error.message);
    else {
      setWorldNotice(`Removed ${deleted.value.name} from the world list. Recovery records were retained.`);
      refreshWorldCatalog(storage);
      const remainingWorlds = storage.listWorlds({ sortBy: "lastPlayedAt", direction: "desc" });
      const nextWorld = remainingWorlds.find((candidate) => candidate.id === storage.activeWorldId) ?? remainingWorlds[0];
      engineRef.current?.previewWorld(nextWorld?.seed ?? "WILDERNESS");
    }
  };

  const exportSelectedWorld = async () => {
    const storage = worldStorageRef.current;
    const world = worlds.find((candidate) => candidate.id === selectedWorldId);
    if (!storage || !world) return;
    const exported = await storage.exportWorld(world.id);
    if (!exported.ok) {
      setWorldNotice(exported.error.message);
      return;
    }
    const blobUrl = URL.createObjectURL(new Blob([exported.value], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = `${world.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "blockwild-world"}.blockwild.json`;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
    setWorldNotice(`Exported ${world.name}. Keep the file somewhere outside this browser.`);
  };

  const downloadRecovery = (json: string, filename: string) => {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; anchor.hidden = true;
    document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const exportLegacyRecovery = async () => {
    const storage = worldStorageRef.current, id = activeWorldIdRef.current ?? selectedWorldId;
    if (!storage || !id) return;
    const result = await storage.exportLegacyBackup(id);
    if (!result.ok) { setWorldNotice(result.error.message); return; }
    downloadRecovery(result.value, "blockwild-exact-legacy-backup.json");
    setWorldNotice("Exported exact legacy source strings and checksums. No browser source was changed.");
  };

  const exportUnsavedSession = () => {
    const engine = engineRef.current;
    if (!engine?.persistent) return;
    const save = engine.serialize(), now = Date.now(), id = engine.activeWorldId ?? crypto.randomUUID();
    const metadata = worlds.find((entry) => entry.id === id) ?? { id, ownership: "host-device", name: "Recovered session", seed: save.seed, mode: save.mode, createdAt: now, updatedAt: now, lastPlayedAt: now, playTimeMs: 0, lastSavedGameVersion: GAME_VERSION };
    downloadRecovery(JSON.stringify({ format: "blockwild-world", version: 1, exportedAt: now, recovery: "Unsaved current-location session, not a committed full universe archive.", world: { version: 1, metadata, options: engine.worldOptions, save } }), "blockwild-unsaved-home-session.blockwild.json");
  };

  const exportPreviousEditionData = () => {
    try {
      const backup = collectPreviousEditionBackup(window.localStorage);
      if (!backup.localStorage.length) {
        setPreviousEditionDataCount(0);
        setWorldNotice("No previous-edition browser records are available to export.");
        return;
      }
      const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = "blockwild-previous-edition-backup-v1.json";
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
      setWorldNotice(`Exported ${backup.localStorage.length} previous-edition browser record${backup.localStorage.length === 1 ? "" : "s"} without changing the source. Rust's internal persistence database is not included; use the Rust edition's world export for that data.`);
    } catch {
      setWorldNotice("Previous-edition browser data is still untouched, but this browser did not allow it to be exported.");
    }
  };

  const importWorld = async (event: ChangeEvent<HTMLInputElement>) => {
    const storage = worldStorageRef.current;
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!storage || !file) return;
    try {
      const imported = await storage.importWorld(await file.text());
      if (!imported.ok) setWorldNotice(imported.error.message);
      else {
        storage.setActiveWorld(imported.value.id);
        setSelectedWorldId(imported.value.id);
        setWorldNotice(`Imported ${imported.value.name} into this browser.`);
        refreshWorldCatalog(storage);
        engineRef.current?.previewWorld(imported.value.seed);
      }
    } catch {
      setWorldNotice("That world file could not be read by this browser.");
    }
  };

  const stopTelemetry = (reason: ResourceTelemetryStopReason = "manual") => {
    const report = telemetryLogRef.current.stop(reason);
    if (report) downloadResourceTelemetryReport(report);
    setTelemetryRunning(false);
    setTelemetrySamples(0);
  };

  const startTelemetry = () => {
    engineRef.current?.beginPerformanceTelemetry();
    telemetryLogRef.current.start();
    setTelemetrySamples(0);
    setTelemetryRunning(true);
  };

  const resume = () => {
    engineRef.current?.closeContainer();
    setOverlay(null);
    engineRef.current?.activate();
  };

  const restUntil = (target: "morning" | "night") => {
    const engine = engineRef.current;
    if (!engine?.sleepUntil(target)) return;
    setOverlay(null);
    engine.activate();
  };

  const saveAndQuit = async () => {
    const engine = engineRef.current;
    if (!engine || worldActionBusy) return;
    setWorldActionBusy(true);
    if (telemetryLogRef.current.running) stopTelemetry("save-and-quit");
    const committed = await engine.quitToTitle();
    setWorldActionBusy(false);
    if (!committed) return;
    clearFirstPersonHeldPresentation(engine);
    startedRef.current = false;
    setStarted(false);
    activeWorldIdRef.current = null;
    setMultiplayerState(EMPTY_MULTIPLAYER_STATE);
    setMultiplayerRoomCode("");
    refreshWorldCatalog();
    setOverlay("title");
  };

  const updateSettings = (change: Partial<GameSettings>) => {
    const next = { ...settings, ...change };
    setSettingsState(next);
    engineRef.current?.setSettings(change);
  };

  const openSettings = (returnTo: "title" | "pause") => {
    setSettingsReturn(returnTo);
    setOverlay("settings");
  };

  const refreshMultiplayerState = useCallback(() => {
    const api = engineRef.current as unknown as MultiplayerEngineApi | null;
    if (!api?.getMultiplayerState) {
      setMultiplayerState((current) => {
        const next = {
          ...EMPTY_MULTIPLAYER_STATE,
          reasons: ["The running engine does not expose the multiplayer session API yet."],
        };
        return multiplayerViewStatesEqual(current, next) ? current : next;
      });
      return;
    }
    try {
      const state = api.getMultiplayerState();
      setMultiplayerState((current) => {
        const next: MultiplayerViewState = {
          supported: state.supported ?? true,
          reasons: Array.isArray(state.reasons) ? state.reasons : [],
          status: typeof state.status === "string" ? state.status : "idle",
          role: state.role === "host" || state.role === "guest" ? state.role : null,
          peers: Array.isArray(state.peers) ? state.peers : [],
          inviteCode: typeof state.inviteCode === "string" ? state.inviteCode : current.inviteCode,
          answerCode: typeof state.answerCode === "string" ? state.answerCode : current.answerCode,
          roomCode: typeof state.roomCode === "string" ? state.roomCode : current.roomCode,
          rendezvousStatus: ["opening", "waiting", "retrying", "exchanging", "connected", "closed", "error"].includes(String(state.rendezvousStatus)) ? state.rendezvousStatus as MultiplayerViewState["rendezvousStatus"] : current.rendezvousStatus,
          error: typeof state.error === "string" ? state.error : null,
          agents: Array.isArray(state.agents) ? state.agents : [],
          chat: Array.isArray(state.chat) ? state.chat : [],
          newestChatSequence: typeof state.newestChatSequence === "number" ? state.newestChatSequence : 0,
          agentTasks: Array.isArray(state.agentTasks) ? state.agentTasks : [],
          agentWaypoints: Array.isArray(state.agentWaypoints) ? state.agentWaypoints : [],
        };
        return multiplayerViewStatesEqual(current, next) ? current : next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMultiplayerState((current) => current.error === message ? current : { ...current, error: message });
    }
  }, []);

  useEffect(() => {
    if (overlay !== "multiplayer" && !started) return;
    refreshMultiplayerState();
    const timer = window.setInterval(refreshMultiplayerState, 650);
    return () => window.clearInterval(timer);
  }, [overlay, refreshMultiplayerState, started]);

  const recordMultiplayerResult = (result: MultiplayerActionResult, key: "inviteCode" | "answerCode") => {
    const code = typeof result === "string" ? result : result?.[key];
    if (code) setMultiplayerState((current) => ({ ...current, [key]: code }));
  };

  const runMultiplayerAction = useCallback(async <T,>(operation: () => Promise<T>) => {
    if (multiplayerFlightRef.current) return { started: false as const };
    setMultiplayerBusy(true);
    try {
      return await runSingleFlight(multiplayerFlightRef, operation);
    } finally {
      setMultiplayerBusy(false);
    }
  }, []);

  const hostMultiplayer = async () => {
    applyCharacterProfile(activeCharacterProfile);
    const api = engineRef.current as unknown as MultiplayerEngineApi | null;
    if (!api?.hostMultiplayer) {
      setMultiplayerState((current) => ({ ...current, error: "Hosting is unavailable in this engine build." }));
      return;
    }
    try {
      const result = await runMultiplayerAction(() => Promise.resolve(api.hostMultiplayer!(multiplayerName.trim() || "Trailkeeper")));
      if (!result.started) return;
      recordMultiplayerResult(result.value, "inviteCode");
      refreshMultiplayerState();
    } catch (error) {
      setMultiplayerState((current) => ({ ...current, error: formatMultiplayerError(error) }));
    }
  };

  const updateUiPreferences = (change: Partial<UiPreferences>) => {
    const next = sanitizeUiPreferences({ ...uiPreferences, ...change });
    setUiPreferencesState(next);
    try { window.localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(next)); } catch { /* Session-only UI preferences. */ }
  };

  const openMultiplayer = (returnTo: "title" | "pause") => {
    setMultiplayerReturn(returnTo);
    setMultiplayerState((current) => ({ ...current, error: null }));
    setOverlay("multiplayer");
  };

  const suggestMultiplayerCode = () => {
    const api = engineRef.current as unknown as MultiplayerEngineApi | null;
    const suggested = api?.suggestMultiplayerRoomCode?.() ?? `WILD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setMultiplayerRoomCode(normalizeMultiplayerRoomCode(suggested));
  };

  const createMultiplayerRoom = async () => {
    applyCharacterProfile(activeCharacterProfile);
    const api = engineRef.current as unknown as MultiplayerEngineApi | null;
    const requestedCode = normalizeMultiplayerRoomCode(multiplayerRoomCode || api?.suggestMultiplayerRoomCode?.() || "");
    if (!requestedCode) {
      setMultiplayerState((current) => ({ ...current, error: "Generate or enter an invite code first." }));
      return;
    }
    if (!api?.createMultiplayerRoom) {
      setMultiplayerState((current) => ({ ...current, error: "One-code hosting is unavailable in this engine build. Use Advanced direct connection below." }));
      return;
    }
    try {
      const result = await runMultiplayerAction(() => api.createMultiplayerRoom!(requestedCode, multiplayerName.trim() || "Trailkeeper"));
      if (!result.started) return;
      const roomCode = normalizeMultiplayerRoomCode(result.value.roomCode);
      setMultiplayerRoomCode(roomCode);
      setMultiplayerState((current) => ({ ...current, roomCode, rendezvousStatus: "waiting", error: null }));
      refreshMultiplayerState();
    } catch (error) {
      setMultiplayerState((current) => ({ ...current, rendezvousStatus: "error", error: formatMultiplayerError(error) }));
    }
  };

  const joinMultiplayerRoom = async () => {
    const api = engineRef.current as unknown as MultiplayerEngineApi | null;
    const roomCode = normalizeMultiplayerRoomCode(multiplayerRoomCode);
    if (!roomCode) {
      setMultiplayerState((current) => ({ ...current, error: "Enter the host's invite code first." }));
      return;
    }
    if (!api?.joinMultiplayerRoom) {
      setMultiplayerState((current) => ({ ...current, error: "One-code joining is unavailable in this engine build. Use Advanced direct connection below." }));
      return;
    }
    applyCharacterProfile(activeCharacterProfile);
    try {
      const flight = await runMultiplayerAction(() => api.joinMultiplayerRoom!(roomCode, multiplayerName.trim() || "Trailkeeper"));
      if (!flight.started) return;
      const result = flight.value;
      setMultiplayerState((current) => ({ ...current, roomCode, rendezvousStatus: "exchanging", error: null }));
      refreshMultiplayerState();
      if (multiplayerReturn === "title" && result.worldReady) {
        if (engineRef.current) prepareFirstPersonHeldPresentation(engineRef.current);
        startedRef.current = true;
        setStarted(true);
        activeWorldIdRef.current = null;
        if (result.seed) setCurrentWorldSeed(result.seed);
        setOverlay(null);
        engineRef.current?.activate();
        showToast(`Joined ${result.hostName}'s world. The host owns this session save.`);
      }
    } catch (error) {
      setMultiplayerState((current) => ({ ...current, rendezvousStatus: "error", error: formatMultiplayerError(error) }));
    }
  };

  const joinMultiplayer = async () => {
    const api = engineRef.current as unknown as MultiplayerEngineApi | null;
    const inviteCode = multiplayerInvite.trim();
    if (!inviteCode) {
      setMultiplayerState((current) => ({ ...current, error: "Paste the host invite code first." }));
      return;
    }
    if (!api?.joinMultiplayer) {
      setMultiplayerState((current) => ({ ...current, error: "Joining is unavailable in this engine build." }));
      return;
    }
    applyCharacterProfile(activeCharacterProfile);
    try {
      const result = await runMultiplayerAction(() => Promise.resolve(api.joinMultiplayer!(inviteCode, multiplayerName.trim() || "Trailkeeper")));
      if (!result.started) return;
      recordMultiplayerResult(result.value, "answerCode");
      refreshMultiplayerState();
    } catch (error) {
      setMultiplayerState((current) => ({ ...current, error: formatMultiplayerError(error) }));
    }
  };

  const acceptMultiplayerAnswer = async () => {
    const api = engineRef.current as unknown as MultiplayerEngineApi | null;
    const answerCode = multiplayerAnswer.trim();
    if (!answerCode) {
      setMultiplayerState((current) => ({ ...current, error: "Paste the guest answer code first." }));
      return;
    }
    if (!api?.acceptMultiplayerAnswer) {
      setMultiplayerState((current) => ({ ...current, error: "Guest answer acceptance is unavailable in this engine build." }));
      return;
    }
    try {
      const result = await runMultiplayerAction(() => Promise.resolve(api.acceptMultiplayerAnswer!(answerCode)));
      if (!result.started) return;
      setMultiplayerAnswer("");
      refreshMultiplayerState();
    } catch (error) {
      setMultiplayerState((current) => ({ ...current, error: formatMultiplayerError(error) }));
    }
  };

  const disconnectMultiplayer = async () => {
    const api = engineRef.current as unknown as MultiplayerEngineApi | null;
    if (!api?.disconnectMultiplayer) {
      setMultiplayerState((current) => ({ ...current, error: "Disconnect is unavailable in this engine build." }));
      return;
    }
    try {
      const wasGuest = multiplayerState.role === "guest";
      const result = await runMultiplayerAction(() => Promise.resolve(api.disconnectMultiplayer!()));
      if (!result.started) return;
      setMultiplayerState(EMPTY_MULTIPLAYER_STATE);
      setMultiplayerRoomCode("");
      setMultiplayerInvite("");
      setMultiplayerAnswer("");
      setMutedDroneVoices(new Set());
      setDroneVoiceVolumes({});
      if (wasGuest && engineRef.current) {
        clearFirstPersonHeldPresentation(engineRef.current);
        if (!await engineRef.current.quitToTitle()) return;
        engineRef.current.previewWorld("WILDERNESS");
        startedRef.current = false;
        setStarted(false);
        activeWorldIdRef.current = null;
        setOverlay("title");
        showToast("Left the host's world. Your local world catalog was not changed.");
        return;
      }
      refreshMultiplayerState();
    } catch (error) {
      setMultiplayerState((current) => ({ ...current, error: formatMultiplayerError(error) }));
    }
  };

  const copyMultiplayerCode = async (code: string) => {
    if (!code) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(code);
      setMultiplayerState((current) => ({ ...current, error: null }));
    } catch {
      window.prompt("Copy this connection code", code);
    }
  };

  const submitChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    const sent = (engineRef.current as unknown as MultiplayerEngineApi | null)?.sendMultiplayerChat?.(text, chatChannel) ?? false;
    if (!sent) {
      setMultiplayerState((current) => ({ ...current, error: "Chat could not be sent. Check the session or wait a moment before retrying." }));
      return;
    }
    setChatInput("");
    chatOpenRef.current = false;
    setChatOpen(false);
    engineRef.current?.activate();
    refreshMultiplayerState();
  };

  const toggleMutedDroneVoice = (agentId: string) => {
    if (!agentId) return;
    const muted = !mutedDroneVoices.has(agentId);
    (engineRef.current as unknown as MultiplayerEngineApi | null)?.setLocalAgentVoiceMuted?.(agentId, muted);
    setMutedDroneVoices((current) => {
      const next = new Set(current);
      if (muted) next.add(agentId);
      else next.delete(agentId);
      return next;
    });
  };

  const setDroneVoiceVolume = (agentId: string, gain: number) => {
    const bounded = Math.max(0, Math.min(1.5, Number(gain) || 0));
    (engineRef.current as unknown as MultiplayerEngineApi | null)?.setLocalAgentVoiceGain?.(agentId, bounded);
    setDroneVoiceVolumes((current) => ({ ...current, [agentId]: bounded }));
  };

  const updateAgent = (operation: (api: MultiplayerEngineApi) => boolean) => {
    const api = engineRef.current as unknown as MultiplayerEngineApi | null;
    if (!api || !operation(api)) return;
    refreshMultiplayerState();
  };

  const handleLookDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    lookPointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const handleLookMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pointer = lookPointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    engineRef.current?.look(dx * 1.25, dy * 1.25);
  };

  const handleLookUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (lookPointerRef.current?.id === event.pointerId) lookPointerRef.current = null;
  };

  const handleVirtualKey = (event: ReactPointerEvent<HTMLButtonElement>, code: string, down: boolean) => {
    event.preventDefault();
    if (down) event.currentTarget.setPointerCapture(event.pointerId);
    engineRef.current?.setVirtualKey(code, down);
  };

  const trackCursor = (event: ReactPointerEvent<HTMLElement>) => {
    if (!hud.cursor) return;
    heldStackPositionRef.current?.track(event.clientX, event.clientY, true);
  };

  const beginInventoryDrag = (event: ReactPointerEvent<HTMLButtonElement>, target?: InventoryDragTarget) => {
    heldStackPositionRef.current?.seed(event.clientX, event.clientY);
    if (!target || !hud.cursor || (event.button !== 0 && event.button !== 2)) return;
    heldStackPositionRef.current?.track(event.clientX, event.clientY, true);
    const key = `${target.area}:${target.index}`;
    inventoryDragRef.current = {
      pointerId: event.pointerId,
      button: event.button === 2 ? "right" : "left",
      targets: [target],
      keys: new Set([key]),
    };
    setInventoryDragRevision((revision) => revision + 1);
  };

  const visitInventoryDrag = (event: ReactPointerEvent<HTMLButtonElement>, target?: InventoryDragTarget) => {
    const gesture = inventoryDragRef.current;
    if (!target || !gesture || gesture.pointerId !== event.pointerId || event.buttons === 0) return;
    const key = `${target.area}:${target.index}`;
    if (gesture.keys.has(key)) return;
    gesture.keys.add(key);
    gesture.targets.push(target);
    setInventoryDragRevision((revision) => revision + 1);
  };

  const armTrailingSlotEventSuppression = (event: ReactPointerEvent<HTMLElement>) => {
    suppressSlotClickRef.current = { target: event.currentTarget, at: event.timeStamp };
  };

  const consumeTrailingSlotEvent = (target: EventTarget | null, at: number) => {
    const pending = suppressSlotClickRef.current;
    suppressSlotClickRef.current = null;
    return Boolean(pending && pending.target === target && at >= pending.at && at - pending.at <= 80);
  };

  const takePendingSingleSlotRelease = (target: EventTarget | null) => {
    const pending = pendingSingleSlotReleaseRef.current;
    if (!pending || pending.target !== target) return null;
    window.clearTimeout(pending.timer);
    pendingSingleSlotReleaseRef.current = null;
    return pending;
  };

  const queuePendingSingleSlotRelease = (event: ReactPointerEvent<HTMLElement>, onLeft: (shift: boolean) => void) => {
    const previous = pendingSingleSlotReleaseRef.current;
    if (previous) {
      window.clearTimeout(previous.timer);
      pendingSingleSlotReleaseRef.current = null;
      if (slotInteractionAllowed(slotInteractionReadyAtRef.current)) previous.onLeft(previous.shift);
    }
    const pending = {
      target: event.currentTarget,
      onLeft,
      shift: event.shiftKey,
      timer: 0,
    };
    // A normal click consumes this pending release before the timer runs. The
    // fallback preserves same-slot placement only when a re-rendered overlay
    // prevents the browser from dispatching that trailing click.
    pending.timer = window.setTimeout(() => {
      if (pendingSingleSlotReleaseRef.current !== pending) return;
      pendingSingleSlotReleaseRef.current = null;
      if (slotInteractionAllowed(slotInteractionReadyAtRef.current)) pending.onLeft(pending.shift);
    }, 0);
    pendingSingleSlotReleaseRef.current = pending;
  };

  const finishInventoryDrag = (event: ReactPointerEvent<HTMLElement>, onSingleLeft?: (shift: boolean) => void) => {
    const gesture = inventoryDragRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    inventoryDragRef.current = null;
    setInventoryDragRevision((revision) => revision + 1);
    if (gesture.targets.length < 2) {
      // A held stack released over the same slot is an ordinary click, not a
      // paint gesture. Let the trailing click distinguish a single placement
      // from the second click of collect-all; its zero-delay fallback still
      // commits when an overlay re-render prevents that click from arriving.
      if (gesture.button === "left" && onSingleLeft) {
        queuePendingSingleSlotRelease(event, onSingleLeft);
      }
      return;
    }
    // A real drag owns its release even when every visited slot rejected the
    // stack. Letting the trailing click escape would place into the final slot
    // and make ordinary click placement feel intermittently broken.
    engineRef.current?.distributeCursorAcrossSlots(gesture.targets, gesture.button);
    armTrailingSlotEventSuppression(event);
  };

  const cancelInventoryDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (inventoryDragRef.current?.pointerId !== event.pointerId) return;
    inventoryDragRef.current = null;
    setInventoryDragRevision((revision) => revision + 1);
  };

  const inventoryDragPreview = useMemo(() => {
    const gesture = inventoryDragRef.current;
    if (!gesture || !hud.cursor) return null;
    const sourceSlots = gesture.targets.map((target) => target.area === "inventory"
      ? hud.inventory[target.index] ?? null
      : hud.craftGrid[target.index] ?? null);
    const distribution = distributeInventoryCursor(hud.cursor, sourceSlots, gesture.button);
    return {
      revision: inventoryDragRevision,
      cursor: distribution.cursor,
      moved: distribution.moved,
      slots: new Map(gesture.targets.map((target, index) => [`${target.area}:${target.index}`, distribution.slots[index] ?? null])),
    };
  }, [hud.craftGrid, hud.cursor, hud.inventory, inventoryDragRevision]);
  const inventoryDisplayCursor = inventoryDragPreview ? inventoryDragPreview.cursor : hud.cursor;

  const slotAction = (index: number, button: "left" | "right", shift = false) => engineRef.current?.inventoryClick(index, button, shift);
  const slotContext = (event: ReactMouseEvent, action: () => void) => {
    event.preventDefault();
    if (consumeTrailingSlotEvent(event.currentTarget, event.timeStamp)) return;
    if (!slotInteractionAllowed(slotInteractionReadyAtRef.current)) return;
    action();
  };

  const renderSlot = (
    slot: InventorySlot | null,
    key: string,
    onLeft: (shift: boolean) => void,
    onRight: () => void,
    className = "",
    label?: string,
    dragTarget?: InventoryDragTarget,
  ) => {
    const dragKey = dragTarget ? `${dragTarget.area}:${dragTarget.index}` : null;
    const previewing = Boolean(dragKey && inventoryDragPreview?.slots.has(dragKey));
    const displaySlot = previewing ? inventoryDragPreview!.slots.get(dragKey!) ?? null : slot;
    return (
    <button
      type="button"
      key={key}
      className={`mc-slot ${className}${previewing ? " drag-preview" : ""}`}
      title={itemHoverText(displaySlot, label)}
      aria-label={displaySlot ? `${itemHoverText(displaySlot)}, ${displaySlot.count}` : label ?? "Empty slot"}
      data-inventory-drag-target={dragKey ?? undefined}
      onPointerDown={(event) => beginInventoryDrag(event, dragTarget)}
      onPointerEnter={(event) => visitInventoryDrag(event, dragTarget)}
      onPointerUp={(event) => finishInventoryDrag(event, onLeft)}
      onPointerCancel={cancelInventoryDrag}
      onClick={(event) => {
        const pendingRelease = takePendingSingleSlotRelease(event.currentTarget);
        if (pendingRelease) {
          if (!slotInteractionAllowed(slotInteractionReadyAtRef.current)) return;
          if (event.detail >= 2) engineRef.current?.collectMatching(slot?.item ?? hud.cursor?.item);
          else pendingRelease.onLeft(event.shiftKey);
          return;
        }
        if (consumeTrailingSlotEvent(event.currentTarget, event.timeStamp)) return;
        if (!slotInteractionAllowed(slotInteractionReadyAtRef.current)) return;
        if (event.detail >= 2) engineRef.current?.collectMatching(slot?.item ?? hud.cursor?.item);
        else onLeft(event.shiftKey);
      }}
      onContextMenu={(event) => slotContext(event, onRight)}
    >
      <SlotContents slot={displaySlot} />
      {previewing && <span className="inventory-drag-preview-mark" aria-hidden="true" />}
    </button>
    );
  };

  const renderPlayerInventory = (showPackActions = false) => (
    <div className="player-inventory-section">
      <div className="inventory-grid-heading"><span className="grid-label">INVENTORY</span>{showPackActions && <button type="button" className="inventory-utility-button" onClick={() => engineRef.current?.sortPack()}>Sort pack</button>}</div>
      <div className="mc-grid main-inventory-grid">
        {hud.inventory.slice(9, 36).map((slot, offset) => renderSlot(slot, `main-${offset}`, (shift) => slotAction(offset + 9, "left", shift), () => slotAction(offset + 9, "right"), "", undefined, { area: "inventory", index: offset + 9 }))}
      </div>
      <div className="mc-grid inventory-hotbar-grid">
        {hud.inventory.slice(0, 9).map((slot, index) => renderSlot(slot, `inv-hot-${index}`, (shift) => slotAction(index, "left", shift), () => slotAction(index, "right"), hud.selected === index ? "selected" : "", undefined, { area: "inventory", index }))}
      </div>
    </div>
  );

  const workstationClick = (machine: WorkstationOverlay, index: number, button: "left" | "right", shift = false) => {
    const api = engineRef.current as unknown as WorkstationEngineApi | null;
    api?.machineClick?.(machine, index, button, shift);
  };

  const renderApiaryPanel = (source: ApiaryHudState | null | undefined, audit = false) => {
    const apiary = normalizeApiaryUiState(source);
    const productionPercent = Math.round(apiary.productionProgress * 100);
    return (
      <section className={`menu-overlay inventory-overlay workstation-overlay apiary-overlay ${audit ? "workstation-audit-overlay" : ""}`} aria-labelledby="apiary-title" onPointerMove={trackCursor}>
        <div className="mc-window workstation-window apiary-window">
          <header className="mc-window-header workstation-header">
            <div><span className="panel-eyebrow">WILDWOOD APIARY · COLONY JOURNAL</span><h2 id="apiary-title">Apiary</h2></div>
            {!audit && <button type="button" className="panel-close" onClick={resume} aria-label="Close apiary">×</button>}
          </header>
          <div className="apiary-workspace">
            <section className={`apiary-queen ${apiary.queenPresent ? "resident" : "vacant"}`} aria-label={apiary.queenPresent ? `${apiary.queenName} is present` : "No queen present"}>
              <div className="apiary-bee-portrait" aria-hidden="true"><i /><b /><span>♛</span></div>
              <div className="apiary-queen-copy"><small>QUEEN</small><strong>{apiary.queenName}</strong><span>{apiary.queenPresent ? "The colony is organized. Her exact orb can leave without losing workers or stores." : "Place a captured neutral or bonded Hive Queen here to wake the colony."}</span></div>
              <div className="workstation-transfer-slot">
                {renderSlot(apiary.slots[0], "apiary-queen-slot", (shift) => workstationClick("apiary", 0, "left", shift), () => workstationClick("apiary", 0, "right"), "machine-slot", "Hive Queen capture orb")}
                <small>QUEEN CAPTURE ORB</small>
              </div>
              {apiary.queenDisplayAvailable && <button type="button" className={`apiary-flight-toggle ${apiary.queenDisplayEnabled ? "active" : ""}`} aria-pressed={apiary.queenDisplayEnabled} onClick={() => (engineRef.current as unknown as WorkstationEngineApi | null)?.toggleApiaryQueenDisplay?.()}><span aria-hidden="true">{apiary.queenDisplayEnabled ? "◉" : "○"}</span><strong>Queen flight</strong><small>{apiary.queenDisplayEnabled ? "Visible above hive" : "Hidden by default"}</small></button>}
            </section>

            <section className="apiary-colony" aria-label={`${apiary.workerCount} of ${apiary.maxWorkers} worker bees`}>
              <div className="apiary-section-heading"><span><small>WORKER FLIGHT</small><strong>{apiary.workerCount}/{apiary.maxWorkers}</strong></span><em>{apiary.workerCount === apiary.maxWorkers ? "FULL COLONY" : `${apiary.maxWorkers - apiary.workerCount} OPEN`}</em></div>
              <div className="worker-honeycomb" aria-hidden="true">
                {Array.from({ length: apiary.maxWorkers }, (_, index) => <span key={index} className={index < apiary.workerCount ? "active" : ""}><i /></span>)}
              </div>
              <div className="apiary-worker-slots" aria-label="Friendly worker bee transfer slots">
                {Array.from({ length: apiary.maxWorkers }, (_, index) => renderSlot(
                  apiary.slots[index + 3] ?? null,
                  `apiary-worker-${index}`,
                  (shift) => workstationClick("apiary", index + 3, "left", shift),
                  () => workstationClick("apiary", index + 3, "right"),
                  "machine-slot apiary-worker-slot",
                  `Worker bee ${index + 1}`,
                ))}
              </div>
              <div className="nectar-return-status"><span className="nectar-drop" aria-hidden="true" /><div><small>NECTAR RETURN</small><strong>{apiary.nectarStatus}</strong></div></div>
            </section>

            <section className="apiary-yield" aria-label="Apiary stores">
              <div className="apiary-resource honey-resource">
                <div className="apiary-jar" aria-hidden="true"><span style={{ height: `${apiary.honey / apiary.honeyMax * 100}%` }} /></div>
                <div><small>HONEY</small><strong>{apiary.honey}<b>/{apiary.honeyMax}</b></strong></div>
                {renderSlot(apiary.slots[1], "apiary-honey-slot", (shift) => workstationClick("apiary", 1, "left", shift), () => workstationClick("apiary", 1, "right"), "machine-slot apiary-output-slot", "Honey output")}
              </div>
              <div className="apiary-resource jelly-resource">
                <div className="apiary-jar" aria-hidden="true"><span style={{ height: `${apiary.royalJelly / apiary.royalJellyMax * 100}%` }} /></div>
                <div><small>ROYAL JELLY</small><strong>{apiary.royalJelly}<b>/{apiary.royalJellyMax}</b></strong></div>
                {renderSlot(apiary.slots[2], "apiary-jelly-slot", (shift) => workstationClick("apiary", 2, "left", shift), () => workstationClick("apiary", 2, "right"), "machine-slot apiary-output-slot", "Royal jelly output")}
              </div>
            </section>

            <section className="apiary-production" aria-label={`Production ${productionPercent}% complete`}>
              <div><span><small>NEXT HARVEST</small><strong>{apiary.queenPresent ? `${productionPercent}% complete` : "Colony dormant"}</strong></span><em>{apiary.workerCount ? "FLOWER-LED · EVENT DRIVEN" : apiary.queenPresent ? "QUEEN STARTING A COLONY" : "ADD A QUEEN"}</em></div>
              <span className="apiary-progress-track"><i style={{ width: `${productionPercent}%` }} /></span>
              <div className="apiary-growth-line"><span><small>NEXT WORKER</small><strong>{apiary.workerCount >= apiary.maxWorkers ? "Colony at capacity" : apiary.queenPresent ? `${Math.round(apiary.workerGrowthProgress * 100)}% incubated` : "Waiting for queen"}</strong></span><em>{apiary.workerCount >= apiary.maxWorkers ? "8 WORKERS" : "QUEEN-LED GROWTH"}</em></div>
              <span className="apiary-progress-track worker-growth"><i style={{ width: `${apiary.workerGrowthProgress * 100}%` }} /></span>
            </section>
          </div>
          {!audit && renderPlayerInventory()}
          {audit && <p className="workstation-audit-note">Production preview · inventory transfer slots use the same left, right, double, and shift-click rules as other containers.</p>}
        </div>
        {!audit && hud.cursor && <div ref={setHeldStackElement} className="held-stack"><SlotContents slot={hud.cursor} /></div>}
      </section>
    );
  };

  const renderMorphLoomPanel = (source: OrbMorphLoomHudState | null | undefined, audit = false) => {
    if (!source) return null;
    const progressPercent = Math.round(normalizedProgress(source.progress) * 100);
    const active = Boolean(source.activeJob);
    const ready = Boolean(source.inputOrb?.creature?.kind === "mossling" && source.moonberries >= 4 && source.starCrystals >= 1 && !source.outputOrb);
    const api = engineRef.current as unknown as WorkstationEngineApi | null;
    return (
      <section className={`menu-overlay inventory-overlay workstation-overlay morph-loom-overlay ${audit ? "workstation-audit-overlay" : ""}`} aria-labelledby="morph-loom-title" onPointerMove={trackCursor}>
        <div className="mc-window workstation-window morph-loom-window">
          <header className="mc-window-header workstation-header">
            <div><span className="panel-eyebrow">WAYKEEPER CHRYSALIS LOOM · LIVING PATTERNWORK</span><h2 id="morph-loom-title">Root a Moonbrawn</h2></div>
            {!audit && <button type="button" className="panel-close" onClick={resume} aria-label="Close Chrysalis Loom">×</button>}
          </header>
          <div className="morph-loom-workspace">
            <section className="morph-loom-story">
              <small>PATTERN 01 · GROVE KIN</small>
              <h3>Mossling → Moonbrawn Mossling</h3>
              <p>The loom changes the creature held inside one exact Capture Orb. Its bond, owner, name, and orb identity remain intact.</p>
              <div className="morph-loom-cost-note"><span>48 seconds</span><span>Scales by morph complexity</span><span>Safe to cancel</span></div>
            </section>
            <section className={`morph-loom-chamber ${active ? "active" : source.outputOrb ? "complete" : ready ? "ready" : "idle"}`} aria-label={`Morph chamber ${active ? `${progressPercent}% complete` : source.outputOrb ? "complete" : ready ? "ready" : "idle"}`}>
              <div className="morph-loom-ring" aria-hidden="true"><i /><b /><span /></div>
              <div className="morph-loom-orb-input">
                {renderSlot(source.inputSlot, "morph-loom-input", (shift) => workstationClick("morph-loom", 0, "left", shift), () => workstationClick("morph-loom", 0, "right"), "machine-slot morph-orb-slot", "Mossling Capture Orb")}
                <small>MOSSLING ORB</small>
              </div>
              <div className="morph-loom-transit" aria-hidden="true"><i /><i /><i /><strong>✦</strong></div>
              <div className="morph-loom-orb-output">
                {renderSlot(source.outputSlot, "morph-loom-output", (shift) => workstationClick("morph-loom", 3, "left", shift), () => workstationClick("morph-loom", 3, "right"), "machine-slot morph-orb-slot output", "Moonbrawn Mossling Capture Orb")}
                <small>MOONBRAWN ORB</small>
              </div>
            </section>
            <section className="morph-loom-resources" aria-label="Morph resources">
              <div><span className="morph-resource-swatch jelly" aria-hidden="true">●</span><div><small>ROOTHEART NOURISHMENT</small><strong>Moonberries</strong><span>{source.moonberries}/64 stored · 4 required</span></div>{renderSlot(source.moonberries ? { item: Item.Berry, count: source.moonberries } : null, "morph-berries", (shift) => workstationClick("morph-loom", 1, "left", shift), () => workstationClick("morph-loom", 1, "right"), "machine-slot", "Moonberry nourishment")}</div>
              <div><span className="morph-resource-swatch crystal" aria-hidden="true">✦</span><div><small>PATTERN ANCHOR</small><strong>Star Crystal</strong><span>{source.starCrystals}/64 stored · 1 required</span></div>{renderSlot(source.starCrystals ? { item: Item.CrystalShard, count: source.starCrystals } : null, "morph-crystal", (shift) => workstationClick("morph-loom", 2, "left", shift), () => workstationClick("morph-loom", 2, "right"), "machine-slot", "Star Crystal focus")}</div>
              {source.legacyRoyalJelly > 0 && <div><span className="morph-resource-swatch jelly" aria-hidden="true">◇</span><div><small>LEGACY RECOVERY</small><strong>Royal Jelly</strong><span>{source.legacyRoyalJelly} stored · no longer consumed here</span></div>{renderSlot({ item: Item.RoyalJelly, count: source.legacyRoyalJelly }, "morph-legacy-jelly", (shift) => workstationClick("morph-loom", 4, "left", shift), () => workstationClick("morph-loom", 4, "right"), "machine-slot", "Recover legacy Royal Jelly")}</div>}
            </section>
            <section className="morph-loom-controls">
              <div><span><small>{active ? "CHRYSALIS TURNING" : source.outputOrb ? "PATTERN COMPLETE" : "PATTERN READINESS"}</small><strong>{active ? `${progressPercent}% · ${Math.max(0, Math.ceil((source.activeJob?.durationSeconds ?? 0) - (source.activeJob?.progressSeconds ?? 0)))}s remaining` : source.outputOrb ? "Collect the Moonbrawn orb" : ready ? "All inputs are ready" : "Add a Mossling orb, Moonberries, and Star Crystal"}</strong></span><em>{source.completedMorphs} completed</em></div>
              <span className="morph-progress"><i style={{ width: `${progressPercent}%` }} /></span>
              <div className="morph-loom-actions"><PixelButton className="gold-button" disabled={audit || active || !ready} onClick={() => api?.startActiveOrbMorph?.()}>Begin morph</PixelButton><PixelButton className="secondary-button" disabled={audit || !active} onClick={() => api?.cancelActiveOrbMorph?.()}>Cancel safely</PixelButton></div>
            </section>
          </div>
          {!audit && renderPlayerInventory()}
          {audit && <p className="workstation-audit-note">A grounded glass cradle, a clearly readable transformation, and reversible inputs keep the machine legible before spectacle.</p>}
        </div>
        {!audit && hud.cursor && <div ref={setHeldStackElement} className="held-stack"><SlotContents slot={hud.cursor} /></div>}
      </section>
    );
  };

  const renderOrbStationPanel = (machine: "orb-rack" | "healing-station", source: OrbRackHudState | HealingStationHudState | null | undefined, audit = false) => {
    const healing = machine === "healing-station";
    const healer = healing ? source as HealingStationHudState | null | undefined : null;
    const slots = Array.from({ length: healing ? 4 : 8 }, (_, index) => source?.slots?.[index] ?? null);
    const gelUnits = boundedInteger(healer?.gelUnits, 0, 64);
    const gelFuelSeconds = Math.max(0, finiteNumber(healer?.gelFuelSeconds));
    const gelFuelMaxSeconds = Math.max(1, finiteNumber(healer?.gelFuelMaxSeconds, 600));
    const fuelActive = healer?.fuelActive === true && gelFuelSeconds > 0;
    const fuelMinutes = Math.floor(gelFuelSeconds / 60);
    const fuelSeconds = Math.floor(gelFuelSeconds % 60);
    const activeFuelLabel = `${fuelMinutes}:${String(fuelSeconds).padStart(2, "0")}`;
    const title = healing ? "Healing Station" : "Capture Orb Rack";
    const titleId = healing ? "healing-station-title" : "orb-rack-title";
    return (
      <section className={`menu-overlay inventory-overlay workstation-overlay orb-station-overlay ${healing ? "healing-station-overlay" : "orb-rack-overlay"} ${audit ? "workstation-audit-overlay" : ""}`} aria-labelledby={titleId} onPointerMove={trackCursor}>
        <div className={`mc-window workstation-window orb-station-window ${healing ? "healing-station-window" : "orb-rack-window"}`}>
          <header className="mc-window-header workstation-header">
            <div><span className="panel-eyebrow">{healing ? `RESTORATIVE FIELD LAB · ${gelUnits}/64 GEL BUFFER${fuelActive ? ` · ${activeFuelLabel} ACTIVE` : ""}` : "WAYKEEPER DISPLAY · EIGHT PRESERVED SPECIMENS"}</span><h2 id={titleId}>{title}</h2></div>
            {!audit && <button type="button" className="panel-close" onClick={resume} aria-label={`Close ${title.toLocaleLowerCase()}`}>×</button>}
          </header>
          {healing && <div className="healing-gel-status" aria-label={`${gelUnits} of 64 Cave Gel units`}>
            <button
              type="button"
              className="healing-gel-slot mc-slot"
              aria-label={`${gelUnits} Cave Gel in Healing Station. Click with Cave Gel to load it; click without a held item to withdraw it.`}
              title="Load Cave Gel here. Left-click an occupied reserve to take the stack, right-click to take one, or shift-click to move it to your pack."
              onClick={(event) => workstationClick("healing-station", -1, "left", event.shiftKey)}
              onContextMenu={(event) => { event.preventDefault(); workstationClick("healing-station", -1, "right", event.shiftKey); }}
            >
              <ItemIcon item={Item.CaveGel} small />
              {gelUnits > 0 && <span className="item-count">{gelUnits}</span>}
            </button>
            <span className="healing-gel-meter" aria-hidden="true"><i style={{ width: `${fuelActive ? gelFuelSeconds / gelFuelMaxSeconds * 100 : gelUnits / 64 * 100}%` }} /></span>
            <div><small>CAVE GEL BUFFER · OPTIONAL</small><strong>{fuelActive ? `10× field active · ${activeFuelLabel} remaining` : gelUnits ? `${gelUnits} full ten-minute charges buffered` : "Free healing remains available"}</strong><p>Every wounded orb receives the normal healing hit once per 20 seconds. Cave Gel makes each hit restore 10 health for 10 minutes of active healing; time pauses whenever no stored creature needs healing.</p></div>
          </div>}
          <div className="orb-specimen-grid">
            {slots.map((slot, index) => {
              const specimen = captureOrbUiState(slot);
              const healingProgress = healingProgressForOrb(slot, healer, index);
              const pulsePercent = Math.round(healingProgress * 100);
              return (
                <article key={`${machine}-${index}`} className={`orb-specimen-card ${specimen.occupied ? "occupied" : specimen.hasOrb ? "ready" : "empty"} ${specimen.hostile ? "hostile" : ""} ${specimen.fullyHealed ? "fully-healed" : ""}`}>
                  <div className="orb-card-slot"><span>{String(index + 1).padStart(2, "0")}</span>{renderSlot(slot, `${machine}-${index}`, (shift) => workstationClick(machine, index, "left", shift), () => workstationClick(machine, index, "right"), "machine-slot orb-transfer-slot", `${title} orb slot ${index + 1}`)}</div>
                  <div className="orb-specimen-portrait">
                    {specimen.kind ? <CreaturePortrait kind={specimen.kind} seen mini /> : <span className={`capture-orb-placeholder ${specimen.hasOrb ? "ready" : ""}`} aria-hidden="true"><i /></span>}
                  </div>
                  <div className="orb-specimen-copy">
                    <small>{specimen.occupied ? specimen.kind ? MOB_DEFS[specimen.kind].name.toLocaleUpperCase() : "PRESERVED SPECIMEN" : specimen.hasOrb ? "EMPTY CAPTURE ORB" : "OPEN RACK"}</small>
                    <strong>{specimen.name}</strong>
                    <span>{specimen.occupied ? [specimen.tamed ? "TAMED" : specimen.hostile ? "HOSTILE · SECURED" : "WILD", specimen.baby ? "YOUNG" : "ADULT"].join(" · ") : specimen.hasOrb ? "Ready for a creature" : "Place a capture orb"}</span>
                  </div>
                  {specimen.occupied && specimen.maxHealth > 0 && <div className="orb-health" aria-label={`${specimen.name} health ${formatHudHealth(specimen.health)} of ${formatHudHealth(specimen.maxHealth)}`}><span><i style={{ width: `${specimen.healthProgress * 100}%` }} /></span><b>{formatHudHealth(specimen.health)}/{formatHudHealth(specimen.maxHealth)}</b></div>}
                  {healing && specimen.occupied && <div className={`orb-healing-progress ${specimen.fullyHealed ? "complete" : ""}`} aria-label={specimen.fullyHealed ? `${specimen.name} is fully healed` : `${specimen.name} healing pulse ${pulsePercent}% complete`}><div><small>{specimen.fullyHealed ? specimen.hostile ? "SECURED · FULL HEALTH" : "READY TO RELEASE" : "NEXT HEALING PULSE"}</small><strong>{specimen.fullyHealed ? "100%" : `${pulsePercent}%`}</strong></div><span><i style={{ width: `${pulsePercent}%` }} /></span></div>}
                </article>
              );
            })}
          </div>
          {!audit && renderPlayerInventory()}
          {audit && <p className="workstation-audit-note">Exact creature metadata stays inside each orb. Fully healed hostile specimens remain secured and removable.</p>}
        </div>
        {!audit && hud.cursor && <div ref={setHeldStackElement} className="held-stack"><SlotContents slot={hud.cursor} /></div>}
      </section>
    );
  };

  const arrangeRecipe = (recipeId: string) => {
    const result = engineRef.current?.planRecipe(recipeId) ?? { ok: false, recipeId, reason: "unknown", message: "The crafting engine is not ready." } satisfies RecipePlanResult;
    setRecipeFeedback(result);
    setPreviewRecipeId(recipeId);
  };

  const navigateToIngredientRecipe = (recipeId: string) => {
    setRecipeQuery("");
    setRecipeFeedback(null);
    setPreviewRecipeId(recipeId);
  };

  const openItemGuide = (item?: ItemCode) => {
    if (item !== undefined) {
      setItemGuideItem(item);
      setItemGuideCategory("item");
    } else {
      setItemGuideCategory("system");
      setItemGuideEntryKey("system:getting-started");
    }
    setItemGuideVisible(true);
  };

  const changeSelectedWorldMode = async (nextMode: GameMode) => {
    const storage = worldStorageRef.current;
    const world = worlds.find((candidate) => candidate.id === selectedWorldId);
    if (!storage || !world || world.mode === nextMode) return;
    const nextLabel = gameModeLabel(nextMode);
    if (!window.confirm(`Change “${world.name}” to ${nextLabel} before its next load? World edits and inventory are preserved.`)) return;
    const updated = await storage.updateWorldMode(world.id, nextMode);
    if (!updated.ok) {
      setWorldNotice(updated.error.message);
      return;
    }
    setMode(nextMode);
    setWorldNotice(`${world.name} will load in ${nextLabel}. Inventory and world progress were preserved.`);
    refreshWorldCatalog(storage);
  };

  const openGuideCraftingPattern = (process: ItemGuideProcess) => {
    if (!process.craftingRecipeId) return;
    setRecipeQuery(ITEMS[process.outputItem]?.name ?? process.name);
    setRecipeFeedback(null);
    setPreviewRecipeId(process.craftingRecipeId);
    setInventoryTab("recipes");
    setItemGuideVisible(false);
  };

  const renderItemGuideBoard = (recipe: Recipe) => {
    const cells = recipePreviewGrid(recipe);
    const labels = recipePreviewLabels(recipe);
    const ingredients = recipeIngredientLabels(recipe);
    return (
      <section className="item-guide-board" aria-label={`${recipe.name} item board`}>
        <div className="recipe-board-title"><span>ITEM BOARD</span><small>{recipe.mirrored ? "Mirrored pattern supported" : `${recipe.width}Ã—${recipe.height} pattern`}</small></div>
        <div className="recipe-preview-row">
          <div className="recipe-preview-grid" aria-label={`${recipe.name} crafting pattern`}>
            {cells.map((item, index) => item === 0
              ? <span key={index} className="recipe-preview-slot" aria-label="Empty crafting slot" />
              : <RecipePreviewIngredient key={index} item={item} label={labels[index] ?? ITEMS[item]?.name ?? "Unknown item"} onNavigate={(recipeId) => {
                const ingredientRecipe = RECIPES.find((candidate) => candidate.id === recipeId);
                if (ingredientRecipe) setItemGuideItem(ingredientRecipe.output.item);
              }} />)}
          </div>
          <span className="recipe-preview-arrow" aria-hidden="true" />
          <span className="recipe-preview-output"><ItemIcon item={recipe.output.item} /><b>{recipe.output.count}</b></span>
        </div>
        <div className="recipe-preview-ingredients"><small>NEEDS</small><span>{ingredients.join(" Â· ")}</span></div>
      </section>
    );
  };

  const renderWheatMillPanel = (source: HudState["activeWheatMill"], audit = false) => {
    const progressPercent = Math.min(100, (source?.progressSeconds ?? 0) / WHEAT_MILL_CYCLE_SECONDS * 100);
    const turning = (source?.input?.count ?? 0) > 0 && (source?.output?.count ?? 0) < 64;
    return (
      <section className={`menu-overlay inventory-overlay ${audit ? "workstation-audit-overlay" : ""}`} aria-labelledby="wheat-mill-title" onPointerMove={trackCursor}>
        <div className="mc-window machine-window wheat-mill-window">
          <header className="mc-window-header"><div><span className="panel-eyebrow">HEARTHKIN PANTRY CRAFT</span><h2 id="wheat-mill-title">Wheat Mill</h2></div>{!audit && <button type="button" className="panel-close" onClick={resume}>×</button>}</header>
          <div className="wheat-mill-layout">
            <div className="wheat-mill-slot"><small>GRAIN HOPPER</small>{renderSlot(source?.input ?? null, "wheat-mill-input", (shift) => engineRef.current?.machineClick("wheat-mill", 0, "left", shift), () => engineRef.current?.machineClick("wheat-mill", 0, "right"), "machine-slot", "Wheat input")}</div>
            <div className={`mill-wheel ${turning ? "turning" : ""}`} aria-hidden="true"><span /></div>
            <div className="smelt-progress" aria-label={`Milling ${Math.round(progressPercent)}% complete`}><span style={{ width: `${progressPercent}%` }} /><i aria-hidden="true" /></div>
            <div className="wheat-mill-slot"><small>FLOUR SACK</small>{renderSlot(source?.output ?? null, "wheat-mill-output", (shift) => engineRef.current?.machineClick("wheat-mill", 1, "left", shift), () => engineRef.current?.machineClick("wheat-mill", 1, "right"), "machine-slot furnace-output-slot", "Flour output")}</div>
            <div className="smelt-guide"><strong>PASSIVE MILLING</strong><span>1 Wheat → 1 Flour</span><small>No fuel needed. The runner turns while grain and output room remain.</small></div>
          </div>
          {!audit && renderPlayerInventory()}
          {audit && <p className="workstation-audit-note">One input, one output, one-to-one milling. Each side holds a single stack.</p>}
        </div>
        {!audit && hud.cursor && <div ref={setHeldStackElement} className="held-stack"><SlotContents slot={hud.cursor} /></div>}
      </section>
    );
  };

  const renderGuideProcess = (process: ItemGuideProcess, canOpenPattern = false) => (
    <article key={process.id} className="item-guide-process">
      <header><span>{process.station}</span><strong>{process.name}</strong></header>
      <div className="item-guide-process-flow">
        <div>{process.inputs.map((ingredient, index) => (
          <button type="button" key={`${process.id}-input-${index}`} onClick={() => ingredient.items[0] !== undefined && setItemGuideItem(ingredient.items[0])} title={`Open ${ingredient.label}`}>
            {ingredient.items[0] !== undefined && <ItemIcon item={ingredient.items[0]} small />}
            <span>{ingredient.count}× {ingredient.label}</span>
          </button>
        ))}</div>
        <i aria-hidden="true">→</i>
        <button type="button" className="item-guide-output" onClick={() => setItemGuideItem(process.outputItem)}><ItemIcon item={process.outputItem} small /><span>{process.outputCount}× {ITEMS[process.outputItem]?.name}</span></button>
      </div>
      <p>{process.description}</p>
      {canOpenPattern && process.craftingRecipeId && <button type="button" className="item-guide-pattern-button" onClick={() => openGuideCraftingPattern(process)}>Open pattern board</button>}
    </article>
  );

  const renderItemGuide = () => {
    const filteredItems = ITEM_GUIDE_ENTRIES.filter((entry) => itemGuideMatches(entry, itemGuideQuery));
    const filteredWiki = WIKI_ENTRIES.filter((entry) => entry.category === itemGuideCategory && wikiEntryMatches(entry, itemGuideQuery));
    const selected = ITEM_GUIDE_ENTRIES.find((entry) => entry.item === itemGuideItem) ?? filteredItems[0] ?? ITEM_GUIDE_ENTRIES[0];
    const selectedWiki = WIKI_ENTRIES.find((entry) => entry.key === itemGuideEntryKey && entry.category === itemGuideCategory) ?? filteredWiki[0];
    const activeWikiKey = itemGuideCategory === "item" && selected ? `item:${selected.item}` : selectedWiki?.key;
    const resultCount = itemGuideCategory === "item" ? filteredItems.length : filteredWiki.length;
    const categoryLabels: Readonly<Record<WikiCategory, string>> = { system: "Topics", item: "Items", creature: "Creatures", plant: "Flora", biome: "Biomes" };
    const selectedCraftingProcess = itemGuideCategory === "item" ? selected?.madeBy.find((process) => process.craftingRecipeId) : undefined;
    const selectedRecipe = selectedCraftingProcess?.craftingRecipeId
      ? RECIPES.find((recipe) => recipe.id === selectedCraftingProcess.craftingRecipeId) ?? null
      : null;
    const chooseCategory = (category: WikiCategory) => {
      setItemGuideCategory(category);
      setItemGuideQuery("");
      const first = WIKI_ENTRIES.find((entry) => entry.category === category);
      if (first) {
        setItemGuideEntryKey(first.key);
        if (category === "item") setItemGuideItem(Number(first.key.slice("item:".length)) as ItemCode);
      }
    };
    return (
      <div className="mc-window item-guide-window">
        <header className="mc-window-header"><div><span className="panel-eyebrow">SHARED FIELD REFERENCE · PERSONAL DISCOVERY STAYS IN THE BESTIARY</span><h2 id="item-guide-title">Blockwild Wiki</h2></div><a className="item-guide-web-link" href={activeWikiKey ? `/wiki?entry=${encodeURIComponent(activeWikiKey)}` : "/wiki"} target="_blank" rel="noreferrer">Open web wiki ↗</a><button type="button" className="panel-close" onClick={() => setItemGuideVisible(false)} aria-label="Close Blockwild Wiki">×</button></header>
        <nav className="item-guide-tabs" aria-label="Wiki sections">{WIKI_CATEGORY_ORDER.map((category) => <button type="button" key={category} className={itemGuideCategory === category ? "active" : ""} onClick={() => chooseCategory(category)}>{categoryLabels[category]} <small>{WIKI_ENTRIES.filter((entry) => entry.category === category).length}</small></button>)}</nav>
        <div className="item-guide-layout">
          <aside className="item-guide-index">
            <label><span className="sr-only">Search the Blockwild Wiki</span><input autoFocus type="search" value={itemGuideQuery} onChange={(event) => setItemGuideQuery(event.target.value)} placeholder="Search this section…" /></label>
            <small>{resultCount} {resultCount === 1 ? "entry" : "entries"}</small>
            <div>{itemGuideCategory === "item" ? filteredItems.map((entry) => <button type="button" key={entry.item} className={selected?.item === entry.item ? "active" : ""} onClick={() => { setItemGuideItem(entry.item); setItemGuideEntryKey(`item:${entry.item}`); }}><ItemIcon item={entry.item} small /><span>{entry.name}</span></button>) : filteredWiki.map((entry) => <button type="button" key={entry.key} className={selectedWiki?.key === entry.key ? "active" : ""} onClick={() => setItemGuideEntryKey(entry.key)}>{entry.image ? <WikiPortraitImage className="item-guide-index-portrait" src={entry.image} lazy /> : <i className="item-guide-index-mark" aria-hidden="true">{categoryLabels[entry.category].slice(0, 2).toUpperCase()}</i>}<span>{entry.name}</span></button>)}</div>
          </aside>
          {itemGuideCategory === "item" && selected && <main className="item-guide-detail">
            <header><ItemIcon item={selected.item} /><div><span>ITEM {selected.item}</span><h3>{selected.name}</h3><p>{selected.description}</p></div></header>
            <section><h4>Deterministic origins</h4><ul>{selected.origins.map((origin) => <li key={origin}>{origin}</li>)}</ul></section>
            {selectedRecipe && <>{renderItemGuideBoard(selectedRecipe)}<button type="button" className="item-guide-pattern-button" onClick={() => openGuideCraftingPattern(selectedCraftingProcess!)}>Open and filter in Recipe Book</button></>}
            <section><h4>How to make it</h4>{selected.madeBy.length ? selected.madeBy.map((process) => renderGuideProcess(process, true)) : <p className="item-guide-empty">No manufacturing process is recorded. Follow the origins above.</p>}</section>
            <section><h4>What it makes</h4>{selected.usedIn.length ? selected.usedIn.map((process) => renderGuideProcess(process, true)) : <p className="item-guide-empty">No downstream recipe currently uses this item.</p>}</section>
          </main>}
          {itemGuideCategory !== "item" && selectedWiki && <main className="item-guide-detail item-guide-article">
            <header>{selectedWiki.image ? <WikiPortraitImage className="item-guide-article-portrait" src={selectedWiki.image} /> : <i className="item-guide-article-mark" aria-hidden="true">BW</i>}<div><span>{selectedWiki.eyebrow}</span><h3>{selectedWiki.name}</h3><p>{selectedWiki.summary}</p></div></header>
            {selectedWiki.facts.length > 0 && <dl className="item-guide-facts">{selectedWiki.facts.map((fact) => <div key={`${fact.label}:${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
            {selectedWiki.sections.map((section) => <section key={section.heading}><h4>{section.heading}</h4>{section.paragraphs.map((paragraph, index) => <p key={`${section.heading}:${index}`}>{paragraph}</p>)}</section>)}
            {(selectedWiki.category === "creature" || selectedWiki.category === "plant") && <button type="button" className="item-guide-pattern-button" onClick={() => {
              if (selectedWiki.category === "creature") { setFieldGuideSection("creatures"); setSelectedBestiary(selectedWiki.key.slice("creature:".length) as MobKind); }
              else { setFieldGuideSection("plants"); setSelectedPlantId(selectedWiki.key.slice("plant:".length)); }
              setItemGuideVisible(false);
              setOverlay("bestiary");
            }}>Open personal {selectedWiki.category === "creature" ? "Bestiary record" : "Plant Compendium record"}</button>}
          </main>}
        </div>
      </div>
    );
  };

  const renderRecipeBook = (includeTable: boolean) => {
    const filtered = RECIPES.filter((recipe) => recipeMatchesQuery(recipe, recipeQuery));
    const preview = filtered.find((recipe) => recipe.id === previewRecipeId) ?? filtered[0] ?? null;
    const previewCells = preview ? recipePreviewGrid(preview) : [];
    const previewLabels = preview ? recipePreviewLabels(preview) : [];
    const ingredientLabels = preview ? recipeIngredientLabels(preview) : [];
    return (
      <aside className="recipe-book">
        <section className="recipe-library" aria-label="Recipe list">
          <div className="recipe-book-title"><span aria-hidden="true">▤</span><strong>RECIPE BOOK</strong><small>{filtered.length}/{RECIPES.length}</small><button type="button" onClick={() => openItemGuide(preview?.output.item)}>ITEM WIKI</button></div>
          <label className="recipe-search">
            <span className="sr-only">Search recipes</span>
            <span aria-hidden="true">⌕</span>
            <input type="search" value={recipeQuery} placeholder="Search recipes or materials…" onChange={(event) => { setRecipeQuery(event.target.value); setRecipeFeedback(null); }} />
            {recipeQuery && <button type="button" onClick={() => setRecipeQuery("")} aria-label="Clear recipe search">×</button>}
          </label>
          <div className="recipe-scroll">
            {filtered.map((recipe) => {
              const needsTable = recipe.table && !includeTable;
              return (
                <button
                  type="button"
                  key={recipe.id}
                  className={`recipe-entry ${preview?.id === recipe.id ? "previewing" : ""} ${needsTable ? "needs-table" : ""}`}
                  onMouseEnter={() => setPreviewRecipeId(recipe.id)}
                  onFocus={() => setPreviewRecipeId(recipe.id)}
                  onClick={() => arrangeRecipe(recipe.id)}
                  aria-describedby={preview?.id === recipe.id ? "recipe-book-help" : undefined}
                >
                  <ItemIcon item={recipe.output.item} small />
                  <span><strong>{recipe.name}</strong><small>{recipe.output.count > 1 ? `Makes ${recipe.output.count}` : needsTable ? "Needs crafting table" : recipe.table ? "Crafting table" : "Hand craftable"}</small></span>
                  <b aria-hidden="true">{needsTable ? "▦" : "→"}</b>
                </button>
              );
            })}
          </div>
          <p id="recipe-book-help">Hover or focus to inspect. Click to arrange ingredients on the board.</p>
        </section>
        <section className="recipe-board" aria-label="Selected recipe pattern">
          <div className="recipe-board-title"><span>PATTERN BOARD</span><small>Click never crafts directly</small></div>
          <div className="recipe-plan-preview" aria-live="polite">
            {preview ? (
              <>
                <div className="recipe-preview-copy"><strong>{preview.name}</strong><small>{preview.mirrored ? "Either left or right orientation" : `${preview.width}×${preview.height} shaped recipe`}</small></div>
                <div className="recipe-preview-row">
                  <div className="recipe-preview-grid" aria-label={`${preview.name} crafting pattern`}>
                    {previewCells.map((item, index) => item === 0
                      ? <span key={index} className="recipe-preview-slot" aria-label="Empty crafting slot" />
                      : <RecipePreviewIngredient key={index} item={item} label={previewLabels[index] ?? ITEMS[item]?.name ?? "Unknown item"} onNavigate={navigateToIngredientRecipe} />)}
                  </div>
                  <span className="recipe-preview-arrow" aria-hidden="true" />
                  <span className="recipe-preview-output"><ItemIcon item={preview.output.item} /><b>{preview.output.count}</b></span>
                </div>
                <div className="recipe-preview-ingredients"><small>NEEDS</small><span>{ingredientLabels.join(" · ")}</span></div>
              </>
            ) : <div className="recipe-empty-search"><strong>No matching recipes</strong><small>Try an item or material name.</small></div>}
          </div>
          {recipeFeedback && <p className={`recipe-feedback ${recipeFeedback.ok ? "success" : "error"}`} role={recipeFeedback.ok ? "status" : "alert"}>{recipeFeedback.message}</p>}
          <p>Available materials move into the matching crafting slots. Take the output yourself to finish crafting.</p>
        </section>
      </aside>
    );
  };

  const renderCraftingArea = (size: 2 | 3) => {
    const positions = size === 2 ? [0, 1, 3, 4] : Array.from({ length: 9 }, (_, index) => index);
    return (
      <div className="crafting-workspace">
        <div className={`mc-grid craft-grid craft-${size}`}>
          {positions.map((position) => renderSlot(hud.craftGrid[position], `craft-${position}`, (shift) => engineRef.current?.craftSlotClick(position, "left", shift), () => engineRef.current?.craftSlotClick(position, "right"), "", undefined, { area: "craft", index: position }))}
        </div>
        <div className="craft-arrow" aria-hidden="true" />
        {renderSlot(hud.craftOutput, "craft-output", (shift) => engineRef.current?.craftOutputClick(shift), () => undefined, "craft-output-slot", "Crafting output")}
      </div>
    );
  };

  const selectedSlot = hud.inventory[hud.selected];
  const selectedName = inventorySlotDisplayName(selectedSlot);
  const campOrbs = hud.inventory.flatMap((slot) => {
    const orb = captureOrbFromInventorySlot(slot);
    return orb?.creature && !orb.attunement?.activeEntityId ? [orb] : [];
  });
  const campOrb = campOrbs.find((orb) => orb.orbId === hud.activeCampOrbId)
    ?? captureOrbFromInventorySlot(selectedSlot)
    ?? campOrbs[0]
    ?? null;
  const campCreature = campOrb?.creature ?? null;
  const campCreatureKind = campCreature?.kind;
  const campCreatureName = campCreature?.name;
  const campProgression = campCreature?.custom.progression as unknown as CreatureProgressionV2 | undefined;
  const campCare = normalizeCreatureCareState(campCreature?.custom.creatureCare);
  const campProfile = campCreature ? creatureProfile(campCreature.kind) : null;
  const campEquipment = (campCreature?.custom.creatureEquipment as Record<string, ItemCode> | undefined) ?? {};
  const campEcology = campCreature ? creatureEcologyContract(campCreature.kind) : null;
  const campWork = campCreature ? normalizeCreatureWorkState(campCreature.kind, campCreature.custom.creatureWork) : null;
  const campResearch = campCreature ? hud.bestiary[campCreature.kind].research["camp-observation"] : null;
  const campRelationship = campCreature ? normalizeCreatureRelationship(campCreature) : null;
  const campRelationshipPolicy = campCreature ? creatureRelationshipPolicy(campCreature.kind) : null;
  const campRehabilitationStage = campCreature ? creatureRehabilitationStage(campCreature) : "unavailable";
  const campPreferredFood = campCreature ? preferredRelationshipFood(campCreature.kind) : null;
  const campUsable = campCreature ? canAttuneCreature(campCreature) : false;
  const campTransferRecipients = useMemo(
    () => multiplayerState.peers
      .filter((peer) => peer.state === "connected" && peer.identity && peer.identity.peerKind !== "agent")
      .map((peer) => ({ id: peer.identity!.id, name: peer.identity!.name })),
    [multiplayerState.peers],
  );
  const campTransferOffers = engineRef.current?.pendingCreatureTransferOffers() ?? [];
  const campCompareOrb = campOrbs.find((orb) => orb.orbId === campCompareOrbId && orb.orbId !== campOrb?.orbId) ?? null;
  const campCompareProgression = campCompareOrb?.creature?.custom.progression as unknown as CreatureProgressionV2 | undefined;
  useEffect(() => {
    setCampNameDraft(campCreatureName?.trim() || (campCreatureKind ? MOB_DEFS[campCreatureKind].name : ""));
    setCampCompareOrbId((current) => current === campOrb?.orbId ? "" : current);
    setCampTransferRecipientId((current) => campTransferRecipients.some((recipient) => recipient.id === current)
      ? current
      : campTransferRecipients[0]?.id ?? "");
  }, [campCreatureKind, campCreatureName, campOrb?.orbId, campTransferRecipients]);
  const xpNeeded = 12 + hud.level * 6;
  const bestiarySeen = MOB_ORDER.filter((kind) => hud.bestiary[kind].seen).length;
  const bestiaryInventorySpecimens: readonly BestiarySpecimenSummary[] = campOrbs.map((orb) => ({
    entityId: orb.creature!.entityId,
    kind: orb.creature!.kind,
    name: orb.creature!.name,
    capturedAt: orb.capturedAt,
    progression: (orb.creature!.custom.progression as unknown as CreatureProgressionV2 | undefined) ?? null,
  }));
  const bestiaryCatalogRecords = MOB_ORDER.map((kind) => bestiaryFacetRecordForKind(
    kind,
    hud.bestiary[kind],
    bestiaryInventorySpecimens.filter((specimen) => specimen.kind === kind),
  ));
  const bestiarySearchText = bestiarySearch.trim().toLocaleLowerCase();
  const bestiaryBaseRecords = bestiaryCatalogRecords.filter((record) => {
    const kind = record.id as MobKind;
    const definition = MOB_DEFS[kind];
    const progress = hud.bestiary[kind];
    if (bestiaryQuickFilter === "discovered" && !progress.seen) return false;
    if (bestiaryQuickFilter === "captured" && (progress.captures ?? 0) <= 0) return false;
    if (!bestiarySearchText) return true;
    const profile = creatureProfile(kind);
    const captureKnowledge = captureKnowledgeForResearch(kind, profile.captureProfile, bestiaryResearchLevel(progress));
    const primeRoute = PRIME_ROUTE_PROFILES[kind as PrimeEligibleKind] ?? [];
    const discoveredText = progress.seen ? [
      definition.name, definition.lore, definition.habitat, definition.behavior, definition.utility ?? "",
      ...profile.naturalTypes.map((type) => CREATURE_TYPES[type].name),
      ...profile.moves.unlocks.map((unlock) => CREATURE_MOVES[unlock.moveId]?.name ?? ""),
      ...profile.researchClues,
      captureKnowledge.microHook ?? "",
      ...captureKnowledge.careClues,
      ...primeRoute.flatMap((step) => [step.label, step.ecologicalVerb, step.clue]),
      ...definition.drops.map((drop) => ITEMS[drop.item]?.name ?? ""),
      ...(progress.specimenIds ?? []),
      ...(progress.summonOrigins ?? []),
      ...(progress.guildLinks ?? []),
      ...Object.values(progress.forms ?? {}).map((form) => `${form.category} ${form.id}`),
      ...Object.values(progress.sections ?? {}).flatMap((records) => records.flatMap((entry) => [entry.title, entry.text, entry.sourceId ?? ""])),
    ] : [definition.name, undiscoveredHabitatHint(definition)];
    return discoveredText.join(" ").toLocaleLowerCase().includes(bestiarySearchText);
  });
  const bestiaryFacetOptions = Object.fromEntries(BESTIARY_FACET_KEYS.map((facet) => [
    facet,
    [...new Set(bestiaryCatalogRecords.flatMap((record) => record.facets[facet]))]
      .sort((left, right) => bestiaryFacetValueLabel(facet, left).localeCompare(bestiaryFacetValueLabel(facet, right))),
  ])) as unknown as Record<BestiaryFacetKey, readonly string[]>;
  const bestiaryFacetCounts = Object.fromEntries(BESTIARY_FACET_KEYS.map((facet) => [
    facet,
    bestiaryFacetOptionCounts(bestiaryBaseRecords, bestiaryFacets, facet, bestiaryFacetOptions[facet]),
  ])) as Record<BestiaryFacetKey, Readonly<Record<string, number>>>;
  const bestiaryVisibleRecords = sortBestiaryFacetRecords(filterBestiaryFacetRecords(bestiaryBaseRecords, bestiaryFacets), bestiarySort);
  const bestiaryVisibleKinds: readonly MobKind[] = bestiaryVisibleRecords.map((record) => record.id as MobKind);
  const activeBestiary = bestiaryVisibleKinds.includes(selectedBestiary) ? selectedBestiary : bestiaryVisibleKinds[0] ?? selectedBestiary;
  const bestiaryDefinition = MOB_DEFS[activeBestiary];
  const bestiaryProgress = hud.bestiary[activeBestiary];
  const activeCreatureProfile = creatureProfile(activeBestiary);
  const activeBestiaryResearchLevel = bestiaryResearchLevel(bestiaryProgress);
  const activeBestiaryResearchStage = (["Unobserved", "Observed", "Studied", "Mastered"] as const)[activeBestiaryResearchLevel];
  const activeCaptureKnowledge = captureKnowledgeForResearch(activeBestiary, activeCreatureProfile.captureProfile, activeBestiaryResearchLevel);
  const activeRelationshipPolicy = creatureRelationshipPolicy(activeBestiary);
  const activePrimeProfile = PRIME_FORM_PROFILES[activeBestiary] ?? null;
  const activePrimeRoute = PRIME_ROUTE_PROFILES[activeBestiary as PrimeEligibleKind] ?? null;
  const activePrimeEncounter = [...(engineRef.current?.primeEncounters.values() ?? [])]
    .filter((encounter) => encounter.kind === activeBestiary)
    .sort((left, right) => right.lastUpdatedAt - left.lastUpdatedAt)[0] ?? null;
  const activePrimeCompletedRouteVerbs = new Set(activePrimeEncounter?.completedRouteVerbs ?? []);
  const activeBestiaryInventorySpecimens = bestiaryInventorySpecimens.filter((specimen) => specimen.kind === activeBestiary);
  const activeBestiarySpecimenIds = [...new Set([...(bestiaryProgress.specimenIds ?? []), ...activeBestiaryInventorySpecimens.map((specimen) => specimen.entityId)])];
  const activeBestiaryLevel = activeBestiaryInventorySpecimens.reduce((highest, specimen) => Math.max(highest, specimen.progression?.level ?? 0), 0);
  const activeCreatureStats = statsAtLevel(activeCreatureProfile.stats, activeBestiaryLevel || 1);
  const bestiaryVisibleIndex = Math.max(0, bestiaryVisibleKinds.indexOf(activeBestiary));
  const bestiarySelectedFilterCount = BESTIARY_FACET_KEYS.reduce((total, facet) => total + bestiaryFacets[facet].length, 0);
  const bestiarySelectedFacetChips: readonly BestiaryFacetChip[] = BESTIARY_FACET_KEYS.flatMap((facet) => bestiaryFacets[facet].map((value) => ({
    facet,
    value,
    label: `${BESTIARY_FACET_LABELS[facet]}: ${bestiaryFacetValueLabel(facet, value)}`,
  })));
  const visibleBestiaryFacetChips = bestiarySelectedFacetChips.slice(0, 4);
  const hiddenBestiaryFacetChipCount = Math.max(0, bestiarySelectedFacetChips.length - visibleBestiaryFacetChips.length);
  useEffect(() => {
    if (bestiaryVisibleKinds.length && !bestiaryVisibleKinds.includes(selectedBestiary)) setSelectedBestiary(bestiaryVisibleKinds[0]);
  }, [bestiaryVisibleKinds, selectedBestiary]);
  const setBestiaryFacet = (facet: BestiaryFacetKey, value: string) => setBestiaryFacets((current) => toggleBestiaryFacetValue(current, facet, value));
  const clearBestiaryFacets = () => setBestiaryFacets(createEmptyBestiaryFacetSelections());
  const handleBestiaryFacetNavigation = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const panel = bestiaryFilterPanelRef.current;
    const options = panel ? [...panel.querySelectorAll<HTMLButtonElement>("[data-bestiary-filter-option]:not(:disabled)")] : [];
    const current = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-bestiary-filter-option]");
    if (!current || !options.length) return;
    event.preventDefault();
    const index = Math.max(0, options.indexOf(current));
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
      : (index + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) + options.length) % options.length;
    options[next]?.focus();
  };
  const stepBestiary = (direction: -1 | 1) => {
    if (!bestiaryVisibleKinds.length) return;
    const next = (bestiaryVisibleIndex + direction + bestiaryVisibleKinds.length) % bestiaryVisibleKinds.length;
    setSelectedBestiary(bestiaryVisibleKinds[next]);
  };
  const plantVisible = PLANTS.filter((plant) => plantFilter === "all" || plant.category === plantFilter);
  const selectedPlant = plantVisible.find((plant) => plant.id === selectedPlantId) ?? plantVisible[0] ?? PLANTS[0] ?? null;
  const discoveredPlants = new Set(hud.plantBestiary.discovered);
  const discoveredPlantCount = PLANTS.filter((plant) => discoveredPlants.has(plant.id)).length;
  const selectedPlantDiscovered = selectedPlant ? discoveredPlants.has(selectedPlant.id) : false;
  const selectedPlantNativeBiomes = selectedPlant
    ? nativeBiomesForPlant(selectedPlant.id).map((biome) => BIOME_NAMES[biome]).join(", ")
    : "";
  const hearthroadsApi = engineRef.current as unknown as HearthroadsEngineApi | null;
  const resourceInventory = inventoryResourceCounts(
    hud.inventory,
    hud.activeAlchemyHasWaterSource ? { "water-source": 1 } : {},
  );
  const playerCommerceInventory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const slot of hud.inventory) {
      if (!slot) continue;
      const itemKey = commerceKeyForItem(slot.item) ?? `item-${slot.item}`;
      totals.set(itemKey, (totals.get(itemKey) ?? 0) + slot.count);
    }
    return [...totals].map(([itemKey, count]) => ({ itemKey, count })) satisfies MerchantStack[];
  }, [hud.inventory]);
  const playerCommerceCatalog = useMemo(() => Object.fromEntries(Object.values(ITEMS).flatMap((definition) => {
    const item = playerCommerceItem(definition.id);
    return item ? [[item.key, item] as const] : [];
  })), []);
  const activeSettlement = hud.settlements.find((settlement) => settlement.id === hud.activeSettlementId) ?? null;
  const activeMerchant = hud.activeMerchant;
  const playerPurchaseCapacity = useMemo(() => {
    const capacities: Record<string, number> = {};
    for (const stock of activeMerchant?.inventory ?? []) {
      if (stock.itemKey.endsWith("-orb")) {
        capacities[stock.itemKey] = hud.inventory.filter((slot) => !slot).length;
        continue;
      }
      const item = commerceItemCode(stock.itemKey);
      if (item === null) {
        capacities[stock.itemKey] = 0;
        continue;
      }
      const durability = ITEMS[item]?.maxDurability;
      const incoming: InventorySlot = { item, count: 1, ...(durability !== undefined ? { durability } : {}) };
      const stackLimit = inventorySlotStackLimit(incoming);
      capacities[stock.itemKey] = hud.inventory.reduce((capacity, slot) => {
        if (!slot) return capacity + stackLimit;
        return inventorySlotsCanStack(slot, incoming) ? capacity + Math.max(0, stackLimit - slot.count) : capacity;
      }, 0);
    }
    return capacities;
  }, [activeMerchant, hud.inventory]);
  const activeResident = activeSettlement?.residents.find((resident) => resident.id === (hud.activeSentient?.residentId ?? activeMerchant?.id)) ?? null;
  const activeFactionId: NpcFactionId = (isNpcFactionId(hud.activeSentient?.factionId) ? hud.activeSentient.factionId : null)
    ?? (isNpcFactionId(activeMerchant?.factionId) ? activeMerchant.factionId : null)
    ?? (isNpcFactionId(activeSettlement?.ownerFactionId) ? activeSettlement.ownerFactionId : null)
    ?? "hobbits";
  const activeFactionAlignment = alignmentFor(hud.factionRelations, activeFactionId);
  const activeProfession = sentientProfession(hud.activeSentient?.profession ?? activeResident?.profession ?? activeMerchant?.profession, activeFactionId);
  const activeFactionCopy = SENTIENT_FACTION_COPY[activeFactionId];
  const activeCharacterName = hud.activeSentient?.name ?? activeResident?.name ?? hud.targetMob?.name ?? activeFactionCopy.fallbackName;
  const characterPortrait = sentientPortraitPath(activeFactionId, activeProfession);
  const currentPosition = { x: hud.coordinates[0], y: hud.coordinates[1], z: hud.coordinates[2] };
  const questSource: QuestSource | null = hud.activeSentient?.nearby && hud.activeSentient.residentId
    ? {
      entityId: hud.activeSentient.residentId,
      role: hud.activeSentient.profession,
      factionId: hud.activeSentient.factionId,
      isMayor: Boolean(hud.activeSentient.profession && isMayorProfession(hud.activeSentient.profession as ResidentProfession)),
    }
    : null;
  const activeStatusEffects = statusEffectViewsFromBuffs(hud.potionBuffs, Date.now() / 1000);
  const minimumMapZoom = explorationMinimumMapZoom(hud.skills);
  const showDistantPoiLabels = explorationShowsDistantPoiLabels(hud.skills);
  const trackNavigationAtAnyDistance = explorationTracksAtAnyDistance(hud.skills);
  const currentWayshrineId = hud.mapKnowledge.markers.find((marker) => marker.kind === "wayshrine"
    && Math.hypot(marker.position.x - currentPosition.x, marker.position.y - currentPosition.y, marker.position.z - currentPosition.z) <= 3.5)?.id ?? null;
  const fastTravelElapsed = hud.fastTravelChannel
    ? Math.max(0, Date.now() / 1000 - hud.fastTravelChannel.startedAt)
    : 0;
  const cartographySession = overlay === "cartography" ? {
    schema: 1 as const,
    tableId: "active-cartography-table",
    participants: hud.onlinePlayers > 1 ? ["local", "guest"] : ["local"],
    revision: 0,
  } : null;
  const alchemyState = hud.activeAlchemy ? { ...hud.activeAlchemy, selectedRecipeId: selectedAlchemyRecipe ?? hud.activeAlchemy.selectedRecipeId } : null;
  const distilleryState = hud.activeDistillery ? { ...hud.activeDistillery, selectedRecipeId: selectedDistilleryRecipe ?? hud.activeDistillery.selectedRecipeId } : null;
  const sugarworksState = hud.activeSugarworks ? { ...hud.activeSugarworks, selectedRecipeId: selectedSugarworksRecipe ?? hud.activeSugarworks.selectedRecipeId } : null;
  const pinnedQuestEntries = (hud.questBook.pinnedQuestIds ?? (hud.questBook.pinnedQuestId ? [hud.questBook.pinnedQuestId] : []))
    .slice(0, 3)
    .flatMap((questId) => {
      const definition = hud.questDefinitions.find((quest) => quest.id === questId);
      if (!definition) return [];
      return [{ definition, progress: hud.questBook.active.find((quest) => quest.questId === questId) ?? null }];
    });
  const selectedWorld = worlds.find((world) => world.id === selectedWorldId) ?? null;
  const cameraLabel = hud.cameraMode === "first" ? "FIRST PERSON" : hud.cameraMode === "third-rear" ? "THIRD PERSON · REAR" : "THIRD PERSON · FRONT";

  return (
    <main
      className={`game-shell ${showTouchControls ? "touch-controls-active" : ""}${agentMode ? " agent-client-mode" : ""}`}
      onContextMenu={(event) => {
        if (shouldSuppressGameContextMenu(started, event.target)) event.preventDefault();
      }}
    >
      <canvas ref={canvasRef} className="game-canvas" aria-label="Blockwild endless 3D game world" />
      <div className="sky-vignette" aria-hidden="true" />
      {agentMode && <aside className="agent-client-badge" aria-label="Lightweight companion client"><strong>COMPANION DRONE</strong><span>SEMANTIC CLIENT · RENDER 4 · SIM 3</span><small>Use <code>window.blockwildAgent</code> through the repository skill. Host approval is required.</small></aside>}

      {started && overlay === null && (
        <div className={`game-hud${settings.showMinimap ? " minimap-enabled" : ""}`} aria-live="polite">
          <div className="world-readout expanded-readout">
            <strong>DAY {hud.day}</strong>
            <span>{hud.clock}</span>
            <span>{hud.biome}</span>
            <span className="depth-readout">{hud.depth}</span>
            <span className={`weather-readout weather-${hud.weatherKind}`}>{hud.weatherKind.replace(/-/g, " ").toUpperCase()}</span>
          </div>
          <NavigationHud
            headingRadians={hud.mapHeading}
            position={currentPosition}
            markers={hud.mapKnowledge.markers}
            players={hud.mapPlayers}
            trackedId={trackedNavigationId}
            trackAtAnyDistance={trackNavigationAtAnyDistance}
            onTrack={setTrackedNavigationId}
          />
          {settings.showMinimap ? (
            <MinimapHud
              knowledge={hud.mapKnowledge}
              headingRadians={hud.mapHeading}
              position={currentPosition}
              players={hud.mapPlayers}
              trackedId={trackedNavigationId}
            />
          ) : null}
          <StatusEffectsHud effects={activeStatusEffects} />
          <div className="pinned-quest-stack" aria-label={`${pinnedQuestEntries.length} pinned quests`}>
            {pinnedQuestEntries.length ? pinnedQuestEntries.map(({ definition, progress }, index) => (
              <button type="button" key={definition.id} className="objective-card pinned-quest-card" onClick={() => engineRef.current?.openOverlay("quests")} aria-label={`Open pinned quest ${definition.name}`}>
                <span className="objective-kicker">PIN {index + 1}/3 · {definition.kind.toUpperCase()}</span>
                <strong>{definition.name}</strong>
                <span>{definition.objectives.map((objective) => {
                  const target = questObjectiveTarget(objective);
                  const current = progress?.objectiveProgress[objective.id] ?? 0;
                  return `${current >= target ? "✓" : "○"} ${objective.label} ${Math.min(current, target)}/${target}`;
                }).join(" · ")}</span>
              </button>
            )) : (
              <button type="button" className="objective-card pinned-quest-card unpinned" onClick={() => engineRef.current?.openOverlay("quests")}>
                <span className="objective-kicker">JOURNAL · J</span>
                <strong>No quest pinned</strong>
                <span>Open the journal to choose up to three roads.</span>
              </button>
            )}
          </div>
          <button type="button" className="hud-fullscreen-button" onClick={() => engineRef.current?.toggleFullscreen()} aria-label={hud.fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{hud.fullscreen ? "⊡" : "□"}</button>
          <div className="stance-hud" aria-label={`Camera ${cameraLabel}; ${hud.crouching ? "crouching" : hud.sprinting ? "sprinting" : "standing"}`}>
            <span><kbd>V</kbd><strong>{cameraLabel}</strong></span>
            <span className={hud.crouching ? "active" : ""}><kbd>SHIFT</kbd><strong>{hud.crouching ? "CROUCHING" : hud.sprinting ? "SPRINTING" : "CROUCH"}</strong></span>
            {hud.onlinePlayers > 1 && <span className="online"><kbd>●</kbd><strong>{hud.onlinePlayers} ONLINE</strong></span>}
          </div>
          {hud.mountedBoat && <div className="boat-hud" role="status"><strong>WAYFARER</strong><span><kbd>WASD</kbd> SAIL</span><span><kbd>MOUSE</kbd> LOOK</span><span><kbd>SPACE</kbd> DISMOUNT</span></div>}
          {hud.mountedCreature && <div className="boat-hud creature-mount-hud" role="status"><strong>{hud.mountedCreatureName ?? "MOUNT"}</strong><span className="mount-mode-label">{(hud.mountedCreatureMode ?? "land").toUpperCase()} · {hud.mountedCreatureExertion ?? 100}% EXERTION</span><span><kbd>WASD</kbd> STEER · <kbd>SPACE / SHIFT</kbd> {hud.mountedCreatureMode === "land" || hud.mountedCreatureMode === "climb" ? "JUMP / BRAKE" : "ASCEND / DESCEND"}</span><span><kbd>Z X C</kbd> MOVES · <kbd>F</kbd> DISMOUNT</span></div>}
          {hud.mode === "builder" && !hud.mountedBoat && !hud.mountedCreature && <div className={`creative-flight-hud${hud.flying ? " active" : ""}`} role="status"><strong>CREATIVE · {hud.flying ? "FLYING" : "GROUNDED"}</strong><span><kbd>SPACE ×2</kbd> {hud.flying ? "LAND" : "FLY"}</span>{hud.flying && <span><kbd>SPACE / SHIFT</kbd> RISE / DESCEND · <kbd>CTRL</kbd> FAST</span>}</div>}
          {hud.rangedWeapon && <div className={`ranged-ammo-hud${hud.rangedWeapon.reloading ? " reloading" : ""}`} role="status"><strong>{hud.rangedWeapon.loaded}/{hud.rangedWeapon.magazine}</strong><span>{hud.rangedWeapon.reloading ? "RELOADING" : `${hud.rangedWeapon.spare} BOLTS · R TO RELOAD`}</span></div>}
          <ManaHud magic={hud.magic} magicSkillLevel={hud.skills.skills.magic.level} />

          {hud.debug && (
            <div className="debug-card">
              XYZ {hud.coordinates.join(" / ")}<br />
              {gameModeLabel(hud.mode).toUpperCase()} · {hud.weatherKind.toUpperCase()} · {hud.depth.toUpperCase()}<br />
              Seed: {currentWorldSeed}<br />
              Chunks: {hud.loadedChunks} loaded · {hud.queuedChunks} queued · simulation {hud.simulationDistance}<br />
              Light: S{hud.lighting.sky} / R{hud.lighting.red} G{hud.lighting.green} B{hud.lighting.blue} / cave {Math.round(hud.lighting.subterraneanBlend * 100)}%<br />
              Light work: {hud.lighting.queuedSections} sections / {(hud.lighting.derivedBytes / 1048576).toFixed(1)} MB derived<br />
              Performance: {hud.averageFps.toFixed(0)} FPS
            </div>
          )}
          {settings.showFps && <div className="fps-counter" role="status" aria-label={`${Math.round(hud.averageFps)} frames per second`}>{Math.round(hud.averageFps)} FPS</div>}

          <div className="crosshair" aria-hidden="true"><span /><span /></div>
          {settings.showBreakProgress && hud.breakProgress > 0 && (
            <div className="break-meter" aria-label={`Mining progress ${Math.round(hud.breakProgress * 100)} percent`}><span style={{ width: `${hud.breakProgress * 100}%` }} /></div>
          )}
          {hud.targetMob && (
            <div className="mob-target-card">
              <strong>{hud.targetMob.name}</strong>
              <span><i style={{ width: `${Math.max(0, hud.targetMob.health / hud.targetMob.maxHealth) * 100}%` }} /></span>
              <small>{formatHudHealth(hud.targetMob.health)} / {formatHudHealth(hud.targetMob.maxHealth)}</small>
              {hud.targetMob.capture && <div className={`capture-readiness ${hud.targetMob.capture.ready ? "ready" : "waiting"}`} role="status" aria-label={`${hud.targetMob.capture.profileName} capture ${hud.targetMob.capture.ready ? "ready" : "not ready"}`}>
                <b><i aria-hidden="true" />{hud.targetMob.capture.profileName} · {hud.targetMob.capture.ready ? "READY" : "PREPARE"}</b>
                <ul>{hud.targetMob.capture.conditions.map((condition, index) => <li className={condition.satisfied ? "satisfied" : "missing"} key={`${condition.id ?? "rule"}-${index}`}><span aria-hidden="true">{condition.satisfied ? "✓" : "○"}</span>{condition.label}</li>)}</ul>
              </div>}
              {hud.targetMob.summonContract && <div className={`mob-summon-contract ${hud.targetMob.summonContract.worldpinReady ? "ready" : hud.targetMob.summonContract.echo ? "echo" : "waiting"}`} role="status" aria-label={`${hud.targetMob.summonContract.realm} summon concordance ${hud.targetMob.summonContract.concordance} of ${hud.targetMob.summonContract.required}. ${hud.targetMob.summonContract.echo ? "Echo manifestation cannot be grounded" : hud.targetMob.summonContract.worldpinReady ? `Worldpin ready for ${hud.targetMob.summonContract.anchorWindowSeconds.toFixed(1)} seconds` : "Worldpin anchor window closed"}.`}>
                <header><span>SUMMON · {hud.targetMob.summonContract.realm.toLocaleUpperCase()}</span><b>{hud.targetMob.summonContract.concordance}/{hud.targetMob.summonContract.required} CONCORDANCE</b></header>
                <i aria-hidden="true"><b style={{ width: `${Math.min(100, hud.targetMob.summonContract.concordance / Math.max(1, hud.targetMob.summonContract.required) * 100)}%` }} /></i>
                <p><strong>{hud.targetMob.summonContract.echo ? "ECHO FORM" : hud.targetMob.summonContract.worldpinReady ? `WORLDPIN ${hud.targetMob.summonContract.anchorWindowSeconds.toFixed(1)}s` : "WORLDPIN WINDOW CLOSED"}</strong><span>{hud.targetMob.summonContract.echo ? "Grounding unavailable" : hud.targetMob.summonContract.worldpinReady ? "Anchor now" : "Rebuild concordance and open an anchor"}</span></p>
              </div>}
            </div>
          )}

          <div className="bottom-hud">
            <div className="active-block-name">{selectedName}</div>
            {hud.mode === "survival" && (
              <div className="survival-stats">
                <StatPips kind="heart" value={hud.health} />
                <StatPips kind="hunger" value={hud.hunger} />
                {hud.armor > 0 && <ArmorPips value={hud.armor} />}
              </div>
            )}
            {hud.mode === "survival" && (hud.submerged || hud.oxygen < hud.maxOxygen) && <div className="oxygen-hud"><OxygenPips value={hud.oxygen} maximum={hud.maxOxygen} /></div>}
            <div className="xp-bar" aria-label={`Level ${hud.level}, ${hud.xp} of ${xpNeeded} experience`}><span style={{ width: `${Math.min(100, hud.xp / xpNeeded * 100)}%` }} /><b>{hud.level || ""}</b></div>
            <div className="hotbar" role="toolbar" aria-label="Item hotbar">
              {hud.inventory.slice(0, 9).map((slot, index) => (
                <button type="button" key={`hotbar-${index}`} className={`hotbar-slot ${hud.selected === index ? "selected" : ""}`} aria-pressed={hud.selected === index} aria-label={`Slot ${index + 1}: ${slot ? itemHoverText(slot) : "empty"}`} title={slot ? itemHoverText(slot) : `Empty hotbar slot ${index + 1}`} onClick={() => engineRef.current?.selectSlot(index)}>
                  <span className="slot-number">{index + 1}</span>
                  <SlotContents slot={slot} />
                </button>
              ))}
            </div>
            <div className={`target-label ${hud.targetCollectible === false ? "target-destroyed" : "target-collected"}`}>{hud.targetName ? `${hud.targetCollectible === false ? "□" : "▣"} ${hud.targetName}` : ""}</div>
          </div>
        </div>
      )}

      {toast && started && overlay === null && <div className="toast-message">{toast}</div>}
      {started && overlay === null && multiplayerState.role && (
        <section className={`agent-chat-hud ${chatOpen ? "open" : ""}`} aria-label="Multiplayer chat">
          <div className="agent-chat-history" aria-live="polite">
            {multiplayerState.chat.slice(-6).map((message) => (
              <p key={message.id} className={`peer-${message.peerKind}`}><b>{message.authorName}</b><span>{message.text}</span><small>{message.channel.toUpperCase()}</small></p>
            ))}
          </div>
          {chatOpen ? (
            <form onSubmit={(event) => { event.preventDefault(); submitChat(); }}>
              <select aria-label="Chat channel" value={chatChannel} onChange={(event) => setChatChannel(event.target.value as typeof chatChannel)}>
                <option value="local">Local</option><option value="party">Party</option><option value="global">Global</option>
              </select>
              <input ref={chatInputRef} value={chatInput} maxLength={480} onChange={(event) => setChatInput(event.target.value)} placeholder="Speak to the expedition…" aria-label="Chat message" />
              <button type="submit" disabled={!chatInput.trim()}>SEND</button>
            </form>
          ) : <button type="button" className="agent-chat-open" onClick={() => { chatOpenRef.current = true; setChatOpen(true); if (document.pointerLockElement) void document.exitPointerLock(); window.requestAnimationFrame(() => chatInputRef.current?.focus()); }}><kbd>ENTER</kbd> CHAT</button>}
        </section>
      )}
      {savedPulse && !persistenceState.error && <div className="save-pulse">CHECKPOINT SAVED</div>}
      {(storageStatus.phase === "opening" || storageStatus.phase === "migrating" || storageStatus.phase === "loading" || storageStatus.phase === "saving" || storageStatus.phase === "error") && <div className={`universe-storage-status ${storageStatus.phase === "error" ? "storage-error" : ""}`} role={storageStatus.phase === "error" ? "alert" : "status"}>{storageStatus.message}</div>}
      {uiPreferences.showReferenceHints && contextReference && overlay && overlay !== "title" && overlay !== "new" && (
        <div className="context-reference-hint" role="status">
          <span><kbd>?</kbd> Item Wiki</span>
          {contextReference.field && <span><kbd>B</kbd> {contextReference.field.kind === "plant" ? "Plant" : "Bestiary"}</span>}
        </div>
      )}

      {started && overlay === null && showTouchControls && (
        <div className="mobile-controls touch-controls-visible" aria-label="Touch game controls">
          <div className="touch-look-zone" onPointerDown={handleLookDown} onPointerMove={handleLookMove} onPointerUp={handleLookUp} onPointerCancel={handleLookUp} />
          <div className="move-pad">
            <button type="button" className="touch-key key-up" aria-label="Move forward" onPointerDown={(event) => handleVirtualKey(event, "KeyW", true)} onPointerUp={(event) => handleVirtualKey(event, "KeyW", false)} onPointerCancel={(event) => handleVirtualKey(event, "KeyW", false)}>▲</button>
            <button type="button" className="touch-key key-left" aria-label="Move left" onPointerDown={(event) => handleVirtualKey(event, "KeyA", true)} onPointerUp={(event) => handleVirtualKey(event, "KeyA", false)} onPointerCancel={(event) => handleVirtualKey(event, "KeyA", false)}>◀</button>
            <button type="button" className="touch-key key-down" aria-label="Move backward" onPointerDown={(event) => handleVirtualKey(event, "KeyS", true)} onPointerUp={(event) => handleVirtualKey(event, "KeyS", false)} onPointerCancel={(event) => handleVirtualKey(event, "KeyS", false)}>▼</button>
            <button type="button" className="touch-key key-right" aria-label="Move right" onPointerDown={(event) => handleVirtualKey(event, "KeyD", true)} onPointerUp={(event) => handleVirtualKey(event, "KeyD", false)} onPointerCancel={(event) => handleVirtualKey(event, "KeyD", false)}>▶</button>
          </div>
          <div className="action-pad">
            <button type="button" className="touch-action jump-action" aria-label="Jump or swim" onPointerDown={(event) => { event.preventDefault(); engineRef.current?.jump(); }}>↑</button>
            <button type="button" className="touch-action mine-action" aria-label="Harvest or attack" onPointerDown={(event) => { event.preventDefault(); engineRef.current?.setMining(true); }} onPointerUp={() => engineRef.current?.setMining(false)} onPointerCancel={() => engineRef.current?.setMining(false)}>⚒</button>
            <button type="button" className="touch-action place-action" aria-label="Use, place, or raise shield" onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); engineRef.current?.setOffhandUse(true); }} onPointerUp={() => engineRef.current?.setOffhandUse(false)} onPointerCancel={() => engineRef.current?.setOffhandUse(false)}>▣</button>
          </div>
          <button type="button" className="mobile-menu-button" aria-label="Pause game" onClick={() => { engineRef.current?.pause(); setOverlay("pause"); }}>Ⅱ</button>
        </div>
      )}

      {overlay === "title" && (
        <section className="menu-overlay title-overlay" aria-labelledby="game-title">
          <div className="title-mist" />
          <div className="title-screen-utility">
            <span className="game-version-badge"><b>{GAME_VERSION_LABEL}</b> {GAME_RELEASE_NAME}</span>
            <span className="title-screen-actions"><a href="/wiki">WIKI</a><button type="button" onClick={() => engineRef.current?.toggleFullscreen()} aria-label={hud.fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{hud.fullscreen ? "EXIT FULLSCREEN" : "FULLSCREEN"}</button></span>
          </div>
          <div ref={titleContentRef} className={`title-content ${titleMenuView === "main" ? (previousEditionDataCount > 0 ? "title-has-previous-data" : "") : "title-submenu-open"}`}>
            <div className="logo-wrap">
              <h1 id="game-title" className="block-logo">BLOCKWILD</h1>
              <p className="logo-subtitle">ENDLESS HORIZONS · {Object.keys(BIOME_NAMES).length} BIOMES · A VERY DEEP DOWN</p>
              <span className="splash-text">Now actually endless!</span>
            </div>
            <div className={`title-menu-layout title-${titleMenuView}-layout`}>
              {titleMenuView === "main" && <nav className="main-menu-buttons title-main-menu" aria-label="Main menu">
                <PixelButton className="primary-menu-button title-menu-choice" disabled={!hasSave || !selectedWorld || worldActionBusy || storageStatus.phase === "opening" || storageStatus.phase === "migrating"} onClick={continueWorld}>
                  <strong>Continue</strong><small>{selectedWorld?.name ?? "No local world selected"}</small>
                </PixelButton>
                <PixelButton className="title-menu-choice" onClick={beginNewWorld}><strong>Create New World</strong><small>Begin a fresh endless world</small></PixelButton>
                <PixelButton className="title-menu-choice" onClick={() => setTitleMenuView("worlds")}><strong>Worlds</strong><small>{worlds.length} TypeScript Edition {worlds.length === 1 ? "world" : "worlds"}</small></PixelButton>
                <PixelButton className="title-menu-choice" onClick={() => setTitleMenuView("characters")}><strong>Characters</strong><small>{activeCharacterProfile.name}</small></PixelButton>
                <PixelButton className="title-menu-choice title-join-button" onClick={() => openMultiplayer("title")}><strong>Multiplayer</strong><small>Join or host with an invite code</small></PixelButton>
                <PixelButton className="title-menu-choice" onClick={() => setOverlay("help")}><strong>How to Play</strong></PixelButton>
                <PixelButton className="title-menu-choice" onClick={() => openSettings("title")}><strong>Settings</strong></PixelButton>
              </nav>}
              {titleMenuView === "main" && previousEditionDataCount > 0 && <aside className="previous-edition-notice" aria-label="Previous edition data">
                <strong>PREVIOUS EDITION DATA FOUND</strong>
                <span>The TypeScript Edition now keeps a separate world list and identity. Your previous browser data is untouched and was not imported automatically.</span>
                <button type="button" onClick={() => { setTitleMenuView("worlds"); setWorldNotice(""); }}>Review &amp; export</button>
              </aside>}
              {titleMenuView === "characters" && <section className="title-submenu title-character-submenu" aria-labelledby="title-characters-heading">
                <header className="title-submenu-header">
                  <button type="button" className="title-back-button" onClick={() => setTitleMenuView("main")}><span aria-hidden="true">&larr;</span> Main Menu</button>
                  <div><span className="panel-eyebrow">IDENTITY WORKSHOP</span><h2 id="title-characters-heading">Characters</h2></div>
                </header>
                <CharacterStudio
                  key={activeCharacterProfile.id}
                  catalog={characterCatalog}
                  profile={activeCharacterProfile}
                  preview={<PlayerAvatarPreview variant={activeCharacterProfile.appearance.sex} appearance={activeCharacterProfile.appearance} compact />}
                  onSelect={selectCharacterProfile}
                  onCreate={createCharacterProfile}
                  onRemove={removeCharacterProfile}
                  onPatch={updateCharacterProfile}
                />
              </section>}
              {titleMenuView === "worlds" && <section className="title-submenu title-worlds-submenu" aria-labelledby="title-worlds-heading">
                <header className="title-submenu-header">
                  <button type="button" className="title-back-button" onClick={() => setTitleMenuView("main")}><span aria-hidden="true">&larr;</span> Main Menu</button>
                  <div><span className="panel-eyebrow">LOCAL EXPLORATIONS</span><h2 id="title-worlds-heading">Worlds</h2></div>
                  <button type="button" className="title-new-world-button" onClick={beginNewWorld}>+ New World</button>
                </header>
                <aside className="world-catalog-panel" aria-label="Worlds stored in this browser">
                <header>
                  <div><span className="panel-eyebrow">THIS BROWSER · {worlds.length} {worlds.length === 1 ? "WORLD" : "WORLDS"}</span><strong>World Catalog</strong></div>
                  <button type="button" onClick={() => importWorldInputRef.current?.click()}>IMPORT</button>
                  <input ref={importWorldInputRef} type="file" hidden suppressHydrationWarning style={{ caretColor: "transparent" }} accept=".json,.blockwild.json,application/json" onChange={(event) => void importWorld(event)} />
                </header>
                <div className="world-catalog-list">
                  {worlds.length ? worlds.map((world) => (
                    <button
                      type="button"
                      key={world.id}
                      className={`world-catalog-card ${world.id === selectedWorldId ? "selected" : ""}`}
                      onClick={() => selectWorld(world)}
                      onDoubleClick={() => playWorld(world.id)}
                    >
                      <span className="world-thumbnail" aria-hidden="true"><i /><b>{world.mode === "builder" ? "◆" : "▲"}</b></span>
                      <span className="world-card-copy"><strong>{world.name}</strong><small>Seed {world.seed}</small><small>{formatWorldDate(world.lastPlayedAt)} · {formatPlayTime(world.playTimeMs)}</small><small>Last saved in v{world.lastSavedGameVersion}</small></span>
                      <em>{gameModeLabel(world.mode).toUpperCase()}</em>
                    </button>
                  )) : <div className="empty-world-catalog"><b>◇</b><strong>No worlds in this browser</strong><span>Create one here or import a Blockwild world file.</span></div>}
                </div>
                {selectedWorld && <section className="world-mode-editor" aria-label={`Game mode for ${selectedWorld.name}`}>
                  <span><b>RULES ON NEXT LOAD</b><small>World edits and inventory stay intact.</small></span>
                  <div role="group" aria-label="Saved world game mode">
                    <button type="button" className={selectedWorld.mode === "survival" ? "active" : ""} aria-pressed={selectedWorld.mode === "survival"} onClick={() => changeSelectedWorldMode("survival")}><strong>SURVIVAL</strong><small>Health, hunger, crafting</small></button>
                    <button type="button" className={selectedWorld.mode === "builder" ? "active" : ""} aria-pressed={selectedWorld.mode === "builder"} onClick={() => changeSelectedWorldMode("builder")}><strong>CREATIVE</strong><small>Flight, catalog, invulnerable</small></button>
                  </div>
                </section>}
                <div className="world-catalog-actions">
                  <button type="button" disabled={!selectedWorld} onClick={renameSelectedWorld}>Rename</button>
                  <button type="button" disabled={!selectedWorld} onClick={duplicateSelectedWorld}>Duplicate</button>
                  <button type="button" disabled={!selectedWorld} onClick={exportSelectedWorld}>Export</button>
                  <button type="button" disabled={!selectedWorld} onClick={exportLegacyRecovery}>Legacy backup</button>
                  <button type="button" className="danger" disabled={!selectedWorld} onClick={deleteSelectedWorld}>Delete</button>
                </div>
                  {worldNotice && <p className="world-catalog-notice" role="status">{worldNotice}</p>}
                </aside>
                {previousEditionDataCount > 0 && <aside className="previous-edition-notice world-previous-edition-notice" aria-label="Previous edition data export">
                  <strong>SEPARATE EDITION STORAGE</strong>
                  <span>{previousEditionDataCount} previous-edition browser record{previousEditionDataCount === 1 ? " is" : "s are"} preserved outside this TypeScript world list. Export a raw backup explicitly; nothing will be imported, changed, or deleted.</span>
                  <button type="button" onClick={exportPreviousEditionData}>Export previous-edition data</button>
                </aside>}
                <p className="browser-ownership-note">{WORLD_OWNERSHIP_NOTICE}</p>
              </section>}
            </div>
            <div className="title-footer">
              <span>Blockwild {GAME_VERSION} · Endless streamed terrain · original procedural textures · browser-owned persistent worlds</span>
              <button type="button" className="sound-quick-toggle" onClick={() => updateSettings({ muted: !settings.muted })} aria-label={settings.muted ? "Turn sound on" : "Mute sound"}>{settings.muted ? "SOUND: OFF" : "SOUND: ON"}</button>
            </div>
          </div>
        </section>
      )}

      {overlay === "new" && (
        <section className="menu-overlay" aria-labelledby="new-world-title">
          <div className="pixel-panel world-setup-panel expanded-setup-panel">
            <span className="panel-eyebrow">THE WORLD BELOW · GENERATOR {GENERATOR_VERSION}</span>
            <h2 id="new-world-title">Create a New World</h2>
            <p className="setup-intro">Every seed grows coherent regions, oceans, rivers, mountain ranges, {Object.keys(BIOME_NAMES).length} surface biomes, connected cave networks, six underground ecologies, ruins, settlements, and a worldheart sixty-four blocks below zero.</p>
            <p className="generator-profile-note"><strong>NEW WORLDS</strong><span>Generator {GENERATOR_VERSION} groups cultures into Hearthlands and quieter frontiers, links communities with tiered roads, and supports safe settlement origins. Existing worlds keep their original scattered-settlement pattern exactly as saved.</span></p>
            <label className="field-label" htmlFor="world-name">World name</label>
            <input id="world-name" className="pixel-input world-name-input" value={worldName} maxLength={64} onChange={(event) => setWorldName(event.target.value)} />
            <label className="field-label" htmlFor="world-seed">World seed</label>
            <div className="seed-row">
              <input id="world-seed" className="pixel-input" value={seed} maxLength={32} onChange={(event) => setSeed(event.target.value.toUpperCase())} />
              <button type="button" className="seed-die" onClick={() => setSeed(engineRef.current?.randomSeed() ?? "WILDERNESS")} aria-label="Randomize seed">◆</button>
            </div>
            <fieldset className="mode-picker">
              <legend>Game mode</legend>
              <button type="button" className={mode === "survival" ? "active" : ""} onClick={() => setMode("survival")}>
                <strong>SURVIVAL</strong>
                <span>Stack inventory, tools, durability, hunger, crafting tables, furnaces, hostile nights, mob loot, XP, and irresponsible spelunking.</span>
              </button>
              <button type="button" className={mode === "builder" ? "active" : ""} onClick={() => setMode("builder")}>
                <strong>CREATIVE</strong>
                <span>Empty starting pack, complete item catalog, infinite use, flight, no hunger, and no damage.</span>
              </button>
            </fieldset>
            <details className="advanced-world-options">
              <summary><span>Advanced world options</span><small>Difficulty, ecology, cultures, terrain, and inventory rules</small></summary>
              <section className="settlement-pattern-options" aria-labelledby="settlement-pattern-title">
                <div className="faction-spawn-heading">
                  <div><h3 id="settlement-pattern-title">Settlement pattern</h3><p>Choose the broad rhythm of civilization. Presets keep wilderness contrast while changing how towns, satellites, and roads gather.</p></div>
                </div>
                <div className="settlement-preset-grid">
                  {([
                    { id: "frontier", title: "Open Frontier", description: "Rare, widely separated communities and long wilderness journeys." },
                    { id: "heartlands", title: "Heartlands & Frontiers", description: "Regional town clusters connected by roads, separated by broad wild country." },
                    { id: "settled", title: "Settled Roads", description: "More communities, shorter wilderness gaps, and stronger road networks." },
                    { id: "wilderness", title: "Wilderness", description: "No generated faction settlements or inter-settlement roads." },
                  ] as const).map((preset) => {
                    const active = preset.id === "frontier" ? worldOptions.settlementPattern === "legacy-scattered-v1" && worldOptions.settlementDensity > 0
                      : preset.id === "wilderness" ? worldOptions.settlementDensity === 0
                        : preset.id === "settled" ? worldOptions.settlementPattern === "heartlands-v2" && worldOptions.settlementDensity > 1.2
                          : worldOptions.settlementPattern === "heartlands-v2" && worldOptions.settlementDensity > 0 && worldOptions.settlementDensity <= 1.2;
                    return <button type="button" key={preset.id} className={active ? "active" : ""} aria-pressed={active} onClick={() => setWorldOptions((current) => preset.id === "frontier"
                      ? { ...current, settlementPattern: "legacy-scattered-v1", settlementDensity: 0.72, settlementClustering: "even", roadCoverage: "local", largeTownFrequency: "rare" }
                      : preset.id === "settled"
                        ? { ...current, settlementPattern: "heartlands-v2", settlementDensity: 1.45, settlementClustering: "regional", roadCoverage: "dense", largeTownFrequency: "frequent" }
                        : preset.id === "wilderness"
                          ? { ...current, settlementPattern: "heartlands-v2", settlementDensity: 0, roadCoverage: "none", origin: { mode: "wilderness" } }
                          : { ...current, settlementPattern: "heartlands-v2", settlementDensity: 1, settlementClustering: "regional", roadCoverage: "regional", largeTownFrequency: "balanced" })}>
                      <strong>{preset.title}</strong><span>{preset.description}</span>{preset.id === "heartlands" ? <b>DEFAULT</b> : null}
                    </button>;
                  })}
                </div>
                <details className="settlement-fine-tuning">
                  <summary>Fine tuning</summary>
                  <div className="advanced-option-grid">
                    <label><span>Settlement density <b>{worldOptions.settlementDensity.toFixed(2)}×</b></span><input type="range" min="0" max="2" step="0.05" value={worldOptions.settlementDensity} onChange={(event) => setWorldOptions((current) => ({ ...current, settlementDensity: Number(event.target.value) }))} /></label>
                    <label><span>Clustering</span><select value={worldOptions.settlementClustering} onChange={(event) => setWorldOptions((current) => ({ ...current, settlementClustering: event.target.value as WorldOptions["settlementClustering"] }))}><option value="even">Even</option><option value="regional">Regional</option><option value="strong">Strong</option></select></label>
                    <label><span>Road coverage</span><select value={worldOptions.roadCoverage} onChange={(event) => setWorldOptions((current) => ({ ...current, roadCoverage: event.target.value as WorldOptions["roadCoverage"] }))}><option value="none">None</option><option value="local">Local</option><option value="regional">Regional</option><option value="dense">Dense</option></select></label>
                    <label><span>Large towns</span><select value={worldOptions.largeTownFrequency} onChange={(event) => setWorldOptions((current) => ({ ...current, largeTownFrequency: event.target.value as WorldOptions["largeTownFrequency"] }))}><option value="rare">Rare</option><option value="balanced">Balanced</option><option value="frequent">Frequent</option></select></label>
                  </div>
                </details>
              </section>
              <div className="advanced-option-grid">
                <label><span>Difficulty <b>{worldOptions.difficulty.toUpperCase()}</b></span><select value={worldOptions.difficulty} onChange={(event) => setWorldOptions((current) => ({ ...current, difficulty: event.target.value as WorldOptions["difficulty"] }))}><option value="peaceful">Peaceful</option><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label>
                <label><span>Day length <b>{worldOptions.dayLengthMinutes} min</b></span><input type="range" min="5" max="120" step="5" value={worldOptions.dayLengthMinutes} onChange={(event) => setWorldOptions((current) => ({ ...current, dayLengthMinutes: Number(event.target.value) }))} /></label>
                <label><span>Multiplayer rest <b>{worldOptions.sleepRule === "any-player" ? "ANY" : worldOptions.sleepRule === "all-players" ? "ALL" : `${worldOptions.sleepPercentage}%`}</b></span><select value={worldOptions.sleepRule} onChange={(event) => setWorldOptions((current) => ({ ...current, sleepRule: event.target.value as WorldOptions["sleepRule"] }))}><option value="any-player">Any player</option><option value="percentage">Player percentage</option><option value="all-players">All players</option></select></label>
                {worldOptions.sleepRule === "percentage" && <label><span>Rest vote threshold <b>{worldOptions.sleepPercentage}%</b></span><input type="range" min="10" max="100" step="10" value={worldOptions.sleepPercentage} onChange={(event) => setWorldOptions((current) => ({ ...current, sleepPercentage: Number(event.target.value) }))} /></label>}
                <label><span>Mob density <b>{worldOptions.mobDensity.toFixed(1)}×</b></span><input type="range" min="0" max="3" step="0.25" value={worldOptions.mobDensity} onChange={(event) => setWorldOptions((current) => ({ ...current, mobDensity: Number(event.target.value) }))} /></label>
                <label><span>Butterflies <b>{worldOptions.butterflyDensity.toFixed(1)}×</b></span><input type="range" min="0" max="4" step="0.25" value={worldOptions.butterflyDensity} onChange={(event) => setWorldOptions((current) => ({ ...current, butterflyDensity: Number(event.target.value) }))} /></label>
                <label><span>Cave frequency <b>{worldOptions.caveFrequency.toFixed(1)}×</b></span><input type="range" min="0" max="3" step="0.25" value={worldOptions.caveFrequency} onChange={(event) => setWorldOptions((current) => ({ ...current, caveFrequency: Number(event.target.value) }))} /></label>
                <label><span>Biome scale <b>{worldOptions.biomeScale.toFixed(2)}×</b></span><input type="range" min="0.25" max="4" step="0.25" value={worldOptions.biomeScale} onChange={(event) => setWorldOptions((current) => ({ ...current, biomeScale: Number(event.target.value) }))} /></label>
                <label><span>Resources <b>{worldOptions.resourceAbundance.toFixed(2)}×</b></span><input type="range" min="0.25" max="4" step="0.25" value={worldOptions.resourceAbundance} onChange={(event) => setWorldOptions((current) => ({ ...current, resourceAbundance: Number(event.target.value) }))} /></label>
              </div>
              <div className="advanced-toggle-grid">
                {([
                  ["structures", "Structures"],
                  ["keepInventory", "Keep inventory"],
                  ["friendlyFire", "Friendly fire"],
                ] as const).map(([key, label]) => <button type="button" key={key} className={worldOptions[key] ? "active" : ""} onClick={() => setWorldOptions((current) => ({ ...current, [key]: !current[key], ...(key === "structures" && current.structures ? { origin: { mode: "wilderness" as const } } : {}) }))}><span>{label}</span><b>{worldOptions[key] ? "ON" : "OFF"}</b></button>)}
              </div>
              <section className="faction-spawn-options" aria-labelledby="faction-spawn-title">
                <div className="faction-spawn-heading">
                  <div>
                    <h3 id="faction-spawn-title">Cultures in this world</h3>
                    <p>Choose which factions may found settlements and bring aligned residents. Their home biomes and wild ecology still exist.</p>
                  </div>
                  <div className="faction-spawn-actions">
                    <button type="button" onClick={() => setWorldOptions((current) => ({ ...current, enabledFactions: [...NPC_FACTION_IDS] }))}>All</button>
                    <button type="button" onClick={() => setWorldOptions((current) => ({ ...current, enabledFactions: [], origin: { mode: "wilderness" } }))}>None</button>
                  </div>
                </div>
                <div className="faction-spawn-grid">
                  {NPC_FACTION_IDS.map((factionId) => {
                    const enabled = worldOptions.enabledFactions.includes(factionId);
                    const faction = FACTIONS[factionId];
                    return (
                      <button
                        type="button"
                        key={factionId}
                        className={`${enabled ? "active" : ""} faction-spawn-${factionId}`}
                        aria-pressed={enabled}
                        onClick={() => setWorldOptions((current) => {
                          const enabledFactions = enabled
                            ? current.enabledFactions.filter((candidate) => candidate !== factionId)
                            : NPC_FACTION_IDS.filter((candidate) => current.enabledFactions.includes(candidate) || candidate === factionId);
                          return {
                            ...current,
                            enabledFactions,
                            origin: current.origin.mode === "culture-settlement" && !enabledFactions.includes(current.origin.factionId)
                              ? { mode: "wilderness" } : current.origin,
                          };
                        })}
                      >
                        <span>{faction.name}</span>
                        <small>{faction.aquaticOnly
                          ? "Aquatic settlements"
                          : factionId === "sugarcourt"
                            ? "Sugarplum Vale boroughs"
                            : factionId === "dwarves"
                              ? "Subterranean mountain holds"
                              : "Surface settlements"}</small>
                        <b>{enabled ? "SPAWNS" : "DISABLED"}</b>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className={`world-origin-options${!worldOptions.structures || worldOptions.settlementDensity <= 0 ? " disabled" : ""}`} aria-labelledby="world-origin-title">
                <div className="faction-spawn-heading"><div><h3 id="world-origin-title">Origin</h3><p>Begin in wild country or arrive at a public settlement approach. Village starts change context, not starting wealth or ownership.</p></div></div>
                <div className="origin-mode-grid">
                  <button type="button" className={worldOptions.origin.mode === "wilderness" ? "active" : ""} onClick={() => setWorldOptions((current) => ({ ...current, origin: { mode: "wilderness" } }))}><strong>Wild country</strong><span>Use the familiar safe-biome spawn search.</span></button>
                  <button type="button" disabled={!worldOptions.structures || worldOptions.settlementDensity <= 0} className={worldOptions.origin.mode === "near-any-settlement" ? "active" : ""} onClick={() => setWorldOptions((current) => ({ ...current, origin: { mode: "near-any-settlement" } }))}><strong>Near any community</strong><span>Arrive beside the nearest valid enabled settlement.</span></button>
                  <button type="button" disabled={!worldOptions.structures || worldOptions.settlementDensity <= 0 || !worldOptions.enabledFactions.length} className={worldOptions.origin.mode === "culture-settlement" ? "active" : ""} onClick={() => setWorldOptions((current) => ({ ...current, origin: { mode: "culture-settlement", factionId: current.enabledFactions[0] ?? "hobbits", minimumSize: "village" } }))}><strong>Chosen culture</strong><span>Resolve a settlement of one enabled culture and minimum size.</span></button>
                </div>
                {worldOptions.origin.mode === "culture-settlement" ? <div className="origin-culture-controls">
                  <label><span>Culture</span><select value={worldOptions.origin.factionId} onChange={(event) => setWorldOptions((current) => ({ ...current, origin: { mode: "culture-settlement", factionId: event.target.value as NpcFactionId, minimumSize: current.origin.mode === "culture-settlement" ? current.origin.minimumSize : "village" } }))}>{worldOptions.enabledFactions.map((factionId) => <option key={factionId} value={factionId}>{FACTIONS[factionId].name}</option>)}</select></label>
                  <label><span>Minimum size</span><select value={worldOptions.origin.minimumSize} onChange={(event) => setWorldOptions((current) => ({ ...current, origin: { mode: "culture-settlement", factionId: current.origin.mode === "culture-settlement" ? current.origin.factionId : current.enabledFactions[0] ?? "hobbits", minimumSize: event.target.value as "hamlet" | "village" | "town" } }))}><option value="hamlet">Hamlet</option><option value="village">Village</option><option value="town">Town</option></select></label>
                </div> : null}
                {worldOptions.origin.mode !== "wilderness" && worldOptions.structures && worldOptions.settlementDensity > 0 ? <output className={`origin-preview ${originPreview ? "resolved" : originPreviewPending ? "pending" : "missing"}`} aria-live="polite">
                  {originPreviewPending ? <><strong>Reading the regional charts…</strong><span>The seed-derived settlement index is resolving a safe public arrival.</span></>
                    : originPreview ? <><strong>{FACTIONS[originPreview.candidate.factionId].name} {originPreview.candidate.size}</strong><span>{originPreview.candidate.biome.replaceAll("-", " ")} · {originPreview.anchorKind.replaceAll("-", " ")} · {Math.round(originPreview.distanceBlocks)} blocks from world center</span></>
                      : <><strong>No valid starting settlement found nearby.</strong><span>Keep the culture exact: search farther, randomize the seed, or return to wild country.</span><button type="button" onClick={() => setOriginSearchRadius((current) => Math.min(MAX_SETTLEMENT_ORIGIN_SEARCH_RADIUS, current + 12))}>Search farther</button></>}
                </output> : null}
              </section>
            </details>
            <div className="world-feature-strip">
              <span><b>∞</b> STREAMED WORLD</span><span><b>{Object.keys(BIOME_NAMES).length}</b> SURFACE BIOMES</span><span><b>6</b> CAVE ECOLOGIES</span><span><b>{MOB_ORDER.length}</b> CREATURES</span><span><b>192</b> BLOCKS TALL</span>
            </div>
            <p className="browser-ownership-note setup-ownership-note">This world will belong to this browser on this host device. Export it to make a backup or move it.</p>
            <div className="panel-actions">
              <PixelButton className="secondary-button" onClick={() => setOverlay("title")}>Cancel</PixelButton>
              <PixelButton className="gold-button" disabled={worldActionBusy || storageStatus.phase === "opening" || storageStatus.phase === "migrating" || worldOptions.origin.mode !== "wilderness" && (originPreviewPending || !originPreview)} onClick={createWorld}>{worldActionBusy ? "Committing home checkpoint…" : "Generate World"}</PixelButton>
            </div>
          </div>
        </section>
      )}

      {overlay === "pause" && (
        <section className="menu-overlay pause-overlay" aria-labelledby="pause-title">
          <div className="pixel-panel pause-panel">
            <span className="panel-eyebrow">{hud.biome} · DAY {hud.day} · {hud.clock}</span>
            <h2 id="pause-title">{hud.onlinePlayers > 1 ? "Session Menu" : "Game Paused"}</h2>
            <p className="panel-flavor">{hud.onlinePlayers > 1 ? "This shared world keeps running while the session menu is open." : `Loaded ${hud.loadedChunks} chunks around you. The rest of infinity is waiting politely offscreen.`}</p>
            {engineRef.current?.persistent && <p className="world-catalog-notice" role="status">{persistenceState.error ?? (persistenceState.saving ? "Checkpoint in progress. Keep this tab open." : persistenceState.dirty ? "Unsaved progress. Save & Quit waits for the browser checkpoint." : "Current checkpoint committed to this browser.")}</p>}
            {persistenceState.error && <div className="world-catalog-actions" aria-label="Save recovery">
              <button type="button" disabled={persistenceState.saving} onClick={() => void engineRef.current?.saveNow()}>Retry checkpoint</button>
              <button type="button" onClick={exportUnsavedSession}>Export unsaved session</button>
              <button type="button" onClick={exportLegacyRecovery}>Legacy backup</button>
            </div>}
            <div className="stacked-menu-buttons">
              <PixelButton className="gold-button" onClick={() => { setOverlay(null); engineRef.current?.activate(); }}>Back to Game</PixelButton>
              <PixelButton className="secondary-button" disabled={worldActionBusy || persistenceState.saving} onClick={saveAndQuit}>{worldActionBusy ? "Waiting for checkpoint…" : "Save & Quit to Title"}</PixelButton>
              <PixelButton onClick={() => engineRef.current?.openOverlay("map")}>Map <kbd>M</kbd></PixelButton>
              <PixelButton onClick={() => engineRef.current?.openOverlay("quests")}>Quest Journal <kbd>J</kbd></PixelButton>
              <PixelButton onClick={() => engineRef.current?.openOverlay("guilds")}>Guilds of Hearthroads</PixelButton>
              <PixelButton onClick={() => engineRef.current?.openCardforge()}>Cardforge TCG</PixelButton>
              <PixelButton onClick={() => engineRef.current?.openOverlay("magic")}>Spell Journal <kbd>K</kbd></PixelButton>
              <PixelButton onClick={() => engineRef.current?.openOverlay("skills")}>Skills & Perks <kbd>L</kbd></PixelButton>
              <PixelButton onClick={() => engineRef.current?.openOverlay("bestiary")}>Bestiary <kbd>B</kbd></PixelButton>
              <PixelButton onClick={() => engineRef.current?.openOverlay("creature-camp")}>Creature Camp</PixelButton>
              <PixelButton onClick={() => openMultiplayer("pause")}>Multiplayer Session</PixelButton>
              <PixelButton onClick={() => engineRef.current?.toggleFullscreen()}>{hud.fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</PixelButton>
              <PixelButton onClick={() => openSettings("pause")}>Settings</PixelButton>
              <PixelButton onClick={() => setOverlay("help")}>Field Manual</PixelButton>
            </div>
          </div>
        </section>
      )}

      {overlay === "sleep" && (
        <section className="menu-overlay sleep-overlay" aria-labelledby="sleep-title">
          <div className="pixel-panel sleep-panel">
            <button type="button" className="panel-close sleep-close" onClick={resume} aria-label="Leave bed menu">×</button>
            <span className="panel-eyebrow">WILDWOOD BED · DAY {hud.day} · {hud.clock}</span>
            <h2 id="sleep-title">Choose when to wake</h2>
            <p className="panel-flavor">Rest can move time forward from any hour. Pick the next dawn or the next dusk; time never runs backward.</p>
            <div className="sleep-destinations">
              <button type="button" className="sleep-destination sleep-morning" onClick={() => restUntil("morning")}>
                <span className="sleep-celestial sleep-sun" aria-hidden="true" />
                <small>NEXT DAWN</small>
                <strong>Wake in morning</strong>
                <em>About 6:30 AM</em>
              </button>
              <button type="button" className="sleep-destination sleep-night" onClick={() => restUntil("night")}>
                <span className="sleep-celestial sleep-moon" aria-hidden="true" />
                <small>NEXT DUSK</small>
                <strong>Wake at night</strong>
                <em>About 6:30 PM</em>
              </button>
            </div>
            <div className="sleep-policy-note">
              <span>Multiplayer rest rule</span>
              <strong>{engineRef.current?.getSleepStatus().rule ?? "50% of players"}</strong>
              <small>{engineRef.current?.getSleepStatus().required ?? 1} of {engineRef.current?.getSleepStatus().onlinePlayers ?? 1} online player(s) must choose the same destination.</small>
            </div>
          </div>
        </section>
      )}

      {overlay === "creature-camp" && (
        <section className="menu-overlay creature-camp-overlay" aria-labelledby="creature-camp-title">
          <div className="pixel-panel creature-camp-panel">
            <button type="button" className="panel-close" onClick={() => setOverlay("pause")} aria-label="Close Creature Camp">×</button>
            <span className="panel-eyebrow">WAYKEEPER FIELD KIT · NO EXTRA SIMULATION</span>
            <h2 id="creature-camp-title">Creature Camp</h2>
            {campTransferOffers.length > 0 && <section className="creature-transfer-inbox" aria-label="Pending companion transfers">
              <div className="creature-camp-heading"><span>TRANSFER OFFER</span><small>Recipient consent required</small></div>
              {campTransferOffers.map((offer) => <div key={offer.offerId}><span><strong>{offer.creatureName}</strong><small>Offered by {offer.sourceName} · expires in under one minute</small></span><button type="button" onClick={() => engineRef.current?.acceptCreatureTransfer(offer.offerId)}>Accept companion</button></div>)}
            </section>}
            {campOrbs.length > 0 && <label className="creature-camp-specimen-select"><span>Working specimen</span><select value={campOrb?.orbId ?? ""} onChange={(event) => engineRef.current?.selectCampCreatureOrb(event.target.value)}>{campOrbs.map((orb) => <option key={orb.orbId} value={orb.orbId}>{orb.creature?.name?.trim() || (orb.creature ? MOB_DEFS[orb.creature.kind].name : "Stored creature")}</option>)}</select><small>Camp actions stay bound to this orb even when your hotbar changes.</small></label>}
            {!campCreature || !campOrb ? <div className="creature-camp-empty"><span aria-hidden="true">◇</span><h3>No stored creature available</h3><p>Place a filled Capture Orb anywhere in your pack, then return here to care for that exact specimen.</p><PixelButton onClick={() => engineRef.current?.openOverlay("inventory")}>Open Inventory</PixelButton></div> : <>
              <div className="creature-camp-hero">
                <CreaturePortrait kind={campCreature.kind} seen />
                <div><small>{MOB_DEFS[campCreature.kind].family ?? "creature"} · {MOB_DEFS[campCreature.kind].temperament}</small><h3>{campCreature.name?.trim() || MOB_DEFS[campCreature.kind].name}</h3><p>{campProgression ? `Level ${campProgression.level} · ${campProgression.bondTier} bond · ${campProgression.tactic} tactic` : "New specimen · progression record initializing"}</p><div>{campProgression?.shiny && <span>SHINY</span>}{campProgression?.rarityForm && campProgression.rarityForm !== "ordinary" && <span>{campProgression.rarityForm.toUpperCase()}</span>}{campProgression?.aptitudes.map((aptitude) => <span key={aptitude}>{aptitude.replaceAll("-", " ")}</span>)}</div><form className="creature-camp-name" onSubmit={(event) => { event.preventDefault(); engineRef.current?.renameSelectedCampCreature(campNameDraft); }}><label htmlFor="camp-creature-name">Recorded name</label><input id="camp-creature-name" value={campNameDraft} maxLength={32} onChange={(event) => setCampNameDraft(event.target.value)} /><button type="submit" disabled={!campNameDraft.trim()}>Save</button></form></div>
                <div className="creature-camp-health"><small>HEALTH</small><strong>{Math.ceil(campCreature.health)} / {Math.ceil(campCreature.maxHealth)}</strong><i><b style={{ width: `${campCreature.health / campCreature.maxHealth * 100}%` }} /></i></div>
              </div>
              {campRelationship && campRelationshipPolicy && <section className={`creature-relationship-card stage-${campRehabilitationStage}`}>
                <div className="creature-camp-heading"><span>{campRelationshipPolicy.title.toUpperCase()}</span><small>{campRelationship.status.replaceAll("-", " ")}</small></div>
                <p>{campRelationshipPolicy.explanation}</p>
                {campRelationship.mode === "care-bond" ? <>
                  <div className="creature-relationship-steps">
                    <span className={campRelationship.stabilized ? "done" : "active"}><b>1</b><strong>Stabilize</strong><small>{campRelationship.stabilized ? "75% health reached" : `${Math.ceil(campCreature.health / campCreature.maxHealth * 100)}% / 75% health`}</small></span>
                    <span className={campRelationship.nourished ? "done" : campRehabilitationStage === "nourish" ? "active" : ""}><b>2</b><strong>Nourish</strong><small>{campRelationship.nourished ? "preferred food accepted" : campPreferredFood !== null ? ITEMS[campPreferredFood]?.name : "no recorded food"}</small></span>
                    <span className={campRelationship.connectSessions >= campRelationship.requiredConnectSessions ? "done" : campRehabilitationStage === "connect" ? "active" : ""}><b>3</b><strong>Connect</strong><small>{campRelationship.connectSessions}/{campRelationship.requiredConnectSessions} sessions</small></span>
                    <span className={campRelationship.status === "companion" ? "done" : campRehabilitationStage === "form-bond" ? "active" : ""}><b>4</b><strong>Form Bond</strong><small>{campRelationship.status === "companion" ? "friendly and usable" : "always an explicit choice"}</small></span>
                  </div>
                  <div className="creature-relationship-actions">
                    <button type="button" disabled={campRehabilitationStage !== "connect"} onClick={() => engineRef.current?.connectSelectedCreature()}>Connect</button>
                    <button type="button" className="bond-action" disabled={campRehabilitationStage !== "form-bond"} onClick={() => engineRef.current?.formBondWithSelectedCreature()}>Form Bond</button>
                  </div>
                </> : <small>{campRelationshipPolicy.mode === "relocation-only" ? "You can preserve, study, display, relocate, or release this specimen. It is not a field companion." : "Follow the visible authored relationship path shown in its Bestiary and quest record."}</small>}
              </section>}
              {campRelationship?.status === "companion" && campTransferRecipients.length > 0 && <section className="creature-transfer-offer" aria-label="Offer companion transfer">
                <div className="creature-camp-heading"><span>KEEPER TRANSFER</span><small>Offer, then the recipient accepts</small></div>
                <p>A transfer moves this exact stored companion and its history. It never sells a filled orb or changes ownership silently.</p>
                <div><select value={campTransferRecipientId} onChange={(event) => setCampTransferRecipientId(event.target.value)} aria-label="Choose transfer recipient">{campTransferRecipients.map((recipient) => <option value={recipient.id} key={recipient.id}>{recipient.name}</option>)}</select><button type="button" disabled={!campTransferRecipientId} onClick={() => engineRef.current?.offerSelectedCampCreature(campTransferRecipientId)}>Offer companion</button></div>
              </section>}
              <div className="creature-camp-columns">
                <section><div className="creature-camp-heading"><span>CARE</span><small>Meaningful daily limits</small></div><div className="creature-care-meters">{([['exertion', campCare.exertion], ['presentation', campCare.presentation], ['cleanliness', campCare.cleanliness], ['enrichment', campCare.enrichment], ['rested', campCare.rested]] as const).map(([label, value]) => <div key={label}><span><strong>{label}</strong><small>{Math.round(value)}%</small></span><i><b style={{ width: `${value}%` }} /></i></div>)}</div><div className="creature-care-actions">{([['feed', 'Feed'], ['groom', 'Groom'], ['wash', 'Wash'], ['play', 'Play'], ['train', 'Train'], ['rest', 'Rest']] as const).map(([action, label]) => <button type="button" key={action} onClick={() => engineRef.current?.careSelectedCreature(action as CreatureCareAction)}><strong>{label}</strong><small>{action === "feed" && campRehabilitationStage === "nourish" && campPreferredFood !== null ? `bond food: ${ITEMS[campPreferredFood]?.name}` : action === "train" ? `${Math.max(0, 3 - campCare.dailyTrainingCount)} useful today` : action === "play" ? `${Math.max(0, 2 - campCare.dailyPlayCount)} useful today` : action === "rest" ? "revives at 1 health" : "care action"}</small></button>)}</div></section>
                <section>
                  <div className="creature-camp-heading"><span>TACTIC & MOVES</span><small>{campUsable ? "Real-time companion behavior" : "Locked until the relationship path is complete"}</small></div>
                  {!campUsable && <p className="creature-locked-note">Containment alone never grants orders, labor, equipment, riding, or attunement.</p>}
                  <div className="creature-tactic-grid">{(['guard', 'support', 'pursue', 'cautious', 'hold'] as const).map((tactic) => <button type="button" className={campProgression?.tactic === tactic ? "active" : ""} onClick={() => engineRef.current?.setSelectedCreatureTactic(tactic)} key={tactic}>{tactic}</button>)}</div>
                  <div className="creature-camp-moves">{(campProgression?.learnedMoveIds ?? []).map((moveId) => { const move = CREATURE_MOVES[moveId]; const active = campProgression?.activeMoveIds.includes(moveId); return move ? <button type="button" className={active ? "active" : ""} aria-pressed={active} onClick={() => engineRef.current?.toggleSelectedCreatureMove(moveId)} key={moveId}><i style={{ color: CREATURE_TYPES[move.type].color }}>{CREATURE_TYPES[move.type].glyph}</i><span><strong>{move.name}</strong><small>{active ? "AI active" : "learned"} · {move.cooldownSeconds.toFixed(1)}s</small></span></button> : null; })}</div>
                  {campProfile && <button type="button" className="creature-utility-command" onClick={() => engineRef.current?.setSelectedCreatureFieldUtility(campProfile.moves.fieldUtilityMoveId)}><strong>{CREATURE_MOVES[campProfile.moves.fieldUtilityMoveId]?.name ?? "Field Utility"}</strong><small>{campProgression?.fieldUtilityMoveId === campProfile.moves.fieldUtilityMoveId ? "Equipped field command" : "Set field command"}</small></button>}
                  {campEcology && campWork && <>
                    <div className="creature-camp-heading compare-heading"><span>HABITAT WORK</span><small>Capped aggregate cycles, no background mob bubble</small></div>
                    <div className="creature-work-grid">
                      <button type="button" className={campWork.assignment === "rest" ? "active" : ""} onClick={() => engineRef.current?.setSelectedCreatureWork("rest")}><strong>Rest</strong><small>sleeping record</small></button>
                      {campEcology.workRoles.filter((role) => role !== "none" && role !== "mount" && role !== "pack" && role !== "companion").map((role) => <button type="button" className={campWork.assignment === role ? "active" : ""} onClick={() => engineRef.current?.setSelectedCreatureWork(role)} key={role}><strong>{role.replaceAll("-", " ")}</strong><small>{campEcology.workCadenceSeconds}s grouped cycle</small></button>)}
                    </div>
                    {(campCreature.kind === "pebbletortoise" || campCreature.kind === "reefglide-terrapin") && <div className="creature-shell-modules"><small>PLANTED SHELL-BED</small>{(["moss", "flower", "fungus", "water-plant"] as CreatureShellModule[]).map((module) => <button type="button" className={campWork.shellModule === module ? "active" : ""} key={module} onClick={() => engineRef.current?.setSelectedTortoiseShellModule(campWork.shellModule === module ? null : module)}>{module.replaceAll("-", " ")}</button>)}</div>}
                    {campWork.adaptation && <p className="creature-adaptation-note"><strong>Habitat adaptation:</strong> {campWork.adaptation.replaceAll("-", " ")} · reversible through reassignment at a sanctuary.</p>}
                  </>}
                  <div className="creature-camp-heading compare-heading"><span>GEAR & RESEARCH</span><small>Fitted items return to your pack</small></div>
                  <div className="creature-gear-grid">
                    {campProfile && MOUNT_PROFILES[campCreature.kind] && <button type="button" className={campEquipment.saddle ? "active" : ""} onClick={() => engineRef.current?.toggleSelectedCreatureGear("saddle", MOB_DEFS[campCreature.kind].family === "dragon" ? Item.DragonSaddle : Item.Saddle)}><strong>Saddle</strong><small>{campEquipment.saddle ? ITEMS[campEquipment.saddle]?.name : "fit from pack"}</small></button>}
                    <button type="button" className={campEquipment.lamp ? "active" : ""} onClick={() => engineRef.current?.toggleSelectedCreatureGear("lamp", Item.DeepgearLanternItem)}><strong>Lamp</strong><small>{campEquipment.lamp ? "Deepgear Lantern fitted" : "fit from pack"}</small></button>
                    <button type="button" className={campEquipment.charm ? "active" : ""} onClick={() => engineRef.current?.toggleSelectedCreatureGear("charm", Item.BreatherCharm)}><strong>Breather Charm</strong><small>{campEquipment.charm ? "fitted" : "fit from pack"}</small></button>
                    <button type="button" onClick={() => engineRef.current?.researchSelectedCampCreature()}><strong>Record behavior</strong><small>{campResearch ? `${campResearch.progress}/${campResearch.goal} observations` : "0/3 observations"}</small></button>
                  </div>
                  <div className="creature-camp-heading compare-heading"><span>COMPARE</span><small>Visible identity, no IVs</small></div><select value={campCompareOrb?.orbId ?? ""} onChange={(event) => setCampCompareOrbId(event.target.value)}><option value="">Choose another stored specimen</option>{campOrbs.filter((orb) => orb.orbId !== campOrb.orbId).map((orb) => <option key={orb.orbId} value={orb.orbId}>{orb.creature?.name || (orb.creature ? MOB_DEFS[orb.creature.kind].name : "Specimen")}</option>)}</select>{campCompareOrb?.creature && <div className="creature-compare-card"><CreaturePortrait kind={campCompareOrb.creature.kind} seen mini /><span><strong>{campCompareOrb.creature.name || MOB_DEFS[campCompareOrb.creature.kind].name}</strong><small>Level {campCompareProgression?.level ?? 1} · {campCompareProgression?.bondTier ?? "wary"}</small><small>{campCompareProgression?.aptitudes.join(" · ") || "Aptitudes not yet recorded"}</small></span></div>}
                </section>
              </div>
              <div className="panel-actions"><PixelButton className="secondary-button" onClick={() => engineRef.current?.archiveSelectedCampCreature()}>Return to Waygrid Archive</PixelButton><PixelButton className="gold-button" onClick={() => setOverlay("pause")}>Done</PixelButton></div>
            </>}
          </div>
        </section>
      )}

      {overlay === "pet" && (
        <section className="menu-overlay pet-overlay" aria-labelledby="pet-title">
          <div className="pixel-panel pet-panel">
            <button type="button" className="panel-close pet-close" onClick={resume} aria-label="Close companion commands">×</button>
            {hud.activePet ? (
              <>
                <span className="panel-eyebrow">PEELOP COMPANION · {hud.activePet.baby ? "YOUNG" : "ADULT"}</span>
                <div className="pet-panel-hero">
                  <CreaturePortrait kind={"peelop" as MobKind} seen />
                  <div>
                    <h2 id="pet-title">{hud.activePet.name}</h2>
                    <p>{hud.activePet.tamed ? "Your bright little grove scout." : "This Peelop is still deciding whether you are trustworthy."}</p>
                    <div className="pet-health" aria-label={`${formatHudHealth(hud.activePet.health)} of ${formatHudHealth(hud.activePet.maxHealth)} health`}><span style={{ width: `${Math.max(0, Math.min(100, hud.activePet.health / hud.activePet.maxHealth * 100))}%` }} /><b>{formatHudHealth(hud.activePet.health)}/{formatHudHealth(hud.activePet.maxHealth)}</b></div>
                  </div>
                </div>
                <form className="pet-name-form" onSubmit={(event) => { event.preventDefault(); engineRef.current?.renameActivePet(petNameDraft); }}>
                  <label htmlFor="pet-name">Name</label>
                  <input id="pet-name" className="pixel-input" value={petNameDraft} maxLength={32} onChange={(event) => setPetNameDraft(event.target.value)} />
                  <PixelButton disabled={!petNameDraft.trim()} onClick={() => engineRef.current?.renameActivePet(petNameDraft)}>SAVE NAME</PixelButton>
                </form>
                <fieldset className="pet-command-grid">
                  <legend>COMMAND</legend>
                  {([
                    ["follow", "FOLLOW", "Stay close while you travel."],
                    ["sit", "SIT", "Rest here until called."],
                    ["stay", "STAY", "Guard this immediate area."],
                    ["wander", "WANDER", "Explore nearby on its own."],
                  ] as Array<[PetCommand, string, string]>).map(([command, label, description]) => (
                    <button type="button" key={command} className={hud.activePet?.command === command ? "active" : ""} aria-pressed={hud.activePet?.command === command} onClick={() => engineRef.current?.commandActivePet(command)}>
                      <strong>{label}</strong><span>{description}</span>
                    </button>
                  ))}
                </fieldset>
                <p className="pet-panel-hint">Feed Golden Bananas to heal, tame, and breed Peelops. Crouch-use again for detailed commands.</p>
              </>
            ) : (
              <div className="pet-panel-empty"><h2 id="pet-title">No companion selected</h2><p>Move close to a tamed Peelop and crouch-use it to open its commands.</p></div>
            )}
          </div>
        </section>
      )}

      {overlay === "dragon" && hud.activeDragon && (
        <DragonPanel
          dragon={hud.activeDragon.state}
          displayName={hud.activeDragon.name}
          portrait={<CreaturePortrait kind={`${hud.activeDragon.state.type}-dragon` as MobKind} seen />}
          onClose={resume}
          onCommand={(command) => { engineRef.current?.commandActiveDragon(command); }}
          onToggleShoulder={() => { engineRef.current?.toggleActiveDragonShoulder(); }}
          onHarvestScales={() => { engineRef.current?.harvestActiveDragonScales(); }}
          onOpenCargo={() => { engineRef.current?.openActiveDragonCargo(); }}
        />
      )}

      {(overlay === "magic" || overlay === "skills") && (
        <section className="menu-overlay dragon-magic-overlay" aria-label="Dragonheart arcanum">
          <DragonMagicPanel
            key={overlay}
            magic={hud.magic}
            skills={hud.skills}
            activeEffects={activeStatusEffects}
            initialTab={overlay === "skills" ? "skills" : "spells"}
            onClose={resume}
            onSelectSpell={(spellId) => { engineRef.current?.selectMagicSpell(spellId); }}
            onToggleFavorite={(spellId) => { engineRef.current?.toggleMagicFavorite(spellId); }}
            onUnlockPerk={(perkId) => { engineRef.current?.unlockSkillPerk(perkId); }}
            onToggleAscendant={(enabled, skillId) => { engineRef.current?.toggleAscendantTrait(skillId, enabled); }}
          />
        </section>
      )}

      {(overlay === "spell-wheel" || spellWheelAuditMode) && (
        <SpellWheelPanel
          open
          magic={hud.magic}
          onSelectSpell={(spellId) => { engineRef.current?.selectMagicSpell(spellId); }}
          onClose={() => {
            if (spellWheelAuditMode) setSpellWheelAuditMode(false);
            else { engineRef.current?.closeSpellWheel(); setOverlay(null); }
          }}
        />
      )}

      {overlay === "incubator" && (
        <section className="menu-overlay" aria-labelledby="incubator-title">
          <div className="pixel-panel sleep-panel">
            <button type="button" className="panel-close" onClick={resume} aria-label="Close incubator guide">×</button>
            <span className="panel-eyebrow">DRACONIC INCUBATOR · CONTROLLED HATCHING</span>
            <h2 id="incubator-title">Elemental incubation</h2>
            <p className="panel-flavor">Place a dragon egg beside this machine. It preserves lineage and sex while converting a completed incubation into a portable spawn egg.</p>
            <div className="sleep-policy-note"><span>Fire</span><strong>Sustained flame</strong><small>Keep open flame or lava beside the egg.</small></div>
            <div className="sleep-policy-note"><span>Ice</span><strong>Freezing source water</strong><small>Submerge the egg and ring it with ice or snow.</small></div>
            <div className="sleep-policy-note"><span>Steel</span><strong>Heated metal + steam</strong><small>Combine water, heat, and riveted metal around the shell.</small></div>
          </div>
        </section>
      )}

      {(overlay === "inventory" || overlay === "crafting") && (
        <section className="menu-overlay inventory-overlay" aria-labelledby="inventory-title" onPointerMove={trackCursor} onPointerUp={finishInventoryDrag} onPointerCancel={cancelInventoryDrag}>
          <div className={`mc-window inventory-window ${inventoryTab === "recipes" ? "recipe-mode" : ""}`}>
            <header className="mc-window-header">
              <div><span className="panel-eyebrow">{overlay === "crafting" ? "CRAFTING TABLE · 3×3" : hud.mode === "builder" ? "CREATIVE INVENTORY" : "PACK · 2×2 CRAFTING"}</span><h2 id="inventory-title">{overlay === "crafting" ? "Crafting Table" : "Inventory"}</h2></div>
              <button type="button" className="panel-close" onClick={resume} aria-label="Close inventory">×</button>
            </header>
            <div className="inventory-tabs">
              <button type="button" className={inventoryTab === "inventory" ? "active" : ""} onClick={() => setInventoryTab("inventory")}>PACK</button>
              <button type="button" className={inventoryTab === "recipes" ? "active" : ""} onClick={() => setInventoryTab("recipes")}>RECIPES</button>
              {hud.mode === "builder" && <button type="button" className={inventoryTab === "creative" ? "active" : ""} onClick={() => setInventoryTab("creative")}>ALL ITEMS</button>}
            </div>
            {inventoryTab === "creative" && hud.mode === "builder" ? (
              <div className="creative-browser">
                <label className="creative-search"><span>SEARCH EVERY ITEM</span><input type="search" value={creativeQuery} onChange={(event) => setCreativeQuery(event.target.value)} placeholder="Name, block, tool, food, relic..." autoComplete="off" /><b>{visibleCreativeBlocks.length}</b></label>
                <div className="creative-catalog">
                  {visibleCreativeBlocks.map((item) => (
                    <button type="button" key={item} className="creative-entry" onClick={() => engineRef.current?.setCreativeItem(item)} title={`Place ${ITEMS[item]?.name ?? "item"} in the selected hotbar slot`}><ItemIcon item={item} /><span>{ITEMS[item]?.name}</span><small>{itemPresentationFamily(item).replace(/^authored-/u, "")}</small></button>
                  ))}
                  {!visibleCreativeBlocks.length && <p className="creative-empty">No Creative items match “{creativeQuery.trim()}”.</p>}
                </div>
              </div>
            ) : (
              <div className={`inventory-workbench-layout ${inventoryTab === "recipes" ? "recipe-workbench-layout" : ""}`}>
                {inventoryTab === "recipes" ? renderRecipeBook(overlay === "crafting") : (
                  <div className="player-paper-doll">
                    <div className="paper-doll-identity"><span>ACTIVE TRAILBLAZER</span><strong>{activeCharacterProfile.name}</strong><small>{activeCharacterProfile.appearance.sex === "female" ? "Female" : "Male"} {activeCharacterProfile.appearance.race.replace(/-/gu, " ")}</small></div>
                    <div className="paper-doll-stage">
                      <div className="equipment-slots">
                        {renderSlot(hud.equipment.head, "armor-head", (shift) => engineRef.current?.equipmentClick("head", "left", shift), () => engineRef.current?.equipmentClick("head", "right"), "equipment-slot", "Head armor")}
                        {renderSlot(hud.equipment.chest, "armor-chest", (shift) => engineRef.current?.equipmentClick("chest", "left", shift), () => engineRef.current?.equipmentClick("chest", "right"), "equipment-slot", "Chest armor")}
                        {renderSlot(hud.equipment.legs, "armor-legs", (shift) => engineRef.current?.equipmentClick("legs", "left", shift), () => engineRef.current?.equipmentClick("legs", "right"), "equipment-slot", "Leg armor")}
                        {renderSlot(hud.equipment.feet, "armor-feet", (shift) => engineRef.current?.equipmentClick("feet", "left", shift), () => engineRef.current?.equipmentClick("feet", "right"), "equipment-slot", "Boots")}
                        {renderSlot(hud.offhand, "offhand", (shift) => engineRef.current?.offhandClick("left", shift), () => engineRef.current?.offhandClick("right"), `equipment-slot offhand-slot ${hud.shieldRaised ? "raised" : ""}`, "Offhand shield, torch, or lantern")}
                      </div>
                      <PlayerAvatarPreview variant={activeCharacterProfile.appearance.sex} appearance={activeCharacterProfile.appearance} equipment={hud.equipment} heldItem={selectedSlot?.item} offhandItem={hud.offhand?.item} />
                    </div>
                    <span className="paper-doll-held"><small>HELD</small>{selectedSlot ? <><ItemIcon item={selectedSlot.item} slot={selectedSlot} small /><b>{selectedName}</b></> : <b>Empty hand</b>}</span>
                    <span className="gold-wallet-slot" aria-label={`${hud.goldWallet.balance} gold in wallet`}><i aria-hidden="true">◆</i><small>GOLD WALLET</small><b>{hud.goldWallet.balance}</b><em>NO STACK LIMIT</em></span>
                    <div className="gold-wallet-actions" aria-label="Gold Ingot wallet exchange"><button type="button" onClick={() => engineRef.current?.depositGoldIngots("one")}>Deposit 1</button><button type="button" onClick={() => engineRef.current?.depositGoldIngots("all")}>Deposit all</button><button type="button" onClick={() => engineRef.current?.withdrawGoldIngots("one")}>Withdraw 1</button><button type="button" onClick={() => engineRef.current?.withdrawGoldIngots("all")}>Withdraw max</button><small>1 ingot = 10 gold</small></div>
                    <div className="inventory-trash-area">
                      <span><small>TRASH</small><b>Recover until replaced</b></span>
                      {renderSlot(hud.trash, "trash", () => engineRef.current?.trashClick("left"), () => engineRef.current?.trashClick("right"), "trash-slot", "Recoverable trash slot")}
                    </div>
                    <span className="armor-readout">ARMOR {hud.armor}</span>
                    <small>LEVEL {hud.level}</small>
                    <b>{hud.depth}</b>
                  </div>
                )}
                <div className="crafting-and-pack">
                  <div className="craft-title">CRAFTING {overlay === "crafting" ? "3×3" : "2×2"}</div>
                  {renderCraftingArea(overlay === "crafting" ? 3 : 2)}
                  {renderPlayerInventory(true)}
                </div>
              </div>
            )}
            <div className="inventory-instructions">Left click moves stacks · Hold and drag to share a stack · Right click splits or paints one per slot · Double-click gathers matching items · Shift-click transfers</div>
          </div>
          {inventoryDisplayCursor && <div ref={setHeldStackElement} className="held-stack"><SlotContents slot={inventoryDisplayCursor} /></div>}
        </section>
      )}

      {overlay === "furnace" && (
        <section className="menu-overlay inventory-overlay" aria-labelledby="furnace-title" onPointerMove={trackCursor}>
          <div className="mc-window machine-window">
            <header className="mc-window-header"><div><span className="panel-eyebrow">SMELTING STATION</span><h2 id="furnace-title">Furnace</h2></div><button type="button" className="panel-close" onClick={resume}>×</button></header>
            <div className="furnace-layout">
              <div className="furnace-input-stack">
                {renderSlot(hud.activeFurnace?.input ?? null, "furnace-input", (shift) => engineRef.current?.machineClick("furnace", 0, "left", shift), () => engineRef.current?.machineClick("furnace", 0, "right"), "machine-slot", "Smelting input")}
                <div className={`furnace-flame ${(hud.activeFurnace?.burn ?? 0) > 0 ? "lit" : ""}`}><span>♨</span><i style={{ height: `${hud.activeFurnace?.burnMax ? hud.activeFurnace.burn / hud.activeFurnace.burnMax * 100 : 0}%` }} /></div>
                {renderSlot(hud.activeFurnace?.fuel ?? null, "furnace-fuel", (shift) => engineRef.current?.machineClick("furnace", 1, "left", shift), () => engineRef.current?.machineClick("furnace", 1, "right"), "machine-slot", "Fuel")}
              </div>
              <div className="smelt-progress" aria-label={`Smelting ${Math.round(Math.min(100, (hud.activeFurnace?.progress ?? 0) / 8 * 100))}% complete`}><span style={{ width: `${Math.min(100, (hud.activeFurnace?.progress ?? 0) / 8 * 100)}%` }} /><i aria-hidden="true" /></div>
              {renderSlot(hud.activeFurnace?.output ?? null, "furnace-output", (shift) => engineRef.current?.machineClick("furnace", 2, "left", shift), () => engineRef.current?.machineClick("furnace", 2, "right"), "machine-slot furnace-output-slot", "Smelted output")}
              <div className="smelt-guide"><strong>SMELTING</strong><span>Ore → ingot</span><span>Sand → glass</span><span>Raw meat → cooked</span><span>Log → charcoal</span><span>Cobble → stone</span><small>Coal burns longest. Sticks burn with admirable optimism.</small></div>
            </div>
            {renderPlayerInventory()}
          </div>
          {hud.cursor && <div ref={setHeldStackElement} className="held-stack"><SlotContents slot={hud.cursor} /></div>}
        </section>
      )}

      {overlay === "wheat-mill" && (
        <section className="menu-overlay inventory-overlay" aria-labelledby="wheat-mill-title" onPointerMove={trackCursor}>
          <div className="mc-window machine-window wheat-mill-window">
            <header className="mc-window-header"><div><span className="panel-eyebrow">HEARTHKIN PANTRY CRAFT</span><h2 id="wheat-mill-title">Wheat Mill</h2></div><button type="button" className="panel-close" onClick={resume}>Ã—</button></header>
            <div className="wheat-mill-layout">
              <div className="wheat-mill-slot"><small>GRAIN HOPPER</small>{renderSlot(hud.activeWheatMill?.input ?? null, "wheat-mill-input", (shift) => engineRef.current?.machineClick("wheat-mill", 0, "left", shift), () => engineRef.current?.machineClick("wheat-mill", 0, "right"), "machine-slot", "Wheat input")}</div>
              <div className={`mill-wheel ${(hud.activeWheatMill?.input?.count ?? 0) > 0 && (hud.activeWheatMill?.output?.count ?? 0) < 64 ? "turning" : ""}`} aria-hidden="true"><span /></div>
              <div className="smelt-progress" aria-label={`Milling ${Math.round(Math.min(100, (hud.activeWheatMill?.progressSeconds ?? 0) / WHEAT_MILL_CYCLE_SECONDS * 100))}% complete`}><span style={{ width: `${Math.min(100, (hud.activeWheatMill?.progressSeconds ?? 0) / WHEAT_MILL_CYCLE_SECONDS * 100)}%` }} /><i aria-hidden="true" /></div>
              <div className="wheat-mill-slot"><small>FLOUR SACK</small>{renderSlot(hud.activeWheatMill?.output ?? null, "wheat-mill-output", (shift) => engineRef.current?.machineClick("wheat-mill", 1, "left", shift), () => engineRef.current?.machineClick("wheat-mill", 1, "right"), "machine-slot furnace-output-slot", "Flour output")}</div>
              <div className="smelt-guide"><strong>PASSIVE MILLING</strong><span>1 Wheat â†’ 1 Flour</span><small>No fuel needed. The runner turns while grain and output room remain.</small></div>
            </div>
            {renderPlayerInventory()}
          </div>
          {hud.cursor && <div ref={setHeldStackElement} className="held-stack"><SlotContents slot={hud.cursor} /></div>}
        </section>
      )}

      {overlay === "chest" && (
        <section className="menu-overlay inventory-overlay" aria-labelledby="chest-title" onPointerMove={trackCursor}>
          <div className="mc-window chest-window">
            <header className="mc-window-header"><div><span className="panel-eyebrow">WILDWOOD STORAGE</span><h2 id="chest-title">{hud.activeChestTitle}</h2></div><button type="button" className="panel-close" onClick={resume}>×</button></header>
            <span className="grid-label">CHEST</span>
            <div className="mc-grid chest-grid">
              {(hud.activeChest ?? blankSlots(27)).map((slot, index) => renderSlot(slot, `chest-${index}`, (shift) => engineRef.current?.machineClick("chest", index, "left", shift), () => engineRef.current?.machineClick("chest", index, "right")))}
            </div>
            {!hud.activeChestTitle.toLocaleLowerCase().includes("conservatory") && <div className="container-utility-bar" aria-label="Chest inventory actions"><button type="button" onClick={() => engineRef.current?.sortActiveChest()}>Sort chest</button><button type="button" onClick={() => engineRef.current?.stackIntoActiveChest()}>Stack → chest</button><button type="button" onClick={() => engineRef.current?.stackFromActiveChest()}>Stack → pack</button><button type="button" onClick={() => engineRef.current?.takeAllFromActiveChest()}>Take all</button><button type="button" onClick={() => engineRef.current?.pushAllIntoActiveChest()}>Push all</button></div>}
            {renderPlayerInventory(true)}
          </div>
          {hud.cursor && <div ref={setHeldStackElement} className="held-stack"><SlotContents slot={hud.cursor} /></div>}
        </section>
      )}

      {overlay === "apiary" && renderApiaryPanel(hud.activeApiary)}
      {overlay === "morph-loom" && renderMorphLoomPanel(hud.activeMorphLoom)}
      {overlay === "aquarium" && hud.activeAquarium && (
        <section className="menu-overlay" aria-label="Connected aquarium habitat">
          <AquariumPanel
            state={hud.activeAquarium}
            onInsertSelected={() => { engineRef.current?.aquariumInsertSelectedOrb(); }}
            onRemoveResident={(residentId) => { engineRef.current?.aquariumRemoveResident(residentId); }}
            onClose={resume}
          />
        </section>
      )}
      {overlay === "orb-rack" && renderOrbStationPanel("orb-rack", hud.activeOrbRack)}
      {overlay === "healing-station" && renderOrbStationPanel("healing-station", hud.activeHealingStation)}
      {overlay === "waygrid-items" && (
        <div onPointerMove={trackCursor}>
          <WaygridItemPanel
            entries={hud.activeWaygridItems?.entries ?? []}
            utilization={hud.activeWaygridItems?.utilization ?? { used: 0, capacity: 0, percentage: 0, label: "0/0" }}
            cellCounts={hud.activeWaygridItems?.cellCounts ?? [0, 0, 0]}
            onClose={resume}
            onDepositSelected={() => { engineRef.current?.depositSelectedIntoWaygrid("items"); }}
            onWithdraw={(signature, count) => { engineRef.current?.withdrawWaygridItem(signature, count); }}
            inventory={renderPlayerInventory()}
          />
          {hud.cursor && <div ref={setHeldStackElement} className="held-stack"><SlotContents slot={hud.cursor} /></div>}
        </div>
      )}
      {overlay === "waygrid-creatures" && (
        <div onPointerMove={trackCursor}>
          <WaygridCreaturePanel
            entries={hud.activeWaygridCreatures?.entries ?? []}
            utilization={hud.activeWaygridCreatures?.utilization ?? { used: 0, capacity: 0, percentage: 0, label: "0/0" }}
            cellCounts={hud.activeWaygridCreatures?.cellCounts ?? [0, 0, 0]}
            healProgress={hud.activeWaygridCreatures?.healProgress ?? 0}
            onClose={resume}
            onDepositSelected={() => { engineRef.current?.depositSelectedIntoWaygrid("creatures"); }}
            onWithdraw={(orbId) => { engineRef.current?.withdrawWaygridCreature(orbId); }}
            renderPortrait={(kind) => <CreaturePortrait kind={kind as MobKind} seen mini />}
            inventory={renderPlayerInventory()}
          />
          {hud.cursor && <div ref={setHeldStackElement} className="held-stack"><SlotContents slot={hud.cursor} /></div>}
        </div>
      )}

      {overlay === "golem-forge" && hud.activeGolemForge && (
        <section className="menu-overlay golem-forge-overlay" aria-label="Golem Forge">
          <GolemForgePanel
            state={hud.activeGolemForge}
            inventory={hud.golemForgeResources ?? {}}
            selectedType={selectedGolemType}
            availablePlayerMana={hud.golemForgeAvailableMana ?? 0}
            onSelectType={setSelectedGolemType}
            onChargeMana={(amount) => { engineRef.current?.chargeActiveGolemForge(amount); }}
            onStart={(type) => { engineRef.current?.startActiveGolemForge(type); }}
            onClaim={(index) => { engineRef.current?.claimActiveGolemForge(index); }}
            onClose={resume}
          />
        </section>
      )}

      {(overlay === "map" || overlay === "cartography") && (
        <section className="menu-overlay hearthroads-overlay" aria-label="World map">
          <MapPanel
            knowledge={hud.mapKnowledge}
            currentPosition={currentPosition}
            currentHeadingRadians={hud.mapHeading}
            otherPlayers={hud.mapPlayers}
            minimumZoom={minimumMapZoom}
            alwaysShowPoiLabels={showDistantPoiLabels}
            trackedTargetId={trackedNavigationId}
            onTrackTarget={setTrackedNavigationId}
            minimapEnabled={settings.showMinimap}
            onMinimapEnabledChange={(enabled) => updateSettings({ showMinimap: enabled })}
            selectedMarkerId={selectedMapMarkerId}
            onSelectMarker={setSelectedMapMarkerId}
            onAddManualMarker={(name) => { hearthroadsApi?.addManualMapMarker?.(name); }}
            onRemoveManualMarker={(markerId) => { hearthroadsApi?.removeMapMarker?.(markerId); setSelectedMapMarkerId(null); }}
            onRenameMarker={(markerId, name) => { hearthroadsApi?.renameWayshrineMarker?.(markerId, name); }}
            onBeginFastTravel={(marker: MapMarker) => { hearthroadsApi?.requestFastTravel?.(marker.id); }}
            fastTravelChannel={hud.fastTravelChannel}
            fastTravelElapsedSeconds={fastTravelElapsed}
            currentWayshrineId={currentWayshrineId}
            cartographySession={cartographySession}
            onShareCartography={hearthroadsApi?.shareCartographyMaps ? () => {
              if (hearthroadsApi.shareCartographyMaps?.()) showToast("Both trail maps now share explored roads and discovered places.");
            } : undefined}
            onClose={resume}
          />
        </section>
      )}

      {overlay === "quests" && (
        <section className="menu-overlay hearthroads-overlay" aria-label="Quest journal">
          <QuestPanel
            book={hud.questBook}
            definitions={hud.questDefinitions}
            guildBook={hud.guildBook}
            onAccept={(questId) => { hearthroadsApi?.acceptQuestById?.(questId); }}
            onPin={(questId) => { hearthroadsApi?.pinQuestById?.(questId); }}
            onAbandon={(questId) => { hearthroadsApi?.abandonQuestById?.(questId); }}
            onTurnIn={(questId) => { hearthroadsApi?.turnInQuestById?.(questId); }}
            source={questSource}
            onTrackTurnIn={(questId) => {
              const markerId = hearthroadsApi?.trackQuestTurnIn?.(questId) ?? null;
              if (markerId) setTrackedNavigationId(markerId);
            }}
            onClose={resume}
          />
        </section>
      )}

      {overlay === "guilds" && (
        <GuildPanel
          state={hud.guildBook}
          onClose={resume}
          onJoin={(guildId) => { engineRef.current?.joinGuild(guildId); }}
          onStartQuest={(questId) => { engineRef.current?.startGuildQuest(questId); }}
          onResolveQuest={(questId, outcomeId) => { engineRef.current?.completeGuildQuest(questId, outcomeId); }}
          onPromote={(guildId) => { engineRef.current?.promoteGuild(guildId); }}
        />
      )}

      {overlay === "cardforge" && (
        <CardforgePanel
          key={hud.cardforge.activeMatch?.id ?? "cardforge-hub"}
          state={hud.cardforge}
          guildBook={hud.guildBook}
          walletBalance={hud.goldWallet.balance}
          onClose={resume}
          onStartTutorial={() => { engineRef.current?.startCardforgeTutorial(); }}
          onClaimStarter={() => { engineRef.current?.claimCardforgeStarter(); }}
          onOpenPack={(batchId) => { engineRef.current?.openCardforgePack(batchId); }}
          onMoveCards={(printingId, count, from, to) => { engineRef.current?.moveCardforgeCards(printingId, count, from, to); }}
          onArchiveDuplicates={() => { engineRef.current?.archiveCardforgeDuplicates(); }}
          onUpgradeArchive={() => { engineRef.current?.upgradeCardforgeArchive(); }}
          onWithdrawLoose={(printingId, count) => { engineRef.current?.withdrawCardforgeLooseCard(printingId, count); }}
          onSaveDeck={(input) => { engineRef.current?.saveCardforgeDeck(input); }}
          onSetActiveDeck={(deckId) => { engineRef.current?.setActiveCardforgeDeck(deckId); }}
          onStartNpcMatch={(opponentId) => { engineRef.current?.startCardforgeNpcMatch(opponentId); }}
          onMatchAction={(matchId, action, expectedRevision) => { engineRef.current?.actCardforgeMatch(matchId, action, expectedRevision); }}
          onBuy={(entryId, quantity) => { engineRef.current?.buyCardforgeStock(entryId, quantity); }}
          onSell={(printingId, quantity, location) => { engineRef.current?.sellCardforgeCard(printingId, quantity, location); }}
          onTrade={(recipientId, assets) => { engineRef.current?.offerCardforgeTrade(recipientId, assets); }}
          onTradeResponse={(tradeId, accept) => { engineRef.current?.respondCardforgeTrade(tradeId, accept); }}
          onChallenge={(recipientId) => { engineRef.current?.challengeCardforgePeer(recipientId); }}
          onChallengeResponse={(challengeId, accept) => { engineRef.current?.respondCardforgeChallenge(challengeId, accept); }}
          onJoinGuild={(guildId) => { engineRef.current?.joinGuild(guildId); }}
          onStartGuildQuest={(questId) => { engineRef.current?.startGuildQuest(questId); }}
          onResolveGuildQuest={(questId, outcomeId) => { engineRef.current?.completeGuildQuest(questId, outcomeId); }}
          onPromoteGuild={(guildId) => { engineRef.current?.promoteGuild(guildId); }}
        />
      )}

      {overlay === "alchemy" && alchemyState && (
        <section className="menu-overlay hearthroads-overlay" aria-label="Alchemy stand">
          <StationPanel
            kind="alchemy"
            state={alchemyState}
            recipes={ALCHEMY_RECIPES}
            inventory={resourceInventory}
            blueprints={hud.blueprints}
            onSelectRecipe={setSelectedAlchemyRecipe}
            onStartBatch={(recipeId) => { hearthroadsApi?.startStationBatch?.("alchemy", recipeId); }}
            onCollectOutput={() => { hearthroadsApi?.collectStationOutput?.("alchemy"); }}
            onClose={resume}
          />
        </section>
      )}

      {overlay === "distillery" && distilleryState && (
        <section className="menu-overlay hearthroads-overlay" aria-label="Distillery">
          <StationPanel
            kind="distillery"
            state={distilleryState}
            recipes={DISTILLERY_RECIPES}
            inventory={resourceInventory}
            blueprints={hud.blueprints}
            onSelectRecipe={setSelectedDistilleryRecipe}
            onStartBatch={(recipeId) => { hearthroadsApi?.startStationBatch?.("distillery", recipeId); }}
            onCollectOutput={() => { hearthroadsApi?.collectStationOutput?.("distillery"); }}
            onClose={resume}
          />
        </section>
      )}

      {overlay === "sugarworks" && sugarworksState && (
        <section className="menu-overlay hearthroads-overlay sugarworks-overlay" aria-label="Sugarworks">
          <StationPanel
            kind="sugarworks"
            state={sugarworksState}
            recipes={SUGARWORKS_RECIPES}
            inventory={resourceInventory}
            blueprints={hud.blueprints}
            onSelectRecipe={setSelectedSugarworksRecipe}
            onStartBatch={(recipeId) => { hearthroadsApi?.startStationBatch?.("sugarworks", recipeId); }}
            onCollectOutput={() => { hearthroadsApi?.collectStationOutput?.("sugarworks"); }}
            onClose={resume}
          />
        </section>
      )}

      {overlay === "sentient" && (
        <section className="menu-overlay hearthroads-overlay" aria-label={`Talk to ${activeCharacterName}`}>
          <SentientDialoguePanel
            character={{ id: activeResident?.id ?? activeMerchant?.id ?? "nearby-resident", name: activeCharacterName, factionId: activeFactionId, profession: activeProfession, portraitUrl: characterPortrait, alignment: activeFactionAlignment }}
            greeting={activeFactionCopy.greeting}
            body={activeFactionId === "atlantians"
              ? `The Lumen Tidemoots remember favors, trades, and harm through every shared current. Their unwalled homes remain underwater, lit by living reeflight. Your current standing is ${activeFactionAlignment >= 0 ? "+" : ""}${activeFactionAlignment}.`
              : `${FACTIONS[activeFactionId].name} remember favors, trades, and harm. Your current standing is ${activeFactionAlignment >= 0 ? "+" : ""}${activeFactionAlignment}.`}
            choices={[
              ...(activeMerchant ? [{ id: "trade", label: "Trade", description: "Buy from their stock or sell goods from your pack.", badge: `${activeMerchant.gold}g`, tone: "warm" as const }] : []),
              ...(hud.activeSentient?.guildId ? [{ id: "guild", label: "Open the living ledger", description: `Review ${GUILDS[hud.activeSentient.guildId].name}, its ranks, campaign, people, and persistent consequences.`, tone: "warm" as const }] : []),
              ...(hud.activeSentient?.guildNpcId && hud.activeSentient.recruitable && !hud.activeSentient.hired ? [{ id: "guild-recruit", label: hud.activeSentient.recruitReady ? "Invite into your company" : "Ask about traveling together", description: hud.activeSentient.recruitReady ? "Recruit this named companion under their authored recovery and personal-trust rules." : "Their personal trust opens after chapter six of this guild campaign.", tone: hud.activeSentient.recruitReady ? "warm" as const : "plain" as const }] : []),
              ...(activeProfession === "banker" && activeFactionId === "hobbits" ? [{ id: "bank", label: "Use the freehold bank", description: "Deposit gold, withdraw freely, or review local ventures.", tone: "warm" as const }] : []),
              { id: "quests", label: "Ask about work", description: "Review story roads and any available side work.", tone: "plain" as const },
              ...(!activeSettlement && hud.activeSentient?.residentId ? [{ id: "directions", label: "Ask for town directions", description: `Mark the road to the nearest known ${FACTIONS[activeFactionId].name} town or village.`, tone: "plain" as const }] : []),
              ...(activeSettlement ? [{ id: "settlement", label: activeFactionCopy.settlementChoice, description: activeFactionCopy.settlementChoiceDescription, tone: "plain" as const }] : []),
              ...(hud.activeSentient?.hired || activeResident?.hiredByPlayerId ? [{ id: "follower", label: "Review follower orders", description: "Rename this hireling or set stance, formation, and follow distance.", tone: "plain" as const }] : []),
              ...(isMayorProfession(activeProfession) && activeSettlement?.ownerFactionId !== "player" ? [{ id: "claim", label: "Threaten a claim", description: "Only possible after every settlement warrior has fallen. This severely harms faction standing.", tone: "warning" as const }] : []),
            ]}
            onChoose={(choiceId) => {
              if (choiceId === "trade") setOverlay("trade");
              else if (choiceId === "guild") setOverlay("guilds");
              else if (choiceId === "guild-recruit" && hud.activeSentient?.guildNpcId) engineRef.current?.recruitGuildNpc(hud.activeSentient.guildNpcId);
              else if (choiceId === "bank") setOverlay("bank");
              else if (choiceId === "quests") setOverlay("quests");
              else if (choiceId === "settlement") setOverlay("settlement");
              else if (choiceId === "directions") {
                const markerId = hearthroadsApi?.setNearestFactionTownWaypoint?.() ?? null;
                if (markerId) setTrackedNavigationId(markerId);
              }
              else if (choiceId === "follower") setOverlay("follower");
              else if (choiceId === "claim") {
                if (!hearthroadsApi?.claimActiveSettlement?.()) showToast("The mayor will not yield this settlement under the current conditions.");
              }
            }}
            onClose={resume}
          />
        </section>
      )}

      {overlay === "trade" && activeMerchant && (
        <section className="menu-overlay hearthroads-overlay" aria-label="Merchant trade">
          <TradePanel
            merchant={activeMerchant}
            playerGold={hud.goldWallet.balance}
            playerInventory={playerCommerceInventory}
            catalog={playerCommerceCatalog}
            purchaseCapacity={playerPurchaseCapacity}
            pricing={{
              barteringLevel: hud.skills.skills.bartering.level,
              factionAlignment: activeFactionAlignment,
              alignmentInfluenceBonusPercent: hud.skills.unlockedPerkIds.includes("bartering-open-ledger") ? 25 : 0,
            }}
            merchantName={activeCharacterName}
            onTrade={(itemKey, quantity, direction) => {
              if (!hearthroadsApi?.tradeWithActiveMerchant?.(direction, itemKey, quantity)) showToast("The merchant is still arranging that side of the counter.");
            }}
            onClose={resume}
          />
        </section>
      )}

      {overlay === "bank" && (
        <section className="menu-overlay hearthroads-overlay" aria-label="Hobbit bank">
          <HobbitBankPanel
            account={hud.bankAccount}
            wallet={hud.goldWallet}
            market={hud.stockMarket}
            worldDay={hud.day}
            bankerName={activeCharacterName}
            onDeposit={(amount) => { if (!hearthroadsApi?.depositGold?.(amount)) showToast("That deposit could not be posted."); }}
            onWithdraw={(amount) => { if (!hearthroadsApi?.withdrawGold?.(amount)) showToast("That withdrawal could not be posted."); }}
            onBuyStock={(symbol, shares) => { if (!hearthroadsApi?.buyStockShares?.(symbol, shares)) showToast("That buy order could not be placed."); }}
            onSellStock={(symbol, shares) => { if (!hearthroadsApi?.sellStockShares?.(symbol, shares)) showToast("That sell order could not be placed."); }}
            onClose={resume}
          />
        </section>
      )}

      {overlay === "settlement" && activeSettlement && (
        <section className="menu-overlay hearthroads-overlay" aria-label="Settlement directory">
          <SettlementPanel
            settlement={activeSettlement}
            settlementName={SETTLEMENT_DISPLAY_NAMES[activeSettlement.ownerFactionId]}
            alignment={alignmentFor(hud.factionRelations, activeSettlement.ownerFactionId)}
            onSetRoleWaypoint={(profession) => {
              if (!hearthroadsApi?.setSettlementRoleWaypoint?.(profession)) showToast("No living resident currently fills that role.");
            }}
            onSelectResident={(residentId) => {
              const markerId = hearthroadsApi?.selectSettlementResident?.(residentId) ?? null;
              if (markerId) setTrackedNavigationId(markerId);
              else showToast("That resident is not currently available to track.");
            }}
            onHireResident={isMayorProfession(activeProfession) ? (residentId) => {
              if (!hearthroadsApi?.hireResidentFromMayor?.(residentId)) showToast("That resident is not currently available for hire.");
            } : undefined}
            onOpenSettlementMap={() => {
              const nearest = hud.mapKnowledge.markers.find((marker) => Math.hypot(marker.position.x - activeSettlement.layout.center.x, marker.position.z - activeSettlement.layout.center.z) < 16);
              if (nearest) setSelectedMapMarkerId(nearest.id);
              setOverlay("map");
            }}
            onClose={resume}
          />
        </section>
      )}

      {overlay === "follower" && (
        <section className="menu-overlay hearthroads-overlay" aria-labelledby="follower-orders-title">
          <div className="hearthroads-panel mc-window hearthroads-follower-panel">
            <header className="hearthroads-panel-header mc-window-header"><div><span className="panel-eyebrow">HIRED COMPANION · YOUR FACTION</span><h2 id="follower-orders-title">Follower Orders</h2><p>{activeCharacterName} will use equipped weapons and keep formation on the road.</p></div><button className="panel-close" type="button" onClick={resume}>×</button></header>
            <div className="hearthroads-follower-orders">
              <form className="hearthroads-hireling-name" onSubmit={(event) => { event.preventDefault(); if (hearthroadsApi?.renameActiveHireling?.(hirelingNameDraft)) setHirelingNameDraft(""); }}><label htmlFor="hireling-name">Companion name</label><input id="hireling-name" className="pixel-input" value={hirelingNameDraft} onChange={(event) => setHirelingNameDraft(event.target.value)} placeholder={activeCharacterName} maxLength={28} /><button className="pixel-button secondary-button" type="submit" disabled={!hirelingNameDraft.trim()}>Rename</button></form>
              <section><label htmlFor="follower-stance">Combat stance</label><select id="follower-stance" value={hud.activeSentient?.stance ?? activeResident?.orders.stance ?? "defensive"} onChange={(event) => hearthroadsApi?.commandActiveFollower?.(`stance:${event.target.value}`)}><option value="passive">Passive · avoid danger</option><option value="defensive">Defensive · protect the group</option><option value="offensive">Offensive · engage threats</option></select><small>Selected: {(hud.activeSentient?.stance ?? activeResident?.orders.stance ?? "defensive").toUpperCase()}</small></section>
              <section><label htmlFor="follower-distance">Follow distance</label><select id="follower-distance" value={String(hud.activeSentient?.followDistance ?? activeResident?.orders.followDistance ?? "dynamic")} onChange={(event) => hearthroadsApi?.commandActiveFollower?.(`distance:${event.target.value}`)}><option value="dynamic">Dynamic · party formation</option><option value="2">Close · 2 blocks</option><option value="4">Near · 4 blocks</option><option value="6">Wide · 6 blocks</option></select><small>Selected: {String(hud.activeSentient?.followDistance ?? activeResident?.orders.followDistance ?? "dynamic").toUpperCase()}</small></section>
              <section><label htmlFor="follower-movement">Movement</label><select id="follower-movement" value={hud.activeSentient?.followCommand ?? (activeResident?.orders.follow ? "follow" : "hold")} onChange={(event) => hearthroadsApi?.commandActiveFollower?.(event.target.value)}><option value="follow">Follow · match your speed</option><option value="hold">Hold · guard this position</option></select><small>Selected: {(hud.activeSentient?.followCommand ?? (activeResident?.orders.follow ? "follow" : "hold")).toUpperCase()}</small></section>
            </div>
          </div>
        </section>
      )}

      {overlay === "bestiary" && (
        <section className="menu-overlay bestiary-overlay" aria-labelledby="bestiary-title">
          <div className="mc-window bestiary-window">
            <header className="mc-window-header">
              <div><span className="panel-eyebrow">FIELD GUIDE · {fieldGuideSection === "creatures" ? `${bestiarySeen}/${MOB_ORDER.length} CREATURES` : `${discoveredPlantCount}/${PLANTS.length} PLANTS`} DISCOVERED</span><h2 id="bestiary-title">{fieldGuideSection === "creatures" ? "Bestiary" : "Plant Compendium"}</h2></div>
              <div className="bestiary-header-progress" aria-label={`${fieldGuideSection === "creatures" ? bestiarySeen : discoveredPlantCount} entries discovered`}>
                <span><i style={{ width: `${(fieldGuideSection === "creatures" ? bestiarySeen / MOB_ORDER.length : discoveredPlantCount / PLANTS.length) * 100}%` }} /></span>
                <strong>{Math.round((fieldGuideSection === "creatures" ? bestiarySeen / MOB_ORDER.length : discoveredPlantCount / PLANTS.length) * 100)}%</strong>
              </div>
              <button type="button" className="panel-close" onClick={resume}>×</button>
            </header>
            <div className="field-guide-sections" role="tablist" aria-label="Field guide sections">
              <button type="button" role="tab" aria-selected={fieldGuideSection === "creatures"} className={fieldGuideSection === "creatures" ? "active" : ""} onClick={() => setFieldGuideSection("creatures")}><span aria-hidden="true">◆</span><strong>Creatures</strong><small>Wildlife, companions & sentient peoples</small></button>
              <button type="button" role="tab" aria-selected={fieldGuideSection === "plants"} className={fieldGuideSection === "plants" ? "active" : ""} onClick={() => setFieldGuideSection("plants")}><span aria-hidden="true">✿</span><strong>Plants</strong><small>Trees, crops, flowers & water flora</small></button>
            </div>
            {fieldGuideSection === "creatures" ? <>
              <div className="bestiary-toolbar bestiary-facet-toolbar">
                <label className="bestiary-search"><span className="sr-only">Search Bestiary</span><span aria-hidden="true">⌕</span><input value={bestiarySearch} onChange={(event) => setBestiarySearch(event.target.value)} placeholder="Search creatures, habitats, types, moves…" /></label>
                <div className="bestiary-quick-filters" role="group" aria-label="Bestiary view">
                  {([['all', 'All'], ['discovered', 'Discovered'], ['captured', 'Captured']] as const).map(([filter, label]) => <button type="button" aria-pressed={bestiaryQuickFilter === filter} className={bestiaryQuickFilter === filter ? "active" : ""} key={filter} onClick={() => setBestiaryQuickFilter(filter)}>{label}</button>)}
                </div>
                <button ref={bestiaryFilterTriggerRef} type="button" className={`bestiary-filter-trigger ${bestiarySelectedFilterCount ? "active" : ""}`} aria-haspopup="dialog" aria-expanded={bestiaryFiltersOpen} aria-controls="bestiary-filter-panel" onClick={() => setBestiaryFiltersOpen((open) => !open)}>Filters{bestiarySelectedFilterCount > 0 && <small aria-label={`${bestiarySelectedFilterCount} selected filters`}>{bestiarySelectedFilterCount}</small>}</button>
                <label className="bestiary-sort"><span>Sort</span><select value={bestiarySort} aria-label="Sort Bestiary" onChange={(event) => setBestiarySort(event.target.value as BestiarySort)}><option value="catalog">Catalog</option><option value="name">Name</option><option value="observed">Recently observed</option><option value="research">Research completion</option><option value="level">Creature level</option><option value="rarity">Rarity</option></select></label>
                <span className="bestiary-index" aria-live="polite">{bestiaryVisibleKinds.length ? `ENTRY ${bestiaryVisibleIndex + 1} / ${bestiaryVisibleKinds.length}` : "NO MATCHES"}</span>
                {bestiaryFiltersOpen && <div className="bestiary-filter-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setBestiaryFiltersOpen(false); }}><section ref={bestiaryFilterPanelRef} id="bestiary-filter-panel" className="bestiary-filter-panel" role="dialog" aria-modal="true" aria-labelledby="bestiary-filter-title" aria-describedby="bestiary-filter-help" onKeyDown={handleBestiaryFacetNavigation}><header><div><small>REFINE CATALOG</small><h3 id="bestiary-filter-title">Creature filters</h3><p id="bestiary-filter-help">Select multiple values. Values within one group are combined; groups narrow each other.</p></div><button type="button" onClick={() => setBestiaryFiltersOpen(false)} aria-label="Close creature filters">×</button></header><div className="bestiary-filter-groups">{BESTIARY_FACET_KEYS.map((facet) => <details open key={facet}><summary><span>{BESTIARY_FACET_LABELS[facet]}</span><small>{bestiaryFacets[facet].length ? `${bestiaryFacets[facet].length} selected` : `${bestiaryFacetOptions[facet].length} options`}</small></summary><fieldset><legend className="sr-only">Select {BESTIARY_FACET_LABELS[facet].toLocaleLowerCase()}</legend><div>{bestiaryFacetOptions[facet].map((value) => { const count = bestiaryFacetCounts[facet][value] ?? 0; const selected = bestiaryFacets[facet].includes(value); const type = facet === "type" ? CREATURE_TYPES[value as keyof typeof CREATURE_TYPES] : null; return <button type="button" data-bestiary-filter-option={`${facet}:${value}`} aria-pressed={selected} aria-label={`${bestiaryFacetValueLabel(facet, value)}, ${count} matching creatures${selected ? ", selected" : ""}`} disabled={count === 0 && !selected} className={selected ? "active" : ""} key={value} onClick={() => setBestiaryFacet(facet, value)}><span><i aria-hidden="true">{type?.glyph ?? (selected ? "✓" : "◇")}</i><span>{bestiaryFacetValueLabel(facet, value)}</span></span><small>{count}</small><b aria-hidden="true">{selected ? "✓" : ""}</b></button>; })}</div></fieldset></details>)}</div><footer><button type="button" onClick={clearBestiaryFacets} disabled={bestiarySelectedFilterCount === 0}>Clear all</button><button type="button" className="primary" onClick={() => setBestiaryFiltersOpen(false)}>Show {bestiaryVisibleKinds.length} {bestiaryVisibleKinds.length === 1 ? "creature" : "creatures"}</button></footer></section></div>}
              </div>
              {bestiarySelectedFilterCount > 0 && <div className="bestiary-selected-facets" aria-label="Selected filters">{visibleBestiaryFacetChips.map((chip) => <button type="button" title={`Remove ${chip.label}`} key={`${chip.facet}:${chip.value}`} onClick={() => setBestiaryFacet(chip.facet, chip.value)}><span>{chip.label}</span><b aria-hidden="true">×</b><span className="sr-only">Remove {chip.label}</span></button>)}{hiddenBestiaryFacetChipCount > 0 && <button type="button" className="bestiary-facet-overflow" onClick={() => setBestiaryFiltersOpen(true)} aria-label={`Show ${hiddenBestiaryFacetChipCount} more selected filters`}>+{hiddenBestiaryFacetChipCount} more</button>}<button type="button" className="bestiary-facet-clear" onClick={clearBestiaryFacets}>Clear</button></div>}
              <div className="bestiary-layout">
                <nav className="bestiary-list" aria-label="Creature list">
                  {!bestiaryVisibleKinds.length && <div className="bestiary-empty"><strong>No matching creatures</strong><span>Clear a filter or try a broader field note.</span><button type="button" onClick={() => { setBestiarySearch(""); setBestiaryQuickFilter("all"); clearBestiaryFacets(); }}>Clear filters</button></div>}
                  {bestiaryVisibleKinds.map((kind) => {
                    const definition = MOB_DEFS[kind];
                    const progress = hud.bestiary[kind];
                    const observation = bestiaryObservation(definition, progress);
                    const completion = bestiaryEntryCompletion(definition, progress);
                    const captured = progress.captures > 0;
                    return <button type="button" key={kind} className={selectedBestiary === kind ? "active" : ""} aria-current={selectedBestiary === kind ? "true" : undefined} onClick={() => setSelectedBestiary(kind)}><span className="bestiary-icon-progress" style={{ "--entry-progress": `${completion}%` } as CSSProperties} title={`${completion}% field notes complete`}><CreaturePortrait kind={kind} seen={progress.seen} mini /><i>{completion}</i>{definition.sentient !== true && <b className={`bestiary-caught-marker ${captured ? "caught" : "uncaught"}`} aria-label={captured ? `${definition.name} has been caught` : `${definition.name} has not been caught`} title={captured ? `Caught · ${progress.captures} recorded` : "Not caught yet"}>{captured ? "✓" : "○"}</b>}</span><span className="bestiary-list-copy"><strong>{progress.seen ? definition.name : "Unknown Creature"}</strong><small>{progress.seen ? `${definition.temperament} · ${observation}` : undiscoveredHabitatHint(definition)}</small></span><i className={`temperament-dot temperament-${definition.temperament.toLowerCase()}`} aria-hidden="true" /></button>;
                  })}
                </nav>
                <article className={`bestiary-detail ${bestiaryProgress.seen ? "seen" : "unknown"}`} data-tab={bestiaryPageTab}>
                  <div className="bestiary-portrait" key={selectedBestiary} style={{ "--mob-color": `#${bestiaryDefinition.colors[0].toString(16).padStart(6, "0")}` } as CSSProperties}>
                    <CreaturePortrait kind={selectedBestiary} seen={bestiaryProgress.seen} />
                    <div className="bestiary-portrait-chrome"><button type="button" onClick={() => stepBestiary(-1)} aria-label="Previous bestiary entry">‹</button><span>{bestiaryProgress.seen ? bestiaryDefinition.habitat.split(",")[0] : "Habitat unknown"}</span><button type="button" onClick={() => stepBestiary(1)} aria-label="Next bestiary entry">›</button></div>
                  </div>
                  {bestiaryProgress.seen ? <>
                    <div className="bestiary-heading"><div><span className={`temperament-label temperament-${bestiaryDefinition.temperament.toLowerCase()}`}>{bestiaryDefinition.temperament.toUpperCase()}</span><h3>{bestiaryDefinition.name}</h3></div><strong>{bestiaryObservation(bestiaryDefinition, bestiaryProgress).toUpperCase()}</strong></div>
                    <nav className="bestiary-page-tabs" aria-label={`${bestiaryDefinition.name} record sections`}>{([['overview', 'Overview'], ['ecology', 'Ecology'], ['combat', 'Combat'], ['care', 'Care'], ['research', 'Research'], ['specimens', 'Specimens'], ['variants', 'Variants']] as const).map(([tab, label]) => <button type="button" key={tab} aria-current={bestiaryPageTab === tab ? "page" : undefined} className={bestiaryPageTab === tab ? "active" : ""} onClick={() => setBestiaryPageTab(tab)}>{label}</button>)}</nav>
                    <p className="bestiary-lore">{bestiaryDefinition.lore}</p>
                    <div className="bestiary-type-strip" aria-label={`Natural types: ${activeCreatureProfile.naturalTypes.map((type) => CREATURE_TYPES[type].name).join(", ")}`}>{activeCreatureProfile.naturalTypes.map((type) => <span key={type} style={{ "--type-color": CREATURE_TYPES[type].color } as CSSProperties}><i aria-hidden="true">{CREATURE_TYPES[type].glyph}</i><strong>{CREATURE_TYPES[type].name}</strong></span>)}</div>
                    <section className="bestiary-ecology-record"><div className="bestiary-record-heading"><small>ECOLOGY</small><strong>{activeCreatureProfile.ecologyRoles.join(" · ")}</strong></div><p>{bestiaryDefinition.behavior}</p><dl><div><dt>Habitat</dt><dd>{bestiaryDefinition.habitat}</dd></div><div><dt>Activity</dt><dd>{bestiaryDefinition.active}</dd></div><div><dt>Movement</dt><dd>{bestiaryDefinition.movement ?? "ground"}</dd></div></dl><ul>{activeCreatureProfile.researchClues.map((clue) => <li key={clue}>{clue}</li>)}</ul></section>
                    <section className="bestiary-combat-record"><div className="bestiary-record-heading"><small>{activeBestiaryLevel ? `LEVEL ${activeBestiaryLevel} SPECIMEN PROFILE` : "BASELINE COMBAT PROFILE"}</small><strong>{activeCreatureProfile.stats.growth} growth · level 1–{activeCreatureProfile.stats.maximumLevel}</strong></div><div className="bestiary-stat-lines">{(Object.entries(activeCreatureStats) as Array<[keyof typeof activeCreatureStats, number]>).map(([stat, value]) => <div key={stat}><span><strong>{stat}</strong><small>{statBand(value)} · {value}</small></span><i><b style={{ width: `${value}%` }} /></i></div>)}</div><div className="bestiary-move-list">{activeCreatureProfile.moves.unlocks.map((unlock) => { const move = CREATURE_MOVES[unlock.moveId]; return move ? <article key={unlock.moveId}><span style={{ "--type-color": CREATURE_TYPES[move.type].color } as CSSProperties}><i aria-hidden="true">{CREATURE_TYPES[move.type].glyph}</i><small>LV {unlock.level}</small></span><div><strong>{move.name}</strong><p>{move.description}</p><small>{move.channel} · {move.shape} · {move.cooldownSeconds.toFixed(1)}s cooldown</small></div></article> : null; })}</div></section>
                    <section className="bestiary-specimen-record">
                      <div className="bestiary-record-heading"><small>SPECIMEN LEDGER</small><strong>{activeBestiarySpecimenIds.length} stable {activeBestiarySpecimenIds.length === 1 ? "ID" : "IDs"} · {bestiaryProgress.captures} captures</strong></div>
                      <dl className="bestiary-history-grid"><div><dt>First observed</dt><dd>{bestiaryRecordTimestamp(bestiaryProgress.firstSeenAt ?? null)}</dd></div><div><dt>Last observed</dt><dd>{bestiaryRecordTimestamp(bestiaryProgress.lastObservedAt ?? null)}</dd></div><div><dt>First captured</dt><dd>{bestiaryRecordTimestamp(bestiaryProgress.firstCapturedAt ?? null)}</dd></div></dl>
                      <div className="bestiary-specimen-list">{activeBestiarySpecimenIds.length ? activeBestiarySpecimenIds.map((specimenId) => { const specimen = activeBestiaryInventorySpecimens.find((candidate) => candidate.entityId === specimenId); const progression = specimen?.progression; return <article key={specimenId}><header><div><small>SPECIMEN ID</small><strong>{specimenId}</strong></div>{progression && <b>LV {progression.level}</b>}</header><p>{specimen?.name?.trim() || bestiaryDefinition.name}</p><dl><div><dt>Captured</dt><dd>{bestiaryRecordTimestamp(specimen?.capturedAt ? specimen.capturedAt : null)}</dd></div><div><dt>Bond</dt><dd>{progression?.bondTier ?? "Not in current inventory"}</dd></div><div><dt>Form</dt><dd>{progression ? `${progression.shiny ? "shiny " : ""}${progression.rarityForm}` : "Record retained"}</dd></div><div><dt>Method</dt><dd>{progression?.captureHistory.lastMethodId ?? "Not recorded"}</dd></div></dl></article>; }) : <p className="bestiary-record-empty">No stable specimen IDs have been recorded for this species.</p>}</div>
                    </section>
                    <section className="bestiary-variants-record">
                      <div className="bestiary-record-heading"><small>VARIANTS & PROVENANCE</small><strong>{Object.keys(bestiaryProgress.forms ?? {}).length} forms · {(bestiaryProgress.summonOrigins ?? []).length} summon origins</strong></div>
                      <div className="bestiary-variant-groups">
                        <section><h4>Recorded forms</h4>{Object.values(bestiaryProgress.forms ?? {}).length ? <div className="bestiary-form-list">{Object.values(bestiaryProgress.forms ?? {}).sort((left, right) => left.firstRecordedAt - right.firstRecordedAt).map((form) => <article key={form.id}><span aria-hidden="true">{form.category === "shiny" ? "✦" : form.category === "prime" ? "◆" : "◇"}</span><div><strong>{form.category}</strong><code>{form.id}</code><small>{form.sightings} {form.sightings === 1 ? "sighting" : "sightings"} · {bestiaryRecordTimestamp(form.firstRecordedAt)}</small></div></article>)}</div> : <p className="bestiary-record-empty">No regional, seasonal, Prime, legendary, summoned, or shiny form is recorded yet.</p>}</section>
                        <section className="bestiary-prime-route"><h4>Prime field route</h4>{activePrimeProfile && activePrimeRoute ? <><header><div><strong>{activePrimeProfile.name}</strong><p>{activePrimeProfile.clue}</p></div><small>{activePrimeEncounter ? `${activePrimeCompletedRouteVerbs.size}/${activePrimeRoute.length} · ${activePrimeEncounter.status}` : "ROUTE NOT ACTIVATED"}</small></header><ol>{activePrimeRoute.map((step) => { const completed = activePrimeCompletedRouteVerbs.has(step.id); return <li key={step.id} className={completed ? "complete" : undefined}><span aria-hidden="true">{completed ? "✓" : "◇"}</span><div><small>{completed ? "COMPLETED" : step.ecologicalVerb.toLocaleUpperCase()}</small><strong>{step.label}</strong><p>{step.clue}</p></div></li>; })}</ol></> : <p className="bestiary-record-empty">This species has no authored Prime route.</p>}</section>
                        <section><h4>Summon origins</h4>{(bestiaryProgress.summonOrigins ?? []).length ? <ul>{bestiaryProgress.summonOrigins.map((origin) => <li key={origin}><code>{origin}</code></li>)}</ul> : <p className="bestiary-record-empty">No summon lineage has been recorded.</p>}</section>
                        <section><h4>Guild links</h4>{(bestiaryProgress.guildLinks ?? []).length ? <ul>{bestiaryProgress.guildLinks.map((link) => { const guildId = Object.keys(GUILDS).find((candidate) => bestiarySlug(link).includes(candidate)); return <li key={link}><strong>{guildId ? BESTIARY_GUILD_LABELS[guildId] : "Field record"}</strong><code>{link}</code></li>; })}</ul> : <p className="bestiary-record-empty">No guild field record is linked.</p>}</section>
                        <section className="bestiary-append-sections"><h4>Append-only field sections</h4>{Object.keys(bestiaryProgress.sections ?? {}).length ? Object.entries(bestiaryProgress.sections ?? {}).map(([section, records]) => <article key={section}><header><strong>{bestiaryFacetValueLabel("utility", section)}</strong><small>{records.length} {records.length === 1 ? "entry" : "entries"}</small></header>{records.map((record) => <div key={record.id}><strong>{record.title}</strong><p>{record.text}</p><small>{bestiaryRecordTimestamp(record.recordedAt)}{record.sourceId ? ` · source ${record.sourceId}` : ""}</small></div>)}</article>) : <p className="bestiary-record-empty">No extended chapter has been appended to this creature yet.</p>}</section>
                      </div>
                    </section>
                    <div className="bestiary-facts"><div><small>HABITAT</small><strong>{bestiaryDefinition.habitat}</strong></div><div><small>ACTIVE</small><strong>{bestiaryDefinition.active}</strong></div><div><small>FAMILY</small><strong>{bestiaryDefinition.family ?? "surface"}</strong></div><div><small>MOVEMENT</small><strong>{bestiaryDefinition.movement ?? "ground"}</strong></div><div><small>HEALTH</small><strong>{formatHudHealth(bestiaryDefinition.health)} hearts</strong></div><div><small>DANGER</small><strong>{bestiaryDefinition.damage ? `${bestiaryDefinition.damage} damage` : "Harmless"}</strong></div>{bestiaryDefinition.sentient !== true && <div className={bestiaryProgress.captures > 0 ? "capture-record caught" : "capture-record"}><small>CAUGHT</small><strong>{bestiaryProgress.captures > 0 ? `Yes · ${bestiaryProgress.captures} recorded` : "Not yet"}</strong></div>}</div>
                    <section className="behavior-note"><small>BEHAVIOR</small><p>{bestiaryDefinition.behavior}</p></section>
                    <section className="bestiary-care" aria-label={`${bestiaryDefinition.name} care information`}>
                      <div className="bestiary-care-heading"><small>CREATURE CARE</small><span>Recorded dynamically from known interactions</span></div>
                      <div className="bestiary-care-grid"><div><small>CAPTURE</small><strong>{activeRelationshipPolicy.orbEligible ? "Normal Capture Orb" : activeRelationshipPolicy.title}</strong><span>{activeRelationshipPolicy.orbEligible ? "Capture grants custody only." : activeRelationshipPolicy.explanation}</span></div><div><small>COMPANION OUTCOME</small><strong>{activeRelationshipPolicy.companionEligible ? activeRelationshipPolicy.title : "Relocation only"}</strong><span>{activeRelationshipPolicy.companionEligible ? activeRelationshipPolicy.explanation : "This species can be safely relocated but not field-deployed as a companion."}</span></div><div><small>BREEDABLE</small><strong>{bestiaryDefinition.breedable ? "Yes" : "No"}</strong>{bestiaryDefinition.breedable && <span>{bestiaryDefinition.breedingFoods?.length ? bestiaryDefinition.breedingFoods.map((item) => ITEMS[item]?.name).filter(Boolean).join(", ") : "Breeding food unknown"}</span>}</div><div><small>EATS</small><strong>{bestiaryDefinition.diet?.length ? bestiaryDefinition.diet.map((item) => ITEMS[item]?.name).filter(Boolean).join(", ") : "No feeding response recorded"}</strong></div></div>
                      {activeCaptureKnowledge.careClues.length > 0 && <div className="bestiary-authored-care"><small>FIELD-VERIFIED CARE CLUES</small><ul>{activeCaptureKnowledge.careClues.map((clue) => <li key={clue}>{clue}</li>)}</ul></div>}
                    </section>
                    {activeCaptureKnowledge.microHook && <section className="bestiary-authored-research"><div className="bestiary-care-heading"><small>CAPTURE RESEARCH · {activeBestiaryResearchStage.toLocaleUpperCase()}</small><span>Capture eligibility and its broad rule are always public</span></div><p>{activeCaptureKnowledge.microHook}</p><small>{activeCaptureKnowledge.mastered ? "MASTERED · FULL ECOLOGY AND CARE NOTES" : activeBestiaryResearchStage === "Studied" ? "STUDIED · PREFERRED CARE REVEALED" : "OBSERVED · CORE CAPTURE RULE REVEALED"}</small></section>}
                    {bestiaryDefinition.fieldNotes?.length ? <section className="bestiary-field-notes"><div className="bestiary-care-heading"><small>EXTENDED FIELD NOTES</small><span>{bestiaryDefinition.fieldNotes.filter((note) => bestiaryFieldNoteUnlocked(note, bestiaryProgress)).length}/{bestiaryDefinition.fieldNotes.length} unlocked</span></div>{bestiaryDefinition.fieldNotes.map((note) => { const unlocked = bestiaryFieldNoteUnlocked(note, bestiaryProgress); return <article key={note.id} className={unlocked ? "unlocked" : "locked"}><small>{unlocked ? "RECORDED" : "LOCKED"}</small><strong>{note.title}</strong><p>{unlocked ? note.text : note.hint}</p></article>; })}</section> : bestiaryDefinition.postTameNotes && <section className={`bestiary-secret ${bestiaryProgress.secretUnlocked || (bestiaryProgress.tames ?? 0) > 0 ? "unlocked" : "locked"}`}><small>COMPANION FIELD NOTES</small>{bestiaryProgress.secretUnlocked || (bestiaryProgress.tames ?? 0) > 0 ? <p>{bestiaryDefinition.postTameNotes}</p> : <p>Locked · {bestiaryDefinition.secretHint ?? `Tame a ${bestiaryDefinition.name} to reveal its deeper care and riding notes.`}</p>}</section>}
                    {bestiaryDefinition.family === "butterfly" ? <section className="bestiary-loot butterfly-capture-record"><small>CAPTURE RECORD</small>{bestiaryDefinition.captureItem !== undefined && <div><ItemIcon item={Item.CaptureOrb} small /><span><strong>{bestiaryProgress.captures ? `${bestiaryProgress.captures} ${bestiaryProgress.captures === 1 ? "specimen" : "specimens"} cataloged` : "No specimen captured yet"}</strong><small>Use the same normal Capture Orb as every other creature. The Butterfly Net is an optional survey tool only.</small></span></div>}</section> : <section className="bestiary-loot"><small>OBSERVED DROPS</small>{bestiaryDefinition.drops.map((drop) => <div key={drop.item}><ItemIcon item={drop.item} small /><span><strong>{bestiaryProgress.kills ? ITEMS[drop.item]?.name : "Unknown drop"}</strong><small>{bestiaryProgress.kills ? `${drop.min}${drop.max !== drop.min ? `–${drop.max}` : ""} · ${Math.round(drop.chance * 100)}% chance` : "Defeat one to record it"}</small></span></div>)}</section>}
                  </> : <div className="unknown-entry"><span className="panel-eyebrow">NO RELIABLE OBSERVATION</span><h3>Unknown Creature</h3><p>{undiscoveredHabitatHint(bestiaryDefinition)} Bring it within view to reveal its field notes.</p></div>}
                </article>
              </div>
            </> : <>
              <div className="bestiary-toolbar plant-toolbar">
                <div className="bestiary-filters" role="tablist" aria-label="Plant categories">{PLANT_FILTERS.map(([filter, label]) => <button type="button" role="tab" aria-selected={plantFilter === filter} className={plantFilter === filter ? "active" : ""} key={filter} onClick={() => { setPlantFilter(filter); const next = PLANTS.find((plant) => filter === "all" || plant.category === filter); if (next) setSelectedPlantId(next.id); }}>{label}<small>{PLANTS.filter((plant) => filter === "all" || plant.category === filter).length}</small></button>)}</div>
                <span className="bestiary-index">{plantVisible.length} ENTRIES</span>
              </div>
              <div className="bestiary-layout plant-bestiary-layout">
                <nav className="bestiary-list plant-bestiary-list" aria-label="Plant list">{plantVisible.map((plant) => { const known = discoveredPlants.has(plant.id); return <button type="button" key={plant.id} className={selectedPlant?.id === plant.id ? "active" : ""} onClick={() => setSelectedPlantId(plant.id)}><PlantPortrait plant={plant} seen={known} mini /><span className="bestiary-list-copy"><strong>{known ? plant.name : "Unknown Plant"}</strong><small>{known ? `${plant.category} · ${plant.utility}` : `Look around ${plant.habitat.toLowerCase()}.`}</small></span></button>; })}</nav>
                {selectedPlant ? <article className={`bestiary-detail plant-detail ${selectedPlantDiscovered ? "seen" : "unknown"}`}>
                  <div className={`plant-portrait plant-${selectedPlant.category}`} key={selectedPlant.id}>
                    <PlantPortrait plant={selectedPlant} seen={selectedPlantDiscovered} />
                    <div className="plant-portrait-chrome"><span>{selectedPlant.category === "tree" ? "FULL TREE EXAMPLE" : "FIELD SPECIMEN"}</span><strong>{selectedPlantDiscovered ? selectedPlant.name : "Unknown Plant"}</strong></div>
                  </div>
                  {selectedPlantDiscovered ? <><div className="bestiary-heading"><div><span className="temperament-label temperament-neutral">FLORA</span><h3>{selectedPlant.name}</h3></div><strong>{selectedPlant.category.toUpperCase()}</strong></div><div className="plant-facts"><section><small>HABITAT</small><p>{selectedPlant.habitat}</p></section><section><small>NATIVE BIOMES</small><p>{selectedPlantNativeBiomes || "Cultivated, broad-ranging, or not yet assigned"}</p></section><section><small>GROWTH</small><p>{selectedPlant.growth}</p></section><section><small>UTILITY</small><p>{selectedPlant.utility}</p></section></div><section className="bestiary-loot plant-drops"><small>HARVEST & DROPS</small>{selectedPlant.drops.map((drop) => <div key={`${selectedPlant.id}-${drop.item}`}><ItemIcon item={drop.item} small /><span><strong>{drop.label}</strong><small>Recorded from this plant family</small></span></div>)}</section></> : <div className="unknown-entry"><span className="panel-eyebrow">UNRECORDED FLORA</span><h3>Where to look</h3><p>Search around {selectedPlant.habitat.toLowerCase()}. Bring it within view to record growth, drops, and practical uses.</p></div>}
                </article> : null}
              </div>
            </>}
          </div>
        </section>
      )}

      {overlay === "multiplayer" && (
        <section className="menu-overlay" aria-labelledby="multiplayer-title">
          <div className="pixel-panel multiplayer-panel">
            <span className="panel-eyebrow">{multiplayerReturn === "title" ? "JOIN A HOST WORLD · NO LOCAL SAVE REQUIRED" : "HOST-AUTHORITATIVE · ONE INVITE CODE"}</span>
            <h2 id="multiplayer-title">{multiplayerReturn === "title" ? "Join Multiplayer" : "Multiplayer Session"}</h2>
            <div className="multiplayer-status-row">
              <span className={`multiplayer-status-light status-${multiplayerState.status}`} aria-hidden="true" />
              <div><strong>{multiplayerState.status.toUpperCase()}</strong><small>{multiplayerState.role ? `${multiplayerState.role.toUpperCase()} · ` : ""}{multiplayerState.peers.length} {multiplayerState.peers.length === 1 ? "peer" : "peers"}</small></div>
            </div>

            {!multiplayerState.supported && (
              <div className="multiplayer-warning" role="status"><strong>Multiplayer unavailable</strong>{multiplayerState.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>
            )}
            {multiplayerState.error && <p className="multiplayer-error" role="alert">{multiplayerState.error}</p>}

            <label className="multiplayer-name-field"><span>Your player name</span><input className="pixel-input world-name-input" maxLength={32} value={multiplayerName} onChange={(event) => setMultiplayerName(event.target.value)} /></label>

            <section className="multiplayer-room-flow">
              <div className="multiplayer-room-copy"><span className="panel-eyebrow">INVITE CODE</span><h3>{multiplayerReturn === "title" ? "Enter the host's code" : "Share one short code"}</h3><p>{multiplayerReturn === "title" ? "You will enter the host's live world directly. No local world is created or overwritten on this browser." : "The host starts the room, then every guest enters the same code. Blockwild handles the connection exchange in the background."}</p></div>
              <label className="multiplayer-room-code" htmlFor="multiplayer-room-code"><span>Room code</span><div><input id="multiplayer-room-code" className="pixel-input" autoComplete="off" spellCheck={false} maxLength={24} value={multiplayerRoomCode} onChange={(event) => setMultiplayerRoomCode(normalizeMultiplayerRoomCode(event.target.value))} placeholder="WILD-TRAIL" /><button type="button" onClick={suggestMultiplayerCode}>GENERATE</button></div></label>
              <div className="multiplayer-room-actions">
                {multiplayerReturn === "pause" && <PixelButton className="gold-button" disabled={multiplayerBusy || !multiplayerState.supported || multiplayerState.role === "guest"} onClick={() => void createMultiplayerRoom()}>Host with this code</PixelButton>}
                <PixelButton className={multiplayerReturn === "title" ? "gold-button" : ""} disabled={multiplayerBusy || !multiplayerState.supported || !multiplayerRoomCode || multiplayerState.role === "host"} onClick={() => void joinMultiplayerRoom()}>{multiplayerBusy && multiplayerReturn === "title" ? "Joining host world…" : "Join with code"}</PixelButton>
                {(multiplayerState.roomCode || multiplayerRoomCode) && <button type="button" className="multiplayer-copy-room" onClick={() => void copyMultiplayerCode(multiplayerState.roomCode || multiplayerRoomCode)}>COPY CODE</button>}
              </div>
              <p className={`multiplayer-rendezvous status-${multiplayerState.rendezvousStatus}`} role="status"><b>{multiplayerState.rendezvousStatus.toUpperCase()}</b><span>{multiplayerState.rendezvousStatus === "waiting" ? (multiplayerState.role === "host" ? "Room open · waiting for a guest" : "Waiting for the host room to finish opening") : multiplayerState.rendezvousStatus === "retrying" ? "Host found · retrying the secure exchange" : multiplayerState.rendezvousStatus === "exchanging" ? "Guest found · securing the direct connection" : multiplayerState.rendezvousStatus === "connected" ? "Connected · the host world is live" : multiplayerReturn === "title" ? "Enter the host code, then Join" : "Choose Host or Join to begin"}</span></p>
            </section>

            <details className="multiplayer-advanced">
              <summary>Advanced direct connection fallback</summary>
              <p>Use this only if the one-code rendezvous service cannot be reached. It requires one offer and one return answer.</p>
              <div className="multiplayer-connection-grid">
                {multiplayerReturn === "pause" && <section>
                  <span className="panel-eyebrow">HOST OFFER</span>
                  <PixelButton disabled={multiplayerBusy || !multiplayerState.supported || multiplayerState.role === "guest"} onClick={() => void hostMultiplayer()}>Create direct offer</PixelButton>
                  {multiplayerState.inviteCode && <div className="connection-code"><label>Host offer</label><textarea readOnly value={multiplayerState.inviteCode} aria-label="Host offer code" /><button type="button" onClick={() => void copyMultiplayerCode(multiplayerState.inviteCode)}>COPY OFFER</button></div>}
                  {(multiplayerState.role === "host" || multiplayerState.inviteCode) && <div className="connection-code"><label htmlFor="guest-answer-code">Guest answer</label><textarea id="guest-answer-code" value={multiplayerAnswer} onChange={(event) => setMultiplayerAnswer(event.target.value)} placeholder="Paste the guest answer" /><button type="button" disabled={multiplayerBusy || !multiplayerAnswer.trim()} onClick={() => void acceptMultiplayerAnswer()}>ACCEPT ANSWER</button></div>}
                </section>}
                <section>
                  <span className="panel-eyebrow">JOIN OFFER</span>
                  <div className="connection-code"><label htmlFor="host-invite-code">Host offer</label><textarea id="host-invite-code" value={multiplayerInvite} onChange={(event) => setMultiplayerInvite(event.target.value)} placeholder="Paste the host offer" /></div>
                  <PixelButton disabled={multiplayerBusy || !multiplayerState.supported || !multiplayerInvite.trim() || multiplayerState.role === "host"} onClick={() => void joinMultiplayer()}>Create return answer</PixelButton>
                  {multiplayerState.answerCode && <div className="connection-code guest-answer-output"><label>Answer for the host</label><textarea readOnly value={multiplayerState.answerCode} aria-label="Guest answer code" /><button type="button" onClick={() => void copyMultiplayerCode(multiplayerState.answerCode)}>COPY ANSWER</button></div>}
                </section>
              </div>
            </details>

            {multiplayerState.peers.length > 0 && <section className="multiplayer-peer-list"><span className="panel-eyebrow">SESSION PLAYERS</span>{multiplayerState.peers.map((peer, index) => <div key={peer.id ?? peer.token ?? index}><span className="peer-cube" aria-hidden="true" /><strong>{peer.identity?.name ?? peer.name ?? peer.id ?? `Player ${index + 1}`}</strong><small>{(peer.state ?? "connected").toUpperCase()}{typeof peer.latencyMs === "number" ? ` · ${Math.round(peer.latencyMs)}ms` : ""}</small>{peer.identity?.peerKind === "agent" && <button type="button" onClick={() => {
              const agentId = peer.identity!.id ?? peer.id ?? peer.token;
              if (!agentId) return;
              toggleMutedDroneVoice(agentId);
            }}>{mutedDroneVoices.has(peer.identity.id ?? peer.id ?? peer.token ?? "") ? "VOICE ON" : "VOICE OFF"}</button>}</div>)}</section>}

            {multiplayerState.role === "host" && multiplayerState.agents.length > 0 && <section className="agent-session-roster" aria-labelledby="agent-session-heading">
              <header><div><span className="panel-eyebrow">CONNECTION-BOUND AUTHORITY</span><h3 id="agent-session-heading">Companion drones</h3></div><small>{multiplayerState.agents.filter((agent) => agent.status === "approved" || agent.status === "paused").length}/4 admitted</small></header>
              {multiplayerState.agents.map((agent) => <article key={agent.agentId} className={`status-${agent.status}`}>
                <div className="agent-session-heading"><span className="agent-drone-glyph" aria-hidden="true">◆</span><div><strong>{agent.name}</strong><small>{agent.runnerVersion} · {agent.status.toUpperCase()}</small></div></div>
                <div className="agent-runtime-summary"><small>PACK {(engineRef.current as unknown as MultiplayerEngineApi | null)?.getAgentInventory?.(agent.agentId).filter(Boolean).length ?? 0}/36</small><span>{agent.currentCommand ? `${agent.currentCommand.kind} · ${agent.currentCommand.status}${agent.currentCommand.progress ? ` · ${agent.currentCommand.progress.completed}/${agent.currentCommand.progress.total}` : ""}` : "No active command"}</span></div>
                <details className="agent-pack-inspector"><summary>OPEN DRONE PACK</summary><div>{((engineRef.current as unknown as MultiplayerEngineApi | null)?.getAgentInventory?.(agent.agentId) ?? []).map((slot, index) => <span key={`${agent.agentId}-pack-${index}`} className={slot ? "occupied" : "empty"}><small>{index + 1}</small>{slot ? <><b>{ITEMS[slot.item]?.name ?? `Item ${slot.item}`}</b><em>×{slot.count}</em></> : <i>empty</i>}</span>)}</div></details>
                <div className="agent-capability-list" aria-label={`${agent.name} requested capabilities`}>{agent.requested.map((capability) => <label key={capability}><input type="checkbox" checked={agent.granted.includes(capability)} disabled={agent.status === "pending" || agent.status === "revoked" || agent.status === "disconnected"} onChange={(event) => updateAgent((api) => api.setAgentCapability?.(agent.agentId, capability, event.target.checked) ?? false)} /><span>{capability}</span></label>)}</div>
                <div className="agent-session-actions">
                  {agent.status === "pending" && <button type="button" className="approve" onClick={() => updateAgent((api) => api.approveAgent?.(agent.agentId, agent.requested.filter((capability) => capability !== "player.inventory.read" && capability !== "diagnostics")) ?? false)}>APPROVE SAFE REQUESTS</button>}
                  {agent.status === "approved" && <button type="button" onClick={() => updateAgent((api) => api.pauseAgent?.(agent.agentId) ?? false)}>PAUSE</button>}
                  {agent.status === "paused" && <button type="button" className="approve" onClick={() => updateAgent((api) => api.resumeAgent?.(agent.agentId) ?? false)}>RESUME</button>}
                  <button type="button" onClick={() => updateAgent((api) => api.muteAgent?.(agent.agentId, !agent.muted) ?? false)}>{agent.muted ? "UNMUTE" : "MUTE"}</button>
                  {agent.status !== "revoked" && agent.status !== "disconnected" && <button type="button" className="danger" onClick={() => updateAgent((api) => api.revokeAgent?.(agent.agentId) ?? false)}>REVOKE</button>}
                  <button type="button" className="danger" onClick={() => updateAgent((api) => api.stopAgent?.(agent.agentId) ?? false)}>STOP</button>
                </div>
              </article>)}
            </section>}

            {multiplayerState.role === "host" && (multiplayerState.agentTasks.length > 0 || multiplayerState.agentWaypoints.length > 0) && <section className="agent-task-board" aria-labelledby="agent-task-board-heading">
              <header><div><span className="panel-eyebrow">WORLD-SAVED PUBLIC LEDGER</span><h3 id="agent-task-board-heading">Drone task board</h3></div><small>{multiplayerState.agentTasks.length} tasks · {multiplayerState.agentWaypoints.length} pins</small></header>
              <div className="agent-task-list">{multiplayerState.agentTasks.map((task) => <article key={task.id}>
                <div><strong>{task.title}</strong><small>{task.owner} · {task.agentId}</small><p>{task.note || "No public checkpoint note."}</p></div>
                <select aria-label={`Status for ${task.title}`} value={task.status} onChange={(event) => updateAgent((api) => api.updateAgentTaskFromHost?.(task.id, { status: event.target.value as AgentTaskRecord["status"] }) ?? false)}>{["queued", "active", "paused", "blocked", "completed", "cancelled"].map((status) => <option key={status} value={status}>{status}</option>)}</select>
                <button type="button" onClick={() => { const note = window.prompt("Public task note", task.note); if (note !== null) updateAgent((api) => api.updateAgentTaskFromHost?.(task.id, { note }) ?? false); }}>EDIT NOTE</button>
                <button type="button" className="danger" onClick={() => updateAgent((api) => api.removeAgentTaskFromHost?.(task.id) ?? false)}>REMOVE</button>
              </article>)}</div>
              {multiplayerState.agentWaypoints.length > 0 && <div className="agent-waypoint-list">{multiplayerState.agentWaypoints.map((waypoint) => <span key={waypoint.id}><b>{waypoint.name}</b><small>{Math.round(waypoint.position.x)}, {Math.round(waypoint.position.y)}, {Math.round(waypoint.position.z)}</small><button type="button" aria-label={`Remove ${waypoint.name}`} onClick={() => updateAgent((api) => api.removeAgentWaypointFromHost?.(waypoint.id) ?? false)}>×</button></span>)}</div>}
            </section>}

            {multiplayerState.role && <section className="multiplayer-chat-panel" aria-labelledby="multiplayer-chat-heading">
              <header><div><span className="panel-eyebrow">UNTRUSTED IN-WORLD DIALOGUE</span><h3 id="multiplayer-chat-heading">Expedition chat</h3></div><small>{multiplayerState.chat.length} retained</small></header>
              <div className="multiplayer-chat-log" aria-live="polite">{multiplayerState.chat.length ? multiplayerState.chat.slice(-12).map((message) => <p key={message.id} className={`peer-${message.peerKind}`}><b>{message.authorName}</b><span>{message.text}</span><small>{message.channel.toUpperCase()}</small></p>) : <p className="empty">No messages yet. Chat never grants commands or capabilities.</p>}</div>
              {droneVoiceSpeakers.length > 0 && <div className="drone-voice-mixer" aria-label="Individual drone voice levels">{droneVoiceSpeakers.map((speaker) => <label key={speaker.agentId}><span>{speaker.name}</span><input type="range" min="0" max="1.5" step="0.1" value={droneVoiceVolumes[speaker.agentId] ?? 1} onChange={(event) => setDroneVoiceVolume(speaker.agentId, Number(event.target.value))} aria-label={`${speaker.name} voice volume`} /><small>{Math.round((droneVoiceVolumes[speaker.agentId] ?? 1) * 100)}%</small><button type="button" onClick={() => toggleMutedDroneVoice(speaker.agentId)}>{mutedDroneVoices.has(speaker.agentId) ? "UNMUTE" : "MUTE"}</button></label>)}</div>}
              <form onSubmit={(event) => { event.preventDefault(); submitChat(); }}><select aria-label="Chat channel" value={chatChannel} onChange={(event) => setChatChannel(event.target.value as typeof chatChannel)}><option value="local">Local</option><option value="party">Party</option><option value="global">Global</option></select><input value={chatInput} maxLength={480} onChange={(event) => setChatInput(event.target.value)} placeholder="Message players and drones" aria-label="Chat message" /><button type="submit" disabled={!chatInput.trim()}>SEND</button></form>
            </section>}

            <p className="multiplayer-ownership-note">{multiplayerReturn === "title" ? "The host browser owns this world save. Joining creates no local world and never changes your existing catalog." : "Your world save stays owned by this browser on the host device. Guests receive session state; they do not become owners of the host's local catalog entry."} Share connection codes only with people you trust.</p>
            <div className="panel-actions multiplayer-actions">
              <PixelButton className="secondary-button" disabled={multiplayerBusy} onClick={() => setOverlay(multiplayerReturn)}>Back</PixelButton>
              <PixelButton className="secondary-button" onClick={() => (engineRef.current as unknown as MultiplayerEngineApi | null)?.downloadMultiplayerDiagnostics?.()}>Download diagnostics</PixelButton>
              {multiplayerReturn === "pause" && <PixelButton className="danger-button" disabled={multiplayerBusy || ["idle", "disconnected", "closed"].includes(multiplayerState.status)} onClick={() => void disconnectMultiplayer()}>Disconnect Session</PixelButton>}
            </div>
          </div>
        </section>
      )}

      {overlay === "help" && (
        <section className="menu-overlay" aria-labelledby="help-title">
          <div className="pixel-panel help-panel mega-help-panel">
            <span className="panel-eyebrow">FIELD MANUAL · REVISED AFTER SEVERAL INCIDENTS</span>
            <h2 id="help-title">How to Survive the Wild</h2>
            <div className="control-grid">
              <div><kbd>W A S D</kbd><span><strong>Move</strong>Walk relative to your view.</span></div>
              <div><kbd>MOUSE</kbd><span><strong>Look</strong>Click the world to capture the cursor.</span></div>
              <div><kbd>SPACE</kbd><span><strong>Jump / swim</strong>Hold it underwater to rise. In Creative, double-tap to toggle flight.</span></div>
              <div><kbd>SHIFT</kbd><span><strong>Crouch</strong>Lower your profile, move quietly, and stop at ledges.</span></div>
              <div><kbd>CTRL</kbd><span><strong>Sprint</strong>Faster, louder, hungrier.</span></div>
              <div><kbd>V</kbd><span><strong>Cycle camera</strong>First person, rear third person, then front view.</span></div>
              <div><kbd>HOLD LMB</kbd><span><strong>Harvest / attack</strong>The crosshair decides which.</span></div>
              <div><kbd>RMB</kbd><span><strong>Use / build / eat</strong>Tables, furnaces, chests, food, and blocks.</span></div>
              <div><kbd>1–9 / WHEEL</kbd><span><strong>Select</strong>Choose a hotbar stack.</span></div>
              <div><kbd>E</kbd><span><strong>Inventory</strong>2×2 hand crafting and the full stack inventory.</span></div>
              <div><kbd>M</kbd><span><strong>Map</strong>Review explored chunks, known places, wayshrines, and banked journeys.</span></div>
              <div><kbd>J</kbd><span><strong>Quest journal</strong>Follow branching story roads, side work, and pinned objectives.</span></div>
              <div><kbd>R</kbd><span><strong>Reload</strong>Load the selected crossbow from bolts in your pack.</span></div>
              <div><kbd>Q</kbd><span><strong>Cast / spell wheel</strong>Tap to cast the selected spell; hold for up to ten favorites.</span></div>
              <div><kbd>K / L</kbd><span><strong>Arcane journals</strong>Open spells or the character skills and perks tree.</span></div>
              <div><kbd>?</kbd><span><strong>Item Wiki</strong>Hover an item in any inventory or workstation, then press the key to open its reference page.</span></div>
              <div><kbd>B</kbd><span><strong>Bestiary / plants</strong>Inspect the creature or plant under your crosshair, or the specimen represented by a hovered item.</span></div>
              <div><kbd>G</kbd><span><strong>Drop item</strong>Toss one from the selected stack.</span></div>
              <div><kbd>Z / X / C</kbd><span><strong>Dragon attacks</strong>Melee, breath, and ranged attacks while riding.</span></div>
              <div><kbd>ESC</kbd><span><strong>Menu</strong>Open or close the current menu. Fullscreen remains a menu button.</span></div>
              <div><kbd>MIDDLE</kbd><span><strong>Pick block</strong>Match the targeted block in Creative mode.</span></div>
              <div><kbd>F3</kbd><span><strong>Debug</strong>Coordinates, depth, chunks, seed, and weather.</span></div>
              <div><kbd>ORB + RMB</kbd><span><strong>Capture creature</strong>Aim one normal Capture Orb at any ready creature, including butterflies. The Butterfly Net surveys pollinators without taking custody.</span></div>
            </div>
            <div className="progression-guide">
              <div><b>1</b><strong>Punch a tree</strong><span>Turn one log into four planks in your 2×2 grid.</span></div>
              <div><b>2</b><strong>Craft a table</strong><span>Four planks unlock the 3×3 recipes.</span></div>
              <div><b>3</b><strong>Make tools</strong><span>Wood → cobble → iron → star crystal.</span></div>
              <div><b>4</b><strong>Build a furnace</strong><span>Eight cobble. Smelt ore, glass, meat, and charcoal.</span></div>
              <div><b>5</b><strong>Own the night</strong><span>Hostiles drop shards, gel, bone, coal, and XP.</span></div>
              <div><b>6</b><strong>Go below zero</strong><span>Crystal deeps, lava, aquifers, and the worldheart await.</span></div>
            </div>
            <div className="panel-actions"><PixelButton onClick={() => openItemGuide()}>Open Blockwild Wiki <kbd>?</kbd></PixelButton><PixelButton className="gold-button" onClick={() => setOverlay(started ? "pause" : "title")}>{started ? "Back to Menu" : "Back"}</PixelButton></div>
          </div>
        </section>
      )}

      {overlay === "settings" && (
        <section className="menu-overlay" aria-labelledby="settings-title">
          <div className="pixel-panel settings-panel">
            <span className="panel-eyebrow">OPTIONS</span>
            <h2 id="settings-title">Settings</h2>
            <label className="setting-row"><span><strong>Master volume</strong><small>{settings.muted ? "Muted" : `${Math.round(settings.volume * 100)}%`}</small></span><input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(event) => updateSettings({ volume: Number(event.target.value), muted: false })} /></label>
            <label className="setting-row"><span><strong>Music volume</strong><small>{settings.muted ? "Muted" : `${Math.round(settings.musicVolume * 100)}%`}</small></span><input type="range" min="0" max="1" step="0.05" value={settings.musicVolume} onChange={(event) => updateSettings({ musicVolume: Number(event.target.value), muted: false })} /></label>
            <label className="setting-row"><span><strong>Look sensitivity</strong><small>{Math.round((settings.sensitivity / 0.005) * 100)}%</small></span><input type="range" min="0.0008" max="0.005" step="0.0001" value={settings.sensitivity} onChange={(event) => updateSettings({ sensitivity: Number(event.target.value) })} /></label>
            <label className="setting-row"><span><strong>Field of view</strong><small>{Math.round(settings.fov)}°</small></span><input type="range" min="55" max="100" step="1" value={settings.fov} onChange={(event) => updateSettings({ fov: Number(event.target.value) })} /></label>
            <label className="setting-row"><span><strong>Render distance</strong><small>{settings.renderDistance} chunks · about {settings.renderDistance * 16} blocks · default 10, maximum 16</small></span><input type="range" min="2" max="16" step="1" value={settings.renderDistance} onChange={(event) => { const distance = Number(event.target.value); updateSettings({ renderDistance: distance, simulationDistance: Math.min(settings.simulationDistance, distance), basicRenderDistance: Math.max(settings.basicRenderDistance, distance) }); }} /></label>
            <label className="setting-row"><span><strong>Basic render distance</strong><small>{settings.basicRenderDistance} chunks · about {settings.basicRenderDistance * 16} blocks · {settings.basicRenderDistance === settings.renderDistance ? "disabled" : settings.basicRenderDistance - settings.renderDistance <= 6 ? "low cost" : settings.basicRenderDistance - settings.renderDistance <= 14 ? "moderate cost" : "high cost"}. Shows simplified distant land and cavern shapes; it never simulates creatures, fluids, plants, or structures.</small></span><input type="range" min={settings.renderDistance} max="32" step="1" value={settings.basicRenderDistance} onChange={(event) => updateSettings({ basicRenderDistance: Number(event.target.value) })} /></label>
            <label className="setting-row"><span><strong>Simulation distance</strong><small>{settings.simulationDistance} chunks · creatures, liquids, crops, and POIs tick inside this radius</small></span><input type="range" min="2" max={settings.renderDistance} step="1" value={settings.simulationDistance} onChange={(event) => updateSettings({ simulationDistance: Number(event.target.value) })} /></label>
            <label className="setting-row resource-setting"><span><strong>Resource reserve</strong><small>{settings.resourceMode === "cpu" ? "CPU boost raises streaming and simulation work budgets." : settings.resourceMode === "memory" ? "Memory cache retains more nearby chunks to reduce traversal reload stutter." : "Auto adapts work and cache pressure to this device."}</small></span><select value={settings.resourceMode} onChange={(event) => updateSettings({ resourceMode: event.target.value as GameSettings["resourceMode"] })}><option value="auto">Auto (adaptive)</option><option value="cpu">CPU boost</option><option value="memory">Memory cache</option></select></label>
            <label className="setting-row resource-setting"><span><strong>Drone voices</strong><small>Spatial voices come from each drone; universal voices play at a constant level. Captions always remain in chat.</small></span><select value={settings.agentVoiceMode} onChange={(event) => updateSettings({ agentVoiceMode: event.target.value as GameSettings["agentVoiceMode"] })}><option value="spatial">Spatial</option><option value="universal">Universal</option><option value="off">Captions only</option></select></label>
            <label className="setting-row resource-setting"><span><strong>Touch controls</strong><small>Auto follows the active pointer: touch shows the overlay, while mouse or pen keeps hybrid PCs clear.</small></span><select value={uiPreferences.touchControls} onChange={(event) => updateUiPreferences({ touchControls: event.target.value as TouchControlsMode })}><option value="auto">Auto (active pointer)</option><option value="off">Off</option><option value="on">On</option></select></label>
            <label className="setting-row"><span><strong>Target outline</strong><small>{Math.round(uiPreferences.targetOutlineOpacity * 100)}% opacity</small></span><input type="range" min="0.05" max="1" step="0.05" value={uiPreferences.targetOutlineOpacity} onChange={(event) => updateUiPreferences({ targetOutlineOpacity: Number(event.target.value) })} /></label>
            <div className="toggle-setting"><span><strong>Context reference hints</strong><small>Shows the short Item Wiki and Bestiary hotkey hint while an item is hovered.</small></span><button type="button" className={uiPreferences.showReferenceHints ? "active" : ""} onClick={() => updateUiPreferences({ showReferenceHints: !uiPreferences.showReferenceHints })}>{uiPreferences.showReferenceHints ? "ON" : "OFF"}</button></div>
            <div className="toggle-setting"><span><strong>Music, sound effects & ambience</strong><small>Includes the Blockwild day, night, and sea score.</small></span><button type="button" className={settings.muted ? "" : "active"} onClick={() => updateSettings({ muted: !settings.muted })}>{settings.muted ? "OFF" : "ON"}</button></div>
            <div className="toggle-setting"><span><strong>FPS counter</strong><small>Shows a compact live performance readout while playing.</small></span><button type="button" className={settings.showFps ? "active" : ""} onClick={() => updateSettings({ showFps: !settings.showFps })}>{settings.showFps ? "ON" : "OFF"}</button></div>
            <div className="toggle-setting"><span><strong>HUD minimap</strong><small>Shows a north-up local terrain chart in the upper-left while playing. Disabled by default.</small></span><button type="button" className={settings.showMinimap ? "active" : ""} onClick={() => updateSettings({ showMinimap: !settings.showMinimap })}>{settings.showMinimap ? "ON" : "OFF"}</button></div>
            <div className="toggle-setting"><span><strong>Block crack texture</strong><small>Shows the familiar staged crack overlay while breaking full blocks.</small></span><button type="button" className={settings.showBreakingTexture ? "active" : ""} onClick={() => updateSettings({ showBreakingTexture: !settings.showBreakingTexture })}>{settings.showBreakingTexture ? "ON" : "OFF"}</button></div>
            <div className="toggle-setting"><span><strong>Breaking progress bar</strong><small>Optional numeric-style HUD meter; off by default while the crack texture is active.</small></span><button type="button" className={settings.showBreakProgress ? "active" : ""} onClick={() => updateSettings({ showBreakProgress: !settings.showBreakProgress })}>{settings.showBreakProgress ? "ON" : "OFF"}</button></div>
            <div className="toggle-setting"><span><strong>Tool effectiveness outline</strong><small>Subtly shifts the target outline green, amber, or red for the held tool.</small></span><button type="button" className={settings.showToolEffectiveness ? "active" : ""} onClick={() => updateSettings({ showToolEffectiveness: !settings.showToolEffectiveness })}>{settings.showToolEffectiveness ? "ON" : "OFF"}</button></div>
            <div className="toggle-setting"><span><strong>Performance debug logging</strong><small>Opt-in one-second resource samples. Nothing is uploaded; stopping downloads a JSON report.</small></span><button type="button" className={settings.debugTelemetry ? "active" : ""} onClick={() => { if (settings.debugTelemetry && telemetryRunning) stopTelemetry("manual"); updateSettings({ debugTelemetry: !settings.debugTelemetry }); }}>{settings.debugTelemetry ? "ON" : "OFF"}</button></div>
            {settings.debugTelemetry && <div className="telemetry-setting"><label><span><strong>Emergency stop</strong><small>Automatically download after this many minutes (1–180).</small></span><input type="number" min="1" max="180" value={settings.debugTelemetryMaxMinutes} onChange={(event) => updateSettings({ debugTelemetryMaxMinutes: Math.max(1, Math.min(180, Number(event.target.value) || 60)) })} /></label><button type="button" className={telemetryRunning ? "active" : ""} onClick={() => telemetryRunning ? stopTelemetry("manual") : startTelemetry()}>{telemetryRunning ? `STOP & DOWNLOAD · ${telemetrySamples} SAMPLES` : "START LOGGING"}</button></div>}
            <div className="fullscreen-setting"><PixelButton onClick={() => engineRef.current?.toggleFullscreen()}>{hud.fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</PixelButton></div>
            <div className="panel-actions"><PixelButton className="gold-button" onClick={() => setOverlay(settingsReturn)}>Done</PixelButton></div>
          </div>
        </section>
      )}

      {overlay && ["inventory", "crafting", "furnace", "alchemy", "distillery", "sugarworks", "apiary", "morph-loom", "golem-forge"].includes(overlay) && !itemGuideOpen && (
        <button type="button" className="item-guide-launcher" onClick={() => openItemGuide(selectedSlot?.item)} aria-label="Open Blockwild Wiki">WIKI <kbd>?</kbd></button>
      )}
      {itemGuideOpen && <section className="menu-overlay item-guide-overlay" aria-labelledby="item-guide-title">{renderItemGuide()}</section>}

      {webglError && (
        <section className="webgl-fallback" role="alert" aria-labelledby="webgl-title"><div className="pixel-panel confirm-panel"><div className="warning-cube" aria-hidden="true">◇</div><h2 id="webgl-title">The world could not render</h2><p>Blockwild needs WebGL hardware acceleration. Try a current desktop browser and make sure graphics acceleration is enabled.</p><PixelButton className="secondary-button" onClick={() => setWebglError(false)}>Browse Menus Anyway</PixelButton></div></section>
      )}

      {workstationAuditMode === "apiary" && renderApiaryPanel({
        queen: { alive: true, home: true, name: "Queen Marigold" },
        workers: Array.from({ length: 5 }, (_, index) => ({ alive: true, home: index > 2 })),
        nectar: 28,
        nectarStatus: "3 foraging · nectar return at dusk",
        honey: 9,
        royalJelly: 4,
        productionProgress: 0.68,
        workerGrowthProgress: 0.44,
        queenDisplayEnabled: false,
        queenDisplayAvailable: true,
        slots: [workstationAuditOrb("hive-queen", "Queen Marigold", MOB_DEFS["hive-queen"].health, MOB_DEFS["hive-queen"].health), { item: Item.HoneyJar, count: 9 }, { item: Item.RoyalJelly, count: 4 }],
      }, true)}
      {workstationAuditMode === "morph-loom" && renderMorphLoomPanel(workstationAuditMorphLoom(), true)}
      {workstationAuditMode === "orb-rack" && renderOrbStationPanel("orb-rack", {
        slots: [
          workstationAuditOrb("peelop", "Pip", MOB_DEFS.peelop.health, MOB_DEFS.peelop.health),
          workstationAuditOrb("emberjay", "Cinder", 3, MOB_DEFS.emberjay.health),
          { item: Item.CaptureOrb, count: 1, metadata: { captureOrb: JSON.stringify({ schema: 1, orbId: "audit-empty", capturedAt: 0, creature: null }) } },
          null,
          workstationAuditOrb("petalfox", "Clover", MOB_DEFS.petalfox.health, MOB_DEFS.petalfox.health),
          workstationAuditOrb("puddlehopper", "Pipkin", 2, MOB_DEFS.puddlehopper.health),
          null,
          null,
        ],
      }, true)}
      {workstationAuditMode === "healing-station" && renderOrbStationPanel("healing-station", {
        gelUnits: 37,
        healClock: 6.4,
        healIntervalSeconds: 20,
        gelFuelSeconds: 372,
        gelFuelMaxSeconds: 600,
        fuelActive: true,
        slots: [
          workstationAuditOrb("shadecrawler", "Nightglass", MOB_DEFS.shadecrawler.health, MOB_DEFS.shadecrawler.health),
          workstationAuditOrb("ridgeback", "Bracken", 6, MOB_DEFS.ridgeback.health),
          workstationAuditOrb("peelop", "Pip", 2, MOB_DEFS.peelop.health),
          null,
        ],
      }, true)}
      {workstationAuditMode === "sugarworks" && (
        <section className="menu-overlay hearthroads-overlay sugarworks-overlay workstation-audit-overlay" aria-label="Sugarworks interface audit">
          <StationPanel
            kind="sugarworks"
            state={{
              ...createSugarworks(),
              selectedRecipeId: "sugarcourt-candied-alloy",
              activeBatch: { recipeId: "sugarcourt-candied-alloy", progressSeconds: 15, durationSeconds: 24 },
            }}
            recipes={SUGARWORKS_RECIPES}
            inventory={{ gumdrop: 12, "lollipop-petal": 7, "honey-jar": 3, "cocoa-nib": 5, "candied-alloy": 9, "crystal-shard": 4, "marshmallow-tuft": 8, stick: 12, "peppermint-cane": 6 }}
            blueprints={createBlueprintState()}
            onSelectRecipe={() => undefined}
            onStartBatch={() => undefined}
            onCollectOutput={() => undefined}
            onClose={() => setWorkstationAuditMode(null)}
          />
        </section>
      )}
      {workstationAuditMode === "wheat-mill" && renderWheatMillPanel({
        schema: 1,
        input: { item: Item.Wheat, count: 18 },
        output: { item: Item.Flour, count: 7 },
        progressSeconds: WHEAT_MILL_CYCLE_SECONDS * 0.63,
      }, true)}

      {civicAuditMode && (
        <section className="menu-overlay hearthroads-overlay civic-audit-overlay" aria-label="Atlantian civic interface audit">
          {civicAuditMode === "atlantian-dialogue" ? (
            <SentientDialoguePanel
              character={{
                id: "ui-audit-glowmender",
                name: "Neri of the Lantern Tide",
                factionId: "atlantians",
                profession: "atlantian-glowmender",
                portraitUrl: sentientPortraitPath("atlantians", "atlantian-glowmender"),
                alignment: 18,
              }}
              greeting={SENTIENT_FACTION_COPY.atlantians.greeting}
              body="The Lumen Tidemoots remember favors through every shared current. This unwalled home is lit by reeflight and tended by water-breathing citizens."
              choices={[
                { id: "trade", label: "Trade", description: "Browse salves, kelp, reefglass, and pearls carried on the open current.", badge: "420g", tone: "warm" },
                { id: "quests", label: "Ask about work", description: "Learn what the reef nursery and current watch need today.", tone: "plain" },
                { id: "settlement", label: SENTIENT_FACTION_COPY.atlantians.settlementChoice, description: SENTIENT_FACTION_COPY.atlantians.settlementChoiceDescription, tone: "plain" },
              ]}
              onChoose={() => undefined}
              onClose={() => setCivicAuditMode(null)}
            />
          ) : civicAuditMode === "atlantian-trade" ? (
            <TradePanel
              merchant={ATLANTIAN_UI_AUDIT_MERCHANT}
              playerGold={ATLANTIAN_UI_AUDIT_WALLET.balance}
              playerInventory={[
                { itemKey: "shellfruit", count: 23 },
                { itemKey: "raw-gold", count: 6 },
              ]}
              merchantName="Sela of the Pearl Current"
              onTrade={() => undefined}
              onClose={() => setCivicAuditMode(null)}
            />
          ) : (
            <SettlementPanel
              settlement={ATLANTIAN_UI_AUDIT_SETTLEMENT}
              settlementName="Lumen Tidemoot"
              alignment={18}
              onSetRoleWaypoint={() => undefined}
              onSelectResident={() => undefined}
              onOpenSettlementMap={() => undefined}
              onClose={() => setCivicAuditMode(null)}
            />
          )}
        </section>
      )}

      {iconAuditMode && (
        <section className={`item-icon-audit ${iconAuditMode === "tomes" ? "tome-icon-audit" : ""}`} aria-label="Inventory item icon size audit">
          <header><div><span className="panel-eyebrow">UI ART QA · ACTUAL DISPLAY SIZES</span><h2>Inventory Icon Audit</h2></div><button type="button" onClick={() => setIconAuditMode(null)} aria-label="Close icon audit">×</button></header>
          <p>Left: 28px inventory and hotbar artwork. Right: the same artwork at its 22px recipe-book size.</p>
          <div className="item-icon-audit-grid">
            {Object.values(ITEMS).filter((definition) => iconAuditMode === "all"
              || (iconAuditMode === "tomes" ? definition.useKind === "spell-tome"
                : iconAuditMode === "alchemy" ? [Item.GlassBottle, Item.WaterBottle, BlockId.AlchemyStand].includes(definition.id)
                : iconAuditMode === "resources" ? RESOURCE_ASSET_AUDIT_ITEMS.has(definition.id)
                  : DRAGON_ASSET_AUDIT_ITEMS.has(definition.id))).map((definition) => <article key={definition.id}><span className="item-audit-large"><ItemIcon item={definition.id} /></span><span className="item-audit-small"><ItemIcon item={definition.id} small /></span><strong>{definition.name}</strong><small>{itemIconKind(definition.id)}</small></article>)}
          </div>
        </section>
      )}
      {heldAuditMode && (
        <section className="held-model-audit" aria-label="Held item model audit">
          <header><div><span className="panel-eyebrow">PRODUCTION MODEL QA · THIRD-PERSON SOCKET</span><h2>Held Item Framing</h2></div><button type="button" onClick={() => setHeldAuditMode(false)} aria-label="Close held model audit">×</button></header>
          <p>Every preview uses the same model and forward hand socket used by local third-person and remote multiplayer players.</p>
          <div className="held-model-audit-grid">
            {([
              [Item.ButterflyNet, "Textured Butterfly Net"],
              [Item.MeadowwingJar, "Meadowwing model"],
              [Item.BloomMonarchJar, "Bloom Monarch model"],
              [BlockId.Torch, "Animated Torch profile"],
              [Item.FireDragonEgg, "Fire Dragon Egg"],
              [Item.IceDragonEgg, "Ice Dragon Egg"],
              [Item.SteelDragonEgg, "Steel Dragon Egg"],
              [Item.SeaDragonEgg, "Sea Dragon Egg"],
              [Item.GoldDragonEgg, "Gold Dragon Egg"],
              [Item.SilverDragonEgg, "Silver Dragon Egg"],
              [BlockId.Stone, "Atlas-ready voxel block"],
              [Item.RawCopper, "Raw mineral cluster"],
              [Item.CopperIngot, "Forged ingot profile"],
              [Item.String, "Fiber and cord profile"],
              [Item.Bread, "Food profile"],
              [Item.Hide, "Creature material profile"],
              [Item.CaveGel, "Contained reagent profile"],
              [Item.CardforgeCase, "Relic and case profile"],
            ] as const).map(([item, label], index) => <figure key={item}><PlayerAvatarPreview variant={index % 2 ? "female" : "male"} heldItem={item} /><figcaption><strong>{label}</strong><small>{ITEMS[item].name} · production scale</small></figcaption></figure>)}
          </div>
        </section>
      )}
    </main>
  );
}
