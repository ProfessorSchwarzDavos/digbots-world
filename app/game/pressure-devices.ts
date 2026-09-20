import { BlockId } from "./data";
import { normalizeAirlockState, type AirlockCommandKind, type AirlockState } from "./pressure-airlock";
import type { AirPoint } from "./airzone";

export const PRESSURE_LINK_ROLES = ["room", "inner", "outer", "chamber", "interior", "exterior", "pump", "reserve", "shutter"] as const;
export type PressureLinkRole = typeof PRESSURE_LINK_ROLES[number];
export type PressureAction = { kind: "link"; role: PressureLinkRole; target: string }
  | { kind: "unlink"; role: PressureLinkRole }
  | { kind: "mode"; mode: "supply" | "capture" | "release" | "off" }
  | { kind: "target"; pressurePa: number; temperatureMilliC: number }
  | { kind: "gate"; width: number; height: number }
  | { kind: "door"; open: boolean }
  | { kind: "cycle"; command: "cycle-out" | "return-in" | "reset" }
  | { kind: "hold"; command: Extract<AirlockCommandKind, `manual-${string}` | `dangerous-${string}`>; active: boolean };
export type PressureDevice = {
  schema: 1; installationId: string; links: Partial<Record<PressureLinkRole, string>>; bindings: Record<string, string>;
  open: boolean; locked: boolean; mode: "supply" | "capture" | "release" | "off";
  targetPressurePa: number; targetTemperatureMilliC: number; gateWidth: number; gateHeight: number;
  airlock: AirlockState | null;
};
export const PRESSURE_LINK_RANGE = 16;
export const pressurePoint = (key: string): AirPoint | null => {
  if (typeof key !== "string" || !/^-?\d{1,8},-?\d{1,8},-?\d{1,8}$/.test(key)) return null;
  const [x, y, z] = key.split(",").map(Number);
  return [x, y, z].every(value => Number.isSafeInteger(value) && Math.abs(value) <= 30_000_000) ? { x, y, z } : null;
};
export function parsePressureAction(value: unknown): PressureAction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const action = value as Record<string, unknown>;
  const exact = (...fields: string[]) => Reflect.ownKeys(action).length === fields.length + 1 && Reflect.ownKeys(action).every(key => typeof key === "string" && ["kind", ...fields].includes(key));
  const role = PRESSURE_LINK_ROLES.includes(action.role as PressureLinkRole);
  const whole = (v: unknown, lo: number, hi: number) => Number.isSafeInteger(v) && Number(v) >= lo && Number(v) <= hi;
  switch (action.kind) {
    case "link": return exact("role", "target") && role && (typeof action.target === "string" && !!pressurePoint(action.target) || action.role === "exterior" && action.target === "exterior") ? action as PressureAction : null;
    case "unlink": return exact("role") && role ? action as PressureAction : null;
    case "mode": return exact("mode") && ["supply", "capture", "release", "off"].includes(String(action.mode)) ? action as PressureAction : null;
    case "target": return exact("pressurePa", "temperatureMilliC") && whole(action.pressurePa, 10000, 120000) && whole(action.temperatureMilliC, 0, 45000) ? action as PressureAction : null;
    case "gate": return exact("width", "height") && whole(action.width, 3, 9) && whole(action.height, 3, 9) ? action as PressureAction : null;
    case "door": return exact("open") && typeof action.open === "boolean" ? action as PressureAction : null;
    case "cycle": return exact("command") && ["cycle-out", "return-in", "reset"].includes(String(action.command)) ? action as PressureAction : null;
    case "hold": return exact("command", "active") && ["manual-open-inner", "manual-open-outer", "dangerous-open-inner", "dangerous-open-outer"].includes(String(action.command)) && typeof action.active === "boolean" ? action as PressureAction : null;
    default: return null;
  }
}
export function createPressureDevice(installationId: string): PressureDevice {
  return { schema: 1, installationId, links: {}, bindings: {}, open: false, locked: false, mode: "supply",
    targetPressurePa: 100000, targetTemperatureMilliC: 20000, gateWidth: 5, gateHeight: 5, airlock: null };
}
export function normalizePressureDevice(value: unknown): PressureDevice | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as PressureDevice;
  if (raw.schema !== 1 || typeof raw.installationId !== "string" || !/^p-[1-9][0-9]{0,14}$/.test(raw.installationId)
    || !raw.links || !raw.bindings || typeof raw.open !== "boolean" || typeof raw.locked !== "boolean"
    || !parsePressureAction({ kind: "mode", mode: raw.mode }) || !parsePressureAction({ kind: "target", pressurePa: raw.targetPressurePa, temperatureMilliC: raw.targetTemperatureMilliC })
    || !parsePressureAction({ kind: "gate", width: raw.gateWidth, height: raw.gateHeight }) || Object.keys(raw.links).length > 9 || Object.keys(raw.bindings).length > 9) return null;
  for (const [role, target] of Object.entries(raw.links)) if (!parsePressureAction({ kind: "link", role, target })) return null;
  for (const [key, id] of Object.entries(raw.bindings)) if (!pressurePoint(key) || typeof id !== "string" || !/^p-[1-9][0-9]{0,14}$/.test(id)) return null;
  return { ...createPressureDevice(raw.installationId), links: { ...raw.links }, bindings: { ...raw.bindings }, open: raw.open, locked: raw.locked,
    mode: raw.mode, targetPressurePa: raw.targetPressurePa, targetTemperatureMilliC: raw.targetTemperatureMilliC, gateWidth: raw.gateWidth, gateHeight: raw.gateHeight,
    airlock: raw.airlock === null ? null : normalizeAirlockState(raw.airlock) };
}
export function pressureDoorUpper(type: BlockId): BlockId | undefined {
  return type === BlockId.PressureDoor ? BlockId.PressureDoorUpper : type === BlockId.HorizonDoor ? BlockId.HorizonDoorUpper
    : type === BlockId.EmergencyShutter ? BlockId.EmergencyShutterUpper : undefined;
}
export function pressureDoorLower(type: BlockId): BlockId | undefined {
  return type === BlockId.PressureDoorUpper ? BlockId.PressureDoor : type === BlockId.HorizonDoorUpper ? BlockId.HorizonDoor
    : type === BlockId.EmergencyShutterUpper ? BlockId.EmergencyShutter : undefined;
}

/** A pressure door is one item and one machine, but exactly two world cells.
 * No raw guest edit may create, replace or remove an orphan upper half. */
export function validPressureDoorEdits(edits: readonly (AirPoint & { type: number; facing?: number })[], read: (point: AirPoint) => BlockId | undefined): boolean {
  for (const edit of edits) {
    const incoming = edit.type as BlockId, previous = read(edit);
    const upper = pressureDoorUpper(incoming), lower = pressureDoorLower(incoming);
    if (upper || lower) {
      const lowerEdit = lower ? edits.find(other => other.x === edit.x && other.y === edit.y - 1 && other.z === edit.z) : edit;
      const upperEdit = upper ? edits.find(other => other.x === edit.x && other.y === edit.y + 1 && other.z === edit.z) : edit;
      if (edits.length !== 2 || !lowerEdit || !upperEdit || pressureDoorUpper(lowerEdit.type as BlockId) !== upperEdit.type || lowerEdit.facing !== upperEdit.facing) return false;
    }
    if (previous !== undefined && (pressureDoorUpper(previous) || pressureDoorLower(previous))) {
      const dy = pressureDoorUpper(previous) ? 1 : -1;
      const other = edits.find(part => part.x === edit.x && part.y === edit.y + dy && part.z === edit.z);
      if (edits.length !== 2 || incoming !== BlockId.Air || other?.type !== BlockId.Air) return false;
    }
  }
  return true;
}
