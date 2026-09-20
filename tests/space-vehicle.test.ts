import assert from "node:assert/strict";
import test from "node:test";
import { Item, type InventorySlot } from "../app/game/data.ts";
import { homeLocation, locationAddress, locationId, universeId, type LocationStamp } from "../app/game/location-address.ts";
import {
  applySpaceVehicleAction, assertVehicleCommitReady, commitVehicleArrival, createSurveyHopper, planSpaceVehicleTravel,
  quoteVehicleSupply, remapSpacefleetUniverse, SURVEY_HOPPER_CAPACITY, validateSpacefleetSave, validateSpacefleetUniverse, VEHICLE_RESOURCES,
  type SpacefleetSave, type SpaceVehicleAction, type VehicleActionContext, type VehicleResources, type VehicleTransferSource,
} from "../app/game/space-vehicle.ts";

const universe = universeId("test-spacefleet");
const home = locationId(homeLocation(universe));
const orbit = locationId(locationAddress({ ...homeLocation(universe), kind: "orbit", instanceId: "low" }));
const moon = locationId(locationAddress({ ...homeLocation(universe), bodyId: "blockwild/morrow" }));
const originStamp: LocationStamp = { locationId: home, epoch: 1, revision: 4 };
const destinationStamp: LocationStamp = { locationId: orbit, epoch: 1, revision: 2 };
const clone = <T>(value: T): T => structuredClone(value);
const stores: VehicleResources = { ...SURVEY_HOPPER_CAPACITY };
function fresh(): SpacefleetSave { return validateSpacefleetSave({ schema: 1, vehicles: { hopper: createSurveyHopper("hopper", "pilot", home, [12, 90, -3]) } }); }
function context(fleet: SpacefleetSave, extra: Partial<VehicleActionContext> = {}): VehicleActionContext {
  return { actorId: "pilot", locationId: fleet.vehicles.hopper.locationId, expectedVehicleRevision: fleet.vehicles.hopper.revision, originStamp, destinationStamp, ...extra };
}
function act(fleet: SpacefleetSave, action: Omit<SpaceVehicleAction, "vehicleId" | "actionId"> & Record<string, unknown>, extra: Partial<VehicleActionContext> = {}) {
  return applySpaceVehicleAction(fleet, context(fleet, extra), { vehicleId: "hopper", actionId: `a${fleet.vehicles.hopper.revision + 1}`, ...action } as SpaceVehicleAction);
}
function ready(): SpacefleetSave {
  const fleet = clone(fresh()); Object.assign(fleet.vehicles.hopper, stores);
  let next = act(validateSpacefleetSave(fleet), { type: "board" }).fleet;
  next = act(next, { type: "consent", consent: true }).fleet;
  return next;
}
function reserved(): SpacefleetSave { return act(ready(), { type: "reserve", transactionId: "trip-1" }).fleet; }
function arrivalReady(): SpacefleetSave {
  let fleet = reserved();
  while (fleet.vehicles.hopper.trip!.status !== "commit-ready") fleet = act(fleet, { type: "step" }).fleet;
  return fleet;
}
const cargo: InventorySlot = { item: Item.Stick, count: 1, durability: 12, metadata: { named: "Exact specimen", nested: { genes: [1, 3, { hue: "gold" }], state: { oxygen: 19.4 } } } };
function source(): VehicleTransferSource { return { id: "gantry", revision: 9, locationId: home, resources: { ...stores }, cargo: [clone(cargo)], cargoOwnership: ["unique-cargo-1"] }; }

test("factory/migration create one empty rechargeable nine-slot Hopper with no shared aliases", () => {
  assert.deepEqual(validateSpacefleetSave(undefined), { schema: 1, vehicles: {} });
  const fleet = fresh(), ship = fleet.vehicles.hopper;
  assert.equal(ship.cargo.length, 9); assert.equal(ship.passengers.length, 0); assert.equal(ship.batteryJoules, 0);
  assert.ok(Object.isFrozen(ship.transform.position)); assert.ok(Object.isFrozen(ship.modules[0].metadata));
  assert.equal(quoteVehicleSupply(ship, "batteryJoules", 10, 20), 10);
  const input = clone(fleet); const output = validateSpacefleetSave(input);
  input.vehicles.hopper.modules[0].metadata.changed = true;
  assert.equal(output.vehicles.hopper.modules[0].metadata.changed, undefined);
});

test("supply separates stores, caps to free capacity/source amount and returns exact debit", () => {
  let fleet = fresh(); const origin = source(); origin.resources.batteryJoules = 450;
  const result = act(fleet, { type: "supply", resource: "batteryJoules", amount: 900, sourceId: "gantry", sourceRevision: 9 }, { source: origin });
  assert.equal(result.vehicle.batteryJoules, 450); assert.equal(fleet.vehicles.hopper.batteryJoules, 0);
  assert.deepEqual(result.externalWrites, [{ kind: "resource-debit", sourceId: "gantry", expectedRevision: 9, resource: "batteryJoules", amount: 450 }]);
  assert.equal(result.vehicle.fuelMl, 0); assert.equal(origin.resources.batteryJoules, 450);
  fleet = clone(result.fleet); fleet.vehicles.hopper.fuelMl = stores.fuelMl - 4;
  const capped = act(fleet, { type: "supply", resource: "fuelMl", amount: 100, sourceId: "gantry", sourceRevision: 9 }, { source: source() });
  assert.equal(capped.vehicle.fuelMl, stores.fuelMl); assert.equal((capped.externalWrites[0] as { amount: number }).amount, 4);
  assert.throws(() => act(capped.fleet, { type: "supply", resource: "fuelMl", amount: 100, sourceId: "gantry", sourceRevision: 9 }, { source: source() }), /capacity/);
});

test("cargo transfer quotes exact nested item state and fleet forbids duplicate custody", () => {
  const origin = source(); const input = fresh();
  const inserted = act(input, { type: "cargo-in", sourceId: "gantry", sourceRevision: 9, sourceSlot: 0, vehicleSlot: 3 }, { source: origin });
  assert.deepEqual(inserted.vehicle.cargo[3], cargo); assert.deepEqual(inserted.externalWrites[0], { kind: "cargo-debit", sourceId: "gantry", expectedRevision: 9, slot: 0, cargo, ownershipId: "unique-cargo-1" });
  (origin.cargo[0]!.metadata!.nested as { genes: unknown[] }).genes[0] = 999;
  assert.deepEqual(inserted.vehicle.cargo[3], cargo);
  assert.throws(() => act(inserted.fleet, { type: "cargo-in", sourceId: "gantry", sourceRevision: 9, sourceSlot: 0, vehicleSlot: 4 }, { source: source() }), /duplicate cargo/);
  const extracted = act(inserted.fleet, { type: "cargo-out", vehicleSlot: 3 });
  assert.equal(extracted.vehicle.cargo[3], null); assert.equal(extracted.vehicle.cargoOwnership[3], null);
  assert.deepEqual(extracted.externalWrites, [{ kind: "cargo-credit", actorId: "pilot", cargo, ownershipId: "unique-cargo-1" }]);
  const duplicate = clone(inserted.fleet); duplicate.vehicles.other = clone(createSurveyHopper("other", "pilot", home, [0, 0, 0]));
  duplicate.vehicles.other.cargo[0] = clone(cargo); duplicate.vehicles.other.cargoOwnership[0] = "unique-cargo-1";
  assert.throws(() => validateSpacefleetSave(duplicate), /duplicate cargo/);
});

test("revision, location, action and transaction replays fail closed without changing input", () => {
  const fleet = ready(), before = JSON.stringify(fleet);
  assert.throws(() => act(fleet, { type: "reserve", transactionId: "t" }, { expectedVehicleRevision: 0 }), /stale/);
  assert.throws(() => act(fleet, { type: "reserve", transactionId: "t" }, { locationId: orbit }), /location/);
  assert.throws(() => applySpaceVehicleAction(fleet, context(fleet), { type: "board", vehicleId: "hopper", actionId: "a1" }), /replayed/);
  assert.equal(JSON.stringify(fleet), before);
  let aborted = act(reserved(), { type: "abort" }).fleet;
  assert.throws(() => act(aborted, { type: "reserve", transactionId: "trip-1" }), /replayed transaction/);
  aborted = act(aborted, { type: "reserve", transactionId: "trip-2" }).fleet;
  assert.equal(aborted.vehicles.hopper.phase, "countdown");
});

test("permissions are independent and a passenger cannot occupy two ships", () => {
  const fleet = fresh();
  assert.throws(() => act(fleet, { type: "board" }, { actorId: "guest" }), /permission/);
  const access = { ...fleet.vehicles.hopper.access, board: "trusted" as const };
  const shared = act(fleet, { type: "access", trustedIds: ["guest"], access }).fleet;
  const boarded = act(shared, { type: "board" }, { actorId: "guest" }).fleet;
  assert.throws(() => act(boarded, { type: "cargo-out", vehicleSlot: 0 }, { actorId: "guest" }), /permission/);
  assert.throws(() => act(boarded, { type: "access", trustedIds: [], access }, { actorId: "guest" }), /permission/);
  const duplicate = clone(boarded); duplicate.vehicles.other = clone(createSurveyHopper("other", "guest", home, [0, 0, 0]));
  duplicate.vehicles.other.passengers = clone(duplicate.vehicles.hopper.passengers);
  assert.throws(() => validateSpacefleetSave(duplicate), /duplicate passenger/);
});

test("countdown demands consent; withdraw/disconnect aborts without consuming reserved resources", () => {
  const boarded = act(fresh(), { type: "board" }).fleet;
  assert.throws(() => act(boarded, { type: "reserve", transactionId: "bad" }), /consent/);
  const fleet = reserved();
  assert.deepEqual(VEHICLE_RESOURCES.map(k => fleet.vehicles.hopper[k]), VEHICLE_RESOURCES.map(k => stores[k]));
  const withdrawn = act(fleet, { type: "consent", consent: false });
  assert.equal(withdrawn.vehicle.trip, null); assert.equal(withdrawn.vehicle.phase, "parked");
  const disconnected = act(fleet, { type: "disconnect" });
  assert.equal(disconnected.vehicle.trip, null); assert.equal(disconnected.vehicle.passengers.length, 0);
  assert.deepEqual(disconnected.externalWrites, [{ kind: "passenger-release", actorId: "pilot", locationId: home, position: [12, 90, -3] }]);
  for (const k of VEHICLE_RESOURCES) assert.equal(disconnected.vehicle[k], stores[k]);
});

test("each deterministic flight phase survives cold serialization with exact conservation and cargo", () => {
  let fleet = ready(); fleet = act(fleet, { type: "cargo-in", sourceId: "gantry", sourceRevision: 9, sourceSlot: 0, vehicleSlot: 0 }, { source: source() }).fleet;
  fleet = act(fleet, { type: "reserve", transactionId: "cargo-trip" }).fleet;
  const initial = clone(fleet.vehicles.hopper), phases = ["countdown"];
  while (fleet.vehicles.hopper.trip!.status !== "commit-ready") {
    const roundTrip = validateSpacefleetSave(JSON.parse(JSON.stringify(fleet)));
    assert.deepEqual(act(roundTrip, { type: "step" }).fleet, act(fleet, { type: "step" }).fleet);
    fleet = act(roundTrip, { type: "step" }).fleet;
    const v = fleet.vehicles.hopper; phases.push(v.phase);
    for (const k of VEHICLE_RESOURCES) assert.equal(v[k] + v.trip!.spent[k], initial[k]);
    assert.deepEqual(v.cargo, initial.cargo); assert.deepEqual(v.modules, initial.modules); assert.equal(v.hull, initial.hull);
    assert.equal(v.locationId, home);
  }
  assert.deepEqual(phases, ["countdown", "ascent", "orbit", "approach", "descent"]);
  const ship = fleet.vehicles.hopper;
  assertVehicleCommitReady(ship, "cargo-trip", originStamp, destinationStamp);
  const arrived = commitVehicleArrival(ship, { transactionId: "cargo-trip", originStamp, destinationStamp, position: [0, 20, 0], actionId: "arrive-cargo-trip" });
  assert.equal(arrived.locationId, orbit); assert.equal(arrived.phase, "orbit"); assert.equal(arrived.trip, null);
  for (const k of VEHICLE_RESOURCES) assert.equal(arrived[k], ship[k]);
  assert.deepEqual(arrived.cargo, ship.cargo); assert.deepEqual(arrived.cargoOwnership, ship.cargoOwnership); assert.deepEqual(arrived.passengers, ship.passengers);
  assert.deepEqual(arrived.velocity, ship.velocity); assert.deepEqual(arrived.modules, ship.modules); assert.equal(arrived.hull, ship.hull);
});

test("committed disconnect keeps custody; no cargo/supply/abort/consent mutation can bypass flight", () => {
  const ascending = act(reserved(), { type: "step" }).fleet;
  const disconnected = act(ascending, { type: "disconnect" });
  assert.equal(disconnected.vehicle.passengers[0].connected, false); assert.equal(disconnected.externalWrites.length, 0);
  assert.equal(disconnected.vehicle.trip!.status, "committed");
  const resumed = act(validateSpacefleetSave(JSON.parse(JSON.stringify(disconnected.fleet))), { type: "reconnect" }).fleet;
  assert.equal(resumed.vehicles.hopper.passengers[0].connected, true);
  for (const type of ["abort", "leave"] as const) assert.throws(() => act(resumed, { type }), /countdown|travel/);
  assert.throws(() => act(resumed, { type: "consent", consent: false }), /departure/);
  assert.throws(() => act(resumed, { type: "cargo-out", vehicleSlot: 0 }), /frozen/);
  assert.throws(() => act(resumed, { type: "supply", resource: "batteryJoules", amount: 1, sourceId: "gantry", sourceRevision: 9 }, { source: source() }), /frozen/);
});

test("arrival helpers reject early commit, wrong transaction and stale source/destination stamps", () => {
  const flight = arrivalReady().vehicles.hopper;
  assert.throws(() => assertVehicleCommitReady(reserved().vehicles.hopper, "trip-1", originStamp, destinationStamp), /not ready/);
  assert.throws(() => assertVehicleCommitReady(flight, "other", originStamp, destinationStamp), /not ready/);
  assert.throws(() => assertVehicleCommitReady(flight, "trip-1", { ...originStamp, revision: 5 }, destinationStamp), /not ready/);
  assert.throws(() => assertVehicleCommitReady(flight, "trip-1", originStamp, { ...destinationStamp, epoch: 2 }), /not ready/);
  assert.throws(() => act(reserved(), { type: "step" }, { destinationStamp: { ...destinationStamp, revision: 3 } }), /stale route/);
  assert.throws(() => act(arrivalReady(), { type: "step" }), /no flight step/);
});

test("route requires real first orbit, finite reserves and working modules; Morrow transfer is deterministic", () => {
  const fleet = ready(), ship = fleet.vehicles.hopper;
  assert.throws(() => planSpaceVehicleTravel(ship, originStamp, { ...destinationStamp, locationId: moon }, "skip-orbit"), /first reach/);
  for (const k of VEHICLE_RESOURCES) {
    const empty = clone(ship); empty[k] = 0;
    assert.throws(() => planSpaceVehicleTravel(empty, originStamp, destinationStamp, "empty"), new RegExp(k));
  }
  const damaged = clone(ship); damaged.modules[0].integrity = 0;
  assert.throws(() => planSpaceVehicleTravel(damaged, originStamp, destinationStamp, "damaged"), /modules/);
  const arrived = commitVehicleArrival(arrivalReady().vehicles.hopper, { transactionId: "trip-1", originStamp, destinationStamp, position: [0, 0, 0], actionId: "arrive" });
  const onward = planSpaceVehicleTravel(arrived, destinationStamp, { ...originStamp, locationId: moon }, "morrow");
  assert.equal(onward.steps[0].phase, "transfer"); assert.equal(onward.steps.at(-1)!.phase, "descent");
});

test("validator rejects malformed, nonfinite, tampered travel and replay state without repairing it", () => {
  const mutations: ((fleet: SpacefleetSave) => void)[] = [
    f => { f.vehicles.hopper.fuelMl = Infinity; }, f => { f.vehicles.hopper.oxygenMl = -1; },
    f => { f.vehicles.hopper.batteryJoules = .5; }, f => { f.vehicles.hopper.transform.position[0] = NaN; },
    f => { f.vehicles.hopper.cargo.pop(); }, f => { f.vehicles.hopper.passengers[0].consent = false; },
    f => { f.vehicles.hopper.trip!.spent.fuelMl++; }, f => { f.vehicles.hopper.trip!.steps[0].cost.fuelMl = 0; },
    f => { f.vehicles.hopper.journal[1].actionId = f.vehicles.hopper.journal[0].actionId; },
    f => { f.vehicles.hopper.modules[0].metadata.value = Infinity; },
  ];
  for (const change of mutations) { const invalid = clone(reserved()); change(invalid); assert.throws(() => validateSpacefleetSave(invalid)); }
  assert.throws(() => validateSpacefleetSave({ schema: 2, vehicles: {} }), /schema/);
  assert.throws(() => act(fresh(), { type: "supply", resource: "batteryJoules", amount: NaN, sourceId: "gantry", sourceRevision: 9 }, { source: source() }), /amount/);
});

test("archive remap preserves in-flight custody/accounting and inert replay protection", () => {
  const original = act(reserved(), { type: "step" }).fleet, target = universeId("imported-spacefleet");
  const imported = remapSpacefleetUniverse(original, universe, target), ship = imported.vehicles.hopper;
  assert.equal(ship.revision, original.vehicles.hopper.revision + 1); assert.equal(ship.journal.at(-1)!.kind, "import-boundary");
  assert.deepEqual(ship.trip!.spent, original.vehicles.hopper.trip!.spent); assert.deepEqual(ship.passengers, original.vehicles.hopper.passengers);
  assert.equal(ship.trip!.stepIndex, 1); assert.notEqual(ship.locationId, home);
  validateSpacefleetUniverse(imported, target);
  assert.throws(() => validateSpacefleetUniverse(imported, universe), /another universe/);
  assert.throws(() => act(imported, { type: "step" }, { locationId: home }), /location/);
  assert.throws(() => applySpaceVehicleAction(imported, context(imported), { vehicleId: "hopper", actionId: "a1", type: "board" }), /replayed/);
  assert.deepEqual(remapSpacefleetUniverse(imported, target, target), imported);
});

test("complete home-orbit-Morrow-orbit-home route retains exact cargo and accounts for every spent unit", () => {
  let fleet = act(ready(), { type: "cargo-in", sourceId: "gantry", sourceRevision: 9, sourceSlot: 0, vehicleSlot: 0 }, { source: source() }).fleet;
  const start = fleet.vehicles.hopper, spent = { fuelMl: 0, oxidizerMl: 0, oxygenMl: 0, batteryJoules: 0 };
  const moonOrbit = locationId(locationAddress({ ...homeLocation(universe), bodyId: "blockwild/morrow", kind: "orbit", instanceId: "low" }));
  for (const [index, target] of [orbit, moon, moonOrbit, home].entries()) {
    const origin: LocationStamp = { locationId: fleet.vehicles.hopper.locationId, epoch: 1, revision: index };
    const destination: LocationStamp = { locationId: target, epoch: 1, revision: index + 1 };
    const stamps = { originStamp: origin, destinationStamp: destination };
    fleet = act(fleet, { type: "reserve", transactionId: `leg-${index}` }, stamps).fleet;
    while (fleet.vehicles.hopper.trip!.status !== "commit-ready") {
      fleet = act(validateSpacefleetSave(JSON.parse(JSON.stringify(fleet))), { type: "step" }, stamps).fleet;
      assert.deepEqual(fleet.vehicles.hopper.cargo, start.cargo);
    }
    for (const key of VEHICLE_RESOURCES) spent[key] += fleet.vehicles.hopper.trip!.spent[key];
    const arrived = commitVehicleArrival(fleet.vehicles.hopper, { transactionId: `leg-${index}`, ...stamps, position: [index, 10, 0], actionId: `arrive-${index}` });
    fleet = validateSpacefleetSave({ schema: 1, vehicles: { hopper: arrived } });
  }
  const returned = fleet.vehicles.hopper;
  assert.equal(returned.locationId, home); assert.equal(returned.phase, "landed");
  assert.deepEqual(returned.cargo, start.cargo); assert.deepEqual(returned.cargoOwnership, start.cargoOwnership);
  assert.deepEqual(returned.modules, start.modules); assert.deepEqual(returned.passengers, start.passengers);
  for (const key of VEHICLE_RESOURCES) { assert.ok(spent[key] > 0); assert.equal(returned[key] + spent[key], start[key]); }
});

test("disabled zero-charge ships remain rechargeable and stale external source quotes never mutate", () => {
  const fleet = clone(fresh()); fleet.vehicles.hopper.phase = "disabled";
  const supplied = act(fleet, { type: "supply", resource: "batteryJoules", amount: 500, sourceId: "gantry", sourceRevision: 9 }, { source: source() });
  assert.equal(supplied.vehicle.batteryJoules, 500); assert.equal(supplied.vehicle.phase, "disabled");
  assert.throws(() => act(fleet, { type: "supply", resource: "batteryJoules", amount: 500, sourceId: "gantry", sourceRevision: 8 }, { source: source() }), /stale/);
  assert.equal(fleet.vehicles.hopper.batteryJoules, 0);
});

test("metadata that JSON would silently drop is rejected instead of changing cargo on save", () => {
  const origin = source(); origin.cargo[0]!.metadata!.lost = undefined;
  assert.throws(() => act(fresh(), { type: "cargo-in", sourceId: "gantry", sourceRevision: 9, sourceSlot: 0, vehicleSlot: 0 }, { source: origin }), /durable JSON/);
  const fleet = clone(fresh()); fleet.vehicles.hopper.modules[0].metadata.lost = undefined;
  assert.throws(() => validateSpacefleetSave(fleet), /durable JSON/);
});
