import assert from "node:assert/strict";
import test from "node:test";
import { catalogBody, celestialCatalogDigest, createWaystarCatalog, validateCelestialCatalog } from "../app/game/celestial-catalog.ts";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address.ts";

test("the complete Waystar roster is immutable, versioned and home-only accessible", async () => {
  const catalog = createWaystarCatalog();
  assert.equal(catalog.bodies.length, 15);
  assert.equal(catalog.bodies.filter((body) => body.kind === "moon").length, 8);
  assert.deepEqual(catalog.bodies.filter((body) => body.travel.playerAvailable).map((body) => body.id), ["blockwild"]);
  assert.ok(Object.isFrozen(catalog.bodies[2].physical));
  const copy = JSON.parse(JSON.stringify(catalog));
  assert.equal(await celestialCatalogDigest(catalog), await celestialCatalogDigest(validateCelestialCatalog(copy)));
  copy.bodies[2].name = "Mutated registry";
  assert.equal(catalog.bodies[2].name, "Blockwild");
  const home = homeLocation(universeId("synthetic"));
  assert.equal(catalogBody(catalog, home).physical.surfaceGravityG, 1);
  assert.throws(() => catalogBody(catalog, locationAddress({ ...home, bodyId: "unknown" })));
  assert.throws(() => catalogBody(catalog, locationAddress({ ...home, bodyId: "orison" })));
});

test("catalog rejects unsupported, nonfinite, cyclic, duplicate and unsafe policies", () => {
  const mutate = (fn: (value: ReturnType<typeof JSON.parse>) => void) => {
    const value = JSON.parse(JSON.stringify(createWaystarCatalog())); fn(value); assert.throws(() => validateCelestialCatalog(value));
  };
  mutate((v) => { v.schemaVersion = 2; });
  mutate((v) => { v.catalogVersion = 99; });
  mutate((v) => { v.bodies[2].id = v.bodies[1].id; });
  mutate((v) => { v.bodies[2].parentId = "missing"; });
  mutate((v) => { v.bodies[1].parentId = "blockwild"; v.bodies[2].parentId = "cinderhymn"; });
  mutate((v) => { v.bodies[2].physical.massEarths = NaN; });
  mutate((v) => { v.bodies[2].physical.radiusEarths = 0; });
  mutate((v) => { v.bodies[2].physical.surfaceGravityG = 2; });
  mutate((v) => { v.bodies[2].orbit.eccentricity = 1; });
  mutate((v) => { v.bodies[2].orbit.orbitalPeriodDays = 0; });
  mutate((v) => { v.bodies[2].atmosphere.oxygenFraction = 0.5; });
  mutate((v) => { v.bodies[4].travel.playerAvailable = true; });
  mutate((v) => { v.bodies[9].travel.solidSurface = true; });
  mutate((v) => { v.bodies[2].rotation.unknown = true; });
});
