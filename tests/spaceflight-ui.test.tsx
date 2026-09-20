import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BlockId, Item } from "../app/game/data";
import { hasSpaceflightIcon, SpaceflightIcon } from "../app/game/spaceflight-icons";
import { hasWayworksIcon, WayworksIcon } from "../app/game/wayworks-ui";
import { SpaceflightDialog } from "../app/game/SpaceflightPanel";
import { homeLocation, locationId, universeId } from "../app/game/location-address";
import { createStationRegistry } from "../app/game/orbital-station";
import { createSurveyHopper } from "../app/game/space-vehicle";

test("eleven flight inventory silhouettes route through the ordinary item renderer", () => {
  const shapes = new Set<string>();
  for (let item = BlockId.LaunchPad; item <= Item.SurveyHopper; item++) {
    assert.ok(hasSpaceflightIcon(item)); assert.ok(hasWayworksIcon(item));
    const markup = renderToStaticMarkup(createElement(WayworksIcon, { item, small: true }));
    assert.ok(markup.includes(`data-spaceflight-icon="${item}"`));
    assert.ok(markup.includes("item-icon-small"));
    shapes.add(markup.replace(/data-spaceflight-icon="\d+"/, ""));
    assert.equal(markup, renderToStaticMarkup(createElement(SpaceflightIcon, { item, small: true })));
  }
  assert.equal(shapes.size, 11);
  assert.equal(hasSpaceflightIcon(BlockId.MineralFrost), false);
});

test("mission dialog identifies its modal boundary and shows actionable failure feedback", () => {
  const markup = renderToStaticMarkup(createElement(SpaceflightDialog, { mission: {
    ship: null, pad: null, route: "home-orbit", costs: null, blockers: [], status: "No ship deployed", destination: null,
  }, feedback: "Arrival held: another participant occupies the origin.", onClose: () => {}, onAction: () => {} }));
  assert.ok(markup.includes('role="dialog"')); assert.ok(markup.includes('aria-modal="true"'));
  assert.ok(markup.includes("Return to cockpit")); assert.ok(markup.includes("Arrival held:"));
});

test("orbit mission exposes finite starter construction with a labeled name input", () => {
  const orbit = locationId({ ...homeLocation(universeId("station-ui")), kind: "orbit", instanceId: "low" });
  const markup = renderToStaticMarkup(createElement(SpaceflightDialog, { mission: {
    ship: createSurveyHopper("ship", "local", orbit, [0, 32.51, 0]), pad: null, route: "home-surface", costs: null,
    blockers: [], status: "orbit", destination: null, stations: createStationRegistry(orbit),
  }, onClose: () => {}, onAction: () => {} }));
  assert.ok(markup.includes("New station name")); assert.ok(markup.includes('maxLength="80"'));
  assert.ok(markup.includes("Build starter station deck")); assert.ok(markup.includes("supplies no air, gas or energy"));
});
