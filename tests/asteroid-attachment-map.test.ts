import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { asteroidMapCanonicalChunk, asteroidMapDepthBand, projectAsteroidMap, recordAsteroidMapObservations,
  type AsteroidMapObservations } from "../app/game/asteroid-attachment-map";
import { bankFastTravelCharges, createMapKnowledge, discoverNaturalPoi, markChunksRendered, markUndergroundChunk,
  placeManualMapMarker, setBedSpawn, undergroundDepthBandForY, type MapKnowledge, type MapSurfaceSample } from "../app/game/map-system";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { canonicalJson } from "../app/game/universe-json";

const orbit = locationAddress({ ...homeLocation(universeId("map-selection")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), descriptor = registry.asteroids.find(row => row.descriptor.center.y !== 32)!.descriptor;
const frame = createAsteroidAttachmentFrame(registry, descriptor.id), cx = frame.offset.x / 16, cz = frame.offset.z / 16;
const colors: MapSurfaceSample = ["#112233", "#445566", "#778899", "#aabbcc"];
const orbitPoint = (x: number, y = 32, z = 0) => ({ x: frame.offset.x + x, y: frame.offset.y + y, z: frame.offset.z + z });
function fixture() {
  let map = createMapKnowledge(`location:${frame.orbitId}`, "host");
  map = markChunksRendered(map, [-3, -2, 0, 2].map(x => ({ x: cx + x, z: cz, biome: 3, surfaceColors: colors })));
  map = markUndergroundChunk(map, { x: cx, z: cz, biome: "Crystal Hollow", elevation: -20 });
  map = placeManualMapMarker(map, { id: "inside", name: "Exact Fraction", playerId: "host", discoveredAt: 10,
    position: orbitPoint(.1, 32.2, -.3) });
  map = discoverNaturalPoi(map, { id: "outside-poi", name: "Old Far Chart", playerId: "host", discoveredAt: 12, position: orbitPoint(90) });
  map = setBedSpawn(map, { id: "outside-bed", name: "Old Bed", playerId: "host", discoveredAt: 15, position: orbitPoint(80) });
  return bankFastTravelCharges(map, 17);
}
const empty: AsteroidMapObservations = { renderedChunks: [], caveVisits: [] };

test("private map view exposes only already-known local chunks and markers without another balance or bed owner", () => {
  const source = fixture(), view = projectAsteroidMap(frame, source);
  assert.equal(view.canonicalWorldId, source.worldId); assert.equal(view.canonicalPlayerId, "host");
  assert.deepEqual(view.chunks.map(row => row.localChunk.x).sort((a, b) => a - b), [-3, -2, 0]);
  assert.equal(view.chunks.some(row => row.localChunk.x === 1), false, "no discovery invented for an unknown local chunk");
  assert.equal(view.chunks.some(row => row.localChunk.x === 2), false, "known outside chunk stays outside the view");
  assert.deepEqual(view.markers.map(row => row.canonical.id), ["inside"]);
  assert.deepEqual(view.markers[0].canonical, source.markers.find(row => row.id === "inside"));
  assert.deepEqual(view.markers[0].localPosition, { x: source.markers.find(row => row.id === "inside")!.position.x - frame.offset.x,
    y: source.markers.find(row => row.id === "inside")!.position.y - frame.offset.y, z: source.markers.find(row => row.id === "inside")!.position.z - frame.offset.z });
  for (const field of ["schema", "fastTravelCharges", "activeBedId", "worldId"]) assert.equal(Object.hasOwn(view, field), false);
  assert.ok(Object.isFrozen(view) && Object.isFrozen(view.markers[0].canonical.position));
  assert.equal(Object.isFrozen(source), false); assert.notEqual(view.markers[0].canonical, source.markers.find(row => row.id === "inside"));
});

test("one hundred cold no-op cycles preserve canonical fractions, depth samples, ordering, charges and outside bed", () => {
  let source = fixture(); const before = canonicalJson(source);
  for (let i = 0; i < 100; i++) {
    const view = projectAsteroidMap(frame, source);
    source = JSON.parse(JSON.stringify(recordAsteroidMapObservations(frame, source, view, empty)));
    assert.equal(canonicalJson(source), before);
  }
  assert.equal(source.fastTravelCharges, 17); assert.equal(source.activeBedId, "outside-bed");
});

test("render and cave observations use the original reducers with original chunk keys and world depth bands", () => {
  const source = fixture(), before = canonicalJson(source), local = { x: -1, z: 1, biome: "Asteroid Vein", surfaceColors: colors };
  const position = { x: -.25, y: -4 - frame.offset.y, z: 16.2 };
  const result = recordAsteroidMapObservations(frame, source, projectAsteroidMap(frame, source), {
    renderedChunks: [local], caveVisits: [{ position, biome: "Crystal Hollow" }],
  });
  const point = orbitPoint(position.x, position.y, position.z);
  const expected = markUndergroundChunk(markChunksRendered(source, [{ ...local, x: local.x + cx, z: local.z + cz }]),
    { x: Math.floor(point.x / 16), z: Math.floor(point.z / 16), elevation: Math.floor(point.y), biome: "Crystal Hollow" });
  assert.deepEqual(result, expected); assert.equal(canonicalJson(source), before);
  assert.equal(result.worldId, source.worldId); assert.equal(result.fastTravelCharges, 17); assert.equal(result.activeBedId, "outside-bed");
  assert.deepEqual(result.markers, source.markers);
  assert.deepEqual(result.terrainByChunk[`${cx + 2},${cz}`], source.terrainByChunk[`${cx + 2},${cz}`]);
  assert.equal(asteroidMapDepthBand(frame, position.y), undergroundDepthBandForY(point.y));
  assert.notEqual(asteroidMapDepthBand(frame, position.y), undergroundDepthBandForY(position.y), "canonical and display depth differ in this fixture");
});

test("negative centered-edge chart strips are retained without granting neighboring chunk discoveries", () => {
  assert.deepEqual(asteroidMapCanonicalChunk(frame, { x: -3, z: -3 }), { x: cx - 3, z: cz - 3 });
  assert.deepEqual(asteroidMapCanonicalChunk(frame, { x: 1, z: 1 }), { x: cx + 1, z: cz + 1 });
  for (const chunk of [{ x: -4, z: 0 }, { x: 2, z: 0 }, { x: 0, z: 2 }, { x: .5, z: 0 }])
    assert.throws(() => asteroidMapCanonicalChunk(frame, chunk));
  for (const y of [frame.localBounds.minY - .5001, frame.localBounds.maxY + .5, NaN]) assert.throws(() => asteroidMapDepthBand(frame, y));
});

test("stale selected or outside knowledge, balances and forged view fields reject before discovery", () => {
  const source = fixture(), baseline = projectAsteroidMap(frame, source);
  const altered = { ...source, fastTravelCharges: 18 };
  assert.throws(() => recordAsteroidMapObservations(frame, altered, baseline, empty), /Stale/);
  const outside = markChunksRendered(source, [{ x: cx + 100, z: cz + 100, biome: 4 }]);
  assert.throws(() => recordAsteroidMapObservations(frame, outside, baseline, empty), /Stale/);
  const forged = structuredClone(baseline); Object.assign(forged, { fastTravelCharges: 999 });
  assert.throws(() => recordAsteroidMapObservations(frame, source, forged, empty), /Stale/);
});

test("unrecognized fields, foreign ownership and lossy knowledge normalization fail closed", () => {
  const changes: ((map: MapKnowledge) => void)[] = [
    map => { Object.assign(map, { extension: true }); }, map => { Object.assign(map, { worldId: `location:${frame.localId}` }); },
    map => { Object.assign(map, { revision: -1 }); }, map => { Object.assign(map, { playerId: "  trimmed" }); },
    map => { Object.assign(map, { fastTravelCharges: 1000 }); },
    map => { Object.assign(map.terrainByChunk, { "9999,9999": 3 }); },
    map => { Object.assign(map.markers[0], { secretExtension: true }); },
    map => { Object.assign(map, { exploredChunks: [...map.exploredChunks, "01,0"] }); },
    map => { Object.assign(map.undergroundByChunk[`${cx},${cz}`], { unknownDepth: true }); },
  ];
  for (const change of changes) { const source = fixture(); change(source); assert.throws(() => projectAsteroidMap(frame, source)); }
});

test("observations cannot normalize malformed samples, move outside, replace markers or alter travel balances", () => {
  const source = fixture(), baseline = projectAsteroidMap(frame, source);
  const bad: unknown[] = [
    { ...empty, fastTravelCharges: 999 }, { ...empty, markers: [] }, { ...empty, activeBedId: null },
    { ...empty, renderedChunks: [{ x: 2, z: 0, biome: 3 }] },
    { ...empty, renderedChunks: [{ x: 0, z: 0, biome: "  trim me" }] },
    { ...empty, renderedChunks: [{ x: 0, z: 0, biome: 65536 }] },
    { ...empty, renderedChunks: [{ x: 0, z: 0, surfaceColors: ["#123", "#123", "#123", "#123"] }] },
    { ...empty, renderedChunks: [{ x: 0, z: 0, unknown: 1 }] },
    { ...empty, caveVisits: [{ position: { x: 32, y: 20, z: 0 }, biome: "Cave" }] },
    { ...empty, caveVisits: [{ position: { x: 0, y: 20, z: 0, hidden: 1 }, biome: "Cave" }] },
  ];
  for (const observations of bad) assert.throws(() => recordAsteroidMapObservations(frame, source, baseline, observations as AsteroidMapObservations));
  assert.equal(source.fastTravelCharges, 17);
});

test("revision exhaustion permits no-ops but cannot wrap or mint a new chart revision", () => {
  const source = { ...fixture(), revision: Number.MAX_SAFE_INTEGER }, baseline = projectAsteroidMap(frame, source);
  assert.deepEqual(recordAsteroidMapObservations(frame, source, baseline, empty), source);
  assert.throws(() => recordAsteroidMapObservations(frame, source, baseline, { ...empty, renderedChunks: [{ x: 1, z: 0, biome: 3 }] }));
  assert.equal(source.revision, Number.MAX_SAFE_INTEGER);
});
