import { encodeAttachmentSource } from "./attachment-source-preimage";
import { BLOCKS, type BlockId } from "./data";
import type { DigitalCreatureArchive, DigitalItemVault, DigitalStorageTier } from "./digital-storage";
import { parseCustodyCellKey } from "./chest-custody-owner";
import { parseLocationId, type LocationId } from "./location-address";
import { freezeUniverseJson, isUniverseRecord } from "./universe-json";
import { assertWaygridStores, waygridBlockCapacity } from "./waygrid-capacity";
import { readWaygridCapacityId, waygridCapacityId, type WaygridCapacityKind } from "./waygrid-capacity-identity";

export type WaygridPhysicalLocation = Readonly<{ locationId: LocationId; voxels: Readonly<Record<string, BlockId>> }>;
type Installation = Readonly<{ locationId: LocationId; key: string; block: BlockId; kind: WaygridCapacityKind; tier: DigitalStorageTier }>;

/** Join a COMPLETE canonical location census to the one shared pair of stores.
 * Unique legacy associations are observations only: never rewrite IDs, credit
 * capacity, split contents, or infer permission to migrate/transfer a block. */
export function resolveWaygridPhysicalOwnership(locations: readonly WaygridPhysicalLocation[],
  vault: DigitalItemVault, archive: DigitalCreatureArchive) {
  const source = encodeAttachmentSource({ locations, vault, archive });
  assertWaygridStores(vault, archive);
  const installed = new Map<string, Installation>(), locationIds = new Set<string>();
  let universe: string | null = null;
  for (const location of locations) {
    const address = parseLocationId(location.locationId);
    universe ??= address.universeId;
    if (universe !== address.universeId || locationIds.has(location.locationId) || !isUniverseRecord(location.voxels))
      throw Error("Duplicate, foreign or missing Waygrid physical location.");
    locationIds.add(location.locationId);
    for (const [key, block] of Object.entries(location.voxels)) {
      parseCustodyCellKey(key);
      if (!Number.isSafeInteger(block) || !Object.hasOwn(BLOCKS, block)) throw Error("Invalid Waygrid canonical voxel.");
      const capacity = waygridBlockCapacity(block);
      if (!capacity) continue;
      const value = { locationId: location.locationId, key, block, ...capacity };
      installed.set(waygridCapacityId(value), value);
    }
  }
  if (!locationIds.size) throw Error("Waygrid physical census has no locations.");
  const records = new Map<string, { tier: DigitalStorageTier; stores: Set<"item" | "creature"> }>();
  const starters: { store: "item" | "creature"; id: string; tier: DigitalStorageTier }[] = [];
  for (const [store, cells] of [["item", vault.cells], ["creature", archive.cells]] as const) for (const cell of cells) {
    if (cell.id === (store === "item" ? "item-cell-1" : "creature-cell-1")) {
      if (cell.tier !== 1) throw Error("Waygrid starter capacity has an unsupported tier.");
      starters.push({ store, ...cell }); continue;
    }
    const prior = records.get(cell.id);
    if (prior && prior.tier !== cell.tier) throw Error("Waygrid paired capacity tiers disagree.");
    const record = prior ?? { tier: cell.tier, stores: new Set<"item" | "creature">() };
    record.stores.add(store); records.set(cell.id, record);
  }
  const owners = new Set<string>(), bindings: (Installation & { capacityId: string; canonicalId: string; legacy: boolean })[] = [];
  for (const [id, record] of records) {
    const scoped = readWaygridCapacityId(id);
    let matches: [string, Installation][];
    if (scoped) {
      const value = installed.get(id); matches = value ? [[id, value]] : [];
    } else {
      const match = /^(cell|terminal:item|terminal:creature):(-?\d+,-?\d+,-?\d+)$/.exec(id);
      if (!match) throw Error("Unresolved custom Waygrid capacity owner.");
      const key = match[2], kind = match[1] === "cell" ? "cell" : match[1] === "terminal:item" ? "item" : "creature";
      parseCustodyCellKey(key);
      // Do not narrow by tier: a conflicting second physical block is still
      // ambiguous, not evidence that one old coordinate record owns the other.
      matches = [...installed].filter(([, value]) => value.key === key && value.kind === kind);
    }
    if (matches.length !== 1) throw Error(matches.length ? "Ambiguous legacy Waygrid physical owner." : "Orphan Waygrid capacity registration.");
    const [canonicalId, value] = matches[0], expected = value.kind === "cell" ? ["item", "creature"] : [value.kind];
    if (record.tier !== value.tier || record.stores.size !== expected.length || expected.some(store => !record.stores.has(store as "item" | "creature")))
      throw Error("Waygrid physical tier or paired store registration disagrees.");
    if (owners.has(canonicalId)) throw Error("Duplicate Waygrid physical capacity contribution.");
    owners.add(canonicalId); bindings.push({ ...value, capacityId: id, canonicalId, legacy: scoped === null });
  }
  if (owners.size !== installed.size) throw Error("Installed Waygrid block lacks its exact capacity registration.");
  bindings.sort((a, b) => a.canonicalId < b.canonicalId ? -1 : a.canonicalId > b.canonicalId ? 1 : 0);
  return freezeUniverseJson(structuredClone({ source, bindings, starters }));
}
