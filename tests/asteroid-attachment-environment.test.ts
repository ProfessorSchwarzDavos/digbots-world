import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, asteroidAttachmentPhysicalBounds, rebaseAsteroidCell } from "../app/game/asteroid-attachment-frame";
import { projectAsteroidLiquids, captureAsteroidLiquids, projectAsteroidEcology, captureAsteroidEcology,
  asteroidEcologySectorKey, type AsteroidLiquidRecords } from "../app/game/asteroid-attachment-environment";
import { ecologySectorKey, type EcologySectorSave } from "../app/game/ecology-population";
import { liquidBlockForKind, type LiquidCell } from "../app/game/liquids";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { canonicalJson } from "../app/game/universe-json";
import { BlockId } from "../app/game/data";

const orbit = locationAddress({ ...homeLocation(universeId("environment-selection")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const key = (x: number) => `${frame.offset.x + x},32,${frame.offset.z}`;
const source: LiquidCell = { kind: "water", level: 0, source: true, falling: false };
function liquids(): [string, LiquidCell][] {
  return [[key(80), { ...source }], [key(0), { ...source }], [key(-80), { ...source, kind: "honey" }],
    [key(2), { kind: "syrup", level: 3, source: false, falling: true }]];
}
const reader = (rows: AsteroidLiquidRecords) => {
  const blocks = new Map(rows.map(([key, cell]) => [key, liquidBlockForKind(cell.kind)]));
  return (key: string): BlockId => blocks.get(key) ?? BlockId.Air;
};

test("liquid projection and one hundred cold merges retain exact flow flags, original array order and outside cells", () => {
  const original = liquids(); let current = structuredClone(original);
  const projected = projectAsteroidLiquids(frame, original, reader(original));
  assert.deepEqual(projected.map(([cell]) => cell), [rebaseAsteroidCell(frame, key(0), "orbit"), rebaseAsteroidCell(frame, key(2), "orbit")]);
  for (let i = 0; i < 100; i++) {
    const read = reader(current), baseline = projectAsteroidLiquids(frame, current, read);
    current = JSON.parse(JSON.stringify(captureAsteroidLiquids(frame, current, baseline,
      JSON.parse(JSON.stringify([...baseline].reverse())), { before: read, after: read })));
  }
  assert.equal(canonicalJson(current), canonicalJson(original));
  const flora = (cell: string) => cell === key(0) ? BlockId.LumenKelp : reader(original)(cell);
  assert.deepEqual(projectAsteroidLiquids(frame, original, flora), projected);
});

test("liquid creation/removal/change require matching complete voxel after-image and retain old selected slots", () => {
  const input = liquids(), before = structuredClone(input), baseline = projectAsteroidLiquids(frame, input, reader(input));
  const newCell = rebaseAsteroidCell(frame, key(5), "orbit");
  const edited: [string, LiquidCell][] = [[newCell, { ...source, kind: "lava" }], [baseline[0][0], { ...source, level: 4, source: false }]];
  const after: [string, LiquidCell][] = [input[0], [key(0), edited[1][1]], input[2], [key(5), edited[0][1]]];
  const output = captureAsteroidLiquids(frame, input, baseline, edited, { before: reader(input), after: reader(after) });
  assert.deepEqual(output, after); assert.deepEqual(input, before);
  Object.assign(output[0][1], { level: 6, source: false }); assert.equal(input[0][1].level, 0);
  assert.throws(() => captureAsteroidLiquids(frame, input, baseline, edited, { before: reader(input), after: reader(input) }), /voxel/);
  assert.throws(() => captureAsteroidLiquids(frame, input, baseline, [baseline[0]], { before: reader(input), after: reader(input) }), /implicit source/);
});

test("liquid duplicates, unknown fields, malformed cells and stale baselines reject without normalization", () => {
  const input = liquids(), baseline = projectAsteroidLiquids(frame, input, reader(input));
  for (const patch of [{ level: .5 }, { level: 0, source: false }, { level: 16, source: false }, { falling: true }, { future: 1 }]) {
    const changed = input.map((row, i) => i ? row : [row[0], { ...row[1], ...patch }] as [string, LiquidCell]);
    assert.throws(() => projectAsteroidLiquids(frame, changed, reader(changed)), /Invalid|unsupported/);
  }
  assert.throws(() => projectAsteroidLiquids(frame, [...input, input[0]], reader(input)), /Duplicate/);
  assert.throws(() => captureAsteroidLiquids(frame, input, [], baseline, { before: reader(input), after: reader(input) }), /Stale/);
  assert.throws(() => captureAsteroidLiquids(frame, input, baseline, [baseline[0], baseline[0]], { before: reader(input), after: reader(input) }), /Duplicate/);
  const malformed = [[baseline[0][0], baseline[0][1], "future"]] as unknown as AsteroidLiquidRecords;
  assert.throws(() => captureAsteroidLiquids(frame, input, baseline, malformed, { before: reader(input), after: reader(input) }), /row/);
  assert.throws(() => projectAsteroidLiquids(frame, [["01,32,0", source]], () => BlockId.Water), /Noncanonical/);
});

test("fluid boundary links include generated untracked sources and refuse unknown adjacent terrain", () => {
  const edge = `${frame.orbitBounds.maxX},32,${frame.offset.z}`, next = `${frame.orbitBounds.maxX + 1},32,${frame.offset.z}`;
  const inside: [string, LiquidCell][] = [[edge, source]], outside: [string, LiquidCell][] = [[next, source]];
  assert.throws(() => projectAsteroidLiquids(frame, inside, cell => cell === edge || cell === next ? BlockId.Water : BlockId.Air), /crosses/);
  assert.throws(() => projectAsteroidLiquids(frame, outside, cell => cell === edge || cell === next ? BlockId.Water : BlockId.Air), /crosses/);
  assert.throws(() => projectAsteroidLiquids(frame, inside, cell => cell === edge ? BlockId.Water : undefined), /Unresolved/);
  assert.equal(projectAsteroidLiquids(frame, inside, reader(inside)).length, 1);
  assert.throws(() => captureAsteroidLiquids(frame, inside, projectAsteroidLiquids(frame, inside, reader(inside)),
    [[`${frame.localBounds.maxX + 1},32,0`, source]], { before: reader(inside), after: reader(inside) }), /boundary/);
});

function ecology(): Record<string, EcologySectorSave> {
  const b = asteroidAttachmentPhysicalBounds(frame, "orbit"), result: Record<string, EcologySectorSave> = {};
  for (const x of [b.minX + .01, b.maxX - .01]) for (const z of [b.minZ + .01, b.maxZ - .01])
    result[ecologySectorKey(x, z)] = { schema: 1, lastUpdatedTick: 1400.125, recentKills: { peelop: 3.25, historicalSpecies: .0125 } };
  result[ecologySectorKey(b.maxX + 200, b.maxZ + 200)] = { schema: 1, lastUpdatedTick: 70, recentKills: { slatefin: 1.5 } };
  return result;
}
test("ecology translates queries to canonical keys across local quadrants, fractional negative edges and all generated frames", () => {
  for (const entry of registry.asteroids) {
    const f = createAsteroidAttachmentFrame(registry, entry.descriptor.id), b = asteroidAttachmentPhysicalBounds(f, "local");
    for (const x of [b.minX, -32, -.1, 0, 31, b.maxX - .001]) for (const z of [b.minZ, -32, -.1, 0, 31, b.maxZ - .001]) {
      const expected = ecologySectorKey(x + f.offset.x, z + f.offset.z);
      assert.equal(asteroidEcologySectorKey(f, x, z, "local"), expected);
      assert.equal(asteroidEcologySectorKey(f, x + f.offset.x, z + f.offset.z, "orbit"), expected);
    }
    assert.throws(() => asteroidEcologySectorKey(f, b.maxX, 0, "local"), /outside/);
    assert.throws(() => asteroidEcologySectorKey(f, 0, NaN, "local"), /outside/);
  }
});

test("ecology view includes all four touched canonical sectors without splitting, decay, rounding or cold duplication", () => {
  const original = ecology(), view = projectAsteroidEcology(frame, original);
  assert.equal(Object.keys(view.sectors).length, 4); assert.equal(view.canonicalLocationId, frame.orbitId);
  let current = structuredClone(original);
  for (let i = 0; i < 100; i++) {
    const baseline = projectAsteroidEcology(frame, current);
    current = JSON.parse(JSON.stringify(captureAsteroidEcology(frame, current, baseline, JSON.parse(JSON.stringify(baseline)))));
  }
  assert.equal(canonicalJson(current), canonicalJson(original));
  const selected = Object.keys(view.sectors)[0], changed = { ...view, sectors: { ...view.sectors,
    [selected]: { ...view.sectors[selected], lastUpdatedTick: 1410, recentKills: { peelop: 4.5 } } } };
  const output = captureAsteroidEcology(frame, original, view, changed);
  assert.deepEqual(output[selected], changed.sectors[selected]);
  for (const key of Object.keys(original).filter(key => key !== selected)) assert.deepEqual(output[key], original[key]);
  assert.equal(original[selected].recentKills.historicalSpecies, .0125);
});

test("ecology capture rejects stale, foreign, out-of-selection and additive state; removal preserves outside history", () => {
  const input = ecology(), baseline = projectAsteroidEcology(frame, input), value = Object.values(input)[0];
  for (const invalid of [{ ...input, "01,0": value }, { ...input, "-0,0": value }, { ...input, "9007199254740991,0": value },
    { ...input, "900,900": { ...value, future: 1 } }, { ...input, "900,900": { ...value, recentKills: { peelop: -1 } } }])
    assert.throws(() => projectAsteroidEcology(frame, invalid));
  assert.throws(() => captureAsteroidEcology(frame, input, { ...baseline, sectors: {} }, baseline), /Stale/);
  assert.throws(() => captureAsteroidEcology(frame, input, baseline, { ...baseline, frameId: "foreign" }), /Foreign/);
  assert.throws(() => captureAsteroidEcology(frame, input, baseline, { ...baseline, sectors: input }), /outside/);
  const selected = Object.keys(baseline.sectors)[0];
  assert.throws(() => captureAsteroidEcology(frame, input, baseline, { ...baseline,
    sectors: { ...baseline.sectors, [selected]: { ...value, lastUpdatedTick: 0 } } }), /rewind/);
  const removed = captureAsteroidEcology(frame, input, baseline, { ...baseline, sectors: {} });
  assert.equal(Object.keys(removed).length, 1);
  for (const [key, value] of Object.entries(removed)) assert.deepEqual(value, input[key]);
});
