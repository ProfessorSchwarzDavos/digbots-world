import assert from "node:assert/strict";
import test from "node:test";
import { observeAsteroidAuthoredSites, savedAuthoredSiteSources, type AuthoredSiteSources } from "../app/game/asteroid-authored-site-census";
import { asteroidEntityCompoundId } from "../app/game/asteroid-attachment-relationships";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";

const home = homeLocation(universeId("authored-sites")), id = locationId(home);
const origin = locationId(locationAddress({ ...home, bodyId: "morrow" }));
const owner = (id: string) => ({ schema: 1, id, authorityId: "host", revision: 0, recentEventIds: [] });
const empty = (): AuthoredSiteSources => ({ settlements: [], merchants: [], creatures: [], sleepingCreatures: [] });

test("bodyless and off-frame owners retain whole additive state without claiming geometry", () => {
  const settlement = { ...owner("far-settlement"), layout: { center: { x: 100000, z: -90000 } }, foodReserve: 13,
    residents: [{ id: "unloaded", orders: { holdPosition: { x: 9, y: 30, z: 7 } } }], extension: { retained: undefined } };
  const merchant = { ...owner("bodyless-trader"), gold: 19, inventory: [{ opaque: "finite-stock" }], customCatalog: ["special"] };
  const input = { ...empty(), settlements: [[settlement.id, settlement]] as const, merchants: [[merchant.id, merchant]] as const };
  const before = structuredClone(input), result = observeAsteroidAuthoredSites(id, input);
  assert.equal(result.status, "unresolved"); assert.equal(result.references.length, 0);
  assert.deepEqual(result.settlements[0].state, settlement); assert.deepEqual(result.merchants[0].state, merchant);
  assert.equal(result.settlements[0].status, "unresolved-physical-owner");
  assert(Object.isFrozen(result.settlements[0].state)); assert(!Object.isFrozen(settlement)); assert.deepEqual(input, before);
  settlement.foodReserve++; assert.notDeepEqual(observeAsteroidAuthoredSites(id, input).source, result.source);
});

test("all active and sleeping spatial reference families are observed without coordinate guesses", () => {
  const result = observeAsteroidAuthoredSites(id, { ...empty(), creatures: [
    { id: 0, poiMarkerId: "poi:0:0", settlementId: "village", residentId: "mayor" },
    { id: 1, primeAnchorId: "prime:petalfox:0:0", encounterOriginLocationId: origin },
    { id: 2, legendaryEncounterId: "legendary-encounter", legendarySiteId: "site:10:20" },
  ], sleepingCreatures: [{ id: 3, dragonState: { home: { dimension: "surface", lairId: "not-coordinates" } } }] });
  assert.deepEqual(result.references.map(row => [row.bodyId, row.kind, row.id, row.originLocationId]), [
    [0, "poi", "poi:0:0", id], [0, "settlement", "village", id], [0, "resident", asteroidEntityCompoundId("village", "mayor"), id],
    [1, "prime", "prime:petalfox:0:0", origin], [2, "legendary", asteroidEntityCompoundId("legendary-encounter", "site:10:20"), null],
    [3, "dragon-lair", asteroidEntityCompoundId("surface", "not-coordinates"), id],
  ]);
  assert.equal(result.references.at(-1)!.collection, "sleepingCreatures"); assert.equal(result.status, "unresolved");
});

test("road and guild history is classified separately, never promoted to a spatial owner", () => {
  const result = observeAsteroidAuthoredSites(id, { ...empty(), creatures: [{ id: 1, residentId: "road-event:crossing" },
    { id: 2, residentId: "guild-companion:pella-reedshoe" }] });
  assert.equal(result.references.length, 0);
  assert.deepEqual(result.historicalResidents.map(row => row.reference), [{ kind: "road-event", id: "crossing" },
    { kind: "guild-companion", id: "pella-reedshoe" }]);
  assert.throws(() => observeAsteroidAuthoredSites(id, { ...empty(), creatures: [{ id: 1, residentId: "unknown" }] }), /Unresolved/);
});

test("optional live references preserve absent, undefined and null preimages", () => {
  const variants = [{ id: 1 }, { id: 1, poiMarkerId: undefined }, { id: 1, poiMarkerId: null }];
  const results = variants.map(body => observeAsteroidAuthoredSites(id, { ...empty(), creatures: [body] }));
  assert(results.every(row => row.status === "no-observed-site-records"));
  assert.notDeepEqual(results[0].source, results[1].source); assert.notDeepEqual(results[1].source, results[2].source);
});

test("malformed owner rows and receipts refuse unchanged rather than being dropped", () => {
  const faults: unknown[] = [null, { ...owner("site"), schema: 2 }, { ...owner("different") },
    { ...owner("site"), authorityId: " host" }, { ...owner("site"), revision: -1 },
    { ...owner("site"), recentEventIds: ["event", "event"] }, { ...owner("site"), recentEventIds: [" "] }];
  for (const state of faults) for (const family of ["settlements", "merchants"] as const) {
    const input = { ...empty(), [family]: [["site", state]] }, before = structuredClone(input);
    assert.throws(() => observeAsteroidAuthoredSites(id, input), { name: "Error" }); assert.deepEqual(input, before);
  }
  assert.throws(() => observeAsteroidAuthoredSites(id, { ...empty(), settlements: [["site", owner("site")], ["site", owner("site")]] }), /Duplicate/);
});

test("duplicate bodies, malformed paired references and foreign provenance refuse", () => {
  const faults = [{ id: -1 }, { id: 1, legendarySiteId: "missing-encounter" }, { id: 1, poiMarkerId: " padded" },
    { id: 1, dragonState: { home: { lairId: "missing-dimension" } } },
    { id: 1, encounterOriginLocationId: locationId(homeLocation(universeId("foreign"))) },
    { id: 1, encounterOriginLocationId: undefined }];
  for (const body of faults) assert.throws(() => observeAsteroidAuthoredSites(id, { ...empty(), creatures: [body] }), { name: "Error" });
  assert.throws(() => observeAsteroidAuthoredSites(id, { ...empty(), creatures: [{ id: 1 }], sleepingCreatures: [{ id: 1 }] }), /duplicate/);
});

test("saved adapters preserve optional absence but reject explicit undefined and getters without invocation", () => {
  assert.deepEqual(savedAuthoredSiteSources({}), empty());
  const state = owner("site"), merchant = owner("trader");
  assert.deepEqual(savedAuthoredSiteSources({ settlements: [state], merchants: { trader: merchant }, creatures: [{ id: 1 }] }),
    { settlements: [["site", state]], merchants: [["trader", merchant]], creatures: [{ id: 1 }], sleepingCreatures: [] });
  for (const field of ["settlements", "merchants", "creatures", "sleepingCreatures"]) {
    assert.throws(() => savedAuthoredSiteSources({ [field]: undefined }), { name: "Error" });
    let reads = 0; const input = Object.defineProperty({}, field, { enumerable: true, get() { reads++; return []; } });
    assert.throws(() => savedAuthoredSiteSources(input), /accessors/); assert.equal(reads, 0);
  }
});

test("source accessors, sparse arrays and unsupported family names refuse before reading", () => {
  let reads = 0; const body = Object.defineProperty({ id: 1 }, "poiMarkerId", { enumerable: true, get() { reads++; return "site"; } });
  assert.throws(() => observeAsteroidAuthoredSites(id, { ...empty(), creatures: [body] }), /accessors/); assert.equal(reads, 0);
  assert.throws(() => observeAsteroidAuthoredSites(id, { ...empty(), creatures: Array(1) }), /dense/);
  assert.throws(() => observeAsteroidAuthoredSites(id, { ...empty(), unknown: [] } as AuthoredSiteSources), /Authored site source/);
});
