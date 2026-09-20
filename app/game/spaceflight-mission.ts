import { locationId, parseLocationId, type LocationId, type LocationStamp } from "./location-address";
import { planSpaceVehicleTravel, SURVEY_HOPPER_CAPACITY, VEHICLE_RESOURCES, type SpaceVehicleState, type VehicleResource, type VehicleResources } from "./space-vehicle";
import type { LaunchPadCheck } from "./spaceflight-infrastructure";
import type { StationAccess, StationAssociation, StationPosition, StationRegistrySave } from "./orbital-station";

export const FIRST_FLIGHT_ROUTES = ["home-orbit", "home-surface", "morrow-orbit", "morrow-surface"] as const;
export type FirstFlightRoute = typeof FIRST_FLIGHT_ROUTES[number];
export const SPACE_RESOURCE_LABELS: Record<VehicleResource, string> = { fuelMl: "Rocket fuel", oxidizerMl: "Oxidizer O₂", oxygenMl: "Cabin O₂", batteryJoules: "Battery" };
export function firstFlightDestination(origin: LocationId, route: FirstFlightRoute): LocationId {
  if (!FIRST_FLIGHT_ROUTES.includes(route)) throw Error("Unknown route.");
  const address = parseLocationId(origin), moon = route.startsWith("morrow"), orbit = route.endsWith("orbit");
  return locationId({ ...address, bodyId: (moon ? "blockwild/morrow" : "blockwild") as typeof address.bodyId,
    kind: orbit ? "orbit" : "surface", instanceId: orbit ? "low" : "main" });
}
export type SpaceflightMission = {
  ship: SpaceVehicleState | null; pad: LaunchPadCheck | null; route: FirstFlightRoute;
  costs: VehicleResources | null; blockers: string[]; status: string; destination: LocationId | null;
  stations?: StationRegistrySave | null;
};
/** Station authority has its own revision and does not depend on a nearby ship. */
export type StationManagementIntent =
  | { kind: "station-access"; stationId: string; memberIds: string[]; association: StationAssociation; access: StationAccess; registryRevision: number }
  | { kind: "station-name"; stationId: string; name: string; icon?: string; registryRevision: number }
  | { kind: "station-register-dock"; stationId: string; position: StationPosition; registryRevision: number }
  | { kind: "station-habitat" | "station-cabin"; stationId: string; registryRevision: number };
export type SpaceflightIntent =
  | { kind: "deploy" }
  | { kind: "route"; route: FirstFlightRoute }
  | { kind: "supply"; resource: VehicleResource; vehicleRevision: number }
  | { kind: "board" | "consent" | "leave" | "abort" | "launch" | "retry-arrival"; vehicleRevision: number }
  | { kind: "cargo-in" | "cargo-out"; slot: number; vehicleRevision: number }
  | { kind: "station-found"; name: string; registryRevision: number; vehicleRevision: number }
  | { kind: "station-dock"; stationId: string; dockId: string; undock: boolean; registryRevision: number; vehicleRevision: number }
  | StationManagementIntent;

export function isStationManagementIntent(action: SpaceflightIntent): action is StationManagementIntent {
  return action.kind === "station-access" || action.kind === "station-name" || action.kind === "station-habitat" || action.kind === "station-cabin" || action.kind === "station-register-dock";
}

export function inspectSpaceflightMission(ship: SpaceVehicleState | null, origin: LocationStamp, route: FirstFlightRoute,
  pad: LaunchPadCheck | null, weatherSafe = true): SpaceflightMission {
  const destination = firstFlightDestination(origin.locationId, route), blockers: string[] = [];
  let costs: VehicleResources | null = null;
  if (!ship) blockers.push("Select a crafted Survey Hopper and deploy it on a complete launch pad.");
  else if (ship.trip) blockers.push(ship.trip.status === "commit-ready" ? "Finish the pending arrival checkpoint." : "A flight is already in progress.");
  else {
    if (parseLocationId(origin.locationId).kind === "surface") blockers.push(...(pad?.blockers ?? ["Park on a formed launch pad."]));
    if (!weatherSafe) blockers.push("Wait for clear launch weather.");
    // Quote with full tanks to list each missing finite resource independently.
    const trial = structuredClone(ship);
    Object.assign(trial, SURVEY_HOPPER_CAPACITY);
    try {
      costs = planSpaceVehicleTravel(trial, origin, { locationId: destination, epoch: 1, revision: 0 }, "preview").reserved;
      for (const key of VEHICLE_RESOURCES) if (ship[key] < costs[key]) blockers.push(`Load ${((costs[key] - ship[key]) / 1000).toFixed(1)} ${key === "batteryJoules" ? "kJ" : "L"} more ${SPACE_RESOURCE_LABELS[key]}.`);
    } catch (error) { blockers.push(error instanceof Error ? error.message.replace(/^Space vehicle: /, "") : "Route unavailable."); }
  }
  return { ship, pad, route, costs, blockers, destination, status: ship?.phase.replaceAll("-", " ") ?? "No ship deployed" };
}
