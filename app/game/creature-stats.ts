import type {
  LegendaryCreatureKind, LivingRosterKind, MobDefinition, MobKind, SummonedCreatureKind,
} from "./mobs";

export type CreatureStats = Readonly<{
  vitality: number;
  power: number;
  focus: number;
  guard: number;
  ward: number;
  agility: number;
}>;

export type CreatureGrowthProfileId = "swift" | "sturdy" | "mystic" | "balanced" | "guardian" | "leviathan";
export type AuthoredCreatureKind = LivingRosterKind | LegendaryCreatureKind | SummonedCreatureKind;

export type CreatureStatProfile = Readonly<{
  kind: MobKind;
  base: CreatureStats;
  growth: CreatureGrowthProfileId;
  maximumLevel: 50 | 55 | 60;
}>;

export type AuthoredCreatureStatSeed = Readonly<{
  base: CreatureStats;
  growth: CreatureGrowthProfileId;
  maximumLevel: 50 | 55 | 60;
}>;

export const CREATURE_GROWTH_PROFILES = Object.freeze({
  swift: { healthPerLevel: 0.022, outputPerLevel: 0.019, guardBreakpoints: [18, 38], wardBreakpoints: [20, 40], agilityRange: 0.2 },
  sturdy: { healthPerLevel: 0.029, outputPerLevel: 0.017, guardBreakpoints: [10, 24, 40], wardBreakpoints: [18, 36], agilityRange: 0.12 },
  mystic: { healthPerLevel: 0.024, outputPerLevel: 0.019, guardBreakpoints: [24, 44], wardBreakpoints: [8, 22, 38], agilityRange: 0.16 },
  balanced: { healthPerLevel: 0.026, outputPerLevel: 0.018, guardBreakpoints: [16, 34], wardBreakpoints: [16, 34], agilityRange: 0.16 },
  guardian: { healthPerLevel: 0.03, outputPerLevel: 0.017, guardBreakpoints: [8, 20, 34, 48], wardBreakpoints: [12, 28, 44], agilityRange: 0.1 },
  leviathan: { healthPerLevel: 0.032, outputPerLevel: 0.018, guardBreakpoints: [8, 18, 30, 42, 54], wardBreakpoints: [10, 22, 36, 50], agilityRange: 0.08 },
} as const satisfies Readonly<Record<CreatureGrowthProfileId, Readonly<{
  healthPerLevel: number;
  outputPerLevel: number;
  guardBreakpoints: readonly number[];
  wardBreakpoints: readonly number[];
  agilityRange: number;
}>>>);

const stat = (
  vitality: number, power: number, focus: number, guard: number, ward: number, agility: number,
): CreatureStats => Object.freeze({ vitality, power, focus, guard, ward, agility });

const seed = (
  base: CreatureStats, growth: CreatureGrowthProfileId, maximumLevel: 50 | 55 | 60 = 50,
): AuthoredCreatureStatSeed => Object.freeze({ base, growth, maximumLevel });

/**
 * Fixed authored lines for the complete Living Bestiary expansion. These values
 * describe anatomy and intended play, never an index, name match, or specimen roll.
 */
export const EXPANSION_CREATURE_STAT_SEEDS = Object.freeze({
  "thornhide-trufflehog": seed(stat(36, 31, 18, 39, 24, 29), "sturdy"),
  "orchard-glider": seed(stat(19, 18, 29, 14, 23, 78), "swift"),
  "petalmask-tanuki": seed(stat(29, 27, 48, 24, 43, 57), "balanced"),
  "ironbeak-magpie": seed(stat(22, 25, 31, 35, 24, 74), "swift"),
  "hearthback-badger": seed(stat(44, 39, 18, 49, 29, 33), "sturdy"),
  "sunfoil-pangolin": seed(stat(42, 27, 36, 76, 49, 24), "guardian"),
  "glassstep-jerboa": seed(stat(16, 19, 23, 13, 19, 89), "swift"),
  "stormcrest-ibex": seed(stat(47, 43, 34, 54, 42, 56), "sturdy"),
  "cindercoil-gecko": seed(stat(23, 22, 44, 29, 39, 72), "swift"),
  "cloudkite-pika": seed(stat(18, 14, 45, 16, 43, 76), "mystic"),
  "briarclaw-lynx": seed(stat(33, 51, 27, 26, 25, 82), "swift"),
  "gravebell-jackal": seed(stat(35, 38, 47, 29, 49, 64), "balanced"),
  "cragglass-basilisk": seed(stat(54, 51, 61, 63, 65, 31), "guardian", 55),
  "stormglass-roclet": seed(stat(38, 43, 41, 40, 38, 80), "swift"),
  "brinewhisk-otter": seed(stat(27, 24, 26, 20, 25, 75), "swift"),
  "riverwright-beaver": seed(stat(39, 33, 29, 46, 33, 35), "sturdy"),
  "mirecrown-crane": seed(stat(28, 22, 51, 22, 47, 61), "mystic"),
  "inkveil-cuttle": seed(stat(32, 25, 64, 24, 58, 68), "mystic"),
  "prismclaw-mantis-shrimp": seed(stat(31, 66, 31, 53, 37, 61), "balanced"),
  "reefmender-shrimp": seed(stat(18, 11, 58, 18, 52, 48), "mystic"),
  "currentweaver-eel": seed(stat(37, 35, 65, 26, 55, 66), "mystic"),
  "shellcarrier-hermit": seed(stat(23, 21, 20, 56, 30, 35), "sturdy"),
  "wreckwhistle-porpoise": seed(stat(45, 35, 44, 30, 40, 86), "swift"),
  "kilnscale-salamander": seed(stat(31, 29, 51, 40, 43, 51), "balanced"),
  "sporeback-gardener": seed(stat(40, 23, 55, 42, 49, 29), "mystic"),
  "voidmantle-ray": seed(stat(45, 39, 53, 35, 51, 72), "mystic", 55),
  "fossilback-trilobite": seed(stat(27, 15, 30, 66, 43, 17), "guardian"),
  "ilyr-virebloom": seed(stat(92, 58, 91, 78, 94, 52), "leviathan", 60),
  thalassene: seed(stat(100, 62, 82, 98, 89, 24), "leviathan", 60),
  orichalc: seed(stat(100, 82, 79, 100, 96, 18), "leviathan", 60),
  "varkesh-stormmane": seed(stat(82, 85, 72, 64, 71, 96), "leviathan", 60),
  kharza: seed(stat(79, 91, 54, 72, 61, 88), "leviathan", 60),
  "sugarwake-sovereign": seed(stat(88, 67, 94, 81, 90, 48), "leviathan", 60),
  "bellstep-qilin": seed(stat(66, 44, 78, 61, 74, 67), "mystic", 55),
  "aerolith-baleen": seed(stat(94, 48, 76, 82, 79, 52), "leviathan", 60),
  "mireglass-kelpie": seed(stat(72, 63, 75, 52, 68, 84), "swift", 55),
  "cinderwing-pyrausta": seed(stat(63, 69, 72, 44, 61, 88), "swift", 55),
  "nacre-gatewyrm": seed(stat(82, 68, 77, 76, 81, 62), "guardian", 60),
  "frostcauldron-behemoth": seed(stat(100, 81, 42, 96, 70, 25), "leviathan", 60),
  "briarcrown-manticore": seed(stat(78, 89, 56, 64, 55, 79), "balanced", 60),
  ammonarch: seed(stat(90, 54, 73, 100, 84, 20), "leviathan", 60),
  "handtail-ahuizotl": seed(stat(68, 64, 70, 50, 62, 86), "swift", 55),
  "tideclock-cetus": seed(stat(100, 76, 72, 86, 80, 43), "leviathan", 60),
  "anemoi-gryphon": seed(stat(86, 88, 68, 63, 65, 94), "leviathan", 60),
  "sable-gorgon": seed(stat(91, 72, 88, 92, 86, 34), "leviathan", 60),
  "namarra-makara": seed(stat(96, 77, 91, 82, 95, 56), "leviathan", 60),
  "ashen-salamander-king": seed(stat(89, 84, 88, 78, 91, 45), "leviathan", 60),
  "mycelial-oneirophant": seed(stat(98, 53, 100, 84, 100, 28), "leviathan", 60),
  asterjaw: seed(stat(62, 68, 61, 47, 60, 84), "balanced", 60),
  "vellum-warden": seed(stat(72, 43, 82, 66, 88, 42), "guardian", 60),
  "choir-of-one": seed(stat(53, 42, 87, 31, 91, 76), "mystic", 60),
  "glasswake-stag": seed(stat(66, 57, 80, 51, 78, 79), "mystic", 60),
} satisfies Readonly<Record<AuthoredCreatureKind, AuthoredCreatureStatSeed>>);

/** High-value legacy families receive the same fixed-line treatment. */
const DEEPENED_LEGACY_STAT_SEEDS = Object.freeze({
  petalfox: seed(stat(25, 29, 38, 21, 32, 67), "swift"),
  "emberbrush-fox": seed(stat(27, 36, 34, 22, 31, 70), "swift"),
  "moonpetal-fox": seed(stat(25, 25, 47, 20, 40, 69), "mystic"),
  mossling: seed(stat(28, 18, 42, 31, 39, 27), "mystic"),
  "boglantern-mossling": seed(stat(30, 16, 48, 33, 44, 25), "mystic"),
  "cindercone-mossling": seed(stat(29, 24, 43, 35, 36, 26), "mystic"),
  "moonbloom-mossling": seed(stat(27, 14, 52, 28, 49, 29), "mystic"),
  "moonbrawn-mossling": seed(stat(48, 52, 28, 62, 36, 31), "guardian"),
  emberjay: seed(stat(20, 30, 31, 16, 24, 75), "swift"),
  "canopy-lark": seed(stat(18, 18, 34, 14, 27, 82), "swift"),
  "tidewing-gull": seed(stat(22, 23, 28, 18, 25, 76), "swift"),
  frostquill: seed(stat(21, 29, 34, 19, 31, 73), "swift"),
  runeowl: seed(stat(27, 24, 58, 22, 54, 65), "mystic"),
  puddlehopper: seed(stat(23, 21, 31, 20, 29, 68), "swift"),
  burrowbell: seed(stat(31, 20, 38, 46, 42, 23), "guardian"),
  woolhorn: seed(stat(46, 35, 20, 51, 37, 28), "sturdy"),
  "meadow-cow": seed(stat(50, 34, 18, 48, 29, 25), "sturdy"),
  "sunstep-grazer": seed(stat(48, 41, 31, 45, 38, 43), "sturdy"),
  ridgeback: seed(stat(52, 46, 19, 61, 33, 30), "guardian"),
  mistmane: seed(stat(45, 25, 49, 39, 51, 39), "mystic"),
  pebbletortoise: seed(stat(47, 25, 29, 68, 48, 16), "guardian"),
  "reefglide-terrapin": seed(stat(53, 28, 35, 72, 55, 21), "guardian"),
  "grotto-grazer": seed(stat(39, 29, 27, 42, 31, 34), "sturdy"),
  lanternray: seed(stat(29, 18, 49, 24, 45, 67), "mystic"),
  "prismtail-swift": seed(stat(21, 27, 45, 24, 42, 84), "swift"),
  "glassback-newt": seed(stat(24, 20, 39, 25, 36, 58), "balanced"),
  "sailfin-skimmer": seed(stat(25, 22, 31, 34, 30, 64), "swift"),
  "ashnose-bat": seed(stat(20, 25, 37, 17, 28, 79), "swift"),
  chimewing: seed(stat(22, 20, 51, 18, 47, 72), "mystic"),
  "cinder-kite": seed(stat(28, 35, 42, 38, 36, 70), "balanced"),
  veinling: seed(stat(36, 29, 46, 57, 52, 30), "guardian"),
  caveblob: seed(stat(44, 30, 31, 38, 42, 19), "sturdy"),
  "wild-horse": seed(stat(46, 38, 18, 35, 27, 64), "sturdy"),
  "deepgear-courser-golem": seed(stat(64, 53, 42, 73, 58, 56), "guardian", 55),
  reedstrider: seed(stat(41, 35, 28, 34, 32, 67), "balanced"),
  warg: seed(stat(49, 56, 24, 42, 31, 69), "balanced", 55),
  "copper-mole": seed(stat(26, 24, 28, 42, 31, 44), "sturdy"),
  tidepup: seed(stat(28, 25, 29, 23, 27, 66), "swift"),
  peelop: seed(stat(25, 23, 31, 25, 30, 55), "balanced"),
} satisfies Readonly<Partial<Record<MobKind, AuthoredCreatureStatSeed>>>);

export const AUTHORED_CREATURE_STAT_SEEDS: Readonly<Partial<Record<MobKind, AuthoredCreatureStatSeed>>> = Object.freeze({
  rillehopper: seed(stat(42, 22, 30, 36, 34, 58), "swift"),
  "vacuum-lantern": seed(stat(24, 8, 48, 51, 54, 14), "guardian"),
  "slatefin-burrower": seed(stat(58, 41, 22, 64, 38, 28), "sturdy"),
  "morrow-owl": seed(stat(34, 27, 68, 24, 62, 59), "mystic"),
  ...DEEPENED_LEGACY_STAT_SEEDS,
  ...EXPANSION_CREATURE_STAT_SEEDS,
});

const clampStat = (value: number) => Math.max(1, Math.min(100, Math.round(value)));

/**
 * Compatibility fallback for legacy species that have not yet received a
 * completion sheet. It uses structural MobDefinition fields only; names and
 * descriptions never influence stats.
 */
export function baseCreatureStats(definition: MobDefinition): CreatureStats {
  const authored = AUTHORED_CREATURE_STAT_SEEDS[definition.kind];
  if (authored) return authored.base;
  const familyGuard = definition.family === "construct" ? 18
    : definition.family === "dragon" || definition.family === "leviathan" || definition.family === "legendary" ? 14
      : definition.family === "undead" ? 9
        : definition.family === "sea-slug" || definition.family === "butterfly" ? 1 : 5;
  const familyWard = definition.family === "dragon" ? 16
    : definition.family === "construct" ? 11
      : definition.family === "undead" ? 13
        : definition.ranged ? 9 : 4;
  return Object.freeze({
    vitality: clampStat(8 + definition.health * 1.25),
    power: clampStat(5 + definition.damage * 4.2 + (definition.hostile ? 4 : 0)),
    focus: clampStat(4 + (definition.ranged ? definition.damage * 4 : definition.damage * 1.4)),
    guard: clampStat(familyGuard + definition.radius * 16 + definition.health * 0.22),
    ward: clampStat(familyWard + definition.health * 0.12),
    agility: clampStat(8 + definition.speed * 13 + definition.chaseSpeed * 4 + definition.turnRate * 1.5),
  });
}

export function growthProfileForDefinition(definition: MobDefinition): CreatureGrowthProfileId {
  const authored = AUTHORED_CREATURE_STAT_SEEDS[definition.kind];
  if (authored) return authored.growth;
  if (definition.family === "leviathan" || definition.family === "dragon" || definition.family === "legendary") return "leviathan";
  if (definition.family === "construct" || definition.radius >= 0.85 || definition.health >= 70) return "guardian";
  if (definition.movement === "flying" || definition.family === "rabbit" || definition.family === "butterfly") return "swift";
  if (definition.ranged) return "mystic";
  if (definition.health >= 28 || definition.radius >= 0.68) return "sturdy";
  return "balanced";
}

export function creatureStatProfile(kind: MobKind, definition: MobDefinition): CreatureStatProfile {
  const authored = AUTHORED_CREATURE_STAT_SEEDS[kind];
  if (authored) return Object.freeze({ kind, ...authored });
  const growth = growthProfileForDefinition(definition);
  const maximumLevel: 50 | 55 | 60 = definition.family === "dragon" || definition.family === "leviathan" || definition.family === "legendary" || definition.family === "summon" ? 60
    : definition.persistent && definition.hostile ? 55 : 50;
  return Object.freeze({ kind, base: baseCreatureStats(definition), growth, maximumLevel });
}

function breakpointPoints(level: number, breakpoints: readonly number[]) {
  return breakpoints.reduce((sum, breakpoint) => sum + (level >= breakpoint ? 2 : 0), 0);
}

export function statsAtLevel(profile: CreatureStatProfile, requestedLevel: number): CreatureStats {
  const level = Math.max(1, Math.min(profile.maximumLevel, Math.floor(requestedLevel)));
  const growth = CREATURE_GROWTH_PROFILES[profile.growth];
  const offset = level - 1;
  return Object.freeze({
    vitality: clampStat(profile.base.vitality * (1 + growth.healthPerLevel * offset)),
    power: clampStat(profile.base.power * (1 + growth.outputPerLevel * offset)),
    focus: clampStat(profile.base.focus * (1 + growth.outputPerLevel * offset)),
    guard: clampStat(profile.base.guard + breakpointPoints(level, growth.guardBreakpoints)),
    ward: clampStat(profile.base.ward + breakpointPoints(level, growth.wardBreakpoints)),
    agility: clampStat(profile.base.agility * (1 + growth.agilityRange * offset / Math.max(1, profile.maximumLevel - 1))),
  });
}

export function statBand(value: number): "Very low" | "Low" | "Moderate" | "High" | "Exceptional" {
  if (value < 18) return "Very low";
  if (value < 34) return "Low";
  if (value < 55) return "Moderate";
  if (value < 76) return "High";
  return "Exceptional";
}

export function creatureMaximumHealth(definition: MobDefinition, profile: CreatureStatProfile, level: number) {
  const growth = CREATURE_GROWTH_PROFILES[profile.growth];
  const safeLevel = Math.max(1, Math.min(profile.maximumLevel, Math.floor(level)));
  return Math.max(1, definition.health * (1 + growth.healthPerLevel * (safeLevel - 1)));
}

export function creatureOutputMultiplier(profile: CreatureStatProfile, level: number) {
  const safeLevel = Math.max(1, Math.min(profile.maximumLevel, Math.floor(level)));
  return 1 + CREATURE_GROWTH_PROFILES[profile.growth].outputPerLevel * (safeLevel - 1);
}
