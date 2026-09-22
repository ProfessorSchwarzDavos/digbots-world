import type { InventorySlot } from "./data";
import type { CaptureOrb } from "./capture-orbs";
import type { CreatureMetadata } from "./creature-cage";
import type { SavedCreature } from "./engine";
import { assertKnownAsteroidEntityFields } from "./asteroid-attachment-entities";
import { assertCreatureCustodyBody, creatureCustodyPathKey, readDirectCreatureCustody, type CreatureCustodyPath } from "./creature-custody-index";
import { assertCreatureOriginsAgree, readCreatureMetadataOrigins, readCreatureOrigins, type CreatureOrigins } from "./creature-origins";
import { parseLocationId, universeId, type LocationId, type UniverseId } from "./location-address";
import { readExactCreatureMetadata, readStoredCreatureCustody, type StoredCreatureCustody } from "./stored-creature-custody";
import { canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";
import { custodyJsonIdentity } from "./wayworks-custody";

/** Paths are complete, globally unique canonical storage paths from the caller.
 * Holder locations describe present custody; they never establish provenance.
 * Null means genuinely unknown, including archives without a recorded location. */
export type ScopedCreatureCustodySources = Readonly<{
  inventorySlots: readonly Readonly<{ path: CreatureCustodyPath; locationId: LocationId | null; slot: InventorySlot | null }>[];
  orbRecords: readonly Readonly<{ path: CreatureCustodyPath; locationId: LocationId | null; orb: CaptureOrb | string | null }>[];
  residents: readonly Readonly<{ path: CreatureCustodyPath; locationId: LocationId | null; creature: CreatureMetadata }>[];
  creatures: readonly Readonly<{ locationId: LocationId; creature: SavedCreature }>[];
  sleepingCreatures: readonly Readonly<{ locationId: LocationId; creature: SavedCreature }>[];
}>;
export type ScopedCreatureCustodyBody = Readonly<{
  collection: "creatures" | "sleepingCreatures";
  locationId: LocationId;
  creature: SavedCreature;
}>;
export type ScopedStoredCreatureCustody = Readonly<{
  path: CreatureCustodyPath;
  locationId: LocationId | null;
  custody: StoredCreatureCustody;
  /** A deployed representation of this owner, not a second specimen owner. */
  body: ScopedCreatureCustodyBody | null;
}>;
export type ScopedCreatureCustodyIndex = Readonly<{
  sourceBaseline: string;
  stored: readonly ScopedStoredCreatureCustody[];
  residents: readonly Readonly<{ path: CreatureCustodyPath; locationId: LocationId | null; creature: CreatureMetadata }>[];
  freeBodies: readonly ScopedCreatureCustodyBody[];
}>;

function exactSource(value: unknown, keys: readonly string[]): void {
  if (!isUniverseRecord(value)) throw Error("Invalid scoped creature custody source.");
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || ownKeys.some(key => typeof key !== "string" || !keys.includes(key)
    || !Object.getOwnPropertyDescriptor(value, key)!.enumerable
    || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, "value")))
    throw Error("Scoped creature custody source has missing or unsupported fields.");
}

function sourceArray(value: unknown): void {
  if (!Array.isArray(value)) throw Error("Invalid scoped creature custody collection.");
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1 || keys.some(key => key !== "length" && (typeof key !== "string"
    || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length
    || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, "value"))))
    throw Error("Invalid scoped creature custody collection entries.");
}

/** Reconcile only the supplied owners and bodies. This does not enumerate all
 * global owners, join encounter history, authorize travel, admit physical cargo,
 * normalize records or repair legacy identity ambiguity. */
export function indexScopedCreatureCustody(sources: ScopedCreatureCustodySources, expectedUniverseId: UniverseId): ScopedCreatureCustodyIndex {
  universeId(expectedUniverseId);
  const families = ["inventorySlots", "orbRecords", "residents", "creatures", "sleepingCreatures"] as const;
  exactSource(sources, families);
  for (const family of families) sourceArray(sources[family]);
  const checkLocation = (location: LocationId) => {
    if (parseLocationId(location).universeId !== expectedUniverseId) throw Error("Creature custody location belongs to another universe.");
  };
  const checkOrigins = (origins: CreatureOrigins) => {
    for (const location of Object.values(origins)) if (parseLocationId(location).universeId !== expectedUniverseId)
      throw Error("Unsupported foreign creature provenance: cross-universe origin remapping is not implemented.");
  };
  const paths = new Set<string>(), containers = new Set<string>();
  const owners = new Map<string, Set<LocationId | null>>();
  const registerOwner = (id: string, origins: CreatureOrigins) => {
    checkOrigins(origins);
    const origin = origins.specimenOriginLocationId ?? null, previous = owners.get(id);
    if (previous) {
      if (origin === null || previous.has(null)) throw Error("Ambiguous legacy specimen custody: repeated bare identity has unknown origin.");
      if (previous.has(origin)) throw Error("Duplicate fully-qualified specimen custody owner.");
      previous.add(origin);
    } else owners.set(id, new Set([origin]));
  };
  const registerPath = (path: CreatureCustodyPath, location: LocationId | null) => {
    custodyJsonIdentity(path);
    const key = creatureCustodyPathKey(path);
    if (paths.has(key)) throw Error("Duplicate canonical creature custody path.");
    if (location !== null) checkLocation(location);
    paths.add(key);
  };
  const stored: { path: CreatureCustodyPath; locationId: LocationId | null; custody: StoredCreatureCustody; body: ScopedCreatureCustodyBody | null }[] = [];
  const registerStored = (path: CreatureCustodyPath, location: LocationId | null, custody: StoredCreatureCustody | null) => {
    registerPath(path, location);
    if (!custody) return;
    const container = canonicalJson([custody.format === "lantern-jar" ? "jar" : "orb", custody.containerId]);
    if (containers.has(container)) throw Error("Ambiguous duplicate filled creature vessel across canonical paths.");
    containers.add(container);
    registerOwner(custody.creature.entityId, readCreatureMetadataOrigins(custody.creature.custom));
    stored.push({ path, locationId: location, custody, body: null });
  };
  for (const value of sources.inventorySlots) {
    exactSource(value, ["path", "locationId", "slot"]);
    registerStored(value.path, value.locationId, readStoredCreatureCustody(value.slot));
  }
  for (const value of sources.orbRecords) {
    exactSource(value, ["path", "locationId", "orb"]);
    registerStored(value.path, value.locationId, readDirectCreatureCustody(value.orb));
  }
  const residents = sources.residents.map(value => {
    exactSource(value, ["path", "locationId", "creature"]);
    registerPath(value.path, value.locationId);
    const creature = readExactCreatureMetadata(value.creature);
    registerOwner(creature.entityId, readCreatureMetadataOrigins(creature.custom));
    return { path: value.path, locationId: value.locationId, creature };
  });

  const bodies = new Map<string, ScopedCreatureCustodyBody>();
  for (const collection of ["creatures", "sleepingCreatures"] as const) for (const value of sources[collection]) {
    exactSource(value, ["locationId", "creature"]);
    checkLocation(value.locationId);
    const { creature } = value;
    assertCreatureCustodyBody(creature);
    assertKnownAsteroidEntityFields({ creatures: [creature], sleepingCreatures: [], boats: [], drops: [], leads: [] });
    checkOrigins(readCreatureOrigins(creature));
    const key = canonicalJson([value.locationId, creature.id]);
    if (bodies.has(key)) throw Error("Duplicate creature custody body within one location.");
    bodies.set(key, { collection, locationId: value.locationId, creature });
  }
  const deployed = new Set<string>();
  for (const entry of stored) {
    const { custody } = entry, activeId = custody.attunement?.activeEntityId;
    if (!activeId) continue;
    if (entry.locationId === null) throw Error("Deployed creature custody requires an explicit holder location.");
    if (!/^(0|[1-9]\d*)$/.test(activeId) || !Number.isSafeInteger(Number(activeId)))
      throw Error("Unresolved or mismatched deployed creature custody.");
    const key = canonicalJson([entry.locationId, Number(activeId)]), body = bodies.get(key), creature = body?.creature;
    if (!body || !creature || String(creature.id) !== activeId || deployed.has(key)
      || creature.attunedOrbId !== custody.containerId || creature.specimenId !== custody.creature.entityId
      || creature.kind !== custody.creature.kind || creature.creatureOwnerId !== custody.attunement!.ownerId
      || creature.geneticSeed !== undefined && creature.geneticSeed !== custody.creature.geneticSeed)
      throw Error("Unresolved or mismatched deployed creature custody.");
    assertCreatureOriginsAgree(creature, custody.creature.custom);
    deployed.add(key); entry.body = body;
  }
  const freeBodies: ScopedCreatureCustodyBody[] = [];
  for (const [key, body] of bodies) if (!deployed.has(key)) {
    if (body.creature.attunedOrbId) throw Error("Attuned body has no unique canonical orb owner.");
    if (body.creature.specimenId !== undefined) registerOwner(body.creature.specimenId, readCreatureOrigins(body.creature));
    freeBodies.push(body);
  }
  return freezeUniverseJson(cloneUniverseJson({ sourceBaseline: canonicalJson(sources), stored, residents, freeBodies }));
}
