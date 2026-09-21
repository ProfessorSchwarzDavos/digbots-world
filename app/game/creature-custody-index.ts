import type { InventorySlot } from "./data";
import type { CaptureOrb } from "./capture-orbs";
import type { SavedCreature } from "./engine";
import { MOB_DEFS } from "./mobs";
import { assertKnownAsteroidEntityFields } from "./asteroid-attachment-entities";
import { readExactEncodedCaptureOrb, readStoredCreatureCustody, type StoredCreatureCustody } from "./stored-creature-custody";
import { custodyJsonIdentity } from "./wayworks-custody";
import { assertExactKeys, canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

/** Paths name actual canonical storage, not display labels or physical bounds.
 * Components remain separate so names containing slashes cannot alias a path. */
export type CreatureCustodyPath = readonly (string | number)[];
export type CreatureCustodySources = Readonly<{
  inventorySlots: readonly Readonly<{ path: CreatureCustodyPath; slot: InventorySlot | null }>[];
  orbRecords: readonly Readonly<{ path: CreatureCustodyPath; orb: CaptureOrb | null }>[];
  creatures: readonly SavedCreature[];
  sleepingCreatures: readonly SavedCreature[];
}>;
export type CreatureCustodyBody = Readonly<{
  collection: "creatures" | "sleepingCreatures";
  creature: SavedCreature;
}>;
export type CreatureCustodyIndex = Readonly<{
  sourceBaseline: string;
  stored: readonly Readonly<{
    path: CreatureCustodyPath;
    custody: StoredCreatureCustody;
    /** One deployed representation of this same specimen, never a second owner. */
    body: CreatureCustodyBody | null;
  }>[];
  freeBodies: readonly CreatureCustodyBody[];
}>;

function identifier(value: unknown, maximum = 160): asserts value is string {
  if (typeof value !== "string" || !value || value.length > maximum || value.trim() !== value)
    throw Error("Invalid creature custody identity.");
}
function pathKey(path: CreatureCustodyPath): string {
  if (!Array.isArray(path) || !path.length) throw Error("Missing canonical creature custody path.");
  for (const part of path) {
    if (typeof part === "number") {
      if (!Number.isSafeInteger(part) || part < 0) throw Error("Invalid canonical creature custody path index.");
    } else identifier(part, 512);
  }
  return canonicalJson(path);
}
function directOrb(orb: CaptureOrb | null): StoredCreatureCustody | null {
  if (orb === null) return null;
  const encoded = custodyJsonIdentity(orb), read = readExactEncodedCaptureOrb(encoded);
  if (!read.creature) return null;
  return { format: "capture-orb", containerId: read.orbId, capturedAt: read.capturedAt,
    creature: read.creature, attunement: read.attunement ?? null, encoded };
}

/** Reconcile all PROVIDED canonical vessels and live/sleeping bodies. The caller
 * still has to enumerate every owner (including nested cargo and housed animals)
 * at one authoritative revision. This is not an attestation of completeness,
 * spatial membership, an ownership transfer, or permission to move a creature. */
export function indexCreatureCustody(sources: CreatureCustodySources): CreatureCustodyIndex {
  if (!isUniverseRecord(sources)) throw Error("Invalid creature custody sources.");
  assertExactKeys(sources, ["inventorySlots", "orbRecords", "creatures", "sleepingCreatures"], "Creature custody sources");
  if (![sources.inventorySlots, sources.orbRecords, sources.creatures, sources.sleepingCreatures].every(Array.isArray))
    throw Error("Invalid creature custody source collections.");
  const paths = new Set<string>(), containers = new Set<string>(), specimens = new Set<string>();
  const stored: { path: CreatureCustodyPath; custody: StoredCreatureCustody; body: CreatureCustodyBody | null }[] = [];
  const register = (path: CreatureCustodyPath, custody: StoredCreatureCustody | null) => {
    const key = pathKey(path);
    if (paths.has(key)) throw Error("Duplicate canonical creature custody path.");
    paths.add(key);
    if (!custody) return;
    const container = canonicalJson([custody.format === "lantern-jar" ? "jar" : "orb", custody.containerId]);
    if (containers.has(container) || specimens.has(custody.creature.entityId)) throw Error("Duplicate stored creature custody.");
    containers.add(container); specimens.add(custody.creature.entityId);
    stored.push({ path, custody, body: null });
  };
  for (const value of sources.inventorySlots) {
    if (!isUniverseRecord(value)) throw Error("Invalid creature custody inventory source.");
    assertExactKeys(value, ["path", "slot"], "Creature custody inventory source");
    register(value.path, readStoredCreatureCustody(value.slot));
  }
  for (const value of sources.orbRecords) {
    if (!isUniverseRecord(value)) throw Error("Invalid creature custody orb source.");
    assertExactKeys(value, ["path", "orb"], "Creature custody orb source");
    register(value.path, directOrb(value.orb));
  }
  assertKnownAsteroidEntityFields({ creatures: sources.creatures, sleepingCreatures: sources.sleepingCreatures, boats: [], drops: [], leads: [] });
  const bodies = new Map<number, CreatureCustodyBody>(), bodySpecimens = new Set<string>();
  for (const collection of ["creatures", "sleepingCreatures"] as const) for (const creature of sources[collection]) {
    custodyJsonIdentity(creature);
    if (!isUniverseRecord(creature) || !Number.isSafeInteger(creature.id) || creature.id < 0 || bodies.has(creature.id)
      || !Object.hasOwn(MOB_DEFS, creature.kind) || ![creature.x, creature.y, creature.z, creature.yaw, creature.health, creature.age].every(Number.isFinite)
      || creature.health < 0 || creature.age < 0) throw Error("Invalid or duplicate creature custody body.");
    for (const key of ["specimenId", "attunedOrbId", "creatureOwnerId"] as const) {
      if (!Object.hasOwn(creature, key)) continue;
      if (key !== "specimenId" && creature[key] === null) continue;
      identifier(creature[key], key === "attunedOrbId" ? 80 : 160);
    }
    if (creature.specimenId !== undefined) {
      if (bodySpecimens.has(creature.specimenId)) throw Error("Duplicate live or sleeping specimen custody.");
      bodySpecimens.add(creature.specimenId);
    }
    bodies.set(creature.id, { collection, creature });
  }
  const deployed = new Set<number>();
  for (const entry of stored) {
    const { custody } = entry, activeId = custody.attunement?.activeEntityId;
    if (!activeId) {
      if (bodySpecimens.has(custody.creature.entityId)) throw Error("Stored creature also has an unlinked physical body.");
      continue;
    }
    // Runtime commits the decimal live mob ID after deployment. A temporary
    // specimen-ID placeholder from the deployment reducer is not a live link.
    const body = bodies.get(Number(activeId)), creature = body?.creature;
    if (!body || !creature || String(creature.id) !== activeId || deployed.has(creature.id)
      || creature.attunedOrbId !== custody.containerId || creature.specimenId !== custody.creature.entityId
      || creature.kind !== custody.creature.kind || creature.creatureOwnerId !== custody.attunement!.ownerId
      || creature.geneticSeed !== undefined && creature.geneticSeed !== custody.creature.geneticSeed)
      throw Error("Unresolved or mismatched deployed creature custody.");
    deployed.add(creature.id); entry.body = body;
  }
  const freeBodies: CreatureCustodyBody[] = [];
  for (const body of bodies.values()) if (!deployed.has(body.creature.id)) {
    if (body.creature.attunedOrbId) throw Error("Attuned body has no unique canonical orb owner.");
    freeBodies.push(body);
  }
  return freezeUniverseJson(cloneUniverseJson({ sourceBaseline: canonicalJson(sources), stored, freeBodies }));
}
