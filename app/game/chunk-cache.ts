import type { StructureMarker } from "./structures";
import { TYPESCRIPT_TERRAIN_CACHE_DATABASE } from "./edition";

export type CachedChunkData = Readonly<{
  cacheKey: string;
  /** Exact reset-established producer contract. Older caches have no proof. */
  generationSource?: string | null;
  key: string;
  cx: number;
  cz: number;
  blocks: Uint16Array;
  heightmap: Int16Array;
  biomes: Uint8Array;
  sectionBlockCounts: Uint16Array;
  skyTops: Int16Array;
  light: Uint16Array;
  lightInitialized: boolean;
  lightIndices: readonly number[];
  leafIndices: readonly number[];
  /** Semantic POI/chest/spawn metadata owned by this chunk. */
  structureMarkers: readonly (readonly [string, StructureMarker])[];
}>;

const cloneStructureMarker = (marker: StructureMarker): StructureMarker => {
  const position = { ...marker.position };
  if (marker.type === "chest") return { ...marker, position, loot: marker.loot.map((entry) => ({ ...entry })) };
  if (marker.type === "spawn") return { ...marker, position, ...(marker.tags ? { tags: [...marker.tags] } : {}) };
  return { ...marker, position };
};

const cloneStructureMarkers = (entries: CachedChunkData["structureMarkers"]) => entries.map(
  ([key, marker]) => [key, cloneStructureMarker(marker)] as const,
);

const byteLengthOf = (chunk: CachedChunkData) => chunk.blocks.byteLength
  + chunk.heightmap.byteLength
  + chunk.biomes.byteLength
  + chunk.sectionBlockCounts.byteLength
  + chunk.skyTops.byteLength
  + chunk.light.byteLength
  + (chunk.lightIndices.length + chunk.leafIndices.length) * 8
  + JSON.stringify(chunk.structureMarkers).length * 2;

const cloneChunkData = (data: CachedChunkData): CachedChunkData => ({
  ...data,
  blocks: data.blocks.slice(),
  heightmap: data.heightmap.slice(),
  biomes: data.biomes.slice(),
  sectionBlockCounts: data.sectionBlockCounts.slice(),
  skyTops: data.skyTops.slice(),
  light: data.light.slice(),
  lightIndices: [...data.lightIndices],
  leafIndices: [...data.leafIndices],
  structureMarkers: cloneStructureMarkers(data.structureMarkers),
});

/** Byte-bounded LRU for recently unloaded chunks. Taking transfers ownership. */
export class ChunkMemoryCache {
  private entries = new Map<string, { data: CachedChunkData; bytes: number }>();
  private bytes = 0;
  hits = 0;
  misses = 0;
  evictions = 0;

  constructor(readonly maximumBytes = 64 * 1024 * 1024) {}

  get size() { return this.entries.size; }
  get byteLength() { return this.bytes; }
  has(cacheKey: string) { return this.entries.has(cacheKey); }

  clear() {
    this.entries.clear();
    this.bytes = 0;
  }

  set(data: CachedChunkData) {
    const bytes = byteLengthOf(data);
    const previous = this.entries.get(data.cacheKey);
    if (previous) this.bytes -= previous.bytes;
    this.entries.delete(data.cacheKey);
    if (bytes > this.maximumBytes) return false;
    this.entries.set(data.cacheKey, { data, bytes });
    this.bytes += bytes;
    while (this.bytes > this.maximumBytes) {
      const oldest = this.entries.entries().next().value as [string, { data: CachedChunkData; bytes: number }] | undefined;
      if (!oldest) break;
      this.entries.delete(oldest[0]);
      this.bytes -= oldest[1].bytes;
      this.evictions += 1;
    }
    return true;
  }

  take(cacheKey: string) {
    const entry = this.entries.get(cacheKey);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    this.entries.delete(cacheKey);
    this.bytes -= entry.bytes;
    this.hits += 1;
    return entry.data;
  }

  diagnostics() {
    return { entries: this.size, bytes: this.byteLength, hits: this.hits, misses: this.misses, evictions: this.evictions } as const;
  }
}

type PersistentRecord = CachedChunkData & Readonly<{ accessedAt: number }>;

const isPersistentRecord = (value: unknown, cacheKey: string): value is PersistentRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PersistentRecord>;
  return record.cacheKey === cacheKey
    && typeof record.key === "string"
    && typeof record.cx === "number"
    && Number.isInteger(record.cx)
    && typeof record.cz === "number"
    && Number.isInteger(record.cz)
    && record.blocks instanceof Uint16Array
    && record.heightmap instanceof Int16Array
    && record.biomes instanceof Uint8Array
    && record.sectionBlockCounts instanceof Uint16Array
    && record.skyTops instanceof Int16Array
    && record.light instanceof Uint16Array
    && typeof record.lightInitialized === "boolean"
    && Array.isArray(record.lightIndices)
    && record.lightIndices.every(Number.isInteger)
    && Array.isArray(record.leafIndices)
    && record.leafIndices.every(Number.isInteger)
    && Array.isArray(record.structureMarkers)
    && record.structureMarkers.every((entry) => Array.isArray(entry)
      && entry.length === 2
      && typeof entry[0] === "string"
      && Boolean(entry[1])
      && typeof entry[1] === "object"
      && (entry[1] as Partial<StructureMarker>).position !== undefined)
    && typeof record.accessedAt === "number"
    && Number.isFinite(record.accessedAt);
};

/** Best-effort IndexedDB tier. Failures never block or invalidate world play. */
export class ChunkPersistentCache {
  private databasePromise: Promise<IDBDatabase | null> | null = null;
  private writes = 0;
  readonly supported = typeof indexedDB !== "undefined";

  private database() {
    if (!this.supported) return Promise.resolve(null);
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve) => {
      const request = indexedDB.open(TYPESCRIPT_TERRAIN_CACHE_DATABASE, 1);
      request.onerror = () => resolve(null);
      request.onupgradeneeded = () => {
        const database = request.result;
        const store = database.createObjectStore("chunks", { keyPath: "cacheKey" });
        store.createIndex("accessedAt", "accessedAt");
      };
      request.onsuccess = () => resolve(request.result);
    });
    return this.databasePromise;
  }

  async get(cacheKey: string): Promise<CachedChunkData | undefined> {
    const database = await this.database();
    if (!database) return undefined;
    return new Promise((resolve) => {
      const transaction = database.transaction("chunks", "readonly");
      const request = transaction.objectStore("chunks").get(cacheKey);
      request.onerror = () => resolve(undefined);
      request.onsuccess = () => resolve(isPersistentRecord(request.result, cacheKey) ? request.result : undefined);
    });
  }

  async set(data: CachedChunkData) {
    const stable = cloneChunkData(data);
    const database = await this.database();
    if (!database) return false;
    const record: PersistentRecord = { ...stable, accessedAt: Date.now() };
    const stored = await new Promise<boolean>((resolve) => {
      const transaction = database.transaction("chunks", "readwrite");
      transaction.onerror = () => resolve(false);
      transaction.oncomplete = () => resolve(true);
      transaction.objectStore("chunks").put(record);
    });
    this.writes += 1;
    if (stored && this.writes % 16 === 0) void this.prune(256);
    return stored;
  }

  private async prune(maximumEntries: number) {
    const database = await this.database();
    if (!database) return;
    const records = await new Promise<PersistentRecord[]>((resolve) => {
      const request = database.transaction("chunks", "readonly").objectStore("chunks").getAll();
      request.onerror = () => resolve([]);
      request.onsuccess = () => resolve(request.result as PersistentRecord[]);
    });
    records.sort((left, right) => right.accessedAt - left.accessedAt);
    const stale = records.slice(maximumEntries);
    if (!stale.length) return;
    const transaction = database.transaction("chunks", "readwrite");
    for (const record of stale) transaction.objectStore("chunks").delete(record.cacheKey);
  }
}
