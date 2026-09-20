import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { WayworksPanelProps } from "../app/game/WayworksPanel";
import { BlockId, Item } from "../app/game/data";
import { wayworksMetadataSummary } from "../app/game/wayworks-ui";
import { createMachine } from "../app/game/wayworks";
import { WaygridItemPanel, WaygridCreaturePanel } from "../app/game/WaygridPanels";

register(`data:text/javascript,${encodeURIComponent(`export async function load(url, context, nextLoad) {
  if (url.endsWith('.module.css')) return { format: 'module', shortCircuit: true, source: 'export default new Proxy({}, { get: (_, key) => String(key) });' };
  return nextLoad(url, context);
}`)}`, import.meta.url);
const { WayworksPanel } = await import("../app/game/WayworksPanel");

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

test("operation feedback remains inside the modal and explains rejected transfers", () => {
  assert.match(render({ feedback: "Select the Field Wrench first." }), /class="ww-feedback" role="status" aria-live="polite">Select the Field Wrench first\./);
  assert.match(render({ feedback: "backpressure" }), /destination is full or contains a different resource/);
  assert.doesNotMatch(render({ feedback: "ok" }), /ww-feedback/);
});

test("tanks prioritize measured contents and only advertise supported sockets", () => {
  const html = render({ kind: "gas-tank", capacityJ: 0, energyJ: 0 });
  assert.doesNotMatch(html, /Stored energy<\/dt>|Storage gauge unavailable/);
  assert.match(html, /Gas storage/);
  assert.match(html, /Supported: capacity, seal, thermal/);
  assert.doesNotMatch(html, /speed · 0/);
  assert.match(render({ kind: "waterwheel-generator", status: "no-water" }), /Needs flowing water beside the wheel/);
  assert.match(render({ kind: "fluid-pump", status: "no-water" }), /Needs a water source directly below/);
});

test("resource and machine metadata never masquerade as creature data", () => {
  assert.equal(wayworksMetadataSummary({ item: Item.FluidCanister, count: 1, metadata: { wayworksResource: { kind: "fluid", resource: "water", quantity: 1500 } } }), "1.5 L water");
  assert.equal(wayworksMetadataSummary({ item: Item.GasCylinder, count: 1, metadata: { wayworksResource: { kind: "chemical", resource: "oxygen", quantity: 1000 } } }), "1 standard L oxygen");
  assert.equal(wayworksMetadataSummary({ item: Item.GasCylinder, count: 1 }), "Empty container");
  assert.equal(wayworksMetadataSummary({ item: BlockId.FluidTank, count: 1, metadata: { wayworks: createMachine("fluid-tank", "L", "owner") } }), "Sealed machine stores and modules");
});

test("Waygrid declares finite power costs and keeps action failures visible in its modal", () => {
  const props = { entries: [], utilization: { used: 0, capacity: 100, percentage: 0, label: "0/100" },
    cellCounts: [1, 0, 0] as const, onClose: () => {}, onDepositSelected: () => {}, onWithdraw: () => {}, feedback: "Connect an adjacent charged battery." };
  const item = renderToStaticMarkup(createElement(WaygridItemPanel, props));
  const creature = renderToStaticMarkup(createElement(WaygridCreaturePanel, { ...props, healProgress: 0 }));
  assert.match(item, /50 J \/ ITEM TRANSFER/); assert.match(creature, /500 J \/ ORB TRANSFER/);
  for (const html of [item, creature]) assert.match(html, /class="waygrid-feedback" role="status" aria-live="polite">Connect an adjacent charged battery\./);
});

test("full-screen narrow Waygrid has no outer padding beyond the viewport", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 720px\)\s*\{\s*\.waygrid-overlay\s*\{\s*padding: 0;\s*\}\s*\.waygrid-window\s*\{\s*width: 100vw; height: 100dvh;/);
});
