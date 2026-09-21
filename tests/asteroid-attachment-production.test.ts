import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data";
import { createAlchemyStand, createDistillery, ALCHEMY_RECIPES, DISTILLERY_RECIPES } from "../app/game/alchemy";
import { createSugarworks, SUGARWORKS_RECIPES } from "../app/game/candyworks";
import { createGolemForgeState } from "../app/game/v1-cultures";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { captureAsteroidEdits } from "../app/game/asteroid-runtime";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { createAsteroidAttachmentWorld } from "../app/game/asteroid-attachment-world";
import { selectAsteroidProductionStations, ASTEROID_PRODUCTION_STATIONS, type AsteroidProductionSources } from "../app/game/asteroid-attachment-production";
import { createCelestialTerrain } from "../app/game/celestial-terrain";
import { createAsteroidEnvironmentQueries } from "../app/game/asteroid-environment-queries";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { canonicalJson } from "../app/game/universe-json";
import type { BlockFacing } from "../app/game/block-facing";
import type { ChunkEditSave } from "../app/game/world";
import type { LiquidCell } from "../app/game/liquids";

const orbit = locationAddress({ ...homeLocation(universeId("production-custody")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 953), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const terrain = createCelestialTerrain({ location: orbit, seed: registry.seed })!;
const point = { x: frame.offset.x, y: frame.offset.y + 32, z: frame.offset.z };
const key = (x = point.x, y = point.y, z = point.z) => `${x},${y},${z}`;
function world(entries: [string, BlockId][], facings: Record<string, BlockFacing> = {}, pagesOnly = false) {
  const edits: ChunkEditSave = {};
  for (const [cell, block] of entries) {
    const [x, y, z] = cell.split(",").map(Number), cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    (edits[`${cx},${cz}`] ??= []).push([(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, block]);
  }
  const captured = captureAsteroidEdits({ schema: 1, fields: { [frame.orbitId]: registry } }, orbit, edits).fields[frame.orbitId];
  return createAsteroidAttachmentWorld({ locationId: frame.orbitId, terrainVersion: terrain.version, terrainSeed: terrain.seed,
    expansionLevel: 0, registry: captured, edits: pagesOnly ? {} : edits, blockFacings: facings });
}
const initial = { golemForges: createGolemForgeState, alchemyStands: createAlchemyStand, distilleries: createDistillery, sugarworks: createSugarworks };

test("four installed production families enumerate unopened and recorded canonical blocks on both sides and all facings", () => {
  for (const facing of [0, 1, 2, 3] as const) for (const [field, definition] of Object.entries(ASTEROID_PRODUCTION_STATIONS)) {
    const inside = key(), outside = key(point.x + 100), reader = world([[inside, definition.block], [outside, definition.block]], { [inside]: facing, [outside]: facing });
    const empty = selectAsteroidProductionStations(frame, {}, reader, []);
    assert.equal(empty.installations.length, 2); assert.deepEqual(empty.installations.map(row => row.attached).sort(), [false, true]);
    assert(empty.installations.every(row => !row.recorded && row.state === null && row.facing === facing));
    const state = initial[field as keyof typeof initial](), source = { [field]: { [inside]: state } };
    const before = canonicalJson(source), result = selectAsteroidProductionStations(frame, source, reader, []);
    assert.deepEqual(result.installations.find(row => row.key === inside)!.state, state);
    assert.equal(canonicalJson(source), before); assert(Object.isFrozen(result.installations)); assert(!Object.isFrozen(state));
  }
});

test("finite pages alone retain unopened stations without initializing production ledgers", () => {
  const reader = world([[key(), BlockId.GolemForge]], {}, true), before = canonicalJson(reader.source);
  assert.deepEqual(reader.source.edits, {});
  const now = Date.now; Date.now = () => { throw Error("No clock"); };
  try { for (let index = 0; index < 100; index++) {
    const selected = selectAsteroidProductionStations(frame, {}, reader, []);
    assert.equal(selected.installations[0].recorded, false);
  } } finally { Date.now = now; }
  assert.equal(canonicalJson(reader.source), before);
});

test("recorded production cannot outlive or impersonate its canonical block, including outside ledgers", () => {
  for (const cell of [key(), key(point.x + 100)]) for (const [field, create] of Object.entries(initial)) {
    const source = { [field]: { [cell]: create() } };
    assert.throws(() => selectAsteroidProductionStations(frame, source, world([]), []), /matching canonical block/);
    assert.throws(() => selectAsteroidProductionStations(frame, source, world([[cell, BlockId.Stone]]), []), /matching canonical block/);
  }
  assert.throws(() => selectAsteroidProductionStations(frame, { golemForges: { nope: createGolemForgeState() } }, world([]), []), /production station key/);
  assert.throws(() => selectAsteroidProductionStations(frame, { golemForges: undefined }, world([]), []), /undefined table/);
});

test("finite batches and completed outputs retain exact progress; lossy or additive state rejects instead of repair", () => {
  const recipe = ALCHEMY_RECIPES[0], state = { ...createAlchemyStand(), selectedRecipeId: recipe.id,
    activeBatch: { recipeId: recipe.id, progressSeconds: .125, durationSeconds: recipe.brewSeconds }, output: { item: "raw_iron", count: 3 } };
  const reader = world([[key(), BlockId.AlchemyStand]]), source = { alchemyStands: { [key()]: state } };
  const result = selectAsteroidProductionStations(frame, source, reader, []);
  assert.deepEqual(result.installations[0].state, state); assert.equal(state.activeBatch.progressSeconds, .125);
  for (const invalid of [{ ...state, extra: undefined }, { ...state, output: { item: " raw_iron ", count: 3 } },
    { ...state, activeBatch: { ...state.activeBatch, progressSeconds: -1 } }, { ...state, output: { item: "raw_iron", count: 1e9 } }])
    assert.throws(() => selectAsteroidProductionStations(frame, { alchemyStands: { [key()]: invalid } }, reader, []), /lossy normalization/);
  const golem = { ...createGolemForgeState(), storedMana: 17, completed: ["copper-golem"] };
  // Unsupported species must not be turned into a different completed output.
  assert.throws(() => selectAsteroidProductionStations(frame, { golemForges: { [key()]: golem } } as AsteroidProductionSources,
    world([[key(), BlockId.GolemForge]]), []), /lossy normalization/);
});

test("golem commitments and distillery/sugarworks batches are observed without consuming or finishing them", () => {
  const distillery = DISTILLERY_RECIPES[0], sugarworks = SUGARWORKS_RECIPES[0];
  const cases: [keyof AsteroidProductionSources, unknown][] = [
    ["golemForges", { ...createGolemForgeState(), unlockedBlueprintIds: ["golem-copper-scout"], storedMana: 29,
      job: { golemType: "copper-scout", startedAt: 1234, progressSeconds: 4.25, manaCommitted: 35 }, completed: ["stone-bulwark"] }],
    ["distilleries", { ...createDistillery(), selectedRecipeId: distillery.id,
      activeBatch: { recipeId: distillery.id, progressSeconds: 2.5, durationSeconds: distillery.fermentSeconds }, output: { item: "test-output", count: 2 } }],
    ["sugarworks", { ...createSugarworks(), selectedRecipeId: sugarworks.id,
      activeBatch: { recipeId: sugarworks.id, progressSeconds: 1.75, durationSeconds: sugarworks.batchSeconds }, output: { item: "test-output", count: 3 } }],
  ];
  for (const [field, state] of cases) {
    const source = { [field]: { [key()]: state } } as AsteroidProductionSources;
    const reader = world([[key(), ASTEROID_PRODUCTION_STATIONS[field].block]]), before = canonicalJson(source);
    const result = selectAsteroidProductionStations(frame, source, reader, []);
    assert.deepEqual(result.installations[0].state, state);
    assert.equal(canonicalJson(source), before);
    assert.throws(() => selectAsteroidProductionStations(frame,
      { [field]: { [key()]: { ...(state as object), unknown: undefined } } } as AsteroidProductionSources, reader, []), /lossy normalization/);
  }
});

test("alchemy binds all 515 sphere cells including outside-frame waterlogged sources, not bounding-box corners", () => {
  const x = frame.orbitBounds.maxX, station = key(x), source = key(x + 5), corner = key(x + 5, point.y + 5);
  for (const waterBlock of [BlockId.Water, BlockId.LumenKelp]) {
    const reader = world([[station, BlockId.AlchemyStand], [source, waterBlock], [corner, BlockId.Water]]);
    const result = selectAsteroidProductionStations(frame, {}, reader, []).installations[0];
    assert.equal(result.attached, true); assert.equal(result.water!.cells.length, 515);
    assert(result.water!.hasSource); assert(result.water!.cells.some(cell => cell.key === source && cell.source));
    assert(!result.water!.cells.some(cell => cell.key === corner));
    const local = { x: x - frame.offset.x, y: point.y - frame.offset.y, z: point.z - frame.offset.z };
    assert(createAsteroidEnvironmentQueries(frame, reader, []).alchemyHasWaterSource(local));
    const tracked: LiquidCell = { kind: "water", source: false, level: 1, falling: true };
    const flowing = selectAsteroidProductionStations(frame, {}, reader, [[source, tracked]]).installations[0];
    assert(!flowing.water!.cells.find(cell => cell.key === source)!.source);
    assert.notEqual(canonicalJson(result.water), canonicalJson(flowing.water));
  }
});

test("query baseline changes for outside liquid state and rejects undefined extensions before cloning", () => {
  const reader = world([[key(), BlockId.AlchemyStand], [key(point.x + 5), BlockId.Water]]);
  const tracked: LiquidCell = { kind: "water", level: 1, source: false, falling: false };
  const original = selectAsteroidProductionStations(frame, {}, reader, []);
  const changed = selectAsteroidProductionStations(frame, {}, reader, [[key(point.x + 5), tracked]]);
  assert.notEqual(original.environmentBaseline, changed.environmentBaseline);
  assert.throws(() => selectAsteroidProductionStations(frame, {}, reader,
    [[key(point.x + 5), { ...tracked, unknown: undefined } as LiquidCell]]), /unsupported fields/);
});
