import { BlockId } from "./data";
import { stationAllows, STATION_CLAIM_RADIUS, type OrbitalStation, type StationActor } from "./orbital-station";
import { pressurePoint } from "./pressure-devices";
import type { PressureRuntime } from "./pressure-runtime";
import { machineCapacity, type MachineState } from "./wayworks";
import { machineKindForBlock } from "./wayworks-integration";
import { workshopAuthorized } from "./wayworks-stores";

type Diagnostics = ReturnType<PressureRuntime["diagnosticsFor"]>;
export type StationRoomReading = {
  id: string; status: string; volumeM3: number; pressureKPa: number; oxygenPercent: number; co2Ppm: number;
  temperatureC: number; breathable: boolean; blockers: readonly string[]; occupants: number;
  reserveSeconds: number | null; rates: Diagnostics["rates"];
};
export type StationTelemetry = {
  rooms: StationRoomReading[];
  buffers: { energyJ: number; capacityJ: number; oxygenMl: number; machines: number; noPower: number; disabled: number; habitatDrawW: number } | null;
};

/** Read-only loaded evidence, not an endurance guarantee or a copy of private
 * inventories. Physical presence, station grants and machine ownership all gate
 * aggregation. Missing/unloaded/stale hardware never contributes a reserve. */
export function measureStation(input: { station: OrbitalStation; actor: StationActor; machines: ReadonlyMap<string, MachineState>;
  pressure: Pick<PressureRuntime, "devices" | "diagnosticsFor">;
  blockAt(x: number, y: number, z: number): BlockId | undefined }): StationTelemetry | null {
  const { station, actor } = input;
  if (!stationAllows(station, actor, "life-support") || input.blockAt(...station.corePosition) !== BlockId.StationCore) return null;
  const buffers: NonNullable<StationTelemetry["buffers"]> = { energyJ: 0, capacityJ: 0, oxygenMl: 0, machines: 0, noPower: 0, disabled: 0, habitatDrawW: 0 };
  const canReadStores = stationAllows(station, actor, "container"), rooms = new Map<string, StationRoomReading>();
  for (const [key, machine] of input.machines) {
    const point = pressurePoint(key);
    if (!point || machine.locationId !== station.locationId || [point.x, point.y, point.z].some((v, i) => Math.abs(v - station.corePosition[i]) > STATION_CLAIM_RADIUS)
      || machineKindForBlock(input.blockAt(point.x, point.y, point.z)) !== machine.kind) continue;
    const serviceAuthorized = machine.ownerId === actor.actorId || machine.workshop.trusted.includes(actor.actorId);
    const storesAuthorized = canReadStores && workshopAuthorized(machine.workshop, machine.ownerId, actor.actorId);
    if (!serviceAuthorized && !storesAuthorized) continue;
    if (storesAuthorized) {
      buffers.machines++; buffers.energyJ += machine.energyJ; buffers.capacityJ += machineCapacity(machine.kind, machine.workshop);
      if (machine.status === "no-power") buffers.noPower++;
      if (!machine.enabled || machine.status === "control-off") buffers.disabled++;
      for (const store of [machine.workshop.chemical, machine.workshop.process?.chemicalAux, machine.workshop.process?.chemicalReagent]) {
        if (store?.resource === "oxygen") buffers.oxygenMl += store.amount;
      }
      buffers.oxygenMl += (machine.workshop.process?.airReserve?.oxygenMilliMoles ?? 0) * 24;
    }
    if (!serviceAuthorized || !input.pressure.devices.has(key)) continue;
    const reading = input.pressure.diagnosticsFor(key), zone = reading.zone;
    if (storesAuthorized) buffers.habitatDrawW += reading.power?.drawW ?? 0;
    if (!zone || rooms.has(zone.zoneId)) continue;
    rooms.set(zone.zoneId, { id: zone.zoneId, status: zone.status, volumeM3: zone.cellCount,
      pressureKPa: zone.pressureMilliKPa / 1000, oxygenPercent: (reading.oxygenPartsPerMillion ?? 0) / 10000,
      co2Ppm: reading.co2PartsPerMillion ?? 0, temperatureC: zone.temperatureMilliC / 1000,
      breathable: reading.breathable === true, blockers: reading.reasons ?? ["unverified"], occupants: reading.occupants,
      reserveSeconds: reading.reserveSeconds ?? null, rates: reading.rates ? { ...reading.rates, majorConsumers: reading.rates.majorConsumers.map(value => ({ ...value })) } : undefined });
  }
  return { rooms: [...rooms.values()].sort((a, b) => a.id.localeCompare(b.id)), buffers: canReadStores ? buffers : null };
}
