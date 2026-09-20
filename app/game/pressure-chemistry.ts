import { cloneSlot, Item, maxStack, type InventorySlot, type ItemCode } from "./data";
import { machineCapacity, type MachineKind, type MachineState, type MachineStatus } from "./wayworks";
import { workshopFluidCapacity, workshopGasCapacity, workshopHeatCapacity, workshopStoredTotal,
  type MeasuredStore, type ProcessStoreSlot, type WorkshopSlot, type WorkshopState } from "./wayworks-stores";

export type ChemicalReservoir = "fluid" | "chemical" | ProcessStoreSlot;
export type ChemicalQuantity = Readonly<{ slot: ChemicalReservoir; resource: string; amount: number }>;
type ChemicalItem = Readonly<{ slot: WorkshopSlot; item: ItemCode; count: number }>;
export type ChemistryRecipe = Readonly<{
  id: string; name: string; machine: MachineKind; durationMs: number; energyJ: number;
  inputs: readonly ChemicalQuantity[]; outputs: readonly ChemicalQuantity[];
  itemsIn?: readonly ChemicalItem[]; itemsOut?: readonly ChemicalItem[];
  harvest?: "water" | "oxygen" | "inert" | "methane" | "carbon-dioxide";
  generatedJ?: number; wasteHeatJ?: number; filterMl?: number;
}>;
/** Gas is standard-volume mL (24 mL = 1 mmol); liquid is mL. Batch equations are explicit. */
export const CHEMISTRY_RECIPES: readonly ChemistryRecipe[] = [
  { id: "condense-water", name: "Condense atmospheric moisture", machine: "atmospheric-condenser", durationMs: 2000, energyJ: 4000,
    inputs: [], outputs: [{ slot: "fluid", resource: "water", amount: 100 }], harvest: "water" },
  ...(["oxygen", "inert", "methane", "carbon-dioxide"] as const).map(resource => ({
    id: `harvest-${resource}`, name: `Separate atmospheric ${resource}`, machine: "atmospheric-condenser" as const,
    durationMs: 1000, energyJ: 2400, inputs: [], outputs: [{ slot: "chemical" as const, resource, amount: 2400 }], harvest: resource,
  })),
  { id: "electrolyze-water", name: "Water → oxygen + hydrogen", machine: "electrolyzer", durationMs: 1000, energyJ: 12000,
    inputs: [{ slot: "fluid", resource: "water", amount: 18 }],
    outputs: [{ slot: "chemical", resource: "oxygen", amount: 12000 }, { slot: "chemicalAux", resource: "hydrogen", amount: 24000 }] },
  ...(["oxygen", "inert", "hydrogen", "methane", "carbon-dioxide"] as const).map(resource => ({
    id: `compress-${resource}`, name: `Compress ${resource}`, machine: "gas-compressor" as const, durationMs: 1000, energyJ: 1200,
    inputs: [{ slot: "chemical" as const, resource, amount: 24000 }], outputs: [{ slot: "chemicalAux" as const, resource, amount: 24000 }],
  })),
  { id: "refine-biofuel", name: "Refine liquid biofuel", machine: "fluid-refinery", durationMs: 3000, energyJ: 6000,
    itemsIn: [{ slot: "input", item: Item.BiofuelPellet, count: 4 }], inputs: [{ slot: "fluid", resource: "water", amount: 1000 }],
    outputs: [{ slot: "fluidAux", resource: "liquid-fuel", amount: 1000 }], itemsOut: [{ slot: "byproduct", item: Item.CarbonPowder, count: 1 }] },
  { id: "mix-coolant", name: "Mix closed-loop coolant", machine: "chemical-mixer", durationMs: 2000, energyJ: 3000,
    itemsIn: [{ slot: "input", item: Item.StoneDust, count: 1 }], inputs: [{ slot: "fluid", resource: "water", amount: 1000 }],
    outputs: [{ slot: "fluidAux", resource: "coolant", amount: 1000 }] },
  { id: "sabatier-methane", name: "CO₂ + hydrogen → methane + water", machine: "reaction-chamber", durationMs: 3000, energyJ: 8000,
    inputs: [{ slot: "chemical", resource: "carbon-dioxide", amount: 24000 }, { slot: "chemicalReagent", resource: "hydrogen", amount: 96000 }],
    outputs: [{ slot: "chemicalAux", resource: "methane", amount: 24000 }, { slot: "fluidAux", resource: "water", amount: 36 }] },
  { id: "form-pressure-polymer", name: "Form pressure polymer", machine: "reaction-chamber", durationMs: 4000, energyJ: 10000,
    itemsIn: [{ slot: "input", item: Item.CarbonPowder, count: 2 }], inputs: [{ slot: "chemical", resource: "methane", amount: 4800 }],
    outputs: [], itemsOut: [{ slot: "output", item: Item.PressurePolymer, count: 2 }] },
  { id: "capture-carbon-dioxide", name: "Capture CO₂ in a finite filter", machine: "carbon-scrubber", durationMs: 1000, energyJ: 1600,
    inputs: [{ slot: "chemical", resource: "carbon-dioxide", amount: 24000 }], outputs: [], filterMl: 24000,
    itemsOut: [{ slot: "output", item: Item.CarbonPowder, count: 1 }] },
  { id: "burn-hydrogen", name: "Hydrogen + oxygen → power + water", machine: "hydrogen-turbine", durationMs: 1000, energyJ: 1,
    inputs: [{ slot: "chemical", resource: "hydrogen", amount: 24000 }, { slot: "chemicalReagent", resource: "oxygen", amount: 12000 }],
    outputs: [{ slot: "fluidAux", resource: "water", amount: 18 }], generatedJ: 6000, wasteHeatJ: 6000 },
  { id: "reform-methane", name: "Methane + steam → hydrogen + CO₂", machine: "methane-reformer", durationMs: 2000, energyJ: 16000,
    inputs: [{ slot: "chemical", resource: "methane", amount: 12000 }, { slot: "fluid", resource: "water", amount: 18 }],
    outputs: [{ slot: "chemicalAux", resource: "hydrogen", amount: 48000 }, { slot: "chemicalReagent", resource: "carbon-dioxide", amount: 12000 }] },
  { id: "burn-methane", name: "Methane + oxygen → power + exhaust", machine: "gas-engine", durationMs: 1000, energyJ: 1,
    inputs: [{ slot: "chemical", resource: "methane", amount: 24000 }, { slot: "chemicalReagent", resource: "oxygen", amount: 48000 }],
    outputs: [{ slot: "chemicalAux", resource: "carbon-dioxide", amount: 24000 }, { slot: "fluidAux", resource: "water", amount: 36 }], generatedJ: 12000, wasteHeatJ: 12000 },
];
export const chemistryRecipes = (kind: MachineKind) => CHEMISTRY_RECIPES.filter(recipe => recipe.machine === kind);
export const chemistryRecipe = (id: string) => CHEMISTRY_RECIPES.find(recipe => recipe.id === id);
export function chemistryCost(recipe: ChemistryRecipe, workshop: WorkshopState) {
  // Generators have fixed conversion efficiency; upgrades cannot amplify their fuel yield.
  if (recipe.generatedJ) return { durationMs: recipe.durationMs, costJ: recipe.energyJ };
  const speed = 1 + workshop.upgrades.speed * 0.35;
  const efficiency = 1 + workshop.upgrades.efficiency * 0.2;
  return { durationMs: Math.ceil(recipe.durationMs * efficiency / speed), costJ: Math.ceil(recipe.energyJ * speed * speed / efficiency) };
}
export function chemistrySlots(kind: MachineKind): WorkshopSlot[] {
  const result = new Set<WorkshopSlot>();
  for (const recipe of chemistryRecipes(kind)) {
    for (const item of [...recipe.itemsIn ?? [], ...recipe.itemsOut ?? []]) result.add(item.slot);
    if (recipe.filterMl) { result.add("reagent"); result.add("byproduct"); }
  }
  return [...result];
}
export function chemistryAcceptsItem(kind: MachineKind, slot: WorkshopSlot, item: ItemCode): boolean {
  return chemistryRecipes(kind).some(recipe => recipe.itemsIn?.some(input => input.slot === slot && input.item === item)
    || (recipe.filterMl && slot === "reagent" && item === Item.HabitatFilter));
}
export const chemicalStore = (workshop: WorkshopState, slot: ChemicalReservoir): MeasuredStore | null =>
  slot === "fluid" || slot === "chemical" ? workshop[slot] : workshop.process?.[slot] ?? null;
export function setChemicalStore(workshop: WorkshopState, slot: ChemicalReservoir, value: MeasuredStore | null) {
  if (slot === "fluid" || slot === "chemical") workshop[slot] = value;
  else if (workshop.process) workshop.process[slot] = value;
}
export function chemistryReservoirs(kind: MachineKind, direction: "input" | "output", resource: "fluid" | "chemical", name?: string): ChemicalReservoir[] {
  const slots = new Set<ChemicalReservoir>();
  for (const recipe of chemistryRecipes(kind)) for (const entry of direction === "input" ? recipe.inputs : recipe.outputs) {
    if ((entry.slot === "fluid" || entry.slot === "fluidAux" ? "fluid" : "chemical") === resource && (!name || entry.resource === name)) slots.add(entry.slot);
  }
  // Service/storage hardware has no recipe: its sole primary store is both an endpoint and custody buffer.
  if (!chemistryRecipes(kind).length) {
    if (resource === "chemical" && ["life-support-controller", "atmosphere-vent", "recovery-pump"].includes(kind)) {
      if (!name || name === "oxygen") slots.add("chemical");
      if (!name || name === "inert") slots.add("chemicalAux");
      if (!name || name === "carbon-dioxide") slots.add("chemicalReagent");
    } else slots.add(resource);
  }
  return [...slots];
}
const plain = (slot: InventorySlot | null) => !!slot && slot.durability === undefined && (!slot.metadata || !Object.keys(slot.metadata).length);
const itemAvailable = (workshop: WorkshopState, input: ChemicalItem) => {
  const slot = workshop.slots[input.slot];
  return plain(slot) && slot!.item === input.item && slot!.count >= input.count;
};
function outputFits(workshop: WorkshopState, item: ChemicalItem) {
  const slot = workshop.slots[item.slot];
  return !slot ? item.count <= maxStack(item.item) : plain(slot) && slot.item === item.item && slot.count + item.count <= maxStack(item.item);
}
export type ChemistryEnvironment = {
  /** True only for a host-observed exterior intake, never merely because the planet has air. */
  atmosphere?: { exposed: boolean; pressureKPa: number; fractions: Partial<Record<NonNullable<ChemistryRecipe["harvest"]>, number>> };
};
/** Authored harvest traces refine the catalog's non-breathing fraction; they do
 * not mutate its saved atmosphere or pretend that inert air is all nitrogen. */
export function chemistryAtmosphere(bodyId: string, environment: { pressureKPa: number; oxygenFraction: number; inertFraction: number; co2Fraction: number; liquidMedium: string }, exposed: boolean): NonNullable<ChemistryEnvironment["atmosphere"]> {
  const methane = Math.min(environment.inertFraction, bodyId === "orison" ? .04 : bodyId === "orison/rimehold" ? .03 : 0);
  const water = Math.min(environment.inertFraction - methane, environment.liquidMedium === "water" && environment.pressureKPa > 20 ? .01 : 0);
  return { exposed, pressureKPa: environment.pressureKPa, fractions: { oxygen: environment.oxygenFraction,
    inert: environment.inertFraction - methane - water, "carbon-dioxide": environment.co2Fraction, water, methane } };
}
export function chemistryInputReason(workshop: WorkshopState, recipe: ChemistryRecipe, environment: ChemistryEnvironment): MachineStatus | null {
  if (recipe.harvest) {
    const ambient = environment.atmosphere;
    const fraction = ambient?.fractions[recipe.harvest] ?? 0;
    if (!ambient?.exposed || !Number.isFinite(ambient.pressureKPa) || !Number.isFinite(fraction)
      || fraction <= 0 || fraction > 1 || ambient.pressureKPa * fraction < 0.05) return "no-atmospheric-feed";
  }
  for (const input of recipe.inputs) {
    const store = chemicalStore(workshop, input.slot);
    if (store?.resource !== input.resource || store.amount < input.amount) return "no-input";
  }
  if (recipe.itemsIn?.some(input => !itemAvailable(workshop, input))) return "no-input";
  if (recipe.filterMl && !workshop.process?.filterUsedMl && !itemAvailable(workshop, { slot: "reagent", item: Item.HabitatFilter, count: 1 })) return "filter-exhausted";
  return null;
}
/** Mutates only a normalized private step image; all debits/outputs are installed together by its caller. */
export function advanceChemistry(state: MachineState, dt: number, environment: ChemistryEnvironment) {
  const workshop = state.workshop;
  const result = { consumedJ: 0, generatedJ: 0, completed: null as string | null };
  if (!workshop.process) { state.status = "invalid-state"; return result; }
  const recipes = chemistryRecipes(state.kind);
  const recipe = workshop.cycle ? chemistryRecipe(workshop.cycle.recipeId)
    : workshop.process.recipeId ? chemistryRecipe(workshop.process.recipeId)
    : recipes.find(candidate => !chemistryInputReason(workshop, candidate, environment)) ?? recipes[0];
  if (!recipe || recipe.machine !== state.kind) { state.status = "invalid-recipe"; return result; }
  const reason = chemistryInputReason(workshop, recipe, environment);
  if (reason) { state.status = reason; return result; }
  // Quote a completed batch against a clone before spending more power or moving any ingredients.
  const after: WorkshopState = { ...workshop, slots: Object.fromEntries(Object.entries(workshop.slots).map(([key, slot]) => [key, cloneSlot(slot)])) as WorkshopState["slots"],
    process: { ...workshop.process } };
  for (const input of recipe.inputs) {
    const store = chemicalStore(after, input.slot)!;
    setChemicalStore(after, input.slot, store.amount === input.amount ? null : { ...store, amount: store.amount - input.amount });
  }
  for (const output of recipe.outputs) {
    const store = chemicalStore(after, output.slot);
    if (store && store.resource !== output.resource) { state.status = "output-blocked"; return result; }
    setChemicalStore(after, output.slot, { resource: output.resource, amount: (store?.amount ?? 0) + output.amount });
  }
  const spentFilter = !!recipe.filterMl && after.process!.filterUsedMl + recipe.filterMl >= 240000;
  const itemOutputs = [...recipe.itemsOut ?? [], ...(spentFilter ? [{ slot: "byproduct" as const, item: Item.SpentHabitatFilter, count: 1 }] : [])];
  if (itemOutputs.some(output => !outputFits(after, output)) || workshopStoredTotal(after, "fluid") > workshopFluidCapacity(state.kind, after)
    || workshopStoredTotal(after, "chemical") > workshopGasCapacity(state.kind, after)
    || (recipe.generatedJ && state.energyJ + recipe.generatedJ > machineCapacity(state.kind, workshop))) {
    state.status = "output-blocked"; return result;
  }
  const cost = chemistryCost(recipe, workshop);
  const cycle = workshop.cycle ?? { recipeId: recipe.id, progressMs: 0, paidJ: 0, ...cost };
  if (cycle.durationMs !== cost.durationMs || cycle.costJ !== cost.costJ) { state.status = "invalid-state"; return result; }
  const nextMs = Math.min(cycle.durationMs, cycle.progressMs + dt,
    recipe.generatedJ ? cycle.durationMs : Math.floor((cycle.paidJ + state.energyJ) * cycle.durationMs / cycle.costJ));
  const debit = Math.ceil(cycle.costJ * nextMs / cycle.durationMs) - cycle.paidJ;
  if (nextMs <= cycle.progressMs || (!recipe.generatedJ && debit > state.energyJ)) { state.status = "no-power"; return result; }
  const completes = nextMs === cycle.durationMs;
  const heat = Math.ceil(debit / 4) + (completes ? recipe.wasteHeatJ ?? 0 : 0);
  if (workshop.heatJ + heat > workshopHeatCapacity(workshop)) { state.status = "heat-limited"; return result; }
  // The generator's one-joule ignition cost is paid from its finite fuel yield, not an unavailable input power port.
  if (!recipe.generatedJ) { state.energyJ -= debit; result.consumedJ = debit; }
  workshop.heatJ += heat;
  workshop.cycle = { ...cycle, progressMs: nextMs, paidJ: cycle.paidJ + debit }; state.status = "working";
  if (!completes) return result;
  for (const input of recipe.itemsIn ?? []) {
    const slot = after.slots[input.slot]!;
    after.slots[input.slot] = slot.count === input.count ? null : { ...slot, count: slot.count - input.count };
  }
  if (recipe.filterMl) {
    if (!after.process!.filterUsedMl) {
      const filter = after.slots.reagent!;
      after.slots.reagent = filter.count === 1 ? null : { ...filter, count: filter.count - 1 };
    }
    after.process!.filterUsedMl = (after.process!.filterUsedMl + recipe.filterMl) % 240000;
  }
  for (const output of itemOutputs) after.slots[output.slot] = { item: output.item, count: (after.slots[output.slot]?.count ?? 0) + output.count };
  workshop.fluid = after.fluid; workshop.chemical = after.chemical; workshop.process = after.process; workshop.slots = after.slots;
  workshop.cycle = null; result.completed = recipe.id; result.generatedJ = recipe.generatedJ ? recipe.generatedJ - recipe.energyJ : 0; state.energyJ += result.generatedJ;
  state.status = result.generatedJ ? "generating" : "working";
  return result;
}
