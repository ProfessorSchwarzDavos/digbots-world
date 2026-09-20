import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { BlockId } from "../app/game/data";
import { CONNECTION_DIRECTIONS, transportConnections, windowLayout } from "../app/game/connected-geometry";
import { createMachine, localFaceForWorldDirection, type MachineKind, type MachineState } from "../app/game/wayworks";
import { WAYWORKS_BLOCKS } from "../app/game/wayworks-integration";
import { createPressureModel, updatePressureModel } from "../app/game/pressure-models";
import { createWayworksModel, updateWayworksModel } from "../app/game/wayworks-models";
import { VoxelEngine } from "../app/game/engine";

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
function fixture() {
  const blocks = new Map<string, BlockId>(), machines = new Map<string, MachineState>();
  const read = (x: number, y: number, z: number) => blocks.get(key(x, y, z)) ?? BlockId.Air;
  const machineAt = (x: number, y: number, z: number) => machines.get(key(x, y, z));
  const put = (x: number, y: number, z: number, kind: MachineKind, facing = 0) => {
    const state = createMachine(kind, "test", "local", facing);
    const block = Number(Object.entries(WAYWORKS_BLOCKS).find(([, value]) => value === kind)![0]) as BlockId;
    blocks.set(key(x, y, z), block); machines.set(key(x, y, z), state); return state;
  };
  return { blocks, machines, read, machineAt, put, layout: (facing = 0) => windowLayout(0, 0, 0, facing, read) };
}
const W = BlockId.ReinforcedWindow, H = BlockId.StationHull;

test("ceiling sheets and isolated skylights lie flat; both wall axes remain upright", () => {
  const f = fixture(); f.blocks.set("0,0,0", W);
  for (const [x, z] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) f.blocks.set(key(x, 0, z), W);
  assert.equal(f.layout().flat, true);
  f.blocks.set("0,-1,0", W); assert.equal(f.layout().flat, true, "roof dominates a single wall junction below");
  for (const [x, z] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) f.blocks.set(key(x, 0, z), H);
  f.blocks.delete("0,-1,0"); assert.equal(f.layout().flat, true, "one window within a solid roof");
  for (const axis of ["x", "z"]) {
    f.blocks.clear(); f.blocks.set("0,1,0", H); f.blocks.set("0,-1,0", H);
    for (const sign of [-1, 1]) f.blocks.set(axis === "x" ? `${sign},0,0` : `0,0,${sign}`, W);
    const layout = f.layout(); assert.equal(layout.flat, false);
    assert.equal(layout.arms.left, axis === "x"); assert.equal(layout.arms.front, axis === "z");
  }
});

test("wall corners/tees join half panes deterministically and isolated facing is stable", () => {
  const f = fixture(); f.blocks.set("0,1,0", H); f.blocks.set("0,-1,0", H);
  f.blocks.set("-1,0,0", W); f.blocks.set("0,0,-1", W);
  const corner = f.layout(); assert.equal(corner.flat, false);
  assert.deepEqual(corner.arms, { left: true, right: false, front: true, back: false });
  f.blocks.delete("0,1,0"); assert.equal(f.layout().flat, false, "a low wall corner supported by a floor stays upright");
  f.blocks.set("0,1,0", H);
  for (let i = 0; i < 50; i++) assert.deepEqual(f.layout(), corner, "no prior frame/neighbor cache influences inference");
  f.blocks.set("1,0,0", W); assert.equal(f.layout().arms.right, true);
  f.blocks.clear(); assert.equal(f.layout(0).arms.left, true); assert.equal(f.layout(1).arms.front, true);
  assert.deepEqual(f.layout(0), windowLayout(0, 0, 0, 0, () => undefined), "unloaded neighbors are not invented supports");
});

test("window renderer switches planes around cell center, hides shared borders, and reuses geometry", () => {
  const f = fixture(); for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) f.blocks.set(key(x, 0, z), W);
  const model = createPressureModel("reinforced-window"), objects: THREE.Object3D[] = [];
  model.traverse(o => objects.push(o)); updatePressureModel(model, { windowLayout: f.layout() });
  const flat = model.getObjectByName("flat-ceiling-pane")!;
  const glass = model.getObjectByName("thick-laminated-glass") as THREE.Mesh;
  assert.equal(glass.geometry.type, "PlaneGeometry", "no internal transparent box faces leave ghost seams");
  assert.equal((glass.material as THREE.Material).side, THREE.DoubleSide);
  assert.equal(flat.visible, true); assert.equal(flat.position.y, .5);
  assert.equal(model.getObjectByName("window-arm-left")!.visible, false);
  assert.equal(model.getObjectByName("ceiling-border-left")!.visible, false);
  f.blocks.delete("-1,0,0"); updatePressureModel(model, { windowLayout: f.layout() });
  assert.equal(model.getObjectByName("ceiling-border-left")!.visible, true);
  f.blocks.clear(); f.blocks.set("0,1,0", H); f.blocks.set("0,-1,0", H); f.blocks.set("-1,0,0", W); f.blocks.set("0,0,-1", W);
  updatePressureModel(model, { windowLayout: f.layout() }); assert.equal(flat.visible, false);
  assert.equal(model.getObjectByName("window-corner-mullion")!.visible, true);
  assert.equal(model.getObjectByName("window-arm-front")!.visible, true);
  const after: THREE.Object3D[] = []; model.traverse(o => after.push(o)); assert.deepEqual(after, objects);
});

test("vertical window joins respect the neighbor's saved isolated orientation", () => {
  const f = fixture(); f.blocks.set("0,0,0", W); f.blocks.set("0,1,0", W);
  const layout = windowLayout(0, 0, 0, 0, f.read, (_x, y) => y === 1 ? 1 : 0);
  assert.equal(layout.arms.left, true); assert.equal(layout.upper.left, false); assert.equal(layout.upper.front, true);
});

test("off-center machine adapters meet exact authored sockets and disappear on disconnect", () => {
  const model = createPressureModel("liquid-pipe");
  updatePressureModel(model, { connected: { left: true }, connectionTargets: { left: [-.552, .18, .025] } });
  const arm = model.getObjectByName("socket-adapter-left")!; assert.equal(arm.visible, true); model.updateMatrixWorld(true);
  const last = arm.getObjectByName("socket-adapter-segment-2")!;
  const end = last.localToWorld(new THREE.Vector3(0, .5, 0));
  assert.ok(end.distanceTo(new THREE.Vector3(-.552, .18, .025)) < 1e-8);
  updatePressureModel(model, { connected: { left: false } }); assert.equal(arm.visible, false);
  updatePressureModel(model, { connected: { left: true }, connectionTargets: {} }); assert.equal(arm.visible, false);
  updatePressureModel(model, { connected: { left: true }, connectionTargets: { left: [99, 0, 0] } }); assert.equal(arm.visible, false);
});

for (const kind of ["liquid-pipe", "gasline", "heat-conduit", "grid-cable"] as const) {
  test(`${kind} masks all six world directions under every cardinal rotation without store mutation`, () => {
    const f = fixture(), center = f.put(0, 0, 0, kind);
    const resource = kind === "liquid-pipe" ? "fluid" : kind === "gasline" ? "chemical" : "heat";
    for (const state of [center, ...CONNECTION_DIRECTIONS.map(([, x, y, z]) => f.put(x, y, z, kind))]) {
      for (const [face] of CONNECTION_DIRECTIONS) state.workshop.resourcePorts[resource][face] = "both";
      if (state.workshop.process) state.workshop.process.backflow = true;
    }
    for (let facing = 0; facing < 4; facing++) {
      center.facing = facing;
      const before = structuredClone([...f.machines]);
      const mask = transportConnections(center, 0, 0, 0, "test", f.read, f.machineAt);
      assert(Object.values(mask).every(Boolean)); assert.deepEqual([...f.machines], before);
      for (const [, x, y, z] of CONNECTION_DIRECTIONS) {
        const neighbor = f.machineAt(x, y, z)!; neighbor.enabled = false;
        const missing = transportConnections(center, 0, 0, 0, "test", f.read, f.machineAt);
        assert.equal(missing[localFaceForWorldDirection(facing, x, y, z)], false);
        assert.equal(Object.values(missing).filter(Boolean).length, 5); neighbor.enabled = true;
      }
    }
  });
}

test("physical joints reject incompatible directions, service, stale blocks, identity and unloaded boundaries", () => {
  const f = fixture(), pipe = f.put(0, 0, 0, "liquid-pipe"), other = f.put(0, 0, -1, "liquid-pipe");
  const connected = (read: (x: number, y: number, z: number) => BlockId | undefined = f.read) => transportConnections(pipe, 0, 0, 0, "test", read, f.machineAt).front;
  assert.equal(connected(), true); // front output -> neighbor back input
  other.workshop.resourcePorts.fluid.back = "output"; assert.equal(connected(), false);
  other.workshop.resourcePorts.fluid.back = "service"; assert.equal(connected(), false);
  other.workshop.resourcePorts.fluid.back = "both"; assert.equal(connected(), true, "backflow-off both is input");
  pipe.workshop.resourcePorts.fluid.front = "both"; assert.equal(connected(), false, "both become input with backflow disabled");
  pipe.workshop.process!.backflow = true; assert.equal(connected(), true);
  for (const field of ["locationId", "ownerId"] as const) { const old = other[field]; other[field] = "foreign"; assert.equal(connected(), false); other[field] = old; }
  other.workshop.channel = "foreign"; assert.equal(connected(), false); other.workshop.channel = "";
  assert.equal(connected((x, y, z) => z === -1 ? undefined : f.read(x, y, z)), false);
  f.blocks.set("0,0,-1", BlockId.Gasline); assert.equal(connected(), false);
  f.put(0, 0, -1, "gasline"); assert.equal(connected(), false, "wrong resource has no fluid reservoir");
  f.put(0, 0, -1, "fluid-tank"); assert.equal(connected(), true);
});

test("pipe and cable models close removed branches without replacing meshes", () => {
  for (const kind of ["liquid-pipe", "gasline", "heat-conduit", "grid-cable"] as const) {
    const cable = kind === "grid-cable", model = cable ? createWayworksModel(kind) : createPressureModel(kind);
    const update = cable ? updateWayworksModel : updatePressureModel;
    const mask = Object.fromEntries(CONNECTION_DIRECTIONS.map(([face]) => [face, true])); update(model, { connected: mask });
    for (const [face] of CONNECTION_DIRECTIONS) {
      assert.equal(model.getObjectByName(`connected-${face}`)!.visible, true);
      mask[face] = false; update(model, { connected: mask });
      assert.equal(model.getObjectByName(`connected-${face}`)!.visible, false);
      assert.equal(model.getObjectByName(`port-${face}`)!.visible, false);
    }
  }
});

test("actual engine render reflects add/remove, port edits, cold derivation and cross-chunk neighbors", () => {
  const f = fixture(), cable = f.put(15, 0, 0, "grid-cable"), neighbor = f.put(16, 0, 0, "grid-cable");
  for (let x = 1; x <= 3; x++) for (let z = 1; z <= 3; z++) f.blocks.set(key(x, 1, z), W);
  const models = new Map<string, THREE.Group>();
  const engine = Object.assign(Object.create(VoxelEngine.prototype), { world: { getBlock: f.read, getBlockFacing: () => 0, locationScope: { locationId: "test" } },
    wayworks: f.machines, wayworksModels: models, pressureStructures: new Set(["2,1,2"]), scene: new THREE.Scene(),
    position: new THREE.Vector3(), settings: { simulationDistance: 2 }, selectedSlot: () => null, pressureRuntime: null,
    guestPressure: null, wayworksOverlayResource: "energy", paused: true });
  const before = structuredClone([...f.machines]); engine.renderWayworks();
  assert.equal(models.get("15,0,0")!.getObjectByName("connected-right")!.visible, true);
  assert.equal(models.get("structure:2,1,2")!.getObjectByName("flat-ceiling-pane")!.visible, true);
  neighbor.ports.left = "disabled"; engine.renderWayworks(); assert.equal(models.get("15,0,0")!.getObjectByName("connected-right")!.visible, false);
  neighbor.ports.left = "both"; engine.renderWayworks(); assert.equal(models.get("15,0,0")!.getObjectByName("connected-right")!.visible, true);
  f.blocks.delete("16,0,0"); engine.renderWayworks(); assert.equal(models.has("16,0,0"), false);
  assert.equal(models.get("15,0,0")!.getObjectByName("connected-right")!.visible, false);
  engine.clearWayworksModels(); engine.renderWayworks();
  assert.equal(models.get("structure:2,1,2")!.getObjectByName("flat-ceiling-pane")!.visible, true);
  assert.deepEqual([...f.machines], before); assert.equal(cable.energyJ, 0);
  f.put(16, 0, 0, "field-battery"); engine.renderWayworks();
  const adapter = models.get("15,0,0")!.getObjectByName("socket-adapter-right")!;
  assert.equal(adapter.visible, true);
  const last = adapter.getObjectByName("socket-adapter-segment-2")!;
  const target = models.get("16,0,0")!.getObjectByName("port-left")!;
  engine.scene.updateMatrixWorld(true);
  assert.ok(last.localToWorld(new THREE.Vector3(0, .5, 0)).distanceTo(target.getWorldPosition(new THREE.Vector3())) < 1e-8);
  engine.clearWayworksModels();
});
