import assert from "node:assert/strict";
import test from "node:test";
import { VoxelEngine, normalizeMultiplayerPlayerState } from "../app/game/engine";
import { BlockId, Item } from "../app/game/data";
import { applyAsteroidAction, createAsteroidRegistry } from "../app/game/asteroid-custody";
import { celestialTerrainSeed } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import type { BlockAction, PeerInfo } from "../app/game/multiplayer";

function fixture() {
  const guest = "asteroid-builder", orbit = locationAddress({ ...homeLocation(universeId("peer-claim")), kind: "orbit", instanceId: "low" });
  let registry = createAsteroidRegistry(orbit, celestialTerrainSeed("PEER-CLAIM"));
  const asteroid = registry.asteroids[0].descriptor, p = asteroid.center;
  for (const type of ["discover", "claim", "access"] as const) {
    const base = { operationId: type, asteroidId: asteroid.id, location: orbit, epoch: registry.epoch, expectedRevision: registry.revision };
    registry = applyAsteroidAction(registry, type === "access"
      ? { ...base, type, trustedIds: [guest], build: "trusted", extract: "owner" } : { ...base, type }, { actorId: "local", location: orbit }).registry;
  }
  const cells = new Map([[`${p.x},${p.y},${p.z}`, BlockId.CopperOre]]), effects: string[] = [], replies: BlockAction[] = [];
  const player = normalizeMultiplayerPlayerState({ playerId: guest, revision: 7, selected: 0,
    inventory: [{ item: BlockId.Dirt, count: 5, metadata: { batch: "finite" } }, { item: Item.WildwoodDoor, count: 2 }, ...Array(34).fill(null)] }, guest);
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    asteroidFields: { schema: 1, fields: { [locationId(orbit)]: registry } }, orbitalStations: null,
    wayworks: new Map(), chests: new Map([["metadata", [{ item: Item.RawCopper, count: 3 }]]]),
    mode: "survival", remotePlayers: new Map([[guest, { target: { x: p.x, y: p.y, z: p.z + 4 } }]]),
    multiplayer: { role: "host", identity: { id: "host" }, sendBlockAction: (action: BlockAction) => replies.push(action) },
    multiplayerPlayerStates: new Map([[guest, player]]), localNetworkPose: () => null,
    ensureHostPlayerSession: () => engine.multiplayerPlayerStates.get(guest), sendAuthoritativePlayerState: () => {},
    world: { locationScope: { locationId: locationId(orbit), epoch: 1, revision: 2 },
      getBlock: (x: number, y: number, z: number) => cells.get(`${x},${y},${z}`) ?? BlockId.Air,
      setBlocksBatch: (edits: BlockAction["edits"]) => { effects.push("terrain"); for (const edit of edits) cells.set(`${edit.x},${edit.y},${edit.z}`, edit.type); } },
    worldBlockFacing: () => 0, applyBlockEditFacings: () => effects.push("facings"),
    teardownBrokenBlockState: () => effects.push("metadata"), spawnDrop: () => effects.push("drops"),
    dropBlockLoot: () => effects.push("loot"), publishDestructionTombstones: () => effects.push("tombstones"),
    toolCanHarvest: () => true, saveSoon: () => effects.push("save"),
  }) as VoxelEngine;
  const peer = { identity: { id: guest, name: "Builder", color: "#ffffff" } } as PeerInfo;
  const run = (edits: BlockAction["edits"], patch: Partial<BlockAction> = {}) => {
    const action: BlockAction = { requestId: "bounded-peer-edit", actorId: guest, tick: 1, kind: "place", status: "request", consumedItem: BlockId.Dirt, selectedSlot: 0, edits, ...patch };
    Reflect.get(engine, "handleRemoteBlockAction").call(engine, action, peer);
    return replies.at(-1)!;
  };
  const image = () => structuredClone({ cells: [...cells], player: engine.multiplayerPlayerStates.get(guest),
    fields: engine.asteroidFields, chests: [...engine.chests], machines: [...engine.wayworks], effects });
  const edit = (dx = 0, type = BlockId.Dirt) => ({ x: p.x + dx, y: p.y, z: p.z, type });
  return { engine, run, image, edit, cells, p, guest, effects };
}

test("actual host rejects build-only solid overwrite with exact no-mutation custody", () => {
  const f = fixture(), before = f.image();
  assert.equal(f.run([f.edit()]).status, "rejected"); assert.deepEqual(f.image(), before);
});
test("actual host rejects the whole mixed clear/occupied edit without a partial debit", () => {
  const f = fixture(), before = f.image();
  assert.equal(f.run([f.edit(1), f.edit()], { kind: "batch" }).status, "rejected"); assert.deepEqual(f.image(), before);
});
test("actual host permits one normal clear-cell placement and exact one-item debit", () => {
  const f = fixture(), before = f.image();
  assert.equal(f.run([f.edit(1)]).status, "accepted");
  assert.equal(f.cells.get(`${f.p.x + 1},${f.p.y},${f.p.z}`), BlockId.Dirt);
  assert.equal(f.engine.multiplayerPlayerStates.get(f.guest)!.inventory[0]!.count, 4);
  assert.deepEqual(f.engine.multiplayerPlayerStates.get(f.guest)!.inventory[0]!.metadata, { batch: "finite" });
  assert.deepEqual(f.engine.asteroidFields, before.fields); assert.deepEqual([...f.engine.chests], before.chests);
  assert(!f.effects.includes("drops")); assert(!f.effects.includes("metadata"));
});
test("actual host rejects an omitted material intent and a one-item multi-block mint", () => {
  for (const missing of [true, false]) {
    const f = fixture(), before = f.image();
    const edits = missing ? [f.edit(1)] : [f.edit(1), f.edit(2)];
    assert.equal(f.run(edits, missing ? { consumedItem: undefined } : { kind: "batch" }).status, "rejected");
    assert.deepEqual(f.image(), before);
  }
});
test("rejected mixed extraction cannot commit the peer's proposed selected slot", () => {
  const f = fixture(), before = f.image();
  assert.equal(f.run([f.edit(0, BlockId.Air)], { kind: "break", consumedItem: undefined, selectedSlot: 1 }).status, "rejected");
  assert.deepEqual(f.image(), before);
});
test("normal paired door placement remains one finite item", () => {
  const f = fixture();
  assert.equal(f.run([f.edit(1, BlockId.DoorClosedLower), { ...f.edit(1, BlockId.DoorClosedUpper), y: f.p.y + 1 }],
    { kind: "batch", consumedItem: Item.WildwoodDoor, selectedSlot: 1 }).status, "accepted");
  assert.equal(f.engine.multiplayerPlayerStates.get(f.guest)!.inventory[1]!.count, 1);
});

test("valid multipart shape with one occupied cell rejects atomically", () => {
  const f = fixture(), before = f.image();
  assert.equal(f.run([{ ...f.edit(0, BlockId.DoorClosedLower), y: f.p.y - 1 }, f.edit(0, BlockId.DoorClosedUpper)],
    { kind: "batch", consumedItem: Item.WildwoodDoor, selectedSlot: 1 }).status, "rejected");
  assert.deepEqual(f.image(), before);
});
test("duplicates and forged actor IDs cannot commit or duplicate resource effects", () => {
  for (const forged of [false, true]) {
    const f = fixture(), before = f.image();
    assert.equal(f.run(forged ? [f.edit(1)] : [f.edit(1), f.edit(1)], forged ? { actorId: "local" } : {}).status, "rejected");
    assert.deepEqual(f.image(), before);
  }
});
test("existing gate and paired door toggles remain resource-neutral", () => {
  for (const door of [false, true]) {
    const f = fixture();
    f.cells.set(`${f.p.x + 1},${f.p.y},${f.p.z}`, door ? BlockId.DoorClosedLower : BlockId.FenceGateNorthSouthClosed);
    if (door) f.cells.set(`${f.p.x + 1},${f.p.y + 1},${f.p.z}`, BlockId.DoorClosedUpper);
    const before = f.image(), edits = door ? [f.edit(1, BlockId.DoorOpenLower), { ...f.edit(1, BlockId.DoorOpenUpper), y: f.p.y + 1 }]
      : [f.edit(1, BlockId.FenceGateNorthSouthOpen)];
    assert.equal(f.run(edits, { consumedItem: undefined, kind: door ? "batch" : "place" }).status, "accepted");
    assert.deepEqual(f.engine.multiplayerPlayerStates.get(f.guest), before.player);
    assert(!f.effects.includes("drops")); assert(!f.effects.includes("metadata"));
  }
});
test("ordinary window facing rotation still requires an actual Field Wrench", () => {
  const f = fixture(); f.cells.set(`${f.p.x + 1},${f.p.y},${f.p.z}`, BlockId.ReinforcedWindow);
  const edits = [{ ...f.edit(1, BlockId.ReinforcedWindow), facing: 1 as const }], before = f.image();
  assert.equal(f.run(edits, { consumedItem: undefined }).status, "rejected"); assert.deepEqual(f.image(), before);
  f.engine.multiplayerPlayerStates.get(f.guest)!.inventory[0] = { item: Item.FieldWrench, count: 1 };
  assert.equal(f.run(edits, { consumedItem: undefined }).status, "accepted");
});

test("replaceable contents still require extraction permission and unloaded targets reject", () => {
  for (const unloaded of [false, true]) {
    const f = fixture();
    if (unloaded) f.engine.world.getBlock = () => undefined;
    else f.cells.set(`${f.p.x + 1},${f.p.y},${f.p.z}`, BlockId.Torch);
    const before = f.image();
    assert.equal(f.run([f.edit(1)]).status, "rejected"); assert.deepEqual(f.image(), before);
  }
});
test("a placed bed is one exact pair, never two disconnected resource blocks", () => {
  for (const valid of [true, false]) {
    const f = fixture(); f.engine.multiplayerPlayerStates.get(f.guest)!.inventory[0] = { item: Item.WildwoodBed, count: 1 };
    const before = f.image(), foot = f.edit(1, BlockId.BedNorthFoot), head = { ...f.edit(1, BlockId.BedNorthHead), z: f.p.z - (valid ? 1 : 3) };
    assert.equal(f.run([foot, head], { kind: "batch", consumedItem: Item.WildwoodBed }).status, valid ? "accepted" : "rejected");
    if (valid) assert.equal(f.engine.multiplayerPlayerStates.get(f.guest)!.inventory[0], null);
    else assert.deepEqual(f.image(), before);
  }
});
