import { normalizeRoadEventState, type RoadEventState } from "./surface-roads";
import { assertExactKeys, canonicalJson, isUniverseRecord } from "./universe-json";

/** Existing engine save bound. Attachment capture refuses overflow instead of
 * silently evicting an old once-only spawn receipt. */
export const ROAD_EVENT_HISTORY_LIMIT = 4096;
const roadFields = { schema: true, anchorId: true, kind: true, status: true, triggeredDay: true, revision: true } satisfies Record<keyof RoadEventState, true>;
export function validateRoadEventHistory(events: Readonly<Record<string, RoadEventState>>): void {
  canonicalJson(events);
  if (!isUniverseRecord(events)) throw Error("Invalid canonical road history.");
  for (const [anchor, event] of Object.entries(events)) {
    if (!isUniverseRecord(event)) throw Error("Invalid canonical road event.");
    assertExactKeys(event, Object.keys(roadFields), "Canonical road event");
    if (!anchor || anchor.trim() !== anchor || !Number.isSafeInteger(event.triggeredDay) || !Number.isSafeInteger(event.revision)
      || canonicalJson(normalizeRoadEventState(event, anchor)) !== canonicalJson(event)) throw Error("Canonical road history requires lossy normalization.");
  }
}
