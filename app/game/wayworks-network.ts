/** Derived, ephemeral topology only. Machine buffers remain authoritative in the caller. */
import { PRESSURE_CATALOG, type PressureMachineKind } from "./pressure-catalog";
import { SPACEFLIGHT_CATALOG, type SpaceflightMachineKind } from "./spaceflight-catalog";
export type PowerTopologyFace = "front" | "back" | "left" | "right" | "top" | "bottom";
export type PowerTopologyPort = "disabled" | "input" | "output" | "both" | "passive" | "pull" | "service";
const MACHINE_KINDS = [
  "hand-dynamo", "sunplate-array", "field-battery", "charging-pedestal", "grid-cable",
  "heat-engine", "wind-rotor", "waterwheel-generator", "biofuel-engine", "grid-battery",
  "ship-battery-bank", "powered-crusher", "enrichment-mill", "electric-smelter", "alloy-infuser",
  "plate-press", "precision-sawmill", "fluid-pump", "fluid-tank", "gas-tank",
] as const;
export type PowerTopologyNode = Readonly<{
  key: string;
  x: number;
  y: number;
  z: number;
  kind: (typeof MACHINE_KINDS)[number] | PressureMachineKind | SpaceflightMachineKind;
  locationId: string;
  ownerId: string;
  facing: number;
  ports: Readonly<Record<PowerTopologyFace, PowerTopologyPort>>;
  enabled: boolean;
  /** Missing and empty channels both denote the default channel. */
  channel?: string;
}>;
export type PowerTopologyComponent = Readonly<{ id: string; nodeKeys: readonly string[] }>;
export type PowerTopologyResult = Readonly<{
  ok: boolean;
  reason: "ok" | "invalid-node" | "duplicate-node" | "node-limit" | "revision-exhausted";
  /** Monotonic for the lifetime of this cache, including invalidations/failures. */
  revision: number;
  rebuilt: boolean;
  /** All keys and each outgoing neighbor list are sorted by UTF-16 code-unit order. */
  edges: ReadonlyMap<string, readonly string[]>;
  /** Weak components of directed edges; disabled nodes are isolated singleton components. */
  components: readonly PowerTopologyComponent[];
  componentByNode: ReadonlyMap<string, string>;
}>;

export const MAX_POWER_TOPOLOGY_NODES = 256;
const FACES: readonly PowerTopologyFace[] = ["front", "back", "left", "right", "top", "bottom"];
const KINDS = new Set<string>([...MACHINE_KINDS, ...Object.keys(PRESSURE_CATALOG), ...Object.keys(SPACEFLIGHT_CATALOG)]);
const MODES = new Set(["disabled", "input", "output", "both", "passive", "pull", "service"]);
const DIRECTIONS = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]] as const;
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const position = (location: string, x: number, y: number, z: number) => JSON.stringify([location, x, y, z]);

/** Object.freeze(Map) still permits set/delete. Hide the backing Map from consumers. */
class ReadonlyTopologyMap<K, V> implements ReadonlyMap<K, V> {
  readonly #map: Map<K, V>;
  constructor(entries: Iterable<readonly [K, V]>) { this.#map = new Map(entries); Object.freeze(this); }
  get size() { return this.#map.size; }
  get(key: K) { return this.#map.get(key); }
  has(key: K) { return this.#map.has(key); }
  entries() { return this.#map.entries(); }
  keys() { return this.#map.keys(); }
  values() { return this.#map.values(); }
  [Symbol.iterator]() { return this.#map[Symbol.iterator](); }
  forEach(callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: unknown) {
    this.#map.forEach((value, key) => callback.call(thisArg, value, key, this));
  }
}

// Kept local to avoid a cycle when wayworks.ts imports this module. Clockwise, front=-Z.
function face(facing: number, dx: number, dy: number, dz: number): PowerTopologyFace {
  if (dy) return dy > 0 ? "top" : "bottom";
  const localX = facing === 1 ? dz : facing === 2 ? -dx : facing === 3 ? -dz : dx;
  const localZ = facing === 1 ? -dx : facing === 2 ? -dz : facing === 3 ? dx : dz;
  return localX ? localX > 0 ? "right" : "left" : localZ > 0 ? "back" : "front";
}

function validNode(node: PowerTopologyNode): boolean {
  return !!node && typeof node === "object" && !Array.isArray(node)
    && typeof node.key === "string" && node.key.length > 0
    && [node.x, node.y, node.z].every(Number.isSafeInteger)
    && KINDS.has(node.kind)
    && typeof node.locationId === "string" && node.locationId.length > 0
    && typeof node.ownerId === "string" && node.ownerId.length > 0
    && Number.isInteger(node.facing) && node.facing >= 0 && node.facing <= 3
    && typeof node.enabled === "boolean"
    && (node.channel === undefined || typeof node.channel === "string")
    && !!node.ports && typeof node.ports === "object" && !Array.isArray(node.ports)
    && FACES.every((side) => Object.hasOwn(node.ports, side) && MODES.has(node.ports[side]));
}

/**
 * Supply only currently loaded/authorized nodes; omitted nodes cannot bridge a boundary.
 * get() validates <=256 nodes and computes a canonical signature each time, but rebuilds
 * adjacency/components only on topology changes. Energy/progress/status are never retained.
 * Clear on world replacement even when placement keys happen to match. Never persist this cache.
 */
export class PowerTopologyCache {
  #revision = 0;
  #signature: string | undefined;
  #cached: PowerTopologyResult | undefined;

  clear(): void { this.#signature = undefined; this.#cached = undefined; }
  invalidate(): void { this.clear(); }

  get(nodes: readonly PowerTopologyNode[]): PowerTopologyResult {
    const fail = (reason: PowerTopologyResult["reason"]): PowerTopologyResult => {
      this.clear();
      if (this.#revision < Number.MAX_SAFE_INTEGER) this.#revision += 1;
      return Object.freeze({
        ok: false, reason, revision: this.#revision, rebuilt: true,
        edges: new ReadonlyTopologyMap<string, readonly string[]>([]),
        components: Object.freeze([]), componentByNode: new ReadonlyTopologyMap<string, string>([]),
      });
    };
    if (!Array.isArray(nodes)) return fail("invalid-node");
    if (nodes.length > MAX_POWER_TOPOLOGY_NODES) return fail("node-limit");
    const byPosition = new Map<string, PowerTopologyNode>();
    const keys = new Set<string>();
    for (const node of nodes) {
      if (!validNode(node)) return fail("invalid-node");
      const coordinate = position(node.locationId, node.x, node.y, node.z);
      if (keys.has(node.key) || byPosition.has(coordinate)) return fail("duplicate-node");
      keys.add(node.key);
      byPosition.set(coordinate, node);
    }
    const ordered = [...nodes].sort((a, b) => compare(a.key, b.key));
    const signature = JSON.stringify(ordered.map((node) => [
      node.key, node.x, node.y, node.z, node.kind, node.locationId, node.ownerId,
      node.facing, FACES.map((side) => node.ports[side]), node.enabled, node.channel ?? "",
    ]));
    if (this.#signature === signature && this.#cached) return this.#cached;
    if (this.#revision === Number.MAX_SAFE_INTEGER) return fail("revision-exhausted");

    const edges = new Map<string, readonly string[]>();
    const undirected = new Map(ordered.map((node) => [node.key, new Set<string>()]));
    for (const node of ordered) {
      const neighbors: string[] = [];
      if (node.enabled) for (const [dx, dy, dz] of DIRECTIONS) {
        const x = node.x + dx, y = node.y + dy, z = node.z + dz;
        if (![x, y, z].every(Number.isSafeInteger)) continue;
        const other = byPosition.get(position(node.locationId, x, y, z));
        if (!other?.enabled || node.ownerId !== other.ownerId || (node.channel ?? "") !== (other.channel ?? "")) continue;
        const output = node.ports[face(node.facing, dx, dy, dz)];
        const input = other.ports[face(other.facing, -dx, -dy, -dz)];
        if ((output === "output" || output === "both" || (output === "passive" && input === "pull")) && (input === "input" || input === "both" || input === "pull")) {
          neighbors.push(other.key);
          undirected.get(node.key)!.add(other.key);
          undirected.get(other.key)!.add(node.key);
        }
      }
      edges.set(node.key, Object.freeze(neighbors.sort(compare)));
    }

    const components: PowerTopologyComponent[] = [];
    const componentByNode = new Map<string, string>();
    const visited = new Set<string>();
    for (const root of ordered) {
      if (visited.has(root.key)) continue;
      const members = [root.key];
      visited.add(root.key);
      for (let cursor = 0; cursor < members.length; cursor += 1) {
        for (const neighbor of undirected.get(members[cursor])!) {
          if (!visited.has(neighbor)) { visited.add(neighbor); members.push(neighbor); }
        }
      }
      members.sort(compare);
      // Exact tuple encoding avoids collisions from delimiters or truncated hashes.
      const id = `power:${JSON.stringify([root.locationId, root.ownerId, root.channel ?? "", members])}`;
      for (const key of members) componentByNode.set(key, id);
      components.push(Object.freeze({ id, nodeKeys: Object.freeze(members) }));
    }
    this.#revision += 1;
    const result: PowerTopologyResult = Object.freeze({
      ok: true, reason: "ok", revision: this.#revision, rebuilt: true,
      edges: new ReadonlyTopologyMap(edges), components: Object.freeze(components),
      componentByNode: new ReadonlyTopologyMap([...componentByNode].sort(([a], [b]) => compare(a, b))),
    });
    this.#signature = signature;
    this.#cached = Object.freeze({ ...result, rebuilt: false });
    return result;
  }
}
