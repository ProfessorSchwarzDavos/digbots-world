import { Item, ITEMS, cloneSlot, type EquipmentSlot, type InventorySlot } from "./data";
import type { BodyEnvironment } from "./celestial-environment";
import { AIRZONE_MAX_CO2_PPM } from "./airzone";

export type PersonalEquipment = Partial<Record<EquipmentSlot, InventorySlot | null>>;
export type LifeSupportStore = { schema: 1; oxygenMl: number; energyJ: number; scrubberSeconds: number; leak: number; sockets: Array<InventorySlot | null> };
export type LifeSupportState = { hypoxiaSeconds: number; pressureSeconds: number; thermalDose: number; corrosionDose: number; radiationDose: number; damageAccumulator: number };
export type LifeSupportHud = { relevant: boolean; source: string; oxygenLiters: number; capacityLiters: number; secondsRemaining: number;
  sealed: boolean; breathing: boolean; scrubber: string; leak: number; level: "safe" | "low" | "critical" | "danger";
  status: string; hazards: string[]; energyJ: number; swapSeconds: number };
export const EMPTY_LIFE_SUPPORT: Readonly<LifeSupportState> = Object.freeze({ hypoxiaSeconds: 0, pressureSeconds: 0, thermalDose: 0, corrosionDose: 0, radiationDose: 0, damageAccumulator: 0 });
const bounded = (n: unknown, maximum: number, fallback = 0) => typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(maximum, n)) : fallback;
export function gearCapacity(item: number) {
  return { oxygenMl: item === Item.LightOxygenTank ? 180_000 : item === Item.ExpeditionOxygenTank ? 600_000 : item === Item.DiveHarness ? 240_000 : item === Item.FieldOxygenReserve ? 1_200_000 : 0,
    energyJ: [Item.EvaManeuverRig, Item.AurelianSpellRig, Item.DiveHarness, Item.EvaPowerCell].includes(item as never) ? 60_000 : 0,
    scrubberSeconds: [Item.EvaManeuverRig, Item.AurelianSpellRig, Item.ScrubberCartridge].includes(item as never) ? 1800 : 0,
    sockets: [Item.TwinTankHarness, Item.EvaManeuverRig, Item.AurelianSpellRig].includes(item as never) ? 2 : 0 };
}
export const isOxygenTank = (slot: InventorySlot | null | undefined) => Boolean(slot && [Item.LightOxygenTank, Item.ExpeditionOxygenTank].includes(slot.item as never) && slot.count === 1);

/** Network/save callers reject malformed finite stores, rather than silently
 * normalizing a forged reserve or dropping a socketed item's ownership. */
export function validLifeSupportItem(value: { item: number; count: number; metadata?: unknown }): boolean {
  const metadata = value.metadata as Record<string, unknown> | undefined;
  const raw = metadata?.lifeSupport;
  if (!ITEMS[value.item]?.lifeSupportKind) return raw === undefined;
  if (value.count !== 1) return false;
  if (raw === undefined) return true;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const store = raw as Record<string, unknown>, cap = gearCapacity(value.item);
  if (store.schema !== 1 || Object.keys(store).some(k => !["schema", "oxygenMl", "energyJ", "scrubberSeconds", "leak", "sockets"].includes(k))) return false;
  for (const [key, maximum] of [["oxygenMl", cap.oxygenMl], ["energyJ", cap.energyJ], ["scrubberSeconds", cap.scrubberSeconds], ["leak", 3]] as const) {
    if (typeof store[key] !== "number" || !Number.isFinite(store[key]) || Number(store[key]) < 0 || Number(store[key]) > maximum) return false;
  }
  return Array.isArray(store.sockets) && store.sockets.length === cap.sockets && store.sockets.every(tank => tank === null ||
    typeof tank === "object" && isOxygenTank(tank) && validLifeSupportItem(tank));
}

export function lifeSupportResourceTotals(slots: readonly (InventorySlot | null | undefined)[]): { oxygenMl: number; energyJ: number; scrubberSeconds: number } {
  return slots.reduce((sum, slot) => {
    if (!slot || !ITEMS[slot.item]?.lifeSupportKind) return sum;
    const store = lifeSupportStore(slot);
    const nested = lifeSupportResourceTotals(store.sockets);
    return { oxygenMl: sum.oxygenMl + store.oxygenMl + nested.oxygenMl,
      energyJ: sum.energyJ + store.energyJ + nested.energyJ, scrubberSeconds: sum.scrubberSeconds + store.scrubberSeconds + nested.scrubberSeconds };
  }, { oxygenMl: 0, energyJ: 0, scrubberSeconds: 0 });
}

export function validLifeSupportOperation(value: unknown): value is LifeSupportOperation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const op = value as Record<string, unknown>;
  return op.kind === "service" ? Object.keys(op).length === 1
    : ["socket", "refill"].includes(String(op.kind)) && Object.keys(op).length === 2 && Number.isInteger(op.index)
      && Number(op.index) >= (op.kind === "refill" ? -1 : 0) && Number(op.index) <= 1;
}

/** Virgin sealed supplies have finite factory contents; wearable tanks/rigs start empty.
 * Explicit zero survives every normalization; an exhausted item is never recharged. */
export function lifeSupportStore(slot: InventorySlot): LifeSupportStore {
  const cap = gearCapacity(slot.item), raw = slot.metadata?.lifeSupport;
  const fresh = raw === undefined;
  const value = raw && typeof raw === "object" && !Array.isArray(raw) && (raw as { schema?: unknown }).schema === 1 ? raw as Record<string, unknown> : {};
  const sockets = Array.isArray(value.sockets) ? value.sockets : [];
  return { schema: 1, oxygenMl: bounded(value.oxygenMl, cap.oxygenMl, fresh && slot.item === Item.FieldOxygenReserve ? cap.oxygenMl : 0),
    energyJ: bounded(value.energyJ, cap.energyJ, fresh && slot.item === Item.EvaPowerCell ? cap.energyJ : 0),
    scrubberSeconds: bounded(value.scrubberSeconds, cap.scrubberSeconds, fresh && slot.item === Item.ScrubberCartridge ? cap.scrubberSeconds : 0),
    leak: bounded(value.leak, 3), sockets: Array.from({ length: cap.sockets }, (_, i) => {
      const tank = sockets[i] as InventorySlot | null;
      return isOxygenTank(tank) ? { ...cloneSlot(tank)!, metadata: { ...tank!.metadata, lifeSupport: { ...lifeSupportStore(tank!), sockets: [] } } } : null;
    }) };
}
export function withLifeSupport(slot: InventorySlot, store: LifeSupportStore): InventorySlot {
  return { ...cloneSlot(slot)!, metadata: { ...slot.metadata, lifeSupport: store } };
}
export function sourceOxygen(slot: InventorySlot | null | undefined): { amount: number; capacity: number } {
  if (!slot) return { amount: 0, capacity: 0 };
  const state = lifeSupportStore(slot), cap = gearCapacity(slot.item);
  return state.sockets.reduce((total, tank) => {
    const part = sourceOxygen(tank); return { amount: total.amount + part.amount, capacity: total.capacity + part.capacity };
  }, { amount: state.oxygenMl, capacity: cap.oxygenMl });
}
function drawOxygen(slot: InventorySlot, requestedMl: number): { slot: InventorySlot; used: number } {
  const state = lifeSupportStore(slot); let remaining = Math.max(0, requestedMl);
  const own = Math.min(state.oxygenMl, remaining); state.oxygenMl -= own; remaining -= own;
  state.sockets = state.sockets.map(tank => {
    if (!tank || remaining <= 0) return tank;
    const draw = drawOxygen(tank, remaining); remaining -= draw.used; return draw.slot;
  });
  return { slot: withLifeSupport(slot, state), used: requestedMl - remaining };
}

export type LifeSupportOperation = { kind: "socket"; index: number } | { kind: "refill"; index: number } | { kind: "service" };
/** Cursor is an actual item, not a requested count. Failure never mutates either owner. */
export function operateLifeSupport(back: InventorySlot | null | undefined, cursor: InventorySlot | null, operation: LifeSupportOperation) {
  const fail = (reason: string) => ({ ok: false as const, reason, back: back ?? null, cursor, transferred: 0 });
  if (!back || back.count !== 1 || !ITEMS[back.item]?.lifeSupportKind) return fail("Equip a compatible back unit first.");
  const state = lifeSupportStore(back), cap = gearCapacity(back.item);
  if (operation.kind === "socket") {
    if (!Number.isInteger(operation.index) || operation.index < 0 || operation.index >= cap.sockets || cursor && !isOxygenTank(cursor)) return fail("This socket accepts one O2 tank.");
    const previous = state.sockets[operation.index]; state.sockets[operation.index] = cloneSlot(cursor);
    return { ok: true as const, reason: "Tank socket exchanged.", back: withLifeSupport(back, state), cursor: previous, transferred: 0 };
  }
  if (!cursor || cursor.count !== 1) return fail("Carry a finite supply on the inventory cursor.");
  const supply = lifeSupportStore(cursor); let transferred = 0;
  if (operation.kind === "refill") {
    if (cursor.item !== Item.FieldOxygenReserve) return fail("Carry a Sealed Field O2 Reserve to transfer oxygen.");
    const target = operation.index === -1 ? back : state.sockets[operation.index];
    if (!target || operation.index < -1 || operation.index >= cap.sockets || !Number.isInteger(operation.index)) return fail("No tank in that socket.");
    const targetState = operation.index === -1 ? state : lifeSupportStore(target);
    transferred = Math.min(supply.oxygenMl, Math.max(0, gearCapacity(target.item).oxygenMl - targetState.oxygenMl), 120_000);
    if (!transferred) return fail("The tank is full or the reserve is empty.");
    supply.oxygenMl -= transferred; targetState.oxygenMl += transferred;
    if (operation.index !== -1) state.sockets[operation.index] = withLifeSupport(target, targetState);
  } else if (cursor.item === Item.EvaPowerCell) {
    transferred = Math.min(supply.energyJ, cap.energyJ - state.energyJ);
    if (transferred <= 0) return fail("No compatible empty battery capacity.");
    supply.energyJ -= transferred; state.energyJ += transferred;
  } else if (cursor.item === Item.ScrubberCartridge) {
    transferred = Math.min(supply.scrubberSeconds, cap.scrubberSeconds - state.scrubberSeconds);
    if (transferred <= 0) return fail("No compatible spent scrubber capacity.");
    supply.scrubberSeconds -= transferred; state.scrubberSeconds += transferred;
  } else return fail("Carry a finite power cell or scrubber cartridge.");
  return { ok: true as const, reason: operation.kind === "refill" ? `${(transferred / 1000).toFixed(0)} L O2 transferred.` : "Finite supply transferred.", back: withLifeSupport(back, state), cursor: withLifeSupport(cursor, supply), transferred };
}

export function normalizeLifeSupportState(value: unknown): LifeSupportState {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.keys(EMPTY_LIFE_SUPPORT).map(key => [key, bounded(raw[key], 86400)])) as LifeSupportState;
}
export function stepLifeSupport(equipment: PersonalEquipment, previous: LifeSupportState, environment: BodyEnvironment, dt: number,
  input: { submerged?: boolean; effort?: number; immune?: boolean; consume?: boolean; swapSeconds?: number } = {}) {
  dt = bounded(dt, 1); const state = { ...previous }, back = equipment.back, kind = back ? ITEMS[back.item]?.lifeSupportKind : undefined;
  const needsAir = !environment.breathable || Boolean(input.submerged);
  // Keep the saved exposure timer and damage arithmetic unchanged, but do not
  // label an oxygen-rich, unscrubbed habitat as oxygen deprivation. The host's
  // breathable flag remains authoritative; this only explains a denied breath.
  const oxygenKPa = environment.pressureKPa * environment.oxygenFraction;
  const co2Exposure = !environment.breathable && !input.submerged && oxygenKPa >= 16 && oxygenKPa <= 30
    && Math.floor(environment.co2Fraction * 1_000_000) > AIRZONE_MAX_CO2_PPM;
  const helmet = equipment.head?.item === Item.FieldBreatherHelmet && (equipment.head.durability ?? 1) > 0;
  const compatible = ["tank", "harness", "rig", "spell-rig", "dive"].includes(kind ?? "") && !(environment.pressureKPa < 35 && kind === "dive");
  const store = back ? lifeSupportStore(back) : null;
  const source = compatible ? sourceOxygen(back) : { amount: 0, capacity: 0 };
  const swapping = (input.swapSeconds ?? 0) > 0;
  const sealed = helmet && compatible && !swapping;
  const helmetWear = helmet ? 1 - (equipment.head!.durability ?? ITEMS[Item.FieldBreatherHelmet].maxDurability!) / ITEMS[Item.FieldBreatherHelmet].maxDurability! : 0;
  const leak = Math.max(store?.leak ?? 0, Math.max(0, helmetWear) * .5);
  const drawPerSecond = 1000 * (1 + bounded(input.effort, 1) * .5) * (1 + leak);
  const hasScrubber = (store?.scrubberSeconds ?? 0) > 0;
  const scrubberFraction = hasScrubber ? dt > 0 ? Math.min(1, store!.scrubberSeconds / dt) : 1 : 0;
  const drawRate = drawPerSecond * (1 - .35 * scrubberFraction);
  const breathing = !needsAir || sealed && source.amount >= drawRate * dt && source.amount > 0;
  let nextEquipment = equipment;
  if (needsAir && sealed && back && !input.immune && input.consume !== false && source.amount > 0) {
    const draw = drawOxygen(back, drawRate * dt), next = lifeSupportStore(draw.slot);
    next.scrubberSeconds = Math.max(0, next.scrubberSeconds - dt);
    nextEquipment = { ...equipment, back: withLifeSupport(draw.slot, next) };
  }
  state.hypoxiaSeconds = breathing ? Math.max(0, state.hypoxiaSeconds - dt * 3) : state.hypoxiaSeconds + dt;
  const weave = [equipment.chest, equipment.legs, equipment.feet].filter(s => s && ["weave", "boots"].includes(ITEMS[s.item]?.lifeSupportKind ?? "") && (s.durability ?? 1) > 0).length / 3;
  const thermalRisk = environment.temperatureC[0] < -40 || environment.temperatureC[1] > 60;
  state.pressureSeconds = environment.requiresPressureSuit && !(sealed && weave === 1) ? state.pressureSeconds + dt : Math.max(0, state.pressureSeconds - dt * 3);
  state.thermalDose = thermalRisk ? state.thermalDose + dt * (1 - weave) : Math.max(0, state.thermalDose - dt);
  state.corrosionDose = environment.corrosive ? state.corrosionDose + dt * (1 - weave) : Math.max(0, state.corrosionDose - dt);
  state.radiationDose += Math.max(0, environment.radiation - 1) * dt * (1 - weave * .9) / 30;
  for (const key of Object.keys(state) as Array<keyof LifeSupportState>) state[key] = bounded(state[key], 86400);
  const hazards: string[] = [];
  if (state.hypoxiaSeconds > 12) hazards.push(co2Exposure ? "CO2" : "HYPOXIA");
  if (state.pressureSeconds > (sealed ? 60 : 12)) hazards.push("PRESSURE");
  if (state.thermalDose > 90) hazards.push("TEMPERATURE");
  if (state.corrosionDose > 45) hazards.push("CORROSION");
  if (state.radiationDose > 120) hazards.push("RADIATION");
  let damage = 0;
  if (hazards.length && !input.immune) { state.damageAccumulator += dt * Math.min(3, hazards.length) / 2; damage = Math.floor(state.damageAccumulator); state.damageAccumulator -= damage; }
  else state.damageAccumulator = 0;
  const remaining = sourceOxygen(nextEquipment.back);
  const secondsRemaining = remaining.amount / drawRate;
  // Oxygen delivery alone does not make an incomplete suit safe in vacuum.
  // Warn immediately, before accumulated pressure/thermal exposure causes harm.
  const pressureUnprotected = environment.requiresPressureSuit && !(sealed && weave === 1);
  const level = needsAir && !breathing || pressureUnprotected || hazards.length > 0 ? "danger"
    : needsAir && secondsRemaining < 30 ? "critical" : needsAir && secondsRemaining < 90 ? "low" : "safe";
  const hud: LifeSupportHud = { relevant: needsAir || Boolean(back && kind) || hazards.length > 0, source: back ? ITEMS[back.item].name : "No back source",
    oxygenLiters: remaining.amount / 1000, capacityLiters: remaining.capacity / 1000, secondsRemaining, sealed, breathing,
    scrubber: hasScrubber ? `${Math.ceil(store!.scrubberSeconds)}s` : "open cycle", leak, level,
    status: swapping ? "SWAPPING - SEAL OPEN" : co2Exposure && !breathing ? "CO2 HIGH - SCRUB OR USE SEALED O2"
      : needsAir && !helmet ? "SEALED HELMET REQUIRED" : needsAir && !compatible ? "COMPATIBLE BACK SOURCE REQUIRED" : needsAir && source.amount <= 0 ? "OXYGEN EMPTY"
      : pressureUnprotected ? "PRESSURE SUIT INCOMPLETE" : hazards.length ? `${hazards[0]} EXPOSURE` : breathing ? "BREATHING" : "HOLDING BREATH",
    hazards, energyJ: store?.energyJ ?? 0, swapSeconds: input.swapSeconds ?? 0 };
  return { equipment: nextEquipment, state, hud, damage, impairment: !input.immune && state.hypoxiaSeconds > 6 ? .55 : 1 };
}

/** Finite gas plus battery, including the magical rig. Creative still reports use. */
export function maneuverImpulse(back: InventorySlot | null | undefined, seconds: number, submerged = false, immune = false) {
  if (!back || !["rig", "spell-rig", ...(submerged ? ["dive"] : [])].includes(ITEMS[back.item]?.lifeSupportKind ?? "")) return { back: back ?? null, acceleration: 0 };
  const state = lifeSupportStore(back), dt = bounded(seconds, 1), gas = sourceOxygen(back);
  const fraction = Math.min(1, state.energyJ / Math.max(1, dt * 100), gas.amount / Math.max(1, dt * 200));
  if (immune) return { back, acceleration: 3.8 };
  if (fraction <= 0) return { back, acceleration: 0 };
  const draw = drawOxygen(back, dt * 200 * fraction), next = lifeSupportStore(draw.slot);
  next.energyJ = Math.max(0, next.energyJ - dt * 100 * fraction);
  return { back: withLifeSupport(draw.slot, next), acceleration: 3.8 * fraction };
}

export type EvaTether = { anchor: [number, number, number]; length: number };
export function constrainTether(position: readonly number[], velocity: readonly number[], tether: EvaTether, dt: number, reel: boolean) {
  const length = Math.max(1.5, tether.length - (reel ? Math.max(0, dt) * 2 : 0));
  const offset = position.map((n, i) => n - tether.anchor[i]), distance = Math.hypot(...offset);
  if (distance <= length) return { position: [...position], velocity: [...velocity], tether: { ...tether, length }, taut: false };
  const normal = offset.map(n => n / distance), outward = velocity.reduce((s, n, i) => s + n * normal[i], 0);
  return { position: normal.map((n, i) => tether.anchor[i] + n * length), velocity: velocity.map((n, i) => n - Math.max(0, outward) * normal[i]), tether: { ...tether, length }, taut: true };
}
