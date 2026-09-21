import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { appendAsteroidAuthoredHistory, projectAsteroidAuthoredHistory,
  type AsteroidAuthoredHistory } from "../app/game/asteroid-attachment-authored-history";
import { ROAD_EVENT_HISTORY_LIMIT } from "../app/game/authored-history";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { planRoadEvent, type RoadEventState } from "../app/game/surface-roads";
import { canonicalJson } from "../app/game/universe-json";

const orbit = locationAddress({ ...homeLocation(universeId("authored-history")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const road = (anchorId: string, quiet = false): RoadEventState => ({ schema: 1, anchorId, kind: quiet ? "quiet" : "creature-crossing",
  status: quiet ? "quiet" : "triggered", triggeredDay: 9, revision: quiet ? 0 : 1 });
const empty = { roadEvents: {}, activatedStructureMarkers: [] };
function fixture(): AsteroidAuthoredHistory {
  return { startingSettlementId: "settlement:old:-900,1400", roadEvents: {
    "surface-road:old:-1700,900:31": road("surface-road:old:-1700,900:31", true),
    "unparsed:inside-looking:0,32,0": road("unparsed:inside-looking:0,32,0"),
  }, activatedStructureMarkers: ["adventure:old:-900,1400:spawn:keeper", "site:0,32,0:spawn"] };
}

test("authored view preserves every historical identity and quiet outcome without parsing embedded coordinates", () => {
  const source = fixture(), view = projectAsteroidAuthoredHistory(frame, source);
  assert.equal(view.frameId, frame.frameId); assert.deepEqual(view.history, source);
  assert.notEqual(view.history, source); assert(Object.isFrozen(view.history.roadEvents)); assert(!Object.isFrozen(source.roadEvents));
  assert.equal(view.history.startingSettlementId, "settlement:old:-900,1400");
  assert.deepEqual(Object.keys(view.history.roadEvents!), Object.keys(source.roadEvents!));
});

test("one hundred cold captures retain once-only history, old order and optional absent/null distinctions", () => {
  for (const initial of [fixture(), {}, { startingSettlementId: null }, { roadEvents: {}, activatedStructureMarkers: [] }]) {
    let source: AsteroidAuthoredHistory = initial; const before = canonicalJson(source);
    for (let i = 0; i < 100; i++) {
      source = JSON.parse(JSON.stringify(appendAsteroidAuthoredHistory(frame, source, projectAsteroidAuthoredHistory(frame, source), empty)));
      assert.equal(canonicalJson(source), before);
    }
    assert.deepEqual(source, initial);
  }
});

test("host receipts append in observed order; retry is exact and never replays an existing quiet or active event", () => {
  const source = fixture(), before = canonicalJson(source), event = planRoadEvent("history-seed", "new-anchor", 10, 8);
  const additions = { roadEvents: { [event.anchorId]: event, ...source.roadEvents },
    activatedStructureMarkers: [source.activatedStructureMarkers![0], "new:spawn", "new:spawn", "last:spawn"] };
  const result = appendAsteroidAuthoredHistory(frame, source, projectAsteroidAuthoredHistory(frame, source), additions);
  assert.deepEqual(Object.keys(result.roadEvents!), [...Object.keys(source.roadEvents!), "new-anchor"]);
  assert.deepEqual(result.activatedStructureMarkers, [...source.activatedStructureMarkers!, "new:spawn", "last:spawn"]);
  assert.deepEqual(result.roadEvents!["new-anchor"], event); assert.equal(result.startingSettlementId, source.startingSettlementId);
  assert.deepEqual(appendAsteroidAuthoredHistory(frame, result, projectAsteroidAuthoredHistory(frame, result), additions), result);
  assert.equal(canonicalJson(source), before);
  for (const old of Object.values(source.roadEvents!)) {
    const changed = { ...old, revision: old.revision + 1 };
    assert.throws(() => appendAsteroidAuthoredHistory(frame, source, projectAsteroidAuthoredHistory(frame, source), {
      ...empty, roadEvents: { [old.anchorId]: changed } }), /cannot be replaced/);
  }
});

test("the existing 4096-event limit refuses overflow instead of discarding the oldest spawn receipt", () => {
  assert.equal(ROAD_EVENT_HISTORY_LIMIT, 4096);
  const source: AsteroidAuthoredHistory = { roadEvents: Object.fromEntries(Array.from({ length: ROAD_EVENT_HISTORY_LIMIT }, (_, i) => [`anchor-${i}`, road(`anchor-${i}`, i % 2 === 0)])) };
  const baseline = projectAsteroidAuthoredHistory(frame, source), before = canonicalJson(source);
  assert.deepEqual(appendAsteroidAuthoredHistory(frame, source, baseline, empty), source);
  assert.throws(() => appendAsteroidAuthoredHistory(frame, source, baseline, { ...empty, roadEvents: { overflow: road("overflow") } }), /capacity/);
  assert.equal(canonicalJson(source), before); assert.equal(source.roadEvents!["anchor-0"].kind, "quiet");
});

test("stale or forged private views, malformed records and hidden fields fail without normalization", () => {
  const source = fixture(), baseline = projectAsteroidAuthoredHistory(frame, source);
  assert.throws(() => appendAsteroidAuthoredHistory(frame, { ...source, startingSettlementId: "other" }, baseline, empty), /Stale/);
  assert.throws(() => appendAsteroidAuthoredHistory(frame, source, { ...baseline, frameId: "other" }, empty), /Stale/);
  const invalid: unknown[] = [
    { ...source, extension: true }, { ...source, startingSettlementId: " trimmed " },
    { roadEvents: undefined }, { activatedStructureMarkers: undefined }, { startingSettlementId: undefined },
    { ...source, activatedStructureMarkers: ["duplicate", "duplicate"] }, { ...source, activatedStructureMarkers: [""] },
    { ...source, roadEvents: { bad: { ...road("bad"), triggeredDay: 1.5 } } },
    { ...source, roadEvents: { bad: { ...road("bad"), revision: Number.MAX_SAFE_INTEGER + 1 } } },
    { ...source, roadEvents: { bad: { ...road("foreign"), extra: 1 } } },
    { ...source, roadEvents: { bad: { ...road("bad"), revision: -1 } } },
  ];
  for (const value of invalid) assert.throws(() => projectAsteroidAuthoredHistory(frame, value as AsteroidAuthoredHistory));
  assert.throws(() => appendAsteroidAuthoredHistory(frame, source, baseline, { ...empty, startingSettlementId: "new" } as typeof empty));
});

test("opaque reserved property names remain own receipt keys and cannot change object prototypes", () => {
  const additions = { ...empty, roadEvents: Object.fromEntries(["__proto__", "constructor", "toString"].map(key => [key, road(key)])) };
  const result = appendAsteroidAuthoredHistory(frame, {}, projectAsteroidAuthoredHistory(frame, {}), additions);
  assert.deepEqual(Object.keys(result.roadEvents!), ["__proto__", "constructor", "toString"]);
  assert.equal(Object.getPrototypeOf(result.roadEvents), Object.prototype);
  for (const key of Object.keys(additions.roadEvents)) assert(Object.hasOwn(result.roadEvents!, key));
});
