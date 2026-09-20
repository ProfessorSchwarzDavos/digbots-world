import { applySpaceVehicleAction, validateSpacefleetSave, type SpacefleetSave, type VehicleFlightControl } from "./space-vehicle";

export const FLIGHT_PHASE_DURATION_MS = { countdown: 6000, ascent: 18000, orbit: 5000, transfer: 16000, approach: 7000, descent: 7000 } as const;
export type FlightPilotInput = { throttle: -1 | 0 | 1; pitch: -1 | 0 | 1; turn: -1 | 0 | 1 };
export type FlightFrame = { fleet: SpacefleetSave; ready: boolean; phaseChanged: boolean; message: string | null };
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** Parked cabins have finite upkeep. In flight the route's prepaid phase O2 and
 * battery costs cover the bounded crew interval; never debit its reservation. */
export function advanceSpaceCabin(input: SpacefleetSave, vehicleId: string, elapsedMs: number): SpacefleetSave {
  const current = input.vehicles[vehicleId];
  if (!current || current.trip || !current.passengers.length) return input;
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw Error("Invalid cabin tick.");
  const dt = Math.min(100, Math.round(elapsedMs)); if (!dt) return input;
  const next = structuredClone(input), ship = next.vehicles[vehicleId], clock = (ship.cabinClockMs ?? 0) + dt;
  const seconds = Math.floor(clock / 1000); ship.cabinClockMs = clock % 1000;
  ship.oxygenMl = Math.max(0, ship.oxygenMl - seconds * 4);
  ship.batteryJoules = Math.max(0, ship.batteryJoules - seconds * 8);
  return validateSpacefleetSave(next);
}

/** Bounded host tick: player input changes the ascent attitude and thrust;
 * discrete route costs are paid once at each phase entry, never on replay. */
export function advanceSpaceflight(input: SpacefleetSave, vehicleId: string, elapsedMs: number, pilot: FlightPilotInput): FlightFrame {
  const fleet = structuredClone(validateSpacefleetSave(input)), vehicle = fleet.vehicles[vehicleId];
  if (!vehicle?.trip) return { fleet: input, ready: false, phaseChanged: false, message: null };
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || ![pilot.throttle, pilot.pitch, pilot.turn].every(v => [-1, 0, 1].includes(v))) throw Error("Invalid pilot tick.");
  const dt = Math.min(100, Math.round(elapsedMs));
  if (dt === 0) return { fleet: input, ready: false, phaseChanged: false, message: null };
  const flight: VehicleFlightControl = vehicle.flight ?? { schema: 1, phaseTimeMs: 0, throttlePermille: 700, pitchPermille: 500,
    headingMilliRadians: Math.round(vehicle.transform.rotation[1] * 1000), originPosition: [...vehicle.transform.position], progressPermille: 0 };
  flight.phaseTimeMs += vehicle.phase === "ascent" ? Math.max(1, Math.round(dt * (.65 + flight.throttlePermille / 2000))) : dt;
  flight.throttlePermille = clamp(flight.throttlePermille + pilot.throttle * dt, 200, 1000);
  flight.pitchPermille = clamp(flight.pitchPermille + pilot.pitch * Math.round(dt / 2), 100, 900);
  flight.headingMilliRadians = Math.round(clamp(flight.headingMilliRadians + pilot.turn * dt, -100000, 100000));
  const duration = FLIGHT_PHASE_DURATION_MS[vehicle.phase as keyof typeof FLIGHT_PHASE_DURATION_MS];
  if (!duration) throw Error("Flight phase has no timing policy.");
  flight.progressPermille = Math.min(1000, Math.floor(flight.phaseTimeMs * 1000 / duration));
  vehicle.flight = flight;
  if (vehicle.trip.status === "commit-ready") return { fleet: validateSpacefleetSave(fleet), ready: flight.phaseTimeMs >= duration,
    phaseChanged: false, message: flight.phaseTimeMs >= duration ? "Destination checkpoint ready" : "Settling onto the approach vector…" };
  if (vehicle.phase === "ascent") {
    const altitude = 110 * flight.progressPermille / 1000;
    const lean = (flight.pitchPermille - 500) / 2000;
    vehicle.transform.position = [flight.originPosition[0] + Math.sin(flight.headingMilliRadians / 1000) * altitude * lean,
      flight.originPosition[1] + altitude, flight.originPosition[2] + Math.cos(flight.headingMilliRadians / 1000) * altitude * lean];
    vehicle.transform.rotation = [lean, flight.headingMilliRadians / 1000, 0];
    vehicle.velocity = [Math.sin(flight.headingMilliRadians / 1000) * lean, 4 + flight.throttlePermille / 250, Math.cos(flight.headingMilliRadians / 1000) * lean];
  }
  if (flight.phaseTimeMs < duration) return { fleet: validateSpacefleetSave(fleet), ready: false, phaseChanged: false,
    message: vehicle.phase === "countdown" ? `Launch in ${Math.ceil((duration - flight.phaseTimeMs) / 1000)} — abort remains available` : null };
  const trip = vehicle.trip;
  const result = applySpaceVehicleAction(fleet, { actorId: vehicle.ownerId, locationId: vehicle.locationId,
    expectedVehicleRevision: vehicle.revision, originStamp: trip.originStamp, destinationStamp: trip.destinationStamp },
  { vehicleId, actionId: `${trip.id}:tick-step-${trip.stepIndex}`, type: "step" });
  const next = structuredClone(result.fleet), moved = next.vehicles[vehicleId];
  moved.flight = { ...flight, phaseTimeMs: 0, progressPermille: 0 };
  return { fleet: validateSpacefleetSave(next), ready: false, phaseChanged: true,
    message: moved.trip!.status === "commit-ready" ? "Preparing destination checkpoint…" : `${moved.phase[0].toUpperCase()}${moved.phase.slice(1)}` };
}
