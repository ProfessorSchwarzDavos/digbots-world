import type { MobKind } from "./mobs";

export const CREATURE_PROGRESSION_SCHEMA_VERSION = 2 as const;

export type CreatureTactic = "guard" | "support" | "pursue" | "cautious" | "hold";
export type BondTier = "wary" | "familiar" | "trusted" | "partnered" | "kindred";
export type CreatureRarityForm = "ordinary" | "prime" | "regional" | "seasonal" | "story" | "legendary" | "summoned";

export type CreatureAptitudeId =
  | "sure-footed" | "keen-scent" | "calm-heart" | "strong-back" | "quick-study"
  | "current-reader" | "night-sight" | "nest-tender" | "resonant" | "weatherwise";

export type CreaturePhenotype = Readonly<{
  sizeScale: number;
  hueShift: number;
  markingMask: number;
  markingIntensity: number;
  accentVariant: number;
}>;

export type CreatureCaptureHistory = Readonly<{
  captureCount: number;
  firstCapturedAt: number | null;
  lastCapturedAt: number | null;
  firstCaptorId: string | null;
  lastMethodId: string | null;
  wasReleased: boolean;
}>;

export type CreatureProgressionV2 = Readonly<{
  schemaVersion: typeof CREATURE_PROGRESSION_SCHEMA_VERSION;
  progressionSeed: number;
  level: number;
  experience: number;
  maximumLevel: 50 | 55 | 60;
  bondPoints: number;
  bondTier: BondTier;
  learnedMoveIds: readonly string[];
  activeMoveIds: readonly string[];
  signatureMoveId: string | null;
  fieldUtilityMoveId: string | null;
  tactic: CreatureTactic;
  shiny: boolean;
  rarityForm: CreatureRarityForm;
  phenotype: CreaturePhenotype;
  aptitudes: readonly CreatureAptitudeId[];
  captureHistory: CreatureCaptureHistory;
}>;

export type LegacyCreatureProgression = Readonly<Partial<{
  schemaVersion: number;
  progressionSeed: number;
  level: number;
  experience: number;
  xp: number;
  bond: number;
  bondPoints: number;
  learnedMoveIds: readonly string[];
  activeMoveIds: readonly string[];
  signatureMoveId: string | null;
  fieldUtilityMoveId: string | null;
  tactic: CreatureTactic;
  shiny: boolean;
  phenotype: CreaturePhenotype;
  aptitudes: readonly CreatureAptitudeId[];
  captureHistory: CreatureCaptureHistory;
  captureCount: number;
  caught: boolean;
  firstCapturedAt: number;
  lastCapturedAt: number;
  firstCaptorId: string;
  lastMethodId: string;
  wasReleased: boolean;
  rarityForm: CreatureRarityForm;
}>>;

const UINT32_MAX = 0xffff_ffff;
const APTITUDE_IDS: readonly CreatureAptitudeId[] = Object.freeze([
  "sure-footed", "keen-scent", "calm-heart", "strong-back", "quick-study",
  "current-reader", "night-sight", "nest-tender", "resonant", "weatherwise",
]);

export function stableCreatureSeed(kind: MobKind, entityId: number | string, geneticSeed = 0, age = 0) {
  let hash = 2166136261 >>> 0;
  const text = `${kind}|${entityId}|${Math.trunc(geneticSeed)}|${Math.trunc(age)}`;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash || 1;
}

function sample(seed: number, salt: number) {
  let value = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  value ^= value >>> 16;
  return (value >>> 0) / (UINT32_MAX + 1);
}

export function experienceForLevel(level: number) {
  const safe = Math.max(1, Math.floor(level));
  const offset = safe - 1;
  return Math.floor(offset * offset * 18 + offset * 42);
}

export function levelForExperience(experience: number, maximumLevel: number) {
  const safeXp = Math.max(0, Math.floor(experience));
  let level = 1;
  while (level < maximumLevel && experienceForLevel(level + 1) <= safeXp) level += 1;
  return level;
}

export function bondTierForPoints(points: number): BondTier {
  if (points >= 600) return "kindred";
  if (points >= 330) return "partnered";
  if (points >= 150) return "trusted";
  if (points >= 45) return "familiar";
  return "wary";
}

export function phenotypeFromSeed(seed: number): CreaturePhenotype {
  return Object.freeze({
    sizeScale: Number((0.94 + sample(seed, 1) * 0.12).toFixed(3)),
    hueShift: Number(((sample(seed, 2) - 0.5) * 0.12).toFixed(3)),
    markingMask: Math.floor(sample(seed, 3) * 8),
    markingIntensity: Number((0.28 + sample(seed, 4) * 0.62).toFixed(3)),
    accentVariant: Math.floor(sample(seed, 5) * 6),
  });
}

export function aptitudesFromSeed(seed: number): readonly CreatureAptitudeId[] {
  const first = Math.floor(sample(seed, 6) * APTITUDE_IDS.length) % APTITUDE_IDS.length;
  let second = Math.floor(sample(seed, 7) * APTITUDE_IDS.length) % APTITUDE_IDS.length;
  if (second === first) second = (second + 3) % APTITUDE_IDS.length;
  return Object.freeze([APTITUDE_IDS[first], APTITUDE_IDS[second]]);
}

export function isShinySeed(seed: number) {
  // Stable 1/1024 ecology roll. Prime and other authored forms remain separate.
  return Math.floor(sample(seed, 8) * 1024) === 0;
}

/** Visible, bounded inheritance only: no hidden IV-like combat values are introduced. */
export function offspringProgressionLegacy(
  kind: MobKind,
  specimenId: string,
  geneticSeed: number,
  left: CreatureProgressionV2,
  right: CreatureProgressionV2,
): LegacyCreatureProgression {
  const seed = stableCreatureSeed(kind, specimenId, geneticSeed, 0);
  const baseline = phenotypeFromSeed(seed);
  const chooseLeft = (seed & 1) === 0;
  const markingParent = chooseLeft ? left.phenotype : right.phenotype;
  const inheritedPhenotype: CreaturePhenotype = Object.freeze({
    sizeScale: Number(Math.max(.88, Math.min(1.12, (left.phenotype.sizeScale + right.phenotype.sizeScale + baseline.sizeScale) / 3)).toFixed(3)),
    hueShift: Number(Math.max(-.14, Math.min(.14, (left.phenotype.hueShift + right.phenotype.hueShift) * .42 + baseline.hueShift * .16)).toFixed(3)),
    markingMask: markingParent.markingMask,
    markingIntensity: Number(Math.max(0, Math.min(1, (left.phenotype.markingIntensity + right.phenotype.markingIntensity + baseline.markingIntensity) / 3)).toFixed(3)),
    accentVariant: chooseLeft ? left.phenotype.accentVariant : right.phenotype.accentVariant,
  });
  const shinyParents = Number(left.shiny) + Number(right.shiny);
  const inheritedShiny = seed % 1024 < (shinyParents === 2 ? 32 : shinyParents === 1 ? 8 : 1);
  const aptitudes = [...new Set([
    left.aptitudes[seed % Math.max(1, left.aptitudes.length)],
    right.aptitudes[(seed >>> 4) % Math.max(1, right.aptitudes.length)],
    ...aptitudesFromSeed(seed),
  ].filter((aptitude): aptitude is CreatureAptitudeId => Boolean(aptitude)))].slice(0, 2);
  return Object.freeze({
    rarityForm: "ordinary",
    shiny: inheritedShiny,
    phenotype: inheritedPhenotype,
    aptitudes: Object.freeze(aptitudes),
  });
}

export type ProgressionMigrationInput = Readonly<{
  kind: MobKind;
  entityId: number | string;
  geneticSeed?: number;
  age?: number;
  maximumLevel: 50 | 55 | 60;
  defaultMoveIds: readonly string[];
  legacy?: LegacyCreatureProgression | null;
}>;

export function migrateCreatureProgression(input: ProgressionMigrationInput): CreatureProgressionV2 {
  const legacy = input.legacy ?? {};
  // A saved specimen's identity cannot depend on its new runtime ID or age.
  const progressionSeed = Number.isInteger(legacy.progressionSeed) && legacy.progressionSeed! >= 0 && legacy.progressionSeed! <= UINT32_MAX
    ? legacy.progressionSeed! : stableCreatureSeed(input.kind, input.entityId, input.geneticSeed ?? 0, input.age ?? 0);
  const experience = Math.max(0, Math.floor(legacy.experience ?? legacy.xp ?? 0));
  const savedLevel = Number.isFinite(legacy.level) ? Math.floor(legacy.level ?? 1) : levelForExperience(experience, input.maximumLevel);
  const level = Math.max(1, Math.min(input.maximumLevel, savedLevel));
  const bondPoints = Math.max(0, Math.floor(legacy.bondPoints ?? legacy.bond ?? 0));
  const learned = [...new Set([...(legacy.learnedMoveIds ?? []), ...input.defaultMoveIds])].filter(Boolean);
  const active = [...new Set(legacy.activeMoveIds ?? learned)].filter((id) => learned.includes(id)).slice(0, 4);
  const captureCount = Math.max(legacy.captureHistory?.captureCount ?? legacy.captureCount ?? (legacy.caught ? 1 : 0), 0);
  return Object.freeze({
    schemaVersion: CREATURE_PROGRESSION_SCHEMA_VERSION,
    progressionSeed,
    level,
    experience: Math.max(experience, experienceForLevel(level)),
    maximumLevel: input.maximumLevel,
    bondPoints,
    bondTier: bondTierForPoints(bondPoints),
    learnedMoveIds: Object.freeze(learned),
    activeMoveIds: Object.freeze(active),
    signatureMoveId: legacy.signatureMoveId ?? null,
    fieldUtilityMoveId: legacy.fieldUtilityMoveId ?? null,
    tactic: legacy.tactic ?? "guard",
    shiny: legacy.shiny ?? isShinySeed(progressionSeed),
    rarityForm: legacy.rarityForm ?? "ordinary",
    phenotype: legacy.phenotype ?? phenotypeFromSeed(progressionSeed),
    aptitudes: Object.freeze([...(legacy.aptitudes ?? aptitudesFromSeed(progressionSeed))]),
    captureHistory: Object.freeze({
      captureCount,
      firstCapturedAt: legacy.captureHistory?.firstCapturedAt ?? legacy.firstCapturedAt ?? null,
      lastCapturedAt: legacy.captureHistory?.lastCapturedAt ?? legacy.lastCapturedAt ?? null,
      firstCaptorId: legacy.captureHistory?.firstCaptorId ?? legacy.firstCaptorId ?? null,
      lastMethodId: legacy.captureHistory?.lastMethodId ?? legacy.lastMethodId ?? null,
      wasReleased: legacy.captureHistory?.wasReleased ?? legacy.wasReleased ?? false,
    }),
  });
}

export function validateProgression(progression: CreatureProgressionV2): readonly string[] {
  const errors: string[] = [];
  if (progression.schemaVersion !== 2) errors.push("Unsupported creature progression schema.");
  if (progression.level < 1 || progression.level > progression.maximumLevel) errors.push("Creature level is out of bounds.");
  if (progression.activeMoveIds.length > 4) errors.push("Creature has more than four active AI moves.");
  if (progression.activeMoveIds.some((id) => !progression.learnedMoveIds.includes(id))) errors.push("Active move is not learned.");
  if (new Set(progression.aptitudes).size !== progression.aptitudes.length) errors.push("Creature aptitudes must be unique.");
  return Object.freeze(errors);
}

export function recordCreatureCaptureHistory(
  progression: CreatureProgressionV2,
  input: Readonly<{ capturedAt: number; captorId: string; methodId: string }>,
): CreatureProgressionV2 {
  const history = progression.captureHistory;
  return Object.freeze({
    ...progression,
    captureHistory: Object.freeze({
      captureCount: history.captureCount + 1,
      firstCapturedAt: history.firstCapturedAt ?? input.capturedAt,
      lastCapturedAt: input.capturedAt,
      firstCaptorId: history.firstCaptorId ?? input.captorId,
      lastMethodId: input.methodId,
      wasReleased: false,
    }),
  });
}

export function recordCreatureReleaseHistory(progression: CreatureProgressionV2): CreatureProgressionV2 {
  return progression.captureHistory.wasReleased ? progression : Object.freeze({
    ...progression,
    captureHistory: Object.freeze({ ...progression.captureHistory, wasReleased: true }),
  });
}
