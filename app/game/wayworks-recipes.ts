import { BlockId, Item, LOG_ITEMS, type ItemCode } from "./data";
import type { MachineKind } from "./wayworks";
import type { WorkshopState } from "./wayworks-stores";

export type MachineRecipe = Readonly<{
  id: string; name: string; machine: MachineKind;
  input: Readonly<{ items: readonly ItemCode[]; count: number }>;
  reagent?: Readonly<{ items: readonly ItemCode[]; count: number }>;
  fluid?: Readonly<{ resource: string; amount: number }>;
  output: Readonly<{ item: ItemCode; count: number }>;
  byproduct?: Readonly<{ item: ItemCode; count: number }>;
  durationMs: number; energyJ: number;
}>;
export const MACHINE_RECIPES: readonly MachineRecipe[] = Object.freeze([
  { id: "crush-iron", name: "Crush iron ore", machine: "powered-crusher", input: { items: [Item.RawIron], count: 1 }, output: { item: Item.CrushedIron, count: 2 }, durationMs: 5000, energyJ: 6000 },
  { id: "crush-stone", name: "Mill stone dust", machine: "powered-crusher", input: { items: [BlockId.Cobblestone, BlockId.Stone], count: 1 }, output: { item: Item.StoneDust, count: 2 }, durationMs: 3000, energyJ: 2400 },
  { id: "press-biomass", name: "Press organic fuel", machine: "powered-crusher", input: { items: [Item.Fiber, Item.Sawdust], count: 4 }, output: { item: Item.BiofuelPellet, count: 2 }, durationMs: 4000, energyJ: 1600 },
  { id: "wash-iron", name: "Wash crushed iron", machine: "enrichment-mill", input: { items: [Item.CrushedIron], count: 1 }, fluid: { resource: "water", amount: 250 }, output: { item: Item.EnrichedIron, count: 1 }, byproduct: { item: Item.StoneDust, count: 1 }, durationMs: 4000, energyJ: 3200 },
  { id: "smelt-enriched-iron", name: "Smelt enriched iron", machine: "electric-smelter", input: { items: [Item.EnrichedIron], count: 1 }, output: { item: Item.IronIngot, count: 1 }, durationMs: 3000, energyJ: 2400 },
  { id: "smelt-raw-iron", name: "Smelt raw iron", machine: "electric-smelter", input: { items: [Item.RawIron], count: 1 }, output: { item: Item.IronIngot, count: 1 }, durationMs: 6000, energyJ: 7200 },
  { id: "smelt-gold", name: "Smelt raw gold", machine: "electric-smelter", input: { items: [Item.RawGold], count: 1 }, output: { item: Item.GoldIngot, count: 1 }, durationMs: 6000, energyJ: 7200 },
  { id: "smelt-copper", name: "Smelt copper ore", machine: "electric-smelter", input: { items: [BlockId.CopperOre], count: 1 }, output: { item: Item.CopperIngot, count: 1 }, durationMs: 5000, energyJ: 5000 },
  { id: "smelt-glass", name: "Fuse clear glass", machine: "electric-smelter", input: { items: [BlockId.Sand], count: 1 }, output: { item: BlockId.Glass, count: 1 }, durationMs: 4000, energyJ: 3600 },
  { id: "fire-clay", name: "Fire clay ceramic", machine: "electric-smelter", input: { items: [BlockId.Clay], count: 1 }, output: { item: BlockId.SunbakedClay, count: 1 }, durationMs: 5000, energyJ: 4200 },
  { id: "infuse-machine-alloy", name: "Infuse machine alloy", machine: "alloy-infuser", input: { items: [Item.IronIngot], count: 1 }, reagent: { items: [Item.CopperIngot], count: 1 }, output: { item: Item.MachineAlloy, count: 2 }, durationMs: 8000, energyJ: 12000 },
  { id: "press-iron", name: "Press iron sheet", machine: "plate-press", input: { items: [Item.IronIngot], count: 1 }, output: { item: Item.IronSheet, count: 1 }, durationMs: 4000, energyJ: 4000 },
  { id: "press-copper", name: "Press copper sheet", machine: "plate-press", input: { items: [Item.CopperIngot], count: 1 }, output: { item: Item.CopperSheet, count: 1 }, durationMs: 3000, energyJ: 3000 },
  { id: "saw-timber", name: "Precision-cut timber", machine: "precision-sawmill", input: { items: LOG_ITEMS, count: 1 }, output: { item: BlockId.Planks, count: 6 }, byproduct: { item: Item.Sawdust, count: 2 }, durationMs: 4000, energyJ: 2800 },
]);
export const machineRecipes = (kind: MachineKind) => MACHINE_RECIPES.filter((recipe) => recipe.machine === kind);
export const machineRecipe = (id: string) => MACHINE_RECIPES.find((recipe) => recipe.id === id);

/** Speed costs superlinearly; efficiency reduces both demand and throughput. Locked per cycle. */
export function recipeCost(recipe: MachineRecipe, workshop: WorkshopState) {
  const speed = 1 + workshop.upgrades.speed * 0.35;
  const efficiency = 1 + workshop.upgrades.efficiency * 0.2;
  return { durationMs: Math.ceil(recipe.durationMs * efficiency / speed),
    costJ: Math.ceil(recipe.energyJ * speed * speed / efficiency) };
}
