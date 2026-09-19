import * as THREE from "three";
import { BLOCKS, BlockId, Item, ITEMS, type ItemCode } from "./data";
import { createButterflyVisual } from "./butterflies";
import { BUTTERFLY_ORDER, type ButterflyKind } from "./mobs";
import { createHeldToolSpec } from "./model-specs";
import { itemPresentationFamily } from "./item-presentation";
import { createAtlasBlockGeometry, createAtlasTilePlaneGeometry } from "./world";

export type DragonEquipmentElement = "fire" | "ice" | "steel" | "sea" | "gold" | "silver";

/** Shared palette contract for inventory, dropped and hand-held dragon tack. */
export const DRAGON_EQUIPMENT_PALETTES: Readonly<Record<DragonEquipmentElement, Readonly<{
  primary: number;
  dark: number;
  light: number;
  accent: number;
}>>> = Object.freeze({
  fire: Object.freeze({ primary: 0xc43f2b, dark: 0x351b1a, light: 0xf47b3f, accent: 0xffcf6a }),
  ice: Object.freeze({ primary: 0x83d4ea, dark: 0x355f7b, light: 0xe1fbff, accent: 0x9af4ff }),
  steel: Object.freeze({ primary: 0x73818a, dark: 0x30383d, light: 0xb5c0c5, accent: 0xe2a65e }),
  sea: Object.freeze({ primary: 0x43bfc1, dark: 0x164f61, light: 0x96f2dc, accent: 0xff879d }),
  gold: Object.freeze({ primary: 0xe2ad2e, dark: 0x71371f, light: 0xffe98b, accent: 0xfffbd0 }),
  silver: Object.freeze({ primary: 0xaec6df, dark: 0x34445f, light: 0xf2f8ff, accent: 0xa7d9ff }),
});

/** Shared first/third-person, remote-player, dropped-item, and paper-doll model. */
export function createAvatarHeldItemModel(item: ItemCode, options: { filledCaptureOrb?: boolean; atlas?: THREE.Texture } = {}) {
  const definition = ITEMS[item];
  if (!definition) return null;
  const group = new THREE.Group();
  group.name = `avatar-held-${definition.name.toLowerCase().replace(/\s+/g, "-")}`;
  const worldTextureDefinition = definition.worldTextureBlock !== undefined ? BLOCKS[definition.worldTextureBlock] : undefined;
  const worldTextureUsesPlane = Boolean(worldTextureDefinition
    && (!worldTextureDefinition.solid || (worldTextureDefinition.shape && worldTextureDefinition.shape !== "cube")));
  const addBox = (
    size: [number, number, number],
    position: [number, number, number],
    color: string | number,
    rotation: [number, number, number] = [0, 0, 0],
    emissive = false,
    parent: THREE.Object3D = group,
  ) => {
    const material = emissive ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  };
  const addSphere = (radius: number, position: [number, number, number], color: string | number, emissive = false, parent: THREE.Object3D = group) => {
    const material = emissive ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), material);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  };
  const addCylinder = (
    radius: number,
    height: number,
    position: [number, number, number],
    color: string | number,
    rotation: [number, number, number] = [0, 0, 0],
    emissive = false,
    parent: THREE.Object3D = group,
  ) => {
    const material = emissive ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    parent.add(mesh);
    return mesh;
  };

  if (definition.worldTextureBlock !== undefined && worldTextureUsesPlane) {
    const block = BLOCKS[definition.worldTextureBlock];
    const material = () => {
      const settings = {
        ...(options.atlas ? { map: options.atlas } : {}),
        color: options.atlas ? 0xffffff : definition.color,
        alphaTest: options.atlas ? 0.18 : 0,
        transparent: Boolean(options.atlas),
        side: THREE.DoubleSide,
      } as const;
      return block.layer === "emissive" ? new THREE.MeshBasicMaterial(settings) : new THREE.MeshLambertMaterial(settings);
    };
    for (const [name, rotationY] of [["a", 0], ["b", Math.PI / 2]] as const) {
      const plane = new THREE.Mesh(createAtlasTilePlaneGeometry(definition.worldTextureBlock), material());
      plane.name = `world-texture-${definition.worldTextureBlock}-plane-${name}`;
      plane.rotation.y = rotationY;
      plane.position.y = 0.02;
      group.add(plane);
    }
    group.userData.worldTextureBlock = definition.worldTextureBlock;
    group.scale.setScalar(0.88);
    group.rotation.set(0.08, 0.32, -0.12);
  } else if (definition.lifeSupportKind && definition.lifeSupportKind !== "weave") {
    const kind = definition.lifeSupportKind;
    const primary = new THREE.Color(definition.color);
    const dark = primary.clone().multiplyScalar(0.5).getHex();
    const light = primary.clone().lerp(new THREE.Color(0xffffff), 0.35).getHex();
    const brass = 0xb99a62;
    const ceramic = 0xdce1d7;
    const charcoal = 0x34464a;
    const addOxygenCylinder = (name: string, x: number, height: number, radius: number, centerY = 0.04) => {
      addCylinder(radius, height, [x, centerY, 0.04], ceramic).name = `${name}-body`;
      for (const bandY of [centerY - height * 0.29, centerY + height * 0.29]) {
        addCylinder(radius + 0.008, 0.035, [x, bandY, 0.04], brass).name = `${name}-band-${bandY < centerY ? "lower" : "upper"}`;
      }
      addCylinder(radius * 0.45, 0.07, [x, centerY + height / 2 + 0.035, 0.04], charcoal).name = `${name}-valve`;
    };
    if (kind === "helmet") {
      addBox([0.49, 0.31, 0.43], [0, 0.07, 0], primary.getHex()).name = "life-support-helmet-shell";
      addBox([0.53, 0.075, 0.47], [0, -0.12, 0], brass).name = "life-support-helmet-seal";
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.19, 0.026), new THREE.MeshLambertMaterial({ color: 0x8fcbd5, transparent: true, opacity: 0.75, depthWrite: false }));
      visor.name = "life-support-helmet-visor";
      visor.position.set(0, 0.075, -0.235);
      group.add(visor);
      addBox([0.46, 0.04, 0.04], [0, 0.18, -0.235], charcoal).name = "life-support-helmet-visor-brow";
    } else if (kind === "tank") {
      addOxygenCylinder("life-support-single-cylinder", 0, 0.55, 0.155);
      addBox([0.38, 0.42, 0.055], [0, 0.03, 0.2], dark).name = "life-support-single-back-plate";
      addBox([0.42, 0.055, 0.32], [0, -0.09, 0.08], brass).name = "life-support-single-retaining-strap";
    } else if (kind === "harness" || kind === "rig" || kind === "spell-rig" || kind === "dive") {
      const dive = kind === "dive";
      addBox([0.47, 0.49, 0.065], [0, 0.025, 0.17], dark).name = `life-support-${kind}-frame`;
      for (const side of [-1, 1]) {
        addBox([0.065, 0.49, 0.075], [side * 0.22, 0.025, 0.19], charcoal).name = `life-support-${kind}-harness-strap-${side}`;
        if (!dive) addOxygenCylinder(`life-support-${kind}-cylinder-${side}`, side * 0.145, 0.5, 0.105);
      }
      if (dive) {
        addOxygenCylinder("life-support-dive-cylinder", 0, 0.35, 0.135, 0.01);
        addBox([0.28, 0.1, 0.11], [0, 0.24, 0.06], charcoal).name = "life-support-dive-regulator";
        for (const side of [-1, 1]) addBox([0.035, 0.31, 0.035], [side * 0.19, 0.015, 0.04], charcoal).name = `life-support-dive-hose-${side}`;
      } else if (kind === "rig" || kind === "spell-rig") {
        for (const side of [-1, 1]) {
          const x = side * 0.145;
          addCylinder(0.105, 0.12, [x, -0.29, 0.04], charcoal).name = `life-support-${kind}-thruster-${side}`;
          addCylinder(0.112, 0.025, [x, -0.36, 0.04], brass).name = `life-support-${kind}-nozzle-rim-${side}`;
          addCylinder(0.065, 0.012, [x, -0.38, 0.04], kind === "spell-rig" ? 0xab91e5 : 0x192a2f, [0, 0, 0], kind === "spell-rig").name = `life-support-${kind}-nozzle-port-${side}`;
        }
        if (kind === "spell-rig") addBox([0.15, 0.15, 0.04], [0, 0.025, -0.09], 0xab91e5, [0, 0, Math.PI / 4], true).name = "life-support-spell-rig-focus";
      }
    } else if (kind === "boots") {
      for (const side of [-1, 1]) {
        const x = side * 0.16;
        addBox([0.26, 0.24, 0.4], [x, 0, 0], primary.getHex()).name = `life-support-magnetic-boot-${side}`;
        addBox([0.28, 0.055, 0.42], [x, -0.11, 0], charcoal).name = `life-support-magnetic-sole-${side}`;
        for (const y of [-0.035, 0.075]) addBox([0.28, 0.035, 0.42], [x, y, 0], brass).name = `life-support-magnetic-band-${side}-${y}`;
      }
    } else if (kind === "tether") {
      addCylinder(0.16, 0.19, [0, 0.02, 0], dark, [Math.PI / 2, 0, 0]).name = "life-support-tether-wound-line";
      for (const z of [-0.12, 0.12]) addCylinder(0.23, 0.035, [0, 0.02, z], brass, [Math.PI / 2, 0, 0]).name = `life-support-tether-spool-flange-${z}`;
      addCylinder(0.07, 0.3, [0, 0.02, 0], charcoal, [Math.PI / 2, 0, 0]).name = "life-support-tether-axle";
      addBox([0.1, 0.08, 0.16], [0.26, 0.05, 0], light).name = "life-support-tether-clip";
    } else if (kind === "reserve") {
      addOxygenCylinder("life-support-field-reserve", 0, 0.4, 0.12);
      addBox([0.21, 0.07, 0.07], [0, 0.04, -0.12], primary.getHex()).name = "life-support-reserve-label";
    } else if (kind === "cell") {
      addCylinder(0.135, 0.37, [0, 0.03, 0], dark).name = "life-support-power-cell-body";
      for (const y of [-0.14, 0.2]) addCylinder(0.15, 0.065, [0, y, 0], brass).name = `life-support-power-cell-terminal-${y}`;
      addBox([0.13, 0.27, 0.035], [0, 0.03, -0.135], 0xd9bd76, [0, 0, 0], true).name = "life-support-power-cell-charge-strip";
    } else if (kind === "scrubber") {
      addBox([0.37, 0.39, 0.23], [0, 0.02, 0], primary.getHex()).name = "life-support-scrubber-casing";
      for (const y of [-0.1, 0, 0.1]) addBox([0.29, 0.035, 0.035], [0, y, -0.13], charcoal).name = `life-support-scrubber-vent-${y}`;
      addBox([0.41, 0.06, 0.27], [0, 0.24, 0], brass).name = "life-support-scrubber-latch";
    }
    group.scale.setScalar(0.8);
    group.rotation.set(0.1, 0.27, -0.08);
  } else if (definition.heldModel === "dragon-saddle") {
    addBox([0.58, 0.1, 0.76], [0, -0.08, 0], 0x522b27).name = "dragonflight-saddle-quilted-pad";
    addBox([0.48, 0.17, 0.62], [0, 0.02, -0.02], 0x8b4f38).name = "dragonflight-saddle-seat";
    addBox([0.51, 0.31, 0.12], [0, 0.19, 0.27], 0x633128, [-0.26, 0, 0]).name = "dragonflight-saddle-cantle";
    addBox([0.18, 0.3, 0.14], [0, 0.18, -0.29], 0x6f392d, [0.22, 0, 0]).name = "dragonflight-saddle-pommel";
    for (const side of [-1, 1]) {
      addBox([0.16, 0.28, 0.46], [side * 0.34, 0.02, 0.02], 0x3d2523, [0, 0, side * -0.19]).name = `dragonflight-saddle-${side < 0 ? "left" : "right"}-wing`;
      addBox([0.07, 0.66, 0.08], [side * 0.31, -0.26, 0.08], 0x6f3c2d, [0, 0, side * 0.08]).name = `dragonflight-saddle-${side < 0 ? "left" : "right"}-girth`;
      addBox([0.11, 0.11, 0.045], [side * 0.31, -0.12, -0.24], 0xe1b45a, [0, 0, Math.PI / 4]).name = `dragonflight-saddle-${side < 0 ? "left" : "right"}-sunmetal-buckle`;
      for (let plate = 0; plate < 3; plate += 1) addBox(
        [0.13, 0.08, 0.14],
        [side * (0.31 + plate * 0.018), 0.1 - plate * 0.1, -0.08 + plate * 0.12],
        plate === 1 ? 0xbd7650 : 0x9a563b,
        [0, side * -0.16, side * -0.16],
      ).name = `dragonflight-saddle-${side < 0 ? "left" : "right"}-scale-${plate + 1}`;
    }
    addBox([0.38, 0.055, 0.09], [0, 0.12, -0.33], 0xe1b45a).name = "dragonflight-saddle-breast-rail";
    addBox([0.1, 0.1, 0.04], [0, 0.13, -0.385], 0xffdf7a, [0, 0, Math.PI / 4], true).name = "dragonflight-saddle-waystar";
    group.scale.setScalar(0.76);
    group.rotation.set(0.1, 0.28, -0.08);
  } else if (definition.heldModel === "dragon-pannier") {
    addBox([0.55, 0.38, 0.3], [0, -0.03, 0], 0x8c5b34).name = "dragon-pannier-bag";
    addBox([0.59, 0.18, 0.34], [0, 0.21, -0.015], 0xb77a42, [-0.08, 0, 0]).name = "dragon-pannier-weather-flap";
    addBox([0.08, 0.43, 0.34], [-0.18, 0.03, -0.005], 0x5f3827).name = "dragon-pannier-left-reinforcement";
    addBox([0.08, 0.43, 0.34], [0.18, 0.03, -0.005], 0x5f3827).name = "dragon-pannier-right-reinforcement";
    for (const x of [-0.18, 0.18]) {
      addBox([0.1, 0.1, 0.04], [x, 0.13, -0.18], 0xe0b455, [0, 0, Math.PI / 4]).name = `dragon-pannier-buckle-${x < 0 ? "left" : "right"}`;
      addBox([0.06, 0.18, 0.04], [x, 0.02, -0.18], 0x3f2b24).name = `dragon-pannier-latch-${x < 0 ? "left" : "right"}`;
    }
    addCylinder(0.11, 0.52, [0, 0.36, 0.02], 0x567666, [0, 0, Math.PI / 2]).name = "dragon-pannier-rolled-bedroll";
    addBox([0.62, 0.07, 0.12], [0, 0.35, 0.02], 0x5b3829).name = "dragon-pannier-bedroll-strap";
    addBox([0.78, 0.07, 0.12], [0, -0.23, 0.04], 0x4f3328).name = "dragon-pannier-harness";
    addBox([0.1, 0.1, 0.05], [0, -0.23, -0.04], 0xf0c767, [0, 0, Math.PI / 4]).name = "dragon-pannier-harness-clasp";
    group.scale.setScalar(0.76);
    group.rotation.set(0.1, 0.28, -0.08);
  } else if (definition.heldModel === "dragon-barding") {
    const type = definition.dragonType ?? "steel";
    const palette = DRAGON_EQUIPMENT_PALETTES[type];
    addBox([0.52, 0.34, 0.17], [0, 0.04, 0.02], palette.dark, [0.05, 0, 0]).name = `${type}-barding-harness`;
    if (type === "fire") {
      for (let row = 0; row < 3; row += 1) for (let column = 0; column < 3 - row; column += 1) {
        const x = (column - (2 - row) / 2) * 0.18;
        addBox([0.17, 0.13, 0.08], [x, 0.18 - row * 0.13, -0.095], row === 0 ? palette.light : palette.primary, [0.08, 0, Math.PI / 4], row === 0 && column === 1).name = `fire-barding-flame-scale-${row}-${column}`;
      }
      for (const side of [-1, 1]) addBox([0.13, 0.42, 0.12], [side * 0.31, 0.17, 0.01], palette.primary, [0, 0, side * -0.42]).name = `fire-barding-${side < 0 ? "left" : "right"}-swept-horn`;
      addBox([0.08, 0.38, 0.06], [0, 0.34, -0.02], palette.accent, [0, 0, 0.18], true).name = "fire-barding-living-flame-crest";
    } else if (type === "ice") {
      addBox([0.42, 0.3, 0.11], [0, 0.08, -0.1], palette.primary, [0, 0, Math.PI / 4]).name = "ice-barding-faceted-breastplate";
      for (const [index, x] of [-0.2, 0, 0.2].entries()) addBox([0.1, 0.3 + (index === 1 ? 0.12 : 0), 0.08], [x, -0.14, -0.08], index === 1 ? palette.accent : palette.light, [0, 0, x * -1.7], index === 1).name = `ice-barding-icicle-${index + 1}`;
      for (const side of [-1, 1]) addBox([0.17, 0.42, 0.1], [side * 0.27, 0.22, -0.02], palette.light, [0, 0, side * -0.35]).name = `ice-barding-${side < 0 ? "left" : "right"}-glacier-fin`;
    } else if (type === "steel") {
      addBox([0.49, 0.31, 0.11], [0, 0.08, -0.09], palette.primary).name = "steel-barding-riveted-breastplate";
      addBox([0.2, 0.38, 0.14], [-0.28, 0.08, -0.02], palette.light, [0, 0, -0.12]).name = "steel-barding-left-pauldron";
      addBox([0.2, 0.38, 0.14], [0.28, 0.08, -0.02], palette.dark, [0, 0, 0.12]).name = "steel-barding-right-pauldron";
      for (const [index, x] of [-0.18, -0.06, 0.06, 0.18].entries()) {
        addSphere(0.035, [x, 0.2, -0.17], palette.accent).name = `steel-barding-rivet-top-${index + 1}`;
        addSphere(0.035, [x, -0.04, -0.17], palette.light).name = `steel-barding-rivet-bottom-${index + 1}`;
      }
      addCylinder(0.085, 0.08, [0, 0.08, -0.18], palette.accent, [Math.PI / 2, 0, 0]).name = "steel-barding-pressure-dial";
    } else if (type === "sea") {
      addBox([0.43, 0.3, 0.11], [0, 0.07, -0.1], palette.primary, [0, 0, Math.PI / 4]).name = "sea-barding-tideglass-carapace";
      for (const side of [-1, 1]) {
        for (let fin = 0; fin < 3; fin += 1) addBox([0.12 + fin * 0.035, 0.25, 0.055], [side * (0.27 + fin * 0.07), 0.17 - fin * 0.1, -0.04], fin === 1 ? palette.light : palette.primary, [0, side * 0.12, side * -0.48]).name = `sea-barding-${side < 0 ? "left" : "right"}-fin-${fin + 1}`;
      }
      addSphere(0.085, [0, 0.08, -0.18], palette.light, true).name = "sea-barding-lumen-pearl";
      for (const side of [-1, 1]) addBox([0.06, 0.28, 0.06], [side * 0.17, 0.3, -0.08], palette.accent, [0, 0, side * -0.32]).name = `sea-barding-${side < 0 ? "left" : "right"}-coral-antler`;
    } else if (type === "gold") {
      addBox([0.47, 0.32, 0.12], [0, 0.04, -0.08], 0x8c2f32).name = "gold-barding-crimson-mantle";
      addCylinder(0.17, 0.07, [0, 0.08, -0.18], palette.primary, [Math.PI / 2, 0, 0]).name = "gold-barding-sun-disc";
      for (let ray = 0; ray < 12; ray += 1) {
        const angle = ray / 12 * Math.PI * 2;
        addBox([0.045, ray % 2 ? 0.13 : 0.18, 0.045], [Math.cos(angle) * 0.25, 0.08 + Math.sin(angle) * 0.25, -0.14], ray % 3 === 0 ? palette.accent : palette.light, [0, 0, angle - Math.PI / 2], ray % 3 === 0).name = `gold-barding-sun-ray-${ray + 1}`;
      }
      for (const side of [-1, 1]) addBox([0.18, 0.36, 0.09], [side * 0.29, 0.16, 0], palette.primary, [0, 0, side * -0.28]).name = `gold-barding-${side < 0 ? "left" : "right"}-regalia-wing`;
    } else {
      addBox([0.45, 0.3, 0.11], [0, 0.06, -0.1], palette.dark).name = "silver-barding-nightweave-panel";
      for (let segment = 0; segment < 9; segment += 1) {
        const angle = -1.25 + segment * 0.31;
        addBox([0.065, 0.13, 0.055], [Math.cos(angle) * 0.2 - 0.04, 0.07 + Math.sin(angle) * 0.2, -0.17], segment % 3 ? palette.primary : palette.light, [0, 0, angle + Math.PI / 2], segment % 4 === 0).name = `silver-barding-crescent-${segment + 1}`;
      }
      for (const [index, point] of ([[-0.22, 0.2], [0.22, 0.24], [-0.18, -0.11], [0.15, -0.08]] as Array<[number, number]>).entries()) addSphere(0.035, [point[0], point[1], -0.17], index % 2 ? palette.accent : palette.light, true).name = `silver-barding-star-${index + 1}`;
      for (const side of [-1, 1]) addBox([0.12, 0.42, 0.08], [side * 0.29, 0.14, -0.01], palette.primary, [0, 0, side * -0.28]).name = `silver-barding-${side < 0 ? "left" : "right"}-moon-fin`;
    }
    addBox([0.6, 0.055, 0.11], [0, -0.15, 0.06], palette.dark).name = `${type}-barding-girth`;
    group.scale.setScalar(0.83);
    group.rotation.set(0.08, 0.25, -0.08);
    group.userData.dragonEquipmentType = type;
  } else if (definition.heldModel === "gold-hoard-block") {
    addBox([0.5, 0.5, 0.5], [0, 0.05, 0], 0xb77a18).name = "gold-hoard-block-core";
    for (const [index, y] of [-0.17, 0.04, 0.25].entries()) addBox([0.53, 0.045, 0.53], [0, y, 0], index === 1 ? 0xffdd66 : 0xe3a82d).name = `gold-hoard-block-band-${index + 1}`;
    addCylinder(0.15, 0.035, [0, 0.05, -0.27], 0xffe783, [Math.PI / 2, 0, 0]).name = "gold-hoard-block-dragon-seal";
    addBox([0.16, 0.07, 0.025], [0, 0.05, -0.295], 0x8f5115, [0, 0, -0.18]).name = "gold-hoard-block-seal-wing";
    addBox([0.06, 0.16, 0.025], [0, 0.05, -0.3], 0x8f5115, [0, 0, 0.24]).name = "gold-hoard-block-seal-neck";
    for (const [index, x] of [-0.19, 0.19].entries()) addBox([0.08, 0.08, 0.03], [x, 0.26, -0.275], index ? 0x66d7cf : 0xd95d70, [0, 0, Math.PI / 4], true).name = `gold-hoard-block-gem-${index + 1}`;
    group.scale.setScalar(0.72);
    group.rotation.set(0.12, 0.3, -0.08);
  } else if (definition.heldModel === "gold-pile") {
    const stacks = [[-0.19, -0.15, 3], [0.02, -0.17, 5], [0.21, -0.12, 2], [-0.08, 0.04, 4], [0.17, 0.08, 3]] as const;
    for (const [stack, [x, z, count]] of stacks.entries()) for (let coin = 0; coin < count; coin += 1) {
      const piece = addCylinder(0.095, 0.035, [x + ((coin + stack) % 2 ? 0.012 : -0.008), -0.19 + coin * 0.034, z], coin % 3 === 0 ? 0xffdf67 : 0xd99f24);
      piece.name = `gold-pile-coin-${stack + 1}-${coin + 1}`;
    }
    for (const [index, [x, y, z, yaw]] of [[-0.19, -0.01, 0.13, -0.28], [0.13, 0.01, -0.12, 0.34], [0.03, 0.11, 0.05, -0.12]].entries() as IterableIterator<[number, [number, number, number, number]]>) addBox([0.24, 0.08, 0.13], [x, y, z], index === 1 ? 0xffd34c : 0xe7ad2c, [0, yaw, 0]).name = `gold-pile-ingot-${index + 1}`;
    for (const [index, [x, y, z, color]] of [[-0.25, 0.04, -0.08, 0xd95770], [0.25, 0.02, 0.09, 0x5fd8d0], [0.08, 0.16, -0.08, 0xa77be8]].entries() as IterableIterator<[number, [number, number, number, number]]>) addBox([0.09, 0.09, 0.09], [x, y, z], color, [Math.PI / 4, Math.PI / 4, 0], true).name = `gold-pile-gem-${index + 1}`;
    group.scale.setScalar(0.92);
    group.rotation.set(0.07, 0.24, -0.06);
  } else if (definition.iconKind === "shield") {
    const iron = /iron/iu.test(definition.name);
    const face = iron ? 0xc9ad58 : 0x9a6a3b;
    const rim = iron ? 0xf0d471 : 0x5d4028;
    addBox([0.58, 0.68, 0.09], [0, 0.06, -0.04], face);
    addBox([0.64, 0.075, 0.13], [0, 0.37, -0.03], rim);
    addBox([0.64, 0.075, 0.13], [0, -0.25, -0.03], rim);
    addBox([0.075, 0.58, 0.13], [-0.285, 0.06, -0.03], rim);
    addBox([0.075, 0.58, 0.13], [0.285, 0.06, -0.03], rim);
    addBox([0.12, 0.12, 0.14], [0, 0.06, -0.105], iron ? 0xffe69a : 0xd2a05e, [0, 0, Math.PI / 4], iron);
    addBox([0.12, 0.42, 0.08], [0, 0.06, 0.06], 0x5a3b27);
    group.scale.setScalar(0.78);
    group.rotation.set(0.04, Math.PI / 2, 0.04);
    group.position.set(0, 0.1, -0.28);
    group.userData.offhandShield = true;
  } else if (definition.iconKind === "armor") {
    const primary = new THREE.Color(definition.color);
    const dark = primary.clone().multiplyScalar(0.48).getHex();
    const light = primary.clone().lerp(new THREE.Color(0xffffff), 0.36).getHex();
    const glow = definition.dragonType === "fire" ? 0xffbd61
      : definition.dragonType === "ice" ? 0xd9fbff
        : definition.dragonType === "sea" ? 0x8affec
          : 0xd8e4e7;
    if (definition.dragonModule === "armor") {
      // A compact dragon-barding bundle, not a generic colored inventory
      // brick. The four palettes now remain distinct at icon and hand scale.
      const breast = addBox([0.45, 0.34, 0.18], [0, 0.08, 0], primary.getHex(), [0.05, 0, 0]);
      breast.name = "dragon-armor-breastplate";
      const crest = addBox([0.16, 0.12, 0.2], [0, 0.31, -0.01], light, [0.12, 0, Math.PI / 4]);
      crest.name = "dragon-armor-crest";
      for (const side of [-1, 1]) {
        const flank = addBox([0.18, 0.3, 0.25], [side * 0.27, 0.04, 0.04], dark, [0, 0, side * -0.16]);
        flank.name = `dragon-armor-${side < 0 ? "left" : "right"}-flank`;
      }
      for (const [index, x] of [-0.14, 0, 0.14].entries()) {
        const scale = addBox([0.11, 0.075, 0.205], [x, 0.12 - Math.abs(x) * 0.2, -0.125], index === 1 ? glow : light, [0.08, 0, Math.PI / 4], index === 1);
        scale.name = `dragon-armor-scale-${index + 1}`;
      }
      addBox([0.39, 0.075, 0.11], [0, -0.16, 0.09], glow, [0, 0, 0], definition.dragonType !== "steel").name = "dragon-armor-rune";
      group.scale.setScalar(0.88);
      group.rotation.set(0.08, 0.24, -0.09);
    } else if (definition.equipmentSlot === "head") {
      addBox([0.46, 0.3, 0.42], [0, 0.04, 0], primary.getHex()).name = "held-armor-helm-crown";
      addBox([0.52, 0.08, 0.46], [0, -0.13, -0.01], dark).name = "held-armor-helm-rim";
      addBox([0.09, 0.22, 0.45], [-0.23, -0.02, 0], light, [0, 0, -0.08]).name = "held-armor-helm-left-cheek";
      addBox([0.09, 0.22, 0.45], [0.23, -0.02, 0], light, [0, 0, 0.08]).name = "held-armor-helm-right-cheek";
      group.scale.setScalar(0.82);
      group.rotation.set(0.1, 0.25, -0.08);
    } else if (definition.equipmentSlot === "chest") {
      addBox([0.5, 0.42, 0.18], [0, 0.04, 0], primary.getHex()).name = "held-armor-cuirass";
      addBox([0.64, 0.14, 0.22], [0, 0.2, 0.02], light).name = "held-armor-shoulders";
      addBox([0.42, 0.08, 0.22], [0, -0.19, 0.03], dark).name = "held-armor-waist";
      group.scale.setScalar(0.82);
      group.rotation.set(0.08, 0.25, -0.08);
    } else if (definition.equipmentSlot === "legs") {
      for (const side of [-1, 1]) addBox([0.2, 0.48, 0.2], [side * 0.14, 0.02, 0], side < 0 ? primary.getHex() : light, [0, 0, side * -0.05]).name = `held-armor-${side < 0 ? "left" : "right"}-greave`;
      addBox([0.5, 0.1, 0.22], [0, 0.29, 0], dark).name = "held-armor-greave-belt";
      group.scale.setScalar(0.78);
      group.rotation.set(0.08, 0.24, -0.08);
    } else {
      for (const side of [-1, 1]) addBox([0.26, 0.22, 0.42], [side * 0.16, 0, 0], side < 0 ? primary.getHex() : light, [0, 0, side * -0.05]).name = `held-armor-${side < 0 ? "left" : "right"}-boot`;
      group.scale.setScalar(0.82);
      group.rotation.set(0.08, 0.24, -0.08);
    }
    // The three wearable scale families retain their slot silhouette while
    // carrying a readable element mark in hand and as world loot.
    if (definition.equipmentSlot && definition.dragonType === "fire") {
      for (const [index, x] of [-0.14, 0, 0.14].entries()) addBox([0.07, 0.23 + index * 0.035, 0.055], [x, 0.25 + index * 0.02, -0.2], index === 1 ? 0xffcf6a : 0xef6b3d, [0, 0, x * -1.5], index === 1).name = `held-fire-armor-flame-spine-${index + 1}`;
    } else if (definition.equipmentSlot && definition.dragonType === "ice") {
      for (const [index, x] of [-0.16, 0, 0.16].entries()) addBox([0.07, 0.2 + (index === 1 ? 0.12 : 0), 0.055], [x, 0.22, -0.2], index === 1 ? 0xe6fdff : 0x9ceeff, [0, 0, x * -1.8], index === 1).name = `held-ice-armor-crystal-spine-${index + 1}`;
    } else if (definition.equipmentSlot && definition.dragonType === "steel") {
      for (const [index, x] of [-0.18, -0.06, 0.06, 0.18].entries()) addSphere(0.035, [x, 0.19, -0.22], index % 2 ? 0xd7a15a : 0xc6d0d4).name = `held-steel-armor-rivet-${index + 1}`;
      addBox([0.36, 0.045, 0.05], [0, 0.03, -0.21], 0x313b40).name = "held-steel-armor-reinforcement";
    }
  } else if (item === BlockId.CraftingTable) {
    // A miniature of the authored world block: gridded worktop, dark joined
    // frame and the same warm wildwood side panels instead of a generic cube.
    addBox([0.5, 0.42, 0.5], [0, 0.04, 0], 0x86532f).name = "crafting-table-side-panel";
    addBox([0.53, 0.08, 0.53], [0, 0.29, 0], 0xc99a58).name = "crafting-table-worktop";
    for (const offset of [-0.17, 0, 0.17]) {
      addBox([0.025, 0.018, 0.5], [offset, 0.34, 0], 0x5d3821).name = `crafting-table-grid-x-${offset}`;
      addBox([0.5, 0.018, 0.025], [0, 0.34, offset], 0x5d3821).name = `crafting-table-grid-z-${offset}`;
    }
    for (const x of [-0.21, 0.21]) for (const z of [-0.21, 0.21]) addBox([0.06, 0.4, 0.06], [x, 0.02, z], 0x56341f).name = `crafting-table-leg-${x}-${z}`;
    group.scale.setScalar(0.76);
    group.rotation.set(0.13, 0.27, -0.08);
  } else if (item === Item.DeepgearLanternItem) {
    addBox([0.32, 0.07, 0.32], [0, -0.12, 0], 0x69533b);
    for (const x of [-0.14, 0.14]) for (const z of [-0.14, 0.14]) addBox([0.035, 0.42, 0.035], [x, 0.08, z], 0x9f865b);
    addBox([0.3, 0.34, 0.3], [0, 0.08, 0], 0xffd77a, [0, 0, 0], true);
    addBox([0.34, 0.07, 0.34], [0, 0.29, 0], 0x806947);
    addBox([0.2, 0.05, 0.05], [0, 0.42, 0], 0xbdab7d);
    group.scale.setScalar(0.82);
    group.rotation.set(0.08, 0.24, -0.06);
    group.userData.offhandLight = true;
  } else if (definition.heldModel === "wildwood-chest") {
    addBox([0.52, 0.34, 0.42], [0, -0.03, 0], 0x9f6833);
    addBox([0.55, 0.14, 0.45], [0, 0.22, 0], 0xb9874e);
    addBox([0.12, 0.18, 0.045], [0, 0.08, -0.235], 0xe0b54e, [0, 0, 0], true);
    group.scale.setScalar(0.82);
    group.rotation.set(0.12, 0.24, -0.08);
  } else if (definition.heldModel === "apiary") {
    addBox([0.5, 0.36, 0.42], [0, -0.02, 0], 0xb97630);
    addBox([0.56, 0.14, 0.48], [0, 0.23, 0], 0xefc451);
    addBox([0.2, 0.12, 0.04], [0, 0.01, -0.23], 0x4b301f);
    for (const x of [-0.14, 0, 0.14]) addBox([0.05, 0.05, 0.04], [x, 0.13, -0.235], 0xf4d455, [0, 0, x * 0.8], true);
    group.scale.setScalar(0.78);
    group.rotation.set(0.1, 0.26, -0.08);
  } else if (definition.heldModel === "capture-orb") {
    addSphere(0.22, [0, 0.08, 0], options.filledCaptureOrb ? 0x3c605e : 0x697579);
    addBox([0.43, 0.08, 0.08], [0, 0.08, -0.17], options.filledCaptureOrb ? 0x78f0c5 : 0x73d8d2, [0, 0, 0], true);
    addSphere(0.065, [0, 0.08, -0.205], options.filledCaptureOrb ? 0xf0fff7 : 0xc5ffff, true);
    addBox([0.2, 0.03, 0.08], [-0.04, 0.22, -0.08], 0xeaf1ef, [0.28, 0, -0.35]);
    group.scale.setScalar(1.02);
    group.rotation.set(0.08, 0.22, -0.1);
    group.userData.filledCaptureOrb = Boolean(options.filledCaptureOrb);
  } else if (definition.heldModel === "dragon-egg") {
    const shell = new THREE.Color(definition.color);
    const shellHighlight = shell.clone().lerp(new THREE.Color(0xffffff), 0.34).getHex();
    const shellShadow = shell.clone().multiplyScalar(0.52).getHex();
    const shellDeep = shell.clone().multiplyScalar(0.72).getHex();
    const rune = definition.dragonType === "fire" ? 0xffa050
      : definition.dragonType === "ice" ? 0x9ff2ff
        : definition.dragonType === "sea" ? 0x8ff2df
          : definition.dragonType === "gold" ? 0xfff0a0
            : definition.dragonType === "silver" ? 0xf5fbff : 0xdfe9ef;
    // Alternate tiers rotate 45° so the stack reads as a rounded ovoid rather
    // than a wedding cake; the fifth shell crowns it with a soft point.
    const shellPieces = [
      addBox([0.2, 0.08, 0.2], [0, -0.16, 0], shellShadow, [0, Math.PI / 4, 0]),
      addBox([0.29, 0.13, 0.27], [0, -0.06, 0], shellDeep),
      addBox([0.33, 0.17, 0.31], [0, 0.085, 0], definition.color, [0, Math.PI / 4, 0]),
      addBox([0.27, 0.15, 0.25], [0, 0.24, 0], definition.color),
      addBox([0.16, 0.13, 0.15], [0, 0.365, 0], shellHighlight, [0, Math.PI / 4, 0]),
    ];
    shellPieces.forEach((piece, index) => { piece.name = `dragon-egg-shell-${index + 1}`; });
    for (const [sx, sy, sz, dark] of [
      [-0.11, 0.13, -0.135, false], [0.13, 0.02, -0.125, true], [-0.09, -0.05, -0.13, false], [0.05, 0.3, -0.11, true],
    ] as Array<[number, number, number, boolean]>) {
      addBox([0.045, 0.045, 0.02], [sx, sy, sz], dark ? shellShadow : shellHighlight).name = "dragon-egg-speckle";
    }
    const crackStem = addBox([0.028, 0.15, 0.025], [0.02, 0.14, -0.168], rune, [0, 0, 0.42], true);
    const crackLeft = addBox([0.026, 0.1, 0.024], [-0.04, 0.225, -0.165], rune, [0, 0, -0.55], true);
    const crackRight = addBox([0.026, 0.09, 0.024], [0.085, 0.06, -0.16], rune, [0, 0, 0.78], true);
    crackStem.name = "dragon-egg-rune-stem";
    crackLeft.name = "dragon-egg-rune-left";
    crackRight.name = "dragon-egg-rune-right";
    const glint = addBox([0.05, 0.05, 0.05], [0.02, 0.45, 0], rune, [0.3, Math.PI / 4, 0.3], true);
    glint.name = "dragon-egg-crown-glint";
    glint.userData.eggShimmer = true;
    glint.userData.shimmerPhase = 0.4;
    if (definition.dragonType === "gold") {
      // A floating solar corona and individually raised shell plates make this
      // egg unmistakable even in silhouette; each ray has its own shimmer phase.
      for (let index = 0; index < 12; index += 1) {
        const angle = index / 12 * Math.PI * 2;
        const ray = addBox(
          [index % 2 ? 0.035 : 0.05, index % 2 ? 0.09 : 0.13, 0.025],
          [Math.cos(angle) * 0.245, 0.15 + Math.sin(angle) * 0.245, 0.035],
          index % 3 === 0 ? 0xffffff : rune,
          [0, 0, angle - Math.PI / 2],
          true,
        );
        ray.name = `gold-dragon-egg-corona-${index + 1}`;
        ray.userData.eggShimmer = true;
        ray.userData.shimmerPhase = index * 0.53;
      }
      for (const [x, y, rotation] of [[-0.12, 0.02, -0.42], [0.13, 0.08, 0.38], [-0.09, 0.25, 0.5], [0.08, 0.31, -0.46]] as Array<[number, number, number]>) {
        const plate = addBox([0.11, 0.07, 0.025], [x, y, -0.17], shellHighlight, [0, 0, rotation]);
        plate.name = "gold-dragon-egg-raised-plate";
      }
    } else if (definition.dragonType === "silver") {
      // An offset crescent hugs the shell, crossed by a thin equatorial orbit.
      for (let index = 0; index < 10; index += 1) {
        const angle = -1.28 + index * 0.285;
        const segment = addBox(
          [0.04, 0.085, 0.024],
          [Math.cos(angle) * 0.255 - 0.07, 0.14 + Math.sin(angle) * 0.255, 0.04],
          index % 3 === 1 ? 0xffffff : rune,
          [0, 0, angle + Math.PI / 2],
          true,
        );
        segment.name = `silver-dragon-egg-crescent-${index + 1}`;
        segment.userData.eggShimmer = true;
        segment.userData.shimmerPhase = 0.7 + index * 0.47;
      }
      for (let index = 0; index < 8; index += 1) {
        const angle = index / 8 * Math.PI * 2;
        const star = addBox([0.025, 0.025, 0.018], [Math.cos(angle) * 0.17, 0.13 + Math.sin(angle) * 0.095, -0.181], index % 2 ? rune : 0xffffff, [0, 0, Math.PI / 4], true);
        star.name = `silver-dragon-egg-constellation-${index + 1}`;
        star.userData.eggShimmer = true;
        star.userData.shimmerPhase = index * 0.61;
      }
    }
    group.scale.setScalar(0.78);
    group.rotation.set(0.06, 0.28, -0.08);
    group.position.set(0, -0.03, -0.06);
    group.userData.dragonEggType = definition.dragonType;
  } else if (definition.heldModel === "orb-rack") {
    addBox([0.54, 0.1, 0.34], [0, -0.13, 0], 0x765139);
    for (const x of [-0.23, 0.23]) addBox([0.07, 0.56, 0.08], [x, 0.11, 0], 0x4e3526);
    for (const y of [-0.02, 0.2]) addBox([0.43, 0.055, 0.13], [0, y, 0], 0x8a6042);
    for (const y of [0.04, 0.26]) for (const x of [-0.15, -0.05, 0.05, 0.15]) addSphere(0.042, [x, y, -0.055], 0x7de0d9, true);
    group.scale.setScalar(0.82);
    group.rotation.set(0.12, 0.28, -0.08);
  } else if (definition.heldModel === "orb-healer") {
    addBox([0.52, 0.1, 0.46], [0, -0.17, 0], 0x46575a);
    addBox([0.46, 0.23, 0.4], [0, -0.01, 0], 0x526664);
    addBox([0.36, 0.035, 0.31], [0, 0.12, 0], 0x315b59);
    addBox([0.52, 0.08, 0.08], [0, 0.18, -0.19], 0x78958e);
    addBox([0.52, 0.08, 0.08], [0, 0.18, 0.19], 0x78958e);
    addBox([0.08, 0.08, 0.3], [-0.22, 0.18, 0], 0x78958e);
    addBox([0.08, 0.08, 0.3], [0.22, 0.18, 0], 0x78958e);
    for (const [x, z] of [[-0.11, -0.1], [0.11, -0.1], [-0.11, 0.1], [0.11, 0.1]] as const) addSphere(0.052, [x, 0.2, z], 0x8df2e8, true);
    addBox([0.25, 0.1, 0.035], [0, -0.04, -0.215], 0x70c99d, [0, 0, 0], true);
    group.scale.setScalar(0.74);
    group.rotation.set(0.1, 0.25, -0.08);
  } else if (definition.heldModel === "cartography") {
    addBox([0.58, 0.12, 0.48], [0, 0.08, 0], 0x76543a);
    addBox([0.52, 0.035, 0.42], [0, 0.16, 0], 0xd8c999);
    addBox([0.15, 0.025, 0.12], [0.1, 0.185, -0.05], 0x6e9f63);
    addBox([0.28, 0.02, 0.025], [-0.07, 0.19, 0.06], 0x5597b2, [0, 0.3, 0]);
    group.scale.setScalar(0.76);
    group.rotation.set(0.12, 0.28, -0.08);
  } else if (definition.heldModel === "alchemy") {
    addBox([0.48, 0.08, 0.4], [0, -0.16, 0], 0x51465f);
    addBox([0.07, 0.56, 0.07], [0, 0.08, 0], 0x8c76a6);
    addBox([0.48, 0.06, 0.07], [0, 0.18, 0], 0x8c76a6);
    for (const x of [-0.18, 0, 0.18]) {
      addBox([0.12, 0.2, 0.12], [x, 0.02, -0.02], x === 0 ? 0x68d5cd : 0xa98ccc, [0, 0, 0], true);
      addBox([0.05, 0.09, 0.05], [x, 0.17, -0.02], 0xc7e7e3);
    }
    group.scale.setScalar(0.72);
    group.rotation.set(0.1, 0.25, -0.08);
  } else if (definition.heldModel === "sugarworks") {
    addBox([0.5, 0.12, 0.42], [0, -0.18, 0], 0x8f456d);
    addBox([0.43, 0.38, 0.36], [0, 0.02, 0], 0xf39abe);
    addBox([0.35, 0.08, 0.3], [0, 0.24, 0], 0xffd6e8);
    addBox([0.12, 0.27, 0.1], [-0.12, 0.08, -0.22], 0xef5364, [0, 0, -0.16]);
    addBox([0.12, 0.27, 0.1], [0.12, 0.08, -0.22], 0xf6f0e9, [0, 0, 0.16]);
    const vat = addSphere(0.13, [0, 0.1, -0.23], 0xd8893f, true);
    vat.scale.set(1.2, 0.55, 0.5);
    addBox([0.07, 0.27, 0.07], [0.18, 0.39, 0], 0xf8edf2);
    addSphere(0.075, [0.18, 0.54, 0], 0xe98cba, true);
    group.scale.setScalar(0.7);
    group.rotation.set(0.1, 0.28, -0.08);
  } else if (definition.heldModel === "wayshrine") {
    addBox([0.5, 0.12, 0.42], [0, -0.2, 0], 0x596c67);
    addBox([0.28, 0.6, 0.22], [0, 0.1, 0], 0x4f7f7c);
    addBox([0.13, 0.26, 0.025], [0, 0.12, -0.125], 0x79d8cd, [0, 0, 0], true);
    addBox([0.4, 0.09, 0.3], [0, 0.43, 0], 0x806d4b);
    group.scale.setScalar(0.66);
    group.rotation.set(0.08, 0.25, -0.08);
  } else if (definition.heldModel === "distillery") {
    addBox([0.48, 0.54, 0.42], [0, 0.04, 0], 0x98643a);
    for (const y of [-0.12, 0.18]) addBox([0.53, 0.06, 0.46], [0, y, 0], 0xb28c4c);
    addBox([0.08, 0.15, 0.12], [0, 0.02, -0.25], 0xc7a548);
    group.scale.setScalar(0.72);
    group.rotation.set(0.1, 0.27, -0.08);
  } else if (definition.heldModel === "wheat-mill") {
    addBox([0.58, 0.11, 0.46], [0, -0.2, 0], 0x6f4829).name = "wheat-mill-oak-plinth";
    for (const x of [-0.23, 0.23]) {
      addBox([0.09, 0.48, 0.1], [x, 0, 0.08], 0x7d512d).name = `wheat-mill-${x < 0 ? "left" : "right"}-frame-post`;
    }
    addBox([0.52, 0.08, 0.13], [0, 0.23, 0.08], 0xa9793e).name = "wheat-mill-hopper-rail";
    addBox([0.36, 0.19, 0.3], [0, 0.31, 0.03], 0xb98749, [0.12, 0, 0]).name = "wheat-mill-grain-hopper";
    addBox([0.19, 0.1, 0.2], [0, 0.17, 0.02], 0x5d3d27).name = "wheat-mill-hopper-throat";
    const wheel = addCylinder(0.22, 0.13, [0, 0.02, -0.08], 0x8b806d, [0, 0, Math.PI / 2]);
    wheel.name = "wheat-mill-stone-wheel";
    addCylinder(0.065, 0.56, [0, 0.02, -0.08], 0x4f3524, [0, 0, Math.PI / 2]).name = "wheat-mill-wooden-axle";
    addBox([0.18, 0.055, 0.055], [0.34, 0.04, -0.08], 0xb1844c, [0, 0, 0.3]).name = "wheat-mill-hand-crank";
    addBox([0.27, 0.08, 0.2], [0, -0.1, -0.25], 0xc8a96c, [-0.25, 0, 0]).name = "wheat-mill-flour-chute";
    addBox([0.16, 0.035, 0.12], [0, -0.17, -0.37], 0xe7d8aa).name = "wheat-mill-flour-dust";
    group.scale.setScalar(0.7);
    group.rotation.set(0.1, 0.28, -0.08);
  } else if (definition.heldModel === "stool") {
    const deepgear = item === Item.DeepgearStoolItem;
    const seat = deepgear ? 0x9a7448 : 0x9f7144;
    const frame = deepgear ? 0x5f5350 : 0x70482b;
    addBox([0.46, 0.11, 0.42], [0, 0.12, 0], seat).name = deepgear ? "deepgear-stool-seat" : "wildwood-stool-seat";
    for (const [index, [x, z]] of [[-0.17, -0.15], [0.17, -0.15], [-0.17, 0.15], [0.17, 0.15]].entries()) {
      addBox([0.065, 0.42, 0.065], [x, -0.13, z], frame, [z * 0.15, 0, -x * 0.15]).name = `${deepgear ? "deepgear" : "wildwood"}-stool-leg-${index + 1}`;
    }
    for (const z of [-0.16, 0.16]) addBox([0.35, 0.045, 0.045], [0, -0.15, z], deepgear ? 0xb28a50 : 0x87572f).name = `${deepgear ? "deepgear" : "wildwood"}-stool-cross-brace`;
    if (deepgear) {
      for (const [x, z] of [[-0.16, -0.14], [0.16, -0.14], [-0.16, 0.14], [0.16, 0.14]] as const) {
        addCylinder(0.018, 0.025, [x, 0.185, z], 0xd0b36b).name = "deepgear-stool-seat-rivet";
      }
    }
    group.scale.setScalar(0.78);
    group.rotation.set(0.12, 0.25, -0.08);
  } else if (definition.heldModel === "fence") {
    for (const x of [-0.23, 0.23]) {
      addBox([0.1, 0.64, 0.1], [x, 0.05, 0], 0x70482b).name = `wildwood-fence-${x < 0 ? "left" : "right"}-post`;
      addBox([0.14, 0.09, 0.14], [x, 0.4, 0], 0xa97945, [0, Math.PI / 4, 0]).name = "wildwood-fence-post-cap";
    }
    for (const y of [-0.08, 0.2]) addBox([0.48, 0.09, 0.08], [0, y, 0], y > 0 ? 0xa97945 : 0x8b5b34).name = "wildwood-fence-rail";
    group.scale.setScalar(0.78);
    group.rotation.set(0.08, 0.3, -0.08);
  } else if (definition.heldModel === "fence-gate") {
    for (const x of [-0.23, 0.23]) addBox([0.085, 0.62, 0.09], [x, 0.05, 0], 0x70482b).name = `wildwood-gate-${x < 0 ? "hinge" : "latch"}-post`;
    for (const y of [-0.16, 0.2]) addBox([0.48, 0.08, 0.08], [0, y, 0], 0x9c6a3a).name = "wildwood-gate-rail";
    addBox([0.08, 0.54, 0.075], [0, 0.02, -0.005], 0x87552f, [0, 0, -0.76]).name = "wildwood-gate-diagonal-brace";
    addBox([0.1, 0.08, 0.12], [0.19, 0.05, -0.04], 0xc19a57).name = "wildwood-gate-latch";
    group.scale.setScalar(0.78);
    group.rotation.set(0.08, 0.3, -0.08);
  } else if (definition.heldModel === "chair") {
    addBox([0.42, 0.1, 0.38], [0, -0.02, 0], 0x9f7144);
    for (const [x, z] of [[-0.17, -0.15], [0.17, -0.15], [-0.17, 0.15], [0.17, 0.15]] as Array<[number, number]>) addBox([0.06, 0.4, 0.06], [x, -0.22, z], 0x70482b);
    addBox([0.42, 0.44, 0.08], [0, 0.23, 0.15], 0x9f7144);
    group.scale.setScalar(0.72);
    group.rotation.set(0.12, 0.25, -0.08);
  } else if (definition.heldModel === "moonberry-cookie") {
    // A shallow twelve-sided bake is readable in hand, on remote avatars,
    // and on the ground. Grouped berry pockets plus the pressed pale crescent
    // carry the same Moonbough material grammar as the 16px icon.
    addCylinder(0.285, 0.055, [0, -0.015, 0], 0x7f4b2e).name = "moonberry-cookie-baked-rim";
    addCylinder(0.255, 0.07, [0, 0.018, 0], 0xb87943).name = "moonberry-cookie-biscuit";
    for (const [x, z, color] of [
      [-0.11, -0.07, 0x74438f], [0.11, -0.04, 0xa66bc0], [-0.08, 0.11, 0x8b51a8], [0.12, 0.11, 0x6d397f],
    ] as Array<[number, number, number]>) addBox([0.065, 0.035, 0.065], [x, 0.068, z], color, [0, Math.PI / 4, 0]).name = "moonberry-cookie-berry-pocket";
    for (const [x, z] of [[-0.025, -0.015], [0.015, 0.015], [0.02, 0.055]] as Array<[number, number]>) addBox([0.04, 0.025, 0.055], [x, 0.088, z], 0xf1dfad, [0, -0.45, 0]).name = "moonberry-cookie-moon-press";
    group.scale.setScalar(0.72);
    group.rotation.set(-Math.PI / 2 - 0.12, 0.28, -0.12);
  } else if (definition.heldModel === "shears") {
    addBox([0.1, 0.48, 0.07], [-0.1, 0.15, 0], 0xd4b9a7, [0, 0, -0.34]).name = "shears-left-blade";
    addBox([0.1, 0.48, 0.07], [0.1, 0.15, 0], 0xe5d1c2, [0, 0, 0.34]).name = "shears-right-blade";
    addSphere(0.07, [0, -0.02, -0.01], 0x7d694f).name = "shears-hinge";
    for (const side of [-1, 1]) {
      const handle = addBox([0.13, 0.34, 0.1], [side * 0.13, -0.26, 0], 0x6d4933, [0, 0, side * -0.34]);
      handle.name = `shears-${side < 0 ? "left" : "right"}-handle`;
      addBox([0.065, 0.22, 0.12], [side * 0.13, -0.27, -0.01], 0x29201c, [0, 0, side * -0.34]).name = `shears-${side < 0 ? "left" : "right"}-grip-opening`;
    }
    group.scale.setScalar(0.75);
    group.rotation.set(0.05, 0.26, -0.1);
  } else if (definition.heldModel === "lightning-bug-jar") {
    const glassMaterial = new THREE.MeshLambertMaterial({ color: 0xdff7eb, transparent: true, opacity: 0.27, depthWrite: false, side: THREE.DoubleSide });
    const addGlass = (size: [number, number, number], position: [number, number, number], name: string) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), glassMaterial);
      mesh.position.set(...position);
      mesh.name = name;
      group.add(mesh);
      return mesh;
    };
    addBox([0.36, 0.06, 0.36], [0, -0.2, 0], 0x8a724a).name = "lightning-bug-jar-base";
    addBox([0.38, 0.08, 0.38], [0, 0.28, 0], 0xa67b3d).name = "lightning-bug-jar-lid";
    for (const x of [-0.17, 0.17]) addGlass([0.035, 0.42, 0.36], [x, 0.03, 0], `lightning-bug-jar-glass-x-${x}`);
    for (const z of [-0.17, 0.17]) addGlass([0.36, 0.42, 0.035], [0, 0.03, z], `lightning-bug-jar-glass-z-${z}`);
    const bug = new THREE.Group();
    bug.name = "lightning-bug-jar-bug";
    bug.position.set(0, 0.05, -0.04);
    bug.userData.jarBug = true;
    bug.userData.baseY = bug.position.y;
    group.add(bug);
    addSphere(0.07, [0, 0, 0], 0xd7ff62, true, bug).name = "lightning-bug-jar-glow";
    addBox([0.05, 0.06, 0.12], [0, 0, -0.08], 0x263621, [0, 0, 0], false, bug).name = "lightning-bug-jar-thorax";
    for (const side of [-1, 1]) {
      const wing = addBox([0.12, 0.018, 0.08], [side * 0.07, 0.025, -0.03], 0xe6f6d6, [0, side * -0.16, side * 0.14], false, bug);
      wing.name = `lightning-bug-jar-${side < 0 ? "left" : "right"}-wing`;
      wing.userData.jarBugWing = true;
      wing.userData.side = side;
    }
    group.scale.setScalar(0.84);
    group.rotation.set(0.08, 0.27, -0.08);
    group.userData.offhandLight = true;
  } else if (definition.heldModel === "bottle" || definition.heldModel === "potion" || definition.heldModel === "mead") {
    const liquid = definition.heldModel === "bottle" && item === Item.GlassBottle ? null : definition.color;
    addBox([0.2, 0.3, 0.16], [0, 0, 0], 0xc7e7e3);
    if (liquid) addBox([0.16, 0.2, 0.13], [0, -0.035, -0.01], liquid, [0, 0, 0], definition.heldModel === "potion");
    addBox([0.09, 0.14, 0.09], [0, 0.21, 0], 0xc7e7e3);
    addBox([0.12, 0.06, 0.12], [0, 0.3, 0], definition.heldModel === "mead" ? 0x7a4b28 : 0x8d7654);
    group.scale.setScalar(0.92);
    group.rotation.set(0.08, 0.2, -0.08);
  } else if (definition.heldModel === "blueprint") {
    addBox([0.48, 0.04, 0.62], [0, 0.08, 0], 0xe2c98b, [0.08, 0.16, -0.05]);
    for (const y of [-0.1, 0.04, 0.18]) addBox([0.28, 0.018, 0.02], [0, 0.13, y], 0x6f735d, [0.08, 0.16, -0.05]);
    addBox([0.1, 0.02, 0.1], [0.12, 0.14, -0.2], definition.color, [0.08, 0.16, -0.05], true);
    group.scale.setScalar(0.82);
  } else if (definition.heldModel === "crossbow") {
    addBox([0.11, 0.12, 0.9], [0, 0.02, -0.12], 0x765038);
    addBox([0.08, 0.09, 0.72], [0, 0.04, -0.46], definition.color);
    addBox([0.86, 0.09, 0.1], [0, 0.04, -0.64], 0x9a7847, [0, 0, 0.14]);
    addBox([0.86, 0.035, 0.035], [0, 0.08, -0.58], 0xd6d2c5, [0, 0, -0.14]);
    addBox([0.08, 0.08, 0.94], [0, 0.12, -0.18], 0xbdc6c2);
    group.scale.setScalar(0.64);
    group.rotation.set(0.02, 0.04, -0.08);
    group.position.set(0, 0.03, -0.3);
    group.userData.workingAngle = Math.PI / 2;
  } else if (definition.heldModel === "spear") {
    addBox([0.08, 0.08, 1.45], [0, 0, -0.26], 0x7b542f);
    const point = addBox([0.18, 0.12, 0.34], [0, 0, -1.12], definition.color, [0, Math.PI / 4, 0]);
    point.name = "spear-point";
    group.scale.setScalar(0.72);
    group.rotation.set(0.02, 0.04, -0.08);
    group.position.set(0, 0.02, -0.25);
    group.userData.workingAngle = Math.PI / 2;
  } else if (item === BlockId.Torch) {
    addBox([0.1, 0.62, 0.1], [0, 0.22, 0], 0x8d542b);
    const outer = addBox([0.16, 0.14, 0.16], [0, 0.58, 0], 0xffb33e, [0, 0, 0], true);
    const inner = addBox([0.08, 0.11, 0.08], [0, 0.7, 0], 0xfff0a0, [0, 0, 0], true);
    outer.name = "torch-flame-outer";
    inner.name = "torch-flame-inner";
    outer.userData.torchBase = outer.position.toArray();
    inner.userData.torchBase = inner.position.toArray();
    // The working arm points forward. Counter-rotating the torch by ninety
    // degrees keeps the flame upright at the fist instead of extending the
    // shaft straight away from the character along the forearm.
    group.rotation.x = -Math.PI / 2;
    group.position.set(0, -0.03, 0);
    group.userData.workingAngle = Math.PI / 2;
    group.userData.gripPose = "upright-at-hand";
    group.userData.offhandLight = true;
  } else if (item === Item.Berry) {
    // Keep remote/third-person Moonberries identical to the first-person
    // cluster instead of collapsing them into the generic item brick.
    addBox([0.11, 0.11, 0.11], [-0.07, 0.02, 0], 0x754399, [0.2, 0.1, 0]);
    addBox([0.11, 0.11, 0.11], [0.06, 0.01, 0.02], 0x955bbb, [-0.1, 0.2, 0]);
    addBox([0.1, 0.1, 0.1], [0, 0.12, -0.01], 0x854fa8, [0.1, -0.2, 0]);
    addBox([0.2, 0.035, 0.1], [0, 0.2, 0], 0x568044, [0, 0, 0.28]);
    group.scale.setScalar(1.05);
  } else if (item === Item.Apple) {
    addBox([0.23, 0.22, 0.2], [0, 0.02, 0], 0xc8493e, [0.08, 0.18, 0]);
    addBox([0.045, 0.15, 0.045], [0, 0.18, 0], 0x6b4226, [0, 0, -0.08]);
    addBox([0.14, 0.035, 0.08], [0.07, 0.21, 0], 0x5f8d47, [0, 0, 0.32]);
  } else if (item === Item.Frostpear) {
    addBox([0.2, 0.25, 0.18], [0, -0.01, 0], 0x91c7ca, [0.04, 0.14, 0]);
    addBox([0.14, 0.12, 0.14], [0, 0.16, 0], 0xbfe5dc, [0.04, 0.14, 0]);
    addBox([0.04, 0.14, 0.04], [0, 0.27, 0], 0x6b4c32, [0, 0, -0.08]);
    addBox([0.13, 0.035, 0.08], [0.07, 0.3, 0], 0x688e63, [0, 0, 0.28]);
    group.scale.setScalar(0.95);
  } else if (item === Item.HearthberryApplePie) {
    // A low, readable wedge keeps the pastry identifiable in first-person,
    // third-person and dropped-item views without masquerading as a block.
    addCylinder(0.27, 0.12, [0, 0.02, 0], 0xb66a32, [0, 0, 0]).name = "hearthberry-pie-crust";
    addCylinder(0.235, 0.07, [0, 0.105, 0], 0x8b3d58, [0, 0, 0]).name = "hearthberry-pie-filling";
    for (const angle of [-0.55, 0, 0.55]) addBox([0.07, 0.045, 0.5], [Math.sin(angle) * 0.045, 0.155, 0], 0xe0ae64, [0, angle, 0]).name = "hearthberry-pie-lattice";
    for (const angle of [-0.72, 0.72]) addBox([0.5, 0.045, 0.07], [0, 0.158, Math.sin(angle) * 0.04], 0xf0c978, [0, angle, 0]).name = "hearthberry-pie-cross-lattice";
    addSphere(0.045, [0.08, 0.19, -0.03], 0x7f4aa0).name = "hearthberry-pie-berry";
    group.scale.setScalar(0.86);
    group.rotation.set(0.12, 0.32, -0.08);
  } else if (item === Item.Stick) {
    addBox([0.075, 0.54, 0.075], [0, 0.02, 0], 0x8b5a30, [0.2, 0.1, -0.36]);
  } else if (item === Item.RottenFlesh) {
    addBox([0.26, 0.34, 0.14], [0, 0.03, 0], 0x76553f, [0.18, 0.2, -0.08]);
    addBox([0.19, 0.08, 0.15], [0.04, 0.17, -0.01], 0x98705a, [-0.08, 0.1, 0.22]);
  } else if ([BlockId.RedFlower, BlockId.BlueFlower, BlockId.Sunpetal, BlockId.MoonOrchid].includes(item as BlockId)) {
    addBox([0.05, 0.42, 0.05], [0, -0.05, 0], 0x4d863f, [0.12, 0, -0.16]);
    addBox([0.26, 0.075, 0.26], [-0.03, 0.19, 0], definition.color, [0.08, 0.15, 0.18]);
    addBox([0.07, 0.09, 0.07], [-0.03, 0.22, -0.01], 0xf2c34d, [0, 0, 0], true);
  } else if (item === Item.DawnthreadSaber) {
    addBox([0.105, 0.11, 0.52], [0, 0, -0.09], 0x6b452c).name = "dawnthread-grip";
    addBox([0.62, 0.1, 0.12], [0, 0, -0.37], 0xe0a94d).name = "dawnthread-sun-guard";
    addBox([0.18, 0.08, 1.32], [0, 0, -1.0], 0xffd978, [0, 0, Math.PI / 4], true).name = "dawnthread-living-edge";
    addBox([0.055, 0.055, 1.18], [-0.09, 0.02, -0.98], 0xfff2b2, [0, 0, Math.PI / 4], true).name = "dawnthread-sun-filament";
    addBox([0.24, 0.12, 0.24], [0, 0, 0.24], 0x8f5d31, [0, Math.PI / 4, 0]).name = "dawnthread-pommel";
    group.scale.setScalar(0.56);
    group.rotation.set(-Math.PI / 2, 0.02, -0.12);
    group.position.set(0, -0.08, -0.24);
    group.userData.workingAngle = Math.PI / 2;
  } else if (item === Item.DeepdelversPromise) {
    addBox([0.105, 0.11, 1.48], [0, 0, -0.3], 0x5a4431).name = "deepdelver-haft";
    addBox([1.12, 0.14, 0.18], [0, 0, -1.02], 0x506b70, [0, 0, -0.08]).name = "deepdelver-pick-head";
    addBox([0.34, 0.2, 0.22], [-0.5, 0, -1.04], 0x67d7d0, [0, 0, Math.PI / 4], true).name = "deepdelver-crystal-tooth";
    addBox([0.26, 0.24, 0.24], [0.47, 0, -0.98], 0x8ea1a1, [0, 0, Math.PI / 4]).name = "deepdelver-hammer-poll";
    for (const z of [-0.18, -0.45, -0.72]) addBox([0.16, 0.14, 0.06], [0, 0, z], 0x67d7d0, [0, 0, Math.PI / 4], true).name = "deepdelver-oath-rune";
    group.scale.setScalar(0.55);
    group.rotation.set(-Math.PI / 2, 0.02, -0.12);
    group.position.set(0, -0.08, -0.22);
    group.userData.workingAngle = Math.PI / 2;
  } else if (item === Item.BriarheartCrook) {
    addBox([0.12, 0.12, 1.58], [0, 0, -0.3], 0x4e6a36).name = "briarheart-living-shaft";
    addBox([0.65, 0.11, 0.12], [0.22, 0, -1.06], 0x4e6a36, [0, 0.42, 0]).name = "briarheart-crook-hook";
    addBox([0.18, 0.18, 0.18], [0.46, 0, -1.26], 0x9ce47b, [0, Math.PI / 4, Math.PI / 4], true).name = "briarheart-focus";
    for (const [index, z] of [-0.2, -0.5, -0.8].entries()) {
      const thorn = addBox([0.18, 0.08, 0.2], [index % 2 ? -0.1 : 0.1, 0, z], 0xc4e789, [0, index % 2 ? -0.5 : 0.5, 0]);
      thorn.name = `briarheart-thorn-${index + 1}`;
    }
    group.scale.setScalar(0.56);
    group.rotation.set(-Math.PI / 2, 0.02, -0.12);
    group.position.set(0, -0.08, -0.24);
    group.userData.workingAngle = Math.PI / 2;
  } else if (definition.toolKind) {
    const spec = createHeldToolSpec(definition.toolKind, definition.color, definition.name);
    for (const box of spec.boxes) addBox(
      [...box.size] as [number, number, number],
      [...box.position] as [number, number, number],
      box.color,
      [...(box.rotation ?? [0, 0, 0])] as [number, number, number],
      Boolean(box.emissive),
    );
    group.scale.setScalar(0.5);
    group.rotation.set(-Math.PI / 2, 0.02, -0.12);
    group.position.set(0, -0.08, -0.2);
    group.userData.workingAngle = Math.PI / 2;
  } else if (definition.useKind === "net") {
    addBox([0.08, 0.9, 0.08], [0, 0.14, 0], 0x7b542f);
    for (let segment = 0; segment < 12; segment += 1) {
      const angle = segment / 12 * Math.PI * 2;
      const rail = addBox([0.045, 0.185, 0.045], [Math.cos(angle) * 0.29, 0.66 + Math.sin(angle) * 0.29, 0], 0xd8c892, [0, 0, angle]);
      rail.name = `butterfly-net-rim-${segment}`;
    }
    const netColor = 0xc5ddd4;
    for (let line = -3; line <= 3; line += 1) {
      const offset = line * 0.064;
      const half = Math.sqrt(Math.max(0, 0.245 ** 2 - offset ** 2));
      const vertical = addBox([0.012, half * 2, 0.012], [offset, 0.66, 0], netColor);
      const horizontal = addBox([half * 2, 0.012, 0.012], [0, 0.66 + offset, 0], netColor);
      vertical.name = `butterfly-net-thread-v-${line + 3}`;
      horizontal.name = `butterfly-net-thread-h-${line + 3}`;
    }
    group.scale.setScalar(0.62);
    group.rotation.set(-Math.PI / 2, 0.1, -0.1);
    group.position.set(0, -0.05, -0.22);
    group.userData.workingAngle = Math.PI / 2;
  } else if (definition.useKind === "release-creature" && definition.creatureKind
    && BUTTERFLY_ORDER.includes(definition.creatureKind as ButterflyKind)) {
    const butterfly = createButterflyVisual(definition.creatureKind as ButterflyKind, `held-${definition.creatureKind}`);
    butterfly.group.name = `held-butterfly-${definition.creatureKind}`;
    butterfly.leftWing.rotation.z = 0.52;
    butterfly.rightWing.rotation.z = -0.52;
    // Wild butterflies fly on a mostly horizontal plane. A held specimen is
    // perched upright and slightly canted so both production wings remain
    // readable from third-person/front multiplayer views instead of becoming
    // one edge-on colored bar hidden by the wrist.
    butterfly.group.scale.setScalar(1.4);
    butterfly.group.position.set(0, 0.15, -0.32);
    butterfly.group.rotation.set(-1.02, 0.24, 0.08);
    group.add(butterfly.group);
  } else if (definition.iconKind === "bucket") {
    const metal = 0x9aa5a6;
    addBox([0.3, 0.07, 0.25], [0, -0.1, 0], metal);
    addBox([0.055, 0.3, 0.25], [-0.145, 0.03, 0], metal, [0, 0, -0.08]);
    addBox([0.055, 0.3, 0.25], [0.145, 0.03, 0], metal, [0, 0, 0.08]);
    addBox([0.28, 0.28, 0.045], [0, 0.03, -0.115], metal);
    addBox([0.28, 0.28, 0.045], [0, 0.03, 0.115], metal);
    addBox([0.36, 0.035, 0.035], [0, 0.26, 0], 0xc6cece);
    if (definition.bucketLiquid) addBox([0.23, 0.035, 0.18], [0, 0.17, 0], definition.color, [0, 0, 0], definition.bucketLiquid === "lava");
    group.scale.setScalar(0.72);
    group.rotation.set(0.08, 0.25, -0.12);
  } else if (item === Item.WroughtIronDoor) {
    for (const x of [-0.2, -0.1, 0, 0.1, 0.2]) addBox([0.045, 0.72, 0.045], [x, 0.12, 0], 0x303b42);
    for (const y of [-0.2, 0.38]) addBox([0.48, 0.055, 0.055], [0, y, 0], 0x43515a);
    const latch = addBox([0.09, 0.1, 0.07], [0.14, 0.06, -0.02], 0x9aa5a9);
    latch.name = "wrought-door-latch";
    group.scale.setScalar(0.72);
    group.rotation.set(0.08, 0.3, -0.08);
  } else if (definition.placeBlock !== undefined || definition.worldTextureBlock !== undefined) {
    const blockType = definition.placeBlock ?? definition.worldTextureBlock!;
    const material = new THREE.MeshLambertMaterial({
      ...(options.atlas ? { map: options.atlas } : {}),
      color: options.atlas ? 0xffffff : definition.color,
    });
    const cube = new THREE.Mesh(createAtlasBlockGeometry(blockType, 0.46), material);
    cube.name = `presentation-voxel-block-${blockType}`;
    cube.position.y = 0.1;
    cube.rotation.set(0.16, 0.2, 0);
    group.add(cube);
    group.userData.worldTextureBlock = blockType;
  } else {
    const family = itemPresentationFamily(item);
    const icon = definition.iconKind ?? "";
    const dark = new THREE.Color(definition.color).multiplyScalar(0.55).getHex();
    const light = new THREE.Color(definition.color).lerp(new THREE.Color(0xffffff), 0.34).getHex();
    if (family === "document") {
      addBox([0.43, 0.04, 0.58], [0, 0.08, 0], dark, [-0.04, 0.18, -0.08]).name = "presentation-document-cover";
      addBox([0.37, 0.035, 0.52], [0.015, 0.12, -0.005], 0xead9ae, [-0.04, 0.18, -0.08]).name = "presentation-document-pages";
      addBox([0.055, 0.055, 0.46], [-0.14, 0.16, 0.01], definition.color, [-0.04, 0.18, -0.08]).name = "presentation-document-binding";
      addBox([0.2, 0.018, 0.035], [0.07, 0.147, -0.08], definition.useKind === "spell-tome" ? 0xffdd73 : 0x725f43, [-0.04, 0.18, -0.08]).name = "presentation-document-mark";
    } else if (family === "mineral") {
      [[-0.12, 0.02, 0.04, 0.22], [0.1, 0.1, -0.02, 0.18], [0.02, -0.03, 0.13, 0.14]].forEach(([x, y, z, size], index) => {
        const shard = addBox([size, size * 1.25, size], [x, y, z], index === 1 ? light : definition.color, [0.08 * index, 0.24 * index, index ? 0.34 : -0.18], icon.includes("glow") || icon.includes("crystal"));
        shard.name = `presentation-mineral-shard-${index + 1}`;
      });
      addBox([0.42, 0.055, 0.32], [0, -0.14, 0.03], dark).name = "presentation-mineral-matrix";
    } else if (family === "ingot") {
      addBox([0.46, 0.14, 0.28], [0, 0.04, 0], definition.color, [0.04, 0.2, -0.08]).name = "presentation-ingot-body";
      addBox([0.32, 0.035, 0.17], [0, 0.12, 0], light, [0.04, 0.2, -0.08]).name = "presentation-ingot-stamp";
      addBox([0.05, 0.02, 0.1], [0, 0.145, 0], dark, [0.04, 0.2, Math.PI / 4]).name = "presentation-ingot-maker-mark";
    } else if (family === "fiber") {
      const coil = new THREE.Group();
      coil.name = "presentation-fiber-coil";
      for (let strand = 0; strand < 4; strand += 1) {
        const strandMesh = new THREE.Mesh(new THREE.TorusGeometry(0.16 + strand * 0.018, 0.022, 4, 12), new THREE.MeshLambertMaterial({ color: strand % 2 ? light : definition.color }));
        strandMesh.position.set((strand - 1.5) * 0.018, 0.06 + strand * 0.02, 0);
        strandMesh.rotation.set(Math.PI / 2, 0.18, 0.08);
        strandMesh.name = `presentation-fiber-strand-${strand + 1}`;
        coil.add(strandMesh);
      }
      group.add(coil);
      addBox([0.08, 0.38, 0.07], [0.18, -0.02, 0.04], dark, [0.2, 0, -0.3]).name = "presentation-fiber-tail";
    } else if (family === "food") {
      if (["meat", "fish-raw", "fish-cooked", "rotten-flesh"].includes(icon)) {
        addBox([0.42, 0.22, 0.24], [-0.02, 0.04, 0], definition.color, [0.04, 0.24, -0.08]).name = "presentation-food-cut";
        addBox([0.18, 0.08, 0.08], [0.23, 0.06, 0], 0xead9bd, [0.04, 0.24, -0.08]).name = "presentation-food-bone";
      } else if (icon === "seed") {
        for (let seed = 0; seed < 5; seed += 1) addBox([0.09, 0.045, 0.13], [(seed % 3 - 1) * 0.1, 0.02 + Math.floor(seed / 3) * 0.07, (seed % 2 - 0.5) * 0.1], seed % 2 ? light : definition.color, [0.1, seed * 0.4, seed * 0.18]).name = `presentation-seed-${seed + 1}`;
      } else {
        addBox([0.34, 0.31, 0.32], [0, 0.03, 0], definition.color, [0.04, 0.22, -0.05]).name = "presentation-produce-body";
        addBox([0.09, 0.16, 0.08], [0.02, 0.25, 0], 0x55713c, [0.18, 0, -0.2]).name = "presentation-produce-stem";
        addBox([0.18, 0.055, 0.11], [0.12, 0.25, 0], 0x6d934e, [0.1, 0.4, -0.32]).name = "presentation-produce-leaf";
      }
    } else if (family === "creature-part") {
      if (icon === "dragon-skull") {
        addBox([0.42, 0.3, 0.34], [0, 0.08, 0], 0xddd3b7, [0.04, 0.2, 0]).name = "presentation-skull-cranium";
        addBox([0.29, 0.18, 0.25], [0, -0.08, -0.24], 0xbeb395, [0.04, 0.2, 0]).name = "presentation-skull-muzzle";
        for (const side of [-1, 1]) addBox([0.07, 0.34, 0.07], [side * 0.18, 0.28, 0.05], dark, [side * -0.42, 0, side * -0.2]).name = `presentation-skull-horn-${side < 0 ? "left" : "right"}`;
      } else if (icon.includes("heart") || item === Item.NocturneHeart) {
        addBox([0.25, 0.3, 0.24], [-0.1, 0.08, 0], definition.color, [0, 0.18, -0.28]).name = "presentation-heart-left";
        addBox([0.25, 0.3, 0.24], [0.1, 0.08, 0], definition.color, [0, 0.18, 0.28]).name = "presentation-heart-right";
        addBox([0.21, 0.26, 0.22], [0, -0.09, 0], dark, [0, 0.18, Math.PI / 4], icon.includes("dragon")).name = "presentation-heart-core";
      } else if (icon.includes("scale") || item === Item.GlowScale) {
        for (let plate = 0; plate < 3; plate += 1) addBox([0.24, 0.055, 0.32], [(plate - 1) * 0.12, 0.03 + plate * 0.055, 0], plate === 1 ? light : definition.color, [0.08, 0.25, (plate - 1) * 0.18]).name = `presentation-scale-${plate + 1}`;
      } else {
        addBox([0.1, 0.46, 0.1], [0, 0.05, 0], 0xd9cfb4, [0.35, 0.2, -0.65]).name = "presentation-creature-part-shaft";
        addBox([0.18, 0.14, 0.16], [-0.14, -0.1, 0], definition.color, [0.2, 0.1, -0.2]).name = "presentation-creature-part-detail";
      }
    } else if (family === "relic") {
      addBox([0.24, 0.31, 0.22], [0, 0.08, 0], definition.color, [0, 0.18, Math.PI / 4], true).name = "presentation-relic-core";
      for (const side of [-1, 1]) {
        addBox([0.07, 0.39, 0.08], [side * 0.18, 0.03, 0], dark, [0.15, side * 0.12, side * -0.28]).name = `presentation-relic-prong-${side < 0 ? "left" : "right"}`;
        addBox([0.12, 0.07, 0.13], [side * 0.18, 0.25, 0], light, [0, side * 0.15, Math.PI / 4], true).name = `presentation-relic-light-${side < 0 ? "left" : "right"}`;
      }
      addBox([0.34, 0.08, 0.27], [0, -0.17, 0], dark).name = "presentation-relic-base";
    } else if (family === "armor" || family === "equipment") {
      if (definition.equipmentSlot === "head") {
        addBox([0.42, 0.28, 0.38], [0, 0.08, 0], definition.color, [0.02, 0.2, 0]).name = "presentation-armor-crown";
        addBox([0.45, 0.08, 0.4], [0, -0.08, 0], dark, [0.02, 0.2, 0]).name = "presentation-armor-rim";
      } else if (definition.equipmentSlot === "feet") {
        for (const side of [-1, 1]) addBox([0.19, 0.24, 0.34], [side * 0.12, 0, -0.04], side < 0 ? definition.color : light, [0, 0.2, 0]).name = `presentation-boot-${side < 0 ? "left" : "right"}`;
      } else {
        addBox([0.42, 0.4, 0.19], [0, 0.05, 0], definition.color, [0.04, 0.2, 0]).name = "presentation-equipment-body";
        addBox([0.48, 0.09, 0.22], [0, 0.2, 0], light, [0.04, 0.2, 0]).name = "presentation-equipment-trim";
        addBox([0.08, 0.45, 0.23], [0, 0.04, 0], dark, [0.04, 0.2, 0]).name = "presentation-equipment-spine";
      }
    } else if (family === "capture") {
      const glass = new THREE.MeshLambertMaterial({ color: 0xb8e7e8, transparent: true, opacity: 0.46, depthWrite: false });
      const vessel = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.39, 0.31), glass);
      vessel.name = "presentation-capture-vessel";
      vessel.position.y = 0.04;
      vessel.rotation.y = 0.18;
      group.add(vessel);
      addBox([0.38, 0.07, 0.35], [0, -0.17, 0], dark, [0, 0.18, 0]).name = "presentation-capture-base";
      addBox([0.25, 0.08, 0.24], [0, 0.27, 0], 0x76583b, [0, 0.18, 0]).name = "presentation-capture-lid";
      addBox([0.15, 0.16, 0.13], [0, 0.03, 0], definition.color, [0.1, 0.28, Math.PI / 4], true).name = "presentation-capture-resident";
    } else if (family === "container") {
      addBox([0.42, 0.32, 0.35], [0, 0.02, 0], definition.color, [0.04, 0.2, 0]).name = "presentation-container-body";
      addBox([0.45, 0.07, 0.38], [0, 0.21, 0], light, [0.04, 0.2, 0]).name = "presentation-container-lid";
      for (const side of [-1, 1]) addBox([0.055, 0.35, 0.39], [side * 0.17, 0.03, 0], dark, [0.04, 0.2, 0]).name = `presentation-container-band-${side < 0 ? "left" : "right"}`;
    } else if (family === "ammunition") {
      for (let bolt = 0; bolt < 3; bolt += 1) {
        addBox([0.055, 0.48, 0.055], [(bolt - 1) * 0.09, 0.04, 0], dark, [0.75, 0, -0.28 + bolt * 0.12]).name = `presentation-ammunition-shaft-${bolt + 1}`;
        addBox([0.12, 0.1, 0.08], [(bolt - 1) * 0.09 - 0.14, 0.2, 0], definition.color, [0.75, 0, -0.28 + bolt * 0.12]).name = `presentation-ammunition-head-${bolt + 1}`;
      }
    } else {
      addBox([0.34, 0.3, 0.28], [0, 0.04, 0], definition.color, [0.08, 0.24, -0.08]).name = "presentation-crafted-core";
      addBox([0.38, 0.07, 0.31], [0, 0.18, 0], light, [0.08, 0.24, -0.08]).name = "presentation-crafted-cap";
      addBox([0.09, 0.35, 0.32], [0, 0.04, 0], dark, [0.08, 0.24, -0.08]).name = "presentation-crafted-band";
    }
    group.scale.setScalar(0.86);
    group.rotation.set(0.08, 0.28, -0.1);
  }
  group.userData.itemPresentationFamily = itemPresentationFamily(item);
  return group;
}

/**
 * First-person hand models face back toward their owner so their authored
 * grip/front reads correctly from the camera. Keep this separate from the
 * shared third-person model transform: changing one must not flip the other.
 */
export function applyFirstPersonHeldItemOrientation(item: ItemCode, model: THREE.Object3D) {
  if (item === Item.MoonberryCookie) {
    model.rotation.y += Math.PI;
    model.userData.firstPersonReverse = true;
    return model;
  }
  if (item !== BlockId.Torch) return model;
  // Shared avatar torches counter-rotate against an articulated forward arm.
  // A first-person root has no such arm, so remove that counter-rotation before
  // reversing the camera-facing side.
  model.rotation.x = 0;
  model.rotation.y += Math.PI;
  model.userData.firstPersonReverse = true;
  return model;
}
