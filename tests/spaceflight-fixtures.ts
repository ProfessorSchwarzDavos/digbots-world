import { Item } from "../app/game/data";
import { homeLocation, locationId, universeId, type LocationStamp } from "../app/game/location-address";
import { applySpaceVehicleAction, createSurveyHopper, SURVEY_HOPPER_CAPACITY, type SpacefleetSave } from "../app/game/space-vehicle";
import type { WorldSave } from "../app/game/engine";
import { normalizeWorldOptions, type StoredWorld } from "../app/game/world-storage";

/** Explicit synthetic inventory/fuel fixture. Never a normal crafting claim. */
export function flightFixture(id: string, steps = 4) {
  const home = homeLocation(universeId(id));
  const origin: LocationStamp = { locationId: locationId(home), epoch: 1, revision: 1 };
  const destination: LocationStamp = { locationId: locationId({ ...home, kind: "orbit", instanceId: "low" }), epoch: 1, revision: 0 };
  const ship = structuredClone(createSurveyHopper("hopper-1", "local", origin.locationId, [3, 40, -2]));
  Object.assign(ship, SURVEY_HOPPER_CAPACITY);
  ship.hull = 873;
  ship.cargo[0] = { item: Item.Berry, count: 7, metadata: { note: "exact custody", nested: { values: [1, null, "雪"] } } };
  ship.cargoOwnership[0] = "cargo-test-1";
  let fleet: SpacefleetSave = { schema: 1, vehicles: { [ship.vehicleId]: ship } };
  const act = (action: Parameters<typeof applySpaceVehicleAction>[2]) => {
    fleet = applySpaceVehicleAction(fleet, { actorId: "local", locationId: origin.locationId,
      expectedVehicleRevision: fleet.vehicles[ship.vehicleId].revision, originStamp: origin, destinationStamp: destination }, action).fleet;
  };
  act({ vehicleId: ship.vehicleId, actionId: "board", type: "board" });
  act({ vehicleId: ship.vehicleId, actionId: "consent", type: "consent", consent: true });
  act({ vehicleId: ship.vehicleId, actionId: "reserve", type: "reserve", transactionId: "flight-1" });
  for (let step = 0; step < steps; step++) act({ vehicleId: ship.vehicleId, actionId: `step-${step}`, type: "step" });
  const save: WorldSave = { version: 2, generatorVersion: 18, generatorProfile: "world-below-v15", seed: "CF6-SYNTHETIC-HOME",
    mode: "survival", edits: { "0,0": [[2, 1]] }, player: { x: 3, y: 40, z: -2, yaw: .2, pitch: 0 }, spawn: { x: 3, y: 40, z: -2 },
    inventory: [{ item: Item.Berry, count: 3 }], spacefleet: fleet, selected: 0, health: 10, hunger: 10, xp: 0, level: 0,
    time: .32, day: 1, weather: "clear", furnaces: {}, chests: { "3,40,-2": [{ item: Item.Berry, count: 11 }] }, savedAt: 1000 };
  const world: StoredWorld = { version: 1, metadata: { id, ownership: "host-device", name: "CF6 synthetic flight", seed: save.seed,
    mode: save.mode, createdAt: 1000, updatedAt: 1000, lastPlayedAt: null, playTimeMs: 0, lastSavedGameVersion: "1.12.0" },
    options: normalizeWorldOptions(), save };
  const initial: WorldSave = { ...structuredClone(save), seed: "CF6-SYNTHETIC-ORBIT", edits: {}, chests: {}, spawn: { x: 0, y: 64, z: 0 } };
  const input = { transactionId: "flight-1", checkpointId: "arrival-1", vehicleId: ship.vehicleId,
    expectedVehicleRevision: fleet.vehicles[ship.vehicleId].revision, landingPosition: [0, 64, 0] as [number, number, number], initialDestinationSave: initial };
  return { world, origin, destination, initial, input };
}
