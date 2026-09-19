import { Item, RECIPES, cloneSlot, recipePatterns, type Ingredient, type InventorySlot, type Recipe } from "./data";

export type LifeSupportCraftInput = {
  inventory: Array<InventorySlot | null>;
  cursor: InventorySlot | null;
  craftGrid: Array<InventorySlot | null>;
};

export type LifeSupportCraftResult = LifeSupportCraftInput & {
  ok: boolean;
  reason: string;
  crafted: number;
};

function ingredientMatches(slot: InventorySlot | null, ingredient: Ingredient | 0): boolean {
  if (ingredient === 0) return slot === null;
  if (!slot || !Number.isSafeInteger(slot.count) || slot.count < 1 || slot.metadata !== undefined || slot.durability !== undefined) return false;
  return Array.isArray(ingredient) ? ingredient.includes(slot.item) : slot.item === ingredient;
}

function matchingIndices(grid: Array<InventorySlot | null>, recipe: Recipe): number[] | null {
  if (grid.length !== 9) return null;
  const occupied = grid.flatMap((slot, index) => slot ? [index] : []);
  if (occupied.length === 0) return null;
  const minX = Math.min(...occupied.map(index => index % 3));
  const maxX = Math.max(...occupied.map(index => index % 3));
  const minY = Math.min(...occupied.map(index => Math.floor(index / 3)));
  const maxY = Math.max(...occupied.map(index => Math.floor(index / 3)));
  if (maxX - minX + 1 !== recipe.width || maxY - minY + 1 !== recipe.height) return null;

  for (const pattern of recipePatterns(recipe)) {
    const indices: number[] = [];
    let matches = true;
    for (let index = 0; index < 9; index += 1) {
      const x = index % 3;
      const y = Math.floor(index / 3);
      const inside = x >= minX && x <= maxX && y >= minY && y <= maxY;
      const ingredient = inside ? pattern[(y - minY) * recipe.width + (x - minX)] : 0;
      if (ingredient === undefined || !ingredientMatches(grid[index], ingredient)) {
        matches = false;
        break;
      }
      if (ingredient !== 0) indices.push(index);
    }
    if (matches) return indices;
  }
  return null;
}

/** Pure, bounded crafting of the two finite life-support consumables. */
export function craftLifeSupportSupply(input: LifeSupportCraftInput, recipeId: string, shift: boolean): LifeSupportCraftResult {
  const inventory = input.inventory.map(cloneSlot);
  const craftGrid = input.craftGrid.map(cloneSlot);
  let cursor = cloneSlot(input.cursor);
  const result = (ok: boolean, reason: string, crafted: number): LifeSupportCraftResult =>
    ({ ok, reason, inventory, cursor, craftGrid, crafted });

  const recipe = RECIPES.find(candidate => candidate.id === recipeId);
  if (!recipe || (recipe.output.item !== Item.EvaPowerCell && recipe.output.item !== Item.ScrubberCartridge)
    || recipe.output.count !== 1) return result(false, "unsupported_recipe", 0);
  if (!matchingIndices(craftGrid, recipe)) return result(false, "recipe_mismatch", 0);
  if (!shift && cursor !== null) return result(false, "cursor_occupied", 0);

  let crafted = 0;
  do {
    const indices = matchingIndices(craftGrid, recipe);
    if (!indices) break;
    const emptyIndex = shift ? inventory.findIndex(slot => slot === null) : -1;
    if (shift && emptyIndex < 0) break;
    const output = cloneSlot(recipe.output)!;
    for (const index of indices) {
      const slot = craftGrid[index]!;
      craftGrid[index] = slot.count === 1 ? null : { ...slot, count: slot.count - 1 };
    }
    if (shift) inventory[emptyIndex] = output;
    else cursor = output;
    crafted += 1;
  } while (shift && crafted < 64);

  return crafted ? result(true, "ok", crafted) : result(false, "inventory_full", 0);
}
