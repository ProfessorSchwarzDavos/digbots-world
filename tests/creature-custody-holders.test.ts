import assert from "node:assert/strict";
import test from "node:test";
import { collectWorldCreatureCustodyHolders } from "../app/game/creature-custody-holders";
import { chestCustodyOwner } from "../app/game/chest-custody-owner";
import type { WorldCreatureCustodySource } from "../app/game/creature-custody-sources";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb, createOrbRack, createCreatureHealer } from "../app/game/capture-orbs";
import type { CreatureMetadata } from "../app/game/creature-cage";
import { createDigitalCreatureArchive, createDigitalItemVault } from "../app/game/digital-storage";
import { normalizeSailboatSave } from "../app/game/boats";
import { createMachine } from "../app/game/wayworks";
import { createOrbMorphLoom } from "../app/game/orb-morphing";
import { createApiary } from "../app/game/apiary";
import { createSurveyHopper } from "../app/game/space-vehicle";
import { homeLocation, locationId, universeId } from "../app/game/location-address";
import { normalizeMultiplayerPlayerState, type SavedCreature } from "../app/game/engine";
import { createDragonState, normalizeDragonState } from "../app/game/dragons";
import { canonicalJson } from "../app/game/universe-json";

const metadata = (id: string, kind: CreatureMetadata["kind"] = "peelop"): CreatureMetadata => ({ schema: 1, entityId: id, kind,
  health: 5, maxHealth: 7, ageTicks: 123, baby: false, temperament: "Gentle", hostile: false, tamed: true,
  ownerId: "keeper", name: null, geneticSeed: 321, command: null, custom: { foreignPoint: { x: 777, y: .125, z: -999 } } });
const orb = (id: string, creature = metadata(id)) => captureIntoOrb(createEmptyCaptureOrb(`orb-${id}`), creature, 42, "keeper")!;
const filled = (id: string) => captureOrbInventorySlot(orb(id));
const empty = (): WorldCreatureCustodySource => ({ inventory: [], furnaces: {}, chests: {} });
function fixture(): WorldCreatureCustodySource {
  const boat = normalizeSailboatSave({ id: "boat", inventory: [filled("boat")] });
  const ship = structuredClone(createSurveyHopper("ship", "keeper", locationId(homeLocation(universeId("holders"))), [5, 30, 2]));
  ship.cargo[0] = filled("ship"); ship.cargoOwnership[0] = "finite-stack";
  const machine = createMachine("powered-crusher", "home", "keeper"); machine.workshop.slots.input = filled("machine");
  // Some typed slots deliberately contain a test vessel only to exercise holder
  // classification. This fixture does not certify normal gameplay slot eligibility.
  return { inventory: [filled("pack")], cursor: filled("cursor"), trash: filled("trash"), craftGrid: [filled("craft")], offhand: filled("offhand"),
    equipment: { head: null, chest: null, legs: null, feet: null, back: filled("equipment") },
    furnaces: { "1,30,0": { input: filled("furnace"), fuel: null, output: null, progress: 0, burn: 0, burnMax: 0 } },
    wheatMills: { "2,30,0": { schema: 1, input: filled("mill"), output: null, progressSeconds: 0 } },
    wayworks: { "3,30,0": machine }, chests: { "8,30,0": [filled("chest")], "boat:boat": structuredClone(boat.inventory), "exhibit:9,30,0": [filled("exhibit")] },
    boats: [boat], drops: [{ ...filled("drop"), x: 4.125, y: 30, z: 2.25, age: .1 }],
    orbRacks: { "4,30,0": createOrbRack([orb("rack")]) }, healingStations: { "5,30,0": createCreatureHealer([orb("healer")]) },
    morphLooms: { "6,30,0": { ...createOrbMorphLoom(), inputOrb: orb("loom") } },
    apiaries: { "7,30,0": { ...createApiary("queen", [], 42, 3), queenOrb: captureOrbInventorySlot(orb("queen", metadata("queen", "hive-queen"))) } },
    aquariums: { "10,30,0": { schema: 1, blockKeys: ["10,30,0"], residents: [{ id: "fish", metadata: metadata("fish", "reedneedle"), storedAt: 42 }], lastBreedingCycle: 0 } },
    fieldPerches: { "11,30,0": { schema: 1, resident: metadata("bird", "emberjay"), assignment: "sleep", lastSignal: null, revision: 0 } },
    multiplayerPlayers: { guest: normalizeMultiplayerPlayerState({ inventory: [filled("guest")] }, "guest") },
    agentCustody: { schema: 1, agents: { drone: { inventory: [filled("drone")], equipment: {}, returning: [], revision: 0 } } },
    digitalCreatureArchive: { ...createDigitalCreatureArchive(), orbs: [orb("archive")] },
    digitalItemVault: { ...createDigitalItemVault(), stacks: [filled("vault")] }, spacefleet: { schema: 1, vehicles: { ship } },
  };
}

test("canonical tuple paths bind host, guest, agent, block, boat, ship, drop and shared-universe holders explicitly", () => {
  const source = fixture(), before = canonicalJson(source), result = collectWorldCreatureCustodyHolders(source, "host");
  const held = new Map(result.holders.stored.map(value => [value.specimenId, value.holder]));
  for (const id of ["pack", "cursor", "trash", "craft", "offhand", "equipment"]) assert.deepEqual(held.get(id), { kind: "player", playerId: "host", storage: "host" });
  assert.deepEqual(held.get("guest"), { kind: "player", playerId: "guest", storage: "guest" });
  assert.deepEqual(held.get("drone"), { kind: "agent", agentId: "drone" });
  assert.deepEqual(held.get("boat"), { kind: "boat", id: "boat" });
  assert.deepEqual(held.get("drop"), { kind: "drop", sourceIndex: 0 });
  assert.deepEqual(held.get("archive"), { kind: "universe", field: "digitalCreatureArchive" });
  assert.deepEqual(held.get("vault"), { kind: "universe", field: "digitalItemVault" });
  assert.deepEqual(held.get("ship"), { kind: "spacecraft", vehicleId: "ship", locationId: source.spacefleet!.vehicles.ship.locationId });
  assert.deepEqual(held.get("exhibit"), { kind: "exhibit", anchorKey: "9,30,0" });
  assert.deepEqual(held.get("chest"), { kind: "block-chest", key: "8,30,0", cells: [[8, 30, 0]] });
  for (const id of ["furnace", "mill", "machine", "rack", "healer", "loom", "queen"]) {
    assert(held.has(id), `Missing holder fixture: ${id}`); assert.equal(held.get(id)!.kind, "block");
  }
  assert.deepEqual(result.holders.residents.map(value => value.holder), [{ kind: "block", field: "aquariums", key: "10,30,0" },
    { kind: "block", field: "fieldPerches", key: "11,30,0" }]);
  assert.equal(result.holders.chests.length, 3); assert.equal(result.aliases.length, 1); assert.equal(canonicalJson(source), before);
  assert(!Object.hasOwn(result.holders, "attached")); assert(Object.isFrozen(result.holders.stored[0].holder));
});

test("nested stored cargo follows the outer keeper while current deployed cargo follows the actual live body", () => {
  const base = createDragonState("fire", { dragonId: "dragon", ageDays: 100, tamed: true, ownerId: "keeper", geneticSeed: 321 });
  const dragonState = normalizeDragonState({ ...base, equipment: { ...base.equipment, chests: [true, false] } });
  const dragon: CreatureMetadata = { ...metadata("dragon", "fire-dragon"), custom: JSON.parse(JSON.stringify({ dragonState,
    dragonCargo: Array.from({ length: 18 }, (_, i) => i === 0 ? filled("old-cargo") : null) })) };
  const captured = orb("dragon", dragon), source = { ...empty(), inventory: [captureOrbInventorySlot(captured)] };
  const nested = collectWorldCreatureCustodyHolders(source, "keeper").holders.stored.find(value => value.specimenId === "old-cargo")!;
  assert.deepEqual(nested.holder, { kind: "player", playerId: "keeper", storage: "host" });
  assert.deepEqual(nested.containing, [{ path: ["inventory", 0], specimenId: "dragon", format: "stored" }]);
  const body: SavedCreature = { id: 23, specimenId: "dragon", kind: "fire-dragon", x: 4.125, y: 30, z: 2.25,
    yaw: .1, health: 4, age: 100, geneticSeed: 321, dragonState, attunedOrbId: captured.orbId, creatureOwnerId: "keeper" };
  const deployed = { ...captured, attunement: { ownerId: "keeper", attunedAt: 50, activeEntityId: "23", recalledAt: 0, recallCount: 0, fainted: false } };
  const result = collectWorldCreatureCustodyHolders({ ...empty(), inventory: [captureOrbInventorySlot(deployed)], sleepingCreatures: [body],
    chests: { "dragon:23:cargo": Array.from({ length: 18 }, (_, i) => i === 0 ? filled("current-cargo") : null) } }, "keeper");
  assert(!result.holders.stored.some(value => value.specimenId === "old-cargo"));
  assert.deepEqual(result.holders.stored.find(value => value.specimenId === "current-cargo")!.holder, { kind: "creature-cargo", creatureId: 23, cargoKind: "dragon" });
  assert.deepEqual(result.holders.stored.find(value => value.specimenId === "dragon")!.body, { collection: "sleepingCreatures", id: 23 });
});

test("chest namespaces preserve ordered block halves and never parse mobile IDs as coordinates", () => {
  assert.deepEqual(chestCustodyOwner("10,30,0|9,30,0"), { kind: "block-chest", key: "10,30,0|9,30,0", cells: [[10, 30, 0], [9, 30, 0]] });
  assert.deepEqual(chestCustodyOwner("boat:1,2,3"), { kind: "boat", id: "1,2,3" });
  assert.deepEqual(chestCustodyOwner("leviathan:77:cargo"), { kind: "creature-cargo", creatureId: 77, cargoKind: "leviathan" });
  for (const key of ["unknown:1,2,3", "exhibit:-0,2,3", "dragon:023:cargo", "dragon:23:unknown", "1,2,3|1,2,3", "1,2,3|3,2,3", "boat:"])
    assert.throws(() => chestCustodyOwner(key));
  assert.throws(() => collectWorldCreatureCustodyHolders({ ...empty(), chests: { unknown: [] } }, "keeper"));
  assert.throws(() => collectWorldCreatureCustodyHolders({ ...empty(), orbRacks: { unknown: createOrbRack([orb("rack")]) } }, "keeper"));
  assert.throws(() => collectWorldCreatureCustodyHolders(empty(), " keeper "));
});

test("one hundred cold holder bindings keep exact owner paths, alias tables, containment and metadata without clocks", () => {
  const source = fixture(), before = canonicalJson(source), expected = canonicalJson(collectWorldCreatureCustodyHolders(source, "host"));
  const now = Date.now; Date.now = () => { throw Error("holder binding read clock"); };
  try { for (let i = 0; i < 100; i++) assert.equal(canonicalJson(collectWorldCreatureCustodyHolders(JSON.parse(before), "host")), expected); }
  finally { Date.now = now; }
  assert.equal(canonicalJson(source), before);
});
