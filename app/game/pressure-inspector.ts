import { airZoneDiagnostics, type AirZoneState } from "./airzone";
import { normalizePressureDevice, pressurePoint } from "./pressure-devices";
import type { PressureRuntime } from "./pressure-runtime";

type Diagnostics = ReturnType<PressureRuntime["diagnosticsFor"]>;
export type PressureInspectorBinding = {
  locationId: string; generation: number; facilityId: string; installationId: string; revision: number;
};
/** Only the open facility's display state. Never install this in PressureRuntime.
 * Zone membership is deliberately omitted; this cannot answer breathing queries. */
export type PressureInspector = PressureInspectorBinding & { schema: 1; sequence: number; diagnostics: Diagnostics };
export const PRESSURE_INSPECTOR_MAX_BYTES = 12_288;
const whole = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const label = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 256;
const point = (v: unknown): boolean => !!v && typeof v === "object" && ["x", "y", "z"].every(k => whole((v as Record<string, unknown>)[k], -30_000_000, 30_000_000));

/** Reject oversized/non-JSON trees before serialization or normalization. */
function bounded(value: unknown, depth = 0, budget = { nodes: 0 }): boolean {
  if (++budget.nodes > 512 || depth > 10) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.length <= 256;
  if (!value || typeof value !== "object" || ![Object.prototype, Array.prototype].includes(Object.getPrototypeOf(value))) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length > 48) return false;
  return keys.every(key => {
    if (Array.isArray(value) && key === "length") return true;
    const d = Object.getOwnPropertyDescriptor(value, key)!;
    return typeof key === "string" && key.length <= 64 && d.enumerable && "value" in d && bounded(d.value, depth + 1, budget);
  });
}

export function buildPressureInspector(binding: PressureInspectorBinding, sequence: number, diagnostics: Diagnostics): PressureInspector | null {
  // Strip the potentially 16,384-cell membership and controller list before copying.
  const zone = diagnostics.zone ? { ...diagnostics.zone, cellKeys: [], controllerIds: [] } : undefined;
  const wire = JSON.parse(JSON.stringify({ schema: 1, ...binding, sequence, diagnostics: { ...diagnostics, zone } }));
  return acceptPressureInspector(wire, null, binding);
}

/** Caller must authenticate the host. Invalid, stale or mismatched data clears the
 * view instead of keeping an old set of controls for a replacement installation. */
export function acceptPressureInspector(value: unknown, previous: PressureInspector | null, expected: PressureInspectorBinding): PressureInspector | null {
  try {
    if (!bounded(value) || new TextEncoder().encode(JSON.stringify(value)).length > PRESSURE_INSPECTOR_MAX_BYTES) return null;
    const next = value as PressureInspector;
    if (next.schema !== 1 || !label(next.locationId) || !whole(next.generation) || !whole(next.revision) || !whole(next.sequence)
      || !/^wayworks:-?\d+,-?\d+,-?\d+$/.test(next.facilityId) || !pressurePoint(next.facilityId.slice(9))
      || !/^p-[1-9][0-9]{0,14}$/.test(next.installationId)
      || (Object.keys(expected) as (keyof PressureInspectorBinding)[]).some(k => next[k] !== expected[k])
      || previous && previous.locationId === next.locationId && previous.generation === next.generation && next.sequence <= previous.sequence) return null;
    const d = next.diagnostics, device = normalizePressureDevice(d?.device);
    if (!device || device.installationId !== next.installationId || JSON.stringify(device) !== JSON.stringify(d.device)
      || !whole(d.occupants, 0, 100000) || !whole(d.capacity, 0, 16384) || !whole(d.topologyRevision)
      || typeof d.checkAgeMs !== "number" || !Number.isFinite(d.checkAgeMs) || d.checkAgeMs < 0
      || !(d.error === null || label(d.error))
      || !(d.bounds === null || d.bounds && point(d.bounds.min) && point(d.bounds.max))
      || !(d.leak === null || d.leak && point(d.leak.cell) && ["+x", "-x", "+y", "-y", "+z", "-z"].includes(d.leak.face)
        && label(d.leak.cause) && typeof d.leak.unknown === "boolean")) return null;
    const z = d.zone;
    if (z && (z.schemaVersion !== 1 || z.locationId !== next.locationId || !label(z.zoneId) || !label(z.membershipDigest)
      || !Array.isArray(z.cellKeys) || z.cellKeys.length !== 0 || !Array.isArray(z.controllerIds) || z.controllerIds.length !== 0
      || !whole(z.cellCount, 1, 16384) || !whole(z.topologyRevision) || !whole(z.resourceRevision)
      || !whole(z.temperatureMilliC, -273150, 2000000) || !whole(z.pressureMilliKPa, 0, 1e12)
      || !["unknown", "checking", "sealed", "leaking", "depressurized", "over-capacity"].includes(z.status)
      || ![z.oxygenMilliMoles, z.inertMilliMoles, z.co2MilliMoles, z.thermalEnergyMilliJ, z.boundaryLeakArea].every(v => whole(v)))) return null;
    const detached = structuredClone(next);
    // Safety labels and reserve are derived from validated readings, never trusted independently.
    detached.diagnostics = { ...detached.diagnostics, device, ...(z ? airZoneDiagnostics(z as AirZoneState, d.occupants * 4) : {}) };
    if (!z) {
      delete detached.diagnostics.breathable; delete detached.diagnostics.reasons;
      delete detached.diagnostics.reserveSeconds;
    }
    return detached;
  } catch { return null; }
}

export function pressureInspectorMatches(view: PressureInspector, expected: PressureInspectorBinding): boolean {
  return (Object.keys(expected) as (keyof PressureInspectorBinding)[]).every(key => view[key] === expected[key]);
}
