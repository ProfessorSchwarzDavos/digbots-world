import { CREATURE_TYPE_IDS, type CreatureTypeId, type TypedEffectPacket } from "./creature-types";
import type { LegendaryCreatureKind, LivingRosterKind, SummonedCreatureKind } from "./mobs";

export type MoveChannel = "physical" | "magical" | "mixed" | "healing" | "control" | "traversal" | "field" | "stance";
export type MoveTargetRule = "self" | "ally" | "hostile" | "point" | "area";
export type MoveShape = "contact" | "line" | "cone" | "circle" | "arc" | "dash";
export type CreatureStatusId = "burning" | "chilled" | "soaked" | "shocked" | "rooted" | "poisoned" | "dazzled" | "veiled" | "fractured" | "hushed" | "inspired" | "guarded";
export type CreatureReactionId = "conductive" | "shatter" | "steamveil" | "brushfire" | "breach" | "revealed" | "broken-silence" | "concord";
export type MoveAiTag = "basic" | "opener" | "finisher" | "defense" | "support" | "mobility" | "control" | "signature" | "field-utility";

export type CreatureMoveDefinition = Readonly<{
  id: string;
  name: string;
  description: string;
  type: CreatureTypeId;
  packets: readonly TypedEffectPacket[];
  channel: MoveChannel;
  target: MoveTargetRule;
  shape: MoveShape;
  range: number;
  radius: number;
  verticalTolerance: number;
  windupSeconds: number;
  activeSeconds: number;
  recoverySeconds: number;
  cooldownSeconds: number;
  power: number;
  exertionCost: number;
  interruptible: boolean;
  superArmor: boolean;
  requiresLineOfSight: boolean;
  mountedUse: boolean;
  friendlyFire: boolean;
  worldImpact: "none" | "visual" | "soft";
  appliesStatus?: CreatureStatusId;
  statusDurationSeconds?: number;
  aiTags: readonly MoveAiTag[];
  telegraph: string;
  soundCue: string;
}>;

export type CreatureMoveUnlock = Readonly<{ moveId: string; level: number; bondTier?: "trusted" | "partnered" | "kindred" }>;
export type CreatureMoveSet = Readonly<{
  basicMoveId: string;
  unlocks: readonly CreatureMoveUnlock[];
  fieldUtilityMoveId: string;
  passiveStanceMoveId: string;
}>;

export type ExpansionCreatureKind = LivingRosterKind | LegendaryCreatureKind | SummonedCreatureKind;

type AuthoredMoveDraft = Readonly<{
  id: string;
  name: string;
  description: string;
  type: CreatureTypeId;
  channel: MoveChannel;
  target: MoveTargetRule;
  shape: MoveShape;
  range: number;
  radius: number;
  verticalTolerance: number;
  timing: readonly [windup: number, active: number, recovery: number, cooldown: number];
  power: number;
  exertionCost: number;
  aiTags: readonly MoveAiTag[];
  telegraph: string;
  appliesStatus?: CreatureStatusId;
  statusDurationSeconds?: number;
  packets?: readonly TypedEffectPacket[];
  interruptible?: boolean;
  superArmor?: boolean;
  requiresLineOfSight?: boolean;
  mountedUse?: boolean;
  worldImpact?: "none" | "visual" | "soft";
}>;

export type AuthoredCreatureMoveSheet = Readonly<{
  kind: ExpansionCreatureKind;
  basicMoveId: string;
  unlocks: readonly CreatureMoveUnlock[];
  fieldUtilityMoveId: string;
  passiveStanceMoveId: string;
  moves: readonly CreatureMoveDefinition[];
}>;

export type CreatureStatusDefinition = Readonly<{
  id: CreatureStatusId;
  name: string;
  description: string;
  maximumStacks: number;
  maximumDurationSeconds: number;
  harmful: boolean;
  typeStepModifiers?: Partial<Record<CreatureTypeId, number>>;
}>;

export type CreatureReactionDefinition = Readonly<{
  id: CreatureReactionId;
  name: string;
  setupStatus: CreatureStatusId;
  followupTypes: readonly CreatureTypeId[];
  followupChannels?: readonly MoveChannel[];
  consumesSetup: boolean;
  cooldownSeconds: number;
  description: string;
}>;

const typeTitle = (id: CreatureTypeId) => id.charAt(0).toUpperCase() + id.slice(1);
const tags = (...values: MoveAiTag[]) => Object.freeze(values);
const TYPE_VERBS: Readonly<Record<CreatureTypeId, readonly [string, string, string, string]>> = Object.freeze({
  neutral: ["Body Check", "Steady Rush", "Brace", "Forage Sense"],
  wild: ["Claw and Hoof", "Pack Rush", "Bristle Guard", "Trail Sense"],
  verdant: ["Vine Snap", "Briar Surge", "Rootguard", "Greenkeeping"],
  sky: ["Wing Buffet", "Gale Dive", "Updraft Veil", "Far Sight"],
  tide: ["Current Slap", "Riptide Rush", "Foamguard", "Waterfinding"],
  stone: ["Shell Bash", "Faultline Charge", "Bedrock Brace", "Ore Sense"],
  flame: ["Ember Bite", "Cinder Rush", "Heat Mantle", "Kindle"],
  frost: ["Rime Snap", "Hoarfrost Rush", "Iceguard", "Snowtrace"],
  storm: ["Static Jab", "Thunder Rush", "Stormguard", "Weather Sense"],
  metal: ["Iron Strike", "Gearline Charge", "Plate Guard", "Salvage Sense"],
  venom: ["Venom Nip", "Toxic Lunge", "Irritant Veil", "Toxin Sense"],
  radiant: ["Sunflash", "Dawn Rush", "Halo Guard", "Lantern Heart"],
  umbral: ["Shade Cut", "Gloam Rush", "Night Veil", "Dark Sight"],
  spirit: ["Soul Tap", "Ancestor Rush", "Memory Ward", "Spirit Sense"],
  arcane: ["Rune Bolt", "Sigil Rush", "Aegis Script", "Rune Reading"],
  draconic: ["Sovereign Claw", "Dragon Rush", "Scale Ward", "Ancient Sense"],
  confection: ["Sugar Snap", "Syrup Rush", "Candycoat", "Sweetfinding"],
  echo: ["Resonant Cry", "Soundbreak Rush", "Echo Ward", "Call Reading"],
  dream: ["Reverie Touch", "Dreamrush", "Lucid Veil", "Dreamsense"],
  hush: ["Silent Cut", "Null Rush", "Quiet Ward", "Silence Sense"],
  mirror: ["Glass Gleam", "Refraction Rush", "Mirror Ward", "Reflection Step"],
});

const TYPE_STATUS: Partial<Record<CreatureTypeId, CreatureStatusId>> = Object.freeze({
  flame: "burning", frost: "chilled", tide: "soaked", storm: "shocked", verdant: "rooted", venom: "poisoned",
  radiant: "dazzled", umbral: "veiled", stone: "fractured", hush: "hushed", spirit: "inspired", metal: "guarded",
});

function makeTypeMoves(type: CreatureTypeId): readonly CreatureMoveDefinition[] {
  const names = TYPE_VERBS[type];
  const status = TYPE_STATUS[type];
  const prefix = type;
  return Object.freeze([
    Object.freeze({
      id: `${prefix}-basic`, name: names[0], description: `A fast, readable ${typeTitle(type)}-aligned basic action.`, type,
      packets: Object.freeze([{ type, share: 1 }]), channel: type === "arcane" || type === "spirit" || type === "dream" ? "magical" : "physical",
      target: "hostile", shape: type === "sky" || type === "arcane" || type === "echo" ? "line" : "contact",
      range: type === "sky" || type === "arcane" || type === "echo" ? 5.5 : 1.65, radius: 0.55, verticalTolerance: 1.75,
      windupSeconds: 0.22, activeSeconds: 0.12, recoverySeconds: 0.32, cooldownSeconds: 0.8, power: 0.72, exertionCost: 0,
      interruptible: true, superArmor: false, requiresLineOfSight: true, mountedUse: true, friendlyFire: false, worldImpact: "none",
      aiTags: tags("basic"), telegraph: "Short body or casting tell", soundCue: `${type}-light`,
    }),
    Object.freeze({
      id: `${prefix}-surge`, name: names[1], description: `Commits to a stronger ${typeTitle(type)} attack with a clear windup.`, type,
      packets: Object.freeze([{ type, share: 1 }]), channel: type === "arcane" || type === "radiant" || type === "umbral" || type === "dream" ? "magical" : "physical",
      target: "hostile", shape: "dash", range: 4.5, radius: 0.85, verticalTolerance: 2,
      windupSeconds: 0.58, activeSeconds: 0.22, recoverySeconds: 0.68, cooldownSeconds: 5.2, power: 1.3, exertionCost: 14,
      interruptible: true, superArmor: false, requiresLineOfSight: true, mountedUse: true, friendlyFire: false, worldImpact: "visual",
      appliesStatus: status, statusDurationSeconds: status ? 4.5 : undefined,
      aiTags: tags("opener", "finisher", "mobility"), telegraph: `Gathering ${typeTitle(type)} motes and a planted stance`, soundCue: `${type}-surge`,
    }),
    Object.freeze({
      id: `${prefix}-guard`, name: names[2], description: `Adopts a brief ${typeTitle(type)} defensive stance.`, type,
      packets: Object.freeze([{ type, share: 1 }]), channel: "stance", target: "self", shape: "circle", range: 0, radius: 1.4, verticalTolerance: 1,
      windupSeconds: 0.34, activeSeconds: 1.6, recoverySeconds: 0.28, cooldownSeconds: 8, power: 0, exertionCost: 8,
      interruptible: true, superArmor: true, requiresLineOfSight: false, mountedUse: false, friendlyFire: false, worldImpact: "visual",
      appliesStatus: "guarded", statusDurationSeconds: 4,
      aiTags: tags("defense", "support"), telegraph: `Distinct ${typeTitle(type)} guard posture`, soundCue: `${type}-guard`,
    }),
    Object.freeze({
      id: `${prefix}-utility`, name: names[3], description: `A non-destructive ${typeTitle(type)} field skill used for exploration and creature work.`, type,
      packets: Object.freeze([{ type, share: 1 }]), channel: "field", target: "point", shape: "circle", range: 7, radius: 2.5, verticalTolerance: 3,
      windupSeconds: 0.4, activeSeconds: 0.8, recoverySeconds: 0.3, cooldownSeconds: 4, power: 0, exertionCost: 4,
      interruptible: true, superArmor: false, requiresLineOfSight: true, mountedUse: true, friendlyFire: false, worldImpact: "soft",
      aiTags: tags("field-utility", "support"), telegraph: `Small ${typeTitle(type)}-marked search ring`, soundCue: `${type}-utility`,
    }),
  ]);
}

type AuthoredMoveSheetDraft = Readonly<{
  basic: string;
  unlocks: readonly (readonly [id: string, level: number, bondTier?: "trusted" | "partnered" | "kindred"])[];
  fieldUtility: string;
  passiveStance: string;
  moves: readonly AuthoredMoveDraft[];
}>;

const authored = (draft: AuthoredMoveDraft) => draft;

function defineExpansionMoveSheet<K extends ExpansionCreatureKind>(kind: K, draft: AuthoredMoveSheetDraft): AuthoredCreatureMoveSheet {
  const id = (localId: string) => `${kind}--${localId}`;
  const moves = draft.moves.map((move): CreatureMoveDefinition => Object.freeze({
    id: id(move.id), name: move.name, description: move.description, type: move.type,
    packets: Object.freeze(move.packets?.map((packet) => Object.freeze({ ...packet })) ?? [{ type: move.type, share: 1 }]),
    channel: move.channel, target: move.target, shape: move.shape, range: move.range, radius: move.radius,
    verticalTolerance: move.verticalTolerance, windupSeconds: move.timing[0], activeSeconds: move.timing[1],
    recoverySeconds: move.timing[2], cooldownSeconds: move.timing[3], power: move.power, exertionCost: move.exertionCost,
    interruptible: move.interruptible ?? move.channel !== "stance", superArmor: move.superArmor ?? move.channel === "stance",
    requiresLineOfSight: move.requiresLineOfSight ?? !["self", "area"].includes(move.target),
    mountedUse: move.mountedUse ?? false, friendlyFire: false, worldImpact: move.worldImpact ?? (move.channel === "field" ? "soft" : move.power > 0 ? "visual" : "none"),
    appliesStatus: move.appliesStatus, statusDurationSeconds: move.statusDurationSeconds,
    aiTags: Object.freeze([...move.aiTags]), telegraph: move.telegraph, soundCue: `${kind}-${move.id}`,
  }));
  const moveIds = new Set(moves.map((move) => move.id));
  for (const localId of [draft.basic, draft.fieldUtility, draft.passiveStance, ...draft.unlocks.map(([unlockId]) => unlockId)]) {
    if (!moveIds.has(id(localId))) throw new Error(`${kind} references missing authored move ${localId}.`);
  }
  return Object.freeze({
    kind, basicMoveId: id(draft.basic),
    unlocks: Object.freeze(draft.unlocks.map(([localId, level, bondTier]) => Object.freeze({ moveId: id(localId), level, ...(bondTier ? { bondTier } : {}) }))),
    fieldUtilityMoveId: id(draft.fieldUtility), passiveStanceMoveId: id(draft.passiveStance), moves: Object.freeze(moves),
  });
}

type MythicFrontierMoveSeed = Readonly<{
  types: readonly [CreatureTypeId, CreatureTypeId, CreatureTypeId, CreatureTypeId];
  moves: readonly [
    readonly [name: string, level: number],
    readonly [name: string, level: number],
    readonly [name: string, level: number],
    readonly [name: string, level: number, bondTier?: "trusted" | "partnered" | "kindred"]
  ];
  mounted?: boolean;
}>;

function defineMythicFrontierMoveSheet<K extends ExpansionCreatureKind>(kind: K, seed: MythicFrontierMoveSeed) {
  const localId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  const ids = seed.moves.map(([name]) => localId(name)) as [string, string, string, string];
  const [basicName, stanceName, utilityName, signatureName] = seed.moves.map(([name]) => name);
  return defineExpansionMoveSheet(kind, {
    basic: ids[0], passiveStance: ids[1], fieldUtility: ids[2],
    unlocks: seed.moves.map(([name, level, bondTier]) => [localId(name), level, bondTier] as const),
    moves: [
      authored({ id: ids[0], name: basicName, description: `${basicName} is the creature's readable close-range contest action, committed only after its full body tell.`, type: seed.types[0], channel: "physical", target: "hostile", shape: "contact", range: 2.4, radius: 1.1, verticalTolerance: 2.4, timing: [.48, .18, .58, 1.25], power: .92, exertionCost: 0, aiTags: ["basic"], telegraph: `The ${basicName.toLowerCase()} posture travels from the rear anchor through the head before impact.`, mountedUse: seed.mounted ?? false }),
      authored({ id: ids[1], name: stanceName, description: `${stanceName} establishes the encounter's defensive or supportive posture without altering terrain.`, type: seed.types[1], channel: "stance", target: "area", shape: "circle", range: 0, radius: 3.6, verticalTolerance: 4, timing: [.72, 2.2, .5, 9], power: 0, exertionCost: 10, aiTags: ["defense", "support"], telegraph: `The silhouette settles into ${stanceName.toLowerCase()} and its authored focus lights in sequence.`, appliesStatus: "guarded", statusDurationSeconds: 6, mountedUse: seed.mounted ?? false }),
      authored({ id: ids[2], name: utilityName, description: `${utilityName} reads and changes only the authored encounter marker or bounded field target selected by the player.`, type: seed.types[2], channel: "field", target: "point", shape: "line", range: 8, radius: 2.2, verticalTolerance: 5, timing: [.9, 1.4, .45, 10.5], power: 0, exertionCost: 12, aiTags: ["field-utility", "support", "control"], telegraph: `A site-colored route identifies every valid target for ${utilityName.toLowerCase()} before it resolves.`, mountedUse: seed.mounted ?? false }),
      authored({ id: ids[3], name: signatureName, description: `${signatureName} is the earned signature action; it resolves the creature's site fantasy while preserving nonlethal and covenant outcomes.`, type: seed.types[3], channel: "traversal", target: "point", shape: "dash", range: 10, radius: 2.5, verticalTolerance: 7, timing: [1.1, .72, .85, 14], power: .78, exertionCost: 20, aiTags: ["signature", "mobility", "support"], telegraph: `Four distinct pulses complete before ${signatureName.toLowerCase()} commits to its validated route.`, mountedUse: seed.mounted ?? false }),
    ],
  });
}

/**
 * Completion-sheet move kits for every expansion creature. Every description,
 * type, target, shape, timing, status, and unlock is chosen directly; none is
 * inferred from its name or position in an array.
 */
export const EXPANSION_CREATURE_MOVE_SHEETS = Object.freeze({
  "thornhide-trufflehog": defineExpansionMoveSheet("thornhide-trufflehog", {
    basic: "root-toss", fieldUtility: "snuffle", passiveStance: "bramble-brace",
    unlocks: [["snuffle", 1], ["root-toss", 1], ["bramble-brace", 10], ["truffle-trail", 18, "trusted"]],
    moves: [
      authored({ id: "snuffle", name: "Snuffle", description: "Sweeps leaf litter for ripe fungi without uprooting the mycelium beneath it.", type: "verdant", channel: "field", target: "point", shape: "cone", range: 5.2, radius: 2.4, verticalTolerance: 1.2, timing: [.42, .8, .28, 3.6], power: 0, exertionCost: 3, aiTags: ["field-utility", "support"], telegraph: "Nose presses low while the thorn mantle lifts clear of the soil." }),
      authored({ id: "root-toss", name: "Root Toss", description: "Hooks a loose root with one tusk and flips it into a nearby threat.", type: "wild", channel: "physical", target: "hostile", shape: "arc", range: 2.3, radius: .75, verticalTolerance: 1.4, timing: [.31, .14, .4, 1.05], power: .78, exertionCost: 0, aiTags: ["basic"], telegraph: "One forehoof digs in before a short upward tusk sweep." }),
      authored({ id: "bramble-brace", name: "Bramble Brace", description: "Locks its thorny hide toward the attacker and holds ground for the herd.", type: "verdant", channel: "stance", target: "self", shape: "circle", range: 0, radius: 1.5, verticalTolerance: 1, timing: [.48, 1.7, .3, 7.5], power: 0, exertionCost: 8, aiTags: ["defense", "support"], telegraph: "Shoulders hunch and every back thorn angles outward.", appliesStatus: "guarded", statusDurationSeconds: 5.5 }),
      authored({ id: "truffle-trail", name: "Truffle Trail", description: "Marks an intact fungal route that allies can follow without trampling its fruiting bodies.", type: "verdant", channel: "field", target: "point", shape: "line", range: 8, radius: 1.1, verticalTolerance: 2, timing: [.55, 1.2, .3, 8], power: 0, exertionCost: 7, aiTags: ["signature", "field-utility"], telegraph: "Blackcap spores settle into a narrow, readable trail." }),
    ],
  }),
  "orchard-glider": defineExpansionMoveSheet("orchard-glider", {
    basic: "canopy-leap", fieldUtility: "fruitmark-call", passiveStance: "seed-carry",
    unlocks: [["canopy-leap", 1], ["seed-carry", 5], ["fruitmark-call", 10], ["slipstream", 28, "partnered"]],
    moves: [
      authored({ id: "canopy-leap", name: "Canopy Leap", description: "Springs from bark to shoulder-height in one membrane-braked strike.", type: "wild", channel: "physical", target: "hostile", shape: "dash", range: 3.8, radius: .48, verticalTolerance: 3, timing: [.18, .16, .34, .9], power: .69, exertionCost: 0, aiTags: ["basic", "mobility"], telegraph: "Hind feet compress and both gliding membranes flare." }),
      authored({ id: "seed-carry", name: "Seed Carry", description: "Folds a viable seed into its cheek pouch and shields it during travel.", type: "verdant", channel: "stance", target: "self", shape: "circle", range: 0, radius: .7, verticalTolerance: 1, timing: [.28, 1.1, .2, 4.5], power: 0, exertionCost: 2, aiTags: ["support"], telegraph: "Forepaws cup the seed while the tail settles as a windbreak.", appliesStatus: "guarded", statusDurationSeconds: 3 }),
      authored({ id: "fruitmark-call", name: "Fruitmark Call", description: "Chitters toward mature orchard fruit and leaves a bounded canopy marker.", type: "sky", channel: "field", target: "point", shape: "cone", range: 9, radius: 2.6, verticalTolerance: 5, timing: [.35, .7, .22, 5.5], power: 0, exertionCost: 4, aiTags: ["field-utility", "support"], telegraph: "Tail points downwind before three rising chirps." }),
      authored({ id: "slipstream", name: "Slipstream", description: "Glides through a safe gap and briefly draws a following ally onto the same line.", type: "sky", channel: "traversal", target: "point", shape: "dash", range: 6.8, radius: 1.1, verticalTolerance: 4, timing: [.26, .42, .5, 8.5], power: 0, exertionCost: 13, aiTags: ["signature", "mobility", "support"], telegraph: "The membrane edge turns silver as it tests the entire landing path." }),
    ],
  }),
  "petalmask-tanuki": defineExpansionMoveSheet("petalmask-tanuki", {
    basic: "petal-feint", fieldUtility: "borrowed-scent", passiveStance: "moonmask",
    unlocks: [["petal-feint", 1], ["false-trail", 5], ["moonmask", 18], ["borrowed-scent", 28, "trusted"]],
    moves: [
      authored({ id: "false-trail", name: "False Trail", description: "Lays a decoy track whose petals face the wrong way, drawing pursuit off an ally.", type: "dream", channel: "control", target: "point", shape: "line", range: 7, radius: 1.4, verticalTolerance: 2, timing: [.52, .7, .35, 7.2], power: 0, exertionCost: 8, aiTags: ["control", "support"], telegraph: "Its masked face turns aside while footprints appear ahead of it.", appliesStatus: "veiled", statusDurationSeconds: 4.5 }),
      authored({ id: "petal-feint", name: "Petal Feint", description: "Swats once through a burst of leaves, then sidesteps behind the obscuring mask.", type: "wild", channel: "physical", target: "hostile", shape: "contact", range: 1.55, radius: .58, verticalTolerance: 1.5, timing: [.24, .12, .33, .86], power: .7, exertionCost: 0, aiTags: ["basic"], telegraph: "The leaf mask tilts while one paw remains visibly planted.", appliesStatus: "veiled", statusDurationSeconds: 2.5 }),
      authored({ id: "moonmask", name: "Moonmask", description: "Holds a moonlit leaf mask still enough to soften hostile attention around itself.", type: "dream", channel: "stance", target: "self", shape: "circle", range: 0, radius: 2, verticalTolerance: 1.6, timing: [.64, 1.8, .4, 9], power: 0, exertionCost: 9, aiTags: ["defense", "control"], telegraph: "The mask becomes a clean crescent and the striped tail stops moving.", appliesStatus: "veiled", statusDurationSeconds: 6 }),
      authored({ id: "borrowed-scent", name: "Borrowed Scent", description: "Compares nearby tracks and identifies the one carrying real food, fear, or pollen.", type: "verdant", channel: "field", target: "point", shape: "circle", range: 7.5, radius: 3, verticalTolerance: 2.5, timing: [.75, 1.1, .3, 6.5], power: 0, exertionCost: 5, aiTags: ["signature", "field-utility"], telegraph: "It samples the air from three directions before choosing one trail." }),
    ],
  }),
  "ironbeak-magpie": defineExpansionMoveSheet("ironbeak-magpie", {
    basic: "peck", fieldUtility: "cachemark", passiveStance: "shiny-lure",
    unlocks: [["peck", 1], ["shiny-lure", 5], ["cachemark", 10], ["snatch-return", 18, "trusted"]],
    moves: [
      authored({ id: "shiny-lure", name: "Shiny Lure", description: "Angles pale metal feathers into a harmless flash that pulls a threat's gaze off cargo.", type: "metal", channel: "control", target: "hostile", shape: "cone", range: 5.2, radius: 1.8, verticalTolerance: 3, timing: [.36, .18, .42, 6], power: 0, exertionCost: 6, aiTags: ["opener", "control"], telegraph: "Wing coverts align into one bright, non-sparkling plane.", appliesStatus: "dazzled", statusDurationSeconds: 3.5 }),
      authored({ id: "peck", name: "Peck", description: "Drives its iron-edged beak in once and immediately regains flight balance.", type: "metal", channel: "physical", target: "hostile", shape: "contact", range: 1.35, radius: .36, verticalTolerance: 2.4, timing: [.16, .09, .29, .72], power: .64, exertionCost: 0, aiTags: ["basic"], telegraph: "Head draws straight back while the tail fans for balance." }),
      authored({ id: "cachemark", name: "Cachemark", description: "Taps a remembered cache or message-tube destination onto the local map.", type: "sky", channel: "field", target: "point", shape: "circle", range: 10, radius: 1.2, verticalTolerance: 6, timing: [.3, .55, .18, 4.8], power: 0, exertionCost: 3, aiTags: ["field-utility", "support"], telegraph: "Three beak taps answer a single directional wingbeat." }),
      authored({ id: "snatch-return", name: "Snatch-and-Return", description: "Lifts one light valid item and arcs back to its assigned keeper without stealing equipped gear.", type: "sky", channel: "traversal", target: "point", shape: "dash", range: 8, radius: .65, verticalTolerance: 5, timing: [.28, .5, .34, 7.5], power: 0, exertionCost: 11, aiTags: ["signature", "field-utility", "mobility"], telegraph: "Feet open before takeoff and the return arc appears as a thin feather trail." }),
    ],
  }),
  "hearthback-badger": defineExpansionMoveSheet("hearthback-badger", {
    basic: "root-rake", fieldUtility: "dig", passiveStance: "burrow-guard",
    unlocks: [["root-rake", 1], ["dig", 5], ["burrow-guard", 10], ["hearthstand", 28, "partnered"]],
    moves: [
      authored({ id: "dig", name: "Dig", description: "Excavates only loose authored soil and exposes shallow roots without cutting structures.", type: "stone", channel: "field", target: "point", shape: "circle", range: 2.2, radius: 1.1, verticalTolerance: 1, timing: [.58, 1.2, .4, 5], power: 0, exertionCost: 6, aiTags: ["field-utility"], telegraph: "Both foreclaws test the soil before the first full stroke." }),
      authored({ id: "root-rake", name: "Root Rake", description: "Rakes a short fan of roots and stones outward with both digging claws.", type: "wild", channel: "physical", target: "hostile", shape: "cone", range: 1.8, radius: 1.05, verticalTolerance: 1.2, timing: [.34, .16, .46, 1.1], power: .82, exertionCost: 0, aiTags: ["basic"], telegraph: "Chest drops close to earth and both elbows spread." }),
      authored({ id: "burrow-guard", name: "Burrow Guard", description: "Plants across a burrow mouth and absorbs the first shove aimed through it.", type: "stone", channel: "stance", target: "self", shape: "arc", range: 0, radius: 1.8, verticalTolerance: 1.2, timing: [.46, 2, .38, 8], power: 0, exertionCost: 8, aiTags: ["defense", "support"], telegraph: "Its warm back plates overlap and claws lock into the threshold.", appliesStatus: "guarded", statusDurationSeconds: 6 }),
      authored({ id: "hearthstand", name: "Hearthstand", description: "Refuses displacement beside a camp or den and steadies nearby smaller companions.", type: "wild", channel: "stance", target: "area", shape: "circle", range: 0, radius: 2.8, verticalTolerance: 1.8, timing: [.7, 2.4, .45, 11], power: 0, exertionCost: 12, aiTags: ["signature", "defense", "support"], telegraph: "A low warning rumble warms the back plates from tail to shoulders.", appliesStatus: "inspired", statusDurationSeconds: 6.5 }),
    ],
  }),
  "sunfoil-pangolin": defineExpansionMoveSheet("sunfoil-pangolin", {
    basic: "tongue-flick", fieldUtility: "mound-break", passiveStance: "scale-curl",
    unlocks: [["tongue-flick", 1], ["scale-curl", 5], ["sunfoil-flash", 18], ["mound-break", 28, "trusted"]],
    moves: [
      authored({ id: "tongue-flick", name: "Tongue Flick", description: "Snaps its long tongue at a tiny threat or loose insect lure without leaving its footing.", type: "wild", channel: "physical", target: "hostile", shape: "line", range: 3.1, radius: .28, verticalTolerance: 1.5, timing: [.2, .08, .36, .82], power: .58, exertionCost: 0, aiTags: ["basic"], telegraph: "The narrow muzzle opens and the tongue tip glints once." }),
      authored({ id: "scale-curl", name: "Scale Curl", description: "Rolls into an interlocked metal-scaled ball; capture becomes impossible until it willingly uncurls.", type: "metal", channel: "stance", target: "self", shape: "circle", range: 0, radius: 1.1, verticalTolerance: 1, timing: [.42, 2.4, .55, 9], power: 0, exertionCost: 7, aiTags: ["defense"], telegraph: "Tail wraps last, leaving a bright seam that closes visibly.", appliesStatus: "guarded", statusDurationSeconds: 7 }),
      authored({ id: "sunfoil-flash", name: "Sunfoil Flash", description: "Unfurls sun-warmed scales into a broad flash that interrupts hunters without burning habitat.", type: "radiant", channel: "control", target: "area", shape: "circle", range: 0, radius: 3.4, verticalTolerance: 2, timing: [.68, .22, .62, 9.5], power: .25, exertionCost: 11, aiTags: ["control", "signature"], telegraph: "Golden seams brighten in order from head to tail.", appliesStatus: "dazzled", statusDurationSeconds: 4 }),
      authored({ id: "mound-break", name: "Mound Break", description: "Opens a designated termite mound or brittle mineral crust, never an arbitrary player wall.", type: "stone", channel: "field", target: "point", shape: "contact", range: 1.35, radius: .75, verticalTolerance: 1, timing: [.78, .5, .7, 6.5], power: 0, exertionCost: 9, aiTags: ["field-utility"], telegraph: "Foreclaws brace while the armored shoulders line up with the marked crust." }),
    ],
  }),
  "glassstep-jerboa": defineExpansionMoveSheet("glassstep-jerboa", {
    basic: "sand-skip", fieldUtility: "burrow-sense", passiveStance: "dust-decoy",
    unlocks: [["sand-skip", 1], ["burrow-sense", 5], ["dust-decoy", 10], ["glassstep", 18, "trusted"]],
    moves: [
      authored({ id: "sand-skip", name: "Sand Skip", description: "Kicks once with both spring legs and lands beyond a close attacker.", type: "wild", channel: "physical", target: "hostile", shape: "dash", range: 2.8, radius: .42, verticalTolerance: 2.2, timing: [.14, .13, .3, .74], power: .61, exertionCost: 0, aiTags: ["basic", "mobility"], telegraph: "Long hind legs fold beneath the body while tiny forepaws tuck in." }),
      authored({ id: "burrow-sense", name: "Burrow Sense", description: "Listens through enlarged feet for occupied burrows and unstable crust ahead.", type: "stone", channel: "field", target: "point", shape: "circle", range: 7.5, radius: 2.2, verticalTolerance: 3, timing: [.48, .9, .2, 4.5], power: 0, exertionCost: 3, aiTags: ["field-utility", "support"], telegraph: "Both feet settle flat and the long ears point at the ground." }),
      authored({ id: "glassstep", name: "Glassstep", description: "Bounds across a short run of hot glass or brittle crust without stopping on it.", type: "stone", channel: "traversal", target: "point", shape: "dash", range: 6, radius: .45, verticalTolerance: 2.8, timing: [.18, .48, .36, 6.8], power: 0, exertionCost: 10, aiTags: ["signature", "mobility"], telegraph: "Each landing point flashes in sequence before the first jump." }),
      authored({ id: "dust-decoy", name: "Dust Decoy", description: "Flicks a body-shaped dust plume sideways, briefly Veiling its true landing.", type: "stone", channel: "control", target: "self", shape: "circle", range: 0, radius: 1.6, verticalTolerance: 1.4, timing: [.22, .25, .38, 5.6], power: 0, exertionCost: 6, aiTags: ["defense", "control"], telegraph: "Tail tip draws a tight circle through loose sand.", appliesStatus: "veiled", statusDurationSeconds: 3.5 }),
    ],
  }),
  "stormcrest-ibex": defineExpansionMoveSheet("stormcrest-ibex", {
    basic: "horn-check", fieldUtility: "fall-rescue", passiveStance: "static-coat",
    unlocks: [["horn-check", 1], ["cliffstep", 5], ["static-coat", 18], ["fall-rescue", 28, "partnered"]],
    moves: [
      authored({ id: "horn-check", name: "Horn Check", description: "Meets a close threat with one controlled sideways horn, keeping its cliff edge behind it.", type: "wild", channel: "physical", target: "hostile", shape: "arc", range: 1.9, radius: .82, verticalTolerance: 1.6, timing: [.3, .14, .44, .98], power: .83, exertionCost: 0, aiTags: ["basic"], telegraph: "One forehoof squares and the storm horn lowers across the body.", mountedUse: true }),
      authored({ id: "cliffstep", name: "Cliffstep", description: "Commits to a short ledge-to-ledge bound only after testing the landing plane.", type: "stone", channel: "traversal", target: "point", shape: "dash", range: 5.4, radius: .75, verticalTolerance: 4.2, timing: [.46, .35, .58, 5.8], power: 0, exertionCost: 10, aiTags: ["mobility"], telegraph: "The leading hoof taps twice and a safe landing outline answers.", mountedUse: true }),
      authored({ id: "static-coat", name: "Static Coat", description: "Raises a visible halo of charge that discourages contact without arcing through the herd.", type: "storm", channel: "stance", target: "self", shape: "circle", range: 0, radius: 1.6, verticalTolerance: 2, timing: [.58, 1.8, .4, 8.2], power: 0, exertionCost: 9, aiTags: ["defense", "control"], telegraph: "Guard hairs lift from shoulders to tail in one clear wave.", appliesStatus: "guarded", statusDurationSeconds: 5.5, mountedUse: true }),
      authored({ id: "fall-rescue", name: "Fall Rescue", description: "Braces below a falling ally and turns the impact into a controlled downhill slide.", type: "sky", channel: "traversal", target: "ally", shape: "dash", range: 6.2, radius: 1.4, verticalTolerance: 8, timing: [.32, .6, .72, 10], power: 0, exertionCost: 16, aiTags: ["signature", "support", "mobility"], telegraph: "It faces downhill and traces a broad blue landing fan.", mountedUse: true }),
    ],
  }),
  "cindercoil-gecko": defineExpansionMoveSheet("cindercoil-gecko", {
    basic: "ember-spit", fieldUtility: "heat-sense", passiveStance: "kiln-nap",
    unlocks: [["ember-spit", 1], ["heat-sense", 5], ["wall-cling", 10], ["kiln-nap", 18, "trusted"]],
    moves: [
      authored({ id: "heat-sense", name: "Heat Sense", description: "Reads a wall's temperature gradient and points toward dangerous pressure, not hidden loot.", type: "flame", channel: "field", target: "point", shape: "cone", range: 6.5, radius: 1.6, verticalTolerance: 4, timing: [.3, .75, .22, 4], power: 0, exertionCost: 3, aiTags: ["field-utility", "support"], telegraph: "Toe pads brighten one by one as the head follows the gradient." }),
      authored({ id: "ember-spit", name: "Ember Spit", description: "Flicks one seed-sized ember from a safe wall perch; it cannot ignite terrain.", type: "flame", channel: "magical", target: "hostile", shape: "line", range: 5.6, radius: .3, verticalTolerance: 4, timing: [.27, .08, .34, .9], power: .68, exertionCost: 0, aiTags: ["basic"], telegraph: "The throat turns orange and the jaw opens on the active frame.", appliesStatus: "burning", statusDurationSeconds: 2.5, worldImpact: "visual" }),
      authored({ id: "wall-cling", name: "Wall Cling", description: "Anchors all four toe fans to a marked surface and becomes a stationary heat alarm.", type: "stone", channel: "stance", target: "point", shape: "contact", range: 1.2, radius: .5, verticalTolerance: 2, timing: [.35, 1.6, .25, 3.5], power: 0, exertionCost: 2, aiTags: ["support", "field-utility"], telegraph: "The body flattens and four toe fans spread before contact." }),
      authored({ id: "kiln-nap", name: "Kiln Nap", description: "Curls beside a stable heat source, restoring exertion while signaling an unsafe gradient.", type: "flame", channel: "healing", target: "self", shape: "circle", range: 0, radius: 1, verticalTolerance: 1, timing: [.8, 2.6, .45, 12], power: 0, exertionCost: 0, aiTags: ["signature", "support"], telegraph: "Tail coils around the body and its dorsal tiles dim to steady coals.", appliesStatus: "inspired", statusDurationSeconds: 6 }),
    ],
  }),
  "cloudkite-pika": defineExpansionMoveSheet("cloudkite-pika", {
    basic: "updraft-pulse", fieldUtility: "warning-whistle", passiveStance: "wind-chime",
    unlocks: [["updraft-pulse", 1], ["wind-chime", 5], ["warning-whistle", 10], ["soft-landing", 28, "partnered"]],
    moves: [
      authored({ id: "wind-chime", name: "Wind Chime", description: "Tensions its hollow whiskers into a local chord that reports a safe wind direction.", type: "echo", channel: "stance", target: "area", shape: "circle", range: 0, radius: 3, verticalTolerance: 4, timing: [.42, 1.4, .24, 5.8], power: 0, exertionCost: 4, aiTags: ["support"], telegraph: "Whisker vanes align and sound from low to high." }),
      authored({ id: "updraft-pulse", name: "Updraft Pulse", description: "Claps broad ear-sails into a compact gust that bumps a close threat upward, not away over a cliff.", type: "sky", channel: "magical", target: "hostile", shape: "cone", range: 2.7, radius: 1.2, verticalTolerance: 2.4, timing: [.26, .12, .38, .92], power: .62, exertionCost: 0, aiTags: ["basic", "control"], telegraph: "Both ear-sails cup forward before the gust releases." }),
      authored({ id: "warning-whistle", name: "Warning Whistle", description: "Separates falling-stone, hostile, and storm warnings into three learned phrases.", type: "echo", channel: "field", target: "point", shape: "circle", range: 9, radius: 3, verticalTolerance: 6, timing: [.24, .55, .18, 4.2], power: 0, exertionCost: 3, aiTags: ["field-utility", "support"], telegraph: "The throat pouch holds one silent beat before the coded phrase." }),
      authored({ id: "soft-landing", name: "Soft Landing", description: "Links a short chain of updrafts into a visible descent lane for one nearby ally.", type: "sky", channel: "traversal", target: "ally", shape: "line", range: 7, radius: 1.5, verticalTolerance: 9, timing: [.55, 1, .5, 11], power: 0, exertionCost: 14, aiTags: ["signature", "support", "mobility"], telegraph: "Three pale wind rings descend before the route becomes usable." }),
    ],
  }),
  "briarclaw-lynx": defineExpansionMoveSheet("briarclaw-lynx", {
    basic: "rake", fieldUtility: "stalk", passiveStance: "vanish-cover",
    unlocks: [["rake", 1], ["stalk", 5], ["briar-pounce", 18], ["vanish-cover", 28, "partnered"]],
    moves: [
      authored({ id: "stalk", name: "Stalk", description: "Lowers its brush-fringed body and follows only tracks it can currently smell or see.", type: "wild", channel: "field", target: "point", shape: "line", range: 8.5, radius: 1.2, verticalTolerance: 3, timing: [.45, 1.2, .25, 5], power: 0, exertionCost: 4, aiTags: ["field-utility", "opener"], telegraph: "Ear tufts flatten and each paw chooses an exposed patch of ground." }),
      authored({ id: "briar-pounce", name: "Briar Pounce", description: "Launches from real cover with foreclaws wrapped in flexible thorn runners.", type: "verdant", channel: "physical", target: "hostile", shape: "dash", range: 4.6, radius: .75, verticalTolerance: 2.8, timing: [.58, .18, .62, 6.5], power: 1.22, exertionCost: 13, aiTags: ["opener", "finisher", "mobility"], telegraph: "The shoulders rise above the hips and nearby briars bend toward the target.", appliesStatus: "rooted", statusDurationSeconds: 2.2 }),
      authored({ id: "rake", name: "Rake", description: "Cuts once across a close target with the outer two claws, leaving room to disengage.", type: "wild", channel: "physical", target: "hostile", shape: "arc", range: 1.65, radius: .62, verticalTolerance: 1.7, timing: [.21, .11, .32, .8], power: .76, exertionCost: 0, aiTags: ["basic"], telegraph: "One paw lifts while the other three remain planted." }),
      authored({ id: "vanish-cover", name: "Vanish into Cover", description: "Breaks line of sight only when actual vegetation or snow cover is within one bound.", type: "verdant", channel: "traversal", target: "point", shape: "dash", range: 5.2, radius: .8, verticalTolerance: 2.5, timing: [.34, .3, .48, 8.5], power: 0, exertionCost: 10, aiTags: ["signature", "defense", "mobility"], telegraph: "The tail points at valid cover before the body coils to move.", appliesStatus: "veiled", statusDurationSeconds: 5 }),
    ],
  }),
  "gravebell-jackal": defineExpansionMoveSheet("gravebell-jackal", {
    basic: "spirit-nip", fieldUtility: "grave-scent", passiveStance: "relic-guard",
    unlocks: [["spirit-nip", 1], ["grave-scent", 5], ["bell-howl", 18], ["relic-guard", 28, "trusted"]],
    moves: [
      authored({ id: "grave-scent", name: "Grave Scent", description: "Separates old bone, active curse, and harmless memorial scents without naming hidden treasure.", type: "spirit", channel: "field", target: "point", shape: "cone", range: 8, radius: 2.2, verticalTolerance: 3, timing: [.52, .9, .28, 5.5], power: 0, exertionCost: 4, aiTags: ["field-utility", "support"], telegraph: "The bell under its throat remains silent while the nose traces three levels." }),
      authored({ id: "bell-howl", name: "Bell Howl", description: "Rings its throat bell through a howl that reveals Veiled undead and curse trails.", type: "echo", channel: "control", target: "area", shape: "circle", range: 0, radius: 5.2, verticalTolerance: 4, timing: [.72, .55, .6, 9], power: .28, exertionCost: 12, aiTags: ["control", "support"], telegraph: "The bell swings once without sound, then the jaw opens on the return arc." }),
      authored({ id: "spirit-nip", name: "Spirit Nip", description: "Bites through a manifested haunt while barely disturbing ordinary flesh.", type: "spirit", channel: "magical", target: "hostile", shape: "contact", range: 1.55, radius: .55, verticalTolerance: 1.6, timing: [.25, .1, .36, .88], power: .73, exertionCost: 0, aiTags: ["basic"], telegraph: "Teeth become briefly translucent before the short bite." }),
      authored({ id: "relic-guard", name: "Relic Guard", description: "Circles one assigned reliquary and braces against attempts to disturb its seal.", type: "umbral", channel: "stance", target: "area", shape: "circle", range: 0, radius: 2.8, verticalTolerance: 2, timing: [.5, 2.1, .4, 8.8], power: 0, exertionCost: 9, aiTags: ["signature", "defense"], telegraph: "Its bell points inward while the dark mane faces away from the relic.", appliesStatus: "guarded", statusDurationSeconds: 6 }),
    ],
  }),
  "cragglass-basilisk": defineExpansionMoveSheet("cragglass-basilisk", {
    basic: "heavy-bite", fieldUtility: "stonewake", passiveStance: "reflective-molt",
    unlocks: [["heavy-bite", 1], ["stonewake", 10], ["glass-gaze", 18], ["reflective-molt", 28, "partnered"]],
    moves: [
      authored({ id: "heavy-bite", name: "Heavy Bite", description: "Drives a broad crystal jaw forward while all six legs hold the recoil.", type: "wild", channel: "physical", target: "hostile", shape: "contact", range: 1.9, radius: .8, verticalTolerance: 1.7, timing: [.38, .14, .52, 1.15], power: .9, exertionCost: 0, aiTags: ["basic"], telegraph: "Six feet spread and the lower jaw catches reflected light." }),
      authored({ id: "glass-gaze", name: "Glass Gaze", description: "Projects a refracted stare that slows and Dazzles; it never permanently petrifies ordinary creatures.", type: "arcane", channel: "control", target: "hostile", shape: "line", range: 6.5, radius: .5, verticalTolerance: 2.5, timing: [.92, .35, .78, 10], power: .42, exertionCost: 14, aiTags: ["signature", "control"], telegraph: "The crown facets align one at a time before a narrow reflected beam forms.", appliesStatus: "dazzled", statusDurationSeconds: 5.5 }),
      authored({ id: "stonewake", name: "Stonewake", description: "Rolls a low ridge through loose ground, exposing cracked stone without breaking protected blocks.", type: "stone", channel: "field", target: "point", shape: "line", range: 7, radius: 1.25, verticalTolerance: 1.5, timing: [.7, .5, .68, 7], power: .35, exertionCost: 10, aiTags: ["field-utility", "control"], telegraph: "Its middle pair of legs stamp after the front and before the rear.", appliesStatus: "fractured", statusDurationSeconds: 4, worldImpact: "soft" }),
      authored({ id: "reflective-molt", name: "Reflective Molt", description: "Lifts one transparent scale layer into a short-lived ward against direct magic.", type: "arcane", channel: "stance", target: "self", shape: "circle", range: 0, radius: 1.6, verticalTolerance: 2, timing: [.66, 2.2, .5, 11], power: 0, exertionCost: 12, aiTags: ["defense"], telegraph: "A second silhouette separates visibly from the back plates.", appliesStatus: "guarded", statusDurationSeconds: 6.5 }),
    ],
  }),
  "stormglass-roclet": defineExpansionMoveSheet("stormglass-roclet", {
    basic: "gust-peck", fieldUtility: "carry-rescue", passiveStance: "static-wing",
    unlocks: [["gust-peck", 1], ["static-wing", 10], ["carry-rescue", 18, "trusted"], ["thunder-dive", 28, "partnered"]],
    moves: [
      authored({ id: "gust-peck", name: "Gust Peck", description: "Adds one balancing wingbeat to a sharp beak strike, then climbs clear.", type: "sky", channel: "physical", target: "hostile", shape: "dash", range: 2.9, radius: .58, verticalTolerance: 3.5, timing: [.22, .12, .38, .85], power: .72, exertionCost: 0, aiTags: ["basic", "mobility"], telegraph: "Beak, breast, and landing claw line up before the dive." }),
      authored({ id: "static-wing", name: "Static Wing", description: "Fans charged glass feathers into a defensive screen without arcing into a carried passenger.", type: "storm", channel: "stance", target: "self", shape: "arc", range: 0, radius: 2.1, verticalTolerance: 3, timing: [.48, 1.6, .42, 7.8], power: 0, exertionCost: 8, aiTags: ["defense"], telegraph: "One wing spreads edge-on as blue charge runs from shoulder to tip.", appliesStatus: "guarded", statusDurationSeconds: 5, mountedUse: true }),
      authored({ id: "carry-rescue", name: "Carry Rescue", description: "Grips one valid falling or stranded ally and carries them to a tested nearby perch.", type: "sky", channel: "traversal", target: "ally", shape: "dash", range: 8, radius: 1.1, verticalTolerance: 9, timing: [.4, .75, .65, 12], power: 0, exertionCost: 17, aiTags: ["support", "field-utility", "mobility"], telegraph: "Talons open and two valid landing perches flash before takeoff.", mountedUse: true }),
      authored({ id: "thunder-dive", name: "Thunder Dive", description: "The mature Roc folds into a charged descent and discharges only on the marked impact line.", type: "storm", channel: "physical", target: "hostile", shape: "dash", range: 8.5, radius: 1.4, verticalTolerance: 8, timing: [.86, .3, .9, 12.5], power: 1.45, exertionCost: 20, aiTags: ["signature", "finisher", "mobility"], telegraph: "Both wings lock, cloud feathers flare, and a ground ring marks the landing.", appliesStatus: "shocked", statusDurationSeconds: 4.5, mountedUse: true }),
    ],
  }),
  "brinewhisk-otter": defineExpansionMoveSheet("brinewhisk-otter", {
    basic: "shell-toss", fieldUtility: "dive-fetch", passiveStance: "playful-feint",
    unlocks: [["shell-toss", 1], ["dive-fetch", 5], ["playful-feint", 10], ["rescue-tow", 18, "trusted"]],
    moves: [
      authored({ id: "shell-toss", name: "Shell Toss", description: "Slaps one carried shell across the water and immediately retrieves it after impact.", type: "tide", channel: "physical", target: "hostile", shape: "line", range: 4.8, radius: .4, verticalTolerance: 2, timing: [.25, .1, .38, .9], power: .67, exertionCost: 0, aiTags: ["basic"], telegraph: "The shell balances on its chest before both forepaws flick outward." }),
      authored({ id: "dive-fetch", name: "Dive Fetch", description: "Retrieves one light submerged item while leaving nests and attached objects undisturbed.", type: "tide", channel: "field", target: "point", shape: "dash", range: 7, radius: .7, verticalTolerance: 5, timing: [.28, .65, .36, 5.5], power: 0, exertionCost: 7, aiTags: ["field-utility", "mobility"], telegraph: "Whiskers flatten and the chosen loose object gains a ripple marker." }),
      authored({ id: "playful-feint", name: "Playful Feint", description: "Rolls through a harmless splash that misdirects pursuit without abandoning its keeper.", type: "wild", channel: "control", target: "self", shape: "circle", range: 0, radius: 1.4, verticalTolerance: 2, timing: [.18, .3, .28, 4.8], power: 0, exertionCost: 5, aiTags: ["defense", "control"], telegraph: "It rolls onto one shoulder while the tail points toward the true exit.", appliesStatus: "veiled", statusDurationSeconds: 3 }),
      authored({ id: "rescue-tow", name: "Rescue Tow", description: "Offers its broad tail to one swimming ally and tows them to the nearest safe bank.", type: "tide", channel: "traversal", target: "ally", shape: "dash", range: 6, radius: 1, verticalTolerance: 3, timing: [.35, .9, .42, 9], power: 0, exertionCost: 12, aiTags: ["signature", "support", "mobility"], telegraph: "The otter turns broadside and holds its tail still until the grip is secure." }),
    ],
  }),
  "riverwright-beaver": defineExpansionMoveSheet("riverwright-beaver", {
    basic: "tail-slap", fieldUtility: "current-read", passiveStance: "lodge-mend",
    unlocks: [["tail-slap", 1], ["current-read", 5], ["log-carry", 10], ["lodge-mend", 18, "trusted"]],
    moves: [
      authored({ id: "log-carry", name: "Log Carry", description: "Moves one assigned loose log between work anchors without altering a player's finished wall.", type: "wild", channel: "field", target: "point", shape: "dash", range: 6, radius: .9, verticalTolerance: 2, timing: [.65, 1.4, .5, 6], power: 0, exertionCost: 9, aiTags: ["field-utility", "support"], telegraph: "Teeth test the marked log and the destination outline appears before lifting." }),
      authored({ id: "tail-slap", name: "Tail Slap", description: "Brings its broad tail down in shallow water, sending a low warning wave forward.", type: "tide", channel: "physical", target: "hostile", shape: "cone", range: 2.6, radius: 1.3, verticalTolerance: 1.3, timing: [.36, .14, .48, 1.1], power: .78, exertionCost: 0, aiTags: ["basic", "control"], telegraph: "Hindquarters rise and the flat tail pauses above the water.", appliesStatus: "soaked", statusDurationSeconds: 4 }),
      authored({ id: "current-read", name: "Current Read", description: "Compares bank pressure and flow to mark a safe lodge repair point.", type: "tide", channel: "field", target: "point", shape: "line", range: 8, radius: 1.2, verticalTolerance: 2, timing: [.5, .8, .24, 4.8], power: 0, exertionCost: 4, aiTags: ["field-utility", "support"], telegraph: "Whiskers touch the flow while the tail points across it." }),
      authored({ id: "lodge-mend", name: "Lodge Mend", description: "Repairs one authored damaged lodge segment with assigned material during a work cycle.", type: "verdant", channel: "healing", target: "point", shape: "contact", range: 1.5, radius: .8, verticalTolerance: 1.5, timing: [.9, 2.2, .55, 12], power: 0, exertionCost: 13, aiTags: ["signature", "field-utility", "support"], telegraph: "A missing lodge segment highlights while bark strips are woven across the gap." }),
    ],
  }),
  "mirecrown-crane": defineExpansionMoveSheet("mirecrown-crane", {
    basic: "reed-call", fieldUtility: "pond-sense", passiveStance: "wing-screen",
    unlocks: [["reed-call", 1], ["pond-sense", 5], ["wing-screen", 10], ["cleansing-step", 18, "trusted"]],
    moves: [
      authored({ id: "reed-call", name: "Reed Call", description: "Sounds one clear wetland note that startles tiny pests but leaves pond residents calm.", type: "sky", channel: "magical", target: "hostile", shape: "line", range: 5, radius: .45, verticalTolerance: 3, timing: [.32, .11, .39, .96], power: .59, exertionCost: 0, aiTags: ["basic", "control"], telegraph: "The long neck forms an S and the reed crown opens." }),
      authored({ id: "cleansing-step", name: "Cleansing Step", description: "Places one careful foot in fouled shallows and lifts a narrow cleansing ripple around allies.", type: "tide", channel: "healing", target: "area", shape: "circle", range: 0, radius: 2.7, verticalTolerance: 1.5, timing: [.62, .8, .42, 8.5], power: 0, exertionCost: 10, aiTags: ["signature", "support"], telegraph: "One black leg rises high while a clear ring gathers beneath the other.", appliesStatus: "inspired", statusDurationSeconds: 4 }),
      authored({ id: "wing-screen", name: "Wing Screen", description: "Spreads both wings between small residents and a threat without striking either side.", type: "verdant", channel: "stance", target: "area", shape: "arc", range: 0, radius: 2.2, verticalTolerance: 2.6, timing: [.4, 1.7, .3, 7], power: 0, exertionCost: 7, aiTags: ["defense", "support"], telegraph: "The wings lower into a broad reed-colored wall.", appliesStatus: "guarded", statusDurationSeconds: 5 }),
      authored({ id: "pond-sense", name: "Pond Sense", description: "Reads insect, reed, and water clarity signals to mark an unhealthy pond edge.", type: "verdant", channel: "field", target: "point", shape: "circle", range: 8, radius: 2.8, verticalTolerance: 2, timing: [.55, 1, .25, 5.2], power: 0, exertionCost: 4, aiTags: ["field-utility", "support"], telegraph: "The bill samples water while the crown follows the insect drift." }),
    ],
  }),
  "inkveil-cuttle": defineExpansionMoveSheet("inkveil-cuttle", {
    basic: "jet-dash", fieldUtility: "colorveil", passiveStance: "false-silhouette",
    unlocks: [["jet-dash", 1], ["ink-cloud", 5], ["colorveil", 10], ["false-silhouette", 28, "partnered"]],
    moves: [
      authored({ id: "ink-cloud", name: "Ink Cloud", description: "Expels a bounded dark plume that Veils escape without staining an entire aquarium.", type: "umbral", channel: "control", target: "area", shape: "circle", range: 0, radius: 2.5, verticalTolerance: 2.5, timing: [.36, .9, .4, 7.5], power: .18, exertionCost: 9, aiTags: ["control", "defense"], telegraph: "The ink sac darkens through the translucent mantle before release.", appliesStatus: "veiled", statusDurationSeconds: 4.5 }),
      authored({ id: "colorveil", name: "Colorveil", description: "Cycles a learned reef pattern to calm aquarium residents or communicate a discovered mood.", type: "dream", channel: "field", target: "area", shape: "circle", range: 0, radius: 3, verticalTolerance: 2.5, timing: [.5, 1.4, .28, 5], power: 0, exertionCost: 4, aiTags: ["field-utility", "support"], telegraph: "Color bands travel from eye ring to fin skirt in a fixed readable order." }),
      authored({ id: "jet-dash", name: "Jet Dash", description: "Funnels water through its mantle and bumps a target before braking with the fin skirt.", type: "tide", channel: "physical", target: "hostile", shape: "dash", range: 3.8, radius: .62, verticalTolerance: 3, timing: [.2, .16, .32, .8], power: .66, exertionCost: 0, aiTags: ["basic", "mobility"], telegraph: "Mantle compresses and both pupils narrow toward the exit line." }),
      authored({ id: "false-silhouette", name: "False Silhouette", description: "Holds a decoy body-pattern in the ink while the real cuttle moves behind cover.", type: "dream", channel: "stance", target: "self", shape: "circle", range: 0, radius: 2.2, verticalTolerance: 2.5, timing: [.58, 2, .45, 10], power: 0, exertionCost: 12, aiTags: ["signature", "defense", "control"], telegraph: "A second mantle outline blooms beside the first before they separate.", appliesStatus: "veiled", statusDurationSeconds: 6 }),
    ],
  }),
  "prismclaw-mantis-shrimp": defineExpansionMoveSheet("prismclaw-mantis-shrimp", {
    basic: "prism-punch", fieldUtility: "crack-finder", passiveStance: "shell-brace",
    unlocks: [["prism-punch", 1], ["shell-brace", 5], ["crack-finder", 10], ["flashburst", 28, "partnered"]],
    moves: [
      authored({ id: "prism-punch", name: "Prism Punch", description: "Cocks one raptorial club and releases a short cavitation strike at contact range.", type: "stone", channel: "physical", target: "hostile", shape: "contact", range: 1.45, radius: .5, verticalTolerance: 1.2, timing: [.33, .06, .52, 1.15], power: .96, exertionCost: 0, aiTags: ["basic", "finisher"], telegraph: "One club folds under the carapace while the eye stalks lock forward.", appliesStatus: "fractured", statusDurationSeconds: 3 }),
      authored({ id: "shell-brace", name: "Shell Brace", description: "Turns the layered carapace toward danger and tucks both striking clubs safely underneath.", type: "stone", channel: "stance", target: "self", shape: "arc", range: 0, radius: 1, verticalTolerance: 1, timing: [.3, 1.6, .35, 6.8], power: 0, exertionCost: 6, aiTags: ["defense"], telegraph: "Eye stalks lower after the clubs disappear under the shell.", appliesStatus: "guarded", statusDurationSeconds: 5 }),
      authored({ id: "crack-finder", name: "Crack Finder", description: "Tests only authored cracked underwater surfaces and marks the one safe to open.", type: "radiant", channel: "field", target: "point", shape: "cone", range: 4.5, radius: 1.4, verticalTolerance: 2, timing: [.46, .8, .3, 5.5], power: 0, exertionCost: 5, aiTags: ["field-utility"], telegraph: "Both independently moving eyes converge on one highlighted fracture." }),
      authored({ id: "flashburst", name: "Flashburst", description: "Snaps both clubs against the water to emit a dazzling prism fan rather than a structural blast.", type: "radiant", channel: "control", target: "area", shape: "cone", range: 3.2, radius: 1.8, verticalTolerance: 2.2, timing: [.7, .12, .8, 10.5], power: .52, exertionCost: 14, aiTags: ["signature", "control"], telegraph: "Both clubs chamber symmetrically and a rainbow cone previews the safe fan.", appliesStatus: "dazzled", statusDurationSeconds: 4.5 }),
    ],
  }),
  "reefmender-shrimp": defineExpansionMoveSheet("reefmender-shrimp", {
    basic: "alarm-flick", fieldUtility: "coral-tend", passiveStance: "clean",
    unlocks: [["alarm-flick", 1], ["clean", 5], ["mend-gill", 10], ["coral-tend", 18, "trusted"]],
    moves: [
      authored({ id: "clean", name: "Clean", description: "Picks irritants from one willing resident's scales without stripping protective slime.", type: "verdant", channel: "healing", target: "ally", shape: "contact", range: 1, radius: .35, verticalTolerance: 1, timing: [.25, .9, .2, 4], power: 0, exertionCost: 2, aiTags: ["support"], telegraph: "White antennae sweep forward and both cleaning claws open." }),
      authored({ id: "mend-gill", name: "Mend Gill", description: "Clears a damaged aquatic ally's gill with a focused restorative cleaning pass.", type: "radiant", channel: "healing", target: "ally", shape: "contact", range: 1.1, radius: .4, verticalTolerance: 1, timing: [.42, 1.1, .28, 7.2], power: 0, exertionCost: 7, aiTags: ["support"], telegraph: "The shrimp signals with alternating antenna taps before approaching.", appliesStatus: "inspired", statusDurationSeconds: 4 }),
      authored({ id: "alarm-flick", name: "Alarm Flick", description: "Snaps its tail against the carrier water to interrupt a tiny close threat.", type: "tide", channel: "physical", target: "hostile", shape: "contact", range: 1.2, radius: .4, verticalTolerance: 1, timing: [.15, .07, .29, .72], power: .45, exertionCost: 0, aiTags: ["basic", "control"], telegraph: "Tail fan folds under the abdomen before a sharp backward snap." }),
      authored({ id: "coral-tend", name: "Coral Tend", description: "Removes one pest cluster from living coral during the aquarium work cycle.", type: "verdant", channel: "field", target: "point", shape: "circle", range: 2, radius: .8, verticalTolerance: 1.4, timing: [.5, 1.5, .3, 8], power: 0, exertionCost: 6, aiTags: ["signature", "field-utility", "support"], telegraph: "Antennae outline the affected coral branch before the cleaning begins." }),
    ],
  }),
  "currentweaver-eel": defineExpansionMoveSheet("currentweaver-eel", {
    basic: "current-coil", fieldUtility: "lamp-link", passiveStance: "charge-drink",
    unlocks: [["current-coil", 1], ["charge-drink", 5], ["lamp-link", 10], ["arc-snap", 18, "trusted"]],
    moves: [
      authored({ id: "current-coil", name: "Current Coil", description: "Loops its continuous body around a water current and shoves a close threat off-line.", type: "tide", channel: "physical", target: "hostile", shape: "arc", range: 1.9, radius: .8, verticalTolerance: 2, timing: [.28, .14, .37, .9], power: .7, exertionCost: 0, aiTags: ["basic", "control"], telegraph: "Three body segments tighten into one visible loop." }),
      authored({ id: "charge-drink", name: "Charge Drink", description: "Absorbs charge from an approved lamp link and exposes Storm as a temporary visible type.", type: "storm", channel: "stance", target: "point", shape: "line", range: 3, radius: .45, verticalTolerance: 2, timing: [.62, 1.2, .36, 7], power: 0, exertionCost: 4, aiTags: ["support", "opener"], telegraph: "Lateral-line lights fill from tail to head without skipping segments.", appliesStatus: "inspired", statusDurationSeconds: 5 }),
      authored({ id: "arc-snap", name: "Arc Snap", description: "Releases stored charge in one short underwater arc, consuming its charged stance.", type: "storm", channel: "magical", target: "hostile", shape: "line", range: 5.2, radius: .55, verticalTolerance: 2.5, timing: [.58, .12, .62, 7.8], power: 1.18, exertionCost: 12, aiTags: ["signature", "finisher"], telegraph: "Every lateral light turns white before the jaw opens.", appliesStatus: "shocked", statusDurationSeconds: 4 }),
      authored({ id: "lamp-link", name: "Lamp Link", description: "Links an aquarium lamp to a safe charge loop and reports overload before it harms residents.", type: "tide", channel: "field", target: "point", shape: "line", range: 6, radius: .7, verticalTolerance: 3, timing: [.45, .9, .22, 4.5], power: 0, exertionCost: 3, aiTags: ["field-utility", "support"], telegraph: "A dotted current line connects the eel to one approved lamp." }),
    ],
  }),
  "shellcarrier-hermit": defineExpansionMoveSheet("shellcarrier-hermit", {
    basic: "scuttle", fieldUtility: "sand-sift", passiveStance: "satchel-brace",
    unlocks: [["scuttle", 1], ["shell-swap", 5], ["sand-sift", 10], ["satchel-brace", 18, "trusted"]],
    moves: [
      authored({ id: "shell-swap", name: "Shell Swap", description: "Tests a placed shell's fit and transfers its visible cargo only after choosing the better home.", type: "stone", channel: "field", target: "point", shape: "contact", range: 1, radius: .6, verticalTolerance: 1, timing: [.8, 1.8, .4, 6], power: 0, exertionCost: 4, aiTags: ["field-utility", "support"], telegraph: "Both mismatched feelers measure the opening before the old shell lifts." }),
      authored({ id: "scuttle", name: "Scuttle", description: "Sidesteps under its shell lip and clips a close threat with one reinforced claw.", type: "wild", channel: "physical", target: "hostile", shape: "dash", range: 1.7, radius: .5, verticalTolerance: 1, timing: [.18, .1, .32, .78], power: .56, exertionCost: 0, aiTags: ["basic", "mobility"], telegraph: "Six red legs angle sideways while the shell stays level." }),
      authored({ id: "sand-sift", name: "Sand Sift", description: "Separates harmless loose salvage from living substrate in one small aquarium patch.", type: "tide", channel: "field", target: "point", shape: "circle", range: 2.5, radius: 1, verticalTolerance: 1, timing: [.4, 1.1, .22, 5], power: 0, exertionCost: 3, aiTags: ["field-utility"], telegraph: "Walking legs comb in alternating rows while the claws remain raised." }),
      authored({ id: "satchel-brace", name: "Satchel Brace", description: "Ties down one valid carried object beneath the shell lip and braces it against current.", type: "stone", channel: "stance", target: "self", shape: "circle", range: 0, radius: .8, verticalTolerance: 1, timing: [.45, 1.4, .28, 5.8], power: 0, exertionCost: 5, aiTags: ["defense", "support"], telegraph: "Tidevine knots tighten visibly beneath the chosen shell.", appliesStatus: "guarded", statusDurationSeconds: 5 }),
    ],
  }),
  "wreckwhistle-porpoise": defineExpansionMoveSheet("wreckwhistle-porpoise", {
    basic: "wake-dash", fieldUtility: "wrecksong", passiveStance: "pod-call",
    unlocks: [["wake-dash", 1], ["wrecksong", 5], ["rescue-lift", 18, "trusted"], ["pod-call", 28, "partnered"]],
    moves: [
      authored({ id: "wrecksong", name: "Wrecksong", description: "Uses descending whistles to mark wreckage and rising whistles to mark the safe route home.", type: "echo", channel: "field", target: "point", shape: "cone", range: 12, radius: 3.5, verticalTolerance: 6, timing: [.5, 1.2, .24, 5.5], power: 0, exertionCost: 4, aiTags: ["field-utility", "support"], telegraph: "The melon pulses in three bands before the directional phrase." }),
      authored({ id: "wake-dash", name: "Wake Dash", description: "Accelerates through one clean water lane and shoulder-checks a threat without using its rostrum.", type: "tide", channel: "physical", target: "hostile", shape: "dash", range: 5.8, radius: .9, verticalTolerance: 3.5, timing: [.28, .22, .42, .95], power: .78, exertionCost: 0, aiTags: ["basic", "mobility"], telegraph: "Tail beats stop for one beat before a pale V-wake opens.", mountedUse: true }),
      authored({ id: "rescue-lift", name: "Rescue Lift", description: "Slides its shoulder under a trapped swimmer and raises them to breathable water.", type: "tide", channel: "traversal", target: "ally", shape: "dash", range: 7.5, radius: 1.2, verticalTolerance: 6, timing: [.38, .8, .55, 10], power: 0, exertionCost: 14, aiTags: ["support", "mobility"], telegraph: "The porpoise rolls one shoulder beneath a visible rescue arc.", mountedUse: true }),
      authored({ id: "pod-call", name: "Pod Call", description: "Coordinates nearby bonded porpoises into a bounded escort formation around one boat or swimmer.", type: "echo", channel: "stance", target: "area", shape: "circle", range: 0, radius: 8, verticalTolerance: 5, timing: [.85, 2, .45, 14], power: 0, exertionCost: 16, aiTags: ["signature", "support"], telegraph: "One long whistle receives two spaced answers before the formation moves.", appliesStatus: "inspired", statusDurationSeconds: 7, mountedUse: true }),
    ],
  }),
  "kilnscale-salamander": defineExpansionMoveSheet("kilnscale-salamander", {
    basic: "emberlick", fieldUtility: "fumarole-vent", passiveStance: "cooled-skin",
    unlocks: [["emberlick", 1], ["warmth-field", 5], ["fumarole-vent", 10], ["cooled-skin", 18, "trusted"]],
    moves: [
      authored({ id: "warmth-field", name: "Warmth Field", description: "Opens its kiln scales into a gentle camp heat gradient that will not ignite blocks.", type: "flame", channel: "healing", target: "area", shape: "circle", range: 0, radius: 3, verticalTolerance: 2, timing: [.62, 1.8, .35, 8], power: 0, exertionCost: 8, aiTags: ["support"], telegraph: "Back tiles lift in rows and settle at a steady orange rather than flaring." }),
      authored({ id: "emberlick", name: "Emberlick", description: "Touches a close threat with a brief heat-slick tongue and withdraws before scales open.", type: "flame", channel: "magical", target: "hostile", shape: "contact", range: 1.35, radius: .42, verticalTolerance: 1.1, timing: [.23, .09, .34, .86], power: .67, exertionCost: 0, aiTags: ["basic"], telegraph: "The jawline glows while the tongue remains visibly coiled.", appliesStatus: "burning", statusDurationSeconds: 3 }),
      authored({ id: "fumarole-vent", name: "Fumarole Vent", description: "Opens one authored blocked vent enough to restore a safe habitat gradient.", type: "stone", channel: "field", target: "point", shape: "line", range: 3.5, radius: .8, verticalTolerance: 2, timing: [.75, 1.1, .52, 8], power: 0, exertionCost: 10, aiTags: ["field-utility", "support"], telegraph: "Its throat tiles align with the marked vent before a controlled exhale." }),
      authored({ id: "cooled-skin", name: "Cooled Skin", description: "Seals every kiln tile into blue-gray stone while deeply chilled, trading Flame output for protection.", type: "frost", channel: "stance", target: "self", shape: "circle", range: 0, radius: 1, verticalTolerance: 1, timing: [.5, 2.2, .42, 9.5], power: 0, exertionCost: 6, aiTags: ["signature", "defense"], telegraph: "Blue-gray color closes from tail to nose as the vents flatten.", appliesStatus: "guarded", statusDurationSeconds: 6.5 }),
    ],
  }),
  "sporeback-gardener": defineExpansionMoveSheet("sporeback-gardener", {
    basic: "puff-screen", fieldUtility: "spore-sow", passiveStance: "mycelial-mend",
    unlocks: [["puff-screen", 1], ["compost", 5], ["spore-sow", 10], ["mycelial-mend", 18, "trusted"]],
    moves: [
      authored({ id: "spore-sow", name: "Spore Sow", description: "Plants one prepared mushroom bed with spores from its visible cultivated crown.", type: "verdant", channel: "field", target: "point", shape: "circle", range: 2.2, radius: 1.1, verticalTolerance: 1, timing: [.7, 1.8, .4, 9], power: 0, exertionCost: 8, aiTags: ["field-utility", "support"], telegraph: "One ripe cap leans toward the highlighted prepared bed." }),
      authored({ id: "compost", name: "Compost", description: "Processes assigned exhausted organic matter in its belly chamber during a garden cycle.", type: "verdant", channel: "field", target: "point", shape: "contact", range: 1.2, radius: .8, verticalTolerance: 1, timing: [.8, 2.1, .35, 10], power: 0, exertionCost: 6, aiTags: ["field-utility"], telegraph: "Root knuckles brace while the belly chamber gives one low pulse." }),
      authored({ id: "mycelial-mend", name: "Mycelial Mend", description: "Connects a damaged ally to a prepared fungal bed for a slow bounded recovery.", type: "verdant", channel: "healing", target: "ally", shape: "line", range: 4, radius: .6, verticalTolerance: 2, timing: [.72, 1.4, .4, 9.5], power: 0, exertionCost: 11, aiTags: ["signature", "support"], telegraph: "A visible white hyphal line reaches the ally before healing starts.", appliesStatus: "inspired", statusDurationSeconds: 5 }),
      authored({ id: "puff-screen", name: "Puff Screen", description: "Shakes a small irritant spore cloud between its garden and a close threat.", type: "venom", channel: "control", target: "hostile", shape: "cone", range: 2.6, radius: 1.3, verticalTolerance: 1.8, timing: [.32, .35, .46, 1.1], power: .48, exertionCost: 0, aiTags: ["basic", "control"], telegraph: "The cultivated crown contracts before one directional puff.", appliesStatus: "poisoned", statusDurationSeconds: 3 }),
    ],
  }),
  "voidmantle-ray": defineExpansionMoveSheet("voidmantle-ray", {
    basic: "abyssal-sweep", fieldUtility: "lumen-feed", passiveStance: "mantle-screen",
    unlocks: [["abyssal-sweep", 1], ["lumen-feed", 5], ["mantle-screen", 18], ["silent-glide", 28, "partnered"]],
    moves: [
      authored({ id: "lumen-feed", name: "Lumen Feed", description: "Follows a complete luminous plankton route and marks the next open cavern volume.", type: "tide", channel: "field", target: "point", shape: "line", range: 10, radius: 2, verticalTolerance: 6, timing: [.6, 1.2, .3, 5.5], power: 0, exertionCost: 4, aiTags: ["field-utility", "support"], telegraph: "The mouth-lobes glow only after the full feeding line appears." }),
      authored({ id: "silent-glide", name: "Silent Glide", description: "Sails through one validated open cavern lane, losing altitude rather than climbing forever.", type: "sky", channel: "traversal", target: "point", shape: "dash", range: 10, radius: 1.4, verticalTolerance: 5, timing: [.55, 1, .7, 8.5], power: 0, exertionCost: 13, aiTags: ["signature", "mobility"], telegraph: "Both mantle tips test the corridor and a descending route ribbon appears.", mountedUse: true }),
      authored({ id: "mantle-screen", name: "Mantle Screen", description: "Turns the broad diamond mantle between a rider and falling cavern debris.", type: "umbral", channel: "stance", target: "self", shape: "arc", range: 0, radius: 2.5, verticalTolerance: 3, timing: [.48, 2, .45, 8.8], power: 0, exertionCost: 9, aiTags: ["defense", "support"], telegraph: "The ray banks until its full underside forms a visible shield.", appliesStatus: "guarded", statusDurationSeconds: 6, mountedUse: true }),
      authored({ id: "abyssal-sweep", name: "Abyssal Sweep", description: "Sweeps one mantle edge through a close aerial threat and drifts safely past it.", type: "umbral", channel: "physical", target: "hostile", shape: "arc", range: 2.4, radius: 1.2, verticalTolerance: 3, timing: [.36, .18, .46, 1.05], power: .82, exertionCost: 0, aiTags: ["basic", "mobility"], telegraph: "One fin-tip curls inward before the full mantle follows.", mountedUse: true }),
    ],
  }),
  "fossilback-trilobite": defineExpansionMoveSheet("fossilback-trilobite", {
    basic: "fossil-tap", fieldUtility: "sediment-sense", passiveStance: "curl",
    unlocks: [["fossil-tap", 1], ["sediment-sense", 5], ["curl", 10], ["ancient-wake", 28, "trusted"]],
    moves: [
      authored({ id: "sediment-sense", name: "Sediment Sense", description: "Reads undisturbed layers beneath its many feet and marks an ancient stratum, not exact loot.", type: "stone", channel: "field", target: "point", shape: "circle", range: 5.5, radius: 2, verticalTolerance: 2.5, timing: [.7, 1.2, .28, 5.8], power: 0, exertionCost: 4, aiTags: ["field-utility", "support"], telegraph: "Rows of tiny legs stop in sequence while eye ridges sink into silt." }),
      authored({ id: "curl", name: "Curl", description: "Closes its three lobes into a low armored oval and waits out disturbance.", type: "stone", channel: "stance", target: "self", shape: "circle", range: 0, radius: .75, verticalTolerance: .8, timing: [.35, 2.5, .5, 8], power: 0, exertionCost: 5, aiTags: ["defense"], telegraph: "Outer lobes fold first and the central ridge locks last.", appliesStatus: "guarded", statusDurationSeconds: 7 }),
      authored({ id: "fossil-tap", name: "Fossil Tap", description: "Knocks its head shield once against a close threat with more warning than force.", type: "wild", channel: "physical", target: "hostile", shape: "contact", range: 1.1, radius: .5, verticalTolerance: .8, timing: [.42, .1, .5, 1.2], power: .53, exertionCost: 0, aiTags: ["basic"], telegraph: "The head shield rises slowly while every leg remains planted." }),
      authored({ id: "ancient-wake", name: "Ancient Wake", description: "Stirs one undisturbed silt line to reveal the direction of an authored ancient-biome clue.", type: "tide", channel: "field", target: "point", shape: "line", range: 7, radius: 1, verticalTolerance: 2, timing: [.9, 1.5, .4, 12], power: 0, exertionCost: 9, aiTags: ["signature", "field-utility"], telegraph: "A copper-brown wake travels behind the shell without lifting the marked stratum." }),
    ],
  }),
  "ilyr-virebloom": defineExpansionMoveSheet("ilyr-virebloom", {
    basic: "springstep", fieldUtility: "root-of-mercy", passiveStance: "antler-orchard",
    unlocks: [["springstep", 1], ["antler-orchard", 10], ["dreaming-rain", 18], ["sanctuary-charge", 28, "partnered"], ["root-of-mercy", 40, "kindred"]],
    moves: [
      authored({ id: "springstep", name: "Springstep", description: "Places one enormous hoof and opens a brief spring beneath a hostile advance instead of crushing it.", type: "tide", channel: "magical", target: "hostile", shape: "circle", range: 3.5, radius: 1.8, verticalTolerance: 2, timing: [.58, .24, .6, 1.5], power: .86, exertionCost: 0, aiTags: ["basic", "control"], telegraph: "Water climbs the lifted hoof and a flower-ring marks its landing.", appliesStatus: "soaked", statusDurationSeconds: 5, mountedUse: true }),
      authored({ id: "antler-orchard", name: "Antler Orchard", description: "Shelters nearby allies beneath flowering watercourses carried through its antlers.", type: "verdant", channel: "stance", target: "area", shape: "circle", range: 0, radius: 5.5, verticalTolerance: 5, timing: [.9, 3, .6, 12], power: 0, exertionCost: 12, aiTags: ["defense", "support"], telegraph: "Every antler branch fills with water before the flower canopy opens.", appliesStatus: "guarded", statusDurationSeconds: 8, mountedUse: true }),
      authored({ id: "dreaming-rain", name: "Dreaming Rain", description: "Calls a localized restorative shower that calms habitat spirits and never changes global weather.", type: "dream", channel: "healing", target: "area", shape: "circle", range: 0, radius: 7, verticalTolerance: 6, timing: [1.1, 2.2, .7, 15], power: 0, exertionCost: 18, aiTags: ["support", "control"], telegraph: "Small resting birds take flight as an antler cloud gathers overhead.", appliesStatus: "inspired", statusDurationSeconds: 8 }),
      authored({ id: "sanctuary-charge", name: "Sanctuary Charge", description: "Runs a broad nonlethal line that carries allies out of danger and pushes poachers from restored ground.", type: "radiant", channel: "traversal", target: "hostile", shape: "dash", range: 10, radius: 2.2, verticalTolerance: 3, timing: [1.05, .55, 1, 14], power: 1.15, exertionCost: 22, aiTags: ["signature", "control", "mobility"], telegraph: "Five natural colors travel down the antlers and a wide safe lane appears.", appliesStatus: "dazzled", statusDurationSeconds: 4, mountedUse: true }),
      authored({ id: "root-of-mercy", name: "Root of Mercy", description: "Restores one authored ecological anchor after its threats are resolved, preserving every living resident.", type: "spirit", channel: "field", target: "point", shape: "circle", range: 5, radius: 4, verticalTolerance: 3, timing: [1.4, 3.5, .8, 20], power: 0, exertionCost: 24, aiTags: ["signature", "field-utility", "support"], telegraph: "A root-and-water sigil grows only across the valid restoration boundary." }),
    ],
  }),
  thalassene: defineExpansionMoveSheet("thalassene", {
    basic: "deep-roll", fieldUtility: "cleaning-tide", passiveStance: "reefwall",
    unlocks: [["deep-roll", 1], ["reefwall", 10], ["cleaning-tide", 18], ["sunlit-breach", 28, "partnered"], ["current-cathedral", 40, "kindred"]],
    moves: [
      authored({ id: "reefwall", name: "Reefwall", description: "Turns one living reef flank toward danger while keeping resident arches upright.", type: "stone", channel: "stance", target: "area", shape: "arc", range: 0, radius: 6, verticalTolerance: 5, timing: [1, 3.2, .9, 13], power: 0, exertionCost: 14, aiTags: ["defense", "support"], telegraph: "Reef polyps close in a wave before the leviathan banks broadside.", appliesStatus: "guarded", statusDurationSeconds: 9, mountedUse: true }),
      authored({ id: "current-cathedral", name: "Current Cathedral", description: "Raises navigable current arches through which allied swimmers can pass safely.", type: "tide", channel: "traversal", target: "point", shape: "line", range: 12, radius: 3.5, verticalTolerance: 7, timing: [1.25, 2.5, .8, 18], power: 0, exertionCost: 22, aiTags: ["signature", "support", "mobility"], telegraph: "Three luminous arches rise in travel order before the current begins.", mountedUse: true }),
      authored({ id: "sunlit-breach", name: "Sunlit Breach", description: "Breaks the surface in a radiant arc that Dazzles parasites without throwing reef residents.", type: "radiant", channel: "magical", target: "hostile", shape: "arc", range: 5.5, radius: 3, verticalTolerance: 6, timing: [1.05, .45, 1.1, 14], power: 1.32, exertionCost: 20, aiTags: ["finisher", "mobility"], telegraph: "Sunlight gathers under the reef arches and a broad breach ring appears.", appliesStatus: "dazzled", statusDurationSeconds: 5, mountedUse: true }),
      authored({ id: "cleaning-tide", name: "Cleaning Tide", description: "Channels cleaner shoals through one bleached reef patch without striking the host tissue.", type: "verdant", channel: "healing", target: "point", shape: "circle", range: 6, radius: 3.5, verticalTolerance: 4, timing: [.95, 2.4, .6, 12], power: 0, exertionCost: 16, aiTags: ["field-utility", "support"], telegraph: "A school-shaped green current circles only the marked reef patch.", appliesStatus: "inspired", statusDurationSeconds: 7 }),
      authored({ id: "deep-roll", name: "Deep Roll", description: "Rolls its immense body beneath a close attacker while keeping the inhabited reef above the impact.", type: "tide", channel: "physical", target: "hostile", shape: "arc", range: 3.8, radius: 2.4, verticalTolerance: 4, timing: [.78, .3, .85, 1.8], power: .92, exertionCost: 0, aiTags: ["basic", "control"], telegraph: "The empty underside turns first while reef arches remain level.", mountedUse: true }),
    ],
  }),
  orichalc: defineExpansionMoveSheet("orichalc", {
    basic: "faultline-hand", fieldUtility: "ore-memory", passiveStance: "unfinished-heart",
    unlocks: [["faultline-hand", 1], ["ore-memory", 10], ["rivet-rain", 28], ["unfinished-heart", 40, "kindred"]],
    moves: [
      authored({ id: "faultline-hand", name: "Faultline Hand", description: "Assembles three ore segments into a hand that presses a visible fracture line rather than crushing the target.", type: "stone", channel: "physical", target: "hostile", shape: "line", range: 5, radius: 1.6, verticalTolerance: 3, timing: [.82, .28, .75, 1.6], power: 1.02, exertionCost: 0, aiTags: ["basic", "control"], telegraph: "Separate segments index into a hand around the still-empty center.", appliesStatus: "fractured", statusDurationSeconds: 5 }),
      authored({ id: "ore-memory", name: "Ore Memory", description: "Replays one safe historic excavation path while refusing to classify the living seam.", type: "metal", channel: "field", target: "point", shape: "line", range: 9, radius: 1.4, verticalTolerance: 4, timing: [1, 1.8, .5, 10], power: 0, exertionCost: 10, aiTags: ["field-utility", "support"], telegraph: "Copper lights trace a route around, never through, the living seam." }),
      authored({ id: "rivet-rain", name: "Rivet Rain", description: "Releases a bounded fan of self-returning metal fasteners above hostile machinery.", type: "metal", channel: "magical", target: "hostile", shape: "cone", range: 7, radius: 2.4, verticalTolerance: 5, timing: [1.15, .6, .95, 12.5], power: 1.38, exertionCost: 18, aiTags: ["signature", "finisher"], telegraph: "Every loose rivet rises into a visible ceiling fan before descending." }),
      authored({ id: "unfinished-heart", name: "Unfinished Heart", description: "Opens its segmented body around the unseen center, alternately reading as ward, anatomy, and machine state.", type: "spirit", channel: "stance", target: "self", shape: "circle", range: 0, radius: 3.5, verticalTolerance: 5, timing: [1.3, 3, .9, 16], power: 0, exertionCost: 20, aiTags: ["signature", "defense"], telegraph: "Every segment turns inward while the center remains visibly absent.", appliesStatus: "guarded", statusDurationSeconds: 9 }),
    ],
  }),
  "varkesh-stormmane": defineExpansionMoveSheet("varkesh-stormmane", {
    basic: "thunder-dive", fieldUtility: "beacon-cry", passiveStance: "cloud-carry",
    unlocks: [["thunder-dive", 1], ["beacon-cry", 10], ["cloud-carry", 28, "partnered"], ["roadless-gale", 40, "kindred"]],
    moves: [
      authored({ id: "roadless-gale", name: "Roadless Gale", description: "Cuts a temporary highland wind route between rebuilt beacons without creating terrain.", type: "sky", channel: "traversal", target: "point", shape: "line", range: 14, radius: 2.5, verticalTolerance: 10, timing: [1.1, 1.6, .85, 16], power: 0, exertionCost: 20, aiTags: ["signature", "field-utility", "mobility"], telegraph: "Road markers woven into the breast answer each beacon in route order.", mountedUse: true }),
      authored({ id: "thunder-dive", name: "Thunder Dive", description: "Folds charged cloud-feathers into one steep strike after a full beacon cry.", type: "storm", channel: "physical", target: "hostile", shape: "dash", range: 11, radius: 1.8, verticalTolerance: 10, timing: [1.05, .32, 1, 1.9], power: 1.08, exertionCost: 0, aiTags: ["basic", "finisher", "mobility"], telegraph: "The old road markers flare and a large ground ring precedes the descent.", appliesStatus: "shocked", statusDurationSeconds: 5, mountedUse: true }),
      authored({ id: "cloud-carry", name: "Cloud Carry", description: "Lifts a passenger in a dense charged-cloud saddle while keeping the aerie below visible.", type: "sky", channel: "traversal", target: "ally", shape: "dash", range: 12, radius: 1.6, verticalTolerance: 10, timing: [.72, 1.2, .7, 12], power: 0, exertionCost: 16, aiTags: ["support", "mobility"], telegraph: "Cloud feathers pack into a broad seat before the passenger anchor appears.", mountedUse: true }),
      authored({ id: "beacon-cry", name: "Beacon Cry", description: "Calls across rebuilt wayposts and reveals the nearest route still passable after the storm.", type: "echo", channel: "field", target: "point", shape: "cone", range: 16, radius: 4, verticalTolerance: 10, timing: [.9, 1.2, .45, 8], power: 0, exertionCost: 8, aiTags: ["field-utility", "support"], telegraph: "The cloud mane stills before a single low cry rolls from beacon to beacon." }),
    ],
  }),
  kharza: defineExpansionMoveSheet("kharza", {
    basic: "banner-rend", fieldUtility: "red-pursuit", passiveStance: "packbreak-howl",
    unlocks: [["banner-rend", 1], ["packbreak-howl", 10], ["chain-leap", 18], ["red-pursuit", 28, "partnered"]],
    moves: [
      authored({ id: "banner-rend", name: "Banner Rend", description: "Hooks armor or coercion cloth with one fang and tears sideways instead of biting deeper.", type: "metal", channel: "physical", target: "hostile", shape: "contact", range: 1.9, radius: .72, verticalTolerance: 1.8, timing: [.32, .13, .42, .95], power: .88, exertionCost: 0, aiTags: ["basic", "finisher"], telegraph: "Its broken banners pull taut opposite the lowered jaw.", appliesStatus: "fractured", statusDurationSeconds: 4, mountedUse: true }),
      authored({ id: "packbreak-howl", name: "Packbreak Howl", description: "Breaks a coercive formation by forcing hostile packmates to reassess their controller.", type: "umbral", channel: "control", target: "area", shape: "circle", range: 0, radius: 6, verticalTolerance: 4, timing: [.78, .6, .65, 10], power: .35, exertionCost: 12, aiTags: ["control", "opener"], telegraph: "Every severed banner lifts before the howl reaches full volume.", appliesStatus: "hushed", statusDurationSeconds: 4 }),
      authored({ id: "chain-leap", name: "Chain Leap", description: "Uses a remaining harness chain as a visible pivot; after purification it becomes a free low pounce.", type: "wild", channel: "physical", target: "hostile", shape: "dash", range: 6.5, radius: 1, verticalTolerance: 3.5, timing: [.66, .22, .68, 7.5], power: 1.3, exertionCost: 15, aiTags: ["signature", "mobility"], telegraph: "A red chain arc marks both pivot and landing before Kharza moves.", mountedUse: true }),
      authored({ id: "red-pursuit", name: "Red Pursuit", description: "Tracks the alchemical scent of a coercion source while refusing ordinary civilian trails.", type: "wild", channel: "field", target: "point", shape: "line", range: 12, radius: 1.5, verticalTolerance: 4, timing: [.55, 1.1, .3, 6], power: 0, exertionCost: 6, aiTags: ["field-utility", "signature"], telegraph: "Harness runes dim while the nose selects one sharp alchemical trail." }),
    ],
  }),
  "sugarwake-sovereign": defineExpansionMoveSheet("sugarwake-sovereign", {
    basic: "ribbon-charge", fieldUtility: "tempering-song", passiveStance: "caramel-rampart",
    unlocks: [["ribbon-charge", 1], ["caramel-rampart", 10], ["festival-flare", 18], ["tempering-song", 40, "kindred"]],
    moves: [
      authored({ id: "caramel-rampart", name: "Caramel Rampart", description: "Pulls a cooling caramel-glass wall around guests, leaving marked exits clear.", type: "confection", channel: "stance", target: "area", shape: "arc", range: 0, radius: 4.5, verticalTolerance: 4, timing: [.82, 2.5, .65, 11], power: 0, exertionCost: 13, aiTags: ["defense", "support"], telegraph: "Syrup ribbons outline the wall and every exit before hardening.", appliesStatus: "guarded", statusDurationSeconds: 8 }),
      authored({ id: "festival-flare", name: "Festival Flare", description: "Vents the kiln-heart upward into a celebratory flash that Dazzles without igniting decorations.", type: "flame", channel: "magical", target: "area", shape: "circle", range: 0, radius: 5, verticalTolerance: 6, timing: [.95, .28, .82, 10.5], power: 1.05, exertionCost: 15, aiTags: ["control", "finisher"], telegraph: "The kiln crown opens and a ceiling-safe flare cone appears.", appliesStatus: "dazzled", statusDurationSeconds: 5, worldImpact: "visual" }),
      authored({ id: "ribbon-charge", name: "Ribbon Charge", description: "Softens its ribbon limbs for a sweeping impact, then hardens them only after passing guests.", type: "confection", channel: "physical", target: "hostile", shape: "dash", range: 6, radius: 1.6, verticalTolerance: 3, timing: [.55, .25, .62, 1.35], power: .92, exertionCost: 0, aiTags: ["basic", "mobility"], telegraph: "All ribbon limbs stream backward and the safe guest corridor highlights." }),
      authored({ id: "tempering-song", name: "Tempering Song", description: "Alternates cooling and feast-memory phrases to stabilize the living masterworks without erasing them.", type: "arcane", channel: "healing", target: "area", shape: "circle", range: 0, radius: 6, verticalTolerance: 5, timing: [1.2, 2.8, .7, 16], power: 0, exertionCost: 20, aiTags: ["signature", "field-utility", "support"], telegraph: "Kiln, dream, and caramel colors answer in a fixed three-phrase sequence.", appliesStatus: "inspired", statusDurationSeconds: 9 }),
    ],
  }),
  "bellstep-qilin": defineMythicFrontierMoveSheet("bellstep-qilin", { types: ["radiant", "echo", "wild", "radiant"], moves: [["Bellstep", 1], ["Patient Circuit", 8], ["Roadward Chime", 20], ["Concordant Gallop", 36, "partnered"]], mounted: true }),
  "aerolith-baleen": defineMythicFrontierMoveSheet("aerolith-baleen", { types: ["sky", "spirit", "stone", "spirit"], moves: [["Baleen Sweep", 1], ["Lift Basin", 10], ["Graveyard Turn", 24], ["Carry the Fallen", 40, "kindred"]], mounted: true }),
  "mireglass-kelpie": defineMythicFrontierMoveSheet("mireglass-kelpie", { types: ["tide", "mirror", "umbral", "mirror"], moves: [["Fen Kick", 1], ["False Wake", 7], ["Mirror Canter", 19], ["Drown the Reflection", 35]], mounted: true }),
  "cinderwing-pyrausta": defineMythicFrontierMoveSheet("cinderwing-pyrausta", { types: ["flame", "arcane", "sky", "flame"], moves: [["Cinder Dust", 1], ["Heat Cradle", 9], ["Glasswing Shear", 21], ["Hatchery Vigil", 38, "partnered"]] }),
  "nacre-gatewyrm": defineMythicFrontierMoveSheet("nacre-gatewyrm", { types: ["tide", "arcane", "tide", "arcane"], moves: [["Gate Ram", 1], ["Nacre Fold", 10], ["Moonwell Pocket", 24], ["Threshold Current", 40, "kindred"]], mounted: true }),
  "frostcauldron-behemoth": defineMythicFrontierMoveSheet("frostcauldron-behemoth", { types: ["frost", "stone", "wild", "frost"], moves: [["Snowplow", 1], ["Kettle Guard", 8], ["Avalanche Brace", 22], ["Warm the Caravan", 38, "partnered"]], mounted: true }),
  "briarcrown-manticore": defineMythicFrontierMoveSheet("briarcrown-manticore", { types: ["wild", "verdant", "venom", "wild"], moves: [["Crown Pounce", 1], ["Briar Fan", 8], ["Venom Measure", 20], ["Menagerie Roar", 36, "kindred"]], mounted: true }),
  ammonarch: defineMythicFrontierMoveSheet("ammonarch", { types: ["stone", "tide", "arcane", "stone"], moves: [["Mantle Shove", 1], ["Spiral Bastion", 9], ["Stone Song", 23], ["Orchard Resonance", 40, "partnered"]] }),
  "handtail-ahuizotl": defineMythicFrontierMoveSheet("handtail-ahuizotl", { types: ["tide", "wild", "spirit", "spirit"], moves: [["Channel Bite", 1], ["Backwash Fetch", 6], ["Keepsake Scent", 18], ["Rescue Hand", 34, "trusted"]] }),
  "tideclock-cetus": defineMythicFrontierMoveSheet("tideclock-cetus", { types: ["tide", "spirit", "metal", "tide"], moves: [["Long Current", 1], ["Sounding Roll", 10], ["Wreck Sense", 22], ["Abyssal Slipstream", 40, "partnered"]], mounted: true }),
  "anemoi-gryphon": defineMythicFrontierMoveSheet("anemoi-gryphon", { types: ["sky", "storm", "wild", "sky"], moves: [["Crown Talon", 1], ["Crosswind Mantle", 10], ["Ninefold Draft", 24], ["Palace Circuit", 40, "kindred"]], mounted: true }),
  "sable-gorgon": defineMythicFrontierMoveSheet("sable-gorgon", { types: ["stone", "venom", "mirror", "mirror"], moves: [["Quarry Rush", 1], ["Sable Glance", 8], ["Cocoon Wall", 21], ["Merciful Reversal", 38, "partnered"]] }),
  "namarra-makara": defineMythicFrontierMoveSheet("namarra-makara", { types: ["tide", "radiant", "spirit", "spirit"], moves: [["Court Roll", 1], ["Regalia Current", 10], ["Pearl Audience", 24], ["Namarra's Decree", 40, "kindred"]], mounted: true }),
  "ashen-salamander-king": defineMythicFrontierMoveSheet("ashen-salamander-king", { types: ["flame", "arcane", "draconic", "flame"], moves: [["Kiln Lash", 1], ["Royal Temper", 9], ["Memory Heat", 22], ["Crown Foundry", 40, "partnered"]] }),
  "mycelial-oneirophant": defineMythicFrontierMoveSheet("mycelial-oneirophant", { types: ["dream", "verdant", "spirit", "dream"], moves: [["Dream Tread", 1], ["Remembered Path", 8], ["Habitat Echo", 22], ["Kindred Menagerie", 40, "kindred"]], mounted: true }),
  asterjaw: defineExpansionMoveSheet("asterjaw", {
    basic: "starbite", fieldUtility: "meridian-scent", passiveStance: "homeward-arc",
    unlocks: [["starbite", 1], ["meridian-scent", 5], ["roadless-leap", 18], ["homeward-arc", 28, "partnered"]],
    moves: [
      authored({ id: "meridian-scent", name: "Meridian Scent", description: "Finds a road that was planned, dreamed, or abandoned without inventing a destination.", type: "spirit", channel: "field", target: "point", shape: "line", range: 10, radius: 1.2, verticalTolerance: 4, timing: [.6, 1, .25, 5.5], power: 0, exertionCost: 4, aiTags: ["field-utility", "support"], telegraph: "Compass stars inside the open ribcage rotate toward one visible route." }),
      authored({ id: "roadless-leap", name: "Roadless Leap", description: "Crosses one bounded obstacle along a constellation arc and validates the landing before departure.", type: "sky", channel: "traversal", target: "point", shape: "dash", range: 8, radius: .9, verticalTolerance: 5, timing: [.42, .55, .5, 7], power: 0, exertionCost: 11, aiTags: ["mobility", "signature"], telegraph: "Brass joint-stars connect into one complete landing arc." }),
      authored({ id: "starbite", name: "Starbite", description: "Closes a constellation jaw around a close hostile while the physical muzzle remains still.", type: "radiant", channel: "magical", target: "hostile", shape: "contact", range: 1.7, radius: .6, verticalTolerance: 1.8, timing: [.25, .1, .36, .88], power: .75, exertionCost: 0, aiTags: ["basic"], telegraph: "The route-stars gather around the open jaw before closing." }),
      authored({ id: "homeward-arc", name: "Homeward Arc", description: "Draws a return path to its summoning anchor or grounded home without teleporting companions.", type: "spirit", channel: "stance", target: "self", shape: "line", range: 0, radius: 1, verticalTolerance: 2, timing: [.45, 1.6, .3, 6.5], power: 0, exertionCost: 6, aiTags: ["defense", "field-utility"], telegraph: "A single constellation line closes behind Asterjaw toward home.", appliesStatus: "guarded", statusDurationSeconds: 5 }),
    ],
  }),
  "vellum-warden": defineExpansionMoveSheet("vellum-warden", {
    basic: "redline", fieldUtility: "borrowed-clause", passiveStance: "margin-guard",
    unlocks: [["redline", 1], ["margin-guard", 5], ["borrowed-clause", 18], ["blank-page", 28, "partnered"]],
    moves: [
      authored({ id: "margin-guard", name: "Margin Guard", description: "Folds broad paper plates into a side margin that catches attacks aimed at an ally.", type: "arcane", channel: "stance", target: "area", shape: "arc", range: 0, radius: 2.5, verticalTolerance: 3, timing: [.48, 2, .35, 7.8], power: 0, exertionCost: 8, aiTags: ["defense", "support"], telegraph: "Outer pages fold first, leaving the unwritten lantern page visible.", appliesStatus: "guarded", statusDurationSeconds: 6 }),
      authored({ id: "redline", name: "Redline", description: "Draws one bright correction through a repeated hostile windup and interrupts its cadence.", type: "arcane", channel: "magical", target: "hostile", shape: "line", range: 5.8, radius: .38, verticalTolerance: 3, timing: [.34, .09, .42, .95], power: .68, exertionCost: 0, aiTags: ["basic", "control"], telegraph: "A red line underlines the target's repeated tell before it strikes." }),
      authored({ id: "borrowed-clause", name: "Borrowed Clause", description: "Answers one mapped non-legendary technique with a reduced, explicitly recorded echo of its rule.", type: "dream", channel: "control", target: "hostile", shape: "line", range: 6, radius: .6, verticalTolerance: 3, timing: [.82, .22, .65, 10], power: .9, exertionCost: 13, aiTags: ["signature", "control"], telegraph: "Living ink writes the borrowed move name across one empty plate." }),
      authored({ id: "blank-page", name: "Blank Page", description: "Turns the lantern's unwritten page outward to clear one removable debuff from an ally.", type: "spirit", channel: "healing", target: "ally", shape: "line", range: 5, radius: .7, verticalTolerance: 3, timing: [.65, .8, .4, 9], power: 0, exertionCost: 10, aiTags: ["support", "field-utility"], telegraph: "The lantern page becomes clean white before the selected mark fades.", appliesStatus: "inspired", statusDurationSeconds: 4 }),
    ],
  }),
  "choir-of-one": defineExpansionMoveSheet("choir-of-one", {
    basic: "answering-note", fieldUtility: "quiet-measure", passiveStance: "final-rest",
    unlocks: [["answering-note", 1], ["quiet-measure", 5], ["unsaid-step", 18], ["final-rest", 28, "partnered"]],
    moves: [
      authored({ id: "quiet-measure", name: "Quiet Measure", description: "Measures the gap between local sounds and marks a bounded Hush-safe zone.", type: "hush", channel: "field", target: "point", shape: "circle", range: 5, radius: 2.8, verticalTolerance: 3, timing: [.7, 1.2, .3, 6.5], power: 0, exertionCost: 6, aiTags: ["field-utility", "control"], telegraph: "The silver throat-ring closes while a silent circle appears from outside inward." }),
      authored({ id: "answering-note", name: "Answering Note", description: "Releases one stored sound as a narrow Echo reply, never copying an entire move.", type: "echo", channel: "magical", target: "hostile", shape: "line", range: 6, radius: .45, verticalTolerance: 4, timing: [.28, .1, .38, .9], power: .72, exertionCost: 0, aiTags: ["basic", "control"], telegraph: "One implied face appears only as the throat-ring opens." }),
      authored({ id: "unsaid-step", name: "Unsaid Step", description: "Repositions once when directly targeted, leaving no repeated teleport loop.", type: "umbral", channel: "traversal", target: "point", shape: "dash", range: 5.5, radius: .6, verticalTolerance: 4, timing: [.2, .18, .36, 7], power: 0, exertionCost: 9, aiTags: ["mobility", "defense"], telegraph: "The dark mantle points toward the destination before becoming briefly flat." }),
      authored({ id: "final-rest", name: "Final Rest", description: "Ends one long hostile windup inside its Hush zone and returns the stored silence to the world.", type: "hush", channel: "control", target: "hostile", shape: "circle", range: 5, radius: 1.5, verticalTolerance: 3, timing: [.72, .22, .55, 10.5], power: .38, exertionCost: 12, aiTags: ["signature", "control"], telegraph: "Every implied face turns away before the silver ring closes.", appliesStatus: "hushed", statusDurationSeconds: 5 }),
    ],
  }),
  "glasswake-stag": defineExpansionMoveSheet("glasswake-stag", {
    basic: "refracted-charge", fieldUtility: "second-shore", passiveStance: "wakeglass-screen",
    unlocks: [["refracted-charge", 1], ["wakeglass-screen", 5], ["tide-through-air", 18], ["second-shore", 28, "partnered"]],
    moves: [
      authored({ id: "refracted-charge", name: "Refracted Charge", description: "Charges along the second wake inside its body and meets a threat at the remembered shoreline.", type: "mirror", channel: "magical", target: "hostile", shape: "dash", range: 5.5, radius: .9, verticalTolerance: 3, timing: [.48, .2, .5, 1.1], power: .82, exertionCost: 0, aiTags: ["basic", "mobility"], telegraph: "A duplicate shoreline runs through the translucent body before the hooves move.", mountedUse: true }),
      authored({ id: "wakeglass-screen", name: "Wakeglass Screen", description: "Bends ordinary projectiles across a visible reflected plane without affecting legendary attacks.", type: "mirror", channel: "stance", target: "area", shape: "arc", range: 0, radius: 2.8, verticalTolerance: 3, timing: [.55, 1.8, .45, 8.5], power: 0, exertionCost: 9, aiTags: ["defense", "support"], telegraph: "Antlers split incoming light into one broad watery pane.", appliesStatus: "guarded", statusDurationSeconds: 6, mountedUse: true }),
      authored({ id: "tide-through-air", name: "Tide Through Air", description: "Runs a short directed rescue path through reflected air while losing height at the end.", type: "tide", channel: "traversal", target: "point", shape: "dash", range: 8.5, radius: 1.1, verticalTolerance: 6, timing: [.6, .7, .62, 9], power: 0, exertionCost: 13, aiTags: ["mobility", "support"], telegraph: "A sideways ocean pours along the complete route before the first hoof lifts.", mountedUse: true }),
      authored({ id: "second-shore", name: "Second Shore", description: "Marks a brief return path between one still-water reflection and its remembered observer.", type: "dream", channel: "field", target: "point", shape: "line", range: 10, radius: 1.2, verticalTolerance: 5, timing: [.85, 1.3, .4, 11], power: 0, exertionCost: 11, aiTags: ["signature", "field-utility"], telegraph: "The reflection moves first and leaves a pale shore-line behind." }),
    ],
  }),
} satisfies Readonly<Record<ExpansionCreatureKind, AuthoredCreatureMoveSheet>>);

type AuthoredMoveSheet = Readonly<{ types: readonly CreatureTypeId[]; moves: readonly string[] }>;

const FUNCTIONAL_FISH_MOVE_SHEETS: Readonly<Record<string, AuthoredMoveSheet>> = Object.freeze({
  shoalfin: { types: ["tide", "wild"], moves: ["Shoal Slip", "School Call", "Current Sense", "Silver Scatter"] },
  coralback: { types: ["tide", "stone"], moves: ["Reef Dash", "Coral Brace", "Color Display", "Comfort Circuit"] },
  brookdart: { types: ["tide", "wild"], moves: ["Brook Dash", "School Turn", "Water Sense", "Reed Shelter"] },
  gloomfin: { types: ["tide", "umbral"], moves: ["Shadow Slip", "Depth Sense", "Low Light", "Predator Warning"] },
  silverthread: { types: ["tide", "radiant"], moves: ["Thread Flash", "School Call", "Silver Display", "Current Weave"] },
  reedneedle: { types: ["tide", "verdant"], moves: ["Needle Slip", "Plant Pruning", "Water Sense", "Reed Veil"] },
  emberribbon: { types: ["tide", "flame"], moves: ["Ribbon Dash", "Heat Warning", "Ember Display", "Warm Current"] },
  cavefilament: { types: ["tide", "stone"], moves: ["Filament Fold", "Mineral Sense", "Low Light", "Cave School"] },
  "redfin-salmon": { types: ["tide", "wild"], moves: ["Rapid Leap", "Upstream Drive", "Water Sense", "Spawning Call"] },
  "blue-mackerel": { types: ["tide", "wild"], moves: ["Bluebolt Dash", "School Turn", "Predator Warning", "Openwater Circuit"] },
  glassfin: { types: ["tide", "mirror"], moves: ["Refraction Slip", "Mineral Sense", "Glass Display", "Clearwater Veil"] },
  lanternjaw: { types: ["tide", "radiant"], moves: ["Lantern Lunge", "Depth Sense", "Low Light", "Jawflash Warning"] },
  syrupfin: { types: ["tide", "confection"], moves: ["Syrup Skip", "Comfort Circuit", "Bait Shed", "Sweetwater Sense"] },
  glowfin: { types: ["tide", "radiant"], moves: ["Glow Slip", "Low Light", "School Call", "Lumen Display"] },
  "pocket-goldfish": { types: ["tide", "radiant"], moves: ["Pocket Dart", "Comfort Circuit", "Lineage Dance", "Sunscale Display"] },
  "sunwheel-angelfish": { types: ["tide", "radiant"], moves: ["Sunwheel Turn", "School Call", "Fin Display", "Reef Comfort"] },
  "stonewhisker-loach": { types: ["tide", "stone"], moves: ["Silt Slip", "Glass Clean", "Sediment Sense", "Algae Graze"] },
});

const SEA_SLUG_MOVE_SHEETS: Readonly<Record<string, AuthoredMoveSheet>> = Object.freeze({
  "sunset-sea-slug": { types: ["tide", "radiant"], moves: ["Sunset Ripple", "Mantle Flare", "Plant Pruning", "Dusk Display"] },
  "moonlace-sea-slug": { types: ["tide", "dream"], moves: ["Moonlace Drift", "Lace Veil", "Low Light", "Nocturnal Comfort"] },
  "blue-dragon-sea-slug": { types: ["tide", "venom"], moves: ["Bluewing Sail", "Cerata Warning", "Poison Sense", "Pelagic Display"] },
  "leafsheep-sea-slug": { types: ["tide", "verdant"], moves: ["Leafsheep Crawl", "Solar Fold", "Plant Pruning", "Water Clarity"] },
  "sea-bunny-nudibranch": { types: ["tide", "wild"], moves: ["Bunny Hop", "Rhinophore Curl", "Glass Clean", "Resident Comfort"] },
  "spanish-dancer-sea-slug": { types: ["tide", "radiant"], moves: ["Dancer Undulation", "Scarlet Fan", "Breeding Comfort", "Ribbon Display"] },
  "crystal-tipped-nudibranch": { types: ["tide", "stone"], moves: ["Crystal Crawl", "Shard Bristle", "Mineral Stabilizer", "Prism Display"] },
  "ringed-phyllidia": { types: ["tide", "venom"], moves: ["Ringed Crawl", "Warning Rings", "Poison Sense", "Algae Clean"] },
  "hooded-melibe": { types: ["tide", "wild"], moves: ["Hood Sweep", "Hood Closure", "Bait Shed", "Water Clarity"] },
  "sea-angel-slug": { types: ["tide", "sky"], moves: ["Angel Flutter", "Wing Fold", "Low Light", "Water Clarity"] },
  "embercrown-sea-slug": { types: ["tide", "flame"], moves: ["Ember Crawl", "Crown Flare", "Heat Warning", "Plant Pruning"] },
  "kelpwarden-sea-slug": { types: ["tide", "verdant"], moves: ["Kelp Crawl", "Frond Brace", "Plant Pruning", "Algae Clean"] },
  "starlight-choir-sea-slug": { types: ["tide", "echo"], moves: ["Choir Drift", "Silent Chorus", "Low Light", "School Comfort"] },
  "voidglass-sea-slug": { types: ["tide", "umbral"], moves: ["Void Crawl", "Glass Veil", "Mineral Stabilizer", "Poison Warning"] },
});

const AUTHORED_MOVE_SHEETS: Readonly<Record<string, AuthoredMoveSheet>> = Object.freeze({
  ...FUNCTIONAL_FISH_MOVE_SHEETS,
  ...SEA_SLUG_MOVE_SHEETS,
  petalfox: { types: ["wild", "verdant"], moves: ["Briar Pounce", "Petal Feint", "Pollen Hush", "Blossom Search"] },
  "emberbrush-fox": { types: ["wild", "flame"], moves: ["Cinder Pounce", "Petal Feint", "Ashnose Search", "Brushfire Veil"] },
  "moonpetal-fox": { types: ["wild", "dream"], moves: ["Dream Pounce", "Petal Feint", "Moonnose Search", "Pollen Hush"] },
  mossling: { types: ["verdant", "wild"], moves: ["Root Tangle", "Spore Puff", "Moss Mend", "Soil Restoration"] },
  "boglantern-mossling": { types: ["verdant", "tide", "radiant"], moves: ["Root Tangle", "Lantern Spore", "Moss Mend", "Wetbed Recovery"] },
  "cindercone-mossling": { types: ["verdant", "flame"], moves: ["Root Tangle", "Ash Spore", "Moss Mend", "Ashbed Recovery"] },
  "moonbloom-mossling": { types: ["verdant", "dream"], moves: ["Root Tangle", "Dream Spore", "Moss Mend", "Seed Gathering"] },
  "moonbrawn-mossling": { types: ["verdant", "stone"], moves: ["Root Hammer", "Bramble Brace", "Moonberry Mend", "Soil Restoration"] },
  emberjay: { types: ["sky", "flame"], moves: ["Cinder Cry", "Hostile Warning", "Perch Rest", "Scout Route"] },
  "canopy-lark": { types: ["sky", "verdant"], moves: ["Leafbeat", "Mature Tree Mark", "Perch Rest", "Canopy Scout"] },
  "tidewing-gull": { types: ["sky", "tide"], moves: ["Brine Dive", "Fishschool Mark", "Drop Retrieval", "Coast Scout"] },
  frostquill: { types: ["sky", "frost"], moves: ["Quill Flurry", "Storm Warning", "Perch Rest", "Snowline Scout"] },
  runeowl: { types: ["sky", "arcane", "dream"], moves: ["Rune Peck", "Magic Trail Sense", "Night Perch", "Dream Scout"] },
  puddlehopper: { types: ["wild", "tide"], moves: ["Springheel", "Croak Ward", "Mud Splash", "Seep Sense"] },
  burrowbell: { types: ["wild", "echo", "stone"], moves: ["Bell Bump", "Perimeter Bell", "Home Marker", "Ally Chime"] },
  woolhorn: { types: ["wild", "frost"], moves: ["Horn Brace", "Fleece Guard", "Herd Call", "Snow Insulation"] },
  "meadow-cow": { types: ["wild", "verdant"], moves: ["Clover Calm", "Herd Call", "Grazing Circuit", "Compost Drop"] },
  "sunstep-grazer": { types: ["wild", "radiant"], moves: ["Sunward Stomp", "Heat Endurance", "Herd Call", "Savanna Trail"] },
  ridgeback: { types: ["wild", "stone"], moves: ["Ridge Brace", "Pack Carry", "Stone Nudge", "Grounded Stand"] },
  mistmane: { types: ["wild", "dream"], moves: ["Mist Calm", "Fog Sense", "Herd Call", "Quiet Passage"] },
  pebbletortoise: { types: ["wild", "stone"], moves: ["Shell Brace", "Steadying Wake", "Stone Nudge", "Shellbed Tend"] },
  "reefglide-terrapin": { types: ["wild", "stone", "tide"], moves: ["Shell Brace", "Steadying Wake", "Stone Nudge", "Waterplant Tend"] },
  rillehopper: { types: ["wild", "frost"], moves: ["Fourfoot Tap", "Frost Nuzzle", "Low-G Bound", "Sealed Curl"] },
  "vacuum-lantern": { types: ["radiant", "stone"], moves: ["Shell Nudge", "Lantern Pulse", "Quiet Gleam", "Sealed Chamber"] },
  "slatefin-burrower": { types: ["stone", "wild"], moves: ["Slatefin Sweep", "Regolith Slip", "Plate Brace", "Buried Sense"] },
  "morrow-owl": { types: ["dream", "sky"], moves: ["Silent Talon", "Dream Glimmer", "Veil Crossing", "Waystone Rest"] },
  "grotto-grazer": { types: ["wild", "verdant"], moves: ["Root Graze", "Fiber Shake", "Glowroot Tend", "Grotto Brace"] },
  lanternray: { types: ["tide", "radiant", "sky"], moves: ["Lantern Sweep", "Living Light", "Cavern Glide", "Rescue Screen"] },
  "prismtail-swift": { types: ["sky", "stone", "arcane"], moves: ["Prism Dart", "Crystal Warning", "Tailflash", "Gallery Scout"] },
  "glassback-newt": { types: ["wild", "tide", "verdant"], moves: ["Newt Dash", "Gill Mend", "Plant Tend", "Water Warning"] },
  "sailfin-skimmer": { types: ["tide", "stone"], moves: ["Sail Dash", "Mineral Sense", "Fin Brace", "Water Warning"] },
  "ashnose-bat": { types: ["sky", "echo", "wild"], moves: ["Echo Nip", "Warm Cave Sense", "Guano Cycle", "Ceiling Rest"] },
  chimewing: { types: ["sky", "echo", "spirit"], moves: ["Chimebeat", "Opening Resonance", "Spirit Warning", "Cavern Scout"] },
  "cinder-kite": { types: ["sky", "flame", "stone"], moves: ["Cinder Swoop", "Pressure Warning", "Fumarole Sense", "Ash Glide"] },
  veinling: { types: ["metal", "stone"], moves: ["Seam Tap", "Ore Memory", "Unresolved Pulse", "Vein Sense"] },
  caveblob: { types: ["tide", "venom"], moves: ["Gel Slap", "Waste Process", "Containment Fold", "Acid Warning"] },
  rattlekin: { types: ["spirit", "stone"], moves: ["Bone Club", "Reliquary Rattle", "Seal Brace", "Dungeon Memory"] },
  skeleton: { types: ["spirit", "metal"], moves: ["Nocked Shot", "Bone Guard", "Reliquary Rattle", "Dungeon Memory"] },
  zombie: { types: ["spirit", "umbral"], moves: ["Grave Swipe", "Rotten Guard", "Containment Groan", "Dungeon Memory"] },
  "wild-horse": { types: ["wild"], moves: ["Hoof Check", "Trail Canter", "Herd Call", "Steady Gallop"] },
  "rimehoof-courser": { types: ["wild", "frost"], moves: ["Rime Hoof", "Snow Canter", "Frost Guard", "Ice Confidence"] },
  "sunscar-courser": { types: ["wild", "flame"], moves: ["Sunscar Kick", "Dune Canter", "Heat Guard", "Sand Confidence"] },
  "mirestride-courser": { types: ["wild", "tide"], moves: ["Mire Hoof", "Bog Canter", "Mud Guard", "Wetland Confidence"] },
  "starbough-courser": { types: ["wild", "dream"], moves: ["Star Hoof", "Dream Canter", "Moon Guard", "Glimmer Confidence"] },
  "deepgear-courser-golem": { types: ["metal", "storm"], moves: ["Rivet Hoof", "Charge Canter", "Aether Guard", "Chassis Calibration"] },
  reedstrider: { types: ["wild", "tide"], moves: ["Reed Kick", "Wading Step", "Wing Screen", "Shallowwater Sense"] },
  warg: { types: ["wild", "umbral"], moves: ["Mounted Bite", "Road Scent", "Pack Howl", "Shadow Pursuit"] },
  taffalo: { types: ["wild", "confection"], moves: ["Taffy Shove", "Cargo Brace", "Group Comfort", "Sweetroad Trudge"] },
  "meadow-cottontail": { types: ["wild"], moves: ["Burrow Hop", "Garden Sense", "Soft Warning", "Companion Rest"] },
  "russet-rabbit": { types: ["wild"], moves: ["Russet Hop", "Burrow Sense", "Garden Nibble", "Companion Rest"] },
  "frost-hare": { types: ["wild", "frost"], moves: ["Snow Hop", "Storm Warning", "Burrow Sense", "Companion Rest"] },
  "chocolate-bunny": { types: ["wild", "confection"], moves: ["Cocoa Hop", "Sweet Comfort", "Burrow Sense", "Companion Rest"] },
  "praline-cat": { types: ["wild", "confection"], moves: ["Soft Pounce", "Pest Sense", "Stealth Step", "Hearth Comfort"] },
  "bramblewhisk-cat": { types: ["wild", "verdant"], moves: ["Briar Pounce", "Pest Sense", "Stealth Step", "Hearth Comfort"] },
  "taffy-hound": { types: ["wild", "confection"], moves: ["Guard Bark", "Trail Scent", "Drop Retrieval", "Hearth Comfort"] },
  "rimecoat-hound": { types: ["wild", "frost"], moves: ["Guard Bark", "Snow Scent", "Drop Retrieval", "Storm Warning"] },
  "copper-mole": { types: ["wild", "stone", "metal"], moves: ["Copper Claw", "Ore Chirp", "Burrow Sense", "Tunnel Brace"] },
  tidepup: { types: ["wild", "tide"], moves: ["Tide Nip", "Dive Fetch", "Rescue Tow", "Current Warning"] },
  peelop: { types: ["wild", "confection"], moves: ["Peelop Bonk", "Sugar Shed", "Companion Cheer", "Soft Roll"] },
  "copper-scout-golem": { types: ["metal", "storm"], moves: ["Copper Jab", "Survey Pulse", "Core Guard", "Chassis Calibration"] },
  "stone-bulwark-golem": { types: ["metal", "stone"], moves: ["Bulwark Slam", "Rampart Guard", "Anchor Step", "Chassis Calibration"] },
  "aetherforged-sentinel": { types: ["metal", "arcane"], moves: ["Aether Lance", "Ward Screen", "Threat Sense", "Chassis Calibration"] },
  "clockwork-hound-golem": { types: ["metal", "wild"], moves: ["Clockwork Bite", "Track Signal", "Core Guard", "Chassis Calibration"] },
  "webspinner-golem": { types: ["metal", "venom"], moves: ["Web Bolt", "Loom Snare", "Core Guard", "Chassis Calibration"] },
  "thornhide-trufflehog": { types: ["wild", "verdant"], moves: ["Snuffle", "Root Toss", "Bramble Brace", "Truffle Trail"] },
  "orchard-glider": { types: ["wild", "sky"], moves: ["Canopy Leap", "Seed Carry", "Fruitmark Call", "Slipstream"] },
  "petalmask-tanuki": { types: ["wild", "dream", "verdant"], moves: ["False Trail", "Petal Feint", "Moonmask", "Borrowed Scent"] },
  "ironbeak-magpie": { types: ["sky", "metal", "wild"], moves: ["Shiny Lure", "Peck", "Cachemark", "Snatch and Return"] },
  "hearthback-badger": { types: ["wild", "stone"], moves: ["Dig", "Root Rake", "Burrow Guard", "Hearthstand"] },
  "sunfoil-pangolin": { types: ["wild", "metal", "radiant"], moves: ["Tongue Flick", "Scale Curl", "Sunfoil Flash", "Mound Break"] },
  "glassstep-jerboa": { types: ["wild", "stone"], moves: ["Sand Skip", "Burrow Sense", "Glassstep", "Dust Decoy"] },
  "stormcrest-ibex": { types: ["wild", "stone", "storm"], moves: ["Horn Check", "Cliffstep", "Static Coat", "Fall Rescue"] },
  "cindercoil-gecko": { types: ["wild", "flame", "stone"], moves: ["Heat Sense", "Ember Spit", "Wall Cling", "Kiln Nap"] },
  "cloudkite-pika": { types: ["wild", "sky", "echo"], moves: ["Wind Chime", "Updraft Pulse", "Warning Whistle", "Soft Landing"] },
  "briarclaw-lynx": { types: ["wild", "verdant"], moves: ["Stalk", "Briar Pounce", "Rake", "Vanish into Cover"] },
  "gravebell-jackal": { types: ["wild", "spirit", "umbral"], moves: ["Grave Scent", "Bell Howl", "Spirit Nip", "Relic Guard"] },
  "cragglass-basilisk": { types: ["wild", "stone", "arcane"], moves: ["Heavy Bite", "Glass Gaze", "Stonewake", "Reflective Molt"] },
  "stormglass-roclet": { types: ["sky", "storm", "stone"], moves: ["Gust Peck", "Static Wing", "Carry Rescue", "Thunder Dive"] },
  "brinewhisk-otter": { types: ["wild", "tide"], moves: ["Shell Toss", "Dive Fetch", "Playful Feint", "Rescue Tow"] },
  "riverwright-beaver": { types: ["wild", "tide", "verdant"], moves: ["Log Carry", "Tail Slap", "Current Read", "Lodge Mend"] },
  "mirecrown-crane": { types: ["sky", "tide", "verdant"], moves: ["Reed Call", "Cleansing Step", "Wing Screen", "Pond Sense"] },
  "inkveil-cuttle": { types: ["tide", "umbral", "dream"], moves: ["Ink Cloud", "Colorveil", "Jet Dash", "False Silhouette"] },
  "prismclaw-mantis-shrimp": { types: ["tide", "stone", "radiant"], moves: ["Prism Punch", "Shell Brace", "Crack Finder", "Flashburst"] },
  "reefmender-shrimp": { types: ["tide", "verdant", "radiant"], moves: ["Clean", "Mend Gill", "Alarm Flick", "Coral Tend"] },
  "currentweaver-eel": { types: ["tide", "storm"], moves: ["Current Coil", "Charge Drink", "Arc Snap", "Lamp Link"] },
  "shellcarrier-hermit": { types: ["wild", "tide", "stone"], moves: ["Shell Swap", "Scuttle", "Sand Sift", "Satchel Brace"] },
  "wreckwhistle-porpoise": { types: ["wild", "tide", "echo"], moves: ["Wrecksong", "Wake Dash", "Rescue Lift", "Pod Call"] },
  "kilnscale-salamander": { types: ["wild", "flame", "stone"], moves: ["Warmth Field", "Emberlick", "Fumarole Vent", "Cooled Skin"] },
  "sporeback-gardener": { types: ["verdant", "wild", "venom"], moves: ["Spore Sow", "Compost", "Mycelial Mend", "Puff Screen"] },
  "voidmantle-ray": { types: ["sky", "umbral", "tide"], moves: ["Lumen Feed", "Silent Glide", "Mantle Screen", "Abyssal Sweep"] },
  "fossilback-trilobite": { types: ["stone", "tide", "wild"], moves: ["Sediment Sense", "Curl", "Fossil Tap", "Ancient Wake"] },
  "ilyr-virebloom": { types: ["verdant", "tide", "dream", "radiant", "spirit"], moves: ["Springstep", "Antler Orchard", "Dreaming Rain", "Sanctuary Charge", "Root of Mercy"] },
  thalassene: { types: ["tide", "stone", "verdant", "radiant"], moves: ["Reefwall", "Current Cathedral", "Sunlit Breach", "Cleaning Tide", "Deep Roll"] },
  orichalc: { types: ["metal", "stone", "spirit"], moves: ["Faultline Hand", "Ore Memory", "Rivet Rain", "Unfinished Heart"] },
  "varkesh-stormmane": { types: ["sky", "storm", "wild"], moves: ["Roadless Gale", "Thunder Dive", "Cloud Carry", "Beacon Cry"] },
  kharza: { types: ["wild", "umbral", "metal"], moves: ["Banner Rend", "Packbreak Howl", "Chain Leap", "Red Pursuit"] },
  "sugarwake-sovereign": { types: ["confection", "arcane", "flame", "dream", "draconic"], moves: ["Caramel Rampart", "Festival Flare", "Ribbon Charge", "Tempering Song"] },
  asterjaw: { types: ["sky", "radiant", "spirit"], moves: ["Meridian Scent", "Roadless Leap", "Starbite", "Homeward Arc"] },
  "vellum-warden": { types: ["arcane", "dream", "spirit"], moves: ["Margin Guard", "Redline", "Borrowed Clause", "Blank Page"] },
  "choir-of-one": { types: ["hush", "echo", "umbral"], moves: ["Quiet Measure", "Answering Note", "Unsaid Step", "Final Rest"] },
  "glasswake-stag": { types: ["mirror", "tide", "dream"], moves: ["Refracted Charge", "Wakeglass Screen", "Tide Through Air", "Second Shore"] },
});

const slug = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
const supportWords = /guard|brace|screen|wall|coat|molt|skin|curl|stand|rampart/iu;
const healingWords = /mend|clean|mercy|rescue|rest|landing|tend|cathedral/iu;
const utilityWords = /sense|scent|trail|finder|mark|read|carry|fetch|call|song|memory|compost|link|sift|swap|tow|lift|page|warning|search|scout|perch|rest|comfort|clean|clarity|pruning|stabilizer|display|light|cycle|tend|retrieval|calibration|confidence|hush|chirp|gathering|shed|home marker/iu;
const mobilityWords = /leap|step|dash|glide|charge|dive|scuttle|pursuit|wake/iu;

function authoredMovesForSheet(kind: string, sheet: AuthoredMoveSheet): readonly CreatureMoveDefinition[] {
  return Object.freeze(sheet.moves.map((name, index) => {
    const type = sheet.types[index % sheet.types.length] ?? "neutral";
    const support = supportWords.test(name);
    const healing = healingWords.test(name);
    const utility = utilityWords.test(name);
    const mobility = mobilityWords.test(name);
    const last = index === sheet.moves.length - 1;
    const channel: MoveChannel = healing ? "healing" : support ? "stance" : utility && !mobility ? "field" : index % 3 === 2 ? "magical" : "physical";
    const target: MoveTargetRule = healing ? "ally" : support ? "self" : utility && !mobility ? "point" : "hostile";
    const damaging = target === "hostile";
    const signature = sheet.moves.length > 4 ? last : index === 2;
    return Object.freeze({
      id: `${kind}--${slug(name)}`, name,
      description: `An authored ${typeTitle(type)} technique belonging to ${kind.replaceAll("-", " ")}.`, type,
      packets: Object.freeze([{ type, share: 1 }]), channel, target,
      shape: support || healing ? "circle" : mobility ? "dash" : index % 2 ? "line" : "contact",
      range: target === "self" ? 0 : utility ? 7 : mobility ? 4.8 : index % 2 ? 5.4 : 1.75,
      radius: support || healing ? 2.4 : utility ? 2.2 : .72,
      verticalTolerance: mobility || utility ? 3.4 : 1.9,
      windupSeconds: damaging ? .25 + index * .1 : .32,
      activeSeconds: damaging ? .16 + Math.min(.16, index * .03) : .72,
      recoverySeconds: damaging ? .34 + index * .09 : .3,
      cooldownSeconds: index === 0 ? 1.05 : 4.2 + index * 1.5,
      power: damaging ? .72 + index * .18 : 0,
      exertionCost: mobility ? 12 : signature ? 10 : 4,
      interruptible: !support, superArmor: support, requiresLineOfSight: target !== "self",
      mountedUse: mobility || index === 0, friendlyFire: false, worldImpact: utility ? "soft" : damaging ? "visual" : "none",
      appliesStatus: healing ? "inspired" : support ? "guarded" : TYPE_STATUS[type],
      statusDurationSeconds: healing || support ? 5 : TYPE_STATUS[type] ? 4 : undefined,
      aiTags: tags(index === 0 ? "basic" : signature ? "signature" : mobility ? "mobility" : support ? "defense" : utility ? "field-utility" : "control", ...(healing ? ["support" as const] : [])),
      telegraph: `${name} begins with a distinct ${typeTitle(type)} posture and color-independent silhouette change.`,
      soundCue: `${kind}-${slug(name)}`,
    });
  }));
}

const LEGACY_AUTHORED_MOVE_LIST = Object.freeze(Object.entries(AUTHORED_MOVE_SHEETS)
  .filter(([kind]) => !Object.hasOwn(EXPANSION_CREATURE_MOVE_SHEETS, kind))
  .flatMap(([kind, sheet]) => authoredMovesForSheet(kind, sheet)));
const EXPANSION_AUTHORED_MOVE_LIST = Object.freeze(Object.values(EXPANSION_CREATURE_MOVE_SHEETS).flatMap((sheet) => sheet.moves));

const GENERATED_MOVES = CREATURE_TYPE_IDS.flatMap((type) => makeTypeMoves(type));
export const CREATURE_MOVES: Readonly<Record<string, CreatureMoveDefinition>> = Object.freeze(Object.fromEntries(
  [...GENERATED_MOVES, ...LEGACY_AUTHORED_MOVE_LIST, ...EXPANSION_AUTHORED_MOVE_LIST].map((move) => [move.id, move]),
));
export const CREATURE_MOVE_IDS = Object.freeze(Object.keys(CREATURE_MOVES));

export const CREATURE_STATUSES: Readonly<Record<CreatureStatusId, CreatureStatusDefinition>> = Object.freeze({
  burning: { id: "burning", name: "Burning", description: "Takes bounded heat damage and becomes vulnerable to Tide relief.", maximumStacks: 3, maximumDurationSeconds: 12, harmful: true, typeStepModifiers: { flame: -1, tide: 1 } },
  chilled: { id: "chilled", name: "Chilled", description: "Slower recovery; blunt or Stone impacts can Shatter the chill.", maximumStacks: 2, maximumDurationSeconds: 10, harmful: true },
  soaked: { id: "soaked", name: "Soaked", description: "Enables one Conductive arc and dampens Burning.", maximumStacks: 2, maximumDurationSeconds: 12, harmful: false, typeStepModifiers: { storm: 1, flame: -1 } },
  shocked: { id: "shocked", name: "Shocked", description: "Briefly disrupts move windups.", maximumStacks: 2, maximumDurationSeconds: 6, harmful: true },
  rooted: { id: "rooted", name: "Rooted", description: "Restricts translation while preserving turning and defensive actions.", maximumStacks: 1, maximumDurationSeconds: 5, harmful: true },
  poisoned: { id: "poisoned", name: "Poisoned", description: "Bounded damage over time that cannot finish protected story actors.", maximumStacks: 3, maximumDurationSeconds: 14, harmful: true },
  dazzled: { id: "dazzled", name: "Dazzled", description: "Reduces target confidence and ranged accuracy.", maximumStacks: 1, maximumDurationSeconds: 6, harmful: true },
  veiled: { id: "veiled", name: "Veiled", description: "Harder to target at range until Radiant or Echo reveals it.", maximumStacks: 1, maximumDurationSeconds: 8, harmful: false },
  fractured: { id: "fractured", name: "Fractured", description: "The next suitable physical hit can Breach part of Guard.", maximumStacks: 2, maximumDurationSeconds: 10, harmful: true },
  hushed: { id: "hushed", name: "Hushed", description: "Suppresses Echo and prolonged casting until broken.", maximumStacks: 1, maximumDurationSeconds: 7, harmful: true },
  inspired: { id: "inspired", name: "Inspired", description: "The next signature move gains a modest cooldown refund.", maximumStacks: 1, maximumDurationSeconds: 15, harmful: false },
  guarded: { id: "guarded", name: "Guarded", description: "Raises physical and magical mitigation without granting immunity.", maximumStacks: 2, maximumDurationSeconds: 8, harmful: false },
});

export const CREATURE_REACTIONS: readonly CreatureReactionDefinition[] = Object.freeze([
  { id: "conductive", name: "Conductive", setupStatus: "soaked", followupTypes: ["storm"], consumesSetup: false, cooldownSeconds: 4, description: "One bounded nearby arc, then Soaked loses one stack." },
  { id: "shatter", name: "Shatter", setupStatus: "chilled", followupTypes: ["stone"], followupChannels: ["physical"], consumesSetup: true, cooldownSeconds: 5, description: "Adds stagger, never a universal damage explosion." },
  { id: "steamveil", name: "Steamveil", setupStatus: "burning", followupTypes: ["tide"], consumesSetup: true, cooldownSeconds: 3, description: "Removes Burning and creates a brief obscuring steam tell." },
  { id: "brushfire", name: "Brushfire", setupStatus: "rooted", followupTypes: ["flame"], consumesSetup: true, cooldownSeconds: 6, description: "Ends Rooted and creates a small bounded Flame pulse." },
  { id: "breach", name: "Breach", setupStatus: "fractured", followupTypes: ["neutral", "metal"], followupChannels: ["physical", "mixed"], consumesSetup: true, cooldownSeconds: 4, description: "Ignores part of Guard for one hit." },
  { id: "revealed", name: "Revealed", setupStatus: "veiled", followupTypes: ["radiant", "echo"], consumesSetup: true, cooldownSeconds: 4, description: "Ends concealment and briefly preserves tracking." },
  { id: "broken-silence", name: "Broken Silence", setupStatus: "hushed", followupTypes: ["storm", "wild"], consumesSetup: true, cooldownSeconds: 5, description: "Ends Hush with a readable sound burst." },
  { id: "concord", name: "Concord", setupStatus: "inspired", followupTypes: [...CREATURE_TYPE_IDS], consumesSetup: true, cooldownSeconds: 8, description: "A signature move receives a modest cooldown refund." },
]);

export function defaultMoveSetForTypes(naturalTypes: readonly CreatureTypeId[]): CreatureMoveSet {
  const primary = naturalTypes[0] ?? "neutral";
  const secondary = naturalTypes[1] ?? (primary === "neutral" ? "wild" : "neutral");
  const unique = (ids: readonly string[]) => [...new Set(ids)];
  const unlocks = unique([
    `${primary}-basic`, `${primary}-surge`, `${secondary}-basic`, `${primary}-guard`, `${secondary}-surge`, `${secondary}-guard`,
  ]).map((moveId, index) => Object.freeze({ moveId, level: [1, 5, 10, 18, 28, 40][Math.min(index, 5)] }));
  return Object.freeze({
    basicMoveId: `${primary}-basic`,
    unlocks: Object.freeze(unlocks),
    fieldUtilityMoveId: `${primary}-utility`,
    passiveStanceMoveId: `${primary}-guard`,
  });
}

export function authoredMoveSetForKind(kind: string): CreatureMoveSet | null {
  const expansion = EXPANSION_CREATURE_MOVE_SHEETS[kind as ExpansionCreatureKind];
  if (expansion) return Object.freeze({
    basicMoveId: expansion.basicMoveId, unlocks: expansion.unlocks,
    fieldUtilityMoveId: expansion.fieldUtilityMoveId, passiveStanceMoveId: expansion.passiveStanceMoveId,
  });
  const sheet = AUTHORED_MOVE_SHEETS[kind];
  if (!sheet) return null;
  const ids = sheet.moves.map((name) => `${kind}--${slug(name)}`);
  return Object.freeze({
    basicMoveId: ids[0],
    unlocks: Object.freeze(ids.map((moveId, index) => Object.freeze({ moveId, level: [1, 5, 10, 18, 28, 40][Math.min(index, 5)] }))),
    fieldUtilityMoveId: ids.find((id) => CREATURE_MOVES[id]?.aiTags.includes("field-utility")) ?? ids[ids.length - 1],
    passiveStanceMoveId: ids.find((id) => CREATURE_MOVES[id]?.aiTags.includes("defense")) ?? ids[0],
  });
}

export function learnedMovesAtLevel(moveSet: CreatureMoveSet, level: number, bondTier: "wary" | "familiar" | "trusted" | "partnered" | "kindred" = "wary") {
  const bondRank = { wary: 0, familiar: 1, trusted: 2, partnered: 3, kindred: 4 } as const;
  return Object.freeze(moveSet.unlocks
    .filter((unlock) => level >= unlock.level && (!unlock.bondTier || bondRank[bondTier] >= bondRank[unlock.bondTier]))
    .map((unlock) => unlock.moveId));
}

export function selectAiLoadout(moveSet: CreatureMoveSet, level: number) {
  const learned = learnedMovesAtLevel(moveSet, level);
  return Object.freeze([...learned].sort((left, right) => {
    const leftBasic = CREATURE_MOVES[left]?.aiTags.includes("basic") ? 1 : 0;
    const rightBasic = CREATURE_MOVES[right]?.aiTags.includes("basic") ? 1 : 0;
    return rightBasic - leftBasic || (CREATURE_MOVES[right]?.power ?? 0) - (CREATURE_MOVES[left]?.power ?? 0);
  }).slice(0, 4));
}

export function validateCreatureMoveRegistry() {
  const errors: string[] = [];
  const ids = Object.keys(CREATURE_MOVES);
  if (new Set(ids).size !== ids.length) errors.push("Move ids must be unique.");
  for (const move of Object.values(CREATURE_MOVES)) {
    if (!move.name.trim() || !move.telegraph.trim() || !move.soundCue.trim()) errors.push(`${move.id} lacks readable presentation.`);
    if (move.windupSeconds < 0.15 && move.power > 1) errors.push(`${move.id} deals strong damage without a readable windup.`);
    if (move.activeSeconds <= 0 || move.cooldownSeconds < 0) errors.push(`${move.id} has invalid timing.`);
    if (!move.packets.length || move.packets.some((packet) => packet.share <= 0)) errors.push(`${move.id} has invalid typed packets.`);
  }
  for (const sheet of Object.values(EXPANSION_CREATURE_MOVE_SHEETS)) {
    if (sheet.moves.length < 4 || sheet.unlocks.filter((unlock) => unlock.moveId !== sheet.basicMoveId).length < 3) errors.push(`${sheet.kind} lacks three authored progression moves.`);
    for (const move of sheet.moves) {
      if (!CREATURE_MOVES[move.id]) errors.push(`${sheet.kind} references unregistered authored move ${move.id}.`);
      if (/^An authored\b/iu.test(move.description)) errors.push(`${move.id} retained a generated description.`);
    }
  }
  return Object.freeze(errors);
}
