import { BlockId, type InventorySlot } from "./data";
import { type CaptureOrb } from "./capture-orbs";
import { digitalCreatureCapacity, digitalItemCapacity, type DigitalCreatureArchive, type DigitalItemVault,
  type DigitalStorageCell, type DigitalStorageTier } from "./digital-storage";
import { inventorySlotStackLimit, isFilledCaptureOrbSlot } from "./inventory-convenience";
import { parseLocationId } from "./location-address";
import { readExactEncodedCaptureOrb } from "./stored-creature-custody";
import { custodyJsonIdentity, validCustodyItem } from "./wayworks-custody";
import { readWaygridCapacityId, waygridCapacityId, type WaygridCapacityKind } from "./waygrid-capacity-identity";

export type WaygridBlockChange = Readonly<{ x: number; y: number; z: number; before: BlockId; after: BlockId }>;
export type WaygridCapacityPlan = Readonly<{
  vault: DigitalItemVault; archive: DigitalCreatureArchive;
  spills: readonly Readonly<{ position: readonly [number, number, number]; items: readonly InventorySlot[]; orbs: readonly CaptureOrb[] }>[];
}>;

export function waygridBlockCapacity(type: BlockId): Readonly<{ kind: WaygridCapacityKind; tier: DigitalStorageTier }> | null {
  if (type === BlockId.WaygridVaultTerminal) return { kind: "item", tier: 1 };
  if (type === BlockId.WaygridCreatureArchive) return { kind: "creature", tier: 1 };
  const tier = type === BlockId.WaygridCellI ? 1 : type === BlockId.WaygridCellII ? 2 : type === BlockId.WaygridCellIII ? 3 : null;
  return tier ? { kind: "cell", tier } : null;
}

export function assertWaygridStores(vault: DigitalItemVault, archive: DigitalCreatureArchive) {
  if (vault.schema !== 1 || archive.schema !== 1 || !Array.isArray(vault.stacks) || !Array.isArray(archive.orbs)
    || vault.stacks.length > 65_536 || archive.orbs.length > 8_192
    || !Number.isFinite(archive.healClock) || archive.healClock < 0 || archive.healClock > 60
    || !Number.isSafeInteger(archive.healCycles) || archive.healCycles < 0) throw Error("Invalid Waygrid shared stores.");
  const indexes = [vault, archive].map((store, index) => {
    if (!Array.isArray(store.cells) || store.cells.length > 4_096) throw Error("Invalid Waygrid capacity cells.");
    const cells = new Map<string, DigitalStorageCell>();
    for (const cell of store.cells) {
      if (!cell || Object.keys(cell).sort().join(",") !== "id,tier" || typeof cell.id !== "string" || !cell.id.length
        || ![1, 2, 3].includes(cell.tier) || cells.has(cell.id)) throw Error("Invalid or duplicate Waygrid capacity cell.");
      const owner = readWaygridCapacityId(cell.id);
      if (owner && (owner.kind === (index === 0 ? "creature" : "item") || owner.kind !== "cell" && cell.tier !== 1)) {
        throw Error("Waygrid capacity belongs to the wrong store or tier.");
      }
      cells.set(cell.id, cell);
    }
    return cells;
  });
  for (const [index, cells] of indexes.entries()) for (const [id, cell] of cells) {
    if (readWaygridCapacityId(id)?.kind === "cell" && indexes[1 - index].get(id)?.tier !== cell.tier) {
      throw Error("Waygrid item and creature cell registrations disagree.");
    }
  }
  let count = 0;
  for (const slot of vault.stacks) {
    if (!slot || !Number.isSafeInteger(slot.count) || slot.count < 1 || !validCustodyItem({ ...slot, count: 1 })
      || isFilledCaptureOrbSlot(slot)) throw Error("Invalid exact Waygrid item contents.");
    count += slot.count;
  }
  if (!Number.isSafeInteger(count) || count > digitalItemCapacity(vault) || archive.orbs.length > digitalCreatureCapacity(archive)) {
    throw Error("Waygrid contents already exceed registered capacity.");
  }
  const vessels = new Set<string>();
  for (const orb of archive.orbs) {
    const exact = readExactEncodedCaptureOrb(custodyJsonIdentity(orb));
    if (!exact.creature || exact.attunement?.activeEntityId || vessels.has(exact.orbId)) throw Error("Invalid Waygrid archived vessel.");
    vessels.add(exact.orbId);
  }
}

/** Pure, all-store preflight. Call before any world, inventory, drop or tool edit.
 * Unknown legacy coordinate owners refuse, rather than guessing or double-crediting.
 * This is a lifecycle plan, not global physical ownership/admission validation. */
export function prepareWaygridCapacity(locationId: string, vault: DigitalItemVault, archive: DigitalCreatureArchive,
  changes: readonly WaygridBlockChange[]): WaygridCapacityPlan {
  parseLocationId(locationId);
  assertWaygridStores(vault, archive);
  let itemCells = [...vault.cells], creatureCells = [...archive.cells];
  let spillPosition: readonly [number, number, number] | null = null;
  for (const change of changes) {
    const before = waygridBlockCapacity(change.before), after = waygridBlockCapacity(change.after);
    if (!before && !after) continue;
    const key = [change.x, change.y, change.z].join(",");
    // Validate the coordinate even when the capacity is unchanged (rotation).
    waygridCapacityId({ locationId, key, kind: "cell" });
    const legacy = new Set([`cell:${key}`, `terminal:item:${key}`, `terminal:creature:${key}`]);
    if ([...itemCells, ...creatureCells].some(cell => legacy.has(cell.id))) {
      throw Error("Waygrid legacy capacity needs verified location ownership before this block can change.");
    }
    // All contributions at this location/cell must agree with the old voxel,
    // including unexpected records of another terminal kind.
    for (const [cells, store] of [[itemCells, "item"], [creatureCells, "creature"]] as const) {
      const owned = cells.filter(cell => { const owner = readWaygridCapacityId(cell.id); return owner?.locationId === locationId && owner.key === key; });
      const expected = before && (before.kind === store || before.kind === "cell");
      if (owned.length !== (expected ? 1 : 0) || expected && (owned[0].id !== waygridCapacityId({ locationId, key, kind: before.kind }) || owned[0].tier !== before.tier)) {
        throw Error("Waygrid physical block and capacity registration disagree.");
      }
    }
    if (before?.kind === after?.kind && before?.tier === after?.tier) continue;
    if (before) {
      const id = waygridCapacityId({ locationId, key, kind: before.kind });
      itemCells = itemCells.filter(cell => cell.id !== id); creatureCells = creatureCells.filter(cell => cell.id !== id);
      spillPosition ??= [change.x, change.y, change.z];
    }
    if (after) {
      const cell = { id: waygridCapacityId({ locationId, key, kind: after.kind }), tier: after.tier };
      if (after.kind !== "creature") itemCells.push(cell);
      if (after.kind !== "item") creatureCells.push(cell);
    }
  }
  if (itemCells.length > 4_096 || creatureCells.length > 4_096) throw Error("Waygrid capacity registration limit reached.");
  const stacks = vault.stacks.map(slot => ({ ...slot })), items: InventorySlot[] = [];
  let excess = Math.max(0, stacks.reduce((sum, slot) => sum + slot.count, 0) - digitalItemCapacity({ cells: itemCells }));
  for (let index = stacks.length - 1; index >= 0 && excess > 0; index--) {
    const slot = stacks[index], moved = Math.min(excess, slot.count), split: InventorySlot[] = [];
    const limit = inventorySlotStackLimit(slot);
    if (items.length + Math.ceil(moved / limit) > 4_096) throw Error("Waygrid overflow exceeds the bounded planning limit; withdraw contents first.");
    for (let left = moved; left > 0;) { const count = Math.min(left, limit); split.push({ ...slot, count }); left -= count; }
    items.unshift(...split); slot.count -= moved; excess -= moved;
    if (!slot.count) stacks.splice(index, 1);
  }
  const capacity = digitalCreatureCapacity({ cells: creatureCells }), orbs = archive.orbs.slice(capacity);
  if ((items.length || orbs.length) && !spillPosition) throw Error("Waygrid capacity spill has no physical source.");
  return { vault: { ...vault, cells: itemCells, stacks }, archive: { ...archive, cells: creatureCells, orbs: archive.orbs.slice(0, capacity) },
    spills: spillPosition && (items.length || orbs.length) ? [{ position: spillPosition, items, orbs }] : [] };
}
