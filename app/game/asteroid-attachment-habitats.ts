import { AQUARIUM_MAX_BLOCKS, buildAquariumTopology, type AquariumState } from "./aquarium";
import { MAX_EXHIBIT_BLOCKS, buildExhibitTopology } from "./butterfly-exhibit";
import { BlockId, BLOCKS, type InventorySlot } from "./data";
import { parseCustodyCellKey } from "./chest-custody-owner";
import { asteroidAttachmentContainsCell, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { freezeUniverseJson, isUniverseRecord } from "./universe-json";

export type AsteroidHabitatSources = Readonly<{
  aquariums: Readonly<Record<string, AquariumState>>;
  /** Actual chest ledger; only the explicit exhibit: namespace is selected. */
  chests: Readonly<Record<string, readonly (InventorySlot | null)[]>>;
}>;
export type AsteroidHabitatWorld = Readonly<{
  /** Complete canonical orbit image, including unloaded/outside cells and air.
   * Undefined means unknown, never air. Keep this image stable during selection. */
  block(key: string): BlockId | undefined;
}>;
export type AsteroidHabitatSelection = Readonly<{
  kind: "aquarium" | "exhibit";
  /** Exact source ledger key, retaining exhibit: when present. */
  rootKey: string;
  cellKeys: readonly string[];
  attached: boolean;
}>;

const offsets = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
type Cell = { x: number; y: number; z: number };
const cellKey = ({ x, y, z }: Cell) => `${x},${y},${z}`;
function cellFor(key: string): Cell {
  const [x, y, z] = parseCustodyCellKey(key);
  return { x, y, z };
}

/** Prove closure before passing a component to the capped presentation builders.
 * Even cell twenty has all six neighbors inspected. Discovering cell twenty-one
 * rejects immediately; no truncated component can escape as a classification. */
function completeComponent(originKey: string, expected: BlockId, cap: number, world: AsteroidHabitatWorld): Cell[] {
  const origin = cellFor(originKey), queue = [origin], seen = new Set<string>(), cells: Cell[] = [];
  for (let index = 0; index < queue.length; index++) {
    const cell = queue[index], key = cellKey(cell);
    if (seen.has(key)) continue;
    // Neighbor arithmetic must not escape the canonical safe-integer grid.
    cellFor(key);
    seen.add(key);
    const block = world.block(key);
    if (block === undefined || !Number.isInteger(block) || !Object.hasOwn(BLOCKS, block))
      throw Error(`Unknown canonical habitat voxel: ${key}.`);
    if (block !== expected) {
      if (index === 0) throw Error(`Habitat root has no matching canonical voxel: ${originKey}.`);
      continue;
    }
    cells.push(cell);
    if (cells.length > cap) throw Error(`Habitat component exceeds the ${cap}-cell cap.`);
    for (const [dx, dy, dz] of offsets) queue.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
  }
  return cells;
}

/** Read-only physical custody classification, not projection, travel admission,
 * actor authority, or a save operation. Derives whole face-connected voxel
 * components from every actual ledger root, including roots outside the frame.
 * Metadata is opaque: no resident/inventory validation, cloning or normalization.
 * This proves enclosure cell ownership only; rendered habitat rails, decorations,
 * and animated resident model bounds require separate physical preflight.
 * Unrecorded empty habitats cannot be enumerated by this root-based API. */
export function selectAsteroidHabitats(frame: AsteroidAttachmentFrame, sources: AsteroidHabitatSources,
  world: AsteroidHabitatWorld): readonly AsteroidHabitatSelection[] {
  if (!isUniverseRecord(sources.aquariums) || !isUniverseRecord(sources.chests))
    throw Error("Invalid canonical habitat ledgers.");
  const selected: AsteroidHabitatSelection[] = [], claimed = new Set<string>();
  function select(kind: AsteroidHabitatSelection["kind"], rootKey: string, originKey: string, savedKeys?: readonly string[]) {
    const aquarium = kind === "aquarium", origin = cellFor(originKey);
    const cells = completeComponent(originKey, aquarium ? BlockId.GlassAquarium : BlockId.ButterflyExhibit,
      aquarium ? AQUARIUM_MAX_BLOCKS : MAX_EXHIBIT_BLOCKS, world);
    const topology = aquarium ? buildAquariumTopology(cells, origin) : buildExhibitTopology(cells, origin);
    // Stable numeric ordering does not change either ledger's actual owner key.
    const keys = topology.blocks.map(block => ({ x: block.x, y: block.y, z: block.z }))
      .sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x).map(cellKey);
    if (keys.length !== cells.length) throw Error("Habitat topology silently truncated.");
    if (keys.some(key => claimed.has(key))) throw Error("Duplicate habitat roots share one canonical component.");
    if (savedKeys) {
      const saved = new Set(savedKeys);
      for (const key of savedKeys) cellFor(key);
      if (savedKeys.length !== keys.length || saved.size !== keys.length || keys.some(key => !saved.has(key)))
        throw Error("Saved aquarium cell keys differ from the full canonical topology.");
    }
    const attached = asteroidAttachmentContainsCell(frame, keys[0], "orbit");
    if (keys.some(key => asteroidAttachmentContainsCell(frame, key, "orbit") !== attached))
      throw Error("Habitat component crosses the asteroid frame boundary.");
    for (const key of keys) claimed.add(key);
    selected.push({ kind, rootKey, cellKeys: keys, attached });
  }
  for (const [rootKey, state] of Object.entries(sources.aquariums)) {
    if (!isUniverseRecord(state) || state.schema !== 1 || !Array.isArray(state.blockKeys))
      throw Error("Invalid canonical aquarium topology record.");
    select("aquarium", rootKey, rootKey, state.blockKeys);
  }
  for (const rootKey of Object.keys(sources.chests)) {
    if (rootKey.startsWith("exhibit:")) select("exhibit", rootKey, rootKey.slice(8));
  }
  return freezeUniverseJson(selected);
}
