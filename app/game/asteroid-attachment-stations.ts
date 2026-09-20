import { asteroidAttachmentContains, asteroidAttachmentContainsCell, rebaseAsteroidCell,
  type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { projectAsteroidPressure } from "./asteroid-attachment-pressure";
import { applyStationAction, STATION_CLAIM_RADIUS, validateStationRegistrySave, type OrbitalStation,
  type StationAction, type StationActor, type StationPosition, type StationRegistrySave } from "./orbital-station";
import type { PressureSave } from "./pressure-runtime";
import { validateSpacefleetSave, type SpacefleetSave } from "./space-vehicle";
import { validateStationFleetCustody } from "./station-runtime";
import { cloneUniverseJson } from "./universe-json";

/** Deliberately NOT a StationRegistrySave: a view has no independently replayable
 * journal, owner location, revision counter or persistence authority. */
export type AsteroidStationView = Readonly<{
  frameId: string; canonicalLocationId: AsteroidAttachmentFrame["orbitId"];
  viewLocationId: AsteroidAttachmentFrame["localId"]; canonicalRevision: number;
  stations: Record<string, Omit<OrbitalStation, "locationId"> & { viewLocationId: AsteroidAttachmentFrame["localId"] }>;
}>;
export type AsteroidStationSources = Readonly<{
  registry: StationRegistrySave; pressure: PressureSave; fleet: SpacefleetSave;
  /** Explicit host-owned anchor identity lookup; no guessing from opaque IDs. */
  wayanchorCells: Readonly<Record<string, string>>;
}>;
function volumeSide(frame: AsteroidAttachmentFrame, minimum: StationPosition, maximum: StationPosition, label: string): boolean {
  const b = frame.orbitBounds, [x0, y0, z0] = minimum, [x1, y1, z1] = maximum;
  const intersects = x1 >= b.minX && x0 <= b.maxX && y1 >= b.minY && y0 <= b.maxY && z1 >= b.minZ && z0 <= b.maxZ;
  const contained = asteroidAttachmentContains(frame, { x: x0, y: y0, z: z0 }, "orbit")
    && asteroidAttachmentContains(frame, { x: x1, y: y1, z: z1 }, "orbit");
  if (intersects && !contained) throw Error(`${label} crosses the attached frame boundary.`);
  return contained;
}
function selection(frame: AsteroidAttachmentFrame, sources: AsteroidStationSources) {
  const registry = validateStationRegistrySave(sources.registry, frame.orbitId);
  validateStationFleetCustody(registry, validateSpacefleetSave(sources.fleet));
  const pressure = projectAsteroidPressure(frame, sources.pressure);
  const inside = (key: string) => asteroidAttachmentContainsCell(frame, key, "orbit");
  const zoneSides = new Map(sources.pressure.zones.map(zone => [zone.zoneId, inside(zone.cellKeys[0])]));
  const selectedZones = sources.pressure.zones.filter(zone => zoneSides.get(zone.zoneId));
  const zoneReferences = new Map(selectedZones.map((zone, index) => [zone.zoneId, pressure.zones[index].zoneId]));
  const selected = new Set<string>(), radius = STATION_CLAIM_RADIUS;
  for (const station of Object.values(registry.stations)) {
    const [x, y, z] = station.corePosition;
    const contained = volumeSide(frame, [x - radius, y - radius, z - radius], [x + radius, y + radius, z + radius], "Station claim");
    if (contained) selected.add(station.id);
    for (const dock of Object.values(station.docks)) {
      const key = dock.position.join(",");
      if (inside(key) !== contained) throw Error("Station collar crosses the attached frame boundary.");
      // The existing normal docking planner checks this same approach volume.
      // A spacecraft's wider physical footprint is still a fleet-view obligation.
      const [dx, dy, dz] = dock.position;
      if (volumeSide(frame, [dx - 1, dy + 1, dz - 1], [dx + 1, dy + 5, dz + 1], "Docking approach") !== contained)
        throw Error("Docking approach crosses the attached frame boundary.");
    }
    for (const id of station.pressureZoneIds) {
      if (!zoneSides.has(id) || zoneSides.get(id) !== contained) throw Error("Station pressure reference is unresolved or crosses the attached frame boundary.");
    }
    for (const lease of station.wayanchorLeases) {
      const key = sources.wayanchorCells[lease.anchorId];
      if (!key || inside(key) !== contained) throw Error("Station Wayanchor reference is unresolved or crosses the attached frame boundary.");
    }
  }
  return { registry, selected, zoneReferences };
}

/** Host-only transient station read model. Canonical access records and all old
 * journal bindings remain untouched. Do not publish unfiltered private stations
 * to guests or persist this projection as a second registry. */
export function projectAsteroidStations(frame: AsteroidAttachmentFrame, sources: AsteroidStationSources): AsteroidStationView {
  const { registry, selected, zoneReferences } = selection(frame, sources);
  const point = (value: StationPosition) => rebaseAsteroidCell(frame, value.join(","), "orbit").split(",").map(Number) as StationPosition;
  const stations: AsteroidStationView["stations"] = {};
  for (const id of selected) {
    const { locationId: canonicalLocation, ...station } = cloneUniverseJson(registry.stations[id]);
    if (canonicalLocation !== frame.orbitId) throw Error("Foreign station view owner.");
    stations[id] = { ...station, viewLocationId: frame.localId, corePosition: point(station.corePosition),
      docks: Object.fromEntries(Object.entries(station.docks).map(([key, dock]) => [key, { ...dock, position: point(dock.position) }])),
      pressureZoneIds: station.pressureZoneIds.map(zoneId => zoneReferences.get(zoneId)!),
      wayanchorLeases: station.wayanchorLeases.map(lease => ({ ...lease, locationId: frame.localId })),
    };
  }
  return { frameId: frame.frameId, canonicalLocationId: frame.orbitId, viewLocationId: frame.localId,
    canonicalRevision: registry.revision, stations };
}

export type AsteroidStationMetadataAction = Extract<StationAction, { type: "rename" | "access" | "habitat" }>;
/** Pure proposal through the ORIGINAL canonical permission/replay authority.
 * The authenticated actor and expected revision come from the host, not a view.
 * Placement/docking require their physical/fleet atomic adapters and are refused
 * here. A durable transaction must retain this prepared canonical result/intent;
 * recomputing it after topology changes is not an uncertain-ack retry protocol.
 */
export function applyAsteroidStationMetadata(frame: AsteroidAttachmentFrame, sources: AsteroidStationSources,
  actor: StationActor, expectedRevision: number, localAction: AsteroidStationMetadataAction) {
  if (!["rename", "access", "habitat"].includes(localAction.type)) throw Error("Station action requires a physical/fleet attachment adapter.");
  const { registry, selected, zoneReferences } = selection(frame, sources);
  if (!selected.has(localAction.stationId)) throw Error("Station is outside the attached frame.");
  const action = cloneUniverseJson(localAction);
  if (action.type === "habitat") {
    const inverse = new Map([...zoneReferences].map(([canonical, local]) => [local, canonical]));
    action.pressureZoneIds = action.pressureZoneIds.map(id => {
      const canonical = inverse.get(id);
      if (!canonical) throw Error("Station pressure reference is outside the attached frame.");
      return canonical;
    });
    action.wayanchorLeases = action.wayanchorLeases.map(lease => {
      const key = sources.wayanchorCells[lease.anchorId];
      if (lease.locationId !== frame.localId || !key || !asteroidAttachmentContainsCell(frame, key, "orbit"))
        throw Error("Station Wayanchor reference is outside the attached frame.");
      return { ...lease, locationId: frame.orbitId };
    });
  }
  const result = applyStationAction(registry, { actor, locationId: frame.orbitId, expectedRevision }, action);
  // Also validate changed cross-field references and the retained outside fleet.
  selection(frame, { ...sources, registry: result.registry });
  return result;
}
