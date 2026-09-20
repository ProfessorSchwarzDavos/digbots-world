import { BlockId, Item } from "./data";
import type { AirZoneState } from "./airzone";
import type { MorrowRegion } from "./celestial-terrain";
import type { MobDefinition } from "./mobs";

export const MORROW_MOB_KINDS = ["rillehopper", "vacuum-lantern", "slatefin-burrower", "morrow-owl"] as const;
export type MorrowMobKind = typeof MORROW_MOB_KINDS[number];
/** One shared lunar surface budget, including shallow regolith swimmers and roosting visitors. */
export const MORROW_NATURAL_POOL = "surface-animal" as const;
export function isMorrowMobKind(kind: string): kind is MorrowMobKind {
  return (MORROW_MOB_KINDS as readonly string[]).includes(kind);
}
/** The native three have closed bodies. The migrant Owl must spend a finite veil. */
export function isSealedMorrowNative(kind: string): boolean {
  return kind === "rillehopper" || kind === "vacuum-lantern" || kind === "slatefin-burrower";
}

export const MORROW_MOB_DEFS: Record<MorrowMobKind, MobDefinition> = {
  rillehopper: {
    kind: "rillehopper", name: "Rillehopper", temperament: "Skittish", hostile: false,
    health: 24, damage: 2, xp: 8, speed: 1.1, chaseSpeed: 2.5, turnRate: 3.4, attackRange: 1.1,
    footOffset: .5, radius: .69, height: .94,
    habitat: "Morrow: Pale Regolith Sea and mineral-frost banks in Ice-Lantern Rilles", active: "Day and dusk",
    behavior: "A plump low-gravity grazer with four feet that land in sequence. Approaches offered mineral frost and bounds away from danger.",
    lore: "Its closed, frost-fed body keeps a little warmth beneath a powder-soft grey-green hide.",
    colors: [0xa9b9a7, 0xdce7d2, 0x55777c], drops: [{ item: BlockId.MineralFrost, min: 1, max: 2, chance: .65 }],
    family: "surface", movement: "ground", aquatic: false, flying: false, sentient: false,
    tameable: true, tameItems: [BlockId.MineralFrost], breedable: true, breedingFoods: [BlockId.MineralFrost],
    diet: [BlockId.MineralFrost], foodLure: true, captureItem: Item.CaptureOrb,
    postTameNotes: "Keep mineral frost for feeding and leave a broad, level area for its low-gravity bounds.",
    discoveryHint: "Look for four staggered footprints beside pale frost banks.",
    fieldNotes: [{ id: "morrow-frost-diet", title: "Mineral Grazer", text: "Mineral frost is its food. The sealed native body does not draw oxygen from a room.",
      hint: "Observe a Rillehopper.", requires: [{ metric: "seen", atLeast: 1 }] }],
  },
  "vacuum-lantern": {
    kind: "vacuum-lantern", name: "Vacuum Lantern", temperament: "Gentle", hostile: false,
    health: 12, damage: 0, xp: 6, speed: .34, chaseSpeed: .8, turnRate: 2.2, attackRange: .5,
    footOffset: .5, radius: .33, height: .84,
    habitat: "Morrow: Ice-Lantern Rilles, Starshadow Craters and Buried Waystone Galleries", active: "Night; especially visible after dusk",
    behavior: "Creeps on small feet beneath a hard shell. A sealed bioluminescent chamber glows through its translucent panels.",
    lore: "Prospectors mistake its quiet glow for a distant shelter until the light moves.",
    colors: [0x506b73, 0x9ae9d0, 0xe3ffba], drops: [{ item: Item.GlowDust, min: 1, max: 1, chance: .5 }],
    family: "surface", movement: "ground", aquatic: false, flying: false, sentient: false,
    tameable: false, breedable: false, diet: [BlockId.MineralFrost], captureItem: Item.SpecimenJar,
    discoveryHint: "Follow the low green lights along a rille after dusk.",
    fieldNotes: [{ id: "morrow-lantern-capture", title: "Pressure-Enclosure Capture",
      text: "Use a Sealed Specimen Jar only when you and the Lantern occupy the same known sealed, safely breathable enclosure. A sealed label without safe air is insufficient.",
      hint: "Observe a Vacuum Lantern.", requires: [{ metric: "seen", atLeast: 1 }] }],
  },
  "slatefin-burrower": {
    kind: "slatefin-burrower", name: "Slatefin Burrower", temperament: "Defensive", hostile: false,
    health: 38, damage: 5, xp: 12, speed: .8, chaseSpeed: 1.8, turnRate: 2.8, attackRange: 1.3,
    footOffset: .5, radius: 1.05, height: .48,
    habitat: "Morrow: Moon-Slate Highlands, Pale Regolith Sea and Buried Waystone Galleries", active: "Day and night",
    behavior: "Broad overlapping plates part loose regolith in a swimming gait. This is a land burrower, not a water swimmer; give its defensive head room.",
    lore: "A ridge of travelling dust often reveals the Burrower before its slate-blue fins break the surface.",
    colors: [0x626e80, 0xa5b3bd, 0x384850], drops: [{ item: BlockId.MoonSlate, min: 1, max: 3, chance: .8 }],
    family: "underground", movement: "ground", aquatic: false, flying: false, sentient: false,
    tameable: true, tameItems: [Item.CrystalShard], breedable: false, diet: [BlockId.MineralFrost, Item.CrystalShard],
    captureItem: Item.CaptureOrb, postTameNotes: "Offer crystal shards and mineral frost. Keep a wide regolith floor clear for its plated body.",
    discoveryHint: "Watch for a moving seam of regolith below the Moon-Slate Highlands.",
    fieldNotes: [{ id: "morrow-regolith-swimmer", title: "Closed Plated Body",
      text: "Its sealed body survives Morrow's trace atmosphere. Its regolith-swimming gait does not make it aquatic or provide automatic mining.",
      hint: "Observe a Slatefin Burrower.", requires: [{ metric: "seen", atLeast: 1 }] }],
  },
  "morrow-owl": {
    kind: "morrow-owl", name: "Morrow Owl", temperament: "Skittish", hostile: false,
    health: 20, damage: 3, xp: 20, speed: .6, chaseSpeed: 2.8, turnRate: 3.2, attackRange: 1,
    footOffset: .5, radius: .55, height: .98,
    habitat: "Rare Morrow migrant: Starshadow Craters, Moon-Slate Highlands and Buried Waystone Galleries", active: "Dusk and night",
    behavior: "Rests on the ground between short, silent wide-wing crossings. A finite dream veil protects its brief vacuum transit; an exhausted Owl must reach a refuge.",
    lore: "It brings the dreaming sky with it for only a few breaths. It is a visitor to the moon, not a bird that can fly forever through vacuum.",
    colors: [0xc7c9de, 0x5c557c, 0xb7efe1], drops: [{ item: Item.Feather, min: 1, max: 2, chance: .75 }],
    family: "bird", movement: "ground", aquatic: false, flying: false, sentient: false,
    tameable: true, tameItems: [Item.Dreamcap], breedable: false, diet: [Item.Dreamcap, Item.RawMeat], captureItem: Item.CaptureOrb,
    postTameNotes: "Rest in breathable shelter or a known dream roost to restore the veil. Bare lunar ground cannot replenish it; retain a safe return perch.",
    discoveryHint: "A rare wide-wing silhouette may cross the Starshadow Craters after dusk.",
    fieldNotes: [{ id: "morrow-finite-veil", title: "Brief Dream Crossing",
      text: "The veil lasts at most eight seconds outside refuge and restores only while resting. Once it is spent, the Owl remains grounded and unbreathable air becomes dangerous.",
      hint: "Observe a Morrow Owl.", requires: [{ metric: "seen", atLeast: 1 }] }],
  },
};

/** Relative encounter weights, in MORROW_MOB_KINDS order; not population caps. */
const REGION_WEIGHTS: Record<MorrowRegion, readonly [number, number, number, number]> = {
  "pale-regolith-sea": [70, 12, 18, .15],
  "starshadow-craters": [20, 50, 30, .6],
  "moon-slate-highlands": [25, 8, 67, .5],
  "ice-lantern-rilles": [55, 40, 5, .15],
  "buried-waystone-galleries": [8, 40, 52, .7],
};

/** Caller supplies deterministic randomness. dayFraction follows the world clock:
 * sunrise near .25, midday .5, dusk .75. Invalid ranges never select a species. */
export function pickMorrowSpawn(region: MorrowRegion, dayFraction: number, roll: number): MorrowMobKind | null {
  const base = REGION_WEIGHTS[region];
  if (!base || !Number.isFinite(dayFraction) || dayFraction < 0 || dayFraction >= 1
    || !Number.isFinite(roll) || roll < 0 || roll >= 1) return null;
  const night = dayFraction < .25 || dayFraction >= .75;
  const weights = base.map((weight, index) => weight * (index === 0 ? night ? .45 : 1 : index === 1 ? night ? 1.8 : .55 : index === 3 ? night ? 1 : .08 : 1));
  let remaining = roll * weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < weights.length; i++) {
    remaining -= weights[i];
    if (remaining < 0) return MORROW_MOB_KINDS[i];
  }
  return MORROW_MOB_KINDS[MORROW_MOB_KINDS.length - 1];
}

/** Only known room readings are evidence of breathable shelter. Units match AirZoneState. */
export function morrowBreathableZone(zone: Readonly<AirZoneState> | null | undefined): boolean {
  if (!zone || !["sealed", "leaking", "depressurized"].includes(zone.status)) return false;
  const gas = [zone.oxygenMilliMoles, zone.inertMilliMoles, zone.co2MilliMoles];
  if (!gas.every(value => Number.isFinite(value) && value >= 0)
    || !Number.isFinite(zone.pressureMilliKPa)) return false;
  const total = gas.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) return false;
  const oxygenPa = zone.pressureMilliKPa * zone.oxygenMilliMoles / total;
  return zone.pressureMilliKPa >= 60_000 && zone.pressureMilliKPa <= 120_000
    && oxygenPa >= 16_000 && oxygenPa <= 30_000 && zone.co2MilliMoles / total <= .005;
}

/** The runtime must resolve both occupants at capture time, never reuse the keeper's zone for the specimen. */
export function safeLanternJar(keeper: Readonly<AirZoneState> | null | undefined, specimen: Readonly<AirZoneState> | null | undefined): boolean {
  return Boolean(keeper && specimen && keeper.zoneId.trim() && keeper.locationId.trim()
    && keeper.zoneId === specimen.zoneId && keeper.locationId === specimen.locationId
    && keeper.status === "sealed" && specimen.status === "sealed"
    && morrowBreathableZone(keeper) && morrowBreathableZone(specimen));
}

export const MORROW_EXPOSURE_GRACE_SECONDS = 15;
export const MORROW_OWL_VEIL_SECONDS = 8;
export const MORROW_OWL_VEIL_RECOVERY_PER_SECOND = .5;
export type MorrowExposureState = Readonly<{ exposureSeconds: number; veilSeconds: number }>;
export type MorrowMotion = "ground" | "rest" | "veil-crossing";
const bounded = (value: unknown, max: number): number => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
/** Missing save fields never grant a fresh veil. Natural spawn explicitly seeds eight seconds. */
export function normalizeMorrowExposure(state?: Partial<MorrowExposureState> | null): MorrowExposureState {
  return { exposureSeconds: bounded(state?.exposureSeconds, MORROW_EXPOSURE_GRACE_SECONDS), veilSeconds: bounded(state?.veilSeconds, MORROW_OWL_VEIL_SECONDS) };
}

/** Pure planetary dose and motion policy. Call only from the host, once per timestep.
 * `breathable` comes from current body/room readings; dreamRefuge requires a verified
 * authored roost and ground contact. A nearby shelter or generic cave is not a refuge.
 * Integrator owns gas, damage, movement, refuge geometry and persistence of both numbers.
 * Do not also apply habitat exposure for the same timestep.
 */
export function stepMorrowExposure(input: {
  kind: string; state?: Partial<MorrowExposureState> | null; elapsedSeconds: number; isHost: boolean;
  breathable: boolean; moving: boolean; dreamRefuge?: boolean; requiresBreathing?: boolean;
}): MorrowExposureState & { damage: number; motion: MorrowMotion; crossingSeconds: number } {
  const previous = normalizeMorrowExposure(input.state);
  const owl = input.kind === "morrow-owl";
  const refuge = owl && !input.moving && (input.breathable || input.dreamRefuge === true);
  const result = { ...previous, damage: 0, motion: refuge ? "rest" as const : "ground" as MorrowMotion, crossingSeconds: 0 };
  if (!input.isHost || !Number.isFinite(input.elapsedSeconds) || input.elapsedSeconds <= 0) return result;
  const dt = input.elapsedSeconds;
  if (isSealedMorrowNative(input.kind) || input.requiresBreathing === false) return { ...result, exposureSeconds: 0, veilSeconds: 0 };
  if (input.breathable || refuge) return { ...result,
    exposureSeconds: Math.max(0, previous.exposureSeconds - dt * 2),
    veilSeconds: owl && refuge ? Math.min(MORROW_OWL_VEIL_SECONDS, previous.veilSeconds + dt * MORROW_OWL_VEIL_RECOVERY_PER_SECOND) : previous.veilSeconds };
  // Standing still outside a refuge also spends the veil: landing cannot make it immortal.
  const protectedSeconds = owl ? Math.min(dt, previous.veilSeconds) : 0;
  const unprotectedSeconds = dt - protectedSeconds;
  const veilSeconds = owl ? previous.veilSeconds - protectedSeconds : 0;
  return {
    exposureSeconds: Math.min(MORROW_EXPOSURE_GRACE_SECONDS, previous.exposureSeconds + unprotectedSeconds),
    veilSeconds, damage: Math.max(0, unprotectedSeconds - (MORROW_EXPOSURE_GRACE_SECONDS - previous.exposureSeconds)),
    motion: owl && input.moving && veilSeconds > 0 ? "veil-crossing" : "ground",
    crossingSeconds: owl && input.moving ? protectedSeconds : 0,
  };
}
