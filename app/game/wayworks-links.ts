import { Item, maxStack, type InventorySlot } from "./data";
import { depositDigitalItem, type DigitalItemVault } from "./digital-storage";
import { localFaceForWorldDirection, type MachineState, type PowerNode } from "./wayworks";
import { machineEndpoint, machineSlots, withMachineEndpoint } from "./wayworks-machines";
import { machineRecipes } from "./wayworks-recipes";
import { transferResource } from "./wayworks-resources";
import { workshopRunning, type MaterialKind, type MaterialPortMode, type WorkshopSlot } from "./wayworks-stores";

const DIRECTIONS = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]] as const;
const MATERIALS: readonly MaterialKind[] = ["item", "fluid", "chemical", "heat"];
const RATES = { item: 4, fluid: 1000, chemical: 2000, heat: 8000 } as const;
const sourcePort = (mode: MaterialPortMode, pull: boolean) => mode === "output" || mode === "both" || (pull && mode === "passive");
const targetPort = (mode: MaterialPortMode) => mode === "input" || mode === "both" || mode === "pull";

export function machineInputForItem(state: MachineState, item: InventorySlot): WorkshopSlot | null {
  if (state.workshop.upgrades.filter > 0 && state.workshop.filterItem !== null && state.workshop.filterItem !== item.item) return null;
  if (state.kind === "heat-engine" && (item.item === Item.Coal || item.item === Item.Charcoal)) return "fuel";
  if (state.kind === "biofuel-engine" && item.item === Item.BiofuelPellet) return "fuel";
  const recipes = machineRecipes(state.kind);
  if (recipes.some((recipe) => recipe.input.items.includes(item.item))) return "input";
  if (recipes.some((recipe) => recipe.reagent?.items.includes(item.item))) return "reagent";
  return null;
}

/** Adjacent couplers only. Long pipes, cables, gas chemistry and anchors are separate networks. */
export function advanceMachineLinks(nodes: readonly PowerNode[], elapsedMs: number) {
  const states = new Map(nodes.map((node) => [node.key, node.state]));
  const budgets = new Map<string, number>();
  const result = { states, budgets, moved: { item: 0, fluid: 0, chemical: 0, heat: 0 }, reason: "ok" };
  const dt = Number.isFinite(elapsedMs) ? Math.min(1000, Math.max(0, Math.floor(elapsedMs))) : 0;
  const positions = new Map<string, PowerNode>();
  if (nodes.length > 256) return { ...result, reason: "node-limit" };
  for (const node of nodes) {
    const position = JSON.stringify([node.state.locationId, node.x, node.y, node.z]);
    if (![node.x, node.y, node.z].every(Number.isSafeInteger) || positions.has(position) || states.size !== nodes.length) return { ...result, reason: "invalid-node" };
    positions.set(position, node);
  }
  for (const node of nodes) {
    const state = states.get(node.key)!;
    const remainders = { ...state.workshop.resourceRemainders };
    let changed = false;
    for (const resource of MATERIALS) {
      const allowance = state.enabled && workshopRunning(state.workshop) && state.revision < Number.MAX_SAFE_INTEGER
        ? RATES[resource] * dt + remainders[resource] : remainders[resource];
      budgets.set(`${node.key}/${resource}`, Math.floor(allowance / 1000));
      if (remainders[resource] !== allowance % 1000) changed = true;
      remainders[resource] = allowance % 1000;
    }
    if (changed) states.set(node.key, { ...state, revision: state.revision + 1, workshop: { ...state.workshop, resourceRemainders: remainders } });
  }
  for (const node of [...nodes].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)) {
    for (const [dx, dy, dz] of DIRECTIONS) {
      const neighbor = positions.get(JSON.stringify([node.state.locationId, node.x + dx, node.y + dy, node.z + dz]));
      if (!neighbor) continue;
      for (const resource of MATERIALS) {
        let source = states.get(node.key)!, destination = states.get(neighbor.key)!;
        if (!source.enabled || !destination.enabled || !workshopRunning(source.workshop) || !workshopRunning(destination.workshop)
          || source.ownerId !== destination.ownerId || source.workshop.channel !== destination.workshop.channel) continue;
        const out = source.workshop.resourcePorts[resource][localFaceForWorldDirection(source.facing, dx, dy, dz)];
        const into = destination.workshop.resourcePorts[resource][localFaceForWorldDirection(destination.facing, -dx, -dy, -dz)];
        if (!targetPort(into) || !sourcePort(out, into === "pull")) continue;
        const sourceSlots = resource === "item" ? (["output", "byproduct"] as const) : [resource] as const;
        for (const sourceSlot of sourceSlots) {
          source = states.get(node.key)!; destination = states.get(neighbor.key)!;
          let maximum = Math.min(budgets.get(`${node.key}/${resource}`)!, budgets.get(`${neighbor.key}/${resource}`)!);
          if (!maximum) continue;
          if (resource === "fluid" && source.workshop.cycle) continue;
          let destinationSlot = sourceSlot;
          if (resource === "item") {
            if (!source.workshop.autoEject && into !== "pull") continue;
            const item = source.workshop.slots[sourceSlot as WorkshopSlot];
            if (!item) continue;
            const selected = machineInputForItem(destination, item);
            if (!selected || !machineSlots(destination.kind).includes(selected)) continue;
            destinationSlot = selected as typeof destinationSlot;
          } else if (resource === "heat") {
            maximum = Math.min(maximum, Math.max(0, Math.floor((source.workshop.heatJ - destination.workshop.heatJ) / 2)));
          }
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
