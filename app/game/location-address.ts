import { assertExactKeys, isUniverseRecord } from "./universe-json";

declare const identity: unique symbol;
export type UniverseId = string & { readonly [identity]: "universe" };
export type SystemId = string & { readonly [identity]: "system" };
export type BodyId = string & { readonly [identity]: "body" };
export type LocationId = string & { readonly [identity]: "location" };
export const LOCATION_KINDS = ["surface", "orbit", "station", "asteroid", "interior", "transit"] as const;
export type LocationKind = typeof LOCATION_KINDS[number];
export type LocationAddress = Readonly<{
  universeId: UniverseId;
  systemId: SystemId;
  bodyId: BodyId;
  kind: LocationKind;
  instanceId: string;
}>;
export type LocationStamp = Readonly<{ locationId: LocationId; epoch: number; revision: number }>;

function token(value: unknown, label: string, path = false): string {
  if (typeof value !== "string" || value.length > 160 || !value.length
    || !(path ? /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/ : /^[a-zA-Z0-9_-]+(?:[.:][a-zA-Z0-9_-]+)*$/).test(value)) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
}

export const universeId = (value: unknown): UniverseId => token(value, "universe ID") as UniverseId;
export const systemId = (value: unknown): SystemId => token(value, "system ID") as SystemId;
export const bodyId = (value: unknown): BodyId => token(value, "body ID", true) as BodyId;

export function locationAddress(value: unknown): LocationAddress {
  if (!isUniverseRecord(value)) throw new Error("Invalid location address.");
  assertExactKeys(value, ["universeId", "systemId", "bodyId", "kind", "instanceId"], "Location address");
  if (!LOCATION_KINDS.includes(value.kind as LocationKind)) throw new Error("Unknown location kind.");
  const kind = value.kind as LocationKind;
  const instanceId = token(value.instanceId, "location instance ID");
  if (kind === "surface" && instanceId !== "main") throw new Error("A body has exactly one canonical surface.");
  return Object.freeze({ universeId: universeId(value.universeId), systemId: systemId(value.systemId), bodyId: bodyId(value.bodyId), kind, instanceId });
}

/** JSON tuple encoding makes boundaries unambiguous, including catalog paths. */
export function locationId(value: LocationAddress): LocationId {
  const address = locationAddress(value);
  return JSON.stringify([1, address.universeId, address.systemId, address.bodyId, address.kind, address.instanceId]) as LocationId;
}

export function parseLocationId(value: unknown): LocationAddress {
  if (typeof value !== "string" || value.length > 800) throw new Error("Invalid location ID.");
  let parts: unknown;
  try { parts = JSON.parse(value); } catch { throw new Error("Invalid location ID."); }
  if (!Array.isArray(parts) || parts.length !== 6 || parts[0] !== 1) throw new Error("Unsupported location address schema.");
  const address = locationAddress({ universeId: parts[1], systemId: parts[2], bodyId: parts[3], kind: parts[4], instanceId: parts[5] });
  if (locationId(address) !== value) throw new Error("Location ID is not canonical.");
  return address;
}

export function homeLocation(id: UniverseId): LocationAddress {
  return locationAddress({ universeId: id, systemId: "waystar", bodyId: "blockwild", kind: "surface", instanceId: "main" });
}

export function scopedLocationKey(owner: LocationId, ...parts: readonly (string | number)[]): string {
  parseLocationId(owner);
  if (parts.some((part) => typeof part === "number" ? !Number.isSafeInteger(part) : typeof part !== "string")) {
    throw new Error("Scoped coordinate keys require strings or safe integers.");
  }
  return JSON.stringify([owner, ...parts.map((part) => Object.is(part, -0) ? 0 : part)]);
}

export function locationStamp(value: unknown): LocationStamp {
  if (!isUniverseRecord(value)) throw new Error("Missing location stamp.");
  assertExactKeys(value, ["locationId", "epoch", "revision"], "Location stamp");
  parseLocationId(value.locationId);
  if (!Number.isSafeInteger(value.epoch) || Number(value.epoch) < 1 || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0) {
    throw new Error("Invalid location epoch or revision.");
  }
  return Object.freeze({ locationId: value.locationId as LocationId, epoch: value.epoch as number, revision: value.revision as number });
}

export function sameLocationStamp(left: LocationStamp, right: LocationStamp): boolean {
  return left.locationId === right.locationId && left.epoch === right.epoch && left.revision === right.revision;
}

/** Seed v1: UTF-8 canonical tuple, FNV-1a/32. Not a security/checksum primitive. */
export function deriveLocationSeed(domain: "system" | "body" | "location" | "chunk" | "structure" | "weather" | "encounter", ...parts: readonly (string | number)[]): string {
  if (!["system", "body", "location", "chunk", "structure", "weather", "encounter"].includes(domain)) throw new Error("Unknown seed domain.");
  if (parts.some((part) => typeof part !== "string" && (typeof part !== "number" || !Number.isSafeInteger(part)))) throw new Error("Invalid seed component.");
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(JSON.stringify(["blockwild-seed-v1", domain, ...parts]))) {
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  }
  return `v1-${domain}-${hash.toString(16).padStart(8, "0")}`;
}
