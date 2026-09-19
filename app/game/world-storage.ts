import type { GameMode } from "./data";
import type { WorldSave } from "./engine";
import { NPC_FACTION_IDS, normalizeEnabledFactions, type NpcFactionId } from "./factions";
import { GENERATOR_VERSION, MIN_Y, WORLD_HEIGHT, type WorldGenerationOptions } from "./world";
import {
  normalizeWorldOriginPreference,
  type LargeTownFrequency,
  type RoadCoverage,
  type SettlementClustering,
  type SettlementPattern,
  type WorldOriginPreference,
} from "./settlement-index";
import { LEGACY_GAME_VERSION, normalizeGameVersion } from "./version";
import { TYPESCRIPT_STORAGE_PREFIX } from "./edition";

export const WORLD_CATALOG_VERSION = 1;
export const WORLD_EXPORT_VERSION = 1;
export const WORLD_CATALOG_KEY = `${TYPESCRIPT_STORAGE_PREFIX}-world-catalog-v1`;
export const WORLD_DATA_PREFIX = `${TYPESCRIPT_STORAGE_PREFIX}-world-data-v1:`;
export const LEGACY_WORLD_KEY = `${TYPESCRIPT_STORAGE_PREFIX}-world-v2`;
export const WORLD_OWNERSHIP = "host-device" as const;
export const WORLD_OWNERSHIP_NOTICE = "TypeScript Edition worlds are stored only in this browser on this host device. Export a world to move it, back it up, or transfer it explicitly.";

const LEGACY_GENERATOR_MIN_Y = -32;
const MAX_NAME_LENGTH = 64;
const MAX_SEED_LENGTH = 160;

export type WorldDifficulty = "peaceful" | "easy" | "normal" | "hard";
export type SleepRule = "any-player" | "percentage" | "all-players";

export type WorldOptions = {
  difficulty: WorldDifficulty;
  dayLengthMinutes: number;
  mobDensity: number;
  butterflyDensity: number;
  caveFrequency: number;
  biomeScale: number;
  resourceAbundance: number;
  structures: boolean;
  weather: boolean;
  keepInventory: boolean;
  friendlyFire: boolean;
  sleepRule: SleepRule;
  sleepPercentage: number;
  /** Cultures allowed to generate settlements and their aligned residents. */
  enabledFactions: readonly NpcFactionId[];
  settlementPattern: SettlementPattern;
  settlementDensity: number;
  settlementClustering: SettlementClustering;
  roadCoverage: RoadCoverage;
  largeTownFrequency: LargeTownFrequency;
  origin: WorldOriginPreference;
};

export const DEFAULT_WORLD_OPTIONS: Readonly<WorldOptions> = Object.freeze({
  difficulty: "normal",
  dayLengthMinutes: 20,
  mobDensity: 1,
  butterflyDensity: 1,
  caveFrequency: 1,
  biomeScale: 1.35,
  resourceAbundance: 1,
  structures: true,
  weather: true,
  keepInventory: false,
  friendlyFire: false,
  sleepRule: "percentage",
  sleepPercentage: 50,
  enabledFactions: Object.freeze([...NPC_FACTION_IDS]),
  settlementPattern: "heartlands-v2",
  settlementDensity: 1,
  settlementClustering: "regional",
  roadCoverage: "regional",
  largeTownFrequency: "balanced",
  origin: Object.freeze({ mode: "wilderness" }),
});

export type WorldMetadata = {
  id: string;
  ownership: typeof WORLD_OWNERSHIP;
  name: string;
  seed: string;
  mode: GameMode;
  createdAt: number;
  updatedAt: number;
  lastPlayedAt: number | null;
  playTimeMs: number;
  lastSavedGameVersion: string;
};

export type StoredWorld = {
  version: typeof WORLD_CATALOG_VERSION;
  metadata: WorldMetadata;
  options: WorldOptions;
  save: WorldSave;
};

export type WorldCatalog = {
  version: typeof WORLD_CATALOG_VERSION;
  ownership: typeof WORLD_OWNERSHIP;
  activeWorldId: string | null;
  legacyMigrated: boolean;
  worlds: WorldMetadata[];
};

export type WorldSortField = "name" | "seed" | "mode" | "createdAt" | "updatedAt" | "lastPlayedAt" | "playTimeMs";
export type WorldSortDirection = "asc" | "desc";
export type WorldListOptions = { sortBy?: WorldSortField; direction?: WorldSortDirection };

export type WorldStorageErrorCode = "unavailable" | "quota" | "corrupt" | "not-found" | "invalid" | "unsupported-version";
export type WorldStorageIssue = {
  code: WorldStorageErrorCode;
  message: string;
  key?: string;
};

export type WorldStorageResult<T> =
  | { ok: true; value: T; warnings?: WorldStorageIssue[] }
  | { ok: false; error: WorldStorageIssue };

export type CreateWorldInput = {
  name?: string;
  save: WorldSave;
  options?: Partial<WorldOptions>;
};

export type SaveWorldInput = {
  save: WorldSave;
  playTimeDeltaMs?: number;
  markPlayed?: boolean;
  options?: Partial<WorldOptions>;
};

export type WorldExport = {
  format: "blockwild-world";
  version: typeof WORLD_EXPORT_VERSION;
  exportedAt: number;
  ownershipNotice: string;
  world: StoredWorld;
};

export type WorldStorageDependencies = {
  now?: () => number;
  idFactory?: () => string;
  /** Injectable for storage-event regression tests; defaults to the browser window. */
  storageEventTarget?: StorageEventTarget | null;
};

type StorageEventTarget = {
  addEventListener(type: "storage", listener: (event: StorageEvent) => void): void;
  removeEventListener(type: "storage", listener: (event: StorageEvent) => void): void;
};

type StoredWorldShell = Pick<StoredWorld, "version" | "metadata" | "options">;
type CachedWorldShell = { revision: number; shell: StoredWorldShell };
type StorageRevisionState = { catalog: number; documents: Map<string, number> };

/**
 * Storage events are not fired in the tab which performed a localStorage
 * write. Keep a tiny same-realm revision ledger as the complementary signal
 * for multiple WorldStorage instances sharing one Storage object.
 */
const STORAGE_REVISIONS = new WeakMap<Storage, StorageRevisionState>();

function revisionsFor(storage: Storage | null) {
  if (!storage) return null;
  let revisions = STORAGE_REVISIONS.get(storage);
  if (!revisions) {
    revisions = { catalog: 0, documents: new Map() };
    STORAGE_REVISIONS.set(storage, revisions);
  }
  return revisions;
}

function documentRevision(storage: Storage | null, id: string) {
  return revisionsFor(storage)?.documents.get(id) ?? 0;
}

function bumpDocumentRevision(storage: Storage, id: string) {
  const revisions = revisionsFor(storage)!;
  revisions.documents.set(id, (revisions.documents.get(id) ?? 0) + 1);
  revisions.catalog += 1;
  return revisions;
}

function bumpCatalogRevision(storage: Storage) {
  const revisions = revisionsFor(storage)!;
  revisions.catalog += 1;
  return revisions.catalog;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const finiteTimestamp = (value: unknown, fallback: number) => clamp(Math.trunc(finite(value, fallback)), 0, Number.MAX_SAFE_INTEGER);
const ok = <T>(value: T, warnings?: WorldStorageIssue[]): WorldStorageResult<T> => warnings?.length ? { ok: true, value, warnings } : { ok: true, value };
const fail = <T>(code: WorldStorageErrorCode, message: string, key?: string): WorldStorageResult<T> => ({ ok: false, error: { code, message, ...(key ? { key } : {}) } });

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number, min: number, max: number, precision = 2) {
  const resolved = clamp(finite(value, fallback), min, max);
  const factor = 10 ** precision;
  return Math.round(resolved * factor) / factor;
}

export function normalizeWorldOptions(value?: Partial<WorldOptions> | null): WorldOptions {
  const input = isRecord(value) ? value : {};
  const difficulty = ["peaceful", "easy", "normal", "hard"].includes(String(input.difficulty))
    ? input.difficulty as WorldDifficulty
    : DEFAULT_WORLD_OPTIONS.difficulty;
  const sleepRule = ["any-player", "percentage", "all-players"].includes(String(input.sleepRule))
    ? input.sleepRule as SleepRule
    : DEFAULT_WORLD_OPTIONS.sleepRule;
  const enabledFactions = normalizeEnabledFactions(input.enabledFactions);
  const structures = normalizeBoolean(input.structures, DEFAULT_WORLD_OPTIONS.structures);
  const settlementPattern: SettlementPattern = input.settlementPattern === "legacy-scattered-v1" ? "legacy-scattered-v1" : "heartlands-v2";
  const settlementDensity = normalizeNumber(input.settlementDensity, DEFAULT_WORLD_OPTIONS.settlementDensity, 0, 2);
  return {
    difficulty,
    dayLengthMinutes: normalizeNumber(input.dayLengthMinutes, DEFAULT_WORLD_OPTIONS.dayLengthMinutes, 5, 120, 1),
    mobDensity: normalizeNumber(input.mobDensity, DEFAULT_WORLD_OPTIONS.mobDensity, 0, 3),
    butterflyDensity: normalizeNumber(input.butterflyDensity, DEFAULT_WORLD_OPTIONS.butterflyDensity, 0, 4),
    caveFrequency: normalizeNumber(input.caveFrequency, DEFAULT_WORLD_OPTIONS.caveFrequency, 0, 3),
    biomeScale: normalizeNumber(input.biomeScale, DEFAULT_WORLD_OPTIONS.biomeScale, 0.25, 4),
    resourceAbundance: normalizeNumber(input.resourceAbundance, DEFAULT_WORLD_OPTIONS.resourceAbundance, 0.25, 4),
    structures,
    weather: normalizeBoolean(input.weather, DEFAULT_WORLD_OPTIONS.weather),
    keepInventory: normalizeBoolean(input.keepInventory, DEFAULT_WORLD_OPTIONS.keepInventory),
    friendlyFire: normalizeBoolean(input.friendlyFire, DEFAULT_WORLD_OPTIONS.friendlyFire),
    sleepRule,
    sleepPercentage: normalizeNumber(input.sleepPercentage, DEFAULT_WORLD_OPTIONS.sleepPercentage, 1, 100, 0),
    enabledFactions,
    settlementPattern,
    settlementDensity,
    settlementClustering: input.settlementClustering === "even" || input.settlementClustering === "strong" ? input.settlementClustering : "regional",
    roadCoverage: input.roadCoverage === "none" || input.roadCoverage === "local" || input.roadCoverage === "dense" ? input.roadCoverage : "regional",
    largeTownFrequency: input.largeTownFrequency === "rare" || input.largeTownFrequency === "frequent" ? input.largeTownFrequency : "balanced",
    origin: structures && settlementDensity > 0 ? normalizeWorldOriginPreference(input.origin, enabledFactions) : Object.freeze({ mode: "wilderness" }),
  };
}

export function requiredSleepers(options: Pick<WorldOptions, "sleepRule" | "sleepPercentage">, onlinePlayers: number) {
  const players = Math.max(1, Math.floor(Number.isFinite(onlinePlayers) ? onlinePlayers : 1));
  if (options.sleepRule === "any-player") return 1;
  if (options.sleepRule === "all-players") return players;
  return Math.max(1, Math.min(players, Math.ceil(players * Math.max(1, Math.min(100, options.sleepPercentage)) / 100)));
}

export function generationOptionsFromWorldOptions(
  value?: Partial<WorldOptions> | null,
  profile: WorldGenerationOptions["profile"] = "world-below-v15",
): WorldGenerationOptions {
  const options = normalizeWorldOptions(value);
  return {
    profile,
    caveFrequency: options.caveFrequency,
    biomeScale: options.biomeScale,
    resourceAbundance: options.resourceAbundance,
    structures: options.structures,
    enabledFactions: options.enabledFactions,
    settlementPattern: options.settlementPattern,
    settlementDensity: options.settlementDensity,
    settlementClustering: options.settlementClustering,
    roadCoverage: options.roadCoverage,
    largeTownFrequency: options.largeTownFrequency,
    origin: options.origin,
  };
}

function normalizeName(value: unknown, fallback = "New World") {
  const name = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().replace(/\s+/g, " ") : "";
  return (name || fallback).slice(0, MAX_NAME_LENGTH);
}

function normalizeSeed(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_SEED_LENGTH) : "";
}

function normalizeMode(value: unknown): GameMode | null {
  return value === "survival" || value === "builder" ? value : null;
}

function normalizeId(value: unknown) {
  if (typeof value !== "string") return "world";
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "world";
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sanitizeEdits(value: unknown, offset = 0) {
  const edits: Record<string, Array<[number, number]>> = Object.create(null) as Record<string, Array<[number, number]>>;
  if (!isRecord(value)) return edits;
  for (const [key, entries] of Object.entries(value)) {
    if (!/^-?\d+,-?\d+$/.test(key) || !Array.isArray(entries)) continue;
    const safeEntries: Array<[number, number]> = [];
    for (const entry of entries) {
      if (!Array.isArray(entry) || !Number.isFinite(entry[0]) || !Number.isFinite(entry[1])) continue;
      const index = Math.trunc(entry[0] as number) + offset;
      const type = Math.trunc(entry[1] as number);
      // The World Below moved chunk storage to Uint16 so authored blocks can
      // safely use ids above the old byte ceiling. Keep the import boundary
      // bounded to the same representation instead of silently dropping new
      // underground blocks from exported worlds.
      if (index < 0 || index >= 16 * 16 * WORLD_HEIGHT || type < 0 || type > 65_535) continue;
      safeEntries.push([index, type]);
    }
    edits[key] = safeEntries;
  }
  return edits;
}

export function migrateLegacyWorldSave(value: unknown): WorldSave | null {
  if (!isRecord(value) || value.version !== 2) return null;
  const seed = normalizeSeed(value.seed);
  const mode = normalizeMode(value.mode);
  if (!seed || !mode || !isRecord(value.player)) return null;
  const generatorVersion = Math.trunc(finite(value.generatorVersion, -1));
  if (![2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, GENERATOR_VERSION].includes(generatorVersion)) return null;
  const offset = generatorVersion === 2 ? (LEGACY_GENERATOR_MIN_Y - MIN_Y) * 16 * 16 : 0;
  const player = value.player;
  if (![player.x, player.y, player.z].every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate))) return null;
  const spawn = isRecord(value.spawn) ? value.spawn : player;
  const weather = value.weather === "rain" ? "rain" : "clear";
  const normalized = {
    ...value,
    version: 2,
    generatorVersion: GENERATOR_VERSION,
    generatorProfile: value.generatorProfile === "legacy-v14" || generatorVersion < 15
      ? "legacy-v14"
      : "world-below-v15",
    lastSavedGameVersion: normalizeGameVersion(value.lastSavedGameVersion),
    options: generatorVersion < 17
      ? { ...(isRecord(value.options) ? value.options : {}), settlementPattern: "legacy-scattered-v1" }
      : value.options,
    seed,
    mode,
    playerVariant: value.playerVariant === "female" ? "female" : "male",
    edits: sanitizeEdits(value.edits, offset),
    player: {
      x: finite(player.x, 0),
      y: finite(player.y, 64),
      z: finite(player.z, 0),
      yaw: finite(player.yaw, 0),
      pitch: clamp(finite(player.pitch, 0), -1.4, 1.4),
    },
    spawn: {
      x: finite(spawn.x, finite(player.x, 0)),
      y: finite(spawn.y, finite(player.y, 64)),
      z: finite(spawn.z, finite(player.z, 0)),
    },
    inventory: Array.isArray(value.inventory) ? value.inventory : [],
    selected: Math.trunc(clamp(finite(value.selected, 0), 0, 8)),
    health: clamp(finite(value.health, 10), 1, 10),
    hunger: clamp(finite(value.hunger, 10), 0, 10),
    xp: Math.max(0, finite(value.xp, 0)),
    level: Math.max(0, Math.trunc(finite(value.level, 0))),
    time: finite(value.time, 0.32),
    day: Math.max(1, Math.trunc(finite(value.day, 1))),
    weather,
    furnaces: isRecord(value.furnaces) ? value.furnaces : {},
    chests: isRecord(value.chests) ? value.chests : {},
    savedAt: finiteTimestamp(value.savedAt, Date.now()),
  } as unknown as WorldSave;
  try {
    return cloneJson(normalized);
  } catch {
    return null;
  }
}

export function normalizeWorldMetadata(value: unknown, fallback: { id: string; save: WorldSave; now: number }): WorldMetadata | null {
  const input = isRecord(value) ? value : {};
  const mode = normalizeMode(input.mode) ?? fallback.save.mode;
  const seed = normalizeSeed(input.seed) || fallback.save.seed;
  if (!mode || !seed) return null;
  const createdAt = finiteTimestamp(input.createdAt, fallback.now);
  return {
    id: normalizeId(input.id ?? fallback.id),
    ownership: WORLD_OWNERSHIP,
    name: normalizeName(input.name, seed),
    seed,
    mode,
    createdAt,
    updatedAt: Math.max(createdAt, finiteTimestamp(input.updatedAt, createdAt)),
    lastPlayedAt: input.lastPlayedAt === null || input.lastPlayedAt === undefined ? null : finiteTimestamp(input.lastPlayedAt, createdAt),
    playTimeMs: clamp(Math.trunc(finite(input.playTimeMs, 0)), 0, Number.MAX_SAFE_INTEGER),
    lastSavedGameVersion: normalizeGameVersion(input.lastSavedGameVersion, normalizeGameVersion(fallback.save.lastSavedGameVersion)),
  };
}

function classifyStorageError(error: unknown, key?: string): WorldStorageIssue {
  const candidate = error as { name?: string; code?: number; message?: string } | null;
  const quota = candidate?.name === "QuotaExceededError" || candidate?.name === "NS_ERROR_DOM_QUOTA_REACHED" || candidate?.code === 22 || candidate?.code === 1014;
  return {
    code: quota ? "quota" : "unavailable",
    message: quota
      ? "This device has no remaining browser storage for that world. Export or delete another world and try again."
      : "World storage is unavailable in this browser session.",
    ...(key ? { key } : {}),
  };
}

function defaultId() {
  const cryptoApi = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  return `world-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyCatalog(): WorldCatalog {
  return { version: WORLD_CATALOG_VERSION, ownership: WORLD_OWNERSHIP, activeWorldId: null, legacyMigrated: false, worlds: [] };
}

function metadataFromCatalog(value: unknown, now: number): WorldMetadata | null {
  if (!isRecord(value)) return null;
  const seed = normalizeSeed(value.seed);
  const mode = normalizeMode(value.mode);
  const id = normalizeId(value.id);
  if (!seed || !mode || id !== value.id) return null;
  const createdAt = finiteTimestamp(value.createdAt, now);
  return {
    id,
    ownership: WORLD_OWNERSHIP,
    name: normalizeName(value.name, seed),
    seed,
    mode,
    createdAt,
    updatedAt: Math.max(createdAt, finiteTimestamp(value.updatedAt, createdAt)),
    lastPlayedAt: value.lastPlayedAt === null || value.lastPlayedAt === undefined ? null : finiteTimestamp(value.lastPlayedAt, createdAt),
    playTimeMs: clamp(Math.trunc(finite(value.playTimeMs, 0)), 0, Number.MAX_SAFE_INTEGER),
    lastSavedGameVersion: normalizeGameVersion(value.lastSavedGameVersion, LEGACY_GAME_VERSION),
  };
}

export class WorldStorage {
  readonly diagnostics: WorldStorageIssue[] = [];
  private readonly storage: Storage | null;
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private readonly storageEventTarget: StorageEventTarget | null;
  private catalog: WorldCatalog = emptyCatalog();
  private catalogStored = false;
  private observedCatalogRevision = 0;
  private catalogDirty = false;
  /**
   * Small, trusted metadata/options snapshots for worlds this runtime has
   * already loaded or written. Autosaves only need this shell plus the new
   * save payload; retaining it avoids synchronously reading, parsing, and
   * migrating the previous (potentially very large) save on every autosave.
   * Full loads and exports still read and validate browser storage normally.
   */
  private readonly trustedDocumentShells = new Map<string, CachedWorldShell>();

  private readonly handleStorageEvent = (event: StorageEvent) => {
    if (event.storageArea && event.storageArea !== this.storage) return;
    if (event.key === null) {
      this.trustedDocumentShells.clear();
      this.catalogDirty = true;
      return;
    }
    if (event.key === WORLD_CATALOG_KEY) {
      // Metadata lives in both records. Treat a catalog notification as a
      // broad invalidation so a cross-tab rename can never be autosaved away.
      this.trustedDocumentShells.clear();
      this.catalogDirty = true;
      return;
    }
    if (event.key.startsWith(WORLD_DATA_PREFIX)) {
      this.trustedDocumentShells.delete(event.key.slice(WORLD_DATA_PREFIX.length));
      this.catalogDirty = true;
    }
  };

  constructor(storage?: Storage | null, dependencies: WorldStorageDependencies = {}) {
    this.storage = storage === undefined
      ? (typeof window !== "undefined" ? window.localStorage : null)
      : storage;
    this.now = dependencies.now ?? Date.now;
    this.idFactory = dependencies.idFactory ?? defaultId;
    this.storageEventTarget = dependencies.storageEventTarget === undefined
      ? this.defaultStorageEventTarget()
      : dependencies.storageEventTarget;
    this.readCatalog();
    this.observedCatalogRevision = revisionsFor(this.storage)?.catalog ?? 0;
    this.migrateLegacySave();
    this.storageEventTarget?.addEventListener("storage", this.handleStorageEvent);
  }

  dispose() {
    this.storageEventTarget?.removeEventListener("storage", this.handleStorageEvent);
    this.trustedDocumentShells.clear();
  }

  get ownershipNotice() {
    return WORLD_OWNERSHIP_NOTICE;
  }

  get issues() {
    return this.diagnostics.map((issue) => ({ ...issue }));
  }

  get activeWorldId() {
    this.ensureCatalogCurrent();
    return this.catalog.activeWorldId;
  }

  listWorlds(options: WorldListOptions = {}) {
    this.ensureCatalogCurrent();
    const sortBy = options.sortBy ?? "lastPlayedAt";
    const direction = options.direction ?? "desc";
    const factor = direction === "asc" ? 1 : -1;
    const worlds = this.catalog.worlds.map((metadata) => ({ ...metadata }));
    worlds.sort((left, right) => {
      const a = left[sortBy];
      const b = right[sortBy];
      if (typeof a === "string" && typeof b === "string") return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }) * factor;
      const numberA = a === null ? -1 : Number(a);
      const numberB = b === null ? -1 : Number(b);
      const order = numberA === numberB ? left.name.localeCompare(right.name) : numberA - numberB;
      return order * factor;
    });
    return worlds;
  }

  createWorld(input: CreateWorldInput): WorldStorageResult<WorldMetadata> {
    this.ensureCatalogCurrent();
    const save = migrateLegacyWorldSave(input.save);
    if (!save) return fail("invalid", "The new world save is incomplete or invalid.");
    const id = this.uniqueId();
    const now = this.now();
    const metadata: WorldMetadata = {
      id,
      ownership: WORLD_OWNERSHIP,
      name: normalizeName(input.name, save.seed),
      seed: save.seed,
      mode: save.mode,
      createdAt: now,
      updatedAt: now,
      lastPlayedAt: null,
      playTimeMs: 0,
      lastSavedGameVersion: normalizeGameVersion(save.lastSavedGameVersion),
    };
    const document: StoredWorld = { version: WORLD_CATALOG_VERSION, metadata, options: normalizeWorldOptions(input.options), save };
    const nextCatalog = this.copyCatalog({ activeWorldId: id, worlds: [...this.catalog.worlds, metadata] });
    const committed = this.commitDocument(document, nextCatalog);
    return committed.ok ? ok({ ...metadata }) : committed;
  }

  loadWorld(id: string, touch = true): WorldStorageResult<StoredWorld> {
    const loaded = this.readDocument(id);
    if (!loaded.ok || !touch) return loaded;
    const now = this.now();
    const metadata = { ...loaded.value.metadata, lastPlayedAt: now };
    const document = { ...loaded.value, metadata };
    const nextCatalog = this.copyCatalog({
      activeWorldId: id,
      worlds: this.catalog.worlds.map((entry) => entry.id === id ? metadata : entry),
    });
    const committed = this.commitDocument(document, nextCatalog);
    if (!committed.ok) return ok(loaded.value, [committed.error]);
    return ok(cloneJson(document));
  }

  saveWorld(id: string, input: SaveWorldInput): WorldStorageResult<WorldMetadata> {
    this.ensureCatalogCurrent();
    const cached = this.trustedDocumentShells.get(id);
    const shell = cached?.revision === documentRevision(this.storage, id) ? cached.shell : null;
    if (cached && !shell) this.trustedDocumentShells.delete(id);
    const loaded = shell ? ok(shell) : this.readDocument(id);
    if (!loaded.ok) return loaded;
    const save = migrateLegacyWorldSave(input.save);
    if (!save) return fail("invalid", "The world save is incomplete or invalid.", this.dataKey(id));
    const now = this.now();
    const metadata: WorldMetadata = {
      ...loaded.value.metadata,
      seed: save.seed,
      mode: save.mode,
      updatedAt: now,
      lastPlayedAt: input.markPlayed === false ? loaded.value.metadata.lastPlayedAt : now,
      playTimeMs: clamp(Math.trunc(loaded.value.metadata.playTimeMs + normalizeNumber(input.playTimeDeltaMs, 0, 0, Number.MAX_SAFE_INTEGER, 0)), 0, Number.MAX_SAFE_INTEGER),
      lastSavedGameVersion: normalizeGameVersion(save.lastSavedGameVersion),
    };
    const document: StoredWorld = {
      version: loaded.value.version,
      metadata,
      options: input.options ? normalizeWorldOptions({ ...loaded.value.options, ...input.options }) : loaded.value.options,
      save,
    };
    const nextCatalog = this.copyCatalog({ worlds: this.catalog.worlds.map((entry) => entry.id === id ? metadata : entry) });
    const committed = this.commitDocument(document, nextCatalog);
    return committed.ok ? ok({ ...metadata }) : committed;
  }

  addPlayTime(id: string, milliseconds: number): WorldStorageResult<WorldMetadata> {
    const loaded = this.readDocument(id);
    if (!loaded.ok) return loaded;
    const now = this.now();
    const metadata: WorldMetadata = {
      ...loaded.value.metadata,
      updatedAt: now,
      lastPlayedAt: now,
      playTimeMs: clamp(Math.trunc(loaded.value.metadata.playTimeMs + normalizeNumber(milliseconds, 0, 0, Number.MAX_SAFE_INTEGER, 0)), 0, Number.MAX_SAFE_INTEGER),
    };
    const document = { ...loaded.value, metadata };
    const nextCatalog = this.copyCatalog({ worlds: this.catalog.worlds.map((entry) => entry.id === id ? metadata : entry) });
    const committed = this.commitDocument(document, nextCatalog);
    return committed.ok ? ok({ ...metadata }) : committed;
  }

  renameWorld(id: string, name: string): WorldStorageResult<WorldMetadata> {
    const loaded = this.readDocument(id);
    if (!loaded.ok) return loaded;
    const metadata = { ...loaded.value.metadata, name: normalizeName(name), updatedAt: this.now() };
    const document = { ...loaded.value, metadata };
    const nextCatalog = this.copyCatalog({ worlds: this.catalog.worlds.map((entry) => entry.id === id ? metadata : entry) });
    const committed = this.commitDocument(document, nextCatalog);
    return committed.ok ? ok({ ...metadata }) : committed;
  }

  updateWorldOptions(id: string, patch: Partial<WorldOptions>): WorldStorageResult<WorldOptions> {
    const loaded = this.readDocument(id);
    if (!loaded.ok) return loaded;
    const metadata = { ...loaded.value.metadata, updatedAt: this.now() };
    const options = normalizeWorldOptions({ ...loaded.value.options, ...patch });
    const document: StoredWorld = { ...loaded.value, metadata, options };
    const nextCatalog = this.copyCatalog({ worlds: this.catalog.worlds.map((entry) => entry.id === id ? metadata : entry) });
    const committed = this.commitDocument(document, nextCatalog);
    return committed.ok ? ok({ ...options }) : committed;
  }

  /** Change the rules used on the next load without replacing world contents. */
  updateWorldMode(id: string, mode: GameMode): WorldStorageResult<WorldMetadata> {
    const loaded = this.readDocument(id);
    if (!loaded.ok) return loaded;
    const nextMode: GameMode = mode === "builder" ? "builder" : "survival";
    const metadata: WorldMetadata = { ...loaded.value.metadata, mode: nextMode, updatedAt: this.now() };
    const save: WorldSave = {
      ...loaded.value.save,
      mode: nextMode,
      ...(nextMode === "builder" ? { health: 10, hunger: 10 } : {}),
    };
    const document: StoredWorld = { ...loaded.value, metadata, save };
    const nextCatalog = this.copyCatalog({ worlds: this.catalog.worlds.map((entry) => entry.id === id ? metadata : entry) });
    const committed = this.commitDocument(document, nextCatalog);
    return committed.ok ? ok({ ...metadata }) : committed;
  }

  duplicateWorld(id: string, name?: string): WorldStorageResult<WorldMetadata> {
    const loaded = this.readDocument(id);
    if (!loaded.ok) return loaded;
    return this.createWorld({
      name: name ?? `${loaded.value.metadata.name} Copy`,
      options: loaded.value.options,
      save: loaded.value.save,
    });
  }

  deleteWorld(id: string): WorldStorageResult<WorldMetadata> {
    this.ensureCatalogCurrent();
    const metadata = this.catalog.worlds.find((entry) => entry.id === id);
    if (!metadata) return fail("not-found", "That world does not exist on this device.", this.dataKey(id));
    const remaining = this.catalog.worlds.filter((entry) => entry.id !== id);
    const fallbackActive = [...remaining].sort((a, b) => (b.lastPlayedAt ?? b.updatedAt) - (a.lastPlayedAt ?? a.updatedAt))[0]?.id ?? null;
    const nextCatalog = this.copyCatalog({
      activeWorldId: this.catalog.activeWorldId === id ? fallbackActive : this.catalog.activeWorldId,
      worlds: remaining,
    });
    const committed = this.commitCatalog(nextCatalog);
    if (!committed.ok) return committed;
    this.trustedDocumentShells.delete(id);
    if (this.storage) {
      const revisions = bumpDocumentRevision(this.storage, id);
      this.observedCatalogRevision = revisions.catalog;
    }
    try {
      this.storage?.removeItem(this.dataKey(id));
      return ok({ ...metadata });
    } catch (error) {
      return ok({ ...metadata }, [classifyStorageError(error, this.dataKey(id))]);
    }
  }

  setActiveWorld(id: string | null): WorldStorageResult<string | null> {
    this.ensureCatalogCurrent();
    if (id !== null && !this.catalog.worlds.some((entry) => entry.id === id)) {
      return fail("not-found", "That world does not exist on this device.", this.dataKey(id));
    }
    const committed = this.commitCatalog(this.copyCatalog({ activeWorldId: id }));
    return committed.ok ? ok(id) : committed;
  }

  exportWorld(id: string): WorldStorageResult<string> {
    const loaded = this.readDocument(id);
    if (!loaded.ok) return loaded;
    const exported: WorldExport = {
      format: "blockwild-world",
      version: WORLD_EXPORT_VERSION,
      exportedAt: this.now(),
      ownershipNotice: WORLD_OWNERSHIP_NOTICE,
      world: loaded.value,
    };
    try {
      return ok(JSON.stringify(exported, null, 2));
    } catch {
      return fail("invalid", "This world could not be converted to an export file.", this.dataKey(id));
    }
  }

  importWorld(json: string): WorldStorageResult<WorldMetadata> {
    this.ensureCatalogCurrent();
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch {
      return fail("invalid", "That file is not valid JSON.");
    }
    if (!isRecord(value) || value.format !== "blockwild-world") return fail("invalid", "That file is not a Blockwild world export.");
    if (value.version !== WORLD_EXPORT_VERSION) return fail("unsupported-version", "That Blockwild world export uses an unsupported version.");
    if (!isRecord(value.world) || value.world.version !== WORLD_CATALOG_VERSION) return fail("invalid", "The exported world record is incomplete.");
    if (!isRecord(value.world.metadata) || !isRecord(value.world.options)) return fail("invalid", "The exported world metadata or options are incomplete.");
    const sourceSave = migrateLegacyWorldSave(value.world.save);
    if (!sourceSave) return fail("invalid", "The exported world save is corrupt or incomplete.");
    const now = this.now();
    const sourceMetadata = normalizeWorldMetadata(value.world.metadata, { id: "world", save: sourceSave, now });
    if (!sourceMetadata) return fail("invalid", "The exported world metadata is corrupt or incomplete.");
    const id = this.uniqueId(sourceMetadata.id);
    // Imports are distinct world instances. Private runner notebooks must be
    // explicitly relinked instead of silently merging on seed equality.
    const save: WorldSave = { ...sourceSave, agentWorldFingerprint: `worldfp_import_${id}_${now.toString(36)}` };
    const metadata: WorldMetadata = {
      ...sourceMetadata,
      id,
      ownership: WORLD_OWNERSHIP,
      seed: save.seed,
      mode: save.mode,
      updatedAt: Math.max(sourceMetadata.updatedAt, now),
    };
    const document: StoredWorld = { version: WORLD_CATALOG_VERSION, metadata, options: normalizeWorldOptions(value.world.options as Partial<WorldOptions>), save };
    const nextCatalog = this.copyCatalog({
      activeWorldId: this.catalog.activeWorldId ?? id,
      worlds: [...this.catalog.worlds, metadata],
    });
    const committed = this.commitDocument(document, nextCatalog);
    return committed.ok ? ok({ ...metadata }) : committed;
  }

  private readCatalog() {
    if (!this.storage) {
      this.diagnostics.push({ code: "unavailable", message: "World storage is unavailable outside a browser on this host device.", key: WORLD_CATALOG_KEY });
      return;
    }
    let raw: string | null;
    try {
      raw = this.storage.getItem(WORLD_CATALOG_KEY);
    } catch (error) {
      this.diagnostics.push(classifyStorageError(error, WORLD_CATALOG_KEY));
      return;
    }
    if (!raw) return;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      this.diagnostics.push({ code: "corrupt", message: "The local world catalog is corrupt. Its world data was left untouched.", key: WORLD_CATALOG_KEY });
      return;
    }
    if (!isRecord(value) || value.version !== WORLD_CATALOG_VERSION) {
      this.diagnostics.push({ code: "unsupported-version", message: "The local world catalog uses an unsupported version.", key: WORLD_CATALOG_KEY });
      return;
    }
    const now = this.now();
    const worlds: WorldMetadata[] = [];
    const seen = new Set<string>();
    for (const entry of Array.isArray(value.worlds) ? value.worlds : []) {
      const metadata = metadataFromCatalog(entry, now);
      if (!metadata || seen.has(metadata.id)) {
        this.diagnostics.push({ code: "corrupt", message: "An invalid world catalog entry was ignored.", key: WORLD_CATALOG_KEY });
        continue;
      }
      seen.add(metadata.id);
      worlds.push(metadata);
    }
    const activeWorldId = typeof value.activeWorldId === "string" && seen.has(value.activeWorldId) ? value.activeWorldId : null;
    this.catalog = {
      version: WORLD_CATALOG_VERSION,
      ownership: WORLD_OWNERSHIP,
      activeWorldId,
      legacyMigrated: value.legacyMigrated === true,
      worlds,
    };
    this.catalogStored = true;
  }

  private migrateLegacySave() {
    if (!this.storage || this.catalog.legacyMigrated) return;
    let raw: string | null;
    try {
      raw = this.storage.getItem(LEGACY_WORLD_KEY);
    } catch (error) {
      this.diagnostics.push(classifyStorageError(error, LEGACY_WORLD_KEY));
      return;
    }
    if (!raw) {
      this.catalog.legacyMigrated = true;
      if (this.catalogStored) {
        const committed = this.commitCatalog(this.copyCatalog({ legacyMigrated: true }));
        if (!committed.ok) this.diagnostics.push(committed.error);
      }
      return;
    }
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      this.catalog.legacyMigrated = true;
      this.diagnostics.push({ code: "corrupt", message: "The legacy world save is corrupt and was left untouched.", key: LEGACY_WORLD_KEY });
      return;
    }
    const save = migrateLegacyWorldSave(value);
    if (!save) {
      this.catalog.legacyMigrated = true;
      this.diagnostics.push({ code: "corrupt", message: "The legacy world save is incomplete and was left untouched.", key: LEGACY_WORLD_KEY });
      return;
    }
    const now = this.now();
    const id = this.uniqueId("legacy-world");
    const metadata: WorldMetadata = {
      id,
      ownership: WORLD_OWNERSHIP,
      name: normalizeName(`Legacy ${save.seed}`, "Legacy World"),
      seed: save.seed,
      mode: save.mode,
      createdAt: finiteTimestamp(save.savedAt, now),
      updatedAt: finiteTimestamp(save.savedAt, now),
      lastPlayedAt: finiteTimestamp(save.savedAt, now),
      playTimeMs: 0,
      lastSavedGameVersion: normalizeGameVersion(save.lastSavedGameVersion),
    };
    const document: StoredWorld = { version: WORLD_CATALOG_VERSION, metadata, options: normalizeWorldOptions({ settlementPattern: "legacy-scattered-v1" }), save };
    const nextCatalog = this.copyCatalog({ activeWorldId: id, legacyMigrated: true, worlds: [...this.catalog.worlds, metadata] });
    const committed = this.commitDocument(document, nextCatalog);
    if (!committed.ok) {
      this.diagnostics.push(committed.error);
      return;
    }
    try {
      this.storage.removeItem(LEGACY_WORLD_KEY);
    } catch (error) {
      this.diagnostics.push(classifyStorageError(error, LEGACY_WORLD_KEY));
    }
  }

  private readDocument(id: string): WorldStorageResult<StoredWorld> {
    this.ensureCatalogCurrent();
    const catalogMetadata = this.catalog.worlds.find((entry) => entry.id === id);
    if (!catalogMetadata) return fail("not-found", "That world does not exist on this device.", this.dataKey(id));
    if (!this.storage) return fail("unavailable", "World storage is unavailable in this browser session.", this.dataKey(id));
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.dataKey(id));
    } catch (error) {
      const issue = classifyStorageError(error, this.dataKey(id));
      return { ok: false, error: issue };
    }
    if (!raw) return fail("corrupt", "This world's local data is missing. Other worlds were left untouched.", this.dataKey(id));
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return fail("corrupt", "This world's local data is corrupt. Other worlds were left untouched.", this.dataKey(id));
    }
    if (!isRecord(value) || value.version !== WORLD_CATALOG_VERSION) return fail("unsupported-version", "This world uses an unsupported storage version.", this.dataKey(id));
    const sourceSave = isRecord(value.save) ? value.save : {};
    const sourceGeneratorVersion = Math.trunc(finite(sourceSave.generatorVersion, -1));
    const save = migrateLegacyWorldSave(value.save);
    if (!save) return fail("corrupt", "This world's save payload is corrupt or incomplete.", this.dataKey(id));
    const document: StoredWorld = {
      version: WORLD_CATALOG_VERSION,
      metadata: { ...catalogMetadata, seed: save.seed, mode: save.mode },
      options: normalizeWorldOptions(sourceGeneratorVersion > 0 && sourceGeneratorVersion < 17
        ? { ...(isRecord(value.options) ? value.options : {}), settlementPattern: "legacy-scattered-v1" }
        : value.options as Partial<WorldOptions>),
      save,
    };
    this.rememberDocumentShell(document);
    return ok(document);
  }

  private uniqueId(preferred?: string) {
    const base = normalizeId(preferred ?? this.idFactory());
    let candidate = base;
    for (let suffix = 2; suffix < 10_000; suffix += 1) {
      const catalogCollision = this.catalog.worlds.some((entry) => entry.id === candidate);
      let dataCollision = false;
      try { dataCollision = this.storage?.getItem(this.dataKey(candidate)) !== null; } catch { dataCollision = false; }
      if (!catalogCollision && !dataCollision) return candidate;
      candidate = `${base.slice(0, 43)}-${suffix}`;
    }
    return `${base.slice(0, 35)}-${this.now().toString(36)}`;
  }

  private dataKey(id: string) {
    return `${WORLD_DATA_PREFIX}${id}`;
  }

  private copyCatalog(patch: Partial<WorldCatalog>): WorldCatalog {
    return {
      ...this.catalog,
      ...patch,
      version: WORLD_CATALOG_VERSION,
      ownership: WORLD_OWNERSHIP,
      worlds: (patch.worlds ?? this.catalog.worlds).map((metadata) => ({ ...metadata, ownership: WORLD_OWNERSHIP })),
    };
  }

  private commitCatalog(nextCatalog: WorldCatalog): WorldStorageResult<true> {
    if (!this.storage) return fail("unavailable", "World storage is unavailable in this browser session.", WORLD_CATALOG_KEY);
    try {
      this.storage.setItem(WORLD_CATALOG_KEY, JSON.stringify(nextCatalog));
      this.catalog = nextCatalog;
      this.catalogStored = true;
      this.observedCatalogRevision = bumpCatalogRevision(this.storage);
      this.catalogDirty = false;
      return ok(true);
    } catch (error) {
      return { ok: false, error: classifyStorageError(error, WORLD_CATALOG_KEY) };
    }
  }

  private commitDocument(document: StoredWorld, nextCatalog: WorldCatalog): WorldStorageResult<true> {
    if (!this.storage) return fail("unavailable", "World storage is unavailable in this browser session.", this.dataKey(document.metadata.id));
    const key = this.dataKey(document.metadata.id);
    let previousDocument: string | null = null;
    let previousCatalog: string | null = null;
    try {
      previousDocument = this.storage.getItem(key);
      previousCatalog = this.storage.getItem(WORLD_CATALOG_KEY);
      const serializedDocument = JSON.stringify(document);
      const serializedCatalog = JSON.stringify(nextCatalog);
      this.storage.setItem(key, serializedDocument);
      this.storage.setItem(WORLD_CATALOG_KEY, serializedCatalog);
      this.catalog = nextCatalog;
      this.catalogStored = true;
      const revisions = bumpDocumentRevision(this.storage, document.metadata.id);
      this.observedCatalogRevision = revisions.catalog;
      this.catalogDirty = false;
      this.rememberDocumentShell(document, revisions.documents.get(document.metadata.id) ?? 0);
      return ok(true);
    } catch (error) {
      try {
        if (previousDocument === null) this.storage.removeItem(key);
        else this.storage.setItem(key, previousDocument);
        if (previousCatalog === null) this.storage.removeItem(WORLD_CATALOG_KEY);
        else this.storage.setItem(WORLD_CATALOG_KEY, previousCatalog);
      } catch {
        // The original payload remains authoritative in memory even if a broken
        // storage implementation also rejects the best-effort rollback.
      }
      return { ok: false, error: classifyStorageError(error, key) };
    }
  }

  private rememberDocumentShell(document: StoredWorld, revision = documentRevision(this.storage, document.metadata.id)) {
    this.trustedDocumentShells.set(document.metadata.id, {
      revision,
      shell: {
        version: document.version,
        metadata: { ...document.metadata },
        options: { ...document.options, enabledFactions: [...document.options.enabledFactions] },
      },
    });
  }

  private defaultStorageEventTarget(): StorageEventTarget | null {
    if (typeof window === "undefined" || !this.storage) return null;
    try {
      return this.storage === window.localStorage ? window : null;
    } catch {
      return null;
    }
  }

  private ensureCatalogCurrent() {
    const revision = revisionsFor(this.storage)?.catalog ?? 0;
    if (!this.catalogDirty && revision === this.observedCatalogRevision) return;
    this.catalog = emptyCatalog();
    this.catalogStored = false;
    this.readCatalog();
    this.observedCatalogRevision = revision;
    this.catalogDirty = false;
  }
}
