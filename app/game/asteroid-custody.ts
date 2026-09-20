import { BLOCKS, BlockId } from "./data";
import { celestialTerrainSeed, createCelestialTerrain, orbitAsteroids, ORBIT_BANDS, type AsteroidDescriptor, type CelestialPoint, type OrbitBand } from "./celestial-terrain";
import { locationAddress, locationId, universeId, type LocationAddress, type UniverseId } from "./location-address";
import { assertExactKeys, canonicalJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

export const ASTEROID_JOURNAL_LIMIT = 64;
export const ASTEROID_PAGE_VOXELS = 256;
/** Generator v1: 16x16 cells minus the four-cell arrival corridor; radii <= (17,16,17). */
export const ASTEROID_MAX_RECORDS = 252;
export const ASTEROID_MAX_RECORD_VOXELS = 37 * 35 * 37;
export const ASTEROID_MAX_FIELD_VOXELS = ASTEROID_MAX_RECORDS * ASTEROID_MAX_RECORD_VOXELS;
// Full four-character pages plus worst-case identities, descriptor keys and bounded receipts.
export const ASTEROID_JSON_CHARACTER_LIMIT = ASTEROID_MAX_FIELD_VOXELS * 4 + ASTEROID_MAX_RECORDS * 100_000 + ASTEROID_JOURNAL_LIMIT * 8192;
const LEGACY_EDIT_LIMIT = 65_536;
export type AsteroidGrant = "owner" | "trusted" | "public";
export type AsteroidClaim = Readonly<{ ownerId: string; trustedIds: readonly string[]; build: AsteroidGrant; extract: AsteroidGrant }>;
export type AsteroidEdit = Readonly<{ position: CelestialPoint; block: BlockId }>;
/** Index is a page ordinal. Each cell is four lowercase hex digits, or ---- for untouched. */
export type AsteroidPage = Readonly<{ index: number; data: string }>;
export type AsteroidRecord = Readonly<{ descriptor: AsteroidDescriptor; discoveredBy: readonly string[]; claim: AsteroidClaim | null; pages: readonly AsteroidPage[] }>;
export type AsteroidReceipt = Readonly<{ operationId: string; revision: number; binding: string }>;
export type AsteroidRegistry = Readonly<{
  schema: 2; orbit: LocationAddress; seed: number; expansionLevel: number; epoch: number; revision: number;
  asteroids: readonly AsteroidRecord[]; journal: readonly AsteroidReceipt[];
}>;
type ActionBase = Readonly<{ operationId: string; asteroidId: string; location: LocationAddress; epoch: number; expectedRevision: number }>;
export type AsteroidAction = ActionBase & (
  | Readonly<{ type: "discover" }>
  | Readonly<{ type: "claim" }>
  | Readonly<{ type: "access"; trustedIds: readonly string[]; build: AsteroidGrant; extract: AsteroidGrant }>
  | Readonly<{ type: "extract"; position: CelestialPoint; expectedBlock: BlockId }>
  | Readonly<{ type: "place"; position: CelestialPoint; expectedBlock: BlockId.Air; block: BlockId }>
);
/** This context is supplied by authenticated host authority, never deserialized from a guest action. */
export type AsteroidHostContext = Readonly<{ actorId: string; location: LocationAddress }>;
/**
 * One proposed atomic transfer, not an inventory award. The host must validate tool/drop rules,
 * inventory capacity/debit and machine metadata, then persist this registry AND inventory together.
 * A block ID is NOT necessarily its dropped item ID. Never apply either side independently.
 */
export type AsteroidTransferIntent = Readonly<{
  id: string; kind: "extract" | "place"; actorId: string; orbit: LocationAddress; asteroidId: string;
  localFrameId: string; position: CelestialPoint; block: BlockId; quantity: 1;
  debit: "asteroid" | "inventory"; credit: "inventory" | "asteroid";
}>;
export type AsteroidResult = Readonly<{ registry: AsteroidRegistry; replayed: boolean; intent: AsteroidTransferIntent | null }>;

function fail(message: string): never { throw new Error(`Asteroid: ${message}.`); }
function exact(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!isUniverseRecord(value)) fail("expected a JSON record");
  assertExactKeys(value, keys, "Asteroid record");
}
function integer(value: unknown, minimum = 0): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum) fail("invalid integer");
}
function token(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$/.test(value)) fail("invalid identity");
}
function ids(value: unknown): asserts value is readonly string[] {
  if (!Array.isArray(value) || value.length > 256) fail("invalid identities");
  value.forEach(token);
  if (new Set(value).size !== value.length) fail("duplicate identity");
}
function grant(value: unknown): asserts value is AsteroidGrant {
  if (!["owner", "trusted", "public"].includes(value as string)) fail("invalid grant");
}
function block(value: unknown): asserts value is BlockId {
  integer(value);
  if (value > 0xfffe || !Object.hasOwn(BLOCKS, value) || value === BlockId.Bedrock) fail("unknown or protected block");
}
const blockCodes = new Map(Object.keys(BLOCKS).map(Number).filter(id => id !== BlockId.Bedrock && id <= 0xfffe)
  .map(id => [id.toString(16).padStart(4, "0"), id as BlockId]));
/** Reject getters, sparse arrays, non-JSON values and oversized input before cloning/freezing. */
function jsonCopy<T>(value: T): T {
  let nodes = 0, characters = 0;
  const ancestors = new Set<object>();
  function visit(input: unknown, depth: number): void {
    if (++nodes > 1_000_000 || depth > 20) fail("JSON structural limit");
    if (input === null || typeof input === "boolean" || typeof input === "number" && Number.isFinite(input)) return;
    if (typeof input === "string") { if ((characters += input.length) > ASTEROID_JSON_CHARACTER_LIMIT) fail("JSON size limit"); return; }
    if (typeof input !== "object" || !input || ancestors.has(input) || !Array.isArray(input) && !isUniverseRecord(input)) fail("invalid JSON");
    ancestors.add(input);
    const keys = Reflect.ownKeys(input);
    if (keys.length > LEGACY_EDIT_LIMIT + 1 || Array.isArray(input) && keys.length !== input.length + 1) fail("invalid array or size");
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
      if (typeof key !== "string" || !("value" in descriptor) || !descriptor.enumerable && !(Array.isArray(input) && key === "length")) fail("invalid JSON property");
      if (Array.isArray(input) && key === "length") continue;
      if ((characters += key.length) > ASTEROID_JSON_CHARACTER_LIMIT) fail("JSON size limit");
      visit(descriptor.value, depth + 1);
    }
    ancestors.delete(input);
  }
  visit(value, 0);
  return JSON.parse(canonicalJson(value)) as T;
}
function catalog(registry: Pick<AsteroidRegistry, "orbit" | "seed" | "expansionLevel">): readonly AsteroidDescriptor[] {
  return orbitAsteroids(celestialTerrainSeed(registry.seed, registry.orbit.systemId, registry.orbit.bodyId), registry.orbit.bodyId,
    registry.orbit.instanceId as OrbitBand, registry.expansionLevel);
}
function asteroid(registry: AsteroidRegistry, id: string): AsteroidRecord {
  const found = registry.asteroids.find(entry => entry.descriptor.id === id);
  if (!found) fail("unknown asteroid");
  return found;
}
function position(value: unknown, descriptor: AsteroidDescriptor): asserts value is CelestialPoint {
  exact(value, ["x", "y", "z"]);
  for (const axis of ["x", "y", "z"] as const) {
    const coordinate = value[axis];
    if (!Number.isSafeInteger(coordinate) || Math.abs(Number(coordinate) - (axis === "y" ? 32 : 0)) > Math.floor(descriptor.radii[axis] * 1.1)) fail("voxel outside descriptor bounds");
  }
}
export type AsteroidVoxelLayout = Readonly<{ min: CelestialPoint; size: CelestialPoint; volume: number; pageCount: number }>;
/** X varies fastest, then Z, then Y. Exactly covers the allowed descriptor bounding box. */
export function asteroidVoxelLayout(descriptor: AsteroidDescriptor): AsteroidVoxelLayout {
  const radii = descriptor.radii;
  if (![radii.x, radii.y, radii.z].every(value => Number.isSafeInteger(value) && value > 0)
    || radii.x > 17 || radii.y > 16 || radii.z > 17) fail("unsupported descriptor dimensions");
  const x = Math.floor(radii.x * 1.1), y = Math.floor(radii.y * 1.1), z = Math.floor(radii.z * 1.1);
  const size = Object.freeze({ x: x * 2 + 1, y: y * 2 + 1, z: z * 2 + 1 }), volume = size.x * size.y * size.z;
  return Object.freeze({ min: Object.freeze({ x: -x, y: 32 - y, z: -z }), size, volume, pageCount: Math.ceil(volume / ASTEROID_PAGE_VOXELS) });
}
function voxelIndex(layout: AsteroidVoxelLayout, local: CelestialPoint): number {
  return ((local.y - layout.min.y) * layout.size.z + local.z - layout.min.z) * layout.size.x + local.x - layout.min.x;
}
function pageLength(layout: AsteroidVoxelLayout, page: number): number {
  return Math.min(ASTEROID_PAGE_VOXELS, layout.volume - page * ASTEROID_PAGE_VOXELS);
}
function writePage(pages: readonly AsteroidPage[], layout: AsteroidVoxelLayout, local: CelestialPoint, value: BlockId): readonly AsteroidPage[] {
  const offset = voxelIndex(layout, local), index = Math.floor(offset / ASTEROID_PAGE_VOXELS), slot = offset % ASTEROID_PAGE_VOXELS * 4;
  const data = pages.find(page => page.index === index)?.data ?? "----".repeat(pageLength(layout, index));
  return [...pages.filter(page => page.index !== index), { index, data: data.slice(0, slot) + value.toString(16).padStart(4, "0") + data.slice(slot + 4) }]
    .sort((left, right) => left.index - right.index);
}
function validatePages(value: unknown, layout: AsteroidVoxelLayout): asserts value is readonly AsteroidPage[] {
  if (!Array.isArray(value) || value.length > layout.pageCount) fail("invalid page count");
  let previous = -1;
  for (const page of value) {
    exact(page, ["index", "data"]); integer(page.index);
    if (page.index <= previous || page.index >= layout.pageCount || typeof page.data !== "string"
      || page.data.length !== pageLength(layout, page.index) * 4) fail("duplicate, unordered or out-of-bounds page");
    previous = page.index; let populated = false;
    for (let offset = 0; offset < page.data.length; offset += 4) {
      const code = page.data.slice(offset, offset + 4);
      if (code === "----") continue;
      if (!blockCodes.has(code)) fail("unknown or protected page block");
      populated = true;
    }
    if (!populated) fail("empty page must be omitted");
  }
}
function view(registry: AsteroidRegistry, descriptor: AsteroidDescriptor, raw: unknown): LocationAddress {
  const address = locationAddress(raw), orbit = registry.orbit;
  if (address.universeId !== orbit.universeId || address.systemId !== orbit.systemId || address.bodyId !== orbit.bodyId
    || !(address.kind === "orbit" && address.instanceId === orbit.instanceId || address.kind === "asteroid" && address.instanceId === descriptor.id)) fail("location binding mismatch");
  return address;
}
function claim(value: unknown): asserts value is AsteroidClaim | null {
  if (value === null) return;
  exact(value, ["ownerId", "trustedIds", "build", "extract"]);
  token(value.ownerId); ids(value.trustedIds); grant(value.build); grant(value.extract);
  if (value.trustedIds.includes(value.ownerId)) fail("owner duplicated as trusted");
}
function action(raw: unknown, registry: AsteroidRegistry): AsteroidAction {
  if (!isUniverseRecord(raw)) fail("invalid action");
  const fields = ["operationId", "asteroidId", "location", "epoch", "expectedRevision", "type"];
  if (raw.type === "access") fields.push("trustedIds", "build", "extract");
  else if (raw.type === "extract") fields.push("position", "expectedBlock");
  else if (raw.type === "place") fields.push("position", "expectedBlock", "block");
  else if (raw.type !== "discover" && raw.type !== "claim") fail("unknown action");
  exact(raw, fields); token(raw.operationId); token(raw.asteroidId); integer(raw.epoch, 1); integer(raw.expectedRevision);
  const entry = asteroid(registry, raw.asteroidId);
  view(registry, entry.descriptor, raw.location);
  if (raw.type === "access") { ids(raw.trustedIds); grant(raw.build); grant(raw.extract); }
  if (raw.type === "extract" || raw.type === "place") { position(raw.position, entry.descriptor); block(raw.expectedBlock); }
  if (raw.type === "extract" && raw.expectedBlock === BlockId.Air) fail("cannot extract air");
  if (raw.type === "place") { block(raw.block); if (raw.block === BlockId.Air || raw.expectedBlock !== BlockId.Air) fail("placement requires empty voxel and material"); }
  return raw as AsteroidAction;
}

/** Strict save/import boundary; schema 1 sparse edits migrate losslessly into schema 2 pages. */
export function parseAsteroidRegistry(raw: unknown): AsteroidRegistry {
  const value = jsonCopy(raw);
  exact(value, ["schema", "orbit", "seed", "expansionLevel", "epoch", "revision", "asteroids", "journal"]);
  if (value.schema !== 1 && value.schema !== 2) fail("unsupported schema");
  const legacy = value.schema === 1;
  const orbit = locationAddress(value.orbit);
  if (orbit.kind !== "orbit" || !ORBIT_BANDS.includes(orbit.instanceId as OrbitBand)) fail("registry requires a canonical orbit band");
  if (!Number.isSafeInteger(value.seed)) fail("invalid seed");
  integer(value.expansionLevel); if (value.expansionLevel > 3) fail("invalid expansion");
  integer(value.epoch, 1); integer(value.revision);
  const registry = value as unknown as AsteroidRegistry, generated = catalog(registry);
  if (!Array.isArray(value.asteroids) || value.asteroids.length !== generated.length) fail("incomplete asteroid catalog");
  const seen = new Set<string>(); let legacyEdits = 0;
  for (const [recordIndex, entry] of value.asteroids.entries()) {
    exact(entry, ["descriptor", "discoveredBy", "claim", legacy ? "edits" : "pages"]);
    if (!isUniverseRecord(entry.descriptor)) fail("invalid descriptor");
    const descriptorId = entry.descriptor.id;
    const expected = generated.find(item => item.id === descriptorId);
    if (!expected || seen.has(expected.id) || canonicalJson(entry.descriptor) !== canonicalJson(expected)) fail("duplicate or altered descriptor");
    seen.add(expected.id); ids(entry.discoveredBy); claim(entry.claim);
    if (entry.claim && !entry.discoveredBy.includes(entry.claim.ownerId)) fail("undiscovered claim owner");
    const layout = asteroidVoxelLayout(expected);
    if (legacy) {
      if (!Array.isArray(entry.edits) || (legacyEdits += entry.edits.length) > LEGACY_EDIT_LIMIT) fail("invalid legacy edit storage");
      const coordinates = new Set<number>(), pageData = new Map<number, string[]>();
      for (const edit of entry.edits) {
        exact(edit, ["position", "block"]); position(edit.position, expected); block(edit.block);
        const offset = voxelIndex(layout, edit.position), index = Math.floor(offset / ASTEROID_PAGE_VOXELS);
        if (coordinates.has(offset)) fail("duplicate voxel");
        coordinates.add(offset);
        let slots = pageData.get(index);
        if (!slots) { slots = Array<string>(pageLength(layout, index)).fill("----"); pageData.set(index, slots); }
        slots[offset % ASTEROID_PAGE_VOXELS] = edit.block.toString(16).padStart(4, "0");
      }
      const pages = [...pageData].sort(([left], [right]) => left - right).map(([index, slots]) => ({ index, data: slots.join("") }));
      value.asteroids[recordIndex] = { descriptor: entry.descriptor, discoveredBy: entry.discoveredBy, claim: entry.claim, pages };
    } else {
      validatePages(entry.pages, layout);
    }
  }
  if (!Array.isArray(value.journal) || value.journal.length > ASTEROID_JOURNAL_LIMIT || value.journal.length > value.revision) fail("invalid journal");
  const operations = new Set<string>();
  for (const [index, receipt] of value.journal.entries()) {
    exact(receipt, ["operationId", "revision", "binding"]); token(receipt.operationId); integer(receipt.revision, 1);
    if (operations.has(receipt.operationId) || receipt.revision !== value.revision - value.journal.length + index + 1
      || typeof receipt.binding !== "string" || receipt.binding.length > 8192) fail("invalid receipt");
    operations.add(receipt.operationId);
    const bound: unknown = JSON.parse(receipt.binding);
    exact(bound, ["actorId", "action"]); token(bound.actorId);
    const command = action(bound.action, registry);
    if (command.operationId !== receipt.operationId || command.expectedRevision !== receipt.revision - 1 || command.epoch !== value.epoch
      || canonicalJson(bound) !== receipt.binding) fail("receipt payload mismatch");
  }
  value.schema = 2;
  return freezeUniverseJson(registry);
}

export function createAsteroidRegistry(orbit: LocationAddress, seed: number, expansionLevel = 0): AsteroidRegistry {
  const settings = { orbit: locationAddress(orbit), seed, expansionLevel };
  return parseAsteroidRegistry({ schema: 2, ...settings, epoch: 1, revision: 0,
    asteroids: catalog(settings).map(descriptor => ({ descriptor, discoveredBy: [], claim: null, pages: [] })), journal: [] });
}

/** Canonical local centre is (0,32,0). Slow spin is sky-only: no physics/edit rotation. */
export function asteroidVoxelToView(registry: AsteroidRegistry, id: string, local: CelestialPoint, location: LocationAddress): CelestialPoint {
  const descriptor = asteroid(registry, id).descriptor, address = view(registry, descriptor, location);
  position(local, descriptor);
  return Object.freeze(address.kind === "asteroid" ? { ...local } : {
    x: local.x + descriptor.center.x, y: local.y + descriptor.center.y - 32, z: local.z + descriptor.center.z,
  });
}
export function asteroidVoxelFromView(registry: AsteroidRegistry, id: string, point: CelestialPoint, location: LocationAddress): CelestialPoint {
  const descriptor = asteroid(registry, id).descriptor, address = view(registry, descriptor, location);
  exact(point, ["x", "y", "z"]);
  if (![point.x, point.y, point.z].every(Number.isSafeInteger)) fail("invalid view coordinates");
  const local = address.kind === "asteroid" ? { ...point } : {
    x: point.x - descriptor.center.x, y: point.y - descriptor.center.y + 32, z: point.z - descriptor.center.z,
  };
  position(local, descriptor); return Object.freeze(local);
}

export type AsteroidReader = Readonly<{
  registry: AsteroidRegistry;
  blockAt(id: string, local: CelestialPoint): BlockId;
  blockInView(id: string, point: CelestialPoint, location: LocationAddress): BlockId;
}>;
/**
 * Immutable snapshot with O(1) page lookup and one lazy terrain sampler per accessed asteroid.
 * At most 252 record maps/terrain samplers; page strings are shared with the frozen snapshot.
 * Recreate after commits; old readers deliberately retain their old revision. No global cache.
 */
export function createAsteroidReader(raw: unknown): AsteroidReader {
  const registry = parseAsteroidRegistry(raw);
  const records = new Map(registry.asteroids.map(entry => [entry.descriptor.id, {
    entry, layout: asteroidVoxelLayout(entry.descriptor), pages: new Map(entry.pages.map(page => [page.index, page.data])),
    terrain: null as ReturnType<typeof createCelestialTerrain>,
  }]));
  const blockAt = (id: string, local: CelestialPoint): BlockId => {
    const cached = records.get(id);
    if (!cached) fail("unknown asteroid");
    position(local, cached.entry.descriptor);
    const index = voxelIndex(cached.layout, local), page = cached.pages.get(Math.floor(index / ASTEROID_PAGE_VOXELS));
    const code = page?.slice(index % ASTEROID_PAGE_VOXELS * 4, (index % ASTEROID_PAGE_VOXELS + 1) * 4);
    if (code !== undefined && code !== "----") return blockCodes.get(code)!;
    cached.terrain ??= createCelestialTerrain({ seed: registry.seed, expansionLevel: registry.expansionLevel, band: registry.orbit.instanceId as OrbitBand,
      location: locationAddress({ ...registry.orbit, kind: "asteroid", instanceId: id }) });
    if (!cached.terrain) fail("missing asteroid terrain");
    return cached.terrain.block(local.x, local.y, local.z);
  };
  return Object.freeze({ registry, blockAt, blockInView: (id: string, point: CelestialPoint, location: LocationAddress) =>
    blockAt(id, asteroidVoxelFromView(registry, id, point, location)) });
}
/** Convenience reference read; bulk terrain callers should retain one createAsteroidReader snapshot. */
export function asteroidBlockAt(registry: AsteroidRegistry, id: string, local: CelestialPoint): BlockId {
  return createAsteroidReader(registry).blockAt(id, local);
}
function allowed(entry: AsteroidRecord, actorId: string, permission: "build" | "extract"): boolean {
  if (!entry.claim) return permission === "extract";
  return entry.claim.ownerId === actorId || entry.claim[permission] === "public"
    || entry.claim[permission] === "trusted" && entry.claim.trustedIds.includes(actorId);
}

/**
 * Pure proposed transaction. Recent exact retries return no transfer; changed retries fail.
 * Evicted retries fail stale revision. Journal rollover imposes NO extraction operation cap.
 * External idempotency uses intent.id (address + epoch + revision), not operationId alone.
 */
export function applyAsteroidAction(raw: unknown, request: AsteroidAction, context: AsteroidHostContext): AsteroidResult {
  const registry = parseAsteroidRegistry(raw), command = action(jsonCopy(request), registry);
  exact(context, ["actorId", "location"]); token(context.actorId);
  const entry = asteroid(registry, command.asteroidId);
  view(registry, entry.descriptor, context.location);
  if (locationId(context.location) !== locationId(command.location)) fail("host location mismatch");
  if (command.epoch !== registry.epoch) fail("stale epoch");
  const binding = canonicalJson({ actorId: context.actorId, action: command });
  if (binding.length > 8192) fail("action payload limit");
  const previous = registry.journal.find(receipt => receipt.operationId === command.operationId);
  if (previous) {
    if (previous.binding !== binding) fail("operation payload mismatch");
    return Object.freeze({ registry, replayed: true, intent: null });
  }
  if (command.expectedRevision !== registry.revision) fail("stale revision");
  if (registry.revision === Number.MAX_SAFE_INTEGER) fail("revision exhausted");
  let next = entry, intent: AsteroidTransferIntent | null = null;
  const revision = registry.revision + 1;
  if (command.type === "discover") {
    next = { ...entry, discoveredBy: [...new Set([...entry.discoveredBy, context.actorId])] };
  } else {
    if (!entry.discoveredBy.includes(context.actorId)) fail("actor has not discovered asteroid");
    if (command.type === "claim") {
      if (entry.claim) fail("asteroid already claimed");
      next = { ...entry, claim: { ownerId: context.actorId, trustedIds: [], build: "owner", extract: "owner" } };
    } else if (command.type === "access") {
      if (entry.claim?.ownerId !== context.actorId) fail("only owner may change access");
      next = { ...entry, claim: { ownerId: context.actorId, trustedIds: command.trustedIds, build: command.build, extract: command.extract } };
    } else {
      if (!allowed(entry, context.actorId, command.type === "extract" ? "extract" : "build")) fail("permission denied");
      if (asteroidBlockAt(registry, command.asteroidId, command.position) !== command.expectedBlock) fail("current block mismatch");
      next = { ...entry, pages: writePage(entry.pages, asteroidVoxelLayout(entry.descriptor), command.position,
        command.type === "extract" ? BlockId.Air : command.block) };
      intent = { id: canonicalJson([locationId(registry.orbit), registry.epoch, revision]), kind: command.type, actorId: context.actorId,
        orbit: registry.orbit, asteroidId: command.asteroidId, localFrameId: entry.descriptor.localFrameId, position: command.position,
        block: command.type === "extract" ? command.expectedBlock : command.block, quantity: 1,
        debit: command.type === "extract" ? "asteroid" : "inventory", credit: command.type === "extract" ? "inventory" : "asteroid" };
    }
  }
  const updated = parseAsteroidRegistry({ ...registry, revision, asteroids: registry.asteroids.map(item => item === entry ? next : item),
    journal: [...registry.journal, { operationId: command.operationId, revision, binding }].slice(-ASTEROID_JOURNAL_LIMIT) });
  return freezeUniverseJson({ registry: updated, replayed: false, intent });
}

/** Import a copied universe, preserving all finite edits/claims; old command epochs and addresses are retired. */
export function remapAsteroidRegistry(raw: unknown, destination: UniverseId): AsteroidRegistry {
  const registry = parseAsteroidRegistry(raw), target = universeId(destination);
  if (target === registry.orbit.universeId || registry.epoch === Number.MAX_SAFE_INTEGER) fail("import requires a new universe and available epoch");
  return parseAsteroidRegistry({ ...registry, orbit: { ...registry.orbit, universeId: target }, epoch: registry.epoch + 1, journal: [] });
}

export type AsteroidExpansionBinding = Readonly<{ orbit: LocationAddress; seed: number; epoch: number; expectedRevision: number }>;
/** Host migration only: unlocks generated descriptors, never grants claims, voxels or inventory. */
export function expandAsteroidRegistry(raw: unknown, expansionLevel: number, binding: AsteroidExpansionBinding): AsteroidRegistry {
  const registry = parseAsteroidRegistry(raw);
  exact(binding, ["orbit", "seed", "epoch", "expectedRevision"]);
  if (locationId(binding.orbit) !== locationId(registry.orbit) || binding.seed !== registry.seed) fail("expansion identity mismatch");
  if (binding.epoch !== registry.epoch || binding.expectedRevision !== registry.revision) fail("stale expansion binding");
  integer(expansionLevel);
  if (expansionLevel <= registry.expansionLevel || expansionLevel > 3) fail("expansion must increase within 0..3");
  if (registry.epoch === Number.MAX_SAFE_INTEGER || registry.revision === Number.MAX_SAFE_INTEGER) fail("expansion counter exhausted");
  const previous = new Map(registry.asteroids.map(entry => [entry.descriptor.id, entry]));
  const generated = catalog({ ...registry, expansionLevel });
  const asteroids = generated.map(descriptor => {
    const existing = previous.get(descriptor.id);
    if (existing && canonicalJson(existing.descriptor) !== canonicalJson(descriptor)) fail("expansion changed existing descriptor");
    previous.delete(descriptor.id);
    return existing ?? { descriptor, discoveredBy: [], claim: null, pages: [] };
  });
  if (previous.size) fail("expansion lost existing descriptors");
  return parseAsteroidRegistry({ ...registry, expansionLevel, epoch: registry.epoch + 1, revision: registry.revision + 1, asteroids, journal: [] });
}
