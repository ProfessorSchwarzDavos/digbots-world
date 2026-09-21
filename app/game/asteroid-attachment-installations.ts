import { BlockId } from "./data";
import { blockFacingRight } from "./block-facing";
import { chestBodyBounds } from "./chest-body";
import { chestCustodyOwner, parseCustodyCellKey } from "./chest-custody-owner";
import { CUSTODY_BLOCK_MODELS, custodyBlockBodyBounds, type CustodyBlockField } from "./custody-block-body";
import { machineKindForBlock } from "./wayworks-integration";
import { workshopBodyBounds } from "./workshop-body";
import { buildAquariumTopology } from "./aquarium";
import { buildExhibitTopology } from "./butterfly-exhibit";
import { aquariumBodyBounds, exhibitBodyBounds } from "./habitat-body";
import { assertAsteroidApiaryQuerySide } from "./asteroid-attachment-apiaries";
import { discoverAsteroidHabitats, type AsteroidHabitatSelection } from "./asteroid-attachment-habitats";
import { asteroidAttachmentContainsCell, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";
import type { createAsteroidAttachmentWorld } from "./asteroid-attachment-world";
import type { WorldCreatureCustodySource } from "./creature-custody-sources";
import type { CelestialBounds } from "./celestial-terrain";
import { freezeUniverseJson } from "./universe-json";

export type AsteroidInstallation = Readonly<{
  kind: CustodyBlockField | "chest" | "machine" | "apiary" | "aquarium" | "exhibit";
  /** Physical origin, not necessarily a saved inventory key. */
  key: string; cellKeys: readonly string[]; attached: boolean;
  /** False means UNMATERIALIZED, never proof that a container is empty. */
  recorded: boolean;
}>;

/** Close the physical gap left by ledger-only custody. Enumerate all installed
 * covered holders from the pinned world's finite pages and construction, even
 * outside/unloaded/never-opened ones. Existing recorded selectors still own
 * metadata, resident models, machine networks and inventory validity. This
 * function neither fabricates missing stores nor grants transfer admission.
 * Other authored objects/site/environment dependencies remain separate gates. */
export function selectAsteroidInstallations(frame: AsteroidAttachmentFrame, source: WorldCreatureCustodySource,
  world: ReturnType<typeof createAsteroidAttachmentWorld>, habitats: readonly AsteroidHabitatSelection[]): readonly AsteroidInstallation[] {
  const installations: AsteroidInstallation[] = [], chestOwners = new Map<string, string>();
  for (const key of Object.keys(source.chests)) {
    const owner = chestCustodyOwner(key);
    if (owner.kind !== "block-chest") continue;
    for (const cell of owner.cells) {
      const id = cell.join(",");
      if (chestOwners.has(id)) throw Error("Duplicate installed chest owner.");
      chestOwners.set(id, key);
    }
  }
  const basics = new Map(Object.entries(CUSTODY_BLOCK_MODELS).map(([field, model]) => [model.block as BlockId, field as CustodyBlockField]));
  const habitatCells = new Map(habitats.flatMap(habitat => habitat.cellKeys.map(key => [key, habitat] as const)));
  const habitatSeeds: string[] = [];
  const body = (key: string, bounds: CelestialBounds, attached: boolean) => {
    if (asteroidAttachmentVolumeSide(frame, bounds, "orbit") !== attached)
      throw Error(`Installed body crosses its attached ownership boundary: ${key}.`);
  };
  for (const [key, block] of Object.entries(world.authoredVoxels).sort(([a], [b]) => a.localeCompare(b))) {
    const [x, y, z] = parseCustodyCellKey(key), point = { x, y, z }, facing = world.facing(key);
    const attached = asteroidAttachmentContainsCell(frame, key, "orbit");
    const field = basics.get(block), machine = machineKindForBlock(block);
    let kind: AsteroidInstallation["kind"], recorded: boolean;
    if (field) {
      kind = field; recorded = Object.hasOwn(source[field] ?? {}, key);
      body(key, custodyBlockBodyBounds(field, point, facing), attached);
    } else if (block === BlockId.Chest) {
      kind = "chest"; recorded = chestOwners.has(key);
      const owner = chestOwners.get(key);
      // Recorded paired geometry is already validated by the chest selector.
      if (!owner?.includes("|")) {
        body(key, chestBodyBounds([[x, y, z]], facing), attached);
        const right = blockFacingRight(facing);
        // Opening either side can form a pair. Test both potential neighbors,
        // without calling the live resolver (which would generate/merge loot).
        for (const sign of [-1, 1]) {
          const nx = x + right.x * sign, nz = z + right.z * sign, neighbor = `${nx},${y},${nz}`;
          if (world.block(neighbor) !== BlockId.Chest || world.facing(neighbor) !== facing
            || chestOwners.get(neighbor)?.includes("|")) continue;
          if (asteroidAttachmentContainsCell(frame, neighbor, "orbit") !== attached)
            throw Error("Unopened chest pairing crosses the attached boundary.");
          body(key, chestBodyBounds([[x, y, z], [nx, y, nz]], facing), attached);
        }
      }
    } else if (machine) {
      kind = "machine"; recorded = Object.hasOwn(source.wayworks ?? {}, key);
      // Unknown ports/resources cannot be replaced by default machine state.
      if (!recorded) throw Error(`Installed machine lacks canonical configuration: ${key}.`);
      body(key, workshopBodyBounds(machine, point, facing), attached);
    } else if (block === BlockId.Apiary || block === BlockId.WildBeehive) {
      kind = "apiary"; recorded = Object.hasOwn(source.apiaries ?? {}, key);
      assertAsteroidApiaryQuerySide(frame, key);
      // Both placed hive meshes fit their owning unit voxel; actual resident
      // bodies are checked by the recorded apiary selector, not invented here.
      body(key, { minX: x - .5, maxX: x + .5, minY: y - .5, maxY: y + .5, minZ: z - .5, maxZ: z + .5 }, attached);
    } else if (block === BlockId.GlassAquarium || block === BlockId.ButterflyExhibit) {
      habitatSeeds.push(key); continue;
    } else continue;
    installations.push({ kind, key, cellKeys: [key], attached, recorded });
  }
  for (const component of discoverAsteroidHabitats(frame, habitatSeeds, world)) {
    const owners = new Set(component.cellKeys.map(key => habitatCells.get(key)).filter(value => value !== undefined));
    if (owners.size > 1 || owners.size === 1 && component.cellKeys.some(key => !habitatCells.has(key)))
      throw Error("Installed habitat differs from its canonical recorded component.");
    const recorded = owners.size === 1;
    if (!recorded) {
      const cells = component.cellKeys.map(key => { const [x, y, z] = parseCustodyCellKey(key); return { x, y, z }; });
      const [x, y, z] = parseCustodyCellKey(component.originKey), origin = { x, y, z };
      const bounds = component.kind === "aquarium" ? aquariumBodyBounds(buildAquariumTopology(cells, origin), [])
        : exhibitBodyBounds(buildExhibitTopology(cells, origin), []);
      for (const volume of bounds) body(component.originKey, volume, component.attached);
    }
    installations.push({ kind: component.kind, key: component.originKey, cellKeys: component.cellKeys, attached: component.attached, recorded });
  }
  return freezeUniverseJson(installations);
}
