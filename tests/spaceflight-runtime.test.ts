import assert from "node:assert/strict";
import test from "node:test";
import { VoxelEngine } from "../app/game/engine";
import { splitUniverseSave, composeUniverseSave } from "../app/game/universe-save";
import { flightFixture } from "./spaceflight-fixtures";

test("ship cargo and flight state have one universe owner across save composition", () => {
  const { world, initial } = flightFixture("flight-partition");
  const parts = splitUniverseSave(world.save), target = splitUniverseSave(initial);
  assert.equal("spacefleet" in parts.location, false);
  assert.equal("spacefleet" in parts.player, false);
  assert.deepEqual(composeUniverseSave({ ...parts, location: target.location }).spacefleet, world.save.spacefleet);
});

function engineFixture() {
  const f = flightFixture("flight-engine");
  const calls: string[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    persistent: true, activeWorldId: f.world.metadata.id, multiplayer: null, locationTransitioning: false,
    pendingSpaceArrival: null, running: true, paused: false, gameplayOverlayOpen: false,
    spacefleet: f.world.save.spacefleet, persistenceError: null, world: { locationScope: f.origin },
    saveNow: async () => { calls.push("save-origin"); return true; }, serialize: () => structuredClone(f.world.save),
    events: { onToast: () => {} }, reportPersistence: () => {},
    loadWorld: () => { calls.push("load-destination"); },
    worldStorage: { transitionVehicleLocation: async () => { calls.push("commit"); return { ok: true, value: { ...f.world, save: f.initial } }; } },
  }) as VoxelEngine;
  return { engine, calls, ...f };
}

test("actual engine arrival releases origin only after a successful durable commit", async () => {
  const { engine, calls, initial } = engineFixture();
  const result = await engine.commitSpaceVehicleLocation("hopper-1", initial, [0, 64, 0]);
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["save-origin", "commit", "load-destination"]);
  assert.equal(engine.running, true); assert.equal(engine.paused, false);
});

test("actual engine keeps origin paused and retries exact arrival after uncertain acknowledgement", async () => {
  const { engine, calls, initial } = engineFixture();
  let first = true;
  const attempts: unknown[] = [];
  engine.worldStorage.transitionVehicleLocation = async (destination, save, input) => {
    calls.push("commit"); attempts.push(structuredClone({ destination, save, input }));
    if (first) { first = false; return { ok: false, error: { code: "unavailable", message: "Injected after-commit acknowledgement loss" } }; }
    return { ok: true, value: { ...flightFixture("flight-engine").world, save: initial } };
  };
  assert.equal((await engine.commitSpaceVehicleLocation("hopper-1", initial, [0, 64, 0])).ok, false);
  assert.deepEqual(calls, ["save-origin", "commit"]);
  assert.equal(engine.running, false); assert.equal(engine.paused, true);
  assert.equal(await VoxelEngine.prototype.saveNow.call(engine, false), false, "autosave cannot overwrite an uncertain destination");
  assert.equal((await engine.commitSpaceVehicleLocation("hopper-1")).ok, true);
  assert.deepEqual(attempts[1], attempts[0]);
  assert.deepEqual(calls, ["save-origin", "commit", "commit", "load-destination"]);
  assert.equal(engine.running, true); assert.equal(engine.paused, false);
});

test("failed origin checkpoint never requests destination or retires origin", async () => {
  const { engine, calls, initial } = engineFixture();
  engine.saveNow = async () => false;
  assert.equal((await engine.commitSpaceVehicleLocation("hopper-1", initial)).ok, false);
  assert.deepEqual(calls, []);
  assert.equal(engine.running, true); assert.equal(engine.paused, false);
});

test("arrival fails closed before saving or retiring an occupied shared origin", async () => {
  const { engine, calls, initial } = engineFixture();
  Object.assign(engine, { multiplayer: { role: "host" }, remotePlayers: new Map([["guest", {}]]) });
  assert.deepEqual(await engine.commitSpaceVehicleLocation("hopper-1", initial), { ok: false, code: "vehicle_origin_occupied" });
  assert.deepEqual(calls, []);
  assert.equal(engine.running, true);
  assert.equal(Reflect.get(engine, "pendingSpaceArrival"), null);
});

test("destination runtime failure after commit stays paused and can retry load without paying again", async () => {
  const { engine, calls, initial } = engineFixture();
  let failure = true;
  engine.loadWorld = () => { calls.push("load-destination"); if (failure) { failure = false; throw Error("Injected worker/setup failure"); } };
  assert.equal((await engine.commitSpaceVehicleLocation("hopper-1", initial)).ok, false);
  assert.equal(engine.running, false);
  assert.equal((await engine.commitSpaceVehicleLocation("hopper-1")).ok, true);
  assert.deepEqual(calls, ["save-origin", "commit", "load-destination", "commit", "load-destination"]);
});
