import {
  checkAuthority,
  stampAuthority,
  type AuthorityCommand,
  type AuthorityStampedState,
  type FactionId,
  type NpcFactionId,
} from "./factions.ts";
import { barteringConvergence } from "./skills.ts";

/** Decimal-string ledgers stay exact, JSON-safe, and are not capped at 64. */
export type GoldAmount = string;

/** Covers every copy of one item that can fit in the current 36-slot pack. */
export const MAX_TRADE_QUANTITY = 4_096;

export type GoldWalletState = AuthorityStampedState & Readonly<{
  schema: 1;
  ownerId: string;
  balance: GoldAmount;
}>;

export type EconomyFailure =
  | "ok"
  | "duplicate"
  | "forbidden"
  | "stale"
  | "invalid-event"
  | "invalid-amount"
  | "insufficient-gold"
  | "insufficient-stock"
  | "merchant-cannot-pay"
  | "merchant-out-of-stock"
  | "inventory-full";

export type EconomyMutation<T> = Readonly<{
  state: T;
  applied: boolean;
  reason: EconomyFailure;
}>;

function parseGold(value: GoldAmount | number | bigint) {
  const zero = BigInt(0);
  if (typeof value === "bigint") return value < zero ? zero : value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return zero;
    return BigInt(value);
  }
  return /^\d+$/u.test(value) ? BigInt(value) : zero;
}

export function normalizeGold(value: GoldAmount | number | bigint): GoldAmount {
  return parseGold(value).toString();
}

export function addGold(a: GoldAmount, b: GoldAmount | number | bigint) {
  return (parseGold(a) + parseGold(b)).toString();
}

export function subtractGold(a: GoldAmount, b: GoldAmount | number | bigint): GoldAmount | null {
  const amount = parseGold(b);
  const balance = parseGold(a);
  return amount <= balance ? (balance - amount).toString() : null;
}

export function compareGold(a: GoldAmount, b: GoldAmount | number | bigint) {
  const left = parseGold(a);
  const right = parseGold(b);
  return left === right ? 0 : left > right ? 1 : -1;
}

export const GOLD_INGOT_VALUE = 10;

export function goldValueForIngots(count: number) {
  return Math.max(0, Math.floor(Number.isFinite(count) ? count : 0)) * GOLD_INGOT_VALUE;
}

export function withdrawableGoldIngots(balance: GoldAmount | number | bigint, requested = Number.MAX_SAFE_INTEGER) {
  const available = parseGold(balance) / BigInt(GOLD_INGOT_VALUE);
  const boundedRequest = BigInt(Math.max(0, Math.floor(Number.isFinite(requested) ? requested : 0)));
  return Number(available < boundedRequest ? available : boundedRequest);
}

export function createGoldWallet(authorityId: string, ownerId: string, startingGold: GoldAmount | number | bigint = 0): GoldWalletState {
  return {
    schema: 1,
    authorityId,
    revision: 0,
    recentEventIds: [],
    ownerId,
    balance: normalizeGold(startingGold),
  };
}

export function creditGold(wallet: GoldWalletState, amount: GoldAmount | number | bigint, command: AuthorityCommand): EconomyMutation<GoldWalletState> {
  const authority = checkAuthority(wallet, command);
  const parsed = parseGold(amount);
  if (authority !== "ok") return { state: wallet, applied: false, reason: authority };
  if (parsed <= BigInt(0)) return { state: wallet, applied: false, reason: "invalid-amount" };
  return {
    state: stampAuthority({ ...wallet, balance: addGold(wallet.balance, parsed) }, command),
    applied: true,
    reason: "ok",
  };
}

export function debitGold(wallet: GoldWalletState, amount: GoldAmount | number | bigint, command: AuthorityCommand): EconomyMutation<GoldWalletState> {
  const authority = checkAuthority(wallet, command);
  const parsed = parseGold(amount);
  if (authority !== "ok") return { state: wallet, applied: false, reason: authority };
  if (parsed <= BigInt(0)) return { state: wallet, applied: false, reason: "invalid-amount" };
  const balance = subtractGold(wallet.balance, parsed);
  if (balance === null) return { state: wallet, applied: false, reason: "insufficient-gold" };
  return { state: stampAuthority({ ...wallet, balance }, command), applied: true, reason: "ok" };
}

export type MerchantProfession =
  | "general"
  | "farmer"
  | "miner"
  | "brewer"
  | "alchemist"
  | "blacksmith"
  | "banker"
  | "warrior"
  | "mayor"
  | "atlantian-tidewarden"
  | "atlantian-kelpkeeper"
  | "atlantian-coralwright"
  | "atlantian-pearlbroker"
  | "atlantian-glowmender"
  | "atlantian-trident-guard"
  | "sugarcourt-crown-confectioner"
  | "sugarcourt-gumdrop-gardener"
  | "sugarcourt-sugarboiler"
  | "sugarcourt-candysmith"
  | "sugarcourt-sweetbroker"
  | "sugarcourt-kennelkeeper"
  | "sugarcourt-brittle-guard"
  | "wood-elf-elderweaver"
  | "wood-elf-leafwarden"
  | "wood-elf-bow-warden"
  | "wood-elf-grovekeeper"
  | "wood-elf-tomekeeper"
  | "wood-elf-potioner"
  | "wood-elf-moonbroker"
  | "dwarf-thane"
  | "dwarf-gatewarden"
  | "dwarf-delver"
  | "dwarf-gearwright"
  | "dwarf-golemsmith"
  | "dwarf-powderwright"
  | "dwarf-provisioner";

export type CommerceCategory =
  | "food"
  | "crop"
  | "drink"
  | "honey"
  | "material"
  | "ore"
  | "weapon"
  | "armor"
  | "ammunition"
  | "potion"
  | "blueprint"
  | "creature"
  | "treasure"
  | "misc";

export type CommerceItem = Readonly<{
  key: string;
  name: string;
  category: CommerceCategory;
  baseValue: number;
  stackLimit: number;
  tags?: readonly string[];
}>;

export type MerchantStack = Readonly<{
  itemKey: string;
  count: number;
}>;

export type MerchantState = AuthorityStampedState & Readonly<{
  schema: 1;
  id: string;
  factionId: Exclude<FactionId, "player">;
  profession: MerchantProfession;
  gold: GoldAmount;
  inventory: readonly MerchantStack[];
  customCatalog: Readonly<Record<string, CommerceItem>>;
  restockSeed: string;
  lastRestockDay: number;
}>;

export const COMMERCE_CATALOG: Readonly<Record<string, CommerceItem>> = Object.fromEntries(([
  { key: "field-oxygen-reserve", name: "Sealed Field O2 Reserve", category: "material", baseValue: 80, stackLimit: 1, tags: ["dwarf", "life-support"] },
  { key: "apple", name: "Apple", category: "food", baseValue: 3, stackLimit: 64, tags: ["fruit"] },
  { key: "moonberry", name: "Moonberry", category: "crop", baseValue: 5, stackLimit: 64, tags: ["berry"] },
  { key: "honey-jar", name: "Honey Jar", category: "honey", baseValue: 14, stackLimit: 12 },
  { key: "royal-jelly", name: "Royal Jelly", category: "honey", baseValue: 55, stackLimit: 12 },
  { key: "mead", name: "Hearthgold Mead", category: "drink", baseValue: 24, stackLimit: 16, tags: ["mead"] },
  { key: "hearthberry-apple-pie", name: "Hearthberry Apple Pie", category: "food", baseValue: 22, stackLimit: 16, tags: ["hobbit", "baked", "fruit"] },
  { key: "raw-iron", name: "Raw Iron", category: "ore", baseValue: 8, stackLimit: 64 },
  { key: "raw-gold", name: "Raw Gold", category: "ore", baseValue: 18, stackLimit: 64 },
  { key: "gold-ingot", name: "Gold Ingot", category: "ore", baseValue: GOLD_INGOT_VALUE, stackLimit: 64, tags: ["currency"] },
  { key: "plant-fiber", name: "Plant Fiber", category: "material", baseValue: 2, stackLimit: 64 },
  { key: "crossbow", name: "Hearthguard Crossbow", category: "weapon", baseValue: 92, stackLimit: 1, tags: ["hobbit"] },
  { key: "fine-crossbow", name: "Freehold Arbalest", category: "weapon", baseValue: 260, stackLimit: 1, tags: ["hobbit", "tier-2"] },
  { key: "bolt", name: "Crossbow Bolt", category: "ammunition", baseValue: 2, stackLimit: 64 },
  { key: "goblin-spear", name: "Brassroot Spear", category: "weapon", baseValue: 74, stackLimit: 1, tags: ["goblin"] },
  { key: "tempered-spear", name: "Tempered Rootspike", category: "weapon", baseValue: 190, stackLimit: 1, tags: ["goblin", "tier-2"] },
  { key: "health-potion", name: "Health Potion", category: "potion", baseValue: 28, stackLimit: 16 },
  { key: "goblin-tonic", name: "Rootstep Tonic", category: "potion", baseValue: 64, stackLimit: 16, tags: ["goblin"] },
  { key: "hobbit-potion", name: "Hearthward Draught", category: "potion", baseValue: 72, stackLimit: 16, tags: ["hobbit"] },
  { key: "blueprint-crossbow", name: "Blueprint: Crossbow", category: "blueprint", baseValue: 330, stackLimit: 16 },
  { key: "blueprint-fine-crossbow", name: "Blueprint: Freehold Arbalest", category: "blueprint", baseValue: 920, stackLimit: 16 },
  { key: "blueprint-spear", name: "Blueprint: Brassroot Spear", category: "blueprint", baseValue: 280, stackLimit: 16 },
  { key: "blueprint-goblin-tonic", name: "Blueprint: Rootstep Tonic", category: "blueprint", baseValue: 440, stackLimit: 16 },
  { key: "blueprint-hobbit-potion", name: "Blueprint: Hearthward Draught", category: "blueprint", baseValue: 480, stackLimit: 16 },
  { key: "blueprint-mead", name: "Blueprint: Hearthgold Mead", category: "blueprint", baseValue: 360, stackLimit: 16 },
  { key: "unaligned-warg-orb", name: "Young Warg Care Transfer", category: "creature", baseValue: 640, stackLimit: 1, tags: ["unaligned", "warg"] },
  { key: "cloudglass-relic", name: "Cloudglass Relic", category: "treasure", baseValue: 210, stackLimit: 1 },
  { key: "glow-kelp", name: "Glow Kelp Frond", category: "crop", baseValue: 7, stackLimit: 64, tags: ["aquatic", "atlantian", "kelp"] },
  { key: "shellfruit", name: "Shellfruit", category: "food", baseValue: 11, stackLimit: 32, tags: ["aquatic", "atlantian", "fruit"] },
  { key: "reefglass", name: "Reefglass", category: "material", baseValue: 19, stackLimit: 64, tags: ["aquatic", "atlantian", "craft"] },
  { key: "living-coral", name: "Living Coral", category: "material", baseValue: 16, stackLimit: 32, tags: ["aquatic", "atlantian", "coral"] },
  { key: "lumen-pearl", name: "Lumen Pearl", category: "treasure", baseValue: 48, stackLimit: 32, tags: ["aquatic", "atlantian", "pearl"] },
  { key: "prismatic-pearl", name: "Prismatic Pearl", category: "treasure", baseValue: 145, stackLimit: 16, tags: ["aquatic", "atlantian", "pearl", "rare"] },
  { key: "tideglass-trident", name: "Tideglass Trident", category: "weapon", baseValue: 168, stackLimit: 1, tags: ["aquatic", "atlantian"] },
  { key: "glowmender-salve", name: "Glowmender Salve", category: "potion", baseValue: 76, stackLimit: 16, tags: ["aquatic", "atlantian", "medicine"] },
  { key: "peppermint-cane", name: "Peppermint Cane", category: "crop", baseValue: 7, stackLimit: 64, tags: ["sugarcourt", "mint"] },
  { key: "peppermint-starts", name: "Peppermint Starts", category: "crop", baseValue: 9, stackLimit: 64, tags: ["sugarcourt", "seed"] },
  { key: "cocoa-nib", name: "Cocoa Puff Nib", category: "food", baseValue: 6, stackLimit: 64, tags: ["sugarcourt", "crop"] },
  { key: "cocoa-seeds", name: "Cocoa Puff Seeds", category: "crop", baseValue: 10, stackLimit: 64, tags: ["sugarcourt", "seed"] },
  { key: "gumdrop", name: "Wild Gumdrop", category: "food", baseValue: 6, stackLimit: 64, tags: ["sugarcourt", "candy"] },
  { key: "lollipop-petal", name: "Lollipop Orchid Petal", category: "crop", baseValue: 8, stackLimit: 64, tags: ["sugarcourt", "flower"] },
  { key: "marshmallow-tuft", name: "Marshmallow Tuft", category: "food", baseValue: 8, stackLimit: 64, tags: ["sugarcourt", "candy"] },
  { key: "chocolate-bunny", name: "Chocolate Bunny", category: "food", baseValue: 32, stackLimit: 64, tags: ["sugarcourt", "candy", "rabbit"] },
  { key: "candied-alloy", name: "Tempered Candy Alloy", category: "material", baseValue: 24, stackLimit: 64, tags: ["sugarcourt", "craft"] },
  { key: "boiled-sugarbrick", name: "Boiled Sugarbrick", category: "material", baseValue: 12, stackLimit: 64, tags: ["sugarcourt", "building"] },
  { key: "sugarworks", name: "Sugarworks", category: "misc", baseValue: 118, stackLimit: 16, tags: ["sugarcourt", "station"] },
  { key: "honey-bucket", name: "Honey Bucket", category: "honey", baseValue: 58, stackLimit: 1, tags: ["sugarcourt", "liquid"] },
  { key: "syrup-bucket", name: "Syrup Bucket", category: "drink", baseValue: 46, stackLimit: 1, tags: ["sugarcourt", "liquid"] },
  { key: "rockcandy-saber", name: "Rockcandy Saber", category: "weapon", baseValue: 245, stackLimit: 1, tags: ["sugarcourt", "tier-3"] },
  { key: "peppermint-pike", name: "Peppermint Pike", category: "weapon", baseValue: 178, stackLimit: 1, tags: ["sugarcourt", "tier-3"] },
  { key: "fondant-crown", name: "Sugarplate Crown", category: "armor", baseValue: 170, stackLimit: 1, tags: ["sugarcourt", "sugarplate"] },
  { key: "fondant-cuirass", name: "Sugarplate Cuirass", category: "armor", baseValue: 340, stackLimit: 1, tags: ["sugarcourt", "sugarplate"] },
  { key: "fondant-greaves", name: "Sugarplate Greaves", category: "armor", baseValue: 270, stackLimit: 1, tags: ["sugarcourt", "sugarplate"] },
  { key: "fondant-boots", name: "Sugarplate Boots", category: "armor", baseValue: 160, stackLimit: 1, tags: ["sugarcourt", "sugarplate"] },
  { key: "peppermint-rush", name: "Peppermint Rush", category: "potion", baseValue: 72, stackLimit: 8, tags: ["sugarcourt", "potion"] },
  { key: "marshmallow-ward", name: "Marshmallow Ward", category: "potion", baseValue: 84, stackLimit: 8, tags: ["sugarcourt", "potion"] },
  { key: "blueprint-sugarcourt-arms", name: "Blueprint: Sugarcourt Arms", category: "blueprint", baseValue: 620, stackLimit: 16, tags: ["sugarcourt"] },
  { key: "blueprint-sugarcourt-armor", name: "Pattern: Sugarplate Armor", category: "blueprint", baseValue: 980, stackLimit: 16, tags: ["sugarcourt"] },
  { key: "blueprint-peppermint-rush", name: "Formula: Peppermint Rush", category: "blueprint", baseValue: 430, stackLimit: 16, tags: ["sugarcourt"] },
  { key: "blueprint-marshmallow-ward", name: "Formula: Marshmallow Ward", category: "blueprint", baseValue: 520, stackLimit: 16, tags: ["sugarcourt"] },
  { key: "unaligned-taffy-hound-orb", name: "Taffy Hound Care Transfer", category: "creature", baseValue: 590, stackLimit: 1, tags: ["sugarcourt", "unaligned", "taffy-hound"] },
  { key: "unaligned-praline-cat-orb", name: "Praline Cat Care Transfer", category: "creature", baseValue: 520, stackLimit: 1, tags: ["sugarcourt", "unaligned", "praline-cat"] },
  { key: "fire-lair-survey", name: "Fire Lair Survey Charter", category: "treasure", baseValue: 760, stackLimit: 8, tags: ["dragon", "survey", "rare"] },
  { key: "ice-lair-survey", name: "Ice Lair Survey Charter", category: "treasure", baseValue: 760, stackLimit: 8, tags: ["dragon", "survey", "rare"] },
  { key: "steel-lair-survey", name: "Steel Lair Survey Charter", category: "treasure", baseValue: 820, stackLimit: 8, tags: ["dragon", "survey", "rare"] },
  { key: "elder-fire-lair-survey", name: "Elder Fire Lair Survey", category: "treasure", baseValue: 1_480, stackLimit: 8, tags: ["dragon", "survey", "stage-5", "very-rare"] },
  { key: "elder-ice-lair-survey", name: "Elder Ice Lair Survey", category: "treasure", baseValue: 1_480, stackLimit: 8, tags: ["dragon", "survey", "stage-5", "very-rare"] },
  { key: "elder-steel-lair-survey", name: "Elder Steel Lair Survey", category: "treasure", baseValue: 1_560, stackLimit: 8, tags: ["dragon", "survey", "stage-5", "very-rare"] },
  { key: "gold-lair-survey", name: "Gold Lair Survey Charter", category: "treasure", baseValue: 3_800, stackLimit: 8, tags: ["dragon", "survey", "mythic"] },
  { key: "silver-lair-survey", name: "Silver Lair Survey Charter", category: "treasure", baseValue: 3_800, stackLimit: 8, tags: ["dragon", "survey", "mythic"] },
  { key: "elder-gold-lair-survey", name: "Elder Gold Lair Survey", category: "treasure", baseValue: 7_600, stackLimit: 8, tags: ["dragon", "survey", "stage-5", "mythic"] },
  { key: "elder-silver-lair-survey", name: "Elder Silver Lair Survey", category: "treasure", baseValue: 7_600, stackLimit: 8, tags: ["dragon", "survey", "stage-5", "mythic"] },
  { key: "tome-flame-jet", name: "Tome of Flame Jet", category: "treasure", baseValue: 540, stackLimit: 16, tags: ["magic", "tome", "rare"] },
  { key: "tome-frost-lance", name: "Tome of Frost Lance", category: "treasure", baseValue: 560, stackLimit: 16, tags: ["magic", "tome", "rare"] },
  { key: "tome-steel-spear", name: "Tome of Steel Spear", category: "treasure", baseValue: 600, stackLimit: 16, tags: ["magic", "tome", "rare"] },
  { key: "tome-healing-light", name: "Tome of Healing Light", category: "treasure", baseValue: 680, stackLimit: 16, tags: ["magic", "tome", "rare"] },
  { key: "tome-blinkstep", name: "Tome of Blinkstep", category: "treasure", baseValue: 720, stackLimit: 16, tags: ["magic", "tome", "rare"] },
  { key: "tome-arcane-ward", name: "Tome of Arcane Ward", category: "treasure", baseValue: 640, stackLimit: 16, tags: ["magic", "tome", "rare"] },
  { key: "blueprint-dragonbone-arms", name: "Treatise: Dragonbone Arms", category: "blueprint", baseValue: 1_450, stackLimit: 16, tags: ["dragon", "rare"] },
  { key: "blueprint-dragon-scale-armor", name: "Treatise: Dragon Scale Armor", category: "blueprint", baseValue: 2_100, stackLimit: 16, tags: ["dragon", "rare"] },
  { key: "blueprint-draconic-incubator", name: "Schematics: Draconic Incubator", category: "blueprint", baseValue: 1_750, stackLimit: 16, tags: ["dragon", "rare"] },
  { key: "blueprint-dragon-husbandry", name: "Dragon Husbandry Codex", category: "blueprint", baseValue: 1_900, stackLimit: 16, tags: ["dragon", "rare"] },
  { key: "manaheart-draught", name: "Manaheart Draught", category: "potion", baseValue: 420, stackLimit: 8, tags: ["magic", "dragon"] },
  { key: "moonbough-staff", name: "Moonbough Staff", category: "weapon", baseValue: 230, stackLimit: 1, tags: ["wood-elf", "magic"] },
  { key: "glimmerbow", name: "Glimmerbow", category: "weapon", baseValue: 265, stackLimit: 1, tags: ["wood-elf", "bow"] },
  { key: "glimmer-arrow", name: "Glimmer Arrow", category: "ammunition", baseValue: 4, stackLimit: 64, tags: ["wood-elf"] },
  { key: "moonpetal", name: "Moonpetal", category: "crop", baseValue: 11, stackLimit: 64, tags: ["wood-elf", "glowing", "flower"] },
  { key: "starfern", name: "Starfern Frond", category: "crop", baseValue: 9, stackLimit: 64, tags: ["wood-elf", "glowing"] },
  { key: "dreamcap", name: "Dreamcap", category: "food", baseValue: 14, stackLimit: 64, tags: ["wood-elf", "glowing", "mushroom"] },
  { key: "lumenreed-frond", name: "Lumenreed Frond", category: "crop", baseValue: 12, stackLimit: 64, tags: ["wood-elf", "glowing", "aquatic"] },
  { key: "moonstep-elixir", name: "Moonstep Elixir", category: "potion", baseValue: 96, stackLimit: 8, tags: ["wood-elf", "magic"] },
  { key: "verdant-renewal", name: "Verdant Renewal", category: "potion", baseValue: 112, stackLimit: 8, tags: ["wood-elf", "magic"] },
  { key: "tome-verdant-volley", name: "Tome of Verdant Volley", category: "treasure", baseValue: 610, stackLimit: 16, tags: ["wood-elf", "magic", "tome"] },
  { key: "tome-starlight-snare", name: "Tome of Starlight Snare", category: "treasure", baseValue: 790, stackLimit: 16, tags: ["wood-elf", "magic", "tome", "rare"] },
  { key: "blueprint-glimmerbow", name: "Pattern: Glimmerbow", category: "blueprint", baseValue: 780, stackLimit: 16, tags: ["wood-elf"] },
  { key: "blueprint-moonstep", name: "Formula: Moonstep Elixir", category: "blueprint", baseValue: 560, stackLimit: 16, tags: ["wood-elf"] },
  { key: "blueprint-verdant-renewal", name: "Formula: Verdant Renewal", category: "blueprint", baseValue: 680, stackLimit: 16, tags: ["wood-elf"] },
  { key: "unaligned-glimmerhart-orb", name: "Glimmerhart Care Transfer", category: "creature", baseValue: 740, stackLimit: 1, tags: ["wood-elf", "unaligned", "glimmerhart"] },
  { key: "unaligned-runeowl-orb", name: "Runeowl Care Transfer", category: "creature", baseValue: 660, stackLimit: 1, tags: ["wood-elf", "unaligned", "runeowl"] },
  { key: "flintlock-pistol", name: "Deepgear Flintlock", category: "weapon", baseValue: 310, stackLimit: 1, tags: ["dwarf", "firearm"] },
  { key: "lead-ball", name: "Flintlock Ball", category: "ammunition", baseValue: 5, stackLimit: 64, tags: ["dwarf", "firearm"] },
  { key: "deepgear-lantern", name: "Deepgear Lantern", category: "misc", baseValue: 58, stackLimit: 16, tags: ["dwarf", "light"] },
  { key: "gear-cluster", name: "Precision Gear Cluster", category: "material", baseValue: 22, stackLimit: 64, tags: ["dwarf", "golem"] },
  { key: "deepgear-alloy", name: "Deepgear Alloy", category: "material", baseValue: 38, stackLimit: 64, tags: ["dwarf", "golem"] },
  { key: "copper-ore", name: "Copper Ore", category: "ore", baseValue: 10, stackLimit: 64, tags: ["dwarf", "golem"] },
  { key: "blueprint-flintlock", name: "Blueprint: Deepgear Flintlock", category: "blueprint", baseValue: 940, stackLimit: 16, tags: ["dwarf"] },
  { key: "blueprint-copper-scout", name: "Blueprint: Copper Scout", category: "blueprint", baseValue: 720, stackLimit: 16, tags: ["dwarf", "golem"] },
  { key: "blueprint-stone-bulwark", name: "Blueprint: Stone Bulwark", category: "blueprint", baseValue: 1_280, stackLimit: 16, tags: ["dwarf", "golem"] },
  { key: "blueprint-aetherforged-sentinel", name: "Blueprint: Aetherforged Sentinel", category: "blueprint", baseValue: 2_650, stackLimit: 16, tags: ["dwarf", "golem", "rare"] },
  { key: "blueprint-deepgear-courser", name: "Blueprint: Deepgear Courser", category: "blueprint", baseValue: 1_860, stackLimit: 16, tags: ["dwarf", "golem", "mount"] },
  { key: "blueprint-clockwork-hound", name: "Blueprint: Clockwork Hound", category: "blueprint", baseValue: 1_450, stackLimit: 16, tags: ["dwarf", "golem", "companion"] },
  { key: "blueprint-webspinner", name: "Blueprint: Webspinner", category: "blueprint", baseValue: 1_950, stackLimit: 16, tags: ["dwarf", "golem", "controller", "rare"] },
  { key: "copper-scout-golem-orb", name: "Commissioned Copper Scout", category: "creature", baseValue: 980, stackLimit: 1, tags: ["dwarf", "golem", "unaligned"] },
  { key: "deepgear-courser-golem-orb", name: "Commissioned Deepgear Courser", category: "creature", baseValue: 2_400, stackLimit: 1, tags: ["dwarf", "golem", "mount", "unaligned", "rare"] },
  { key: "clockwork-hound-golem-orb", name: "Commissioned Clockwork Hound", category: "creature", baseValue: 2_050, stackLimit: 1, tags: ["dwarf", "golem", "companion", "unaligned", "rare"] },
  { key: "webspinner-golem-orb", name: "Commissioned Webspinner", category: "creature", baseValue: 2_750, stackLimit: 1, tags: ["dwarf", "golem", "controller", "unaligned", "rare"] },
  { key: "unaligned-copper-mole-orb", name: "Copper Mole Care Transfer", category: "creature", baseValue: 580, stackLimit: 1, tags: ["dwarf", "unaligned", "copper-mole"] },
  { key: "sea-dragon-nest-chart", name: "Chart: Sea Dragon Nest", category: "treasure", baseValue: 1_180, stackLimit: 8, tags: ["atlantian", "dragon", "survey", "rare"] },
  { key: "hearthroads-route-folio", name: "Hearthroads Route Folio", category: "treasure", baseValue: 145, stackLimit: 8, tags: ["map", "settlement", "survey"] },
] satisfies CommerceItem[]).map((definition) => [definition.key, definition])) as Readonly<Record<string, CommerceItem>>;

export type MerchantOffer = Readonly<MerchantStack & { professions: readonly MerchantProfession[]; rareChance?: number }>;

export const HOBBIT_MERCHANT_OFFERS: readonly MerchantOffer[] = [
  { itemKey: "hearthroads-route-folio", count: 1, professions: ["general", "mayor"], rareChance: 0.36 },
  { itemKey: "apple", count: 18, professions: ["farmer", "general"] },
  { itemKey: "honey-jar", count: 8, professions: ["brewer", "general"] },
  { itemKey: "mead", count: 12, professions: ["brewer", "general"] },
  { itemKey: "hearthberry-apple-pie", count: 8, professions: ["brewer", "general"] },
  { itemKey: "crossbow", count: 2, professions: ["blacksmith", "warrior"] },
  { itemKey: "bolt", count: 48, professions: ["blacksmith", "warrior"] },
  { itemKey: "blueprint-crossbow", count: 1, professions: ["blacksmith"] },
  { itemKey: "blueprint-fine-crossbow", count: 1, professions: ["blacksmith"] },
  { itemKey: "blueprint-mead", count: 1, professions: ["brewer"] },
  { itemKey: "blueprint-hobbit-potion", count: 1, professions: ["alchemist"] },
  { itemKey: "hobbit-potion", count: 3, professions: ["alchemist"] },
  { itemKey: "fire-lair-survey", count: 1, professions: ["general", "mayor"], rareChance: 0.06 },
  { itemKey: "elder-fire-lair-survey", count: 1, professions: ["mayor"], rareChance: 0.012 },
  { itemKey: "gold-lair-survey", count: 1, professions: ["mayor"], rareChance: 0.003 },
  { itemKey: "elder-gold-lair-survey", count: 1, professions: ["mayor"], rareChance: 0.0006 },
  { itemKey: "tome-healing-light", count: 1, professions: ["alchemist"], rareChance: 0.08 },
  { itemKey: "tome-blinkstep", count: 1, professions: ["general"], rareChance: 0.035 },
  { itemKey: "blueprint-dragon-husbandry", count: 1, professions: ["mayor", "blacksmith"], rareChance: 0.025 },
];

export const GOBLIN_MERCHANT_OFFERS: readonly MerchantOffer[] = [
  { itemKey: "hearthroads-route-folio", count: 1, professions: ["general", "mayor"], rareChance: 0.32 },
  { itemKey: "raw-iron", count: 32, professions: ["miner", "general", "blacksmith"] },
  { itemKey: "raw-gold", count: 10, professions: ["miner", "general"] },
  { itemKey: "goblin-spear", count: 4, professions: ["blacksmith", "warrior"] },
  { itemKey: "tempered-spear", count: 1, professions: ["blacksmith"] },
  { itemKey: "blueprint-spear", count: 1, professions: ["blacksmith"] },
  { itemKey: "goblin-tonic", count: 5, professions: ["alchemist", "general"] },
  { itemKey: "blueprint-goblin-tonic", count: 1, professions: ["alchemist"] },
  { itemKey: "unaligned-warg-orb", count: 1, professions: ["mayor", "general"] },
  { itemKey: "steel-lair-survey", count: 1, professions: ["general", "mayor"], rareChance: 0.065 },
  { itemKey: "elder-steel-lair-survey", count: 1, professions: ["mayor"], rareChance: 0.012 },
  { itemKey: "tome-steel-spear", count: 1, professions: ["alchemist", "blacksmith"], rareChance: 0.08 },
  { itemKey: "tome-frost-lance", count: 1, professions: ["alchemist"], rareChance: 0.035 },
  { itemKey: "blueprint-dragonbone-arms", count: 1, professions: ["blacksmith"], rareChance: 0.035 },
];

export const ATLANTIAN_MERCHANT_OFFERS: readonly MerchantOffer[] = [
  { itemKey: "hearthroads-route-folio", count: 1, professions: ["general", "mayor"], rareChance: 0.34 },
  { itemKey: "glow-kelp", count: 28, professions: ["atlantian-kelpkeeper", "atlantian-tidewarden"] },
  { itemKey: "shellfruit", count: 18, professions: ["atlantian-kelpkeeper", "atlantian-pearlbroker"] },
  { itemKey: "reefglass", count: 20, professions: ["atlantian-coralwright", "atlantian-pearlbroker"] },
  { itemKey: "living-coral", count: 14, professions: ["atlantian-coralwright"] },
  { itemKey: "lumen-pearl", count: 10, professions: ["atlantian-pearlbroker", "atlantian-tidewarden"] },
  { itemKey: "prismatic-pearl", count: 2, professions: ["atlantian-pearlbroker"] },
  { itemKey: "tideglass-trident", count: 3, professions: ["atlantian-coralwright", "atlantian-trident-guard"] },
  { itemKey: "glowmender-salve", count: 6, professions: ["atlantian-glowmender", "atlantian-tidewarden"] },
  { itemKey: "ice-lair-survey", count: 1, professions: ["atlantian-pearlbroker", "atlantian-tidewarden"], rareChance: 0.07 },
  { itemKey: "elder-ice-lair-survey", count: 1, professions: ["atlantian-tidewarden"], rareChance: 0.014 },
  { itemKey: "tome-frost-lance", count: 1, professions: ["atlantian-glowmender"], rareChance: 0.085 },
  { itemKey: "tome-arcane-ward", count: 1, professions: ["atlantian-pearlbroker"], rareChance: 0.055 },
  { itemKey: "blueprint-draconic-incubator", count: 1, professions: ["atlantian-coralwright"], rareChance: 0.03 },
  { itemKey: "sea-dragon-nest-chart", count: 1, professions: ["atlantian-pearlbroker", "atlantian-tidewarden"], rareChance: 0.055 },
];

export const SUGARCOURT_MERCHANT_OFFERS: readonly MerchantOffer[] = [
  { itemKey: "hearthroads-route-folio", count: 1, professions: ["general", "mayor"], rareChance: 0.34 },
  { itemKey: "peppermint-starts", count: 18, professions: ["sugarcourt-gumdrop-gardener"] },
  { itemKey: "peppermint-cane", count: 24, professions: ["sugarcourt-gumdrop-gardener", "sugarcourt-sugarboiler"] },
  { itemKey: "cocoa-seeds", count: 14, professions: ["sugarcourt-gumdrop-gardener"] },
  { itemKey: "cocoa-nib", count: 20, professions: ["sugarcourt-gumdrop-gardener", "sugarcourt-sweetbroker"] },
  { itemKey: "gumdrop", count: 24, professions: ["sugarcourt-gumdrop-gardener", "sugarcourt-sweetbroker", "sugarcourt-kennelkeeper"] },
  { itemKey: "lollipop-petal", count: 18, professions: ["sugarcourt-gumdrop-gardener", "sugarcourt-sugarboiler"] },
  { itemKey: "marshmallow-tuft", count: 18, professions: ["sugarcourt-sweetbroker", "sugarcourt-kennelkeeper"] },
  { itemKey: "boiled-sugarbrick", count: 24, professions: ["sugarcourt-sweetbroker", "sugarcourt-candysmith"] },
  { itemKey: "sugarworks", count: 2, professions: ["sugarcourt-sugarboiler", "sugarcourt-sweetbroker"] },
  { itemKey: "honey-bucket", count: 2, professions: ["sugarcourt-sugarboiler"] },
  { itemKey: "syrup-bucket", count: 3, professions: ["sugarcourt-sugarboiler", "sugarcourt-sweetbroker"] },
  { itemKey: "peppermint-rush", count: 5, professions: ["sugarcourt-sugarboiler"] },
  { itemKey: "marshmallow-ward", count: 4, professions: ["sugarcourt-sugarboiler"] },
  { itemKey: "blueprint-peppermint-rush", count: 1, professions: ["sugarcourt-sugarboiler"] },
  { itemKey: "blueprint-marshmallow-ward", count: 1, professions: ["sugarcourt-sugarboiler"] },
  { itemKey: "rockcandy-saber", count: 2, professions: ["sugarcourt-candysmith"] },
  { itemKey: "peppermint-pike", count: 3, professions: ["sugarcourt-candysmith", "sugarcourt-brittle-guard"] },
  { itemKey: "fondant-crown", count: 1, professions: ["sugarcourt-candysmith"] },
  { itemKey: "fondant-cuirass", count: 1, professions: ["sugarcourt-candysmith"] },
  { itemKey: "fondant-greaves", count: 1, professions: ["sugarcourt-candysmith"] },
  { itemKey: "fondant-boots", count: 1, professions: ["sugarcourt-candysmith"] },
  { itemKey: "blueprint-sugarcourt-arms", count: 1, professions: ["sugarcourt-candysmith"] },
  { itemKey: "blueprint-sugarcourt-armor", count: 1, professions: ["sugarcourt-candysmith"] },
  { itemKey: "unaligned-taffy-hound-orb", count: 1, professions: ["sugarcourt-kennelkeeper"] },
  { itemKey: "unaligned-praline-cat-orb", count: 1, professions: ["sugarcourt-kennelkeeper"] },
  { itemKey: "fire-lair-survey", count: 1, professions: ["sugarcourt-sweetbroker"], rareChance: 0.05 },
  { itemKey: "ice-lair-survey", count: 1, professions: ["sugarcourt-sweetbroker"], rareChance: 0.05 },
  { itemKey: "steel-lair-survey", count: 1, professions: ["sugarcourt-sweetbroker"], rareChance: 0.04 },
  { itemKey: "elder-fire-lair-survey", count: 1, professions: ["sugarcourt-crown-confectioner"], rareChance: 0.009 },
  { itemKey: "elder-ice-lair-survey", count: 1, professions: ["sugarcourt-crown-confectioner"], rareChance: 0.009 },
  { itemKey: "elder-steel-lair-survey", count: 1, professions: ["sugarcourt-crown-confectioner"], rareChance: 0.009 },
  { itemKey: "gold-lair-survey", count: 1, professions: ["sugarcourt-crown-confectioner"], rareChance: 0.002 },
  { itemKey: "silver-lair-survey", count: 1, professions: ["sugarcourt-crown-confectioner"], rareChance: 0.002 },
  { itemKey: "tome-flame-jet", count: 1, professions: ["sugarcourt-sugarboiler"], rareChance: 0.075 },
  { itemKey: "tome-blinkstep", count: 1, professions: ["sugarcourt-crown-confectioner"], rareChance: 0.045 },
  { itemKey: "blueprint-dragon-scale-armor", count: 1, professions: ["sugarcourt-candysmith"], rareChance: 0.025 },
];

export const WOOD_ELF_MERCHANT_OFFERS: readonly MerchantOffer[] = [
  { itemKey: "hearthroads-route-folio", count: 1, professions: ["general", "mayor"], rareChance: 0.3 },
  { itemKey: "moonpetal", count: 20, professions: ["wood-elf-grovekeeper", "wood-elf-potioner"] },
  { itemKey: "starfern", count: 20, professions: ["wood-elf-grovekeeper", "wood-elf-potioner"] },
  { itemKey: "dreamcap", count: 14, professions: ["wood-elf-grovekeeper", "wood-elf-potioner"] },
  { itemKey: "lumenreed-frond", count: 16, professions: ["wood-elf-grovekeeper", "wood-elf-potioner"] },
  { itemKey: "moonbough-staff", count: 3, professions: ["wood-elf-leafwarden", "wood-elf-tomekeeper"] },
  { itemKey: "glimmerbow", count: 3, professions: ["wood-elf-bow-warden", "wood-elf-moonbroker"] },
  { itemKey: "glimmer-arrow", count: 48, professions: ["wood-elf-bow-warden", "wood-elf-moonbroker"] },
  { itemKey: "moonstep-elixir", count: 4, professions: ["wood-elf-potioner"] },
  { itemKey: "verdant-renewal", count: 4, professions: ["wood-elf-potioner"] },
  { itemKey: "tome-verdant-volley", count: 1, professions: ["wood-elf-tomekeeper", "wood-elf-elderweaver"], rareChance: 0.18 },
  { itemKey: "tome-starlight-snare", count: 1, professions: ["wood-elf-tomekeeper"], rareChance: 0.07 },
  { itemKey: "blueprint-glimmerbow", count: 1, professions: ["wood-elf-bow-warden", "wood-elf-moonbroker"] },
  { itemKey: "blueprint-moonstep", count: 1, professions: ["wood-elf-potioner"] },
  { itemKey: "blueprint-verdant-renewal", count: 1, professions: ["wood-elf-potioner"] },
  { itemKey: "unaligned-glimmerhart-orb", count: 1, professions: ["wood-elf-grovekeeper"], rareChance: 0.32 },
  { itemKey: "unaligned-runeowl-orb", count: 1, professions: ["wood-elf-tomekeeper"], rareChance: 0.28 },
  { itemKey: "silver-lair-survey", count: 1, professions: ["wood-elf-moonbroker", "wood-elf-elderweaver"], rareChance: 0.003 },
  { itemKey: "elder-silver-lair-survey", count: 1, professions: ["wood-elf-elderweaver"], rareChance: 0.0006 },
];

export const DWARF_MERCHANT_OFFERS: readonly MerchantOffer[] = [
  { itemKey: "field-oxygen-reserve", count: 2, professions: ["dwarf-gearwright", "dwarf-provisioner"] },
  { itemKey: "hearthroads-route-folio", count: 1, professions: ["general", "mayor"], rareChance: 0.38 },
  { itemKey: "raw-iron", count: 40, professions: ["dwarf-delver", "dwarf-provisioner"] },
  { itemKey: "raw-gold", count: 16, professions: ["dwarf-delver", "dwarf-provisioner"] },
  { itemKey: "copper-ore", count: 32, professions: ["dwarf-delver", "dwarf-provisioner"] },
  { itemKey: "gear-cluster", count: 24, professions: ["dwarf-gearwright", "dwarf-golemsmith"] },
  { itemKey: "deepgear-alloy", count: 14, professions: ["dwarf-gearwright", "dwarf-golemsmith"] },
  { itemKey: "deepgear-lantern", count: 8, professions: ["dwarf-gearwright", "dwarf-provisioner"] },
  { itemKey: "flintlock-pistol", count: 3, professions: ["dwarf-powderwright", "dwarf-gatewarden"] },
  { itemKey: "lead-ball", count: 64, professions: ["dwarf-powderwright", "dwarf-gatewarden"] },
  { itemKey: "blueprint-flintlock", count: 1, professions: ["dwarf-powderwright"] },
  { itemKey: "blueprint-copper-scout", count: 1, professions: ["dwarf-golemsmith"] },
  { itemKey: "blueprint-stone-bulwark", count: 1, professions: ["dwarf-golemsmith"] },
  { itemKey: "blueprint-aetherforged-sentinel", count: 1, professions: ["dwarf-thane", "dwarf-golemsmith"], rareChance: 0.05 },
  { itemKey: "blueprint-deepgear-courser", count: 1, professions: ["dwarf-golemsmith"], rareChance: 0.18 },
  { itemKey: "blueprint-clockwork-hound", count: 1, professions: ["dwarf-golemsmith"] },
  { itemKey: "blueprint-webspinner", count: 1, professions: ["dwarf-golemsmith"] },
  { itemKey: "copper-scout-golem-orb", count: 1, professions: ["dwarf-golemsmith"], rareChance: 0.22 },
  { itemKey: "deepgear-courser-golem-orb", count: 1, professions: ["dwarf-golemsmith"], rareChance: 0.08 },
  { itemKey: "clockwork-hound-golem-orb", count: 1, professions: ["dwarf-golemsmith"], rareChance: 0.11 },
  { itemKey: "webspinner-golem-orb", count: 1, professions: ["dwarf-golemsmith"], rareChance: 0.055 },
  { itemKey: "unaligned-copper-mole-orb", count: 1, professions: ["dwarf-provisioner"], rareChance: 0.35 },
];

const MERCHANT_OFFERS_BY_FACTION: Readonly<Record<NpcFactionId, readonly MerchantOffer[]>> = {
  hobbits: HOBBIT_MERCHANT_OFFERS,
  goblins: GOBLIN_MERCHANT_OFFERS,
  atlantians: ATLANTIAN_MERCHANT_OFFERS,
  sugarcourt: SUGARCOURT_MERCHANT_OFFERS,
  "wood-elves": WOOD_ELF_MERCHANT_OFFERS,
  dwarves: DWARF_MERCHANT_OFFERS,
};

export function merchantOffersFor(factionId: Exclude<FactionId, "player">, profession: MerchantProfession, availabilitySeed?: string) {
  const offers = MERCHANT_OFFERS_BY_FACTION[factionId];
  return offers.filter((offer) => offer.professions.includes(profession)
    && (offer.rareChance === undefined || availabilitySeed === undefined || hashUnit(`${availabilitySeed}|${offer.itemKey}`) < offer.rareChance))
    .map(({ itemKey, count }) => ({ itemKey, count }));
}

function boundedMerchantInventory(stacks: readonly MerchantStack[], customCatalog: Readonly<Record<string, CommerceItem>> = {}) {
  const combined = new Map<string, number>();
  for (const stack of stacks.slice(0, 48)) {
    const definition = COMMERCE_CATALOG[stack.itemKey] ?? customCatalog[stack.itemKey];
    if (!definition) continue;
    const next = Math.max(0, Math.min(definition.stackLimit * 8, Math.floor(stack.count)));
    combined.set(stack.itemKey, Math.min(definition.stackLimit * 8, (combined.get(stack.itemKey) ?? 0) + next));
  }
  return [...combined].filter(([, count]) => count > 0).map(([itemKey, count]) => ({ itemKey, count }));
}

export function createMerchant(
  authorityId: string,
  id: string,
  factionId: Exclude<FactionId, "player">,
  profession: MerchantProfession,
  startingGold: GoldAmount | number = 240,
): MerchantState {
  return {
    schema: 1,
    authorityId,
    revision: 0,
    recentEventIds: [],
    id,
    factionId,
    profession,
    gold: normalizeGold(startingGold),
    inventory: boundedMerchantInventory(merchantOffersFor(factionId, profession, `${factionId}:${id}:${profession}:0`)),
    customCatalog: {},
    restockSeed: `${factionId}:${id}:${profession}`,
    lastRestockDay: 0,
  };
}

function merchantDemandMultiplier(merchant: Pick<MerchantState, "factionId" | "profession">, item: CommerceItem) {
  let multiplier = 1;
  if (merchant.profession === "farmer" && ["food", "crop"].includes(item.category)) multiplier *= 1.28;
  if (merchant.profession === "miner" && ["ore", "material"].includes(item.category)) multiplier *= 1.35;
  if (merchant.profession === "brewer" && ["drink", "honey"].includes(item.category)) multiplier *= 1.38;
  if (merchant.profession === "alchemist" && ["potion", "crop"].includes(item.category)) multiplier *= 1.3;
  if (merchant.profession === "blacksmith" && ["weapon", "ore", "ammunition"].includes(item.category)) multiplier *= 1.25;
  if (merchant.profession === "banker" && ["treasure", "ore"].includes(item.category)) multiplier *= 1.2;
  if (merchant.profession === "atlantian-kelpkeeper" && ["crop", "food"].includes(item.category)) multiplier *= 1.34;
  if (merchant.profession === "atlantian-coralwright" && ["material", "weapon"].includes(item.category)) multiplier *= 1.3;
  if (merchant.profession === "atlantian-pearlbroker" && item.tags?.includes("pearl")) multiplier *= 1.42;
  if (merchant.profession === "atlantian-glowmender" && ["potion", "crop"].includes(item.category)) multiplier *= 1.3;
  if (merchant.profession === "atlantian-trident-guard" && item.category === "weapon") multiplier *= 1.2;
  if (merchant.profession === "sugarcourt-gumdrop-gardener" && ["food", "crop"].includes(item.category)) multiplier *= 1.34;
  if (merchant.profession === "sugarcourt-sugarboiler" && ["honey", "potion", "crop"].includes(item.category)) multiplier *= 1.35;
  if (merchant.profession === "sugarcourt-candysmith" && ["weapon", "armor", "material"].includes(item.category)) multiplier *= 1.32;
  if (merchant.profession === "sugarcourt-kennelkeeper" && item.category === "creature") multiplier *= 1.38;
  if (merchant.factionId === "hobbits" && item.tags?.includes("mead")) multiplier *= 1.8;
  if (merchant.factionId === "goblins" && item.tags?.includes("goblin")) multiplier *= 1.15;
  if (merchant.factionId === "atlantians" && item.tags?.includes("aquatic")) multiplier *= 1.14;
  if (merchant.factionId === "sugarcourt" && item.tags?.includes("sugarcourt")) multiplier *= 1.16;
  return multiplier;
}

export type MerchantTradeDirection = "player-buys" | "player-sells";
export type TradePricingContext = Readonly<{
  barteringLevel?: number;
  factionAlignment?: number;
  alignmentInfluenceBonusPercent?: number;
}>;

export function quoteMerchantTrade(
  merchant: Pick<MerchantState, "factionId" | "profession">,
  item: CommerceItem,
  count: number,
  direction: MerchantTradeDirection,
  pricing: TradePricingContext = {},
) {
  const quantity = Math.max(0, Math.min(MAX_TRADE_QUANTITY, Math.floor(count)));
  if (quantity === 0) return { unitPrice: 0, total: "0" as GoldAmount };
  if (item.key === "gold-ingot") {
    return { unitPrice: GOLD_INGOT_VALUE, total: normalizeGold(BigInt(GOLD_INGOT_VALUE) * BigInt(quantity)) };
  }
  const demand = merchantDemandMultiplier(merchant, item);
  const buyPrice = Math.max(1, Math.ceil(item.baseValue * 1.22 * Math.max(0.9, demand * 0.94)));
  const sellPrice = Math.max(1, Math.floor(item.baseValue * 0.52 * demand));
  const localMarketPrice = Math.max(1, Math.round(item.baseValue * demand));
  const convergence = barteringConvergence(
    pricing.barteringLevel ?? 0,
    pricing.factionAlignment ?? 0,
    pricing.alignmentInfluenceBonusPercent ?? 0,
  );
  const startingPrice = direction === "player-buys" ? buyPrice : sellPrice;
  const unitPrice = Math.max(1, Math.round(startingPrice + (localMarketPrice - startingPrice) * convergence));
  return { unitPrice, total: normalizeGold(BigInt(unitPrice) * BigInt(quantity)) };
}

export type AtomicEconomyCommand = Readonly<{
  authorityId: string;
  eventId: string;
  expectedWalletRevision: number;
  expectedCounterpartyRevision: number;
  pricing?: TradePricingContext;
}>;

function atomicAuthorityCheck(wallet: GoldWalletState, counterparty: AuthorityStampedState, command: AtomicEconomyCommand): EconomyFailure {
  if (!command.eventId.trim()) return "invalid-event";
  if (wallet.authorityId !== command.authorityId || counterparty.authorityId !== command.authorityId) return "forbidden";
  if (wallet.recentEventIds.includes(command.eventId) || counterparty.recentEventIds.includes(command.eventId)) return "duplicate";
  if (wallet.revision !== command.expectedWalletRevision || counterparty.revision !== command.expectedCounterpartyRevision) return "stale";
  return "ok";
}

function stampAtomic<T extends AuthorityStampedState>(state: T, command: AtomicEconomyCommand): T {
  return stampAuthority(state, { authorityId: command.authorityId, eventId: command.eventId, expectedRevision: state.revision });
}

function removeMerchantStock(inventory: readonly MerchantStack[], itemKey: string, count: number) {
  return inventory.map((stack) => stack.itemKey === itemKey ? { ...stack, count: stack.count - count } : stack).filter((stack) => stack.count > 0);
}

function addMerchantStock(inventory: readonly MerchantStack[], itemKey: string, count: number, customCatalog: Readonly<Record<string, CommerceItem>>) {
  return boundedMerchantInventory([...inventory, { itemKey, count }], customCatalog);
}

export type MerchantTradeResult = Readonly<{
  wallet: GoldWalletState;
  merchant: MerchantState;
  item: MerchantStack | null;
  applied: boolean;
  reason: EconomyFailure;
  total: GoldAmount;
}>;

export function buyFromMerchant(
  wallet: GoldWalletState,
  merchant: MerchantState,
  itemKey: string,
  count: number,
  command: AtomicEconomyCommand,
): MerchantTradeResult {
  const authority = atomicAuthorityCheck(wallet, merchant, command);
  const definition = COMMERCE_CATALOG[itemKey] ?? merchant.customCatalog[itemKey];
  const quantity = Math.max(0, Math.floor(count));
  if (authority !== "ok" || !definition || quantity <= 0) {
    return { wallet, merchant, item: null, applied: false, reason: authority === "ok" ? "invalid-amount" : authority, total: "0" };
  }
  const available = merchant.inventory.find((stack) => stack.itemKey === itemKey)?.count ?? 0;
  if (available < quantity) return { wallet, merchant, item: null, applied: false, reason: "merchant-out-of-stock", total: "0" };
  const { total } = quoteMerchantTrade(merchant, definition, quantity, "player-buys", command.pricing);
  const walletBalance = subtractGold(wallet.balance, total);
  if (walletBalance === null) return { wallet, merchant, item: null, applied: false, reason: "insufficient-gold", total };
  const nextWallet = stampAtomic({ ...wallet, balance: walletBalance }, command);
  const nextMerchant = stampAtomic({
    ...merchant,
    gold: addGold(merchant.gold, total),
    inventory: removeMerchantStock(merchant.inventory, itemKey, quantity),
  }, command);
  return { wallet: nextWallet, merchant: nextMerchant, item: { itemKey, count: quantity }, applied: true, reason: "ok", total };
}

/** Merchants accept any registered item, not a fixed Minecraft-style trade. */
export function sellToMerchant(
  wallet: GoldWalletState,
  merchant: MerchantState,
  item: CommerceItem,
  count: number,
  command: AtomicEconomyCommand,
): MerchantTradeResult {
  const authority = atomicAuthorityCheck(wallet, merchant, command);
  const quantity = Math.max(0, Math.floor(count));
  if (authority !== "ok" || quantity <= 0 || !item.key.trim() || item.baseValue <= 0) {
    return { wallet, merchant, item: null, applied: false, reason: authority === "ok" ? "invalid-amount" : authority, total: "0" };
  }
  if (!COMMERCE_CATALOG[item.key] && !merchant.customCatalog[item.key] && Object.keys(merchant.customCatalog).length >= 64) {
    return { wallet, merchant, item: null, applied: false, reason: "inventory-full", total: "0" };
  }
  const { total } = quoteMerchantTrade(merchant, item, quantity, "player-sells", command.pricing);
  const merchantBalance = subtractGold(merchant.gold, total);
  if (merchantBalance === null) return { wallet, merchant, item: null, applied: false, reason: "merchant-cannot-pay", total };
  const nextWallet = stampAtomic({ ...wallet, balance: addGold(wallet.balance, total) }, command);
  const customCatalog = COMMERCE_CATALOG[item.key] ? merchant.customCatalog : { ...merchant.customCatalog, [item.key]: item };
  const nextMerchant = stampAtomic({
    ...merchant,
    gold: merchantBalance,
    inventory: addMerchantStock(merchant.inventory, item.key, quantity, customCatalog),
    customCatalog,
  }, command);
  return { wallet: nextWallet, merchant: nextMerchant, item: { itemKey: item.key, count: quantity }, applied: true, reason: "ok", total };
}

function hashUnit(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

export function restockMerchant(merchant: MerchantState, worldDay: number, command: AuthorityCommand): EconomyMutation<MerchantState> {
  const authority = checkAuthority(merchant, command);
  const day = Math.max(0, Math.floor(worldDay));
  if (authority !== "ok") return { state: merchant, applied: false, reason: authority };
  if (day - merchant.lastRestockDay < 2) return { state: merchant, applied: false, reason: "invalid-amount" };
  const base = merchantOffersFor(merchant.factionId, merchant.profession, `${merchant.restockSeed}:${day}`);
  const inventory = base.map((stack, index) => ({
    itemKey: stack.itemKey,
    count: Math.max(1, Math.round(stack.count * (0.75 + hashUnit(`${merchant.restockSeed}|${day}|${index}`) * 0.5))),
  }));
  const purse = 180 + Math.floor(hashUnit(`${merchant.restockSeed}|gold|${day}`) * 221);
  const state = stampAuthority({ ...merchant, inventory: boundedMerchantInventory(inventory), customCatalog: {}, gold: normalizeGold(purse), lastRestockDay: day }, command);
  return { state, applied: true, reason: "ok" };
}

const MICRO_GOLD = BigInt(1_000_000);

export type BankAccountState = AuthorityStampedState & Readonly<{
  schema: 1;
  ownerId: string;
  bankerFaction: "hobbits";
  balanceMicroGold: GoldAmount;
  lastInterestDay: number;
}>;

export function createBankAccount(authorityId: string, ownerId: string, worldDay = 0): BankAccountState {
  return {
    schema: 1,
    authorityId,
    revision: 0,
    recentEventIds: [],
    ownerId,
    bankerFaction: "hobbits",
    balanceMicroGold: "0",
    lastInterestDay: Math.max(0, Math.floor(worldDay)),
  };
}

export function bankBalanceWholeGold(account: BankAccountState) {
  return (parseGold(account.balanceMicroGold) / MICRO_GOLD).toString();
}

export type BankTransferResult = Readonly<{
  wallet: GoldWalletState;
  account: BankAccountState;
  applied: boolean;
  reason: EconomyFailure;
}>;

export function depositAtBank(
  wallet: GoldWalletState,
  account: BankAccountState,
  wholeGold: GoldAmount | number,
  command: AtomicEconomyCommand,
): BankTransferResult {
  const authority = atomicAuthorityCheck(wallet, account, command);
  const amount = parseGold(wholeGold);
  if (authority !== "ok") return { wallet, account, applied: false, reason: authority };
  if (amount <= BigInt(0)) return { wallet, account, applied: false, reason: "invalid-amount" };
  const walletBalance = subtractGold(wallet.balance, amount);
  if (walletBalance === null) return { wallet, account, applied: false, reason: "insufficient-gold" };
  return {
    wallet: stampAtomic({ ...wallet, balance: walletBalance }, command),
    account: stampAtomic({ ...account, balanceMicroGold: addGold(account.balanceMicroGold, amount * MICRO_GOLD) }, command),
    applied: true,
    reason: "ok",
  };
}

export function withdrawFromBank(
  wallet: GoldWalletState,
  account: BankAccountState,
  wholeGold: GoldAmount | number,
  command: AtomicEconomyCommand,
): BankTransferResult {
  const authority = atomicAuthorityCheck(wallet, account, command);
  const amount = parseGold(wholeGold);
  if (authority !== "ok") return { wallet, account, applied: false, reason: authority };
  if (amount <= BigInt(0)) return { wallet, account, applied: false, reason: "invalid-amount" };
  const microAmount = amount * MICRO_GOLD;
  const balance = subtractGold(account.balanceMicroGold, microAmount);
  if (balance === null) return { wallet, account, applied: false, reason: "insufficient-gold" };
  return {
    wallet: stampAtomic({ ...wallet, balance: addGold(wallet.balance, amount) }, command),
    account: stampAtomic({ ...account, balanceMicroGold: balance }, command),
    applied: true,
    reason: "ok",
  };
}

/** Applies exactly five percent for each missed world day; loops are bounded. */
export function compoundBankInterest(account: BankAccountState, worldDay: number, command: AuthorityCommand): EconomyMutation<BankAccountState> {
  const authority = checkAuthority(account, command);
  const targetDay = Math.max(account.lastInterestDay, Math.floor(worldDay));
  if (authority !== "ok") return { state: account, applied: false, reason: authority };
  const elapsed = Math.min(36_500, targetDay - account.lastInterestDay);
  if (elapsed <= 0) return { state: account, applied: false, reason: "invalid-amount" };
  let balance = parseGold(account.balanceMicroGold);
  for (let day = 0; day < elapsed; day += 1) balance = balance * BigInt(105) / BigInt(100);
  const state = stampAuthority({ ...account, balanceMicroGold: balance.toString(), lastInterestDay: account.lastInterestDay + elapsed }, command);
  return { state, applied: true, reason: "ok" };
}

export const STOCK_SYMBOLS = ["BURR", "MOSS", "TIDE", "LAMP"] as const;
export type StockSymbol = (typeof STOCK_SYMBOLS)[number];

export type StockDefinition = Readonly<{
  symbol: StockSymbol;
  name: string;
  description: string;
  initialPriceGold: number;
  driftBasisPoints: number;
}>;

export const STOCKS: Readonly<Record<StockSymbol, StockDefinition>> = {
  BURR: { symbol: "BURR", name: "Burr & Bolt Works", description: "Freehold tools and crossbow fittings.", initialPriceGold: 54, driftBasisPoints: 26 },
  MOSS: { symbol: "MOSS", name: "Mossway Caravans", description: "Overland produce and wool freight.", initialPriceGold: 37, driftBasisPoints: 22 },
  TIDE: { symbol: "TIDE", name: "Tideglass Shipping", description: "River and coast cargo service.", initialPriceGold: 68, driftBasisPoints: 18 },
  LAMP: { symbol: "LAMP", name: "Lamploom Cooperative", description: "Settlement lights, wax, and glass.", initialPriceGold: 43, driftBasisPoints: 24 },
};

export type StockQuote = Readonly<{
  priceGold: number;
  splitCount: number;
  lastChangeBasisPoints: number;
}>;

export type StockMarketState = AuthorityStampedState & Readonly<{
  schema: 1;
  ownerId: string;
  worldSeed: string;
  day: number;
  quotes: Readonly<Record<StockSymbol, StockQuote>>;
  holdings: Readonly<Record<StockSymbol, GoldAmount>>;
}>;

export function createStockMarket(authorityId: string, ownerId: string, worldSeed: string, day = 0): StockMarketState {
  return {
    schema: 1,
    authorityId,
    revision: 0,
    recentEventIds: [],
    ownerId,
    worldSeed,
    day: Math.max(0, Math.floor(day)),
    quotes: Object.fromEntries(STOCK_SYMBOLS.map((symbol) => [symbol, {
      priceGold: STOCKS[symbol].initialPriceGold,
      splitCount: 0,
      lastChangeBasisPoints: 0,
    }])) as Record<StockSymbol, StockQuote>,
    holdings: Object.fromEntries(STOCK_SYMBOLS.map((symbol) => [symbol, "0"])) as Record<StockSymbol, GoldAmount>,
  };
}

/** Daily noise is volatile but zero-centered; a modest positive drift wins over long horizons. */
export function stepStockMarket(market: StockMarketState, targetDay: number, command: AuthorityCommand): EconomyMutation<StockMarketState> {
  const authority = checkAuthority(market, command);
  if (authority !== "ok") return { state: market, applied: false, reason: authority };
  const elapsed = Math.min(36_500, Math.max(0, Math.floor(targetDay) - market.day));
  if (elapsed === 0) return { state: market, applied: false, reason: "invalid-amount" };
  const quotes = { ...market.quotes };
  const holdings = { ...market.holdings };
  for (let offset = 1; offset <= elapsed; offset += 1) {
    const day = market.day + offset;
    for (const symbol of STOCK_SYMBOLS) {
      const definition = STOCKS[symbol];
      const noise = Math.floor(hashUnit(`${market.worldSeed}|${symbol}|${day}`) * 761) - 380;
      const change = definition.driftBasisPoints + noise;
      let priceGold = Math.max(1, Math.round(quotes[symbol].priceGold * (10_000 + change) / 10_000));
      let splitCount = quotes[symbol].splitCount;
      if (priceGold >= 240) {
        priceGold = Math.max(1, Math.round(priceGold / 2));
        holdings[symbol] = (parseGold(holdings[symbol]) * BigInt(2)).toString();
        splitCount += 1;
      }
      quotes[symbol] = { priceGold, splitCount, lastChangeBasisPoints: change };
    }
  }
  const state = stampAuthority({ ...market, day: market.day + elapsed, quotes, holdings }, command);
  return { state, applied: true, reason: "ok" };
}

export type StockTradeResult = Readonly<{
  wallet: GoldWalletState;
  market: StockMarketState;
  applied: boolean;
  reason: EconomyFailure;
  total: GoldAmount;
}>;

export function buyStock(
  wallet: GoldWalletState,
  market: StockMarketState,
  symbol: StockSymbol,
  shares: GoldAmount | number,
  command: AtomicEconomyCommand,
): StockTradeResult {
  const authority = atomicAuthorityCheck(wallet, market, command);
  const quantity = parseGold(shares);
  const total = (quantity * BigInt(market.quotes[symbol].priceGold)).toString();
  if (authority !== "ok") return { wallet, market, applied: false, reason: authority, total: "0" };
  if (quantity <= BigInt(0)) return { wallet, market, applied: false, reason: "invalid-amount", total: "0" };
  const balance = subtractGold(wallet.balance, total);
  if (balance === null) return { wallet, market, applied: false, reason: "insufficient-gold", total };
  return {
    wallet: stampAtomic({ ...wallet, balance }, command),
    market: stampAtomic({ ...market, holdings: { ...market.holdings, [symbol]: addGold(market.holdings[symbol], quantity) } }, command),
    applied: true,
    reason: "ok",
    total,
  };
}

export function sellStock(
  wallet: GoldWalletState,
  market: StockMarketState,
  symbol: StockSymbol,
  shares: GoldAmount | number,
  command: AtomicEconomyCommand,
): StockTradeResult {
  const authority = atomicAuthorityCheck(wallet, market, command);
  const quantity = parseGold(shares);
  const total = (quantity * BigInt(market.quotes[symbol].priceGold)).toString();
  if (authority !== "ok") return { wallet, market, applied: false, reason: authority, total: "0" };
  if (quantity <= BigInt(0)) return { wallet, market, applied: false, reason: "invalid-amount", total: "0" };
  const remaining = subtractGold(market.holdings[symbol], quantity);
  if (remaining === null) return { wallet, market, applied: false, reason: "insufficient-stock", total };
  return {
    wallet: stampAtomic({ ...wallet, balance: addGold(wallet.balance, total) }, command),
    market: stampAtomic({ ...market, holdings: { ...market.holdings, [symbol]: remaining } }, command),
    applied: true,
    reason: "ok",
    total,
  };
}

export function stockPortfolioValueGold(market: StockMarketState) {
  return STOCK_SYMBOLS.reduce((total, symbol) => total + parseGold(market.holdings[symbol]) * BigInt(market.quotes[symbol].priceGold), BigInt(0)).toString();
}
