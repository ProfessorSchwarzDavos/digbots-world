import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CelestialChart } from "../app/game/CelestialChart";
import { projectCelestialChart, type CelestialChartInput } from "../app/game/celestial-chart";
import { createWaystarCatalog } from "../app/game/celestial-catalog";
import { bodyId, homeLocation, locationId, universeId } from "../app/game/location-address";

const home = homeLocation(universeId("chart-ui"));
const input: CelestialChartInput = { catalog: createWaystarCatalog(), knownBodyIds: ["waystar", "blockwild", "blockwild/morrow"], currentLocationId: locationId(home), universeSeconds: 1200 };
function markup(value = input, mode: "system" | "orbit" = "system", close = false) {
  return renderToStaticMarkup(createElement(CelestialChart, { charts: { system: projectCelestialChart(value), orbit: projectCelestialChart(value, "orbit") }, initialMode: mode, onClose: close ? () => {} : undefined }));
}

test("SSR chart exposes named native keyboard controls and accessible chart/list alternatives", () => {
  const html = markup(input, "system", true);
  assert.match(html, /<button[^>]*type="button"[^>]*aria-pressed="true"[^>]*>System map/);
  assert.match(html, /<button[^>]*type="button"[^>]*aria-pressed="false"[^>]*>Orbital chart/);
  assert.match(html, /Close chart/);
  assert.match(html, /role="img" aria-labelledby=/);
  assert.match(html, /aria-label="Known celestial destinations"/);
  assert.match(html, /Current location: Blockwild/);
  assert.match(html, /Blockwild · You are here/);
  assert.match(html, /focus-visible/);
  assert.match(html, /minmax\(min\(100%,230px\),1fr\)/);
  assert.match(html, /button\[aria-pressed=true\]:hover:not\(:disabled\) \{ background:#1b493e; color:#fff8e6;/);
  assert.match(html, /cursor:pointer; transition:none;/, "selection changes ink and background together without a low-contrast transition frame");
  assert.match(html, /max-width:480px/);
});

test("rendered chart never includes unknown roster names, routes or launch controls", () => {
  const html = markup();
  for (const body of input.catalog.bodies.filter(body => !input.knownBodyIds.includes(body.id))) assert.ok(!html.includes(body.name));
  assert.ok(!html.includes("Close chart"));
  assert.match(html, /Read-only observations/);
  assert.ok(!/<button[^>]*>Launch/.test(html));
});

test("orbital SSR preserves moon identity and displays explicit local station coordinates", () => {
  const currentLocationId = locationId({ ...home, bodyId: bodyId("blockwild/morrow"), kind: "orbit", instanceId: "low" });
  const html = markup({ ...input, currentLocationId, stationPoints: [{ id: "station", name: "Moonwatch", locationId: currentLocationId, position: [10, 32, -20] }] }, "orbit");
  assert.match(html, /Current location: Morrow/);
  assert.match(html, /Morrow · You are here/);
  assert.match(html, /Centered on Blockwild/);
  assert.match(html, /Moonwatch/);
  assert.match(html, /10, 32, -20/);
  assert.match(html, /Separate from the celestial AU frame/);
  assert.ok(!html.includes('data-body-id="waystar"'));
});

test("empty knowledge and omitted stations render explicit unavailable states", () => {
  const html = markup({ ...input, knownBodyIds: [], universeSeconds: undefined }, "orbit");
  assert.match(html, /Current location: Uncharted body/);
  assert.match(html, /No chart knowledge supplied/);
  assert.match(html, /No station points supplied/);
  assert.match(html, /live clock unavailable/);
  assert.ok(!html.includes("Blockwild"));
  assert.ok(!html.includes("Morrow"));
});
