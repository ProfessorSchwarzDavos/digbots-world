import { normalizeAgentWorldSave, type AgentWorldSaveV1, type AgentTaskRecord, type AgentWaypointRecord } from "./agent-platform";
import { validateAgentCustody, type AgentCustodySave } from "./agent-custody";
import type { AttachmentActorBody } from "./attachment-actor-bodies";
import { asteroidAttachmentContainsPosition, rebaseAsteroidPosition, type AsteroidAttachmentFrame,
  type AsteroidAttachmentView } from "./asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";
import { assertExactKeys, canonicalJson, cloneUniverseJson } from "./universe-json";
import { mergeSelectedAttachmentRecords } from "./attachment-array-merge";

export type AsteroidAgentRecords = Readonly<{ platform: AgentWorldSaveV1; custody: AgentCustodySave }>;
export type AsteroidAgentProjection = Readonly<{ records: AsteroidAgentRecords; actorBaseline: string }>;
const platformFields = { schema: true, enabled: true, tasks: true, waypoints: true } satisfies Record<keyof AgentWorldSaveV1, true>;
const taskFields = { id: true, agentId: true, title: true, status: true, owner: true, note: true, createdAt: true,
  updatedAt: true, waypointIds: true, previewIds: true } satisfies Record<keyof AgentTaskRecord, true>;
const waypointFields = { id: true, agentId: true, name: true, position: true, createdAt: true, source: true } satisfies Record<keyof AgentWaypointRecord, true>;

/** Exact validation, never silently applies the ordinary load normalizer's
 * filters, truncation, string trimming or coordinate clamps during transfer. */
function validateRecords(input: AsteroidAgentRecords): void {
  canonicalJson(input);
  assertExactKeys(input, ["platform", "custody"], "Attached agent records");
  assertExactKeys(input.platform, Object.keys(platformFields), "Attached task board");
  const tasks = new Set<string>(), waypoints = new Set<string>();
  for (const waypoint of input.platform.waypoints) {
    assertExactKeys(waypoint, Object.keys(waypointFields), "Attached waypoint");
    assertExactKeys(waypoint.position, ["x", "y", "z"], "Attached waypoint position");
    if (waypoints.has(waypoint.id)) throw Error("Duplicate attached waypoint identity."); waypoints.add(waypoint.id);
  }
  for (const task of input.platform.tasks) {
    assertExactKeys(task, Object.keys(taskFields), "Attached task");
    if (tasks.has(task.id)) throw Error("Duplicate attached task identity."); tasks.add(task.id);
    if (new Set(task.waypointIds).size !== task.waypointIds.length || task.waypointIds.some(id => !waypoints.has(id)))
      throw Error("Missing or duplicate attached task waypoint reference.");
    if (new Set(task.previewIds).size !== task.previewIds.length) throw Error("Duplicate attached historical preview reference.");
  }
  if (canonicalJson(normalizeAgentWorldSave(input.platform)) !== canonicalJson(input.platform))
    throw Error("Attached task board would require lossy normalization.");
  validateAgentCustody(input.custody);
}

function movingAgents(frame: AsteroidAttachmentFrame, actors: readonly AttachmentActorBody[]) {
  canonicalJson(actors);
  const ids = new Set<string>(), selected = new Map<string, string>();
  for (const actor of actors) {
    if (!actor.id || ids.has(actor.id) || !["human", "drone"].includes(actor.kind)) throw Error("Invalid attached agent body identity.");
    ids.add(actor.id); const inside = asteroidAttachmentVolumeSide(frame, actor.bounds, "orbit");
    if (actor.kind === "drone" && inside) {
      if (!actor.connectionId) throw Error("Attached agent lacks a bound live connection.");
      selected.set(actor.id, actor.connectionId);
    }
  }
  return selected;
}
function partition(frame: AsteroidAttachmentFrame, input: AsteroidAgentRecords, moving: ReadonlyMap<string, string>, view: AsteroidAttachmentView) {
  validateRecords(input);
  const waypoints = new Map(input.platform.waypoints.map(value => [value.id, asteroidAttachmentContainsPosition(frame, value.position, view)]));
  const tasks = new Set<string>();
  for (const task of input.platform.tasks) {
    const sides = task.waypointIds.map(id => waypoints.get(id)!);
    if (sides.some(Boolean) && !sides.every(Boolean)) throw Error("Task waypoints cross the attached frame boundary.");
    // A linked task belongs to its complete waypoint group, not an inferred
    // cargo anchor. An unanchored task follows its explicitly selected agent.
    if (sides.length ? sides[0] : moving.has(task.agentId)) tasks.add(task.id);
  }
  return { waypoints: new Set([...waypoints].filter(([, side]) => side).map(([id]) => id)), tasks };
}

/** Actors are synchronous canonical ORBIT-coordinate host body snapshots, not
 * guest input. Disconnected material ledgers have no position and stay outside;
 * only explicitly selected live drones carry their exact ledgers. Persisted
 * preview IDs are historical references, never restored executable jobs. */
export function projectAsteroidAgents(frame: AsteroidAttachmentFrame, canonical: AsteroidAgentRecords,
  actors: readonly AttachmentActorBody[]): AsteroidAgentProjection {
  const moving = movingAgents(frame, actors), selected = partition(frame, canonical, moving, "orbit");
  for (const actor of actors) if (actor.kind === "human" && Object.hasOwn(canonical.custody.agents, actor.id))
    throw Error("Drone custody identity is bound to a human actor.");
  const records: AsteroidAgentRecords = { platform: { ...canonical.platform,
    tasks: canonical.platform.tasks.filter(value => selected.tasks.has(value.id)),
    waypoints: canonical.platform.waypoints.filter(value => selected.waypoints.has(value.id))
      .map(value => ({ ...value, position: rebaseAsteroidPosition(frame, value.position, "orbit") })) },
    custody: { schema: 1, agents: Object.fromEntries(Object.entries(canonical.custody.agents).filter(([id]) => moving.has(id))) } };
  return { records: cloneUniverseJson(records), actorBaseline: canonicalJson(actors) };
}

/** Pure same-membership capture. An actor join/leave/reconnect needs a fresh
 * explicitly authorized transition/baseline; it cannot overwrite an outside
 * ledger through this local projection. Global task-board enablement also needs
 * its separate owner action. Caller still proves consent, resource deltas,
 * quiescence and exact owner/ledger revisions in the durable transaction. */
export function captureAsteroidAgents(frame: AsteroidAttachmentFrame, canonical: AsteroidAgentRecords,
  baseline: AsteroidAgentProjection, edited: AsteroidAgentRecords,
  actors: Readonly<{ before: readonly AttachmentActorBody[]; after: readonly AttachmentActorBody[] }>): AsteroidAgentRecords {
  const expected = projectAsteroidAgents(frame, canonical, actors.before);
  if (canonicalJson(expected) !== canonicalJson(baseline)) throw Error("Stale attached agent projection.");
  const moving = movingAgents(frame, actors.before), after = movingAgents(frame, actors.after);
  const bindings = (value: ReadonlyMap<string, string>) => [...value].sort(([a], [b]) => a.localeCompare(b));
  if (canonicalJson(bindings(moving)) !== canonicalJson(bindings(after))) throw Error("Attached agent membership or connection changed.");
  const selected = partition(frame, canonical, moving, "orbit"), incoming = partition(frame, edited, moving, "local");
  if (incoming.tasks.size !== edited.platform.tasks.length || incoming.waypoints.size !== edited.platform.waypoints.length
    || Object.keys(edited.custody.agents).some(id => !moving.has(id))) throw Error("Edited agent records are outside the attached selection.");
  if (edited.platform.enabled !== canonical.platform.enabled) throw Error("Local capture cannot change global task-board enablement.");
  const originals = new Map(canonical.platform.waypoints.map(value => [value.id, value]));
  const projected = new Map(expected.records.platform.waypoints.map(value => [value.id, value]));
  const capturedWaypoints = edited.platform.waypoints.map(value => {
    const position = { ...rebaseAsteroidPosition(frame, value.position, "local") }, original = originals.get(value.id), base = projected.get(value.id);
    if (original && base) for (const axis of ["x", "y", "z"] as const)
      if (value.position[axis] === base.position[axis]) position[axis] = original.position[axis];
    return { ...cloneUniverseJson(value), position };
  });
  const detached = cloneUniverseJson(edited);
  const output: AsteroidAgentRecords = { platform: { ...canonical.platform,
    tasks: mergeSelectedAttachmentRecords(canonical.platform.tasks, detached.platform.tasks, selected.tasks, value => value.id),
    waypoints: mergeSelectedAttachmentRecords(canonical.platform.waypoints, capturedWaypoints, selected.waypoints, value => value.id) },
    custody: { schema: 1, agents: { ...cloneUniverseJson(Object.fromEntries(Object.entries(canonical.custody.agents).filter(([id]) => !moving.has(id)))),
      ...detached.custody.agents } } };
  projectAsteroidAgents(frame, output, actors.after);
  return output;
}
