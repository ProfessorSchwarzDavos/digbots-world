import assert from "node:assert/strict";
import test from "node:test";
import type { WorldSave } from "../app/game/engine.ts";
import { UniverseWorldStorage, readLegacyUniverseCandidates } from "../app/game/universe-world-storage.ts";
import type { UniverseLoadedWorld } from "../app/game/universe-storage.ts";
import { LEGACY_WORLD_KEY, WORLD_CATALOG_KEY, WORLD_DATA_PREFIX, migrateLegacyWorldSave, normalizeWorldOptions } from "../app/game/world-storage.ts";
import { flightFixture } from "./spaceflight-fixtures";

const save = (generatorVersion = 18): WorldSave => ({ version: 2, generatorVersion, seed: "CF1-READONLY-MIGRATION", mode: "builder", player: { x: -17, y: 33, z: 0, yaw: 0, pitch: 0 }, spawn: { x: -17, y: 33, z: 0 }, inventory: [null], selected: 0, health: 10, hunger: 10, xp: 0, level: 0, edits: { "-2,0": [[100, 1]] }, time: 0.32, day: 1, weather: "clear", chests: { "-17,33,0": [null] }, furnaces: {}, savedAt: 1000 });

test("facade replays the exact committed arrival after destination hydration fails", async () => {
  const f = flightFixture("facade-hydration"), revisions: number[] = [];
  const lease = { id: f.world.metadata.id, universeId: f.world.metadata.id, owner: "test", epoch: 1, expiresAt: Date.now() + 30000 };
  const loaded = { world: { ...f.world, save: f.initial }, manifest: { id: f.world.metadata.id, revision: 8 }, lease };
  const facade = Object.assign(Object.create(UniverseWorldStorage.prototype), {
    active: { world: f.world, manifest: { id: f.world.metadata.id, revision: 7 }, lease }, writerConfirmed: true,
    pendingVehicleCommit: null, completedVehicleCommit: null,
    perform: async (_phase: string, _message: string, operation: () => Promise<unknown>) => ({ ok: true, value: await operation() }),
    repository: { transitionVehicle: async (_id: string, _save: unknown, _destination: string, revision: number) => { revisions.push(revision); return loaded; } },
  }) as UniverseWorldStorage;
  const first = await facade.transitionVehicleLocation(f.destination.locationId, f.world.save, f.input);
  const retry = await facade.transitionVehicleLocation(f.destination.locationId, f.world.save, f.input);
  assert.deepEqual(retry, first); assert.deepEqual(revisions, [7], "hydration retry must not create a new storage attempt at revision8");
  await assert.rejects(() => facade.transitionVehicleLocation(f.destination.locationId, f.world.save, { ...f.input, landingPosition: [1, 64, 0] }), /without changes/);
  assert.deepEqual(revisions, [7]);
});

test("checkpoint completion cannot roll back a concurrent confirmed lease renewal", () => {
  const now = Date.now();
  const lease = { id: "world", universeId: "world", owner: "owner", epoch: 1, expiresAt: now + 20_000 };
  const facade = Object.assign(Object.create(UniverseWorldStorage.prototype), {
    active: { lease }, writerConfirmed: true,
  }) as { active: UniverseLoadedWorld; writerAuthorityValid: boolean; acceptLoadedCheckpoint(loaded: UniverseLoadedWorld): void };
  const captured = { lease: { ...lease, expiresAt: now - 1 } } as unknown as UniverseLoadedWorld;
  facade.acceptLoadedCheckpoint(captured);
  assert.equal(facade.active.lease?.expiresAt, lease.expiresAt);
  assert.equal(facade.writerAuthorityValid, true);
  facade.acceptLoadedCheckpoint({ lease: { ...captured.lease!, epoch: 2 } } as UniverseLoadedWorld);
  assert.equal(facade.active.lease?.epoch, 2);
  assert.equal(facade.writerAuthorityValid, false, "a different epoch cannot inherit authority");
});

test("read-only migration retains exact source and compatible normalization for six generator versions", async () => {
  const records = new Map<string, string>();
  const worlds = [2, 9, 11, 12, 17, 18].map((version) => ({ id: `version-${version}`, ownership: "host-device", name: `Version ${version}`, seed: "CF1-READONLY-MIGRATION", mode: "builder", createdAt: 1000, updatedAt: 1000, lastPlayedAt: null, playTimeMs: 123, lastSavedGameVersion: "1.12.0" }));
  const catalogRaw = `  ${JSON.stringify({ version: 1, ownership: "host-device", worlds, legacyMigrated: true, activeWorldId: "version-18" })}\n`;
  records.set(WORLD_CATALOG_KEY, catalogRaw);
  for (const metadata of worlds) records.set(`${WORLD_DATA_PREFIX}${metadata.id}`, ` ${JSON.stringify({ version: 1, metadata, options: normalizeWorldOptions(), save: { ...save(Number(metadata.id.split("-")[1])), futureOptionalMetadata: { note: "preserve", absent: null } } })}\n`);
  const before = [...records];
  // This boundary receives no mutation methods at all.
  const result = await readLegacyUniverseCandidates({ getItem: (key) => records.get(key) ?? null });
  assert.equal(result.issues.length, 0);
  assert.equal(result.candidates.length, 6);
  assert.equal(result.activeId, "version-18");
  for (const candidate of result.candidates) {
    const key = `${WORLD_DATA_PREFIX}${candidate.world.metadata.id}`, raw = records.get(key)!;
    assert.deepEqual(candidate.world.save, migrateLegacyWorldSave(JSON.parse(raw).save));
    assert.equal(candidate.backups.find((backup) => backup.sourceKey === key)?.raw, raw);
    assert.equal(candidate.backups.find((backup) => backup.sourceKey === WORLD_CATALOG_KEY)?.raw, catalogRaw);
    assert.equal(candidate.world.metadata.playTimeMs, 123);
    assert.equal(candidate.world.options.settlementPattern, candidate.sourceGeneratorVersion < 17 ? "legacy-scattered-v1" : "heartlands-v2");
  }
  assert.deepEqual([...records], before);
});

test("single-save migration has a deterministic identity and never duplicates a consumed fallback", async () => {
  const raw = `\n${JSON.stringify(save(2))}  `;
  const read = { getItem: (key: string) => key === LEGACY_WORLD_KEY ? raw : null };
  const first = await readLegacyUniverseCandidates(read), second = await readLegacyUniverseCandidates(read);
  assert.equal(first.candidates.length, 1);
  assert.equal(first.candidates[0].world.metadata.id, second.candidates[0].world.metadata.id);
  assert.equal(first.candidates[0].backups[0].raw, raw);
  const consumed = await readLegacyUniverseCandidates({ getItem: (key) => key === WORLD_CATALOG_KEY ? JSON.stringify({ version: 1, legacyMigrated: true, worlds: [] }) : read.getItem(key) });
  assert.equal(consumed.candidates.length, 0);
});

test("malformed old records are reported without invoking any source write", async () => {
  const result = await readLegacyUniverseCandidates({ getItem: () => "{invalid" });
  assert.equal(result.candidates.length, 0);
  assert.equal(result.issues.length, 2);
});
