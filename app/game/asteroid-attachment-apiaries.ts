import { APIARY_FORAGING_SCAN, APIARY_HONEY_CAP, APIARY_JELLY_CAP, APIARY_NECTAR_CAP, APIARY_WORKER_CAP,
  type ApiaryBee, type ApiaryBlockState } from "./apiary";
import { Item } from "./data";
import { captureOrbFromInventorySlot, decodeCaptureOrb, type CaptureOrb } from "./capture-orbs";
import { validCustodyItem } from "./wayworks-custody";
import { assertKnownAsteroidEntityFields } from "./asteroid-attachment-entities";
import { asteroidAttachmentContainsCell, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide, asteroidCreatureFootprintSide } from "./asteroid-attachment-creature-footprint";
import { captureAsteroidBlocks, opaqueAsteroidBlockCodec, projectAsteroidBlocks } from "./asteroid-attachment-blocks";
import type { AsteroidEntityDependency } from "./asteroid-attachment-relationships";
import type { SavedCreature } from "./engine";
import { assertExactKeys, canonicalJson, cloneUniverseJson, isUniverseRecord } from "./universe-json";

export type AsteroidApiarySources = Readonly<{
  apiaries: Readonly<Record<string, ApiaryBlockState>>;
  creatures: readonly SavedCreature[]; sleepingCreatures: readonly SavedCreature[];
  /** Actual live beeHiveKey bodies, which engine.serialize() excludes. These
   * are representations of hive-owned bees, never additional durable residents. */
  visuals: readonly Readonly<{ hiveKey: string; creature: SavedCreature }>[];
}>;
export type AsteroidApiaryProjection = Readonly<{
  apiaries: Record<string, ApiaryBlockState>;
  visualCreatureIds: readonly number[];
  dependencies: readonly AsteroidEntityDependency[];
  sourceBaseline: string;
}>;
const fields = { schema: true, attached: true, queen: true, queenOrb: true, queenDisplayEnabled: true, workers: true,
  nectar: true, honey: true, royalJelly: true, honeyClock: true, jellyClock: true, workerGrowthClock: true,
  nextWorkerSerial: true } satisfies Record<keyof ApiaryBlockState, true>;
const beeFields = { id: true, role: true, alive: true, home: true, outbound: true, carryingNectar: true, lastReturnDay: true,
  disconnectedDay: true, geneticSeed: true, angry: true, tamed: true, ownerId: true, storedOrb: true } satisfies Record<keyof ApiaryBee, true>;
const codec = opaqueAsteroidBlockCodec<ApiaryBlockState>();
function record(value: unknown): asserts value is Record<string, unknown> {
  if (!isUniverseRecord(value)) throw Error("Invalid attached apiary record.");
}
function bounded(value: unknown, max = Number.MAX_VALUE): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max;
}
function counter(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return bounded(value, max) && Number.isSafeInteger(value);
}
function textId(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}
function validateBee(bee: ApiaryBee, role: ApiaryBee["role"]): void {
  record(bee);
  const keys = Object.keys(beeFields).filter(key => key !== "storedOrb" || Object.hasOwn(bee, key));
  assertExactKeys(bee, keys, "Attached bee");
  if (!textId(bee.id, 80) || !["queen", "worker"].includes(bee.role) || bee.role !== role || [bee.alive, bee.home, bee.outbound, bee.angry, bee.tamed].some(value => typeof value !== "boolean")
    || !bounded(bee.carryingNectar, 4) || !counter(bee.lastReturnDay) || bee.disconnectedDay !== null && !counter(bee.disconnectedDay)
    || !counter(bee.geneticSeed, 0xffffffff) || bee.ownerId !== null && (typeof bee.ownerId !== "string" || bee.ownerId.length > 160))
    throw Error("Invalid attached bee identity or state.");
  if (Object.hasOwn(bee, "storedOrb") && bee.storedOrb !== null) {
    record(bee.storedOrb); assertExactKeys(bee.storedOrb, ["item", "count", "captureOrb"], "Attached bee orb");
    if (bee.storedOrb.item !== Item.CaptureOrb || bee.storedOrb.count !== 1 || !textId(bee.storedOrb.captureOrb, 64_000))
      throw Error("Invalid attached bee orb.");
  }
}
function beeKind(bee: ApiaryBee) { return bee.role === "queen" ? "hive-queen" : "honeybee"; }

function selection(frame: AsteroidAttachmentFrame, sources: AsteroidApiarySources) {
  canonicalJson(sources); assertExactKeys(sources, ["apiaries", "creatures", "sleepingCreatures", "visuals"], "Apiary sources");
  record(sources.apiaries);
  assertKnownAsteroidEntityFields({ creatures: [...sources.creatures, ...sources.visuals.map(value => value.creature)],
    sleepingCreatures: sources.sleepingCreatures, boats: [], drops: [], leads: [] });
  const bees = new Map<string, { bee: ApiaryBee; side: boolean; hiveKey: string | null }>(), hiveSides = new Map<string, boolean>();
  const orbIds = new Set<string>(), storedSpecimens = new Set<string>();
  const registerOrb = (orb: CaptureOrb | null, bee: ApiaryBee, queenSlot = false) => {
    // The encoded custody payload remains byte-for-byte opaque; decoding here
    // establishes only its existing identity, species and non-deployed state.
    const customBee = orb?.creature?.custom.apiaryBee;
    const identity = queenSlot && isUniverseRecord(customBee) ? customBee.id : orb?.creature?.entityId;
    if (!orb?.creature || orb.creature.kind !== beeKind(bee) || identity !== bee.id || orb.attunement?.activeEntityId
      || orbIds.has(orb.orbId) || storedSpecimens.has(orb.creature.entityId)) throw Error("Unresolved or duplicate attached apiary orb custody.");
    orbIds.add(orb.orbId); storedSpecimens.add(orb.creature.entityId);
  };
  const registerBee = (bee: ApiaryBee, side: boolean, hiveKey: string | null) => {
    if (bees.has(bee.id)) throw Error("Duplicate attached bee custody.");
    bees.set(bee.id, { bee, side, hiveKey });
    if (bee.storedOrb) registerOrb(decodeCaptureOrb(bee.storedOrb.captureOrb), bee);
  };
  for (const [key, hive] of Object.entries(sources.apiaries)) {
    record(hive); assertExactKeys(hive, Object.keys(fields), "Attached apiary");
    const side = asteroidAttachmentContainsCell(frame, key, "orbit"), [x, y, z] = key.split(",").map(Number);
    const { radius, verticalRadius } = APIARY_FORAGING_SCAN;
    // Neighboring hives may share flowers: query envelopes are not exclusive
    // cell custody, so do not feed them into the disjoint block-component codec.
    const querySide = asteroidAttachmentVolumeSide(frame, { minX: x - radius - .5, maxX: x + radius + .5,
      minY: y - verticalRadius - .5, maxY: y + verticalRadius + .5, minZ: z - radius - .5, maxZ: z + radius + .5 }, "orbit");
    if (querySide !== side) throw Error("Apiary flower query crosses the attachment boundary.");
    if (hive.schema !== 1 || typeof hive.attached !== "boolean" || typeof hive.queenDisplayEnabled !== "boolean"
      || !Array.isArray(hive.workers) || hive.workers.length > APIARY_WORKER_CAP || !bounded(hive.nectar, APIARY_NECTAR_CAP)
      || !bounded(hive.honey, APIARY_HONEY_CAP) || !bounded(hive.royalJelly, APIARY_JELLY_CAP)
      || ![hive.honeyClock, hive.jellyClock, hive.workerGrowthClock].every(value => bounded(value)) || !counter(hive.nextWorkerSerial))
      throw Error("Invalid attached apiary production state.");
    if (hive.queen === null) {
      if (hive.queenOrb !== null || hive.queenDisplayEnabled) throw Error("Dormant apiary retains a queen owner.");
    } else {
      validateBee(hive.queen, "queen"); registerBee(hive.queen, side, key);
      if (hive.queenOrb !== null) {
        if (!validCustodyItem(hive.queenOrb)) throw Error("Invalid attached queen inventory custody.");
        registerOrb(captureOrbFromInventorySlot(hive.queenOrb), hive.queen, true);
      }
    }
    for (const worker of hive.workers) { validateBee(worker, "worker"); registerBee(worker, side, key); }
    hiveSides.set(key, side);
  }
  const creatureIds = new Set<number>(), specimens = new Set<string>(), dependencies: AsteroidEntityDependency[] = [];
  const identify = (creature: SavedCreature) => {
    if (!counter(creature.id) || creatureIds.has(creature.id) || creature.specimenId !== undefined
      && (!textId(creature.specimenId, 160) || specimens.has(creature.specimenId))) throw Error("Duplicate or invalid apiary actor identity.");
    creatureIds.add(creature.id); if (creature.specimenId !== undefined) specimens.add(creature.specimenId);
  };
  for (const creature of [...sources.creatures, ...sources.sleepingCreatures]) {
    identify(creature);
    if (!creature.apiaryBee) continue;
    const bee = creature.apiaryBee; validateBee(bee, bee.role);
    if (creature.kind !== beeKind(bee)) throw Error("Free bee differs from its saved species.");
    const side = asteroidCreatureFootprintSide(frame, creature, "orbit"); registerBee(bee, side, null);
    dependencies.push({ kind: "apiary-bee", id: bee.id, attached: side });
  }
  const visualBeeIds = new Set<string>(), visualCreatureIds: number[] = [];
  for (const visual of sources.visuals) {
    assertExactKeys(visual, ["hiveKey", "creature"], "Apiary visual"); identify(visual.creature);
    const creature = visual.creature, bee = creature.apiaryBee;
    if (!bee) throw Error("Apiary visual lacks its resident identity.");
    validateBee(bee, bee.role); const owner = bees.get(bee.id);
    if (!owner || owner.hiveKey !== visual.hiveKey || !hiveSides.has(visual.hiveKey) || visualBeeIds.has(bee.id)
      || creature.kind !== beeKind(owner.bee) || !owner.bee.alive) throw Error("Unresolved or duplicate apiary visual owner.");
    // Flight/nectar animation differs legitimately. Identity/ownership changes
    // must first reconcile with the canonical hive, never disappear on unload.
    for (const key of ["role", "geneticSeed", "alive", "angry", "tamed", "ownerId"] as const)
      if (bee[key] !== owner.bee[key]) throw Error("Apiary visual ownership differs from its canonical hive.");
    if (canonicalJson(bee.storedOrb ?? null) !== canonicalJson(owner.bee.storedOrb ?? null)) throw Error("Apiary visual has different stored custody.");
    visualBeeIds.add(bee.id);
    if (asteroidCreatureFootprintSide(frame, creature, "orbit") !== owner.side) throw Error("Apiary visual crosses its hive attachment boundary.");
    if (owner.side) visualCreatureIds.push(creature.id);
  }
  return { dependencies, visualCreatureIds };
}

/** Whole canonical hive/free-bee/display-body preflight. Inventory elsewhere,
 * active defense targets, complete entity relationships and authoritative
 * time/resource events still belong to the global owner transaction. */
export function projectAsteroidApiaries(frame: AsteroidAttachmentFrame, sources: AsteroidApiarySources): AsteroidApiaryProjection {
  const selected = selection(frame, sources);
  return { apiaries: projectAsteroidBlocks(frame, sources.apiaries, codec), ...selected, sourceBaseline: canonicalJson(sources) };
}

/** Pure hive after-image merge. The complete canonical AFTER creature/visual
 * collection is mandatory, so extraction cannot leave the same bee in a hive
 * and as a free body. No hatching, production or item debit is authorized here. */
export function captureAsteroidApiaries(frame: AsteroidAttachmentFrame, sources: AsteroidApiarySources, baseline: AsteroidApiaryProjection,
  edited: Readonly<Record<string, ApiaryBlockState>>, after: Omit<AsteroidApiarySources, "apiaries">): Record<string, ApiaryBlockState> {
  if (canonicalJson(projectAsteroidApiaries(frame, sources)) !== canonicalJson(baseline)) throw Error("Stale apiary attachment projection.");
  assertExactKeys(after, ["creatures", "sleepingCreatures", "visuals"], "Apiary after-image sources");
  const apiaries = captureAsteroidBlocks(frame, sources.apiaries, baseline.apiaries, edited, codec);
  selection(frame, { ...cloneUniverseJson(after), apiaries }); return apiaries;
}
