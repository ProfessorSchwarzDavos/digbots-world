import assert from "node:assert/strict";
import test from "node:test";
import { createWaystarCatalog } from "../app/game/celestial-catalog";
import { sampleCelestialSky } from "../app/game/celestial-ephemeris";
import { projectCelestialChart, type CelestialChartInput, type CelestialChartStationPoint } from "../app/game/celestial-chart";
import { bodyId, homeLocation, locationId, systemId, universeId } from "../app/game/location-address";

const catalog = createWaystarCatalog();
const home = homeLocation(universeId("chart-test"));
const currentLocationId = locationId(home);
const input: CelestialChartInput = { catalog, currentLocationId, knownBodyIds: ["waystar", "blockwild", "blockwild/morrow"], universeSeconds: 1234 };

test("chart projects deterministic finite positions from the frozen catalog without mutating input", () => {
  const before = JSON.stringify(input);
  const result = projectCelestialChart(input);
  assert.deepEqual(result, projectCelestialChart(input));
  assert.equal(JSON.stringify(input), before);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.bodies));
  assert.ok(result.bodies.every(body => Number.isFinite(body.x) && Number.isFinite(body.y) && body.x >= 44 && body.x <= 356 && body.y >= 44 && body.y <= 356));
  assert.equal(result.clockIsEpoch, false);
  assert.notDeepEqual(result.bodies, projectCelestialChart({ ...input, universeSeconds: 54321 }).bodies);
});

test("projection payload excludes every unknown catalog body and internal policy fields", () => {
  const result = projectCelestialChart({ ...input, knownBodyIds: [...input.knownBodyIds, "made-up"] });
  assert.deepEqual(result.bodies.map(body => body.id), input.knownBodyIds);
  const payload = JSON.stringify(result);
  for (const body of catalog.bodies.filter(body => !input.knownBodyIds.includes(body.id))) {
    assert.ok(!payload.includes(body.name));
    assert.ok(!payload.includes(`"${body.id}"`));
  }
  for (const field of ["generator", "travel", "atmosphere", "environmentPolicyId"]) assert.ok(!payload.includes(field));
});

test("explicit knowledge does not implicitly discover the current body or parent", () => {
  const empty = projectCelestialChart({ ...input, knownBodyIds: [] });
  assert.equal(empty.currentBodyName, null);
  assert.deepEqual(empty.bodies, []);
  const moon = projectCelestialChart({ ...input, knownBodyIds: ["blockwild/morrow"] }, "orbit");
  assert.deepEqual(moon.bodies.map(body => body.name), ["Morrow"]);
  assert.equal(moon.bodies[0].parentName, null);
  assert.equal(moon.focusName, null);
  assert.ok(!JSON.stringify(moon).includes("Blockwild"));
});

test("current-body identity follows LocationId for home surface, moon orbit and moon surface", () => {
  for (const kind of ["surface", "orbit"] as const) {
    const location = locationId({ ...home, bodyId: bodyId("blockwild/morrow"), kind, instanceId: kind === "surface" ? "main" : "low" });
    const result = projectCelestialChart({ ...input, currentLocationId: location }, "orbit");
    assert.equal(result.currentBodyName, "Morrow");
    assert.equal(result.locationKind, kind);
    assert.equal(result.focusName, "Blockwild");
    assert.deepEqual(result.bodies.filter(body => body.current).map(body => body.id), ["blockwild/morrow"]);
    assert.deepEqual(result.bodies.map(body => body.id), ["blockwild", "blockwild/morrow"]);
  }
  assert.equal(projectCelestialChart(input).bodies.find(body => body.current)?.name, "Blockwild");
});

test("orbital neighborhood includes only the current primary and its known moons", () => {
  const result = projectCelestialChart({ ...input, knownBodyIds: ["waystar", "blockwild", "blockwild/morrow", "talon", "talon/hope"] }, "orbit");
  assert.deepEqual(result.bodies.map(body => body.name), ["Blockwild", "Morrow"]);
  assert.equal(result.bodies[0].x, 200);
  assert.equal(result.bodies[0].y, 200);
});

test("only supplied exact-location station points use the separate local block frame", () => {
  const orbit = locationId({ ...home, kind: "orbit", instanceId: "low" });
  const point: CelestialChartStationPoint = { id: "s1", name: "Copper Station", locationId: orbit, position: [10, 42, -20] };
  const points = [point, { ...point, name: "Duplicate" },
    { ...point, id: "other-band", locationId: locationId({ ...home, kind: "orbit", instanceId: "high" }) },
    { ...point, id: "foreign", locationId: locationId({ ...home, universeId: universeId("foreign"), kind: "orbit", instanceId: "low" }) },
    { ...point, id: "invalid", position: [NaN, 0, 0] as const }];
  const result = projectCelestialChart({ ...input, currentLocationId: orbit, stationPoints: points }, "orbit");
  assert.equal(result.stations.length, 1);
  assert.deepEqual(result.stations[0].position, [10, 42, -20]);
  assert.equal(result.stations[0].x, 278);
  assert.equal(result.stations[0].y, 356);
  assert.ok(Object.isFrozen(result.stations[0].position));
  assert.deepEqual(projectCelestialChart({ ...input, stationPoints: points }).stations, []);
  assert.deepEqual(projectCelestialChart({ ...input, currentLocationId: orbit, knownBodyIds: [], stationPoints: points }).stations, []);
});

test("sky phase is optional, knowledge-filtered and used only with the matching clock", () => {
  const skySample = sampleCelestialSky(catalog, catalog.bodies.find(body => body.id === "blockwild")!, 1234);
  const result = projectCelestialChart({ ...input, skySample });
  assert.equal(result.bodies.find(body => body.id === "blockwild/morrow")?.illuminatedFraction,
    skySample.bodies.find(body => body.id === "blockwild/morrow")?.illuminatedFraction);
  assert.ok(projectCelestialChart({ ...input, universeSeconds: 1235, skySample }).bodies.every(body => body.illuminatedFraction === null));
  const epoch = projectCelestialChart({ ...input, universeSeconds: undefined });
  assert.equal(epoch.clockIsEpoch, true);
  assert.equal(epoch.universeSeconds, 0);
});

test("foreign systems, missing current bodies and invalid clocks fail closed", () => {
  assert.throws(() => projectCelestialChart({ ...input, currentLocationId: locationId({ ...home, systemId: systemId("foreign") }) }), /current system/);
  assert.throws(() => projectCelestialChart({ ...input, currentLocationId: locationId({ ...home, bodyId: bodyId("missing") }) }), /current body/);
  for (const universeSeconds of [-1, NaN, Infinity]) assert.throws(() => projectCelestialChart({ ...input, universeSeconds }), /clock/);
});
