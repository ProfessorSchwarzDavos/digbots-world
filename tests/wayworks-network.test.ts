import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_POWER_TOPOLOGY_NODES, PowerTopologyCache,
  type PowerTopologyFace, type PowerTopologyNode, type PowerTopologyPort,
} from "../app/game/wayworks-network.ts";

const ports = (mode: PowerTopologyPort = "both") => ({
  front: mode, back: mode, left: mode, right: mode, top: mode, bottom: mode,
});
const node = (key: string, x = 0, patch: Partial<PowerTopologyNode> = {}): PowerTopologyNode => ({
  key, x, y: 0, z: 0, kind: "grid-cable", locationId: "home", ownerId: "player",
  facing: 0, ports: ports(), enabled: true, ...patch,
});
const edgePairs = (result: ReturnType<PowerTopologyCache["get"]>) => [...result.edges];

test("directed edges and weak components are deterministic and include isolated nodes", () => {
  const nodes = [node("sink", 2, { ports: ports("input") }), node("source", 0, { ports: ports("output") }), node("cable", 1), node("isolated", 8)];
  const cache = new PowerTopologyCache();
  const result = cache.get(nodes);
  assert.equal(result.ok, true);
  assert.equal(result.rebuilt, true);
  assert.equal(result.revision, 1);
  assert.deepEqual(edgePairs(result), [["cable", ["sink"]], ["isolated", []], ["sink", []], ["source", ["cable"]]]);
  assert.deepEqual(result.components.map((component) => component.nodeKeys), [["cable", "sink", "source"], ["isolated"]]);
  assert.equal(result.componentByNode.get("sink"), result.componentByNode.get("source"));
  assert.notEqual(result.componentByNode.get("sink"), result.componentByNode.get("isolated"));
  const reordered = cache.get([...nodes].reverse());
  assert.equal(reordered.rebuilt, false);
  assert.equal(reordered.revision, 1);
  assert.strictEqual(reordered.edges, result.edges);
  assert.deepEqual(new PowerTopologyCache().get([...nodes].reverse()).components, result.components);
});

test("energy, progress, status and machine revision changes reuse topology without retaining state", () => {
  const cache = new PowerTopologyCache();
  const initial = cache.get([node("a"), node("b", 1)]);
  const changing = [node("a"), node("b", 1)].map((entry) => ({
    ...entry, energyJ: 123, progress: 12, status: "generating", revision: 500,
    solarExposure: 0.5, generationRemainder: 25, transferRemainder: 12,
  }));
  const reused = cache.get(changing);
  assert.equal(reused.rebuilt, false);
  assert.equal(reused.revision, initial.revision);
  assert.strictEqual(reused.components, initial.components);
  assert.strictEqual(cache.get(changing), reused);
  assert.deepEqual(Object.keys(initial.components[0]), ["id", "nodeKeys"]);
});

test("every topology field invalidates, while membership preserves derived IDs", () => {
  const patches: Partial<PowerTopologyNode>[] = [
    { key: "renamed" }, { x: 5 }, { y: 1 }, { z: 1 }, { kind: "field-battery" },
    { facing: 1 }, { ports: { ...ports(), top: "disabled" } }, { enabled: false },
    { channel: "blue" }, { ownerId: "other" }, { locationId: "orbit" },
  ];
  for (const patch of patches) {
    const cache = new PowerTopologyCache();
    const first = cache.get([node("a"), node("b", 1)]);
    const next = cache.get([node("a", 0, patch), node("b", 1)]);
    assert.equal(next.ok, true, JSON.stringify(patch));
    assert.equal(next.rebuilt, true, JSON.stringify(patch));
    assert.equal(next.revision, first.revision + 1);
    assert.equal(cache.get([node("a", 0, patch), node("b", 1)]).rebuilt, false);
    if (patch.kind || patch.facing || patch.ports) assert.deepEqual(next.components, first.components);
  }
});

test("omitting an unloaded bridge splits the network; adding it restores the same derived ID", () => {
  const cache = new PowerTopologyCache();
  const chain = [node("a"), node("bridge", 1), node("c", 2)];
  const loaded = cache.get(chain);
  const split = cache.get([chain[0], chain[2]]);
  assert.equal(split.revision, loaded.revision + 1);
  assert.deepEqual(split.components.map((component) => component.nodeKeys), [["a"], ["c"]]);
  assert.deepEqual(edgePairs(split), [["a", []], ["c", []]]);
  const restored = cache.get(chain);
  assert.equal(restored.revision, split.revision + 1);
  assert.deepEqual(restored.components, loaded.components);
});

test("owner, location, channel and disabled boundaries isolate both directed edges and networks", () => {
  for (const patch of [{ ownerId: "other" }, { locationId: "orbit" }, { channel: "blue" }, { enabled: false }]) {
    const result = new PowerTopologyCache().get([node("a"), node("b", 1, patch)]);
    assert.deepEqual(edgePairs(result), [["a", []], ["b", []]]);
    assert.equal(result.components.length, 2);
  }
  const cache = new PowerTopologyCache();
  const defaultChannel = cache.get([node("a"), node("b", 1, { channel: "" })]);
  assert.equal(defaultChannel.components.length, 1);
  assert.equal(cache.get([node("a", 0, { channel: "" }), node("b", 1)]).rebuilt, false);
  assert.equal(cache.get([node("a", 0, { channel: "blue" }), node("b", 1, { channel: "blue" })]).components.length, 1);
});

test("all six local faces rotate correctly at each of the four orientations", () => {
  const expected: Record<PowerTopologyFace, readonly (readonly [number, number, number])[]> = {
    front: [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]],
    back: [[0, 0, 1], [-1, 0, 0], [0, 0, -1], [1, 0, 0]],
    right: [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]],
    left: [[-1, 0, 0], [0, 0, -1], [1, 0, 0], [0, 0, 1]],
    top: [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]],
    bottom: [[0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]],
  };
  const directions = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
  for (let facing = 0; facing < 4; facing += 1) for (const side of Object.keys(expected) as PowerTopologyFace[]) {
    const center = node("center", 0, { facing, ports: { ...ports("disabled"), [side]: "output" } });
    const neighbors = directions.map(([x, y, z], index) => node(`neighbor-${index}`, x, { y, z, ports: ports("input") }));
    const result = new PowerTopologyCache().get([center, ...neighbors]);
    const [x, y, z] = expected[side][facing];
    const target = neighbors.find((entry) => entry.x === x && entry.y === y && entry.z === z)!;
    assert.deepEqual(result.edges.get("center"), [target.key], `${side} facing ${facing}`);
    const reversed = new PowerTopologyCache().get([
      { ...center, ports: { ...ports("disabled"), [side]: "input" } },
      ...neighbors.map((entry) => ({ ...entry, ports: ports("output") })),
    ]);
    for (const neighbor of neighbors) assert.deepEqual(reversed.edges.get(neighbor.key), neighbor.key === target.key ? ["center"] : []);
  }
});

test("malformed, duplicate and oversized inputs fail atomically and invalidate previous cache", () => {
  const cache = new PowerTopologyCache();
  const baseline = [node("a"), node("b", 1)];
  const invalidPatches = [
    { key: "" }, { x: NaN }, { y: Infinity }, { z: 0.5 }, { x: Number.MAX_SAFE_INTEGER + 1 },
    { kind: "__proto__" }, { locationId: "" }, { ownerId: null }, { facing: 4 }, { facing: 1.5 },
    { enabled: 1 }, { channel: null }, { ports: null }, { ports: {} },
    { ports: { ...ports(), front: "invented" } }, { ports: Object.create(ports()) },
  ];
  const cases: [unknown, string][] = invalidPatches.map((patch) => [[node("a", 0, patch as Partial<PowerTopologyNode>), baseline[1]], "invalid-node"]);
  cases.push([null, "invalid-node"], [[null], "invalid-node"], [new Array(1), "invalid-node"],
    [[node("a"), node("a", 1)], "duplicate-node"], [[node("a"), node("other")], "duplicate-node"],
    [[node("a"), node("other", 0, { ownerId: "other" })], "duplicate-node"],
    [Array.from({ length: MAX_POWER_TOPOLOGY_NODES + 1 }, (_, i) => node(`n${i}`, i)), "node-limit"]);
  for (const [input, reason] of cases) {
    const first = cache.get(baseline);
    const failed = cache.get(input as PowerTopologyNode[]);
    assert.equal(failed.ok, false);
    assert.equal(failed.reason, reason);
    assert.equal(failed.edges.size, 0);
    assert.equal(failed.components.length, 0);
    assert.equal(failed.componentByNode.size, 0);
    assert.ok(failed.revision > first.revision);
    const restored = cache.get(baseline);
    assert.equal(restored.rebuilt, true);
    assert.ok(restored.revision > failed.revision);
  }
});

test("exactly 256 nodes are supported and the empty graph can be cached", () => {
  const cache = new PowerTopologyCache();
  const result = cache.get(Array.from({ length: MAX_POWER_TOPOLOGY_NODES }, (_, i) => node(`n${i}`, i)));
  assert.equal(result.ok, true);
  assert.equal(result.edges.size, MAX_POWER_TOPOLOGY_NODES);
  assert.equal(result.components.length, 1);
  assert.equal(result.components[0].nodeKeys.length, MAX_POWER_TOPOLOGY_NODES);
  const empty = cache.get([]);
  assert.equal(empty.ok, true);
  assert.equal(empty.components.length, 0);
  assert.equal(cache.get([]).rebuilt, false);
});

test("explicit world invalidation and clear retain monotonic revision", () => {
  const cache = new PowerTopologyCache();
  const nodes = [node("a")];
  const first = cache.get(nodes);
  cache.invalidate();
  const next = cache.get(nodes);
  cache.clear();
  const last = cache.get(nodes);
  assert.equal(next.revision, first.revision + 1);
  assert.equal(last.revision, next.revision + 1);
  assert.equal(next.rebuilt, true);
  assert.equal(last.rebuilt, true);
  assert.deepEqual(last.components, first.components);
});

test("hostile keys and delimiter-heavy identifiers remain safe and output cannot poison cache", () => {
  const cache = new PowerTopologyCache();
  const first = cache.get([node("__proto__"), node("constructor", 1), node("toString", 2)]);
  assert.equal(first.edges.size, 3);
  assert.deepEqual(first.edges.get("__proto__"), ["constructor"]);
  assert.equal(first.components.length, 1);
  assert.equal("set" in first.edges, false);
  assert.equal("delete" in first.componentByNode, false);
  assert.throws(() => (first.edges.get("__proto__") as string[]).push("wrong"), TypeError);
  assert.throws(() => (first.components[0].nodeKeys as string[]).pop(), TypeError);
  assert.throws(() => { (first.components as unknown[]).length = 0; }, TypeError);
  first.edges.forEach((_value, _key, map) => assert.strictEqual(map, first.edges));
  const one = cache.get([node("x", 0, { locationId: 'a","b', ownerId: "c" })]);
  const two = cache.get([node("x", 0, { locationId: "a", ownerId: 'b","c' })]);
  assert.notEqual(one.components[0].id, two.components[0].id);
});

test("same coordinates in different locations are valid; extreme coordinates cannot create false adjacency", () => {
  const separated = new PowerTopologyCache().get([node("a"), node("b", 0, { locationId: "orbit" })]);
  assert.equal(separated.ok, true);
  assert.equal(separated.components.length, 2);
  const extreme = new PowerTopologyCache().get([node("max", Number.MAX_SAFE_INTEGER), node("before", Number.MAX_SAFE_INTEGER - 1)]);
  assert.deepEqual(edgePairs(extreme), [["before", ["max"]], ["max", ["before"]]]);
});

test("all fixed CF4 machine kinds participate in directed adjacency and cache invalidation", () => {
  const kinds = [
    "heat-engine", "wind-rotor", "waterwheel-generator", "biofuel-engine", "grid-battery",
    "ship-battery-bank", "powered-crusher", "enrichment-mill", "electric-smelter", "alloy-infuser",
    "plate-press", "precision-sawmill", "fluid-pump", "fluid-tank", "gas-tank",
  ] as const;
  const cache = new PowerTopologyCache();
  let revision = 0;
  let componentId: string | undefined;
  for (const kind of kinds) {
    const nodes = [node("machine", 0, { kind, ports: ports("output") }), node("cable", 1)];
    const result = cache.get(nodes);
    assert.equal(result.ok, true, kind);
    assert.equal(result.rebuilt, true, kind);
    assert.equal(result.revision, ++revision, kind);
    assert.deepEqual(edgePairs(result), [["cable", []], ["machine", ["cable"]]], kind);
    assert.deepEqual(result.components[0].nodeKeys, ["cable", "machine"], kind);
    if (componentId !== undefined) assert.equal(result.components[0].id, componentId);
    componentId = result.components[0].id;
    assert.equal(cache.get(nodes).rebuilt, false, kind);
  }
});
