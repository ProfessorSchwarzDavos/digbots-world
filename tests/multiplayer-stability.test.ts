import assert from "node:assert/strict";
import { homeLocation, locationId, universeId } from "../app/game/location-address";
import test from "node:test";
import * as THREE from "three";
import { BlockId, Item } from "../app/game/data.ts";
import { createGoldWallet, createMerchant } from "../app/game/economy.ts";
import { commerceItemCode } from "../app/game/hearthroads-adapter.ts";
import {
  VoxelEngine,
  blockEditIntersectsPlayer,
  consumeMultiplayerPlacementItem,
  decodePlayerProgressionChunks,
  encodePlayerProgressionChunks,
  markRendererContextLost,
  multiplayerBreakDropPlan,
  multiplayerContainerTransactionConservesItems,
  multiplayerNaturalMobCap,
  multiplayerPlayerStateSignature,
  nearestSimulationInterest,
  normalizeMultiplayerPlayerProgression,
  normalizeMultiplayerPlayerState,
  restoreRendererContext,
  selectSimulationInterest,
  shouldShowIncorrectToolFeedback,
} from "../app/game/engine.ts";
import { createSkillState } from "../app/game/skills.ts";
import { createMapKnowledge } from "../app/game/map-system.ts";
import { createQuestBook, normalizeQuestBook, type QuestDefinition } from "../app/game/quests.ts";
import { MOB_DEFS } from "../app/game/mobs.ts";
import { createPeelopState } from "../app/game/peelop.ts";
import { createReedstriderBond } from "../app/game/ecology.ts";
import { createEmptyApiaryBlock } from "../app/game/apiary.ts";
import { createDragonState } from "../app/game/dragons.ts";
import { createPeerIdentity, validatePayload, validatePeerIdentity, type ContainerAction, type CreatureAction, type DropSnapshotEntry, type InventoryAction, type PlayerProgressionSnapshot, type PlayerSessionSnapshot } from "../app/game/multiplayer.ts";

function sessionState(): PlayerSessionSnapshot {
  const inventory = Array.from({ length: 36 }, () => null) as PlayerSessionSnapshot["inventory"];
  inventory[0] = { item: Item.Apple, count: 1, metadata: { provenance: { orchard: "host-world", pickedDay: 4 } } };
  return {
    playerId: "player_stable_guest_001",
    revision: 7,
    variant: "female",
    inventory,
    equipment: { head: null, chest: null, legs: null, feet: null },
    selected: 0,
    health: 8,
    hunger: 9,
    xp: 12,
    level: 2,
    skills: createSkillState(),
  };
}

test("host-owned player snapshots preserve variant, metadata inventory, and skills", () => {
  const state = sessionState();
  assert.equal(validatePeerIdentity({ id: state.playerId, name: "Guest", color: "#8855cc", variant: "female" }), true);
  assert.equal(validatePayload("player-state", {
    requestId: "state_request_001",
    actorId: state.playerId,
    state,
    status: "request",
  }), true);
  const normalized = normalizeMultiplayerPlayerState(state, state.playerId);
  assert.equal(normalized.variant, "female");
  assert.deepEqual(normalized.inventory[0]?.metadata, state.inventory[0]?.metadata);
  assert.deepEqual(normalized.skills, state.skills);
  assert.equal("progression" in normalized, false, "hot player-state packets must never carry the explored map or journal");
});

test("large character progression is chunked off the hot state lane and round-trips active side quests", () => {
  const playerId = "player_stable_guest_001";
  const sideQuest: QuestDefinition = {
    id: "side:keeper:active",
    questlineId: "side:keeper",
    kind: "side",
    name: "A Lantern Returned",
    summary: "Bring the lantern home.",
    objectives: [{ id: "return-lantern", label: "Return the lantern", kind: "custom", eventId: "lantern-returned", count: 1 }],
    rewards: { gold: 12, items: [], blueprints: [], factionAlignment: {} },
    abandonable: true,
  };
  const questBook = normalizeQuestBook({
    ...createQuestBook(),
    active: [{ questId: sideQuest.id, status: "active", acceptedAt: 4, giverEntityId: "keeper", objectiveProgress: {} }],
    pinnedQuestIds: [sideQuest.id],
  });
  const exploredChunks = Array.from({ length: 65_536 }, (_, index) => `${index % 256},${Math.floor(index / 256)}`);
  const mapKnowledge = { ...createMapKnowledge("host-world", playerId), revision: 65_536, exploredChunks };
  const progression = normalizeMultiplayerPlayerProgression({
    questBook,
    sideQuestDefinitions: [sideQuest],
    mapKnowledge,
    bestiary: {},
    plantBestiary: { schema: 1, discovered: [] },
    blueprints: { schema: 1, unlocked: [] },
    magicState: { schema: 1, attuned: false, mana: 0, maxMana: 0, knownSpellIds: [], favoriteSpellIds: [] },
    potionBuffs: {},
    rangedLoaded: {},
    respawn: { x: 14, y: 72, z: -9 },
  } as unknown as PlayerProgressionSnapshot, playerId);
  const chunks = encodePlayerProgressionChunks(progression);
  assert.ok(chunks.length > 1, "a maximal explored map must use several bounded messages");
  chunks.forEach((data, chunkIndex) => {
    assert.ok(data.length <= 180_000);
    assert.equal(validatePayload("player-progress", {
      transferId: "progress_transfer_001", actorId: playerId, revision: 8,
      chunkIndex, chunkCount: chunks.length, data, status: "request",
    }), true);
  });
  const restored = decodePlayerProgressionChunks(chunks, playerId);
  assert.equal(restored.mapKnowledge.exploredChunks.length, 65_536);
  assert.equal(restored.questBook.active[0]?.questId, sideQuest.id);
  assert.equal(restored.sideQuestDefinitions[0]?.id, sideQuest.id);
  assert.deepEqual(restored.respawn, { x: 14, y: 72, z: -9 });
  assert.ok(JSON.stringify(sessionState()).length < 256 * 1024);
});

test("host reassembles and persists a reconnecting guest's quest progression by stable identity", () => {
  const playerId = sessionState().playerId;
  const progression = normalizeMultiplayerPlayerProgression({
    questBook: normalizeQuestBook({ ...createQuestBook(), completed: ["main-first-dawn"] }),
    sideQuestDefinitions: [], mapKnowledge: createMapKnowledge("host-world", playerId), bestiary: {},
    plantBestiary: { schema: 1, discovered: [] }, blueprints: { schema: 1, unlocked: [] },
    magicState: { schema: 1, attuned: false, mana: 0, maxMana: 0, knownSpellIds: [], favoriteSpellIds: [] },
    potionBuffs: {}, rangedLoaded: {}, respawn: { x: 4, y: 71, z: 8 },
  } as unknown as PlayerProgressionSnapshot, playerId);
  const chunks = encodePlayerProgressionChunks(progression, 1_024);
  const acknowledgements: unknown[] = [];
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine & Record<string, unknown>;
  Object.assign(engine, {
    multiplayer: { role: "host", sendPlayerProgress: (action: unknown) => { acknowledgements.push(action); return 1; } },
    world: { locationScope: { locationId: locationId(homeLocation(universeId("progression-test"))), epoch: 1, revision: 0 } },
    multiplayerPlayerProgressions: new Map(), multiplayerProgressTransfers: new Map(),
    multiplayerProgressOutgoing: [], saveSoon: () => undefined,
  });
  const peer = { identity: { id: playerId, name: "Guest", color: "#8855cc", browserId: "browser-guest" } };
  chunks.forEach((data, chunkIndex) => {
    (engine as unknown as { handleRemotePlayerProgress(action: unknown, peer: unknown): void }).handleRemotePlayerProgress({
      transferId: "quest-rejoin-transfer", actorId: playerId, revision: 1,
      chunkIndex, chunkCount: chunks.length, data, status: "request",
    }, peer);
  });
  const stored = (engine as unknown as { multiplayerPlayerProgressions: Map<string, { revision: number; state: PlayerProgressionSnapshot }> })
    .multiplayerPlayerProgressions.get(playerId);
  assert.equal(stored?.revision, 1);
  assert.deepEqual(stored?.state.questBook.completed, ["main-first-dawn"]);
  assert.deepEqual(stored?.state.respawn, { x: 4, y: 71, z: 8 });
  assert.equal(acknowledgements.length, 1);
});

test("incomplete progression transfers expire and stay capped per character", () => {
  const playerId = sessionState().playerId;
  const now = Date.now();
  const pending = (id: string, receivedAt: number) => ({
    actorId: playerId, revision: 1, chunkCount: 2, chunks: ["e30=", null], receivedAt, status: "request" as const,
  });
  const transfers = new Map([
    [`request:${playerId}:expired`, pending("expired", now - 31_000)],
    [`request:${playerId}:one`, pending("one", now - 20)],
    [`request:${playerId}:two`, pending("two", now - 10)],
  ]);
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine & Record<string, unknown>;
  Object.assign(engine, {
    multiplayer: { role: "host", sendPlayerProgress: () => 1 },
    multiplayerPlayerProgressions: new Map(), multiplayerProgressTransfers: transfers,
    multiplayerProgressOutgoing: [],
  });
  const peer = { identity: { id: playerId, name: "Guest", color: "#8855cc" } };
  (engine as unknown as { handleRemotePlayerProgress(action: unknown, peer: unknown): void }).handleRemotePlayerProgress({
    transferId: "three", actorId: playerId, revision: 1, chunkIndex: 0, chunkCount: 2, data: "e30=", status: "request",
  }, peer);
  assert.equal([...transfers.keys()].some((key) => key.endsWith(":expired")), false);
  assert.equal([...transfers.values()].filter((transfer) => transfer.actorId === playerId).length, 2);
});

test("a forced initial title-join image restores vitals before separate progression arrives", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine & Record<string, unknown>;
  Object.assign(engine, {
    multiplayerPlayerStateRevision: 41,
    multiplayerPlayerStateSignature: "old-world",
    inventory: Array.from({ length: 36 }, () => null), cursor: null,
    equipment: { head: null, chest: null, legs: null, feet: null }, offhand: null,
    selected: 0, health: 0, hunger: 0, xp: 0, level: 0, skillState: createSkillState(),
    playerVariant: "male", multiplayer: null, activeNetworkFacilityId: null,
    localPlayerModel: { setAppearance: () => undefined }, emitHud: () => undefined,
  });
  (engine as unknown as { applyLocalPlayerSessionSnapshot(state: PlayerSessionSnapshot, preserve: boolean, force: boolean): void })
    .applyLocalPlayerSessionSnapshot({ ...sessionState(), revision: 2, health: 7, hunger: 6 }, false, true);
  assert.equal(engine.health, 7);
  assert.equal(engine.hunger, 6);
  assert.equal((engine as unknown as { multiplayerPlayerStateRevision: number }).multiplayerPlayerStateRevision, 2);
});

test("guest multi-block breaks yield one canonical pickup from either half", () => {
  const bed = multiplayerBreakDropPlan([
    { type: BlockId.BedNorthFoot, x: 1, y: 70, z: 1 },
    { type: BlockId.BedNorthHead, x: 1, y: 70, z: 0 },
  ]);
  assert.deepEqual(bed.map((drop) => drop.item), [Item.WildwoodBed]);
  const door = multiplayerBreakDropPlan([
    { type: BlockId.DoorClosedLower, x: 2, y: 70, z: 2 },
    { type: BlockId.DoorClosedUpper, x: 2, y: 71, z: 2 },
  ]);
  assert.deepEqual(door.map((drop) => drop.item), [Item.WildwoodDoor]);
  const grass = multiplayerBreakDropPlan([
    { type: BlockId.DoubleTallGrassUpper, x: 3, y: 71, z: 3 },
    { type: BlockId.DoubleTallGrassLower, x: 3, y: 70, z: 3 },
  ]);
  assert.equal(grass.length, 1);
  assert.equal(multiplayerBreakDropPlan([
    { type: BlockId.Planks, x: 0, y: 70, z: 0 },
    { type: BlockId.Cobblestone, x: 1, y: 70, z: 0 },
  ]).length, 2);
});

test("host teardown releases guest-broken chest and furnace contents exactly once", () => {
  const drops: Array<{ item: number; count: number }> = [];
  const furnaceKey = "1,70,1";
  const chestKey = "2,70,2";
  const chest = Array.from({ length: 27 }, () => null) as Array<null | { item: number; count: number }>;
  chest[0] = { item: Item.Stick, count: 5 };
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    mode: "survival",
    furnaces: new Map([[furnaceKey, { input: { item: Item.Apple, count: 2 }, fuel: null, output: null }]]),
    chests: new Map([[chestKey, chest]]),
    unregisterWaygridBlock: () => undefined,
    chestStorageKey: (key: string) => key,
    generateChestLoot: () => [],
    spawnDrop: (item: number, count: number) => { drops.push({ item, count }); },
  });
  engine.teardownBrokenBlockState(BlockId.Furnace, 1, 70, 1);
  engine.teardownBrokenBlockState(BlockId.Chest, 2, 70, 2);
  assert.equal(engine.furnaces.has(furnaceKey), false);
  assert.equal(engine.chests.has(chestKey), false);
  assert.deepEqual(drops, [{ item: Item.Apple, count: 2 }, { item: Item.Stick, count: 5 }]);
});

test("graceful guest disconnect flushes dirty progression before closing transport", () => {
  const calls: string[] = [];
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    multiplayer: { role: "guest", dispose: () => calls.push("dispose") },
    hostRendezvous: null,
    multiplayerProgressionReceived: true,
    syncMultiplayerPlayerProgression: () => calls.push("sync"),
    flushPlayerProgressionTransfers: (limit: number) => calls.push(`flush:${limit}`),
    removeAllRemotePlayers: () => undefined,
    sleepVotes: new Map(),
    multiplayerContainerAwaiting: new Set(),
    pendingGuestPlacementRequests: new Map(),
    multiplayerPeerActiveContainers: new Map(),
    multiplayerPeerContainerSignatures: new Map(),
    multiplayerFacilityPlayerBaseline: null,
    pendingReliableRequests: new Map(),
    multiplayerProgressTransfers: new Map(),
    multiplayerProgressOutgoing: [],
    multiplayerBoatInputs: new Map(),
    titleMode: true,
    disposed: false,
    emitHud: () => undefined,
    events: { onToast: () => undefined },
  });
  engine.disconnectMultiplayer();
  assert.deepEqual(calls, ["sync", "flush:512", "dispose"]);
});

test("boat lifecycle requests are bounded host-authoritative intents", () => {
  const actorId = sessionState().playerId;
  assert.equal(validatePayload("boat-action", {
    requestId: "boat_launch_001", actorId, tick: 5, kind: "launch", x: 1, y: 63.58, z: 2, yaw: 0, status: "request",
  }), true);
  assert.equal(validatePayload("boat-action", {
    requestId: "boat_board_001", actorId, tick: 6, kind: "board", boatId: "wayfarer-1", status: "request",
  }), true);
  assert.equal(validatePayload("boat-action", {
    requestId: "boat_bad_001", actorId, tick: 6, kind: "board", boatId: "wayfarer-1", x: Number.POSITIVE_INFINITY, status: "request",
  }), false);
});

test("host simulation integrates fresh seat-zero guest helm input and expires stale controls", () => {
  const boat = {
    save: { id: "wayfarer-guest", x: 0, y: 63.58, z: 0, yaw: 0, velocity: 0, passengers: ["guest-driver"], inventory: Array.from({ length: 18 }, () => null), ownerId: "guest-driver" },
    group: new THREE.Group(),
  };
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine & Record<string, unknown>;
  Object.assign(engine, {
    boats: new Map([[boat.save.id, boat]]),
    multiplayer: { role: "host", identity: { id: "host-player" } },
    multiplayerBoatInputs: new Map([["guest-driver", { boatId: boat.save.id, forward: 1, turn: 0.4, updatedAt: performance.now() }]]),
    keys: new Set<string>(), world: { getBlock: () => BlockId.Water },
    mountedBoatId: null, position: new THREE.Vector3(), velocity: new THREE.Vector3(), grounded: true,
  });
  VoxelEngine.prototype.updateBoats.call(engine, 0.1);
  assert.ok(boat.save.z < 0, "guest throttle should move the host-owned hull");
  boat.save.x = 0; boat.save.z = 0; boat.save.velocity = 0;
  (engine as unknown as { multiplayerBoatInputs: Map<string, { boatId: string; forward: number; turn: number; updatedAt: number }> })
    .multiplayerBoatInputs.set("guest-driver", { boatId: boat.save.id, forward: 1, turn: 0, updatedAt: performance.now() - 1_000 });
  VoxelEngine.prototype.updateBoats.call(engine, 0.1);
  assert.equal(boat.save.z, 0);
});

test("a local sailboat rider can free-look without steering the hull or snapping the camera", () => {
  const playerId = "local";
  const boat = {
    save: { id: "wayfarer-freelook", x: 3, y: 63.58, z: -2, yaw: -0.4, velocity: 0, passengers: [playerId], inventory: Array.from({ length: 18 }, () => null), ownerId: playerId },
    group: new THREE.Group(),
  };
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine & Record<string, unknown>;
  Object.assign(engine, {
    boats: new Map([[boat.save.id, boat]]),
    multiplayer: null,
    multiplayerBoatInputs: new Map(),
    keys: new Set<string>(), world: { getBlock: () => BlockId.Water },
    mountedBoatId: boat.save.id, position: new THREE.Vector3(), velocity: new THREE.Vector3(), grounded: true,
    yaw: 1.17,
  });

  VoxelEngine.prototype.updateBoats.call(engine, 0.1);

  assert.equal(engine.yaw, 1.17, "the rider's look direction must remain independent from the hull heading");
  assert.equal(boat.save.yaw, -0.4, "free-looking must not steer a stationary hull");
  assert.equal(engine.mountedBoatId, boat.save.id);
});

test("host lifecycle atomically consumes guest launches, boards, leaves and repacks an empty boat", () => {
  const current = sessionState();
  current.inventory[0] = { item: Item.Sailboat, count: 1 };
  const identity = { id: current.playerId, name: "Guest", color: "#8855cc", variant: "female" as const };
  const peer = { identity, state: "connected" };
  const boatResponses: Array<Record<string, unknown>> = [];
  const session = {
    role: "host", identity: { id: "host-player" },
    getPeer: () => peer, getPeers: () => [],
    sendBoatAction: (action: Record<string, unknown>) => { boatResponses.push(action); return 1; },
    sendPlayerState: () => 1,
  };
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine & Record<string, unknown>;
  Object.assign(engine, {
    multiplayer: session, multiplayerTick: 8, mode: "survival",
    multiplayerPlayerStates: new Map([[identity.id, current]]),
    multiplayerPlayerProgressions: new Map(), multiplayerPlayerWallets: new Map(),
    remotePlayers: new Map([[identity.id, { target: { playerId: identity.id, x: 0, y: 63.58, z: 1, yaw: 0, pitch: 0, vx: 0, vy: 0, vz: 0, grounded: true } }]]),
    world: { getBlock: () => BlockId.Water }, boats: new Map(), boatGroup: new THREE.Group(), chests: new Map(),
    nextBoatId: 1, multiplayerContainerRevisions: new Map(), multiplayerContainerSignatures: new Map(),
    pendingReliableRequests: new Map(), multiplayerState: { error: "" }, multiplayerBoatInputs: new Map(),
    targetBoat: null, mountedBoatId: null, saveSoon: () => undefined,
  });
  const handle = (action: Record<string, unknown>) => (engine as unknown as { handleRemoteBoatAction(action: unknown, peer: unknown): void })
    .handleRemoteBoatAction(action, peer);
  handle({ requestId: "launch-1", actorId: identity.id, tick: 8, kind: "launch", x: 0, y: 63.58, z: 0, yaw: 0, status: "request" });
  assert.equal(engine.boats.size, 1);
  assert.equal((engine as unknown as { multiplayerPlayerStates: Map<string, PlayerSessionSnapshot> }).multiplayerPlayerStates.get(identity.id)?.inventory[0], null);
  const boatId = [...engine.boats.keys()][0];
  handle({ requestId: "board-1", actorId: identity.id, tick: 9, kind: "board", boatId, status: "request" });
  assert.deepEqual(engine.boats.get(boatId)?.save.passengers, [identity.id]);
  handle({ requestId: "leave-1", actorId: identity.id, tick: 10, kind: "leave", boatId, status: "request" });
  assert.deepEqual(engine.boats.get(boatId)?.save.passengers, []);
  handle({ requestId: "pack-1", actorId: identity.id, tick: 11, kind: "pack", boatId, status: "request" });
  assert.equal(engine.boats.size, 0);
  assert.equal((engine as unknown as { multiplayerPlayerStates: Map<string, PlayerSessionSnapshot> }).multiplayerPlayerStates.get(identity.id)?.inventory[0]?.item, Item.Sailboat);
  assert.equal(boatResponses.some((response) => response.kind === "pack" && response.status === "accepted"), true);
});

test("shared furnace/facility payloads are bounded and item transactions conserve exact metadata", () => {
  const before = sessionState();
  const after = structuredClone(before);
  after.inventory[0] = null;
  after.cursor = { ...before.inventory[0]! };
  after.revision += 1;
  assert.equal(multiplayerContainerTransactionConservesItems(before, [null, null, null], after, [null, null, null]), true);
  const duplicated = structuredClone(after);
  duplicated.inventory[1] = { ...before.inventory[0]! };
  assert.equal(multiplayerContainerTransactionConservesItems(before, [null, null, null], duplicated, [null, null, null]), false);
  assert.equal(validatePayload("container-action", {
    requestId: "furnace_sync_001", actorId: before.playerId, containerId: "furnace:1,2,3", kind: "open",
    expectedRevision: 2, slots: [null, null, null], machine: { progress: 3.5, burn: 4, burnMax: 8 }, status: "accepted",
  }), true);
  assert.equal(validatePayload("facility-action", {
    requestId: "facility_open_001", actorId: before.playerId, facilityId: "apiary:1,2,3", facilityKind: "apiary",
    kind: "open", expectedRevision: 0, status: "request",
  }), true);
  assert.equal(validatePayload("mob-snapshot", {
    tick: 1,
    scope: { centerPlayerId: before.playerId, radius: 64, epoch: 1 },
    mobs: [{ id: 3, kind: "peelop", x: 0, y: 1, z: 2, yaw: 0, health: 6, state: "wander", lead: { ownerId: before.playerId, maximumLength: 7 } }],
  }), true);
  assert.equal(validatePayload("creature-action", {
    requestId: "dragon_command_001", actorId: before.playerId, tick: 8, kind: "dragon-command", targetId: 31,
    command: "guard-lair", status: "request",
  }), true);
  assert.equal(validatePayload("creature-action", {
    requestId: "dragon_command_bad", actorId: before.playerId, tick: 8, kind: "dragon-command", targetId: 31,
    command: "become-invincible", status: "request",
  }), false);
});

test("guest dragon panel actions remain intents until the host responds", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const player = sessionState();
  const dragonState = { ...createDragonState("fire", { dragonId: "guest-panel-dragon", tamed: true, ownerId: player.playerId }), scaleReserve: 4 };
  const dragon = { id: 31, dragonState };
  const sent: Array<Partial<CreatureAction>> = [];
  Object.assign(engine, {
    multiplayer: { role: "guest", identity: { id: player.playerId } },
    activeDragon: dragon,
    requestNetworkCreatureAction: (action: Partial<CreatureAction>) => { sent.push(action); return true; },
  });
  const before = structuredClone(dragonState);
  assert.equal(engine.commandActiveDragon("wander"), true);
  assert.equal(engine.toggleActiveDragonShoulder(), true);
  assert.equal(engine.harvestActiveDragonScales(), 1);
  assert.deepEqual(sent, [
    { kind: "dragon-command", targetId: 31, command: "wander" },
    { kind: "dragon-shoulder", targetId: 31 },
    { kind: "dragon-harvest", targetId: 31 },
  ]);
  assert.deepEqual(dragon.dragonState, before);
});

test("host atomically resolves guest dragon panel actions and broadcasts player plus mob authority", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const player = sessionState();
  const dragonState = { ...createDragonState("fire", { dragonId: "host-panel-dragon", tamed: true, ownerId: player.playerId }), scaleReserve: 4 };
  const dragon = { id: 31, name: "Cinder", health: dragonState.health, dragonState, group: { position: new THREE.Vector3(2, 2, 3) } };
  const responses: CreatureAction[] = [];
  const mobFrames: unknown[] = [];
  const peer = { id: player.playerId, name: "Guest", color: "#fff" };
  Object.assign(engine, {
    multiplayer: {
      role: "host", identity: { id: "player_host_001" },
      sendCreatureAction: (action: CreatureAction) => { responses.push(action); return 1; },
      sendMobSnapshot: (snapshot: unknown) => { mobFrames.push(snapshot); return 1; },
      sendPlayerState: () => 1,
      getPeer: () => ({ identity: peer }),
    },
    remotePlayers: new Map([[player.playerId, { target: { x: 1, y: 2, z: 3 } }]]),
    multiplayerPlayerStates: new Map([[player.playerId, player]]),
    mobs: [dragon],
    multiplayerTick: 12,
    pendingReliableRequests: new Map(),
    queueCriticalReliableRequest: (_key: string, send: () => number) => { send(); return true; },
    applyDragonState: (mob: typeof dragon, state: typeof dragonState) => { mob.dragonState = state; },
    networkMobSnapshotForPeer: () => [{ id: dragon.id }],
    saveSoon: () => undefined,
    emitHud: () => undefined,
  });
  const api = engine as unknown as { handleRemoteCreatureAction(action: CreatureAction, peer: unknown): void };
  api.handleRemoteCreatureAction({
    requestId: "dragon_harvest_001", actorId: player.playerId, tick: 12, kind: "dragon-harvest", targetId: dragon.id, status: "request",
  }, { identity: peer });
  const committed = engine.multiplayerPlayerStates.get(player.playerId)!;
  assert.equal(committed.revision, player.revision + 1);
  assert.equal(committed.inventory.some((slot) => slot?.item === Item.FireDragonScale && slot.count === 4), true);
  assert.equal(dragon.dragonState.scaleReserve, 0);
  assert.equal(responses.some((response) => response.kind === "dragon-harvest" && response.status === "accepted" && response.playerState?.revision === committed.revision), true);
  assert.equal(mobFrames.length, 1);
  api.handleRemoteCreatureAction({
    requestId: "dragon_command_002", actorId: player.playerId, tick: 13, kind: "dragon-command", targetId: dragon.id, command: "wander", status: "request",
  }, { identity: peer });
  assert.equal(dragon.dragonState.command, "wander");
  api.handleRemoteCreatureAction({
    requestId: "dragon_shoulder_003", actorId: player.playerId, tick: 14, kind: "dragon-shoulder", targetId: dragon.id, status: "request",
  }, { identity: peer });
  assert.equal(dragon.dragonState.onShoulder, true);
  assert.equal(mobFrames.length, 3);

  dragon.dragonState = { ...dragon.dragonState, scaleReserve: 2 };
  engine.remotePlayers.get(player.playerId)!.target.x = 100;
  api.handleRemoteCreatureAction({
    requestId: "dragon_far_004", actorId: player.playerId, tick: 15, kind: "dragon-harvest", targetId: dragon.id, status: "request",
  }, { identity: peer });
  assert.equal(responses.at(-1)?.status, "rejected");
  assert.equal(dragon.dragonState.scaleReserve, 2);
  engine.remotePlayers.get(player.playerId)!.target.x = 1;
  dragon.dragonState = { ...dragon.dragonState, ownerId: "player_someone_else" };
  api.handleRemoteCreatureAction({
    requestId: "dragon_owner_005", actorId: player.playerId, tick: 16, kind: "dragon-harvest", targetId: dragon.id, status: "request",
  }, { identity: peer });
  assert.equal(responses.at(-1)?.status, "rejected");
  assert.equal(dragon.dragonState.scaleReserve, 2);
});

test("read-only guest facilities restore their authoritative pack baseline before generic sync resumes", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const player = sessionState();
  const sent: unknown[] = [];
  Object.assign(engine, {
    multiplayer: { role: "guest", identity: { id: player.playerId }, sendFacilityAction: (action: unknown) => { sent.push(action); return 1; } },
    multiplayerPlayerStateRevision: player.revision,
    multiplayerTick: 3,
    multiplayerFacilityPlayerBaseline: null,
    multiplayerFacilityRevisions: new Map(),
    multiplayerPendingFacilityMutations: new Set<string>(),
    inventory: player.inventory.map((slot) => slot ? structuredClone(slot) : null),
    cursor: null,
    equipment: { head: null, chest: null, legs: null, feet: null },
    offhand: null,
    selected: player.selected,
    health: player.health,
    hunger: player.hunger,
    xp: player.xp,
    level: player.level,
    skillState: player.skills,
    playerVariant: player.variant,
    activeNetworkFacilityId: "apiary:1,2,3",
    localPlayerModel: { setAppearance: () => undefined },
    emitHud: () => undefined,
    queueCriticalReliableRequest: (_key: string, send: () => number) => { send(); return true; },
  });
  const api = engine as unknown as {
    requestNetworkFacilitySnapshot(facility: { id: string; kind: "apiary" }): boolean;
    restoreGuestFacilityPlayerBaseline(): boolean;
  };
  assert.equal(api.requestNetworkFacilitySnapshot({ id: "apiary:1,2,3", kind: "apiary" }), true);
  engine.inventory[0] = { item: Item.FireDragonScale, count: 64 };
  assert.equal(api.restoreGuestFacilityPlayerBaseline(), true);
  assert.deepEqual(engine.inventory[0], player.inventory[0]);
  assert.equal(engine.multiplayerFacilityPlayerBaseline, null);
  assert.equal(sent.length, 1);
});

test("generic facility protocol rejects opaque guest-authored machine replacement", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const player = sessionState();
  const facilityId = "apiary:1,2,3";
  const responses: CreatureAction[] = [];
  Object.assign(engine, {
    multiplayer: { role: "host", identity: { id: "facility-host" }, sendFacilityAction: (action: CreatureAction) => { responses.push(action); return 1; } },
    remotePlayers: new Map([[player.playerId, { target: { x: 1, y: 2, z: 3 } }]]),
    world: { getBlock: () => BlockId.Apiary },
    apiaries: new Map([["1,2,3", createEmptyApiaryBlock()]]),
    multiplayerFacilityRevisions: new Map([[facilityId, 4]]),
    multiplayerPeerActiveFacilities: new Map<string, string>(),
    multiplayerPeerFacilitySignatures: new Map<string, string>(),
    multiplayerPlayerStates: new Map([[player.playerId, player]]),
    multiplayerPendingFacilityMutations: new Set<string>(),
    pendingReliableRequests: new Map(),
    queueCriticalReliableRequest: (_key: string, send: () => number) => { send(); return true; },
  });
  const facilityApi = engine as unknown as { handleRemoteFacilityAction(action: unknown, peer: unknown): void };
  const peer = { identity: { id: player.playerId, name: "Guest", color: "#fff" } };
  facilityApi.handleRemoteFacilityAction({
    requestId: "facility_open_001", actorId: player.playerId, facilityId, facilityKind: "apiary", kind: "open", status: "request",
  }, peer);
  assert.equal(responses.at(-1)?.status, "accepted");
  assert.equal(engine.multiplayerPeerActiveFacilities.get(player.playerId), facilityId);
  (engine as unknown as { handleRemoteFacilityAction(action: unknown, peer: unknown): void }).handleRemoteFacilityAction({
    requestId: "facility_forgery_001", actorId: player.playerId, facilityId, facilityKind: "apiary", kind: "update",
    expectedRevision: 4, expectedPlayerRevision: player.revision,
    state: { schema: 1, attached: true, queen: null, honey: 12 },
    playerState: { ...player, revision: player.revision + 1 }, status: "request",
  }, peer);
  assert.equal(responses.at(-1)?.status, "rejected");
  assert.equal(engine.apiaries.get("1,2,3")?.queen, null);
  facilityApi.handleRemoteFacilityAction({
    requestId: "facility_close_001", actorId: player.playerId, facilityId, facilityKind: "apiary", kind: "close", status: "request",
  }, peer);
  assert.equal(engine.multiplayerPeerActiveFacilities.has(player.playerId), false);
});

test("incremental host acknowledgements cannot snap a guest's locally predicted hotbar selection backward", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const state = sessionState();
  Object.assign(engine, {
    selected: 6,
    inventory: Array.from({ length: 36 }, () => null), cursor: null,
    equipment: { head: null, chest: null, legs: null, feet: null }, offhand: null,
    skillState: createSkillState(), playerVariant: "female", multiplayerPlayerStateRevision: 0,
    localPlayerModel: { setAppearance: () => undefined }, emitHud: () => undefined,
    multiplayer: { identity: { id: state.playerId, variant: "female" } },
  });
  (engine as unknown as { applyLocalPlayerSessionSnapshot(state: PlayerSessionSnapshot, preserve: boolean): void })
    .applyLocalPlayerSessionSnapshot({ ...state, selected: 1 }, true);
  assert.equal(engine.selected, 6);
});

test("selection-only scrolling stays off the reliable full-player-state lane", () => {
  const before = sessionState();
  const after = { ...before, selected: 7 };
  assert.equal(
    multiplayerPlayerStateSignature(after),
    multiplayerPlayerStateSignature(before),
    "the unordered pose lane owns hotbar intent, so wheel notches must not dirty a full reliable pack image",
  );
});

test("guest merchant buttons send a host-authoritative trade intent without mutating local stock", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const merchant = createMerchant("trade-world", "merchant-guest-test", "hobbits", "farmer", 0);
  const sent: CreatureAction[] = [];
  Object.assign(engine, {
    activeMerchantId: merchant.id,
    merchants: new Map([[merchant.id, merchant]]),
    multiplayer: { role: "guest" },
    requestNetworkCreatureAction: (action: CreatureAction) => { sent.push(action); return true; },
    skillState: createSkillState(),
  });
  assert.equal(engine.tradeWithActiveMerchant("player-buys", "apple", 2), true);
  assert.deepEqual(sent[0], { kind: "trade", merchantId: merchant.id, tradeDirection: "player-buys", itemKey: "apple", tradeCount: 2 });
  assert.deepEqual(engine.merchants.get(merchant.id), merchant);
});

test("host validates a guest keeper before hitching their lead to a real nearby fence", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const player = sessionState();
  const sent: CreatureAction[] = [];
  const mob = { id: 44, name: "Peelop", group: { position: new THREE.Vector3(2, 2, 3) } };
  Object.assign(engine, {
    multiplayer: {
      role: "host",
      sendCreatureAction: (action: CreatureAction) => { sent.push(action); return 1; },
      sendMobSnapshot: () => 1,
    },
    remotePlayers: new Map([[player.playerId, { target: { x: 1, y: 2, z: 3 } }]]),
    multiplayerPlayerStates: new Map([[player.playerId, player]]),
    mobs: [mob],
    leadAnchors: new Map([[mob.id, { mobId: String(mob.id), ownerId: player.playerId, maximumLength: 7 }]]),
    world: { getBlock: () => BlockId.WildwoodFence },
    queueCriticalReliableRequest: (_key: string, send: () => number) => { send(); return true; },
    networkMobSnapshotForPeer: () => [], saveSoon: () => undefined,
  });
  (engine as unknown as { handleRemoteCreatureAction(action: CreatureAction, peer: unknown): void }).handleRemoteCreatureAction({
    requestId: "lead_hitch_001", actorId: player.playerId, tick: 1, kind: "lead-hitch", targetId: mob.id, x: 3, y: 2, z: 3, status: "request",
  }, { identity: { id: player.playerId, name: "Guest", color: "#fff" } });
  assert.deepEqual(engine.leadAnchors.get(mob.id)?.fence, { x: 3, y: 2, z: 3 });
  assert.equal(sent.at(-1)?.status, "accepted");
});

test("host merchant trade commits guest wallet, inventory, and shared stock atomically and rechecks range", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const player = { ...sessionState(), inventory: Array.from({ length: 36 }, () => null) as PlayerSessionSnapshot["inventory"] };
  const merchant = createMerchant("trade-world", "merchant-host-test", "hobbits", "farmer", 2_000);
  const stock = merchant.inventory.find((entry) => commerceItemCode(entry.itemKey) !== null)!;
  const item = commerceItemCode(stock.itemKey)!;
  const responses: CreatureAction[] = [];
  const merchantMob = { residentId: merchant.id, health: 10, group: { position: new THREE.Vector3(2, 2, 3) } };
  const peer = { id: player.playerId, name: "Guest", color: "#fff" };
  Object.assign(engine, {
    multiplayer: {
      role: "host", identity: { id: "player_host_001" },
      sendCreatureAction: (action: CreatureAction) => { responses.push(action); return 1; },
      sendPlayerState: () => 1,
      getPeer: () => ({ identity: peer }),
    },
    multiplayerPeerActiveMerchants: new Map([[player.playerId, merchant.id]]),
    multiplayerPlayerStates: new Map([[player.playerId, player]]),
    multiplayerPlayerWallets: new Map([[player.playerId, createGoldWallet("trade-world", player.playerId, 10_000)]]),
    merchants: new Map([[merchant.id, merchant]]), mobs: [merchantMob],
    remotePlayers: new Map([[player.playerId, { target: { x: 1, y: 2, z: 3 } }]]),
    factionRelations: { alignments: { hobbits: 0 } },
    queueCriticalReliableRequest: (_key: string, send: () => number) => { send(); return true; },
    saveSoon: () => undefined,
  });
  const api = engine as unknown as { resolveHostMerchantTrade(action: CreatureAction, peer: unknown, state: PlayerSessionSnapshot): void };
  api.resolveHostMerchantTrade({ requestId: "trade_buy_001", actorId: player.playerId, tick: 1, kind: "trade", merchantId: merchant.id, tradeDirection: "player-buys", itemKey: stock.itemKey, tradeCount: 1, status: "request" }, peer, player);
  const bought = engine.multiplayerPlayerStates.get(player.playerId)!;
  assert.ok(bought.inventory.some((slot) => slot?.item === item));
  assert.equal(responses.at(-1)?.status, "accepted");
  api.resolveHostMerchantTrade({ requestId: "trade_sell_001", actorId: player.playerId, tick: 2, kind: "trade", merchantId: merchant.id, tradeDirection: "player-sells", itemKey: stock.itemKey, tradeCount: 1, status: "request" }, peer, bought);
  assert.equal(engine.multiplayerPlayerStates.get(player.playerId)!.inventory.some((slot) => slot?.item === item), false);
  engine.remotePlayers.get(player.playerId)!.target.x = 100;
  api.resolveHostMerchantTrade({ requestId: "trade_far_001", actorId: player.playerId, tick: 3, kind: "trade", merchantId: merchant.id, tradeDirection: "player-buys", itemKey: stock.itemKey, tradeCount: 1, status: "request" }, peer, engine.multiplayerPlayerStates.get(player.playerId)!);
  assert.equal(responses.at(-1)?.status, "rejected");
});

test("character profile identities remain stable and valid across both join paths", () => {
  const colors = { skin: "#c98f6b", hair: "#17191d", shirt: "#3f7fba", trousers: "#293554", accent: "#f0c85b" } as const;
  const id = "browser-01abcdef.character-02abcdef";
  const identity = createPeerIdentity("Tidekeeper", colors.shirt, () => id, "female", {
    profileId: "character-02abcdef",
    browserId: "browser-01abcdef",
    sex: "female",
    race: "atlantian",
    colors,
    startingSkills: { melee: 3, ranged: 1, mining: 4, crafting: 2, survival: 3, husbandry: 2, exploration: 2, magic: 1, bartering: 1, luck: 1 },
  });
  assert.equal(identity.id, id);
  assert.equal(validatePeerIdentity(identity), true);
  assert.equal(Object.values(identity.startingSkills ?? {}).reduce((total, value) => total + value, 0), 20);
  assert.equal(validatePeerIdentity({ ...identity, startingSkills: { ...identity.startingSkills!, luck: 2 } }), false);
  assert.equal(validatePayload("player-pose", {
    playerId: id,
    tick: 4,
    x: 1, y: 2, z: 3,
    yaw: 0, pitch: 0,
    vx: 0, vy: 0, vz: 0,
    grounded: false,
    variant: "female",
    sex: "female",
    profileId: identity.profileId,
    browserId: identity.browserId,
    race: identity.race,
    colors,
    swimming: 1,
    seated: 0,
    mountedCreatureId: 22,
  }), true);
});

test("reliable block edits carry bounded hotbar intent and valid hand-breaks never warn about tools", () => {
  const actorId = sessionState().playerId;
  assert.equal(validatePayload("block-action", {
    requestId: "break_grass_001", actorId, tick: 9, kind: "break", selectedSlot: 7,
    edits: [{ x: 1, y: 70, z: 1, type: BlockId.Air }], status: "request",
  }), true);
  assert.equal(validatePayload("block-action", {
    requestId: "break_grass_bad", actorId, tick: 9, kind: "break", selectedSlot: 9,
    edits: [{ x: 1, y: 70, z: 1, type: BlockId.Air }], status: "request",
  }), false);
  assert.equal(shouldShowIncorrectToolFeedback(true), false);
  assert.equal(shouldShowIncorrectToolFeedback(false), true);
});

test("guest-thrown items are host-spawned once with exact metadata and a committed pack image", () => {
  const player = sessionState();
  const responses: InventoryAction[] = [];
  const snapshots: unknown[] = [];
  const spawned: Array<{ item: number; count: number; durability?: number; metadata?: Record<string, unknown> }> = [];
  const drop = { id: 91, velocity: new THREE.Vector3() };
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    multiplayer: {
      role: "host",
      identity: { id: "player_host_authority_001" },
      sendInventoryAction: (action: InventoryAction) => { responses.push(action); return 1; },
      sendDropSnapshot: (snapshot: unknown) => { snapshots.push(snapshot); return 1; },
    },
    remotePlayers: new Map([[player.playerId, { target: { x: 3, y: 70, z: 4, yaw: 0.4, pitch: -0.1 } }]]),
    multiplayerPlayerStates: new Map([[player.playerId, player]]),
    ensureHostPlayerSession: () => player,
    spawnDrop: (item: number, count: number, _position: THREE.Vector3, durability?: number, metadata?: Record<string, unknown>) => {
      spawned.push({ item, count, durability, metadata });
      return drop;
    },
    sendAuthoritativePlayerState: () => undefined,
    networkDropSnapshot: () => [{ id: drop.id }],
    multiplayerTick: 10,
    saveSoon: () => undefined,
    events: { onToast: () => undefined },
  });
  (engine as unknown as { handleRemoteInventoryAction(action: InventoryAction, peer: unknown): void }).handleRemoteInventoryAction({
    requestId: "drop_guest_001", actorId: player.playerId, kind: "drop",
    from: { scope: "hotbar", slot: 0 }, count: 1, status: "request",
  }, { identity: { id: player.playerId, name: "Guest", color: "#fff" } });
  assert.deepEqual(spawned, [{ item: Item.Apple, count: 1, durability: undefined, metadata: player.inventory[0]!.metadata }]);
  assert.ok(drop.velocity.length() > 2.9);
  assert.equal(engine.multiplayerPlayerStates.get(player.playerId)!.inventory[0], null);
  assert.equal(responses.at(-1)?.status, "accepted");
  assert.equal(responses.at(-1)?.dropId, drop.id);
  assert.equal(snapshots.length, 1);
});

test("guest pickups bridge delayed walk/sprint poses, work 100+ blocks from host, and reject remote claims", () => {
  const player = sessionState();
  const responses: InventoryAction[] = [];
  const makeEngine = (dropX: number, remoteX = 0) => {
    const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
    const drop = { id: 44, item: Item.Stick, count: 1, mesh: { position: new THREE.Vector3(dropX, 70.8, 0) } };
    Object.assign(engine, {
      multiplayer: {
        role: "host",
        sendInventoryAction: (action: InventoryAction) => { responses.push(action); return 1; },
        sendDropSnapshot: () => 1,
      },
      position: new THREE.Vector3(0, 70, 0),
      remotePlayers: new Map([[player.playerId, { target: { x: remoteX, y: 70, z: 0 } }]]),
      multiplayerPlayerStates: new Map([[player.playerId, structuredClone(player)]]),
      drops: [drop],
      ensureHostPlayerSession: () => engine.multiplayerPlayerStates.get(player.playerId),
      removeDrop: (index: number) => { engine.drops.splice(index, 1); },
      sendAuthoritativePlayerState: () => undefined,
      networkDropSnapshot: () => [],
      multiplayerTick: 20,
      saveSoon: () => undefined,
      events: { onToast: () => undefined },
    });
    return engine;
  };
  const peer = { identity: { id: player.playerId, name: "Guest", color: "#fff" } };
  const lagged = makeEngine(3);
  (lagged as unknown as { handleRemoteInventoryAction(action: InventoryAction, peer: unknown): void }).handleRemoteInventoryAction({
    requestId: "pickup_lagged_001", actorId: player.playerId, kind: "collect", dropId: 44,
    pickupAt: { x: 3, y: 70.8, z: 0 }, status: "request",
  }, peer);
  assert.equal(responses.at(-1)?.status, "accepted");
  assert.equal(responses.at(-1)?.remainingCount, 0);
  assert.equal(responses.at(-1)?.playerState?.inventory.some((slot) => slot?.item === Item.Stick), true,
    "the reliable acceptance must carry the committed pack image with the drop removal");
  assert.equal(lagged.drops.length, 0);

  const remote = makeEngine(9);
  (remote as unknown as { handleRemoteInventoryAction(action: InventoryAction, peer: unknown): void }).handleRemoteInventoryAction({
    requestId: "pickup_remote_001", actorId: player.playerId, kind: "collect", dropId: 44,
    pickupAt: { x: 9, y: 70.8, z: 0 }, status: "request",
  }, peer);
  assert.equal(responses.at(-1)?.status, "rejected");
  assert.equal(remote.drops.length, 1);

  const delayed = makeEngine(0);
  delayed.drops[0].pickupDelay = 0.2;
  (delayed as unknown as { handleRemoteInventoryAction(action: InventoryAction, peer: unknown): void }).handleRemoteInventoryAction({
    requestId: "pickup_delay_001", actorId: player.playerId, kind: "collect", dropId: 44,
    pickupAt: { x: 0, y: 70.8, z: 0 }, status: "request",
  }, peer);
  assert.equal(responses.at(-1)?.status, "rejected", "the host must honor the same pickup delay as local collection");
  assert.equal(delayed.drops.length, 1);

  const distantGuest = makeEngine(160, 160);
  (distantGuest as unknown as { handleRemoteInventoryAction(action: InventoryAction, peer: unknown): void }).handleRemoteInventoryAction({
    requestId: "pickup_far_host_001", actorId: player.playerId, kind: "collect", dropId: 44,
    pickupAt: { x: 160, y: 70.8, z: 0 }, status: "request",
  }, peer);
  assert.equal(responses.at(-1)?.status, "accepted");
  assert.equal(distantGuest.drops.length, 0);
});

test("network drop reconstruction preserves identities and host velocity without local stack merging", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    drops: [],
    dropGroup: new THREE.Group(),
    dropModelTemplates: new Map(),
    nextDropId: 1,
    pendingGuestDropRequests: new Map(),
    lastNetworkDropSnapshotTick: -1,
  });
  const entries: DropSnapshotEntry[] = [
    { id: 81, item: Item.Stick, count: 2, x: 1, y: 4, z: 1, vx: 1.2, vy: -0.4, vz: 0.3, age: 2, pickupDelay: 0 },
    { id: 82, item: Item.Stick, count: 3, x: 1.1, y: 4, z: 1.1, vx: -0.2, vy: 0.8, vz: -0.5, age: 1, pickupDelay: 0.25 },
  ];
  (engine as unknown as { applyNetworkDropSnapshot(entries: DropSnapshotEntry[], tick: number): void })
    .applyNetworkDropSnapshot(entries, 10);
  assert.deepEqual(engine.drops.map((drop) => [drop.id, drop.count]), [[81, 2], [82, 3]]);
  assert.deepEqual(engine.drops[0].velocity.toArray(), [1.2, -0.4, 0.3]);
  assert.equal(engine.drops[1].pickupDelay, 0.25);
});

test("furnace clocks replicate without churning the slot transaction revision", () => {
  const key = "2,70,2";
  const id = `furnace:${key}`;
  const furnace = { input: { item: Item.RawIron, count: 1 }, fuel: { item: Item.Coal, count: 1 }, output: null, progress: 1, burn: 5, burnMax: 8 };
  const deliveries: ContainerAction[] = [];
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    multiplayer: {
      role: "host",
      identity: { id: "host-player" },
      getPeer: () => ({ identity: { id: "guest-player" } }),
      sendContainerAction: (action: ContainerAction) => { deliveries.push(action); return 1; },
    },
    chests: new Map(), furnaces: new Map([[key, furnace]]), boats: new Map(), mobs: [],
    multiplayerContainerRevisions: new Map<string, number>(),
    multiplayerContainerSignatures: new Map<string, string>(),
    multiplayerPeerActiveContainers: new Map([["guest-player", id]]),
    multiplayerPeerContainerSignatures: new Map<string, string>(),
  });
  const api = engine as unknown as { syncMultiplayerContainers(): void };
  api.syncMultiplayerContainers();
  const contentRevision = engine.multiplayerContainerRevisions.get(id);
  furnace.progress = 2.5;
  furnace.burn = 3.5;
  api.syncMultiplayerContainers();
  assert.equal(engine.multiplayerContainerRevisions.get(id), contentRevision);
  assert.equal(deliveries.length, 2, "machine clocks should still refresh for the viewer");
  assert.equal(deliveries.at(-1)?.machine?.progress, 2.5);
});

test("guest lead attachment consumes exactly one host-owned lead and returns the committed state", () => {
  const player = sessionState();
  player.inventory[0] = { item: Item.Lead, count: 2 };
  const mob = { id: 77, name: "Peelop", group: { position: new THREE.Vector3(2, 70, 3) } };
  const responses: CreatureAction[] = [];
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    multiplayer: {
      role: "host",
      sendCreatureAction: (action: CreatureAction) => { responses.push(action); return 1; },
      sendMobSnapshot: () => 1,
    },
    mode: "survival",
    mobs: [mob],
    leadAnchors: new Map(),
    multiplayerPlayerStates: new Map([[player.playerId, player]]),
    ensureLeadLine: () => undefined,
    networkMobSnapshot: () => [],
    queueCriticalReliableRequest: (_key: string, send: () => number) => { send(); return true; },
    sendAuthoritativePlayerState: () => undefined,
    saveSoon: () => undefined,
  });
  (engine as unknown as { resolveHostCreatureInteraction(action: CreatureAction, peer: unknown, pose: unknown, state: PlayerSessionSnapshot): void }).resolveHostCreatureInteraction({
    requestId: "attach_lead_001", actorId: player.playerId, tick: 2, kind: "interact", targetId: mob.id, status: "request",
  }, { id: player.playerId, name: "Guest", color: "#fff" }, { x: 1, y: 70, z: 3 }, player);
  const committed = engine.multiplayerPlayerStates.get(player.playerId)!;
  assert.equal(committed.inventory[0]?.count, 1);
  assert.equal(engine.leadAnchors.get(mob.id)?.ownerId, player.playerId);
  assert.equal(responses.at(-1)?.playerState?.inventory[0]?.count, 1);
});

test("floating ground animals on leads recover against the keeper floor", () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const mob = {
    id: 41,
    name: "Grazer",
    group: { position: new THREE.Vector3(8, 8, 0), visible: true },
    baseY: 8,
    definition: { movement: "ground", aquatic: false, flying: false, footOffset: 0.5, height: 1.4 },
  };
  const references: number[] = [];
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    multiplayer: { role: "host", identity: { id: "host" } },
    mobs: [mob],
    leadAnchors: new Map([[mob.id, { mobId: String(mob.id), ownerId: "guest", maximumLength: 7 }]]),
    leadLines: new Map(),
    remotePlayers: new Map([["guest", { target: { x: 0, y: 2, z: 0 } }]]),
    world: { getBlock: () => undefined },
    mountedCreatureId: null,
    mobBaseScale: () => 1,
    mobMoveTarget: (_mob: unknown, _x: number, _z: number, _scale: number, reference: number) => { references.push(reference); return 1.5; },
    ensureLeadLine: () => ({ geometry, visible: true }),
    events: { onToast: () => undefined },
    saveSoon: () => undefined,
  });
  engine.updateLeads();
  assert.equal(mob.group.position.y, 1.5);
  assert.equal(mob.baseY, 1.5);
  assert.equal(references[0], 2);
});

test("shift crafting exhausts ingredient operations and syncs one complete guest batch", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  let syncs = 0;
  Object.assign(engine, {
    multiplayer: { role: "guest" },
    craftingSize: 2,
    craftGrid: Array.from({ length: 9 }, () => null),
    inventory: Array.from({ length: 36 }, () => null),
    cursor: null,
    blueprints: undefined,
    skillState: createSkillState(),
    gainSkillExperience: () => undefined,
    audio: { play: () => undefined },
    events: { onToast: () => undefined },
    saveSoon: () => undefined,
    emitHud: () => undefined,
    syncInventoryMutationNow: () => { syncs += 1; },
  });
  engine.craftGrid[0] = { item: BlockId.WildwoodLog, count: 64 };
  engine.craftOutputClick(true);
  assert.equal(engine.inventory.reduce((sum, slot) => sum + (slot?.item === BlockId.Planks ? slot.count : 0), 0), 256);
  assert.equal(engine.craftGrid[0], null);
  assert.equal(syncs, 1);
});

test("visiting-player ecology round-robins one shared spawn clock with bounded sublinear caps", () => {
  const points = [
    { id: "host", x: 0, y: 70, z: 0, yaw: 0 },
    { id: "guest-a", x: 160, y: 70, z: 0, yaw: 0 },
    { id: "guest-b", x: -160, y: 70, z: 0, yaw: 0 },
  ] as const;
  assert.equal(selectSimulationInterest(points, 0)?.id, "host");
  assert.equal(selectSimulationInterest(points, 1)?.id, "guest-a");
  assert.equal(selectSimulationInterest(points, 2)?.id, "guest-b");
  assert.equal(selectSimulationInterest(points, 3)?.id, "host");
  assert.equal(nearestSimulationInterest(points, 155, 2)?.point.id, "guest-a");
  assert.equal(multiplayerNaturalMobCap(28, 1), 28);
  assert.equal(multiplayerNaturalMobCap(28, 2), 39);
  assert.equal(multiplayerNaturalMobCap(28, 4), 56);
});

test("a guest can open only a real nearby shared furnace and receives its slots and clocks", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const player = sessionState();
  const key = "1,2,3";
  const responses: ContainerAction[] = [];
  let blockAtTarget = BlockId.Furnace;
  Object.assign(engine, {
    multiplayer: {
      role: "host",
      sendContainerAction: (action: ContainerAction) => { responses.push(action); return 1; },
    },
    remotePlayers: new Map([[player.playerId, { target: { x: 1, y: 2, z: 4 } }]]),
    world: { getBlock: () => blockAtTarget },
    furnaces: new Map(),
    chests: new Map(), boats: new Map(), mobs: [],
    multiplayerContainerRevisions: new Map([[`furnace:${key}`, 6]]),
    multiplayerPlayerStates: new Map([[player.playerId, player]]),
    multiplayerPeerActiveContainers: new Map<string, string>(),
    multiplayerPeerContainerSignatures: new Map<string, string>(),
    queueCriticalReliableRequest: (_key: string, send: () => number) => { send(); return true; },
  });
  const api = engine as unknown as { handleRemoteContainerAction(action: ContainerAction, peer: unknown): void };
  const peer = { identity: { id: player.playerId, name: "Guest", color: "#fff" } };
  const request: ContainerAction = {
    requestId: "furnace_open_001", actorId: player.playerId, containerId: `furnace:${key}`, kind: "open", status: "request",
  };
  api.handleRemoteContainerAction(request, peer);
  assert.equal(responses.at(-1)?.status, "accepted");
  assert.equal(responses.at(-1)?.containerId, `furnace:${key}`);
  assert.deepEqual(responses.at(-1)?.slots, [null, null, null]);
  assert.deepEqual(responses.at(-1)?.machine, { progress: 0, burn: 0, burnMax: 0 });
  assert.equal(engine.furnaces.has(key), true, "a real unopened furnace is materialized lazily by the host");

  engine.furnaces.set(key, {
    input: { item: BlockId.Cobblestone, count: 2 },
    fuel: { item: Item.Coal, count: 3 },
    output: null,
    progress: 1.25,
    burn: 4.5,
    burnMax: 8,
  });
  api.handleRemoteContainerAction({ ...request, requestId: "furnace_open_existing_001" }, peer);
  assert.deepEqual(responses.at(-1)?.slots, [{ item: BlockId.Cobblestone, count: 2 }, { item: Item.Coal, count: 3 }, null]);
  assert.deepEqual(responses.at(-1)?.machine, { progress: 1.25, burn: 4.5, burnMax: 8 });

  blockAtTarget = BlockId.Stone;
  api.handleRemoteContainerAction({ ...request, requestId: "furnace_open_spoofed_001" }, peer);
  assert.equal(responses.at(-1)?.status, "rejected", "a saved furnace record cannot be opened after its world block is gone");
});

test("host mob damage uses a peer actor id and never the invalid short synthetic mob id", () => {
  const base = {
    requestId: "mob_hit_12_400",
    tick: 400,
    targetKind: "player" as const,
    targetId: "player_stable_guest_001",
    attack: "melee" as const,
    status: "accepted" as const,
    resultingHealth: 4,
    killed: false,
  };
  assert.equal(validatePayload("combat-action", { ...base, actorId: "player_host_authority_001" }), true);
  assert.equal(validatePayload("combat-action", { ...base, actorId: "mob_12" }), false);
});

test("tree effects and companion transactions are bounded reliable actions", () => {
  const actorId = "player_stable_guest_001";
  assert.equal(validatePayload("block-action", {
    requestId: "tree_action_001",
    actorId,
    tick: 90,
    kind: "batch",
    edits: [{ x: 4, y: 8, z: -2, type: BlockId.Air }],
    effect: { kind: "tree-fell", rootX: 4, rootY: 8, rootZ: -2, directionX: 1, directionZ: 0 },
    status: "request",
  }), true);
  assert.equal(validatePayload("creature-action", {
    requestId: "creature_capture_001",
    actorId,
    tick: 91,
    kind: "capture",
    targetId: 22,
    status: "request",
  }), true);
  assert.equal(validatePayload("creature-action", {
    requestId: "creature_command_001",
    actorId,
    tick: 92,
    kind: "command",
    targetId: 22,
    command: "follow",
    distance: "dynamic",
    status: "request",
  }), true);
  assert.equal(validatePayload("mob-snapshot", {
    tick: 93,
    scope: { centerPlayerId: actorId, radius: 64, epoch: 1 },
    mobs: [{
      id: 22, kind: "peelop", x: 4, y: 8, z: -2, yaw: 0, health: 8, state: "wander",
      tamed: true, ownerId: actorId, command: "follow", name: "Nana", attunedOrbId: null,
    }],
  }), true);
  assert.equal(validatePayload("creature-action", {
    requestId: "aquarium_insert_001",
    actorId,
    tick: 94,
    kind: "aquarium-insert",
    containerKey: "4,8,-2",
    status: "request",
  }), true);
  assert.equal(validatePayload("creature-action", {
    requestId: "aquarium_state_001",
    actorId,
    tick: 95,
    kind: "aquarium-sync",
    containerKey: "4,8,-2",
    aquariumState: { schema: 1, blockKeys: ["4,8,-2"], residents: [], lastBreedingCycle: 10 },
    status: "accepted",
  }), true);
  assert.equal(validatePayload("creature-action", {
    requestId: "creature_interact_001",
    actorId,
    tick: 96,
    kind: "interact",
    targetId: 22,
    crouching: false,
    status: "request",
  }), true);
  assert.equal(validatePayload("creature-action", {
    requestId: "creature_mount_001",
    actorId,
    tick: 97,
    kind: "interact",
    targetId: 22,
    mounted: true,
    panel: "follower",
    message: "Mounted companion.",
    status: "accepted",
  }), true);
});

test("container requests bind chest and player revisions and demand-sync without slot uploads", () => {
  const actorId = "player_stable_guest_001";
  assert.equal(validatePayload("container-action", {
    requestId: "container_open_001",
    actorId,
    containerId: "4,8,-2",
    kind: "open",
    expectedRevision: 3,
    expectedPlayerRevision: 7,
    status: "request",
  }), true);
  assert.equal(validatePayload("container-action", {
    requestId: "container_mutate_001",
    actorId,
    containerId: "4,8,-2",
    kind: "mutate",
    expectedRevision: 3,
    expectedPlayerRevision: 7,
    operation: { op: "click", target: { owner: "player", slot: 9 }, button: "left", shift: true },
    status: "request",
  }), true);
  assert.equal(validatePayload("container-action", {
    requestId: "container_legacy_image_001", actorId, containerId: "4,8,-2", kind: "place",
    expectedRevision: 3, expectedPlayerRevision: 7, slots: Array.from({ length: 27 }, () => null),
    playerState: { ...sessionState(), revision: 8 }, status: "request",
  }), false, "protocol v2 rejects guest-authored full inventory images");
});

test("demand container snapshots select the requested chest beyond the old 32-entry prefix", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const chests = new Map<string, Array<null>>();
  for (let index = 0; index < 48; index += 1) chests.set(`boat:container-${index}`, Array.from({ length: 27 }, () => null));
  Object.assign(engine, {
    chests,
    multiplayerContainerRevisions: new Map([["boat:container-47", 9]]),
    world: { getBlock: () => BlockId.Air },
  });
  const snapshots = (engine as unknown as { networkContainerSnapshots(ids: readonly string[]): Array<{ id: string; revision: number }> })
    .networkContainerSnapshots(["boat:container-47"]);
  assert.deepEqual(snapshots.map(({ id, revision }) => ({ id, revision })), [{ id: "boat:container-47", revision: 9 }]);
});

test("connected conservatory inventories use the same demand-synced shared container image", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const id = "exhibit:4,8,-2";
  const slots = [{ item: Item.CaptureOrb, count: 1, metadata: { specimen: "butterfly" } }];
  Object.assign(engine, { chests: new Map([[id, slots]]), furnaces: new Map(), multiplayerContainerRevisions: new Map([[id, 3]]) });
  const snapshots = (engine as unknown as { networkContainerSnapshots(ids: string[]): Array<{ id: string; revision: number; slots: unknown[] }> }).networkContainerSnapshots([id]);
  assert.equal(snapshots[0]?.id, id);
  assert.equal(snapshots[0]?.revision, 3);
  assert.equal(snapshots[0]?.slots.length, 1);
});

test("send-zero leaves player and container signatures dirty for retry", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const current = sessionState();
  const containerId = "4,8,-2";
  Object.assign(engine, {
    multiplayer: {
      role: "guest",
      identity: { id: current.playerId },
      sendPlayerState: () => 0,
      sendContainerAction: () => 0,
    },
    multiplayerReceivedSnapshot: true,
    multiplayerPlayerStateRevision: current.revision,
    multiplayerPlayerStateSignature: "stale-player-image",
    multiplayerContainerSignatures: new Map([[containerId, "stale-container-image"]]),
    multiplayerContainerRevisions: new Map([[containerId, 2]]),
    multiplayerContainerAwaiting: new Set<string>(),
    multiplayerOptimisticContainers: new Map(),
    pendingReliableRequests: new Map(),
    multiplayerState: { error: "" },
    multiplayerTick: 1,
    activeChestKey: null,
    chests: new Map([[containerId, Array.from({ length: 27 }, () => null)]]),
    localPlayerSessionSnapshot: () => current,
  });
  (engine as unknown as { syncMultiplayerPlayerState(): void }).syncMultiplayerPlayerState();
  assert.equal(engine.multiplayerPlayerStateRevision, current.revision);
  assert.equal(engine.multiplayerPlayerStateSignature, "stale-player-image");
  engine.activeChestKey = containerId;
  (engine as unknown as { syncMultiplayerContainers(): void }).syncMultiplayerContainers();
  assert.equal(engine.multiplayerContainerSignatures.get(containerId), "stale-container-image");
  assert.equal(engine.multiplayerContainerAwaiting.has(containerId), true);
});

test("host rejects a chest transaction when either player or container revision is stale", () => {
  const current = sessionState();
  const containerId = "4,8,-2";
  const replies: Array<{ status?: string; reason?: string }> = [];
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    multiplayer: {
      role: "host",
      identity: { id: "player_host_authority_001" },
      sendContainerAction: (action: { status?: string; reason?: string }) => { replies.push(action); return 1; },
      sendPlayerState: () => 1,
      getPeer: () => ({ identity: { id: current.playerId } }),
    },
    chests: new Map([[containerId, Array.from({ length: 27 }, () => null)]]),
    multiplayerContainerRevisions: new Map([[containerId, 2]]),
    multiplayerContainerSignatures: new Map(),
    multiplayerPeerActiveContainers: new Map([[current.playerId, containerId]]),
    multiplayerPeerContainerSignatures: new Map(),
    multiplayerPlayerStates: new Map([[current.playerId, current]]),
    pendingReliableRequests: new Map(),
    ensureHostPlayerSession: () => current,
    saveSoon: () => undefined,
    emitHud: () => undefined,
  });
  const base = {
    requestId: "container_atomic_001",
    actorId: current.playerId,
    containerId,
    kind: "mutate" as const,
    operation: { op: "click" as const, target: { owner: "player" as const, slot: 0 }, button: "left" as const, shift: true },
    expectedRevision: 2,
    status: "request" as const,
  };
  (engine as unknown as { handleRemoteContainerAction(action: typeof base & { expectedPlayerRevision: number }, peer: { identity: { id: string } }): void })
    .handleRemoteContainerAction({ ...base, expectedPlayerRevision: 6 }, { identity: { id: current.playerId } });
  assert.equal(replies.at(-1)?.status, "rejected");
  assert.match(replies.at(-1)?.reason ?? "", /changed/iu);
  assert.equal(engine.chests.get(containerId)?.[0], null);
});

function creatureAuthorityEngine(current: PlayerSessionSnapshot) {
  const creatureActions: CreatureAction[] = [];
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    multiplayer: {
      role: "host",
      identity: { id: "player_host_authority_001" },
      sendCreatureAction: (action: CreatureAction) => { creatureActions.push(action); return 1; },
      sendMobSnapshot: () => 1,
      sendPlayerState: () => 1,
      getPeer: () => ({ identity: { id: current.playerId } }),
    },
    multiplayerState: { error: "" },
    multiplayerTick: 20,
    multiplayerPlayerStates: new Map([[current.playerId, current]]),
    pendingReliableRequests: new Map(),
    mode: "survival",
    day: 1,
    worldTime: 0.5,
    mobs: [],
    networkMobSnapshot: () => [],
    saveSoon: () => undefined,
  });
  return { engine, creatureActions };
}

test("guest companion feeding mutates the host inventory and creature state", () => {
  const current = sessionState();
  const { engine, creatureActions } = creatureAuthorityEngine(current);
  const petState = { ...createPeelopState(42), tamed: true, ownerId: current.playerId, health: 3, hunger: 8 };
  const group = new THREE.Group();
  group.position.set(1, 2, 3);
  const mob = {
    id: 22,
    kind: "peelop",
    name: "Nana",
    definition: MOB_DEFS.peelop,
    group,
    health: 3,
    maxHealth: 7,
    petState,
  };
  engine.mobs = [mob] as never;
  (engine as unknown as { resolveHostCreatureInteraction(action: CreatureAction, peer: { id: string }, pose: Record<string, number>, state: PlayerSessionSnapshot): void })
    .resolveHostCreatureInteraction({
      requestId: "creature_feed_host_001", actorId: current.playerId, tick: 20, kind: "interact", targetId: 22, status: "request",
    }, { id: current.playerId }, { x: 1, y: 2, z: 3 }, current);
  const committed = engine.multiplayerPlayerStates.get(current.playerId)!;
  assert.equal(committed.inventory[0], null, "the apple is consumed only in the host-owned pack");
  assert.ok((mob.petState?.health ?? 0) > 3);
  assert.equal(creatureActions.at(-1)?.status, "accepted");
});

test("guest mounting is approved by the host and returned as an authoritative result", () => {
  const current = { ...sessionState(), inventory: Array.from({ length: 36 }, () => null) as PlayerSessionSnapshot["inventory"] };
  const { engine, creatureActions } = creatureAuthorityEngine(current);
  const group = new THREE.Group();
  group.position.set(1, 2, 3);
  const mob = {
    id: 33,
    kind: "reedstrider",
    name: "Wakefin",
    definition: MOB_DEFS.reedstrider,
    group,
    health: 12,
    maxHealth: 12,
    reedstriderBond: { ...createReedstriderBond(), tamed: true, ownerId: current.playerId, saddled: true },
  };
  engine.mobs = [mob] as never;
  (engine as unknown as { resolveHostCreatureInteraction(action: CreatureAction, peer: { id: string }, pose: Record<string, number>, state: PlayerSessionSnapshot): void })
    .resolveHostCreatureInteraction({
      requestId: "creature_mount_host_001", actorId: current.playerId, tick: 20, kind: "interact", targetId: 33, status: "request",
    }, { id: current.playerId }, { x: 1, y: 2, z: 3 }, current);
  assert.equal(creatureActions.at(-1)?.mounted, true);
  assert.equal(creatureActions.at(-1)?.status, "accepted");
});

test("hosting rendezvous remains visible before the first WebRTC peer assigns a session role", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    multiplayer: { state: "idle", role: null, getPeers: () => [] },
    hostRendezvous: { code: "GROVE-7429" },
    multiplayerState: {
      supported: true,
      reasons: [],
      status: "hosting",
      role: "host",
      peers: [],
      inviteCode: "",
      answerCode: "",
      roomCode: "GROVE-7429",
      rendezvousStatus: "waiting-for-guest",
      error: "",
    },
  });
  const state = engine.getMultiplayerState();
  assert.equal(state.status, "hosting");
  assert.equal(state.role, "host");
});

test("multiplayer weather snapshots preserve the full storm state", () => {
  const weatherState = {
    kind: "thunder",
    cycle: 7,
    elapsedSeconds: 12,
    durationSeconds: 180,
    intensity: 0.82,
    windAngle: 1.2,
    windSpeed: 6.5,
  } as const;
  assert.equal(validatePayload("time-weather", { tick: 99, worldTime: 0.42, day: 8, weather: "rain", weatherState }), true);
  assert.equal(validatePayload("time-weather", { tick: 99, worldTime: 0.42, day: 8, weather: "rain", weatherState: { ...weatherState, intensity: 2 } }), false);
});

test("placement collision rejects blocks occupying local or remote player bodies", () => {
  const player = { x: 4, y: 12, z: -3 };
  assert.equal(blockEditIntersectsPlayer({ x: 4, y: 12, z: -3, type: BlockId.Stone }, player), true);
  assert.equal(blockEditIntersectsPlayer({ x: 6, y: 12, z: -3, type: BlockId.Stone }, player), false);
  assert.equal(blockEditIntersectsPlayer({ x: 4, y: 12, z: -3, type: BlockId.Air }, player), false);
});

test("a lost WebGL context pauses rendering state and restores without deleting the world", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const rendererStates: boolean[] = [];
  const toasts: string[] = [];
  let prevented = false;
  let resets = 0;
  let resizes = 0;
  Object.assign(engine, {
    disposed: false,
    webglContextLost: false,
    lightRefreshTimer: 5,
    renderer: { resetState: () => { resets += 1; } },
    resize: () => { resizes += 1; },
    events: {
      onRendererState: (lost: boolean) => rendererStates.push(lost),
      onToast: (message: string) => toasts.push(message),
    },
  });
  prevented = markRendererContextLost(engine as never);
  assert.equal(prevented, true);
  assert.equal(engine.webglContextLost, true);
  restoreRendererContext(engine as never);
  assert.equal(engine.webglContextLost, false);
  assert.deepEqual(rendererStates, [true, false]);
  assert.equal(resets, 1);
  assert.equal(resizes, 1);
  assert.equal(engine.lightRefreshTimer, 0);
  assert.match(toasts.join(" "), /restor/iu);
});

test("guest tree-fall and mob-death presentation timers advance without owning simulation", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const calls: Array<["tree" | "mob", number]> = [];
  Object.assign(engine, {
    multiplayer: { role: "guest" },
    multiplayerReceivedSnapshot: true,
    updateFallingTrees: (dt: number) => calls.push(["tree", dt]),
    updateMobRemains: (dt: number) => calls.push(["mob", dt]),
  });

  engine.updateTransientDestructionPresentation(0.05);

  assert.deepEqual(calls, [["tree", 0.05], ["mob", 0.05]]);
});

test("host-resolved guest felling aggregates harvest at the falling trunk instead of per leaf", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine & Record<string, unknown>;
  const cells = new Map([
    ["0,70,0", BlockId.WildwoodLog], ["0,71,0", BlockId.WildwoodLog],
    ["1,71,0", BlockId.WildwoodLeaves], ["0,72,0", BlockId.AppleFruit],
  ]);
  Object.assign(engine, {
    world: { getBlock: (x: number, y: number, z: number) => cells.get(`${x},${y},${z}`), atlas: null },
    scene: new THREE.Scene(), fallingTrees: [], audio: { play: () => undefined },
  });
  (engine as unknown as { animateNetworkTreeFell(action: unknown, harvest: boolean): void }).animateNetworkTreeFell({
    requestId: "fell-1", actorId: "guest-driver", tick: 2, kind: "batch", status: "request",
    edits: [...cells.keys()].map((key) => { const [x, y, z] = key.split(",").map(Number); return { x, y, z, type: BlockId.Air }; }),
    effect: { kind: "tree-fell", rootX: 0, rootY: 70, rootZ: 0, directionX: 1, directionZ: 0 },
  }, true);
  const tree = (engine as unknown as { fallingTrees: Array<{ harvest: boolean; logDrops: Array<[number, number]>; leafCount: number }> }).fallingTrees[0];
  assert.equal(tree.harvest, true);
  assert.equal(tree.leafCount, 1);
  assert.deepEqual(new Map(tree.logDrops), new Map([[BlockId.WildwoodLog, 2], [Item.Apple, 1]]));
});

test("host-authoritative guest placement consumes exactly one matching held block", () => {
  const current = sessionState();
  current.inventory[0] = { item: BlockId.CraftingTable, count: 2 };
  const result = consumeMultiplayerPlacementItem(current, BlockId.CraftingTable, [
    { x: 4, y: 8, z: -2, type: BlockId.CraftingTable },
  ]);
  assert.equal(result.valid, true);
  assert.equal(result.consumed, true);
  assert.deepEqual(result.state.inventory[0], { item: BlockId.CraftingTable, count: 1 });
  assert.equal(result.state.revision, current.revision + 1);

  const spoofed = consumeMultiplayerPlacementItem(current, BlockId.CraftingTable, [
    { x: 4, y: 8, z: -2, type: BlockId.GoldBlock },
  ]);
  assert.equal(spoofed.valid, false, "a held crafting table cannot authorize a different placed block");
  assert.equal(spoofed.state.revision, current.revision);
});

test("a second guest chest edit queues while the first revision is in flight", () => {
  const containerId = "4,8,-2";
  const current = sessionState();
  const sent: ContainerAction[] = [];
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, {
    multiplayer: {
      role: "guest",
      identity: { id: current.playerId },
      sendContainerAction: (action: ContainerAction) => { sent.push(action); return 1; },
      getPeers: () => [],
    },
    activeNetworkContainerId: containerId,
    multiplayerTick: 5,
    multiplayerOptimisticContainers: new Map([[containerId, {
      confirmedSlots: Array.from({ length: 27 }, () => null),
      confirmedPlayer: current,
      confirmedContainerRevision: 2,
      confirmedPlayerRevision: current.revision,
      pending: [],
    }]]),
  });
  const queue = (engine as unknown as { queueGuestContainerOperation(operation: { op: "click"; target: { owner: "player"; slot: number }; button: "left"; shift: boolean }): boolean }).queueGuestContainerOperation.bind(engine);
  assert.equal(queue({ op: "click", target: { owner: "player", slot: 0 }, button: "left", shift: true }), true);
  assert.equal(queue({ op: "click", target: { owner: "player", slot: 1 }, button: "left", shift: true }), true);
  const state = engine.multiplayerOptimisticContainers.get(containerId)!;
  assert.equal(state.pending.length, 2);
  assert.equal(sent.length, 1, "only the head intent may be in flight");
});

function tradingEngine() {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  const merchant = createMerchant("trade-world", "merchant_test", "hobbits", "farmer", 2_000);
  Object.assign(engine, {
    activeMerchantId: merchant.id,
    merchants: new Map([[merchant.id, merchant]]),
    goldWallet: createGoldWallet("trade-world", "player_test", 10_000),
    inventory: Array.from({ length: 36 }, () => null),
    skillState: createSkillState(),
    factionRelations: { alignments: { hobbits: 0 } },
    bestiary: {},
    events: { onToast: () => undefined },
    audio: { play: () => undefined },
    dispatchQuestEvent: () => undefined,
    saveSoon: () => undefined,
    emitHud: () => undefined,
  });
  const stock = merchant.inventory.find((entry) => commerceItemCode(entry.itemKey) !== null);
  assert.ok(stock, "test merchant needs at least one deliverable stock item");
  return { engine, merchant, stock };
}

test("player-buys uses the buy branch and commits item plus gold atomically", () => {
  const { engine, stock } = tradingEngine();
  const item = commerceItemCode(stock.itemKey)!;
  const goldBefore = BigInt(engine.goldWallet.balance);
  assert.equal(engine.tradeWithActiveMerchant("player-buys", stock.itemKey, 2), true);
  assert.equal(engine.countItem(item), 2);
  assert.ok(BigInt(engine.goldWallet.balance) < goldBefore, "buying must spend, never grant, gold");
});

test("a full pack leaves wallet, merchant stock, and inventory unchanged", () => {
  const { engine, merchant, stock } = tradingEngine();
  engine.inventory = Array.from({ length: 36 }, () => ({ item: BlockId.Stone, count: 64 }));
  const walletBefore = structuredClone(engine.goldWallet);
  const inventoryBefore = structuredClone(engine.inventory);
  assert.equal(engine.tradeWithActiveMerchant("player-buys", stock.itemKey, 1), false);
  assert.deepEqual(engine.goldWallet, walletBefore);
  assert.deepEqual(engine.merchants.get(merchant.id), merchant);
  assert.deepEqual(engine.inventory, inventoryBefore);
});

test("player-sells removes the exact quantity before committing payment", () => {
  const { engine } = tradingEngine();
  engine.inventory[0] = { item: Item.Apple, count: 5 };
  const goldBefore = BigInt(engine.goldWallet.balance);
  assert.equal(engine.tradeWithActiveMerchant("player-sells", "apple", 3), true);
  assert.equal(engine.countItem(Item.Apple), 2);
  assert.ok(BigInt(engine.goldWallet.balance) > goldBefore);
});

test("player-sells can confirm all matching stacks in one bulk order", () => {
  const { engine } = tradingEngine();
  engine.inventory[0] = { item: Item.Apple, count: 64 };
  engine.inventory[1] = { item: Item.Apple, count: 64 };
  engine.inventory[2] = { item: Item.Apple, count: 2 };
  assert.equal(engine.tradeWithActiveMerchant("player-sells", "apple", 130), true);
  assert.equal(engine.countItem(Item.Apple), 0);
});
