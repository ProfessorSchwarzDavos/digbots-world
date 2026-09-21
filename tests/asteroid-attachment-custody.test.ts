import assert from "node:assert/strict";
import test from "node:test";
import { BlockId, Item, type InventorySlot } from "../app/game/data";
import { selectAsteroidCreatureCustody, type AsteroidCustodyPhysicalContext } from "../app/game/asteroid-attachment-custody";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { captureAsteroidEdits } from "../app/game/asteroid-runtime";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { createCelestialTerrain } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { createStationRegistry } from "../app/game/orbital-station";
import { captureIntoOrb, captureOrbInventorySlot, createEmptyCaptureOrb } from "../app/game/capture-orbs";
import { createDigitalCreatureArchive, createDigitalItemVault } from "../app/game/digital-storage";
import { normalizeSailboatSave } from "../app/game/boats";
import { normalizeMultiplayerPlayerState, type SavedCreature } from "../app/game/engine";
import { humanBodyBounds } from "../app/game/player-body";
import { droneBodyBounds } from "../app/game/drone-body";
import type { AttachmentActorBody } from "../app/game/attachment-actor-bodies";
import type { WorldCreatureCustodySource } from "../app/game/creature-custody-sources";
import type { ChunkEditSave } from "../app/game/world";
import { canonicalJson } from "../app/game/universe-json";

const orbit = locationAddress({ ...homeLocation(universeId("physical-custody")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 953), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const point = { x: frame.offset.x, y: frame.offset.y + 32, z: frame.offset.z };
const terrain = createCelestialTerrain({ location: orbit, seed: registry.seed })!;
function actor(id = "host", outside = false, kind: AttachmentActorBody["kind"] = "human"): AttachmentActorBody {
  const position = { ...point, x: point.x + (outside ? 100 : 0) };
  return { id, kind, position, bounds: kind === "human" ? humanBodyBounds(position, { variant: "male", race: "wayfarer", crouching: false }) : droneBodyBounds(position),
    connectionId: null, poseTick: null, agentUpdatedAt: null, boatId: null, boatSeat: null, mountedCreatureId: null, mountedCreatureSeat: null };
}
const orb = (id: string) => captureIntoOrb(createEmptyCaptureOrb(`orb-${id}`), { schema: 1, entityId: id, kind: "peelop",
  health: 5, maxHealth: 7, ageTicks: 123, baby: false, temperament: "Gentle", hostile: false, tamed: true,
  ownerId: "host", name: null, geneticSeed: 321, command: null, custom: { opaque: { x: 999, y: -.125, z: 444 } } }, 42, "host")!;
const slot = (id: string) => captureOrbInventorySlot(orb(id));
function fixture() {
  const source: WorldCreatureCustodySource = { inventory: [slot("pack")], furnaces: {}, chests: {},
    digitalItemVault: { ...createDigitalItemVault(), stacks: [slot("vault")] },
    digitalCreatureArchive: { ...createDigitalCreatureArchive(), orbs: [orb("archive")] },
    spacefleet: { schema: 1, vehicles: {} } };
  const context: AsteroidCustodyPhysicalContext = { world: { locationId: frame.orbitId, terrainVersion: terrain.version,
    terrainSeed: terrain.seed, expansionLevel: 0, registry, edits: {}, blockFacings: {} }, actors: [actor()], apiaryVisuals: [],
    exhibitResidents: {}, stations: { registry: createStationRegistry(frame.orbitId), fleet: source.spacefleet!,
      pressure: { schema: 1, nextInstallation: 1, zones: [], devices: {} }, wayanchorCells: {} } };
  return { source, context };
}
function withBlock(context: AsteroidCustodyPhysicalContext, key: string, block: BlockId) {
  const [x, y, z] = key.split(",").map(Number), cx = Math.floor(x / 16), cz = Math.floor(z / 16);
  const edits: ChunkEditSave = { [`${cx},${cz}`]: [[(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, block]] };
  const captured = captureAsteroidEdits({ schema: 1, fields: { [frame.orbitId]: registry } }, orbit, edits).fields[frame.orbitId];
  return { ...context, world: { ...context.world, registry: captured, edits } };
}

test("physical custody keeps digital owners shared and stored metadata exact across one hundred cold preflights", () => {
  const { source, context } = fixture(), before = canonicalJson({ source, context });
  const result = selectAsteroidCreatureCustody(frame, source, "host", context);
  assert.deepEqual(result.stored.map(value => [value.specimenId, value.side]), [["pack", "attached"], ["vault", "shared-universe"], ["archive", "shared-universe"]]);
  for (let i = 0; i < 100; i++) {
    const cold = JSON.parse(before); assert.deepEqual(selectAsteroidCreatureCustody(frame, cold.source, "host", cold.context), result);
  }
  assert.equal(canonicalJson({ source, context }), before); assert(Object.isFrozen(result.stored[0].holder));
});

test("actual block, boat alias, drop, present guest, inactive guest and typed drone holders resolve independently", () => {
  const { source, context } = fixture(), chestKey = `${point.x + 5},${point.y},${point.z}`;
  const boat = normalizeSailboatSave({ id: "boat", ...point, x: point.x + 100, inventory: [slot("boat")] });
  const chests: Record<string, (InventorySlot | null)[]> = { [chestKey]: Array.from({ length: 27 }, (_, i) => i === 0 ? slot("chest") : null),
    "boat:boat": [...boat.inventory] };
  const next: WorldCreatureCustodySource = { ...source, chests, boats: [boat], drops: [{ ...slot("drop"), ...point, age: 0 }],
    multiplayerPlayers: { guest: normalizeMultiplayerPlayerState({ inventory: [slot("guest")] }, "guest"),
      offline: normalizeMultiplayerPlayerState({ inventory: [slot("offline")] }, "offline") },
    agentCustody: { schema: 1, agents: { drone: { inventory: [slot("drone")], equipment: {}, returning: [], revision: 1 } } } };
  const nextContext = { ...withBlock(context, chestKey, BlockId.Chest), actors: [actor(), actor("guest", true), actor("drone", false, "drone")] };
  const result = selectAsteroidCreatureCustody(frame, next, "host", nextContext), sides = new Map(result.stored.map(value => [value.specimenId, value.side]));
  assert.equal(sides.get("boat"), "orbit"); assert.equal(sides.get("chest"), "attached"); assert.equal(sides.get("drop"), "attached");
  assert.equal(sides.get("guest"), "orbit"); assert.equal(sides.get("offline"), "inactive-player"); assert.equal(sides.get("drone"), "attached");
  assert.throws(() => selectAsteroidCreatureCustody(frame, next, "host", { ...nextContext, actors: [actor(), actor("guest", true)] }), /drone body/);
  assert.throws(() => selectAsteroidCreatureCustody(frame, next, "host", { ...nextContext, actors: [actor(), actor("guest", true, "drone"), actor("drone", false, "drone")] }), /Player custody/);
});

test("deployed orb and body must occupy one physical side; inactive or shared ledgers cannot conceal a split", () => {
  const { source, context } = fixture(), captured = orb("deployed");
  const deployed = { ...captured, attunement: { ownerId: "host", attunedAt: 50, activeEntityId: "23", recalledAt: 0, recallCount: 0, fainted: false } };
  const body: SavedCreature = { id: 23, specimenId: "deployed", kind: "peelop", ...point, yaw: 0, health: 5, age: 123,
    geneticSeed: 321, attunedOrbId: captured.orbId, creatureOwnerId: "host" };
  const next = { ...source, inventory: [captureOrbInventorySlot(deployed)], creatures: [body] };
  assert.equal(selectAsteroidCreatureCustody(frame, next, "host", context).stored[0].side, "attached");
  assert.throws(() => selectAsteroidCreatureCustody(frame, { ...next, creatures: [{ ...body, x: point.x + 100 }] }, "host", context), /orb holder/);
  assert.throws(() => selectAsteroidCreatureCustody(frame, { ...next, inventory: [],
    digitalCreatureArchive: { ...createDigitalCreatureArchive(), orbs: [deployed] } }, "host", context), /orb holder/);
});

test("source/frame/fleet and unresolved habitat sources fail before mutation", () => {
  const { source, context } = fixture(), before = canonicalJson({ source, context });
  assert.throws(() => selectAsteroidCreatureCustody({ ...frame, offset: { ...frame.offset, x: frame.offset.x + 1 } }, source, "host", context), /canonical world/);
  assert.throws(() => selectAsteroidCreatureCustody(frame, source, "host", { ...context, actors: [] }), /host custody/);
  assert.throws(() => selectAsteroidCreatureCustody(frame, source, "host", { ...context, exhibitResidents: { "exhibit:0,0,0": [] } }), /habitat roots/);
  assert.throws(() => selectAsteroidCreatureCustody(frame, { ...source, drops: [{ item: Item.RawIron, count: 1, age: 0,
    ...point, x: frame.orbitBounds.maxX + .49 }] }, "host", context), /boundary/);
  assert.equal(canonicalJson({ source, context }), before);
});
