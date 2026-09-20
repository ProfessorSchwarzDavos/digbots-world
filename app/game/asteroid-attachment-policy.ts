import { GUEST_LOCATION_FIELDS, WORLD_SAVE_OWNERS, type SaveFields } from "./universe-save";

type LocationField = { [K in keyof typeof WORLD_SAVE_OWNERS]: typeof WORLD_SAVE_OWNERS[K] extends "location" ? K : never }[keyof typeof WORLD_SAVE_OWNERS];
export type AsteroidAttachmentFieldKind = "environment" | "navigation" | "voxels" | "block-keyed" | "machine"
  | "pressure" | "aquarium" | "station" | "authored-content" | "spell" | "entity" | "liquid" | "ecology" | "agent" | "guest";
/** Exhaustive classification, NOT a claim that every codec is implemented.
 * Values cannot be silently treated as generic JSON coordinates. New WorldSave
 * location fields require a deliberate policy before frame admission compiles.
 */
export const ASTEROID_ATTACHMENT_FIELD_POLICY = Object.freeze({
  generatorVersion: "environment", generatorProfile: "environment", seed: "environment", weather: "environment", weatherState: "environment",
  spawn: "navigation", locationPlayerState: "navigation", mapKnowledge: "navigation",
  edits: "voxels", blockFacings: "block-keyed", saplings: "block-keyed", veinRegrowth: "block-keyed",
  furnaces: "block-keyed", wheatMills: "block-keyed", chests: "block-keyed", apiaries: "block-keyed",
  morphLooms: "block-keyed", orbRacks: "block-keyed", healingStations: "block-keyed", fieldPerches: "block-keyed",
  golemForges: "block-keyed", alchemyStands: "block-keyed", distilleries: "block-keyed", sugarworks: "block-keyed",
  archiveShelves: "block-keyed", tomeDisplays: "block-keyed",
  wayworks: "machine", pressure: "pressure", aquariums: "aquarium", orbitalStations: "station",
  startingSettlementId: "authored-content", contextualLoot: "authored-content", roadEvents: "authored-content",
  surfaceRoadGraph: "authored-content", legendaryEncounters: "authored-content", primeEncounters: "authored-content",
  settlements: "authored-content", merchants: "authored-content", activatedStructureMarkers: "authored-content",
  spellWorldState: "spell", drops: "entity", creatures: "entity", sleepingCreatures: "entity", boats: "entity", leads: "entity",
  liquidLevels: "liquid", ecologySectors: "ecology", agentPlatform: "agent", agentCustody: "agent",
  [GUEST_LOCATION_FIELDS]: "guest",
} satisfies Record<LocationField | typeof GUEST_LOCATION_FIELDS, AsteroidAttachmentFieldKind>);

/** This checks a LOCATION partition, never a flattened WorldSave. Unknown
 * additive extensions must be retained by storage but block frame admission
 * until their spatial/ownership semantics are explicitly understood.
 */
export function assertKnownAsteroidAttachmentFields(location: SaveFields): void {
  for (const key of Object.keys(location)) if (!Object.hasOwn(ASTEROID_ATTACHMENT_FIELD_POLICY, key))
    throw Error(`Unsupported asteroid attachment location field: ${key}.`);
}
