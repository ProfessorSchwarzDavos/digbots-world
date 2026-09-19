import assert from "node:assert/strict";
import test from "node:test";
import { blockFacingFront, blockFacingRight, type BlockFacing } from "../app/game/block-facing.ts";
import {
  advancePowerGrid, configureMachine, createMachine, localFaceForWorldDirection,
  machineCapacity, machineRate, normalizeMachine, MAX_POWER_NODES, MAX_POWER_STEP_MS,
  type MachineKind, type MachineOperation, type MachineState, type PowerNode,
} from "../app/game/wayworks.ts";

const node = (key: string, kind: MachineKind, x: number, y = 0, z = 0, energyJ = 0): PowerNode => ({
  key, x, y, z, solarExposure: 1, state: { ...createMachine(kind, "home", "player"), energyJ },
});
const total = (nodes: PowerNode[]) => nodes.reduce((sum, entry) => sum + entry.state.energyJ, 0);
const step = (nodes: PowerNode[], elapsedMs = 1000) => {
  const result = advancePowerGrid(nodes, elapsedMs);
  assert.equal(result.reason, "ok");
  const next = nodes.map((entry) => ({ ...entry, state: result.states[entry.key] }));
  assert.equal(total(next), total(nodes) + result.generatedJ);
  for (const entry of next) {
    assert.ok(Number.isInteger(entry.state.energyJ));
    assert.ok(entry.state.energyJ >= 0 && entry.state.energyJ <= machineCapacity(entry.state.kind));
  }
  return { next, result };
};

test("new machines are empty and have distinct finite capacity and rates", () => {
  for (const kind of ["hand-dynamo", "sunplate-array", "field-battery", "charging-pedestal", "grid-cable"] as const) {
    const state = createMachine(kind, "home", "player");
    assert.equal(state.energyJ, 0);
    assert.equal(state.revision, 0);
    assert.ok(machineRate(kind) > 0);
    assert.equal(state.schema, 1);
    assert.deepEqual(normalizeMachine(JSON.parse(JSON.stringify(state)), kind, "home", "player"), state);
  }
  assert.equal(machineCapacity("grid-cable"), 0);
});

test("malformed energy and identity cannot become stored resources", () => {
  const state = createMachine("field-battery", "home", "player");
  for (const energyJ of [NaN, Infinity, -1, 1e100, machineCapacity(state.kind) + 1, "1000", null, undefined]) {
    assert.equal(normalizeMachine({ ...state, energyJ }, state.kind, "home", "player").energyJ, 0);
  }
  assert.equal(normalizeMachine({ ...state, energyJ: 123.9 }, state.kind, "home", "player").energyJ, 123);
  for (const patch of [{ schema: 2 }, { kind: "sunplate-array" }, { ownerId: "other" }, { locationId: "orbit" }]) {
    const saved = normalizeMachine({ ...state, energyJ: 1200, ...patch }, state.kind, "home", "player");
    assert.equal(saved.energyJ, 0);
    assert.equal(saved.enabled, false);
    assert.equal(saved.status, "invalid-state");
  }
  assert.equal(normalizeMachine({ ...state, transferRemainder: 1000 }, state.kind, "home", "player").transferRemainder, 0);
});

test("crank commits once with bounded buffer and preserves failed state", () => {
  const state = createMachine("hand-dynamo", "home", "player");
  const first = configureMachine(state, 0, { kind: "crank" });
  assert.equal(first.ok, true);
  assert.equal(first.state.energyJ, 2000);
  assert.equal(state.energyJ, 0);
  const retry = configureMachine(first.state, 0, { kind: "crank" });
  assert.equal(retry.reason, "stale-revision");
  assert.strictEqual(retry.state, first.state);
  const full = { ...first.state, energyJ: machineCapacity(state.kind) - 1 };
  assert.strictEqual(configureMachine(full, full.revision, { kind: "crank" }).state, full);
  assert.equal(configureMachine({ ...state, enabled: false }, 0, { kind: "crank" }).reason, "disabled");
  assert.equal(configureMachine(createMachine("field-battery", "home", "player"), 0, { kind: "crank" }).reason, "not-a-dynamo");
});

test("configuration rejects incompatible ports, unknown operations and exhausted revisions", () => {
  const state = createMachine("hand-dynamo", "home", "player");
  assert.equal(configureMachine(state, 0, { kind: "port", face: "front", mode: "input" }).reason, "invalid-port");
  assert.equal(configureMachine(state, 0, { kind: "port", face: "front", mode: "both" }).reason, "invalid-port");
  assert.equal(configureMachine(state, 0, { kind: "port", face: "bad", mode: "output" } as unknown as MachineOperation).reason, "invalid-port");
  assert.equal(configureMachine(state, 0, { kind: "bad" } as unknown as MachineOperation).reason, "invalid-operation");
  assert.equal(configureMachine({ ...state, energyJ: -1 }, 0, { kind: "crank" }).reason, "invalid-state");
  assert.equal(configureMachine({ ...state, revision: Number.MAX_SAFE_INTEGER }, Number.MAX_SAFE_INTEGER, { kind: "rotate" }).reason, "revision-exhausted");
  const charger = createMachine("charging-pedestal", "home", "player");
  assert.equal(configureMachine(charger, 0, { kind: "port", face: "top", mode: "output" }).reason, "invalid-port");
  const disabled = configureMachine(state, 0, { kind: "port", face: "front", mode: "disabled" });
  assert.equal(disabled.ok, true);
  assert.equal(disabled.state.ports.front, "disabled");
  assert.equal(state.ports.front, "output");
  const rotated = configureMachine(disabled.state, 1, { kind: "rotate" });
  assert.equal(rotated.state.facing, 1);
  assert.equal(rotated.state.ports.front, "disabled");
});

test("all six faces match the existing north/east/south/west block orientation", () => {
  for (const facing of [0, 1, 2, 3] as BlockFacing[]) {
    const front = blockFacingFront(facing);
    const right = blockFacingRight(facing);
    assert.equal(localFaceForWorldDirection(facing, front.x, 0, front.z), "front");
    assert.equal(localFaceForWorldDirection(facing, -front.x, 0, -front.z), "back");
    assert.equal(localFaceForWorldDirection(facing, right.x, 0, right.z), "right");
    assert.equal(localFaceForWorldDirection(facing, -right.x, 0, -right.z), "left");
    assert.equal(localFaceForWorldDirection(facing, 0, 1, 0), "top");
    assert.equal(localFaceForWorldDirection(facing, 0, -1, 0), "bottom");
  }
  assert.throws(() => localFaceForWorldDirection(0, 1, 0, 1), RangeError);
});

test("generation follows measured sunlight and never grows a full buffer", () => {
  const panel = node("solar", "sunplate-array", 0);
  assert.equal(step([panel]).next[0].state.energyJ, machineRate(panel.state.kind));
  assert.equal(step([{ ...panel, solarExposure: 0.5 }]).result.generatedJ, 300);
  for (const solarExposure of [0, -1, NaN, Infinity]) assert.equal(step([{ ...panel, solarExposure }]).result.generatedJ, 0);
  const full = { ...panel, state: { ...panel.state, energyJ: machineCapacity(panel.state.kind) } };
  assert.equal(step([full]).result.generatedJ, 0);
  assert.equal(step([full]).next[0].state.status, "buffer-full");
  assert.equal(step([{ ...panel, state: { ...panel.state, enabled: false } }]).result.generatedJ, 0);
});

test("fractional generation and transport survive save/reload without rounding free joules", () => {
  let nodes = [{ ...node("solar", "sunplate-array", 0), solarExposure: 0.333 }, node("battery", "field-battery", 1)];
  for (let i = 0; i < 1000; i += 1) {
    nodes = step(nodes, 1).next.map((entry) => ({ ...entry, state: normalizeMachine(JSON.parse(JSON.stringify(entry.state)), entry.state.kind, "home", "player") }));
  }
  assert.equal(total(nodes), 199);
  assert.equal(nodes[0].state.generationRemainder, 800000);
  const whole = step([{ ...node("solar", "sunplate-array", 0), solarExposure: 0.333 }]).next[0].state;
  assert.equal(whole.energyJ, 199);
  assert.equal(whole.generationRemainder, 800000);
});

test("a causal generator to cable to battery to charger loop conserves finite energy", () => {
  let nodes = [node("dynamo", "hand-dynamo", 0, 0, 0, 8000), node("cable", "grid-cable", 1), node("battery", "field-battery", 2), node("charger", "charging-pedestal", 3)];
  nodes = step(nodes).next;
  assert.equal(nodes[2].state.energyJ, 2000);
  assert.equal(nodes[3].state.energyJ, 0, "received battery energy must wait until a later tick");
  nodes = step(nodes).next;
  assert.equal(nodes[2].state.energyJ, 2000);
  assert.equal(nodes[3].state.energyJ, 2000);
  for (let i = 0; i < 10; i += 1) nodes = step(nodes).next;
  assert.equal(nodes[0].state.energyJ, 0);
  assert.equal(nodes[2].state.energyJ, 0);
  assert.equal(nodes[3].state.energyJ, 8000);
  assert.equal(nodes[1].state.energyJ, 0);
});

test("cable bandwidth is shared by branches and does not multiply at a fork", () => {
  const nodes = [node("battery", "field-battery", 0, 0, 0, 20000), node("cable", "grid-cable", 1),
    node("charger-a", "charging-pedestal", 2), node("charger-b", "charging-pedestal", 1, 1), node("charger-c", "charging-pedestal", 1, -1)];
  const { next, result } = step(nodes);
  assert.equal(result.transferredJ, 4000);
  assert.equal(next[0].state.energyJ, 16000);
  assert.equal(next.slice(2).reduce((sum, entry) => sum + entry.state.energyJ, 0), 4000);
});

test("cable loops cannot duplicate and graph order cannot alter allocation", () => {
  const nodes = [node("battery", "field-battery", -1, 0, 0, 20000), node("a", "grid-cable", 0), node("b", "grid-cable", 1),
    node("c", "grid-cable", 1, 0, 1), node("d", "grid-cable", 0, 0, 1), node("charger", "charging-pedestal", 2)];
  const first = step(nodes).result;
  assert.deepEqual(step([...nodes].reverse()).result, first);
  assert.equal(first.transferredJ, 2000);
  assert.equal(first.states.charger.energyJ, 2000);
});

test("location and owner boundaries, removal, disabled blocks and broken adjacency isolate grids", () => {
  const source = node("battery", "field-battery", 0, 0, 0, 2000);
  const sink = node("charger", "charging-pedestal", 1);
  for (const state of [{ ...sink.state, locationId: "orbit" }, { ...sink.state, ownerId: "other" }, { ...sink.state, enabled: false }]) {
    assert.equal(step([source, { ...sink, state }]).result.transferredJ, 0);
  }
  assert.equal(step([source, { ...sink, x: 2 }]).result.transferredJ, 0);
  assert.equal(step([source, { ...sink, x: 1, z: 1 }]).result.transferredJ, 0);
  assert.equal(step([source]).next[0].state.energyJ, 2000);
});

test("rotating a local output face changes world connectivity without rotating saved port names", () => {
  const source = node("battery", "field-battery", 0, 0, 0, 2000);
  for (const face of Object.keys(source.state.ports) as (keyof MachineState["ports"])[]) source.state.ports[face] = "disabled";
  source.state.ports.front = "output";
  const east = node("east", "charging-pedestal", 1);
  assert.equal(step([source, east]).result.transferredJ, 0);
  const rotated = configureMachine(source.state, 0, { kind: "rotate" }).state;
  assert.equal(step([{ ...source, state: rotated }, east]).result.transferredJ, 2000);
  const closed = { ...east, state: { ...east.state, ports: { ...east.state.ports, left: "disabled" as const } } };
  assert.equal(step([{ ...source, state: rotated }, closed]).result.transferredJ, 0);
});

test("full sinks backpressure, batteries never charge one another and idle time earns no burst budget", () => {
  const source = node("battery", "field-battery", 0, 0, 0, 20000);
  const full = node("charger", "charging-pedestal", 1, 0, 0, machineCapacity("charging-pedestal"));
  assert.equal(step([source, full]).result.transferredJ, 0);
  assert.equal(step([source, node("other", "field-battery", 1)]).result.transferredJ, 0);
  let alone = [source];
  for (let i = 0; i < 5; i += 1) alone = step(alone).next;
  assert.equal(step([...alone, node("charger", "charging-pedestal", 1)], 10).result.transferredJ, 20);
  const almostFull = node("charger", "charging-pedestal", 1, 0, 0, machineCapacity("charging-pedestal") - 13);
  assert.equal(step([source, almostFull]).result.transferredJ, 13);
});

test("limits reject ambiguous graphs atomically and cap elapsed work", () => {
  const source = node("solar", "sunplate-array", 0);
  const over = Array.from({ length: MAX_POWER_NODES + 1 }, (_, i) => node(String(i), "sunplate-array", i));
  const failed = advancePowerGrid(over, 1000);
  assert.equal(failed.reason, "node-limit");
  assert.deepEqual(failed.states, {});
  assert.equal(advancePowerGrid([source, { ...source }], 1000).reason, "duplicate-node");
  assert.equal(advancePowerGrid([source, { ...source, key: "other" }], 1000).reason, "duplicate-node");
  assert.equal(advancePowerGrid([null as unknown as PowerNode], 1000).reason, "invalid-node");
  const capped = step([source], 100000).result;
  assert.equal(capped.elapsedMs, MAX_POWER_STEP_MS);
  assert.equal(capped.discardedMs, 100000 - MAX_POWER_STEP_MS);
  for (const dt of [0, -1, NaN, Infinity]) assert.equal(step([source], dt).result.generatedJ, 0);
});

test("simulation is immutable, save/reload deterministic and revisioned only for authoritative changes", () => {
  const nodes = [node("solar", "sunplate-array", 0), node("cable", "grid-cable", 1), node("battery", "field-battery", 2)];
  const before = JSON.stringify(nodes);
  const first = step(nodes);
  assert.equal(JSON.stringify(nodes), before);
  assert.equal(first.next[0].state.revision, 0, "solar exports all generated energy, leaving its authoritative state unchanged");
  assert.equal(first.next[2].state.revision, 1);
  assert.equal(first.next[1].state.revision, 0);
  const loaded = first.next.map((entry) => ({ ...entry, state: normalizeMachine(JSON.parse(JSON.stringify(entry.state)), entry.state.kind, "home", "player") }));
  assert.deepEqual(step(loaded).result, step(first.next).result);
});
