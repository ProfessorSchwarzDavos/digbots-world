import assert from "node:assert/strict";
import test from "node:test";
import { collectWorldCreatureCustody, type WorldCreatureCustodySource } from "../app/game/creature-custody-sources";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb, createOrbRack, createCreatureHealer } from "../app/game/capture-orbs";
import type { CreatureMetadata } from "../app/game/creature-cage";
import { createDigitalCreatureArchive, createDigitalItemVault } from "../app/game/digital-storage";
import { normalizeSailboatSave } from "../app/game/boats";
import { createMachine, type MachineState } from "../app/game/wayworks";
import { WORKSHOP_SLOTS } from "../app/game/wayworks-stores";
import { createOrbMorphLoom } from "../app/game/orb-morphing";
import { createApiary } from "../app/game/apiary";
import { createSurveyHopper } from "../app/game/space-vehicle";
import { homeLocation, locationId, universeId } from "../app/game/location-address";
import { normalizeMultiplayerPlayerState, type SavedCreature } from "../app/game/engine";
import { createDragonState, normalizeDragonState } from "../app/game/dragons";
import { createLeviathanEgg, stepLeviathanEgg, stepLeviathanGrowth, bondLeviathan, attachLeviathanChest } from "../app/game/fauna";
import { BlockId, Item, type InventorySlot } from "../app/game/data";
import { canonicalJson } from "../app/game/universe-json";

function metadata(id: string, kind: CreatureMetadata["kind"] = "peelop"): CreatureMetadata {
  return { schema: 1, entityId: id, kind, health: 5, maxHealth: 7, ageTicks: 123, baby: false, temperament: "Gentle",
    hostile: false, tamed: true, ownerId: "keeper", name: id, geneticSeed: 321, command: null,
    custom: { unrelated: { x: 888, y: .125, z: -999 } } };
}
const orb = (id: string, creature = metadata(id)) => captureIntoOrb(createEmptyCaptureOrb(`orb-${id}`), creature, 42, "keeper")!;
const filled = (id: string) => captureOrbInventorySlot(orb(id));
function empty(): WorldCreatureCustodySource { return { inventory: [], furnaces: {}, chests: {} }; }
function completeFixture(): WorldCreatureCustodySource {
  const machine = createMachine("powered-crusher", "home", "keeper");
  for (const name of WORKSHOP_SLOTS) machine.workshop.slots[name] = filled(`machine-${name}`);
  const boat = normalizeSailboatSave({ id: "boat", inventory: [filled("boat")] });
  const ship = structuredClone(createSurveyHopper("ship", "keeper", locationId(homeLocation(universeId("custody"))), [0, 10, 0]));
  ship.cargo[0] = filled("ship"); ship.cargoOwnership[0] = "finite-ship-stack";
  const guest = normalizeMultiplayerPlayerState({ inventory: [filled("guest")], cursor: filled("guest-cursor"),
    trash: filled("guest-trash"), craftGrid: [filled("guest-craft")], offhand: filled("guest-offhand") }, "guest");
  const hive = createApiary("queen", ["worker"], 42, 7), workerOrb = orb("worker", metadata("worker", "honeybee"));
  return {
    inventory: [filled("pack")], cursor: filled("cursor"), trash: filled("trash"), craftGrid: [filled("craft")], offhand: filled("offhand"),
    equipment: { head: null, chest: null, legs: null, feet: null, back: { item: Item.TwinTankHarness, count: 1 } },
    furnaces: { furnace: { input: filled("furnace-input"), fuel: filled("furnace-fuel"), output: filled("furnace-output"), progress: 0, burn: 0, burnMax: 0 } },
    wheatMills: { mill: { schema: 1, input: filled("mill-input"), output: filled("mill-output"), progressSeconds: 0 } },
    wayworks: { machine }, chests: { chest: [filled("chest")], "boat:boat": structuredClone(boat.inventory) }, boats: [boat],
    drops: [{ ...filled("drop"), x: 0, y: 1, z: 0, age: 0 }],
    orbRacks: { rack: createOrbRack([orb("rack")]) }, healingStations: { healer: createCreatureHealer([orb("healer")]) },
    morphLooms: { loom: { ...createOrbMorphLoom(), inputOrb: orb("loom-input"), outputOrb: orb("loom-output") } },
    digitalCreatureArchive: { ...createDigitalCreatureArchive(), orbs: [orb("archive")] },
    digitalItemVault: { ...createDigitalItemVault(), stacks: [{ item: Item.RawIron, count: 2000 }] },
    multiplayerPlayers: { guest }, agentCustody: { schema: 1, agents: { drone: { inventory: [filled("drone")], equipment: {},
      returning: [filled("returning"), { item: Item.RawIron, count: 2000 }], revision: 0 } } },
    spacefleet: { schema: 1, vehicles: { ship } },
    apiaries: { hive: { ...hive, queenOrb: filled("queen"), workers: [{ ...hive.workers[0],
      storedOrb: { item: Item.CaptureOrb, count: 1, captureOrb: JSON.stringify(workerOrb, null, 2) } }] } },
    aquariums: { aquarium: { schema: 1, blockKeys: ["0,0,0"], residents: [{ id: "fish", metadata: metadata("fish"), storedAt: 42 }], lastBreedingCycle: 0 } },
    fieldPerches: { perch: { schema: 1, resident: metadata("bird"), assignment: "sleep", lastSignal: null, revision: 0 } },
    creatures: [], sleepingCreatures: [],
  };
}

test("the explicit storage slice enumerates every inventory/orb family and keeps housed metadata separate", () => {
  const source = completeFixture(), before = canonicalJson(source), result = collectWorldCreatureCustody(source);
  const families = new Set(result.index.stored.map(value => value.path[0]));
  for (const field of ["inventory", "cursor", "trash", "craftGrid", "offhand", "furnaces", "wheatMills", "wayworks", "chests",
    "boats", "drops", "orbRacks", "healingStations", "morphLooms", "digitalCreatureArchive", "multiplayerPlayers", "agentCustody", "spacefleet", "apiaries"])
    assert(families.has(field), field);
  assert.equal(result.index.residents.length, 2); assert.equal(result.aliases.length, 1);
  assert.deepEqual(result.aliases[0], { path: ["chests", "boat:boat"], canonicalPath: ["boats", "boat", "inventory"] });
  assert.equal(new Set(result.index.stored.map(value => value.custody.creature.entityId)).size, result.index.stored.length);
  assert.equal(canonicalJson(source), before); assert.equal(result.sourceBaseline, before);
  assert(!Object.isFrozen(source)); assert(Object.isFrozen(result.sources.inventorySlots));
});

test("one hundred cold collections never migrate originals, normalize bulk counts, read clocks or invent IDs", () => {
  const source = completeFixture(), encoded = canonicalJson(source), expected = canonicalJson(collectWorldCreatureCustody(source));
  const now = Date.now; Date.now = () => { throw Error("custody traversal touched clock"); };
  try {
    for (let index = 0; index < 100; index++) assert(canonicalJson(collectWorldCreatureCustody(JSON.parse(encoded))) === expected,
      `Cold owner traversal changed its exact canonical index at iteration ${index}`);
  } finally { Date.now = now; }
  assert.equal(canonicalJson(source), encoded);
  assert.equal(source.digitalItemVault!.stacks[0].count, 2000);
});

test("boat hold aliases must agree exactly and cannot hide orphan or duplicated physical custody", () => {
  const source = completeFixture();
  assert.throws(() => collectWorldCreatureCustody({ ...source, chests: { ...source.chests, "boat:boat": [filled("different")] } }), /alias/);
  assert.throws(() => collectWorldCreatureCustody({ ...empty(), chests: { "boat:missing": [] } }), /alias/);
  assert.throws(() => collectWorldCreatureCustody({ ...source, chests: { ...source.chests, another: [filled("boat")] } }), /Duplicate/);
  assert.throws(() => collectWorldCreatureCustody({ ...source, boats: [...source.boats!, source.boats![0]] }), /Duplicate/);
});

test("nested packed machines enumerate their real slots, never arbitrary item-looking metadata", () => {
  const machine = createMachine("powered-crusher", "home", "keeper"), inside = createMachine("field-battery", "home", "keeper");
  inside.workshop.slots.input = filled("nested");
  machine.workshop.slots.output = { item: BlockId.FieldBattery, count: 1, metadata: { wayworks: inside } };
  const packed: InventorySlot = { item: BlockId.PoweredCrusher, count: 1, metadata: { wayworks: machine, opaque: { inventory: [filled("not-an-owner")] } } };
  const result = collectWorldCreatureCustody({ ...empty(), inventory: [packed] });
  assert.deepEqual(result.index.stored.map(value => value.custody.creature.entityId), ["nested"]);
  assert.deepEqual(result.index.stored[0].path, ["inventory", 0, "metadata", "wayworks", "workshop", "slots", "output", "metadata", "wayworks", "workshop", "slots", "input"]);
  assert.throws(() => collectWorldCreatureCustody({ ...empty(), inventory: [packed, filled("nested")] }), /Duplicate/);
  const invalid = structuredClone(packed), raw = invalid.metadata!.wayworks as MachineState;
  raw.workshop.slots.input = invalid;
  assert.throws(() => collectWorldCreatureCustody({ ...empty(), inventory: [invalid] }));
});

function dragonFixture(deployed: boolean) {
  const base = createDragonState("fire", { dragonId: "dragon", ageDays: 100, tamed: true, ownerId: "keeper", geneticSeed: 321 });
  const dragonState = normalizeDragonState({ ...base, equipment: { ...base.equipment, chests: [true, false] } });
  const cargo = Array.from({ length: 18 }, (_, index) => index === 0 ? filled("old-cargo") : null);
  const creature: CreatureMetadata = { ...metadata("dragon-specimen", "fire-dragon"), custom: JSON.parse(JSON.stringify({ dragonState, dragonCargo: cargo })) };
  const captured = orb("dragon", creature);
  const stored = deployed ? { ...captured, attunement: { ownerId: "keeper", attunedAt: 50, activeEntityId: "23", recalledAt: 0, recallCount: 0, fainted: false } } : captured;
  const body: SavedCreature = { id: 23, specimenId: "dragon-specimen", kind: "fire-dragon", x: 1, y: 30, z: 2,
    yaw: .1, health: 4, age: 120, geneticSeed: 321, dragonState, attunedOrbId: "orb-dragon", creatureOwnerId: "keeper" };
  return { creature, stored, body, cargo };
}

test("stored creature cargo is traversed exactly and cannot be duplicated, padded or silently truncated", () => {
  const { creature, stored } = dragonFixture(false), source = { ...empty(), inventory: [captureOrbInventorySlot(stored)] };
  const result = collectWorldCreatureCustody(source);
  assert.deepEqual(result.index.stored.map(value => value.custody.creature.entityId), ["dragon-specimen", "old-cargo"]);
  assert.throws(() => collectWorldCreatureCustody({ ...source, chests: { outside: [filled("old-cargo")] } }), /Duplicate/);
  for (const dragonCargo of [[], [filled("old-cargo")], null]) {
    const changed = { ...creature, custom: { ...creature.custom, dragonCargo } } as CreatureMetadata;
    assert.throws(() => collectWorldCreatureCustody({ ...empty(), inventory: [captureOrbInventorySlot(orb("dragon", changed))] }));
  }
  const missing = { ...creature, custom: { ...creature.custom } }; delete missing.custom.dragonCargo;
  assert.throws(() => collectWorldCreatureCustody({ ...empty(), inventory: [captureOrbInventorySlot(orb("dragon", missing))] }), /no canonical cargo/);
});

test("deployed creature cargo uses its actual chest, not its stale stored snapshot, and requires that owner", () => {
  const { stored, body } = dragonFixture(true);
  const source = { ...empty(), inventory: [captureOrbInventorySlot(stored)], creatures: [body],
    chests: { "dragon:23:cargo": Array.from({ length: 18 }, (_, index) => index === 0 ? filled("current-cargo") : null) } };
  const result = collectWorldCreatureCustody(source);
  assert.deepEqual(result.index.stored.map(value => value.custody.creature.entityId), ["dragon-specimen", "current-cargo"]);
  assert(result.index.stored[0].body); assert.equal(result.index.freeBodies.length, 0);
  assert.throws(() => collectWorldCreatureCustody({ ...source, chests: {} }), /no exact canonical cargo/);
  assert.throws(() => collectWorldCreatureCustody({ ...source, chests: { "dragon:23:cargo": [] } }), /no exact canonical cargo/);
  assert.throws(() => collectWorldCreatureCustody({ ...empty(), chests: { "dragon:23:cargo": [] } }), /no canonical body/);
  assert.throws(() => collectWorldCreatureCustody({ ...source, chests: { ...source.chests, "dragon:023:cargo": source.chests["dragon:23:cargo"] } }), /no canonical body/);
});

test("actual leviathan chest equipment retains all twenty-seven slots in portable and sleeping-body custody", () => {
  const egg = createLeviathanEgg("worldshell-leviathan", { eggId: "custody-egg", incubationTicks: 1, geneticSeed: 321 });
  const hatchling = stepLeviathanEgg(egg, { elapsedTicks: 1, underwater: true }).hatchling!;
  const adult = bondLeviathan(stepLeviathanGrowth(hatchling, { elapsedTicks: 1_000_000_000, underwater: true }), "keeper");
  const growth = attachLeviathanChest(adult, "keeper").state;
  const cargo = Array.from({ length: 27 }, (_, index) => index === 26 ? filled("leviathan-cargo") : null);
  const creature = { ...metadata("leviathan", "worldshell-leviathan"), custom: JSON.parse(JSON.stringify({ leviathanGrowth: growth, leviathanCargo: cargo })) };
  const captured = orb("leviathan", creature);
  assert.equal(collectWorldCreatureCustody({ ...empty(), inventory: [captureOrbInventorySlot(captured)] }).index.stored.length, 2);
  const body: SavedCreature = { id: 77, specimenId: "leviathan", kind: "worldshell-leviathan", x: 0, y: 20, z: 0,
    yaw: 0, health: 5, age: 1000, geneticSeed: 321, leviathanGrowth: growth };
  const result = collectWorldCreatureCustody({ ...empty(), sleepingCreatures: [body], chests: { "leviathan:77:cargo": cargo } });
  assert.equal(result.index.stored.length, 1); assert.equal(result.index.freeBodies[0].creature.id, 77);
  assert.throws(() => collectWorldCreatureCustody({ ...empty(), sleepingCreatures: [body], chests: { "leviathan:77:cargo": cargo.slice(0, 26) } }), /no exact canonical cargo/);
});

test("unknown fields, null tables, undefined equipment and malformed bulk vessels refuse without inventory repair", () => {
  for (const value of [{ ...empty(), unknown: [] }, { ...empty(), boats: null }, { ...empty(), inventory: undefined },
    { ...empty(), equipment: { back: undefined } }, { ...empty(), craftGrid: null },
    { ...empty(), agentCustody: { schema: 1 } }, { ...empty(), spacefleet: { schema: 1 } },
    { ...empty(), fieldPerches: { perch: {} } }])
    assert.throws(() => collectWorldCreatureCustody(value as unknown as WorldCreatureCustodySource));
  for (const value of [{ ...filled("bulk"), count: 2000 }, { item: Item.RawIron, count: 1.5 }, { item: Item.RawIron, count: 2000, metadata: {} }])
    assert.throws(() => collectWorldCreatureCustody({ ...empty(), digitalItemVault: { ...createDigitalItemVault(), stacks: [value] } }));
});
