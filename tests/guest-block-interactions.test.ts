import assert from "node:assert/strict";
import test from "node:test";
import { VoxelEngine, normalizeMultiplayerPlayerState } from "../app/game/engine";
import { BlockId, Item, archiveShelfBlockForBookCount } from "../app/game/data";
import { SPELL_TOME_ITEMS } from "../app/game/dragon-world";
import { homeLocation, locationId, universeId } from "../app/game/location-address";
import { validatePayload, type BlockAction, type PeerInfo } from "../app/game/multiplayer";
const point = { x: 0, y: 20, z: 0 }, key = "0,20,0", guest = "semantic-guest";
function fixture(item: number | null, block: BlockId, count = 1, durability?: number) {
  const cells = new Map([[key, block]]), effects: string[] = [], replies: BlockAction[] = [];
  const player = normalizeMultiplayerPlayerState({ playerId: guest, revision: 3, selected: 0,
    inventory: [item === null ? null : { item, count, ...(durability === undefined ? {} : { durability }) }, ...Array(35).fill(null)] }, guest);
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    mode: "survival", asteroidFields: { schema: 1, fields: {} }, orbitalStations: null,
    wayworks: new Map(), chests: new Map(), archiveShelves: new Map(), liquidCells: new Map(),
    remotePlayers: new Map([[guest, { target: { x: 0, y: 20, z: 4 } }]]),
    multiplayer: { role: "host", identity: { id: "host" }, sendBlockAction: (a: BlockAction) => replies.push(a) },
    multiplayerPlayerStates: new Map([[guest, player]]), localNetworkPose: () => null,
    ensureHostPlayerSession: () => engine.multiplayerPlayerStates.get(guest), sendAuthoritativePlayerState: () => {},
    world: { locationScope: { locationId: locationId(homeLocation(universeId("semantic-home"))), epoch: 1, revision: 1 },
      getBlock: (x: number, y: number, z: number) => cells.get(`${x},${y},${z}`) ?? BlockId.Air,
      setBlocksBatch: (edits: BlockAction["edits"]) => { effects.push("terrain"); for (const e of edits) cells.set(`${e.x},${e.y},${e.z}`, e.type); } },
    worldBlockFacing: () => 0, applyBlockEditFacings: () => effects.push("facings"),
    teardownBrokenBlockState: () => effects.push("teardown"), spawnDrop: () => effects.push("drop"), dropBlockLoot: () => effects.push("loot"),
    publishDestructionTombstones: () => {}, toolCanHarvest: () => true, saveSoon: () => effects.push("save"),
    schedulePlantGrowth: () => effects.push("growth"), notifyLiquidChanged: () => effects.push("liquid"),
  }) as VoxelEngine;
  const peer = { identity: { id: guest, name: "Guest", color: "#ffffff" } } as PeerInfo;
  const run = (kind: NonNullable<BlockAction["interaction"]>["kind"], type: BlockId, at = point, patch: Partial<BlockAction> = {}) => {
    const action: BlockAction = { requestId: "semantic-one", actorId: guest, tick: 1, status: "request", selectedSlot: 0,
      kind: type === BlockId.Air ? "break" : "place", interaction: { kind, ...point }, edits: [{ ...at, type }], ...patch };
    Reflect.get(engine, "handleRemoteBlockAction").call(engine, action, peer); return replies.at(-1)!;
  };
  const image = () => structuredClone({ cells: [...cells], player: engine.multiplayerPlayerStates.get(guest),
    shelves: [...engine.archiveShelves], liquids: [...engine.liquidCells], effects });
  const inventory = () => engine.multiplayerPlayerStates.get(guest)!.inventory;
  return { engine, cells, effects, run, image, inventory };
}
test("host tills only derived soil and debits exactly one finite tool use", () => {
  const f = fixture(Item.WoodHoe, BlockId.Dirt, 1, 2);
  assert.equal(f.run("till", BlockId.Farmland).status, "accepted");
  assert.equal(f.cells.get(key), BlockId.Farmland); assert.equal(f.inventory()[0]!.durability, 1);
  assert(!f.effects.includes("loot")); assert(!f.effects.includes("teardown"));
});
test("host plants one seed with one debit and owns the growth schedule", () => {
  const f = fixture(Item.WheatSeeds, BlockId.Farmland, 2);
  assert.equal(f.run("plant", BlockId.WheatSprout, { ...point, y: 21 }).status, "accepted");
  assert.equal(f.inventory()[0]!.count, 1); assert(f.effects.includes("growth"));
});
test("last hoe use breaks the tool and wrong held items cannot transform terrain", () => {
  const last = fixture(Item.WoodHoe, BlockId.Dirt, 1, 1);
  assert.equal(last.run("till", BlockId.Farmland).status, "accepted"); assert.equal(last.inventory()[0], null);
  for (const kind of ["till", "plant"] as const) {
    const wrong = fixture(Item.Bucket, BlockId.Dirt), before = wrong.image();
    assert.equal(wrong.run(kind, BlockId.Farmland).status, "rejected"); assert.deepEqual(wrong.image(), before);
  }
});
test("bucket fill and pour exchange exactly one vessel without mining loot", () => {
  const fill = fixture(Item.Bucket, BlockId.Water, 2);
  fill.engine.liquidCells.set(key, { kind: "water", level: 0, source: true, falling: false });
  assert.equal(fill.run("bucket-fill", BlockId.Air).status, "accepted");
  assert.equal(fill.inventory()[0]!.count, 1); assert.equal(fill.inventory()[1]!.item, Item.WaterBucket);
  assert(fill.effects.includes("liquid")); assert(!fill.effects.includes("loot"));
  assert.equal(fill.engine.liquidCells.has(key), false, "removed liquid source cannot remain authoritative in the simulator");
  const pour = fixture(Item.WaterBucket, BlockId.Stone);
  assert.equal(pour.run("bucket-pour", BlockId.Water, { ...point, y: 21 }).status, "accepted");
  assert.equal(pour.inventory()[0]!.item, Item.Bucket); assert.equal(pour.cells.get(key), BlockId.Stone);
  assert.deepEqual(pour.engine.liquidCells.get("0,21,0"), { kind: "water", level: 0, source: true, falling: false });
});
test("shared local and guest bucket cell commit replaces old flow and clears filled sources", () => {
  const f = fixture(Item.Bucket, BlockId.Water);
  f.engine.liquidCells.set(key, { kind: "lava", level: 4, source: false, falling: true });
  Reflect.get(f.engine, "commitBucketLiquidCell").call(f.engine, { ...point, type: BlockId.Water });
  assert.deepEqual(f.engine.liquidCells.get(key), { kind: "water", level: 0, source: true, falling: false });
  Reflect.get(f.engine, "commitBucketLiquidCell").call(f.engine, { ...point, type: BlockId.Air });
  assert.equal(f.engine.liquidCells.has(key), false);
});
test("shelf insertion and removal transfer the actual host-owned tome", () => {
  const tome = SPELL_TOME_ITEMS[0], f = fixture(tome, BlockId.ArchiveShelf);
  assert.equal(f.run("shelf-insert", archiveShelfBlockForBookCount(1)).status, "accepted");
  assert.equal(f.inventory()[0], null); assert.deepEqual(f.engine.archiveShelves.get(key)!.tomes, [tome]);
  assert.equal(f.run("shelf-remove", archiveShelfBlockForBookCount(0)).status, "accepted");
  assert.equal(f.inventory()[0]!.item, tome); assert.equal(f.engine.archiveShelves.get(key)!.tomes.length, 0);
});
test("forged after-images, mixed edits and invalid costs reject with exact custody", () => {
  for (const patch of [{ consumedItem: BlockId.Dirt }, { actorId: "host" }, { kind: "batch" as const },
    { edits: [{ ...point, type: BlockId.Farmland }, { ...point, x: 1, type: BlockId.Farmland }] }]) {
    const f = fixture(Item.WoodHoe, BlockId.Dirt, 1, 2), before = f.image();
    assert.equal(f.run("till", BlockId.Farmland, point, patch).status, "rejected"); assert.deepEqual(f.image(), before);
  }
  const f = fixture(Item.WoodHoe, BlockId.Dirt, 1, 2), before = f.image();
  assert.equal(f.run("till", BlockId.CopperOre).status, "rejected"); assert.deepEqual(f.image(), before);
});
test("flowing liquid, nonadjacent pouring and full return pack reject atomically", () => {
  const flow = fixture(Item.Bucket, BlockId.Water); flow.engine.liquidCells.set(key, { kind: "water", level: 4, source: false, falling: false });
  const beforeFlow = flow.image(); assert.equal(flow.run("bucket-fill", BlockId.Air).status, "rejected"); assert.deepEqual(flow.image(), beforeFlow);
  const far = fixture(Item.WaterBucket, BlockId.Stone), beforeFar = far.image();
  assert.equal(far.run("bucket-pour", BlockId.Water, { ...point, x: 3 }).status, "rejected"); assert.deepEqual(far.image(), beforeFar);
  const full = fixture(Item.Bucket, BlockId.Water, 2), state = full.engine.multiplayerPlayerStates.get(guest)!;
  full.engine.multiplayerPlayerStates.set(guest, { ...state, inventory: state.inventory.map((s, i) => i ? { item: BlockId.Stone, count: 64 } : s) });
  const beforeFull = full.image(); assert.equal(full.run("bucket-fill", BlockId.Air).status, "rejected"); assert.deepEqual(full.image(), beforeFull);
});
test("semantic transforms cannot bypass extraction or container grants", () => {
  for (const shelf of [false, true]) {
    const f = fixture(shelf ? SPELL_TOME_ITEMS[0] : Item.WoodHoe, shelf ? BlockId.ArchiveShelf : BlockId.Dirt);
    Reflect.set(f.engine, "stationActorAccess", (_actor: string, _x: number, _y: number, _z: number, permission: string) => permission !== (shelf ? "container" : "extract"));
    const before = f.image();
    assert.equal(f.run(shelf ? "shelf-insert" : "till", shelf ? archiveShelfBlockForBookCount(1) : BlockId.Farmland).status, "rejected");
    assert.deepEqual(f.image(), before);
  }
});
test("shelves refuse full-pack withdrawal and lossy metadata-bearing insertion", () => {
  const full = fixture(BlockId.Stone, archiveShelfBlockForBookCount(1), 64), state = full.engine.multiplayerPlayerStates.get(guest)!;
  full.engine.multiplayerPlayerStates.set(guest, { ...state, inventory: state.inventory.map(() => ({ item: BlockId.Stone, count: 64 })) });
  const beforeFull = full.image(); assert.equal(full.run("shelf-remove", archiveShelfBlockForBookCount(0)).status, "rejected"); assert.deepEqual(full.image(), beforeFull);
  const tagged = fixture(SPELL_TOME_ITEMS[0], BlockId.ArchiveShelf), taggedState = tagged.engine.multiplayerPlayerStates.get(guest)!;
  taggedState.inventory[0] = { ...taggedState.inventory[0]!, metadata: { uniqueBook: "keep" } };
  const beforeTagged = tagged.image(); assert.equal(tagged.run("shelf-insert", archiveShelfBlockForBookCount(1)).status, "rejected"); assert.deepEqual(tagged.image(), beforeTagged);
});
test("wire accepts only a single exact semantic intent with no competing payment", () => {
  const action = { requestId: "semantic", actorId: guest, tick: 1, kind: "place", edits: [{ ...point, type: BlockId.Farmland }], interaction: { kind: "till", ...point } };
  assert.equal(validatePayload("block-action", action), true);
  for (const patch of [{ consumedItem: Item.WoodHoe }, { kind: "batch" }, { interaction: { ...action.interaction, claims: [] } },
    { interaction: { ...action.interaction, x: .5 } }, { interaction: { ...action.interaction, kind: "mint" } }])
    assert.equal(validatePayload("block-action", { ...action, ...patch }), false);
});
test("guest sends semantic intent without touching its inventory or terrain", () => {
  const f = fixture(Item.WoodHoe, BlockId.Dirt), sent: unknown[] = [], before = f.image();
  Reflect.set(f.engine, "multiplayer", { role: "guest" }); Reflect.set(f.engine, "target", { ...point, type: BlockId.Dirt });
  Reflect.set(f.engine, "publishBlockEdits", (...args: unknown[]) => sent.push(args));
  assert.equal(Reflect.get(f.engine, "requestGuestBlockInteraction").call(f.engine, "till", { ...point, type: BlockId.Farmland }), true);
  assert.deepEqual(f.image(), before); assert.deepEqual((sent[0] as unknown[])[4], { kind: "till", ...point });
});

test("ordinary guest shelf use follows visible count and immediate Shift, not stale cached tomes", () => {
  for (const shift of ["ShiftLeft", "ShiftRight"]) {
    const sent: unknown[][] = [];
    const engine = Object.assign(Object.create(VoxelEngine.prototype), {
      inventory: [null], selected: 0, placeCooldown: 0, crouching: false,
      keys: new Set([shift]), leadAnchors: new Map(),
      target: { ...point, type: archiveShelfBlockForBookCount(1) },
      archiveShelves: new Map([[key, { schema: 1, tomes: [] }]]),
      multiplayer: { role: "guest" }, applyHarvest: () => false,
      publishBlockEdits: (...args: unknown[]) => sent.push(args),
      events: { onToast: () => {} },
    }) as VoxelEngine;
    engine.useSelected();
    assert.equal(sent.length, 1, "same-frame Shift must request withdrawal despite stale empty shelf cache");
    assert.deepEqual(sent[0][4], { kind: "shelf-remove", ...point });
    assert.deepEqual(sent[0][0], [{ ...point, type: BlockId.ArchiveShelf }]);
    assert.deepEqual(engine.inventory, [null]); assert.equal(engine.crouching, false);
    assert.deepEqual(engine.archiveShelves.get(key)!.tomes, []);
  }
  const sent: unknown[][] = [], tome = SPELL_TOME_ITEMS[0];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    inventory: [{ item: tome, count: 1 }], selected: 0, placeCooldown: 0,
    crouching: false, keys: new Set(), leadAnchors: new Map(),
    target: { ...point, type: archiveShelfBlockForBookCount(2) },
    archiveShelves: new Map([[key, { schema: 1, tomes: [] }]]),
    multiplayer: { role: "guest" }, applyHarvest: () => false,
    publishBlockEdits: (...args: unknown[]) => sent.push(args), events: { onToast: () => {} },
  }) as VoxelEngine;
  engine.useSelected();
  assert.equal(sent.length, 1); assert.deepEqual(sent[0][4], { kind: "shelf-insert", ...point });
  assert.deepEqual(sent[0][0], [{ ...point, type: archiveShelfBlockForBookCount(3) }]);
  assert.deepEqual(engine.inventory, [{ item: tome, count: 1 }]);
});
