import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { captureAsteroidEdits, type AsteroidFieldsSave } from "../app/game/asteroid-runtime";
import { captureAsteroidAttachmentCatalog } from "../app/game/asteroid-attachment-catalog";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { celestialTerrainSeed, createCelestialTerrain } from "../app/game/celestial-terrain";
import { createDigitalCreatureArchive, createDigitalItemVault } from "../app/game/digital-storage";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import type { UniverseCreatureCustodySnapshot } from "../app/game/universe-creature-custody";
import { selectUniverseWaygridOwnership, type LiveUniverseWaygrid } from "../app/game/universe-waygrid-ownership";
import { waygridBlockCapacity } from "../app/game/waygrid-capacity";
import { waygridCapacityId } from "../app/game/waygrid-capacity-identity";
import type { ChunkEditSave } from "../app/game/world";
import type { SaveFields } from "../app/game/universe-save";

const universe = universeId("universe-waygrid"), home = homeLocation(universe);
const orbit = locationAddress({ ...home, kind: "orbit", instanceId: "low" });
const high = locationAddress({ ...orbit, instanceId: "high" }), seed = "waygrid-global-source";
const ids = [locationId(orbit), locationId(home), locationId(high)];
const base = createAsteroidRegistry(orbit, celestialTerrainSeed(seed));
const highBase = createAsteroidRegistry(high, celestialTerrainSeed(seed));
const frame = createAsteroidAttachmentFrame(base, base.asteroids[0].descriptor.id);
const center = [frame.offset.x, frame.offset.y + 32, frame.offset.z].join(",");
const highCenter = Object.values(highBase.asteroids[0].descriptor.center).join(",");
const edits = (key: string, block: BlockId): ChunkEditSave => {
  const [x, y, z] = key.split(",").map(Number), cx = Math.floor(x / 16), cz = Math.floor(z / 16);
  return { [`${cx},${cz}`]: [[(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, block]] };
};
function fixture() {
  const entries = [[0, center, BlockId.WaygridCellI], [1, center, BlockId.WaygridCellII],
    [2, highCenter, BlockId.WaygridCreatureArchive]] as const;
  let fields: AsteroidFieldsSave = { schema: 1, fields: { [ids[0]]: base, [ids[2]]: highBase } };
  fields = captureAsteroidEdits(fields, orbit, edits(center, BlockId.WaygridCellI));
  fields = captureAsteroidEdits(fields, high, edits(highCenter, BlockId.WaygridCreatureArchive));
  const snapshot: UniverseCreatureCustodySnapshot = {
    manifest: { id: universe, universeId: universe, revision: 5, currentLocationId: ids[0], currentPlayerId: "host", deletedAt: null },
    universe: { fields: { asteroidFields: fields } }, players: [{ playerId: "host", locationId: ids[0], fields: {} }],
    locations: ids.map((id, index) => ({ descriptor: { id, universeId: universe, revision: 7 },
      fields: { generatorVersion: 18, generatorProfile: "world-below-v15", seed, furnaces: {}, chests: {},
        edits: index === 1 ? edits(center, BlockId.WaygridCellII) : {} } })),
  };
  const cells = entries.map(([index, key, block]) => ({ id: waygridCapacityId({ locationId: ids[index], key, kind: waygridBlockCapacity(block)!.kind }),
    tier: waygridBlockCapacity(block)!.tier }));
  const live: LiveUniverseWaygrid = { repositoryRevision: 5, locationRevision: 7, generatorVersion: 18,
    generatorProfile: "world-below-v15", seed, asteroidFields: fields,
    world: { locationId: ids[0], terrainVersion: 1, terrainSeed: createCelestialTerrain({ location: orbit, seed: base.seed })!.seed, expansionLevel: 0,
      registry: fields.fields[ids[0]], edits: {}, blockFacings: {} },
    vault: createDigitalItemVault(cells.slice(0, 2)), archive: createDigitalCreatureArchive(cells) };
  return { snapshot, live, select() { return selectUniverseWaygridOwnership(frame, this.snapshot, this.live); } };
}
function changeRow(f: ReturnType<typeof fixture>, index: number, fields: SaveFields) {
  f.snapshot = { ...f.snapshot, locations: f.snapshot.locations.map((row, i) => i === index ? { ...row, fields } : row) };
}

test("complete census joins finite pages and unloaded inactive construction with full-cube sides", () => {
  const f = fixture(), before = structuredClone({ snapshot: f.snapshot, live: f.live }), result = f.select();
  assert.equal(result.bindings.length, 3);
  assert.deepEqual(result.bindings.map(row => [row.locationId, row.side]).sort(), [[ids[0], "attached"], [ids[1], "other-location"], [ids[2], "other-location"]].sort());
  assert.deepEqual({ snapshot: f.snapshot, live: f.live }, before);
  assert(Object.isFrozen(result)); assert(!Object.isFrozen(f.snapshot));
  assert.deepEqual(selectUniverseWaygridOwnership(frame, JSON.parse(JSON.stringify(f.snapshot)), JSON.parse(JSON.stringify(f.live))), result);
});

test("actual live finite pages replace current persisted voxels while inactive sources stay global", () => {
  const f = fixture(), fields = captureAsteroidEdits(f.live.asteroidFields, orbit, edits(center, BlockId.WaygridCellIII));
  const upgrade = (cells: LiveUniverseWaygrid["vault"]["cells"]) => cells.map(cell => cell.id === f.live.vault.cells[0].id ? { ...cell, tier: 3 as const } : cell);
  f.live = { ...f.live, asteroidFields: fields, world: { ...f.live.world, registry: fields.fields[ids[0]] },
    vault: { ...f.live.vault, cells: upgrade(f.live.vault.cells) }, archive: { ...f.live.archive, cells: upgrade(f.live.archive.cells) } };
  const result = f.select(); assert.equal(result.bindings.find(row => row.locationId === ids[0])!.tier, 3);
  assert.equal(result.bindings.find(row => row.locationId === ids[1])!.tier, 2);
});

test("canonical owner hydration works for current and inactive rows without duplicate mirrors", () => {
  const f = fixture(); let catalog;
  for (const index of [0, 2]) {
    const admitted = captureAsteroidAttachmentCatalog(catalog, f.live.asteroidFields, f.live.asteroidFields,
      ids[index], f.snapshot.locations[index].fields, {}, true);
    catalog = admitted.catalog; changeRow(f, index, admitted.location);
  }
  f.snapshot = { ...f.snapshot, universe: { ...f.snapshot.universe, attachmentOwners: catalog } };
  assert.equal(f.select().bindings.length, 3);
  for (const index of [0, 2]) {
    const fields = f.snapshot.locations[index].fields;
    changeRow(f, index, { ...fields, edits: {} }); assert.throws(() => f.select(), /duplicate/); changeRow(f, index, fields);
  }
});

test("malformed current persisted edits cannot hide behind live replacement or page projection", () => {
  const f = fixture(), cell = edits(center, BlockId.Stone), chunk = Object.keys(cell)[0];
  cell[chunk].push([...cell[chunk][0]]);
  changeRow(f, 0, { ...f.snapshot.locations[0].fields, edits: cell });
  assert.throws(() => f.select(), /duplicate/);
});

test("missing, foreign and duplicate location sources refuse before association", () => {
  for (const fault of ["missing-current", "missing-inactive-field", "duplicate", "foreign", "revision", "partition", "edits"] as const) {
    const f = fixture();
    if (fault === "missing-current") f.snapshot = { ...f.snapshot, locations: f.snapshot.locations.slice(1) };
    if (fault === "missing-inactive-field") f.snapshot = { ...f.snapshot, locations: f.snapshot.locations.slice(0, 2) };
    if (fault === "duplicate") f.snapshot = { ...f.snapshot, locations: [...f.snapshot.locations, f.snapshot.locations[1]] };
    if (fault === "foreign" || fault === "revision") f.snapshot = { ...f.snapshot, locations: f.snapshot.locations.map((row, i) => i === 1
      ? { ...row, descriptor: { ...row.descriptor, ...(fault === "foreign" ? { universeId: universeId("foreign") } : { revision: -1 }) } } : row) };
    if (fault === "partition") changeRow(f, 1, { ...f.snapshot.locations[1].fields, digitalItemVault: f.live.vault });
    if (fault === "edits") changeRow(f, 1, { ...f.snapshot.locations[1].fields, edits: undefined });
    assert.throws(() => f.select(), { name: "Error" }, fault);
  }
});

test("generator versions, profiles, seeds, live revision and manifest binding must agree", () => {
  for (const fault of ["version", "profile", "seed", "live-version", "live-revision", "repository-revision", "deleted", "manifest-location"] as const) {
    const f = fixture();
    if (fault === "version") changeRow(f, 1, { ...f.snapshot.locations[1].fields, generatorVersion: 19 });
    if (fault === "profile") changeRow(f, 1, { ...f.snapshot.locations[1].fields, generatorProfile: "future" });
    if (fault === "seed") changeRow(f, 2, { ...f.snapshot.locations[2].fields, seed: "wrong-seed" });
    if (fault === "live-version") f.live = { ...f.live, generatorVersion: 17 };
    if (fault === "live-revision") f.live = { ...f.live, locationRevision: 8 };
    if (fault === "repository-revision") f.live = { ...f.live, repositoryRevision: 6 };
    if (fault === "deleted") f.snapshot = { ...f.snapshot, manifest: { ...f.snapshot.manifest, deletedAt: 1 } };
    if (fault === "manifest-location") f.snapshot = { ...f.snapshot, manifest: { ...f.snapshot.manifest, currentLocationId: ids[1] } };
    assert.throws(() => f.select(), { name: "Error" }, fault);
  }
});

test("unavailable asteroid page owners and unsupported local views never become skipped rows", () => {
  const f = fixture(); f.live = { ...f.live, asteroidFields: { schema: 1, fields: { [ids[0]]: f.live.world.registry } } };
  assert.throws(() => f.select(), /authoritative asteroid field/);
  const g = fixture(); g.snapshot = { ...g.snapshot, locations: [...g.snapshot.locations,
    { descriptor: { id: frame.localId, universeId: universe, revision: 0 }, fields: g.snapshot.locations[0].fields }] };
  assert.throws(() => g.select(), /complete frame adapter/);
  const h = fixture(); h.live = { ...h.live, asteroidFields: { schema: 1, fields: { [ids[2]]: highBase } } };
  assert.throws(() => h.select(), /Missing authoritative asteroid field/);
  const stale = fixture(); stale.live = { ...stale.live, asteroidFields: { ...stale.live.asteroidFields,
    fields: { ...stale.live.asteroidFields.fields, [ids[0]]: base } } };
  assert.throws(() => stale.select(), /exact current voxel capture/);
  const orphan = fixture();
  orphan.snapshot = { ...orphan.snapshot, locations: orphan.snapshot.locations.slice(0, 2) };
  orphan.live = { ...orphan.live, asteroidFields: { schema: 1, fields: { [ids[0]]: orphan.live.world.registry } },
    archive: { ...orphan.live.archive, cells: orphan.live.archive.cells.slice(0, 2) } };
  assert.throws(() => orphan.select(), /field lacks its repository location/);
});

test("legacy association uses the whole census and refuses equal coordinates across locations", () => {
  const f = fixture();
  const legacy = (cells: LiveUniverseWaygrid["vault"]["cells"]) => cells.map(cell => cell.id === f.live.vault.cells[0].id ? { ...cell, id: `cell:${center}` } : cell);
  f.live = { ...f.live, vault: { ...f.live.vault, cells: legacy(f.live.vault.cells) }, archive: { ...f.live.archive, cells: legacy(f.live.archive.cells) } };
  assert.throws(() => f.select(), /Ambiguous/);
  const g = fixture(), id = g.live.archive.cells[2].id;
  g.live = { ...g.live, archive: { ...g.live.archive, cells: g.live.archive.cells.map(cell => cell.id === id ? { ...cell, id: `terminal:creature:${highCenter}` } : cell) } };
  const result = g.select(); assert(result.bindings.find(row => row.locationId === ids[2])!.legacy);
});
