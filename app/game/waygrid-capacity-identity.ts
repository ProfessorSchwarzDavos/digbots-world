import { parseLocationId } from "./location-address";

const PREFIX = "waygrid:v1:";
export type WaygridCapacityKind = "item" | "creature" | "cell";
export type WaygridCapacityOwner = Readonly<{ locationId: string; key: string; kind: WaygridCapacityKind }>;

export function waygridCapacityId(owner: WaygridCapacityOwner): string {
  parseLocationId(owner.locationId);
  const coordinates = owner.key.split(",").map(Number);
  if (coordinates.length !== 3 || !coordinates.every(Number.isSafeInteger)
    || coordinates.join(",") !== owner.key || !["item", "creature", "cell"].includes(owner.kind)) {
    throw Error("Invalid Waygrid capacity owner.");
  }
  return PREFIX + JSON.stringify([owner.locationId, owner.key, owner.kind]);
}

/** Legacy names are deliberately unresolved. Never infer their location. */
export function readWaygridCapacityId(id: string): WaygridCapacityOwner | null {
  if (!id.startsWith(PREFIX)) return null;
  if (id.length > 1_100) throw Error("Invalid Waygrid capacity identity.");
  const parts: unknown = JSON.parse(id.slice(PREFIX.length));
  if (!Array.isArray(parts) || parts.length !== 3 || parts.some(part => typeof part !== "string")) {
    throw Error("Invalid Waygrid capacity identity.");
  }
  const owner = { locationId: parts[0], key: parts[1], kind: parts[2] } as WaygridCapacityOwner;
  if (waygridCapacityId(owner) !== id) throw Error("Noncanonical Waygrid capacity identity.");
  return owner;
}
