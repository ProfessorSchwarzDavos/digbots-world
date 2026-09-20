import assert from "node:assert/strict";
import test from "node:test";
import { UniverseStorage, type UniverseLoadedWorld } from "../app/game/universe-storage";
import { canonicalJson, universeSha256 } from "../app/game/universe-json";
import { universeId } from "../app/game/location-address";
import { flightFixture } from "./spaceflight-fixtures";

async function fixture(legacy: boolean) {
  const f = flightFixture("checkpoint-retry"), id = universeId(f.world.metadata.id), digest = "a".repeat(64);
  const save = { ...f.world.save, edits: { "0,0": [[9, 1], [2, 1]] as Array<[number, number]> } };
  // This branch reads only the returned world; real-IDB tests cover the complete receipt.
  const current: Pick<UniverseLoadedWorld, "world"> = { world: { ...f.world,
    save: legacy ? save : { ...save, edits: { "0,0": [[2, 1], [9, 1]] } } } };
  const intentDigest = legacy ? digest : await universeSha256(canonicalJson({ checkpoint: 1, save, metadata: null, options: null, admitOrbitAttachments: true }));
  const repo = Object.assign(Object.create(UniverseStorage.prototype), {
    currentSnapshot: async () => ({ manifest: { revision: 8 }, journals: [
      { transactionId: "same", state: "committed", kind: "checkpoint", expectedRevision: 7, nextRevision: 8, digest, intentDigest },
    ] }),
    load: async () => structuredClone(current),
  }) as UniverseStorage;
  const lease = { id, universeId: id, owner: "fixture", epoch: 1, expiresAt: 20000 };
  return { f, repo, id, save, lease, current };
}

test("new checkpoint retry binds the original request even when the hydrated page ordering differs", async () => {
  const f = await fixture(false), options = { transactionId: "same", admitOrbitAttachments: true };
  assert.deepEqual(await f.repo.checkpoint(f.id, f.save, 7, f.lease, options), f.current);
  await assert.rejects(() => f.repo.checkpoint(f.id, f.current.world.save, 7, f.lease, options), /different content/);
  await assert.rejects(() => f.repo.checkpoint(f.id, f.save, 7, f.lease, { ...options, admitOrbitAttachments: false }), /different content/);
  await assert.rejects(() => f.repo.checkpoint(f.id, f.save, 7, f.lease, { ...options, metadata: f.f.world.metadata }), /different content/);
  await assert.rejects(() => f.repo.checkpoint(f.id, f.save, 8, f.lease, options));
});

test("pre-request-digest checkpoint receipts retain their original exact-save retry rule, never admission authority", async () => {
  const f = await fixture(true), options = { transactionId: "same" };
  assert.deepEqual(await f.repo.checkpoint(f.id, f.save, 7, f.lease, options), f.current);
  assert.deepEqual(await f.repo.checkpoint(f.id, f.save, 7, f.lease,
    { ...options, metadata: f.f.world.metadata, options: f.f.world.options }), f.current);
  await assert.rejects(() => f.repo.checkpoint(f.id, { ...f.save, day: 9 }, 7, f.lease, options), /different state/);
  await assert.rejects(() => f.repo.checkpoint(f.id, f.save, 7, f.lease,
    { ...options, metadata: { ...f.f.world.metadata, name: "changed" } }), /different metadata/);
  await assert.rejects(() => f.repo.checkpoint(f.id, f.save, 7, f.lease, { ...options, admitOrbitAttachments: true }), /different content/);
});
