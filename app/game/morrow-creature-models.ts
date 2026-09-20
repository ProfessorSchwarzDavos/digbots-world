import * as THREE from "three";
import type { MobVisual, MobVisualParts } from "./mob-models";
import { sharedBoxGeometry } from "./shared-model-geometry";

export const MORROW_VISUAL_KINDS = Object.freeze([
  "rillehopper", "vacuum-lantern", "slatefin-burrower", "morrow-owl",
] as const);
export type MorrowVisualKind = typeof MORROW_VISUAL_KINDS[number];

type XYZ = [number, number, number];
type Rig = ReturnType<typeof builder>;
const rigs = new WeakMap<THREE.Object3D, Rig>();
const TAU = Math.PI * 2;
const finite = (value: number) => Number.isFinite(value) ? value : 0;
const unit = (value: number) => THREE.MathUtils.clamp(finite(value), 0, 1);

/** No MOB_DEFS runtime import: mob-models can dispatch here without a cycle. */
function builder(kind: MorrowVisualKind, id: number) {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  group.name = `${kind}-root`;
  visual.name = `${kind}-visual`;
  group.userData.mobId = id;
  visual.userData.wildlifeRig = kind;
  visual.userData.modelStyle = "high-detail-cubic";
  group.add(visual);
  const parts: MobVisualParts = { legs: [], wings: [], arms: [], head: [], body: [] };
  const nodes = new Map<string, THREE.Object3D>();
  const rests = new Map<THREE.Object3D, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>();
  const matte = (color: number) => new THREE.MeshLambertMaterial({ color });
  const mats = {
    hide: matte(kind === "morrow-owl" ? 0x77758e : kind === "slatefin-burrower" ? 0x65706d : 0x9aaa99),
    dark: matte(0x424b52), slate: matte(0x87928e), pale: matte(0xd6e0d0), frost: matte(0xb8dcd9),
    amber: matte(0xe4c38b), ink: matte(0x212d38), white: matte(0xf4f2df),
    core: new THREE.MeshStandardMaterial({ color: 0xc6efd1, emissive: 0x82dcac, emissiveIntensity: .7, roughness: .45 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xb7dacf, transparent: true, opacity: .25, depthWrite: false, roughness: .25, metalness: .08 }),
    veil: new THREE.MeshStandardMaterial({ color: 0xc4b8df, emissive: 0x9d8dbc, emissiveIntensity: .35, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, roughness: .8 }),
  };
  function joint(parent: THREE.Object3D, name: string, at: XYZ, part?: keyof MobVisualParts) {
    const node = new THREE.Group();
    node.name = `${kind}-${name}`;
    node.position.set(...at);
    parent.add(node);
    nodes.set(name, node);
    if (part) { parts[part].push(node); node.userData.bodyPart = part; }
    return node;
  }
  function box(parent: THREE.Object3D, name: string, size: XYZ, at: XYZ, material: THREE.Material = mats.hide) {
    const mesh = new THREE.Mesh(sharedBoxGeometry(), material);
    mesh.name = `${kind}-${name}`;
    mesh.position.set(...at);
    mesh.scale.set(...size);
    mesh.castShadow = !material.transparent;
    mesh.receiveShadow = true;
    mesh.userData.mobId = id;
    mesh.userData.livingShape = "hard";
    parent.add(mesh);
    nodes.set(name, mesh);
    return mesh;
  }
  function eyes(parent: THREE.Object3D, x: number, y: number, z: number, size: number) {
    for (const side of [-1, 1]) {
      const label = side < 0 ? "left" : "right";
      box(parent, `${label}-eye-socket`, [size * 1.5, size * 1.45, .045], [side * x, y, z + .015], mats.dark);
      const eye = joint(parent, `${label}-eye`, [side * x, y, z]);
      box(eye, `${label}-iris`, [size, size, .035], [0, 0, -.015], mats.amber);
      box(eye, `${label}-pupil`, [size * .42, size * .68, .02], [0, 0, -.038], mats.ink);
      box(eye, `${label}-eye-highlight`, [size * .22, size * .2, .012], [-size * .19, size * .2, -.051], mats.white);
    }
  }
  const torso = joint(visual, "body-pivot", [0, 0, 0], "body");
  return { kind, group, visual, parts, nodes, rests, mats, joint, box, eyes, torso, phase: (Math.abs(Math.trunc(finite(id))) % 97) / 97 * TAU };
}

function rillehopper(b: Rig) {
  const { box, joint, mats: m, torso } = b;
  box(torso, "body", [.69, .48, .85], [0, .61, .02]);
  box(torso, "shoulder-mass", [.65, .4, .4], [0, .57, -.29]);
  box(torso, "haunch-mass", [.74, .43, .43], [0, .56, .33]);
  box(torso, "belly", [.52, .19, .7], [0, .39, .01], m.pale);
  box(torso, "rump-frost-pad", [.52, .07, .37], [0, .87, .24], m.frost);
  for (let i = 0; i < 5; i++) {
    box(torso, `frost-crust-${i}`, [.085, .03 + (i % 2) * .025, .11], [(i - 2) * .105, .912, .2 + (i % 2) * .07], m.pale);
  }
  const head = joint(torso, "head-pivot", [0, .57, -.4], "head");
  box(head, "neck", [.37, .31, .24], [0, .01, .035]);
  box(head, "skull", [.46, .3, .31], [0, .035, -.12]);
  box(head, "brow", [.47, .075, .17], [0, .18, -.205], m.slate);
  box(head, "muzzle", [.34, .17, .2], [0, -.07, -.29], m.pale);
  box(head, "nose", [.2, .055, .04], [0, -.02, -.401], m.dark);
  const jaw = joint(head, "grazing-jaw", [0, -.125, -.25]);
  box(jaw, "jaw", [.28, .065, .2], [0, -.025, -.035], m.slate);
  for (const side of [-1, 1]) {
    box(head, `cheek-${side}`, [.12, .16, .22], [side * .2, -.03, -.15]);
    box(jaw, `frost-incisor-${side}`, [.085, .065, .055], [side * .052, .015, -.13], m.white);
    const ear = joint(head, `ear-${side}`, [side * .19, .17, .0]);
    box(ear, `ear-blade-${side}`, [.11, .2, .085], [side * .025, .08, .005], m.slate).rotation.z = -side * .23;
    box(ear, `ear-inset-${side}`, [.055, .125, .02], [side * .025, .075, -.043], m.pale);
  }
  b.eyes(head, .178, .075, -.281, .057);
  // Independent feet retain a ground reference while elastic pasterns reach the body.
  for (let i = 0; i < 4; i++) {
    const x = (i % 2 ? 1 : -1) * .255;
    const z = i < 2 ? -.29 : .31;
    const foot = joint(b.visual, `foot-${i}`, [x, 0, z], "legs");
    box(foot, `pad-${i}`, [.22, .08, .28], [0, .04, -.035], m.dark);
    box(foot, `ankle-${i}`, [.13, .11, .14], [0, .115, .02], m.pale);
    box(foot, `hock-${i}`, [.17, .1, .17], [0, .19, .055], m.slate);
    box(foot, `spring-${i}`, [.13, .29, .13], [0, .325, .04], m.hide);
    box(torso, `hip-${i}`, [.22, .19, .23], [x, .43, z + .02]);
    for (const toe of [-1, 1]) box(foot, `toe-${i}-${toe}`, [.07, .055, .07], [toe * .054, .038, -.16], m.pale);
  }
}

function vacuumLantern(b: Rig) {
  const { box, joint, mats: m, torso } = b;
  box(torso, "sealed-base", [.5, .09, .52], [0, .255, 0], m.dark);
  box(torso, "shell-crown", [.47, .12, .48], [0, .655, 0], m.slate);
  box(torso, "shell-cap", [.31, .09, .32], [0, .744, .025], m.pale);
  box(torso, "shell-ridge", [.1, .05, .29], [0, .809, .025], m.slate);
  // Six closed inset panels form a chamber; opaque corner ribs explain the seal.
  for (const side of [-1, 1]) {
    box(torso, `chamber-side-${side}`, [.025, .31, .435], [side * .22, .455, 0], m.glass);
    box(torso, `chamber-face-${side}`, [.435, .31, .025], [0, .455, side * .22], m.glass);
    box(torso, `chamber-cap-${side}`, [.435, .025, .435], [0, .455 + side * .15, 0], m.glass);
    for (const end of [-1, 1]) box(torso, `seal-rib-${side}-${end}`, [.055, .35, .055], [side * .219, .455, end * .219], m.slate);
  }
  const core = joint(torso, "luminous-core", [0, .445, 0]);
  box(core, "core", [.21, .25, .21], [0, 0, 0], m.core);
  box(core, "core-collar", [.25, .05, .25], [0, -.07, 0], m.pale);
  box(torso, "core-anchor", [.06, .35, .06], [0, .448, 0], m.core);
  const head = joint(torso, "head-pivot", [0, .215, -.23], "head");
  box(head, "face", [.26, .13, .14], [0, 0, -.015], m.pale);
  box(head, "mouth-seal", [.15, .026, .028], [0, -.045, -.096], m.dark);
  b.eyes(head, .072, .01, -.094, .045);
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const leg = joint(b.visual, `palp-${i}`, [side * .17, .19, (Math.floor(i / 2) - 1) * .16], "legs");
    box(leg, `palp-root-${i}`, [.075, .07, .085], [0, 0, 0], m.dark);
    box(leg, `palp-stalk-${i}`, [.043, .15, .048], [side * .024, -.071, -.016], m.pale).rotation.z = side * .2;
    box(leg, `palp-toe-${i}`, [.085, .05, .13], [side * .045, -.165, -.03], m.slate);
  }
}

function slatefin(b: Rig) {
  const { box, joint, mats: m, torso } = b;
  box(torso, "body", [.87, .28, .88], [0, .235, 0]);
  box(torso, "belly-keel", [.62, .1, .86], [0, .05, -.015], m.dark);
  for (let i = 0; i < 4; i++) {
    box(torso, `slate-plate-${i}`, [.94 - i * .065, .13, .29], [0, .385 - i * .017, -.34 + i * .24], i % 2 ? m.slate : m.hide).rotation.x = -.08;
    box(torso, `plate-bedding-${i}`, [.72 - i * .06, .027, .2], [0, .457 - i * .017, -.35 + i * .24], m.pale);
  }
  const head = joint(torso, "head-pivot", [0, .22, -.43], "head");
  box(head, "skull", [.56, .22, .3], [0, 0, -.055], m.slate);
  box(head, "shovel-rostrum", [.64, .1, .25], [0, -.065, -.235], m.pale);
  box(head, "mouth", [.43, .027, .06], [0, -.112, -.285], m.dark);
  box(head, "brow-shield", [.6, .09, .26], [0, .122, -.12]);
  b.eyes(head, .205, .034, -.216, .047);
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1;
    const fin = joint(torso, `fin-${i}`, [side * .4, .18, i < 2 ? -.2 : .28], "wings");
    box(fin, `fin-root-${i}`, [.2, .11, .25], [side * .06, 0, 0]);
    box(fin, `fin-shovel-${i}`, [.35, .065, .29], [side * .24, -.025, .035], m.slate);
    for (let rib = 0; rib < 3; rib++) box(fin, `fin-rib-${i}-${rib}`, [.29, .025, .04], [side * .24, .02, (rib - 1) * .087 + .025], m.pale);
  }
  let parent = torso;
  for (let i = 0; i < 3; i++) {
    const tail = joint(parent, `tail-${i}`, i === 0 ? [0, .23, .46] : [0, -.015, .245], "body");
    box(tail, `tail-segment-${i}`, [.4 - i * .09, .16 - i * .025, .29], [0, 0, .105]);
    box(tail, `tail-plate-${i}`, [.43 - i * .1, .06, .27], [0, .092 - i * .012, .1], m.slate);
    if (i === 2) box(tail, "tail-spade", [.39, .055, .22], [0, -.01, .255], m.pale);
    parent = tail;
  }
}

function morrowOwl(b: Rig) {
  const { box, joint, mats: m, torso } = b;
  box(torso, "body", [.44, .53, .4], [0, .48, .025]);
  box(torso, "breast", [.36, .37, .12], [0, .49, -.188], m.pale);
  for (let i = 0; i < 3; i++) box(torso, `breast-chevron-${i}`, [.25 - i * .04, .035, .045], [0, .57 - i * .09, -.255], m.slate);
  const head = joint(torso, "head-pivot", [0, .78, -.04], "head");
  box(head, "skull", [.52, .38, .35], [0, 0, 0]);
  for (const side of [-1, 1]) {
    box(head, `face-disc-${side}`, [.26, .3, .06], [side * .127, -.013, -.187], m.pale);
    box(head, `face-rim-${side}`, [.075, .26, .09], [side * .255, .006, -.16], m.slate);
    box(head, `brow-${side}`, [.27, .066, .075], [side * .126, .14, -.205], m.white).rotation.z = -side * .14;
    box(head, `cheek-${side}`, [.18, .055, .07], [side * .125, -.155, -.177], m.frost);
  }
  box(head, "beak-root", [.105, .13, .08], [0, -.072, -.217], m.dark);
  box(head, "beak-tip", [.063, .08, .1], [0, -.124, -.26], m.amber).rotation.x = -.2;
  b.eyes(head, .129, .007, -.232, .122);
  for (const side of [-1, 1]) {
    const wing = joint(torso, `wing-${side}`, [side * .215, .65, .045], "wings");
    box(wing, `shoulder-${side}`, [.3, .2, .31], [side * .1, 0, 0]);
    box(wing, `leading-edge-${side}`, [.65, .09, .14], [side * .39, .027, -.108], m.slate);
    box(wing, `span-${side}`, [.62, .08, .4], [side * .41, -.02, .075]);
    const tip = joint(wing, `wingtip-${side}`, [side * .64, 0, .03]);
    for (let i = 0; i < 4; i++) {
      box(tip, `primary-${side}-${i}`, [.25 + i * .06, .06, .105], [side * (.1 + i * .012), -.012 * i, -.09 + i * .098], i % 2 ? m.slate : m.hide).rotation.y = -side * (.13 + i * .09);
      box(wing, `covert-${side}-${i}`, [.13, .043, .3], [side * (.19 + i * .12), .048, .085], i % 2 ? m.slate : m.hide);
    }
    const foot = joint(b.visual, `foot-${side}`, [side * .115, 0, .015], "legs");
    box(foot, `feather-ankle-${side}`, [.12, .23, .13], [0, .2, .005]);
    box(foot, `talon-pad-${side}`, [.14, .09, .16], [0, .085, -.025], m.dark);
    for (let toe = 0; toe < 3; toe++) box(foot, `talon-${side}-${toe}`, [.035, .045, .16], [(toe - 1) * .048, .0225, -.08], m.amber);
  }
  const tail = joint(torso, "tail", [0, .275, .19], "body");
  for (let i = 0; i < 3; i++) box(tail, `tail-feather-${i}`, [.11, .065, .33], [(i - 1) * .085, 0, .115], i === 1 ? m.pale : m.slate);
  const veil = joint(torso, "dream-veil", [0, .59, .18]);
  for (const side of [-1, 1]) {
    box(veil, `veil-anchor-${side}`, [.095, .07, .075], [side * .2, 0, 0], m.frost);
    for (let i = 0; i < 3; i++) box(veil, `veil-ribbon-${side}-${i}`, [.39, .018, .12], [side * (.31 + i * .25), -.06 * i, .09 + i * .05], m.veil).rotation.z = -side * .17;
  }
  veil.visible = false;
}

/** Authored scale is world blocks, neutral contact Y=0, nose/face toward -Z. */
export function createMorrowCreatureVisual(kind: MorrowVisualKind, id: number): MobVisual {
  const b = builder(kind, id);
  switch (kind) {
    case "rillehopper": rillehopper(b); break;
    case "vacuum-lantern": vacuumLantern(b); break;
    case "slatefin-burrower": slatefin(b); break;
    case "morrow-owl": morrowOwl(b); break;
    default: throw new Error(`Unknown Morrow visual kind: ${String(kind)}`);
  }
  for (const node of b.nodes.values()) b.rests.set(node, { position: node.position.clone(), rotation: node.rotation.clone(), scale: node.scale.clone() });
  rigs.set(b.visual, b);
  rigs.set(b.group, b);
  return { group: b.group, visual: b.visual, parts: b.parts };
}

/**
 * Absolute seconds, normalized movement and alertness. Never changes the world
 * root or the visual anchor. Alert burrow is cosmetic; physics owns real depth.
 * A live factory-created visual (or its group) is required; clones return false.
 */
export function applyMorrowCreaturePose(visual: THREE.Object3D, kind: MorrowVisualKind, time: number, travel: number, alert: number, veilActive?: boolean): boolean {
  const b = rigs.get(visual);
  if (!b || b.kind !== kind) return false;
  // Bound even adversarial finite inputs before multiplying wave frequencies.
  const t = THREE.MathUtils.clamp(finite(time), -1e9, 1e9);
  const move = unit(travel);
  const aware = unit(alert);
  const phase = b.phase;
  for (const [node, rest] of b.rests) {
    node.position.copy(rest.position);
    node.rotation.copy(rest.rotation);
    node.scale.copy(rest.scale);
  }
  const node = (name: string) => b.nodes.get(name)!;
  const head = node("head-pivot");
  head.rotation.y = Math.sin(t * .65 + phase) * .09 * (1 - move) * (1 + aware);
  if (kind === "rillehopper") {
    const bounce = move * (.045 + .035 * Math.sin(t * 3 + phase));
    b.torso.position.y = bounce;
    head.rotation.x = .09 * (1 - move) * (1 - aware) - aware * .19;
    node("grazing-jaw").rotation.x = Math.max(0, Math.sin(t * 3.6 + phase)) * .14 * (1 - move) * (1 - aware);
    for (let i = 0; i < 4; i++) {
      const cycle = ((t * .6 + phase / TAU - i / 4) % 1 + 1) % 1;
      // One foot launches at a time. Long planted interval, slow low-G arc.
      const lift = cycle < .25 ? Math.sin(cycle * 4 * Math.PI) * .13 * move : 0;
      node(`foot-${i}`).position.y = lift;
      const spring = node(`spring-${i}`);
      spring.scale.y = .29 + bounce - lift;
      spring.position.y = .18 + spring.scale.y * .5;
    }
    for (const side of [-1, 1]) node(`ear-${side}`).rotation.z = -side * (.07 + aware * .21 + Math.sin(t * 1.4 + phase) * .035);
  } else if (kind === "vacuum-lantern") {
    const pulse = 1 + Math.sin(t * 1.7 + phase) * .06;
    node("luminous-core").scale.set(pulse, 1 / pulse, pulse);
    b.mats.core.emissiveIntensity = .64 + Math.sin(t * 1.7 + phase) * .14 + aware * .15;
    b.torso.position.y = -aware * .015;
    head.rotation.x = aware * .16;
    for (let i = 0; i < 6; i++) {
      const wave = Math.sin(t * 3.1 + phase - Math.floor(i / 2) * 1.3 + (i % 2) * Math.PI);
      node(`palp-${i}`).rotation.x = wave * (.025 + move * .13);
      node(`palp-${i}`).position.y += Math.max(0, wave) * move * .035;
    }
  } else if (kind === "slatefin-burrower") {
    b.torso.position.y = -aware * .17;
    b.torso.rotation.x = -aware * .12;
    head.rotation.x = Math.sin(t * 1.1 + phase) * .035 + aware * .16;
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1;
      const wave = Math.sin(t * 3.2 + phase - Math.floor(i / 2) * 1.3);
      node(`fin-${i}`).rotation.y = side * wave * (.025 + move * .28 + aware * .13);
      node(`fin-${i}`).rotation.z = side * (.025 + Math.cos(t * 3.2 + phase - i) * move * .12);
    }
    for (let i = 0; i < 3; i++) node(`tail-${i}`).rotation.y = Math.sin(t * 2.6 + phase - i * .65) * (.03 + move * .2);
  } else {
    head.rotation.z = Math.sin(t * .47 + phase) * .07 * (1 - move) * (1 + aware);
    head.rotation.x = -aware * .08;
    b.torso.position.y = move * (.12 + Math.sin(t * 2.1 + phase) * .035);
    for (const side of [-1, 1]) {
      node(`wing-${side}`).rotation.z = side * (-.27 * (1 - move) + Math.sin(t * 2.1 + phase) * .38 * move + aware * .1);
      node(`wingtip-${side}`).rotation.z = side * Math.sin(t * 2.1 + phase - .48) * .15 * move;
      node(`foot-${side}`).position.y = move * .085;
    }
    node("tail").rotation.x = -.1 * move + Math.sin(t * 1.2 + phase) * .025;
    const blink = ((t + phase) % 7 + 7) % 7;
    for (const side of ["left", "right"]) node(`${side}-eye`).scale.y = blink < .12 ? .16 + .84 * Math.abs(blink / .06 - 1) : 1;
    // A short, rare crossing envelope: at most 1.1 seconds in each 15 seconds.
    const veilClock = ((t + phase * 2) % 15 + 15) % 15;
    const veilPulse = veilActive === undefined ? move > .15 && veilClock < 1.1 ? Math.sin(veilClock / 1.1 * Math.PI) : 0
      : veilActive ? .8 + Math.sin(t * 2) * .12 : 0;
    node("dream-veil").visible = veilPulse > .001;
    b.mats.veil.opacity = veilPulse * .38;
    node("dream-veil").scale.setScalar(1 + veilPulse * .08);
  }
  return true;
}
