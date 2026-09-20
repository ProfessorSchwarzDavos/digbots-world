import { PowerTopologyCache } from "./wayworks-network";
import { createWorkshop, normalizeWorkshop, workshopRunning, type WorkshopState } from "./wayworks-stores";
import { PRESSURE_CATALOG, type PressureMachineKind } from "./pressure-catalog";
import { SPACEFLIGHT_CATALOG, type SpaceflightMachineKind } from "./spaceflight-catalog";

/** Pure, versioned workshop power runtime. All energy is integer joules. */
export type MachineKind = "hand-dynamo" | "sunplate-array" | "field-battery" | "charging-pedestal" | "grid-cable"
  | "heat-engine" | "wind-rotor" | "waterwheel-generator" | "biofuel-engine" | "grid-battery" | "ship-battery-bank"
  | "powered-crusher" | "enrichment-mill" | "electric-smelter" | "alloy-infuser" | "plate-press" | "precision-sawmill"
  | "fluid-pump" | "fluid-tank" | "gas-tank" | PressureMachineKind | SpaceflightMachineKind;
export type LocalFace = "front" | "back" | "left" | "right" | "top" | "bottom";
export type PortMode = "disabled" | "input" | "output" | "both" | "passive" | "pull" | "service";
export type MachineStatus = "idle" | "disabled" | "generating" | "no-sun" | "buffer-full" | "transferring" | "disconnected" | "invalid-state"
  | "working" | "no-power" | "no-input" | "no-fuel" | "output-blocked" | "no-water" | "no-wind" | "control-off" | "heat-limited"
  | "no-atmospheric-feed" | "filter-exhausted" | "invalid-recipe";
export type MachineState = {
  schema: 1;
  kind: MachineKind;
  locationId: string;
  ownerId: string;
  revision: number;
  facing: number;
  energyJ: number;
  ports: Record<LocalFace, PortMode>;
  enabled: boolean;
  /** Fractional generated joule, denominator 1,000,000 (milliseconds × exposure permille). */
  generationRemainder: number;
  /** Fractional throughput allowance, denominator 1,000 (milliseconds). Never stores whole unused allowance. */
  transferRemainder: number;
  status: MachineStatus;
  /** Additive, separately versioned material/configuration extension. */
  workshop: WorkshopState;
};

export type MachineOperation = { kind: "port"; face: LocalFace; mode: PortMode }
  | { kind: "rotate" } | { kind: "toggle" } | { kind: "crank" };
export type MachineResult = { ok: boolean; state: MachineState; reason: string };
export type PowerNode = { key: string; x: number; y: number; z: number; state: MachineState; solarExposure: number; windExposure?: number; waterFlow?: number };
export const MACHINE_FACES: readonly LocalFace[] = ["front", "back", "left", "right", "top", "bottom"];
export const MAX_POWER_NODES = 256;
export const MAX_POWER_STEP_MS = 1000;
export const HAND_DYNAMO_CRANK_J = 2000;

const CAPACITY: Record<MachineKind, number> = {
  ...Object.fromEntries(Object.entries(SPACEFLIGHT_CATALOG).map(([kind, def]) => [kind, def.joules])) as Record<SpaceflightMachineKind, number>,
  "hand-dynamo": 8000, "sunplate-array": 12000, "field-battery": 120000,
  "charging-pedestal": 60000, "grid-cable": 0,
  "heat-engine": 24000, "wind-rotor": 18000, "waterwheel-generator": 32000, "biofuel-engine": 24000,
  "grid-battery": 1200000, "ship-battery-bank": 12000000,
  "powered-crusher": 32000, "enrichment-mill": 24000, "electric-smelter": 48000, "alloy-infuser": 60000,
  "plate-press": 24000, "precision-sawmill": 24000, "fluid-pump": 16000, "fluid-tank": 0, "gas-tank": 0,
  ...Object.fromEntries(Object.entries(PRESSURE_CATALOG).map(([kind, def]) => [kind, def.joules])) as Record<PressureMachineKind, number>,
};
const RATE: Record<MachineKind, number> = {
  ...Object.fromEntries(Object.entries(SPACEFLIGHT_CATALOG).map(([kind, def]) => [kind, def.watts])) as Record<SpaceflightMachineKind, number>,
  "hand-dynamo": 2000, "sunplate-array": 600, "field-battery": 4000,
  "charging-pedestal": 2000, "grid-cable": 4000,
  "heat-engine": 2400, "wind-rotor": 900, "waterwheel-generator": 1600, "biofuel-engine": 1800,
  "grid-battery": 12000, "ship-battery-bank": 24000,
  "powered-crusher": 4000, "enrichment-mill": 4000, "electric-smelter": 6000, "alloy-infuser": 8000,
  "plate-press": 4000, "precision-sawmill": 4000, "fluid-pump": 2000, "fluid-tank": 0, "gas-tank": 0,
  ...Object.fromEntries(Object.entries(PRESSURE_CATALOG).map(([kind, def]) => [kind, def.watts])) as Record<PressureMachineKind, number>,
};
const STATUSES: readonly MachineStatus[] = ["idle", "disabled", "generating", "no-sun", "buffer-full", "transferring", "disconnected", "invalid-state",
  "working", "no-power", "no-input", "no-fuel", "output-blocked", "no-water", "no-wind", "control-off", "heat-limited",
  "no-atmospheric-feed", "filter-exhausted", "invalid-recipe"];

export function machineCapacity(kind: MachineKind, workshop?: WorkshopState): number { return CAPACITY[kind] * (1 + (workshop?.upgrades.capacity ?? 0)); }
/** Nominal generation (solar), export (dynamo), or shared transport throughput in joules/second. */
export function machineRate(kind: MachineKind): number { return RATE[kind]; }
export function machineGenerator(kind: MachineKind) { return ["hand-dynamo", "sunplate-array", "heat-engine", "wind-rotor", "waterwheel-generator", "biofuel-engine", "hydrogen-turbine", "gas-engine"].includes(kind); }
export function machineBattery(kind: MachineKind) { return ["field-battery", "grid-battery", "ship-battery-bank"].includes(kind); }
function integer(value: unknown, maximum: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.min(maximum, Math.floor(value)) : 0;
}
function facingValue(value: unknown): number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 3 ? value as number : 0;
}
function allowedPort(kind: MachineKind, mode: unknown): mode is PortMode {
  if (mode === "disabled" || mode === "service") return true;
  if (machineGenerator(kind)) return mode === "output" || mode === "passive";
  if (machineBattery(kind) || kind === "grid-cable") return ["input", "output", "both", "passive", "pull"].includes(mode as string);
  return mode === "input" || mode === "pull";
}

export function createMachine(kind: MachineKind, locationId: string, ownerId: string, facing = 0): MachineState {
  const mode: PortMode = machineGenerator(kind) ? "output" : machineBattery(kind) || kind === "grid-cable" ? "both" : "input";
  return {
    schema: 1, kind, locationId, ownerId, revision: 0, facing: facingValue(facing), energyJ: 0,
    ports: Object.fromEntries(MACHINE_FACES.map((face) => [face, mode])) as Record<LocalFace, PortMode>,
    enabled: true, generationRemainder: 0, transferRemainder: 0, status: "idle", workshop: createWorkshop(kind),
  };
}

/** Identity comes from authoritative placement/custody, not the serialized payload. */
export function normalizeMachine(value: unknown, kind: MachineKind, locationId: string, ownerId: string): MachineState {
  const state = createMachine(kind, locationId, ownerId);
  if (!value || typeof value !== "object" || Array.isArray(value)) return state;
  const saved = value as Record<string, unknown>;
  if (saved.schema !== 1 || saved.kind !== kind || saved.locationId !== locationId || saved.ownerId !== ownerId) {
    return { ...state, enabled: false, status: "invalid-state" };
  }
  const ports = saved.ports && typeof saved.ports === "object" ? saved.ports as Record<string, unknown> : {};
  for (const face of MACHINE_FACES) state.ports[face] = allowedPort(kind, ports[face]) ? ports[face] : "disabled";
  state.revision = integer(saved.revision, Number.MAX_SAFE_INTEGER);
  state.facing = facingValue(saved.facing);
  const workshop = normalizeWorkshop(saved.workshop, kind);
  if (workshop) state.workshop = workshop;
  state.energyJ = typeof saved.energyJ === "number" && Number.isFinite(saved.energyJ)
    && saved.energyJ >= 0 && saved.energyJ <= machineCapacity(kind, state.workshop) ? Math.floor(saved.energyJ) : 0;
  state.enabled = saved.enabled === true;
  // Invalid remainder values are discarded, never clamped upward into a future joule.
  state.generationRemainder = ["sunplate-array", "wind-rotor", "waterwheel-generator"].includes(kind) && Number.isInteger(saved.generationRemainder)
    && (saved.generationRemainder as number) >= 0 && (saved.generationRemainder as number) < 1_000_000 ? saved.generationRemainder as number : 0;
  state.transferRemainder = Number.isInteger(saved.transferRemainder)
    && (saved.transferRemainder as number) >= 0 && (saved.transferRemainder as number) < 1000 ? saved.transferRemainder as number : 0;
  state.status = STATUSES.includes(saved.status as MachineStatus) ? saved.status as MachineStatus : "idle";
  if (!workshop) { state.enabled = false; state.status = "invalid-state"; }
  return state;
}

/** World offset points from this block toward its neighbor. Matches block-facing.ts's clockwise rotation. */
export function localFaceForWorldDirection(facing: number, dx: number, dy: number, dz: number): LocalFace {
  if (![dx, dy, dz].every(Number.isInteger) || Math.abs(dx) + Math.abs(dy) + Math.abs(dz) !== 1) {
    throw new RangeError("A machine face requires a unit cardinal offset.");
  }
  if (dy) return dy > 0 ? "top" : "bottom";
  const rotation = facingValue(facing);
  const localX = rotation === 1 ? dz : rotation === 2 ? -dx : rotation === 3 ? -dz : dx;
  const localZ = rotation === 1 ? -dx : rotation === 2 ? -dz : rotation === 3 ? dx : dz;
  return localX ? localX > 0 ? "right" : "left" : localZ > 0 ? "back" : "front";
}

/** Host must additionally authorize actor ownership and rate-limit player effort before calling crank. */
export function configureMachine(state: MachineState, expectedRevision: number, operation: MachineOperation): MachineResult {
  const fail = (reason: string): MachineResult => ({ ok: false, state, reason });
  if (!Object.hasOwn(CAPACITY, state.kind) || !Number.isSafeInteger(state.energyJ)
    || state.energyJ < 0 || state.energyJ > machineCapacity(state.kind, state.workshop)
    || !Number.isSafeInteger(state.revision) || state.revision < 0) return fail("invalid-state");
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== state.revision) return fail("stale-revision");
  if (state.revision >= Number.MAX_SAFE_INTEGER) return fail("revision-exhausted");
  if (!operation || typeof operation !== "object") return fail("invalid-operation");
  const next = { ...state, ports: { ...state.ports } };
  switch (operation.kind) {
    case "port":
      if (!MACHINE_FACES.includes(operation.face) || !allowedPort(state.kind, operation.mode)) return fail("invalid-port");
      if (state.ports[operation.face] === operation.mode) return fail("unchanged");
      next.ports[operation.face] = operation.mode;
      break;
    case "rotate": next.facing = (state.facing + 1) % 4; break;
    case "toggle": next.enabled = !state.enabled; break;
    case "crank":
      if (state.kind !== "hand-dynamo") return fail("not-a-dynamo");
      if (!state.enabled) return fail("disabled");
      if (!workshopRunning(state.workshop)) return fail("control-off");
      if (machineCapacity(state.kind, state.workshop) - state.energyJ < HAND_DYNAMO_CRANK_J) return fail("buffer-full");
      next.energyJ += HAND_DYNAMO_CRANK_J;
      break;
    default: return fail("invalid-operation");
  }
  next.revision += 1;
  next.status = next.enabled ? "idle" : "disabled";
  return { ok: true, state: next, reason: "ok" };
}

export type PowerGridResult = {
  states: Record<string, MachineState>;
  generatedJ: number;
  transferredJ: number;
  elapsedMs: number;
  /** Excess time is intentionally not simulated; callers may submit bounded catch-up steps. */
  discardedMs: number;
  reason: "ok" | "node-limit" | "invalid-node" | "duplicate-node";
  topologyRevision: number;
  networks: readonly { id: string; nodeKeys: readonly string[]; energyJ: number; capacityJ: number }[];
};

/**
 * Cache directed six-face adjacency. Only cables relay in a path.
 * Batteries export their starting energy before generators refill them; batteries do
 * not charge each other. Each node's input/output/relay uses one shared rate budget.
 * Routing is deterministic by key, with batteries preferred over direct charger fill.
 * Oversized or ambiguous graphs fail atomically with no returned state updates.
 */
export function advancePowerGrid(nodes: PowerNode[], elapsedMs: number, topology = new PowerTopologyCache()): PowerGridResult {
  const requestedMs = typeof elapsedMs === "number" && Number.isFinite(elapsedMs) ? Math.max(0, Math.floor(elapsedMs)) : 0;
  const dt = Math.min(MAX_POWER_STEP_MS, requestedMs);
  const result: PowerGridResult = { states: {}, generatedJ: 0, transferredJ: 0, elapsedMs: dt, discardedMs: requestedMs - dt, reason: "ok", topologyRevision: 0, networks: [] };
  if (nodes.length > MAX_POWER_NODES) return { ...result, elapsedMs: 0, discardedMs: requestedMs, reason: "node-limit" };
  const byPosition = new Map<string, PowerNode>();
  const keys = new Set<string>();
  const position = (location: string, x: number, y: number, z: number) => JSON.stringify([location, x, y, z]);
  for (const node of nodes) {
    if (!node || typeof node.key !== "string" || !node.key || ![node.x, node.y, node.z].every(Number.isSafeInteger)
      || !node.state || !Object.hasOwn(CAPACITY, node.state.kind) || typeof node.state.locationId !== "string"
      || !node.state.locationId || typeof node.state.ownerId !== "string" || !node.state.ownerId) {
      return { ...result, elapsedMs: 0, discardedMs: requestedMs, reason: "invalid-node" };
    }
    const coordinate = position(node.state.locationId, node.x, node.y, node.z);
    if (keys.has(node.key) || byPosition.has(coordinate)) return { ...result, elapsedMs: 0, discardedMs: requestedMs, reason: "duplicate-node" };
    keys.add(node.key);
    byPosition.set(coordinate, node);
  }
  const ordered = [...nodes].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const states = new Map<string, MachineState>();
  const budgets = new Map<string, number>();
  const startingEnergy = new Map<string, number>();
  for (const node of ordered) {
    const state = normalizeMachine(node.state, node.state.kind, node.state.locationId, node.state.ownerId);
    states.set(node.key, state);
    startingEnergy.set(node.key, state.energyJ);
    budgets.set(node.key, 0);
    if (!dt) continue;
    state.status = state.enabled ? "idle" : "disabled";
    if (!state.enabled || !workshopRunning(state.workshop) || state.revision >= Number.MAX_SAFE_INTEGER) continue;
    const throughput = machineRate(state.kind) * dt + state.transferRemainder;
    budgets.set(node.key, Math.floor(throughput / 1000));
    state.transferRemainder = throughput % 1000;
    if (!["sunplate-array", "wind-rotor", "waterwheel-generator"].includes(state.kind)) continue;
    const measured = state.kind === "wind-rotor" ? node.windExposure : state.kind === "waterwheel-generator" ? node.waterFlow : node.solarExposure;
    const exposure = typeof measured === "number" && Number.isFinite(measured) ? Math.floor(Math.max(0, Math.min(1, measured)) * 1000) : 0;
    const production = machineRate(state.kind) * exposure * dt + state.generationRemainder;
    const available = Math.floor(production / 1_000_000);
    const generated = Math.min(machineCapacity(state.kind, state.workshop) - state.energyJ, available);
    state.energyJ += generated;
    result.generatedJ += generated;
    state.generationRemainder = state.energyJ >= machineCapacity(state.kind, state.workshop) ? 0 : production % 1_000_000;
    state.status = state.energyJ >= machineCapacity(state.kind, state.workshop) ? "buffer-full" : exposure === 0
      ? state.kind === "wind-rotor" ? "no-wind" : state.kind === "waterwheel-generator" ? "no-water" : "no-sun" : "generating";
  }
  const graph = topology.get(ordered.map((node) => {
    const state = states.get(node.key)!;
    return { key: node.key, x: node.x, y: node.y, z: node.z, kind: state.kind, locationId: state.locationId,
      ownerId: state.ownerId, facing: state.facing, ports: state.ports, channel: state.workshop.channel,
      enabled: state.enabled && workshopRunning(state.workshop) && state.revision < Number.MAX_SAFE_INTEGER };
  }));
  if (!graph.ok) return { ...result, elapsedMs: 0, discardedMs: requestedMs, reason: graph.reason === "revision-exhausted" ? "invalid-node" : graph.reason };
  const edges = graph.edges;
  result.topologyRevision = graph.revision;

  const routeSource = (sourceNode: PowerNode) => {
    const source = states.get(sourceNode.key)!;
    let exportable = machineBattery(source.kind) ? startingEnergy.get(sourceNode.key)! : source.energyJ;
    // Each successful path empties a source or fills/exhausts a destination/cable.
    // <=256 passes bounds even adversarial braided cable graphs.
    for (let pass = 0; pass < MAX_POWER_NODES && exportable > 0 && budgets.get(sourceNode.key)! > 0; pass += 1) {
      const queue = [sourceNode.key];
      const previous = new Map<string, string | null>([[sourceNode.key, null]]);
      const targets: string[] = [];
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const current = queue[cursor];
        for (const next of edges.get(current)!) {
          if (previous.has(next) || budgets.get(next)! <= 0) continue;
          previous.set(next, current);
          const state = states.get(next)!;
          if (state.kind === "grid-cable") queue.push(next);
          else if ((!machineGenerator(state.kind) && (!machineBattery(state.kind) || machineGenerator(source.kind)))
            && state.energyJ < machineCapacity(state.kind, state.workshop)) targets.push(next);
        }
      }
      targets.sort((a, b) => {
        const priority = (key: string) => machineBattery(states.get(key)!.kind) ? 0 : 1;
        return priority(a) - priority(b) || (a < b ? -1 : a > b ? 1 : 0);
      });
      const targetKey = targets[0];
      if (!targetKey) break;
      const target = states.get(targetKey)!;
      const path: string[] = [];
      for (let key: string | null = targetKey; key !== null; key = previous.get(key)!) path.push(key);
      const amount = Math.min(exportable, machineCapacity(target.kind, target.workshop) - target.energyJ, ...path.map((key) => budgets.get(key)!));
      if (amount <= 0) break;
      source.energyJ -= amount;
      target.energyJ += amount;
      exportable -= amount;
      result.transferredJ += amount;
      for (const key of path) {
        budgets.set(key, budgets.get(key)! - amount);
        states.get(key)!.status = "transferring";
      }
    }
    if (source.energyJ > 0 && source.status === "idle" && !edges.get(sourceNode.key)!.length) source.status = "disconnected";
  };
  if (dt) {
    for (const node of ordered) if (machineBattery(node.state.kind)) routeSource(node);
    for (const node of ordered) if (machineGenerator(node.state.kind)) routeSource(node);
  }
  for (const node of ordered) {
    const state = states.get(node.key)!;
    // Revision covers authoritative energy, remainders and control changes; telemetry alone does not invalidate an intent.
    if (state.energyJ !== node.state.energyJ || state.generationRemainder !== node.state.generationRemainder
      || state.transferRemainder !== node.state.transferRemainder) state.revision = Math.min(Number.MAX_SAFE_INTEGER, state.revision + 1);
    Object.defineProperty(result.states, node.key, { value: state, enumerable: true, configurable: true, writable: true });
  }
  result.networks = graph.components.map((component) => ({ ...component,
    energyJ: component.nodeKeys.reduce((sum, key) => sum + states.get(key)!.energyJ, 0),
    capacityJ: component.nodeKeys.reduce((sum, key) => { const state = states.get(key)!; return sum + machineCapacity(state.kind, state.workshop); }, 0),
  }));
  return result;
}
