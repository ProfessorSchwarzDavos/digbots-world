import { parseAsteroidRegistry, type AsteroidRegistry } from "./asteroid-custody";
import { CELESTIAL_MAX_Y, CELESTIAL_MIN_Y, type CelestialBounds, type CelestialPoint } from "./celestial-terrain";
import { locationAddress, locationId, type LocationId } from "./location-address";
import { cloneUniverseJson, freezeUniverseJson } from "./universe-json";
import { rebaseAirZoneState } from "./airzone";
import type { AquariumState } from "./aquarium";
import type { MachineState } from "./wayworks";
import type { PressureSave } from "./pressure-runtime";

export type AsteroidAttachmentView = "orbit" | "local";
export type AsteroidAttachmentFrame = Readonly<{
  asteroidId: string; frameId: string; orbitId: LocationId; localId: LocationId;
  /** Orbit point = local point + offset; sky-only spin never rotates contents. */
  offset: CelestialPoint; orbitBounds: CelestialBounds; localBounds: CelestialBounds;
}>;
const axes = ["x", "y", "z"] as const;
const keyOf = (p: CelestialPoint) => `${p.x},${p.y},${p.z}`;
function pointFor(key: string): CelestialPoint {
  if (typeof key !== "string" || !/^-?\d+,-?\d+,-?\d+$/.test(key)) throw Error("Invalid attached cell key.");
  const [x, y, z] = key.split(",").map(Number), p = { x, y, z };
  if (!axes.every(axis => Number.isSafeInteger(p[axis])) || keyOf(p) !== key) throw Error("Noncanonical attached cell key.");
  return p;
}
/** A host-created coordinate contract, not a travel grant or a metadata owner.
 * Full 64-cell columns are disjoint; intersect both vertical ranges rather than
 * clipping a room silently. Callers must preflight all physical installations.
 */
export function createAsteroidAttachmentFrame(raw: AsteroidRegistry, asteroidId: string): AsteroidAttachmentFrame {
  const registry = parseAsteroidRegistry(raw), descriptor = registry.asteroids.find(entry => entry.descriptor.id === asteroidId)?.descriptor;
  if (!descriptor || descriptor.spinPolicy !== "sky-only") throw Error("Unknown or unsupported attached frame.");
  const offset = { x: descriptor.center.x, y: descriptor.center.y - 32, z: descriptor.center.z };
  if (offset.x % 64 !== 32 && offset.x % 64 !== -32 || offset.z % 64 !== 32 && offset.z % 64 !== -32) throw Error("Unsupported asteroid cell layout.");
  const orbitBounds = { minX: offset.x - 32, maxX: offset.x + 31, minZ: offset.z - 32, maxZ: offset.z + 31,
    minY: Math.max(CELESTIAL_MIN_Y, CELESTIAL_MIN_Y + offset.y), maxY: Math.min(CELESTIAL_MAX_Y, CELESTIAL_MAX_Y + offset.y) };
  const localBounds = { minX: -32, maxX: 31, minZ: -32, maxZ: 31, minY: orbitBounds.minY - offset.y, maxY: orbitBounds.maxY - offset.y };
  return freezeUniverseJson({ asteroidId, frameId: descriptor.localFrameId, orbitId: locationId(registry.orbit),
    localId: locationId(locationAddress({ ...registry.orbit, kind: "asteroid", instanceId: asteroidId })), offset, orbitBounds, localBounds });
}
export function asteroidAttachmentContains(frame: AsteroidAttachmentFrame, point: CelestialPoint, view: AsteroidAttachmentView): boolean {
  const b = view === "orbit" ? frame.orbitBounds : frame.localBounds;
  return axes.every(axis => Number.isSafeInteger(point[axis])) && point.x >= b.minX && point.x <= b.maxX
    && point.y >= b.minY && point.y <= b.maxY && point.z >= b.minZ && point.z <= b.maxZ;
}
export function asteroidAttachmentContainsCell(frame: AsteroidAttachmentFrame, key: string, view: AsteroidAttachmentView): boolean {
  return asteroidAttachmentContains(frame, pointFor(key), view);
}
export function rebaseAsteroidCell(frame: AsteroidAttachmentFrame, key: string, from: AsteroidAttachmentView): string {
  const point = pointFor(key);
  if (!asteroidAttachmentContains(frame, point, from)) throw Error("Attached installation crosses the asteroid frame boundary.");
  const sign = from === "orbit" ? -1 : 1;
  return keyOf({ x: point.x + sign * frame.offset.x, y: point.y + sign * frame.offset.y, z: point.z + sign * frame.offset.z });
}
/** Cell keys are block centers, as in the engine's floor(position + 0.5) lookup.
 * This physical box spans those complete centered voxels; upper edges belong to
 * the next frame. It is not an entity collider or a travel permission. */
export function asteroidAttachmentPhysicalBounds(frame: AsteroidAttachmentFrame, view: AsteroidAttachmentView): CelestialBounds {
  const b = view === "orbit" ? frame.orbitBounds : frame.localBounds;
  return { minX: b.minX - .5, maxX: b.maxX + .5, minY: b.minY - .5, maxY: b.maxY + .5,
    minZ: b.minZ - .5, maxZ: b.maxZ + .5 };
}
export function asteroidAttachmentContainsPosition(frame: AsteroidAttachmentFrame, point: CelestialPoint, view: AsteroidAttachmentView): boolean {
  const b = asteroidAttachmentPhysicalBounds(frame, view);
  return axes.every(axis => Number.isFinite(point[axis])) && point.x >= b.minX && point.x < b.maxX
    && point.y >= b.minY && point.y < b.maxY && point.z >= b.minZ && point.z < b.maxZ;
}
/** Continuous entity anchors occupy a centered cell; the upper edge is exclusive.
 * No quantization or rotation. Capture must retain the original canonical point
 * when its projected value was unchanged, avoiding repeated floating-point drift.
 */
export function rebaseAsteroidPosition(frame: AsteroidAttachmentFrame, point: CelestialPoint, from: AsteroidAttachmentView): CelestialPoint {
  if (!asteroidAttachmentContainsPosition(frame, point, from))
    throw Error("Attached entity or anchor crosses the asteroid frame boundary.");
  const sign = from === "orbit" ? -1 : 1;
  return { x: point.x + sign * frame.offset.x, y: point.y + sign * frame.offset.y, z: point.z + sign * frame.offset.z };
}
/** Only use for fields whose VALUES have no world-coordinate semantics. Portable
 * inventory metadata is intentionally opaque, including embedded x/y/z fields.
 * This is a whole-component codec: it never silently filters or drops entries.
 */
export function rebaseAsteroidKeyed<T>(frame: AsteroidAttachmentFrame, records: Readonly<Record<string, T>>, from: AsteroidAttachmentView): Record<string, T> {
  const detached = cloneUniverseJson(records);
  return Object.fromEntries(Object.entries(detached).map(([key, value]) => [rebaseAsteroidCell(frame, key, from), value]));
}
export function rebaseAsteroidMachines(frame: AsteroidAttachmentFrame, machines: Readonly<Record<string, MachineState>>, from: AsteroidAttachmentView): Record<string, MachineState> {
  const result = rebaseAsteroidKeyed(frame, machines, from), source = from === "orbit" ? frame.orbitId : frame.localId;
  for (const state of Object.values(result)) {
    if (state.schema !== 1 || state.locationId !== source) throw Error("Foreign or unsupported attached machine location.");
    state.locationId = from === "orbit" ? frame.localId : frame.orbitId;
  }
  return result;
}
export function rebaseAsteroidAquariums(frame: AsteroidAttachmentFrame, aquariums: Readonly<Record<string, AquariumState>>, from: AsteroidAttachmentView): Record<string, AquariumState> {
  return Object.fromEntries(Object.entries(rebaseAsteroidKeyed(frame, aquariums, from)).map(([key, state]) => {
    if (state.schema !== 1 || !state.blockKeys.length || new Set(state.blockKeys).size !== state.blockKeys.length) throw Error("Invalid attached aquarium component.");
    return [key, { ...state, blockKeys: state.blockKeys.map(cell => rebaseAsteroidCell(frame, cell, from)) }];
  }));
}
/** Rebase a fully selected pressure ownership unit. Gas/heat, installation IDs,
 * airlock deadlines and boundary totals are exact. Selection, global-ledger merge,
 * voxel/gate footprint validation and durable commit belong to the owner adapter;
 * this function MUST NOT itself be used to duplicate a live pressure runtime.
 */
export function rebaseAsteroidPressure(frame: AsteroidAttachmentFrame, pressure: PressureSave, from: AsteroidAttachmentView): PressureSave {
  const result = cloneUniverseJson(pressure), source = from === "orbit" ? frame.orbitId : frame.localId;
  const destination = from === "orbit" ? frame.localId : frame.orbitId;
  const cell = (key: string) => rebaseAsteroidCell(frame, key, from);
  const zoneIds = new Set(result.zones.map(zone => zone.zoneId));
  if (result.schema !== 1 || zoneIds.size !== result.zones.length) throw Error("Invalid attached pressure unit.");
  const occupied = new Set<string>(), installations = new Set<string>();
  const zoneReferences = new Map<string, string>();
  const zoneRef = (key: string) => key === "exterior" ? key : zoneReferences.get(key) ?? cell(key);
  result.zones = result.zones.map(zone => {
    if (zone.locationId !== source) throw Error("Foreign attached pressure location.");
    for (const key of zone.cellKeys) {
      if (occupied.has(key)) throw Error("Overlapping attached pressure rooms.");
      occupied.add(key);
    }
    const rebased = rebaseAirZoneState(zone, destination, cell);
    zoneReferences.set(zone.zoneId, rebased.zoneId);
    return rebased;
  });
  result.devices = Object.fromEntries(Object.entries(result.devices).map(([key, device]) => {
    if (device.schema !== 1 || !device.installationId || installations.has(device.installationId)) throw Error("Duplicate or unsupported attached pressure installation.");
    installations.add(device.installationId);
    device.links = Object.fromEntries(Object.entries(device.links).map(([role, target]) => [role, target === "exterior" && role === "exterior" ? target : cell(target)]));
    device.bindings = Object.fromEntries(Object.entries(device.bindings).map(([target, installation]) => [cell(target), installation]));
    const links = device.airlock?.links;
    if (links) device.airlock!.links = { ...links, controllerKey: cell(links.controllerKey), innerDoorKey: cell(links.innerDoorKey),
      outerDoorKey: cell(links.outerDoorKey), recoveryPumpKey: cell(links.recoveryPumpKey), reserveKey: cell(links.reserveKey),
      chamberZoneId: zoneRef(links.chamberZoneId), interiorZoneId: zoneRef(links.interiorZoneId), exteriorZoneId: zoneRef(links.exteriorZoneId) };
    return [cell(key), device];
  }));
  return result;
}
