import { projectAsteroidStations, type AsteroidStationSources } from "./asteroid-attachment-stations";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";
import { rebaseAsteroidPosition, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import type { AttachmentActorBody } from "./attachment-actor-bodies";
import { surveyHopperBodyBounds } from "./survey-hopper-body";
import { applySpaceVehicleAction, validateSpacefleetSave, type SpaceVehicleAction, type SpaceVehicleState,
  type VehicleVector } from "./space-vehicle";
import { shipDock } from "./station-runtime";
import { canonicalJson, cloneUniverseJson } from "./universe-json";

export type AsteroidFleetActors = Readonly<{ localActorId: string; bodies: readonly AttachmentActorBody[] }>;
/** Host-only transient display, NOT a SpacefleetSave. Original location, trip
 * receipts, journal and resource authority stay in the universe fleet. Modules
 * (including canonical stationDock references) and cargo metadata are opaque. */
export type AsteroidFleetView = Readonly<{
  frameId: string; canonicalLocationId: AsteroidAttachmentFrame["orbitId"];
  viewLocationId: AsteroidAttachmentFrame["localId"];
  vehicles: Readonly<Record<string, Omit<SpaceVehicleState, "locationId" | "trip" | "flight" | "journal">>>;
}>;
function selection(frame: AsteroidAttachmentFrame, sources: AsteroidStationSources, context: AsteroidFleetActors) {
  const fleet = validateSpacefleetSave(sources.fleet), stations = projectAsteroidStations(frame, sources);
  canonicalJson(context);
  const actors = new Map<string, { body: AttachmentActorBody; side: boolean }>();
  for (const body of context.bodies) {
    if (!body.id || actors.has(body.id)) throw Error("Invalid or duplicate fleet actor identity.");
    actors.set(body.id, { body, side: asteroidAttachmentVolumeSide(frame, body.bounds, "orbit") });
  }
  if (!actors.has(context.localActorId) || context.localActorId !== "local" && actors.has("local"))
    throw Error("Missing or ambiguous fleet local actor identity.");
  const selected = new Set<string>();
  for (const ship of Object.values(fleet.vehicles)) {
    if (ship.locationId === frame.localId) throw Error("Fleet already contains a duplicate local-view owner.");
    if (ship.locationId !== frame.orbitId) continue;
    const side = asteroidAttachmentVolumeSide(frame, surveyHopperBodyBounds(ship), "orbit");
    if (side) {
      if (ship.trip || ship.flight) throw Error("Resolve active spacecraft flight before attached frame entry.");
      selected.add(ship.vehicleId);
    }
    const dock = shipDock(ship);
    if (dock && Object.hasOwn(stations.stations, dock.stationId) !== side)
      throw Error("Spacecraft dock crosses the attached frame boundary.");
    for (const passenger of ship.passengers) {
      // Existing solo flight saves use the literal local alias. Bind it to the
      // actual current host without rewriting its stored identity/history.
      const actor = actors.get(passenger.actorId === "local" ? context.localActorId : passenger.actorId);
      if (!actor) {
        if (side || passenger.connected) throw Error("Unresolved occupied spacecraft actor.");
        continue;
      }
      if (actor.side !== side) throw Error("Spacecraft passenger crosses the attached frame boundary.");
      if (actor.body.boatId !== null || actor.body.mountedCreatureId !== null) throw Error("Spacecraft passenger occupies another vehicle.");
    }
  }
  return { fleet, selected };
}
export function projectAsteroidFleet(frame: AsteroidAttachmentFrame, sources: AsteroidStationSources, actors: AsteroidFleetActors): AsteroidFleetView {
  const { fleet, selected } = selection(frame, sources, actors);
  const vehicles: Record<string, AsteroidFleetView["vehicles"][string]> = {};
  for (const id of selected) {
    const { locationId: location, trip, flight, journal, ...ship } = cloneUniverseJson(fleet.vehicles[id]);
    if (location !== frame.orbitId || trip || flight || journal.length !== ship.revision) throw Error("Invalid canonical fleet projection.");
    const [x, y, z] = ship.transform.position, local = rebaseAsteroidPosition(frame, { x, y, z }, "orbit");
    vehicles[id] = { ...ship, transform: { ...ship.transform, position: [local.x, local.y, local.z] as VehicleVector } };
  }
  return { frameId: frame.frameId, canonicalLocationId: frame.orbitId, viewLocationId: frame.localId, vehicles };
}
export type AsteroidFleetMetadataAction = Extract<SpaceVehicleAction, { type: "access" | "consent" }>;
/** Canonical reducer, not replacement-view capture. Authenticated actor identity
 * and expected revision are supplied by the host. Boarding, resource exchange,
 * flight and docking need their complete atomic adapters and are not accepted.
 * No consent is inferred by a read projection or carried across a new session. */
export function applyAsteroidFleetMetadata(frame: AsteroidAttachmentFrame, sources: AsteroidStationSources,
  actors: AsteroidFleetActors, actorId: string, expectedVehicleRevision: number, action: AsteroidFleetMetadataAction) {
  if (!["access", "consent"].includes(action.type)) throw Error("Spacecraft action requires its physical/resource attachment adapter.");
  const { fleet, selected } = selection(frame, sources, actors);
  const physicalId = actorId === "local" ? actors.localActorId : actorId;
  const actor = actors.bodies.find(body => body.id === physicalId);
  if (!actor || !asteroidAttachmentVolumeSide(frame, actor.bounds, "orbit") || !selected.has(action.vehicleId))
    throw Error("Spacecraft or actor is outside the attached frame.");
  const result = applySpaceVehicleAction(fleet, { actorId, locationId: frame.orbitId, expectedVehicleRevision }, action);
  if (result.externalWrites.length) throw Error("Unexpected external spacecraft write.");
  selection(frame, { ...sources, fleet: result.fleet }, actors);
  return result;
}
