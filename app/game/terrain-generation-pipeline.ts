import type { StructureMarker } from "./structures";
import type { LocationStamp } from "./location-address";

export type TerrainGenerationRequest = Readonly<{
  namespace: string;
  seedText: string;
  locationScope?: LocationStamp;
  generationOptions: Readonly<Record<string, unknown>>;
  key: string;
  cx: number;
  cz: number;
  edits: readonly (readonly [number, number])[];
}>;

export type TerrainGenerationResult = Readonly<{
  namespace: string;
  key: string;
  cx: number;
  cz: number;
  blocks: Uint16Array;
  heightmap: Int16Array;
  biomes: Uint8Array;
  sectionBlockCounts: Uint16Array;
  skyTops: Int16Array;
  light: Uint16Array;
  lightIndices: readonly number[];
  leafIndices: readonly number[];
  /** Worker-side generation effects that cannot be reconstructed from voxels. */
  structureMarkers: readonly (readonly [string, StructureMarker])[];
}>;

const TERRAIN_WORKER_PROTOCOL = 1;
type WorkerResponse = Readonly<{ type: "ready"; protocol: number }>
  | Readonly<{ type: "result"; id: number; result: TerrainGenerationResult }>
  | Readonly<{ type: "task-error"; id: number; message: string }>;
type WorkerCallback = Readonly<{
  complete: (result: TerrainGenerationResult) => void;
  fail: () => void;
}>;
type Slot = { worker: Worker; ready: boolean; busy: boolean; currentId: number | null };

/** Reserves one of a bounded 2-4 worker graph for terrain-buffer merging. */
export function recommendedTerrainWorkerCount(
  logicalProcessors = typeof navigator === "undefined" ? 4 : navigator.hardwareConcurrency || 4,
  deviceMemoryGiB = typeof navigator === "undefined" ? 4 : Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4),
) {
  if (logicalProcessors <= 4 || deviceMemoryGiB <= 4) return 1;
  if (logicalProcessors <= 8 || deviceMemoryGiB <= 8) return 2;
  return 3;
}

/** Two workers keep a player-priority lane available without oversubscribing CPUs. */
export class TerrainGenerationPipeline {
  private slots: Slot[] = [];
  private nextId = 1;
  private callbacks = new Map<number, WorkerCallback>();
  submitted = 0;
  completed = 0;
  failed = 0;
  stale = 0;
  transferBytes = 0;
  restarts = 0;
  lastError: Readonly<{ message: string; filename: string | null; line: number | null; column: number | null; phase: "startup" | "task" }> | null = null;

  constructor(workerCount = recommendedTerrainWorkerCount(), private readonly maximumRestarts = 2) {
    if (typeof document === "undefined" || typeof Worker === "undefined") return;
    for (let index = 0; index < workerCount; index += 1) this.addWorker();
  }

  private addWorker() {
    try {
      const slot: Slot = {
        worker: new Worker(new URL("./terrain-generation-worker.ts", import.meta.url), { type: "module" }),
        ready: false,
        busy: false,
        currentId: null,
      };
      slot.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === "ready") {
          if (event.data.protocol !== TERRAIN_WORKER_PROTOCOL) {
            this.failSlot(slot, new Error(`Terrain worker protocol ${event.data.protocol} is incompatible with ${TERRAIN_WORKER_PROTOCOL}`));
            return;
          }
          slot.ready = true;
          return;
        }
        if (event.data.type === "task-error") {
          this.lastError = { message: event.data.message, filename: null, line: null, column: null, phase: "task" };
          const callback = this.callbacks.get(event.data.id);
          this.callbacks.delete(event.data.id);
          slot.busy = false;
          slot.currentId = null;
          if (callback) { this.failed += 1; callback.fail(); }
          return;
        }
        slot.busy = false;
        slot.currentId = null;
        const callback = this.callbacks.get(event.data.id);
        if (!callback) {
          this.stale += 1;
          return;
        }
        this.callbacks.delete(event.data.id);
        this.completed += 1;
        const result = event.data.result;
        this.transferBytes += result.blocks.byteLength + result.heightmap.byteLength + result.biomes.byteLength
          + result.sectionBlockCounts.byteLength + result.skyTops.byteLength + result.light.byteLength
          + JSON.stringify(result.structureMarkers).length * 2;
        callback.complete(result);
      };
      slot.worker.onerror = (event) => this.failSlot(slot, event);
      this.slots.push(slot);
    } catch (error) {
      this.lastError = { message: error instanceof Error ? error.message : String(error), filename: null, line: null, column: null, phase: "startup" };
      // Browser/CSP fallback remains the existing resumable main-thread path.
    }
  }

  private failSlot(slot: Slot, event: ErrorEvent | Error) {
    const failedId = slot.currentId;
    this.lastError = {
      message: event.message || "Terrain generation worker failed without an error message",
      filename: "filename" in event ? event.filename || null : null,
      line: "lineno" in event ? event.lineno || null : null,
      column: "colno" in event ? event.colno || null : null,
      phase: slot.ready ? "task" : "startup",
    };
    slot.busy = false;
    slot.currentId = null;
    slot.worker.terminate();
    this.slots = this.slots.filter((candidate) => candidate !== slot);
    if (failedId !== null) {
      const callback = this.callbacks.get(failedId);
      this.callbacks.delete(failedId);
      if (callback) { this.failed += 1; callback.fail(); }
    }
    if (this.restarts < this.maximumRestarts) {
      this.restarts += 1;
      this.addWorker();
    }
  }

  get supported() { return this.slots.length > 0; }
  get availableSlots() { return this.slots.filter((slot) => slot.ready && !slot.busy).length; }

  submit(
    request: TerrainGenerationRequest,
    complete: (result: TerrainGenerationResult) => void,
    fail: () => void = () => {},
  ) {
    const slot = this.slots.find((candidate) => candidate.ready && !candidate.busy);
    if (!slot) return false;
    const id = this.nextId++;
    slot.busy = true;
    slot.currentId = id;
    this.callbacks.set(id, { complete, fail });
    this.submitted += 1;
    try {
      slot.worker.postMessage({ id, request });
    } catch {
      slot.busy = false;
      slot.currentId = null;
      slot.worker.terminate();
      this.slots = this.slots.filter((candidate) => candidate !== slot);
      this.callbacks.delete(id);
      this.failed += 1;
      return false;
    }
    return true;
  }

  diagnostics() {
    return {
      supported: this.supported,
      workers: this.slots.length,
      busy: this.slots.filter((slot) => slot.busy).length,
      submitted: this.submitted,
      completed: this.completed,
      failed: this.failed,
      stale: this.stale,
      transferBytes: this.transferBytes,
      ready: this.slots.filter((slot) => slot.ready).length,
      restarts: this.restarts,
      lastError: this.lastError,
    } as const;
  }

  dispose() {
    for (const slot of this.slots) slot.worker.terminate();
    this.slots = [];
    this.callbacks.clear();
  }
}
