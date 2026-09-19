import { BlockId, cloneSlot, type InventorySlot } from "./data";
import { gearCapacity, lifeSupportStore, validLifeSupportItem, withLifeSupport } from "./life-support";
import { createMachine, normalizeMachine, type MachineKind, type MachineState } from "./wayworks";

export const WAYWORKS_BLOCKS: Readonly<Partial<Record<BlockId, MachineKind>>> = Object.freeze({
  [BlockId.HandDynamo]: "hand-dynamo", [BlockId.SunplateArray]: "sunplate-array",
  [BlockId.FieldBattery]: "field-battery", [BlockId.ChargingPedestal]: "charging-pedestal", [BlockId.GridCable]: "grid-cable",
});
export const machineKindForBlock = (block: number | undefined) => WAYWORKS_BLOCKS[block as BlockId];
export type WorkshopAction = { kind: "crank" } | { kind: "charge" } | { kind: "rotate" } | { kind: "toggle" } |
  { kind: "port"; face: "front" | "back" | "left" | "right" | "top" | "bottom"; mode: "disabled" | "input" | "output" | "both" };

/** Whole-joule transfer preserves the existing item's fractional remainder. */
export function chargeLifeSupportItem(machine: MachineState, slot: InventorySlot | null, expectedRevision: number) {
  const fail = (reason: string) => ({ ok: false as const, reason, machine, slot, transferredJ: 0 });
  if (machine.revision !== expectedRevision) return fail("Machine changed; inspect it again.");
  if (machine.kind !== "charging-pedestal" || !machine.enabled) return fail("Use an enabled Charging Pedestal.");
  if (!slot || slot.count !== 1 || !validLifeSupportItem(slot) || gearCapacity(slot.item).energyJ <= 0) return fail("Select one compatible EVA cell or rig in the hotbar.");
  const store = lifeSupportStore(slot);
  const transferredJ = Math.min(2000, machine.energyJ, Math.floor(gearCapacity(slot.item).energyJ - store.energyJ));
  if (transferredJ <= 0) return fail(machine.energyJ <= 0 ? "No stored power. Connect a generator or battery." : "Cell is full (less than one joule free).");
  return { ok: true as const, reason: `Transferred ${transferredJ} J.`, transferredJ,
    machine: { ...machine, energyJ: machine.energyJ - transferredJ, revision: machine.revision + 1 },
    slot: withLifeSupport(cloneSlot(slot)!, { ...store, energyJ: store.energyJ + transferredJ }) };
}

export function restoreWorkshop(value: unknown, locationId: string, ownerId: string, blockAt: (x: number, y: number, z: number) => number | undefined) {
  const result = new Map<string, MachineState>();
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [key, raw] of Object.entries(value).slice(0, 4096)) {
    const coords = key.split(",").map(Number);
    if (coords.length !== 3 || !coords.every(Number.isSafeInteger)) continue;
    const block = blockAt(coords[0], coords[1], coords[2]);
    const savedKind = raw && typeof raw === "object" ? (raw as MachineState).kind : undefined;
    const kind = block === undefined && savedKind && Object.values(WAYWORKS_BLOCKS).includes(savedKind) ? savedKind : machineKindForBlock(block);
    if (!kind) continue;
    result.set(key, normalizeMachine(raw, kind, locationId, ownerId));
  }
  return result;
}

export function placedWorkshopMachine(kind: MachineKind, slot: InventorySlot, locationId: string, ownerId: string, facing: number) {
  const saved = slot.metadata?.wayworks;
  const state = saved && typeof saved === "object" && (saved as MachineState).kind === kind
    ? normalizeMachine({ ...saved, locationId, ownerId }, kind, locationId, ownerId)
    : createMachine(kind, locationId, ownerId, facing);
  return { ...state, facing, revision: state.revision + 1 };
}
