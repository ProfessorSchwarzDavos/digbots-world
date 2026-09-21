/**
 * Shared, dependency-light contracts for Blockwild's AI companion platform.
 *
 * This module deliberately owns validation, authority, leases, bounded logs,
 * and save normalization. It does not know about Three.js, React, WebRTC, or
 * the live world implementation, so hosts, clients, runners, and tests can use
 * one fail-closed contract without creating a second simulation.
 */

import { locationStamp, sameLocationStamp, type LocationStamp } from "./location-address";
import { canonicalJson } from "./universe-json";

export const AGENT_PLATFORM_SCHEMA_VERSION = 1 as const;
export const AGENT_PROTOCOL_VERSION = 2 as const;
export const AGENT_DEFAULT_RENDER_DISTANCE = 4;
export const AGENT_DEFAULT_SIMULATION_DISTANCE = 3;
export const AGENT_DEFAULT_BASIC_RENDER_DISTANCE = 4;
export const AGENT_MAX_ADMITTED = 4;
export const AGENT_MAX_COMMAND_BYTES = 128 * 1024;
export const AGENT_MAX_RESULT_BYTES = 192 * 1024;
export const AGENT_MAX_OBSERVATION_BYTES = 256 * 1024;
export const AGENT_MAX_CHAT_CHARS = 480;
export const AGENT_MAX_CHAT_HISTORY = 160;
export const AGENT_MAX_VOICE_CHUNK_BYTES = 48 * 1024;
export const AGENT_MAX_VOICE_CHUNKS = 128;
export const AGENT_MAX_VOICE_CHARACTERS = 480;
export const AGENT_MAX_BUILD_CELLS = 2_048;
export const AGENT_MAX_HARVEST_RADIUS = 32;
export const AGENT_MAX_TASKS = 128;
export const AGENT_MAX_WAYPOINTS = 128;
export const AGENT_TERMINAL_CACHE_MS = 5 * 60_000;

export const AGENT_CAPABILITIES = [
  "observe.world",
  "move.self",
  "interact.basic",
  "inventory.self.read",
  "inventory.self.write",
  "container.read",
  "container.write",
  "player.location.read",
  "player.inventory.read",
  "build",
  "harvest",
  "chat.send",
  "voice.send",
  "diagnostics",
  "world.admin",
] as const;

export type AgentCapability = (typeof AGENT_CAPABILITIES)[number];
export type AgentPeerKind = "human" | "agent";
export type AgentLifecycleStatus = "pending" | "approved" | "paused" | "revoked" | "disconnected";
export type AgentVoiceMode = "off" | "spatial" | "universal";
export type AgentCommandStatus = "accepted" | "running" | "blocked" | "completed" | "cancelled" | "failed";
export type AgentChatChannel = "local" | "party" | "global" | "system";
export type AgentTaskStatus = "queued" | "active" | "paused" | "blocked" | "completed" | "cancelled";
export type AgentRecordSource = "player" | "agent" | "system";

export const AGENT_COMMAND_KINDS = [
  "session.status", "session.pause", "session.resume", "session.stop", "capabilities.list",
  "observe", "inspect_area", "inspect_target", "wiki_lookup", "bestiary_lookup", "recipe_lookup",
  "move_to", "move_relative", "follow_player", "face", "wait", "stop",
  "chat_read", "chat_send", "speak", "emote",
  "inventory_get", "inventory_move", "inventory_drop", "inventory_equip", "inventory_life_support", "agent_inventory_open_for_host",
  "interact", "open_container", "container_get", "container_transfer", "use_workstation",
  "workshop_get", "workshop_operate", "workshop_place", "workshop_pickup",
  "harvest_area", "gather_resource", "build_plan", "build_commit", "build_cancel",
  "memory_pin", "memory_list", "memory_remove", "task_pin", "task_update", "waypoint_pin",
  "world_list", "world_create", "world_load", "world_export", "world_delete",
  "diagnostics_start", "diagnostics_stop", "diagnostics_export",
] as const;

export type AgentCommandKind = (typeof AGENT_COMMAND_KINDS)[number];

export type AgentVector3 = Readonly<{ x: number; y: number; z: number }>;
export type AgentBlockCell = Readonly<{ x: number; y: number; z: number }>;
export type AgentBlockPlacement = AgentBlockCell & Readonly<{
  block: number;
  facing?: 0 | 1 | 2 | 3;
  replace?: boolean;
}>;

export type AgentCommandEnvelope = Readonly<{
  schema: typeof AGENT_PLATFORM_SCHEMA_VERSION;
  scope: LocationStamp;
  commandId: string;
  agentId: string;
  kind: AgentCommandKind;
  expectedWorldRevision: number;
  issuedAt: number;
  expiresAt: number;
  arguments: Readonly<Record<string, unknown>>;
  clientIntent?: string;
}>;

export type AgentMaterialRequirement = Readonly<{
  block: number;
  name?: string;
  have: number;
  need: number;
  missing: number;
}>;

export type AgentCommandProgress = Readonly<{
  completed: number;
  total: number;
  message?: string;
  current?: AgentBlockCell | null;
}>;

export type AgentCommandResult = Readonly<{
  schema: typeof AGENT_PLATFORM_SCHEMA_VERSION;
  scope: LocationStamp;
  commandId: string;
  agentId: string;
  kind: AgentCommandKind;
  status: AgentCommandStatus;
  code: string;
  message: string;
  worldRevision: number;
  startedAt: number;
  updatedAt: number;
  terminal: boolean;
  progress?: AgentCommandProgress;
  materials?: readonly AgentMaterialRequirement[];
  choices?: readonly string[];
  data?: Readonly<Record<string, unknown>>;
}>;

export type AgentChatMessage = Readonly<{
  schema: typeof AGENT_PLATFORM_SCHEMA_VERSION;
  id: string;
  sequence: number;
  authorId: string;
  authorName: string;
  peerKind: AgentPeerKind;
  channel: AgentChatChannel;
  text: string;
  sentAt: number;
  position?: AgentVector3;
}>;

export type AgentCapabilityGrant = Readonly<{
  schema: typeof AGENT_PLATFORM_SCHEMA_VERSION;
  agentId: string;
  connectionId: string;
  status: AgentLifecycleStatus;
  requested: readonly AgentCapability[];
  granted: readonly AgentCapability[];
  updatedAt: number;
  reason?: string;
}>;

export type AgentVoiceChunk = Readonly<{
  schema: typeof AGENT_PLATFORM_SCHEMA_VERSION;
  streamId: string;
  agentId: string;
  messageId: string;
  mimeType: "audio/mpeg" | "audio/ogg" | "audio/wav";
  textHash: string;
  text: string;
  sequence: number;
  chunkIndex: number;
  chunkCount: number;
  durationMs: number;
  data: string;
  position: AgentVector3;
}>;

export type AgentInventorySlot = Readonly<{
  index: number;
  item: number;
  name?: string;
  count: number;
  durability?: number;
}> | null;

export type AgentNearbyEntity = Readonly<{
  id: string;
  kind: "player" | "agent" | "creature" | "drop" | "container" | "workstation" | "poi" | "hazard" | "crop";
  name: string;
  position: AgentVector3;
  distance: number;
  state?: string;
  interactable?: boolean;
}>;

export type AgentObservationV1 = Readonly<{
  schema: typeof AGENT_PLATFORM_SCHEMA_VERSION;
  scope: LocationStamp;
  observationSequence: number;
  observedAt: number;
  expiresAt: number;
  worldRevision: number;
  coordinateSystem: string;
  session: Readonly<{
    worldId: string;
    worldFingerprint: string;
    gameVersion: string;
    generatorVersion: number;
    multiplayerProtocolVersion: number;
    agentProtocolVersion: typeof AGENT_PROTOCOL_VERSION;
    role: "host" | "guest" | "single-player";
    connected: boolean;
    capabilities: readonly AgentCapability[];
  }>;
  self: Readonly<{
    agentId: string;
    name: string;
    position: AgentVector3;
    velocity: AgentVector3;
    yaw: number;
    pitch: number;
    biome: string;
    depth: string;
    liquid: string | null;
    light: number;
    inventory: Readonly<{ used: number; capacity: number; slots?: readonly AgentInventorySlot[] }>;
    equipment?: Readonly<Record<string, unknown>>;
    lifeSupport?: Readonly<Record<string, unknown>>;
    command: AgentCommandResult | null;
  }>;
  world: Readonly<{
    day: number;
    time: number;
    weather: string;
    occupiedChunkReady: boolean;
    players: readonly AgentNearbyEntity[];
    nearby: readonly AgentNearbyEntity[];
    reachable: readonly string[];
  }>;
  chat: Readonly<{
    newestSequence: number;
    newChatCount: number;
    messages: readonly AgentChatMessage[];
  }>;
  tasks: readonly AgentTaskRecord[];
  waypoints: readonly AgentWaypointRecord[];
  performance: Readonly<{
    fps: number;
    renderDistance: number;
    simulationDistance: number;
    basicRenderDistance: number;
    commandQueue: number;
    channelBackpressure: number;
  }>;
}>;

export type AgentTaskRecord = Readonly<{
  id: string;
  agentId: string;
  title: string;
  status: AgentTaskStatus;
  owner: string;
  note: string;
  createdAt: number;
  updatedAt: number;
  waypointIds: readonly string[];
  previewIds: readonly string[];
}>;

export type AgentWaypointRecord = Readonly<{
  id: string;
  agentId: string;
  name: string;
  position: AgentVector3;
  createdAt: number;
  source: AgentRecordSource;
}>;

export type AgentWorldSaveV1 = Readonly<{
  schema: typeof AGENT_PLATFORM_SCHEMA_VERSION;
  enabled: boolean;
  tasks: readonly AgentTaskRecord[];
  waypoints: readonly AgentWaypointRecord[];
}>;

export type AgentDiagnosticsV1 = Readonly<{
  schema: typeof AGENT_PLATFORM_SCHEMA_VERSION;
  startedAt: number;
  exportedAt: number;
  runner: Readonly<{ model: string; reasoning: string }>;
  observations: Readonly<{ count: number; bytes: number; screenshots: number; manualFallbacks: number; latencyMs: Readonly<{ p50: number; p95: number; max: number }> }>;
  commands: Readonly<Record<AgentCommandStatus, number>>;
  commandKinds: Readonly<Partial<Record<AgentCommandKind, number>>>;
  commandCodes: Readonly<Record<string, number>>;
  latencyMs: Readonly<{ samples: number; p50: number; p95: number; max: number }>;
  recovery: Readonly<{ replans: number; stuck: number; conflicts: number; reconnects: number; replayHits: number; reservationsReturned: number }>;
  communications: Readonly<{ chatMessages: number; voiceMessages: number; voiceCharacters: number; voiceBytes: number; voiceDurationMs: number; voiceDrops: number; playbackFailures: number }>;
  capacity: Readonly<{ admittedAgents: number; mergedRegions: number; simulatedChunks: number; simulatedEntities: number; rejectedAgents: number }>;
  evidence: Readonly<{ terminalResults: number; resultsWithData: number; resultsWithProgress: number; resultsWithMaterials: number }>;
  performance: Readonly<{
    fps: number;
    p95FrameMs: number;
    averageActiveCpuMs: number;
    hostFrameBudgetMs: number;
    heapBytes: number | null;
    channelBackpressure: number;
    occupiedChunkReady: boolean;
  }>;
}>;

export type AgentSessionRecord = Readonly<{
  agentId: string;
  connectionId: string;
  name: string;
  runnerVersion: string;
  color: string;
  status: AgentLifecycleStatus;
  requested: readonly AgentCapability[];
  granted: readonly AgentCapability[];
  currentCommand: AgentCommandResult | null;
  connectedAt: number;
  updatedAt: number;
  muted: boolean;
}>;

const DEFAULT_AGENT_CAPABILITIES: readonly AgentCapability[] = Object.freeze([
  "observe.world", "move.self", "interact.basic", "inventory.self.read", "inventory.self.write",
  "player.location.read", "chat.send", "voice.send",
]);

const COMMAND_CAPABILITY: Readonly<Partial<Record<AgentCommandKind, AgentCapability>>> = Object.freeze({
  observe: "observe.world", inspect_area: "observe.world", inspect_target: "observe.world",
  wiki_lookup: "observe.world", bestiary_lookup: "observe.world", recipe_lookup: "observe.world",
  move_to: "move.self", move_relative: "move.self", follow_player: "move.self", face: "move.self", wait: "move.self", stop: "move.self",
  chat_send: "chat.send", speak: "voice.send", emote: "chat.send",
  inventory_get: "inventory.self.read", inventory_move: "inventory.self.write", inventory_drop: "inventory.self.write",
  inventory_equip: "inventory.self.write", inventory_life_support: "inventory.self.write",
  agent_inventory_open_for_host: "inventory.self.read",
  interact: "interact.basic", open_container: "container.read", container_get: "container.read", container_transfer: "container.write",
  use_workstation: "interact.basic", harvest_area: "harvest", gather_resource: "harvest",
  workshop_get: "container.read", workshop_operate: "container.write",
  workshop_place: "build", workshop_pickup: "build",
  build_plan: "build", build_commit: "build", build_cancel: "build",
  task_pin: "observe.world", task_update: "observe.world", waypoint_pin: "observe.world",
  world_list: "world.admin", world_create: "world.admin", world_load: "world.admin", world_export: "world.admin", world_delete: "world.admin",
  diagnostics_start: "diagnostics", diagnostics_stop: "diagnostics", diagnostics_export: "diagnostics",
});

const COMMAND_KIND_SET = new Set<string>(AGENT_COMMAND_KINDS);
const CAPABILITY_SET = new Set<string>(AGENT_CAPABILITIES);
const TERMINAL_STATUSES = new Set<AgentCommandStatus>(["blocked", "completed", "cancelled", "failed"]);
const CHAT_CHANNEL_SET = new Set<AgentChatChannel>(["local", "party", "global", "system"]);
const VOICE_MIME_SET = new Set(["audio/mpeg", "audio/ogg", "audio/wav"]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isId(value: unknown, max = 128): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max && ID_PATTERN.test(value);
}

function isFiniteNumber(value: unknown, min = -Number.MAX_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isInteger(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function isShortString(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= max && (allowEmpty || value.trim().length > 0);
}

function jsonBytes(value: unknown) {
  try { return new TextEncoder().encode(JSON.stringify(value)).byteLength; }
  catch { return Number.POSITIVE_INFINITY; }
}

function validateVector(value: unknown): value is AgentVector3 {
  return isRecord(value)
    && isFiniteNumber(value.x, -30_000_000, 30_000_000)
    && isFiniteNumber(value.y, -4096, 4096)
    && isFiniteNumber(value.z, -30_000_000, 30_000_000);
}

function validatePlacement(value: unknown): value is AgentBlockPlacement {
  if (!isRecord(value) || !validateVector(value)) return false;
  const record = value as Record<string, unknown>;
  return Number.isInteger(value.x) && Number.isInteger(value.y) && Number.isInteger(value.z)
    && isInteger(record.block, 0, 65_535)
    && (record.facing === undefined || isInteger(record.facing, 0, 3))
    && (record.replace === undefined || typeof record.replace === "boolean");
}

function validatePlainJson(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= AGENT_MAX_BUILD_CELLS && value.every((entry) => validatePlainJson(entry, depth + 1));
  if (!isRecord(value) || Object.keys(value).length > 128) return false;
  return Object.entries(value).every(([key, entry]) => key.length <= 96 && validatePlainJson(entry, depth + 1));
}

function validateCommandArguments(kind: AgentCommandKind, args: Record<string, unknown>): boolean {
  if (!validatePlainJson(args)) return false;
  if (kind === "inventory_equip" && (!["head", "chest", "legs", "feet", "back"].includes(String(args.slot)) || !isInteger(args.inventorySlot, 0, 35) || !isInteger(args.expectedInventoryRevision))) return false;
  if (kind === "inventory_life_support" && (!isInteger(args.inventorySlot, 0, 35) || !isInteger(args.expectedInventoryRevision) || !isRecord(args.operation))) return false;
  if ((kind === "workshop_get" || kind === "workshop_operate") && !isShortString(args.targetId, 96)) return false;
  if (kind === "workshop_operate" && (!isInteger(args.inventorySlot, 0, 35) || !isInteger(args.expectedInventoryRevision) || !isInteger(args.expectedMachineRevision) || !isRecord(args.operation))) return false;
  if ((kind === "workshop_place" || kind === "workshop_pickup") && (!isInteger(args.inventorySlot, 0, 35) || !isInteger(args.expectedInventoryRevision))) return false;
  if (kind === "workshop_place" && (!validateVector(args.target) || !isInteger(args.facing, 0, 3))) return false;
  if (kind === "workshop_pickup" && (!isShortString(args.targetId, 96) || !isInteger(args.expectedMachineRevision))) return false;
  if ((kind === "move_to" || kind === "face") && !validateVector(args.target)) return false;
  if (kind === "move_relative" && !validateVector(args.delta)) return false;
  if (kind === "follow_player" && (!isId(args.playerId) || (args.minDistance !== undefined && !isFiniteNumber(args.minDistance, 1, 16)) || (args.maxDistance !== undefined && !isFiniteNumber(args.maxDistance, 1.5, 32)))) return false;
  if (kind === "wait" && !isInteger(args.milliseconds, 0, 60_000)) return false;
  if (kind === "inspect_area" && ((args.center !== undefined && !validateVector(args.center)) || (args.radius !== undefined && !isFiniteNumber(args.radius, 1, 32)))) return false;
  if (kind === "inspect_target" && (!isShortString(args.targetId ?? args.id, 160) || (args.includeInventory !== undefined && typeof args.includeInventory !== "boolean"))) return false;
  if ((kind === "chat_send" || kind === "speak") && (!isShortString(args.text, AGENT_MAX_CHAT_CHARS) || (args.channel !== undefined && !CHAT_CHANNEL_SET.has(args.channel as AgentChatChannel)))) return false;
  if (kind === "emote" && args.action !== undefined && !isShortString(args.action, 120)) return false;
  if (kind === "build_plan") {
    if (!Array.isArray(args.placements) || args.placements.length < 1 || args.placements.length > AGENT_MAX_BUILD_CELLS || !args.placements.every(validatePlacement)) return false;
    if (args.removals !== undefined && (!Array.isArray(args.removals) || args.removals.length > AGENT_MAX_BUILD_CELLS || !args.removals.every(validateVector))) return false;
  }
  if ((kind === "build_commit" || kind === "build_cancel") && !isId(args.previewId)) return false;
  if ((kind === "harvest_area" || kind === "gather_resource") && (args.radius !== undefined && !isFiniteNumber(args.radius, 1, AGENT_MAX_HARVEST_RADIUS))) return false;
  if (kind === "container_transfer" && (!isShortString(args.containerId ?? args.targetId, 160)
    || !["agent-to-container", "container-to-agent"].includes(String(args.direction))
    || !isInteger(args.sourceSlot, 0, 127)
    || (args.destinationSlot !== undefined && !isInteger(args.destinationSlot, 0, 127))
    || !isInteger(args.count, 1, 65_535)
    || !isInteger(args.expectedContainerRevision)
    || !isInteger(args.expectedInventoryRevision))) return false;
  if (kind === "task_pin" && (!isShortString(args.title, 120)
    || (args.note !== undefined && !isShortString(args.note, 320, true))
    || (args.owner !== undefined && !isShortString(args.owner, 80)))) return false;
  if (kind === "task_update" && (!isId(args.taskId)
    || (args.title !== undefined && !isShortString(args.title, 120))
    || (args.note !== undefined && !isShortString(args.note, 320, true))
    || (args.status !== undefined && !["queued", "active", "paused", "blocked", "completed", "cancelled"].includes(String(args.status))))) return false;
  if (kind === "waypoint_pin" && (!isShortString(args.name, 80)
    || (args.position !== undefined && !validateVector(args.position)))) return false;
  if (kind === "world_delete" && (!isId(args.worldId) || args.confirm !== true)) return false;
  return true;
}

export function validateAgentCapability(value: unknown): value is AgentCapability {
  return typeof value === "string" && CAPABILITY_SET.has(value);
}

export function normalizeAgentCapabilities(value: unknown, fallback: readonly AgentCapability[] = DEFAULT_AGENT_CAPABILITIES): AgentCapability[] {
  if (!Array.isArray(value)) return [...fallback];
  return [...new Set(value.filter(validateAgentCapability))].slice(0, AGENT_CAPABILITIES.length);
}

export function validateAgentCommand(value: unknown, now = Date.now()): value is AgentCommandEnvelope {
  if (!isRecord(value) || jsonBytes(value) > AGENT_MAX_COMMAND_BYTES) return false;
  if (value.schema !== AGENT_PLATFORM_SCHEMA_VERSION
    || !validateAgentScope(value.scope)
    || !isId(value.commandId)
    || !isId(value.agentId)
    || typeof value.kind !== "string" || !COMMAND_KIND_SET.has(value.kind)
    || !isInteger(value.expectedWorldRevision)
    || !isFiniteNumber(value.issuedAt, 0, Number.MAX_SAFE_INTEGER)
    || !isFiniteNumber(value.expiresAt, 0, Number.MAX_SAFE_INTEGER)
    || value.expiresAt < value.issuedAt
    || value.expiresAt < now - 1_000
    || value.expiresAt - value.issuedAt > 10 * 60_000
    || !isRecord(value.arguments)
    || (value.clientIntent !== undefined && !isShortString(value.clientIntent, 320, true))) return false;
  return validateCommandArguments(value.kind as AgentCommandKind, value.arguments);
}

function validateAgentScope(value: unknown): value is LocationStamp {
  try { locationStamp(value); return true; } catch { return false; }
}

export function validateAgentResult(value: unknown): value is AgentCommandResult {
  if (!isRecord(value) || jsonBytes(value) > AGENT_MAX_RESULT_BYTES) return false;
  return value.schema === AGENT_PLATFORM_SCHEMA_VERSION
    && validateAgentScope(value.scope)
    && isId(value.commandId)
    && isId(value.agentId)
    && typeof value.kind === "string" && COMMAND_KIND_SET.has(value.kind)
    && typeof value.status === "string" && ["accepted", "running", "blocked", "completed", "cancelled", "failed"].includes(value.status)
    && isShortString(value.code, 96)
    && isShortString(value.message, 640, true)
    && isInteger(value.worldRevision)
    && isFiniteNumber(value.startedAt, 0, Number.MAX_SAFE_INTEGER)
    && isFiniteNumber(value.updatedAt, 0, Number.MAX_SAFE_INTEGER)
    && typeof value.terminal === "boolean"
    && value.terminal === TERMINAL_STATUSES.has(value.status as AgentCommandStatus)
    && (value.data === undefined || (isRecord(value.data) && validatePlainJson(value.data)));
}

export function validateAgentChatMessage(value: unknown): value is AgentChatMessage {
  return isRecord(value)
    && value.schema === AGENT_PLATFORM_SCHEMA_VERSION
    && isId(value.id)
    && isInteger(value.sequence)
    && isId(value.authorId)
    && isShortString(value.authorName, 48)
    && (value.peerKind === "human" || value.peerKind === "agent")
    && typeof value.channel === "string" && CHAT_CHANNEL_SET.has(value.channel as AgentChatChannel)
    && isShortString(value.text, AGENT_MAX_CHAT_CHARS)
    && isFiniteNumber(value.sentAt, 0, Number.MAX_SAFE_INTEGER)
    && (value.position === undefined || validateVector(value.position));
}

export function validateAgentCapabilityGrant(value: unknown): value is AgentCapabilityGrant {
  return isRecord(value)
    && value.schema === AGENT_PLATFORM_SCHEMA_VERSION
    && isId(value.agentId)
    && isId(value.connectionId)
    && typeof value.status === "string" && ["pending", "approved", "paused", "revoked", "disconnected"].includes(value.status)
    && Array.isArray(value.requested) && value.requested.every(validateAgentCapability)
    && Array.isArray(value.granted) && value.granted.every(validateAgentCapability)
    && isFiniteNumber(value.updatedAt, 0, Number.MAX_SAFE_INTEGER)
    && (value.reason === undefined || isShortString(value.reason, 240, true));
}

export function validateAgentVoiceChunk(value: unknown): value is AgentVoiceChunk {
  if (!isRecord(value)) return false;
  if (value.schema !== AGENT_PLATFORM_SCHEMA_VERSION
    || !isId(value.streamId) || !isId(value.agentId) || !isId(value.messageId)
    || typeof value.mimeType !== "string" || !VOICE_MIME_SET.has(value.mimeType)
    || !isShortString(value.textHash, 128) || !isShortString(value.text, AGENT_MAX_VOICE_CHARACTERS)
    || !isInteger(value.sequence) || !isInteger(value.chunkIndex, 0, AGENT_MAX_VOICE_CHUNKS - 1)
    || !isInteger(value.chunkCount, 1, AGENT_MAX_VOICE_CHUNKS) || value.chunkIndex >= value.chunkCount
    || !isInteger(value.durationMs, 1, 30_000) || !validateVector(value.position)
    || typeof value.data !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/u.test(value.data)) return false;
  return Math.ceil(value.data.length * 3 / 4) <= AGENT_MAX_VOICE_CHUNK_BYTES;
}

export function validateAgentObservation(value: unknown): value is AgentObservationV1 {
  if (!isRecord(value) || jsonBytes(value) > AGENT_MAX_OBSERVATION_BYTES) return false;
  return value.schema === AGENT_PLATFORM_SCHEMA_VERSION
    && validateAgentScope(value.scope)
    && isInteger(value.observationSequence)
    && isFiniteNumber(value.observedAt, 0, Number.MAX_SAFE_INTEGER)
    && isFiniteNumber(value.expiresAt, 0, Number.MAX_SAFE_INTEGER)
    && isInteger(value.worldRevision)
    && isShortString(value.coordinateSystem, 240)
    && isRecord(value.session) && value.session.agentProtocolVersion === AGENT_PROTOCOL_VERSION
    && isRecord(value.self) && isRecord(value.world)
    && isRecord(value.chat) && isRecord(value.performance)
    && Array.isArray(value.tasks) && value.tasks.length <= AGENT_MAX_TASKS
    && Array.isArray(value.waypoints) && value.waypoints.length <= AGENT_MAX_WAYPOINTS;
}

export function commandCapability(kind: AgentCommandKind): AgentCapability | null {
  return COMMAND_CAPABILITY[kind] ?? null;
}

export function createAgentResult(
  command: AgentCommandEnvelope,
  status: AgentCommandStatus,
  worldRevision: number,
  code: string,
  message: string,
  options: Partial<Pick<AgentCommandResult, "startedAt" | "progress" | "materials" | "choices" | "data">> = {},
  now = Date.now(),
): AgentCommandResult {
  return Object.freeze({
    schema: AGENT_PLATFORM_SCHEMA_VERSION,
    scope: locationStamp(command.scope),
    commandId: command.commandId,
    agentId: command.agentId,
    kind: command.kind,
    status,
    code: code.slice(0, 96) || status,
    message: message.slice(0, 640),
    worldRevision: Math.max(0, Math.trunc(worldRevision)),
    startedAt: options.startedAt ?? now,
    updatedAt: now,
    terminal: TERMINAL_STATUSES.has(status),
    ...(options.progress ? { progress: Object.freeze({ ...options.progress }) } : {}),
    ...(options.materials ? { materials: Object.freeze(options.materials.map((entry) => Object.freeze({ ...entry }))) } : {}),
    ...(options.choices ? { choices: Object.freeze([...options.choices]) } : {}),
    ...(options.data ? { data: Object.freeze({ ...options.data }) } : {}),
  });
}

export function defaultAgentCapabilities() {
  return [...DEFAULT_AGENT_CAPABILITIES];
}

function normalizeHexColor(value: unknown, agentId: string) {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/iu.test(value)) return value.toLowerCase();
  const palette = ["#62c8b4", "#e0a85d", "#8ca7e8", "#c989d7", "#9cc95b", "#dc7a6b"];
  let hash = 0;
  for (const character of agentId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export class AgentAuthority {
  private readonly sessions = new Map<string, AgentSessionRecord>();
  private readonly terminalCache = new Map<string, { result: AgentCommandResult; expiresAt: number }>();
  private readonly commandIntents = new Map<string, { intent: string; expiresAt: number }>();
  private readonly leases = new Map<string, { commandId: string; agentId: string; expiresAt: number }>();

  constructor(readonly maxAdmitted = AGENT_MAX_ADMITTED) {}

  register(input: {
    agentId: string;
    connectionId: string;
    name: string;
    runnerVersion?: string;
    color?: string;
    requested?: readonly AgentCapability[];
  }, now = Date.now()): AgentSessionRecord | null {
    this.prune(now);
    const current = this.sessions.get(input.agentId);
    const admitted = [...this.sessions.values()].filter((entry) => entry.status !== "revoked" && entry.status !== "disconnected");
    if (!current && admitted.length >= this.maxAdmitted) return null;
    const requested = normalizeAgentCapabilities(input.requested);
    const record: AgentSessionRecord = Object.freeze({
      agentId: input.agentId,
      connectionId: input.connectionId,
      name: input.name.trim().slice(0, 48) || "Field Drone",
      runnerVersion: (input.runnerVersion ?? "unknown").slice(0, 64),
      color: normalizeHexColor(input.color, input.agentId),
      status: "pending",
      requested: Object.freeze(requested),
      granted: Object.freeze([]),
      currentCommand: current?.currentCommand ?? null,
      connectedAt: current?.connectedAt ?? now,
      updatedAt: now,
      muted: current?.muted ?? false,
    });
    this.sessions.set(input.agentId, record);
    return record;
  }

  get(agentId: string) { return this.sessions.get(agentId) ?? null; }
  list() { return [...this.sessions.values()].sort((left, right) => left.connectedAt - right.connectedAt); }
  admittedCount() { return this.list().filter((entry) => entry.status === "approved" || entry.status === "paused").length; }

  approve(agentId: string, grants?: readonly AgentCapability[], now = Date.now()): AgentSessionRecord | null {
    const current = this.sessions.get(agentId);
    if (!current || current.status === "revoked" || current.status === "disconnected") return null;
    const desired = normalizeAgentCapabilities(grants ?? current.requested);
    const requested = new Set(current.requested);
    const granted = desired.filter((capability) => requested.has(capability));
    const next = Object.freeze({ ...current, status: "approved" as const, granted: Object.freeze(granted), updatedAt: now });
    this.sessions.set(agentId, next);
    return next;
  }

  setCapability(agentId: string, capability: AgentCapability, granted: boolean, now = Date.now()) {
    const current = this.sessions.get(agentId);
    if (!current || current.status === "revoked" || current.status === "disconnected") return null;
    const nextGranted = new Set(current.granted);
    if (granted && current.requested.includes(capability)) nextGranted.add(capability);
    else nextGranted.delete(capability);
    const next = Object.freeze({ ...current, granted: Object.freeze([...nextGranted]), updatedAt: now });
    this.sessions.set(agentId, next);
    return next;
  }

  pause(agentId: string, now = Date.now()) { return this.updateStatus(agentId, "paused", now); }
  resume(agentId: string, now = Date.now()) { return this.updateStatus(agentId, "approved", now); }
  revoke(agentId: string, now = Date.now()) {
    this.releaseAgentLeases(agentId);
    return this.updateStatus(agentId, "revoked", now);
  }
  disconnect(agentId: string, now = Date.now()) {
    this.releaseAgentLeases(agentId);
    return this.updateStatus(agentId, "disconnected", now);
  }
  setMuted(agentId: string, muted: boolean, now = Date.now()) {
    const current = this.sessions.get(agentId);
    if (!current) return null;
    const next = Object.freeze({ ...current, muted, updatedAt: now });
    this.sessions.set(agentId, next);
    return next;
  }

  private updateStatus(agentId: string, status: AgentLifecycleStatus, now: number) {
    const current = this.sessions.get(agentId);
    if (!current) return null;
    const next = Object.freeze({ ...current, status, updatedAt: now });
    this.sessions.set(agentId, next);
    return next;
  }

  authorize(command: AgentCommandEnvelope, connectionId: string, worldRevision: number, scope: LocationStamp, now = Date.now()): AgentCommandResult | null {
    this.prune(now);
    if (!sameLocationStamp(command.scope, scope)) return createAgentResult(command, "blocked", worldRevision, "location_scope_conflict", "The command belongs to another location checkpoint. Reconnect and observe before retrying.", {}, now);
    const session = this.sessions.get(command.agentId);
    if (!session || session.connectionId !== connectionId) return createAgentResult(command, "blocked", worldRevision, "agent_identity_unverified", "The command is not bound to this approved connection.", {}, now);
    if (session.status === "pending") return createAgentResult(command, "blocked", worldRevision, "host_approval_required", "The host has not approved this drone yet.", {}, now);
    if (session.status === "paused" && !["session.status", "session.resume", "session.stop", "capabilities.list"].includes(command.kind)) return createAgentResult(command, "blocked", worldRevision, "agent_paused", "The host or runner paused this drone.", {}, now);
    if (session.status === "revoked" || session.status === "disconnected") return createAgentResult(command, "blocked", worldRevision, "agent_revoked", "This drone no longer has an active session grant.", {}, now);
    if (command.expiresAt < now) return createAgentResult(command, "blocked", worldRevision, "command_expired", "The command expired before the host could validate it.", {}, now);
    const key = canonicalJson([command.agentId, command.commandId]);
    const intent = canonicalJson([command.scope, command.kind, command.arguments, command.expectedWorldRevision]);
    const previous = this.commandIntents.get(key);
    if (previous && previous.intent !== intent) return createAgentResult(command, "blocked", worldRevision, "command_id_conflict", "This command ID already names a different intent.", {}, now);
    const replay = this.terminalCache.get(key)?.result;
    if (previous && replay) return replay;
    if (previous) return createAgentResult(command, "running", worldRevision, "command_in_progress", "The original command is still active.", {}, now);
    if (command.expectedWorldRevision !== worldRevision && !["observe", "session.status", "session.pause", "session.resume", "session.stop", "capabilities.list", "chat_read", "stop"].includes(command.kind)) {
      return createAgentResult(command, "blocked", worldRevision, "world_revision_conflict", `World revision ${worldRevision} no longer matches expected revision ${command.expectedWorldRevision}. Re-observe before retrying.`, {}, now);
    }
    const required = commandCapability(command.kind);
    if (required && !session.granted.includes(required)) return createAgentResult(command, "blocked", worldRevision, "capability_denied", `The host has not granted ${required}.`, { data: { requiredCapability: required } }, now);
    if (this.commandIntents.size >= 1024) return createAgentResult(command, "blocked", worldRevision, "command_window_full", "The bounded command retry window is full. Wait before retrying.", {}, now);
    this.commandIntents.set(key, { intent, expiresAt: Math.max(command.expiresAt, now + AGENT_TERMINAL_CACHE_MS) });
    return null;
  }

  setCurrentResult(result: AgentCommandResult, now = Date.now()) {
    const current = this.sessions.get(result.agentId);
    if (current) this.sessions.set(result.agentId, Object.freeze({ ...current, currentCommand: result, updatedAt: now }));
    const key = canonicalJson([result.agentId, result.commandId]);
    // Conflicting/unauthorized retries must not poison the original receipt.
    if (result.terminal && this.commandIntents.has(key)
      && !["command_id_conflict", "location_scope_conflict", "agent_identity_unverified", "host_approval_required", "agent_paused", "agent_revoked", "command_expired"].includes(result.code)) {
      this.terminalCache.set(key, { result, expiresAt: now + AGENT_TERMINAL_CACHE_MS });
      const intent = this.commandIntents.get(key)!;
      this.commandIntents.set(key, { ...intent, expiresAt: now + AGENT_TERMINAL_CACHE_MS });
    }
  }

  acquireLease(keys: readonly string[], commandId: string, agentId: string, expiresAt: number, now = Date.now()) {
    this.prune(now);
    const normalized = [...new Set(keys.filter((key) => typeof key === "string" && key.length > 0 && key.length <= 160))].sort();
    const conflict = normalized.find((key) => {
      const lease = this.leases.get(key);
      return lease && lease.commandId !== commandId && lease.expiresAt > now;
    });
    if (conflict) return { ok: false as const, conflict };
    for (const key of normalized) this.leases.set(key, { commandId, agentId, expiresAt });
    return { ok: true as const, keys: normalized };
  }

  releaseCommandLeases(commandId: string) {
    for (const [key, lease] of this.leases) if (lease.commandId === commandId) this.leases.delete(key);
  }

  releaseAgentLeases(agentId: string) {
    for (const [key, lease] of this.leases) if (lease.agentId === agentId) this.leases.delete(key);
  }

  activeLeaseCount() { return this.leases.size; }

  prune(now = Date.now()) {
    for (const [id, cached] of this.terminalCache) if (cached.expiresAt <= now) this.terminalCache.delete(id);
    for (const [id, cached] of this.commandIntents) if (cached.expiresAt <= now) this.commandIntents.delete(id);
    for (const [key, lease] of this.leases) if (lease.expiresAt <= now) this.leases.delete(key);
  }
}

export class AgentChatRing {
  private readonly messages: AgentChatMessage[] = [];
  private readonly sentAtByAuthor = new Map<string, number[]>();
  private sequence = 0;

  append(input: Omit<AgentChatMessage, "schema" | "id" | "sequence">, now = Date.now(), requestedId?: string) {
    const recent = (this.sentAtByAuthor.get(input.authorId) ?? []).filter((stamp) => now - stamp < 10_000);
    if (recent.length >= 8) return { ok: false as const, code: "chat_rate_limited" };
    const sequence = ++this.sequence;
    const candidate: AgentChatMessage = Object.freeze({
      schema: AGENT_PLATFORM_SCHEMA_VERSION,
      id: requestedId && isId(requestedId) && !this.messages.some((message) => message.id === requestedId)
        ? requestedId
        : `chat_${sequence.toString(36)}_${now.toString(36)}`,
      sequence,
      authorId: input.authorId,
      authorName: input.authorName.trim().slice(0, 48) || "Wanderer",
      peerKind: input.peerKind,
      channel: input.channel,
      text: input.text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "").trim().slice(0, AGENT_MAX_CHAT_CHARS),
      sentAt: input.sentAt,
      ...(input.position ? { position: Object.freeze({ ...input.position }) } : {}),
    });
    if (!validateAgentChatMessage(candidate)) return { ok: false as const, code: "invalid_chat_message" };
    this.messages.push(candidate);
    if (this.messages.length > AGENT_MAX_CHAT_HISTORY) this.messages.splice(0, this.messages.length - AGENT_MAX_CHAT_HISTORY);
    recent.push(now);
    this.sentAtByAuthor.set(input.authorId, recent);
    return { ok: true as const, message: candidate };
  }

  /** Accepts host-sequenced chat on guests without re-authoring its identity. */
  appendAuthoritative(message: AgentChatMessage) {
    if (!validateAgentChatMessage(message) || message.sequence <= this.sequence) return false;
    this.sequence = message.sequence;
    this.messages.push(Object.freeze({ ...message, ...(message.position ? { position: Object.freeze({ ...message.position }) } : {}) }));
    if (this.messages.length > AGENT_MAX_CHAT_HISTORY) this.messages.splice(0, this.messages.length - AGENT_MAX_CHAT_HISTORY);
    return true;
  }

  since(sequence: number, limit = 40) {
    return this.messages.filter((message) => message.sequence > Math.max(0, Math.trunc(sequence))).slice(-Math.max(1, Math.min(80, Math.trunc(limit))));
  }
  newestSequence() { return this.sequence; }
  list() { return [...this.messages]; }
  clear() { this.messages.length = 0; this.sentAtByAuthor.clear(); this.sequence = 0; }
}

export class AgentDiagnostics {
  readonly startedAt = Date.now();
  runner = { model: "unreported", reasoning: "unreported" };
  observationCount = 0;
  observationBytes = 0;
  observationLatencies: number[] = [];
  screenshots = 0;
  manualFallbacks = 0;
  commandCounts: Record<AgentCommandStatus, number> = { accepted: 0, running: 0, blocked: 0, completed: 0, cancelled: 0, failed: 0 };
  commandKinds = new Map<AgentCommandKind, number>();
  commandCodes = new Map<string, number>();
  latencies: number[] = [];
  recovery = { replans: 0, stuck: 0, conflicts: 0, reconnects: 0, replayHits: 0, reservationsReturned: 0 };
  communications = { chatMessages: 0, voiceMessages: 0, voiceCharacters: 0, voiceBytes: 0, voiceDurationMs: 0, voiceDrops: 0, playbackFailures: 0 };
  capacity = { admittedAgents: 0, mergedRegions: 0, simulatedChunks: 0, simulatedEntities: 0, rejectedAgents: 0 };
  evidence = { terminalResults: 0, resultsWithData: 0, resultsWithProgress: 0, resultsWithMaterials: 0 };
  performance = { fps: 0, p95FrameMs: 0, averageActiveCpuMs: 0, hostFrameBudgetMs: 1000 / 60, heapBytes: null as number | null, channelBackpressure: 0, occupiedChunkReady: false };

  recordObservation(observation: AgentObservationV1, now = Date.now()) {
    this.observationCount += 1;
    this.observationBytes += jsonBytes(observation);
    this.observationLatencies.push(Math.max(0, now - observation.observedAt));
    if (this.observationLatencies.length > 2_048) this.observationLatencies.splice(0, this.observationLatencies.length - 2_048);
  }
  recordResult(result: AgentCommandResult) {
    this.commandCounts[result.status] += 1;
    this.commandKinds.set(result.kind, (this.commandKinds.get(result.kind) ?? 0) + 1);
    this.commandCodes.set(result.code, (this.commandCodes.get(result.code) ?? 0) + 1);
    if (result.terminal) this.latencies.push(Math.max(0, result.updatedAt - result.startedAt));
    if (result.terminal) this.evidence.terminalResults += 1;
    if (result.data) this.evidence.resultsWithData += 1;
    if (result.progress) this.evidence.resultsWithProgress += 1;
    if (result.materials) this.evidence.resultsWithMaterials += 1;
    if (this.latencies.length > 2_048) this.latencies.splice(0, this.latencies.length - 2_048);
  }
  export(now = Date.now()): AgentDiagnosticsV1 {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const percentile = (ratio: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))] : 0;
    const observationSorted = [...this.observationLatencies].sort((a, b) => a - b);
    const observationPercentile = (ratio: number) => observationSorted.length ? observationSorted[Math.min(observationSorted.length - 1, Math.floor((observationSorted.length - 1) * ratio))] : 0;
    return Object.freeze({
      schema: AGENT_PLATFORM_SCHEMA_VERSION,
      startedAt: this.startedAt,
      exportedAt: now,
      runner: Object.freeze({ ...this.runner }),
      observations: Object.freeze({
        count: this.observationCount,
        bytes: this.observationBytes,
        screenshots: this.screenshots,
        manualFallbacks: this.manualFallbacks,
        latencyMs: Object.freeze({ p50: observationPercentile(0.5), p95: observationPercentile(0.95), max: observationSorted.at(-1) ?? 0 }),
      }),
      commands: Object.freeze({ ...this.commandCounts }),
      commandKinds: Object.freeze(Object.fromEntries(this.commandKinds)),
      commandCodes: Object.freeze(Object.fromEntries(this.commandCodes)),
      latencyMs: Object.freeze({ samples: sorted.length, p50: percentile(0.5), p95: percentile(0.95), max: sorted.at(-1) ?? 0 }),
      recovery: Object.freeze({ ...this.recovery }),
      communications: Object.freeze({ ...this.communications }),
      capacity: Object.freeze({ ...this.capacity }),
      evidence: Object.freeze({ ...this.evidence }),
      performance: Object.freeze({ ...this.performance }),
    });
  }
}

function normalizeTask(value: unknown): AgentTaskRecord | null {
  if (!isRecord(value) || !isId(value.id) || !isId(value.agentId) || !isShortString(value.title, 120) || !isShortString(value.owner, 80)
    || typeof value.status !== "string" || !["queued", "active", "paused", "blocked", "completed", "cancelled"].includes(value.status)
    || !isShortString(value.note, 320, true) || !isFiniteNumber(value.createdAt, 0, Number.MAX_SAFE_INTEGER) || !isFiniteNumber(value.updatedAt, 0, Number.MAX_SAFE_INTEGER)) return null;
  return Object.freeze({
    id: value.id,
    agentId: value.agentId,
    title: value.title.trim(),
    status: value.status as AgentTaskStatus,
    owner: value.owner.trim(),
    note: value.note.trim(),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    waypointIds: Object.freeze(Array.isArray(value.waypointIds) ? value.waypointIds.filter((entry): entry is string => isId(entry)).slice(0, 32) : []),
    previewIds: Object.freeze(Array.isArray(value.previewIds) ? value.previewIds.filter((entry): entry is string => isId(entry)).slice(0, 32) : []),
  });
}

function normalizeWaypoint(value: unknown): AgentWaypointRecord | null {
  if (!isRecord(value) || !isId(value.id) || !isId(value.agentId) || !isShortString(value.name, 80) || !validateVector(value.position)
    || !isFiniteNumber(value.createdAt, 0, Number.MAX_SAFE_INTEGER) || !["player", "agent", "system"].includes(String(value.source))) return null;
  return Object.freeze({ id: value.id, agentId: value.agentId, name: value.name.trim(), position: Object.freeze({ ...value.position }), createdAt: value.createdAt, source: value.source as AgentRecordSource });
}

export function normalizeAgentWorldSave(value: unknown): AgentWorldSaveV1 {
  const source = isRecord(value) && value.schema === AGENT_PLATFORM_SCHEMA_VERSION ? value : {};
  return Object.freeze({
    schema: AGENT_PLATFORM_SCHEMA_VERSION,
    enabled: source.enabled !== false,
    tasks: Object.freeze((Array.isArray(source.tasks) ? source.tasks : []).map(normalizeTask).filter((entry): entry is AgentTaskRecord => Boolean(entry)).slice(-AGENT_MAX_TASKS)),
    waypoints: Object.freeze((Array.isArray(source.waypoints) ? source.waypoints : []).map(normalizeWaypoint).filter((entry): entry is AgentWaypointRecord => Boolean(entry)).slice(-AGENT_MAX_WAYPOINTS)),
  });
}

export function createAgentTask(input: Partial<AgentTaskRecord> & Pick<AgentTaskRecord, "agentId" | "title">, now = Date.now()): AgentTaskRecord {
  const id = isId(input.id) ? input.id : `task_${input.agentId}_${now.toString(36)}`;
  return Object.freeze({
    id,
    agentId: input.agentId,
    title: input.title.trim().slice(0, 120) || "Untitled field task",
    status: input.status ?? "queued",
    owner: (input.owner ?? input.agentId).trim().slice(0, 80),
    note: (input.note ?? "").trim().slice(0, 320),
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    waypointIds: Object.freeze([...(input.waypointIds ?? [])].filter(entry => isId(entry)).slice(0, 32)),
    previewIds: Object.freeze([...(input.previewIds ?? [])].filter(entry => isId(entry)).slice(0, 32)),
  });
}

export function createAgentWaypoint(
  input: Partial<AgentWaypointRecord> & Pick<AgentWaypointRecord, "agentId" | "name" | "position">,
  now = Date.now(),
): AgentWaypointRecord {
  const id = isId(input.id) ? input.id : `waypoint_${input.agentId}_${now.toString(36)}`;
  return Object.freeze({
    id,
    agentId: input.agentId,
    name: input.name.trim().slice(0, 80) || "Unnamed waypoint",
    position: Object.freeze({
      x: Math.max(-30_000_000, Math.min(30_000_000, Number(input.position.x) || 0)),
      y: Math.max(-4_096, Math.min(4_096, Number(input.position.y) || 0)),
      z: Math.max(-30_000_000, Math.min(30_000_000, Number(input.position.z) || 0)),
    }),
    createdAt: input.createdAt ?? now,
    source: input.source ?? "agent",
  });
}

export function mergeAgentInterestRegions(
  humanPositions: readonly AgentVector3[],
  agentPositions: readonly Readonly<{ agentId: string; position: AgentVector3; status: AgentLifecycleStatus }>[],
  chunkSize = 16,
) {
  const humanChunks = new Set(humanPositions.map((position) => `${Math.floor(position.x / chunkSize)},${Math.floor(position.z / chunkSize)}`));
  const admitted = agentPositions.filter((entry) => entry.status === "approved" || entry.status === "paused").slice(0, AGENT_MAX_ADMITTED);
  const uniqueAgentRegions = new Map<string, string[]>();
  for (const entry of admitted) {
    const key = `${Math.floor(entry.position.x / chunkSize)},${Math.floor(entry.position.z / chunkSize)}`;
    if (humanChunks.has(key)) continue;
    uniqueAgentRegions.set(key, [...(uniqueAgentRegions.get(key) ?? []), entry.agentId]);
  }
  return Object.freeze({
    humanRegions: humanChunks.size,
    agentRegions: uniqueAgentRegions.size,
    totalRegions: humanChunks.size + uniqueAgentRegions.size,
    admittedAgentIds: Object.freeze(admitted.map((entry) => entry.agentId)),
    rejectedAgentIds: Object.freeze(agentPositions.filter((entry) => !admitted.includes(entry)).map((entry) => entry.agentId)),
    mergedAgentRegions: Object.freeze([...uniqueAgentRegions.entries()].map(([key, agentIds]) => Object.freeze({ key, agentIds: Object.freeze(agentIds) }))),
  });
}
