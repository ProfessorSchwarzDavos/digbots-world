import assert from "node:assert/strict";
import test from "node:test";
import { Item } from "../app/game/data.ts";
import { createDigitalItemVault, digitalItemCount } from "../app/game/digital-storage.ts";
import { advanceMachineLinks, exportMachineToWaygrid, WAYGRID_ITEM_TRANSFER_J } from "../app/game/wayworks-links.ts";
import { advancePowerGrid, createMachine, normalizeMachine, type MachineKind, type PowerNode } from "../app/game/wayworks.ts";
import { PowerTopologyCache } from "../app/game/wayworks-network.ts";
const node = (key: string, kind: MachineKind, z: number): PowerNode => ({ key, x: 0, y: 0, z,
  solarExposure: 1, state: createMachine(kind, "home", "local") });

test("direct fluid couplers conserve quantities and obey six faces, channel, owner and capacity", () => {
  const pump = node("pump", "fluid-pump", 0), tank = node("tank", "fluid-tank", -1);
  pump.state.workshop.fluid = { resource: "water", amount: 1000 };
  tank.state.workshop.fluid = { resource: "water", amount: 63900 };
  const result = advanceMachineLinks([pump, tank], 1000);
  assert.equal(result.moved.fluid, 100);
  assert.equal(result.states.get("pump")!.workshop.fluid?.amount, 900);
  assert.equal(result.states.get("tank")!.workshop.fluid?.amount, 64000);
  for (const patch of [{ ownerId: "other" }, { locationId: "orbit" }, { facing: 1 }, { enabled: false },
    { workshop: { ...tank.state.workshop, channel: "teal" } }]) {
    assert.equal(advanceMachineLinks([pump, { ...tank, state: { ...tank.state, ...patch } }], 1000).moved.fluid, 0);
  }
  assert.equal(pump.state.workshop.fluid.amount, 1000);
});

test("processor outputs require configured eject/pull and match actual downstream recipes", () => {
  const crusher = node("crusher", "powered-crusher", 0), mill = node("mill", "enrichment-mill", -1);
  crusher.state.workshop.slots.output = { item: Item.CrushedIron, count: 5, metadata: { serial: "retained" } };
  assert.equal(advanceMachineLinks([crusher, mill], 250).moved.item, 0);
  crusher.state.workshop.autoEject = true;
  const result = advanceMachineLinks([crusher, mill], 250);
  assert.equal(result.moved.item, 1);
  assert.equal(result.states.get("mill")!.workshop.slots.input?.metadata?.serial, "retained");
  mill.state.workshop.upgrades.filter = 1; mill.state.workshop.filterItem = Item.IronIngot;
  assert.equal(advanceMachineLinks([crusher, mill], 250).moved.item, 0);
  assert.equal(advanceMachineLinks([crusher, crusher], 250).reason, "invalid-node");
});

test("fractional item bandwidth persists across short steps and cold serialization", () => {
  const source = node("crusher", "powered-crusher", 0), sink = node("mill", "enrichment-mill", -1);
  source.state.workshop.slots.output = { item: Item.CrushedIron, count: 8 }; source.state.workshop.autoEject = true;
  let nodes = [source, sink]; let moved = 0;
  for (let i = 0; i < 10; i++) {
    const result = advanceMachineLinks(nodes, 100); moved += result.moved.item;
    nodes = nodes.map((entry) => ({ ...entry, state: normalizeMachine(JSON.parse(JSON.stringify(result.states.get(entry.key))), entry.state.kind, "home", "local") }));
  }
  assert.equal(moved, 4);
  assert.equal(nodes[0].state.workshop.slots.output?.count, 4);
  assert.equal(nodes[1].state.workshop.slots.input?.count, 4);
});

test("Waygrid deposit keeps one vault authority and power/material commits atomic", () => {
  const state = createMachine("powered-crusher", "home", "local"); state.energyJ = 1000; state.workshop.autoEject = true;
  state.workshop.slots.output = { item: Item.CrushedIron, count: 8, metadata: { batch: "a" } };
  const vault = createDigitalItemVault();
  const result = exportMachineToWaygrid(state, vault, "output", 4);
  assert.equal(result.ok, true); assert.equal(digitalItemCount(result.vault), 4);
  assert.equal(result.machine.energyJ, 1000 - 4 * WAYGRID_ITEM_TRANSFER_J);
  assert.equal(result.machine.workshop.slots.output?.count, 4);
  assert.equal(result.vault.stacks[0].metadata?.batch, "a");
  assert.equal(digitalItemCount(vault), 0); assert.equal(state.energyJ, 1000);
  const full = { ...vault, stacks: [{ item: Item.IronIngot, count: 1000 }] };
  const blocked = exportMachineToWaygrid(state, full, "output");
  assert.equal(blocked.ok, false); assert.strictEqual(blocked.machine, state); assert.strictEqual(blocked.vault, full);
  assert.equal(exportMachineToWaygrid({ ...state, energyJ: 49 }, vault, "output").moved, 0);
});

test("power pull/passive/service policies share cached topology without storing energy there", () => {
  const battery = node("battery", "grid-battery", 0), sink = node("sink", "electric-smelter", -1);
  battery.state.energyJ = 2000; battery.state.ports.front = "passive";
  const cache = new PowerTopologyCache();
  assert.equal(advancePowerGrid([battery, sink], 250, cache).transferredJ, 0);
  sink.state.ports.back = "pull";
  const result = advancePowerGrid([battery, sink], 250, cache);
  assert.equal(result.transferredJ, 1500);
  const again = advancePowerGrid([{ ...battery, state: result.states.battery }, { ...sink, state: result.states.sink }], 250, cache);
  assert.equal(again.topologyRevision, result.topologyRevision);
  assert.equal(again.networks[0].energyJ, 2000);
  sink.state.ports.back = "service";
  assert.equal(advancePowerGrid([battery, sink], 250, cache).transferredJ, 0);
});
