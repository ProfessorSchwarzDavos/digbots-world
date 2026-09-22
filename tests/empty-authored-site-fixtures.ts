import { ChunkWorld, GENERATOR_VERSION } from "../app/game/world";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { celestialTerrainSeed } from "../app/game/celestial-terrain";
import { createWaystarCatalog } from "../app/game/celestial-catalog";
import { encodeAttachmentSource } from "../app/game/attachment-source-preimage";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { splitUniverseSave } from "../app/game/universe-save";
import type { UniverseAttachmentSource, UniverseSnapshot } from "../app/game/universe-storage";
import { generationOptionsFromWorldOptions, normalizeWorldOptions } from "../app/game/world-storage";
import { flightFixture } from "./spaceflight-fixtures";

/** Declared repository transport fixture, not native storage or normal travel.
 * Terrain/reset/chunks and all source selectors use the ordinary producers. */
export function emptyAuthoredSiteFixture(id = "empty-authored-site", seed = "source-fixture") {
  const universe = universeId(id), orbit = locationAddress({ ...homeLocation(universe), kind: "orbit", instanceId: "low" });
  const scope = { locationId: locationId(orbit), epoch: 9, revision: 7 }, options = normalizeWorldOptions();
  const world = new ChunkWorld(); world.chunkPersistentCache.set = async () => true;
  world.reset(seed, undefined, generationOptionsFromWorldOptions(options), undefined, scope);
  const registry = createAsteroidRegistry(orbit, celestialTerrainSeed(seed));
  const frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id), catalog = createWaystarCatalog();
  const flight = flightFixture(id), save = { ...flight.initial, seed, spacefleet: { schema: 1 as const, vehicles: {} } },
    parts = structuredClone(splitUniverseSave(save));
  const manifest: UniverseSnapshot["manifest"] = { id: universe, universeId: universe, schema: 1, edition: "typescript", revision: 5,
    seed, catalogDigest: "declared-unit-transport", currentLocationId: scope.locationId, currentPlayerId: "host",
    metadata: flight.world.metadata, options, updatedAt: 1000, deletedAt: null };
  const descriptor = { id: scope.locationId, universeId: universe, revision: scope.revision, generationEpoch: 1,
    generator: { seed, version: GENERATOR_VERSION, sourceVersion: GENERATOR_VERSION, profile: "world-below-v15", options } };
  const snapshot: UniverseSnapshot = { manifest, catalog, universe: { fields: { ...parts.universe,
    asteroidFields: { schema: 1, fields: { [scope.locationId]: registry } } }, extensions: {} },
    locations: [{ descriptor, fields: parts.location }, { descriptor: { ...descriptor, id: locationId(homeLocation(universe)) }, fields: parts.location }],
    players: [{ playerId: "host", locationId: scope.locationId, fields: { inventory: [] }, back: null }], backups: [], journals: [], receipts: [] };
  const lease = { id: universe, universeId: universe, owner: "host", epoch: scope.epoch, expiresAt: 100000 };
  const repository: UniverseAttachmentSource = { snapshot, source: encodeAttachmentSource(snapshot), lease,
    loaded: { world: { ...flight.world, options, save }, manifest, catalog, stamp: scope, lease } };
  const live = { frame, world: { locationId: scope.locationId, terrainVersion: world.celestialTerrain!.version,
    terrainSeed: world.celestialTerrain!.seed, expansionLevel: 0, registry, edits: {}, blockFacings: {} },
    sites: { settlements: [], merchants: [], creatures: [], sleepingCreatures: [] }, state: {}, options };
  return { world, repository, live };
}
