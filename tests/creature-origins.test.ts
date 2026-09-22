import assert from "node:assert/strict";
import test from "node:test";
import { assertCreatureOriginsAgree, newCreatureOrigins, readCreatureOrigins } from "../app/game/creature-origins";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";

const home = locationId(homeLocation(universeId("origin-test")));
const orbit = locationId(locationAddress({ ...homeLocation(universeId("origin-test")), kind: "orbit", instanceId: "low" }));

test("new origins are explicit canonical locations, not parsed from specimen IDs", () => {
  assert.deepEqual(newCreatureOrigins(home, false), { specimenOriginLocationId: home });
  const prime = newCreatureOrigins(home, true);
  assert.deepEqual(prime, { specimenOriginLocationId: home, encounterOriginLocationId: home });
  assert(Object.isFrozen(prime));
  assert.notDeepEqual(newCreatureOrigins(orbit, true), prime, "same bare Prime ID may have a distinct origin");
});

test("legacy missing origins remain absent and unrelated metadata stays untouched", () => {
  const source = { entityId: "prime:peelop:0:0:specimen", custom: "opaque", currentLocation: orbit };
  const before = structuredClone(source), now = Date.now;
  Date.now = () => { throw Error("origin inspection read clock"); };
  try { assert.deepEqual(readCreatureOrigins(source), {}); } finally { Date.now = now; }
  assert.deepEqual(source, before); assert(!Object.isFrozen(source));
  assertCreatureOriginsAgree({}, {});
  assert.throws(() => assertCreatureOriginsAgree({}, newCreatureOrigins(home, false)), /disagree/);
});

test("origins reject malformed, noncanonical, undefined, accessor and cross-universe values", () => {
  for (const value of [undefined, null, "home", ` ${home}`, 7])
    assert.throws(() => readCreatureOrigins({ specimenOriginLocationId: value }));
  let accessed = false;
  assert.throws(() => readCreatureOrigins({ get specimenOriginLocationId() { accessed = true; return home; } }), /accessor/);
  assert.equal(accessed, false);
  const foreign = locationId(homeLocation(universeId("foreign")));
  assert.throws(() => readCreatureOrigins({ specimenOriginLocationId: home, encounterOriginLocationId: foreign }), /different universes/);
  assert.throws(() => assertCreatureOriginsAgree(newCreatureOrigins(home, true), newCreatureOrigins(orbit, true)), /disagree/);
});

test("cold and carried origins retain birth and encounter provenance rather than current position", () => {
  const origin = newCreatureOrigins(home, true);
  let source = { ...origin, x: 10, y: 20, z: -30, holderLocation: orbit };
  for (let n = 0; n < 100; n++) {
    source = JSON.parse(JSON.stringify(source));
    assert.deepEqual(readCreatureOrigins(source), origin);
  }
  assertCreatureOriginsAgree(source, { ...origin, unrelated: { x: 999 } });
});
