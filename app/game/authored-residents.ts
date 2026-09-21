import type { FactionId } from "./factions";
import type { MobKind } from "./mobs";
import type { RoadEventState } from "./surface-roads";

type RoadResident = Readonly<{ kind: MobKind; name: string; hostile?: boolean; factionId?: FactionId; profession?: string }>;
/** The engine and attachment history resolver share the actual authored spawns.
 * Names/factions may change through gameplay; the event's original kind does not.
 * Two crossing deer deliberately share one historical road-event resident ID. */
export const ROAD_EVENT_RESIDENTS: Readonly<Record<RoadEventState["kind"], readonly RoadResident[]>> = Object.freeze({
  quiet: Object.freeze([]), repair: Object.freeze([]),
  ambush: Object.freeze([Object.freeze({ kind: "warg", name: "Roadside Prowler", hostile: true })]),
  "creature-crossing": Object.freeze([Object.freeze({ kind: "thimbledeer", name: "Crossing Thimbledeer" }),
    Object.freeze({ kind: "thimbledeer", name: "Crossing Fawn" })]),
  caravan: Object.freeze([Object.freeze({ kind: "taffalo", name: "Hearthroad Pack Taffalo" })]),
  "lost-traveler": Object.freeze([Object.freeze({ kind: "hobbit-merchant", name: "Lost Wayfarer", factionId: "hobbits", profession: "general" })]),
  toll: Object.freeze([Object.freeze({ kind: "goblin-worker", name: "Road Tollkeeper", factionId: "goblins", profession: "general" })]),
});

export const GUILD_RECRUIT_COMPANIONS: Readonly<Record<string, Readonly<{ kind: MobKind; name: string }>>> = Object.freeze({
  "pella-reedshoe": Object.freeze({ kind: "burrowbell", name: "Button" }),
  "sela-wakequiet": Object.freeze({ kind: "currentweaver-eel", name: "Wakecoil" }),
  "bram-coalgrin": Object.freeze({ kind: "warg", name: "Toll" }),
  "hessa-deepnote": Object.freeze({ kind: "copper-mole", name: "Pipet" }),
  "rowan-mileglass": Object.freeze({ kind: "petalfox", name: "Blankmile" }),
  "taff-ribbons": Object.freeze({ kind: "taffy-hound", name: "Knot" }),
});

export type HistoricalResidentKind = "road-event" | "guild-companion";
/** Classification only. A recognizable prefix is not proof that its owner
 * exists, that the creature is its resident, or that any actor may move it. */
export function historicalResidentReference(residentId: string): Readonly<{ kind: HistoricalResidentKind; id: string }> {
  for (const kind of ["road-event", "guild-companion"] as const) if (residentId.startsWith(`${kind}:`)) {
    const id = residentId.slice(kind.length + 1);
    if (id && id.trim() === id) return { kind, id };
  }
  throw Error("Unresolved non-settlement resident identity.");
}
