import assert from "node:assert/strict";
import test from "node:test";
import { commitExtract, commitInsert, resourceIdentity, simulateExtract, simulateInsert, transferResource,
  validResourcePacket, type ResourceEndpoint, type ResourcePacket } from "../app/game/wayworks-resources.ts";

const water = (quantity: number): ResourcePacket => ({ kind: "fluid", resource: "water", quantity });
const endpoint = (id = "tank", content: ResourcePacket | null = null, capacity = 1000): ResourceEndpoint =>
  ({ endpointId: id, locationId: "home", revision: 0, kind: content?.kind ?? "fluid", capacity, content });
const item = (count: number, serial = "one"): ResourcePacket => ({ kind: "item", quantity: count,
  slot: { item: 103, count, durability: 7, metadata: { serial, nested: { b: 2, a: 1 } } } });

test("integer quantity quotes commit only against exact endpoint, location, revision and contents", () => {
  const original = endpoint();
  const quote = simulateInsert(original, water(700))!;
  const result = commitInsert(original, quote);
  assert.equal(result.ok, true);
  assert.equal(result.endpoint.content?.quantity, 700);
  assert.equal(result.endpoint.revision, 1);
  assert.equal(original.content, null);
  for (const changed of [{ ...original, endpointId: "other" }, { ...original, locationId: "orbit" },
    { ...original, revision: 1 }, { ...original, content: water(1) }, { ...original, capacity: 1200 }]) {
    assert.equal(commitInsert(changed, quote).ok, false);
  }
  assert.equal(commitInsert(result.endpoint, quote).ok, false, "retry cannot insert twice");
  assert.equal(commitInsert(original, { ...quote, accepted: 701 }).ok, false);
  assert.equal(commitExtract(original, quote).ok, false);
});

test("partial capacity is backpressure, never resource loss or mixing", () => {
  const source = endpoint("pump", water(800));
  const destination = endpoint("tank", water(900));
  const moved = transferResource(source, destination, 500);
  assert.equal(moved.ok, true);
  assert.equal(moved.moved?.quantity, 100);
  assert.equal(moved.source.content?.quantity, 700);
  assert.equal(moved.destination.content?.quantity, 1000);
  const blocked = transferResource(moved.source, moved.destination, 500);
  assert.equal(blocked.ok, false);
  assert.strictEqual(blocked.source, moved.source);
  assert.strictEqual(blocked.destination, moved.destination);
  assert.equal(transferResource(source, endpoint("oil", { kind: "fluid", resource: "oil", quantity: 1 }), 1).ok, false);
  assert.equal(transferResource(source, { ...destination, locationId: "orbit" }, 1).ok, false);
});

test("item custody includes metadata and durability, with no shared mutable metadata", () => {
  const packet = item(8);
  const source = endpoint("input", packet, 64);
  const dest = { ...endpoint("output", null, 64), kind: "item" as const };
  const result = transferResource(source, dest, 3);
  assert.equal(result.ok, true);
  assert.equal(result.source.content?.quantity, 5);
  assert.equal(result.destination.content?.quantity, 3);
  assert.equal(resourceIdentity(result.destination.content!), resourceIdentity(packet));
  const stored = result.destination.content!;
  if (stored.kind !== "item" || packet.kind !== "item") throw new Error("test item");
  assert.notStrictEqual(stored.slot.metadata, packet.slot.metadata);
  stored.slot.metadata!.serial = "mutated";
  assert.equal(packet.slot.metadata!.serial, "one");
  assert.equal(transferResource(source, endpoint("different", item(1, "two"), 64), 1).ok, false);
});

test("all five resource kinds share bounded quote/commit semantics", () => {
  for (const kind of ["fluid", "chemical", "energy", "heat"] as const) {
    const packet: ResourcePacket = { kind, resource: kind === "chemical" ? "oxygen" : kind === "fluid" ? "water" : "joules", quantity: 123 };
    const source = endpoint("source", packet);
    const empty = { ...endpoint("destination"), kind };
    const result = transferResource(source, empty, 123);
    assert.equal(result.ok, true);
    assert.equal(result.source.content, null);
    assert.deepEqual(result.destination.content, packet);
    const quote = simulateExtract(result.destination, packet)!;
    assert.equal(commitExtract(result.destination, quote).endpoint.content, null);
  }
});

test("malformed, excessive, fractional and cyclic inputs fail closed", () => {
  for (const amount of [0, -1, 0.1, NaN, Infinity, 1_000_000_001]) assert.equal(simulateInsert(endpoint(), water(amount)), null);
  assert.equal(simulateInsert({ ...endpoint(), revision: Number.MAX_SAFE_INTEGER }, water(1)), null);
  assert.equal(transferResource(endpoint("same", water(1)), endpoint("same"), 1).ok, false);
  assert.equal(validResourcePacket(item(65)), false);
  const circular: Record<string, unknown> = {}; circular.self = circular;
  assert.equal(validResourcePacket({ kind: "item", quantity: 1, slot: { item: 103, count: 1, metadata: circular } }), false);
  assert.equal(validResourcePacket({ kind: "fluid", resource: "", quantity: 1 }), false);
});
