import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data";
import { AIRZONE_MAX_CELLS, airCellKey, createAirZoneState, discoverAirZone, type AirEpochs, type AirSnapshotCell, type AirZoneState } from "../app/game/airzone";
import { createAirZoneWorkerHandler, type AirZoneWorkerRequest, type AirZoneWorkerResponse } from "../app/game/airzone-worker-protocol";
import { PressureRuntime, type PressureHost } from "../app/game/pressure-runtime";
import { PressureTopology } from "../app/game/pressure-topology";
import { createMachine } from "../app/game/wayworks";

const room = { x: 3, y: 2, z: 4 }, controller = "3,2,5";
class TestWorker {
  onmessage: ((event: MessageEvent<AirZoneWorkerResponse>) => void) | null = null;
  onerror: (() => void) | null = null;
  readonly messages: AirZoneWorkerRequest[] = [];
  readonly responses: AirZoneWorkerResponse[] = [];
  private handle = createAirZoneWorkerHandler();
  postMessage(message: AirZoneWorkerRequest) {
    this.messages.push(structuredClone(message)); this.responses.push(this.handle(structuredClone(message)));
  }
  flush() { for (const data of this.responses.splice(0)) this.onmessage?.({ data } as MessageEvent<AirZoneWorkerResponse>); }
  terminate() { this.responses.length = 0; }
}
function fixture(populated = true, withWorker = true) {
  const machines: PressureHost["machines"] = new Map();
  if (populated) machines.set(controller, createMachine("life-support-controller", "pressure-source-test", "owner", 0));
  let worldReads = 0, changes = 0;
  const unused = (): never => { throw Error("unexpected host callback"); };
  const host: PressureHost = { locationId: "pressure-source-test", generation: 7, minY: 0, maxY: 15, machines,
    blockAt: point => { worldReads++; return airCellKey(point) === airCellKey(room) ? BlockId.Air : BlockId.Stone; },
    skyTopAt: () => { worldReads++; return 15; }, loadedColumns: () => ["0,0"], environment: unused,
    daylight: unused, occupants: unused, obstructed: unused, actorStillHolding: unused,
    changed: () => { changes++; }, alarm: unused };
  const worker = new TestWorker(), previous = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  Object.defineProperty(globalThis, "Worker", { configurable: true, value: withWorker ? class { constructor() { return worker; } } : undefined });
  let runtime: PressureRuntime;
  try { runtime = new PressureRuntime(host); }
  finally { if (previous) Object.defineProperty(globalThis, "Worker", previous); else Reflect.deleteProperty(globalThis, "Worker"); }
  function settle() { for (let frame = 1; frame <= 12; frame++) { runtime.update(0, frame * 20); worker.flush(); } }
  return { runtime, worker, host, settle, activity: () => ({ worldReads, changes, messages: worker.messages.length }) };
}
// Fault injection exposes each independent scheduler state, including states
// that cannot be reached together through a single public update call.
type TopologyInternals = {
  dirty: Set<string>; pending: Set<string>; integritySections: string[] | null; inFlight: AirEpochs | null;
  batch: unknown; cache: Map<string, { origin: { x: number; y: number; z: number }; flags: Uint8Array }>;
};
const internal = (topology: PressureTopology) => topology as unknown as TopologyInternals;

test("settled pressure source is detached, JSON-safe, repeatable, and does not read or advance authority", () => {
  const f = fixture();
  try {
    f.settle(); assert.ok(f.runtime.zoneAt(room));
    const before = f.activity(), source = f.runtime.snapshotAttachmentSource(), text = JSON.stringify(source);
    assert.deepEqual(f.runtime.snapshotAttachmentSource(), source);
    assert.deepEqual(JSON.parse(text), source);
    assert.deepEqual(f.activity(), before);
    assert.ok(Object.isFrozen(source));
    f.runtime.boundary.admitted.oxygenMilliMoles++;
    assert.notDeepEqual(f.runtime.snapshotAttachmentSource(), source);
    assert.equal(JSON.stringify(source), text, "later live writes cannot alter captured data");
  } finally { f.runtime.dispose(); }
});

test("direct gas, device, gate and cached-byte edits invalidate the source without revision changes", () => {
  const f = fixture();
  try {
    f.settle(); const topologyRevision = f.runtime.topology.revision;
    let source = f.runtime.snapshotAttachmentSource();
    const zone = f.runtime.zoneAt(room)!;
    (zone as { oxygenMilliMoles: number }).oxygenMilliMoles++;
    assert.equal(f.runtime.zoneAt(room)!.resourceRevision, zone.resourceRevision);
    assert.notDeepEqual(f.runtime.snapshotAttachmentSource(), source);
    source = f.runtime.snapshotAttachmentSource();
    f.runtime.devices.get(controller)!.targetPressurePa++;
    assert.notDeepEqual(f.runtime.snapshotAttachmentSource(), source);
    source = f.runtime.snapshotAttachmentSource();
    f.runtime.gates.set(controller, [{ ...room }]);
    assert.notDeepEqual(f.runtime.snapshotAttachmentSource(), source);
    source = f.runtime.snapshotAttachmentSource();
    const section = internal(f.runtime.topology).cache.values().next().value!;
    section.flags[0] ^= 1;
    assert.notDeepEqual(f.runtime.snapshotAttachmentSource(), source);
    assert.equal(f.runtime.topology.revision, topologyRevision);
  } finally { f.runtime.dispose(); }
});

test("discovery in flight, stale responses, and unfinished result batches never report quiescence", () => {
  const f = fixture();
  try {
    f.runtime.update(0, 20);
    assert.throws(() => f.runtime.snapshotAttachmentSource(), /topology-pending/);
    const active = internal(f.runtime.topology).inFlight!; assert.ok(active);
    assert.equal(f.runtime.topology.receive({ type: "cancelled", epochs: { ...active, requestId: active.requestId - 1 } }), false);
    assert.throws(() => f.runtime.snapshotAttachmentSource(), /topology-pending/);
    f.worker.flush();
    assert.equal(internal(f.runtime.topology).inFlight, null);
    assert.ok(internal(f.runtime.topology).batch);
    assert.throws(() => f.runtime.snapshotAttachmentSource(), /topology-pending/);
    f.settle(); assert.doesNotThrow(() => f.runtime.snapshotAttachmentSource());
  } finally { f.runtime.dispose(); }
});

test("dirty topology, queued seeds, integrity scans, and checking zones fail closed without repair", () => {
  const f = fixture();
  try {
    f.settle(); const state = internal(f.runtime.topology), baseline = f.runtime.snapshotAttachmentSource();
    const before = f.activity();
    for (const field of ["dirty", "pending"] as const) {
      state[field].add("queued");
      assert.throws(() => f.runtime.snapshotAttachmentSource(), /topology-pending/);
      assert.deepEqual([...state[field]], ["queued"]); state[field].clear();
    }
    for (const scan of [[], ["0,0,0"]]) {
      state.integritySections = scan;
      assert.throws(() => f.runtime.snapshotAttachmentSource(), /topology-pending/);
      assert.equal(state.integritySections, scan);
    }
    state.integritySections = null;
    const zone = f.runtime.zoneAt(room)!;
    f.runtime.topology.zones.set(zone.zoneId, { ...zone, status: "checking" });
    assert.throws(() => f.runtime.snapshotAttachmentSource(), /topology-pending/);
    f.runtime.topology.zones.set(zone.zoneId, zone);
    assert.deepEqual(f.runtime.snapshotAttachmentSource(), baseline); assert.deepEqual(f.activity(), before);
    f.runtime.onEdit(room);
    assert.throws(() => f.runtime.snapshotAttachmentSource(), /topology-pending/);
  } finally { f.runtime.dispose(); }
});

test("active, expired and completed holds remain pending until the runtime itself removes them", () => {
  const f = fixture();
  try {
    f.settle(); const holds = (f.runtime as unknown as { holds: Map<string, unknown> }).holds;
    const baseline = f.runtime.snapshotAttachmentSource(), before = f.activity();
    for (const completed of [false, true]) {
      const hold = { key: controller, installationId: "p-1", command: "manual-open-inner", start: -9000, renewed: -9000, completed };
      holds.set("owner", hold);
      assert.throws(() => f.runtime.snapshotAttachmentSource(), /hold-pending/);
      assert.equal(holds.get("owner"), hold); holds.clear();
    }
    assert.deepEqual(f.runtime.snapshotAttachmentSource(), baseline); assert.deepEqual(f.activity(), before);
  } finally { f.runtime.dispose(); }
});

test("worker absence is explicit and allowed only for empty never-used topology; errors are not hidden", () => {
  const empty = fixture(false, false), populated = fixture(true, false), settled = fixture();
  try {
    const source = empty.runtime.snapshotAttachmentSource();
    assert.match(JSON.stringify(source), /discovery-worker-unavailable/);
    assert.equal(empty.runtime.topology.snapshotAttachmentSource().neverUsed, true);
    assert.throws(() => populated.runtime.snapshotAttachmentSource(), /worker-unavailable/);
    empty.runtime.topology.lastError = "invalid-saved-zone";
    assert.throws(() => empty.runtime.snapshotAttachmentSource(), /topology-error:invalid-saved-zone/);
    settled.settle(); settled.runtime.topology.lastError = "discovery-worker-failed";
    assert.throws(() => settled.runtime.snapshotAttachmentSource(), /topology-error:discovery-worker-failed/);
    settled.runtime.topology.lastError = null; settled.runtime.dispose();
    assert.throws(() => settled.runtime.snapshotAttachmentSource(), /worker-unavailable/);
  } finally { empty.runtime.dispose(); populated.runtime.dispose(); settled.runtime.dispose(); }
});

test("invalid non-JSON source values fail closed instead of normalizing or dropping them", () => {
  const f = fixture();
  try {
    f.settle(); const zone = f.runtime.zoneAt(room)!;
    (zone as { oxygenMilliMoles: number }).oxygenMilliMoles = Number.NaN;
    assert.throws(() => f.runtime.snapshotAttachmentSource(), /finite/);
    (zone as { oxygenMilliMoles: number }).oxygenMilliMoles = 0;
    const source = f.runtime.snapshotAttachmentSource();
    (zone as AirZoneState & { optional?: unknown }).optional = undefined;
    assert.notDeepEqual(f.runtime.snapshotAttachmentSource(), source, "own undefined is distinct from absence");
  } finally { f.runtime.dispose(); }
});

test("maximum-capacity discovered room keeps topology and runtime encoding independent", () => {
  const f = fixture(false);
  try {
    const cells: AirSnapshotCell[] = [];
    for (let x = 0; x < 32; x++) for (let y = 0; y < 16; y++) for (let z = 0; z < 32; z++) cells.push({
      x, y, z, passable: true,
      sealMask: (x === 31 ? 1 : 0) | (x === 0 ? 2 : 0) | (y === 15 ? 4 : 0) | (y === 0 ? 8 : 0)
        | (z === 31 ? 16 : 0) | (z === 0 ? 32 : 0),
      ...(x === 0 && y === 0 && z === 0 ? { controllerIds: Array.from({ length: 8 }, (_, i) => `controller-${i}`) } : {}),
    });
    const result = discoverAirZone({ epochs: { locationId: f.host.locationId, generation: f.host.generation, topologyRevision: 0, requestId: 1 },
      seed: { x: 0, y: 0, z: 0 }, cells });
    assert.equal(result.cellCount, AIRZONE_MAX_CELLS); assert.equal(result.status, "sealed");
    const zone = createAirZoneState(result), topology = f.runtime.topology;
    topology.zones.set(zone.zoneId, zone); topology.topologies.set(zone.zoneId, result); topology.diagnostics.set("0,0,0", result);
    for (const key of result.cellKeys) topology.cellZones.set(key, zone.zoneId);
    const before = f.activity(), source = f.runtime.snapshotAttachmentSource();
    assert.equal(source.topology.source[0], "object"); assert.equal(source.source[0], "object");
    assert.ok(Object.isFrozen(source.topology));
    assert.equal(JSON.stringify(f.runtime.snapshotAttachmentSource()), JSON.stringify(source));
    assert.deepEqual(f.activity(), before);
  } finally { f.runtime.dispose(); }
});
