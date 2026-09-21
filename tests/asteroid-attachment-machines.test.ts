import assert from "node:assert/strict";
import test from "node:test";
import { BlockId, Item } from "../app/game/data";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, rebaseAsteroidCell } from "../app/game/asteroid-attachment-frame";
// These deliberately isolate routing at boundary-adjacent cells. Full physical
// model selection is independently exercised in workshop-body.test.ts.
import { projectAsteroidMachineNetworks as projectAsteroidMachines, captureAsteroidMachineNetworks as captureAsteroidMachines } from "../app/game/asteroid-attachment-machines";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { createMachine, localFaceForWorldDirection, MACHINE_FACES, powerTopologyNode, type MachineKind, type MachineState,
  type PortMode, type PowerNode } from "../app/game/wayworks";
import { WAYWORKS_BLOCKS } from "../app/game/wayworks-integration";
import { materialTopologyNode } from "../app/game/wayworks-links";
import { MATERIAL_KINDS, MATERIAL_PORT_MODES, workshopRunning } from "../app/game/wayworks-stores";
import { portAllowsTransfer } from "../app/game/wayworks-network";
import { canonicalJson } from "../app/game/universe-json";

const orbit = locationAddress({ ...homeLocation(universeId("machine-selection")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const blockFor = (kind: MachineKind) => Number(Object.entries(WAYWORKS_BLOCKS).find(([, value]) => value === kind)![0]) as BlockId;
const localKey = (x: number, y = 32, z = 0) => rebaseAsteroidCell(frame, `${x},${y},${z}`, "local");
function fixture() {
  const machines: Record<string, MachineState> = {}, blocks = new Map<string, BlockId>();
  const voxel = (key: string) => blocks.get(key) ?? BlockId.Air;
  const put = (key: string, kind: MachineKind = "grid-battery", facing = 0) => {
    const state = createMachine(kind, frame.orbitId, "local", facing);
    for (const face of MACHINE_FACES) {
      state.ports[face] = "disabled";
      for (const resource of MATERIAL_KINDS) state.workshop.resourcePorts[resource][face] = "disabled";
    }
    machines[key] = state; blocks.set(key, blockFor(kind)); return state;
  };
  return { machines, blocks, voxel, put, project: () => projectAsteroidMachines(frame, machines, voxel) };
}
const resources = ["energy", ...MATERIAL_KINDS] as const;
function configure(state: MachineState, resource: typeof resources[number], dx: number, dy: number, dz: number, mode: PortMode) {
  const face = localFaceForWorldDirection(state.facing, dx, dy, dz);
  (resource === "energy" ? state.ports : state.workshop.resourcePorts[resource])[face] = mode;
}
const edge = (axis: number, sign: number) => {
  const b = frame.orbitBounds, p = [frame.offset.x, frame.offset.y + 32, frame.offset.z];
  p[axis] = axis === 0 ? sign > 0 ? b.maxX : b.minX : axis === 1 ? sign > 0 ? b.maxY : b.minY : sign > 0 ? b.maxZ : b.minZ;
  const q = [...p]; q[axis] += sign; const d = [0, 0, 0]; d[axis] = sign;
  return { inside: p.join(","), outside: q.join(","), dx: d[0], dy: d[1], dz: d[2] };
};

test("all five configured resource graphs reject crossings on all six faces in either direction", () => {
  for (const resource of resources) for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) for (const reverse of [false, true]) {
    const f = fixture(), e = edge(axis, sign), a = f.put(e.inside), b = f.put(e.outside);
    configure(a, resource, e.dx, e.dy, e.dz, reverse ? "input" : "output");
    configure(b, resource, -e.dx, -e.dy, -e.dz, reverse ? "output" : "input");
    assert.throws(f.project, /network crosses/, `${resource}/${axis}/${sign}/${reverse}`);
  }
});

test("routing honors every port pair and both facings without inferring capacity or contents", () => {
  const e = edge(0, 1);
  for (const resource of resources) for (const aMode of MATERIAL_PORT_MODES) for (const bMode of MATERIAL_PORT_MODES)
    for (const facing of [0, 1, 2, 3]) {
      const f = fixture(), a = f.put(e.inside, "grid-battery", facing), b = f.put(e.outside, "grid-battery", (facing + 1) % 4);
      configure(a, resource, 1, 0, 0, aMode); configure(b, resource, -1, 0, 0, bMode);
      const connected = portAllowsTransfer(aMode, bMode) || portAllowsTransfer(bMode, aMode);
      if (connected) assert.throws(f.project, /network crosses/);
      else assert.doesNotThrow(f.project);
    }
});

test("owners, channels, enabled state and live control signals isolate configured components", () => {
  for (const resource of resources) for (const change of [
    (s: MachineState) => { s.ownerId = "other"; }, (s: MachineState) => { s.workshop.channel = "teal"; },
    (s: MachineState) => { s.enabled = false; }, (s: MachineState) => { s.workshop.control = "signal-on"; },
    (s: MachineState) => { s.workshop.control = "signal-off"; s.workshop.signal = true; },
  ]) {
    const f = fixture(), e = edge(0, 1), a = f.put(e.inside), b = f.put(e.outside);
    configure(a, resource, 1, 0, 0, "output"); configure(b, resource, -1, 0, 0, "input"); change(b);
    assert.doesNotThrow(f.project);
  }
});

test("chemical backflow uses the actual input-only conversion rather than visual arms", () => {
  const f = fixture(), e = edge(0, 1), a = f.put(e.inside, "gasline"), b = f.put(e.outside, "gasline");
  configure(a, "chemical", 1, 0, 0, "both"); configure(b, "chemical", -1, 0, 0, "both");
  assert.doesNotThrow(f.project);
  a.workshop.process!.backflow = true; assert.throws(f.project, /network crosses/);
});

test("canonical neighbors and machine voxels must resolve even when they are outside or disabled", () => {
  const f = fixture(), key = localKey(0); f.put(key).enabled = false;
  f.blocks.set(localKey(1), BlockId.GridCable); assert.throws(f.project, /Missing canonical/);
  f.blocks.delete(localKey(1));
  assert.throws(() => projectAsteroidMachines(frame, f.machines, k => k === localKey(1) ? undefined : f.voxel(k)), /Unresolved/);
  f.blocks.set(key, BlockId.Stone); assert.throws(f.project, /voxel custody/);
  f.blocks.set(key, BlockId.GridBattery); f.machines[key].locationId = frame.localId; assert.throws(f.project, /voxel custody/);
});

test("all canonical machines are inspected beyond the live 256-node simulation slice", () => {
  const f = fixture(), e = edge(0, 1);
  for (let i = 0; i < 300; i++) f.put(`${frame.orbitBounds.maxX + 100 + i * 2},32,0`);
  const a = f.put(e.inside), b = f.put(e.outside);
  assert.equal(Object.keys(f.project()).length, 1);
  configure(a, "energy", 1, 0, 0, "output"); configure(b, "energy", -1, 0, 0, "input");
  assert.throws(f.project, /network crosses/);
});

test("one hundred cold captures retain exact buffers, paid cycles, nested cargo and outside records", () => {
  const f = fixture(), inside = localKey(0), outside = `${frame.orbitBounds.maxX + 20},32,0`;
  const a = f.put(inside), b = f.put(outside); a.energyJ = 213; a.transferRemainder = 71; b.energyJ = 813;
  a.workshop.slots.input = { item: Item.CopperIngot, count: 3, metadata: { x: 999.1, y: -.2, z: 83, locationId: "opaque" } };
  a.workshop.heatJ = 41; a.workshop.resourceRemainders.item = 137;
  const processor = f.put(localKey(2), "powered-crusher");
  processor.workshop.cycle = { recipeId: "crush-iron", progressMs: 1000, paidJ: 1200, durationMs: 5000, costJ: 6000 };
  const original = canonicalJson(f.machines); let current = f.machines;
  for (let i = 0; i < 100; i++) {
    const projection = projectAsteroidMachines(frame, current, f.voxel);
    assert.equal(projection["0,32,0"].locationId, frame.localId);
    current = JSON.parse(JSON.stringify(captureAsteroidMachines(frame, current, projection, projection, { before: f.voxel, after: f.voxel })));
    assert.equal(canonicalJson(current), original);
  }
  const projection = f.project(); projection["0,32,0"].energyJ--;
  assert.equal(canonicalJson(f.machines), original);
});

test("capture rechecks after-image links, stale state, outside preservation and removed machine voxels", () => {
  const f = fixture(), e = edge(0, 1), a = f.put(e.inside), b = f.put(e.outside);
  configure(b, "energy", -1, 0, 0, "input");
  const baseline = f.project(), local = Object.keys(baseline)[0], edited = structuredClone(baseline);
  configure(edited[local], "energy", 1, 0, 0, "output");
  assert.throws(() => captureAsteroidMachines(frame, f.machines, baseline, edited, { before: f.voxel, after: f.voxel }), /network crosses/);
  assert.throws(() => captureAsteroidMachines(frame, f.machines, baseline, {}, { before: f.voxel, after: f.voxel }), /Removed machine/);
  assert.throws(() => captureAsteroidMachines(frame, f.machines, baseline, {}, { before: f.voxel, after: k => k === e.inside ? undefined : f.voxel(k) }), /Removed machine/);
  const after = (key: string) => key === e.inside ? BlockId.Air : f.voxel(key);
  const removed = captureAsteroidMachines(frame, f.machines, baseline, {}, { before: f.voxel, after });
  assert.deepEqual(removed, { [e.outside]: b });
  a.energyJ++; assert.throws(() => captureAsteroidMachines(frame, f.machines, baseline, baseline, { before: f.voxel, after: f.voxel }), /Stale/);
});

test("malformed or duplicate installation payloads fail without normalization or quantity repair", () => {
  for (const change of [(s: MachineState) => { s.energyJ = NaN; }, (s: MachineState) => { s.energyJ = -1; },
    (s: MachineState) => { s.facing = 4; }, (s: MachineState) => { Object.assign(s, { unknown: true }); },
    (s: MachineState) => { Object.assign(s.workshop, { unknown: true }); }]) {
    const f = fixture(); change(f.put(localKey(0))); assert.throws(f.project);
  }
  const f = fixture(), a = f.put(localKey(0), "gasline"), b = f.put(localKey(2), "gasline");
  a.workshop.process!.installationId = b.workshop.process!.installationId = "p-1";
  assert.throws(f.project, /Duplicate/);
});

test("adjacent Waygrid export keeps its physical terminal together but never copies the global vault", () => {
  const f = fixture(), e = edge(0, 1), a = f.put(e.inside, "powered-crusher");
  f.blocks.set(e.outside, BlockId.WaygridVaultTerminal); configure(a, "item", 1, 0, 0, "output");
  assert.doesNotThrow(f.project); a.workshop.autoEject = true; assert.throws(f.project, /terminal coupling/);
  a.ownerId = "other"; assert.doesNotThrow(f.project);
  const g = fixture(), b = g.put(e.outside, "powered-crusher"); g.blocks.set(e.inside, BlockId.WaygridVaultTerminal);
  configure(b, "item", -1, 0, 0, "both"); b.workshop.autoEject = true; assert.throws(g.project, /terminal coupling/);
});

test("shared runtime topology inputs reproduce the previous exact power and material mapping", () => {
  for (const kind of Object.values(WAYWORKS_BLOCKS)) for (const facing of [0, 1, 2, 3]) for (const enabled of [false, true]) {
    const state = createMachine(kind, frame.orbitId, "owner", facing), node: PowerNode = { key: "1,2,3", x: 1, y: 2, z: 3, state, solarExposure: .7 };
    state.enabled = enabled;
    const base = { key: node.key, x: node.x, y: node.y, z: node.z, kind, locationId: state.locationId, ownerId: state.ownerId,
      facing, channel: state.workshop.channel, enabled: enabled && workshopRunning(state.workshop) };
    assert.deepEqual(powerTopologyNode(node), { ...base, ports: state.ports });
    state.revision = Number.MAX_SAFE_INTEGER; assert.equal(powerTopologyNode(node).enabled, false);
    for (const resource of MATERIAL_KINDS) assert.deepEqual(materialTopologyNode(node, resource), { ...base,
      ports: Object.fromEntries(Object.entries(state.workshop.resourcePorts[resource]).map(([face, mode]) => [face,
        mode === "both" && state.workshop.process?.backflow === false ? "input" : mode])) });
  }
});
