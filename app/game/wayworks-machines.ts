import { cloneSlot, Item, maxStack, type InventorySlot } from "./data";
import { machineCapacity, machineRate, normalizeMachine, type MachineKind, type MachineState } from "./wayworks";
import { machineRecipe, machineRecipes, recipeCost, type MachineRecipe } from "./wayworks-recipes";
import { resourceItemSignature, transferResource, type ResourceEndpoint, type ResourcePacket } from "./wayworks-resources";
import { validWorkshopItem, workshopFluidCapacity, workshopGasCapacity, workshopHeatCapacity, workshopRunning,
  type WorkshopSlot, type WorkshopState } from "./wayworks-stores";

export type MachineResourceSlot = WorkshopSlot | "fluid" | "chemical" | "heat" | "energy";
export function machineEndpoint(state: MachineState, key: string, slot: MachineResourceSlot): ResourceEndpoint {
  const base = { endpointId: `${key}/${slot}`, locationId: state.locationId, revision: state.revision };
  if (slot === "energy" || slot === "heat") {
    const amount = slot === "energy" ? state.energyJ : state.workshop.heatJ;
    return { ...base, kind: slot, capacity: slot === "energy" ? machineCapacity(state.kind, state.workshop) : workshopHeatCapacity(state.workshop),
      content: amount > 0 ? { kind: slot, resource: "joules", quantity: amount } : null };
  }
  if (slot === "fluid" || slot === "chemical") {
    const store = state.workshop[slot];
    return { ...base, kind: slot, capacity: slot === "fluid" ? workshopFluidCapacity(state.kind, state.workshop) : workshopGasCapacity(state.kind, state.workshop),
      content: store ? { kind: slot, resource: store.resource, quantity: store.amount } : null };
  }
  const item = state.workshop.slots[slot];
  return { ...base, kind: "item", capacity: item ? maxStack(item.item) : 64,
    content: item ? { kind: "item", slot: cloneSlot(item)!, quantity: item.count } : null };
}

/** Only call with an after-image produced by a successful resource transaction. */
export function withMachineEndpoint(state: MachineState, slot: MachineResourceSlot, endpoint: ResourceEndpoint): MachineState {
  const next = { ...state, revision: endpoint.revision, workshop: { ...state.workshop, slots: { ...state.workshop.slots } } };
  const packet = endpoint.content;
  if (slot === "energy") next.energyJ = packet?.quantity ?? 0;
  else if (slot === "heat") next.workshop.heatJ = packet?.quantity ?? 0;
  else if (slot === "fluid" || slot === "chemical") next.workshop[slot] = packet && packet.kind !== "item" ? { resource: packet.resource, amount: packet.quantity } : null;
  else next.workshop.slots[slot] = packet?.kind === "item" ? cloneSlot(packet.slot) : null;
  return next;
}

export function machineSlots(kind: MachineKind): readonly WorkshopSlot[] {
  if (kind === "heat-engine" || kind === "biofuel-engine") return ["fuel"];
  const recipes = machineRecipes(kind);
  if (!recipes.length) return [];
  return ["input", ...(recipes.some((recipe) => recipe.reagent) ? ["reagent" as const] : []), "output",
    ...(recipes.some((recipe) => recipe.byproduct) ? ["byproduct" as const] : [])];
}

export function transferMachineItem(state: MachineState, key: string, slot: WorkshopSlot, held: InventorySlot | null,
  direction: "insert" | "extract", expectedRevision: number, maximum = 64) {
  const fail = (reason: string) => ({ ok: false, reason, machine: state, held, moved: 0 });
  if (state.revision !== expectedRevision || state.revision >= Number.MAX_SAFE_INTEGER) return fail("stale-revision");
  if (!machineSlots(state.kind).includes(slot) || !Number.isSafeInteger(maximum) || maximum < 1 || maximum > 64) return fail("invalid-slot");
  if (held && !validWorkshopItem(held)) return fail("invalid-item");
  if (direction === "insert" && (slot === "output" || slot === "byproduct")) return fail("output-only");
  if (direction === "insert" && held) {
    const accepted = slot === "fuel" ? state.kind === "heat-engine" ? held.item === Item.Coal || held.item === Item.Charcoal : state.kind === "biofuel-engine" && held.item === Item.BiofuelPellet
      : machineRecipes(state.kind).some(recipe => (slot === "reagent" ? recipe.reagent : recipe.input)?.items.includes(held.item));
    if (!accepted) return fail("That item is not an ingredient for this machine slot.");
  }
  if (direction === "extract" && state.workshop.cycle && (slot === "input" || slot === "reagent")) return fail("cycle-reserved");
  if (direction === "insert" && state.workshop.filterItem !== null && state.workshop.upgrades.filter > 0 && held?.item !== state.workshop.filterItem) return fail("filtered-item");
  const stored = state.workshop.slots[slot];
  const stackLimit = Math.min(held ? maxStack(held.item) : 64, stored ? maxStack(stored.item) : 64);
  const machine = { ...machineEndpoint(state, key, slot), capacity: stackLimit };
  const player: ResourceEndpoint = { endpointId: "player/selected", locationId: state.locationId, revision: expectedRevision,
    kind: "item", capacity: stackLimit, content: held ? { kind: "item", slot: held, quantity: held.count } : null };
  const result = direction === "insert" ? transferResource(player, machine, maximum) : transferResource(machine, player, maximum);
  if (!result.ok) return fail(result.reason);
  const machineAfter = direction === "insert" ? result.destination : result.source;
  const playerAfter = direction === "insert" ? result.source : result.destination;
  return { ok: true, reason: "ok", machine: withMachineEndpoint(state, slot, machineAfter),
    held: playerAfter.content?.kind === "item" ? cloneSlot(playerAfter.content.slot) : null, moved: result.moved!.quantity };
}

const plain = (slot: InventorySlot | null) => slot && slot.durability === undefined && (!slot.metadata || Object.keys(slot.metadata).length === 0);
function ingredient(slot: InventorySlot | null, requirement: MachineRecipe["input"] | undefined) {
  return !requirement || !!(plain(slot) && requirement.items.includes(slot!.item) && slot!.count >= requirement.count);
}
function hasInputs(workshop: WorkshopState, recipe: MachineRecipe) {
  return ingredient(workshop.slots.input, recipe.input) && ingredient(workshop.slots.reagent, recipe.reagent)
    && (!recipe.fluid || (workshop.fluid?.resource === recipe.fluid.resource && workshop.fluid.amount >= recipe.fluid.amount));
}
function canOutput(slot: InventorySlot | null, output: MachineRecipe["output"] | undefined) {
  return !output || (!slot ? output.count <= maxStack(output.item) : plain(slot) && slot.item === output.item && slot.count + output.count <= maxStack(slot.item));
}
const subtract = (slot: InventorySlot, count: number): InventorySlot | null => slot.count > count ? { ...slot, count: slot.count - count } : null;
const add = (slot: InventorySlot | null, output: MachineRecipe["output"]): InventorySlot => ({ item: output.item, count: (slot?.count ?? 0) + output.count });

export type MachineStep = { state: MachineState; consumedJ: number; generatedJ: number; fuelConsumed: number; waterConsumedMl: number; completed: string | null };
/** No wall clock, inventory authority or world writes. Returned finite debit is committed by the host. */
export function advanceMachine(input: MachineState, elapsedMs: number, environment: { waterAvailableMl?: number } = {}): MachineStep {
  const state = normalizeMachine(input, input.kind, input.locationId, input.ownerId);
  const result: MachineStep = { state, consumedJ: 0, generatedJ: 0, fuelConsumed: 0, waterConsumedMl: 0, completed: null };
  const dt = Number.isFinite(elapsedMs) ? Math.max(0, Math.min(1000, Math.floor(elapsedMs))) : 0;
  if (!dt || state.revision >= Number.MAX_SAFE_INTEGER || state.status === "invalid-state") return result;
  const workshop = state.workshop;
  const before = JSON.stringify([state.energyJ, workshop]);
  // Passive radiator: energy leaves this local thermal store, never appears as electricity.
  workshop.heatJ = Math.max(0, workshop.heatJ - Math.floor(2000 * (1 + workshop.upgrades.thermal) * dt / 1000));
  const finish = () => {
    if (JSON.stringify([state.energyJ, workshop]) !== before) state.revision += 1;
    return result;
  };
  if (!state.enabled) { state.status = "disabled"; return finish(); }
  if (!workshopRunning(workshop)) { state.status = "control-off"; return finish(); }
  if (state.kind === "heat-engine" || state.kind === "biofuel-engine") {
    const room = machineCapacity(state.kind, workshop) - state.energyJ;
    const thermalRoom = Math.floor((workshopHeatCapacity(workshop) - workshop.heatJ) / 3);
    if (room <= 0 || thermalRoom <= 0) { state.status = room <= 0 ? "buffer-full" : "heat-limited"; return finish(); }
    const fuel = workshop.slots.fuel;
    const validFuel = plain(fuel) && (state.kind === "biofuel-engine" ? fuel!.item === Item.BiofuelPellet : fuel!.item === Item.Coal || fuel!.item === Item.Charcoal);
    if (workshop.burnJ === 0 && validFuel) {
      workshop.burnJ = state.kind === "biofuel-engine" ? 24_000 : 80_000;
      workshop.slots.fuel = subtract(fuel!, 1); result.fuelConsumed = 1;
    }
    if (!workshop.burnJ) { state.status = "no-fuel"; return finish(); }
    const allowance = machineRate(state.kind) * dt + workshop.burnRemainder;
    const produced = Math.min(Math.floor(allowance / 1000), Math.floor(workshop.burnJ / 4), room, thermalRoom);
    workshop.burnRemainder = produced < Math.floor(allowance / 1000) ? 0 : allowance % 1000;
    workshop.burnJ -= produced * 4; workshop.heatJ += produced * 3; state.energyJ += produced;
    result.generatedJ = produced; state.status = produced > 0 ? "generating" : "idle";
    return finish();
  }
  if (state.kind === "fluid-pump") {
    if (environment.waterAvailableMl !== 1000) { state.status = "no-water"; return finish(); }
    if (workshop.fluid && workshop.fluid.resource !== "water") { state.status = "output-blocked"; return finish(); }
    if (workshopFluidCapacity(state.kind, workshop) - (workshop.fluid?.amount ?? 0) < 1000) { state.status = "buffer-full"; return finish(); }
    if (state.energyJ < 1000) { state.status = "no-power"; return finish(); }
    const progress = workshop.pumpMs + dt;
    workshop.pumpMs = progress % 1000;
    state.status = "working";
    if (progress >= 1000) {
      workshop.fluid = { resource: "water", amount: (workshop.fluid?.amount ?? 0) + 1000 };
      state.energyJ -= 1000; result.consumedJ = 1000; result.waterConsumedMl = 1000;
    }
    return finish();
  }
  const recipes = machineRecipes(state.kind);
  if (!recipes.length) return finish();
  const recipe = workshop.cycle ? machineRecipe(workshop.cycle.recipeId) : recipes.find((candidate) => hasInputs(workshop, candidate));
  if (!recipe || recipe.machine !== state.kind || !hasInputs(workshop, recipe)) {
    state.status = workshop.cycle ? "invalid-state" : "no-input"; return finish();
  }
  if (!canOutput(workshop.slots.output, recipe.output) || !canOutput(workshop.slots.byproduct, recipe.byproduct)) {
    state.status = "output-blocked"; return finish();
  }
  const cost = recipeCost(recipe, workshop);
  if (workshop.cycle && (workshop.cycle.durationMs !== cost.durationMs || workshop.cycle.costJ !== cost.costJ)) {
    state.status = "invalid-state"; return finish();
  }
  const cycle = workshop.cycle ?? { recipeId: recipe.id, progressMs: 0, paidJ: 0, ...cost };
  const affordableProgress = Math.floor((cycle.paidJ + state.energyJ) * cycle.durationMs / cycle.costJ);
  const nextMs = Math.min(cycle.durationMs, cycle.progressMs + dt, affordableProgress);
  const debit = Math.ceil(cycle.costJ * nextMs / cycle.durationMs) - cycle.paidJ;
  if (nextMs <= cycle.progressMs || debit > state.energyJ) { state.status = "no-power"; return finish(); }
  const heat = Math.ceil(debit / 4);
  if (workshop.heatJ + heat > workshopHeatCapacity(workshop)) { state.status = "heat-limited"; return finish(); }
  workshop.cycle = { ...cycle, progressMs: nextMs, paidJ: cycle.paidJ + debit };
  state.energyJ -= debit; workshop.heatJ += heat; result.consumedJ = debit; state.status = "working";
  if (nextMs === cycle.durationMs) {
    workshop.slots.input = subtract(workshop.slots.input!, recipe.input.count);
    if (recipe.reagent) workshop.slots.reagent = subtract(workshop.slots.reagent!, recipe.reagent.count);
    if (recipe.fluid) {
      const remaining = workshop.fluid!.amount - recipe.fluid.amount;
      workshop.fluid = remaining > 0 ? { ...workshop.fluid!, amount: remaining } : null;
    }
    workshop.slots.output = add(workshop.slots.output, recipe.output);
    if (recipe.byproduct) workshop.slots.byproduct = add(workshop.slots.byproduct, recipe.byproduct);
    workshop.cycle = null; result.completed = recipe.id;
  }
  return finish();
}

export const PORTABLE_RESOURCE_CAPACITY = { [Item.FluidCanister]: 8000, [Item.GasCylinder]: 24_000 } as const;
/** Stored on the single portable item; empty containers have no resource payload. */
export function portableResource(slot: InventorySlot | null): ResourcePacket | null | undefined {
  if (!slot || slot.count !== 1 || (slot.item !== Item.FluidCanister && slot.item !== Item.GasCylinder)) return undefined;
  const saved = slot.metadata?.wayworksResource;
  if (saved === undefined) return null;
  if (!saved || typeof saved !== "object") return undefined;
  const packet = saved as ResourcePacket;
  const kind = slot.item === Item.FluidCanister ? "fluid" : "chemical";
  if (packet.kind !== kind || !Number.isSafeInteger(packet.quantity) || packet.quantity <= 0
    || packet.quantity > PORTABLE_RESOURCE_CAPACITY[slot.item] || typeof packet.resource !== "string"
    || !/^[a-z][a-z0-9-]{0,63}$/.test(packet.resource)) return undefined;
  return { ...packet };
}
export function transferPortableResource(state: MachineState, key: string, held: InventorySlot | null, direction: "fill" | "empty", expectedRevision: number) {
  const fail = (reason: string) => ({ ok: false, reason, machine: state, held, moved: 0 });
  if (expectedRevision !== state.revision || state.revision >= Number.MAX_SAFE_INTEGER) return fail("stale-revision");
  const content = portableResource(held);
  if (content === undefined || !held) return fail("Select one Fluid Canister or Gas Cylinder.");
  const item = held.item as keyof typeof PORTABLE_RESOURCE_CAPACITY;
  const kind = item === Item.FluidCanister ? "fluid" : "chemical";
  const portable: ResourceEndpoint = { endpointId: "player/portable", locationId: state.locationId, revision: expectedRevision,
    kind, capacity: PORTABLE_RESOURCE_CAPACITY[item], content };
  const machine = machineEndpoint(state, key, kind);
  if (direction === "fill" && state.workshop.cycle && kind === "fluid") return fail("cycle-reserved");
  const result = direction === "fill" ? transferResource(machine, portable, 1000) : transferResource(portable, machine, 1000);
  if (!result.ok) return fail(result.reason);
  const after = direction === "fill" ? result.destination : result.source;
  const cloned = cloneSlot(held)!;
  const metadata = { ...cloned.metadata };
  if (after.content) metadata.wayworksResource = after.content; else delete metadata.wayworksResource;
  return { ok: true, reason: "ok", machine: withMachineEndpoint(state, kind, direction === "fill" ? result.source : result.destination),
    held: { ...cloned, metadata }, moved: result.moved!.quantity };
}

export function sameMachineItem(a: InventorySlot | null, b: InventorySlot | null): boolean {
  return a === null || b === null ? a === b : a.count === b.count && resourceItemSignature(a) === resourceItemSignature(b);
}
