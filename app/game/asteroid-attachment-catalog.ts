import { admitAsteroidAttachmentOwner, advanceAsteroidAttachmentExtent, captureAsteroidOrbitOwner,
  composeAsteroidOrbitFields, readAsteroidAttachmentOwner, type AsteroidAttachmentOwner } from "./asteroid-attachment-owner";
import { asteroidOrbitFor, projectAsteroidEdits, validateAsteroidFields, type AsteroidFieldsSave } from "./asteroid-runtime";
import { locationId, parseLocationId, type LocationId, type UniverseId } from "./location-address";
import { assertExactKeys, cloneUniverseJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";
import type { SaveFields } from "./universe-save";
import type { ChunkEditSave } from "./world";

/** Repository-internal metadata catalog. Do not add this to a flattened engine
 * WorldSave: the repository alone advances its owner revisions. */
export type AsteroidAttachmentCatalog = Readonly<{
  schema: 1; owners: Readonly<Record<string, AsteroidAttachmentOwner>>;
}>;
function refuseUnimplementedLocalView(catalog: AsteroidAttachmentCatalog, id: LocationId) {
  const address = parseLocationId(id), orbit = asteroidOrbitFor(address);
  if (address.kind === "asteroid" && orbit && catalog.owners[locationId(orbit)])
    throw Error("Local asteroid attachment hydration/capture requires the complete frame adapter.");
}
export function readAsteroidAttachmentCatalog(raw: unknown, fieldSave: AsteroidFieldsSave, universe?: UniverseId): AsteroidAttachmentCatalog {
  const fields = validateAsteroidFields(fieldSave, universe).fields;
  if (raw === undefined) return freezeUniverseJson({ schema: 1, owners: {} });
  if (!isUniverseRecord(raw)) throw Error("Invalid attachment owner catalog.");
  assertExactKeys(raw, ["schema", "owners"], "Attachment owner catalog");
  if (raw.schema !== 1 || !isUniverseRecord(raw.owners) || Object.keys(raw.owners).length > 128) throw Error("Invalid attachment owner catalog.");
  const owners: Record<string, AsteroidAttachmentOwner> = {};
  for (const [key, value] of Object.entries(raw.owners)) {
    if (!Object.hasOwn(fields, key)) throw Error("Attachment catalog references a missing asteroid field.");
    owners[key] = readAsteroidAttachmentOwner(value, fields[key]);
    if (owners[key].orbitId !== key) throw Error("Attachment catalog owner identity mismatch.");
  }
  return freezeUniverseJson({ schema: 1, owners });
}

/** Read compatibility: legacy locations stay untouched; admitted orbit rows are
 * hydrated from their sole metadata owner and existing finite voxel pages.
 * Local asteroid hydration remains unsupported until its complete selector lands. */
export function hydrateAsteroidAttachmentLocation(catalog: AsteroidAttachmentCatalog, fields: AsteroidFieldsSave,
  id: LocationId, location: SaveFields): SaveFields {
  const checked = readAsteroidAttachmentCatalog(catalog, fields, parseLocationId(id).universeId), owner = checked.owners[id];
  refuseUnimplementedLocalView(checked, id);
  if (!owner) return cloneUniverseJson(location);
  const registry = fields.fields[id], hydrated = composeAsteroidOrbitFields(registry, owner, location);
  return { ...hydrated, edits: projectAsteroidEdits(registry, registry.orbit, hydrated.edits as ChunkEditSave) };
}

/** Pure repository write plan. Ordinary legacy checkpoints do not auto-migrate;
 * explicit admission and every later capture return BOTH new catalog and stripped
 * location fields. The host must commit them atomically in its universe journal.
 * A candidate expansion must already have captured newly covered voxel edits. */
export function captureAsteroidAttachmentCatalog(raw: AsteroidAttachmentCatalog | undefined, previousFields: AsteroidFieldsSave,
  nextFields: AsteroidFieldsSave, id: LocationId, location: SaveFields, extensions: SaveFields, admit = false) {
  const address = parseLocationId(id), catalog = readAsteroidAttachmentCatalog(raw, previousFields, address.universeId);
  refuseUnimplementedLocalView(catalog, id);
  const next = validateAsteroidFields(nextFields, address.universeId), current = catalog.owners[id];
  if (!current && !admit) return { catalog: readAsteroidAttachmentCatalog(catalog, next, address.universeId), location: cloneUniverseJson(location) };
  if (address.kind !== "orbit" || !next.fields[id]) throw Error("Attachment admission requires its existing orbital field.");
  if (admit && current) throw Error("Canonical attachment owner already exists.");
  const result = !current ? admitAsteroidAttachmentOwner(next.fields[id], null, location, extensions)
    : next.fields[id].expansionLevel === current.fieldExtent
      ? captureAsteroidOrbitOwner(next.fields[id], current, current, location, extensions)
      : advanceAsteroidAttachmentExtent(previousFields.fields[id], next.fields[id], current, current, location, extensions);
  return { catalog: readAsteroidAttachmentCatalog({ schema: 1, owners: { ...catalog.owners, [id]: result.owner } }, next, address.universeId),
    location: result.location };
}
