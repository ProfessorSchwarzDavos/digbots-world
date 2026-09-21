import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { captureAsteroidEdits } from "../app/game/asteroid-runtime";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { createAsteroidAttachmentWorld } from "../app/game/asteroid-attachment-world";
import { selectAsteroidInstallations } from "../app/game/asteroid-attachment-installations";
import { selectAsteroidHabitats } from "../app/game/asteroid-attachment-habitats";
import { createCelestialTerrain } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { CUSTODY_BLOCK_MODELS } from "../app/game/custody-block-body";
import { createAquariumState, buildAquariumTopology } from "../app/game/aquarium";
import { canonicalJson } from "../app/game/universe-json";
import type { BlockFacing } from "../app/game/block-facing";
import type { WorldCreatureCustodySource } from "../app/game/creature-custody-sources";
import type { ChunkEditSave } from "../app/game/world";

const orbit = locationAddress({ ...homeLocation(universeId("installed-custody")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 953), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const terrain = createCelestialTerrain({ location: orbit, seed: registry.seed })!;
const point = { x: frame.offset.x, y: frame.offset.y + 32, z: frame.offset.z };
const cell = (x = point.x, y = point.y, z = point.z) => `${x},${y},${z}`;
const empty = (): WorldCreatureCustodySource => ({ inventory: [], furnaces: {}, chests: {} });
function world(entries: [string, BlockId][], facings: Record<string, BlockFacing> = {}, pagesOnly = false) {
  const edits: ChunkEditSave = {};
  for (const [key, block] of entries) {
    const [x, y, z] = key.split(",").map(Number), cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    (edits[`${cx},${cz}`] ??= []).push([(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, block]);
  }
  const captured = captureAsteroidEdits({ schema: 1, fields: { [frame.orbitId]: registry } }, orbit, edits).fields[frame.orbitId];
  return createAsteroidAttachmentWorld({ locationId: frame.orbitId, terrainVersion: terrain.version, terrainSeed: terrain.seed,
    expansionLevel: 0, registry: captured, edits: pagesOnly ? {} : edits, blockFacings: facings });
}
function select(reader: ReturnType<typeof world>, source = empty()) {
  return selectAsteroidInstallations(frame, source, reader, selectAsteroidHabitats(frame, { aquariums: source.aquariums ?? {}, chests: source.chests }, reader));
}

test("finite pages enumerate unopened holders even when their chunk edit mirror is absent", () => {
  const reader = world([[cell(), BlockId.Furnace]], {}, true), source = empty(), before = canonicalJson({ source, world: reader.source });
  assert.deepEqual(reader.source.edits, {}); assert.equal(reader.authoredVoxels[cell()], BlockId.Furnace);
  const result = select(reader, source);
  assert.deepEqual(result, [{ kind: "furnaces", key: cell(), cellKeys: [cell()], attached: true, recorded: false }]);
  assert(Object.isFrozen(reader.authoredVoxels)); assert(Object.isFrozen(result[0].cellKeys));
  assert.equal(canonicalJson({ source, world: reader.source }), before);
});

test("all six basic installed holders and an outside chest remain unmaterialized without mutating ledgers", () => {
  const entries: [string, BlockId][] = Object.values(CUSTODY_BLOCK_MODELS).map((model, i) => [cell(point.x + i * 3 - 9), model.block]);
  entries.push([cell(point.x + 100), BlockId.Chest]);
  const reader = world(entries), source = empty(), before = canonicalJson({ source, world: reader.source });
  const now = Date.now; Date.now = () => { throw Error("No production clocks"); };
  try { for (let i = 0; i < 100; i++) {
    const selected = select(reader, source); assert.equal(selected.length, 7);
    assert.equal(selected.filter(value => value.attached).length, 6); assert(selected.every(value => !value.recorded));
  } } finally { Date.now = now; }
  assert.equal(canonicalJson({ source, world: reader.source }), before);
});

test("unopened furnace and healer protrusions reject inside and outside origins", () => {
  for (const block of [BlockId.Furnace, BlockId.CreatureHealer]) {
    const inside = cell(point.x, point.y, frame.orbitBounds.minZ);
    const outside = cell(point.x, point.y, frame.orbitBounds.maxZ + 1);
    assert.throws(() => select(world([[inside, block]])), /boundary/);
    assert.throws(() => select(world([[outside, block]])), /boundary/);
  }
});

test("unopened chest pairs cannot split across the frame, but unlike facings do not create a pair", () => {
  const a = cell(frame.orbitBounds.maxX), b = cell(frame.orbitBounds.maxX + 1), entries: [string, BlockId][] = [[a, BlockId.Chest], [b, BlockId.Chest]];
  assert.throws(() => select(world(entries)), /pairing.*boundary/);
  assert.deepEqual(select(world(entries, { [b]: 2 })).map(value => value.attached).sort(), [false, true]);
  const source = empty(); source.chests[a] = Array(27).fill(null);
  assert.throws(() => select(world(entries), source), /pairing.*boundary/);
  assert.equal(source.chests[a].length, 27); assert.equal(Object.keys(source.chests).length, 1);
});

test("unopened chest lid sweep is checked above its closed block", () => {
  assert.throws(() => select(world([[cell(point.x, frame.orbitBounds.maxY), BlockId.Chest]])), /boundary/);
  if (frame.orbitBounds.minY > -64)
    assert.throws(() => select(world([[cell(point.x, frame.orbitBounds.minY - 1), BlockId.Chest]])), /boundary/);
});

for (const block of [BlockId.GlassAquarium, BlockId.ButterflyExhibit]) {
  test(`unrecorded habitat ${block} discovers complete components and refuses crossing/cap truncation`, () => {
    const entries = Array.from({ length: 20 }, (_, i): [string, BlockId] => [cell(point.x + i - 10), block]);
    const selected = select(world(entries)); assert.equal(selected.length, 1); assert.equal(selected[0].cellKeys.length, 20);
    assert.equal(selected[0].recorded, false);
    assert.throws(() => select(world([...entries, [cell(point.x + 10), block]])), /20-cell cap/);
    assert.throws(() => select(world([[cell(frame.orbitBounds.maxX), block], [cell(frame.orbitBounds.maxX + 1), block]])), /boundary/);
  });
}

test("unrecorded exhibit canopy cannot protrude through the upper physical boundary", () => {
  assert.throws(() => select(world([[cell(point.x, frame.orbitBounds.maxY), BlockId.ButterflyExhibit]])), /boundary/);
});

test("an actual recorded aquarium root remains distinct from the enumeration seed", () => {
  const a = cell(), b = cell(point.x + 1), reader = world([[a, BlockId.GlassAquarium], [b, BlockId.GlassAquarium]]);
  const topology = buildAquariumTopology([point, { ...point, x: point.x + 1 }], point);
  const source = { ...empty(), aquariums: { [a]: createAquariumState(topology, 0) } };
  const before = canonicalJson(source), selected = select(reader, source);
  assert.equal(selected.length, 1); assert.equal(selected[0].recorded, true); assert.equal(canonicalJson(source), before);
});

test("missing machine configuration refuses instead of inventing default resources or ports", () => {
  const reader = world([[cell(), BlockId.GridCable]]), source = empty(), before = canonicalJson(source);
  assert.throws(() => select(reader, source), /canonical configuration/);
  assert.equal(canonicalJson(source), before);
});

test("unrecorded domestic and wild hives retain unknown custody and full foraging boundaries", () => {
  for (const block of [BlockId.Apiary, BlockId.WildBeehive]) {
    const source = empty(), before = canonicalJson(source), selected = select(world([[cell(), block]]), source);
    assert.equal(selected[0].kind, "apiary"); assert.equal(selected[0].recorded, false);
    assert.throws(() => select(world([[cell(frame.orbitBounds.maxX), block]]), source), /boundary/);
    assert.equal(canonicalJson(source), before);
  }
});
