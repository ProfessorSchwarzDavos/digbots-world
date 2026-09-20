import * as THREE from "three";
import { Item, type ItemCode } from "./data";

export const PRESSURE_PARTS = [Item.HabitatFilter, Item.SpentHabitatFilter, Item.CarbonPowder, Item.CeramicMembrane, Item.PressurePolymer] as const;
export const isPressurePart = (item: ItemCode) => (PRESSURE_PARTS as readonly number[]).includes(item);

/** Shared held/drop silhouettes. Each instance owns its geometry and materials. */
export function createPressurePartModel(item: ItemCode): THREE.Group {
  if (!isPressurePart(item)) throw new Error("Unknown pressure part");
  const root = new THREE.Group(); root.name = `pressure-part-${item}`;
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  const box = (name: string, size: [number, number, number], point: [number, number, number], color: number) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: .08 }));
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), materials.get(color)); mesh.name = name; mesh.position.set(...point); root.add(mesh); return mesh;
  };
  const dark = 0x34474a, brass = 0xd4b477, ceramic = 0xd1c9af;
  if (item === Item.HabitatFilter || item === Item.SpentHabitatFilter) {
    const spent = item === Item.SpentHabitatFilter;
    box("cartridge-shell", [.32, .42, .22], [0, 0, 0], dark);
    for (const y of [-.18, .18]) box("retaining-cap", [.36, .055, .25], [0, y, 0], brass);
    for (let i = 0; i < 7; i++) box("filter-pleat", [.028, .27, .035], [-.126 + i * .042, 0, -.125], spent ? 0x72685c : ceramic);
    box(spent ? "spent-stripe" : "fresh-stripe", [.22, .035, .025], [0, -.115, -.148], spent ? 0xc28266 : 0x88b59a);
  } else if (item === Item.CarbonPowder) {
    box("carbon-tin", [.3, .3, .26], [0, -.035, 0], dark);
    box("tin-rim", [.33, .035, .29], [0, .115, 0], brass);
    for (let i = 0; i < 9; i++) box("carbon-grain", [.065, .045, .065], [i % 3 * .075 - .075, .13 + (i % 2) * .025, Math.floor(i / 3) * .075 - .075], 0x242d2c);
  } else if (item === Item.CeramicMembrane) {
    for (const x of [-.18, .18]) box("membrane-border", [.035, .39, .065], [x, 0, 0], brass);
    for (const y of [-.18, .18]) box("membrane-border", [.39, .035, .065], [0, y, 0], brass);
    for (let i = -2; i <= 2; i++) { box("porous-ceramic", [.025, .33, .04], [i * .06, 0, 0], ceramic); box("porous-ceramic", [.33, .025, .04], [0, i * .06, 0], ceramic); }
  } else {
    box("polymer-bundle", [.29, .3, .22], [0, 0, 0], 0xa2bdaf);
    for (let i = -2; i <= 2; i++) box("layered-polymer", [.32, .025, .25], [0, i * .06, 0], i % 2 ? 0x789b89 : 0xc1d1b3);
    box("bundle-strap", [.045, .34, .28], [0, 0, 0], brass);
  }
  root.updateMatrixWorld(true); return root;
}
