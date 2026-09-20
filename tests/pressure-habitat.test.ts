import assert from "node:assert/strict";
import test from "node:test";
import { createMachine, normalizeMachine } from "../app/game/wayworks.ts";
import { createAirZoneState, discoverAirZone, totalAirGas, type AirPoint } from "../app/game/airzone.ts";
import { createAirZoneWorkerHandler } from "../app/game/airzone-worker-protocol.ts";
import { admitAmbientAir, supplyHabitat, recoverHabitat, drawHabitatCarbon, regulateHabitat, mixtureForFraction, operateAtmosphereVent, equalizeHabitat } from "../app/game/pressure-habitat.ts";
import { createPressureDevice, normalizePressureDevice, parsePressureAction } from "../app/game/pressure-devices.ts";
import { createWaystarCatalog } from "../app/game/celestial-catalog.ts";
import { bodyEnvironment } from "../app/game/celestial-environment.ts";
import { PressureTopology } from "../app/game/pressure-topology.ts";

function room() {
  const cells = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) cells.push({ x, y, z,
    passable: x === 0 && y === 0 && z === 0, sealMask: 0, controllerIds: x === 0 && y === 0 && z === 0 ? ["life"] : [] });
  return discoverAirZone({ epochs: { locationId: "home", generation: 0, topologyRevision: 1, requestId: 1 }, seed: { x: 0, y: 0, z: 0 }, cells });
}
test("ambient inflow is an explicit species/thermal boundary flux, bounded by real exterior pressure", () => {
  const environment = bodyEnvironment(createWaystarCatalog().bodies.find(body => body.id === "blockwild")!, "surface");
  let zone = createAirZoneState(room()), gas = 0, heat = 0;
  for (let i = 0; i < 100; i++) {
    const result = admitAmbientAir(zone, environment, 2000); gas += totalAirGas(result.admitted); heat += result.admitted.thermalEnergyMilliJ; zone = result.zone;
  }
  assert.equal(totalAirGas(zone), gas); assert.equal(zone.thermalEnergyMilliJ, heat);
  assert.ok(zone.pressureMilliKPa <= environment.pressureKPa * 1000 && zone.pressureMilliKPa >= environment.pressureKPa * 1000 - 5);
  assert.ok(zone.oxygenMilliMoles / totalAirGas(zone) > .20);
  assert.equal(admitAmbientAir(zone, { ...environment, pressureKPa: 0 }, 2000).movedMmol, 0);
  assert.equal(admitAmbientAir({ ...zone, status: "unknown" }, environment, 2000).movedMmol, 0);
});
test("finite pure-gas supply pays heating energy, respects mixture targets and retains subquantum mL", () => {
  let state = createMachine("life-support-controller", "home", "local");
  state.workshop.upgrades.capacity = 4; state.energyJ = 640000;
  state.workshop.chemical = { resource: "oxygen", amount: 240007 };
  state.workshop.process!.chemicalAux = { resource: "inert", amount: 800000 };
  let zone = createAirZoneState(room()); const start = state.energyJ;
  let heat = 0, dissipated = 0;
  for (let i = 0; i < 30; i++) {
    const before = zone.thermalEnergyMilliJ, result = supplyHabitat(state, zone, 2000);
    state = result.machine; zone = result.zone; heat += zone.thermalEnergyMilliJ - before; dissipated += result.dissipatedMilliJ;
  }
  assert.equal((start - state.energyJ) * 1000, heat + dissipated);
  assert.ok(zone.pressureMilliKPa >= 99000 && zone.pressureMilliKPa <= 100000);
  const fraction = zone.oxygenMilliMoles / totalAirGas(zone); assert.ok(fraction > .209 && fraction < .211);
  assert.equal(state.workshop.chemical!.amount % 24, 7);
});
test("recovery preserves every species and thermal unit across exact cold custody", () => {
  let zone = createAirZoneState(room(), mixtureForFraction(40000), 35000);
  const original = { oxygenMilliMoles: zone.oxygenMilliMoles, inertMilliMoles: zone.inertMilliMoles, co2MilliMoles: zone.co2MilliMoles, thermalEnergyMilliJ: zone.thermalEnergyMilliJ };
  let machine = createMachine("recovery-pump", "home", "local"); machine.workshop.upgrades.capacity = 4; machine.energyJ = 64000;
  const capture = recoverHabitat(machine, zone, 40000, "capture");
  assert.equal(capture.movedMmol, 40000); assert.equal(totalAirGas(capture.zone), 0);
  machine = normalizeMachine(JSON.parse(JSON.stringify(capture.machine)), machine.kind, "home", "local");
  assert.deepEqual(machine.workshop.process!.airReserve, original);
  const release = recoverHabitat(machine, capture.zone, 40000, "release", 120000); zone = release.zone;
  for (const field of ["oxygenMilliMoles", "inertMilliMoles", "co2MilliMoles", "thermalEnergyMilliJ"] as const) assert.equal(zone[field], original[field]);
  assert.equal(release.machine.workshop.process?.airReserve, null);
});
test("carbon intake and thermal control stop on finite buffers, electricity and coolant", () => {
  const zone = createAirZoneState(room(), { oxygenMilliMoles: 8000, inertMilliMoles: 30000, co2MilliMoles: 2000 }, 40000);
  const scrubber = createMachine("carbon-scrubber", "home", "local"); scrubber.energyJ = 1000;
  const drawn = drawHabitatCarbon(scrubber, zone, 1000);
  assert.equal(drawn.movedMmol, 1000); assert.equal(drawn.zone.co2MilliMoles, 1000);
  assert.deepEqual(drawn.machine.workshop.chemical, { resource: "carbon-dioxide", amount: 24000 });
  const regulator = createMachine("thermal-regulator", "home", "local"); regulator.energyJ = 10000;
  assert.equal(regulateHabitat(regulator, zone).heatMilliJ, 0);
  regulator.workshop.fluid = { resource: "coolant", amount: 2 };
  const cooled = regulateHabitat(regulator, zone);
  assert.equal(cooled.heatMilliJ, -1600000); assert.equal(cooled.machine.energyJ, 8400); assert.equal(cooled.machine.workshop.fluid, null);
  assert.equal(cooled.zone.thermalEnergyMilliJ + cooled.machine.workshop.heatJ * 1000, zone.thermalEnergyMilliJ);
});
test("worker lifecycle discovers all split partitions and conserves displaced gas explicitly", () => {
  const wall = new Set<string>();
  const inside = (p: AirPoint) => p.x >= 0 && p.x <= 2 && p.y >= 0 && p.y <= 2 && p.z >= 0 && p.z <= 2;
  const handler = createAirZoneWorkerHandler(); let posts = 0;
  const runtime: PressureTopology = new PressureTopology({ sectionLoaded: () => true,
    flagsAt: p => inside(p) && !wall.has(`${p.x},${p.y},${p.z}`) ? 1 : 0 }, "home", 1,
  message => { posts++; runtime.receive(handler(message)); });
  runtime.setSources(new Map([["a", { x: 0, y: 0, z: 0 }], ["b", { x: 2, y: 0, z: 0 }]]), new Map(), "loaded");
  for (let i = 0; i < 100; i++) runtime.pump(i * 20);
  assert.equal(runtime.zones.size, 1);
  const old = [...runtime.zones.values()][0], topology = runtime.topologies.get(old.zoneId)!;
  runtime.replace(createAirZoneState(topology, mixtureForFraction(27000)));
  const initialPosts = posts;
  runtime.invalidate({ x: 100, y: 100, z: 100 });
  for (let i = 0; i < 10; i++) runtime.pump(3000 + i * 20);
  assert.equal(posts, initialPosts, "unrelated edits must not re-flood retained rooms");
  for (let y = 0; y <= 2; y++) for (let z = 0; z <= 2; z++) wall.add(`1,${y},${z}`);
  runtime.invalidate({ x: 1, y: 1, z: 1 });
  assert.equal([...runtime.zones.values()][0].status, "checking");
  for (let i = 0; i < 100; i++) runtime.pump(4000 + i * 20);
  assert.equal(runtime.zones.size, 2);
  assert.equal([...runtime.zones.values()].reduce((sum, state) => sum + totalAirGas(state), 0) + totalAirGas(runtime.lost), 27000);
  assert.equal(totalAirGas(runtime.lost), 9000);
});
test("stale worker replies and unloaded cells cannot install breathable state or erase gas", () => {
  let loaded = true; const messages: unknown[] = [];
  const runtime = new PressureTopology({ sectionLoaded: () => loaded, flagsAt: () => loaded ? 1 : undefined }, "home", 9, message => messages.push(message));
  runtime.setSources(new Map([["life", { x: 0, y: 0, z: 0 }]]), new Map(), "one"); runtime.pump(1);
  const request = messages.find((m: unknown) => (m as { type: string }).type === "discover") as Parameters<ReturnType<typeof createAirZoneWorkerHandler>>[0];
  const reply = createAirZoneWorkerHandler()(request);
  loaded = false; runtime.setSources(new Map([["life", { x: 0, y: 0, z: 0 }]]), new Map(), "none");
  assert.equal(runtime.receive(reply), false); assert.equal(runtime.zones.size, 0);
});

test("vent filtered capture and release preserve exact species, heat, finite capacity and cold save custody", () => {
  const zone = createAirZoneState(room(), { oxygenMilliMoles: 8000, inertMilliMoles: 30000, co2MilliMoles: 2000 }, 35000);
  const machine = createMachine("atmosphere-vent", "home", "local"); machine.energyJ = 32000;
  machine.workshop.process!.gasFilter = "carbon-dioxide";
  const device = createPressureDevice("p-1"); device.mode = "capture";
  const captured = operateAtmosphereVent(machine, zone, device, 3000);
  assert.equal(captured.movedMmol, 2000); assert.equal(captured.zone.co2MilliMoles, 0);
  assert.equal(captured.zone.oxygenMilliMoles, zone.oxygenMilliMoles); assert.equal(captured.zone.inertMilliMoles, zone.inertMilliMoles);
  assert.equal(captured.machine.workshop.process!.airReserve!.thermalEnergyMilliJ + captured.zone.thermalEnergyMilliJ, zone.thermalEnergyMilliJ);
  assert.equal(operateAtmosphereVent(captured.machine, zone, device, 3000).movedMmol, 0, "shared gas capacity is full");
  const cold = normalizeMachine(JSON.parse(JSON.stringify(captured.machine)), machine.kind, "home", "local");
  device.mode = "release"; device.targetPressurePa = 120000;
  const released = operateAtmosphereVent(cold, captured.zone, device, 3000);
  for (const field of ["oxygenMilliMoles", "inertMilliMoles", "co2MilliMoles", "thermalEnergyMilliJ"] as const) assert.equal(released.zone[field], zone[field]);
  assert.equal(released.machine.workshop.process!.airReserve, null);
  device.mode = "capture"; cold.energyJ = 0; assert.equal(operateAtmosphereVent(cold, zone, device, 3000).movedMmol, 0);
});

test("balanced vent captures excess composition and supplies configured mixture without free oxygen", () => {
  let machine = createMachine("atmosphere-vent", "home", "local"); machine.energyJ = 160000; machine.workshop.upgrades.capacity = 4;
  machine.workshop.chemical = { resource: "oxygen", amount: 24000 };
  machine.workshop.process!.chemicalAux = { resource: "inert", amount: 85000 };
  const device = createPressureDevice("p-1"); device.mode = "balanced"; device.targetPressurePa = 10000; device.mixture = { oxygenPermille: 180, co2Permille: 0 };
  let zone = createAirZoneState(room(), { oxygenMilliMoles: 0, inertMilliMoles: 0, co2MilliMoles: 1000 });
  for (let i = 0; i < 40; i++) { const result = operateAtmosphereVent(machine, zone, device, 2000); machine = result.machine; zone = result.zone; }
  assert.equal(zone.co2MilliMoles, 0); assert.equal(machine.workshop.process!.airReserve!.co2MilliMoles, 1000);
  assert.ok(zone.pressureMilliKPa > 9900 && zone.pressureMilliKPa <= 10000);
  assert.ok(Math.abs(zone.oxygenMilliMoles / totalAirGas(zone) - .18) < .001, JSON.stringify({ zone, reserve: machine.workshop.process!.airReserve, stores: [machine.workshop.chemical, machine.workshop.process!.chemicalAux] }));
  assert.equal(zone.oxygenMilliMoles * 24 + machine.workshop.chemical!.amount, 24000);
  assert.equal(zone.inertMilliMoles * 24 + machine.workshop.process!.chemicalAux!.amount, 85000);
});

test("equalization respects receiving target and physical direction without merging or losing heat", () => {
  const front = createAirZoneState(room(), mixtureForFraction(40000), 30000);
  const back = { ...createAirZoneState(room(), mixtureForFraction(2000), 10000), zoneId: "back" };
  const blocked = equalizeHabitat(front, back, 40000, 20000, "back-to-front"); assert.equal(blocked.transferredMilliMoles, 0);
  const moved = equalizeHabitat(front, back, 40000, 20000, "front-to-back");
  assert.ok(moved.transferredMilliMoles > 0); assert.ok(moved.b.pressureMilliKPa <= 20000); assert.ok(moved.a.pressureMilliKPa >= moved.b.pressureMilliKPa);
  assert.equal(moved.a.zoneId, front.zoneId); assert.equal(moved.b.zoneId, back.zoneId);
  for (const field of ["oxygenMilliMoles", "inertMilliMoles", "co2MilliMoles", "thermalEnergyMilliJ"] as const) assert.equal(moved.a[field] + moved.b[field], front[field] + back[field]);
  assert.equal(equalizeHabitat(moved.a, moved.b, 40000, 20000, "both").transferredMilliMoles, 0);
  assert.equal(equalizeHabitat({ ...front, status: "unknown" }, back, 40000, 20000, "both").transferredMilliMoles, 0);
});

test("new pressure configuration is exact, bounded and compatible with old saves", () => {
  const device = createPressureDevice("p-1"), legacy = Object.fromEntries(Object.entries(device).filter(([key]) => !["mixture", "sensor", "valveDirection"].includes(key)));
  assert.deepEqual(normalizePressureDevice(legacy), device);
  for (const action of [{ kind: "mixture", oxygenPermille: 800, co2Permille: 201 }, { kind: "mixture", oxygenPermille: 210.1, co2Permille: 0 },
    { kind: "valve", direction: "both", hidden: true }, { kind: "sensor", ...device.sensor, minimumPressurePa: 130000 }, { kind: "sensor", ...device.sensor, maximumCo2Ppm: -1 }]) assert.equal(parsePressureAction(action), null);
  for (const action of [{ kind: "mixture", oxygenPermille: 180, co2Permille: 0 }, { kind: "valve", direction: "front-to-back" }, { kind: "sensor", ...device.sensor }, { kind: "link", role: "vent", target: "1,2,3" }]) assert.ok(parsePressureAction(action));
  assert.equal(normalizePressureDevice({ ...device, mixture: { oxygenPermille: 210, co2Permille: 0, hidden: true } }), null);
  assert.equal(normalizePressureDevice({ ...device, mixture: { kind: "mode", mode: "supply" } }), null);
  assert.equal(parsePressureAction({ kind: "valve", direction: { toString: () => "both" } }), null);
  assert.equal(parsePressureAction({ kind: "sensor", ...device.sensor, output: { toString: () => "alarm" } }), null);
});
