import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { snapshotHostAttachmentActorBodies, type HostAttachmentActorInput } from "../app/game/attachment-actor-bodies";
import { humanBodyBounds } from "../app/game/player-body";
import { droneBodyBounds } from "../app/game/drone-body";
import { VoxelEngine } from "../app/game/engine";
import { AgentAuthority } from "../app/game/agent-platform";
import type { PlayerPose, PeerInfo } from "../app/game/multiplayer";

const pose = (id: string): PlayerPose => ({ playerId: id, tick: 3, x: 2, y: 32, z: 1, yaw: 0, pitch: 0,
  vx: 0, vy: 0, vz: 0, grounded: true, sex: "female", race: "dwarf", crouching: true });
const peer = (id: string, drone = false): PeerInfo => ({ token: `connection-${id}`, identity: { id, name: id,
  color: "#abcdef", peerKind: drone ? "agent" : "human" }, state: "connected", connectedAt: 10, lastSeenAt: 20,
  latencyMs: 1, reliableOpen: true, movementOpen: true, voiceOpen: false });
function fixture(): HostAttachmentActorInput {
  return { local: { id: "host", position: { x: 0, y: 32, z: 0 }, body: { variant: "male", race: "wayfarer", crouching: false },
    boatId: null, mountedCreatureId: null, mountedCreatureSeat: null },
    session: { role: "host", state: "connected", identityId: "host", peers: [peer("guest"), peer("drone", true)] },
    remotes: [{ id: "guest", pose: pose("guest"), modelKind: "player" }, { id: "drone", pose: pose("drone"), modelKind: "drone" }],
    agents: [{ agentId: "drone", connectionId: "connection-drone", status: "approved", updatedAt: 20, currentCommand: null }],
    boats: [], mounts: [], liveCreatureIds: [7, 8], activeWorkAgents: [] };
}

test("live host snapshot derives separate human and drone bodies and copies no cargo or capability grants", () => {
  const input = fixture(), before = structuredClone(input), result = snapshotHostAttachmentActorBodies(input);
  assert.deepEqual(result.map(actor => actor.id), ["drone", "guest", "host"]);
  assert.deepEqual(result[0].bounds, droneBodyBounds(pose("drone")));
  assert.deepEqual(result[1].bounds, humanBodyBounds(pose("guest"), { variant: "female", race: "dwarf", crouching: true }));
  assert.equal(result[0].connectionId, "connection-drone"); assert.equal(result[0].agentUpdatedAt, 20);
  assert.equal(result[1].poseTick, 3); assert.equal(result[2].connectionId, null);
  assert.deepEqual(input, before); assert(Object.isFrozen(result)); assert(Object.isFrozen(result[0].bounds));
  assert(!JSON.stringify(result).includes("granted")); assert(!JSON.stringify(result).includes("inventory"));
  assert.notEqual(result[2].position, input.local.position);
});

test("sole local human needs no invented peer or drone session and retains legacy appearance defaults", () => {
  const input = fixture(), local = { ...input.local, id: "local" };
  const solo = snapshotHostAttachmentActorBodies({ ...input, local, session: null, remotes: [], agents: [] });
  assert.equal(solo.length, 1); assert.equal(solo[0].id, "local");
  const old = pose("guest"); delete old.sex; delete old.variant; delete old.race; delete old.crouching;
  const legacy = snapshotHostAttachmentActorBodies({ ...input, remotes: [{ ...input.remotes[0], pose: old }, input.remotes[1]] });
  assert.deepEqual(legacy[1].bounds, humanBodyBounds(old, { variant: "male", race: "wayfarer", crouching: false }));
});

test("guest sessions, orphan bodies, duplicate identities, pending peers and missing movement reject", () => {
  const input = fixture(), session = input.session!;
  const invalid: HostAttachmentActorInput[] = [
    { ...input, session: null }, { ...input, session: { ...session, role: "guest" } }, { ...input, session: { ...session, role: null } },
    { ...input, session: { ...session, state: "disconnected" } }, { ...input, session: { ...session, identityId: "other" } },
    { ...input, remotes: [input.remotes[0]] }, { ...input, remotes: [...input.remotes, input.remotes[0]] },
    { ...input, session: { ...session, peers: [...session.peers, session.peers[0]] } },
    { ...input, session: { ...session, peers: session.peers.map(p => ({ ...p, token: "same-token" })) } },
    { ...input, session: { ...session, peers: [peer("host"), session.peers[1]] } },
    { ...input, session: { ...session, peers: [{ ...session.peers[0], identity: null }, session.peers[1]] } },
    { ...input, session: { ...session, peers: [{ ...session.peers[0], state: "connecting" }, session.peers[1]] } },
    { ...input, session: { ...session, peers: [{ ...session.peers[0], movementOpen: false }, session.peers[1]] } },
    { ...input, remotes: [{ ...input.remotes[0], pose: pose("spoof") }, input.remotes[1]] },
    { ...input, remotes: [{ ...input.remotes[0], modelKind: "drone" }, input.remotes[1]] },
  ];
  for (const changed of invalid) { const before = structuredClone(changed); assert.throws(() => snapshotHostAttachmentActorBodies(changed)); assert.deepEqual(changed, before); }
});

test("drone admission must match the current connection and all executable work must be quiescent", () => {
  const input = fixture(), agent = input.agents[0];
  for (const status of ["pending", "revoked", "disconnected"] as const)
    assert.throws(() => snapshotHostAttachmentActorBodies({ ...input, agents: [{ ...agent, status }] }), /admitted session/);
  assert.throws(() => snapshotHostAttachmentActorBodies({ ...input, agents: [] }), /admitted session/);
  assert.throws(() => snapshotHostAttachmentActorBodies({ ...input, agents: [{ ...agent, connectionId: "old-connection" }] }), /admitted session/);
  assert.throws(() => snapshotHostAttachmentActorBodies({ ...input, agents: [agent, agent] }), /Duplicate/);
  assert.throws(() => snapshotHostAttachmentActorBodies({ ...input, agents: [agent, { ...agent, agentId: "ghost" }] }), /no authoritative body/);
  assert.throws(() => snapshotHostAttachmentActorBodies({ ...input, activeWorkAgents: ["drone"] }), /Quiesce/);
  for (const status of ["accepted", "running"] as const)
    assert.throws(() => snapshotHostAttachmentActorBodies({ ...input, agents: [{ ...agent,
      currentCommand: { status } as NonNullable<typeof agent.currentCommand> }] }), /Quiesce/);
  const paused = snapshotHostAttachmentActorBodies({ ...input, agents: [{ ...agent, status: "paused" }] });
  assert.equal(paused[0].kind, "drone");
});

test("riders are derived from canonical boat and mount seats; spoofed, missing or double-booked seats reject", () => {
  const input = fixture(), remote = input.remotes[0];
  const seated: HostAttachmentActorInput = { ...input,
    local: { ...input.local, mountedCreatureId: 7, mountedCreatureSeat: 1 }, mounts: [{ creatureId: 7, passengers: ["", "host"] }],
    boats: [{ id: "boat", passengers: ["guest"] }],
    remotes: [{ ...remote, pose: { ...remote.pose, boatId: "boat", boatSeat: 0 } }, input.remotes[1]] };
  const result = snapshotHostAttachmentActorBodies(seated);
  assert.equal(result[1].boatId, "boat"); assert.equal(result[2].mountedCreatureId, 7); assert.equal(result[2].mountedCreatureSeat, 1);
  for (const changed of [
    { ...seated, boats: [] }, { ...seated, mounts: [] }, { ...seated, liveCreatureIds: [8] },
    { ...seated, mounts: [{ creatureId: 7, passengers: ["host", "host"] }] },
    { ...seated, boats: [{ id: "boat", passengers: ["guest", "host"] }] },
    { ...seated, boats: [{ id: "boat", passengers: ["missing"] }] },
    { ...seated, remotes: input.remotes }, { ...seated, mounts: [...seated.mounts, seated.mounts[0]] },
    { ...seated, boats: [...seated.boats, seated.boats[0]] },
    { ...input, remotes: [{ ...remote, pose: { ...remote.pose, mountedCreatureId: 7, mountedCreatureSeat: 0 } }, input.remotes[1]] },
  ]) assert.throws(() => snapshotHostAttachmentActorBodies(changed));
});

test("engine adapter reads its actual local and host-owned maps, refuses active tasks, and never mutates them", () => {
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, { position: new THREE.Vector3(.1, 32, -.2), playerVariant: "female", crouching: true,
    activeCharacterProfile: { appearance: { race: "dwarf" } }, multiplayer: null, mountedBoatId: null, mountedCreatureId: null,
    mountedCreatureSeat: null, remotePlayers: new Map(), agentAuthority: new AgentAuthority(), boats: new Map(), creatureMountSeats: new Map(),
    mobs: [], agentRuntimeTasks: new Map(), agentBuildJobs: new Map(), agentBuildPreviews: new Map() });
  const before = engine.position.clone(), result = engine.snapshotAttachmentActorBodies();
  assert.equal(result[0].id, "local"); assert.deepEqual(result[0].bounds,
    humanBodyBounds(before, { variant: "female", race: "dwarf", crouching: true }));
  assert.deepEqual(engine.position, before);
  Object.assign(engine, { agentRuntimeTasks: new Map([["drone", {}]]) });
  assert.throws(() => engine.snapshotAttachmentActorBodies(), /Quiesce/);
  Object.assign(engine, { agentRuntimeTasks: new Map(), agentBuildJobs: new Map([["drone", {}]]) });
  assert.throws(() => engine.snapshotAttachmentActorBodies(), /Quiesce/);
  Object.assign(engine, { agentBuildJobs: new Map(), agentBuildPreviews: new Map([["preview", { agentId: "drone" }]]) });
  assert.throws(() => engine.snapshotAttachmentActorBodies(), /Quiesce/);
});

test("engine adapter binds actual AgentAuthority sessions to current transport tokens and canonical seats", () => {
  const input = fixture(), authority = new AgentAuthority();
  authority.register({ agentId: "drone", connectionId: "connection-drone", name: "Drone" }, 10);
  authority.approve("drone", undefined, 20);
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, { position: new THREE.Vector3(0, 32, 0), playerVariant: "male", crouching: false,
    multiplayer: { role: "host", state: "connected", identity: { id: "host" }, getPeers: () => input.session!.peers },
    mountedBoatId: null, mountedCreatureId: 7, mountedCreatureSeat: 0,
    remotePlayers: new Map(input.remotes.map(remote => [remote.id, { target: remote.pose, model: { modelKind: remote.modelKind } }])),
    agentAuthority: authority, boats: new Map(), creatureMountSeats: new Map([[7, ["host"]]]),
    mobs: [{ id: 7 }, { id: 8 }], agentRuntimeTasks: new Map(), agentBuildJobs: new Map(), agentBuildPreviews: new Map() });
  const first = engine.snapshotAttachmentActorBodies();
  assert.equal(first[0].agentUpdatedAt, 20); assert.equal(first[2].mountedCreatureId, 7);
  authority.register({ agentId: "drone", connectionId: "connection-new", name: "Drone" }, 30);
  authority.approve("drone", undefined, 40);
  assert.throws(() => engine.snapshotAttachmentActorBodies(), /admitted session/);
  assert.equal(first[0].agentUpdatedAt, 20); assert.equal(first[0].connectionId, "connection-drone");
  assert.deepEqual(engine.creatureMountSeats.get(7), ["host"]);
});
