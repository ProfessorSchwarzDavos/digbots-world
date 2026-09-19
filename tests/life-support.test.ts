import assert from "node:assert/strict";
import test from "node:test";
import { createWaystarCatalog } from "../app/game/celestial-catalog.ts";
import { bodyEnvironment, type BodyEnvironment } from "../app/game/celestial-environment.ts";
import { Item, type InventorySlot, type ItemCode } from "../app/game/data.ts";
import {
  EMPTY_LIFE_SUPPORT, constrainTether, gearCapacity, lifeSupportResourceTotals, lifeSupportStore,
  maneuverImpulse, operateLifeSupport, sourceOxygen, stepLifeSupport, validLifeSupportItem, withLifeSupport,
  type LifeSupportStore, type PersonalEquipment,
} from "../app/game/life-support.ts";

const body = createWaystarCatalog().bodies.find((entry) => entry.id === "blockwild")!;
const home = bodyEnvironment(body);
const vacuum = bodyEnvironment(body, "orbit");
const slot = (item: ItemCode, metadata?: Record<string, unknown>): InventorySlot => ({ item, count: 1, ...(metadata ? { metadata } : {}) });
const stocked = (item: ItemCode, contents: Partial<LifeSupportStore>, metadata?: Record<string, unknown>): InventorySlot => {
  const original = slot(item, metadata);
  return withLifeSupport(original, { ...lifeSupportStore(original), ...contents });
};
const almost = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("virgin wearables are empty while sealed consumables have finite factory contents", () => {
  for (const item of [Item.LightOxygenTank, Item.ExpeditionOxygenTank, Item.TwinTankHarness, Item.EvaManeuverRig, Item.AurelianSpellRig, Item.DiveHarness]) {
    const store = lifeSupportStore(slot(item));
    assert.equal(store.oxygenMl, 0);
    assert.equal(store.energyJ, 0);
    assert.equal(store.scrubberSeconds, 0);
    assert.equal(store.sockets.length, gearCapacity(item).sockets);
  }
  assert.equal(lifeSupportStore(slot(Item.FieldOxygenReserve)).oxygenMl, 1_200_000);
  assert.equal(lifeSupportStore(slot(Item.EvaPowerCell)).energyJ, 60_000);
  assert.equal(lifeSupportStore(slot(Item.ScrubberCartridge)).scrubberSeconds, 1800);
  const spent = stocked(Item.FieldOxygenReserve, { oxygenMl: 0 });
  assert.equal(lifeSupportStore(JSON.parse(JSON.stringify(spent)) as InventorySlot).oxygenMl, 0);
});

test("measured reserve refills conserve oxygen and never revive an exhausted reserve", () => {
  let back = slot(Item.LightOxygenTank);
  let reserve = slot(Item.FieldOxygenReserve);
  const initial = lifeSupportResourceTotals([back, reserve]).oxygenMl;
  const first = operateLifeSupport(back, reserve, { kind: "refill", index: -1 });
  assert.equal(first.ok, true);
  assert.equal(first.transferred, 120_000);
  back = first.back!; reserve = first.cursor!;
  assert.equal(sourceOxygen(back).amount, 120_000);
  assert.equal(lifeSupportResourceTotals([back, reserve]).oxygenMl, initial);
  const second = operateLifeSupport(back, reserve, { kind: "refill", index: -1 });
  assert.equal(second.ok, true);
  assert.equal(second.transferred, 60_000);
  back = second.back!; reserve = second.cursor!;
  assert.equal(sourceOxygen(back).amount, 180_000);
  assert.equal(lifeSupportResourceTotals([back, reserve]).oxygenMl, initial);
  const exhausted = JSON.parse(JSON.stringify(stocked(Item.FieldOxygenReserve, { oxygenMl: 0 }))) as InventorySlot;
  assert.equal(lifeSupportStore(exhausted).oxygenMl, 0);
  const failed = operateLifeSupport(slot(Item.ExpeditionOxygenTank), exhausted, { kind: "refill", index: -1 });
  assert.equal(failed.ok, false);
  assert.strictEqual(failed.cursor, exhausted);
  assert.equal(sourceOxygen(failed.back).amount, 0);
});

test("socket exchanges preserve exact tank metadata, ownership and failed-insert state", () => {
  const firstTank = stocked(Item.LightOxygenTank, { oxygenMl: 73_000 }, { serial: "tank-A", nested: { owner: "Ada" } });
  const secondTank = stocked(Item.ExpeditionOxygenTank, { oxygenMl: 321_000 }, { serial: "tank-B", nested: { owner: "Bea" } });
  const inserted = operateLifeSupport(slot(Item.TwinTankHarness), firstTank, { kind: "socket", index: 0 });
  assert.equal(inserted.ok, true);
  assert.equal(inserted.cursor, null);
  assert.deepEqual(lifeSupportStore(inserted.back!).sockets[0], firstTank);
  const exchanged = operateLifeSupport(inserted.back, secondTank, { kind: "socket", index: 0 });
  assert.equal(exchanged.ok, true);
  assert.deepEqual(exchanged.cursor, firstTank);
  assert.deepEqual(lifeSupportStore(exchanged.back!).sockets[0], secondTank);
  const moved = operateLifeSupport(exchanged.back, exchanged.cursor, { kind: "socket", index: 1 });
  assert.equal(moved.ok, true);
  assert.equal(moved.cursor, null);
  assert.deepEqual(lifeSupportStore(moved.back!).sockets, [secondTank, firstTank]);
  assert.equal(lifeSupportResourceTotals([moved.back]).oxygenMl, 394_000);
  const incompatible = slot(Item.Stick, { owner: "cursor" });
  const failed = operateLifeSupport(moved.back, incompatible, { kind: "socket", index: 0 });
  assert.equal(failed.ok, false);
  assert.strictEqual(failed.back, moved.back);
  assert.strictEqual(failed.cursor, incompatible);
  assert.deepEqual(lifeSupportStore(failed.back!).sockets, [secondTank, firstTank]);
});

test("a sealed helmet and filled compatible source breathe; missing, wrong and empty gear do not", () => {
  const helmet = slot(Item.FieldBreatherHelmet);
  const fullTank = stocked(Item.LightOxygenTank, { oxygenMl: 4_000 });
  const equipped: PersonalEquipment = { head: helmet, back: fullTank };
  const breathing = stepLifeSupport(equipped, { ...EMPTY_LIFE_SUPPORT }, vacuum, 1);
  assert.equal(breathing.hud.sealed, true);
  assert.equal(breathing.hud.breathing, true);
  assert.equal(sourceOxygen(breathing.equipment.back).amount, 3_000);
  assert.equal(breathing.state.hypoxiaSeconds, 0);
  for (const gear of [
    { back: fullTank },
    { head: slot(Item.MagneticBoots), back: fullTank },
    { head: helmet, back: slot(Item.TetherSpool) },
    { head: helmet, back: slot(Item.LightOxygenTank) },
  ] satisfies PersonalEquipment[]) {
    const result = stepLifeSupport(gear, { ...EMPTY_LIFE_SUPPORT }, vacuum, 1);
    assert.equal(result.hud.breathing, false);
    assert.equal(result.state.hypoxiaSeconds, 1);
  }
});

test("Dive Harness cannot seal in vacuum but breathes while submerged at home pressure", () => {
  const equipment: PersonalEquipment = { head: slot(Item.FieldBreatherHelmet), back: stocked(Item.DiveHarness, { oxygenMl: 4_000 }) };
  const space = stepLifeSupport(equipment, { ...EMPTY_LIFE_SUPPORT }, vacuum, 1);
  assert.equal(space.hud.sealed, false);
  assert.equal(space.hud.breathing, false);
  assert.equal(sourceOxygen(space.equipment.back).amount, 4_000);
  const underwater = stepLifeSupport(equipment, { ...EMPTY_LIFE_SUPPORT }, home, 1, { submerged: true });
  assert.equal(underwater.hud.sealed, true);
  assert.equal(underwater.hud.breathing, true);
  assert.equal(sourceOxygen(underwater.equipment.back).amount, 3_000);
});

test("pressure, temperature, corrosion and radiation are independent hazards; full weave protects", () => {
  const pressure = { ...home, requiresPressureSuit: true } satisfies BodyEnvironment;
  const thermal = { ...home, temperatureC: [-80, 100] as const } satisfies BodyEnvironment;
  const corrosive = { ...home, corrosive: true } satisfies BodyEnvironment;
  const irradiated = { ...home, radiation: 31 } satisfies BodyEnvironment;
  const bare = (environment: BodyEnvironment) => stepLifeSupport({}, { ...EMPTY_LIFE_SUPPORT }, environment, 1, { consume: false }).state;
  assert.equal(bare(pressure).pressureSeconds, 1);
  assert.equal(bare(pressure).thermalDose, 0);
  assert.equal(bare(thermal).thermalDose, 1);
  assert.equal(bare(thermal).corrosionDose, 0);
  assert.equal(bare(corrosive).corrosionDose, 1);
  assert.equal(bare(corrosive).radiationDose, 0);
  assert.equal(bare(irradiated).radiationDose, 1);
  assert.equal(bare(irradiated).pressureSeconds, 0);
  const allHazards = { ...vacuum, temperatureC: [-80, 100] as const, corrosive: true, radiation: 31 } satisfies BodyEnvironment;
  const protectedGear: PersonalEquipment = {
    head: slot(Item.FieldBreatherHelmet), back: stocked(Item.LightOxygenTank, { oxygenMl: 10_000 }),
    chest: slot(Item.PressureWeaveChest), legs: slot(Item.PressureWeaveLegs), feet: slot(Item.PressureWeaveBoots),
  };
  const protectedState = stepLifeSupport(protectedGear, { ...EMPTY_LIFE_SUPPORT }, allHazards, 1, { consume: false }).state;
  assert.equal(protectedState.pressureSeconds, 0);
  assert.equal(protectedState.thermalDose, 0);
  assert.equal(protectedState.corrosionDose, 0);
  almost(protectedState.radiationDose, 0.1);
});

test("scrubber cuts oxygen draw until its finite charge expires", () => {
  let equipment: PersonalEquipment = { head: slot(Item.FieldBreatherHelmet), back: stocked(Item.EvaManeuverRig, {
    sockets: [stocked(Item.LightOxygenTank, { oxygenMl: 10_000 }), null], scrubberSeconds: 1.5,
  }) };
  const used: number[] = [];
  for (let second = 0; second < 3; second += 1) {
    const before = sourceOxygen(equipment.back).amount;
    const result = stepLifeSupport(equipment, { ...EMPTY_LIFE_SUPPORT }, vacuum, 1);
    equipment = result.equipment;
    used.push(before - sourceOxygen(equipment.back).amount);
  }
  assert.deepEqual(used, [650, 825, 1000]);
  assert.equal(lifeSupportStore(equipment.back!).scrubberSeconds, 0);
});

test("EVA impulse depletes finite gas and energy; ordinary tanks never propel", () => {
  let rig = stocked(Item.EvaManeuverRig, { sockets: [stocked(Item.LightOxygenTank, { oxygenMl: 400 }), null], energyJ: 150 });
  const first = maneuverImpulse(rig, 1);
  assert.equal(first.acceleration, 3.8);
  rig = first.back!;
  assert.equal(sourceOxygen(rig).amount, 200);
  assert.equal(lifeSupportStore(rig).energyJ, 50);
  const second = maneuverImpulse(rig, 1);
  assert.equal(second.acceleration, 1.9);
  rig = second.back!;
  assert.equal(sourceOxygen(rig).amount, 100);
  assert.equal(lifeSupportStore(rig).energyJ, 0);
  assert.equal(maneuverImpulse(rig, 1).acceleration, 0);
  const tank = stocked(Item.LightOxygenTank, { oxygenMl: 10_000 });
  const ordinary = maneuverImpulse(tank, 1);
  assert.equal(ordinary.acceleration, 0);
  assert.strictEqual(ordinary.back, tank);
});

test("tether reeling removes outward velocity only, preserving tangential and inward motion", () => {
  const tether = { anchor: [0, 0, 0] as [number, number, number], length: 5 };
  const outward = constrainTether([4, 0, 0], [2, 3, 0], tether, 1, true);
  assert.equal(outward.taut, true);
  assert.equal(outward.tether.length, 3);
  assert.deepEqual(outward.position, [3, 0, 0]);
  assert.deepEqual(outward.velocity, [0, 3, 0]);
  const inward = constrainTether([4, 0, 0], [-2, 3, 0], tether, 1, true);
  assert.deepEqual(inward.velocity, [-2, 3, 0]);
});

test("finite item validation rejects forged capacity, malformed sockets/counts and unknown metadata", () => {
  const tank = stocked(Item.LightOxygenTank, { oxygenMl: 180_000 });
  const harness = stocked(Item.TwinTankHarness, { sockets: [tank, null] });
  assert.equal(validLifeSupportItem(harness), true);
  assert.equal(validLifeSupportItem({ ...tank, count: 2 }), false);
  assert.equal(validLifeSupportItem(stocked(Item.LightOxygenTank, { oxygenMl: 180_001 })), false);
  assert.equal(validLifeSupportItem({ ...tank, metadata: { lifeSupport: { ...lifeSupportStore(tank), oxygenMl: Infinity } } }), false);
  assert.equal(validLifeSupportItem({ ...harness, metadata: { lifeSupport: { ...lifeSupportStore(harness), sockets: [tank] } } }), false);
  assert.equal(validLifeSupportItem({ ...harness, metadata: { lifeSupport: { ...lifeSupportStore(harness), sockets: [{ ...tank, count: 2 }, null] } } }), false);
  assert.equal(validLifeSupportItem({ ...harness, metadata: { lifeSupport: { ...lifeSupportStore(harness), sockets: [stocked(Item.LightOxygenTank, { oxygenMl: 180_001 }), null] } } }), false);
  assert.equal(validLifeSupportItem({ ...tank, metadata: { lifeSupport: { ...lifeSupportStore(tank), surprise: true } } }), false);
  assert.equal(validLifeSupportItem({ ...slot(Item.Stick), metadata: { lifeSupport: lifeSupportStore(tank) } }), false);
  assert.equal(validLifeSupportItem(slot(Item.Stick)), true);
});
