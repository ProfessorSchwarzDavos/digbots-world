import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { projectAsteroidApiaries, captureAsteroidApiaries, type AsteroidApiarySources } from "../app/game/asteroid-attachment-apiaries";
import { APIARY_FORAGING_SCAN, createApiary, createEmptyApiaryBlock, type ApiaryBee } from "../app/game/apiary";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb, encodeCaptureOrb } from "../app/game/capture-orbs";
import { asteroidEntityRelationshipPartition } from "../app/game/asteroid-attachment-relationships";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { canonicalJson } from "../app/game/universe-json";
import { Item } from "../app/game/data";
import { humanBodyBounds } from "../app/game/player-body";
import { validCustodyItem } from "../app/game/wayworks-custody";
import type { SavedCreature } from "../app/game/engine";
import type { CreatureMetadata } from "../app/game/creature-cage";

const orbit = locationAddress({ ...homeLocation(universeId("apiary-selection")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const point = { x: frame.offset.x, y: frame.offset.y + 32, z: frame.offset.z };
const key = (x = 0) => `${point.x + x},${point.y},${point.z}`;
const bee = (id: string, role: "queen" | "worker" = "queen"): ApiaryBee => role === "queen"
  ? createApiary(id, [], 42, 7).queen : createApiary("unused", [id], 42, 7).workers[0];
function body(id: number, resident: ApiaryBee, x = 0): SavedCreature {
  return { id, specimenId: `visual-or-free-${id}`, kind: resident.role === "queen" ? "hive-queen" : "honeybee",
    ...point, x: point.x + x + .1, y: point.y + .82, z: point.z - .1, yaw: .2, health: 5, age: 20,
    persistentPoiResident: true, apiaryBee: structuredClone(resident) };
}
function orb(resident: ApiaryBee, suffix = resident.id) {
  const creature: CreatureMetadata = { schema: 1, entityId: suffix, kind: resident.role === "queen" ? "hive-queen" : "honeybee",
    health: 5, maxHealth: 5, ageTicks: 20, baby: false, temperament: "Gentle", hostile: false, tamed: resident.tamed,
    ownerId: resident.ownerId, name: "Exact Bee", geneticSeed: resident.geneticSeed, command: null,
    custom: { apiaryBee: { ...resident }, exactCargo: { x: 999, y: .1, z: -888, resource: 7 } } };
  return captureIntoOrb(createEmptyCaptureOrb(`orb-${suffix}`), creature, 42)!;
}
function fixture(): AsteroidApiarySources {
  const inside = createApiary("queen-inside", ["worker-inside"], 42, 7), outside = createApiary("queen-outside", ["worker-outside"], 43, 7);
  const worker = inside.workers[0], queenOrb = captureOrbInventorySlot(orb(inside.queen, "queen-stable-specimen"));
  const storedWorker = { ...worker, storedOrb: { item: Item.CaptureOrb, count: 1 as const, captureOrb: encodeCaptureOrb(orb(worker)) } };
  const stocked = { ...inside, queenOrb, workers: [storedWorker], nectar: 17.125, honey: 3, royalJelly: 2, honeyClock: 73.25, workerGrowthClock: 13.1 };
  return { apiaries: { [key(80)]: outside, [key()]: stocked }, creatures: [body(1, { ...bee("free-queen"), home: false })],
    sleepingCreatures: [body(2, { ...bee("free-worker", "worker"), home: false }, 80)],
    visuals: [{ hiveKey: key(), creature: body(3, stocked.queen) },
      { hiveKey: key(), creature: body(4, { ...storedWorker, home: false, outbound: true, carryingNectar: 1.75 }, 4) },
      { hiveKey: key(80), creature: body(5, outside.queen, 80) }] };
}
function after(sources: AsteroidApiarySources): Omit<AsteroidApiarySources, "apiaries"> {
  return { creatures: sources.creatures, sleepingCreatures: sources.sleepingCreatures, visuals: sources.visuals };
}
function rejects(sources: AsteroidApiarySources, pattern: RegExp) {
  const before = structuredClone(sources); assert.throws(() => projectAsteroidApiaries(frame, sources), pattern); assert.deepEqual(sources, before);
}

test("new filled orb metadata is strict JSON without inventing an unattuned owner", () => {
  const filled = orb(bee("json-queen")), slot = captureOrbInventorySlot(filled);
  assert.equal(validCustodyItem(slot), true);
  assert.equal(Object.hasOwn(slot.metadata!, "attunedOwnerId"), false);
  assert.deepEqual(slot, JSON.parse(JSON.stringify(slot)));
  // Omitting the old undefined field preserves the exact persisted bytes.
  assert.equal(JSON.stringify(slot), JSON.stringify({ ...slot, metadata: { ...slot.metadata, attunedOwnerId: undefined } }));
  const attuned = captureOrbInventorySlot({ ...filled, attunement: { ownerId: "keeper", attunedAt: 3,
    activeEntityId: null, recalledAt: 0, recallCount: 0, fainted: false } });
  assert.equal(attuned.metadata!.attunedOwnerId, "keeper"); assert.equal(validCustodyItem(attuned), true);
});

test("apiary projection binds housed, free, sleeping and omitted visual bees without duplicating custody", () => {
  const source = fixture(), before = structuredClone(source), projected = projectAsteroidApiaries(frame, source);
  assert.deepEqual(Object.keys(projected.apiaries), ["0,32,0"]); assert.deepEqual(projected.visualCreatureIds, [3, 4]);
  assert.deepEqual(projected.dependencies, [{ kind: "apiary-bee", id: "free-queen", attached: true },
    { kind: "apiary-bee", id: "free-worker", attached: false }]);
  assert.deepEqual(projected.apiaries["0,32,0"], source.apiaries[key()]); assert.deepEqual(source, before);
  Object.assign(projected.apiaries["0,32,0"], { nectar: 0 }); assert.equal(source.apiaries[key()].nectar, 17.125);
});

test("free queen protection/home flags never invent a hive; actual canonical free custody closes its dependency", () => {
  const source = fixture(), selected = projectAsteroidApiaries(frame, source);
  const position = { ...point, y: point.y + .1 };
  const result = asteroidEntityRelationshipPartition(frame, { creatures: source.creatures, sleepingCreatures: source.sleepingCreatures,
    drops: [], boats: [], leads: [] }, "orbit", { localActorId: "host", dependencies: selected.dependencies,
    actors: [{ id: "host", position, bounds: humanBodyBounds(position, { variant: "male", race: "wayfarer", crouching: false }),
      mountedCreatureId: null, followingCreatureIds: [] }] });
  assert.deepEqual(result.creatureIds, [1]);
  // Orb releases can retain a historical home=true bit but no beeHiveKey.
  const historical = structuredClone(source); Object.assign(historical.creatures[0].apiaryBee!, { home: true });
  assert.deepEqual(projectAsteroidApiaries(frame, historical).dependencies, selected.dependencies);
});

test("one hundred cold captures preserve exact hive products, clocks, encoded orbs and all outside records", () => {
  let source = fixture(); const original = canonicalJson(source.apiaries);
  for (let i = 0; i < 100; i++) {
    const baseline = projectAsteroidApiaries(frame, source);
    source = { ...source, apiaries: JSON.parse(JSON.stringify(captureAsteroidApiaries(frame, source, baseline,
      JSON.parse(JSON.stringify(baseline.apiaries)), after(source)))) };
  }
  assert.equal(canonicalJson(source.apiaries), original);
});

test("overlapping flower-query envelopes from neighboring whole hives are legal", () => {
  const source = { ...fixture(), apiaries: { ...fixture().apiaries, [key(1)]: createEmptyApiaryBlock() } };
  assert.equal(Object.keys(projectAsteroidApiaries(frame, source).apiaries).length, 2);
});

test("inside and outside hive flower scans cannot silently cross any frame face", () => {
  assert.deepEqual(APIARY_FORAGING_SCAN, { radius: 5, verticalRadius: 3 });
  for (const x of [27, 32, -28, -33]) {
    const source: AsteroidApiarySources = { apiaries: { [key(x)]: createEmptyApiaryBlock() }, creatures: [], sleepingCreatures: [], visuals: [] };
    rejects(source, /boundary/);
  }
  for (const y of [frame.orbitBounds.minY, frame.orbitBounds.maxY]) {
    rejects({ apiaries: { [`${point.x},${y},${point.z}`]: createEmptyApiaryBlock() }, creatures: [], sleepingCreatures: [], visuals: [] }, /boundary/);
  }
});

test("a live visual is tested as a whole body and must stay on its actual hive side", () => {
  for (const x of [31.51, 80]) {
    const source = fixture(), visuals = [...source.visuals];
    visuals[0] = { ...visuals[0], creature: { ...visuals[0].creature, x: point.x + x } };
    rejects({ ...source, visuals }, /boundary/);
  }
  const source = fixture(), visuals = [...source.visuals];
  visuals[2] = { ...visuals[2], creature: { ...visuals[2].creature, x: point.x } };
  rejects({ ...source, visuals }, /boundary/);
});

test("duplicate hive/free-bee identities and extra visual bodies reject without mutation", () => {
  const source = fixture();
  rejects({ ...source, creatures: [...source.creatures, body(9, source.apiaries[key()].queen!)] }, /Duplicate attached bee/);
  rejects({ ...source, sleepingCreatures: [...source.sleepingCreatures, body(9, source.creatures[0].apiaryBee!, 80)] }, /Duplicate attached bee/);
  rejects({ ...source, apiaries: { ...source.apiaries, [key(2)]: source.apiaries[key()] } }, /Duplicate attached bee/);
  rejects({ ...source, visuals: [...source.visuals, { ...source.visuals[0], creature: { ...source.visuals[0].creature, id: 99, specimenId: "extra" } }] }, /duplicate apiary visual/);
  rejects({ ...source, visuals: [{ ...source.visuals[0], hiveKey: key(2) }, ...source.visuals.slice(1)] }, /Unresolved/);
  rejects({ ...source, visuals: [{ ...source.visuals[0], creature: { ...source.visuals[0].creature, id: 1 } }, ...source.visuals.slice(1)] }, /actor identity/);
});

test("changed visual ownership must reconcile with the canonical hive before unload", () => {
  for (const patch of [{ ownerId: "new-keeper" }, { tamed: true }, { angry: true }, { geneticSeed: 1 }, { alive: false }]) {
    const source = fixture(), visuals = [...source.visuals];
    visuals[0] = { ...visuals[0], creature: { ...visuals[0].creature, apiaryBee: { ...visuals[0].creature.apiaryBee!, ...patch } } };
    rejects({ ...source, visuals }, /ownership differs/);
  }
});

test("malformed and unknown hive/bee records never normalize away finite data", () => {
  const variants = Array.from({ length: 9 }, fixture);
  Object.assign(variants[0].apiaries[key()], { honey: 13 });
  Object.assign(variants[1].apiaries[key()], { nectar: -1 });
  Object.assign(variants[2].apiaries[key()], { honeyClock: NaN });
  Object.assign(variants[3].apiaries[key()], { futureInventory: [] });
  Object.assign(variants[4].apiaries[key()].queen!, { futureOwner: "missing" });
  Object.assign(variants[5].apiaries[key()].queen!, { geneticSeed: 1.5 });
  Object.assign(variants[6].apiaries[key()], { nextWorkerSerial: 1.5 });
  Object.assign(variants[7].apiaries[key()], { workers: Array.from({ length: 9 }, (_, i) => bee(`worker${i}`, "worker")) });
  Object.assign(variants[8].creatures[0].apiaryBee!, { role: "not-a-bee" });
  for (const variant of variants) rejects(variant, /Invalid|unsupported|finite/);
});

test("queen and worker orb references must resolve to the exact housed species and identity", () => {
  const wrongQueen = fixture(); Object.assign(wrongQueen.apiaries[key()], { queenOrb: captureOrbInventorySlot(orb(bee("different"))) });
  rejects(wrongQueen, /orb custody/);
  const wrongWorker = fixture(); Object.assign(wrongWorker.apiaries[key()].workers[0], { storedOrb: { item: Item.CaptureOrb, count: 1, captureOrb: "not-json" } });
  rejects(wrongWorker, /orb custody/);
  const active = fixture(), queen = active.apiaries[key()].queen!;
  Object.assign(active.apiaries[key()], { queenOrb: captureOrbInventorySlot({ ...orb(queen), attunement: {
    ownerId: "host", attunedAt: 1, activeEntityId: queen.id, recalledAt: 0, recallCount: 0, fainted: false } }) });
  rejects(active, /orb custody/);
  const dormantHive = createEmptyApiaryBlock(); Object.assign(dormantHive, { queenDisplayEnabled: true });
  const dormant = { ...fixture(), apiaries: { ...fixture().apiaries, [key(2)]: dormantHive } };
  rejects(dormant, /Dormant/);
});

test("capture merges only selected hives and requires complete before/after bee custody", () => {
  const source = fixture(), baseline = projectAsteroidApiaries(frame, source), edited = structuredClone(baseline.apiaries);
  Object.assign(edited["0,32,0"], { nectar: 16, honey: 4 });
  const result = captureAsteroidApiaries(frame, source, baseline, edited, after(source));
  assert.equal(result[key()].honey, 4); assert.deepEqual(result[key(80)], source.apiaries[key(80)]);
  const freeQueen = body(9, { ...source.apiaries[key()].queen!, home: false });
  assert.throws(() => captureAsteroidApiaries(frame, source, baseline, edited,
    { ...after(source), creatures: [...source.creatures, freeQueen] }), /Duplicate attached bee/);
  // An explicitly authorized extraction would remove both hive custody and its
  // old display representation before installing the independently owned body.
  Object.assign(edited["0,32,0"], { queen: null, queenOrb: null, queenDisplayEnabled: false });
  const extracted = captureAsteroidApiaries(frame, source, baseline, edited,
    { ...after(source), creatures: [...source.creatures, freeQueen], visuals: source.visuals.filter(value => value.creature.id !== 3) });
  assert.equal(extracted[key()].queen, null); assert.deepEqual(extracted[key(80)], source.apiaries[key(80)]);
});

test("stale snapshots, outside edits and extra after-image fields fail before any owner write", () => {
  const source = fixture(), baseline = projectAsteroidApiaries(frame, source), before = structuredClone(source);
  assert.throws(() => captureAsteroidApiaries(frame, source, { ...baseline, sourceBaseline: "stale" }, baseline.apiaries, after(source)), /Stale/);
  assert.throws(() => captureAsteroidApiaries(frame, source, baseline, { ...baseline.apiaries, "80,32,0": createEmptyApiaryBlock() }, after(source)), /outside/);
  assert.throws(() => captureAsteroidApiaries(frame, source, baseline, baseline.apiaries,
    { ...after(source), futureOwner: true } as Omit<AsteroidApiarySources, "apiaries">), /unsupported/);
  assert.deepEqual(source, before);
});
