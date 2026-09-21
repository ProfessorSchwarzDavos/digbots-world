import { BlockId, type InventorySlot } from "./data";
import { blockFacingRight, type BlockFacing } from "./block-facing";
import { chestBodyBounds, type ChestCell } from "./chest-body";
import { chestCustodyOwner } from "./chest-custody-owner";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";
import { asteroidAttachmentContainsCell, rebaseAsteroidCell, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { canonicalJson, cloneUniverseJson, isUniverseRecord } from "./universe-json";
import { validCustodyItem } from "./wayworks-custody";

export type BlockChestStores = Readonly<Record<string, readonly (InventorySlot | null)[]>>;
export type BlockChestWorld = Readonly<{
  /** Complete canonical readers, not just loaded/visible chunks. */
  block(key: string): BlockId | undefined;
  facing(key: string): BlockFacing | undefined;
}>;
function parseKey(key: string): readonly ChestCell[] {
  const owner = chestCustodyOwner(key);
  if (owner.kind !== "block-chest") throw Error("Expected block chest keys, not mobile/exhibit cargo.");
  return owner.cells;
}
const rebaseKey = (frame: AsteroidAttachmentFrame, key: string, from: "orbit" | "local") =>
  // Half order maps directly to inventory slots. Sorting after translation can
  // exchange the contents of a double chest across the negative/positive axis.
  key.split("|").map(cell => rebaseAsteroidCell(frame, cell, from)).join("|");

function selection(frame: AsteroidAttachmentFrame, stores: BlockChestStores, world: BlockChestWorld) {
  canonicalJson(stores);
  if (!isUniverseRecord(stores)) throw Error("Invalid block chest owner table.");
  const cellsToKey = new Map<string, string>(), selected = new Set<string>();
  const facingAt = (key: string) => {
    const facing = world.facing(key);
    if (facing === undefined || ![0, 1, 2, 3].includes(facing)) throw Error("Unresolved canonical chest facing.");
    return facing;
  };
  for (const [key, slots] of Object.entries(stores)) {
    const cells = parseKey(key);
    if (!Array.isArray(slots) || slots.length !== cells.length * 27 || Object.keys(slots).length !== slots.length
      || slots.some(slot => slot !== null && !validCustodyItem(slot))) throw Error("Invalid exact block chest inventory.");
    for (const cell of cells) {
      const id = cell.join(",");
      if (cellsToKey.has(id) || world.block(id) !== BlockId.Chest) throw Error("Missing or multiply owned chest block.");
      cellsToKey.set(id, key); facingAt(id);
    }
    const side = asteroidAttachmentVolumeSide(frame, chestBodyBounds(cells, facingAt(cells[0].join(","))), "orbit");
    if (cells.some(cell => asteroidAttachmentContainsCell(frame, cell.join(","), "orbit") !== side))
      throw Error("Chest halves or opening lid cross the attached boundary.");
    if (side) selected.add(key);
  }
  // A presently single chest can merge when opened. Preserve the whole actual
  // pairing neighborhood, including compatible unopened blocks with no ledger.
  // Existing paired blocks do not form a second pair in the live resolver.
  for (const [key] of Object.entries(stores)) {
    const cells = parseKey(key);
    if (cells.length !== 1) continue;
    const [x, y, z] = cells[0], facing = facingAt(key), right = blockFacingRight(facing);
    for (const sign of [-1, 1]) {
      const neighbor = `${x + right.x * sign},${y},${z + right.z * sign}`, block = world.block(neighbor);
      if (block === undefined) throw Error("Unresolved canonical chest pairing neighborhood.");
      const owner = cellsToKey.get(neighbor);
      if (block !== BlockId.Chest || owner?.includes("|") || facingAt(neighbor) !== facing) continue;
      if (asteroidAttachmentContainsCell(frame, neighbor, "orbit") !== selected.has(key))
        throw Error("Potential double chest crosses the attached boundary.");
    }
  }
  return selected;
}

/** BLOCK chests only. Boat aliases, creature cargo and exhibit ledgers need
 * their explicit owner selectors, never a guessed cell from their IDs. This
 * checks storage geometry, not loot-generation, resource or travel authority. */
export function projectAsteroidBlockChests(frame: AsteroidAttachmentFrame, canonical: BlockChestStores, world: BlockChestWorld): BlockChestStores {
  const selected = selection(frame, canonical, world);
  return cloneUniverseJson(Object.fromEntries(Object.entries(canonical).filter(([key]) => selected.has(key))
    .map(([key, slots]) => [rebaseKey(frame, key, "orbit"), slots])));
}

/** Both world readers are canonical ORBIT before/after images. Outside storage
 * is retained exactly; selected halves retain slot order, including legacy keys.
 * The caller must atomically bind actual edits, finite cargo and source revision. */
export function captureAsteroidBlockChests(frame: AsteroidAttachmentFrame, canonical: BlockChestStores, baseline: BlockChestStores,
  edited: BlockChestStores, worlds: Readonly<{ before: BlockChestWorld; after: BlockChestWorld }>): BlockChestStores {
  if (canonicalJson(projectAsteroidBlockChests(frame, canonical, worlds.before)) !== canonicalJson(baseline)) throw Error("Stale block chest projection.");
  const selected = selection(frame, canonical, worlds.before), incoming: Record<string, readonly (InventorySlot | null)[]> = {};
  for (const [key, slots] of Object.entries(edited)) {
    parseKey(key); const orbit = rebaseKey(frame, key, "local");
    if (Object.hasOwn(incoming, orbit)) throw Error("Duplicate captured chest owner.");
    incoming[orbit] = slots;
  }
  const outside = Object.fromEntries(Object.entries(canonical).filter(([key]) => !selected.has(key)));
  if (Object.keys(incoming).some(key => Object.hasOwn(outside, key))) throw Error("Captured chest replaces an outside owner.");
  const output = cloneUniverseJson({ ...outside, ...incoming }), afterKeys = selection(frame, output, worlds.after);
  if (Object.keys(incoming).some(key => !afterKeys.has(key))) throw Error("Edited chest is outside the attached frame.");
  return output;
}
