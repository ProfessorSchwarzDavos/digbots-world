import type { CelestialBodyKind, CelestialCatalogSnapshot } from "./celestial-catalog";
import { celestialPositions, type CelestialSkySample } from "./celestial-ephemeris";
import { parseLocationId, type LocationId, type LocationKind } from "./location-address";

export type CelestialChartMode = "system" | "orbit";
/** Caller supplies only station records that the observer is allowed to see. */
export type CelestialChartStationPoint = Readonly<{
  id: string; name: string; locationId: LocationId; position: readonly [number, number, number];
}>;
export type CelestialChartInput = Readonly<{
  catalog: CelestialCatalogSnapshot;
  knownBodyIds: readonly string[];
  currentLocationId: LocationId;
  universeSeconds?: number;
  /** Must describe this observer; phase is used only when its clock matches. */
  skySample?: CelestialSkySample;
  stationPoints?: readonly CelestialChartStationPoint[];
}>;
export type CelestialChartBody = Readonly<{
  id: string; name: string; kind: CelestialBodyKind; parentName: string | null;
  current: boolean; x: number; y: number; distanceAu: number;
  illuminatedFraction: number | null;
}>;
export type CelestialChartProjection = Readonly<{
  mode: CelestialChartMode; currentBodyId: string; currentBodyName: string | null;
  locationKind: LocationKind; instanceId: string; focusName: string | null;
  universeSeconds: number; clockIsEpoch: boolean;
  bodies: readonly CelestialChartBody[];
  stations: readonly (CelestialChartStationPoint & { x: number; y: number })[];
}>;

/**
 * Read-only knowledge boundary. The frozen catalog is a calculation source, not
 * discovery authority: neither unknown entries nor their names/counts escape.
 * Body coordinates are a compressed X/Z ephemeris projection in a 400-square
 * view; station coordinates are a separate linear local-block frame.
 */
export function projectCelestialChart(input: CelestialChartInput, mode: CelestialChartMode = "system"): CelestialChartProjection {
  const address = parseLocationId(input.currentLocationId);
  if (address.systemId !== input.catalog.systemId) throw new Error("Chart catalog does not match the current system.");
  const current = input.catalog.bodies.find(body => body.id === address.bodyId);
  if (!current) throw new Error("Chart catalog does not contain the current body.");
  const seconds = input.universeSeconds ?? input.skySample?.universeSeconds ?? 0;
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error("Invalid chart universe clock.");
  const known = new Set(input.knownBodyIds);
  const visible = input.catalog.bodies.filter(body => known.has(body.id));
  const byId = new Map(visible.map(body => [body.id as string, body]));
  // A moon's known primary provides useful sibling context. Unknown primaries
  // never acquire a label or marker merely because a child has been discovered.
  const primary = current.kind === "moon" && current.parentId && byId.has(current.parentId)
    ? byId.get(current.parentId)! : current;
  const focus = mode === "orbit" ? primary : visible.find(body => body.kind === "star");
  const selected = mode === "system" ? visible : visible.filter(body => body.id === primary.id || body.parentId === primary.id);
  const positions = celestialPositions(input.catalog, seconds);
  const origin = focus ? positions.get(focus.id)! : [0, 0, 0];
  const rows = selected.map(body => {
    const position = positions.get(body.id)!;
    return { body, dx: position[0] - origin[0], dy: position[2] - origin[2], distanceAu: Math.hypot(...position.map((n, i) => n - origin[i])) };
  });
  const maxRadius = Math.max(0, ...rows.map(row => Math.hypot(row.dx, row.dy)));
  const phaseMatches = input.skySample?.universeSeconds === seconds;
  const bodies = rows.map(({ body, dx, dy, distanceAu }) => {
    const radius = Math.hypot(dx, dy);
    const plotRadius = maxRadius > 0 ? 156 * Math.log1p(9 * radius / maxRadius) / Math.log(10) : 0;
    const phase = phaseMatches ? input.skySample?.bodies.find(sample => sample.id === body.id)?.illuminatedFraction : undefined;
    return Object.freeze({ id: body.id, name: body.name, kind: body.kind,
      parentName: body.parentId ? byId.get(body.parentId)?.name ?? null : null,
      current: body.id === address.bodyId, x: 200 + (radius ? dx / radius * plotRadius : 0),
      y: 200 - (radius ? dy / radius * plotRadius : 0), distanceAu,
      illuminatedFraction: typeof phase === "number" && Number.isFinite(phase) && phase >= 0 && phase <= 1 ? phase : null,
    });
  });
  const seen = new Set<string>();
  const stations = (input.stationPoints ?? []).filter(station => {
    if (station.locationId !== input.currentLocationId || !known.has(address.bodyId)
      || !["orbit", "station"].includes(address.kind) || !station.id.trim() || !station.name.trim()
      || station.position.length !== 3 || !station.position.every(Number.isFinite) || seen.has(station.id)) return false;
    seen.add(station.id); return true;
  });
  const stationExtent = Math.max(1, ...stations.flatMap(station => [Math.abs(station.position[0]), Math.abs(station.position[2])]));
  return Object.freeze({ mode, currentBodyId: address.bodyId, currentBodyName: byId.get(address.bodyId)?.name ?? null,
    locationKind: address.kind, instanceId: address.instanceId,
    focusName: focus && byId.has(focus.id) ? focus.name : null, universeSeconds: seconds,
    clockIsEpoch: input.universeSeconds === undefined && input.skySample === undefined,
    bodies: Object.freeze(bodies), stations: Object.freeze(stations.map(station => Object.freeze({
      id: station.id, name: station.name, locationId: station.locationId,
      position: Object.freeze([...station.position]) as readonly [number, number, number],
      x: 200 + station.position[0] / stationExtent * 156, y: 200 - station.position[2] / stationExtent * 156,
    }))),
  });
}
