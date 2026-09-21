import assert from "node:assert/strict";
import test from "node:test";
import { UniverseWorldStorage } from "../app/game/universe-world-storage";
import type { UniverseAttachmentSource } from "../app/game/universe-storage";
import { encodeAttachmentSource } from "../app/game/attachment-source-preimage";
import { homeLocation, locationId, universeId } from "../app/game/location-address";

function fixture() {
  const id = universeId("facade-source"), location = locationId(homeLocation(id));
  const lease = { id, universeId: id, owner: "test-owner", epoch: 3, expiresAt: 20000 };
  const active = { manifest: { id, revision: 7, currentLocationId: location }, stamp: { locationId: location, epoch: 3, revision: 8 },
    world: { fixtureOnly: true }, catalog: { testCatalog: true }, lease };
  let reads = 0, effect: () => void | Promise<void> = () => undefined;
  // Explicit repository double isolates facade races; native-IDB verification
  // is separate. This partial snapshot is not a valid persisted universe.
  const repository = { list: async () => [], snapshotAttachmentSource: async () => {
    reads++; await effect();
    return { snapshot: { manifest: structuredClone(active.manifest) }, loaded: structuredClone(active),
      lease: { ...lease }, source: encodeAttachmentSource([]) } as unknown as UniverseAttachmentSource;
  } };
  const facade = Object.assign(Object.create(UniverseWorldStorage.prototype), { active, repository,
    selectedId: id, disposed: false, writerConfirmed: true, pendingOperations: 0, storageOperationEpoch: 0,
    pendingVehicleCommit: null, completedVehicleCommit: null, reloadCheckpoint: null,
    status: { phase: "ready", message: "test" }, listeners: new Set(), ready: Promise.resolve(true), queue: Promise.resolve(),
  }) as UniverseWorldStorage;
  return { facade, active, lease, repository, reads: () => reads, duringRead: (callback: typeof effect) => { effect = callback; } };
}

test("facade capture observes without saving, pumping the operation queue or reading a clock", async () => {
  const f = fixture(), before = JSON.stringify(f.active), now = Date.now;
  Date.now = () => { throw Error("No facade clock"); };
  try { const result = await f.facade.snapshotAttachmentSource(); assert.equal(result.snapshot.manifest.revision, 7); }
  finally { Date.now = now; }
  assert.equal(f.reads(), 1); assert.equal(JSON.stringify(f.active), before);
});

test("all pending facade authority paths reject before a repository read", async () => {
  const pending: Record<string, unknown> = { disposed: true, writerConfirmed: false, selectedId: "other", pendingOperations: 1,
    storageOperationEpoch: NaN, status: { phase: "error", message: "test" }, pendingVehicleCommit: {}, completedVehicleCommit: {}, reloadCheckpoint: {} };
  for (const [field, value] of Object.entries(pending)) {
    const f = fixture(); Object.assign(f.facade, { [field]: value });
    await assert.rejects(() => f.facade.snapshotAttachmentSource(), /pending storage work/, field); assert.equal(f.reads(), 0);
  }
  const f = fixture(); Object.assign(f.active, { lease: null });
  await assert.rejects(() => f.facade.snapshotAttachmentSource(), /pending storage work/); assert.equal(f.reads(), 0);
});

test("manifest, location, catalog, lease identity and disposal changes during read invalidate the facade preimage", async () => {
  const mutations = [
    (f: ReturnType<typeof fixture>) => { f.active.manifest.revision++; },
    (f: ReturnType<typeof fixture>) => { f.active.stamp.revision++; },
    (f: ReturnType<typeof fixture>) => { f.active.catalog.testCatalog = false; },
    (f: ReturnType<typeof fixture>) => { f.active.world.fixtureOnly = false; },
    (f: ReturnType<typeof fixture>) => { f.active.lease.epoch++; },
    (f: ReturnType<typeof fixture>) => { f.active.lease.owner = "replacement"; },
    (f: ReturnType<typeof fixture>) => { f.active.lease.expiresAt = 0; },
    (f: ReturnType<typeof fixture>) => { Object.assign(f.facade, { disposed: true }); },
  ];
  for (const mutate of mutations) {
    const f = fixture(); f.duringRead(() => mutate(f));
    await assert.rejects(() => f.facade.snapshotAttachmentSource(), /Stale attachment|pending storage work/);
  }
  const f = fixture(); f.duringRead(() => { f.active.lease = { ...f.active.lease, expiresAt: 30000 }; });
  await f.facade.snapshotAttachmentSource(); assert.equal(f.active.lease.expiresAt, 30000, "same-owner renewal is not replaced or shortened");
});

test("a complete queued operation during source await is detected even if manifest and status return unchanged", async () => {
  const f = fixture();
  const control = f.facade as unknown as { perform(phase: "saving", message: string, action: () => Promise<void>): Promise<unknown> };
  f.duringRead(async () => { await control.perform("saving", "test operation", async () => undefined); });
  await assert.rejects(() => f.facade.snapshotAttachmentSource(), /Stale attachment storage facade/);
  f.duringRead(() => undefined);
  await f.facade.snapshotAttachmentSource();
});

test("queued operation count is immediate and drains after both successful and failed actions", async () => {
  const f = fixture(); let finish!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  const control = f.facade as unknown as { perform(phase: "saving", message: string, action: () => Promise<void>): Promise<unknown>; pendingOperations: number };
  const first = control.perform("saving", "first", () => gate);
  const second = control.perform("saving", "second", async () => { throw Error("test failure"); });
  assert.equal(control.pendingOperations, 2);
  await assert.rejects(() => f.facade.snapshotAttachmentSource(), /pending storage work/); assert.equal(f.reads(), 0);
  finish(); await first; await second; assert.equal(control.pendingOperations, 0);
  await assert.rejects(() => f.facade.snapshotAttachmentSource(), /pending storage work/, "failed status is not silently repaired");
});

test("repository revision mismatch and failure are propagated without refreshing or mutating the facade", async () => {
  const f = fixture(), before = JSON.stringify(f.active);
  f.repository.snapshotAttachmentSource = async () => ({ snapshot: { manifest: { ...f.active.manifest, revision: 8 } },
    lease: f.lease, source: encodeAttachmentSource([]) } as UniverseAttachmentSource);
  await assert.rejects(() => f.facade.snapshotAttachmentSource(), /Stale attachment storage facade/);
  f.repository.snapshotAttachmentSource = async () => { throw Error("repository-read-failed"); };
  await assert.rejects(() => f.facade.snapshotAttachmentSource(), /repository-read-failed/);
  assert.equal(JSON.stringify(f.active), before);
});

test("same-revision repository/catalog/stamp/base differences cannot join to an unchanged cached world", async () => {
  for (const field of ["manifest", "catalog", "stamp", "world"] as const) {
    const f = fixture(), read = f.repository.snapshotAttachmentSource;
    f.repository.snapshotAttachmentSource = async () => {
      const result = await read();
      return { ...result, loaded: { ...result.loaded, [field]: { ...result.loaded[field], unexpectedDifference: true } } };
    };
    await assert.rejects(() => f.facade.snapshotAttachmentSource(), /differs from the cached committed base/, field);
  }
});
