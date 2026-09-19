import type { InventorySlot } from "./data";

/** Runtime quantities are whole items, millilitres, standard millilitres, or joules. */
export type ResourceKind = "item" | "fluid" | "chemical" | "energy" | "heat";
export type ResourcePacket =
  | { kind: "item"; quantity: number; slot: InventorySlot }
  | { kind: Exclude<ResourceKind, "item">; quantity: number; resource: string };
export type ResourceEndpoint = Readonly<{
  endpointId: string;
  locationId: string;
  revision: number;
  kind: ResourceKind;
  capacity: number;
  content: ResourcePacket | null;
}>;
export type ResourceQuote = Readonly<{
  operation: "insert" | "extract";
  endpointId: string;
  locationId: string;
  revision: number;
  /** Binds even an incorrectly reused revision to the exact original contents. */
  fingerprint: string;
  requested: ResourcePacket;
  accepted: number;
}>;
export type ResourceCommit = Readonly<{
  ok: boolean;
  reason: string;
  endpoint: ResourceEndpoint;
  moved: ResourcePacket | null;
}>;
const KINDS: readonly ResourceKind[] = ["item", "fluid", "chemical", "energy", "heat"];
export const MAX_RESOURCE_QUANTITY = 1_000_000_000;
const quantity = (value: unknown, max = MAX_RESOURCE_QUANTITY): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= max;

/** Small JSON-only metadata. Reject exotic/cyclic payloads instead of dropping identity. */
function stable(value: unknown, depth = 0, seen = new Set<object>()): string {
  if (depth > 12) throw new Error("metadata-depth");
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== "object" || seen.has(value)) throw new Error("invalid-metadata");
  seen.add(value);
  const result = Array.isArray(value)
    ? `[${value.map((entry) => stable(entry, depth + 1, seen)).join(",")}]`
    : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key], depth + 1, seen)}`).join(",")}}`;
  seen.delete(value);
  if (result.length > 16_384) throw new Error("metadata-size");
  return result;
}

export function resourceItemSignature(slot: InventorySlot): string {
  return `${slot.item}|${slot.durability ?? ""}|${stable(slot.metadata ?? null)}`;
}

export function validResourcePacket(value: unknown): value is ResourcePacket {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const packet = value as ResourcePacket;
  if (!KINDS.includes(packet.kind) || !quantity(packet.quantity) || packet.quantity === 0) return false;
  if (packet.kind !== "item") return typeof packet.resource === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(packet.resource);
  const slot = packet.slot;
  if (!slot || !Number.isSafeInteger(slot.item) || slot.item <= 0 || !quantity(slot.count, 64)
    || slot.count !== packet.quantity || (slot.durability !== undefined && (!Number.isFinite(slot.durability) || slot.durability < 0))) return false;
  try { resourceItemSignature(slot); return true; } catch { return false; }
}

export function resourceIdentity(packet: ResourcePacket): string {
  return packet.kind === "item" ? `item:${resourceItemSignature(packet.slot)}` : `${packet.kind}:${packet.resource}`;
}

export function resizeResource(packet: ResourcePacket, amount: number): ResourcePacket {
  return packet.kind === "item"
    ? { kind: "item", quantity: amount, slot: { ...packet.slot, count: amount,
      ...(packet.slot.metadata ? { metadata: JSON.parse(stable(packet.slot.metadata)) as Record<string, unknown> } : {}) } }
    : { ...packet, quantity: amount };
}

function validEndpoint(endpoint: ResourceEndpoint): boolean {
  return Boolean(endpoint && typeof endpoint.endpointId === "string" && endpoint.endpointId.length > 0 && endpoint.endpointId.length <= 256
    && typeof endpoint.locationId === "string" && endpoint.locationId.length > 0 && endpoint.locationId.length <= 256
    && quantity(endpoint.revision, Number.MAX_SAFE_INTEGER - 1) && KINDS.includes(endpoint.kind)
    && quantity(endpoint.capacity) && (endpoint.content === null || (validResourcePacket(endpoint.content)
      && endpoint.content.kind === endpoint.kind && endpoint.content.quantity <= endpoint.capacity)));
}
const fingerprint = (endpoint: ResourceEndpoint) => JSON.stringify([
  endpoint.kind, endpoint.capacity, endpoint.content ? resourceIdentity(endpoint.content) : null, endpoint.content?.quantity ?? 0,
]);

function simulate(endpoint: ResourceEndpoint, requested: ResourcePacket, operation: "insert" | "extract"): ResourceQuote | null {
  if (!validEndpoint(endpoint) || !validResourcePacket(requested) || requested.kind !== endpoint.kind) return null;
  if (endpoint.content && resourceIdentity(endpoint.content) !== resourceIdentity(requested)) return null;
  const capacity = endpoint.kind === "item" ? Math.min(64, endpoint.capacity) : endpoint.capacity;
  const limit = operation === "insert" ? capacity - (endpoint.content?.quantity ?? 0) : endpoint.content?.quantity ?? 0;
  const accepted = Math.min(requested.quantity, limit, endpoint.kind === "item" ? 64 : MAX_RESOURCE_QUANTITY);
  if (accepted <= 0) return null;
  return Object.freeze({ operation, endpointId: endpoint.endpointId, locationId: endpoint.locationId, revision: endpoint.revision,
    fingerprint: fingerprint(endpoint), requested: resizeResource(requested, requested.quantity), accepted });
}

export const simulateInsert = (endpoint: ResourceEndpoint, packet: ResourcePacket) => simulate(endpoint, packet, "insert");
export const simulateExtract = (endpoint: ResourceEndpoint, packet: ResourcePacket) => simulate(endpoint, packet, "extract");

function commit(endpoint: ResourceEndpoint, quote: ResourceQuote, operation: "insert" | "extract"): ResourceCommit {
  const fail = (reason: string): ResourceCommit => ({ ok: false, reason, endpoint, moved: null });
  if (!validEndpoint(endpoint) || !quote || quote.operation !== operation || quote.endpointId !== endpoint.endpointId
    || quote.locationId !== endpoint.locationId || quote.revision !== endpoint.revision) return fail("stale-endpoint");
  const fresh = simulate(endpoint, quote.requested, operation);
  if (!fresh || fresh.fingerprint !== quote.fingerprint || fresh.accepted !== quote.accepted) return fail("changed-quote");
  const remaining = (endpoint.content?.quantity ?? 0) + (operation === "insert" ? fresh.accepted : -fresh.accepted);
  return { ok: true, reason: "ok", endpoint: { ...endpoint, revision: endpoint.revision + 1,
    content: remaining > 0 ? resizeResource(endpoint.content ?? fresh.requested, remaining) : null },
  moved: resizeResource(fresh.requested, fresh.accepted) };
}

export const commitInsert = (endpoint: ResourceEndpoint, quote: ResourceQuote) => commit(endpoint, quote, "insert");
export const commitExtract = (endpoint: ResourceEndpoint, quote: ResourceQuote) => commit(endpoint, quote, "extract");

/** Both immutable after-images are returned together; caller installs both or neither. */
export function transferResource(source: ResourceEndpoint, destination: ResourceEndpoint, maximum: number) {
  const fail = (reason: string) => ({ ok: false, reason, source, destination, moved: null as ResourcePacket | null });
  if (!quantity(maximum) || maximum === 0 || source.locationId !== destination.locationId
    || source.endpointId === destination.endpointId || !source.content || !validResourcePacket(source.content)) return fail("invalid-transfer");
  const requested = resizeResource(source.content, Math.min(maximum, source.content.quantity));
  const outgoing = simulateExtract(source, requested);
  const incoming = outgoing && simulateInsert(destination, resizeResource(requested, outgoing.accepted));
  if (!incoming) return fail("backpressure");
  const finalOutgoing = simulateExtract(source, resizeResource(requested, incoming.accepted));
  if (!finalOutgoing) return fail("source-changed");
  const from = commitExtract(source, finalOutgoing);
  const to = commitInsert(destination, incoming);
  if (!from.ok || !to.ok) return fail("quote-changed");
  return { ok: true, reason: "ok", source: from.endpoint, destination: to.endpoint, moved: to.moved };
}
