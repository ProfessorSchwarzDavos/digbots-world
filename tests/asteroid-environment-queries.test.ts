import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { captureAsteroidEdits } from "../app/game/asteroid-runtime";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { createAsteroidAttachmentWorld } from "../app/game/asteroid-attachment-world";
import { createAsteroidEnvironmentQueries } from "../app/game/asteroid-environment-queries";
import { blocksSky, effectiveLiquidAt, greenhouseSkyVisible, machineEnvironmentInputs, pumpHasWaterSource, type MachineEnvironmentContext } from "../app/game/environment-queries";
import { createCelestialTerrain, type CelestialPoint } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { PressureRuntime } from "../app/game/pressure-runtime";
import { canonicalJson } from "../app/game/universe-json";
import type { LiquidCell } from "../app/game/liquids";
import type { ChunkEditSave } from "../app/game/world";

const orbit = locationAddress({ ...homeLocation(universeId("environment-queries")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 953), terrain = createCelestialTerrain({ location: orbit, seed: registry.seed })!;
const key = (p: CelestialPoint) => `${p.x},${p.y},${p.z}`;
const frames = [
  registry.asteroids.find(value => value.descriptor.center.y < 32)!,
  registry.asteroids.find(value => value.descriptor.center.y > 32)!,
].map(value => createAsteroidAttachmentFrame(registry, value.descriptor.id));
const climate: MachineEnvironmentContext = { daylight: .6, eclipse: .25, weatherKind: "clear", weatherWindSpeed: .8,
  orbitDistanceAu: 2, biomeName: "Orbital Void", pressureKPa: 100, wind: 1 };
function reader(entries: [CelestialPoint, BlockId][] = []) {
  const edits: ChunkEditSave = {};
  for (const [p, block] of entries) {
    const cx = Math.floor(p.x / 16), cz = Math.floor(p.z / 16);
    (edits[`${cx},${cz}`] ??= []).push([(p.y + 64) * 256 + (p.z - cz * 16) * 16 + p.x - cx * 16, block]);
  }
  const captured = captureAsteroidEdits({ schema: 1, fields: { [frames[0].orbitId]: registry } }, orbit, edits).fields[frames[0].orbitId];
  return createAsteroidAttachmentWorld({ locationId: frames[0].orbitId, terrainVersion: terrain.version, terrainSeed: terrain.seed,
    expansionLevel: 0, registry: captured, edits, blockFacings: {} });
}

test("canonical sky columns use the actual opaque-full-cube predicate and empty sentinel", () => {
  assert(blocksSky(BlockId.Stone)); assert(!blocksSky(BlockId.Glass)); assert(!blocksSky(BlockId.ReinforcedWindow));
  const x = 100000, z = -100000;
  const world = reader([[{ x, y: 20, z }, BlockId.Stone], [{ x, y: 90, z }, BlockId.Glass]]);
  assert.equal(world.skyTopAt(x, z), 20); assert.equal(world.skyTopAt(x + 1, z), -65);
  assert.equal(world.skyTopAt(x, z), 20); assert.throws(() => world.skyTopAt(.5, z), /column/);
});

for (const frame of frames) {
  test(`translated queries preserve full columns, exterior and sentinels for offsetY=${frame.offset.y}`, () => {
    // x=20 avoids the natural asteroid; the roof can be outside the attachment's
    // clipped upper ownership bound while still affecting the owned space below.
    const local = { x: 20, y: 32, z: 20 }, orbitPoint = { x: local.x + frame.offset.x, y: local.y + frame.offset.y, z: local.z + frame.offset.z };
    const roof = { ...orbitPoint, y: 127 }, world = reader([[roof, BlockId.StationHull]]), before = canonicalJson(world.source);
    const view = createAsteroidEnvironmentQueries(frame, world, []);
    assert.equal(view.minY, -64 - frame.offset.y); assert.equal(view.maxY, 127 - frame.offset.y);
    assert.equal(view.skyTopAt(local.x, local.z), world.skyTopAt(orbitPoint.x, orbitPoint.z) - frame.offset.y);
    assert.equal(view.blockAt({ ...local, y: view.minY - 1 }), BlockId.Bedrock);
    assert.equal(view.blockAt({ ...local, y: view.maxY + 1 }), BlockId.Air);
    assert.equal(view.greenhouseSkyVisible(local), false);
    assert.equal(view.machineInputs(local, "sunplate-array", climate).solarExposure, 0);
    const runtime = Object.assign(Object.create(PressureRuntime.prototype), { host: view, roof: new Map(),
      closedGateAt: () => false, openDoorAt: () => false }) as PressureRuntime;
    assert.equal(runtime.exteriorAt(local), false, "the actual pressure roof scan sees the canonical roof");
    if (frame.offset.y < 0) assert(roof.y > frame.orbitBounds.maxY, "regression roof really lies outside the owned Y range");
    assert.equal(view.blockAt({ x: 100000, y: 32, z: 100000 }), BlockId.Air, "read access is not bounded to owned cells");
    assert.equal(canonicalJson(world.source), before);
  });
}

test("glazed roof passes greenhouse sunlight but obstructs the existing solar-panel rule", () => {
  const world = { maxY: 5, blockAt: (p: CelestialPoint) => p.y === 4 ? BlockId.ReinforcedWindow : BlockId.Air,
    trackedLiquidAt: () => undefined };
  assert(greenhouseSkyVisible(world, { x: 0, y: 0, z: 0 }));
  assert.equal(machineEnvironmentInputs(world, { x: 0, y: 0, z: 0 }, "sunplate-array", climate).solarExposure, 0);
  assert(!greenhouseSkyVisible({ ...world, blockAt: () => undefined }, { x: 0, y: 0, z: 0 }));
});

test("translated machine metrics and liquid distinctions equal orbit queries at an outside-neighbor boundary", () => {
  const frame = frames[0], local = { x: 31, y: 32, z: 20 };
  const p = { x: local.x + frame.offset.x, y: local.y + frame.offset.y, z: local.z + frame.offset.z };
  const flowing = { ...p, x: p.x + 1 }, source = { ...p, y: p.y - 1 }, plant = { ...p, z: p.z + 1 };
  const world = reader([[flowing, BlockId.Water], [source, BlockId.Water], [plant, BlockId.LumenKelp]]);
  const liquid: LiquidCell = { kind: "water", level: 3, source: false, falling: true };
  const rows: [string, LiquidCell][] = [[key(flowing), liquid]], before = canonicalJson({ source: world.source, rows });
  const view = createAsteroidEnvironmentQueries(frame, world, rows), raw = { maxY: 127,
    blockAt: (q: CelestialPoint) => world.block(key(q)), trackedLiquidAt: (q: CelestialPoint) => rows.find(([id]) => id === key(q))?.[1] };
  for (const kind of ["sunplate-array", "wind-rotor", "waterwheel-generator"] as const)
    assert.deepEqual(view.machineInputs(local, kind, climate), machineEnvironmentInputs(raw, p, kind, climate));
  const inputs = view.machineInputs(local, "waterwheel-generator", climate);
  assert.equal(inputs.waterFlow, .5); assert.equal(inputs.solarExposure, .6 * .75 / 4);
  assert.equal(view.trackedLiquidAt({ ...local, y: local.y - 1 }), undefined);
  assert.deepEqual(view.effectiveLiquidAt({ ...local, y: local.y - 1 }), { kind: "water", level: 0, source: true, falling: false });
  assert.equal(view.pumpHasWaterSource({ ...local, y: local.y - 1 }), true);
  assert.equal(view.pumpHasWaterSource({ ...local, x: local.x + 1 }), false);
  assert.equal(view.effectiveLiquidAt({ ...local, z: local.z + 1 })?.source, true);
  assert.equal(view.pumpHasWaterSource({ ...local, z: local.z + 1 }), false, "waterlogged flora is not pump water");
  assert.equal(canonicalJson({ source: world.source, rows }), before);
});

test("canonical light remains explicit, translated, and unknown when unavailable", () => {
  const frame = frames[0], world = reader(), point = { x: 33, y: 80, z: -34 }, calls: unknown[] = [];
  const unknown = createAsteroidEnvironmentQueries(frame, world, []);
  assert.equal(unknown.gameplayLightAt(point, .6), undefined);
  for (const y of [NaN, Infinity, unknown.maxY + .5]) {
    assert.throws(() => unknown.greenhouseSkyVisible({ ...point, y }), /coordinate/);
    assert.throws(() => unknown.gameplayLightAt({ ...point, y }, .6), /coordinate/);
  }
  assert.equal(unknown.greenhouseSkyVisible({ ...point, y: unknown.maxY + 1 }), true);
  const view = createAsteroidEnvironmentQueries(frame, world, [], { gameplayLightAt: (p, d) => { calls.push([p, d]); return 12; } });
  assert.equal(view.gameplayLightAt(point, .6), 12);
  assert.deepEqual(calls, [[{ x: point.x + frame.offset.x, y: point.y + frame.offset.y, z: point.z + frame.offset.z }, .6]]);
  assert.throws(() => createAsteroidEnvironmentQueries(frame, world, [], { gameplayLightAt: () => 16 }).gameplayLightAt(point, 1), /light/);
  assert.throws(() => view.blockAt({ ...point, x: .1 }), /coordinate/);
  assert.throws(() => view.gameplayLightAt(point, NaN), /daylight/);
});

test("a caller cannot mutate the captured coordinate mapping after construction", () => {
  const frame = { ...frames[0], offset: { ...frames[0].offset } }, world = reader(), view = createAsteroidEnvironmentQueries(frame, world, []);
  const before = view.minY, baseline = view.sourceBaseline; frame.offset.y += 20;
  assert.equal(view.minY, before); assert.equal(view.sourceBaseline, baseline);
  assert.equal(view.blockAt({ x: 1000, y: before - 1, z: 1000 }), BlockId.Bedrock);
});

test("liquid metadata and frame identity reject before querying without normalization", () => {
  const frame = frames[0], p = { x: 10000, y: 20, z: 10000 }, world = reader([[p, BlockId.Water]]);
  const good: LiquidCell = { kind: "water", level: 0, source: true, falling: false };
  for (const rows of [[[key(p), { ...good, level: 4 }]], [[key(p), good], [key(p), good]], [[key({ ...p, x: p.x + 1 }), good]]] as [string, LiquidCell][][])
    assert.throws(() => createAsteroidEnvironmentQueries(frame, world, rows), /liquid/);
  assert.throws(() => createAsteroidEnvironmentQueries({ ...frame, offset: { ...frame.offset, y: 0 } }, world, []), /frame/);
});

test("shared machine rules preserve exact eclipse/weather/biome effects and fluid predicates", () => {
  const world = { maxY: 5, blockAt: () => BlockId.Air, trackedLiquidAt: () => undefined };
  const values = machineEnvironmentInputs(world, { x: 0, y: 0, z: 0 }, "wind-rotor", { ...climate, weatherKind: "rain", biomeName: "Forest" });
  assert.equal(values.solarExposure, .6 * .75 * .35 / 4); assert.equal(values.windExposure, 1 * .55 * .8 / 2.5);
  assert.equal(machineEnvironmentInputs(world, { x: 0, y: 0, z: 0 }, "wind-rotor", { ...climate, pressureKPa: 0 }).windExposure, 0);
  assert.equal(effectiveLiquidAt(world, { x: 0, y: 0, z: 0 }), undefined);
  assert.equal(pumpHasWaterSource(world, { x: 0, y: 0, z: 0 }), false);
});
