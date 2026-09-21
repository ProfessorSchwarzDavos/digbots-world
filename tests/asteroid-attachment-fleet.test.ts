import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { projectAsteroidFleet, applyAsteroidFleetMetadata, type AsteroidFleetActors,
  type AsteroidFleetMetadataAction } from "../app/game/asteroid-attachment-fleet";
import { surveyHopperBodyBounds, surveyHopperBodyRadius } from "../app/game/survey-hopper-body";
import { createSpaceflightModel, updateSpaceflightModel } from "../app/game/spaceflight-models";
import { humanBodyBounds } from "../app/game/player-body";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { createSurveyHopper, validateSpacefleetSave, applySpaceVehicleAction, SURVEY_HOPPER_CAPACITY } from "../app/game/space-vehicle";
import { createStationRegistry, applyStationAction } from "../app/game/orbital-station";
import type { AsteroidStationSources } from "../app/game/asteroid-attachment-stations";
import { planStationDock } from "../app/game/station-runtime";
import { canonicalJson } from "../app/game/universe-json";
import { Item, BlockId } from "../app/game/data";

const home = homeLocation(universeId("fleet-selection")), orbit = locationAddress({ ...home, kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const point = { x: frame.offset.x + .125, y: 32.1, z: frame.offset.z - .375 };
function actors(): AsteroidFleetActors {
  return { localActorId: "host", bodies: ["host", "outside"].map(id => {
    const position = { ...point, x: point.x + (id === "outside" ? 80 : 0) };
    return { id, kind: "human", position, bounds: humanBodyBounds(position, { variant: "male", race: "wayfarer", crouching: false }),
      connectionId: id === "host" ? null : "outside-connection", poseTick: id === "host" ? null : 3, agentUpdatedAt: null,
      boatId: null, boatSeat: null, mountedCreatureId: null, mountedCreatureSeat: null };
  }) };
}
function fixture(): AsteroidStationSources {
  const inside = structuredClone(createSurveyHopper("inside", "local", frame.orbitId, [point.x, point.y, point.z]));
  inside.passengers = [{ actorId: "local", seat: 0, consent: false, connected: true }];
  inside.cargo[0] = { item: Item.FieldWrench, count: 1, durability: 51, metadata: { x: 999, y: .1, fuelMl: 17 } };
  inside.cargoOwnership[0] = "cargo-one"; inside.fuelMl = 241; inside.oxygenMl = 841;
  const outside = structuredClone(createSurveyHopper("outside", "other", frame.orbitId, [point.x + 80, point.y, point.z]));
  outside.passengers = [{ actorId: "offline", seat: 0, consent: true, connected: false }];
  const elsewhere = createSurveyHopper("elsewhere", "other", locationId(home), [point.x, point.y, point.z]);
  return { fleet: validateSpacefleetSave({ schema: 1, vehicles: { outside, inside, elsewhere } }),
    registry: createStationRegistry(frame.orbitId), pressure: { schema: 1, nextInstallation: 1, zones: [], devices: {} }, wayanchorCells: {} };
}

test("Hopper body contains every visible model vertex across full Euler poses, cockpit views, leg sweeps and exhaust", () => {
  const ship = fixture().fleet.vehicles.inside, bounds = surveyHopperBodyBounds(ship), root = createSpaceflightModel("survey-hopper");
  assert(surveyHopperBodyRadius() > 4.3);
  root.position.set(...ship.transform.position);
  for (const euler of [[0, 0, 0], [.3, 1.7, -.4], [Math.PI / 2, -.8, 1.2], [-1.2, -2.5, Math.PI]] as const)
    for (const cockpit of [false, true]) for (const gear of [0, .13, .5, .91, 1]) for (const time of [0, .2, .73, 4.11]) {
      root.rotation.set(euler[0], euler[1], euler[2]);
      updateSpaceflightModel(root, { time, cockpit, landingGear: gear, thrust: 1, active: true });
      root.updateMatrixWorld(true);
      root.traverseVisible(node => {
        if (!(node instanceof THREE.Mesh)) return;
        const p = node.geometry.getAttribute("position"), v = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) {
          v.set(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(node.matrixWorld);
          assert(v.x >= bounds.minX && v.x <= bounds.maxX && v.y >= bounds.minY && v.y <= bounds.maxY
            && v.z >= bounds.minZ && v.z <= bounds.maxZ, node.name);
        }
      });
      const leg = root.getObjectByName("landing-leg-0")!;
      assert.equal(leg.rotation.z, -2.45 * (1 - gear));
      assert.equal(leg.position.y, 1.2 + .4 * (1 - gear) + .7 * Math.sin(Math.PI * gear));
      const flame = root.getObjectByName("throttle-exhaust")!;
      assert.equal(flame.scale.y, 1 + (Math.sin(time % (Math.PI * 2) * 19) * .035 + Math.sin(time % (Math.PI * 2) * 31) * .025));
    }
  assert.throws(() => surveyHopperBodyBounds({ ...ship, transform: { ...ship.transform, position: [NaN, 0, 0] } }), /pose/);
});

test("fleet projection preserves one canonical owner, all finite stores and local alias without rewriting history", () => {
  const source = fixture(), context = actors(), before = canonicalJson({ source, context });
  for (let i = 0; i < 100; i++) {
    const view = projectAsteroidFleet(frame, JSON.parse(JSON.stringify(source)), context);
    assert.deepEqual(Object.keys(view.vehicles), ["inside"]);
    assert.equal(view.canonicalLocationId, frame.orbitId); assert.equal(view.viewLocationId, frame.localId);
    const ship = view.vehicles.inside;
    assert.deepEqual(ship.transform.position, [.125, point.y - frame.offset.y, -.375]);
    assert.deepEqual(ship.passengers, source.fleet.vehicles.inside.passengers);
    assert.equal(ship.passengers[0].consent, false); // Projection is not consent.
    assert.deepEqual(ship.cargo, source.fleet.vehicles.inside.cargo); assert.equal(ship.fuelMl, 241); assert.equal(ship.oxygenMl, 841);
    assert.equal("journal" in ship, false); assert.equal("trip" in ship, false); assert.equal("locationId" in ship, false);
    assert.throws(() => validateSpacefleetSave(view));
    ship.cargo[0]!.metadata!.x = -1;
  }
  assert.equal(canonicalJson({ source, context }), before);
});

test("metadata requests retain original permission, revision and replay rules without accepting view resource writes", () => {
  const source = fixture(), context = actors(), action: AsteroidFleetMetadataAction = { type: "consent", consent: true,
    vehicleId: "inside", actionId: "consent-one" };
  const result = applyAsteroidFleetMetadata(frame, source, context, "local", 0, action);
  assert.equal(result.vehicle.locationId, frame.orbitId); assert.equal(result.vehicle.passengers[0].consent, true);
  assert.equal(result.vehicle.revision, 1); assert.deepEqual(result.externalWrites, []);
  assert.deepEqual(result.vehicle.transform, source.fleet.vehicles.inside.transform);
  assert.deepEqual(result.vehicle.cargo, source.fleet.vehicles.inside.cargo);
  assert.deepEqual(result.fleet.vehicles.outside, source.fleet.vehicles.outside);
  assert.throws(() => applyAsteroidFleetMetadata(frame, { ...source, fleet: result.fleet }, context, "local", 0, action), /replayed/);
  assert.throws(() => applyAsteroidFleetMetadata(frame, source, context, "local", 1, action), /stale/);
  assert.throws(() => applyAsteroidFleetMetadata(frame, source, context, "outside", 0, action), /outside/);
  assert.throws(() => applyAsteroidFleetMetadata(frame, source, context, "host", 0, action), /consent/);
  assert.throws(() => applyAsteroidFleetMetadata(frame, source, context, "local", 0,
    { type: "cargo-out", vehicleId: "inside", actionId: "cargo", vehicleSlot: 0 } as unknown as AsteroidFleetMetadataAction), /physical\/resource/);
});

test("whole hull, occupied seats, local alias collisions and active flights fail closed", () => {
  const original = fixture(), context = actors();
  for (const x of [frame.orbitBounds.maxX - .01, frame.orbitBounds.maxX + surveyHopperBodyRadius() - 1]) {
    const source = structuredClone(original); source.fleet.vehicles.inside.transform.position[0] = x;
    assert.throws(() => projectAsteroidFleet(frame, source, context), /boundary/);
  }
  const outside = context.bodies[1];
  assert.throws(() => projectAsteroidFleet(frame, original, { ...context, bodies: [{ ...outside, id: "host" }] }), /passenger/);
  assert.throws(() => projectAsteroidFleet(frame, original, { ...context,
    bodies: context.bodies.map(body => body.id === "host" ? { ...body, boatId: "boat" } : body) }), /another vehicle/);
  assert.throws(() => projectAsteroidFleet(frame, original, { ...context, bodies: [...context.bodies, { ...outside, id: "local" }] }), /ambiguous/);
  const unknown = structuredClone(original); unknown.fleet.vehicles.inside.passengers[0].actorId = "missing";
  assert.throws(() => projectAsteroidFleet(frame, unknown, context), /Unresolved/);
  const duplicate = structuredClone(original); duplicate.fleet.vehicles.inside.locationId = frame.localId;
  assert.throws(() => projectAsteroidFleet(frame, duplicate, context), /duplicate local/);
  const funded = structuredClone(original); Object.assign(funded.fleet.vehicles.inside, SURVEY_HOPPER_CAPACITY, { phase: "orbit" });
  funded.fleet.vehicles.inside.passengers[0].consent = true;
  const reserved = applySpaceVehicleAction(funded.fleet, { actorId: "local", locationId: frame.orbitId, expectedVehicleRevision: 0,
    originStamp: { locationId: frame.orbitId, epoch: 1, revision: 0 }, destinationStamp: { locationId: locationId(home), epoch: 1, revision: 0 } },
    { type: "reserve", vehicleId: "inside", actionId: "reserve", transactionId: "trip-one" });
  assert.throws(() => projectAsteroidFleet(frame, { ...funded, fleet: reserved.fleet }, context), /active spacecraft flight/);
});

test("station dock references remain canonical and selected ship/station/passenger form one physical unit", () => {
  const source = structuredClone(fixture()), context = actors(), actor = { actorId: "local", factionIds: [], guildIds: [] };
  const center: [number, number, number] = [frame.offset.x, 32, frame.offset.z], dock: [number, number, number] = [center[0] + 2, 32, center[2]];
  const stationRegistry = applyStationAction(source.registry, { actor, locationId: frame.orbitId, expectedRevision: 0, placements: [
    { receiptId: "core", actorId: "local", locationId: frame.orbitId, expectedRevision: 0, kind: "core", position: center },
    { receiptId: "collar", actorId: "local", locationId: frame.orbitId, expectedRevision: 0, kind: "docking-collar", position: dock },
  ] }, { type: "create", stationId: "station", actionId: "station-create", name: "Station", icon: "station", band: "low",
    coreReceiptId: "core", dockReceiptId: "collar", dockId: "dock" }).registry;
  source.fleet.vehicles.inside.phase = "orbit";
  const docked = planStationDock({ registry: stationRegistry, fleet: source.fleet, actor, vehicleId: "inside", stationId: "station", dockId: "dock",
    expectedRegistryRevision: 1, expectedVehicleRevision: 0, actionId: "dock-one", undock: false,
    blockAt: (x, y, z) => y === 32 && z === center[2] ? x === center[0] ? BlockId.StationCore : x === dock[0] ? BlockId.OrbitalDock : BlockId.Air : BlockId.Air });
  const next = { ...source, registry: docked.registry, fleet: docked.fleet }, view = projectAsteroidFleet(frame, next, context);
  assert.deepEqual(view.vehicles.inside.modules, next.fleet.vehicles.inside.modules);
  assert.equal((view.vehicles.inside.modules.find(value => value.kind === "avionics")!.metadata.stationDock as { locationId: string }).locationId, frame.orbitId);
  assert.deepEqual(view.vehicles.inside.transform.position, [2, 32.51 - frame.offset.y, 0]);
  const broken = structuredClone(next); broken.fleet.vehicles.inside.transform.position[0] += 80;
  assert.throws(() => projectAsteroidFleet(frame, broken, context), /custody/);
});
