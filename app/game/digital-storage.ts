import { type InventorySlot, type ItemCode } from "./data";
import { inventorySlotStackLimit, isFilledCaptureOrbSlot } from "./inventory-convenience";
import { readWaygridCapacityId } from "./waygrid-capacity-identity";
import {
  decodeCaptureOrb,
  encodeCaptureOrb,
  refreshAttunedOrbHealth,
  type CaptureOrb,
} from "./capture-orbs";

export type DigitalStorageTier = 1 | 2 | 3;
export const DIGITAL_ITEM_CELL_CAPACITY: Readonly<Record<DigitalStorageTier, number>> = {
  1: 1_000,
  2: 10_000,
  3: 100_000,
};
export const DIGITAL_CREATURE_CELL_CAPACITY: Readonly<Record<DigitalStorageTier, number>> = {
  1: 16,
  2: 160,
  3: 1_600,
};
export const DIGITAL_CREATURE_HEAL_SECONDS = 60;

export type DigitalStorageCell = Readonly<{ id: string; tier: DigitalStorageTier }>;

export type DigitalItemVault = Readonly<{
  schema: 1;
  cells: readonly DigitalStorageCell[];
  stacks: readonly InventorySlot[];
}>;

export type DigitalCreatureArchive = Readonly<{
  schema: 1;
  cells: readonly DigitalStorageCell[];
  orbs: readonly CaptureOrb[];
  healClock: number;
  healCycles: number;
}>;

const cleanCell = (cell: DigitalStorageCell): DigitalStorageCell => ({
  // Canonical physical identities include the complete location tuple. Legacy
  // display names retain their historical limit; scoped IDs must never truncate.
  id: readWaygridCapacityId(cell.id) ? cell.id : cell.id.trim().slice(0, 80) || "storage-cell",
  tier: cell.tier === 2 || cell.tier === 3 ? cell.tier : 1,
});

const cloneOrb = (orb: CaptureOrb): CaptureOrb => {
  const cloned = decodeCaptureOrb(encodeCaptureOrb(orb));
  if (!cloned) throw new Error("Invalid Capture Orb archive payload");
  return cloned;
};

const stableJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
};

const stackKey = (slot: Pick<InventorySlot, "item" | "durability" | "metadata">) =>
  `${slot.item}|${slot.durability ?? ""}|${stableJson(slot.metadata ?? null)}`;

export const digitalStackSignature = stackKey;

const cloneSlot = (slot: InventorySlot): InventorySlot => ({
  item: slot.item,
  count: Math.max(0, Math.floor(slot.count)),
  ...(slot.durability !== undefined ? { durability: slot.durability } : {}),
  ...(slot.metadata ? { metadata: JSON.parse(JSON.stringify(slot.metadata)) as Record<string, unknown> } : {}),
});

export const digitalItemCapacity = (vault: Pick<DigitalItemVault, "cells">) =>
  vault.cells.reduce((sum, cell) => sum + DIGITAL_ITEM_CELL_CAPACITY[cell.tier], 0);

export const digitalCreatureCapacity = (archive: Pick<DigitalCreatureArchive, "cells">) =>
  archive.cells.reduce((sum, cell) => sum + DIGITAL_CREATURE_CELL_CAPACITY[cell.tier], 0);

export const digitalItemCount = (vault: Pick<DigitalItemVault, "stacks">) =>
  vault.stacks.reduce((sum, slot) => sum + Math.max(0, Math.floor(slot.count)), 0);

export function createDigitalItemVault(cells: readonly DigitalStorageCell[] = [{ id: "item-cell-1", tier: 1 }]): DigitalItemVault {
  return { schema: 1, cells: cells.map(cleanCell), stacks: [] };
}

export function createDigitalCreatureArchive(cells: readonly DigitalStorageCell[] = [{ id: "creature-cell-1", tier: 1 }]): DigitalCreatureArchive {
  return { schema: 1, cells: cells.map(cleanCell), orbs: [], healClock: 0, healCycles: 0 };
}

export function normalizeDigitalItemVault(value: unknown): DigitalItemVault {
  if (!value || typeof value !== "object") return createDigitalItemVault();
  const input = value as Partial<DigitalItemVault>;
  const cells = Array.isArray(input.cells)
    ? input.cells.filter((cell): cell is DigitalStorageCell => Boolean(cell && typeof cell.id === "string")).slice(0, 4_096).map(cleanCell)
    : [];
  const uniqueCells = [...new Map(cells.map((cell) => [cell.id, cell])).values()];
  let state = createDigitalItemVault(uniqueCells);
  for (const candidate of Array.isArray(input.stacks) ? input.stacks.slice(0, 65_536) : []) {
    if (!candidate || typeof candidate.item !== "number" || typeof candidate.count !== "number" || candidate.count <= 0) continue;
    state = depositDigitalItem(state, candidate).state;
  }
  return state;
}

export function normalizeDigitalCreatureArchive(value: unknown): DigitalCreatureArchive {
  if (!value || typeof value !== "object") return createDigitalCreatureArchive();
  const input = value as Partial<DigitalCreatureArchive>;
  const cells = Array.isArray(input.cells)
    ? input.cells.filter((cell): cell is DigitalStorageCell => Boolean(cell && typeof cell.id === "string")).slice(0, 4_096).map(cleanCell)
    : [];
  const uniqueCells = [...new Map(cells.map((cell) => [cell.id, cell])).values()];
  let state: DigitalCreatureArchive = {
    ...createDigitalCreatureArchive(uniqueCells),
    healClock: Math.max(0, Math.min(DIGITAL_CREATURE_HEAL_SECONDS, Number(input.healClock) || 0)),
    healCycles: Math.max(0, Math.floor(Number(input.healCycles) || 0)),
  };
  for (const candidate of Array.isArray(input.orbs) ? input.orbs.slice(0, 8_192) : []) {
    try {
      const orb = cloneOrb(candidate);
      state = depositCreatureOrb(state, orb).state;
    } catch {
      // A malformed archived orb is omitted rather than poisoning the save.
    }
  }
  return state;
}

export function addDigitalItemCell(vault: DigitalItemVault, cell: DigitalStorageCell): DigitalItemVault {
  const normalized = cleanCell(cell);
  return vault.cells.some((entry) => entry.id === normalized.id) ? vault : { ...vault, cells: [...vault.cells, normalized] };
}

export function addDigitalCreatureCell(archive: DigitalCreatureArchive, cell: DigitalStorageCell): DigitalCreatureArchive {
  const normalized = cleanCell(cell);
  return archive.cells.some((entry) => entry.id === normalized.id) ? archive : { ...archive, cells: [...archive.cells, normalized] };
}

export function digitalCellCounts(value: Pick<DigitalItemVault | DigitalCreatureArchive, "cells">): readonly [number, number, number] {
  return [
    value.cells.filter((cell) => cell.tier === 1).length,
    value.cells.filter((cell) => cell.tier === 2).length,
    value.cells.filter((cell) => cell.tier === 3).length,
  ];
}

export function depositDigitalItem(vault: DigitalItemVault, slot: InventorySlot): Readonly<{
  state: DigitalItemVault;
  accepted: number;
  remainder: InventorySlot | null;
}> {
  const incoming = cloneSlot(slot);
  if (incoming.count <= 0) return { state: vault, accepted: 0, remainder: null };
  // Creature records belong in the Creature Archive. Keeping them out of the
  // bulk item vault prevents identical/corrupt filled-orb payloads from ever
  // being represented as one high-count digital stack.
  if (isFilledCaptureOrbSlot(incoming)) return { state: vault, accepted: 0, remainder: incoming };
  const available = Math.max(0, digitalItemCapacity(vault) - digitalItemCount(vault));
  const accepted = Math.min(available, incoming.count);
  if (accepted <= 0) return { state: vault, accepted: 0, remainder: incoming };
  const key = stackKey(incoming);
  let merged = false;
  const stacks = vault.stacks.map((existing) => {
    if (merged || stackKey(existing) !== key) return cloneSlot(existing);
    merged = true;
    return { ...cloneSlot(existing), count: existing.count + accepted };
  });
  if (!merged) stacks.push({ ...incoming, count: accepted });
  return {
    state: { ...vault, stacks },
    accepted,
    remainder: accepted < incoming.count ? { ...incoming, count: incoming.count - accepted } : null,
  };
}

export function withdrawDigitalItem(vault: DigitalItemVault, item: ItemCode, count: number, signature?: string): Readonly<{
  state: DigitalItemVault;
  withdrawn: InventorySlot | null;
}> {
  const requested = Math.max(0, Math.floor(count));
  const index = vault.stacks.findIndex((slot) => slot.item === item && (signature === undefined || stackKey(slot) === signature));
  if (requested <= 0 || index < 0) return { state: vault, withdrawn: null };
  const source = vault.stacks[index];
  const moved = Math.min(requested, source.count);
  const stacks = vault.stacks.map(cloneSlot);
  if (moved >= source.count) stacks.splice(index, 1);
  else stacks[index] = { ...cloneSlot(source), count: source.count - moved };
  return { state: { ...vault, stacks }, withdrawn: { ...cloneSlot(source), count: moved } };
}

export function searchDigitalItems(vault: DigitalItemVault, query: string, itemName: (item: ItemCode) => string) {
  const needle = query.trim().toLocaleLowerCase();
  return vault.stacks
    .filter((slot) => !needle || itemName(slot.item).toLocaleLowerCase().includes(needle))
    .map(cloneSlot)
    .sort((a, b) => itemName(a.item).localeCompare(itemName(b.item)) || a.item - b.item);
}

function splitLegalStacks(slot: InventorySlot): InventorySlot[] {
  const result: InventorySlot[] = [];
  let remaining = Math.max(0, Math.floor(slot.count));
  const limit = inventorySlotStackLimit(slot);
  while (remaining > 0) {
    const count = Math.min(limit, remaining);
    result.push({ ...cloneSlot(slot), count });
    remaining -= count;
  }
  return result;
}

/** Removes a cell and spills newest stored entries until the new physical capacity is legal. */
export function removeDigitalItemCell(vault: DigitalItemVault, cellId: string): Readonly<{
  state: DigitalItemVault;
  overflow: readonly InventorySlot[];
}> {
  const cells = vault.cells.filter((cell) => cell.id !== cellId);
  const capacity = digitalItemCapacity({ cells });
  let excess = Math.max(0, digitalItemCount(vault) - capacity);
  const stacks = vault.stacks.map(cloneSlot);
  const overflow: InventorySlot[] = [];
  for (let index = stacks.length - 1; index >= 0 && excess > 0; index -= 1) {
    const moved = Math.min(excess, stacks[index].count);
    overflow.unshift(...splitLegalStacks({ ...stacks[index], count: moved }));
    stacks[index].count -= moved;
    excess -= moved;
    if (stacks[index].count <= 0) stacks.splice(index, 1);
  }
  return { state: { ...vault, cells, stacks }, overflow };
}

export function digitalItemUtilization(vault: DigitalItemVault) {
  const used = digitalItemCount(vault);
  const capacity = digitalItemCapacity(vault);
  return {
    used,
    capacity,
    ratio: capacity <= 0 ? 0 : used / capacity,
    percentage: capacity <= 0 ? 0 : Math.min(100, used / capacity * 100),
    label: `${used.toLocaleString()}/${capacity.toLocaleString()}`,
  } as const;
}

export function depositCreatureOrb(archive: DigitalCreatureArchive, orb: CaptureOrb): Readonly<{
  state: DigitalCreatureArchive;
  accepted: boolean;
  reason: "ok" | "empty" | "deployed" | "full" | "duplicate";
}> {
  if (!orb.creature) return { state: archive, accepted: false, reason: "empty" };
  if (orb.attunement?.activeEntityId) return { state: archive, accepted: false, reason: "deployed" };
  if (archive.orbs.some((candidate) => candidate.orbId === orb.orbId)) return { state: archive, accepted: false, reason: "duplicate" };
  if (archive.orbs.length >= digitalCreatureCapacity(archive)) return { state: archive, accepted: false, reason: "full" };
  return { state: { ...archive, orbs: [...archive.orbs, cloneOrb(orb)] }, accepted: true, reason: "ok" };
}

export function withdrawCreatureOrb(archive: DigitalCreatureArchive, orbId: string): Readonly<{
  state: DigitalCreatureArchive;
  orb: CaptureOrb | null;
}> {
  const index = archive.orbs.findIndex((orb) => orb.orbId === orbId);
  if (index < 0) return { state: archive, orb: null };
  const orbs = archive.orbs.map(cloneOrb);
  const [orb] = orbs.splice(index, 1);
  return { state: { ...archive, orbs }, orb };
}

export function searchCreatureArchive(archive: DigitalCreatureArchive, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  return archive.orbs.filter((orb) => {
    const creature = orb.creature;
    return creature && (!needle || creature.kind.toLocaleLowerCase().includes(needle) || (creature.name ?? "").toLocaleLowerCase().includes(needle));
  });
}

export function stepDigitalCreatureHealing(archive: DigitalCreatureArchive, deltaSeconds: number): Readonly<{
  state: DigitalCreatureArchive;
  healed: number;
}> {
  const dt = Math.max(0, Math.min(3_600, deltaSeconds));
  let healClock = archive.healClock + dt;
  const cycles = Math.min(60, Math.floor(healClock / DIGITAL_CREATURE_HEAL_SECONDS));
  healClock -= cycles * DIGITAL_CREATURE_HEAL_SECONDS;
  if (cycles <= 0) return { state: { ...archive, healClock }, healed: 0 };
  let healed = 0;
  const orbs = archive.orbs.map((orb) => {
    if (!orb.creature || orb.creature.health >= orb.creature.maxHealth) return orb;
    const creature = JSON.parse(JSON.stringify(orb.creature)) as typeof orb.creature;
    const before = creature.health;
    creature.health = Math.min(creature.maxHealth, creature.health + cycles);
    healed += creature.health - before;
    return refreshAttunedOrbHealth({ ...orb, creature });
  });
  return { state: { ...archive, orbs, healClock, healCycles: archive.healCycles + cycles }, healed };
}

export function removeDigitalCreatureCell(archive: DigitalCreatureArchive, cellId: string): Readonly<{
  state: DigitalCreatureArchive;
  overflow: readonly CaptureOrb[];
}> {
  const cells = archive.cells.filter((cell) => cell.id !== cellId);
  const capacity = digitalCreatureCapacity({ cells });
  const kept = archive.orbs.slice(0, capacity);
  const overflow = archive.orbs.slice(capacity);
  return { state: { ...archive, cells, orbs: kept }, overflow };
}

export type AreaCraftingRequirement = Readonly<{ item: ItemCode; count: number }>;
export type AreaCraftingSource = Readonly<{
  id: string;
  kind: "player" | "digital" | "chest";
  slots: readonly InventorySlot[];
}>;
export type AreaCraftingAllocation = Readonly<{ sourceId: string; sourceKind: AreaCraftingSource["kind"]; item: ItemCode; count: number }>;

/** Deterministic player -> digital -> nearby-chest ingredient planning; mutation happens only after the full plan succeeds. */
export function planAreaCrafting(requirements: readonly AreaCraftingRequirement[], sources: readonly AreaCraftingSource[]): Readonly<{
  ok: boolean;
  allocations: readonly AreaCraftingAllocation[];
  missing: readonly AreaCraftingRequirement[];
}> {
  const priority = { player: 0, digital: 1, chest: 2 } as const;
  const ordered = [...sources].sort((a, b) => priority[a.kind] - priority[b.kind] || a.id.localeCompare(b.id));
  const remainingBySource = new Map(ordered.map((source) => [source.id, source.slots.map(cloneSlot)] as const));
  const allocations: AreaCraftingAllocation[] = [];
  const missing: AreaCraftingRequirement[] = [];
  for (const requirement of requirements) {
    let remaining = Math.max(0, Math.floor(requirement.count));
    for (const source of ordered) {
      const slots = remainingBySource.get(source.id)!;
      for (const slot of slots) {
        if (slot.item !== requirement.item || slot.count <= 0 || remaining <= 0) continue;
        const moved = Math.min(remaining, slot.count);
        slot.count -= moved;
        remaining -= moved;
        allocations.push({ sourceId: source.id, sourceKind: source.kind, item: requirement.item, count: moved });
      }
      if (remaining <= 0) break;
    }
    if (remaining > 0) missing.push({ item: requirement.item, count: remaining });
  }
  return { ok: missing.length === 0, allocations: missing.length === 0 ? allocations : [], missing };
}
