import { collectWorldCreatureCustody, type WorldCreatureCustodySource } from "./creature-custody-sources";
import type { CreatureCustodyPath } from "./creature-custody-index";
import { chestCustodyOwner, parseCustodyCellKey, type ChestCustodyOwner } from "./chest-custody-owner";
import { canonicalJson, cloneUniverseJson, freezeUniverseJson } from "./universe-json";

type BlockStore = "furnaces" | "wheatMills" | "wayworks" | "orbRacks" | "healingStations" | "morphLooms" | "apiaries" | "aquariums" | "fieldPerches";
export type CreatureCustodyHolder = ChestCustodyOwner | Readonly<
  { kind: "player"; playerId: string; storage: "host" | "guest" }
  | { kind: "agent"; agentId: string }
  | { kind: "block"; field: BlockStore; key: string }
  | { kind: "drop"; sourceIndex: number }
  | { kind: "spacecraft"; vehicleId: string; locationId: string }
  | { kind: "universe"; field: "digitalItemVault" | "digitalCreatureArchive" }
>;
const roots = { inventory: true, cursor: true, trash: true, craftGrid: true, equipment: true, offhand: true,
  furnaces: true, wheatMills: true, wayworks: true, chests: true, boats: true, drops: true, orbRacks: true,
  healingStations: true, morphLooms: true, digitalItemVault: true, digitalCreatureArchive: true, multiplayerPlayers: true,
  agentCustody: true, spacefleet: true, apiaries: true, aquariums: true, fieldPerches: true, creatures: true, sleepingCreatures: true,
} satisfies Record<keyof WorldCreatureCustodySource, true>;
function identity(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value || value.trim() !== value) throw Error("Invalid creature holder identity.");
}

/** Bind collected slots to their actual root holders, without inventing a
 * position for a player/agent/digital ledger or mistaking a nested metadata point
 * for an anchor. This is an ephemeral dependency index, NOT physical admission,
 * actor authentication, a second storage owner or permission to transfer cargo. */
export function collectWorldCreatureCustodyHolders(source: WorldCreatureCustodySource, hostPlayerId: string) {
  identity(hostPlayerId);
  const custody = collectWorldCreatureCustody(source);
  const chests = Object.keys(source.chests).sort().map(key => ({ key, holder: chestCustodyOwner(key) }));
  const chestOwners = new Map(chests.map(value => [value.key, value.holder]));
  const holder = (path: CreatureCustodyPath): CreatureCustodyHolder => {
    const value = path[0];
    if (typeof value !== "string" || !Object.hasOwn(roots, value)) throw Error("Unknown canonical creature holder family.");
    const root = value as keyof WorldCreatureCustodySource;
    switch (root) {
      case "inventory": case "cursor": case "trash": case "craftGrid": case "equipment": case "offhand":
        return { kind: "player", playerId: hostPlayerId, storage: "host" };
      case "digitalItemVault": case "digitalCreatureArchive": return { kind: "universe", field: root };
      case "multiplayerPlayers": {
        const playerId = path[1]; identity(playerId); return { kind: "player", playerId, storage: "guest" };
      }
      case "agentCustody": {
        const agentId = path[1]; identity(agentId); return { kind: "agent", agentId };
      }
      case "spacefleet": {
        const vehicleId = path[1]; identity(vehicleId);
        const vehicle = source.spacefleet?.vehicles[vehicleId];
        if (!vehicle) throw Error("Missing actual spacecraft holder.");
        identity(vehicle.locationId); return { kind: "spacecraft", vehicleId, locationId: vehicle.locationId };
      }
      case "boats": { const id = path[1]; identity(id); return { kind: "boat", id }; }
      case "drops": {
        const sourceIndex = path[1];
        if (typeof sourceIndex !== "number" || !Number.isSafeInteger(sourceIndex) || sourceIndex < 0 || !source.drops?.[sourceIndex])
          throw Error("Missing actual drop holder.");
        return { kind: "drop", sourceIndex };
      }
      case "chests": {
        const key = path[1]; identity(key); const found = chestOwners.get(key);
        if (!found) throw Error("Missing actual chest holder."); return found;
      }
      case "furnaces": case "wheatMills": case "wayworks": case "orbRacks": case "healingStations":
      case "morphLooms": case "apiaries": case "aquariums": case "fieldPerches": {
        const key = path[1]; identity(key); parseCustodyCellKey(key); return { kind: "block", field: root, key };
      }
      case "creatures": case "sleepingCreatures": throw Error("Free bodies are not portable container slots.");
      default: { const unsupported: never = root; throw Error(`Unsupported creature holder family: ${unsupported}`); }
    }
  };
  const containers = new Map<string, { path: CreatureCustodyPath; specimenId: string; format: "stored" | "housed" }>();
  for (const stored of custody.index.stored) containers.set(canonicalJson(stored.path),
    { path: stored.path, specimenId: stored.custody.creature.entityId, format: "stored" });
  for (const resident of custody.index.residents) containers.set(canonicalJson(resident.path),
    { path: resident.path, specimenId: resident.creature.entityId, format: "housed" });
  const containing = (path: CreatureCustodyPath) => {
    const parents: NonNullable<ReturnType<typeof containers.get>>[] = [];
    for (let length = 1; length < path.length; length++) {
      const parent = containers.get(canonicalJson(path.slice(0, length)));
      if (parent) parents.push(parent);
    }
    return parents;
  };
  const stored = custody.index.stored.map(value => ({ path: value.path, specimenId: value.custody.creature.entityId,
    holder: holder(value.path), containing: containing(value.path),
    body: value.body ? { collection: value.body.collection, id: value.body.creature.id } : null }));
  const residents = custody.index.residents.map(value => ({ path: value.path, specimenId: value.creature.entityId,
    holder: holder(value.path), containing: containing(value.path) }));
  return freezeUniverseJson(cloneUniverseJson({ ...custody, holders: { hostPlayerId, chests, stored, residents,
    freeBodies: custody.index.freeBodies.map(value => ({ collection: value.collection, id: value.creature.id,
      specimenId: value.creature.specimenId ?? null })) } }));
}
