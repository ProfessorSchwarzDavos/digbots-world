import { BlockId, Item, ITEMS, maxStack, type InventorySlot } from "./data";
import { lifeSupportStore, validLifeSupportItem } from "./life-support";
import { normalizeMachine, type MachineKind, type MachineState } from "./wayworks";
import { machineRecipe, recipeCost } from "./wayworks-recipes";
import { chemistryRecipe, chemistryCost } from "./pressure-chemistry";
import { WORKSHOP_SLOTS, workshopStoredTotal } from "./wayworks-stores";
import { PRESSURE_CATALOG } from "./pressure-catalog";
import { SPACEFLIGHT_CATALOG } from "./spaceflight-catalog";

/** Bounds apply before normalizers clone or recursively inspect untrusted metadata. */
export const MAX_CUSTODY_SLOTS = 512;
export const MAX_CUSTODY_ITEM_DEPTH = 4;
const MAX_ITEM_NODES = 4096;
const MAX_ITEM_JSON = 65_536;
// Keep this leaf module independent of integration/multiplayer/engine imports.
const MACHINE_ITEMS: Readonly<Partial<Record<number, MachineKind>>> = {
  ...Object.fromEntries(Object.entries(SPACEFLIGHT_CATALOG).map(([kind, def]) => [def.id, kind])) as Partial<Record<number, MachineKind>>,
  ...Object.fromEntries(Object.entries(PRESSURE_CATALOG).map(([kind, def]) => [def.id, kind])) as Partial<Record<number, MachineKind>>,
  [BlockId.HandDynamo]: "hand-dynamo", [BlockId.SunplateArray]: "sunplate-array",
  [BlockId.FieldBattery]: "field-battery", [BlockId.ChargingPedestal]: "charging-pedestal", [BlockId.GridCable]: "grid-cable",
  [BlockId.HeatEngine]: "heat-engine", [BlockId.WindRotor]: "wind-rotor", [BlockId.WaterwheelGenerator]: "waterwheel-generator",
  [BlockId.BiofuelEngine]: "biofuel-engine", [BlockId.GridBattery]: "grid-battery", [BlockId.ShipBatteryBank]: "ship-battery-bank",
  [BlockId.PoweredCrusher]: "powered-crusher", [BlockId.EnrichmentMill]: "enrichment-mill", [BlockId.ElectricSmelter]: "electric-smelter",
  [BlockId.AlloyInfuser]: "alloy-infuser", [BlockId.PlatePress]: "plate-press", [BlockId.PrecisionSawmill]: "precision-sawmill",
  [BlockId.FluidPump]: "fluid-pump", [BlockId.FluidTank]: "fluid-tank", [BlockId.GasTank]: "gas-tank",
};
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object"
  && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)));

/** Order-independent, bounded JSON identity; reject accessors, exotic objects and cycles. */
function signature(value: unknown): string {
  let nodes = 0, characters = 0;
  const ancestors = new Set<object>();
  const encode = (input: unknown, depth: number): string => {
    if (++nodes > MAX_ITEM_NODES || depth > 32) throw new Error("custody-structure-limit");
    if (input === null || typeof input === "boolean" || typeof input === "number" && Number.isFinite(input)) return JSON.stringify(input);
    if (typeof input === "string") {
      characters += input.length;
      if (characters > MAX_ITEM_JSON) throw new Error("custody-size-limit");
      return JSON.stringify(input);
    }
    if (typeof input !== "object" || !input || ancestors.has(input) || !Array.isArray(input) && !record(input)) throw new Error("custody-invalid-json");
    ancestors.add(input);
    const keys = Reflect.ownKeys(input);
    if (keys.length > MAX_ITEM_NODES) throw new Error("custody-structure-limit");
    for (const key of keys) {
      if (typeof key !== "string" || !Object.hasOwn(Object.getOwnPropertyDescriptor(input, key)!, "value")) throw new Error("custody-invalid-property");
    }
    let result: string;
    if (Array.isArray(input)) {
      if (keys.length !== input.length + 1) throw new Error("custody-invalid-array");
      result = `[${input.map(entry => encode(entry, depth + 1)).join(",")}]`;
    } else {
      result = `{${(keys as string[]).sort().map(key => {
        characters += key.length;
        if (characters > MAX_ITEM_JSON) throw new Error("custody-size-limit");
        return `${JSON.stringify(key)}:${encode((input as Record<string, unknown>)[key], depth + 1)}`;
      }).join(",")}}`;
    }
    ancestors.delete(input);
    if (result.length > MAX_ITEM_JSON) throw new Error("custody-size-limit");
    return result;
  };
  return encode(value, 0);
}

function itemShell(slot: InventorySlot, metadata = slot.metadata ?? {}) {
  return { item: slot.item, ...(slot.durability === undefined ? {} : { durability: slot.durability }), metadata };
}

function validItem(slot: unknown, depth: number): slot is InventorySlot {
  if (depth > MAX_CUSTODY_ITEM_DEPTH || !record(slot)
    || Object.keys(slot).some(key => !["item", "count", "durability", "metadata"].includes(key))
    || !Number.isSafeInteger(slot.item) || !ITEMS[slot.item as number]
    || !Number.isSafeInteger(slot.count) || Number(slot.count) < 1 || Number(slot.count) > maxStack(slot.item as number)
    || slot.durability !== undefined && (typeof slot.durability !== "number" || !Number.isFinite(slot.durability) || slot.durability < 0)
    || slot.metadata !== undefined && !record(slot.metadata)) return false;
  const item = slot as InventorySlot, metadata = item.metadata ?? {};
  if (!validLifeSupportItem(item)) return false;
  if (ITEMS[item.item].lifeSupportKind && metadata.lifeSupport !== undefined) {
    const store = metadata.lifeSupport as { sockets: unknown[] };
    if (!store.sockets.every(child => child === null || validItem(child, depth + 1))) return false;
  }
  if (metadata.wayworksResource !== undefined) {
    const packet = metadata.wayworksResource;
    const kind = item.item === Item.FluidCanister ? "fluid" : item.item === Item.GasCylinder ? "chemical" : null;
    const capacity = item.item === Item.FluidCanister ? 8000 : 24_000;
    if (!kind || item.count !== 1 || !record(packet) || Object.keys(packet).sort().join(",") !== "kind,quantity,resource"
      || packet.kind !== kind || typeof packet.resource !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(packet.resource)
      || !Number.isSafeInteger(packet.quantity) || Number(packet.quantity) <= 0 || Number(packet.quantity) > capacity) return false;
  }
  if (metadata.wayworks !== undefined) {
    const kind = MACHINE_ITEMS[item.item], raw = metadata.wayworks;
    if (!kind || !record(raw) || typeof raw.locationId !== "string" || !raw.locationId || raw.locationId.length > 256
      || typeof raw.ownerId !== "string" || !raw.ownerId || raw.ownerId.length > 128) return false;
    const normalized = normalizeMachine(raw, kind, raw.locationId, raw.ownerId);
    const workshop = normalized.workshop;
    // Empty configured cables remain splittable; finite contents and installed
    // hardware identity are one physical vessel, never a stack of copied stores.
    if (item.count > 1 && (normalized.energyJ || workshop.heatJ || workshop.burnJ || workshop.cycle
      || workshopStoredTotal(workshop, "fluid") || workshopStoredTotal(workshop, "chemical")
      || WORKSHOP_SLOTS.some(name => workshop.slots[name]) || Object.values(workshop.upgrades).some(Boolean)
      || workshop.process?.filterUsedMl || workshop.process?.installationId)) return false;
    // Missing workshop is the supported historical migration. Present malformed data
    // must not pass merely because normalization discarded/clamped its contents.
    const migrated = raw.workshop === undefined ? { ...raw, workshop: normalized.workshop } : raw;
    if (signature(migrated) !== signature(normalized)) return false;
    for (const name of WORKSHOP_SLOTS) {
      const child = normalized.workshop.slots[name];
      if (child !== null && !validItem(child, depth + 1)) return false;
    }
    if (normalized.workshop.burnJ > (kind === "heat-engine" ? 80_000 : kind === "biofuel-engine" ? 24_000 : 0)) return false;
    const cycle = normalized.workshop.cycle;
    if (cycle) {
      const recipe = machineRecipe(cycle.recipeId), chemical = chemistryRecipe(cycle.recipeId);
      if ((!recipe || recipe.machine !== kind) && (!chemical || chemical.machine !== kind)) return false;
      const cost = recipe ? recipeCost(recipe, normalized.workshop) : chemistryCost(chemical!, normalized.workshop);
      if (cycle.durationMs !== cost.durationMs || cycle.costJ !== cost.costJ) return false;
    }
  }
  return true;
}

/** Save/network boundary validation. Does not mutate, refill, clamp, or drop payloads. */
export function validCustodyItem(value: unknown): value is InventorySlot {
  try {
    // Optional undefined slot fields occur locally, but metadata itself must be JSON.
    if (!record(value)) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(value).some(key => typeof key !== "string" || !Object.hasOwn(descriptors[key], "value"))) return false;
    signature(Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)));
    return validItem(value, 0);
  } catch { return false; }
}

type LifeSupportClaim = { identity: string; resources: number[] };
type CustodyLedger = { exact: Map<string, number>; lifeSupport: LifeSupportClaim[] };

/** Bind CF3 consumption to one item, its socket topology, and every child's identity.
 * Each resource keeps its own component; oxygen can never pay for electricity. */
function lifeSupportClaim(slot: InventorySlot): LifeSupportClaim {
  const resources: number[] = [];
  const shell = (item: InventorySlot): unknown => {
    const store = lifeSupportStore(item);
    resources.push(store.oxygenMl, store.energyJ, store.scrubberSeconds);
    const metadata = { ...item.metadata };
    delete metadata.lifeSupport;
    return { ...itemShell(item, metadata), leak: store.leak,
      sockets: store.sockets.map(child => child ? shell(child) : null) };
  };
  return { identity: signature(shell(slot)), resources };
}

function ledger(slots: readonly unknown[]): CustodyLedger | null {
  if (!Array.isArray(slots) || slots.length > MAX_CUSTODY_SLOTS) return null;
  const result: CustodyLedger = { exact: new Map(), lifeSupport: [] };
  for (const slot of slots) {
    if (slot === null || slot === undefined) continue;
    if (!validCustodyItem(slot)) return null;
    if (slot.metadata?.wayworks !== undefined || slot.metadata?.wayworksResource !== undefined) {
      const metadata = { ...slot.metadata };
      if (metadata.wayworks !== undefined) {
        const state = metadata.wayworks as MachineState;
        metadata.wayworks = normalizeMachine(state, state.kind, state.locationId, state.ownerId);
      }
      const key = signature(itemShell(slot, metadata));
      result.exact.set(key, (result.exact.get(key) ?? 0) + slot.count);
    } else if (ITEMS[slot.item].lifeSupportKind) {
      const claim = lifeSupportClaim(slot);
      // Empty, unsocketed gear remains craftable through the existing inventory path.
      if (claim.resources.some(amount => amount > 0) || lifeSupportStore(slot).sockets.some(Boolean)) result.lifeSupport.push(claim);
    }
  }
  return result;
}

export type ProtectedCustodyComparison = { ok: true; reason: "ok" } | {
  ok: false; reason: "invalid-before" | "invalid-after" | "protected-item-increase" | "life-support-increase";
};

/** For opaque player after-images only. Include inventory, equipment, cursor and
 * crafting custody on BOTH sides. Authoritative typed transactions install their
 * validated results separately. Normal stack split/move is legal; loss is allowed.
 * Machine/portable payloads are exact multisets, so even equal-total resource
 * transmutation, configuration edits, paid progress and nested item minting fail.
 * This deliberately does not grant authority over ordinary crafting/items. */
export function compareProtectedCustody(before: readonly unknown[], after: readonly unknown[]): ProtectedCustodyComparison {
  const old = ledger(before);
  if (!old) return { ok: false, reason: "invalid-before" };
  const next = ledger(after);
  if (!next) return { ok: false, reason: "invalid-after" };
  for (const [key, count] of next.exact) {
    if (count > (old.exact.get(key) ?? 0)) return { ok: false, reason: "protected-item-increase" };
  }
  // Bipartite matching avoids pooling two depleted units into one full unit, and
  // avoids greedy false rejections when identical shells have different reserves.
  const assigned = new Map<number, number>();
  const match = (index: number, visited: Set<number>): boolean => {
    const wanted = next.lifeSupport[index];
    for (let i = 0; i < old.lifeSupport.length; i++) {
      const source = old.lifeSupport[i];
      if (visited.has(i) || source.identity !== wanted.identity || source.resources.length !== wanted.resources.length
        || wanted.resources.some((amount, part) => amount > source.resources[part])) continue;
      visited.add(i);
      const previous = assigned.get(i);
      if (previous === undefined || match(previous, visited)) { assigned.set(i, index); return true; }
    }
    return false;
  };
  for (let i = 0; i < next.lifeSupport.length; i++) {
    if (!match(i, new Set())) return { ok: false, reason: "life-support-increase" };
  }
  return { ok: true, reason: "ok" };
}
