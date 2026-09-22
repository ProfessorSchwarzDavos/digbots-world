import assert from "node:assert/strict";
import test from "node:test";
import { BlockId, Item, type InventorySlot } from "../app/game/data";
import { captureIntoOrb, createEmptyCaptureOrb, type CaptureOrb } from "../app/game/capture-orbs";
import { type CreatureMetadata } from "../app/game/creature-cage";
import {
  addDigitalCreatureCell, addDigitalItemCell, createDigitalCreatureArchive, createDigitalItemVault,
  digitalCreatureCapacity, digitalItemCapacity, digitalItemCount, digitalStackSignature,
  normalizeDigitalCreatureArchive, normalizeDigitalItemVault,
  type DigitalCreatureArchive, type DigitalItemVault, type DigitalStorageTier,
} from "../app/game/digital-storage";
import { inventorySlotStackLimit } from "../app/game/inventory-convenience";
import { locationAddress, locationId } from "../app/game/location-address";
import { readExactEncodedCaptureOrb } from "../app/game/stored-creature-custody";
import { prepareWaygridCapacity, waygridBlockCapacity, type WaygridBlockChange } from "../app/game/waygrid-capacity";
import { readWaygridCapacityId, waygridCapacityId, type WaygridCapacityKind } from "../app/game/waygrid-capacity-identity";

const home = locationId(locationAddress({ universeId: "capacity-world", systemId: "waystar", bodyId: "home", kind: "surface", instanceId: "main" }));
const away = locationId(locationAddress({ universeId: "capacity-world", systemId: "waystar", bodyId: "away", kind: "surface", instanceId: "main" }));
const position = { x: 3, y: 14, z: -7 };
const key = "3,14,-7";
const definitions = [
  { block: BlockId.WaygridVaultTerminal, kind: "item", tier: 1, items: 1_000, creatures: 0 },
  { block: BlockId.WaygridCreatureArchive, kind: "creature", tier: 1, items: 0, creatures: 16 },
  { block: BlockId.WaygridCellI, kind: "cell", tier: 1, items: 1_000, creatures: 16 },
  { block: BlockId.WaygridCellII, kind: "cell", tier: 2, items: 10_000, creatures: 160 },
  { block: BlockId.WaygridCellIII, kind: "cell", tier: 3, items: 100_000, creatures: 1_600 },
] as const;
const edit = (before: BlockId, after: BlockId, coordinates = position): WaygridBlockChange => ({ ...coordinates, before, after });
const empty = () => ({ vault: createDigitalItemVault([]), archive: createDigitalCreatureArchive([]) });
const cell = (kind: WaygridCapacityKind, tier: DigitalStorageTier = 1, owner = home, at = key) =>
  ({ id: waygridCapacityId({ locationId: owner, key: at, kind }), tier });
function placed(block: BlockId) {
  const stores = empty();
  return prepareWaygridCapacity(home, stores.vault, stores.archive, [edit(BlockId.Air, block)]);
}

// Same normal producer and valid creature shape used by stored-creature-custody.test.ts.
function orb(index: number): CaptureOrb {
  const creature: CreatureMetadata = { schema: 1, entityId: `capacity-specimen-${index}`, kind: "peelop",
    health: 5, maxHealth: 7, ageTicks: 123, baby: false, temperament: "Gentle", hostile: false,
    tamed: true, ownerId: "keeper", name: `Exact Name ${index}`, geneticSeed: 321, command: "follow",
    custom: { foreignCoordinates: { x: 999, y: .1, z: -777 }, nestedCargo: { count: 7, contents: ["opaque", 3.125] } } };
  const result = captureIntoOrb(createEmptyCaptureOrb(`capacity-orb-${index}`), creature, 42, "keeper");
  assert(result);
  assert(result.creature && result.creature.health <= result.creature.maxHealth);
  assert.deepEqual(readExactEncodedCaptureOrb(JSON.stringify(result)), result);
  return result;
}
function filled(block: BlockId) {
  const stores = placed(block);
  const count = digitalItemCapacity(stores.vault);
  const stacks: InventorySlot[] = count ? [
    { item: BlockId.Stone, count: count - 1, metadata: { lot: "ore-a", nested: { flags: [3, "exact"] } } },
    { item: Item.WoodPickaxe, count: 1, durability: 13, metadata: { label: "last tool", opaque: { value: .125 } } },
  ] : [];
  return { vault: { ...stores.vault, stacks }, archive: { ...stores.archive,
    orbs: Array.from({ length: digitalCreatureCapacity(stores.archive) }, (_, index) => orb(index)), healClock: 17, healCycles: 3 } };
}
function itemLedger(slots: readonly InventorySlot[]) {
  const counts = new Map<string, number>();
  for (const slot of slots) {
    const signature = digitalStackSignature(slot);
    counts.set(signature, (counts.get(signature) ?? 0) + slot.count);
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}
function rejectsUnchanged(vault: DigitalItemVault, archive: DigitalCreatureArchive, changes: readonly WaygridBlockChange[], message: RegExp) {
  const before = structuredClone({ vault, archive, changes });
  assert.throws(() => prepareWaygridCapacity(home, vault, archive, changes), message);
  assert.deepEqual({ vault, archive, changes }, before);
}

for (const definition of definitions) {
  test(`${BlockId[definition.block]} registers and removes equal coordinates independently in two locations`, () => {
    assert.deepEqual(waygridBlockCapacity(definition.block), { kind: definition.kind, tier: definition.tier });
    const first = placed(definition.block);
    const firstBefore = structuredClone(first);
    const both = prepareWaygridCapacity(away, first.vault, first.archive, [edit(BlockId.Air, definition.block)]);
    assert.deepEqual(first, firstBefore);
    assert.equal(digitalItemCapacity(both.vault), definition.items * 2);
    assert.equal(digitalCreatureCapacity(both.archive), definition.creatures * 2);
    for (const store of [both.vault, both.archive]) {
      if (!store.cells.length) continue;
      assert.deepEqual(store.cells.map(entry => readWaygridCapacityId(entry.id)?.locationId), [home, away]);
      assert.equal(new Set(store.cells.map(entry => entry.id)).size, 2);
    }
    const remaining = prepareWaygridCapacity(home, both.vault, both.archive, [edit(definition.block, BlockId.Air)]);
    assert.equal(digitalItemCapacity(remaining.vault), definition.items);
    assert.equal(digitalCreatureCapacity(remaining.archive), definition.creatures);
    for (const store of [remaining.vault, remaining.archive])
      assert(store.cells.every(entry => readWaygridCapacityId(entry.id)?.locationId === away));
    const removed = prepareWaygridCapacity(away, remaining.vault, remaining.archive, [edit(definition.block, BlockId.Air)]);
    assert.deepEqual(removed.vault.cells, []);
    assert.deepEqual(removed.archive.cells, []);
    assert.deepEqual(removed.spills, []);
  });

  test(`${BlockId[definition.block]} same-block edit is capacity-neutral with full contents`, () => {
    const stores = filled(definition.block), before = structuredClone(stores);
    const plan = prepareWaygridCapacity(home, stores.vault, stores.archive, [edit(definition.block, definition.block)]);
    assert.deepEqual(plan, { ...before, spills: [] });
    assert.deepEqual(stores, before);
  });
}

test("non-storage blocks contribute no capacity", () => {
  for (const block of [BlockId.Air, BlockId.Stone]) assert.equal(waygridBlockCapacity(block), null);
});

test("full canonical location/key/kind tuple survives create, add, normalize and cold JSON", () => {
  const longLocation = locationId(locationAddress({ universeId: "u".repeat(160), systemId: "s".repeat(160),
    bodyId: `catalog/${"b".repeat(150)}`, kind: "interior", instanceId: "i".repeat(160) }));
  const ids = new Set<string>();
  for (const kind of ["item", "creature", "cell"] as const) {
    const owner = { locationId: longLocation, key: "9007199254740991,-9007199254740991,0", kind };
    const id = waygridCapacityId(owner), contribution = { id, tier: 1 as const };
    assert(id.length > 80);
    assert.deepEqual(readWaygridCapacityId(id), owner);
    ids.add(id);
    if (kind !== "creature") {
      const created = createDigitalItemVault([contribution]);
      assert.deepEqual(created.cells, [contribution]);
      const added = addDigitalItemCell(createDigitalItemVault([]), contribution);
      assert.deepEqual(added.cells, [contribution]);
      assert.deepEqual(normalizeDigitalItemVault(JSON.parse(JSON.stringify(added))), created);
    }
    if (kind !== "item") {
      const created = createDigitalCreatureArchive([contribution]);
      assert.deepEqual(created.cells, [contribution]);
      const added = addDigitalCreatureCell(createDigitalCreatureArchive([]), contribution);
      assert.deepEqual(added.cells, [contribution]);
      assert.deepEqual(normalizeDigitalCreatureArchive(JSON.parse(JSON.stringify(added))), created);
    }
  }
  assert.equal(ids.size, 3);
  assert.notEqual(cell("cell", 1, home).id, cell("cell", 1, away).id);
  assert.notEqual(cell("cell", 1, home, "3,14,-8").id, cell("cell").id);
  for (const invalidKey of ["03,14,-7", "3,14,-0", "3,14", "3,14,0.5", "3,14,9007199254740992"])
    assert.throws(() => waygridCapacityId({ locationId: home, key: invalidKey, kind: "cell" }));
});

test("missing, stale, wrong-tier and duplicate physical registrations reject without mutation", () => {
  const stores = empty();
  rejectsUnchanged(stores.vault, stores.archive, [edit(BlockId.WaygridCellI, BlockId.Air)], /registration disagree/);
  const installed = placed(BlockId.WaygridCellI);
  rejectsUnchanged(installed.vault, installed.archive, [edit(BlockId.Air, BlockId.WaygridCellI)], /registration disagree/);
  rejectsUnchanged(installed.vault, installed.archive, [edit(BlockId.WaygridCellII, BlockId.Air)], /registration disagree/);
  rejectsUnchanged({ ...installed.vault, cells: [...installed.vault.cells, installed.vault.cells[0]] }, installed.archive,
    [edit(BlockId.WaygridCellI, BlockId.Air)], /duplicate/);
  rejectsUnchanged(installed.vault, { ...installed.archive, cells: [...installed.archive.cells, installed.archive.cells[0]] },
    [edit(BlockId.WaygridCellI, BlockId.Air)], /duplicate/);
  const terminal = placed(BlockId.WaygridVaultTerminal);
  rejectsUnchanged(terminal.vault, terminal.archive, [edit(BlockId.WaygridCreatureArchive, BlockId.Air)], /registration disagree/);
});

test("paired cells require matching registrations in both stores even for unchanged blocks", () => {
  const installed = placed(BlockId.WaygridCellII);
  for (const changes of [[edit(BlockId.WaygridCellII, BlockId.Air)], [edit(BlockId.WaygridCellII, BlockId.WaygridCellII)]]) {
    rejectsUnchanged({ ...installed.vault, cells: [] }, installed.archive, changes, /registrations disagree/);
    rejectsUnchanged(installed.vault, { ...installed.archive, cells: [] }, changes, /registrations disagree/);
    rejectsUnchanged(installed.vault, { ...installed.archive, cells: [cell("cell", 1)] }, changes, /registrations disagree/);
  }
});

test("terminals in the wrong store or carrying a non-terminal tier fail closed", () => {
  const stores = empty();
  rejectsUnchanged({ ...stores.vault, cells: [cell("creature")] }, stores.archive, [], /wrong store or tier/);
  rejectsUnchanged(stores.vault, { ...stores.archive, cells: [cell("item")] }, [], /wrong store or tier/);
  rejectsUnchanged({ ...stores.vault, cells: [cell("item", 2)] }, stores.archive, [], /wrong store or tier/);
  rejectsUnchanged(stores.vault, { ...stores.archive, cells: [cell("creature", 3)] }, [], /wrong store or tier/);
});

test("legacy coordinate conflicts refuse additions, removals and unchanged edits without double credit", () => {
  for (const legacyId of [`cell:${key}`, `terminal:item:${key}`, `terminal:creature:${key}`]) {
    assert.equal(readWaygridCapacityId(legacyId), null);
    for (const storeName of ["vault", "archive"] as const) {
      for (const [before, after] of [[BlockId.Air, BlockId.WaygridCellI], [BlockId.WaygridCellI, BlockId.Air],
        [BlockId.WaygridCellI, BlockId.WaygridCellI]] as const) {
        const stores = before === BlockId.Air ? empty() : placed(before);
        const conflicting = { ...stores, [storeName]: { ...stores[storeName], cells: [...stores[storeName].cells, { id: legacyId, tier: 1 as const }] } };
        rejectsUnchanged(conflicting.vault, conflicting.archive, [edit(before, after)], /legacy capacity/);
      }
    }
  }
});

test("unrelated custom legacy capacity stays untouched and is not assigned physical ownership", () => {
  const stores = { vault: createDigitalItemVault([{ id: "custom-item-pool", tier: 2 }]),
    archive: createDigitalCreatureArchive([{ id: "custom-creature-pool", tier: 3 }]) };
  const before = structuredClone(stores);
  const plan = prepareWaygridCapacity(home, stores.vault, stores.archive, [edit(BlockId.Air, BlockId.WaygridCellI)]);
  assert.deepEqual(plan.vault.cells[0], before.vault.cells[0]);
  assert.deepEqual(plan.archive.cells[0], before.archive.cells[0]);
  assert.equal(readWaygridCapacityId(plan.vault.cells[0].id), null);
  assert.equal(readWaygridCapacityId(plan.archive.cells[0].id), null);
  const removed = prepareWaygridCapacity(home, plan.vault, plan.archive, [edit(BlockId.WaygridCellI, BlockId.Air)]);
  assert.deepEqual(removed, { ...before, spills: [] });
  assert.deepEqual(stores, before);
});

for (const [beforeBlock, afterBlock] of [
  ...definitions.map(({ block }) => [block, BlockId.Air] as const),
  [BlockId.WaygridCellIII, BlockId.WaygridCellII], [BlockId.WaygridCellII, BlockId.WaygridCellI],
] as const) {
  test(`${BlockId[beforeBlock]} -> ${BlockId[afterBlock]} conserves full contents and exact metadata once`, () => {
    const stores = filled(beforeBlock), original = structuredClone(stores);
    const plan = prepareWaygridCapacity(home, stores.vault, stores.archive, [edit(beforeBlock, afterBlock)]);
    assert.deepEqual(stores, original);
    assert.equal(plan.spills.length, 1);
    assert.deepEqual(plan.spills[0].position, [3, 14, -7]);
    const items = plan.spills.flatMap(spill => spill.items), orbs = plan.spills.flatMap(spill => spill.orbs);
    assert.deepEqual(itemLedger([...plan.vault.stacks, ...items]), itemLedger(original.vault.stacks));
    assert.deepEqual([...plan.archive.orbs, ...orbs], original.archive.orbs);
    assert.equal(new Set([...plan.archive.orbs, ...orbs].map(value => value.orbId)).size, original.archive.orbs.length);
    assert.equal(digitalItemCount(plan.vault), digitalItemCapacity(plan.vault));
    assert.equal(plan.archive.orbs.length, digitalCreatureCapacity(plan.archive));
    assert.equal(plan.archive.healClock, 17);
    assert.equal(plan.archive.healCycles, 3);
    for (const slot of items) assert(slot.count > 0 && slot.count <= inventorySlotStackLimit(slot));
    const repeated = prepareWaygridCapacity(home, plan.vault, plan.archive, [edit(afterBlock, afterBlock)]);
    assert.deepEqual(repeated.spills, []);
    assert.deepEqual(repeated.vault, plan.vault);
    assert.deepEqual(repeated.archive, plan.archive);
    rejectsUnchanged(plan.vault, plan.archive, [edit(beforeBlock, afterBlock)], /registration disagree/);
  });
}

test("a later multi-edit failure leaves full input stores and all changes unchanged", () => {
  const stores = filled(BlockId.WaygridCellII);
  rejectsUnchanged(stores.vault, stores.archive, [edit(BlockId.WaygridCellII, BlockId.Air),
    edit(BlockId.Air, BlockId.WaygridCellI, { x: 4, y: 14, z: -7 }),
    edit(BlockId.WaygridCellI, BlockId.Air, { x: 5, y: 14, z: -7 })], /registration disagree/);
});

test("batch net-capacity swaps preserve all contents without intermediate spills in either order", () => {
  const stores = filled(BlockId.WaygridCellII), original = structuredClone(stores);
  const removal = edit(BlockId.WaygridCellII, BlockId.Air);
  const addition = edit(BlockId.Air, BlockId.WaygridCellII, { x: 4, y: 14, z: -7 });
  for (const changes of [[removal, addition], [addition, removal]]) {
    const plan = prepareWaygridCapacity(home, stores.vault, stores.archive, changes);
    assert.deepEqual(plan.spills, []);
    assert.deepEqual(plan.vault.stacks, original.vault.stacks);
    assert.deepEqual(plan.archive.orbs, original.archive.orbs);
    assert.deepEqual(plan.vault.cells, [cell("cell", 2, home, "4,14,-7")]);
    assert.deepEqual(plan.archive.cells, plan.vault.cells);
    assert.deepEqual(stores, original);
  }
});
