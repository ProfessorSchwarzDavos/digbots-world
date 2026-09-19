import assert from "node:assert/strict";
import test from "node:test";
import { BlockId, Item, type InventorySlot } from "../app/game/data.ts";
import { ChunkWorld } from "../app/game/world.ts";
import { VoxelEngine } from "../app/game/engine.ts";
import { BasicWorldRenderer } from "../app/game/basic-world-renderer.ts";
import { validateAgentCustody, type AgentCustodySave } from "../app/game/agent-custody.ts";
import { locationAddress, locationId, type LocationStamp } from "../app/game/location-address.ts";
import { createMapKnowledge, normalizeMapKnowledge } from "../app/game/map-system.ts";
import { LOCATION_TRANSIENT_DEFAULTS, resetLocationTransients, validateLocationPlayerState } from "../app/game/location-manager.ts";

const stamp = (body = "blockwild", epoch = 1): LocationStamp => ({
  locationId: locationId(locationAddress({ universeId: "synthetic-runtime", systemId: "waystar", bodyId: body, kind: "surface", instanceId: "main" })), epoch, revision: 0,
});

test("location lifecycle neutralizes old motion/actions and validates durable rider bindings", () => {
  const state = { ...LOCATION_TRANSIENT_DEFAULTS, fallDistance: 90, fallVelocity: -35, attackCooldown: 12, miningProgress: 1, mineHeld: true };
  resetLocationTransients(state);
  assert.deepEqual(state, LOCATION_TRANSIENT_DEFAULTS);
  const binding = { schema: 1, creativeFlying: false, boatId: "boat-1", creatureId: null, creatureSeat: null };
  assert.deepEqual(validateLocationPlayerState(binding), binding);
  assert.throws(() => validateLocationPlayerState({ ...binding, creatureId: 4 }));
  assert.throws(() => validateLocationPlayerState({ ...binding, boatId: null, creatureSeat: 2 }));
});

test("guest admission checkpoints before releasing a local writer and restores on failure", async () => {
  const calls: string[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    persistent: true, activeWorldId: "guest-local", running: true, paused: false, disposed: false,
    saveNow: async () => { calls.push("commit"); return false; },
    worldStorage: { releaseActive: async () => { calls.push("release"); } },
    disconnectMultiplayer: () => { calls.push("disconnect"); },
    loadStoredWorld: async () => { calls.push("restore"); engine.persistent = true; engine.activeWorldId = "guest-local"; return true; },
  }) as {
    persistent: boolean; activeWorldId: string | null; running: boolean; paused: boolean;
    saveNow(): Promise<boolean>; prepareGuestAdmission(): Promise<() => Promise<void>>;
  };
  await assert.rejects(engine.prepareGuestAdmission(), /checkpoint failed/u);
  assert.deepEqual(calls, ["commit"]);
  assert.equal(engine.persistent, true); assert.equal(engine.running, true); assert.equal(engine.paused, false);
  engine.saveNow = async () => { calls.push("commit"); return true; };
  const restore = await engine.prepareGuestAdmission();
  assert.deepEqual(calls, ["commit", "commit", "release"]);
  assert.equal(engine.persistent, false); assert.equal(engine.running, false); assert.equal(engine.activeWorldId, null);
  await restore();
  assert.deepEqual(calls.slice(-2), ["disconnect", "restore"]);
  assert.equal(engine.persistent, true); assert.equal(engine.running, true); assert.equal(engine.paused, false);
});
type WorldInternals = {
  chunkCacheKey(key: string): string;
  generationNamespace(key: string): string;
  requestPersistentChunk(key: string, x: number, z: number, distance: number): boolean;
  chunkPersistentCache: { supported: boolean; get(key: string): Promise<undefined> };
  pendingPersistentChunks: Set<string>;
  generationQueue: unknown[];
};

test("actual chunk owners isolate same-seed same-coordinate edits and cache keys without changing generation", () => {
  const world = new ChunkWorld(), internals = world as unknown as WorldInternals;
  try {
    world.reset("CF1-RUNTIME", undefined, undefined, undefined, stamp());
    const first = world.generateChunk(-1, 0), baseline = first.blocks.slice();
    world.setBlock(-2, 60, 3, BlockId.GoldOre, true, true);
    const edits = world.serializeEdits(), firstKey = internals.chunkCacheKey("-1,0"), oldNamespace = internals.generationNamespace("-1,0");
    world.reset("CF1-RUNTIME", undefined, undefined, undefined, stamp("morrow"));
    const second = world.generateChunk(-1, 0);
    assert.deepEqual(second.blocks, baseline, "location identity does not alter the captured home generator");
    assert.notEqual(internals.chunkCacheKey("-1,0"), firstKey);
    assert.deepEqual(world.serializeEdits(), {});
    world.reset("CF1-RUNTIME", edits, undefined, undefined, stamp());
    world.generateChunk(-1, 0);
    assert.equal(world.getBlock(-2, 60, 3), BlockId.GoldOre);
    assert.equal(internals.chunkCacheKey("-1,0"), firstKey);
    assert.notEqual(internals.generationNamespace("-1,0"), oldNamespace, "A-B-A cannot revive an earlier callback");
  } finally { world.dispose(); }
});

test("late persistent-cache results cannot consume a new owner's pending work even on A-B-A", async () => {
  const world = new ChunkWorld(), internals = world as unknown as WorldInternals;
  const resolvers: Array<(value: undefined) => void> = [];
  internals.chunkPersistentCache = { supported: true, get: () => new Promise((resolve) => { resolvers.push(resolve); }) };
  try {
    world.reset("CF1-LATE", undefined, undefined, undefined, stamp());
    internals.requestPersistentChunk("0,0", 0, 0, 0);
    world.reset("CF1-LATE", undefined, undefined, undefined, stamp("morrow"));
    world.reset("CF1-LATE", undefined, undefined, undefined, stamp());
    internals.requestPersistentChunk("0,0", 0, 0, 0);
    const key = internals.chunkCacheKey("0,0");
    resolvers[0](undefined); await Promise.resolve(); await Promise.resolve();
    assert.equal(internals.pendingPersistentChunks.has(key), true);
    assert.equal(internals.generationQueue.length, 0);
    resolvers[1](undefined); await Promise.resolve(); await Promise.resolve();
    assert.equal(internals.pendingPersistentChunks.has(key), false);
  } finally { world.dispose(); }
});

test("map owners retain the entire canonical identity and reject malformed location IDs", () => {
  const longId = "universe-" + "x".repeat(130);
  const owner = (body: string) => `location:${locationId(locationAddress({ universeId: longId, systemId: "waystar", bodyId: body, kind: "surface", instanceId: "main" }))}`;
  const a = createMapKnowledge(owner("blockwild"), "player"), b = createMapKnowledge(owner("morrow"), "player");
  assert.equal(a.worldId, owner("blockwild"));
  assert.equal(normalizeMapKnowledge(a).worldId, a.worldId);
  assert.notEqual(a.worldId, b.worldId);
  assert.throws(() => createMapKnowledge("location:broken", "player"));
});

test("Basic renderer releases the previous location's installed mesh before accepting another owner", () => {
  const world = new ChunkWorld(), renderer = new BasicWorldRenderer(false);
  const update = (now: number) => renderer.update({ world, seedText: world.seedText, generationOptions: world.generationOptions,
    x: 0, y: 48, z: 0, fullDistance: 2, basicDistance: 3, caveBlend: 0, framePressure: false, enabled: true, now });
  try {
    world.reset("CF1-BASIC", undefined, undefined, undefined, stamp()); update(1000);
    const oldMesh = renderer.group.children[0];
    assert.ok(oldMesh);
    world.reset("CF1-BASIC", undefined, undefined, undefined, stamp("morrow")); update(2000);
    assert.ok(renderer.group.children[0]);
    assert.notEqual(renderer.group.children[0], oldMesh);
    assert.equal(oldMesh.parent, null);
    assert.equal(renderer.stats().drawCalls <= 2, true);
    renderer.resetLocation(); assert.equal(renderer.group.children.length, 0);
    assert.equal(renderer.stats().bytes, 0);
  } finally { renderer.dispose(); world.dispose(); }
});

test("drone build cancellation and checkpoints conserve reservations without a connected pose", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.persistent = false;
  engine.agentInventories = new Map([["drone-1", [{ item: Item.Berry, count: 64 }]]]);
  engine.agentInventoryRevisions = new Map([["drone-1", 2]]);
  engine.agentReturningMaterials = new Map();
  engine.agentBuildJobs = new Map([["drone-1", { preview: { agentId: "drone-1" }, reserved: new Map([[BlockId.Stone, 27]]) } as never]]);
  engine.agentBuildPreviews = new Map(); engine.agentBuildPreviewVisuals = new Map(); engine.agentWorkFeedback = [];
  const internal = engine as unknown as { serializeAgentCustody(): AgentCustodySave; clearAgentWorkRuntime(): void };
  const before = internal.serializeAgentCustody();
  assert.deepEqual(before.agents["drone-1"].returning, [{ item: BlockId.Stone, count: 27 }]);
  internal.clearAgentWorkRuntime();
  assert.deepEqual(internal.serializeAgentCustody(), before, "overflow stays durable, not dropped at a missing pose");
  internal.clearAgentWorkRuntime();
  assert.deepEqual(internal.serializeAgentCustody(), before, "repeat cancellation does not duplicate material");
  const detached = validateAgentCustody(before);
  (engine.agentInventories.get("drone-1")![0] as InventorySlot).count = 1;
  assert.equal(detached.agents["drone-1"].inventory[0]?.count, 64);
  assert.throws(() => validateAgentCustody({ schema: 2, agents: {} }));
  assert.throws(() => validateAgentCustody({ schema: 1, agents: { bad: { inventory: [], revision: 0, returning: [{ item: BlockId.Stone, count: -1 }] } } }));
});
