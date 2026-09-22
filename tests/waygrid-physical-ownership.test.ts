import assert from "node:assert/strict";
import test from "node:test";
import { BlockId, Item } from "../app/game/data";
import { createDigitalCreatureArchive, createDigitalItemVault, type DigitalStorageCell } from "../app/game/digital-storage";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { waygridBlockCapacity } from "../app/game/waygrid-capacity";
import { waygridCapacityId } from "../app/game/waygrid-capacity-identity";
import { resolveWaygridPhysicalOwnership, type WaygridPhysicalLocation } from "../app/game/waygrid-physical-ownership";

const home = homeLocation(universeId("waygrid-physical")), ids = [locationId(home), locationId(locationAddress({ ...home, kind: "orbit", instanceId: "low" }))];
const types = [BlockId.WaygridVaultTerminal, BlockId.WaygridCreatureArchive, BlockId.WaygridCellI, BlockId.WaygridCellII, BlockId.WaygridCellIII];
function fixture(entries: [number, string, BlockId][], legacy = false) {
  const locations: WaygridPhysicalLocation[] = ids.map((locationId, index) => ({ locationId,
    voxels: Object.fromEntries(entries.filter(([owner]) => owner === index).map(([, key, block]) => [key, block])) }));
  const items: DigitalStorageCell[] = [], creatures: DigitalStorageCell[] = [];
  for (const [owner, key, block] of entries) {
    const { kind, tier } = waygridBlockCapacity(block)!;
    const id = legacy ? `${kind === "cell" ? "cell" : `terminal:${kind}`}:${key}` : waygridCapacityId({ locationId: ids[owner], key, kind });
    if (kind !== "creature") items.push({ id, tier }); if (kind !== "item") creatures.push({ id, tier });
  }
  return { locations, vault: createDigitalItemVault(items), archive: createDigitalCreatureArchive(creatures) };
}

test("all five physical kinds bind equal coordinates to their exact independent locations", () => {
  for (const block of types) {
    const f = fixture([[0, "7,32,-9", block], [1, "7,32,-9", block]]), before = structuredClone(f);
    const result = resolveWaygridPhysicalOwnership(f.locations, f.vault, f.archive);
    assert.equal(result.bindings.length, 2); assert(result.bindings.every(row => !row.legacy));
    assert.deepEqual(f, before); assert(!Object.isFrozen(f.locations)); assert(Object.isFrozen(result.bindings));
  }
});

test("unique legacy ownership associates inactive locations without rewriting or crediting", () => {
  for (const block of types) {
    const f = fixture([[0, "-2,40,3", block]], true), before = structuredClone(f);
    const result = resolveWaygridPhysicalOwnership(f.locations, f.vault, f.archive);
    assert.equal(result.bindings[0].locationId, ids[0]); assert(result.bindings[0].legacy);
    assert.notEqual(result.bindings[0].capacityId, result.bindings[0].canonicalId); assert.deepEqual(f, before);
  }
});

test("legacy coordinate ownership is ambiguous across locations even with distinct tiers", () => {
  const f = fixture([[0, "1,32,1", BlockId.WaygridCellI]], true);
  const locations = [f.locations[0], { locationId: ids[1], voxels: { "1,32,1": BlockId.WaygridCellII } }];
  assert.throws(() => resolveWaygridPhysicalOwnership(locations, f.vault, f.archive), /Ambiguous/);
});

test("orphan, unregistered, duplicated alias, wrong tier and one-sided cells refuse unchanged", () => {
  for (const fault of ["orphan", "missing", "alias", "tier", "one-sided", "duplicate", "wrong-store", "custom"] as const) {
    const f = fixture([[0, "1,32,1", BlockId.WaygridCellI]]);
    if (fault === "orphan") f.locations = ids.map(locationId => ({ locationId, voxels: {} }));
    if (fault === "missing") { f.vault = createDigitalItemVault([]); f.archive = createDigitalCreatureArchive([]); }
    if (fault === "alias") { f.vault = { ...f.vault, cells: [...f.vault.cells, { id: "cell:1,32,1", tier: 1 }] };
      f.archive = { ...f.archive, cells: [...f.archive.cells, { id: "cell:1,32,1", tier: 1 }] }; }
    if (fault === "tier") { f.vault = { ...f.vault, cells: f.vault.cells.map(cell => ({ ...cell, tier: 2 })) };
      f.archive = { ...f.archive, cells: f.archive.cells.map(cell => ({ ...cell, tier: 2 })) }; }
    if (fault === "one-sided") f.archive = createDigitalCreatureArchive([]);
    if (fault === "duplicate") f.vault = { ...f.vault, cells: [...f.vault.cells, ...f.vault.cells] };
    if (fault === "wrong-store") f.vault = { ...f.vault, cells: [{ id: "creature-cell-1", tier: 1 }] };
    if (fault === "custom") f.vault = { ...f.vault, cells: [...f.vault.cells, { id: "custom-upgrade", tier: 1 }] };
    const before = structuredClone(f);
    assert.throws(() => resolveWaygridPhysicalOwnership(f.locations, f.vault, f.archive), { name: "Error" }, fault);
    assert.deepEqual(f, before);
  }
});

test("legacy paired cells must agree, and starter capacity is explicitly nonphysical tier one", () => {
  const f = fixture([[0, "1,32,1", BlockId.WaygridCellI]], true);
  assert.throws(() => resolveWaygridPhysicalOwnership(f.locations, f.vault, createDigitalCreatureArchive([])), /paired/);
  assert.throws(() => resolveWaygridPhysicalOwnership(f.locations, f.vault,
    { ...f.archive, cells: [{ ...f.archive.cells[0], tier: 2 }] }), /tiers/);
  const empty = ids.map(locationId => ({ locationId, voxels: {} }));
  const vault = createDigitalItemVault(), archive = createDigitalCreatureArchive();
  assert.equal(resolveWaygridPhysicalOwnership(empty, vault, archive).starters.length, 2);
  assert.throws(() => resolveWaygridPhysicalOwnership(empty, { ...vault, cells: [{ id: "item-cell-1", tier: 2 }] }, archive), /starter/);
});

test("exact shared portable metadata and source preimage are retained without capacity partitioning", () => {
  const f = fixture([[0, "1,32,1", BlockId.WaygridCellI], [1, "1,32,1", BlockId.WaygridCellI]]);
  f.vault = { ...f.vault, stacks: [{ item: Item.RawIron, count: 1700, metadata: { opaque: { x: 999, id: "keep" } } }] };
  const before = structuredClone(f), result = resolveWaygridPhysicalOwnership(f.locations, f.vault, f.archive);
  const changed = resolveWaygridPhysicalOwnership(f.locations, { ...f.vault, stacks: [{ ...f.vault.stacks[0], count: 1699 }] }, f.archive);
  assert.notDeepEqual(changed.source, result.source); assert.deepEqual(f, before);
  assert.equal("vault" in result, false);
});

test("invalid location and voxel sources cannot conceal an installation", () => {
  const f = fixture([[0, "1,32,1", BlockId.WaygridCellI]]);
  for (const locations of [[], [f.locations[0], f.locations[0]], [{ ...f.locations[0], voxels: { "01,32,1": BlockId.WaygridCellI } }],
    [{ ...f.locations[0], voxels: { "1,32,1": 99999 as BlockId } }]])
    assert.throws(() => resolveWaygridPhysicalOwnership(locations, f.vault, f.archive));
});
