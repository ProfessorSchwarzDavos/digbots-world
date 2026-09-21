import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { archiveShelfBlockForBookCount, BlockId, Item, type ItemCode } from "../app/game/data";
import { SPELL_TOME_ITEMS } from "../app/game/dragon-world";
import { VoxelEngine } from "../app/game/engine";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { captureAsteroidEdits } from "../app/game/asteroid-runtime";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { createAsteroidAttachmentWorld } from "../app/game/asteroid-attachment-world";
import { selectAsteroidBookFurniture } from "../app/game/asteroid-attachment-book-furniture";
import { createCelestialTerrain } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { canonicalJson } from "../app/game/universe-json";
import type { BlockFacing } from "../app/game/block-facing";
import type { ChunkEditSave } from "../app/game/world";

const orbit = locationAddress({ ...homeLocation(universeId("book-furniture-custody")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 953), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const terrain = createCelestialTerrain({ location: orbit, seed: registry.seed })!;
const point = { x: frame.offset.x, y: frame.offset.y + 32, z: frame.offset.z };
const key = (x = point.x) => `${x},${point.y},${point.z}`;
function world(entries: [string, BlockId][], facing: BlockFacing = 0, pagesOnly = false) {
  const edits: ChunkEditSave = {};
  for (const [cell, block] of entries) {
    const [x, y, z] = cell.split(",").map(Number), cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    (edits[`${cx},${cz}`] ??= []).push([(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, block]);
  }
  const captured = captureAsteroidEdits({ schema: 1, fields: { [frame.orbitId]: registry } }, orbit, edits).fields[frame.orbitId];
  return createAsteroidAttachmentWorld({ locationId: frame.orbitId, terrainVersion: terrain.version, terrainSeed: terrain.seed,
    expansionLevel: 0, registry: captured, edits: pagesOnly ? {} : edits,
    blockFacings: Object.fromEntries(entries.map(([cell]) => [cell, facing])) });
}

test("all seven unopened shelf variants preserve implicit book provenance on both sides and every facing", () => {
  for (let count = 0; count <= 6; count++) for (const facing of [0, 1, 2, 3] as const) {
    const inside = key(), outside = key(point.x + 100), block = archiveShelfBlockForBookCount(count);
    const source = {}, reader = world([[inside, block], [outside, block]], facing);
    const selected = selectAsteroidBookFurniture(frame, source, reader);
    assert.equal(selected.installations.length, 2);
    assert.deepEqual(selected.installations.map(row => row.attached).sort(), [false, true]);
    for (const row of selected.installations) {
      assert.equal(row.recorded, false); assert.equal(row.state, null); assert.equal(row.facing, facing);
      assert.deepEqual(row.implicitBooks, { item: Item.BoundBook, count });
    }
    assert.deepEqual(source, {}); assert(Object.isFrozen(selected.installations));
  }
});

test("recorded shelf order and displayed spell tome remain exact, with no implicit duplicate books", () => {
  for (let count = 0; count <= 6; count++) {
    const tomes = Array.from({ length: count }, (_, index) => index % 2 ? SPELL_TOME_ITEMS[0] : Item.BoundBook);
    const shelf = { schema: 1 as const, tomes }, display = { schema: 1 as const, tome: count === 0 ? null : SPELL_TOME_ITEMS[1] };
    const displayKey = key(point.x + 100), source = { archiveShelves: { [key()]: shelf }, tomeDisplays: { [displayKey]: display } };
    const before = canonicalJson(source), reader = world([[key(), archiveShelfBlockForBookCount(count)], [displayKey, BlockId.TomeDisplay]]);
    const selected = selectAsteroidBookFurniture(frame, source, reader);
    assert.deepEqual(selected.installations.find(row => row.field === "archiveShelves")!.state, shelf);
    assert.deepEqual(selected.installations.find(row => row.field === "tomeDisplays")!.state, display);
    assert(selected.installations.every(row => row.recorded && row.implicitBooks === null));
    assert.equal(canonicalJson(source), before); assert(!Object.isFrozen(tomes));
  }
});

test("unopened displays and finite-pages-only shelves remain unmaterialized across cold observations", () => {
  const reader = world([[key(), BlockId.ArchiveShelfSix], [key(point.x + 1), BlockId.TomeDisplay]], 3, true);
  const source = {}, before = canonicalJson(reader.source), now = Date.now;
  assert.deepEqual(reader.source.edits, {});
  Date.now = () => { throw Error("No clock"); };
  try { for (let index = 0; index < 100; index++) {
    const selected = selectAsteroidBookFurniture(frame, source, reader);
    assert(selected.installations.every(row => !row.recorded && row.state === null));
    assert.equal(selected.installations.find(row => row.field === "archiveShelves")!.implicitBooks!.count, 6);
  } } finally { Date.now = now; }
  assert.deepEqual(source, {}); assert.equal(canonicalJson(reader.source), before);
});

test("missing, impersonated, count-mismatched and lossy book ledgers reject rather than repair", () => {
  const shelf = { schema: 1 as const, tomes: [Item.BoundBook] }, display = { schema: 1 as const, tome: SPELL_TOME_ITEMS[0] };
  for (const cell of [key(), key(point.x + 100)]) {
    for (const block of [BlockId.Air, BlockId.TomeDisplay])
      assert.throws(() => selectAsteroidBookFurniture(frame, { archiveShelves: { [cell]: shelf } }, world([[cell, block]])), /matching canonical block/);
    assert.throws(() => selectAsteroidBookFurniture(frame, { tomeDisplays: { [cell]: display } }, world([[cell, BlockId.ArchiveShelfOne]])), /matching canonical block/);
    assert.throws(() => selectAsteroidBookFurniture(frame, { archiveShelves: { [cell]: shelf } }, world([[cell, BlockId.ArchiveShelfTwo]])), /block count/);
  }
  for (const invalid of [{ ...shelf, unknown: undefined }, { ...shelf, tomes: [Item.RawIron] },
    { ...shelf, tomes: Array(7).fill(Item.BoundBook) }])
    assert.throws(() => selectAsteroidBookFurniture(frame, { archiveShelves: { [key()]: invalid } }, world([[key(), BlockId.ArchiveShelfOne]])), /lossy normalization/);
  for (const invalid of [{ ...display, unknown: undefined }, { schema: 1 as const, tome: Item.BoundBook }])
    assert.throws(() => selectAsteroidBookFurniture(frame, { tomeDisplays: { [key()]: invalid } }, world([[key(), BlockId.TomeDisplay]])), /lossy normalization/);
  assert.throws(() => selectAsteroidBookFurniture(frame, { archiveShelves: undefined }, world([])), /undefined table/);
  assert.throws(() => selectAsteroidBookFurniture(frame, { tomeDisplays: { nope: display } }, world([])), /book furniture key/);
});

test("changed implicit shelf variants and changed spell identities produce different exact baselines", () => {
  const first = selectAsteroidBookFurniture(frame, {}, world([[key(), BlockId.ArchiveShelfOne]]));
  const second = selectAsteroidBookFurniture(frame, {}, world([[key(), BlockId.ArchiveShelfTwo]]));
  assert.notEqual(first.worldBaseline, second.worldBaseline);
  const reader = world([[key(), BlockId.TomeDisplay]]);
  const display = (tome: ItemCode) => ({ tomeDisplays: { [key()]: { schema: 1 as const, tome } } });
  assert.notEqual(canonicalJson(selectAsteroidBookFurniture(frame, display(SPELL_TOME_ITEMS[0]), reader)),
    canonicalJson(selectAsteroidBookFurniture(frame, display(SPELL_TOME_ITEMS[1]), reader)));
});

test("actual separate tome models fit one voxel at the analytic maximum rune scale", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  for (const tome of SPELL_TOME_ITEMS) {
    const model = engine.createTomeFurnitureVisual("0,0,0", { schema: 1, tome });
    // The only idle motion is rune scale 0.88+sin(...)*0.12, bounded by1.
    model.traverse(child => { if (child.name === "tome-school-rune") child.scale.setScalar(1); });
    // The actual book has a fixed X tilt, independent of block facing. A parent
    // yaw conservatively covers rotated installations without inventing a new
    // local Euler pose (XYZ rotation would change the tilt's world direction).
    assert.equal(model.rotation.x, -.12); assert.equal(model.rotation.y, 0);
    const parent = new THREE.Group(); parent.add(model);
    for (const facing of [0, 1, 2, 3]) {
      parent.rotation.y = facing * Math.PI / 2; parent.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(parent);
      for (const axis of ["x", "y", "z"] as const)
        assert(box.min[axis] >= -.5 && box.max[axis] <= .5, `${tome}/${facing}/${axis}: ${box.min[axis]}..${box.max[axis]}`);
    }
    model.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose(); for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose();
    });
  }
});
