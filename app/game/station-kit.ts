import { SPACEFLIGHT_CATALOG } from "./spaceflight-catalog";

/** Append-only voxel identities, deliberately not workshop machines. A wall does
 * not own a ticking store or consume the location's 256-machine allowance. */
export const STATION_STRUCTURE_CATALOG = {
  "station-hull": { id: 708, name: "Station Hull", color: "#ddd3ba", sealMask: 63, plants: 0 },
  "station-bulkhead": { id: 709, name: "Station Bulkhead", color: "#899c9d", sealMask: 63, plants: 0 },
  "station-habitation": { id: 710, name: "Habitation Bench", color: "#c3aa87", sealMask: 0, plants: 0 },
  "station-greenhouse": { id: 711, name: "Greenhouse Tray", color: "#8cb899", sealMask: 0, plants: 4 },
} as const;
export type StationStructureKind = keyof typeof STATION_STRUCTURE_CATALOG;
const structures = new Map<number, StationStructureKind>(Object.entries(STATION_STRUCTURE_CATALOG).map(([kind, def]) => [def.id, kind as StationStructureKind]));
const openHardware = new Set<number>(Object.values(SPACEFLIGHT_CATALOG).map(def => def.id));
export const stationStructureKind = (id: number): StationStructureKind | undefined => structures.get(id);
export const stationStructureMeta = (id: number) => {
  const kind = stationStructureKind(id); return kind ? STATION_STRUCTURE_CATALOG[kind] : undefined;
};
/** Only open furnishings need separate scene models. Sealed walls are batched
 * into the ordinary chunk mesh, with internal faces culled like other cubes. */
export const stationSceneStructureKind = (id: number) => stationStructureMeta(id)?.sealMask === 0 ? stationStructureKind(id) : undefined;

type PanelPatch = { rect: readonly [number, number, number, number]; tint: [number, number, number] };
const ivory: [number, number, number] = [.94, .9, .79];
const copper: [number, number, number] = [.72, .43, .26];
const iron: [number, number, number] = [.36, .44, .44];
const patch = (rect: PanelPatch["rect"], tint: PanelPatch["tint"]): PanelPatch => ({ rect, tint });
const rim = (width: number, tint: PanelPatch["tint"]) => [
  patch([0, 0, 1, width], tint), patch([0, 1 - width, 1, 1], tint),
  patch([0, width, width, 1 - width], tint), patch([1 - width, width, 1, 1 - width], tint),
];
const hullFace = [...rim(.035, copper), patch([.035, .035, .965, .965], ivory)];
const bulkheadFace = [...rim(.07, iron),
  patch([.48, .07, .52, .93], copper), patch([.07, .48, .48, .52], copper), patch([.52, .48, .93, .52], copper),
  ...[.07, .52].flatMap(u => [.07, .52].map(v => patch([u, v, u + .41, v + .41], ivory))),
];
/** Disjoint coplanar rectangles: no extra atlas slots, overlays or z-fighting. */
export const stationPanelFace = (id: number): readonly PanelPatch[] | undefined =>
  id === STATION_STRUCTURE_CATALOG["station-hull"].id ? hullFace : id === STATION_STRUCTURE_CATALOG["station-bulkhead"].id ? bulkheadFace : undefined;

/** Six faces use the AirZone +X/-X/+Y/-Y/+Z/-Z bit order. Undefined preserves
 * ordinary block/door policy. Collision alone is never a station seal: a truss,
 * docking ring, radiator, console or telescope has open space around it. */
export function stationSealMask(id: number): number | undefined {
  return stationStructureMeta(id)?.sealMask ?? (openHardware.has(id) ? 0 : undefined);
}
