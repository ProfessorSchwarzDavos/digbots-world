import assert from "node:assert/strict";
import test from "node:test";
import { Item, RECIPES, type InventorySlot } from "../app/game/data.ts";
import { craftLifeSupportSupply, type LifeSupportCraftInput } from "../app/game/life-support-crafting.ts";
import { lifeSupportResourceTotals } from "../app/game/life-support.ts";

function ingredients(recipeId: string, count = 1, row = 0): Array<InventorySlot | null> {
  const recipe = RECIPES.find(entry => entry.id === recipeId)!;
  const grid: Array<InventorySlot | null> = Array(9).fill(null);
  recipe.pattern.forEach((ingredient, index) => {
    if (ingredient !== 0) grid[(row + Math.floor(index / recipe.width)) * 3 + index % recipe.width] = {
      item: Array.isArray(ingredient) ? ingredient[0] : ingredient,
      count,
    };
  });
  return grid;
}

const input = (craftGrid: Array<InventorySlot | null>, inventory: Array<InventorySlot | null> = [null, null], cursor: InventorySlot | null = null): LifeSupportCraftInput =>
  ({ craftGrid, inventory, cursor });

test("exact shifted-in-grid recipes yield factory-fresh finite supplies", () => {
  for (const [recipeId, item, resource, amount] of [
    ["eva-power-cell", Item.EvaPowerCell, "energyJ", 60_000],
    ["co2-scrubber", Item.ScrubberCartridge, "scrubberSeconds", 1800],
  ] as const) {
    const before = input(ingredients(recipeId, 2, 1));
    const result = craftLifeSupportSupply(before, recipeId, false);
    assert.equal(result.ok, true);
    assert.equal(result.crafted, 1);
    assert.deepEqual(result.cursor, { item, count: 1 });
    assert.equal(lifeSupportResourceTotals([result.cursor])[resource], amount);
    assert.equal(result.craftGrid.filter(Boolean).length, 6);
    assert.ok(result.craftGrid.filter((slot): slot is InventorySlot => slot !== null).every(slot => slot.count === 1));
    assert.deepEqual(before.craftGrid, ingredients(recipeId, 2, 1));
  }
});

test("wrong recipe, altered shape, extra slot, missing slot and decorated ingredients are rejected unchanged", () => {
  const recipeId = "eva-power-cell";
  const valid = ingredients(recipeId);
  const cases: Array<[string, Array<InventorySlot | null>, string]> = [
    ["wrong ingredient", valid.map((slot, index) => index === 0 ? { item: Item.Stick, count: 1 } : slot), recipeId],
    ["extra slot", valid.map((slot, index) => index === 6 ? { item: Item.Stick, count: 1 } : slot), recipeId],
    ["missing slot", valid.map((slot, index) => index === 0 ? null : slot), recipeId],
    ["empty stack", valid.map((slot, index) => index === 0 ? { ...slot!, count: 0 } : slot), recipeId],
    ["fractional stack", valid.map((slot, index) => index === 0 ? { ...slot!, count: 0.5 } : slot), recipeId],
    ["owned metadata", valid.map((slot, index) => index === 0 ? { ...slot!, metadata: { owner: { id: "alice" } } } : slot), recipeId],
    ["damaged ingredient", valid.map((slot, index) => index === 0 ? { ...slot!, durability: 1 } : slot), recipeId],
    ["other recipe", valid, "co2-scrubber"],
  ];
  for (const [name, grid, id] of cases) {
    const source = input(grid, [{ item: Item.Stick, count: 1, metadata: { owner: "bob" } }, null]);
    const snapshot = structuredClone(source);
    const result = craftLifeSupportSupply(source, id, false);
    assert.equal(result.ok, false, name);
    assert.equal(result.crafted, 0, name);
    assert.deepEqual({ inventory: result.inventory, cursor: result.cursor, craftGrid: result.craftGrid }, snapshot, name);
    assert.deepEqual(source, snapshot, name);
    assert.notStrictEqual(result.inventory[0]?.metadata, source.inventory[0]?.metadata, name);
  }
  assert.equal(craftLifeSupportSupply(input(valid), "missing-id", false).ok, false);
  assert.equal(craftLifeSupportSupply(input(valid), "planks", false).ok, false);
  assert.equal(craftLifeSupportSupply(input(valid.slice(0, 8)), recipeId, false).ok, false);
});

test("ordinary crafting needs an empty cursor; shift fills only available empty slots", () => {
  const recipeId = "co2-scrubber";
  const occupiedCursor: InventorySlot = { item: Item.Stick, count: 1, metadata: { owner: "alice" } };
  const blocked = input(ingredients(recipeId), [null], occupiedCursor);
  const rejected = craftLifeSupportSupply(blocked, recipeId, false);
  assert.equal(rejected.reason, "cursor_occupied");
  assert.deepEqual({ inventory: rejected.inventory, cursor: rejected.cursor, craftGrid: rejected.craftGrid }, blocked);

  const source = input(ingredients(recipeId, 5), [null, occupiedCursor, null], occupiedCursor);
  const snapshot = structuredClone(source);
  const batch = craftLifeSupportSupply(source, recipeId, true);
  assert.equal(batch.ok, true);
  assert.equal(batch.crafted, 2);
  assert.deepEqual(batch.inventory.map(slot => slot?.item), [Item.ScrubberCartridge, Item.Stick, Item.ScrubberCartridge]);
  assert.equal(lifeSupportResourceTotals(batch.inventory).scrubberSeconds, 3600);
  assert.deepEqual(batch.cursor, occupiedCursor);
  assert.ok(batch.craftGrid.filter((slot): slot is InventorySlot => slot !== null).every(slot => slot.count === 3));
  assert.deepEqual(source, snapshot);
  const full = craftLifeSupportSupply(batch, recipeId, true);
  assert.equal(full.ok, false);
  assert.equal(full.reason, "inventory_full");
  assert.deepEqual({ inventory: full.inventory, cursor: full.cursor, craftGrid: full.craftGrid },
    { inventory: batch.inventory, cursor: batch.cursor, craftGrid: batch.craftGrid });
});

test("batch stops on ingredient exhaustion or 64 crafts and cannot repeat from consumed input", () => {
  const recipeId = "eva-power-cell";
  const once = craftLifeSupportSupply(input(ingredients(recipeId), [null, null]), recipeId, true);
  assert.equal(once.crafted, 1);
  assert.equal(once.craftGrid.every(slot => slot === null), true);
  const repeated = craftLifeSupportSupply(once, recipeId, true);
  assert.equal(repeated.ok, false);
  assert.equal(repeated.crafted, 0);
  assert.deepEqual(repeated.inventory, once.inventory);
  const big = craftLifeSupportSupply(input(ingredients(recipeId, 80), Array(80).fill(null)), recipeId, true);
  assert.equal(big.crafted, 64);
  assert.equal(big.inventory.filter(Boolean).length, 64);
  assert.ok(big.craftGrid.filter((slot): slot is InventorySlot => slot !== null).every(slot => slot.count === 16));
});
