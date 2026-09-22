import { encodeAttachmentSource } from "./attachment-source-preimage";
import { hydrateAsteroidAttachmentLocation, readAsteroidAttachmentCatalog } from "./asteroid-attachment-catalog";
import { asteroidAttachmentContainsCell, createAsteroidAttachmentFrame, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";
import { asteroidVoxelEditCells } from "./asteroid-attachment-voxels";
import { createAsteroidAttachmentWorld, type AsteroidAttachmentWorldSource } from "./asteroid-attachment-world";
import { asteroidOrbitFor, captureAsteroidEdits, projectAsteroidEdits, validateAsteroidFields, type AsteroidFieldsSave } from "./asteroid-runtime";
import { CELESTIAL_TERRAIN_VERSION, celestialTerrainSeed } from "./celestial-terrain";
import { parseCustodyCellKey } from "./chest-custody-owner";
import type { DigitalCreatureArchive, DigitalItemVault } from "./digital-storage";
import { locationId, parseLocationId, universeId } from "./location-address";
import type { UniverseCreatureCustodySnapshot } from "./universe-creature-custody";
import { canonicalJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";
import { GUEST_LOCATION_FIELDS, WORLD_SAVE_OWNERS, type SaveFields } from "./universe-save";
import { resolveWaygridPhysicalOwnership, type WaygridPhysicalLocation } from "./waygrid-physical-ownership";
import { GENERATOR_VERSION, type ChunkEditSave } from "./world";

export type LiveUniverseWaygrid = Readonly<{
  repositoryRevision: number; locationRevision: number;
  generatorVersion: number; generatorProfile: string; seed: string;
  world: AsteroidAttachmentWorldSource; asteroidFields: AsteroidFieldsSave;
  vault: DigitalItemVault; archive: DigitalCreatureArchive;
}>;

function generation(fields: SaveFields) {
  // These pinned generators contain no procedural Waygrid blocks. New generator
  // implementations must explicitly re-establish the complete-census contract.
  const profile = Object.hasOwn(fields, "generatorProfile") ? fields.generatorProfile : "world-below-v15";
  if (GENERATOR_VERSION !== 18 || CELESTIAL_TERRAIN_VERSION !== 1 || fields.generatorVersion !== 18
    || profile !== "world-below-v15" && profile !== "legacy-v14" || typeof fields.seed !== "string" || !fields.seed)
    throw Error("Unsupported Waygrid physical generator; migrate explicitly before admission.");
  return { generatorVersion: fields.generatorVersion, generatorProfile: profile, seed: fields.seed };
}

/** Verified repository observation + exact current raw world, no chunk loads or
 * normalizers. Hydrate/validate EVERY persisted row before replacing the active
 * row. Universe contents remain one shared owner, never projected into a frame.
 * This grants neither authenticated authority nor atomic transfer/admission. */
export function selectUniverseWaygridOwnership(frame: AsteroidAttachmentFrame,
  snapshot: UniverseCreatureCustodySnapshot, live: LiveUniverseWaygrid) {
  const source = encodeAttachmentSource({ frame, snapshot, live }), manifest = snapshot.manifest;
  const universe = universeId(manifest.universeId), world = createAsteroidAttachmentWorld(live.world);
  if (manifest.id !== universe || manifest.deletedAt !== null || !Number.isSafeInteger(manifest.revision) || manifest.revision < 1
    || live.repositoryRevision !== manifest.revision || manifest.currentLocationId !== live.world.locationId
    || parseLocationId(live.world.locationId).universeId !== universe
    || canonicalJson(frame) !== canonicalJson(createAsteroidAttachmentFrame(world.source.registry, frame.asteroidId)))
    throw Error("Waygrid physical source differs from its repository/frame owner.");
  const persistedFields = validateAsteroidFields(snapshot.universe.fields.asteroidFields, universe);
  const catalog = readAsteroidAttachmentCatalog(snapshot.universe.attachmentOwners, persistedFields, universe);
  const currentFields = validateAsteroidFields(live.asteroidFields, universe);
  const proposed = captureAsteroidEdits(currentFields, parseLocationId(live.world.locationId), live.world.edits);
  if (canonicalJson(proposed.fields[live.world.locationId]) !== canonicalJson(live.world.registry))
    throw Error("Waygrid live field differs from its exact current voxel capture.");
  const locations: WaygridPhysicalLocation[] = [], ids = new Set<string>();
  for (const row of snapshot.locations) {
    const descriptor = row.descriptor, id = descriptor.id, address = parseLocationId(id);
    if (address.universeId !== universe || descriptor.universeId !== universe || ids.has(id)
      || !Number.isSafeInteger(descriptor.revision) || descriptor.revision < 0 || !isUniverseRecord(row.fields))
      throw Error("Duplicate, foreign or invalid Waygrid repository location.");
    ids.add(id);
    for (const key of Object.keys(row.fields)) if (key !== GUEST_LOCATION_FIELDS
      && (!Object.hasOwn(WORLD_SAVE_OWNERS, key) || WORLD_SAVE_OWNERS[key as keyof typeof WORLD_SAVE_OWNERS] !== "location"))
      throw Error("Waygrid physical field has conflicting partition ownership.");
    // Check raw duplicate entries BEFORE a projection can collapse them.
    if (Object.hasOwn(row.fields, "edits")) asteroidVoxelEditCells(row.fields.edits as ChunkEditSave);
    const hydrated = hydrateAsteroidAttachmentLocation(catalog, persistedFields, id, row.fields);
    const generator = generation(hydrated);
    asteroidVoxelEditCells(hydrated.edits as ChunkEditSave);
    if (address.kind === "asteroid") throw Error("Waygrid local asteroid census requires the complete frame adapter.");
    if (id === live.world.locationId) {
      if (descriptor.revision !== live.locationRevision || canonicalJson(generator) !== canonicalJson({
        generatorVersion: live.generatorVersion, generatorProfile: live.generatorProfile, seed: live.seed })
        || celestialTerrainSeed(live.seed) !== live.world.registry.seed)
        throw Error("Waygrid current generator/revision differs from its stored owner.");
      locations.push({ locationId: id, voxels: world.authoredVoxels }); continue;
    }
    // Current universe pages supersede saved pages, but never hide a malformed
    // persisted row. An admitted inactive owner must still hydrate against the
    // new pages; an incompatible extent/revision is a refusal, not a guess.
    const current = hydrateAsteroidAttachmentLocation(catalog, currentFields, id, row.fields);
    const orbit = asteroidOrbitFor(address), registry = orbit && currentFields.fields[locationId(orbit)];
    if (orbit && !registry) throw Error("Waygrid physical census lacks its authoritative asteroid field.");
    if (registry && celestialTerrainSeed(generator.seed) !== registry.seed) throw Error("Waygrid field seed differs from its location.");
    const edits = current.edits as ChunkEditSave;
    locations.push({ locationId: id, voxels: asteroidVoxelEditCells(registry ? projectAsteroidEdits(registry, address, edits) : edits) });
  }
  if (!ids.has(live.world.locationId)) throw Error("Current Waygrid repository location is missing.");
  // A field with edited physical capacity cannot be silently omitted merely
  // because its location descriptor is absent from the repository snapshot.
  for (const fields of [persistedFields, currentFields]) for (const id of Object.keys(fields.fields))
    if (!ids.has(id)) throw Error("Waygrid asteroid field lacks its repository location.");
  const ownership = resolveWaygridPhysicalOwnership(locations, live.vault, live.archive);
  const bindings = ownership.bindings.map(binding => {
    if (binding.locationId !== frame.orbitId) return { ...binding, side: "other-location" as const };
    const [x, y, z] = parseCustodyCellKey(binding.key), attached = asteroidAttachmentVolumeSide(frame,
      { minX: x - .5, maxX: x + .5, minY: y - .5, maxY: y + .5, minZ: z - .5, maxZ: z + .5 }, "orbit");
    if (attached !== asteroidAttachmentContainsCell(frame, binding.key, "orbit")) throw Error("Waygrid body crosses its physical owner.");
    return { ...binding, side: attached ? "attached" as const : "orbit" as const };
  });
  return freezeUniverseJson(structuredClone({ source, ownership, bindings }));
}
