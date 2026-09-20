import type { WorldSave } from "./engine";
import { cloneUniverseJson, isUniverseRecord } from "./universe-json";
import { validateAgentCustody } from "./agent-custody";
import { validateLocationPlayerState } from "./location-manager";
import { validateSpacefleetSave } from "./space-vehicle";
import { validateStationRegistrySave } from "./orbital-station";
import { validateStationFleetCustody } from "./station-runtime";
import { validateAsteroidFields } from "./asteroid-runtime";

export type SaveOwner = "universe" | "location" | "player";
/** Exhaustiveness is intentional: adding a WorldSave field requires an owner. */
export const WORLD_SAVE_OWNERS = Object.freeze({
  version: "universe", generatorVersion: "location", generatorProfile: "location", lastSavedGameVersion: "universe",
  seed: "location", mode: "universe", edits: "location", blockFacings: "location", player: "player", spawn: "location",
  startingSettlementId: "location", inventory: "player", cursor: "player", trash: "player", craftGrid: "player",
  equipment: "player", lifeSupport: "player", offhand: "player", bestiary: "player", saplings: "location", veinRegrowth: "location",
  selected: "player", health: "player", hunger: "player", xp: "player", level: "player", time: "universe", day: "universe", universeTimeSeconds: "universe",
  weather: "location", furnaces: "location", wheatMills: "location", wayworks: "location", pressure: "location", spacefleet: "universe", orbitalStations: "location", asteroidFields: "universe", chests: "location", contextualLoot: "location",
  roadEvents: "location", surfaceRoadGraph: "location", apiaries: "location", morphLooms: "location", orbRacks: "location",
  healingStations: "location", aquariums: "location", fieldPerches: "location", summonContracts: "player", guildBook: "player",
  legendaryEncounters: "location", primeEncounters: "location", digitalItemVault: "universe", digitalCreatureArchive: "universe",
  golemForges: "location", alchemyStands: "location", distilleries: "location", sugarworks: "location", mapKnowledge: "location",
  questBook: "player", sideQuestDefinitions: "universe", blueprints: "player", plantBestiary: "player", goldWallet: "player",
  factionRelations: "universe", settlements: "location", merchants: "location", bankAccount: "player", stockMarket: "universe",
  potionBuffs: "player", rangedLoaded: "player", magicState: "player", spellWorldState: "location", skillState: "player",
  archiveShelves: "location", tomeDisplays: "location", drops: "location", options: "universe", playerVariant: "player",
  liquidLevels: "location", weatherState: "location", creatures: "location", sleepingCreatures: "location", ecologySectors: "location",
  activatedStructureMarkers: "location", boats: "location", leads: "location", multiplayerPlayers: "universe",
  multiplayerProgressions: "universe", multiplayerWallets: "universe", cardforge: "universe", agentPlatform: "location",
  agentCustody: "location", locationPlayerState: "location", agentWorldFingerprint: "universe", agentTestWorld: "universe", savedAt: "universe",
} satisfies Record<keyof WorldSave, SaveOwner>);

export type SaveFields = Readonly<Record<string, unknown>>;
/** Internal location shard field, composed back into the legacy guest shape. */
export const GUEST_LOCATION_FIELDS = "@guestLocationProgressions";
export type UniverseSavePartitions = Readonly<{
  universe: SaveFields;
  location: SaveFields;
  player: SaveFields;
  /** Unknown additive legacy metadata is retained without executing it. */
  extensions: SaveFields;
}>;

export function splitUniverseSave(save: WorldSave): UniverseSavePartitions {
  const detached = cloneUniverseJson(save) as unknown as Record<string, unknown>;
  const parts: Record<SaveOwner | "extensions", Record<string, unknown>> = {
    universe: Object.create(null), location: Object.create(null), player: Object.create(null), extensions: Object.create(null),
  };
  for (const [key, value] of Object.entries(detached)) {
    const owner = Object.hasOwn(WORLD_SAVE_OWNERS, key) ? WORLD_SAVE_OWNERS[key as keyof WorldSave] : "extensions";
    parts[owner][key] = value;
  }
  if (isUniverseRecord(parts.universe.multiplayerProgressions)) {
    const local: Record<string, unknown> = Object.create(null);
    for (const [id, record] of Object.entries(parts.universe.multiplayerProgressions)) {
      if (!isUniverseRecord(record) || !isUniverseRecord(record.state)) throw new Error("Invalid guest progression record.");
      const fields: Record<string, unknown> = Object.create(null);
      for (const key of ["mapKnowledge", "respawn"]) if (Object.hasOwn(record.state, key)) {
        fields[key] = record.state[key]; delete record.state[key];
      }
      if (Object.keys(fields).length) local[id] = fields;
    }
    if (Object.keys(local).length) parts.location[GUEST_LOCATION_FIELDS] = local;
  }
  return parts;
}

export function composeUniverseSave(parts: UniverseSavePartitions): WorldSave {
  const output: Record<string, unknown> = Object.create(null);
  for (const owner of ["universe", "location", "player", "extensions"] as const) {
    if (!isUniverseRecord(parts[owner])) throw new Error(`Missing ${owner} save partition.`);
    for (const [key, value] of Object.entries(parts[owner])) {
      if (owner === "location" && key === GUEST_LOCATION_FIELDS) continue;
      const expected = Object.hasOwn(WORLD_SAVE_OWNERS, key) ? WORLD_SAVE_OWNERS[key as keyof WorldSave] : "extensions";
      if (expected !== owner || Object.hasOwn(output, key)) throw new Error(`Save field ${key} has conflicting ownership.`);
      output[key] = value;
    }
  }
  if (isUniverseRecord(output.multiplayerProgressions)) {
    output.multiplayerProgressions = cloneUniverseJson(output.multiplayerProgressions);
    for (const record of Object.values(output.multiplayerProgressions as Record<string, unknown>)) {
      if (!isUniverseRecord(record) || !isUniverseRecord(record.state)
        || Object.hasOwn(record.state, "mapKnowledge") || Object.hasOwn(record.state, "respawn")) throw new Error("Guest map/respawn fields must belong to a location.");
    }
  }
  const localGuests = parts.location[GUEST_LOCATION_FIELDS];
  if (localGuests !== undefined) {
    if (!isUniverseRecord(localGuests) || !isUniverseRecord(output.multiplayerProgressions)) throw new Error("Guest location references are incomplete.");
    for (const [id, fields] of Object.entries(localGuests)) {
      const guest = output.multiplayerProgressions[id];
      if (!isUniverseRecord(guest) || !isUniverseRecord(guest.state) || !isUniverseRecord(fields)
        || Object.keys(fields).some((key) => !["mapKnowledge", "respawn"].includes(key))) throw new Error("Invalid guest location fields.");
      Object.assign(guest.state, cloneUniverseJson(fields));
    }
  }
  if (output.version !== 2 || !Number.isSafeInteger(output.generatorVersion) || typeof output.seed !== "string" || !output.seed
    || !["survival", "builder"].includes(String(output.mode)) || !isUniverseRecord(output.player)
    || ![output.player.x, output.player.y, output.player.z].every((n) => typeof n === "number" && Number.isFinite(n))
    || !Array.isArray(output.inventory) || !isUniverseRecord(output.edits) || !isUniverseRecord(output.chests) || !isUniverseRecord(output.furnaces)) {
    throw new Error("Universe checkpoint has an invalid legacy-compatible core.");
  }
  if (output.agentCustody !== undefined) validateAgentCustody(output.agentCustody);
  if (output.universeTimeSeconds !== undefined && (typeof output.universeTimeSeconds !== "number" || !Number.isFinite(output.universeTimeSeconds) || output.universeTimeSeconds < 0)) throw new Error("Invalid universe clock.");
  validateLocationPlayerState(output.locationPlayerState);
  if (output.spacefleet !== undefined) validateSpacefleetSave(output.spacefleet);
  if (output.asteroidFields !== undefined) validateAsteroidFields(output.asteroidFields);
  if (output.orbitalStations !== undefined) validateStationFleetCustody(validateStationRegistrySave(output.orbitalStations), validateSpacefleetSave(output.spacefleet));
  return cloneUniverseJson(output) as unknown as WorldSave;
}
