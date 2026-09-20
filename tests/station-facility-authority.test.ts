import assert from "node:assert/strict";
import test from "node:test";
import { BlockId, Item } from "../app/game/data";
import { VoxelEngine, normalizeMultiplayerPlayerState } from "../app/game/engine";
import { homeLocation, locationId, universeId } from "../app/game/location-address";
import type { FacilityAction, PeerInfo } from "../app/game/multiplayer";
import { createStationRegistry, type StationPermission } from "../app/game/orbital-station";
import { PRESSURE_CATALOG, type PressureMachineKind } from "../app/game/pressure-catalog";
import { createPressureDevice } from "../app/game/pressure-devices";
import { createSurveyHopper } from "../app/game/space-vehicle";
import { planStationFoundation } from "../app/game/station-runtime";
import { createMachine, normalizeMachine, type MachineState } from "../app/game/wayworks";
import type { AgentCommandEnvelope, AgentCommandResult } from "../app/game/agent-platform";

const guest = "station_operator";
function fixture(kind: PressureMachineKind, permission: StationPermission) {
  const orbit = locationId({ ...homeLocation(universeId("station-service")), kind: "orbit", instanceId: "low" });
  const ship = structuredClone(createSurveyHopper("ship", "local", orbit, [0, 32.51, 0])); ship.phase = "orbit";
  const registry = structuredClone(planStationFoundation({ registry: createStationRegistry(orbit), ship,
    actor: { actorId: "local", factionIds: [], guildIds: [] }, name: "Service", stationId: "station", actionId: "found",
    inventory: [{ item: BlockId.StationCore, count: 1 }, { item: BlockId.OrbitalDock, count: 1 }, { item: BlockId.StationTruss, count: 8 }],
    blockAt: () => BlockId.Air, blocked: () => false }).registry);
  registry.stations.station.access[permission] = "public";
  const key = "5,33,0", machine = createMachine(kind, orbit, "local");
  machine.workshop.trusted = [guest, "secret_operator"];
  machine.workshop.slots.input = { item: Item.Berry, count: 3, metadata: { secret: "private-cargo" } };
  machine.workshop.channel = "private-channel";
  machine.workshop.process!.installationId = "p-1";
  const device = createPressureDevice("p-1");
  const player = normalizeMultiplayerPlayerState({ playerId: guest, inventory: [{ item: Item.FieldWrench, count: 1 }], revision: 0 }, guest);
  const responses: FacilityAction[] = [], pressureCalls: unknown[][] = [];
  // Only the pressure actuator is a boundary stub. Admission, station policy,
  // revisions, projection, transactions and subscription revocation are real engine code.
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    orbitalStations: registry, wayworks: new Map([[key, machine]]), wayworksActorReady: new Map(), wayworksActorClipboards: new Map(),
    multiplayer: { role: "host", identity: { id: "host" }, getPeer: () => ({}), sendFacilityAction: (action: FacilityAction) => { responses.push(action); return 1; } },
    world: { getBlock: () => PRESSURE_CATALOG[kind].id, locationScope: { locationId: orbit } },
    remotePlayers: new Map([[guest, { target: { x: 5, y: 33, z: 1 } }]]),
    multiplayerPlayerStates: new Map([[guest, player]]), multiplayerPeerActiveFacilities: new Map(), multiplayerPeerFacilitySignatures: new Map(),
    multiplayerFacilityRevisions: new Map(), multiplayerFacilitySignatures: new Map(),
    pressureRuntime: { host: { generation: 2 }, devices: new Map([[key, device]]),
      diagnosticsFor: () => ({ device, zone: undefined, occupants: 0, capacity: 0, bounds: null, leak: null, checkAgeMs: 0, topologyRevision: 1, error: null }),
      continuesHold: () => false, operate: (...args: unknown[]) => { pressureCalls.push(args); machine.revision++; return { ok: true, reason: "ok" }; } },
    ensureHostPlayerSession: () => engine.multiplayerPlayerStates.get(guest), activeSharedFacility: () => null,
    queueCriticalReliableRequest: (_key: string, send: () => number) => { send(); return true; }, saveSoon: () => {}, emitHud: () => {},
  }) as VoxelEngine;
  const api = engine as unknown as { handleRemoteFacilityAction(action: FacilityAction, peer: PeerInfo): void; syncMultiplayerFacilities(): void };
  const peer = { identity: { id: guest, name: "Operator", color: "#ffffff" } } as PeerInfo;
  const base: FacilityAction = { actorId: guest, requestId: "station_open", facilityId: `wayworks:${key}`, facilityKind: "wayworks", kind: "open", status: "request" };
  const send = (patch: Partial<FacilityAction> = {}) => api.handleRemoteFacilityAction({ ...base, ...patch }, peer);
  const transact = (patch: Partial<FacilityAction> = {}) => send({ kind: "transact", requestId: "station_tx", expectedRevision: machine.revision,
    expectedPlayerRevision: engine.multiplayerPlayerStates.get(guest)!.revision,
    operation: { kind: "workshop", inventorySlot: 0, action: { kind: "pressure", action: { kind: "door", open: false } } }, ...patch });
  return { engine, api, registry, machine, responses, pressureCalls, send, transact, orbit };
}
function assertPrivate(response: FacilityAction | undefined) {
  assert.ok(response?.state);
  const serialized = JSON.stringify(response.state);
  for (const secret of ["private-cargo", "secret_operator", "private-channel"]) assert.ok(!serialized.includes(secret), secret);
  assert.equal(response.state.pressureOnly, true);
  assert.ok(Object.values((response.state.workshop as MachineState["workshop"]).slots).every(slot => slot === null));
}

for (const [kind, permission] of [["pressure-door", "airlock"], ["emergency-shutter", "airlock"], ["life-support-controller", "life-support"]] as const) {
  test(`${permission} service for ${kind} is independent of container access and never sends private stores`, () => {
    const h = fixture(kind, permission), before = structuredClone(h.machine.workshop);
    h.send(); assert.equal(h.responses.at(-1)?.status, "accepted"); assertPrivate(h.responses.at(-1));
    const view = h.responses.at(-1)!.state!;
    assert.equal(normalizeMachine(view, kind, h.orbit, "local").kind, kind, "redacted view remains a valid machine presentation");
    h.transact(); assert.equal(h.responses.at(-1)?.status, "accepted"); assert.equal(h.pressureCalls.length, 1); assertPrivate(h.responses.at(-1));
    h.transact({ operation: { kind: "workshop", inventorySlot: 0, action: { kind: "slot", slot: "input", direction: "extract", maximum: 1 } } });
    assert.equal(h.responses.at(-1)?.status, "rejected"); assertPrivate(h.responses.at(-1));
    h.transact({ expectedRevision: 0 }); assert.equal(h.responses.at(-1)?.status, "rejected"); assertPrivate(h.responses.at(-1));
    h.send({ kind: "update", state: { fake: true } }); assert.equal(h.responses.at(-1)?.status, "rejected"); assertPrivate(h.responses.at(-1));
    h.api.syncMultiplayerFacilities(); assertPrivate(h.responses.at(-1));
    assert.deepEqual(h.machine.workshop, before, "projection never edits canonical storage or trusts");
    assert.equal(h.engine.multiplayerPlayerStates.get(guest)!.inventory[0]?.item, Item.FieldWrench);
    h.registry.stations.station.access[permission] = "private";
    h.api.syncMultiplayerFacilities(); assert.equal(h.responses.at(-1)?.kind, "close"); assert.equal(h.responses.at(-1)?.state, undefined);
    assert.equal(h.engine.multiplayerPeerActiveFacilities.size, 0);
  });
}

test("container admission does not grant airlock control, and station grant does not replace machine trust", () => {
  const h = fixture("pressure-door", "container");
  h.send(); assert.equal(h.responses.at(-1)?.status, "accepted");
  h.transact(); assert.equal(h.responses.at(-1)?.status, "rejected"); assert.equal(h.pressureCalls.length, 0);
  h.registry.stations.station.access.container = "private"; h.registry.stations.station.access.airlock = "public";
  h.machine.workshop.trusted = []; h.machine.workshop.security = "public";
  h.send(); assert.equal(h.responses.at(-1)?.status, "rejected"); assert.equal(h.responses.at(-1)?.state, undefined);
});

test("guest pressure-only presentation preserves installation, hardware capacity and stable synchronization without durable secrets", () => {
  const h = fixture("life-support-controller", "life-support");
  h.machine.workshop.upgrades.capacity = 3; h.machine.energyJ = 500000;
  h.send(); const view = h.responses.at(-1)!.state!; assertPrivate(h.responses.at(-1));
  const guestEngine = Object.assign(Object.create(VoxelEngine.prototype), {
    multiplayer: { role: "guest", identity: { id: guest } }, world: h.engine.world, wayworks: new Map(),
    activeWayworksKey: "5,33,0", activeNetworkFacilityId: "wayworks:5,33,0", guestPressure: { generation: 2 },
    selectedSlot: () => null,
  }) as VoxelEngine;
  const api = guestEngine as unknown as {
    applySharedFacilityState(kind: string, key: string, state: Record<string, unknown>): void;
    sharedFacilityState(kind: string, key: string): Record<string, unknown>;
    wayworksHud(): { pressureOnly: boolean; energyJ: number; pressure: { device: { installationId: string } } };
  };
  api.applySharedFacilityState("wayworks", "5,33,0", view);
  assert.equal(api.wayworksHud().pressureOnly, true); assert.equal(api.wayworksHud().energyJ, 500000);
  assert.equal(api.wayworksHud().pressure.device.installationId, "p-1");
  assert.deepEqual(api.sharedFacilityState("wayworks", "5,33,0"), view, "guest reconstruction does not trigger endless refreshes");
  h.registry.stations.station.access.container = "public"; h.send();
  api.applySharedFacilityState("wayworks", "5,33,0", h.responses.at(-1)!.state!);
  assert.equal(api.wayworksHud().pressureOnly, false, "new grant refresh restores the full authorized view");
});

test("agent pressure service shares operation grants and redacted views without acquiring container rights", () => {
  const h = fixture("life-support-controller", "life-support");
  Object.assign(h.engine, { agentInventories: new Map([[guest, [{ item: Item.FieldWrench, count: 1 }]]]), agentInventoryRevisions: new Map(),
    agentBuildJobs: new Map(), agentAuthority: { get: () => ({ granted: ["inventory.self.write"] }) }, agentPose: () => ({ x: 5, y: 33, z: 1 }),
    publishAgentResult: (result: AgentCommandResult) => result });
  const api = h.engine as unknown as { executeAgentCommand(command: AgentCommandEnvelope): AgentCommandResult };
  const run = (kind: AgentCommandEnvelope["kind"], args: Record<string, unknown>) => api.executeAgentCommand({ schema: 1,
    scope: { locationId: h.orbit, epoch: 1, revision: 1 }, commandId: "station_agent", agentId: guest, kind,
    expectedWorldRevision: 1, issuedAt: Date.now(), expiresAt: Date.now() + 10000, arguments: { targetId: "workshop:5,33,0", ...args } } as AgentCommandEnvelope);
  const inspected = run("workshop_get", {}); assert.equal(inspected.status, "completed");
  assertPrivate({ state: inspected.data?.machine } as FacilityAction);
  const operated = run("workshop_operate", { inventorySlot: 0, expectedInventoryRevision: 0, expectedMachineRevision: 0,
    operation: { kind: "pressure", action: { kind: "mode", mode: "off" } } });
  assert.equal(operated.status, "completed"); assertPrivate({ state: operated.data?.machine } as FacilityAction);
  assert.equal(h.pressureCalls.length, 1);
  const denied = run("workshop_operate", { inventorySlot: 0, expectedInventoryRevision: 0, expectedMachineRevision: 1,
    operation: { kind: "slot", slot: "input", direction: "extract", maximum: 1 } });
  assert.equal(denied.status, "blocked"); assert.equal(h.machine.workshop.slots.input?.count, 3);
});
