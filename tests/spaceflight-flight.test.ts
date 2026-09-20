import assert from "node:assert/strict";
import test from "node:test";
import { advanceSpaceCabin, advanceSpaceflight } from "../app/game/spaceflight-flight";
import { applySpaceVehicleAction } from "../app/game/space-vehicle";
import { flightFixture } from "./spaceflight-fixtures";
import { RECIPES, type InventorySlot } from "../app/game/data";
import { VoxelEngine } from "../app/game/engine";
import { SPACEFLIGHT_CATALOG } from "../app/game/spaceflight-catalog";

test("zero elapsed flight ticks preserve exact state", () => {
  const fleet = flightFixture("zero-flight", 1).world.save.spacefleet!;
  assert.strictEqual(advanceSpaceflight(fleet, "hopper-1", 0, { throttle: 0, pitch: 0, turn: 0 }).fleet, fleet);
});

test("parked cabins consume finite oxygen and energy with durable subsecond accounting", () => {
  const f = flightFixture("cabin", 0), old = f.world.save.spacefleet!;
  let fleet = applySpaceVehicleAction(old, { actorId: "local", locationId: f.origin.locationId, expectedVehicleRevision: old.vehicles["hopper-1"].revision }, { type: "abort", vehicleId: "hopper-1", actionId: "abort-cabin" }).fleet;
  const before = fleet.vehicles["hopper-1"];
  for (let tick = 0; tick < 25; tick++) fleet = advanceSpaceCabin(JSON.parse(JSON.stringify(fleet)), "hopper-1", 100);
  assert.equal(fleet.vehicles["hopper-1"].oxygenMl, before.oxygenMl - 8);
  assert.equal(fleet.vehicles["hopper-1"].batteryJoules, before.batteryJoules - 16);
  assert.equal(fleet.vehicles["hopper-1"].cabinClockMs, 500);
});

test("interactive ascent is durable, bounded, and pays each phase only once", () => {
  let fleet = flightFixture("timed-flight", 0).world.save.spacefleet!;
  const before = structuredClone(fleet.vehicles["hopper-1"]), spent = { ...before.trip!.reserved };
  let ready = false, changed = 0, altitude = 0;
  for (let tick = 0; tick < 1000 && !ready; tick++) {
    const frame = advanceSpaceflight(JSON.parse(JSON.stringify(fleet)), "hopper-1", 100, { throttle: 1, pitch: 1, turn: 1 });
    fleet = frame.fleet; ready = frame.ready; changed += Number(frame.phaseChanged);
    altitude = Math.max(altitude, fleet.vehicles["hopper-1"].transform.position[1] - before.transform.position[1]);
  }
  const ship = fleet.vehicles["hopper-1"];
  assert.equal(ready, true); assert.equal(changed, before.trip!.steps.length);
  assert.ok(altitude > 90); assert.notEqual(ship.transform.position[0], before.transform.position[0]);
  for (const key of Object.keys(spent) as (keyof typeof spent)[]) assert.equal(before[key] - ship[key], spent[key]);
  const again = advanceSpaceflight(fleet, ship.vehicleId, 100, { throttle: 0, pitch: 0, turn: 0 });
  assert.equal(again.ready, true); assert.equal(again.fleet.vehicles[ship.vehicleId].revision, ship.revision);
  assert.equal(again.fleet.vehicles[ship.vehicleId].fuelMl, ship.fuelMl);
});

test("all first-spaceflight hardware has an unambiguous normal craft", () => {
  for (const def of Object.values(SPACEFLIGHT_CATALOG)) {
    const recipe = RECIPES.find(value => value.id === `spaceflight-${def.id}`)!;
    const grid: (InventorySlot | null)[] = recipe.pattern.map(item => item ? { item: Array.isArray(item) ? item[0] : item, count: 1 } : null);
    const engine = Object.assign(Object.create(VoxelEngine.prototype), { craftGrid: grid, craftingSize: 3 }) as VoxelEngine;
    assert.equal(engine.findRecipe()?.recipe.output.item, def.id, def.name);
    grid.find(Boolean)!.metadata = { wayworks: { energyJ: 1000 } };
    assert.equal(engine.findRecipe(), null, "crafting cannot erase component custody");
  }
});
