import * as THREE from "three";

export type WayworksModelKind =
  | "hand-dynamo" | "sunplate-array" | "field-battery" | "charging-pedestal" | "grid-cable"
  | "heat-engine" | "wind-rotor" | "waterwheel-generator" | "biofuel-engine"
  | "grid-battery" | "ship-battery-bank" | "powered-crusher" | "enrichment-mill"
  | "electric-smelter" | "alloy-infuser" | "plate-press" | "precision-sawmill"
  | "fluid-pump" | "fluid-tank" | "gas-tank";
export type WayworksModelState = Readonly<{
  fill?: number; active?: boolean; time?: number; progress?: number; fluidFill?: number;
}>;

type Motion = { object: THREE.Object3D; axis: "x" | "y" | "z"; speed: number; base: number; stroke?: number };
type FillColumn = { object: THREE.Mesh; base: number; height: number; fluid: boolean };

type ModelParts = {
  fill: number;
  active: boolean;
  lamp: THREE.MeshStandardMaterial;
  rotor?: THREE.Group;
  needle?: THREE.Group;
  needleFluid?: boolean;
  core?: THREE.Mesh;
  coreBase?: number;
  coreHeight?: number;
  motions: Motion[];
  columns: FillColumn[];
  progress: number;
  fluidFill?: number;
  progressNeedle?: THREE.Group;
};

// No global GPU resources: every model can be removed and disposed independently.
// Weak references also let normal world/chunk eviction release the animation rig.
const rigs = new WeakMap<THREE.Group, ModelParts>();
const TAU = Math.PI * 2;
const clampFill = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

/** Authored one-cell machines. Origin is floor/center; local front is -Z.
 * Resources are owned by this group, never shared with another model. Dispose
 * the traversed geometry/material sets when removing it. `fill` is normalized.
 */
export function createWayworksModel(kind: WayworksModelKind, options: Omit<WayworksModelState, "time"> = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = `wayworks-${kind}`;
  root.userData.wayworksKind = kind;
  // The game has no reflection environment map: high metalness made these
  // mechanisms nearly black despite daytime hemisphere lighting.
  const material = (color: number, metalness = 0.1, roughness = 0.58) => new THREE.MeshStandardMaterial({ color, metalness: Math.min(.12, metalness), roughness, emissive: color, emissiveIntensity: .12 });
  const iron = material(0x718a8d);
  const brass = material(0xe0bc73, 0.12, 0.4);
  const copper = material(0xc98a60, 0.12);
  const dark = material(0x30444b, 0.08, 0.8);
  const teal = material(0x58b5a8, 0.1);
  const lamp = material(0x70e3c6, 0.2, 0.38);
  lamp.emissive.setHex(0x28cba9);
  const parts: ModelParts = { fill: 0, active: false, lamp, motions: [], columns: [], progress: 0 };
  rigs.set(root, parts);

  const mesh = (parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, surface: THREE.Material, x: number, y: number, z: number) => {
    const result = new THREE.Mesh(geometry, surface);
    result.name = name;
    result.position.set(x, y, z);
    result.castShadow = true;
    result.receiveShadow = true;
    parent.add(result);
    return result;
  };
  const box = (parent: THREE.Object3D, name: string, w: number, h: number, d: number, surface: THREE.Material, x: number, y: number, z: number) =>
    mesh(parent, name, new THREE.BoxGeometry(w, h, d), surface, x, y, z);
  const cylinder = (parent: THREE.Object3D, name: string, top: number, bottom: number, height: number, surface: THREE.Material, x: number, y: number, z: number, sides = 12) =>
    mesh(parent, name, new THREE.CylinderGeometry(top, bottom, height, sides), surface, x, y, z);
  const ring = (parent: THREE.Object3D, name: string, radius: number, tube: number, surface: THREE.Material, x: number, y: number, z: number) =>
    mesh(parent, name, new THREE.TorusGeometry(radius, tube, 6, 20), surface, x, y, z);
  const group = (parent: THREE.Object3D, name: string, x: number, y: number, z: number) => {
    const result = new THREE.Group();
    result.name = name;
    result.position.set(x, y, z);
    parent.add(result);
    return result;
  };

  // The same visible socket language connects each machine to the grid. The
  // brass notch marks the local top of a face; managers rotate the entire root.
  const socket = (face: string, x: number, y: number, z: number, rx = 0, ry = 0) => {
    const port = group(root, `port-${face}`, x, y, z);
    port.userData.wayworksFace = face;
    port.rotation.set(rx, ry, 0);
    ring(port, `${face}-socket-rim`, 0.065, 0.016, brass, 0, 0, 0);
    const insulator = cylinder(port, `${face}-socket-insulator`, 0.052, 0.052, 0.018, dark, 0, 0, 0);
    insulator.rotation.x = Math.PI / 2;
    box(port, `${face}-socket-contact`, 0.045, 0.027, 0.018, teal, 0, 0, -0.018);
    box(port, `${face}-socket-notch`, 0.024, 0.03, 0.025, brass, 0, 0.062, -0.005);
  };
  const manifold = (height: number, top: number, topX = 0, topZ = 0) => {
    // Raised feet leave the underside socket exposed instead of buried inside
    // a solid plinth, while retaining the exact floor origin.
    box(root, "power-manifold", 0.86, height - 0.034, 0.86, iron, 0, (height + 0.034) / 2, 0);
    for (const x of [-0.34, 0.34]) {
      for (const z of [-0.34, 0.34]) box(root, "manifold-foot", 0.14, 0.034, 0.14, dark, x, 0.017, z);
    }
    box(root, "manifold-brass-trim", 0.89, 0.032, 0.89, brass, 0, height - 0.028, 0);
    socket("front", 0, height / 2, -0.448);
    socket("back", 0, height / 2, 0.448, 0, Math.PI);
    socket("left", -0.448, height / 2, 0, 0, Math.PI / 2);
    socket("right", 0.448, height / 2, 0, 0, -Math.PI / 2);
    socket("top", topX, top, topZ, Math.PI / 2);
    socket("bottom", 0, 0.029, 0, -Math.PI / 2);
  };
  const gauge = (x: number, y: number, z: number) => {
    const dial = group(root, "charge-gauge", x, y, z);
    ring(dial, "gauge-brass-bezel", 0.094, 0.014, brass, 0, 0, 0);
    const face = cylinder(dial, "gauge-face", 0.085, 0.085, 0.016, dark, 0, 0, 0);
    face.rotation.x = Math.PI / 2;
    for (let index = 0; index < 5; index += 1) {
      const angle = -Math.PI * 0.7 + index * Math.PI * 0.35;
      const tick = box(dial, `gauge-tick-${index}`, 0.008, 0.017, 0.009, brass, Math.sin(angle) * 0.065, Math.cos(angle) * 0.065, -0.014);
      tick.rotation.z = -angle;
    }
    const needle = group(dial, "gauge-needle", 0, 0, -0.026);
    box(needle, "gauge-needle-tip", 0.012, 0.064, 0.01, lamp, 0, 0.022, 0);
    parts.needle = needle;
  };

  const rotate = (object: THREE.Object3D, axis: Motion["axis"], speed: number) => {
    parts.motions.push({ object, axis, speed, base: object.rotation[axis] });
  };
  const reciprocate = (object: THREE.Object3D, axis: Motion["axis"], stroke: number, speed = 4) => {
    parts.motions.push({ object, axis, speed, stroke, base: object.position[axis] });
  };
  const fillColumn = (name: string, x: number, base: number, z: number, width: number, height: number, depth: number, surface: THREE.Material = lamp, fluid = false) => {
    const column = box(root, name, width, height, depth, surface, x, base + height / 2, z);
    parts.columns.push({ object: column, base, height, fluid });
    return column;
  };
  const horizontalCylinder = (name: string, radius: number, length: number, surface: THREE.Material, x: number, y: number, z: number) => {
    const result = cylinder(root, name, radius, radius, length, surface, x, y, z);
    result.rotation.x = Math.PI / 2;
    return result;
  };
  const status = (x = .28, y = .3, z = -.39) => {
    box(root, "status-lamp-mount", .12, .075, .045, dark, x, y, z);
    box(root, "activity-lamp", .075, .025, .015, lamp, x, y, z - .03);
  };
  const progressDial = (x: number, y: number, z: number) => {
    gauge(x, y, z);
    parts.progressNeedle = parts.needle;
    parts.needle = undefined;
    parts.progressNeedle!.parent!.name = "process-gauge";
  };

  if (kind === "hand-dynamo") {
    manifold(0.21, 0.84);
    box(root, "generator-housing", 0.47, 0.48, 0.39, iron, 0.08, 0.48, 0.16);
    for (const x of [-0.12, 0.02, 0.16, 0.3]) {
      const coil = ring(root, "copper-armature-winding", 0.16, 0.025, copper, x, 0.52, 0.16);
      coil.rotation.y = Math.PI / 2;
    }
    box(root, "generator-top-bridge", 0.48, 0.06, 0.3, brass, 0.06, 0.8, 0.13);
    for (const x of [-0.26, 0.25]) box(root, "wheel-bearing-strut", 0.055, 0.32, 0.12, brass, x, 0.35, -0.15);
    const axle = cylinder(root, "flywheel-axle", 0.055, 0.055, 0.48, brass, -0.04, 0.54, -0.01);
    axle.rotation.x = Math.PI / 2;
    const rotor = group(root, "dynamo-flywheel", -0.04, 0.54, -0.21);
    parts.rotor = rotor;
    ring(rotor, "flywheel-iron-rim", 0.265, 0.035, iron, 0, 0, 0);
    ring(rotor, "flywheel-brass-inlay", 0.255, 0.012, brass, 0, 0, -0.036);
    for (let index = 0; index < 3; index += 1) {
      const spoke = box(rotor, `flywheel-spoke-${index}`, 0.025, 0.48, 0.028, brass, 0, 0, 0);
      spoke.rotation.z = index * Math.PI / 3;
    }
    const hub = cylinder(rotor, "flywheel-hub", 0.075, 0.075, 0.075, copper, 0, 0, 0);
    hub.rotation.x = Math.PI / 2;
    box(rotor, "crank-arm", 0.205, 0.036, 0.04, brass, 0.1, 0, -0.068);
    const grip = cylinder(rotor, "leather-crank-grip", 0.037, 0.037, 0.12, material(0x69442d, 0.05, 0.95), 0.2, 0, -0.12);
    grip.rotation.x = Math.PI / 2;
    for (const y of [0.42, 0.5, 0.58]) box(root, "housing-vent", 0.1, 0.024, 0.024, dark, 0.26, y, -0.044);
    gauge(0.28, 0.72, -0.08);
  } else if (kind === "sunplate-array") {
    manifold(0.18, 0.197, 0.32, 0.3);
    cylinder(root, "sunplate-mast", 0.08, 0.12, 0.39, brass, 0, 0.375, 0.08);
    box(root, "sunplate-mast-brace", 0.54, 0.06, 0.1, iron, 0, 0.5, 0.08);
    const panel = group(root, "tilted-sunplate", 0, 0.68, 0);
    panel.rotation.x = -0.48;
    box(panel, "sunplate-brass-frame", 0.87, 0.055, 0.72, brass, 0, 0, 0);
    box(panel, "sunplate-insulation", 0.815, 0.02, 0.665, dark, 0, 0.036, 0);
    const cell = material(0x16364a, 0.42, 0.29);
    for (let x = 0; x < 4; x += 1) {
      for (let z = 0; z < 3; z += 1) {
        box(panel, `sun-cell-${x}-${z}`, 0.183, 0.013, 0.194, cell, (x - 1.5) * 0.198, 0.053, (z - 1) * 0.212);
        box(panel, `cell-collector-${x}-${z}`, 0.012, 0.005, 0.182, teal, (x - 1.5) * 0.198, 0.063, (z - 1) * 0.212);
      }
    }
    box(root, "solar-output-lamp", 0.14, 0.034, 0.025, lamp, 0.27, 0.14, -0.449);
  } else if (kind === "field-battery") {
    manifold(0.2, 0.914);
    cylinder(root, "battery-lower-collar", 0.3, 0.31, 0.1, brass, 0, 0.25, 0);
    cylinder(root, "battery-inner-shell", 0.235, 0.235, 0.52, dark, 0, 0.56, 0);
    cylinder(root, "battery-upper-collar", 0.3, 0.3, 0.075, brass, 0, 0.84, 0);
    cylinder(root, "battery-terminal-cap", 0.19, 0.25, 0.04, iron, 0, 0.895, 0);
    // An open front cage exposes the actual amount held; no transparent sorting.
    const core = box(root, "battery-charge-column", 0.15, 0.46, 0.08, lamp, 0, 0.54, -0.251);
    parts.core = core;
    parts.coreBase = 0.31;
    parts.coreHeight = 0.46;
    for (const x of [-0.23, 0.23]) {
      for (const z of [-0.17, 0.17]) box(root, "battery-cage-upright", 0.045, 0.56, 0.045, iron, x, 0.55, z);
    }
    for (let index = 0; index < 4; index += 1) box(root, `charge-column-tick-${index}`, 0.028, 0.012, 0.015, brass, -0.11, 0.34 + index * 0.13, -0.302);
    gauge(0, 0.84, -0.324);
    box(root, "battery-carry-handle", 0.36, 0.033, 0.07, iron, 0, 0.943, 0.18);
    for (const x of [-0.16, 0.16]) box(root, "handle-standoff", 0.033, 0.09, 0.065, brass, x, 0.914, 0.18);
  } else if (kind === "charging-pedestal") {
    manifold(0.19, 0.801);
    cylinder(root, "charger-foot", 0.21, 0.3, 0.1, brass, 0, 0.24, 0);
    cylinder(root, "charger-column", 0.145, 0.19, 0.35, iron, 0, 0.465, 0);
    for (const x of [-0.13, 0.13]) box(root, "charger-conductor", 0.024, 0.27, 0.025, copper, x, 0.47, -0.11);
    cylinder(root, "charging-dish", 0.33, 0.2, 0.12, brass, 0, 0.7, 0);
    cylinder(root, "dish-recess", 0.29, 0.29, 0.02, dark, 0, 0.765, 0);
    const rim = ring(root, "charging-induction-ring", 0.22, 0.016, lamp, 0, 0.78, 0);
    rim.rotation.x = Math.PI / 2;
    for (const x of [-0.085, 0.085]) box(root, "cell-contact", 0.035, 0.032, 0.13, copper, x, 0.791, 0);
    // Empty open cradle: never implies that a player's cell was inserted.
    for (const x of [-0.25, 0.25]) box(root, "cradle-retainer", 0.045, 0.12, 0.13, iron, x, 0.81, 0.08);
    gauge(0, 0.45, -0.192);
  } else if (kind === "heat-engine") {
    manifold(.18, .88, -.12, .18);
    const stone = material(0xad9b83, .02, .92);
    for (let row = 0; row < 3; row += 1) {
      for (const side of [-1, 1]) box(root, "hearth-masonry-jamb", .12, .15, .49, stone, -.14 + side * .18, .28 + row * .16, .02);
      box(root, "hearth-rear-brick", .4, .15, .12, stone, -.14, .28 + row * .16, .22);
    }
    box(root, "hearth-lintel", .5, .1, .52, stone, -.14, .73, .02);
    box(root, "hearth-dark-firebox", .22, .28, .025, dark, -.14, .4, .04);
    const ember = material(0xcc7237, .02);
    ember.emissive.setHex(0xcb481c);
    for (const x of [-.21, -.14, -.07]) box(root, "hearth-grate", .018, .18, .04, iron, x, .36, -.25);
    box(root, "hearth-embers", .22, .04, .21, ember, -.14, .235, -.06);
    for (let i = 0; i < 4; i += 1) box(root, "heat-exchanger-fin", .18, .035, .33, iron, .235, .38 + i * .085, .06);
    cylinder(root, "piston-barrel", .088, .088, .22, copper, .235, .69, .06);
    const piston = group(root, "heat-engine-piston", .235, .45, -.2);
    cylinder(piston, "piston-rod", .024, .024, .25, brass, 0, .02, 0);
    box(piston, "piston-crosshead", .17, .05, .08, iron, 0, -.1, 0);
    reciprocate(piston, "y", .055);
    cylinder(root, "hearth-chimney", .07, .085, .18, iron, -.26, .87, .14);
    gauge(-.12, .61, -.256);
    status(.25, .28, -.26);
  } else if (kind === "wind-rotor") {
    manifold(.18, .205, .31, .31);
    const wood = material(0x9c754f, .02, .9);
    const cloth = material(0xe8dbc0, .01, .95);
    box(root, "wind-timber-mast", .1, .7, .11, wood, 0, .54, .12);
    for (const x of [-.16, .16]) {
      const brace = box(root, "wind-mast-brace", .065, .39, .07, wood, x, .36, .13);
      brace.rotation.z = x > 0 ? -.55 : .55;
    }
    horizontalCylinder("wind-bearing", .1, .27, iron, 0, .59, .04);
    const rotor = group(root, "cloth-wind-rotor", 0, .59, -.14);
    rotate(rotor, "z", -.85);
    for (let i = 0; i < 4; i += 1) {
      const sail = group(rotor, `wind-sail-${i}`, 0, 0, 0);
      sail.rotation.z = i * Math.PI / 2;
      box(sail, "sail-timber-spar", .032, .34, .035, wood, 0, .17, 0);
      box(sail, "cream-cloth-panel", .115, .22, .016, cloth, .05, .22, -.012);
      for (const y of [.13, .24, .31]) box(sail, "cloth-seam", .11, .008, .006, brass, .05, y, -.023);
    }
    const cap = cylinder(rotor, "wind-hub-cap", .07, .09, .08, brass, 0, 0, -.04);
    cap.rotation.x = Math.PI / 2;
    box(root, "wind-dynamo-foot", .29, .15, .27, iron, 0, .26, .13);
    status(.25, .26, -.25);
  } else if (kind === "waterwheel-generator") {
    manifold(.18, .8, .29, .23);
    const wood = material(0xa77f50, .02, .9);
    const wheel = group(root, "wildwood-waterwheel", -.055, .535, -.07);
    rotate(wheel, "z", -.95);
    for (const z of [-.15, .15]) {
      ring(wheel, "waterwheel-timber-rim", .28, .03, wood, 0, 0, z);
      for (let i = 0; i < 4; i += 1) {
        const spoke = box(wheel, "waterwheel-spoke", .036, .55, .04, wood, 0, 0, z);
        spoke.rotation.z = i * Math.PI / 4;
      }
    }
    for (let i = 0; i < 12; i += 1) {
      const angle = i * TAU / 12;
      const paddle = box(wheel, "waterwheel-paddle", .13, .045, .34, wood, Math.sin(angle) * .285, Math.cos(angle) * .285, 0);
      paddle.rotation.z = -angle;
      const nail = box(wheel, "paddle-iron-fastener", .025, .025, .012, iron, Math.sin(angle) * .285, Math.cos(angle) * .285, -.18);
      nail.rotation.z = -angle;
    }
    horizontalCylinder("waterwheel-axle", .044, .7, brass, -.055, .535, .015);
    box(root, "waterwheel-rear-dynamo", .25, .45, .23, iron, .285, .45, .215);
    box(root, "waterwheel-bearing-pier", .13, .35, .11, iron, -.055, .355, -.3);
    gauge(.29, .69, -.12);
  } else if (kind === "biofuel-engine") {
    manifold(.18, .875, -.16, .08);
    cylinder(root, "biofuel-copper-vat", .21, .18, .51, copper, -.17, .485, .04);
    for (const y of [.26, .69]) cylinder(root, "vat-binding-ring", .22, .22, .045, brass, -.17, y, .04);
    cylinder(root, "vat-domed-lid", .1, .21, .09, copper, -.17, .775, .04);
    cylinder(root, "vat-feed-neck", .065, .065, .06, brass, -.17, .85, .08);
    box(root, "biofuel-cylinder-bed", .27, .13, .48, iron, .225, .255, .02);
    horizontalCylinder("biofuel-iron-cylinder", .125, .33, iron, .225, .435, .05);
    for (const z of [-.04, .02, .08, .14]) {
      const fin = ring(root, "engine-cooling-fin", .129, .013, brass, .225, .435, z);
      fin.rotation.z = .2;
    }
    const piston = group(root, "biofuel-piston", .225, .435, -.195);
    const rod = cylinder(piston, "biofuel-piston-rod", .025, .025, .16, brass, 0, 0, 0);
    rod.rotation.x = Math.PI / 2;
    reciprocate(piston, "z", .045, 5);
    box(root, "vat-sight-glass-recess", .09, .29, .024, dark, -.17, .47, -.178);
    fillColumn("biofuel-level", -.17, .325, -.197, .053, .27, .015, teal, true);
    gauge(.24, .68, -.02);
    status(.26, .26, -.26);
  } else if (kind === "grid-battery" || kind === "ship-battery-bank") {
    const ship = kind === "ship-battery-bank";
    manifold(.18, ship ? .78 : .92, 0, .2);
    const count = ship ? 3 : 2;
    const spacing = ship ? .245 : .35;
    const height = ship ? .46 : .59;
    for (let i = 0; i < count; i += 1) {
      const x = (i - (count - 1) / 2) * spacing;
      if (ship) {
        box(root, `ship-replaceable-module-${i}`, .2, height, .44, iron, x, .24 + height / 2, 0);
        box(root, "module-brass-latch", .12, .045, .04, brass, x, .67, -.24);
        box(root, "module-carry-grip", .13, .025, .05, dark, x, .74, .02);
        for (const dx of [-.06, .06]) box(root, "module-handle-riser", .025, .06, .04, brass, x + dx, .714, .02);
      } else {
        cylinder(root, "grid-accumulator-cell", .155, .155, height, iron, x, .24 + height / 2, 0);
        for (const y of [.27, .77]) cylinder(root, "accumulator-brass-band", .17, .17, .04, brass, x, y, 0);
        cylinder(root, "cell-terminal", .045, .045, .09, copper, x, .85, .025);
      }
      box(root, "charge-window-recess", .115, height * .75, .025, dark, x, .27 + height * .375, ship ? -.235 : -.158);
      fillColumn(`bank-charge-column-${i}`, x, .27, ship ? -.255 : -.18, .065, height * .75, .02);
    }
    if (ship) {
      for (const z of [-.3, .3]) box(root, "ship-module-retaining-rail", .8, .06, .05, brass, 0, .3, z);
      for (const x of [-.405, .405]) box(root, "ship-shock-mount", .05, .46, .5, dark, x, .44, .01);
      box(root, "ship-busbar", .72, .045, .07, copper, 0, .765, .22);
    } else {
      box(root, "grid-busbar", .53, .035, .07, copper, 0, .9, .025);
      for (const x of [-.37, .37]) box(root, "battery-end-frame", .045, .59, .3, brass, x, .515, .08);
    }
    gauge(0, ship ? .58 : .63, -.33);
    status(.28, .21, -.35);
  } else if (kind === "powered-crusher") {
    manifold(.18, .82, .31, .26);
    for (const x of [-.34, .34]) box(root, "crusher-cheek-frame", .11, .5, .58, iron, x, .48, .03);
    box(root, "crusher-feed-back", .65, .17, .065, copper, 0, .765, .27);
    for (const x of [-.285, .285]) {
      const hopper = box(root, "crusher-flared-hopper", .06, .19, .47, brass, x, .765, .02);
      hopper.rotation.z = x > 0 ? -.28 : .28;
    }
    for (const x of [-.15, .15]) {
      const roller = group(root, x < 0 ? "crusher-left-roller" : "crusher-right-roller", x, .56, 0);
      const barrel = cylinder(roller, "crusher-roller-barrel", .125, .125, .45, dark, 0, 0, 0);
      barrel.rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i += 1) {
        const angle = i * TAU / 8;
        const tooth = box(roller, "crusher-toothed-ridge", .045, .04, .42, iron, Math.sin(angle) * .126, Math.cos(angle) * .126, 0);
        tooth.rotation.z = -angle;
      }
      rotate(roller, "z", x < 0 ? -2 : 2);
    }
    box(root, "crusher-output-chute", .38, .045, .3, brass, 0, .29, -.22);
    progressDial(.27, .37, -.307);
    status(-.28, .3, -.3);
  } else if (kind === "enrichment-mill") {
    manifold(.18, .82, .31, .25);
    for (const x of [-.31, .31]) box(root, "mill-bearing-frame", .085, .4, .5, iron, x, .395, .04);
    const drum = group(root, "enrichment-separator-drum", 0, .56, .02);
    const shell = cylinder(drum, "mill-octagonal-drum", .245, .245, .5, iron, 0, 0, 0, 8);
    shell.rotation.x = Math.PI / 2;
    for (const z of [-.25, .25]) ring(drum, "mill-brass-drum-band", .245, .025, brass, 0, 0, z);
    for (let i = 0; i < 8; i += 1) {
      const angle = i * TAU / 8;
      const rib = box(drum, "mill-separator-rib", .038, .045, .42, teal, Math.sin(angle) * .242, Math.cos(angle) * .242, 0);
      rib.rotation.z = -angle;
    }
    rotate(drum, "z", .9);
    box(root, "mill-feed-hopper", .25, .1, .19, copper, 0, .87, .16);
    cylinder(root, "mill-feed-neck", .065, .065, .18, brass, 0, .74, .17);
    box(root, "concentrate-tray", .43, .06, .28, brass, 0, .265, -.19);
    progressDial(.28, .71, -.28);
    status(-.27, .29, -.27);
  } else if (kind === "electric-smelter") {
    manifold(.18, .91, 0, .21);
    const ceramic = material(0xc7bda5, .01, .95);
    box(root, "smelter-kiln-back", .63, .54, .13, ceramic, 0, .49, .25);
    for (const x of [-.27, .27]) box(root, "kiln-ceramic-jamb", .12, .55, .51, ceramic, x, .485, 0);
    box(root, "kiln-vault", .67, .13, .6, ceramic, 0, .8, 0);
    box(root, "kiln-hearth", .61, .09, .58, ceramic, 0, .25, 0);
    box(root, "kiln-dark-chamber", .39, .38, .035, dark, 0, .495, .17);
    const element = material(0xe29652, .02);
    for (const x of [-.17, .17]) {
      for (const y of [.4, .51, .62]) box(root, "smelter-heating-element", .035, .035, .38, element, x, y, -.015);
    }
    box(root, "kiln-slide-tray", .34, .04, .33, iron, 0, .33, -.17);
    for (const x of [-.31, .31]) box(root, "kiln-iron-binding", .038, .6, .62, iron, x, .51, 0);
    progressDial(0, .795, -.324);
    status(.28, .27, -.33);
  } else if (kind === "alloy-infuser") {
    manifold(.18, .86, .31, .27);
    cylinder(root, "infuser-crucible-foot", .18, .24, .12, iron, 0, .27, .02);
    cylinder(root, "alloy-ceramic-crucible", .245, .16, .31, material(0xc6c1ac, .02, .9), 0, .485, .02);
    cylinder(root, "crucible-dark-mouth", .217, .217, .022, dark, 0, .651, .02);
    const rim = ring(root, "crucible-brass-lip", .236, .022, brass, 0, .662, .02);
    rim.rotation.x = Math.PI / 2;
    for (const x of [-.3, .3]) {
      cylinder(root, "infusion-copper-reservoir", .075, .075, .31, copper, x, .665, .15);
      box(root, "infusion-feed-arm", .2, .045, .045, brass, x * .74, .82, .15);
    }
    const stirrer = group(root, "alloy-stirring-head", 0, .735, .02);
    cylinder(stirrer, "infuser-stirrer-shaft", .022, .022, .27, iron, 0, -.07, 0);
    box(stirrer, "infuser-stirrer-paddle", .22, .035, .035, brass, 0, -.16, 0);
    rotate(stirrer, "y", 2);
    box(root, "infuser-overhead-bridge", .65, .06, .09, iron, 0, .88, .15);
    progressDial(0, .43, -.225);
    status(.29, .26, -.27);
  } else if (kind === "plate-press") {
    manifold(.18, .92, 0, .2);
    for (const x of [-.29, .29]) {
      box(root, "press-upright", .12, .66, .38, iron, x, .53, .07);
      cylinder(root, "press-guide-rod", .025, .025, .52, brass, x, .52, -.16);
    }
    box(root, "press-crossbeam", .72, .13, .43, iron, 0, .86, .03);
    cylinder(root, "press-hydraulic-head", .105, .105, .16, copper, 0, .775, .015);
    const ram = group(root, "plate-press-ram", 0, .58, 0);
    cylinder(ram, "press-piston", .045, .045, .19, brass, 0, .08, 0);
    box(ram, "press-upper-die", .39, .09, .31, dark, 0, -.05, -.035);
    reciprocate(ram, "y", .105, 2.5);
    box(root, "press-anvil", .45, .095, .44, dark, 0, .295, -.035);
    box(root, "press-feed-table", .5, .035, .28, brass, 0, .345, -.21);
    progressDial(.28, .71, -.244);
    status(-.28, .28, -.25);
  } else if (kind === "precision-sawmill") {
    manifold(.18, .735, .3, .27);
    const wood = material(0xba9362, .01, .9);
    for (const x of [-.32, .32]) box(root, "sawmill-trestle", .085, .36, .54, iron, x, .36, .02);
    for (const x of [-.21, .21]) box(root, "sawmill-split-table", .34, .065, .72, wood, x, .53, 0);
    for (const z of [-.32, .32]) box(root, "table-brass-endcap", .78, .018, .035, brass, 0, .574, z);
    const saw = group(root, "precision-saw-blade", 0, .56, 0);
    const blade = cylinder(saw, "saw-steel-disc", .23, .23, .024, iron, 0, 0, 0, 24);
    blade.rotation.x = Math.PI / 2;
    for (let i = 0; i < 16; i += 1) {
      const angle = i * TAU / 16;
      const tooth = box(saw, "saw-cutting-tooth", .052, .055, .028, brass, Math.sin(angle) * .235, Math.cos(angle) * .235, 0);
      tooth.rotation.z = -angle + .25;
    }
    // A vertical saw lies along the feed direction, through the table slot.
    const sawMount = group(root, "saw-spindle-mount", 0, 0, 0);
    root.remove(saw);
    sawMount.add(saw);
    sawMount.rotation.y = Math.PI / 2;
    rotate(saw, "z", -7);
    box(root, "saw-guide-fence", .035, .14, .65, teal, .235, .62, .02);
    box(root, "saw-motor", .22, .2, .27, dark, -.225, .35, .07);
    box(root, "saw-rear-port-support", .18, .2, .14, iron, .3, .635, .27);
    progressDial(.29, .39, -.289);
    status(-.27, .32, -.29);
  } else if (kind === "fluid-pump") {
    manifold(.18, .82, .25, .21);
    box(root, "pump-motor-bed", .65, .09, .55, brass, 0, .245, .02);
    horizontalCylinder("pump-volute-body", .19, .19, teal, -.12, .49, -.06);
    ring(root, "pump-volute-cover", .14, .027, brass, -.12, .49, -.168);
    const impeller = group(root, "pump-impeller", -.12, .49, -.195);
    for (let i = 0; i < 4; i += 1) {
      const vane = box(impeller, "pump-impeller-vane", .035, .23, .026, iron, 0, 0, 0);
      vane.rotation.z = i * Math.PI / 4;
    }
    rotate(impeller, "z", 3);
    cylinder(root, "pump-rising-outlet", .06, .06, .36, copper, -.12, .72, .04);
    box(root, "pump-outlet-elbow", .4, .12, .12, copper, .02, .84, .04);
    cylinder(root, "pump-inlet-pipe", .062, .062, .24, copper, -.12, .29, -.05);
    horizontalCylinder("pump-drive-motor", .12, .29, iron, .225, .48, .13);
    for (const y of [.42, .49, .56]) box(root, "pump-motor-fin", .25, .024, .22, brass, .225, y, .14);
    gauge(.24, .7, -.034);
    status(.27, .29, -.27);
  } else if (kind === "fluid-tank" || kind === "gas-tank") {
    const gas = kind === "gas-tank";
    manifold(.18, .934, 0, .13);
    const shell = material(gas ? 0x93a5a2 : 0x779c9a, .08, .55);
    const liquid = material(gas ? 0xc6bc81 : 0x4aa7c0, .02, .4);
    liquid.transparent = true;
    liquid.opacity = gas ? .5 : .76;
    liquid.depthWrite = false;
    // A narrow window avoids a full transparent enclosure and sorting shells.
    cylinder(root, "tank-reinforced-shell", .28, .28, .57, shell, 0, .525, .025);
    for (const y of [.255, .79]) cylinder(root, "tank-brass-hoop", .297, .297, .055, brass, 0, y, .025);
    cylinder(root, gas ? "gas-pressure-shoulder" : "fluid-tank-roof", gas ? .12 : .26, .28, .09, shell, 0, .86, .025);
    cylinder(root, "tank-top-valve-neck", .047, .047, .052, copper, 0, .93, .13);
    for (const x of [-.31, .31]) box(root, "tank-frame-upright", .055, .67, .12, iron, x, .53, .025);
    box(root, "tank-window-recess", .16, .43, .035, dark, 0, .505, -.259);
    const contents = fillColumn(gas ? "gas-quantity-window" : "fluid-level-window", 0, .3, -.284, .11, .4, .025, liquid, true);
    contents.castShadow = false;
    contents.receiveShadow = false;
    for (const x of [-.09, .09]) box(root, "tank-window-frame", .018, .45, .036, brass, x, .51, -.284);
    for (let i = 0; i < 5; i += 1) box(root, "tank-volume-tick", .033, .008, .012, brass, -.095, .31 + i * .095, -.31);
    gauge(.19, .73, -.253);
    parts.needleFluid = true;
    if (gas) {
      const valve = ring(root, "gas-safe-vent-handwheel", .09, .012, copper, -.19, .865, -.12);
      valve.rotation.x = Math.PI / 2;
      cylinder(root, "gas-vent-stem", .021, .021, .13, brass, -.19, .8, -.12);
      box(root, "pressure-rating-plate", .1, .05, .015, brass, .19, .56, -.25);
    } else {
      horizontalCylinder("fluid-drain-valve", .043, .12, copper, .19, .32, -.265);
      box(root, "fluid-drain-lever", .14, .02, .035, brass, .19, .39, -.28);
    }
  } else {
    // Six conductors meet in an insulated junction; directional connection state
    // remains kernel-owned, so this does not guess which neighbors are powered.
    const junction = cylinder(root, "cable-junction", 0.16, 0.16, 0.25, iron, 0, 0.5, 0, 8);
    junction.rotation.z = Math.PI / 2;
    for (const axis of ["x", "y", "z"] as const) {
      const insulation = cylinder(root, `${axis}-cable-insulation`, 0.083, 0.083, 0.8, dark, 0, 0.5, 0, 8);
      const conductor = cylinder(root, `${axis}-copper-conductor`, 0.045, 0.045, 0.92, copper, 0, 0.5, 0, 8);
      if (axis === "x") { insulation.rotation.z = Math.PI / 2; conductor.rotation.z = Math.PI / 2; }
      if (axis === "z") { insulation.rotation.x = Math.PI / 2; conductor.rotation.x = Math.PI / 2; }
    }
    socket("front", 0, 0.5, -0.45);
    socket("back", 0, 0.5, 0.45, 0, Math.PI);
    socket("left", -0.45, 0.5, 0, 0, Math.PI / 2);
    socket("right", 0.45, 0.5, 0, 0, -Math.PI / 2);
    socket("top", 0, 0.95, 0, Math.PI / 2);
    socket("bottom", 0, 0.05, 0, -Math.PI / 2);
    box(root, "cable-status-band", 0.19, 0.038, 0.19, lamp, 0, 0.64, 0);
  }
  updateWayworksModel(root, options);
  return root;
}

/** Cheap absolute-time visual updates, never simulation. Time is seconds;
 * pass zero for reduced motion. Omitted fill/activity/progress preserve state.
 * Fluid windows use fluidFill when supplied, otherwise the original fill API.
 * Calling this on a non-Wayworks group is deliberately a harmless no-op.
 */
export function updateWayworksModel(group: THREE.Group, state: WayworksModelState): void {
  const parts = rigs.get(group);
  if (!parts) return;
  if (state.fill !== undefined) parts.fill = clampFill(state.fill);
  if (state.active !== undefined) parts.active = state.active;
  if (state.progress !== undefined) parts.progress = clampFill(state.progress);
  if (state.fluidFill !== undefined) parts.fluidFill = clampFill(state.fluidFill);
  const time = Number.isFinite(state.time) ? state.time! : 0;
  if (parts.rotor) parts.rotor.rotation.z = parts.active ? -(time % TAU) * 2 : 0;
  if (parts.needle) parts.needle.rotation.z = Math.PI * 0.7 - (parts.needleFluid ? parts.fluidFill ?? parts.fill : parts.fill) * Math.PI * 1.4;
  if (parts.core) {
    parts.core.visible = parts.fill > 0;
    parts.core.scale.y = Math.max(0.001, parts.fill);
    parts.core.position.y = parts.coreBase! + parts.coreHeight! * parts.fill / 2;
  }
  for (const motion of parts.motions) {
    const phase = time % (TAU / Math.abs(motion.speed)) * motion.speed;
    if (motion.stroke === undefined) motion.object.rotation[motion.axis] = motion.base + (parts.active ? phase : 0);
    else motion.object.position[motion.axis] = motion.base + (parts.active ? Math.sin(phase) * motion.stroke : 0);
  }
  for (const column of parts.columns) {
    const fill = column.fluid ? parts.fluidFill ?? parts.fill : parts.fill;
    column.object.visible = fill > 0;
    column.object.scale.y = Math.max(.001, fill);
    column.object.position.y = column.base + column.height * fill / 2;
  }
  if (parts.progressNeedle) parts.progressNeedle.rotation.z = Math.PI * .7 - parts.progress * Math.PI * 1.4;
  parts.lamp.emissiveIntensity = parts.active ? 0.65 + Math.sin(time % TAU * 3) * 0.08 : 0.04 + parts.fill * 0.16;
  group.userData.wayworksFill = parts.fill;
  group.userData.wayworksActive = parts.active;
  group.userData.wayworksProgress = parts.progress;
  group.userData.wayworksFluidFill = parts.fluidFill ?? parts.fill;
}

const overlayColors: Record<string, number> = { energy: 0xffd67b, item: 0xe8d6b0, fluid: 0x69d5ff, chemical: 0xb7e981, heat: 0xff9473 };
/** Wrench-only face glyphs: arrows, cross, ring and service plus also encode mode without color. */
export function updateWayworksPortOverlay(root: THREE.Group, visible: boolean, ports: Readonly<Record<string, string>>, resource = "energy") {
  for (const face of ["front", "back", "left", "right", "top", "bottom"]) {
    const socket = root.getObjectByName(`port-${face}`);
    if (!socket) continue;
    let overlay = socket.getObjectByName(`overlay-${face}`) as THREE.LineSegments | undefined;
    const mode = ports[face] ?? "disabled", signature = `${resource}/${mode}`;
    if (visible && (!overlay || overlay.userData.signature !== signature)) {
      if (overlay) { overlay.removeFromParent(); overlay.geometry.dispose(); (overlay.material as THREE.Material).dispose(); }
      const points: number[] = [];
      const line = (a: number, b: number, c: number, d: number) => points.push(a, b, -.035, c, d, -.035);
      const arrow = (x: number, direction: number, offset = 0) => {
        line(x, -.08 * direction + offset, x, .08 * direction + offset);
        line(x, .08 * direction + offset, x - .035, .04 * direction + offset);
        line(x, .08 * direction + offset, x + .035, .04 * direction + offset);
      };
      if (mode === "disabled") { line(-.065, -.065, .065, .065); line(-.065, .065, .065, -.065); }
      else if (mode === "input" || mode === "pull") { arrow(0, -1); if (mode === "pull") { line(-.04, .07, 0, .035); line(0, .035, .04, .07); } }
      else if (mode === "output") arrow(0, 1);
      else if (mode === "both") { arrow(-.04, -1); arrow(.04, 1); }
      else if (mode === "service") { line(-.065, 0, .065, 0); line(0, -.065, 0, .065); }
      else for (let n = 0; n < 12; n++) line(Math.cos(n / 6 * Math.PI) * .07, Math.sin(n / 6 * Math.PI) * .07,
        Math.cos((n + 1) / 6 * Math.PI) * .07, Math.sin((n + 1) / 6 * Math.PI) * .07);
      // A square resource frame separates overlays from physical sockets.
      line(-.12, -.12, .12, -.12); line(.12, -.12, .12, .12); line(.12, .12, -.12, .12); line(-.12, .12, -.12, -.12);
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
      overlay = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: overlayColors[resource] ?? overlayColors.energy, depthWrite: false }));
      overlay.name = `overlay-${face}`; overlay.userData.signature = signature; overlay.renderOrder = 8; socket.add(overlay);
    }
    if (overlay) overlay.visible = visible;
  }
  root.userData.wayworksOverlay = visible ? { resource, ports: { ...ports } } : null;
}
