import assert from "node:assert/strict";
import test from "node:test";
import { observeUniverseAuthoredSites } from "../app/game/universe-authored-site-census";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { captureAsteroidAttachmentCatalog } from "../app/game/asteroid-attachment-catalog";
import { celestialTerrainSeed } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import type { UniverseCreatureCustodySnapshot } from "../app/game/universe-creature-custody";
import type { AuthoredSiteSources } from "../app/game/asteroid-authored-site-census";
import type { SaveFields } from "../app/game/universe-save";

const universe = universeId("universe-site-census"), home = homeLocation(universe);
const orbit = locationAddress({ ...home, kind: "orbit", instanceId: "low" }), ids = [locationId(orbit), locationId(home)];
const seed = "authored-site-fixture", numericSeed = celestialTerrainSeed(seed);
const owner = (id: string) => ({ schema: 1, id, authorityId: "host", revision: 0, recentEventIds: [] });
function fixture() {
  const source: AuthoredSiteSources = { settlements: [["live", owner("live")]], merchants: [], creatures: [], sleepingCreatures: [] };
  const snapshot: UniverseCreatureCustodySnapshot = {
    manifest: { id: universe, universeId: universe, revision: 5, currentLocationId: ids[0], currentPlayerId: "host", deletedAt: null },
    universe: { fields: { asteroidFields: { schema: 1, fields: { [ids[0]]: createAsteroidRegistry(orbit, numericSeed) } } } },
    locations: ids.map((id, index) => ({ descriptor: { id, universeId: universe, revision: 7 },
      fields: { settlements: [owner(index ? "unloaded" : "persisted")], merchants: { trader: owner("trader") } } })), players: [],
  };
  const live = { locationId: ids[0], repositoryRevision: 5, locationRevision: 7, source };
  return { snapshot, live, observe() { return observeUniverseAuthoredSites(this.snapshot, this.live); } };
}
function change(f: ReturnType<typeof fixture>, index: number, fields: SaveFields) {
  f.snapshot = { ...f.snapshot, locations: f.snapshot.locations.map((row, i) => i === index ? { ...row, fields } : row) };
}

test("current raw owners replace only their own row and unloaded bodyless owners stay unresolved", () => {
  const f = fixture(), before = structuredClone({ snapshot: f.snapshot, live: f.live }), result = f.observe();
  assert.deepEqual(result.locations.map(row => [row.runtime, row.census.settlements[0].id]), [[true, "live"], [false, "unloaded"]]);
  assert.equal(result.locations[0].census.merchants.length, 0); assert.equal(result.locations[1].census.merchants[0].id, "trader");
  assert.deepEqual(result.unresolvedLocations, ids); assert(Object.isFrozen(result)); assert(!Object.isFrozen(f.snapshot));
  assert.deepEqual({ snapshot: f.snapshot, live: f.live }, before);
});

test("invalid persisted current owners cannot be hidden by valid raw live state", () => {
  for (const index of [0, 1]) {
    const f = fixture(); change(f, index, { settlements: [owner("duplicate"), owner("duplicate")] });
    assert.throws(() => f.observe(), /Duplicate/);
  }
});

test("missing, foreign, duplicate, stale and conflicting partition owners refuse", () => {
  for (const fault of ["missing", "duplicate", "foreign", "negative-revision", "stale", "repository", "deleted", "current", "partition"] as const) {
    const f = fixture();
    if (fault === "missing") f.snapshot = { ...f.snapshot, locations: f.snapshot.locations.slice(1) };
    if (fault === "duplicate") f.snapshot = { ...f.snapshot, locations: [...f.snapshot.locations, f.snapshot.locations[1]] };
    if (fault === "foreign" || fault === "negative-revision") f.snapshot = { ...f.snapshot, locations: f.snapshot.locations.map((row, i) => i ?
      { ...row, descriptor: { ...row.descriptor, ...(fault === "foreign" ? { universeId: universeId("foreign") } : { revision: -1 }) } } : row) };
    if (fault === "stale") f.live = { ...f.live, locationRevision: 6 };
    if (fault === "repository") f.live = { ...f.live, repositoryRevision: 6 };
    if (fault === "deleted") f.snapshot = { ...f.snapshot, manifest: { ...f.snapshot.manifest, deletedAt: 1 } };
    if (fault === "current") f.snapshot = { ...f.snapshot, manifest: { ...f.snapshot.manifest, currentLocationId: ids[1] } };
    if (fault === "partition") change(f, 1, { inventory: [] });
    assert.throws(() => f.observe(), { name: "Error" }, fault);
  }
});

test("orphan persisted field refuses even when current live source is empty", () => {
  const f = fixture(), high = locationAddress({ ...orbit, instanceId: "high" });
  f.snapshot = { ...f.snapshot, universe: { fields: { asteroidFields: { schema: 1, fields: {
    [ids[0]]: createAsteroidRegistry(orbit, 123), [locationId(high)]: createAsteroidRegistry(high, 123),
  } } } } };
  assert.throws(() => f.observe(), /field lacks/);
});

test("same-revision additive site changes remain exact source changes", () => {
  const f = fixture(), result = f.observe();
  change(f, 1, { ...f.snapshot.locations[1].fields, merchants: { trader: { ...owner("trader"), gold: 12 } } });
  assert.notDeepEqual(f.observe().source, result.source);
  const next = f.observe(); f.live = { ...f.live, source: { ...f.live.source, creatures: [{ id: 4, poiMarkerId: "off-frame" }] } };
  assert.notDeepEqual(f.observe().source, next.source);
});

test("raw persisted undefined ledger entries and origins refuse before lossy hydration", () => {
  for (const index of [0, 1]) for (const fields of [
    ...["settlements", "merchants", "creatures", "sleepingCreatures"].map(key => ({ [key]: undefined })),
    { merchants: { bad: undefined } }, { creatures: [{ id: 1, specimenOriginLocationId: undefined }] },
  ]) {
    const f = fixture(); change(f, index, fields);
    assert.throws(() => f.observe(), { name: "Error" });
  }
});

test("inactive raw owner states preserve additive undefined and negative zero", () => {
  const f = fixture(), state = { ...owner("raw"), extension: { absent: undefined, zero: -0 } };
  change(f, 1, { settlements: [state] });
  const result = f.observe().locations[1].census.settlements[0].state;
  assert.deepEqual(result, state); assert(Object.hasOwn((result.extension as object), "absent"));
  assert(Object.is((result.extension as { zero: number }).zero, -0));
});

test("admitted physical catalog uses its exact raw site owner and still rejects duplicate location ownership", () => {
  const f = fixture(), fields = { schema: 1 as const, fields: { [ids[0]]: createAsteroidRegistry(orbit, numericSeed) } };
  const plan = captureAsteroidAttachmentCatalog(undefined, fields, fields, ids[0], { seed, edits: {}, furnaces: {}, chests: {},
    settlements: [owner("canonical")] }, {}, true);
  const rawFields: Record<string, unknown> = structuredClone(plan.catalog.owners[ids[0]].fields);
  const raw = { ...plan.catalog, owners: { [ids[0]]: { ...plan.catalog.owners[ids[0]], fields: rawFields } } };
  const state = { ...owner("canonical"), extension: { undefinedValue: undefined, zero: -0 } };
  rawFields.settlements = [state];
  f.snapshot = { ...f.snapshot, universe: { ...f.snapshot.universe, attachmentOwners: raw } };
  change(f, 0, plan.location);
  // Move the runtime observation to Home so orbit's persisted canonical state
  // is exposed instead of being replaced by the current raw runtime ledger.
  f.snapshot = { ...f.snapshot, manifest: { ...f.snapshot.manifest, currentLocationId: ids[1] } };
  f.live = { ...f.live, locationId: ids[1] };
  assert.deepEqual(f.observe().locations[0].census.settlements[0].state, state);
  rawFields.merchants = { invalid: undefined };
  assert.throws(() => f.observe(), { name: "Error" });
  delete rawFields.merchants;
  change(f, 0, { ...plan.location, settlements: [] });
  assert.throws(() => f.observe(), /duplicate attachment owner/);
});
