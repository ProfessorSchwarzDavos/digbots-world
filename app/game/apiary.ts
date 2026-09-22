import { Item, type InventorySlot, type ItemCode } from "./data";
import { newCreatureOrigins, readCreatureOrigins, validCreatureOrigins, type CreatureOrigins } from "./creature-origins";
import type { LocationId } from "./location-address";

export const APIARY_WORKER_CAP = 8;
/** Exact flower-query footprint used by the live engine and frame preflight. */
export const APIARY_FORAGING_SCAN = Object.freeze({ radius: 5, verticalRadius: 3 });
export const APIARY_CONTAINER_KIND = "apiary" as const;
export const APIARY_NECTAR_CAP = 64;
export const APIARY_HONEY_CAP = 12;
export const APIARY_JELLY_CAP = 12;
export const APIARY_HONEY_CYCLE_SECONDS = 180;
export const APIARY_JELLY_CYCLE_SECONDS = APIARY_HONEY_CYCLE_SECONDS * 4;
export const APIARY_WORKER_GROWTH_SECONDS = 300;

export type BeeRole = "queen" | "worker";
export type StoredCaptureOrb = Readonly<{
  item: typeof Item.CaptureOrb;
  count: 1;
  /** Canonical encoded orb; enough to reconstruct the exact custody record. */
  captureOrb: string;
}>;

export type ApiaryBee = CreatureOrigins & Readonly<{
  id: string;
  role: BeeRole;
  alive: boolean;
  home: boolean;
  outbound: boolean;
  carryingNectar: number;
  lastReturnDay: number;
  disconnectedDay: number | null;
  geneticSeed: number;
  angry: boolean;
  tamed: boolean;
  ownerId: string | null;
  /** Exact custody record while this worker is housed in a player apiary. */
  storedOrb?: StoredCaptureOrb | null;
}>;

export type ApiaryState = Readonly<{
  schema: 1;
  attached: boolean;
  queen: ApiaryBee;
  /** Exact filled Capture Orb stored by a crafted apiary; wild hives use null. */
  queenOrb: InventorySlot | null;
  /** Player-facing queen flight is an opt-in display, not a production switch. */
  queenDisplayEnabled: boolean;
  workers: readonly ApiaryBee[];
  nectar: number;
  honey: number;
  royalJelly: number;
  honeyClock: number;
  jellyClock: number;
  workerGrowthClock: number;
  nextWorkerSerial: number;
}>;

export type DormantApiaryState = Readonly<Omit<ApiaryState, "queen"> & {
  queen: null;
  queenOrb: null;
  queenDisplayEnabled: false;
}>;

export type ApiaryPhase = "day" | "dusk" | "night";
export type ApiaryEvent =
  | "workers-departed"
  | "workers-returned"
  | "worker-created"
  | "worker-disconnected"
  | "worker-died"
  | "honey-ready"
  | "royal-jelly-ready"
  | "detached"
  | "queen-dead";

export type ApiaryStepInput = Readonly<{
  phase: ApiaryPhase;
  nearbyFlowers: number;
  attached: boolean;
  deltaSeconds: number;
  /** Monotonic world-day index. Used only for bounded missing-worker recovery. */
  worldDay?: number;
  /** False models a worker that cannot path home or whose home chunk is absent. */
  workersCanReturn?: boolean;
  /** Explicit birth context only; never used to fill existing residents. */
  creationLocationId?: LocationId;
}>;

export type DetachedApiary = Readonly<{
  queen: ApiaryBee | null;
  workers: readonly ApiaryBee[];
  storedNectar: number;
}>;

export type BrokenApiary = Readonly<{
  drops: readonly InventorySlot[];
  released: DetachedApiary;
}>;

export type EmptyApiaryBlock = DormantApiaryState;
export type ApiaryBlockState = ApiaryState | DormantApiaryState;

export const createEmptyApiaryBlock = (): EmptyApiaryBlock => ({
  schema: 1,
  attached: true,
  queen: null,
  queenOrb: null,
  queenDisplayEnabled: false,
  workers: [],
  nectar: 0,
  honey: 0,
  royalJelly: 0,
  honeyClock: 0,
  jellyClock: 0,
  workerGrowthClock: 0,
  nextWorkerSerial: 0,
});

/** Explicit Queen Cell insertion path for a freshly placed crafted apiary. */
export function insertQueenCellIntoApiary(
  apiary: EmptyApiaryBlock,
  item: ItemCode,
  queenId: string,
  seed = 1,
  worldDay = 0,
  creationLocationId?: LocationId,
) {
  if (!apiary.attached || item !== Item.QueenCell) return null;
  const next = createApiary(queenId, [], seed, worldDay);
  return creationLocationId === undefined ? next
    : { ...next, queen: { ...next.queen, ...newCreatureOrigins(creationLocationId, false) } };
}

/** A worker removed from an apiary becomes a husbandry transfer capsule. */
export function captureWorkerBeeItem(worker: ApiaryBee): InventorySlot | null {
  if (!worker.alive || worker.role !== "worker") return null;
  if (worker.storedOrb?.item === Item.CaptureOrb && worker.storedOrb.count === 1
    && typeof worker.storedOrb.captureOrb === "string") {
    return {
      item: Item.CaptureOrb,
      count: 1,
      metadata: { captureOrb: worker.storedOrb.captureOrb },
    };
  }
  return {
    item: Item.WorkerBee,
    count: 1,
    metadata: {
      beeId: worker.id,
      geneticSeed: worker.geneticSeed,
      apiaryBee: JSON.stringify({ ...worker, home: false, outbound: false, carryingNectar: 0 }),
    },
  };
}

const bee = (id: string, role: BeeRole, geneticSeed: number, day = 0): ApiaryBee => ({
  id: id.slice(0, 80),
  role,
  alive: true,
  home: true,
  outbound: false,
  carryingNectar: 0,
  lastReturnDay: day,
  disconnectedDay: null,
  geneticSeed: geneticSeed >>> 0,
  angry: false,
  tamed: false,
  ownerId: null,
});

function normalizeApiaryBee(value: unknown, expectedRole?: BeeRole): ApiaryBee | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ApiaryBee>;
  if (typeof raw.id !== "string" || raw.id.length === 0 || raw.id.length > 80
    || (raw.role !== "queen" && raw.role !== "worker") || (expectedRole && raw.role !== expectedRole)
    || typeof raw.alive !== "boolean" || typeof raw.geneticSeed !== "number" || !Number.isFinite(raw.geneticSeed)
    || (raw.ownerId !== null && typeof raw.ownerId !== "string") || !validCreatureOrigins(raw)) return null;
  const storedOrb = raw.storedOrb && typeof raw.storedOrb === "object"
    && raw.storedOrb.item === Item.CaptureOrb && raw.storedOrb.count === 1
    && typeof raw.storedOrb.captureOrb === "string"
    && raw.storedOrb.captureOrb.length <= 64_000
    ? { item: Item.CaptureOrb, count: 1, captureOrb: raw.storedOrb.captureOrb } as const
    : null;
  return {
    ...readCreatureOrigins(raw),
    id: raw.id,
    role: raw.role,
    alive: raw.alive,
    home: raw.home === true,
    outbound: raw.outbound === true,
    carryingNectar: Math.max(0, Math.min(4, Number(raw.carryingNectar) || 0)),
    lastReturnDay: Math.max(0, Math.floor(Number(raw.lastReturnDay) || 0)),
    disconnectedDay: raw.disconnectedDay === null || raw.disconnectedDay === undefined
      ? null : Math.max(0, Math.floor(Number(raw.disconnectedDay) || 0)),
    geneticSeed: Math.trunc(raw.geneticSeed) >>> 0,
    angry: raw.angry === true,
    tamed: raw.tamed === true,
    ownerId: typeof raw.ownerId === "string" ? raw.ownerId.slice(0, 160) : null,
    ...(storedOrb ? { storedOrb } : {}),
  };
}

export function workerBeeFromInventorySlot(slot: InventorySlot | null | undefined): ApiaryBee | null {
  if (!slot || slot.item !== Item.WorkerBee || slot.count <= 0) return null;
  if (typeof slot.metadata?.apiaryBee === "string") {
    try { return normalizeApiaryBee(JSON.parse(slot.metadata.apiaryBee), "worker"); }
    catch { return null; }
  }
  const id = typeof slot.metadata?.beeId === "string" ? slot.metadata.beeId : "worker-bee";
  const seed = Number.isFinite(slot.metadata?.geneticSeed) ? Number(slot.metadata?.geneticSeed) : 1;
  return bee(id, "worker", seed);
}

export function apiaryIsFriendly(state: ApiaryState, actorId: string) {
  return state.queen.alive && !state.queen.angry
    && (!state.queen.tamed || state.queen.ownerId === null || state.queen.ownerId === actorId);
}

export type ApiaryBeeTransferReason = "ok" | "wrong-role" | "occupied" | "not-friendly" | "full" | "away" | "workers-present" | "missing";

export function insertApiaryBee(
  state: ApiaryBlockState,
  resident: ApiaryBee,
  actorId: string,
  worldDay = 0,
): Readonly<{ state: ApiaryBlockState; inserted: boolean; reason: ApiaryBeeTransferReason }> {
  const normalized = normalizeApiaryBee(resident);
  if (!normalized?.alive) return { state, inserted: false, reason: "missing" };
  if (state.queen === null) {
    if (normalized.role !== "queen") return { state, inserted: false, reason: "wrong-role" };
    if (normalized.angry || (normalized.tamed && normalized.ownerId !== null && normalized.ownerId !== actorId)) {
      return { state, inserted: false, reason: "not-friendly" };
    }
    const created = createApiary(normalized.id, [], normalized.geneticSeed, worldDay);
    return {
      inserted: true,
      reason: "ok",
      state: {
        ...state,
        queenOrb: null,
        queenDisplayEnabled: false,
        queen: {
          ...created.queen,
          ...normalized,
          role: "queen",
          alive: true,
          home: true,
          outbound: false,
          carryingNectar: 0,
          lastReturnDay: worldDay,
          disconnectedDay: null,
          angry: false,
        },
      },
    };
  }
  if (normalized.role !== "worker") return { state, inserted: false, reason: "occupied" };
  if (!apiaryIsFriendly(state, actorId)) return { state, inserted: false, reason: "not-friendly" };
  const living = livingApiaryWorkers(state);
  if (living.some((worker) => worker.id === normalized.id) || state.queen.id === normalized.id) {
    return { state, inserted: false, reason: "occupied" };
  }
  if (living.length >= APIARY_WORKER_CAP) return { state, inserted: false, reason: "full" };
  const worker: ApiaryBee = {
    ...normalized,
    role: "worker",
    alive: true,
    home: true,
    outbound: false,
    carryingNectar: 0,
    lastReturnDay: worldDay,
    disconnectedDay: null,
    angry: false,
  };
  const vacant = state.workers.findIndex((candidate) => !candidate.alive);
  const workers = vacant >= 0
    ? state.workers.map((candidate, index) => index === vacant ? worker : candidate)
    : [...state.workers, worker];
  return { state: { ...state, workers }, inserted: true, reason: "ok" };
}

export function extractApiaryBee(
  state: ApiaryBlockState,
  beeId: string,
  actorId: string,
): Readonly<{ state: ApiaryBlockState; bee: ApiaryBee | null; reason: ApiaryBeeTransferReason }> {
  if (state.queen === null) return { state, bee: null, reason: "missing" };
  if (!apiaryIsFriendly(state, actorId)) return { state, bee: null, reason: "not-friendly" };
  if (state.queen.id === beeId) {
    return {
      state: {
        ...state,
        queen: null,
        queenOrb: null,
        queenDisplayEnabled: false,
      },
      bee: { ...state.queen, home: false, outbound: false, carryingNectar: 0 },
      reason: "ok",
    };
  }
  const worker = state.workers.find((candidate) => candidate.id === beeId && candidate.alive);
  if (!worker) return { state, bee: null, reason: "missing" };
  if (!worker.home || worker.outbound) return { state, bee: null, reason: "away" };
  return {
    state: { ...state, workers: state.workers.filter((candidate) => candidate.id !== beeId) },
    bee: { ...worker, home: false, outbound: false, carryingNectar: 0 },
    reason: "ok",
  };
}

/** A valid crafted apiary starts with one queen and any number of workers up to eight. */
export function createApiary(queenId: string, workerIds: readonly string[] = [], seed = 1, worldDay = 0): ApiaryState {
  if (workerIds.length > APIARY_WORKER_CAP) throw new Error(`An apiary holds at most ${APIARY_WORKER_CAP} workers.`);
  if (new Set([queenId, ...workerIds]).size !== workerIds.length + 1) throw new Error("Apiary bee ids must be unique.");
  return {
    schema: 1,
    attached: true,
    queen: bee(queenId, "queen", seed ^ 0x9e3779b9, worldDay),
    queenOrb: null,
    queenDisplayEnabled: false,
    workers: workerIds.map((id, index) => bee(id, "worker", seed + index * 977, worldDay)),
    nectar: 0,
    honey: 0,
    royalJelly: 0,
    honeyClock: 0,
    jellyClock: 0,
    workerGrowthClock: 0,
    nextWorkerSerial: workerIds.length,
  };
}

/** Convenience for authored hives and tests that intentionally begin at full strength. */
export function createStockedApiary(queenId: string, workerIds: readonly string[], seed = 1): ApiaryState {
  if (workerIds.length !== APIARY_WORKER_CAP) throw new Error(`A stocked apiary requires exactly ${APIARY_WORKER_CAP} workers.`);
  return createApiary(queenId, workerIds, seed);
}

const hashUnit = (seed: string | number, salt: string | number) => {
  const text = `${seed}:${salt}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
};

/** Deterministic natural hive population, including genuinely queen-only hives. */
export function createWildApiary(seed: string | number, worldDay = 0) {
  const count = Math.floor(hashUnit(seed, "wild-apiary-workers") * (APIARY_WORKER_CAP + 1));
  return {
    ...createApiary(`wild-queen-${seed}`, Array.from({ length: count }, (_, index) => `wild-worker-${seed}-${index}`),
      Math.floor(hashUnit(seed, "wild-apiary-genetics") * 0xffffffff), worldDay),
    queenDisplayEnabled: true,
  };
}

export function setApiaryQueenOrb(state: ApiaryState, queenOrb: InventorySlot | null): ApiaryState {
  return { ...state, queenOrb, queenDisplayEnabled: false };
}

export function setApiaryQueenDisplay(state: ApiaryState, enabled: boolean): ApiaryState {
  return { ...state, queenDisplayEnabled: Boolean(enabled) };
}

export function livingApiaryWorkers(state: ApiaryState) {
  return state.workers.filter((worker) => worker.alive);
}

export function connectedApiaryWorkers(state: ApiaryState) {
  return livingApiaryWorkers(state).filter((worker) => worker.disconnectedDay === null);
}

export function apiaryCanProduce(state: ApiaryState) {
  return state.attached && state.queen.alive;
}

export function apiaryContainerStatus(state: ApiaryState) {
  const workers = livingApiaryWorkers(state);
  return {
    kind: APIARY_CONTAINER_KIND,
    queen: state.queen.alive,
    workers: workers.length,
    connectedWorkers: workers.filter((worker) => worker.disconnectedDay === null).length,
    outboundWorkers: workers.filter((worker) => worker.outbound).length,
    workerCapacity: APIARY_WORKER_CAP,
    nectar: state.nectar,
    nectarCapacity: APIARY_NECTAR_CAP,
    honey: state.honey,
    honeyCapacity: APIARY_HONEY_CAP,
    jelly: state.royalJelly,
    jellyCapacity: APIARY_JELLY_CAP,
    honeyProgress: Math.min(1, state.honeyClock / APIARY_HONEY_CYCLE_SECONDS),
    jellyProgress: Math.min(1, state.jellyClock / APIARY_JELLY_CYCLE_SECONDS),
    workerProgress: Math.min(1, state.workerGrowthClock / APIARY_WORKER_GROWTH_SECONDS),
    attached: state.attached,
  } as const;
}

export function killApiaryBee(state: ApiaryState, beeId: string): { state: ApiaryState; events: ApiaryEvent[] } {
  if (state.queen.id === beeId && state.queen.alive) {
    return { state: { ...state, queen: { ...state.queen, alive: false, home: false, outbound: false } }, events: ["queen-dead"] };
  }
  return {
    state: { ...state, workers: state.workers.map((worker) => worker.id === beeId ? { ...worker, alive: false, home: false, outbound: false } : worker) },
    events: [],
  };
}

export function detachApiary(state: ApiaryState, angry = false): { state: ApiaryState; released: DetachedApiary; events: ApiaryEvent[] } {
  const release = (value: ApiaryBee) => ({ ...value, home: false, outbound: false, angry });
  const released = {
    queen: state.queen.alive ? release(state.queen) : null,
    workers: livingApiaryWorkers(state).map(release),
    storedNectar: state.nectar,
  };
  return {
    state: {
      ...state,
      attached: false,
      queen: { ...state.queen, home: false, outbound: false },
      workers: state.workers.map((worker) => ({ ...worker, home: false, outbound: false })),
    },
    released,
    events: ["detached"],
  };
}

/** Breaking a hive preserves its products and releases every survivor in an angry state. */
export function breakApiary(state: ApiaryState): BrokenApiary {
  const detached = detachApiary(state, true);
  const drops: InventorySlot[] = [];
  if (state.honey > 0) drops.push({ item: Item.HoneyJar, count: state.honey });
  if (state.royalJelly > 0) drops.push({ item: Item.RoyalJelly, count: state.royalJelly });
  return { drops, released: detached.released };
}

const addWorker = (state: ApiaryState, worldDay: number, creationLocationId?: LocationId): ApiaryState => {
  const serial = state.nextWorkerSerial;
  const worker = { ...bee(`${state.queen.id}-worker-${serial}`, "worker", state.queen.geneticSeed + serial * 977, worldDay),
    ...(creationLocationId === undefined ? {} : newCreatureOrigins(creationLocationId, false)) };
  const vacant = state.workers.findIndex((candidate) => !candidate.alive);
  const workers = vacant >= 0
    ? state.workers.map((candidate, index) => index === vacant ? worker : candidate)
    : [...state.workers, worker];
  return { ...state, workers, nextWorkerSerial: serial + 1 };
};

/**
 * Bounded O(8) apiary simulation. Queens bootstrap a hive, outbound workers
 * return nectar at dusk, and missing workers disconnect after one day then die
 * after two additional days without a successful return.
 */
export function stepApiary(state: ApiaryState, input: ApiaryStepInput): { state: ApiaryState; events: ApiaryEvent[] } {
  if (!input.attached && state.attached) {
    const detached = detachApiary(state);
    return { state: detached.state, events: detached.events };
  }
  const dt = Math.max(0, Math.min(3600, input.deltaSeconds));
  const worldDay = Math.max(0, Math.floor(input.worldDay ?? 0));
  const canReturn = input.workersCanReturn !== false;
  const events: ApiaryEvent[] = [];
  let returnedNectar = 0;
  let departed = false;
  let returned = false;
  const workers = state.workers.map((worker): ApiaryBee => {
    if (!worker.alive) return worker;
    if (input.phase === "day" && worker.disconnectedDay === null) {
      departed ||= worker.home;
      const flowerShare = Math.min(1, Math.max(0, input.nearbyFlowers) / Math.max(1, connectedApiaryWorkers(state).length));
      return { ...worker, home: false, outbound: true, carryingNectar: Math.min(4, worker.carryingNectar + dt / 45 * flowerShare) };
    }
    if (input.phase !== "day" && worker.outbound && canReturn) {
      returned = true;
      returnedNectar += worker.carryingNectar;
      return { ...worker, home: true, outbound: false, carryingNectar: 0, lastReturnDay: worldDay, disconnectedDay: null };
    }
    if (input.phase !== "day" && worker.outbound && !canReturn) {
      const disconnectedDay = worker.disconnectedDay ?? (worldDay - worker.lastReturnDay >= 1 ? worldDay : null);
      if (worker.disconnectedDay === null && disconnectedDay !== null) events.push("worker-disconnected");
      if (disconnectedDay !== null && worldDay - disconnectedDay >= 2) {
        events.push("worker-died");
        return { ...worker, alive: false, home: false, outbound: false, disconnectedDay };
      }
      return { ...worker, home: false, outbound: true, disconnectedDay };
    }
    return worker;
  });
  if (departed) events.push("workers-departed");
  if (returned) events.push("workers-returned");

  let next: ApiaryState = {
    ...state,
    attached: input.attached,
    workers,
    // A queen alone gathers a trickle; worker nectar is delivered only on return.
    nectar: Math.min(APIARY_NECTAR_CAP, state.nectar + returnedNectar + (state.queen.alive ? dt / 90 : 0)),
  };
  if (!apiaryCanProduce(next)) return { state: next, events };

  let workerGrowthClock = next.workerGrowthClock + dt;
  let living = livingApiaryWorkers(next).length;
  const growthCycles = Math.min(APIARY_WORKER_CAP, Math.floor(workerGrowthClock / APIARY_WORKER_GROWTH_SECONDS));
  workerGrowthClock -= growthCycles * APIARY_WORKER_GROWTH_SECONDS;
  for (let cycle = 0; cycle < growthCycles && living < APIARY_WORKER_CAP; cycle += 1) {
    next = addWorker(next, worldDay, input.creationLocationId);
    living += 1;
    events.push("worker-created");
  }

  // Queen-only production is 1/4 speed; each connected worker adds 3/4 speed.
  const activeWorkers = connectedApiaryWorkers(next).filter((worker) => worker.home).length;
  const productionScale = 0.25 + activeWorkers * 0.75;
  let honeyClock = next.honeyClock + dt * productionScale;
  let jellyClock = next.jellyClock + dt * productionScale;
  let nectar = next.nectar;
  let honey = next.honey;
  let royalJelly = next.royalJelly;
  const honeyCycles = Math.min(64, Math.floor(honeyClock / APIARY_HONEY_CYCLE_SECONDS));
  honeyClock -= honeyCycles * APIARY_HONEY_CYCLE_SECONDS;
  for (let cycle = 0; cycle < honeyCycles && honey < APIARY_HONEY_CAP && nectar >= 4; cycle += 1) {
    nectar -= 4;
    honey += 1;
    events.push("honey-ready");
  }
  const jellyCycles = Math.min(64, Math.floor(jellyClock / APIARY_JELLY_CYCLE_SECONDS));
  jellyClock -= jellyCycles * APIARY_JELLY_CYCLE_SECONDS;
  for (let cycle = 0; cycle < jellyCycles && royalJelly < APIARY_JELLY_CAP && nectar >= 10 && living >= 6; cycle += 1) {
    nectar -= 10;
    royalJelly += 1;
    events.push("royal-jelly-ready");
  }
  return { state: { ...next, nectar, honey, royalJelly, honeyClock, jellyClock, workerGrowthClock }, events };
}

export function harvestApiary(state: ApiaryState): { state: ApiaryState; drops: InventorySlot[] } {
  const drops: InventorySlot[] = [];
  if (state.honey > 0) drops.push({ item: Item.HoneyJar, count: state.honey });
  if (state.royalJelly > 0) drops.push({ item: Item.RoyalJelly, count: state.royalJelly });
  return { state: { ...state, honey: 0, royalJelly: 0 }, drops };
}

export function canCatchHiveQueen(health: number, maxHealth: number, tool: "net" | "capture-orb") {
  if (maxHealth <= 0) return false;
  return tool === "capture-orb" ? health <= 1 || health <= maxHealth * 0.4 : health < maxHealth / 2;
}

export function tameHiveQueen(queen: ApiaryBee, item: ItemCode, ownerId: string): ApiaryBee {
  if (!queen.alive || queen.role !== "queen" || item !== Item.RoyalJelly) return queen;
  return { ...queen, tamed: true, ownerId, angry: false };
}

export function beeStingProfile(bee: Pick<ApiaryBee, "role" | "tamed" | "ownerId">, ownerAttacked = false) {
  const defendsOwner = bee.tamed && bee.ownerId !== null && ownerAttacked;
  return { damage: bee.role === "queen" ? 3 : 1, cooldownSeconds: bee.role === "queen" ? 0.9 : 1.4, defendsOwner } as const;
}

export type WorkerForagingPlan = Readonly<{
  mode: "seek-flower" | "land" | "return" | "idle";
  target: Readonly<{ x: number; y: number; z: number }>;
  collectNectar: boolean;
}>;

/** Pure worker movement decision used by both wild bees and apiary residents. */
export function planWorkerForaging(input: Readonly<{
  phase: ApiaryPhase;
  position: Readonly<{ x: number; y: number; z: number }>;
  hive: Readonly<{ x: number; y: number; z: number }>;
  flowers: readonly Readonly<{ x: number; y: number; z: number }>[];
  carryingNectar: number;
}>): WorkerForagingPlan {
  if (input.phase !== "day" || input.carryingNectar >= 4 || input.flowers.length === 0) {
    return { mode: input.phase === "day" && input.flowers.length === 0 ? "idle" : "return", target: input.hive, collectNectar: false };
  }
  const flower = [...input.flowers].sort((a, b) =>
    Math.hypot(a.x - input.position.x, a.y - input.position.y, a.z - input.position.z)
      - Math.hypot(b.x - input.position.x, b.y - input.position.y, b.z - input.position.z)
      || a.x - b.x || a.z - b.z)[0];
  const distance = Math.hypot(flower.x - input.position.x, flower.y - input.position.y, flower.z - input.position.z);
  return { mode: distance <= 0.22 ? "land" : "seek-flower", target: flower, collectNectar: distance <= 0.22 };
}
