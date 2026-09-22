import assert from "node:assert/strict";
import test from "node:test";
import { inspectEmptyAuthoredSiteClearance } from "../app/game/empty-authored-site-clearance";
import { captureAsteroidAttachmentCatalog } from "../app/game/asteroid-attachment-catalog";
import { emptyAuthoredSiteFixture } from "./empty-authored-site-fixtures";

const owner = (id: string) => ({ schema: 1, id, authorityId: "host", revision: 0, recentEventIds: [] });
const inspect = (f: ReturnType<typeof emptyAuthoredSiteFixture>) => inspectEmptyAuthoredSiteClearance(f.repository,
  f.world.snapshotEmptyAuthoredOrbitGeneration(), f.live);

test("ordinary orbital generator binds the complete descriptor/field/frame and a distinct cold lease epoch", () => {
  const f = emptyAuthoredSiteFixture();
  try {
    f.world.generateChunk(0, 0);
    const before = structuredClone({ repository: f.repository, live: f.live });
    const result = inspect(f);
    assert.equal(result.kind, "proven-empty-authored-sites"); assert.equal(result.census.locations.length, 2);
    assert.equal(result.generation.scope.epoch, 9); assert.equal(f.repository.snapshot.locations[0].descriptor.generationEpoch, 1);
    assert.deepEqual({ repository: f.repository, live: f.live }, before); assert(Object.isFrozen(result));
    assert(!Object.isFrozen(f.repository)); assert.deepEqual(result.generation.chunks, ["0,0"]);
  } finally { f.world.dispose(); }
});

test("unsupported saved generator, profile, options, provenance, runtime lease and field identity refuse", () => {
  for (const fault of ["version", "source-version", "profile", "options", "seed", "synthetic", "extensions", "lease", "field"] as const) {
    const f = emptyAuthoredSiteFixture();
    try {
      const row = f.repository.snapshot.locations[0];
      if (fault === "version") Object.assign(row.descriptor.generator, { version: 17 });
      if (fault === "source-version") Object.assign(row.descriptor.generator, { sourceVersion: 14 });
      if (fault === "profile") Object.assign(row.descriptor.generator, { profile: "legacy-v14" });
      if (fault === "options") Object.assign(row.descriptor.generator, { options: { ...row.descriptor.generator.options, structures: false } });
      if (fault === "seed") Object.assign(row.fields, { seed: "changed" });
      if (fault === "synthetic") Object.assign(row.descriptor, { synthetic: true });
      if (fault === "extensions") Object.assign(f.repository.snapshot.universe.extensions, { unknownProducer: {} });
      if (fault === "lease") Object.assign(f.repository.lease, { epoch: 10 });
      if (fault === "field") f.live.world.terrainSeed++;
      const before = structuredClone({ repository: f.repository, live: f.live });
      assert.throws(() => inspect(f), { name: "Error" }, fault);
      assert.deepEqual({ repository: f.repository, live: f.live }, before);
    } finally { f.world.dispose(); }
  }
});

test("current non-generation settings may differ from the retained descriptor options", () => {
  const f = emptyAuthoredSiteFixture();
  try {
    const current = { ...f.live.options, dayLengthMinutes: 30 };
    Object.assign(f.repository.snapshot.manifest, { options: current }); f.live.options = current;
    assert.equal(inspect(f).kind, "proven-empty-authored-sites");
    f.live.options = { ...current, dayLengthMinutes: 25 };
    assert.throws(() => inspect(f), /canonical saved options/);
  } finally { f.world.dispose(); }
});

test("live empty state cannot hide persisted current, inactive, off-frame or sleeping-only authored owners", () => {
  for (const index of [0, 1]) for (const fields of [
    { settlements: [owner("off-frame")] }, { merchants: { bodyless: owner("bodyless") } },
    { sleepingCreatures: [{ id: 1, poiMarkerId: "off-frame" }] },
    { creatures: [{ id: 2, residentId: "road-event:old-event" }] },
    { primeEncounters: { bodyless: {} } }, { legendaryEncounters: { bodyless: {} } },
    { surfaceRoadGraph: { region: [] } },
    { contextualLoot: { schema: 1, acquiredUniqueIds: [], containers: { "1000,32,-1000": {} } } },
  ]) {
    const f = emptyAuthoredSiteFixture();
    try {
      Object.assign(f.repository.snapshot.locations[index].fields, fields);
      const before = structuredClone(f.repository);
      assert.throws(() => inspect(f), /Unresolved/, JSON.stringify({ index, fields })); assert.deepEqual(f.repository, before);
    } finally { f.world.dispose(); }
  }
});

test("raw canonical attachment owners and malformed persisted data cannot disappear through hydration", () => {
  const f = emptyAuthoredSiteFixture();
  try {
    const fields = { schema: 1 as const, fields: { [f.live.world.locationId]: f.live.world.registry } };
    const location = f.repository.snapshot.locations[0];
    const captured = captureAsteroidAttachmentCatalog(undefined, fields, fields, location.descriptor.id,
      { ...location.fields, settlements: [owner("canonical-bodyless")] }, {}, true);
    Object.assign(f.repository.snapshot.universe, { attachmentOwners: captured.catalog });
    Object.assign(f.repository.snapshot, { locations: [{ ...location, fields: captured.location }, f.repository.snapshot.locations[1]] });
    assert.throws(() => inspect(f), /Unresolved global/);
  } finally { f.world.dispose(); }
  for (const state of [{ settlements: undefined }, { merchants: { lost: undefined } }, { roadEvents: undefined },
    { contextualLoot: { schema: 2, acquiredUniqueIds: [], containers: {} } }]) {
    const malformed = emptyAuthoredSiteFixture();
    try {
      Object.assign(malformed.repository.snapshot.locations[1].fields, state);
      const before = structuredClone(malformed.repository);
      assert.throws(() => inspect(malformed), { name: "Error" }); assert.deepEqual(malformed.repository, before);
    } finally { malformed.world.dispose(); }
  }
});

test("explicit once-only non-spatial history remains bound without parsing IDs or granting resident clearance", () => {
  const f = emptyAuthoredSiteFixture();
  try {
    const history = { startingSettlementId: "historical-origin", activatedStructureMarkers: ["spawn:1000,-1000"], roadEvents: {} };
    Object.assign(f.repository.snapshot.locations[1].fields, history);
    const before = inspect(f); assert.deepEqual(before.states[1].persisted, history);
    Object.assign(f.repository.snapshot.locations[1].fields, { activatedStructureMarkers: [...history.activatedStructureMarkers, "another"] });
    assert.notDeepEqual(inspect(f).source, before.source, "same revision history change has a different exact preimage");
    Object.assign(f.live.sites, { sleepingCreatures: [{ id: 3, residentId: "road-event:old-event" }] });
    assert.throws(() => inspect(f), /resident history/);
  } finally { f.world.dispose(); }
});
