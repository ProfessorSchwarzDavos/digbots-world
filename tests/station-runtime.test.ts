import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BLOCKS, BlockId, Item } from "../app/game/data";
import { createAirZoneState, discoverAirZone } from "../app/game/airzone";
import { VoxelEngine } from "../app/game/engine";
import { homeLocation, locationId, universeId } from "../app/game/location-address";
import { createStationRegistry, remapStationRegistry, validateStationRegistrySave } from "../app/game/orbital-station";
import { createSurveyHopper, planSpaceVehicleTravel, remapSpacefleetUniverse } from "../app/game/space-vehicle";
import { planStationFoundation, planStationCabin, planStationDock, planStationDockRegistration, shipDock, validateStationFleetCustody, type StationBlock } from "../app/game/station-runtime";
import { createMachine } from "../app/game/wayworks";
import { composeUniverseSave, splitUniverseSave } from "../app/game/universe-save";
import { flightFixture } from "./spaceflight-fixtures";
import { measureStation } from "../app/game/station-telemetry";
import type { PressureRuntime } from "../app/game/pressure-runtime";

const universe = universeId("station-runtime"), orbit = locationId({ ...homeLocation(universe), kind: "orbit", instanceId: "low" });
const actor = { actorId: "local", factionIds: [], guildIds: [] };
function fixture() {
  const ship = structuredClone(createSurveyHopper("hopper", "local", orbit, [0, 32.51, 0]));
  ship.phase = "orbit"; ship.fuelMl = 60000; ship.oxidizerMl = 90000; ship.oxygenMl = 20000; ship.batteryJoules = 60000;
  ship.passengers = [{ actorId: "local", seat: 0, consent: true, connected: true }];
  ship.cargo[0] = { item: Item.Berry, count: 7, metadata: { note: "station exact custody" } }; ship.cargoOwnership[0] = "cargo-owner";
  const cells = new Map<string, BlockId>();
  const blockAt = (x: number, y: number, z: number) => cells.get(`${x},${y},${z}`) ?? BlockId.Air;
  const inventory = [{ item: BlockId.StationCore, count: 1 }, { item: BlockId.OrbitalDock, count: 1 }, { item: BlockId.StationTruss, count: 8 }];
  const registry = createStationRegistry(orbit);
  const plan = () => planStationFoundation({ registry, actor, ship, inventory, name: "Home Observatory", actionId: "found", stationId: "station", blockAt, blocked: () => false });
  return { ship, cells, blockAt, inventory, registry, plan };
}
function founded() {
  const f = fixture(), plan = f.plan();
  for (const block of plan.blocks) f.cells.set(`${block.x},${block.y},${block.z}`, block.type);
  return { ...f, registry: plan.registry, inventory: plan.inventory, blocks: plan.blocks };
}

test("station telemetry counts only authorized physically loaded local buffers and keeps service separate from storage", () => {
  const f = founded(), station = structuredClone(f.registry.stations.station), machines = new Map<string, ReturnType<typeof createMachine>>();
  const add = (key: string, kind: "field-battery" | "gas-tank", owner = "local") => {
    const value = createMachine(kind, orbit, owner); machines.set(key, value);
    f.cells.set(key, kind === "gas-tank" ? BlockId.GasTank : BlockId.FieldBattery); return value;
  };
  const battery = add("8,32,1", "field-battery"); battery.energyJ = 5000;
  const gas = add("9,32,1", "gas-tank"); gas.workshop.chemical = { resource: "oxygen", amount: 24000 };
  add("10,32,1", "field-battery", "private-other").energyJ = 7777;
  add("100,32,1", "field-battery").energyJ = 8888;
  add("8,32,2", "field-battery").energyJ = 9999; f.cells.delete("8,32,2");
  add("8,32,3", "field-battery").locationId = "foreign";
  const pressure: Pick<PressureRuntime, "devices" | "diagnosticsFor"> = { devices: new Map(), diagnosticsFor: () => assert.fail("No pressure device is present") };
  const input = { station, actor, machines, pressure, blockAt: f.blockAt };
  const before = structuredClone(machines), measured = measureStation(input)!;
  assert.equal(measured.buffers?.energyJ, 5000); assert.equal(measured.buffers?.oxygenMl, 24000);
  assert.equal(measured.buffers?.machines, 2); assert.deepEqual(measured.rooms, []); assert.deepEqual(machines, before);
  const guest = { ...actor, actorId: "guest" };
  assert.equal(measureStation({ ...input, actor: guest }), null);
  station.access["life-support"] = "public"; battery.workshop.trusted.push("guest"); gas.workshop.trusted.push("guest");
  assert.equal(measureStation({ ...input, actor: guest })?.buffers, null, "service must not disclose finite stores");
  station.access.container = "public";
  assert.equal(measureStation({ ...input, actor: guest })?.buffers?.energyJ, 5000);
  f.cells.delete(station.corePosition.join(",")); assert.equal(measureStation(input), null, "removed core invalidates station measurements");
});

test("actual observatory request debits finite electricity into heat and exposes only filtered chart data", async () => {
  const f = founded(), key = "8,33,0", messages: string[] = [];
  f.cells.set(key, BlockId.StationObservatory);
  const instrument = createMachine("station-observatory", orbit, "local"); instrument.energyJ = 2000;
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    persistent: true, activeWorldId: universe, locationTransitioning: false, spaceflightBusy: false, pendingSpaceArrival: null,
    orbitalStations: f.registry, spacefleet: { schema: 1, vehicles: {} }, activeWayworksKey: key,
    wayworks: new Map([[key, instrument]]), position: new THREE.Vector3(8, 32.5, 2),
    world: { locationScope: { locationId: orbit }, getBlock: f.blockAt }, universeTimeSeconds: 12345,
    events: { onToast: (message: string) => messages.push(message) }, emitHud: () => {}, saveSoon: () => {},
  }) as VoxelEngine;
  const intent = { kind: "observatory-read" as const }, original = structuredClone(instrument);
  assert.equal(await engine.spaceflightAction(intent), false, "revision required for the paid read");
  instrument.enabled = false; assert.equal(await engine.spaceflightAction(intent, 0), false); instrument.enabled = true;
  engine.position.x += 10; assert.equal(await engine.spaceflightAction(intent, 0), false); engine.position.x -= 10;
  Reflect.set(engine, "multiplayer", { role: "guest" }); assert.equal(await engine.spaceflightAction(intent, 0), false); Reflect.set(engine, "multiplayer", null);
  assert.deepEqual(engine.wayworks.get(key), original);
  assert.equal(await engine.spaceflightAction(intent, 0), true, messages.at(-1));
  const paid = engine.wayworks.get(key)!;
  assert.equal(paid.energyJ, 1000); assert.equal(paid.workshop.heatJ, 1000); assert.equal(paid.revision, 1);
  const charts = Reflect.get(engine, "observatoryCharts");
  assert.deepEqual(charts.system.bodies.map((body: { id: string }) => body.id), ["waystar", "blockwild", "blockwild/morrow"]);
  for (const hidden of ["talon", "hollowmere", "Cinderhymn", "catalog"]) assert.ok(!JSON.stringify(charts).includes(hidden));
  assert.equal(await engine.spaceflightAction(intent, 0), false); assert.deepEqual(engine.wayworks.get(key), paid);
  assert.equal(await engine.spaceflightAction(intent, 1), true); assert.equal(engine.wayworks.get(key)!.energyJ, 0);
  assert.equal(await engine.spaceflightAction(intent, 2), false); assert.equal(engine.wayworks.get(key)!.workshop.heatJ, 2000);
});

test("finite starter deck consumes exactly the empty kit and never makes gas, energy or a new ship", () => {
  const f = fixture(), shipBefore = structuredClone(f.ship), plan = f.plan();
  assert.deepEqual(plan.inventory, [null, null, null]); assert.equal(plan.blocks.length, 10);
  assert.equal(plan.blocks.filter(block => block.type === BlockId.StationTruss).length, 8);
  assert.deepEqual(f.ship, shipBefore); assert.equal(f.inventory[2].count, 8);
  assert.equal(plan.registry.stations.station.pressureZoneIds.length, 0);
  f.inventory[2].count = 7; assert.throws(f.plan, /Carry/); assert.equal(f.registry.revision, 0);
});

test("additional collar registration binds an existing physical block without inventory or fleet changes", () => {
  const f = founded(), position: [number, number, number] = [6, 32, 6];
  const input = { registry: f.registry, stationId: "station", actor, position, actionId: "register", dockId: "second", expectedRegistryRevision: 1, blockAt: f.blockAt };
  assert.throws(() => planStationDockRegistration(input), /intact collar/);
  f.cells.set(position.join(","), BlockId.OrbitalDock);
  const before = structuredClone({ inventory: f.inventory, ship: f.ship, cells: f.cells, registry: f.registry });
  const registry = planStationDockRegistration(input);
  assert.deepEqual(registry.stations.station.docks.second.position, position);
  assert.deepEqual({ inventory: f.inventory, ship: f.ship, cells: f.cells, registry: f.registry }, before);
  assert.deepEqual(validateStationRegistrySave(JSON.parse(JSON.stringify(registry))), registry);
  assert.throws(() => planStationDockRegistration({ ...input, registry, expectedRegistryRevision: 2, actionId: "again", dockId: "third" }), /already registered/);
  assert.throws(() => planStationDockRegistration({ ...input, expectedRegistryRevision: 0 }), /Inspect/);
  assert.throws(() => planStationDockRegistration({ ...input, actor: { ...actor, actorId: "guest" } }), /permission/);
  assert.throws(() => planStationDockRegistration({ ...input, position: [40, 32, 6] }), /claim/);
});

test("actual engine registers only owned nearby collars with current station revision and no ship", async () => {
  const f = founded(), position: [number, number, number] = [6, 32, 12], key = position.join(","), messages: string[] = [];
  f.cells.set(key, BlockId.OrbitalDock);
  const collar = createMachine("orbital-dock", orbit, "local"); collar.energyJ = 500;
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    persistent: true, activeWorldId: "station-runtime", orbitalStations: f.registry, multiplayer: null,
    position: new THREE.Vector3(...position).addScalar(.5), spacefleet: { schema: 1, vehicles: {} }, wayworks: new Map([[key, collar]]),
    world: { locationScope: { locationId: orbit }, getBlock: f.blockAt }, inventory: f.inventory,
    events: { onToast: (message: string) => messages.push(message) }, emitHud: () => {}, saveSoon: () => {},
  }) as VoxelEngine;
  const intent = { kind: "station-register-dock" as const, stationId: "station", registryRevision: 1, position };
  const stores = structuredClone({ machine: collar, inventory: engine.inventory, fleet: engine.spacefleet });
  collar.ownerId = "other"; assert.equal(await engine.spaceflightAction(intent), false); collar.ownerId = "local";
  engine.position.x += 20; assert.equal(await engine.spaceflightAction(intent), false); engine.position.x -= 20;
  assert.equal(await engine.spaceflightAction(intent), true, messages.at(-1));
  assert.equal(Object.keys(engine.orbitalStations!.stations.station.docks).length, 2);
  assert.deepEqual({ machine: collar, inventory: engine.inventory, fleet: engine.spacefleet }, stores);
  const registered = structuredClone(engine.orbitalStations);
  assert.equal(await engine.spaceflightAction(intent), false); assert.deepEqual(engine.orbitalStations, registered);
});

test("foundation rejects blocked cells, foreign ships, sealed kits and intersecting claims without mutation", () => {
  const f = fixture(); f.cells.set("4,32,0", BlockId.Stone); assert.throws(f.plan, /empty/); f.cells.clear();
  f.ship.ownerId = "other"; assert.throws(f.plan, /your stationary/); f.ship.ownerId = "local";
  Object.assign(f.inventory[0], { metadata: { wayworks: { energyJ: 900 } } }); assert.throws(f.plan, /Carry/);
  const g = founded();
  assert.throws(() => planStationFoundation({ ...g, actor, name: "Overlap", actionId: "second", stationId: "other", blocked: () => false }), /existing station claim/);
});

test("cabin blueprint debits exact ordinary blocks, leaves a real socket and preserves the door vessel", () => {
  const f = founded(), door = createMachine("pressure-door", orbit, "local"); door.energyJ = 12000;
  const inventory = [{ item: BlockId.StoneBrick, count: 37 }, { item: BlockId.ReinforcedWindow, count: 2 },
    { item: BlockId.StationTruss, count: 1 }, { item: BlockId.PressureDoor, count: 1, metadata: { wayworks: door } }];
  const input = { ...f, stationId: "station", actor, inventory, blocked: () => false };
  const plan = planStationCabin(input);
  assert.deepEqual(plan.inventory, [null, null, null, null]); assert.equal(plan.blocks.length, 42);
  assert.equal(plan.blocks.filter(block => block.type === BlockId.StoneBrick).length, 37);
  assert.deepEqual(plan.blocks.filter(block => block.type === BlockId.ReinforcedWindow).map(block => block.facing).sort(), [1, 2]);
  assert.deepEqual(plan.doorSlot.metadata?.wayworks, door); assert.deepEqual(plan.socket, [9, 33, -1]);
  assert.ok(!plan.blocks.some(block => [block.x, block.y, block.z].join() === plan.socket.join()));
  assert.equal(inventory[0].count, 37); assert.equal(f.registry.revision, 1);
  assert.throws(() => planStationCabin({ ...input, blocked: () => true }), /unoccupied/);
  assert.throws(() => planStationCabin({ ...input, actor: { ...actor, actorId: "guest" } }), /permission/);
  inventory[0].count--; assert.throws(() => planStationCabin(input), /37 Stone/); inventory[0].count++;
  for (const block of plan.blocks) f.cells.set(`${block.x},${block.y},${block.z}`, block.type);
  assert.throws(() => planStationCabin(input), /unoccupied/);
  const topology = () => discoverAirZone({ epochs: { locationId: orbit, generation: 1, topologyRevision: 1, requestId: 1 },
    seed: { x: 9, y: 33, z: 0 }, cells: Array.from({ length: 5 * 7 * 5 }, (_, i) => {
      const x = 7 + i % 5, z = -2 + Math.floor(i / 5) % 5, y = 31 + Math.floor(i / 25);
      return { x, y, z, passable: !BLOCKS[f.blockAt(x, y, z)].solid, sealMask: 0,
        controllerIds: x === 9 && y === 33 && z === 0 && f.blockAt(...plan.socket) === BlockId.LifeSupportController ? [plan.socket.join(",")] : [] };
    }) });
  assert.notEqual(topology().status, "sealed", "empty socket does not seal the cabin");
  f.cells.set(plan.socket.join(","), BlockId.LifeSupportController);
  const sealed = topology(); assert.equal(sealed.status, "sealed"); assert.equal(sealed.cellCount, 3);
  assert.equal(createAirZoneState(sealed).pressureMilliKPa, 0, "a new sealed shell starts empty");
});

test("dock and undock jointly preserve exact finite custody, block launch and remap safely", () => {
  const f = founded(), original = structuredClone(f.ship);
  const input = { registry: f.registry, fleet: { schema: 1 as const, vehicles: { hopper: f.ship } }, actor, vehicleId: "hopper", stationId: "station", dockId: "station:dock",
    expectedRegistryRevision: 1, expectedVehicleRevision: 0, actionId: "dock", undock: false, blockAt: f.blockAt };
  const docked = planStationDock(input), ship = docked.fleet.vehicles.hopper;
  assert.deepEqual(ship.transform.position, [4, 32.51, 0]); assert.equal(shipDock(ship)?.stationId, "station");
  const moved = structuredClone(docked.fleet); moved.vehicles.hopper.transform.position[0]++;
  assert.throws(() => validateStationFleetCustody(docked.registry, moved), /custody/);
  const drifting = structuredClone(docked.fleet); drifting.vehicles.hopper.velocity[1] = .1;
  assert.throws(() => validateStationFleetCustody(docked.registry, drifting), /custody/);
  for (const key of ["cargo", "cargoOwnership", "hull", "fuelMl", "oxidizerMl", "oxygenMl", "batteryJoules", "passengers"] as const) assert.deepEqual(ship[key], original[key]);
  const stamp = { locationId: orbit, epoch: 1, revision: 1 };
  assert.throws(() => planSpaceVehicleTravel(ship, stamp, { ...stamp, locationId: locationId(homeLocation(universe)) }, "trip"), /undock/);
  assert.throws(() => planStationDock({ ...input, registry: docked.registry, fleet: docked.fleet }), /Inspect/);
  const importedId = universeId("imported-station"), importedRegistry = remapStationRegistry(docked.registry, importedId);
  const importedFleet = remapSpacefleetUniverse(docked.fleet, universe, importedId);
  validateStationFleetCustody(importedRegistry, importedFleet);
  assert.equal(importedRegistry.revision, 0); assert.deepEqual(importedRegistry.journal, []);
  assert.equal(shipDock(importedFleet.vehicles.hopper)?.locationId, importedRegistry.locationId);
  const freed = planStationDock({ ...input, registry: docked.registry, fleet: docked.fleet, expectedRegistryRevision: 2, expectedVehicleRevision: 1, actionId: "undock", undock: true });
  assert.equal(shipDock(freed.fleet.vehicles.hopper), null); assert.equal(freed.registry.stations.station.docks["station:dock"].occupant, null);
  assert.deepEqual(freed.fleet.vehicles.hopper.cargo, original.cargo);
});

test("docking checks actual core/collar, loaded approach, occupants, reach and owner", () => {
  const f = founded();
  const input = { registry: f.registry, fleet: { schema: 1 as const, vehicles: { hopper: f.ship } }, actor, vehicleId: "hopper", stationId: "station", dockId: "station:dock",
    expectedRegistryRevision: 1, expectedVehicleRevision: 0, actionId: "dock", undock: false, blockAt: f.blockAt };
  f.cells.set("4,33,0", BlockId.Stone); assert.throws(() => planStationDock(input), /Clear/); f.cells.delete("4,33,0");
  assert.throws(() => planStationDock({ ...input, blocked: () => true }), /Clear/);
  assert.throws(() => planStationDock({ ...input, actor: { ...actor, actorId: "guest" } }), /owner/);
  f.ship.transform.position[0] = 50; assert.throws(() => planStationDock(input), /eight blocks/); f.ship.transform.position[0] = 0;
  f.cells.delete("6,32,0"); assert.throws(() => planStationDock(input), /Repair/);
});

test("station save is location-owned, rejects foreign binding and mismatched ship ownership", () => {
  const f = founded(), save = flightFixture("station-save").initial;
  save.orbitalStations = f.registry; save.spacefleet = { schema: 1, vehicles: { hopper: f.ship } };
  const parts = splitUniverseSave(save);
  assert.equal(parts.universe.orbitalStations, undefined); assert.deepEqual(composeUniverseSave(parts).orbitalStations, f.registry);
  assert.throws(() => validateStationRegistrySave(f.registry, locationId(homeLocation(universe))), /location mismatch/);
  const corrupt = structuredClone(f.registry); corrupt.stations.station.docks["station:dock"].occupant = { vehicleId: "missing", ownerId: "local", vehicleRevision: 0 };
  assert.throws(() => validateStationFleetCustody(corrupt, save.spacefleet!), /custody/);
});

test("actual station core administration remains usable without a nearby spacecraft", async () => {
  const f = founded(), messages: string[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    persistent: true, activeWorldId: "station-runtime", locationTransitioning: false, spaceflightBusy: false, pendingSpaceArrival: null,
    multiplayer: null, remotePlayers: new Map(), spacefleet: { schema: 1, vehicles: {} }, orbitalStations: f.registry,
    activeWayworksKey: null, wayworks: new Map(), position: new THREE.Vector3(6, 33, 0),
    world: { locationScope: { locationId: orbit, epoch: 1, revision: 1 }, getBlock: f.blockAt },
    events: { onToast: (message: string) => messages.push(message) }, emitHud: () => {}, saveSoon: () => {},
  }) as VoxelEngine;
  const rename = { kind: "station-name" as const, stationId: "station", registryRevision: 1, name: "Independent Observatory", icon: "observatory" };
  assert.equal(await engine.spaceflightAction(rename), true, messages.at(-1));
  assert.equal(engine.orbitalStations!.stations.station.name, rename.name);
  assert.equal(engine.orbitalStations!.stations.station.icon, rename.icon);
  assert.deepEqual(engine.spacefleet, { schema: 1, vehicles: {} }, "station administration cannot create or alter a ship");
  const saved = structuredClone(engine.orbitalStations);
  assert.equal(await engine.spaceflightAction(rename), false, "stale registry revision rejected");
  assert.deepEqual(engine.orbitalStations, saved);
  engine.position.x += 30;
  assert.equal(await engine.spaceflightAction({ ...rename, registryRevision: 2 }), false, "remote administration rejected");
  engine.position.x -= 30; f.cells.delete("6,32,0");
  assert.equal(await engine.spaceflightAction({ ...rename, registryRevision: 2 }), false, "missing physical core rejected");
});

test("actual engine founders consume physical kit, dock, deny stale/guest edits and retain location-bound grants", async () => {
  const f = fixture(), messages: string[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    persistent: true, activeWorldId: "station-runtime", locationTransitioning: false, spaceflightBusy: false, pendingSpaceArrival: null,
    multiplayer: null, remotePlayers: new Map(), spacefleet: { schema: 1, vehicles: { hopper: f.ship } }, orbitalStations: null,
    activeWayworksKey: null, wayworks: new Map(), inventory: f.inventory, position: new THREE.Vector3(0, 32.51, 0), velocity: new THREE.Vector3(),
    world: { locationScope: { locationId: orbit, epoch: 1, revision: 1 }, getBlock: f.blockAt,
      setBlocksBatch: (blocks: StationBlock[]) => blocks.forEach(block => f.cells.set(`${block.x},${block.y},${block.z}`, block.type)), setBlockFacing: () => {} },
    currentPlayerHeight: () => 1.8, publishBlockEdits: () => {}, events: { onToast: (message: string) => messages.push(message) }, emitHud: () => {}, saveSoon: () => {},
  }) as VoxelEngine;
  const found = { kind: "station-found" as const, name: "Actual station", registryRevision: 0, vehicleRevision: 0 };
  Reflect.set(engine, "multiplayer", { role: "guest" }); assert.equal(await engine.spaceflightAction(found), false); Reflect.set(engine, "multiplayer", null);
  assert.equal(await engine.spaceflightAction(found), true, messages.at(-1)); assert.equal(engine.wayworks.size, 10);
  assert.ok([...engine.wayworks.values()].every(machine => machine.energyJ === 0 && !machine.workshop.fluid && !machine.workshop.chemical));
  assert.deepEqual(engine.inventory, [null, null, null]); assert.equal(await engine.spaceflightAction(found), false);
  const station = Object.values(engine.orbitalStations!.stations)[0], dock = Object.values(station.docks)[0];
  assert.equal(await engine.spaceflightAction({ kind: "station-dock", stationId: station.id, dockId: dock.id, undock: false, registryRevision: 1, vehicleRevision: 0 }), true, messages.at(-1));
  const allowed = (id: string, permission: string) => Reflect.get(engine, "stationActorAccess").call(engine, id, ...station.corePosition, permission);
  assert.equal(allowed("local", "build"), true); assert.equal(allowed("guest", "build"), false);
  assert.equal(await engine.spaceflightAction({ kind: "station-access", stationId: station.id, memberIds: ["guest"], association: null,
    access: { ...station.access, build: "trusted" }, registryRevision: 2 }), true, messages.at(-1));
  assert.equal(allowed("guest", "build"), true); assert.equal(allowed("guest", "container"), false);
  const door = createMachine("pressure-door", orbit, "local"); door.energyJ = 12000;
  engine.inventory = [{ item: BlockId.StoneBrick, count: 37 }, { item: BlockId.ReinforcedWindow, count: 2 },
    { item: BlockId.StationTruss, count: 1 }, { item: BlockId.PressureDoor, count: 1, metadata: { wayworks: door } }];
  assert.equal(await engine.spaceflightAction({ kind: "station-cabin", stationId: station.id, registryRevision: 3 }), true, messages.at(-1));
  assert.deepEqual(engine.inventory, [null, null, null, null]); assert.equal(engine.wayworks.size, 12);
  assert.equal([...engine.wayworks.values()].find(machine => machine.kind === "pressure-door")?.energyJ, 12000);
  assert.equal(await engine.spaceflightAction({ kind: "leave", vehicleRevision: 1 }), true);
  engine.position.set(station.corePosition[0] + 3, station.corePosition[1] + .5, station.corePosition[2]);
  const zoneId = `${orbit}:air:0123456789abcdef`, fleetBefore = structuredClone(engine.spacefleet);
  Reflect.set(engine, "pressureRuntime", { snapshot: () => ({ zones: [{ zoneId, cellKeys: [engine.position.clone().floor().toArray().join(",")] }] }) });
  assert.equal(await engine.spaceflightAction({ kind: "station-habitat", stationId: station.id, registryRevision: 3 }), true,
    `nearby station administration does not require boarding through a sealed wall: ${messages.at(-1)}`);
  assert.deepEqual(engine.orbitalStations!.stations[station.id].pressureZoneIds, [zoneId]);
  assert.deepEqual(engine.spacefleet, fleetBefore);
  engine.position.x += 20;
  assert.equal(await engine.spaceflightAction({ kind: "station-habitat", stationId: station.id, registryRevision: 4 }), false);
  engine.position.x -= 20; f.cells.delete(station.corePosition.join(","));
  assert.equal(await engine.spaceflightAction({ kind: "station-habitat", stationId: station.id, registryRevision: 4 }), false);
});
