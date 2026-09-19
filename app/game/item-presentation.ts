import { BLOCKS, BlockId, Item, ITEMS, type ItemCode } from "./data";

/**
 * Presentation families are deliberately semantic rather than item-specific.
 * Every catalog entry resolves to one authored silhouette while closely
 * related materials can still share geometry, atlasing, and drop templates.
 */
export type ItemPresentationFamily =
  | "voxel-block" | "world-texture" | "tool" | "armor" | "document"
  | "container" | "workstation" | "mineral" | "ingot" | "fiber"
  | "food" | "creature-part" | "relic" | "equipment" | "ammunition"
  | "capture" | "crafted-component" | `authored-${string}`;

const MINERAL_ICONS = new Set(["coal", "ore-chunk", "shard", "star-crystal", "crystal", "glow-dust", "gel"]);
const FIBER_ICONS = new Set(["fiber", "wool", "wheat", "flour"]);
const FOOD_ICONS = new Set([
  "produce", "seed", "berries", "apple", "banana", "bread", "meat", "rotten-flesh", "fish-raw",
  "fish-cooked", "shellfruit", "pie", "moonberry-cookie", "honey", "jelly", "milk",
]);
const CREATURE_PART_ICONS = new Set([
  "hide", "bone", "feather", "scale", "dragon-scale", "dragon-heart", "dragon-skull", "dragon-bone",
  "nocturne-heart", "honeycomb", "wax", "queen-cell", "bee",
]);
const RELIC_ICONS = new Set(["relic", "charm", "compass", "scepter"]);
const CONTAINER_ICONS = new Set([
  "bucket", "jar", "bottle", "bottle-empty", "bottle-water", "potion", "potion-health", "mead",
  "produce-crate", "chest", "aquarium",
]);
const WORKSTATION_ICONS = new Set([
  "crafting-table", "apiary", "fireplace", "orb-rack", "orb-healer", "morph-loom", "cartography",
  "alchemy", "wayshrine", "distillery", "sugarworks", "wheat-mill",
]);
const EQUIPMENT_ICONS = new Set([
  "shield", "saddle", "dragon-saddle", "dragon-pannier", "dragon-barding-fire", "dragon-barding-ice",
  "dragon-barding-steel", "dragon-barding-sea", "dragon-barding-gold", "dragon-barding-silver",
  "bed", "door", "fence", "fence-gate", "chair", "stool", "sailboat", "lead", "net",
]);
const FIBER_ITEMS = new Set<ItemCode>([Item.Stick, Item.Fiber, Item.String, Item.Rope, Item.Wool, Item.Wheat]);
const MINERAL_ITEMS = new Set<ItemCode>([Item.Coal, Item.Charcoal, Item.RawIron, Item.RawGold, Item.RawCopper, Item.CrystalShard, Item.Flint, Item.ShadowShard, Item.CaveGel, Item.GlowDust, Item.IronFilings]);
const INGOT_ITEMS = new Set<ItemCode>([Item.IronIngot, Item.GoldIngot, Item.CopperIngot]);
const FOOD_ITEMS = new Set<ItemCode>([Item.RawMeat, Item.CookedMeat, Item.RottenFlesh, Item.Bread, Item.Berry, Item.Apple, Item.Banana, Item.RawFish, Item.CookedFish]);
const CREATURE_PART_ITEMS = new Set<ItemCode>([Item.Hide, Item.BoneShard, Item.Feather, Item.GlowScale, Item.NocturneHeart]);
const RELIC_ITEMS = new Set<ItemCode>([Item.BreatherCharm, Item.SunwardCompass, Item.StarrootScepter]);
const EQUIPMENT_ITEMS = new Set<ItemCode>([Item.Saddle, Item.Sailboat, Item.WildwoodDoor, Item.WildwoodBed]);

/** Removes the final generic UI square without duplicating the large legacy icon switch. */
export function fallbackInventoryIconKind(item: ItemCode): string {
  const definition = ITEMS[item];
  if (!definition) return "crafted-component";
  if (definition.lifeSupportKind) return `life-support-${definition.lifeSupportKind}`;
  if (definition.placeBlock !== undefined) return "voxel-block";
  if (item === Item.String) return "thread";
  if (item === Item.RawCopper) return "ore-chunk";
  if (item === Item.CopperIngot) return "ingot";
  if (item === Item.Rope) return "rope";
  if (item === Item.IronFilings) return "filings";
  return "crafted-component";
}

export function itemPresentationFamily(item: ItemCode): ItemPresentationFamily {
  const definition = ITEMS[item];
  if (!definition) return "crafted-component";
  if (definition.lifeSupportKind) return "equipment";
  if (definition.heldModel) return `authored-${definition.heldModel}`;
  if (definition.worldTextureBlock !== undefined) {
    const block = BLOCKS[definition.worldTextureBlock];
    return block.solid && (!block.shape || block.shape === "cube") ? "voxel-block" : "world-texture";
  }
  if (definition.placeBlock !== undefined) return "voxel-block";
  if (definition.toolKind || ["hoe", "scythe", "ranged-weapon", "spear"].includes(definition.useKind ?? "")) return "tool";
  if (definition.equipmentSlot) return "armor";
  if (["blueprint", "spell-tome", "lair-survey", "settlement-chart"].includes(definition.useKind ?? "")) return "document";
  if (["capture-orb", "creature-cage", "release-creature"].includes(definition.useKind ?? "")) return "capture";
  if (["potion", "seed-pouch"].includes(definition.useKind ?? "")) return definition.useKind === "potion" ? "container" : "food";
  if (["boat", "lead", "shield", "net"].includes(definition.useKind ?? "")) return "equipment";
  if (["magic-relic", "mana-consumable"].includes(definition.useKind ?? "")) return "relic";
  if (["dragon-egg", "dragon-module"].includes(definition.useKind ?? "")) return definition.useKind === "dragon-egg" ? "creature-part" : "equipment";

  const icon = definition.iconKind ?? "";
  if (MINERAL_ICONS.has(icon)) return "mineral";
  if (icon === "gold-pile" || icon === "gold-hoard-block") return "ingot";
  if (FIBER_ICONS.has(icon)) return "fiber";
  if (FOOD_ICONS.has(icon)) return "food";
  if (CREATURE_PART_ICONS.has(icon) || icon === "dragon-egg") return "creature-part";
  if (RELIC_ICONS.has(icon)) return "relic";
  if (CONTAINER_ICONS.has(icon)) return "container";
  if (WORKSTATION_ICONS.has(icon)) return "workstation";
  if (EQUIPMENT_ICONS.has(icon) || icon.startsWith("dragon-barding")) return "equipment";
  if (icon === "blueprint") return "document";
  if (["bolt"].includes(icon)) return "ammunition";
  if (["capture-orb"].includes(icon)) return "capture";

  if (FIBER_ITEMS.has(item)) return "fiber";
  if (MINERAL_ITEMS.has(item)) return "mineral";
  if (INGOT_ITEMS.has(item)) return "ingot";
  if (FOOD_ITEMS.has(item)) return "food";
  if (CREATURE_PART_ITEMS.has(item)) return "creature-part";
  if (RELIC_ITEMS.has(item)) return "relic";
  if (EQUIPMENT_ITEMS.has(item)) return "equipment";
  if (item === BlockId.Torch) return "workstation";
  return "crafted-component";
}
