import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BlockId, Item, itemForBlock, type InventorySlot } from "../app/game/data";
import { VoxelEngine, normalizeMultiplayerPlayerState } from "../app/game/engine";
import { createDigitalItemVault, createDigitalCreatureArchive, digitalItemCapacity, digitalCreatureCapacity } from "../app/game/digital-storage";
import { homeLocation, locationId, universeId } from "../app/game/location-address";
import { prepareWaygridCapacity } from "../app/game/waygrid-capacity";
import { createSkillState } from "../app/game/skills";
import type { BlockAction, PeerInfo } from "../app/game/multiplayer";
import type { AgentCommandEnvelope, AgentCommandResult } from "../app/game/agent-platform";

const owner = locationId(homeLocation(universeId("waygrid-runtime"))), guest = "guest-waygrid", agent = "agent-waygrid";
const blocks = [BlockId.WaygridVaultTerminal, BlockId.WaygridCreatureArchive, BlockId.WaygridCellI, BlockId.WaygridCellII, BlockId.WaygridCellIII];
type Edit = { x: number; y: number; z: number; type: BlockId };
function harness() {
  const cells = new Map<string, BlockId>(), writes: Edit[] = [], drops: InventorySlot[] = [], messages: string[] = [], published: unknown[] = [], replies: BlockAction[] = [];
  const results: AgentCommandResult[] = [], leases: string[] = [], damage: number[] = [];
  const player = normalizeMultiplayerPlayerState({ playerId: guest, revision: 0, variant: "male", selected: 0,
    inventory: [{ item: Item.IronPickaxe, count: 1 }, ...Array(35).fill(null)], equipment: { head: null, chest: null, legs: null, feet: null },
    health: 10, hunger: 10, xp: 0, level: 1, skills: createSkillState() }, guest);
  const write = (edit: Edit) => { writes.push(edit); cells.set(`${edit.x},${edit.y},${edit.z}`, edit.type); };
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    world: { locationScope: { locationId: owner }, mutationRevision: 0,
      getBlock: (x: number, y: number, z: number) => cells.get(`${x},${y},${z}`) ?? BlockId.Air,
      setBlock: (x: number, y: number, z: number, type: BlockId) => { write({ x, y, z, type }); return true; },
      setBlocksBatch: (edits: Edit[]) => edits.forEach(write), setBlockFacing: () => {}, getBlockFacing: () => 0 },
    digitalItemVault: createDigitalItemVault([]), digitalCreatureArchive: createDigitalCreatureArchive([]),
    position: new THREE.Vector3(20, 32, 20), playerVariant: "male", crouching: false, yaw: 0,
    selected: 0, inventory: [{ item: Item.IronPickaxe, count: 1 }], mode: "survival", placeCooldown: 0,
    wayworks: new Map(), remotePlayers: new Map(), saplings: new Map(), multiplayerPlayerStates: new Map([[guest, player]]),
    events: { onToast: (message: string) => messages.push(message) }, audio: { play: () => {} },
    stationActorAccess: () => true, stationStructurePinned: () => false, tryFellTree: () => false,
    emitHud: () => {}, saveSoon: () => {}, spawnParticles: () => {}, gainSkillExperience: () => {},
    notifyLiquidChanged: () => {}, schedulePlantGrowth: () => {}, breakUnsupportedAround: () => {},
    publishBlockEdits: (edits: unknown) => published.push(edits), damageSelectedTool: () => damage.push(1),
    dropBlockLoot: (item: BlockId) => drops.push({ item, count: 1 }),
    spawnDrop: (item: number, count: number, _position: THREE.Vector3, durability?: number, metadata?: InventorySlot["metadata"]) => drops.push({ item, count, ...(durability === undefined ? {} : { durability }), ...(metadata === undefined ? {} : { metadata }) }),
    localNetworkPose: () => null, applyBlockEditFacings: () => {}, publishDestructionTombstones: () => {},
    ensureHostPlayerSession: () => engine.multiplayerPlayerStates.get(guest), sendAuthoritativePlayerState: () => {},
    agentBuildJobs: new Map(), agentBuildPreviews: new Map(), agentInventories: new Map([[agent, [{ item: Item.IronPickaxe, count: 1 }, ...Array(10).fill(null)]]]),
    agentInventoryRevisions: new Map(), agentReturningMaterials: new Map(),
    agentPose: () => ({ x: 0, y: 32, z: 0 }), agentAuthority: { get: () => ({ status: "approved" }),
      acquireLease: (_keys: string[], id: string) => { leases.push(id); return { ok: true }; }, releaseCommandLeases: () => {} },
    publishAgentResult: (result: AgentCommandResult) => { results.push(result); return result; },
    markAgentWork: () => {}, markPersistenceDirty: () => {}, showAgentBuildPreview: () => {},
    clearAgentBuildPreview: (id: string) => engine.agentBuildPreviews.delete(id),
  }) as VoxelEngine;
  const api = engine as unknown as { handleRemoteBlockAction(action: BlockAction, peer: PeerInfo): void;
    executeAgentCommand(command: AgentCommandEnvelope): AgentCommandResult; updateAgentBuildJobs(): void };
  const target = (type: BlockId, x = 3) => {
    cells.set(`${x},31,0`, BlockId.Stone);
    engine.target = { x, y: 32, z: 0, type, placeX: x, placeY: 32, placeZ: 0, distance: 1 };
  };
  const install = (type: BlockId, x = 3) => {
    const plan = prepareWaygridCapacity(owner, engine.digitalItemVault, engine.digitalCreatureArchive, [{ x, y: 32, z: 0, before: BlockId.Air, after: type }]);
    engine.digitalItemVault = plan.vault; engine.digitalCreatureArchive = plan.archive;
    cells.set(`${x},32,0`, type); target(type, x);
  };
  const role = (role: "host" | "guest") => {
    Object.assign(engine, { multiplayer: { role, identity: { id: role === "host" ? "host" : guest }, sendBlockAction: (action: BlockAction) => { replies.push(action); return 1; } },
      pendingGuestPlacementRequests: new Map() });
    engine.remotePlayers.set(guest, { target: { x: 0, y: 32, z: 0 }, model: { modelKind: "human" } } as never);
  };
  const action = (edits: Edit[], consumedItem?: number): BlockAction => ({ requestId: "waygrid-action", actorId: guest, tick: 1, kind: edits.length > 1 ? "batch" : consumedItem ? "place" : "break", status: "request", edits, selectedSlot: 0, ...(consumedItem ? { consumedItem } : {}) });
  const run = (kind: AgentCommandEnvelope["kind"], args: object) => api.executeAgentCommand({ schema: 1, scope: { locationId: owner, epoch: 1, revision: 0 }, issuedAt: Date.now(), expectedWorldRevision: 0, commandId: `wg-${kind}`, agentId: agent, kind, arguments: args, expiresAt: Date.now() + 60_000 } as AgentCommandEnvelope);
  return { engine, api, cells, writes, drops, messages, published, replies, results, leases, damage, target, install, role, action, run,
    peer: { identity: { id: guest, name: "Guest", color: "#ffffff" } } as PeerInfo };
}

for (const type of blocks) test(`actual local placement and break register Waygrid ${type} exactly once`, () => {
  const h = harness(); h.target(BlockId.Air); h.engine.inventory = [{ item: itemForBlock(type), count: 1 }];
  h.engine.placeBlock(); assert.equal(h.writes.length, 1); assert.equal(h.engine.inventory[0], null);
  assert.ok(digitalItemCapacity(h.engine.digitalItemVault) + digitalCreatureCapacity(h.engine.digitalCreatureArchive) > 0);
  h.target(type); h.engine.inventory = [{ item: Item.CrystalPickaxe, count: 1 }]; h.engine.breakTarget();
  assert.equal(h.writes.length, 2); assert.equal(h.engine.digitalItemVault.cells.length, 0); assert.equal(h.engine.digitalCreatureArchive.cells.length, 0);
  assert.equal(h.drops.length, 1);
});

test("legacy local place/break refuse before world, inventory, tool and drops", () => {
  for (const place of [true, false]) {
    const h = harness(); h.engine.digitalItemVault = createDigitalItemVault([{ id: "terminal:item:3,32,0", tier: 1 }]);
    h.target(place ? BlockId.Air : BlockId.WaygridVaultTerminal);
    if (!place) h.cells.set("3,32,0", BlockId.WaygridVaultTerminal);
    h.engine.inventory = [{ item: place ? Item.WaygridVaultTerminalItem : Item.IronPickaxe, count: 1 }];
    const before = structuredClone([h.engine.digitalItemVault, h.engine.digitalCreatureArchive, h.engine.inventory]);
    if (place) h.engine.placeBlock(); else h.engine.breakTarget();
    assert.deepEqual([h.engine.digitalItemVault, h.engine.digitalCreatureArchive, h.engine.inventory], before);
    assert.deepEqual([h.writes, h.drops, h.published, h.damage], [[], [], [], []]); assert.match(h.messages.at(-1)!, /legacy/);
  }
});

test("guest local edits are intent-only, and accepted/rejected reply replay never changes capacity", () => {
  const h = harness(); h.role("guest"); h.install(BlockId.WaygridCellII);
  const before = structuredClone([h.engine.digitalItemVault, h.engine.digitalCreatureArchive, h.engine.inventory]);
  h.engine.breakTarget(); assert.equal(h.published.length, 1); assert.deepEqual(h.writes, []); assert.deepEqual(h.drops, []); assert.deepEqual(h.damage, []);
  h.cells.set("3,32,0", BlockId.Air); h.target(BlockId.Air); h.engine.inventory = [{ item: Item.WaygridCellIIItem, count: 1 }]; h.engine.placeBlock();
  assert.equal(h.published.length, 2); assert.deepEqual(h.writes, []); assert.equal(h.engine.inventory[0]!.count, 1);
  for (const status of ["accepted", "accepted", "rejected"] as const) h.api.handleRemoteBlockAction({ ...h.action([{ x: 3, y: 32, z: 0, type: BlockId.Air }]), status }, h.peer);
  assert.deepEqual([h.engine.digitalItemVault, h.engine.digitalCreatureArchive], before.slice(0, 2)); assert.deepEqual(h.drops, []);
});

test("host guest placement owns capacity; unsafe overflow refuses before teardown and empty removal is idempotent", () => {
  const h = harness(); h.role("host"); h.engine.multiplayerPlayerStates.get(guest)!.inventory[0] = { item: Item.WaygridVaultTerminalItem, count: 1 };
  const place = h.action([{ x: 3, y: 32, z: 0, type: BlockId.WaygridVaultTerminal }], Item.WaygridVaultTerminalItem);
  h.api.handleRemoteBlockAction(place, h.peer); assert.equal(h.replies.at(-1)!.status, "accepted"); assert.equal(digitalItemCapacity(h.engine.digitalItemVault), 1000);
  assert.equal(h.engine.multiplayerPlayerStates.get(guest)!.inventory[0], null);
  h.engine.digitalItemVault = { ...h.engine.digitalItemVault, stacks: [{ item: Item.IronIngot, count: 70, metadata: { batch: "exact" } }] };
  h.engine.multiplayerPlayerStates.get(guest)!.inventory[0] = { item: Item.IronPickaxe, count: 1 };
  const remove = h.action([{ x: 3, y: 32, z: 0, type: BlockId.Air }]);
  const filled = structuredClone(h.engine.digitalItemVault);
  h.api.handleRemoteBlockAction(remove, h.peer);
  assert.equal(h.replies.at(-1)!.status, "rejected"); assert.match(h.replies.at(-1)!.reason!, /Withdraw/);
  assert.deepEqual(h.engine.digitalItemVault, filled); assert.equal(h.writes.length, 1); assert.deepEqual(h.drops, []);
  h.engine.digitalItemVault = { ...h.engine.digitalItemVault, stacks: [] };
  h.api.handleRemoteBlockAction(remove, h.peer); h.api.handleRemoteBlockAction(remove, h.peer);
  assert.equal(h.engine.digitalItemVault.cells.length, 0); assert.equal(h.drops.length, 1);
});

test("host mixed removal refuses the whole batch before any teardown or publication", () => {
  const h = harness(); h.role("host"); h.install(BlockId.WaygridVaultTerminal, 3);
  h.cells.set("4,32,0", BlockId.WaygridCellI);
  h.engine.digitalItemVault = { ...h.engine.digitalItemVault, cells: [...h.engine.digitalItemVault.cells, { id: "cell:4,32,0", tier: 1 }] };
  h.engine.digitalCreatureArchive = createDigitalCreatureArchive([{ id: "cell:4,32,0", tier: 1 }]);
  const before = structuredClone([h.engine.digitalItemVault, h.engine.digitalCreatureArchive, h.engine.multiplayerPlayerStates]);
  h.api.handleRemoteBlockAction(h.action([3, 4].map(x => ({ x, y: 32, z: 0, type: BlockId.Air }))), h.peer);
  assert.equal(h.replies.at(-1)!.status, "rejected"); assert.deepEqual([h.writes, h.drops, h.published], [[], [], []]);
  assert.deepEqual([h.engine.digitalItemVault, h.engine.digitalCreatureArchive, h.engine.multiplayerPlayerStates], before);
});

test("agent gather removes registered capacity and refuses legacy before acquiring leases", () => {
  for (const legacy of [false, true]) {
    const h = harness(); h.install(BlockId.WaygridCellI, 1);
    if (legacy) { h.engine.digitalItemVault = createDigitalItemVault([{ id: "cell:1,32,0", tier: 1 }]); h.engine.digitalCreatureArchive = createDigitalCreatureArchive([{ id: "cell:1,32,0", tier: 1 }]); }
    const result = h.run("gather_resource", { block: BlockId.WaygridCellI, radius: 2 });
    assert.equal(result.status, legacy ? "blocked" : "completed");
    assert.equal(h.writes.length, legacy ? 0 : 1); assert.equal(h.leases.length, legacy ? 0 : 1);
    assert.equal(h.engine.digitalItemVault.cells.length, legacy ? 1 : 0);
    assert.equal(h.engine.agentInventories.get(agent)!.filter(slot => slot?.item === Item.WaygridCellIItem).length, legacy ? 0 : 1);
  }
});

test("agent preview and commit revalidate capacity before reserving materials", () => {
  const h = harness(); h.engine.agentInventories.set(agent, [{ item: Item.WaygridCellIItem, count: 1 }, ...Array(10).fill(null)]);
  const preview = h.run("build_plan", { placements: [{ x: 3, y: 32, z: 0, block: BlockId.WaygridCellI }] });
  assert.equal(preview.status, "completed"); const previewId = preview.data!.previewId;
  h.engine.digitalItemVault = createDigitalItemVault([{ id: "cell:3,32,0", tier: 1 }]);
  assert.equal(h.run("build_commit", { previewId }).code, "waygrid_capacity_conflict");
  assert.equal(h.engine.agentInventories.get(agent)![0]!.count, 1); assert.deepEqual([h.writes, h.leases], [[], []]);
  assert.equal(h.run("build_plan", { placements: [{ x: 3, y: 32, z: 0, block: BlockId.WaygridCellI }] }).code, "waygrid_capacity_conflict");
});

test("queued agent placement registers capacity; later same-revision conflict refunds untouched reservation", () => {
  for (const conflict of [false, true]) {
    const h = harness(); h.engine.agentInventories.set(agent, [{ item: Item.WaygridCellIItem, count: 1 }, ...Array(10).fill(null)]);
    const preview = h.run("build_plan", { placements: [{ x: 3, y: 32, z: 0, block: BlockId.WaygridCellI }] });
    assert.equal(h.run("build_commit", { previewId: preview.data!.previewId }).status, "running");
    if (conflict) h.engine.digitalItemVault = createDigitalItemVault([{ id: "cell:3,32,0", tier: 1 }]);
    for (let i = 0; i < 4 && h.engine.agentBuildJobs.size; i++) h.api.updateAgentBuildJobs();
    assert.equal(h.engine.agentBuildJobs.size, 0); assert.equal(h.writes.length, conflict ? 0 : 1);
    assert.equal(h.engine.agentInventories.get(agent)!.filter(slot => slot?.item === Item.WaygridCellIItem).reduce((sum, slot) => sum + slot!.count, 0), conflict ? 1 : 0);
    if (!conflict) { assert.equal(digitalItemCapacity(h.engine.digitalItemVault), 1000); assert.equal(digitalCreatureCapacity(h.engine.digitalCreatureArchive), 16); }
  }
});

test("agent removal and direct replacement keep both capacity stores in sync", () => {
  for (const replace of [false, true]) {
    const h = harness(); h.install(BlockId.WaygridCellI);
    h.engine.agentInventories.set(agent, [{ item: Item.WaygridCellIIItem, count: 1 }, ...Array(10).fill(null)]);
    const preview = h.run("build_plan", replace ? { placements: [{ x: 3, y: 32, z: 0, block: BlockId.WaygridCellII, replace: true }] }
      : { placements: [], removals: [{ x: 3, y: 32, z: 0 }] });
    assert.equal(preview.status, "completed");
    assert.equal(h.run("build_commit", { previewId: preview.data!.previewId }).status, "running");
    for (let i = 0; i < 4 && h.engine.agentBuildJobs.size; i++) h.api.updateAgentBuildJobs();
    assert.equal(h.writes.length, 1); assert.equal(digitalItemCapacity(h.engine.digitalItemVault), replace ? 10000 : 0);
    assert.equal(digitalCreatureCapacity(h.engine.digitalCreatureArchive), replace ? 160 : 0);
  }
});

test("full-cell relocation refuses preview before even an earlier unrelated removal", () => {
  const h = harness(); h.install(BlockId.WaygridCellII);
  h.cells.set("2,32,0", BlockId.Stone);
  h.engine.digitalItemVault = { ...h.engine.digitalItemVault, stacks: [{ item: Item.IronIngot, count: 9000, metadata: { exact: "retained" } }] };
  h.engine.agentInventories.set(agent, [{ item: Item.WaygridCellIIItem, count: 1 }, ...Array(10).fill(null)]);
  const before = structuredClone([h.engine.digitalItemVault, h.engine.digitalCreatureArchive, h.engine.agentInventories]);
  const result = h.run("build_plan", { placements: [{ x: 4, y: 32, z: 0, block: BlockId.WaygridCellII }], removals: [{ x: 2, y: 32, z: 0 }, { x: 3, y: 32, z: 0 }] });
  assert.equal(result.code, "waygrid_capacity_conflict"); assert.match(result.message, /Withdraw/);
  assert.deepEqual([h.writes, h.drops, h.leases], [[], [], []]);
  assert.deepEqual([h.engine.digitalItemVault, h.engine.digitalCreatureArchive, h.engine.agentInventories], before);
});

test("local full CellIII refusal retains stores and the entire existing drop pool", () => {
  const h = harness(); h.install(BlockId.WaygridCellIII);
  h.engine.digitalItemVault = { ...h.engine.digitalItemVault, stacks: [{ item: BlockId.Stone, count: 100000, metadata: { exact: [1, "pool"] } }] };
  h.engine.inventory = [{ item: Item.CrystalPickaxe, count: 1 }];
  Object.assign(h.engine, { drops: Array.from({ length: 120 }, (_, id) => ({ id, item: Item.IronIngot, count: 1 })),
    spawnDrop: () => assert.fail("Overflow must refuse before entering the evicting spawnDrop path") });
  const before = structuredClone([h.engine.digitalItemVault, h.engine.digitalCreatureArchive, h.engine.drops]);
  h.engine.breakTarget(); assert.match(h.messages.at(-1)!, /Withdraw/);
  assert.deepEqual([h.engine.digitalItemVault, h.engine.digitalCreatureArchive, h.engine.drops], before);
  assert.deepEqual([h.writes, h.damage, h.published], [[], [], []]);
});
