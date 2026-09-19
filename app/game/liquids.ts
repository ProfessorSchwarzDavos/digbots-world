/**
 * Bounded liquid simulation primitives.
 *
 * The simulator deliberately knows nothing about chunks or rendering. The game
 * supplies a tiny adapter, processes a fixed number of cells each tick, and
 * translates the returned changes into chunk edits. This keeps a waterfall or
 * a broken reservoir from monopolising a frame.
 */

import { BLOCKS, BlockId, blockContainsWater } from "./data";

export type LiquidKind = "water" | "lava" | "honey" | "syrup";

export type LiquidPosition = Readonly<{ x: number; y: number; z: number }>;

export type LiquidCell = Readonly<{
  kind: LiquidKind;
  /** 0 is reserved for a source; larger values are progressively thinner. */
  level: number;
  source: boolean;
  /** Falling columns do not create infinite sources. */
  falling: boolean;
}>;

export type LiquidChange = Readonly<{
  position: LiquidPosition;
  previous?: LiquidCell;
  next?: LiquidCell;
}>;

export interface LiquidWorldAdapter {
  getLiquid(position: LiquidPosition): LiquidCell | undefined;
  setLiquid(position: LiquidPosition, liquid: LiquidCell | undefined): void;
  isSolid(position: LiquidPosition): boolean;
  /** Defaults to true for a non-solid cell. Plants can opt in here. */
  isReplaceable?(position: LiquidPosition): boolean;
  /** Returning false defers propagation until the chunk is available. */
  isLoaded?(position: LiquidPosition): boolean;
  minY?: number;
  maxY?: number;
}

export type LiquidSimulationOptions = Readonly<{
  waterSpread: number;
  lavaSpread: number;
  honeySpread: number;
  syrupSpread: number;
  maxOperationsPerTick: number;
}>;

export const DEFAULT_LIQUID_SIMULATION_OPTIONS: LiquidSimulationOptions = Object.freeze({
  waterSpread: 7,
  lavaSpread: 3,
  // Both food liquids are deliberately thicker and non-renewing. Syrup
  // travels a little farther than honey so natural ponds settle cleanly.
  honeySpread: 2,
  syrupSpread: 4,
  maxOperationsPerTick: 192,
});

/**
 * One visible flow-frontier step. Minecraft advances water on a deliberately
 * legible cadence rather than resolving a whole spill in one render frame;
 * Blockwild stays slightly more responsive while preserving that rhythm.
 */
export const LIQUID_SIMULATION_STEP_SECONDS = 0.2;

export type LiquidProfile = Readonly<{
  block: BlockId;
  bucketItemName: string;
  renewable: boolean;
  spreadOption: keyof Pick<LiquidSimulationOptions, "waterSpread" | "lavaSpread" | "honeySpread" | "syrupSpread">;
}>;

export const LIQUID_PROFILES: Readonly<Record<LiquidKind, LiquidProfile>> = Object.freeze({
  water: Object.freeze({ block: BlockId.Water, bucketItemName: "Water Bucket", renewable: true, spreadOption: "waterSpread" }),
  lava: Object.freeze({ block: BlockId.Lava, bucketItemName: "Lava Bucket", renewable: false, spreadOption: "lavaSpread" }),
  honey: Object.freeze({ block: BlockId.Honey, bucketItemName: "Honey Bucket", renewable: false, spreadOption: "honeySpread" }),
  syrup: Object.freeze({ block: BlockId.Syrup, bucketItemName: "Syrup Bucket", renewable: false, spreadOption: "syrupSpread" }),
});

/** Canonical bridge between save-friendly liquid cells and placed blocks. */
export function liquidBlockForKind(kind: LiquidKind) {
  return LIQUID_PROFILES[kind].block;
}

/** Waterlogged flora still reports water even though its rendered block is a plant. */
export function liquidKindForBlock(block: BlockId | undefined): LiquidKind | undefined {
  if (block === undefined) return undefined;
  if (blockContainsWater(block)) return "water";
  const kind = BLOCKS[block]?.liquid;
  return kind === "water" || kind === "lava" || kind === "honey" || kind === "syrup" ? kind : undefined;
}

export function blockContainsLiquid(block: BlockId | undefined, kind?: LiquidKind) {
  const contained = liquidKindForBlock(block);
  return kind === undefined ? contained !== undefined : contained === kind;
}

export function isRenewableLiquidKind(kind: LiquidKind) {
  return LIQUID_PROFILES[kind].renewable;
}

const CARDINAL_OFFSETS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;

const NEIGHBOR_OFFSETS = [
  ...CARDINAL_OFFSETS,
  [0, 1, 0] as const,
  [0, -1, 0] as const,
];

const positionKey = ({ x, y, z }: LiquidPosition) => `${Math.trunc(x)},${Math.trunc(y)},${Math.trunc(z)}`;
const offsetPosition = (position: LiquidPosition, offset: readonly [number, number, number]): LiquidPosition => ({
  x: position.x + offset[0],
  y: position.y + offset[1],
  z: position.z + offset[2],
});

const sameLiquid = (a: LiquidCell | undefined, b: LiquidCell | undefined) =>
  a === b || Boolean(a && b && a.kind === b.kind && a.level === b.level && a.source === b.source && a.falling === b.falling);

const normalizedCell = (cell: LiquidCell, maxSpread: number): LiquidCell => {
  if (cell.source) return { kind: cell.kind, level: 0, source: true, falling: false };
  return {
    kind: cell.kind,
    level: Math.max(1, Math.min(maxSpread, Math.round(cell.level))),
    source: false,
    falling: Boolean(cell.falling),
  };
};

export class LiquidSimulator {
  private queue: LiquidPosition[] = [];
  private queueHead = 0;
  private queued = new Set<string>();
  readonly options: LiquidSimulationOptions;

  constructor(readonly world: LiquidWorldAdapter, options: Partial<LiquidSimulationOptions> = {}) {
    this.options = Object.freeze({
      waterSpread: Math.max(1, Math.min(15, Math.round(options.waterSpread ?? DEFAULT_LIQUID_SIMULATION_OPTIONS.waterSpread))),
      lavaSpread: Math.max(1, Math.min(15, Math.round(options.lavaSpread ?? DEFAULT_LIQUID_SIMULATION_OPTIONS.lavaSpread))),
      honeySpread: Math.max(1, Math.min(15, Math.round(options.honeySpread ?? DEFAULT_LIQUID_SIMULATION_OPTIONS.honeySpread))),
      syrupSpread: Math.max(1, Math.min(15, Math.round(options.syrupSpread ?? DEFAULT_LIQUID_SIMULATION_OPTIONS.syrupSpread))),
      maxOperationsPerTick: Math.max(1, Math.round(options.maxOperationsPerTick ?? DEFAULT_LIQUID_SIMULATION_OPTIONS.maxOperationsPerTick)),
    });
  }

  get pendingCount() {
    return this.queue.length - this.queueHead;
  }

  enqueue(position: LiquidPosition) {
    const normalized = { x: Math.trunc(position.x), y: Math.trunc(position.y), z: Math.trunc(position.z) };
    if (!this.isInsideWorld(normalized) || !this.isLoaded(normalized)) return false;
    const key = positionKey(normalized);
    if (this.queued.has(key)) return false;
    this.queued.add(key);
    this.queue.push(normalized);
    return true;
  }

  enqueueNeighborhood(position: LiquidPosition) {
    this.enqueue(position);
    for (const offset of NEIGHBOR_OFFSETS) this.enqueue(offsetPosition(position, offset));
  }

  /** Call after a solid/replaceable block changes next to liquid. */
  notifyBlockChanged(position: LiquidPosition) {
    this.enqueueNeighborhood(position);
  }

  addSource(position: LiquidPosition, kind: LiquidKind = "water") {
    if (!this.canOccupy(position, kind)) return false;
    this.write(position, { kind, level: 0, source: true, falling: false }, []);
    return true;
  }

  /**
   * Advances at most `operationBudget` queued cells. Runtime is O(budget) and
   * memory is O(changed frontier), independent of world size.
   */
  process(operationBudget = this.options.maxOperationsPerTick): LiquidChange[] {
    const changes: LiquidChange[] = [];
    const budget = Math.max(0, Math.floor(operationBudget));
    // A process call owns only the frontier that existed when the liquid tick
    // began. Cells enqueued by those updates wait for the next tick, preventing
    // a high operation budget from crossing several blocks in one frame.
    const frontierEnd = Math.min(this.queue.length, this.queueHead + budget);
    const occupiedAtTickStart: boolean[] = [];
    for (let index = this.queueHead; index < frontierEnd; index += 1) {
      occupiedAtTickStart.push(Boolean(this.world.getLiquid(this.queue[index])));
    }
    let operations = 0;

    while (this.queueHead < frontierEnd) {
      const position = this.queue[this.queueHead++];
      const key = positionKey(position);
      this.queued.delete(key);
      if (occupiedAtTickStart[operations] && this.isLoaded(position)) this.updateCell(position, changes);
      // A neighboring update may have filled a position that was empty when
      // this tick began. Requeue it so it becomes next tick's frontier instead
      // of either cascading now or being lost behind deduplication.
      else if (this.world.getLiquid(position)) this.enqueue(position);
      operations += 1;
    }

    if (this.queueHead >= this.queue.length) {
      this.queue = [];
      this.queueHead = 0;
    } else if (this.queueHead > 1024 && this.queueHead * 2 > this.queue.length) {
      this.queue = this.queue.slice(this.queueHead);
      this.queueHead = 0;
    }
    return changes;
  }

  private maxSpread(kind: LiquidKind) {
    return this.options[LIQUID_PROFILES[kind].spreadOption];
  }

  private isInsideWorld(position: LiquidPosition) {
    return (this.world.minY === undefined || position.y >= this.world.minY)
      && (this.world.maxY === undefined || position.y <= this.world.maxY);
  }

  private isLoaded(position: LiquidPosition) {
    return this.world.isLoaded?.(position) ?? true;
  }

  private canOccupy(position: LiquidPosition, kind: LiquidKind) {
    if (!this.isInsideWorld(position) || !this.isLoaded(position) || this.world.isSolid(position)) return false;
    const existing = this.world.getLiquid(position);
    if (existing) return existing.kind === kind;
    return this.world.isReplaceable?.(position) ?? true;
  }

  private hasSourceSupport(position: LiquidPosition) {
    const below = offsetPosition(position, [0, -1, 0]);
    if (this.world.isSolid(below)) return true;
    const liquid = this.world.getLiquid(below);
    return Boolean(liquid?.kind === "water" && liquid.source);
  }

  private canBecomeWaterSource(position: LiquidPosition) {
    if (!this.hasSourceSupport(position)) return false;
    let adjacentSources = 0;
    for (const offset of CARDINAL_OFFSETS) {
      const neighbor = this.world.getLiquid(offsetPosition(position, offset));
      if (neighbor?.kind === "water" && neighbor.source && !neighbor.falling) adjacentSources += 1;
    }
    return adjacentSources >= 2;
  }

  private deriveFlow(position: LiquidPosition, kind: LiquidKind): LiquidCell | undefined {
    if (kind === "water" && this.canBecomeWaterSource(position)) {
      return { kind: "water", level: 0, source: true, falling: false };
    }

    const maxSpread = this.maxSpread(kind);
    const above = this.world.getLiquid(offsetPosition(position, [0, 1, 0]));
    if (above?.kind === kind) {
      return { kind, level: Math.min(maxSpread, Math.max(1, above.level)), source: false, falling: true };
    }

    let bestLevel = Number.POSITIVE_INFINITY;
    for (const offset of CARDINAL_OFFSETS) {
      const neighbor = this.world.getLiquid(offsetPosition(position, offset));
      if (!neighbor || neighbor.kind !== kind) continue;
      const candidate = neighbor.source ? 1 : neighbor.level + 1;
      if (candidate < bestLevel) bestLevel = candidate;
    }
    if (bestLevel > maxSpread) return undefined;
    return { kind, level: bestLevel, source: false, falling: false };
  }

  private write(position: LiquidPosition, next: LiquidCell | undefined, changes: LiquidChange[]) {
    const previous = this.world.getLiquid(position);
    const normalized = next ? normalizedCell(next, this.maxSpread(next.kind)) : undefined;
    if (sameLiquid(previous, normalized)) return false;
    this.world.setLiquid(position, normalized);
    changes.push({ position: { ...position }, previous, next: normalized });
    this.enqueueNeighborhood(position);
    return true;
  }

  private flowInto(position: LiquidPosition, liquid: LiquidCell, changes: LiquidChange[]) {
    if (!this.canOccupy(position, liquid.kind)) return false;
    const existing = this.world.getLiquid(position);
    if (existing?.source) return false;
    const proposed = liquid.kind === "water" && this.canBecomeWaterSource(position)
      ? { kind: "water" as const, level: 0, source: true, falling: false }
      : liquid;
    if (existing && existing.kind === proposed.kind) {
      const existingStrength = existing.source ? -1 : existing.level;
      const proposedStrength = proposed.source ? -1 : proposed.level;
      if (existingStrength < proposedStrength) return false;
      // Equal-strength proposals must be stable. In particular, a sideways
      // proposal may not toggle a falling column back to non-falling every
      // time its horizontal neighbour is processed.
      if (existingStrength === proposedStrength) return false;
    }
    return this.write(position, proposed, changes);
  }

  private updateCell(position: LiquidPosition, changes: LiquidChange[]) {
    let cell = this.world.getLiquid(position);
    if (!cell) return;

    if (!cell.source) {
      const derived = this.deriveFlow(position, cell.kind);
      if (!derived) {
        this.write(position, undefined, changes);
        return;
      }
      if (!sameLiquid(cell, derived)) {
        this.write(position, derived, changes);
        cell = derived;
      }
    }

    const maxSpread = this.maxSpread(cell.kind);
    const below = offsetPosition(position, [0, -1, 0]);
    const canContinueDownward = this.canOccupy(below, cell.kind);
    this.flowInto(below, {
      kind: cell.kind,
      level: Math.min(maxSpread, Math.max(1, cell.level)),
      source: false,
      falling: true,
    }, changes);

    // A falling stream spreads when it meets a floor, rather than producing a
    // wide curtain at every Y level. Sources still spill over their rim.
    if (!cell.source && canContinueDownward) return;

    const nextLevel = cell.source ? 1 : cell.level + 1;
    if (nextLevel > maxSpread) return;
    for (const offset of CARDINAL_OFFSETS) {
      const target = offsetPosition(position, offset);
      this.flowInto(target, { kind: cell.kind, level: nextLevel, source: false, falling: false }, changes);
    }
  }
}

/** Stable [0, 1) animation phase with a small per-column phase offset. */
export function waterAnimationPhase(timeMilliseconds: number, x = 0, z = 0, cyclesPerSecond = 0.11) {
  const spatialOffset = ((Math.imul(Math.trunc(x), 73856093) ^ Math.imul(Math.trunc(z), 19349663)) >>> 0) / 4294967296;
  const phase = timeMilliseconds * 0.001 * cyclesPerSecond + spatialOffset;
  return ((phase % 1) + 1) % 1;
}

export function waterSurfaceSample(timeMilliseconds: number, x: number, z: number) {
  const phase = waterAnimationPhase(timeMilliseconds, x, z);
  const radians = phase * Math.PI * 2;
  return {
    phase,
    /** Subtle enough not to expose gaps between voxel faces. */
    heightOffset: Math.sin(radians) * 0.025 + Math.sin(radians * 0.47 + x * 0.31 - z * 0.23) * 0.012,
    uvOffset: {
      u: Math.sin(radians * 0.73) * 0.018,
      v: Math.cos(radians * 0.61) * 0.014,
    },
    shimmer: 0.5 + Math.sin(radians * 1.37 + x * 0.12) * 0.12,
  };
}

export type SwimmerState = Readonly<{
  velocityY: number;
  oxygenSeconds: number;
  drowningAccumulator: number;
  /** Retained sink-speed envelope from a genuine air-to-water impact. */
  entryMomentumSpeed?: number;
  /** A released Space press rearms one controlled breach through the surface. */
  surfaceBreachReady?: boolean;
  /** Remaining time for the current surface-crossing stroke. */
  surfaceBreachSeconds?: number;
  /** Recovery window before held swim input may begin another surface stroke. */
  surfaceStrokeCooldownSeconds?: number;
  /** True only while the slow breathing bob owns near-surface vertical motion. */
  surfaceBobActive?: boolean;
}>;

export type SwimEnvironment = Readonly<{
  /** 0 is dry, 1 is fully submerged. */
  submersion: number;
  headSubmerged: boolean;
  /** True when forward motion is meeting the bank. */
  horizontalCollision: boolean;
  /** Top of the candidate bank relative to the player's feet. */
  shoreLedgeHeight?: number;
  /** Vertical distance from the eyes to the water surface. */
  surfaceGap?: number;
  /** Signed eye clearance above the waterline; negative means submerged. */
  surfaceClearance?: number;
  /** The first submerged step may retain part of a real fall's momentum. */
  enteredFromAir?: boolean;
}>;

export type SwimInput = Readonly<{
  jumpHeld: boolean;
  movingForward: boolean;
  crouching?: boolean;
  /** Sprint-swimming adds an exact multiplier to intentional vertical strokes. */
  sprinting?: boolean;
}>;

export type SwimStep = Readonly<{
  state: SwimmerState;
  damage: number;
  shoreBoosted: boolean;
  horizontalSpeedScale: number;
}>;

export type SwimRules = Readonly<{
  maxOxygenSeconds: number;
  /** Air consumed each submerged second; zero supports temporary water-breathing effects. */
  oxygenDrainPerSecond?: number;
  oxygenRecoveryPerSecond: number;
  drowningIntervalSeconds: number;
  drowningDamage: number;
  buoyancyAcceleration: number;
  /** Downward acceleration applied without player input, Minecraft-style. */
  passiveSinkAcceleration: number;
  /** Prevents passive sinking from becoming a damaging free-fall. */
  maximumSinkSpeed: number;
  crouchSinkAcceleration: number;
  crouchMaximumSinkSpeed: number;
  swimAcceleration: number;
  sprintVerticalMultiplier: number;
  waterDrag: number;
  shoreExitVelocity: number;
  entryMomentumRetention?: number;
  entryMomentumDecayPerSecond: number;
  surfaceBreachVelocity: number;
  surfaceBreachDurationSeconds: number;
  /** Small repeat stroke that keeps the breathing point above water without lifting the body out. */
  surfaceBobVelocity: number;
  /** Eye clearance at which a descending held swimmer begins the next breathing stroke. */
  surfaceBobFloorClearance: number;
  /** Gentle downward acceleration used by the slow maintenance-bob arc. */
  surfaceBobRecoveryAcceleration: number;
  /** Downward recovery after a breach; this creates a real bob instead of a surface clamp. */
  surfaceRecoveryAcceleration: number;
  /** Minimum stroke-to-stroke interval while Space remains held. */
  surfaceStrokeCycleSeconds: number;
}>;

export const DEFAULT_SWIM_RULES: SwimRules = Object.freeze({
  maxOxygenSeconds: 12,
  oxygenDrainPerSecond: 1,
  oxygenRecoveryPerSecond: 4,
  drowningIntervalSeconds: 1.5,
  drowningDamage: 1,
  // A released swimmer settles downward at roughly 1.2 blocks/second. Space
  // comfortably overcomes this and the dedicated shore boost handles banks.
  buoyancyAcceleration: 3.2,
  passiveSinkAcceleration: 4.25,
  maximumSinkSpeed: 2.3,
  crouchSinkAcceleration: 7.5,
  crouchMaximumSinkSpeed: 4.2,
  swimAcceleration: 11.6,
  sprintVerticalMultiplier: 1.2,
  waterDrag: 2.8,
  shoreExitVelocity: 8.15,
  entryMomentumRetention: 0.54,
  entryMomentumDecayPerSecond: 3.6,
  // A surface stroke crosses the air/water boundary briefly. Recovery then
  // descends toward the waterline, where a smaller maintenance stroke keeps
  // the eyes clear while the body remains immersed.
  surfaceBreachVelocity: 3.65,
  surfaceBreachDurationSeconds: 0.14,
  surfaceBobVelocity: 0.98,
  surfaceBobFloorClearance: 0.34,
  surfaceBobRecoveryAcceleration: 1.6,
  surfaceRecoveryAcceleration: 13.5,
  // The cooldown only prevents an immediate retrigger at the bottom of the
  // arc. The gentle bob velocity/acceleration determine the visible cadence.
  surfaceStrokeCycleSeconds: 0.18,
});

/** Pure player-water step; the caller applies returned velocity and damage. */
export function stepSwimming(
  state: SwimmerState,
  input: SwimInput,
  environment: SwimEnvironment,
  deltaSeconds: number,
  rules: SwimRules = DEFAULT_SWIM_RULES,
  gravityG = 1,
): SwimStep {
  if (gravityG !== 1) {
    const g = Math.max(0, Number.isFinite(gravityG) ? gravityG : 1);
    rules = { ...rules, buoyancyAcceleration: rules.buoyancyAcceleration * g,
      passiveSinkAcceleration: rules.passiveSinkAcceleration * g,
      surfaceBobRecoveryAcceleration: rules.surfaceBobRecoveryAcceleration * g,
      surfaceRecoveryAcceleration: rules.surfaceRecoveryAcceleration * g };
  }
  const dt = Math.max(0, Math.min(1, deltaSeconds));
  const submersion = Math.max(0, Math.min(1, environment.submersion));
  let oxygenSeconds = Math.max(0, Math.min(rules.maxOxygenSeconds, state.oxygenSeconds));
  let drowningAccumulator = Math.max(0, state.drowningAccumulator);
  let damage = 0;
  let entryMomentumSpeed = Math.max(0, state.entryMomentumSpeed ?? 0);
  let surfaceBreachReady = state.surfaceBreachReady ?? true;
  let surfaceBreachSeconds = Math.max(0, state.surfaceBreachSeconds ?? 0);
  let surfaceStrokeCooldownSeconds = Math.max(0, state.surfaceStrokeCooldownSeconds ?? 0);
  let surfaceBobActive = state.surfaceBobActive ?? false;
  surfaceStrokeCooldownSeconds = Math.max(0, surfaceStrokeCooldownSeconds - dt);
  if (!input.jumpHeld) {
    surfaceBreachReady = true;
    surfaceBreachSeconds = 0;
    surfaceStrokeCooldownSeconds = 0;
    surfaceBobActive = false;
  } else if (surfaceStrokeCooldownSeconds <= 0
    && (environment.headSubmerged
      || (environment.surfaceClearance ?? Number.NEGATIVE_INFINITY) <= rules.surfaceBobFloorClearance)) {
    // A held swimmer earns another stroke after the complete recovery
    // interval. This catches the bottom of the breathing arc just before the
    // eye sample falls underwater, while the cooldown still prevents a
    // walkable-water elevator.
    surfaceBreachReady = true;
  }

  if (environment.headSubmerged) {
    oxygenSeconds = Math.max(0, oxygenSeconds - dt * Math.max(0, rules.oxygenDrainPerSecond ?? 1));
    if (oxygenSeconds <= 0) {
      drowningAccumulator += dt;
      while (drowningAccumulator >= rules.drowningIntervalSeconds) {
        drowningAccumulator -= rules.drowningIntervalSeconds;
        damage += rules.drowningDamage;
      }
    } else {
      drowningAccumulator = 0;
    }
  } else {
    oxygenSeconds = Math.min(rules.maxOxygenSeconds, oxygenSeconds + rules.oxygenRecoveryPerSecond * dt);
    drowningAccumulator = 0;
  }

  let velocityY = state.velocityY;
  let shoreBoosted = false;
  if (submersion > 0) {
    const ordinaryMaximumSink = input.crouching ? rules.crouchMaximumSinkSpeed : rules.maximumSinkSpeed;
    if (environment.enteredFromAir && velocityY < -ordinaryMaximumSink) {
      entryMomentumSpeed = Math.max(
        entryMomentumSpeed,
        Math.abs(velocityY) * Math.max(0, Math.min(1, rules.entryMomentumRetention ?? 0.54)),
      );
    }
    const slowSurfaceBob = surfaceBobActive && input.jumpHeld && !environment.headSubmerged;
    if (!slowSurfaceBob) {
      velocityY *= Math.exp(-rules.waterDrag * submersion * dt);
      // Water is not an automatic elevator. A small deep-water buoyancy term
      // softens the descent, while an idle player still settles beneath the
      // surface and Space produces an intentional swim stroke.
      velocityY += rules.buoyancyAcceleration * Math.max(0, submersion - 0.84) * dt;
      velocityY -= rules.passiveSinkAcceleration * dt;
    }
    if (input.crouching && !input.jumpHeld) velocityY -= rules.crouchSinkAcceleration * dt;
    const recoveringFromSurfaceStroke = input.jumpHeld && environment.headSubmerged && surfaceStrokeCooldownSeconds > 0;
    if (input.jumpHeld && ((environment.headSubmerged && !recoveringFromSurfaceStroke) || entryMomentumSpeed > ordinaryMaximumSink)) {
      velocityY += rules.swimAcceleration * (input.sprinting ? rules.sprintVerticalMultiplier : 1) * dt;
    }
    if (entryMomentumSpeed > ordinaryMaximumSink) {
      entryMomentumSpeed = Math.max(ordinaryMaximumSink, entryMomentumSpeed - rules.entryMomentumDecayPerSecond * dt);
    }
    const entryMaximumSink = Math.max(ordinaryMaximumSink, entryMomentumSpeed);
    velocityY = Math.max(-entryMaximumSink, velocityY);
    if (velocityY >= -ordinaryMaximumSink + 1e-6) entryMomentumSpeed = 0;

    const ledgeHeight = environment.shoreLedgeHeight ?? Number.POSITIVE_INFINITY;
    const surfaceGap = environment.surfaceGap ?? Number.POSITIVE_INFINITY;
    if (input.jumpHeld && input.movingForward && environment.horizontalCollision && ledgeHeight <= 1.15 && surfaceGap <= 0.9) {
      velocityY = Math.max(velocityY, rules.shoreExitVelocity);
      shoreBoosted = true;
      surfaceBreachReady = false;
      surfaceBreachSeconds = 0;
      surfaceBobActive = false;
    } else if (input.jumpHeld && !environment.headSubmerged && entryMomentumSpeed <= ordinaryMaximumSink) {
      const beginsSurfaceBreach = surfaceBreachReady && velocityY > 0.35;
      const beginsHeldSurfaceBob = surfaceBreachReady
        && surfaceStrokeCooldownSeconds <= 0
        && (environment.surfaceClearance ?? Number.NEGATIVE_INFINITY) <= rules.surfaceBobFloorClearance
        && !beginsSurfaceBreach;
      if (beginsSurfaceBreach) {
        surfaceBreachReady = false;
        surfaceBreachSeconds = rules.surfaceBreachDurationSeconds;
        surfaceStrokeCooldownSeconds = rules.surfaceStrokeCycleSeconds;
        surfaceBobActive = false;
      } else if (beginsHeldSurfaceBob) {
        // Repeating a full breach impulse would climb out of open water. The
        // maintenance stroke reverses only the bottom of the arc, leaving the
        // feet and torso immersed while the breathing point remains clear.
        surfaceBreachReady = false;
        surfaceStrokeCooldownSeconds = rules.surfaceStrokeCycleSeconds;
        surfaceBobActive = true;
        velocityY = Math.max(velocityY, rules.surfaceBobVelocity);
      }
      if (surfaceBreachSeconds > 0) {
        // Preserve a short, deliberate crossing stroke so the feet can clear
        // the water sample and normal air gravity can finish a small hop.
        velocityY = Math.max(velocityY, rules.surfaceBreachVelocity);
        surfaceBreachSeconds = Math.max(0, surfaceBreachSeconds - dt);
      } else if (surfaceBobActive) {
        // The maintenance arc is intentionally much slower than the initial
        // breach. It remains a real rise and fall, but does not inherit deep-
        // water drag/sink forces that previously compressed the cycle.
        velocityY -= rules.surfaceBobRecoveryAcceleration * dt;
      } else {
        // Do not clamp the swimmer to the waterline. A strong but continuous
        // recovery acceleration creates the short above-water arc and the
        // submerged reset that a repeatable swimming bob needs.
        velocityY -= rules.surfaceRecoveryAcceleration * dt;
      }
    }
  }

  return {
    state: {
      velocityY,
      oxygenSeconds,
      drowningAccumulator,
      entryMomentumSpeed,
      surfaceBreachReady,
      surfaceBreachSeconds,
      surfaceStrokeCooldownSeconds,
      surfaceBobActive,
    },
    damage,
    shoreBoosted,
    horizontalSpeedScale: 1 - submersion * 0.38,
  };
}
