import { Item, type ItemCode } from "./data";
import { MORROW_MOB_DEFS, MORROW_MOB_KINDS, type MorrowMobKind } from "./morrow-ecology";

export type ButterflyKind = "meadowwing" | "azure-skippers" | "embertip" | "frostveil" | "bloom-monarch" | "fen-lantern" | "bonbonwing" | "moonveil-wing";
export type LegacyMobKind = "mossling" | "ridgeback" | "woolhorn" | "glowmoth" | "shadecrawler" | "caveblob" | "rattlekin" | "zombie";
export type SurfaceMobKind =
  | "sunstep-grazer"
  | "pebbletortoise"
  | "brambleboar"
  | "petalfox"
  | "emberbrush-fox"
  | "moonpetal-fox"
  | "duneclatter"
  | "thimbledeer"
  | "frostlace-hart"
  | "reedcrown-deer"
  | "lanternshell"
  | "puddlehopper"
  | "reedstrider"
  | "wild-horse"
  | "rimehoof-courser"
  | "sunscar-courser"
  | "mirestride-courser"
  | "starbough-courser"
  | "meadow-cow"
  | "sunbloom-longhorn"
  | "mistmane"
  | "sakurakit"
  | "sunwash-crab"
  | "taffy-hound"
  | "praline-cat"
  | "rimecoat-hound"
  | "bramblewhisk-cat"
  | "sprinklebug"
  | "taffalo";
export type BirdKind = "emberjay" | "canopy-lark" | "tidewing-gull" | "frostquill";
export type AquaticMobKind = "shoalfin" | "coralback" | "brookdart" | "gloomfin" | "silverthread" | "reedneedle" | "emberribbon" | "cavefilament";
export type PollinatorKind = "honeybee" | "hive-queen" | "reed-dragonfly" | "lightning-bug";
export type HearthroadsWildlifeKind = "burrowbell" | "dewback-tapir";
export type HearthroadsAquaticKind = "redfin-salmon" | "blue-mackerel" | "deepwater-shark";
export type TideglassAquaticKind =
  | "tideglass-crab"
  | "reefglide-terrapin"
  | "glassfin"
  | "lanternjaw"
  | "abyss-skater"
  | "dreadcoil"
  | "tidepup"
  | "worldshell-leviathan"
  | "aetherbell-larva"
  | "aetherbell-leviathan";
export type MosslingVariantKind = "boglantern-mossling" | "cindercone-mossling" | "moonbloom-mossling" | "moonbrawn-mossling";
export type SugarplumAquaticKind = "syrupfin";
export type RabbitKind = "meadow-cottontail" | "russet-rabbit" | "frost-hare" | "chocolate-bunny";
export type SeaSlugKind =
  | "sunset-sea-slug"
  | "moonlace-sea-slug"
  | "blue-dragon-sea-slug"
  | "leafsheep-sea-slug"
  | "sea-bunny-nudibranch"
  | "spanish-dancer-sea-slug"
  | "crystal-tipped-nudibranch"
  | "ringed-phyllidia"
  | "hooded-melibe"
  | "sea-angel-slug"
  | "embercrown-sea-slug"
  | "kelpwarden-sea-slug"
  | "starlight-choir-sea-slug"
  | "voidglass-sea-slug";
export type AquariumFishKind = "pocket-goldfish" | "sunwheel-angelfish" | "stonewhisker-loach";
export type AquariumMobKind = SeaSlugKind | AquariumFishKind;
export type DragonKind = "fire-dragon" | "ice-dragon" | "steel-dragon" | "sea-dragon" | "gold-dragon" | "silver-dragon";
export type HobbitKind =
  | "hobbit-mayor"
  | "hobbit-farmer"
  | "hobbit-miner"
  | "hobbit-merchant"
  | "hobbit-banker"
  | "hobbit-hammer-guard"
  | "hobbit-crossbow-guard";
export type GoblinKind =
  | "goblin-chieftain"
  | "goblin-worker"
  | "goblin-miner"
  | "goblin-alchemist"
  | "goblin-spear-guard";
export type AtlantianKind =
  | "atlantian-tidewarden"
  | "atlantian-kelpkeeper"
  | "atlantian-coralwright"
  | "atlantian-pearlbroker"
  | "atlantian-glowmender"
  | "atlantian-trident-guard";
export type SugarcourtKind =
  | "sugarcourt-crown-confectioner"
  | "sugarcourt-brittle-guard"
  | "sugarcourt-gumdrop-gardener"
  | "sugarcourt-sweetbroker"
  | "sugarcourt-kennelkeeper"
  | "sugarcourt-sugarboiler"
  | "sugarcourt-candysmith";
export type WoodElfKind =
  | "wood-elf-elderweaver"
  | "wood-elf-leafwarden"
  | "wood-elf-bow-warden"
  | "wood-elf-grovekeeper"
  | "wood-elf-tomekeeper"
  | "wood-elf-potioner"
  | "wood-elf-moonbroker";
export type DwarfKind =
  | "dwarf-thane"
  | "dwarf-gatewarden"
  | "dwarf-delver"
  | "dwarf-gearwright"
  | "dwarf-golemsmith"
  | "dwarf-powderwright"
  | "dwarf-provisioner";
export type GolemKind =
  | "copper-scout-golem"
  | "stone-bulwark-golem"
  | "aetherforged-sentinel"
  | "deepgear-courser-golem"
  | "clockwork-hound-golem"
  | "webspinner-golem";
export type V1FactionCreatureKind = "glimmerhart" | "runeowl" | "glowfin" | "copper-mole" | GolemKind;
export type SentientMobKind = HobbitKind | GoblinKind | AtlantianKind | SugarcourtKind | WoodElfKind | DwarfKind;
export type FactionKind = "hobbits" | "goblins" | "atlantians" | "sugarcourt" | "wood-elves" | "dwarves";
export type SentientRole = "mayor" | "chieftain" | "farmer" | "worker" | "miner" | "merchant" | "banker" | "alchemist" | "blacksmith" | "guard";
export type SpecialMobKind = "peelop" | "reliquary-sentinel" | "skeleton" | "warg";
export type AdventureMobKind = "auric-scarab" | "rootwrithe" | "bellroot-matron" | "vaultwing" | "cinder-maw" | "ossuary-keeper" | "mossback-kite" | "clockwork-marmot" | "inkmaw-curator";
export type UndergroundMobKind =
  | "grotto-grazer"
  | "lanternray"
  | "prismtail-swift"
  | "glassback-newt"
  | "sailfin-skimmer"
  | "ashnose-bat"
  | "chimewing"
  | "cinder-kite"
  | "embercarapace-beetle"
  | "veinling";
export type LivingRosterKind =
  | "thornhide-trufflehog"
  | "orchard-glider"
  | "petalmask-tanuki"
  | "ironbeak-magpie"
  | "hearthback-badger"
  | "sunfoil-pangolin"
  | "glassstep-jerboa"
  | "stormcrest-ibex"
  | "cindercoil-gecko"
  | "cloudkite-pika"
  | "briarclaw-lynx"
  | "gravebell-jackal"
  | "cragglass-basilisk"
  | "stormglass-roclet"
  | "brinewhisk-otter"
  | "riverwright-beaver"
  | "mirecrown-crane"
  | "inkveil-cuttle"
  | "prismclaw-mantis-shrimp"
  | "reefmender-shrimp"
  | "currentweaver-eel"
  | "shellcarrier-hermit"
  | "wreckwhistle-porpoise"
  | "kilnscale-salamander"
  | "sporeback-gardener"
  | "voidmantle-ray"
  | "fossilback-trilobite";
export type MythicFrontierCreatureKind =
  | "bellstep-qilin"
  | "aerolith-baleen"
  | "mireglass-kelpie"
  | "cinderwing-pyrausta"
  | "nacre-gatewyrm"
  | "frostcauldron-behemoth"
  | "briarcrown-manticore"
  | "ammonarch"
  | "handtail-ahuizotl"
  | "tideclock-cetus"
  | "anemoi-gryphon"
  | "sable-gorgon"
  | "namarra-makara"
  | "ashen-salamander-king"
  | "mycelial-oneirophant";
export type LegendaryCreatureKind =
  | "ilyr-virebloom"
  | "thalassene"
  | "orichalc"
  | "varkesh-stormmane"
  | "kharza"
  | "sugarwake-sovereign"
  | MythicFrontierCreatureKind;
export type SummonedCreatureKind = "asterjaw" | "vellum-warden" | "choir-of-one" | "glasswake-stag";
export type CoreMobKind =
  | MorrowMobKind
  | LegacyMobKind
  | MosslingVariantKind
  | SurfaceMobKind
  | BirdKind
  | AquaticMobKind
  | PollinatorKind
  | HearthroadsWildlifeKind
  | HearthroadsAquaticKind
  | TideglassAquaticKind
  | SugarplumAquaticKind
  | RabbitKind
  | AquariumMobKind
  | DragonKind
  | V1FactionCreatureKind
  | SentientMobKind
  | UndergroundMobKind
  | AdventureMobKind
  | SpecialMobKind
  | LivingRosterKind
  | LegendaryCreatureKind
  | SummonedCreatureKind;
export type MobKind = CoreMobKind | ButterflyKind;
export type MobTemperament = "Gentle" | "Skittish" | "Defensive" | "Hostile";
export type MobMovement = "ground" | "flying" | "aquatic" | "amphibious";
export type MobFamily = "surface" | "underground" | "rabbit" | "bird" | "fish" | "sea-slug" | "pet" | "mount" | "leviathan" | "dragon" | "pollinator" | "construct" | "undead" | "sentient" | "butterfly" | "legendary" | "summon";

export type MobDrop = {
  item: ItemCode;
  min: number;
  max: number;
  chance: number;
};

export type BestiaryNoteMetric = "seen" | "kills" | "captures" | "tames" | "breeds";
export type BestiaryNoteRequirement =
  | Readonly<{ metric: BestiaryNoteMetric; atLeast: number }>
  | Readonly<{ milestone: string; atLeast?: number }>;
export type BestiaryFieldNote = Readonly<{
  id: string;
  title: string;
  text: string;
  hint: string;
  requires: readonly BestiaryNoteRequirement[];
}>;

export type MobDefinition = {
  kind: MobKind;
  name: string;
  temperament: MobTemperament;
  hostile: boolean;
  health: number;
  damage: number;
  xp: number;
  speed: number;
  chaseSpeed: number;
  turnRate: number;
  attackRange: number;
  footOffset: number;
  radius: number;
  height: number;
  habitat: string;
  active: string;
  behavior: string;
  lore: string;
  colors: [number, number, number];
  drops: MobDrop[];
  family?: MobFamily;
  movement?: MobMovement;
  aquatic?: boolean;
  flying?: boolean;
  ranged?: boolean;
  persistent?: boolean;
  utility?: string;
  captureItem?: ItemCode;
  /** Bestiary-facing care metadata. Omitted values are displayed as false/unknown. */
  sentient?: boolean;
  tameable?: boolean;
  tameItems?: ItemCode[];
  breedable?: boolean;
  breedingFoods?: ItemCode[];
  diet?: ItemCode[];
  /** Extra field notes that only become readable after the creature has been tamed. */
  postTameNotes?: string;
  secretHint?: string;
  /** A useful biome-level clue shown before the creature has been discovered. */
  discoveryHint?: string;
  /** Append-only staged field notes; new entries require no save-schema change. */
  fieldNotes?: readonly BestiaryFieldNote[];
  /** Hearthroads faction and profession metadata for sentient NPCs. */
  faction?: FactionKind;
  role?: SentientRole;
  profession?: string;
  tradeSpecialty?: string;
  /** Natural specimens can inherit this faction without making the species sentient. */
  factionAffinity?: FactionKind;
  /** Faction-aligned instances must be unaligned before the normal tame path applies. */
  tameRequiresUnaligned?: boolean;
  rideable?: boolean;
  /** Cultural identity used before a culture is wired into diplomacy proper. */
  culture?: "atlantians" | "sugarcourt" | "wood-elves" | "dwarves";
  /** Save-friendly ecology flags consumed by the ocean lifecycle helpers. */
  laysEggs?: boolean;
  aquaticYoungOnly?: boolean;
  airSeaMorph?: boolean;
  cargoChestLimit?: number;
  /** Restricts an aquatic species to a specific liquid rather than ordinary water. */
  liquidHabitat?: "water" | "syrup";
  /** Bottom dwellers remain close to the first solid cell beneath their liquid. */
  bottomDweller?: boolean;
  /** Skittish grazers approach rather than flee while a player visibly holds a diet item. */
  foodLure?: boolean;
  /** Lifecycle discriminator; detailed stage/sex/equipment state lives in dragons.ts. */
  dragonType?: "fire" | "ice" | "steel" | "sea" | "gold" | "silver";
};

function dragonFieldNotes(name: string, incubation: string, adultTechnique: string): readonly BestiaryFieldNote[] {
  return Object.freeze([
    { id: "observed", title: "First Sighting", text: `${name} anatomy, habitat, and temperament have been recorded at close range.`, hint: "Observe one in the world.", requires: [{ metric: "seen", atLeast: 1 }] },
    { id: "guardian", title: "Defeat and Egg Recovery", text: `A mature ${name} commits differently to melee, breath, and projectile attacks. Every stage-three or older dragon leaves at least one lineage-preserving egg; recover it from the battlefield before beginning incubation.`, hint: "Defeat one breed-capable wild guardian.", requires: [{ milestone: "mature-defeated", atLeast: 1 }] },
    { id: "incubation", title: "Incubation and Hatching", text: `${incubation} A protected dropped egg survives fire, lava, and at least one full world day before ordinary cleanup can claim it.`, hint: "Recover one of its eggs.", requires: [{ milestone: "egg-recovered", atLeast: 1 }] },
    { id: "bond", title: "Hatchling Bond and Shoulder", text: "A newly hatched stage-one dragon is defensive but approachable. Three patient feeds establish a bond; interact with the bonded hatchling to settle it on an open shoulder.", hint: "Hatch one of its eggs.", requires: [{ milestone: "hatched", atLeast: 1 }] },
    { id: "growth", title: "Feeding and Growth", text: "Meat restores vitality. Dragon Meal advances growth by one full day, while natural aging moves through a new stage every twenty-five days. Shoulder carry ends after stage one.", hint: "Bond with one of its hatchlings.", requires: [{ metric: "tames", atLeast: 1 }] },
    { id: "adult", title: "Adult Tack, Panniers, and Riding", text: `${adultTechnique} Fit the matching four-piece scale harness, a Dragon Saddle, and up to two pannier modules through its creature panel.`, hint: "Raise a bonded dragon to stage three.", requires: [{ milestone: "stage-3", atLeast: 1 }] },
    { id: "scales", title: "Renewable Scale Harvest", text: "Loose scales accumulate naturally in a bonded dragon's creature inventory. Brushing them free does not injure the dragon; return after several world days for another harvest.", hint: "Collect a naturally shed scale from a bonded dragon.", requires: [{ milestone: "scale-harvested", atLeast: 1 }] },
    { id: "lineage", title: "Lineage and Breeding", text: "Pair bonded stage-three-or-older dragons of the same type and opposite sex, then offer their matching elemental catalyst. The physical egg preserves its parents, sex, element, and lair lineage.", hint: "Breed this dragon type successfully.", requires: [{ metric: "breeds", atLeast: 1 }] },
  ]);
}

type V1SentientSeed = Readonly<{
  kind: WoodElfKind | DwarfKind;
  name: string;
  faction: "wood-elves" | "dwarves";
  role: SentientRole;
  profession: string;
  specialty: string;
  behavior: string;
  lore: string;
  ranged?: boolean;
  guard?: boolean;
}>;

function v1Sentient(seed: V1SentientSeed): MobDefinition {
  const elf = seed.faction === "wood-elves";
  const guard = seed.guard === true;
  return {
    kind: seed.kind,
    name: seed.name,
    temperament: "Defensive",
    hostile: false,
    health: guard ? (elf ? 22 : 28) : elf ? 15 : 20,
    damage: guard ? (seed.ranged ? 9 : 7) : seed.ranged ? 5 : 3,
    xp: guard ? 15 : 9,
    speed: elf ? 0.84 : 0.64,
    chaseSpeed: guard ? (elf ? 3.5 : 2.8) : 2.45,
    turnRate: elf ? 6.5 : 4.8,
    attackRange: seed.ranged ? (elf ? 22 : 19) : 1.2,
    footOffset: elf ? 0.88 : 0.72,
    radius: elf ? 0.42 : 0.5,
    height: elf ? 1.78 : 1.35,
    habitat: elf ? "Glimmerwood Moonbough Enclaves" : "Underground Deepgear Holds beneath the Snowcap Range",
    active: guard ? "All hours" : "Day and shift change",
    behavior: seed.behavior,
    lore: seed.lore,
    colors: elf ? [0x315748, 0x84d5a9, 0xe9fff3] : [0x4c5458, 0xb47c4b, 0xf2d17f],
    drops: [],
    family: "sentient",
    movement: "ground",
    persistent: true,
    ranged: seed.ranged,
    sentient: true,
    faction: seed.faction,
    culture: seed.faction,
    role: seed.role,
    profession: seed.profession,
    tradeSpecialty: seed.specialty,
    discoveryHint: elf ? "Follow the bioluminescent paths of a Moonbough Enclave." : "Follow high-brightness lanterns into a guarded Snowcap tunnel.",
  };
}

const V1_SENTIENT_MOBS = Object.fromEntries(([
  { kind: "wood-elf-elderweaver", name: "Wood Elf Elderweaver", faction: "wood-elves", role: "mayor", profession: "Elderweaver", specialty: "Enclave authority, rare tomes and quests", behavior: "Mediates living-magic oaths and raises a leaf ward when the enclave is threatened.", lore: "An Elderweaver is chosen by consensus and by whether the oldest Moonbough accepts their touch.", ranged: true },
  { kind: "wood-elf-leafwarden", name: "Wood Elf Leafwarden", faction: "wood-elves", role: "guard", profession: "Leafwarden", specialty: "Moonbough staves and settlement defense", behavior: "Aims a staff with both hands and fires a three-leaf Verdant Volley only after identifying a threat.", lore: "Their leaves are never sharpened until the moment the spell is released.", ranged: true, guard: true },
  { kind: "wood-elf-bow-warden", name: "Wood Elf Bow-Warden", faction: "wood-elves", role: "guard", profession: "Bow-Warden", specialty: "Glimmerbows, arrows and patterns", behavior: "Raises both arms into a clean Glimmerbow stance and checks the line beyond every target.", lore: "A bow-warden learns the sound of every gate before the range of a bow.", ranged: true, guard: true },
  { kind: "wood-elf-grovekeeper", name: "Wood Elf Grovekeeper", faction: "wood-elves", role: "farmer", profession: "Grovekeeper", specialty: "Glowing flora and neutral companion orbs", behavior: "Tends luminous plants, Glimmerharts, and moonwell pond edges without extinguishing their light.", lore: "Grovekeepers count successful nights, not harvests." },
  { kind: "wood-elf-tomekeeper", name: "Wood Elf Tomekeeper", faction: "wood-elves", role: "alchemist", profession: "Tomekeeper", specialty: "Reusable spell tomes and Runeowl orbs", behavior: "Curates reusable tomes and uses Starlight Snare to hold danger away from the shelves.", lore: "Every returned tome is welcomed as though it had traveled alone.", ranged: true },
  { kind: "wood-elf-potioner", name: "Wood Elf Potioner", faction: "wood-elves", role: "alchemist", profession: "Moonwell Potioner", specialty: "Moonstep, Verdant Renewal and formulas", behavior: "Brews small moonwell batches and records which plants were gathered rather than cut.", lore: "Moonwell glass is washed in starlight before it touches water." },
  { kind: "wood-elf-moonbroker", name: "Wood Elf Moonbroker", faction: "wood-elves", role: "merchant", profession: "Moonbroker", specialty: "General Glimmerwood goods", behavior: "Trades flora and crafted goods while keeping rare living materials out of careless hands.", lore: "A fair price leaves enough wonder to invite a return journey." },
  { kind: "dwarf-thane", name: "Deepgear Thane", faction: "dwarves", role: "mayor", profession: "Thane", specialty: "Hold authority and master golem blueprints", behavior: "Keeps the hold's oaths, authorizes master blueprints, and joins the entrance defense if needed.", lore: "A thane's chain carries one gear from every public machine completed during their term." },
  { kind: "dwarf-gatewarden", name: "Deepgear Gatewarden", faction: "dwarves", role: "guard", profession: "Gatewarden", specialty: "Hold defense, flintlocks and ammunition", behavior: "Guards the surface ramp in pairs, aiming a hammer or flintlock beyond the entrance before firing.", lore: "Gatewardens polish the entrance lantern before their armor.", ranged: true, guard: true },
  { kind: "dwarf-delver", name: "Deepgear Delver", faction: "dwarves", role: "miner", profession: "Delver", specialty: "Ore, stone and mining supplies", behavior: "Samples stone, braces active galleries, and returns when the brass shift-bell sounds.", lore: "A delver carries chalk in three colors: safe, ask, and absolutely not." },
  { kind: "dwarf-gearwright", name: "Deepgear Gearwright", faction: "dwarves", role: "worker", profession: "Gearwright", specialty: "Deepgear blocks, lanterns and alloys", behavior: "Maintains lanterns, furniture, and civic machinery with a balanced gear-hammer.", lore: "No gear is too small to receive a maker's stamp." },
  { kind: "dwarf-golemsmith", name: "Deepgear Golemsmith", faction: "dwarves", role: "worker", profession: "Golemsmith", specialty: "Golem blueprints, ready Copper Scouts and forge work", behavior: "Builds blueprint-gated constructs and commits mana only during final animation.", lore: "Golemsmiths speak to unfinished frames because silence makes careless work feel acceptable." },
  { kind: "dwarf-powderwright", name: "Deepgear Powderwright", faction: "dwarves", role: "blacksmith", profession: "Powderwright", specialty: "Flintlocks, ammunition and blueprints", behavior: "Mixes sealed charges and demonstrates flintlocks only on the stone range behind the workshop.", lore: "Powderwright eyebrows are a subject one does not raise at dinner.", ranged: true },
  { kind: "dwarf-provisioner", name: "Deepgear Provisioner", faction: "dwarves", role: "merchant", profession: "Provisioner", specialty: "General hold goods and Copper Mole orbs", behavior: "Restocks ore, food, lantern parts, and neutral companion orbs from shared stores.", lore: "Provisioners estimate a tunnel crew's tea consumption from the sound of their boots." },
] as const satisfies readonly V1SentientSeed[]).map((seed) => [seed.kind, v1Sentient(seed)])) as Record<WoodElfKind | DwarfKind, MobDefinition>;

const V1_CREATURE_MOBS: Record<V1FactionCreatureKind, MobDefinition> = {
  glimmerhart: {
    kind: "glimmerhart", name: "Glimmerhart", temperament: "Defensive", hostile: false,
    health: 24, damage: 5, xp: 9, speed: 1.25, chaseSpeed: 3.5, turnRate: 5.6, attackRange: 12,
    footOffset: 1.03, radius: 0.72, height: 1.58, habitat: "Glimmerwood clearings and Moonbough Enclaves", active: "Dusk and night",
    behavior: "Moves in quiet pairs. When an ally is threatened, its antlers launch a spiraling volley of luminous leaves before it retreats.",
    lore: "Moonbough songs call each antler tine a promise the forest chose to remember.", colors: [0x3e705f, 0x8bf0c6, 0xe8fff2],
    drops: [{ item: Item.StarfernFrond, min: 1, max: 2, chance: 0.5 }], family: "pet", movement: "ground", persistent: true, ranged: true,
    sentient: false, factionAffinity: "wood-elves", tameRequiresUnaligned: true, tameable: true, tameItems: [Item.Moonpetal], breedable: true,
    breedingFoods: [Item.Moonpetal], diet: [Item.Moonpetal, Item.StarfernFrond],
    postTameNotes: "A bonded Glimmerhart defends its keeper with Verdant Volley, but stays inside its follower formation.",
    discoveryHint: "Watch for mint-green antler light between Glimmerwood trunks after sunset.",
  },
  runeowl: {
    kind: "runeowl", name: "Runeowl", temperament: "Skittish", hostile: false,
    health: 10, damage: 2, xp: 6, speed: 1.7, chaseSpeed: 4.4, turnRate: 8.2, attackRange: 9,
    footOffset: 1.3, radius: 0.42, height: 0.7, habitat: "Moonbough libraries and Glimmerwood branches", active: "Night",
    behavior: "Perches near books and rune-carved bark, then releases a soft starlight pulse when danger approaches.",
    lore: "A Runeowl never tears a page. Tomekeepers consider that sufficient evidence of wisdom.", colors: [0x5a5d88, 0xb5adff, 0xf8f1a8],
    drops: [{ item: Item.Feather, min: 1, max: 2, chance: 0.68 }], family: "bird", movement: "flying", flying: true, persistent: true,
    sentient: false, factionAffinity: "wood-elves", tameRequiresUnaligned: true, tameable: true, tameItems: [Item.Dreamcap], breedable: true,
    breedingFoods: [Item.Dreamcap], diet: [Item.Dreamcap, Item.Berry], discoveryHint: "Listen for three low notes near Glimmerwood libraries after dark.",
  },
  glowfin: {
    kind: "glowfin", name: "Glowfin", temperament: "Gentle", hostile: false,
    health: 4, damage: 0, xp: 2, speed: 1.38, chaseSpeed: 2.2, turnRate: 8, attackRange: 0,
    footOffset: 0.55, radius: 0.3, height: 0.28, habitat: "Glimmerwood moonwells and ponds", active: "All hours",
    behavior: "Forms small rings around Lumenreeds and pulses brighter when another Glowfin joins its shoal.",
    lore: "Enclaves read their shifting rings as a gentle forecast of tomorrow's rain.", colors: [0x3a8291, 0x77f2dc, 0xeaffff],
    drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 0.72 }], family: "fish", movement: "aquatic", aquatic: true, sentient: false,
    discoveryHint: "Look into the luminous ponds of the Glimmerwood.",
  },
  "copper-mole": {
    kind: "copper-mole", name: "Copper Mole", temperament: "Gentle", hostile: false,
    health: 15, damage: 2, xp: 5, speed: 0.72, chaseSpeed: 2.25, turnRate: 5, attackRange: 1.1,
    footOffset: 0.60047, radius: 0.52, height: 0.62, habitat: "Snowcap Range tunnels and Deepgear Holds", active: "All hours underground",
    behavior: "Sniffs out exposed ore, sleeps beside warm machinery, and digs short harmless furrows when excited.",
    lore: "Its copper-colored guard hairs are keratin, though no Deepgear child accepts that explanation.", colors: [0x7a533d, 0xc17d4f, 0xf3c879],
    drops: [{ item: Item.Flint, min: 1, max: 2, chance: 0.55 }], family: "pet", movement: "ground", persistent: true, sentient: false,
    factionAffinity: "dwarves", tameRequiresUnaligned: true, tameable: true, tameItems: [Item.RawGold], breedable: true,
    breedingFoods: [Item.Wheat], diet: [Item.Wheat, Item.RawGold], postTameNotes: "Chirps when a valuable ore block is exposed nearby.",
    discoveryHint: "Follow tiny fan-shaped tracks around Snowcap cave mouths.",
  },
  "copper-scout-golem": {
    kind: "copper-scout-golem", name: "Copper Scout Golem", temperament: "Defensive", hostile: false,
    health: 34, damage: 4, xp: 12, speed: 1.15, chaseSpeed: 3.1, turnRate: 7, attackRange: 1.3,
    footOffset: 1.08, radius: 0.52, height: 1.05, habitat: "Deepgear entrances and Golem Forges", active: "While its aether key is charged",
    behavior: "Patrols short circuits, marks hazards with a bright eye-lamp, and returns to its assigned forge when damaged.",
    lore: "Every scout's first step is witnessed by its golemsmith.", colors: [0xa96943, 0xd09a55, 0x8ff7ed],
    drops: [{ item: Item.GearCluster, min: 1, max: 2, chance: 0.78 }], family: "construct", movement: "ground", persistent: true,
    sentient: false, factionAffinity: "dwarves", tameRequiresUnaligned: true, tameable: false,
    discoveryHint: "Look beside the high-brightness lanterns at a Deepgear entrance.",
  },
  "stone-bulwark-golem": {
    kind: "stone-bulwark-golem", name: "Stone Bulwark Golem", temperament: "Defensive", hostile: false,
    health: 92, damage: 9, xp: 24, speed: 0.48, chaseSpeed: 1.8, turnRate: 3.2, attackRange: 1.8,
    footOffset: 1.312, radius: 0.9, height: 1.75, habitat: "Deepgear defensive galleries", active: "While its aether key is charged",
    behavior: "Locks broad feet against the floor, shields nearby allies, and answers threats with a piston-driven hammer blow.",
    lore: "Bulwarks have hollow chests so a hold's alarm bell can ring through them.", colors: [0x62696a, 0xaa7f4b, 0x84e6e7],
    drops: [{ item: Item.GearCluster, min: 2, max: 4, chance: 1 }], family: "construct", movement: "ground", persistent: true,
    sentient: false, factionAffinity: "dwarves", tameRequiresUnaligned: true, tameable: false,
    discoveryHint: "Deepgear guards station these constructs inside their first defensive gallery.",
  },
  "aetherforged-sentinel": {
    kind: "aetherforged-sentinel", name: "Aetherforged Sentinel", temperament: "Defensive", hostile: false,
    health: 168, damage: 16, xp: 48, speed: 0.7, chaseSpeed: 2.25, turnRate: 4.2, attackRange: 8,
    footOffset: 1.515, radius: 1.05, height: 2.25, habitat: "Master Deepgear Golem Forges", active: "While its mana core remains attuned",
    behavior: "Alternates crushing strikes with a focused aether pulse and places itself between its keeper and danger.",
    lore: "A completed Sentinel is a public promise that the hold intends to endure.", colors: [0x48565b, 0xb98c50, 0x76f4ef],
    drops: [{ item: Item.DeepgearAlloy, min: 3, max: 6, chance: 1 }], family: "construct", movement: "ground", ranged: true, persistent: true,
    sentient: false, factionAffinity: "dwarves", tameRequiresUnaligned: true, tameable: false,
    discoveryHint: "Only master Golem Forges can finalize this mana-hungry construct.",
  },
  "deepgear-courser-golem": {
    kind: "deepgear-courser-golem", name: "Deepgear Courser", temperament: "Defensive", hostile: false,
    health: 58, damage: 6, xp: 18, speed: 1.12, chaseSpeed: 4.35, turnRate: 5.1, attackRange: 1.35,
    footOffset: 1.05, radius: 0.68, height: 1.82, habitat: "Deepgear stables and Golem Forges", active: "While its aether flywheel is charged",
    behavior: "Carries a rider over steep hold roads, braces on piston legs when threatened, and returns to the nearest forge for repairs.",
    lore: "Deepgear Coursers were built after ordinary packhorses objected, correctly, to freight lifts and powderworks bells.",
    colors: [0x9a6a3d, 0x566268, 0x7df1eb], drops: [{ item: Item.GearCluster, min: 2, max: 4, chance: 1 }],
    family: "construct", movement: "ground", persistent: true, sentient: false, factionAffinity: "dwarves", tameRequiresUnaligned: true,
    tameable: true, tameItems: [Item.DeepgearAlloy, Item.GearCluster], diet: [Item.DeepgearAlloy, Item.GearCluster], rideable: true,
    utility: "A durable mechanical land mount assembled at a Golem Forge or purchased unaligned from a Deepgear Golemsmith.",
    postTameNotes: "Fit a Trail Saddle after attuning its aether key. Deepgear Alloy repairs three hearts.",
    discoveryHint: "Listen for paired piston strokes near a Deepgear Golem Forge.",
  },
  "clockwork-hound-golem": {
    kind: "clockwork-hound-golem", name: "Clockwork Hound Golem", temperament: "Defensive", hostile: false,
    health: 46, damage: 7, xp: 16, speed: 1.38, chaseSpeed: 5.45, turnRate: 8.8, attackRange: 1.42,
    footOffset: 0.76, radius: 0.56, height: 0.96, habitat: "Deepgear gate kennels and Golem Forges", active: "While its spring-heart carries charge",
    behavior: "Runs a tight interception arc, bites at exposed joints, and uses its plated shoulder to knock threats away from its keeper.",
    lore: "The first hounds were made for delvers who missed their dogs underground; modern ones can hear a hostile footstep through two stone walls.",
    colors: [0x9f6b3c, 0x4c585c, 0x8df5e9], drops: [{ item: Item.GearCluster, min: 1, max: 3, chance: 0.9 }],
    family: "construct", movement: "ground", persistent: true, sentient: false, factionAffinity: "dwarves", tameRequiresUnaligned: true,
    tameable: true, tameItems: [Item.GearCluster, Item.DeepgearAlloy], diet: [Item.GearCluster, Item.DeepgearAlloy],
    utility: "A fast bodyguard that intercepts attackers before returning to formation. Unaligned hounds can be bonded and attuned to a Capture Orb.",
    postTameNotes: "Set Follow or Hold in its creature panel. Precision Gear Clusters repair its spring-heart; it cannot breed.",
    discoveryHint: "Listen for a metallic bark beside the gate of a Deepgear Hold.",
  },
  "webspinner-golem": {
    kind: "webspinner-golem", name: "Webspinner Golem", temperament: "Defensive", hostile: false,
    health: 64, damage: 5, xp: 22, speed: 0.84, chaseSpeed: 3.35, turnRate: 7.4, attackRange: 8,
    footOffset: 0.64, radius: 0.75, height: 0.76, habitat: "Deepgear defensive galleries and Golem Forges", active: "While its pressure loom is wound",
    behavior: "Skitters to a measured standoff, vents a binding web of mineral filament and steam, then repositions while its pressure chamber recovers.",
    lore: "Eight independent leg governors let a Webspinner keep a tunnel covered even when the floor is mostly missing.",
    colors: [0x556063, 0xb77d45, 0xa4fff0], drops: [{ item: Item.GearCluster, min: 2, max: 4, chance: 1 }],
    family: "construct", movement: "ground", ranged: true, persistent: true, sentient: false, factionAffinity: "dwarves", tameRequiresUnaligned: true,
    tameable: true, tameItems: [Item.CrystalShard, Item.DeepgearAlloy], diet: [Item.CrystalShard, Item.DeepgearAlloy],
    utility: "A ranged control companion that slows hostile creatures with bounded pressure-web bursts while keeping clear of melee.",
    postTameNotes: "Its pressure loom favors open sight lines. Crystal Shards replenish its filament core; it cannot breed.",
    discoveryHint: "Search the ceiling braces around a Deepgear defensive gallery for eight brass footprints.",
  },
};

type SeaSlugProfile = Readonly<{
  name: string;
  habitat: string;
  behavior: string;
  lore: string;
  colors: [number, number, number];
  food: ItemCode;
  discoveryHint: string;
  speed?: number;
  bottomDweller?: boolean;
}>;

/** Keeps the large nudibranch collection mechanically consistent while leaving each species' ecology explicit. */
function seaSlugDefinition(kind: SeaSlugKind, profile: SeaSlugProfile): MobDefinition {
  return {
    kind, name: profile.name, temperament: "Gentle", hostile: false,
    health: 3, damage: 0, xp: 2, speed: profile.speed ?? 0.14, chaseSpeed: (profile.speed ?? 0.14) * 1.6, turnRate: 2.3, attackRange: 0,
    footOffset: 0.58, radius: 0.24, height: 0.2, habitat: profile.habitat, active: "All hours underwater",
    behavior: profile.behavior, lore: profile.lore, colors: profile.colors, drops: [],
    family: "sea-slug", movement: "aquatic", aquatic: true, bottomDweller: profile.bottomDweller ?? true, sentient: false, breedable: true,
    breedingFoods: [profile.food], diet: [profile.food, Item.LumenKelpFrond], captureItem: Item.CaptureOrb,
    utility: "A living aquarium jewel that reproduces slowly with a mature partner, suitable food and free tank space.",
    discoveryHint: profile.discoveryHint,
  };
}

type LivingRosterSeed = Readonly<{
  name: string;
  temperament: MobTemperament;
  health: number;
  damage: number;
  speed: number;
  radius: number;
  height: number;
  footOffset: number;
  habitat: string;
  active: string;
  behavior: string;
  lore: string;
  utility: string;
  discoveryHint: string;
  colors: [number, number, number];
  family: MobFamily;
  movement: MobMovement;
  food: ItemCode;
  drops?: MobDrop[];
  hostile?: boolean;
  rideable?: boolean;
  aquatic?: boolean;
  flying?: boolean;
  bottomDweller?: boolean;
}>;

function livingRosterMob(kind: LivingRosterKind, seed: LivingRosterSeed): MobDefinition {
  return {
    kind, name: seed.name, temperament: seed.temperament, hostile: seed.hostile ?? false,
    health: seed.health, damage: seed.damage, xp: Math.max(3, Math.round(seed.health / 4)), speed: seed.speed,
    chaseSpeed: seed.speed * (seed.hostile ? 3.2 : 2.2), turnRate: seed.radius < 0.4 ? 8 : seed.flying ? 5.8 : 4.6,
    attackRange: seed.damage > 0 ? Math.max(0.8, seed.radius * 1.65) : 0,
    footOffset: seed.footOffset, radius: seed.radius, height: seed.height,
    habitat: seed.habitat, active: seed.active, behavior: seed.behavior, lore: seed.lore, colors: seed.colors,
    drops: seed.drops ?? [], family: seed.family, movement: seed.movement, aquatic: seed.aquatic,
    flying: seed.flying, bottomDweller: seed.bottomDweller, tameable: true, tameItems: [seed.food],
    breedable: true, breedingFoods: [seed.food], diet: [seed.food], captureItem: Item.CaptureOrb,
    rideable: seed.rideable, foodLure: !seed.hostile, utility: seed.utility, discoveryHint: seed.discoveryHint,
    fieldNotes: Object.freeze([
      { id: "field-sign", title: "Field Sign", text: seed.behavior, hint: seed.discoveryHint, requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "close-study", title: "Close Study", text: seed.utility, hint: "Secure one healthy specimen and inspect it at Creature Camp.", requires: [{ metric: "captures", atLeast: 1 }] },
      { id: "lineage", title: "Lineage Note", text: `${seed.name} markings and care preferences remain visible across a raised lineage without hidden combat genetics.`, hint: "Raise or breed this species responsibly.", requires: [{ metric: "breeds", atLeast: 1 }] },
    ]),
  };
}

export const LIVING_ROSTER_MOBS: Record<LivingRosterKind, MobDefinition> = {
  "thornhide-trufflehog": livingRosterMob("thornhide-trufflehog", {
    name: "Thornhide Trufflehog", temperament: "Gentle", health: 22, damage: 3, speed: .55, radius: .62, height: .72, footOffset: .5676,
    habitat: "Mushroom Fen and rain-soft Bloomwood clearings", active: "Dawn, dusk, and after rain", family: "surface", movement: "ground", food: Item.Dreamcap,
    behavior: "Reads fungal threads through a divided copper snout, then parts the soil with ivory root-tusks while its living thorn mantle folds flat around nearby young.",
    lore: "Old orchard keepers say a Trufflehog does not find mushrooms; it listens until the forest admits where it hid them.",
    utility: "Snuffles out authored buried food, rare fungi, and root caches without exposing protected structures.", discoveryHint: "Follow paired furrows ending at an untouched ring of mushrooms.",
    colors: [0x5a4436, 0x637b42, 0xe5c68b], drops: [{ item: Item.Hide, min: 1, max: 2, chance: .42 }, { item: Item.Fiber, min: 1, max: 3, chance: .7 }],
  }),
  "orchard-glider": livingRosterMob("orchard-glider", {
    name: "Orchard Glider", temperament: "Skittish", health: 8, damage: 1, speed: 1.25, radius: .28, height: .28, footOffset: .5,
    habitat: "Birchlight, Bloomwood, and Sakurabloom canopy edges", active: "Dusk and clear early morning", family: "surface", movement: "flying", flying: true, food: Item.Apple,
    behavior: "Spreads leaf-veined membranes between all four limbs, banks on its rudder tail, and taps ripe fruit with a bright seed-marking call.",
    lore: "A glider nest is assembled from one seed of every tree it has crossed, a tiny map of an orchard not yet grown.", utility: "Marks mature fruit and retrieves one loose seed from reachable canopy blocks.",
    discoveryHint: "Place fruit on a low branch and wait without sprinting beneath the canopy.", colors: [0x8b5e3c, 0xd9a95b, 0x315f49], drops: [{ item: Item.Fiber, min: 1, max: 1, chance: .28 }],
  }),
  "petalmask-tanuki": livingRosterMob("petalmask-tanuki", {
    name: "Petalmask Tanuki", temperament: "Defensive", health: 24, damage: 4, speed: .68, radius: .58, height: .82, footOffset: .5492,
    habitat: "Rainy Sakurabloom groves and Glimmerwood paths", active: "Rain, dusk, and moonlit nights", family: "surface", movement: "ground", food: Item.Moonpetal,
    behavior: "Wears a naturally shed blossom mask, rolls its ringed tail through drifting petals, and lays several false scent trails while preserving one honest ecological track.",
    lore: "The oldest masks are repaired with sap instead of replaced; each crack marks a trick that failed and a lesson the animal kept.", utility: "Creates a short-lived decoy and can borrow the scent of a tracked wild creature.",
    discoveryHint: "In rain, ignore the brightest petals and follow the trail that bends around seedlings.", colors: [0x725444, 0xe8b8c8, 0x423e67], drops: [{ item: Item.Fiber, min: 1, max: 2, chance: .5 }],
  }),
  "ironbeak-magpie": livingRosterMob("ironbeak-magpie", {
    name: "Ironbeak Magpie", temperament: "Skittish", health: 9, damage: 2, speed: 1.42, radius: .25, height: .42, footOffset: .76,
    habitat: "Forest roads, wayposts, and abandoned settlement roofs", active: "Daylight", family: "bird", movement: "flying", flying: true, food: Item.WheatSeeds,
    behavior: "Balances on a long blue-black tail, tests metal with a pale forged-looking bill, and catalogs every cache with a different two-note call.",
    lore: "Deepgear miners treat a Magpie returning a lost fastener as luck; one stealing the same fastener twice is considered an inspection.", utility: "Retrieves one dropped metal object, carries a tiny message tube, and reveals its own bounded cache.",
    discoveryHint: "Leave one harmless polished lure near a road marker and watch from cover.", colors: [0x202b39, 0xc7d4d2, 0x4d87a5], drops: [{ item: Item.Feather, min: 1, max: 2, chance: .62 }],
  }),
  "hearthback-badger": livingRosterMob("hearthback-badger", {
    name: "Hearthback Badger", temperament: "Defensive", health: 30, damage: 5, speed: .48, radius: .68, height: .62, footOffset: .5604,
    habitat: "Wildwood banks and Frostpine root burrows", active: "Dawn and evening", family: "surface", movement: "ground", food: Item.Sunroot,
    behavior: "Digs with slate foreclaws, carries dry moss in a warm russet saddle of fur, and plants itself between danger and a burrow rather than chasing far.",
    lore: "Travelers once followed the smoke-colored stripe on its back home, mistaking it for a road warmed by a distant hearth.", utility: "Finds tubers and compostable roots and guards one small assigned camp radius.",
    discoveryHint: "Set edible roots downhill from a den and keep the den entrance clear.", colors: [0x3d3935, 0xa35f3e, 0xe9d9b7], drops: [{ item: Item.Hide, min: 1, max: 2, chance: .55 }],
  }),
  "sunfoil-pangolin": livingRosterMob("sunfoil-pangolin", {
    name: "Sunfoil Pangolin", temperament: "Defensive", health: 34, damage: 4, speed: .42, radius: .62, height: .62, footOffset: .5148,
    habitat: "Sunstep Savanna termite fields and Painted Badlands ledges", active: "Warm daylight", family: "surface", movement: "ground", food: Item.Sunroot,
    behavior: "Overlapping brass-gold scales hinge into a nearly seamless sphere; uncurled, its long tongue flicks through termite towers while the foil edges scatter heat.",
    lore: "No two scale rows catch the sun in the same order, so caravans once named individuals as moving hours of the day.", utility: "Finds clay and flint pockets and braces into a temporary defensive barrier.",
    discoveryHint: "Wait beside a disturbed termite mound until the armored silhouette fully uncurls.", colors: [0xb9883f, 0xf0cd6b, 0x342d29], drops: [{ item: Item.Flint, min: 1, max: 2, chance: .45 }],
  }),
  "glassstep-jerboa": livingRosterMob("glassstep-jerboa", {
    name: "Glassstep Jerboa", temperament: "Skittish", health: 6, damage: 1, speed: 1.38, radius: .2, height: .42, footOffset: .8756,
    habitat: "Sunglass Desert dunes and moonlit glass flats", active: "Night", family: "surface", movement: "ground", food: Item.WheatSeeds,
    behavior: "Launches from impossibly long hind feet, steadies with a brush-tipped tail, and crosses brittle glass sand without making the fracture tone of heavier animals.",
    lore: "Desert children read its moonlit hop pattern as a warning alphabet for hollow ground.", utility: "Detects unstable sand, buried chambers, and authored desert caches.",
    discoveryHint: "Sit silently near paired pinprick tracks and offer seeds after moonrise.", colors: [0xd7bc87, 0x8ecbd0, 0x241f2d], drops: [],
  }),
  "stormcrest-ibex": livingRosterMob("stormcrest-ibex", {
    name: "Stormcrest Ibex", temperament: "Defensive", health: 38, damage: 7, speed: .74, radius: .7, height: 1.32, footOffset: .7252,
    habitat: "Cloudbreak Highlands and Snowcap Mountains", active: "High wind and storms", family: "mount", movement: "ground", food: Item.Wheat, rideable: true,
    behavior: "Plants split iron-dark hooves on near-vertical shelves while twin spiral horns collect harmless blue static along weather-cut ridges.",
    lore: "A resting herd always leaves one horn pointed into the wind; climbers who notice it in time rarely walk into the storm's worst face.", utility: "A Partnered climbing pack mount with a bounded fall-rescue leap.",
    discoveryHint: "Follow a herd's high route until the storm quiets and every adult kneels.", colors: [0x59636d, 0xa9c4cc, 0xd5c45d], drops: [{ item: Item.Hide, min: 1, max: 3, chance: .58 }],
  }),
  "cindercoil-gecko": livingRosterMob("cindercoil-gecko", {
    name: "Cindercoil Gecko", temperament: "Skittish", health: 7, damage: 2, speed: .62, radius: .25, height: .18, footOffset: .58,
    habitat: "Ember Wastes basalt and hot Painted Badlands ledges", active: "Warm dusk and night", family: "surface", movement: "ground", food: Item.CaveGel,
    behavior: "Clings with broad ash-gray toe fans, coils a coal-red tail around warm stone, and dims its ember freckles before crossing a dangerously hot seam.",
    lore: "Kilnkeepers trust a sleeping Gecko more than a dial: it leaves before the first brick cracks.", utility: "Signals dangerous heat and provides a modest, assignment-based furnace assist.",
    discoveryHint: "Cool one basking stone and wait for the ember freckles to brighten again.", colors: [0x403b3b, 0xd45e3e, 0xffc36a], drops: [],
  }),
  "cloudkite-pika": livingRosterMob("cloudkite-pika", {
    name: "Cloudkite Pika", temperament: "Skittish", health: 7, damage: 0, speed: .78, radius: .23, height: .3, footOffset: .5028,
    habitat: "Cloudreed peaks and sheltered highland scree", active: "Windy daylight", family: "surface", movement: "ground", food: Item.Wheat,
    behavior: "Raises two sail-like ears into crosswinds and answers distant kin with a clear three-note whistle that briefly shapes a soft updraft over the colony.",
    lore: "Their hay piles are weighted with exactly one stone from above and one from below, a small treaty between cliff and cloud.", utility: "Provides a cooldown-based updraft pulse and an audible danger warning.",
    discoveryHint: "Sound a wind chime from the sheltered side of a ridge, then wait below the hay line.", colors: [0xc7b89d, 0x91c8d7, 0xf2e7c9], drops: [],
  }),
  "briarclaw-lynx": livingRosterMob("briarclaw-lynx", {
    name: "Briarclaw Lynx", temperament: "Hostile", hostile: true, health: 32, damage: 8, speed: .92, radius: .58, height: .84, footOffset: .6092,
    habitat: "Rare Wildwood, Frostpine, and Bloomwood cover", active: "Dusk, night, and snowfall", family: "surface", movement: "ground", food: Item.RawMeat,
    behavior: "Moves beneath a broken mantle of thorn-like shoulder fur, leaves deliberate false pawprints, and watches across several nights before committing to one readable pounce.",
    lore: "The white old hunter of Frostpine is not feared for being unseen, but for allowing itself to be seen exactly once.", utility: "A Partnered ambush guardian and hostile-track specialist with a bounded leash.",
    discoveryHint: "Survive its repeated stalking signs, then calm or weaken it after the final pounce.", colors: [0x51473f, 0x6f8550, 0xf0d694], drops: [{ item: Item.Hide, min: 1, max: 2, chance: .62 }, { item: Item.RawMeat, min: 1, max: 2, chance: .55 }],
  }),
  "gravebell-jackal": livingRosterMob("gravebell-jackal", {
    name: "Gravebell Jackal", temperament: "Defensive", health: 26, damage: 6, speed: .86, radius: .52, height: .76, footOffset: .6176,
    habitat: "Painted Badlands ruins and Ember Wastes cairns", active: "Night", family: "surface", movement: "ground", food: Item.BoneShard,
    behavior: "Carries a hollow bone bell beneath its throat, listens at old cairns, and rings only when an unquiet spirit crosses a boundary it has chosen to guard.",
    lore: "Returning a relic earns silence; stealing one earns a bell note that follows a thief much farther than paws do.", utility: "Reveals nearby undead, graves, and authored curse clues without exposing ordinary loot.",
    discoveryHint: "Return one displaced relic to the matching bone cache before offering food.", colors: [0x4a3c39, 0x9a7454, 0x9bd0c7], drops: [{ item: Item.BoneShard, min: 1, max: 2, chance: .45 }],
  }),
  "cragglass-basilisk": livingRosterMob("cragglass-basilisk", {
    name: "Cragglass Basilisk", temperament: "Hostile", hostile: true, health: 44, damage: 9, speed: .54, radius: .72, height: .66, footOffset: .5572,
    habitat: "Badland stone circles and Crystaldeep fringes", active: "Low sun and crystal resonance", family: "underground", movement: "ground", food: Item.CrystalShard,
    behavior: "Carries a faceted crown over six low limbs; the crown focuses a slowing glass gaze that fractures into harmless color when reflected at the correct angle.",
    lore: "Its victims are not statues but patient animals caught in a mineral trance, often waking days later beneath a new skin of dust.", utility: "Slows one pursuing threat and detects petrified fauna or reflective puzzle marks.",
    discoveryHint: "Interrupt the gaze with a reflective surface, then approach during its clearly visible molt.", colors: [0x586152, 0x85b8a9, 0xe2b76d], drops: [{ item: Item.CrystalShard, min: 1, max: 3, chance: .65 }],
  }),
  "stormglass-roclet": livingRosterMob("stormglass-roclet", {
    name: "Stormglass Roclet", temperament: "Defensive", health: 28, damage: 7, speed: 1.18, radius: .66, height: .88, footOffset: 1.02,
    habitat: "Storm-struck Cloudbreak and Snowcap nests", active: "Storms and strong highland wind", family: "mount", movement: "flying", flying: true, food: Item.RawMeat, rideable: true,
    behavior: "A juvenile carries translucent storm-quartz vanes among broad slate feathers; rescued birds replace broken vanes over time and learn to bank beneath a falling companion.",
    lore: "At level thirty the name Roclet is no longer accurate, but highlanders keep it as a reminder that every great Roc was once carried home in a blanket.", utility: "Matures into a one-seat flying Roc after Partnered bond and completed flight training; clears soft gust hazards.",
    discoveryHint: "Find a storm-fallen juvenile below a high nest and shelter it before attempting capture.", colors: [0x556477, 0x8fd0dc, 0xe8d16b], drops: [{ item: Item.Feather, min: 2, max: 4, chance: .7 }],
  }),
  "brinewhisk-otter": livingRosterMob("brinewhisk-otter", {
    name: "Brinewhisk Otter", temperament: "Gentle", health: 18, damage: 3, speed: .82, radius: .42, height: .46, footOffset: .32,
    habitat: "Wandering River, Siltfen pools, and Sunwash Coast", active: "Daylight and calm rain", family: "surface", movement: "amphibious", aquatic: true, food: Item.RawFish,
    behavior: "Steers with a ribbon tail, stores a favorite shell in a chest-fur pocket, and invites cautious strangers into a repeated shell-return game before accepting touch.",
    lore: "A lost boat key has a better chance of returning in an Otter's paws than in a fisher's net—provided the finder is thanked with the right shell.", utility: "Retrieves floating or shallow submerged drops and can tow a tiring swimmer briefly.",
    discoveryHint: "Return the same shell three times near a lodge without entering the nursery water.", colors: [0x5a493b, 0xcaa476, 0x92d0d1], drops: [{ item: Item.RawFish, min: 1, max: 1, chance: .25 }],
  }),
  "riverwright-beaver": livingRosterMob("riverwright-beaver", {
    name: "Riverwright Beaver", temperament: "Defensive", health: 27, damage: 5, speed: .54, radius: .58, height: .62, footOffset: .4,
    habitat: "Rare Wandering River colonies and Siltfen channels", active: "Dawn, dusk, and flowing water", family: "surface", movement: "amphibious", aquatic: true, food: Item.Stick,
    behavior: "Scores every carried branch with paired incisors, packs mud using a broad patterned tail, and repairs only recognized lodge or irrigation anchors rather than arbitrary structures.",
    lore: "The spiral notches on an old dam are not decoration; they are a maintenance ledger readable to every colony downstream.", utility: "Improves assigned irrigation, fishing, and driftwood structures through bounded work events.",
    discoveryHint: "Repair the marked gap in a damaged lodge with local wood, then wait downstream.", colors: [0x5c4331, 0x8a6a43, 0xd9bf82], drops: [{ item: Item.Hide, min: 1, max: 2, chance: .48 }, { item: Item.Stick, min: 1, max: 3, chance: .7 }],
  }),
  "mirecrown-crane": livingRosterMob("mirecrown-crane", {
    name: "Mirecrown Crane", temperament: "Skittish", health: 14, damage: 2, speed: .76, radius: .4, height: 1.32, footOffset: .92,
    habitat: "Migratory Siltfen and Flower Meadow ponds", active: "Dawn migrations and rain-cleared evenings", family: "bird", movement: "flying", flying: true, aquatic: true, food: Item.RawFish,
    behavior: "Steps on reed-thin legs, fans a moss-green crown during courtship, and sweeps one long wing between nestlings and foul water before calling the flock elsewhere.",
    lore: "Where a Mirecrown completes its dance, pond keepers expect clean water and new flowers before the next moon.", utility: "Locates rare pond flora and healthy shallows and can cleanse one minor aquatic ailment.",
    discoveryHint: "Observe the complete courtship from outside the reeds, then answer the final two-note call.", colors: [0xd6d6c5, 0x5c8065, 0xc96957], drops: [{ item: Item.Feather, min: 1, max: 3, chance: .6 }],
  }),
  "inkveil-cuttle": livingRosterMob("inkveil-cuttle", {
    name: "Inkveil Cuttle", temperament: "Skittish", health: 16, damage: 3, speed: 1.12, radius: .48, height: .38, footOffset: .28,
    habitat: "Brightwater reefs, Abyssal shelves, and Lumen Trench observatories", active: "Dim water and dusk", family: "fish", movement: "aquatic", aquatic: true, food: Item.RawFish,
    behavior: "Runs waves of violet, pearl, and night blue across its mantle, folds eight short arms into false facial shapes, and jets behind a bounded cloud of living ink.",
    lore: "The observatory cuttle does not copy objects. It copies the last emotion of anyone reflected in its glass.", utility: "Creates an escape ink cloud, provides brief camouflage, and enriches a dim aquarium.",
    discoveryHint: "Dim nearby light and remain motionless until its pupil returns to a calm W shape.", colors: [0x493f72, 0x76c3b7, 0xf0c4da], drops: [{ item: Item.LivingInk, min: 1, max: 2, chance: .42 }],
  }),
  "prismclaw-mantis-shrimp": livingRosterMob("prismclaw-mantis-shrimp", {
    name: "Prismclaw Mantis Shrimp", temperament: "Defensive", health: 24, damage: 8, speed: .72, radius: .4, height: .28, footOffset: .24,
    habitat: "Reef caverns and Lumen Trench structure seams", active: "Bright current changes", family: "fish", movement: "aquatic", aquatic: true, bottomDweller: true, food: Item.RawFish,
    behavior: "Carries two folded hammer clubs beneath a stained-glass carapace; each strike is preceded by a visible color-lock and can crack only authored weakened reef stone.",
    lore: "Tideglass masons test windows by letting a Prismclaw look at them. If the animal loses interest, the glass will outlive the wall.", utility: "Breaks specially marked cracked underwater blocks and produces a short flashburst in combat.",
    discoveryHint: "Bait its color-locked strike against a hardened shell and approach during recovery.", colors: [0x3ba89b, 0xe06e55, 0xf1d65f], drops: [{ item: Item.StarCoralShard, min: 1, max: 2, chance: .45 }],
  }),
  "reefmender-shrimp": livingRosterMob("reefmender-shrimp", {
    name: "Reefmender Shrimp", temperament: "Gentle", health: 4, damage: 0, speed: .5, radius: .18, height: .16, footOffset: .13,
    habitat: "Brightwater coral cleaning stations", active: "Daylight underwater", family: "fish", movement: "aquatic", aquatic: true, bottomDweller: true, food: Item.LumenKelpFrond,
    behavior: "Waves long white feelers from a coral perch, signals larger fish into a patient queue, and removes parasites with jewel-fine foreclaws without damaging healthy scales.",
    lore: "A reef without a mender may still be colorful. A reef with one is quiet enough for every color to stay.", utility: "Maintains aquarium health, tends coral, and removes one minor ailment from a water-carried ally.",
    discoveryHint: "Wait until it is actively cleaning another creature; an idle shrimp will retreat into coral.", colors: [0xf2e7d2, 0xd95e5e, 0x75d5c7], drops: [],
  }),
  "currentweaver-eel": livingRosterMob("currentweaver-eel", {
    name: "Currentweaver Eel", temperament: "Defensive", health: 21, damage: 6, speed: 1.28, radius: .32, height: .3, footOffset: .22,
    habitat: "Lumen Trench, Abyssal Ocean, and Glasswater currents", active: "Storms, charged lures, and strong currents", family: "fish", movement: "aquatic", aquatic: true, food: Item.RawFish,
    behavior: "Braids its ribbon body around moving water, drinks charge through copper-blue finlets, and adds a visible Storm affinity only while the luminous lateral line remains full.",
    lore: "A Currentweaver is never struck by the same current twice; it edits the second one before it arrives.", utility: "Powers a held lamp or produces a brief aquatic stun while visibly charged.",
    discoveryHint: "Offer its displayed lure and intercept the animal along its current rather than chasing behind it.", colors: [0x234f63, 0x47c5c3, 0xeedc78], drops: [{ item: Item.GlowScale, min: 1, max: 2, chance: .44 }],
  }),
  "shellcarrier-hermit": livingRosterMob("shellcarrier-hermit", {
    name: "Shellcarrier Hermit", temperament: "Gentle", health: 12, damage: 2, speed: .32, radius: .34, height: .3, footOffset: .24,
    habitat: "Sunwash and Brightwater shallows", active: "Low tide and calm daylight", family: "fish", movement: "amphibious", aquatic: true, bottomDweller: true, food: Item.RawFish,
    behavior: "Tests vacant shells with mismatched feelers, braces a chosen home on six red legs, and ties one small carried object beneath the lip using living tidevine.",
    lore: "The finest shell is not the brightest but the one the Hermit leaves behind without looking back.", utility: "Acts as a tiny mobile satchel and cleans loose aquarium substrate; shell gear visibly changes Guard.",
    discoveryHint: "Offer a clearly better empty shell instead of weakening the animal.", colors: [0xb45c48, 0x8e9b85, 0xe8d4a5], drops: [{ item: Item.TidevineFiber, min: 1, max: 2, chance: .4 }],
  }),
  "wreckwhistle-porpoise": livingRosterMob("wreckwhistle-porpoise", {
    name: "Wreckwhistle Porpoise", temperament: "Gentle", health: 34, damage: 4, speed: 1.62, radius: .72, height: .62, footOffset: .45,
    habitat: "Rare ocean pods along old wreck routes", active: "Daylight, storms, and distress calls", family: "mount", movement: "aquatic", aquatic: true, food: Item.RawFish, rideable: true,
    behavior: "Carries pale wake scars along a compact slate body, maps debris with layered whistles, and lifts trapped podmates using its shoulder rather than its beak.",
    lore: "Sailors follow the descending whistle to wreckage and the rising whistle home. Confusing the two is considered an insult to the listener.", utility: "A Partnered one-seat swimming mount that marks wrecks and escorts boats through dangerous water.",
    discoveryHint: "Follow its calls and clear debris from a trapped podmate before fitting a tide harness.", colors: [0x496f7b, 0xb9d8d7, 0xefd58b], drops: [{ item: Item.RawFish, min: 1, max: 3, chance: .38 }],
  }),
  "kilnscale-salamander": livingRosterMob("kilnscale-salamander", {
    name: "Kilnscale Salamander", temperament: "Defensive", health: 17, damage: 4, speed: .48, radius: .42, height: .24, footOffset: .5852,
    habitat: "Emberdeep Fumaroles and heated mineral terraces", active: "Near stable heat gradients", family: "underground", movement: "amphibious", food: Item.CaveGel,
    behavior: "Tiles of black-red scale overlap a low broad body, opening like kiln vents when warm and sealing to blue-gray stone when deeply chilled.",
    lore: "Delvers once carried them as living coals until they learned the animal prefers choosing its own hearth.", utility: "Provides camp warmth and a modest assigned smelting bonus; its Flame type visibly fades while deeply chilled.",
    discoveryHint: "Vent or cool its fumarole into a safe gradient before approaching the basking shelf.", colors: [0x3d3533, 0xc75037, 0xffaa59], drops: [{ item: Item.SulfurGrowthItem, min: 1, max: 2, chance: .4 }],
  }),
  "sporeback-gardener": livingRosterMob("sporeback-gardener", {
    name: "Sporeback Gardener", temperament: "Gentle", health: 23, damage: 2, speed: .38, radius: .58, height: .72, footOffset: .6132,
    habitat: "Rootweave Grotto and old fungal pockets", active: "Dim ecological centers", family: "underground", movement: "ground", food: Item.Dreamcap,
    behavior: "Walks on four root-knuckled feet beneath a cultivated crown of caps, collects exhausted growth into a belly compost chamber, and replants only prepared mushroom beds.",
    lore: "Its garden is inheritance, shelter, and biography. A bare-backed Gardener is not young but newly arrived.", utility: "Plants mushrooms, produces compost, and supports bounded cave-garden cycles.",
    discoveryHint: "Complete a broken mushroom ring and leave the center unharvested overnight.", colors: [0x566642, 0xb57f68, 0xb9e887], drops: [{ item: Item.SporePodItem, min: 1, max: 3, chance: .5 }, { item: Item.Fiber, min: 1, max: 2, chance: .55 }],
  }),
  "voidmantle-ray": livingRosterMob("voidmantle-ray", {
    name: "Voidmantle Ray", temperament: "Skittish", health: 30, damage: 5, speed: 1.35, radius: 1.05, height: .34, footOffset: .5,
    habitat: "Very large Glasswater and Pillarstone caverns", active: "Darkness between ecological centers", family: "mount", movement: "flying", flying: true, food: Item.LumenKelpFrond, rideable: true,
    behavior: "Sails through dense cave air on a black-violet diamond mantle, following luminous plankton routes while two trailing fins read pillars like fingertips.",
    lore: "It does not fly so much as refuse to decide whether the cavern is air or sea.", utility: "A Partnered one-seat cavern glider that cannot gain altitude indefinitely and needs genuinely open volume.",
    discoveryHint: "Follow its full luminous feeding route without cutting across the school beneath it.", colors: [0x292642, 0x675f9e, 0x63c8bd], drops: [{ item: Item.LivingInk, min: 1, max: 2, chance: .35 }],
  }),
  "fossilback-trilobite": livingRosterMob("fossilback-trilobite", {
    name: "Fossilback Trilobite", temperament: "Gentle", health: 15, damage: 1, speed: .22, radius: .38, height: .2, footOffset: .16,
    habitat: "Glasswater beds and Pillarstone sediment shelves", active: "Slow cave-current cycles", family: "fish", movement: "aquatic", aquatic: true, bottomDweller: true, food: Item.CaveGel,
    behavior: "Ripples many tiny legs beneath three copper-brown lobes, settles into sediment with only its eye ridges exposed, and taps when ancient strata lie below.",
    lore: "Its shell resembles a fossil because fossils resemble its ancestors; the animal has never had reason to hurry away from a successful design.", utility: "Detects fossils, ancient strata, and authored submerged ruins; Prime lineages unlock historical notes.",
    discoveryHint: "Brush sediment away around the moving shell instead of mining the occupied block.", colors: [0x7d6449, 0xb59462, 0x83c4b7], drops: [{ item: Item.FossilStoneItem, min: 1, max: 1, chance: .25 }],
  }),
};

const MYTHIC_FRONTIER_DROPS: Partial<Record<LegendaryCreatureKind, MobDrop[]>> = {
  "bellstep-qilin": [{ item: Item.Fiber, min: 1, max: 2, chance: .55 }],
  "aerolith-baleen": [{ item: Item.MineralCrustItem, min: 1, max: 3, chance: .68 }],
  "mireglass-kelpie": [{ item: Item.LumenreedFrond, min: 1, max: 2, chance: .58 }],
  "cinderwing-pyrausta": [{ item: Item.SulfurGrowthItem, min: 1, max: 2, chance: .62 }],
  "nacre-gatewyrm": [{ item: Item.LivingCoral, min: 1, max: 2, chance: .6 }],
  "frostcauldron-behemoth": [{ item: Item.Wool, min: 2, max: 5, chance: .82 }, { item: Item.RawMeat, min: 2, max: 4, chance: .52 }],
  "briarcrown-manticore": [{ item: Item.Hide, min: 1, max: 3, chance: .66 }, { item: Item.Fiber, min: 1, max: 2, chance: .55 }],
  ammonarch: [{ item: Item.FossilStoneItem, min: 1, max: 3, chance: .72 }],
  "handtail-ahuizotl": [{ item: Item.TidevineFiber, min: 1, max: 2, chance: .58 }],
  "tideclock-cetus": [{ item: Item.RawFish, min: 2, max: 4, chance: .68 }, { item: Item.LumenPearl, min: 1, max: 1, chance: .16 }],
  "anemoi-gryphon": [{ item: Item.Feather, min: 2, max: 5, chance: .78 }],
  "sable-gorgon": [{ item: Item.MirrorstoneItem, min: 1, max: 2, chance: .62 }],
  "namarra-makara": [{ item: Item.LivingCoral, min: 1, max: 3, chance: .62 }, { item: Item.LumenPearl, min: 1, max: 1, chance: .22 }],
  "ashen-salamander-king": [{ item: Item.HeatCrackedRockItem, min: 1, max: 3, chance: .7 }],
  "mycelial-oneirophant": [{ item: Item.SporePodItem, min: 1, max: 3, chance: .72 }],
};

 function mythicMob(kind: LegendaryCreatureKind, seed: Omit<LivingRosterSeed, "food"> & { food: ItemCode }): MobDefinition {
  const base = livingRosterMob(kind as unknown as LivingRosterKind, seed);
  return {
    ...base, kind, family: "legendary", persistent: true, breedable: false, foodLure: false,
    drops: seed.drops?.length ? base.drops : MYTHIC_FRONTIER_DROPS[kind] ?? base.drops,
    xp: Math.max(120, Math.round(seed.health * 1.5)), captureItem: Item.CaptureOrb,
    fieldNotes: Object.freeze([
      { id: "trail", title: "The Trail", text: seed.discoveryHint, hint: "Complete the authored regional hunt trail.", requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "encounter", title: "Living Encounter", text: seed.behavior, hint: "Reach the encounter without destroying its ecological anchors.", requires: [{ milestone: "legendary-encounter", atLeast: 1 }] },
      { id: "resolution", title: "Resolution", text: seed.utility, hint: "Resolve the encounter through capture, covenant, protection, or the authored destructive choice.", requires: [{ milestone: "legendary-resolution", atLeast: 1 }] },
    ]),
  };
}

export const LEGENDARY_CREATURE_MOBS: Record<LegendaryCreatureKind, MobDefinition> = {
  "ilyr-virebloom": mythicMob("ilyr-virebloom", {
    name: "Ilyr Virebloom, the Walking Spring", temperament: "Defensive", health: 360, damage: 14, speed: .66, radius: 1.48, height: 2.55, footOffset: 1.18,
    habitat: "A restored migration between three dry ecological centers", active: "After the three springs flow", family: "legendary", movement: "amphibious", aquatic: true, rideable: true, food: Item.RareSeedPouch,
    behavior: "An enormous deer-tapir guardian carries flowering watercourses through branching antlers; small birds rest among the reeds while each hoofstep opens a brief spring that closes behind it.",
    lore: "Ilyr is not the source of the watershed. It is the promise that separated waters can remember one another.", utility: "A late-game land and shallow-water sanctuary mount that restores authored ecological sites and discovers rare seeds.",
    discoveryHint: "Restore three dry ecological centers, then follow the new water while keeping poachers from closing the route.", colors: [0x426b53, 0x75c8a6, 0xf0d889],
  }),
  thalassene: mythicMob("thalassene", {
    name: "Thalassene, the Reef That Swims", temperament: "Defensive", health: 440, damage: 16, speed: .42, radius: 2.15, height: 1.62, footOffset: .9,
    habitat: "A migrating reef route between Brightwater and collapsing trenches", active: "During the Tideglass restoration campaign", family: "legendary", movement: "aquatic", aquatic: true, rideable: true, food: Item.LivingCoral,
    behavior: "A broad leviathan bears a complete living reef whose arches admit fish; bleaching patches visibly dim as parasites are removed without striking the host.",
    lore: "Maps draw reefs as places. Thalassene is the old correction: some places choose where to be.", utility: "A bounded two-seat swimming sanctuary and mobile aquarium hub with protected resident slots.",
    discoveryHint: "Diagnose the bleaching, protect the migration, and install three temporary reef anchors before the trench fails.", colors: [0x2f6f76, 0x5abf9d, 0xf0d77b],
  }),
  orichalc: mythicMob("orichalc", {
    name: "Orichalc, the Oath Under Stone", temperament: "Defensive", health: 500, damage: 18, speed: .28, radius: 1.78, height: 2.35, footOffset: .12,
    habitat: "A protected Veinmetal seam below a Deepgear hold", active: "When the living seam is interpreted rather than mined", family: "legendary", movement: "ground", food: Item.VeinmetalFlake,
    behavior: "Colossal articulated ore segments assemble around an empty or unseen center, alternating between anatomical flexion and machine-perfect indexing without confirming either interpretation.",
    lore: "The Delvers call it an oath because every witness describes a different heart and agrees that something answered.", utility: "Can be left dormant, redirected, bound, or awakened; every outcome preserves Veinmetal's biological, magical, and mechanical ambiguity.",
    discoveryHint: "Mine around the living seam, rescue trapped delvers, and interpret the machinery that behaves like anatomy.", colors: [0x6d746e, 0xb37a4f, 0x6ce0c0],
  }),
  "varkesh-stormmane": mythicMob("varkesh-stormmane", {
    name: "Varkesh Stormmane", temperament: "Defensive", health: 330, damage: 17, speed: 1.32, radius: 1.22, height: 1.6, footOffset: 1.25,
    habitat: "The storm aerie above rebuilt highland wayposts", active: "Major storm fronts", family: "legendary", movement: "flying", flying: true, rideable: true, food: Item.RawMeat,
    behavior: "An adult Stormglass Roc carries a mane of charged cloud-feathers and weathered road markers woven into its breast and nest, diving only after a full beacon cry.",
    lore: "Varkesh does not guard the road. It guards the idea that a road must still lead somewhere after the storm.", utility: "A fast two-seat flying mount by bond or voluntary travel pact; protecting the aerie instead yields a Roclet lineage egg.",
    discoveryHint: "Rebuild the highland wayposts and cross the storm without killing the displaced flock.", colors: [0x465b76, 0x9bd4df, 0xf3cf58],
  }),
  kharza: mythicMob("kharza", {
    name: "Kharza, the Red Banner Warg", temperament: "Hostile", hostile: true, health: 300, damage: 18, speed: 1.05, radius: 1.05, height: 1.45, footOffset: .7388,
    habitat: "A rival-company coercion camp beyond the Brassroot roads", active: "During the Freeblades finale", family: "legendary", movement: "ground", rideable: true, food: Item.WargFeed,
    behavior: "A scarred war-warg carries broken mercenary banners through a riveted coercion harness; red pursuit runes flare before each chain leap and fail visibly as their anchors are destroyed.",
    lore: "The banner is not allegiance. It is every order Kharza survived long enough to tear in half.", utility: "Destroying the harness permits capture or a free pack pact and changes Freeblade doctrine; seizing it preserves a dangerous coercive tool.",
    discoveryHint: "Trace the alchemical control chain and break every harness anchor before attempting capture.", colors: [0x4b3835, 0xb64a43, 0xd6b173],
  }),
  "sugarwake-sovereign": mythicMob("sugarwake-sovereign", {
    name: "The Sugarwake Sovereign", temperament: "Defensive", health: 380, damage: 15, speed: .58, radius: 1.35, height: 2.1, footOffset: .72,
    habitat: "The Sugarcourt masterworks feast", active: "When competing festival works awaken together", family: "legendary", movement: "ground", food: Item.Gumdrop,
    behavior: "Pulled-sugar antlers frame a crowned kiln-heart beneath caramel-glass plates; ribbon limbs harden and soften across cooling, feast-memory, and kiln phases.",
    lore: "No confectioner made the Sovereign. Each made the part they were certain mattered most, and the feast supplied the argument between them.", utility: "May become a permanent guardian, a capturable heart-form, or a unique communal crafting station according to the finale resolution.",
    discoveryHint: "Contain syrup floods, cool the kiln-heart, and protect guests while the feast remembers itself.", colors: [0xb85b3f, 0xf0b968, 0xffe5a3],
  }),
  "bellstep-qilin": mythicMob("bellstep-qilin", {
    name: "Bellstep Qilin", temperament: "Gentle", health: 285, damage: 12, speed: .94, radius: 1.08, height: 1.78, footOffset: .7,
    habitat: "The Road of Quiet Bells across desert, badlands, and old savanna routes", active: "At dawn after every roadside bell is tuned", family: "legendary", movement: "ground", rideable: true, food: Item.RareSeedPouch,
    behavior: "A long-maned road guardian tests a traveler with patient circuits, chiming hooves, and a radiant gallop that never tramples the bell gardens.", lore: "The road did not tame the Qilin. It learned courtesy by watching which travelers repaired what they did not break.", utility: "A swift covenant mount that reveals safe roads, settlement approaches, and lost caravan shrines.", discoveryHint: "Tune the quiet bells in route order and complete its circuit without drawing a weapon.", colors: [0x536e56, 0xd5b45e, 0xffeaa0],
  }),
  "aerolith-baleen": mythicMob("aerolith-baleen", {
    name: "Aerolith Baleen", temperament: "Gentle", health: 440, damage: 14, speed: .72, radius: 2.2, height: 1.45, footOffset: 1.1,
    habitat: "Cloudwhale Graveyards above Cloudreed Glen and exposed highland cliffs", active: "Daylight, storms, and distress calls", family: "legendary", movement: "flying", flying: true, rideable: true, food: Item.LumenKelpFrond,
    behavior: "A sky-whale carries shelves of aerolith stone along its back and cups fallen cloud bones beneath six patient fins.", lore: "Its baleen combs weather rather than krill, straining old voices from the wind and returning them to the graveyard.", utility: "A sanctuary-scale flying carrier that lifts expedition cargo and safely descends through storms.", discoveryHint: "Return three scattered grave-bones and follow the lowest mourning call through the cloud shelf.", colors: [0x667f8c, 0xc5d8cf, 0xf4d47b],
  }),
  "mireglass-kelpie": mythicMob("mireglass-kelpie", {
    name: "Mireglass Kelpie", temperament: "Defensive", health: 305, damage: 13, speed: 1.08, radius: 1.02, height: 1.48, footOffset: .66,
    habitat: "The Mirrorfen Processional in swamps, fens, and flooded jungle roads", active: "Mist, rain, and moonlit water", family: "legendary", movement: "amphibious", aquatic: true, rideable: true, food: Item.Moonpetal,
    behavior: "A reed-maned water horse casts a false wake beside its real body and only lowers its mirrored bridle after a traveler distinguishes rescue from pursuit.", lore: "Every fen keeps one path for the lost and another for those who enjoy making others lost.", utility: "A fast amphibious mount whose decoy wake draws hostile attention away from swimmers.", discoveryHint: "Walk the processional in reflection order and rescue each stranded lantern without chasing the false horse.", colors: [0x315f62, 0x78b9a8, 0xbff4e4],
  }),
  "cinderwing-pyrausta": mythicMob("cinderwing-pyrausta", {
    name: "Cinderwing Pyrausta", temperament: "Defensive", health: 260, damage: 14, speed: 1.24, radius: .86, height: 1.12, footOffset: .92,
    habitat: "The Emberglass Hatchery in Ember Wastes and Emberdeep vents", active: "Stable heat and protected hatchery cycles", family: "legendary", movement: "flying", flying: true, food: Item.SulfurGrowthItem,
    behavior: "A great ember moth fans cinder dust over glass eggs, shearing only threats that cross the heated nursery wards.", lore: "Pyraustae are born from flame only in tavern stories. In truth they work very hard to keep their eggs from becoming flame.", utility: "Stabilizes hatcheries, reveals heat-writing, and carries one rider in short thermal climbs after a sanctuary pact.", discoveryHint: "Restore the hatchery vents and shelter all egg cradles through one cooling cycle.", colors: [0x73352c, 0xd7833b, 0xffe48a],
  }),
  "nacre-gatewyrm": mythicMob("nacre-gatewyrm", {
    name: "Nacre Gatewyrm", temperament: "Defensive", health: 360, damage: 15, speed: .74, radius: 1.32, height: 1.34, footOffset: .45,
    habitat: "The Drowned Moon Gate beneath Lumen Trench and Abyssal Shelf", active: "Tidal thresholds and opened moonwells", family: "legendary", movement: "aquatic", aquatic: true, rideable: true, food: Item.LivingCoral,
    behavior: "An armored threshold serpent folds nacre plates into temporary air pockets before ramming anything that breaks a sealed garden.", lore: "The gate is not a door. It is the agreement that water may enter only after asking.", utility: "A covenant swimmer that creates brief breathing pockets and opens sealed tidework passages.", discoveryHint: "Drain the broken gate chambers, restore both air gardens, and meet the wyrm at the moonwell.", colors: [0x427b83, 0xd8d6bb, 0xa9fff0],
  }),
  "frostcauldron-behemoth": mythicMob("frostcauldron-behemoth", {
    name: "Frostcauldron Behemoth", temperament: "Defensive", health: 520, damage: 20, speed: .4, radius: 1.85, height: 2.15, footOffset: .48,
    habitat: "Titan's Kettle in Snowcap Range, Snowfield, and Frostpine country", active: "Blizzards and caravan distress", family: "legendary", movement: "ground", rideable: true, food: Item.Wheat,
    behavior: "A vast shaggy kettle-backed beast braces avalanches with horn and shoulder, then warms stranded caravans beneath a steam-rimmed mantle.", lore: "Dwarves measure mountain weather by the Kettle's sleep. A waking snort means the pass has made a decision.", utility: "A slow two-seat pack mount that snowplows drifts, prevents one avalanche, and shelters travelers.", discoveryHint: "Clear the kettle rim without disturbing nearby Dwarven approaches, then escort the lost caravan into its lee.", colors: [0x65747b, 0xd8e7df, 0xf5c871],
  }),
  "briarcrown-manticore": mythicMob("briarcrown-manticore", {
    name: "Briarcrown Manticore", temperament: "Hostile", hostile: true, health: 345, damage: 19, speed: .96, radius: 1.22, height: 1.55, footOffset: .64,
    habitat: "The Root-Crown Menagerie above Rootweave under Glimmerwood and Wildwood", active: "Dusk and disturbed root courts", family: "legendary", movement: "ground", rideable: true, food: Item.RawMeat,
    behavior: "A lion-bodied root predator opens a fan of measured venom briars and pounces between living menagerie terraces rather than through them.", lore: "Its old keepers called the crown a restraint. The manticore remembers it as a garden that happened to have rules.", utility: "A kindred combat mount able to mark venom-safe paths and disperse invasive thickets.", discoveryHint: "Release the menagerie habitats in the correct ecological order and survive its unpoisoned challenge.", colors: [0x5a4936, 0x789a54, 0xd8a95e],
  }),
  ammonarch: mythicMob("ammonarch", {
    name: "Ammonarch", temperament: "Defensive", health: 500, damage: 15, speed: .3, radius: 1.9, height: 1.5, footOffset: .3,
    habitat: "The Fossil Orchard in Pillarstone Halls and Crystaldeep", active: "Resonant cistern tides", family: "legendary", movement: "amphibious", aquatic: true, food: Item.FossilStoneItem,
    behavior: "A walking ammonite fortress rotates its spiral mantle to redirect pressure while fossil fruit resonates in the orchard around it.", lore: "The orchard grows histories slowly enough that stone mistakes them for minerals.", utility: "A sanctuary guardian that reveals fossils, braces cave rooms, and tunes ancient cisterns.", discoveryHint: "Rewater the porous orchard floor and return its spiral fossils without mining the living shell.", colors: [0x7c715b, 0xb4a26d, 0x8ed7c2],
  }),
  "handtail-ahuizotl": mythicMob("handtail-ahuizotl", {
    name: "Handtail Ahuizotl", temperament: "Skittish", health: 280, damage: 12, speed: 1.12, radius: .96, height: 1.02, footOffset: .38,
    habitat: "The Lanternroot Cistern between Rootweave Grotto and Glasswater", active: "Rising cistern currents", family: "legendary", movement: "amphibious", aquatic: true, food: Item.RawFish,
    behavior: "A sleek canal beast uses the dexterous hand at its tail to return keepsakes, pull rescue ropes, and redirect dangerous backwash.", lore: "Stories blame the hand for drownings because stories rarely ask what the hand was trying to retrieve.", utility: "A trusted rescue companion that fetches dropped items and hauls swimmers from currents.", discoveryHint: "Return the stolen keepsakes to their dry niches and let the Ahuizotl choose the final one.", colors: [0x314d53, 0x77998b, 0xe0cb78],
  }),
  "tideclock-cetus": mythicMob("tideclock-cetus", {
    name: "Tideclock Cetus", temperament: "Gentle", health: 510, damage: 18, speed: .62, radius: 2.25, height: 1.5, footOffset: .72,
    habitat: "The Tideclock Wreck across Brightwater Shelf and the Abyssal Shelf", active: "Long currents and turning wreck bells", family: "legendary", movement: "aquatic", aquatic: true, rideable: true, food: Item.RawFish,
    behavior: "A plated cetacean turns a brass tideclock in its ribs and rolls wrecks upright with a slow sounding call.", lore: "Its clock never tells the hour. It measures how long a lost thing has been willing to be found.", utility: "A two-seat deep-water carrier that detects wrecks and grants a bounded slipstream.", discoveryHint: "Reset the wreck's four tide gears and follow the long current without harvesting the memorial cargo.", colors: [0x315d72, 0x9b8c66, 0xa7efe1],
  }),
  "anemoi-gryphon": mythicMob("anemoi-gryphon", {
    name: "Anemoi Gryphon", temperament: "Defensive", health: 430, damage: 21, speed: 1.34, radius: 1.42, height: 1.78, footOffset: .98,
    habitat: "The Palace of Nine Winds above Cloudreed Glen and the Highlands", active: "When all nine palace drafts are open", family: "legendary", movement: "flying", flying: true, rideable: true, food: Item.RawMeat,
    behavior: "A crown-maned gryphon rides crosswinds between nine open courts and attacks only after announcing a full palace circuit.", lore: "Each wind claims to be the first. The gryphon has heard all nine arguments and is impressed by none.", utility: "An apex two-seat flying mount with crosswind shielding and controlled vertical rescue.", discoveryHint: "Open all nine wind shutters, climb the palace ascent, and complete its circuit without shortcuts.", colors: [0x74684d, 0xd8c38c, 0x9ce5ea],
  }),
  "sable-gorgon": mythicMob("sable-gorgon", {
    name: "Sable Gorgon", temperament: "Hostile", hostile: true, health: 465, damage: 19, speed: .55, radius: 1.48, height: 1.62, footOffset: .32,
    habitat: "The Gorgon Quarry descending from Badlands and Desert into Crystaldeep", active: "After quarry mirrors are aligned", family: "legendary", movement: "ground", food: Item.MirrorstoneItem,
    behavior: "A black-stone bull with mirrored serpent mane charges through false quarry walls, cocooning rather than killing workers caught in its gaze.", lore: "Petrification is the quarry's word for preservation. The Gorgon has never agreed that stillness and death are the same.", utility: "A capturable apex guardian that raises temporary stone cover and reverses one petrifying effect.", discoveryHint: "Align the merciful mirrors, free every stone cocoon, and turn its final charge back into the empty wall.", colors: [0x34353a, 0x756a68, 0xcad7cf],
  }),
  "namarra-makara": mythicMob("namarra-makara", {
    name: "Namarra Makara", temperament: "Defensive", health: 490, damage: 19, speed: .78, radius: 1.72, height: 1.6, footOffset: .52,
    habitat: "The Sunken Court of Namarra in Lumen Trench and Deep Ocean", active: "Pearl audiences and restored air gardens", family: "legendary", movement: "aquatic", aquatic: true, rideable: true, food: Item.LivingCoral,
    behavior: "A regal elephant-crocodile sea guardian rolls through flooded courts, carrying pearl regalia and opening sealed air gardens for worthy guests.", lore: "Namarra sank by choice when its rulers mistook height for dignity. The Makara has kept the better parts of court below.", utility: "A covenant court mount that grants rider breathing, pressure safety, and pearl-current commands.", discoveryHint: "Restore both air gardens and conduct the court audience without looting sealed memorials.", colors: [0x356f76, 0xc3a96e, 0xd9fff1],
  }),
  "ashen-salamander-king": mythicMob("ashen-salamander-king", {
    name: "Ashen Salamander King", temperament: "Hostile", hostile: true, health: 445, damage: 22, speed: .64, radius: 1.45, height: 1.28, footOffset: .28,
    habitat: "The Ashen Library of Salamander Kings in Ember Wastes and Emberdeep", active: "When memory kilns are relit", family: "legendary", movement: "amphibious", aquatic: true, food: Item.SulfurGrowthItem,
    behavior: "A crowned furnace-salamander lashes with a kiln tail and changes the heat of archive tablets to reveal or erase royal memory.", lore: "Every king burned the previous king's account. The library survived by learning to write in temperature.", utility: "A capturable apex creature that heats forges, reveals thermal text, and tempers crafted gear.", discoveryHint: "Recover the seven temperature tablets and relight the chimney without burning the archive stacks.", colors: [0x4a3430, 0xb84f35, 0xffc767],
  }),
  "mycelial-oneirophant": mythicMob("mycelial-oneirophant", {
    name: "Mycelial Oneirophant", temperament: "Gentle", health: 520, damage: 13, speed: .34, radius: 1.9, height: 2.25, footOffset: .4,
    habitat: "The Hollow Moon Menagerie between Mooncap Hollow and Starbloom Gallery", active: "Dormant dream cycles and restored memory ponds", family: "legendary", movement: "ground", rideable: true, food: Item.Dreamcap,
    behavior: "A colossal fungal elephant walks remembered habitats into being, unfurling moonfelt fans only around the menagerie's living pond.", lore: "It does not dream of places it has visited. Places become capable of dreaming after it remembers them.", utility: "A covenant sanctuary mount that recreates bounded habitat echoes and calms nearby wildlife.", discoveryHint: "Repair all six habitat loops, refill the memory pond, and follow the remembered path without waking dormant tunnels.", colors: [0x554d67, 0x8fa66d, 0xd9c6f3],
  }),
};

function summonedMob(kind: SummonedCreatureKind, seed: LivingRosterSeed): MobDefinition {
  const base = livingRosterMob(kind as unknown as LivingRosterKind, seed);
  return { ...base, kind, family: "summon", persistent: true, breedable: false, foodLure: false };
}

export const SUMMONED_CREATURE_MOBS: Record<SummonedCreatureKind, MobDefinition> = {
  asterjaw: summonedMob("asterjaw", {
    name: "Asterjaw", temperament: "Defensive", health: 68, damage: 10, speed: 1.08, radius: .68, height: 1.1, footOffset: .8092,
    habitat: "The Unwalked Meridian", active: "For 75 seconds, or permanently after a valid Worldpin grounding", family: "summon", movement: "ground", food: Item.CloudglassRelic,
    behavior: "A long-legged hound of dark blue night is jointed by brass compass stars; a moving route constellation turns inside its open ribcage.",
    lore: "It follows roads that were planned, dreamed, or abandoned, where distance obeys intention before geometry.", utility: "Tracks, rescues, crosses one bounded obstacle, and returns along a visible Homeward Arc.",
    discoveryHint: "Learn Call Asterjaw from the Hearthroad League and cast its stable contract.", colors: [0x172642, 0xc7a65d, 0x8ad7e4],
  }),
  "vellum-warden": summonedMob("vellum-warden", {
    name: "Vellum Warden", temperament: "Defensive", health: 82, damage: 8, speed: .52, radius: .72, height: 1.85, footOffset: .22,
    habitat: "The Palimpsest Expanse", active: "For 90 seconds, or permanently after a valid Worldpin grounding", family: "summon", movement: "ground", food: Item.BoundBook,
    behavior: "A tall folded guardian layers moving paper plates over living-ink joints; its lantern head contains an unwritten page that brightens before a redline interrupt.",
    lore: "Every erased sentence becomes terrain in its home realm, and every repeated action leaves a margin note.", utility: "Guards allies, interrupts repeated moves, answers one mapped non-legendary technique, and clears one debuff.",
    discoveryHint: "Recover Fold Vellum Warden from a Moonbough Palimpsest lesson.", colors: [0xd7c9a8, 0x3f3549, 0xe8a55e],
  }),
  "choir-of-one": summonedMob("choir-of-one", {
    name: "Choir-of-One", temperament: "Defensive", health: 58, damage: 9, speed: .78, radius: .64, height: 1.35, footOffset: .88,
    habitat: "The Hush Between Bells", active: "For 55 seconds, or permanently after a valid Worldpin grounding", family: "summon", movement: "flying", flying: true, food: Item.WhisperglassItem,
    behavior: "A floating dark mantle surrounds one silver throat-ring; several implied faces exist only for the instant in which the being permits a sound.",
    lore: "Its realm is the interval after a bell moves but before sound is allowed to exist, where declarations arrive before actions.", utility: "Creates Hush zones, stores sound for an Echo reply, repositions when targeted, and interrupts one long windup.",
    discoveryHint: "Learn Invoke Choir-of-One only after demonstrating silence without cruelty.", colors: [0x20202c, 0xbcc3cf, 0x6f9eaa],
  }),
  "glasswake-stag": summonedMob("glasswake-stag", {
    name: "Glasswake Stag", temperament: "Gentle", health: 72, damage: 9, speed: .94, radius: .78, height: 1.48, footOffset: .72,
    habitat: "The Sea Behind Mirrors", active: "For 65 seconds, or permanently after a valid Worldpin grounding", family: "summon", movement: "amphibious", aquatic: true, rideable: true, food: Item.MirrorstoneItem,
    behavior: "A translucent stag contains a sideways ocean; branching antlers split incoming light into moving shorelines and leave a second wake in air.",
    lore: "Its tides flow toward remembered observers in an ocean visible in every reflection and absent behind the glass.", utility: "Bends ordinary projectiles, leaves a decoy reflection, and creates a brief directed rescue path through air or water.",
    discoveryHint: "Recover Open Glasswake beside still water and cast while your reflection remains unbroken.", colors: [0x8fcfd0, 0x5e7db0, 0xe3f5ef],
  }),
};

export const MOB_DEFS: Record<MobKind, MobDefinition> = {
  ...MORROW_MOB_DEFS,
  ...V1_SENTIENT_MOBS,
  ...V1_CREATURE_MOBS,
  ...LIVING_ROSTER_MOBS,
  ...LEGENDARY_CREATURE_MOBS,
  ...SUMMONED_CREATURE_MOBS,
  "grotto-grazer": {
    kind: "grotto-grazer", name: "Grotto Grazer", temperament: "Gentle", hostile: false,
    health: 18, damage: 2, xp: 5, speed: 0.58, chaseSpeed: 2.15, turnRate: 5.6, attackRange: 1.1,
    footOffset: 0.69, radius: 0.67, height: 1.22, habitat: "Rootweave Grotto clearings and Pillarstone lichen shelves", active: "All hours in dim ecological centers",
    behavior: "Browses luminous root tips in small family groups, braces its broad feet on steep shelves, and follows old Stone Roads between feeding rooms.",
    lore: "Delvers once mistook their root-draped backs for walking gardens. The oldest carry seedlings from caverns no map remembers.",
    colors: [0x4f6d48, 0xa78958, 0xb8f08f], drops: [{ item: Item.Fiber, min: 2, max: 5, chance: 0.9 }, { item: Item.GlowRoot, min: 1, max: 2, chance: 0.35 }],
    family: "underground", movement: "ground", breedable: true, breedingFoods: [Item.GlowRoot], diet: [Item.GlowRoot, Item.Fiber], captureItem: Item.CaptureOrb,
    utility: "A renewable source of fiber and occasional Glowroot when carefully bred.", discoveryHint: "Look for paired hoofprints where living roots meet old stone roads.",
    fieldNotes: [
      { id: "browse", title: "Root Browsing", text: "Its split lips trim luminous roots without killing the parent knot.", hint: "Observe one feeding.", requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "herd", title: "Cavern Herd", text: "Family groups rotate between feeding rooms and leave the center fallow before returning.", hint: "Capture two specimens.", requires: [{ metric: "captures", atLeast: 2 }] },
      { id: "seedback", title: "Seedback", text: "A bred Grazer may carry viable grotto spores between distant ecological centers.", hint: "Record a successful breeding.", requires: [{ metric: "breeds", atLeast: 1 }] },
    ],
  },
  lanternray: {
    kind: "lanternray", name: "Lanternray", temperament: "Skittish", hostile: false,
    health: 11, damage: 0, xp: 5, speed: 1.18, chaseSpeed: 3.7, turnRate: 4.2, attackRange: 0,
    footOffset: 0.36, radius: 0.78, height: 0.32, habitat: "Starbloom Hollows light gardens and broad Glasswater Deeps ceilings", active: "Darkness near ecological light gardens",
    behavior: "Pulses its paired lantern organs in slow conversation, banks around crystal outcrops, and dives when sudden light breaks the water.",
    lore: "A school seen from a high ledge resembles a second night sky moving under glass.",
    colors: [0x315e6c, 0x62d7c9, 0xd8fff4], drops: [{ item: Item.GlowScale, min: 1, max: 2, chance: 0.38 }],
    family: "underground", movement: "flying", flying: true, breedable: true, breedingFoods: [Item.LumenKelpFrond], diet: [Item.LumenKelpFrond], captureItem: Item.CaptureOrb,
    utility: "Its shed Glow Scales illuminate aquariums without consuming the animal.", discoveryHint: "Search the ceiling reflection of a large subterranean lake for moving turquoise stars.",
    fieldNotes: [
      { id: "signals", title: "Lantern Speech", text: "Paired light organs pulse in alternating patterns that keep a school together in total darkness.", hint: "Watch a school without approaching.", requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "roost", title: "Inverted Rest", text: "A resting Lanternray grips mineral ceilings and dims until it resembles a wet crystal seam.", hint: "Capture one for close study.", requires: [{ metric: "captures", atLeast: 1 }] },
    ],
  },
  "prismtail-swift": {
    kind: "prismtail-swift", name: "Prismtail Swift", temperament: "Skittish", hostile: false,
    health: 8, damage: 0, xp: 5, speed: 1.62, chaseSpeed: 4.2, turnRate: 9.2, attackRange: 0,
    footOffset: 1.05, radius: 0.34, height: 0.44, habitat: "Crystaldeep Gallery vaults with long uninterrupted flight lanes", active: "During resonant crystal pulses",
    behavior: "Threads crystal needles at speed and fans a segmented tail to scatter its silhouette into several colored afterimages.",
    lore: "Miners learned to stop swinging when a Prismtail flock falls silent; the birds hear stressed stone before it breaks.",
    colors: [0x4e5eaa, 0x8be6df, 0xffd98b], drops: [{ item: Item.Feather, min: 1, max: 2, chance: 0.42 }],
    family: "underground", movement: "flying", flying: true, breedable: true, breedingFoods: [Item.CrystalShard], diet: [Item.CrystalShard], captureItem: Item.CaptureOrb,
    utility: "A living warning for unstable Crystaldeep galleries.", discoveryHint: "Wait quietly beside Resonant Crystal until a rainbow tail crosses its reflection.",
    fieldNotes: [
      { id: "stress-call", title: "Stress Call", text: "The flock falls silent seconds before a strained crystal face fractures.", hint: "Record a flock in Crystaldeep.", requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "prism-tail", title: "Prism Tail", text: "Its segmented tail bends cave light into misleading afterimages without producing light itself.", hint: "Capture two specimens.", requires: [{ metric: "captures", atLeast: 2 }] },
    ],
  },
  "glassback-newt": {
    kind: "glassback-newt", name: "Glassback Newt", temperament: "Gentle", hostile: false,
    health: 7, damage: 0, xp: 3, speed: 0.38, chaseSpeed: 1.45, turnRate: 5.3, attackRange: 0,
    footOffset: 0.24, radius: 0.34, height: 0.22, habitat: "Shallow Glasswater shelves, egg-reed beds and dripping limestone margins", active: "All hours near water",
    behavior: "Walks between flooded and exposed shelves, holds air beneath its translucent dorsal plates, and tends clusters of Egg Reeds.",
    lore: "Its clear back is not fragile glass but layered mineral cartilage grown from the water it inhabits.",
    colors: [0x456a66, 0xa3d8c7, 0xe7fff0], drops: [{ item: Item.CaveGel, min: 1, max: 2, chance: 0.32 }],
    family: "underground", movement: "amphibious", aquatic: true, bottomDweller: true, breedable: true, breedingFoods: [Item.CaveGel], diet: [Item.CaveGel, Item.LumenKelpFrond], captureItem: Item.CaptureOrb,
    utility: "Keeps placed Egg Reed beds healthy in connected aquariums.", discoveryHint: "Inspect mineral shelves just above Glasswater pools for a moving transparent ridge.",
    fieldNotes: [
      { id: "reed-tender", title: "Reed Tender", text: "Adults remove algae from Egg Reeds and drive cavefilaments away from new clutches.", hint: "Observe one beside Egg Reeds.", requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "mineral-back", title: "Mineral Back", text: "Its clear dorsal plates incorporate the trace minerals of its home pool.", hint: "Breed a healthy pair.", requires: [{ metric: "breeds", atLeast: 1 }] },
    ],
  },
  "sailfin-skimmer": {
    kind: "sailfin-skimmer", name: "Sailfin Skimmer", temperament: "Skittish", hostile: false,
    health: 9, damage: 1, xp: 4, speed: 1.36, chaseSpeed: 3.9, turnRate: 7.8, attackRange: 0.8,
    footOffset: 0.4, radius: 0.48, height: 0.42, habitat: "Glasswater rivers, flooded Stone Roads and mineral-dam spillways", active: "Where cave currents run",
    behavior: "Raises a broad dorsal sail into the current, vaults low shelves, and skims the water surface in bursts to escape predators.",
    lore: "Its fin records the chemistry of every pool crossed as a band of color, giving old skimmers the look of living maps.",
    colors: [0x35677a, 0xe1a95b, 0xa7f7ea], drops: [{ item: Item.RawFish, min: 1, max: 2, chance: 0.75 }],
    family: "underground", movement: "flying", flying: true, aquatic: true, breedable: true, breedingFoods: [Item.LumenKelpFrond], diet: [Item.LumenKelpFrond], captureItem: Item.CaptureOrb,
    utility: "Its patterned sail can indicate mineral-rich water routes.", discoveryHint: "Follow a moving cave current until a copper sail breaks the surface.",
    fieldNotes: [
      { id: "water-map", title: "Water Map", text: "Each colored band in the sail corresponds to a distinct mineral basin crossed during growth.", hint: "Inspect one from a second pool.", requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "island-nest", title: "Island Nest", text: "Pairs carry luminous algae onto dry islands, making a low beacon around their eggs.", hint: "Breed a pair.", requires: [{ metric: "breeds", atLeast: 1 }] },
    ],
  },
  "ashnose-bat": {
    kind: "ashnose-bat", name: "Ashnose Bat", temperament: "Defensive", hostile: false,
    health: 8, damage: 2, xp: 4, speed: 1.28, chaseSpeed: 3.5, turnRate: 8.6, attackRange: 1.15,
    footOffset: 0.9, radius: 0.38, height: 0.36, habitat: "Dark ordinary tunnels bordering Pillarstone and Emberdeep", active: "Darkness",
    behavior: "Dusts its heat-sensitive nose through the air, hangs in small roosts, and mob-dives anything that disturbs a nursery ledge.",
    lore: "Ashnose colonies redraw their route every night as fumaroles open and close. Their guano is prized because it remembers those minerals.",
    colors: [0x4c4545, 0x91715d, 0xf0ad65], drops: [{ item: Item.GuanoItem, min: 1, max: 3, chance: 0.72 }],
    family: "underground", movement: "flying", flying: true, breedable: true, breedingFoods: [Item.CaveGel], diet: [Item.CaveGel], captureItem: Item.CaptureOrb,
    utility: "Produces mineral-rich guano suitable for future cave agriculture.", discoveryHint: "Watch for warm dust motes leaving an otherwise dark side tunnel.",
    fieldNotes: [
      { id: "heat-nose", title: "Heat Nose", text: "A folded membrane above the nostrils detects warm fumarole drafts beyond solid-looking cracks.", hint: "Find an active colony.", requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "nursery", title: "Nursery Roost", text: "Adults form a defensive screen below nursery ledges instead of abandoning their young.", hint: "Capture a colony member.", requires: [{ metric: "captures", atLeast: 1 }] },
    ],
  },
  chimewing: {
    kind: "chimewing", name: "Chimewing", temperament: "Gentle", hostile: false,
    health: 9, damage: 0, xp: 5, speed: 1.05, chaseSpeed: 3.15, turnRate: 7.1, attackRange: 0,
    footOffset: 0.96, radius: 0.42, height: 0.48, habitat: "Starbloom Hollows and the quiet margins of Crystaldeep Gallery", active: "Sporefall and crystal resonance",
    behavior: "Strikes hollow mineral vanes on its wings during turns, answering nearby flockmates with soft intervals instead of calls.",
    lore: "Lost delvers sometimes follow a Chimewing cadence to an ecological center. Sometimes the cadence follows them first.",
    colors: [0x67558c, 0x88d9c4, 0xffe7a1], drops: [{ item: Item.Feather, min: 1, max: 2, chance: 0.38 }, { item: Item.GlowDust, min: 1, max: 1, chance: 0.18 }],
    family: "underground", movement: "flying", flying: true, breedable: true, breedingFoods: [Item.GlowDust], diet: [Item.GlowDust, Item.CaveGel], captureItem: Item.CaptureOrb,
    utility: "Its interval changes near large open rooms, making it a natural cavern finder.", discoveryHint: "Listen for two glassy notes answering each other beyond a Starbloom passage.",
    fieldNotes: [
      { id: "interval", title: "Measured Interval", text: "The delay between two wing notes lengthens with the volume of the chamber around it.", hint: "Observe one in flight.", requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "route-song", title: "Route Song", text: "Flocks repeat a stable sequence when migrating between Starbloom gardens and Crystaldeep roosts.", hint: "Capture two flockmates.", requires: [{ metric: "captures", atLeast: 2 }] },
    ],
  },
  "cinder-kite": {
    kind: "cinder-kite", name: "Cinder Kite", temperament: "Defensive", hostile: true,
    health: 22, damage: 5, xp: 12, speed: 1.2, chaseSpeed: 3.65, turnRate: 6.2, attackRange: 1.7,
    footOffset: 1.14, radius: 0.72, height: 0.54, habitat: "Emberdeep Fumarole thermals above lava pockets and abandoned vent forges", active: "Fumarole surges",
    behavior: "Rides columns of hot gas without flapping, folds into a hooked dive, and shakes burning mineral dust from its tail when cornered.",
    lore: "Cinder Kites nest where stone is still deciding whether to melt. Dwarven ventwrights read their circling height as a pressure gauge.",
    colors: [0x5a342e, 0xd56b3f, 0xffd170], drops: [{ item: Item.SulfurGrowthItem, min: 1, max: 3, chance: 0.68 }, { item: Item.GlowDust, min: 1, max: 2, chance: 0.28 }],
    family: "underground", movement: "flying", flying: true, captureItem: Item.CaptureOrb,
    utility: "Its flight height forecasts dangerous fumarole pressure.", discoveryHint: "Find a wide thermal column above orange-cracked stone and look up before crossing.",
    fieldNotes: [
      { id: "pressure", title: "Pressure Gauge", text: "A Kite climbs higher and circles tighter as pressure builds beneath its chosen vent.", hint: "Survive an encounter near a vent.", requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "mineral-nest", title: "Mineral Nest", text: "Its nest is fused from sulfur needles and heat-cracked stone rather than gathered brush.", hint: "Defeat a territorial adult.", requires: [{ metric: "kills", atLeast: 1 }] },
    ],
  },
  "embercarapace-beetle": {
    kind: "embercarapace-beetle", name: "Embercarapace Beetle", temperament: "Defensive", hostile: true,
    health: 20, damage: 4, xp: 10, speed: 0.72, chaseSpeed: 2.8, turnRate: 5.9, attackRange: 1.22,
    footOffset: 0.42, radius: 0.54, height: 0.74, habitat: "Emberdeep Fumarole basalt shelves and the dark tunnels immediately beyond their glow", active: "Fumarole surges and the cooling hours after them",
    behavior: "Searches ash with paired stepped antennae, braces on six plated legs, and vents stored heat through its orange abdomen before a short territorial shoulder-charge.",
    lore: "Its black wing-cases insulate a living furnace. Dwarven ventwrights call a retreat when a whole colony turns its glowing abdomens toward the same wall.",
    colors: [0x182124, 0x9d3122, 0xff9a2e], drops: [{ item: Item.SulfurGrowthItem, min: 1, max: 2, chance: 0.62 }, { item: Item.GlowDust, min: 1, max: 2, chance: 0.24 }],
    family: "underground", movement: "ground", breedable: true, breedingFoods: [Item.SulfurGrowthItem], diet: [Item.SulfurGrowthItem, Item.CaveGel], captureItem: Item.CaptureOrb,
    utility: "A bonded colony gives an early warning before dangerous Emberdeep pressure surges and sheds useful sulfur growths without mining a vent.", discoveryHint: "Follow paired six-foot tracks from a cooling fumarole into the first dark side passage.",
    fieldNotes: [
      { id: "tripod-gait", title: "Tripod Gait", text: "Three feet remain planted while the opposing three advance, keeping the heavy shell stable on fractured basalt.", hint: "Watch one cross uneven stone without provoking it.", requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "heat-warning", title: "Heat Warning", text: "The abdominal bands brighten in sequence before the beetle vents or charges; the same sequence precedes nearby pressure shifts.", hint: "Record more than one territorial warning.", requires: [{ metric: "seen", atLeast: 2 }] },
      { id: "vent-colony", title: "Vent Colony", text: "A settled group rotates between warm stone and darkness so that no individual furnace overheats.", hint: "Capture two colony members for close study.", requires: [{ metric: "captures", atLeast: 2 }] },
    ],
  },
  veinling: {
    kind: "veinling", name: "Veinling", temperament: "Defensive", hostile: true,
    health: 28, damage: 6, xp: 16, speed: 0.52, chaseSpeed: 2.5, turnRate: 4.5, attackRange: 1.45,
    footOffset: 0.82, radius: 0.56, height: 0.82, habitat: "Rare Living Veins crossing Crystaldeep and forgotten Stone Roads", active: "When nearby ore is disturbed",
    behavior: "Unfolds from a seam on four jointed limbs, gathers loose metallic flakes into its shell, and settles back into the wall after danger passes.",
    lore: "No agreement exists on whether a Veinling is born, built, grown or merely noticed. Its behavior supports every theory and proves none.",
    colors: [0x526963, 0x8fb4a5, 0xd8ffe8], drops: [{ item: Item.VeinmetalFlake, min: 1, max: 3, chance: 0.82 }, { item: Item.LivingNode, min: 1, max: 1, chance: 0.08 }],
    family: "underground", movement: "ground", captureItem: Item.CaptureOrb,
    utility: "A renewable but dangerous clue to Veinmetal behavior; its exact nature remains unresolved.", discoveryHint: "Mine near a pulsing seam, then wait for the wall to move on its own.",
    fieldNotes: [
      { id: "unfolding", title: "Unfolding", text: "The apparent ore seam keeps the same mass when it unfolds into limbs.", hint: "Witness one at close range.", requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "response", title: "Disturbance Response", text: "It wakes in response to extraction but does not consistently defend every nearby vein.", hint: "Survive and defeat one.", requires: [{ metric: "kills", atLeast: 1 }] },
      { id: "unresolved", title: "Nature Unresolved", text: "Biological, magical and mechanical tests all return partial, contradictory results.", hint: "Capture a living specimen.", requires: [{ metric: "captures", atLeast: 1 }] },
    ],
  },
  "auric-scarab": {
    kind: "auric-scarab", name: "Auric Scarab", temperament: "Defensive", hostile: true,
    health: 16, damage: 3, xp: 8, speed: 0.84, chaseSpeed: 2.65, turnRate: 6.8, attackRange: 1.35,
    footOffset: 0.499342, radius: 0.48, height: 0.62, habitat: "Buried caravans, brass ruins and starfall rubble", active: "Dusk and underground",
    behavior: "Fans six plated legs around treasure, flashes its crystal wing-cases as a warning, then shoulder-checks intruders in short committed bursts.",
    lore: "Each scarab plates itself with the first precious metal it finds. Old prospectors listen for the soft click of a whole fortune walking away.",
    colors: [0xb98932, 0x4e3422, 0x8ff4e8],
    drops: [{ item: Item.GoldIngot, min: 1, max: 2, chance: 0.22 }, { item: Item.CrystalShard, min: 1, max: 2, chance: 0.58 }],
    family: "surface", movement: "ground", persistent: true, discoveryHint: "Search for tiny paired tracks circling old treasure sites.",
    utility: "Its prismatic carapace is a dependable source of Star Crystal.",
  },
  rootwrithe: {
    kind: "rootwrithe", name: "Rootwrithe", temperament: "Defensive", hostile: true,
    health: 24, damage: 4, xp: 11, speed: 0.58, chaseSpeed: 2.25, turnRate: 5.4, attackRange: 1.7,
    footOffset: 0.650795, radius: 0.66, height: 1.38, habitat: "Ancient gardens and the Rootbound Labyrinth", active: "Shade and rain",
    behavior: "Holds perfectly still as a root bollard until disturbed, then braces on four hooked roots and lashes at the edge of melee range.",
    lore: "The first labyrinth gardeners did not build doors. They taught the hedges to remember who belonged inside.",
    colors: [0x4c6339, 0x9bc36d, 0xffcf71],
    drops: [{ item: Item.Fiber, min: 3, max: 7, chance: 1 }, { item: Item.GlowRoot, min: 1, max: 3, chance: 0.55 }],
    family: "surface", movement: "ground", persistent: true, discoveryHint: "Look for root posts with two amber eyes in old medicinal gardens.",
    utility: "Drops unusually long fibers and mature Glowroot knots.",
  },
  "bellroot-matron": {
    kind: "bellroot-matron", name: "Bellroot Matron", temperament: "Defensive", hostile: true,
    health: 64, damage: 8, xp: 28, speed: 0.38, chaseSpeed: 1.85, turnRate: 3.6, attackRange: 2.15,
    footOffset: 0.702449, radius: 1.05, height: 2.72, habitat: "Sacred amphitheaters and Bloomrot altar gardens", active: "Rain and moonlight",
    behavior: "Rings the lantern bell in its crown to rally nearby roots, then sweeps three heavy vine-arms through a broad defensive arc.",
    lore: "A Matron grows around every promise a grove refuses to forget. Its bell is a seedpod, a warning and a funeral hymn at once.",
    colors: [0x405c36, 0xb79a58, 0xffe18a],
    drops: [{ item: Item.Moonpetal, min: 2, max: 5, chance: 1 }, { item: Item.GlowDust, min: 3, max: 8, chance: 0.82 }, { item: Item.RoyalJelly, min: 1, max: 1, chance: 0.12 }],
    family: "surface", movement: "ground", persistent: true, discoveryHint: "A deep wooden bell note marks guarded old stages and cathedral gardens.",
    utility: "A rare source of Moonpetals and concentrated Glow Dust.",
  },
  vaultwing: {
    kind: "vaultwing", name: "Vaultwing", temperament: "Hostile", hostile: true,
    health: 13, damage: 3, xp: 8, speed: 1.5, chaseSpeed: 3.45, turnRate: 8.8, attackRange: 1.65,
    footOffset: 1.35, radius: 0.52, height: 0.72, habitat: "Observatory domes, lighthouse crowns and sealed galleries", active: "Darkness",
    behavior: "Uses shallow banking turns and ceiling-clear approach lanes, folds its four-point wings before a dive, and retreats upward after each bite.",
    lore: "Its translucent ears map rooms by starlight. A whole roost can memorize a corridor without ever touching its walls.",
    colors: [0x403657, 0x8b72ad, 0xc9fff4],
    drops: [{ item: Item.Feather, min: 1, max: 2, chance: 0.66 }, { item: Item.ShadowShard, min: 1, max: 2, chance: 0.4 }],
    family: "surface", movement: "flying", flying: true, persistent: true, discoveryHint: "Watch broken domes for four-point silhouettes crossing the stars.",
    utility: "Its whisper-light membrane is collected as Bright Feather and Shadow Shard.",
  },
  "cinder-maw": {
    kind: "cinder-maw", name: "Cinder Maw", temperament: "Hostile", hostile: true,
    health: 30, damage: 6, xp: 14, speed: 0.92, chaseSpeed: 3.35, turnRate: 5.8, attackRange: 1.75,
    footOffset: 0.68, radius: 0.72, height: 1.18, habitat: "Emberwatch ruins, foundry vents and storm gates", active: "Night and volcanic heat",
    behavior: "Hunts in staggered pairs, vents sparks through basalt shoulder plates, and snaps from just beyond the victim's reach instead of crowding their feet.",
    lore: "Foundry keepers once used their heat to restart cold furnaces. The furnaces are cold now; the hounds are not.",
    colors: [0x442d2a, 0x9b3f2c, 0xffad4f],
    drops: [{ item: Item.RawMeat, min: 2, max: 4, chance: 1 }, { item: Item.Coal, min: 2, max: 5, chance: 0.78 }, { item: Item.GlowDust, min: 1, max: 3, chance: 0.38 }],
    family: "surface", movement: "ground", persistent: true, discoveryHint: "Fresh black pawprints around warm ruins still hold tiny sparks.",
    utility: "A dangerous but reliable source of coal in authored ruins.",
  },
  "ossuary-keeper": {
    kind: "ossuary-keeper", name: "Ossuary Keeper", temperament: "Hostile", hostile: true,
    health: 48, damage: 8, xp: 24, speed: 0.55, chaseSpeed: 2.2, turnRate: 4.4, attackRange: 2.05,
    footOffset: 0.52, radius: 0.76, height: 2.24, habitat: "Master-vaults, colossus ruins and observatory crowns", active: "When treasure is approached",
    behavior: "Raises a layered tomb-shield, advances in measured half-steps and attacks with a long crystal keyblade without overlapping its target.",
    lore: "No one remembers the keepers' makers. Every one still carries a key, and every key fits a door that no longer exists.",
    colors: [0xc7bfaa, 0x59636a, 0x74f0df],
    drops: [{ item: Item.BoneShard, min: 4, max: 9, chance: 1 }, { item: Item.CrystalShard, min: 2, max: 5, chance: 0.74 }, { item: Item.GoldIngot, min: 1, max: 3, chance: 0.32 }],
    family: "construct", movement: "ground", persistent: true, discoveryHint: "Vault floors bear pairs of square footprints and a dragged key line.",
    utility: "A difficult source of bone, crystal and occasional recovered gold.",
  },
  "mossback-kite": {
    kind: "mossback-kite", name: "Mossback Kite", temperament: "Skittish", hostile: false,
    health: 10, damage: 1, xp: 7, speed: 1.75, chaseSpeed: 3.8, turnRate: 9.2, attackRange: 1.25,
    footOffset: 1.55, radius: 0.68, height: 0.78, habitat: "Whistlekite Roosts above meadows, savannas and highland passes", active: "Daylight and strong wind",
    behavior: "Reads the lee side of trunks before banking, rides broad thermal circles above its roost, and folds its ribbon tail into a brake before landing on a clear stone perch.",
    lore: "Roost keepers say a Mossback Kite grows one new patch of moss for every road it learns from the air.",
    colors: [0x4e6c48, 0xc5a65b, 0xd7fff0],
    drops: [{ item: Item.WindSilk, min: 1, max: 2, chance: 0.72 }, { item: Item.Feather, min: 1, max: 3, chance: 0.86 }],
    family: "bird", movement: "flying", flying: true, persistent: true, tameable: true, tameItems: [Item.Moonpetal],
    breedable: true, breedingFoods: [Item.Moonpetal, Item.Berry], diet: [Item.Moonpetal, Item.Berry], captureItem: Item.CaptureOrb,
    postTameNotes: "A bonded kite scouts in wider circles but returns to a clear perch beside its keeper.",
    discoveryHint: "Listen for canvas-like wingbeats around high stone nests ringed by wind harps.", utility: "Wind Silk is light, strong and useful in advanced textiles.",
  },
  "clockwork-marmot": {
    kind: "clockwork-marmot", name: "Clockwork Marmot", temperament: "Gentle", hostile: false,
    health: 14, damage: 2, xp: 8, speed: 0.64, chaseSpeed: 2.3, turnRate: 6.4, attackRange: 1.2,
    footOffset: 0.57, radius: 0.56, height: 0.88, habitat: "Warm machinery hollows and collapsed survey engines in cold highlands", active: "Morning and late afternoon",
    behavior: "Lives in ticking colonies, sorts loose fasteners into careful rings, and whistles through its back-pipes when a nearby machine falls out of rhythm.",
    lore: "No Dwarf admits to inventing them. Every Dwarf admits they keep better time than the depot clocks.",
    colors: [0x8a6345, 0xc69b56, 0x72e2d7],
    drops: [{ item: Item.ClockworkSpring, min: 1, max: 2, chance: 0.82 }, { item: Item.GearCluster, min: 1, max: 1, chance: 0.18 }],
    family: "construct", movement: "ground", persistent: true, tameable: true, tameItems: [Item.GearCluster],
    breedable: true, breedingFoods: [Item.ClockworkSpring], diet: [Item.GearCluster, Item.ClockworkSpring], captureItem: Item.CaptureOrb, foodLure: true,
    postTameNotes: "A tuned marmot can be ordered to sit or follow and chirps when ore-bearing machinery is nearby.",
    discoveryHint: "Follow soft whistles and perfectly sorted bolts to a warm brass porthole.", utility: "Clockwork Springs are useful in compact mechanisms and trade well with Dwarven gearwrights.",
  },
  "inkmaw-curator": {
    kind: "inkmaw-curator", name: "Inkmaw Curator", temperament: "Hostile", hostile: true,
    health: 92, damage: 11, xp: 46, speed: 0.48, chaseSpeed: 2.1, turnRate: 4.6, attackRange: 2.8,
    footOffset: 0.721665, radius: 1.1, height: 2.82, habitat: "The Last Folio at the bottom of a Palimpsest Vault", active: "Whenever an archive seal is broken",
    behavior: "Walks on four ink-tipped quills, shields its book-mask behind orbiting pages, and lashes in broad calligraphic arcs before driving a long nib into distant intruders.",
    lore: "It was instructed to preserve every true version of the archive. When two histories disagreed, it learned to erase the reader.",
    colors: [0x2f2146, 0x8d657d, 0x72f0d5],
    drops: [{ item: Item.LivingInk, min: 3, max: 7, chance: 1 }, { item: Item.BoundBook, min: 1, max: 3, chance: 0.9 }, { item: Item.ShadowShard, min: 2, max: 5, chance: 0.76 }],
    family: "construct", movement: "ground", persistent: true, discoveryHint: "Rare waypost stories mention a buried archive whose floor glyphs change while nobody watches.",
    utility: "Its Living Ink is required to craft Storybook Brick and other self-inscribing materials.",
  },
  mossling: {
    kind: "mossling", name: "Mossling", temperament: "Skittish", hostile: false,
    health: 5, damage: 0, xp: 2, speed: 0.72, chaseSpeed: 1.9, turnRate: 6, attackRange: 0,
    footOffset: 0.9, radius: 0.36, height: 0.82, habitat: "Wet forests, Bloomwood and Siltfen", active: "Day and rain",
    behavior: "Forages in short hops, gathers near flowers, and bounds away when struck.",
    lore: "A walking knot of moss and root. Old trailkeepers say every grove begins with one curious Mossling.",
    colors: [0x4f8a43, 0x9bc878, 0x172517],
    drops: [{ item: Item.Fiber, min: 1, max: 2, chance: 0.9 }, { item: Item.Berry, min: 1, max: 1, chance: 0.3 }],
    sentient: false, breedable: true, breedingFoods: [Item.Berry], diet: [Item.Berry, Item.Wheat],
    discoveryHint: "Look beneath rain-dark leaves in Bloomwood and Siltfen.",
  },
  "boglantern-mossling": {
    kind: "boglantern-mossling", name: "Boglantern Mossling", temperament: "Skittish", hostile: false,
    health: 6, damage: 0, xp: 3, speed: 0.56, chaseSpeed: 1.72, turnRate: 7.2, attackRange: 0,
    footOffset: 0.84, radius: 0.4, height: 0.76, habitat: "Siltfen pools, Mushroom Fen hummocks and Rainveil seep gardens", active: "Rain, dusk and humid daylight",
    behavior: "Wades on splayed roots, freezes until its lantern cap resembles a fen fungus, then splashes into dense reeds.",
    lore: "Its hollow cap keeps one firefly-bright spore alive through every flood, relighting the hummock when the water falls.",
    colors: [0x365c49, 0x8fbf63, 0xe8ff8a],
    drops: [{ item: Item.Fiber, min: 1, max: 2, chance: 0.86 }, { item: Item.GlowDust, min: 1, max: 1, chance: 0.18 }],
    family: "surface", movement: "ground", sentient: false, breedable: true, breedingFoods: [Item.Berry], diet: [Item.Berry, Item.Wheat],
    utility: "Its cap glows softly before rain.", discoveryHint: "Look for a low green lantern walking between Siltfen reed roots.",
  },
  "cindercone-mossling": {
    kind: "cindercone-mossling", name: "Cindercone Mossling", temperament: "Skittish", hostile: false,
    health: 8, damage: 1, xp: 4, speed: 0.48, chaseSpeed: 1.95, turnRate: 6.4, attackRange: 0.7,
    footOffset: 0.82, radius: 0.38, height: 0.8, habitat: "Painted Badlands washes and the shaded feet of desert mesas", active: "Dawn, dusk and after rain",
    behavior: "Locks its overlapping cone scales during heat, unroots after rare rain, and scatters ember-red seeds while fleeing.",
    lore: "A Cindercone can wait a decade for one storm, then cross an entire wash before the ground dries.",
    colors: [0x594236, 0xc36a3d, 0xffc15b],
    drops: [{ item: Item.Fiber, min: 1, max: 2, chance: 0.7 }, { item: Item.Coal, min: 1, max: 1, chance: 0.22 }],
    family: "surface", movement: "ground", sentient: false, breedable: true, breedingFoods: [Item.Sunroot], diet: [Item.Sunroot, Item.Wheat],
    utility: "Scattered seeds briefly mark recent rain paths through badland washes.", discoveryHint: "Check shaded mesa feet after rain for walking pinecone silhouettes.",
  },
  "moonbloom-mossling": {
    kind: "moonbloom-mossling", name: "Moonbloom Mossling", temperament: "Gentle", hostile: false,
    health: 5, damage: 0, xp: 4, speed: 0.62, chaseSpeed: 1.78, turnRate: 7.8, attackRange: 0,
    footOffset: 1, radius: 0.36, height: 1.02, habitat: "Glimmerwood Moonpetal rings and Starfern clearings", active: "Dusk and moonlit night",
    behavior: "Walks on three fine root stilts, opens its translucent flower crown to moonlight, and folds into a bud when startled.",
    lore: "Wood-elves say each Moonbloom carries a map of the last clear sky it saw, written in pale veins across its petals.",
    colors: [0x314d58, 0x8b83d8, 0xd8fff0],
    drops: [{ item: Item.Fiber, min: 1, max: 2, chance: 0.72 }, { item: Item.GlowDust, min: 1, max: 1, chance: 0.28 }],
    family: "surface", movement: "ground", sentient: false, breedable: true, breedingFoods: [Item.Moonpetal], diet: [Item.Moonpetal, Item.StarfernFrond],
    utility: "Its open crown indicates unobstructed moonlight.", discoveryHint: "Wait beside Moonpetals until a closed bud rises onto three roots.",
  },
  "moonbrawn-mossling": {
    kind: "moonbrawn-mossling", name: "Moonbrawn Mossling", temperament: "Gentle", hostile: false,
    health: 16, damage: 3, xp: 6, speed: 0.58, chaseSpeed: 2.35, turnRate: 5.4, attackRange: 1.2,
    footOffset: 1.08, radius: 0.57, height: 1.42, habitat: "Waykeeper Chrysalis Looms and carefully tended moonberry gardens", active: "Day, dusk and moonlit night",
    behavior: "Plants broad root-feet, braces its bark-plated shoulders, and uses heavy rooted forearms to protect smaller grove life. It relaxes by tamping loose soil around berry bushes.",
    lore: "Moonberries feed a Mossling's patience; a Star Crystal gives that patience weight. The resulting Moonbrawn keeps the grove-tender's gentle nature inside a body grown for hauling stone and sheltering seedlings.",
    colors: [0x314a2f, 0x6f9b57, 0x9a67b5],
    drops: [{ item: Item.Fiber, min: 2, max: 4, chance: 0.9 }, { item: Item.Berry, min: 1, max: 2, chance: 0.45 }],
    family: "surface", movement: "ground", sentient: false,
    tameable: true, tameItems: [Item.Berry], breedable: true, breedingFoods: [Item.Berry], diet: [Item.Berry, Item.Wheat], foodLure: true,
    captureItem: Item.CaptureOrb,
    utility: "A bonded Moonbrawn is a sturdy grove companion whose planted stance makes it useful around gardens and vulnerable followers.",
    postTameNotes: "Bonded pairs breed after both accept Moonberries; their offspring remain Moonbrawn Mosslings and inherit the family's keeper bond.",
    discoveryHint: "This form does not occur naturally. Place a Mossling in a Chrysalis Loom with four Moonberries and one Star Crystal.",
    fieldNotes: Object.freeze([
      { id: "morph", title: "Crystal-fed Rootheart", text: "The Moonbrawn form is made in a Chrysalis Loom from one captured Mossling, four Moonberries, and one Star Crystal.", hint: "Complete its Loom morph.", requires: [{ metric: "seen", atLeast: 1 }] },
      { id: "bond", title: "Gentle Strength", text: "Repeated Moonberries establish a keeper bond. Its broad arms are defensive tools, not a change in temperament.", hint: "Tame one with Moonberries.", requires: [{ metric: "tames", atLeast: 1 }] },
      { id: "family", title: "Rooted Lineage", text: "Two bonded, well-fed Moonbrawns produce a young Moonbrawn rather than reverting to their smaller ancestral form.", hint: "Breed a bonded pair with Moonberries.", requires: [{ metric: "breeds", atLeast: 1 }] },
    ]),
  },
  ridgeback: {
    kind: "ridgeback", name: "Ridgeback", temperament: "Defensive", hostile: false,
    health: 10, damage: 2, xp: 3, speed: 0.52, chaseSpeed: 2.8, turnRate: 4.2, attackRange: 1.35,
    // findWalkableY returns the solid block center; +0.5 is its top surface.
    footOffset: 0.5, radius: 0.62, height: 1.05, habitat: "Meadows, savannas and open woodland", active: "Day",
    behavior: "Travels in loose herds. Usually calm, but an injured Ridgeback lowers its plated head and charges.",
    lore: "Its warm stone plates store the afternoon sun. A charging herd sounds like distant summer thunder.",
    colors: [0x875437, 0xc07d54, 0x291912],
    drops: [{ item: Item.RawMeat, min: 1, max: 3, chance: 1 }, { item: Item.Hide, min: 1, max: 3, chance: 0.78 }],
    sentient: false, breedable: true, breedingFoods: [Item.Wheat, Item.Apple], diet: [Item.Wheat, Item.Apple, Item.Berry],
    discoveryHint: "Open meadow and savanna herds leave broad, plated tracks.",
  },
  woolhorn: {
    kind: "woolhorn", name: "Woolhorn", temperament: "Gentle", hostile: false,
    health: 9, damage: 1, xp: 3, speed: 0.42, chaseSpeed: 1.55, turnRate: 3.8, attackRange: 1.1,
    footOffset: 1.25, radius: 0.52, height: 1.18, habitat: "Frostpine taiga and snowy fields", active: "Day",
    behavior: "Grazes through snow, follows nearby Woolhorns, and braces behind its curled horns when cornered.",
    lore: "Cloud-soft wool hides a stubborn mountain heart. Their tracks are often the safest path through a blizzard.",
    colors: [0xe8e5d8, 0x756c61, 0x20211f],
    drops: [{ item: Item.Wool, min: 1, max: 2, chance: 1 }, { item: Item.RawMeat, min: 1, max: 1, chance: 0.58 }],
    sentient: false, breedable: true, breedingFoods: [Item.Wheat], diet: [Item.Wheat, Item.Apple], foodLure: true,
    discoveryHint: "Follow wool caught on low Frostpine branches.",
  },
  glowmoth: {
    kind: "glowmoth", name: "Glowmoth", temperament: "Gentle", hostile: false,
    health: 3, damage: 0, xp: 2, speed: 1.35, chaseSpeed: 1.8, turnRate: 7.5, attackRange: 0,
    footOffset: 1.8, radius: 0.38, height: 0.45, habitat: "Mooncap fen, flowers and torchlit caves", active: "Dusk and night",
    behavior: "Orbits flowers and warm light in looping flights. Its glow strengthens in darkness.",
    lore: "A lantern with wings. Some ruins are only found by following their silent midnight spirals.",
    colors: [0x6b5030, 0xf4cc55, 0xfff2a8],
    drops: [{ item: Item.GlowDust, min: 1, max: 2, chance: 0.84 }],
    family: "pollinator", movement: "flying", flying: true,
    discoveryHint: "Watch warm lights and Mooncap flowers after sunset for slow golden spirals.",
  },
  shadecrawler: {
    kind: "shadecrawler", name: "Shadecrawler", temperament: "Hostile", hostile: true,
    health: 11, damage: 2, xp: 6, speed: 1.05, chaseSpeed: 2.55, turnRate: 8, attackRange: 1.45,
    footOffset: 0.887916526, radius: 0.7, height: 0.62, habitat: "Deep caves and moonless forests", active: "Darkness",
    behavior: "Circles just outside torchlight, then lunges. Bright daylight forces it back underground.",
    lore: "A many-legged absence between stones. Its eyes appear a moment before the rest of it decides to exist.",
    colors: [0x332b43, 0x725d8c, 0xff6e78],
    drops: [
      { item: Item.ShadowShard, min: 1, max: 1, chance: 0.84 },
      { item: Item.Coal, min: 1, max: 1, chance: 0.34 },
      { item: Item.NocturneHeart, min: 1, max: 1, chance: 0.08 },
    ],
    sentient: false, tameable: true, tameItems: [Item.NocturneHeart], diet: [Item.Berry, Item.RottenFlesh, Item.RawMeat],
    postTameNotes: "Patient feeding deepens the bond and grows a Shadecrawler to three times its wild size. A full-grown companion accepts a saddle and can be ridden.",
    secretHint: "Six Moonberries calm its hunger before a rare Nocturne Heart can form a lasting bond.",
    discoveryHint: "Search broad deepstone chambers beyond direct torchlight.",
  },
  caveblob: {
    kind: "caveblob", name: "Cave Blob", temperament: "Hostile", hostile: true,
    health: 7, damage: 1, xp: 4, speed: 0.55, chaseSpeed: 1.65, turnRate: 5, attackRange: 1.25,
    footOffset: 0.81, radius: 0.48, height: 0.82, habitat: "Aquifers and deepstone caverns", active: "Underground",
    behavior: "Squashes flat, springs forward, and splashes cave gel on impact.",
    lore: "Mineral-rich water learned to hop. Cave Blobs remember every boot that has ever stepped in their pools.",
    colors: [0x4ca47e, 0x8ee0b8, 0x15362b],
    drops: [{ item: Item.CaveGel, min: 1, max: 2, chance: 1 }],
    discoveryHint: "Listen for wet springing sounds beside deep underground pools.",
  },
  rattlekin: {
    kind: "rattlekin", name: "Rattlekin", temperament: "Hostile", hostile: true,
    health: 13, damage: 3, xp: 7, speed: 0.8, chaseSpeed: 1.85, turnRate: 5.5, attackRange: 1.55,
    footOffset: 1.04, radius: 0.38, height: 1.78, habitat: "Ruins, badlands and the night surface", active: "Night",
    behavior: "Patrols upright, raises a stone club, then commits to a heavy timed swing.",
    lore: "Not bones, but stone remembering the shape of a traveler. The rhythm of its steps is older than the ruins.",
    colors: [0xd8cfb9, 0x807664, 0x2a2520],
    drops: [{ item: Item.BoneShard, min: 1, max: 2, chance: 1 }, { item: Item.Coal, min: 1, max: 1, chance: 0.2 }],
    discoveryHint: "Follow rhythmic stone clatter through ruins or open badlands after dark.",
  },
  zombie: {
    kind: "zombie", name: "Zombie", temperament: "Hostile", hostile: true,
    health: 10, damage: 2, xp: 5, speed: 0.66, chaseSpeed: 1.62, turnRate: 5.2, attackRange: 1.42,
    footOffset: 0.5, radius: 0.38, height: 1.8, habitat: "Dark caves and the night surface", active: "Darkness",
    behavior: "Shambles toward living creatures with both arms raised. Direct sunlight slowly burns it away.",
    lore: "A miner who stayed below one night too many. It remembers doors, footsteps, and almost nothing else.",
    colors: [0x5f8f54, 0x3e7470, 0x263c74],
    drops: [{ item: Item.RottenFlesh, min: 1, max: 2, chance: 0.82 }, { item: Item.IronIngot, min: 1, max: 1, chance: 0.025 }],
    family: "undead",
    discoveryHint: "Search unlit cave mouths or the night surface for slow dragging footsteps.",
  },
  "sunstep-grazer": {
    kind: "sunstep-grazer", name: "Sunstep Grazer", temperament: "Skittish", hostile: false,
    health: 11, damage: 0, xp: 4, speed: 0.82, chaseSpeed: 2.72, turnRate: 4.8, attackRange: 0,
    footOffset: 1.4394, radius: 0.62, height: 1.73, habitat: "Sunstep savannas and meadow margins", active: "Morning and late afternoon",
    behavior: "Moves in broad herds of four to seven, stamps a warning, then escapes in coordinated bounding strides.",
    lore: "Its fan-shaped ears shade its face and flush copper when rain is coming.",
    colors: [0xd7a44e, 0x7b4a2e, 0x20170f], drops: [{ item: Item.Hide, min: 1, max: 3, chance: 0.8 }, { item: Item.RawMeat, min: 1, max: 3, chance: 0.84 }],
    family: "surface", movement: "ground", utility: "A reliable source of hide in dry country, if a player can catch one.",
    sentient: false, breedable: true, breedingFoods: [Item.Wheat, Item.Apple], diet: [Item.Wheat, Item.Apple], foodLure: true,
    discoveryHint: "Listen for warning stamps along bright savanna margins.",
  },
  pebbletortoise: {
    kind: "pebbletortoise", name: "Pebbletortoise", temperament: "Gentle", hostile: false,
    health: 14, damage: 0, xp: 3, speed: 0.24, chaseSpeed: 0.42, turnRate: 2.2, attackRange: 0,
    footOffset: 0.78, radius: 0.58, height: 0.58, habitat: "Stony meadows, riverbanks and badland shelves", active: "Warm daylight",
    behavior: "Nibbles low plants and withdraws into its lichen-covered shell when startled.",
    lore: "Sleeping specimens are almost indistinguishable from the cairns they slowly rearrange.",
    colors: [0x68705b, 0x9caf73, 0x24291f], drops: [{ item: Item.Flint, min: 1, max: 2, chance: 0.42 }],
    family: "surface", movement: "ground", utility: "Passively clears tall grass around its resting place.",
    sentient: false, breedable: true, breedingFoods: [Item.Berry], diet: [Item.Berry, Item.Wheat],
    discoveryHint: "Inspect lichen-covered stones beside warm riverbanks.",
  },
  brambleboar: {
    kind: "brambleboar", name: "Brambleboar", temperament: "Defensive", hostile: false,
    health: 12, damage: 3, xp: 4, speed: 0.62, chaseSpeed: 2.4, turnRate: 4.4, attackRange: 1.28,
    footOffset: 1.08, radius: 0.62, height: 0.98, habitat: "Dense Wildwood and Bloomwood underbrush", active: "Dawn and dusk",
    behavior: "Roots beneath berry bushes. A threatened boar rattles its thorny mane before a short charge.",
    lore: "Seeds caught in its coat germinate as it travels, leaving crooked green trails through old forest.",
    colors: [0x5e3d2b, 0x486a35, 0xf0d7ac], drops: [{ item: Item.RawMeat, min: 1, max: 3, chance: 0.94 }, { item: Item.Fiber, min: 1, max: 2, chance: 0.72 }, { item: Item.Hide, min: 1, max: 2, chance: 0.42 }],
    family: "surface", movement: "ground", utility: "Occasionally tills a dirt block while rooting.",
    sentient: false, breedable: true, breedingFoods: [Item.Apple, Item.Berry], diet: [Item.Apple, Item.Berry, Item.Wheat],
    discoveryHint: "Bramble trails and freshly rooted soil mark dense forest underbrush.",
  },
  petalfox: {
    kind: "petalfox", name: "Petalfox", temperament: "Skittish", hostile: false,
    health: 6, damage: 0, xp: 3, speed: 0.78, chaseSpeed: 2.9, turnRate: 7.2, attackRange: 0,
    footOffset: 0.95, radius: 0.4, height: 0.78, habitat: "Meadows and flower-rich Bloomwood clearings", active: "Day",
    behavior: "Pounces after insects, naps in flower patches, and flees noisy travelers in a spray of petals.",
    lore: "Its tail changes scent with the flowers it sleeps among.",
    colors: [0xe78ba7, 0xffd4b8, 0x4b2735], drops: [{ item: Item.Fiber, min: 1, max: 1, chance: 0.34 }],
    family: "surface", movement: "ground", utility: "Leads observant players toward dense flower patches and butterflies.",
    sentient: false, breedable: true, breedingFoods: [Item.Berry], diet: [Item.Berry, Item.Apple],
    discoveryHint: "Watch for drifting petals that move against the wind.",
  },
  "emberbrush-fox": {
    kind: "emberbrush-fox", name: "Emberbrush Fox", temperament: "Skittish", hostile: false,
    health: 7, damage: 1, xp: 4, speed: 0.94, chaseSpeed: 3.35, turnRate: 8.4, attackRange: 0.72,
    footOffset: 0.92, radius: 0.38, height: 0.74, habitat: "Sunstep grass, Painted Badlands washes and desert scrub", active: "Dawn and late afternoon",
    behavior: "Listens for burrowers with enormous heat-shedding ears, vaults high over scrub, and shades its face beneath a split brush tail.",
    lore: "Its black tail forks frame a red center like banked coals. Caravans take a distant flash as a promise of firm ground.",
    colors: [0xc45a31, 0xf0ad55, 0x231b1c], drops: [{ item: Item.Fiber, min: 1, max: 1, chance: 0.28 }],
    family: "surface", movement: "ground", sentient: false, breedable: true, breedingFoods: [Item.Sunroot], diet: [Item.Sunroot, Item.Berry],
    utility: "Often pauses above burrows and other disturbed ground.", discoveryHint: "Watch shaded badland washes for two tall ears and a forked ember tail.",
  },
  "moonpetal-fox": {
    kind: "moonpetal-fox", name: "Moonpetal Fox", temperament: "Gentle", hostile: false,
    health: 8, damage: 1, xp: 5, speed: 0.74, chaseSpeed: 2.75, turnRate: 8.8, attackRange: 0.72,
    footOffset: 0.95, radius: 0.42, height: 0.8, habitat: "Glimmerwood moonwells and luminous fern terraces", active: "Dusk and moonlit night",
    behavior: "Steps quietly between glowing plants, fans two petal tails when curious, and disappears by folding both tails around its body.",
    lore: "The pale eyes on its tails are not eyes, but they always seem to face the safest path home.",
    colors: [0x46536f, 0xa68cda, 0xd9fff2], drops: [{ item: Item.Fiber, min: 1, max: 2, chance: 0.32 }, { item: Item.GlowDust, min: 1, max: 1, chance: 0.12 }],
    family: "surface", movement: "ground", sentient: false, breedable: true, breedingFoods: [Item.Moonpetal], diet: [Item.Moonpetal, Item.StarfernFrond, Item.Berry],
    utility: "Its tail eyes turn toward nearby Moonpetals and Starferns.", discoveryHint: "Look for paired crescent tails crossing Glimmerwood moonwell paths.",
  },
  duneclatter: {
    kind: "duneclatter", name: "Duneclatter", temperament: "Defensive", hostile: false,
    health: 7, damage: 2, xp: 4, speed: 0.58, chaseSpeed: 1.92, turnRate: 6.2, attackRange: 1.05,
    footOffset: 0.87505902, radius: 0.5, height: 0.55, habitat: "Desert dunes, cactus flats and temple outskirts", active: "Hot daylight",
    behavior: "Burrows beneath loose sand, then clicks bright wing-cases to warn intruders away.",
    lore: "Caravans follow its evening tracks to firm ground and avoid sinking dunes.",
    colors: [0xc96f32, 0x5f3428, 0xffcf63], drops: [{ item: Item.Flint, min: 1, max: 2, chance: 0.7 }, { item: Item.GlowDust, min: 1, max: 1, chance: 0.16 }],
    family: "surface", movement: "ground", utility: "Its wing-case glint points toward nearby sandstone ruins at sunset.",
    discoveryHint: "Look for clicking tracks that vanish beneath loose desert sand near cactus flats.",
  },
  thimbledeer: {
    kind: "thimbledeer", name: "Thimbledeer", temperament: "Skittish", hostile: false,
    health: 7, damage: 0, xp: 3, speed: 0.82, chaseSpeed: 3.05, turnRate: 6.8, attackRange: 0,
    footOffset: 1.13, radius: 0.42, height: 1.28, habitat: "Meadows and pale Birchlight glades", active: "Morning and late afternoon",
    behavior: "Browses flower heads with its narrow muzzle, freezes when watched, then bounds through openings between trees.",
    lore: "Its tiny thimble-shaped antlers collect seeds. Every seasonal migration quietly redraws the edge of a meadow.",
    colors: [0xb9865b, 0xe8d8b0, 0x292118],
    drops: [{ item: Item.Hide, min: 1, max: 2, chance: 0.66 }, { item: Item.RawMeat, min: 1, max: 2, chance: 0.72 }, { item: Item.Fiber, min: 1, max: 2, chance: 0.38 }],
    family: "surface", movement: "ground", utility: "Occasionally carries a flower seed from one meadow patch to another.",
    sentient: false, breedable: true, breedingFoods: [Item.Apple], diet: [Item.Apple, Item.Berry, Item.Wheat],
    discoveryHint: "Search quiet Birchlight glades at the edge of flower meadows.",
  },
  "frostlace-hart": {
    kind: "frostlace-hart", name: "Frostlace Hart", temperament: "Skittish", hostile: false,
    health: 11, damage: 1, xp: 5, speed: 0.76, chaseSpeed: 3.2, turnRate: 6.2, attackRange: 0.9,
    footOffset: 1.25, radius: 0.47, height: 1.46, habitat: "Frostpine openings, Snowfields and high Snowcap passes", active: "Clear winter morning and snowfall",
    behavior: "Crosses powder on broad split snowshoes, combs ice from low branches with crystal antlers, and bounds downhill when alarmed.",
    lore: "Every tine begins as frozen breath caught in winter velvet. The rack melts harmlessly when spring reaches the passes.",
    colors: [0xc5d2d4, 0x7896a3, 0xeaffff], drops: [{ item: Item.Hide, min: 1, max: 2, chance: 0.7 }, { item: Item.RawMeat, min: 1, max: 3, chance: 0.76 }, { item: Item.CrystalShard, min: 1, max: 1, chance: 0.1 }],
    family: "surface", movement: "ground", sentient: false, breedable: true, breedingFoods: [Item.Apple], diet: [Item.Apple, Item.Wheat],
    utility: "Its broad trail marks snow that can support a traveler.", discoveryHint: "Follow paired snowshoe tracks between Frostpine openings.",
  },
  "reedcrown-deer": {
    kind: "reedcrown-deer", name: "Reedcrown Deer", temperament: "Skittish", hostile: false,
    health: 9, damage: 0, xp: 4, speed: 0.68, chaseSpeed: 2.85, turnRate: 7.3, attackRange: 0,
    footOffset: 1.15, radius: 0.45, height: 1.34, habitat: "Siltfen reed islands, Rainveil floodplains and slow river margins", active: "Rain, dawn and overcast daylight",
    behavior: "Places splayed hooves across soft mud, lowers its reed rack beneath branches, and vanishes sideways through watergrass.",
    lore: "Mud and seed build a living crown around its antlers. A mature herd carries one wetland into the next.",
    colors: [0x586b4c, 0xa58d58, 0xe6ed9a], drops: [{ item: Item.Hide, min: 1, max: 2, chance: 0.64 }, { item: Item.RawMeat, min: 1, max: 2, chance: 0.7 }, { item: Item.Fiber, min: 1, max: 2, chance: 0.56 }],
    family: "surface", movement: "ground", sentient: false, breedable: true, breedingFoods: [Item.Berry], diet: [Item.Berry, Item.Wheat],
    utility: "Carries reed and marsh-flower seed between floodplains.", discoveryHint: "Search reed islands for splayed tracks that never sink deeply into mud.",
  },
  lanternshell: {
    kind: "lanternshell", name: "Lanternshell", temperament: "Gentle", hostile: false,
    health: 9, damage: 0, xp: 3, speed: 0.2, chaseSpeed: 0.44, turnRate: 2.2, attackRange: 0,
    footOffset: 0.78, radius: 0.34, height: 0.46, habitat: "Siltfen roots and luminous mushroom hollows", active: "Rain, dusk and humid nights",
    behavior: "Glides over moss, rests beneath broad leaves, and brightens its glassy spiral shell when rain begins.",
    lore: "Fen paths once used sleeping Lanternshells as milestones. They moved slowly enough that the maps were usually right.",
    colors: [0x526845, 0x7fd6a8, 0xf2ffb0],
    drops: [{ item: Item.CaveGel, min: 1, max: 1, chance: 0.42 }, { item: Item.GlowDust, min: 1, max: 1, chance: 0.22 }],
    family: "surface", movement: "ground", utility: "A calm living night-light whose shell glows brighter before rain.",
    sentient: false, breedable: true, breedingFoods: [Item.Berry], diet: [Item.Berry, Item.Wheat],
    discoveryHint: "Look under Siltfen roots after rain or near glowing mushrooms at dusk.",
  },
  puddlehopper: {
    kind: "puddlehopper", name: "Puddlehopper", temperament: "Skittish", hostile: false,
    health: 4, damage: 0, xp: 2, speed: 0.58, chaseSpeed: 2.55, turnRate: 8.2, attackRange: 0,
    footOffset: 0.890704, radius: 0.38, height: 0.58, habitat: "River reeds, Siltfen pools and rainy meadow hollows", active: "Rain and humid daylight",
    behavior: "Bounds frequently between reeds, doubles its hop cadence in rain, and launches into faster springing leaps when startled.",
    lore: "Each throat pouch carries a different hollow note. A whole pond sounds like rain falling into clay cups.",
    colors: [0x5e9b69, 0xd5c85b, 0x182a20],
    drops: [{ item: Item.CaveGel, min: 1, max: 1, chance: 0.28 }],
    family: "surface", movement: "ground", utility: "Its evening calls mark nearby surface water and incoming rain.",
    sentient: false, breedable: true, breedingFoods: [Item.Berry], diet: [Item.Berry],
    discoveryHint: "Wait beside reeds during rain and listen for hollow plunks.",
  },
  reedstrider: {
    kind: "reedstrider", name: "Reedstrider", temperament: "Defensive", hostile: false,
    health: 8, damage: 2, xp: 4, speed: 0.64, chaseSpeed: 2.35, turnRate: 5.8, attackRange: 1.25,
    footOffset: 1.1, radius: 0.4, height: 1.64, habitat: "Siltfen shallows, broad rivers and meadow wetlands", active: "Dawn and overcast daylight",
    behavior: "Stalks tiny fish between reeds, fans its broad wings to warn intruders, and only kicks when cornered.",
    lore: "Its hollow crest amplifies a call that carries over fog. River travelers use the answering echoes to judge a channel's width.",
    colors: [0x668a78, 0xc9a65f, 0x243039],
    drops: [{ item: Item.Feather, min: 1, max: 2, chance: 0.86 }, { item: Item.RawFish, min: 1, max: 1, chance: 0.18 }],
    family: "mount", movement: "ground", persistent: true, utility: "A tame, saddled Reedstrider is a fast amphibious mount and crosses water faster than land.",
    sentient: false, tameable: true, tameItems: [Item.RawFish, Item.CookedFish, Item.GlowScale],
    breedable: true, breedingFoods: [Item.RawFish], diet: [Item.RawFish, Item.CookedFish, Item.GlowScale, Item.Berry], foodLure: true,
    rideable: true, postTameNotes: "Build trust with fish, then fit a Trail Saddle. Its long stride is steady on land and exceptionally quick through shallows.",
    secretHint: "Glow Scales build trust much faster than ordinary fish.",
    discoveryHint: "Follow resonant dawn calls across foggy wetlands.",
  },
  "wild-horse": {
    kind: "wild-horse", name: "Wildwood Courser", temperament: "Skittish", hostile: false,
    health: 14, damage: 1, xp: 5, speed: 1.05, chaseSpeed: 4.5, turnRate: 5.2, attackRange: 1.2,
    footOffset: 1.05, radius: 0.62, height: 1.75, habitat: "Open meadows, forest roads and upland glens", active: "Day",
    behavior: "Travels in small family bands, circles foals when threatened, and bolts into open terrain rather than trees.",
    lore: "Wildwood Coursers remember old roads long after roots and flowers have hidden them.",
    colors: [0x8b5b3d, 0xd6b17b, 0xffe69a], drops: [{ item: Item.Hide, min: 1, max: 3, chance: 0.78 }],
    family: "mount", movement: "ground", persistent: true, utility: "A fast land mount after patient feeding and fitting a Trail Saddle.",
    sentient: false, tameable: true, tameItems: [Item.Apple, Item.Wheat], breedable: true, rideable: true,
    breedingFoods: [Item.Apple], diet: [Item.Apple, Item.Wheat], captureItem: Item.CaptureOrb, foodLure: true,
    postTameNotes: "A saddled Courser carries one rider and prefers clear ground.",
    discoveryHint: "Look for hoofprints along broad meadow edges and old forest roads.",
  },
  "rimehoof-courser": {
    kind: "rimehoof-courser", name: "Rimehoof Courser", temperament: "Skittish", hostile: false,
    health: 17, damage: 2, xp: 7, speed: 0.94, chaseSpeed: 4.15, turnRate: 4.8, attackRange: 1.25,
    footOffset: 1.05, radius: 0.68, height: 1.72, habitat: "Frostpine taiga, whispering snowfields and Snowcap passes", active: "Day and snowfall",
    behavior: "Breaks crusted snow with broad hooves, shelters foals behind its shaggy shoulder, and follows wind-scoured ridgelines.",
    lore: "Ice gathers on its mane without melting, then falls away in silver sheets when the herd begins to run.",
    colors: [0x9dabb2, 0xe7eee8, 0xa8f5ff], drops: [{ item: Item.Hide, min: 1, max: 3, chance: 0.78 }],
    family: "mount", movement: "ground", persistent: true, utility: "A sure-footed cold-country mount with strong snowfield speed.",
    sentient: false, tameable: true, tameItems: [Item.Apple, Item.Wheat], breedable: true, rideable: true,
    breedingFoods: [Item.Apple], diet: [Item.Apple, Item.Wheat], captureItem: Item.CaptureOrb,
    postTameNotes: "Its broad hooves keep a steady pace across snow and steep stone.", discoveryHint: "Look for wide blue-gray hoofprints where Frostpine opens into snow.",
  },
  "sunscar-courser": {
    kind: "sunscar-courser", name: "Sunscar Courser", temperament: "Skittish", hostile: false,
    health: 13, damage: 1, xp: 6, speed: 1.18, chaseSpeed: 4.8, turnRate: 5.8, attackRange: 1.15,
    footOffset: 1.05, radius: 0.58, height: 1.78, habitat: "Sunglass dunes and Painted Badlands washes", active: "Dawn and late afternoon",
    behavior: "Travels between shaded cuts, lowers its narrow profile into sandstorms, and sprints in short explosive arcs.",
    lore: "The dark line beneath each eye is said to be the first road the sun ever burned into the desert.",
    colors: [0xb96832, 0xe8bd72, 0x241b18], drops: [{ item: Item.Hide, min: 1, max: 2, chance: 0.7 }],
    family: "mount", movement: "ground", persistent: true, utility: "The fastest Courser on dry open ground, though a poor swimmer.",
    sentient: false, tameable: true, tameItems: [Item.Sunroot, Item.Wheat], breedable: true, rideable: true,
    breedingFoods: [Item.Sunroot], diet: [Item.Sunroot, Item.Wheat], captureItem: Item.CaptureOrb,
    postTameNotes: "It accelerates quickly on open dry ground and dislikes deep water.", discoveryHint: "Search cool badlands washes at dawn for a cropped black mane.",
  },
  "mirestride-courser": {
    kind: "mirestride-courser", name: "Mirestride Courser", temperament: "Defensive", hostile: false,
    health: 16, damage: 2, xp: 7, speed: 0.82, chaseSpeed: 3.65, turnRate: 5.4, attackRange: 1.25,
    footOffset: 1.05, radius: 0.7, height: 1.66, habitat: "Siltfen reed islands and flooded forest margins", active: "Overcast day and rain",
    behavior: "Tests mud before every step, spreads broad hooves over soft silt, and drives marsh predators away from young.",
    lore: "Reedcutters follow its paths because a Mirestride never commits its full weight to false ground.",
    colors: [0x516b59, 0x9b8358, 0xd6ef89], drops: [{ item: Item.Hide, min: 1, max: 2, chance: 0.72 }],
    family: "mount", movement: "ground", persistent: true, utility: "A stable marsh mount with unusually good shallow-water pace.",
    sentient: false, tameable: true, tameItems: [Item.Berry, Item.Wheat], breedable: true, rideable: true,
    breedingFoods: [Item.Berry], diet: [Item.Berry, Item.Wheat], captureItem: Item.CaptureOrb,
    postTameNotes: "Its splayed hooves cross mud and shallows more safely than other Coursers.", discoveryHint: "Watch reed islands during rain for a low moss-colored mane.",
  },
  "starbough-courser": {
    kind: "starbough-courser", name: "Starbough Courser", temperament: "Gentle", hostile: false,
    health: 15, damage: 2, xp: 8, speed: 1.08, chaseSpeed: 4.45, turnRate: 6.2, attackRange: 1.2,
    footOffset: 1.05, radius: 0.6, height: 1.86, habitat: "Moonlit Glimmerwood clearings", active: "Dusk and night",
    behavior: "Moves in quiet pairs, brushes its small branch antlers through Starferns, and freezes when moonwell bells ring.",
    lore: "Each pale point along its flank appears only after the Courser has found a safe path home in darkness.",
    colors: [0x344c58, 0x80cbb4, 0xdcfff1], drops: [{ item: Item.StarfernFrond, min: 1, max: 2, chance: 0.45 }],
    family: "mount", movement: "ground", persistent: true, utility: "A nimble nocturnal mount whose markings remain visible without casting strong light.",
    sentient: false, tameable: true, tameItems: [Item.Moonpetal, Item.Apple], breedable: true, rideable: true,
    breedingFoods: [Item.Moonpetal], diet: [Item.Moonpetal, Item.StarfernFrond, Item.Apple], captureItem: Item.CaptureOrb,
    postTameNotes: "Its pale markings make the rider easier to follow on dark forest paths.", discoveryHint: "Wait beside Starferns after dusk and watch for paired antler lights.",
  },
  "meadow-cow": {
    kind: "meadow-cow", name: "Cloverback", temperament: "Gentle", hostile: false,
    health: 12, damage: 0, xp: 4, speed: 0.45, chaseSpeed: 1.65, turnRate: 3.8, attackRange: 0,
    footOffset: 0.96, radius: 0.66, height: 1.38, habitat: "Flower meadows and settled pasture clearings", active: "Day",
    behavior: "Grazes in loose herds, follows wheat, and stands beneath trees during hard rain.",
    lore: "Clover patterns bloom across its back in spring, making every herd look like a moving meadow.",
    colors: [0xf0e3c2, 0x6f513b, 0x6e9b51], drops: [{ item: Item.RawMeat, min: 2, max: 4, chance: 1 }, { item: Item.Hide, min: 2, max: 4, chance: 0.9 }],
    family: "surface", movement: "ground", utility: "Can be milked for Meadow Milk and bred with wheat.",
    sentient: false, breedable: true, breedingFoods: [Item.Wheat], diet: [Item.Wheat, Item.Apple], captureItem: Item.CaptureOrb, foodLure: true,
    discoveryHint: "Listen for soft bells where meadow flowers give way to shade.",
  },
  "sunbloom-longhorn": {
    kind: "sunbloom-longhorn", name: "Sunbloom Longhorn", temperament: "Gentle", hostile: false,
    health: 16, damage: 2, xp: 5, speed: 0.43, chaseSpeed: 2.05, turnRate: 3.5, attackRange: 1.35,
    footOffset: 1, radius: 0.76, height: 1.48, habitat: "Sunstep savanna waterholes and Painted Badlands grass washes", active: "Morning and late afternoon",
    behavior: "Grazes in heat-spaced herds, turns its broad horns toward predators, and kneels beneath sparse shade at midday.",
    lore: "Sunflowers root in the dust caught between its shoulders. A herd in bloom can be seen moving across the plain from miles away.",
    colors: [0xa65f32, 0xe2b85e, 0x312018], drops: [{ item: Item.RawMeat, min: 2, max: 4, chance: 1 }, { item: Item.Hide, min: 2, max: 4, chance: 0.92 }],
    family: "surface", movement: "ground", utility: "A hardy dry-country milk and hide animal.",
    sentient: false, breedable: true, breedingFoods: [Item.Wheat], diet: [Item.Wheat, Item.Sunroot], captureItem: Item.CaptureOrb,
    discoveryHint: "Look for sunflower-yellow backs gathering around savanna waterholes.",
  },
  mistmane: {
    kind: "mistmane", name: "Mistmane", temperament: "Gentle", hostile: false,
    health: 9, damage: 0, xp: 4, speed: 0.62, chaseSpeed: 2.2, turnRate: 5.4, attackRange: 0,
    footOffset: 0.92, radius: 0.48, height: 1.32, habitat: "Cool Cloudreed Glens above wet valleys", active: "Overcast day and dawn",
    behavior: "Browses cloudreeds in quiet groups and shakes beads of fog from its long glassy mane.",
    lore: "Its wool traps morning mist. Trailkeepers once wrung drinking water from shed curls on dry climbs.",
    colors: [0xb8d6cf, 0x6d8f8a, 0xeaf7e9], drops: [{ item: Item.Fiber, min: 1, max: 3, chance: 0.9 }, { item: Item.RawMeat, min: 1, max: 2, chance: 0.62 }],
    family: "surface", movement: "ground", utility: "A renewable source of soft fiber in Cloudreed country.",
    sentient: false, breedable: true, breedingFoods: [Item.Wheat], diet: [Item.Wheat, Item.Berry], captureItem: Item.CaptureOrb, foodLure: true,
    discoveryHint: "Search cool upland reed basins where bells sound in the fog.",
  },
  emberjay: {
    kind: "emberjay", name: "Emberjay", temperament: "Skittish", hostile: false,
    health: 3, damage: 0, xp: 2, speed: 1.25, chaseSpeed: 4.1, turnRate: 9, attackRange: 0,
    footOffset: 1.15, radius: 0.26, height: 0.44, habitat: "Savanna acacias, badland cacti and warm forest edges", active: "Day",
    behavior: "Hops along branches, perches to call, and bursts skyward when a human approaches quickly.",
    lore: "A flash of banked fire in the canopy. Its alarm call makes nearby grazers lift their heads.",
    colors: [0xb9432e, 0xe9a141, 0x261b22], drops: [{ item: Item.Feather, min: 1, max: 2, chance: 1 }],
    family: "bird", movement: "flying", flying: true, utility: "Calls when hostile surface creatures are close.",
    sentient: false, breedable: true, breedingFoods: [Item.Wheat], diet: [Item.Wheat, Item.Berry],
    discoveryHint: "Listen for a sharp ember-bright alarm call in warm trees and cactus country.",
  },
  "canopy-lark": {
    kind: "canopy-lark", name: "Canopy Lark", temperament: "Skittish", hostile: false,
    health: 3, damage: 0, xp: 2, speed: 1.1, chaseSpeed: 3.7, turnRate: 8.4, attackRange: 0,
    footOffset: 1.1, radius: 0.25, height: 0.42, habitat: "Wildwood, Birchlight and Bloomwood canopies", active: "Morning",
    behavior: "Forages on the ground, returns to a favored branch, and flees sudden movement or attack.",
    lore: "Each flock improvises a local song, so patient explorers can hear when they have crossed into new woods.",
    colors: [0x4f9b75, 0xd9e7a4, 0x20362c], drops: [{ item: Item.Feather, min: 1, max: 2, chance: 1 }],
    family: "bird", movement: "flying", flying: true, utility: "Frequent perching marks mature trees that are suitable for saplings.",
    sentient: false, breedable: true, breedingFoods: [Item.Berry], diet: [Item.Berry, Item.Wheat],
    discoveryHint: "Pause beneath a mature woodland canopy at morning and listen for a changing local song.",
  },
  frostquill: {
    kind: "frostquill", name: "Frostquill", temperament: "Skittish", hostile: false,
    health: 4, damage: 0, xp: 2, speed: 1.05, chaseSpeed: 3.9, turnRate: 8.8, attackRange: 0,
    footOffset: 1.12, radius: 0.29, height: 0.46, habitat: "Frostpine boughs, Snowfields and Snowcap ledges", active: "Day and light snowfall",
    behavior: "Scratches through powder in small coveys, freezes beneath passing shadows, and erupts into a white wingbeat when startled.",
    lore: "Its layered winter plumage scatters the blue of deep snow. Climbers follow fresh Frostquill tracks toward sheltered passes.",
    colors: [0xe8f1ee, 0x8eb6c7, 0x202b3a], drops: [{ item: Item.Feather, min: 1, max: 2, chance: 1 }],
    family: "bird", movement: "flying", flying: true, breedable: true, breedingFoods: [Item.Wheat], diet: [Item.Wheat, Item.Berry],
    utility: "Coveys favor sheltered snowy routes and make reliable weather signs.", discoveryHint: "Watch for tiny three-toed tracks crossing fresh snow below conifers.",
  },
  shoalfin: {
    kind: "shoalfin", name: "Silver Shoalfin", temperament: "Skittish", hostile: false,
    health: 3, damage: 0, xp: 2, speed: 1.4, chaseSpeed: 3.1, turnRate: 8.5, attackRange: 0,
    footOffset: 0, radius: 0.28, height: 0.28, habitat: "Open ocean shallows and kelp shelves", active: "Daylight underwater",
    behavior: "Schools tightly, flashes silver when threatened, and scatters around attackers.",
    lore: "Sailors read the direction of its silver flash to find currents near shore.",
    colors: [0x78b7c8, 0xd9f4ed, 0x17364a], drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 1 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "A common food fish and a living sign of safe coastal water.",
    discoveryHint: "Watch sunlit kelp shelves for a tight flash of turning silver.",
  },
  coralback: {
    kind: "coralback", name: "Coralback", temperament: "Defensive", hostile: false,
    health: 7, damage: 1, xp: 4, speed: 0.82, chaseSpeed: 1.75, turnRate: 5.5, attackRange: 0.9,
    footOffset: 0, radius: 0.48, height: 0.48, habitat: "Warm ocean reefs and deep coastal shelves", active: "All hours underwater",
    behavior: "Grazes stone clean and presents its harmless coral armor when cornered.",
    lore: "Tiny reef gardens travel on its back, seeding color wherever it rests.",
    colors: [0x387f83, 0xe47f77, 0xffe1a5], drops: [{ item: Item.RawFish, min: 1, max: 2, chance: 1 }, { item: Item.CrystalShard, min: 1, max: 1, chance: 0.08 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "Slowly encourages decorative coral-like growth on submerged stone.",
    discoveryHint: "Inspect warm reef stone for a small coral garden that begins to move.",
  },
  brookdart: {
    kind: "brookdart", name: "Brookdart", temperament: "Skittish", hostile: false,
    health: 2, damage: 0, xp: 2, speed: 1.65, chaseSpeed: 3.4, turnRate: 10, attackRange: 0,
    footOffset: 0, radius: 0.22, height: 0.22, habitat: "Rivers and clear inland pools", active: "Morning and rain",
    behavior: "Faces upstream, darts between stones, and leaps low cascades after rainfall.",
    lore: "Its blue stripe is brightest in clean water, making it a trailkeeper's favorite river gauge.",
    colors: [0x4f78bc, 0xa9d7d2, 0xf3c95f], drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 1 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "Its presence indicates clean river water.",
    discoveryHint: "Look upstream from clear river stones during morning rain.",
  },
  gloomfin: {
    kind: "gloomfin", name: "Gloomfin", temperament: "Defensive", hostile: false,
    health: 5, damage: 1, xp: 4, speed: 0.72, chaseSpeed: 2.2, turnRate: 7, attackRange: 0.95,
    footOffset: 0, radius: 0.34, height: 0.34, habitat: "Underground aquifers and flooded crystal caves", active: "Darkness underwater",
    behavior: "Hovers near cave walls, pulses a cold light, and nips only when trapped.",
    lore: "Miners once carried glass bowls of Gloomfins instead of lanterns. The fish objected.",
    colors: [0x27334f, 0x5bd6ca, 0xc8fff2], drops: [{ item: Item.GlowScale, min: 1, max: 2, chance: 1 }, { item: Item.RawFish, min: 1, max: 1, chance: 0.65 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "A faint mobile light source for underground pools.",
    discoveryHint: "Search flooded crystal caves for a cold light hovering close to the wall.",
  },
  silverthread: {
    kind: "silverthread", name: "Silverthread", temperament: "Skittish", hostile: false,
    health: 2, damage: 0, xp: 2, speed: 1.75, chaseSpeed: 3.6, turnRate: 11, attackRange: 0,
    footOffset: 0, radius: 0.13, height: 0.11, habitat: "Sunlit ocean shallows", active: "Daylight underwater",
    behavior: "Forms glittering shoals of six to twelve and folds into narrow ribbons around rocks.",
    lore: "From shore, a turning shoal looks like a silver stitch holding sea to sky.",
    colors: [0xb9e4e8, 0x638fa7, 0xf7ffff], drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 0.72 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "A quick, delicate food fish.", captureItem: Item.CaptureOrb,
    discoveryHint: "Scan bright ocean shallows for a thin silver ribbon folding around rocks.",
  },
  reedneedle: {
    kind: "reedneedle", name: "Reedneedle", temperament: "Skittish", hostile: false,
    health: 2, damage: 0, xp: 2, speed: 1.9, chaseSpeed: 3.8, turnRate: 12, attackRange: 0,
    footOffset: 0, radius: 0.12, height: 0.1, habitat: "Deep river channels and reed beds", active: "Morning and rain",
    behavior: "Holds perfectly straight into the current, then darts as a single green shoal when startled.",
    lore: "Anglers used to mistake its shadow for waving grass until the grass swam upstream.",
    colors: [0x698d55, 0xc2d68a, 0x243e35], drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 0.8 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "Its shoals reveal the main current in broad rivers.", captureItem: Item.CaptureOrb,
    discoveryHint: "Watch deep reed channels for grasslike shadows swimming into the current.",
  },
  emberribbon: {
    kind: "emberribbon", name: "Emberribbon", temperament: "Skittish", hostile: false,
    health: 3, damage: 0, xp: 3, speed: 1.55, chaseSpeed: 3.2, turnRate: 9.5, attackRange: 0,
    footOffset: 0, radius: 0.15, height: 0.12, habitat: "Warm reef shelves and volcanic springs", active: "All hours underwater",
    behavior: "Threads through warm coral in loose red shoals and hides inside steam-dark crevices.",
    lore: "Its heat never boils water, but a handful can keep a traveler's fingers warm.",
    colors: [0xe46c45, 0xffc25e, 0x542a2c], drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 0.84 }, { item: Item.GlowScale, min: 1, max: 1, chance: 0.12 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "A warm-water food fish with a rare luminous scale.", captureItem: Item.CaptureOrb,
    discoveryHint: "Search warm reefs and submerged vents for red threads slipping through steam-dark cracks.",
  },
  cavefilament: {
    kind: "cavefilament", name: "Cave Filament", temperament: "Gentle", hostile: false,
    health: 2, damage: 0, xp: 3, speed: 1.2, chaseSpeed: 2.7, turnRate: 8.5, attackRange: 0,
    footOffset: 0, radius: 0.14, height: 0.11, habitat: "Underground water and flooded crystal seams", active: "Darkness underwater",
    behavior: "Suspends in vertical shoals until vibration sends pale lines spiraling through the pool.",
    lore: "Cave Filaments make invisible aquifers readable, sketching every current in living light.",
    colors: [0x6ed6c8, 0xd9fff4, 0x263c5a], drops: [{ item: Item.GlowScale, min: 1, max: 1, chance: 0.55 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "Reveals hidden movement in dark underground pools.", captureItem: Item.CaptureOrb,
    discoveryHint: "Disturb a dark aquifer gently and watch for pale vertical lines beginning to spiral.",
  },
  honeybee: {
    kind: "honeybee", name: "Wild Honeybee", temperament: "Defensive", hostile: false,
    health: 2, damage: 1, xp: 1, speed: 1.55, chaseSpeed: 2.8, turnRate: 11, attackRange: 0.55,
    footOffset: 1.25, radius: 0.12, height: 0.13, habitat: "Flower meadows, orchards and wild apiaries", active: "Daylight",
    behavior: "Selects a flower, lands to gather nectar, and returns to its queen before dusk.",
    lore: "Each worker carries a map of flowers written in sunlight and scent.",
    colors: [0xe8ad32, 0x35291f, 0xf2e4bd], drops: [{ item: Item.Beeswax, min: 1, max: 1, chance: 0.16 }],
    family: "pollinator", movement: "flying", flying: true, persistent: true, utility: "Pollinates crops and returns nectar to a queen.", captureItem: Item.CaptureOrb,
    discoveryHint: "Follow a worker traveling between meadow flowers and a hanging Wild Hive.",
  },
  "hive-queen": {
    kind: "hive-queen", name: "Hive Queen", temperament: "Defensive", hostile: false,
    health: 8, damage: 3, xp: 5, speed: 1.1, chaseSpeed: 2.4, turnRate: 8, attackRange: 0.75,
    footOffset: 1.3, radius: 0.2, height: 0.22, habitat: "Wild hives and stocked apiaries", active: "Daylight",
    behavior: "Builds a colony from as few as zero workers, defends it with a heavy sting, and directs workers home at dusk.",
    lore: "A queen's wingbeat is lower than a worker's and can quiet an entire hive.",
    colors: [0xf0c850, 0x3d2b24, 0xffefaf], drops: [{ item: Item.QueenCell, min: 1, max: 1, chance: 0.28 }, { item: Item.Honeycomb, min: 1, max: 2, chance: 0.65 }],
    family: "pollinator", movement: "flying", flying: true, persistent: true, utility: "Produces workers; containment and a later care bond are separate decisions.",
    sentient: false, tameable: true, tameItems: [Item.RoyalJelly], diet: [Item.RoyalJelly], captureItem: Item.CaptureOrb,
    postTameNotes: "A trusted queen directs her workers to defend the keeper who fed her Royal Jelly.",
    secretHint: "A Capture Orb is reliably ready at 40% health; clean evasion or an accepted Royal Jelly offering can also calm her.",
    discoveryHint: "Listen for a low wingbeat within an occupied Wild Hive or stocked Apiary.",
  },
  "reed-dragonfly": {
    kind: "reed-dragonfly", name: "Reed Dragonfly", temperament: "Skittish", hostile: false,
    health: 2, damage: 0, xp: 1, speed: 2.2, chaseSpeed: 4.4, turnRate: 13, attackRange: 0,
    footOffset: 1.1, radius: 0.19, height: 0.12, habitat: "River ribbons, fen pools and Cloudreed Glens", active: "Warm daylight",
    behavior: "Patrols a short waterline, perches on reed tips, and snaps up tiny insects in abrupt sideways dashes.",
    lore: "Its four glass wings briefly show the color of whatever water lies below.",
    colors: [0x4ab6a0, 0x274958, 0xbdebd9], drops: [],
    family: "pollinator", movement: "flying", flying: true, utility: "A living marker for healthy reeds and insect-rich water.", captureItem: Item.CaptureOrb,
    discoveryHint: "Watch reed tips beside warm, healthy water for four glass wings holding still.",
  },
  "lightning-bug": {
    kind: "lightning-bug", name: "Lightning Bug", temperament: "Gentle", hostile: false,
    health: 1, damage: 0, xp: 1, speed: 1.55, chaseSpeed: 3.1, turnRate: 12.5, attackRange: 0,
    footOffset: 1.05, radius: 0.1, height: 0.11, habitat: "Humid meadows, Siltfen pools and Glimmerwood clearings", active: "Dusk, night and warm rain",
    behavior: "Drifts between flowers in pulsing groups, blinking brighter when another light flashes nearby.",
    lore: "Trailkeepers call their irregular lantern code summer lightning: a storm small enough to hold in one hand.",
    colors: [0x263621, 0xd7ff62, 0xe8f7cc], drops: [],
    family: "pollinator", movement: "flying", flying: true, utility: "Can be caught in a bottle and carried or placed as a gentle living light.", captureItem: Item.CaptureOrb,
    discoveryHint: "Search humid meadows and fen water after sunset for blinking green-gold clusters.",
  },
  peelop: {
    kind: "peelop", name: "Peelop", temperament: "Gentle", hostile: false,
    health: 7, damage: 2, xp: 3, speed: 0.7, chaseSpeed: 2.8, turnRate: 7.8, attackRange: 1.55,
    footOffset: 0.95, radius: 0.42, height: 0.82, habitat: "Sunny orchard hollows and Peelop picnic groves", active: "Day",
    behavior: "A banana-eared rabbit that loafs in shade, sheds ripe bananas, and only leap-attacks after it or its keeper is struck.",
    lore: "Its ears ripen from green to gold. A content Peelop smells faintly of warm bread and bananas.",
    colors: [0xf4d34f, 0xfff0a1, 0x5b3a22], drops: [],
    family: "pet", movement: "ground", persistent: true, utility: "Tameable companion; follows, sits, stays, can be named, fed and bred.",
    sentient: false, tameable: true, tameItems: [Item.Banana, Item.Apple, Item.Berry, Item.Wheat],
    breedable: true, breedingFoods: [Item.Banana], diet: [Item.Banana, Item.Apple, Item.Berry, Item.Wheat],
    postTameNotes: "A trusted Peelop can follow, sit, stay or wander; crouch-use opens its detailed companion commands.",
    secretHint: "Golden Bananas are the quickest path to trust and healthy young.",
    discoveryHint: "Sunny orchard hollows and Peelop picnic groves sometimes shelter a small family.",
  },
  "meadow-cottontail": {
    kind: "meadow-cottontail", name: "Meadow Cottontail", temperament: "Skittish", hostile: false,
    health: 4, damage: 0, xp: 2, speed: 0.88, chaseSpeed: 3.35, turnRate: 9.2, attackRange: 0,
    footOffset: 0.83, radius: 0.31, height: 0.56, habitat: "Flower meadows, orchard edges and open Wildwood", active: "Dawn and daylight",
    behavior: "Nibbles low flowers in family groups, follows a visible Suncrest Carrot, and otherwise escapes in quick zig-zag hops.",
    lore: "Its white tail is an alarm flag shared by the entire warren.", colors: [0xb99878, 0xf0e4d2, 0x251b18],
    drops: [{ item: Item.RawMeat, min: 1, max: 1, chance: 0.55 }, { item: Item.Hide, min: 1, max: 1, chance: 0.18 }],
    family: "rabbit", movement: "ground", sentient: false, tameable: true, tameItems: [Item.SunCarrot], breedable: true,
    breedingFoods: [Item.SunCarrot], diet: [Item.SunCarrot, Item.BluepodBeans, Item.Wheat], captureItem: Item.CaptureOrb, foodLure: true,
    postTameNotes: "A trusted cottontail can follow, sit or wander and remains skittish around hostile creatures.",
    discoveryHint: "Hold a Suncrest Carrot still at the edge of a flower meadow.",
  },
  "russet-rabbit": {
    kind: "russet-rabbit", name: "Russet Rabbit", temperament: "Skittish", hostile: false,
    health: 5, damage: 0, xp: 2, speed: 0.94, chaseSpeed: 3.55, turnRate: 9.6, attackRange: 0,
    footOffset: 0.83, radius: 0.32, height: 0.58, habitat: "Savanna shade, Birchlight scrub and upland fields", active: "Morning and late afternoon",
    behavior: "Freezes against dry brush, then springs for the nearest cover unless tempted by fresh roots.",
    lore: "Russet coats carry the same broken pattern as late-summer soil.", colors: [0x9c5f38, 0xe0a16d, 0x2d1b14],
    drops: [{ item: Item.RawMeat, min: 1, max: 1, chance: 0.62 }, { item: Item.Hide, min: 1, max: 1, chance: 0.22 }],
    family: "rabbit", movement: "ground", sentient: false, tameable: true, tameItems: [Item.SunCarrot, Item.Sunroot], breedable: true,
    breedingFoods: [Item.SunCarrot], diet: [Item.SunCarrot, Item.Sunroot, Item.Wheat], captureItem: Item.CaptureOrb, foodLure: true,
    discoveryHint: "Watch the shade line in savanna scrub during the cooler parts of the day.",
  },
  "frost-hare": {
    kind: "frost-hare", name: "Frost Hare", temperament: "Skittish", hostile: false,
    health: 6, damage: 0, xp: 3, speed: 1.02, chaseSpeed: 3.8, turnRate: 9.4, attackRange: 0,
    footOffset: 0.83, radius: 0.34, height: 0.67, habitat: "Frostpine clearings, Snowcap foothills and snowfields", active: "Cold daylight",
    behavior: "Bounds over powder in long pairs of tracks and approaches only when a traveler holds food without sprinting.",
    lore: "The dark tips of its winter ears are the only parts a snowstorm cannot erase.", colors: [0xe7e6df, 0x8a9097, 0x202329],
    drops: [{ item: Item.RawMeat, min: 1, max: 1, chance: 0.58 }, { item: Item.Hide, min: 1, max: 1, chance: 0.3 }],
    family: "rabbit", movement: "ground", sentient: false, tameable: true, tameItems: [Item.SunCarrot, Item.BluepodBeans], breedable: true,
    breedingFoods: [Item.SunCarrot], diet: [Item.SunCarrot, Item.BluepodBeans, Item.Wheat], captureItem: Item.CaptureOrb, foodLure: true,
    discoveryHint: "Follow paired tracks across an open Frostpine clearing.",
  },
  "chocolate-bunny": {
    kind: "chocolate-bunny", name: "Cocoa Truffle Bunny", temperament: "Skittish", hostile: false,
    health: 4, damage: 0, xp: 3, speed: 0.82, chaseSpeed: 3.1, turnRate: 9, attackRange: 0,
    footOffset: 0.83, radius: 0.31, height: 0.55, habitat: "Sugarplum Vale cocoa gardens and syrup-dry knolls", active: "Clear daylight",
    behavior: "Hides beneath candy shrubs, follows Cocoa Nibs or carrots, and sheds a wrapped chocolate likeness when defeated.",
    lore: "Sugarcourt children insist the tiny bow on its neck grows naturally.", colors: [0x704126, 0xd49a62, 0xffe1df],
    drops: [{ item: Item.ChocolateBunny, min: 1, max: 1, chance: 1 }], family: "rabbit", movement: "ground",
    sentient: false, tameable: true, tameItems: [Item.CocoaNib, Item.SunCarrot], breedable: true,
    breedingFoods: [Item.CocoaNib], diet: [Item.CocoaNib, Item.SunCarrot, Item.PeppermintCane], captureItem: Item.CaptureOrb, foodLure: true,
    postTameNotes: "A trusted Truffle Bunny can follow, sit or wander and never attacks.",
    discoveryHint: "Search the dry knolls between Cocoa Puffs in the Sugarplum Vale.",
  },
  "sunset-sea-slug": seaSlugDefinition("sunset-sea-slug", {
    name: "Sunset Sea Slug", habitat: "Warm ocean shelves and coral gardens",
    behavior: "Undulates its broad ruffled mantle over coral and curls the orange edge inward when startled.",
    lore: "Every individual carries a different horizon of rose, gold and violet along its back.", colors: [0xef6f73, 0xffc65f, 0x4d245f],
    food: Item.LivingCoral, discoveryHint: "Inspect warm coral shelves close to the seafloor.",
  }),
  "moonlace-sea-slug": seaSlugDefinition("moonlace-sea-slug", {
    name: "Moonlace Sea Slug", habitat: "Lumen Trench floors and moonlit deep reefs",
    behavior: "Crawls along mineral seams while a crown of branching gills pulses with quiet blue light.",
    lore: "Atlantian mosaics copy the branching pattern of its mantle, never the other way around.", colors: [0x5965b9, 0xa8e9ee, 0xeaffff],
    food: Item.AbyssBloomNectar, discoveryHint: "Search glowing stone at the bottom of a Lumen Trench.", speed: 0.12,
  }),
  "blue-dragon-sea-slug": seaSlugDefinition("blue-dragon-sea-slug", {
    name: "Blue Dragon Sea Slug", habitat: "Open-ocean surface currents and tide lines",
    behavior: "Drifts belly-up beneath the surface, spreading six cobalt cerata fans like a tiny star.",
    lore: "Stormreaders call it a piece of sky that learned to swim under the sea.", colors: [0x255bb8, 0x8be5ef, 0x102e75],
    food: Item.LumenKelpFrond, discoveryHint: "Watch the underside of calm ocean surfaces after a strong tide.", speed: 0.2, bottomDweller: false,
  }),
  "leafsheep-sea-slug": seaSlugDefinition("leafsheep-sea-slug", {
    name: "Leafsheep Sea Slug", habitat: "Sunlit kelp nurseries and shallow reef grass",
    behavior: "Grazes algae with a bright little face while leaf-shaped cerata store stolen sunlight.",
    lore: "Kelpkeepers swear a content Leafsheep makes nearby fronds lean closer.", colors: [0xf2f0d0, 0x58bd72, 0x173f32],
    food: Item.LumenKelpFrond, discoveryHint: "Look for moving green leaflets on the brightest kelp fronds.",
  }),
  "sea-bunny-nudibranch": seaSlugDefinition("sea-bunny-nudibranch", {
    name: "Sea Bunny Nudibranch", habitat: "Cool reef rubble and sponge gardens",
    behavior: "Noses between stones on two long rhinophores and shakes a soft ring of sensory tufts.",
    lore: "Its resemblance to a rabbit has started arguments in every coastal academy.", colors: [0xf4eee2, 0x2b2c36, 0xf2a8b8],
    food: Item.LivingCoral, discoveryHint: "Search pale sponge gardens where dark ear-like tufts move against the current.",
  }),
  "spanish-dancer-sea-slug": seaSlugDefinition("spanish-dancer-sea-slug", {
    name: "Spanish Dancer Sea Slug", habitat: "Warm reef walls and sheltered ocean caverns",
    behavior: "Crawls with its mantle furled, then throws the entire scarlet skirt into waves when swimming.",
    lore: "Even Atlantian ballroom masters admit the Dancer invented the turn first.", colors: [0xc82f47, 0xff7c52, 0xffd16f],
    food: Item.LivingCoral, discoveryHint: "Look beneath warm reef overhangs for a folded red mantle.", speed: 0.18,
  }),
  "crystal-tipped-nudibranch": seaSlugDefinition("crystal-tipped-nudibranch", {
    name: "Crystal-Tipped Nudibranch", habitat: "Cold deep reefs and glass-coral gardens",
    behavior: "Raises a forest of translucent cerata, each tipped with a violet spark that bends with the current.",
    lore: "The tips are soft tissue, though miners keep trying to appraise them.", colors: [0xd8f5ed, 0x9c7de8, 0x395c72],
    food: Item.AbyssBloomNectar, discoveryHint: "Search cold glass-coral where tiny violet points sway together.", speed: 0.11,
  }),
  "ringed-phyllidia": seaSlugDefinition("ringed-phyllidia", {
    name: "Sunring Phyllidia", habitat: "Tropical coral flats and tideglass shallows",
    behavior: "Moves openly across the reef, advertising its bitter skin with blue ridges and golden rings.",
    lore: "Nothing sensible bites one twice; the rings make sure nothing needs to.", colors: [0x22344a, 0x4bc4dc, 0xffca4f],
    food: Item.LivingCoral, discoveryHint: "Scan exposed tropical reef rock for bright gold rings.",
  }),
  "hooded-melibe": seaSlugDefinition("hooded-melibe", {
    name: "Hooded Melibe", habitat: "Kelp forests and silty deep-ocean gardens",
    behavior: "Sweeps a wide translucent oral hood through the water and snaps it shut around drifting food.",
    lore: "A Melibe hunting in profile resembles a glass lantern trying to swallow the tide.", colors: [0x8ebc9f, 0xd8f0c7, 0x5d6f46],
    food: Item.LumenKelpFrond, discoveryHint: "Watch for a round transparent hood opening between deep kelp stalks.", speed: 0.13,
  }),
  "sea-angel-slug": seaSlugDefinition("sea-angel-slug", {
    name: "Sea Angel Slug", habitat: "Cold open water above the Lumen Trench",
    behavior: "Rows through black water on two glassy parapodia and folds into a falling spark while resting.",
    lore: "It has no halo; the cold blue organs shining through its body were enough for the name.", colors: [0xe9fbff, 0x8dd9ed, 0x36578f],
    food: Item.AbyssBloomNectar, discoveryHint: "Look above the trench floor for a pair of tiny beating wings.", speed: 0.28, bottomDweller: false,
  }),
  "embercrown-sea-slug": seaSlugDefinition("embercrown-sea-slug", {
    name: "Embercrown Sea Slug", habitat: "Volcanic springs and black-sand reef vents",
    behavior: "Browses heat-loving growth while ember-red cerata brighten and dim in a ring down its back.",
    lore: "Its crown is cold to the touch, but few divers trust that fact on first meeting.", colors: [0x2b2931, 0xf05c3c, 0xffc44f],
    food: Item.LivingCoral, discoveryHint: "Search the cool rim of an underwater vent for a moving ember crown.",
  }),
  "kelpwarden-sea-slug": seaSlugDefinition("kelpwarden-sea-slug", {
    name: "Kelpwarden Sea Slug", habitat: "Ancient kelp roots and Atlantian nursery terraces",
    behavior: "Carries leaflike dorsal vanes that mimic young kelp and grazes fouling growth from the holdfasts.",
    lore: "Kelpkeepers leave the oldest specimens undisturbed and call them gardeners, not livestock.", colors: [0x27594b, 0x78bd6a, 0xd3d67a],
    food: Item.LumenKelpFrond, discoveryHint: "Check old kelp holdfasts for leaves moving without a stalk.",
  }),
  "starlight-choir-sea-slug": seaSlugDefinition("starlight-choir-sea-slug", {
    name: "Starlight Choir Sea Slug", habitat: "Lumen Trench crystal choirs and abyss-bloom fields",
    behavior: "Pulses rows of luminous cerata in answer to nearby kin until a whole colony becomes a slow song of light.",
    lore: "No sound is involved, but every observer agrees on where the chorus begins.", colors: [0x312b64, 0x9b8cff, 0xf0e7ff],
    food: Item.AbyssBloomNectar, discoveryHint: "Wait beside a trench bloom until several violet lights answer one another.", speed: 0.1,
  }),
  "voidglass-sea-slug": seaSlugDefinition("voidglass-sea-slug", {
    name: "Voidglass Sea Slug", habitat: "The darkest Lumen Trench mineral seams",
    behavior: "Crawls almost invisibly until its transparent mantle refracts a moving constellation of cold points.",
    lore: "A captured Voidglass appears empty from one angle and full of stars from the next.", colors: [0x15192f, 0x5886aa, 0xbffcff],
    food: Item.AbyssBloomNectar, discoveryHint: "Search for stars that move against the trench current.", speed: 0.09,
  }),
  "pocket-goldfish": {
    kind: "pocket-goldfish", name: "Pocket Goldfish", temperament: "Gentle", hostile: false,
    health: 2, damage: 0, xp: 1, speed: 1.2, chaseSpeed: 1.8, turnRate: 8.5, attackRange: 0,
    footOffset: 0.5, radius: 0.19, height: 0.16, habitat: "Quiet river pools, Moonwells and planted aquariums", active: "Day underwater",
    behavior: "Turns in small, unhurried circles and gathers into a bright shoal around submerged plants.",
    lore: "It was named for size, not because anyone recommends carrying one loose in a pocket.", colors: [0xf19a3e, 0xffd36a, 0x38251d],
    drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 0.35 }], family: "fish", movement: "aquatic", aquatic: true,
    sentient: false, breedable: true, breedingFoods: [Item.BluepodBeans], diet: [Item.BluepodBeans, Item.WheatSeeds], captureItem: Item.CaptureOrb,
    utility: "A one-cell aquarium fish that slowly repopulates below the connected tank cap.",
    discoveryHint: "Look into calm river bends and luminous Moonwell ponds.",
  },
  "sunwheel-angelfish": {
    kind: "sunwheel-angelfish", name: "Sunwheel Angelfish", temperament: "Skittish", hostile: false,
    health: 4, damage: 0, xp: 3, speed: 1.1, chaseSpeed: 2.65, turnRate: 8.2, attackRange: 0,
    footOffset: 0.54, radius: 0.34, height: 0.52, habitat: "Sunlit coral gardens and warm tideglass reefs", active: "Day underwater",
    behavior: "Turns its tall disk to slip between coral fans and displays long golden pennants when schooling.",
    lore: "At noon a shoal becomes a wheel of little suns, flashing one after another through the reef.", colors: [0xf3c34d, 0x2f7184, 0xfff0b0],
    drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 0.7 }], family: "fish", movement: "aquatic", aquatic: true, sentient: false,
    breedable: true, breedingFoods: [Item.LumenKelpFrond], diet: [Item.LumenKelpFrond, Item.WheatSeeds], captureItem: Item.CaptureOrb,
    utility: "A tall reef aquarium fish whose pennants make shoal direction easy to read.", discoveryHint: "Watch the brightest coral gardens around noon.",
  },
  "stonewhisker-loach": {
    kind: "stonewhisker-loach", name: "Stonewhisker Loach", temperament: "Gentle", hostile: false,
    health: 4, damage: 0, xp: 2, speed: 0.78, chaseSpeed: 1.8, turnRate: 6.4, attackRange: 0,
    footOffset: 0.5, radius: 0.3, height: 0.2, habitat: "River cobbles and flooded cave floors", active: "Dusk and darkness underwater",
    behavior: "Rests on broad fins, tastes silt with six whiskers and buries everything but its eyes beneath loose gravel.",
    lore: "Trailkeepers trust a Stonewhisker's clean whiskers as proof that a riverbed has not been poisoned.", colors: [0x6d6959, 0xc4a66a, 0x302f32],
    drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 0.65 }], family: "fish", movement: "aquatic", aquatic: true, bottomDweller: true, sentient: false,
    breedable: true, breedingFoods: [Item.BluepodBeans], diet: [Item.BluepodBeans, Item.WheatSeeds], captureItem: Item.CaptureOrb,
    utility: "A bottom-feeding aquarium fish and living indicator of clean river sediment.", discoveryHint: "Look for whisker tracks between river cobbles at dusk.",
  },
  "reliquary-sentinel": {
    kind: "reliquary-sentinel", name: "Reliquary Sentinel", temperament: "Hostile", hostile: true,
    health: 18, damage: 4, xp: 11, speed: 0.5, chaseSpeed: 1.72, turnRate: 4.8, attackRange: 1.6,
    footOffset: 1.05, radius: 0.5, height: 1.65, habitat: "Desert and forest temple sanctums", active: "When a reliquary is disturbed",
    behavior: "Sleeps as a carved idol, unfolds when a chest is opened, and guards the room with heavy sunlit strikes.",
    lore: "Two vanished orders carved the same guardian in different stone. Neither admitted learning from the other.",
    colors: [0x8d7a62, 0x4f7555, 0xffd36c], drops: [{ item: Item.CrystalShard, min: 1, max: 2, chance: 0.62 }, { item: Item.GoldIngot, min: 1, max: 1, chance: 0.22 }],
    family: "construct", movement: "ground", utility: "Temple guardian and source of rare crystal or gold salvage.",
    discoveryHint: "Open a guarded temple reliquary and watch the carved idol rather than the chest.",
  },
  skeleton: {
    kind: "skeleton", name: "Skeleton Archer", temperament: "Hostile", hostile: true,
    health: 10, damage: 2, xp: 7, speed: 0.72, chaseSpeed: 1.45, turnRate: 6.2, attackRange: 12,
    footOffset: 1.03, radius: 0.38, height: 1.8, habitat: "Ruins, caves and the night surface", active: "Darkness",
    behavior: "Keeps its distance, draws a visible bone bow, and leads moving targets with arcing arrows.",
    lore: "A patient hunter held together by old cord and an even older grudge.",
    colors: [0xd9d1bb, 0x6e604c, 0x26211d], drops: [{ item: Item.BoneShard, min: 1, max: 3, chance: 1 }, { item: Item.Stick, min: 1, max: 2, chance: 0.4 }],
    family: "undead", movement: "ground", ranged: true, utility: "Ranged night enemy whose arrows provide readable, avoidable pressure.",
    discoveryHint: "Look along ruined walls and dark cave ledges for the pale curve of a drawn bow.",
  },
  "hobbit-mayor": {
    kind: "hobbit-mayor", name: "Hobbit Hearthwarden", temperament: "Gentle", hostile: false,
    health: 16, damage: 2, xp: 0, speed: 0.58, chaseSpeed: 1.8, turnRate: 6.2, attackRange: 1.3,
    footOffset: 0.7604, radius: 0.34, height: 1.32, habitat: "Hobbit settlement hearth-halls", active: "Day; appoints a successor at eight in the morning",
    behavior: "Keeps near the settlement hall, hears claims and contracts, and flees toward guards when badly hurt.",
    lore: "A Hearthwarden carries the town ledger and the names of every family who helped raise its walls.",
    colors: [0x7a4667, 0xd1a86f, 0x2d211b], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "hobbits", role: "mayor", profession: "Hearthwarden", tradeSpecialty: "Town charters, civic work and trusted hires",
    utility: "Settlement leader for claims, hiring and high-trust civic quests.", discoveryHint: "A tall round-doored hearth-hall marks the center of a Hobbit settlement.",
  },
  "hobbit-farmer": {
    kind: "hobbit-farmer", name: "Hobbit Tiller", temperament: "Gentle", hostile: false,
    health: 11, damage: 1, xp: 0, speed: 0.56, chaseSpeed: 1.72, turnRate: 6, attackRange: 1.2,
    footOffset: 0.7604, radius: 0.33, height: 1.28, habitat: "Hobbit field terraces and orchards", active: "Dawn through dusk",
    behavior: "Tends nearby crops, carries produce between fields and stores, visits neighbors, and sleeps after sunset.",
    lore: "Tiller aprons collect seeds, flour, gossip, and at least one stone that looked useful at the time.",
    colors: [0x6d8b49, 0xd5b56d, 0x302116], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "hobbits", role: "farmer", profession: "Tiller", tradeSpecialty: "Crops, seeds, fruit and seasonal food",
    utility: "Buys farm goods eagerly and offers harvest-side work.", discoveryHint: "Look for fenced terraces and broad round-roofed barns.",
  },
  "hobbit-miner": {
    kind: "hobbit-miner", name: "Hobbit Delver", temperament: "Defensive", hostile: false,
    health: 13, damage: 2, xp: 0, speed: 0.54, chaseSpeed: 1.7, turnRate: 5.8, attackRange: 1.25,
    footOffset: 0.7604, radius: 0.34, height: 1.3, habitat: "Hobbit quarries, cellars and stone yards", active: "Day",
    behavior: "Moves ore and stone between the mine shed and workshops, sheltering near guards when monsters approach.",
    lore: "Delvers tap every beam twice: once for safety, and once so the mountain knows they asked politely.",
    colors: [0x66737d, 0xc99a55, 0x2b2119], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "hobbits", role: "miner", profession: "Delver", tradeSpecialty: "Stone, coal, ore and mining supplies",
    utility: "Trades raw materials and posts quarry contracts.", discoveryHint: "Stone yards and timber-braced cellar mouths sit near upland Hobbit towns.",
  },
  "hobbit-merchant": {
    kind: "hobbit-merchant", name: "Hobbit Provisioner", temperament: "Gentle", hostile: false,
    health: 11, damage: 1, xp: 0, speed: 0.55, chaseSpeed: 1.7, turnRate: 6.2, attackRange: 1.2,
    footOffset: 0.7604, radius: 0.34, height: 1.29, habitat: "Hobbit markets and roadside inns", active: "Day and early evening",
    behavior: "Circulates between market stalls, assesses any ordinary item, and pays more for what the settlement currently needs.",
    lore: "Provisioners remember the fair price of a sack of onions from years before either trader was born.",
    colors: [0xb06b45, 0xe0bd75, 0x2d1d18], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "hobbits", role: "merchant", profession: "Provisioner", tradeSpecialty: "General goods, mead and settlement demand",
    utility: "General Skyrim-style buyer and seller with finite, restocking gold.", discoveryHint: "Canvas awnings and stacked barrels identify the market lane.",
  },
  "hobbit-banker": {
    kind: "hobbit-banker", name: "Hobbit Goldkeeper", temperament: "Gentle", hostile: false,
    health: 12, damage: 1, xp: 0, speed: 0.5, chaseSpeed: 1.62, turnRate: 5.8, attackRange: 1.2,
    footOffset: 0.7604, radius: 0.34, height: 1.28, habitat: "Hobbit counting houses", active: "Day",
    behavior: "Works at a secured counter, manages deposits and investments, and returns home under guard after closing.",
    lore: "Goldkeepers measure wealth in promises kept, though their ledgers remain extremely particular about the gold.",
    colors: [0x385f64, 0xd7b35e, 0x261e18], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "hobbits", role: "banker", profession: "Goldkeeper", tradeSpecialty: "Gold deposits, daily interest and investments",
    utility: "Opens the settlement banking and investment ledger.", discoveryHint: "The counting house has brass-bound doors and a gold acorn sign.",
  },
  "hobbit-hammer-guard": {
    kind: "hobbit-hammer-guard", name: "Hobbit Hammerguard", temperament: "Defensive", hostile: false,
    health: 20, damage: 5, xp: 0, speed: 0.68, chaseSpeed: 2.55, turnRate: 7.2, attackRange: 1.7,
    footOffset: 0.7604, radius: 0.38, height: 1.34, habitat: "Hobbit gates, walls and patrol lanes", active: "All shifts",
    behavior: "Patrols gates, intercepts monsters and faction enemies, and keeps its square-headed hammer projected ahead in a ready stance.",
    lore: "A Hammerguard learns every loose stone in the wall and every child who uses the gate as a shortcut.",
    colors: [0x854d3f, 0xd2aa66, 0x201813], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "hobbits", role: "guard", profession: "Hammerguard", tradeSpecialty: "Local defense",
    utility: "Melee settlement defender equipped with a compact war hammer.", discoveryHint: "Hammerguards favor the main gate and wall walk.",
  },
  "hobbit-crossbow-guard": {
    kind: "hobbit-crossbow-guard", name: "Hobbit Boltwatch", temperament: "Defensive", hostile: false,
    health: 17, damage: 5, xp: 0, speed: 0.62, chaseSpeed: 2.15, turnRate: 7.5, attackRange: 14,
    footOffset: 0.7604, radius: 0.36, height: 1.33, habitat: "Hobbit gate towers and rooftops", active: "All shifts",
    behavior: "Watches road approaches, shoulders a compact crossbow, and fires visible bolts past civilians only when it has a clear line.",
    lore: "Boltwatches carve one small leaf into a stock for every winter their town has stood unbreached.",
    colors: [0x496b4e, 0xbd8d4f, 0x251b15], drops: [], family: "sentient", movement: "ground", persistent: true, ranged: true,
    sentient: true, faction: "hobbits", role: "guard", profession: "Boltwatch", tradeSpecialty: "Gate defense and crossbow training",
    utility: "Ranged settlement defender using the same readable bolt path as player crossbows.", discoveryHint: "Look along gatehouse balconies for green hooded sentries.",
  },
  "goblin-chieftain": {
    kind: "goblin-chieftain", name: "Goblin Roadboss", temperament: "Defensive", hostile: false,
    health: 19, damage: 4, xp: 0, speed: 0.72, chaseSpeed: 2.45, turnRate: 7, attackRange: 1.5,
    footOffset: 0.88, radius: 0.36, height: 1.5, habitat: "Goblin longhouses and road forts", active: "Day and evening",
    behavior: "Directs patrols from the longhouse, negotiates with trusted outsiders, and chooses force quickly when relations collapse.",
    lore: "A Roadboss earns the iron key-ring by keeping paths open, fires fed, and rival bosses at a useful distance.",
    colors: [0x733c35, 0xb07a3d, 0xf1d45e], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "goblins", role: "chieftain", profession: "Roadboss", tradeSpecialty: "Town authority, mercenaries and faction contracts",
    utility: "Goblin settlement leader for claims, hiring and high-trust work.", discoveryHint: "A bannered longhouse rises behind the main palisade gate.",
  },
  "goblin-worker": {
    kind: "goblin-worker", name: "Goblin Grower", temperament: "Defensive", hostile: false,
    health: 11, damage: 2, xp: 0, speed: 0.68, chaseSpeed: 2, turnRate: 7.2, attackRange: 1.25,
    footOffset: 0.88, radius: 0.34, height: 1.45, habitat: "Goblin fungus yards and terrace fields", active: "Dawn through dusk",
    behavior: "Tends hardy crops, hauls supplies, chats around work fires, and defends itself only after being badly wounded.",
    lore: "Growers know which mushrooms cure a stew and which ones convince the stew to leave the pot.",
    colors: [0x69713d, 0xb38143, 0xebcf52], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "goblins", role: "worker", profession: "Grower", tradeSpecialty: "Fungus, roots, fiber and common supplies",
    utility: "Produces food and offers practical settlement errands.", discoveryHint: "Smoke, mushroom racks and terraced root beds mark working yards.",
  },
  "goblin-miner": {
    kind: "goblin-miner", name: "Goblin Sparkdelver", temperament: "Defensive", hostile: false,
    health: 14, damage: 3, xp: 0, speed: 0.66, chaseSpeed: 2.05, turnRate: 6.8, attackRange: 1.3,
    footOffset: 0.88, radius: 0.35, height: 1.47, habitat: "Goblin mines, slag heaps and smith yards", active: "Day and late evening",
    behavior: "Moves between mine and forge, tests ore against a chipped pick, and sells raw materials from a limited stock.",
    lore: "Sparkdelvers name promising rock seams and apologize when the seam turns out to be ordinary dirt.",
    colors: [0x495766, 0x9c7244, 0xf2d45f], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "goblins", role: "miner", profession: "Sparkdelver", tradeSpecialty: "Ore, coal, flint and tools",
    utility: "Primary Goblin raw-material trader.", discoveryHint: "Follow cart grooves toward a roofed mine mouth and slag piles.",
  },
  "goblin-alchemist": {
    kind: "goblin-alchemist", name: "Goblin Bottlesage", temperament: "Defensive", hostile: false,
    health: 12, damage: 3, xp: 0, speed: 0.65, chaseSpeed: 1.95, turnRate: 7.4, attackRange: 5,
    footOffset: 0.88, radius: 0.34, height: 1.49, habitat: "Goblin markets and smoking bottle shops", active: "Late morning through nightfall",
    behavior: "Trades general goods and alchemical stock, checks bubbling bottles, and throws a weak defensive flask when cornered.",
    lore: "Bottlesages label every mixture. Whether anyone else can read the labels is considered a separate craft.",
    colors: [0x5c3f72, 0x9e7d44, 0xf6dc66], drops: [], family: "sentient", movement: "ground", persistent: true, ranged: true,
    sentient: true, faction: "goblins", role: "alchemist", profession: "Bottlesage", tradeSpecialty: "General goods, potion blueprints and strange reagents",
    utility: "Goblin merchant with special alchemy stock.", discoveryHint: "Colored bottle lanterns and violet smoke mark a Bottlesage shop.",
  },
  "goblin-spear-guard": {
    kind: "goblin-spear-guard", name: "Goblin Spearwarden", temperament: "Defensive", hostile: false,
    health: 18, damage: 5, xp: 0, speed: 0.78, chaseSpeed: 2.75, turnRate: 8, attackRange: 2.25,
    footOffset: 0.88, radius: 0.37, height: 1.52, habitat: "Goblin palisade gates and road patrols", active: "All shifts",
    behavior: "Patrols with Wargs, braces a long spear through gate openings, and closes ranks around civilians during attacks.",
    lore: "Spearwardens keep bright ribbons below each spearhead so allies can read a patrol through dust and rain.",
    colors: [0x68412f, 0xc0643e, 0xf4d75a], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "goblins", role: "guard", profession: "Spearwarden", tradeSpecialty: "Gate defense and spear training",
    utility: "Reach-focused Goblin defender whose spear clearly projects ahead of its hands.", discoveryHint: "Red spear pennants move along Goblin walls and gate roads.",
  },
  warg: {
    kind: "warg", name: "Road Warg", temperament: "Defensive", hostile: false,
    health: 18, damage: 5, xp: 7, speed: 0.9, chaseSpeed: 4.25, turnRate: 7.4, attackRange: 1.55,
    footOffset: 1.2, radius: 0.68, height: 1.28, habitat: "Goblin roads, scrubland forts and rare feral upland packs", active: "Dusk, night and patrol shifts",
    behavior: "Runs in coordinated patrol pairs, snaps at faction enemies, and refuses bonding while sworn to a settlement.",
    lore: "A Warg remembers every road it has guarded and every rider who treated it as a partner rather than a tool.",
    colors: [0x4d5148, 0x8a6b45, 0xe5c25a], drops: [{ item: Item.Hide, min: 1, max: 3, chance: 0.8 }, { item: Item.RawMeat, min: 1, max: 2, chance: 0.62 }],
    family: "mount", movement: "ground", persistent: true, sentient: false, factionAffinity: "goblins", tameRequiresUnaligned: true,
    tameable: true, tameItems: [Item.WargFeed, Item.RawMeat, Item.CookedMeat], breedable: true, breedingFoods: [Item.WargFeed, Item.RawMeat], diet: [Item.WargFeed, Item.RawMeat, Item.CookedMeat], rideable: true,
    postTameNotes: "Only an unaligned Warg can bond. A trusted, saddled Warg accepts a rider and keeps its bite available in combat.",
    secretHint: "Settlement patrol Wargs are faction-aligned and cannot be tamed; unaligned specimens from rare orbs can be befriended with meat.",
    utility: "Fast combat-capable mount when unaligned, bonded and saddled.", discoveryHint: "Look for paired tracks beside Goblin patrol roads.",
  },
  burrowbell: {
    kind: "burrowbell", name: "Burrowbell", temperament: "Skittish", hostile: false,
    health: 6, damage: 0, xp: 3, speed: 0.55, chaseSpeed: 2.7, turnRate: 8.5, attackRange: 0,
    footOffset: 0.96, radius: 0.4, height: 0.72, habitat: "Sunny upland meadows and grassy town margins", active: "Morning and late afternoon",
    behavior: "Forages in small family rings, stands upright to whistle at danger, then vanishes into the nearest burrow.",
    lore: "Its hollow tail tip makes a faint bell note when the whole colony races underground.",
    colors: [0xaa7c4f, 0xe3c18a, 0x281d18], drops: [{ item: Item.Fiber, min: 1, max: 1, chance: 0.28 }],
    family: "surface", movement: "ground", sentient: false, breedable: true, breedingFoods: [Item.Berry], diet: [Item.Berry, Item.Wheat],
    utility: "Whistles when hostile creatures approach open grass.", discoveryHint: "Small round burrows and lookout stones dot quiet upland meadows.",
  },
  "dewback-tapir": {
    kind: "dewback-tapir", name: "Dewback Tapir", temperament: "Gentle", hostile: false,
    health: 14, damage: 2, xp: 5, speed: 0.52, chaseSpeed: 2.2, turnRate: 4.6, attackRange: 1.2,
    footOffset: 1.095, radius: 0.68, height: 1.18, habitat: "Rain-dark forest pools and broad Siltfen banks", active: "Rain, dawn and dusk",
    behavior: "Browses low leaves in family pairs, wallows at shallow banks, and shoulder-checks only when a calf is threatened.",
    lore: "Water beads on the pale saddle of its back, carrying seeds until the animal brushes through new ground.",
    colors: [0x564238, 0xc8a986, 0x211a18], drops: [{ item: Item.Hide, min: 1, max: 3, chance: 0.7 }, { item: Item.RawMeat, min: 1, max: 3, chance: 0.76 }],
    family: "surface", movement: "ground", sentient: false, breedable: true, breedingFoods: [Item.Apple], diet: [Item.Apple, Item.Berry, Item.Wheat],
    utility: "Carries wetland seeds between pools and can expose buried roots while browsing.", discoveryHint: "Wide three-toed tracks connect shaded forest pools after rain.",
  },
  "redfin-salmon": {
    kind: "redfin-salmon", name: "Redfin Salmon", temperament: "Skittish", hostile: false,
    health: 4, damage: 0, xp: 3, speed: 1.75, chaseSpeed: 3.8, turnRate: 9, attackRange: 0,
    footOffset: 0, radius: 0.24, height: 0.22, habitat: "Cool rivers and forest tributaries", active: "Morning, rain and seasonal upstream runs",
    behavior: "Holds in small schools below falls, then surges upstream through clear channels.",
    lore: "Its red fins brighten on the long route home, sketching living arrows through a river.",
    colors: [0x8397a2, 0xc74f45, 0x172932], drops: [{ item: Item.RawFish, min: 1, max: 2, chance: 1 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "A sturdy river food fish.", captureItem: Item.CaptureOrb,
    discoveryHint: "Wait below a clear river fall during rain for red fins pressing upstream.",
  },
  "blue-mackerel": {
    kind: "blue-mackerel", name: "Blue Mackerel", temperament: "Skittish", hostile: false,
    health: 3, damage: 0, xp: 2, speed: 1.95, chaseSpeed: 4.15, turnRate: 11, attackRange: 0,
    footOffset: 0, radius: 0.22, height: 0.18, habitat: "Open ocean shelves and deep coastal water", active: "Daylight underwater",
    behavior: "Forms tight striped schools that roll together when larger shadows pass overhead.",
    lore: "A turning school flashes blue like rain seen from below the sea.",
    colors: [0x356c94, 0xc7d6ce, 0x152838], drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 1 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "A common ocean food fish.", captureItem: Item.CaptureOrb,
    discoveryHint: "Look below open ocean shelves for striped schools rolling beneath passing shadows.",
  },
  "deepwater-shark": {
    kind: "deepwater-shark", name: "Slatefin Shark", temperament: "Hostile", hostile: true,
    health: 22, damage: 5, xp: 10, speed: 1.25, chaseSpeed: 3.45, turnRate: 4.8, attackRange: 1.55,
    footOffset: 0, radius: 0.86, height: 0.78, habitat: "Deep ocean beyond coastal shelves", active: "All hours underwater",
    behavior: "Cruises alone below shoals, investigates swimmers, and deliberately ignores occupied boats.",
    lore: "Slatefins follow the cool seam below storms. Sailors fear them less than an ocean suddenly empty of them.",
    colors: [0x405766, 0xb7c5c4, 0xe6edf0], drops: [{ item: Item.RawFish, min: 2, max: 4, chance: 1 }, { item: Item.BoneShard, min: 1, max: 2, chance: 0.36 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "A sparse deep-ocean predator that never attacks players seated in boats.",
    discoveryHint: "Watch the dark water below large offshore shoals.",
  },
  "sunwash-crab": {
    kind: "sunwash-crab", name: "Sunwash Crab", temperament: "Defensive", hostile: false,
    health: 5, damage: 1, xp: 2, speed: 0.42, chaseSpeed: 1.7, turnRate: 8.5, attackRange: 0.75,
    footOffset: 0.89742, radius: 0.36, height: 0.38, habitat: "Sunwash Coast tide pools and bright sand shelves", active: "Daylight and low tide",
    behavior: "Scuttles sideways between tide pools, raises both claws when cornered, and buries itself during hard weather.",
    lore: "Every shell carries a different sunburst. Coast children compare them like tiny heraldry.",
    colors: [0xe68a55, 0xf4c87a, 0x2d2a38], drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 0.45 }, { item: Item.Flint, min: 1, max: 1, chance: 0.14 }],
    family: "surface", movement: "ground", utility: "A small coastal food source whose burrows mark safe tide-pool shelves.",
    discoveryHint: "Look for paired tracks around Sunwash Coast tide pools.",
  },
  "tideglass-crab": {
    kind: "tideglass-crab", name: "Tideglass Crab", temperament: "Defensive", hostile: false,
    health: 7, damage: 1, xp: 3, speed: 0.68, chaseSpeed: 2.05, turnRate: 9.4, attackRange: 0.82,
    footOffset: 0, radius: 0.43, height: 0.4, habitat: "Tidelight Shelf seafloors, kelp beds and shallow reef ledges", active: "All hours underwater",
    behavior: "Scuttles along the sea floor, fans luminous paddles through sand, and raises asymmetrical crystal claws when cornered.",
    lore: "Its shell grows a thin tideglass window that catches moonlight even several fathoms below the surface.",
    colors: [0x2d8190, 0x78ddd1, 0xc8fff2], drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 0.35 }, { item: Item.GlowScale, min: 1, max: 1, chance: 0.12 }],
    family: "fish", movement: "aquatic", aquatic: true, captureItem: Item.CaptureOrb,
    utility: "A seafloor scavenger whose glow marks shallow reef shelves.", discoveryHint: "Look below kelp shadows for a moving turquoise star on the sand.",
  },
  "reefglide-terrapin": {
    kind: "reefglide-terrapin", name: "Reefglide Terrapin", temperament: "Gentle", hostile: false,
    health: 16, damage: 0, xp: 5, speed: 0.88, chaseSpeed: 2.2, turnRate: 6.4, attackRange: 0,
    footOffset: 0, radius: 0.68, height: 0.42, habitat: "Tidelight Shelf lagoons, seagrass beds and warm reef arches", active: "Daylight underwater",
    behavior: "Rows with long front flippers, grazes seagrass, and wedges its low coral shell beneath reef arches to sleep.",
    lore: "Each shell garden grows from fragments collected along a decades-long circuit of the coast.",
    colors: [0x397d75, 0xd48f72, 0xbff8dc], drops: [{ item: Item.RawFish, min: 1, max: 2, chance: 0.46 }, { item: Item.CrystalShard, min: 1, max: 1, chance: 0.08 }],
    family: "fish", movement: "aquatic", aquatic: true, sentient: false, breedable: true, breedingFoods: [Item.Berry], diet: [Item.Berry, Item.Wheat], captureItem: Item.CaptureOrb,
    utility: "Its grazing keeps shallow seagrass paths open.", discoveryHint: "Search beneath warm reef arches for a moving coral mosaic.",
  },
  "tidewing-gull": {
    kind: "tidewing-gull", name: "Tidewing Gull", temperament: "Skittish", hostile: false,
    health: 4, damage: 0, xp: 2, speed: 1.4, chaseSpeed: 4.4, turnRate: 10.5, attackRange: 0,
    footOffset: 1.25, radius: 0.31, height: 0.48, habitat: "Sunwash Coast cliffs, beaches and fishing water", active: "Daylight",
    behavior: "Rides sea wind in broad circles, lands near shoals, and noisily flees anyone who rushes its perch.",
    lore: "A Tidewing's cry arrives before the coast itself, carrying over dunes and salt grass.",
    colors: [0xe8eee9, 0x6d9db0, 0x171f31], drops: [{ item: Item.Feather, min: 1, max: 2, chance: 1 }],
    family: "bird", movement: "flying", flying: true, breedable: true, breedingFoods: [Item.RawFish], diet: [Item.RawFish],
    utility: "Circling flocks point toward fish-rich water and nearby coast.", discoveryHint: "Listen for sharp calls above Sunwash cliffs.",
  },
  glassfin: {
    kind: "glassfin", name: "Glassfin", temperament: "Skittish", hostile: false,
    health: 3, damage: 0, xp: 3, speed: 1.75, chaseSpeed: 4.1, turnRate: 11, attackRange: 0,
    footOffset: 0, radius: 0.26, height: 0.2, habitat: "Deep ocean thermoclines and Lumen Trenches", active: "All hours underwater",
    behavior: "Schools in translucent spirals and scatters into dim prismatic flashes when a large shape approaches.",
    lore: "Its clear fins catch colors the surface never sees.",
    colors: [0x7db8c8, 0xa9ecdf, 0xdffcff], drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 0.9 }, { item: Item.GlowScale, min: 1, max: 1, chance: 0.18 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "A luminous deep-water food fish and future alchemy reagent.", captureItem: Item.CaptureOrb,
    discoveryHint: "Watch for faint rainbow turns beneath the last blue light.",
  },
  lanternjaw: {
    kind: "lanternjaw", name: "Lanternjaw", temperament: "Defensive", hostile: false,
    health: 8, damage: 2, xp: 5, speed: 0.82, chaseSpeed: 2.65, turnRate: 7, attackRange: 0.95,
    footOffset: 0, radius: 0.48, height: 0.42, habitat: "Lumen Trench ledges and deep reef caves", active: "Darkness underwater",
    behavior: "Hovers beneath overhangs, pulses its jaw-lights to communicate, and snaps only after its hiding place is invaded.",
    lore: "The pattern under its jaw is a name, warning and love song written in blue fire.",
    colors: [0x233c52, 0x59d7bf, 0xb8fff0], drops: [{ item: Item.RawFish, min: 1, max: 2, chance: 1 }, { item: Item.GlowScale, min: 1, max: 2, chance: 0.7 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "A strong renewable source of Glow Scales.", captureItem: Item.CaptureOrb,
    discoveryHint: "Blue jaw-signals blink beneath Lumen Trench overhangs.",
  },
  "abyss-skater": {
    kind: "abyss-skater", name: "Abyss Skater", temperament: "Defensive", hostile: false,
    health: 14, damage: 3, xp: 7, speed: 0.48, chaseSpeed: 1.9, turnRate: 6.5, attackRange: 1.15,
    footOffset: 0, radius: 0.92, height: 0.38, habitat: "Deep sea floor, trench silt and whale-fall gardens", active: "All hours underwater",
    behavior: "Walks on six luminous stilts over silt, filters drifting scraps, and fans a cold warning halo when touched.",
    lore: "Abyss Skaters cross the dark floor without leaving a track, carrying gardens of tiny lights beneath them.",
    colors: [0x342a55, 0x5ce0d0, 0xe9fff2], drops: [{ item: Item.CaveGel, min: 1, max: 2, chance: 0.72 }, { item: Item.GlowDust, min: 1, max: 2, chance: 0.52 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "Its luminous filter fans provide future deep-water ingredients.",
    discoveryHint: "Look for six moving pin-lights across flat trench silt.",
  },
  dreadcoil: {
    kind: "dreadcoil", name: "Dreadcoil", temperament: "Hostile", hostile: true,
    health: 52, damage: 9, xp: 18, speed: 1.15, chaseSpeed: 3.25, turnRate: 4.3, attackRange: 2.25,
    footOffset: 0, radius: 1.45, height: 1.2, habitat: "Rare deep-ocean ravines and the edges of Lumen Trenches", active: "Night and deep darkness",
    behavior: "Hides its long body along ravine walls, detects swimmers before boats, then attacks in one committed spiraling rush.",
    lore: "Old sailors call a sudden ring of silent fish a Dreadcoil's crown.",
    colors: [0x1e2438, 0x7d315a, 0xff7b9b], drops: [{ item: Item.RawFish, min: 3, max: 6, chance: 1 }, { item: Item.ShadowShard, min: 1, max: 3, chance: 0.68 }],
    family: "fish", movement: "aquatic", aquatic: true, utility: "A rare serious sea encounter with valuable shadow-rich remains.",
    discoveryHint: "An unnaturally empty ring in a deep shoal may be its hunting ground.",
  },
  tidepup: {
    kind: "tidepup", name: "Tidepup", temperament: "Gentle", hostile: false,
    health: 10, damage: 1, xp: 5, speed: 1.05, chaseSpeed: 3.45, turnRate: 9.5, attackRange: 0.9,
    footOffset: 0, radius: 0.48, height: 0.52, habitat: "Kelp shelves, warm reefs and quiet Atlantian outskirts", active: "Day and dusk underwater",
    behavior: "Chases bubbles, naps in kelp, brings dropped shells to patient swimmers, and flees rather than fighting.",
    lore: "A Tidepup recognizes a familiar swimmer by heartbeat before face.",
    colors: [0x4da6a8, 0xa7dfc5, 0x132d43], drops: [{ item: Item.RawFish, min: 1, max: 1, chance: 0.45 }],
    family: "pet", movement: "aquatic", aquatic: true, persistent: true, tameable: true, tameItems: [Item.RawFish, Item.GlowScale],
    breedable: true, breedingFoods: [Item.RawFish], diet: [Item.RawFish, Item.CookedFish, Item.GlowScale], captureItem: Item.CaptureOrb,
    postTameNotes: "A bonded Tidepup follows through water, waits near shore, and retrieves nearby floating drops.",
    utility: "A gentle sea companion and underwater item retriever.", discoveryHint: "Bubbles moving against the current often reveal a playful Tidepup.",
  },
  sakurakit: {
    kind: "sakurakit", name: "Sakurakit", temperament: "Skittish", hostile: false,
    health: 6, damage: 1, xp: 3, speed: 0.72, chaseSpeed: 2.85, turnRate: 8.5, attackRange: 0.72,
    footOffset: 0.94, radius: 0.35, height: 0.7, habitat: "Pink forest glades, Bloomwood edges and quiet orchards", active: "Day and blossom dusk",
    behavior: "Pounces on falling petals, hides in low blossoms, and follows trusted keepers without seeking fights.",
    lore: "Its tail keeps one blossom through every season. Nobody has seen it fall.",
    colors: [0xf0a6c2, 0xffe0d6, 0x3d2753], drops: [{ item: Item.Fiber, min: 1, max: 1, chance: 0.22 }],
    family: "pet", movement: "ground", persistent: true, tameable: true, tameItems: [Item.Berry, Item.Apple],
    breedable: true, breedingFoods: [Item.Berry], diet: [Item.Berry, Item.Apple], captureItem: Item.CaptureOrb,
    postTameNotes: "Sakurakits can sit, follow, stay and wander. They warn their keeper, but remain intentionally weak in combat.",
    utility: "A quiet companion that notices nearby flowers and butterflies.", discoveryHint: "Follow low swirls of pink petals through a blossom glade.",
  },
  "taffy-hound": {
    kind: "taffy-hound", name: "Taffy Hound", temperament: "Defensive", hostile: false,
    health: 12, damage: 2, xp: 4, speed: 0.82, chaseSpeed: 3.55, turnRate: 9.2, attackRange: 0.92,
    footOffset: 0.91, radius: 0.42, height: 0.78, habitat: "Sugarcourt kennels, hard-candy gates and Bonbon Borough lanes", active: "Day and settlement watch shifts",
    behavior: "Patrols beside Sugarcourt guards, wags a curled licorice tail at friends, and challenges danger without straying far from its borough.",
    lore: "Every Taffy Hound is given a collar pressed with its borough's crest. The sweet is ceremonial; the loyalty is entirely real.",
    colors: [0xd96f9f, 0xf2c76e, 0x30213c], drops: [],
    family: "pet", movement: "ground", persistent: true, sentient: false, factionAffinity: "sugarcourt", tameRequiresUnaligned: true,
    tameable: true, tameItems: [Item.Gumdrop, Item.PeppermintCane], breedable: true, breedingFoods: [Item.Gumdrop],
    diet: [Item.Gumdrop, Item.PeppermintCane, Item.CookedMeat], captureItem: Item.CaptureOrb,
    postTameNotes: "Only an unaligned Taffy Hound can bond. A trusted hound follows, holds position, wanders on command, and bravely nips at threats to its keeper.",
    secretHint: "Borough hounds are faction-aligned and cannot be tamed. Sugarcourt Kennelkeepers sometimes sell neutral youngsters in Capture Orbs.",
    utility: "A loyal, low-damage companion and warning dog.", discoveryHint: "Listen for candy-tag collars clicking near Sugarcourt gates.",
  },
  "praline-cat": {
    kind: "praline-cat", name: "Praline Cat", temperament: "Skittish", hostile: false,
    health: 7, damage: 1, xp: 3, speed: 0.76, chaseSpeed: 3.2, turnRate: 10.5, attackRange: 0.68,
    footOffset: 0.88, radius: 0.33, height: 0.62, habitat: "Sugarcourt homes, sweet markets and warm Sugarworks counters", active: "Day, dusk and inconvenient moments",
    behavior: "Stretches across warm counters, pounces on loose sprinkles, and slips behind furniture when fighting reaches the market.",
    lore: "Praline Cats always smell faintly toasted. Sugarboilers insist this proves they understand quality control.",
    colors: [0x8c573e, 0xe0a15e, 0xffefc1], drops: [],
    family: "pet", movement: "ground", persistent: true, sentient: false, factionAffinity: "sugarcourt", tameRequiresUnaligned: true,
    tameable: true, tameItems: [Item.SyrupfinFillet, Item.RawFish], breedable: true, breedingFoods: [Item.SyrupfinFillet],
    diet: [Item.SyrupfinFillet, Item.RawFish, Item.CookedFish], captureItem: Item.CaptureOrb,
    postTameNotes: "An unaligned Praline Cat can sit, follow, hold or wander. It avoids serious fights but alerts its keeper to nearby tiny creatures.",
    secretHint: "Village cats remain loyal to the Sugarcourt. Kennelkeepers occasionally sell neutral cats in filled Capture Orbs.",
    utility: "A gentle decorative companion that notices small fauna.", discoveryHint: "Look on warm counters and candywood shelves inside Bonbon Boroughs.",
  },
  "rimecoat-hound": {
    kind: "rimecoat-hound", name: "Rimecoat Hound", temperament: "Defensive", hostile: false,
    health: 13, damage: 2, xp: 4, speed: 0.78, chaseSpeed: 3.7, turnRate: 8.8, attackRange: 0.95,
    footOffset: 0.94, radius: 0.45, height: 0.82, habitat: "Frostpine trails, Snowfield drifts and sheltered Snowcap passes", active: "Day and snowfall",
    behavior: "Travels in small family groups, noses through fresh powder, and plants itself between a trusted keeper and danger.",
    lore: "Its double coat sheds frost in silver flakes. Deepgear caravans trust a Rimecoat's nose when whiteout winds erase the road.",
    colors: [0xb9cbd0, 0xe9f2ee, 0x26384a], drops: [{ item: Item.Fiber, min: 1, max: 2, chance: 0.32 }],
    family: "pet", movement: "ground", persistent: true, tameable: true, tameItems: [Item.CookedMeat, Item.RawMeat],
    breedable: true, breedingFoods: [Item.CookedMeat], diet: [Item.CookedMeat, Item.RawMeat], captureItem: Item.CaptureOrb,
    postTameNotes: "A bonded Rimecoat follows, holds or wanders on command and guards its keeper without chasing distant threats.",
    utility: "A cold-weather companion and dependable warning hound.", discoveryHint: "Follow broad pawprints where snowfall gathers beneath Frostpine boughs.",
  },
  "bramblewhisk-cat": {
    kind: "bramblewhisk-cat", name: "Bramblewhisk Cat", temperament: "Skittish", hostile: false,
    health: 7, damage: 1, xp: 3, speed: 0.8, chaseSpeed: 3.35, turnRate: 11, attackRange: 0.7,
    footOffset: 0.89, radius: 0.34, height: 0.64, habitat: "Wildwood bramble tunnels, Bloomwood edges and Rainveil understory", active: "Dawn, dusk and rain",
    behavior: "Stalks beetles beneath leaves, climbs low roots, and vanishes into brush before returning to inspect patient travelers.",
    lore: "Seeds cling to the hooked whisker tufts without tangling. Grovekeepers read the little collections to learn where each cat wandered.",
    colors: [0x526b48, 0xb58b5a, 0xf3df9b], drops: [{ item: Item.Fiber, min: 1, max: 1, chance: 0.12 }],
    family: "pet", movement: "ground", persistent: true, tameable: true, tameItems: [Item.RawFish, Item.CookedFish],
    breedable: true, breedingFoods: [Item.CookedFish], diet: [Item.RawFish, Item.CookedFish], captureItem: Item.CaptureOrb,
    postTameNotes: "A bonded Bramblewhisk can follow, hold or wander. It avoids serious combat and alerts its keeper to small nearby fauna.",
    utility: "A forest companion that notices tiny creatures and hidden movement.", discoveryHint: "Watch low bramble arches for a striped tail moving against the leaves.",
  },
  sprinklebug: {
    kind: "sprinklebug", name: "Sprinklebug", temperament: "Skittish", hostile: false,
    health: 2, damage: 0, xp: 1, speed: 0.38, chaseSpeed: 1.65, turnRate: 12, attackRange: 0,
    footOffset: 0.82150109, radius: 0.17, height: 0.2, habitat: "Sugarplum Vale gumdrop bushes, lollipop orchids and marshmallow shade", active: "Warm daylight",
    behavior: "Travels in glittering little clusters, carries candy pollen between low flowers, and vanishes beneath foliage when startled.",
    lore: "One Sprinklebug is almost silent. A whole cluster sounds like a jar of decorations being carefully turned over.",
    colors: [0xf0a1cf, 0x6ac9a7, 0xffec78], drops: [{ item: Item.Gumdrop, min: 1, max: 1, chance: 0.34 }],
    family: "surface", movement: "ground", sentient: false,
    utility: "A harmless candy-pollen carrier and very small forage source.", discoveryHint: "Watch the ground beneath Lollipop Orchids for moving sprinkles.",
  },
  taffalo: {
    kind: "taffalo", name: "Taffalo", temperament: "Defensive", hostile: false,
    health: 28, damage: 2, xp: 7, speed: 0.58, chaseSpeed: 3.15, turnRate: 4.5, attackRange: 1.22,
    footOffset: 1.12, radius: 0.72, height: 1.58, habitat: "Open Sugarplum Vale clearings and peppermint terraces", active: "Morning and late afternoon",
    behavior: "Moves in soft-footed herds, browses peppermint, and plants its broad feet when a calf is threatened rather than seeking a fight.",
    lore: "Pulled taffy folds form its coat, but the warm marshmallow mane never seems to gather dust.",
    colors: [0xb96f98, 0xf6e4e7, 0x40283b], drops: [{ item: Item.MarshmallowTuft, min: 1, max: 2, chance: 0.88 }],
    family: "mount", movement: "ground", persistent: true, sentient: false,
    tameable: true, tameItems: [Item.PeppermintCane, Item.Gumdrop], breedable: true, breedingFoods: [Item.CocoaNib],
    diet: [Item.PeppermintCane, Item.Gumdrop, Item.CocoaNib, Item.MarshmallowTuft], captureItem: Item.CaptureOrb, rideable: true,
    postTameNotes: "A trusted adult Taffalo accepts a Trail Saddle and carries one rider at a steady pace. It remains intentionally weak in combat.",
    secretHint: "Peppermint builds trust quickly. Only an adult bonded to its rider will accept a saddle.",
    utility: "A sturdy one-seat Sugarplum mount with a calm herd temperament.", discoveryHint: "Broad candy-soft tracks cross peppermint clearings in groups.",
  },
  syrupfin: {
    kind: "syrupfin", name: "Syrupfin", temperament: "Skittish", hostile: false,
    health: 4, damage: 0, xp: 3, speed: 1.35, chaseSpeed: 3.25, turnRate: 9.5, attackRange: 0,
    footOffset: 0, radius: 0.23, height: 0.2, habitat: "Natural syrup ponds in the Sugarplum Vale", active: "All hours within syrup",
    behavior: "Shoals through slow amber currents, turns in broad synchronized loops, and cannot survive in ordinary water or honey.",
    lore: "A Syrupfin's glassy fins stay perfectly clean no matter how slowly the pond moves.",
    colors: [0xb96835, 0xf0b467, 0xfff0bf], drops: [{ item: Item.SyrupfinFillet, min: 1, max: 1, chance: 1 }],
    family: "fish", movement: "aquatic", aquatic: true, sentient: false, captureItem: Item.CaptureOrb, liquidHabitat: "syrup",
    utility: "An edible syrup-pond fish and favored Praline Cat food.", discoveryHint: "Look for amber ripples moving against the surface of a Sugarplum syrup pond.",
  },
  "worldshell-leviathan": {
    kind: "worldshell-leviathan", name: "Worldshell Leviathan", temperament: "Gentle", hostile: false,
    health: 1200, damage: 0, xp: 0, speed: 0.34, chaseSpeed: 0.72, turnRate: 0.72, attackRange: 0,
    footOffset: 0, radius: 6.8, height: 4.8, habitat: "Rare open ocean routes, deep shelves and warm migration waters", active: "All hours",
    behavior: "Migrates for days at a time, surfaces like a small green island, and moves almost impossibly slowly whenever it crawls onto land.",
    lore: "Whole gardens take root on old Worldshells. Cartographers have occasionally mapped one by mistake.",
    colors: [0x416d5c, 0x87a86a, 0xffe9a3], drops: [], family: "leviathan", movement: "amphibious", aquatic: true, persistent: true,
    tameable: true, tameItems: [Item.GlowScale, Item.Apple], breedable: true, breedingFoods: [Item.GlowScale, Item.RawFish], diet: [Item.GlowScale, Item.RawFish, Item.Apple],
    rideable: true, laysEggs: true, cargoChestLimit: 6,
    postTameNotes: "Only an adult accepts a saddle. Up to six chest modules can be secured across its shell; it remains extremely slow on land.",
    secretHint: "Raise a submerged hatchling to adulthood, then earn trust with patient Glow Scale feeding.",
    utility: "A rare controllable ocean mount with six-chest cargo capacity.", discoveryHint: "A green island that moves against the wind may be a Worldshell.",
  },
  "aetherbell-larva": {
    kind: "aetherbell-larva", name: "Aetherbell Larva", temperament: "Gentle", hostile: false,
    health: 18, damage: 0, xp: 0, speed: 0.72, chaseSpeed: 1.5, turnRate: 5.4, attackRange: 0,
    footOffset: 0, radius: 0.55, height: 0.95, habitat: "Submerged Lumen Trench nurseries", active: "All hours underwater",
    behavior: "Pulses through nursery water on short glowing tails. It cannot leave water until its final growth molt.",
    lore: "Every tiny bell contains the folded shape of a future sky-sailer.",
    colors: [0x7d6ad9, 0x62e6d0, 0xf3e9ff], drops: [], family: "leviathan", movement: "aquatic", aquatic: true, persistent: true,
    tameable: true, tameItems: [Item.GlowScale, Item.RoyalJelly], diet: [Item.GlowScale, Item.RoyalJelly], aquaticYoungOnly: true,
    postTameNotes: "Feed it underwater as it grows. Its adult molt unlocks air-sea morphing, saddle and chest equipment.",
    utility: "The tameable aquatic juvenile stage of an Aetherbell.", discoveryHint: "Small violet bells gather around submerged luminous gardens.",
  },
  "aetherbell-leviathan": {
    kind: "aetherbell-leviathan", name: "Aetherbell Leviathan", temperament: "Gentle", hostile: false,
    health: 620, damage: 0, xp: 0, speed: 0.64, chaseSpeed: 1.55, turnRate: 1.8, attackRange: 0,
    footOffset: 5.4, radius: 4.4, height: 7.8, habitat: "Lumen Trench migrations and the high cloud sea", active: "All hours",
    behavior: "Folds its fluid tails into lifting sails while leaving water, drifts between layered clouds, and flees upward when provoked.",
    lore: "At night, a migrating Aetherbell makes the stars appear to swim.",
    colors: [0x6f62c4, 0x57dfd3, 0xf4ecff], drops: [], family: "leviathan", movement: "flying", flying: true, aquatic: true, persistent: true,
    tameable: true, tameItems: [Item.GlowScale, Item.RoyalJelly], breedable: true, breedingFoods: [Item.GlowScale], diet: [Item.GlowScale, Item.RoyalJelly],
    rideable: true, laysEggs: true, airSeaMorph: true, cargoChestLimit: 1,
    postTameNotes: "A tame adult accepts a saddle and one chest module, and can be steered through sea or sky as its bell morphs between both forms.",
    secretHint: "Adults grow only from carefully fed aquatic larvae hatched from intact submerged eggs.",
    utility: "A rare luminous sea-and-sky mount with one chest of cargo.", discoveryHint: "Look for a violet moving star above layered clouds or far below deep water.",
  },
  "atlantian-tidewarden": {
    kind: "atlantian-tidewarden", name: "Atlantian Tidewarden", temperament: "Defensive", hostile: false,
    health: 24, damage: 5, xp: 0, speed: 0.7, chaseSpeed: 2.5, turnRate: 6.5, attackRange: 1.55,
    footOffset: 0, radius: 0.38, height: 1.82, habitat: "Atlantian council reefs and pearl halls", active: "All tidal shifts",
    behavior: "Guides a reef-town's currents, hears disputes in the pearl hall, and coordinates defense when danger enters the water.",
    lore: "A Tidewarden wears one shell from every nursery their town has protected.",
    colors: [0x275d78, 0xd5b86f, 0xb9fff1], drops: [], family: "sentient", movement: "aquatic", aquatic: true, persistent: true,
    sentient: true, faction: "atlantians", culture: "atlantians", role: "mayor", profession: "Tidewarden", tradeSpecialty: "Town authority and ocean contracts",
    utility: "Aquatic settlement leader and quest giver.", discoveryHint: "The largest pearl hall shelters a shell-crowned Tidewarden.",
  },
  "atlantian-kelpkeeper": {
    kind: "atlantian-kelpkeeper", name: "Atlantian Kelpkeeper", temperament: "Defensive", hostile: false,
    health: 15, damage: 2, xp: 0, speed: 0.72, chaseSpeed: 2.1, turnRate: 7, attackRange: 1.1,
    footOffset: 0, radius: 0.35, height: 1.72, habitat: "Atlantian kelp terraces and nursery gardens", active: "Daylit tide",
    behavior: "Tends edible kelp, replants luminous shoots, and hides among nursery fronds when monsters approach.",
    lore: "Kelpkeepers measure seasons by the direction their longest gardens lean.",
    colors: [0x2b755f, 0x8fd19b, 0xd8fff0], drops: [], family: "sentient", movement: "aquatic", aquatic: true, persistent: true,
    sentient: true, faction: "atlantians", culture: "atlantians", role: "farmer", profession: "Kelpkeeper", tradeSpecialty: "Aquatic crops and nursery supplies",
    utility: "Aquatic farmer and plant trader.", discoveryHint: "Long planted rows of kelp lead to their keepers.",
  },
  "atlantian-coralwright": {
    kind: "atlantian-coralwright", name: "Atlantian Coralwright", temperament: "Defensive", hostile: false,
    health: 18, damage: 3, xp: 0, speed: 0.68, chaseSpeed: 2.15, turnRate: 6.7, attackRange: 1.25,
    footOffset: 0, radius: 0.37, height: 1.78, habitat: "Atlantian coral workshops and stone gardens", active: "Day and evening tide",
    behavior: "Shapes reefstone without killing living coral, repairs glowstone arches, and examines every new mineral twice.",
    lore: "A Coralwright builds slowly because the building is expected to keep growing after they leave.",
    colors: [0x36718a, 0xe28779, 0xe6fff5], drops: [], family: "sentient", movement: "aquatic", aquatic: true, persistent: true,
    sentient: true, faction: "atlantians", culture: "atlantians", role: "worker", profession: "Coralwright", tradeSpecialty: "Reefstone, coralwork and building materials",
    utility: "Aquatic builder and material merchant.", discoveryHint: "Colored stone frames and tool chimes mark Coralwright yards.",
  },
  "atlantian-pearlbroker": {
    kind: "atlantian-pearlbroker", name: "Atlantian Pearlbroker", temperament: "Defensive", hostile: false,
    health: 14, damage: 2, xp: 0, speed: 0.66, chaseSpeed: 1.95, turnRate: 7.2, attackRange: 1.1,
    footOffset: 0, radius: 0.34, height: 1.7, habitat: "Atlantian current-markets and shell kiosks", active: "Daylit tide",
    behavior: "Trades from a tethered shell counter, adjusts prices to local supply, and closes its shutters when predators pass.",
    lore: "Pearlbrokers value a good story, then insist on paying separately for it.",
    colors: [0x4b5d96, 0xd7bfdf, 0xb8fff5], drops: [], family: "sentient", movement: "aquatic", aquatic: true, persistent: true,
    sentient: true, faction: "atlantians", culture: "atlantians", role: "merchant", profession: "Pearlbroker", tradeSpecialty: "General goods, pearls and ocean curios",
    utility: "Aquatic general merchant.", discoveryHint: "Shell counters cluster where marker-streamers cross.",
  },
  "atlantian-glowmender": {
    kind: "atlantian-glowmender", name: "Atlantian Glowmender", temperament: "Defensive", hostile: false,
    health: 16, damage: 3, xp: 0, speed: 0.67, chaseSpeed: 2, turnRate: 7.5, attackRange: 4.5,
    footOffset: 0, radius: 0.35, height: 1.74, habitat: "Atlantian glow gardens and healing grottoes", active: "All tidal shifts",
    behavior: "Cultivates bioluminescent remedies, tends nursery eggs, and releases a dazzling defensive pulse when trapped.",
    lore: "Glowmenders say light is only medicine that has not chosen a patient yet.",
    colors: [0x315b70, 0x54dfc5, 0xf0fff7], drops: [], family: "sentient", movement: "aquatic", aquatic: true, persistent: true, ranged: true,
    sentient: true, faction: "atlantians", culture: "atlantians", role: "alchemist", profession: "Glowmender", tradeSpecialty: "Water-breathing mixtures and luminous reagents",
    utility: "Aquatic healer and alchemy merchant.", discoveryHint: "Turquoise light-gardens surround a Glowmender grotto.",
  },
  "atlantian-trident-guard": {
    kind: "atlantian-trident-guard", name: "Atlantian Trident Guard", temperament: "Defensive", hostile: false,
    health: 25, damage: 6, xp: 0, speed: 0.82, chaseSpeed: 2.9, turnRate: 8, attackRange: 2.4,
    footOffset: 0, radius: 0.39, height: 1.86, habitat: "Atlantian current gates and open village approaches", active: "All shifts",
    behavior: "Patrols un-walled current lanes, braces a long trident against sea monsters, and drives danger away from nurseries.",
    lore: "Their three points stand for home, current and the stranger safely guided between them.",
    colors: [0x244b67, 0x83b9c9, 0xe4fff8], drops: [], family: "sentient", movement: "aquatic", aquatic: true, persistent: true,
    sentient: true, faction: "atlantians", culture: "atlantians", role: "guard", profession: "Trident Guard", tradeSpecialty: "Aquatic settlement defense",
    utility: "Fast underwater guard with a reach weapon.", discoveryHint: "Trident Guards patrol the glowing current markers outside town.",
  },
  "sugarcourt-crown-confectioner": {
    kind: "sugarcourt-crown-confectioner", name: "Sugarcourt Crown Confectioner", temperament: "Defensive", hostile: false,
    health: 20, damage: 4, xp: 0, speed: 0.68, chaseSpeed: 2.25, turnRate: 7, attackRange: 1.2,
    footOffset: 0.86, radius: 0.36, height: 1.42, habitat: "Sugar Palace halls in Sugarplum Vale Bonbon Boroughs", active: "Day and early evening",
    behavior: "Hears contracts beneath a spun-sugar crown, settles disputes by measured tasting, and directs borough defense when the candywall is threatened.",
    lore: "A Crown Confectioner's first duty is to know when sweetness has become excess.",
    colors: [0xd86e9d, 0xf8dfc5, 0xf7d16b], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "sugarcourt", culture: "sugarcourt", role: "mayor", profession: "Crown Confectioner", tradeSpecialty: "Borough authority, contracts and trusted hires",
    utility: "Sugarcourt settlement leader and quest giver.", discoveryHint: "The tallest sugarbrick hall shelters a crown of translucent spun sugar.",
  },
  "sugarcourt-brittle-guard": {
    kind: "sugarcourt-brittle-guard", name: "Sugarcourt Brittle Guard", temperament: "Defensive", hostile: false,
    health: 22, damage: 7, xp: 0, speed: 0.76, chaseSpeed: 2.8, turnRate: 8, attackRange: 2.25,
    footOffset: 0.86, radius: 0.38, height: 1.48, habitat: "Sugarplum Vale hard-candy walls, gate arches and Brittle Barracks", active: "All shifts",
    behavior: "Patrols candybrick gates beside Taffy Hounds, braces a long Peppermint Pike, and cracks into formation rather than pursuing danger alone.",
    lore: "Their armor is tempered to flex once before it breaks, much like the oath beneath it.",
    colors: [0xb94e75, 0x83d8b4, 0x38283c], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "sugarcourt", culture: "sugarcourt", role: "guard", profession: "Brittle Guard", tradeSpecialty: "Peppermint Pike training and borough defense",
    utility: "Reach-focused Sugarcourt defender.", discoveryHint: "Mint-striped pikes mark the gates of a Bonbon Borough.",
  },
  "sugarcourt-gumdrop-gardener": {
    kind: "sugarcourt-gumdrop-gardener", name: "Sugarcourt Gumdrop Gardener", temperament: "Gentle", hostile: false,
    health: 12, damage: 1, xp: 0, speed: 0.66, chaseSpeed: 1.9, turnRate: 7.5, attackRange: 0.85,
    footOffset: 0.86, radius: 0.34, height: 1.38, habitat: "Gumdrop gardens and peppermint terraces in Sugarplum Vale Bonbon Boroughs", active: "Dawn through dusk",
    behavior: "Prunes gumdrop bushes by color, turns cocoa soil, and pauses whenever a Bonbonwing needs the flower being tended.",
    lore: "Gardeners claim every gumdrop has a preferred direction to face. Their harvest rows make the claim difficult to dismiss.",
    colors: [0x72b878, 0xef8eba, 0x4b3146], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "sugarcourt", culture: "sugarcourt", role: "farmer", profession: "Gumdrop Gardener", tradeSpecialty: "Peppermint, cocoa, gumdrops and planting stock",
    utility: "Sugarcourt crop and flora merchant.", discoveryHint: "Orderly rows of jewel-colored bushes lead to a Gumdrop Gardener.",
  },
  "sugarcourt-sweetbroker": {
    kind: "sugarcourt-sweetbroker", name: "Sugarcourt Sweetbroker", temperament: "Defensive", hostile: false,
    health: 13, damage: 2, xp: 0, speed: 0.67, chaseSpeed: 2, turnRate: 7, attackRange: 0.9,
    footOffset: 0.86, radius: 0.35, height: 1.4, habitat: "Sweet markets and syrup-lit kiosks in Sugarplum Vale Bonbon Boroughs", active: "Day and early evening",
    behavior: "Weighs arbitrary goods against a striped ledger, adjusts demand with local stock, and always keeps one sample where customers can see it.",
    lore: "A Sweetbroker can price anything except a recipe remembered from childhood.",
    colors: [0x8e67b5, 0xf0bd67, 0xffedca], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "sugarcourt", culture: "sugarcourt", role: "merchant", profession: "Sweetbroker", tradeSpecialty: "General goods, finished candy and borough materials",
    utility: "Sugarcourt general merchant.", discoveryHint: "Striped awnings and brass candy scales mark the sweet market.",
  },
  "sugarcourt-kennelkeeper": {
    kind: "sugarcourt-kennelkeeper", name: "Sugarcourt Kennelkeeper", temperament: "Defensive", hostile: false,
    health: 15, damage: 2, xp: 0, speed: 0.69, chaseSpeed: 2.15, turnRate: 7.6, attackRange: 1,
    footOffset: 0.86, radius: 0.35, height: 1.42, habitat: "Sugarplum Vale taffy kennels, catteries and quiet borough courtyards", active: "Morning through dusk",
    behavior: "Tends faction hounds and cats, checks every collar twice, and sells only neutral youngsters prepared to choose their own keeper.",
    lore: "Kennelkeepers say a crest may be inherited, but companionship must never be.",
    colors: [0x68b9a5, 0xe98caf, 0x3d2d45], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "sugarcourt", culture: "sugarcourt", role: "worker", profession: "Kennelkeeper", tradeSpecialty: "Neutral companion Capture Orbs and care food",
    utility: "Merchant for unaligned Taffy Hounds and Praline Cats.", discoveryHint: "Listen for collar tags and soft paws near the borough kennel yard.",
  },
  "sugarcourt-sugarboiler": {
    kind: "sugarcourt-sugarboiler", name: "Sugarcourt Sugarboiler", temperament: "Defensive", hostile: false,
    health: 15, damage: 3, xp: 0, speed: 0.65, chaseSpeed: 2.05, turnRate: 6.8, attackRange: 1,
    footOffset: 0.86, radius: 0.35, height: 1.43, habitat: "Copper-kettled Sugarworks in Sugarplum Vale Bonbon Boroughs", active: "Late morning through evening",
    behavior: "Keeps syrup at exact heat, cools potion candy on stone slabs, and snaps a kettle lid shut when danger enters the workshop.",
    lore: "A Sugarboiler judges temperature by sound: bubble, sigh, then the single clear note before a batch catches.",
    colors: [0xc87945, 0xf6ddbb, 0x72d2b2], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "sugarcourt", culture: "sugarcourt", role: "alchemist", profession: "Sugarboiler", tradeSpecialty: "Syrup goods, potions and Sugarworks formulas",
    utility: "Sugarcourt potion and facility merchant.", discoveryHint: "Copper steam and slow amber bubbles mark an active Sugarworks.",
  },
  "sugarcourt-candysmith": {
    kind: "sugarcourt-candysmith", name: "Sugarcourt Candysmith", temperament: "Defensive", hostile: false,
    health: 18, damage: 5, xp: 0, speed: 0.68, chaseSpeed: 2.35, turnRate: 7.2, attackRange: 1.25,
    footOffset: 0.86, radius: 0.37, height: 1.45, habitat: "Tempering halls and Candysmith forges in Sugarplum Vale Bonbon Boroughs", active: "Day and evening",
    behavior: "Tempers candy alloy through repeated heat and cooling, tests every blade edge on sugar thread, and joins the guard when walls crack.",
    lore: "Candysmiths do not mind when visitors doubt their armor. They keep a hammer nearby for demonstrations.",
    colors: [0xc65a7f, 0xe9b5cd, 0x34313d], drops: [], family: "sentient", movement: "ground", persistent: true,
    sentient: true, faction: "sugarcourt", culture: "sugarcourt", role: "worker", profession: "Candysmith", tradeSpecialty: "Candy weapons, Sugarplate armor and blueprints",
    utility: "Sugarcourt equipment smith and blueprint merchant.", discoveryHint: "Rhythmic glassy hammer notes lead to the borough Candysmith.",
  },
  "fire-dragon": {
    kind: "fire-dragon", name: "Fire Dragon", temperament: "Hostile", hostile: true,
    health: 500, damage: 43, xp: 180, speed: 1.15, chaseSpeed: 4.8, turnRate: 2.6, attackRange: 4.7,
    footOffset: 0.75, radius: 2.55, height: 3.4, habitat: "Charred subterranean lairs beneath warm and temperate country", active: "All hours near a guarded lair",
    behavior: "Circles above intruders, rakes the ground with claws, and alternates a furnace-hot breath stream with arcing firebolts. Older dragons will abandon a chase to defend their hoard and eggs.",
    lore: "Fire Dragons sleep beneath heaps of softened gold. Every twenty-five days of age leaves a darker ring along their horns and a wider shadow over the lair mouth.",
    colors: [0x9d2f27, 0xe26a35, 0xffdf73], family: "dragon", movement: "flying", flying: true, ranged: true, persistent: true,
    dragonType: "fire", tameable: true, tameItems: [Item.RawDragonMeat, Item.CookedDragonMeat], breedable: true,
    breedingFoods: [Item.FireBreedingCatalyst], diet: [Item.RawMeat, Item.CookedMeat, Item.RawDragonMeat, Item.CookedDragonMeat],
    rideable: true, cargoChestLimit: 2, laysEggs: true,
    drops: [
      { item: Item.RawDragonMeat, min: 4, max: 30, chance: 1 }, { item: Item.FireDragonScale, min: 7, max: 60, chance: 1 },
      { item: Item.DragonBone, min: 6, max: 50, chance: 1 }, { item: Item.FireDragonSkull, min: 1, max: 1, chance: 1 },
      { item: Item.FireDragonHeart, min: 1, max: 1, chance: 0.82 },
    ],
    postTameNotes: "A stage-one hatchling bonds after three patient meat feeds and can ride on a shoulder. Stage three unlocks saddling, flight, armor, and two cargo chests. Z, X, and C direct melee, breath, and firebolt attacks while mounted.",
    fieldNotes: dragonFieldNotes("Fire Dragon", "Keep the egg beside sustained flame for six uninterrupted minutes, or stabilize it in a Draconic Incubator.", "At stage three it accepts a saddle, armor, and two cargo chests; mounted commands direct melee, fire breath, and firebolts."),
    secretHint: "Fire eggs stir only inside a sustained open flame, unless stabilized in a Draconic Incubator.",
    discoveryHint: "Merchants rarely sell a Fire Lair Survey; otherwise seek scorched cave vents and gold fused into stone.",
  },
  "ice-dragon": {
    kind: "ice-dragon", name: "Ice Dragon", temperament: "Hostile", hostile: true,
    health: 520, damage: 40, xp: 185, speed: 1.08, chaseSpeed: 4.55, turnRate: 2.8, attackRange: 4.8,
    footOffset: 0.75, radius: 2.62, height: 3.45, habitat: "Frozen subterranean lairs below Frostpine and high snowy country", active: "All hours near a guarded lair",
    behavior: "Uses cavern water and open air as one hunting space, slowing prey with a crystalline breath before launching long ice shards or diving into a claw strike.",
    lore: "An Ice Dragon does not merely endure winter; the oldest carry a private winter with them, writing frost across every surface they pass.",
    colors: [0x5d8cae, 0xa9d9e9, 0xf3ffff], family: "dragon", movement: "flying", flying: true, ranged: true, persistent: true,
    dragonType: "ice", tameable: true, tameItems: [Item.RawDragonMeat, Item.CookedDragonMeat], breedable: true,
    breedingFoods: [Item.IceBreedingCatalyst], diet: [Item.RawMeat, Item.CookedMeat, Item.RawFish, Item.RawDragonMeat, Item.CookedDragonMeat],
    rideable: true, cargoChestLimit: 2, laysEggs: true,
    drops: [
      { item: Item.RawDragonMeat, min: 4, max: 30, chance: 1 }, { item: Item.IceDragonScale, min: 7, max: 60, chance: 1 },
      { item: Item.DragonBone, min: 6, max: 50, chance: 1 }, { item: Item.IceDragonSkull, min: 1, max: 1, chance: 1 },
      { item: Item.IceDragonHeart, min: 1, max: 1, chance: 0.82 },
    ],
    postTameNotes: "A stage-one hatchling bonds after three patient meat feeds and can ride on a shoulder. Stage three unlocks saddling, flight, armor, and two cargo chests. Z, X, and C direct melee, freezing breath, and ice-shard attacks while mounted.",
    fieldNotes: dragonFieldNotes("Ice Dragon", "Submerge the egg in source water ringed by ice for six uninterrupted minutes, or use a Draconic Incubator.", "At stage three it accepts a saddle, armor, and two cargo chests; mounted commands direct melee, freezing breath, and ice shards."),
    secretHint: "Ice eggs need freezing water around the shell, unless stabilized in a Draconic Incubator.",
    discoveryHint: "Merchants rarely sell an Ice Lair Survey; otherwise follow unnatural rime into deep Frostpine caves.",
  },
  "steel-dragon": {
    kind: "steel-dragon", name: "Steel Dragon", temperament: "Hostile", hostile: true,
    health: 570, damage: 41, xp: 205, speed: 0.98, chaseSpeed: 4.2, turnRate: 2.35, attackRange: 5,
    footOffset: 0.75, radius: 2.72, height: 3.55, habitat: "Ore-rich subterranean foundry lairs below mountains and badlands", active: "All hours near a guarded lair",
    behavior: "Builds pressure behind interlocking throat plates, scalds close targets with steam, and launches a forged metal spear across the full lair before closing with armored jaws and talons.",
    lore: "Steel Dragons are neither machines nor metal given life. Their scales simply learned the same lesson as a good blade: heat, pressure, patience, and an edge worth respecting.",
    colors: [0x56636b, 0x9aaab1, 0xe9fbff], family: "dragon", movement: "flying", flying: true, ranged: true, persistent: true,
    dragonType: "steel", tameable: true, tameItems: [Item.RawDragonMeat, Item.CookedDragonMeat], breedable: true,
    breedingFoods: [Item.SteelBreedingCatalyst], diet: [Item.RawMeat, Item.CookedMeat, Item.RawDragonMeat, Item.CookedDragonMeat],
    rideable: true, cargoChestLimit: 2, laysEggs: true,
    drops: [
      { item: Item.RawDragonMeat, min: 4, max: 30, chance: 1 }, { item: Item.SteelDragonScale, min: 7, max: 60, chance: 1 },
      { item: Item.DragonBone, min: 6, max: 50, chance: 1 }, { item: Item.SteelDragonSkull, min: 1, max: 1, chance: 1 },
      { item: Item.SteelDragonHeart, min: 1, max: 1, chance: 0.82 },
    ],
    postTameNotes: "A stage-one hatchling bonds after three patient meat feeds and can ride on a shoulder. Stage three unlocks saddling, flight, armor, and two cargo chests. Z, X, and C direct melee, steam breath, and the long-range metal spear while mounted.",
    fieldNotes: dragonFieldNotes("Steel Dragon", "Cycle pressurized steam across the egg for seven uninterrupted minutes, or use a Draconic Incubator.", "At stage three it accepts a saddle, armor, and two cargo chests; mounted commands direct melee, steam breath, and a long-range metal spear."),
    secretHint: "Steel eggs wake where steam washes over heated metal, unless stabilized in a Draconic Incubator.",
    discoveryHint: "Merchants rarely sell a Steel Lair Survey; otherwise listen for hammerlike wingbeats in ore-rich depths.",
  },
  "sea-dragon": {
    kind: "sea-dragon", name: "Sea Dragon", temperament: "Hostile", hostile: true,
    health: 540, damage: 42, xp: 200, speed: 1.26, chaseSpeed: 6.2, turnRate: 2.9, attackRange: 5.2,
    footOffset: 0.75, radius: 2.7, height: 3.4, habitat: "Rare abyssal nests in deep oceans and Lumen Trenches", active: "All hours near a guarded nest",
    behavior: "Surges through water far faster than it flies, coils through reef arches, and fires a pressurized brine lance before closing with jaws and finned claws. It walks capably on shore but avoids long inland chases.",
    lore: "Its scales remember pressure. Older Sea Dragons carry dark bands for every depth they have mastered.",
    colors: [0x286f83, 0x55c4bf, 0xc9ffff], family: "dragon", movement: "amphibious", aquatic: true, flying: true, ranged: true, persistent: true,
    dragonType: "sea", tameable: true, tameItems: [Item.RawFish, Item.RawDragonMeat], breedable: true,
    breedingFoods: [Item.StarCoralShard], diet: [Item.RawFish, Item.CookedFish, Item.RawDragonMeat, Item.CookedDragonMeat],
    rideable: true, cargoChestLimit: 2, laysEggs: true,
    drops: [
      { item: Item.RawDragonMeat, min: 4, max: 30, chance: 1 }, { item: Item.SeaDragonScale, min: 7, max: 60, chance: 1 },
      { item: Item.DragonBone, min: 6, max: 50, chance: 1 }, { item: Item.SeaDragonSkull, min: 1, max: 1, chance: 1 },
      { item: Item.SeaDragonHeart, min: 1, max: 1, chance: 0.82 },
    ],
    postTameNotes: "Stage-three Sea Dragons accept a saddle. They swim fastest, run at a useful pace, and fly more slowly than Fire, Ice, or Steel dragons.",
    fieldNotes: dragonFieldNotes("Sea Dragon", "Submerge the egg beside living coral in a moving current for six uninterrupted minutes, or use a Draconic Incubator.", "At stage three it accepts a saddle and becomes a fast swimmer, a capable runner, and a slower but useful flier with tidal attacks."),
    secretHint: "Sea eggs hatch only while fully submerged beside living coral, unless stabilized in a Draconic Incubator.",
    discoveryHint: "Atlantian Pearlbrokers rarely sell charts to the closest undiscovered deep-sea nest.",
  },
  "gold-dragon": {
    kind: "gold-dragon", name: "Gold Dragon", temperament: "Hostile", hostile: true,
    health: 620, damage: 47, xp: 330, speed: 1.2, chaseSpeed: 5.05, turnRate: 2.72, attackRange: 5.6,
    footOffset: 0.75, radius: 2.82, height: 3.72, habitat: "Vanishingly rare gilded cathedral-lairs beneath sunlit plateaus and old Wildwood crowns", active: "Daylight and all hours within a guarded lair",
    behavior: "Claims the upper vault of its cavern like a throne, flashes layered mirror-scales to blind intruders, and casts a spinning solar disc through whole galleries before following with white-gold breath and crushing talons.",
    lore: "Gold Dragons are not hoarders because they resemble treasure. Their living scales refine trace metals into radiant plates, and an elder's heartbeat can turn a dark cavern briefly into noon.",
    colors: [0x8f651a, 0xe1b540, 0xfff1a1], family: "dragon", movement: "flying", flying: true, ranged: true, persistent: true,
    dragonType: "gold", tameable: true, tameItems: [Item.RawDragonMeat, Item.CookedDragonMeat], breedable: true,
    breedingFoods: [Item.GoldBreedingCatalyst], diet: [Item.RawMeat, Item.CookedMeat, Item.RawDragonMeat, Item.CookedDragonMeat],
    rideable: true, cargoChestLimit: 2, laysEggs: true,
    drops: [
      { item: Item.RawDragonMeat, min: 6, max: 34, chance: 1 }, { item: Item.GoldDragonScale, min: 8, max: 64, chance: 1 },
      { item: Item.DragonBone, min: 8, max: 54, chance: 1 }, { item: Item.GoldDragonSkull, min: 1, max: 1, chance: 1 },
      { item: Item.GoldDragonHeart, min: 1, max: 1, chance: 0.74 },
    ],
    postTameNotes: "Stage-three Gold Dragons accept saddles and Solar-Regalia armor. Their mounted solar disc reaches farther than common dragon projectiles, while their luminous wingbeats remain visible through darkness.",
    fieldNotes: dragonFieldNotes("Gold Dragon", "Rest the egg on gilded stone beneath open daylight for ten uninterrupted minutes, or use a Draconic Incubator.", "At stage three it accepts a saddle and Solar-Regalia armor; its far-reaching solar disc and luminous wingbeats reward open-sky combat."),
    secretHint: "Gold eggs awaken only on gilded stone beneath direct sunlight, unless stabilized in a Draconic Incubator.",
    discoveryHint: "Exceptional cartographers may offer a Gold Lair Survey; otherwise search for daylight-bright seams descending beneath isolated plateaus.",
  },
  "silver-dragon": {
    kind: "silver-dragon", name: "Silver Dragon", temperament: "Hostile", hostile: true,
    health: 600, damage: 45, xp: 320, speed: 1.3, chaseSpeed: 5.35, turnRate: 3.05, attackRange: 5.8,
    footOffset: 0.75, radius: 2.7, height: 3.62, habitat: "Vanishingly rare argent mirror-caverns below Moon Slate ridges and the deepest Glimmerwood", active: "Moonlit nights and all hours within a guarded lair",
    behavior: "Hunts in long silent arcs, folds its mirror-wings until it nearly disappears against stone, then releases a crescent projectile that chills everything along its path before striking with a serpentine bite.",
    lore: "Silver Dragon scales remember every night sky reflected across them. Elders carry whole constellations in their flanks, rearranging the lights when they dream.",
    colors: [0x49566a, 0xbac8d8, 0xf6fbff], family: "dragon", movement: "flying", flying: true, ranged: true, persistent: true,
    dragonType: "silver", tameable: true, tameItems: [Item.RawDragonMeat, Item.CookedDragonMeat, Item.RawFish], breedable: true,
    breedingFoods: [Item.SilverBreedingCatalyst], diet: [Item.RawMeat, Item.CookedMeat, Item.RawFish, Item.RawDragonMeat, Item.CookedDragonMeat],
    rideable: true, cargoChestLimit: 2, laysEggs: true,
    drops: [
      { item: Item.RawDragonMeat, min: 6, max: 34, chance: 1 }, { item: Item.SilverDragonScale, min: 8, max: 64, chance: 1 },
      { item: Item.DragonBone, min: 8, max: 54, chance: 1 }, { item: Item.SilverDragonSkull, min: 1, max: 1, chance: 1 },
      { item: Item.SilverDragonHeart, min: 1, max: 1, chance: 0.74 },
    ],
    postTameNotes: "Stage-three Silver Dragons accept saddles and Moonmirror armor. Their crescent attack is the fastest dragon projectile and leaves distant targets slowed beneath a cold afterglow.",
    fieldNotes: dragonFieldNotes("Silver Dragon", "Rest the egg on argent stone beneath open moonlight for ten uninterrupted minutes, or use a Draconic Incubator.", "At stage three it accepts a saddle and Moonmirror armor; its rapid crescent projectile slows distant targets beneath a cold afterglow."),
    secretHint: "Silver eggs awaken only on argent stone beneath open moonlight, unless stabilized in a Draconic Incubator.",
    discoveryHint: "Exceptional cartographers may offer a Silver Lair Survey; otherwise follow cold, star-shaped reflections into deep Moon Slate caverns.",
  },
  meadowwing: {
    kind: "meadowwing", name: "Meadowwing", temperament: "Gentle", hostile: false,
    health: 1, damage: 0, xp: 0, speed: 1.3, chaseSpeed: 1.8, turnRate: 9, attackRange: 0,
    footOffset: 0.12, radius: 0.12, height: 0.18, habitat: "Flower meadows and sunny Wildwood edges", active: "Clear daylight",
    behavior: "Drifts between Ember Blooms, lands to drink, and rises when a shadow passes overhead.",
    lore: "The first bright wings of spring. Trailkeepers judge the health of a meadow by how many dance above it.",
    colors: [0xf3d451, 0x4b3b25, 0xfff4a8], drops: [], family: "butterfly", movement: "flying", flying: true, captureItem: Item.CaptureOrb,
    discoveryHint: "Search clear daylight above Ember Blooms in flower meadows.",
  },
  "azure-skippers": {
    kind: "azure-skippers", name: "Azure Skipper", temperament: "Skittish", hostile: false,
    health: 1, damage: 0, xp: 0, speed: 1.7, chaseSpeed: 2.2, turnRate: 11, attackRange: 0,
    footOffset: 0.12, radius: 0.11, height: 0.17, habitat: "Skybells in Birchlight and Wildwood", active: "Bright morning",
    behavior: "Flies in quick blue dashes, shares flowers reluctantly, and rarely rests for long.",
    lore: "A chip of summer sky that refused to stay put.",
    colors: [0x54bce8, 0x244f78, 0xdaf7ff], drops: [], family: "butterfly", movement: "flying", flying: true, captureItem: Item.CaptureOrb,
    discoveryHint: "Watch morning Skybells for tiny blue dashes that rarely settle.",
  },
  embertip: {
    kind: "embertip", name: "Embertip", temperament: "Gentle", hostile: false,
    health: 1, damage: 0, xp: 0, speed: 1.45, chaseSpeed: 2, turnRate: 9.5, attackRange: 0,
    footOffset: 0.12, radius: 0.12, height: 0.18, habitat: "Savanna blooms and warm badland oases", active: "Hot daylight",
    behavior: "Warms its dark wings on stone before circling red flowers in wide loops.",
    lore: "Its wing tips hold sunset long after noon has passed.",
    colors: [0xed743d, 0x3b2722, 0xffc35a], drops: [], family: "butterfly", movement: "flying", flying: true, captureItem: Item.CaptureOrb,
    discoveryHint: "Check sun-warmed stone beside savanna flowers and badland oases.",
  },
  frostveil: {
    kind: "frostveil", name: "Frostveil", temperament: "Skittish", hostile: false,
    health: 1, damage: 0, xp: 0, speed: 1.15, chaseSpeed: 1.75, turnRate: 8.5, attackRange: 0,
    footOffset: 0.12, radius: 0.13, height: 0.19, habitat: "Rare flowers along Frostpine snow lines", active: "Still, sunny afternoons",
    behavior: "Glides more than it flaps and folds into the snow whenever the wind rises.",
    lore: "Often mistaken for a loose snowflake until it chooses a flower.",
    colors: [0xd8f2f5, 0x7896af, 0xffffff], drops: [], family: "butterfly", movement: "flying", flying: true, captureItem: Item.CaptureOrb,
    discoveryHint: "Wait for a still sunny afternoon beside rare flowers on the Frostpine snow line.",
  },
  "bloom-monarch": {
    kind: "bloom-monarch", name: "Bloom Monarch", temperament: "Gentle", hostile: false,
    health: 1, damage: 0, xp: 0, speed: 1.25, chaseSpeed: 1.8, turnRate: 8, attackRange: 0,
    footOffset: 0.12, radius: 0.15, height: 0.2, habitat: "Bloomwood Vale flower canopies", active: "Sunlit noon",
    behavior: "Claims a small court of flowers and returns to the same favorite bloom throughout the day.",
    lore: "Bloomwood children insist every Monarch rules exactly seven flowers.",
    colors: [0xe88fc8, 0x713c70, 0xffd5ee], drops: [], family: "butterfly", movement: "flying", flying: true, captureItem: Item.CaptureOrb,
    discoveryHint: "Inspect the sunlit flower canopy of Bloomwood Vale around noon.",
  },
  "fen-lantern": {
    kind: "fen-lantern", name: "Fen Lantern", temperament: "Gentle", hostile: false,
    health: 1, damage: 0, xp: 0, speed: 1.05, chaseSpeed: 1.55, turnRate: 7.5, attackRange: 0,
    footOffset: 0.12, radius: 0.13, height: 0.18, habitat: "Sunny clearings in Siltfen and Mooncap Fen", active: "Humid daylight",
    behavior: "Hovers close to flowers and flashes pale green when another tiny creature approaches.",
    lore: "A daytime cousin of the Glowmoth, carrying a softer and more patient light.",
    colors: [0xb6df62, 0x3e6040, 0xf1ffb5], drops: [], family: "butterfly", movement: "flying", flying: true, captureItem: Item.CaptureOrb,
    discoveryHint: "Search humid sunny clearings in Siltfen or Mooncap Fen for a soft green flash.",
  },
  bonbonwing: {
    kind: "bonbonwing", name: "Bonbonwing", temperament: "Gentle", hostile: false,
    health: 1, damage: 0, xp: 0, speed: 1.42, chaseSpeed: 2.05, turnRate: 9.8, attackRange: 0,
    footOffset: 0.12, radius: 0.14, height: 0.19, habitat: "Lollipop Orchids and gumdrop clearings in the Sugarplum Vale", active: "Clear daylight",
    behavior: "Loops between candy flowers on four wrapper-shaped wings and rests only briefly before the next bright patch catches its attention.",
    lore: "Bonbonwings are living sweets: caught gently, one may be released again or eaten as a small traveling treat.",
    colors: [0xf08fbd, 0x51314d, 0xffed79], drops: [], family: "butterfly", movement: "flying", flying: true, captureItem: Item.CaptureOrb,
    utility: "A releasable and edible candy butterfly.", discoveryHint: "Search sunlit Lollipop Orchids in the Sugarplum Vale.",
  },
  "moonveil-wing": {
    kind: "moonveil-wing", name: "Moonveil Wing", temperament: "Gentle", hostile: false,
    health: 1, damage: 0, xp: 0, speed: 1.38, chaseSpeed: 2.1, turnRate: 9.6, attackRange: 0,
    footOffset: 0.12, radius: 0.14, height: 0.19, habitat: "Moonpetals and Starferns in the Glimmerwood", active: "Dusk and moonlit night",
    behavior: "Drifts between glowing plants and draws a soft crescent with each wingbeat.",
    lore: "Enclaves leave one Moonpetal unharvested for every Moonveil seen that week.",
    colors: [0x8d8bf3, 0x3b466e, 0xd9fff1], drops: [], family: "butterfly", movement: "flying", flying: true, captureItem: Item.CaptureOrb,
    utility: "A luminous Glimmerwood pollinator.", discoveryHint: "Wait beside Moonpetals after sunset in the Glimmerwood.",
  },
};

export const BUTTERFLY_ORDER: ButterflyKind[] = ["meadowwing", "azure-skippers", "embertip", "frostveil", "bloom-monarch", "fen-lantern", "bonbonwing", "moonveil-wing"];
export const LEGACY_MOB_ORDER: LegacyMobKind[] = ["mossling", "ridgeback", "woolhorn", "glowmoth", "shadecrawler", "caveblob", "rattlekin", "zombie"];
export const MOSSLING_VARIANT_ORDER: MosslingVariantKind[] = ["boglantern-mossling", "cindercone-mossling", "moonbloom-mossling", "moonbrawn-mossling"];
export const SURFACE_MOB_ORDER: SurfaceMobKind[] = [
  "sunstep-grazer", "pebbletortoise", "brambleboar", "petalfox", "emberbrush-fox", "moonpetal-fox", "duneclatter",
  "thimbledeer", "frostlace-hart", "reedcrown-deer", "lanternshell", "puddlehopper", "reedstrider", "wild-horse", "rimehoof-courser", "sunscar-courser",
  "mirestride-courser", "starbough-courser", "meadow-cow", "sunbloom-longhorn", "mistmane", "sakurakit", "sunwash-crab",
  "taffy-hound", "praline-cat", "rimecoat-hound", "bramblewhisk-cat", "sprinklebug", "taffalo",
];
export const BIRD_ORDER: BirdKind[] = ["emberjay", "canopy-lark", "tidewing-gull", "frostquill"];
export const AQUATIC_MOB_ORDER: AquaticMobKind[] = ["shoalfin", "coralback", "brookdart", "gloomfin", "silverthread", "reedneedle", "emberribbon", "cavefilament"];
export const POLLINATOR_ORDER: PollinatorKind[] = ["honeybee", "hive-queen", "reed-dragonfly", "lightning-bug"];
export const HEARTHROADS_WILDLIFE_ORDER: HearthroadsWildlifeKind[] = ["burrowbell", "dewback-tapir"];
export const HEARTHROADS_AQUATIC_ORDER: HearthroadsAquaticKind[] = ["redfin-salmon", "blue-mackerel", "deepwater-shark"];
export const TIDEGLASS_AQUATIC_ORDER: TideglassAquaticKind[] = [
  "tideglass-crab", "reefglide-terrapin", "glassfin", "lanternjaw", "abyss-skater", "dreadcoil", "tidepup", "worldshell-leviathan", "aetherbell-larva", "aetherbell-leviathan",
];
export const SUGARPLUM_AQUATIC_ORDER: SugarplumAquaticKind[] = ["syrupfin"];
export const RABBIT_ORDER: RabbitKind[] = ["meadow-cottontail", "russet-rabbit", "frost-hare", "chocolate-bunny"];
export const AQUARIUM_MOB_ORDER: AquariumMobKind[] = [
  "sunset-sea-slug", "moonlace-sea-slug", "blue-dragon-sea-slug", "leafsheep-sea-slug", "sea-bunny-nudibranch",
  "spanish-dancer-sea-slug", "crystal-tipped-nudibranch", "ringed-phyllidia", "hooded-melibe", "sea-angel-slug",
  "embercrown-sea-slug", "kelpwarden-sea-slug", "starlight-choir-sea-slug", "voidglass-sea-slug",
  "pocket-goldfish", "sunwheel-angelfish", "stonewhisker-loach",
];
export const DRAGON_ORDER: DragonKind[] = ["fire-dragon", "ice-dragon", "steel-dragon", "sea-dragon", "gold-dragon", "silver-dragon"];
export const HOBBIT_ORDER: HobbitKind[] = [
  "hobbit-mayor", "hobbit-farmer", "hobbit-miner", "hobbit-merchant", "hobbit-banker", "hobbit-hammer-guard", "hobbit-crossbow-guard",
];
export const GOBLIN_ORDER: GoblinKind[] = ["goblin-chieftain", "goblin-worker", "goblin-miner", "goblin-alchemist", "goblin-spear-guard"];
export const ATLANTIAN_ORDER: AtlantianKind[] = [
  "atlantian-tidewarden", "atlantian-kelpkeeper", "atlantian-coralwright", "atlantian-pearlbroker", "atlantian-glowmender", "atlantian-trident-guard",
];
export const SUGARCOURT_ORDER: SugarcourtKind[] = [
  "sugarcourt-crown-confectioner", "sugarcourt-gumdrop-gardener", "sugarcourt-sugarboiler", "sugarcourt-candysmith",
  "sugarcourt-sweetbroker", "sugarcourt-kennelkeeper", "sugarcourt-brittle-guard",
];
export const WOOD_ELF_ORDER: WoodElfKind[] = ["wood-elf-elderweaver", "wood-elf-leafwarden", "wood-elf-bow-warden", "wood-elf-grovekeeper", "wood-elf-tomekeeper", "wood-elf-potioner", "wood-elf-moonbroker"];
export const DWARF_ORDER: DwarfKind[] = ["dwarf-thane", "dwarf-gatewarden", "dwarf-delver", "dwarf-gearwright", "dwarf-golemsmith", "dwarf-powderwright", "dwarf-provisioner"];
export const V1_FACTION_CREATURE_ORDER: V1FactionCreatureKind[] = ["glimmerhart", "runeowl", "glowfin", "copper-mole", "copper-scout-golem", "stone-bulwark-golem", "aetherforged-sentinel", "deepgear-courser-golem", "clockwork-hound-golem", "webspinner-golem"];
export const SENTIENT_MOB_ORDER: SentientMobKind[] = [...HOBBIT_ORDER, ...GOBLIN_ORDER, ...ATLANTIAN_ORDER, ...SUGARCOURT_ORDER, ...WOOD_ELF_ORDER, ...DWARF_ORDER];
export const SPECIAL_MOB_ORDER: SpecialMobKind[] = ["peelop", "reliquary-sentinel", "skeleton", "warg"];
export const ADVENTURE_MOB_ORDER: AdventureMobKind[] = ["auric-scarab", "rootwrithe", "bellroot-matron", "vaultwing", "cinder-maw", "ossuary-keeper", "mossback-kite", "clockwork-marmot", "inkmaw-curator"];
export const UNDERGROUND_MOB_ORDER: UndergroundMobKind[] = ["grotto-grazer", "lanternray", "prismtail-swift", "glassback-newt", "sailfin-skimmer", "ashnose-bat", "chimewing", "cinder-kite", "embercarapace-beetle", "veinling"];
export const LIVING_ROSTER_ORDER: LivingRosterKind[] = [
  "thornhide-trufflehog", "orchard-glider", "petalmask-tanuki", "ironbeak-magpie", "hearthback-badger", "sunfoil-pangolin",
  "glassstep-jerboa", "stormcrest-ibex", "cindercoil-gecko", "cloudkite-pika", "briarclaw-lynx", "gravebell-jackal",
  "cragglass-basilisk", "stormglass-roclet", "brinewhisk-otter", "riverwright-beaver", "mirecrown-crane", "inkveil-cuttle",
  "prismclaw-mantis-shrimp", "reefmender-shrimp", "currentweaver-eel", "shellcarrier-hermit", "wreckwhistle-porpoise",
  "kilnscale-salamander", "sporeback-gardener", "voidmantle-ray", "fossilback-trilobite",
];
export const LEGENDARY_CREATURE_ORDER: LegendaryCreatureKind[] = [
  "ilyr-virebloom", "thalassene", "orichalc", "varkesh-stormmane", "kharza", "sugarwake-sovereign",
  "bellstep-qilin", "aerolith-baleen", "mireglass-kelpie", "cinderwing-pyrausta", "nacre-gatewyrm",
  "frostcauldron-behemoth", "briarcrown-manticore", "ammonarch", "handtail-ahuizotl", "tideclock-cetus",
  "anemoi-gryphon", "sable-gorgon", "namarra-makara", "ashen-salamander-king", "mycelial-oneirophant",
];
export const SUMMONED_CREATURE_ORDER: SummonedCreatureKind[] = ["asterjaw", "vellum-warden", "choir-of-one", "glasswake-stag"];
export const CORE_MOB_ORDER: CoreMobKind[] = [
  ...MORROW_MOB_KINDS,
  ...LEGACY_MOB_ORDER,
  ...MOSSLING_VARIANT_ORDER,
  ...SURFACE_MOB_ORDER,
  ...BIRD_ORDER,
  ...AQUATIC_MOB_ORDER,
  ...POLLINATOR_ORDER,
  ...HEARTHROADS_WILDLIFE_ORDER,
  ...HEARTHROADS_AQUATIC_ORDER,
  ...TIDEGLASS_AQUATIC_ORDER,
  ...SUGARPLUM_AQUATIC_ORDER,
  ...RABBIT_ORDER,
  ...AQUARIUM_MOB_ORDER,
  ...V1_FACTION_CREATURE_ORDER,
  ...DRAGON_ORDER,
  ...SENTIENT_MOB_ORDER,
  ...UNDERGROUND_MOB_ORDER,
  ...ADVENTURE_MOB_ORDER,
  ...SPECIAL_MOB_ORDER,
  ...LIVING_ROSTER_ORDER,
  ...LEGENDARY_CREATURE_ORDER,
  ...SUMMONED_CREATURE_ORDER,
];
export const MOB_ORDER: MobKind[] = [...CORE_MOB_ORDER, ...BUTTERFLY_ORDER];
