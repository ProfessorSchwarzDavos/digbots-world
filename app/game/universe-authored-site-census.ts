import { encodeAttachmentSource } from "./attachment-source-preimage";
import { hydrateAsteroidAttachmentLocation, readAsteroidAttachmentCatalog } from "./asteroid-attachment-catalog";
import { validateAsteroidFields } from "./asteroid-runtime";
import { observeAsteroidAuthoredSites, savedAuthoredSiteSources, type AuthoredSiteSources } from "./asteroid-authored-site-census";
import { parseLocationId, universeId, type LocationId } from "./location-address";
import type { UniverseCreatureCustodySnapshot } from "./universe-creature-custody";
import { freezeUniverseJson, isUniverseRecord } from "./universe-json";
import { GUEST_LOCATION_FIELDS, WORLD_SAVE_OWNERS } from "./universe-save";

/** Complete instantiated saved-site inventory, not complete generated geometry.
 * Current raw ledgers replace only their own persisted location. Hydration and
 * structural inspection of that persisted row still happen before replacement.
 * Every nonempty owner/reference remains explicitly unresolved, not admitted.
 */
export function observeUniverseAuthoredSites(snapshot: UniverseCreatureCustodySnapshot,
  live: Readonly<{ locationId: LocationId; repositoryRevision: number; locationRevision: number; source: AuthoredSiteSources }>) {
  const source = encodeAttachmentSource({ snapshot, live }), manifest = snapshot.manifest, universe = universeId(manifest.universeId);
  if (manifest.id !== universe || manifest.deletedAt !== null || !Number.isSafeInteger(manifest.revision) || manifest.revision < 1
    || manifest.currentLocationId !== live.locationId || live.repositoryRevision !== manifest.revision)
    throw Error("Authored-site census differs from its repository owner.");
  const fields = validateAsteroidFields(snapshot.universe.fields.asteroidFields, universe);
  const catalog = readAsteroidAttachmentCatalog(snapshot.universe.attachmentOwners, fields, universe);
  const ids = new Set<string>(), locations: { runtime: boolean; census: ReturnType<typeof observeAsteroidAuthoredSites>;
    persistedCensus: ReturnType<typeof observeAsteroidAuthoredSites> }[] = [];
  for (const row of snapshot.locations) {
    const descriptor = row.descriptor, id = descriptor.id;
    if (parseLocationId(id).universeId !== universe || descriptor.universeId !== universe || ids.has(id)
      || !Number.isSafeInteger(descriptor.revision) || descriptor.revision < 0 || !isUniverseRecord(row.fields))
      throw Error("Duplicate, foreign or invalid authored-site location.");
    for (const key of Object.keys(row.fields)) if (key !== GUEST_LOCATION_FIELDS
      && (!Object.hasOwn(WORLD_SAVE_OWNERS, key) || WORLD_SAVE_OWNERS[key as keyof typeof WORLD_SAVE_OWNERS] !== "location"))
      throw Error("Authored-site field has conflicting partition ownership.");
    ids.add(id);
    // Inspect raw persisted families BEFORE JSON-oriented hydration can omit
    // undefined fields or normalize -0. Hydration still enforces sole ownership.
    const rawLocation = observeAsteroidAuthoredSites(id, savedAuthoredSiteSources(row.fields));
    hydrateAsteroidAttachmentLocation(catalog, fields, id, row.fields);
    let persisted = rawLocation;
    if (catalog.owners[id]) {
      const rawCatalog = snapshot.universe.attachmentOwners as { owners: Record<string, { fields: Record<string, unknown> }> };
      persisted = observeAsteroidAuthoredSites(id, savedAuthoredSiteSources({ ...row.fields, ...rawCatalog.owners[id].fields }));
    }
    const runtime = id === live.locationId;
    if (runtime && descriptor.revision !== live.locationRevision) throw Error("Stale authored-site location revision.");
    locations.push({ runtime, persistedCensus: persisted, census: runtime ? observeAsteroidAuthoredSites(id, live.source) : persisted });
  }
  if (!ids.has(live.locationId)) throw Error("Authored-site current location is missing.");
  for (const id of Object.keys(fields.fields)) if (!ids.has(id)) throw Error("Authored-site field lacks its repository location.");
  return freezeUniverseJson(structuredClone({ source, locations,
    unresolvedLocations: locations.filter(row => row.census.status === "unresolved").map(row => row.census.locationId) }));
}
