import type { AttachmentActorBody } from "./attachment-actor-bodies";
import { encodeAttachmentSource } from "./attachment-source-preimage";
import { hydrateAsteroidAttachmentLocation } from "./asteroid-attachment-catalog";
import { validateAsteroidFields } from "./asteroid-runtime";
import { CREATURE_CUSTODY_FIELDS, collectCreatureCustodyPartition, type CreatureCustodyPartitionSource, type WorldCreatureCustodySource } from "./creature-custody-sources";
import type { CreatureCustodyPath } from "./creature-custody-index";
import { validateCreatureEncounterSources, type CreatureEncounterSources } from "./creature-encounter-custody";
import { parseLocationId, universeId, type LocationId, type UniverseId } from "./location-address";
import { indexScopedCreatureCustody, type ScopedCreatureCustodySources } from "./scoped-creature-custody-index";
import { reconcileScopedCreatureEncounterCustody, type CreatureResidentFamily } from "./scoped-creature-encounters";
import { canonicalJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";
import { GUEST_LOCATION_FIELDS, WORLD_SAVE_OWNERS, type SaveFields, type SaveOwner } from "./universe-save";
import type { UniverseSnapshot } from "./universe-storage";

/** Structural view of an already verified repository observation. This module
 * does not read storage, authenticate a caller, acquire a lease or verify hashes.
 * Keeping the view narrow lets unit fixtures state exactly what they exercise. */
export type UniverseCreatureCustodySnapshot = Readonly<{
  manifest: Pick<UniverseSnapshot["manifest"], "id" | "universeId" | "revision" | "currentLocationId" | "currentPlayerId" | "deletedAt">;
  universe: Pick<UniverseSnapshot["universe"], "fields" | "attachmentOwners">;
  locations: readonly Readonly<{
    descriptor: Pick<UniverseSnapshot["locations"][number]["descriptor"], "id" | "universeId" | "revision">;
    fields: SaveFields;
  }>[];
  players: readonly Pick<UniverseSnapshot["players"][number], "playerId" | "locationId" | "fields">[];
}>;
export type LiveUniverseCreatureCustody = Readonly<{
  universeId: UniverseId;
  repositoryRevision: number;
  playerId: string;
  locationId: LocationId;
  /** Explicit binding: repository player "host" need not equal transport ID. */
  actorId: string;
  actors: readonly AttachmentActorBody[];
  source: WorldCreatureCustodySource;
  encounterSources: CreatureEncounterSources;
}>;
export type UniverseCreatureCustodyPath = Readonly<{
  path: CreatureCustodyPath;
  localPath: CreatureCustodyPath;
  family: keyof WorldCreatureCustodySource;
  owner: SaveOwner;
  ownerId: string;
  locationId: LocationId | null;
}>;

function identifier(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value || value.trim() !== value) throw Error("Invalid universe custody owner identity.");
}
function fieldsForOwner(fields: SaveFields, owner: SaveOwner): CreatureCustodyPartitionSource {
  if (!isUniverseRecord(fields)) throw Error("Missing universe custody partition fields.");
  const selected: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (owner === "location" && key === GUEST_LOCATION_FIELDS) continue;
    if (!Object.hasOwn(WORLD_SAVE_OWNERS, key) || WORLD_SAVE_OWNERS[key as keyof typeof WORLD_SAVE_OWNERS] !== owner)
      throw Error("Universe custody field has conflicting partition ownership.");
    if (Object.hasOwn(CREATURE_CUSTODY_FIELDS, key)) selected[key] = value;
  }
  return selected;
}
function encountersIn(fields: SaveFields): CreatureEncounterSources {
  const sources = {
    primeEncounters: Object.hasOwn(fields, "primeEncounters") ? fields.primeEncounters : {},
    legendaryEncounters: Object.hasOwn(fields, "legendaryEncounters") ? fields.legendaryEncounters : {},
  } as CreatureEncounterSources;
  validateCreatureEncounterSources(sources);
  return sources;
}

/** Visit every canonical owner exactly once. Current runtime replaces only the
 * manifest-bound universe, player and location slices; inactive owners come
 * from that same repository snapshot. Shared guest/archive/fleet holdings are
 * never copied into every location. Present holder location is NOT origin.
 * This joins custody identity only, not encounter semantics or physical/atomic
 * transfer authority. The existing travel and local-asteroid gates stay closed. */
export function collectUniverseCreatureCustody(snapshot: UniverseCreatureCustodySnapshot, live: LiveUniverseCreatureCustody) {
  // Inspect descriptors before dereferencing, projecting, hydrating or cloning.
  // Exact raw tags retain own undefined and -0 in the preimage; later semantic
  // visitors may refuse unsupported records but cannot silently erase them.
  const source = encodeAttachmentSource({ snapshot, live });
  const manifest = snapshot.manifest, expected = universeId(manifest.universeId);
  if (manifest.id !== expected || live.universeId !== expected || manifest.deletedAt !== null
    || !Number.isSafeInteger(manifest.revision) || manifest.revision < 1
    || live.repositoryRevision !== manifest.revision || live.playerId !== manifest.currentPlayerId
    || live.locationId !== manifest.currentLocationId)
    throw Error("Live creature custody is not bound to the current repository manifest.");
  identifier(live.playerId); identifier(live.actorId);
  const locations = new Map<LocationId, UniverseCreatureCustodySnapshot["locations"][number]>();
  for (const location of snapshot.locations) {
    const descriptor = location.descriptor;
    if (parseLocationId(descriptor.id).universeId !== expected || descriptor.universeId !== expected
      || locations.has(descriptor.id) || !Number.isSafeInteger(descriptor.revision) || descriptor.revision < 0)
      throw Error("Duplicate, foreign or invalid universe custody location.");
    fieldsForOwner(location.fields, "location");
    locations.set(descriptor.id, location);
  }
  if (!locations.has(live.locationId)) throw Error("Current universe custody location is missing.");
  const players = new Map<string, UniverseCreatureCustodySnapshot["players"][number]>();
  for (const player of snapshot.players) {
    identifier(player.playerId);
    if (players.has(player.playerId) || !locations.has(player.locationId))
      throw Error("Duplicate player or missing universe custody player location.");
    fieldsForOwner(player.fields, "player");
    players.set(player.playerId, player);
  }
  if (players.get(live.playerId)?.locationId !== live.locationId)
    throw Error("Current universe custody player is missing or in another location.");
  fieldsForOwner(snapshot.universe.fields, "universe");
  const actors = new Map<string, AttachmentActorBody>();
  for (const actor of live.actors) {
    identifier(actor.id);
    if (!["human", "drone"].includes(actor.kind) || actors.has(actor.id)) throw Error("Invalid or duplicate typed custody actor.");
    actors.set(actor.id, actor);
  }
  const host = actors.get(live.actorId);
  if (!host || host.kind !== "human" || host.connectionId !== null) throw Error("Current custody player lacks its explicit local human binding.");
  if (Object.keys(live.source).length !== Object.keys(CREATURE_CUSTODY_FIELDS).length
    || Object.keys(CREATURE_CUSTODY_FIELDS).some(key => !Object.hasOwn(live.source, key)))
    throw Error("Live universe custody must explicitly observe every canonical source family.");
  const active: Record<SaveOwner, Record<string, unknown>> = { player: {}, location: {}, universe: {} };
  for (const [key, value] of Object.entries(live.source)) {
    if (!Object.hasOwn(CREATURE_CUSTODY_FIELDS, key)) throw Error("Unsupported live universe custody source field.");
    active[WORLD_SAVE_OWNERS[key as keyof WorldCreatureCustodySource]][key] = value;
  }
  validateCreatureEncounterSources(live.encounterSources);
  const scoped = { inventorySlots: [], orbRecords: [], residents: [], creatures: [], sleepingCreatures: [] } as {
    -readonly [K in keyof ScopedCreatureCustodySources]: ScopedCreatureCustodySources[K][number][]
  };
  const paths: UniverseCreatureCustodyPath[] = [], aliases: { path: CreatureCustodyPath; canonicalPath: CreatureCustodyPath }[] = [];
  const partitions: { owner: SaveOwner; ownerId: string; locationId: LocationId | null; runtime: boolean; sourceBaseline: string }[] = [];
  const histories: { locationId: LocationId; runtime: boolean; sources: CreatureEncounterSources }[] = [];
  const knownLocation = (value: LocationId): LocationId => {
    if (parseLocationId(value).universeId !== expected || !locations.has(value)) throw Error("Custody holder references an unobserved location.");
    return value;
  };
  const visit = (owner: SaveOwner, ownerId: string, locationId: LocationId | null, fields: CreatureCustodyPartitionSource, runtime: boolean) => {
    const collected = collectCreatureCustodyPartition(fields, owner), prefix = [owner, ownerId];
    partitions.push({ owner, ownerId, locationId, runtime, sourceBaseline: collected.sourceBaseline });
    const locate = (path: CreatureCustodyPath): LocationId | null => {
      if (owner !== "universe") return locationId;
      if (path[0] === "multiplayerPlayers") {
        const actorId = String(path[1]), actor = actors.get(actorId);
        if (actorId === live.actorId || players.has(actorId))
          throw Error("Shared guest custody overlaps a repository player identity.");
        if (actor?.kind === "drone") throw Error("Human guest custody cannot be assigned to a drone actor.");
        return actor?.kind === "human" ? live.locationId : null;
      }
      if (path[0] === "spacefleet") {
        const vehicle = fields.spacefleet?.vehicles[String(path[1])];
        if (!vehicle) throw Error("Missing canonical fleet custody owner.");
        return knownLocation(vehicle.locationId);
      }
      return null;
    };
    const pathInfo = (path: CreatureCustodyPath) => {
      const globalPath = [...prefix, ...path], holder = locate(path);
      paths.push({ path: globalPath, localPath: path, family: path[0] as keyof WorldCreatureCustodySource, owner, ownerId, locationId: holder });
      return { path: globalPath, locationId: holder };
    };
    for (const value of collected.sources.inventorySlots) scoped.inventorySlots.push({ ...value, ...pathInfo(value.path) });
    for (const value of collected.sources.orbRecords) scoped.orbRecords.push({ ...value, ...pathInfo(value.path) });
    for (const value of collected.sources.residents) scoped.residents.push({ ...value, ...pathInfo(value.path) });
    for (const collection of ["creatures", "sleepingCreatures"] as const) for (const creature of collected.sources[collection]) {
      if (owner !== "location" || locationId === null) throw Error("Creature body has no canonical location owner.");
      scoped[collection].push({ locationId, creature });
    }
    for (const alias of collected.aliases) aliases.push({ path: [...prefix, ...alias.path], canonicalPath: [...prefix, ...alias.canonicalPath] });
  };
  visit("universe", expected, null, active.universe, true);
  for (const [id, player] of [...players].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
    visit("player", id, player.locationId, id === live.playerId ? active.player : fieldsForOwner(player.fields, "player"), id === live.playerId);
  const asteroidFields = snapshot.universe.attachmentOwners === undefined ? null : validateAsteroidFields(snapshot.universe.fields.asteroidFields, expected);
  for (const [id, location] of [...locations].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    // Hydrate even the current persisted row: duplicate mirrors and unsupported
    // local asteroid views cannot be concealed by the runtime replacement.
    const hydrated = asteroidFields ? hydrateAsteroidAttachmentLocation(snapshot.universe.attachmentOwners!, asteroidFields, id, location.fields) : location.fields;
    const current = id === live.locationId;
    visit("location", id, id, current ? active.location : fieldsForOwner(hydrated, "location"), current);
    histories.push({ locationId: id, runtime: current, sources: current ? live.encounterSources : encountersIn(hydrated) });
  }
  const index = indexScopedCreatureCustody(scoped, expected);
  return freezeUniverseJson(structuredClone({ source, universeId: expected, repositoryRevision: manifest.revision,
    activePlayer: { playerId: live.playerId, actorId: live.actorId, locationId: live.locationId }, partitions, paths, aliases, sources: scoped, histories, index }));
}

/** Join every history only after enumerating every owner. The raw collector
 * above remains independently usable; neither API grants physical admission. */
export function reconcileUniverseCreatureCustody(snapshot: UniverseCreatureCustodySnapshot, live: LiveUniverseCreatureCustody) {
  const custody = collectUniverseCreatureCustody(snapshot, live);
  const paths = new Map(custody.paths.map(row => [canonicalJson(row.path), row]));
  const residentFamilies: CreatureResidentFamily[] = custody.index.residents.map(resident => {
    const provenance = paths.get(canonicalJson(resident.path));
    if (!provenance || provenance.family !== "aquariums" && provenance.family !== "fieldPerches")
      throw Error("Universe resident lacks its actual family provenance.");
    return { path: resident.path, family: provenance.family };
  });
  const histories = custody.histories.map(({ locationId, sources }) => ({ locationId, sources }));
  const encounters = reconcileScopedCreatureEncounterCustody(custody.sources, histories, residentFamilies, custody.universeId);
  return freezeUniverseJson({ ...custody, encounters });
}
