import { BlockId, cloneSlot, Item, maxStack, type InventorySlot } from "./data";
import { gearCapacity, lifeSupportStore, validLifeSupportItem, withLifeSupport } from "./life-support";
import { configureMachine, createMachine, MACHINE_FACES, machineCapacity, normalizeMachine, type LocalFace, type MachineKind, type MachineState, type PortMode } from "./wayworks";
import { transferMachineItem, transferPortableResource } from "./wayworks-machines";
import { machineEndpoint, withMachineEndpoint } from "./wayworks-machines";
import { transferResource, type ResourceEndpoint } from "./wayworks-resources";
import { MATERIAL_KINDS, MATERIAL_PORT_MODES, UPGRADE_ITEMS, UPGRADE_KINDS, supportedWorkshopUpgrades, validWorkshopItem, workshopFluidCapacity, workshopGasCapacity, workshopHeatCapacity, workshopRunning,
  type MaterialKind, type MaterialPortMode, type UpgradeKind, type WorkshopSlot, type WorkshopState } from "./wayworks-stores";

export const WAYWORKS_BLOCKS: Readonly<Partial<Record<BlockId, MachineKind>>> = Object.freeze({
  [BlockId.HandDynamo]: "hand-dynamo", [BlockId.SunplateArray]: "sunplate-array",
  [BlockId.FieldBattery]: "field-battery", [BlockId.ChargingPedestal]: "charging-pedestal", [BlockId.GridCable]: "grid-cable",
  [BlockId.HeatEngine]: "heat-engine", [BlockId.WindRotor]: "wind-rotor", [BlockId.WaterwheelGenerator]: "waterwheel-generator",
  [BlockId.BiofuelEngine]: "biofuel-engine", [BlockId.GridBattery]: "grid-battery", [BlockId.ShipBatteryBank]: "ship-battery-bank",
  [BlockId.PoweredCrusher]: "powered-crusher", [BlockId.EnrichmentMill]: "enrichment-mill", [BlockId.ElectricSmelter]: "electric-smelter",
  [BlockId.AlloyInfuser]: "alloy-infuser", [BlockId.PlatePress]: "plate-press", [BlockId.PrecisionSawmill]: "precision-sawmill",
  [BlockId.FluidPump]: "fluid-pump", [BlockId.FluidTank]: "fluid-tank", [BlockId.GasTank]: "gas-tank",
});
export const machineKindForBlock = (block: number | undefined) => WAYWORKS_BLOCKS[block as BlockId];
export type WorkshopAction = { kind: "crank" } | { kind: "charge"; target?: "held" | "back" | "offhand" } | { kind: "rotate" } | { kind: "toggle" } |
  { kind: "port"; face: LocalFace; mode: PortMode }
  | { kind: "slot"; slot: WorkshopSlot; direction: "insert" | "extract"; maximum: number }
  | { kind: "portable"; direction: "fill" | "empty" }
  | { kind: "oxygen"; direction: "fill" | "empty" }
  | { kind: "material-port"; resource: MaterialKind; face: LocalFace; mode: MaterialPortMode }
  | { kind: "control"; mode: WorkshopState["control"] }
  | { kind: "signal"; enabled: boolean } | { kind: "eject"; enabled: boolean }
  | { kind: "security"; mode: WorkshopState["security"] }
  | { kind: "trust"; actor: string; enabled: boolean }
  | { kind: "channel"; channel: string }
  | { kind: "filter-held" } | { kind: "clear-filter" }
  | { kind: "upgrade-install" } | { kind: "upgrade-remove"; upgrade: UpgradeKind }
  | { kind: "cancel-cycle" } | { kind: "vent"; confirmed: true }
  | { kind: "copy" } | { kind: "paste" };
export type WorkshopClipboard = Pick<MachineState, "kind" | "ports"> & { resourcePorts: WorkshopState["resourcePorts"]; channel: string; control: WorkshopState["control"]; autoEject: boolean };

/** Exact semantic intent only: never accept a machine after-image from a UI or peer. */
export function parseWorkshopAction(value: unknown): WorkshopAction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const action = value as Record<string, unknown>;
  const exact = (...keys: string[]) => Object.keys(action).every((key) => ["kind", ...keys].includes(key));
  switch (action.kind) {
    case "charge": return exact("target") && (action.target === undefined || ["held", "back", "offhand"].includes(action.target as string)) ? action as WorkshopAction : null;
    case "crank": case "rotate": case "toggle": case "filter-held": case "clear-filter":
    case "upgrade-install": case "cancel-cycle": case "copy": case "paste": return exact() ? action as WorkshopAction : null;
    case "port": return exact("face", "mode") && MACHINE_FACES.includes(action.face as LocalFace) && MATERIAL_PORT_MODES.includes(action.mode as MaterialPortMode) ? action as WorkshopAction : null;
    case "slot": return exact("slot", "direction", "maximum") && ["input", "reagent", "fuel", "output", "byproduct"].includes(action.slot as string)
      && ["insert", "extract"].includes(action.direction as string) && Number.isSafeInteger(action.maximum) && (action.maximum as number) > 0 && (action.maximum as number) <= 64 ? action as WorkshopAction : null;
    case "portable": case "oxygen": return exact("direction") && ["fill", "empty"].includes(action.direction as string) ? action as WorkshopAction : null;
    case "material-port": return exact("resource", "face", "mode") && MATERIAL_KINDS.includes(action.resource as MaterialKind) && MACHINE_FACES.includes(action.face as LocalFace)
      && MATERIAL_PORT_MODES.includes(action.mode as MaterialPortMode) ? action as WorkshopAction : null;
    case "control": return exact("mode") && ["always", "signal-on", "signal-off"].includes(action.mode as string) ? action as WorkshopAction : null;
    case "security": return exact("mode") && ["owner", "public"].includes(action.mode as string) ? action as WorkshopAction : null;
    case "trust": return exact("actor", "enabled") && typeof action.actor === "string" && /^[A-Za-z0-9_.:-]{1,128}$/.test(action.actor) && typeof action.enabled === "boolean" ? action as WorkshopAction : null;
    case "signal": case "eject": return exact("enabled") && typeof action.enabled === "boolean" ? action as WorkshopAction : null;
    case "channel": return exact("channel") && typeof action.channel === "string" && /^[a-z0-9-]{0,24}$/.test(action.channel) ? action as WorkshopAction : null;
    case "upgrade-remove": return exact("upgrade") && UPGRADE_KINDS.includes(action.upgrade as UpgradeKind) ? action as WorkshopAction : null;
    case "vent": return exact("confirmed") && action.confirmed === true ? action as WorkshopAction : null;
    default: return null;
  }
}
export function workshopActionNeedsWrench(action: WorkshopAction): boolean {
  return ["rotate", "port", "material-port", "control", "signal", "security", "trust", "channel", "eject", "copy", "paste", "clear-filter"].includes(action.kind);
}

export function applyWorkshopAction(state: MachineState, key: string, held: InventorySlot | null, expectedRevision: number,
  rawAction: WorkshopAction, clipboard: WorkshopClipboard | null = null) {
  const fail = (reason: string) => ({ ok: false, reason, machine: state, held, clipboard });
  const action = parseWorkshopAction(rawAction);
  if (!action) return fail("invalid-operation");
  if (held && !validWorkshopItem(held)) return fail("invalid-item");
  if (expectedRevision !== state.revision || state.revision >= Number.MAX_SAFE_INTEGER) return fail("stale-revision");
  if (workshopActionNeedsWrench(action) && held?.item !== Item.FieldWrench) return fail("Select the Field Wrench to configure this machine.");
  if (["crank", "rotate", "toggle", "port"].includes(action.kind)) {
    const result = configureMachine(state, expectedRevision, action as Parameters<typeof configureMachine>[2]);
    return { ok: result.ok, reason: result.reason, machine: result.state, held, clipboard };
  }
  if (action.kind === "charge") {
    const result = chargeLifeSupportItem(state, held, expectedRevision);
    return { ok: result.ok, reason: result.reason, machine: result.machine, held: result.slot, clipboard };
  }
  if (action.kind === "slot") return { ...transferMachineItem(state, key, action.slot, held, action.direction, expectedRevision, action.maximum), clipboard };
  if (action.kind === "portable") return { ...transferPortableResource(state, key, held, action.direction, expectedRevision), clipboard };
  if (action.kind === "oxygen") {
    if (!held || held.count !== 1 || !validLifeSupportItem(held) || gearCapacity(held.item).oxygenMl <= 0) return fail("Select one compatible O2 tank or sealed reserve.");
    const store = lifeSupportStore(held);
    const item: ResourceEndpoint = { endpointId: "player/oxygen", locationId: state.locationId, revision: state.revision,
      kind: "chemical", capacity: gearCapacity(held.item).oxygenMl,
      content: store.oxygenMl > 0 ? { kind: "chemical", resource: "oxygen", quantity: store.oxygenMl } : null };
    const tank = machineEndpoint(state, key, "chemical");
    const result = action.direction === "fill" ? transferResource(tank, item, 1000) : transferResource(item, tank, 1000);
    if (!result.ok) return fail(result.reason);
    const itemAfter = action.direction === "fill" ? result.destination : result.source;
    return { ok: true, reason: `Transferred ${result.moved!.quantity} mL O2.`, clipboard,
      machine: withMachineEndpoint(state, "chemical", action.direction === "fill" ? result.source : result.destination),
      held: withLifeSupport(cloneSlot(held)!, { ...store, oxygenMl: itemAfter.content?.quantity ?? 0 }) };
  }
  const workshop: WorkshopState = { ...state.workshop, slots: { ...state.workshop.slots }, upgrades: { ...state.workshop.upgrades },
    resourcePorts: structuredClone(state.workshop.resourcePorts) };
  let selected = cloneSlot(held);
  let ports = { ...state.ports };
  switch (action.kind) {
    case "material-port": workshop.resourcePorts[action.resource][action.face] = action.mode; break;
    case "control": workshop.control = action.mode; break;
    case "signal": workshop.signal = action.enabled; break;
    case "eject": workshop.autoEject = action.enabled; break;
    case "security": workshop.security = action.mode; break;
    case "channel": workshop.channel = action.channel; break;
    case "trust":
      if (action.enabled && !workshop.trusted.includes(action.actor) && workshop.trusted.length >= 16) return fail("Maximum sixteen trusted operators.");
      workshop.trusted = action.enabled ? [...new Set([...workshop.trusted, action.actor])] : workshop.trusted.filter(id => id !== action.actor); break;
    case "filter-held":
      if (!held || workshop.upgrades.filter === 0) return fail("Install a Filter Module, then select an item to filter.");
      workshop.filterItem = held.item; break;
    case "clear-filter": workshop.filterItem = null; break;
    case "cancel-cycle":
      if (!workshop.cycle) return fail("No cycle to cancel.");
      workshop.cycle = null; break; // Paid electricity is not refunded; original ingredients remain.
    case "upgrade-install": {
      if (workshop.cycle) return fail("Finish or cancel the current cycle before changing upgrades.");
      const upgrade = UPGRADE_KINDS.find((kind) => UPGRADE_ITEMS[kind] === held?.item);
      if (!upgrade || !held || held.metadata || held.durability !== undefined || workshop.upgrades[upgrade] >= 4
        || !supportedWorkshopUpgrades(state.kind).includes(upgrade)) return fail("Select a supported module; maximum four per type.");
      workshop.upgrades[upgrade] += 1;
      selected = held.count > 1 ? { ...held, count: held.count - 1 } : null;
      break;
    }
    case "upgrade-remove": {
      if (workshop.cycle || workshop.upgrades[action.upgrade] <= 0) return fail("No removable module (or cycle is active).");
      const item = UPGRADE_ITEMS[action.upgrade];
      if (held && (held.item !== item || held.metadata || held.durability !== undefined || held.count >= maxStack(item))) return fail("Select an empty slot or matching module stack.");
      workshop.upgrades[action.upgrade] -= 1;
      if (state.energyJ > machineCapacity(state.kind, workshop) || (workshop.fluid?.amount ?? 0) > workshopFluidCapacity(state.kind, workshop)
        || (workshop.chemical?.amount ?? 0) > workshopGasCapacity(state.kind, workshop) || workshop.heatJ > workshopHeatCapacity(workshop)) return fail("Drain the extra capacity before removing this module.");
      selected = { item, count: (held?.count ?? 0) + 1 }; break;
    }
    case "vent":
      if (!workshop.chemical) return fail("Gas store is empty.");
      workshop.chemical = null; break;
    case "copy": return { ok: true, reason: "Copied compatible face and control settings.", machine: state, held, clipboard: {
      kind: state.kind, ports: { ...state.ports }, resourcePorts: structuredClone(workshop.resourcePorts), channel: workshop.channel, control: workshop.control, autoEject: workshop.autoEject } };
    case "paste":
      if (!clipboard || clipboard.kind !== state.kind) return fail("Copy settings from the same machine type first.");
      ports = { ...clipboard.ports }; workshop.resourcePorts = structuredClone(clipboard.resourcePorts);
      workshop.channel = clipboard.channel; workshop.control = clipboard.control; workshop.autoEject = clipboard.autoEject; break;
  }
  return { ok: true, reason: action.kind === "vent" ? "Gas safely vented; contents are not recoverable." : action.kind === "cancel-cycle" ? "Cycle cancelled. Ingredients retained; spent power not refunded." : "ok",
    machine: { ...state, ports, workshop, revision: state.revision + 1 }, held: selected, clipboard };
}

/** Whole-joule transfer preserves the existing item's fractional remainder. */
export function chargeLifeSupportItem(machine: MachineState, slot: InventorySlot | null, expectedRevision: number) {
  const fail = (reason: string) => ({ ok: false as const, reason, machine, slot, transferredJ: 0 });
  if (machine.revision !== expectedRevision) return fail("Machine changed; inspect it again.");
  if (machine.kind !== "charging-pedestal" || !machine.enabled) return fail("Use an enabled Charging Pedestal.");
  if (!workshopRunning(machine.workshop)) return fail("Pedestal is stopped by its control signal.");
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
    const savedOwner = raw && typeof raw === "object" ? (raw as MachineState).ownerId : undefined;
    result.set(key, normalizeMachine(raw, kind, locationId, typeof savedOwner === "string" && savedOwner.length > 0 && savedOwner.length <= 128 ? savedOwner : ownerId));
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
