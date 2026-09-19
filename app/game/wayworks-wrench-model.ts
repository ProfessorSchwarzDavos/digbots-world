import * as THREE from "three";

/** Field Wrench authored in hand space: grip at origin, jaws toward +Y,
 * broad readable face toward -Z. All GPU resources belong to this instance;
 * dispose unique geometry/material sets by traversing the returned group.
 */
export function createFieldWrenchModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = "field-wrench";
  const material = (color: number, roughness = .6) => new THREE.MeshStandardMaterial({
    color, metalness: .08, roughness, emissive: color, emissiveIntensity: .12,
  });
  const iron = material(0x91a4a6);
  const brass = material(0xdac088, .45);
  const leather = material(0x826045, .94);
  const dark = material(0x3e5558);
  const teal = material(0x53a99b);
  const mesh = (name: string, geometry: THREE.BufferGeometry, surface: THREE.Material, x: number, y: number, z: number) => {
    const part = new THREE.Mesh(geometry, surface);
    part.name = name;
    part.position.set(x, y, z);
    part.castShadow = true;
    part.receiveShadow = true;
    root.add(part);
    return part;
  };
  const box = (name: string, w: number, h: number, d: number, surface: THREE.Material, x: number, y: number, z: number) =>
    mesh(name, new THREE.BoxGeometry(w, h, d), surface, x, y, z);

  box("forged-wrench-shank", .074, .57, .056, iron, 0, .105, 0);
  box("leather-wrapped-grip", .096, .27, .072, leather, 0, -.055, 0);
  for (let i = 0; i < 6; i += 1) {
    const binding = box("grip-binding", .102, .014, .08, dark, 0, -.163 + i * .044, 0);
    binding.rotation.z = -.1;
  }
  for (const y of [-.202, .098]) box("grip-brass-ferrule", .102, .025, .078, brass, 0, y, 0);
  const tether = mesh("wrench-tether-eye", new THREE.TorusGeometry(.038, .011, 6, 12), brass, 0, -.235, 0);
  tether.scale.x = .8;

  // The jaw is an open fork, with a visibly separate sliding lower block and
  // knurled adjustment wheel; the negative space is real geometry.
  box("wrench-head-bridge", .23, .1, .085, iron, .025, .365, 0);
  const fixed = box("wrench-fixed-jaw", .065, .17, .085, iron, -.082, .452, 0);
  fixed.rotation.z = -.16;
  box("wrench-fixed-jaw-tip", .078, .04, .085, brass, -.052, .532, 0);
  box("wrench-adjustable-jaw", .063, .115, .085, iron, .124, .432, 0);
  box("wrench-moving-jaw-tip", .077, .038, .085, brass, .106, .492, 0);
  box("wrench-adjustment-track", .2, .024, .012, dark, .023, .364, -.05);
  const adjuster = mesh("wrench-knurled-adjuster", new THREE.CylinderGeometry(.031, .031, .075, 12), brass, .029, .324, -.031);
  adjuster.rotation.z = Math.PI / 2;
  for (const x of [.005, .022, .039, .056]) {
    const knurl = mesh("adjuster-knurl", new THREE.TorusGeometry(.033, .005, 4, 12), dark, x, .324, -.031);
    knurl.rotation.y = Math.PI / 2;
  }
  box("field-mode-selector-recess", .047, .097, .012, dark, 0, .207, -.034);
  for (let i = 0; i < 3; i += 1) box(`field-mode-mark-${i}`, .027, .008, .008, i === 1 ? teal : brass, 0, .18 + i * .026, -.044);
  return root;
}
