import { Item, maxStack, type InventorySlot } from "./data";
import { depositDigitalItem, type DigitalItemVault } from "./digital-storage";
import { localFaceForWorldDirection, type MachineState, type PowerNode } from "./wayworks";
import { machineEndpoint, machineSlots, withMachineEndpoint, type MachineResourceSlot } from "./wayworks-machines";
import { machineRecipes } from "./wayworks-recipes";
import { transferResource } from "./wayworks-resources";
import { workshopRunning, type MaterialKind, type MaterialPortMode, type WorkshopSlot } from "./wayworks-stores";
import { PowerTopologyCache, type PowerTopologyNode, type PowerTopologyResult } from "./wayworks-network";
import { chemistryAcceptsItem, chemistryReservoirs, type ChemicalReservoir } from "./pressure-chemistry";
import { pressureMachineKind } from "./pressure-catalog";

const MATERIALS: readonly MaterialKind[] = ["item", "fluid", "chemical", "heat"];
const RATES = { item: 4, fluid: 1000, chemical: 2000, heat: 8000 } as const;
/** Exact configured routing, independent of today's stored quantities/recipes. */
export function materialTopologyNode(node: PowerNode, resource: MaterialKind): PowerTopologyNode {
  return { key: node.key, x: node.x, y: node.y, z: node.z,
    kind: node.state.kind, locationId: node.state.locationId, ownerId: node.state.ownerId, facing: node.state.facing,
    enabled: node.state.enabled && workshopRunning(node.state.workshop), channel: node.state.workshop.channel,
    ports: Object.fromEntries(Object.entries(node.state.workshop.resourcePorts[resource]).map(([face, mode]) => [face,
      mode === "both" && node.state.workshop.process?.backflow === false ? "input" : mode])) as Record<keyof MachineState["ports"], MaterialPortMode> };
}
/** Cached adjacency only. All quantities, residuals and throughput budgets remain in physical nodes. */
export class MaterialTopologyCache {
  private readonly caches = Object.fromEntries(MATERIALS.map(resource => [resource, new PowerTopologyCache()])) as Record<MaterialKind, PowerTopologyCache>;
  clear() { for (const cache of Object.values(this.caches)) cache.clear(); }
  get(nodes: readonly PowerNode[], resource: MaterialKind): PowerTopologyResult {
    return this.caches[resource].get(nodes.map(node => materialTopologyNode(node, resource)));
  }
}
function materialRate(state: MachineState, resource: MaterialKind) {
  const rate = pressureMachineKind(state.kind) ? resource === "chemical" ? 48000 : resource === "fluid" ? 8000 : RATES[resource] : RATES[resource];
  return resource === "item" ? rate : Math.floor(rate * (state.workshop.process?.flowPermille ?? 1000) / 1000);
}

export function machineInputForItem(state: MachineState, item: InventorySlot): WorkshopSlot | null {
  if (state.workshop.upgrades.filter > 0 && state.workshop.filterItem !== null && state.workshop.filterItem !== item.item) return null;
  if (state.kind === "heat-engine" && (item.item === Item.Coal || item.item === Item.Charcoal)) return "fuel";
  if (state.kind === "biofuel-engine" && item.item === Item.BiofuelPellet) return "fuel";
  for (const slot of machineSlots(state.kind)) if (chemistryAcceptsItem(state.kind, slot, item.item)) return slot;
  const recipes = machineRecipes(state.kind);
  if (recipes.some((recipe) => recipe.input.items.includes(item.item))) return "input";
  if (recipes.some((recipe) => recipe.reagent?.items.includes(item.item))) return "reagent";
  return null;
}

/** Buffered material networks. Each moved unit consumes both nodes' shared tick allowance.
 * A pipe cannot instantly relay a full allowance it just received; its saved buffer is the only material authority. */
export function advanceMachineLinks(nodes: readonly PowerNode[], elapsedMs: number, cache = new MaterialTopologyCache()) {
  const states = new Map(nodes.map((node) => [node.key, node.state]));
  const budgets = new Map<string, number>();
  const result = { states, budgets, moved: { item: 0, fluid: 0, chemical: 0, heat: 0 }, reason: "ok" };
  const dt = Number.isFinite(elapsedMs) ? Math.min(1000, Math.max(0, Math.floor(elapsedMs))) : 0;
  const topologies = new Map(MATERIALS.map(resource => [resource, cache.get(nodes, resource)]));
  for (const topology of topologies.values()) if (!topology.ok) return { ...result, reason: topology.reason === "node-limit" ? "node-limit" : "invalid-node" };
  const byKey = new Map(nodes.map(node => [node.key, node]));
  for (const node of nodes) {
    const state = states.get(node.key)!;
    const remainders = { ...state.workshop.resourceRemainders };
    let changed = false;
    for (const resource of MATERIALS) {
      const allowance = state.enabled && workshopRunning(state.workshop) && state.revision < Number.MAX_SAFE_INTEGER
        ? materialRate(state, resource) * dt + remainders[resource] : remainders[resource];
      budgets.set(`${node.key}/${resource}`, Math.floor(allowance / 1000));
      if (remainders[resource] !== allowance % 1000) changed = true;
      remainders[resource] = allowance % 1000;
    }
    if (changed) states.set(node.key, { ...state, revision: state.revision + 1, workshop: { ...state.workshop, resourceRemainders: remainders } });
  }
  for (const node of [...nodes].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)) {
    for (const resource of MATERIALS) {
      for (const neighborKey of topologies.get(resource)!.edges.get(node.key) ?? []) {
        const neighbor = byKey.get(neighborKey)!;
        let source = states.get(node.key)!, destination = states.get(neighbor.key)!;
        if (!source.enabled || !destination.enabled || !workshopRunning(source.workshop) || !workshopRunning(destination.workshop)
          || source.ownerId !== destination.ownerId || source.workshop.channel !== destination.workshop.channel) continue;
        const sourceSlots: readonly MachineResourceSlot[] = resource === "item" ? ["output", "byproduct"] : resource === "heat" ? ["heat"] : chemistryReservoirs(source.kind, "output", resource);
        for (const sourceSlot of sourceSlots) {
          source = states.get(node.key)!; destination = states.get(neighbor.key)!;
          let maximum = Math.min(budgets.get(`${node.key}/${resource}`)!, budgets.get(`${neighbor.key}/${resource}`)!);
          if (!maximum) continue;
          if ((resource === "fluid" || resource === "chemical") && source.workshop.cycle
            && chemistryReservoirs(source.kind, "input", resource).includes(sourceSlot as ChemicalReservoir)) continue;
          let destinationSlots: readonly MachineResourceSlot[] = [sourceSlot];
          if (resource === "item") {
            // The cache already enforces face direction; pull remains an explicit target-side request.
            const face = localFaceForWorldDirection(destination.facing, node.x - neighbor.x, node.y - neighbor.y, node.z - neighbor.z);
            if (!source.workshop.autoEject && destination.workshop.resourcePorts.item[face] !== "pull") continue;
            const item = source.workshop.slots[sourceSlot as WorkshopSlot];
            if (!item) continue;
            const selected = machineInputForItem(destination, item);
            if (!selected || !machineSlots(destination.kind).includes(selected)) continue;
            destinationSlots = [selected];
          } else if (resource === "heat") {
            maximum = Math.min(maximum, Math.max(0, Math.floor((source.workshop.heatJ - destination.workshop.heatJ) / 2)));
          } else {
            const content = machineEndpoint(source, node.key, sourceSlot).content;
            if (!content || content.kind === "item") continue;
            const filter = resource === "fluid" ? destination.workshop.process?.fluidFilter : destination.workshop.process?.gasFilter;
            if (filter && filter !== content.resource) continue;
            destinationSlots = chemistryReservoirs(destination.kind, "input", resource, content.resource);
          }
          for (const destinationSlot of destinationSlots) {
            source = states.get(node.key)!; destination = states.get(neighbor.key)!;
            maximum = Math.min(maximum, budgets.get(`${node.key}/${resource}`)!, budgets.get(`${neighbor.key}/${resource}`)!);
            const from = machineEndpoint(source, node.key, sourceSlot);
            let to = machineEndpoint(destination, neighbor.key, destinationSlot);
            if (from.content?.kind === "item") to = { ...to, capacity: Math.min(to.capacity, maxStack(from.content.slot.item)) };
            const moved = transferResource(from, to, maximum);
            if (!moved.ok) continue;
            states.set(node.key, withMachineEndpoint(source, sourceSlot, moved.source));
            states.set(neighbor.key, withMachineEndpoint(destination, destinationSlot, moved.destination));
            const amount = moved.moved!.quantity;
            budgets.set(`${node.key}/${resource}`, budgets.get(`${node.key}/${resource}`)! - amount);
            budgets.set(`${neighbor.key}/${resource}`, budgets.get(`${neighbor.key}/${resource}`)! - amount);
            result.moved[resource] += amount;
            break;
          }
        }
      }
    }
  }
  return result;
}

export const WAYGRID_ITEM_TRANSFER_J = 50;
/** Existing DigitalItemVault is the sole item authority; install both returned images atomically. */
export function exportMachineToWaygrid(state: MachineState, vault: DigitalItemVault, slot: "output" | "byproduct", maximum = 4) {
  const fail = (reason: string) => ({ ok: false, reason, machine: state, vault, moved: 0 });
  if (!state.enabled || !workshopRunning(state.workshop) || !state.workshop.autoEject || state.revision >= Number.MAX_SAFE_INTEGER) return fail("disabled");
  const item = state.workshop.slots[slot];
  if (!item || !Number.isSafeInteger(maximum) || maximum < 1 || maximum > 64) return fail("no-output");
  const count = Math.min(item.count, maximum, Math.floor(state.energyJ / WAYGRID_ITEM_TRANSFER_J));
  if (!count) return fail("no-power");
  const deposited = depositDigitalItem(vault, { ...item, count });
  if (!deposited.accepted) return fail("backpressure");
  const remaining = item.count - deposited.accepted;
  const slots = { ...state.workshop.slots, [slot]: remaining > 0 ? { ...item, count: remaining } : null };
  return { ok: true, reason: "ok", moved: deposited.accepted, vault: deposited.state,
    machine: { ...state, revision: state.revision + 1, energyJ: state.energyJ - deposited.accepted * WAYGRID_ITEM_TRANSFER_J,
      workshop: { ...state.workshop, slots } } };
}
