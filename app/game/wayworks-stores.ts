import { cloneSlot, Item, ITEMS, maxStack, type InventorySlot, type ItemCode } from "./data";
import { validResourcePacket, type ResourceKind } from "./wayworks-resources";
import type { LocalFace, MachineKind } from "./wayworks";

export const WORKSHOP_SLOTS = ["input", "reagent", "fuel", "output", "byproduct"] as const;
export type WorkshopSlot = (typeof WORKSHOP_SLOTS)[number];
export const UPGRADE_KINDS = ["speed", "efficiency", "capacity", "filter", "muffling", "seal", "thermal"] as const;
export type UpgradeKind = (typeof UPGRADE_KINDS)[number];
export type MaterialPortMode = "disabled" | "input" | "output" | "both" | "passive" | "pull" | "service";
export type MaterialKind = Exclude<ResourceKind, "energy">;
export type MeasuredStore = { resource: string; amount: number };
export type WorkshopCycle = { recipeId: string; progressMs: number; paidJ: number; durationMs: number; costJ: number };
export type WorkshopState = {
  schema: 1;
  slots: Record<WorkshopSlot, InventorySlot | null>;
  fluid: MeasuredStore | null;
  chemical: MeasuredStore | null;
  heatJ: number;
  /** Unconverted chemical energy from one consumed fuel item. */
  burnJ: number;
  burnRemainder: number;
  pumpMs: number;
  resourceRemainders: Record<MaterialKind, number>;
  cycle: WorkshopCycle | null;
  resourcePorts: Record<MaterialKind, Record<LocalFace, MaterialPortMode>>;
  upgrades: Record<UpgradeKind, number>;
  filterItem: ItemCode | null;
  autoEject: boolean;
  control: "always" | "signal-on" | "signal-off";
  signal: boolean;
  security: "owner" | "public";
  trusted: string[];
  channel: string;
};
const FACES: readonly LocalFace[] = ["front", "back", "left", "right", "top", "bottom"];
export const MATERIAL_KINDS: readonly MaterialKind[] = ["item", "fluid", "chemical", "heat"];
export const MATERIAL_PORT_MODES: readonly MaterialPortMode[] = ["disabled", "input", "output", "both", "passive", "pull", "service"];
export const UPGRADE_ITEMS: Readonly<Record<UpgradeKind, ItemCode>> = {
  speed: Item.SpeedModule, efficiency: Item.EfficiencyModule, capacity: Item.CapacityModule,
  filter: Item.FilterModule, muffling: Item.MufflingModule, seal: Item.SealModule, thermal: Item.ThermalModule,
};
/** Only advertise sockets with an implemented effect on this machine. */
export function supportedWorkshopUpgrades(kind: MachineKind): readonly UpgradeKind[] {
  if (kind === "grid-cable") return [];
  const processing = ["powered-crusher", "enrichment-mill", "electric-smelter", "alloy-infuser", "plate-press", "precision-sawmill"].includes(kind);
  const fueled = kind === "heat-engine" || kind === "biofuel-engine";
  const moving = processing || fueled || ["hand-dynamo", "wind-rotor", "waterwheel-generator", "fluid-pump"].includes(kind);
  return UPGRADE_KINDS.filter(upgrade => upgrade === "capacity" || upgrade === "thermal"
    || ((upgrade === "speed" || upgrade === "efficiency") && processing)
    || (upgrade === "filter" && (processing || fueled))
    || (upgrade === "muffling" && moving) || (upgrade === "seal" && kind === "gas-tank"));
}
export function createWorkshop(): WorkshopState {
  const ports = () => Object.fromEntries(FACES.map((face) => [face, face === "front" ? "output" : face === "back" ? "input" : "service"])) as Record<LocalFace, MaterialPortMode>;
  return { schema: 1, slots: { input: null, reagent: null, fuel: null, output: null, byproduct: null }, fluid: null, chemical: null,
    heatJ: 0, burnJ: 0, burnRemainder: 0, pumpMs: 0, resourceRemainders: { item: 0, fluid: 0, chemical: 0, heat: 0 },
    cycle: null, resourcePorts: { item: ports(), fluid: ports(), chemical: ports(), heat: ports() },
    upgrades: { speed: 0, efficiency: 0, capacity: 0, filter: 0, muffling: 0, seal: 0, thermal: 0 }, filterItem: null,
    autoEject: false, control: "always", signal: false, security: "owner", trusted: [], channel: "" };
}
const whole = (value: unknown, maximum: number): value is number => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= maximum;
export function workshopFluidCapacity(kind: MachineKind, workshop: WorkshopState): number {
  const base = kind === "fluid-tank" ? 64_000 : kind === "fluid-pump" ? 8_000 : kind === "enrichment-mill" ? 4_000 : 0;
  return base * (1 + workshop.upgrades.capacity);
}
export function workshopGasCapacity(kind: MachineKind, workshop: WorkshopState): number {
  return kind === "gas-tank" ? 120_000 * (1 + workshop.upgrades.capacity) * (1 + workshop.upgrades.seal) : 0;
}
export const workshopHeatCapacity = (workshop: WorkshopState) => 100_000 * (1 + workshop.upgrades.thermal);
export function validWorkshopItem(slot: unknown): slot is InventorySlot {
  if (!slot || typeof slot !== "object") return false;
  const value = slot as InventorySlot;
  return !!ITEMS[value.item] && value.count <= maxStack(value.item)
    && validResourcePacket({ kind: "item", quantity: value.count, slot: value });
}
/** Absent extension is the one supported migration. Invalid present extensions do not mint contents. */
export function normalizeWorkshop(value: unknown, kind: MachineKind): WorkshopState | null {
  const result = createWorkshop();
  if (value === undefined) return result;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Partial<WorkshopState>;
  if (raw.schema !== 1 || !raw.slots || !raw.upgrades || !raw.resourcePorts) return null;
  for (const upgrade of UPGRADE_KINDS) {
    if (!whole(raw.upgrades[upgrade], 4)) return null;
    result.upgrades[upgrade] = raw.upgrades[upgrade];
  }
  for (const slot of WORKSHOP_SLOTS) {
    const item = raw.slots[slot];
    if (item !== null && !validWorkshopItem(item)) return null;
    result.slots[slot] = cloneSlot(item);
  }
  for (const resource of MATERIAL_KINDS) for (const face of FACES) {
    const mode = raw.resourcePorts[resource]?.[face];
    if (!MATERIAL_PORT_MODES.includes(mode)) return null;
    result.resourcePorts[resource][face] = mode;
  }
  for (const resource of MATERIAL_KINDS) {
    if (!raw.resourceRemainders || !whole(raw.resourceRemainders[resource], 999)) return null;
    result.resourceRemainders[resource] = raw.resourceRemainders[resource];
  }
  for (const resource of ["fluid", "chemical"] as const) {
    const store = raw[resource];
    const capacity = resource === "fluid" ? workshopFluidCapacity(kind, result) : workshopGasCapacity(kind, result);
    if (store !== null && (!store || !validResourcePacket({ kind: resource, resource: store.resource, quantity: store.amount }) || store.amount > capacity)) return null;
    result[resource] = store ? { ...store } : null;
  }
  if (!whole(raw.heatJ, workshopHeatCapacity(result)) || !whole(raw.burnJ, 100_000)
    || (raw.burnJ > 0 && kind !== "heat-engine" && kind !== "biofuel-engine")) return null;
  result.heatJ = raw.heatJ; result.burnJ = raw.burnJ;
  if (!whole(raw.burnRemainder, 999) || !whole(raw.pumpMs, 999)) return null;
  result.burnRemainder = raw.burnRemainder; result.pumpMs = raw.pumpMs;
  const cycle = raw.cycle;
  if (cycle !== null) {
    if (!cycle || typeof cycle.recipeId !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(cycle.recipeId)
      || !whole(cycle.durationMs, 600_000) || cycle.durationMs === 0 || !whole(cycle.costJ, 100_000_000) || cycle.costJ === 0
      || !whole(cycle.progressMs, cycle.durationMs) || !whole(cycle.paidJ, cycle.costJ)
      || cycle.paidJ !== Math.ceil(cycle.costJ * cycle.progressMs / cycle.durationMs)) return null;
    result.cycle = { ...cycle };
  }
  if (raw.filterItem !== null && (!Number.isSafeInteger(raw.filterItem) || !ITEMS[raw.filterItem!])) return null;
  if (typeof raw.autoEject !== "boolean" || typeof raw.signal !== "boolean" || !["always", "signal-on", "signal-off"].includes(raw.control!)
    || !["owner", "public"].includes(raw.security!) || !Array.isArray(raw.trusted) || raw.trusted.length > 16
    || !raw.trusted.every((id) => typeof id === "string" && id.length > 0 && id.length <= 128)
    || typeof raw.channel !== "string" || !/^[a-z0-9-]{0,24}$/.test(raw.channel)) return null;
  result.filterItem = raw.filterItem!; result.autoEject = raw.autoEject; result.signal = raw.signal;
  result.control = raw.control!; result.security = raw.security!; result.trusted = [...new Set(raw.trusted)]; result.channel = raw.channel;
  return result;
}

export function workshopRunning(workshop: WorkshopState): boolean {
  return workshop.control === "always" || (workshop.control === "signal-on" ? workshop.signal : !workshop.signal);
}
export function workshopAuthorized(workshop: WorkshopState, owner: string, actor: string): boolean {
  return actor === owner || workshop.security === "public" || workshop.trusted.includes(actor);
}
