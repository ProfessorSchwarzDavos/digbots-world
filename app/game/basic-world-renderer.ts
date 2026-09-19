import * as THREE from "three";
import {
  buildBasicWorldGeometry,
  type BasicWorldGeometry,
  type BasicWorldGeometryRequest,
} from "./basic-world-geometry";
import { CHUNK_SIZE, type ChunkWorld, type WorldGenerationOptions } from "./world";

const REQUEST_INTERVAL_MS = 650;
const MAX_PROXY_TRIANGLES = 180_000;

export type BasicWorldRendererStats = Readonly<{
  supported: boolean;
  active: boolean;
  pausedForFramePressure: boolean;
  queued: number;
  oldestJobMilliseconds: number;
  requested: number;
  submitted: number;
  completed: number;
  failed: number;
  stale: number;
  cancelled: number;
  generationMilliseconds: number;
  uploadMilliseconds: number;
  triangles: number;
  vertices: number;
  drawCalls: number;
  bytes: number;
  ringCompleteness: number;
  transitions: number;
  adaptiveDowngrades: number;
}>;

export type BasicWorldRendererInput = Readonly<{
  world: ChunkWorld;
  seedText: string;
  generationOptions: WorldGenerationOptions;
  x: number;
  y: number;
  z: number;
  fullDistance: number;
  basicDistance: number;
  caveBlend: number;
  framePressure: boolean;
  enabled: boolean;
  now: number;
}>;

type WorkerResponse = Readonly<{ id: number; geometry: BasicWorldGeometry }>;

function geometryBytes(geometry: BasicWorldGeometry) {
  return geometry.surfacePositions.byteLength + geometry.surfaceColors.byteLength + geometry.surfaceIndices.byteLength
    + geometry.cavePositions.byteLength + geometry.caveColors.byteLength + geometry.caveIndices.byteLength;
}

function meshGeometry(positions: Float32Array, colors: Float32Array, indices: Uint32Array) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

/**
 * Purely presentational world silhouettes beyond the detailed chunk ring.
 * This owns no simulation state, never participates in raycasts, and keeps the
 * last completed mesh while its single worker prepares a replacement.
 */
export class BasicWorldRenderer {
  readonly group = new THREE.Group();
  private surface: THREE.Mesh | null = null;
  private caves: THREE.Mesh | null = null;
  private worker: Worker | null = null;
  private nextRequestId = 1;
  private pendingRequestId: number | null = null;
  private pendingKey: string | null = null;
  private pendingStartedAt = 0;
  private completedResult: Readonly<{ key: string; geometry: BasicWorldGeometry; receivedAt: number }> | null = null;
  private desiredKey: string | null = null;
  private installedKey: string | null = null;
  private generationOptionsReference: WorldGenerationOptions | null = null;
  private generationOptionsSignature = "";
  private lastRequestAt = -Infinity;
  private disposed = false;
  private locationOwner = "";
  private caveBlend = 0;
  private wasFramePressurePaused = false;
  private counters = {
    submitted: 0,
    completed: 0,
    failed: 0,
    stale: 0,
    cancelled: 0,
    generationMilliseconds: 0,
    uploadMilliseconds: 0,
    triangles: 0,
    vertices: 0,
    bytes: 0,
    transitions: 0,
    adaptiveDowngrades: 0,
  };

  constructor(workerEnabled = true) {
    this.group.name = "basic-world-proxies";
    this.group.matrixAutoUpdate = false;
    this.group.updateMatrix();
    if (workerEnabled) this.createWorker();
  }

  private createWorker() {
    if (typeof document === "undefined" || typeof Worker === "undefined" || this.disposed) return;
    try {
      this.worker = new Worker(new URL("./basic-world-worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.acceptWorkerResult(event.data);
      this.worker.onerror = () => {
        this.counters.failed += 1;
        this.pendingRequestId = null;
        this.pendingKey = null;
        this.pendingStartedAt = 0;
        this.worker?.terminate();
        this.worker = null;
      };
    } catch {
      this.worker = null;
    }
  }

  private cancelPendingWorker() {
    if (this.pendingRequestId === null) return;
    this.counters.cancelled += 1;
    this.pendingRequestId = null;
    this.pendingKey = null;
    this.pendingStartedAt = 0;
    this.worker?.terminate();
    this.worker = null;
    this.createWorker();
  }

  private acceptWorkerResult(response: WorkerResponse) {
    if (this.disposed || response.id !== this.pendingRequestId) {
      this.counters.stale += 1;
      return;
    }
    const key = this.pendingKey;
    this.pendingRequestId = null;
    this.pendingKey = null;
    this.pendingStartedAt = 0;
    if (!key || key !== this.desiredKey) {
      this.counters.stale += 1;
      return;
    }
    this.completedResult = Object.freeze({
      key,
      geometry: response.geometry,
      receivedAt: typeof performance === "undefined" ? Date.now() : performance.now(),
    });
  }

  private install(key: string, result: BasicWorldGeometry) {
    const triangleCount = (result.surfaceIndices.length + result.caveIndices.length) / 3;
    if (triangleCount > MAX_PROXY_TRIANGLES) {
      this.counters.failed += 1;
      return;
    }
    const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
    this.surface?.geometry.dispose();
    this.caves?.geometry.dispose();
    if (!this.surface) {
      const material = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      this.surface = new THREE.Mesh(new THREE.BufferGeometry(), material);
      this.surface.name = "basic-surface-proxy";
      this.surface.raycast = () => undefined;
      this.surface.frustumCulled = false;
      this.group.add(this.surface);
    }
    if (!this.caves) {
      const material = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: true });
      this.caves = new THREE.Mesh(new THREE.BufferGeometry(), material);
      this.caves.name = "basic-cave-proxy";
      this.caves.raycast = () => undefined;
      this.caves.frustumCulled = false;
      this.group.add(this.caves);
    }
    this.surface.geometry = meshGeometry(result.surfacePositions, result.surfaceColors, result.surfaceIndices);
    this.caves.geometry = meshGeometry(result.cavePositions, result.caveColors, result.caveIndices);
    if (this.installedKey && this.installedKey !== key) this.counters.transitions += 1;
    this.installedKey = key;
    this.counters.completed += 1;
    this.counters.generationMilliseconds = result.generationMilliseconds;
    this.counters.uploadMilliseconds = Math.max(0, (typeof performance === "undefined" ? Date.now() : performance.now()) - startedAt);
    this.counters.triangles = triangleCount;
    this.counters.vertices = (result.surfacePositions.length + result.cavePositions.length) / 3;
    this.counters.bytes = geometryBytes(result);
    this.applyVisibility();
  }

  private applyVisibility() {
    const cave = THREE.MathUtils.smoothstep(this.caveBlend, 0.28, 0.72);
    if (this.surface) this.surface.visible = this.group.visible && cave < 0.995 && this.surface.geometry.getAttribute("position")?.count > 0;
    if (this.caves) {
      this.caves.visible = this.group.visible && cave > 0.005 && this.caves.geometry.getAttribute("position")?.count > 0;
      (this.caves.material as THREE.MeshBasicMaterial).opacity = 0.72 + cave * 0.22;
    }
  }

  update(input: BasicWorldRendererInput) {
    if (this.disposed) return;
    const owner = `${input.world.locationScope.locationId}|${input.world.runtimeLocationEpoch}`;
    if (owner !== this.locationOwner) {
      this.resetLocation();
      this.locationOwner = owner;
    }
    const active = input.enabled && input.basicDistance > input.fullDistance;
    this.group.visible = active;
    this.caveBlend = input.caveBlend;
    this.applyVisibility();
    if (!active) return;

    // Two-chunk anchors prevent a worker rebuild every time the player crosses
    // one block-near chunk edge. Cave height only invalidates by broad layer.
    const centerChunkX = Math.floor(input.x / CHUNK_SIZE / 2) * 2;
    const centerChunkZ = Math.floor(input.z / CHUNK_SIZE / 2) * 2;
    const cameraLayer = Math.floor(input.y / 24);
    if (this.generationOptionsReference !== input.generationOptions) {
      this.generationOptionsReference = input.generationOptions;
      this.generationOptionsSignature = JSON.stringify(input.generationOptions);
    }
    const key = `${owner}|${input.seedText}|${this.generationOptionsSignature}|${centerChunkX},${centerChunkZ}|${input.fullDistance},${input.basicDistance}|${cameraLayer}`;
    this.desiredKey = key;
    if (this.completedResult && this.completedResult.key !== key) {
      this.counters.stale += 1;
      this.completedResult = null;
    }
    if (this.pendingKey && this.pendingKey !== key) this.cancelPendingWorker();
    if (input.framePressure && !this.wasFramePressurePaused) this.counters.adaptiveDowngrades += 1;
    this.wasFramePressurePaused = input.framePressure;
    if (this.completedResult && !input.framePressure) {
      const completed = this.completedResult;
      this.completedResult = null;
      this.install(completed.key, completed.geometry);
    }
    if (key === this.installedKey || key === this.pendingKey || this.completedResult || input.framePressure || input.now - this.lastRequestAt < REQUEST_INTERVAL_MS) return;

    const request: BasicWorldGeometryRequest = {
      seed: input.world.seed,
      centerChunkX,
      centerChunkZ,
      fullDistance: input.fullDistance,
      basicDistance: input.basicDistance,
      cameraY: cameraLayer * 24 + 12,
    };
    this.lastRequestAt = input.now;
    if (this.worker) {
      const id = this.nextRequestId++;
      this.pendingRequestId = id;
      this.pendingKey = key;
      this.pendingStartedAt = input.now;
      this.counters.submitted += 1;
      try {
        this.worker.postMessage({ id, seedText: input.seedText, generationOptions: input.generationOptions, request });
      } catch {
        this.pendingRequestId = null;
        this.pendingKey = null;
        this.pendingStartedAt = 0;
        this.counters.failed += 1;
      }
      return;
    }

    // Browser environments without module workers keep a bounded fallback.
    // It is skipped under frame pressure and never runs in agent mode.
    this.counters.submitted += 1;
    try {
      this.install(key, buildBasicWorldGeometry(request, (x, z) => input.world.sampleColumn(x, z)));
    } catch {
      this.counters.failed += 1;
    }
  }

  stats(framePressure = false): BasicWorldRendererStats {
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    return Object.freeze({
      supported: this.worker !== null || typeof document !== "undefined",
      active: this.group.visible,
      pausedForFramePressure: this.group.visible && framePressure,
      queued: this.pendingRequestId === null && this.completedResult === null ? 0 : 1,
      oldestJobMilliseconds: this.pendingRequestId !== null
        ? Math.max(0, now - this.pendingStartedAt)
        : this.completedResult ? Math.max(0, now - this.completedResult.receivedAt) : 0,
      requested: this.counters.submitted,
      ...this.counters,
      drawCalls: Number(Boolean(this.surface?.visible)) + Number(Boolean(this.caves?.visible)),
      ringCompleteness: this.desiredKey === null || this.installedKey === this.desiredKey ? 1 : this.installedKey ? 0.5 : 0,
    });
  }

  /** Release geometry and pending jobs immediately at an owner boundary. */
  resetLocation() {
    this.cancelPendingWorker();
    this.completedResult = null;
    this.desiredKey = this.installedKey = null;
    this.lastRequestAt = -Infinity;
    this.group.visible = false;
    for (const mesh of [this.surface, this.caves]) {
      mesh?.removeFromParent();
      mesh?.geometry.dispose();
      (mesh?.material as THREE.Material | undefined)?.dispose();
    }
    this.surface = this.caves = null;
    this.counters.bytes = this.counters.vertices = this.counters.triangles = 0;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.pendingRequestId !== null) this.counters.cancelled += 1;
    this.pendingRequestId = null;
    this.pendingStartedAt = 0;
    this.completedResult = null;
    this.worker?.terminate();
    this.worker = null;
    for (const mesh of [this.surface, this.caves]) {
      mesh?.geometry.dispose();
      (mesh?.material as THREE.Material | undefined)?.dispose();
      mesh?.removeFromParent();
    }
    this.surface = null;
    this.caves = null;
    this.group.removeFromParent();
  }
}
