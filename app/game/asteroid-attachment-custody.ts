import { BlockId } from "./data";
import { collectWorldCreatureCustodyHolders, creatureCustodyHolderForPath, type CreatureCustodyHolder } from "./creature-custody-holders";
import type { CreatureCustodyPath } from "./creature-custody-index";
import { reconcileUniverseCreatureCustody, type LiveUniverseCreatureCustody, type UniverseCreatureCustodySnapshot } from "./universe-creature-custody";
import { encodeAttachmentSource } from "./attachment-source-preimage";
import type { WorldCreatureCustodySource } from "./creature-custody-sources";
import { asteroidAttachmentContainsCell, createAsteroidAttachmentFrame, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide, asteroidCreatureFootprintSide } from "./asteroid-attachment-creature-footprint";
import { asteroidSailboatFootprintSide } from "./asteroid-attachment-vehicle-footprint";
import { asteroidAttachedDropIndices } from "./asteroid-attachment-drops";
import { projectAsteroidBlockChests } from "./asteroid-attachment-chests";
import { projectAsteroidMachines } from "./asteroid-attachment-machines";
import { projectAsteroidApiaries, type AsteroidApiarySources } from "./asteroid-attachment-apiaries";
import { projectAsteroidFleet } from "./asteroid-attachment-fleet";
import type { AsteroidStationSources } from "./asteroid-attachment-stations";
import { selectAsteroidCustodyBlocks } from "./asteroid-attachment-custody-blocks";
import { selectAsteroidHabitats } from "./asteroid-attachment-habitats";
import { selectAsteroidInstallations } from "./asteroid-attachment-installations";
import { createAsteroidAttachmentWorld, type AsteroidAttachmentWorldSource } from "./asteroid-attachment-world";
import { chestCustodyOwner, parseCustodyCellKey } from "./chest-custody-owner";
import { buildAquariumTopology } from "./aquarium";
import { buildExhibitTopology, type ExhibitResident } from "./butterfly-exhibit";
import { aquariumBodyBounds, exhibitBodyBounds } from "./habitat-body";
import type { AttachmentActorBody } from "./attachment-actor-bodies";
import { canonicalJson, cloneUniverseJson, freezeUniverseJson } from "./universe-json";
import type { AsteroidEntityDependency } from "./asteroid-attachment-relationships";

export type AsteroidCustodySide = "attached" | "orbit" | "shared-universe" | "inactive-player" | "other-location";
export type AsteroidCustodyPhysicalContext = Readonly<{
  world: AsteroidAttachmentWorldSource;
  /** Actual same-turn host transport/model snapshot, not guest-supplied boxes. */
  actors: readonly AttachmentActorBody[];
  apiaryVisuals: AsteroidApiarySources["visuals"];
  stations: AsteroidStationSources;
  /** Same renderer producer as the source chest slots; no new specimen owner. */
  exhibitResidents: Readonly<Record<string, readonly ExhibitResident[]>>;
}>;

/** Join exact custody paths to whole physical holders. This is a read-only
 * preflight, not actor consent, resource authority, authored-site closure or a
 * save/transfer. Shared digital stores and offline player ledgers never become
 * copied local-frame storage. A deployed body cannot hide behind such a ledger.
 * Complete source/owner/session binding belongs to the synchronous host adapter.
 */
export function selectAsteroidCreatureCustody(frame: AsteroidAttachmentFrame, source: WorldCreatureCustodySource,
  hostPlayerId: string, context: AsteroidCustodyPhysicalContext) {
  const custody = collectWorldCreatureCustodyHolders(source, hostPlayerId);
  return selectPhysicalHolders(frame, source, hostPlayerId, context, custody.holders);
}

type PhysicalHolders = ReturnType<typeof collectWorldCreatureCustodyHolders>["holders"];

/** Shared whole-holder geometry, only called after an entry point reconciles
 * actual custody. This private primitive cannot accept an external authority. */
function selectPhysicalHolders(frame: AsteroidAttachmentFrame, source: WorldCreatureCustodySource,
  hostPlayerId: string, context: AsteroidCustodyPhysicalContext, holders: PhysicalHolders) {
  const world = createAsteroidAttachmentWorld(context.world);
  if (canonicalJson(frame) !== canonicalJson(createAsteroidAttachmentFrame(world.source.registry, frame.asteroidId)))
    throw Error("Custody frame differs from its canonical world source.");
  const side = (attached: boolean): AsteroidCustodySide => attached ? "attached" : "orbit";
  const cellSide = (key: string) => side(asteroidAttachmentContainsCell(frame, key, "orbit"));
  const actors = new Map<string, { body: AttachmentActorBody; side: AsteroidCustodySide }>();
  for (const body of context.actors) {
    if (!body.id || actors.has(body.id) || !["human", "drone"].includes(body.kind)) throw Error("Invalid custody actor binding.");
    actors.set(body.id, { body, side: side(asteroidAttachmentVolumeSide(frame, body.bounds, "orbit")) });
  }
  if (actors.get(hostPlayerId)?.body.kind !== "human") throw Error("Missing current host custody body.");

  const bodies = new Map<number, AsteroidCustodySide>();
  for (const creature of [...source.creatures ?? [], ...source.sleepingCreatures ?? []])
    bodies.set(creature.id, side(asteroidCreatureFootprintSide(frame, creature, "orbit")));
  const boats = new Map((source.boats ?? []).map(boat => [boat.id, side(asteroidSailboatFootprintSide(frame, boat, "orbit"))]));
  const drops = new Set(asteroidAttachedDropIndices(frame, source.drops ?? [], "orbit"));
  const basic = new Map(selectAsteroidCustodyBlocks(frame, source, world).map(value => [`${value.field}:${value.key}`, side(value.attached)]));
  const blockChests = Object.fromEntries(holders.chests.filter(value => value.holder.kind === "block-chest")
    .map(value => [value.key, source.chests[value.key]]));
  projectAsteroidBlockChests(frame, blockChests, world);
  projectAsteroidMachines(frame, source.wayworks ?? {}, world.block);
  for (const key of Object.keys(source.apiaries ?? {})) if (![BlockId.Apiary, BlockId.WildBeehive].includes(world.block(key)))
    throw Error("Apiary holder differs from its canonical voxel.");
  const apiary = projectAsteroidApiaries(frame, { apiaries: source.apiaries ?? {}, creatures: source.creatures ?? [],
    sleepingCreatures: source.sleepingCreatures ?? [], visuals: context.apiaryVisuals });
  if (canonicalJson(source.spacefleet ?? { schema: 1, vehicles: {} }) !== canonicalJson(context.stations.fleet))
    throw Error("Fleet custody and station sources differ.");
  const fleet = projectAsteroidFleet(frame, context.stations, { localActorId: hostPlayerId, bodies: context.actors });
  const habitats = selectAsteroidHabitats(frame, { aquariums: source.aquariums ?? {}, chests: source.chests }, world);
  const habitatSides = new Map<string, AsteroidCustodySide>();
  const expectedExhibits = habitats.filter(value => value.kind === "exhibit").map(value => value.rootKey).sort();
  if (canonicalJson(Object.keys(context.exhibitResidents).sort()) !== canonicalJson(expectedExhibits))
    throw Error("Exhibit renderer sources differ from canonical habitat roots.");
  for (const habitat of habitats) {
    const cells = habitat.cellKeys.map(key => { const [x, y, z] = parseCustodyCellKey(key); return { x, y, z }; });
    const [x, y, z] = parseCustodyCellKey(habitat.rootKey.replace(/^exhibit:/, "")), origin = { x, y, z };
    const bounds = habitat.kind === "aquarium"
      ? aquariumBodyBounds(buildAquariumTopology(cells, origin), source.aquariums![habitat.rootKey].residents)
      : exhibitBodyBounds(buildExhibitTopology(cells, origin), context.exhibitResidents[habitat.rootKey]);
    if (bounds.some(volume => asteroidAttachmentVolumeSide(frame, volume, "orbit") !== habitat.attached))
      throw Error("Habitat display body crosses its attached ownership boundary.");
    habitatSides.set(`${habitat.kind}:${habitat.rootKey}`, side(habitat.attached));
  }
  const installations = selectAsteroidInstallations(frame, source, world, habitats);

  const required = <K>(map: ReadonlyMap<K, AsteroidCustodySide>, key: K) => {
    const value = map.get(key); if (!value) throw Error("Unresolved physical custody holder."); return value;
  };
  const bindings = new Map<string, { holder: CreatureCustodyHolder; side: AsteroidCustodySide }>();
  const resolve = (holder: CreatureCustodyHolder): AsteroidCustodySide => {
    const identity = canonicalJson(holder), existing = bindings.get(identity); if (existing) return existing.side;
    let result: AsteroidCustodySide;
    switch (holder.kind) {
      case "player": {
        const actor = actors.get(holder.playerId);
        if (actor && actor.body.kind !== "human") throw Error("Player custody is bound to a drone body.");
        // Saved guest inventory has no spatial pose. Retain it at its existing
        // canonical owner; never infer a body or include it in the moving unit.
        result = actor?.side ?? "inactive-player"; break;
      }
      case "agent": {
        const actor = actors.get(holder.agentId);
        if (!actor || actor.body.kind !== "drone") throw Error("Agent custody lacks its current drone body.");
        result = actor.side; break;
      }
      case "universe": result = "shared-universe"; break;
      case "boat": result = required(boats, holder.id); break;
      case "creature-cargo": result = required(bodies, holder.creatureId); break;
      case "drop": result = side(drops.has(holder.sourceIndex)); break;
      case "block-chest": result = cellSide(holder.cells[0].join(",")); break;
      case "exhibit": result = required(habitatSides, `exhibit:exhibit:${holder.anchorKey}`); break;
      case "spacecraft":
        result = holder.locationId !== frame.orbitId ? "other-location" : side(Object.hasOwn(fleet.vehicles, holder.vehicleId)); break;
      case "block":
        result = holder.field === "aquariums" ? required(habitatSides, `aquarium:${holder.key}`)
          : holder.field === "apiaries" || holder.field === "wayworks" ? cellSide(holder.key)
            : required(basic, `${holder.field}:${holder.key}`); break;
      default: { const unsupported: never = holder; throw Error(`Unsupported physical holder: ${unsupported}`); }
    }
    bindings.set(identity, { holder, side: result }); return result;
  };
  // Include empty physical chests and actor ledgers, not only occupied vessels.
  for (const chest of holders.chests) resolve(chest.holder);
  resolve({ kind: "player", playerId: hostPlayerId, storage: "host" });
  for (const playerId of Object.keys(source.multiplayerPlayers ?? {})) resolve({ kind: "player", playerId, storage: "guest" });
  for (const agentId of Object.keys(source.agentCustody?.agents ?? {})) resolve({ kind: "agent", agentId });
  const stored = holders.stored.map(value => {
    const physicalSide = resolve(value.holder);
    if (value.body && required(bodies, value.body.id) !== physicalSide)
      throw Error("Deployed creature body and its canonical orb holder cross the frame boundary.");
    return { ...value, side: physicalSide };
  });
  const residents = holders.residents.map(value => ({ ...value, side: resolve(value.holder) }));
  return freezeUniverseJson(cloneUniverseJson({ sourceBaseline: canonicalJson({ frame, source, hostPlayerId, context }),
    bindings: [...bindings.values()], stored, residents,
    freeBodies: holders.freeBodies.map(value => ({ ...value, side: required(bodies, value.id) })),
    apiaryDependencies: apiary.dependencies, installations }));
}

/** Reconcile ALL repository/runtime owners and encounter references first, then
 * classify the actual current physical holders. Inactive owners stay qualified;
 * no local-history flattening, fabricated positions or duplicate owner tables.
 * This is still read-only selection, not authentication or transfer authority. */
export function selectUniverseAsteroidCreatureCustody(frame: AsteroidAttachmentFrame,
  snapshot: UniverseCreatureCustodySnapshot, live: LiveUniverseCreatureCustody, context: AsteroidCustodyPhysicalContext) {
  const source = encodeAttachmentSource({ frame, snapshot, live, context });
  if (live.locationId !== frame.orbitId || canonicalJson(live.actors) !== canonicalJson(context.actors))
    throw Error("Scoped physical custody differs from its actual location or actors.");
  const custody = reconcileUniverseCreatureCustody(snapshot, live);
  const paths = new Map(custody.paths.map(row => [canonicalJson(row.path), row]));
  const provenance = (path: CreatureCustodyPath) => {
    const row = paths.get(canonicalJson(path));
    if (!row) throw Error("Scoped physical custody lacks explicit path provenance.");
    return row;
  };
  const currentPath = (path: CreatureCustodyPath) => {
    const row = provenance(path);
    if (row.locationId !== null && row.locationId !== live.locationId) return false;
    return row.owner === "universe" || row.owner === "player" && row.ownerId === live.playerId
      || row.owner === "location" && row.ownerId === live.locationId;
  };
  const holder = (path: CreatureCustodyPath) => creatureCustodyHolderForPath(live.source, live.actorId, provenance(path).localPath);
  const containers = new Map<string, PhysicalHolders["stored"][number]["containing"][number]>();
  for (const value of custody.index.stored) containers.set(canonicalJson(value.path),
    { path: value.path, specimenId: value.custody.creature.entityId, format: "stored" });
  for (const value of custody.index.residents) containers.set(canonicalJson(value.path),
    { path: value.path, specimenId: value.creature.entityId, format: "housed" });
  const containing = (path: CreatureCustodyPath) => {
    const result: PhysicalHolders["stored"][number]["containing"][number][] = [];
    for (let length = 1; length < path.length; length++) {
      const parent = containers.get(canonicalJson(path.slice(0, length)));
      if (parent) result.push(parent);
    }
    return result;
  };
  const holders: PhysicalHolders = {
    hostPlayerId: live.actorId,
    chests: Object.keys(live.source.chests).sort().map(key => ({ key, holder: chestCustodyOwner(key) })),
    stored: custody.index.stored.filter(value => currentPath(value.path)).map(value => ({
      path: value.path, specimenId: value.custody.creature.entityId, holder: holder(value.path), containing: containing(value.path),
      body: value.body ? { collection: value.body.collection, id: value.body.creature.id } : null })),
    residents: custody.index.residents.filter(value => currentPath(value.path)).map(value => ({
      path: value.path, specimenId: value.creature.entityId, holder: holder(value.path), containing: containing(value.path) })),
    freeBodies: custody.index.freeBodies.filter(value => value.locationId === live.locationId).map(value => ({
      collection: value.collection, id: value.creature.id, specimenId: value.creature.specimenId ?? null })),
  };
  const current = selectPhysicalHolders(frame, live.source, live.actorId, context, holders);
  const storedByPath = new Map(current.stored.map(row => [canonicalJson(row.path), row]));
  const residentsByPath = new Map(current.residents.map(row => [canonicalJson(row.path), row]));
  const inactiveSide = (path: CreatureCustodyPath): AsteroidCustodySide => {
    const row = provenance(path);
    if (row.owner === "player" && row.ownerId !== live.playerId) return "inactive-player";
    if (row.locationId !== null && row.locationId !== live.locationId) return "other-location";
    throw Error("Unresolved noncurrent physical custody owner.");
  };
  const stored = custody.index.stored.map(value => {
    const physical = storedByPath.get(canonicalJson(value.path)) ?? null;
    if (!physical && value.body?.locationId === live.locationId)
      throw Error("Current deployed body has no present physical holder.");
    return { ...value, provenance: provenance(value.path), physical, side: physical?.side ?? inactiveSide(value.path) };
  });
  const residents = custody.index.residents.map(value => {
    const physical = residentsByPath.get(canonicalJson(value.path)) ?? null;
    return { ...value, provenance: provenance(value.path), physical, side: physical?.side ?? inactiveSide(value.path) };
  });
  const bodySides = new Map(current.freeBodies.map(row => [row.id, row.side]));
  const freeBodies = custody.index.freeBodies.map(value => {
    const side = value.locationId === live.locationId ? bodySides.get(value.creature.id) : "other-location";
    if (!side) throw Error("Missing current free-body physical classification.");
    return { ...value, side };
  });
  return freezeUniverseJson(structuredClone({ source, custody, current, stored, residents, freeBodies }));
}

/** A deployed body's orb side comes from the globally reconciled stored owner,
 * not the body's own attunedOrbId or the current player's inventory alone.
 * Inactive and shared owners never become current physical dependencies. */
export function selectAsteroidDeployedOrbDependencies(frame: AsteroidAttachmentFrame,
  physical: ReturnType<typeof selectUniverseAsteroidCreatureCustody>): readonly AsteroidEntityDependency[] {
  const seen = new Set<string>(), dependencies: AsteroidEntityDependency[] = [];
  for (const row of physical.stored) {
    if (row.body?.locationId !== frame.orbitId) continue;
    if (row.custody.format !== "capture-orb" || !row.physical
      || row.side !== row.physical.side || row.side !== "attached" && row.side !== "orbit"
      || row.body.creature.attunedOrbId !== row.custody.containerId || seen.has(row.custody.containerId))
      throw Error("Unresolved current deployed orb dependency.");
    seen.add(row.custody.containerId);
    dependencies.push({ kind: "orb", id: row.custody.containerId, attached: row.side === "attached" });
  }
  return freezeUniverseJson(dependencies);
}
