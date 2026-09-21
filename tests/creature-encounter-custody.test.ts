import assert from "node:assert/strict";
import test from "node:test";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb } from "../app/game/capture-orbs";
import type { CreatureMetadata } from "../app/game/creature-cage";
import type { SavedCreature } from "../app/game/engine";
import type { CreatureCustodySources } from "../app/game/creature-custody-index";
import { reconcileCreatureEncounterCustody, type CreatureEncounterSources } from "../app/game/creature-encounter-custody";
import { createPrimeEncounterState, planPrimeEncounter, transferPrimeEncounterCustody, type PrimeEncounterState } from "../app/game/creature-rarity";
import { LEGENDARY_ENCOUNTERS, applyLegendaryEvent, createLegendaryEncounterState, resolveLegendaryEncounter,
  transferLegendaryCustody, type LegendaryEncounterState } from "../app/game/legendary-encounters";
import { canonicalJson } from "../app/game/universe-json";

const empty = (): CreatureCustodySources => ({ inventorySlots: [], orbRecords: [], residents: [], creatures: [], sleepingCreatures: [] });
const history = (): CreatureEncounterSources => ({ primeEncounters: {}, legendaryEncounters: {} });
const anchor = "prime:petalfox:-19:23", site = "legendary-site:-9:15:walking-spring";
function metadata(specimen = "specimen", kind: CreatureMetadata["kind"] = "petalfox", custom: CreatureMetadata["custom"] = { primeAnchorId: anchor }): CreatureMetadata {
  return { schema: 1, entityId: specimen, kind, health: 5, maxHealth: 7, ageTicks: 123, baby: false, temperament: "Gentle",
    hostile: false, tamed: true, ownerId: "keeper", name: null, geneticSeed: 321, command: null, custom };
}
function body(meta = metadata(), id = 23): SavedCreature {
  return { id, specimenId: meta.entityId, kind: meta.kind, x: 1000.125, y: 30.25, z: -789.875, yaw: .3,
    health: 4, age: 130, geneticSeed: meta.geneticSeed, creatureOwnerId: "keeper", ...meta.custom };
}
function prime(): PrimeEncounterState {
  const plan = planPrimeEncounter("petalfox", { worldSeed: "fixture", x: -19 * 96, z: 23 * 96, y: 30, surfaceY: 30,
    biomeName: "Glimmerwood", weather: "clear", daylight: .8 })!;
  return { ...createPrimeEncounterState(plan, "petalfox", 23, 100), specimenId: "specimen" };
}
function stored(meta = metadata(), deployed = false): CreatureCustodySources {
  const orb = captureIntoOrb(createEmptyCaptureOrb("orb"), meta, 200, "keeper")!;
  return { ...empty(), inventorySlots: [{ path: ["inventory", 0], slot: captureOrbInventorySlot({ ...orb,
    ...(deployed ? { attunement: { ownerId: "keeper", attunedAt: 210, activeEntityId: "23", recalledAt: 0, recallCount: 0, fainted: false } } : {}) }) }],
    creatures: deployed ? [{ ...body(meta), attunedOrbId: "orb" }] : [] };
}
function legendary(): LegendaryEncounterState {
  let state = createLegendaryEncounterState("walking-spring", site);
  for (const stage of LEGENDARY_ENCOUNTERS["walking-spring"].stages) for (const objective of stage.objectives)
    state = applyLegendaryEvent(state, { kind: objective.event, amount: objective.target, siteId: site, sourceId: `${stage.id}:${objective.id}` });
  return state;
}
const legendaryMetadata = () => metadata("legendary", LEGENDARY_ENCOUNTERS["walking-spring"].kind,
  { legendaryEncounterId: "walking-spring", legendarySiteId: site });

test("Prime current bodies bind by exact IDs while historical regional anchors remain unchanged", () => {
  const state = prime(), sources = { ...history(), primeEncounters: { [anchor]: state } };
  const result = reconcileCreatureEncounterCustody({ ...empty(), sleepingCreatures: [body()] }, sources);
  assert.deepEqual(result.primeOwners, [{ anchorId: anchor, owner: { specimenId: "specimen", kind: "petalfox", path: null,
    body: { collection: "sleepingCreatures", id: 23 } } }]);
  assert.deepEqual(result.history, sources); assert(!Object.hasOwn(result.primeOwners[0], "attached"));
  const { specimenId: _oldSpecimen, ...legacy } = state;
  assert.equal(_oldSpecimen, "specimen");
  const legacyResult = reconcileCreatureEncounterCustody({ ...empty(), creatures: [body()] }, { ...history(), primeEncounters: { [anchor]: legacy } });
  assert(!Object.hasOwn(legacyResult.history.primeEncounters[anchor], "specimenId"));
});

test("captured Prime stays container-owned across stored, deployed, aquarium and perch representations", () => {
  const captured = transferPrimeEncounterCustody(prime(), "captured", "specimen", "orb:orb", null, 200);
  for (const deployed of [false, true]) {
    const state = { ...captured, entityId: deployed ? 23 : null };
    const result = reconcileCreatureEncounterCustody(stored(metadata(), deployed), { ...history(), primeEncounters: { [anchor]: state } });
    assert.deepEqual(result.primeOwners[0].owner!.path, ["inventory", 0]);
    assert.equal(result.primeOwners[0].owner!.body?.id ?? null, state.entityId);
  }
  for (const [root, prefix, suffix] of [["aquariums", "aquarium", "residents"], ["fieldPerches", "perch", "resident"]]) {
    const path = root === "aquariums" ? [root, "4,30,5", suffix, 0] : [root, "4,30,5", suffix];
    const result = reconcileCreatureEncounterCustody({ ...empty(), residents: [{ path, creature: metadata() }] },
      { ...history(), primeEncounters: { [anchor]: { ...captured, custodyId: `${prefix}:specimen` } } });
    assert.equal(result.primeOwners[0].owner!.body, null);
  }
});

test("legendary stored and deployed owners use current custody, not a second specimen or old site point", () => {
  const captured = resolveLegendaryEncounter(legendary(), "capture", "orb:orb", 17);
  for (const deployed of [false, true]) {
    const state = deployed ? transferLegendaryCustody(captured, "orb:orb", "creature:23") : captured;
    const result = reconcileCreatureEncounterCustody(stored(legendaryMetadata(), deployed), { ...history(), legendaryEncounters: { [site]: state } });
    assert.equal(result.legendaryOwners.length, 1); assert.equal(result.legendaryOwners[0].owner!.specimenId, "legendary");
    assert.equal(result.history.legendaryEncounters[site].uniqueResolutionToken, captured.uniqueResolutionToken);
  }
  const free = resolveLegendaryEncounter(legendary(), "capture", "creature:23", 17);
  assert.equal(reconcileCreatureEncounterCustody({ ...empty(), creatures: [body(legendaryMetadata())] },
    { ...history(), legendaryEncounters: { [site]: free } }).legendaryOwners[0].owner!.path, null);
});

test("dormant and resolved history remains canonical without inventing a living owner", () => {
  for (const state of [createLegendaryEncounterState("walking-spring", site), legendary(),
    ...(["release", "defeat", "covenant"] as const).map(outcome => resolveLegendaryEncounter(legendary(), outcome, null, 17))]) {
    assert.equal(reconcileCreatureEncounterCustody(empty(), { ...history(), legendaryEncounters: { [site]: state } }).legendaryOwners[0].owner, null);
  }
  const covenant = resolveLegendaryEncounter(legendary(), "covenant", null, 17);
  assert(reconcileCreatureEncounterCustody({ ...empty(), creatures: [body(legendaryMetadata())] },
    { ...history(), legendaryEncounters: { [site]: covenant } }).legendaryOwners[0].owner);
  const defeated: PrimeEncounterState = { ...prime(), status: "defeated", entityId: null, custodyId: null };
  assert.equal(reconcileCreatureEncounterCustody(empty(), { ...history(), primeEncounters: { [anchor]: defeated } }).primeOwners[0].owner, null);
});

test("stale recall references, missing owners, wrong species and divergent deployment references fail closed", () => {
  const captured = transferPrimeEncounterCustody(prime(), "captured", "specimen", "orb:orb", null, 200);
  for (const state of [{ ...captured, entityId: 23 }, { ...captured, specimenId: "copy" }, { ...captured, custodyId: "orb:other" }, prime()])
    assert.throws(() => reconcileCreatureEncounterCustody(stored(), { ...history(), primeEncounters: { [anchor]: state } }));
  assert.throws(() => reconcileCreatureEncounterCustody(empty(), { ...history(), primeEncounters: { [anchor]: captured } }));
  assert.throws(() => reconcileCreatureEncounterCustody(stored(), history()), /unresolved/);
  const deployed = stored(metadata(), true);
  assert.throws(() => reconcileCreatureEncounterCustody({ ...deployed, creatures: [{ ...deployed.creatures[0], primeAnchorId: "prime:petalfox:0:0" }] },
    { ...history(), primeEncounters: { [anchor]: { ...captured, entityId: 23 } } }), /links differ/);
  const resolved = resolveLegendaryEncounter(legendary(), "capture", "creature:23", 17);
  assert.throws(() => reconcileCreatureEncounterCustody(stored(legendaryMetadata()), { ...history(), legendaryEncounters: { [site]: resolved } }), /current body\/orb/);
  assert.throws(() => reconcileCreatureEncounterCustody({ ...empty(), creatures: [{ ...body(legendaryMetadata()), kind: "peelop" }] },
    { ...history(), legendaryEncounters: { [site]: resolved } }), /species/);
  assert.throws(() => reconcileCreatureEncounterCustody({ ...empty(), creatures: [body(legendaryMetadata()), body({ ...legendaryMetadata(), entityId: "copy" }, 24)] },
    { ...history(), legendaryEncounters: { [site]: resolved } }), /Duplicate/);
});

test("unknown and lossy histories reject without invoking accessors or normalizing original records", () => {
  const sources = { ...history(), primeEncounters: { [anchor]: prime() } }, baseline = canonicalJson(sources);
  const bad = [
    { ...sources, primeEncounters: { [anchor]: { ...prime(), unknown: 1 } } },
    { ...sources, primeEncounters: { [anchor]: { ...prime(), lastUpdatedAt: 0 } } },
    { ...sources, primeEncounters: { [anchor]: { ...prime(), custodyId: undefined } } },
    { ...history(), legendaryEncounters: { [site]: { ...legendary(), revision: -1 } } },
    { ...history(), legendaryEncounters: { [site]: { ...legendary(), unknown: 1 } } },
    { ...history(), legendaryEncounters: { [site]: { ...legendary(), outcome: "capture" } } },
  ];
  for (const candidate of bad) assert.throws(() => reconcileCreatureEncounterCustody({ ...empty(), creatures: [body()] }, candidate as CreatureEncounterSources));
  let reads = 0;
  const accessor = Object.defineProperty({}, anchor, { enumerable: true, get: () => { reads++; return prime(); } });
  assert.throws(() => reconcileCreatureEncounterCustody(empty(), { ...history(), primeEncounters: accessor }));
  assert.equal(reads, 0); assert.equal(canonicalJson(sources), baseline);
});

test("one hundred cold reconciliations preserve finite encounter progress and exact historical IDs without clocks", () => {
  const custody = stored(legendaryMetadata(), true);
  const sources = { ...history(), legendaryEncounters: { [site]: resolveLegendaryEncounter(legendary(), "capture", "creature:23", 17) } };
  const before = canonicalJson({ custody, sources }), expected = canonicalJson(reconcileCreatureEncounterCustody(custody, sources));
  const now = Date.now; Date.now = () => { throw Error("read-only encounter custody consulted the clock"); };
  try {
    for (let i = 0; i < 100; i++) {
      const cold = JSON.parse(before);
      assert.equal(canonicalJson(reconcileCreatureEncounterCustody(cold.custody, cold.sources)), expected);
      assert.equal(canonicalJson({ custody, sources }), before);
    }
  } finally { Date.now = now; }
  const result = reconcileCreatureEncounterCustody(custody, sources);
  assert(Object.isFrozen(result.history.legendaryEncounters[site].objectiveProgress));
  assert(!Object.isFrozen(sources.legendaryEncounters));
});
