import assert from "node:assert/strict";
import test from "node:test";
import { createMachine, normalizeMachine } from "../app/game/wayworks.ts";
import { createAirZoneState, discoverAirZone, totalAirGas, type AirPoint } from "../app/game/airzone.ts";
import { createAirZoneWorkerHandler } from "../app/game/airzone-worker-protocol.ts";
import { admitAmbientAir, supplyHabitat, recoverHabitat, drawHabitatCarbon, regulateHabitat, mixtureForFraction } from "../app/game/pressure-habitat.ts";
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
