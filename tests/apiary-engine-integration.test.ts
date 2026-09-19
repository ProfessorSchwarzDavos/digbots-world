import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  BlockId,
  CLOVERBACK_MILK_COOLDOWN_SECONDS,
  Item,
  MOB_DEFS,
  VoxelEngine,
  captureOrbUnitFromInventorySlot,
  normalizeCaptureOrbInventorySlot,
  resolveStructureLootItem,
  restoreHealingStationStorage,
  type InventorySlot,
} from "../app/game/engine";
import { createEmptyApiaryBlock, createWildApiary, type ApiaryBee } from "../app/game/apiary";
import {
  captureIntoOrb,
  captureOrbFromInventorySlot,
  captureOrbInventorySlot,
  createCreatureHealer,
  createEmptyCaptureOrb,
  createOrbRack,
} from "../app/game/capture-orbs";
import { captureCreature, encodeCapturedCreature, type CreatureMetadata } from "../app/game/creature-cage";
import { createButterflyVisual } from "../app/game/butterflies";
import { createMobVisual } from "../app/game/mob-models";
import { validatePayload, type PlayerPose } from "../app/game/multiplayer";
import { capturePrintingForMob, totalTcgHolding } from "../app/game/tcg/collection";

function metadata(kind: CreatureMetadata["kind"] = "puddlehopper", overrides: Partial<CreatureMetadata> = {}): CreatureMetadata {
  return {
    schema: 1,
    entityId: `${kind}-test`,
    kind,
    health: 2,
    maxHealth: 5,
    ageTicks: 80,
    baby: false,
    temperament: "Gentle",
    hostile: false,
    tamed: false,
    ownerId: null,
    name: null,
    geneticSeed: 42,
    command: null,
    custom: {},
    ...overrides,
  };
}

function stubMachineEngine() {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.audio = { play: () => undefined } as never;
  engine.events = { onToast: () => undefined } as never;
  engine.saveSoon = () => undefined;
  engine.emitHud = () => undefined;
  return engine;
}

test("legacy cages migrate into canonical Capture Orbs without losing creature metadata", () => {
  const creature = metadata("peelop", { name: "Mallow", tamed: true, ownerId: "keeper" });
  const captured = captureCreature("legacy-cage", creature, 1234)!;
  const legacy: InventorySlot = {
    item: Item.LegacyCaptureOrb,
    count: 1,
    metadata: { capturedCreature: encodeCapturedCreature(captured) },
  };
  const normalized = normalizeCaptureOrbInventorySlot(legacy)!;
  assert.equal(normalized.item, Item.CaptureOrb);
  assert.deepEqual(captureOrbFromInventorySlot(normalized)?.creature, creature);
  assert.equal(typeof normalized.metadata?.captureOrb, "string");
});

test("orb stations split crafted count-two output one unit at a time with unique identities", () => {
  const engine = stubMachineEngine();
  const key = "1,2,3";
  engine.activeOrbRackKey = key;
  engine.activeHealingStationKey = null;
  engine.orbRacks = new Map([[key, createOrbRack()]]);
  engine.healingStations = new Map();
  engine.cursor = { item: Item.CaptureOrb, count: 2 };

  engine.machineClick("orb-rack", 0, "left");
  const first = engine.orbRacks.get(key)?.slots[0];
  assert.ok(first);
  assert.equal(engine.cursor?.count, 1);

  engine.machineClick("orb-rack", 1, "left");
  const second = engine.orbRacks.get(key)?.slots[1];
  assert.ok(second);
  assert.equal(engine.cursor, null);
  assert.notEqual(first?.orbId, second?.orbId);

  const occupied = engine.orbRacks.get(key)?.slots[0];
  engine.cursor = { item: Item.CaptureOrb, count: 2 };
  engine.machineClick("orb-rack", 0, "left");
  assert.equal(engine.cursor.count, 2, "an occupied slot never consumes or swaps a stacked orb");
  assert.equal(engine.orbRacks.get(key)?.slots[0]?.orbId, occupied?.orbId);

  engine.cursor = { item: Item.CaptureOrb, count: 1 };
  engine.machineClick("orb-rack", 7, "left");
  assert.ok(engine.orbRacks.get(key)?.slots[7], "the expanded lower shelf exposes its fourth dynamic slot");
  assert.equal(engine.cursor, null);
});

test("healing station Cave Gel uses an explicit reversible input instead of its orb sockets", () => {
  const engine = stubMachineEngine();
  const key = "4,5,6";
  engine.activeOrbRackKey = null;
  engine.activeHealingStationKey = key;
  engine.orbRacks = new Map();
  engine.healingStations = new Map([[key, createCreatureHealer()]]);
  engine.cursor = { item: Item.CaveGel, count: 3 };

  engine.machineClick("healing-station", -1, "left");
  assert.equal(engine.healingStations.get(key)?.gelUnits, 3);
  assert.equal(engine.cursor, null);

  engine.machineClick("healing-station", -1, "right");
  assert.deepEqual(engine.cursor, { item: Item.CaveGel, count: 1 });
  assert.equal(engine.healingStations.get(key)?.gelUnits, 2);
});

test("rack and healer world displays share the same state-driven Capture Orb model", () => {
  const engine = stubMachineEngine();
  const orbs = Array.from({ length: 8 }, (_, index) => createEmptyCaptureOrb(`orb-display-${index}`));
  const rack = engine.createOrbStationVisual("0,0,0", createOrbRack(orbs), "orb-rack");
  const healer = engine.createOrbStationVisual("0,0,0", createCreatureHealer(orbs.slice(0, 4), 32), "healing-station");

  assert.equal(rack.children.filter((child) => child.name.startsWith("capture-orb-display-")).length, 8);
  assert.equal(healer.children.filter((child) => child.name.startsWith("capture-orb-display-")).length, 4);
  assert.ok(healer.getObjectByName("healing-station-cave-gel-reservoir"));
  for (const station of [rack, healer]) {
    const orb = station.getObjectByName("capture-orb-display-0")!;
    for (const part of ["capture-orb-shell-0", "capture-orb-equator-0", "capture-orb-meridian-0", "capture-orb-cap-0", "capture-orb-rune-0"]) assert.ok(orb.getObjectByName(part), part);
  }
});

test("a filled Hive Queen orb stocks an apiary and can be pulled back out unchanged", () => {
  const engine = stubMachineEngine();
  const key = "4,20,8";
  const bee: ApiaryBee = {
    id: "queen-aurelia",
    role: "queen",
    alive: true,
    home: false,
    outbound: false,
    carryingNectar: 0,
    lastReturnDay: 2,
    disconnectedDay: null,
    geneticSeed: 7788,
    angry: false,
    tamed: true,
    ownerId: "local",
  };
  const queen = metadata("hive-queen", {
    entityId: "queen-aurelia",
    name: "Aurelia",
    tamed: true,
    ownerId: "local",
    custom: { apiaryBee: bee },
  });
  const orb = captureIntoOrb(createEmptyCaptureOrb("orb-aurelia"), queen, 99)!;
  engine.cursor = captureOrbInventorySlot(orb);
  engine.activeApiaryKey = key;
  engine.apiaries = new Map([[key, createEmptyApiaryBlock()]]);
  engine.persistentMachineLastStep = new Map();
  engine.world = { seed: 123, seedText: "QUEEN", getBlock: () => BlockId.Apiary } as never;
  engine.day = 7;
  engine.mobs = [];
  engine.syncApiaryWorkerMobs = () => undefined;

  engine.machineClick("apiary", 0, "left");
  const state = engine.apiaries.get(key);
  assert.ok(state?.queen);
  assert.equal(state.queen.id, bee.id);
  assert.equal(state.queen.geneticSeed, bee.geneticSeed);
  assert.equal(state.queen.tamed, true);
  assert.equal(state.queen.ownerId, "local");
  assert.equal(state.queen.home, true);
  assert.equal(engine.cursor, null, "the exact filled orb lives in the queen chamber while active");
  const stored = state.queenOrb ? captureOrbFromInventorySlot(state.queenOrb) : null;
  assert.equal(stored?.orbId, "orb-aurelia");
  assert.equal(stored?.creature?.kind, "hive-queen");

  engine.machineClick("apiary", 0, "left");
  const returned = captureOrbFromInventorySlot(engine.cursor);
  assert.equal(returned?.orbId, "orb-aurelia");
  assert.equal(returned?.creature?.kind, "hive-queen");
  assert.equal(engine.apiaries.get(key)?.queen, null, "pulling the queen disables rather than destroys the colony");

  engine.machineClick("apiary", 0, "left");
  engine.mode = "survival";
  engine.apiaryFlowerCache = new Map();
  const drops: InventorySlot[] = [];
  engine.spawnDrop = ((item: InventorySlot["item"], count: number, _position: THREE.Vector3, durability?: number, slotMetadata?: Record<string, unknown>) => {
    drops.push({ item, count, ...(durability !== undefined ? { durability } : {}), ...(slotMetadata ? { metadata: slotMetadata } : {}) });
  }) as never;
  engine.breakApiaryAt(key, BlockId.Apiary, new THREE.Vector3(4, 20, 8));
  const recoveredQueen = drops.map((slot) => captureOrbFromInventorySlot(slot)).find((candidate) => candidate?.orbId === "orb-aurelia");
  assert.equal(recoveredQueen?.creature?.name, "Aurelia", "breaking a crafted apiary returns its exact installed queen orb");
});

test("persistent healing stations restore bounded clocks and heal stored exact metadata", () => {
  const wounded = captureIntoOrb(createEmptyCaptureOrb("orb-wounded"), metadata("puddlehopper", { health: 1, maxHealth: 5 }), 12)!;
  const restored = restoreHealingStationStorage({
    "2,3,4": { ...createCreatureHealer([wounded], 1), healClock: 999, healCycles: 0 },
  }).get("2,3,4")!;
  assert.ok(restored.healClock <= 20);

  const engine = stubMachineEngine();
  engine.apiaries = new Map();
  engine.healingStations = new Map([["2,3,4", { ...restored, healClock: 0 }]]);
  engine.persistentMachineTimer = 0;
  engine.persistentMachineCursor = 0;
  engine.persistentMachineLastStep = new Map([["2,3,4", Date.now() - 21_000]]);
  engine.position = new THREE.Vector3(100, 20, 100);
  engine.spawnParticles = () => undefined;
  engine.updatePersistentMachines(0.1);
  const healed = engine.healingStations.get("2,3,4")!;
  assert.equal(healed.slots[0]?.creature?.health, 5);
  assert.equal(healed.gelUnits, 0);
  assert.equal(healed.gelFuelSeconds, 580, "unused active Gel pauses as soon as the specimen is healthy");
});

test("breaking a wild hive preserves products, rolls hive materials, and releases every angry resident", () => {
  const engine = stubMachineEngine();
  const key = "8,21,9";
  const wild = createWildApiary("BREAK-HIVE", 4);
  engine.apiaries = new Map([[key, { ...wild, honey: 2, royalJelly: 1 }]]);
  engine.apiaryFlowerCache = new Map();
  engine.persistentMachineLastStep = new Map();
  engine.world = { seedText: "BREAK-HIVE" } as never;
  engine.day = 4;
  engine.mode = "survival";
  engine.mobs = [];
  const drops: InventorySlot[] = [];
  const released: Array<{ kind: string; apiaryBee?: ApiaryBee | null }> = [];
  engine.spawnDrop = ((item: InventorySlot["item"], count: number, _position: THREE.Vector3, durability?: number, slotMetadata?: Record<string, unknown>) => {
    drops.push({ item, count, ...(durability !== undefined ? { durability } : {}), ...(slotMetadata ? { metadata: slotMetadata } : {}) });
  }) as never;
  engine.spawnMob = ((kind: string, _position: THREE.Vector3, options: { apiaryBee?: ApiaryBee | null }) => {
    released.push({ kind, apiaryBee: options.apiaryBee });
    return {};
  }) as never;

  engine.breakApiaryAt(key, BlockId.WildBeehive, new THREE.Vector3(8, 21, 9));
  assert.equal(engine.apiaries.has(key), false);
  assert.ok(drops.some((slot) => slot.item === Item.HoneyJar && slot.count === 2));
  assert.ok(drops.some((slot) => slot.item === Item.RoyalJelly && slot.count === 1));
  assert.ok(drops.some((slot) => slot.item === Item.Honeycomb));
  assert.equal(released.length, wild.workers.length + 1);
  assert.ok(released.every((resident) => resident.apiaryBee?.angry));
});

test("Cloverback milking preserves the reusable bucket and enforces its saved cooldown", () => {
  const engine = stubMachineEngine();
  const cow = { kind: "meadow-cow", name: "Cloverback", milkCooldown: 0 };
  engine.inventory = Array.from({ length: 36 }, (_, index) => index === 0 ? { item: Item.Bucket, count: 2 } : null);
  engine.selected = 0;
  engine.mode = "survival";
  engine.placeCooldown = 0;
  engine.targetBoat = null;
  engine.targetMob = cow as never;
  engine.heldItemCode = Item.Bucket;

  engine.useSelected();
  assert.equal(engine.inventory[0]?.item, Item.Bucket);
  assert.equal(engine.inventory[0]?.count, 2, "milking yields a bottled item without consuming its reusable bucket");
  assert.equal(engine.inventory.filter((slot) => slot?.item === Item.MilkBottle).reduce((sum, slot) => sum + (slot?.count ?? 0), 0), 1);
  assert.equal(cow.milkCooldown, CLOVERBACK_MILK_COOLDOWN_SECONDS);

  engine.placeCooldown = 0;
  engine.useSelected();
  assert.equal(engine.inventory.filter((slot) => slot?.item === Item.MilkBottle).reduce((sum, slot) => sum + (slot?.count ?? 0), 0), 1);
});

test("Cloudglass pulses heal and recall owned followers while consuming one durability", () => {
  const engine = stubMachineEngine();
  const group = new THREE.Group();
  group.position.set(15, 20, 0);
  const companion = {
    id: 5,
    name: "Mallow",
    kind: "peelop",
    group,
    health: 2,
    maxHealth: 6,
    definition: MOB_DEFS.peelop,
    petState: { tamed: true, ownerId: "local", command: "follow", health: 2 },
    shadeState: null,
    reedstriderBond: null,
    courserBond: null,
    apiaryBee: null,
    angle: 0,
    baseY: 20,
    route: {},
    state: "wander",
    stateTimer: 0,
    wanderTimer: 0,
  };
  engine.multiplayer = null;
  engine.mobs = [companion] as never;
  engine.position = new THREE.Vector3(0, 20, 0);
  engine.followerHeading = 0;
  engine.apiaries = new Map();
  engine.chests = new Map();
  engine.mobMoveTarget = () => 20;
  let durabilityUsed = 0;
  let crystalBursts = 0;
  engine.damageSelectedTool = (amount = 1) => { durabilityUsed += amount; };
  engine.spawnParticles = (_x, _y, _z, type, count) => { if (type === BlockId.CrystalBlock) crystalBursts += count; };

  const result = engine.activateCloudglassReliquary();
  assert.deepEqual({ healed: result.healed, recalled: result.recalled, companions: result.companions }, { healed: 1, recalled: 1, companions: 1 });
  assert.equal(companion.health, 4);
  assert.ok(companion.group.position.distanceTo(engine.position) < 5);
  assert.equal(durabilityUsed, 1);
  assert.ok(crystalBursts >= 12);
});

test("Capture Orb capture and release rebuild held visuals and emit cyan crystal bursts", () => {
  const engine = stubMachineEngine();
  const mobGroup = new THREE.Group();
  mobGroup.position.set(2, 20, 0);
  const mob = {
    id: 22,
    kind: "puddlehopper",
    name: "Puddlehopper",
    health: 2,
    maxHealth: 5,
    age: 4,
    hostile: false,
    definition: MOB_DEFS.puddlehopper,
    group: mobGroup,
    petState: null,
    careState: null,
    shadeState: null,
    reedstriderBond: null,
    courserBond: null,
    apiaryBee: null,
    socialGroupId: null,
    peelopShedding: null,
    milkCooldown: 0,
    persistentPoiResident: false,
    enclosed: false,
  };
  engine.inventory = Array.from({ length: 36 }, (_, index) => index === 0 ? { item: Item.CaptureOrb, count: 1 } : null);
  engine.selected = 0;
  engine.mode = "survival";
  engine.placeCooldown = 0;
  engine.targetBoat = null;
  engine.targetMob = mob as never;
  engine.mobs = [mob] as never;
  engine.bestiary = { puddlehopper: { seen: false, kills: 0, captures: 0 } } as never;
  engine.heldItemCode = Item.CaptureOrb;
  engine.removeMob = () => undefined;
  const bursts: number[] = [];
  engine.spawnParticles = (_x, _y, _z, type, count) => { if (type === BlockId.CrystalBlock) bursts.push(count); };

  engine.useSelected();
  const filled = captureOrbFromInventorySlot(engine.inventory[0]);
  assert.equal(filled?.creature?.kind, "puddlehopper");
  assert.equal(engine.bestiary.puddlehopper.captures, 1);
  const capturePrinting = capturePrintingForMob("puddlehopper")!;
  assert.equal(totalTcgHolding(engine.cardforgeState.players.local, capturePrinting.id), 1);
  assert.equal(engine.heldItemCode, -1);
  assert.deepEqual(bursts, [12]);

  engine.placeCooldown = 0;
  engine.targetMob = null;
  engine.target = null;
  engine.position = new THREE.Vector3(0, 20, 0);
  engine.camera = { getWorldDirection: (target: THREE.Vector3) => target.set(1, 0, 0) } as never;
  const releasedGroup = new THREE.Group();
  releasedGroup.position.set(1.8, 20, 0);
  engine.spawnCreatureMetadata = (() => ({ name: "Puddlehopper", definition: MOB_DEFS.puddlehopper, group: releasedGroup })) as never;
  engine.heldItemCode = Item.CaptureOrb;
  // The first use opens the visible six-second safety confirmation; the
  // second commits the deliberate release.
  engine.useSelected();
  engine.placeCooldown = 0;
  engine.useSelected();
  assert.equal(captureOrbFromInventorySlot(engine.inventory[0])?.creature, null);
  assert.equal(engine.heldItemCode, -1);
  assert.deepEqual(bursts, [12, 12]);
});

test("all new POI loot keys resolve through the engine chest resolver", () => {
  const expected: Record<string, number> = {
    "wild-honeycomb": Item.Honeycomb,
    beeswax: Item.Beeswax,
    "wildflower-honey": Item.HoneyJar,
    "royal-jelly": Item.RoyalJelly,
    "queen-cell": Item.QueenCell,
    "cloudglass-reliquary": Item.CloudglassRelic,
    "waykeeper-capture-orb": Item.CaptureOrb,
    "cave-gel": Item.CaveGel,
    moonberry: Item.Berry,
  };
  for (const [key, item] of Object.entries(expected)) assert.equal(resolveStructureLootItem(key), item, key);

  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  engine.world = {
    structureMarkerAt: () => ["cache", { loot: Object.keys(expected).map((itemKey) => ({ itemKey, count: 1 })) }],
  } as never;
  const loot = engine.generateChestLoot("0,20,0").filter((slot): slot is InventorySlot => Boolean(slot));
  assert.deepEqual(new Set(loot.map((slot) => slot.item)), new Set(Object.values(expected)));
});

test("unbound Capture Orb helper rejects metadata stacks and preserves filled singletons", () => {
  const filled = captureIntoOrb(createEmptyCaptureOrb("orb-exact"), metadata(), 11)!;
  const filledSlot = captureOrbInventorySlot(filled);
  assert.deepEqual(captureOrbUnitFromInventorySlot(filledSlot), filled);
  assert.equal(captureOrbUnitFromInventorySlot({ ...filledSlot, count: 2 }), null);
});

test("filled Capture Orb appearance propagates through local and remote third-person poses", () => {
  const engine = stubMachineEngine();
  const filled = captureIntoOrb(createEmptyCaptureOrb("orb-visible"), metadata(), 11)!;
  engine.inventory = Array.from({ length: 36 }, (_, index) => index === 0 ? captureOrbInventorySlot(filled) : null);
  engine.selected = 0;
  engine.multiplayerTick = 9;
  engine.multiplayer = { identity: { id: "player_local", name: "Local", color: "#71d6d2" } } as never;
  engine.boats = new Map();
  engine.mountedBoatId = null;
  engine.position = new THREE.Vector3(1, 20, 3);
  engine.velocity = new THREE.Vector3();
  engine.yaw = 0;
  engine.pitch = 0;
  engine.grounded = true;
  engine.crouching = false;
  engine.sprinting = false;
  engine.mineHeld = false;
  engine.attackCooldown = 0;
  engine.heldUse = 0;
  engine.playerVariant = "male";
  engine.equipment = { head: null, chest: null, legs: null, feet: null, back: null };
  const pose = (engine as unknown as { localNetworkPose(): PlayerPose }).localNetworkPose();
  assert.equal(pose.heldItem, Item.CaptureOrb);
  assert.equal(pose.heldItemFilled, true);
  assert.equal(validatePayload("player-pose", pose), true);
  assert.equal(validatePayload("player-pose", { ...pose, heldItemFilled: "yes" }), false);

  const socket = new THREE.Group();
  const model = {
    rightHandSocket: socket,
    setHeldItem: (item: THREE.Object3D | null) => {
      socket.clear();
      if (item) socket.add(item);
    },
  };
  engine.localAvatarHeldCode = -1;
  engine.localAvatarHeldFilled = false;
  engine.remoteAvatarHeldCodes = new Map();
  engine.remoteAvatarHeldFilled = new Map();
  engine.disposeObject = () => undefined;
  engine.syncAvatarHeldItem(model as never, Item.CaptureOrb, "remote_player", true);
  assert.equal(socket.children[0]?.userData.filledCaptureOrb, true);
  assert.equal(engine.remoteAvatarHeldFilled.get("remote_player"), true);
});

test("worker Honeybees render smaller than butterflies while the Hive Queen stays larger", () => {
  const worker = createMobVisual("honeybee", 1).group;
  const queen = createMobVisual("hive-queen", 2).group;
  const butterfly = createButterflyVisual("meadowwing", 3).group;
  for (const object of [worker, queen, butterfly]) object.updateMatrixWorld(true);
  const workerSize = new THREE.Box3().setFromObject(worker).getSize(new THREE.Vector3());
  const queenSize = new THREE.Box3().setFromObject(queen).getSize(new THREE.Vector3());
  const butterflySize = new THREE.Box3().setFromObject(butterfly).getSize(new THREE.Vector3());
  assert.ok(workerSize.x < butterflySize.x && workerSize.y < butterflySize.y && workerSize.z < butterflySize.z);
  assert.ok(queenSize.length() > workerSize.length() * 3);
});
