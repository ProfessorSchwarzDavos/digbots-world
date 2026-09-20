import assert from "node:assert/strict";
import test from "node:test";
import { createAirZoneState, discoverAirZone, type AirZoneState } from "../app/game/airzone";
import { BlockId, Item } from "../app/game/data";
import { MORROW_REGIONS } from "../app/game/celestial-terrain";
import {
  MORROW_MOB_DEFS, MORROW_MOB_KINDS, MORROW_OWL_VEIL_SECONDS,
  isMorrowMobKind, isSealedMorrowNative, morrowBreathableZone,
  normalizeMorrowExposure, pickMorrowSpawn, safeLanternJar, stepMorrowExposure,
  type MorrowExposureState,
} from "../app/game/morrow-ecology";

const topology = discoverAirZone({ epochs: { locationId: "morrow-test", generation: 1, topologyRevision: 1, requestId: 1 },
  seed: { x: 0, y: 0, z: 0 }, cells: [{ x: 0, y: 0, z: 0, passable: true, sealMask: 63, controllerIds: ["life"] }] });
const safe = createAirZoneState(topology, { oxygenMilliMoles: 8700, inertMilliMoles: 32800, co2MilliMoles: 10 });
const vacuum = createAirZoneState(topology);
const step = (patch: Partial<Parameters<typeof stepMorrowExposure>[0]> = {}) => stepMorrowExposure({
  kind: "morrow-owl", state: { exposureSeconds: 0, veilSeconds: MORROW_OWL_VEIL_SECONDS },
  elapsedSeconds: 1, isHost: true, breathable: false, moving: true, ...patch,
});

test("four authored definitions have real diets, care and discovery; none is aquatic or permanently flying", () => {
  assert.deepEqual(Object.keys(MORROW_MOB_DEFS), [...MORROW_MOB_KINDS]);
  for (const kind of MORROW_MOB_KINDS) {
    const definition = MORROW_MOB_DEFS[kind];
    assert.equal(definition.kind, kind);
    assert.equal(definition.aquatic, false);
    assert.equal(definition.flying, false);
    assert.equal(definition.movement, "ground");
    assert.equal(definition.footOffset, .5, "ground cell centers require a half-block lift for feet at model y=0");
    assert.ok(definition.diet?.length);
    assert.ok(definition.discoveryHint && definition.fieldNotes?.length && definition.behavior && definition.lore);
    assert.equal(isMorrowMobKind(kind), true);
  }
  assert.equal(isMorrowMobKind("runeowl"), false);
  assert.deepEqual(MORROW_MOB_DEFS.rillehopper.diet, [BlockId.MineralFrost]);
  assert.deepEqual(MORROW_MOB_DEFS.rillehopper.tameItems, [BlockId.MineralFrost]);
  assert.equal(MORROW_MOB_DEFS["vacuum-lantern"].captureItem, Item.SpecimenJar);
});

test("every named region supports deterministic day/night ecology with the Owl rare", () => {
  for (const { id } of MORROW_REGIONS) for (const dayFraction of [.5, .9]) {
    const counts = new Map<string, number>();
    for (let i = 0; i < 10_000; i++) {
      const roll = (i + .5) / 10_000;
      const kind = pickMorrowSpawn(id, dayFraction, roll);
      assert.ok(kind);
      assert.equal(kind, pickMorrowSpawn(id, dayFraction, roll));
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    assert.equal(counts.size, 4, `${id} ${dayFraction}`);
    assert.ok((counts.get("morrow-owl") ?? Infinity) < 100, `${id}: less than 1 percent Owl encounters`);
  }
  assert.notEqual(pickMorrowSpawn("ice-lantern-rilles", .5, .5), pickMorrowSpawn("ice-lantern-rilles", .9, .5));
  assert.notEqual(pickMorrowSpawn("pale-regolith-sea", .5, .6), pickMorrowSpawn("moon-slate-highlands", .5, .6));
});

test("spawn picker rejects malformed or out-of-range inputs without consuming ambient randomness", () => {
  for (const value of [-1, 1, Infinity, NaN]) {
    assert.equal(pickMorrowSpawn("pale-regolith-sea", .5, value), null);
    assert.equal(pickMorrowSpawn("pale-regolith-sea", value, .5), null);
  }
  assert.equal(pickMorrowSpawn("not-a-region" as typeof MORROW_REGIONS[number]["id"], .5, .5), null);
  assert.equal(pickMorrowSpawn("pale-regolith-sea", 0, 0), "rillehopper");
  assert.equal(pickMorrowSpawn("pale-regolith-sea", 1 - Number.EPSILON, 1 - Number.EPSILON), "morrow-owl");
});

test("jar capture requires both occupants in the same named location and sealed breathable zone", () => {
  assert.equal(safeLanternJar(safe, { ...safe }), true);
  const bad: (AirZoneState | undefined | null)[] = [undefined, null, vacuum,
    { ...safe, zoneId: "" }, { ...safe, zoneId: " " }, { ...safe, zoneId: "another-room" },
    { ...safe, locationId: "another-location" }, { ...safe, locationId: "" },
    ...(["unknown", "checking", "leaking", "depressurized", "over-capacity"] as const).map(status => ({ ...safe, status }))];
  for (const zone of bad) {
    assert.equal(safeLanternJar(safe, zone), false);
    assert.equal(safeLanternJar(zone, safe), false);
  }
  assert.equal(safeLanternJar({ ...safe, zoneId: "" }, { ...safe, zoneId: "" }), false);
  assert.equal(safeLanternJar(undefined, undefined), false, "exterior has no room");
});

test("jar seal labels cannot hide no oxygen, unsafe pressure, CO2 or nonfinite gas readings", () => {
  for (const patch of [
    { oxygenMilliMoles: 0 }, { pressureMilliKPa: 59_999 }, { pressureMilliKPa: 120_001 },
    { oxygenMilliMoles: 50_000 }, { co2MilliMoles: 2000 }, { oxygenMilliMoles: NaN },
    { inertMilliMoles: -1 }, { co2MilliMoles: Infinity }, { pressureMilliKPa: NaN },
  ]) {
    const bad = { ...safe, ...patch };
    assert.equal(morrowBreathableZone(bad), false, JSON.stringify(patch));
    assert.equal(safeLanternJar(safe, bad), false);
    assert.equal(safeLanternJar(bad, safe), false);
  }
  assert.equal(morrowBreathableZone({ ...safe, status: "leaking" }), true, "physical breathing can be safe while jar capture is blocked");
  const before = structuredClone(safe);
  safeLanternJar(safe, safe);
  assert.deepEqual(safe, before);
});

test("only the three sealed natives have indefinite trace-atmosphere protection", () => {
  for (const kind of MORROW_MOB_KINDS.slice(0, 3)) {
    assert.equal(isSealedMorrowNative(kind), true);
    assert.deepEqual(step({ kind, elapsedSeconds: 100 }), { exposureSeconds: 0, veilSeconds: 0, damage: 0, motion: "ground", crossingSeconds: 0 });
  }
  assert.equal(isSealedMorrowNative("morrow-owl"), false);
  assert.equal(isSealedMorrowNative("runeowl"), false);
  assert.equal(step({ kind: "runeowl", elapsedSeconds: 20 }).damage, 5);
  assert.equal(step({ kind: "woolhorn", elapsedSeconds: 20 }).damage, 5);
  assert.equal(step({ kind: "rattlekin", requiresBreathing: false, elapsedSeconds: 100 }).damage, 0);
});

test("Owl crossing stops at eight seconds, then real exposure and damage accumulate", () => {
  const crossing = step({ elapsedSeconds: 3 });
  assert.equal(crossing.motion, "veil-crossing");
  assert.equal(crossing.crossingSeconds, 3);
  assert.equal(crossing.veilSeconds, 5);
  const exhausted = step({ state: crossing, elapsedSeconds: 5 });
  assert.equal(exhausted.motion, "ground");
  assert.equal(exhausted.veilSeconds, 0);
  assert.equal(exhausted.damage, 0);
  const hurt = step({ state: exhausted, elapsedSeconds: 18 });
  assert.equal(hurt.exposureSeconds, 15);
  assert.equal(hurt.damage, 3);
  assert.equal(hurt.crossingSeconds, 0);
  assert.equal(step({ elapsedSeconds: 100 }).damage, 77);
});

test("bare-ground rest cannot refresh veil; only resting at a valid refuge does", () => {
  const bareRest = step({ moving: false, elapsedSeconds: 30 });
  assert.equal(bareRest.veilSeconds, 0);
  assert.equal(bareRest.damage, 7);
  assert.equal(bareRest.motion, "ground");
  const state = { exposureSeconds: 10, veilSeconds: 0 };
  for (const refuge of [{ breathable: true }, { dreamRefuge: true }]) {
    const rest = step({ state, moving: false, elapsedSeconds: 4, ...refuge });
    assert.equal(rest.motion, "rest");
    assert.equal(rest.veilSeconds, 2);
    assert.equal(rest.exposureSeconds, 2);
    assert.equal(rest.damage, 0);
    assert.equal(step({ state: rest, moving: false, elapsedSeconds: 100, ...refuge }).veilSeconds, 8);
  }
  assert.equal(step({ state, moving: true, dreamRefuge: true, elapsedSeconds: 6 }).damage, 1);
  assert.equal(step({ state, moving: true, breathable: true, elapsedSeconds: 6 }).veilSeconds, 0);
  assert.equal(step({ kind: "woolhorn", moving: false, dreamRefuge: true, elapsedSeconds: 20 }).damage, 5);
});

test("save roundtrip and timestep partition preserve finite veil and total damage", () => {
  let state: MorrowExposureState = { exposureSeconds: 0, veilSeconds: 8 };
  let damage = 0, crossingSeconds = 0;
  for (let i = 0; i < 300; i++) {
    const result = step({ state: JSON.parse(JSON.stringify(state)), elapsedSeconds: .1 });
    damage += result.damage; crossingSeconds += result.crossingSeconds;
    state = normalizeMorrowExposure(result);
  }
  const combined = step({ elapsedSeconds: 30 });
  assert.ok(Math.abs(damage - combined.damage) < 1e-9);
  assert.ok(Math.abs(crossingSeconds - combined.crossingSeconds) < 1e-9);
  assert.deepEqual(state, { exposureSeconds: 15, veilSeconds: 0 });
});

test("legacy or malformed saves do not refill the veil, and guest/invalid time never advances state", () => {
  for (const value of [undefined, NaN, Infinity, -1])
    assert.deepEqual(normalizeMorrowExposure({ exposureSeconds: value, veilSeconds: value }), { exposureSeconds: 0, veilSeconds: 0 });
  assert.deepEqual(normalizeMorrowExposure(), { exposureSeconds: 0, veilSeconds: 0 });
  assert.deepEqual(normalizeMorrowExposure({ exposureSeconds: 100, veilSeconds: 100 }), { exposureSeconds: 15, veilSeconds: 8 });
  assert.equal(step({ state: undefined, elapsedSeconds: 20 }).damage, 5);
  const state = { exposureSeconds: 4, veilSeconds: 3 };
  for (const elapsedSeconds of [NaN, Infinity, -1, 0])
    assert.deepEqual(step({ state, elapsedSeconds }), { ...state, damage: 0, motion: "ground", crossingSeconds: 0 });
  assert.deepEqual(step({ state, isHost: false, elapsedSeconds: 100 }), { ...state, damage: 0, motion: "ground", crossingSeconds: 0 });
});
