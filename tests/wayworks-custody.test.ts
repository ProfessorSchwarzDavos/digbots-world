import assert from "node:assert/strict";
import test from "node:test";
import { BlockId, Item, type InventorySlot } from "../app/game/data.ts";
import { lifeSupportStore, withLifeSupport } from "../app/game/life-support.ts";
import { compareProtectedCustody, MAX_CUSTODY_SLOTS, validCustodyItem } from "../app/game/wayworks-custody.ts";
import { WAYWORKS_BLOCKS, placedWorkshopMachine } from "../app/game/wayworks-integration.ts";
import { advanceMachine } from "../app/game/wayworks-machines.ts";
import { createMachine, type MachineKind, type MachineState } from "../app/game/wayworks.ts";

function machine(kind: MachineKind = "powered-crusher"): InventorySlot {
  const item = Number(Object.entries(WAYWORKS_BLOCKS).find(([, value]) => value === kind)![0]);
  return { item, count: 1, metadata: { wayworks: createMachine(kind, "home", "local") } };
}
const state = (slot: InventorySlot) => slot.metadata!.wayworks as MachineState;
function gear(item: number, oxygenMl = 0, energyJ = 0, scrubberSeconds = 0): InventorySlot {
  const slot = { item, count: 1 };
  return withLifeSupport(slot, { ...lifeSupportStore(slot), oxygenMl, energyJ, scrubberSeconds });
}
const clone = <T>(value: T): T => structuredClone(value);

test("every machine kind and virgin CF3 supply validates without normalizing the caller", () => {
  for (const kind of Object.values(WAYWORKS_BLOCKS)) {
    const item = machine(kind), original = clone(item);
    assert.equal(validCustodyItem(item), true, kind);
    assert.deepEqual(item, original);
  }
  for (const item of [Item.FieldOxygenReserve, Item.EvaPowerCell, Item.ScrubberCartridge, Item.FluidCanister, Item.GasCylinder]) {
    assert.equal(validCustodyItem({ item, count: 1 }), true);
  }
});

test("raw machine payload cannot pass by losing malformed fields during normalization", () => {
  const mutations: Array<(value: MachineState) => void> = [
    value => { value.energyJ = -1; }, value => { value.energyJ = Infinity; },
    value => { value.energyJ = 1.5; }, value => { value.energyJ = 1_000_000_000; },
    value => { value.revision = Number.MAX_SAFE_INTEGER + 1; }, value => { value.facing = 4; },
    value => { value.generationRemainder = 5; }, value => { value.transferRemainder = 1000; },
    value => { value.workshop.upgrades.capacity = 5; }, value => { value.workshop.heatJ = 500_001; },
    value => { value.workshop.burnJ = 1; }, value => { value.workshop = null as never; },
    value => { value.ports.front = "made-up" as never; }, value => { value.ownerId = ""; },
    value => { (value as unknown as Record<string, unknown>).extra = 1; },
  ];
  for (const mutate of mutations) {
    const item = machine(); mutate(state(item));
    assert.equal(validCustodyItem(item), false, String(mutate));
  }
  const wrong = machine(); wrong.item = BlockId.Stone;
  assert.equal(validCustodyItem(wrong), false);
});

test("JSON metadata and nested storage are bounded, finite and acyclic", () => {
  const valid = machine();
  state(valid).workshop.slots.input = machine("field-battery");
  state(state(valid).workshop.slots.input!).energyJ = 5000;
  assert.equal(validCustodyItem(valid), true, "one machine may retain another machine in its input slot");
  const oversized = clone(valid); state(oversized).workshop.slots.input!.count = 2;
  assert.equal(validCustodyItem(oversized), false);
  const malformed = clone(valid); state(state(malformed).workshop.slots.input!).energyJ = -1;
  assert.equal(validCustodyItem(malformed), false);
  const cyclic = machine(); state(cyclic).workshop.slots.input = cyclic;
  assert.equal(validCustodyItem(cyclic), false);
  let deep = machine();
  for (let i = 0; i < 10; i++) { const outer = machine(); state(outer).workshop.slots.input = deep; deep = outer; }
  assert.equal(validCustodyItem(deep), false);
  for (const metadata of [{ bad: Infinity }, { bad: new Date() }, { bad: "a".repeat(70_000) }, { bad: undefined }]) {
    assert.equal(validCustodyItem({ item: Item.RawIron, count: 1, metadata }), false);
  }
  const getter = { get resource() { throw new Error("must not run"); } };
  assert.equal(validCustodyItem({ item: Item.RawIron, count: 1, metadata: getter }), false);
  for (const count of [0, -1, 1.5, 65, Number.MAX_SAFE_INTEGER]) assert.equal(validCustodyItem({ item: Item.RawIron, count }), false);
});

test("portable stores require their matching container and exact bounded packet", () => {
  const fluid = { item: Item.FluidCanister, count: 1, metadata: { wayworksResource: { kind: "fluid", resource: "water", quantity: 8000 } } };
  assert.equal(validCustodyItem(fluid), true);
  for (const packet of [
    { kind: "chemical", resource: "water", quantity: 1 }, { kind: "fluid", resource: "water", quantity: 8001 },
    { kind: "fluid", resource: "water", quantity: 0 }, { kind: "fluid", resource: "water", quantity: 1.1 },
    { kind: "fluid", resource: "water", quantity: 1, extra: true },
  ]) assert.equal(validCustodyItem({ ...fluid, metadata: { wayworksResource: packet } }), false);
  assert.equal(validCustodyItem({ ...fluid, item: Item.RawIron }), false);
  assert.equal(validCustodyItem({ ...fluid, count: 2 }), false);
});

test("machine moves and metadata-preserving stack splits are legal; duplicated custody is not", () => {
  const battery = machine("field-battery"); state(battery).energyJ = 1000;
  const cable = machine("grid-cable"); cable.count = 12;
  assert.equal(compareProtectedCustody([battery, cable, null], [{ ...cable, count: 5 }, null, battery, { ...cable, count: 7 }]).ok, true);
  assert.equal(compareProtectedCustody([battery], [battery, clone(battery)]).ok, false);
  assert.equal(compareProtectedCustody([cable], [{ ...cable, count: 13 }]).ok, false);
  assert.equal(compareProtectedCustody([battery], []).ok, true, "opaque loss grants no resource increase");
  assert.equal(compareProtectedCustody([], [{ item: BlockId.PoweredCrusher, count: 1 }]).ok, true, "ordinary craft authority is unchanged");
});

test("contained items, upgrades, fuel, heat and paid progress cannot be minted", () => {
  const before = machine();
  state(before).workshop.slots.input = { item: Item.RawIron, count: 1 };
  for (const mutate of [
    (value: MachineState) => { value.workshop.slots.input!.count++; },
    (value: MachineState) => { value.workshop.slots.input!.item = Item.RawGold; },
    (value: MachineState) => { value.workshop.upgrades.speed = 1; },
    (value: MachineState) => { value.workshop.heatJ = 1; },
    (value: MachineState) => { value.workshop.cycle = { recipeId: "crush-iron", progressMs: 1000, paidJ: 1200, durationMs: 5000, costJ: 6000 }; },
  ]) {
    const after = clone(before); mutate(state(after));
    assert.equal(validCustodyItem(after), true);
    assert.equal(compareProtectedCustody([before], [after]).ok, false);
  }
  const fuel = machine("heat-engine"), after = clone(fuel);
  state(after).workshop.burnJ = 80_000;
  assert.equal(validCustodyItem(after), true);
  assert.equal(compareProtectedCustody([fuel], [after]).ok, false);
  state(after).workshop.burnJ++;
  assert.equal(validCustodyItem(after), false);
  const nested = machine(); state(nested).workshop.slots.input = machine("field-battery");
  const minted = clone(nested); state(state(minted).workshop.slots.input!).energyJ = 1000;
  assert.equal(compareProtectedCustody([nested], [minted]).ok, false);
});

test("equal-total transfers cannot transmute gas, fluid, fuel or machine identities", () => {
  const tank = machine("gas-tank"); state(tank).workshop.chemical = { resource: "oxygen", amount: 500 };
  const changed = clone(tank); state(changed).workshop.chemical!.resource = "hydrogen";
  assert.equal(compareProtectedCustody([tank], [changed]).ok, false);
  const otherOwner = clone(tank); state(otherOwner).ownerId = "other";
  assert.equal(compareProtectedCustody([tank], [otherOwner]).ok, false);
  const water = { item: Item.FluidCanister, count: 1, metadata: { wayworksResource: { kind: "fluid", resource: "water", quantity: 500 } } };
  const oil = clone(water); oil.metadata.wayworksResource.resource = "oil";
  assert.equal(compareProtectedCustody([water], [oil]).ok, false);
  const partial = clone(water); partial.metadata.wayworksResource.quantity = 250;
  assert.equal(compareProtectedCustody([water], [partial, clone(partial)]).ok, false, "typed transfer required, even with same total");
});

test("paid recipe identity and upgrade-adjusted cost must match a real recipe", () => {
  const item = machine(); state(item).workshop.slots.input = { item: Item.RawIron, count: 1 }; state(item).energyJ = 6000;
  item.metadata!.wayworks = advanceMachine(state(item), 1000).state;
  assert.equal(validCustodyItem(item), true);
  for (const mutate of [
    (value: MachineState) => { value.workshop.cycle!.recipeId = "smelt-raw-iron"; },
    (value: MachineState) => { value.workshop.cycle!.recipeId = "invented-recipe"; },
    (value: MachineState) => { value.workshop.cycle!.durationMs *= 2; value.workshop.cycle!.progressMs *= 2; },
    (value: MachineState) => { value.workshop.cycle!.paidJ++; },
  ]) { const invalid = clone(item); mutate(state(invalid)); assert.equal(validCustodyItem(invalid), false); }
});

test("historical missing workshop migration and pickup/place provenance remain valid", () => {
  const legacy = machine("field-battery"); state(legacy).energyJ = 8000;
  delete (state(legacy) as Partial<MachineState>).workshop;
  assert.equal(validCustodyItem(legacy), true);
  const current = machine("field-battery"); state(current).energyJ = 8000;
  assert.equal(compareProtectedCustody([legacy], [current]).ok, true);
  assert.equal(compareProtectedCustody([current], [legacy]).ok, true);
  const placed = placedWorkshopMachine("field-battery", legacy, "moon", "host", 2);
  const pickedUp = { item: BlockId.FieldBattery, count: 1, metadata: { wayworks: placed } };
  assert.equal(validCustodyItem(pickedUp), true);
  assert.equal(state(pickedUp).energyJ, 8000);
  assert.equal(state(pickedUp).ownerId, "host");
  assert.equal(compareProtectedCustody([pickedUp], [null, pickedUp]).ok, true);
  assert.equal(compareProtectedCustody([legacy], [pickedUp]).ok, false, "only authoritative lifecycle action may rebind provenance");
});

test("CF3 passive depletion is legal; resource pooling, transmutation and factory refill are not", () => {
  const before = gear(Item.EvaManeuverRig, 0, 5000, 100);
  const depleted = gear(Item.EvaManeuverRig, 0, 4000.5, 99.99);
  assert.equal(compareProtectedCustody([before], [null, depleted]).ok, true);
  assert.equal(compareProtectedCustody([before], [gear(Item.EvaManeuverRig, 0, 5001, 99)]).ok, false);
  assert.equal(compareProtectedCustody([before], [gear(Item.AurelianSpellRig, 0, 5000, 100)]).ok, false);
  const electric = gear(Item.EvaManeuverRig, 0, 5000, 0), scrubber = gear(Item.EvaManeuverRig, 0, 0, 100);
  assert.equal(compareProtectedCustody([electric, scrubber], [before]).ok, false);
  assert.equal(compareProtectedCustody([gear(Item.FieldOxygenReserve, 100)], [{ item: Item.FieldOxygenReserve, count: 1 }]).ok, false);
  assert.equal(compareProtectedCustody([], [gear(Item.LightOxygenTank)]).ok, true);
});

test("CF3 matching preserves socket custody and handles non-greedy reserve assignments", () => {
  const rig = gear(Item.EvaManeuverRig, 0, 5000, 100);
  const store = lifeSupportStore(rig); store.sockets[0] = gear(Item.LightOxygenTank, 50_000);
  const withTank = withLifeSupport(rig, store), after = clone(withTank);
  const consumed = lifeSupportStore(after); consumed.sockets[0] = gear(Item.LightOxygenTank, 40_000.25);
  assert.equal(compareProtectedCustody([withTank], [withLifeSupport(after, consumed)]).ok, true);
  assert.equal(compareProtectedCustody([rig], [withTank]).ok, false);
  assert.equal(compareProtectedCustody([withTank], [rig, store.sockets[0]]).ok, false, "socket transfer is an authoritative operation");
  assert.equal(compareProtectedCustody([gear(Item.EvaManeuverRig, 0, 100, 100), gear(Item.EvaManeuverRig, 0, 100, 0)],
    [gear(Item.EvaManeuverRig, 0, 50, 0), gear(Item.EvaManeuverRig, 0, 50, 50)]).ok, true);
});

test("invalid before/after images fail closed with bounded root arrays", () => {
  assert.deepEqual(compareProtectedCustody([{ item: Item.RawIron, count: 65 }], []), { ok: false, reason: "invalid-before" });
  assert.deepEqual(compareProtectedCustody([], [{ item: Item.RawIron, count: NaN }]), { ok: false, reason: "invalid-after" });
  assert.equal(compareProtectedCustody([], Array(MAX_CUSTODY_SLOTS + 1).fill(null)).ok, false);
});
