import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMachine } from "../app/game/wayworks";

register(`data:text/javascript,${encodeURIComponent(`export async function load(url, context, nextLoad) {
  if (url.endsWith('.module.css')) return { format: 'module', shortCircuit: true, source: 'export default new Proxy({}, { get: (_, key) => String(key) });' };
  return nextLoad(url, context);
}`)}`, import.meta.url);
const { WayworksPanel } = await import("../app/game/WayworksPanel");

function markup(survey: { level: number; count: number; epoch: number; registryRevision: number; shared: boolean } | null) {
  return renderToStaticMarkup(createElement(WayworksPanel, { ...createMachine("station-observatory", "orbit", "local"),
    name: "Station Observatory", energyJ: 4000, capacityJ: 8000, rateW: 1000, asteroidSurvey: survey,
    onAction: () => {}, onClose: () => {}, onFlightAction: () => {} }));
}
test("observatory presents the finite paid survey separately from read-only chart knowledge", () => {
  const html = markup({ level: 1, count: 60, epoch: 4, registryRevision: 5, shared: false });
  assert.match(html, /aria-label="Finite asteroid field survey"/);
  assert.match(html, /Field extent 1 \/ 3 · 60 asteroids/);
  assert.match(html, /<button type="button">Survey next ring and reload · 1 kJ<\/button>/);
  assert.match(html, /grants no ownership or ore/);
  assert.match(html, /Read first-flight chart/);
  assert.ok(!markup(null).includes("Survey next ring"), "surface instruments do not invent an orbital survey");
});
test("shared sessions and fully surveyed fields have explicit disabled controls", () => {
  assert.match(markup({ level: 0, count: 12, epoch: 1, registryRevision: 0, shared: true }), /<button type="button" disabled="">Survey next ring/);
  assert.match(markup({ level: 3, count: 252, epoch: 4, registryRevision: 3, shared: false }), /<button type="button" disabled="">Field fully surveyed/);
});
