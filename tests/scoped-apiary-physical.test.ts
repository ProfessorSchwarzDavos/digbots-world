import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { captureAsteroidApiaries, projectAsteroidApiaries, type AsteroidApiarySources } from "../app/game/asteroid-attachment-apiaries";
import { rebaseAsteroidEntities } from "../app/game/asteroid-attachment-entities";
import { asteroidEntityRelationshipPartition, type AsteroidEntityDependency } from "../app/game/asteroid-attachment-relationships";
import { createApiary, type ApiaryBee } from "../app/game/apiary";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb } from "../app/game/capture-orbs";
import { homeLocation, locationAddress, locationId, universeId, type LocationId } from "../app/game/location-address";
import type { SavedCreature } from "../app/game/engine";

const orbit = locationAddress({ ...homeLocation(universeId("scoped-apiary")), kind: "orbit", instanceId: "low" });
const originA = locationId(homeLocation(orbit.universeId)), originB = locationId(orbit);
const originC = locationId(locationAddress({ ...orbit, instanceId: "other" }));
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const point = { x: frame.offset.x, y: frame.offset.y + 32, z: frame.offset.z };
const key = (x = 0) => `${point.x + x},${point.y},${point.z}`;
function bee(origin?: LocationId): ApiaryBee {
  return { ...createApiary("shared-bee", [], 42, 7).queen, ...(origin ? { specimenOriginLocationId: origin } : {}) };
}
function body(id: number, origin?: LocationId, x = 0, resident?: ApiaryBee): SavedCreature {
  return { id, specimenId: "shared-specimen", kind: resident ? "hive-queen" : "peelop", ...point,
    x: point.x + x, yaw: 0, health: 5, age: 20, ...(origin ? { specimenOriginLocationId: origin } : {}),
    ...(resident ? { apiaryBee: resident } : {}) };
}
function empty(): AsteroidApiarySources { return { apiaries: {}, creatures: [], sleepingCreatures: [], visuals: [] }; }
function entities(source: AsteroidApiarySources) {
  return { creatures: source.creatures, sleepingCreatures: source.sleepingCreatures, boats: [], drops: [], leads: [] };
}
function partition(source: AsteroidApiarySources, dependencies: readonly AsteroidEntityDependency[] = []) {
  return asteroidEntityRelationshipPartition(frame, entities(source), "orbit", { localActorId: "host", dependencies,
    actors: [{ id: "host", position: point, bounds: { minX: point.x - .3, maxX: point.x + .3,
      minY: point.y - .5, maxY: point.y + 1.4, minZ: point.z - .3, maxZ: point.z + .3 },
      mountedCreatureId: null, followingCreatureIds: [] }] });
}
function after(source: AsteroidApiarySources) {
  return { creatures: source.creatures, sleepingCreatures: source.sleepingCreatures, visuals: source.visuals };
}
function pair(freeBees = false): AsteroidApiarySources {
  return { ...empty(), creatures: [body(1, originA, 0, freeBees ? bee(originA) : undefined)],
    sleepingCreatures: [body(2, originB, 80, freeBees ? bee(originB) : undefined)] };
}
function hivePair(): AsteroidApiarySources {
  const first = { ...createApiary("shared-bee", [], 42, 7), queen: bee(originA) };
  const second = { ...first, queen: bee(originB) };
  return { ...empty(), apiaries: { [key()]: first, [key(80)]: second }, visuals: [
    { hiveKey: key(), creature: body(1, originA, 0, first.queen) },
    { hiveKey: key(80), creature: body(2, originB, 80, second.queen) }] };
}
function queenOrb(resident: ApiaryBee, vesselId: string) {
  return captureOrbInventorySlot(captureIntoOrb(createEmptyCaptureOrb(vesselId), { schema: 1, entityId: "stored-shared",
    kind: "hive-queen", health: 5, maxHealth: 5, ageTicks: 20, baby: false, temperament: "Gentle", hostile: false,
    tamed: false, ownerId: null, name: "Queen", geneticSeed: resident.geneticSeed, command: null,
    custom: { ...(resident.specimenOriginLocationId ? { specimenOriginLocationId: resident.specimenOriginLocationId } : {}),
      apiaryBee: { ...resident } } }, 42)!);
}

test("ordinary same-ID known-distinct bodies survive apiary and relationship selection without mutation", () => {
  const source = pair(), before = structuredClone(source);
  assert.deepEqual(projectAsteroidApiaries(frame, source).dependencies, []);
  assert.deepEqual(partition(source).creatureIds, [1]);
  assert.deepEqual(source, before);
  const together = { ...source, sleepingCreatures: [{ ...source.sleepingCreatures[0], x: point.x + 2 }] };
  const moved = rebaseAsteroidEntities(frame, entities(together), "orbit", []);
  assert.deepEqual(rebaseAsteroidEntities(frame, moved, "local", []), entities(together));
});

test("all three body consumers reject same-origin, unknown-origin and duplicate numeric identities", () => {
  for (const origins of [[originA, originA], [undefined, originA], [originA, undefined], [undefined, undefined]] as const) {
    const source = { ...empty(), creatures: [body(1, origins[0])], sleepingCreatures: [body(2, origins[1], 2)] };
    const before = structuredClone(source);
    assert.throws(() => projectAsteroidApiaries(frame, source), /actor identity/);
    assert.throws(() => partition(source), /specimen identity/);
    assert.throws(() => rebaseAsteroidEntities(frame, entities(source), "orbit", []), /creature identity/);
    assert.deepEqual(source, before);
  }
  const source = pair(); source.sleepingCreatures[0].id = 1;
  assert.throws(() => projectAsteroidApiaries(frame, source), /actor identity/);
  assert.throws(() => partition(source), /creature identity/);
  assert.throws(() => rebaseAsteroidEntities(frame, entities(source), "orbit", []), /creature identity/);
});

test("known-distinct free bees produce independently scoped dependencies consumed on opposite sides", () => {
  const source = pair(true), before = structuredClone(source), selected = projectAsteroidApiaries(frame, source);
  assert.deepEqual(selected.dependencies, [
    { kind: "apiary-bee", id: "shared-bee", specimenOriginLocationId: originA, attached: true },
    { kind: "apiary-bee", id: "shared-bee", specimenOriginLocationId: originB, attached: false }]);
  assert.deepEqual(partition(source, selected.dependencies).creatureIds, [1]);
  const swapped = selected.dependencies.map(value => {
    assert.equal(value.kind, "apiary-bee");
    if (value.kind !== "apiary-bee") throw Error("Expected apiary dependency fixture.");
    return { ...value, attached: !value.attached };
  });
  assert.throws(() => partition(source, swapped), /boundary/);
  const bare: AsteroidEntityDependency[] = [{ kind: "apiary-bee", id: "shared-bee", attached: true }];
  assert.throws(() => partition(source, bare), /Unresolved/);
  assert.throws(() => partition(source, [...selected.dependencies, ...bare]), /duplicate attachment dependency/);
  assert.deepEqual(source, before);
});

test("free canonical bee identities cannot repeat with same or unknown origin even with different body specimen IDs", () => {
  for (const origins of [[originA, originA], [undefined, originA], [originA, undefined], [undefined, undefined]] as const) {
    const source = { ...empty(), creatures: [body(1, origins[0], 0, bee(origins[0]))],
      sleepingCreatures: [{ ...body(2, origins[1], 80, bee(origins[1])), specimenId: "other-body" }] };
    assert.throws(() => projectAsteroidApiaries(frame, source), /Duplicate attached bee/);
    const dependencies: AsteroidEntityDependency[] = [{ kind: "apiary-bee", id: "shared-bee", attached: true,
      ...(origins[0] ? { specimenOriginLocationId: origins[0] } : {}) }];
    assert.throws(() => partition(source, dependencies), /Duplicate attachment bee/);
  }
});

test("known-distinct hive queens and visuals preserve exact owner, body and boundary matching", () => {
  const source = hivePair(), before = structuredClone(source), selected = projectAsteroidApiaries(frame, source);
  assert.deepEqual(selected.visualCreatureIds, [1]);
  assert.deepEqual(captureAsteroidApiaries(frame, source, selected, selected.apiaries, after(source)), source.apiaries);
  for (const mutation of ["swap", "body", "duplicate", "boundary"] as const) {
    const changed = structuredClone(source);
    if (mutation === "swap") {
      changed.visuals[0].creature.apiaryBee = bee(originB);
      Object.assign(changed.visuals[0].creature, { specimenOriginLocationId: originB });
      changed.visuals[0].creature.specimenId = "different-body";
    }
    if (mutation === "body") Object.assign(changed.visuals[0].creature, { specimenOriginLocationId: originC });
    if (mutation === "duplicate") Object.assign(changed, { visuals: [...changed.visuals,
      { hiveKey: key(), creature: { ...changed.visuals[0].creature, id: 9, specimenId: "extra" } }] });
    if (mutation === "boundary") changed.visuals[0].creature.x = point.x + 80;
    assert.throws(() => projectAsteroidApiaries(frame, changed), /visual owner|provenance disagree|boundary/);
  }
  assert.deepEqual(source, before);
});

test("stored specimen scope distinguishes exact hive orbs but never duplicate vessels or origin mismatch", () => {
  const source = hivePair();
  for (const [index, hive] of Object.values(source.apiaries).entries()) {
    Object.assign(hive, { queenOrb: queenOrb(hive.queen!, `vessel-${index}`) });
  }
  assert.doesNotThrow(() => projectAsteroidApiaries(frame, source));
  const swapped = structuredClone(source);
  Object.assign(swapped.apiaries[key()], { queenOrb: source.apiaries[key(80)].queenOrb });
  assert.throws(() => projectAsteroidApiaries(frame, swapped), /provenance disagree|orb custody/);
  const duplicateVessel = structuredClone(source);
  Object.assign(duplicateVessel.apiaries[key(80)], { queenOrb: queenOrb(duplicateVessel.apiaries[key(80)].queen!, "vessel-0") });
  assert.throws(() => projectAsteroidApiaries(frame, duplicateVessel), /orb custody/);
});

test("stored bare specimen repeats reject independently of canonical bee identity when origin is same or unknown", () => {
  for (const origins of [[originA, originA], [undefined, originA], [originA, undefined], [undefined, undefined]] as const) {
    const first = { ...createApiary("queen-a", [], 42), queen: { ...bee(origins[0]), id: "queen-a" } };
    const second = { ...createApiary("queen-b", [], 42), queen: { ...bee(origins[1]), id: "queen-b" } };
    const source = { ...empty(), apiaries: { [key()]: { ...first, queenOrb: queenOrb(first.queen, "vessel-a") },
      [key(80)]: { ...second, queenOrb: queenOrb(second.queen, "vessel-b") } } };
    const before = structuredClone(source);
    assert.throws(() => projectAsteroidApiaries(frame, source), /orb custody/);
    assert.deepEqual(source, before);
  }
});

test("hive canonical duplicates reject same or unknown provenance even without visuals or stored orbs", () => {
  for (const origins of [[originA, originA], [undefined, originA], [originA, undefined], [undefined, undefined]] as const) {
    const source = { ...empty(), apiaries: {
      [key()]: { ...createApiary("shared-bee", [], 42), queen: bee(origins[0]) },
      [key(80)]: { ...createApiary("shared-bee", [], 42), queen: bee(origins[1]) } } };
    assert.throws(() => projectAsteroidApiaries(frame, source), /Duplicate attached bee/);
  }
});

test("capture fails closed for repeated-ID workers without unique durable holder slots", () => {
  const worker = createApiary("queen", ["shared-worker"], 42).workers[0];
  const source = { ...empty(), apiaries: { [key()]: { ...createApiary("queen", [], 42), workers: [
    { ...worker, specimenOriginLocationId: originA }, { ...worker, specimenOriginLocationId: originB }] } } };
  const baseline = projectAsteroidApiaries(frame, source);
  assert.throws(() => captureAsteroidApiaries(frame, source, baseline, baseline.apiaries, after(source)), /ambiguous apiary provenance/);
});

test("capture cannot hide provenance edits behind qualified keys, including origin swaps and holder changes", () => {
  const source = pair(true), baseline = projectAsteroidApiaries(frame, source);
  for (const mutation of ["change", "swap", "remove", "body", "delete"] as const) {
    const changed = structuredClone(source);
    if (mutation === "change") {
      Object.assign(changed.creatures[0], { specimenOriginLocationId: originC });
      Object.assign(changed.creatures[0].apiaryBee!, { specimenOriginLocationId: originC });
    }
    if (mutation === "swap") {
      Object.assign(changed.creatures[0], { specimenOriginLocationId: originB });
      Object.assign(changed.creatures[0].apiaryBee!, { specimenOriginLocationId: originB });
      Object.assign(changed.sleepingCreatures[0], { specimenOriginLocationId: originA });
      Object.assign(changed.sleepingCreatures[0].apiaryBee!, { specimenOriginLocationId: originA });
    }
    if (mutation === "remove") {
      Reflect.deleteProperty(changed.creatures[0], "specimenOriginLocationId");
      Reflect.deleteProperty(changed.creatures[0].apiaryBee!, "specimenOriginLocationId");
    }
    if (mutation === "body") changed.creatures[0].id = 9;
    if (mutation === "delete") Object.assign(changed, { creatures: [] });
    assert.throws(() => captureAsteroidApiaries(frame, source, baseline, baseline.apiaries, after(changed)),
      /provenance disagree|ambiguous apiary provenance|actor identity/);
  }
  assert.deepEqual(captureAsteroidApiaries(frame, source, baseline, baseline.apiaries, after(source)), source.apiaries);
});
