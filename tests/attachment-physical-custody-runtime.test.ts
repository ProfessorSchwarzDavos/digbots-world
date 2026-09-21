import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine } from "../app/game/engine";
import { BlockId, Item } from "../app/game/data";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createCelestialTerrain } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { createDigitalCreatureArchive, createDigitalItemVault } from "../app/game/digital-storage";
import type { ChunkEditSave } from "../app/game/world";
import { canonicalJson } from "../app/game/universe-json";
import { createWaystarCatalog } from "../app/game/celestial-catalog";

function fixture() {
  const orbit = locationAddress({ ...homeLocation(universeId("runtime-physical-custody")), kind: "orbit", instanceId: "low" });
  const registry = createAsteroidRegistry(orbit, 953), asteroid = registry.asteroids[0].descriptor;
  const stamp = { locationId: locationId(orbit), epoch: 3, revision: 7 }, edits: ChunkEditSave = {};
  const manifest = { currentLocationId: stamp.locationId, revision: 5 }, catalog = createWaystarCatalog();
  const pressure = { schema: 1, nextInstallation: 1, zones: [], devices: {} };
  const emptyMaps = Object.fromEntries(["furnaces", "wheatMills", "wayworks", "chests", "boats", "orbRacks", "healingStations", "morphLooms",
    "multiplayerPlayerStates", "apiaries", "aquariums", "fieldPerches", "temporarySummons", "primeEncounters", "legendaryEncounters",
    "agentBuildJobs", "agentBuildPreviews", "agentRuntimeTasks", "agentInventories", "agentEquipment", "agentReturningMaterials",
    "agentInventoryRevisions", "remotePlayers", "creatureMountSeats"].map(name => [name, new Map()]));
  const engine = Object.assign(Object.create(VoxelEngine.prototype), emptyMaps, { multiplayer: null, persistenceRevision: 11,
    inventory: [{ item: Item.RawIron, count: 9, metadata: { opaque: { x: 999 } } }], cursor: null, trash: null, craftGrid: [],
    equipment: { head: null, chest: null, legs: null, feet: null, back: null }, offhand: null,
    digitalItemVault: createDigitalItemVault(), digitalCreatureArchive: createDigitalCreatureArchive(), spacefleet: { schema: 1, vehicles: {} },
    drops: [], mobs: [], sleepingCreatures: [], mountedBoatId: null, mountedCreatureId: null, mountedCreatureSeat: null,
    position: new THREE.Vector3(asteroid.center.x, asteroid.center.y, asteroid.center.z), spawn: new THREE.Vector3(0, 32, 0),
    yaw: .2, pitch: .1, velocity: new THREE.Vector3(.1, .2, .3), playerVariant: "male", crouching: false, creativeFlying: false,
    agentAuthority: { list: () => [] }, pressureRuntime: { snapshot: () => structuredClone(pressure) }, orbitalStations: null,
    worldStorage: { currentStamp: stamp, currentManifest: manifest, currentCatalog: catalog },
    asteroidFields: { schema: 1, fields: { [stamp.locationId]: registry } },
    world: { locationScope: stamp, celestialTerrain: createCelestialTerrain({ location: orbit, seed: 953 }),
      serializeEdits: () => structuredClone(edits), serializeBlockFacings: () => ({}), getBlock: () => { throw Error("No loaded chunks"); } },
    bodyContext: () => { throw Error("No mutable celestial context cache"); },
    serialize: () => { throw Error("No mutating serialization"); }, saveSoon: () => { throw Error("No persistence"); },
  }) as VoxelEngine;
  return { engine, asteroid, edits, manifest, catalog, pressure };
}

test("actual synchronous engine envelope joins exact world, transport, storage and navigation without mutation or clocks", () => {
  const { engine, asteroid } = fixture(), inventory = engine.inventory, fields = engine.asteroidFields;
  const before = canonicalJson({ inventory, fields });
  const now = Date.now; Date.now = () => { throw Error("No clock read in physical source inspection"); };
  let result: ReturnType<VoxelEngine["snapshotAttachmentPhysicalCustodySource"]>;
  try { result = engine.snapshotAttachmentPhysicalCustodySource(asteroid.id); engine.assertAttachmentPhysicalCustodySourceUnchanged(result); }
  finally { Date.now = now; }
  assert.equal(result.context.actors.length, 1); assert.equal(result.physical.bindings[0].side, "attached");
  assert.equal(result.navigation.locationPlayerState.velocity![1], .2);
  assert.equal(result.source.inventory[0]!.count, 9); assert.equal(result.persistenceRevision, 11);
  assert.equal(engine.inventory, inventory); assert.equal(engine.asteroidFields, fields); assert.equal(canonicalJson({ inventory, fields }), before);
  assert(Object.isFrozen(result.context.world.registry)); assert(Object.isFrozen(result.source.inventory));
});

test("unchanged dirty counters cannot conceal inventory, edit, actor pose, pressure or owner/catalog changes", () => {
  for (const fault of ["inventory", "edit", "pose", "pressure", "manifest", "catalog"] as const) {
    const { engine, asteroid, edits, pressure, manifest, catalog } = fixture(), result = engine.snapshotAttachmentPhysicalCustodySource(asteroid.id);
    if (fault === "inventory") engine.inventory[0]!.count--;
    if (fault === "pose") engine.position.x += .125;
    if (fault === "pressure") pressure.nextInstallation++;
    if (fault === "manifest") manifest.revision++;
    if (fault === "catalog") Object.assign(engine.worldStorage, { currentCatalog: { ...catalog, source: "changed" } });
    if (fault === "edit") {
      const { x, y, z } = asteroid.center, cx = Math.floor(x / 16), cz = Math.floor(z / 16);
      edits[`${cx},${cz}`] = [[(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, BlockId.Air]];
    }
    assert.equal(engine.persistenceRevision, 11);
    assert.throws(() => engine.assertAttachmentPhysicalCustodySourceUnchanged(result), /Stale/, fault);
  }
});

test("pending transitions and missing durable/pressure sources never create an admitted envelope", () => {
  for (const fault of ["checkpointPromise", "pendingFieldSurvey", "pendingSpaceArrival", "locationTransitioning", "evaCargoLine", "owner", "pressure"] as const) {
    const { engine, asteroid } = fixture(), before = canonicalJson(engine.asteroidFields);
    if (fault === "owner") Object.assign(engine.worldStorage, { currentManifest: null });
    else if (fault === "pressure") engine.pressureRuntime = null;
    else Object.assign(engine, { [fault]: true });
    assert.throws(() => engine.snapshotAttachmentPhysicalCustodySource(asteroid.id), /pending|owner or pressure/);
    assert.equal(canonicalJson(engine.asteroidFields), before);
  }
});

test("actual host preflight finds never-opened canonical installations without initializing stores", () => {
  const { engine, asteroid, edits } = fixture(), { x, y, z } = asteroid.center;
  const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
  edits[`${cx},${cz}`] = [[(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, BlockId.Chest]];
  const fields = engine.asteroidFields, before = canonicalJson({ fields, edits });
  const result = engine.snapshotAttachmentPhysicalCustodySource(asteroid.id);
  assert.deepEqual(result.physical.installations, [{ kind: "chest", key: `${x},${y},${z}`, cellKeys: [`${x},${y},${z}`], attached: true, recorded: false }]);
  assert.equal(engine.chests.size, 0); assert.equal(engine.asteroidFields, fields);
  assert.equal(canonicalJson({ fields, edits }), before);
});
