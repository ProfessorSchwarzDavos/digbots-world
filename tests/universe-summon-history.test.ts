import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { selectUniverseSummonHistory } from "../app/game/universe-summon-history";
import { asteroidEntityCompoundId } from "../app/game/asteroid-attachment-relationships";
import { createSummonContractState, groundSummon, manifestSummon, observeSummonRole,
  SUMMON_CONTRACTS } from "../app/game/summon-contracts";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import type { UniverseSnapshot } from "../app/game/universe-storage";
import type { SavedCreature } from "../app/game/engine";

const universe = universeId("summon-source-history"), home = locationId(homeLocation(universe));
const orbitAddress = locationAddress({ ...homeLocation(universe), kind: "orbit", instanceId: "low" });
const orbit = locationId(orbitAddress), registry = createAsteroidRegistry(orbitAddress, 984);
const entityId = "grounded:local:asterjaw:1";
function grounded() {
  let state = manifestSummon(createSummonContractState("local"), "asterjaw", 0).state;
  for (let i = 0; i < 3; i++) state = observeSummonRole(state, "asterjaw", "destination-reached", i + 1);
  const lineageId = state.records.asterjaw!.lineageId;
  const result = groundSummon(state, "asterjaw", lineageId, entityId, 3, false);
  assert.equal(result.ok, true);
  return result.state;
}
const state = grounded(), lineageId = state.records.asterjaw!.lineageId;
const body = (id: number): SavedCreature => ({ id, specimenId: `summon-specimen-${id}`, kind: "asterjaw",
  x: 0, y: 32, z: 0, yaw: 0, health: 5, age: 20, groundedSummonLineageId: lineageId,
  groundedSummonEntityId: entityId, persistentPoiResident: true });
function snapshot(hostState: unknown, guestState: unknown = undefined): UniverseSnapshot {
  return { manifest: { id: universe, universeId: universe, deletedAt: null, currentLocationId: orbit, currentPlayerId: "host" },
    universe: { fields: { asteroidFields: { schema: 1, fields: { [orbit]: registry } } } },
    players: [{ playerId: "host", locationId: orbit, fields: { summonContracts: hostState } },
      { playerId: "guest", locationId: home, fields: guestState === undefined ? {} : { summonContracts: guestState } }],
    locations: [{ descriptor: { id: orbit, universeId: universe }, fields: {} },
      { descriptor: { id: home, universeId: universe }, fields: {} }],
  } as unknown as UniverseSnapshot;
}
const live = (summonContracts = state) => ({ locationId: orbit, playerId: "host", summonContracts });

test("grounded body resolves one player contract without assigning the contract a physical side", () => {
  const source = snapshot(createSummonContractState("local")), before = structuredClone(source);
  const result = selectUniverseSummonHistory(source, live(), [body(1)]);
  assert.deepEqual(result.dependencies, [{ kind: "summon", id: asteroidEntityCompoundId(lineageId, entityId), attached: null }]);
  assert.deepEqual(result.origins, [{ lineageId, playerId: "host" }]);
  assert.deepEqual(source, before);
});

test("every authored summon kind binds its own deterministic player lineage", () => {
  for (const definition of Object.values(SUMMON_CONTRACTS)) {
    let contract = manifestSummon(createSummonContractState("local"), definition.kind, 0).state;
    for (let i = 0; i < definition.concordanceRequired; i++)
      contract = observeSummonRole(contract, definition.kind, definition.anchorEvent, i + 1);
    const lineage = contract.records[definition.kind]!.lineageId, entity = `grounded:local:${definition.kind}:1`;
    const result = groundSummon(contract, definition.kind, lineage, entity, definition.concordanceRequired, false);
    assert.equal(result.ok, true);
    const source = snapshot(result.state);
    const physical = { ...body(1), kind: definition.kind, groundedSummonLineageId: lineage, groundedSummonEntityId: entity };
    assert.deepEqual(selectUniverseSummonHistory(source, live(result.state), [physical]).dependencies,
      [{ kind: "summon", id: asteroidEntityCompoundId(lineage, entity), attached: null }]);
  }
});

test("duplicate player contracts and remote lineage copies fail closed", () => {
  assert.throws(() => selectUniverseSummonHistory(snapshot(state, state), live(), [body(1)]), /Ambiguous summon history/);
  const source = snapshot(state);
  (source.locations[1].fields as Record<string, unknown>).creatures = [body(2)];
  assert.throws(() => selectUniverseSummonHistory(source, live(), [body(1)]), /Duplicate grounded summon lineage/);
  (source.locations[1].fields as Record<string, unknown>).creatures = [{ ...body(2), groundedSummonLineageId: "foreign-lineage" }];
  assert.throws(() => selectUniverseSummonHistory(source, live(), [body(1)]),
    /Conflicting grounded summon entity lineage/);
});

test("saved grounding cannot disappear, and body kind/entity must match the record", () => {
  assert.throws(() => selectUniverseSummonHistory(snapshot(state), live(createSummonContractState("local")), [body(1)]),
    /Saved summon grounding provenance/);
  assert.throws(() => selectUniverseSummonHistory(snapshot(state), live(), [{ ...body(1), kind: "peelop" }]),
    /Unresolved grounded summon/);
  assert.throws(() => selectUniverseSummonHistory(snapshot(state), live(), [{ ...body(1), groundedSummonEntityId: "impostor" }]),
    /Unresolved grounded summon/);
});

test("lossy or unknown player contract fields are not normalized into authority", () => {
  assert.throws(() => selectUniverseSummonHistory(snapshot({ ...state, revision: -1 }), live(), [body(1)]),
    /Invalid|normalization/);
  assert.throws(() => selectUniverseSummonHistory(snapshot({ ...state, futureOwner: true }), live(), [body(1)]),
    /Invalid|normalization|unsupported/);
});
