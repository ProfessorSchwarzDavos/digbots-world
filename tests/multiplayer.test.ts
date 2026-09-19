import assert from "node:assert/strict";
import { homeLocation, locationId, universeId } from "../app/game/location-address.ts";
const TEST_SCOPE = Object.freeze({ locationId: locationId(homeLocation(universeId("wire-test"))), epoch: 3, revision: 7 });
import test from "node:test";
import {
  MAX_MOVEMENT_MESSAGE_BYTES,
  MOVEMENT_CHANNEL_LABEL,
  MULTIPLAYER_PROTOCOL_NAME,
  MULTIPLAYER_PROTOCOL_VERSION,
  MultiplayerOperationCancelledError,
  MultiplayerProtocolError,
  MultiplayerSession,
  RELIABLE_CHANNEL_LABEL,
  VOICE_CHANNEL_LABEL,
  decodeEnvelope,
  decodeInviteCode,
  detectMultiplayerSupport,
  encodeEnvelope,
  encodeInviteCode,
  parseMultiplayerLatencyRange,
  validateEnvelope,
  validatePeerIdentity,
  type BlockAction,
  type ContainerAction,
  type CreatureAction,
  type DataChannelLike,
  type ManualSignal,
  type InventoryAction,
  type MultiplayerEnvelope,
  type MultiplayerEvent,
  type PeerConnectionFactory,
  type PeerConnectionLike,
  type PeerIdentity,
  type PlayerPose,
  type TimeWeatherSnapshot,
  type WorldSnapshot,
} from "../app/game/multiplayer.ts";
import type { AgentChatMessage, AgentCommandEnvelope, AgentVoiceChunk } from "../app/game/agent-platform.ts";

const HOST: PeerIdentity = { id: "player_host_001", name: "Host", color: "#44aaee" };
const GUEST_A: PeerIdentity = { id: "player_guest_01", name: "Guest A", color: "#ee8844" };
const GUEST_B: PeerIdentity = { id: "player_guest_02", name: "Guest B", color: "#88dd66" };

function deterministicIds(namespace: string) {
  let sequence = 0;
  return (prefix: string) => `${prefix}_${namespace}_${String(++sequence).padStart(4, "0")}`;
}

class FakeDataChannel implements DataChannelLike {
  readonly label: string;
  readonly ordered: boolean;
  readonly maxRetransmits: number | null;
  readyState: RTCDataChannelState = "connecting";
  bufferedAmount = 0;
  binaryType: BinaryType = "blob";
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  remote: FakeDataChannel | null = null;
  sent: string[] = [];
  private nextOrderedDeliveryAt = 0;

  constructor(label: string, options: RTCDataChannelInit = {}, private readonly deliveryDelayMs: () => number = () => 0) {
    this.label = label;
    this.ordered = options.ordered ?? true;
    this.maxRetransmits = options.maxRetransmits ?? null;
  }

  open() {
    if (this.readyState !== "connecting") return;
    this.readyState = "open";
    this.onopen?.({ type: "open" } as Event);
  }

  send(data: string) {
    if (this.readyState !== "open") throw new Error("channel is not open");
    this.sent.push(data);
    const target = this.remote;
    const deliver = () => {
      if (target?.readyState === "open") target.onmessage?.({ data } as MessageEvent);
    };
    const delay = this.deliveryDelayMs();
    if (delay <= 0) {
      queueMicrotask(deliver);
      return;
    }
    const now = Date.now();
    const deliveryAt = this.ordered ? Math.max(now + delay, this.nextOrderedDeliveryAt + 1) : now + delay;
    if (this.ordered) this.nextOrderedDeliveryAt = deliveryAt;
    const scheduledDelay = Math.max(0, deliveryAt - now);
    if (scheduledDelay > 0) setTimeout(deliver, scheduledDelay);
    else queueMicrotask(deliver);
  }

  close() {
    if (this.readyState === "closed") return;
    this.readyState = "closed";
    const target = this.remote;
    this.remote = null;
    this.onclose?.({ type: "close" } as Event);
    target?.remoteClose();
  }

  private remoteClose() {
    if (this.readyState === "closed") return;
    this.readyState = "closed";
    this.remote = null;
    this.onclose?.({ type: "close" } as Event);
  }
}

class FakeRtcNetwork {
  private sequence = 0;
  readonly connections = new Map<string, FakePeerConnection>();

  constructor(readonly nativeDescriptionPrototype = false, readonly deliveryDelayMs: () => number = () => 0) {}

  factory: PeerConnectionFactory = () => {
    const connection = new FakePeerConnection(this, `rtc_${++this.sequence}`);
    this.connections.set(connection.id, connection);
    return connection;
  };
}

class FakePeerConnection implements PeerConnectionLike {
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  iceGatheringState: RTCIceGatheringState = "complete";
  connectionState: RTCPeerConnectionState = "new";
  onicegatheringstatechange: ((event: Event) => void) | null = null;
  onconnectionstatechange: ((event: Event) => void) | null = null;
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null = null;
  readonly channels: FakeDataChannel[] = [];
  private remoteOfferId: string | null = null;

  constructor(private readonly network: FakeRtcNetwork, readonly id: string) {}

  createDataChannel(label: string, options?: RTCDataChannelInit) {
    const channel = new FakeDataChannel(label, options, this.network.deliveryDelayMs);
    this.channels.push(channel);
    return channel;
  }

  async createOffer() {
    return { type: "offer" as const, sdp: `fake-offer:${this.id}` };
  }

  async createAnswer() {
    if (!this.remoteOfferId) throw new Error("missing remote offer");
    return { type: "answer" as const, sdp: `fake-answer:${this.id}:${this.remoteOfferId}` };
  }

  async setLocalDescription(description: RTCSessionDescriptionInit) {
    const plain = { type: description.type, sdp: description.sdp };
    this.localDescription = this.network.nativeDescriptionPrototype
      ? Object.assign(Object.create({ toJSON() { return plain; } }) as RTCSessionDescriptionInit, plain)
      : plain;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    this.remoteDescription = { type: description.type, sdp: description.sdp };
    if (description.type === "offer") {
      this.remoteOfferId = description.sdp?.split(":")[1] ?? null;
      return;
    }
    const [, guestId, hostId] = description.sdp?.split(":") ?? [];
    const guest = this.network.connections.get(guestId);
    if (!guest || hostId !== this.id) throw new Error("fake answer points to an unknown connection");
    this.connectToGuest(guest);
  }

  private connectToGuest(guest: FakePeerConnection) {
    for (const local of this.channels) {
      const remote = new FakeDataChannel(local.label, { ordered: local.ordered, ...(local.maxRetransmits === null ? {} : { maxRetransmits: local.maxRetransmits }) }, this.network.deliveryDelayMs);
      local.remote = remote;
      remote.remote = local;
      guest.channels.push(remote);
      guest.ondatachannel?.({ channel: remote } as unknown as RTCDataChannelEvent);
      local.open();
      remote.open();
    }
    this.connectionState = "connected";
    guest.connectionState = "connected";
    this.onconnectionstatechange?.({ type: "connectionstatechange" } as Event);
    guest.onconnectionstatechange?.({ type: "connectionstatechange" } as Event);
  }

  close() {
    if (this.connectionState === "closed") return;
    this.connectionState = "closed";
    for (const channel of this.channels) channel.close();
  }
}

function makeSession(identity: PeerIdentity, network: FakeRtcNetwork, now: () => number, events: MultiplayerEvent[]) {
  return new MultiplayerSession({
    identity,
    locationScope: TEST_SCOPE,
    peerConnectionFactory: network.factory,
    randomId: deterministicIds(identity.name.replace(/\s/gu, "")),
    now,
    heartbeatIntervalMs: 1_000,
    peerTimeoutMs: 4_000,
    connectionTimeoutMs: 10_000,
    iceGatheringTimeoutMs: 500,
    autoMaintenance: false,
    onEvent: (event) => events.push(event),
  });
}

async function flushMessages() {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => queueMicrotask(resolve));
}

async function connect(host: MultiplayerSession, guest: MultiplayerSession) {
  const offer = await host.createHostInvite();
  const answer = await guest.createGuestAnswer(offer.inviteCode);
  await host.acceptGuestAnswer(answer.answerCode);
  await flushMessages();
  return offer.token;
}

function pose(playerId: string, tick = 1): PlayerPose {
  return { playerId, tick, x: 2, y: 40, z: -6, yaw: 0.3, pitch: -0.1, vx: 1, vy: 0, vz: -1, grounded: true, heldItem: 32 };
}

test("identity, invite, and versioned envelope codecs round-trip with bounds", () => {
  assert.equal(validatePeerIdentity(HOST), true);
  assert.equal(validatePeerIdentity({ ...HOST, color: "blue" }), false);
  const offer: ManualSignal = {
    version: MULTIPLAYER_PROTOCOL_VERSION,
    scope: TEST_SCOPE,
    protocol: MULTIPLAYER_PROTOCOL_NAME,
    kind: "offer",
    sessionId: "session_codec_01",
    token: "invite_codec_001",
    identity: HOST,
    description: { type: "offer", sdp: "v=0\r\na=fingerprint:sha-256 test" },
  };
  assert.deepEqual(decodeInviteCode(encodeInviteCode(offer)), offer);

  const envelope: MultiplayerEnvelope<"player-pose"> = {
    version: MULTIPLAYER_PROTOCOL_VERSION,
    scope: TEST_SCOPE,
    sessionId: "session_codec_01",
    type: "player-pose",
    sequence: 3,
    sentAt: 100,
    from: HOST.id,
    payload: pose(HOST.id),
  };
  const encoded = encodeEnvelope(envelope, MAX_MOVEMENT_MESSAGE_BYTES);
  assert.deepEqual(decodeEnvelope(encoded, MAX_MOVEMENT_MESSAGE_BYTES), envelope);
  const bytes = new TextEncoder().encode(encoded);
  assert.deepEqual(decodeEnvelope(bytes, MAX_MOVEMENT_MESSAGE_BYTES), envelope);
  assert.equal(validateEnvelope({ ...envelope, version: 999 }), false);
  const semanticContainerRequest: ContainerAction = {
    requestId: "container_codec_001", actorId: HOST.id, containerId: "1,2,3", kind: "mutate",
    operation: { op: "distribute", targets: [9, 10], button: "right" }, expectedRevision: 2,
    expectedPlayerRevision: 5, status: "request",
  };
  const containerEnvelope = {
    ...envelope,
    type: "container-action" as const,
    payload: semanticContainerRequest,
  } satisfies MultiplayerEnvelope<"container-action">;
  assert.equal(validateEnvelope(containerEnvelope), true);
  assert.equal(validateEnvelope({
    ...containerEnvelope,
    payload: { ...semanticContainerRequest, slots: [{ item: 1, count: 64 }] },
  }), false, "guest requests cannot upload full inventory images");
  const transferOffer: CreatureAction = {
    requestId: "transfer_offer_001",
    actorId: HOST.id,
    tick: 4,
    kind: "camp-transfer-offer",
    orbId: "orb_companion_01",
    recipientId: GUEST_A.id,
    status: "request",
  };
  assert.equal(validateEnvelope({
    ...envelope,
    type: "creature-action",
    payload: transferOffer,
  } satisfies MultiplayerEnvelope<"creature-action">), true);
  assert.equal(validateEnvelope({
    ...envelope,
    type: "creature-action",
    payload: { ...transferOffer, recipientId: "x".repeat(161) },
  }), false);
  assert.throws(() => encodeEnvelope(envelope, 20), MultiplayerProtocolError);
  assert.throws(() => decodeEnvelope("{bad json"), MultiplayerProtocolError);
  assert.throws(() => decodeInviteCode("BW9.not-supported"), MultiplayerProtocolError);
});

test("feature detection reports missing browser WebRTC without throwing", () => {
  const support = detectMultiplayerSupport({ TextEncoder, TextDecoder, btoa, atob, crypto } as unknown as typeof globalThis);
  assert.equal(support.supported, false);
  assert.equal(support.webRTC, false);
  assert.ok(support.reasons.some((reason) => reason.includes("RTCPeerConnection")));
});

test("protocol4 rejects unscoped, old and foreign signaling before payload access", async () => {
  const network = new FakeRtcNetwork();
  const host = makeSession(HOST, network, () => 100, []);
  const guest = new MultiplayerSession({ identity: GUEST_A, peerConnectionFactory: network.factory, autoMaintenance: false });
  await assert.rejects(guest.createHostInvite(), /validated location/u);
  const offer = await host.createHostInvite();
  const decoded = decodeInviteCode(offer.inviteCode);
  const answer = await guest.createGuestAnswer(offer.inviteCode);
  assert.deepEqual(guest.locationScope, TEST_SCOPE, "title guest adopts host identity without a local save");
  const bad = { ...decodeInviteCode(answer.answerCode), scope: { ...TEST_SCOPE, epoch: TEST_SCOPE.epoch + 1 } };
  await assert.rejects(host.acceptGuestAnswer(encodeInviteCode(bad)), /different location/u);
  await host.acceptGuestAnswer(answer.answerCode); await flushMessages();
  assert.equal(host.state, "connected");
  assert.equal(decoded.version, 4);
  let touched = false;
  const unscoped = { version: 4, get payload() { touched = true; throw Error("must not inspect payload"); } };
  assert.equal(validateEnvelope(unscoped), false); assert.equal(touched, false);
  assert.equal(validateEnvelope({ version: 3, get payload() { throw Error("old protocol payload accessed"); } }), false);
  guest.dispose(); host.dispose();
});

test("scope mismatch and changed-intent replay never reach gameplay handlers", async () => {
  const variants = [
    { ...TEST_SCOPE, locationId: locationId(homeLocation(universeId("foreign-universe"))) },
    { ...TEST_SCOPE, epoch: TEST_SCOPE.epoch - 1 },
    { ...TEST_SCOPE, revision: TEST_SCOPE.revision - 1 },
  ];
  for (const scope of variants) {
    const network = new FakeRtcNetwork(), events: MultiplayerEvent[] = [];
    const host = makeSession(HOST, network, () => 100, events), guest = makeSession(GUEST_A, network, () => 100, []);
    await connect(host, guest);
    const channel = [...network.connections.values()][1].channels.find(entry => entry.label === RELIABLE_CHANNEL_LABEL)!;
    const payload: InventoryAction = { requestId: "scope_pickup_001", actorId: GUEST_A.id, kind: "collect", dropId: 71, status: "request" };
    channel.send(JSON.stringify({ version: 4, scope, sessionId: host.sessionId, sequence: 100, sentAt: 100, from: GUEST_A.id, type: "inventory-action", payload }));
    await flushMessages();
    assert.equal(events.filter(event => event.type === "message").length, 0);
    assert.ok(events.some(event => event.type === "error" && /location|epoch|revision/u.test(event.error.message)));
    guest.sendInventoryAction(payload); await flushMessages();
    guest.sendInventoryAction(payload); await flushMessages();
    guest.sendInventoryAction({ ...payload, dropId: 72 }); await flushMessages();
    assert.equal(events.filter(event => event.type === "message").length, 1, "duplicate and altered retry cannot execute twice");
    assert.ok(events.some(event => event.type === "error" && /different intent/u.test(event.error.message)));
    guest.dispose(); host.dispose();
  }
});

test("browser multiplayer latency QA range is explicit and safely bounded", () => {
  assert.deepEqual(parseMultiplayerLatencyRange("?mpLatency=100-250"), { min: 100, max: 250 });
  assert.deepEqual(parseMultiplayerLatencyRange("mode=qa&mpLatency=0-2000"), { min: 0, max: 2_000 });
  assert.equal(parseMultiplayerLatencyRange("?mpLatency=250-100"), undefined);
  assert.equal(parseMultiplayerLatencyRange("?mpLatency=0-2001"), undefined);
  assert.equal(parseMultiplayerLatencyRange("?mpLatency=fast"), undefined);
});

test("closing a session during ICE setup cancels cleanly without a false transport error", async () => {
  const network = new FakeRtcNetwork();
  const events: MultiplayerEvent[] = [];
  const host = makeSession(HOST, network, () => 1_000, events);
  const invitePromise = host.createHostInvite();
  const connection = [...network.connections.values()][0];
  assert.ok(connection);
  connection.iceGatheringState = "gathering";
  await flushMessages();
  host.dispose();

  await assert.rejects(invitePromise, (error: unknown) => {
    assert.ok(error instanceof MultiplayerOperationCancelledError);
    assert.doesNotMatch(error.message, /missing local offer description/iu);
    return true;
  });
  assert.equal(events.some((event) => event.type === "error"), false);
});

test("browser-native local descriptions survive the automatic offer and answer exchange", async () => {
  const network = new FakeRtcNetwork(true);
  const hostEvents: MultiplayerEvent[] = [];
  const guestEvents: MultiplayerEvent[] = [];
  const host = makeSession(HOST, network, () => 1_000, hostEvents);
  const guest = makeSession(GUEST_A, network, () => 1_000, guestEvents);

  await connect(host, guest);

  assert.equal(host.state, "connected");
  assert.equal(guest.state, "connected");
  assert.equal(hostEvents.some((event) => event.type === "error"), false);
  assert.equal(guestEvents.some((event) => event.type === "error"), false);
});

test("manual offer/answer creates gameplay, movement, and voice lanes and carries host-authoritative messages", async () => {
  const network = new FakeRtcNetwork();
  let clock = 1_000;
  const hostEvents: MultiplayerEvent[] = [];
  const guestEvents: MultiplayerEvent[] = [];
  const host = makeSession(HOST, network, () => clock, hostEvents);
  const guest = makeSession(GUEST_A, network, () => clock, guestEvents);
  await connect(host, guest);

  assert.equal(host.state, "connected");
  assert.equal(guest.state, "connected");
  assert.equal(host.getPeers().length, 1);
  assert.equal(host.getPeers()[0].identity?.id, GUEST_A.id);
  const hostConnection = [...network.connections.values()][0];
  assert.equal(hostConnection.channels.find((channel) => channel.label === RELIABLE_CHANNEL_LABEL)?.ordered, true);
  const movement = hostConnection.channels.find((channel) => channel.label === MOVEMENT_CHANNEL_LABEL);
  assert.equal(movement?.ordered, false);
  assert.equal(movement?.maxRetransmits, 0);
  assert.equal(hostConnection.channels.find((channel) => channel.label === VOICE_CHANNEL_LABEL)?.ordered, true);

  const action: BlockAction = {
    requestId: "request_block_01",
    actorId: GUEST_A.id,
    tick: 2,
    kind: "place",
    edits: [{ x: 3, y: 41, z: -6, type: 10 }],
    status: "request",
  };
  assert.equal(guest.sendBlockAction(action), 1);
  assert.equal(guest.sendPlayerPose(pose(GUEST_A.id, 2)), 1);
  await flushMessages();
  const hostMessages = hostEvents.filter((event): event is Extract<MultiplayerEvent, { type: "message" }> => event.type === "message");
  assert.equal(hostMessages.some((event) => event.envelope.type === "block-action" && event.channel === "reliable"), true);
  assert.equal(hostMessages.some((event) => event.envelope.type === "player-pose" && event.channel === "movement"), true);

  assert.equal(guest.sendSleepVote({ actorId: GUEST_A.id, tick: 2, target: "morning", active: true }), 1);
  await flushMessages();
  assert.equal(hostEvents.some((event) => event.type === "message" && event.envelope.type === "sleep-vote"), true);
  assert.throws(() => guest.sendSleepVote({ actorId: HOST.id, tick: 2, target: "night", active: true }), /local peer identity/u);

  assert.equal(guest.sendMapShare({
    tableKey: "3,41,-6",
    reply: false,
    map: {
      schema: 1,
      worldId: "world:shared",
      playerId: GUEST_A.id,
      revision: 2,
      exploredChunks: ["0,0", "-1,2"],
      markers: [{ id: "poi:one", name: "Old Road", kind: "natural-poi", position: { x: 4, y: 42, z: -8 } }],
      activeBedId: null,
      fastTravelCharges: 0,
    },
  }), 1);
  await flushMessages();
  assert.equal(hostEvents.some((event) => event.type === "message" && event.envelope.type === "map-share"), true);

  const time: TimeWeatherSnapshot = { tick: 3, worldTime: 0.75, day: 4, weather: "rain" };
  assert.equal(host.sendTimeWeather(time), 1);
  await flushMessages();
  assert.equal(guestEvents.some((event) => event.type === "message" && event.envelope.type === "time-weather"), true);
  assert.throws(() => guest.sendMobSnapshot({
    tick: 3,
    scope: { centerPlayerId: GUEST_A.id, radius: 8, epoch: 1 },
    mobs: [],
  }), /Guests cannot authoritatively send/u);
  assert.throws(() => guest.sendPlayerPose(pose(HOST.id)), /local peer identity/u);
  assert.throws(() => guest.sendBlockAction({ ...action, status: "accepted" }), /only send action requests/u);

  clock = 2_500;
  host.maintenanceTick();
  await flushMessages();
  assert.notEqual(host.getPeers()[0].latencyMs, null);

  clock = 8_000;
  host.maintenanceTick();
  assert.equal(host.getPeers().length, 0);
  assert.equal(host.state, "hosting");
  host.dispose();
  guest.dispose();
});

test("agent peers preserve identity, command ownership, chat ordering, and dedicated voice routing", async () => {
  const network = new FakeRtcNetwork();
  const hostEvents: MultiplayerEvent[] = [];
  const agentEvents: MultiplayerEvent[] = [];
  const agent: PeerIdentity = {
    id: "agent_fieldhand_01",
    name: "Fieldhand",
    color: "#7bd6c6",
    peerKind: "agent",
    runnerVersion: "runner-1.0.0",
    requestedCapabilities: ["observe.world", "move.self", "chat.send", "voice.send"],
  };
  assert.equal(validatePeerIdentity(agent), true);
  assert.equal(validatePeerIdentity({ ...GUEST_A, requestedCapabilities: ["observe.world"] }), false, "human peers cannot smuggle agent capability requests");
  const host = makeSession(HOST, network, Date.now, hostEvents);
  const runner = makeSession(agent, network, Date.now, agentEvents);
  await connect(host, runner);

  const peer = host.getPeers()[0];
  assert.equal(peer.identity?.peerKind, "agent");
  assert.equal(peer.identity?.runnerVersion, "runner-1.0.0");
  assert.equal(peer.voiceOpen, true);

  const issuedAt = Date.now();
  const command: AgentCommandEnvelope = {
    schema: 1,
    scope: TEST_SCOPE,
    commandId: "command_move_01",
    agentId: agent.id,
    kind: "move_to",
    expectedWorldRevision: 3,
    issuedAt,
    expiresAt: issuedAt + 60_000,
    arguments: { target: { x: 5, y: 40, z: -2 } },
  };
  assert.equal(runner.sendAgentCommand(command), 1);
  const chat: AgentChatMessage = {
    schema: 1,
    id: "chat_fieldhand_01",
    sequence: 1,
    authorId: agent.id,
    authorName: agent.name,
    peerKind: "agent",
    channel: "local",
    text: "I am heading to the marker.",
    sentAt: issuedAt,
    position: { x: 0, y: 40, z: 0 },
  };
  assert.equal(runner.sendChat(chat), 1);
  const voice: AgentVoiceChunk = {
    schema: 1,
    streamId: "voice_stream_01",
    agentId: agent.id,
    messageId: chat.id,
    mimeType: "audio/mpeg",
    textHash: "sha256_demo_hash",
    text: chat.text,
    sequence: 1,
    chunkIndex: 0,
    chunkCount: 1,
    durationMs: 1_200,
    data: "QUJDRA==",
    position: { x: 0, y: 40, z: 0 },
  };
  assert.equal(runner.sendVoiceChunk(voice), 1);
  await flushMessages();

  const messages = hostEvents.filter((event): event is Extract<MultiplayerEvent, { type: "message" }> => event.type === "message");
  assert.equal(messages.some((event) => event.envelope.type === "agent-command" && event.channel === "reliable"), true);
  assert.equal(messages.some((event) => event.envelope.type === "chat" && event.channel === "reliable"), true);
  assert.equal(messages.some((event) => event.envelope.type === "voice-chunk" && event.channel === "voice"), true);
  assert.throws(() => runner.sendAgentCommand({ ...command, agentId: GUEST_A.id }), /local peer identity/u);
  assert.throws(() => runner.sendChat({ ...chat, authorId: GUEST_A.id }), /local peer identity/u);

  runner.dispose();
  host.dispose();
});

test("one host maintains independent star links for multiple guests and broadcasts snapshots", async () => {
  const network = new FakeRtcNetwork();
  let clock = 10;
  const hostEvents: MultiplayerEvent[] = [];
  const firstEvents: MultiplayerEvent[] = [];
  const secondEvents: MultiplayerEvent[] = [];
  const host = makeSession(HOST, network, () => clock, hostEvents);
  const first = makeSession(GUEST_A, network, () => clock, firstEvents);
  const second = makeSession(GUEST_B, network, () => clock, secondEvents);
  await connect(host, first);
  await connect(host, second);
  assert.equal(host.getPeers().length, 2);

  const update: TimeWeatherSnapshot = { tick: 5, worldTime: 0.2, day: 2, weather: "clear" };
  assert.equal(host.sendTimeWeather(update), 2);
  await flushMessages();
  assert.equal(firstEvents.some((event) => event.type === "message" && event.envelope.type === "time-weather"), true);
  assert.equal(secondEvents.some((event) => event.type === "message" && event.envelope.type === "time-weather"), true);

  const snapshot: WorldSnapshot = {
    tick: 6,
    seed: "shared-advanced-world",
    mode: "survival",
    generatorVersion: 3,
    players: [pose(HOST.id, 6)],
    blockEdits: [],
    mobs: [],
    mobScope: { centerPlayerId: GUEST_A.id, radius: 64, epoch: 1 },
    drops: [],
    dropScope: { centerPlayerId: GUEST_A.id, radius: 64, epoch: 1 },
    time: { tick: 6, worldTime: 0.21, day: 2, weather: "clear" },
    worldOptions: {
      difficulty: "hard",
      dayLengthMinutes: 35,
      mobDensity: 1.5,
      butterflyDensity: 2,
      caveFrequency: 1.75,
      biomeScale: 1.5,
      resourceAbundance: 1.25,
      structures: true,
      weather: true,
      keepInventory: false,
      friendlyFire: false,
    },
  };
  assert.equal(host.sendSnapshot(snapshot), 2);
  await flushMessages();
  assert.equal(firstEvents.some((event) => event.type === "message" && event.envelope.type === "snapshot" && (event.envelope.payload as WorldSnapshot).worldOptions?.difficulty === "hard"), true);
  assert.equal(firstEvents.some((event) => event.type === "message" && event.envelope.type === "snapshot" && (event.envelope.payload as WorldSnapshot).mode === "survival"), true);

  const firstPeer = host.getPeers().find((peer) => peer.identity?.id === GUEST_A.id)!;
  assert.equal(host.disconnectPeer(firstPeer.identity!.id, "kick-test"), true);
  assert.equal(host.getPeers().length, 1);
  assert.equal(host.getPeers()[0].identity?.id, GUEST_B.id);
  clock += 1;
  host.dispose();
  first.dispose();
  second.dispose();
  assert.equal(host.state, "closed");
});

test("100-250ms jitter and reconnect replay pending pickup and container responses exactly once", async () => {
  let delivery = 0;
  const network = new FakeRtcNetwork(false, () => 100 + (delivery++ % 4) * 50);
  let clock = 1_000;
  const hostEvents: MultiplayerEvent[] = [];
  const guestEvents: MultiplayerEvent[] = [];
  const host = makeSession(HOST, network, () => clock, hostEvents);
  const guest = makeSession(GUEST_A, network, () => clock, guestEvents);
  await connect(host, guest);
  await new Promise((resolve) => setTimeout(resolve, 550));

  const request: InventoryAction = {
    requestId: "pickup_idempotent_jitter_001",
    actorId: GUEST_A.id,
    kind: "collect",
    dropId: 71,
    pickupAt: { x: 1, y: 2, z: 3 },
    status: "request",
  };
  const transferRequest: ContainerAction = {
    requestId: "container_idempotent_jitter_001", actorId: GUEST_A.id, containerId: "4,5,6", kind: "mutate",
    operation: { op: "click", target: { owner: "player", slot: 9 }, button: "left", shift: true },
    expectedRevision: 3, expectedPlayerRevision: 7, status: "request",
  };
  assert.equal(guest.sendInventoryAction(request), 1);
  assert.equal(guest.sendContainerAction(transferRequest), 1);
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(hostEvents.filter((event) => event.type === "message" && event.envelope.type === "inventory-action").length, 1);
  assert.equal(hostEvents.filter((event) => event.type === "message" && event.envelope.type === "container-action").length, 1);

  assert.equal(host.sendInventoryAction({ ...request, count: 1, status: "accepted" }, GUEST_A.id), 1);
  assert.equal(host.sendContainerAction({ ...transferRequest, status: "accepted" }, GUEST_A.id), 1);
  // The response is cached at send time, but this client disconnects before
  // the delayed channel can deliver it. A new transport with the same stable
  // player identity retries the pending request.
  guest.dispose();
  const reconnectedEvents: MultiplayerEvent[] = [];
  const reconnectedGuest = makeSession(GUEST_A, network, () => clock, reconnectedEvents);
  await connect(host, reconnectedGuest);
  await new Promise((resolve) => setTimeout(resolve, 550));
  assert.equal(reconnectedGuest.sendInventoryAction(request), 1);
  assert.equal(reconnectedGuest.sendContainerAction(transferRequest), 1);
  await new Promise((resolve) => setTimeout(resolve, 550));
  assert.equal(hostEvents.filter((event) => event.type === "message" && event.envelope.type === "inventory-action").length, 1);
  assert.equal(hostEvents.filter((event) => event.type === "message" && event.envelope.type === "container-action").length, 1);
  assert.equal(reconnectedEvents.filter((event) => event.type === "message" && event.envelope.type === "inventory-action").length, 1);
  assert.equal(reconnectedEvents.filter((event) => event.type === "message" && event.envelope.type === "container-action").length, 1);

  clock += 20_001;
  host.maintenanceTick();
  assert.equal((host as unknown as { responseCache: Map<string, unknown> }).responseCache.size, 0, "final responses expire after 20 seconds");
  reconnectedGuest.dispose();
  host.dispose();
});

test("idempotent response history is bounded to 256 final commands per peer", async () => {
  const network = new FakeRtcNetwork();
  const host = makeSession(HOST, network, () => 1_000, []);
  const guest = makeSession(GUEST_A, network, () => 1_000, []);
  await connect(host, guest);
  for (let index = 0; index < 300; index += 1) {
    host.sendInventoryAction({
      requestId: `bounded_response_${index.toString().padStart(3, "0")}`,
      actorId: GUEST_A.id,
      kind: "collect",
      dropId: index,
      count: 1,
      status: "accepted",
    }, GUEST_A.id);
  }
  assert.equal((host as unknown as { responseCache: Map<string, unknown> }).responseCache.size, 256);
  guest.dispose();
  host.dispose();
});
