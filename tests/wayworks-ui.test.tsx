import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WayworksPanel, type WayworksPanelProps } from "../app/game/WayworksPanel";

const base: WayworksPanelProps = {
  name: "Workshop Battery", kind: "battery", energyJ: 12_345, capacityJ: 100_000,
  rateW: 250, status: "Blocked: no connected output", revision: 17, facing: 1, enabled: true,
  ports: { front: "output", back: "input", left: "disabled", right: "both", top: "disabled", bottom: "disabled" },
  onAction: () => assert.fail("Rendering must not request an action"),
  onClose: () => assert.fail("Rendering must not close the inspector"),
};
const render = (overrides: Partial<WayworksPanelProps> = {}) => renderToStaticMarkup(createElement(WayworksPanel, { ...base, ...overrides }));

test("machine inspector keeps energy, capacity, and rate distinct and reports authoritative status", () => {
  const html = render();
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /Stored energy<\/dt><dd>12\.345 <span>kJ/);
  assert.match(html, /Capacity<\/dt><dd>100 <span>kJ/);
  assert.match(html, /Power rate<\/dt><dd>250 <span>W/);
  assert.match(html, /role="status">Blocked: no connected output/);
  assert.match(html, /data-wayworks-revision="17"/);
  assert.match(html, /Front faces East/);
  assert.match(html, /aria-valuenow="12\.345"/);
  assert.match(html, /aria-valuetext="12\.345 of 100 kJ"/);
});

test("all six local faces have labeled native controls with current modes", () => {
  const html = render();
  assert.equal((html.match(/<select[^>]+aria-label="(?:Front|Back|Left|Right|Top|Bottom) energy port"/g) ?? []).length, 6);
  for (const [face, mode] of Object.entries(base.ports)) {
    const label = face[0].toUpperCase() + face.slice(1);
    const select = html.match(new RegExp(`<select[^>]+aria-label="${label} energy port"[^>]*>(.*?)</select>`))?.[1];
    assert.ok(select, `Missing ${face} selector`);
    assert.match(select, new RegExp(`<option value="${mode}" selected="">`));
    assert.equal((select.match(/<option /g) ?? []).length, 7);
  }
});

test("only the hand dynamo offers cranking and only the pedestal offers charging", () => {
  assert.doesNotMatch(render(), /Turn crank|Charge selected/);
  const dynamo = render({ kind: "hand-dynamo", name: "Hand Dynamo" });
  assert.match(dynamo, />Turn crank<\/button>/);
  assert.doesNotMatch(dynamo, /Charge selected/);
  const charger = render({ kind: "charging-pedestal", name: "Charging Pedestal", heldItemName: "Charge Cell" });
  assert.match(charger, /Transfer up to 2 kJ per second/);
  assert.match(charger, /Charge equipped back rig/);
  assert.match(charger, /Selected: Charge Cell/);
  assert.match(charger, />Charge selected cell \/ rig<\/button>/);
  assert.doesNotMatch(charger, /Turn crank/);
});

test("disabled, empty and full machines do not offer impossible energy actions", () => {
  assert.match(render({ kind: "hand-dynamo", enabled: false }), /disabled="">Turn crank/);
  assert.match(render({ kind: "hand-dynamo", energyJ: base.capacityJ }), /disabled="">Turn crank/);
  assert.match(render({ kind: "charging-pedestal", energyJ: 0 }), /disabled="">Charge selected/);
  assert.match(render({ enabled: false }), /aria-pressed="false">Enable machine/);
  assert.match(render(), /aria-pressed="true">Disable machine/);
  assert.match(render(), />Rotate 90°<\/button>/);
  assert.match(render(), /aria-label="Close machine inspector"/);
});

test("small integer joules remain visible and missing readings are not fabricated", () => {
  assert.match(render({ energyJ: 1 }), /Stored energy<\/dt><dd>0\.001 <span>kJ/);
  const missing = render({ energyJ: Number.NaN, capacityJ: 0, rateW: Number.NaN, status: "", facing: 99 });
  assert.match(missing, /Storage gauge unavailable/);
  assert.match(missing, /Status unavailable/);
  assert.match(missing, /Front faces unknown/);
  assert.doesNotMatch(missing, /NaN|Infinity/);
});
