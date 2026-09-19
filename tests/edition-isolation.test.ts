import assert from "node:assert/strict";
import { homeLocation, locationId, universeId } from "../app/game/location-address.ts";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { WorldSave } from "../app/game/engine.ts";
import { readSettings, SAVE_KEY, SETTINGS_KEY } from "../app/game/engine.ts";
import {
  CHARACTER_BROWSER_ID_KEY,
  CHARACTER_PROFILE_STORAGE_KEY,
  CharacterProfileStore,
} from "../app/game/character-profiles.ts";
import {
  TYPESCRIPT_AGENT_ID_KEY,
  TYPESCRIPT_MULTIPLAYER_PLAYER_ID_KEY,
  TYPESCRIPT_MULTIPLAYER_PROTOCOL,
  TYPESCRIPT_RENDEZVOUS_APP_ID,
  TYPESCRIPT_SETTINGS_KEY,
  TYPESCRIPT_STORAGE_PREFIX,
  TYPESCRIPT_TERRAIN_CACHE_DATABASE,
  TYPESCRIPT_UI_PREFERENCES_KEY,
} from "../app/game/edition.ts";
import {
  MULTIPLAYER_PROTOCOL_NAME,
  MULTIPLAYER_PROTOCOL_VERSION,
  MultiplayerProtocolError,
  decodeInviteCode,
  encodeInviteCode,
  validateManualSignal,
  type ManualSignal,
} from "../app/game/multiplayer.ts";
import { GENERATOR_VERSION } from "../app/game/world.ts";
import {
  LEGACY_WORLD_KEY,
  WORLD_CATALOG_KEY,
  WORLD_DATA_PREFIX,
  WorldStorage,
} from "../app/game/world-storage.ts";

const TYPESCRIPT_KEYS = Object.freeze({
  world: "blockwild-typescript-world-v2",
  catalog: "blockwild-typescript-world-catalog-v1",
  worldData: "blockwild-typescript-world-data-v1:",
  settings: "blockwild-typescript-settings-v2",
  ui: "blockwild-typescript-ui-preferences-v1",
  profiles: "blockwild-typescript-character-profiles-v1",
  browserPlayer: "blockwild-typescript-browser-player-id-v1",
  multiplayerPlayer: "blockwild-typescript-multiplayer-player-id",
  agent: "blockwild-typescript-agent-id",
  terrainCache: "blockwild-typescript-terrain-cache-v2",
  rendezvous: "blockwild-typescript-multiplayer-v1",
  protocol: "blockwild-typescript-webrtc",
} as const);

const GENERIC_SENTINELS = new Map<string, string>([
  ["blockwild-world-v2", "generic-world-sentinel"],
  ["blockwild-world-catalog-v1", "generic-catalog-sentinel"],
  ["blockwild-world-data-v1:foreign-world", "generic-world-data-sentinel"],
  ["blockwild-settings-v2", "generic-settings-sentinel"],
  ["blockwild-ui-preferences-v1", "generic-ui-sentinel"],
  ["blockwild-character-profiles-v1", "generic-profile-sentinel"],
  ["blockwild-browser-player-id-v1", "generic-browser-player-sentinel"],
  ["blockwild-multiplayer-player-id", "generic-multiplayer-player-sentinel"],
  ["blockwild-player-variant", "generic-player-variant-sentinel"],
  ["blockwild-agent-id", "generic-agent-sentinel"],
]);

class TrackingStorage implements Storage {
  readonly values: Map<string, string>;
  readonly reads: string[] = [];
  readonly writes: string[] = [];
  readonly removals: string[] = [];
  clearCalls = 0;

  constructor(initial: ReadonlyMap<string, string> = new Map()) {
    this.values = new Map(initial);
  }

  get length() { return this.values.size; }
  clear() { this.clearCalls += 1; this.values.clear(); }
  getItem(key: string) { this.reads.push(key); return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.removals.push(key); this.values.delete(key); }
  setItem(key: string, value: string) { this.writes.push(key); this.values.set(key, String(value)); }
}

function assertGenericSentinelsUntouched(storage: TrackingStorage) {
  assert.equal(storage.clearCalls, 0, "normal startup must not clear shared browser storage");
  for (const [key, value] of GENERIC_SENTINELS) {
    assert.equal(storage.values.get(key), value, `${key} must retain the other edition's bytes`);
    assert.equal(storage.reads.includes(key), false, `${key} must not be read during TypeScript startup`);
    assert.equal(storage.writes.includes(key), false, `${key} must not be overwritten by TypeScript`);
    assert.equal(storage.removals.includes(key), false, `${key} must not be removed by TypeScript`);
  }
}

function worldSave(seed: string): WorldSave {
  return {
    version: 2,
    generatorVersion: GENERATOR_VERSION,
    seed,
    mode: "survival",
    edits: {},
    player: { x: 1, y: 50, z: -2, yaw: 0.3, pitch: -0.1 },
    spawn: { x: 0, y: 48, z: 0 },
    inventory: [],
    selected: 0,
    health: 10,
    hunger: 10,
    xp: 0,
    level: 0,
    time: 0.32,
    day: 1,
    weather: "clear",
    furnaces: {},
    chests: {},
    savedAt: 900,
  };
}

function withBrowserStorage<T>(storage: Storage, run: () => T): T {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage,
      matchMedia: () => ({ matches: false }),
    },
  });
  try {
    return run();
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function unsafeInviteCode(value: unknown) {
  return `BW1.${Buffer.from(JSON.stringify(value), "utf8").toString("base64url")}`;
}

test("TypeScript edition owns explicit storage, cache, rendezvous, and protocol namespaces", () => {
  assert.equal(SAVE_KEY, TYPESCRIPT_KEYS.world);
  assert.equal(LEGACY_WORLD_KEY, TYPESCRIPT_KEYS.world);
  assert.equal(WORLD_CATALOG_KEY, TYPESCRIPT_KEYS.catalog);
  assert.equal(WORLD_DATA_PREFIX, TYPESCRIPT_KEYS.worldData);
  assert.equal(SETTINGS_KEY, TYPESCRIPT_KEYS.settings);
  assert.equal(CHARACTER_PROFILE_STORAGE_KEY, TYPESCRIPT_KEYS.profiles);
  assert.equal(CHARACTER_BROWSER_ID_KEY, TYPESCRIPT_KEYS.browserPlayer);
  assert.equal(TYPESCRIPT_STORAGE_PREFIX, "blockwild-typescript");
  assert.equal(TYPESCRIPT_SETTINGS_KEY, TYPESCRIPT_KEYS.settings);
  assert.equal(TYPESCRIPT_UI_PREFERENCES_KEY, TYPESCRIPT_KEYS.ui);
  assert.equal(TYPESCRIPT_AGENT_ID_KEY, TYPESCRIPT_KEYS.agent);
  assert.equal(TYPESCRIPT_MULTIPLAYER_PLAYER_ID_KEY, TYPESCRIPT_KEYS.multiplayerPlayer);
  assert.equal(TYPESCRIPT_TERRAIN_CACHE_DATABASE, TYPESCRIPT_KEYS.terrainCache);
  assert.equal(TYPESCRIPT_RENDEZVOUS_APP_ID, TYPESCRIPT_KEYS.rendezvous);
  assert.equal(TYPESCRIPT_MULTIPLAYER_PROTOCOL, TYPESCRIPT_KEYS.protocol);
  assert.equal(MULTIPLAYER_PROTOCOL_NAME, TYPESCRIPT_KEYS.protocol);

  const voxelGame = source("../app/game/VoxelGame.tsx");
  const engine = source("../app/game/engine.ts");
  const chunkCache = source("../app/game/chunk-cache.ts");
  const rendezvous = source("../app/game/invite-rendezvous.ts");
  assert.match(voxelGame, /const UI_PREFERENCES_KEY = TYPESCRIPT_UI_PREFERENCES_KEY;/u);
  assert.doesNotMatch(voxelGame, /["']blockwild-player-variant["']/u);
  assert.match(engine, /const storageKey = TYPESCRIPT_AGENT_ID_KEY;/u);
  assert.match(engine, /const storageKey = TYPESCRIPT_MULTIPLAYER_PLAYER_ID_KEY;/u);
  assert.match(chunkCache, /indexedDB\.open\(TYPESCRIPT_TERRAIN_CACHE_DATABASE, 1\)/u);
  assert.match(rendezvous, /export const RENDEZVOUS_APP_ID = TYPESCRIPT_RENDEZVOUS_APP_ID;/u);
});

test("WorldStorage writes and reloads only TypeScript-edition world keys", () => {
  const storage = new TrackingStorage(GENERIC_SENTINELS);
  const worlds = new WorldStorage(storage, { now: () => 2_000, idFactory: () => "edition-world" });
  const created = worlds.createWorld({ name: "TypeScript World", save: worldSave("TS-EDITION") });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  assert.equal(storage.writes.includes(TYPESCRIPT_KEYS.catalog), true);
  assert.equal(storage.writes.includes(`${TYPESCRIPT_KEYS.worldData}${created.value.id}`), true);
  const reopened = new WorldStorage(storage, { now: () => 3_000, idFactory: () => "unused" });
  const loaded = reopened.loadWorld(created.value.id, false);
  assert.equal(loaded.ok, true);
  assert.equal(loaded.ok && loaded.value.save.seed, "TS-EDITION");
  assertGenericSentinelsUntouched(storage);
  worlds.dispose();
  reopened.dispose();
});

test("unsupported previous-edition imports fail without mutating TypeScript or generic storage", () => {
  const storage = new TrackingStorage(GENERIC_SENTINELS);
  const worlds = new WorldStorage(storage, { now: () => 2_000, idFactory: () => "unused" });
  const before = [...storage.values.entries()];
  const unsupported = worlds.importWorld(JSON.stringify({
    format: "blockwild-world",
    version: 999,
    world: { version: 999 },
  }));

  assert.equal(unsupported.ok, false);
  assert.deepEqual([...storage.values.entries()], before);
  assert.equal(storage.writes.length, 0);
  assert.equal(storage.removals.length, 0);
  assertGenericSentinelsUntouched(storage);
  worlds.dispose();
});

test("character profiles write and reload only TypeScript-edition player keys", () => {
  const storage = new TrackingStorage(new Map([
    ...GENERIC_SENTINELS,
    [TYPESCRIPT_KEYS.browserPlayer, "browser_typescript_0001"],
  ]));
  const first = new CharacterProfileStore(storage, () => 100);
  assert.equal(first.catalog.browserId, "browser_typescript_0001");
  const created = first.create({ name: "Edition Keeper" });
  assert.ok(created);

  assert.equal(storage.values.get(TYPESCRIPT_KEYS.browserPlayer), "browser_typescript_0001");
  assert.equal(storage.writes.includes(TYPESCRIPT_KEYS.profiles), true);
  const reopened = new CharacterProfileStore(storage, () => 200);
  assert.equal(reopened.selectedProfile.id, created!.id);
  assert.equal(reopened.selectedProfile.name, "Edition Keeper");
  assertGenericSentinelsUntouched(storage);
});

test("readSettings ignores generic settings and reads the TypeScript-edition record", () => {
  const storage = new TrackingStorage(new Map([
    ...GENERIC_SENTINELS,
    [TYPESCRIPT_KEYS.settings, JSON.stringify({ muted: true, volume: 0.21, fov: 83 })],
  ]));
  const settings = withBrowserStorage(storage, () => readSettings());
  assert.equal(settings.muted, true);
  assert.equal(settings.volume, 0.21);
  assert.equal(settings.fov, 83);
  assertGenericSentinelsUntouched(storage);
});

test("manual signaling accepts TypeScript peers and rejects generic or Rust peers before payload inspection", () => {
  const sameEdition: ManualSignal = {
    version: MULTIPLAYER_PROTOCOL_VERSION,
    scope: { locationId: locationId(homeLocation(universeId("edition-test"))), epoch: 1, revision: 0 },
    protocol: MULTIPLAYER_PROTOCOL_NAME,
    kind: "offer",
    sessionId: "session_typescript_01",
    token: "invite_typescript_01",
    identity: { id: "player_typescript_01", name: "TypeScript", color: "#44aaee" },
    description: { type: "offer", sdp: "v=0\r\na=fingerprint:sha-256 typescript" },
  };
  assert.equal(validateManualSignal(sameEdition), true);
  assert.deepEqual(decodeInviteCode(encodeInviteCode(sameEdition)), sameEdition);

  for (const protocol of ["blockwild-webrtc", "blockwild-rust-webrtc"]) {
    let inspectedPayload = false;
    const foreignSignal = {
      version: MULTIPLAYER_PROTOCOL_VERSION,
      protocol,
      get kind() { inspectedPayload = true; throw new Error("foreign payload was inspected"); },
    };
    assert.equal(validateManualSignal(foreignSignal), false);
    assert.equal(inspectedPayload, false, `${protocol} must be rejected at the edition boundary`);
    assert.throws(
      () => decodeInviteCode(unsafeInviteCode({ ...sameEdition, protocol })),
      MultiplayerProtocolError,
    );
  }
});
