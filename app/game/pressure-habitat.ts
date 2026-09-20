import { airThermalEnergy, createAirZoneState, EMPTY_AIR_GAS, equalizeAirZones, stepAirZone, totalAirGas,
  transferAirGas, type AirGas, type AirTopologyResult, type AirZoneState } from "./airzone";
import { chemicalStore, setChemicalStore, type ChemicalReservoir } from "./pressure-chemistry";
import { workshopGasCapacity, workshopHeatCapacity, workshopRunning, workshopStoredTotal } from "./wayworks-stores";
import type { MachineState } from "./wayworks";
import type { BodyEnvironment } from "./celestial-environment";
import type { PressureDevice, PressureMixture } from "./pressure-devices";

export const HABITAT_GAS_SPECIES = { oxygen: "oxygenMilliMoles", inert: "inertMilliMoles", "carbon-dioxide": "co2MilliMoles" } as const;
const slots: readonly ChemicalReservoir[] = ["chemical", "chemicalAux", "chemicalReagent"];
const copy = (machine: MachineState): MachineState => ({ ...machine, workshop: { ...machine.workshop,
  process: machine.workshop.process ? { ...machine.workshop.process, airReserve: machine.workshop.process.airReserve ? { ...machine.workshop.process.airReserve } : null } : undefined } });
function vessel(machine: MachineState, gas: AirGas, thermalEnergyMilliJ: number): AirZoneState {
  const state = createAirZoneState({ epochs: { locationId: machine.locationId, generation: 0, topologyRevision: 0, requestId: 0 },
    zoneId: `vessel:${machine.ownerId}:${machine.kind}:${machine.revision}`, membershipDigest: "vessel", cellKeys: ["0,0,0"], cellCount: 1,
    bounds: null, controllerIds: [], ventIds: [], occupants: [], leaks: [], unknownBoundaries: [], capacity: 1, status: "sealed", truncated: false } as AirTopologyResult, gas);
  // This ephemeral transaction view is never saved or exposed as a room.
  return { ...state, thermalEnergyMilliJ, resourceRevision: machine.revision };
}
const validZone = (machine: MachineState, zone: AirZoneState) => machine.enabled && workshopRunning(machine.workshop)
  && machine.revision < Number.MAX_SAFE_INTEGER && machine.locationId === zone.locationId
  && ["sealed", "depressurized", "leaking"].includes(zone.status);

/** The planet is an explicit external reservoir, not an unrecorded room refill.
 * Return actual species/heat admitted so the host can persist its boundary ledger. */
export function admitAmbientAir(zone: AirZoneState, environment: BodyEnvironment, maximumMmol: number) {
  const admitted = { ...EMPTY_AIR_GAS, thermalEnergyMilliJ: 0 };
  const fail = { zone, admitted, movedMmol: 0 };
  const targetPa = Math.round(environment.pressureKPa * 1000);
  if (!Number.isSafeInteger(maximumMmol) || maximumMmol <= 0 || maximumMmol > 1_000_000 || !Number.isSafeInteger(targetPa)
    || targetPa <= zone.pressureMilliKPa || targetPa > 10_000_000 || !["sealed", "depressurized", "leaking"].includes(zone.status)) return fail;
  const temperature = Math.round((environment.temperatureC[0] + environment.temperatureC[1]) * 500);
  if (!Number.isSafeInteger(temperature) || temperature < -273150 || temperature > 2000000) return fail;
  const oxygen = Math.floor(maximumMmol * environment.oxygenFraction), carbon = Math.floor(maximumMmol * environment.co2Fraction);
  if (!Number.isSafeInteger(oxygen) || !Number.isSafeInteger(carbon) || oxygen < 0 || carbon < 0 || oxygen + carbon > maximumMmol) return fail;
  const gas = { oxygenMilliMoles: oxygen, co2MilliMoles: carbon, inertMilliMoles: maximumMmol - oxygen - carbon };
  const source = stepAirZone({ ...zone, ...gas, zoneId: `ambient:${zone.zoneId}`, thermalEnergyMilliJ: airThermalEnergy(maximumMmol, temperature) }, {}).state;
  const moved = transferAirGas(source, zone, maximumMmol, targetPa);
  if (!moved.transferredMilliMoles) return fail;
  return { zone: moved.target, movedMmol: moved.transferredMilliMoles, admitted: {
    oxygenMilliMoles: moved.target.oxygenMilliMoles - zone.oxygenMilliMoles,
    inertMilliMoles: moved.target.inertMilliMoles - zone.inertMilliMoles,
    co2MilliMoles: moved.target.co2MilliMoles - zone.co2MilliMoles,
    thermalEnergyMilliJ: moved.target.thermalEnergyMilliJ - zone.thermalEnergyMilliJ } };
}

/** Finite pure-gas feed. Electrical heating pays the exact reference-temperature
 * energy added to the room; the sub-joule round-up is explicitly dissipated. */
export function supplyHabitat(machine: MachineState, zone: AirZoneState, maximumMmol = 2000, targetPressurePa = 100000, mixture?: PressureMixture) {
  const fail = { machine, zone, movedMmol: 0, consumedJ: 0, dissipatedMilliJ: 0 };
  if (!validZone(machine, zone) || !machine.workshop.process || !Number.isSafeInteger(maximumMmol) || maximumMmol < 0) return fail;
  const next = copy(machine); let current = zone, movedMmol = 0, consumedJ = 0, dissipatedMilliJ = 0;
  const filter = next.workshop.process!.gasFilter;
  for (const slot of slots) {
    const store = chemicalStore(next.workshop, slot);
    if (!store || !Object.hasOwn(HABITAT_GAS_SPECIES, store.resource) || filter && store.resource !== filter) continue;
    const species = HABITAT_GAS_SPECIES[store.resource as keyof typeof HABITAT_GAS_SPECIES];
    const currentPartialPa = totalAirGas(current) ? Number(BigInt(current.pressureMilliKPa) * BigInt(current[species]) / BigInt(totalAirGas(current))) : 0;
    const fraction = mixture ? store.resource === "oxygen" ? mixture.oxygenPermille : store.resource === "carbon-dioxide" ? mixture.co2Permille : 1000 - mixture.oxygenPermille - mixture.co2Permille : null;
    const desiredPartialPa = fraction !== null ? Math.floor(targetPressurePa * fraction / 1000) : filter ? targetPressurePa : store.resource === "oxygen" ? Math.floor(targetPressurePa * .21)
      : store.resource === "inert" ? Math.floor(targetPressurePa * .79) : 0;
    const mixtureRoom = Number(BigInt(Math.max(0, desiredPartialPa - currentPartialPa)) * BigInt(current.cellCount) * BigInt(1_000_000_000)
      / (BigInt(8314) * BigInt(293150)));
    const available = Math.min(maximumMmol - movedMmol, mixtureRoom, Math.floor(store.amount / 24), Math.floor(next.energyJ * 1000 / airThermalEnergy(1, 20000)));
    if (available <= 0) continue;
    const gas = { ...EMPTY_AIR_GAS, [species]: available };
    const source = vessel(next, gas, airThermalEnergy(available, 20000));
    const transfer = transferAirGas(source, current, available, targetPressurePa);
    const count = transfer.transferredMilliMoles; if (!count) continue;
    const heat = current.thermalEnergyMilliJ <= transfer.target.thermalEnergyMilliJ ? transfer.target.thermalEnergyMilliJ - current.thermalEnergyMilliJ : 0;
    const cost = Math.ceil(heat / 1000); if (cost > next.energyJ) continue;
    const left = store.amount - count * 24;
    setChemicalStore(next.workshop, slot, left ? { ...store, amount: left } : null);
    next.energyJ -= cost; consumedJ += cost; dissipatedMilliJ += cost * 1000 - heat; movedMmol += count; current = transfer.target;
  }
  if (movedMmol) { next.revision++; next.status = "working"; }
  return { machine: movedMmol ? next : machine, zone: current, movedMmol, consumedJ, dissipatedMilliJ };
}

/** Mixed recovery is its own physical vessel, sharing capacity with pure-gas
 * reservoirs. Both gas species and thermal energy survive capture/release. */
export function recoverHabitat(machine: MachineState, zone: AirZoneState, maximumMmol: number, direction: "capture" | "release", targetPressurePa = 100000, filter: string | null = null) {
  const fail = { machine, zone, movedMmol: 0, consumedJ: 0 };
  if (!validZone(machine, zone) || !machine.workshop.process || !Number.isSafeInteger(maximumMmol) || maximumMmol < 0) return fail;
  const reserve = machine.workshop.process.airReserve ?? { ...EMPTY_AIR_GAS, thermalEnergyMilliJ: 0 };
  const room = Math.floor((workshopGasCapacity(machine.kind, machine.workshop) - workshopStoredTotal(machine.workshop, "chemical")) / 24);
  const maximum = Math.min(maximumMmol, machine.energyJ * 10, direction === "capture" ? room : totalAirGas(reserve));
  if (maximum <= 0) return fail;
  const tank = vessel(machine, reserve, reserve.thermalEnergyMilliJ);
  const source = direction === "capture" ? zone : tank, target = direction === "capture" ? tank : zone;
  if (filter && !Object.hasOwn(HABITAT_GAS_SPECIES, filter)) return fail;
  const species = filter ? HABITAT_GAS_SPECIES[filter as keyof typeof HABITAT_GAS_SPECIES] : null;
  // A filtered transaction view owns no persistent resource. Its transferred
  // species and proportional heat are subtracted from the original vessel below.
  const selected = species ? stepAirZone({ ...source, ...EMPTY_AIR_GAS, [species]: source[species],
    thermalEnergyMilliJ: totalAirGas(source) ? Number(BigInt(source.thermalEnergyMilliJ) * BigInt(source[species]) / BigInt(totalAirGas(source))) : 0 }, {}).state : source;
  const transfer = transferAirGas(selected, target, maximum, direction === "capture" ? 10_000_000 : targetPressurePa);
  if (!transfer.transferredMilliMoles) return fail;
  const remaining = species ? stepAirZone({ ...source, [species]: source[species] - transfer.transferredMilliMoles,
    thermalEnergyMilliJ: source.thermalEnergyMilliJ - (transfer.target.thermalEnergyMilliJ - target.thermalEnergyMilliJ) }, {}).state : transfer.source;
  const next = copy(machine), after = direction === "capture" ? transfer.target : remaining;
  next.workshop.process!.airReserve = totalAirGas(after) ? { oxygenMilliMoles: after.oxygenMilliMoles, inertMilliMoles: after.inertMilliMoles,
    co2MilliMoles: after.co2MilliMoles, thermalEnergyMilliJ: after.thermalEnergyMilliJ } : null;
  const consumedJ = Math.ceil(transfer.transferredMilliMoles / 10);
  next.energyJ -= consumedJ; next.revision++; next.status = "working";
  return { machine: next, zone: direction === "capture" ? remaining : transfer.target, movedMmol: transfer.transferredMilliMoles, consumedJ };
}

/** Balanced mode withdraws excess into the same finite recovery reserve, then
 * replenishes deficient partial pressures from the existing pure-gas slots.
 * Stored gas is retained for explicit release; a full reserve stops extraction. */
export function operateAtmosphereVent(machine: MachineState, zone: AirZoneState, device: PressureDevice, maximumMmol: number) {
  const fail = { machine, zone, movedMmol: 0, consumedJ: 0 };
  const filter = machine.workshop.process?.gasFilter ?? null;
  if (device.mode === "off") return fail;
  if (device.mode === "capture" || device.mode === "release") return recoverHabitat(machine, zone, maximumMmol, device.mode, device.targetPressurePa, filter);
  if (device.mode === "supply") return supplyHabitat(machine, zone, maximumMmol, device.targetPressurePa, device.mixture);
  let current = fail;
  if (zone.pressureMilliKPa > device.targetPressurePa) {
    const excess = Number(BigInt(totalAirGas(zone)) * BigInt(zone.pressureMilliKPa - device.targetPressurePa) / BigInt(zone.pressureMilliKPa));
    current = recoverHabitat(machine, zone, Math.min(maximumMmol, excess), "capture", device.targetPressurePa, filter);
  } else {
    for (const [resource, species] of Object.entries(HABITAT_GAS_SPECIES)) {
      if (filter && filter !== resource) continue;
      const fraction = resource === "oxygen" ? device.mixture.oxygenPermille : resource === "carbon-dioxide" ? device.mixture.co2Permille : 1000 - device.mixture.oxygenPermille - device.mixture.co2Permille;
      const desired = zone.pressureMilliKPa ? Number(BigInt(totalAirGas(zone)) * BigInt(device.targetPressurePa) * BigInt(fraction) / (BigInt(zone.pressureMilliKPa) * BigInt(1000))) : 0;
      const excess = zone[species] - desired;
      if (excess > 0) { current = recoverHabitat(machine, zone, Math.min(maximumMmol, excess), "capture", device.targetPressurePa, resource); break; }
    }
  }
  // One direction per tick makes the finite flow budget and diagnostics exact.
  if (current.movedMmol) return current;
  const supplied = supplyHabitat(current.machine, current.zone, maximumMmol, device.targetPressurePa, device.mixture);
  return { machine: supplied.machine, zone: supplied.zone, movedMmol: current.movedMmol + supplied.movedMmol, consumedJ: current.consumedJ + supplied.consumedJ };
}

/** Passive valve: never crosses equilibrium, raises the receiving room above
 * its configured cap, or transports against the selected physical direction. */
export function equalizeHabitat(front: AirZoneState, back: AirZoneState, maximumMmol: number, targetPressurePa: number, direction: PressureDevice["valveDirection"]) {
  const fail = { a: front, b: back, transferredMilliMoles: 0 };
  if (front.zoneId === back.zoneId || front.locationId !== back.locationId || ![front, back].every(zone => ["sealed", "depressurized"].includes(zone.status))) return fail;
  const forward = front.pressureMilliKPa > back.pressureMilliKPa;
  if (direction === "front-to-back" && !forward || direction === "back-to-front" && forward) return fail;
  const passive = equalizeAirZones(front, back, maximumMmol);
  const moved = transferAirGas(forward ? front : back, forward ? back : front, passive.transferredMilliMoles, targetPressurePa);
  return { a: forward ? moved.source : moved.target, b: forward ? moved.target : moved.source, transferredMilliMoles: moved.transferredMilliMoles };
}

/** A scrubber draws CO2 into its recipe input. No free deletion: full gas or heat
 * buffers stop intake; chemistry later consumes the gas and finite cartridge. */
export function drawHabitatCarbon(machine: MachineState, zone: AirZoneState, maximumMmol = 1000) {
  const fail = { machine, zone, movedMmol: 0, dissipatedMilliJ: 0 };
  if (!validZone(machine, zone) || machine.kind !== "carbon-scrubber" || !Number.isSafeInteger(maximumMmol) || maximumMmol < 0) return fail;
  const stored = machine.workshop.chemical;
  if (stored && stored.resource !== "carbon-dioxide") return fail;
  const room = Math.floor((workshopGasCapacity(machine.kind, machine.workshop) - workshopStoredTotal(machine.workshop, "chemical")) / 24);
  const heatRoom = (workshopHeatCapacity(machine.workshop) - machine.workshop.heatJ) * 1000;
  const heatPerMmol = totalAirGas(zone) ? zone.thermalEnergyMilliJ / totalAirGas(zone) : 0;
  const count = Math.min(maximumMmol, room, zone.co2MilliMoles, heatPerMmol ? Math.floor(heatRoom / heatPerMmol) : maximumMmol);
  if (count <= 0 || machine.energyJ < Math.ceil(count / 10)) return fail;
  const result = stepAirZone(zone, { scrubCo2MilliMoles: count });
  const next = copy(machine); next.workshop.chemical = { resource: "carbon-dioxide", amount: (stored?.amount ?? 0) + count * 24 };
  const heatJ = Math.floor(result.scrubbed.thermalEnergyMilliJ / 1000);
  next.workshop.heatJ += heatJ; next.energyJ -= Math.ceil(count / 10); next.revision++; next.status = "working";
  return { machine: next, zone: result.state, movedMmol: count, dissipatedMilliJ: result.scrubbed.thermalEnergyMilliJ - heatJ * 1000 };
}

/** Regulator trades finite electricity/coolant and local heat with room gas. */
export function regulateHabitat(machine: MachineState, zone: AirZoneState, targetMilliC = 20000) {
  const fail = { machine, zone, heatMilliJ: 0 };
  if (!validZone(machine, zone) || machine.kind !== "thermal-regulator" || !totalAirGas(zone) || !Number.isSafeInteger(targetMilliC) || targetMilliC < 0 || targetMilliC > 45000) return fail;
  const desired = airThermalEnergy(totalAirGas(zone), targetMilliC) - zone.thermalEnergyMilliJ;
  const next = copy(machine);
  const heating = desired > 0;
  const coolant = machine.workshop.fluid;
  if (!heating && (coolant?.resource !== "coolant" || coolant.amount < 1)) return fail;
  const maxJ = Math.min(1600, machine.energyJ, heating ? machine.energyJ : workshopHeatCapacity(machine.workshop) - machine.workshop.heatJ);
  const heatMilliJ = Math.sign(desired) * Math.min(Math.abs(desired), maxJ * 1000);
  if (!heatMilliJ) return fail;
  const cost = Math.ceil(Math.abs(heatMilliJ) / 1000); next.energyJ -= cost;
  if (!heating) {
    next.workshop.heatJ += Math.floor(-heatMilliJ / 1000);
    const used = Math.ceil(cost / 1000);
    if (coolant!.amount < used) return fail;
    next.workshop.fluid = coolant!.amount === used ? null : { ...coolant!, amount: coolant!.amount - used };
  }
  next.revision++; next.status = "working";
  return { machine: next, zone: stepAirZone(zone, { heatMilliJ }).state, heatMilliJ };
}

export function mixtureForFraction(totalMmol: number, oxygenPermille = 210): AirGas {
  if (!Number.isSafeInteger(totalMmol) || totalMmol < 0 || totalMmol > 1_000_000_000_000 || !Number.isInteger(oxygenPermille) || oxygenPermille < 0 || oxygenPermille > 1000) throw new RangeError("invalid-mixture");
  const oxygenMilliMoles = Number(BigInt(totalMmol) * BigInt(oxygenPermille) / BigInt(1000));
  return { oxygenMilliMoles, inertMilliMoles: totalMmol - oxygenMilliMoles, co2MilliMoles: 0 };
}
