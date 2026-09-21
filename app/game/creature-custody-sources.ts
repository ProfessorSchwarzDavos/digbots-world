import { EQUIPMENT_SLOTS, Item, type InventorySlot } from "./data";
import type { WorldSave, SavedCreature } from "./engine";
import type { CaptureOrb } from "./capture-orbs";
import type { CreatureMetadata } from "./creature-cage";
import type { MachineState } from "./wayworks";
import type { LifeSupportStore } from "./life-support";
import { WORKSHOP_SLOTS } from "./wayworks-stores";
import { dragonCargoSlots, normalizeDragonState } from "./dragons";
import { DRAGON_ORDER } from "./mobs";
import { custodyJsonIdentity, validCustodyItem } from "./wayworks-custody";
import { readExactCreatureMetadata, readExactEncodedCaptureOrb, readStoredCreatureCustody } from "./stored-creature-custody";
import { indexCreatureCustody, type CreatureCustodyPath, type CreatureCustodySources } from "./creature-custody-index";
import { canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

/** Explicit storage-bearing slice, not an arbitrary recursive scan of a save.
 * The host supplies this from canonical owners, never the mutating serializer.
 * Inactive locations, actual display bodies, physical membership and transaction
 * revisions must still be supplied by their higher-level owner adapters. */
export type WorldCreatureCustodySource = Readonly<Pick<WorldSave,
  "inventory" | "cursor" | "trash" | "craftGrid" | "equipment" | "offhand" | "furnaces" | "wheatMills" | "wayworks"
  | "chests" | "boats" | "drops" | "orbRacks" | "healingStations" | "morphLooms" | "digitalItemVault"
  | "digitalCreatureArchive" | "multiplayerPlayers" | "agentCustody" | "spacefleet" | "apiaries"
  | "aquariums" | "fieldPerches" | "creatures" | "sleepingCreatures"
>>;
const fields = {
  inventory: true, cursor: true, trash: true, craftGrid: true, equipment: true, offhand: true, furnaces: true,
  wheatMills: true, wayworks: true, chests: true, boats: true, drops: true, orbRacks: true, healingStations: true,
  morphLooms: true, digitalItemVault: true, digitalCreatureArchive: true, multiplayerPlayers: true, agentCustody: true,
  spacefleet: true, apiaries: true, aquariums: true, fieldPerches: true, creatures: true, sleepingCreatures: true,
} satisfies Record<keyof WorldCreatureCustodySource, true>;
type Alias = Readonly<{ path: CreatureCustodyPath; canonicalPath: CreatureCustodyPath }>;
function entries<T>(value: Readonly<Record<string, T>> | undefined): [string, T][] {
  if (value === undefined) return [];
  if (!isUniverseRecord(value)) throw Error("Invalid creature custody owner table.");
  // Owner tables have no semantic insertion order. Stable path order keeps the
  // derived index identical after canonical JSON cold storage sorts their keys.
  return Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
}
function array<T>(value: readonly T[]): readonly T[] {
  if (!Array.isArray(value) || Object.keys(value).length !== value.length) throw Error("Invalid creature custody owner array.");
  return value;
}
function cargoCapacity(custom: CreatureMetadata["custom"], key: "dragonCargo" | "leviathanCargo"): number {
  if (key === "dragonCargo") {
    const raw = custom.dragonState;
    if (!isUniverseRecord(raw)) throw Error("Stored dragon cargo has no body equipment owner.");
    const state = normalizeDragonState(raw);
    if (canonicalJson(state) !== canonicalJson(raw)) throw Error("Stored dragon equipment requires migration before custody inspection.");
    return dragonCargoSlots(state);
  }
  const growth = custom.leviathanGrowth;
  if (!isUniverseRecord(growth) || !Number.isSafeInteger(growth.chestModules)
    || typeof growth.chestModules !== "number" || growth.chestModules < 0 || growth.chestModules > 6)
    throw Error("Stored leviathan cargo has no exact equipment owner.");
  return growth.chestModules * 27;
}

export function collectWorldCreatureCustody(source: WorldCreatureCustodySource) {
  if (!isUniverseRecord(source) || Object.keys(source).some(key => !Object.hasOwn(fields, key) || source[key as keyof WorldCreatureCustodySource] === undefined))
    throw Error("Unsupported or undefined creature custody source field.");
  if (!Object.hasOwn(source, "inventory") || !Object.hasOwn(source, "furnaces") || !Object.hasOwn(source, "chests"))
    throw Error("Missing canonical creature custody owner table.");
  for (const key of Object.keys(source) as (keyof WorldCreatureCustodySource)[])
    if (source[key] === null && !["cursor", "trash", "offhand"].includes(key)) throw Error("Invalid null creature custody owner table.");
  const inventorySlots: { path: CreatureCustodyPath; slot: InventorySlot | null }[] = [];
  const orbRecords: { path: CreatureCustodyPath; orb: CaptureOrb | string | null }[] = [];
  const residents: { path: CreatureCustodyPath; creature: CreatureMetadata }[] = [];
  const aliases: Alias[] = [];
  let visited = 0;
  const visit = (depth: number) => {
    if (++visited > 2_000_000 || depth > 32) throw Error("Creature custody traversal exceeds structural limits.");
  };
  const creatureCargo = (path: CreatureCustodyPath, creature: CreatureMetadata, deployed: boolean, depth: number) => {
    // The live creature-keyed chest is authoritative during deployment. The old
    // orb metadata is a retained snapshot, not a second finite cargo hold.
    if (deployed) return;
    for (const key of ["dragonCargo", "leviathanCargo"] as const) {
      const present = Object.hasOwn(creature.custom, key);
      const hasEquipment = key === "dragonCargo" ? !!creature.custom.dragonState : !!creature.custom.leviathanGrowth;
      if (!present && !hasEquipment) continue;
      if (key === "dragonCargo" ? !(DRAGON_ORDER as readonly string[]).includes(creature.kind)
        : !["worldshell-leviathan", "aetherbell-larva", "aetherbell-leviathan"].includes(creature.kind))
        throw Error("Stored cargo equipment belongs to another species.");
      const capacity = cargoCapacity(creature.custom, key);
      if (!present) {
        if (capacity) throw Error("Stored creature equipment has no canonical cargo record.");
        continue;
      }
      const cargo = creature.custom[key];
      if (!Array.isArray(cargo) || cargo.length !== capacity) throw Error("Stored creature cargo cannot be truncated or padded during preflight.");
      array(cargo).forEach((item, index) => slot([...path, "creature", "custom", key, index], item as InventorySlot | null, depth + 1));
    }
  };
  const slot = (path: CreatureCustodyPath, value: InventorySlot | null, depth = 0) => {
    visit(depth);
    if (value !== null && !validCustodyItem(value)) throw Error("Invalid canonical creature custody inventory.");
    inventorySlots.push({ path, slot: value });
    if (!value) return;
    const stored = readStoredCreatureCustody(value);
    if (stored) creatureCargo([...path, "metadata", stored.format === "capture-orb" ? "captureOrb" : "capturedCreature"],
      stored.creature, !!stored.attunement?.activeEntityId, depth);
    const machine = value.metadata?.wayworks as MachineState | undefined;
    if (machine?.workshop) for (const name of WORKSHOP_SLOTS)
      slot([...path, "metadata", "wayworks", "workshop", "slots", name], machine.workshop.slots[name], depth + 1);
    const lifeSupport = value.metadata?.lifeSupport as LifeSupportStore | undefined;
    if (lifeSupport) array(lifeSupport.sockets).forEach((child, index) => slot([...path, "metadata", "lifeSupport", "sockets", index], child, depth + 1));
  };
  const slots = (path: CreatureCustodyPath, values: readonly (InventorySlot | null)[]) => array(values).forEach((value, index) => slot([...path, index], value));
  const equipment = (path: CreatureCustodyPath, values: WorldSave["equipment"]) => {
    for (const [key, value] of entries(values)) {
      if (!EQUIPMENT_SLOTS.includes(key as typeof EQUIPMENT_SLOTS[number])) throw Error("Unknown creature custody equipment slot.");
      if (value === undefined) throw Error("Undefined creature custody equipment slot.");
      slot([...path, key], value);
    }
  };
  const orb = (path: CreatureCustodyPath, value: CaptureOrb | string | null) => {
    visit(0); orbRecords.push({ path, orb: value });
    if (value === null) return;
    const read = readExactEncodedCaptureOrb(typeof value === "string" ? value : custodyJsonIdentity(value));
    if (read.creature) creatureCargo(path, read.creature, !!read.attunement?.activeEntityId, 0);
  };
  const resident = (path: CreatureCustodyPath, value: CreatureMetadata) => {
    const creature = readExactCreatureMetadata(value); residents.push({ path, creature }); creatureCargo(path, creature, false, 0);
  };
  const bulkSlot = (path: CreatureCustodyPath, value: unknown) => {
    if (validCustodyItem(value)) { slot(path, value); return; }
    // Digital material quantities / returned build materials may exceed a stack,
    // but finite or metadata-bearing vessels must still be singular legal slots.
    if (!isUniverseRecord(value) || typeof value.count !== "number" || !Number.isSafeInteger(value.count) || value.count < 1
      || value.metadata !== undefined || value.durability !== undefined)
      throw Error("Invalid bulk creature custody inventory.");
    const unit = { ...value, count: 1 };
    if (!validCustodyItem(unit)) throw Error("Invalid bulk creature custody inventory.");
    readStoredCreatureCustody(unit);
  };
  slots(["inventory"], source.inventory);
  for (const key of ["cursor", "trash", "offhand"] as const) if (Object.hasOwn(source, key)) slot([key], source[key]!);
  if (source.craftGrid) slots(["craftGrid"], source.craftGrid);
  equipment(["equipment"], source.equipment);
  for (const [key, furnace] of entries(source.furnaces)) for (const name of ["input", "fuel", "output"] as const) slot(["furnaces", key, name], furnace[name]);
  for (const [key, mill] of entries(source.wheatMills)) for (const name of ["input", "output"] as const) slot(["wheatMills", key, name], mill[name]);
  for (const [key, machine] of entries(source.wayworks)) for (const name of WORKSHOP_SLOTS) slot(["wayworks", key, "workshop", "slots", name], machine.workshop.slots[name]);

  const boats = new Map<string, NonNullable<WorldSave["boats"]>[number]>();
  for (const boat of array(source.boats ?? [])) {
    if (!boat.id || boats.has(boat.id)) throw Error("Duplicate creature custody boat owner.");
    boats.set(boat.id, boat); slots(["boats", boat.id, "inventory"], boat.inventory);
  }
  const creatures = array(source.creatures ?? []), sleepingCreatures = array(source.sleepingCreatures ?? []);
  const bodies = new Map<number, SavedCreature>();
  for (const creature of [...creatures, ...sleepingCreatures]) {
    custodyJsonIdentity(creature);
    if (!Number.isSafeInteger(creature.id) || creature.id < 0 || bodies.has(creature.id)) throw Error("Invalid or duplicate creature cargo body.");
    checkBodyCargo(creature, source.chests); bodies.set(creature.id, creature);
  }
  for (const [key, values] of entries(source.chests)) {
    if (key.startsWith("boat:")) {
      const boat = boats.get(key.slice(5));
      if (!boat || canonicalJson(values) !== canonicalJson(boat.inventory)) throw Error("Boat chest alias differs from its canonical hold.");
      aliases.push({ path: ["chests", key], canonicalPath: ["boats", boat.id, "inventory"] });
    } else {
      if (key.startsWith("dragon:") || key.startsWith("leviathan:")) {
        const match = /^(dragon|leviathan):(\d+):cargo$/.exec(key), body = match ? bodies.get(Number(match[2])) : null;
        if (!match || !body || String(body.id) !== match[2]) throw Error("Creature cargo chest has no canonical body owner.");
        const capacity = bodyCargoCapacity(body, match[1] as "dragon" | "leviathan");
        if (!capacity || !Array.isArray(values) || values.length !== capacity) throw Error("Creature cargo chest differs from its body equipment.");
      }
      slots(["chests", key], values);
    }
  }
  array(source.drops ?? []).forEach((drop, index) => slot(["drops", index], { item: drop.item, count: drop.count,
    ...(drop.durability !== undefined ? { durability: drop.durability } : {}), ...(drop.metadata !== undefined ? { metadata: drop.metadata } : {}) }));
  for (const name of ["orbRacks", "healingStations"] as const) for (const [key, state] of entries(source[name]))
    array(state.slots).forEach((value, index) => orb([name, key, "slots", index], value));
  for (const [key, state] of entries(source.morphLooms)) for (const name of ["inputOrb", "outputOrb"] as const) orb(["morphLooms", key, name], state[name]);
  if (source.digitalItemVault) array(source.digitalItemVault.stacks).forEach((value, index) => bulkSlot(["digitalItemVault", "stacks", index], value));
  if (source.digitalCreatureArchive) array(source.digitalCreatureArchive.orbs).forEach((value, index) => orb(["digitalCreatureArchive", "orbs", index], value));
  for (const [id, player] of entries(source.multiplayerPlayers)) {
    if (player.playerId !== id || !isUniverseRecord(player.equipment)) throw Error("Guest creature custody owner identity or equipment disagrees.");
    slots(["multiplayerPlayers", id, "inventory"], player.inventory); equipment(["multiplayerPlayers", id, "equipment"], player.equipment);
    if (Object.hasOwn(player, "craftGrid")) slots(["multiplayerPlayers", id, "craftGrid"], player.craftGrid!);
    for (const key of ["cursor", "trash", "offhand"] as const) if (Object.hasOwn(player, key)) slot(["multiplayerPlayers", id, key], player[key]!);
  }
  if (source.agentCustody && (source.agentCustody.schema !== 1 || !isUniverseRecord(source.agentCustody.agents)))
    throw Error("Missing canonical agent creature custody table.");
  for (const [id, agent] of entries(source.agentCustody?.agents)) {
    slots(["agentCustody", id, "inventory"], agent.inventory); equipment(["agentCustody", id, "equipment"], agent.equipment);
    array(agent.returning).forEach((value, index) => bulkSlot(["agentCustody", id, "returning", index], value));
  }
  if (source.spacefleet && (source.spacefleet.schema !== 1 || !isUniverseRecord(source.spacefleet.vehicles)))
    throw Error("Missing canonical fleet creature custody table.");
  for (const [id, vehicle] of entries(source.spacefleet?.vehicles)) {
    if (vehicle.vehicleId !== id) throw Error("Fleet creature custody owner identity disagrees.");
    slots(["spacefleet", id, "cargo"], vehicle.cargo);
  }
  for (const [key, hive] of entries(source.apiaries)) {
    slot(["apiaries", key, "queenOrb"], hive.queenOrb);
    for (const [index, bee] of [hive.queen, ...array(hive.workers)].entries()) if (bee?.storedOrb) {
      if (bee.storedOrb.item !== Item.CaptureOrb || bee.storedOrb.count !== 1) throw Error("Invalid housed bee orb vessel.");
      orb(["apiaries", key, index === 0 ? "queen" : "workers", ...(index ? [index - 1] : []), "storedOrb"], bee.storedOrb.captureOrb);
    }
  }
  for (const [key, aquarium] of entries(source.aquariums)) array(aquarium.residents).forEach((value, index) => {
    if (value.id !== value.metadata.entityId) throw Error("Aquarium resident identity disagrees with its specimen.");
    resident(["aquariums", key, "residents", index], value.metadata);
  });
  for (const [key, perch] of entries(source.fieldPerches)) {
    if (!Object.hasOwn(perch, "resident") || perch.resident === undefined) throw Error("Missing canonical perch resident.");
    if (perch.resident !== null) resident(["fieldPerches", key, "resident"], perch.resident);
  }
  const sources: CreatureCustodySources = { inventorySlots, orbRecords, residents, creatures, sleepingCreatures };
  const index = indexCreatureCustody(sources);
  return freezeUniverseJson(cloneUniverseJson({ sourceBaseline: canonicalJson(source), sources, aliases, index }));
}

function checkBodyCargo(creature: SavedCreature, chests: WorldSave["chests"]) {
  for (const kind of ["dragon", "leviathan"] as const) {
    const capacity = bodyCargoCapacity(creature, kind);
    const key = `${kind}:${creature.id}:cargo`;
    if (capacity && (!Object.hasOwn(chests, key) || !Array.isArray(chests[key]) || chests[key].length !== capacity))
      throw Error("Live creature equipment has no exact canonical cargo hold.");
  }
}

function bodyCargoCapacity(creature: SavedCreature, kind: "dragon" | "leviathan") {
  const state = kind === "dragon" ? creature.dragonState : creature.leviathanGrowth;
  if (!state) return 0;
  if (kind === "dragon" ? !(DRAGON_ORDER as readonly string[]).includes(creature.kind)
    : !["worldshell-leviathan", "aetherbell-larva", "aetherbell-leviathan"].includes(creature.kind))
    throw Error("Cargo body equipment belongs to another species.");
  const custom = { [kind === "dragon" ? "dragonState" : "leviathanGrowth"]: state } as unknown as CreatureMetadata["custom"];
  return cargoCapacity(custom, kind === "dragon" ? "dragonCargo" : "leviathanCargo");
}
