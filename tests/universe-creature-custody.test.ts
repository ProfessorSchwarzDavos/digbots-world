import assert from "node:assert/strict";
import test from "node:test";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb, type CaptureOrb } from "../app/game/capture-orbs";
import type { CreatureMetadata } from "../app/game/creature-cage";
import type { WorldCreatureCustodySource } from "../app/game/creature-custody-sources";
import { createDigitalCreatureArchive, createDigitalItemVault } from "../app/game/digital-storage";
import { normalizeMultiplayerPlayerState, type SavedCreature } from "../app/game/engine";
import { homeLocation, locationId, universeId, type LocationId } from "../app/game/location-address";
import { collectUniverseCreatureCustody, reconcileUniverseCreatureCustody, type LiveUniverseCreatureCustody, type UniverseCreatureCustodySnapshot } from "../app/game/universe-creature-custody";
import type { AttachmentActorBody } from "../app/game/attachment-actor-bodies";
import { canonicalJson } from "../app/game/universe-json";
import { createSurveyHopper } from "../app/game/space-vehicle";
import { normalizeSailboatSave } from "../app/game/boats";
import { createMachine } from "../app/game/wayworks";
import { BlockId } from "../app/game/data";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { celestialTerrainSeed } from "../app/game/celestial-terrain";
import { captureAsteroidAttachmentCatalog } from "../app/game/asteroid-attachment-catalog";
import { createPrimeEncounterState, planPrimeEncounter, transferPrimeEncounterCustody } from "../app/game/creature-rarity";

const universe = universeId("universe-custody"), address = homeLocation(universe), home = locationId(address);
const orbitAddress = { ...address, kind: "orbit" as const, instanceId: "low" }, orbit = locationId(orbitAddress);
const metadata = (id: string, origin?: LocationId): CreatureMetadata => ({ schema: 1, entityId: id, kind: "peelop", health: 5,
  maxHealth: 7, ageTicks: 123, baby: false, temperament: "Gentle", hostile: false, tamed: true, ownerId: "keeper",
  name: id, geneticSeed: 321, command: null, custom: origin ? { specimenOriginLocationId: origin } : {} });
const orb = (id: string, origin?: LocationId) => captureIntoOrb(createEmptyCaptureOrb(`orb-${id}`), metadata(id, origin), 42, "keeper")!;
const filled = (id: string, origin?: LocationId) => captureOrbInventorySlot(orb(id, origin));
const body = (id: number, specimenId: string, origin: LocationId): SavedCreature => ({ id, specimenId, specimenOriginLocationId: origin,
  kind: "peelop", x: 1, y: 30, z: 2, yaw: .3, health: 5, age: 123, geneticSeed: 321, creatureOwnerId: "keeper" });
const deployed = (id: string, bodyId: number): CaptureOrb => ({ ...orb(id, home),
  attunement: { ownerId: "keeper", attunedAt: 50, activeEntityId: String(bodyId), recalledAt: 0, recallCount: 0, fainted: false } });
const locationFields = () => ({ furnaces: {}, chests: {} });
function emptyLiveSource(): WorldCreatureCustodySource {
  return { inventory: [], cursor: null, trash: null, craftGrid: [], equipment: {}, offhand: null, furnaces: {}, wheatMills: {},
    wayworks: {}, chests: {}, boats: [], drops: [], orbRacks: {}, healingStations: {}, morphLooms: {},
    digitalItemVault: createDigitalItemVault(), digitalCreatureArchive: createDigitalCreatureArchive(), multiplayerPlayers: {},
    agentCustody: { schema: 1, agents: {} }, spacefleet: { schema: 1, vehicles: {} }, apiaries: {}, aquariums: {}, fieldPerches: {},
    creatures: [], sleepingCreatures: [] };
}
// These are declared structural unit fixtures, not transport authentication,
// checksum/native persistence, earned creature capture or travel evidence.
function actor(id: string, kind: "human" | "drone" = "human", local = false): AttachmentActorBody {
  return { id, kind, position: { x: 0, y: 30, z: 0 }, bounds: { minX: -.3, minY: 30, minZ: -.3, maxX: .3, maxY: 32, maxZ: .3 },
    connectionId: local ? null : `connection-${id}`, poseTick: local ? null : 1, agentUpdatedAt: kind === "drone" ? 2 : null,
    boatId: null, boatSeat: null, mountedCreatureId: null, mountedCreatureSeat: null };
}
function fixture(): { snapshot: UniverseCreatureCustodySnapshot; live: LiveUniverseCreatureCustody } {
  return {
    snapshot: {
      manifest: { id: universe, universeId: universe, revision: 7, currentLocationId: home, currentPlayerId: "host", deletedAt: null },
      universe: { fields: { digitalCreatureArchive: { ...createDigitalCreatureArchive(), orbs: [orb("old-shared")] } } },
      locations: [
        { descriptor: { id: home, universeId: universe, revision: 6 }, fields: { ...locationFields(), chests: { chest: [filled("old-local")] } } },
        { descriptor: { id: orbit, universeId: universe, revision: 2 }, fields: locationFields() },
      ],
      players: [ { playerId: "host", locationId: home, fields: { inventory: [filled("old-host")] } },
        { playerId: "offline", locationId: orbit, fields: { inventory: [filled("offline-player")] } } ],
    },
    live: { universeId: universe, repositoryRevision: 7, playerId: "host", actorId: "local", locationId: home,
      actors: [actor("local", "human", true)], source: emptyLiveSource(), encounterSources: { primeEncounters: {}, legendaryEncounters: {} } },
  };
}
const inspect = (input: ReturnType<typeof fixture>) => collectUniverseCreatureCustody(input.snapshot, input.live);

test("runtime replaces only manifest-bound partitions and visits shared and inactive owners exactly once", () => {
  const input = fixture();
  input.live = { ...input.live, source: { ...input.live.source, inventory: [filled("current-host")], chests: { chest: [filled("current-local")] },
    digitalCreatureArchive: { ...createDigitalCreatureArchive(), orbs: [orb("shared")] } } };
  input.snapshot = { ...input.snapshot, locations: input.snapshot.locations.map(row => row.descriptor.id === orbit
    ? { ...row, fields: { ...row.fields, chests: { chest: [filled("inactive-local")] } } } : row) };
  const before = canonicalJson(input), result = inspect(input);
  assert.deepEqual(result.index.stored.map(row => row.custody.creature.entityId).sort(),
    ["current-host", "current-local", "inactive-local", "offline-player", "shared"]);
  assert.equal(result.partitions.length, 5);
  assert.equal(result.partitions.filter(row => row.owner === "universe").length, 1);
  assert.deepEqual(result.activePlayer, { playerId: "host", actorId: "local", locationId: home });
  const owner = (id: string) => result.index.stored.find(row => row.custody.creature.entityId === id)!;
  assert.deepEqual(owner("current-host").path, ["player", "host", "inventory", 0]);
  assert.deepEqual(owner("inactive-local").path, ["location", orbit, "chests", "chest", 0]);
  assert.equal(owner("offline-player").locationId, orbit); assert.equal(owner("shared").locationId, null);
  assert.equal(canonicalJson(input), before); assert(Object.isFrozen(result.sources.inventorySlots)); assert(!Object.isFrozen(input.live));
});

test("equal local body IDs and location-owned agent IDs are independent across actual locations", () => {
  const input = fixture(), agent = (id: string) => ({ schema: 1 as const, agents: { drone: { inventory: [filled(id)], equipment: {}, returning: [], revision: 0 } } });
  input.live = { ...input.live, source: { ...input.live.source, creatures: [body(23, "same", home)], agentCustody: agent("active-agent") } };
  input.snapshot = { ...input.snapshot, locations: input.snapshot.locations.map(row => row.descriptor.id === orbit
    ? { ...row, fields: { ...row.fields, sleepingCreatures: [body(23, "same", orbit)], agentCustody: agent("inactive-agent") } } : row) };
  const result = inspect(input);
  assert.equal(result.index.freeBodies.length, 2);
  assert.deepEqual(new Set(result.index.freeBodies.map(row => row.locationId)), new Set([home, orbit]));
  assert.equal(result.index.stored.filter(row => row.path.includes("agentCustody")).length, 2);
  const duplicate = { ...body(24, "same", home) };
  input.snapshot = { ...input.snapshot, locations: input.snapshot.locations.map(row => row.descriptor.id === orbit
    ? { ...row, fields: { ...row.fields, creatures: [duplicate] } } : row) };
  assert.throws(() => inspect(input), /Duplicate fully-qualified specimen/);
});

test("typed present human guests have current location but offline guests and archives remain unknown", () => {
  const input = fixture(), active = captureOrbInventorySlot(deployed("guest", 23));
  input.live = { ...input.live, actors: [...input.live.actors, actor("guest")], source: { ...input.live.source,
    multiplayerPlayers: { guest: normalizeMultiplayerPlayerState({ inventory: [active] }, "guest"),
      away: normalizeMultiplayerPlayerState({ inventory: [filled("away")] }, "away") },
    creatures: [{ ...body(23, "guest", home), attunedOrbId: "orb-guest" }] } };
  const result = inspect(input), guest = result.index.stored.find(row => row.custody.creature.entityId === "guest")!;
  assert.equal(guest.locationId, home); assert.equal(guest.body?.locationId, home);
  assert.equal(result.index.stored.find(row => row.custody.creature.entityId === "away")!.locationId, null);
  input.live = { ...input.live, actors: [input.live.actors[0]] };
  assert.throws(() => inspect(input), /explicit holder location/);
  input.live = { ...input.live, actors: [...input.live.actors, actor("guest", "drone")] };
  assert.throws(() => inspect(input), /cannot be assigned to a drone/);
});

test("fleet cargo uses its recorded location and can link only the body in that location", () => {
  const input = fixture(), ship = structuredClone(createSurveyHopper("ship", "keeper", orbit, [0, 10, 0]));
  ship.cargo[0] = captureOrbInventorySlot(deployed("ship-creature", 23)); ship.cargoOwnership[0] = "finite-ship-stack";
  input.live = { ...input.live, source: { ...input.live.source, spacefleet: { schema: 1, vehicles: { ship } }, creatures: [body(23, "unrelated", home)] } };
  input.snapshot = { ...input.snapshot, locations: input.snapshot.locations.map(row => row.descriptor.id === orbit
    ? { ...row, fields: { ...row.fields, creatures: [{ ...body(23, "ship-creature", home), attunedOrbId: "orb-ship-creature" }] } } : row) };
  const stored = inspect(input).index.stored.find(row => row.custody.creature.entityId === "ship-creature")!;
  assert.equal(stored.locationId, orbit); assert.equal(stored.body?.locationId, orbit);
  ship.locationId = home;
  assert.throws(() => inspect(input), /mismatched deployed/);
  ship.locationId = locationId({ ...orbitAddress, instanceId: "unobserved" });
  assert.throws(() => inspect(input), /unobserved location/);
});

test("nested packed cargo, boat aliases and resident families keep exact global and local paths", () => {
  const input = fixture(), machine = createMachine("powered-crusher", "home", "keeper");
  machine.workshop.slots.input = filled("nested");
  const boat = normalizeSailboatSave({ id: "boat", inventory: [filled("boat")] });
  input.live = { ...input.live, source: { ...input.live.source,
    inventory: [{ item: BlockId.PoweredCrusher, count: 1, metadata: { wayworks: machine } }], boats: [boat], chests: { "boat:boat": boat.inventory },
    fieldPerches: { perch: { schema: 1, resident: metadata("bird"), assignment: "sleep", lastSignal: null, revision: 0 } } } };
  const result = inspect(input), nested = result.index.stored.find(row => row.custody.creature.entityId === "nested")!;
  assert.deepEqual(nested.path, ["player", "host", "inventory", 0, "metadata", "wayworks", "workshop", "slots", "input"]);
  assert.deepEqual(result.aliases, [{ path: ["location", home, "chests", "boat:boat"], canonicalPath: ["location", home, "boats", "boat", "inventory"] }]);
  const resident = result.paths.find(row => row.family === "fieldPerches")!;
  assert.deepEqual(resident.localPath, ["fieldPerches", "perch", "resident"]); assert.equal(resident.locationId, home);
});

test("manifest, source completeness, player/guest overlap and foreign or duplicate owner bindings refuse", () => {
  const bad: ((input: ReturnType<typeof fixture>) => void)[] = [
    input => { input.live = { ...input.live, repositoryRevision: 6 }; },
    input => { input.live = { ...input.live, playerId: "offline" }; },
    input => { input.live = { ...input.live, locationId: orbit }; },
    input => { input.live = { ...input.live, actorId: "absent" }; },
    input => { input.live = { ...input.live, actors: [actor("local", "drone", true)] }; },
    input => { input.live = { ...input.live, actors: [...input.live.actors, input.live.actors[0]] }; },
    input => { input.snapshot = { ...input.snapshot, locations: [...input.snapshot.locations, input.snapshot.locations[0]] }; },
    input => { input.snapshot = { ...input.snapshot, players: [...input.snapshot.players, input.snapshot.players[0]] }; },
    input => { input.snapshot = { ...input.snapshot, players: [] }; },
    input => { input.snapshot = { ...input.snapshot, locations: input.snapshot.locations.slice(1) }; },
    input => { input.snapshot = { ...input.snapshot, universe: { fields: { inventory: [] } } }; },
    input => { input.live = { ...input.live, source: { ...input.live.source, multiplayerPlayers: { local: normalizeMultiplayerPlayerState({ inventory: [filled("overlap")] }, "local") } } }; },
    input => { input.live = { ...input.live, source: { ...input.live.source, multiplayerPlayers: { offline: normalizeMultiplayerPlayerState({ inventory: [filled("overlap")] }, "offline") } } }; },
    input => { Reflect.deleteProperty(input.live.source, "digitalCreatureArchive"); },
    input => { input.snapshot = { ...input.snapshot, locations: [{ ...input.snapshot.locations[0], descriptor: { ...input.snapshot.locations[0].descriptor, universeId: universeId("foreign") } }, input.snapshot.locations[1]] }; },
  ];
  for (const mutate of bad) { const input = fixture(); mutate(input); assert.throws(() => inspect(input)); }
});

test("one shared owner cannot hide a duplicate inactive specimen or copied vessel", () => {
  const input = fixture();
  input.live = { ...input.live, source: { ...input.live.source, inventory: [filled("offline-player")] } };
  assert.throws(() => inspect(input), /Ambiguous duplicate filled creature vessel/);
  input.live = { ...input.live, source: { ...input.live.source, inventory: [captureOrbInventorySlot({ ...orb("offline-player"), orbId: "different-vessel" })] } };
  assert.throws(() => inspect(input), /Ambiguous legacy specimen/);
});

test("inactive attachment owners hydrate once, reject duplicate mirrors and retain the local-view gate", () => {
  const input = fixture(), fields = { schema: 1 as const, fields: { [orbit]: createAsteroidRegistry(orbitAddress, celestialTerrainSeed("owner-seed")) } };
  const flat = { ...locationFields(), seed: "owner-seed", generatorVersion: 18, spawn: { x: 0, y: 32, z: 0 }, edits: {}, chests: { "0,32,0": [filled("attached")] } };
  const admitted = captureAsteroidAttachmentCatalog(undefined, fields, fields, orbit, flat, {}, true);
  input.snapshot = { ...input.snapshot, universe: { fields: { asteroidFields: fields }, attachmentOwners: admitted.catalog },
    locations: input.snapshot.locations.map(row => row.descriptor.id === orbit ? { ...row, fields: admitted.location } : row) };
  assert.equal(inspect(input).index.stored.filter(row => row.custody.creature.entityId === "attached").length, 1);
  const clean = input.snapshot;
  input.snapshot = { ...clean, locations: clean.locations.map(row => row.descriptor.id === orbit ? { ...row, fields: flat } : row) };
  assert.throws(() => inspect(input), /duplicate/);
  const local = locationId({ ...orbitAddress, kind: "asteroid", instanceId: fields.fields[orbit].asteroids[0].descriptor.id });
  input.snapshot = { ...clean, locations: [...clean.locations, { descriptor: { id: local, universeId: universe, revision: 0 }, fields: locationFields() }] };
  assert.throws(() => inspect(input), /complete frame adapter/);
});

test("history tables stay location-owned and exact, including current runtime replacement", () => {
  const input = fixture(), result = inspect(input);
  assert.deepEqual(result.histories.map(row => [row.locationId, row.runtime]).sort(), [[home, true], [orbit, false]].sort());
  input.snapshot = { ...input.snapshot, locations: input.snapshot.locations.map(row => row.descriptor.id === orbit
    ? { ...row, fields: { ...row.fields, primeEncounters: undefined } } : row) };
  assert.throws(() => inspect(input), /canonical creature encounter table/);
});

test("complete owner enumeration joins a carried inactive encounter without losing or stamping its legacy origin", () => {
  const input = fixture(), anchor = "prime:petalfox:0:0", meta: CreatureMetadata = { ...metadata("remote-prime"), kind: "petalfox", custom: { primeAnchorId: anchor } };
  const value = captureIntoOrb(createEmptyCaptureOrb("remote-orb"), meta, 200, "keeper")!;
  const state = transferPrimeEncounterCustody(createPrimeEncounterState(planPrimeEncounter("petalfox", { worldSeed: "fixture", x: 0, z: 0,
    y: 30, surfaceY: 30, biomeName: "Glimmerwood", weather: "clear", daylight: .8 })!, "petalfox", 23, 100),
  "captured", meta.entityId, "orb:remote-orb", null, 200);
  input.live = { ...input.live, source: { ...input.live.source, inventory: [captureOrbInventorySlot(value)] } };
  input.snapshot = { ...input.snapshot, locations: input.snapshot.locations.map(row => row.descriptor.id === orbit
    ? { ...row, fields: { ...row.fields, primeEncounters: { [anchor]: state } } } : row) };
  const before = canonicalJson(input), result = reconcileUniverseCreatureCustody(input.snapshot, input.live);
  assert.equal(result.encounters.primeOwners[0].locationId, orbit);
  assert.deepEqual(result.encounters.primeOwners[0].owner?.path, ["player", "host", "inventory", 0]);
  assert.equal(result.encounters.primeOwners[0].owner?.holderLocationId, home);
  assert.equal(result.encounters.primeOwners[0].owner?.encounterOriginLocationId, null);
  assert.equal(canonicalJson(input), before);
  input.live = { ...input.live, source: { ...input.live.source, inventory: [] } };
  assert.throws(() => reconcileUniverseCreatureCustody(input.snapshot, input.live), /current body\/specimen/);
});

test("raw descriptors are inspected before access and one hundred cold collections do not mutate, normalize or read clocks", () => {
  const input = fixture(), encoded = canonicalJson(input), expected = canonicalJson(inspect(input)), now = Date.now;
  Date.now = () => { throw Error("universe custody touched clock"); };
  try { for (let count = 0; count < 100; count++) assert.equal(canonicalJson(inspect(JSON.parse(encoded))), expected); }
  finally { Date.now = now; }
  assert.equal(canonicalJson(input), encoded);
  let accessed = false;
  Object.defineProperty(input.live.source, "inventory", { enumerable: true, configurable: true, get() { accessed = true; return []; } });
  assert.throws(() => inspect(input), /accessors/); assert.equal(accessed, false);
});
