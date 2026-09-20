import { cloneSlot, Item, ITEMS, maxStack, type InventorySlot, type ItemCode } from "./data";
import { validResourcePacket, type ResourceKind } from "./wayworks-resources";
import type { LocalFace, MachineKind } from "./wayworks";
import { chemistryMachine, pressureMachineKind, pressureMachineMeta, TRANSPORT_KINDS } from "./pressure-catalog";
import { AIRZONE_MAX_ENERGY, airThermalEnergy, totalAirGas, type AirGas } from "./airzone";

export const WORKSHOP_SLOTS = ["input", "reagent", "fuel", "output", "byproduct"] as const;
export type WorkshopSlot = (typeof WORKSHOP_SLOTS)[number];
export const UPGRADE_KINDS = ["speed", "efficiency", "capacity", "filter", "muffling", "seal", "thermal"] as const;
export type UpgradeKind = (typeof UPGRADE_KINDS)[number];
export type MaterialPortMode = "disabled" | "input" | "output" | "both" | "passive" | "pull" | "service";
export type MaterialKind = Exclude<ResourceKind, "energy">;
export type MeasuredStore = { resource: string; amount: number };
export type WorkshopCycle = { recipeId: string; progressMs: number; paidJ: number; durationMs: number; costJ: number };
export type ProcessStoreSlot = "fluidAux" | "chemicalAux" | "chemicalReagent";
/** Additive CF5 extension. These are distinct physical reservoirs, never copies of the primary stores. */
export type WorkshopProcess = {
  schema: 1;
  fluidAux: MeasuredStore | null;
  chemicalAux: MeasuredStore | null;
  chemicalReagent: MeasuredStore | null;
  recipeId: string | null;
  fluidFilter: string | null;
  gasFilter: string | null;
  flowPermille: number;
  backflow: boolean;
  filterUsedMl: number;
  /** Separate mixed-gas recovery vessel; shares the machine's advertised gas capacity. */
  airReserve: (AirGas & { thermalEnergyMilliJ: number }) | null;
  installationId: string | null;
};
export function createWorkshopProcess(): WorkshopProcess {
  return { schema: 1, fluidAux: null, chemicalAux: null, chemicalReagent: null, recipeId: null,
    fluidFilter: null, gasFilter: null, flowPermille: 1000, backflow: false, filterUsedMl: 0, airReserve: null, installationId: null };
}
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
  process?: WorkshopProcess;
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
  if (kind === "grid-cable" || (TRANSPORT_KINDS as readonly string[]).includes(kind)) return [];
  const processing = chemistryMachine(kind) || ["powered-crusher", "enrichment-mill", "electric-smelter", "alloy-infuser", "plate-press", "precision-sawmill"].includes(kind);
  const fueled = kind === "heat-engine" || kind === "biofuel-engine";
  const moving = processing || fueled || ["hand-dynamo", "wind-rotor", "waterwheel-generator", "fluid-pump"].includes(kind);
  return UPGRADE_KINDS.filter(upgrade => upgrade === "capacity" || upgrade === "thermal"
    || ((upgrade === "speed" || upgrade === "efficiency") && processing)
    || (upgrade === "filter" && (processing || fueled))
    || (upgrade === "muffling" && moving) || (upgrade === "seal" && (kind === "gas-tank" || (pressureMachineMeta(kind)?.gas ?? 0) > 0)));
}
export function createWorkshop(kind?: MachineKind): WorkshopState {
  const ports = () => Object.fromEntries(FACES.map((face) => [face, face === "front" ? "output" : face === "back" ? "input" : "service"])) as Record<LocalFace, MaterialPortMode>;
  return { schema: 1, slots: { input: null, reagent: null, fuel: null, output: null, byproduct: null }, fluid: null, chemical: null,
    heatJ: 0, burnJ: 0, burnRemainder: 0, pumpMs: 0, resourceRemainders: { item: 0, fluid: 0, chemical: 0, heat: 0 },
    cycle: null, resourcePorts: { item: ports(), fluid: ports(), chemical: ports(), heat: ports() },
    upgrades: { speed: 0, efficiency: 0, capacity: 0, filter: 0, muffling: 0, seal: 0, thermal: 0 }, filterItem: null,
    autoEject: false, control: "always", signal: false, security: "owner", trusted: [], channel: "",
    ...(kind && pressureMachineKind(kind) ? { process: createWorkshopProcess() } : {}) };
}
const whole = (value: unknown, maximum: number): value is number => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= maximum;
export function workshopFluidCapacity(kind: MachineKind, workshop: WorkshopState): number {
  const base = pressureMachineMeta(kind)?.fluid ?? (kind === "fluid-tank" ? 64_000 : kind === "fluid-pump" ? 8_000 : kind === "enrichment-mill" ? 4_000 : 0);
  return base * (1 + workshop.upgrades.capacity);
}
export function workshopGasCapacity(kind: MachineKind, workshop: WorkshopState): number {
  return (pressureMachineMeta(kind)?.gas ?? (kind === "gas-tank" ? 120_000 : 0)) * (1 + workshop.upgrades.capacity) * (1 + workshop.upgrades.seal);
}
export function workshopStoredTotal(workshop: WorkshopState, kind: "fluid" | "chemical"): number {
  return (workshop[kind]?.amount ?? 0) + (kind === "fluid" ? workshop.process?.fluidAux?.amount ?? 0
    : (workshop.process?.chemicalAux?.amount ?? 0) + (workshop.process?.chemicalReagent?.amount ?? 0)
      + (workshop.process?.airReserve ? totalAirGas(workshop.process.airReserve) * 24 : 0));
}
export function workshopReservoirCapacity(kind: MachineKind, workshop: WorkshopState, slot: "fluid" | "chemical" | ProcessStoreSlot): number {
  const resource = slot === "fluid" || slot === "fluidAux" ? "fluid" : "chemical";
  const capacity = resource === "fluid" ? workshopFluidCapacity(kind, workshop) : workshopGasCapacity(kind, workshop);
  const store = slot === "fluid" || slot === "chemical" ? workshop[slot] : workshop.process?.[slot];
  return Math.max(0, capacity - workshopStoredTotal(workshop, resource) + (store?.amount ?? 0));
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
  const result = createWorkshop(kind);
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
  if (raw.process !== undefined) {
    if (!pressureMachineKind(kind) || !raw.process || typeof raw.process !== "object" || Array.isArray(raw.process) || raw.process.schema !== 1) return null;
    const process = createWorkshopProcess();
    if (raw.process.installationId !== null && (typeof raw.process.installationId !== "string" || !/^p-[1-9][0-9]{0,14}$/.test(raw.process.installationId))) return null;
    process.installationId = raw.process.installationId;
    for (const slot of ["fluidAux", "chemicalAux", "chemicalReagent"] as const) {
      const store = raw.process[slot];
      const resource = slot === "fluidAux" ? "fluid" : "chemical";
      if (store !== null && (!store || !validResourcePacket({ kind: resource, resource: store.resource, quantity: store.amount }))) return null;
      process[slot] = store ? { ...store } : null;
    }
    for (const field of ["recipeId", "fluidFilter", "gasFilter"] as const) {
      const value = raw.process[field];
      if (value !== null && (typeof value !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(value))) return null;
      process[field] = value;
    }
    if (!whole(raw.process.flowPermille, 1000) || typeof raw.process.backflow !== "boolean" || !whole(raw.process.filterUsedMl, 239_999)) return null;
    process.flowPermille = raw.process.flowPermille; process.backflow = raw.process.backflow; process.filterUsedMl = raw.process.filterUsedMl;
    const air = raw.process.airReserve;
    if (air !== null) {
      if (!air || ![air.oxygenMilliMoles, air.inertMilliMoles, air.co2MilliMoles].every(n => whole(n, 1_000_000_000))
        || !whole(air.thermalEnergyMilliJ, AIRZONE_MAX_ENERGY) || (!totalAirGas(air) && air.thermalEnergyMilliJ)
        || air.thermalEnergyMilliJ > airThermalEnergy(totalAirGas(air), 2_000_000)) return null;
      process.airReserve = { oxygenMilliMoles: air.oxygenMilliMoles, inertMilliMoles: air.inertMilliMoles,
        co2MilliMoles: air.co2MilliMoles, thermalEnergyMilliJ: air.thermalEnergyMilliJ };
    }
    result.process = process;
  }
  if (workshopStoredTotal(result, "fluid") > workshopFluidCapacity(kind, result)
    || workshopStoredTotal(result, "chemical") > workshopGasCapacity(kind, result)) return null;
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
