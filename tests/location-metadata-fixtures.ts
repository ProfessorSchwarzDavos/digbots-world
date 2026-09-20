import { createAirZoneState, discoverAirZone } from "../app/game/airzone";
import { BlockId } from "../app/game/data";
import { parseLocationId, type LocationId } from "../app/game/location-address";
import type { OrbitBand } from "../app/game/celestial-terrain";
import { applyStationAction, createStationRegistry } from "../app/game/orbital-station";
import { createAirlockState } from "../app/game/pressure-airlock";
import { createPressureDevice } from "../app/game/pressure-devices";
import type { PressureSave } from "../app/game/pressure-runtime";
import { createMachine } from "../app/game/wayworks";

/** Finite synthetic metadata only; not evidence of normal acquisition or sealing. */
export function locationMetadataFixture(location: LocationId) {
  const point = { x: 12, y: 32, z: 0 }, key = "12,32,0";
  const zone = createAirZoneState(discoverAirZone({
    epochs: { locationId: location, generation: 1, topologyRevision: 3, requestId: 2 },
    seed: point, cells: [{ ...point, passable: true, sealMask: 63, controllerIds: [key] }],
  }), { oxygenMilliMoles: 8700, inertMilliMoles: 32800, co2MilliMoles: 71 }, 19876);
  const device = createPressureDevice("p-17");
  device.links = { room: key, reserve: "13,32,0", exterior: "exterior" };
  device.bindings = { "13,32,0": "p-18" };
  device.airlock = createAirlockState({ controllerKey: key, innerDoorKey: "14,32,0", outerDoorKey: "15,32,0",
    recoveryPumpKey: "16,32,0", reserveKey: "13,32,0", chamberZoneId: key,
    interiorZoneId: zone.zoneId, exteriorZoneId: "exterior" });
  device.airlock.phaseElapsedMs = 1234; device.airlock.cycleElapsedMs = 5123; device.airlock.sequence = 7;
  const unlinked = createPressureDevice("p-18");
  unlinked.airlock = { ...createAirlockState(device.airlock.links!), links: null };
  const flux = { oxygenMilliMoles: 47, inertMilliMoles: 151, co2MilliMoles: 3, thermalEnergyMilliJ: 981234 };
  const pressure: PressureSave = { schema: 1, nextInstallation: 20, zones: [zone],
    devices: { [key]: device, "13,32,0": unlinked, "16,32,0": createPressureDevice("p-19") },
    boundary: { admitted: { ...flux }, released: { ...flux }, topologyLost: { ...flux } } };
  const actor = { actorId: "local", factionIds: [], guildIds: [] };
  let stations = applyStationAction(createStationRegistry(location), { actor, locationId: location, expectedRevision: 0,
    placements: [
      { receiptId: "core", actorId: "local", locationId: location, expectedRevision: 0, kind: "core", position: [12, 32, 0] },
      { receiptId: "dock", actorId: "local", locationId: location, expectedRevision: 0, kind: "docking-collar", position: [14, 32, 0] },
    ] }, { type: "create", stationId: "station-one", actionId: "create-station", name: "Finite fixture", icon: "station", band: parseLocationId(location).instanceId as OrbitBand,
    coreReceiptId: "core", dockReceiptId: "dock", dockId: "dock" }).registry;
  stations = applyStationAction(stations, { actor, locationId: location, expectedRevision: stations.revision },
    { type: "habitat", actionId: "bind-room", stationId: "station-one", pressureZoneIds: [zone.zoneId],
      wayanchorLeases: [{ anchorId: "anchor-one", leaseId: "lease-one", locationId: location }] }).registry;
  const machine = createMachine("station-observatory", location, "local");
  machine.energyJ = 3123; machine.workshop.heatJ = 137; machine.revision = 4;
  return { wayworks: { "8,33,0": machine }, pressure, orbitalStations: stations,
    chests: { "12,31,0": [{ item: BlockId.Stone, count: 17, metadata: { locationId: location, x: 732, note: "opaque portable data" } }] } };
}
