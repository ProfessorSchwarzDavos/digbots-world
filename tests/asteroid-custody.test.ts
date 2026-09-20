import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data.ts";
import { createCelestialTerrain } from "../app/game/celestial-terrain.ts";
import { locationAddress, universeId } from "../app/game/location-address.ts";
import {
  ASTEROID_JOURNAL_LIMIT, ASTEROID_PAGE_VOXELS, ASTEROID_MAX_FIELD_VOXELS, ASTEROID_MAX_RECORD_VOXELS,
  ASTEROID_JSON_CHARACTER_LIMIT, applyAsteroidAction, asteroidBlockAt, asteroidVoxelFromView, asteroidVoxelToView,
  asteroidVoxelLayout, createAsteroidReader, expandAsteroidRegistry,
  createAsteroidRegistry, parseAsteroidRegistry, remapAsteroidRegistry, type AsteroidAction, type AsteroidRegistry,
} from "../app/game/asteroid-custody.ts";

const orbit = locationAddress({ universeId: "custody-test", systemId: "waystar", bodyId: "blockwild", kind: "orbit", instanceId: "low" });
const center = Object.freeze({ x: 0, y: 32, z: 0 });
const fresh = () => createAsteroidRegistry(orbit, 4815);
const id = (registry: AsteroidRegistry) => registry.asteroids[0].descriptor.id;
const localAddress = (registry: AsteroidRegistry) => locationAddress({ ...registry.orbit, kind: "asteroid", instanceId: id(registry) });
function command(registry: AsteroidRegistry, type: string, extra: Record<string, unknown> = {}): AsteroidAction {
  return { operationId: `op-${registry.epoch}-${registry.revision}`, asteroidId: id(registry), location: registry.orbit,
    epoch: registry.epoch, expectedRevision: registry.revision, type, ...extra } as AsteroidAction;
}
function act(registry: AsteroidRegistry, type: string, extra: Record<string, unknown> = {}, actorId = "owner") {
  const request = command(registry, type, extra);
  return applyAsteroidAction(registry, request, { actorId, location: request.location });
}
const discover = (registry: AsteroidRegistry, actorId = "owner") => act(registry, "discover", {}, actorId).registry;
const claimed = () => act(discover(fresh()), "claim").registry;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const packed = (block: BlockId, count = ASTEROID_PAGE_VOXELS) => block.toString(16).padStart(4, "0").repeat(count);

test("catalog bindings are stable, strict, immutable and body/band specific", () => {
  const registry = fresh();
  assert.deepEqual(registry, fresh());
  assert.ok(Object.isFrozen(registry.asteroids[0].descriptor.center));
  assert.equal(registry.asteroids[0].descriptor.spinPolicy, "sky-only");
  for (const change of [
    { bodyId: "blockwild/morrow" }, { instanceId: "high" }, { systemId: "elsewhere" },
  ]) {
    const bad = clone(registry) as unknown as Record<string, unknown>;
    bad.orbit = { ...registry.orbit, ...change };
    assert.throws(() => parseAsteroidRegistry(bad), /descriptor/);
  }
  assert.throws(() => createAsteroidRegistry(locationAddress({ ...orbit, kind: "station" }), 4815), /canonical orbit/);
});

test("one canonical voxel projects to matching generated orbit and asteroid views", () => {
  const registry = discover(fresh()), local = localAddress(registry);
  const inOrbit = asteroidVoxelToView(registry, id(registry), center, orbit);
  assert.deepEqual(asteroidVoxelFromView(registry, id(registry), inOrbit, orbit), center);
  assert.deepEqual(asteroidVoxelToView(registry, id(registry), center, local), center);
  const orbitTerrain = createCelestialTerrain({ location: orbit, seed: registry.seed })!;
  const localTerrain = createCelestialTerrain({ location: local, seed: registry.seed })!;
  const material = asteroidBlockAt(registry, id(registry), center);
  assert.notEqual(material, BlockId.Air);
  assert.equal(orbitTerrain.block(inOrbit.x, inOrbit.y, inOrbit.z), material);
  assert.equal(localTerrain.block(center.x, center.y, center.z), material);
  const mined = act(registry, "extract", { position: center, expectedBlock: material }).registry;
  for (const view of [orbit, local]) {
    const projected = asteroidVoxelToView(mined, id(mined), center, view);
    assert.equal(asteroidBlockAt(mined, id(mined), asteroidVoxelFromView(mined, id(mined), projected, view)), BlockId.Air);
  }
  assert.throws(() => act(mined, "extract", { location: local, position: center, expectedBlock: material }), /current block/);
});

test("finite extraction returns one exact transfer, retry returns none, changed/stale attempts fail", () => {
  const registry = discover(fresh()), material = asteroidBlockAt(registry, id(registry), center);
  const request = command(registry, "extract", { position: center, expectedBlock: material });
  const context = { actorId: "owner", location: orbit };
  const first = applyAsteroidAction(registry, request, context);
  assert.equal(first.intent?.block, material); assert.equal(first.intent?.quantity, 1);
  assert.equal(first.intent?.debit, "asteroid"); assert.equal(first.intent?.credit, "inventory");
  assert.equal(first.intent?.localFrameId, registry.asteroids[0].descriptor.localFrameId);
  const replay = applyAsteroidAction(first.registry, request, context);
  assert.equal(replay.replayed, true); assert.equal(replay.intent, null);
  assert.deepEqual(replay.registry, first.registry);
  assert.throws(() => applyAsteroidAction(first.registry, { ...request, expectedBlock: BlockId.Glass } as AsteroidAction, context), /payload mismatch/);
  assert.throws(() => applyAsteroidAction(first.registry, { ...request, operationId: "different" }, context), /stale revision/);
  assert.throws(() => applyAsteroidAction(first.registry, request, { ...context, actorId: "thief" }), /payload mismatch/);
  assert.throws(() => act(first.registry, "extract", { position: center, expectedBlock: BlockId.Air }), /extract air/);
});

test("claims create no matter; discovery, independent build/extract grants and owner administration enforced", () => {
  assert.throws(() => act(fresh(), "claim"), /not discovered/);
  let registry = discover(fresh());
  const before = asteroidBlockAt(registry, id(registry), center), result = act(registry, "claim");
  assert.equal(result.intent, null); registry = result.registry;
  assert.equal(asteroidBlockAt(registry, id(registry), center), before);
  assert.equal(registry.asteroids[0].pages.length, 0);
  assert.throws(() => act(registry, "claim"), /already claimed/);
  registry = discover(registry, "friend"); registry = discover(registry, "stranger");
  assert.throws(() => act(registry, "extract", { position: center, expectedBlock: before }, "friend"), /permission/);
  assert.throws(() => act(registry, "access", { trustedIds: [], build: "public", extract: "public" }, "friend"), /only owner/);
  registry = act(registry, "access", { trustedIds: ["friend"], build: "owner", extract: "trusted" }).registry;
  assert.throws(() => act(registry, "extract", { position: center, expectedBlock: before }, "stranger"), /permission/);
  registry = act(registry, "extract", { position: center, expectedBlock: before }, "friend").registry;
  assert.throws(() => act(registry, "place", { position: center, expectedBlock: BlockId.Air, block: BlockId.Glass }, "friend"), /permission/);
  registry = act(registry, "access", { trustedIds: [], build: "public", extract: "owner" }).registry;
  registry = act(registry, "place", { position: center, expectedBlock: BlockId.Air, block: BlockId.Glass }, "stranger").registry;
  assert.throws(() => act(registry, "extract", { position: center, expectedBlock: BlockId.Glass }, "stranger"), /permission/);
  registry = act(registry, "access", { trustedIds: [], build: "owner", extract: "public" }).registry;
  assert.equal(act(registry, "extract", { position: center, expectedBlock: BlockId.Glass }, "stranger").intent?.block, BlockId.Glass);
});

test("finite placed construction shares the same local frame and requires an inventory debit intent", () => {
  let registry = claimed();
  const material = asteroidBlockAt(registry, id(registry), center);
  registry = act(registry, "extract", { position: center, expectedBlock: material }).registry;
  const placed = act(registry, "place", { position: center, expectedBlock: BlockId.Air, block: BlockId.StationTruss });
  assert.equal(placed.intent?.debit, "inventory"); assert.equal(placed.intent?.credit, "asteroid");
  assert.equal(placed.intent?.quantity, 1);
  assert.equal(asteroidBlockAt(placed.registry, id(registry), center), BlockId.StationTruss);
  assert.throws(() => act(placed.registry, "place", { position: center, expectedBlock: BlockId.Air, block: BlockId.Glass }), /current block/);
  const removed = act(placed.registry, "extract", { location: localAddress(registry), position: center, expectedBlock: BlockId.StationTruss });
  assert.equal(removed.intent?.block, BlockId.StationTruss);
  assert.notEqual(removed.intent?.id, placed.intent?.id);
  assert.equal(asteroidBlockAt(removed.registry, id(registry), center), BlockId.Air);
});

test("cross-body, cross-universe, wrong band/asteroid and host/view confusion fail closed", () => {
  const registry = discover(fresh());
  for (const change of [{ bodyId: "blockwild/morrow" }, { universeId: "other" }, { instanceId: "high" },
    { kind: "asteroid", instanceId: "other-rock" }, { kind: "station" }]) {
    const location = locationAddress({ ...orbit, ...change });
    assert.throws(() => asteroidVoxelToView(registry, id(registry), center, location), /location binding/);
    assert.throws(() => act(registry, "discover", { location }), /location binding/);
  }
  const request = command(registry, "discover");
  assert.throws(() => applyAsteroidAction(registry, request, { actorId: "owner", location: localAddress(registry) }), /host location/);
});

test("malformed, duplicate, forged descriptor/journal and unbounded voxel records are rejected", () => {
  const registry = claimed();
  const mutations: ((raw: Mutable<AsteroidRegistry> & { extra?: boolean }) => void)[] = [
    raw => { raw.extra = true; }, raw => { raw.asteroids.push(raw.asteroids[0]); },
    raw => { raw.asteroids[1] = raw.asteroids[0]; }, raw => { raw.asteroids[0].descriptor.shapeSeed++; },
    raw => { Object.assign(raw.asteroids[0].descriptor, { spinPolicy: "physical" }); },
    raw => { raw.asteroids[0].discoveredBy.push("owner"); },
    raw => { raw.asteroids[0].claim!.trustedIds = ["owner"]; },
    raw => { raw.asteroids[0].pages = [{ index: 0, data: "ffff".repeat(ASTEROID_PAGE_VOXELS) }]; },
    raw => { raw.asteroids[0].pages = [{ index: 0, data: packed(BlockId.Bedrock) }]; },
    raw => { raw.asteroids[0].pages = [{ index: 10000, data: packed(BlockId.Air) }]; },
    raw => { raw.asteroids[0].pages = [{ index: 0, data: packed(BlockId.Air) }, { index: 0, data: packed(BlockId.Glass) }]; },
    raw => { raw.asteroids[0].pages = [{ index: 1, data: packed(BlockId.Air) }, { index: 0, data: packed(BlockId.Glass) }]; },
    raw => { raw.asteroids[0].pages = [{ index: 0, data: "----".repeat(ASTEROID_PAGE_VOXELS) }]; },
    raw => { raw.asteroids[0].pages = [{ index: 0, data: packed(BlockId.Air, ASTEROID_PAGE_VOXELS + 1) }]; },
    raw => { raw.asteroids[0].pages = [{ index: 0, data: "000A".repeat(ASTEROID_PAGE_VOXELS) }]; },
    raw => { raw.journal[1].operationId = raw.journal[0].operationId; },
    raw => { raw.journal[0].revision++; }, raw => { raw.journal[0].binding = "{}"; },
  ];
  for (const mutate of mutations) { const raw = clone(registry) as unknown as Mutable<AsteroidRegistry>; mutate(raw); assert.throws(() => parseAsteroidRegistry(raw)); }
  let getterCalled = false;
  const bad = { ...registry, get revision() { getterCalled = true; return 0; } };
  assert.throws(() => parseAsteroidRegistry(bad), /property/); assert.equal(getterCalled, false);
  for (const position of [{ x: Infinity, y: 32, z: 0 }, { x: 0.5, y: 32, z: 0 }, { x: 0, y: -500, z: 0 }]) {
    assert.throws(() => act(registry, "extract", { position, expectedBlock: BlockId.IronOre }));
  }
});

test("import remaps address, preserves depleted voxels and claims, retires old replay journal", () => {
  let registry = claimed();
  const material = asteroidBlockAt(registry, id(registry), center);
  const request = command(registry, "extract", { position: center, expectedBlock: material });
  registry = applyAsteroidAction(registry, request, { actorId: "owner", location: orbit }).registry;
  const imported = remapAsteroidRegistry(registry, universeId("imported-copy"));
  assert.equal(imported.epoch, registry.epoch + 1); assert.equal(imported.journal.length, 0);
  assert.equal(imported.revision, registry.revision); assert.deepEqual(imported.asteroids, registry.asteroids);
  assert.equal(asteroidBlockAt(imported, id(imported), center), BlockId.Air);
  assert.throws(() => applyAsteroidAction(imported, request, { actorId: "owner", location: orbit }), /location binding/);
  assert.throws(() => act(imported, "discover", { epoch: registry.epoch }), /stale epoch/);
  assert.throws(() => remapAsteroidRegistry(registry, registry.orbit.universeId), /new universe/);
  const newResult = act(imported, "place", { position: center, expectedBlock: BlockId.Air, block: BlockId.Glass });
  assert.ok(newResult.intent?.id.includes("imported-copy"));
});

test("journal rollover permits further real extraction and rejects evicted retries", () => {
  let registry = discover(fresh());
  let first: AsteroidAction | null = null, transfers = 0;
  const total = ASTEROID_JOURNAL_LIMIT + 6;
  for (let x = -4; x <= 4 && transfers < total; x++) for (let y = 28; y <= 36 && transfers < total; y++) {
    const position = { x, y, z: 0 }, expectedBlock = asteroidBlockAt(registry, id(registry), position);
    assert.notEqual(expectedBlock, BlockId.Air);
    const request = command(registry, "extract", { position, expectedBlock });
    first ??= request;
    const result = applyAsteroidAction(registry, request, { actorId: "owner", location: orbit });
    assert.equal(result.intent?.quantity, 1); registry = result.registry; transfers++;
  }
  assert.equal(transfers, total); assert.equal(registry.journal.length, ASTEROID_JOURNAL_LIMIT);
  assert.equal(registry.asteroids[0].pages.reduce((count, page) => count + page.data.match(/.{4}/g)!.filter(code => code !== "----").length, 0), total);
  assert.throws(() => applyAsteroidAction(registry, first!, { actorId: "owner", location: orbit }), /stale revision/);
  const latest = JSON.parse(registry.journal.at(-1)!.binding).action as AsteroidAction;
  assert.equal(applyAsteroidAction(registry, latest, { actorId: "owner", location: orbit }).intent, null);
});

test("parsing and mutations never freeze or alter caller input; returned graphs are deeply immutable", () => {
  const raw = clone(discover(fresh())), snapshot = clone(raw);
  const parsed = parseAsteroidRegistry(raw);
  assert.equal(Object.isFrozen(raw), false); assert.equal(Object.isFrozen(raw.asteroids[0]), false);
  const request = command(raw, "extract", { position: { ...center }, expectedBlock: asteroidBlockAt(parsed, id(parsed), center) });
  const requestBefore = clone(request);
  const result = applyAsteroidAction(raw, request, { actorId: "owner", location: orbit });
  assert.deepEqual(raw, snapshot); assert.deepEqual(request, requestBefore);
  assert.equal(Object.isFrozen(request), false);
  assert.ok(Object.isFrozen(result.registry.asteroids[0].pages[0])); assert.ok(Object.isFrozen(result.intent));
});

test("maximum field has exactly one representable page slot for every allowed voxel", () => {
  const registry = createAsteroidRegistry(orbit, 4815, 3);
  assert.equal(registry.asteroids.length, 252);
  let actualVolume = 0;
  for (const entry of registry.asteroids) {
    const layout = asteroidVoxelLayout(entry.descriptor);
    const lastPageSlots = layout.volume - (layout.pageCount - 1) * ASTEROID_PAGE_VOXELS;
    assert.ok(lastPageSlots > 0 && lastPageSlots <= ASTEROID_PAGE_VOXELS);
    assert.equal((layout.pageCount - 1) * ASTEROID_PAGE_VOXELS + lastPageSlots, layout.size.x * layout.size.y * layout.size.z);
    assert.ok(layout.volume <= ASTEROID_MAX_RECORD_VOXELS);
    actualVolume += layout.volume;
  }
  assert.ok(actualVolume > 65_536);
  assert.ok(actualVolume <= ASTEROID_MAX_FIELD_VOXELS);
  assert.equal(ASTEROID_MAX_FIELD_VOXELS, 252 * 37 * 35 * 37);
  // Input envelope covers all full pages plus both bounded identity lists at maximum string length,
  // full receipts, and a conservative >2 MB allowance for page/descriptor JSON keys.
  const maximumIdentityCharacters = 252 * (256 * 2 + 1) * 160;
  assert.ok(ASTEROID_JSON_CHARACTER_LIMIT > ASTEROID_MAX_FIELD_VOXELS * 4 + maximumIdentityCharacters + 64 * 8192 + 2_000_000);
});

test("more than 65536 edited cells plus late-field boundary pages survive save/import and real actions", () => {
  const raw = clone(createAsteroidRegistry(orbit, 4815, 3)) as unknown as Mutable<AsteroidRegistry>;
  let edited = 0;
  for (const entry of raw.asteroids.slice(0, 6)) {
    const layout = asteroidVoxelLayout(entry.descriptor);
    entry.pages = Array.from({ length: layout.pageCount }, (_, index) => ({ index,
      data: packed(BlockId.Air, Math.min(ASTEROID_PAGE_VOXELS, layout.volume - index * ASTEROID_PAGE_VOXELS)) }));
    edited += layout.volume;
  }
  assert.ok(edited > 65_536);
  const last = raw.asteroids.at(-1)!, layout = asteroidVoxelLayout(last.descriptor);
  const end = { x: layout.min.x + layout.size.x - 1, y: layout.min.y + layout.size.y - 1, z: layout.min.z + layout.size.z - 1 };
  last.pages = [{ index: layout.pageCount - 1, data: packed(BlockId.StationTruss, layout.volume % ASTEROID_PAGE_VOXELS || ASTEROID_PAGE_VOXELS) }];
  last.discoveredBy = ["owner"]; last.claim = { ownerId: "owner", trustedIds: [], build: "owner", extract: "owner" };
  const registry = parseAsteroidRegistry(raw), reader = createAsteroidReader(registry);
  assert.equal(reader.blockAt(id(registry), center), BlockId.Air);
  assert.equal(reader.blockAt(last.descriptor.id, end), BlockId.StationTruss);
  const extracted = act(registry, "extract", { asteroidId: last.descriptor.id, position: end, expectedBlock: BlockId.StationTruss });
  assert.equal(extracted.intent?.block, BlockId.StationTruss);
  const placed = act(extracted.registry, "place", { asteroidId: last.descriptor.id, position: end, expectedBlock: BlockId.Air, block: BlockId.Glass });
  const saved = parseAsteroidRegistry(clone(placed.registry));
  assert.deepEqual(saved, placed.registry);
  const imported = remapAsteroidRegistry(saved, universeId("large-import")), importedReader = createAsteroidReader(imported);
  assert.equal(importedReader.blockAt(last.descriptor.id, end), BlockId.Glass);
  assert.equal(importedReader.blockAt(id(imported), center), BlockId.Air);
  assert.deepEqual(imported.asteroids, saved.asteroids);
  assert.equal(reader.blockAt(last.descriptor.id, end), BlockId.StationTruss, "old indexed snapshot remains immutable");
  assert.throws(() => importedReader.blockAt(last.descriptor.id, { ...end, x: end.x + 1 }), /bounds/);
  const wrongTail = clone(saved) as unknown as Mutable<AsteroidRegistry>;
  wrongTail.asteroids.at(-1)!.pages.at(-1)!.data += "0000";
  assert.throws(() => parseAsteroidRegistry(wrongTail), /page/);
});

test("expansion preserves all existing custody and only adds generated records, retiring old commands", () => {
  let registry = claimed();
  const material = asteroidBlockAt(registry, id(registry), center);
  const request = command(registry, "extract", { position: center, expectedBlock: material });
  registry = applyAsteroidAction(registry, request, { actorId: "owner", location: orbit }).registry;
  const binding = { orbit, seed: registry.seed, epoch: registry.epoch, expectedRevision: registry.revision };
  const expanded = expandAsteroidRegistry(registry, 3, binding);
  assert.equal(expanded.epoch, registry.epoch + 1); assert.equal(expanded.revision, registry.revision + 1);
  assert.equal(expanded.journal.length, 0); assert.equal(expanded.asteroids.length, 252);
  for (const original of registry.asteroids) assert.deepEqual(expanded.asteroids.find(entry => entry.descriptor.id === original.descriptor.id), original);
  const previousIds = new Set(registry.asteroids.map(entry => entry.descriptor.id));
  for (const added of expanded.asteroids.filter(entry => !previousIds.has(entry.descriptor.id))) {
    assert.deepEqual(added.pages, []); assert.deepEqual(added.discoveredBy, []); assert.equal(added.claim, null);
  }
  const reader = createAsteroidReader(expanded), originalId = id(registry);
  assert.equal(reader.blockAt(originalId, center), BlockId.Air);
  const point = asteroidVoxelToView(expanded, originalId, center, orbit);
  assert.equal(reader.blockInView(originalId, point, orbit), BlockId.Air);
  assert.equal(reader.blockInView(originalId, center, localAddress(registry)), BlockId.Air);
  assert.throws(() => applyAsteroidAction(expanded, request, { actorId: "owner", location: orbit }), /stale epoch/);
  assert.throws(() => expandAsteroidRegistry(expanded, 3, binding), /stale expansion/);
  assert.throws(() => expandAsteroidRegistry(registry, 0, binding), /increase/);
  assert.throws(() => expandAsteroidRegistry(registry, 4, binding), /increase/);
  for (const changed of [{ seed: registry.seed + 1 }, { orbit: locationAddress({ ...orbit, bodyId: "blockwild/morrow" }) },
    { orbit: locationAddress({ ...orbit, universeId: "other" }) }, { orbit: locationAddress({ ...orbit, instanceId: "high" }) }]) {
    assert.throws(() => expandAsteroidRegistry(registry, 1, { ...binding, ...changed }), /identity/);
  }
  const placement = act(expanded, "place", { asteroidId: originalId, position: center, expectedBlock: BlockId.Air, block: BlockId.Glass });
  assert.equal(placement.intent?.block, BlockId.Glass);
  assert.deepEqual(parseAsteroidRegistry(clone(placement.registry)), placement.registry);
});

test("legacy sparse saves migrate losslessly without accepting duplicate or invalid legacy voxels", () => {
  const current = claimed();
  const legacy = { ...clone(current), schema: 1, asteroids: current.asteroids.map(entry => ({ descriptor: clone(entry.descriptor),
    discoveredBy: [...entry.discoveredBy], claim: clone(entry.claim), edits: entry.descriptor.id === id(current)
      ? [{ position: { ...center }, block: BlockId.Air }] : [] })) };
  const before = clone(legacy), migrated = parseAsteroidRegistry(legacy);
  assert.equal(migrated.schema, 2); assert.deepEqual(legacy, before);
  assert.equal(migrated.epoch, current.epoch); assert.deepEqual(migrated.journal, current.journal);
  assert.equal(asteroidBlockAt(migrated, id(migrated), center), BlockId.Air);
  legacy.asteroids[0].edits.push({ position: { ...center }, block: BlockId.Air });
  assert.throws(() => parseAsteroidRegistry(legacy), /duplicate voxel/);
  legacy.asteroids[0].edits.pop(); Object.assign(legacy.asteroids[0].edits[0].position, { x: 500 });
  assert.throws(() => parseAsteroidRegistry(legacy), /bounds/);
});
