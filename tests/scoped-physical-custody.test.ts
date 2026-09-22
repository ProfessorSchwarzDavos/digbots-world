import assert from "node:assert/strict";
import test from "node:test";
import { selectAsteroidCreatureCustody, selectUniverseAsteroidCreatureCustody, type AsteroidCustodyPhysicalContext } from "../app/game/asteroid-attachment-custody";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { createCelestialTerrain } from "../app/game/celestial-terrain";
import { createStationRegistry } from "../app/game/orbital-station";
import { homeLocation, locationId, universeId, type LocationId } from "../app/game/location-address";
import { createDigitalCreatureArchive, createDigitalItemVault } from "../app/game/digital-storage";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb, type CaptureOrb } from "../app/game/capture-orbs";
import { createPrimeEncounterState, planPrimeEncounter, transferPrimeEncounterCustody } from "../app/game/creature-rarity";
import { humanBodyBounds } from "../app/game/player-body";
import type { AttachmentActorBody } from "../app/game/attachment-actor-bodies";
import type { CreatureMetadata } from "../app/game/creature-cage";
import { normalizeMultiplayerPlayerState, type SavedCreature } from "../app/game/engine";
import { createSurveyHopper } from "../app/game/space-vehicle";
import { createMachine } from "../app/game/wayworks";
import { BlockId } from "../app/game/data";
import type { LiveUniverseCreatureCustody, UniverseCreatureCustodySnapshot } from "../app/game/universe-creature-custody";
import { canonicalJson } from "../app/game/universe-json";

const universe = universeId("scoped-physical"), homeAddress = homeLocation(universe), home = locationId(homeAddress);
const orbitAddress = { ...homeAddress, kind: "orbit" as const, instanceId: "low" }, orbit = locationId(orbitAddress);
const registry = createAsteroidRegistry(orbitAddress, 953), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const terrain = createCelestialTerrain({ location: orbitAddress, seed: registry.seed })!;
const point = { x: frame.offset.x, y: frame.offset.y + 32, z: frame.offset.z };
const metadata = (id: string, origin?: LocationId): CreatureMetadata => ({ schema: 1, entityId: id, kind: "peelop", health: 5,
  maxHealth: 7, ageTicks: 123, baby: false, temperament: "Gentle", hostile: false, tamed: true, ownerId: "local", name: null,
  geneticSeed: 321, command: null, custom: origin ? { specimenOriginLocationId: origin } : {} });
const orb = (vessel: string, id = vessel, origin?: LocationId) => captureIntoOrb(createEmptyCaptureOrb(vessel), metadata(id, origin), 42)!;
const slot = (vessel: string, id = vessel, origin?: LocationId) => captureOrbInventorySlot(orb(vessel, id, origin));
const body = (id: number, specimenId: string, origin?: LocationId, outside = false): SavedCreature => ({ id, specimenId,
  ...(origin ? { specimenOriginLocationId: origin } : {}), kind: "peelop", ...point, x: point.x + (outside ? 100 : 0),
  yaw: 0, health: 5, age: 123, geneticSeed: 321, creatureOwnerId: "local" });
function actor(): AttachmentActorBody {
  return { id: "local", kind: "human", position: point,
    bounds: humanBodyBounds(point, { variant: "male", race: "wayfarer", crouching: false }),
    connectionId: null, poseTick: null, agentUpdatedAt: null, boatId: null, boatSeat: null,
    mountedCreatureId: null, mountedCreatureSeat: null };
}
// Structural repository/transport fixture only: no native persistence or
// authenticated actor/entry/return authority is exercised by this pure test.
function fixture() {
  const snapshot: UniverseCreatureCustodySnapshot = {
    manifest: { id: universe, universeId: universe, revision: 7, currentLocationId: orbit, currentPlayerId: "host", deletedAt: null },
    universe: { fields: {} },
    locations: [ { descriptor: { id: home, universeId: universe, revision: 3 }, fields: { furnaces: {}, chests: {} } },
      { descriptor: { id: orbit, universeId: universe, revision: 6 }, fields: { furnaces: {}, chests: {} } } ],
    players: [ { playerId: "host", locationId: orbit, fields: { inventory: [] } },
      { playerId: "offline", locationId: home, fields: { inventory: [slot("offline")] } } ],
  };
  const live: LiveUniverseCreatureCustody = { universeId: universe, repositoryRevision: 7, playerId: "host", actorId: "local",
    locationId: orbit, actors: [actor()], encounterSources: { primeEncounters: {}, legendaryEncounters: {} },
    source: { inventory: [], cursor: null, trash: null, craftGrid: [], equipment: {}, offhand: null, furnaces: {}, wheatMills: {},
      wayworks: {}, chests: {}, boats: [], drops: [], orbRacks: {}, healingStations: {}, morphLooms: {}, apiaries: {}, aquariums: {},
      fieldPerches: {}, digitalItemVault: createDigitalItemVault(), digitalCreatureArchive: createDigitalCreatureArchive(),
      multiplayerPlayers: {}, agentCustody: { schema: 1, agents: {} }, spacefleet: { schema: 1, vehicles: {} }, creatures: [], sleepingCreatures: [] } };
  const context: AsteroidCustodyPhysicalContext = { world: { locationId: orbit, terrainVersion: terrain.version,
    terrainSeed: terrain.seed, expansionLevel: terrain.expansionLevel, registry, edits: {}, blockFacings: {} }, actors: live.actors,
    apiaryVisuals: [], exhibitResidents: {}, stations: { registry: createStationRegistry(orbit), fleet: live.source.spacefleet!,
      pressure: { schema: 1, nextInstallation: 1, zones: [], devices: {} }, wayanchorCells: {} } };
  return { snapshot, live, context };
}
const inspect = (input: ReturnType<typeof fixture>) => selectUniverseAsteroidCreatureCustody(frame, input.snapshot, input.live, input.context);
function remotePrime(input: ReturnType<typeof fixture>) {
  const anchor = "prime:petalfox:0:0", value = captureIntoOrb(createEmptyCaptureOrb("remote-prime"),
    { ...metadata("remote-prime"), kind: "petalfox", custom: { primeAnchorId: anchor } }, 42)!;
  const history = transferPrimeEncounterCustody(createPrimeEncounterState(planPrimeEncounter("petalfox", { worldSeed: "fixture", x: 0,
    z: 0, y: 30, surfaceY: 30, biomeName: "Glimmerwood", weather: "clear", daylight: .8 })!, "petalfox", 23, 100),
    "captured", "remote-prime", "orb:remote-prime", null, 200);
  input.live = { ...input.live, source: { ...input.live.source, inventory: [captureOrbInventorySlot(value)] } };
  input.snapshot = { ...input.snapshot, locations: input.snapshot.locations.map(row => row.descriptor.id === home
    ? { ...row, fields: { ...row.fields, primeEncounters: { [anchor]: history } } } : row) };
  return { anchor, history };
}

test("carried inactive encounter keeps global history and physically follows the explicit current host", () => {
  const input = fixture(); remotePrime(input); const before = canonicalJson(input), result = inspect(input);
  const prime = result.stored.find(row => row.custody.containerId === "remote-prime")!;
  assert.equal(prime.side, "attached"); assert.deepEqual(prime.path, ["player", "host", "inventory", 0]);
  assert.deepEqual(prime.physical?.holder, { kind: "player", playerId: "local", storage: "host" });
  assert.equal(result.custody.encounters.primeOwners[0].locationId, home);
  assert.equal(result.custody.encounters.primeOwners[0].owner?.encounterOriginLocationId, null);
  assert.equal(result.stored.find(row => row.custody.containerId === "offline")?.side, "inactive-player");
  assert.equal(canonicalJson(input), before); assert(!Object.isFrozen(input.snapshot)); assert(Object.isFrozen(result.stored));
});

test("known-distinct specimens remain independent in current storage and whole current bodies", () => {
  const input = fixture(); input.live = { ...input.live, source: { ...input.live.source,
    inventory: [slot("stored-home", "same-stored", home), slot("stored-orbit", "same-stored", orbit)],
    creatures: [body(1, "same-body", home), body(2, "same-body", orbit, true)] } };
  assert.throws(() => selectAsteroidCreatureCustody(frame, input.live.source, "local", input.context), /Duplicate/);
  const result = inspect(input);
  assert.equal(result.stored.filter(row => row.side === "attached").length, 2);
  assert.deepEqual(result.freeBodies.map(row => [row.creature.id, row.side]), [[1, "attached"], [2, "orbit"]]);
  assert.deepEqual(result.freeBodies.map(row => row.creature.specimenOriginLocationId), [home, orbit]);
  for (const origin of [home, undefined]) {
    input.live = { ...input.live, source: { ...input.live.source, creatures: [body(1, "same-body", home), body(2, "same-body", origin, true)] } };
    assert.throws(() => inspect(input), /Duplicate|Ambiguous/);
  }
});

test("inactive numeric body IDs never enter current geometry or conceal unmatched remote references", () => {
  const input = fixture(); input.live = { ...input.live, source: { ...input.live.source, creatures: [body(7, "current", orbit)] } };
  input.snapshot = { ...input.snapshot, locations: input.snapshot.locations.map(row => row.descriptor.id === home
    ? { ...row, fields: { ...row.fields, creatures: [body(7, "remote", home)] } } : row) };
  const result = inspect(input);
  assert.deepEqual(result.freeBodies.map(row => [row.locationId, row.creature.id, row.side]).sort(),
    [[home, 7, "other-location"], [orbit, 7, "attached"]].sort());
  input.snapshot = { ...input.snapshot, locations: input.snapshot.locations.map(row => row.descriptor.id === home
    ? { ...row, fields: { ...row.fields, creatures: [{ ...body(7, "remote", home), primeAnchorId: "unresolved" }] } } : row) };
  assert.throws(() => inspect(input), /unresolved Prime/);
});

test("global ambiguity and exact deployed holder split both refuse before a transfer result", () => {
  const input = fixture(), { anchor, history } = remotePrime(input);
  input.live = { ...input.live, encounterSources: { primeEncounters: { [anchor]: history }, legendaryEncounters: {} } };
  assert.throws(() => inspect(input), /Ambiguous/);
  const deployed: CaptureOrb = { ...orb("deployed", "pet", home),
    attunement: { ownerId: "local", attunedAt: 50, activeEntityId: "9", recalledAt: 0, recallCount: 0, fainted: false } };
  const next = fixture(); next.live = { ...next.live, source: { ...next.live.source, inventory: [captureOrbInventorySlot(deployed)],
    creatures: [{ ...body(9, "pet", home, true), attunedOrbId: "deployed" }] } };
  assert.throws(() => inspect(next), /cross the frame boundary/);
  next.live = { ...next.live, source: { ...next.live.source, inventory: [], creatures: [{ ...body(9, "pet", home), attunedOrbId: "deployed" }] } };
  next.snapshot = { ...next.snapshot, players: [...next.snapshot.players,
    { playerId: "offline-here", locationId: orbit, fields: { inventory: [captureOrbInventorySlot(deployed)] } }] };
  assert.throws(() => inspect(next), /no present physical holder/);
});

test("shared archive remains nonphysical and supplied actor/location mismatches cannot relabel holders", () => {
  const input = fixture(); input.live = { ...input.live, source: { ...input.live.source,
    digitalCreatureArchive: { ...createDigitalCreatureArchive(), orbs: [orb("archive")] } } };
  assert.equal(inspect(input).stored.find(row => row.custody.containerId === "archive")?.side, "shared-universe");
  const before = canonicalJson(input);
  assert.throws(() => inspect({ ...input, context: { ...input.context, actors: [] } }), /actual location or actors/);
  assert.throws(() => inspect({ ...input, live: { ...input.live, locationId: home } }), /actual location or actors/);
  assert.equal(canonicalJson(input), before);
});

test("present and offline guests remain distinct and nested cargo keeps explicit global holder paths", () => {
  const input = fixture(), guestPosition = { ...point, x: point.x + 100 };
  const guest: AttachmentActorBody = { ...actor(), id: "guest", position: guestPosition,
    bounds: humanBodyBounds(guestPosition, { variant: "male", race: "wayfarer", crouching: false }), connectionId: "guest-connection", poseTick: 4 };
  const machine = createMachine("powered-crusher", "orbit", "local"); machine.workshop.slots.input = slot("nested");
  input.live = { ...input.live, actors: [...input.live.actors, guest], source: { ...input.live.source,
    inventory: [{ item: BlockId.PoweredCrusher, count: 1, metadata: { wayworks: machine } }],
    multiplayerPlayers: { guest: normalizeMultiplayerPlayerState({ inventory: [slot("guest")] }, "guest"),
      away: normalizeMultiplayerPlayerState({ inventory: [slot("away")] }, "away") } } };
  input.context = { ...input.context, actors: input.live.actors };
  const result = inspect(input), nested = result.stored.find(row => row.custody.containerId === "nested")!;
  assert.equal(result.stored.find(row => row.custody.containerId === "guest")?.side, "orbit");
  assert.equal(result.stored.find(row => row.custody.containerId === "away")?.side, "inactive-player");
  assert.deepEqual(nested.path, ["player", "host", "inventory", 0, "metadata", "wayworks", "workshop", "slots", "input"]);
  assert.deepEqual(nested.physical?.holder, { kind: "player", playerId: "local", storage: "host" });
  assert.equal(nested.side, "attached");
});

test("other-location fleet deployment never binds an equal current numeric body ID", () => {
  const input = fixture(), ship = structuredClone(createSurveyHopper("ship", "local", home, [0, 10, 0]));
  const deployed: CaptureOrb = { ...orb("ship-orb", "ship-pet", home),
    attunement: { ownerId: "local", attunedAt: 50, activeEntityId: "7", recalledAt: 0, recallCount: 0, fainted: false } };
  ship.cargo[0] = captureOrbInventorySlot(deployed); ship.cargoOwnership[0] = "ship-stack";
  input.live = { ...input.live, source: { ...input.live.source, spacefleet: { schema: 1, vehicles: { ship } },
    creatures: [body(7, "current-unrelated", orbit)] } };
  input.context = { ...input.context, stations: { ...input.context.stations, fleet: input.live.source.spacefleet! } };
  input.snapshot = { ...input.snapshot, locations: input.snapshot.locations.map(row => row.descriptor.id === home
    ? { ...row, fields: { ...row.fields, creatures: [{ ...body(7, "ship-pet", home), attunedOrbId: "ship-orb" }] } } : row) };
  const result = inspect(input), stored = result.stored.find(row => row.custody.containerId === "ship-orb")!;
  assert.equal(stored.side, "other-location"); assert.equal(stored.body?.locationId, home); assert.equal(stored.physical, null);
  assert.deepEqual(result.current.freeBodies.map(row => [row.id, row.side]), [[7, "attached"]]);
});

test("one hundred cold global physical preflights retain exact owners without reading clocks", () => {
  const input = fixture(); remotePrime(input); const before = canonicalJson(input), result = inspect(input);
  const now = Date.now; Date.now = () => { throw Error("No clocks in physical preflight"); };
  try { for (let i = 0; i < 100; i++) assert.deepEqual(inspect(JSON.parse(before)), result); }
  finally { Date.now = now; }
  assert.equal(canonicalJson(input), before);
});
