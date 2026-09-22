import assert from "node:assert/strict";
import test from "node:test";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb } from "../app/game/capture-orbs";
import type { CreatureMetadata } from "../app/game/creature-cage";
import type { CreatureEncounterSources } from "../app/game/creature-encounter-custody";
import type { CreatureOrigins } from "../app/game/creature-origins";
import { createPrimeEncounterState, planPrimeEncounter, transferPrimeEncounterCustody, type PrimeEncounterState } from "../app/game/creature-rarity";
import type { SavedCreature } from "../app/game/engine";
import { LEGENDARY_ENCOUNTERS, applyLegendaryEvent, createLegendaryEncounterState, resolveLegendaryEncounter } from "../app/game/legendary-encounters";
import { homeLocation, locationId, universeId, type LocationId } from "../app/game/location-address";
import type { ScopedCreatureCustodySources } from "../app/game/scoped-creature-custody-index";
import { reconcileScopedCreatureEncounterCustody, type CreatureResidentFamily, type ScopedCreatureEncounterHistory } from "../app/game/scoped-creature-encounters";
import { canonicalJson } from "../app/game/universe-json";

const universe = universeId("scoped-encounters"), home = locationId(homeLocation(universe));
const orbit = locationId({ ...homeLocation(universe), kind: "orbit", instanceId: "low" });
const anchor = "prime:petalfox:-19:23", site = "legendary-site:-9:15:walking-spring";
const empty = (): ScopedCreatureCustodySources => ({ inventorySlots: [], orbRecords: [], residents: [], creatures: [], sleepingCreatures: [] });
const blankHistory = (): CreatureEncounterSources => ({ primeEncounters: {}, legendaryEncounters: {} });
const origins = (location: LocationId): CreatureOrigins => ({ specimenOriginLocationId: location, encounterOriginLocationId: location });
function metadata(provenance: CreatureOrigins = {}, legendary = false, id = "specimen"): CreatureMetadata {
  return { schema: 1, entityId: id, kind: legendary ? LEGENDARY_ENCOUNTERS["walking-spring"].kind : "petalfox", health: 5,
    maxHealth: 7, ageTicks: 123, baby: false, temperament: "Gentle", hostile: false, tamed: true, ownerId: "keeper", name: null,
    geneticSeed: 321, command: null, custom: { ...provenance, ...(legendary
      ? { legendaryEncounterId: "walking-spring", legendarySiteId: site } : { primeAnchorId: anchor }) } };
}
function body(meta = metadata(), id = 23): SavedCreature {
  return { id, specimenId: meta.entityId, kind: meta.kind, x: 1000.125, y: 30.25, z: -789.875, yaw: .3, health: 4, age: 130,
    geneticSeed: meta.geneticSeed, creatureOwnerId: "keeper", ...meta.custom };
}
function prime(specimenId = "specimen"): PrimeEncounterState {
  const plan = planPrimeEncounter("petalfox", { worldSeed: "fixture", x: -19 * 96, z: 23 * 96, y: 30, surfaceY: 30,
    biomeName: "Glimmerwood", weather: "clear", daylight: .8 })!;
  return { ...createPrimeEncounterState(plan, "petalfox", 23, 100), specimenId };
}
const capturedPrime = (orbId = "orb", deployed = false, specimenId = "specimen") =>
  transferPrimeEncounterCustody(prime(specimenId), "captured", specimenId, `orb:${orbId}`, deployed ? 23 : null, 200);
function legendary() {
  let state = createLegendaryEncounterState("walking-spring", site);
  for (const stage of LEGENDARY_ENCOUNTERS["walking-spring"].stages) for (const objective of stage.objectives)
    state = applyLegendaryEvent(state, { kind: objective.event, amount: objective.target, siteId: site, sourceId: `${stage.id}:${objective.id}` });
  return state;
}
function stored(meta = metadata(), orbId = "orb", deployed = false, holder: LocationId | null = home): ScopedCreatureCustodySources {
  const orb = captureIntoOrb(createEmptyCaptureOrb(orbId), meta, 200, "keeper")!;
  return { ...empty(), inventorySlots: [{ path: ["player", "host", "inventory", orbId], locationId: holder,
    slot: captureOrbInventorySlot({ ...orb, ...(deployed ? { attunement: { ownerId: "keeper", attunedAt: 210, activeEntityId: "23",
      recalledAt: 0, recallCount: 0, fainted: false } } : {}) }) }],
  creatures: deployed ? [{ locationId: holder!, creature: { ...body(meta), attunedOrbId: orbId } }] : [] };
}
function join(...values: ScopedCreatureCustodySources[]): ScopedCreatureCustodySources {
  return { inventorySlots: values.flatMap(value => value.inventorySlots), orbRecords: values.flatMap(value => value.orbRecords),
    residents: values.flatMap(value => value.residents), creatures: values.flatMap(value => value.creatures), sleepingCreatures: values.flatMap(value => value.sleepingCreatures) };
}
const history = (locationId: LocationId, sources: Partial<CreatureEncounterSources> = {}): ScopedCreatureEncounterHistory => ({ locationId, sources: { ...blankHistory(), ...sources } });
const inspect = (custody: ScopedCreatureCustodySources, histories: readonly ScopedCreatureEncounterHistory[], families: readonly CreatureResidentFamily[] = []) =>
  reconcileScopedCreatureEncounterCustody(custody, histories, families, universe);

test("independent equal Prime anchors, specimen IDs and body IDs bind to explicit origin locations", () => {
  const custody = { ...empty(), creatures: [{ locationId: home, creature: body(metadata(origins(home))) }],
    sleepingCreatures: [{ locationId: orbit, creature: body(metadata(origins(orbit))) }] };
  const histories = [history(home, { primeEncounters: { [anchor]: prime() } }), history(orbit, { primeEncounters: { [anchor]: prime() } })];
  const result = inspect(custody, histories);
  assert.equal(result.primeOwners.length, 2);
  for (const row of result.primeOwners) {
    assert.equal(row.owner?.encounterOriginLocationId, row.locationId); assert.equal(row.owner?.body?.locationId, row.locationId);
    assert.equal(row.owner?.body?.id, 23); assert.equal(row.owner?.specimenId, "specimen");
  }
});

test("carried inactive Prime history follows its explicit encounter origin, not the current holder or specimen origin", () => {
  const meta = metadata({ specimenOriginLocationId: home, encounterOriginLocationId: orbit }), custody = stored(meta, "orb", false, home);
  const defeated = { ...prime(), status: "defeated" as const, entityId: null, custodyId: null };
  const result = inspect(custody, [history(home, { primeEncounters: { [anchor]: defeated } }), history(orbit, { primeEncounters: { [anchor]: capturedPrime() } })]);
  assert.equal(result.primeOwners.find(row => row.locationId === home)!.owner, null);
  const owner = result.primeOwners.find(row => row.locationId === orbit)!.owner!;
  assert.equal(owner.holderLocationId, home); assert.equal(owner.specimenOriginLocationId, home); assert.equal(owner.encounterOriginLocationId, orbit);
});

test("unique legacy token association remains explicitly unknown and terminal histories do not borrow the owner", () => {
  const custody = stored(), before = canonicalJson(custody);
  const defeated = { ...prime(), status: "defeated" as const, entityId: null, custodyId: null };
  const histories = [history(home, { primeEncounters: { [anchor]: defeated } }), history(orbit, { primeEncounters: { [anchor]: capturedPrime() } })];
  const result = inspect(custody, histories), owner = result.primeOwners.find(row => row.locationId === orbit)!.owner!;
  assert.equal(owner.encounterOriginLocationId, null); assert.equal(owner.specimenOriginLocationId, null);
  assert.equal(result.primeOwners.find(row => row.locationId === home)!.owner, null); assert.equal(canonicalJson(custody), before);
  assert.throws(() => inspect(custody, [history(home, { primeEncounters: { [anchor]: capturedPrime() } }), histories[1]]), /Ambiguous or unresolved Prime/);
});

test("explicit missing or wrong encounter origin never falls back to a convenient legacy match", () => {
  const custody = stored(metadata(origins(home)));
  assert.throws(() => inspect(custody, [history(orbit, { primeEncounters: { [anchor]: capturedPrime() } })]), /unresolved Prime/);
  assert.throws(() => inspect(custody, [history(home, { primeEncounters: { [anchor]: { ...capturedPrime(), specimenId: "other" } } }),
    history(orbit, { primeEncounters: { [anchor]: capturedPrime() } })]), /unresolved Prime/);
});

test("two origin-qualified deployed Prime owners keep orb custody and their correct same-ID bodies", () => {
  const custody = join(stored(metadata(origins(home)), "home-orb", true, orbit), stored(metadata(origins(orbit)), "orbit-orb", true, home));
  const result = inspect(custody, [history(home, { primeEncounters: { [anchor]: capturedPrime("home-orb", true) } }),
    history(orbit, { primeEncounters: { [anchor]: capturedPrime("orbit-orb", true) } })]);
  for (const row of result.primeOwners) {
    assert.equal(row.owner?.body?.id, 23); assert.equal(row.owner?.body?.locationId, row.locationId === home ? orbit : home);
    assert.notEqual(row.owner?.path, null);
  }
  const bad = { ...custody, creatures: custody.creatures.map((row, index) => index ? row : { ...row, creature: { ...row.creature, primeAnchorId: "prime:petalfox:0:0" } }) };
  assert.throws(() => inspect(bad, []), /links differ/);
});

test("same bare legendary site and deployed body IDs resolve by explicit origin while preserving body custody", () => {
  const custody = join(stored(metadata(origins(home), true), "home-orb", true, home), stored(metadata(origins(orbit), true), "orbit-orb", true, orbit));
  const captured = resolveLegendaryEncounter(legendary(), "capture", "creature:23", 17);
  const histories = [history(home, { legendaryEncounters: { [site]: captured } }), history(orbit, { legendaryEncounters: { [site]: captured } })];
  const result = inspect(custody, histories);
  assert.equal(result.legendaryOwners.length, 2);
  for (const row of result.legendaryOwners) assert.equal(row.owner?.body?.locationId, row.locationId);
  assert.equal(result.history[0].sources.legendaryEncounters[site].uniqueResolutionToken, captured.uniqueResolutionToken);
  const wrongToken = resolveLegendaryEncounter(legendary(), "capture", "orb:home-orb", 17);
  assert.throws(() => inspect(custody, [history(home, { legendaryEncounters: { [site]: wrongToken } }), histories[1]]), /unresolved legendary/);
});

test("legacy legendary deployment with duplicated numeric custody tokens remains ambiguous", () => {
  const custody = stored(metadata({}, true), "orb", true, home), state = resolveLegendaryEncounter(legendary(), "capture", "creature:23", 17);
  assert.throws(() => inspect(custody, [history(home, { legendaryEncounters: { [site]: state } }), history(orbit, { legendaryEncounters: { [site]: state } })]), /Ambiguous or unresolved legendary/);
  const result = inspect(custody, [history(orbit, { legendaryEncounters: { [site]: state } })]);
  assert.equal(result.legendaryOwners[0].owner?.encounterOriginLocationId, null);
  assert.equal(result.legendaryOwners[0].owner?.body?.locationId, home);
});

test("prefixed aquarium and perch paths use explicit resident family provenance", () => {
  for (const [family, token] of [["aquariums", "aquarium"], ["fieldPerches", "perch"]] as const) {
    const path = ["location", home, family, "4,30,5", "resident"];
    const custody = { ...empty(), residents: [{ path, locationId: home, creature: metadata(origins(orbit)) }] };
    const sources = [history(orbit, { primeEncounters: { [anchor]: { ...capturedPrime(), custodyId: `${token}:specimen` } } })];
    const result = inspect(custody, sources, [{ path, family }]);
    assert.deepEqual(result.primeOwners[0].owner?.path, path); assert.equal(result.primeOwners[0].owner?.body, null);
    assert.throws(() => inspect(custody, sources), /family provenance/);
    assert.throws(() => inspect(custody, sources, [{ path, family: family === "aquariums" ? "fieldPerches" : "aquariums" }]), /unresolved Prime/);
    assert.throws(() => inspect(custody, sources, [{ path: ["wrong"], family }]), /family provenance/);
  }
});

test("every encounter-bearing unit must match before history projection, and live histories cannot lose their owner", () => {
  const good = stored(metadata(origins(home))), extra = stored(metadata(origins(orbit), false, "other"), "other");
  assert.throws(() => inspect(join(good, extra), [history(home, { primeEncounters: { [anchor]: capturedPrime() } })]), /unresolved Prime/);
  assert.throws(() => inspect(empty(), [history(home, { primeEncounters: { [anchor]: capturedPrime() } })]), /current body\/specimen/);
  const captured = resolveLegendaryEncounter(legendary(), "capture", "orb:orb", 17);
  assert.throws(() => inspect(empty(), [history(orbit, { legendaryEncounters: { [site]: captured } })]), /current body\/orb/);
  const duplicateLegacyPrime = { ...prime(), specimenId: undefined };
  assert.throws(() => inspect(good, [history(home, { primeEncounters: { [anchor]: duplicateLegacyPrime } })]));
});

test("multiple distinct specimens cannot share one qualified legendary history", () => {
  const custody = { ...empty(), creatures: [
    { locationId: home, creature: body(metadata(origins(home), true, "one"), 23) },
    { locationId: home, creature: body(metadata(origins(home), true, "two"), 24) },
  ] };
  const covenant = resolveLegendaryEncounter(legendary(), "covenant", null, 17);
  assert.throws(() => inspect(custody, [history(home, { legendaryEncounters: { [site]: covenant } })]), /Duplicate qualified legendary/);
});

test("dormant, active-unmaterialized and resolved histories remain ownerless without creating creatures", () => {
  for (const state of [createLegendaryEncounterState("walking-spring", site), legendary(),
    ...(["release", "defeat", "covenant"] as const).map(outcome => resolveLegendaryEncounter(legendary(), outcome, null, 17))]) {
    const result = inspect(empty(), [history(home, { legendaryEncounters: { [site]: state } })]);
    assert.equal(result.legendaryOwners[0].owner, null); assert.deepEqual(result.history[0].sources.legendaryEncounters[site], state);
  }
  const defeated = { ...prime(), status: "defeated" as const, entityId: null, custodyId: null };
  assert.equal(inspect(empty(), [history(home, { primeEncounters: { [anchor]: defeated } })]).primeOwners[0].owner, null);
});

test("strict history locations, source descriptors and family envelopes reject without invoking accessors", () => {
  const row = history(home), foreign = history(locationId(homeLocation(universeId("foreign"))));
  assert.throws(() => inspect(empty(), [row, row]), /Duplicate or foreign/);
  assert.throws(() => inspect(empty(), [foreign]), /Duplicate or foreign/);
  assert.throws(() => inspect(empty(), [{ ...row, ignored: 1 } as never]), /source fields/);
  assert.throws(() => inspect(empty(), [row], [{ path: ["extra"], family: "fieldPerches" }]), /family provenance/);
  let accessed = false;
  const sources = blankHistory();
  Object.defineProperty(sources, "primeEncounters", { enumerable: true, get() { accessed = true; return {}; } });
  assert.throws(() => inspect(empty(), [{ locationId: home, sources }]), /accessors/); assert.equal(accessed, false);
});

test("one hundred cold joins preserve raw unknown provenance and all finite history without clocks or mutation", () => {
  const custody = stored(metadata({}, true), "orb", true), histories = [history(orbit,
    { legendaryEncounters: { [site]: resolveLegendaryEncounter(legendary(), "capture", "creature:23", 17) } })];
  const before = canonicalJson({ custody, histories }), expected = canonicalJson(inspect(custody, histories)), now = Date.now;
  Date.now = () => { throw Error("scoped encounter join read clock"); };
  try { for (let count = 0; count < 100; count++) { const cold = JSON.parse(before); assert.equal(canonicalJson(inspect(cold.custody, cold.histories)), expected); } }
  finally { Date.now = now; }
  assert.equal(canonicalJson({ custody, histories }), before); assert(!Object.isFrozen(histories));
  assert(Object.isFrozen(inspect(custody, histories).legendaryOwners[0].owner));
});
