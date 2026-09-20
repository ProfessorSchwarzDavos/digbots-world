import { airCellKey, airZoneDiagnostics, totalAirGas, type AirPoint, type AirZoneState, type AirZoneStatus } from "./airzone";
import type { BodyEnvironment } from "./celestial-environment";
import type { PressureDevice } from "./pressure-devices";

/** Presentation only. No gas inventories, machine state, simulation or authority. */
export const PRESSURE_PRESENTATION_MAX_BYTES = 192 * 1024;
export const PRESSURE_PRESENTATION_MAX_DOORS = 128;
export const PRESSURE_PRESENTATION_MAX_ZONES = 2;
export const PRESSURE_PRESENTATION_MAX_CELLS = 32_768;
export const PRESSURE_PRESENTATION_DOOR_RADIUS = 32;
export const PRESSURE_PRESENTATION_ZONE_RADIUS = 8;
const MAX_COORDINATE = 30_000_000;
const DOOR_KINDS = ["pressure-door", "horizon-door", "hangar-pressure-gate", "emergency-shutter"] as const;
const STATUSES: readonly AirZoneStatus[] = ["unknown", "checking", "sealed", "leaking", "depressurized", "over-capacity"];
export type PressurePresentationEpoch = Readonly<{ locationId: string; generation: number }>;
export type PressureDoorPresentation = Readonly<{
  key: string; kind: typeof DOOR_KINDS[number]; open: boolean; locked: boolean;
  gateWidth: number; gateHeight: number; gateCells: readonly string[];
}>;
export type PressureZonePresentation = Readonly<{
  zoneId: string; cellKeys: readonly string[]; bounds: Readonly<{ min: string; max: string }>; membershipComplete: boolean; status: AirZoneStatus;
  pressureMilliKPa: number; temperatureMilliC: number;
  oxygenFraction: number; inertFraction: number; co2Fraction: number;
  breathable: boolean; reasons: readonly string[]; oxygenPartsPerMillion: number;
  co2PartsPerMillion: number; oxygenPartialPressureMilliKPa: number;
}>;
export type PressurePresentation = PressurePresentationEpoch & Readonly<{
  schema: 1; revision: number; sequence: number;
  doors: readonly PressureDoorPresentation[]; zones: readonly PressureZonePresentation[];
}>;
/** Structural view accepts PressureRuntime without importing its authority code. */
export type PressurePresentationSource = Readonly<{
  host: PressurePresentationEpoch & { machines: ReadonlyMap<string, { kind: string }> };
  devices: ReadonlyMap<string, Pick<PressureDevice, "open" | "locked" | "gateWidth" | "gateHeight">>;
  gates: ReadonlyMap<string, readonly AirPoint[]>;
  topology: { revision: number; zones: ReadonlyMap<string, AirZoneState> };
}>;

const whole = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
const finite = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const label = (value: unknown, max = 200): value is string => typeof value === "string" && value.length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/u.test(value);
function cellPoint(key: unknown): AirPoint | null {
  if (typeof key !== "string" || !/^-?\d{1,8},-?\d{1,8},-?\d{1,8}$/u.test(key)) return null;
  const [x, y, z] = key.split(",").map(Number);
  return [x, y, z].every(n => whole(n, -MAX_COORDINATE, MAX_COORDINATE)) && `${x},${y},${z}` === key ? { x, y, z } : null;
}
function floorPoint(point: AirPoint): AirPoint | null {
  return point && [point.x, point.y, point.z].every(n => finite(n, -MAX_COORDINATE, MAX_COORDINATE))
    ? { x: Math.floor(point.x), y: Math.floor(point.y), z: Math.floor(point.z) } : null;
}
const distance = (a: AirPoint, b: AirPoint) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
const within = (point: AirPoint, min: AirPoint, max: AirPoint) => point.x >= min.x && point.x <= max.x
  && point.y >= min.y && point.y <= max.y && point.z >= min.z && point.z <= max.z;
/** Reject inherited fields, symbols, accessors and non-JSON prototypes before reading. */
function record(value: unknown, fields: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const keys = Reflect.ownKeys(value);
  return keys.length === fields.length && keys.every(key => typeof key === "string" && fields.includes(key)
    && Object.getOwnPropertyDescriptor(value, key)?.enumerable === true && "value" in Object.getOwnPropertyDescriptor(value, key)!);
}
function array(value: unknown, max: number): value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max) return false;
  const keys = Reflect.ownKeys(value);
  return keys.length === value.length + 1 && keys.every(key => key === "length" || typeof key === "string"
    && /^(0|[1-9]\d*)$/u.test(key) && Number(key) < value.length
    && Object.getOwnPropertyDescriptor(value, key)?.enumerable === true && "value" in Object.getOwnPropertyDescriptor(value, key)!);
}
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
function expectedReasons(zone: Pick<PressureZonePresentation, "status" | "pressureMilliKPa" | "temperatureMilliC" | "co2PartsPerMillion" | "oxygenPartialPressureMilliKPa">): string[] {
  const reasons: string[] = [];
  if (zone.status !== "sealed") reasons.push(zone.status);
  if (zone.pressureMilliKPa < 60_000 || zone.pressureMilliKPa > 120_000) reasons.push("unsafe-pressure");
  if (zone.oxygenPartialPressureMilliKPa < 16_000 || zone.oxygenPartialPressureMilliKPa > 30_000) reasons.push("unsafe-oxygen");
  if (zone.co2PartsPerMillion > 5_000) reasons.push("high-co2");
  if (zone.temperatureMilliC < 0 || zone.temperatureMilliC > 45_000) reasons.push("unsafe-temperature");
  return reasons;
}

/** Strict detached, frozen wire parser. Call only on the trusted host's payload. */
export function parsePressurePresentation(value: unknown): PressurePresentation | null {
  try {
    if (!record(value, ["schema", "locationId", "generation", "revision", "sequence", "doors", "zones"])
      || value.schema !== 1 || !label(value.locationId) || !whole(value.generation) || !whole(value.revision) || !whole(value.sequence)
      || !array(value.doors, PRESSURE_PRESENTATION_MAX_DOORS) || !array(value.zones, PRESSURE_PRESENTATION_MAX_ZONES)) return null;
    const doorKeys = new Set<string>(), gateKeys = new Set<string>(), zoneIds = new Set<string>(), cellKeys = new Set<string>();
    for (const door of value.doors) {
      if (!record(door, ["key", "kind", "open", "locked", "gateWidth", "gateHeight", "gateCells"])) return null;
      const point = cellPoint(door.key);
      if (!point || doorKeys.has(door.key as string) || !DOOR_KINDS.includes(door.kind as PressureDoorPresentation["kind"])
        || typeof door.open !== "boolean" || typeof door.locked !== "boolean" || !whole(door.gateWidth, 3, 9) || !whole(door.gateHeight, 3, 9)
        || !array(door.gateCells, 81)) return null;
      doorKeys.add(door.key as string);
      if (door.kind !== "hangar-pressure-gate" && (door.gateCells.length || point.y === MAX_COORDINATE)) return null;
      const cells: AirPoint[] = [];
      for (const key of door.gateCells) {
        const cell = cellPoint(key);
        if (!cell || gateKeys.has(key as string) || distance(cell, point) > 9) return null;
        gateKeys.add(key as string); cells.push(cell);
      }
      if (door.kind === "hangar-pressure-gate") {
        const width = door.gateWidth, height = door.gateHeight;
        // Empty membership represents an unformed controller, which cannot open.
        if (!cells.length) { if (door.open) return null; }
        else {
          if (cells.length !== (width - 2) * (height - 2)) return null;
          const axis = cells.every(cell => cell.z === point.z) ? "x" : cells.every(cell => cell.x === point.x) ? "z" : null;
          if (!axis || cells.some(cell => cell.y <= point.y || cell.y >= point.y + height - 1
            || cell[axis] <= point[axis] - Math.floor(width / 2)
            || cell[axis] >= point[axis] - Math.floor(width / 2) + width - 1)) return null;
        }
      }
    }
    for (const zone of value.zones) {
      if (!record(zone, ["zoneId", "cellKeys", "bounds", "membershipComplete", "status", "pressureMilliKPa", "temperatureMilliC", "oxygenFraction", "inertFraction", "co2Fraction", "breathable", "reasons", "oxygenPartsPerMillion", "co2PartsPerMillion", "oxygenPartialPressureMilliKPa"])
        || !label(zone.zoneId, 256) || zoneIds.has(zone.zoneId) || !array(zone.cellKeys, PRESSURE_PRESENTATION_MAX_CELLS) || !zone.cellKeys.length
        || typeof zone.membershipComplete !== "boolean" || !STATUSES.includes(zone.status as AirZoneStatus)
        || !whole(zone.pressureMilliKPa, 0, 1_000_000_000_000) || !whole(zone.temperatureMilliC, -273_150, 2_000_000)
        || !finite(zone.oxygenFraction, 0, 1) || !finite(zone.inertFraction, 0, 1) || !finite(zone.co2Fraction, 0, 1)
        || typeof zone.breathable !== "boolean" || !array(zone.reasons, 5)
        || !whole(zone.oxygenPartsPerMillion, 0, 1_000_000) || !whole(zone.co2PartsPerMillion, 0, 1_000_000)
        || !whole(zone.oxygenPartialPressureMilliKPa, 0, zone.pressureMilliKPa) || !record(zone.bounds, ["min", "max"])) return null;
      const min = cellPoint(zone.bounds.min), max = cellPoint(zone.bounds.max);
      if (!min || !max || !within(min, min, max)) return null;
      const sum = zone.oxygenFraction + zone.inertFraction + zone.co2Fraction;
      if (sum !== 0 && Math.abs(sum - 1) > 1e-12 || sum === 0 && zone.pressureMilliKPa !== 0
        || Math.abs(zone.oxygenPartsPerMillion - zone.oxygenFraction * 1_000_000) > 1.000001
        || Math.abs(zone.co2PartsPerMillion - zone.co2Fraction * 1_000_000) > 1.000001
        || Math.abs(zone.oxygenPartialPressureMilliKPa - zone.pressureMilliKPa * zone.oxygenFraction) > 1.001) return null;
      const reasons = expectedReasons(zone as unknown as PressureZonePresentation);
      if (zone.reasons.length !== reasons.length || zone.reasons.some((reason, index) => reason !== reasons[index]) || zone.breathable !== (reasons.length === 0)) return null;
      zoneIds.add(zone.zoneId);
      for (const key of zone.cellKeys) {
        const point = cellPoint(key);
        if (!point || !within(point, min, max) || cellKeys.has(key as string)) return null;
        cellKeys.add(key as string);
        if (cellKeys.size > PRESSURE_PRESENTATION_MAX_CELLS) return null;
      }
    }
    if (bytes(value) > PRESSURE_PRESENTATION_MAX_BYTES) return null;
    const snapshot = value as unknown as PressurePresentation;
    return Object.freeze({ ...snapshot,
      doors: Object.freeze(snapshot.doors.map(door => Object.freeze({ ...door, gateCells: Object.freeze([...door.gateCells]) }))),
      zones: Object.freeze(snapshot.zones.map(zone => Object.freeze({ ...zone, bounds: Object.freeze({ ...zone.bounds }), cellKeys: Object.freeze([...zone.cellKeys]), reasons: Object.freeze([...zone.reasons]) }))) });
  } catch { return null; }
}

/** Epoch must come from the host's accepted location transition, not this packet.
 * Reset previous on disconnect/transition. Sequence increases even without edits. */
export function acceptPressurePresentation(value: unknown, previous: PressurePresentation | null,
  expected: PressurePresentationEpoch): PressurePresentation | null {
  const next = parsePressurePresentation(value);
  if (!next || next.locationId !== expected.locationId || next.generation !== expected.generation) return null;
  if (previous && previous.locationId === expected.locationId && previous.generation === expected.generation
    && (next.sequence <= previous.sequence || next.revision < previous.revision)) return null;
  return next;
}

/** Exact nearby membership only: omitted cells NEVER inherit a room from bounds.
 * Budget exhaustion truncates membership, leaving query fallbacks conservative. */
export function buildPressurePresentation(source: PressurePresentationSource, recipient: AirPoint, sequence: number): PressurePresentation | null {
  const origin = floorPoint(recipient);
  if (!origin) return null;
  const result = { schema: 1 as const, locationId: source.host.locationId, generation: source.host.generation,
    revision: source.topology.revision, sequence, doors: [] as PressureDoorPresentation[], zones: [] as PressureZonePresentation[] };
  let remaining = PRESSURE_PRESENTATION_MAX_BYTES - bytes(result) - 16;
  let doorBytes = 0;
  const doors = [...source.devices].flatMap(([key, device]) => {
    const point = cellPoint(key), kind = source.host.machines.get(key)?.kind;
    return point && kind && DOOR_KINDS.includes(kind as PressureDoorPresentation["kind"]) && distance(point, origin) <= PRESSURE_PRESENTATION_DOOR_RADIUS
      ? [{ key, device, kind: kind as PressureDoorPresentation["kind"], point }] : [];
  }).sort((a, b) => distance(a.point, origin) - distance(b.point, origin) || a.key.localeCompare(b.key));
  for (const { key, device, kind } of doors.slice(0, PRESSURE_PRESENTATION_MAX_DOORS)) {
    const door: PressureDoorPresentation = { key, kind, open: device.open, locked: device.locked, gateWidth: device.gateWidth, gateHeight: device.gateHeight,
      gateCells: kind === "hangar-pressure-gate" ? (source.gates.get(key) ?? []).map(airCellKey) : [] };
    const cost = bytes(door) + 1;
    // Reserve half the packet for room membership and unknown-coverage bounds.
    if (doorBytes + cost > PRESSURE_PRESENTATION_MAX_BYTES / 2) break;
    result.doors.push(door); remaining -= cost; doorBytes += cost;
  }
  const nearby = [...source.topology.zones.values()].filter(zone => zone.locationId === result.locationId).map(zone => ({ zone,
    cells: zone.cellKeys.flatMap(key => { const point = cellPoint(key); return point && distance(point, origin) <= PRESSURE_PRESENTATION_ZONE_RADIUS ? [{ key, distance: distance(point, origin) }] : []; })
      .sort((a, b) => a.distance - b.distance || a.key.localeCompare(b.key)) }))
    .filter(entry => entry.cells.length).sort((a, b) => a.cells[0].distance - b.cells[0].distance || a.zone.zoneId.localeCompare(b.zone.zoneId));
  let count = 0;
  const selected = nearby.slice(0, PRESSURE_PRESENTATION_MAX_ZONES);
  for (const [index, { zone, cells }] of selected.entries()) {
    let roomBudget = Math.floor(remaining / (selected.length - index));
    const total = totalAirGas(zone), diagnostics = airZoneDiagnostics(zone);
    const min = { x: MAX_COORDINATE, y: MAX_COORDINATE, z: MAX_COORDINATE }, max = { x: -MAX_COORDINATE, y: -MAX_COORDINATE, z: -MAX_COORDINATE };
    for (const key of zone.cellKeys) {
      const point = cellPoint(key); if (!point) return null;
      for (const axis of ["x", "y", "z"] as const) { min[axis] = Math.min(min[axis], point[axis]); max[axis] = Math.max(max[axis], point[axis]); }
    }
    const view = { zoneId: zone.zoneId, cellKeys: [] as string[], bounds: { min: airCellKey(min), max: airCellKey(max) }, membershipComplete: false, status: zone.status,
      pressureMilliKPa: zone.pressureMilliKPa, temperatureMilliC: zone.temperatureMilliC,
      oxygenFraction: total ? zone.oxygenMilliMoles / total : 0, inertFraction: total ? zone.inertMilliMoles / total : 0, co2Fraction: total ? zone.co2MilliMoles / total : 0,
      breathable: diagnostics.breathable, reasons: diagnostics.reasons, oxygenPartsPerMillion: diagnostics.oxygenPartsPerMillion,
      co2PartsPerMillion: diagnostics.co2PartsPerMillion, oxygenPartialPressureMilliKPa: diagnostics.oxygenPartialPressureMilliKPa };
    const base = bytes(view) + 1;
    if (base >= roomBudget) break;
    remaining -= base; roomBudget -= base;
    for (const { key } of cells) {
      const cost = bytes(key) + 1;
      if (cost > roomBudget || count >= PRESSURE_PRESENTATION_MAX_CELLS) break;
      view.cellKeys.push(key); remaining -= cost; roomBudget -= cost; count++;
    }
    if (!view.cellKeys.length) break;
    view.membershipComplete = view.cellKeys.length === zone.cellKeys.length;
    result.zones.push(view);
  }
  return parsePressurePresentation(result);
}

export function pressurePresentationOpenDoorAt(snapshot: PressurePresentation | null, position: AirPoint): boolean {
  const point = floorPoint(position); if (!point) return false;
  const key = airCellKey(point);
  return !!snapshot?.doors.some(door => door.open && (door.key === key || (door.kind === "hangar-pressure-gate"
    ? door.gateCells.includes(key) : door.key === airCellKey({ ...point, y: point.y - 1 }))));
}
export function pressurePresentationClosedGateAt(snapshot: PressurePresentation | null, position: AirPoint): boolean {
  const point = floorPoint(position); if (!point) return false;
  return !!snapshot?.doors.some(door => door.kind === "hangar-pressure-gate" && !door.open && door.gateCells.includes(airCellKey(point)));
}
export function pressurePresentationEnvironmentAt(snapshot: PressurePresentation | null, position: AirPoint, fallback: BodyEnvironment): BodyEnvironment {
  const point = floorPoint(position), zone = point ? snapshot?.zones.find(candidate => candidate.cellKeys.includes(airCellKey(point))) : undefined;
  if (!zone) {
    // Bounds never imply membership or breathable air. They only identify where
    // omitted membership makes an exterior fallback unsafe (including Home).
    if (point && snapshot?.zones.some(candidate => !candidate.membershipComplete && within(point, cellPoint(candidate.bounds.min)!, cellPoint(candidate.bounds.max)!)))
      return { ...fallback, pressureKPa: 0, oxygenFraction: 0, inertFraction: 0, co2Fraction: 0, breathable: false, requiresPressureSuit: true };
    return fallback;
  }
  return { ...fallback, pressureKPa: zone.pressureMilliKPa / 1000, oxygenFraction: zone.oxygenFraction, inertFraction: zone.inertFraction,
    co2Fraction: zone.co2Fraction, breathable: zone.breathable,
    requiresPressureSuit: zone.status !== "sealed" || zone.pressureMilliKPa < 35_000 || zone.pressureMilliKPa > 160_000,
    temperatureC: [zone.temperatureMilliC / 1000, zone.temperatureMilliC / 1000], corrosive: false };
}
