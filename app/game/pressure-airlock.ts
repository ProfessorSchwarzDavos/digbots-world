/** Pure host-side policy. The host commits next state, energy, gas and door effects
 * atomically after checking expectedSequence; never execute effects on a guest.
 * Repeating a call with the same inputs produces the same transaction. Gas and
 * collision remain authoritative in the host; this module owns neither store. */
export const AIRLOCK_PHASES = [
  "idle-inner-safe", "seal-inner", "verify-chamber-topology",
  "equalize/recover-to-exterior-target", "unlock-outer", "occupied-open-outer",
  "seal-outer", "equalize-to-interior-target", "unlock-inner", "fault",
] as const;
export type AirlockPhase = typeof AIRLOCK_PHASES[number];
export const AIRLOCK_SAFE_DELTA_PA = 5_000;
export const AIRLOCK_OVERRIDE_HOLD_MS = 3_000;
export const AIRLOCK_MANUAL_HOLD_MS = 8_000;
export const AIRLOCK_PHASE_TIMEOUT_MS = 30_000;
export const AIRLOCK_OPEN_TIMEOUT_MS = 120_000;
const MAX_COUNTER = 2_147_483_647;

export interface AirlockLinks {
  controllerKey: string;
  innerDoorKey: string;
  outerDoorKey: string;
  /** Opaque stable zone references, preferably linked seed-cell keys. Resolve
   * current membership each tick; do not persist a derived topology hash here.
   * An exterior atmosphere is represented by the explicit reference "exterior". */
  chamberZoneId: string;
  interiorZoneId: string;
  exteriorZoneId: string;
  recoveryPumpKey: string;
  reserveKey: string;
}
export type AirlockError = "malformed-save" | "invalid-observation" | "invalid-time"
  | "broken-link" | "topology-stale" | "power-failure" | "both-doors-open"
  | "door-obstructed" | "unsafe-differential" | "reserve-full"
  | "phase-timeout" | "sequence-exhausted";
export interface AirlockState {
  version: 1;
  links: AirlockLinks | null;
  phase: AirlockPhase;
  sequence: number;
  cycleElapsedMs: number;
  phaseElapsedMs: number;
  /** A completed safe mechanical crank provides a bounded, saved open dwell. */
  manualDwellMs: number;
  recoveryVerified: boolean;
  error: AirlockError | null;
}
export interface AirlockObservation {
  linksIntact: boolean;
  topologyCurrent: boolean;
  powerAvailableJ: number;
  chamberPressurePa: number;
  interiorPressurePa: number;
  exteriorPressurePa: number;
  innerDoorOpen: boolean;
  outerDoorOpen: boolean;
  innerDoorObstructed: boolean;
  outerDoorObstructed: boolean;
  occupants: number;
  /** Gas still requiring capture before exterior opening, recomputed by host
   * against exterior target, including gas added by occupants since last step. */
  recoveryRequiredMmol: number;
  reserveRoomMmol: number;
  /** Host-measured continuous hold of THIS command and THIS door, reset on
   * release, focus/ownership loss or command change. Never copy client heldMs. */
  hostValidatedHeldMs: number;
}
export type AirlockCommandKind = "cycle-out" | "return-in" | "reset"
  | "manual-open-inner" | "manual-open-outer"
  | "dangerous-open-inner" | "dangerous-open-outer";
export interface AirlockCommand { kind: AirlockCommandKind; expectedSequence: number }
export type AirlockEffect =
  | { kind: "close-door" | "lock-door" | "open-door" | "unlock-door"; doorKey: string }
  | { kind: "recover"; pumpKey: string; chamberZoneId: string; reserveKey: string; maxMmol: number }
  | { kind: "equalize"; chamberZoneId: string; targetZoneId: string; maxMmol: number }
  | { kind: "decompress"; chamberZoneId: string; targetZoneId: string; doorKey: string };
export interface AirlockResult {
  state: AirlockState;
  commands: AirlockEffect[];
  energyCostJ: number;
  expectedSequence: number;
  /** A rejected command has no effects and must not advance the host sequence. */
  accepted: boolean;
  reason?: "stale-command" | "invalid-command" | "wrong-phase" | "hold-required";
}

const errors: readonly AirlockError[] = ["malformed-save", "invalid-observation", "invalid-time",
  "broken-link", "topology-stale", "power-failure", "both-doors-open", "door-obstructed",
  "unsafe-differential", "reserve-full", "phase-timeout", "sequence-exhausted"];
const kinds: readonly AirlockCommandKind[] = ["cycle-out", "return-in", "reset", "manual-open-inner",
  "manual-open-outer", "dangerous-open-inner", "dangerous-open-outer"];
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, names: readonly string[]): boolean {
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === names.length && ownKeys.every((name) => typeof name === "string" && names.includes(name));
}
function integer(value: unknown, max = MAX_COUNTER): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max;
}
function key(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 160 && value.trim() === value;
}
export function parseAirlockLinks(value: unknown): AirlockLinks | null {
  if (!record(value)) return null;
  const names = ["controllerKey", "innerDoorKey", "outerDoorKey", "chamberZoneId", "interiorZoneId",
    "exteriorZoneId", "recoveryPumpKey", "reserveKey"] as const;
  if (!exactKeys(value, names) || !names.every((name) => key(value[name]))) return null;
  if (new Set([value.innerDoorKey, value.outerDoorKey, value.controllerKey, value.recoveryPumpKey, value.reserveKey]).size !== 5
    || new Set([value.chamberZoneId, value.interiorZoneId, value.exteriorZoneId]).size !== 3) return null;
  return Object.fromEntries(names.map((name) => [name, value[name]])) as unknown as AirlockLinks;
}
export function parseAirlockCommand(value: unknown): AirlockCommand | null {
  if (!record(value) || !exactKeys(value, ["kind", "expectedSequence"])
    || !kinds.includes(value.kind as AirlockCommandKind) || !integer(value.expectedSequence)) return null;
  return { kind: value.kind as AirlockCommandKind, expectedSequence: value.expectedSequence };
}
export function parseAirlockObservation(value: unknown): AirlockObservation | null {
  if (!record(value)) return null;
  const bools = ["linksIntact", "topologyCurrent", "innerDoorOpen", "outerDoorOpen",
    "innerDoorObstructed", "outerDoorObstructed"] as const;
  const ints = ["powerAvailableJ", "chamberPressurePa", "interiorPressurePa", "exteriorPressurePa",
    "occupants", "recoveryRequiredMmol", "reserveRoomMmol", "hostValidatedHeldMs"] as const;
  if (!exactKeys(value, [...bools, ...ints]) || !bools.every((name) => typeof value[name] === "boolean")
    || !ints.every((name) => integer(value[name]))) return null;
  return Object.fromEntries([...bools, ...ints].map((name) => [name, value[name]])) as unknown as AirlockObservation;
}
function initial(links: AirlockLinks | null): AirlockState {
  return { version: 1, links, phase: links ? "idle-inner-safe" : "fault", sequence: 0,
    cycleElapsedMs: 0, phaseElapsedMs: 0, manualDwellMs: 0, recoveryVerified: false, error: links ? null : "malformed-save" };
}
export function createAirlockState(links: AirlockLinks): AirlockState {
  return initial(parseAirlockLinks(links));
}
/** Absent and malformed saves both fail closed. Creation is always explicit.
 * Valid saves retain the exact phase and clocks; live observations are checked
 * again before any resumed opening or transfer. Holds are deliberately unsaved. */
export function normalizeAirlockState(value: unknown): AirlockState {
  const links = record(value) ? parseAirlockLinks(value.links) : null;
  if (!record(value) || !exactKeys(value, ["version", "links", "phase", "sequence", "cycleElapsedMs",
    "phaseElapsedMs", "manualDwellMs", "recoveryVerified", "error"]) || value.version !== 1 || !links || !AIRLOCK_PHASES.includes(value.phase as AirlockPhase)
    || !integer(value.sequence) || !integer(value.cycleElapsedMs) || !integer(value.phaseElapsedMs)
    || value.phaseElapsedMs > value.cycleElapsedMs || !integer(value.manualDwellMs, 10000) || typeof value.recoveryVerified !== "boolean"
    || !(value.error === null || errors.includes(value.error as AirlockError))
    || (value.phase === "fault") !== (value.error !== null)
    || (["unlock-outer", "occupied-open-outer"].includes(value.phase as string) && !value.recoveryVerified)) {
    // Retain only individually parsed links so known doors can still be sealed.
    return { ...initial(links), sequence: record(value) && integer(value.sequence) ? value.sequence : 0,
      phase: "fault", error: "malformed-save" };
  }
  return { version: 1, links, phase: value.phase as AirlockPhase, sequence: value.sequence,
    cycleElapsedMs: value.cycleElapsedMs, phaseElapsedMs: value.phaseElapsedMs, manualDwellMs: value.manualDwellMs,
    recoveryVerified: value.recoveryVerified, error: value.error as AirlockError | null };
}
function closed(links: AirlockLinks | null): AirlockEffect[] {
  return links ? [links.innerDoorKey, links.outerDoorKey].flatMap((doorKey) =>
    [{ kind: "close-door" as const, doorKey }, { kind: "lock-door" as const, doorKey }]) : [];
}
function commit(previous: AirlockState, next: AirlockState, commands: AirlockEffect[] = [], energyCostJ = 0): AirlockResult {
  if (previous.sequence === MAX_COUNTER) return { state: { ...previous, phase: "fault", error: "sequence-exhausted" },
    commands: closed(previous.links), energyCostJ: 0, expectedSequence: previous.sequence, accepted: true };
  return { state: { ...next, sequence: previous.sequence + 1 }, commands, energyCostJ,
    expectedSequence: previous.sequence, accepted: true };
}
function fault(state: AirlockState, error: AirlockError): AirlockResult {
  return commit(state, { ...state, phase: "fault", error, manualDwellMs: 0, recoveryVerified: false }, closed(state.links));
}
function reject(state: AirlockState, reason: AirlockResult["reason"]): AirlockResult {
  return { state, commands: [], energyCostJ: 0, expectedSequence: state.sequence, accepted: false, reason };
}
function phase(state: AirlockState, next: AirlockPhase): AirlockState {
  return { ...state, phase: next, phaseElapsedMs: 0, manualDwellMs: 0, error: null };
}
function health(state: AirlockState, obs: AirlockObservation, allowChecking = false): AirlockError | null {
  if (!state.links || !obs.linksIntact) return "broken-link";
  if (obs.innerDoorOpen && obs.outerDoorOpen) return "both-doors-open";
  if (!obs.topologyCurrent && !allowChecking) return "topology-stale";
  return null;
}
function delta(obs: AirlockObservation, outer: boolean): number {
  return Math.abs(obs.chamberPressurePa - (outer ? obs.exteriorPressurePa : obs.interiorPressurePa));
}

/** Commands must originate from authorized host intents. The caller validates
 * ownership/range/capability and binds hostValidatedHeldMs to this exact intent. */
export function commandAirlock(input: AirlockState, command: AirlockCommand, observation: AirlockObservation): AirlockResult {
  const state = normalizeAirlockState(input);
  const action = parseAirlockCommand(command);
  if (!action) return reject(state, "invalid-command");
  if (action.expectedSequence !== state.sequence) return reject(state, "stale-command");
  const obs = parseAirlockObservation(observation);
  if (!obs) return fault(state, "invalid-observation");
  const error = health(state, obs);
  if (error) return fault(state, error);
  const links = state.links!;
  if (action.kind === "reset") {
    if (obs.innerDoorOpen || obs.outerDoorOpen) return fault(state, "both-doors-open");
    // Recovery resumes inward; reset must not assert that chamber is safe.
    return commit(state, { ...phase(state, "equalize-to-interior-target"), recoveryVerified: false }, closed(links));
  }
  if (action.kind === "cycle-out") {
    if (state.phase !== "idle-inner-safe") return reject(state, "wrong-phase");
    if (obs.outerDoorOpen) return fault(state, "both-doors-open");
    if (obs.powerAvailableJ < 1) return fault(state, "power-failure");
    return commit(state, { ...phase(state, "seal-inner"), cycleElapsedMs: 0, recoveryVerified: false }, closed(links));
  }
  if (action.kind === "return-in") {
    if (state.phase !== "occupied-open-outer") return reject(state, "wrong-phase");
    return commit(state, phase(state, "seal-outer"), closed(links));
  }
  const outer = action.kind.endsWith("outer");
  const dangerous = action.kind.startsWith("dangerous");
  if (obs.hostValidatedHeldMs < (dangerous ? AIRLOCK_OVERRIDE_HOLD_MS : AIRLOCK_MANUAL_HOLD_MS)) return reject(state, "hold-required");
  if (outer ? obs.innerDoorOpen : obs.outerDoorOpen) return fault(state, "both-doors-open");
  if (outer ? obs.outerDoorObstructed : obs.innerDoorObstructed) return fault(state, "door-obstructed");
  if (!dangerous && delta(obs, outer) > AIRLOCK_SAFE_DELTA_PA) return fault(state, "unsafe-differential");
  if (!dangerous && outer && obs.recoveryRequiredMmol > 0) return fault(state, "reserve-full");
  const doorKey = outer ? links.outerDoorKey : links.innerDoorKey;
  const otherDoor = outer ? links.innerDoorKey : links.outerDoorKey;
  const effects: AirlockEffect[] = [{ kind: "close-door", doorKey: otherDoor }, { kind: "lock-door", doorKey: otherDoor }];
  if (dangerous) effects.push({ kind: "decompress", chamberZoneId: links.chamberZoneId,
    targetZoneId: outer ? links.exteriorZoneId : links.interiorZoneId, doorKey });
  effects.push({ kind: "unlock-door", doorKey }, { kind: "open-door", doorKey });
  // Dangerous outer opening intentionally bypasses capture only in this held
  // transaction. Set fault afterward so automatic policy seals on the next tick.
  if (dangerous) return commit(state, { ...state, phase: "fault", error: "unsafe-differential", recoveryVerified: false }, effects);
  return commit(state, { ...phase(state, outer ? "occupied-open-outer" : "idle-inner-safe"),
    manualDwellMs: 10000, recoveryVerified: outer }, effects);
}

export function stepAirlock(input: AirlockState, observation: AirlockObservation, elapsedMs: number): AirlockResult {
  const original = normalizeAirlockState(input);
  if (!integer(elapsedMs, 60_000)) return fault(original, "invalid-time");
  const state = { ...original, cycleElapsedMs: Math.min(MAX_COUNTER, original.cycleElapsedMs + elapsedMs),
    phaseElapsedMs: Math.min(MAX_COUNTER, original.phaseElapsedMs + elapsedMs) };
  const obs = parseAirlockObservation(observation);
  if (!obs) return fault(state, "invalid-observation");
  const openDwell = state.phase === "idle-inner-safe" && obs.innerDoorOpen || state.phase === "occupied-open-outer" && obs.outerDoorOpen;
  const error = health(state, obs, openDwell || ["seal-inner", "seal-outer", "verify-chamber-topology", "fault"].includes(state.phase));
  if (error) return fault(state, error);
  const links = state.links!;
  if (state.phase === "fault") return commit(state, state, closed(links));
  if (state.manualDwellMs > 0 && openDwell) {
    if (obs.topologyCurrent && delta(obs, state.phase === "occupied-open-outer") > AIRLOCK_SAFE_DELTA_PA) return fault(state, "unsafe-differential");
    const remaining = Math.max(0, state.manualDwellMs - elapsedMs);
    if (!remaining) return commit(state, { ...state, manualDwellMs: 0 }, closed(links));
    return commit(state, { ...state, manualDwellMs: remaining }, [{ kind: "lock-door", doorKey: state.phase === "occupied-open-outer" ? links.innerDoorKey : links.outerDoorKey }]);
  }
  if (openDwell && !obs.topologyCurrent && state.phaseElapsedMs >= AIRLOCK_PHASE_TIMEOUT_MS) return fault(state, "topology-stale");
  if (obs.powerAvailableJ < 1) return fault(state, "power-failure");
  // Idle is an intentional unlimited safe dwell; every active phase is bounded.
  // A six-cell chamber can require ~50 s at the finite 5,000 mmol/s pump
  // budget. Sealing/checking still has a short deadline; physical transfer has
  // a bounded two-minute allowance rather than an impossible thirty seconds.
  const timeout = ["occupied-open-outer", "equalize/recover-to-exterior-target", "equalize-to-interior-target"].includes(state.phase) ? AIRLOCK_OPEN_TIMEOUT_MS : AIRLOCK_PHASE_TIMEOUT_MS;
  if (state.phase !== "idle-inner-safe" && state.phaseElapsedMs >= timeout) return fault(state, "phase-timeout");
  if (state.phase === "idle-inner-safe") {
    if (obs.outerDoorOpen) return fault(state, "both-doors-open");
    if (obs.topologyCurrent && obs.innerDoorOpen && delta(obs, false) > AIRLOCK_SAFE_DELTA_PA) return fault(state, "unsafe-differential");
    return commit(state, state, [{ kind: "close-door", doorKey: links.outerDoorKey }, { kind: "lock-door", doorKey: links.outerDoorKey }]);
  }
  if (state.phase === "seal-inner" || state.phase === "seal-outer") {
    if (obs.innerDoorObstructed || obs.outerDoorObstructed) return fault(state, "door-obstructed");
    const next = state.phase === "seal-inner" ? "verify-chamber-topology" : "equalize-to-interior-target";
    const waiting = obs.innerDoorOpen || obs.outerDoorOpen || (state.phase === "seal-outer" && !obs.topologyCurrent);
    return commit(state, waiting ? state : phase(state, next), closed(links));
  }
  if (state.phase === "occupied-open-outer") {
    if (obs.innerDoorOpen) return fault(state, "both-doors-open");
    return commit(state, state, [{ kind: "lock-door", doorKey: links.innerDoorKey }]);
  }
  if (obs.innerDoorOpen || obs.outerDoorOpen) return fault(state, "both-doors-open");
  if (state.phase === "verify-chamber-topology") return commit(state,
    obs.topologyCurrent ? phase(state, "equalize/recover-to-exterior-target") : state, closed(links));
  const outer = state.phase === "equalize/recover-to-exterior-target" || state.phase === "unlock-outer";
  if (state.phase === "unlock-inner" || state.phase === "unlock-outer") {
    if (delta(obs, outer) > AIRLOCK_SAFE_DELTA_PA) return fault(state, "unsafe-differential");
    if (outer && (!state.recoveryVerified || obs.recoveryRequiredMmol !== 0)) return fault(state, "reserve-full");
    if (outer ? obs.outerDoorObstructed : obs.innerDoorObstructed) return fault(state, "door-obstructed");
    if (obs.powerAvailableJ < 10) return fault(state, "power-failure");
    const doorKey = outer ? links.outerDoorKey : links.innerDoorKey;
    return commit(state, phase(state, outer ? "occupied-open-outer" : "idle-inner-safe"),
      [{ kind: "unlock-door", doorKey }, { kind: "open-door", doorKey }], 10);
  }
  if (outer && obs.recoveryRequiredMmol > 0 && obs.reserveRoomMmol === 0) return fault(state, "reserve-full");
  if (delta(obs, outer) <= AIRLOCK_SAFE_DELTA_PA && (!outer || obs.recoveryRequiredMmol === 0)) {
    return commit(state, { ...phase(state, outer ? "unlock-outer" : "unlock-inner"), recoveryVerified: outer });
  }
  // At most 5 mmol/ms and one second's throughput per call. Hosts may move LESS
  // than this budget, must never synthesize unavailable gas, and reobserve next tick.
  const maxMmol = Math.min(Math.min(elapsedMs, 1_000) * 5, obs.powerAvailableJ * 100,
    outer && obs.recoveryRequiredMmol > 0 ? Math.min(obs.recoveryRequiredMmol, obs.reserveRoomMmol) : MAX_COUNTER);
  if (maxMmol === 0) return commit(state, state);
  const effect: AirlockEffect = outer && obs.recoveryRequiredMmol > 0
    ? { kind: "recover", pumpKey: links.recoveryPumpKey, chamberZoneId: links.chamberZoneId, reserveKey: links.reserveKey, maxMmol }
    : { kind: "equalize", chamberZoneId: links.chamberZoneId, targetZoneId: outer ? links.exteriorZoneId : links.interiorZoneId, maxMmol };
  return commit(state, state, [effect], Math.ceil(maxMmol / 100));
}

export interface GateCell { x: number; y: number; z: number }
export interface HangarGateGeometry { anchor: GateCell; axis: "x" | "z"; width: number; height: number }
export type HangarCellObservation = { kind: "unloaded" | "frame" | "clear" | "obstructed" }
  | { kind: "gate-leaf"; anchorKey: string };
export type HangarGateResult = { valid: true; anchorKey: string; frame: GateCell[]; interior: GateCell[] }
  | { valid: false; reason: "invalid-geometry" | "unloaded" | "incomplete-frame" | "obstructed"; cell: GateCell | null };
export function gateCellKey(cell: GateCell): string { return `${cell.x},${cell.y},${cell.z}`; }
export function parseHangarGateGeometry(value: unknown): HangarGateGeometry | null {
  if (!record(value) || !exactKeys(value, ["anchor", "axis", "width", "height"]) || !record(value.anchor)
    || !exactKeys(value.anchor, ["x", "y", "z"]) || !["x", "z"].includes(value.axis as string)
    || !integer(value.width, 9) || value.width < 3 || !integer(value.height, 9) || value.height < 3
    || ![value.anchor.x, value.anchor.y, value.anchor.z].every((v) => typeof v === "number"
      && Number.isSafeInteger(v) && Math.abs(v) <= MAX_COUNTER - 9)) return null;
  return { anchor: { x: value.anchor.x as number, y: value.anchor.y as number, z: value.anchor.z as number },
    axis: value.axis as "x" | "z", width: value.width, height: value.height };
}
/** Anchor is the bottom-left FRAME cell, width/height include both caps.
 * The single-cell-thick vertical rectangle grows +y and +axis. Every frame
 * cell (including four corners, sill and lintel) and interior is inspected.
 * Maximum 81 reads. Foreign leaves and unknown/unloaded cells never validate. */
export function validateHangarGate(geometry: HangarGateGeometry,
  observe: (cell: GateCell) => HangarCellObservation | undefined): HangarGateResult {
  const spec = parseHangarGateGeometry(geometry);
  if (!spec) return { valid: false, reason: "invalid-geometry", cell: null };
  const anchorKey = gateCellKey(spec.anchor);
  const frame: GateCell[] = [];
  const interior: GateCell[] = [];
  for (let y = 0; y < spec.height; y++) for (let across = 0; across < spec.width; across++) {
    const cell = { x: spec.anchor.x + (spec.axis === "x" ? across : 0), y: spec.anchor.y + y,
      z: spec.anchor.z + (spec.axis === "z" ? across : 0) };
    const observed = observe(cell);
    if (!observed || observed.kind === "unloaded") return { valid: false, reason: "unloaded", cell };
    if (y === 0 || y === spec.height - 1 || across === 0 || across === spec.width - 1) {
      if (observed.kind !== "frame") return { valid: false, reason: "incomplete-frame", cell };
      frame.push(cell);
    } else {
      if (observed.kind !== "clear" && !(observed.kind === "gate-leaf" && observed.anchorKey === anchorKey))
        return { valid: false, reason: "obstructed", cell };
      interior.push(cell);
    }
  }
  return { valid: true, anchorKey, frame, interior };
}
