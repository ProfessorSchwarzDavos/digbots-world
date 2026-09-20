import { BLOCKS, BlockId } from "./data";
import { applySpaceVehicleAction, type SpacefleetSave, type VehicleResource, type VehicleVector } from "./space-vehicle";
import { machineCapacity, type MachineState } from "./wayworks";
import { workshopFluidCapacity, workshopGasCapacity } from "./wayworks-stores";
import { type LocationId } from "./location-address";

export type LaunchPadCheck = { valid: boolean; center: VehicleVector; facing: number; blockers: string[]; clearance: number };
export function inspectLaunchPad(blockAt: (x: number, y: number, z: number) => number | undefined, center: VehicleVector, facing: number,
  occupants: readonly VehicleVector[] = []): LaunchPadCheck {
  const [x, y, z] = center, blockers: string[] = [];
  if (!center.every(Number.isSafeInteger) || !Number.isInteger(facing) || facing < 0 || facing > 3) return { valid: false, center, facing, blockers: ["Invalid pad coordinates or orientation."], clearance: 0 };
  let missing = 0, unsupported = 0, obstruction = 0;
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    if (blockAt(x + dx, y, z + dz) !== BlockId.LaunchPad) missing++;
    const below = blockAt(x + dx, y - 1, z + dz);
    if (below === undefined || !BLOCKS[below as BlockId]?.solid) unsupported++;
    for (let dy = 1; dy <= 12; dy++) if (blockAt(x + dx, y + dy, z + dz) !== BlockId.Air) obstruction++;
  }
  if (missing) blockers.push(`Complete the flat 3 × 3 Launch Pad: ${missing} tiles missing.`);
  if (unsupported) blockers.push(`Build solid foundations under ${unsupported} pad tiles.`);
  if (obstruction) blockers.push(`Clear the 3 × 3 ascent column for 12 blocks (${obstruction} obstructed cells).`);
  const direction = [[0, -1], [1, 0], [0, 1], [-1, 0]][facing];
  if (occupants.some(([px, py, pz]) => Math.abs(py - y) < 5 && Math.abs((px - x) * direction[1] - (pz - z) * direction[0]) < 2
    && (px - x) * direction[0] + (pz - z) * direction[1] > -5 && (px - x) * direction[0] + (pz - z) * direction[1] < 1)) {
    blockers.push("Move unboarded crew out of the marked exhaust exclusion zone.");
  }
  return { valid: blockers.length === 0, center: [...center], facing, blockers, clearance: 12 };
}

/** Host adapter: gantry storage and vehicle store change together or not at all.
 * Caller commits this pair in one WorldSave, never independently. */
export function supplyVehicleFromMachine(input: {
  fleet: SpacefleetSave; vehicleId: string; expectedVehicleRevision: number; machine: MachineState;
  machineKey: string; expectedMachineRevision: number; actorId: string; actorLocationId: LocationId;
  resource: VehicleResource; maximum: number; actionId: string;
}): { fleet: SpacefleetSave; machine: MachineState; amount: number } {
  const { machine, fleet } = input, vehicle = fleet.vehicles[input.vehicleId];
  if (!vehicle || !["fuel-gantry", "orbital-dock"].includes(machine.kind) || machine.revision !== input.expectedMachineRevision
    || machine.locationId !== input.actorLocationId || vehicle.locationId !== input.actorLocationId || !machine.enabled
    || (machine.ownerId !== input.actorId && machine.workshop.security !== "public" && !machine.workshop.trusted.includes(input.actorId))) throw Error("Gantry unavailable, changed or not permitted.");
  const point = input.machineKey.split(",").map(Number);
  if (point.length !== 3 || !point.every(Number.isSafeInteger) || Math.hypot(...point.map((v, i) => v - vehicle.transform.position[i])) > 7) throw Error("Dock the ship within seven blocks of this gantry.");
  const resource = input.resource, store = resource === "fuelMl" ? machine.workshop.fluid : machine.workshop.chemical;
  const expected = resource === "fuelMl" ? "refined-rocket-fuel" : "oxygen";
  const available = resource === "batteryJoules" ? machine.energyJ : store?.resource === expected ? store.amount : 0;
  if (!available) throw Error(resource === "batteryJoules" ? "Charge the gantry from a power network first."
    : `Load ${expected.replaceAll("-", " ")} into the gantry's ${resource === "fuelMl" ? "liquid" : "gas"} reservoir.`);
  const result = applySpaceVehicleAction(fleet, { actorId: input.actorId, locationId: input.actorLocationId,
    expectedVehicleRevision: input.expectedVehicleRevision, source: { id: input.machineKey, revision: machine.revision, locationId: input.actorLocationId,
      resources: { fuelMl: resource === "fuelMl" ? available : 0, oxidizerMl: resource === "oxidizerMl" ? available : 0,
        oxygenMl: resource === "oxygenMl" ? available : 0, batteryJoules: resource === "batteryJoules" ? available : 0 }, cargo: [], cargoOwnership: [] } },
  { type: "supply", vehicleId: input.vehicleId, actionId: input.actionId, sourceId: input.machineKey, sourceRevision: machine.revision, resource, amount: input.maximum });
  const debit = result.externalWrites[0];
  if (debit?.kind !== "resource-debit" || debit.sourceId !== input.machineKey || debit.resource !== resource) throw Error("Invalid gantry debit quote.");
  const next = structuredClone(machine);
  if (resource === "batteryJoules") next.energyJ -= debit.amount;
  else {
    const key = resource === "fuelMl" ? "fluid" : "chemical";
    const remaining = next.workshop[key]!.amount - debit.amount;
    next.workshop[key] = remaining > 0 ? { resource: expected, amount: remaining } : null;
  }
  next.revision++; next.status = "transferring";
  if (next.energyJ < 0 || next.energyJ > machineCapacity(next.kind, next.workshop)
    || (next.workshop.fluid?.amount ?? 0) > workshopFluidCapacity(next.kind, next.workshop)
    || (next.workshop.chemical?.amount ?? 0) > workshopGasCapacity(next.kind, next.workshop)) throw Error("Gantry reservoir integrity failed.");
  return { fleet: result.fleet, machine: next, amount: debit.amount };
}
