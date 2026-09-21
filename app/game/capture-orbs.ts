import { Item, ITEMS, type InventorySlot, type ItemCode } from "./data";
import {
  canCaptureCreature,
  cloneCreatureMetadata,
  decodeCapturedCreature,
  encodeCapturedCreature,
  normalizeCreatureMetadata,
  type CreatureMetadata,
} from "./creature-cage";
import type { CaptureLensId } from "./creature-capture";
import { canAttuneCreature, creatureRelationshipPolicy, markCreatureCaptured } from "./creature-relationships";
import { MOB_DEFS, type MobKind } from "./mobs";

export const CAPTURE_ORB_RACK_SIZE = 8;
export const CREATURE_HEALER_SIZE = 4;
export const ORB_RACK_CONTAINER_KIND = "orb-rack" as const;
export const HEALING_STATION_CONTAINER_KIND = "healing-station" as const;
export const CREATURE_HEAL_INTERVAL_SECONDS = 20;
export const CREATURE_HEALER_GEL_CAP = 64;
export const CREATURE_HEALER_GEL_SECONDS = 10 * 60;
export const CREATURE_HEALER_GEL_MULTIPLIER = 10;
export const LEGACY_LENS_ORB_ITEMS = Object.freeze([
  Item.GentleLensOrb,
  Item.GloamLensOrb,
  Item.TideLensOrb,
  Item.ResonanceLensOrb,
] as readonly ItemCode[]);
export const LEGACY_SPECIES_ORB_ITEMS = Object.freeze([
  Item.GlimmerhartOrb,
  Item.RuneowlOrb,
  Item.CopperScoutOrb,
  Item.StoneBulwarkOrb,
  Item.AetherforgedSentinelOrb,
  Item.CopperMoleOrb,
  Item.DeepgearCourserOrb,
  Item.ClockworkHoundOrb,
  Item.WebspinnerOrb,
] as readonly ItemCode[]);

let legacySpeciesOrbSerial = 0;

function legacySpeciesOrb(slot: InventorySlot): CaptureOrb | null {
  if (!LEGACY_SPECIES_ORB_ITEMS.includes(slot.item) || slot.count !== 1) return null;
  const creatureKind = ITEMS[slot.item]?.creatureKind;
  if (!creatureKind || !(creatureKind in MOB_DEFS)) return null;
  const kind = creatureKind as MobKind;
  const definition = MOB_DEFS[kind];
  const commissioned = creatureRelationshipPolicy(kind).mode === "commission";
  legacySpeciesOrbSerial += 1;
  const serial = legacySpeciesOrbSerial.toString(36);
  const entityId = `legacy-stock:${kind}:${Date.now().toString(36)}:${serial}`;
  return captureIntoOrb(createEmptyCaptureOrb(`legacy-orb:${entityId}`), {
    schema: 1,
    entityId,
    kind,
    health: definition.health,
    maxHealth: definition.health,
    ageTicks: 24_000,
    baby: false,
    temperament: definition.temperament,
    hostile: false,
    tamed: commissioned,
    ownerId: null,
    name: null,
    geneticSeed: Math.imul(Date.now() | 0, 0x9e3779b1) >>> 0,
    command: commissioned ? "follow" : null,
    factionId: null,
    settlementId: null,
    aligned: false,
    custom: {},
  }, Date.now(), "legacy-migration");
}

export type CaptureOrbAttunement = Readonly<{
  ownerId: string;
  attunedAt: number;
  activeEntityId: string | null;
  recalledAt: number;
  recallCount: number;
  fainted: boolean;
}>;

export type CaptureOrb = Readonly<{
  schema: 1;
  orbId: string;
  capturedAt: number;
  creature: CreatureMetadata | null;
  /** Fitted lenses alter valid ecological approaches, never hidden odds. */
  lens?: CaptureLensId | null;
  /** An attuned orb remains linked while its creature is deployed. */
  attunement?: CaptureOrbAttunement | null;
}>;

export type OrbRackState = Readonly<{
  schema: 1;
  slots: readonly (CaptureOrb | null)[];
}>;

export type CreatureHealerState = Readonly<{
  schema: 1;
  slots: readonly (CaptureOrb | null)[];
  /** Buffered whole Cave Gel units not yet loaded into the active chamber. */
  gelUnits: number;
  /** Active-healing seconds remaining in the currently loaded Gel unit. */
  gelFuelSeconds: number;
  healClock: number;
  healCycles: number;
}>;

export const createEmptyCaptureOrb = (orbId: string): CaptureOrb => ({
  schema: 1,
  orbId: orbId.trim().slice(0, 80) || "orb",
  capturedAt: 0,
  creature: null,
  lens: null,
  attunement: null,
});

export function fitCaptureOrbLens(orb: CaptureOrb, lens: CaptureLensId | null): CaptureOrb | null {
  if (orb.creature || orb.attunement?.activeEntityId) return null;
  // Decode-only compatibility surface. New play has one normal orb and no lens
  // fitting step; explicitly removing an old lens remains harmless.
  return lens === null ? { ...orb, lens: null } : null;
}

export function captureIntoOrb(
  orb: CaptureOrb,
  creature: CreatureMetadata,
  capturedAt = Date.now(),
  captorId = creature.ownerId ?? "unclaimed",
): CaptureOrb | null {
  if (orb.creature || !canCaptureCreature(creature)) return null;
  return {
    ...orb,
    capturedAt,
    creature: markCreatureCaptured(cloneCreatureMetadata(creature), captorId, capturedAt),
    lens: null,
    attunement: null,
  };
}

export function releaseCaptureOrb(orb: CaptureOrb): { orb: CaptureOrb; creature: CreatureMetadata } | null {
  if (!orb.creature) return null;
  return {
    orb: { ...orb, capturedAt: 0, creature: null, attunement: null },
    creature: cloneCreatureMetadata(orb.creature),
  };
}

const cleanOwnerId = (ownerId: string) => ownerId.trim().slice(0, 160);

export function attuneCaptureOrb(orb: CaptureOrb, ownerId: string, attunedAt = Date.now()): CaptureOrb | null {
  const owner = cleanOwnerId(ownerId);
  if (!orb.creature || !owner || orb.attunement?.activeEntityId || orb.creature.health <= 0 || !canAttuneCreature(orb.creature)) return null;
  if (orb.attunement && orb.attunement.ownerId !== owner) return null;
  return {
    ...orb,
    attunement: {
      ownerId: owner,
      attunedAt: Math.max(0, Number.isFinite(attunedAt) ? attunedAt : 0),
      activeEntityId: null,
      recalledAt: orb.attunement?.recalledAt ?? 0,
      recallCount: orb.attunement?.recallCount ?? 0,
      fainted: false,
    },
  };
}

export function unattuneCaptureOrb(orb: CaptureOrb, ownerId: string): CaptureOrb | null {
  const attunement = orb.attunement;
  if (!attunement || attunement.ownerId !== cleanOwnerId(ownerId) || attunement.activeEntityId || attunement.fainted
    || !orb.creature || orb.creature.health <= 0) return null;
  return { ...orb, attunement: null };
}

export type AttunedOrbDeployment = Readonly<{ orb: CaptureOrb; creature: CreatureMetadata }>;

/** Deploys an attuned creature without emptying its linked orb. */
export function deployAttunedCaptureOrb(orb: CaptureOrb, ownerId: string): AttunedOrbDeployment | null {
  const attunement = orb.attunement;
  if (!orb.creature || !attunement || attunement.ownerId !== cleanOwnerId(ownerId) || attunement.activeEntityId
    || attunement.fainted || orb.creature.health <= 0 || !canAttuneCreature(orb.creature)) return null;
  const creature = cloneCreatureMetadata(orb.creature);
  creature.ownerId = ownerId;
  creature.custom = { ...creature.custom, attunedOrbId: orb.orbId };
  return {
    creature,
    orb: { ...orb, attunement: { ...attunement, activeEntityId: creature.entityId } },
  };
}

export type AttunedRecallReason = "manual" | "fainted";
export type AttunedRecallEffect = Readonly<{
  tint: "white";
  sparkleColor: "#f6fbff";
  particleCount: number;
  durationSeconds: number;
}>;

/** Returns the current exact creature state to its orb and describes the shared
 * recall visual. The runtime supplies its committed live body ID separately;
 * pure deployment previews still use the default permanent specimen ID. Neither
 * path may replace the stored specimen, species or genetic identity. */
export function recallAttunedCreature(
  orb: CaptureOrb,
  creature: CreatureMetadata,
  ownerId: string,
  reason: AttunedRecallReason = "manual",
  recalledAt = Date.now(),
  activeEntityId = creature.entityId,
): Readonly<{ orb: CaptureOrb; effect: AttunedRecallEffect }> | null {
  const attunement = orb.attunement;
  if (!attunement || attunement.ownerId !== cleanOwnerId(ownerId) || !attunement.activeEntityId
    || attunement.activeEntityId !== activeEntityId || !orb.creature || orb.creature.entityId !== creature.entityId
    || orb.creature.kind !== creature.kind || orb.creature.geneticSeed !== creature.geneticSeed) return null;
  const stored = cloneCreatureMetadata(creature);
  stored.custom = { ...stored.custom, attunedOrbId: orb.orbId };
  if (reason === "fainted") stored.health = 0;
  const fainted = reason === "fainted" || stored.health <= 0;
  return {
    orb: {
      ...orb,
      creature: stored,
      capturedAt: Math.max(0, Number.isFinite(recalledAt) ? recalledAt : 0),
      attunement: {
        ...attunement,
        activeEntityId: null,
        recalledAt: Math.max(0, Number.isFinite(recalledAt) ? recalledAt : 0),
        recallCount: attunement.recallCount + 1,
        fainted,
      },
    },
    effect: { tint: "white", sparkleColor: "#f6fbff", particleCount: 28, durationSeconds: 0.72 },
  };
}

export function refreshAttunedOrbHealth(orb: CaptureOrb): CaptureOrb {
  if (!orb.creature || !orb.attunement) return orb;
  const fainted = orb.creature.health <= 0;
  return fainted === orb.attunement.fainted ? orb : { ...orb, attunement: { ...orb.attunement, fainted } };
}

export function encodeCaptureOrb(orb: CaptureOrb) {
  return JSON.stringify(orb);
}

export function decodeCaptureOrb(value: string): CaptureOrb | null {
  try {
    const parsed = JSON.parse(value) as Partial<CaptureOrb>;
    if (parsed.schema !== 1 || typeof parsed.orbId !== "string" || parsed.orbId.length === 0 || parsed.orbId.length > 80
      || typeof parsed.capturedAt !== "number" || !Number.isFinite(parsed.capturedAt) || parsed.capturedAt < 0) return null;
    if (parsed.creature === null) {
      const lens = (parsed as Partial<CaptureOrb>).lens;
      if (lens !== undefined && lens !== null && !["gentle", "gloam", "tide", "resonance"].includes(lens)) return null;
      return createEmptyCaptureOrb(parsed.orbId);
    }
    const creature = normalizeCreatureMetadata(parsed.creature);
    if (!creature) return null;
    const rawAttunement = (parsed as Partial<CaptureOrb>).attunement;
    let attunement: CaptureOrbAttunement | null = null;
    if (rawAttunement !== undefined && rawAttunement !== null) {
      if (typeof rawAttunement !== "object" || typeof rawAttunement.ownerId !== "string" || rawAttunement.ownerId.length === 0
        || rawAttunement.ownerId.length > 160 || typeof rawAttunement.attunedAt !== "number" || !Number.isFinite(rawAttunement.attunedAt)
        || typeof rawAttunement.recalledAt !== "number" || !Number.isFinite(rawAttunement.recalledAt)
        || typeof rawAttunement.recallCount !== "number" || !Number.isFinite(rawAttunement.recallCount)
        || (rawAttunement.activeEntityId !== null && (typeof rawAttunement.activeEntityId !== "string" || rawAttunement.activeEntityId.length > 160))
        || typeof rawAttunement.fainted !== "boolean") return null;
      attunement = {
        ownerId: rawAttunement.ownerId,
        attunedAt: Math.max(0, rawAttunement.attunedAt),
        activeEntityId: rawAttunement.activeEntityId,
        recalledAt: Math.max(0, rawAttunement.recalledAt),
        recallCount: Math.max(0, Math.floor(rawAttunement.recallCount)),
        fainted: rawAttunement.fainted || creature.health <= 0,
      };
    }
    const lens = (parsed as Partial<CaptureOrb>).lens;
    if (lens !== undefined && lens !== null && !["gentle", "gloam", "tide", "resonance"].includes(lens)) return null;
    return { schema: 1, orbId: parsed.orbId, capturedAt: parsed.capturedAt, creature, lens: null, attunement };
  } catch {
    return null;
  }
}

export function captureOrbInventorySlot(orb: CaptureOrb): InventorySlot {
  const creature = orb.creature;
  // A plain empty shell has no identity-bearing state and always rejoins the
  // one canonical crafted stack. Legacy lens state is discarded on write.
  if (!creature && !orb.attunement) return { item: Item.CaptureOrb, count: 1 };
  return {
    item: Item.CaptureOrb,
    count: 1,
    metadata: {
      captureOrb: encodeCaptureOrb(orb),
      // The engine's former cage payload is retained during the save migration.
      ...(creature ? { capturedCreature: encodeCapturedCreature({ schema: 1, cageId: orb.orbId, capturedAt: orb.capturedAt, creature: cloneCreatureMetadata(creature) }) } : {}),
      ...(creature ? {
        name: creature.name,
        species: creature.kind,
        tamed: creature.tamed,
        baby: creature.baby,
        health: creature.health,
        maxHealth: creature.maxHealth,
        attuned: Boolean(orb.attunement),
        ...(orb.attunement ? { attunedOwnerId: orb.attunement.ownerId } : {}),
        deployed: Boolean(orb.attunement?.activeEntityId),
        fainted: Boolean(orb.attunement?.fainted || creature.health <= 0),
      } : {}),
    },
  };
}

export function captureOrbFromInventorySlot(slot: InventorySlot | null | undefined) {
  if (!slot || slot.count !== 1) return null;
  const legacyLens = LEGACY_LENS_ORB_ITEMS.includes(slot.item);
  const legacySpecies = LEGACY_SPECIES_ORB_ITEMS.includes(slot.item);
  if (slot.item !== Item.CaptureOrb && slot.item !== Item.LegacyCaptureOrb && !legacyLens && !legacySpecies) return null;
  if (typeof slot.metadata?.captureOrb === "string") return decodeCaptureOrb(slot.metadata.captureOrb);
  if (typeof slot.metadata?.capturedCreature === "string") {
    const legacy = decodeCapturedCreature(slot.metadata.capturedCreature);
    if (legacy) return {
      schema: 1 as const,
      orbId: legacy.cageId,
      capturedAt: legacy.capturedAt,
      creature: cloneCreatureMetadata(legacy.creature),
    };
  }
  if (legacySpecies) return legacySpeciesOrb(slot);
  return createEmptyCaptureOrb(`orb-${slot.item}`);
}

/** Normalizes old cages, id 178, retired lenses, and species stock into id 156. */
export function migrateCaptureOrbInventorySlot(slot: InventorySlot): InventorySlot {
  if (LEGACY_LENS_ORB_ITEMS.includes(slot.item) && !slot.metadata?.captureOrb && !slot.metadata?.capturedCreature) {
    // A second normal shell is the compact, idempotent compensation for the
    // retired lens materials. It stays in one stack and cannot duplicate on
    // reload because the item id is canonical after this write.
    return { item: Item.CaptureOrb, count: Math.max(1, Math.min(ITEMS[Item.CaptureOrb]?.maxStack ?? 16, slot.count * 2)) };
  }
  const orb = captureOrbFromInventorySlot(slot);
  return orb ? captureOrbInventorySlot(orb) : slot;
}

export function createOrbRack(slots: readonly (CaptureOrb | null)[] = []): OrbRackState {
  return {
    schema: 1,
    slots: Array.from({ length: CAPTURE_ORB_RACK_SIZE }, (_, index) => slots[index] ?? null),
  };
}

export function orbRackContainerStatus(state: OrbRackState) {
  return { kind: ORB_RACK_CONTAINER_KIND, capacity: CAPTURE_ORB_RACK_SIZE, occupied: state.slots.filter(Boolean).length, slots: state.slots } as const;
}

export function setRackOrb(state: OrbRackState, index: number, orb: CaptureOrb | null): OrbRackState {
  if (!Number.isInteger(index) || index < 0 || index >= CAPTURE_ORB_RACK_SIZE) return state;
  const slots = [...state.slots];
  slots[index] = orb;
  return { ...state, slots };
}

export function createCreatureHealer(slots: readonly (CaptureOrb | null)[] = [], gelUnits = 0, gelFuelSeconds = 0): CreatureHealerState {
  return {
    schema: 1,
    slots: Array.from({ length: CREATURE_HEALER_SIZE }, (_, index) => slots[index] ?? null),
    gelUnits: Math.max(0, Math.min(CREATURE_HEALER_GEL_CAP, Math.floor(gelUnits))),
    gelFuelSeconds: Math.max(0, Math.min(CREATURE_HEALER_GEL_SECONDS, Number(gelFuelSeconds) || 0)),
    healClock: 0,
    healCycles: 0,
  };
}

export function setHealerOrb(state: CreatureHealerState, index: number, orb: CaptureOrb | null): CreatureHealerState {
  if (!Number.isInteger(index) || index < 0 || index >= CREATURE_HEALER_SIZE) return state;
  const slots = [...state.slots];
  slots[index] = orb;
  return { ...state, slots };
}

/**
 * Every deposited creature heals once per twenty seconds. A loaded Cave Gel
 * makes that same pulse ten times stronger for every wounded creature. One Gel
 * lasts for ten minutes of active healing and pauses, along with the pulse
 * clock, whenever all stored creatures are healthy.
 */
export function stepCreatureHealer(state: CreatureHealerState, deltaSeconds: number): { state: CreatureHealerState; healed: number; gelUsed: number } {
  let remaining = Math.max(0, Math.min(3600, deltaSeconds));
  let healClock = Math.max(0, Math.min(CREATURE_HEAL_INTERVAL_SECONDS, state.healClock));
  let gelUnits = state.gelUnits;
  let gelFuelSeconds = Math.max(0, Math.min(CREATURE_HEALER_GEL_SECONDS, state.gelFuelSeconds));
  const slots = [...state.slots];
  let healed = 0;
  let gelUsed = 0;
  let healCycles = state.healCycles;
  let iterations = 0;
  const hasWoundedCreature = () => slots.some((orb) => Boolean(orb?.creature && orb.creature.health < orb.creature.maxHealth));
  while (remaining > 1e-6 && hasWoundedCreature() && iterations < 720) {
    iterations += 1;
    if (gelFuelSeconds <= 1e-6 && gelUnits > 0) {
      gelUnits -= 1;
      gelUsed += 1;
      gelFuelSeconds = CREATURE_HEALER_GEL_SECONDS;
    }
    const timeToPulse = Math.max(1e-6, CREATURE_HEAL_INTERVAL_SECONDS - healClock);
    const segment = Math.min(remaining, timeToPulse, gelFuelSeconds > 1e-6 ? gelFuelSeconds : remaining);
    const pulseFueled = gelFuelSeconds > 1e-6 && segment >= timeToPulse - 1e-6;
    healClock += segment;
    remaining -= segment;
    if (gelFuelSeconds > 1e-6) gelFuelSeconds = Math.max(0, gelFuelSeconds - segment);
    if (healClock < CREATURE_HEAL_INTERVAL_SECONDS - 1e-6) continue;
    healClock = 0;
    healCycles += 1;
    const strength = pulseFueled ? CREATURE_HEALER_GEL_MULTIPLIER : 1;
    for (let index = 0; index < slots.length; index += 1) {
      const orb = slots[index];
      if (!orb?.creature || orb.creature.health >= orb.creature.maxHealth) continue;
      const creature = cloneCreatureMetadata(orb.creature);
      const previousHealth = creature.health;
      creature.health = Math.min(creature.maxHealth, creature.health + strength);
      slots[index] = refreshAttunedOrbHealth({ ...orb, creature });
      healed += creature.health - previousHealth;
    }
  }
  return { state: { ...state, slots, gelUnits, gelFuelSeconds, healClock, healCycles }, healed, gelUsed };
}

export function healingStationContainerStatus(state: CreatureHealerState) {
  return {
    kind: HEALING_STATION_CONTAINER_KIND,
    capacity: CREATURE_HEALER_SIZE,
    gelUnits: state.gelUnits,
    gelFuelSeconds: state.gelFuelSeconds,
    fuelActive: state.gelFuelSeconds > 0,
    bufferedHealingSeconds: state.gelFuelSeconds + state.gelUnits * CREATURE_HEALER_GEL_SECONDS,
    progress: state.healClock / CREATURE_HEAL_INTERVAL_SECONDS,
    slots: state.slots.map((orb) => orb?.creature ? {
      orbId: orb.orbId,
      kind: orb.creature.kind,
      name: orb.creature.name,
      health: orb.creature.health,
      maxHealth: orb.creature.maxHealth,
      healing: orb.creature.health < orb.creature.maxHealth,
    } : null),
  } as const;
}
