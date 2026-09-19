import assert from "node:assert/strict";
import test from "node:test";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb } from "../app/game/capture-orbs.ts";
import type { CreatureMetadata } from "../app/game/creature-cage.ts";
import { BlockId, Item, type InventorySlot } from "../app/game/data.ts";
import { createDigitalCreatureArchive } from "../app/game/digital-storage.ts";
import { VoxelEngine, captureOrbUnitFromInventorySlot } from "../app/game/engine.ts";
import {
  inventorySlotStackLimit,
  inventorySlotsCanStack,
  isFilledCaptureOrbSlot,
  transferInventoryStacks,
} from "../app/game/inventory-convenience.ts";
import { inventorySlotDisplayName, itemHoverText, itemIconKind } from "../app/game/VoxelGame.tsx";

const creature = (entityId: string, name: string): CreatureMetadata => ({
  schema: 1,
  entityId,
  kind: "peelop",
  health: 7,
  maxHealth: 7,
  ageTicks: 24_000,
  baby: false,
  temperament: "Gentle",
  hostile: false,
  tamed: true,
  ownerId: "keeper",
  name,
  geneticSeed: 771,
  command: "follow",
  custom: {},
});

const filledOrb = (orbId: string, name: string) => captureOrbInventorySlot(
  captureIntoOrb(createEmptyCaptureOrb(orbId), creature(`creature-${orbId}`, name), 123)!,
);

function clickHarness(inventory: Array<InventorySlot | null>, cursor: InventorySlot | null) {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.inventory = Array.from({ length: 36 }, (_, index) => inventory[index] ? structuredClone(inventory[index]) : null);
  engine.cursor = cursor ? structuredClone(cursor) : null;
  engine.audio = { play: () => undefined } as unknown as VoxelEngine["audio"];
  engine.saveSoon = () => undefined;
  engine.emitHud = () => undefined;
  return engine;
}

test("filled Capture Orbs are singleton records while plain empty orbs remain craft-stackable", () => {
  const mallow = filledOrb("orb-mallow", "Mallow");
  const clover = filledOrb("orb-clover", "Clover");
  const emptyA = { item: Item.CaptureOrb, count: 4 };
  const emptyB = { item: Item.CaptureOrb, count: 3 };
  assert.equal(isFilledCaptureOrbSlot(mallow), true);
  assert.equal(inventorySlotStackLimit(mallow), 1);
  assert.equal(inventorySlotsCanStack(mallow, mallow), false, "even a duplicated exact payload must not merge");
  assert.equal(inventorySlotsCanStack(mallow, clover), false);
  assert.equal(inventorySlotsCanStack(emptyA, emptyB), true);
  assert.equal(inventorySlotStackLimit(emptyA), 16);
});

test("adding crafted empty orbs preserves a usable plain stack until one is split for capture", () => {
  const engine = clickHarness([], null);
  assert.equal(engine.addItem(Item.CaptureOrb, 4), 0);
  assert.deepEqual(engine.inventory[0], { item: Item.CaptureOrb, count: 4 });
  assert.equal(captureOrbUnitFromInventorySlot(engine.inventory[0])?.creature, null);
});

test("cursor clicks swap filled orbs instead of stacking them or erasing either creature", () => {
  const mallow = filledOrb("orb-mallow", "Mallow");
  const clover = filledOrb("orb-clover", "Clover");
  const engine = clickHarness([mallow], clover);
  engine.inventoryClick(0, "left");
  assert.equal(inventorySlotDisplayName(engine.inventory[0]), "Capture Orb · Clover (Peelop)");
  assert.equal(inventorySlotDisplayName(engine.cursor), "Capture Orb · Mallow (Peelop)");
  assert.equal(engine.inventory[0]?.count, 1);
  assert.equal(engine.cursor?.count, 1);
});

test("stack convenience never treats a filled orb as a matching bulk stack", () => {
  const mallow = filledOrb("orb-mallow", "Mallow");
  const source = [mallow];
  const target = [structuredClone(mallow), null];
  const result = transferInventoryStacks(source, target, { onlyAlreadyPresent: true });
  assert.equal(result.moved, 0);
  assert.deepEqual(result.source, source);
  assert.equal(result.target[1], null);
});

test("held and hover labels show both a creature's name and species", () => {
  const slot = filledOrb("orb-mallow", "Mallow");
  assert.equal(inventorySlotDisplayName(slot), "Capture Orb · Mallow (Peelop)");
  assert.match(itemHoverText(slot), /Mallow \(Peelop\)/u);
});

test("the Surveyor/Cartography Table routes to its dedicated illustrated icon", () => {
  assert.equal(itemIconKind(BlockId.CartographyTable), "cartography");
});

test("Creature Camp selection is orb-stable and renaming preserves every other stored specimen", () => {
  const mallow = filledOrb("orb-mallow", "Mallow");
  const clover = filledOrb("orb-clover", "Clover");
  const engine = clickHarness([mallow, clover], null);
  engine.activeCampOrbId = null;
  engine.mobs = [];
  engine.chests = new Map();
  engine.boats = new Map();
  engine.orbRacks = new Map();
  engine.healingStations = new Map();
  engine.digitalCreatureArchive = createDigitalCreatureArchive();
  engine.trash = null;
  engine.craftGrid = Array.from({ length: 9 }, () => null);
  engine.equipment = { head: null, chest: null, legs: null, feet: null, back: null };
  engine.events = { onToast: () => undefined } as unknown as VoxelEngine["events"];
  engine.syncOrbRackVisuals = () => undefined;

  assert.equal(engine.selectCampCreatureOrb("orb-clover"), true);
  engine.selected = 0;
  assert.equal(engine.renameSelectedCampCreature("Clover Bell"), true);
  assert.match(inventorySlotDisplayName(engine.inventory[0]), /Mallow \(Peelop\)$/u);
  assert.match(inventorySlotDisplayName(engine.inventory[1]), /Clover Bell \(Peelop\)$/u);
  assert.equal(engine.activeCampOrbId, "orb-clover");
});
