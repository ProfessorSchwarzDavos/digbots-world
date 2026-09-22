import assert from "node:assert/strict";
import test from "node:test";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb, type CaptureOrb } from "../app/game/capture-orbs";
import type { CreatureMetadata } from "../app/game/creature-cage";
import type { CreatureOrigins } from "../app/game/creature-origins";
import type { SavedCreature } from "../app/game/engine";
import { Item } from "../app/game/data";
import { captureLanternJar } from "../app/game/lantern-jar";
import { homeLocation, locationAddress, locationId, universeId, type LocationId } from "../app/game/location-address";
import { indexScopedCreatureCustody, type ScopedCreatureCustodySources } from "../app/game/scoped-creature-custody-index";
import { canonicalJson } from "../app/game/universe-json";

const universe = universeId("scoped-custody"), home = locationId(homeLocation(universe));
const orbit = locationId(locationAddress({ ...homeLocation(universe), kind: "orbit", instanceId: "low" }));
const foreign = locationId(homeLocation(universeId("elsewhere")));
const origins = (location: LocationId): CreatureOrigins => ({ specimenOriginLocationId: location, encounterOriginLocationId: location });

function metadata(id = "specimen", provenance: CreatureOrigins = {}, kind: CreatureMetadata["kind"] = "peelop"): CreatureMetadata {
  return { schema: 1, entityId: id, kind, health: 5, maxHealth: 7, ageTicks: 123, baby: false,
    temperament: "Gentle", hostile: false, tamed: true, ownerId: "keeper", name: "Exact",
    geneticSeed: 321, command: "follow", custom: { ...provenance, nested: { x: 789, y: .1 } } };
}
function orb(id = "orb", specimen = "specimen", provenance: CreatureOrigins = {}): CaptureOrb {
  return captureIntoOrb(createEmptyCaptureOrb(id), metadata(specimen, provenance), 42, "keeper")!;
}
function body(id = 23, specimenId = "specimen", provenance: CreatureOrigins = {}): SavedCreature {
  return { id, specimenId, ...provenance, kind: "peelop", x: 1000.125, y: 30.25, z: -789.875, yaw: .3,
    health: 4, age: 130, geneticSeed: 321, creatureOwnerId: "keeper" };
}
function empty(): ScopedCreatureCustodySources { return { inventorySlots: [], orbRecords: [], residents: [], creatures: [], sleepingCreatures: [] }; }
function deployed(provenance: CreatureOrigins = origins(home)): ScopedCreatureCustodySources {
  const value = { ...orb("orb", "specimen", provenance),
    attunement: { ownerId: "keeper", attunedAt: 50, activeEntityId: "23", recalledAt: 0, recallCount: 0, fainted: false } };
  return { ...empty(), orbRecords: [{ path: ["locations", orbit, "host", "inventory", 0], locationId: orbit, orb: value }],
    creatures: [{ locationId: orbit, creature: { ...body(23, "specimen", provenance), attunedOrbId: "orb" } }] };
}
const inspect = (sources: ScopedCreatureCustodySources) => indexScopedCreatureCustody(sources, universe);

test("equal numeric body IDs remain independent in different locations but collide within one", () => {
  const sources = { ...empty(), creatures: [{ locationId: home, creature: body(23, "home", origins(home)) }],
    sleepingCreatures: [{ locationId: orbit, creature: body(23, "orbit", origins(orbit)) }] };
  assert.deepEqual(inspect(sources).freeBodies.map(value => [value.collection, value.locationId, value.creature.id]),
    [["creatures", home, 23], ["sleepingCreatures", orbit, 23]]);
  assert.throws(() => inspect({ ...sources, sleepingCreatures: [{ ...sources.sleepingCreatures[0], locationId: home }] }), /within one location/);
  assert.throws(() => inspect({ ...sources, creatures: [...sources.creatures, sources.creatures[0]] }), /within one location/);
});

test("distinct explicit specimen origins qualify equal bare identities without rewriting them", () => {
  const sources = { ...empty(),
    orbRecords: [{ path: ["storage"], locationId: home, orb: orb("orb", "specimen", origins(orbit)) }],
    creatures: [{ locationId: orbit, creature: body(23, "specimen", origins(home)) }] };
  const result = inspect(sources);
  assert.equal(result.stored[0].custody.creature.entityId, "specimen");
  assert.equal(result.freeBodies[0].creature.specimenId, "specimen");
  assert.equal(result.stored[0].locationId, home);
  assert.equal(result.stored[0].custody.creature.custom.specimenOriginLocationId, orbit);
  assert.equal(result.freeBodies[0].locationId, orbit);
  assert.equal(result.freeBodies[0].creature.specimenOriginLocationId, home);
  assert.equal(inspect({ ...empty(), residents: [
    { path: ["home"], locationId: home, creature: metadata("same", origins(home)) },
    { path: ["orbit"], locationId: orbit, creature: metadata("same", origins(orbit)) },
  ] }).residents.length, 2);
  assert.equal(inspect({ ...empty(), creatures: [
    { locationId: home, creature: body(23, "same", origins(home)) },
    { locationId: orbit, creature: body(23, "same", origins(orbit)) },
  ] }).freeBodies.length, 2);
});

test("a fully-qualified specimen cannot have two stored, resident or free body owners", () => {
  const stored = { path: ["stored"], locationId: home, orb: orb("orb", "specimen", origins(home)) };
  const resident = { path: ["resident"], locationId: orbit, creature: metadata("specimen", origins(home)) };
  const physical = { locationId: orbit, creature: body(23, "specimen", origins(home)) };
  const bad: ScopedCreatureCustodySources[] = [
    { ...empty(), orbRecords: [stored, { ...stored, path: ["other"], orb: orb("other", "specimen", origins(home)) }] },
    { ...empty(), orbRecords: [stored], residents: [resident] },
    { ...empty(), orbRecords: [stored], creatures: [physical] },
    { ...empty(), residents: [resident], creatures: [physical] },
    { ...empty(), residents: [resident, { ...resident, path: ["other"] }] },
    { ...empty(), creatures: [physical], sleepingCreatures: [{ ...physical, locationId: home }] },
    { ...empty(), creatures: [physical, { ...physical, creature: { ...physical.creature, id: 24 } }] },
  ];
  for (const source of bad) assert.throws(() => inspect(source), /Duplicate fully-qualified specimen/);
});

test("repeated bare identities with any unknown origin are unresolved legacy ambiguity", () => {
  for (const [left, right] of [[{}, {}], [{}, origins(home)], [origins(home), {}]]) {
    const source = { ...empty(), orbRecords: [{ path: ["archive"], locationId: null, orb: orb("orb", "same", left) }],
      residents: [{ path: ["resident"], locationId: orbit, creature: metadata("same", right) }] };
    assert.throws(() => inspect(source), /Ambiguous legacy specimen/);
    assert.throws(() => inspect({ ...empty(), creatures: [
      { locationId: home, creature: body(23, "same", left) }, { locationId: orbit, creature: body(23, "same", right) },
    ] }), /Ambiguous legacy specimen/);
  }
  // Encounter origin cannot stand in for specimen origin.
  assert.throws(() => inspect({ ...empty(), residents: [
    { path: ["a"], locationId: home, creature: metadata("same", { encounterOriginLocationId: home }) },
    { path: ["b"], locationId: orbit, creature: metadata("same", origins(orbit)) },
  ] }), /Ambiguous legacy specimen/);
});

test("duplicate filled vessels stay ambiguous across global paths and different specimen origins", () => {
  const sources = { ...empty(), inventorySlots: [{ path: ["locations", home, "cargo", 0], locationId: home,
    slot: captureOrbInventorySlot(orb("same-vessel", "same", origins(home))) }],
  orbRecords: [{ path: ["locations", orbit, "rack", 0], locationId: orbit, orb: orb("same-vessel", "same", origins(orbit)) }] };
  assert.throws(() => inspect(sources), /Ambiguous duplicate filled creature vessel/);
});

test("deployed orb and exact body in the holder location form one owner for live and sleeping bodies", () => {
  for (const sleeping of [false, true]) for (const provenance of [{}, origins(home)]) {
    const source = deployed(provenance), remote = { locationId: home, creature: body(23, "independent", origins(orbit)) };
    const result = inspect(sleeping ? { ...source, creatures: [remote], sleepingCreatures: source.creatures }
      : { ...source, creatures: [...source.creatures, remote] });
    assert.equal(result.stored.length, 1);
    assert.equal(result.stored[0].locationId, orbit);
    assert.equal(result.stored[0].body!.locationId, orbit);
    assert.equal(result.stored[0].body!.collection, sleeping ? "sleepingCreatures" : "creatures");
    assert.equal(result.stored[0].body!.creature.health, 4);
    assert.equal(result.stored[0].custody.creature.health, 5);
    assert.equal(result.freeBodies.length, 1);
    assert.equal(result.freeBodies[0].locationId, home);
  }
});

test("unknown or wrong holder location never borrows a convenient body ID elsewhere", () => {
  const source = deployed();
  for (const location of [home, null]) assert.throws(() => inspect({ ...source,
    orbRecords: [{ ...source.orbRecords[0], locationId: location }] }), /holder location|mismatched deployed/);
  assert.throws(() => inspect({ ...source, creatures: [{ ...source.creatures[0], locationId: home }] }), /mismatched deployed/);
  assert.throws(() => inspect({ ...source, creatures: [] }), /mismatched deployed/);
  assert.throws(() => inspect({ ...source, orbRecords: [] }), /Attuned body/);
});

test("deployed identity is exact decimal ID with matching kind, owner, genetics, attunement and origins", () => {
  const source = deployed(), original = source.creatures[0].creature;
  for (const patch of [
    { id: 24 }, { specimenId: "other" }, { kind: "woolhorn" as const }, { attunedOrbId: "other" },
    { creatureOwnerId: "other" }, { geneticSeed: 999 }, { attunedOrbId: null },
  ]) assert.throws(() => inspect({ ...source, creatures: [{ locationId: orbit, creature: { ...original, ...patch } }] }), /mismatched deployed/);
  for (const provenance of [{}, origins(orbit), { specimenOriginLocationId: home },
    { specimenOriginLocationId: home, encounterOriginLocationId: orbit }]) {
    const creature = { ...body(23, "specimen", provenance), attunedOrbId: "orb" };
    assert.throws(() => inspect({ ...source, creatures: [{ locationId: orbit, creature }] }), /provenance disagree/);
  }
  const originalOrb = source.orbRecords[0].orb as CaptureOrb;
  for (const activeEntityId of ["specimen", "023", "2.3e1", "23.0", "-0", "9007199254740992"]) {
    assert.throws(() => inspect({ ...source, orbRecords: [{ ...source.orbRecords[0],
      orb: { ...originalOrb, attunement: { ...originalOrb.attunement!, activeEntityId } } }] }), /mismatched deployed/);
  }
});

test("nested canonical paths retain exact components and encoded archive bytes", () => {
  const encoded = JSON.stringify(orb("archive", "archive"), null, 2);
  const sources = { ...empty(), inventorySlots: [
    { path: ["locations", home, "boats", "a/b", "inventory", 0, "metadata", "lifeSupport", "sockets", 1], locationId: home, slot: captureOrbInventorySlot(orb()) },
    { path: ["a/b", 0], locationId: null, slot: null },
    { path: ["a", "b", 0], locationId: null, slot: null },
  ], orbRecords: [{ path: ["archives", "checkpoint", "guest", "savedOrb"], locationId: null, orb: encoded }] };
  const result = inspect(sources);
  assert.deepEqual(result.stored[0].path, sources.inventorySlots[0].path);
  assert.equal(result.stored[1].locationId, null);
  assert.equal(result.stored[1].custody.encoded, encoded);
  assert.throws(() => inspect({ ...sources, orbRecords: [{ path: ["a/b", 0], locationId: home, orb: null }] }), /Duplicate canonical/);
  for (const path of [[], [""], [" spaced "], [-1], [1.5]])
    assert.throws(() => inspect({ ...empty(), inventorySlots: [{ path, locationId: null, slot: null }] }), /custody path|custody identity/);
});

test("every body, empty holder and explicit provenance has a canonical expected-universe location", () => {
  const invalid = [foreign, `${home} ` as LocationId, "home" as LocationId, undefined as unknown as LocationId];
  for (const location of invalid) {
    assert.throws(() => inspect({ ...empty(), creatures: [{ locationId: location, creature: body() }] }));
    assert.throws(() => inspect({ ...empty(), inventorySlots: [{ path: ["empty"], locationId: location, slot: null }] }));
    assert.throws(() => inspect({ ...empty(), orbRecords: [{ path: ["empty"], locationId: location, orb: null }] }));
    assert.throws(() => inspect({ ...empty(), residents: [{ path: ["resident"], locationId: location, creature: metadata() }] }));
  }
  assert.throws(() => inspect({ ...empty(), creatures: [{ locationId: home, creature: body(23, "specimen", origins(foreign)) }] }), /Unsupported foreign creature provenance/);
  assert.throws(() => inspect({ ...empty(), orbRecords: [{ path: ["foreign"], locationId: null, orb: orb("orb", "specimen", origins(foreign)) }] }), /Unsupported foreign creature provenance/);
  assert.throws(() => indexScopedCreatureCustody(empty(), " bad " as typeof universe));
});

test("anonymous legacy bodies and unknown holder residents remain unmodified; jar IDs have their own namespace", () => {
  const anonymous = { ...body() }; delete anonymous.specimenId;
  const jar = captureLanternJar({ item: Item.SpecimenJar, count: 1 }, metadata("lantern", {}, "vacuum-lantern"), "orb", 42)!;
  const result = inspect({ ...empty(), creatures: [{ locationId: home, creature: anonymous }, { locationId: orbit, creature: anonymous }],
    inventorySlots: [{ path: ["jar"], locationId: home, slot: jar }, { path: ["shells"], locationId: null, slot: { item: Item.CaptureOrb, count: 16 } }],
    orbRecords: [{ path: ["orb"], locationId: null, orb: orb() }],
    residents: [{ path: ["housed"], locationId: null, creature: metadata("resident") }] });
  assert.equal(result.stored.length, 2);
  assert.equal(result.freeBodies.length, 2);
  for (const value of result.freeBodies) {
    assert(!Object.hasOwn(value.creature, "specimenId"));
    assert(!Object.hasOwn(value.creature, "specimenOriginLocationId"));
  }
  assert.equal(result.residents[0].locationId, null);
  assert(!Object.hasOwn(result.residents[0].creature.custom, "specimenOriginLocationId"));
});

test("strict body, slot, metadata and source envelopes refuse lossy or hidden data", () => {
  for (const creature of [body(-1), { ...body(), x: Infinity }, { ...body(), health: -1 }, { ...body(), age: -1 },
    { ...body(), specimenId: undefined }, { ...body(), unsupported: true }, { ...body(), specimenId: " bad " }])
    assert.throws(() => inspect({ ...empty(), creatures: [{ locationId: home, creature }] }));
  const invalidMetadata = { ...metadata(), health: 8 };
  assert.throws(() => inspect({ ...empty(), residents: [{ path: ["resident"], locationId: home, creature: invalidMetadata }] }));
  const invalidSlot = { ...captureOrbInventorySlot(orb()), count: 2 };
  assert.throws(() => inspect({ ...empty(), inventorySlots: [{ path: ["slot"], locationId: home, slot: invalidSlot }] }));
  const base = deployed();
  const bad: unknown[] = [
    { ...base, unsupported: true }, { ...base, residents: undefined },
    { ...base, orbRecords: [{ ...base.orbRecords[0], locationId: undefined }] },
    { ...base, creatures: [{ ...base.creatures[0], repair: true }] },
    { ...base, orbRecords: [{ path: ["missing"], orb: null }] },
    { ...base, creatures: new Array(1) },
  ];
  let reads = 0;
  const getter = { ...base.orbRecords[0] };
  Object.defineProperty(getter, "orb", { get() { reads++; return null; }, enumerable: true });
  bad.push({ ...base, orbRecords: [getter] });
  for (const value of bad) assert.throws(() => inspect(value as ScopedCreatureCustodySources));
  assert.equal(reads, 0);
});

test("one hundred cold inspections stay detached and frozen with no mutation, clocks or identity allocation", () => {
  const source = deployed(), baseline = canonicalJson(source), first = inspect(source), expected = canonicalJson(first);
  const clock = Date.now, random = Math.random;
  Date.now = () => { throw Error("custody read the clock"); };
  Math.random = () => { throw Error("custody allocated a random identity"); };
  try {
    for (let iteration = 0; iteration < 100; iteration++) {
      assert.equal(canonicalJson(inspect(JSON.parse(baseline))), expected);
      assert.equal(canonicalJson(source), baseline);
    }
  } finally { Date.now = clock; Math.random = random; }
  assert.equal(first.sourceBaseline, baseline);
  assert(Object.isFrozen(first)); assert(Object.isFrozen(first.stored[0].body!.creature));
  assert(Object.isFrozen(first.stored[0].custody.creature.custom));
  assert(Object.isFrozen(first.stored[0].path)); assert(!Object.isFrozen(source.creatures[0].creature));
  source.creatures[0].creature.health = 3;
  assert.equal(first.stored[0].body!.creature.health, 4);
  assert(!Object.hasOwn(first, "authorized")); assert(!Object.hasOwn(first, "attached"));
});
