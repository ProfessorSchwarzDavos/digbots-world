import assert from "node:assert/strict";
import test from "node:test";
import { BlockId, Item, type InventorySlot } from "../app/game/data";
import { airCellKey, airThermalEnergy, createAirZoneState, totalAirGas, type AirGas, type AirZoneState } from "../app/game/airzone";
import { createAirZoneWorkerHandler, type AirZoneWorkerRequest, type AirZoneWorkerResponse } from "../app/game/airzone-worker-protocol";
import { PressureRuntime, type PressureHost, type PressureSave } from "../app/game/pressure-runtime";
import { mixtureForFraction } from "../app/game/pressure-habitat";
import { advancePowerGrid, createMachine, normalizeMachine, type MachineState } from "../app/game/wayworks";
import { portableResource, transferPortableResource } from "../app/game/wayworks-machines";
import type { BodyEnvironment } from "../app/game/celestial-environment";

const room = { x: 3, y: 2, z: 4 }, controller = "3,2,5", battery = "3,2,6";
const vacuum: BodyEnvironment = { policyId: "station-endurance/v1", gravityG: 0, pressureKPa: 0,
  oxygenFraction: 0, co2Fraction: 0, inertFraction: 0, breathable: false, requiresPressureSuit: true,
  temperatureC: [-170, 105], corrosive: false, radiation: 1, liquidMedium: "none", wind: 0, weather: [],
  sky: { day: "#000", night: "#000", dusk: "#000", body: "#000", accent: "#000", starColor: "#fff", starBrightness: 1, aurora: 0, rings: false, bands: false } };

/** Real discovery/kernel, deterministic delivery after a host frame. This does
 * not replace zoneAt/environmentAt or claim browser movement/normal-play proof. */
class KernelWorker {
  onmessage: ((event: MessageEvent<AirZoneWorkerResponse>) => void) | null = null;
  onerror: (() => void) | null = null;
  readonly messages: AirZoneWorkerRequest[] = [];
  private handle = createAirZoneWorkerHandler();
  private pending: AirZoneWorkerResponse[] = [];
  postMessage(message: AirZoneWorkerRequest) { this.messages.push(structuredClone(message)); this.pending.push(this.handle(structuredClone(message))); }
  flush() { for (const data of this.pending.splice(0)) this.onmessage?.({ data } as MessageEvent<AirZoneWorkerResponse>); }
  terminate() { this.pending = []; }
}

function station(saved?: PressureSave, restoredMachines?: Map<string, MachineState>) {
  const blocks = new Map<string, BlockId>();
  for (let x = 2; x <= 6; x++) for (let y = 2; y <= 3; y++) for (let z = 2; z <= 4; z++) blocks.set(`${x},${y},${z}`, BlockId.Air);
  blocks.set("2,2,3", BlockId.StationHabitation);
  blocks.set("4,2,3", BlockId.StationGreenhouse);
  blocks.set("1,2,3", BlockId.StationBulkhead);
  for (let y = 4; y < 16; y++) blocks.set(`4,${y},3`, y === 4 ? BlockId.ReinforcedWindow : BlockId.Air);
  blocks.set(controller, BlockId.LifeSupportController); blocks.set(battery, BlockId.FieldBattery);
  const machines = restoredMachines ?? new Map([[controller, createMachine("life-support-controller", "station-endurance", "owner")],
    [battery, createMachine("field-battery", "station-endurance", "owner")]]);
  let now = 0;
  const host: PressureHost = { locationId: "station-endurance", generation: 1, minY: 0, maxY: 15,
    blockAt: p => [p.x, p.y, p.z].every(n => n >= 0 && n < 16) ? blocks.get(airCellKey(p)) ?? BlockId.StationHull : undefined,
    skyTopAt: () => 4, loadedColumns: () => ["0,0"], machines, environment: () => vacuum,
    daylight: () => 0, occupants: () => [], obstructed: () => false, actorStillHolding: () => true, changed: () => {}, alarm: () => {} };
  const worker = new KernelWorker(), previous = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  Object.defineProperty(globalThis, "Worker", { configurable: true, value: class { constructor() { return worker; } } });
  let runtime: PressureRuntime;
  try { runtime = new PressureRuntime(host, saved); }
  finally { if (previous) Object.defineProperty(globalThis, "Worker", previous); else Reflect.deleteProperty(globalThis, "Worker"); }
  function frame(dt = 0, power = false) {
    if (power) {
      const nodes = [...machines].map(([key, state]) => { const [x, y, z] = key.split(",").map(Number); return { key, x, y, z, state, solarExposure: host.daylight() }; });
      const before = [...machines.values()].reduce((sum, machine) => sum + machine.energyJ, 0);
      const result = advancePowerGrid(nodes, Math.round(dt * 1000)); assert.equal(result.reason, "ok");
      for (const [key, state] of Object.entries(result.states)) machines.set(key, state);
      assert.equal([...machines.values()].reduce((sum, machine) => sum + machine.energyJ, 0), before + result.generatedJ);
    }
    now += Math.max(20, dt * 1000); runtime.update(dt, now); worker.flush();
  }
  function settle() { for (let i = 0; i < 32; i++) frame(); }
  function seed(gas: AirGas) {
    const found = runtime.zoneAt(room); assert.ok(found, runtime.topology.lastError ?? "station room missing");
    const topology = runtime.topology.topologies.get(found.zoneId); assert.ok(topology);
    // An explicit finite initial inventory, after real discovery; subsequent
    // operation/recovery never assigns a breathable state or refills the room.
    runtime.topology.replace(createAirZoneState(topology, gas));
  }
  const zone = () => { const value = runtime.zoneAt(room); assert.ok(value); return value; };
  return { runtime, host, blocks, machines, worker, frame, settle, seed, zone };
}
const resources = (zone: AirZoneState) => ({ oxygenMilliMoles: zone.oxygenMilliMoles, inertMilliMoles: zone.inertMilliMoles,
  co2MilliMoles: zone.co2MilliMoles, thermalEnergyMilliJ: zone.thermalEnergyMilliJ });
const occupy = (f: ReturnType<typeof station>, demand: number) => { f.host.occupants = () => [
  { id: "resident", kind: "npc", point: room, oxygenMilliMoles: demand, co2MilliMoles: demand },
]; };

test("occupied station hull and bulkhead retain finite air across lit, dark and eclipse greenhouse operation", () => {
  const f = station();
  try {
    f.settle(); assert.equal(f.zone().cellCount, 30); assert.equal(f.zone().status, "depressurized");
    assert.ok(f.worker.messages.some(message => message.type === "discover"));
    assert.equal(f.runtime.zoneAt({ x: 2, y: 2, z: 3 })?.zoneId, f.zone().zoneId, "habitation furniture does not split the air volume");
    assert.equal(f.runtime.zoneAt({ x: 4, y: 2, z: 3 })?.zoneId, f.zone().zoneId, "greenhouse tray remains in the room");
    f.seed({ ...mixtureForFraction(1_200_000), co2MilliMoles: 1000 }); occupy(f, 6);
    assert.equal(f.runtime.environmentAt(room).breathable, true);
    const before = resources(f.zone()); let consumed = 0, converted = 0;
    for (const [daylight, ticks] of [[1, 600], [0, 100], [.19, 100], [.2, 100]] as const) {
      f.host.daylight = () => daylight;
      for (let i = 0; i < ticks; i++) {
        f.frame(.2, true); consumed += 6; converted += daylight >= .2 ? 4 : 0;
        assert.equal(f.zone().oxygenMilliMoles, before.oxygenMilliMoles - consumed + converted);
        assert.equal(f.zone().co2MilliMoles, before.co2MilliMoles + consumed - converted);
        assert.equal(totalAirGas(f.zone()), totalAirGas(before)); assert.equal(f.zone().thermalEnergyMilliJ, before.thermalEnergyMilliJ);
      }
      const rates = f.runtime.diagnosticsFor(controller).rates!;
      assert.equal(rates.oxygenConsumedMmolPerSecond, 30);
      assert.equal(rates.oxygenProducedMmolPerSecond, daylight >= .2 ? 20 : 0);
      assert.equal(f.runtime.diagnosticsFor(controller).occupants, 1);
    }
    assert.equal(f.runtime.environmentAt(room).breathable, true);
    assert.deepEqual(f.runtime.boundary.admitted, { oxygenMilliMoles: 0, inertMilliMoles: 0, co2MilliMoles: 0, thermalEnergyMilliJ: 0 });
    assert.equal(f.zone().inertMilliMoles, before.inertMilliMoles);
  } finally { f.runtime.dispose(); }
});

test("occupied greenhouse becomes unsafe in darkness and recovers only by converting its retained CO2 in light", () => {
  const f = station();
  try {
    f.settle(); f.seed(mixtureForFraction(1_200_000)); occupy(f, 2);
    const before = resources(f.zone()); assert.equal(f.runtime.environmentAt(room).breathable, true);
    for (let i = 0; i < 4000; i++) f.frame(.2);
    assert.equal(f.zone().oxygenMilliMoles, before.oxygenMilliMoles - 8000);
    assert.equal(f.zone().co2MilliMoles, 8000); assert.equal(f.runtime.environmentAt(room).breathable, false);
    f.host.daylight = () => 1;
    for (let i = 0; i < 4000; i++) f.frame(.2);
    assert.deepEqual(resources(f.zone()), before); assert.equal(f.runtime.environmentAt(room).breathable, true);
    // Once available CO2 is exhausted, the same tray cannot accumulate free O2.
    for (let i = 0; i < 20; i++) f.frame(.2);
    assert.deepEqual(resources(f.zone()), before);
    assert.equal(f.runtime.diagnosticsFor(controller).rates!.oxygenProducedMmolPerSecond, 10);
  } finally { f.runtime.dispose(); }
});

test("finite power and gas exhaustion stops supply, then recovery debits a carried cylinder and reserve battery", () => {
  const f = station();
  try {
    f.settle(); occupy(f, 2);
    const initial = f.machines.get(controller)!;
    initial.energyJ = Math.ceil(airThermalEnergy(2, 20000) / 1000);
    initial.workshop.chemical = { resource: "oxygen", amount: 24007 };
    const reserve = f.machines.get(battery)!; reserve.energyJ = 20_000; reserve.enabled = false;
    let cylinder: InventorySlot = { item: Item.GasCylinder, count: 1, metadata: { wayworksResource: { kind: "chemical", resource: "oxygen", quantity: 24000 } } };
    f.frame(.2); assert.equal(f.zone().oxygenMilliMoles, 2); assert.equal(f.machines.get(controller)!.energyJ, 0);
    f.frame(.2); assert.equal(f.zone().oxygenMilliMoles, 0); assert.equal(f.zone().co2MilliMoles, 2);
    const stalled = resources(f.zone()), gasBefore = f.machines.get(controller)!.workshop.chemical!.amount;
    for (let i = 0; i < 20; i++) f.frame(.2, true);
    assert.deepEqual(resources(f.zone()), stalled); assert.equal(f.machines.get(controller)!.workshop.chemical!.amount, gasBefore);

    // Enable the retained finite reserve, routing through real six-face adjacency.
    // No generator or direct controller energy assignment is used for recovery.
    assert.equal(f.machines.get(battery)!.energyJ, 20_000);
    f.machines.get(battery)!.enabled = true;
    const initialEnergy = 20_000;
    for (let i = 0; i < 80; i++) f.frame(.2, true);
    assert.equal(f.machines.get(controller)!.workshop.chemical!.amount, 7, "subquantum gas stays in custody");
    for (let i = 0; i < 500; i++) f.frame(.2, true);
    assert.equal(f.zone().oxygenMilliMoles, 0); assert.equal(f.zone().co2MilliMoles, 1000);
    const empty = resources(f.zone()); f.frame(.2, true); assert.deepEqual(resources(f.zone()), empty);

    let moved = 0;
    for (let i = 0; i < 24; i++) {
      const machine = f.machines.get(controller)!;
      const transfer = transferPortableResource(machine, controller, cylinder, "empty", machine.revision);
      assert.equal(transfer.ok, true, transfer.reason); moved += transfer.moved;
      cylinder = transfer.held!; f.machines.set(controller, transfer.machine);
    }
    assert.equal(moved, 24000); assert.equal(portableResource(cylinder), null);
    const energyBefore = [...f.machines.values()].reduce((sum, machine) => sum + machine.energyJ, 0);
    f.frame(.2, true);
    assert.ok(f.zone().oxygenMilliMoles > 0, "paid resupply restores actual room oxygen");
    for (let i = 0; i < 600; i++) f.frame(.2, true);
    assert.equal(f.zone().oxygenMilliMoles, 0); assert.equal(f.zone().co2MilliMoles, 2000);
    assert.equal(f.machines.get(controller)!.workshop.chemical!.amount, 7);
    const energyAfter = [...f.machines.values()].reduce((sum, machine) => sum + machine.energyJ, 0);
    assert.ok(energyAfter < energyBefore); assert.ok(energyAfter >= 0);
    const paidMilliJ = (initialEnergy - energyAfter) * 1000 + airThermalEnergy(2, 20000);
    assert.ok(f.zone().thermalEnergyMilliJ <= paidMilliJ, "gas heating cannot exceed debited energy");
    assert.equal(f.runtime.environmentAt(room).breathable, false, "a small oxygen delivery does not certify a pressurized habitat");
  } finally { f.runtime.dispose(); }
});

test("cold station reconstruction preserves finite room, machine and battery custody before resuming occupied operation", () => {
  const live = station(); let cold: ReturnType<typeof station> | undefined;
  try {
    live.settle(); live.seed(mixtureForFraction(1_200_000)); occupy(live, 2);
    live.machines.get(battery)!.energyJ = 30000;
    live.machines.get(controller)!.workshop.chemical = { resource: "oxygen", amount: 24007 };
    live.machines.get(controller)!.workshop.process!.chemicalAux = { resource: "inert", amount: 72011 };
    for (let i = 0; i < 2; i++) live.frame(.2, true);
    assert.ok(live.machines.get(controller)!.workshop.chemical!.amount > 7, "reload interrupts active finite supply");
    const roomBefore = resources(live.zone());
    const saved = JSON.parse(JSON.stringify(live.runtime.snapshot())) as PressureSave;
    const machineSave = JSON.parse(JSON.stringify([...live.machines])) as [string, MachineState][];
    const restored = new Map(machineSave.map(([key, machine]) => [key, normalizeMachine(machine, machine.kind, machine.locationId, machine.ownerId)]));
    cold = station(saved, restored); occupy(cold, 2);
    assert.equal(cold.runtime.environmentAt(room).breathable, false);
    assert.equal(cold.zone().status, "checking"); assert.deepEqual(resources(cold.zone()), roomBefore);
    const stored = structuredClone([...cold.machines]); cold.settle();
    assert.deepEqual(resources(cold.zone()), roomBefore); assert.deepEqual([...cold.machines], stored);
    assert.equal(cold.runtime.environmentAt(room).breathable, true);
    assert.deepEqual(cold.runtime.snapshot().boundary, saved.boundary);
    for (let i = 0; i < 100; i++) { live.frame(.2, true); cold.frame(.2, true); }
    assert.deepEqual(resources(cold.zone()), resources(live.zone()));
    assert.deepEqual([...cold.machines], [...live.machines]);
    assert.equal(cold.machines.get(controller)!.workshop.chemical!.amount, 7);
    assert.equal(cold.machines.get(controller)!.workshop.process!.chemicalAux!.amount, 11);
  } finally { live.runtime.dispose(); cold?.runtime.dispose(); }
});
