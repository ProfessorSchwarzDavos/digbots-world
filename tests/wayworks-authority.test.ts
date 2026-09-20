import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BlockId, Item, type InventorySlot } from "../app/game/data.ts";
import { VoxelEngine, normalizeMultiplayerPlayerState } from "../app/game/engine.ts";
import { validatePayload, validFacilityOperation, type BlockAction, type FacilityAction, type PeerInfo } from "../app/game/multiplayer.ts";
import { createMachine } from "../app/game/wayworks.ts";
import { createDigitalCreatureArchive, createDigitalItemVault, digitalItemCount, digitalStackSignature } from "../app/game/digital-storage.ts";
import { operateWaygrid } from "../app/game/wayworks-waygrid.ts";
import { createSkillState } from "../app/game/skills.ts";
import { type AgentCommandEnvelope, type AgentCommandResult } from "../app/game/agent-platform.ts";
import { homeLocation, locationId, universeId } from "../app/game/location-address.ts";

const guest = "player_workshop_guest";
function harness() {
  const state = createMachine("powered-crusher", "L", "local"); state.workshop.security = "public";
  const player = normalizeMultiplayerPlayerState({ playerId: guest, revision: 0, variant: "female", selected: 0,
    inventory: [{ item: Item.RawIron, count: 3, metadata: { provenance: "ore-a" } }, ...Array(35).fill(null)],
    equipment: { head: null, chest: null, legs: null, feet: null }, health: 10, hunger: 10, xp: 0, level: 1, skills: createSkillState() }, guest);
  const responses: FacilityAction[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    wayworks: new Map([["0,0,0", state]]), wayworksActorReady: new Map(), wayworksActorClipboards: new Map(),
    multiplayer: { role: "host", identity: { id: "host" }, getPeer: () => ({}), sendFacilityAction: (action: FacilityAction) => { responses.push(action); return 1; } },
    remotePlayers: new Map([[guest, { target: { x: 0, y: 0, z: 1 } }]]),
    world: { getBlock: () => BlockId.PoweredCrusher, locationScope: { locationId: "L" } },
    multiplayerPlayerStates: new Map([[guest, player]]), multiplayerPeerActiveFacilities: new Map(),
    multiplayerPeerFacilitySignatures: new Map(), multiplayerFacilityRevisions: new Map(), multiplayerFacilitySignatures: new Map(),
    ensureHostPlayerSession: () => engine.multiplayerPlayerStates.get(guest),
    queueCriticalReliableRequest: (_key: string, send: () => number) => { send(); return true; },
    activeSharedFacility: () => null, emitHud: () => {}, saveSoon: () => {}, position: new THREE.Vector3(),
  }) as VoxelEngine;
  const api = engine as unknown as { handleRemoteFacilityAction(action: FacilityAction, peer: PeerInfo): void; syncMultiplayerFacilities(): void };
  const peer = { identity: { id: guest, name: "Guest", color: "#ffffff" } } as PeerInfo;
  const base: FacilityAction = { requestId: "facility_test_open", actorId: guest, facilityId: "wayworks:0,0,0", facilityKind: "wayworks", kind: "open", status: "request" };
  api.handleRemoteFacilityAction(base, peer);
  const transact = (patch: Partial<FacilityAction> = {}) => api.handleRemoteFacilityAction({ ...base, requestId: "facility_test_tx", kind: "transact", expectedRevision: 0, expectedPlayerRevision: 0,
    operation: { kind: "workshop", inventorySlot: 0, action: { kind: "slot", slot: "input", direction: "insert", maximum: 2 } }, ...patch }, peer);
  return { engine, api, responses, transact, peer, base };
}

test("typed facility wire rejects opaque state, unknown actions, extra intent fields and unbounded quantities", () => {
  const operation = { kind: "workshop", inventorySlot: 0, action: { kind: "slot", slot: "input", direction: "insert", maximum: 2 } };
  assert.equal(validFacilityOperation(operation), true);
  assert.equal(validFacilityOperation({ ...operation, inventorySlot: 36 }), false);
  assert.equal(validFacilityOperation({ ...operation, afterImage: {} }), false);
  assert.equal(validFacilityOperation({ ...operation, action: { ...operation.action, maximum: 65 } }), false);
  const packet = { requestId: "facility_wire_001", actorId: guest, facilityId: "wayworks:0,0,0", facilityKind: "wayworks", kind: "transact", status: "request", expectedRevision: 0, expectedPlayerRevision: 0, operation };
  assert.equal(validatePayload("facility-action", packet), true);
  assert.equal(validatePayload("facility-action", { ...packet, state: {} }), false);
  assert.equal(validatePayload("facility-action", { ...packet, playerState: {} }), false);
  assert.equal(validatePayload("facility-action", { ...packet, expectedPlayerRevision: undefined }), false);
});

test("host workshop commit preserves exact metadata and repeated/stale requests cannot mint", () => {
  const h = harness(); assert.equal(h.responses.at(-1)?.status, "accepted");
  h.transact(); assert.equal(h.responses.at(-1)?.status, "accepted");
  assert.equal(h.engine.wayworks.get("0,0,0")!.workshop.slots.input?.count, 2);
  assert.deepEqual(h.engine.wayworks.get("0,0,0")!.workshop.slots.input?.metadata, { provenance: "ore-a" });
  assert.equal(h.engine.multiplayerPlayerStates.get(guest)!.inventory[0]?.count, 1);
  h.transact(); assert.equal(h.responses.at(-1)?.status, "rejected");
  assert.equal(h.engine.wayworks.get("0,0,0")!.workshop.slots.input?.count, 2);
  assert.equal(h.engine.multiplayerPlayerStates.get(guest)!.revision, 1);
});

test("public service is not configuration ownership; reach, location and revoked access fail closed", () => {
  const h = harness();
  h.engine.multiplayerPlayerStates.get(guest)!.inventory[0] = { item: Item.FieldWrench, count: 1 };
  h.transact({ operation: { kind: "workshop", inventorySlot: 0, action: { kind: "security", mode: "public" } } });
  assert.equal(h.responses.at(-1)?.status, "rejected");
  h.engine.remotePlayers.get(guest)!.target.x = 20; h.transact(); assert.equal(h.responses.at(-1)?.status, "rejected");
  h.engine.remotePlayers.get(guest)!.target.x = 0;
  h.engine.wayworks.get("0,0,0")!.locationId = "other"; h.transact(); assert.equal(h.responses.at(-1)?.status, "rejected");
  h.engine.wayworks.get("0,0,0")!.locationId = "L";
  h.engine.wayworks.get("0,0,0")!.workshop.security = "owner"; h.api.syncMultiplayerFacilities();
  assert.equal(h.engine.multiplayerPeerActiveFacilities.has(guest), false);
  assert.equal(h.responses.at(-1)?.kind, "close"); assert.equal(h.responses.at(-1)?.state, undefined);
});

test("Waygrid uses exact inventory room and one existing vault, including partial withdrawal", () => {
  const archive = createDigitalCreatureArchive(), empty = createDigitalItemVault();
  const source: InventorySlot = { item: Item.IronIngot, count: 8, metadata: { batch: "same" } };
  const deposit = operateWaygrid(empty, archive, [source, null], { kind: "deposit-item", inventorySlot: 0 });
  assert.equal(deposit.ok, true); assert.equal(deposit.powerJ, 400); assert.equal(deposit.inventory[0], null);
  const occupied: (InventorySlot | null)[] = [{ ...source, count: 63 }, { item: Item.IronIngot, count: 64, metadata: { batch: "different" } }];
  const withdraw = operateWaygrid(deposit.vault, archive, occupied, { kind: "withdraw-item", signature: digitalStackSignature(source), count: 8 });
  assert.equal(withdraw.moved, 1); assert.equal(withdraw.powerJ, 50); assert.equal(digitalItemCount(withdraw.vault), 7);
  assert.equal(withdraw.inventory[0]?.count, 64); assert.equal(occupied[0]?.count, 63);
  const blocked = operateWaygrid(withdraw.vault, archive, withdraw.inventory, { kind: "withdraw-item", signature: digitalStackSignature(source), count: 8 });
  assert.equal(blocked.ok, false); assert.strictEqual(blocked.vault, withdraw.vault);
  assert.equal(digitalItemCount(empty), 0);
});

test("Waygrid power quote requires live adjacent service, and all terminal aliases share a revision", () => {
  const h = harness(), battery = createMachine("field-battery", "L", "local"); battery.energyJ = 1000;
  h.engine.wayworks = new Map([["0,0,1", battery]]);
  h.engine.world.getBlock = (x, _y, z) => x === 0 && z === 1 ? BlockId.FieldBattery : BlockId.WaygridVaultTerminal;
  const api = h.engine as unknown as { waygridPowerSource(key: string, joules: number): { key: string } | null; currentFacilityRevision(kind: string, key: string, state: Record<string, unknown>): number };
  assert.equal(api.waygridPowerSource("0,0,0", 1000)?.key, "0,0,1");
  battery.ports.front = "input"; assert.equal(api.waygridPowerSource("0,0,0", 1000), null);
  battery.ports.front = "service"; assert.ok(api.waygridPowerSource("0,0,0", 1000));
  battery.workshop.control = "signal-on"; assert.equal(api.waygridPowerSource("0,0,0", 1), null);
  const first = api.currentFacilityRevision("waygrid-items", "a", { stacks: [] });
  assert.equal(api.currentFacilityRevision("waygrid-items", "b", { stacks: [] }), first);
  assert.equal(api.currentFacilityRevision("waygrid-items", "b", { stacks: [{ item: 1, count: 1 }] }), first + 1);
});

test("agent sealed placement and pickup preserve stores, reject stale inventory and require a real tool", () => {
  const h = harness(), id = "drone_cf4", state = createMachine("field-battery", "L", "local"); state.energyJ = 4321;
  const pack: (InventorySlot | null)[] = [{ item: BlockId.FieldBattery, count: 1, metadata: { wayworks: state } }, null, null];
  let block = BlockId.Air;
  Object.assign(h.engine, { wayworks: new Map(), agentInventories: new Map([[id, pack]]), agentInventoryRevisions: new Map(),
    agentBuildJobs: new Map(), agentAuthority: { get: () => ({ granted: ["build", "inventory.self.write"] }) },
    agentPose: () => ({ x: 0, y: 0, z: 0 }), publishAgentResult: (result: AgentCommandResult) => result,
    markPersistenceDirty: () => {}, clearWayworksModels: () => {}, publishBlockEdits: () => {}, currentPlayerHeight: () => 1.8,
    position: new THREE.Vector3(20, 0, 20), remotePlayers: new Map(),
    world: { getBlock: () => block, setBlock: (_x: number, _y: number, _z: number, value: BlockId) => { block = value; }, setBlocksBatch: (edits: { type: BlockId }[]) => { block = edits[0].type; }, setBlockFacing: () => {}, mutationRevision: 1, locationScope: { locationId: "L" } } });
  const api = h.engine as unknown as { executeAgentCommand(command: AgentCommandEnvelope): AgentCommandResult };
  const run = (kind: AgentCommandEnvelope["kind"], args: Record<string, unknown>) => api.executeAgentCommand({ schema: 1, scope: { locationId: locationId(homeLocation(universeId("cf4-test"))), epoch: 1, revision: 1 },
    commandId: "cmd_cf4", agentId: id, kind, expectedWorldRevision: 1, issuedAt: Date.now(), expiresAt: Date.now() + 10000, arguments: args } as AgentCommandEnvelope);
  const placement = { inventorySlot: 0, expectedInventoryRevision: 0, target: { x: 2, y: 0, z: 0 }, facing: 1 };
  assert.equal(run("workshop_place", placement).status, "completed"); assert.equal(pack[0], null);
  assert.equal(h.engine.wayworks.get("2,0,0")?.energyJ, 4321);
  assert.deepEqual(h.engine.wayworks.get("2,0,0")?.workshop.trusted, [id]);
  assert.equal(run("workshop_place", placement).status, "blocked");
  const pickup = { targetId: "workshop:2,0,0", inventorySlot: 1, expectedInventoryRevision: 1, expectedMachineRevision: 1 };
  assert.equal(run("workshop_pickup", pickup).code, "workshop_pickaxe_required");
  pack[2] = { item: Item.IronPickaxe, count: 1 };
  assert.equal(run("workshop_pickup", pickup).status, "completed");
  assert.equal(block, BlockId.Air); assert.equal(h.engine.wayworks.size, 0);
  const carried = h.engine.agentInventories.get(id)![1]!;
  assert.equal((carried.metadata!.wayworks as typeof state).energyJ, 4321);
  assert.equal(run("workshop_pickup", pickup).status, "blocked");
});

test("guest block lifecycle consumes the host instance and emits one sealed pickup", () => {
  const h = harness(), machine = createMachine("field-battery", "L", "local"); machine.energyJ = 9876;
  machine.workshop.upgrades.capacity = 1;
  const player = h.engine.multiplayerPlayerStates.get(guest)!;
  player.inventory[0] = { item: BlockId.FieldBattery, count: 1, metadata: { wayworks: machine } };
  let block = BlockId.Air; const drops: InventorySlot[] = [], replies: BlockAction[] = [];
  Object.assign(h.engine, { wayworks: new Map(), mode: "survival", localNetworkPose: () => null,
    worldBlockFacing: () => 0, applyBlockEditFacings: () => {}, publishDestructionTombstones: () => {},
    sendAuthoritativePlayerState: () => {},
    world: { getBlock: () => block, setBlocksBatch: (edits: BlockAction["edits"]) => { block = edits[0].type as BlockId; }, locationScope: { locationId: "L" } },
    spawnDrop: (item: number, count: number, _position: THREE.Vector3, durability?: number, metadata?: InventorySlot["metadata"]) => { drops.push({ item, count, ...(durability === undefined ? {} : { durability }), ...(metadata ? { metadata } : {}) }); },
  });
  Object.assign(h.engine.multiplayer!, { sendBlockAction: (action: BlockAction) => { replies.push(action); return 1; } });
  const api = h.engine as unknown as { handleRemoteBlockAction(action: BlockAction, peer: PeerInfo): void };
  const place: BlockAction = { requestId: "guest_place_machine", actorId: guest, tick: 1, kind: "place", status: "request", consumedItem: BlockId.FieldBattery, selectedSlot: 0,
    edits: [{ x: 3, y: 0, z: 0, type: BlockId.FieldBattery, facing: 0 }] };
  api.handleRemoteBlockAction(place, h.peer);
  assert.equal(replies.at(-1)?.status, "accepted"); assert.equal(h.engine.multiplayerPlayerStates.get(guest)!.inventory[0], null);
  assert.equal(h.engine.wayworks.get("3,0,0")?.energyJ, 9876); assert.equal(h.engine.wayworks.get("3,0,0")?.ownerId, guest);
  api.handleRemoteBlockAction(place, h.peer); assert.equal(replies.at(-1)?.status, "rejected");
  h.engine.multiplayerPlayerStates.get(guest)!.inventory[0] = { item: Item.IronPickaxe, count: 1 };
  const pickup: BlockAction = { requestId: "guest_pickup_machine", actorId: guest, tick: 2, kind: "break", status: "request", selectedSlot: 0, edits: [{ x: 3, y: 0, z: 0, type: BlockId.Air }] };
  api.handleRemoteBlockAction(pickup, h.peer);
  assert.equal(replies.at(-1)?.status, "accepted"); assert.equal(drops.length, 1);
  assert.equal((drops[0].metadata!.wayworks as typeof machine).energyJ, 9876);
  assert.equal((drops[0].metadata!.wayworks as typeof machine).workshop.upgrades.capacity, 1);
  assert.equal(h.engine.wayworks.size, 0);
  api.handleRemoteBlockAction(pickup, h.peer); assert.equal(drops.length, 1);
});
