import type { PeerInfo, PlayerPose, MultiplayerRole, MultiplayerSessionState } from "./multiplayer";
import type { AgentSessionRecord } from "./agent-platform";
import { SAILBOAT_CAPACITY } from "./boats";
import { humanBodyBounds, type HumanBodyState } from "./player-body";
import { droneBodyBounds } from "./drone-body";
import type { CelestialBounds, CelestialPoint } from "./celestial-terrain";
import { freezeUniverseJson } from "./universe-json";

type AgentBinding = Pick<AgentSessionRecord, "agentId" | "connectionId" | "status" | "updatedAt" | "currentCommand">;
export type HostAttachmentActorInput = Readonly<{
  local: Readonly<{ id: string; position: CelestialPoint; body: HumanBodyState; boatId: string | null;
    mountedCreatureId: number | null; mountedCreatureSeat: number | null }>;
  session: Readonly<{ role: MultiplayerRole | null; state: MultiplayerSessionState; identityId: string; peers: readonly PeerInfo[] }> | null;
  remotes: readonly Readonly<{ id: string; pose: PlayerPose; modelKind: "player" | "drone" }>[];
  agents: readonly AgentBinding[];
  boats: readonly Readonly<{ id: string; passengers: readonly string[] }>[];
  mounts: readonly Readonly<{ creatureId: number; passengers: readonly string[] }>[];
  liveCreatureIds: readonly number[];
  activeWorkAgents: readonly string[];
}>;
export type AttachmentActorBody = Readonly<{
  id: string; kind: "human" | "drone"; position: CelestialPoint; bounds: CelestialBounds;
  connectionId: string | null; poseTick: number | null; agentUpdatedAt: number | null;
  boatId: string | null; boatSeat: number | null; mountedCreatureId: number | null; mountedCreatureSeat: number | null;
}>;

function id(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value || value.trim() !== value) throw Error("Invalid attachment actor identity.");
}
function counter(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw Error("Invalid attachment actor counter.");
}
const emptySeat = () => ({ boatId: null as string | null, boatSeat: null as number | null,
  mountedCreatureId: null as number | null, mountedCreatureSeat: null as number | null });

/** Called only with the synchronous engine-owned transport/model/seat maps.
 * Cross-checks live identities and derives bodies, never trusts supplied AABBs
 * or pose mount claims. The engine adapter supplies these records, not a guest.
 * This snapshot still needs location/owner revision binding, active follower and
 * authored links, actor consent, cargo custody and atomic transition validation.
 * No capabilities, executable work or material ledgers are copied into it. */
export function snapshotHostAttachmentActorBodies(input: HostAttachmentActorInput): readonly AttachmentActorBody[] {
  id(input.local.id);
  if (input.session && (input.session.role !== "host" || !["hosting", "connected"].includes(input.session.state)
    || input.session.identityId !== input.local.id)) throw Error("Attachment actors require the current local host.");
  if (input.activeWorkAgents.length) throw Error("Quiesce active agent work before attachment capture.");
  if (!input.session && input.remotes.length) throw Error("Remote attachment actor has no host session.");
  const agents = new Map<string, AgentBinding>();
  for (const agent of input.agents) {
    id(agent.agentId); id(agent.connectionId);
    if (agents.has(agent.agentId)) throw Error("Duplicate attachment agent session.");
    agents.set(agent.agentId, agent);
  }
  const peers = new Map<string, PeerInfo>(), tokens = new Set<string>();
  for (const peer of input.session?.peers ?? []) {
    if (peer.state !== "connected" || !peer.reliableOpen || !peer.identity)
      throw Error("Attachment peer is not stably connected.");
    id(peer.identity.id); id(peer.token);
    if (peer.identity.peerKind !== undefined && !["human", "agent"].includes(peer.identity.peerKind))
      throw Error("Unknown attachment peer kind.");
    if (peers.has(peer.identity.id) || tokens.has(peer.token) || peer.identity.id === input.local.id)
      throw Error("Duplicate attachment peer identity or connection.");
    peers.set(peer.identity.id, peer); tokens.add(peer.token);
  }
  const localPosition = { x: input.local.position.x, y: input.local.position.y, z: input.local.position.z };
  const actors = new Map<string, AttachmentActorBody>([[input.local.id, { id: input.local.id, kind: "human", position: localPosition,
    bounds: humanBodyBounds(localPosition, input.local.body), connectionId: null, poseTick: null, agentUpdatedAt: null, ...emptySeat() }]]);
  for (const remote of input.remotes) {
    id(remote.id); const peer = peers.get(remote.id), pose = remote.pose;
    if (actors.has(remote.id) || !peer || pose.playerId !== remote.id) throw Error("Unresolved or mismatched attachment actor peer.");
    counter(pose.tick);
    const drone = peer.identity!.peerKind === "agent";
    if (remote.modelKind !== (drone ? "drone" : "player")) throw Error("Attachment actor model differs from authenticated peer kind.");
    let agentUpdatedAt: number | null = null;
    if (drone) {
      const agent = agents.get(remote.id);
      if (!agent || agent.connectionId !== peer.token || !["approved", "paused"].includes(agent.status))
        throw Error("Attachment drone lacks its current admitted session.");
      if (agent.currentCommand && ["accepted", "running"].includes(agent.currentCommand.status))
        throw Error("Quiesce active agent command before attachment capture.");
      counter(agent.updatedAt); agentUpdatedAt = agent.updatedAt;
    } else {
      if (!peer.movementOpen || agents.has(remote.id)) throw Error("Attachment human has an inconsistent movement/session binding.");
    }
    const position = { x: pose.x, y: pose.y, z: pose.z };
    actors.set(remote.id, { id: remote.id, kind: drone ? "drone" : "human", position,
      bounds: drone ? droneBodyBounds(position) : humanBodyBounds(position,
        { variant: pose.sex ?? pose.variant ?? "male", race: pose.race ?? "wayfarer", crouching: pose.crouching ?? false }),
      connectionId: peer.token, poseTick: pose.tick, agentUpdatedAt, ...emptySeat() });
  }
  for (const peerId of peers.keys()) if (!actors.has(peerId)) throw Error("Connected attachment peer has no authoritative body.");
  for (const agent of agents.values()) if (!["revoked", "disconnected"].includes(agent.status) && !actors.has(agent.agentId))
    throw Error("Active attachment agent session has no authoritative body.");
  const seated = new Set<string>(), boats = new Set<string>(), mounts = new Set<number>(), creatures = new Set<number>();
  for (const creatureId of input.liveCreatureIds) {
    counter(creatureId); if (creatures.has(creatureId)) throw Error("Duplicate live attachment creature."); creatures.add(creatureId);
  }
  const assign = (actorId: string, seat: ReturnType<typeof emptySeat>) => {
    id(actorId); const actor = actors.get(actorId);
    if (!actor || seated.has(actorId)) throw Error("Missing or double-booked attachment rider.");
    seated.add(actorId); actors.set(actorId, { ...actor, ...seat });
  };
  for (const boat of input.boats) {
    id(boat.id);
    if (boats.has(boat.id) || boat.passengers.length > SAILBOAT_CAPACITY) throw Error("Invalid attachment boat seat registry.");
    boats.add(boat.id);
    boat.passengers.forEach((actorId, index) => assign(actorId, { ...emptySeat(), boatId: boat.id, boatSeat: index }));
  }
  for (const mount of input.mounts) {
    counter(mount.creatureId);
    if (!creatures.has(mount.creatureId) || mounts.has(mount.creatureId)) throw Error("Missing or duplicate attachment mount registry.");
    mounts.add(mount.creatureId);
    mount.passengers.forEach((actorId, index) => { if (actorId !== "") assign(actorId,
      { ...emptySeat(), mountedCreatureId: mount.creatureId, mountedCreatureSeat: index }); });
  }
  const local = actors.get(input.local.id)!;
  if (local.boatId !== input.local.boatId || local.mountedCreatureId !== input.local.mountedCreatureId
    || local.mountedCreatureSeat !== input.local.mountedCreatureSeat) throw Error("Local attachment rider differs from canonical seats.");
  for (const remote of input.remotes) {
    const actor = actors.get(remote.id)!, pose = remote.pose;
    if (actor.boatId !== (pose.boatId ?? null) || actor.boatSeat !== (pose.boatSeat ?? null)
      || actor.mountedCreatureId !== (pose.mountedCreatureId ?? null) || actor.mountedCreatureSeat !== (pose.mountedCreatureSeat ?? null))
      throw Error("Remote attachment rider differs from canonical seats.");
  }
  return freezeUniverseJson([...actors.values()].sort((a, b) => a.id.localeCompare(b.id)));
}
