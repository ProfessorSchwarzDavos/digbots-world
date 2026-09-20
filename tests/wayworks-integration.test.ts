import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BlockId, Item, ITEMS, RECIPES, CREATIVE_ITEMS, type InventorySlot } from "../app/game/data.ts";
import { createMachine } from "../app/game/wayworks.ts";
import { chargeLifeSupportItem, placedWorkshopMachine, restoreWorkshop, WAYWORKS_BLOCKS } from "../app/game/wayworks-integration.ts";
import { lifeSupportStore, withLifeSupport } from "../app/game/life-support.ts";
import { VoxelEngine, shouldBypassOpenableUse } from "../app/game/engine.ts";
import { voxelInterfaceFaceOwner } from "../app/game/world.ts";
import { WORLD_SAVE_OWNERS } from "../app/game/universe-save.ts";

const cell = (energyJ = .25): InventorySlot => { const slot = { item: Item.EvaPowerCell, count: 1, metadata: { serial: "test" } }; return withLifeSupport(slot, { ...lifeSupportStore(slot), energyJ }); };
test("authored partial-size machines do not erase ground faces and support crouch placement", () => {
  for (const block of [BlockId.HandDynamo, BlockId.SunplateArray, BlockId.FieldBattery, BlockId.ChargingPedestal, BlockId.GridCable]) {
    assert.equal(voxelInterfaceFaceOwner(BlockId.Stone, block), "current");
    assert.equal(shouldBypassOpenableUse(true, true, block), true);
  }
});
test("whole joules charge exact existing CF3 metadata without rounding its fraction", () => {
  const machine = { ...createMachine("charging-pedestal", "L", "O"), energyJ: 3000 };
  const result = chargeLifeSupportItem(machine, cell(), 0);
  assert.equal(result.ok, true); assert.equal(result.machine.energyJ, 1000);
  assert.equal(lifeSupportStore(result.slot!).energyJ, 2000.25); assert.equal(result.slot!.metadata!.serial, "test");
  assert.equal(chargeLifeSupportItem(result.machine, result.slot, 0).ok, false);
  const nearlyFull = chargeLifeSupportItem(machine, cell(59999.5), 0);
  assert.equal(nearlyFull.ok, false); assert.equal(nearlyFull.machine.energyJ, 3000);
  assert.equal(chargeLifeSupportItem({ ...machine, energyJ: 0 }, cell(), 0).ok, false);
  assert.equal(machine.energyJ, 3000);
});

test("same-frame Shift use places against a machine before crouch pose updates", () => {
  for (const key of ["ShiftLeft", "ShiftRight"]) {
    let placed = 0, inspected = 0;
    const engine = Object.assign(Object.create(VoxelEngine.prototype), {
      inventory: [{ item: BlockId.GridBattery, count: 1 }], selected: 0,
      placeCooldown: 0, crouching: false, keys: new Set([key]), leadAnchors: new Map(),
      target: { type: BlockId.LifeSupportController, x: 10, y: 33, z: 0 },
      placeBlock: () => { placed++; }, openOverlay: () => { inspected++; },
      applyHarvest: () => false,
    }) as VoxelEngine;
    engine.useSelected();
    assert.equal(placed, 1); assert.equal(inspected, 0);
    assert.equal(engine.crouching, false, "interaction does not falsify the physical pose");
    engine.keys.clear(); engine.useSelected();
    assert.equal(placed, 1); assert.equal(inspected, 1, "unmodified use still inspects");
  }
});

test("upper pressure-door use inspects the real lower machine and supports placement bypass", () => {
  assert.equal(shouldBypassOpenableUse(true, true, BlockId.PressureDoorUpper), true);
  const opened: string[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    inventory: [{ item: Item.FieldWrench, count: 1 }], selected: 0, placeCooldown: 0,
    crouching: false, keys: new Set(), leadAnchors: new Map(),
    target: { type: BlockId.PressureDoorUpper, x: 9, y: 34, z: 1 },
    world: { getBlock: () => BlockId.PressureDoor }, applyHarvest: () => false,
    openOverlay: (_kind: string, key: string) => opened.push(key),
  }) as VoxelEngine;
  engine.useSelected(); assert.deepEqual(opened, ["9,33,1"]);
});

test("wrench rotates pressure-window presentation without changing the seal or inventory", () => {
  let facing = 0, allowed = true;
  const published: unknown[] = [], messages: string[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    inventory: [{ item: Item.FieldWrench, count: 1 }], selected: 0, placeCooldown: 0,
    target: { type: BlockId.ReinforcedWindow, x: 11, y: 34, z: 1 }, position: new THREE.Vector3(10, 32.5, 1),
    world: { getBlock: () => BlockId.ReinforcedWindow, setBlockFacing: (_x: number, _y: number, _z: number, next: number) => { facing = next; } },
    worldBlockFacing: () => facing, stationActorAccess: () => allowed,
    publishBlockEdits: (edits: unknown) => published.push(edits), saveSoon: () => {}, emitHud: () => {},
    events: { onToast: (message: string) => messages.push(message) },
  }) as VoxelEngine;
  const inventory = structuredClone(engine.inventory);
  engine.useSelected(); assert.equal(facing, 1); assert.equal(published.length, 1); assert.deepEqual(engine.inventory, inventory);
  engine.placeCooldown = 0; allowed = false; engine.useSelected(); assert.equal(facing, 1);
  allowed = true; engine.multiplayer = { role: "guest" } as never; engine.useSelected(); assert.equal(facing, 1);
  engine.multiplayer = null; engine.position.x = 30; engine.useSelected(); assert.equal(facing, 1);
  assert.equal(published.length, 1); assert.ok(messages.at(-1)?.includes("authorized"));
});
test("machine carry/reload retains charge and partitions location authority", () => {
  const state = { ...createMachine("field-battery", "L", "O"), energyJ: 12345 };
  const placed = placedWorkshopMachine("field-battery", { item: BlockId.FieldBattery, count: 1, metadata: { wayworks: state } }, "L2", "O", 2);
  assert.equal(placed.energyJ, 12345); assert.equal(placed.locationId, "L2"); assert.equal(placed.facing, 2);
  const saved = JSON.parse(JSON.stringify({ "1,2,3": placed }));
  assert.equal(restoreWorkshop(saved, "L2", "O", () => undefined).get("1,2,3")!.energyJ, 12345);
  assert.equal(restoreWorkshop(saved, "L2", "O", () => BlockId.Air).size, 0);
  assert.equal(WORLD_SAVE_OWNERS.wayworks, "location");
});
test("all fifty-four workshop and flight blocks plus wrench have real recipes and creative entries", () => {
  assert.equal(Object.keys(WAYWORKS_BLOCKS).length, 54);
  for (const item of [...Object.keys(WAYWORKS_BLOCKS).map(Number), Item.FieldWrench]) {
    assert.ok(ITEMS[item]); assert.ok(CREATIVE_ITEMS.includes(item)); assert.ok(RECIPES.some(recipe => recipe.output.item === item));
  }
  assert.equal(ITEMS[BlockId.FieldBattery].maxStack, 1);
});

test("guest and paused model rendering cannot advance authoritative resource stores", () => {
  const state = createMachine("powered-crusher", "L", "local"); state.energyJ = 8000;
  const engine = Object.assign(Object.create(VoxelEngine.prototype), { multiplayer: { role: "guest" },
    wayworks: new Map([["0,0,0", state]]), wayworksModels: new Map(), pressureStructures: new Set(), settings: { simulationDistance: 3 },
    position: new THREE.Vector3(0, 0, 2), inventory: [{ item: Item.FieldWrench, count: 1 }], selected: 0,
    world: { getBlock: () => BlockId.PoweredCrusher }, scene: new THREE.Scene(), paused: true, wayworksOverlayResource: "fluid" }) as VoxelEngine;
  const before = JSON.stringify(state);
  engine.updateWayworks(1000);
  assert.equal(JSON.stringify(engine.wayworks.get("0,0,0")), before);
  assert.equal(engine.wayworksModels.size, 1);
  assert.equal(engine.wayworksModels.get("0,0,0")!.userData.wayworksOverlay.resource, "fluid");
});

test("normal equipped charging updates the back item, not the selected wrench", () => {
  const machine = createMachine("charging-pedestal", "L", "local"); machine.energyJ = 6000;
  const rig = { item: Item.EvaManeuverRig, count: 1, metadata: { serial: "equipped" } };
  const equipment = { back: withLifeSupport(rig, { ...lifeSupportStore(rig), energyJ: 0 }) };
  const engine = Object.assign(Object.create(VoxelEngine.prototype), { activeWayworksKey: "0,0,0", wayworks: new Map([["0,0,0", machine]]),
    position: new THREE.Vector3(), inventory: [{ item: Item.FieldWrench, count: 1 }], selected: 0, equipment,
    wayworksActionReadyAt: 0, world: { getBlock: () => BlockId.ChargingPedestal, locationScope: { locationId: "L" } },
    events: { onToast: () => {} }, emitHud: () => {}, saveSoon: () => {} }) as VoxelEngine;
  assert.equal(engine.workshopAction({ kind: "charge", target: "back" }, 0), true);
  assert.equal(lifeSupportStore(equipment.back).energyJ, 2000);
  assert.equal(equipment.back.metadata?.serial, "equipped");
  assert.equal(engine.inventory[0]?.item, Item.FieldWrench);
  assert.equal(engine.wayworks.get("0,0,0")?.energyJ, 4000);
});

test("cold restore retains stable guest ownership and trusted operators", () => {
  const state = createMachine("field-battery", "L", "guest-stable"); state.workshop.trusted = ["drone-stable"];
  const restored = restoreWorkshop({ "1,2,3": state }, "L", "local", () => BlockId.FieldBattery).get("1,2,3")!;
  assert.equal(restored.ownerId, "guest-stable"); assert.deepEqual(restored.workshop.trusted, ["drone-stable"]);
});
test("normal engine charging intent enforces owner, distance, revision and cooldown", () => {
  const machine = { ...createMachine("charging-pedestal", "L", "local"), energyJ: 6000 };
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    activeWayworksKey: "0,0,0", wayworks: new Map([["0,0,0", machine]]), position: new THREE.Vector3(),
    inventory: [cell()], selected: 0, wayworksActionReadyAt: 0, localPlayerId: () => "transient-host-id",
    world: { getBlock: () => BlockId.ChargingPedestal, locationScope: { locationId: "L" } },
    events: { onToast: () => undefined }, emitHud: () => undefined, saveSoon: () => undefined,
  }) as VoxelEngine;
  assert.equal(engine.workshopAction({ kind: "charge" }, 0), true);
  assert.equal(engine.wayworks.get("0,0,0")!.energyJ, 4000);
  assert.equal(engine.workshopAction({ kind: "charge" }, 1), false);
  engine.wayworksActionReadyAt = 0; engine.position.x = 8;
  assert.equal(engine.workshopAction({ kind: "charge" }, 1), false);
  engine.position.x = 0; engine.multiplayer = { role: "guest" } as never;
  assert.equal(engine.workshopAction({ kind: "charge" }, 1), false);
});
