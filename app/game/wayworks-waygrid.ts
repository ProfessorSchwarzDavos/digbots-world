import { cloneSlot, maxStack, type InventorySlot } from "./data";
import { captureOrbInventorySlot, captureOrbFromInventorySlot } from "./capture-orbs";
import { depositCreatureOrb, depositDigitalItem, digitalStackSignature, withdrawCreatureOrb, withdrawDigitalItem,
  type DigitalCreatureArchive, type DigitalItemVault } from "./digital-storage";

export type WaygridOperation = { kind: "deposit-item"; inventorySlot: number } | { kind: "deposit-creature"; inventorySlot: number }
  | { kind: "withdraw-item"; signature: string; count: number }
  | { kind: "withdraw-creature"; orbId: string };
export function validWaygridOperation(value: unknown): value is WaygridOperation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const operation = value as Record<string, unknown>;
  const exact = (...keys: string[]) => Object.keys(operation).every((key) => ["kind", ...keys].includes(key));
  switch (operation.kind) {
    case "deposit-item": case "deposit-creature": return exact("inventorySlot") && Number.isInteger(operation.inventorySlot) && (operation.inventorySlot as number) >= 0 && (operation.inventorySlot as number) < 36;
    case "withdraw-item": return exact("signature", "count") && typeof operation.signature === "string" && operation.signature.length > 0 && operation.signature.length <= 16_384
      && Number.isInteger(operation.count) && (operation.count as number) > 0 && (operation.count as number) <= 64;
    case "withdraw-creature": return exact("orbId") && typeof operation.orbId === "string" && operation.orbId.length > 0 && operation.orbId.length <= 160;
    default: return false;
  }
}

/** Returns immutable custody images. Engine commits these together with the power debit. */
export function operateWaygrid(vault: DigitalItemVault, archive: DigitalCreatureArchive, inventory: readonly (InventorySlot | null)[], operation: WaygridOperation) {
  const fail = (reason: string) => ({ ok: false, reason, vault, archive, inventory, moved: 0, powerJ: 0 });
  if (!validWaygridOperation(operation) || inventory.length > 36) return fail("invalid-operation");
  const slots = inventory.map(cloneSlot);
  const roomFor = (item: InventorySlot) => slots.reduce((total, slot) => total + (!slot ? maxStack(item.item)
    : digitalStackSignature(slot) === digitalStackSignature(item) ? Math.max(0, maxStack(item.item) - slot.count) : 0), 0);
  const insert = (item: InventorySlot) => {
    let remaining = item.count;
    for (let i = 0; i < slots.length && remaining > 0; i++) {
      const slot = slots[i];
      if (!slot || digitalStackSignature(slot) !== digitalStackSignature(item)) continue;
      const amount = Math.min(remaining, Math.max(0, maxStack(item.item) - slot.count));
      slots[i] = { ...slot, count: slot.count + amount }; remaining -= amount;
    }
    for (let i = 0; i < slots.length && remaining > 0; i++) if (!slots[i]) {
      const amount = Math.min(remaining, maxStack(item.item)); slots[i] = { ...cloneSlot(item)!, count: amount }; remaining -= amount;
    }
    return remaining === 0;
  };
  if (operation.kind === "deposit-item" || operation.kind === "deposit-creature") {
    const slot = slots[operation.inventorySlot];
    if (!slot) return fail("Select an inventory item to deposit.");
    if (operation.kind === "deposit-item") {
      const result = depositDigitalItem(vault, slot);
      if (!result.accepted) return fail("Vault full or item belongs in the Creature Archive.");
      slots[operation.inventorySlot] = result.remainder;
      return { ok: true, reason: "Items deposited.", vault: result.state, archive, inventory: slots, moved: result.accepted, powerJ: result.accepted * 50 };
    }
    const orb = slot.count === 1 ? captureOrbFromInventorySlot(slot) : null;
    if (!orb?.creature) return fail("Select a filled, recalled Capture Orb.");
    const result = depositCreatureOrb(archive, orb);
    if (!result.accepted) return fail(result.reason);
    slots[operation.inventorySlot] = slot.count > 1 ? { ...slot, count: slot.count - 1 } : null;
    return { ok: true, reason: "Creature archived.", vault, archive: result.state, inventory: slots, moved: 1, powerJ: 500 };
  }
  if (operation.kind === "withdraw-item") {
    const source = vault.stacks.find((slot) => digitalStackSignature(slot) === operation.signature);
    if (!source) return fail("Item no longer present.");
    const count = Math.min(operation.count, source.count, roomFor(source));
    if (!count) return fail("No room for this exact item in your inventory.");
    const result = withdrawDigitalItem(vault, source.item, count, operation.signature);
    if (!result.withdrawn || !insert(result.withdrawn)) return fail("Inventory changed.");
    return { ok: true, reason: "Items withdrawn.", vault: result.state, archive, inventory: slots, moved: count, powerJ: count * 50 };
  }
  const orb = archive.orbs.find((entry) => entry.orbId === operation.orbId);
  if (!orb) return fail("Creature no longer present.");
  const slot = captureOrbInventorySlot(orb);
  if (roomFor(slot) < 1 || !insert(slot)) return fail("Make room for the Capture Orb.");
  const result = withdrawCreatureOrb(archive, operation.orbId);
  if (!result.orb) return fail("Creature unavailable.");
  return { ok: true, reason: "Creature withdrawn.", vault, archive: result.state, inventory: slots, moved: 1, powerJ: 500 };
}
