import assert from "node:assert/strict";
import test from "node:test";
import { Item } from "../app/game/data.ts";
import { createMachine, machineCapacity, normalizeMachine, type MachineState, type PowerNode } from "../app/game/wayworks.ts";
import { advanceMachine, transferPortableResource, machineEndpoint } from "../app/game/wayworks-machines.ts";
import { CHEMISTRY_RECIPES, chemistryCost, chemicalStore, setChemicalStore } from "../app/game/pressure-chemistry.ts";
import { advanceMachineLinks, MaterialTopologyCache } from "../app/game/wayworks-links.ts";
import { validCustodyItem } from "../app/game/wayworks-custody.ts";
import { PRESSURE_CATALOG } from "../app/game/pressure-catalog.ts";
import { workshopStoredTotal } from "../app/game/wayworks-stores.ts";

const ambient = { atmosphere: { exposed: true, pressureKPa: 100, fractions: { water: .01, oxygen: .21, inert: .78, methane: .05, "carbon-dioxide": .01 } } };
function node(key: string, z: number, state: MachineState): PowerNode { return { key, x: 0, y: 0, z, state, solarExposure: 0 }; }

test("every chemistry recipe has finite, exact inputs and power costs across cold normalization", () => {
  for (const recipe of CHEMISTRY_RECIPES) {
    let state = createMachine(recipe.machine, "home", "local");
    state.energyJ = recipe.generatedJ ? 0 : machineCapacity(state.kind);
    state.workshop.process!.recipeId = recipe.id;
    for (const input of recipe.inputs) setChemicalStore(state.workshop, input.slot, { resource: input.resource, amount: input.amount });
    for (const input of recipe.itemsIn ?? []) state.workshop.slots[input.slot] = { item: input.item, count: input.count };
    if (recipe.filterMl) state.workshop.slots.reagent = { item: Item.HabitatFilter, count: 1 };
    let consumed = 0, generated = 0, completed = false;
    for (let i = 0; i < 100; i++) {
      const step = advanceMachine(state, 200, ambient);
      consumed += step.consumedJ; generated += step.generatedJ; state = step.state;
      assert.equal(state.status === "invalid-state", false, recipe.id);
      state = normalizeMachine(JSON.parse(JSON.stringify(state)), state.kind, "home", "local");
      if (step.completed) { completed = true; break; }
    }
    assert.equal(completed, true, `${recipe.id}: ${state.status}`);
    assert.equal(consumed, recipe.generatedJ ? 0 : chemistryCost(recipe, state.workshop).costJ, recipe.id);
    assert.equal(generated, recipe.generatedJ ? recipe.generatedJ - recipe.energyJ : 0, recipe.id);
    for (const output of recipe.outputs) assert.deepEqual(chemicalStore(state.workshop, output.slot), { resource: output.resource, amount: output.amount }, recipe.id);
    assert.equal(state.workshop.cycle, null);
    const id = PRESSURE_CATALOG[state.kind as keyof typeof PRESSURE_CATALOG].id;
    assert.equal(validCustodyItem({ item: id, count: 1, metadata: { wayworks: state } }), true, recipe.id);
  }
});

test("electrolysis dual-output backpressure reserves water and never spends blocked power", () => {
  const state = createMachine("electrolyzer", "home", "local");
  state.energyJ = 24000; state.workshop.fluid = { resource: "water", amount: 36 };
  state.workshop.process!.chemicalAux = { resource: "inert", amount: 24 };
  const blocked = advanceMachine(state, 1000);
  assert.equal(blocked.state.status, "output-blocked"); assert.equal(blocked.consumedJ, 0);
  assert.deepEqual(blocked.state.workshop.fluid, state.workshop.fluid);
  state.workshop.process!.chemicalAux = null;
  const half = advanceMachine(state, 500);
  assert.equal(half.consumedJ, 6000); assert.equal(half.state.workshop.fluid?.amount, 36);
  const resumed = advanceMachine(normalizeMachine(JSON.parse(JSON.stringify(half.state)), "electrolyzer", "home", "local"), 500);
  assert.equal(resumed.consumedJ, 6000); assert.equal(resumed.state.workshop.fluid?.amount, 18);
  assert.equal(resumed.state.workshop.chemical?.amount, 12000); assert.equal(resumed.state.workshop.process?.chemicalAux?.amount, 24000);
  const full = advanceMachine(resumed.state, 1000);
  assert.equal(full.state.status, "output-blocked"); assert.equal(full.consumedJ, 0);
});

test("electrolysis and turbine roundtrip loses energy, preserving the exact water batch", () => {
  const electro = createMachine("electrolyzer", "home", "local"); electro.energyJ = 12000;
  electro.workshop.fluid = { resource: "water", amount: 18 };
  const split = advanceMachine(electro, 1000);
  const turbine = createMachine("hydrogen-turbine", "home", "local");
  turbine.workshop.chemical = split.state.workshop.process!.chemicalAux;
  turbine.workshop.process!.chemicalReagent = split.state.workshop.chemical;
  const burnt = advanceMachine(turbine, 1000);
  assert.equal(burnt.generatedJ, 5999); assert.ok(burnt.generatedJ < split.consumedJ);
  assert.deepEqual(burnt.state.workshop.process?.fluidAux, { resource: "water", amount: 18 });
  assert.equal(workshopStoredTotal(burnt.state.workshop, "chemical"), 0);
});

test("ambient harvesting cannot run in vacuum, a sealed intake, or with a missing gas", () => {
  const state = createMachine("atmospheric-condenser", "mars", "local"); state.energyJ = 10000;
  state.workshop.process!.recipeId = "harvest-oxygen";
  for (const atmosphere of [undefined, { exposed: false, pressureKPa: 100, fractions: { oxygen: .21 } },
    { exposed: true, pressureKPa: 0, fractions: { oxygen: .21 } }, { exposed: true, pressureKPa: .6, fractions: { "carbon-dioxide": .95 } }]) {
    const result = advanceMachine(state, 1000, { atmosphere });
    assert.equal(result.state.status, "no-atmospheric-feed"); assert.equal(result.state.energyJ, 10000);
    assert.equal(result.state.workshop.chemical, null);
  }
});

test("scrubber filter lasts exactly ten batches, makes retained waste, then stops", () => {
  let state = createMachine("carbon-scrubber", "home", "local"); state.energyJ = 64000;
  state.workshop.slots.reagent = { item: Item.HabitatFilter, count: 1 };
  for (let i = 0; i < 10; i++) {
    state.workshop.chemical = { resource: "carbon-dioxide", amount: 24000 };
    const result = advanceMachine(state, 1000); assert.equal(result.completed, "capture-carbon-dioxide");
    state = normalizeMachine(JSON.parse(JSON.stringify(result.state)), state.kind, "home", "local");
  }
  assert.deepEqual(state.workshop.slots.byproduct, { item: Item.SpentHabitatFilter, count: 1 });
  assert.deepEqual(state.workshop.slots.output, { item: Item.CarbonPowder, count: 10 });
  state.workshop.chemical = { resource: "carbon-dioxide", amount: 24000 };
  const stopped = advanceMachine(state, 1000); assert.equal(stopped.state.status, "filter-exhausted");
  assert.equal(stopped.state.workshop.chemical?.amount, 24000);
});

test("separate output reservoirs transfer into portable custody without aliasing", () => {
  const state = createMachine("electrolyzer", "home", "local");
  state.workshop.process!.chemicalAux = { resource: "hydrogen", amount: 24000 };
  const result = transferPortableResource(state, "a", { item: Item.GasCylinder, count: 1 }, "fill", 0);
  assert.equal(result.ok, true); assert.equal(result.moved, 1000);
  assert.equal(result.machine.workshop.process?.chemicalAux?.amount, 23000);
  assert.equal(state.workshop.process!.chemicalAux!.amount, 24000);
  assert.equal(validCustodyItem(result.held), true);
  state.workshop.chemical = { resource: "oxygen", amount: 24000 };
  assert.equal(machineEndpoint(state, "a", "chemicalAux").capacity, 24000);
});

test("buffered pipes conserve across cached long chains, cold reload and unloaded splits", () => {
  const source = createMachine("fluid-tank", "home", "local"); source.workshop.fluid = { resource: "water", amount: 5000 };
  let nodes = [node("a", 0, source), node("b", -1, createMachine("liquid-pipe", "home", "local")),
    node("c", -2, createMachine("liquid-pipe", "home", "local")), node("d", -3, createMachine("fluid-tank", "home", "local"))];
  const cache = new MaterialTopologyCache();
  assert.equal(cache.get(nodes, "fluid").rebuilt, true); assert.equal(cache.get(nodes, "fluid").rebuilt, false);
  for (let i = 0; i < 20; i++) {
    const result = advanceMachineLinks(nodes, 250, cache);
    nodes = nodes.map(n => ({ ...n, state: normalizeMachine(JSON.parse(JSON.stringify(result.states.get(n.key))), n.state.kind, "home", "local") }));
    assert.equal(nodes.reduce((sum, n) => sum + workshopStoredTotal(n.state.workshop, "fluid"), 0), 5000);
  }
  assert.ok((nodes[3].state.workshop.fluid?.amount ?? 0) > 0);
  const before = nodes[3].state.workshop.fluid?.amount;
  const split = advanceMachineLinks(nodes.filter(n => n.key !== "c"), 1000, cache);
  assert.equal(split.states.get("d")?.workshop.fluid?.amount, before);
});

test("filters, channels, bidirectional policy and shared pipe throughput are enforced", () => {
  const source = createMachine("gasline", "home", "local"); source.workshop.chemical = { resource: "oxygen", amount: 4800 };
  const destination = createMachine("gasline", "home", "local"); destination.workshop.process!.gasFilter = "hydrogen";
  let result = advanceMachineLinks([node("a", 0, source), node("b", -1, destination)], 1000);
  assert.equal(result.moved.chemical, 0);
  destination.workshop.process!.gasFilter = null; destination.workshop.channel = "other";
  result = advanceMachineLinks([node("a", 0, source), node("b", -1, destination)], 1000); assert.equal(result.moved.chemical, 0);
  destination.workshop.channel = ""; source.workshop.resourcePorts.chemical.front = "both";
  result = advanceMachineLinks([node("a", 0, source), node("b", -1, destination)], 1000); assert.equal(result.moved.chemical, 0);
  source.workshop.process!.backflow = true;
  result = advanceMachineLinks([node("a", 0, source), node("b", -1, destination)], 1000); assert.equal(result.moved.chemical, 4800);
});
