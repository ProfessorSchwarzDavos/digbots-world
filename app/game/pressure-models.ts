import * as THREE from "three";
import type { WindowArm, WindowLayout } from "./connected-geometry";
import { createTransportConnectors, updateTransportConnectors, type TransportTargets } from "./transport-model-connectors";

export const PRESSURE_MODEL_KINDS = [
  "liquid-pipe", "gasline", "heat-conduit", "atmospheric-condenser", "electrolyzer",
  "gas-compressor", "fluid-refinery", "chemical-mixer", "reaction-chamber", "carbon-scrubber",
  "life-support-controller", "thermal-regulator", "hydrogen-turbine", "methane-reformer", "gas-engine",
  "pressure-door", "horizon-door", "hangar-pressure-gate", "airlock-controller", "atmosphere-vent",
  "equalization-vent", "recovery-pump", "pressure-sensor", "emergency-shutter", "reinforced-window", "hangar-frame",
] as const;
export type PressureModelKind = typeof PRESSURE_MODEL_KINDS[number];
export type PressureModelFace = "front" | "back" | "left" | "right" | "top" | "bottom";
export type PressureModelState = Readonly<{
  fill?: number; fluidFill?: number; progress?: number; active?: boolean; time?: number;
  open?: number; alarm?: boolean; locked?: boolean;
  connected?: Readonly<Partial<Record<PressureModelFace, boolean>>>;
  windowLayout?: WindowLayout;
  connectionTargets?: TransportTargets;
  gateWidth?: number; gateHeight?: number;
}>;
export const isPressureModelKind = (kind: unknown): kind is PressureModelKind =>
  typeof kind === "string" && (PRESSURE_MODEL_KINDS as readonly string[]).includes(kind);

type Motion = { object: THREE.Object3D; axis: "x" | "y" | "z"; base: number; speed: number; stroke?: number };
type Rig = {
  fill: number; fluidFill?: number; progress: number; active: boolean; open: number; alarm: boolean; locked: boolean;
  lamp: THREE.MeshStandardMaterial; motions: Motion[]; flow: THREE.Group[];
  gauges: { object: THREE.Group; source: "fill" | "fluid" | "progress" }[];
  columns: { object: THREE.Mesh; base: number; height: number }[];
  panels: { object: THREE.Group; side: number; base: number; travel: number }[];
  dropPanels: { object: THREE.Group; closedY: number; packedY: number; height: number }[];
  latches: THREE.Group[]; flags: THREE.Group[];
  connections: Partial<Record<PressureModelFace, THREE.Object3D[]>>;
  window?: { flat: THREE.Group; borders: Record<WindowArm, THREE.Object3D>; mullion: THREE.Object3D;
    arms: Record<WindowArm, { group: THREE.Group; end: THREE.Object3D; top: THREE.Object3D; bottom: THREE.Object3D }> };
  gate?: { width: number; height: number; posts: THREE.Mesh[]; header: THREE.Mesh; sill: THREE.Mesh; shutters: THREE.Group[]; locks: THREE.Group[] };
};
const rigs = new WeakMap<THREE.Group, Rig>();
const TAU = Math.PI * 2;
const unit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const gateSize = (value: number) => Number.isFinite(value) ? Math.max(3, Math.min(9, Math.round(value))) : 3;
const faces: readonly PressureModelFace[] = ["front", "back", "left", "right", "top", "bottom"];

/** Authored pressure hardware, floor/center origin, front -Z. Every GPU resource
 * belongs to this instance; dispose unique traversed geometries/materials on eviction.
 * State is visual telemetry only. Door opening never guesses simulation safety. */
export function createPressureModel(kind: PressureModelKind, state: PressureModelState = {}): THREE.Group {
  if (!isPressureModelKind(kind)) throw new Error(`Unknown pressure model: ${String(kind)}`);
  const root = new THREE.Group();
  root.name = `pressure-${kind}`;
  root.userData.pressureKind = kind;
  const colors = { iron: 0x839597, brass: 0xd4b477, copper: 0xbd8059, ceramic: 0xd1c9af, dark: 0x34474a, water: 0x6aaeb8, filter: 0x8a9877, lamp: 0x8cceb2, glass: 0xb4d2d4 };
  type Surface = keyof typeof colors;
  const surfaces = new Map<Surface, THREE.MeshStandardMaterial>();
  const material = (key: Surface) => {
    let result = surfaces.get(key);
    if (!result) {
      result = new THREE.MeshStandardMaterial({ color: colors[key], roughness: key === "glass" ? .28 : .6,
        metalness: key === "glass" || key === "ceramic" ? .02 : .1,
        emissive: colors[key], emissiveIntensity: .08,
        transparent: key === "glass", opacity: key === "glass" ? .32 : 1, depthWrite: key !== "glass",
        side: key === "glass" && kind === "reinforced-window" ? THREE.DoubleSide : THREE.FrontSide });
      surfaces.set(key, result);
    }
    return result;
  };
  const rig: Rig = { fill: 0, progress: 0, active: false, open: 0, alarm: false, locked: false,
    lamp: material("lamp"), motions: [], flow: [], gauges: [], columns: [], panels: [], dropPanels: [], latches: [], flags: [], connections: {} };
  rigs.set(root, rig);
  const group = (parent: THREE.Object3D, name: string, x = 0, y = 0, z = 0) => {
    const object = new THREE.Group(); object.name = name; object.position.set(x, y, z); parent.add(object); return object;
  };
  const mesh = (parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, surface: Surface, x: number, y: number, z: number) => {
    const object = new THREE.Mesh(geometry, material(surface)); object.name = name; object.position.set(x, y, z);
    object.castShadow = surface !== "glass"; object.receiveShadow = surface !== "glass"; parent.add(object); return object;
  };
  const box = (parent: THREE.Object3D, name: string, w: number, h: number, d: number, surface: Surface, x = 0, y = 0, z = 0) =>
    mesh(parent, name, new THREE.BoxGeometry(w, h, d), surface, x, y, z);
  const cylinder = (parent: THREE.Object3D, name: string, radius: number, height: number, surface: Surface, x = 0, y = 0, z = 0, top = radius) =>
    mesh(parent, name, new THREE.CylinderGeometry(top, radius, height, 12), surface, x, y, z);
  const ring = (parent: THREE.Object3D, name: string, radius: number, tube: number, surface: Surface, x = 0, y = 0, z = 0) =>
    mesh(parent, name, new THREE.TorusGeometry(radius, tube, 6, 16), surface, x, y, z);
  const horizontal = (parent: THREE.Object3D, name: string, radius: number, length: number, surface: Surface, x = 0, y = 0, z = 0) => {
    const object = cylinder(parent, name, radius, length, surface, x, y, z); object.rotation.x = Math.PI / 2; return object;
  };
  const rotate = (object: THREE.Object3D, axis: Motion["axis"], speed: number) =>
    rig.motions.push({ object, axis, speed, base: object.rotation[axis] });
  const piston = (name: string, x: number, y: number, z: number, stroke = .045) => {
    const object = group(root, name, x, y, z);
    cylinder(object, "polished-piston-rod", .022, .22, "brass");
    box(object, "piston-crosshead", .15, .045, .085, "iron", 0, -.095, 0);
    rig.motions.push({ object, axis: "y", speed: 5, base: y, stroke }); return object;
  };
  const wheel = (parent: THREE.Object3D, name: string, radius: number, x: number, y: number, z: number) => {
    const object = group(parent, name, x, y, z); ring(object, "wheel-rim", radius, .015, "brass");
    for (let i = 0; i < 3; i++) box(object, "wheel-spoke", .018, radius * 1.9, .018, "iron").rotation.z = i * Math.PI / 3;
    horizontal(object, "wheel-hub", .025, .045, "copper"); return object;
  };
  const gauge = (name: string, x: number, y: number, z: number, source: "fill" | "fluid" | "progress" = "fluid", parent: THREE.Object3D = root) => {
    const dial = group(parent, name, x, y, z);
    ring(dial, "gauge-bezel", .078, .012, "brass"); horizontal(dial, "gauge-face", .071, .014, "ceramic");
    for (let i = 0; i < 5; i++) {
      const a = -.7 * Math.PI + i * .35 * Math.PI;
      box(dial, "gauge-tick", .006, .012, .006, "dark", Math.sin(a) * .054, Math.cos(a) * .054, -.011).rotation.z = -a;
    }
    const needle = group(dial, `${name}-needle`, 0, 0, -.025);
    box(needle, "needle-tip", .008, .06, .008, "dark", 0, .021, 0); rig.gauges.push({ object: needle, source });
  };
  const status = (x: number, y: number, z: number) => {
    box(root, "status-lamp-cage", .12, .065, .035, "dark", x, y, z);
    box(root, "status-lamp", .06, .023, .014, "lamp", x, y, z - .025);
    const flag = group(root, "mechanical-alarm-flag", x, y + .07, z);
    box(flag, "raised-warning-tab", .07, .04, .018, "copper");
    box(flag, "warning-notch", .012, .025, .022, "dark"); rig.flags.push(flag);
  };
  const socket = (face: PressureModelFace, x: number, y: number, z: number) => {
    const port = group(root, `port-${face}`, x, y, z); port.userData.wayworksFace = face;
    if (face === "back") port.rotation.y = Math.PI;
    if (face === "left") port.rotation.y = Math.PI / 2;
    if (face === "right") port.rotation.y = -Math.PI / 2;
    if (face === "top") port.rotation.x = Math.PI / 2;
    if (face === "bottom") port.rotation.x = -Math.PI / 2;
    ring(port, "pipe-union-rim", .058, .013, "brass");
    horizontal(port, "pipe-union-throat", .045, .02, "dark");
    box(port, "union-index-notch", .018, .021, .014, "ceramic", 0, .06, 0);
    return port;
  };
  const sockets = (height = 1) => {
    socket("front", 0, .12, -.446); socket("back", 0, .12, .446);
    socket("left", -.446, .12, 0); socket("right", .446, .12, 0);
    socket("top", .31, height - .035, .24); socket("bottom", 0, .025, 0);
  };
  const base = () => {
    box(root, "iron-skid", .85, .095, .82, "iron", 0, .095, 0);
    for (const x of [-.33, .33]) for (const z of [-.3, .3]) box(root, "skid-foot", .13, .05, .13, "dark", x, .025, z);
    box(root, "lower-copper-manifold", .68, .045, .07, "copper", 0, .16, -.29); sockets();
    cylinder(root, "rear-service-riser", .03, .79, "copper", .31, .55, .24);
    box(root, "service-riser-top-bracket", .12, .032, .1, "iron", .31, .93, .24);
  };
  const vessel = (name: string, x: number, y: number, z: number, radius: number, height: number, surface: Surface = "iron") => {
    cylinder(root, name, radius, height, surface, x, y, z);
    for (const dy of [-height / 2 + .025, height / 2 - .025]) cylinder(root, `${name}-band`, radius + .012, .038, "brass", x, y + dy, z);
    cylinder(root, `${name}-shoulder`, radius, .06, surface, x, y + height / 2 + .025, z, radius * .55);
  };
  const sight = (name: string, x: number, y: number, z: number, height = .3) => {
    box(root, `${name}-recess`, .084, height + .04, .03, "dark", x, y + height / 2, z);
    const object = box(root, name, .045, height, .018, "water", x, y + height / 2, z - .02);
    rig.columns.push({ object, base: y, height });
    for (const dx of [-.049, .049]) box(root, `${name}-guard`, .012, height + .065, .04, "brass", x + dx, y + height / 2, z - .013);
  };
  const radiator = (name: string, x: number, y: number, z: number, width = .3, height = .45) => {
    for (const dx of [-width * .38, width * .38]) cylinder(root, `${name}-header`, .025, height, "copper", x + dx, y, z);
    for (let i = 0; i < 7; i++) box(root, `${name}-fin`, width, .02, .22, "iron", x, y - height / 2 + .035 + i * (height - .07) / 6, z);
  };
  const fan = (name: string, x: number, y: number, z: number, radius = .18) => {
    ring(root, `${name}-guard`, radius + .025, .023, "iron", x, y, z);
    const rotor = group(root, name, x, y, z);
    for (let i = 0; i < 5; i++) {
      const blade = group(rotor, "fan-blade-mount"); blade.rotation.z = i * TAU / 5;
      box(blade, "pitched-fan-blade", radius * .55, radius * .65, .025, "brass", radius * .2, radius * .48, 0).rotation.y = .3;
    }
    horizontal(rotor, "fan-hub", .043, .055, "copper"); rotate(rotor, "z", 4); return rotor;
  };

  if (kind === "liquid-pipe" || kind === "gasline" || kind === "heat-conduit") {
    const surface: Surface = kind === "heat-conduit" ? "copper" : kind === "gasline" ? "brass" : "iron";
    box(root, "six-way-union", .23, .23, .23, surface, 0, .5, 0);
    for (const face of faces) {
      const arm = group(root, `connected-${face}`, 0, .5, 0);
      if (face === "back") arm.rotation.y = Math.PI;
      if (face === "left") arm.rotation.y = Math.PI / 2;
      if (face === "right") arm.rotation.y = -Math.PI / 2;
      if (face === "top") arm.rotation.x = Math.PI / 2;
      if (face === "bottom") arm.rotation.x = -Math.PI / 2;
      horizontal(arm, "pressure-line-tube", .062, .4, surface, 0, 0, -.3);
      for (const z of [-.18, -.35]) ring(arm, kind === "heat-conduit" ? "ceramic-thermal-break" : "compression-collar", .071, .016, kind === "heat-conduit" ? "ceramic" : "brass", 0, 0, z);
      if (kind === "gasline") box(arm, "gas-direction-chevron", .034, .012, .085, "ceramic", 0, .071, -.27);
      if (kind === "liquid-pipe") box(arm, "liquid-inspection-strip", .04, .013, .1, "water", 0, .071, -.26);
      const vector = new THREE.Vector3(0, 0, -.485).applyEuler(arm.rotation);
      const port = socket(face, vector.x, .5 + vector.y, vector.z); rig.connections[face] = [arm, port];
      arm.visible = port.visible = face === "front" || face === "back";
    }
    // Disconnected directions close at the central casting, never invent a link.
    for (const y of [.37, .63]) cylinder(root, "junction-bolt", .025, .028, "dark", 0, y, 0);
    status(.04, .49, -.13);
    createTransportConnectors(root, material(surface), .058);
  } else if (kind === "pressure-door" || kind === "horizon-door" || kind === "emergency-shutter") {
    const horizon = kind === "horizon-door";
    for (const x of [-.44, .44]) {
      box(root, "door-pocket-frame", .12, 2, .34, horizon ? "ceramic" : "iron", x, 1, 0);
      box(root, "door-guide-rail", .025, 1.78, .04, "brass", x * .91, .99, -.2);
    }
    box(root, "door-header", .88, .13, .38, "iron", 0, 1.935, 0);
    box(root, "door-threshold", .88, .045, .35, "brass", 0, .0225, 0);
    const rows = horizon ? 2 : kind === "emergency-shutter" ? 6 : 1;
    const h = 1.79 / rows;
    for (const side of [-1, 1]) for (let row = 0; row < rows; row++) {
      const panel = group(root, `door-leaf-${side}-${row}`, side * .19, .055 + h * (row + .5), 0);
      box(panel, "fitted-sealing-leaf", .379, h - .008, .16, horizon ? "ceramic" : "iron");
      box(panel, "mechanical-center-seam", .022, h - .02, .18, "dark", -side * .178, 0, 0);
      box(panel, "leaf-brass-edge", .035, h - .055, .018, "brass", side * .14, 0, -.091);
      if (kind !== "emergency-shutter") {
        box(panel, "reinforced-vision-surround", .14, Math.min(.43, h * .48), .035, "dark", side * .025, h * .13, -.098);
        box(panel, "narrow-reinforced-vision-glass", .105, Math.min(.36, h * .39), .04, "glass", side * .025, h * .13, -.123);
      } else box(panel, "shutter-horizontal-stiffener", .32, .045, .04, "brass", 0, 0, -.11);
      if (kind === "emergency-shutter") rig.dropPanels.push({ object: panel, closedY: panel.position.y, packedY: 1.87 + row * .014, height: h });
      else rig.panels.push({ object: panel, side, base: .19, travel: .25 });
    }
    for (const side of [-1, 1]) {
      const latch = group(root, "door-locking-dog", side * .43, .83, -.21);
      box(latch, "physical-lock-bolt", .16, .045, .045, "brass", -side * .04, 0, 0); rig.latches.push(latch);
    }
    if (kind === "emergency-shutter") {
      wheel(root, "shutter-manual-crank", .08, -.4, 1.59, -.23);
      box(root, "failsafe-charge-cassette", .2, .07, .14, "ceramic", 0, 1.92, -.19);
    } else horizontal(root, "door-actuator-cylinder", .035, .28, "copper", .43, 1.6, 0);
    status(.31, 1.84, -.225); sockets(2);
    root.getObjectByName("port-front")!.position.set(-.42, .12, -.22);
    root.getObjectByName("port-back")!.position.set(-.42, .12, .22);
  } else if (kind === "hangar-pressure-gate") {
    const posts = [-1, 1].map((side) => box(root, `hangar-jamb-${side}`, .18, 1, .42, "iron", side, .5, 0));
    const header = box(root, "hangar-winding-header", 1, .24, .47, "iron");
    const sill = box(root, "hangar-threshold", 1, .045, .43, "brass");
    const shutters: THREE.Group[] = [];
    for (let i = 0; i < 12; i++) {
      const panel = group(root, `hangar-shutter-${i}`);
      box(panel, "segmented-iron-shutter", 1, 1, .15, "iron");
      box(panel, "shutter-sealing-lip", .985, .11, .025, "dark", 0, -.44, -.087);
      box(panel, "shutter-center-reinforcement", .018, .86, .03, "brass", 0, 0, -.09);
      shutters.push(panel);
    }
    const locks = [-1, 1].map((side) => {
      const lock = group(root, `redundant-gate-lock-${side}`);
      box(lock, "gate-lock-pawl", .19, .09, .065, "brass", -side * .04, 0, 0); rig.latches.push(lock); return lock;
    });
    rig.gate = { width: 3, height: 3, posts, header, sill, shutters, locks };
    status(0, .15, -.3); sockets();
  } else if (kind === "reinforced-window") {
    const flat = group(root, "flat-ceiling-pane", 0, .5, 0); flat.visible = false;
    // One two-sided surface avoids duplicate transparent side faces at every
    // connected cell/half-pane. The surrounding frame supplies visible depth.
    mesh(flat, "thick-laminated-glass", new THREE.PlaneGeometry(1, 1), "glass", 0, 0, 0).rotation.x = -Math.PI / 2;
    const borders = {} as Record<WindowArm, THREE.Object3D>;
    const arms = {} as NonNullable<Rig["window"]>["arms"];
    for (const face of ["left", "right", "front", "back"] as const) {
      const xEdge = face === "left" || face === "right";
      borders[face] = box(flat, `ceiling-border-${face}`, xEdge ? .1 : 1, .2, xEdge ? 1 : .1, "iron",
        face === "left" ? -.45 : face === "right" ? .45 : 0, 0, face === "front" ? -.45 : face === "back" ? .45 : 0);
      const arm = group(root, `window-arm-${face}`, 0, .5, 0);
      arm.rotation.y = face === "left" ? Math.PI : face === "front" ? Math.PI / 2 : face === "back" ? -Math.PI / 2 : 0;
      arm.visible = xEdge;
      mesh(arm, "wall-laminated-glass", new THREE.PlaneGeometry(.5, 1), "glass", .25, 0, 0);
      const end = box(arm, `connected-border-${face}`, .1, 1, .2, "iron", .45, 0, 0);
      const top = box(arm, "wall-border-top", .5, .1, .2, "iron", .25, .45, 0);
      const bottom = box(arm, "wall-border-bottom", .5, .1, .2, "iron", .25, -.45, 0);
      for (const dy of [-.45, .45]) horizontal(end, "frame-through-bolt", .025, .23, "brass", 0, dy, 0);
      arms[face] = { group: arm, end, top, bottom }; rig.connections[face] = [end];
    }
    rig.connections.top = Object.values(arms).map(arm => arm.top);
    rig.connections.bottom = Object.values(arms).map(arm => arm.bottom);
    const mullion = box(root, "window-corner-mullion", .1, 1, .1, "iron", 0, .5, 0); mullion.visible = false;
    // Keep the authored lamp material reachable by ordinary GPU disposal.
    box(mullion, "window-rating-stud", .026, .026, .026, "lamp", 0, 0, -.056);
    rig.window = { flat, borders, arms, mullion };
  } else if (kind === "hangar-frame") {
    box(root, "hangar-frame-web", .48, 1, .28, "iron", 0, .5, 0);
    for (const y of [.2, .5, .8]) box(root, "hangar-gusset-rib", .64, .045, .38, "brass", 0, y, 0);
    for (const face of ["left", "right", "top", "bottom"] as const) {
      const vertical = face === "left" || face === "right";
      box(root, `connected-border-${face}`, vertical ? .1 : 1, vertical ? 1 : .1, .25, "iron",
        vertical ? (face === "left" ? -.45 : .45) : 0, vertical ? .5 : face === "top" ? .95 : .05, 0);
    }
    for (const x of [-.45, .45]) for (const y of [.05, .95]) horizontal(root, "frame-through-bolt", .025, .28, "brass", x, y, 0);
    status(.3, .1, -.155);
  } else {
    base();
    switch (kind) {
      case "atmospheric-condenser":
        radiator("condenser-cold-coil", -.22, .52, .11, .28, .55);
        vessel("condensate-separator", .22, .49, .07, .14, .47, "copper");
        fan("condenser-intake-fan", -.19, .61, -.22, .18);
        sight("condensate-level", .22, .27, -.095, .31);
        box(root, "intake-canopy", .72, .055, .37, "ceramic", 0, .87, .04);
        break;
      case "electrolyzer":
        for (const x of [-.2, .2]) {
          vessel(x < 0 ? "oxygen-separation-vessel" : "hydrogen-separation-vessel", x, .5, .05, .135, .53, "ceramic");
          sight(x < 0 ? "oxygen-sight-column" : "hydrogen-sight-column", x, .29, -.103, .35);
          cylinder(root, "independent-gas-outlet", .035, .13, "copper", x, .865, .05);
        }
        box(root, "electrode-isolation-bridge", .55, .04, .1, "dark", 0, .79, .13);
        for (const x of [-.055, .055]) box(root, "electrolysis-electrode", .023, .4, .045, "copper", x, .49, -.04);
        break;
      case "gas-compressor":
        vessel("compressor-receiver", -.21, .47, .1, .15, .5);
        cylinder(root, "compression-cylinder", .105, .26, "iron", .22, .69, .06);
        radiator("compressor-cooling", .22, .63, .075, .26, .24);
        piston("compressor-reciprocating-crosshead", .22, .39, -.13);
        rotate(wheel(root, "compressor-flywheel", .15, -.01, .35, -.26), "z", 5);
        break;
      case "fluid-refinery":
        vessel("fractionating-tower", -.2, .53, .08, .145, .64, "copper");
        for (const y of [.35, .48, .61, .74]) cylinder(root, "fractionating-tray", .163, .022, "brass", -.2, y, .08);
        vessel("refinery-product-separator", .22, .42, .08, .14, .4);
        radiator("refinery-condenser", .22, .73, .11, .27, .2);
        box(root, "overhead-vapor-manifold", .46, .05, .06, "copper", 0, .87, .08);
        sight("refined-fuel-level", .22, .25, -.073, .27);
        break;
      case "chemical-mixer": {
        vessel("open-mixing-vat", 0, .4, .03, .25, .35, "ceramic");
        cylinder(root, "vat-liquid-recess", .226, .025, "dark", 0, .582, .03);
        const stir = group(root, "mixer-paddle-head", 0, .7, .03);
        cylinder(stir, "mixer-shaft", .026, .28, "iron", 0, -.035, 0);
        box(stir, "mixer-paddles", .29, .045, .045, "brass", 0, -.13, 0); rotate(stir, "y", 3);
        for (const x of [-.33, .33]) cylinder(root, "chemical-dosing-bottle", .062, .27, "copper", x, .7, .12);
        box(root, "mixer-support-bridge", .7, .055, .1, "iron", 0, .87, .12);
        break;
      }
      case "reaction-chamber":
        vessel("ceramic-reaction-vessel", 0, .49, .08, .25, .48, "ceramic");
        for (const x of [-.29, .29]) box(root, "reaction-clamp-upright", .045, .56, .21, "iron", x, .5, .07);
        for (const y of [.35, .48, .61]) ring(root, "reaction-heating-loop", .17, .02, "copper", 0, y, -.183).rotation.x = Math.PI / 2;
        horizontal(root, "reactor-inspection-port", .09, .06, "dark", 0, .56, -.2);
        horizontal(root, "reactor-observation-glass", .066, .03, "glass", 0, .56, -.242);
        box(root, "triple-feed-manifold", .58, .055, .1, "brass", 0, .84, .08);
        break;
      case "carbon-scrubber":
        for (const x of [-.23, 0, .23]) {
          vessel("replaceable-filter-cartridge", x, .51, .06, .09, .57, "filter");
          box(root, "cartridge-release-latch", .095, .035, .05, "brass", x, .77, -.04);
          for (const y of [.37, .47, .57, .67]) box(root, "filter-pleat", .15, .012, .02, "ceramic", x, y, -.041);
        }
        box(root, "scrubber-inlet-plenum", .72, .065, .26, "iron", 0, .85, .07);
        box(root, "carbon-byproduct-drawer", .47, .08, .38, "dark", 0, .23, -.05);
        break;
      case "life-support-controller":
        for (const x of [-.26, .26]) vessel("life-support-reserve-cylinder", x, .48, .17, .11, .48, "ceramic");
        box(root, "life-support-console", .44, .5, .13, "iron", 0, .55, -.18);
        for (const x of [-.1, .1]) gauge(x < 0 ? "oxygen-dial" : "reserve-dial", x, .68, -.265, x < 0 ? "fluid" : "fill");
        for (let i = 0; i < 3; i++) box(root, "composition-meter-track", .24, .018, .014, "brass", 0, .37 + i * .055, -.26);
        wheel(root, "mixture-control-wheel", .06, 0, .84, -.2);
        break;
      case "thermal-regulator":
        radiator("thermal-exchanger", -.19, .53, .12, .32, .62);
        vessel("coolant-expansion-tank", .24, .53, .14, .11, .52, "ceramic");
        fan("thermal-circulation-fan", -.15, .52, -.19, .19);
        sight("coolant-level", .24, .32, .012, .31);
        box(root, "thermal-insulated-header", .65, .055, .14, "ceramic", 0, .88, .16);
        break;
      case "hydrogen-turbine": {
        horizontal(root, "turbine-longitudinal-casing", .23, .46, "iron", 0, .51, .09);
        for (const z of [-.14, .08, .3]) ring(root, "turbine-casing-band", .232, .022, "brass", 0, .51, z);
        fan("hydrogen-turbine-rotor", 0, .51, -.195, .185);
        for (const x of [-.29, .29]) box(root, "turbine-bearing-pedestal", .09, .35, .42, "iron", x, .36, .06);
        cylinder(root, "hydrogen-injection-neck", .043, .16, "copper", -.14, .8, .09);
        cylinder(root, "turbine-exhaust-neck", .065, .19, "ceramic", .16, .805, .19);
        break;
      }
      case "methane-reformer":
        vessel("reformer-ceramic-retort", -.18, .51, .08, .17, .55, "ceramic");
        for (let i = 0; i < 5; i++) { const coil = ring(root, "retort-heater-winding", .178, .014, "copper", -.18, .34 + i * .083, .08); coil.rotation.x = Math.PI / 2; }
        vessel("reformer-catalyst-column", .23, .5, .13, .1, .55, "filter");
        box(root, "steam-methane-feed-bridge", .47, .055, .065, "copper", .02, .84, .12);
        box(root, "retort-burner-bed", .41, .065, .4, "dark", -.18, .205, .08);
        break;
      case "gas-engine":
        box(root, "gas-engine-crankcase", .54, .19, .42, "iron", 0, .29, .1);
        for (const x of [-.17, .17]) {
          cylinder(root, "gas-engine-cylinder", .09, .23, "iron", x, .62, .12);
          for (const y of [.54, .6, .66, .72]) cylinder(root, "cylinder-cooling-rib", .105, .02, "brass", x, y, .12);
          piston(`engine-piston-${x}`, x, .44, -.085, .04);
        }
        rotate(wheel(root, "gas-engine-flywheel", .16, 0, .39, -.25), "z", 4);
        box(root, "gas-engine-intake-manifold", .52, .065, .075, "copper", 0, .81, .12);
        break;
      case "airlock-controller":
        box(root, "airlock-control-pedestal", .22, .31, .27, "iron", 0, .3, .08);
        box(root, "airlock-instrument-panel", .66, .4, .16, "ceramic", 0, .67, -.03);
        gauge("chamber-pressure-dial", -.18, .72, -.132); gauge("target-pressure-dial", .18, .72, -.132, "progress");
        wheel(root, "airlock-cycle-wheel", .12, 0, .49, -.18);
        box(root, "cycle-route-shaft", .32, .016, .018, "brass", 0, .86, -.132);
        for (const side of [-1, 1]) box(root, "cycle-route-arrowhead", .065, .016, .018, "brass", .15, .86 + side * .022, -.132).rotation.z = side * .7;
        break;
      case "atmosphere-vent":
      case "equalization-vent": {
        box(root, "vent-plenum", .69, .64, .33, "iron", 0, .52, .04);
        const sides = kind === "equalization-vent" ? [-1, 1] : [-1];
        for (const side of sides) {
          box(root, "vent-dark-throat", .55, .47, .025, "dark", 0, .53, side * .225);
          for (let i = 0; i < 6; i++) box(root, "directional-vent-vane", .55, .025, .08, "ceramic", 0, .34 + i * .077, side * .255).rotation.x = side * .4;
          const flow = group(root, "active-flow-ribbon", 0, .49, side * .35);
          for (const x of [-.15, 0, .15]) box(flow, "flow-direction-ribbon", .017, .18, .015, "water", x, 0, 0);
          rig.flow.push(flow);
        }
        wheel(root, "vent-check-valve-wheel", .065, .28, .85, -.2);
        break;
      }
      case "recovery-pump":
        horizontal(root, "recovery-pump-volute", .19, .23, "iron", -.14, .46, -.06);
        rotate(wheel(root, "recovery-pump-impeller", .145, -.14, .46, -.21), "z", 3);
        cylinder(root, "glass-moisture-trap", .1, .34, "glass", .24, .55, .01);
        for (const y of [.36, .73]) cylinder(root, "moisture-trap-cap", .12, .04, "brass", .24, y, .01);
        sight("recovered-condensate-level", .24, .4, -.11, .22);
        box(root, "recovery-return-manifold", .49, .065, .075, "copper", .04, .8, .02);
        piston("recovery-drive-piston", -.14, .74, .08, .035);
        break;
      case "pressure-sensor":
        cylinder(root, "sensor-pedestal", .065, .47, "iron", 0, .4, .05);
        horizontal(root, "sensor-diaphragm-housing", .21, .17, "iron", 0, .66, -.01);
        gauge("pressure-threshold-dial", 0, .66, -.112);
        ring(root, "sensor-protective-bezel", .19, .022, "brass", 0, .66, -.1);
        box(root, "threshold-adjustment-knob", .055, .09, .055, "copper", .17, .84, -.01);
        box(root, "sensor-output-terminal", .21, .12, .23, "ceramic", .23, .24, .13);
        break;
    }
    if (kind !== "pressure-sensor" && kind !== "airlock-controller" && kind !== "life-support-controller") gauge("process-dial", -.29, .22, -.3, "progress");
    status(.28, .2, -.34);
  }
  updatePressureModel(root, state);
  return root;
}

/** Allocation-free telemetry update. Omitted fields preserve readings. `time: 0`
 * is the reduced-motion pose; idle mechanisms and vent ribbons never run. */
export function updatePressureModel(root: THREE.Group, state: PressureModelState): void {
  updateTransportConnectors(root, state);
  const rig = rigs.get(root); if (!rig) return;
  if (state.fill !== undefined) rig.fill = unit(state.fill);
  if (state.fluidFill !== undefined) rig.fluidFill = unit(state.fluidFill);
  if (state.progress !== undefined) rig.progress = unit(state.progress);
  if (state.open !== undefined) rig.open = unit(state.open);
  if (state.active !== undefined) rig.active = state.active;
  if (state.alarm !== undefined) rig.alarm = state.alarm;
  if (state.locked !== undefined) rig.locked = state.locked;
  const time = Number.isFinite(state.time) ? state.time! : 0;
  for (const motion of rig.motions) {
    const phase = time % (TAU / Math.abs(motion.speed)) * motion.speed;
    if (motion.stroke === undefined) motion.object.rotation[motion.axis] = motion.base + (rig.active ? phase : 0);
    else motion.object.position[motion.axis] = motion.base + (rig.active ? Math.sin(phase) * motion.stroke : 0);
  }
  for (const gauge of rig.gauges) {
    const reading = gauge.source === "progress" ? rig.progress : gauge.source === "fill" ? rig.fill : rig.fluidFill ?? rig.fill;
    gauge.object.rotation.z = Math.PI * .7 - reading * Math.PI * 1.4;
  }
  for (const column of rig.columns) {
    const fill = rig.fluidFill ?? rig.fill; column.object.visible = fill > 0;
    column.object.scale.y = Math.max(.001, fill); column.object.position.y = column.base + column.height * fill / 2;
  }
  for (const flow of rig.flow) { flow.visible = rig.active; flow.scale.y = rig.active ? .8 + .2 * Math.sin(time % TAU * 3) : 1; }
  for (const panel of rig.panels) {
    panel.object.position.x = panel.side * (panel.base + panel.travel * rig.open);
    panel.object.scale.x = 1 - .88 * rig.open;
  }
  for (const panel of rig.dropPanels) {
    panel.object.position.y = panel.closedY + (panel.packedY - panel.closedY) * rig.open;
    panel.object.scale.y = 1 - rig.open + rig.open * .014 / panel.height;
  }
  for (const latch of rig.latches) latch.rotation.z = rig.locked ? 0 : Math.PI / 2;
  for (const flag of rig.flags) flag.visible = rig.alarm;
  if (state.connected) for (const face of faces) {
    if (state.connected[face] === undefined) continue;
    // Window borders disappear between adjacent panes; pipe arms appear only
    // for actual connected faces. Structural hangar frame remains a full block.
    const invert = root.userData.pressureKind === "reinforced-window";
    for (const object of rig.connections[face] ?? []) object.visible = invert ? !state.connected[face] : !!state.connected[face];
  }
  if (rig.window && state.windowLayout) {
    const layout = state.windowLayout, window = rig.window;
    window.flat.visible = layout.flat;
    const bend = (layout.arms.left || layout.arms.right) && (layout.arms.front || layout.arms.back);
    window.mullion.visible = !layout.flat && bend;
    for (const face of ["left", "right", "front", "back"] as const) {
      const arm = window.arms[face];
      arm.group.visible = !layout.flat && layout.arms[face];
      arm.end.visible = !layout.joined[face];
      arm.top.visible = !layout.upper[face]; arm.bottom.visible = !layout.lower[face];
      window.borders[face].visible = !layout.joined[face];
    }
    root.userData.windowLayout = layout;
  }
  if (rig.gate) {
    const gate = rig.gate;
    if (state.gateWidth !== undefined) gate.width = gateSize(state.gateWidth);
    if (state.gateHeight !== undefined) gate.height = gateSize(state.gateHeight);
    const aperture = gate.height - .3, segment = aperture / gate.shutters.length;
    gate.posts.forEach((post, i) => { post.position.set((i ? 1 : -1) * (gate.width / 2 - .09), gate.height / 2, 0); post.scale.y = gate.height; });
    gate.header.position.set(0, gate.height - .12, 0); gate.header.scale.x = gate.width;
    gate.sill.position.set(0, .0225, 0); gate.sill.scale.x = gate.width;
    gate.shutters.forEach((panel, i) => {
      const closedY = .05 + segment * (i + .5), packedY = gate.height - .24 + i * .012;
      panel.position.y = closedY + (packedY - closedY) * rig.open;
      panel.position.z = .025 * rig.open * (i / 11);
      panel.scale.set(gate.width - .36, segment * (1 - rig.open) + .012 * rig.open, 1);
    });
    gate.locks.forEach((lock, i) => lock.position.set((i ? 1 : -1) * (gate.width / 2 - .09), gate.height * .43, -.28));
    // Gate wrench ports live on the perimeter, never float across an open passage.
    root.getObjectByName("port-front")!.position.set(-gate.width / 2 + .09, .35, -.25);
    root.getObjectByName("port-back")!.position.set(-gate.width / 2 + .09, .35, .25);
    root.getObjectByName("port-left")!.position.set(-gate.width / 2 + .035, .35, 0);
    root.getObjectByName("port-right")!.position.set(gate.width / 2 - .035, .35, 0);
    root.getObjectByName("port-top")!.position.set(.31, gate.height - .035, .1);
    for (const name of ["status-lamp-cage", "status-lamp", "mechanical-alarm-flag"]) root.getObjectByName(name)!.position.x = -gate.width / 2 + .09;
    root.userData.pressureGateWidth = gate.width; root.userData.pressureGateHeight = gate.height;
  }
  rig.lamp.color.setHex(rig.alarm ? 0xd08952 : rig.locked ? 0xd4b477 : 0x8cceb2);
  rig.lamp.emissive.copy(rig.lamp.color); rig.lamp.emissiveIntensity = rig.active || rig.alarm ? .28 : .06;
  root.userData.pressureFill = rig.fill; root.userData.pressureFluidFill = rig.fluidFill ?? rig.fill;
  root.userData.pressureProgress = rig.progress; root.userData.pressureActive = rig.active;
  root.userData.pressureOpen = rig.open; root.userData.pressureAlarm = rig.alarm; root.userData.pressureLocked = rig.locked;
}
