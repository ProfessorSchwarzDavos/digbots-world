import { AUTHORED_CREATURE_CAPTURE_SHEETS, type AuthoredCreatureCaptureSheet } from "./creature-capture";
import { CREATURE_ECOLOGY_CONTRACTS, type CreatureEcologyContract } from "./creature-ecology";
import { authoredMoveSetForKind, defaultMoveSetForTypes, EXPANSION_CREATURE_MOVE_SHEETS, type AuthoredCreatureMoveSheet, type CreatureMoveSet } from "./creature-moves";
import { EXPANSION_CREATURE_RARITY_POLICIES, type CreatureRarityPolicy } from "./creature-rarity";
import { creatureStatProfile, EXPANSION_CREATURE_STAT_SEEDS, type AuthoredCreatureStatSeed, type CreatureStatProfile } from "./creature-stats";
import { CREATURE_TYPES, resolveCreatureTypes, type CreatureTypeId, type CreatureTypeSource } from "./creature-types";
import { isMorrowMobKind } from "./morrow-ecology";
import {
  LEGENDARY_CREATURE_ORDER, LIVING_ROSTER_ORDER, MOB_DEFS, MOB_ORDER, SUMMONED_CREATURE_ORDER,
  type LegendaryCreatureKind, type LivingRosterKind, type MobDefinition, type MobKind, type SummonedCreatureKind,
} from "./mobs";

export type CaptureProfileId = "open" | "gentle" | "pursuit" | "armored" | "territorial" | "aquatic" | "resonant" | "rescue" | "legendary" | "uncapturable";
export type EcologyRole = "grazer" | "browser" | "predator" | "scavenger" | "pollinator" | "seed-spreader" | "reef-helper" | "filter-feeder" | "burrower" | "sentinel" | "construct" | "citizen" | "mount" | "companion" | "ambient" | "boss" | "scout" | "retriever" | "guardian" | "forager" | "worker" | "restorer" | "healer" | "research";
export type ExpansionCreatureKind = LivingRosterKind | LegendaryCreatureKind | SummonedCreatureKind;

export type CreatureProfile = Readonly<{
  kind: MobKind;
  naturalTypes: readonly CreatureTypeId[];
  stats: CreatureStatProfile;
  moves: CreatureMoveSet;
  captureProfile: CaptureProfileId;
  ecologyRoles: readonly EcologyRole[];
  researchClues: readonly string[];
  authorship: "explicit" | "legacy-family-fallback";
}>;

export type CreatureContentSheet = Readonly<{
  stableId: ExpansionCreatureKind;
  naturalTypes: readonly CreatureTypeId[];
  stats: AuthoredCreatureStatSeed;
  moves: AuthoredCreatureMoveSheet;
  capture: AuthoredCreatureCaptureSheet;
  ecology: CreatureEcologyContract;
  rarity: CreatureRarityPolicy;
  ecologyRoles: readonly EcologyRole[];
  researchClues: readonly string[];
}>;

const EXACT_TYPES: Readonly<Partial<Record<MobKind, readonly CreatureTypeId[]>>> = Object.freeze({
  rillehopper: ["wild", "frost"], "vacuum-lantern": ["radiant", "stone"],
  "slatefin-burrower": ["stone", "wild"], "morrow-owl": ["dream", "sky"],
  mossling: ["verdant", "wild"], "boglantern-mossling": ["verdant", "radiant"], "cindercone-mossling": ["verdant", "flame"], "moonbloom-mossling": ["verdant", "dream"], "moonbrawn-mossling": ["verdant", "stone"],
  ridgeback: ["stone", "wild"], woolhorn: ["wild", "frost"], glowmoth: ["radiant", "sky"], shadecrawler: ["umbral", "venom"], caveblob: ["tide", "umbral"], rattlekin: ["spirit", "neutral"], zombie: ["umbral", "spirit"],
  "sunstep-grazer": ["radiant", "wild"], pebbletortoise: ["stone", "wild"], brambleboar: ["verdant", "wild"], petalfox: ["verdant", "wild"], "emberbrush-fox": ["flame", "wild"], "moonpetal-fox": ["dream", "wild"],
  duneclatter: ["stone", "wild"], thimbledeer: ["verdant", "wild"], "frostlace-hart": ["frost", "wild"], "reedcrown-deer": ["tide", "verdant"], lanternshell: ["radiant", "stone"], puddlehopper: ["tide", "wild"], reedstrider: ["tide", "sky"],
  "wild-horse": ["wild"], "rimehoof-courser": ["frost", "wild"], "sunscar-courser": ["flame", "wild"], "mirestride-courser": ["tide", "verdant"], "starbough-courser": ["dream", "verdant"],
  "meadow-cow": ["wild"], "sunbloom-longhorn": ["radiant", "wild"], mistmane: ["dream", "wild"], sakurakit: ["verdant", "dream"], "sunwash-crab": ["tide", "stone"], taffalo: ["confection", "wild"],
  "deepgear-courser-golem": ["metal", "storm"], "clockwork-hound-golem": ["metal", "wild"], "webspinner-golem": ["metal", "venom"], "copper-scout-golem": ["metal", "storm"], "stone-bulwark-golem": ["metal", "stone"], "aetherforged-sentinel": ["metal", "arcane"],
  emberjay: ["flame", "sky"], "canopy-lark": ["verdant", "sky"], "tidewing-gull": ["tide", "sky"], frostquill: ["frost", "sky"],
  honeybee: ["verdant", "wild"], "hive-queen": ["verdant", "radiant"], "reed-dragonfly": ["tide", "sky"], "lightning-bug": ["radiant", "storm"],
  "worldshell-leviathan": ["stone", "tide"], "aetherbell-larva": ["radiant", "tide"], "aetherbell-leviathan": ["radiant", "arcane"],
  "fire-dragon": ["draconic", "flame"], "ice-dragon": ["draconic", "frost"], "steel-dragon": ["draconic", "metal"], "sea-dragon": ["draconic", "tide"], "gold-dragon": ["draconic", "radiant"], "silver-dragon": ["draconic", "arcane"],
  glimmerhart: ["radiant", "spirit"], runeowl: ["arcane", "sky"], glowfin: ["radiant", "tide"], "copper-mole": ["metal", "stone"],
  peelop: ["verdant", "wild"], "reliquary-sentinel": ["spirit", "metal"], skeleton: ["spirit", "neutral"], warg: ["umbral", "wild"],
  "grotto-grazer": ["stone", "wild"], lanternray: ["radiant", "sky"], "prismtail-swift": ["mirror", "sky"], "glassback-newt": ["tide", "stone"], "sailfin-skimmer": ["tide", "sky"], "ashnose-bat": ["echo", "umbral"], chimewing: ["echo", "sky"], "cinder-kite": ["flame", "sky"], "embercarapace-beetle": ["flame", "stone", "wild"], veinling: ["metal", "spirit"],
  "auric-scarab": ["metal", "radiant"], rootwrithe: ["verdant", "venom"], "bellroot-matron": ["verdant", "echo"], vaultwing: ["umbral", "sky"], "cinder-maw": ["flame", "stone"], "ossuary-keeper": ["spirit", "stone"], "mossback-kite": ["verdant", "sky"], "clockwork-marmot": ["metal", "wild"], "inkmaw-curator": ["umbral", "arcane"],
  bonbonwing: ["confection", "sky"], "moonveil-wing": ["dream", "sky"],
  "thornhide-trufflehog": ["wild", "verdant"], "orchard-glider": ["wild", "sky"], "petalmask-tanuki": ["wild", "dream", "verdant"],
  "ironbeak-magpie": ["sky", "metal", "wild"], "hearthback-badger": ["wild", "stone"], "sunfoil-pangolin": ["wild", "metal", "radiant"],
  "glassstep-jerboa": ["wild", "stone"], "stormcrest-ibex": ["wild", "stone", "storm"], "cindercoil-gecko": ["wild", "flame", "stone"],
  "cloudkite-pika": ["wild", "sky", "echo"], "briarclaw-lynx": ["wild", "verdant"], "gravebell-jackal": ["wild", "spirit", "umbral"],
  "cragglass-basilisk": ["wild", "stone", "arcane"], "stormglass-roclet": ["sky", "storm", "stone"], "brinewhisk-otter": ["wild", "tide"],
  "riverwright-beaver": ["wild", "tide", "verdant"], "mirecrown-crane": ["sky", "tide", "verdant"], "inkveil-cuttle": ["tide", "umbral", "dream"],
  "prismclaw-mantis-shrimp": ["tide", "stone", "radiant"], "reefmender-shrimp": ["tide", "verdant", "radiant"], "currentweaver-eel": ["tide"],
  "shellcarrier-hermit": ["wild", "tide", "stone"], "wreckwhistle-porpoise": ["wild", "tide", "echo"], "kilnscale-salamander": ["wild", "flame", "stone"],
  "sporeback-gardener": ["verdant", "wild", "venom"], "voidmantle-ray": ["sky", "umbral", "tide"], "fossilback-trilobite": ["stone", "tide", "wild"],
  "ilyr-virebloom": ["verdant", "tide", "dream", "radiant", "spirit"], thalassene: ["tide", "stone", "verdant", "radiant"],
  orichalc: ["metal", "stone"], "varkesh-stormmane": ["sky", "storm", "wild"], kharza: ["wild", "umbral", "metal"],
  "sugarwake-sovereign": ["confection", "arcane", "flame"], asterjaw: ["sky", "radiant", "spirit"],
  "vellum-warden": ["arcane", "dream", "spirit"], "choir-of-one": ["hush", "echo", "umbral"], "glasswake-stag": ["mirror", "tide", "dream"],
  "bellstep-qilin": ["radiant", "echo", "wild"], "aerolith-baleen": ["sky", "stone", "spirit"],
  "mireglass-kelpie": ["tide", "mirror", "umbral"], "cinderwing-pyrausta": ["flame", "sky", "arcane"],
  "nacre-gatewyrm": ["tide", "draconic", "arcane"], "frostcauldron-behemoth": ["frost", "stone", "wild"],
  "briarcrown-manticore": ["wild", "verdant", "venom"], ammonarch: ["stone", "tide", "arcane"],
  "handtail-ahuizotl": ["tide", "wild", "spirit"], "tideclock-cetus": ["tide", "spirit", "metal"],
  "anemoi-gryphon": ["sky", "storm", "wild"], "sable-gorgon": ["stone", "venom", "mirror"],
  "namarra-makara": ["tide", "radiant", "spirit"], "ashen-salamander-king": ["flame", "arcane", "draconic"],
  "mycelial-oneirophant": ["dream", "verdant", "spirit"],
});

export const EXPANSION_CREATURE_NATURAL_TYPES = Object.freeze({
  "thornhide-trufflehog": ["wild", "verdant"], "orchard-glider": ["wild", "sky"], "petalmask-tanuki": ["wild", "dream", "verdant"],
  "ironbeak-magpie": ["sky", "metal", "wild"], "hearthback-badger": ["wild", "stone"], "sunfoil-pangolin": ["wild", "metal", "radiant"],
  "glassstep-jerboa": ["wild", "stone"], "stormcrest-ibex": ["wild", "stone", "storm"], "cindercoil-gecko": ["wild", "flame", "stone"],
  "cloudkite-pika": ["wild", "sky", "echo"], "briarclaw-lynx": ["wild", "verdant"], "gravebell-jackal": ["wild", "spirit", "umbral"],
  "cragglass-basilisk": ["wild", "stone", "arcane"], "stormglass-roclet": ["sky", "storm", "stone"], "brinewhisk-otter": ["wild", "tide"],
  "riverwright-beaver": ["wild", "tide", "verdant"], "mirecrown-crane": ["sky", "tide", "verdant"], "inkveil-cuttle": ["tide", "umbral", "dream"],
  "prismclaw-mantis-shrimp": ["tide", "stone", "radiant"], "reefmender-shrimp": ["tide", "verdant", "radiant"], "currentweaver-eel": ["tide"],
  "shellcarrier-hermit": ["wild", "tide", "stone"], "wreckwhistle-porpoise": ["wild", "tide", "echo"], "kilnscale-salamander": ["wild", "flame", "stone"],
  "sporeback-gardener": ["verdant", "wild", "venom"], "voidmantle-ray": ["sky", "umbral", "tide"], "fossilback-trilobite": ["stone", "tide", "wild"],
  "ilyr-virebloom": ["verdant", "tide", "dream", "radiant", "spirit"], thalassene: ["tide", "stone", "verdant", "radiant"],
  orichalc: ["metal", "stone"], "varkesh-stormmane": ["sky", "storm", "wild"], kharza: ["wild", "umbral", "metal"],
  "sugarwake-sovereign": ["confection", "arcane", "flame"], asterjaw: ["sky", "radiant", "spirit"],
  "vellum-warden": ["arcane", "dream", "spirit"], "choir-of-one": ["hush", "echo", "umbral"], "glasswake-stag": ["mirror", "tide", "dream"],
  "bellstep-qilin": ["radiant", "echo", "wild"], "aerolith-baleen": ["sky", "stone", "spirit"],
  "mireglass-kelpie": ["tide", "mirror", "umbral"], "cinderwing-pyrausta": ["flame", "sky", "arcane"],
  "nacre-gatewyrm": ["tide", "draconic", "arcane"], "frostcauldron-behemoth": ["frost", "stone", "wild"],
  "briarcrown-manticore": ["wild", "verdant", "venom"], ammonarch: ["stone", "tide", "arcane"],
  "handtail-ahuizotl": ["tide", "wild", "spirit"], "tideclock-cetus": ["tide", "spirit", "metal"],
  "anemoi-gryphon": ["sky", "storm", "wild"], "sable-gorgon": ["stone", "venom", "mirror"],
  "namarra-makara": ["tide", "radiant", "spirit"], "ashen-salamander-king": ["flame", "arcane", "draconic"],
  "mycelial-oneirophant": ["dream", "verdant", "spirit"],
} as const satisfies Readonly<Record<ExpansionCreatureKind, readonly CreatureTypeId[]>>);

const EXPANSION_ECOLOGY_ROLES = Object.freeze({
  "thornhide-trufflehog": ["forager", "seed-spreader"], "orchard-glider": ["scout", "seed-spreader"], "petalmask-tanuki": ["scout", "companion"],
  "ironbeak-magpie": ["retriever", "scout"], "hearthback-badger": ["burrower", "guardian"], "sunfoil-pangolin": ["research", "guardian"],
  "glassstep-jerboa": ["burrower", "scout"], "stormcrest-ibex": ["mount", "guardian"], "cindercoil-gecko": ["research", "sentinel"],
  "cloudkite-pika": ["scout", "guardian"], "briarclaw-lynx": ["predator", "guardian"], "gravebell-jackal": ["scavenger", "guardian"],
  "cragglass-basilisk": ["predator", "research"], "stormglass-roclet": ["mount", "guardian"], "brinewhisk-otter": ["retriever", "companion"],
  "riverwright-beaver": ["worker", "restorer"], "mirecrown-crane": ["scout", "restorer"], "inkveil-cuttle": ["research", "ambient"],
  "prismclaw-mantis-shrimp": ["research", "predator"], "reefmender-shrimp": ["reef-helper", "healer"], "currentweaver-eel": ["research", "sentinel"],
  "shellcarrier-hermit": ["scavenger", "worker"], "wreckwhistle-porpoise": ["mount", "guardian"], "kilnscale-salamander": ["worker", "research"],
  "sporeback-gardener": ["worker", "restorer"], "voidmantle-ray": ["mount", "scout"], "fossilback-trilobite": ["research", "ambient"],
  "ilyr-virebloom": ["mount", "restorer", "boss"], thalassene: ["mount", "reef-helper", "boss"], orichalc: ["construct", "research", "boss"],
  "varkesh-stormmane": ["mount", "guardian", "boss"], kharza: ["mount", "predator", "boss"], "sugarwake-sovereign": ["guardian", "worker", "boss"],
  asterjaw: ["scout", "guardian"], "vellum-warden": ["guardian", "healer"], "choir-of-one": ["sentinel", "research"], "glasswake-stag": ["mount", "guardian"],
  "bellstep-qilin": ["mount", "scout", "guardian"], "aerolith-baleen": ["mount", "restorer", "guardian"],
  "mireglass-kelpie": ["mount", "scout", "predator"], "cinderwing-pyrausta": ["guardian", "healer", "research"],
  "nacre-gatewyrm": ["mount", "guardian", "restorer"], "frostcauldron-behemoth": ["mount", "guardian", "worker"],
  "briarcrown-manticore": ["mount", "predator", "guardian"], ammonarch: ["guardian", "research", "restorer"],
  "handtail-ahuizotl": ["retriever", "companion", "guardian"], "tideclock-cetus": ["mount", "scout", "guardian"],
  "anemoi-gryphon": ["mount", "predator", "boss"], "sable-gorgon": ["guardian", "research", "boss"],
  "namarra-makara": ["mount", "guardian", "boss"], "ashen-salamander-king": ["worker", "research", "boss"],
  "mycelial-oneirophant": ["mount", "restorer", "boss"],
} as const satisfies Readonly<Record<ExpansionCreatureKind, readonly EcologyRole[]>>);

function typePair(definition: MobDefinition): readonly CreatureTypeId[] {
  const expansion = EXPANSION_CREATURE_NATURAL_TYPES[definition.kind as ExpansionCreatureKind];
  if (expansion) return expansion;
  const exact = EXACT_TYPES[definition.kind];
  if (exact) return Object.freeze([...new Set(exact)]);
  if (definition.family === "sentient") {
    if (definition.culture === "atlantians") return Object.freeze(["tide", "neutral"]);
    if (definition.culture === "sugarcourt") return Object.freeze(["confection", "neutral"]);
    if (definition.culture === "wood-elves") return Object.freeze(["verdant", "arcane"]);
    if (definition.culture === "dwarves") return Object.freeze(["stone", "metal"]);
    return Object.freeze(["neutral", "wild"]);
  }
  if (definition.family === "construct") return Object.freeze(["metal", "stone"]);
  if (definition.family === "undead") return Object.freeze(["spirit", "umbral"]);
  if (definition.family === "sea-slug") return Object.freeze(["tide", "venom"]);
  if (definition.family === "fish" || definition.aquatic || definition.movement === "aquatic") {
    return Object.freeze(["tide", "wild"]);
  }
  if (definition.family === "bird" || definition.flying) return Object.freeze(["sky", "wild"]);
  if (definition.family === "butterfly") return Object.freeze(["sky", "wild"]);
  if (definition.family === "pet") return Object.freeze(["wild", "neutral"]);
  return Object.freeze(["wild", "neutral"]);
}

function captureProfile(definition: MobDefinition): CaptureProfileId {
  const authored = AUTHORED_CREATURE_CAPTURE_SHEETS[definition.kind as ExpansionCreatureKind];
  if (authored) return authored.profileId;
  if (definition.sentient || definition.family === "sentient" || definition.family === "construct" || definition.family === "undead") return "uncapturable";
  if (definition.family === "legendary" || definition.family === "dragon" || definition.family === "leviathan" || definition.health >= 180) return "legendary";
  if (definition.aquatic || definition.family === "fish" || definition.family === "sea-slug") return "aquatic";
  if (definition.hostile) return definition.radius >= 0.75 ? "territorial" : "pursuit";
  if (definition.radius >= 0.8) return "armored";
  if (definition.temperament === "Skittish") return "gentle";
  return "open";
}

function ecologyRoles(definition: MobDefinition): readonly EcologyRole[] {
  const roles = new Set<EcologyRole>();
  if (definition.family === "sentient") roles.add("citizen");
  if (definition.family === "construct") roles.add("construct");
  if (definition.family === "pollinator" || definition.family === "butterfly") roles.add("pollinator");
  if (definition.family === "fish" || definition.family === "sea-slug") roles.add(definition.bottomDweller ? "reef-helper" : "filter-feeder");
  if (definition.family === "rabbit") roles.add("burrower");
  if (definition.hostile) roles.add("sentinel");
  else if (!definition.sentient && definition.family !== "construct") roles.add("ambient");
  if (definition.rideable) roles.add("mount");
  if (definition.tameable) roles.add("companion");
  if (definition.family === "dragon" || definition.family === "leviathan") roles.add("boss");
  return Object.freeze([...roles]);
}

function researchClues(definition: MobDefinition): readonly string[] {
  const clues = [definition.discoveryHint ?? `Search ${definition.habitat.toLowerCase()} for tracks, calls, or disturbed flora.`];
  if (definition.diet?.length || definition.tameItems?.length) clues.push("Observe it feeding to reveal care and capture alternatives.");
  if (definition.active) clues.push(`Most active: ${definition.active}.`);
  return Object.freeze(clues);
}

export const EXPANSION_CREATURE_ORDER: readonly ExpansionCreatureKind[] = Object.freeze([
  ...LIVING_ROSTER_ORDER, ...LEGENDARY_CREATURE_ORDER, ...SUMMONED_CREATURE_ORDER,
]);

function makeCreatureContentSheet(kind: ExpansionCreatureKind): CreatureContentSheet {
  const stats = EXPANSION_CREATURE_STAT_SEEDS[kind];
  const moves = EXPANSION_CREATURE_MOVE_SHEETS[kind];
  const capture = AUTHORED_CREATURE_CAPTURE_SHEETS[kind];
  const ecology = CREATURE_ECOLOGY_CONTRACTS[kind];
  const rarity = EXPANSION_CREATURE_RARITY_POLICIES[kind];
  const naturalTypes = EXPANSION_CREATURE_NATURAL_TYPES[kind];
  if (!stats || !moves || !capture || !ecology || !rarity || !naturalTypes) throw new Error(`${kind} has an incomplete authored creature sheet.`);
  const clues = Object.freeze([capture.microHook, ecology.workBehavior, ...capture.careClues]);
  return Object.freeze({
    stableId: kind, naturalTypes, stats, moves, capture, ecology, rarity,
    ecologyRoles: EXPANSION_ECOLOGY_ROLES[kind], researchClues: clues,
  });
}

/** One exhaustive, cross-module completion-sheet registry for the 37-creature expansion. */
export const CREATURE_CONTENT_SHEETS: Readonly<Record<ExpansionCreatureKind, CreatureContentSheet>> = Object.freeze(
  Object.fromEntries(EXPANSION_CREATURE_ORDER.map((kind) => [kind, makeCreatureContentSheet(kind)])) as Record<ExpansionCreatureKind, CreatureContentSheet>,
);

function makeProfile(kind: MobKind): CreatureProfile {
  const definition = MOB_DEFS[kind];
  if (isMorrowMobKind(kind)) return Object.freeze({
    kind, naturalTypes: EXACT_TYPES[kind]!, stats: creatureStatProfile(kind, definition),
    moves: authoredMoveSetForKind(kind)!, captureProfile: kind === "vacuum-lantern" ? "uncapturable" : kind === "slatefin-burrower" ? "armored" : "gentle",
    ecologyRoles: Object.freeze([kind === "rillehopper" ? "grazer" : kind === "slatefin-burrower" ? "burrower" : kind === "morrow-owl" ? "scout" : "research"] as EcologyRole[]),
    researchClues: Object.freeze([definition.behavior, definition.discoveryHint ?? definition.habitat, ...(definition.fieldNotes ?? []).map(note => note.text)]),
    authorship: "explicit" as const,
  });
  const authoredSheet = CREATURE_CONTENT_SHEETS[kind as ExpansionCreatureKind];
  if (authoredSheet) return Object.freeze({
    kind, naturalTypes: authoredSheet.naturalTypes,
    stats: Object.freeze({ kind, ...authoredSheet.stats }),
    moves: Object.freeze({
      basicMoveId: authoredSheet.moves.basicMoveId, unlocks: authoredSheet.moves.unlocks,
      fieldUtilityMoveId: authoredSheet.moves.fieldUtilityMoveId, passiveStanceMoveId: authoredSheet.moves.passiveStanceMoveId,
    }),
    captureProfile: authoredSheet.capture.profileId, ecologyRoles: authoredSheet.ecologyRoles,
    researchClues: authoredSheet.researchClues, authorship: "explicit" as const,
  });
  const naturalTypes = typePair(definition);
  return Object.freeze({
    kind,
    naturalTypes,
    stats: creatureStatProfile(kind, definition),
    moves: authoredMoveSetForKind(kind) ?? defaultMoveSetForTypes(naturalTypes),
    captureProfile: captureProfile(definition),
    ecologyRoles: ecologyRoles(definition),
    researchClues: researchClues(definition),
    authorship: "legacy-family-fallback" as const,
  });
}

export const CREATURE_PROFILES: Readonly<Record<MobKind, CreatureProfile>> = Object.freeze(Object.fromEntries(MOB_ORDER.map((kind) => [kind, makeProfile(kind)])) as Record<MobKind, CreatureProfile>);

export function creatureProfile(kind: MobKind) {
  return CREATURE_PROFILES[kind];
}

export function validateCreatureProfiles(): readonly string[] {
  const errors: string[] = [];
  for (const kind of MOB_ORDER) {
    const profile = CREATURE_PROFILES[kind];
    if (!profile) { errors.push(`${kind}: missing creature profile.`); continue; }
    if (!profile.naturalTypes.length) errors.push(`${kind}: missing natural type.`);
    if (!profile.moves.basicMoveId) errors.push(`${kind}: missing basic move.`);
    if (profile.moves.unlocks.length < 4) errors.push(`${kind}: fewer than four level moves.`);
    if (profile.moves.unlocks.filter((unlock) => unlock.moveId !== profile.moves.basicMoveId).length < 3) errors.push(`${kind}: fewer than three progression moves.`);
    if (!profile.captureProfile) errors.push(`${kind}: missing capture profile.`);
    if (!profile.ecologyRoles.length) errors.push(`${kind}: missing ecology role.`);
    if (!profile.researchClues.length) errors.push(`${kind}: missing research clue.`);
  }
  for (const kind of EXPANSION_CREATURE_ORDER) {
    const sheet = CREATURE_CONTENT_SHEETS[kind];
    if (!sheet || CREATURE_PROFILES[kind].authorship !== "explicit") errors.push(`${kind}: expansion content is not explicit.`);
    if (sheet?.stableId !== kind || sheet.capture.kind !== kind || sheet.moves.kind !== kind || sheet.rarity.kind !== kind) errors.push(`${kind}: authored sheet IDs drifted.`);
    if (sheet?.ecology.authorship !== "explicit") errors.push(`${kind}: ecology still uses fallback authorship.`);
  }
  return Object.freeze(errors);
}

/** Compact developer-facing inspection used by the in-game debug pane and audits. */
export function inspectCreatureProfile(kind: MobKind, level = 1, sources: readonly CreatureTypeSource[] = [], nowSeconds = 0) {
  const profile = creatureProfile(kind);
  const resolved = resolveCreatureTypes(profile.naturalTypes, sources, nowSeconds);
  return Object.freeze({
    kind,
    name: MOB_DEFS[kind].name,
    level: Math.max(1, Math.min(profile.stats.maximumLevel, Math.floor(level))),
    naturalTypes: Object.freeze(profile.naturalTypes.map((type) => CREATURE_TYPES[type].name)),
    currentTypes: Object.freeze(resolved.types.map((type) => CREATURE_TYPES[type].name)),
    typeSources: resolved.sources,
    revisionKey: resolved.revisionKey,
    stats: profile.stats,
    basicMoveId: profile.moves.basicMoveId,
    progressionMoves: profile.moves.unlocks,
    captureProfile: profile.captureProfile,
    ecologyRoles: profile.ecologyRoles,
  });
}
