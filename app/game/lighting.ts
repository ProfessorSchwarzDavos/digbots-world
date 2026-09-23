import type { BlockDefinition, BlockId } from "./data";

export const MAX_LIGHT_LEVEL = 15;
export const LIGHT_CHANNEL_COUNT = 4;

export const enum LightChannel {
  Blue = 0,
  Green = 1,
  Red = 2,
  Sky = 3,
}

export type VoxelLightLevels = Readonly<{
  sky: number;
  red: number;
  green: number;
  blue: number;
}>;

export type VoxelLightChunk = {
  cx: number;
  cz: number;
  blocks: Uint16Array;
  light: Uint16Array;
  lightInitialized: boolean;
};

export type VoxelLightEngineOptions = Readonly<{
  chunkSize: number;
  minY: number;
  maxY: number;
  sectionHeight?: number;
  getChunk(cx: number, cz: number): VoxelLightChunk | undefined;
  getDefinition(type: BlockId): BlockDefinition | undefined;
  markLightDirty(x: number, y: number, z: number): void;
}>;

export type LightBlockChange = Readonly<{
  x: number;
  y: number;
  z: number;
  previous: BlockId;
  next: BlockId;
}>;

export type VoxelLightInitializationTask = {
  chunk: VoxelLightChunk;
  phase: "seed" | "scan" | "boundary" | "propagate" | "complete";
  /**
   * Boundary reconciliation mutates an already-present light field and must
   * refresh affected section attributes as propagation advances. A complete
   * chunk rebuild starts from zero, so exposing its intermediate writes would
   * briefly paint a moving dark front across otherwise unchanged land.
   */
  markDirtyDuringPropagation: boolean;
  cursor: number;
  queueX: number[];
  queueY: number[];
  queueZ: number[];
  queueHead: number;
  queued: Set<string>;
};

type LocatedLight = {
  chunk: VoxelLightChunk;
  index: number;
};

const DIRECTIONS = Object.freeze([
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
] as const);

const clampLevel = (value: number) => Math.max(0, Math.min(MAX_LIGHT_LEVEL, Math.round(value)));

export function lightChannel(packed: number, channel: LightChannel) {
  return (packed >>> (channel * 4)) & 0xf;
}

export function withLightChannel(packed: number, channel: LightChannel, level: number) {
  const shift = channel * 4;
  return ((packed & ~(0xf << shift)) | (clampLevel(level) << shift)) & 0xffff;
}

export function packVoxelLight(levels: VoxelLightLevels) {
  return (
    clampLevel(levels.blue)
    | (clampLevel(levels.green) << 4)
    | (clampLevel(levels.red) << 8)
    | (clampLevel(levels.sky) << 12)
  ) & 0xffff;
}

export function unpackVoxelLight(packed: number): VoxelLightLevels {
  return {
    sky: lightChannel(packed, LightChannel.Sky),
    red: lightChannel(packed, LightChannel.Red),
    green: lightChannel(packed, LightChannel.Green),
    blue: lightChannel(packed, LightChannel.Blue),
  };
}

export function perceivedBlockLight(packed: number) {
  return Math.max(
    lightChannel(packed, LightChannel.Red),
    lightChannel(packed, LightChannel.Green),
    lightChannel(packed, LightChannel.Blue),
  );
}

/** Shared gameplay interpretation of the one canonical packed light field. */
export function gameplayLightFromPacked(packed: number, daylight: number) {
  return Math.max(perceivedBlockLight(packed), lightChannel(packed, LightChannel.Sky) * Math.min(1, Math.max(0, daylight)));
}

export function emittedLightForDefinition(definition: BlockDefinition | undefined) {
  const level = clampLevel(definition?.lightEmission ?? 0);
  if (level <= 0) return 0;
  const color = definition?.lightColor ?? [1, 1, 1];
  return packVoxelLight({
    sky: 0,
    red: level * color[0],
    green: level * color[1],
    blue: level * color[2],
  });
}

/**
 * Chunk-owned, deterministic voxel lighting. Light is derived from blocks and
 * never serialized; unloaded chunks are hard propagation boundaries rather
 * than accidental open sky.
 */
export class VoxelLightEngine {
  readonly chunkSize: number;
  readonly minY: number;
  readonly maxY: number;
  readonly worldHeight: number;
  readonly columnArea: number;
  readonly sectionHeight: number;
  readonly getChunk: VoxelLightEngineOptions["getChunk"];
  readonly getDefinition: VoxelLightEngineOptions["getDefinition"];
  readonly markLightDirty: VoxelLightEngineOptions["markLightDirty"];

  private queueX: number[] = [];
  private queueY: number[] = [];
  private queueZ: number[] = [];
  private queueHead = 0;
  private queued = new Set<string>();
  private directSkyCache = new Map<string, Uint8Array>();

  constructor(options: VoxelLightEngineOptions) {
    this.chunkSize = options.chunkSize;
    this.minY = options.minY;
    this.maxY = options.maxY;
    this.worldHeight = options.maxY - options.minY + 1;
    this.columnArea = options.chunkSize * options.chunkSize;
    this.sectionHeight = Math.max(1, Math.floor(options.sectionHeight ?? 16));
    this.getChunk = options.getChunk;
    this.getDefinition = options.getDefinition;
    this.markLightDirty = options.markLightDirty;
  }

  private coordinateKey(x: number, y: number, z: number, channel?: LightChannel) {
    return channel === undefined ? `${x},${y},${z}` : `${x},${y},${z},${channel}`;
  }

  private split(value: number) {
    const chunk = Math.floor(value / this.chunkSize);
    return { chunk, local: value - chunk * this.chunkSize };
  }

  private locate(x: number, y: number, z: number): LocatedLight | undefined {
    if (y < this.minY || y > this.maxY) return undefined;
    const sx = this.split(x);
    const sz = this.split(z);
    const chunk = this.getChunk(sx.chunk, sz.chunk);
    if (!chunk) return undefined;
    return {
      chunk,
      index: sx.local + this.chunkSize * (sz.local + this.chunkSize * (y - this.minY)),
    };
  }

  private blockAt(x: number, y: number, z: number, override?: LightBlockChange) {
    if (override && override.x === x && override.y === y && override.z === z) return override.previous;
    const located = this.locate(x, y, z);
    return located ? located.chunk.blocks[located.index] as BlockId : undefined;
  }

  private dampeningAt(x: number, y: number, z: number) {
    const located = this.locate(x, y, z);
    if (!located) return MAX_LIGHT_LEVEL;
    return clampLevel(this.getDefinition(located.chunk.blocks[located.index] as BlockId)?.lightDampening ?? MAX_LIGHT_LEVEL);
  }

  private emissionAt(x: number, y: number, z: number, override?: LightBlockChange) {
    const type = this.blockAt(x, y, z, override);
    return type === undefined ? 0 : emittedLightForDefinition(this.getDefinition(type));
  }

  getPacked(x: number, y: number, z: number) {
    const located = this.locate(x, y, z);
    return located?.chunk.light[located.index] ?? 0;
  }

  getLevels(x: number, y: number, z: number) {
    return unpackVoxelLight(this.getPacked(x, y, z));
  }

  private writePacked(x: number, y: number, z: number, packed: number, dirty: boolean) {
    const located = this.locate(x, y, z);
    if (!located || located.chunk.light[located.index] === packed) return false;
    located.chunk.light[located.index] = packed;
    if (dirty) this.markLightDirty(x, y, z);
    return true;
  }

  private writeChannel(x: number, y: number, z: number, channel: LightChannel, level: number, dirty: boolean) {
    const current = this.getPacked(x, y, z);
    return this.writePacked(x, y, z, withLightChannel(current, channel, level), dirty);
  }

  private beginQueue() {
    this.queueX.length = 0;
    this.queueY.length = 0;
    this.queueZ.length = 0;
    this.queueHead = 0;
    this.queued.clear();
  }

  private enqueue(x: number, y: number, z: number, channel?: LightChannel) {
    if (!this.locate(x, y, z)) return;
    const key = this.coordinateKey(x, y, z, channel);
    if (this.queued.has(key)) return;
    this.queued.add(key);
    this.queueX.push(x);
    this.queueY.push(y);
    this.queueZ.push(z);
  }

  private directSkyColumn(x: number, z: number, override?: LightBlockChange) {
    const cacheKey = override ? `${x},${z},${override.x},${override.y},${override.z},${override.previous}` : `${x},${z}`;
    const cached = this.directSkyCache.get(cacheKey);
    if (cached) return cached;
    const result = new Uint8Array(this.worldHeight);
    let level = MAX_LIGHT_LEVEL;
    for (let y = this.maxY; y >= this.minY; y -= 1) {
      const type = this.blockAt(x, y, z, override);
      if (type === undefined) { level = 0; continue; }
      const dampening = clampLevel(this.getDefinition(type)?.lightDampening ?? MAX_LIGHT_LEVEL);
      if (dampening >= MAX_LIGHT_LEVEL) level = 0;
      else if (dampening > 0) level = Math.max(0, level - dampening);
      result[y - this.minY] = level;
    }
    this.directSkyCache.set(cacheKey, result);
    return result;
  }

  private intrinsicLevel(channel: LightChannel, x: number, y: number, z: number) {
    if (channel === LightChannel.Sky) return this.directSkyColumn(x, z)[y - this.minY] ?? 0;
    return lightChannel(this.emissionAt(x, y, z), channel);
  }

  private propagateIncrease(dirty: boolean) {
    while (this.queueHead < this.queueX.length) {
      const x = this.queueX[this.queueHead];
      const y = this.queueY[this.queueHead];
      const z = this.queueZ[this.queueHead];
      this.queueHead += 1;
      this.queued.delete(this.coordinateKey(x, y, z));
      const source = this.getPacked(x, y, z);
      if (source === 0) continue;
      for (const [dx, dy, dz] of DIRECTIONS) {
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        if (!this.locate(nx, ny, nz)) continue;
        const materialDampening = this.dampeningAt(nx, ny, nz);
        const attenuation = materialDampening >= MAX_LIGHT_LEVEL
          ? MAX_LIGHT_LEVEL
          : Math.min(MAX_LIGHT_LEVEL, 1 + materialDampening);
        const current = this.getPacked(nx, ny, nz);
        let next = current;
        for (let channel = 0; channel < LIGHT_CHANNEL_COUNT; channel += 1) {
          const candidate = Math.max(0, lightChannel(source, channel) - attenuation);
          if (candidate > lightChannel(next, channel)) next = withLightChannel(next, channel, candidate);
        }
        if (next !== current && this.writePacked(nx, ny, nz, next, dirty)) this.enqueue(nx, ny, nz);
      }
    }
  }

  private propagateDecrease(channel: LightChannel, removed: ReadonlyArray<readonly [number, number, number, number]>, dirty: boolean) {
    this.beginQueue();
    const oldLevels = new Map<string, number>();
    for (const [x, y, z, oldLevel] of removed) {
      const key = this.coordinateKey(x, y, z, channel);
      oldLevels.set(key, Math.max(oldLevels.get(key) ?? 0, oldLevel));
      this.enqueue(x, y, z, channel);
    }
    const recheck = new Set<string>();
    while (this.queueHead < this.queueX.length) {
      const x = this.queueX[this.queueHead];
      const y = this.queueY[this.queueHead];
      const z = this.queueZ[this.queueHead];
      this.queueHead += 1;
      const key = this.coordinateKey(x, y, z, channel);
      this.queued.delete(key);
      const removedLevel = oldLevels.get(key) ?? 0;
      for (const [dx, dy, dz] of DIRECTIONS) {
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        if (!this.locate(nx, ny, nz)) continue;
        const neighborLevel = lightChannel(this.getPacked(nx, ny, nz), channel);
        if (neighborLevel <= 0) continue;
        const intrinsic = this.intrinsicLevel(channel, nx, ny, nz);
        if (neighborLevel < removedLevel && neighborLevel > intrinsic) {
          this.writeChannel(nx, ny, nz, channel, intrinsic, dirty);
          const neighborKey = this.coordinateKey(nx, ny, nz, channel);
          oldLevels.set(neighborKey, neighborLevel);
          this.enqueue(nx, ny, nz, channel);
        } else recheck.add(this.coordinateKey(nx, ny, nz));
      }
    }
    this.beginQueue();
    for (const key of recheck) {
      const [x, y, z] = key.split(",").map(Number);
      this.enqueue(x, y, z);
    }
    for (const [x, y, z] of removed) {
      this.enqueue(x, y, z);
      for (const [dx, dy, dz] of DIRECTIONS) this.enqueue(x + dx, y + dy, z + dz);
    }
    this.propagateIncrease(dirty);
  }

  private enqueueInitialization(task: VoxelLightInitializationTask, x: number, y: number, z: number) {
    if (!this.locate(x, y, z)) return;
    const key = this.coordinateKey(x, y, z);
    if (task.queued.has(key)) return;
    task.queued.add(key);
    task.queueX.push(x);
    task.queueY.push(y);
    task.queueZ.push(z);
  }

  /**
   * Starts a resumable light build. New streaming chunks use this path so the
   * 49k-voxel seed scan and breadth-first propagation cannot monopolize one
   * presented frame. The synchronous initializeChunk API below remains the
   * exact same operation completed in one call for startup, tests, and edits.
   */
  beginChunkInitialization(chunk: VoxelLightChunk): VoxelLightInitializationTask {
    chunk.light.fill(0);
    chunk.lightInitialized = false;
    this.directSkyCache.clear();
    return {
      chunk,
      phase: "seed",
      markDirtyDuringPropagation: false,
      cursor: 0,
      queueX: [],
      queueY: [],
      queueZ: [],
      queueHead: 0,
      queued: new Set<string>(),
    };
  }

  /** Advances a resumable light build by a bounded amount of voxel work. */
  stepChunkInitialization(task: VoxelLightInitializationTask, maximumOperations = 2_048) {
    let remaining = Math.max(1, Math.floor(maximumOperations));
    const { chunk } = task;
    const originX = chunk.cx * this.chunkSize;
    const originZ = chunk.cz * this.chunkSize;
    const volume = this.columnArea * this.worldHeight;
    while (remaining > 0 && task.phase !== "complete") {
      if (task.phase === "seed") {
        if (task.cursor >= this.columnArea) {
          task.phase = "scan";
          task.cursor = 0;
          continue;
        }
        const localX = task.cursor % this.chunkSize;
        const localZ = Math.floor(task.cursor / this.chunkSize);
        const direct = this.directSkyColumn(originX + localX, originZ + localZ);
        for (let y = this.minY; y <= this.maxY; y += 1) {
          const index = localX + this.chunkSize * (localZ + this.chunkSize * (y - this.minY));
          const type = chunk.blocks[index] as BlockId;
          chunk.light[index] = withLightChannel(
            emittedLightForDefinition(this.getDefinition(type)),
            LightChannel.Sky,
            direct[y - this.minY],
          );
        }
        task.cursor += 1;
        remaining -= this.worldHeight;
        continue;
      }

      if (task.phase === "scan") {
        if (task.cursor >= volume) {
          task.phase = "boundary";
          task.cursor = 0;
          continue;
        }
        const layer = Math.floor(task.cursor / this.columnArea);
        const horizontal = task.cursor % this.columnArea;
        const localZ = Math.floor(horizontal / this.chunkSize);
        const localX = horizontal % this.chunkSize;
        const x = originX + localX;
        const y = this.minY + layer;
        const z = originZ + localZ;
        const packed = chunk.light[task.cursor];
        if (perceivedBlockLight(packed) > 0) this.enqueueInitialization(task, x, y, z);
        const sky = lightChannel(packed, LightChannel.Sky);
        if (sky > 0) {
          const boundary = localX === 0 || localZ === 0 || localX === this.chunkSize - 1 || localZ === this.chunkSize - 1;
          let transition = boundary;
          if (!transition) for (const [dx, dy, dz] of DIRECTIONS) {
            if (lightChannel(this.getPacked(x + dx, y + dy, z + dz), LightChannel.Sky) < sky
              && this.dampeningAt(x + dx, y + dy, z + dz) < MAX_LIGHT_LEVEL) {
              transition = true;
              break;
            }
          }
          if (transition) this.enqueueInitialization(task, x, y, z);
        }
        task.cursor += 1;
        remaining -= 1;
        continue;
      }

      if (task.phase === "boundary") {
        const boundaryCells = this.worldHeight * this.chunkSize * 4;
        if (task.cursor >= boundaryCells) {
          task.phase = "propagate";
          task.cursor = 0;
          continue;
        }
        const faceArea = this.worldHeight * this.chunkSize;
        const face = Math.floor(task.cursor / faceArea);
        const withinFace = task.cursor % faceArea;
        const layer = Math.floor(withinFace / this.chunkSize);
        const offset = withinFace % this.chunkSize;
        const y = this.minY + layer;
        if (face === 0) this.enqueueInitialization(task, originX - 1, y, originZ + offset);
        else if (face === 1) this.enqueueInitialization(task, originX + this.chunkSize, y, originZ + offset);
        else if (face === 2) this.enqueueInitialization(task, originX + offset, y, originZ - 1);
        else this.enqueueInitialization(task, originX + offset, y, originZ + this.chunkSize);
        task.cursor += 1;
        remaining -= 1;
        continue;
      }

      if (task.queueHead >= task.queueX.length) {
        task.phase = "complete";
        chunk.lightInitialized = true;
        this.directSkyCache.clear();
        break;
      }
      const x = task.queueX[task.queueHead];
      const y = task.queueY[task.queueHead];
      const z = task.queueZ[task.queueHead];
      task.queueHead += 1;
      task.queued.delete(this.coordinateKey(x, y, z));
      const source = this.getPacked(x, y, z);
      if (source !== 0) for (const [dx, dy, dz] of DIRECTIONS) {
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        if (!this.locate(nx, ny, nz)) continue;
        const materialDampening = this.dampeningAt(nx, ny, nz);
        const attenuation = materialDampening >= MAX_LIGHT_LEVEL
          ? MAX_LIGHT_LEVEL
          : Math.min(MAX_LIGHT_LEVEL, 1 + materialDampening);
        const current = this.getPacked(nx, ny, nz);
        let next = current;
        for (let channel = 0; channel < LIGHT_CHANNEL_COUNT; channel += 1) {
          const candidate = Math.max(0, lightChannel(source, channel) - attenuation);
          if (candidate > lightChannel(next, channel)) next = withLightChannel(next, channel, candidate);
        }
        if (next !== current && this.writePacked(nx, ny, nz, next, task.markDirtyDuringPropagation)) {
          this.enqueueInitialization(task, nx, ny, nz);
        }
      }
      remaining -= 1;
    }
    return task.phase === "complete";
  }

  initializeChunk(chunk: VoxelLightChunk) {
    const task = this.beginChunkInitialization(chunk);
    while (!this.stepChunkInitialization(task, Number.MAX_SAFE_INTEGER)) {
      // The maximum operation budget completes ordinary chunks in one pass;
      // retain the loop so pathological propagation remains correct.
    }
  }

  /**
   * An isolated worker build already contains exact direct sky and internal
   * emission. Seeding both sides of its four seams propagates only additional
   * neighbor light; level 15 cannot travel beyond the loaded one-chunk halo.
   */
  beginChunkBoundaryReconciliation(chunk: VoxelLightChunk) {
    const task: VoxelLightInitializationTask = {
      chunk,
      phase: "boundary",
      markDirtyDuringPropagation: true,
      cursor: 0,
      queueX: [],
      queueY: [],
      queueZ: [],
      queueHead: 0,
      queued: new Set<string>(),
    };
    if (!chunk.lightInitialized) return task;
    const originX = chunk.cx * this.chunkSize;
    const originZ = chunk.cz * this.chunkSize;
    this.directSkyCache.clear();
    for (let y = this.minY; y <= this.maxY; y += 1) for (let offset = 0; offset < this.chunkSize; offset += 1) {
      for (const [x, z] of [
        [originX, originZ + offset],
        [originX + this.chunkSize - 1, originZ + offset],
        [originX + offset, originZ],
        [originX + offset, originZ + this.chunkSize - 1],
      ] as const) this.enqueueInitialization(task, x, y, z);
    }
    return task;
  }

  reconcileChunkBoundaries(chunk: VoxelLightChunk) {
    const task = this.beginChunkBoundaryReconciliation(chunk);
    while (!this.stepChunkInitialization(task, Number.MAX_SAFE_INTEGER)) {
      // Synchronous compatibility API for tests and non-streaming callers.
    }
  }

  /**
   * Rebuilds the one-chunk light halo around a large block batch in one pass.
   * A level-15 source cannot cross more than one complete neighboring chunk,
   * so the halo contains every value that the batch can invalidate.
   */
  rebuildAround(changes: readonly LightBlockChange[]) {
    if (changes.length === 0) return;
    const rebuild = new Map<string, VoxelLightChunk>();
    for (const change of changes) {
      const centerX = Math.floor(change.x / this.chunkSize);
      const centerZ = Math.floor(change.z / this.chunkSize);
      for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) {
        const chunk = this.getChunk(centerX + dx, centerZ + dz);
        if (chunk) rebuild.set(`${chunk.cx},${chunk.cz}`, chunk);
      }
    }
    this.rebuildChunks([...rebuild.values()]);
  }

  private rebuildChunks(chunks: readonly VoxelLightChunk[]) {
    this.directSkyCache.clear();
    for (const chunk of chunks) {
      chunk.light.fill(0);
      const originX = chunk.cx * this.chunkSize;
      const originZ = chunk.cz * this.chunkSize;
      for (let localX = 0; localX < this.chunkSize; localX += 1) for (let localZ = 0; localZ < this.chunkSize; localZ += 1) {
        const direct = this.directSkyColumn(originX + localX, originZ + localZ);
        for (let y = this.minY; y <= this.maxY; y += 1) {
          const index = localX + this.chunkSize * (localZ + this.chunkSize * (y - this.minY));
          const type = chunk.blocks[index] as BlockId;
          chunk.light[index] = withLightChannel(
            emittedLightForDefinition(this.getDefinition(type)),
            LightChannel.Sky,
            direct[y - this.minY],
          );
        }
      }
      chunk.lightInitialized = true;
    }

    this.beginQueue();
    for (const chunk of chunks) {
      const originX = chunk.cx * this.chunkSize;
      const originZ = chunk.cz * this.chunkSize;
      for (let localX = 0; localX < this.chunkSize; localX += 1) for (let localZ = 0; localZ < this.chunkSize; localZ += 1) {
        const x = originX + localX;
        const z = originZ + localZ;
        for (let y = this.minY; y <= this.maxY; y += 1) {
          const packed = this.getPacked(x, y, z);
          if (perceivedBlockLight(packed) > 0) this.enqueue(x, y, z);
          const sky = lightChannel(packed, LightChannel.Sky);
          if (sky <= 0) continue;
          const boundary = localX === 0 || localZ === 0 || localX === this.chunkSize - 1 || localZ === this.chunkSize - 1;
          if (boundary || DIRECTIONS.some(([dx, dy, dz]) => (
            lightChannel(this.getPacked(x + dx, y + dy, z + dz), LightChannel.Sky) < sky
            && this.dampeningAt(x + dx, y + dy, z + dz) < MAX_LIGHT_LEVEL
          ))) this.enqueue(x, y, z);
        }
      }
      // Loaded sources immediately outside the reset halo are valid inputs.
      for (let y = this.minY; y <= this.maxY; y += 1) for (let offset = 0; offset < this.chunkSize; offset += 1) {
        this.enqueue(originX - 1, y, originZ + offset);
        this.enqueue(originX + this.chunkSize, y, originZ + offset);
        this.enqueue(originX + offset, y, originZ - 1);
        this.enqueue(originX + offset, y, originZ + this.chunkSize);
      }
      for (let y = this.minY; y <= this.maxY; y += this.sectionHeight) this.markLightDirty(originX, y, originZ);
    }
    this.propagateIncrease(true);
    this.directSkyCache.clear();
  }

  updateBlock(change: LightBlockChange) {
    if (!this.locate(change.x, change.y, change.z) || change.previous === change.next) return;
    const previousOverride: LightBlockChange = change;
    this.directSkyCache.clear();
    const oldDirect = this.directSkyColumn(change.x, change.z, previousOverride).slice();
    this.directSkyCache.clear();
    const nextDirect = this.directSkyColumn(change.x, change.z).slice();
    const oldEmission = emittedLightForDefinition(this.getDefinition(change.previous));
    const nextEmission = emittedLightForDefinition(this.getDefinition(change.next));
    const oldDampening = clampLevel(this.getDefinition(change.previous)?.lightDampening ?? MAX_LIGHT_LEVEL);
    const nextDampening = clampLevel(this.getDefinition(change.next)?.lightDampening ?? MAX_LIGHT_LEVEL);

    const removals: Array<Array<readonly [number, number, number, number]>> = Array.from({ length: LIGHT_CHANNEL_COUNT }, () => []);
    const increases: Array<readonly [number, number, number]> = [];
    for (let y = this.minY; y <= this.maxY; y += 1) {
      const oldIntrinsic = oldDirect[y - this.minY];
      const nextIntrinsic = nextDirect[y - this.minY];
      if (oldIntrinsic === nextIntrinsic) continue;
      const current = lightChannel(this.getPacked(change.x, y, change.z), LightChannel.Sky);
      if (nextIntrinsic < oldIntrinsic && current > nextIntrinsic) {
        this.writeChannel(change.x, y, change.z, LightChannel.Sky, nextIntrinsic, true);
        removals[LightChannel.Sky].push([change.x, y, change.z, current]);
      } else if (nextIntrinsic > current) {
        this.writeChannel(change.x, y, change.z, LightChannel.Sky, nextIntrinsic, true);
        increases.push([change.x, y, change.z]);
      }
    }

    for (let channel = LightChannel.Blue; channel <= LightChannel.Red; channel += 1) {
      const oldIntrinsic = lightChannel(oldEmission, channel);
      const nextIntrinsic = lightChannel(nextEmission, channel);
      const current = lightChannel(this.getPacked(change.x, change.y, change.z), channel);
      if ((nextIntrinsic < oldIntrinsic || oldDampening !== nextDampening) && current > nextIntrinsic) {
        this.writeChannel(change.x, change.y, change.z, channel, nextIntrinsic, true);
        removals[channel].push([change.x, change.y, change.z, current]);
      } else if (nextIntrinsic > current) {
        this.writeChannel(change.x, change.y, change.z, channel, nextIntrinsic, true);
        increases.push([change.x, change.y, change.z]);
      }
    }

    if (oldDampening !== nextDampening) {
      const skyCurrent = lightChannel(this.getPacked(change.x, change.y, change.z), LightChannel.Sky);
      const skyIntrinsic = nextDirect[change.y - this.minY];
      if (skyCurrent > skyIntrinsic) {
        this.writeChannel(change.x, change.y, change.z, LightChannel.Sky, skyIntrinsic, true);
        removals[LightChannel.Sky].push([change.x, change.y, change.z, skyCurrent]);
      }
    }

    for (let channel = 0; channel < LIGHT_CHANNEL_COUNT; channel += 1) {
      if (removals[channel].length) this.propagateDecrease(channel, removals[channel], true);
    }
    this.beginQueue();
    this.enqueue(change.x, change.y, change.z);
    for (const [x, y, z] of increases) this.enqueue(x, y, z);
    for (const [dx, dy, dz] of DIRECTIONS) this.enqueue(change.x + dx, change.y + dy, change.z + dz);
    this.propagateIncrease(true);
    this.directSkyCache.clear();
  }
}
