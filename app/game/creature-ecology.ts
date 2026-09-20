import type { HabitatNeedId } from "./creature-care";
import { isMorrowMobKind } from "./morrow-ecology";
import type { CreatureTypeSource } from "./creature-types";
import { PRIME_FORM_PROFILES } from "./creature-rarity";
import {
  AQUARIUM_MOB_ORDER, AQUATIC_MOB_ORDER, BIRD_ORDER, BUTTERFLY_ORDER, DRAGON_ORDER, HEARTHROADS_AQUATIC_ORDER,
  LEGENDARY_CREATURE_ORDER, LIVING_ROSTER_ORDER, MOB_DEFS, MOB_ORDER, MOSSLING_VARIANT_ORDER, POLLINATOR_ORDER,
  RABBIT_ORDER, SENTIENT_MOB_ORDER, SUMMONED_CREATURE_ORDER, TIDEGLASS_AQUATIC_ORDER, UNDERGROUND_MOB_ORDER,
  V1_FACTION_CREATURE_ORDER, type LegendaryCreatureKind, type LivingRosterKind, type MobKind, type SummonedCreatureKind,
} from "./mobs";

export type CreatureWorkRole =
  | "scout" | "forager" | "tracker" | "retriever" | "sentinel" | "herd-support" | "pack" | "mount"
  | "garden" | "soil" | "compost" | "aquarium" | "pollination" | "light" | "weather" | "mineral-sense"
  | "rescue" | "containment" | "construct-work" | "sanctuary" | "companion" | "none";
export type AquariumRole =
  | "cleaner" | "schooler" | "indicator" | "bait-producer" | "salvager" | "breeder" | "display"
  | "plant-pruner" | "clarifier" | "mineral-stabilizer" | "comfort" | "poison-warning" | "glass-cleaner" | "low-light";
export type PollinationRole = "day-broad" | "night-broad" | "cold" | "hot" | "wetland" | "orchard" | "moon-bloom" | "colony";
export type ContainmentMode = "ordinary" | "aquarium" | "exhibit" | "reliquary" | "research-cell" | "construct-bay" | "legendary-world" | "summon-contract" | "sentient";

export type CreatureShellModule = "moss" | "flower" | "fungus" | "water-plant";
export type CreatureWorkAssignment = CreatureWorkRole | "rest";
export type CreatureWorkAnchor = Readonly<{ x: number; y: number; z: number }>;
export type CreatureWorkState = Readonly<{
  schema: 1;
  assignment: CreatureWorkAssignment;
  home: CreatureWorkAnchor | null;
  shellModule: CreatureShellModule | null;
  habitatCycles: number;
  adaptation: string | null;
  maintenance: number;
  refinementTier: 0 | 1 | 2 | 3;
  completedCycles: number;
  lastCycleAt: number;
  lastSignal: string | null;
  lastSignalAt: number;
}>;

export type CreatureWorkObservation = Readonly<{
  worldSeconds: number;
  habitatTag?: "meadow" | "woodland" | "bog" | "snow" | "ash" | "cave" | "coast" | "desert" | "ordinary";
  hostileCount?: number;
  unknownActorCount?: number;
  allyCount?: number;
  flowerCount?: number;
  maturePlantCount?: number;
  wetCellCount?: number;
  oreSignal?: "iron" | "gold" | "crystal" | "veinmetal" | null;
  looseItemCount?: number;
  livestockCount?: number;
  damagedAllyCount?: number;
  unstableCrystalCount?: number;
  caveOpeningCount?: number;
  heatPressure?: number;
}>;

export type CreatureWorkResult = Readonly<{
  state: CreatureWorkState;
  role: CreatureWorkRole | null;
  signalId: string | null;
  message: string | null;
  mapSignal: "flower" | "water" | "ore" | "coast" | "cave" | "hazard" | "hostile" | "resource" | null;
  gardenPower: number;
  pollinationPower: number;
  retrievalPower: number;
  rescuePower: number;
  comfortPower: number;
}>;

const WORK_ROLES = new Set<CreatureWorkRole>([
  "scout", "forager", "tracker", "retriever", "sentinel", "herd-support", "pack", "mount",
  "garden", "soil", "compost", "aquarium", "pollination", "light", "weather", "mineral-sense",
  "rescue", "containment", "construct-work", "sanctuary", "companion", "none",
]);
const SHELL_MODULES = new Set<CreatureShellModule>(["moss", "flower", "fungus", "water-plant"]);
const finite = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const clampWork = (value: unknown, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, finite(value, minimum)));

export function createCreatureWorkState(kind: MobKind): CreatureWorkState {
  return Object.freeze({
    schema: 1,
    assignment: CREATURE_ECOLOGY_CONTRACTS?.[kind]?.workRoles[0] ?? "rest",
    home: null,
    shellModule: null,
    habitatCycles: 0,
    adaptation: null,
    maintenance: MOB_DEFS[kind].family === "construct" ? 100 : 0,
    refinementTier: 0,
    completedCycles: 0,
    lastCycleAt: 0,
    lastSignal: null,
    lastSignalAt: 0,
  });
}

export function normalizeCreatureWorkState(kind: MobKind, value: unknown): CreatureWorkState {
  const fallback = createCreatureWorkState(kind);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const raw = value as Record<string, unknown>;
  const contract = CREATURE_ECOLOGY_CONTRACTS[kind];
  const requested = raw.assignment;
  const assignment = requested === "rest" ? "rest"
    : typeof requested === "string" && WORK_ROLES.has(requested as CreatureWorkRole) && contract.workRoles.includes(requested as CreatureWorkRole)
      ? requested as CreatureWorkRole : fallback.assignment;
  const homeRaw = raw.home;
  const home = homeRaw && typeof homeRaw === "object" && !Array.isArray(homeRaw)
    && ["x", "y", "z"].every((key) => Number.isFinite((homeRaw as Record<string, unknown>)[key]))
    ? Object.freeze({ x: finite((homeRaw as Record<string, unknown>).x), y: finite((homeRaw as Record<string, unknown>).y), z: finite((homeRaw as Record<string, unknown>).z) }) : null;
  const shellModule = typeof raw.shellModule === "string" && SHELL_MODULES.has(raw.shellModule as CreatureShellModule)
    && (kind === "pebbletortoise" || kind === "reefglide-terrapin") ? raw.shellModule as CreatureShellModule : null;
  const tier = Math.floor(clampWork(raw.refinementTier, 0, 3)) as 0 | 1 | 2 | 3;
  return Object.freeze({
    schema: 1,
    assignment,
    home,
    shellModule,
    habitatCycles: Math.floor(clampWork(raw.habitatCycles, 0, 1_000_000)),
    adaptation: typeof raw.adaptation === "string" && raw.adaptation.length <= 48 ? raw.adaptation : null,
    maintenance: MOB_DEFS[kind].family === "construct" ? clampWork(raw.maintenance, 0, 100) : 0,
    refinementTier: tier,
    completedCycles: Math.floor(clampWork(raw.completedCycles, 0, 1_000_000_000)),
    lastCycleAt: clampWork(raw.lastCycleAt, 0, Number.MAX_SAFE_INTEGER),
    lastSignal: typeof raw.lastSignal === "string" && raw.lastSignal.length <= 120 ? raw.lastSignal : null,
    lastSignalAt: clampWork(raw.lastSignalAt, 0, Number.MAX_SAFE_INTEGER),
  });
}

export function assignCreatureWork(
  kind: MobKind,
  value: unknown,
  assignment: CreatureWorkAssignment,
  home: CreatureWorkAnchor | null,
): CreatureWorkState | null {
  const state = normalizeCreatureWorkState(kind, value);
  if (assignment !== "rest" && !CREATURE_ECOLOGY_CONTRACTS[kind].workRoles.includes(assignment)) return null;
  return Object.freeze({ ...state, assignment, home: home ? Object.freeze({ ...home }) : state.home });
}

export function fitCreatureShellModule(kind: MobKind, value: unknown, module: CreatureShellModule | null): CreatureWorkState | null {
  if (kind !== "pebbletortoise" && kind !== "reefglide-terrapin") return null;
  return Object.freeze({ ...normalizeCreatureWorkState(kind, value), shellModule: module });
}

const mosslingAdaptation = (habitat: NonNullable<CreatureWorkObservation["habitatTag"]>) => habitat === "bog" ? "bog-lantern"
  : habitat === "snow" ? "snow-insulation" : habitat === "ash" ? "cinder-bed" : habitat === "cave" ? "moon-cultivator"
    : habitat === "woodland" || habitat === "meadow" ? "green-patch" : null;

/**
 * Resolves one authored work beat. The engine supplies bounded spatial summaries;
 * this function never scans blocks or actors and is deterministic for save tests.
 */
export function resolveCreatureWorkCycle(kind: MobKind, value: unknown, observation: CreatureWorkObservation): CreatureWorkResult {
  let state = normalizeCreatureWorkState(kind, value);
  const role = state.assignment === "rest" || state.assignment === "none" ? null : state.assignment;
  if (!role) return Object.freeze({ state, role: null, signalId: null, message: null, mapSignal: null, gardenPower: 0, pollinationPower: 0, retrievalPower: 0, rescuePower: 0, comfortPower: 0 });
  let signalId: string | null = null;
  let message: string | null = null;
  let mapSignal: CreatureWorkResult["mapSignal"] = null;
  let gardenPower = 0;
  let pollinationPower = 0;
  let retrievalPower = 0;
  let rescuePower = 0;
  let comfortPower = 0;
  const name = MOB_DEFS[kind].name;
  const setSignal = (id: string, text: string, map: CreatureWorkResult["mapSignal"]) => { signalId = id; message = text; mapSignal = map; };
  if (role === "sentinel" && (observation.hostileCount ?? 0) > 0) setSignal("hostile", `${name} gives its hostile warning.`, "hostile");
  else if (kind === "burrowbell" && (observation.unknownActorCount ?? 0) > 0) setSignal("unknown", "The Burrowbell rings a questioning two-note warning.", "hazard");
  else if (kind === "burrowbell" && (observation.allyCount ?? 0) > 0) setSignal("returning-ally", "The Burrowbell answers a returning ally with a warm low chime.", null);
  else if ((role === "forager" || role === "garden") && (observation.flowerCount ?? 0) > 0) setSignal("flowers", `${name} traces a careful route toward living blooms.`, "flower");
  else if (kind === "puddlehopper" && (observation.wetCellCount ?? 0) > 0) setSignal("seepage", "The Puddlehopper's measured croak points toward fresh seepage or rain-fed water.", "water");
  else if (role === "mineral-sense" && observation.oreSignal) setSignal(`ore:${observation.oreSignal}`, `${name} indicates ${observation.oreSignal === "veinmetal" ? "an unresolved living-metal resonance" : `a ${observation.oreSignal} trace`} without exposing the exact block.`, "ore");
  else if (kind === "prismtail-swift" && (observation.unstableCrystalCount ?? 0) > 0) setSignal("unstable-crystal", "The Prismtail Swift fans its mineral feathers at unstable crystal pressure.", "hazard");
  else if (kind === "chimewing" && (observation.caveOpeningCount ?? 0) > 0) setSignal("cavern-opening", "Chimewing resonance reveals a nearby open cavern route.", "cave");
  else if (kind === "cinder-kite" && (observation.heatPressure ?? 0) > .65) setSignal("fumarole-pressure", "The Cinder Kite's vents flare before the fumarole pressure peaks.", "hazard");
  else if ((role === "retriever" || role === "scout") && (observation.looseItemCount ?? 0) > 0) setSignal("loose-item", `${name} marks a recoverable loose item.`, "resource");
  if (role === "garden" || role === "soil" || role === "compost") gardenPower = Math.min(1, .34 + (observation.maturePlantCount ?? 0) * .03);
  if (role === "pollination") pollinationPower = .5;
  if (role === "retriever") retrievalPower = Math.min(1, (observation.looseItemCount ?? 0) * .25);
  if (role === "rescue") rescuePower = Math.min(1, (observation.damagedAllyCount ?? 0) * .35);
  if (role === "herd-support" || role === "companion") comfortPower = Math.min(1, .2 + (observation.livestockCount ?? 0) * .08);
  const habitatCycles = state.habitatCycles + (observation.habitatTag ? 1 : 0);
  const adaptation = kind.includes("mossling") && habitatCycles >= 120 && observation.habitatTag
    ? mosslingAdaptation(observation.habitatTag) ?? state.adaptation : state.adaptation;
  const maintenance = MOB_DEFS[kind].family === "construct" ? Math.max(0, state.maintenance - .08) : state.maintenance;
  state = Object.freeze({
    ...state,
    habitatCycles,
    adaptation,
    maintenance,
    completedCycles: state.completedCycles + 1,
    lastCycleAt: observation.worldSeconds,
    lastSignal: signalId ?? state.lastSignal,
    lastSignalAt: signalId ? observation.worldSeconds : state.lastSignalAt,
  });
  return Object.freeze({ state, role, signalId, message, mapSignal, gardenPower, pollinationPower, retrievalPower, rescuePower, comfortPower });
}

export type CreatureWorkerContribution = Readonly<{ entityId: string; kind: MobKind; state: CreatureWorkState }>;
export type CreatureWorkGroup = Readonly<{ key: string; role: CreatureWorkRole; workers: readonly CreatureWorkerContribution[]; effectivePower: number }>;

/** Group compatible workers once; fifth and later workers remain decorative/sleeping rather than multiplying scans. */
export function aggregateCreatureWorkers(workers: readonly CreatureWorkerContribution[]): readonly CreatureWorkGroup[] {
  const groups = new Map<string, CreatureWorkerContribution[]>();
  for (const worker of workers) {
    const state = normalizeCreatureWorkState(worker.kind, worker.state);
    if (state.assignment === "rest" || state.assignment === "none") continue;
    const contract = CREATURE_ECOLOGY_CONTRACTS[worker.kind];
    const anchor = state.home ? `${Math.floor(state.home.x / 16)},${Math.floor(state.home.z / 16)}` : "field";
    const key = `${anchor}:${contract.aggregateKey}:${state.assignment}`;
    const list = groups.get(key) ?? [];
    list.push({ ...worker, state });
    groups.set(key, list);
  }
  return Object.freeze([...groups.entries()].map(([key, members]) => {
    const active = members.slice(0, 4);
    const role = active[0].state.assignment as CreatureWorkRole;
    const effectivePower = active.reduce((sum, _worker, index) => sum + [1, .7, .45, .25][index], 0);
    return Object.freeze({ key, role, workers: Object.freeze(active), effectivePower });
  }));
}

export type CreatureEcologyContract = Readonly<{
  kind: MobKind;
  workRoles: readonly CreatureWorkRole[];
  careNeeds: readonly HabitatNeedId[];
  workCadenceSeconds: number;
  aggregateKey: string;
  aquariumRoles: readonly AquariumRole[];
  pollinationRoles: readonly PollinationRole[];
  perchEligible: boolean;
  containment: ContainmentMode;
  primeForm: string | null;
  utilitySignal: string;
  dropRationale: string;
  juvenileScale: number;
  authorship: "explicit" | "legacy-family-fallback";
  ecologicalVerb: string;
  workBehavior: string;
  releaseOutcome: string;
}>;

export type ExpansionCreatureKind = LivingRosterKind | LegendaryCreatureKind | SummonedCreatureKind;
type AuthoredEcologySeed = Readonly<{
  workRoles: readonly CreatureWorkRole[];
  careNeeds: readonly HabitatNeedId[];
  workCadenceSeconds: number;
  aggregateKey: string;
  aquariumRoles: readonly AquariumRole[];
  pollinationRoles: readonly PollinationRole[];
  perchEligible: boolean;
  containment: ContainmentMode;
  ecologicalVerb: string;
  workBehavior: string;
  releaseOutcome: string;
  juvenileScale: number;
}>;

const ecologySeed = (
  workRoles: readonly CreatureWorkRole[], careNeeds: readonly HabitatNeedId[], workCadenceSeconds: number,
  aggregateKey: string, containment: ContainmentMode, ecologicalVerb: string, workBehavior: string,
  releaseOutcome: string, aquariumRoles: readonly AquariumRole[] = [], pollinationRoles: readonly PollinationRole[] = [],
  perchEligible = false, juvenileScale = .64,
): AuthoredEcologySeed => Object.freeze({
  workRoles: Object.freeze([...workRoles]), careNeeds: Object.freeze([...careNeeds]), workCadenceSeconds, aggregateKey,
  aquariumRoles: Object.freeze([...aquariumRoles]), pollinationRoles: Object.freeze([...pollinationRoles]), perchEligible,
  containment, ecologicalVerb, workBehavior, releaseOutcome, juvenileScale,
});

/** Explicit jobs and ecological outcomes for every expansion creature. */
export const EXPANSION_CREATURE_ECOLOGY_SEEDS = Object.freeze({
  "thornhide-trufflehog": ecologySeed(["forager", "soil"], ["shelter", "substrate", "companion"], 30, "fungal-ring:rooting", "ordinary", "root", "Snuffles ripe fungi and aerates only assigned intact fungal beds.", "Replants a truffle-spore patch in compatible woodland.", [], [], false, .58),
  "orchard-glider": ecologySeed(["scout", "forager"], ["perch", "shelter", "companion"], 8, "orchard:seed-route", "ordinary", "glide", "Carries one viable seed between an assigned fruit tree and prepared bed.", "Seeds one young orchard edge and returns to its nest lineage.", [], [], false, .52),
  "petalmask-tanuki": ecologySeed(["tracker", "scout"], ["shelter", "substrate", "companion"], 12, "woodland:scent-trail", "ordinary", "misdirect", "Compares real ecological scent with harmless decoy trails around a bounded patrol.", "Draws predators away from one restored den without changing spawns.", [], [], false, .58),
  "ironbeak-magpie": ecologySeed(["retriever", "scout"], ["perch", "shelter", "companion"], 8, "rookery:legal-cache", "ordinary", "cache", "Retrieves only marked loose items and delivers message tubes between approved perches.", "Returns one non-unique cached object to a wild rookery.", [], [], true, .5),
  "hearthback-badger": ecologySeed(["forager", "sentinel"], ["shelter", "substrate"], 24, "burrow:warm-chamber", "ordinary", "excavate", "Maintains authored burrow entrances and turns assigned root litter into den bedding.", "Opens a reusable den starter for local burrowing fauna.", [], [], false, .6),
  "sunfoil-pangolin": ecologySeed(["mineral-sense", "sentinel"], ["temperature", "substrate", "shelter"], 18, "mound:sunfoil", "ordinary", "uncurl", "Reads insect-mound health and opens only designated brittle crusts.", "Reactivates one dormant mound used by small desert fauna.", [], [], false, .52),
  "glassstep-jerboa": ecologySeed(["scout", "mineral-sense"], ["substrate", "shelter"], 8, "desert:burrow-script", "ordinary", "spring", "Maps safe crust crossings and signals occupied burrows through foot vibrations.", "Seeds sparse grass along a safe moonlit route.", [], [], false, .45),
  "stormcrest-ibex": ecologySeed(["mount", "rescue", "weather"], ["shelter", "temperature", "companion"], 10, "highland:storm-cairn", "ordinary", "descend", "Tests cliff landings, carries a bonded rider, and braces beneath falling allies.", "Reopens one abstract highland migration descent.", [], [], false, .62),
  "cindercoil-gecko": ecologySeed(["weather", "construct-work"], ["temperature", "shelter", "substrate"], 12, "fumarole:wall-sensor", "ordinary", "cling", "Clings to an assigned wall and reports dangerous changes in its heat gradient.", "Occupies a safe fumarole wall as an early-pressure warning.", [], [], false, .44),
  "cloudkite-pika": ecologySeed(["weather", "rescue"], ["perch", "shelter", "companion"], 8, "highland:descent-chime", "ordinary", "whistle", "Translates wind and falling-stone changes into learned route whistles.", "Adds one safe descent cue to a highland flock route.", [], [], false, .46),
  "briarclaw-lynx": ecologySeed(["tracker", "sentinel"], ["shelter", "substrate"], 10, "forest:stalk-corridor", "ordinary", "stalk", "Tracks only perceptible threats through real cover within a bounded patrol.", "Temporarily suppresses excess small predators in a healthy forest cell.", [], [], false, .58),
  "gravebell-jackal": ecologySeed(["tracker", "sentinel"], ["shelter", "substrate"], 10, "relic:grave-scent", "ordinary", "revere", "Distinguishes memorial, undead, and curse signals around one assigned reliquary.", "Guards one undisturbed memorial through a world-day band.", [], [], false, .58),
  "cragglass-basilisk": ecologySeed(["sentinel", "mineral-sense"], ["temperature", "substrate", "shelter"], 14, "glassland:reflector", "research-cell", "refract", "Inspects authored fractures and keeps its gaze behind matte barriers in care.", "Stabilizes one brittle glassland outcrop.", [], [], false, .55),
  "stormglass-roclet": ecologySeed(["mount", "rescue", "weather"], ["perch", "shelter", "companion"], 8, "aerie:rescue-flight", "ordinary", "swoop", "Practices bounded rescue carries and matures through completed flight training.", "Returns to strengthen its regional rescue flock.", [], [], true, .48),
  "brinewhisk-otter": ecologySeed(["retriever", "rescue"], ["water", "shelter", "companion"], 10, "river:holt-retrieval", "ordinary", "retrieve", "Fetches loose light items, clears littered shallows, and tows one swimmer.", "Clears one littered shallow before rejoining its holt.", [], [], false, .52),
  "riverwright-beaver": ecologySeed(["construct-work", "garden"], ["water", "shelter", "substrate", "companion"], 30, "wetland:lodge-repair", "ordinary", "mend", "Moves assigned loose logs and repairs only authored lodge segments.", "Repairs one wetland lodge anchor and improves shelter.", [], [], false, .56),
  "mirecrown-crane": ecologySeed(["aquarium", "scout"], ["water", "perch", "shelter"], 30, "wetland:reed-court", "ordinary", "court", "Reads pond clarity and tends one dawn courtship circle without stacking scans.", "Seeds reeds along one degraded wetland edge.", [], ["wetland", "day-broad"], true, .5),
  "inkveil-cuttle": ecologySeed(["aquarium", "scout"], ["water", "substrate", "shelter"], 60, "aquarium:color-language", "aquarium", "signal", "Uses color language for aquarium comfort and marks cover-rich escape routes.", "Adds one camouflage and cleaning role to a healthy reef.", ["display", "low-light"], [], false, .48),
  "prismclaw-mantis-shrimp": ecologySeed(["aquarium", "mineral-sense"], ["water", "substrate", "shelter"], 60, "aquarium:crack-station", "aquarium", "test", "Finds authored cracks and maintains one reinforced strike station.", "Opens one clogged reef crevice for cleaner fauna.", ["indicator", "mineral-stabilizer"], [], false, .45),
  "reefmender-shrimp": ecologySeed(["aquarium"], ["water", "companion", "shelter"], 60, "aquarium:cleaning-station", "aquarium", "clean", "Runs one cleaning station and tends compatible coral during aquarium cycles.", "Establishes a bounded wild cleaning station.", ["cleaner", "glass-cleaner"], [], false, .42),
  "currentweaver-eel": ecologySeed(["aquarium", "light"], ["water", "shelter", "substrate"], 60, "aquarium:current-loop", "aquarium", "conduct", "Links one approved lamp, reports overload, and discharges only into the safe loop.", "Restores a dim lamp-link clue along an underwater route.", ["indicator", "low-light"], [], false, .5),
  "shellcarrier-hermit": ecologySeed(["aquarium", "pack"], ["water", "substrate", "shelter"], 60, "aquarium:shell-satchel", "aquarium", "exchange", "Cleans substrate, compares empty shells, and carries one valid small object.", "Leaves its prior shell as habitat for smaller shore fauna.", ["salvager", "cleaner"], [], false, .44),
  "wreckwhistle-porpoise": ecologySeed(["mount", "rescue", "scout"], ["water", "companion", "shelter"], 10, "ocean:pod-rescue", "ordinary", "escort", "Maps wrecks, lifts trapped swimmers, and escorts one boat through a known route.", "Guides its pod around one dangerous wreck route.", [], [], false, .58),
  "kilnscale-salamander": ecologySeed(["construct-work", "weather"], ["temperature", "substrate", "shelter"], 20, "fumarole:heat-gradient", "ordinary", "vent", "Maintains a safe camp heat gradient and assists one assigned kiln cycle.", "Maintains a safe heat clue at a cave ecology center.", [], [], false, .48),
  "sporeback-gardener": ecologySeed(["garden", "compost"], ["substrate", "shelter", "companion"], 30, "grotto:fungal-cycle", "ordinary", "cultivate", "Converts assigned exhausted growth to compost and tends prepared mushroom beds.", "Restarts one dormant fungal patch and leaves viable compost for the next succession.", [], [], false, .56),
  "voidmantle-ray": ecologySeed(["mount", "scout"], ["shelter", "water", "companion"], 10, "cavern:plankton-glide", "ordinary", "sail", "Follows luminous plankton, marks open cavern volume, and glides only on descending lanes.", "Rejoins a restored cavern plankton migration.", [], [], false, .5),
  "fossilback-trilobite": ecologySeed(["aquarium", "mineral-sense"], ["water", "substrate", "shelter"], 60, "aquarium:ancient-stratum", "aquarium", "excavate", "Reads layered sediment and marks ancient strata without exposing exact loot.", "Settles in one suitable ancient-water stratum.", ["indicator", "salvager"], [], false, .4),
  "ilyr-virebloom": ecologySeed(["sanctuary", "mount", "garden"], ["water", "shelter", "companion"], 30, "legendary:walking-spring", "legendary-world", "restore", "Restores authored ecological anchors and carries a sanctuary route through shallow water.", "Restores the chosen watershed migration.", [], [], false, .42),
  thalassene: ecologySeed(["sanctuary", "mount", "aquarium"], ["water", "companion"], 60, "legendary:swimming-reef", "legendary-world", "migrate", "Carries bounded reef residents and resolves bleaching through authored cleaning sites.", "Reestablishes the protected reef migration.", ["comfort", "display"], [], false, .36),
  orichalc: ecologySeed(["sanctuary", "construct-work"], ["substrate", "shelter"], 30, "legendary:living-seam", "legendary-world", "interpret", "Maintains or redirects one living seam while preserving its unresolved nature.", "Returns dormant or redirects the seam according to the oath.", [], [], false, .4),
  "varkesh-stormmane": ecologySeed(["mount", "weather", "rescue"], ["perch", "shelter", "companion"], 8, "legendary:storm-road", "legendary-world", "guide", "Connects rebuilt highland beacons and carries travelers through major storms.", "Maintains the storm road or protects the aerie.", [], [], false, .4),
  kharza: ecologySeed(["mount", "tracker", "sentinel"], ["shelter", "companion", "substrate"], 10, "legendary:free-pack", "legendary-world", "liberate", "Tracks coercion chemistry and guards a free pack range after the harness is destroyed.", "Forms a free territorial pack that deters coercive camps.", [], [], false, .44),
  "sugarwake-sovereign": ecologySeed(["sanctuary", "construct-work", "herd-support"], ["temperature", "shelter", "companion"], 30, "legendary:festival-guardian", "legendary-world", "stabilize", "Cools syrup floods and supports communal masterwork cycles in its chosen final form.", "Persists as the chosen communal guardian or crafting legacy.", [], [], false, .4),
  "bellstep-qilin": ecologySeed(["mount", "scout", "sanctuary"], ["shelter", "companion", "substrate"], 10, "mythic:quiet-bells", "legendary-world", "guide", "Walks the old bell road, reveals safe crossings, and calms nearby caravan animals without replacing player travel.", "Reopens one quiet migration road between desert refuges.", [], [], false, .44),
  "aerolith-baleen": ecologySeed(["mount", "rescue", "sanctuary"], ["perch", "shelter", "companion"], 12, "mythic:cloudwhale-graveyard", "legendary-world", "lift", "Raises a bounded wind basin, carries stranded travelers, and tends the floating bones of its herd.", "Restores a high-altitude migration lane above the graveyard.", [], [], false, .38),
  "mireglass-kelpie": ecologySeed(["mount", "scout", "rescue"], ["water", "shelter", "companion"], 10, "mythic:mirrorfen-processional", "legendary-world", "reflect", "Tests safe water with false wakes, then carries trusted riders over marked fen routes.", "Returns reflective water to the processional channels without flooding the surrounding fen.", [], [], false, .46),
  "cinderwing-pyrausta": ecologySeed(["weather", "sanctuary", "light"], ["temperature", "perch", "shelter"], 10, "mythic:emberglass-hatchery", "legendary-world", "incubate", "Regulates one prepared heat cradle and vents dangerous kiln pressure with visible warning dust.", "Restarts the hatchery's safe migration cycle instead of nesting in ordinary settlements.", [], [], false, .36),
  "nacre-gatewyrm": ecologySeed(["mount", "rescue", "sanctuary"], ["water", "shelter", "companion"], 12, "mythic:drowned-moon-gate", "legendary-world", "threshold", "Opens a short current pocket, escorts swimmers through sealed thresholds, and refuses destructive dredging.", "Reopens a protected moonwell route while keeping the air gardens sealed.", ["comfort", "low-light"], [], false, .36),
  "frostcauldron-behemoth": ecologySeed(["mount", "rescue", "weather"], ["temperature", "shelter", "companion"], 20, "mythic:titans-kettle", "legendary-world", "shelter", "Breaks one bounded snow blockage and shares heat with a prepared caravan camp.", "Keeps one mountain pass navigable without disturbing nearby dwarven settlements.", [], [], false, .4),
  "briarcrown-manticore": ecologySeed(["mount", "sentinel", "tracker"], ["shelter", "substrate", "companion"], 10, "mythic:root-crown-menagerie", "legendary-world", "guard", "Patrols a restored menagerie boundary, measures venom, and marks poachers rather than attacking indiscriminately.", "Returns displaced forest predators to a balanced root-crown range.", [], [], false, .42),
  ammonarch: ecologySeed(["mineral-sense", "sanctuary", "aquarium"], ["water", "substrate", "shelter"], 30, "mythic:fossil-orchard", "legendary-world", "resonate", "Reads fossil strata through its spiral mantle and braces one unstable calcite chamber.", "Rewaters an ancient orchard stratum and leaves its fossils undisturbed.", ["mineral-stabilizer", "indicator"], [], false, .34),
  "handtail-ahuizotl": ecologySeed(["retriever", "rescue", "companion"], ["water", "shelter", "companion"], 8, "mythic:lanternroot-cistern", "legendary-world", "retrieve", "Uses its tail-hand to recover one marked keepsake or trapped creature from a safe cistern route.", "Maintains a clean rescue channel through the living lanternroot cistern.", [], [], false, .48),
  "tideclock-cetus": ecologySeed(["mount", "scout", "rescue"], ["water", "companion", "shelter"], 12, "mythic:tideclock-wreck", "legendary-world", "sound", "Maps a wreck by sounding roll, tows one stranded vessel, and creates a brief current slipstream.", "Redirects its pod around the restored wreck corridor.", [], [], false, .34),
  "anemoi-gryphon": ecologySeed(["mount", "rescue", "weather"], ["perch", "shelter", "companion"], 8, "mythic:palace-nine-winds", "legendary-world", "draft", "Maintains one authored updraft circuit and carries partnered riders between highland perches.", "Reopens the nine-wind circuit without turning every cliff into a flight shortcut.", [], [], false, .42),
  "sable-gorgon": ecologySeed(["sentinel", "mineral-sense", "sanctuary"], ["shelter", "substrate", "companion"], 18, "mythic:gorgon-quarry", "legendary-world", "reverse", "Seals unsafe quarry faces, cocoons active hazards in stone, and reverses petrification only after the quarry is made safe.", "Claims the restored quarry loop as a nonlethal refuge.", [], [], false, .4),
  "namarra-makara": ecologySeed(["mount", "rescue", "sanctuary"], ["water", "shelter", "companion"], 12, "mythic:sunken-court-namarra", "legendary-world", "regulate", "Regulates court currents, opens one pearl audience chamber, and carries swimmers between sealed air gardens.", "Restores the court's flooded procession while preserving both air gardens.", ["comfort", "display"], [], false, .34),
  "ashen-salamander-king": ecologySeed(["construct-work", "weather", "sanctuary"], ["temperature", "substrate", "shelter"], 20, "mythic:ashen-library", "legendary-world", "temper", "Reveals heat-memory tablets, maintains one crown foundry cycle, and vents the library chimney safely.", "Returns royal heat to the archive without igniting ordinary tunnels.", [], [], false, .4),
  "mycelial-oneirophant": ecologySeed(["sanctuary", "garden", "mount"], ["substrate", "water", "companion"], 30, "mythic:hollow-moon-menagerie", "legendary-world", "remember", "Replays one known habitat echo, tends the moonfelt pond, and restores a missing menagerie path.", "Seeds a quiet fungal refuge while leaving surrounding tunnels dark.", [], [], false, .38),
  asterjaw: ecologySeed(["tracker", "rescue", "scout"], ["shelter", "companion"], 8, "summon:meridian-route", "summon-contract", "navigate", "Tracks intended roads, crosses one bounded obstacle, and returns along Homeward Arc.", "Returns to its contract realm along the same stable route.", [], [], false, .5),
  "vellum-warden": ecologySeed(["sentinel", "construct-work"], ["shelter", "substrate"], 8, "summon:archive-margin", "summon-contract", "annotate", "Guards allies, records one repeated threat, and clears one removable debuff.", "Returns with its contract memory and borrowed-clause record intact.", [], [], false, .5),
  "choir-of-one": ecologySeed(["sentinel", "scout"], ["shelter", "companion"], 8, "summon:hush-measure", "summon-contract", "silence", "Maintains one bounded Hush zone and interrupts one long hostile windup.", "Returns through the final silent measure without rerolling identity.", [], [], false, .48),
  "glasswake-stag": ecologySeed(["mount", "rescue", "scout"], ["water", "shelter", "companion"], 8, "summon:second-shore", "summon-contract", "reflect", "Bends ordinary projectiles and creates one short rescue path through air or water.", "Returns along its stable second shore with the summoning contract's specimen identity intact.", [], [], false, .5),
} satisfies Readonly<Record<ExpansionCreatureKind, AuthoredEcologySeed>>);

const sets = {
  aquarium: new Set<MobKind>(AQUARIUM_MOB_ORDER),
  aquatic: new Set<MobKind>([...AQUATIC_MOB_ORDER, ...HEARTHROADS_AQUATIC_ORDER, ...TIDEGLASS_AQUATIC_ORDER]),
  birds: new Set<MobKind>([...BIRD_ORDER, "runeowl", "ironbeak-magpie", "mirecrown-crane", "stormglass-roclet"]),
  pollinators: new Set<MobKind>([...POLLINATOR_ORDER, ...BUTTERFLY_ORDER, "glowmoth"]),
  sentients: new Set<MobKind>(SENTIENT_MOB_ORDER),
  constructs: new Set<MobKind>(V1_FACTION_CREATURE_ORDER.filter((kind) => MOB_DEFS[kind].family === "construct")),
  legends: new Set<MobKind>(LEGENDARY_CREATURE_ORDER),
  summons: new Set<MobKind>(SUMMONED_CREATURE_ORDER),
};

const explicitWork: Readonly<Partial<Record<MobKind, readonly CreatureWorkRole[]>>> = Object.freeze({
  petalfox: ["forager", "tracker", "garden"], "emberbrush-fox": ["forager", "tracker"], "moonpetal-fox": ["forager", "tracker", "scout"],
  mossling: ["soil", "garden"], "boglantern-mossling": ["soil", "garden", "light"], "cindercone-mossling": ["soil", "compost"], "moonbloom-mossling": ["garden", "light"], "moonbrawn-mossling": ["soil", "garden", "pack", "sentinel"],
  emberjay: ["scout", "sentinel"], "canopy-lark": ["scout", "forager"], "tidewing-gull": ["scout", "retriever"], frostquill: ["scout", "weather"], runeowl: ["scout", "tracker"],
  puddlehopper: ["weather", "mineral-sense"], burrowbell: ["sentinel"],
  woolhorn: ["herd-support"], "meadow-cow": ["herd-support", "compost"], "sunstep-grazer": ["herd-support", "mount"], ridgeback: ["pack", "sentinel"], mistmane: ["herd-support", "weather"],
  pebbletortoise: ["garden", "pack"], "reefglide-terrapin": ["garden", "mount", "rescue"],
  glowmoth: ["pollination", "light"], "lightning-bug": ["light", "pollination"], honeybee: ["pollination"], "hive-queen": ["pollination"],
  "grotto-grazer": ["forager", "garden"], lanternray: ["light", "rescue"], "prismtail-swift": ["scout", "mineral-sense"], "glassback-newt": ["aquarium", "garden"],
  "sailfin-skimmer": ["aquarium", "mineral-sense"], "ashnose-bat": ["compost", "mineral-sense"], chimewing: ["scout", "mineral-sense"], "cinder-kite": ["weather", "mineral-sense"], veinling: ["mineral-sense"],
  caveblob: ["containment", "compost"], rattlekin: ["containment"], skeleton: ["containment"], zombie: ["containment"],
  "wild-horse": ["mount"], "rimehoof-courser": ["mount"], "sunscar-courser": ["mount"], "mirestride-courser": ["mount"], "starbough-courser": ["mount"],
  "deepgear-courser-golem": ["mount", "construct-work"], reedstrider: ["mount", "rescue"], warg: ["mount", "tracker"], taffalo: ["mount", "pack", "herd-support"],
  "meadow-cottontail": ["companion", "garden"], "russet-rabbit": ["companion", "garden"], "frost-hare": ["companion", "weather"], "chocolate-bunny": ["companion"],
  "praline-cat": ["companion", "sentinel"], "bramblewhisk-cat": ["companion", "sentinel"], "taffy-hound": ["companion", "tracker", "retriever"], "rimecoat-hound": ["companion", "tracker", "sentinel"],
  "copper-mole": ["mineral-sense"], tidepup: ["retriever", "rescue"], peelop: ["companion"],
  "thornhide-trufflehog": ["forager", "soil"], "orchard-glider": ["scout", "forager"], "petalmask-tanuki": ["tracker", "scout"], "ironbeak-magpie": ["retriever", "scout"],
  "hearthback-badger": ["forager", "sentinel"], "sunfoil-pangolin": ["mineral-sense", "sentinel"], "glassstep-jerboa": ["scout", "mineral-sense"], "stormcrest-ibex": ["mount", "rescue", "weather"],
  "cindercoil-gecko": ["weather", "construct-work"], "cloudkite-pika": ["weather", "rescue"], "briarclaw-lynx": ["tracker", "sentinel"], "gravebell-jackal": ["tracker", "sentinel"],
  "cragglass-basilisk": ["sentinel", "mineral-sense"], "stormglass-roclet": ["mount", "rescue", "weather"], "brinewhisk-otter": ["retriever", "rescue"], "riverwright-beaver": ["construct-work", "garden"],
  "mirecrown-crane": ["aquarium", "scout"], "inkveil-cuttle": ["aquarium", "scout"], "prismclaw-mantis-shrimp": ["aquarium", "mineral-sense"], "reefmender-shrimp": ["aquarium"],
  "currentweaver-eel": ["aquarium", "light"], "shellcarrier-hermit": ["aquarium", "pack"], "wreckwhistle-porpoise": ["mount", "rescue", "scout"], "kilnscale-salamander": ["construct-work", "weather"],
  "sporeback-gardener": ["garden", "compost"], "voidmantle-ray": ["mount", "scout"], "fossilback-trilobite": ["aquarium", "mineral-sense"],
});

const aquariumRoles: Readonly<Partial<Record<MobKind, readonly AquariumRole[]>>> = Object.freeze({
  shoalfin: ["schooler"], coralback: ["display", "comfort"], brookdart: ["schooler", "indicator"], gloomfin: ["indicator", "low-light"], silverthread: ["schooler", "display"],
  reedneedle: ["plant-pruner", "indicator"], emberribbon: ["display", "indicator"], cavefilament: ["low-light", "mineral-stabilizer"], "redfin-salmon": ["breeder", "indicator"],
  "blue-mackerel": ["schooler"], glassfin: ["indicator", "display"], lanternjaw: ["low-light", "indicator"], syrupfin: ["bait-producer", "comfort"], glowfin: ["low-light", "schooler"],
  "pocket-goldfish": ["breeder", "comfort"], "sunwheel-angelfish": ["display", "schooler"], "stonewhisker-loach": ["cleaner", "indicator"],
  "inkveil-cuttle": ["display", "low-light"], "prismclaw-mantis-shrimp": ["indicator", "mineral-stabilizer"], "reefmender-shrimp": ["cleaner", "glass-cleaner"],
  "currentweaver-eel": ["indicator", "low-light"], "shellcarrier-hermit": ["salvager", "cleaner"], "fossilback-trilobite": ["indicator", "salvager"],
  "sunset-sea-slug": ["plant-pruner", "display"], "moonlace-sea-slug": ["low-light", "comfort"], "blue-dragon-sea-slug": ["poison-warning", "display"],
  "leafsheep-sea-slug": ["plant-pruner", "clarifier"], "sea-bunny-nudibranch": ["comfort", "glass-cleaner"], "spanish-dancer-sea-slug": ["display", "comfort"],
  "crystal-tipped-nudibranch": ["mineral-stabilizer", "display"], "ringed-phyllidia": ["poison-warning", "cleaner"], "hooded-melibe": ["bait-producer", "clarifier"],
  "sea-angel-slug": ["low-light", "clarifier"], "embercrown-sea-slug": ["indicator", "plant-pruner"], "kelpwarden-sea-slug": ["plant-pruner", "cleaner"],
  "starlight-choir-sea-slug": ["low-light", "schooler"], "voidglass-sea-slug": ["mineral-stabilizer", "poison-warning"],
});

const pollinationRoles: Readonly<Partial<Record<MobKind, readonly PollinationRole[]>>> = Object.freeze({
  meadowwing: ["day-broad", "orchard"], "azure-skippers": ["day-broad", "wetland"], embertip: ["hot", "day-broad"], frostveil: ["cold", "day-broad"],
  "bloom-monarch": ["orchard", "day-broad"], "fen-lantern": ["wetland", "night-broad"], bonbonwing: ["hot", "orchard"], "moonveil-wing": ["moon-bloom", "night-broad"],
  glowmoth: ["night-broad", "moon-bloom"], "lightning-bug": ["night-broad", "wetland"], honeybee: ["colony", "day-broad", "orchard"], "hive-queen": ["colony"],
  "reed-dragonfly": ["wetland", "day-broad"], sprinklebug: ["hot", "day-broad"],
});

function defaultCare(kind: MobKind): readonly HabitatNeedId[] {
  const definition = MOB_DEFS[kind];
  if (definition.family === "sentient") return [];
  const needs: HabitatNeedId[] = ["shelter"];
  if (definition.aquatic || definition.movement === "amphibious") needs.push("water");
  if (definition.flying || definition.family === "bird" || definition.family === "butterfly") needs.push("perch");
  if (definition.family !== "construct" && definition.family !== "undead" && definition.family !== "legendary") needs.push("companion");
  if (definition.family && ["fish", "sea-slug", "underground"].includes(definition.family)) needs.push("substrate");
  if (["frost", "flame"].some((word) => definition.habitat.toLocaleLowerCase().includes(word))) needs.push("temperature");
  return Object.freeze([...new Set(needs)]);
}

function containmentFor(kind: MobKind): ContainmentMode {
  const definition = MOB_DEFS[kind];
  if (sets.sentients.has(kind)) return "sentient";
  if (sets.summons.has(kind)) return "summon-contract";
  if (sets.legends.has(kind)) return "legendary-world";
  if (sets.constructs.has(kind)) return "construct-bay";
  if (definition.family === "undead") return "reliquary";
  if (kind === "caveblob" || definition.hostile) return "research-cell";
  if (sets.aquarium.has(kind) || aquariumRoles[kind]?.length) return "aquarium";
  if (definition.family === "butterfly") return "exhibit";
  return "ordinary";
}

function rolesFor(kind: MobKind): readonly CreatureWorkRole[] {
  const explicit = explicitWork[kind];
  if (explicit) return explicit;
  const definition = MOB_DEFS[kind];
  if (sets.sentients.has(kind)) return ["none"];
  if (sets.constructs.has(kind)) return ["construct-work"];
  if (sets.pollinators.has(kind)) return ["pollination"];
  if (definition.family === "dragon" || definition.rideable) return ["mount", "sentinel"];
  if (definition.aquatic) return ["aquarium"];
  if (definition.hostile) return ["containment"];
  return ["companion"];
}

function buildContract(kind: MobKind): CreatureEcologyContract {
  const definition = MOB_DEFS[kind];
  if (isMorrowMobKind(kind)) return Object.freeze({
    kind, workRoles: Object.freeze(["companion"] as CreatureWorkRole[]),
    careNeeds: Object.freeze((kind === "morrow-owl" ? ["shelter", "perch"] : ["substrate", "temperature"]) as HabitatNeedId[]),
    workCadenceSeconds: 30, aggregateKey: `morrow:${kind}`, aquariumRoles: [], pollinationRoles: [], perchEligible: kind === "morrow-owl",
    containment: kind === "vacuum-lantern" ? "research-cell" : "ordinary", primeForm: null,
    utilitySignal: definition.behavior, dropRationale: "Only finite mineral or anatomical drops; live care and observation remain useful.",
    juvenileScale: .62, authorship: "explicit" as const,
    ecologicalVerb: kind === "rillehopper" ? "mineral-graze" : kind === "slatefin-burrower" ? "regolith-swim" : kind === "morrow-owl" ? "brief-veil-transit" : "sealed-glow",
    workBehavior: definition.behavior, releaseOutcome: "Returns the same specimen and its remaining veil and exposure to a valid physical location.",
  });
  const authored = EXPANSION_CREATURE_ECOLOGY_SEEDS[kind as ExpansionCreatureKind];
  if (authored) return Object.freeze({
    kind, ...authored,
    primeForm: PRIME_FORM_PROFILES[kind]?.name ?? null,
    utilitySignal: authored.workBehavior,
    dropRationale: definition.drops.length
      ? `Drops are limited to ${definition.drops.map((drop) => drop.item).join(", ")} and reflect anatomy or carried material.`
      : "No lethal drop is required for this creature's value.",
    authorship: "explicit" as const,
  });
  const workRoles = rolesFor(kind);
  const first = workRoles[0] ?? "none";
  return Object.freeze({
    kind,
    workRoles: Object.freeze([...workRoles]),
    careNeeds: defaultCare(kind),
    workCadenceSeconds: first === "none" ? 0 : first === "scout" || first === "sentinel" ? 8 : first === "aquarium" || first === "pollination" ? 60 : 30,
    aggregateKey: `${definition.family}:${first}`,
    aquariumRoles: Object.freeze([...(aquariumRoles[kind] ?? [])]),
    pollinationRoles: Object.freeze([...(pollinationRoles[kind] ?? [])]),
    perchEligible: sets.birds.has(kind),
    containment: containmentFor(kind),
    primeForm: PRIME_FORM_PROFILES[kind]?.name ?? null,
    utilitySignal: definition.utility || definition.discoveryHint || `${definition.name} is best understood through patient field observation.`,
    dropRationale: definition.drops.length ? `Drops are limited to ${definition.drops.map((drop) => drop.item).join(", ")} and reflect anatomy or carried material.` : "No lethal drop is required for this creature's value.",
    juvenileScale: RABBIT_ORDER.includes(kind as never) ? .48 : definition.family === "dragon" ? .42 : definition.radius <= .3 ? .58 : .64,
    authorship: "legacy-family-fallback" as const,
    ecologicalVerb: first,
    workBehavior: definition.utility || definition.behavior,
    releaseOutcome: `Returns ${definition.name} to a compatible habitat without rerolling its specimen identity.`,
  });
}

export const CREATURE_ECOLOGY_CONTRACTS: Readonly<Record<MobKind, CreatureEcologyContract>> = Object.freeze(
  Object.fromEntries(MOB_ORDER.map((kind) => [kind, buildContract(kind)])) as Record<MobKind, CreatureEcologyContract>,
);

export function creatureEcologyContract(kind: MobKind) { return CREATURE_ECOLOGY_CONTRACTS[kind]; }

export type AquariumEcologySummary = Readonly<{
  roleCounts: Readonly<Partial<Record<AquariumRole, number>>>;
  activeRoleCounts: Readonly<Partial<Record<AquariumRole, number>>>;
  health: number;
  clarity: number;
  comfort: number;
  discovery: number;
  activeBenefits: readonly string[];
}>;

const AQUARIUM_ROLE_CAP = 2;

/** One O(residents) summary per aquarium cycle; compatible roles never stack without bound. */
export function summarizeAquariumEcology(kinds: readonly MobKind[]): AquariumEcologySummary {
  const roleCounts: Partial<Record<AquariumRole, number>> = {};
  for (const kind of kinds) for (const role of CREATURE_ECOLOGY_CONTRACTS[kind]?.aquariumRoles ?? []) roleCounts[role] = (roleCounts[role] ?? 0) + 1;
  const activeRoleCounts = Object.fromEntries(Object.entries(roleCounts).map(([role, count]) => [role, Math.min(AQUARIUM_ROLE_CAP, count)])) as Partial<Record<AquariumRole, number>>;
  const score = (...roles: AquariumRole[]) => roles.reduce((sum, role) => sum + (activeRoleCounts[role] ?? 0), 0);
  const health = Math.min(100, 55 + score("cleaner", "plant-pruner", "poison-warning") * 9 + score("mineral-stabilizer") * 6);
  const clarity = Math.min(100, 50 + score("clarifier", "glass-cleaner", "plant-pruner") * 10);
  const comfort = Math.min(100, 40 + score("schooler", "comfort", "low-light") * 8);
  const discovery = Math.min(100, 25 + score("indicator", "salvager", "display") * 9);
  const labels: Readonly<Record<AquariumRole, string>> = Object.freeze({
    cleaner: "Disease and algae control", schooler: "School comfort", indicator: "Water-condition signals", "bait-producer": "Renewable bait shedding",
    salvager: "Tiny salvage expeditions", breeder: "Lineage comfort", display: "Rare display behavior", "plant-pruner": "Plant pruning", clarifier: "Water clarity",
    "mineral-stabilizer": "Mineral stability", comfort: "Resident comfort", "poison-warning": "Poison warning", "glass-cleaner": "Glass cleaning", "low-light": "Nocturnal low light",
  });
  return Object.freeze({
    roleCounts: Object.freeze(roleCounts), activeRoleCounts: Object.freeze(activeRoleCounts), health, clarity, comfort, discovery,
    activeBenefits: Object.freeze((Object.keys(activeRoleCounts) as AquariumRole[]).filter((role) => (activeRoleCounts[role] ?? 0) > 0).map((role) => labels[role])),
  });
}

export type PollinationSummary = Readonly<{ roleCounts: Readonly<Partial<Record<PollinationRole, number>>>; breadth: number; activeWindows: readonly string[] }>;

/** Conservatories and apiaries consume one summarized profile instead of scanning every flower per resident. */
export function summarizePollination(kinds: readonly MobKind[]): PollinationSummary {
  const roleCounts: Partial<Record<PollinationRole, number>> = {};
  for (const kind of kinds) for (const role of CREATURE_ECOLOGY_CONTRACTS[kind]?.pollinationRoles ?? []) roleCounts[role] = Math.min(3, (roleCounts[role] ?? 0) + 1);
  const windows = [roleCounts["day-broad"] ? "day" : null, roleCounts["night-broad"] ? "night" : null, roleCounts.cold ? "cold" : null, roleCounts.hot ? "heat" : null, roleCounts.wetland ? "wetland" : null].filter((value): value is string => Boolean(value));
  return Object.freeze({ roleCounts: Object.freeze(roleCounts), breadth: Object.keys(roleCounts).length, activeWindows: Object.freeze(windows) });
}

export type EcologyTypeContext = Readonly<{ daylight: number; night: boolean; charged?: boolean; deeplyChilled?: boolean; feastMemory?: boolean; kilnHeart?: boolean }>;

/** Declarative temporary type sources; the shared type resolver handles priority and expiry. */
export function ecologicalTypeSources(kind: MobKind, context: EcologyTypeContext): readonly CreatureTypeSource[] {
  const sources: CreatureTypeSource[] = [];
  if (kind === "moonpetal-fox" && context.night) sources.push({ id: "moonpetal-night", kind: "environment", types: ["dream"], label: "Moonpetal night form" });
  if (kind === "petalfox" && context.daylight >= .82) sources.push({ id: "sunpetal-day", kind: "environment", types: ["radiant"], label: "Full daylight bloom" });
  if (kind === "currentweaver-eel" && context.charged) sources.push({ id: "current-charge", kind: "form", types: ["storm"], label: "Lateral-line charge" });
  if (kind === "kilnscale-salamander" && context.deeplyChilled) sources.push({ id: "cooled-skin", kind: "form", removeTypes: ["flame"], types: ["frost"], label: "Deeply chilled skin" });
  if (kind === "sugarwake-sovereign" && context.feastMemory) sources.push({ id: "feast-memory", kind: "form", types: ["dream"], label: "Feast-memory phase" });
  if (kind === "sugarwake-sovereign" && context.kilnHeart) sources.push({ id: "crowned-kiln-heart", kind: "form", types: ["draconic"], label: "Crowned kiln-heart" });
  return Object.freeze(sources);
}

export function validateCreatureEcologyContracts() {
  const errors: string[] = [];
  for (const kind of MOB_ORDER) {
    const contract = CREATURE_ECOLOGY_CONTRACTS[kind];
    if (!contract || !contract.workRoles.length) errors.push(`${kind} has no ecology contract.`);
    if (contract?.perchEligible && !sets.birds.has(kind)) errors.push(`${kind} is perch-eligible without a bird rig.`);
    if (contract?.containment === "aquarium" && !contract.aquariumRoles.length && !sets.aquarium.has(kind)) errors.push(`${kind} has no aquarium role.`);
    if (sets.sentients.has(kind) && contract?.containment !== "sentient") errors.push(`${kind} may not enter creature containment.`);
    if (sets.summons.has(kind) && contract?.containment !== "summon-contract") errors.push(`${kind} must use summon contracts.`);
  }
  for (const kind of [...LIVING_ROSTER_ORDER, ...LEGENDARY_CREATURE_ORDER, ...SUMMONED_CREATURE_ORDER]) {
    const contract = CREATURE_ECOLOGY_CONTRACTS[kind];
    if (contract.authorship !== "explicit" || !contract.ecologicalVerb || !contract.workBehavior || !contract.releaseOutcome) errors.push(`${kind} lacks an explicit expansion ecology sheet.`);
  }
  for (const kind of [...AQUARIUM_MOB_ORDER, ...AQUATIC_MOB_ORDER]) if (!CREATURE_ECOLOGY_CONTRACTS[kind].aquariumRoles.length) errors.push(`${kind} lacks a functional aquarium role.`);
  for (const kind of [...BIRD_ORDER, "runeowl" as const]) if (!CREATURE_ECOLOGY_CONTRACTS[kind].perchEligible) errors.push(`${kind} cannot use a Field Perch.`);
  return Object.freeze(errors);
}

export const ECOLOGY_COMPLETION_GROUPS = Object.freeze({
  mosslings: Object.freeze(["mossling", ...MOSSLING_VARIANT_ORDER]), birds: Object.freeze([...BIRD_ORDER, "runeowl"]),
  underground: Object.freeze([...UNDERGROUND_MOB_ORDER]), dragons: Object.freeze([...DRAGON_ORDER]), newRoster: Object.freeze([...LIVING_ROSTER_ORDER]),
});
