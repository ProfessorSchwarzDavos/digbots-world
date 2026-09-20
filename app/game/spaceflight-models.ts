import * as THREE from "three";

export const SPACEFLIGHT_MODEL_KINDS = [
  "survey-hopper", "launch-pad", "fuel-gantry", "mission-console", "tracking-beacon",
  "orbital-dock", "recovery-crane", "station-core", "station-truss", "station-radiator", "station-observatory",
] as const;
export type SpaceflightModelKind = typeof SPACEFLIGHT_MODEL_KINDS[number];
export type SpaceflightModelState = Readonly<{
  time?: number; active?: boolean; thrust?: number; landingGear?: number; fill?: number; yaw?: number;
  /** Local pilot view only. External observers retain the complete capsule. */
  cockpit?: boolean;
}>;
export const isSpaceflightModelKind = (kind: unknown): kind is SpaceflightModelKind =>
  typeof kind === "string" && (SPACEFLIGHT_MODEL_KINDS as readonly string[]).includes(kind);

type Rig = {
  active: boolean; thrust: number; landingGear: number; fill: number;
  lamp?: THREE.MeshStandardMaterial; flame?: THREE.Group; legs: THREE.Group[];
  arm?: THREE.Group; radar?: THREE.Group; hook?: THREE.Group; cable?: THREE.Mesh;
  columns: { object: THREE.Mesh; base: number; height: number }[];
  interior?: THREE.Group; exterior?: THREE.Object3D[];
};
const rigs = new WeakMap<THREE.Group, Rig>();
const TAU = Math.PI * 2;
const unit = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/** Floor/center origin, local front -Z. Hopper is approximately 3 x 3 x 4.4;
 * infrastructure fits one cell. Exhaust extends below the hull during thrust.
 * Every geometry/material belongs to this instance. On removal, dispose the
 * unique traversed geometry/material sets, as for Wayworks and pressure models.
 * State is presentation telemetry only; it never changes simulation authority. */
export function createSpaceflightModel(kind: SpaceflightModelKind, state: SpaceflightModelState = {}): THREE.Group {
  if (!isSpaceflightModelKind(kind)) throw new Error(`Unknown spaceflight model: ${String(kind)}`);
  const root = new THREE.Group();
  root.name = `spaceflight-${kind}`;
  root.userData.spaceflightKind = kind;
  const colors = {
    iron: 0x839597, ivory: 0xe0d7bb, copper: 0xc18a62, dark: 0x344b50,
    glass: 0x285d64, fuel: 0xd99b52, oxygen: 0x78beca, lamp: 0xf1cc88,
    flame: 0xf2a85c, hot: 0xffe1a1,
  };
  type Surface = keyof typeof colors;
  // Lazily allocate only used surfaces; all allocations remain reachable by
  // traversal. Low metalness keeps the enamel/iron readable without an env map.
  const surfaces = new Map<Surface, THREE.MeshStandardMaterial>();
  const material = (key: Surface) => {
    let surface = surfaces.get(key);
    if (!surface) {
      surface = new THREE.MeshStandardMaterial({ color: colors[key], metalness: key === "ivory" ? .02 : .1,
        roughness: key === "glass" ? .28 : .64, emissive: colors[key], emissiveIntensity: .08,
        flatShading: true, side: THREE.DoubleSide });
      if (key === "flame" || key === "hot") { surface.emissiveIntensity = .8; surface.transparent = true; surface.opacity = .72; surface.depthWrite = false; }
      surfaces.set(key, surface);
    }
    return surface;
  };
  const rig: Rig = { active: false, thrust: 0, landingGear: 1, fill: 0, legs: [], columns: [] };
  rigs.set(root, rig);
  const group = (parent: THREE.Object3D, name: string, x = 0, y = 0, z = 0) => {
    const part = new THREE.Group(); part.name = name; part.position.set(x, y, z); parent.add(part); return part;
  };
  const mesh = (parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, key: Surface, x = 0, y = 0, z = 0) => {
    const part = new THREE.Mesh(geometry, material(key)); part.name = name; part.position.set(x, y, z);
    part.castShadow = key !== "flame" && key !== "hot"; part.receiveShadow = part.castShadow; parent.add(part); return part;
  };
  const box = (p: THREE.Object3D, name: string, w: number, h: number, d: number, key: Surface, x = 0, y = 0, z = 0) =>
    mesh(p, name, new THREE.BoxGeometry(w, h, d), key, x, y, z);
  const cylinder = (p: THREE.Object3D, name: string, bottom: number, top: number, h: number, key: Surface, x = 0, y = 0, z = 0) =>
    mesh(p, name, new THREE.CylinderGeometry(top, bottom, h, 12), key, x, y, z);
  const ring = (p: THREE.Object3D, name: string, radius: number, tube: number, key: Surface, x = 0, y = 0, z = 0) =>
    mesh(p, name, new THREE.TorusGeometry(radius, tube, 4, 12), key, x, y, z);
  const beam = (p: THREE.Object3D, name: string, a: [number, number, number], b: [number, number, number], width: number, key: Surface) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
    const part = box(p, name, width, direction.length(), width, key);
    part.position.copy(start.add(end).multiplyScalar(.5)); part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return part;
  };
  const horizontal = (p: THREE.Object3D, name: string, radius: number, depth: number, key: Surface, x: number, y: number, z: number) => {
    const part = cylinder(p, name, radius, radius, depth, key, x, y, z); part.rotation.x = Math.PI / 2; return part;
  };
  const status = (x: number, y: number, z: number) => {
    box(root, "status-lamp-socket", .12, .065, .04, "dark", x, y, z);
    box(root, "status-lamp", .075, .025, .015, "lamp", x, y, z - .026); rig.lamp = material("lamp");
  };
  const base = () => {
    box(root, "bolted-iron-plinth", .86, .1, .86, "iron", 0, .05, 0);
    for (const x of [-.35, .35]) for (const z of [-.35, .35]) cylinder(root, "foundation-bolt", .025, .025, .025, "copper", x, .11, z);
  };
  const column = (name: string, x: number, y: number, z: number, h: number, key: Surface) => {
    box(root, `${name}-track`, .075, h + .045, .035, "dark", x, y + h / 2, z);
    const object = box(root, name, .038, h, .012, key, x, y + h / 2, z - .024);
    rig.columns.push({ object, base: y, height: h });
  };
  const port = (p: THREE.Object3D, name: string, x: number, y: number, z: number, key: "fuel" | "oxygen") => {
    const socket = group(p, name, x, y, z);
    ring(socket, "feed-port-copper-rim", .085, .022, "copper");
    horizontal(socket, "keyed-feed-port", .068, .055, key, 0, 0, -.013);
    // Shape coding accompanies color coding: twin O2 bars, single fuel bar.
    for (const dx of key === "oxygen" ? [-.022, .022] : [0]) box(socket, "feed-key", .012, .065, .013, "dark", dx, 0, -.049);
    return socket;
  };

  switch (kind) {
    case "survey-hopper": {
      cylinder(root, "heatshield-rim", 1.09, 1.03, .19, "copper", 0, 1.14, 0);
      cylinder(root, "riveted-pressure-hull", 1.03, 1.03, 1.67, "ivory", 0, 2.055, 0);
      cylinder(root, "capsule-tapered-shoulder", 1.035, .73, .77, "ivory", 0, 3.27, 0);
      cylinder(root, "capsule-crown", .73, .23, .64, "ivory", 0, 3.975, 0);
      cylinder(root, "crown-docking-cap", .235, .19, .1, "copper", 0, 4.345, 0);
      for (const y of [1.34, 2.77]) cylinder(root, "hull-copper-belt", 1.045, 1.045, .055, "copper", 0, y, 0);
      // A contiguous faceted wrap windshield carries the face of the capsule.
      mesh(root, "wraparound-teal-cockpit", new THREE.CylinderGeometry(.805, 1.047, .57, 8, 1, true, Math.PI - 1.15, 2.3), "glass", 0, 3.19, 0);
      for (const angle of [Math.PI - 1.15, Math.PI, Math.PI + 1.15]) {
        beam(root, "cockpit-copper-mullion", [Math.sin(angle) * 1.055, 2.9, Math.cos(angle) * 1.055], [Math.sin(angle) * .81, 3.48, Math.cos(angle) * .81], .04, "copper");
      }
      for (let i = 0; i < 12; i++) {
        const angle = i * TAU / 12 + Math.PI / 12;
        for (const y of [1.43, 2.66]) {
          const rivet = box(root, "hull-rivet", .045, .045, .025, "copper", Math.sin(angle) * 1.006, y, Math.cos(angle) * 1.006); rivet.rotation.y = angle;
        }
      }
      // Rear cargo hatch, latch dogs and boarding rung remain separate from cockpit.
      box(root, "rear-cargo-hatch-frame", .87, 1.08, .12, "iron", 0, 2.04, .976);
      box(root, "rear-cargo-hatch", .73, .91, .13, "ivory", 0, 2.04, 1.008);
      for (const x of [-.4, .4]) for (const y of [1.76, 2.32]) box(root, "cargo-hatch-latch", .16, .065, .08, "copper", x, y, 1.06);
      for (const y of [1.24, 1.46]) box(root, "boarding-rung", .49, .06, .21, "iron", 0, y, 1.04);
      port(root, "fuel-feed-port", -.5, 1.85, -.94, "fuel");
      port(root, "oxygen-feed-port", .5, 1.85, -.94, "oxygen");
      cylinder(root, "engine-throat", .3, .34, .26, "iron", 0, .9, 0);
      mesh(root, "open-engine-bell", new THREE.CylinderGeometry(.28, .55, .52, 12, 1, true), "copper", 0, .58, 0);
      ring(root, "engine-bell-lip", .55, .045, "iron", 0, .32, 0).rotation.x = Math.PI / 2;
      cylinder(root, "engine-dark-interior", .235, .235, .025, "dark", 0, .79, 0);
      const flame = group(root, "throttle-exhaust", 0, .3, 0); rig.flame = flame;
      cylinder(flame, "exhaust-outer-plume", .035, .43, 1.65, "flame", 0, -.825, 0);
      cylinder(flame, "exhaust-hot-core", .015, .24, .95, "hot", 0, -.475, 0);
      for (let i = 0; i < 4; i++) {
        const radial = group(root, `landing-leg-frame-${i}`); radial.rotation.y = Math.PI / 4 + i * Math.PI / 2;
        const leg = group(radial, `landing-leg-${i}`, .87, 1.2, 0); rig.legs.push(leg);
        beam(leg, "splayed-landing-strut", [0, 0, 0], [.72, -1.08, 0], .11, "iron");
        beam(leg, "copper-shock-piston", [.06, -.11, .05], [.55, -.88, .05], .055, "copper");
        box(leg, "landing-foot", .43, .12, .48, "dark", .72, -1.14, 0);
        box(leg, "landing-foot-ivory-cap", .36, .045, .4, "ivory", .72, -1.058, 0);
        horizontal(leg, "landing-hinge", .11, .18, "copper", 0, 0, 0);
        box(radial, "landing-gear-retraction-rail", .12, .91, .13, "iron", .87, 1.655, 0);
      }
      box(root, "forward-survey-stripe", .14, 1.01, .025, "copper", 0, 2.025, -1.039);
      status(0, 2.61, -1.06);
      break;
    }
    case "launch-pad": {
      box(root, "pad-armored-tile", 1, .12, 1, "iron", 0, .06, 0);
      box(root, "pad-heat-resistant-inset", .76, .018, .76, "dark", 0, .129, 0);
      for (const x of [-.38, .38]) box(root, "pad-ivory-landing-guide", .055, .021, .69, "ivory", x, .149, 0);
      for (const z of [-.33, .33]) box(root, "pad-copper-crossbar", .78, .022, .055, "copper", 0, .15, z);
      for (const x of [-.2, 0, .2]) box(root, "exhaust-channel-grate", .055, .022, .45, "iron", x, .149, 0);
      for (const side of [-1, 1]) box(root, "launch-heading-chevron", .25, .022, .04, "ivory", side * .09, .15, -.18).rotation.y = side * .6;
      status(.35, .17, -.38); break;
    }
    case "fuel-gantry": {
      base();
      for (const x of [-.23, .23]) {
        cylinder(root, x < 0 ? "fuel-service-reservoir" : "oxygen-service-reservoir", .12, .1, .47, "ivory", x, .365, .13);
        cylinder(root, "reservoir-color-band", .123, .123, .07, x < 0 ? "fuel" : "oxygen", x, .46, .13);
      }
      box(root, "gantry-upright", .13, .74, .17, "iron", 0, .48, .28);
      const arm = group(root, "retractable-service-arm", 0, .77, .24); rig.arm = arm;
      box(arm, "gantry-copper-boom", .17, .08, .51, "copper", 0, 0, -.205);
      for (const x of [-.14, .14]) {
        beam(arm, "service-hose", [x, -.02, -.19], [x, -.3, -.52], .043, x < 0 ? "fuel" : "oxygen");
        port(arm, x < 0 ? "fuel-feed-port" : "oxygen-feed-port", x, -.3, -.52, x < 0 ? "fuel" : "oxygen");
      }
      column("service-reserve-level", -.3, .22, -.17, .27, "fuel"); status(.28, .2, -.33); break;
    }
    case "mission-console": {
      base(); box(root, "mission-console-pedestal", .37, .39, .31, "iron", 0, .3, .12);
      const desk = group(root, "sloped-orbital-chart", 0, .62, -.035); desk.rotation.x = -.28;
      box(desk, "chart-copper-surround", .72, .44, .11, "copper");
      box(desk, "orbital-chart-screen", .62, .33, .024, "glass", 0, .02, -.071);
      for (const r of [.062, .125]) ring(desk, "chart-orbit-path", r, .006, "oxygen", -.08, .02, -.09);
      horizontal(desk, "chart-parent-body", .031, .015, "ivory", -.08, .02, -.095);
      box(desk, "charted-ship-marker", .028, .028, .016, "lamp", .04, .055, -.1);
      for (let i = 0; i < 3; i++) box(desk, "chart-resource-readout", .09, .019, .016, i === 0 ? "fuel" : i === 1 ? "oxygen" : "lamp", .19, .095 - i * .065, -.091);
      box(root, "mission-control-keyboard", .59, .055, .22, "ivory", 0, .42, -.28);
      for (const x of [-.21, -.12, -.03, .06]) box(root, "console-physical-key", .047, .017, .08, "dark", x, .458, -.28);
      status(.28, .44, -.39); break;
    }
    case "tracking-beacon": {
      base(); cylinder(root, "tracking-mast", .055, .04, .5, "copper", 0, .36, .09);
      const radar = group(root, "tracking-radar-sweep", 0, .69, .09); rig.radar = radar;
      mesh(radar, "faceted-tracking-dish", new THREE.SphereGeometry(.23, 12, 5, 0, TAU, 0, .47 * Math.PI), "ivory").rotation.x = -Math.PI / 2;
      beam(radar, "dish-feed-stem", [0, 0, 0], [0, 0, -.29], .024, "copper");
      horizontal(radar, "dish-feed-receiver", .04, .06, "oxygen", 0, 0, -.27);
      box(root, "beacon-radio-box", .33, .19, .27, "iron", 0, .22, 0); status(0, .23, -.16); break;
    }
    case "orbital-dock": {
      base();
      ring(root, "docking-capture-collar", .31, .075, "ivory", 0, .53, -.07);
      ring(root, "docking-seal", .295, .024, "dark", 0, .53, -.147);
      ring(root, "dock-alignment-ring", .355, .018, "copper", 0, .53, -.151);
      for (const x of [-.3, .3]) box(root, "dock-collar-support", .09, .36, .3, "iron", x, .28, .06);
      for (let i = 0; i < 3; i++) {
        const a = i * TAU / 3;
        const jaw = box(root, "docking-capture-jaw", .105, .12, .18, "copper", Math.sin(a) * .295, .53 + Math.cos(a) * .295, -.22); jaw.rotation.z = -a;
      }
      status(.28, .18, -.33); break;
    }
    case "recovery-crane": {
      base(); cylinder(root, "crane-slew-bearing", .2, .2, .09, "copper", 0, .15, .13);
      box(root, "crane-tower", .17, .63, .18, "iron", 0, .5, .15);
      beam(root, "crane-triangulated-boom", [0, .73, .15], [0, .86, -.33], .09, "copper");
      beam(root, "crane-boom-brace", [0, .49, .15], [0, .8, -.3], .055, "iron");
      const cable = box(root, "recovery-hoist-cable", .022, .38, .022, "dark", 0, .63, -.33); rig.cable = cable;
      const hook = group(root, "recovery-hook", 0, .44, -.33); rig.hook = hook;
      mesh(hook, "open-recovery-hook", new THREE.TorusGeometry(.06, .019, 4, 10, Math.PI * 1.55), "copper", 0, -.045, 0).rotation.z = .3;
      box(hook, "hook-block", .095, .09, .075, "iron");
      horizontal(root, "crane-winch-drum", .1, .24, "copper", 0, .34, .07);
      status(.27, .18, -.33); break;
    }
    case "station-core": {
      base(); box(root, "station-claim-core", .56, .62, .53, "ivory", 0, .44, .04);
      for (const x of [-.3, .3]) box(root, "core-corner-post", .08, .64, .63, "iron", x, .45, .04);
      box(root, "core-cap", .7, .07, .67, "copper", 0, .81, .04);
      ring(root, "station-registry-seal", .17, .025, "copper", 0, .57, -.242);
      horizontal(root, "registry-enamel-face", .14, .025, "glass", 0, .57, -.256);
      for (const a of [0, Math.PI / 2]) box(root, "registry-compass-needle", .027, .21, .018, "ivory", 0, .57, -.279).rotation.z = a;
      column("core-reserve-level", -.18, .22, -.248, .2, "oxygen"); status(.18, .28, -.256); break;
    }
    case "station-truss": {
      for (const x of [-.4, .4]) for (const z of [-.4, .4]) box(root, "truss-longitudinal-chord", .1, 1, .1, "iron", x, .5, z);
      for (const y of [.05, .95]) {
        for (const z of [-.4, .4]) box(root, "truss-end-crossbar", .9, .1, .1, "copper", 0, y, z);
        for (const x of [-.4, .4]) box(root, "truss-end-sidebar", .1, .1, .9, "copper", x, y, 0);
      }
      for (const z of [-.4, .4]) for (const side of [-1, 1]) beam(root, "truss-diagonal-web", [-.36 * side, .13, z], [.36 * side, .87, z], .055, "ivory");
      for (const x of [-.4, .4]) beam(root, "truss-side-web", [x, .13, -.36], [x, .87, .36], .055, "ivory");
      break;
    }
    case "station-radiator": {
      base(); box(root, "radiator-backbone", .11, .73, .16, "iron", 0, .5, .06);
      for (const x of [-.235, .235]) {
        box(root, "radiator-ivory-panel", .34, .68, .06, "ivory", x, .54, .04);
        for (let i = 0; i < 7; i++) box(root, "radiator-capillary-fin", .29, .019, .025, "copper", x, .28 + i * .085, -.007);
        beam(root, "coolant-return-pipe", [x, .19, .11], [x, .88, .11], .036, "oxygen");
      }
      box(root, "radiator-top-manifold", .83, .055, .13, "iron", 0, .9, .055); status(0, .19, -.16); break;
    }
    case "station-observatory": {
      base(); cylinder(root, "observatory-pier", .16, .11, .4, "ivory", 0, .31, .12);
      const scope = group(root, "observatory-telescope", 0, .66, .04); scope.rotation.x = .32;
      horizontal(scope, "telescope-ivory-barrel", .16, .48, "ivory", 0, 0, -.04);
      horizontal(scope, "telescope-front-baffle", .18, .09, "copper", 0, 0, -.285);
      horizontal(scope, "telescope-recessed-lens", .135, .013, "glass", 0, 0, -.334);
      ring(scope, "telescope-lens-ring", .125, .012, "oxygen", 0, 0, -.345);
      box(scope, "telescope-finder", .075, .075, .28, "iron", .2, .095, -.01);
      for (const x of [-.23, .23]) beam(root, "telescope-yoke", [x, .4, .1], [x, .68, .05], .06, "copper");
      status(.28, .19, -.33); break;
    }
  }
  if (kind === "survey-hopper") {
    rig.exterior = [...root.children];
    const interior = group(root, "pilot-cockpit-interior"); rig.interior = interior;
    // An open forward sightline is intentional: glass tint belongs outside,
    // while the pilot sees the real terrain through the pressure windshield.
    box(interior, "pilot-dashboard", 1.45, .13, .28, "dark", 0, 2.65, -.78);
    for (const x of [-.67, .67]) {
      beam(interior, "pilot-window-jamb", [x, 2.65, -.86], [x * .82, 3.62, -.72], .055, "copper");
      box(interior, "pilot-armrest", .14, .16, .55, "ivory", x, 2.25, -.08);
    }
    box(interior, "pilot-window-header", 1.12, .06, .07, "copper", 0, 3.62, -.72);
    for (const [x, surface] of [[-.36, "fuel"], [0, "oxygen"], [.36, "lamp"]] as const) {
      box(interior, "pilot-instrument-face", .22, .14, .035, surface, x, 2.76, -.68);
      box(interior, "pilot-instrument-mark", .025, .09, .04, "dark", x, 2.76, -.655);
    }
    interior.visible = false;
  }
  updateSpaceflightModel(root, state);
  return root;
}

/** Allocation-free absolute poses. Omitted telemetry preserves its last value;
 * omitted/nonfinite time selects the stable reduced-motion pose. `active`
 * extends the service gantry and runs beacon/crane mechanisms. `landingGear`
 * is 0 stowed / 1 deployed. Thrust is explicit and independent of activity. */
export function updateSpaceflightModel(root: THREE.Group, state: SpaceflightModelState): void {
  const rig = rigs.get(root); if (!rig) return;
  if (state.cockpit !== undefined && rig.interior && rig.exterior) {
    rig.interior.visible = state.cockpit;
    for (const part of rig.exterior) part.visible = !state.cockpit;
    root.userData.spaceflightCockpit = state.cockpit;
  }
  if (state.active !== undefined) rig.active = state.active;
  if (state.thrust !== undefined) rig.thrust = unit(state.thrust);
  if (state.landingGear !== undefined) rig.landingGear = unit(state.landingGear);
  if (state.fill !== undefined) rig.fill = unit(state.fill);
  if (state.yaw !== undefined) root.rotation.y = Number.isFinite(state.yaw) ? state.yaw % TAU : 0;
  const time = Number.isFinite(state.time) ? state.time! : 0;
  if (rig.flame) {
    rig.flame.visible = rig.thrust > 0 && !root.userData.spaceflightCockpit;
    const flutter = Math.sin(time % TAU * 19) * .035 + Math.sin(time % TAU * 31) * .025;
    rig.flame.scale.set(.65 + .35 * rig.thrust, (.3 + rig.thrust * .7) * (1 + flutter), .65 + .35 * rig.thrust);
  }
  for (const leg of rig.legs) {
    leg.rotation.z = -2.45 * (1 - rig.landingGear);
    // The hinge first lifts on its carriage before folding inward, so the
    // outside edge of each broad foot cannot sweep through the floor.
    leg.position.y = 1.2 + .4 * (1 - rig.landingGear) + .7 * Math.sin(Math.PI * rig.landingGear);
  }
  if (rig.arm) rig.arm.rotation.x = rig.active ? 0 : -1.12;
  if (rig.radar) rig.radar.rotation.y = rig.active ? time % (TAU / .65) * .65 : 0;
  if (rig.hook && rig.cable) {
    const lift = rig.active ? .17 * (1 - Math.cos(time % TAU * 1.5)) : 0;
    rig.hook.position.y = .44 + lift;
    rig.cable.scale.y = (.38 - lift) / .38;
    rig.cable.position.y = .82 - (.38 - lift) / 2;
  }
  for (const column of rig.columns) {
    column.object.visible = rig.fill > 0;
    column.object.scale.y = Math.max(.001, rig.fill);
    column.object.position.y = column.base + column.height * rig.fill / 2;
  }
  if (rig.lamp) rig.lamp.emissiveIntensity = rig.active ? .3 : .08;
  root.userData.spaceflightActive = rig.active;
  root.userData.spaceflightThrust = rig.thrust;
  root.userData.spaceflightLandingGear = rig.landingGear;
  root.userData.spaceflightFill = rig.fill;
}
