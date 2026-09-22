import type { WorldSave } from "./engine";
import { TYPESCRIPT_STORAGE_PREFIX } from "./edition";
import { catalogBody, createWaystarCatalog, validateCelestialCatalog, type CelestialCatalogSnapshot } from "./celestial-catalog";
import { homeLocation, locationId, parseLocationId, universeId, type LocationId, type LocationStamp, type UniverseId } from "./location-address";
import { assertExactKeys, canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord, universeSha256 } from "./universe-json";
import { encodeAttachmentSource, type AttachmentSourceValue } from "./attachment-source-preimage";
import { composeUniverseSave, splitUniverseSave, type SaveFields } from "./universe-save";
import { assertVehicleCommitReady, commitVehicleArrival, remapSpacefleetUniverse, validateSpacefleetSave, validateSpacefleetUniverse } from "./space-vehicle";
import { validateStationRegistrySave } from "./orbital-station";
import { validateStationFleetCustody } from "./station-runtime";
import { remapAsteroidFields, validateAsteroidFields } from "./asteroid-runtime";
import { captureAsteroidAttachmentCatalog, hydrateAsteroidAttachmentLocation, readAsteroidAttachmentCatalog, type AsteroidAttachmentCatalog } from "./asteroid-attachment-catalog";
import { remapLocationMetadata } from "./location-metadata-import";
import { generationOptionsFromWorldOptions, LEGACY_WORLD_KEY, normalizeWorldOptions, WORLD_CATALOG_KEY, WORLD_DATA_PREFIX, type StoredWorld, type WorldMetadata, type WorldOptions } from "./world-storage";

export const UNIVERSE_DATABASE = `${TYPESCRIPT_STORAGE_PREFIX}-universe-v1`;
export const UNIVERSE_SCHEMA = 1;
const STORES = ["manifests", "catalogs", "universeRecords", "locations", "locationRecords", "players", "transactions", "legacyBackups", "migrationReceipts", "leases"] as const;
type Store = typeof STORES[number];
type ExportStore = Exclude<Store, "leases">;
const EXPORT_STORES = STORES.filter((store): store is ExportStore => store !== "leases");
const LEASE_MS = 20_000;
export type UniverseStorageCode = "unavailable" | "quota" | "corrupt" | "not-found" | "conflict" | "invalid" | "unsupported-version";
export class UniverseStorageError extends Error {
  constructor(readonly code: UniverseStorageCode, message: string) { super(message); this.name = "UniverseStorageError"; }
}
export type UniverseManifest = Readonly<{
  id: UniverseId; universeId: UniverseId; schema: 1; edition: "typescript"; revision: number;
  seed: string; catalogDigest: string; currentLocationId: LocationId; currentPlayerId: string;
  metadata: WorldMetadata; options: WorldOptions; updatedAt: number; deletedAt: number | null;
}>;
export type UniverseLease = Readonly<{ id: UniverseId; universeId: UniverseId; owner: string; epoch: number; expiresAt: number }>;
export type LocationDescriptor = Readonly<{
  id: LocationId; universeId: UniverseId; revision: number; generationEpoch: number;
  synthetic?: true;
  generator: Readonly<{ seed: string; version: number; sourceVersion: number; profile: string; options: WorldOptions }>;
}>;
type CheckedRecord<T> = Readonly<{ id: string; universeId: UniverseId; data: T; sha256: string }>;
type ImportHistory = Readonly<{ sourceUniverseId: UniverseId; archiveDigest: string; journals: readonly UniverseJournal[]; receipts: readonly MigrationReceipt[] }>;
type UniverseData = Readonly<{ fields: SaveFields; extensions: SaveFields; importHistory?: readonly ImportHistory[];
  /** Repository-owned; never echoed through a flattened engine WorldSave. */
  attachmentOwners?: AsteroidAttachmentCatalog }>;
type PlayerData = Readonly<{ playerId: string; locationId: LocationId; fields: SaveFields; back: unknown | null; positions?: Readonly<Record<string, unknown>> }>;
export type LegacyBackup = Readonly<{ id: string; universeId: UniverseId; sourceKey: string; raw: string; sha256: string }>;
export type UniverseJournal = Readonly<{
  id: string; universeId: UniverseId; transactionId: string; kind: "create" | "migrate" | "checkpoint" | "transition" | "import" | "delete";
  expectedRevision: number | null; nextRevision: number; digest: string; intentDigest: string; state: "prepared" | "committed" | "aborted"; at: number;
}>;
type MigrationReceipt = Readonly<{ id: UniverseId; universeId: UniverseId; sourceDigest: string; transactionId: string; state: "committed" }>;
type WriteRecord = Readonly<{ store: ExportStore; value: Record<string, unknown> }>;
export type UniverseSnapshot = Readonly<{
  manifest: UniverseManifest; catalog: CelestialCatalogSnapshot; universe: UniverseData;
  locations: readonly { descriptor: LocationDescriptor; fields: SaveFields }[];
  players: readonly PlayerData[]; backups: readonly LegacyBackup[]; journals: readonly UniverseJournal[]; receipts: readonly MigrationReceipt[];
}>;
export type UniverseLoadedWorld = Readonly<{ world: StoredWorld; manifest: UniverseManifest; catalog: CelestialCatalogSnapshot; stamp: LocationStamp; lease: UniverseLease | null }>;
/** A verified read preimage, not a lease acquisition, pause or commit grant. */
export type UniverseAttachmentSource = Readonly<{
  snapshot: UniverseSnapshot; source: AttachmentSourceValue; lease: UniverseLease;
  /** The same pure composition used by load(), for comparing the cached base. */
  loaded: UniverseLoadedWorld;
}>;
export type VehicleLocationCommit = Readonly<{
  /** Stable flight identity, distinct from a retryable storage attempt. */
  transactionId: string;
  checkpointId: string;
  vehicleId: string;
  expectedVehicleRevision: number;
  landingPosition: [number, number, number];
  initialDestinationSave?: WorldSave;
}>;
export type UniverseFaultStage = "before-prepare" | "prepare-written" | "after-prepare" | "before-records" | "records-written" | "before-commit" | "after-commit";
export type UniverseStorageDependencies = Readonly<{
  indexedDB?: IDBFactory | null; now?: () => number; ownerId?: string;
  /** Synchronous failure injection, scoped to this repository instance. */
  fault?: (stage: UniverseFaultStage, transactionId: string) => void;
  /** Local test-admin harness only; normal CF1 players see home only. */
  allowSyntheticLocations?: boolean;
}>;

function failure(error: unknown): UniverseStorageError {
  if (error instanceof UniverseStorageError) return error;
  const name = (error as { name?: string })?.name;
  return new UniverseStorageError(name === "QuotaExceededError" ? "quota" : "unavailable", name === "QuotaExceededError"
    ? "Browser storage is full. Your last committed world is intact; export it or free space, then retry."
    : error instanceof Error ? error.message : "Universe storage is unavailable. No save success was recorded.");
}
function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(value.error); });
}
function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new DOMException("Universe transaction aborted.", "AbortError"));
    transaction.onerror = () => { /* onabort settles the transaction, not a request success. */ };
  });
}
function recordId(universe: UniverseId, kind: string, id: string): string { return JSON.stringify([universe, kind, id]); }
function integer(value: unknown, min = 0): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= min; }
function checkedId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_.:-]{1,160}$/.test(value)) throw new UniverseStorageError("invalid", "Invalid transaction/player identity.");
  return value;
}
function legacyKey(value: unknown): value is string { return typeof value === "string" && (value === LEGACY_WORLD_KEY || value === WORLD_CATALOG_KEY || value.startsWith(WORLD_DATA_PREFIX)); }
function validateAttachmentFleet(universe: UniverseData, id: UniverseId): void {
  if (universe.attachmentOwners === undefined) return;
  const owners = readAsteroidAttachmentCatalog(universe.attachmentOwners, validateAsteroidFields(universe.fields.asteroidFields, id), id);
  for (const owner of Object.values(owners.owners)) if (owner.fields.orbitalStations !== undefined)
    validateStationFleetCustody(validateStationRegistrySave(owner.fields.orbitalStations, owner.orbitId), validateSpacefleetSave(universe.fields.spacefleet));
}
function hydratedLocation(universe: UniverseData, id: LocationId, fields: SaveFields): SaveFields {
  if (universe.attachmentOwners === undefined) return fields;
  const asteroids = validateAsteroidFields(universe.fields.asteroidFields, parseLocationId(id).universeId);
  return hydrateAsteroidAttachmentLocation(universe.attachmentOwners, asteroids, id, fields);
}
function capturedLocation(universe: UniverseData, parts: ReturnType<typeof splitUniverseSave>, id: LocationId, admit = false) {
  const updated: UniverseData = { ...universe, fields: parts.universe, extensions: parts.extensions };
  if (universe.attachmentOwners === undefined && !admit) return { universe: updated, location: parts.location };
  const expectedUniverse = parseLocationId(id).universeId;
  const captured = captureAsteroidAttachmentCatalog(universe.attachmentOwners,
    validateAsteroidFields(universe.fields.asteroidFields, expectedUniverse), validateAsteroidFields(parts.universe.asteroidFields, expectedUniverse),
    id, parts.location, parts.extensions, admit);
  const withOwners = { ...updated, attachmentOwners: captured.catalog };
  validateAttachmentFleet(withOwners, expectedUniverse);
  return { universe: withOwners, location: captured.location };
}
async function checked<T>(id: string, universe: UniverseId, data: T): Promise<CheckedRecord<T>> {
  const copy = cloneUniverseJson(data);
  return { id, universeId: universe, data: copy, sha256: await universeSha256(canonicalJson(copy)) };
}
async function verify<T>(value: CheckedRecord<T> | undefined, id: string, universe: UniverseId): Promise<T> {
  if (!value || value.id !== id || value.universeId !== universe || await universeSha256(canonicalJson(value.data)) !== value.sha256) {
    throw new UniverseStorageError("corrupt", "Universe record checksum or owner mismatch. Export the retained backup before recovery.");
  }
  return cloneUniverseJson(value.data);
}

/** Real IndexedDB is the sole durable authority; no localStorage fallback writes. */
export class UniverseStorage {
  private database: Promise<IDBDatabase> | null = null;
  readonly ownerId: string;
  private readonly factory: IDBFactory | null;
  private readonly now: () => number;
  private readonly fault?: UniverseStorageDependencies["fault"];
  private readonly allowSyntheticLocations: boolean;

  constructor(dependencies: UniverseStorageDependencies = {}) {
    this.factory = dependencies.indexedDB === undefined ? globalThis.indexedDB ?? null : dependencies.indexedDB;
    this.ownerId = checkedId(dependencies.ownerId ?? globalThis.crypto?.randomUUID?.() ?? `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    this.now = dependencies.now ?? Date.now;
    this.fault = dependencies.fault;
    this.allowSyntheticLocations = dependencies.allowSyntheticLocations === true;
  }

  private open(): Promise<IDBDatabase> {
    if (this.database) return this.database;
    this.database = new Promise<IDBDatabase>((resolve, reject) => {
      if (!this.factory) { reject(new UniverseStorageError("unavailable", "IndexedDB is unavailable. Export old data or enable browser storage; no legacy data was changed.")); return; }
      const operation = this.factory.open(UNIVERSE_DATABASE, UNIVERSE_SCHEMA);
      let rejected = false;
      operation.onupgradeneeded = () => {
        const db = operation.result;
        for (const name of STORES) {
          const store = db.createObjectStore(name, { keyPath: "id" });
          store.createIndex("universeId", "universeId", { unique: false });
        }
      };
      operation.onerror = () => reject(failure(operation.error));
      operation.onblocked = () => { rejected = true; reject(new UniverseStorageError("conflict", "Close another Blockwild tab before upgrading universe storage.")); };
      operation.onsuccess = () => {
        const db = operation.result;
        if (rejected) { db.close(); return; }
        db.onversionchange = () => { db.close(); this.database = null; };
        resolve(db);
      };
    }).catch((error) => { this.database = null; throw error; });
    return this.database;
  }

  async close(): Promise<void> { const db = this.database; this.database = null; if (db) (await db).close(); }

  private async transaction<T>(stores: readonly Store[], mode: IDBTransactionMode, body: (transaction: IDBTransaction) => Promise<T>): Promise<T> {
    const db = await this.open();
    // Hashes and all non-IDB asynchronous work must finish before this point.
    const transaction = db.transaction([...stores], mode, mode === "readwrite" ? { durability: "strict" } : undefined);
    const done = transactionDone(transaction);
    // Attach immediately; an abort may arrive before an awaited request rejects.
    void done.catch(() => undefined);
    try {
      const result = await body(transaction);
      await done;
      return result;
    } catch (error) {
      try { transaction.abort(); } catch { /* already settled */ }
      await done.catch(() => undefined);
      throw failure(error);
    }
  }

  async list(includeDeleted = false): Promise<UniverseManifest[]> {
    const values = await this.transaction(["manifests"], "readonly", (tx) => request(tx.objectStore("manifests").getAll()));
    return values.map((value) => this.validateManifest(value)).filter((value) => includeDeleted || value.deletedAt === null);
  }

  private validateManifest(value: unknown): UniverseManifest {
    if (!isUniverseRecord(value) || value.schema !== 1 || value.edition !== "typescript") throw new UniverseStorageError("unsupported-version", "Unsupported universe schema or edition.");
    assertExactKeys(value, ["id", "universeId", "schema", "edition", "revision", "seed", "catalogDigest", "currentLocationId", "currentPlayerId", "metadata", "options", "updatedAt", "deletedAt"], "Universe manifest");
    const id = universeId(value.id);
    if (value.universeId !== id || !integer(value.revision, 1) || typeof value.seed !== "string" || !value.seed
      || typeof value.catalogDigest !== "string" || !/^[0-9a-f]{64}$/.test(value.catalogDigest)
      || !isUniverseRecord(value.metadata) || value.metadata.id !== id || !isUniverseRecord(value.options)
      || !integer(value.updatedAt) || value.deletedAt !== null && !integer(value.deletedAt) || parseLocationId(value.currentLocationId).universeId !== id) {
      throw new UniverseStorageError("corrupt", "Invalid universe manifest or current-location custody.");
    }
    checkedId(value.currentPlayerId);
    const metadata = value.metadata as Record<string, unknown>;
    if (metadata.ownership !== "host-device" || typeof metadata.name !== "string" || !metadata.name || metadata.name.length > 64
      || metadata.seed !== value.seed || !["survival", "builder"].includes(String(metadata.mode)) || !integer(metadata.createdAt)
      || !integer(metadata.updatedAt) || !integer(metadata.playTimeMs) || metadata.lastPlayedAt !== null && !integer(metadata.lastPlayedAt)
      || typeof metadata.lastSavedGameVersion !== "string" || canonicalJson(normalizeWorldOptions(value.options as Partial<WorldOptions>)) !== canonicalJson(value.options)) {
      throw new UniverseStorageError("corrupt", "Invalid universe metadata or options.");
    }
    return cloneUniverseJson(value) as unknown as UniverseManifest;
  }

  async acquire(id: UniverseId): Promise<UniverseLease> {
    universeId(id);
    return this.transaction(["manifests", "leases"], "readwrite", async (tx) => {
      if (!await request(tx.objectStore("manifests").get(id))) throw new UniverseStorageError("not-found", "Universe not found.");
      const store = tx.objectStore("leases");
      const previous = await request(store.get(id)) as UniverseLease | undefined;
      if (previous && previous.owner !== this.ownerId && previous.expiresAt > this.now()) throw new UniverseStorageError("conflict", "This world is open in another tab. Close it before taking control; your save is unchanged.");
      const lease: UniverseLease = { id, universeId: id, owner: this.ownerId, epoch: previous?.owner === this.ownerId && previous.expiresAt > this.now() ? previous.epoch : (previous?.epoch ?? 0) + 1, expiresAt: this.now() + LEASE_MS };
      await request(store.put(lease));
      return lease;
    });
  }

  async renew(lease: UniverseLease): Promise<UniverseLease> {
    return this.transaction(["leases"], "readwrite", async (tx) => {
      const store = tx.objectStore("leases"), current = await request(store.get(lease.id)) as UniverseLease | undefined;
      this.assertLease(current, lease);
      const next = { ...current!, expiresAt: this.now() + LEASE_MS };
      await request(store.put(next)); return next;
    });
  }

  async release(lease: UniverseLease): Promise<void> {
    await this.transaction(["leases"], "readwrite", async (tx) => {
      const store = tx.objectStore("leases"), current = await request(store.get(lease.id)) as UniverseLease | undefined;
      if (current?.owner === this.ownerId && current.owner === lease.owner && current.epoch === lease.epoch) await request(store.put({ ...current, expiresAt: 0 }));
    });
  }

  private assertLease(current: UniverseLease | undefined, expected: UniverseLease): void {
    if (!current || current.owner !== this.ownerId || current.owner !== expected.owner || current.epoch !== expected.epoch || current.expiresAt <= this.now()) {
      throw new UniverseStorageError("conflict", "World ownership changed or expired. Reopen the committed world before retrying; unsaved progress can be exported.");
    }
  }

  private async readRecords(tx: IDBTransaction, id: UniverseId): Promise<Map<ExportStore, Record<string, unknown>[]>> {
    return new Map(await Promise.all(EXPORT_STORES.map(async (store) => [store,
      await request(tx.objectStore(store).index("universeId").getAll(id)) as Record<string, unknown>[]] as const)));
  }

  private async records(id: UniverseId): Promise<Map<ExportStore, Record<string, unknown>[]>> {
    universeId(id);
    return this.transaction(EXPORT_STORES, "readonly", tx => this.readRecords(tx, id));
  }

  private async decode(records: Map<ExportStore, Record<string, unknown>[]>, id: UniverseId, partial = false): Promise<UniverseSnapshot> {
    const all = (store: ExportStore) => records.get(store) ?? [];
    const only = (store: ExportStore) => { const rows = all(store); if (rows.length !== 1) throw new UniverseStorageError("corrupt", `Universe requires exactly one ${store} record.`); return rows[0]; };
    if (!all("manifests").length) throw new UniverseStorageError("not-found", "Universe not found.");
    for (const values of records.values()) for (const value of values) if (value.universeId !== id || typeof value.id !== "string") throw new UniverseStorageError("corrupt", "Foreign universe record.");
    const manifest = this.validateManifest(only("manifests"));
    const catalogRecord = only("catalogs") as unknown as CheckedRecord<CelestialCatalogSnapshot>;
    const catalog = validateCelestialCatalog(await verify(catalogRecord, id, id));
    if (manifest.catalogDigest !== catalogRecord.sha256) throw new UniverseStorageError("corrupt", "Catalog manifest checksum mismatch.");
    const universe = await verify(only("universeRecords") as unknown as CheckedRecord<UniverseData>, id, id);
    if (universe.fields.spacefleet !== undefined) validateSpacefleetUniverse(validateSpacefleetSave(universe.fields.spacefleet), id);
    if (universe.fields.asteroidFields !== undefined) validateAsteroidFields(universe.fields.asteroidFields, id);
    validateAttachmentFleet(universe, id);
    if (universe.importHistory !== undefined) {
      if (!Array.isArray(universe.importHistory)) throw new UniverseStorageError("corrupt", "Invalid import provenance.");
      for (const history of universe.importHistory) {
        universeId(history.sourceUniverseId);
        if (!/^[0-9a-f]{64}$/.test(history.archiveDigest) || !Array.isArray(history.journals) || !Array.isArray(history.receipts)
          || history.journals.some((journal: UniverseJournal) => journal.universeId !== history.sourceUniverseId)
          || history.receipts.some((receipt: MigrationReceipt) => receipt.universeId !== history.sourceUniverseId)) throw new UniverseStorageError("corrupt", "Invalid imported audit ownership.");
      }
    }
    const locationRows = all("locations") as unknown as LocationDescriptor[];
    const dataRows = all("locationRecords") as unknown as CheckedRecord<SaveFields>[];
    if (!locationRows.length || locationRows.length !== dataRows.length) throw new UniverseStorageError("corrupt", "Incomplete location inventory.");
    const locations = await Promise.all(locationRows.map(async (descriptor) => {
      const address = parseLocationId(descriptor.id);
      if (address.universeId !== id || !integer(descriptor.revision) || !integer(descriptor.generationEpoch, 1)
        || !isUniverseRecord(descriptor.generator) || !integer(descriptor.generator.version, 1)
        || !integer(descriptor.generator.sourceVersion, 1) || typeof descriptor.generator.seed !== "string" || !isUniverseRecord(descriptor.generator.options)) throw new UniverseStorageError("corrupt", "Invalid location descriptor.");
      catalogBody(catalog, address);
      const fields = await verify(dataRows.find((row) => row.id === descriptor.id), descriptor.id, id);
      const hydrated = hydratedLocation(universe, descriptor.id, fields);
      if (hydrated.orbitalStations !== undefined) validateStationFleetCustody(validateStationRegistrySave(hydrated.orbitalStations, descriptor.id), validateSpacefleetSave(universe.fields.spacefleet));
      if (fields.seed !== descriptor.generator.seed || fields.generatorVersion !== descriptor.generator.version || (fields.generatorProfile ?? "world-below-v15") !== descriptor.generator.profile) throw new UniverseStorageError("corrupt", "Location data differs from captured generator contract.");
      return { descriptor, fields };
    }));
    if (!partial && universe.attachmentOwners && Object.keys(universe.attachmentOwners.owners).some(owner => !locations.some(entry => entry.descriptor.id === owner)))
      throw new UniverseStorageError("corrupt", "Attachment owner references a missing orbital location.");
    const players = await Promise.all((all("players") as unknown as CheckedRecord<PlayerData>[]).map(async (row) => {
      const data = await verify(row, recordId(id, "player", checkedId(row.data?.playerId)), id);
      if (data.positions !== undefined) {
        if (!isUniverseRecord(data.positions)) throw new UniverseStorageError("corrupt", "Invalid player location poses.");
        for (const [locationId, pose] of Object.entries(data.positions)) if (parseLocationId(locationId).universeId !== id || !partial && !locations.some((entry) => entry.descriptor.id === locationId) || !isUniverseRecord(pose) || ![pose.x, pose.y, pose.z, pose.yaw, pose.pitch].every((value) => typeof value === "number" && Number.isFinite(value))) throw new UniverseStorageError("corrupt", "Foreign, missing or invalid remembered player pose.");
      }
      const location = locations.find((entry) => entry.descriptor.id === data.locationId);
      if (!location) throw new UniverseStorageError("corrupt", "Player custody references a missing location.");
      composeUniverseSave({ universe: universe.fields, extensions: universe.extensions, location: hydratedLocation(universe, location.descriptor.id, location.fields), player: data.fields });
      return data;
    }));
    if (!players.some((player) => player.playerId === manifest.currentPlayerId && player.locationId === manifest.currentLocationId)) throw new UniverseStorageError("corrupt", "Manifest/player location disagreement.");
    const backups = all("legacyBackups") as unknown as LegacyBackup[];
    for (const backup of backups) if (typeof backup.raw !== "string" || !legacyKey(backup.sourceKey) || backup.id !== recordId(id, "legacy", backup.sourceKey) || await universeSha256(backup.raw) !== backup.sha256) throw new UniverseStorageError("corrupt", "Retained legacy backup failed exact-byte verification.");
    const journals = all("transactions") as unknown as UniverseJournal[];
    for (const journal of journals) if (journal.id !== recordId(id, "transaction", checkedId(journal.transactionId)) || !["prepared", "committed", "aborted"].includes(journal.state)
      || !["create", "migrate", "checkpoint", "transition", "import", "delete"].includes(journal.kind) || !integer(journal.nextRevision, 1)
      || journal.expectedRevision !== null && !integer(journal.expectedRevision, 1) || journal.nextRevision !== (journal.expectedRevision ?? 0) + 1
      || !/^[0-9a-f]{64}$/.test(journal.digest) || !/^[0-9a-f]{64}$/.test(journal.intentDigest) || !integer(journal.at)) throw new UniverseStorageError("corrupt", "Invalid transaction journal.");
    const receipts = all("migrationReceipts") as unknown as MigrationReceipt[];
    for (const receipt of receipts) {
      if (receipt.id !== id || receipt.state !== "committed" || !backups.length || !journals.some((journal) => journal.transactionId === receipt.transactionId && journal.state === "committed")) throw new UniverseStorageError("corrupt", "Incomplete migration receipt.");
      if (await universeSha256(canonicalJson(backups.map(({ sourceKey, sha256 }) => ({ sourceKey, sha256 })).sort((a, b) => a.sourceKey.localeCompare(b.sourceKey)))) !== receipt.sourceDigest) throw new UniverseStorageError("corrupt", "Migration source checksum mismatch.");
    }
    return { manifest, catalog, universe, locations, players, backups, journals, receipts };
  }

  async snapshot(id: UniverseId): Promise<UniverseSnapshot> { return this.decode(await this.records(id), id); }

  /** Inactive locations, players and the writer lease are observed in ONE
   * readonly transaction. Hash verification happens afterward; the returned
   * preimage does not claim that authority stayed current during that await.
   * No recovery, save or lease renewal is performed. Unsupported local-frame
   * hydration remains refused by the existing decoder. */
  async snapshotAttachmentSource(id: UniverseId, expected: UniverseLease): Promise<UniverseAttachmentSource> {
    universeId(id);
    const validateLease = (value: unknown): UniverseLease => {
      encodeAttachmentSource(value);
      if (!isUniverseRecord(value)) throw new UniverseStorageError("conflict", "Attachment source lacks a writer lease.");
      assertExactKeys(value, ["id", "universeId", "owner", "epoch", "expiresAt"], "Attachment lease");
      if (value.id !== id || value.universeId !== id || typeof value.owner !== "string" || !value.owner
        || !integer(value.epoch, 1) || !integer(value.expiresAt)) throw new UniverseStorageError("corrupt", "Invalid attachment writer lease.");
      return cloneUniverseJson(value) as UniverseLease;
    };
    const expectedLease = validateLease(expected);
    const observed = await this.transaction(STORES, "readonly", async tx => {
      const [records, rawLease] = await Promise.all([this.readRecords(tx, id), request(tx.objectStore("leases").get(id))]);
      const lease = validateLease(rawLease); this.assertLease(lease, expectedLease);
      if (lease.expiresAt < expectedLease.expiresAt) throw new UniverseStorageError("conflict", "Attachment writer lease moved backward.");
      return { records, lease };
    });
    // Keep the raw IDB observation, not merely decoded/normalized JSON. Routine
    // same-owner epoch-preserving lease renewal is deliberately separate.
    const raw = EXPORT_STORES.map(store => [store, observed.records.get(store)]);
    const source = encodeAttachmentSource(raw);
    // decode/verify uses canonical JSON. A read-only attachment proposal must
    // refuse before that boundary if it would erase own undefined, negative
    // zero or other raw evidence. Ordinary loading/recovery is unchanged.
    if (JSON.stringify(source) !== JSON.stringify(encodeAttachmentSource(cloneUniverseJson(raw))))
      throw new UniverseStorageError("corrupt", "Attachment repository raw data requires lossy normalization.");
    const snapshot = await this.decode(observed.records, id);
    if (snapshot.manifest.deletedAt !== null || snapshot.journals.some(journal => journal.state === "prepared"))
      throw new UniverseStorageError("conflict", "Finish pending universe transactions before attachment source capture.");
    return freezeUniverseJson({ snapshot, source, lease: observed.lease, loaded: this.loadedFromSnapshot(snapshot, observed.lease) });
  }

  /** Reinspection is still a read preimage, not an atomic write barrier. The
   * eventual journal must bind current source/revision and lease at commit. */
  async assertAttachmentSourceUnchanged(source: UniverseAttachmentSource): Promise<void> {
    const current = await this.snapshotAttachmentSource(source.snapshot.manifest.id, source.lease);
    if (JSON.stringify(current.source) !== JSON.stringify(source.source))
      throw new UniverseStorageError("conflict", "Stale attachment repository source.");
  }

  /** Normal loads/checkpoints do not materialize dormant payloads or raw backups. */
  private async currentSnapshot(id: UniverseId, transactionId?: string, extraLocation?: LocationId): Promise<UniverseSnapshot> {
    universeId(id);
    const records = await this.transaction(["manifests", "catalogs", "universeRecords", "locations", "locationRecords", "players", "transactions"], "readonly", async (tx) => {
      const stored = await request(tx.objectStore("manifests").get(id));
      if (!stored) throw new UniverseStorageError("not-found", "Universe not found.");
      const manifest = this.validateManifest(stored);
      const map = new Map<ExportStore, Record<string, unknown>[]>([["manifests", [manifest]]]);
      const locationIds = [...new Set([manifest.currentLocationId, ...(extraLocation ? [extraLocation] : [])])];
      const reads: Promise<void>[] = [];
      const add = (store: ExportStore, key: string) => {
        reads.push(request(tx.objectStore(store).get(key)).then((value) => { if (value) { const rows = map.get(store) ?? []; rows.push(value); map.set(store, rows); } }));
      };
      add("catalogs", id); add("universeRecords", id);
      add("players", recordId(id, "player", manifest.currentPlayerId));
      for (const location of locationIds) { add("locations", location); add("locationRecords", location); }
      if (transactionId) add("transactions", recordId(id, "transaction", transactionId));
      await Promise.all(reads); return map;
    });
    return this.decode(records, id, true);
  }

  async load(id: UniverseId, lease: UniverseLease | null = null): Promise<UniverseLoadedWorld> {
    return this.loadedFromSnapshot(await this.currentSnapshot(id), lease);
  }

  private loadedFromSnapshot(snapshot: UniverseSnapshot, lease: UniverseLease | null): UniverseLoadedWorld {
    const { manifest } = snapshot;
    const location = snapshot.locations.find((entry) => entry.descriptor.id === manifest.currentLocationId)!;
    const player = snapshot.players.find((entry) => entry.playerId === manifest.currentPlayerId)!;
    const save = composeUniverseSave({ universe: snapshot.universe.fields, extensions: snapshot.universe.extensions,
      location: hydratedLocation(snapshot.universe, location.descriptor.id, location.fields), player: player.fields });
    return { world: { version: 1, metadata: cloneUniverseJson(manifest.metadata), options: cloneUniverseJson(manifest.options), save }, manifest, catalog: snapshot.catalog,
      stamp: { locationId: manifest.currentLocationId, epoch: lease?.epoch ?? location.descriptor.generationEpoch, revision: location.descriptor.revision }, lease };
  }

  /** Route quotes read the actual destination revision, never a client claim. */
  async describeLocation(id: UniverseId, destination: LocationId): Promise<{ stamp: LocationStamp; spawn: { x: number; y: number; z: number } | null }> {
    if (parseLocationId(destination).universeId !== id) throw new UniverseStorageError("invalid", "Destination belongs to another universe.");
    const snapshot = await this.currentSnapshot(id, undefined, destination);
    const target = snapshot.locations.find(entry => entry.descriptor.id === destination);
    return { stamp: { locationId: destination, epoch: target?.descriptor.generationEpoch ?? 1, revision: target?.descriptor.revision ?? 0 },
      spawn: target ? cloneUniverseJson(target.fields.spawn) as { x: number; y: number; z: number } : null };
  }

  private async execute(id: UniverseId, transactionId: string, kind: UniverseJournal["kind"], expectedRevision: number | null, writes: readonly WriteRecord[], lease: UniverseLease | null, backups: readonly LegacyBackup[] = [], intentDigest?: string): Promise<number> {
    checkedId(transactionId);
    const digest = await universeSha256(canonicalJson(writes));
    const journalId = recordId(id, "transaction", transactionId), nextRevision = (expectedRevision ?? 0) + 1;
    const journal: UniverseJournal = { id: journalId, universeId: id, transactionId, kind, expectedRevision, nextRevision, digest, intentDigest: intentDigest ?? digest, state: "prepared", at: this.now() };
    const guard = async (tx: IDBTransaction) => {
      const current = await request(tx.objectStore("manifests").get(id)) as UniverseManifest | undefined;
      if ((current?.revision ?? null) !== expectedRevision) throw new UniverseStorageError("conflict", "Another checkpoint changed this world. Reopen before retrying; no previous data was overwritten.");
      if (expectedRevision !== null) {
        if (!lease) throw new UniverseStorageError("conflict", "A writer lease is required.");
        this.assertLease(await request(tx.objectStore("leases").get(id)), lease);
      }
    };
    this.fault?.("before-prepare", transactionId);
    const already = await this.transaction(["manifests", "leases", "transactions", "legacyBackups"], "readwrite", async (tx) => {
      const store = tx.objectStore("transactions"), prior = await request(store.get(journalId)) as UniverseJournal | undefined;
      if (prior) {
        if (prior.digest !== digest || prior.intentDigest !== journal.intentDigest || prior.kind !== kind || prior.expectedRevision !== expectedRevision) throw new UniverseStorageError("conflict", "Transaction ID was reused with different content.");
        if (prior.state === "committed") return true;
        if (prior.state === "aborted") throw new UniverseStorageError("conflict", "This transaction was recovered as aborted; create a new action ID.");
      }
      await guard(tx);
      for (const backup of backups) {
        const previous = await request(tx.objectStore("legacyBackups").get(backup.id)) as LegacyBackup | undefined;
        if (previous && (previous.raw !== backup.raw || previous.sha256 !== backup.sha256)) throw new UniverseStorageError("conflict", "Legacy source changed; immutable backup was not overwritten.");
        if (!previous) await request(tx.objectStore("legacyBackups").add(backup));
      }
      await request(store.put(prior ?? journal)); this.fault?.("prepare-written", transactionId); return false;
    });
    if (already) return nextRevision;
    this.fault?.("after-prepare", transactionId);
    await this.transaction(STORES, "readwrite", async (tx) => {
      const currentJournal = await request(tx.objectStore("transactions").get(journalId)) as UniverseJournal;
      if (currentJournal?.state === "committed" && currentJournal.digest === digest) return;
      await guard(tx);
      if (!currentJournal || currentJournal.state !== "prepared" || currentJournal.digest !== digest) throw new UniverseStorageError("conflict", "Prepared transaction changed.");
      for (const backup of backups) {
        const readback = await request(tx.objectStore("legacyBackups").get(backup.id)) as LegacyBackup;
        if (!readback || readback.raw !== backup.raw || readback.sha256 !== backup.sha256) throw new UniverseStorageError("corrupt", "Legacy backup readback failed; migration stopped.");
      }
      this.fault?.("before-records", transactionId);
      for (const write of writes) await request(tx.objectStore(write.store).put(write.value));
      this.fault?.("records-written", transactionId);
      await request(tx.objectStore("transactions").put({ ...currentJournal, state: "committed" }));
      this.fault?.("before-commit", transactionId);
    });
    this.fault?.("after-commit", transactionId);
    return nextRevision;
  }

  async create(world: StoredWorld, input: { transactionId: string; backups?: readonly { sourceKey: string; raw: string }[]; sourceGeneratorVersion?: number } ): Promise<UniverseLoadedWorld> {
    const id = universeId(world.metadata.id), address = homeLocation(id), home = locationId(address);
    const catalog = createWaystarCatalog(world.options.dayLengthMinutes), parts = splitUniverseSave(world.save);
    composeUniverseSave(parts);
    if (world.save.spacefleet !== undefined) validateSpacefleetUniverse(world.save.spacefleet, id);
    if (world.save.asteroidFields !== undefined) validateAsteroidFields(world.save.asteroidFields, id);
    if (world.save.orbitalStations !== undefined) validateStationRegistrySave(world.save.orbitalStations, home);
    const catalogRecord = await checked(id, id, catalog);
    const backups = await Promise.all((input.backups ?? []).map(async ({ sourceKey, raw }): Promise<LegacyBackup> => {
      if (!legacyKey(sourceKey) || typeof raw !== "string") throw new UniverseStorageError("invalid", "Only explicit TypeScript legacy world source strings may be migrated.");
      return { id: recordId(id, "legacy", sourceKey), universeId: id, sourceKey, raw, sha256: await universeSha256(raw) };
    }));
    if (new Set(backups.map((backup) => backup.id)).size !== backups.length) throw new UniverseStorageError("invalid", "Duplicate legacy backup key.");
    const descriptor: LocationDescriptor = { id: home, universeId: id, revision: 1, generationEpoch: 1, generator: { seed: world.save.seed, version: world.save.generatorVersion, sourceVersion: input.sourceGeneratorVersion ?? world.save.generatorVersion, profile: world.save.generatorProfile ?? "world-below-v15", options: cloneUniverseJson(world.options) } };
    const manifest: UniverseManifest = { id, universeId: id, schema: 1, edition: "typescript", revision: 1, seed: world.save.seed, catalogDigest: catalogRecord.sha256, currentLocationId: home, currentPlayerId: "host", metadata: cloneUniverseJson(world.metadata), options: cloneUniverseJson(world.options), updatedAt: world.metadata.updatedAt, deletedAt: null };
    this.validateManifest(manifest);
    const writes: WriteRecord[] = [
      { store: "manifests", value: manifest }, { store: "catalogs", value: catalogRecord }, { store: "locations", value: descriptor },
      { store: "universeRecords", value: await checked(id, id, { fields: parts.universe, extensions: parts.extensions }) },
      { store: "locationRecords", value: await checked(home, id, parts.location) },
      { store: "players", value: await checked(recordId(id, "player", "host"), id, { playerId: "host", locationId: home, fields: parts.player, back: null }) },
    ];
    if (backups.length) writes.push({ store: "migrationReceipts", value: { id, universeId: id, sourceDigest: await universeSha256(canonicalJson(backups.map(({ sourceKey, sha256 }) => ({ sourceKey, sha256 })).sort((a, b) => a.sourceKey.localeCompare(b.sourceKey)))), transactionId: input.transactionId, state: "committed" } });
    await this.execute(id, input.transactionId, backups.length ? "migrate" : "create", null, writes, null, backups);
    return this.load(id);
  }

  async checkpoint(id: UniverseId, save: WorldSave, expectedRevision: number, lease: UniverseLease,
    input: { transactionId: string; metadata?: WorldMetadata; options?: WorldOptions; admitOrbitAttachments?: boolean }): Promise<UniverseLoadedWorld> {
    if (input.admitOrbitAttachments !== undefined && typeof input.admitOrbitAttachments !== "boolean")
      throw new UniverseStorageError("invalid", "Invalid attachment admission intent.");
    const snapshot = await this.currentSnapshot(id, input.transactionId), { manifest } = snapshot;
    const intentDigest = await universeSha256(canonicalJson({ checkpoint: 1, save, metadata: input.metadata ?? null,
      options: input.options ?? null, admitOrbitAttachments: input.admitOrbitAttachments === true }));
    // Bind the original request, not a reconstructed view whose voxel ordering
    // can differ. Older checkpoints stored their write digest as intentDigest.
    const old = snapshot.journals.find((journal) => journal.transactionId === input.transactionId && journal.state === "committed");
    if (old && old.kind === "checkpoint" && old.expectedRevision === expectedRevision && manifest.revision === old.nextRevision) {
      const current = await this.load(id, lease);
      if (old.intentDigest !== intentDigest) {
        if (old.intentDigest !== old.digest || input.admitOrbitAttachments === true)
          throw new UniverseStorageError("conflict", "Committed action retried with different content.");
        if (canonicalJson(current.world.save) !== canonicalJson(save)) throw new UniverseStorageError("conflict", "Committed action retried with different state.");
        if (input.metadata && canonicalJson(input.metadata) !== canonicalJson(current.world.metadata) || input.options && canonicalJson(input.options) !== canonicalJson(current.world.options)) throw new UniverseStorageError("conflict", "Committed action retried with different metadata.");
      }
      return current;
    }
    if (manifest.revision !== expectedRevision) throw new UniverseStorageError("conflict", "Checkpoint revision is stale.");
    const location = snapshot.locations.find((entry) => entry.descriptor.id === manifest.currentLocationId)!;
    if (save.seed !== location.descriptor.generator.seed || save.generatorVersion !== location.descriptor.generator.version || (save.generatorProfile ?? "world-below-v15") !== location.descriptor.generator.profile) throw new UniverseStorageError("invalid", "A checkpoint cannot change the captured terrain generator.");
    const parts = splitUniverseSave(save); composeUniverseSave(parts);
    if (save.spacefleet !== undefined) validateSpacefleetUniverse(save.spacefleet, id);
    if (save.asteroidFields !== undefined) validateAsteroidFields(save.asteroidFields, id);
    if (save.orbitalStations !== undefined) validateStationRegistrySave(save.orbitalStations, manifest.currentLocationId);
    const captured = capturedLocation(snapshot.universe, parts, manifest.currentLocationId, input.admitOrbitAttachments === true);
    const metadata = cloneUniverseJson(input.metadata ?? manifest.metadata), options = cloneUniverseJson(input.options ?? manifest.options);
    if (metadata.id !== id) throw new UniverseStorageError("invalid", "Metadata cannot change universe identity.");
    const profile = location.descriptor.generator.profile as WorldSave["generatorProfile"];
    if (canonicalJson(generationOptionsFromWorldOptions(options, profile)) !== canonicalJson(generationOptionsFromWorldOptions(location.descriptor.generator.options, profile))) throw new UniverseStorageError("invalid", "Checkpoint options cannot rewrite the captured terrain generator.");
    const writes: WriteRecord[] = [
      { store: "manifests", value: this.validateManifest({ ...manifest, revision: expectedRevision + 1, metadata, options, updatedAt: save.savedAt }) },
      { store: "locations", value: { ...location.descriptor, revision: location.descriptor.revision + 1 } },
      { store: "universeRecords", value: await checked(id, id, captured.universe) },
      { store: "locationRecords", value: await checked(manifest.currentLocationId, id, captured.location) },
      { store: "players", value: await checked(recordId(id, "player", manifest.currentPlayerId), id, { ...snapshot.players.find((player) => player.playerId === manifest.currentPlayerId)!, fields: parts.player }) },
    ];
    await this.execute(id, input.transactionId, "checkpoint", expectedRevision, writes, lease, [], intentDigest);
    return this.load(id, lease);
  }

  /** Checkpoint origin and move singular player custody in one committed transaction. */
  async transition(id: UniverseId, originSave: WorldSave, destination: LocationId, expectedRevision: number, lease: UniverseLease,
    input: { transactionId: string; initialSyntheticSave?: WorldSave }): Promise<UniverseLoadedWorld> {
    if (!this.allowSyntheticLocations) throw new UniverseStorageError("invalid", "Location travel is not available in this phase.");
    return this.transitionCheckpoint(id, originSave, destination, expectedRevision, lease, input);
  }

  /** Production ship arrival uses the same journal and atomic stores as CF1.
   * The reserved ship must already be durable; this does not authorize launch. */
  async transitionVehicle(id: UniverseId, originSave: WorldSave, destination: LocationId, expectedRevision: number, lease: UniverseLease,
    input: VehicleLocationCommit): Promise<UniverseLoadedWorld> {
    return this.transitionCheckpoint(id, originSave, destination, expectedRevision, lease,
      { transactionId: input.checkpointId, initialSyntheticSave: input.initialDestinationSave }, input);
  }

  private async transitionCheckpoint(id: UniverseId, originSave: WorldSave, destination: LocationId, expectedRevision: number, lease: UniverseLease,
    input: { transactionId: string; initialSyntheticSave?: WorldSave }, vehicleCommit?: VehicleLocationCommit): Promise<UniverseLoadedWorld> {
    const snapshot = await this.currentSnapshot(id, input.transactionId, destination), { manifest } = snapshot, address = parseLocationId(destination);
    if (address.universeId !== id) throw new UniverseStorageError("invalid", "Cannot transfer custody to another universe.");
    catalogBody(snapshot.catalog, address);
    const intentDigest = await universeSha256(canonicalJson({ originSave, destination, initialSyntheticSave: input.initialSyntheticSave ?? null,
      ...(vehicleCommit ? { vehicleCommit } : {}) }));
    const prior = snapshot.journals.find((journal) => journal.transactionId === input.transactionId && journal.state === "committed");
    if (prior) {
      if (prior.kind !== "transition" || prior.intentDigest !== intentDigest || prior.expectedRevision !== expectedRevision || manifest.revision !== prior.nextRevision || manifest.currentLocationId !== destination) throw new UniverseStorageError("conflict", "Transition ID was reused.");
      return this.load(id, lease);
    }
    if (manifest.revision !== expectedRevision || manifest.currentLocationId === destination) throw new UniverseStorageError("conflict", "Invalid or stale location transition.");
    const origin = snapshot.locations.find((entry) => entry.descriptor.id === manifest.currentLocationId)!;
    if (originSave.seed !== origin.descriptor.generator.seed || originSave.generatorVersion !== origin.descriptor.generator.version || (originSave.generatorProfile ?? "world-below-v15") !== origin.descriptor.generator.profile) throw new UniverseStorageError("invalid", "Origin generator changed.");
    const parts = splitUniverseSave(originSave); composeUniverseSave(parts);
    if (originSave.spacefleet !== undefined) validateSpacefleetUniverse(originSave.spacefleet, id);
    if (originSave.asteroidFields !== undefined) validateAsteroidFields(originSave.asteroidFields, id);
    if (originSave.orbitalStations !== undefined) validateStationRegistrySave(originSave.orbitalStations, manifest.currentLocationId);
    const captured = capturedLocation(snapshot.universe, parts, manifest.currentLocationId);
    let target = snapshot.locations.find((entry) => entry.descriptor.id === destination);
    if (!target) {
      if (captured.universe.attachmentOwners?.owners[destination]) throw new UniverseStorageError("corrupt", "Attachment destination row is missing.");
      if (!input.initialSyntheticSave) throw new UniverseStorageError("not-found", "Destination checkpoint does not exist.");
      const initial = input.initialSyntheticSave, initialParts = splitUniverseSave(initial); composeUniverseSave(initialParts);
      if (initial.orbitalStations !== undefined) validateStationRegistrySave(initial.orbitalStations, destination);
      target = { descriptor: { id: destination, universeId: id, revision: 0, generationEpoch: 1, ...(!vehicleCommit ? { synthetic: true as const } : {}),
        generator: { seed: initial.seed, version: initial.generatorVersion, sourceVersion: initial.generatorVersion, profile: initial.generatorProfile ?? "world-below-v15", options: cloneUniverseJson(manifest.options) } }, fields: initialParts.location };
    }
    const player = snapshot.players.find((entry) => entry.playerId === manifest.currentPlayerId)!;
    const positions = { ...player.positions, [manifest.currentLocationId]: parts.player.player };
    const remembered = positions[destination];
    let pose = remembered ?? { ...(target.fields.spawn as object), yaw: 0, pitch: 0 };
    let universeFields = parts.universe;
    if (vehicleCommit) {
      const fleet = validateSpacefleetSave(parts.universe.spacefleet);
      const durableFleet = validateSpacefleetSave(snapshot.universe.fields.spacefleet);
      if (canonicalJson(fleet) !== canonicalJson(durableFleet)) throw new UniverseStorageError("conflict", "Checkpoint the reserved vehicle before committing arrival.");
      const vehicle = fleet.vehicles[vehicleCommit.vehicleId], trip = vehicle?.trip;
      if (!vehicle || !trip || vehicle.revision !== vehicleCommit.expectedVehicleRevision
        || vehicle.locationId !== manifest.currentLocationId || trip.origin !== manifest.currentLocationId || trip.destination !== destination
        || trip.originStamp.epoch > lease.epoch || trip.originStamp.revision > origin.descriptor.revision
        || trip.destinationStamp.epoch !== target.descriptor.generationEpoch || trip.destinationStamp.revision !== target.descriptor.revision) {
        throw new UniverseStorageError("conflict", "Vehicle, origin or destination changed; retain the ship and revalidate the route.");
      }
      assertVehicleCommitReady(vehicle, vehicleCommit.transactionId, trip.originStamp, trip.destinationStamp);
      const arrived = commitVehicleArrival(vehicle, { transactionId: vehicleCommit.transactionId, originStamp: trip.originStamp,
        destinationStamp: trip.destinationStamp, position: vehicleCommit.landingPosition, actionId: input.transactionId });
      universeFields = { ...parts.universe, spacefleet: { schema: 1, vehicles: { ...fleet.vehicles, [vehicle.vehicleId]: arrived } } };
      const [x, y, z] = vehicleCommit.landingPosition;
      pose = { x, y, z, yaw: 0, pitch: 0 };
    }
    const playerFields = { ...parts.player, player: pose };
    const transitUniverse: UniverseData = { ...captured.universe, fields: universeFields };
    validateAttachmentFleet(transitUniverse, id);
    composeUniverseSave({ universe: universeFields, extensions: parts.extensions,
      location: hydratedLocation(transitUniverse, destination, target.fields), player: playerFields });
    const writes: WriteRecord[] = [
      { store: "manifests", value: { ...manifest, revision: expectedRevision + 1, currentLocationId: destination, updatedAt: originSave.savedAt } },
      { store: "universeRecords", value: await checked(id, id, transitUniverse) },
      { store: "locations", value: { ...origin.descriptor, revision: origin.descriptor.revision + 1 } },
      { store: "locationRecords", value: await checked(origin.descriptor.id, id, captured.location) },
      { store: "locations", value: vehicleCommit ? { ...target.descriptor, revision: target.descriptor.revision + 1 } : target.descriptor },
      { store: "locationRecords", value: await checked(destination, id, target.fields) },
      { store: "players", value: await checked(recordId(id, "player", player.playerId), id, { ...player, locationId: destination, fields: playerFields, positions }) },
    ];
    await this.execute(id, input.transactionId, "transition", expectedRevision, writes, lease, [], intentDigest);
    return this.load(id, lease);
  }

  /** Explicit recovery never guesses a partially written destination into existence. */
  async recover(id: UniverseId, lease: UniverseLease): Promise<number> {
    await this.snapshot(id); // Verify committed state before changing recovery markers.
    return this.transaction(["transactions", "leases"], "readwrite", async (tx) => {
      this.assertLease(await request(tx.objectStore("leases").get(id)), lease);
      const store = tx.objectStore("transactions"), journals = await request(store.index("universeId").getAll(id)) as UniverseJournal[];
      const pending = journals.filter((journal) => journal.state === "prepared");
      for (const journal of pending) await request(store.put({ ...journal, state: "aborted" }));
      return pending.length;
    });
  }

  /** Catalog removal retains all shards/backups for explicit recovery/export. */
  async remove(id: UniverseId, lease: UniverseLease, transactionId: string): Promise<void> {
    const { manifest } = await this.currentSnapshot(id);
    if (manifest.deletedAt !== null) return;
    await this.execute(id, transactionId, "delete", manifest.revision, [{ store: "manifests", value: { ...manifest, revision: manifest.revision + 1, deletedAt: this.now() } }], lease);
  }

  async exportArchive(id: UniverseId): Promise<string> {
    const records = await this.records(id); await this.decode(records, id);
    const entries = await Promise.all(EXPORT_STORES.flatMap((store) => (records.get(store) ?? []).map(async (value) => ({ store, key: String(value.id), value, sha256: await universeSha256(canonicalJson(value)) }))));
    entries.sort((a, b) => a.store.localeCompare(b.store) || a.key.localeCompare(b.key));
    const body = { format: "blockwild-universe", version: 1, edition: "typescript", universeId: id, exportedAt: this.now(), entries };
    return JSON.stringify({ ...body, sha256: await universeSha256(canonicalJson(body)) });
  }

  async importArchive(text: string, newId: UniverseId, transactionId: string): Promise<UniverseLoadedWorld> {
    if (new TextEncoder().encode(text).byteLength > 256 * 1024 * 1024) throw new UniverseStorageError("invalid", "Universe archive exceeds the 256 MiB import limit.");
    let parsed: unknown; try { parsed = JSON.parse(text); } catch { throw new UniverseStorageError("invalid", "Universe archive is not valid JSON."); }
    if (!isUniverseRecord(parsed) || parsed.format !== "blockwild-universe" || parsed.version !== 1 || parsed.edition !== "typescript" || !Array.isArray(parsed.entries)) throw new UniverseStorageError("unsupported-version", "Unsupported universe archive.");
    assertExactKeys(parsed, ["format", "version", "edition", "universeId", "exportedAt", "entries", "sha256"], "Universe archive");
    if (!integer(parsed.exportedAt)) throw new UniverseStorageError("invalid", "Invalid archive timestamp.");
    const { sha256, ...body } = parsed;
    if (await universeSha256(canonicalJson(body)) !== sha256) throw new UniverseStorageError("corrupt", "Universe archive checksum failed.");
    const oldId = universeId(parsed.universeId); universeId(newId);
    if (oldId === newId) throw new UniverseStorageError("invalid", "Import requires a new universe identity; it never replaces an existing world.");
    const records = new Map<ExportStore, Record<string, unknown>[]>(), seen = new Set<string>();
    for (const raw of parsed.entries) {
      if (!isUniverseRecord(raw) || !EXPORT_STORES.includes(raw.store as ExportStore) || !isUniverseRecord(raw.value) || raw.key !== raw.value.id || raw.value.universeId !== oldId || await universeSha256(canonicalJson(raw.value)) !== raw.sha256) throw new UniverseStorageError("corrupt", "Invalid archive entry/checksum/owner.");
      const key = JSON.stringify([raw.store, raw.key]); if (seen.has(key)) throw new UniverseStorageError("corrupt", "Duplicate archive entry."); seen.add(key);
      const rows = records.get(raw.store as ExportStore) ?? []; rows.push(raw.value); records.set(raw.store as ExportStore, rows);
    }
    const snapshot = await this.decode(records, oldId);
    const remap = (id: LocationId): LocationId => locationId({ ...parseLocationId(id), universeId: newId });
    const catalogRecord = await checked(newId, newId, snapshot.catalog);
    const manifest: UniverseManifest = { ...snapshot.manifest, id: newId, universeId: newId, revision: 1, currentLocationId: remap(snapshot.manifest.currentLocationId), metadata: { ...snapshot.manifest.metadata, id: newId, name: `${snapshot.manifest.metadata.name} (imported)`.slice(0, 64) }, updatedAt: parsed.exportedAt, deletedAt: null };
    // Historical journals are retained as provenance, never replayed as actions
    // in the new universe. Its authoritative history begins at this import.
    const importedUniverse: UniverseData = { ...snapshot.universe, fields: { ...snapshot.universe.fields,
      ...(snapshot.universe.fields.spacefleet !== undefined ? { spacefleet: remapSpacefleetUniverse(validateSpacefleetSave(snapshot.universe.fields.spacefleet), oldId, newId) } : {}),
      ...(snapshot.universe.fields.asteroidFields !== undefined ? { asteroidFields: remapAsteroidFields(snapshot.universe.fields.asteroidFields, oldId, newId) } : {}),
      agentWorldFingerprint: `worldfp_import_${newId.replace(/[^A-Za-z0-9_-]/g, "_")}` }, importHistory: [...snapshot.universe.importHistory ?? [], { sourceUniverseId: oldId, archiveDigest: String(sha256), journals: snapshot.journals, receipts: snapshot.receipts }] };
    let importedOwners: AsteroidAttachmentCatalog | undefined;
    if (snapshot.universe.attachmentOwners !== undefined) {
      const originalOwners = readAsteroidAttachmentCatalog(snapshot.universe.attachmentOwners, validateAsteroidFields(snapshot.universe.fields.asteroidFields, oldId), oldId);
      importedOwners = readAsteroidAttachmentCatalog({ schema: 1, owners: Object.fromEntries(Object.values(originalOwners.owners).map(owner => {
        if (owner.epoch === Number.MAX_SAFE_INTEGER) throw new UniverseStorageError("invalid", "Attachment owner epoch exhausted.");
        const orbitId = remap(owner.orbitId);
        return [orbitId, { ...owner, orbitId, epoch: owner.epoch + 1, revision: 0, fields: remapLocationMetadata(owner.fields, owner.orbitId, newId) }];
      })) }, validateAsteroidFields(importedUniverse.fields.asteroidFields, newId), newId);
    }
    const universeWithOwners = { ...importedUniverse, ...(importedOwners ? { attachmentOwners: importedOwners } : {}) };
    validateAttachmentFleet(universeWithOwners, newId);
    const writes: WriteRecord[] = [{ store: "manifests", value: manifest }, { store: "catalogs", value: catalogRecord }, { store: "universeRecords", value: await checked(newId, newId, universeWithOwners) }];
    for (const { descriptor, fields } of snapshot.locations) {
      const id = remap(descriptor.id);
      const imported = remapLocationMetadata(fields, descriptor.id, newId);
      writes.push({ store: "locations", value: { ...descriptor, id, universeId: newId } }, { store: "locationRecords", value: await checked(id, newId, imported) });
    }
    for (const player of snapshot.players) writes.push({ store: "players", value: await checked(recordId(newId, "player", player.playerId), newId, { ...player, locationId: remap(player.locationId), ...(player.positions ? { positions: Object.fromEntries(Object.entries(player.positions).map(([id, pose]) => [remap(id as LocationId), pose])) } : {}) }) });
    // Exact source strings remain unchanged, including their historical source keys.
    const backups = snapshot.backups.map((backup) => ({ ...backup, id: recordId(newId, "legacy", backup.sourceKey), universeId: newId }));
    if (backups.length) writes.push({ store: "migrationReceipts", value: { id: newId, universeId: newId, sourceDigest: await universeSha256(canonicalJson(backups.map(({ sourceKey, sha256 }) => ({ sourceKey, sha256 })).sort((a, b) => a.sourceKey.localeCompare(b.sourceKey)))), transactionId, state: "committed" } });
    await this.execute(newId, transactionId, "import", null, writes, null, backups);
    return this.load(newId);
  }
}
