import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BlockId, Item, RECIPES, type InventorySlot } from "../app/game/data";
import { VoxelEngine } from "../app/game/engine";
import { PRESSURE_CATALOG } from "../app/game/pressure-catalog";
import { CHEMISTRY_RECIPES, chemistryAtmosphere } from "../app/game/pressure-chemistry";
import { createPressurePartModel, PRESSURE_PARTS } from "../app/game/pressure-item-models";
import { hasPressureIcon, PressureIcon } from "../app/game/pressure-icons";
import { createWaystarCatalog } from "../app/game/celestial-catalog";
import { bodyEnvironment } from "../app/game/celestial-environment";
import { placedWorkshopMachine } from "../app/game/wayworks-integration";
import { createMachine } from "../app/game/wayworks";

const crafts = RECIPES.filter(recipe => recipe.output.item >= BlockId.LiquidPipe && recipe.output.item <= Item.PressurePolymer);
test("sealed re-placement preserves gas but requires a fresh installation binding", () => {
  const saved = createMachine("gasline", "old", "local"); saved.workshop.process!.installationId = "p-7";
  saved.workshop.chemical = { resource: "oxygen", amount: 1111 };
  const placed = placedWorkshopMachine("gasline", { item: BlockId.Gasline, count: 1, metadata: { wayworks: saved } }, "new", "local", 0);
  assert.equal(placed.workshop.process!.installationId, null); assert.equal(placed.workshop.chemical!.amount, 1111);
  assert.equal(saved.workshop.process!.installationId, "p-7");
});
test("all pressure hardware has an unambiguous normal craft and rejects metadata-bearing ingredients", () => {
  for (const { id } of Object.values(PRESSURE_CATALOG)) assert.ok(crafts.some(recipe => recipe.output.item === id));
  for (const recipe of crafts) {
    const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
    engine.craftingSize = 3; engine.craftGrid = Array(9).fill(null);
    for (let y = 0; y < recipe.height; y++) for (let x = 0; x < recipe.width; x++) {
      const ingredient = recipe.pattern[y * recipe.width + x], item = Array.isArray(ingredient) ? ingredient[0] : ingredient;
      if (item) engine.craftGrid[y * 3 + x] = { item, count: 1 };
    }
    assert.equal(engine.findRecipe()?.recipe.id, recipe.id, recipe.id);
    const slot = engine.craftGrid.find(Boolean)! as InventorySlot; slot.metadata = { resource: { oxygenMl: 123 } };
    assert.equal(engine.findRecipe(), null, `${recipe.id} must not erase custody`);
  }
});
test("pressure item dependency graph can bootstrap without its own end products", () => {
  const reached = new Set<number>();
  for (let item = 0; item < BlockId.LiquidPipe; item++) reached.add(item);
  for (let pass = 0; pass < 30; pass++) {
    for (const recipe of crafts) if (recipe.pattern.every(input => input === 0 || (Array.isArray(input) ? input.some(item => reached.has(item)) : reached.has(input)))) reached.add(recipe.output.item);
    for (const recipe of CHEMISTRY_RECIPES) if ((recipe.itemsIn ?? []).every(input => reached.has(input.item))) for (const output of recipe.itemsOut ?? []) reached.add(output.item);
  }
  for (const recipe of crafts) assert.ok(reached.has(recipe.output.item), recipe.id);
});
test("five consumable parts and all hardware have authored bounded models/icons", () => {
  for (const item of [...Object.values(PRESSURE_CATALOG).map(value => value.id), BlockId.ReinforcedWindow, BlockId.HangarFrame, ...PRESSURE_PARTS]) {
    assert.equal(hasPressureIcon(item), true); const svg = renderToStaticMarkup(createElement(PressureIcon, { item }));
    assert.match(svg, /data-pressure-icon=/); assert.doesNotMatch(svg, /NaN|undefined/);
  }
  for (const item of PRESSURE_PARTS) {
    const model = createPressurePartModel(item), bounds = new THREE.Box3().setFromObject(model, true);
    assert.ok(bounds.getSize(new THREE.Vector3()).length() < 1); assert.ok(model.children.length >= 4);
    const materials = new Set<THREE.Material>();
    model.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); } });
    materials.forEach(material => material.dispose());
  }
});
test("harvest composition is body dependent and trace extraction never invents gas fraction", () => {
  for (const body of createWaystarCatalog().bodies) {
    const feed = chemistryAtmosphere(body.id, bodyEnvironment(body, "surface"), true);
    assert.ok(Math.abs(Object.values(feed.fractions).reduce((sum, value) => sum + value, 0) - (feed.pressureKPa ? 1 : 0)) < 1e-9);
    assert.equal((feed.fractions.methane ?? 0) > 0, ["orison", "orison/rimehold"].includes(body.id));
  }
});
