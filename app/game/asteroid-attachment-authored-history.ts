import type { WorldSave } from "./engine";
import type { AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import type { RoadEventState } from "./surface-roads";
import { ROAD_EVENT_HISTORY_LIMIT, validateRoadEventHistory } from "./authored-history";
import { assertExactKeys, canonicalJson, cloneUniverseJson, freezeUniverseJson } from "./universe-json";

export type AsteroidAuthoredHistory = Readonly<Pick<WorldSave, "roadEvents" | "activatedStructureMarkers" | "startingSettlementId">>;
/** Host-private once-only history, not a second authored structure owner or a
 * guest discovery packet. IDs are historical keys, never parsed/rebased points. */
export type AsteroidAuthoredHistoryView = Readonly<{
  frameId: string; sourceBaseline: string; history: AsteroidAuthoredHistory;
}>;
const historyFields = { roadEvents: true, activatedStructureMarkers: true, startingSettlementId: true } satisfies Record<keyof AsteroidAuthoredHistory, true>;
function identifier(id: unknown): asserts id is string {
  if (typeof id !== "string" || !id || id.trim() !== id) throw Error("Invalid authored history identity.");
}
function validate(history: AsteroidAuthoredHistory) {
  canonicalJson(history);
  assertExactKeys(history, Object.keys(history).filter(key => Object.hasOwn(historyFields, key)), "Attached authored history");
  if (Object.values(history).some(value => value === undefined)) throw Error("Authored history must distinguish absent fields from unsupported undefined values.");
  if (history.startingSettlementId !== undefined && history.startingSettlementId !== null) identifier(history.startingSettlementId);
  if (history.roadEvents !== undefined) {
    validateRoadEventHistory(history.roadEvents);
    if (Object.keys(history.roadEvents).length > ROAD_EVENT_HISTORY_LIMIT) throw Error("Attached road history exceeds the existing save capacity.");
  }
  if (history.activatedStructureMarkers !== undefined) {
    if (!Array.isArray(history.activatedStructureMarkers)) throw Error("Invalid authored activation history.");
    history.activatedStructureMarkers.forEach(identifier);
    if (new Set(history.activatedStructureMarkers).size !== history.activatedStructureMarkers.length) throw Error("Duplicate authored activation history.");
  }
}
export function projectAsteroidAuthoredHistory(frame: AsteroidAttachmentFrame, canonical: AsteroidAuthoredHistory): AsteroidAuthoredHistoryView {
  validate(canonical);
  return freezeUniverseJson(cloneUniverseJson({ frameId: frame.frameId, sourceBaseline: canonicalJson(canonical), history: canonical }));
}
/** Append actual host-observed activation receipts. Existing road events are
 * immutable in the current runtime, including quiet results; old markers keep
 * their insertion order. Complete generated geometry, spawn/custody, observation
 * and owner-revision proof must be committed together by the caller. Supplying a
 * new receipt here alone never authorizes a spawn, reward or guest knowledge. */
export function appendAsteroidAuthoredHistory(frame: AsteroidAttachmentFrame, canonical: AsteroidAuthoredHistory,
  baseline: AsteroidAuthoredHistoryView,
  additions: Readonly<{ roadEvents: Readonly<Record<string, RoadEventState>>; activatedStructureMarkers: readonly string[] }>): AsteroidAuthoredHistory {
  if (canonicalJson(projectAsteroidAuthoredHistory(frame, canonical)) !== canonicalJson(baseline)) throw Error("Stale attached authored history.");
  canonicalJson(additions); assertExactKeys(additions, ["roadEvents", "activatedStructureMarkers"], "Authored history additions");
  validateRoadEventHistory(additions.roadEvents);
  if (!Array.isArray(additions.activatedStructureMarkers)) throw Error("Invalid authored activation additions.");
  additions.activatedStructureMarkers.forEach(identifier);
  const result = cloneUniverseJson(canonical), roads = new Map(Object.entries(canonical.roadEvents ?? {})), markers = [...canonical.activatedStructureMarkers ?? []];
  for (const [key, event] of Object.entries(additions.roadEvents)) {
    if (roads.has(key) && canonicalJson(roads.get(key)) !== canonicalJson(event)) throw Error("Existing road history cannot be replaced or replayed.");
    roads.set(key, cloneUniverseJson(event));
  }
  const activated = new Set(markers);
  for (const key of additions.activatedStructureMarkers) if (!activated.has(key)) { activated.add(key); markers.push(key); }
  const output: AsteroidAuthoredHistory = { ...result,
    ...(Object.keys(additions.roadEvents).length ? { roadEvents: Object.fromEntries(roads) } : {}),
    ...(additions.activatedStructureMarkers.length ? { activatedStructureMarkers: markers } : {}) };
  validate(output); return output;
}
