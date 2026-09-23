import type { SavedCreature } from "./engine";
import { readAsteroidAttachmentCatalog, hydrateAsteroidAttachmentLocation } from "./asteroid-attachment-catalog";
import { validateAsteroidFields } from "./asteroid-runtime";
import { resolveAsteroidResidentHistory, type AsteroidResidentHistorySources } from "./asteroid-attachment-resident-history";
import { historicalResidentReference } from "./authored-residents";
import { GUILD_NPCS, type GuildBookState } from "./guilds";
import { ROAD_EVENT_HISTORY_LIMIT, validateRoadEventHistory } from "./authored-history";
import { parseLocationId, universeId, type LocationId } from "./location-address";
import type { RoadEventState } from "./surface-roads";
import type { UniverseSnapshot } from "./universe-storage";
import { freezeUniverseJson, isUniverseRecord } from "./universe-json";

type RoadHistory = Readonly<Record<string, RoadEventState>>;
type LiveRoadHistory = Readonly<{
  locationId: LocationId;
  playerId: string;
  sources: AsteroidResidentHistorySources;
}>;

function roadHistory(value: unknown, label: string): RoadHistory {
  if (value === undefined) return {};
  if (!isUniverseRecord(value) || Object.keys(value).length > ROAD_EVENT_HISTORY_LIMIT)
    throw Error(`Invalid ${label} road-event history.`);
  validateRoadEventHistory(value as RoadHistory);
  return value as RoadHistory;
}

function roadBodies(value: unknown, ids: ReadonlySet<string>): SavedCreature[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(body => !isUniverseRecord(body)))
    throw Error("Invalid saved road-event creature collection.");
  return (value as SavedCreature[]).filter(body => body.settlementId == null
    && typeof body.residentId === "string" && ids.has(body.residentId));
}

function companionBodies(value: unknown, ids: ReadonlySet<string>): SavedCreature[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(body => !isUniverseRecord(body)))
    throw Error("Invalid saved guild-companion creature collection.");
  return (value as SavedCreature[]).filter(body => body.settlementId == null
    && typeof body.residentId === "string" && ids.has(body.residentId));
}

/** Resolve recruit history from a unique player book, not from the companion's
 * location or hiredByPlayerId (which may change during play). The current
 * player's live book may contain a new unsaved recruitment, but cannot erase
 * a recruitment already present in its persisted preimage. */
export function selectUniverseGuildResidentHistory(snapshot: UniverseSnapshot, live: Readonly<{
  locationId: LocationId; playerId: string; guildBook: GuildBookState;
}>, currentCreatures: readonly SavedCreature[]) {
  const current = currentCreatures.filter(body => body.settlementId == null
    && typeof body.residentId === "string" && body.residentId.startsWith("guild-companion:"));
  if (!current.length) return freezeUniverseJson({ dependencies: [], origins: [] });
  const manifest = snapshot.manifest, universe = universeId(manifest.universeId);
  if (manifest.id !== universe || manifest.deletedAt !== null || manifest.currentLocationId !== live.locationId
    || manifest.currentPlayerId !== live.playerId || parseLocationId(live.locationId).universeId !== universe)
    throw Error("Guild-companion history differs from the current repository owner.");
  const ids = new Set(current.map(body => body.residentId!));
  const npcIds = new Set([...ids].map(id => historicalResidentReference(id).id));
  const fields = validateAsteroidFields(snapshot.universe.fields.asteroidFields, universe);
  const catalog = readAsteroidAttachmentCatalog(snapshot.universe.attachmentOwners, fields, universe);
  const playerIds = new Set<string>(), owners = new Map<string, { playerId: string; book: GuildBookState }>();
  let currentPlayerFound = false;
  for (const row of snapshot.players) {
    if (playerIds.has(row.playerId) || parseLocationId(row.locationId).universeId !== universe)
      throw Error("Duplicate or foreign guild-companion player book.");
    playerIds.add(row.playerId);
    const isCurrent = row.playerId === live.playerId;
    if (isCurrent && row.locationId !== live.locationId) throw Error("Guild-companion current player owner differs from repository.");
    currentPlayerFound ||= isCurrent;
    const saved = row.fields.guildBook;
    if (saved !== undefined) resolveAsteroidResidentHistory([], { roadEvents: {}, guildBook: saved as GuildBookState });
    const book = isCurrent ? live.guildBook : saved as GuildBookState | undefined;
    if (book === undefined) continue;
    resolveAsteroidResidentHistory([], { roadEvents: {}, guildBook: book });
    for (const npcId of npcIds) {
      const npc = GUILD_NPCS.find(entry => entry.id === npcId && entry.recruitable);
      if (!npc) throw Error("Unresolved authored guild-companion identity.");
      const flag = `recruit:${npcId}`;
      if (isCurrent && saved && (saved as GuildBookState).guilds[npc.guildId].serviceFlags.includes(flag)
        && !book.guilds[npc.guildId].serviceFlags.includes(flag))
        throw Error("Saved guild-companion recruit provenance differs from live player history.");
      if (!book.guilds[npc.guildId].serviceFlags.includes(flag)) continue;
      if (owners.has(npcId)) throw Error("Ambiguous guild-companion history across player books.");
      owners.set(npcId, { playerId: row.playerId, book });
    }
  }
  if (!currentPlayerFound || owners.size !== npcIds.size)
    throw Error("Unresolved source-qualified guild-companion history.");
  const bodies = [...current], seenLocations = new Set<string>();
  for (const row of snapshot.locations) {
    const locationId = row.descriptor.id;
    if (parseLocationId(locationId).universeId !== universe || row.descriptor.universeId !== universe
      || seenLocations.has(locationId)) throw Error("Duplicate or foreign guild-companion location.");
    seenLocations.add(locationId);
    const hydrated = hydrateAsteroidAttachmentLocation(catalog, fields, locationId, row.fields);
    if (locationId !== live.locationId)
      bodies.push(...companionBodies(hydrated.creatures, ids), ...companionBodies(hydrated.sleepingCreatures, ids));
  }
  if (!seenLocations.has(live.locationId)) throw Error("Guild-companion history lacks current location.");
  const dependencies = [...npcIds].flatMap(npcId => {
    const owner = owners.get(npcId)!;
    return resolveAsteroidResidentHistory(bodies.filter(body => body.residentId === `guild-companion:${npcId}`),
      { roadEvents: {}, guildBook: owner.book });
  });
  if (dependencies.length !== npcIds.size) throw Error("Incomplete source-qualified guild-companion dependencies.");
  return freezeUniverseJson({ dependencies, origins: [...owners].map(([id, owner]) => ({ id, playerId: owner.playerId })) });
}

/** Resolve road-event history from its unique location owner, never the body
 * position or a globally unqualified anchor ID. The current live ledger may
 * advance beyond its persisted preimage; a saved event cannot silently change
 * authored kind/day or disappear behind a same-ID live body. Other resident
 * families remain separate, unresolved E2 work. This is read-only evidence,
 * not a history migration, site geometry or travel grant. */
export function selectUniverseRoadResidentHistory(snapshot: UniverseSnapshot, live: LiveRoadHistory,
  currentCreatures: readonly SavedCreature[]) {
  const current = currentCreatures.filter(body => body.settlementId == null
    && typeof body.residentId === "string" && body.residentId.startsWith("road-event:"));
  if (!current.length) return freezeUniverseJson({ dependencies: [], origins: [] });
  const manifest = snapshot.manifest, universe = universeId(manifest.universeId);
  if (manifest.id !== universe || manifest.deletedAt !== null || manifest.currentLocationId !== live.locationId
    || manifest.currentPlayerId !== live.playerId || parseLocationId(live.locationId).universeId !== universe)
    throw Error("Road-event history differs from the current repository owner.");
  const player = snapshot.players.filter(row => row.playerId === live.playerId && row.locationId === live.locationId);
  if (player.length !== 1) throw Error("Road-event history lacks its current player book owner.");
  const ids = new Set(current.map(body => body.residentId!));
  const anchors = new Set([...ids].map(id => historicalResidentReference(id).id));
  const fields = validateAsteroidFields(snapshot.universe.fields.asteroidFields, universe);
  const catalog = readAsteroidAttachmentCatalog(snapshot.universe.attachmentOwners, fields, universe);
  const seenLocations = new Set<string>(), origins = new Map<string, LocationId>();
  const events: Record<string, RoadEventState> = {}, bodies = [...current];
  const liveEvents = roadHistory(live.sources.roadEvents, "live");
  for (const row of snapshot.locations) {
    const locationId = row.descriptor.id;
    if (parseLocationId(locationId).universeId !== universe || row.descriptor.universeId !== universe
      || seenLocations.has(locationId)) throw Error("Duplicate or foreign road-event location.");
    seenLocations.add(locationId);
    const hydrated = hydrateAsteroidAttachmentLocation(catalog, fields, locationId, row.fields);
    const saved = roadHistory(hydrated.roadEvents, "saved");
    const isCurrent = locationId === live.locationId;
    if (isCurrent) {
      for (const anchor of anchors) if (Object.hasOwn(saved, anchor)) {
        const earlier = saved[anchor], later = liveEvents[anchor];
        if (!later || earlier.kind !== later.kind || earlier.triggeredDay !== later.triggeredDay)
          throw Error("Saved current road-event provenance differs from live history.");
      }
    } else {
      bodies.push(...roadBodies(hydrated.creatures, ids), ...roadBodies(hydrated.sleepingCreatures, ids));
    }
    const authoritative = isCurrent ? liveEvents : saved;
    for (const anchor of anchors) if (Object.hasOwn(authoritative, anchor)) {
      if (origins.has(anchor)) throw Error("Ambiguous road-event history across locations.");
      origins.set(anchor, locationId); events[anchor] = authoritative[anchor];
    }
  }
  if (!seenLocations.has(live.locationId) || anchors.size !== origins.size)
    throw Error("Unresolved source-qualified road-event history.");
  const resolved = resolveAsteroidResidentHistory(bodies, { roadEvents: events, guildBook: live.sources.guildBook });
  const dependencies = resolved.filter(dependency => dependency.kind === "road-event" && anchors.has(dependency.id));
  if (dependencies.length !== anchors.size) throw Error("Incomplete source-qualified road-event dependencies.");
  return freezeUniverseJson({ dependencies, origins: [...origins].map(([id, locationId]) => ({ id, locationId })) });
}
