import * as THREE from "three";
import { Item, type ItemCode } from "./data";

const WAYWORKS_ITEMS: readonly ItemCode[] = [
  Item.CrushedIron, Item.EnrichedIron, Item.StoneDust, Item.MachineAlloy,
  Item.IronSheet, Item.CopperSheet, Item.Sawdust, Item.BiofuelPellet,
  Item.FluidCanister, Item.GasCylinder, Item.SpeedModule, Item.EfficiencyModule,
  Item.CapacityModule, Item.FilterModule, Item.MufflingModule, Item.SealModule, Item.ThermalModule,
];

export function isWayworksItem(item: ItemCode): boolean {
  return WAYWORKS_ITEMS.includes(item);
}

/** Authored portable Wayworks parts. Bounds are centered at the hand/drop origin;
 * the broad feature face looks toward -Z. No textures, shared GPU resources, or
 * renderer state are required. Dispose unique geometry/material sets by normal
 * traversal of this instance (materials may be shared within one instance).
 */
export function createWayworksItemModel(item: ItemCode): THREE.Group | null {
  if (!isWayworksItem(item)) return null;
  const root = new THREE.Group();
  root.name = `wayworks-item-${item}`;
  const surfaces = new Map<number, THREE.MeshStandardMaterial>();
  const surface = (color: number) => {
    let material = surfaces.get(color);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: .08, emissive: color, emissiveIntensity: .09 });
      surfaces.set(color, material);
    }
    return material;
  };
  const mesh = (name: string, geometry: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0) => {
    const part = new THREE.Mesh(geometry, surface(color));
    part.name = name;
    part.position.set(x, y, z);
    part.castShadow = part.receiveShadow = true;
    root.add(part);
    return part;
  };
  const box = (name: string, w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0) =>
    mesh(name, new THREE.BoxGeometry(w, h, d), color, x, y, z);
  const cylinder = (name: string, radius: number, height: number, color: number, x = 0, y = 0, z = 0) =>
    mesh(name, new THREE.CylinderGeometry(radius, radius, height, 12), color, x, y, z);
  const ring = (name: string, radius: number, tube: number, color: number, x = 0, y = 0, z = 0) =>
    mesh(name, new THREE.TorusGeometry(radius, tube, 6, 16), color, x, y, z);
  const iron = 0xb3c1bc;
  const dark = 0x35494b;
  const brass = 0xd0b778;
  const copper = 0xcf9063;

  if (item === Item.CrushedIron || item === Item.EnrichedIron) {
    const enriched = item === Item.EnrichedIron;
    const chunks = [[-.13, -.07, .03], [.11, -.08, .03], [0, .11, 0], [-.09, .02, -.12], [.13, .06, -.09]];
    chunks.forEach(([x, y, z], index) => {
      const chunk = mesh(enriched ? "enriched-metal-grain" : "crushed-rust-rock", new THREE.DodecahedronGeometry(.12 - index * .008), enriched ? 0xd2b7a2 : 0xa9755d, x, y, z);
      chunk.scale.set(1, enriched ? .8 : 1.1, .85);
      chunk.rotation.set(index * .7, index * .4, index * .9);
      mesh(enriched ? "bright-refined-facet" : "iron-ore-fleck", new THREE.OctahedronGeometry(enriched ? .049 : .033), enriched ? 0xe3d5c2 : 0xc3a28e, x, y + .01, z - .08);
    });
  } else if (item === Item.StoneDust || item === Item.Sawdust) {
    const wood = item === Item.Sawdust;
    // Open shallow scoop retains loose material, giving dust a useful silhouette.
    box("powder-scoop-floor", .39, .035, .29, dark, 0, -.11);
    for (const side of [-1, 1]) box("powder-scoop-side", .025, .105, .29, iron, side * .19, -.07);
    box("powder-scoop-back", .39, .105, .025, iron, 0, -.07, .14);
    box("powder-scoop-handle", .075, .04, .18, wood ? 0x8c6947 : iron, 0, -.1, .22);
    const mound = mesh(wood ? "sawdust-mound" : "stone-dust-mound", new THREE.SphereGeometry(.16, 8, 4), wood ? 0xb99a69 : 0xa5aaa2, 0, -.04, 0);
    mound.scale.set(1.1, .48, .8);
    for (let i = 0; i < 7; i += 1) {
      const x = ((i * 5) % 7 - 3) * .043;
      const z = ((i * 3) % 5 - 2) * .035;
      if (wood) {
        const shaving = box("wood-shaving", .07, .018, .025, i % 2 ? 0xe0c69c : 0x927147, x, .017, z);
        shaving.rotation.set(.3, i * .9, .16);
      } else mesh("dust-granule", new THREE.OctahedronGeometry(.026), 0xd0d1bd, x, .012, z);
    }
  } else if (item === Item.MachineAlloy) {
    // Six sides make the refined billet distinct from ordinary rectangular ingots.
    const ingot = mesh("hexagonal-alloy-billet", new THREE.CylinderGeometry(.19, .19, .42, 6), brass);
    ingot.rotation.z = Math.PI / 2;
    for (const x of [-.14, .14]) box("alloy-assay-band", .025, .31, .35, iron, x);
    box("alloy-stamped-inset", .1, .085, .025, dark, 0, 0, -.176);
    box("alloy-stamp", .04, .04, .014, brass, 0, 0, -.195).rotation.z = Math.PI / 4;
  } else if (item === Item.IronSheet || item === Item.CopperSheet) {
    const color = item === Item.IronSheet ? 0xccd1c9 : copper;
    for (let i = 0; i < 3; i += 1) {
      const plate = box("rolled-metal-sheet", .43, .36, .022, color, (i - 1) * .025, (i - 1) * .026, (i - 1) * .032);
      plate.rotation.z = (i - 1) * .08;
    }
    box("sheet-edge-fold", .04, .36, .05, color, -.2, -.026, -.04);
    for (const x of [-.14, .12]) cylinder("sheet-rivet", .014, .012, dark, x, .11, -.055).rotation.x = Math.PI / 2;
  } else if (item === Item.BiofuelPellet) {
    for (let i = 0; i < 3; i += 1) {
      const x = (i - 1) * .12;
      const pellet = cylinder("compressed-biofuel-pellet", .072, .31, i === 1 ? 0x94aa6d : 0x73894d, x, i === 1 ? .04 : 0);
      pellet.rotation.z = (i - 1) * .18;
      box("pellet-fiber-seam", .015, .21, .015, 0xc5ca8c, x, 0, -.069).rotation.z = (i - 1) * .18;
    }
    box("pellet-paper-band", .36, .075, .17, 0xcfb785, 0, -.045);
  } else if (item === Item.FluidCanister) {
    box("rectangular-fluid-vessel", .38, .43, .24, 0x84b3b5, 0, -.025);
    for (const y of [-.22, .17]) box("canister-reinforced-rim", .4, .04, .26, iron, 0, y);
    box("canister-neck", .11, .06, .11, dark, -.105, .225);
    cylinder("canister-sealed-cap", .073, .036, brass, -.105, .273);
    for (const x of [.035, .16]) box("canister-handle-upright", .032, .115, .047, dark, x, .237, .025);
    box("canister-handle-bridge", .155, .033, .047, dark, .0975, .294, .025);
    box("fluid-level-recess", .09, .25, .016, dark, 0, -.005, -.128);
    box("fluid-level-sight-strip", .042, .19, .018, 0xb3e2d8, 0, -.025, -.141);
    for (const y of [-.09, -.025, .04]) box("fluid-level-tick", .04, .009, .02, brass, .067, y, -.131);
  } else if (item === Item.GasCylinder) {
    cylinder("round-gas-pressure-vessel", .155, .43, 0xc2c8a9, 0, -.045);
    for (const y of [-.26, .17]) {
      const dome = mesh("gas-cylinder-domed-end", new THREE.SphereGeometry(.155, 12, 6), 0xc2c8a9, 0, y);
      dome.scale.y = .45;
    }
    cylinder("gas-cylinder-foot", .165, .04, dark, 0, -.285);
    cylinder("gas-cylinder-neck", .056, .09, iron, 0, .26);
    box("gas-valve-crossbar", .2, .028, .047, brass, 0, .323);
    cylinder("gas-valve-stem", .024, .057, dark, 0, .313);
    const outlet = cylinder("gas-outlet", .034, .075, brass, .058, .261);
    outlet.rotation.z = Math.PI / 2;
    cylinder("gas-hazard-band", .16, .07, 0x927d40, 0, .075);
    box("gas-pressure-label", .085, .13, .018, dark, 0, -.08, -.151);
    for (let i = 0; i < 3; i += 1) box("gas-pressure-mark", .05, .012, .012, 0xd8dfbf, 0, -.12 + i * .04, -.165);
  } else {
    const accents: Partial<Record<ItemCode, number>> = {
      [Item.SpeedModule]: 0xd0a468, [Item.EfficiencyModule]: 0x96b885,
      [Item.CapacityModule]: 0x7faeba, [Item.FilterModule]: 0xc5b784,
      [Item.MufflingModule]: 0xa899b0, [Item.SealModule]: 0x7fbfb1,
      [Item.ThermalModule]: 0xc59873,
    };
    const accent = accents[item]!;
    box("module-chassis", .37, .35, .095, dark);
    box("module-faceplate", .32, .3, .025, accent, 0, 0, -.06);
    for (const x of [-.165, .165]) box("module-edge-rail", .035, .38, .12, iron, x);
    for (let i = 0; i < 4; i += 1) box("module-contact-pin", .04, .075, .03, brass, -.105 + i * .07, -.2, .012);
    // Rear solder rails keep a readable hardware surface when viewed from behind.
    for (const x of [-.1, .1]) box("module-rear-trace", .025, .23, .014, brass, x, 0, .055);
    if (item === Item.SpeedModule) {
      cylinder("speed-coil-core", .051, .22, dark, 0, .025, -.125).rotation.z = Math.PI / 2;
      for (let i = 0; i < 7; i += 1) ring("speed-copper-coil", .055, .012, copper, -.09 + i * .03, .025, -.125).rotation.y = Math.PI / 2;
      for (const x of [-.06, .04]) {
        const arrow = box("speed-chevron", .065, .023, .02, brass, x, -.099, -.087);
        arrow.rotation.z = -.55;
      }
    } else if (item === Item.EfficiencyModule) {
      for (const side of [-1, 1]) {
        const leaf = mesh("efficiency-leaf", new THREE.SphereGeometry(.082, 6, 4), 0xc0d79d, side * .046, .025, -.104);
        leaf.scale.set(.58, 1.35, .35);
        leaf.rotation.z = -side * .52;
      }
      box("efficiency-stem", .02, .17, .018, dark, 0, -.025, -.127);
      box("efficiency-transformer", .21, .048, .066, iron, 0, -.105, -.097);
    } else if (item === Item.CapacityModule) {
      for (const x of [-.09, 0, .09]) {
        cylinder("capacity-reservoir", .039, .2, 0xb7d8dc, x, .025, -.111);
        cylinder("capacity-terminal", .023, .034, brass, x, .142, -.111);
      }
      box("capacity-busbar", .27, .025, .025, brass, 0, -.102, -.145);
    } else if (item === Item.FilterModule) {
      box("filter-dark-backing", .255, .23, .022, dark, 0, .018, -.09);
      for (let i = 0; i < 5; i += 1) {
        box("filter-mesh-vertical", .013, .22, .014, 0xe1d4a9, -.1 + i * .05, .018, -.112);
        box("filter-mesh-horizontal", .235, .013, .014, 0xe1d4a9, 0, -.082 + i * .05, -.121);
      }
    } else if (item === Item.MufflingModule) {
      for (let i = 0; i < 4; i += 1) {
        const baffle = box("muffling-felt-baffle", .265, .036, .09, i % 2 ? 0x7a6d85 : 0xc7b8cb, 0, -.092 + i * .064, -.11);
        baffle.rotation.y = i % 2 ? .12 : -.12;
      }
    } else if (item === Item.SealModule) {
      ring("seal-rubber-gasket", .095, .029, 0x253e3c, 0, .012, -.105);
      ring("seal-retainer-ring", .126, .012, 0xc5e0ca, 0, .012, -.1);
      for (const x of [-.12, .12]) box("seal-clamp", .045, .065, .047, brass, x, .012, -.119);
    } else if (item === Item.ThermalModule) {
      box("thermal-copper-base", .28, .25, .04, copper, 0, .015, -.092);
      for (let i = 0; i < 5; i += 1) box("thermal-cooling-fin", .024, .24, .1, iron, -.112 + i * .056, .015, -.153);
      box("thermal-heat-pipe", .3, .033, .035, copper, 0, -.117, -.165);
    }
  }

  // Center actual geometry rather than maintaining offsets in each consumer.
  const center = new THREE.Box3().setFromObject(root, true).getCenter(new THREE.Vector3());
  for (const child of root.children) child.position.sub(center);
  root.updateMatrixWorld(true);
  return root;
}
