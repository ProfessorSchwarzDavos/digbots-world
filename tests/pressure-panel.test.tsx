import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Item } from "../app/game/data";
import { createPressureDevice } from "../app/game/pressure-devices";
import { createAirlockState } from "../app/game/pressure-airlock";
import { airZoneDiagnostics, createAirZoneState, discoverAirZone } from "../app/game/airzone";
import { createWorkshop } from "../app/game/wayworks-stores";
import type { WorkshopAction } from "../app/game/wayworks-integration";
import type { PressurePanelProps } from "../app/game/PressurePanel";

// CSS is browser-owned; native React server rendering only needs stable class names.
register(`data:text/javascript,${encodeURIComponent(`export async function load(url, context, nextLoad) {
  if (url.endsWith('.module.css')) return { format: 'module', shortCircuit: true, source: 'export default new Proxy({}, { get: (_, key) => String(key) });' };
  return nextLoad(url, context);
}`)}`, import.meta.url);
const { PressurePanel, PressureHoldSession } = await import("../app/game/PressurePanel");
const render = (props: Partial<PressurePanelProps> = {}) => renderToStaticMarkup(createElement(PressurePanel, {
  kind: "life-support-controller", workshop: createWorkshop("life-support-controller"),
  onAction: () => assert.fail("Rendering must not request an action"), ...props,
}));
const device = createPressureDevice("p-1");
const diagnostic = { device, zone: undefined, occupants: 0, capacity: 0, leak: null, checkAgeMs: 0, topologyRevision: 7, error: null } as PressurePanelProps["pressure"];

test("normal controls expose finite vent modes, mixture, equalization valve and sensor thresholds", () => {
  const vent = render({ kind: "atmosphere-vent", pressure: diagnostic });
  for (const label of ["Capture", "Release", "Balanced composition", "Target oxygen", "Target carbon dioxide", "Apply mixture", "Chamber vent"]) assert.ok(vent.includes(label), label);
  const valve = render({ kind: "equalization-vent", pressure: diagnostic });
  assert.match(valve, /Target pressure/); assert.match(valve, /Check-valve direction/); assert.match(valve, /front-to-back/);
  const sensor = render({ kind: "pressure-sensor", pressure: diagnostic });
  for (const label of ["Minimum pressure", "Maximum pressure", "Minimum oxygen", "Maximum carbon dioxide", "Output polarity", "Signal receiver", "Apply sensor thresholds"]) assert.ok(sensor.includes(label), label);
});

test("unknown habitat remains unverified, with unavailable readings and no nested dialog", () => {
  const html = render();
  assert.match(html, /data-state="unknown">Unknown/);
  assert.match(html, /Breathing safety unavailable/);
  assert.match(html, /Pressure<\/dt><dd>Unavailable/);
  assert.match(html, /Last check: Unavailable/);
  assert.doesNotMatch(html, /role="dialog"|currently breathable|NaN|Infinity/);
});

test("zone warnings retain capacity, gas readings, check age and precise leak information", () => {
  const topology = discoverAirZone({ epochs: { locationId: "panel-unit-test", generation: 0, topologyRevision: 2, requestId: 1 }, seed: { x: 0, y: 0, z: 0 }, cells: [{ x: 0, y: 0, z: 0, passable: true, sealMask: 63, controllerIds: ["test-controller"] }] });
  const initial = createAirZoneState(topology, { oxygenMilliMoles: 8000, inertMilliMoles: 30000, co2MilliMoles: 0 }, 20000);
  for (const status of ["unknown", "checking", "leaking", "depressurized", "over-capacity", "sealed"] as const) {
    const zone = { ...initial, status };
    const html = render({ pressure: { ...diagnostic!, zone, ...airZoneDiagnostics(zone, 4), capacity: topology.capacity, occupants: 1, checkAgeMs: 1200, leak: { cell: { x: -4, y: 7, z: 12 }, face: "+x", cause: "open-door:-4,7,12", unknown: false } } });
    assert.match(html, new RegExp(`data-state="${status}"`));
    assert.match(html, /1 \/ 2,048/);
    assert.match(html, /Last check: 1.2 s ago/);
    assert.match(html, /Leak at -4, 7, 12 · face \+x · open-door:-4,7,12/);
    if (status !== "sealed") assert.match(html, /Keep helmet sealed/);
  }
});

test("airlock warnings describe decompression and actual host phase without promising success", () => {
  const airlock = createAirlockState({ controllerKey: "0,0,0", innerDoorKey: "1,0,0", outerDoorKey: "2,0,0", chamberZoneId: "3,0,0", interiorZoneId: "4,0,0", exteriorZoneId: "exterior", recoveryPumpKey: "5,0,0", reserveKey: "6,0,0" });
  airlock.phase = "fault"; airlock.error = "reserve-full";
  const html = render({ kind: "airlock-controller", pressure: { ...diagnostic!, device: { ...device, airlock } } });
  assert.match(html, /Airlock fault: reserve full/);
  assert.match(html, /hold for 8 seconds/);
  assert.match(html, /DANGEROUS: holding an override for 3 seconds/);
  assert.match(html, /decompress the chamber/);
  assert.match(html, /Space or Enter/);
  assert.match(html, /Close the inspector to advance the automatic cycle/);
  assert.match(html, /within 16 blocks/);
  assert.match(html, /No hold active/);
});

test("device state stays authoritative and an unconfigured airlock cannot issue hold controls", () => {
  const html = render({ kind: "pressure-door", pressure: { ...diagnostic!, device: { ...device, locked: true, open: false } } });
  assert.match(html, /Door: Closed · Interlocked/);
  assert.match(html, /disabled="">Open door/);
  const unconfigured = render({ kind: "airlock-controller", pressure: diagnostic });
  assert.match(unconfigured, /disabled="" aria-pressed="false"[^>]*>Hold 8 s/);
  assert.match(unconfigured, /Not configured/);
});

test("chemistry shows both outputs and finite filter remaining instead of a free refill", () => {
  const workshop = createWorkshop("electrolyzer");
  workshop.process!.chemicalAux = { resource: "hydrogen", amount: 12000 };
  const html = render({ kind: "electrolyzer", workshop });
  assert.match(html, /12 standard L oxygen \+ 24 standard L hydrogen/);
  assert.match(html, /Auxiliary gas<\/dt><dd>12 standard L hydrogen/);
  assert.match(html, /0\.018 L water/);
  assert.match(html, /Gas filter/);
  const filter = createWorkshop("carbon-scrubber");
  assert.match(render({ kind: "carbon-scrubber", workshop: filter }), /Filter remaining: 0 standard L/);
  filter.slots.reagent = { item: Item.HabitatFilter, count: 1 };
  assert.match(render({ kind: "carbon-scrubber", workshop: filter }), /Filter remaining: 240 standard L/);
  filter.slots.reagent = null; filter.process!.filterUsedMl = 216000;
  assert.match(render({ kind: "carbon-scrubber", workshop: filter }), /Filter remaining: 24 standard L/);
});

test("an active chemistry batch locks recipe selection and discloses cancellation cost", () => {
  const workshop = createWorkshop("electrolyzer");
  workshop.cycle = { recipeId: "electrolyze-water", progressMs: 500, paidJ: 6000, durationMs: 1000, costJ: 12000 };
  const html = render({ kind: "electrolyzer", workshop });
  assert.match(html, /Recipe<select disabled=""/);
  assert.match(html, /0\.5 \/ 1 s · 6 \/ 12 kJ paid/);
  assert.match(html, /Cancel batch · keep ingredients, lose paid power/);
});

test("host hold session sends immediate and 200 ms heartbeats without duration; stop is final", context => {
  context.mock.timers.enable({ apis: ["setInterval"] });
  const actions: WorkshopAction[] = [];
  const session = new PressureHoldSession(action => actions.push(action));
  session.start("manual-open-inner");
  assert.deepEqual(actions, [{ kind: "pressure", action: { kind: "hold", command: "manual-open-inner", active: true } }]);
  context.mock.timers.tick(199); assert.equal(actions.length, 1);
  context.mock.timers.tick(1); assert.equal(actions.length, 2);
  session.start("manual-open-inner"); assert.equal(actions.length, 2);
  session.stop();
  assert.deepEqual(actions.at(-1), { kind: "pressure", action: { kind: "hold", command: "manual-open-inner", active: false } });
  context.mock.timers.tick(10000); assert.equal(actions.length, 3);
  session.stop(); assert.equal(actions.length, 3);
});

test("switching hold command releases the old request; callback indirection reads latest host handler", context => {
  context.mock.timers.enable({ apis: ["setInterval"] });
  const before: WorkshopAction[] = [], after: WorkshopAction[] = [];
  let callback = (action: WorkshopAction) => { before.push(action); };
  const session = new PressureHoldSession(action => callback(action));
  session.start("manual-open-inner");
  callback = action => { after.push(action); };
  context.mock.timers.tick(200);
  assert.equal(before.length, 1); assert.equal(after.length, 1);
  session.start("dangerous-open-outer");
  assert.deepEqual(after.slice(-2), [
    { kind: "pressure", action: { kind: "hold", command: "manual-open-inner", active: false } },
    { kind: "pressure", action: { kind: "hold", command: "dangerous-open-outer", active: true } },
  ]);
  session.stop();
});
