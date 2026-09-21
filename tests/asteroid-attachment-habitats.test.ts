import assert from "node:assert/strict";
import test from "node:test";
import { selectAsteroidHabitats, type AsteroidHabitatSources, type AsteroidHabitatWorld } from "../app/game/asteroid-attachment-habitats";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { BlockId, Item } from "../app/game/data";
import type { AquariumState } from "../app/game/aquarium";

const orbit = locationAddress({ ...homeLocation(universeId("habitat-closure-test")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const key = (x = 0, y = 32, z = 0) => `${frame.offset.x + x},${frame.offset.y + y},${frame.offset.z + z}`;
const state = (keys: readonly string[]): AquariumState => ({ schema: 1, blockKeys: [...keys], lastBreedingCycle: 19, residents: [] });
const source = (kind: "aquarium" | "exhibit", root: string, keys: readonly string[]): AsteroidHabitatSources => kind === "aquarium"
  ? { aquariums: { [root]: state(keys) }, chests: {} }
  : { aquariums: {}, chests: { [`exhibit:${root}`]: [null] } };
function world(kind: "aquarium" | "exhibit", keys: readonly string[]): AsteroidHabitatWorld {
  const present = new Set(keys), block = kind === "aquarium" ? BlockId.GlassAquarium : BlockId.ButterflyExhibit;
  return { block: key => present.has(key) ? block : BlockId.Air };
}
function rejects(input: AsteroidHabitatSources, voxels: AsteroidHabitatWorld, message: RegExp) {
  const before = JSON.stringify(input);
  assert.throws(() => selectAsteroidHabitats(frame, input, voxels), message);
  assert.equal(JSON.stringify(input), before);
}

for (const kind of ["aquarium", "exhibit"] as const) {
  test(`${kind}: whole inside/outside components retain their actual ledger root and freeze detached results`, () => {
    for (const x of [0, 90]) {
      const keys = [key(x), key(x + 1), key(x + 1, 33)], input = source(kind, keys[1], keys);
      const result = selectAsteroidHabitats(frame, input, world(kind, keys));
      assert.deepEqual(result, [{ kind, rootKey: kind === "aquarium" ? keys[1] : `exhibit:${keys[1]}`, cellKeys: keys, attached: x === 0 }]);
      assert(Object.isFrozen(result)); assert(Object.isFrozen(result[0])); assert(Object.isFrozen(result[0].cellKeys));
      assert.notEqual(result[0].cellKeys, keys);
      if (kind === "aquarium") {
        assert.notEqual(result[0].cellKeys, input.aquariums[keys[1]].blockKeys);
        assert.equal(Object.isFrozen(input.aquariums[keys[1]].blockKeys), false);
      }
    }
  });

  test(`${kind}: crossings reject from either origin on all six frame faces`, () => {
    const b = frame.orbitBounds;
    const middle = [frame.offset.x, frame.offset.y + 32, frame.offset.z];
    for (const [axis, inside, outside] of [[0, b.minX, b.minX - 1], [0, b.maxX, b.maxX + 1],
      [1, b.minY, b.minY - 1], [1, b.maxY, b.maxY + 1], [2, b.minZ, b.minZ - 1], [2, b.maxZ, b.maxZ + 1]]) {
      const a = [...middle], c = [...middle]; a[axis] = inside; c[axis] = outside;
      const keys = [a.join(","), c.join(",")];
      for (const root of keys) rejects(source(kind, root, keys), world(kind, keys), /boundary/);
    }
  });

  test(`${kind}: every face neighbor must be known, even outside the frame`, () => {
    const root = key(31), [x, y, z] = root.split(",").map(Number);
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const missing = `${x + dx},${y + dy},${z + dz}`, complete = world(kind, [root]);
      for (const unknown of [undefined, -999 as BlockId]) {
        rejects(source(kind, root, [root]), { block: key => key === missing ? unknown : complete.block(key) }, /Unknown/);
      }
    }
    rejects(source(kind, root, [root]), { block: () => undefined }, /Unknown/);
    rejects(source(kind, root, [root]), { block: () => BlockId.Air }, /no matching/);
  });

  test(`${kind}: exactly twenty cells close; the twenty-first and unknown twentieth-cell boundary reject`, () => {
    const keys = Array.from({ length: 20 }, (_, i) => key(i));
    assert.equal(selectAsteroidHabitats(frame, source(kind, keys[0], keys), world(kind, keys))[0].cellKeys.length, 20);
    const oversize = [...keys, key(20)];
    rejects(source(kind, keys[0], keys), world(kind, oversize), /20-cell cap/);
    const complete = world(kind, keys);
    rejects(source(kind, keys[0], keys), { block: k => k === key(20) ? undefined : complete.block(k) }, /Unknown/);
  });

  test(`${kind}: disconnected and diagonal voxels are separate components`, () => {
    const a = key(), b = key(1, 33), c = key(5), keys = [a, b, c];
    const input = kind === "aquarium"
      ? { aquariums: Object.fromEntries(keys.map(k => [k, state([k])])), chests: {} }
      : { aquariums: {}, chests: Object.fromEntries(keys.map(k => [`exhibit:${k}`, [null]])) };
    const result = selectAsteroidHabitats(frame, input, world(kind, keys));
    assert.deepEqual(result.map(row => row.cellKeys), keys.map(k => [k]));
  });

  test(`${kind}: duplicate roots on the same component reject rather than consolidating custody`, () => {
    const keys = [key(), key(1)];
    const input = kind === "aquarium"
      ? { aquariums: { [keys[0]]: state(keys), [keys[1]]: state(keys) }, chests: {} }
      : { aquariums: {}, chests: { [`exhibit:${keys[0]}`]: [null], [`exhibit:${keys[1]}`]: [null] } };
    rejects(input, world(kind, keys), /Duplicate/);
  });
}

test("aquarium saved topology must match the entire connected voxel set without duplicates or detached claims", () => {
  const keys = [key(), key(1)], voxels = world("aquarium", [...keys, key(8)]);
  for (const saved of [[], [keys[0]], [keys[0], keys[0]], [...keys, key(8)], [keys[0], key(8)], [keys[1]]])
    rejects(source("aquarium", keys[0], saved), voxels, /differ/);
  assert.deepEqual(selectAsteroidHabitats(frame, source("aquarium", keys[0], [...keys].reverse()), voxels)[0].cellKeys, keys);
});

test("invalid or noncanonical habitat roots and saved cell keys reject", () => {
  for (const kind of ["aquarium", "exhibit"] as const)
    for (const root of ["01,32,0", "0,32.5,0", "-0,32,0", "9007199254740992,32,0", "boat:test"])
      rejects(source(kind, root, [root]), { block: () => BlockId.Air }, /canonical|storage/);
  rejects(source("aquarium", key(), ["01,32,0"]), world("aquarium", [key()]), /canonical/);
});

test("one hundred cold selections preserve opaque resident, encoded cargo and outside ledger bytes exactly", () => {
  const aquarium = key(), exhibit = key(90), rawOrb = '{ "future": [3,2,1], "x": -777.125, "ownerId": "do-not-rewrite" }';
  let input: AsteroidHabitatSources = {
    aquariums: { [aquarium]: { ...state([aquarium]), residents: [{ id: "resident", storedAt: 77.25,
      metadata: { schema: 1, entityId: "resident", kind: "puddlehopper", health: 2, maxHealth: 2, ageTicks: 12,
        baby: false, temperament: "Gentle", hostile: false, tamed: false, ownerId: null, name: "Opaque",
        geneticSeed: 19, command: null, custom: { locationId: "original", position: { x: 900, y: .125, z: -600 }, rawOrb } } }] } },
    chests: { [`exhibit:${exhibit}`]: [{ item: Item.RawIron, count: 7,
      metadata: { future: { x: 9, y: 8, z: 7 }, rawOrb } }], "boat:unrelated": [null] },
  };
  const initial = JSON.stringify(input), voxels = { block: (key: string) => key === aquarium ? BlockId.GlassAquarium
    : key === exhibit ? BlockId.ButterflyExhibit : BlockId.Air };
  for (let i = 0; i < 100; i++) {
    const result = selectAsteroidHabitats(frame, input, voxels);
    assert.deepEqual(result.map(row => row.attached), [true, false]);
    assert.equal(JSON.stringify(input), initial);
    input = JSON.parse(JSON.stringify(input));
  }
  assert.equal(JSON.stringify(input), initial);
});

test("non-exhibit chest ledgers are not reinterpreted as habitats", () => {
  assert.deepEqual(selectAsteroidHabitats(frame, { aquariums: {}, chests: { "boat:ship": [null], "dragon:7:cargo": [null], [key()]: [null] } },
    { block: () => { throw Error("No habitat roots to inspect"); } }), []);
});
