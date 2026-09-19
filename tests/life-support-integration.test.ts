import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BlockId, Item, ITEMS, CREATIVE_ITEMS, RECIPES, type InventorySlot, type EquipmentSlot } from "../app/game/data.ts";
import { VoxelEngine, normalizeMultiplayerPlayerState, multiplayerContainerTransactionConservesItems } from "../app/game/engine.ts";
import { validatePayload, type InventoryAction, type PlayerSessionSnapshot, type PeerInfo } from "../app/game/multiplayer.ts";
import { applyContainerOperation } from "../app/game/multiplayer-inventory.ts";
import { bodyEnvironment } from "../app/game/celestial-environment.ts";
import { createWaystarCatalog } from "../app/game/celestial-catalog.ts";
import { EMPTY_LIFE_SUPPORT, lifeSupportStore, sourceOxygen, withLifeSupport, lifeSupportResourceTotals } from "../app/game/life-support.ts";
import { validateAgentCustody } from "../app/game/agent-custody.ts";
import { validateLocationPlayerState } from "../app/game/location-manager.ts";
import { BlockPlayerModel } from "../app/game/player-model.ts";

const home = bodyEnvironment(createWaystarCatalog().bodies.find(body => body.id === "blockwild")!);
const vacuum = { ...home, breathable: false, pressureKPa: 0, requiresPressureSuit: true, gravityG: 0 };
const blank = (): Record<EquipmentSlot, InventorySlot | null> => ({ head: null, chest: null, legs: null, feet: null, back: null });
const tank = (oxygenMl = 90_000): InventorySlot => {
  const item = { item: Item.LightOxygenTank, count: 1, metadata: { serial: "exact-tank" } };
  return withLifeSupport(item, { ...lifeSupportStore(item), oxygenMl });
};
const rig = (): InventorySlot => {
  const item = { item: Item.EvaManeuverRig, count: 1 };
  return withLifeSupport(item, { ...lifeSupportStore(item), energyJ: 1000, sockets: [tank(), null] });
};
type Runtime = Pick<VoxelEngine, keyof VoxelEngine> & {
  updatePersonalLifeSupport(dt: number): void;
  updateEvaMotion(dt: number, zeroG: boolean, submerged: boolean): void;
  handleRemoteInventoryAction(action: InventoryAction, peer: PeerInfo): void;
  equipmentSwap: unknown;
  socketSwap: unknown;
};
function engineHarness(environment = home) {
  const messages: string[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    equipment: blank(), inventory: Array<InventorySlot | null>(36).fill(null), cursor: null,
    bodyContext: () => ({ environment }), keys: new Set<string>(), position: new THREE.Vector3(0, 5, 0),
    velocity: new THREE.Vector3(), cameraEyeHeight: 1.6, yaw: 0, pitch: 0, mode: "survival", health: 10,
    lifeSupportState: { ...EMPTY_LIFE_SUPPORT }, world: { getBlock: () => BlockId.Air },
    audio: { play: () => undefined }, events: { onToast: (message: string) => messages.push(message) },
    saveSoon: () => undefined, emitHud: () => undefined, syncInventoryMutationNow: () => undefined,
    damagePlayer: (amount: number) => { engine.health -= amount; }, collidesAt: () => false,
    evaEnabled: false, evaBootsEnabled: true, evaStableUp: true,
  }) as Runtime;
  return { engine, messages };
}

test("all named gear has creative, recipe and explicit equipment representation", () => {
  const entries = Object.values(ITEMS).filter(item => item.lifeSupportKind);
  assert.equal(entries.length, 15);
  for (const definition of entries) {
    assert.ok(CREATIVE_ITEMS.includes(definition.id));
    assert.equal(definition.maxStack, 1);
    if (definition.id !== Item.FieldOxygenReserve) assert.ok(RECIPES.some(recipe => recipe.output.item === definition.id));
  }
  assert.equal(ITEMS[Item.FieldBreatherHelmet].equipmentSlot, "head");
  assert.equal(ITEMS[Item.PressureWeaveChest].equipmentSlot, "chest");
  for (const item of [Item.LightOxygenTank, Item.ExpeditionOxygenTank, Item.TwinTankHarness, Item.EvaManeuverRig, Item.AurelianSpellRig, Item.DiveHarness]) assert.equal(ITEMS[item].equipmentSlot, "back");
});

test("normal back equip and shift-unequip preserve finite metadata and chest armor", () => {
  const { engine } = engineHarness();
  const chest = { item: Item.PressureWeaveChest, count: 1, durability: 600 };
  engine.equipment.chest = chest; engine.cursor = tank();
  engine.equipmentClick("back", "left");
  assert.equal(engine.cursor, null); assert.deepEqual(engine.equipment.chest, chest);
  assert.deepEqual(engine.equipment.back, tank());
  engine.equipmentClick("back", "left", true);
  assert.equal(engine.equipment.back, null); assert.deepEqual(engine.inventory[0], tank());
});

test("vacuum equipment swap is delayed, interruptible and does not move either owner early", () => {
  const { engine } = engineHarness(vacuum);
  engine.equipment.back = tank(); engine.cursor = { item: Item.ExpeditionOxygenTank, count: 1 };
  engine.equipmentClick("back", "left");
  engine.updatePersonalLifeSupport(.5);
  assert.deepEqual(engine.equipment.back, tank()); assert.equal(engine.cursor.item, Item.ExpeditionOxygenTank);
  engine.cursor = { item: Item.TetherSpool, count: 1 };
  engine.updatePersonalLifeSupport(.5);
  assert.deepEqual(engine.equipment.back, tank()); assert.equal(engine.cursor.item, Item.TetherSpool);
  engine.cursor = { item: Item.ExpeditionOxygenTank, count: 1 };
  engine.equipmentClick("back", "left");
  engine.updatePersonalLifeSupport(.75); engine.updatePersonalLifeSupport(.75);
  assert.equal(engine.equipment.back?.item, Item.ExpeditionOxygenTank); assert.deepEqual(engine.cursor, tank());
});

test("socket swaps delay exact tank exchange and cancellation preserves custody", () => {
  const { engine } = engineHarness(vacuum);
  engine.equipment.back = rig(); engine.cursor = tank(12_345);
  assert.equal(engine.lifeSupportAction({ kind: "socket", index: 1 }), true);
  engine.updatePersonalLifeSupport(.5);
  assert.equal(lifeSupportStore(engine.equipment.back!).sockets[1], null);
  engine.lifeSupportAction({ kind: "socket", index: 1 });
  assert.equal(lifeSupportStore(engine.equipment.back!).sockets[1], null); assert.deepEqual(engine.cursor, tank(12_345));
  engine.lifeSupportAction({ kind: "socket", index: 1 });
  engine.updatePersonalLifeSupport(.75); engine.updatePersonalLifeSupport(.75);
  assert.equal(engine.cursor, null); assert.deepEqual(lifeSupportStore(engine.equipment.back!).sockets[1], tank(12_345));
});

test("closing inventory retains a pending incoming swap and metadata on overflow drops", () => {
  const { engine } = engineHarness(vacuum);
  Object.assign(engine, { craftGrid: Array(9).fill(null), hideChestModel: () => undefined });
  engine.equipment.back = rig(); engine.cursor = tank(12_345);
  engine.equipmentClick("back", "left"); engine.closeContainer();
  assert.deepEqual(engine.cursor, tank(12_345));
  engine.updatePersonalLifeSupport(.75); engine.updatePersonalLifeSupport(.75);
  assert.deepEqual(engine.equipment.back, tank(12_345)); assert.equal(engine.cursor?.item, Item.EvaManeuverRig);
  const drops: InventorySlot[] = [];
  Object.assign(engine, { inventory: Array.from({ length: 36 }, () => ({ item: Item.TetherSpool, count: 1 })),
    spawnDrop: (item: number, count: number, _position: THREE.Vector3, durability?: number, metadata?: Record<string, unknown>) => drops.push({ item, count, ...(durability === undefined ? {} : { durability }), ...(metadata ? { metadata } : {}) }),
  });
  const carried = structuredClone(engine.cursor);
  engine.closeContainer();
  assert.equal(engine.cursor, null); assert.deepEqual(drops, [carried]);
});

test("six signed EVA axes require an armed rig and spend both resources", () => {
  for (const [key, axis, sign] of [["KeyW", "z", -1], ["KeyS", "z", 1], ["KeyA", "x", -1], ["KeyD", "x", 1], ["Space", "y", 1], ["ShiftLeft", "y", -1]] as const) {
    const { engine } = engineHarness(vacuum); engine.equipment.back = rig(); engine.keys.add(key);
    engine.updateEvaMotion(.5, true, false); assert.equal(engine.velocity.length(), 0);
    engine.evaEnabled = true; engine.updateEvaMotion(.5, true, false);
    assert.equal(engine.velocity[axis], 1.9 * sign); assert.equal(lifeSupportStore(engine.equipment.back!).energyJ, 950); assert.equal(sourceOxygen(engine.equipment.back).amount, 89_900);
  }
});

test("magnetic boots require surface contact and camera comfort does not change velocity", () => {
  const { engine } = engineHarness(vacuum); engine.equipment.feet = { item: Item.MagneticBoots, count: 1, durability: 600 };
  engine.velocity.set(1, 2, 3); engine.updateEvaMotion(.5, true, false);
  assert.equal(engine.evaContact, false); assert.deepEqual(engine.velocity.toArray(), [1, 2, 3]);
  engine.evaControl("comfort"); engine.keys.add("BracketLeft"); engine.updateEvaMotion(.5, true, false);
  assert.deepEqual(engine.velocity.toArray(), [1, 2, 3]);
  engine.collidesAt = position => position.y < 5;
  engine.updateEvaMotion(.5, true, false); assert.equal(engine.evaContact, false);
  engine.keys.add("ShiftLeft");
  engine.updateEvaMotion(.5, true, false); assert.equal(engine.evaContact, true); assert.deepEqual(engine.velocity.toArray(), [0, -.15, 0]);
});

test("legacy network state defaults back null and fifth-slot container transactions conserve a rig", () => {
  const before = normalizeMultiplayerPlayerState(null, "guest_legacy_1");
  assert.equal(before.equipment.back, null);
  before.cursor = rig(); before.equipment.chest = { item: Item.PressureWeaveChest, count: 1 };
  const after = applyContainerOperation(before, [], { op: "click", target: { owner: "equipment", slot: 4 }, button: "left" }, { containerKind: "chest", canUsePlayerTarget: () => true });
  assert.equal(after.applied, true); assert.deepEqual(after.player.equipment.back, rig());
  assert.ok(multiplayerContainerTransactionConservesItems(before, [], { ...before, ...after.player }, []));
  assert.deepEqual(after.player.equipment.chest, before.equipment.chest);
  const legacy = { ...before, equipment: { head: null, chest: null, legs: null, feet: null } };
  assert.ok(validatePayload("player-state", { actorId: "guest_legacy_1", requestId: "legacy_req_1", state: legacy, status: "accepted" }));
});

test("short-range cargo tether requires a spool, clear line, capacity and preserves tank stores", () => {
  const { engine, messages } = engineHarness(vacuum);
  const item = tank(12_345), mesh = new THREE.Group(); mesh.position.set(0, 5.8, -4);
  const drop = { ...item, id: 7, pickupDelay: 0, mesh };
  let removed = 0;
  Object.assign(engine, { camera: { getWorldDirection: (target: THREE.Vector3) => target.set(0, 0, -1) }, drops: [drop],
    castVoxel: () => null, removeDrop: () => { removed++; engine.drops = []; },
  });
  engine.evaControl("cargo"); assert.equal(removed, 0); assert.match(messages.at(-1)!, /Spool/);
  engine.inventory[0] = { item: Item.TetherSpool, count: 1 };
  const clearRay = engine.castVoxel;
  engine.castVoxel = () => ({}) as ReturnType<VoxelEngine["castVoxel"]>;
  engine.evaControl("cargo"); assert.equal(removed, 0);
  engine.castVoxel = clearRay;
  engine.evaControl("cargo"); assert.equal(removed, 1); assert.deepEqual(engine.inventory[1], item);
  assert.equal(sourceOxygen(engine.inventory[1]).amount, 12_345);
});

test("host finite refill commits atomically and stale duplicate cannot spend or mint twice", () => {
  const { engine } = engineHarness();
  const current = normalizeMultiplayerPlayerState(null, "guest_1"); current.equipment.back = tank(0); current.cursor = { item: Item.FieldOxygenReserve, count: 1 };
  const states = new Map<string, PlayerSessionSnapshot>([["guest_1", current]]), responses: InventoryAction[] = [];
  Object.assign(engine, { multiplayerPlayerStates: states, multiplayerPeerActiveContainers: new Map(),
    multiplayer: { role: "host", sendInventoryAction: (action: InventoryAction) => responses.push(action) },
    ensureHostPlayerSession: () => states.get("guest_1"),
  });
  const request: InventoryAction = { actorId: "guest_1", requestId: "refill-1", expectedRevision: 0, kind: "life-support", lifeSupportOperation: { kind: "refill", index: -1 }, status: "request" };
  const peer = { identity: { id: "guest_1" } } as PeerInfo;
  const before = lifeSupportResourceTotals([current.equipment.back, current.cursor]);
  engine.handleRemoteInventoryAction(request, peer); engine.handleRemoteInventoryAction(request, peer);
  assert.deepEqual(responses.map(response => response.status), ["accepted", "rejected"]);
  assert.equal(states.get("guest_1")!.revision, 1);
  assert.equal(sourceOxygen(states.get("guest_1")!.equipment.back).amount, 120_000);
  assert.deepEqual(lifeSupportResourceTotals([states.get("guest_1")!.equipment.back, states.get("guest_1")!.cursor]), before);
  assert.equal(validatePayload("inventory-action", { ...request, lifeSupportOperation: { kind: "refill", index: 3 } }), false);
});

test("drone equipment and location tether validators preserve custody and reject wrong ownership", () => {
  const custody = { schema: 1, agents: { drone: { inventory: [null], revision: 3, returning: [], equipment: { ...blank(), back: rig() } } } };
  assert.deepEqual(validateAgentCustody(custody), custody);
  assert.throws(() => validateAgentCustody({ ...custody, agents: { drone: { ...custody.agents.drone, equipment: { ...blank(), chest: rig() } } } }));
  const binding = { schema: 1, creativeFlying: false, boatId: null, creatureId: null, creatureSeat: null, tether: { anchor: [2, 3, 4], length: 12 } };
  assert.deepEqual(validateLocationPlayerState(binding), binding);
  assert.throws(() => validateLocationPlayerState({ ...binding, tether: { anchor: [2, 3, 4], length: Infinity } }));
  assert.throws(() => validateLocationPlayerState({ ...binding, tether: { ...binding.tether, universeOwned: true } }));
});

test("respawn resets exposure and tether while every carried store drops exactly once", () => {
  const { engine } = engineHarness(vacuum);
  const drops: InventorySlot[] = [];
  Object.assign(engine, { spawn: new THREE.Vector3(1, 2, 3), worldOptions: { keepInventory: false }, hunger: 4,
    craftGrid: [tank(2000), ...Array(8).fill(null)], cursor: tank(1000), trash: tank(3000), offhand: null,
    lifeSupportState: { ...EMPTY_LIFE_SUPPORT, hypoxiaSeconds: 30 }, evaTether: { anchor: [1, 2, 3], length: 4 },
    equipmentSwap: { seconds: 1 }, socketSwap: { seconds: 1 }, evaEnabled: true,
    spawnDrop: (item: number, count: number, _position: THREE.Vector3, durability?: number, metadata?: Record<string, unknown>) => drops.push({ item, count, durability, metadata }),
    events: { onDeath: () => undefined, onToast: () => undefined },
  });
  engine.equipment.back = rig(); engine.inventory[0] = tank(4000);
  const before = lifeSupportResourceTotals([...engine.inventory, ...engine.craftGrid, engine.cursor, engine.trash, engine.equipment.back]);
  engine.respawn(true);
  assert.equal(drops.length, 5); assert.deepEqual(lifeSupportResourceTotals(drops), before);
  assert.deepEqual(engine.lifeSupportState, EMPTY_LIFE_SUPPORT); assert.equal(engine.evaTether, null);
  assert.equal(engine.equipmentSwap, null); assert.equal(engine.socketSwap, null); assert.equal(engine.evaEnabled, false);
  assert.equal(engine.cursor, null); assert.equal(engine.trash, null); assert.ok(engine.craftGrid.every(slot => !slot));
});

test("host finite supply craft consumes staged custody and rejects replay or remote table claims", () => {
  const { engine } = engineHarness();
  const recipe = RECIPES.find(value => value.output.item === Item.EvaPowerCell)!;
  const current = normalizeMultiplayerPlayerState(null, "guest_crafter");
  current.craftGrid = Array(9).fill(null);
  recipe.pattern.forEach((item, index) => { if (item) current.craftGrid![(Math.floor(index / recipe.width) * 3) + index % recipe.width] = { item: Array.isArray(item) ? item[0] : item, count: 1 }; });
  const states = new Map([[current.playerId, current]]), responses: InventoryAction[] = [];
  Object.assign(engine, { multiplayerPlayerStates: states, multiplayerPeerActiveContainers: new Map(),
    remotePlayers: new Map([[current.playerId, { target: { x: 0, y: 0, z: 0 } }]]),
    world: { getBlock: (x: number, y: number, z: number) => x === 0 && y === 0 && z === 0 ? BlockId.CraftingTable : BlockId.Air },
    multiplayer: { role: "host", sendInventoryAction: (action: InventoryAction) => responses.push(action) },
    ensureHostPlayerSession: () => states.get(current.playerId),
  });
  const request: InventoryAction = { actorId: current.playerId, requestId: "supply_test_1", kind: "craft", recipeId: recipe.id, expectedRevision: 0, status: "request" };
  const peer = { identity: { id: current.playerId } } as PeerInfo;
  engine.handleRemoteInventoryAction(request, peer); engine.handleRemoteInventoryAction(request, peer);
  assert.deepEqual(responses.map(response => response.status), ["accepted", "rejected"]);
  assert.equal(lifeSupportResourceTotals([states.get(current.playerId)!.cursor]).energyJ, 60000);
  assert.ok(states.get(current.playerId)!.craftGrid!.every(slot => !slot));
  engine.world.getBlock = () => BlockId.Air;
  engine.handleRemoteInventoryAction({ ...request, expectedRevision: 1 }, peer);
  assert.equal(responses.at(-1)?.status, "rejected");
});

test("actual character model retains chest armor with distinct back gear and sealed visor", () => {
  const model = new BlockPlayerModel();
  try {
    for (const kind of ["tank", "harness", "rig", "spell-rig", "dive"]) {
      model.setEquipmentAppearance({ head: "#ddd", chest: "#aaa", back: "#ddd", backKind: kind, sealedHelmet: true });
      assert.equal(model.group.getObjectByName("sealed-visor")?.visible, true);
      assert.equal(model.group.getObjectByName("back-single-oxygen-cylinder")?.visible, kind === "tank");
      assert.equal(model.group.getObjectByName("back-dive-compact-cylinder")?.visible, kind === "dive");
    }
    model.setEquipmentAppearance({ head: "#ddd", chest: "#aaa", back: null });
    assert.equal(model.group.getObjectByName("sealed-visor")?.visible, false);
    assert.equal(model.group.getObjectByName("back-mount-plate")?.visible, false);
  } finally { model.dispose(); }
});

test("every life-support item uses its authored first-person model rather than a fallback block", () => {
  const { engine } = engineHarness();
  Object.assign(engine, { heldRoot: new THREE.Group(), offhandRoot: new THREE.Group(),
    heldItemCode: -1, offhandItemCode: -1, selected: 0, offhand: null,
    heldUse: 0, heldSwing: 0, footstepDistance: 0, attackCooldown: 0 });
  for (const definition of Object.values(ITEMS).filter(item => item.lifeSupportKind)) {
    engine.inventory[0] = { item: definition.id, count: 1 };
    engine.updateHeldItem(0);
    assert.equal(engine.heldRoot.children.length, 1, definition.name);
    assert.match(engine.heldRoot.children[0].name, /^first-person-avatar-held-/, definition.name);
    assert.ok(engine.heldRoot.children[0].children.length > 1, definition.name);
    assert.equal(engine.heldRoot.children[0].position.y, 0.05, "keep full field kit in view");
  }
  engine.disposeObject(engine.heldRoot);
  engine.disposeObject(engine.offhandRoot);
});
