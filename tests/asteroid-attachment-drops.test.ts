import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, asteroidAttachmentPhysicalBounds } from "../app/game/asteroid-attachment-frame";
import { captureAsteroidDrops, projectAsteroidDrops } from "../app/game/asteroid-attachment-drops";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { Item } from "../app/game/data";
import { canonicalJson } from "../app/game/universe-json";

const orbit = locationAddress({ ...homeLocation(universeId("drop-capture")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902);
const frame = registry.asteroids.map(entry => createAsteroidAttachmentFrame(registry, entry.descriptor.id))
  .find(value => value.offset.y !== 0 && value.orbitBounds.minY <= .1 && value.orbitBounds.maxY >= .1)!;
const point = { x: frame.offset.x + .125, y: .1, z: frame.offset.z - .375 };
function fixture() {
  const drop = { item: Item.FieldWrench, count: 1, durability: 57, ...point, age: 35,
    metadata: { x: 777, y: .1, sealed: { fuelMl: 1700, oxygenMl: 421, heatJ: 981 } }, velocity: [.25, -.5, .75] as [number, number, number] };
  return [{ ...structuredClone(drop), x: point.x + 80 }, structuredClone(drop),
    { ...structuredClone(drop), x: point.x - 80 }, structuredClone(drop),
    { ...structuredClone(drop), z: point.z + 80 }];
}

test("complete drop collection survives 100 cold projection/capture cycles exactly", () => {
  const canonical = fixture(); let current = structuredClone(canonical);
  for (let cycle = 0; cycle < 100; cycle++) {
    const baseline = projectAsteroidDrops(frame, current);
    assert.deepEqual(baseline.sourceIndices, [1, 3]);
    current = JSON.parse(JSON.stringify(captureAsteroidDrops(frame, current, baseline,
      JSON.parse(JSON.stringify(baseline.drops)), [0, 1])));
  }
  assert.equal(canonicalJson(current), canonicalJson(canonical));
  assert.equal(current[1].y, .1);
});

test("selected reordering retains original slots, outside records, and explicit identical-drop lineage", () => {
  const canonical = fixture(), before = structuredClone(canonical), baseline = projectAsteroidDrops(frame, canonical);
  const edited = structuredClone(baseline.drops).reverse(); edited[0].age += 9; edited[1].x += .25;
  const captured = captureAsteroidDrops(frame, canonical, baseline, edited, [1, 0]);
  const expected = structuredClone(canonical); expected[3].age += 9; expected[1].x += .25;
  assert.deepEqual(captured, expected); assert.deepEqual(canonical, before);
  for (const index of [0, 2, 4]) assert.equal(canonicalJson(captured[index]), canonicalJson(canonical[index]));
  captured[0].metadata!.sealed = { fuelMl: 0, oxygenMl: 0, heatJ: 0 };
  captured[1].metadata!.x = -1;
  assert.deepEqual(canonical, before); assert.deepEqual(baseline, projectAsteroidDrops(frame, canonical));
});

test("removal and creation use explicit lineage and preserve outside order without implicit merges", () => {
  const canonical = fixture(), baseline = projectAsteroidDrops(frame, canonical);
  const created = { ...structuredClone(baseline.drops[0]), count: 2 };
  const captured = captureAsteroidDrops(frame, canonical, baseline, [created, baseline.drops[1], created], [null, 1, null]);
  assert.deepEqual(captured.slice(0, 4), [canonical[0], canonical[2], canonical[3], canonical[4]]);
  assert.equal(captured.length, 6); assert.equal(captured[4].count, 2); assert.deepEqual(captured[4], captured[5]);
  assert.notEqual(captured[4], captured[5]);
  assert.deepEqual(captureAsteroidDrops(frame, canonical, baseline, [], []), [canonical[0], canonical[2], canonical[4]]);
});

test("missing, duplicate, forged and stale selected lineage fail without mutations", () => {
  const canonical = fixture(), before = structuredClone(canonical), baseline = projectAsteroidDrops(frame, canonical);
  for (const origins of [[], [0], [0, 0], [0, 2], [0, -1], [0, .5], [0, NaN], [0, Infinity]])
    assert.throws(() => captureAsteroidDrops(frame, canonical, baseline, baseline.drops, origins), /lineage/);
  for (const changed of [{ ...baseline, sourceIndices: [1, 2] }, { ...baseline, sourceIndices: [3, 1] },
    { ...baseline, drops: baseline.drops.map(value => ({ ...value, age: value.age + 1 })) }])
    assert.throws(() => captureAsteroidDrops(frame, canonical, changed, baseline.drops, [0, 1]), /Stale/);
  const changedCanonical = structuredClone(canonical); changedCanonical[1].metadata.x = 123;
  assert.throws(() => captureAsteroidDrops(frame, changedCanonical, baseline, baseline.drops, [0, 1]), /Stale/);
  assert.deepEqual(canonical, before);
});

test("whole-body boundaries reject both directions and unsupported outside fields fail closed", () => {
  const canonical = fixture(), baseline = projectAsteroidDrops(frame, canonical);
  const local = asteroidAttachmentPhysicalBounds(frame, "local"), orbitBounds = asteroidAttachmentPhysicalBounds(frame, "orbit");
  for (const x of [local.maxX - .01, local.maxX + .01, local.maxX + 80])
    assert.throws(() => captureAsteroidDrops(frame, canonical, baseline, [{ ...baseline.drops[0], x }], [0]), /boundary/);
  for (const x of [orbitBounds.maxX - .01, orbitBounds.maxX + .01])
    assert.throws(() => projectAsteroidDrops(frame, [{ ...canonical[0], x }]), /boundary/);
  const unknown = structuredClone(canonical); Object.assign(unknown[0], { worldAnchor: point });
  assert.throws(() => projectAsteroidDrops(frame, unknown), /Unsupported/);
  assert.throws(() => captureAsteroidDrops(frame, unknown, baseline, baseline.drops, [0, 1]), /Unsupported/);
  const invalid = structuredClone(canonical); invalid[0].metadata.x = Infinity;
  assert.throws(() => projectAsteroidDrops(frame, invalid), /finite/);
});

test("empty selections and collections are detached and retain exact canonical records", () => {
  const outside = fixture().filter((_, index) => [0, 2, 4].includes(index));
  const baseline = projectAsteroidDrops(frame, outside); assert.deepEqual(baseline, { drops: [], sourceIndices: [] });
  const captured = captureAsteroidDrops(frame, outside, baseline, [], []);
  assert.deepEqual(captured, outside); assert.notEqual(captured[0], outside[0]);
  assert.deepEqual(captureAsteroidDrops(frame, [], projectAsteroidDrops(frame, []), [], []), []);
});
