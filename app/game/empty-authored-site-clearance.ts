import { encodeAttachmentSource } from "./attachment-source-preimage";
import { projectAsteroidAuthoredHistory, type AsteroidAuthoredHistory } from "./asteroid-attachment-authored-history";
import { createAsteroidAttachmentFrame, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { createAsteroidAttachmentWorld, type AsteroidAttachmentWorldSource } from "./asteroid-attachment-world";
import { validateAsteroidFields } from "./asteroid-runtime";
import type { AuthoredSiteSources } from "./asteroid-authored-site-census";
import { catalogBody, validateCelestialCatalog } from "./celestial-catalog";
import { celestialTerrainSeed, createCelestialTerrain } from "./celestial-terrain";
import { parseLocationId } from "./location-address";
import { observeUniverseAuthoredSites } from "./universe-authored-site-census";
import { assertExactKeys, canonicalJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";
import type { SaveFields } from "./universe-save";
import type { UniverseAttachmentSource } from "./universe-storage";
import { GENERATOR_VERSION, type ChunkWorld } from "./world";
import { generationOptionsFromWorldOptions, normalizeWorldOptions, type WorldOptions } from "./world-storage";

/** Raw optional saved families with authored geometry, finite site state or
 * explicit non-spatial history. Do not normalize them before this inspection. */
export const EMPTY_SITE_STATE_FIELDS = ["roadEvents", "activatedStructureMarkers", "startingSettlementId",
  "surfaceRoadGraph", "primeEncounters", "legendaryEncounters", "contextualLoot"] as const;
export function emptySiteStateSources(fields: SaveFields): SaveFields {
  encodeAttachmentSource(fields);
  return Object.fromEntries(EMPTY_SITE_STATE_FIELDS.filter(key => Object.hasOwn(fields, key)).map(key => [key, fields[key]]));
}
function inspectState(frame: AsteroidAttachmentFrame, fields: SaveFields) {
  const state = emptySiteStateSources(fields), history: Record<string, unknown> = {};
  for (const key of ["roadEvents", "activatedStructureMarkers", "startingSettlementId"] as const)
    if (Object.hasOwn(state, key)) history[key] = state[key];
  // These IDs are existing once-only history, not points or physical owners.
  projectAsteroidAuthoredHistory(frame, history as AsteroidAuthoredHistory);
  for (const key of ["surfaceRoadGraph", "primeEncounters", "legendaryEncounters"] as const) {
    if (Object.hasOwn(state, key) && (!isUniverseRecord(state[key]) || Object.keys(state[key]).length))
      throw Error(`Unresolved authored-site ${key} source.`);
  }
  if (Object.hasOwn(state, "contextualLoot")) {
    const loot = state.contextualLoot;
    if (!isUniverseRecord(loot)) throw Error("Invalid authored contextual loot source.");
    assertExactKeys(loot, ["schema", "acquiredUniqueIds", "containers"], "Authored contextual loot");
    if (loot.schema !== 1 || !Array.isArray(loot.acquiredUniqueIds)
      || Object.keys(loot.acquiredUniqueIds).length !== loot.acquiredUniqueIds.length
      || loot.acquiredUniqueIds.some(id => typeof id !== "string" || !id || id.length > 128)
      || new Set(loot.acquiredUniqueIds).size !== loot.acquiredUniqueIds.length || loot.acquiredUniqueIds.length > 512
      || !isUniverseRecord(loot.containers) || Object.keys(loot.containers).length)
      throw Error("Unresolved authored contextual loot source.");
  }
  return state;
}

/** A prerequisite, NEVER an admission/transaction grant. The caller must obtain
 * generation from the real reset-established ChunkWorld immediately before and
 * after its verified repository read, then revalidate under the future atomic
 * pause/authority lease. Complete positive-site producers remain required.
 */
export function inspectEmptyAuthoredSiteClearance(repository: UniverseAttachmentSource,
  generation: ReturnType<ChunkWorld["snapshotEmptyAuthoredOrbitGeneration"]>,
  live: Readonly<{ frame: AsteroidAttachmentFrame; world: AsteroidAttachmentWorldSource;
    sites: AuthoredSiteSources; state: SaveFields; options: WorldOptions }>) {
  // The repository source is already tagged. Re-encoding it would multiply
  // depth for legitimate large saves; bind each raw family exactly once.
  const source = { repository: repository.source, snapshot: encodeAttachmentSource(repository.snapshot),
    lease: encodeAttachmentSource(repository.lease), generation: encodeAttachmentSource(generation), live: encodeAttachmentSource(live) };
  const { snapshot, loaded, lease } = repository, { manifest } = snapshot;
  const address = parseLocationId(generation.scope.locationId);
  const row = snapshot.locations.find(value => value.descriptor.id === generation.scope.locationId);
  if (manifest.schema !== 1 || manifest.edition !== "typescript" || address.kind !== "orbit" || !row
    || manifest.currentLocationId !== row.descriptor.id || row.descriptor.synthetic !== undefined
    || row.descriptor.generator.version !== GENERATOR_VERSION || row.descriptor.generator.sourceVersion !== GENERATOR_VERSION
    || row.descriptor.generator.profile !== "world-below-v15" || row.descriptor.generator.seed !== generation.seed
    || row.descriptor.generationEpoch < 1 || !Number.isSafeInteger(row.descriptor.generationEpoch)
    || row.descriptor.revision !== generation.scope.revision || lease.epoch !== generation.scope.epoch
    || lease.id !== manifest.id || lease.universeId !== manifest.universeId
    || canonicalJson(loaded.stamp) !== canonicalJson(generation.scope)
    || canonicalJson(loaded.manifest) !== canonicalJson(manifest))
    throw Error("Unsupported empty-site repository generator or runtime owner.");
  // Unknown extension producers have no reviewed generation rule in this path.
  if (!isUniverseRecord(snapshot.universe.extensions) || Object.keys(snapshot.universe.extensions).length)
    throw Error("Unsupported empty-site extension provenance.");
  const options = row.descriptor.generator.options;
  if (canonicalJson(normalizeWorldOptions(options)) !== canonicalJson(options)
    || canonicalJson(normalizeWorldOptions(manifest.options)) !== canonicalJson(manifest.options)
    || canonicalJson(manifest.options) !== canonicalJson(live.options)
    || canonicalJson(generationOptionsFromWorldOptions(manifest.options)) !== canonicalJson(generation.options)
    || canonicalJson(generationOptionsFromWorldOptions(options)) !== canonicalJson(generation.options)
    || row.fields.seed !== generation.seed || row.fields.generatorVersion !== GENERATOR_VERSION
    || row.fields.generatorProfile !== row.descriptor.generator.profile)
    throw Error("Empty-site generation differs from canonical saved options.");
  const catalog = validateCelestialCatalog(snapshot.catalog); catalogBody(catalog, address);
  if (canonicalJson(loaded.catalog) !== canonicalJson(catalog)) throw Error("Empty-site catalog changed.");
  const fields = validateAsteroidFields(snapshot.universe.fields.asteroidFields, manifest.universeId);
  const registry = fields.fields[row.descriptor.id];
  const world = createAsteroidAttachmentWorld(live.world);
  if (!registry || registry.seed !== celestialTerrainSeed(generation.seed) || world.source.terrainSeed !== generation.descriptor.seed
    || world.source.locationId !== row.descriptor.id || world.source.expansionLevel !== registry.expansionLevel
    || generation.celestialGeneration.expansionLevel !== registry.expansionLevel
    || canonicalJson(createAsteroidAttachmentFrame(registry, live.frame.asteroidId)) !== canonicalJson(live.frame)
    || canonicalJson(createAsteroidAttachmentFrame(world.source.registry, live.frame.asteroidId)) !== canonicalJson(live.frame))
    throw Error("Empty-site field/frame differs from its canonical generator.");
  const terrain = createCelestialTerrain({ location: address, seed: registry.seed, expansionLevel: registry.expansionLevel });
  if (!terrain || terrain.kind !== "orbit") throw Error("Unsupported empty-site terrain.");
  const { contains: _contains, block: _block, column: _column, ...descriptor } = terrain;
  void _contains; void _block; void _column;
  if (canonicalJson(descriptor) !== canonicalJson(generation.descriptor)) throw Error("Empty-site runtime terrain changed.");
  const census = observeUniverseAuthoredSites(snapshot, { locationId: row.descriptor.id,
    repositoryRevision: manifest.revision, locationRevision: generation.scope.revision, source: live.sites });
  for (const location of census.locations) for (const observed of [location.persistedCensus, location.census]) {
    if (observed.status !== "no-observed-site-records" || observed.historicalResidents.length)
      throw Error("Unresolved global authored-site owner or resident history.");
  }
  // Do not let a live empty view hide valid persisted owners. Raw canonical
  // catalog rows were ownership-validated by the census before this union.
  const states = snapshot.locations.map(location => {
    const owner = snapshot.universe.attachmentOwners?.owners[location.descriptor.id];
    return { locationId: location.descriptor.id, persisted: inspectState(live.frame, { ...location.fields, ...owner?.fields }) };
  });
  const current = inspectState(live.frame, live.state);
  return freezeUniverseJson(structuredClone({ kind: "proven-empty-authored-sites" as const, source,
    generation, frame: live.frame, census, states, current }));
}
