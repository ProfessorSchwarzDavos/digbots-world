import type { GameMode, WorldSave } from "./engine";
import { universeId, type LocationId, type LocationStamp } from "./location-address";
import { cloneUniverseJson, isUniverseRecord, universeSha256 } from "./universe-json";
import { UniverseStorage, UniverseStorageError, type UniverseLoadedWorld, type UniverseManifest } from "./universe-storage";
import {
  LEGACY_WORLD_KEY, WORLD_CATALOG_KEY, WORLD_DATA_PREFIX, WORLD_OWNERSHIP_NOTICE,
  migrateLegacyWorldSave, normalizeWorldMetadata, normalizeWorldOptions,
  type CreateWorldInput, type SaveWorldInput, type StoredWorld, type WorldListOptions,
  type WorldMetadata, type WorldOptions, type WorldStorageIssue, type WorldStorageResult,
} from "./world-storage";
import { normalizeGameVersion } from "./version";

export type UniverseSaveStatus = Readonly<{
  phase: "opening" | "migrating" | "ready" | "loading" | "saving" | "saved" | "error";
  message: string;
}>;
type LegacyCandidate = Readonly<{ world: StoredWorld; sourceGeneratorVersion: number; backups: readonly { sourceKey: string; raw: string }[] }>;

function issue(error: unknown): WorldStorageIssue {
  const code = error instanceof UniverseStorageError ? error.code : "unavailable";
  return { code: code === "conflict" ? "unavailable" : code, message: error instanceof Error ? error.message : "Universe storage failed. No save success was recorded." };
}
function name(value: string | undefined, fallback: string): string {
  return (value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim().replace(/\s+/g, " ") || fallback).slice(0, 64);
}

/** Read-only legacy boundary. Never constructs the former writable catalog. */
export async function readLegacyUniverseCandidates(storage: Pick<Storage, "getItem"> | null): Promise<{ candidates: LegacyCandidate[]; issues: WorldStorageIssue[]; activeId: string | null }> {
  const candidates: LegacyCandidate[] = [], issues: WorldStorageIssue[] = [];
  if (!storage) return { candidates, issues, activeId: null };
  let catalogRaw: string | null = null, catalog: Record<string, unknown> | null = null;
  try {
    catalogRaw = storage.getItem(WORLD_CATALOG_KEY);
    if (catalogRaw) {
      const parsed: unknown = JSON.parse(catalogRaw);
      if (!isUniverseRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.worlds)) throw new Error("The old TypeScript catalog is invalid. Its exact source has not been changed.");
      catalog = parsed;
    }
  } catch (error) { issues.push(issue(error)); }
  for (const metadata of Array.isArray(catalog?.worlds) ? catalog.worlds : []) {
    try {
      if (!isUniverseRecord(metadata)) throw new Error("Invalid legacy catalog entry; source retained.");
      const id = universeId(metadata.id), key = `${WORLD_DATA_PREFIX}${id}`, raw = storage.getItem(key);
      if (!raw) throw new Error(`Legacy world ${String(metadata.name ?? id)} is missing its data. No source was changed.`);
      const value: unknown = JSON.parse(raw);
      if (!isUniverseRecord(value) || value.version !== 1 || !isUniverseRecord(value.save)) throw new Error("Unsupported old TypeScript world document; source retained.");
      const save = migrateLegacyWorldSave(value.save);
      if (!save) throw new Error("Legacy world save is invalid; source retained.");
      const normalized = normalizeWorldMetadata(metadata, { id, save, now: save.savedAt });
      if (!normalized || normalized.id !== id) throw new Error("Legacy world identity is invalid; source retained.");
      const sourceGeneratorVersion = Number(value.save.generatorVersion);
      const options = normalizeWorldOptions(sourceGeneratorVersion < 17
        ? { ...(isUniverseRecord(value.options) ? value.options : {}), settlementPattern: "legacy-scattered-v1" }
        : value.options as Partial<WorldOptions>);
      candidates.push({ world: { version: 1, metadata: { ...normalized, seed: save.seed, mode: save.mode }, options, save }, sourceGeneratorVersion,
        backups: [{ sourceKey: key, raw }, ...(catalogRaw ? [{ sourceKey: WORLD_CATALOG_KEY, raw: catalogRaw }] : [])] });
    } catch (error) { issues.push(issue(error)); }
  }
  // An already-consumed single-save fallback is not imported a second time.
  if (catalog?.legacyMigrated !== true) {
    try {
      const raw = storage.getItem(LEGACY_WORLD_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw), save = migrateLegacyWorldSave(parsed);
        if (!save || !isUniverseRecord(parsed)) throw new Error("Legacy single save is invalid; exact source retained.");
        const id = `legacy-${(await universeSha256(raw)).slice(0, 40)}`;
        const metadata = normalizeWorldMetadata({ id, name: `Legacy ${save.seed}`, lastPlayedAt: save.savedAt }, { id, save, now: save.savedAt })!;
        candidates.push({ world: { version: 1, metadata, options: normalizeWorldOptions({ settlementPattern: "legacy-scattered-v1" }), save }, sourceGeneratorVersion: Number(parsed.generatorVersion),
          backups: [{ sourceKey: LEGACY_WORLD_KEY, raw }, ...(catalogRaw ? [{ sourceKey: WORLD_CATALOG_KEY, raw: catalogRaw }] : [])] });
      }
    } catch (error) { issues.push(issue(error)); }
  }
  return { candidates, issues, activeId: typeof catalog?.activeWorldId === "string" ? catalog.activeWorldId : null };
}

/** Async player-facing facade. Only manifest metadata is cached across worlds. */
export class UniverseWorldStorage {
  readonly repository: UniverseStorage;
  readonly ready: Promise<boolean>;
  private manifests: UniverseManifest[] = [];
  private active: UniverseLoadedWorld | null = null;
  private selectedId: string | null = null;
  private diagnostics: WorldStorageIssue[] = [];
  private listeners = new Set<(status: UniverseSaveStatus) => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private writerConfirmed = false;
  private disposed = false;
  private status: UniverseSaveStatus = { phase: "opening", message: "Opening browser universe storage…" };

  constructor(legacyStorage: Pick<Storage, "getItem"> | null = null, repository = new UniverseStorage()) {
    this.repository = repository;
    this.ready = this.initialize(legacyStorage);
  }

  get ownershipNotice() { return WORLD_OWNERSHIP_NOTICE; }
  get issues() { return this.diagnostics.map((value) => ({ ...value })); }
  get activeWorldId() { return this.selectedId; }
  get currentStamp(): LocationStamp | null { return this.active ? { ...this.active.stamp } : null; }
  get currentManifest() { return this.active?.manifest ?? null; }
  get writerAuthorityValid() { return this.writerConfirmed && !!this.active?.lease && this.active.lease.expiresAt > Date.now(); }
  get currentStatus() { return { ...this.status }; }

  subscribe(listener: (status: UniverseSaveStatus) => void): () => void {
    this.listeners.add(listener); listener(this.currentStatus);
    return () => { this.listeners.delete(listener); };
  }

  private publish(phase: UniverseSaveStatus["phase"], message: string) {
    this.status = { phase, message };
    for (const listener of this.listeners) listener(this.currentStatus);
  }

  private async initialize(legacyStorage: Pick<Storage, "getItem"> | null): Promise<boolean> {
    try {
      const all = await this.repository.list(true), existing = new Set(all.map((entry) => entry.id as string));
      const legacy = await readLegacyUniverseCandidates(legacyStorage);
      this.diagnostics.push(...legacy.issues);
      for (const candidate of legacy.candidates) {
        if (existing.has(candidate.world.metadata.id)) continue;
        this.publish("migrating", `Backing up and migrating ${candidate.world.metadata.name}… Old source stays unchanged.`);
        try {
          const loaded = await this.repository.create(candidate.world, { transactionId: "legacy-migration-v1", backups: candidate.backups, sourceGeneratorVersion: candidate.sourceGeneratorVersion });
          existing.add(loaded.manifest.id);
        } catch (error) {
          // Concurrent initialization may have committed the same immutable input.
          this.diagnostics.push(issue(error));
        }
      }
      await this.refresh();
      this.selectedId = this.manifests.some((entry) => entry.id === legacy.activeId) ? legacy.activeId : this.listWorlds()[0]?.id ?? null;
      this.publish(this.diagnostics.length ? "error" : "ready", this.diagnostics.length ? this.diagnostics.map((value) => value.message).join(" ") : "Browser universe storage ready.");
      return true;
    } catch (error) {
      const problem = issue(error); this.diagnostics.push(problem); this.publish("error", problem.message); return false;
    }
  }

  async refresh(): Promise<void> { this.manifests = await this.repository.list(); }

  listWorlds(options: WorldListOptions = {}): WorldMetadata[] {
    const key = options.sortBy ?? "lastPlayedAt", factor = options.direction === "asc" ? 1 : -1;
    return this.manifests.map((entry) => ({ ...entry.metadata })).sort((a, b) => {
      const left = a[key], right = b[key];
      return (typeof left === "string" && typeof right === "string" ? left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }) : Number(left ?? -1) - Number(right ?? -1) || a.name.localeCompare(b.name)) * factor;
    });
  }

  setActiveWorld(id: string | null): WorldStorageResult<string | null> {
    if (id !== null && !this.manifests.some((entry) => entry.id === id)) return { ok: false, error: { code: "not-found", message: "That universe is not in this browser catalog." } };
    this.selectedId = id; return { ok: true, value: id };
  }

  private perform<T>(phase: UniverseSaveStatus["phase"], message: string, action: () => Promise<T>): Promise<WorldStorageResult<T>> {
    const run = async (): Promise<WorldStorageResult<T>> => {
      if (!await this.ready || this.disposed) return { ok: false, error: { code: "unavailable", message: this.status.message } };
      this.publish(phase, message);
      try {
        const value = await action();
        await this.refresh();
        this.publish(phase === "saving" ? "saved" : "ready", phase === "saving" ? "Checkpoint committed to this browser." : "Browser universe storage ready.");
        return { ok: true, value };
      } catch (error) { const problem = issue(error); this.publish("error", problem.message); return { ok: false, error: problem }; }
    };
    const result = this.queue.then(run, run); this.queue = result; return result;
  }

  private startHeartbeat() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => {
      const active = this.active;
      if (!active?.lease || this.disposed) return;
      void this.repository.renew(active.lease).then((lease) => {
        if (this.active?.manifest.id === active.manifest.id && this.active.lease?.epoch === lease.epoch) {
          this.active = { ...this.active, lease }; this.writerConfirmed = true;
        }
      }).catch((error) => {
        if (this.active?.manifest.id === active.manifest.id && this.active.lease?.epoch === active.lease?.epoch) this.writerConfirmed = false;
        this.publish("error", issue(error).message);
      });
    }, 5_000);
  }

  private async activate(id: string): Promise<UniverseLoadedWorld> {
    if (this.active && this.active.manifest.id !== id) throw new UniverseStorageError("conflict", "Save and close the current world before opening another.");
    const lease = await this.repository.acquire(universeId(id));
    try {
      const loaded = await this.repository.load(universeId(id), lease);
      if (loaded.manifest.deletedAt !== null) throw new UniverseStorageError("not-found", "This universe was removed from the catalog.");
      this.active = loaded; this.writerConfirmed = true; this.selectedId = id; this.startHeartbeat(); return loaded;
    } catch (error) { await this.repository.release(lease); throw error; }
  }

  private acceptLoadedCheckpoint(loaded: UniverseLoadedWorld): void {
    // Hashing/reading a large checkpoint can overlap heartbeat renewal. Its
    // returned lease is the captured input, not a newer lease read from IDB.
    // Never replace a confirmed renewal with that older expiry timestamp.
    const current = this.active?.lease, incoming = loaded.lease;
    const lease = current && incoming && current.id === incoming.id
      && current.owner === incoming.owner && current.epoch === incoming.epoch
      && current.expiresAt > incoming.expiresAt ? current : incoming;
    this.active = { ...loaded, ...(lease ? { lease } : {}) };
  }

  createWorld(input: CreateWorldInput & { id?: string }): Promise<WorldStorageResult<WorldMetadata>> {
    return this.perform("saving", "Creating the first durable home checkpoint…", async () => {
      if (this.active) throw new UniverseStorageError("conflict", "Save and close the current world before creating another.");
      const save = migrateLegacyWorldSave(input.save);
      if (!save) throw new UniverseStorageError("invalid", "The new world save is invalid.");
      const id = universeId(input.id ?? crypto.randomUUID()), now = Date.now();
      const metadata: WorldMetadata = { id, ownership: "host-device", name: name(input.name, save.seed), seed: save.seed, mode: save.mode, createdAt: now, updatedAt: now, lastPlayedAt: now, playTimeMs: 0, lastSavedGameVersion: normalizeGameVersion(save.lastSavedGameVersion) };
      await this.repository.create({ version: 1, metadata, options: normalizeWorldOptions(input.options), save }, { transactionId: crypto.randomUUID() });
      await this.activate(id); return metadata;
    });
  }

  loadWorld(id: string, touch = true): Promise<WorldStorageResult<StoredWorld>> {
    return this.perform("loading", "Verifying the committed home checkpoint…", async () => {
      const loaded = touch ? await this.activate(id) : await this.repository.load(universeId(id));
      return cloneUniverseJson(loaded.world);
    });
  }

  saveWorld(id: string, input: SaveWorldInput): Promise<WorldStorageResult<WorldMetadata>> {
    // Capture at call time; the live engine may continue ticking while queued.
    const captured = cloneUniverseJson(input);
    return this.perform("saving", "Saving a durable location checkpoint…", async () => {
      const active = this.active;
      if (!active?.lease || active.manifest.id !== id) throw new UniverseStorageError("conflict", "This session does not own that world.");
      const now = Date.now();
      const metadata: WorldMetadata = { ...active.world.metadata, mode: captured.save.mode, updatedAt: now, lastPlayedAt: captured.markPlayed === false ? active.world.metadata.lastPlayedAt : now,
        playTimeMs: Math.min(Number.MAX_SAFE_INTEGER, active.world.metadata.playTimeMs + Math.max(0, Math.trunc(captured.playTimeDeltaMs ?? 0))), lastSavedGameVersion: normalizeGameVersion(captured.save.lastSavedGameVersion) };
      const loaded = await this.repository.checkpoint(universeId(id), captured.save, active.manifest.revision, active.lease, { transactionId: crypto.randomUUID(), metadata,
        options: captured.options ? normalizeWorldOptions({ ...active.world.options, ...captured.options }) : active.world.options });
      this.acceptLoadedCheckpoint(loaded); return loaded.world.metadata;
    });
  }

  /** Test-only travel keeps the departing payload until the atomic commit. */
  transitionSyntheticLocation(destination: LocationId, save: WorldSave, initialSyntheticSave: WorldSave): Promise<WorldStorageResult<StoredWorld>> {
    const captured = cloneUniverseJson(save), initial = cloneUniverseJson(initialSyntheticSave);
    return this.perform("saving", "Committing the departing location and transferring player custody…", async () => {
      const active = this.active;
      if (!active?.lease || active.world.save.agentTestWorld !== true) throw new UniverseStorageError("invalid", "Synthetic travel requires an owned test-admin world.");
      const loaded = await this.repository.transition(active.manifest.id, captured, destination, active.manifest.revision, active.lease,
        { transactionId: crypto.randomUUID(), initialSyntheticSave: initial });
      this.acceptLoadedCheckpoint(loaded);
      return cloneUniverseJson(loaded.world);
    });
  }

  /** Caller must durably checkpoint first. No implicit unload-time save. */
  async releaseActive(): Promise<void> {
    await this.queue;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    const active = this.active;
    if (active?.lease) await this.repository.release(active.lease);
    this.active = null;
  }

  private edit(id: string, change: (world: StoredWorld) => StoredWorld): Promise<WorldStorageResult<WorldMetadata>> {
    return this.perform("saving", "Updating the committed world…", async () => {
      if (this.active?.manifest.id === id) throw new UniverseStorageError("conflict", "Save and quit before editing catalog rules.");
      const lease = await this.repository.acquire(universeId(id));
      try {
        const loaded = await this.repository.load(universeId(id), lease), next = change(cloneUniverseJson(loaded.world));
        const committed = await this.repository.checkpoint(universeId(id), next.save, loaded.manifest.revision, lease, { transactionId: crypto.randomUUID(), metadata: next.metadata, options: next.options });
        return committed.world.metadata;
      } finally { await this.repository.release(lease); }
    });
  }

  renameWorld(id: string, nextName: string) { return this.edit(id, (world) => ({ ...world, metadata: { ...world.metadata, name: name(nextName, "World"), updatedAt: Date.now() } })); }
  updateWorldMode(id: string, mode: GameMode) { return this.edit(id, (world) => ({ ...world, metadata: { ...world.metadata, mode, updatedAt: Date.now() }, save: { ...world.save, mode, ...(mode === "builder" ? { health: 10, hunger: 10 } : {}) } })); }

  duplicateWorld(id: string): Promise<WorldStorageResult<WorldMetadata>> {
    return this.perform("saving", "Copying all universe locations…", async () => {
      const archive = await this.repository.exportArchive(universeId(id));
      return (await this.repository.importArchive(archive, universeId(crypto.randomUUID()), crypto.randomUUID())).world.metadata;
    });
  }

  deleteWorld(id: string): Promise<WorldStorageResult<WorldMetadata>> {
    return this.perform("saving", "Removing world from the catalog; recovery records are retained…", async () => {
      if (this.active?.manifest.id === id) throw new UniverseStorageError("conflict", "Save and quit before removing this world.");
      const lease = await this.repository.acquire(universeId(id));
      try {
        const loaded = await this.repository.load(universeId(id));
        await this.repository.remove(universeId(id), lease, crypto.randomUUID());
        if (this.selectedId === id) this.selectedId = null;
        return loaded.world.metadata;
      } finally { await this.repository.release(lease); }
    });
  }

  exportWorld(id: string): Promise<WorldStorageResult<string>> { return this.perform("loading", "Verifying and exporting every location…", () => this.repository.exportArchive(universeId(id))); }

  importWorld(json: string): Promise<WorldStorageResult<WorldMetadata>> {
    return this.perform("saving", "Validating and importing a separate universe…", async () => {
      const parsed: unknown = JSON.parse(json), id = universeId(crypto.randomUUID());
      if (isUniverseRecord(parsed) && parsed.format === "blockwild-universe") return (await this.repository.importArchive(json, id, crypto.randomUUID())).world.metadata;
      if (!isUniverseRecord(parsed) || parsed.format !== "blockwild-world" || parsed.version !== 1 || !isUniverseRecord(parsed.world) || parsed.world.version !== 1 || !isUniverseRecord(parsed.world.save)) throw new UniverseStorageError("invalid", "Not a supported Blockwild world or universe archive.");
      const save = migrateLegacyWorldSave(parsed.world.save);
      if (!save) throw new UniverseStorageError("invalid", "The old world export is invalid.");
      save.agentWorldFingerprint = `worldfp_import_${id.replace(/-/g, "_")}`;
      const metadata = normalizeWorldMetadata({ ...(isUniverseRecord(parsed.world.metadata) ? parsed.world.metadata : {}), id }, { id, save, now: Date.now() })!;
      const options = normalizeWorldOptions(Number(parsed.world.save.generatorVersion) < 17 ? { ...(isUniverseRecord(parsed.world.options) ? parsed.world.options : {}), settlementPattern: "legacy-scattered-v1" } : parsed.world.options as Partial<WorldOptions>);
      return (await this.repository.create({ version: 1, metadata, options, save }, { transactionId: crypto.randomUUID(), sourceGeneratorVersion: Number(parsed.world.save.generatorVersion), backups: [{ sourceKey: `${WORLD_DATA_PREFIX}${id}`, raw: json }] })).world.metadata;
    });
  }

  async exportLegacyBackup(id: string): Promise<WorldStorageResult<string>> {
    return this.perform("loading", "Verifying exact legacy recovery strings…", async () => {
      const snapshot = await this.repository.snapshot(universeId(id));
      return JSON.stringify({ format: "blockwild-typescript-legacy-backup", version: 1, universeId: id, entries: snapshot.backups.map(({ sourceKey, raw, sha256 }) => ({ key: sourceKey, value: raw, sha256 })) }, null, 2);
    });
  }

  dispose() {
    this.disposed = true;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null; this.listeners.clear();
    // Unload cannot promise an async checkpoint. Leases expire naturally if
    // the page disappears; an explicit Save & Quit releases after commit.
    void this.queue.finally(() => this.repository.close()).catch(() => undefined);
  }
}
