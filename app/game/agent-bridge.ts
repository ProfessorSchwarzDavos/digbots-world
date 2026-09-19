import {
  AGENT_PLATFORM_SCHEMA_VERSION,
  validateAgentCommand,
  type AgentChatChannel,
  type AgentCommandEnvelope,
  type AgentCommandResult,
  type AgentObservationV1,
} from "./agent-platform";

export type AgentBridgeStatus = Readonly<{
  schema: 1;
  ready: boolean;
  connected: boolean;
  role: string | null;
  roomCode: string;
  agentId: string | null;
  agentName: string;
  lastObservationSequence: number;
  lastCommandId: string | null;
  testAdmin: boolean;
}>;

export type AgentBridgeCommandInput = Readonly<{
  kind: AgentCommandEnvelope["kind"];
  arguments?: Readonly<Record<string, unknown>>;
  expectedWorldRevision?: number;
  expiresInMs?: number;
  clientIntent?: string;
  commandId?: string;
}>;

export type AgentBridgeVoiceInput = Readonly<{
  mimeType: "audio/mpeg" | "audio/ogg" | "audio/wav";
  dataBase64: string;
  text: string;
  textHash: string;
  durationMs?: number;
  channel?: AgentChatChannel;
}>;

export type AgentBrowserBridge = Readonly<{
  version: 1;
  status(): AgentBridgeStatus;
  connect(input: Readonly<{ roomCode: string; name?: string }>): Promise<Readonly<{ connected: boolean; hostName: string; roomCode: string }>>;
  host(input: Readonly<{ roomCode: string; name?: string }>): Promise<Readonly<{ hosted: boolean; roomCode: string }>>;
  observe(): AgentObservationV1 | null;
  latestResult(): AgentCommandResult | null;
  command(input: AgentBridgeCommandInput): Readonly<{ accepted: boolean; commandId: string; error?: string }>;
  chat(text: string, channel?: AgentChatChannel): boolean;
  publishVoice(input: AgentBridgeVoiceInput): unknown;
  worldList(): unknown;
  worldCreate(input: Readonly<{ seed: string; name?: string; mode?: "survival" | "builder"; options?: Readonly<Record<string, unknown>>; fixture?: string }>): unknown;
  worldLoad(worldId: string): unknown;
  worldTransition(destination: unknown): unknown;
  worldExport(worldId: string): unknown;
  worldImport(json: string): unknown;
  worldDelete(input: Readonly<{ worldId: string; confirm: boolean }>): unknown;
  diagnosticsStart(input?: Readonly<{ model?: string; reasoning?: string }>): unknown;
  diagnosticsExport(): unknown;
  diagnosticsStop(): unknown;
  diagnosticsNoteScreenshot(): unknown;
  diagnosticsNoteFallback(reason?: string): unknown;
  testPause(paused: boolean): unknown;
  testEnvironment(input: unknown): unknown;
  testAdvance(milliseconds: number): unknown;
  disconnect(): void;
}>;

export type AgentBridgeAdapter = Readonly<{
  getStatus(): Omit<AgentBridgeStatus, "schema" | "ready" | "lastObservationSequence" | "lastCommandId" | "agentId" | "testAdmin"> & Readonly<{ testAdmin?: boolean }>;
  connect(roomCode: string, name: string): Promise<{ hostName: string }>;
  host?(roomCode: string, name: string): Promise<void>;
  observe(): AgentObservationV1 | null;
  latestResult(): AgentCommandResult | null;
  sendCommand(command: AgentCommandEnvelope): boolean;
  sendChat(text: string, channel: AgentChatChannel): boolean;
  publishVoice?(input: AgentBridgeVoiceInput): unknown;
  worldList?(): unknown;
  worldCreate?(input: Readonly<{ seed: string; name?: string; mode?: "survival" | "builder"; options?: Readonly<Record<string, unknown>>; fixture?: string }>): unknown;
  worldLoad?(worldId: string): unknown;
  worldTransition?(destination: unknown): unknown;
  worldExport?(worldId: string): unknown;
  worldImport?(json: string): unknown;
  worldDelete?(worldId: string, confirm: boolean): unknown;
  diagnosticsStart?(input?: Readonly<{ model?: string; reasoning?: string }>): unknown;
  diagnosticsExport?(): unknown;
  diagnosticsStop?(): unknown;
  diagnosticsNoteScreenshot?(): unknown;
  diagnosticsNoteFallback?(reason?: string): unknown;
  testPause?(paused: boolean): unknown;
  testEnvironment?(input: unknown): unknown;
  testAdvance?(milliseconds: number): unknown;
  disconnect(): void;
}>;

const cleanRoomCode = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9-]/gu, "").slice(0, 24);
const cleanName = (value: string) => value.trim().replace(/\s+/gu, " ").slice(0, 32) || "Field Drone";

/**
 * Create the only browser-facing actuator surface for a companion runner.
 * It intentionally has no generic property access, script evaluation, or raw
 * engine handle. The multiplayer host remains authoritative for every result.
 */
export function createAgentBrowserBridge(adapter: AgentBridgeAdapter): AgentBrowserBridge {
  let lastCommandId: string | null = null;
  let commandSequence = 0;
  return Object.freeze({
    version: 1 as const,
    status() {
      const observation = adapter.observe();
      const current = adapter.getStatus();
      return {
        schema: AGENT_PLATFORM_SCHEMA_VERSION,
        ready: true,
        ...current,
        testAdmin: current.testAdmin === true,
        agentId: observation?.self.agentId ?? null,
        lastObservationSequence: observation?.observationSequence ?? 0,
        lastCommandId,
      };
    },
    async connect(input) {
      const roomCode = cleanRoomCode(input.roomCode);
      if (!roomCode) throw new Error("A host room code is required.");
      const name = cleanName(input.name ?? "Field Drone");
      const joined = await adapter.connect(roomCode, name);
      return { connected: true, hostName: joined.hostName, roomCode };
    },
    async host(input) {
      const roomCode = cleanRoomCode(input.roomCode);
      if (!roomCode) throw new Error("A room code is required.");
      if (!adapter.host) throw new Error("Local test-world hosting is unavailable.");
      await adapter.host(roomCode, cleanName(input.name ?? "Field Drone"));
      return { hosted: true, roomCode };
    },
    observe: () => adapter.observe(),
    latestResult: () => adapter.latestResult(),
    command(input) {
      const observation = adapter.observe();
      if (!observation) return { accepted: false, commandId: input.commandId ?? "", error: "no_observation" };
      const now = Date.now();
      if (observation.expiresAt < now) return { accepted: false, commandId: input.commandId ?? "", error: "stale_observation" };
      const commandId = input.commandId?.trim().slice(0, 128)
        || `cmd_${now.toString(36)}_${(++commandSequence).toString(36)}`;
      const envelope: AgentCommandEnvelope = {
        schema: AGENT_PLATFORM_SCHEMA_VERSION,
        scope: observation.scope,
        commandId,
        agentId: observation.self.agentId,
        kind: input.kind,
        expectedWorldRevision: input.expectedWorldRevision ?? observation.worldRevision,
        issuedAt: now,
        expiresAt: now + Math.min(120_000, Math.max(1_000, input.expiresInMs ?? 30_000)),
        arguments: input.arguments ?? {},
        ...(input.clientIntent?.trim() ? { clientIntent: input.clientIntent.trim().slice(0, 480) } : {}),
      };
      if (!validateAgentCommand(envelope, now)) return { accepted: false, commandId, error: "invalid_command" };
      const accepted = adapter.sendCommand(envelope);
      if (accepted) lastCommandId = commandId;
      return { accepted, commandId, ...(!accepted ? { error: "transport_unavailable" } : {}) };
    },
    chat(text, channel = "global") {
      const clean = text.trim().slice(0, 480);
      return Boolean(clean) && adapter.sendChat(clean, channel);
    },
    publishVoice(input) {
      const cleanText = String(input.text ?? "").trim().slice(0, 480);
      const cleanHash = String(input.textHash ?? "").trim().slice(0, 128);
      const cleanData = String(input.dataBase64 ?? "");
      const mimeType = input.mimeType;
      if (!adapter.publishVoice || !cleanText || !cleanHash || !cleanData
        || !["audio/mpeg", "audio/ogg", "audio/wav"].includes(mimeType)) {
        return { ok: false, code: "invalid_voice_payload" };
      }
      return adapter.publishVoice({
        mimeType,
        dataBase64: cleanData,
        text: cleanText,
        textHash: cleanHash,
        durationMs: Math.max(1, Math.min(30_000, Math.trunc(input.durationMs ?? cleanText.length * 55))),
        channel: input.channel ?? "local",
      });
    },
    worldList: () => adapter.worldList?.() ?? { ok: false, code: "test_admin_unavailable" },
    worldCreate: (input) => adapter.worldCreate?.(input) ?? { ok: false, code: "test_admin_unavailable" },
    worldLoad: (worldId) => adapter.worldLoad?.(String(worldId).slice(0, 128)) ?? { ok: false, code: "test_admin_unavailable" },
    worldTransition: (destination) => adapter.worldTransition?.(destination) ?? { ok: false, code: "test_admin_unavailable" },
    worldExport: (worldId) => adapter.worldExport?.(String(worldId).slice(0, 128)) ?? { ok: false, code: "test_admin_unavailable" },
    worldImport: (json) => adapter.worldImport?.(String(json).slice(0, 16 * 1024 * 1024)) ?? { ok: false, code: "test_admin_unavailable" },
    worldDelete: (input) => adapter.worldDelete?.(String(input.worldId).slice(0, 128), input.confirm === true) ?? { ok: false, code: "test_admin_unavailable" },
    diagnosticsStart: (input = {}) => adapter.diagnosticsStart?.(input) ?? { ok: false, code: "diagnostics_unavailable" },
    diagnosticsExport: () => adapter.diagnosticsExport?.() ?? null,
    diagnosticsStop: () => adapter.diagnosticsStop?.() ?? null,
    diagnosticsNoteScreenshot: () => adapter.diagnosticsNoteScreenshot?.() ?? { ok: false, code: "diagnostics_unavailable" },
    diagnosticsNoteFallback: (reason = "manual visual recovery") => adapter.diagnosticsNoteFallback?.(String(reason).trim().slice(0, 160)) ?? { ok: false, code: "diagnostics_unavailable" },
    testPause: (paused) => adapter.testPause?.(paused === true) ?? { ok: false, code: "test_admin_unavailable" },
    testEnvironment: (input) => adapter.testEnvironment?.(input) ?? { ok: false, code: "test_admin_unavailable" },
    testAdvance: (milliseconds) => adapter.testAdvance?.(Math.max(0, Math.min(10_000, Math.trunc(milliseconds)))) ?? { ok: false, code: "test_admin_unavailable" },
    disconnect: () => adapter.disconnect(),
  });
}
