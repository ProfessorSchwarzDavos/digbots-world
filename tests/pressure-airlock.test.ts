import assert from "node:assert/strict";
import test from "node:test";
import {
  AIRLOCK_PHASES, AIRLOCK_SAFE_DELTA_PA, AIRLOCK_OVERRIDE_HOLD_MS, AIRLOCK_MANUAL_HOLD_MS,
  createAirlockState, normalizeAirlockState, commandAirlock, stepAirlock,
  parseAirlockCommand, parseAirlockLinks, parseAirlockObservation,
  parseHangarGateGeometry, validateHangarGate, gateCellKey,
  type AirlockState, type AirlockPhase, type AirlockObservation, type AirlockLinks,
  type AirlockCommandKind, type HangarGateGeometry, type HangarCellObservation,
} from "../app/game/pressure-airlock.ts";

const links: AirlockLinks = { controllerKey: "0,1,0", innerDoorKey: "1,1,0", outerDoorKey: "4,1,0",
  chamberZoneId: "2,1,0", interiorZoneId: "0,1,1", exteriorZoneId: "exterior",
  recoveryPumpKey: "3,1,0", reserveKey: "3,0,0" };
function observe(extra: Partial<AirlockObservation> = {}): AirlockObservation {
  return { linksIntact: true, topologyCurrent: true, powerAvailableJ: 1_000,
    chamberPressurePa: 100_000, interiorPressurePa: 100_000, exteriorPressurePa: 0,
    innerDoorOpen: false, outerDoorOpen: false, innerDoorObstructed: false, outerDoorObstructed: false,
    occupants: 1, recoveryRequiredMmol: 10_000, reserveRoomMmol: 20_000, hostValidatedHeldMs: 0, ...extra };
}
function at(phase: AirlockPhase): AirlockState {
  return { ...createAirlockState(links), phase, recoveryVerified: ["unlock-outer", "occupied-open-outer"].includes(phase),
    error: phase === "fault" ? "power-failure" : null };
}
function command(state: AirlockState, kind: AirlockCommandKind, obs = observe()) {
  return commandAirlock(state, { kind, expectedSequence: state.sequence }, obs);
}
const cold = <T>(value: T): T => JSON.parse(JSON.stringify(value));

test("safe unpowered manual crank survives its own topology recheck and cold reload for a bounded dwell", () => {
  const opened = command(createAirlockState(links), "manual-open-inner", observe({ powerAvailableJ: 0, hostValidatedHeldMs: 8000 }));
  assert.equal(opened.state.manualDwellMs, 10000);
  let state = normalizeAirlockState(cold(opened.state));
  for (let i = 0; i < 49; i++) {
    const step = stepAirlock(state, observe({ powerAvailableJ: 0, innerDoorOpen: true, topologyCurrent: i > 2 }), 200);
    assert.notEqual(step.state.phase, "fault"); assert.ok(!step.commands.some(effect => effect.kind === "close-door" && effect.doorKey === links.innerDoorKey));
    state = step.state;
  }
  const finished = stepAirlock(state, observe({ powerAvailableJ: 0, innerDoorOpen: true }), 200);
  assert.equal(finished.state.manualDwellMs, 0);
  assert.ok(finished.commands.some(effect => effect.kind === "close-door" && effect.doorKey === links.innerDoorKey));
});

test("complete powered outward/recovery/inward cycle conserves finite budgets and opens one door", () => {
  let state = createAirlockState(links);
  let obs = observe({ innerDoorOpen: true });
  let reserve = 0;
  let chamber = 10_000;
  let energy = obs.powerAvailableJ;
  const seen = [state.phase];
  function apply(result: ReturnType<typeof stepAirlock>) {
    assert.equal(result.expectedSequence, state.sequence);
    assert.equal(result.state.sequence, state.sequence + 1);
    assert.ok(Number.isSafeInteger(result.energyCostJ) && result.energyCostJ >= 0 && result.energyCostJ <= energy);
    energy -= result.energyCostJ;
    for (const effect of result.commands) {
      if (effect.kind === "close-door") {
        if (effect.doorKey === links.innerDoorKey) obs.innerDoorOpen = false;
        else obs.outerDoorOpen = false;
      } else if (effect.kind === "open-door") {
        if (effect.doorKey === links.innerDoorKey) obs.innerDoorOpen = true;
        else obs.outerDoorOpen = true;
      } else if (effect.kind === "recover") {
        const amount = Math.min(effect.maxMmol, chamber, obs.reserveRoomMmol);
        reserve += amount; chamber -= amount;
      } else if (effect.kind === "equalize") {
        assert.equal(effect.targetZoneId, links.interiorZoneId);
        const amount = Math.min(effect.maxMmol, reserve, 10_000 - chamber);
        reserve -= amount; chamber += amount;
      }
      assert.equal(obs.innerDoorOpen && obs.outerDoorOpen, false);
    }
    assert.equal(chamber + reserve, 10_000);
    obs = { ...obs, chamberPressurePa: chamber * 10, recoveryRequiredMmol: chamber,
      reserveRoomMmol: 20_000 - reserve, powerAvailableJ: energy };
    state = cold(result.state);
    if (seen.at(-1) !== state.phase) seen.push(state.phase);
    assert.notEqual(state.phase, "fault");
  }
  apply(command(state, "cycle-out", obs));
  for (let i = 0; i < 100 && state.phase !== "occupied-open-outer"; i++) apply(stepAirlock(state, obs, 200));
  assert.equal(state.phase, "occupied-open-outer");
  assert.equal(reserve, 10_000);
  assert.equal(chamber, 0);
  assert.ok(obs.outerDoorOpen);
  apply(command(state, "return-in", obs));
  for (let i = 0; i < 100 && (state.phase as AirlockPhase) !== "idle-inner-safe"; i++) apply(stepAirlock(state, obs, 200));
  assert.equal(state.phase, "idle-inner-safe");
  assert.ok(obs.innerDoorOpen);
  assert.equal(reserve, 0);
  assert.equal(chamber, 10_000);
  assert.deepEqual(seen, [...AIRLOCK_PHASES.filter((p) => p !== "fault"), "idle-inner-safe"]);
});

test("every canonical phase retains exact sequence, clocks and next output after cold reload", () => {
  for (const phase of AIRLOCK_PHASES) {
    const state = { ...at(phase), sequence: 31, cycleElapsedMs: 4_000, phaseElapsedMs: 900 };
    const saved = normalizeAirlockState(cold(state));
    assert.deepEqual(saved, state, phase);
    const obs = observe({ chamberPressurePa: phase === "unlock-outer" ? 0 : 100_000,
      recoveryRequiredMmol: phase === "unlock-outer" ? 0 : 10_000,
      outerDoorOpen: phase === "occupied-open-outer" });
    assert.deepEqual(stepAirlock(saved, obs, 200), stepAirlock(state, obs, 200), phase);
  }
});

test("every active phase times out, including occupied chamber, while safe idle may dwell", () => {
  for (const phase of AIRLOCK_PHASES.filter((p) => p !== "fault" && p !== "idle-inner-safe")) {
    const state = { ...at(phase), cycleElapsedMs: 119_999, phaseElapsedMs: 119_999 };
    const result = stepAirlock(state, observe(), 1);
    assert.equal(result.state.error, "phase-timeout", phase);
    assert.equal(result.commands.filter((c) => c.kind === "close-door").length, 2);
  }
  assert.equal(stepAirlock({ ...at("idle-inner-safe"), cycleElapsedMs: 1_000_000, phaseElapsedMs: 1_000_000 }, observe(), 200).state.error, null);
});

test("finite six-cell recovery has a usable but bounded transfer deadline", () => {
  const state = { ...at("equalize/recover-to-exterior-target"), cycleElapsedMs: 30000, phaseElapsedMs: 30000 };
  const result = stepAirlock(state, observe({ recoveryRequiredMmol: 246000, reserveRoomMmol: 250000 }), 200);
  assert.equal(result.state.error, null); assert.ok(result.commands.some(effect => effect.kind === "recover"));
  assert.equal(stepAirlock({ ...state, cycleElapsedMs: 119800, phaseElapsedMs: 119800 }, observe(), 200).state.error, "phase-timeout");
});

test("power failures and broken links fail closed from every phase, even after reload", () => {
  for (const phase of AIRLOCK_PHASES.filter((p) => p !== "fault")) for (const failure of [
    { powerAvailableJ: 0 }, { linksIntact: false },
  ]) {
    const result = stepAirlock(normalizeAirlockState(cold(at(phase))), observe(failure), 200);
    assert.equal(result.state.phase, "fault", phase);
    assert.equal(result.energyCostJ, 0);
    assert.equal(result.commands.filter((c) => c.kind === "lock-door").length, 2);
    assert.equal(result.commands.some((c) => c.kind === "open-door"), false);
  }
});

test("pending topology waits sealed for current results, then faults on timeout", () => {
  let state = at("seal-inner");
  const obs = observe({ topologyCurrent: false });
  state = stepAirlock(state, obs, 200).state;
  assert.equal(state.phase, "verify-chamber-topology");
  state = stepAirlock(state, obs, 200).state;
  assert.equal(state.phase, "verify-chamber-topology");
  assert.equal(stepAirlock(state, obs, 30_000).state.error, "phase-timeout");
  assert.equal(stepAirlock(state, observe(), 200).state.phase, "equalize/recover-to-exterior-target");
  assert.equal(stepAirlock(at("seal-outer"), obs, 200).state.phase, "seal-outer");
  assert.equal(stepAirlock(at("seal-outer"), observe(), 200).state.phase, "equalize-to-interior-target");
  assert.equal(stepAirlock(at("unlock-outer"), obs, 200).state.error, "topology-stale");
});

test("opening cannot bypass finite recovery, changed pressure, an open opposite door or obstruction", () => {
  const baseline = observe({ chamberPressurePa: 0, recoveryRequiredMmol: 0 });
  const cases: [Partial<AirlockObservation>, string][] = [
    [{ recoveryRequiredMmol: 1 }, "reserve-full"],
    [{ chamberPressurePa: AIRLOCK_SAFE_DELTA_PA + 1 }, "unsafe-differential"],
    [{ innerDoorOpen: true }, "both-doors-open"],
    [{ outerDoorObstructed: true }, "door-obstructed"],
    [{ powerAvailableJ: 9 }, "power-failure"],
  ];
  for (const [change, error] of cases) {
    const result = stepAirlock(at("unlock-outer"), { ...baseline, ...change }, 200);
    assert.equal(result.state.error, error);
    assert.equal(result.commands.some((c) => c.kind === "open-door"), false);
  }
  assert.equal(stepAirlock(at("seal-inner"), observe({ innerDoorOpen: true, innerDoorObstructed: true }), 200).state.error, "door-obstructed");
});

test("recovery budgets obey finite reserve, available joules and elapsed throughput", () => {
  const state = at("equalize/recover-to-exterior-target");
  const result = stepAirlock(state, observe({ reserveRoomMmol: 321, powerAvailableJ: 2 }), 200);
  assert.deepEqual(result.commands, [{ kind: "recover", pumpKey: links.recoveryPumpKey,
    chamberZoneId: links.chamberZoneId, reserveKey: links.reserveKey, maxMmol: 200 }]);
  assert.equal(result.energyCostJ, 2);
  assert.equal(result.state.recoveryVerified, false);
  assert.equal(stepAirlock(state, observe({ reserveRoomMmol: 0 }), 200).state.error, "reserve-full");
  assert.deepEqual(stepAirlock(state, observe(), 0).commands, []);
  const small = stepAirlock(state, observe(), 1);
  assert.equal(small.commands[0].kind === "recover" && small.commands[0].maxMmol, 5);
  assert.equal(small.energyCostJ, 1);
});

test("higher exterior target requests finite equalization instead of negative recovery", () => {
  const result = stepAirlock(at("equalize/recover-to-exterior-target"), observe({ chamberPressurePa: 0,
    exteriorPressurePa: 100_000, recoveryRequiredMmol: 0, reserveRoomMmol: 0 }), 200);
  assert.deepEqual(result.commands, [{ kind: "equalize", chamberZoneId: links.chamberZoneId,
    targetZoneId: links.exteriorZoneId, maxMmol: 1_000 }]);
});

test("safe manual crank needs a continuous host hold, works without power, never bypasses recovery", () => {
  const state = at("fault");
  const safe = observe({ powerAvailableJ: 0, chamberPressurePa: 0, recoveryRequiredMmol: 0,
    hostValidatedHeldMs: AIRLOCK_MANUAL_HOLD_MS - 1 });
  assert.equal(command(state, "manual-open-outer", safe).reason, "hold-required");
  const held = { ...safe, hostValidatedHeldMs: AIRLOCK_MANUAL_HOLD_MS };
  const result = command(state, "manual-open-outer", held);
  assert.equal(result.energyCostJ, 0);
  assert.equal(result.state.phase, "occupied-open-outer");
  assert.equal(result.commands.filter((c) => c.kind === "open-door").length, 1);
  assert.equal(command(state, "manual-open-outer", { ...held, chamberPressurePa: 6_000 }).state.error, "unsafe-differential");
  assert.equal(command(state, "manual-open-outer", { ...held, recoveryRequiredMmol: 1 }).state.error, "reserve-full");
});

test("dangerous held override emits decompression but still interlocks and fails closed afterward", () => {
  const state = at("fault");
  const obs = observe({ hostValidatedHeldMs: AIRLOCK_OVERRIDE_HOLD_MS, powerAvailableJ: 0 });
  const result = command(state, "dangerous-open-outer", obs);
  assert.equal(result.commands.some((c) => c.kind === "decompress"), true);
  assert.equal(result.commands.some((c) => c.kind === "open-door"), true);
  assert.equal(result.state.phase, "fault");
  assert.equal(stepAirlock(cold(result.state), obs, 200).commands.some((c) => c.kind === "close-door"), true);
  assert.equal(command(state, "dangerous-open-outer", { ...obs, innerDoorOpen: true }).state.error, "both-doors-open");
  assert.equal(command(state, "dangerous-open-outer", { ...obs, hostValidatedHeldMs: 0 }).reason, "hold-required");
  assert.equal(command(state, "dangerous-open-inner", { ...obs, outerDoorOpen: true }).state.error, "both-doors-open");
});

test("reset returns through inward equalization and never opens immediately", () => {
  const result = command(at("fault"), "reset");
  assert.equal(result.state.phase, "equalize-to-interior-target");
  assert.equal(result.commands.some((c) => c.kind === "open-door"), false);
  assert.equal(command(at("fault"), "reset", observe({ outerDoorOpen: true })).state.phase, "fault");
});

test("sequence-bound transactions are deterministic and replayed commands are rejected", () => {
  const state = createAirlockState(links);
  const intent = { kind: "cycle-out" as const, expectedSequence: state.sequence };
  const first = commandAirlock(state, intent, observe());
  assert.deepEqual(commandAirlock(cold(state), intent, observe()), first);
  const replay = commandAirlock(first.state, intent, observe());
  assert.equal(replay.accepted, false);
  assert.equal(replay.reason, "stale-command");
  assert.deepEqual(replay.commands, []);
  assert.equal(replay.state.sequence, first.state.sequence);
  assert.equal(command(at("seal-inner"), "cycle-out").reason, "wrong-phase");
});

test("parsers reject coerced, fractional, nonfinite, out-of-range and conflicting data", () => {
  for (const bad of ["1", 1.5, -1, NaN, Infinity, 2_147_483_648, null]) {
    assert.equal(parseAirlockCommand({ kind: "cycle-out", expectedSequence: bad }), null);
    assert.equal(parseAirlockObservation({ ...observe(), powerAvailableJ: bad }), null);
    assert.equal(normalizeAirlockState({ ...createAirlockState(links), phaseElapsedMs: bad }).phase, "fault");
  }
  assert.equal(parseAirlockCommand({ kind: "cycle-OUT", expectedSequence: 0 }), null);
  for (const extra of [{ heldMs: 50_000 }, { afterImage: {} }, { [Symbol("secret")]: true }]) {
    assert.equal(parseAirlockCommand({ kind: "cycle-out", expectedSequence: 0, ...extra }), null);
    assert.equal(parseAirlockLinks({ ...links, ...extra }), null);
    assert.equal(parseAirlockObservation({ ...observe(), ...extra }), null);
    assert.equal(normalizeAirlockState({ ...at("idle-inner-safe"), ...extra }).phase, "fault");
  }
  assert.equal(parseAirlockObservation({ ...observe(), topologyCurrent: "true" }), null);
  assert.equal(parseAirlockLinks({ ...links, outerDoorKey: links.innerDoorKey }), null);
  assert.equal(parseAirlockLinks({ ...links, chamberZoneId: links.interiorZoneId }), null);
  assert.equal(parseAirlockLinks({ ...links, reserveKey: " " }), null);
  assert.equal(normalizeAirlockState(undefined).error, "malformed-save");
  assert.equal(normalizeAirlockState({ ...at("unlock-outer"), recoveryVerified: false }).error, "malformed-save");
  assert.equal(normalizeAirlockState({ ...at("idle-inner-safe"), phaseElapsedMs: 1 }).error, "malformed-save");
  const malformed = normalizeAirlockState({ ...at("idle-inner-safe"), sequence: 67, version: 2 });
  assert.equal(malformed.sequence, 67);
  assert.equal(malformed.phase, "fault");
  assert.equal(stepAirlock(createAirlockState(links), observe(), NaN).state.error, "invalid-time");
});

function frameObserver(spec: HangarGateGeometry, edit?: { key: string; value: HangarCellObservation }) {
  return (cell: { x: number; y: number; z: number }): HangarCellObservation => {
    if (edit && gateCellKey(cell) === edit.key) return edit.value;
    const across = cell[spec.axis] - spec.anchor[spec.axis];
    const y = cell.y - spec.anchor.y;
    return { kind: across === 0 || across === spec.width - 1 || y === 0 || y === spec.height - 1 ? "frame" : "clear" };
  };
}
test("all 3..9 gate sizes and both axes validate complete rectangles with exact interior coordinates", () => {
  for (const axis of ["x", "z"] as const) for (let width = 3; width <= 9; width++) for (let height = 3; height <= 9; height++) {
    const spec = { anchor: { x: -17, y: 4, z: 23 }, axis, width, height };
    let reads = 0;
    const observation = frameObserver(spec);
    const result = validateHangarGate(spec, (cell) => { reads++; return observation(cell); });
    assert.ok(result.valid);
    assert.equal(reads, width * height);
    assert.equal(result.interior.length, (width - 2) * (height - 2));
    assert.equal(result.frame.length + result.interior.length, width * height);
    assert.equal(new Set([...result.frame, ...result.interior].map(gateCellKey)).size, width * height);
    assert.equal(result.anchorKey, "-17,4,23");
    assert.deepEqual(result.interior[0], { x: -17 + (axis === "x" ? 1 : 0), y: 5, z: 23 + (axis === "z" ? 1 : 0) });
  }
});

test("every frame cell including caps/corners is mandatory; unloaded and interior obstructions fail closed", () => {
  const spec: HangarGateGeometry = { anchor: { x: 0, y: 0, z: 0 }, axis: "x", width: 9, height: 9 };
  const valid = validateHangarGate(spec, frameObserver(spec));
  assert.ok(valid.valid);
  for (const cell of valid.frame) {
    const result = validateHangarGate(spec, frameObserver(spec, { key: gateCellKey(cell), value: { kind: "clear" } }));
    assert.deepEqual(result, { valid: false, reason: "incomplete-frame", cell });
  }
  for (const cell of [...valid.frame, ...valid.interior]) {
    const result = validateHangarGate(spec, frameObserver(spec, { key: gateCellKey(cell), value: { kind: "unloaded" } }));
    assert.deepEqual(result, { valid: false, reason: "unloaded", cell });
  }
  for (const kind of ["obstructed", "frame"] as const) assert.equal(validateHangarGate(spec,
    frameObserver(spec, { key: "1,1,0", value: { kind } })).valid, false);
  assert.equal(validateHangarGate(spec, frameObserver(spec, { key: "1,1,0", value: { kind: "gate-leaf", anchorKey: "other" } })).valid, false);
  assert.equal(validateHangarGate(spec, frameObserver(spec, { key: "1,1,0", value: { kind: "gate-leaf", anchorKey: "0,0,0" } })).valid, true);
  assert.deepEqual(validateHangarGate(spec, () => undefined), { valid: false, reason: "unloaded", cell: spec.anchor });
});

test("gate exact parsers reject invalid geometry without invoking observations", () => {
  const spec = { anchor: { x: 0, y: 0, z: 0 }, axis: "z", width: 3, height: 3 };
  for (const patch of [{ width: 2 }, { width: 10 }, { height: 2 }, { height: 10 }, { height: 3.5 },
    { width: "3" }, { axis: "y" }, { anchor: { x: NaN, y: 0, z: 0 } }, { anchor: { x: 2_147_483_647, y: 0, z: 0 } }]) {
    assert.equal(parseHangarGateGeometry({ ...spec, ...patch }), null);
    assert.equal(validateHangarGate({ ...spec, ...patch } as HangarGateGeometry, () => { throw Error("must not read"); }).valid, false);
  }
});
