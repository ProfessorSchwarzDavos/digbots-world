import assert from "node:assert/strict";
import test from "node:test";
import { BlockId, Item } from "../app/game/data";
import { airCellKey, createAirZoneState, totalAirGas, type AirPoint, type AirZoneState } from "../app/game/airzone";
import { createAirZoneWorkerHandler, type AirZoneWorkerRequest, type AirZoneWorkerResponse } from "../app/game/airzone-worker-protocol";
import { PressureRuntime, type PressureHost, type PressureSave } from "../app/game/pressure-runtime";
import { pressureDoorUpper, validPressureDoorEdits, type PressureAction } from "../app/game/pressure-devices";
import { PRESSURE_CATALOG, type PressureMachineKind } from "../app/game/pressure-catalog";
import { mixtureForFraction } from "../app/game/pressure-habitat";
import { createMachine, type MachineState } from "../app/game/wayworks";
import type { BodyEnvironment } from "../app/game/celestial-environment";

const room = { x: 3, y: 2, z: 4 };
const controller = "3,2,5";
const vacuum: BodyEnvironment = { policyId: "test/v1", gravityG: 0, pressureKPa: 0,
  oxygenFraction: 0, co2Fraction: 0, inertFraction: 0, breathable: false, requiresPressureSuit: true,
  temperatureC: [-170, 105], corrosive: false, radiation: 1, liquidMedium: "none", wind: 0, weather: [],
  sky: { day: "#000", night: "#000", dusk: "#000", body: "#000", accent: "#000", starColor: "#fff", starBrightness: 1, aurora: 0, rings: false, bands: false } };

/** Retains the real worker protocol and flood fill, while explicitly scheduling
 * message delivery after each host frame. No runtime private methods are called. */
class TestWorker {
  onmessage: ((event: MessageEvent<AirZoneWorkerResponse>) => void) | null = null;
  onerror: (() => void) | null = null;
  readonly messages: AirZoneWorkerRequest[] = [];
  private handle = createAirZoneWorkerHandler();
  private pending: AirZoneWorkerResponse[] = [];
  postMessage(message: AirZoneWorkerRequest) { this.messages.push(structuredClone(message)); this.pending.push(this.handle(structuredClone(message))); }
  flush() { for (const data of this.pending.splice(0)) this.onmessage?.({ data } as MessageEvent<AirZoneWorkerResponse>); }
  terminate() { this.pending = []; }
}

function fixture(saved?: PressureSave, savedMachines?: Map<string, MachineState>) {
  const blocks = new Map<string, BlockId>();
  // A normal fully loaded section, with solid shell and a tiny 30 m3 cavity.
  for (let x = 2; x <= 6; x++) for (let y = 2; y <= 3; y++) for (let z = 2; z <= 4; z++) blocks.set(`${x},${y},${z}`, BlockId.Air);
  const machines = savedMachines ?? new Map<string, MachineState>();
  const obstructed = new Set<string>();
  let loaded = true, changed = 0, now = 0;
  const alarms: string[] = [];
  const host: PressureHost = { locationId: "runtime-test", generation: 1, minY: 0, maxY: 15,
    blockAt: p => loaded && [p.x, p.y, p.z].every(n => n >= 0 && n < 16) ? blocks.get(airCellKey(p)) ?? BlockId.Stone : undefined,
    skyTopAt: () => loaded ? 15 : undefined, loadedColumns: () => loaded ? ["0,0"] : [], machines,
    environment: () => vacuum, daylight: () => 0, occupants: () => [], obstructed: p => obstructed.has(airCellKey(p)),
    actorStillHolding: () => true, changed: () => changed++, alarm: message => alarms.push(message) };
  function add(key: string, kind: PressureMachineKind, facing = 0, owner = "owner") {
    const machine = createMachine(kind, host.locationId, owner, facing); machine.energyJ = 12000;
    machines.set(key, machine); blocks.set(key, PRESSURE_CATALOG[kind].id as BlockId);
    const upper = pressureDoorUpper(PRESSURE_CATALOG[kind].id as BlockId);
    if (upper) { const [x, y, z] = key.split(",").map(Number); blocks.set(`${x},${y + 1},${z}`, upper); }
    return machine;
  }
  if (!savedMachines) add(controller, "life-support-controller");
  const worker = new TestWorker(), previous = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  Object.defineProperty(globalThis, "Worker", { configurable: true, value: class { constructor() { return worker; } } });
  let runtime: PressureRuntime;
  try { runtime = new PressureRuntime(host, saved); }
  finally { if (previous) Object.defineProperty(globalThis, "Worker", previous); else Reflect.deleteProperty(globalThis, "Worker"); }
  function frame(dt = 0) { now += 20; runtime.update(dt, now); worker.flush(); }
  function settle() { for (let i = 0; i < 32; i++) frame(); }
  function act(key: string, action: PressureAction, actor = "owner", item: number | undefined = Item.FieldWrench, revision = machines.get(key)!.revision) {
    return runtime.operate(key, actor, item, revision, action, now);
  }
  function gas(amount = 30 * 40000, point = room) {
    const zone = runtime.zoneAt(point); assert.ok(zone, runtime.topology.lastError ?? "room missing");
    const topology = runtime.topology.topologies.get(zone.zoneId); assert.ok(topology);
    runtime.topology.replace(createAirZoneState(topology, mixtureForFraction(amount)));
    return runtime.zoneAt(point)!;
  }
  return { runtime, host, blocks, machines, worker, obstructed, alarms, add, frame, settle, act, gas,
    unload: () => { loaded = false; }, changes: () => changed };
}
const resources = (zone: AirZoneState) => ({ oxygenMilliMoles: zone.oxygenMilliMoles, inertMilliMoles: zone.inertMilliMoles,
  co2MilliMoles: zone.co2MilliMoles, thermalEnergyMilliJ: zone.thermalEnergyMilliJ });

test("runtime discovers a normal loaded sealed cavity through its worker", () => {
  const f = fixture(); try {
    f.settle(); const zone = f.runtime.zoneAt(room); assert.ok(zone);
    assert.equal(zone.cellCount, 30); assert.equal(zone.status, "depressurized");
    assert.equal(totalAirGas(zone), 0); assert.equal(f.runtime.environmentAt(room).breathable, false);
    assert.deepEqual(zone.controllerIds, [controller]); assert.equal(f.runtime.diagnosticsFor(controller).capacity, 2048);
    assert.ok(f.worker.messages.some(m => m.type === "discover")); assert.equal(f.runtime.topology.lastError, null);
  } finally { f.runtime.dispose(); }
});

test("runtime actions enforce revision, Field Wrench, owner and trusted authorization without partial writes", () => {
  const f = fixture(); try {
    const action: PressureAction = { kind: "target", pressurePa: 90000, temperatureMilliC: 21000 };
    const before = f.runtime.snapshot(), machine = structuredClone(f.machines.get(controller)!);
    for (const [actor, item, revision] of [["guest", Item.FieldWrench, machine.revision], ["owner", BlockId.Stone, machine.revision], ["owner", Item.FieldWrench, machine.revision - 1]] as const) {
      assert.equal(f.act(controller, action, actor, item, revision).ok, false);
      assert.deepEqual(f.runtime.snapshot(), before); assert.deepEqual(f.machines.get(controller), machine);
    }
    f.machines.get(controller)!.workshop.trusted.push("trusted");
    assert.equal(f.act(controller, action, "trusted").ok, true);
    assert.equal(f.runtime.devices.get(controller)!.targetPressurePa, 90000);
    assert.equal(f.machines.get(controller)!.revision, machine.revision + 1);
  } finally { f.runtime.dispose(); }
});

test("installation identities are unique, replacement clears local settings, and links retain explicit bindings", () => {
  const f = fixture(); try {
    const door = "4,2,3", other = "5,2,5";
    f.add(door, "pressure-door", 1); const duplicate = f.add(other, "pressure-sensor");
    duplicate.workshop.process!.installationId = f.machines.get(controller)!.workshop.process!.installationId;
    f.frame(); const ids = [...f.machines.values()].map(m => m.workshop.process!.installationId);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(f.act(controller, { kind: "link", role: "shutter", target: door }).ok, true);
    const bound = f.runtime.devices.get(controller)!.bindings[door]; assert.equal(bound, f.machines.get(door)!.workshop.process!.installationId);
    assert.equal(f.act(controller, { kind: "link", role: "pump", target: door }).ok, false);
    f.add(door, "pressure-door", 1); f.frame();
    assert.notEqual(f.runtime.devices.get(door)!.installationId, bound);
    assert.equal(f.runtime.devices.get(controller)!.bindings[door], bound, "replacement must not silently rebind a link");
    assert.equal(f.runtime.devices.get(door)!.open, false);
    assert.equal(f.act(controller, { kind: "unlink", role: "shutter" }).ok, true);
    assert.equal(f.runtime.devices.get(controller)!.bindings[door], undefined);
  } finally { f.runtime.dispose(); }
});

test("finite runtime supply consumes pure gas and electricity, retaining subquantum stock", () => {
  const f = fixture(); try {
    f.settle(); const source = f.machines.get(controller)!;
    source.energyJ = 128000; source.workshop.chemical = { resource: "oxygen", amount: 24007 };
    source.workshop.process!.chemicalAux = { resource: "inert", amount: 72011 };
    const initialJ = source.energyJ;
    for (let i = 0; i < 8; i++) f.frame(.2);
    const zone = f.runtime.zoneAt(room)!, after = f.machines.get(controller)!;
    assert.equal(zone.oxygenMilliMoles, 1000); assert.equal(zone.inertMilliMoles, 3000);
    assert.equal(after.workshop.chemical!.amount, 7); assert.equal(after.workshop.process!.chemicalAux!.amount, 11);
    assert.ok(after.energyJ < initialJ); assert.ok(zone.thermalEnergyMilliJ <= (initialJ - after.energyJ) * 1000);
    const exhausted = resources(zone); for (let i = 0; i < 5; i++) f.frame(.2);
    assert.deepEqual(resources(f.runtime.zoneAt(room)!), exhausted);
  } finally { f.runtime.dispose(); }
});

test("airlock linking rejects aliased hardware and samples before changing any owner", () => {
  const f = fixture(); try {
    const control = "3,2,6", pump = "4,2,5";
    f.add(control, "airlock-controller"); f.add(pump, "recovery-pump"); f.settle();
    assert.equal(f.act(control, { kind: "link", role: "pump", target: pump }).ok, true);
    assert.equal(f.act(control, { kind: "link", role: "chamber", target: "3,2,4" }).ok, true);
    const before = f.runtime.snapshot(), machine = structuredClone(f.machines.get(control));
    for (const action of [
      { kind: "link", role: "reserve", target: pump },
      { kind: "link", role: "interior", target: "3,2,4" },
      { kind: "link", role: "inner", target: control },
    ] as const) {
      const result = f.act(control, action); assert.equal(result.ok, false);
      assert.deepEqual(f.runtime.snapshot(), before); assert.deepEqual(f.machines.get(control), machine);
    }
  } finally { f.runtime.dispose(); }
});

test("runtime recovery capture and release preserve species and heat and stop when power is empty", () => {
  const f = fixture(); try {
    const pump = "5,2,5"; f.add(pump, "recovery-pump"); f.settle();
    const initial = resources(f.gas(10000));
    assert.equal(f.act(pump, { kind: "mode", mode: "capture" }).ok, true);
    for (let i = 0; i < 6; i++) f.frame(.2);
    assert.equal(totalAirGas(f.runtime.zoneAt(room)!), 0);
    assert.deepEqual(f.machines.get(pump)!.workshop.process!.airReserve, initial);
    assert.equal(f.act(pump, { kind: "mode", mode: "release" }).ok, true);
    for (let i = 0; i < 6; i++) f.frame(.2);
    assert.deepEqual(resources(f.runtime.zoneAt(room)!), initial);
    assert.equal(f.machines.get(pump)!.workshop.process!.airReserve, null);
    f.machines.get(pump)!.energyJ = 0; f.act(pump, { kind: "mode", mode: "capture" }); f.frame(.2);
    assert.deepEqual(resources(f.runtime.zoneAt(room)!), initial);
  } finally { f.runtime.dispose(); }
});

function splitDoorFixture() {
  const f = fixture();
  for (let y = 2; y <= 3; y++) for (let z = 2; z <= 4; z++) f.blocks.set(`4,${y},${z}`, BlockId.Stone);
  f.add("4,2,3", "pressure-door", 1); f.add("5,2,5", "life-support-controller"); f.settle();
  assert.equal(f.runtime.topology.zones.size, 2);
  return f;
}

test("door opening checks live pressure, both collision halves, obstruction and lost power", () => {
  const f = splitDoorFixture(), door = "4,2,3"; try {
    f.gas(12 * 40000); assert.equal(f.act(door, { kind: "door", open: true }).ok, false);
    assert.equal(f.runtime.openDoorAt({ x: 4, y: 2, z: 3 }), false);
    f.gas(12 * 40000, { x: 5, y: 2, z: 3 });
    const beforeJ = f.machines.get(door)!.energyJ;
    assert.equal(f.act(door, { kind: "door", open: true }).ok, true);
    assert.equal(f.machines.get(door)!.energyJ, beforeJ - 100);
    for (const y of [2, 3]) assert.equal(f.runtime.openDoorAt({ x: 4, y, z: 3 }), true);
    f.obstructed.add("4,3,3");
    assert.equal(f.act(door, { kind: "door", open: false }).ok, false);
    assert.equal(f.runtime.devices.get(door)!.open, true);
    f.obstructed.clear(); f.machines.get(door)!.energyJ = 0; f.frame(.2);
    assert.equal(f.runtime.devices.get(door)!.open, false);
  } finally { f.runtime.dispose(); }
});

test("normal hangar construction and frame repair do not create a permanent interlock", () => {
  const f = fixture(), key = "4,2,3";
  try {
    f.add(key, "hangar-pressure-gate"); f.settle();
    assert.equal(f.act(key, { kind: "gate", width: 3, height: 3 }).ok, true);
    assert.equal(f.runtime.diagnosticsFor(key).error, "incomplete-frame");
    for (let x = 3; x <= 5; x++) for (let y = 2; y <= 4; y++) if ((x === 3 || x === 5 || y === 2 || y === 4) && `${x},${y},3` !== key) {
      f.blocks.set(`${x},${y},3`, BlockId.HangarFrame); f.runtime.onEdit({ x, y, z: 3 });
    }
    f.settle();
    assert.equal(f.runtime.diagnosticsFor(key).error, null);
    assert.equal(f.runtime.devices.get(key)!.locked, false);
    assert.equal(f.runtime.closedGateAt({ x: 4, y: 3, z: 3 }), true);
    assert.equal(f.act(key, { kind: "door", open: true }).ok, true);
    const corner = { x: 3, y: 4, z: 3 };
    f.blocks.set(airCellKey(corner), BlockId.Air); f.runtime.onEdit(corner); f.settle();
    assert.equal(f.runtime.devices.get(key)!.open, false);
    assert.equal(f.runtime.diagnosticsFor(key).error, "incomplete-frame");
    f.blocks.set(airCellKey(corner), BlockId.HangarFrame); f.runtime.onEdit(corner); f.settle();
    assert.equal(f.act(key, { kind: "door", open: true }).ok, true);
    f.runtime.devices.get(key)!.locked = true; // Existing independent safety lock.
    f.blocks.set(airCellKey(corner), BlockId.Air); f.runtime.onEdit(corner); f.settle();
    f.blocks.set(airCellKey(corner), BlockId.HangarFrame); f.runtime.onEdit(corner); f.settle();
    assert.equal(f.runtime.devices.get(key)!.locked, true);
    assert.equal(f.act(key, { kind: "door", open: true }).ok, false);
  } finally { f.runtime.dispose(); }
});

test("unknown topology retains finite air but disables breathable environment and powered opening", () => {
  const f = splitDoorFixture(), door = "4,2,3"; try {
    const original = resources(f.gas(12 * 40000)); f.gas(12 * 40000, { x: 5, y: 2, z: 3 });
    assert.equal(f.runtime.environmentAt(room).breathable, true);
    f.unload(); f.settle();
    assert.deepEqual(resources(f.runtime.zoneAt(room)!), original);
    assert.equal(f.runtime.zoneAt(room)!.status, "unknown");
    assert.equal(f.runtime.environmentAt(room).breathable, false);
    assert.equal(f.runtime.environmentAt(room).requiresPressureSuit, true);
    assert.equal(f.act(door, { kind: "door", open: true }).ok, false);
  } finally { f.runtime.dispose(); }
});

test("a shutter link cannot lock newly installed hardware at the old coordinates", () => {
  const f = splitDoorFixture(), door = "4,2,3"; try {
    assert.equal(f.act(controller, { kind: "link", role: "shutter", target: door }).ok, true);
    const originalId = f.runtime.devices.get(controller)!.bindings[door];
    f.add(door, "pressure-door", 1); f.settle();
    assert.notEqual(f.runtime.devices.get(door)!.installationId, originalId);
    assert.equal(f.act(door, { kind: "door", open: true }).ok, true);
    f.frame(.2);
    assert.equal(f.runtime.devices.get(door)!.locked, false, "a stale installation binding must not control replacement hardware");
    assert.equal(f.runtime.devices.get(door)!.open, true);
  } finally { f.runtime.dispose(); }
});

test("a healthy room unlocks its bound alarm shutter without opening it", () => {
  const f = splitDoorFixture(), door = "4,2,3"; try {
    assert.equal(f.act(controller, { kind: "link", role: "shutter", target: door }).ok, true);
    f.settle(); f.frame(.2);
    assert.equal(f.runtime.devices.get(door)!.locked, true);
    assert.equal(f.runtime.devices.get(door)!.open, false);
    f.gas(12 * 40000); f.frame(.2);
    assert.equal(f.runtime.environmentAt(room).breathable, true);
    assert.equal(f.runtime.devices.get(door)!.locked, false);
    assert.equal(f.runtime.devices.get(door)!.open, false);
  } finally { f.runtime.dispose(); }
});

function airlockFixture() {
  const f = splitDoorFixture(), airlock = "5,2,1", outer = "6,2,3", pump = "6,2,5", reserve = "7,2,5", vent = "7,2,4";
  f.add(airlock, "airlock-controller", 2); f.add(outer, "pressure-door", 1);
  f.add(pump, "recovery-pump"); f.add(reserve, "gas-compressor"); f.add(vent, "atmosphere-vent"); f.frame();
  assert.equal(f.act(vent, { kind: "link", role: "room", target: "5,2,3" }).ok, true);
  for (const [role, target] of Object.entries({ room: "5,2,3", inner: "4,2,3", outer, chamber: "5,2,3",
    interior: "3,2,3", exterior: "exterior", pump, reserve, vent })) {
    assert.equal(f.act(airlock, { kind: "link", role, target } as PressureAction).ok, true, role);
  }
  f.runtime.onEdit({ x: 6, y: 2, z: 3 }); f.settle();
  assert.ok(f.runtime.devices.get(airlock)!.airlock?.links);
  return { ...f, airlock, outer, pump, reserve, vent };
}

test("runtime airlock captures finite chamber gas before opening and faults on replacement binding", () => {
  const f = airlockFixture(); try {
    const initial = resources(f.gas(10000, { x: 5, y: 2, z: 3 }));
    assert.equal(f.act(f.airlock, { kind: "cycle", command: "cycle-out" }).ok, true);
    for (let i = 0; i < 30 && !f.runtime.devices.get(f.outer)!.open; i++) {
      f.frame(.2);
      assert.equal(f.runtime.devices.get("4,2,3")!.open && f.runtime.devices.get(f.outer)!.open, false);
    }
    assert.equal(f.runtime.devices.get(f.airlock)!.airlock!.phase, "occupied-open-outer");
    assert.equal(f.runtime.devices.get(f.outer)!.open, true);
    assert.deepEqual(f.machines.get(f.reserve)!.workshop.process!.airReserve, initial);
    assert.equal(totalAirGas(f.runtime.zoneAt({ x: 5, y: 2, z: 3 })!), 0);
    f.add(f.pump, "recovery-pump"); f.frame(.2);
    assert.equal(f.runtime.devices.get(f.airlock)!.airlock!.error, "broken-link");
    assert.equal(f.runtime.devices.get(f.outer)!.open, false);
  } finally { f.runtime.dispose(); }
});

test("disabled or signal-gated airlock cannot spend its stored charge on an automatic cycle", () => {
  for (const disabled of [true, false]) {
    const f = airlockFixture(); try {
      const machine = f.machines.get(f.airlock)!;
      if (disabled) machine.enabled = false;
      else { machine.workshop.control = "signal-on"; machine.workshop.signal = false; }
      const before = machine.energyJ;
      f.act(f.airlock, { kind: "cycle", command: "cycle-out" });
      assert.equal(f.runtime.devices.get(f.airlock)!.airlock!.error, "power-failure");
      assert.equal(f.machines.get(f.airlock)!.energyJ, before);
      assert.equal(f.runtime.devices.get(f.outer)!.open, false);
      assert.equal(f.runtime.devices.get("4,2,3")!.open, false);
    } finally { f.runtime.dispose(); }
  }
});

test("one paused continuous manual hold opens once and cannot retrigger during its topology recheck", () => {
  const f = airlockFixture(); try {
    // Both sides are checked vacuum: safe manual crank needs no power.
    f.machines.get(f.airlock)!.energyJ = 0;
    const initialRevision = f.machines.get(f.airlock)!.revision;
    const send = (now: number, active: boolean) => f.runtime.operate(f.airlock, "owner", Item.FieldWrench,
      initialRevision, { kind: "hold", command: "manual-open-inner", active }, now);
    for (let now = 1000; now <= 9800; now += 200) {
      assert.equal(send(now, true).ok, true); f.runtime.update(0, now); f.worker.flush();
      if (now < 9000) assert.equal(f.runtime.devices.get("4,2,3")!.open, false);
    }
    assert.equal(f.runtime.devices.get("4,2,3")!.open, true);
    assert.equal(f.runtime.devices.get(f.airlock)!.airlock!.error, null);
    assert.equal(f.runtime.devices.get(f.airlock)!.airlock!.manualDwellMs, 10000);
    const sequence = f.runtime.devices.get(f.airlock)!.airlock!.sequence;
    send(10000, true); f.runtime.update(0, 10000); f.worker.flush();
    assert.equal(f.runtime.devices.get(f.airlock)!.airlock!.sequence, sequence);
    assert.equal(send(10010, false).ok, true);
    assert.equal(send(10020, true).ok, false, "a new hold still requires a fresh revision");
  } finally { f.runtime.dispose(); }
});

test("airlock fault closes the surviving bound door without actuating replacement hardware", () => {
  const f = airlockFixture(), inner = "4,2,3"; try {
    assert.equal(f.act(f.airlock, { kind: "cycle", command: "cycle-out" }).ok, true);
    for (let i = 0; i < 20 && !f.runtime.devices.get(f.outer)!.open; i++) f.frame(.2);
    assert.equal(f.runtime.devices.get(f.outer)!.open, true);
    const boundId = f.runtime.devices.get(f.airlock)!.bindings[inner];
    f.add(inner, "pressure-door", 1); f.frame();
    const replacement = structuredClone(f.runtime.devices.get(inner)!);
    const replacementMachine = structuredClone(f.machines.get(inner)!);
    assert.notEqual(replacement.installationId, boundId);
    assert.equal(replacement.locked, false);
    f.frame(.2);
    assert.equal(f.runtime.devices.get(f.airlock)!.airlock!.error, "broken-link");
    assert.deepEqual(f.runtime.devices.get(inner), replacement, "fault effects must not lock the unrelated replacement");
    assert.deepEqual(f.machines.get(inner), replacementMachine, "replacement revision and energy must remain untouched");
    assert.equal(f.runtime.devices.get(f.outer)!.open, false, "the original surviving door still closes fail-safe");
    assert.equal(f.runtime.devices.get(f.outer)!.locked, true);
  } finally { f.runtime.dispose(); }
});

test("live split and merge conserve gas plus displaced loss; cold reload rechecks before breathing", () => {
  const f = fixture(); let cold: ReturnType<typeof fixture> | undefined;
  try {
    f.add("5,2,5", "life-support-controller"); f.settle();
    const initial = resources(f.gas());
    for (let y = 2; y <= 3; y++) for (let z = 2; z <= 4; z++) {
      const p = { x: 4, y, z }; f.blocks.set(airCellKey(p), BlockId.Stone); f.runtime.onEdit(p);
    }
    assert.equal(f.runtime.environmentAt(room).breathable, false); f.settle();
    assert.equal(f.runtime.topology.zones.size, 2);
    for (const field of Object.keys(initial) as (keyof typeof initial)[]) {
      assert.equal([...f.runtime.topology.zones.values()].reduce((sum, zone) => sum + zone[field], f.runtime.topology.lost[field]), initial[field]);
    }
    for (let y = 2; y <= 3; y++) for (let z = 2; z <= 4; z++) {
      const p = { x: 4, y, z }; f.blocks.set(airCellKey(p), BlockId.Air); f.runtime.onEdit(p);
    }
    f.settle(); assert.equal(f.runtime.topology.zones.size, 1);
    const merged = resources(f.runtime.zoneAt(room)!);
    const saved = JSON.parse(JSON.stringify(f.runtime.snapshot())) as PressureSave;
    cold = fixture(saved, structuredClone(f.machines));
    assert.equal(cold.runtime.environmentAt(room).breathable, false);
    assert.equal(cold.runtime.zoneAt(room)!.status, "checking");
    cold.settle(); assert.deepEqual(resources(cold.runtime.zoneAt(room)!), merged);
    assert.equal(cold.runtime.environmentAt(room).breathable, true);
    assert.deepEqual(cold.runtime.snapshot().devices, saved.devices);
  } finally { f.runtime.dispose(); cold?.runtime.dispose(); }
});

test("pressure door edits require an atomic matched pair for placement and removal", () => {
  const lower = { x: 4, y: 2, z: 3, type: BlockId.PressureDoor, facing: 1 };
  const upper = { ...lower, y: 3, type: BlockId.PressureDoorUpper };
  const empty = () => BlockId.Air;
  assert.equal(validPressureDoorEdits([lower, upper], empty), true);
  assert.equal(validPressureDoorEdits([upper, lower], empty), true);
  for (const edits of [[lower], [upper], [lower, { ...upper, facing: 2 }], [lower, { ...upper, type: BlockId.HorizonDoorUpper }],
    [lower, { ...upper, x: 5 }], [lower, upper, { x: 7, y: 2, z: 3, type: BlockId.Stone }]]) assert.equal(validPressureDoorEdits(edits, empty), false);
  const installed = (p: AirPoint) => p.y === 2 ? BlockId.PressureDoor : BlockId.PressureDoorUpper;
  assert.equal(validPressureDoorEdits([{ ...lower, type: BlockId.Air }, { ...upper, type: BlockId.Air }], installed), true);
  assert.equal(validPressureDoorEdits([{ ...lower, type: BlockId.Air }], installed), false);
  assert.equal(validPressureDoorEdits([{ ...upper, type: BlockId.Air }], installed), false);
  assert.equal(validPressureDoorEdits([{ ...lower, type: BlockId.Stone }, { ...upper, type: BlockId.Air }], installed), false);
});

test("airlock missing or replaced chamber vent faults without deleting chamber gas", () => {
  for (const replacement of [false, true]) {
    const f = airlockFixture(); try {
      const before = resources(f.gas(10000, { x: 5, y: 2, z: 3 }));
      assert.equal(f.act(f.airlock, { kind: "cycle", command: "cycle-out" }).ok, true);
      if (replacement) f.add(f.vent, "atmosphere-vent"); else f.machines.delete(f.vent);
      f.frame(.2);
      assert.equal(f.runtime.devices.get(f.airlock)!.airlock!.error, "broken-link");
      assert.equal(f.runtime.diagnosticsFor(f.airlock).error, "link-chamber-vent");
      assert.equal(f.runtime.devices.get(f.outer)!.open, false);
      assert.deepEqual(resources(f.runtime.zoneAt({ x: 5, y: 2, z: 3 })!), before);
    } finally { f.runtime.dispose(); }
  }
});

test("configurable sensors emit owned workshop signals and aggregate shutter alarms", () => {
  const f = fixture(), a = "5,2,5", b = "6,2,5", shutter = "7,2,4"; try {
    f.add(a, "pressure-sensor"); f.add(b, "pressure-sensor"); f.add(shutter, "emergency-shutter"); f.frame();
    for (const sensor of [a, b]) {
      assert.equal(f.act(sensor, { kind: "link", role: "room", target: "3,2,4" }).ok, true);
      assert.equal(f.act(sensor, { kind: "link", role: "shutter", target: shutter }).ok, true);
    }
    assert.equal(f.act(a, { kind: "link", role: "signal", target: controller }).ok, true);
    assert.equal(f.act(b, { kind: "link", role: "signal", target: controller }).ok, false, "single writer per signal");
    f.settle(); f.gas();
    const settings = { minimumPressurePa: 60000, maximumPressurePa: 120000, minimumOxygenPpm: 300000, maximumCo2Ppm: 5000, output: "alarm" } as const;
    assert.equal(f.act(a, { kind: "sensor", ...settings }).ok, true); f.frame(.2);
    assert.equal(f.machines.get(a)!.workshop.signal, true); assert.equal(f.machines.get(controller)!.workshop.signal, true);
    assert.equal(f.runtime.diagnosticsFor(a).power!.drawW, 50);
    assert.equal(f.machines.get(b)!.workshop.signal, false); assert.equal(f.runtime.devices.get(shutter)!.locked, true);
    assert.equal(f.act(a, { kind: "unlink", role: "signal" }).ok, true);
    assert.equal(f.machines.get(controller)!.workshop.signal, false, "unlink releases the exact bound signal input");
    assert.equal(f.act(a, { kind: "link", role: "signal", target: controller }).ok, true);
    f.settle(); f.frame(.2);
    assert.equal(f.act(a, { kind: "sensor", ...settings, minimumOxygenPpm: 160000 }).ok, true); f.frame(.2);
    assert.equal(f.machines.get(controller)!.workshop.signal, false); assert.equal(f.runtime.devices.get(shutter)!.locked, false);
    assert.equal(f.runtime.devices.get(shutter)!.open, false);
    // An unrelated pre-existing lock survives a safe sensor sample.
    f.runtime.devices.get(shutter)!.locked = true; f.frame(.2); assert.equal(f.runtime.devices.get(shutter)!.locked, true);
    f.add(controller, "life-support-controller"); f.frame();
    f.act(a, { kind: "sensor", ...settings }); f.frame(.2);
    assert.equal(f.machines.get(controller)!.workshop.signal, false, "replacement must not inherit signal writer");
  } finally { f.runtime.dispose(); }
});

test("hold continuation cannot reuse its old installation binding after replacement", () => {
  const f = airlockFixture(); try {
    const revision = f.machines.get(f.airlock)!.revision;
    const action = { kind: "hold", command: "manual-open-inner", active: true } as const;
    assert.equal(f.runtime.operate(f.airlock, "owner", Item.FieldWrench, revision, action, 1000).ok, true);
    const replacement = f.add(f.airlock, "airlock-controller", 2); replacement.revision = revision + 10; f.frame();
    assert.equal(f.runtime.operate(f.airlock, "owner", Item.FieldWrench, revision, action, 1200).ok, false);
    assert.equal(f.runtime.devices.get("4,2,3")!.open, false);
  } finally { f.runtime.dispose(); }
});

test("alarm shutter lock ownership survives cold normalization and clears only its own lock", () => {
  const f = splitDoorFixture(), shutter = "4,2,3"; try {
    f.act(controller, { kind: "link", role: "shutter", target: shutter }); f.settle(); f.frame(.2);
    assert.equal(f.runtime.devices.get(shutter)!.alarmLocked, true);
    const saved = f.runtime.snapshot(), copied = new Map([...f.machines].map(([key, machine]) => [key, structuredClone(machine)]));
    const cold = fixture(saved, copied); try {
      // Restore the actual loaded block geometry before discovery.
      cold.blocks.clear(); for (const [key, block] of f.blocks) cold.blocks.set(key, block);
      cold.settle(); cold.gas(12 * 40000); cold.frame(.2);
      assert.equal(cold.runtime.devices.get(shutter)!.locked, false);
      assert.equal(cold.runtime.devices.get(shutter)!.alarmLocked, false);
      assert.equal(cold.runtime.devices.get(shutter)!.open, false);
    } finally { cold.runtime.dispose(); }
  } finally { f.runtime.dispose(); }
});

test("diagnostics count actual served consumers and finite flow at five hertz", () => {
  const f = fixture(), vent = "5,2,5"; try {
    f.add(vent, "atmosphere-vent"); f.settle(); f.gas(10000);
    f.host.occupants = () => [{ id: "player", kind: "player", point: room, oxygenMilliMoles: 4, co2MilliMoles: 3 },
      { id: "npc", kind: "npc", point: room, oxygenMilliMoles: 6, co2MilliMoles: 5 },
      { id: "blocked", kind: "creature", point: room, oxygenMilliMoles: 100000, co2MilliMoles: 100000 }];
    f.act(vent, { kind: "mode", mode: "capture" }); f.frame(.2);
    const rates = f.runtime.diagnosticsFor(controller).rates!;
    assert.equal(rates.oxygenConsumedMmolPerSecond, 50); assert.equal(rates.co2ProducedMmolPerSecond, 40);
    assert.equal(rates.outflowMmolPerSecond, 10000); assert.equal(rates.inflowMmolPerSecond, 0);
    assert.deepEqual(rates.majorConsumers, [{ kind: "npc", oxygenMmolPerSecond: 30 }, { kind: "player", oxygenMmolPerSecond: 20 }]);
    assert.equal(f.runtime.diagnosticsFor(controller).reserveSeconds, 0);
    f.host.occupants = () => []; f.act(vent, { kind: "mode", mode: "release" }); f.frame(.2);
    assert.equal(f.runtime.diagnosticsFor(controller).rates!.inflowMmolPerSecond, 10000);
    assert.equal(f.runtime.diagnosticsFor(controller).rates!.oxygenConsumedMmolPerSecond, 0);
    assert.equal(f.runtime.diagnosticsFor(controller).reserveSeconds, null);
  } finally { f.runtime.dispose(); }
});
