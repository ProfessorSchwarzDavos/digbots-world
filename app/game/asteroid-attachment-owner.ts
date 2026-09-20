import { parseAsteroidRegistry, type AsteroidRegistry } from "./asteroid-custody";
import { ASTEROID_ATTACHMENT_FIELD_POLICY, assertKnownAsteroidAttachmentFields, type AsteroidAttachmentFieldKind } from "./asteroid-attachment-policy";
import { stripCapturedAsteroidEditMirrors } from "./asteroid-attachment-voxels";
import { celestialTerrainSeed } from "./celestial-terrain";
import { locationId, type LocationId } from "./location-address";
import { assertExactKeys, canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";
import type { SaveFields } from "./universe-save";
import type { ChunkEditSave } from "./world";

/** Canonical ORBIT-coordinate metadata, not a local projection or a travel grant.
 * This pure record is not yet part of WorldSave or the persistence adapter.
 * Finite asteroid pages stay in their pre-existing universe-owned registry. */
export type AsteroidAttachmentOwner = Readonly<{
  schema: 1; orbitId: LocationId; fieldSeed: number; fieldExtent: number; epoch: number; revision: number; fields: SaveFields;
}>;
export type AsteroidAttachmentOwnerStamp = Readonly<{ epoch: number; revision: number }>;
const canonicalKinds = {
  environment: false, navigation: false, guest: false,
  voxels: true, "block-keyed": true, machine: true, pressure: true, aquarium: true, station: true,
  "authored-content": true, spell: true, entity: true, liquid: true, ecology: true, agent: true,
} satisfies Record<AsteroidAttachmentFieldKind, boolean>;
function physical(key: string): boolean {
  if (!Object.hasOwn(ASTEROID_ATTACHMENT_FIELD_POLICY, key)) throw Error(`Unsupported attachment owner field: ${key}.`);
  return canonicalKinds[ASTEROID_ATTACHMENT_FIELD_POLICY[key as keyof typeof ASTEROID_ATTACHMENT_FIELD_POLICY]];
}
function counter(value: unknown, minimum: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}
function knownLocation(value: SaveFields): void {
  if (!isUniverseRecord(value)) throw Error("Missing attachment location partition.");
  assertKnownAsteroidAttachmentFields(value);
}
function requireCore(fields: SaveFields): asserts fields is SaveFields & { edits: ChunkEditSave } {
  if (![fields.edits, fields.furnaces, fields.chests].every(isUniverseRecord)) throw Error("Attachment owner is missing its complete physical core.");
}
function checkLocationSeed(registry: AsteroidRegistry, fields: SaveFields): void {
  if (typeof fields.seed !== "string" || !fields.seed || celestialTerrainSeed(fields.seed) !== registry.seed)
    throw Error("Attachment location differs from the captured field seed.");
}
function partition(registry: AsteroidRegistry, fields: SaveFields, extensions: SaveFields) {
  knownLocation(fields); checkLocationSeed(registry, fields); requireCore(fields);
  if (!isUniverseRecord(extensions) || Object.keys(extensions).length) throw Error("Unknown save extensions block attachment owner admission.");
  const owned: Record<string, unknown> = {}, location: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) (physical(key) ? owned : location)[key] = value;
  // The caller must capture finite pages BEFORE this proposal, in the same future
  // durable transaction. Stale pages reject instead of erasing uncaptured edits.
  owned.edits = stripCapturedAsteroidEditMirrors(registry, registry.orbit, fields.edits);
  return { fields: cloneUniverseJson(owned), location: cloneUniverseJson(location) };
}

/** Structural/ownership validation only, not all field-specific game semantics.
 * Existing engine validators still validate their records; full frame selection
 * requires each spatial/relationship codec before any runtime can use this owner.
 * Normalization, history rewriting and portable metadata rebasing are forbidden. */
export function readAsteroidAttachmentOwner(raw: unknown, input: AsteroidRegistry): AsteroidAttachmentOwner {
  const registry = parseAsteroidRegistry(input);
  if (!isUniverseRecord(raw)) throw Error("Missing canonical attachment owner.");
  assertExactKeys(raw, ["schema", "orbitId", "fieldSeed", "fieldExtent", "epoch", "revision", "fields"], "Attachment owner");
  if (raw.schema !== 1 || raw.orbitId !== locationId(registry.orbit) || raw.fieldSeed !== registry.seed || raw.fieldExtent !== registry.expansionLevel
    || !counter(raw.epoch, 1) || !counter(raw.revision, 0) || !isUniverseRecord(raw.fields)) throw Error("Invalid or foreign attachment owner.");
  for (const key of Object.keys(raw.fields)) if (!physical(key)) throw Error("Attachment owner contains a view-local field.");
  requireCore(raw.fields);
  if (canonicalJson(stripCapturedAsteroidEditMirrors(registry, registry.orbit, raw.fields.edits)) !== canonicalJson(raw.fields.edits))
    throw Error("Attachment owner still contains finite asteroid page mirrors.");
  return freezeUniverseJson(cloneUniverseJson(raw)) as AsteroidAttachmentOwner;
}

/** Proposed single-owner admission. The caller supplies the actual existing owner
 * (null only for first admission); persistence must compare and commit its absence
 * with the stripped location row atomically. Never save only one half. */
export function admitAsteroidAttachmentOwner(registry: AsteroidRegistry, existing: AsteroidAttachmentOwner | null,
  fields: SaveFields, extensions: SaveFields) {
  if (existing !== null) throw Error("Canonical attachment owner already exists.");
  const checked = parseAsteroidRegistry(registry), parts = partition(checked, fields, extensions);
  const owner = readAsteroidAttachmentOwner({ schema: 1, orbitId: locationId(checked.orbit), fieldSeed: checked.seed, fieldExtent: checked.expansionLevel,
    epoch: 1, revision: 0, fields: parts.fields }, checked);
  return freezeUniverseJson({ owner, location: parts.location });
}

/** In-memory orbit hydration only. Persisting this merged projection directly
 * would duplicate its owner. A residual physical key, even an empty map, rejects. */
export function composeAsteroidOrbitFields(registry: AsteroidRegistry, raw: AsteroidAttachmentOwner, location: SaveFields): SaveFields {
  const owner = readAsteroidAttachmentOwner(raw, registry);
  knownLocation(location); checkLocationSeed(registry, location);
  if (Object.keys(location).some(physical)) throw Error("Location retains a duplicate attachment owner field.");
  return cloneUniverseJson({ ...location, ...owner.fields });
}

/** Whole-orbit capture proposal, not local-view capture or a storage write. The
 * durable host must also bind the universe lease/record revision, finite pages,
 * player resources and exact retry intent in its existing journal transaction. */
export function captureAsteroidOrbitOwner(registry: AsteroidRegistry, raw: AsteroidAttachmentOwner,
  expected: AsteroidAttachmentOwnerStamp, fields: SaveFields, extensions: SaveFields) {
  const owner = readAsteroidAttachmentOwner(raw, registry);
  return capture(registry, owner, expected, fields, extensions);
}
function capture(registry: AsteroidRegistry, owner: AsteroidAttachmentOwner,
  expected: AsteroidAttachmentOwnerStamp, fields: SaveFields, extensions: SaveFields) {
  if (expected.epoch !== owner.epoch || expected.revision !== owner.revision) throw Error("Stale attachment owner revision.");
  const parts = partition(registry, fields, extensions);
  if (Object.keys(owner.fields).some(key => !Object.hasOwn(parts.fields, key))) throw Error("Capture omitted an existing attachment owner field.");
  const changed = owner.fieldExtent !== registry.expansionLevel || canonicalJson(owner.fields) !== canonicalJson(parts.fields);
  if (changed && owner.revision === Number.MAX_SAFE_INTEGER) throw Error("Attachment owner revision exhausted.");
  return freezeUniverseJson({ owner: readAsteroidAttachmentOwner({ ...owner, fieldExtent: registry.expansionLevel,
    fields: parts.fields, revision: owner.revision + Number(changed) }, registry),
    location: parts.location });
}

/** Single-ring survey scope change. Old metadata is read against its OLD scope;
 * newly covered construction must already match the expanded canonical pages.
 * The caller must journal expanded pages, this owner and the paid instrument
 * together. This does not grant survey authority or pay its resource cost. */
export function advanceAsteroidAttachmentExtent(previous: AsteroidRegistry, expanded: AsteroidRegistry, raw: AsteroidAttachmentOwner,
  expected: AsteroidAttachmentOwnerStamp, fields: SaveFields, extensions: SaveFields) {
  const before = parseAsteroidRegistry(previous), after = parseAsteroidRegistry(expanded), owner = readAsteroidAttachmentOwner(raw, before);
  if (locationId(before.orbit) !== locationId(after.orbit) || before.seed !== after.seed || after.expansionLevel !== before.expansionLevel + 1
    || after.epoch <= before.epoch || after.revision <= before.revision) throw Error("Invalid attachment field expansion transition.");
  const next = new Map(after.asteroids.map(entry => [entry.descriptor.id, entry]));
  if (before.asteroids.some(entry => !next.has(entry.descriptor.id) || canonicalJson(next.get(entry.descriptor.id)) !== canonicalJson(entry)))
    throw Error("Attachment expansion changed an existing asteroid's custody.");
  return capture(after, owner, expected, fields, extensions);
}
