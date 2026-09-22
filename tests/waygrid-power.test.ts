import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data";
import { VoxelEngine } from "../app/game/engine";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { projectAsteroidMachineNetworks, captureAsteroidMachineNetworks } from "../app/game/asteroid-attachment-machines";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { createMachine, localFaceForWorldDirection, MACHINE_FACES, type MachineKind, type MachineState, type PortMode } from "../app/game/wayworks";
import { WAYWORKS_BLOCKS } from "../app/game/wayworks-integration";
import { MATERIAL_KINDS, MATERIAL_PORT_MODES } from "../app/game/wayworks-stores";
import { configuredWaygridPowerSource } from "../app/game/waygrid-power";

const orbit = locationAddress({ ...homeLocation(universeId("waygrid-power")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const terminals = [BlockId.WaygridVaultTerminal, BlockId.WaygridCreatureArchive];
const crossing = /Waygrid power dependency crosses/;
type Direction = readonly [number, number, number];
const directions: readonly Direction[] = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
const blockFor = (kind: MachineKind) => Number(Object.entries(WAYWORKS_BLOCKS).find(([, value]) => value === kind)![0]) as BlockId;
const offset = (key: string, d: Direction) => key.split(",").map((v, i) => Number(v) + d[i]).join(",");
const opposite = ([x, y, z]: Direction): Direction => [-x, -y, -z];
function port(state: MachineState, d: Direction, mode: PortMode) {
  state.ports[localFaceForWorldDirection(state.facing, ...d)] = mode;
}
function edge(d: Direction) {
  const b = frame.orbitBounds, p = [frame.offset.x, frame.offset.y + 32, frame.offset.z];
  const axis = d.findIndex(v => v !== 0), limits = [[b.minX, b.maxX], [b.minY, b.maxY], [b.minZ, b.maxZ]];
  p[axis] = limits[axis][d[axis] > 0 ? 1 : 0];
  return { inside: p.join(","), outside: offset(p.join(","), d) };
}

// Network-only fixtures intentionally isolate dependency routing from machine
// model bounds. The runtime adapter executes the real prototype method without
// constructing a renderer, world simulation, or terminal operation transaction.
type PowerSelection = { key: string; state: MachineState; joules: number } | null;
type PowerAdapter = {
  wayworks: Map<string, MachineState>;
  world: { locationScope: { locationId: string }; getBlock(x: number, y: number, z: number): BlockId };
};
const selectPower = (VoxelEngine.prototype as unknown as {
  waygridPowerSource(this: PowerAdapter, key: string, joules: number): PowerSelection;
}).waygridPowerSource;
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
  const live = (terminal: string, joules = 1) => selectPower.call({ wayworks: new Map(Object.entries(machines)),
    world: { locationScope: { locationId: frame.orbitId }, getBlock: (x, y, z) => voxel(`${x},${y},${z}`) } }, terminal, joules);
  return { machines, blocks, voxel, put, live, project: () => projectAsteroidMachineNetworks(frame, machines, voxel) };
}

test("both terminals enforce every power port on six boundaries, all facings and either source side, even empty", () => {
  for (const terminal of terminals) for (const d of directions) for (const reverse of [false, true])
    for (const facing of [0, 1, 2, 3]) for (const mode of MATERIAL_PORT_MODES) {
      const f = fixture(), e = edge(d), source = reverse ? e.outside : e.inside, target = reverse ? e.inside : e.outside;
      const toward = reverse ? opposite(d) : d, state = f.put(source, "grid-battery", facing);
      f.blocks.set(target, terminal); port(state, toward, mode);
      const accepted = ["output", "both", "service"].includes(mode), label = `${terminal}/${d}/${reverse}/${facing}/${mode}`;
      assert.equal(state.energyJ, 0);
      assert.equal(configuredWaygridPowerSource(state, BlockId.GridBattery, frame.orbitId, ...toward), accepted, label);
      assert.equal(f.live(target), null, label);
      if (accepted) assert.throws(f.project, crossing, label); else assert.doesNotThrow(f.project, label);
      state.energyJ = 1;
      assert.equal(f.live(target)?.state ?? null, accepted ? state : null, label);
    }
});

test("owner, enablement, revision and every workshop control/signal combination match live eligibility", () => {
  const changes: [string, (s: MachineState) => void, boolean][] = [
    ["other owner", s => { s.ownerId = "other"; }, false],
    ["disabled", s => { s.enabled = false; }, false],
    ["exhausted revision", s => { s.revision = Number.MAX_SAFE_INTEGER; }, false],
    ["last usable revision", s => { s.revision = Number.MAX_SAFE_INTEGER - 1; }, true],
  ];
  for (const control of ["always", "signal-on", "signal-off"] as const) for (const signal of [false, true])
    changes.push([`${control}/${signal}`, s => { s.workshop.control = control; s.workshop.signal = signal; },
      control === "always" || (control === "signal-on" ? signal : !signal)]);
  for (const terminal of terminals) for (const [label, change, eligible] of changes) {
    const f = fixture(), e = edge([1, 0, 0]), state = f.put(e.inside);
    f.blocks.set(e.outside, terminal); port(state, [1, 0, 0], "service"); state.energyJ = 1; change(state);
    assert.equal(configuredWaygridPowerSource(state, BlockId.GridBattery, frame.orbitId, 1, 0, 0), eligible, label);
    assert.equal(f.live(e.outside)?.state ?? null, eligible ? state : null, label);
    if (eligible) assert.throws(f.project, crossing, label); else assert.doesNotThrow(f.project, label);
  }
});

test("absent state/workshop, wrong location and mismatched or missing source voxels cannot supply power", () => {
  for (const exclusion of ["state", "workshop", "location", "wrong-kind", "non-machine", "missing-voxel"] as const) {
    const f = fixture(), state = f.put("0,32,0"); state.energyJ = 1; port(state, [1, 0, 0], "output");
    let source: MachineState | undefined = state, block: BlockId | undefined = BlockId.GridBattery;
    if (exclusion === "state") { source = undefined; delete f.machines["0,32,0"]; }
    if (exclusion === "workshop") delete (state as Partial<MachineState>).workshop;
    if (exclusion === "location") state.locationId = frame.localId;
    if (exclusion === "wrong-kind") block = BlockId.HandDynamo;
    if (exclusion === "non-machine") block = BlockId.Stone;
    if (exclusion === "missing-voxel") block = undefined;
    if (block === undefined) f.blocks.delete("0,32,0"); else f.blocks.set("0,32,0", block);
    assert.equal(configuredWaygridPowerSource(source, block, frame.orbitId, 1, 0, 0), false, exclusion);
    assert.equal(f.live("1,32,0"), null, exclusion);
  }
});

test("non-generator consumers and zero-capacity cables remain dependencies on every channel", () => {
  for (const terminal of terminals) for (const kind of ["powered-crusher", "charging-pedestal", "grid-cable"] as const)
    for (const channel of ["", "teal", "isolated-7"]) {
      const f = fixture(), e = edge([1, 0, 0]), state = f.put(e.inside, kind);
      f.blocks.set(e.outside, terminal); port(state, [1, 0, 0], "service"); state.workshop.channel = channel;
      assert.throws(f.project, crossing, `${terminal}/${kind}/${channel}`);
      if (kind !== "grid-cable") {
        state.energyJ = 1; assert.equal(f.live(e.outside)?.state, state);
      }
    }
});

test("an eligible source on the terminal's own side never excuses another crossing dependency", () => {
  for (const terminal of terminals) for (const reverse of [false, true]) {
    const f = fixture(), e = edge([1, 0, 0]), target = reverse ? e.inside : e.outside;
    const crossingSource = f.put(reverse ? e.outside : e.inside);
    port(crossingSource, reverse ? [-1, 0, 0] : [1, 0, 0], "output");
    const sameSideKey = offset(target, [0, 0, -1]), sameSide = f.put(sameSideKey);
    port(sameSide, [0, 0, 1], "output"); sameSide.energyJ = 1; f.blocks.set(target, terminal);
    assert.equal(f.live(target)?.key, sameSideKey); assert.throws(f.project, crossing);
    crossingSource.enabled = false; assert.doesNotThrow(f.project);
  }
});

test("capacity cells do not create terminal power coupling across any boundary", () => {
  for (const cell of [BlockId.WaygridCellI, BlockId.WaygridCellII, BlockId.WaygridCellIII])
    for (const d of directions) for (const reverse of [false, true]) {
      const f = fixture(), e = edge(d), state = f.put(reverse ? e.outside : e.inside);
      port(state, reverse ? opposite(d) : d, "output"); f.blocks.set(reverse ? e.inside : e.outside, cell);
      assert.doesNotThrow(f.project);
    }
});

test("capture rejects newly enabled dependencies from machine edits or terminal voxel after-images", () => {
  for (const terminal of terminals) for (const change of ["port", "enabled", "signal", "terminal"] as const) {
    const f = fixture(), e = edge([1, 0, 0]), state = f.put(e.inside);
    f.blocks.set(e.outside, change === "terminal" ? BlockId.Air : terminal);
    port(state, [1, 0, 0], change === "port" ? "disabled" : "output");
    if (change === "enabled") state.enabled = false;
    if (change === "signal") { state.workshop.control = "signal-on"; state.workshop.signal = false; }
    const baseline = f.project(), edited = structuredClone(baseline), next = Object.values(edited)[0];
    if (change === "port") port(next, [1, 0, 0], "output");
    if (change === "enabled") next.enabled = true;
    if (change === "signal") next.workshop.signal = true;
    const before = structuredClone(f.machines);
    assert.throws(() => captureAsteroidMachineNetworks(frame, f.machines, baseline, edited, {
      before: f.voxel, after: key => change === "terminal" && key === e.outside ? terminal : f.voxel(key),
    }), crossing, `${terminal}/${change}`);
    assert.deepEqual(f.machines, before);
  }
});

test("actual engine selector keeps positive safe joules, sufficient energy and the six-source priority", () => {
  const f = fixture(), target = "0,32,0";
  // Insert in reverse priority so Map iteration cannot accidentally pass.
  for (const d of [...directions].reverse()) {
    const state = f.put(offset(target, d)); state.energyJ = 2; port(state, opposite(d), "output");
  }
  for (const joules of [0, -1, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(f.live(target, joules), null);
  for (const key of ["NaN,32,0", "0.5,32,0", `${Number.MAX_SAFE_INTEGER + 1},32,0`]) assert.equal(f.live(key), null);
  assert.equal(f.live(target, 3), null);
  const before = structuredClone(f.machines);
  assert.deepEqual(f.live(target, 2), { key: "0,32,-1", state: f.machines["0,32,-1"], joules: 2 });
  assert.deepEqual(f.machines, before); // Selecting does not itself debit energy.
  for (const d of directions) {
    const key = offset(target, d); assert.equal(f.live(target, 2)?.key, key);
    f.machines[key].energyJ = 1;
  }
  assert.equal(f.live(target, 2), null);
});

test("ineligible live sources do not trigger lazy world/chunk queries", () => {
  for (const fault of ["disabled", "owner", "location", "revision", "signal", "empty"] as const) {
    const state = createMachine("grid-battery", frame.orbitId, "local", 0); state.energyJ = 1;
    if (fault === "disabled") state.enabled = false;
    if (fault === "owner") state.ownerId = "other";
    if (fault === "location") state.locationId = frame.localId;
    if (fault === "revision") state.revision = Number.MAX_SAFE_INTEGER;
    if (fault === "signal") state.workshop.control = "signal-on";
    if (fault === "empty") state.energyJ = 0;
    assert.equal(selectPower.call({ wayworks: new Map([["0,32,-1", state]]), world: {
      locationScope: { locationId: frame.orbitId }, getBlock() { throw Error("Unexpected chunk query"); },
    } }, "0,32,0", 1), null, fault);
  }
});
