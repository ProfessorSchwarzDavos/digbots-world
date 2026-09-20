import { locationId, parseLocationId, type LocationId, type UniverseId } from "./location-address";
import { remapStationRegistry, validateStationRegistrySave } from "./orbital-station";
import { cloneUniverseJson, isUniverseRecord } from "./universe-json";
import type { SaveFields } from "./universe-save";

/** Explicit import identity remap, never recursive x/y/z or portable-item edits.
 * Coordinates, quantities, pressure heat and installation IDs remain unchanged.
 * Station action history follows its existing new-universe import policy. */
export function remapLocationMetadata(fields: SaveFields, source: LocationId, universe: UniverseId): SaveFields {
  const destination = locationId({ ...parseLocationId(source), universeId: universe });
  if (source === destination) throw Error("Location metadata import requires a new universe.");
  const imported = cloneUniverseJson(fields) as Record<string, unknown>;
  if (fields.orbitalStations !== undefined) imported.orbitalStations = remapStationRegistry(validateStationRegistrySave(fields.orbitalStations, source), universe);
  if (imported.wayworks !== undefined) {
    if (!isUniverseRecord(imported.wayworks)) throw Error("Invalid machines during location import.");
    for (const machine of Object.values(imported.wayworks)) {
      if (!isUniverseRecord(machine) || machine.locationId !== source) throw Error("Machine location mismatch during import.");
      machine.locationId = destination;
    }
  }
  if (imported.pressure !== undefined) {
    if (!isUniverseRecord(imported.pressure) || !Array.isArray(imported.pressure.zones) || !isUniverseRecord(imported.pressure.devices))
      throw Error("Invalid pressure during location import.");
    const prefix = `${source}:air:`, nextPrefix = `${destination}:air:`;
    const zoneId = (value: unknown): string => {
      if (typeof value !== "string" || !value.startsWith(prefix) || !/^[a-f0-9]{16}$/.test(value.slice(prefix.length)))
        throw Error("Pressure zone identity mismatch during import.");
      return nextPrefix + value.slice(prefix.length);
    };
    for (const zone of imported.pressure.zones) {
      if (!isUniverseRecord(zone) || zone.locationId !== source) throw Error("Pressure location mismatch during import.");
      zone.locationId = destination; zone.zoneId = zoneId(zone.zoneId);
    }
    for (const device of Object.values(imported.pressure.devices)) {
      if (!isUniverseRecord(device)) throw Error("Invalid pressure device during import.");
      if (device.airlock === undefined || device.airlock === null) continue;
      if (!isUniverseRecord(device.airlock)) throw Error("Invalid airlock during import.");
      if (device.airlock.links === null) continue;
      if (!isUniverseRecord(device.airlock.links)) throw Error("Invalid airlock links during import.");
      for (const field of ["chamberZoneId", "interiorZoneId", "exteriorZoneId"] as const) {
        const value = device.airlock.links[field];
        if (value === "exterior" || typeof value === "string" && /^-?\d+,-?\d+,-?\d+$/.test(value)) continue;
        device.airlock.links[field] = zoneId(value);
      }
    }
  }
  return imported;
}
