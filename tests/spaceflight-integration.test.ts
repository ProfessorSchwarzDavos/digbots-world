import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BlockId, Item } from "../app/game/data";
import { VoxelEngine } from "../app/game/engine";
import { BiomeId, ChunkWorld, CHUNK_SIZE, MIN_Y } from "../app/game/world";
import { createMachine } from "../app/game/wayworks";
import { homeLocation, locationId, universeId } from "../app/game/location-address";
import { supplyVehicleFromMachine } from "../app/game/spaceflight-infrastructure";
import { createSurveyHopper, SURVEY_HOPPER_CAPACITY, type SpacefleetSave } from "../app/game/space-vehicle";

const home = homeLocation(universeId("normal-flight-host"));
const origin = { locationId: locationId(home), epoch: 1, revision: 1 };
const index = (x: number, y: number, z: number) => (y - MIN_Y) * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;

test("normal host mission deploys one crafted ship, consumes gantry stores, boards, consents, aborts and relaunches", async () => {
  const wayworks = new Map<string, ReturnType<typeof createMachine>>();
  wayworks.set("4,10,0", createMachine("mission-console", origin.locationId, "local"));
  const gantry = createMachine("fuel-gantry", origin.locationId, "local");
  gantry.energyJ = 60000; gantry.workshop.fluid = { resource: "refined-rocket-fuel", amount: 50000 }; gantry.workshop.chemical = { resource: "oxygen", amount: 100000 };
  wayworks.set("3,10,0", gantry);
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) wayworks.set(`${x},10,${z}`, createMachine("launch-pad", origin.locationId, "local"));
  const messages: string[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    persistent: true, activeWorldId: "normal-flight-host", locationTransitioning: false, spaceflightBusy: false, pendingSpaceArrival: null,
    multiplayer: null, remotePlayers: new Map(), spacefleet: { schema: 1, vehicles: {} }, spaceflightRoute: "home-orbit", wayworks,
    activeWayworksKey: "4,10,0", position: new THREE.Vector3(4, 11, 0), velocity: new THREE.Vector3(), weather: "clear",
    inventory: [{ item: Item.SurveyHopper, count: 1 }], selected: 0,
    world: { locationScope: origin, getBlock: (x: number, y: number, z: number) => {
      if (y === 9) return BlockId.Stone;
      if (y === 10 && Math.abs(x) <= 1 && Math.abs(z) <= 1) return BlockId.LaunchPad;
      return x === 4 && y === 10 && z === 0 ? BlockId.MissionConsole : BlockId.Air;
    } }, events: { onToast: (message: string) => messages.push(message) }, emitHud: () => {}, saveSoon: () => {},
    worldStorage: { describeLocation: async (destination: string) => ({ stamp: { locationId: destination, epoch: 1, revision: 0 }, spawn: null }) },
  }) as VoxelEngine;
  assert.equal(await engine.spaceflightAction({ kind: "deploy" }), true, messages.at(-1));
  assert.equal(engine.inventory[0], null); assert.equal(Object.keys(engine.spacefleet.vehicles).length, 1);
  const id = Object.keys(engine.spacefleet.vehicles)[0], ship = () => engine.spacefleet.vehicles[id];
  for (const resource of ["fuelMl", "oxidizerMl"] as const) assert.equal(await engine.spaceflightAction({ kind: "supply", resource, vehicleRevision: ship().revision }), true, messages.at(-1));
  assert.equal(ship().fuelMl, 50000); assert.equal(ship().oxidizerMl, 100000);
  assert.equal(ship().oxygenMl, 0, "oxidizer loading cannot also duplicate gas into cabin");
  assert.equal(await engine.spaceflightAction({ kind: "supply", resource: "oxygenMl", vehicleRevision: ship().revision }), false);
  // Staged source replenishment is explicit; normal chemistry is a separate gate.
  wayworks.get("3,10,0")!.workshop.chemical = { resource: "oxygen", amount: 20000 };
  for (const resource of ["oxygenMl", "batteryJoules"] as const) assert.equal(await engine.spaceflightAction({ kind: "supply", resource, vehicleRevision: ship().revision }), true);
  engine.inventory[0] = { item: Item.Berry, count: 7, metadata: { note: "exact nested custody" } };
  assert.equal(await engine.spaceflightAction({ kind: "cargo-in", slot: 2, vehicleRevision: ship().revision }), true);
  assert.equal(engine.inventory[0], null); assert.equal(ship().cargo[2]?.count, 7);
  assert.equal(await engine.spaceflightAction({ kind: "board", vehicleRevision: ship().revision }), true);
  assert.equal(await engine.spaceflightAction({ kind: "launch", vehicleRevision: ship().revision }), false, "missing consent blocks launch");
  assert.equal(await engine.spaceflightAction({ kind: "consent", vehicleRevision: ship().revision }), true);
  const fuelBefore = ship().fuelMl;
  assert.equal(await engine.spaceflightAction({ kind: "launch", vehicleRevision: ship().revision }), true, messages.at(-1));
  assert.equal(ship().phase, "countdown");
  assert.equal(await engine.spaceflightAction({ kind: "abort", vehicleRevision: ship().revision }), true);
  assert.equal(ship().fuelMl, fuelBefore); assert.equal(ship().trip, null);
  assert.equal(await engine.spaceflightAction({ kind: "launch", vehicleRevision: ship().revision }), true);
  assert.equal(ship().cargo[2]?.metadata?.note, "exact nested custody");
});

test("gantry quote atomically caps each finite store and rejects stale or unpermitted sources", () => {
  const ship = createSurveyHopper("ship", "local", origin.locationId, [0, 10, 0]);
  let fleet: SpacefleetSave = { schema: 1, vehicles: { ship } }, machine = createMachine("fuel-gantry", origin.locationId, "local");
  machine.energyJ = 240000; machine.workshop.chemical = { resource: "oxygen", amount: 200000 };
  const take = (resource: "oxidizerMl" | "oxygenMl" | "batteryJoules") => supplyVehicleFromMachine({ fleet, vehicleId: "ship", expectedVehicleRevision: fleet.vehicles.ship.revision,
    machine, machineKey: "2,10,0", expectedMachineRevision: machine.revision, actorId: "local", actorLocationId: origin.locationId,
    resource, maximum: SURVEY_HOPPER_CAPACITY[resource], actionId: resource });
  let result = take("oxidizerMl"); fleet = result.fleet; machine = result.machine;
  assert.equal(result.amount, 180000); assert.equal(machine.workshop.chemical!.amount, 20000);
  result = take("oxygenMl"); fleet = result.fleet; machine = result.machine;
  assert.equal(result.amount, 20000); assert.equal(machine.workshop.chemical, null);
  result = take("batteryJoules"); assert.equal(result.machine.energyJ, 0); assert.equal(result.fleet.vehicles.ship.batteryJoules, 240000);
  machine.ownerId = "stranger"; assert.throws(() => take("oxygenMl"), /not permitted/);
});

test("EVA crew can reboard nearby without a console, while host, location, distance and access gates remain", async () => {
  const ship = structuredClone(createSurveyHopper("return-ship", "local", origin.locationId, [1, 32.51, 1]));
  const messages: string[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    persistent: true, activeWorldId: "return-host", locationTransitioning: false, spaceflightBusy: false, pendingSpaceArrival: null,
    multiplayer: null, spacefleet: { schema: 1, vehicles: { [ship.vehicleId]: ship } }, activeWayworksKey: null, wayworks: new Map(),
    position: new THREE.Vector3(3.5, 32.5, 1), world: { locationScope: origin },
    events: { onToast: (message: string) => messages.push(message) }, emitHud: () => {}, saveSoon: () => {},
  }) as VoxelEngine;
  const board = () => engine.spaceflightAction({ kind: "board", vehicleRevision: 0 });
  engine.position.x = 8; assert.equal(await board(), false, "six-block boarding reach");
  engine.position.x = 3.5;
  Reflect.set(engine, "multiplayer", { role: "guest" }); assert.equal(await board(), false);
  Reflect.set(engine, "multiplayer", null);
  ship.ownerId = "other"; assert.equal(await board(), false, "nearby is not permission"); ship.ownerId = "local";
  ship.locationId = locationId({ ...home, kind: "orbit", instanceId: "low" }); assert.equal(await board(), false);
  ship.locationId = origin.locationId;
  assert.equal(await engine.spaceflightAction({ kind: "cargo-out", vehicleRevision: 0, slot: 0 }), false, "boarding exception is not general console authority");
  assert.equal(await engine.spaceflightAction({ kind: "board", vehicleRevision: 99 }), false, "stale request");
  assert.equal(await board(), true, messages.at(-1));
  assert.equal(engine.spacefleet.vehicles[ship.vehicleId].passengers[0].actorId, "local");
});

test("actual chunk generation produces orbital void and Morrow voxels without Home features, retaining edits", () => {
  const world = new ChunkWorld();
  try {
    world.reset("first-orbit", undefined, undefined, undefined, { ...origin, locationId: locationId({ ...home, kind: "orbit", instanceId: "low" }) });
    const orbit = world.generateChunkTerrainOnly(0, 0);
    assert.equal(orbit.blocks.some(value => value !== BlockId.Air), false);
    assert.equal(orbit.biomes[0], BiomeId.OrbitalVoid); assert.equal(world.structureMarkers.size, 0);
    world.reset("first-moon", { "0,0": [[index(0, 32, 0), BlockId.Air]] }, undefined, undefined,
      { ...origin, locationId: locationId({ ...home, bodyId: "blockwild/morrow" as typeof home.bodyId }) });
    const moon = world.generateChunkTerrainOnly(0, 0);
    assert.equal(moon.blocks[index(0, 32, 0)], BlockId.Air, "mined regolith remains mined");
    assert.equal(moon.blocks[index(1, 32, 1)], BlockId.PaleRegolith);
    assert.equal(moon.biomes[0], BiomeId.PaleRegolithSea);
    assert.equal(world.structureMarkers.size, 0, "Home villages/trees are not generated on the Moon");
  } finally { world.dispose(); }
});
