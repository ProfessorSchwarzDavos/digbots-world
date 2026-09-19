import assert from "node:assert/strict";
import test from "node:test";
import { deriveLocationSeed, homeLocation, locationAddress, locationId, locationStamp, parseLocationId, sameLocationStamp, scopedLocationKey, universeId } from "../app/game/location-address.ts";
import { canonicalJson, universeSha256 } from "../app/game/universe-json.ts";

test("location addresses are immutable canonical tuples with distinct owners and instances", () => {
  const home = homeLocation(universeId("world-one"));
  assert.ok(Object.isFrozen(home));
  assert.deepEqual(parseLocationId(locationId(home)), home);
  const other = locationAddress({ ...home, kind: "station", instanceId: "dock-1" });
  const foreign = homeLocation(universeId("world-two"));
  const keys = [home, other, foreign].map((owner) => scopedLocationKey(locationId(owner), -1, -64, 16, "chest:one"));
  assert.equal(new Set(keys).size, 3);
  assert.notEqual(scopedLocationKey(locationId(home), "a", "b"), scopedLocationKey(locationId(home), "a,b"));
  assert.equal(scopedLocationKey(locationId(home), -0), scopedLocationKey(locationId(home), 0));
});

test("malformed, ambiguous and unsupported location identities fail closed", () => {
  const home = homeLocation(universeId("world-one"));
  for (const id of ["", " a", "a/../b", "a//b", "a\u0000", "a".repeat(161)]) assert.throws(() => universeId(id));
  for (const patch of [{ kind: "planet" }, { instanceId: "second" }, { bodyId: "talon//hope" }, { extra: true }]) assert.throws(() => locationAddress({ ...home, ...patch }));
  for (const id of ["{}", "[]", locationId(home).replace("[1,", "[2,"), ` ${locationId(home)}`]) assert.throws(() => parseLocationId(id));
  assert.throws(() => scopedLocationKey(locationId(home), 0.5));
});

test("location stamps validate epoch and revision before comparing", () => {
  const id = locationId(homeLocation(universeId("world-one")));
  const stamp = locationStamp({ locationId: id, epoch: 1, revision: 0 });
  assert.ok(sameLocationStamp(stamp, { ...stamp }));
  assert.ok(!sameLocationStamp(stamp, { ...stamp, epoch: 2 }));
  for (const patch of [{ epoch: 0 }, { revision: -1 }, { revision: Infinity }, { epoch: "1" }]) assert.throws(() => locationStamp({ ...stamp, ...patch }));
});

test("seed domains and tuple boundaries are stable and distinct", () => {
  // Independently calculated with BigInt multiplication/modulo, not Math.imul.
  assert.equal(deriveLocationSeed("system", "CF1-HOME", "waystar", 1), "v1-system-d16042b5");
  assert.equal(deriveLocationSeed("chunk", "snow-雪", -17, 3), "v1-chunk-58d47c4f");
  assert.notEqual(deriveLocationSeed("weather", "a", 1), deriveLocationSeed("encounter", "a", 1));
  assert.notEqual(deriveLocationSeed("chunk", "a", -1, 2), deriveLocationSeed("chunk", "a", 1, -2));
  assert.notEqual(deriveLocationSeed("body", "a,b"), deriveLocationSeed("body", "a", "b"));
  assert.throws(() => deriveLocationSeed("system", NaN));
});

test("canonical checksums are ordered, finite, and preserve exact legacy strings", async () => {
  assert.equal(canonicalJson({ z: 1, a: { b: true } }), '{"a":{"b":true},"z":1}');
  assert.equal(await universeSha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.notEqual(await universeSha256('{"a":1}'), await universeSha256('{ "a": 1 }'));
  assert.throws(() => canonicalJson({ nan: NaN }));
  assert.throws(() => canonicalJson(new Date()));
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
  assert.throws(() => canonicalJson(cyclic));
});
