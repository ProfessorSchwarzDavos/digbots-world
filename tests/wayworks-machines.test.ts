import assert from "node:assert/strict";
import test from "node:test";
import { BlockId, Item, RECIPES, type InventorySlot } from "../app/game/data.ts";
import { advanceMachine, transferMachineItem, transferPortableResource, portableResource } from "../app/game/wayworks-machines.ts";
import { applyWorkshopAction, machineKindForBlock, parseWorkshopAction, placedWorkshopMachine } from "../app/game/wayworks-integration.ts";
import { MACHINE_RECIPES, recipeCost } from "../app/game/wayworks-recipes.ts";
import { createMachine, machineCapacity, normalizeMachine, type MachineState } from "../app/game/wayworks.ts";
import { supportedWorkshopUpgrades, UPGRADE_ITEMS, UPGRADE_KINDS } from "../app/game/wayworks-stores.ts";

test("all processor recipes debit exactly the declared power and ingredients", () => {
  for (const recipe of MACHINE_RECIPES) {
    let state = createMachine(recipe.machine, "home", "local");
    state.energyJ = machineCapacity(state.kind);
    state.workshop.slots.input = { item: recipe.input.items[0], count: recipe.input.count };
    if (recipe.reagent) state.workshop.slots.reagent = { item: recipe.reagent.items[0], count: recipe.reagent.count };
    if (recipe.fluid) state.workshop.fluid = { ...recipe.fluid };
    let consumed = 0; let completed = false;
    for (let i = 0; i < 50; i++) {
      const result = advanceMachine(state, 250); consumed += result.consumedJ; state = result.state;
      state = normalizeMachine(JSON.parse(JSON.stringify(state)), state.kind, "home", "local");
      if (result.completed) { completed = true; break; }
    }
    assert.equal(completed, true, recipe.id);
    assert.equal(consumed, recipe.energyJ, recipe.id);
    assert.equal(state.workshop.slots.input, null);
    assert.equal(state.workshop.slots.reagent, null);
    assert.deepEqual(state.workshop.slots.output, recipe.output);
    assert.deepEqual(state.workshop.slots.byproduct, recipe.byproduct ?? null);
    assert.equal(state.workshop.fluid, null);
  }
});

test("power loss, output backpressure and cancelled cycles cannot mint or erase ingredients", () => {
  const input = createMachine("powered-crusher", "home", "local");
  input.workshop.slots.input = { item: Item.RawIron, count: 2 };
  input.energyJ = 1200;
  const first = advanceMachine(input, 1000).state;
  assert.equal(first.energyJ, 0);
  assert.equal(first.workshop.cycle?.progressMs, 1000);
  assert.equal(first.workshop.slots.input?.count, 2);
  assert.equal(transferMachineItem(first, "0,1,0", "input", null, "extract", first.revision).reason, "cycle-reserved");
  const stopped = advanceMachine(first, 1000).state;
  assert.equal(stopped.workshop.cycle?.progressMs, 1000);
  assert.equal(stopped.status, "no-power");
  const blocked = { ...first, energyJ: 6000, workshop: { ...first.workshop, slots: { ...first.workshop.slots, output: { item: Item.CrushedIron, count: 64 } } } };
  const result = advanceMachine(blocked, 1000);
  assert.equal(result.consumedJ, 0);
  assert.equal(result.state.status, "output-blocked");
  const cancelled = applyWorkshopAction(first, "a", null, first.revision, { kind: "cancel-cycle" });
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.machine.energyJ, 0);
  assert.equal(cancelled.machine.workshop.cycle, null);
  assert.equal(cancelled.machine.workshop.slots.input?.count, 2);
  const named = { ...input, workshop: { ...input.workshop, slots: { ...input.workshop.slots, input: { item: Item.RawIron, count: 2, metadata: { serial: "keep" } } } } };
  assert.equal(advanceMachine(named, 1000).state.status, "no-input", "never erase named/stateful ingredient identity");
});

test("heat and biofuel generators convert finite consumed fuel, preserve residue and stop when full", () => {
  for (const [kind, fuel, joules] of [["heat-engine", Item.Coal, 80000], ["biofuel-engine", Item.BiofuelPellet, 24000]] as const) {
    let state = createMachine(kind, "home", "local"); state.workshop.slots.fuel = { item: fuel, count: 1 };
    let generated = 0; let consumed = 0;
    for (let i = 0; i < 100; i++) {
      const result = advanceMachine(state, 250); generated += result.generatedJ; consumed += result.fuelConsumed;
      state = normalizeMachine(JSON.parse(JSON.stringify(result.state)), kind, "home", "local");
      if (consumed === 1 && state.workshop.burnJ === 0) break;
    }
    assert.equal(consumed, 1); assert.equal(generated * 4 + state.workshop.burnJ, joules);
    assert.equal(state.workshop.slots.fuel, null);
    const full = { ...state, energyJ: machineCapacity(kind), workshop: { ...state.workshop, slots: { ...state.workshop.slots, fuel: { item: fuel, count: 1 } } } };
    const stopped = advanceMachine(full, 1000);
    assert.equal(stopped.generatedJ, 0); assert.equal(stopped.fuelConsumed, 0);
    assert.equal(stopped.state.workshop.slots.fuel?.count, 1);
  }
});

test("pump requires a measured loaded water source, one second, room and exactly 1000 J per litre", () => {
  let state = createMachine("fluid-pump", "home", "local"); state.energyJ = 2000;
  assert.equal(advanceMachine(state, 1000).waterConsumedMl, 0);
  for (let i = 0; i < 3; i++) {
    const result = advanceMachine(state, 250, { waterAvailableMl: 1000 }); state = result.state;
    assert.equal(result.waterConsumedMl, 0); assert.equal(state.energyJ, 2000);
  }
  const litre = advanceMachine(state, 250, { waterAvailableMl: 1000 });
  assert.equal(litre.waterConsumedMl, 1000); assert.equal(litre.consumedJ, 1000);
  assert.deepEqual(litre.state.workshop.fluid, { resource: "water", amount: 1000 });
  const full = { ...litre.state, workshop: { ...litre.state.workshop, fluid: { resource: "water", amount: 8000 } } };
  assert.equal(advanceMachine(full, 1000, { waterAvailableMl: 1000 }).waterConsumedMl, 0);
});

test("normal held-item transactions preserve exact custody and reject retries", () => {
  const state = createMachine("powered-crusher", "home", "local");
  const held: InventorySlot = { item: Item.RawIron, count: 12, metadata: { serial: "ore" } };
  const insert = transferMachineItem(state, "a", "input", held, "insert", 0, 5);
  assert.equal(insert.ok, true); assert.equal(insert.held?.count, 7);
  assert.equal(insert.machine.workshop.slots.input?.count, 5);
  assert.equal(insert.machine.workshop.slots.input?.metadata?.serial, "ore");
  assert.equal(transferMachineItem(insert.machine, "a", "input", held, "insert", 0, 5).ok, false);
  const remove = transferMachineItem(insert.machine, "a", "input", insert.held, "extract", insert.machine.revision);
  assert.deepEqual(remove.held, held); assert.equal(remove.machine.workshop.slots.input, null);
  assert.equal(transferMachineItem(state, "a", "output", held, "insert", 0).ok, false);
});

test("portable fluid and gas retain exact quantities and item metadata through break/place/reload", () => {
  for (const [kind, item, store] of [["fluid-tank", Item.FluidCanister, "fluid"], ["gas-tank", Item.GasCylinder, "chemical"]] as const) {
    let state = createMachine(kind, "home", "local"); state.workshop[store] = { resource: store === "fluid" ? "water" : "oxygen", amount: 1500 };
    const held = { item, count: 1, metadata: { serial: "canister" } };
    const filled = transferPortableResource(state, "a", held, "fill", state.revision);
    assert.equal(filled.ok, true); assert.equal(filled.machine.workshop[store]?.amount, 500);
    assert.equal(portableResource(filled.held)?.quantity, 1000); assert.equal(filled.held?.metadata?.serial, "canister");
    const block = kind === "fluid-tank" ? BlockId.FluidTank : BlockId.GasTank;
    state = placedWorkshopMachine(kind, { item: block, count: 1, metadata: { wayworks: filled.machine } }, "orbit", "other", 3);
    assert.equal(state.workshop[store]?.amount, 500); assert.equal(state.facing, 3);
    state = normalizeMachine(JSON.parse(JSON.stringify(state)), kind, "orbit", "other");
    const emptied = transferPortableResource(state, "b", filled.held, "empty", state.revision);
    assert.equal(emptied.machine.workshop[store]?.amount, 1500); assert.equal(portableResource(emptied.held), null);
  }
});

test("portable transfer after-images deep-clone unrelated metadata", () => {
  const state = createMachine("fluid-tank", "home", "local"); state.workshop.fluid = { resource: "water", amount: 1000 };
  const held = { item: Item.FluidCanister, count: 1, metadata: { nested: { serial: "before" } } };
  const result = transferPortableResource(state, "tank", held, "fill", 0);
  (result.held!.metadata!.nested as { serial: string }).serial = "after";
  assert.equal(held.metadata.nested.serial, "before");
});

test("charging follows both control-signal polarities", () => {
  for (const control of ["signal-on", "signal-off"] as const) for (const signal of [false, true]) {
    const state = createMachine("charging-pedestal", "home", "local"); state.energyJ = 3000;
    state.workshop.control = control; state.workshop.signal = signal;
    const held = { item: Item.EvaPowerCell, count: 1, metadata: { lifeSupport: { schema: 1, energyJ: 0, oxygenMl: 0, scrubberSeconds: 0, leak: 0, sockets: [] } } };
    const result = applyWorkshopAction(state, "pedestal", held, 0, { kind: "charge" });
    assert.equal(result.ok, control === "signal-on" ? signal : !signal);
    assert.equal(result.machine.energyJ, result.ok ? 1000 : 3000);
  }
});

test("upgrades trade power for speed, consume actual modules and cannot shrink occupied capacity", () => {
  const state = createMachine("powered-crusher", "home", "local");
  const installed = applyWorkshopAction(state, "a", { item: Item.SpeedModule, count: 2 }, 0, { kind: "upgrade-install" });
  assert.equal(installed.ok, true); assert.equal(installed.held?.count, 1);
  const recipe = MACHINE_RECIPES[0]; const normal = recipeCost(recipe, state.workshop); const faster = recipeCost(recipe, installed.machine.workshop);
  assert.ok(faster.durationMs < normal.durationMs); assert.ok(faster.costJ > normal.costJ);
  const tank = createMachine("fluid-tank", "home", "local");
  const capacity = applyWorkshopAction(tank, "b", { item: Item.CapacityModule, count: 1 }, 0, { kind: "upgrade-install" });
  capacity.machine.workshop.fluid = { resource: "water", amount: 70000 };
  const remove = applyWorkshopAction(capacity.machine, "b", null, capacity.machine.revision, { kind: "upgrade-remove", upgrade: "capacity" });
  assert.equal(remove.ok, false); assert.equal(remove.machine.workshop.upgrades.capacity, 1);
});

test("machine sockets reject ineffective modules without consuming them", () => {
  for (const kind of ["powered-crusher", "heat-engine", "fluid-pump", "fluid-tank", "gas-tank", "grid-battery", "grid-cable"] as const) {
    const state = createMachine(kind, "home", "local");
    for (const upgrade of UPGRADE_KINDS) {
      const held = { item: UPGRADE_ITEMS[upgrade], count: 1 };
      const result = applyWorkshopAction(state, "a", held, 0, { kind: "upgrade-install" });
      assert.equal(result.ok, supportedWorkshopUpgrades(kind).includes(upgrade), `${kind}/${upgrade}`);
      if (!result.ok) { assert.deepEqual(result.held, held); assert.deepEqual(result.machine, state); }
    }
  }
});

test("heat engines can consume supplied heat without fuel or energy amplification", () => {
  let state = createMachine("heat-engine", "home", "local"); state.workshop.heatJ = 20000;
  const first = advanceMachine(state, 1000);
  assert.equal(first.fuelConsumed, 0); assert.equal(first.generatedJ, 2400);
  assert.equal(first.state.workshop.heatJ, 8400); // 2kJ radiated, 9.6kJ converted/dissipated.
  let generated = first.generatedJ; state = first.state;
  for (let i = 0; i < 20; i++) { const step = advanceMachine(state, 1000); generated += step.generatedJ; state = step.state; }
  assert.ok(generated <= 5000); assert.equal(state.workshop.heatJ, 0);
  assert.equal(state.status, "no-fuel"); assert.equal(state.workshop.slots.fuel, null);
  const full = createMachine("heat-engine", "home", "local"); full.energyJ = machineCapacity(full.kind); full.workshop.heatJ = 20000;
  const stopped = advanceMachine(full, 1000); assert.equal(stopped.generatedJ, 0); assert.equal(stopped.state.workshop.heatJ, 18000);
});

test("extension migration preserves old finite power and malformed state/opaque intents fail closed", () => {
  const current = createMachine("field-battery", "home", "local"); current.energyJ = 4000;
  const legacy = { ...current } as Partial<MachineState>; delete legacy.workshop;
  assert.equal(normalizeMachine(legacy, current.kind, "home", "local").energyJ, 4000);
  const invalid = normalizeMachine({ ...current, workshop: { ...current.workshop, fluid: { resource: "water", amount: 1 } } }, current.kind, "home", "local");
  assert.equal(invalid.enabled, false); assert.equal(invalid.status, "invalid-state");
  assert.equal(parseWorkshopAction({ kind: "crank", energyJ: 99999 }), null);
  assert.equal(parseWorkshopAction({ kind: "slot", slot: "input", direction: "insert", maximum: Infinity }), null);
  assert.equal(parseWorkshopAction({ kind: "vent", confirmed: false }), null);
  for (const recipe of RECIPES.filter((candidate) => candidate.id.startsWith("grid-battery") || candidate.id === "ship-battery-bank")) {
    assert.equal(recipe.pattern.some((item) => typeof item === "number" && machineKindForBlock(item)), false, "ordinary crafting must not discard a charged machine's contents");
  }
});
