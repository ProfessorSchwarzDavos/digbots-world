import assert from "node:assert/strict";
import test from "node:test";
import { VoxelEngine } from "../app/game/engine";
import { BlockId } from "../app/game/data";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, rebaseAsteroidCell } from "../app/game/asteroid-attachment-frame";
import { createAsteroidAttachmentWorld } from "../app/game/asteroid-attachment-world";
import { createCelestialTerrain } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { canonicalJson } from "../app/game/universe-json";
import type { ChunkEditSave } from "../app/game/world";

function fixture() {
  const orbit = locationAddress({ ...homeLocation(universeId("runtime-world-source")), kind: "orbit", instanceId: "low" });
  const registry = createAsteroidRegistry(orbit, 953), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
  const cell = rebaseAsteroidCell(frame, "0,32,0", "local"), [x, y, z] = cell.split(",").map(Number);
  const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
  const edits: ChunkEditSave = { [`${cx},${cz}`]: [[(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, BlockId.Air]] };
  const stamp = { locationId: locationId(orbit), epoch: 3, revision: 7 };
  const engine = Object.assign(Object.create(VoxelEngine.prototype), { multiplayer: null,
    worldStorage: { currentStamp: stamp }, asteroidFields: { schema: 1, fields: { [stamp.locationId]: registry } },
    world: { locationScope: stamp, celestialTerrain: createCelestialTerrain({ location: orbit, seed: 953 }),
      serializeEdits: () => structuredClone(edits), serializeBlockFacings: () => ({}),
      getBlock: () => { throw Error("must not depend on loaded chunks"); } },
    serialize: () => { throw Error("must not mutate registry through serializer"); },
    saveSoon: () => { throw Error("source inspection must not save"); },
  }) as VoxelEngine;
  return { engine, edits, cell, stamp, registry };
}

test("actual engine proposes current finite edits without mutating live pages, clocks, storage or chunks", () => {
  const { engine, cell, registry } = fixture(), original = engine.asteroidFields, before = canonicalJson(original);
  const now = Date.now; Date.now = () => { throw Error("snapshot must not read clock"); };
  let snapshot: ReturnType<VoxelEngine["snapshotAttachmentWorldSource"]>;
  try { snapshot = engine.snapshotAttachmentWorldSource(); } finally { Date.now = now; }
  assert.equal(engine.asteroidFields, original); assert.equal(canonicalJson(original), before);
  assert.deepEqual(snapshot.originalRegistry, registry); assert(Object.isFrozen(snapshot.world));
  assert.equal(createAsteroidAttachmentWorld(snapshot.world).block(cell), BlockId.Air);
  assert.notEqual(canonicalJson(snapshot.world.registry), canonicalJson(registry), "Live mining only enters the detached proposal");
  assert.deepEqual(snapshot.stamp, engine.worldStorage.currentStamp);
});

test("actual engine refuses guests, disconnected hosts, stale scopes, missing owners and unsupported terrain", () => {
  for (const fault of ["guest", "disconnected", "scope", "missing", "terrain", "generator"] as const) {
    const { engine, stamp } = fixture(), before = canonicalJson(engine.asteroidFields);
    if (fault === "guest" || fault === "disconnected") Object.assign(engine, { multiplayer: { role: fault === "guest" ? "guest" : "host", state: "disconnected" } });
    if (fault === "scope") Object.assign(engine.world, { locationScope: { ...stamp, revision: 8 } });
    if (fault === "missing") engine.asteroidFields = { schema: 1, fields: {} };
    if (fault === "terrain") Object.assign(engine.world, { celestialTerrain: null });
    if (fault === "generator") Object.assign(engine.world, { celestialTerrain: { ...engine.world.celestialTerrain, version: 999 } });
    const expected = fault === "missing" ? canonicalJson(engine.asteroidFields) : before;
    assert.throws(() => engine.snapshotAttachmentWorldSource());
    assert.equal(canonicalJson(engine.asteroidFields), expected);
  }
});

test("exact snapshots detect direct edit changes even when persistence and scope revisions stay equal", () => {
  const { engine, edits } = fixture(), first = engine.snapshotAttachmentWorldSource();
  const values = Object.values(edits)[0]; values[0][1] = BlockId.ReinforcedWindow;
  const second = engine.snapshotAttachmentWorldSource();
  assert.deepEqual(first.stamp, second.stamp);
  assert.notEqual(canonicalJson(first), canonicalJson(second));
  assert.deepEqual(first.originalRegistry, second.originalRegistry);
});
