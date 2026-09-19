import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BlockId, Item, ITEMS, RECIPES, CREATIVE_ITEMS, type InventorySlot } from "../app/game/data.ts";
import { createMachine } from "../app/game/wayworks.ts";
import { chargeLifeSupportItem, placedWorkshopMachine, restoreWorkshop } from "../app/game/wayworks-integration.ts";
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
test("machine carry/reload retains charge and partitions location authority", () => {
  const state = { ...createMachine("field-battery", "L", "O"), energyJ: 12345 };
  const placed = placedWorkshopMachine("field-battery", { item: BlockId.FieldBattery, count: 1, metadata: { wayworks: state } }, "L2", "O", 2);
  assert.equal(placed.energyJ, 12345); assert.equal(placed.locationId, "L2"); assert.equal(placed.facing, 2);
  const saved = JSON.parse(JSON.stringify({ "1,2,3": placed }));
  assert.equal(restoreWorkshop(saved, "L2", "O", () => undefined).get("1,2,3")!.energyJ, 12345);
  assert.equal(restoreWorkshop(saved, "L2", "O", () => BlockId.Air).size, 0);
  assert.equal(WORLD_SAVE_OWNERS.wayworks, "location");
});
test("all checkpoint blocks and wrench have real recipes and creative entries", () => {
  for (const item of [BlockId.HandDynamo, BlockId.SunplateArray, BlockId.FieldBattery, BlockId.ChargingPedestal, BlockId.GridCable, Item.FieldWrench]) {
    assert.ok(ITEMS[item]); assert.ok(CREATIVE_ITEMS.includes(item)); assert.ok(RECIPES.some(recipe => recipe.output.item === item));
  }
  assert.equal(ITEMS[BlockId.FieldBattery].maxStack, 1);
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
