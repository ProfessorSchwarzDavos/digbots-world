import { BlockId } from "./data";
import { collectWorldCreatureCustodyHolders, type CreatureCustodyHolder } from "./creature-custody-holders";
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
import { createAsteroidAttachmentWorld, type AsteroidAttachmentWorldSource } from "./asteroid-attachment-world";
import { parseCustodyCellKey } from "./chest-custody-owner";
import { buildAquariumTopology } from "./aquarium";
import { buildExhibitTopology, type ExhibitResident } from "./butterfly-exhibit";
import { aquariumBodyBounds, exhibitBodyBounds } from "./habitat-body";
import type { AttachmentActorBody } from "./attachment-actor-bodies";
import { canonicalJson, cloneUniverseJson, freezeUniverseJson } from "./universe-json";

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
  const world = createAsteroidAttachmentWorld(context.world);
  if (canonicalJson(frame) !== canonicalJson(createAsteroidAttachmentFrame(world.source.registry, frame.asteroidId)))
    throw Error("Custody frame differs from its canonical world source.");
  const custody = collectWorldCreatureCustodyHolders(source, hostPlayerId);
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
  const blockChests = Object.fromEntries(custody.holders.chests.filter(value => value.holder.kind === "block-chest")
    .map(value => [value.key, source.chests[value.key]]));
  projectAsteroidBlockChests(frame, blockChests, world);
  projectAsteroidMachines(frame, source.wayworks ?? {}, world.block);
  for (const key of Object.keys(source.apiaries ?? {})) if (world.block(key) !== BlockId.Apiary)
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
  for (const chest of custody.holders.chests) resolve(chest.holder);
  resolve({ kind: "player", playerId: hostPlayerId, storage: "host" });
  for (const playerId of Object.keys(source.multiplayerPlayers ?? {})) resolve({ kind: "player", playerId, storage: "guest" });
  for (const agentId of Object.keys(source.agentCustody?.agents ?? {})) resolve({ kind: "agent", agentId });
  const stored = custody.holders.stored.map(value => {
    const physicalSide = resolve(value.holder);
    if (value.body && required(bodies, value.body.id) !== physicalSide)
      throw Error("Deployed creature body and its canonical orb holder cross the frame boundary.");
    return { ...value, side: physicalSide };
  });
  const residents = custody.holders.residents.map(value => ({ ...value, side: resolve(value.holder) }));
  return freezeUniverseJson(cloneUniverseJson({ sourceBaseline: canonicalJson({ frame, source, hostPlayerId, context }),
    bindings: [...bindings.values()], stored, residents,
    freeBodies: custody.holders.freeBodies.map(value => ({ ...value, side: required(bodies, value.id) })),
    apiaryDependencies: apiary.dependencies }));
}
