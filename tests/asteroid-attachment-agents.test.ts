import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, asteroidAttachmentPhysicalBounds } from "../app/game/asteroid-attachment-frame";
import { projectAsteroidAgents, captureAsteroidAgents, type AsteroidAgentRecords } from "../app/game/asteroid-attachment-agents";
import { createAgentTask, createAgentWaypoint } from "../app/game/agent-platform";
import type { AttachmentActorBody } from "../app/game/attachment-actor-bodies";
import { droneBodyBounds } from "../app/game/drone-body";
import { humanBodyBounds } from "../app/game/player-body";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { canonicalJson } from "../app/game/universe-json";
import { Item } from "../app/game/data";

const orbit = locationAddress({ ...homeLocation(universeId("agent-selection")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902);
const frame = registry.asteroids.map(entry => createAsteroidAttachmentFrame(registry, entry.descriptor.id))
  .find(value => value.offset.y !== 0 && value.orbitBounds.minY < -8 && value.orbitBounds.maxY > 16)!;
const point = { x: frame.offset.x + .125, y: .1, z: frame.offset.z - .375 };
function actors(): AttachmentActorBody[] {
  return ["host", "drone", "outside"].map(id => {
    const position = { ...point, x: point.x + (id === "outside" ? 80 : 0) }, drone = id !== "host";
    return { id, kind: drone ? "drone" : "human", position,
      bounds: drone ? droneBodyBounds(position) : humanBodyBounds(position, { variant: "male", race: "wayfarer", crouching: false }),
      connectionId: drone ? `connection-${id}` : null, poseTick: drone ? 3 : null, agentUpdatedAt: drone ? 20 : null,
      boatId: null, boatSeat: null, mountedCreatureId: null, mountedCreatureSeat: null };
  });
}
function fixture(): AsteroidAgentRecords {
  const waypoint = (id: string, x: number, agentId = "drone") => createAgentWaypoint({ id, agentId, name: `Point ${id}`,
    position: { ...point, x: point.x + x }, source: "system" }, 10.5);
  const task = (id: string, agentId: string, waypointIds: string[]) => createAgentTask({ id, agentId, title: `Task ${id}`,
    owner: "historical-owner", note: "Exact historical note", status: "paused", waypointIds, previewIds: ["old-preview"] }, 20.5);
  const ledger = (revision: number) => ({ revision, inventory: [null, { item: Item.FieldWrench, count: 1, durability: 51,
    metadata: { x: 777, y: .1, sealed: { fuelMl: 17, oxygenMl: 421 } } }], returning: [{ item: Item.StoneDust, count: 4000 }] });
  return { platform: { schema: 1, enabled: true,
    tasks: [task("outside-task", "drone", ["outside-point"]), task("inside-task", "offline", ["inside-point"]),
      task("offline-task", "offline", []), task("moving-task", "drone", [])],
    waypoints: [waypoint("outside-point", 80), waypoint("inside-point", 0, "offline"), waypoint("outside-point-2", -80), waypoint("inside-point-2", 2)] },
    custody: { schema: 1, agents: { outside: ledger(1), drone: ledger(7), offline: ledger(3) } } };
}
const capture = (input: AsteroidAgentRecords, edited: AsteroidAgentRecords, bodies = actors()) =>
  captureAsteroidAgents(frame, input, projectAsteroidAgents(frame, input, bodies), edited, { before: bodies, after: bodies });

test("agent selection follows whole waypoint groups or explicitly selected live drones, never historical owners", () => {
  const input = fixture(), bodies = actors(), before = structuredClone({ input, bodies });
  const projected = projectAsteroidAgents(frame, input, bodies);
  assert.deepEqual(projected.records.platform.tasks.map(value => value.id), ["inside-task", "moving-task"]);
  assert.deepEqual(projected.records.platform.waypoints.map(value => value.id), ["inside-point", "inside-point-2"]);
  assert.deepEqual(Object.keys(projected.records.custody.agents), ["drone"]);
  assert.equal(projected.records.platform.waypoints[0].position.x, .125);
  assert.deepEqual(projected.records.platform.tasks[0].previewIds, ["old-preview"]);
  assert.equal(projected.records.custody.agents.drone.returning[0].count, 4000);
  assert.equal(projected.records.custody.agents.drone.inventory[1]!.metadata!.x, 777);
  assert.deepEqual({ input, bodies }, before);
  projected.records.custody.agents.drone.inventory[1]!.metadata!.x = -1;
  assert.equal(input.custody.agents.drone.inventory[1]!.metadata!.x, 777);
});

test("one hundred cold agent cycles preserve exact fractional coordinates, finite ledgers and outside ordering", () => {
  const original = fixture(), bodies = actors(); let input = structuredClone(original);
  for (let i = 0; i < 100; i++) {
    const baseline = projectAsteroidAgents(frame, input, bodies);
    input = JSON.parse(JSON.stringify(captureAsteroidAgents(frame, input, baseline,
      JSON.parse(JSON.stringify(baseline.records)), { before: bodies, after: bodies })));
  }
  assert.equal(canonicalJson(input), canonicalJson(original));
  assert.equal(input.platform.waypoints[1].position.y, .1);
});

test("reorders preserve original slots, creations append, removals affect only the selected unit", () => {
  const input = fixture(), local = projectAsteroidAgents(frame, input, actors()).records;
  const changed: AsteroidAgentRecords = { ...local, platform: { ...local.platform,
    tasks: [local.platform.tasks[1], { ...local.platform.tasks[0], note: "Edited note" },
      createAgentTask({ id: "new-task", agentId: "drone", title: "New", waypointIds: ["new-point"] }, 30)],
    waypoints: [{ ...local.platform.waypoints[0], position: { ...local.platform.waypoints[0].position, x: 3.5 } },
      createAgentWaypoint({ id: "new-point", agentId: "drone", name: "New", position: local.platform.waypoints[1].position }, 30)] } };
  const output = capture(input, changed);
  assert.deepEqual(output.platform.tasks.map(value => value.id), ["outside-task", "inside-task", "offline-task", "moving-task", "new-task"]);
  assert.deepEqual(output.platform.waypoints.map(value => value.id), ["outside-point", "inside-point", "outside-point-2", "new-point"]);
  assert.equal(output.platform.waypoints[1].position.x, frame.offset.x + 3.5);
  assert.equal(output.platform.waypoints[1].position.y, .1);
  assert.equal(output.platform.tasks[1].note, "Edited note");
  assert.deepEqual(output.custody, input.custody);
  output.custody.agents.outside.inventory[1]!.metadata!.x = -1;
  assert.equal(input.custody.agents.outside.inventory[1]!.metadata!.x, 777);
  const removed = capture(input, { ...local, platform: { ...local.platform, tasks: [], waypoints: [] }, custody: { schema: 1, agents: {} } });
  assert.deepEqual(removed.platform.tasks.map(value => value.id), ["outside-task", "offline-task"]);
  assert.deepEqual(Object.keys(removed.custody.agents), ["offline", "outside"]);
});

test("global identities cannot replace outside task or waypoint records", () => {
  const input = fixture(), before = structuredClone(input), local = projectAsteroidAgents(frame, input, actors()).records;
  for (const platform of [
    { ...local.platform, tasks: [...local.platform.tasks, { ...local.platform.tasks[1], id: "outside-task" }] },
    { ...local.platform, waypoints: [...local.platform.waypoints, { ...local.platform.waypoints[1], id: "outside-point-2" }] },
  ]) assert.throws(() => capture(input, { ...local, platform }), /Duplicate/);
  assert.deepEqual(input, before);
});

test("unknown fields, invalid values and every lossy normalizer behavior reject even outside the frame", () => {
  const input = fixture(), platform = input.platform, task = platform.tasks[0], waypoint = platform.waypoints[0];
  const cases = [
    { ...input, future: 1 }, { ...input, platform: { ...platform, future: 1 } },
    { ...input, platform: { ...platform, tasks: [{ ...task, future: 1 }, ...platform.tasks.slice(1)] } },
    { ...input, platform: { ...platform, waypoints: [{ ...waypoint, future: 1 }, ...platform.waypoints.slice(1)] } },
    { ...input, platform: { ...platform, waypoints: [{ ...waypoint, position: { ...waypoint.position, future: 1 } }, ...platform.waypoints.slice(1)] } },
    { ...input, platform: { ...platform, tasks: [{ ...task, title: " whitespace " }, ...platform.tasks.slice(1)] } },
    { ...input, platform: { ...platform, tasks: [{ ...task, previewIds: Array.from({ length: 33 }, (_, i) => `preview-${i}`) }, ...platform.tasks.slice(1)] } },
    { ...input, platform: { ...platform, tasks: Array.from({ length: 129 }, (_, i) => ({ ...task, id: `task-${i}` })) } },
    { ...input, platform: { ...platform, waypoints: [{ ...waypoint, position: { ...waypoint.position, y: 5000 } }, ...platform.waypoints.slice(1)] } },
    { ...input, custody: { ...input.custody, agents: { ...input.custody.agents, outside: { ...input.custody.agents.outside, revision: -1 } } } },
  ];
  for (const invalid of cases) assert.throws(() => projectAsteroidAgents(frame, invalid, actors()));
  assert.throws(() => projectAsteroidAgents(frame, { ...input, custody: { schema: 1,
    agents: { ...input.custody.agents, host: input.custody.agents.offline } } }, actors()), /human/);
});

test("missing, duplicate and cross-boundary task waypoint groups fail closed", () => {
  const input = fixture(), task = input.platform.tasks[0];
  for (const waypointIds of [["missing"], ["outside-point", "outside-point"], ["outside-point", "inside-point"]])
    assert.throws(() => projectAsteroidAgents(frame, { ...input, platform: { ...input.platform,
      tasks: [{ ...task, waypointIds }, ...input.platform.tasks.slice(1)] } }, actors()));
  for (const patch of [{ previewIds: ["same", "same"] }, { id: "inside-task" }])
    assert.throws(() => projectAsteroidAgents(frame, { ...input, platform: { ...input.platform,
      tasks: [{ ...task, ...patch }, ...input.platform.tasks.slice(1)] } }, actors()), /Duplicate/);
});

test("stale actor baselines and drone join, leave or reconnect require a fresh authorized transition", () => {
  const input = fixture(), bodies = actors(), baseline = projectAsteroidAgents(frame, input, bodies);
  const changedToken = bodies.map(body => body.id === "drone" ? { ...body, connectionId: "new-connection" } : body);
  assert.throws(() => captureAsteroidAgents(frame, input, baseline, baseline.records,
    { before: changedToken, after: changedToken }), /Stale/);
  const other = bodies[2];
  for (const after of [changedToken, bodies.filter(body => body.id !== "drone"),
    bodies.map(body => body.id === "drone" ? { ...body, bounds: other.bounds, position: other.position } : body),
    bodies.map(body => body.id === "outside" ? { ...body, bounds: bodies[1].bounds, position: bodies[1].position } : body)])
    assert.throws(() => captureAsteroidAgents(frame, input, baseline, baseline.records, { before: bodies, after }), /membership/);
  const moved = bodies.map(body => body.id === "drone" ? { ...body, poseTick: 4,
    position: { ...body.position, x: body.position.x + 1 }, bounds: droneBodyBounds({ ...body.position, x: body.position.x + 1 }) } : body);
  assert.deepEqual(captureAsteroidAgents(frame, input, baseline, baseline.records, { before: bodies, after: moved }), input);
  assert.throws(() => projectAsteroidAgents(frame, input, bodies.map(body => body.id === "drone" ? { ...body, connectionId: null } : body)), /connection/);
});

test("local capture cannot toggle global enablement, alter outside custody or create unselected tasks/waypoints", () => {
  const input = fixture(), local = projectAsteroidAgents(frame, input, actors()).records;
  const b = asteroidAttachmentPhysicalBounds(frame, "local");
  const cases: AsteroidAgentRecords[] = [
    { ...local, platform: { ...local.platform, enabled: false } },
    { ...local, custody: input.custody },
    { ...local, platform: { ...local.platform, tasks: [...local.platform.tasks,
      createAgentTask({ id: "new", agentId: "offline", title: "Unanchored" }, 30)] } },
    { ...local, platform: { ...local.platform, waypoints: local.platform.waypoints.map(value => ({ ...value,
      position: { ...value.position, x: b.maxX } })) } },
  ];
  for (const edited of cases) assert.throws(() => capture(input, edited), /outside|enablement/);
  assert.throws(() => capture(input, { ...local, platform: { ...local.platform, waypoints: [] } }), /Missing/);
});
