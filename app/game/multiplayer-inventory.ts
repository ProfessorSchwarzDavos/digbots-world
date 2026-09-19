import { ITEMS, cloneSlot, type InventorySlot, type ItemCode } from "./data";
import {
  distributeInventoryCursor,
  inventorySlotStackLimit,
  inventorySlotsCanStack,
  sortInventoryRegion,
} from "./inventory-convenience";
import type {
  ContainerOperation,
  ContainerSnapshot,
  ItemStackSnapshot,
  PlayerSessionSnapshot,
} from "./multiplayer";

export type ContainerOperationPolicy = {
  containerKind: ContainerSnapshot["kind"];
  canPlace?: (slot: number, stack: InventorySlot) => boolean;
  maxCount?: (slot: number, stack: InventorySlot) => number;
  canUsePlayerTarget?: (owner: "equipment" | "offhand", slot: number, stack: InventorySlot) => boolean;
};

export type ContainerOperationResult = {
  applied: boolean;
  reason?: string;
  player: PlayerSessionSnapshot;
  slots: ItemStackSnapshot[];
  moved: number;
};

function fromNetwork(slot: ItemStackSnapshot): InventorySlot | null {
  return slot ? cloneSlot(slot as InventorySlot) : null;
}

function toNetwork(slot: InventorySlot | null): ItemStackSnapshot {
  return slot ? cloneSlot(slot) as ItemStackSnapshot : null;
}

function canPlace(policy: ContainerOperationPolicy, slot: number, stack: InventorySlot) {
  if (policy.containerKind === "furnace" && slot === 2) return false;
  return policy.canPlace?.(slot, stack) ?? true;
}

function maxContainerCount(policy: ContainerOperationPolicy, slot: number, stack: InventorySlot) {
  return Math.max(1, Math.min(inventorySlotStackLimit(stack), policy.maxCount?.(slot, stack) ?? inventorySlotStackLimit(stack)));
}

function transferInto(
  source: InventorySlot,
  destination: Array<InventorySlot | null>,
  indices: readonly number[],
  accepts: (index: number, stack: InventorySlot) => boolean,
  limit: (index: number, stack: InventorySlot) => number = (_index, stack) => inventorySlotStackLimit(stack),
) {
  const before = source.count;
  for (const index of indices) {
    const target = destination[index];
    const targetLimit = limit(index, source);
    if (!target || !accepts(index, source) || !inventorySlotsCanStack(source, target) || target.count >= targetLimit) continue;
    const moved = Math.min(source.count, targetLimit - target.count);
    target.count += moved;
    source.count -= moved;
    if (source.count <= 0) return before;
  }
  for (const index of indices) {
    if (destination[index] || !accepts(index, source)) continue;
    const moved = Math.min(source.count, limit(index, source));
    destination[index] = cloneSlot({ ...source, count: moved });
    source.count -= moved;
    if (source.count <= 0) break;
  }
  return before - source.count;
}

function clickSlot(
  operation: Extract<ContainerOperation, { op: "click" }>,
  inventory: Array<InventorySlot | null>,
  container: Array<InventorySlot | null>,
  cursor: InventorySlot | null,
  policy: ContainerOperationPolicy,
) {
  if (operation.target.owner !== "player" && operation.target.owner !== "container") {
    return { applied: false, cursor, moved: 0, reason: "That player slot needs the auxiliary slot handler." };
  }
  const target = operation.target.owner === "player" ? inventory : container;
  const index = operation.target.slot;
  if (index < 0 || index >= target.length) return { applied: false, cursor, moved: 0, reason: "That slot is unavailable." };
  const slot = target[index];
  if (operation.shift) {
    if (!slot) return { applied: false, cursor, moved: 0, reason: "That slot is empty." };
    const source = cloneSlot(slot)!;
    const destination = operation.target.owner === "player" ? container : inventory;
    const indices = operation.target.owner === "player"
      ? destination.map((_, destinationIndex) => destinationIndex)
      : [...inventory.slice(9).map((_, destinationIndex) => destinationIndex + 9), ...inventory.slice(0, 9).map((_, destinationIndex) => destinationIndex)];
    const moved = transferInto(
      source,
      destination,
      indices,
      operation.target.owner === "player" ? (destinationIndex, stack) => canPlace(policy, destinationIndex, stack) : () => true,
      operation.target.owner === "player" ? (destinationIndex, stack) => maxContainerCount(policy, destinationIndex, stack) : undefined,
    );
    if (moved <= 0) return { applied: false, cursor, moved: 0, reason: operation.target.owner === "player" ? "That shared container cannot accept this stack." : "Your pack is full." };
    target[index] = source.count > 0 ? source : null;
    return { applied: true, cursor, moved };
  }

  // A furnace output is withdraw-only. With an existing matching cursor the
  // gesture still pulls cooked items out; it must never attempt to push the
  // cursor back into the protected output slot.
  if (policy.containerKind === "furnace" && operation.target.owner === "container" && index === 2 && slot && cursor) {
    if (!inventorySlotsCanStack(cursor, slot)) return { applied: false, cursor, moved: 0, reason: "Clear your cursor before taking that output." };
    const room = inventorySlotStackLimit(cursor) - cursor.count;
    const moved = Math.min(slot.count, operation.button === "right" ? 1 : room, room);
    if (moved <= 0) return { applied: false, cursor, moved: 0, reason: "That carried stack is already full." };
    cursor.count += moved;
    slot.count -= moved;
    if (slot.count <= 0) target[index] = null;
    return { applied: true, cursor, moved };
  }

  if (operation.button === "left") {
    if (!cursor && slot) {
      target[index] = null;
      return { applied: true, cursor: cloneSlot(slot), moved: slot.count };
    }
    if (cursor && !slot) {
      if (operation.target.owner === "container" && !canPlace(policy, index, cursor)) return { applied: false, cursor, moved: 0, reason: "That item does not belong in this slot." };
      const moved = operation.target.owner === "container" ? Math.min(cursor.count, maxContainerCount(policy, index, cursor)) : cursor.count;
      target[index] = cloneSlot({ ...cursor, count: moved });
      cursor.count -= moved;
      return { applied: true, cursor: cursor.count > 0 ? cursor : null, moved };
    }
    if (cursor && slot && inventorySlotsCanStack(cursor, slot) && slot.count < inventorySlotStackLimit(slot)) {
      if (operation.target.owner === "container" && !canPlace(policy, index, cursor)) return { applied: false, cursor, moved: 0, reason: "That item does not belong in this slot." };
      const limit = operation.target.owner === "container" ? maxContainerCount(policy, index, cursor) : inventorySlotStackLimit(slot);
      const moved = Math.min(cursor.count, limit - slot.count);
      if (moved <= 0) return { applied: false, cursor, moved: 0, reason: "That slot is already full." };
      slot.count += moved;
      cursor.count -= moved;
      return { applied: moved > 0, cursor: cursor.count > 0 ? cursor : null, moved };
    }
    if (cursor && slot) {
      if (operation.target.owner === "container" && (!canPlace(policy, index, cursor) || cursor.count > maxContainerCount(policy, index, cursor))) return { applied: false, cursor, moved: 0, reason: "That item does not belong in this slot." };
      target[index] = cloneSlot(cursor);
      return { applied: true, cursor: cloneSlot(slot), moved: cursor.count + slot.count };
    }
  } else {
    if (!cursor && slot) {
      const moved = Math.ceil(slot.count / 2);
      const nextCursor = cloneSlot({ ...slot, count: moved });
      slot.count -= moved;
      if (slot.count <= 0) target[index] = null;
      return { applied: true, cursor: nextCursor, moved };
    }
    if (cursor && !slot) {
      if (operation.target.owner === "container" && !canPlace(policy, index, cursor)) return { applied: false, cursor, moved: 0, reason: "That item does not belong in this slot." };
      target[index] = cloneSlot({ ...cursor, count: 1 });
      cursor.count -= 1;
      return { applied: true, cursor: cursor.count > 0 ? cursor : null, moved: 1 };
    }
    if (cursor && slot && inventorySlotsCanStack(cursor, slot) && slot.count < (operation.target.owner === "container" ? maxContainerCount(policy, index, cursor) : inventorySlotStackLimit(slot))) {
      if (operation.target.owner === "container" && !canPlace(policy, index, cursor)) return { applied: false, cursor, moved: 0, reason: "That item does not belong in this slot." };
      slot.count += 1;
      cursor.count -= 1;
      return { applied: true, cursor: cursor.count > 0 ? cursor : null, moved: 1 };
    }
  }
  return { applied: false, cursor, moved: 0, reason: "That click did not change either inventory." };
}

const EQUIPMENT_KEYS = ["head", "chest", "legs", "feet", "back"] as const;

function clickPlayerAuxiliary(
  operation: Extract<ContainerOperation, { op: "click" }>,
  inventory: Array<InventorySlot | null>,
  cursor: InventorySlot | null,
  equipment: Record<(typeof EQUIPMENT_KEYS)[number], InventorySlot | null>,
  offhand: InventorySlot | null,
  trash: InventorySlot | null,
  policy: ContainerOperationPolicy,
) {
  const owner = operation.target.owner;
  if (owner === "player" || owner === "container") return null;
  if ((owner === "offhand" || owner === "trash") && operation.target.slot !== 0) return { applied: false, cursor, equipment, offhand, trash, moved: 0, reason: "That slot is unavailable." };
  if (owner === "equipment" && (operation.target.slot < 0 || operation.target.slot >= EQUIPMENT_KEYS.length)) return { applied: false, cursor, equipment, offhand, trash, moved: 0, reason: "That armor slot is unavailable." };

  if (owner === "trash") {
    if (!cursor && !trash) return { applied: false, cursor, equipment, offhand, trash, moved: 0, reason: "The trash slot is empty." };
    if (operation.button === "left") {
      if (!cursor) { cursor = trash; trash = null; }
      else { trash = cursor; cursor = null; }
      return { applied: true, cursor, equipment, offhand, trash, moved: 1 };
    }
    if (!cursor && trash) {
      const moved = Math.ceil(trash.count / 2);
      cursor = cloneSlot({ ...trash, count: moved });
      trash.count -= moved;
      if (trash.count <= 0) trash = null;
      return { applied: true, cursor, equipment, offhand, trash, moved };
    }
    if (cursor) {
      trash = cloneSlot({ ...cursor, count: 1 });
      cursor.count -= 1;
      return { applied: true, cursor: cursor.count > 0 ? cursor : null, equipment, offhand, trash, moved: 1 };
    }
  }
  if (owner === "trash") return { applied: false, cursor, equipment, offhand, trash, moved: 0, reason: "That trash click did not change the slot." };

  const equipmentKey = owner === "equipment" ? EQUIPMENT_KEYS[operation.target.slot] : null;
  let equipped = equipmentKey ? equipment[equipmentKey] : offhand;
  if (operation.shift && equipped) {
    const source = cloneSlot(equipped)!;
    const order = [...inventory.slice(9).map((_, index) => index + 9), ...inventory.slice(0, 9).map((_, index) => index)];
    const moved = transferInto(source, inventory, order, () => true);
    if (moved <= 0) return { applied: false, cursor, equipment, offhand, trash, moved: 0, reason: "Your pack is full." };
    equipped = source.count > 0 ? source : null;
    if (equipmentKey) equipment[equipmentKey] = equipped;
    else offhand = equipped;
    return { applied: true, cursor, equipment, offhand, trash, moved };
  }
  if (!cursor && equipped) {
    cursor = equipped;
    if (equipmentKey) equipment[equipmentKey] = null;
    else offhand = null;
    return { applied: true, cursor, equipment, offhand, trash, moved: cursor.count };
  }
  if (!cursor || !(policy.canUsePlayerTarget?.(owner, operation.target.slot, cursor) ?? false)) {
    return { applied: false, cursor, equipment, offhand, trash, moved: 0, reason: "That item cannot be equipped there." };
  }
  const incoming = cloneSlot({ ...cursor, count: 1 })!;
  if (!equipped) {
    if (equipmentKey) equipment[equipmentKey] = incoming;
    else offhand = incoming;
    cursor.count -= 1;
    return { applied: true, cursor: cursor.count > 0 ? cursor : null, equipment, offhand, trash, moved: 1 };
  }
  if (operation.button !== "left") return { applied: false, cursor, equipment, offhand, trash, moved: 0, reason: "That click did not change the equipped item." };
  if (cursor.count > 1) {
    const remainder = cloneSlot({ ...cursor, count: cursor.count - 1 })!;
    const before = remainder.count;
    const order = [...inventory.slice(9).map((_, index) => index + 9), ...inventory.slice(0, 9).map((_, index) => index)];
    if (transferInto(remainder, inventory, order, () => true) !== before) return { applied: false, cursor, equipment, offhand, trash, moved: 0, reason: "Make room in your pack before swapping that stacked item." };
  }
  if (equipmentKey) equipment[equipmentKey] = incoming;
  else offhand = incoming;
  cursor = equipped;
  return { applied: true, cursor, equipment, offhand, trash, moved: 1 };
}

function transferConvenience(
  operation: Extract<ContainerOperation, { op: "stack" | "transfer-all" }>,
  inventory: Array<InventorySlot | null>,
  container: Array<InventorySlot | null>,
  policy: ContainerOperationPolicy,
) {
  const playerToContainer = operation.direction === "player-to-container";
  let moved = 0;
  if (playerToContainer) {
    const baseDestinations = container.map((_, index) => index);
    const destinations = operation.op === "stack" ? baseDestinations.filter((index) => Boolean(container[index])) : baseDestinations;
    for (let index = 9; index < inventory.length; index += 1) {
      const source = inventory[index];
      if (!source) continue;
      moved += transferInto(source, container, destinations, (destination, stack) => canPlace(policy, destination, stack), (destination, stack) => maxContainerCount(policy, destination, stack));
      if (source.count <= 0) inventory[index] = null;
    }
    return { inventory, container, moved };
  }
  const baseDestinations = [...inventory.slice(9).map((_, index) => index + 9), ...inventory.slice(0, 9).map((_, index) => index)];
  const destinations = operation.op === "stack" ? baseDestinations.filter((index) => Boolean(inventory[index])) : baseDestinations;
  for (let index = 0; index < container.length; index += 1) {
    const source = container[index];
    if (!source) continue;
    moved += transferInto(source, inventory, destinations, () => true);
    if (source.count <= 0) container[index] = null;
  }
  return { inventory, container, moved };
}

export function applyContainerOperation(
  playerState: PlayerSessionSnapshot,
  containerSlots: readonly ItemStackSnapshot[],
  operation: ContainerOperation,
  policy: ContainerOperationPolicy,
): ContainerOperationResult {
  let inventory = playerState.inventory.map(fromNetwork);
  let slots = containerSlots.map(fromNetwork);
  let cursor = fromNetwork(playerState.cursor ?? null);
  let equipment = Object.fromEntries(EQUIPMENT_KEYS.map((key) => [key, fromNetwork(playerState.equipment[key] ?? null)])) as Record<(typeof EQUIPMENT_KEYS)[number], InventorySlot | null>;
  let offhand = fromNetwork(playerState.offhand ?? null);
  let trash = fromNetwork(playerState.trash ?? null);
  let moved = 0;
  let reason: string | undefined;

  if (operation.op === "click") {
    const auxiliary = clickPlayerAuxiliary(operation, inventory, cursor, equipment, offhand, trash, policy);
    if (auxiliary) {
      if (!auxiliary.applied) return { applied: false, reason: auxiliary.reason, player: playerState, slots: containerSlots.map((slot) => slot ? structuredClone(slot) : null), moved: 0 };
      cursor = auxiliary.cursor;
      equipment = auxiliary.equipment;
      offhand = auxiliary.offhand;
      trash = auxiliary.trash;
      moved = auxiliary.moved;
    } else {
      const result = clickSlot(operation, inventory, slots, cursor, policy);
      if (!result.applied) return { applied: false, reason: result.reason, player: playerState, slots: containerSlots.map((slot) => slot ? structuredClone(slot) : null), moved: 0 };
      cursor = result.cursor;
      moved = result.moved;
    }
  } else if (operation.op === "distribute") {
    if (!cursor) return { applied: false, reason: "Pick up a stack before distributing it.", player: playerState, slots: containerSlots.map((slot) => slot ? structuredClone(slot) : null), moved: 0 };
    const distributed = distributeInventoryCursor(cursor, operation.targets.map((target) => inventory[target]), operation.button);
    if (distributed.moved <= 0) return { applied: false, reason: "That carried stack cannot be distributed to those slots.", player: playerState, slots: containerSlots.map((slot) => slot ? structuredClone(slot) : null), moved: 0 };
    operation.targets.forEach((target, index) => { inventory[target] = cloneSlot(distributed.slots[index]); });
    cursor = cloneSlot(distributed.cursor);
    moved = distributed.moved;
  } else if (operation.op === "collect-matching") {
    const exemplar = cursor ?? (operation.item !== undefined ? ({ item: operation.item, count: 0 } as InventorySlot) : null);
    if (!exemplar || !ITEMS[exemplar.item]) return { applied: false, reason: "Choose an item before collecting matching stacks.", player: playerState, slots: containerSlots.map((slot) => slot ? structuredClone(slot) : null), moved: 0 };
    cursor = cursor ?? exemplar;
    for (const source of [inventory, slots]) for (let index = 0; index < source.length && cursor.count < inventorySlotStackLimit(cursor); index += 1) {
      const slot = source[index];
      if (!slot || !inventorySlotsCanStack(slot, cursor)) continue;
      const amount = Math.min(slot.count, inventorySlotStackLimit(cursor) - cursor.count);
      cursor.count += amount;
      slot.count -= amount;
      moved += amount;
      if (slot.count <= 0) source[index] = null;
    }
    if (moved <= 0) reason = "No matching shared stacks were available.";
  } else if (operation.op === "sort") {
    if (operation.target === "container" && policy.containerKind === "furnace") {
      return { applied: false, reason: "Furnace slots have fixed purposes and cannot be sorted.", player: playerState, slots: containerSlots.map((slot) => slot ? structuredClone(slot) : null), moved: 0 };
    }
    if (operation.target === "player") inventory = sortInventoryRegion(inventory, 9, inventory.length) as Array<InventorySlot | null>;
    else slots = sortInventoryRegion(slots) as Array<InventorySlot | null>;
    moved = 1;
  } else {
    const result = transferConvenience(operation, inventory, slots, policy);
    inventory = result.inventory;
    slots = result.container;
    moved = result.moved;
    if (moved <= 0) reason = operation.op === "stack" ? "No matching stacks could move." : "No items could move.";
  }

  if (moved <= 0 && reason) return { applied: false, reason, player: playerState, slots: containerSlots.map((slot) => slot ? structuredClone(slot) : null), moved: 0 };
  return {
    applied: true,
    player: {
      ...playerState,
      inventory: inventory.map(toNetwork),
      cursor: toNetwork(cursor),
      trash: toNetwork(trash),
      equipment: Object.fromEntries(EQUIPMENT_KEYS.map((key) => [key, toNetwork(equipment[key])])) as PlayerSessionSnapshot["equipment"],
      offhand: toNetwork(offhand),
    },
    slots: slots.map(toNetwork),
    moved,
  };
}

export function containerOperationItem(operation: ContainerOperation, player: PlayerSessionSnapshot, slots: readonly ItemStackSnapshot[]): ItemCode | undefined {
  if (operation.op === "collect-matching") return operation.item;
  if (operation.op !== "click") return undefined;
  if (operation.target.owner === "player") return player.inventory[operation.target.slot]?.item;
  if (operation.target.owner === "container") return slots[operation.target.slot]?.item;
  if (operation.target.owner === "offhand") return player.offhand?.item;
  if (operation.target.owner === "trash") return player.trash?.item;
  return player.equipment[EQUIPMENT_KEYS[operation.target.slot]]?.item;
}
