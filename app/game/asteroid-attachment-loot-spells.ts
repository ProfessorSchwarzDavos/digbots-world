import { normalizeContextualLootWorldState, type ContextualLootWorldState, type LootContainerRecord } from "./contextual-loot";
import { opaqueAsteroidBlockCodec, projectAsteroidBlocks, captureAsteroidBlocks } from "./asteroid-attachment-blocks";
import { asteroidHistoryRegionCoordinates, asteroidHistoryRegionKey, asteroidHistoryRegionTouches } from "./asteroid-history-regions";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";
import type { AsteroidAttachmentFrame, AsteroidAttachmentView } from "./asteroid-attachment-frame";
import type { AttachmentActorBody } from "./attachment-actor-bodies";
import type { WorldSave } from "./engine";
import { assertExactKeys, canonicalJson, cloneUniverseJson, isUniverseRecord } from "./universe-json";

const lootFields = { schema: true, acquiredUniqueIds: true, containers: true } satisfies Record<keyof ContextualLootWorldState, true>;
const containerFields = { generatorVersion: true, familyId: true, ownership: true, theft: true, theftReported: true } satisfies Record<keyof LootContainerRecord, true>;
const lootCodec = opaqueAsteroidBlockCodec<LootContainerRecord>();
function validateLoot(value: ContextualLootWorldState) {
  canonicalJson(value); assertExactKeys(value, Object.keys(lootFields), "Attached loot history");
  if (!isUniverseRecord(value.containers)) throw Error("Invalid attached loot containers.");
  for (const container of Object.values(value.containers)) assertExactKeys(container, Object.keys(containerFields), "Attached loot container");
  if (canonicalJson(normalizeContextualLootWorldState(value)) !== canonicalJson(value)) throw Error("Attached loot history requires lossy normalization.");
}
/** Containers are coordinate-keyed historical ownership/theft records; they
 * can outlive a mined chest. Unique-reward history is a shared canonical ledger,
 * never a separate source of rewards in each attached view. */
export function projectAsteroidLoot(frame: AsteroidAttachmentFrame, canonical: ContextualLootWorldState): ContextualLootWorldState {
  validateLoot(canonical);
  return { ...cloneUniverseJson(canonical), containers: projectAsteroidBlocks(frame, canonical.containers, lootCodec) };
}
/** Preserve old unique IDs and order exactly. Appended IDs still require the
 * actual reward event/resource proof in the owner transaction. Do not truncate
 * older history or normalize container metadata to make a capture succeed. */
export function captureAsteroidLoot(frame: AsteroidAttachmentFrame, canonical: ContextualLootWorldState,
  baseline: ContextualLootWorldState, edited: ContextualLootWorldState): ContextualLootWorldState {
  if (canonicalJson(projectAsteroidLoot(frame, canonical)) !== canonicalJson(baseline)) throw Error("Stale attached loot projection.");
  validateLoot(edited);
  if (edited.acquiredUniqueIds.length < canonical.acquiredUniqueIds.length
    || canonical.acquiredUniqueIds.some((id, i) => edited.acquiredUniqueIds[i] !== id)) throw Error("Attached unique-reward history cannot be removed or reordered.");
  const output = { schema: 1 as const, acquiredUniqueIds: [...edited.acquiredUniqueIds],
    containers: captureAsteroidBlocks(frame, canonical.containers, baseline.containers, edited.containers, lootCodec) };
  validateLoot(output); return output;
}

type SpellRecords = NonNullable<WorldSave["spellWorldState"]>;
const spellFields = { schema: true, ironwakeWard: true, tidemendSites: true } satisfies Record<keyof SpellRecords, true>;
function validateSpells(value: SpellRecords) {
  canonicalJson(value);
  if (!isUniverseRecord(value) || value.schema !== 1 || Object.keys(value).some(key => !Object.hasOwn(spellFields, key)))
    throw Error("Invalid or unsupported attached spell state.");
  if (Object.hasOwn(value, "ironwakeWard") && value.ironwakeWard !== null) {
    const ward = value.ironwakeWard;
    if (!isUniverseRecord(ward)) throw Error("Invalid attached Ironwake ward.");
    assertExactKeys(ward, ["fragments", "expiresAt"], "Attached Ironwake ward");
    if (!Number.isSafeInteger(ward.fragments) || Number(ward.fragments) < 0 || Number(ward.fragments) > 6
      || typeof ward.expiresAt !== "number" || !Number.isFinite(ward.expiresAt) || ward.expiresAt < 0) throw Error("Invalid attached Ironwake ward.");
  }
  if (Object.hasOwn(value, "tidemendSites")) {
    if (!isUniverseRecord(value.tidemendSites) || Object.keys(value.tidemendSites).length > 512) throw Error("Invalid attached Tidemend history.");
    for (const [key, expires] of Object.entries(value.tidemendSites)) {
      asteroidHistoryRegionCoordinates(key, 16);
      if (typeof expires !== "number" || !Number.isFinite(expires) || expires < 0) throw Error("Invalid attached Tidemend deadline.");
    }
  }
}
function humanSide(frame: AsteroidAttachmentFrame, actor: AttachmentActorBody): boolean {
  canonicalJson(actor);
  if (!actor.id || actor.kind !== "human") throw Error("Ironwake requires the actual host-owned local human body.");
  return asteroidAttachmentVolumeSide(frame, actor.bounds, "orbit");
}
export type AsteroidSpellView = Readonly<{
  frameId: string; canonicalLocationId: AsteroidAttachmentFrame["orbitId"];
  wardActorId: string | null; actorBaseline: string; fields: SpellRecords;
}>;
export function asteroidTidemendSiteKey(frame: AsteroidAttachmentFrame, x: number, z: number, view: AsteroidAttachmentView): string {
  return asteroidHistoryRegionKey(frame, x, z, view, 16);
}
/** Tidemend keys are 16-block XZ cooldown regions, NOT authored POI IDs. They
 * remain canonical. Ironwake is the current local human's finite fragment ward,
 * not a station aura or drone inventory. Only that human's selected body sees
 * it; original absent/null distinctions and exact deadlines remain intact. */
export function projectAsteroidSpells(frame: AsteroidAttachmentFrame, canonical: SpellRecords,
  localHuman: AttachmentActorBody): AsteroidSpellView {
  validateSpells(canonical); const inside = humanSide(frame, localHuman), fields = cloneUniverseJson(canonical);
  if (!inside) delete fields.ironwakeWard;
  if (fields.tidemendSites) fields.tidemendSites = Object.fromEntries(Object.entries(fields.tidemendSites)
    .filter(([key]) => asteroidHistoryRegionTouches(frame, key, 16)));
  return { frameId: frame.frameId, canonicalLocationId: frame.orbitId, wardActorId: inside ? localHuman.id : null,
    actorBaseline: canonicalJson(localHuman), fields };
}
/** Pure selected spell capture. Caller proves time, local-player resource
 * consumption and owner revision atomically. Crossing/joining actors need a
 * fresh transition; expired cooldown cleanup needs separate canonical handling
 * instead of silently dropping entries to bypass a timer or storage limit. */
export function captureAsteroidSpells(frame: AsteroidAttachmentFrame, canonical: SpellRecords, baseline: AsteroidSpellView,
  edited: AsteroidSpellView, humans: Readonly<{ before: AttachmentActorBody; after: AttachmentActorBody }>): SpellRecords {
  const expected = projectAsteroidSpells(frame, canonical, humans.before);
  if (canonicalJson(expected) !== canonicalJson(baseline)) throw Error("Stale attached spell projection.");
  assertExactKeys(edited, ["frameId", "canonicalLocationId", "wardActorId", "actorBaseline", "fields"], "Attached spell view");
  if (edited.frameId !== baseline.frameId || edited.canonicalLocationId !== baseline.canonicalLocationId
    || edited.wardActorId !== baseline.wardActorId || edited.actorBaseline !== baseline.actorBaseline)
    throw Error("Foreign attached spell view binding.");
  const inside = humanSide(frame, humans.before), after = humanSide(frame, humans.after);
  if (humans.before.id !== humans.after.id || humans.before.connectionId !== humans.after.connectionId || inside !== after)
    throw Error("Attached local human membership changed.");
  validateSpells(edited.fields);
  const output = cloneUniverseJson(canonical);
  if (inside) {
    if (Object.hasOwn(canonical, "ironwakeWard") && !Object.hasOwn(edited.fields, "ironwakeWard")) throw Error("Attached ward field was omitted.");
    if (Object.hasOwn(edited.fields, "ironwakeWard")) output.ironwakeWard = cloneUniverseJson(edited.fields.ironwakeWard!);
  } else if (Object.hasOwn(edited.fields, "ironwakeWard")) throw Error("Ward belongs to an outside local human.");
  if (Object.hasOwn(baseline.fields, "tidemendSites") && !Object.hasOwn(edited.fields, "tidemendSites")) throw Error("Attached cooldown history was omitted.");
  if (edited.fields.tidemendSites) {
    if (Object.keys(edited.fields.tidemendSites).some(key => !asteroidHistoryRegionTouches(frame, key, 16))) throw Error("Edited cooldown region is outside the attached frame.");
    if (Object.entries(baseline.fields.tidemendSites ?? {}).some(([key, expires]) => !Object.hasOwn(edited.fields.tidemendSites!, key)
      || edited.fields.tidemendSites![key] < expires)) throw Error("Attached cooldown history cannot be removed or rewound.");
    output.tidemendSites = { ...Object.fromEntries(Object.entries(canonical.tidemendSites ?? {}).filter(([key]) => !asteroidHistoryRegionTouches(frame, key, 16))),
      ...edited.fields.tidemendSites };
  }
  validateSpells(output); return output;
}
