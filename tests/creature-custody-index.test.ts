import assert from "node:assert/strict";
import test from "node:test";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb, type CaptureOrb } from "../app/game/capture-orbs";
import { type CreatureMetadata } from "../app/game/creature-cage";
import type { SavedCreature } from "../app/game/engine";
import { Item } from "../app/game/data";
import { captureLanternJar } from "../app/game/lantern-jar";
import { indexCreatureCustody, type CreatureCustodySources } from "../app/game/creature-custody-index";
import { canonicalJson } from "../app/game/universe-json";

function metadata(id = "specimen", kind: CreatureMetadata["kind"] = "peelop"): CreatureMetadata {
  return { schema: 1, entityId: id, kind, health: 5, maxHealth: 7, ageTicks: 123, baby: false,
    temperament: "Gentle", hostile: false, tamed: true, ownerId: "keeper", name: "Exact",
    geneticSeed: 321, command: "follow", custom: { primeAnchorId: "prime:historical:-9:15", nested: { x: 789, y: .1 } } };
}
function orb(id = "orb", specimen = "specimen"): CaptureOrb {
  return captureIntoOrb(createEmptyCaptureOrb(id), metadata(specimen), 42, "keeper")!;
}
function body(id = 23, specimenId = "specimen"): SavedCreature {
  return { id, specimenId, kind: "peelop", x: 1000.125, y: 30.25, z: -789.875, yaw: .3,
    health: 4, age: 130, geneticSeed: 321, creatureOwnerId: "keeper" };
}
function empty(): CreatureCustodySources { return { inventorySlots: [], orbRecords: [], residents: [], creatures: [], sleepingCreatures: [] }; }
function deployed(): CreatureCustodySources {
  const value = { ...orb(), attunement: { ownerId: "keeper", attunedAt: 50, activeEntityId: "23", recalledAt: 0, recallCount: 0, fainted: false } };
  return { ...empty(), inventorySlots: [{ path: ["host", "inventory", 0], slot: captureOrbInventorySlot(value) }],
    creatures: [{ ...body(), attunedOrbId: "orb" }] };
}

test("stored vessels keep unambiguous canonical paths and count legacy mirrors only once", () => {
  const sources = { ...empty(), inventorySlots: [{ path: ["a/b", 0], slot: captureOrbInventorySlot(orb()) }],
    orbRecords: [{ path: ["a", "b", 0], orb: orb("rack-orb", "rack-specimen") }] };
  const before = canonicalJson(sources), index = indexCreatureCustody(sources);
  assert.equal(index.stored.length, 2); assert.equal(index.freeBodies.length, 0);
  assert.deepEqual(index.stored.map(value => value.path), [["a/b", 0], ["a", "b", 0]]);
  assert(index.stored[0].custody.legacyMirror); assert.equal(index.stored[0].body, null);
  assert.equal(canonicalJson(sources), before); assert(!Object.isFrozen(sources));
  assert(Object.isFrozen(index.stored[0].custody.creature.custom));
});

test("a deployed orb and its current live or sleeping body are one linked custody unit", () => {
  for (const sleeping of [false, true]) {
    const initial = deployed(), sources = sleeping ? { ...initial, creatures: [], sleepingCreatures: initial.creatures } : initial;
    const index = indexCreatureCustody(sources);
    assert.equal(index.stored.length, 1); assert.equal(index.freeBodies.length, 0);
    assert.equal(index.stored[0].body!.collection, sleeping ? "sleepingCreatures" : "creatures");
    assert.deepEqual(index.stored[0].body!.creature, initial.creatures[0]);
    // The stored snapshot is intentionally older than the deployed simulation.
    assert.equal(index.stored[0].custody.creature.health, 5);
    assert.equal(index.stored[0].body!.creature.health, 4);
    assert(!Object.hasOwn(index.stored[0], "attached")); assert(!Object.hasOwn(index.stored[0], "authorized"));
  }
});

test("one hundred cold inspections preserve every source byte without clock reads, IDs or coordinate interpretation", () => {
  const sources = deployed(), baseline = canonicalJson(sources), expected = canonicalJson(indexCreatureCustody(sources));
  const clock = Date.now;
  Date.now = () => { throw Error("custody inspection read the clock"); };
  try {
    for (let iteration = 0; iteration < 100; iteration++) {
      assert.equal(canonicalJson(indexCreatureCustody(JSON.parse(baseline))), expected);
      assert.equal(canonicalJson(sources), baseline);
    }
  } finally { Date.now = clock; }
});

test("anonymous legacy free bodies and empty shells stay anonymous while jars retain their separate vessel identity", () => {
  const legacy = { ...body() }; delete legacy.specimenId;
  const jar = captureLanternJar({ item: Item.SpecimenJar, count: 1 }, metadata("lantern", "vacuum-lantern"), "orb", 42)!;
  const index = indexCreatureCustody({ ...empty(), creatures: [legacy],
    inventorySlots: [{ path: ["jar"], slot: jar }, { path: ["empty"], slot: { item: Item.CaptureOrb, count: 16 } }],
    orbRecords: [{ path: ["rack"], orb: orb() }, { path: ["unused"], orb: createEmptyCaptureOrb("anonymous") }] });
  assert.equal(index.stored.length, 2); assert.equal(index.freeBodies.length, 1);
  assert(!Object.hasOwn(index.freeBodies[0].creature, "specimenId"));
});

test("duplicate physical vessels, specimens, paths and live/sleep bodies reject instead of converging copies", () => {
  const source = deployed(), slot = source.inventorySlots[0].slot;
  const bad: CreatureCustodySources[] = [
    { ...source, inventorySlots: [...source.inventorySlots, { path: ["copy"], slot }] },
    { ...empty(), orbRecords: [{ path: ["a"], orb: orb() }, { path: ["b"], orb: orb("different") }] },
    { ...empty(), inventorySlots: [{ path: ["same"], slot: null }], orbRecords: [{ path: ["same"], orb: null }] },
    { ...source, sleepingCreatures: source.creatures },
    { ...empty(), creatures: [body(), body(24)] },
    { ...empty(), orbRecords: [{ path: ["stored"], orb: orb() }], creatures: [body()] },
    { ...empty(), inventorySlots: [{ path: [], slot: null }] },
  ];
  for (const value of bad) assert.throws(() => indexCreatureCustody(value));
});

test("missing owners, temporary IDs and every mismatched deployed identity refuse without repairing state", () => {
  const source = deployed(), originalBody = source.creatures[0];
  for (const changed of [
    { ...originalBody, id: 24 }, { ...originalBody, specimenId: "other" },
    { ...originalBody, kind: "woolhorn" as const }, { ...originalBody, attunedOrbId: "other" },
    { ...originalBody, creatureOwnerId: "other" }, { ...originalBody, geneticSeed: 999 },
    { ...originalBody, specimenId: undefined }, { ...originalBody, attunedOrbId: null },
  ]) assert.throws(() => indexCreatureCustody({ ...source, creatures: [changed] }));
  assert.throws(() => indexCreatureCustody({ ...source, creatures: [] }));
  assert.throws(() => indexCreatureCustody({ ...source, inventorySlots: [] }));
  const raw = JSON.parse(source.inventorySlots[0].slot!.metadata!.captureOrb as string) as CaptureOrb;
  for (const activeEntityId of ["specimen", "023", "2.3e1", "23.0"]) {
    const changed = { ...raw, attunement: { ...raw.attunement!, activeEntityId } };
    assert.throws(() => indexCreatureCustody({ ...source, inventorySlots: [], orbRecords: [{ path: ["orb"], orb: changed }] }));
  }
});

test("direct orb records cannot silently lose nested undefined, accessors or unsupported fields", () => {
  const makeSource = (value: CaptureOrb) => ({ ...empty(), orbRecords: [{ path: ["rack"], orb: value }] });
  const bad = { ...orb(), creature: { ...metadata(), custom: { hidden: undefined } } };
  assert.throws(() => indexCreatureCustody(makeSource(bad as unknown as CaptureOrb)));
  const extra = { ...orb(), unknown: 1 };
  assert.throws(() => indexCreatureCustody(makeSource(extra)));
  const getter = { ...orb() }; let getterReads = 0;
  Object.defineProperty(getter, "lens", { get() { getterReads++; return null; }, enumerable: true });
  assert.throws(() => indexCreatureCustody(makeSource(getter)));
  assert.equal(getterReads, 0);
  const bodies = [body(-1), { ...body(), health: -1 }, { ...body(), x: Infinity }];
  for (const creature of bodies) assert.throws(() => indexCreatureCustody({ ...empty(), creatures: [creature] }));
});

test("housed residents and encoded hive orbs retain their real storage form without synthesizing a vessel", () => {
  const encoded = JSON.stringify(orb(), null, 2);
  const sources = { ...empty(), orbRecords: [{ path: ["hive", "worker", "storedOrb"], orb: encoded }],
    residents: [{ path: ["aquarium", "resident"], creature: metadata("fish") }] };
  const result = indexCreatureCustody(sources);
  assert.equal(result.stored[0].custody.encoded, encoded);
  assert.deepEqual(result.residents[0], sources.residents[0]);
  assert(!Object.hasOwn(result.residents[0], "containerId"));
  assert.throws(() => indexCreatureCustody({ ...sources, residents: [{ path: ["perch"], creature: metadata() }] }));
  assert.throws(() => indexCreatureCustody({ ...sources, creatures: [body(77, "fish")] }));
  assert.throws(() => indexCreatureCustody({ ...sources, residents: [...sources.residents, { path: ["other"], creature: metadata("fish") }] }));
});
