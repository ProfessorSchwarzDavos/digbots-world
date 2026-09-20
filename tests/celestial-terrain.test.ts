import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data.ts";
import { locationAddress } from "../app/game/location-address.ts";
import {
  CELESTIAL_MIN_Y, CELESTIAL_MAX_Y, MORROW_REGIONS, ORBIT_BANDS,
  celestialTerrainSeed, createCelestialTerrain, morrowRegionAt, orbitAsteroids,
  type CelestialTerrain, type CelestialTerrainOptions,
} from "../app/game/celestial-terrain.ts";

function terrain(kind = "surface", bodyId = "blockwild/morrow", instanceId = "main", extra: Partial<CelestialTerrainOptions> = {}): CelestialTerrain {
  const result = createCelestialTerrain({ seed: 4815, location: locationAddress({ universeId: "terrain-test", systemId: "waystar", bodyId, kind, instanceId }), ...extra });
  assert.ok(result); return result;
}
function fingerprint(world: CelestialTerrain): number[] {
  const result: number[] = [];
  for (let x = -128; x <= 128; x += 8) for (let z = -128; z <= 128; z += 8) {
    const column = world.column(x, z);
    result.push(column.height);
    for (let y = -12; y <= 80; y += 4) result.push(world.block(x, y, z, column));
  }
  return result;
}

test("home and later-world surface generators are untouched; malformed policy fails closed", () => {
  for (const bodyId of ["blockwild", "talon", "orison"]) assert.equal(createCelestialTerrain({ seed: 1,
    location: locationAddress({ universeId: "test", systemId: "waystar", bodyId, kind: "surface", instanceId: "main" }) }), null);
  assert.throws(() => terrain("orbit", "blockwild", "low", { seed: NaN }));
  assert.throws(() => terrain("orbit", "blockwild", "low", { expansionLevel: 4 }));
  assert.throws(() => terrain("orbit", "blockwild", "low", { expansionLevel: -1 }));
  assert.throws(() => terrain("asteroid", "blockwild", "missing"));
});

test("Morrow covers all five specified named regions and bounded authored sites", () => {
  const moon = terrain();
  assert.equal(new Set(MORROW_REGIONS.map((region) => morrowRegionAt(region.x, region.z))).size, 5);
  for (const region of MORROW_REGIONS) assert.equal(moon.column(region.x, region.z).region, region.id);
  assert.deepEqual(moon.sites.map((site) => site.kind).sort(), ["observatory", "prospector", "rescue-shelter", "waystone-gallery"]);
  assert.ok(moon.sites.every((site) => site.radius <= 16));
  assert.ok(moon.column(120, -100).height > moon.column(0, 0).height + 10);
});

test("generation is seed-stable across sampler rebuilds, coordinates, and column call order", () => {
  const first = terrain(), second = terrain();
  second.column(999, -555); second.block(-12, 40, 20);
  assert.deepEqual(fingerprint(first), fingerprint(second));
  assert.notDeepEqual(fingerprint(first), fingerprint(terrain("surface", "blockwild/morrow", "main", { seed: 4816 })));
  assert.equal(celestialTerrainSeed(4815, "waystar", "blockwild/morrow"), celestialTerrainSeed(4815, "waystar", "blockwild/morrow"));
});

test("Morrow arrival has a solid level footprint and generous clear ship/player space", () => {
  const moon = terrain(), arrival = moon.arrival;
  assert.equal(arrival.support, "solid"); assert.equal(arrival.breathable, false);
  for (let x = -8; x <= 8; x++) for (let z = -8; z <= 8; z++) {
    assert.notEqual(moon.block(x, arrival.position.y - 1, z), BlockId.Air);
    for (let y = arrival.position.y; y <= arrival.position.y + 10; y++) assert.equal(moon.block(x, y, z), BlockId.Air);
  }
});

test("lunar resources are real finite voxels with no home food, trees, water or free iron replacement", () => {
  const moon = terrain(), materials = new Set<number>();
  for (let x = -16; x <= 16; x += 2) for (let z = -16; z <= 16; z += 2) for (let y = 10; y <= 32; y++) materials.add(moon.block(x, y, z));
  assert.ok(materials.has(BlockId.CopperOre)); assert.ok(materials.has(BlockId.CrystalOre));
  const rilleMaterials = new Set<number>();
  for (let x = 100; x <= 140; x += 2) for (let z = 100; z <= 140; z += 2) {
    const col = moon.column(x, z); rilleMaterials.add(moon.block(x, col.height, z, col));
  }
  assert.ok(rilleMaterials.has(BlockId.MineralFrost));
  for (const forbidden of [BlockId.Water, BlockId.Grass, BlockId.WildwoodLog, BlockId.IronOre]) assert.ok(!materials.has(forbidden));
});

test("authored observatory and shelters have floors, windows, roofs and accessible open entrances", () => {
  const moon = terrain();
  for (const site of moon.sites.filter((value) => value.kind !== "waystone-gallery")) {
    const { x, y, z } = site.center;
    assert.equal(moon.block(x, y, z), BlockId.MoonSlate);
    assert.equal(moon.block(x, y + 1, z), BlockId.Air);
    assert.equal(moon.block(x, y + 2, z + (site.kind === "prospector" ? 3 : 4)), BlockId.Air);
    assert.notEqual(moon.block(x, y + (site.kind === "observatory" ? 6 : 4), z), BlockId.Air);
    assert.ok(moon.column(x, z).maxY >= y + (site.kind === "observatory" ? 6 : 4));
  }
});

test("Waystone stair is a connected walkable surface-to-gallery entrance", () => {
  const moon = terrain(), site = moon.sites.find((value) => value.kind === "waystone-gallery")!;
  for (let dz = 5; dz <= 16; dz++) {
    const floor = site.center.y - 12 + dz - 5;
    assert.notEqual(moon.block(site.center.x, floor, site.center.z + dz), BlockId.Air);
    for (let dy = 1; dy <= 3; dy++) assert.equal(moon.block(site.center.x, floor + dy, site.center.z + dz), BlockId.Air);
  }
  assert.equal(moon.block(site.center.x, site.center.y - 11, site.center.z), BlockId.Air);
  assert.equal(moon.block(site.center.x, site.center.y - 12, site.center.z), BlockId.RuneStone);
  assert.equal(moon.block(site.center.x + 10, site.center.y - 10, site.center.z), BlockId.RuneStone);
});

test("orbit and station have finite bounds and empty insertion space, not ground or a free station", () => {
  for (const kind of ["orbit", "station"]) {
    const world = terrain(kind, "blockwild", "low");
    assert.equal(world.bounds.minX, -128); assert.equal(world.bounds.maxX, 127);
    assert.equal(world.arrival.support, "ship-or-eva"); assert.equal(world.arrival.breathable, false);
    for (let x = -16; x <= 16; x += 4) for (let z = -16; z <= 16; z += 4) for (let y = CELESTIAL_MIN_Y; y <= CELESTIAL_MAX_Y; y += 4) assert.equal(world.block(x, y, z), BlockId.Air);
    if (kind === "station") assert.equal(world.asteroids.length, 0);
  }
});

test("asteroid catalog has finite unique IDs, three compositions, stable frames, and append-only expansions", () => {
  const small = orbitAsteroids(9, "blockwild", "low", 0), large = orbitAsteroids(9, "blockwild", "low", 3);
  assert.equal(small.length, 12); assert.equal(large.length, 252);
  assert.equal(new Set(large.map((entry) => entry.id)).size, 252);
  assert.equal(new Set(small.map((entry) => entry.composition)).size, 3);
  for (const asteroid of small) {
    assert.deepEqual(large.find((entry) => entry.id === asteroid.id), asteroid);
    assert.equal(asteroid.spinPolicy, "sky-only"); assert.equal(asteroid.initialClaim, null);
    assert.ok(asteroid.center.x - asteroid.radii.x * 1.1 >= -128 && asteroid.center.x + asteroid.radii.x * 1.1 <= 127);
  }
  assert.equal(new Set(ORBIT_BANDS.flatMap((band) => orbitAsteroids(9, "blockwild", band).map((entry) => entry.id))).size, 36);
});

test("actual asteroid shape/ore agree in orbit and local frames, with solid clear landing", () => {
  const orbit = terrain("orbit", "blockwild", "low");
  for (const asteroid of orbit.asteroids) {
    const local = terrain("asteroid", "blockwild", asteroid.id);
    assert.equal(local.asteroids[0].localFrameId, asteroid.localFrameId);
    let solids = 0; const materials = new Set<number>();
    for (let x = -20; x <= 20; x += 2) for (let z = -20; z <= 20; z += 2) for (let dy = -20; dy <= 20; dy += 2) {
      const value = local.block(x, 32 + dy, z); materials.add(value); if (value !== BlockId.Air) solids++;
      assert.equal(value, orbit.block(asteroid.center.x + x, asteroid.center.y + dy, asteroid.center.z + z));
    }
    assert.ok(solids > 100 && solids < 4000);
    const arrival = local.arrival.position;
    assert.notEqual(local.block(0, arrival.y - 1, 0), BlockId.Air);
    for (let dy = 0; dy <= 3; dy++) assert.equal(local.block(0, arrival.y + dy, 0), BlockId.Air);
    if (asteroid.composition === "metallic") assert.ok(materials.has(BlockId.IronOre));
    if (asteroid.composition === "icy") assert.ok(materials.has(BlockId.Ice));
    if (asteroid.composition === "silicate") assert.ok(materials.has(BlockId.MoonSlate));
  }
});

test("out-of-bounds and invalid voxel lookups never synthesize matter; stale columns reject", () => {
  for (const world of [terrain(), terrain("orbit", "blockwild", "low")]) {
    for (const [x, y, z] of [[world.bounds.minX - 1, 0, 0], [world.bounds.maxX + 1, 0, 0], [0, CELESTIAL_MIN_Y - 1, 0], [0, CELESTIAL_MAX_Y + 1, 0], [0, 0, Infinity], [NaN, 0, 0], [0.5, 0, 0]]) assert.equal(world.block(x, y, z), BlockId.Air);
    assert.throws(() => world.column(Infinity, 0));
    assert.throws(() => world.block(1, 20, 1, world.column(0, 0)));
  }
});

test("crater rims and rilles produce significant relief within their own regions", () => {
  const moon = terrain();
  for (const region of ["starshadow-craters", "ice-lantern-rilles"]) {
    const heights: number[] = [];
    for (let x = -200; x <= 200; x += 2) for (let z = -200; z <= 200; z += 2) {
      const col = moon.column(x, z);
      if (col.region === region && col.site === null) heights.push(col.height);
    }
    assert.ok(Math.max(...heights) - Math.min(...heights) >= 12, `${region} needs actual terrain relief`);
  }
});

test("expanding a shard preserves actual original voxels and keeps the new edge empty", () => {
  const small = terrain("orbit", "blockwild", "low"), large = terrain("orbit", "blockwild", "low", { expansionLevel: 1 });
  assert.deepEqual(fingerprint(small), fingerprint(large));
  for (let z = -256; z <= 255; z += 7) for (let y = -16; y <= 90; y += 7) {
    assert.equal(large.block(-256, y, z), BlockId.Air);
    assert.equal(large.block(255, y, z), BlockId.Air);
  }
});
