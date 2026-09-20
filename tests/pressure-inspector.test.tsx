import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VoxelEngine, normalizeMultiplayerPlayerState } from "../app/game/engine";
import { BlockId, Item } from "../app/game/data";
import { createMachine } from "../app/game/wayworks";
import { createPressureDevice } from "../app/game/pressure-devices";
import { createAirlockState } from "../app/game/pressure-airlock";
import { acceptPressureInspector, buildPressureInspector } from "../app/game/pressure-inspector";
import { createSkillState } from "../app/game/skills";
import { airZoneDiagnostics, createAirZoneState, discoverAirZone } from "../app/game/airzone";
import { validatePayload, type FacilityAction, type PeerInfo } from "../app/game/multiplayer";
import type { PressurePanelProps } from "../app/game/PressurePanel";

register(`data:text/javascript,${encodeURIComponent(`export async function load(url, context, nextLoad) {
  if (url.endsWith('.module.css')) return { format: 'module', shortCircuit: true, source: 'export default new Proxy({}, { get: (_, key) => String(key) });' };
  return nextLoad(url, context);
}`)}`, import.meta.url);
const { PressurePanel, PressureHoldSession } = await import("../app/game/PressurePanel");
const key = "0,0,0", id = `wayworks:${key}`, actor = "player_pressure_guest";
const binding = { locationId: "L", generation: 2, facilityId: id, installationId: "p-1", revision: 4 };
const device = createPressureDevice("p-1");
device.airlock = createAirlockState({ controllerKey: key, innerDoorKey: "1,0,0", outerDoorKey: "2,0,0", chamberZoneId: "3,0,0", interiorZoneId: "4,0,0", exteriorZoneId: "exterior", recoveryPumpKey: "5,0,0", reserveKey: "6,0,0" });
const diagnostics = { device, zone: undefined, occupants: 0, capacity: 0, bounds: null, leak: null, checkAgeMs: 0, topologyRevision: 7, error: null };
type API = { sharedFacilityState(kind: string, key: string): Record<string, unknown>; applySharedFacilityState(kind: string, key: string, state: Record<string, unknown>): void;
  wayworksHud(): { pressure?: PressurePanelProps["pressure"] }; handleRemoteFacilityAction(action: FacilityAction, peer: PeerInfo): void };
function harness(trusted = true) {
  const machine = createMachine("airlock-controller", "L", "local"); machine.revision = 4;
  machine.workshop.process!.installationId = "p-1";
  machine.workshop.trusted = trusted ? [actor] : [];
  const responses: FacilityAction[] = [], requests: FacilityAction[] = [], calls: unknown[][] = [];
  const player = normalizeMultiplayerPlayerState({ playerId: actor, revision: 0, variant: "female", selected: 0,
    inventory: [{ item: Item.FieldWrench, count: 1 }, ...Array(35).fill(null)], equipment: { head: null, chest: null, legs: null, feet: null }, health: 10, hunger: 10, xp: 0, level: 1, skills: createSkillState() }, actor);
  const common = { world: { getBlock: () => BlockId.AirlockController, locationScope: { locationId: "L", epoch: 2 } },
    wayworks: new Map([[key, machine]]), selected: 0, selectedSlot: () => ({ item: Item.FieldWrench, count: 1 }),
    multiplayerFacilityRevisions: new Map(), multiplayerFacilitySignatures: new Map(), multiplayerPendingFacilityMutations: new Set(),
    multiplayerPeerFacilitySignatures: new Map(), multiplayerPeerActiveFacilities: new Map(),
    queueCriticalReliableRequest: (_key: string, send: () => number) => { send(); return true; }, emitHud: () => {}, saveSoon: () => {}, events: { onToast: () => {} },
    activeWayworksKey: key, activeNetworkFacilityId: id };
  const host = Object.assign(Object.create(VoxelEngine.prototype), common, {
    multiplayer: { role: "host", identity: { id: "host" }, sendFacilityAction: (a: FacilityAction) => { responses.push(a); return 1; } },
    remotePlayers: new Map([[actor, { target: { x: 0, y: 0, z: 1 } }]]), multiplayerPlayerStates: new Map([[actor, player]]),
    ensureHostPlayerSession: () => host.multiplayerPlayerStates.get(actor),
    pressureRuntime: { host: { generation: 2 }, devices: new Map([[key, device]]), diagnosticsFor: () => diagnostics,
      operate: (...args: unknown[]) => { calls.push(args); return { ok: true, reason: "Host validated hold" }; } },
  }) as VoxelEngine;
  const guest = Object.assign(Object.create(VoxelEngine.prototype), common, {
    wayworks: new Map([[key, structuredClone(machine)]]), guestPressure: { locationId: "L", generation: 2 }, pressureRuntime: null,
    multiplayerTick: 0, multiplayerPlayerStateRevision: 0, multiplayerFacilityRevisions: new Map(), multiplayerFacilitySignatures: new Map(),
    multiplayer: { role: "guest", identity: { id: actor }, sendFacilityAction: (a: FacilityAction) => { requests.push(a); return 1; } },
  }) as VoxelEngine;
  const api = host as unknown as API, guestApi = guest as unknown as API;
  const peer = { identity: { id: actor, name: "Guest", color: "#ffffff" } } as PeerInfo;
  const open: FacilityAction = { requestId: "facility_pressure_open", actorId: actor, facilityId: id, facilityKind: "wayworks", kind: "open", status: "request" };
  api.handleRemoteFacilityAction(open, peer);
  const deliver = () => { const response = responses.at(-1)!; guestApi.applySharedFacilityState("wayworks", key, response.state!); guest.multiplayerFacilityRevisions.set(id, response.expectedRevision!); };
  return { host, guest, api, guestApi, peer, open, responses, requests, calls, deliver };
}

test("trusted guest receives bounded real pressure controls and hold callback remains a host intent", context => {
  context.mock.timers.enable({ apis: ["setInterval"] });
  const h = harness(); assert.equal(h.responses[0].status, "accepted");
  assert.equal(validatePayload("facility-action", h.responses[0]), true);
  h.deliver(); const pressure = h.guestApi.wayworksHud().pressure;
  assert.equal(pressure?.device?.installationId, "p-1");
  assert.equal(JSON.stringify(h.guestApi.sharedFacilityState("wayworks", key)), JSON.stringify(h.responses[0].state));
  const html = renderToStaticMarkup(createElement(PressurePanel, { kind: "airlock-controller", workshop: h.guest.wayworks.get(key)!.workshop, pressure, onAction: action => h.guest.workshopAction(action, 4) }));
  assert.match(html, /Hold 8 s/); assert.doesNotMatch(html, /disabled="" aria-pressed="false"/);
  const hold = new PressureHoldSession(action => { h.guest.workshopAction(action, 4); });
  hold.start("manual-open-inner"); hold.stop();
  assert.equal(h.calls.length, 0); assert.equal(h.requests.length, 1);
  assert.deepEqual(h.requests[0].operation, { kind: "workshop", inventorySlot: 0, action: { kind: "pressure", action: { kind: "hold", command: "manual-open-inner", active: true } } });
  h.api.handleRemoteFacilityAction(h.requests[0], h.peer);
  assert.equal(h.responses.at(-1)?.status, "accepted"); assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][1], actor);
});

test("untrusted guest is denied before inspector disclosure or pressure mutation", () => {
  const h = harness(false); assert.equal(h.responses[0].status, "rejected"); assert.equal(h.responses[0].state, undefined);
  h.api.handleRemoteFacilityAction({ ...h.open, kind: "transact", expectedRevision: 4, expectedPlayerRevision: 0,
    operation: { kind: "workshop", inventorySlot: 0, action: { kind: "pressure", action: { kind: "door", open: true } } } }, h.peer);
  assert.equal(h.responses.at(-1)?.status, "rejected"); assert.equal(h.calls.length, 0);
});

test("stale snapshots, replacement, closed panel and changed location clear guest controls", () => {
  for (const change of ["stale", "replacement", "location", "generation", "closed", "missing-block"] as const) {
    const h = harness(); h.deliver(); assert.ok(h.guestApi.wayworksHud().pressure);
    if (change === "stale") { h.deliver(); h.deliver(); }
    if (change === "replacement") h.guest.wayworks.get(key)!.workshop.process!.installationId = "p-2";
    if (change === "location") h.guest.world.locationScope = { ...h.guest.world.locationScope, locationId: "elsewhere" as never };
    if (change === "generation") h.guest.guestPressure = { ...h.guest.guestPressure!, generation: 3 };
    if (change === "closed") h.guest.activeNetworkFacilityId = null;
    if (change === "missing-block") h.guest.world.getBlock = () => BlockId.Air;
    assert.equal(h.guestApi.wayworksHud().pressure, undefined, change);
    assert.equal(h.guest.guestPressureInspector, null, change);
  }
});

test("inspector parser rejects mismatched bindings, malformed devices and oversized payloads", () => {
  const view = buildPressureInspector(binding, 1, diagnostics)!; assert.ok(view);
  for (const patch of [{ locationId: "other" }, { generation: 3 }, { installationId: "p-2" }, { revision: 5 }, { facilityId: "wayworks:1,0,0" }]) {
    assert.equal(acceptPressureInspector(view, null, { ...binding, ...patch }), null);
  }
  assert.equal(acceptPressureInspector(view, view, binding), null);
  assert.equal(acceptPressureInspector({ ...view, diagnostics: { ...diagnostics, device: { ...device, open: "yes" } } }, null, binding), null);
  assert.equal(acceptPressureInspector({ ...view, extra: Array(1000).fill("x") }, null, binding), null);
});

test("room inspector preserves readings while omitting topology membership and derives safety", () => {
  const topology = discoverAirZone({ epochs: { locationId: "L", generation: 2, topologyRevision: 7, requestId: 1 }, seed: { x: 0, y: 0, z: 0 },
    cells: [{ x: 0, y: 0, z: 0, passable: true, sealMask: 63, controllerIds: ["controller"] }] });
  const zone = createAirZoneState(topology, { oxygenMilliMoles: 8000, inertMilliMoles: 30000, co2MilliMoles: 0 });
  const view = buildPressureInspector(binding, 1, { ...diagnostics, zone, ...airZoneDiagnostics(zone, 4), occupants: 1, capacity: 2048 })!;
  assert.ok(view); assert.deepEqual(view.diagnostics.zone!.cellKeys, []); assert.deepEqual(view.diagnostics.zone!.controllerIds, []);
  assert.equal(view.diagnostics.zone!.pressureMilliKPa, zone.pressureMilliKPa);
  assert.equal(zone.cellKeys.length, 1);
  const parsed = acceptPressureInspector({ ...view, diagnostics: { ...view.diagnostics, breathable: false, reasons: ["forged"] } }, null, binding)!;
  assert.equal(parsed.diagnostics.breathable, airZoneDiagnostics(zone).breathable);
  assert.deepEqual(parsed.diagnostics.reasons, airZoneDiagnostics(zone).reasons);
});
