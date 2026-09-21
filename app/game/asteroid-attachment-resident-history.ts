import type { SavedCreature } from "./engine";
import { GUILD_NPCS, GUILDS, normalizeGuildBook, type GuildBookState, type PlayerGuildState } from "./guilds";
import { normalizeRoadEventState, type RoadEventState } from "./surface-roads";
import { GUILD_RECRUIT_COMPANIONS, ROAD_EVENT_RESIDENTS, historicalResidentReference } from "./authored-residents";
import type { AsteroidEntityDependency } from "./asteroid-attachment-relationships";
import { assertExactKeys, canonicalJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

export type AsteroidResidentHistorySources = Readonly<{
  roadEvents: Readonly<Record<string, RoadEventState>>;
  /** The current host's canonical player book, not a copied destination book. */
  guildBook: GuildBookState;
}>;
const roadFields = { schema: true, anchorId: true, kind: true, status: true, triggeredDay: true, revision: true } satisfies Record<keyof RoadEventState, true>;
const bookFields = { schema: true, guilds: true, worldQuestOutcomes: true, revision: true } satisfies Record<keyof GuildBookState, true>;
const guildFields = { guildId: true, membership: true, standing: true, rankId: true, completedQuestIds: true, activeQuestIds: true,
  objectiveProgress: true, completedDemonstrationIds: true, doctrineChoiceId: true, hallDiscoveryIds: true, serviceFlags: true,
  restitutionState: true } satisfies Record<keyof PlayerGuildState, true>;
function record(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isUniverseRecord(value)) throw Error(`Invalid ${label}.`);
}
function validateSources(sources: AsteroidResidentHistorySources) {
  canonicalJson(sources); assertExactKeys(sources, ["roadEvents", "guildBook"], "Resident history sources");
  record(sources.roadEvents, "resident road history");
  for (const [anchor, event] of Object.entries(sources.roadEvents)) {
    record(event, "resident road event"); assertExactKeys(event, Object.keys(roadFields), "Resident road event");
    if (!anchor || anchor.trim() !== anchor || !Number.isSafeInteger(event.triggeredDay) || !Number.isSafeInteger(event.revision)
      || canonicalJson(normalizeRoadEventState(event, anchor)) !== canonicalJson(event)) throw Error("Resident road history requires lossy normalization.");
  }
  const book = sources.guildBook;
  record(book, "resident guild book"); assertExactKeys(book, Object.keys(bookFields), "Resident guild book");
  record(book.guilds, "resident guilds"); assertExactKeys(book.guilds, Object.keys(GUILDS), "Resident guilds");
  record(book.worldQuestOutcomes, "resident quest history");
  if (!Number.isSafeInteger(book.revision) || Object.values(book.worldQuestOutcomes).some(value => typeof value !== "string"))
    throw Error("Invalid resident guild history.");
  for (const guild of Object.values(book.guilds)) {
    record(guild, "resident guild"); assertExactKeys(guild, Object.keys(guildFields), "Resident guild");
    record(guild.objectiveProgress, "resident guild objective progress");
    if (Object.values(guild.objectiveProgress).some(value => typeof value !== "number" || value < 0)) throw Error("Invalid resident guild objective progress.");
    if (guild.restitutionState !== null) {
      record(guild.restitutionState, "resident restitution");
      assertExactKeys(guild.restitutionState, ["reason", "progress"], "Resident restitution");
    }
  }
  if (canonicalJson(normalizeGuildBook(book)) !== canonicalJson(book)) throw Error("Resident guild history requires lossy normalization.");
}

/** Resolve only the two actual non-settlement resident families against their
 * canonical event/recruit history. No parsing of coordinates out of IDs, no
 * synthetic settlements, no actor grants and no destination ledger are created.
 * These history records remain canonical/shared even when related NPC bodies
 * stand on opposite sides; active followers, leads and physical homes are still
 * checked separately by the whole entity partition. Missing old recruit proof
 * fails closed; this helper never manufactures a truncated service flag. */
export function resolveAsteroidResidentHistory(creatures: readonly SavedCreature[], sources: AsteroidResidentHistorySources): readonly AsteroidEntityDependency[] {
  validateSources(sources);
  const dependencies = new Map<string, AsteroidEntityDependency>(), groups = new Map<string, SavedCreature[]>();
  for (const creature of creatures) {
    if (creature.residentId == null || creature.settlementId != null) continue;
    const reference = historicalResidentReference(creature.residentId), key = JSON.stringify([reference.kind, reference.id]);
    const group = groups.get(key) ?? []; group.push(creature); groups.set(key, group);
    if (reference.kind === "road-event") {
      const event = Object.hasOwn(sources.roadEvents, reference.id) ? sources.roadEvents[reference.id] : undefined;
      if (!event || event.kind === "quiet" || event.status === "quiet") throw Error("Unresolved canonical road-event resident.");
      const authored = ROAD_EVENT_RESIDENTS[event.kind];
      if (!authored.some(entry => entry.kind === creature.kind) || group.length > authored.length)
        throw Error("Road-event resident differs from its authored spawn history.");
    } else {
      const npc = GUILD_NPCS.find(entry => entry.id === reference.id && entry.recruitable);
      const companion = Object.hasOwn(GUILD_RECRUIT_COMPANIONS, reference.id) ? GUILD_RECRUIT_COMPANIONS[reference.id] : undefined;
      if (!npc || !companion || companion.kind !== creature.kind || group.length > 1
        || !sources.guildBook.guilds[npc.guildId].serviceFlags.includes(`recruit:${npc.id}`))
        throw Error("Unresolved canonical guild-companion resident.");
    }
    dependencies.set(key, { kind: reference.kind, id: reference.id, attached: null });
  }
  return freezeUniverseJson([...dependencies.values()]);
}
