import { CUSTODY_BLOCK_MODELS, custodyBlockBodyBounds, type CustodyBlockField } from "./custody-block-body";
import { asteroidAttachmentContainsCell, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";
import { parseCustodyCellKey } from "./chest-custody-owner";
import type { WorldCreatureCustodySource } from "./creature-custody-sources";
import type { BlockChestWorld } from "./asteroid-attachment-chests";
import { freezeUniverseJson, isUniverseRecord } from "./universe-json";

/** Physical closure for every actual basic-holder ledger root, even empty or
 * outside-rooted holders. Machines, chests, apiaries and habitats have separate
 * whole-component selectors. Inventory contents remain opaque and unchanged. */
export function selectAsteroidCustodyBlocks(frame: AsteroidAttachmentFrame,
  source: Pick<WorldCreatureCustodySource, CustodyBlockField>, world: BlockChestWorld) {
  const selected: { field: CustodyBlockField; key: string; attached: boolean }[] = [];
  for (const field of Object.keys(CUSTODY_BLOCK_MODELS) as CustodyBlockField[]) {
    const stores = source[field] ?? {};
    if (!isUniverseRecord(stores)) throw Error("Invalid canonical block holder ledger.");
    for (const key of Object.keys(stores).sort()) {
      const [x, y, z] = parseCustodyCellKey(key), facing = world.facing(key);
      if (world.block(key) !== CUSTODY_BLOCK_MODELS[field].block || facing === undefined)
        throw Error("Block holder differs from its canonical voxel or facing.");
      const attached = asteroidAttachmentContainsCell(frame, key, "orbit");
      if (asteroidAttachmentVolumeSide(frame, custodyBlockBodyBounds(field, { x, y, z }, facing), "orbit") !== attached)
        throw Error("Block holder body crosses its attached ownership boundary.");
      selected.push({ field, key, attached });
    }
  }
  return freezeUniverseJson(selected);
}
