import assert from "node:assert/strict";
import test from "node:test";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb,
  LEGACY_SPECIES_ORB_ITEMS, type CaptureOrb } from "../app/game/capture-orbs";
import { captureCreature, encodeCapturedCreature, type CreatureMetadata } from "../app/game/creature-cage";
import { readExactEncodedCaptureOrb, readStoredCreatureCustody } from "../app/game/stored-creature-custody";
import { BlockId, Item, type InventorySlot } from "../app/game/data";
import { captureLanternJar } from "../app/game/lantern-jar";
import { canonicalJson } from "../app/game/universe-json";

function creature(kind: CreatureMetadata["kind"] = "peelop"): CreatureMetadata {
  return { schema: 1, entityId: "exact-specimen", kind, health: 5, maxHealth: 7, ageTicks: 123,
    baby: false, temperament: "Gentle", hostile: false, tamed: true, ownerId: "keeper", name: "Exact Name",
    geneticSeed: 321, command: "follow", custom: { foreignCoordinates: { x: 999, y: .1, z: -777 },
      nestedCargo: { count: 7, contents: ["opaque", 3.125] }, primeAnchorId: "prime:historical:1:-2" } };
}
function orb(): CaptureOrb { return captureIntoOrb(createEmptyCaptureOrb("exact-orb"), creature(), 42, "keeper")!; }

test("read-only orb custody preserves exact payload bytes, opaque metadata and the matching legacy mirror", () => {
  const original = orb(), slot = captureOrbInventorySlot(original), before = canonicalJson(slot);
  const result = readStoredCreatureCustody(slot)!;
  assert.equal(result.format, "capture-orb"); assert.equal(result.containerId, original.orbId);
  assert.equal(result.encoded, slot.metadata!.captureOrb); assert.equal(result.legacyMirror, slot.metadata!.capturedCreature);
  assert.deepEqual(result.creature, original.creature); assert.equal(result.attunement, null);
  assert.equal(canonicalJson(slot), before); assert(!Object.isFrozen(slot)); assert(Object.isFrozen(result.creature.custom));
  assert.deepEqual(readExactEncodedCaptureOrb(JSON.stringify(original, null, 2)), original);
});

test("one hundred reads never migrate absent fields, clear old lens configuration or change encoded custody", () => {
  const old = { ...orb() };
  delete old.lens; delete old.attunement;
  const encoded = JSON.stringify(old), oldLens = { ...old, lens: "gentle" as const };
  for (let index = 0; index < 100; index++) {
    const read = readExactEncodedCaptureOrb(encoded);
    assert.equal(JSON.stringify(read), canonicalJson(old));
    assert(!Object.hasOwn(read, "lens")); assert(!Object.hasOwn(read, "attunement"));
    assert.deepEqual(readExactEncodedCaptureOrb(JSON.stringify(oldLens)), oldLens);
  }
});

test("current deployed attunement is read exactly without claiming that its live body is a second stored specimen", () => {
  const current: CaptureOrb = { ...orb(), attunement: { ownerId: "keeper", attunedAt: 51, activeEntityId: "123",
    recalledAt: 40, recallCount: 2, fainted: false } };
  const result = readStoredCreatureCustody(captureOrbInventorySlot(current))!;
  assert.deepEqual(result.attunement, current.attunement); assert.equal(result.creature.entityId, "exact-specimen");
  assert(!Object.hasOwn(result, "attached")); assert(!Object.hasOwn(result, "authorized"));
});

test("legacy cage-only records and actual lantern jars retain their existing identities without an orb migration", () => {
  const cage = captureCreature("old-cage", creature(), 19)!;
  const slot = { item: Item.CreatureCage, count: 1, metadata: { capturedCreature: encodeCapturedCreature(cage) } };
  const result = readStoredCreatureCustody(slot)!;
  assert.equal(result.format, "legacy-cage"); assert.equal(result.containerId, "old-cage"); assert.deepEqual(result.creature, cage.creature);
  assert(!Object.hasOwn(slot.metadata, "captureOrb"));
  const jar = captureLanternJar({ item: Item.SpecimenJar, count: 1 }, creature("vacuum-lantern"), "old-jar", 23)!;
  const jarResult = readStoredCreatureCustody(jar)!;
  assert.equal(jarResult.format, "lantern-jar"); assert.equal(jarResult.containerId, "old-jar"); assert.equal(jarResult.creature.kind, "vacuum-lantern");
  assert.throws(() => readStoredCreatureCustody({ ...slot, item: Item.VacuumLanternJar }), /species/);
});

test("empty shells stay anonymous and legacy species stock cannot allocate an ID or consult the clock during inspection", () => {
  const previous = Date.now;
  Date.now = () => { throw Error("read-only preflight touched the clock"); };
  try {
    assert.equal(readStoredCreatureCustody(null), null);
    assert.equal(readStoredCreatureCustody({ item: Item.CaptureOrb, count: 16 }), null);
    assert.equal(readStoredCreatureCustody({ item: BlockId.Stone, count: 3 }), null);
    for (const item of LEGACY_SPECIES_ORB_ITEMS) assert.throws(() => readStoredCreatureCustody({ item, count: 1 }), /explicit migration/);
    const empty = createEmptyCaptureOrb("historical-empty");
    assert.equal(readStoredCreatureCustody({ item: Item.CaptureOrb, count: 1, metadata: { captureOrb: JSON.stringify(empty) } }), null);
  } finally { Date.now = previous; }
});

test("unknown fields, clamped counters, malformed species, dropped metadata and inconsistent mirrors fail closed", () => {
  const original = orb(), raw = structuredClone(original);
  const bad: unknown[] = [
    { ...raw, extra: 1 }, { ...raw, orbId: " spaced " }, { ...raw, capturedAt: -1 }, { ...raw, lens: "unknown" },
    { ...raw, creature: { ...raw.creature, ageTicks: 1.5 } }, { ...raw, creature: { ...raw.creature, geneticSeed: -1 } },
    { ...raw, creature: { ...raw.creature, temperament: "made-up" } }, { ...raw, creature: { ...raw.creature, unknown: 1 } },
    { ...raw, attunement: { ownerId: "keeper", attunedAt: 1, activeEntityId: "", recalledAt: 0, recallCount: 0, fainted: false } },
    { ...raw, attunement: { ownerId: "keeper", attunedAt: 1, activeEntityId: null, recalledAt: 0, recallCount: .5, fainted: false } },
    { ...raw, creature: null, attunement: { ownerId: "keeper" } },
  ];
  for (const value of bad) assert.throws(() => readExactEncodedCaptureOrb(JSON.stringify(value)));
  const filled = captureOrbInventorySlot(original), legacy = captureCreature("other-cage", creature(), 42)!;
  assert.throws(() => readStoredCreatureCustody({ ...filled, metadata: { ...filled.metadata, capturedCreature: encodeCapturedCreature(legacy) } }), /mirror disagree/);
  for (const slot of [{ ...filled, count: 2 }, { ...filled, item: BlockId.Stone },
    { item: Item.VacuumLanternJar, count: 1 }, { ...filled, metadata: { captureOrb: "not-json" } },
    { ...filled, metadata: { captureOrb: 42 } }]) assert.throws(() => readStoredCreatureCustody(slot as InventorySlot));
});
