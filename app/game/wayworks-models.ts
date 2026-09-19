import * as THREE from "three";

export type WayworksModelKind = "hand-dynamo" | "sunplate-array" | "field-battery" | "charging-pedestal" | "grid-cable";
export type WayworksModelState = Readonly<{ fill?: number; active?: boolean; time?: number }>;

type ModelParts = {
  fill: number;
  active: boolean;
  lamp: THREE.MeshStandardMaterial;
  rotor?: THREE.Group;
  needle?: THREE.Group;
  core?: THREE.Mesh;
  coreBase?: number;
  coreHeight?: number;
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
  const material = (color: number, metalness = 0.55, roughness = 0.58) => new THREE.MeshStandardMaterial({ color, metalness: Math.min(.15, metalness), roughness, emissive: color, emissiveIntensity: .08 });
  const iron = material(0x273c43);
  const brass = material(0xc5a45d, 0.72, 0.4);
  const copper = material(0xb86e43, 0.7);
  const dark = material(0x112329, 0.18, 0.8);
  const teal = material(0x3a9c94, 0.4);
  const lamp = material(0x70e3c6, 0.2, 0.38);
  lamp.emissive.setHex(0x28cba9);
  const parts: ModelParts = { fill: 0, active: false, lamp };
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
 * pass zero for reduced motion. Omitted fill/activity preserve the prior state.
 * Calling this on a non-Wayworks group is deliberately a harmless no-op.
 */
export function updateWayworksModel(group: THREE.Group, state: WayworksModelState): void {
  const parts = rigs.get(group);
  if (!parts) return;
  if (state.fill !== undefined) parts.fill = clampFill(state.fill);
  if (state.active !== undefined) parts.active = state.active;
  const time = Number.isFinite(state.time) ? state.time! : 0;
  if (parts.rotor) parts.rotor.rotation.z = parts.active ? -(time % TAU) * 2 : 0;
  if (parts.needle) parts.needle.rotation.z = Math.PI * 0.7 - parts.fill * Math.PI * 1.4;
  if (parts.core) {
    parts.core.visible = parts.fill > 0;
    parts.core.scale.y = Math.max(0.001, parts.fill);
    parts.core.position.y = parts.coreBase! + parts.coreHeight! * parts.fill / 2;
  }
  parts.lamp.emissiveIntensity = parts.active ? 0.65 + Math.sin(time * 3) * 0.08 : 0.04 + parts.fill * 0.16;
  group.userData.wayworksFill = parts.fill;
  group.userData.wayworksActive = parts.active;
}
