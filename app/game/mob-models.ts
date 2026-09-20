import * as THREE from "three";
import { sharedBoxGeometry } from "./shared-model-geometry";
import { createMorrowCreatureVisual, MORROW_VISUAL_KINDS, type MorrowVisualKind } from "./morrow-creature-models";
import { applyAdventureMobPose, createAdventureMobVisual } from "./adventure-models";
import { applyLivingBestiaryPose, createLivingBestiaryMobVisual, LIVING_BESTIARY_VISUAL_KINDS, type LivingBestiaryVisualKind } from "./living-bestiary-models";
import {
  ATLANTIAN_TRIDENT_CONTRACT,
  createZombieSpec,
  FACTION_WEAPON_CONTRACTS,
  FISH_FIN_ATTACHMENT_OVERLAP,
  LEVIATHAN_VISUAL_CONTRACTS,
  RATTLEKIN_CLUB_CONTRACT,
  RIDGEBACK_GROUND_LIFT,
} from "./model-specs";
import {
  ADVENTURE_MOB_ORDER,
  CORE_MOB_ORDER,
  MOB_DEFS,
  type AdventureMobKind,
  type BirdKind,
  type CoreMobKind,
  type DragonKind,
  type MobKind,
  type SeaSlugKind,
  type UndergroundMobKind,
} from "./mobs";
import { createArrowVisual } from "./projectiles";
import { DRAGON_VARIANTS, dragonVariantForSeed, isDragonVariantForType, type DragonType, type DragonVariantId } from "./dragons";
import { applyEmbercarapaceBeetlePose, createEmbercarapaceBeetleVisual } from "./tripo-creature-models";

const TAU = Math.PI * 2;
/** Counteracts the rotated repair-prong bounds so the Veinling's contact plane is exactly local Y=0. */
const VEINLING_GROUND_LIFT = 0.013127071559450247;

const GENERIC_FISH_KINDS = [
  "shoalfin", "coralback", "brookdart", "gloomfin", "silverthread", "reedneedle", "emberribbon", "cavefilament",
  "redfin-salmon", "blue-mackerel", "glassfin", "lanternjaw", "syrupfin", "glowfin", "pocket-goldfish",
  "sunwheel-angelfish", "stonewhisker-loach",
] as const satisfies readonly CoreMobKind[];

const SEA_SLUG_KINDS = [
  "sunset-sea-slug", "moonlace-sea-slug", "blue-dragon-sea-slug", "leafsheep-sea-slug", "sea-bunny-nudibranch",
  "spanish-dancer-sea-slug", "crystal-tipped-nudibranch", "ringed-phyllidia", "hooded-melibe", "sea-angel-slug",
  "embercrown-sea-slug", "kelpwarden-sea-slug", "starlight-choir-sea-slug", "voidglass-sea-slug",
] as const satisfies readonly SeaSlugKind[];

export type MobVisualParts = Record<"legs" | "wings" | "arms" | "head" | "body", THREE.Object3D[]>;

export type MobVisual = {
  group: THREE.Group;
  visual: THREE.Group;
  parts: MobVisualParts;
};

export type DragonAnimationMode = "idle" | "walk" | "fly" | "melee" | "breath" | "projectile" | "hurt" | "sleep";
export type DragonRenderEquipment = Readonly<{
  saddle?: boolean;
  leftChest?: boolean;
  rightChest?: boolean;
  armor?: Partial<Record<"head" | "neck" | "body" | "tail", boolean>>;
}>;
export type DragonPoseInput = Readonly<{
  timeSeconds: number;
  stage?: 1 | 2 | 3 | 4 | 5;
  mode?: DragonAnimationMode;
  /** Keeps aerial attack and hurt overlays on the streamlined flight rig. */
  airborne?: boolean;
  movement?: number;
  attackProgress?: number;
  bank?: number;
  pitch?: number;
  /** Bounded local yaw used to keep attacks visually aligned during a strafe. */
  lookYaw?: number;
  sex?: "female" | "male";
  equipment?: DragonRenderEquipment;
}>;

export const DRAGON_MODEL_CONTRACT = Object.freeze({
  neckSegments: 3,
  tailSegments: 7,
  wingPivotsPerSide: 2,
  legJointsPerLeg: 3,
  armorSlots: ["head", "neck", "body", "tail"] as const,
  cargoChests: 2,
  forwardAxis: "-z" as const,
  authoredLifeStages: [1, 2, 3] as const,
  shoulderCarryStage: 1 as const,
});

type DragonVariantSilhouette = Readonly<{
  body: readonly [number, number, number];
  head: number;
  neck: number;
  wing: readonly [number, number];
  leg: number;
  stance: number;
  tail: number;
  motif: "crest" | "coil" | "crown" | "kite" | "plume" | "fang" | "manta" | "reef" | "gear" | "anvil" | "razor" | "roc" | "idol" | "hart" | "moth" | "crescent";
}>;

/**
 * The reviewed adult alternatives are body plans, not palette swaps. These
 * bounded transforms preserve the production rig and all equipment sockets
 * while changing mass, stance, wing loading, head proportions, and tail
 * cadence enough for each lineage to read at field-guide distance.
 */
export const DRAGON_VARIANT_SILHOUETTES: Readonly<Record<DragonVariantId, DragonVariantSilhouette>> = Object.freeze({
  furnacecrest: { body: [1.18, 1.12, .96], head: 1.12, neck: .9, wing: [.92, .92], leg: 1.05, stance: 1.12, tail: .92, motif: "crest" },
  cindercoil: { body: [.82, .92, 1.2], head: .92, neck: 1.22, wing: [1.08, .9], leg: .86, stance: .82, tail: 1.34, motif: "coil" },
  crownflare: { body: [1.12, 1.02, 1.04], head: 1.18, neck: .96, wing: [.58, .72], leg: 1.12, stance: 1.08, tail: 1.02, motif: "crown" },
  emberkite: { body: [.76, .88, .92], head: .82, neck: 1.12, wing: [1.34, 1.18], leg: .92, stance: .78, tail: 1.12, motif: "kite" },
  glacierhorn: { body: [1.12, 1.08, 1.02], head: 1.1, neck: .94, wing: [.94, .9], leg: 1.12, stance: 1.12, tail: .96, motif: "crest" },
  rimeplume: { body: [.86, .92, .96], head: .9, neck: 1.08, wing: [1.2, 1.12], leg: 1.04, stance: .86, tail: 1.08, motif: "plume" },
  hoarfang: { body: [1.16, 1.04, .9], head: 1.2, neck: .86, wing: [.82, .78], leg: 1.02, stance: 1.16, tail: .86, motif: "fang" },
  prismcoil: { body: [.78, .88, 1.18], head: .9, neck: 1.24, wing: [1.1, .94], leg: .84, stance: .8, tail: 1.34, motif: "coil" },
  rivetback: { body: [1.14, 1.08, 1.04], head: 1.08, neck: .94, wing: [.92, .86], leg: 1.08, stance: 1.14, tail: 1.0, motif: "gear" },
  gearwing: { body: [.94, .96, .94], head: .94, neck: 1.0, wing: [1.26, 1.08], leg: .94, stance: .96, tail: .94, motif: "gear" },
  anvilback: { body: [1.3, 1.16, .92], head: 1.22, neck: .82, wing: [.68, .7], leg: 1.18, stance: 1.24, tail: .86, motif: "anvil" },
  razorfan: { body: [.82, .9, 1.04], head: .86, neck: 1.12, wing: [1.22, .86], leg: .92, stance: .84, tail: 1.18, motif: "razor" },
  tidemane: { body: [1.02, 1.06, 1.02], head: 1.1, neck: .98, wing: [.92, 1.12], leg: 1.02, stance: 1.0, tail: 1.08, motif: "crest" },
  mantaroyal: { body: [1.18, .76, 1.04], head: .92, neck: .9, wing: [1.42, 1.34], leg: .96, stance: 1.08, tail: .92, motif: "manta" },
  ribboncoil: { body: [.72, .8, 1.24], head: .82, neck: 1.28, wing: [1.12, 1.0], leg: .74, stance: .76, tail: 1.42, motif: "coil" },
  reefcrown: { body: [1.16, 1.08, .96], head: 1.18, neck: .9, wing: [.86, 1.02], leg: 1.04, stance: 1.14, tail: .94, motif: "reef" },
  sunmane: { body: [1.1, 1.04, 1.0], head: 1.12, neck: .96, wing: [1.02, 1.0], leg: 1.06, stance: 1.08, tail: 1.0, motif: "crest" },
  "auric-roc": { body: [.84, .94, .9], head: .82, neck: 1.1, wing: [1.38, 1.24], leg: 1.04, stance: .84, tail: .86, motif: "roc" },
  "treasury-coil": { body: [.8, .9, 1.2], head: .94, neck: 1.24, wing: [.94, .86], leg: .8, stance: .82, tail: 1.38, motif: "coil" },
  idolback: { body: [1.26, 1.14, .94], head: 1.2, neck: .84, wing: [.72, .72], leg: 1.14, stance: 1.2, tail: .9, motif: "idol" },
  moonhart: { body: [1.02, 1.04, 1.04], head: 1.08, neck: 1.06, wing: [.92, .94], leg: 1.12, stance: .96, tail: 1.08, motif: "hart" },
  "argent-moth": { body: [.78, .86, .9], head: .82, neck: 1.08, wing: [1.42, 1.3], leg: .84, stance: .78, tail: .88, motif: "moth" },
  mirrorcoil: { body: [.74, .84, 1.22], head: .86, neck: 1.28, wing: [1.06, .9], leg: .78, stance: .78, tail: 1.4, motif: "coil" },
  "crescent-wyvern": { body: [.84, .94, 1.02], head: .9, neck: 1.12, wing: [1.3, 1.08], leg: .88, stance: .84, tail: 1.2, motif: "crescent" },
});

/**
 * Selects one authored dragon silhouette without rebuilding its Three.js tree.
 * Stages 3-5 deliberately share the mature form and continue to grow smoothly;
 * stages 1 and 2 are independent hatchling/fledgling rigs. Keeping this switch
 * separate from pose animation makes save restoration and Bestiary rendering
 * deterministic and prevents a one-frame adult flash after hatching.
 */
export function applyDragonLifeStage(root: THREE.Object3D, stage: 1 | 2 | 3 | 4 | 5) {
  const type = root.userData.dragonType as "fire" | "ice" | "steel" | "sea" | "gold" | "silver" | undefined;
  if (!type) return false;
  const prefix = `${type}-dragon`;
  const resolved = THREE.MathUtils.clamp(Math.round(stage), 1, 5) as 1 | 2 | 3 | 4 | 5;
  const adult = root.getObjectByName(`${prefix}-adult-form`);
  const hatchling = root.getObjectByName(`${prefix}-stage-1-form`);
  const fledgling = root.getObjectByName(`${prefix}-stage-2-form`);
  if (adult) adult.visible = resolved >= 3;
  if (hatchling) hatchling.visible = resolved === 1;
  if (fledgling) fledgling.visible = resolved === 2;
  root.userData.dragonVisualStage = resolved;
  const visual = root.getObjectByName(`${prefix}-visual`);
  if (visual) visual.userData.dragonVisualStage = resolved;
  return Boolean(adult && hatchling && fledgling);
}

export function applyDragonVariant(root: THREE.Object3D, requested: DragonVariantId) {
  const type = root.userData.dragonType as DragonType | undefined;
  if (!type) return false;
  const variant = isDragonVariantForType(type, requested) ? requested : dragonVariantForSeed(type, Number(root.userData.mobId) || 0);
  const prefix = `${type}-dragon`;
  const adult = root.getObjectByName(`${prefix}-adult-form`);
  if (!adult) return false;
  const selected = adult.children.find((child) => child.userData.dragonVariant === variant);
  if (!selected) return false;
  for (const child of adult.children) child.visible = child === selected;
  // Named-rig lookup is a long-standing public contract used by animation,
  // equipment, portraits, and debugging tools. Put the live clone first so a
  // root-level getObjectByName always resolves the visible anatomy rather than
  // an inactive sibling carrying the same stable joint names.
  const selectedIndex = adult.children.indexOf(selected);
  if (selectedIndex > 0) {
    adult.children.splice(selectedIndex, 1);
    adult.children.unshift(selected);
  }
  root.userData.dragonVariant = variant;
  const visual = root.getObjectByName(`${prefix}-visual`);
  if (visual) visual.userData.dragonVariant = variant;
  return true;
}

/** Applies the same named dragon rig used by gameplay, portraits, and the inspector. */
export function applyDragonPose(root: THREE.Object3D, input: DragonPoseInput) {
  const type = root.userData.dragonType as "fire" | "ice" | "steel" | "sea" | "gold" | "silver" | undefined;
  if (!type) return false;
  const prefix = `${type}-dragon`;
  const time = Number.isFinite(input.timeSeconds) ? input.timeSeconds : 0;
  const movement = THREE.MathUtils.clamp(input.movement ?? 0, 0, 1);
  const attack = THREE.MathUtils.clamp(input.attackProgress ?? 0, 0, 1);
  const lookYaw = THREE.MathUtils.clamp(input.lookYaw ?? 0, -0.95, 0.95);
  const mode = input.mode ?? "idle";
  const airborne = input.airborne ?? (mode === "fly" || mode === "breath" || mode === "projectile");
  const stage = input.stage ?? (Number(root.userData.dragonVisualStage) || 5) as 1 | 2 | 3 | 4 | 5;
  applyDragonLifeStage(root, stage);
  const adult = root.getObjectByName(`${prefix}-adult-form`);
  const activeAdult = stage >= 3 ? adult?.children.find((child) => child.visible) : null;
  const object = (suffix: string) => (activeAdult ?? root).getObjectByName(`${prefix}-${suffix}`);
  const attackWindup = THREE.MathUtils.smoothstep(attack, 0, 0.28);
  const attackStrike = Math.sin(THREE.MathUtils.clamp((attack - 0.2) / 0.5, 0, 1) * Math.PI);
  const attackRecovery = THREE.MathUtils.smoothstep(attack, 0.62, 1);
  const speciesTempo = type === "steel" ? 0.82 : type === "sea" ? 1.18 : type === "silver" ? 1.08 : 1;
  // Airborne quadrupeds read best when the limbs streamline behind the chest
  // instead of reaching into the direction of travel. The small species bias
  // preserves character: Steel carries its weight a little lower, while Sea
  // and Silver make the longest, cleanest sweep. Values are absolute targets,
  // so repeated pose calls never accumulate rotation drift.
  const flightTrailBias = type === "steel" ? 0.08
    : type === "sea" ? -0.1
      : type === "silver" ? -0.07
        : type === "gold" ? -0.05
          : type === "ice" ? -0.03
            : 0;
  const flightFlexBias = type === "steel" ? 0.08 : type === "sea" ? -0.05 : type === "silver" ? -0.03 : 0;
  const rest = mode === "sleep" ? 0.28 : 1;

  const chest = object("breathing-chest-pivot");
  if (chest) {
    const breath = 1 + Math.sin(time * (mode === "breath" ? 7.5 : 2.2) * speciesTempo) * (mode === "breath" ? 0.075 : 0.025) * rest;
    chest.scale.set(1 / Math.sqrt(breath), breath, breath);
  }
  for (let index = 1; index <= DRAGON_MODEL_CONTRACT.neckSegments; index += 1) {
    const neck = object(`neck-${index}-pivot`);
    if (!neck) continue;
    neck.rotation.y = Math.sin(time * 1.3 * speciesTempo - index * 0.58) * 0.035 * rest
      + (input.bank ?? 0) * 0.08 + lookYaw * (0.08 + index * 0.055);
    neck.rotation.x = (input.pitch ?? 0) * (0.12 + index * 0.035)
      + (mode === "breath" || mode === "projectile" ? attackWindup * 0.13 - attackStrike * 0.2 + attackRecovery * 0.07 : 0)
      + (mode === "melee" ? attackWindup * -0.12 + attackStrike * 0.24 : 0);
  }
  const head = object("head-pivot");
  if (head) {
    head.rotation.x = (input.pitch ?? 0) * 0.34
      + (mode === "melee" ? attackWindup * -0.3 + attackStrike * 0.62 - attackRecovery * 0.12 : 0)
      + (mode === "breath" || mode === "projectile" ? attackWindup * 0.16 - attackStrike * 0.18 : 0)
      + (mode === "sleep" ? 0.18 : Math.sin(time * 0.52 * speciesTempo) * 0.015);
    head.rotation.y = Math.sin(time * 0.65 * speciesTempo) * (mode === "idle" ? 0.055 : mode === "sleep" ? 0.018 : 0)
      + lookYaw * 0.34;
  }
  const jaw = object("jaw-pivot");
  if (jaw) jaw.rotation.x = mode === "breath" || mode === "projectile" ? 0.58 * attackWindup * (1 - attackRecovery * 0.7) : mode === "melee" ? 0.82 * attackStrike : 0.025 + Math.sin(time * 1.1 * speciesTempo) * 0.01 * rest;

  for (let index = 1; index <= DRAGON_MODEL_CONTRACT.tailSegments; index += 1) {
    const tail = object(`tail-${index}-pivot`);
    if (!tail) continue;
    const attackWhip = (mode === "melee" ? attackStrike * Math.sin(index * 0.68) * 0.085 : 0);
    tail.rotation.y = Math.sin(time * (airborne ? 2.7 : 1.45) * speciesTempo - index * 0.62) * (airborne ? 0.09 : 0.055) * index * rest + attackWhip;
    tail.rotation.x = airborne ? Math.sin(time * 1.2 * speciesTempo - index * 0.35) * 0.025 : Math.max(0, index - 4) * 0.025 + (mode === "sleep" ? 0.025 * index : 0);
  }

  for (const side of ["left", "right"] as const) {
    const sign = side === "left" ? -1 : 1;
    const wing = object(`${side}-wing-root-pivot`);
    const forearm = object(`${side}-wing-forearm-pivot`);
    if (wing) {
      const beat = Math.sin(time * 4.2 * speciesTempo);
      const powerStroke = Math.sign(beat) * Math.pow(Math.abs(beat), 0.72);
      wing.rotation.z = sign * (airborne ? 0.18 + powerStroke * 0.55 : mode === "sleep" ? 0.5 : 0.34 + Math.sin(time * 0.9 * speciesTempo) * 0.025);
      wing.rotation.x = airborne ? -0.08 + (input.pitch ?? 0) * 0.16 : -0.38;
      wing.rotation.y = sign * (input.bank ?? 0) * 0.18;
    }
    if (forearm) forearm.rotation.z = sign * (airborne ? 0.13 + Math.sin(time * 4.2 * speciesTempo + 0.52) * 0.24 : mode === "sleep" ? 0.42 : 0.28);
  }

  // Hatchling/fledgling rigs have compact independent joints. Stage I keeps
  // its low-amplitude shoulder pose, while Stage II has articulated knees and
  // paws so its flight silhouette can streamline without becoming four stiff
  // parallel rods.
  const youngForm = stage === 1 ? "hatchling" : stage === 2 ? "fledgling" : null;
  if (youngForm) {
    const youngWingRate = (airborne ? 7.2 : 2.1) * (stage === 1 ? 1.2 : 1) * speciesTempo;
    const youngHead = object(`${youngForm}-head-pivot`);
    const youngJaw = object(`${youngForm}-jaw-pivot`);
    const youngChest = object(`${youngForm}-chest-pivot`);
    if (youngChest) {
      const puff = 1 + Math.sin(time * 2.8 * speciesTempo) * 0.035;
      youngChest.scale.set(1 / Math.sqrt(puff), puff, puff);
      youngChest.rotation.z = mode === "idle" ? Math.sin(time * 0.72) * 0.025 : 0;
    }
    if (youngHead) {
      youngHead.rotation.y = Math.sin(time * 0.86 * speciesTempo) * (mode === "idle" ? 0.12 : 0.035) + lookYaw * 0.55;
      youngHead.rotation.x = (input.pitch ?? 0) * 0.28 + (mode === "melee" ? attackStrike * 0.5 : 0) + Math.sin(time * 1.35) * 0.018;
    }
    if (youngJaw) youngJaw.rotation.x = mode === "breath" || mode === "projectile" ? attackWindup * 0.54 : mode === "melee" ? attackStrike * 0.7 : 0.035;
    for (const side of ["left", "right"] as const) {
      const sign = side === "left" ? -1 : 1;
      const wing = object(`${youngForm}-${side}-wing-pivot`);
      const tip = object(`${youngForm}-${side}-wing-tip-pivot`);
      if (wing) wing.rotation.z = sign * (airborne ? 0.2 + Math.sin(time * youngWingRate) * 0.68 : 0.52 + Math.sin(time * 1.4) * 0.035);
      if (tip) tip.rotation.z = sign * (airborne ? 0.24 + Math.sin(time * youngWingRate + 0.62) * 0.28 : 0.35);
    }
    for (const [position, phase] of [["front-left", 0], ["front-right", Math.PI], ["rear-left", Math.PI], ["rear-right", 0]] as const) {
      const leg = object(`${youngForm}-${position}-leg-pivot`);
      const knee = object(`${youngForm}-${position}-knee-pivot`);
      const claw = object(`${youngForm}-${position}-claw-pivot`);
      const front = position.startsWith("front");
      const sideSign = position.includes("left") ? -1 : 1;
      const stride = Math.sin(time * 7 + phase) * movement;
      if (leg) {
        if (airborne && stage === 2) {
          const wake = Math.sin(time * 2.15 * speciesTempo + phase + (front ? 0 : 0.7)) * 0.035;
          leg.rotation.x = (front ? -1.22 : -1.36) + flightTrailBias + wake;
        } else {
          // Preserve the original Stage I flight/shoulder behavior and the
          // original grounded young-dragon stride.
          leg.rotation.x = airborne ? (front ? 0.7 : -0.42) : stride * 0.48;
        }
        leg.rotation.z = airborne && stage === 2 ? sideSign * (front ? 0.3 : 0.22) : 0;
      }
      if (knee) {
        knee.rotation.x = airborne
          ? (front ? 0.32 : 0.24) + flightFlexBias
          : Math.max(0, -stride) * 0.62;
        knee.rotation.z = airborne ? sideSign * -0.12 : 0;
      }
      if (claw) {
        claw.rotation.x = airborne
          ? (front ? -0.4 : -0.32) - flightFlexBias * 0.4
          : -Math.max(0, stride) * 0.22;
        claw.rotation.z = airborne ? sideSign * 0.05 : 0;
      }
    }
    for (let index = 1; index <= 4; index += 1) {
      const tail = object(`${youngForm}-tail-${index}-pivot`);
      if (tail) tail.rotation.y = Math.sin(time * 2.4 * speciesTempo - index * 0.72) * (0.08 + index * 0.035) + (mode === "melee" ? attackStrike * 0.05 * index : 0);
    }
  }

  for (const position of ["front-left", "front-right", "rear-left", "rear-right"] as const) {
    const sidePhase = position.includes("left") ? 0 : Math.PI;
    const stride = Math.sin(time * 6.1 + sidePhase + (position.startsWith("rear") ? Math.PI : 0)) * movement;
    const hip = object(`${position}-hip-pivot`);
    const knee = object(`${position}-knee-pivot`);
    const claw = object(`${position}-claw-pivot`);
    const front = position.startsWith("front");
    const sideSign = position.includes("left") ? -1 : 1;
    const wake = Math.sin(time * 1.9 * speciesTempo + sidePhase + (front ? 0 : 0.62)) * 0.04;
    if (hip) {
      hip.rotation.x = airborne
        ? (front ? -1.12 : -1.3) + flightTrailBias + wake
        : stride * 0.5;
      hip.rotation.z = airborne ? sideSign * (front ? 0.32 : 0.24) : 0;
    }
    if (knee) {
      knee.rotation.x = airborne
        ? (front ? 0.3 : 0.22) + flightFlexBias - wake * 0.35
        : Math.max(0, -stride) * 0.65;
      knee.rotation.z = airborne ? sideSign * -0.14 : 0;
    }
    if (claw) {
      claw.rotation.x = airborne
        ? (front ? -0.38 : -0.3) - flightFlexBias * 0.4 + wake * 0.2
        : -Math.max(0, stride) * 0.22;
      claw.rotation.z = airborne ? sideSign * 0.06 : 0;
    }
  }

  const emitter = object("breath-emitter");
  const projectile = object("projectile-origin");
  if (emitter) emitter.visible = mode === "breath" && attack > 0.08 && attack < 0.94;
  if (projectile) projectile.visible = mode === "projectile" && attack > 0.42 && attack < 0.8;
  const maleWingMarkings = object("male-wing-markings");
  const maleHornRack = object("male-horn-rack");
  const femaleHornRack = object("female-horn-rack");
  const sex = input.sex ?? root.userData.dragonSex;
  if (maleWingMarkings) maleWingMarkings.visible = sex === "male";
  if (maleHornRack) maleHornRack.visible = sex === "male";
  if (femaleHornRack) femaleHornRack.visible = sex === "female";
  root.traverse((child) => {
    if (child.userData.sexMarker === "male") child.visible = sex === "male";
    else if (child.userData.sexMarker === "female") child.visible = sex === "female";
    if (child.userData.dragonShimmer) {
      const phase = Number(child.userData.shimmerPhase ?? 0);
      const pulse = 0.84 + Math.sin(time * 3.15 + phase) * 0.18;
      child.scale.setScalar(pulse);
      if (child.userData.dragonOrbit) child.rotation.y = time * (0.35 + phase * 0.025) + phase;
    }
    if (child.userData.dragonIdleAccent) {
      const base = Number(child.userData.dragonIdleBaseRotationZ ?? child.rotation.z);
      child.userData.dragonIdleBaseRotationZ = base;
      const phase = Number(child.userData.dragonIdlePhase ?? 0);
      child.rotation.z = base + Math.sin(time * (1.15 + phase * 0.07) * speciesTempo + phase) * 0.035 * rest;
    }
  });

  if (input.equipment) {
    const equipment = input.equipment;
    const visibility: Record<string, boolean> = {
      saddle: equipment.saddle === true,
      "left-cargo": equipment.leftChest === true,
      "right-cargo": equipment.rightChest === true,
      "head-armor": equipment.armor?.head === true,
      "neck-armor": equipment.armor?.neck === true,
      "body-armor": equipment.armor?.body === true,
      "tail-armor": equipment.armor?.tail === true,
    };
    for (const [suffix, visible] of Object.entries(visibility)) {
      // Adult variants are complete rig clones so their silhouettes can differ
      // without sharing mutable bones. Keep equipment state synchronized across
      // every clone: only the selected form is rendered, and changing variants
      // can never reveal stale tack or armor.
      let updatedAdultAttachment = false;
      if (stage >= 3 && adult) {
        for (const form of adult.children) {
          const attachment = form.getObjectByName(`${prefix}-${suffix}`);
          if (!attachment) continue;
          attachment.visible = visible;
          updatedAdultAttachment = true;
        }
      }
      if (!updatedAdultAttachment) {
        const attachment = object(suffix);
        if (attachment) attachment.visible = visible;
      }
    }
  }
  return true;
}

export const SENTIENT_LOD_MAX_MESHES = 5;

/**
 * A five-piece resident silhouette for the middle distance. The body palette
 * preserves faction identity, while the final marker changes silhouette and
 * color by profession so guards, leaders, growers, traders, and crafters remain
 * readable without drawing thirty-plus tiny boxes per character.
 */
export function createSentientLodVisual(kind: MobKind, id: number, bounds: THREE.Box3) {
  const definition = MOB_DEFS[kind];
  if (!definition?.sentient) throw new Error(`'${kind}' is not a sentient mob.`);
  const group = new THREE.Group();
  group.name = `${kind}-sentient-lod`;
  group.userData.mobId = id;
  group.userData.sentientLod = true;
  group.userData.lodRole = definition.role ?? "resident";
  group.visible = false;

  const extent = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const height = Math.max(0.9, extent.y);
  const width = Math.max(0.46, Math.min(0.82, extent.x * 0.72));
  const depth = Math.max(0.34, Math.min(0.58, extent.z * 0.58));
  const bottom = bounds.min.y;
  const atlantian = kind.startsWith("atlantian-");
  const hobbit = kind.startsWith("hobbit-");
  const sugarcourt = kind.startsWith("sugarcourt-");
  const woodElf = kind.startsWith("wood-elf-");
  const dwarf = kind.startsWith("dwarf-");
  const skinColor = atlantian ? 0x4e9eaa : sugarcourt ? 0xf0b5c9 : woodElf ? 0xb98e72 : dwarf ? 0xb87958 : hobbit ? 0xc9916c : 0x78924e;
  const [bodyColor, accentColor, eyeColor] = definition.colors;
  const role = definition.role ?? "resident";
  const roleColor = role === "mayor" || role === "chieftain" ? 0xf1cf73
    : role === "guard" ? (atlantian ? 0x73f0dc : sugarcourt ? 0x78d8b5 : woodElf ? 0x78e6b0 : dwarf ? 0xd59a53 : 0xc98556)
      : role === "farmer" || role === "worker" ? 0x86b968
        : role === "miner" ? 0xa9b5ba
          : role === "merchant" || role === "banker" ? 0xb899d1
            : role === "alchemist" ? 0xd889e7 : accentColor;

  const add = (
    name: string,
    size: readonly [number, number, number],
    color: THREE.ColorRepresentation,
    position: readonly [number, number, number],
    basic = false,
  ) => {
    const material = basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(sharedBoxGeometry(...size), material);
    mesh.name = `${kind}-lod-${name}`;
    mesh.position.set(...position);
    mesh.userData.mobId = id;
    mesh.userData.sentientLod = true;
    group.add(mesh);
    return mesh;
  };

  const bodyHeight = height * 0.46;
  add("body", [width, bodyHeight, depth], bodyColor, [center.x, bottom + height * 0.42, center.z]);
  add("base", [width * 0.82, height * 0.2, depth * 0.76], accentColor, [center.x, bottom + height * 0.1, center.z + depth * 0.04]);
  const headWidth = width * 0.76;
  const headHeight = height * 0.27;
  add("head", [headWidth, headHeight, depth * 0.92], skinColor, [center.x, bottom + height * 0.79, center.z - depth * 0.03]);
  add("eyes", [headWidth * 0.58, Math.max(0.045, height * 0.035), depth * 0.08], eyeColor,
    [center.x, bottom + height * 0.82, center.z - depth * 0.51], true);

  if (role === "mayor" || role === "chieftain") {
    add("leader-crown", [width * 0.78, height * 0.08, depth * 0.74], roleColor,
      [center.x, bottom + height * 0.98, center.z], true);
  } else if (role === "guard") {
    add("guard-pole", [Math.max(0.07, width * 0.12), height * 0.78, Math.max(0.07, depth * 0.14)], roleColor,
      [center.x + width * 0.62, bottom + height * 0.48, center.z - depth * 0.12], atlantian);
  } else {
    const badge = add(`${role}-badge`, [width * 0.48, height * 0.18, depth * 0.1], roleColor,
      [center.x, bottom + height * 0.48, center.z - depth * 0.55], role === "alchemist");
    if (role === "miner") badge.rotation.z = -0.55;
  }

  return group;
}

/**
 * Builds the canonical production creature model used by the world, the model
 * inspector, and the bestiary portraits. Keep cosmetic geometry here so those
 * three surfaces can never silently drift apart.
 */
export function createMobVisual(kind: MobKind, id: number): MobVisual {
  if (!CORE_MOB_ORDER.includes(kind as CoreMobKind)) throw new Error(`'${kind}' is not a world mob visual.`);
  if ((MORROW_VISUAL_KINDS as readonly string[]).includes(kind)) return createMorrowCreatureVisual(kind as MorrowVisualKind, id);
  if (kind === "embercarapace-beetle") return createEmbercarapaceBeetleVisual(id);
  if (ADVENTURE_MOB_ORDER.includes(kind as AdventureMobKind)) return createAdventureMobVisual(kind as AdventureMobKind, id);
  if ((LIVING_BESTIARY_VISUAL_KINDS as readonly MobKind[]).includes(kind)) return createLivingBestiaryMobVisual(kind as LivingBestiaryVisualKind, id);

  const group = new THREE.Group();
  const visual = new THREE.Group();
  group.name = `${kind}-root`;
  visual.name = `${kind}-visual`;
  group.add(visual);
  const parts: MobVisualParts = { legs: [], wings: [], arms: [], head: [], body: [] };
  const [bodyColor, accentColor, eyeColor] = MOB_DEFS[kind].colors;
  const bodyMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
  const accentMaterial = new THREE.MeshLambertMaterial({ color: accentColor });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: eyeColor });
  const darkMaterial = new THREE.MeshLambertMaterial({ color: new THREE.Color(bodyColor).multiplyScalar(0.62) });
  const material = (color: THREE.ColorRepresentation, emissive = false, opacity = 1) => emissive
    ? new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity })
    : new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity });
  const add = (
    parent: THREE.Object3D,
    size: [number, number, number],
    meshMaterial: THREE.Material,
    position: [number, number, number],
    part?: keyof MobVisualParts,
    name?: string,
  ) => {
    const geometry = sharedBoxGeometry(...size);
    const mesh = new THREE.Mesh(geometry, meshMaterial);
    mesh.position.set(...position);
    mesh.name = name ?? `${kind}-${part ?? "detail"}`;
    mesh.userData.mobId = id;
    parent.add(mesh);
    if (part) {
      mesh.userData.bodyPart = part;
      parts[part].push(mesh);
    }
    return mesh;
  };
  const pivotBox = (
    size: [number, number, number],
    meshMaterial: THREE.Material,
    pivotPosition: [number, number, number],
    meshOffset: [number, number, number],
    part: keyof MobVisualParts,
    name: string,
  ) => {
    const pivot = new THREE.Group();
    pivot.name = `${name}-pivot`;
    pivot.position.set(...pivotPosition);
    visual.add(pivot);
    const mesh = add(pivot, size, meshMaterial, meshOffset, undefined, name);
    mesh.userData.bodyPart = part;
    parts[part].push(pivot);
    return pivot;
  };
  const eyePair = (x: number, y: number, z: number, size = 0.065, prefix = kind) => {
    add(visual, [size, size, 0.035], eyeMaterial, [-x, y, z], undefined, `${prefix}-left-eye`);
    add(visual, [size, size, 0.035], eyeMaterial, [x, y, z], undefined, `${prefix}-right-eye`);
  };
  const quadrupedLegs = (
    x: number,
    frontZ: number,
    rearZ: number,
    pivotY: number,
    length: number,
    width: number,
    legMaterial: THREE.Material,
    prefix = kind,
  ) => {
    const created: THREE.Group[] = [];
    for (const [px, pz, phase, name] of [
      [-x, frontZ, 0, "front-left"], [x, frontZ, Math.PI, "front-right"],
      [-x, rearZ, Math.PI, "rear-left"], [x, rearZ, 0, "rear-right"],
    ] as Array<[number, number, number, string]>) {
      const leg = pivotBox([width, length, width], legMaterial, [px, pivotY, pz], [0, -length / 2, 0], "legs", `${prefix}-${name}-leg`);
      leg.userData.phase = phase;
      leg.userData.legName = name;
      created.push(leg);
    }
    return created;
  };

  /** Builds four deliberately different bird silhouettes on the shared wing rig. */
  const buildBird = (birdKind: BirdKind) => {
    const prefix = birdKind;
    const blackMaterial = material(0x20252a);
    const charcoalMaterial = material(0x343a3f);
    const creamMaterial = material(0xf0e7c2);
    const whiteMaterial = material(0xf6f7ef);
    const emberMaterial = material(0xe97032);
    const goldMaterial = material(0xe7b952);
    const leafMaterial = material(0x6ca374);
    const paleLeafMaterial = material(0xc5d89a);
    const tideMaterial = material(0x5e879b);
    const deepTideMaterial = material(0x29495d);
    const iceMaterial = material(0xaed5df);
    const snowMaterial = material(0xe8f1ee);
    const billMaterial = birdKind === "emberjay" ? goldMaterial
      : birdKind === "canopy-lark" ? material(0x8a653b)
        : birdKind === "tidewing-gull" ? material(0xe5a845)
          : material(0x3b4650);

    const wing = (
      side: -1 | 1,
      size: [number, number, number],
      meshMaterial: THREE.Material,
      position: [number, number, number],
      angle: number,
    ) => {
      const sideName = side < 0 ? "left" : "right";
      const node = pivotBox(size, meshMaterial, position, [side * (size[0] * 0.42), 0, size[2] * 0.06], "wings", `${prefix}-${sideName}-wing`);
      node.rotation.z = side * -angle;
      node.userData.side = side;
      node.userData.phase = 0;
      return node;
    };
    const legs = (webbed = false, feathered = false) => {
      for (const side of [-1, 1] as const) {
        const sideName = side < 0 ? "left" : "right";
        const leg = pivotBox([0.055, feathered ? 0.18 : 0.24, 0.055], darkMaterial, [side * 0.11, -0.2, -0.02], [0, -0.1, 0], "legs", `${prefix}-${sideName}-leg`);
        if (feathered) add(leg, [0.17, 0.16, 0.16], snowMaterial, [0, -0.08, 0], undefined, `${prefix}-${sideName}-snow-boot`);
        if (webbed) {
          add(leg, [0.24, 0.035, 0.2], billMaterial, [0, -0.24, -0.07], undefined, `${prefix}-${sideName}-webbed-foot`);
          for (let toe = -1; toe <= 1; toe += 1) add(leg, [0.035, 0.025, 0.22], billMaterial, [toe * 0.07, -0.245, -0.17], undefined, `${prefix}-${sideName}-toe-${toe + 2}`).rotation.y = toe * -0.18;
        } else {
          for (let toe = -1; toe <= 1; toe += 1) add(leg, [0.04, 0.03, 0.2], darkMaterial, [toe * 0.055, feathered ? -0.2 : -0.24, -0.1], undefined, `${prefix}-${sideName}-toe-${toe + 2}`).rotation.y = toe * -0.2;
        }
      }
    };

    if (birdKind === "emberjay") {
      add(visual, [0.5, 0.5, 0.76], charcoalMaterial, [0, 0.06, 0.05], "body", `${prefix}-tapered-body`);
      add(visual, [0.4, 0.36, 0.4], emberMaterial, [0, -0.02, -0.31], undefined, `${prefix}-ember-breast`);
      add(visual, [0.38, 0.12, 0.52], bodyMaterial, [0, 0.33, 0.06], undefined, `${prefix}-back-mantle`);
      add(visual, [0.42, 0.4, 0.44], bodyMaterial, [0, 0.37, -0.43], "head", `${prefix}-crested-head`);
      add(visual, [0.44, 0.16, 0.26], blackMaterial, [0, 0.4, -0.66], undefined, `${prefix}-black-eye-mask`);
      add(visual, [0.18, 0.13, 0.32], billMaterial, [0, 0.29, -0.8], undefined, `${prefix}-wedge-beak`).rotation.x = -0.06;
      eyePair(0.13, 0.43, -0.81, 0.062, prefix);
      for (const [index, crest] of [
        [-0.13, 0.56, -0.36, -0.35], [0, 0.62, -0.33, -0.18], [0.13, 0.57, -0.34, 0.04],
      ].entries()) {
        const plume = add(visual, [0.09, 0.34 - index * 0.03, 0.1], index === 1 ? emberMaterial : bodyMaterial, [crest[0], crest[1], crest[2]], undefined, `${prefix}-swept-crest-${index + 1}`);
        plume.rotation.x = crest[3];
        plume.rotation.z = (index - 1) * 0.12;
      }
      for (const side of [-1, 1] as const) {
        const sideName = side < 0 ? "left" : "right";
        const node = wing(side, [0.62, 0.075, 0.7], blackMaterial, [side * 0.18, 0.17, 0.02], 0.24);
        add(node, [0.44, 0.045, 0.56], bodyMaterial, [side * 0.25, 0.04, 0.03], undefined, `${prefix}-${sideName}-rust-covert`);
        for (let feather = 0; feather < 3; feather += 1) add(node, [0.18, 0.04, 0.58 - feather * 0.08], feather === 1 ? emberMaterial : charcoalMaterial, [side * (0.42 + feather * 0.14), -0.01, 0.08 + feather * 0.1], undefined, `${prefix}-${sideName}-primary-${feather + 1}`).rotation.y = side * (-0.08 - feather * 0.08);
      }
      for (let feather = -2; feather <= 2; feather += 1) {
        const tail = add(visual, [0.13, 0.07, 0.78 - Math.abs(feather) * 0.08], feather === 0 ? emberMaterial : blackMaterial, [feather * 0.1, 0.02, 0.63], undefined, `${prefix}-long-tail-${feather + 3}`);
        tail.rotation.y = feather * -0.09;
      }
      legs();
      return;
    }

    if (birdKind === "canopy-lark") {
      add(visual, [0.52, 0.46, 0.7], bodyMaterial, [0, 0.04, 0.05], "body", `${prefix}-rounded-body`);
      add(visual, [0.4, 0.36, 0.4], paleLeafMaterial, [0, -0.01, -0.29], undefined, `${prefix}-golden-breast`);
      add(visual, [0.38, 0.36, 0.4], accentMaterial, [0, 0.32, -0.42], "head", `${prefix}-songbird-head`);
      add(visual, [0.34, 0.12, 0.24], creamMaterial, [0, 0.23, -0.62], undefined, `${prefix}-pale-throat`);
      add(visual, [0.14, 0.1, 0.25], billMaterial, [0, 0.26, -0.75], undefined, `${prefix}-seed-beak`).rotation.x = 0.03;
      eyePair(0.115, 0.38, -0.71, 0.058, prefix);
      for (const side of [-1, 1] as const) {
        const sideName = side < 0 ? "left" : "right";
        add(visual, [0.18, 0.08, 0.18], leafMaterial, [side * 0.16, 0.52, -0.42], undefined, `${prefix}-${sideName}-crown-tuft`).rotation.z = side * -0.16;
        const node = wing(side, [0.58, 0.07, 0.66], leafMaterial, [side * 0.18, 0.16, 0.04], 0.22);
        for (let feather = 0; feather < 4; feather += 1) {
          const leaf = add(node, [0.2, 0.045, 0.48 - feather * 0.045], feather % 2 ? accentMaterial : paleLeafMaterial, [side * (0.18 + feather * 0.14), 0.03, 0.03 + feather * 0.12], undefined, `${prefix}-${sideName}-leaf-feather-${feather + 1}`);
          leaf.rotation.y = side * (-0.08 - feather * 0.07);
        }
      }
      for (const side of [-1, 1] as const) {
        const tail = add(visual, [0.17, 0.065, 0.72], side < 0 ? bodyMaterial : accentMaterial, [side * 0.11, 0.01, 0.61], undefined, `${prefix}-${side < 0 ? "left" : "right"}-forked-tail`);
        tail.rotation.y = side * -0.16;
      }
      add(visual, [0.12, 0.06, 0.5], paleLeafMaterial, [0, 0.03, 0.52], undefined, `${prefix}-tail-center`);
      legs();
      return;
    }

    if (birdKind === "tidewing-gull") {
      add(visual, [0.58, 0.48, 0.88], whiteMaterial, [0, 0.05, 0.08], "body", `${prefix}-keel-body`);
      add(visual, [0.46, 0.3, 0.5], whiteMaterial, [0, -0.04, -0.36], undefined, `${prefix}-white-breast`);
      add(visual, [0.5, 0.14, 0.64], tideMaterial, [0, 0.32, 0.02], undefined, `${prefix}-blue-mantle`);
      add(visual, [0.44, 0.4, 0.46], whiteMaterial, [0, 0.35, -0.5], "head", `${prefix}-gull-head`);
      add(visual, [0.44, 0.14, 0.3], deepTideMaterial, [0, 0.51, -0.48], undefined, `${prefix}-tide-cap`);
      add(visual, [0.2, 0.15, 0.42], billMaterial, [0, 0.25, -0.88], undefined, `${prefix}-hooked-beak`).rotation.x = -0.08;
      add(visual, [0.12, 0.09, 0.13], material(0xd9673f), [0, 0.18, -1.08], undefined, `${prefix}-beak-tip`);
      eyePair(0.135, 0.4, -0.79, 0.062, prefix);
      for (const side of [-1, 1] as const) {
        const sideName = side < 0 ? "left" : "right";
        const node = wing(side, [0.94, 0.075, 0.76], tideMaterial, [side * 0.2, 0.18, 0.03], 0.16);
        add(node, [0.64, 0.045, 0.6], whiteMaterial, [side * 0.34, 0.035, 0.02], undefined, `${prefix}-${sideName}-pale-coverts`);
        for (let feather = 0; feather < 4; feather += 1) {
          const primary = add(node, [0.25, 0.045, 0.68 - feather * 0.07], feather < 2 ? deepTideMaterial : charcoalMaterial, [side * (0.54 + feather * 0.18), -0.01, 0.08 + feather * 0.09], undefined, `${prefix}-${sideName}-swept-primary-${feather + 1}`);
          primary.rotation.y = side * (-0.12 - feather * 0.08);
        }
      }
      for (let feather = -2; feather <= 2; feather += 1) {
        const tail = add(visual, [0.17, 0.055, 0.6 - Math.abs(feather) * 0.04], feather === 0 ? tideMaterial : whiteMaterial, [feather * 0.1, 0.05, 0.68], undefined, `${prefix}-tail-fan-${feather + 3}`);
        tail.rotation.y = feather * -0.12;
      }
      legs(true);
      return;
    }

    add(visual, [0.58, 0.58, 0.7], snowMaterial, [0, 0.05, 0.06], "body", `${prefix}-plump-body`);
    add(visual, [0.48, 0.4, 0.42], whiteMaterial, [0, -0.01, -0.3], undefined, `${prefix}-downy-breast`);
    add(visual, [0.4, 0.4, 0.4], snowMaterial, [0, 0.38, -0.42], "head", `${prefix}-round-head`);
    add(visual, [0.42, 0.11, 0.25], iceMaterial, [0, 0.48, -0.43], undefined, `${prefix}-ice-brow`);
    add(visual, [0.13, 0.11, 0.22], billMaterial, [0, 0.3, -0.72], undefined, `${prefix}-short-beak`);
    eyePair(0.12, 0.41, -0.7, 0.06, prefix);
    for (const side of [-1, 1] as const) {
      const sideName = side < 0 ? "left" : "right";
      add(visual, [0.18, 0.07, 0.06], blackMaterial, [side * 0.16, 0.4, -0.64], undefined, `${prefix}-${sideName}-winter-mask`);
      const node = wing(side, [0.52, 0.09, 0.58], iceMaterial, [side * 0.2, 0.17, 0.06], 0.3);
      for (let feather = 0; feather < 3; feather += 1) add(node, [0.2, 0.05, 0.42 - feather * 0.05], feather === 1 ? whiteMaterial : snowMaterial, [side * (0.17 + feather * 0.14), 0.04, 0.04 + feather * 0.12], undefined, `${prefix}-${sideName}-snow-feather-${feather + 1}`).rotation.y = side * (-0.05 - feather * 0.09);
    }
    for (let feather = -2; feather <= 2; feather += 1) {
      const tail = add(visual, [0.16, 0.07, 0.48 - Math.abs(feather) * 0.04], feather % 2 ? iceMaterial : whiteMaterial, [feather * 0.09, 0.05, 0.56], undefined, `${prefix}-snow-fan-${feather + 3}`);
      tail.rotation.y = feather * -0.14;
    }
    legs(false, true);
  };

  const companionLegs = (
    prefix: string,
    x: number,
    frontZ: number,
    rearZ: number,
    hipY: number,
    targetFootY: number,
    upperMaterial: THREE.Material,
    lowerMaterial: THREE.Material,
    pawMaterial: THREE.Material,
    pawSize: [number, number, number],
    bootMaterial?: THREE.Material,
  ) => {
    for (const [px, pz, phase, positionName] of [
      [-x, frontZ, 0, "front-left"], [x, frontZ, Math.PI, "front-right"],
      [-x, rearZ, Math.PI, "rear-left"], [x, rearZ, 0, "rear-right"],
    ] as Array<[number, number, number, string]>) {
      const leg = pivotBox([0.17, 0.28, 0.18], upperMaterial, [px, hipY, pz], [0, -0.14, 0], "legs", `${prefix}-${positionName}-leg`);
      leg.userData.phase = phase;
      add(leg, [0.13, 0.3, 0.14], lowerMaterial, [0, targetFootY - hipY + 0.15, -0.02], undefined, `${prefix}-${positionName}-lower-leg`);
      add(leg, pawSize, pawMaterial, [0, targetFootY - hipY + pawSize[1] / 2, -0.09], undefined, `${prefix}-${positionName}-paw`);
      if (bootMaterial) add(leg, [pawSize[0] + 0.05, 0.13, pawSize[2] + 0.04], bootMaterial, [0, targetFootY - hipY + 0.15, -0.055], undefined, `${prefix}-${positionName}-snow-boot`);
    }
  };

  const childPivot = (parent: THREE.Object3D, name: string, position: [number, number, number]) => {
    const node = new THREE.Group();
    node.name = name;
    node.position.set(...position);
    node.userData.mobId = id;
    parent.add(node);
    return node;
  };

  /**
   * Dwarven pursuit automaton: low, fast and recognisably canine without
   * borrowing the soft companion rig. Every visible linkage is parented to an
   * articulated joint so the same production hierarchy reads in-world and in
   * the Bestiary renderer.
   */
  const buildClockworkHoundGolem = () => {
    const prefix = "clockwork-hound-golem";
    const forgedIron = material(0x303c42);
    const blackIron = material(0x182126);
    const brass = material(0xb78343);
    const brightBrass = material(0xe0b866);
    const copper = material(0x9b5738);
    const piston = material(0xaeb9b7);
    const leather = material(0x4c3025);
    const aether = material(0x6ff4df, true, 0.98);
    const furnace = material(0xff9f4e, true, 0.96);
    visual.userData.wildlifeRig = prefix;
    visual.userData.hurtResponse = "forged-shell-pulse";

    // Tapered boiler body, plated like a dwarven locomotive rather than a box.
    add(visual, [0.78, 0.54, 1.38], forgedIron, [0, 0.34, 0.08], "body", `${prefix}-boiler-body`);
    add(visual, [0.9, 0.48, 0.52], brass, [0, 0.38, -0.43], undefined, `${prefix}-shoulder-yoke`);
    add(visual, [0.72, 0.46, 0.52], blackIron, [0, 0.35, 0.56], undefined, `${prefix}-haunch-housing`);
    add(visual, [0.5, 0.18, 1.48], copper, [0, 0.64, 0.1], undefined, `${prefix}-spine-boiler-cap`);
    for (let rib = 0; rib < 5; rib += 1) {
      const z = -0.37 + rib * 0.23;
      const taper = 0.86 - Math.abs(rib - 2) * 0.045;
      add(visual, [taper, 0.09, 0.12], rib % 2 ? brightBrass : brass, [0, 0.59, z], undefined, `${prefix}-boiler-rib-${rib + 1}`);
    }
    for (const side of [-1, 1] as const) {
      const sideName = side < 0 ? "left" : "right";
      // Crossed teeth imply a gear while retaining the game's authored box language.
      const gear = childPivot(visual, `${prefix}-${sideName}-shoulder-gear-pivot`, [side * 0.49, 0.42, -0.38]);
      gear.userData.side = side;
      add(gear, [0.08, 0.45, 0.45], brass, [0, 0, 0], undefined, `${prefix}-${sideName}-shoulder-gear-disc`);
      for (let tooth = 0; tooth < 4; tooth += 1) {
        const spoke = add(gear, [0.1, 0.54, 0.12], tooth % 2 ? copper : brightBrass, [0, 0, 0], undefined, `${prefix}-${sideName}-shoulder-gear-tooth-${tooth + 1}`);
        spoke.rotation.x = tooth * Math.PI / 4;
      }
      add(gear, [0.12, 0.16, 0.16], aether, [side * 0.02, 0, 0], undefined, `${prefix}-${sideName}-shoulder-bearing`);
      add(visual, [0.08, 0.3, 0.08], copper, [side * 0.3, 0.83, 0.38], undefined, `${prefix}-${sideName}-exhaust-stack`);
      add(visual, [0.16, 0.09, 0.16], blackIron, [side * 0.3, 0.99, 0.38], undefined, `${prefix}-${sideName}-exhaust-cap`);
    }
    add(visual, [0.34, 0.34, 0.1], aether, [0, 0.39, -0.715], undefined, `${prefix}-chest-aether-core`).rotation.z = Math.PI / 4;
    // Four separated rails protect the lens without hiding it from the player.
    add(visual, [0.5, 0.065, 0.07], blackIron, [0, 0.61, -0.79], undefined, `${prefix}-core-guard-top`);
    add(visual, [0.5, 0.065, 0.07], blackIron, [0, 0.17, -0.79], undefined, `${prefix}-core-guard-bottom`);
    add(visual, [0.065, 0.5, 0.07], blackIron, [-0.24, 0.39, -0.79], undefined, `${prefix}-core-guard-left`);
    add(visual, [0.065, 0.5, 0.07], blackIron, [0.24, 0.39, -0.79], undefined, `${prefix}-core-guard-right`);
    for (const side of [-1, 1] as const) for (const y of [-1, 1] as const) {
      add(visual, [0.07, 0.07, 0.08], brightBrass, [side * 0.22, 0.39 + y * 0.2, -0.82], undefined, `${prefix}-core-rivet-${side}-${y}`);
    }

    const head = pivotBox([0.66, 0.5, 0.68], forgedIron, [0, 0.65, -0.83], [0, 0, 0], "head", `${prefix}-head`);
    head.userData.baseZ = head.position.z;
    add(head, [0.58, 0.18, 0.58], brass, [0, 0.22, -0.04], undefined, `${prefix}-brow-armor`);
    add(head, [0.48, 0.28, 0.52], copper, [0, -0.08, -0.49], undefined, `${prefix}-upper-muzzle`);
    add(head, [0.26, 0.13, 0.18], blackIron, [0, -0.03, -0.8], undefined, `${prefix}-intake-nose`);
    add(head, [0.12, 0.08, 0.08], aether, [0, -0.02, -0.9], undefined, `${prefix}-scent-lamp`);
    for (const side of [-1, 1] as const) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.13, 0.18, 0.07], blackIron, [side * 0.22, 0.08, -0.36], undefined, `${prefix}-${sideName}-eye-cowl`);
      add(head, [0.075, 0.085, 0.055], furnace, [side * 0.22, 0.08, -0.405], undefined, `${prefix}-${sideName}-furnace-eye`);
      const ear = childPivot(head, `${prefix}-${sideName}-ear-pivot`, [side * 0.25, 0.24, -0.02]);
      ear.userData.side = side;
      ear.userData.restZ = side * -0.24;
      ear.userData.restX = 0.24;
      ear.rotation.z = Number(ear.userData.restZ);
      ear.rotation.x = Number(ear.userData.restX);
      add(ear, [0.15, 0.28, 0.13], brass, [side * 0.03, 0.1, 0], undefined, `${prefix}-${sideName}-tuning-fork-ear-stem`);
      add(ear, [0.065, 0.18, 0.095], brightBrass, [side * -0.07, 0.25, 0], undefined, `${prefix}-${sideName}-tuning-fork-inner-prong`);
      add(ear, [0.065, 0.23, 0.095], brightBrass, [side * 0.07, 0.275, 0], undefined, `${prefix}-${sideName}-tuning-fork-outer-prong`);
      add(ear, [0.095, 0.095, 0.095], aether, [side * 0.07, 0.41, 0], undefined, `${prefix}-${sideName}-ear-signal-lamp`);
    }
    const jaw = childPivot(head, `${prefix}-jaw-attack-pivot`, [0, -0.2, -0.2]);
    jaw.userData.attackPart = true;
    parts.arms.push(jaw);
    add(jaw, [0.45, 0.13, 0.58], blackIron, [0, -0.05, -0.31], undefined, `${prefix}-lower-jaw`);
    add(jaw, [0.35, 0.06, 0.42], brass, [0, 0.04, -0.34], undefined, `${prefix}-jaw-plate`);
    for (const side of [-1, 1] as const) for (let tooth = 0; tooth < 3; tooth += 1) {
      add(jaw, [0.055, 0.13, 0.06], piston, [side * (0.06 + tooth * 0.07), 0.06, -0.42 + tooth * 0.13], undefined, `${prefix}-${side < 0 ? "left" : "right"}-jaw-tooth-${tooth + 1}`);
    }

    for (const [px, pz, phase, positionName] of [
      [-0.34, -0.43, 0, "front-left"], [0.34, -0.43, Math.PI, "front-right"],
      [-0.33, 0.5, Math.PI, "rear-left"], [0.33, 0.5, 0, "rear-right"],
    ] as Array<[number, number, number, string]>) {
      const rear = positionName.startsWith("rear");
      const leg = pivotBox([0.22, rear ? 0.38 : 0.42, 0.23], forgedIron, [px, 0.34, pz], [0, rear ? -0.15 : -0.18, rear ? 0.06 : -0.02], "legs", `${prefix}-${positionName}-upper-leg`);
      leg.userData.phase = phase;
      leg.userData.legName = positionName;
      add(leg, [0.27, 0.2, 0.28], brass, [0, -0.04, 0], undefined, `${prefix}-${positionName}-hip-cap`);
      const knee = childPivot(leg, `${prefix}-${positionName}-knee-pivot`, [0, rear ? -0.32 : -0.39, rear ? 0.1 : -0.03]);
      knee.userData.phase = phase;
      knee.userData.restX = rear ? -0.28 : 0.08;
      knee.rotation.x = Number(knee.userData.restX);
      add(knee, [0.12, 0.33, 0.13], piston, [0, -0.15, rear ? -0.05 : 0.03], undefined, `${prefix}-${positionName}-piston-shin`);
      add(knee, [0.19, 0.18, 0.2], copper, [0, -0.29, rear ? -0.09 : 0.02], undefined, `${prefix}-${positionName}-ankle-coupler`);
      const paw = childPivot(knee, `${prefix}-${positionName}-paw-pivot`, [0, -0.37, rear ? -0.13 : -0.01]);
      paw.userData.phase = phase;
      add(paw, [0.3, 0.13, 0.42], blackIron, [0, 0, -0.08], undefined, `${prefix}-${positionName}-traction-paw`);
      for (let toe = -1; toe <= 1; toe += 1) add(paw, [0.07, 0.07, 0.21], brightBrass, [toe * 0.09, -0.02, -0.27], undefined, `${prefix}-${positionName}-toe-${toe + 2}`).rotation.x = -0.08;
    }

    const tailRoot = pivotBox([0.16, 0.16, 0.54], blackIron, [0, 0.5, 0.75], [0, 0, 0.24], "body", `${prefix}-tail-root`);
    tailRoot.rotation.x = 0.38;
    const tailSecondary = childPivot(tailRoot, `${prefix}-tail-secondary-pivot`, [0, 0.04, 0.49]);
    add(tailSecondary, [0.14, 0.14, 0.42], copper, [0, 0.03, 0.19], undefined, `${prefix}-tail-chain`);
    const tailTip = childPivot(tailSecondary, `${prefix}-tail-tip-pivot`, [0, 0.06, 0.38]);
    add(tailTip, [0.28, 0.28, 0.25], brass, [0, 0, 0.08], undefined, `${prefix}-tail-counterweight`);
    add(tailTip, [0.13, 0.13, 0.16], aether, [0, 0, 0.24], undefined, `${prefix}-tail-signal-lamp`);
    add(visual, [0.54, 0.08, 0.42], leather, [0, 0.78, 0.2], undefined, `${prefix}-service-harness`);
    visual.userData.authoredScale = 0.68;
    visual.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(visual);
    visual.position.y += 0.5 - MOB_DEFS[prefix].footOffset - bounds.min.y;
  };

  /**
   * Dwarven loom automaton: a broad eight-legged silhouette whose articulated
   * stance remains readable from side and three-quarter gameplay cameras.
   */
  const buildWebspinnerGolem = () => {
    const prefix = "webspinner-golem";
    const forgedIron = material(0x303b42);
    const blackIron = material(0x141d22);
    const brass = material(0xb98645);
    const brightBrass = material(0xe1ba69);
    const copper = material(0x97563b);
    const piston = material(0xb8c0ba);
    const aether = material(0x72f3df, true, 0.98);
    const furnace = material(0xff9b4b, true, 0.95);
    visual.userData.wildlifeRig = prefix;
    visual.userData.hurtResponse = "forged-shell-pulse";

    // Layered cephalothorax and faceted spool abdomen.
    add(visual, [0.78, 0.38, 0.78], forgedIron, [0, 0.2, -0.26], "body", `${prefix}-cephalothorax`);
    add(visual, [0.92, 0.18, 0.62], brass, [0, 0.42, -0.24], undefined, `${prefix}-shoulder-carapace`);
    add(visual, [0.86, 0.5, 0.86], blackIron, [0, 0.27, 0.5], "body", `${prefix}-spool-abdomen`);
    add(visual, [0.7, 0.56, 0.64], copper, [0, 0.35, 0.59], undefined, `${prefix}-rear-carapace`);
    for (let band = 0; band < 4; band += 1) {
      const z = 0.23 + band * 0.2;
      add(visual, [0.78 - band * 0.04, 0.09, 0.13], band % 2 ? brightBrass : brass, [0, 0.58 - Math.abs(band - 1.5) * 0.025, z], undefined, `${prefix}-abdomen-band-${band + 1}`);
    }
    const driveRing = childPivot(visual, `${prefix}-drive-ring-pivot`, [0, 0.62, 0.18]);
    for (let spoke = 0; spoke < 4; spoke += 1) {
      const bar = add(driveRing, [0.12, 0.08, 0.72], spoke % 2 ? brightBrass : brass, [0, 0, 0], undefined, `${prefix}-drive-ring-spoke-${spoke + 1}`);
      bar.rotation.y = spoke * Math.PI / 4;
    }
    add(driveRing, [0.28, 0.11, 0.28], aether, [0, 0.02, 0], undefined, `${prefix}-loom-aether-core`).rotation.y = Math.PI / 4;
    for (const side of [-1, 1] as const) {
      add(visual, [0.1, 0.36, 0.1], copper, [side * 0.3, 0.69, 0.55], undefined, `${prefix}-${side < 0 ? "left" : "right"}-steam-stack`);
      add(visual, [0.19, 0.08, 0.19], blackIron, [side * 0.3, 0.89, 0.55], undefined, `${prefix}-${side < 0 ? "left" : "right"}-steam-cap`);
    }

    const head = childPivot(visual, `${prefix}-head-pivot`, [0, 0.3, -0.6]);
    head.userData.baseZ = head.position.z;
    parts.head.push(head);
    add(head, [0.66, 0.34, 0.46], brass, [0, 0, -0.08], undefined, `${prefix}-face-housing`);
    add(head, [0.5, 0.18, 0.34], blackIron, [0, 0.16, -0.12], undefined, `${prefix}-brow-visor`);
    add(head, [0.32, 0.13, 0.24], copper, [0, -0.17, -0.2], undefined, `${prefix}-mouth-loom`);
    for (const [row, y, span] of [[0, 0.08, 0.2], [1, -0.02, 0.27]] as Array<[number, number, number]>) {
      const count = row === 0 ? 2 : 4;
      for (let eye = 0; eye < count; eye += 1) {
        const x = count === 2 ? (eye ? 1 : -1) * span : -span + eye * (span * 2 / 3);
        add(head, [0.075, 0.075, 0.055], row === 0 ? aether : furnace, [x, y, -0.335], undefined, `${prefix}-eye-${row + 1}-${eye + 1}`);
      }
    }
    for (const side of [-1, 1] as const) {
      const fang = childPivot(head, `${prefix}-${side < 0 ? "left" : "right"}-fang-attack-pivot`, [side * 0.18, -0.14, -0.24]);
      fang.userData.attackPart = true;
      fang.userData.side = side;
      parts.arms.push(fang);
      add(fang, [0.12, 0.18, 0.38], blackIron, [side * 0.03, -0.08, -0.16], undefined, `${prefix}-${side < 0 ? "left" : "right"}-fang-root`).rotation.y = side * -0.12;
      add(fang, [0.08, 0.12, 0.28], brightBrass, [side * 0.04, -0.2, -0.42], undefined, `${prefix}-${side < 0 ? "left" : "right"}-fang-tip`).rotation.x = -0.18;
    }

    const legRows = [-0.49, -0.18, 0.18, 0.5] as const;
    for (const side of [-1, 1] as const) for (let row = 0; row < legRows.length; row += 1) {
      const sideName = side < 0 ? "left" : "right";
      const phase = (row % 2 ? Math.PI : 0) + (side > 0 ? Math.PI : 0);
      const root = childPivot(visual, `${prefix}-${sideName}-leg-${row + 1}-pivot`, [side * 0.35, 0.25, legRows[row]]);
      root.userData.phase = phase;
      root.userData.side = side;
      root.userData.legRow = row;
      parts.legs.push(root);
      add(root, [0.18, 0.2, 0.2], brass, [side * 0.02, 0, 0], undefined, `${prefix}-${sideName}-leg-${row + 1}-hip-bearing`);
      const upper = add(root, [0.62, 0.13, 0.15], forgedIron, [side * 0.29, -0.08, 0], undefined, `${prefix}-${sideName}-leg-${row + 1}-femur`);
      upper.rotation.z = side * -0.22;
      upper.rotation.y = side * (-0.2 + row * 0.13);
      add(root, [0.42, 0.055, 0.08], piston, [side * 0.28, 0.015, 0], undefined, `${prefix}-${sideName}-leg-${row + 1}-upper-piston`).rotation.y = upper.rotation.y;
      const knee = childPivot(root, `${prefix}-${sideName}-leg-${row + 1}-knee-pivot`, [side * 0.56, -0.19, 0]);
      knee.userData.webspinnerKnee = true;
      knee.userData.phase = phase;
      knee.userData.side = side;
      knee.userData.restX = (row - 1.5) * 0.055;
      knee.rotation.x = Number(knee.userData.restX);
      add(knee, [0.23, 0.2, 0.22], copper, [0, 0, 0], undefined, `${prefix}-${sideName}-leg-${row + 1}-knee-gear`);
      const lower = add(knee, [0.15, 0.5, 0.15], blackIron, [side * 0.08, -0.25, 0], undefined, `${prefix}-${sideName}-leg-${row + 1}-tibia`);
      lower.rotation.z = side * -0.2;
      add(knee, [0.075, 0.34, 0.075], piston, [side * -0.035, -0.24, 0], undefined, `${prefix}-${sideName}-leg-${row + 1}-lower-piston`).rotation.z = side * 0.12;
      const foot = childPivot(knee, `${prefix}-${sideName}-leg-${row + 1}-foot-pivot`, [side * 0.15, -0.49, 0]);
      foot.userData.webspinnerFoot = true;
      foot.userData.phase = phase;
      foot.userData.side = side;
      add(foot, [0.37, 0.1, 0.22], forgedIron, [side * 0.1, 0, -0.04], undefined, `${prefix}-${sideName}-leg-${row + 1}-foot`);
      add(foot, [0.22, 0.065, 0.31], brightBrass, [side * 0.2, -0.01, -0.1], undefined, `${prefix}-${sideName}-leg-${row + 1}-hooked-toe`).rotation.y = side * (0.08 - row * 0.035);
    }

    const spinneret = childPivot(visual, `${prefix}-spinneret-pivot`, [0, 0.23, 0.92]);
    add(spinneret, [0.5, 0.26, 0.34], blackIron, [0, 0, 0.06], undefined, `${prefix}-spinneret-housing`);
    for (const side of [-1, 0, 1] as const) {
      add(spinneret, [0.11, 0.11, 0.28], side === 0 ? aether : brass, [side * 0.15, -0.04, 0.29], undefined, `${prefix}-spinneret-nozzle-${side + 2}`);
    }
    for (const side of [-1, 1] as const) add(visual, [0.07, 0.07, 0.7], brightBrass, [side * 0.44, 0.44, 0.22], undefined, `${prefix}-${side < 0 ? "left" : "right"}-tension-cable`).rotation.x = side * 0.12;
    visual.userData.authoredScale = 0.78;
    visual.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(visual);
    visual.position.y += 0.5 - MOB_DEFS[prefix].footOffset - bounds.min.y;
  };

  const buildHound = (houndKind: "taffy-hound" | "rimecoat-hound") => {
    const prefix = houndKind;
    const rime = houndKind === "rimecoat-hound";
    const coatLight = material(rime ? 0xe9f2ee : 0xf2c76e);
    const coatShade = material(rime ? 0x8fa9b2 : 0xb64f86);
    const muzzleMaterial = material(rime ? 0xdce6e2 : 0xf4d49a);
    const noseMaterial = material(rime ? 0x26384a : 0x30213c);
    const innerEarMaterial = material(rime ? 0x9bb6c0 : 0xffb7ce);
    const pawMaterial = material(rime ? 0x34485a : 0x65304f);
    const snowWhite = material(0xf7fbfa);
    const targetFootY = 0.5 - MOB_DEFS[houndKind].footOffset;
    visual.userData.companionPose = "hound";

    add(visual, [0.72, 0.48, 1.08], bodyMaterial, [0, 0.05, 0.12], "body", `${prefix}-tapered-body`);
    add(visual, [0.78, 0.56, 0.46], accentMaterial, [0, 0.14, -0.35], undefined, `${prefix}-deep-chest`);
    add(visual, [0.66, 0.46, 0.46], bodyMaterial, [0, 0.11, 0.48], undefined, `${prefix}-haunches`);
    add(visual, [0.74, 0.58, 0.34], coatLight, [0, 0.32, -0.48], undefined, `${prefix}-${rime ? "winter" : "pulled-taffy"}-ruff`);
    if (rime) {
      for (const side of [-1, 1]) add(visual, [0.12, 0.36, 0.52], coatShade, [side * 0.33, 0.13, 0.02], undefined, `${prefix}-${side < 0 ? "left" : "right"}-shoulder-guard`).rotation.z = side * -0.08;
      add(visual, [0.56, 0.08, 0.7], coatLight, [0, 0.32, 0.16], undefined, `${prefix}-snow-saddle-mark`);
    } else {
      for (let fold = 0; fold < 4; fold += 1) add(visual, [0.76, 0.055, 0.18], fold % 2 ? coatShade : coatLight, [0, 0.27 - fold * 0.11, -0.16 + fold * 0.26], undefined, `${prefix}-taffy-fold-${fold + 1}`).rotation.y = (fold % 2 ? 1 : -1) * 0.08;
    }

    const head = pivotBox([0.62, 0.54, 0.56], accentMaterial, [0, 0.4, -0.68], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.46, 0.27, 0.42], muzzleMaterial, [0, -0.12, -0.43], undefined, `${prefix}-layered-muzzle`);
    add(head, [0.38, 0.12, 0.34], muzzleMaterial, [0, -0.28, -0.39], undefined, `${prefix}-lower-jaw`);
    add(head, [0.11, 0.08, 0.07], noseMaterial, [0, -0.07, -0.67], undefined, `${prefix}-nose`);
    add(head, [0.16, 0.055, 0.18], material(0xe7869e), [0, -0.34, -0.5], undefined, `${prefix}-tongue`);
    for (const side of [-1, 1] as const) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.085, 0.085, 0.04], eyeMaterial, [side * 0.19, 0.1, -0.3], undefined, `${prefix}-${sideName}-eye`);
      add(head, [0.17, 0.075, 0.08], noseMaterial, [side * 0.18, 0.2, -0.28], undefined, `${prefix}-${sideName}-brow`).rotation.z = side * -0.12;
      const ear = childPivot(head, `${prefix}-${sideName}-ear-root-pivot`, [side * 0.24, 0.26, -0.02]);
      ear.userData.side = side;
      ear.userData.restZ = side * (rime ? -0.18 : -0.4);
      ear.rotation.z = Number(ear.userData.restZ);
      add(ear, [rime ? 0.2 : 0.25, rime ? 0.5 : 0.42, 0.2], rime ? coatShade : bodyMaterial, [side * 0.04, 0.2, 0], undefined, `${prefix}-${sideName}-${rime ? "upright" : "folded-candy"}-ear`).rotation.x = rime ? -0.08 : 0.16;
      add(ear, [0.1, rime ? 0.3 : 0.25, 0.08], innerEarMaterial, [side * 0.04, 0.2, -0.11], undefined, `${prefix}-${sideName}-inner-ear`);
    }

    companionLegs(prefix, rime ? 0.27 : 0.25, -0.29, 0.38, 0.08, targetFootY, bodyMaterial, coatShade, pawMaterial, [0.23, 0.13, 0.31], rime ? coatLight : undefined);

    const tailRoot = pivotBox([0.17, 0.17, 0.58], rime ? coatShade : noseMaterial, [0, 0.24, 0.62], [0, 0.05, 0.27], "body", `${prefix}-tail-root`);
    tailRoot.rotation.x = rime ? 0.35 : 0.52;
    const tailMid = childPivot(tailRoot, `${prefix}-tail-mid-pivot`, [0, 0.08, 0.53]);
    if (rime) {
      add(tailMid, [0.34, 0.34, 0.58], coatLight, [0, 0.12, 0.23], undefined, `${prefix}-plume-tail-mid`).rotation.x = 0.28;
      add(tailMid, [0.28, 0.38, 0.3], snowWhite, [0, 0.38, 0.46], undefined, `${prefix}-plume-tail-tip`).rotation.x = 0.5;
    } else {
      add(tailMid, [0.18, 0.46, 0.18], noseMaterial, [0, 0.22, 0.1], undefined, `${prefix}-licorice-tail-curl`).rotation.z = 0.48;
      add(tailMid, [0.2, 0.2, 0.36], coatLight, [0.02, 0.47, 0.12], undefined, `${prefix}-taffy-tail-tip`).rotation.x = 0.32;
    }

    if (!rime) {
      const collar = new THREE.Group();
      collar.name = "taffy-hound-faction-collar";
      collar.visible = false;
      visual.add(collar);
      add(collar, [0.73, 0.13, 0.42], material(0xf5d667), [0, 0.35, -0.47], undefined, "taffy-hound-sugarcourt-collar-band");
      add(collar, [0.18, 0.22, 0.08], material(0x84ddbc, true), [0, 0.18, -0.69], undefined, "taffy-hound-sugarcourt-collar-tag");
    }
  };

  const buildCat = (catKind: "praline-cat" | "bramblewhisk-cat") => {
    const prefix = catKind;
    const bramble = catKind === "bramblewhisk-cat";
    const chestMaterial = material(bramble ? 0x9eac75 : 0xe0a15e);
    const muzzleMaterial = material(bramble ? 0xc8aa73 : 0xeab77c);
    const stripeMaterial = material(bramble ? 0x344a35 : 0x6a3d32);
    const noseMaterial = material(bramble ? 0x3c4a38 : 0x5a302a);
    const innerEarMaterial = material(bramble ? 0xb58b72 : 0xd38b76);
    const targetFootY = 0.5 - MOB_DEFS[catKind].footOffset;
    visual.userData.companionPose = "cat";

    add(visual, [0.56, 0.38, 1.0], bodyMaterial, [0, -0.01, 0.12], "body", `${prefix}-lithe-body`);
    add(visual, [0.5, 0.48, 0.42], chestMaterial, [0, 0.08, -0.33], undefined, `${prefix}-tapered-chest`);
    add(visual, [0.6, 0.46, 0.44], bodyMaterial, [0, 0.08, 0.45], undefined, `${prefix}-rounded-haunches`);
    if (bramble) {
      add(visual, [0.62, 0.11, 0.68], chestMaterial, [0, 0.23, 0.08], undefined, `${prefix}-leaf-saddle`);
      for (let stripe = 0; stripe < 4; stripe += 1) add(visual, [0.08, 0.28, 0.16], stripeMaterial, [(stripe % 2 ? 1 : -1) * 0.27, 0.08, -0.18 + stripe * 0.23], undefined, `${prefix}-bramble-stripe-${stripe + 1}`).rotation.z = (stripe % 2 ? 1 : -1) * 0.16;
    } else {
      for (let swirl = 0; swirl < 3; swirl += 1) add(visual, [0.12, 0.08, 0.3], stripeMaterial, [-0.18 + swirl * 0.18, 0.22, -0.04 + swirl * 0.25], undefined, `${prefix}-cocoa-swirl-${swirl + 1}`).rotation.y = -0.28 + swirl * 0.22;
    }

    const head = pivotBox([0.5, 0.46, 0.5], accentMaterial, [0, 0.3, -0.58], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.2, 0.18, 0.25], muzzleMaterial, [-0.11, -0.1, -0.35], undefined, `${prefix}-left-muzzle-pad`);
    add(head, [0.2, 0.18, 0.25], muzzleMaterial, [0.11, -0.1, -0.35], undefined, `${prefix}-right-muzzle-pad`);
    add(head, [0.26, 0.1, 0.22], muzzleMaterial, [0, -0.22, -0.32], undefined, `${prefix}-chin`);
    add(head, [0.07, 0.06, 0.045], noseMaterial, [0, -0.04, -0.52], undefined, `${prefix}-nose`);
    for (const side of [-1, 1] as const) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.075, 0.075, 0.04], eyeMaterial, [side * 0.15, 0.1, -0.27], undefined, `${prefix}-${sideName}-eye`);
      add(head, [0.13, 0.045, 0.06], stripeMaterial, [side * 0.15, 0.18, -0.25], undefined, `${prefix}-${sideName}-brow`).rotation.z = side * -0.12;
      const ear = childPivot(head, `${prefix}-${sideName}-ear-root-pivot`, [side * 0.18, 0.24, -0.02]);
      ear.userData.side = side;
      ear.userData.restZ = side * (bramble ? -0.28 : -0.18);
      ear.rotation.z = Number(ear.userData.restZ);
      add(ear, [0.19, bramble ? 0.4 : 0.34, 0.17], bodyMaterial, [side * 0.02, 0.15, 0], undefined, `${prefix}-${sideName}-pointed-ear`);
      add(ear, [0.09, bramble ? 0.25 : 0.21, 0.07], innerEarMaterial, [side * 0.02, 0.14, -0.1], undefined, `${prefix}-${sideName}-inner-ear`);
      if (bramble) add(ear, [0.08, 0.16, 0.08], chestMaterial, [side * 0.04, 0.38, 0], undefined, `${prefix}-${sideName}-ear-tuft`).rotation.z = side * -0.2;
      for (let whisker = 0; whisker < 3; whisker += 1) {
        const strand = add(head, [0.38, 0.022, 0.022], bramble ? chestMaterial : stripeMaterial, [side * 0.28, -0.08 + whisker * 0.065, -0.4], undefined, `${prefix}-${sideName}-whisker-${whisker + 1}`);
        strand.rotation.z = side * (-0.12 + whisker * 0.12);
      }
    }

    companionLegs(prefix, bramble ? 0.2 : 0.19, -0.24, 0.31, 0.04, targetFootY, bodyMaterial, stripeMaterial, bramble ? chestMaterial : stripeMaterial, [0.18, 0.11, 0.25], bramble ? chestMaterial : undefined);

    const tailRoot = pivotBox([0.14, 0.14, 0.55], stripeMaterial, [0, 0.15, 0.57], [0, 0.04, 0.25], "body", `${prefix}-tail-root`);
    tailRoot.rotation.x = bramble ? 0.36 : 0.48;
    const tailMid = childPivot(tailRoot, `${prefix}-tail-mid-pivot`, [0, 0.06, 0.5]);
    add(tailMid, [0.15, 0.15, 0.5], bramble ? bodyMaterial : stripeMaterial, [0, 0.08, 0.22], undefined, `${prefix}-tail-mid`).rotation.x = 0.25;
    const tailTip = childPivot(tailMid, `${prefix}-tail-tip-pivot`, [0, 0.14, 0.43]);
    add(tailTip, [bramble ? 0.21 : 0.16, bramble ? 0.24 : 0.38, 0.2], bramble ? chestMaterial : stripeMaterial, [0, 0.16, 0.05], undefined, `${prefix}-${bramble ? "leafy" : "licorice"}-tail-tip`).rotation.z = bramble ? -0.18 : -0.3;

    if (!bramble) {
      const bell = new THREE.Group();
      bell.name = "praline-cat-faction-bell";
      bell.visible = false;
      visual.add(bell);
      add(bell, [0.54, 0.1, 0.38], material(0xf1c85c), [0, 0.23, -0.39], undefined, "praline-cat-sugarcourt-collar");
      add(bell, [0.13, 0.16, 0.12], material(0x7ed9b7, true), [0, 0.09, -0.59], undefined, "praline-cat-sugarcourt-bell");
    }
  };

  const buildCrab = (crabKind: "sunwash-crab" | "tideglass-crab") => {
    const prefix = crabKind;
    const tideglass = crabKind === "tideglass-crab";
    const shellLight = material(tideglass ? 0x78ddd1 : 0xf4c87a);
    const shellDark = material(tideglass ? 0x24596e : 0xb85f49);
    const jointMaterial = material(tideglass ? 0x173e52 : 0x7c4038);
    const glowMaterial = material(tideglass ? 0xc8fff2 : 0xffdf9e, tideglass);
    const targetFootY = tideglass ? -0.29 : 0.5 - MOB_DEFS[crabKind].footOffset;
    visual.userData.crabRig = true;

    add(visual, [0.9, 0.25, 0.68], bodyMaterial, [0, -0.02, 0.03], "body", `${prefix}-carapace`);
    add(visual, [0.72, 0.13, 0.56], shellLight, [0, 0.16, 0.02], undefined, `${prefix}-${tideglass ? "tideglass-window" : "sunburst-crown"}`);
    add(visual, [0.54, 0.08, 0.43], shellDark, [0, 0.25, 0.04], undefined, `${prefix}-shell-keystone`);
    add(visual, [0.44, 0.1, 0.34], glowMaterial, [0, -0.18, -0.12], undefined, `${prefix}-${tideglass ? "luminous" : "pale"}-apron`);
    for (const side of [-1, 1] as const) {
      const sideName = side < 0 ? "left" : "right";
      const stalk = childPivot(visual, `${prefix}-${sideName}-eye-stalk-pivot`, [side * 0.2, 0.19, -0.28]);
      stalk.userData.side = side;
      add(stalk, [0.07, 0.2, 0.07], shellDark, [0, 0.08, 0], undefined, `${prefix}-${sideName}-eye-stalk`);
      add(stalk, [0.11, 0.11, 0.1], eyeMaterial, [0, 0.2, -0.02], undefined, `${prefix}-${sideName}-eye`);

      const clawScale = tideglass && side > 0 ? 1.28 : tideglass ? 0.88 : 1;
      const clawArm = pivotBox([0.46 * clawScale, 0.1, 0.12], jointMaterial, [side * 0.42, 0.02, -0.22], [side * 0.22 * clawScale, 0, -0.03], "arms", `${prefix}-${sideName}-claw-arm`);
      clawArm.userData.side = side;
      clawArm.userData.restZ = side * -0.12;
      clawArm.rotation.z = Number(clawArm.userData.restZ);
      add(clawArm, [0.32 * clawScale, 0.23 * clawScale, 0.3], shellLight, [side * 0.48 * clawScale, 0.06, -0.08], undefined, `${prefix}-${sideName}-claw-palm`);
      for (const jaw of [-1, 1]) add(clawArm, [0.1 * clawScale, 0.12, 0.3], jaw > 0 ? shellLight : shellDark, [side * (0.62 * clawScale), jaw * 0.12, -0.2], undefined, `${prefix}-${sideName}-pincer-${jaw > 0 ? "upper" : "lower"}`).rotation.z = side * jaw * 0.18;

      const legCount = 4;
      for (let legIndex = 0; legIndex < legCount; legIndex += 1) {
        const leg = pivotBox([0.42, 0.07, 0.09], jointMaterial, [side * 0.31, -0.1, -0.05 + legIndex * 0.17], [side * 0.2, -0.03, 0], "legs", `${prefix}-${sideName}-leg-${legIndex + 1}`);
        leg.userData.side = side;
        leg.userData.phase = legIndex % 2 ? Math.PI : 0;
        add(leg, [0.08, 0.16, 0.09], shellDark, [side * 0.41, -0.12, 0], undefined, `${prefix}-${sideName}-leg-${legIndex + 1}-joint`);
        add(leg, [tideglass && legIndex >= 2 ? 0.3 : 0.22, 0.055, tideglass && legIndex >= 2 ? 0.18 : 0.11], tideglass && legIndex >= 2 ? shellLight : jointMaterial, [side * 0.5, targetFootY + 0.0275 + 0.1, 0], undefined, `${prefix}-${sideName}-${tideglass && legIndex >= 2 ? "swim-paddle" : "foot"}-${legIndex + 1}`);
      }
    }
    if (tideglass) {
      for (let node = 0; node < 3; node += 1) add(visual, [0.11, 0.08, 0.11], glowMaterial, [-0.2 + node * 0.2, 0.29, -0.05 + (node % 2) * 0.16], undefined, `${prefix}-glow-node-${node + 1}`).rotation.y = Math.PI / 4;
    } else {
      for (let ray = 0; ray < 5; ray += 1) add(visual, [0.07, 0.05, 0.28], ray % 2 ? shellLight : glowMaterial, [0, 0.28, -0.13 + ray * 0.08], undefined, `${prefix}-sun-ray-${ray + 1}`).rotation.y = -0.65 + ray * 0.32;
    }
  };

  const groundedQuadrupedLegs = (
    prefix: string,
    species: CoreMobKind,
    x: number,
    frontZ: number,
    rearZ: number,
    hipY: number,
    width: number,
    upperMaterial: THREE.Material,
    footMaterial: THREE.Material,
    footSize: [number, number, number],
    visualLift = 0,
  ) => {
    const targetFootY = 0.5 - MOB_DEFS[species].footOffset - visualLift;
    const legLength = Math.max(0.12, hipY - targetFootY - footSize[1]);
    for (const [px, pz, phase, positionName] of [
      [-x, frontZ, 0, "front-left"], [x, frontZ, Math.PI, "front-right"],
      [-x, rearZ, Math.PI, "rear-left"], [x, rearZ, 0, "rear-right"],
    ] as Array<[number, number, number, string]>) {
      const leg = pivotBox([width, legLength, width], upperMaterial, [px, hipY, pz], [0, -legLength / 2, 0], "legs", `${prefix}-${positionName}-leg`);
      leg.userData.phase = phase;
      add(leg, footSize, footMaterial, [0, targetFootY - hipY + footSize[1] / 2, -footSize[2] * 0.12], undefined, `${prefix}-${positionName}-foot`);
    }
    return targetFootY;
  };

  type MosslingKind = "mossling" | "boglantern-mossling" | "cindercone-mossling" | "moonbloom-mossling" | "moonbrawn-mossling";
  const buildMossling = (mosslingKind: MosslingKind) => {
    const prefix = mosslingKind;
    const bog = mosslingKind === "boglantern-mossling";
    const cinder = mosslingKind === "cindercone-mossling";
    const moon = mosslingKind === "moonbloom-mossling";
    const brawn = mosslingKind === "moonbrawn-mossling";
    const targetFootY = 0.5 - MOB_DEFS[mosslingKind].footOffset;
    const bark = material(cinder ? 0x3b2d29 : moon ? 0x263e49 : bog ? 0x2d4939 : 0x31522c);
    const leaf = material(cinder ? 0xc56a3f : moon ? 0x978be0 : bog ? 0x779c50 : 0x7fb768);
    const glow = material(cinder ? 0xffbf55 : moon ? 0xd8fff0 : bog ? 0xe7ff82 : 0xf4cf6c, cinder || moon || bog, 0.94);
    visual.userData.wildlifeRig = "mossling";

    if (brawn) {
      // A genuine form change rather than a palette swap: broad bark shoulders,
      // articulated rooted arms and planted feet frame the same kind Mossling face.
      const deepBark = material(0x263523);
      const warmBark = material(0x4d5d3b);
      const moss = material(0x6f9b57);
      const freshLeaf = material(0x98bb6d);
      const moonberry = material(0x9a67b5, true, 0.92);
      const crystal = material(0xa8f0df, true, 0.88);
      const faceLight = material(0xa7bd79);
      visual.userData.mosslingForm = "moonbrawn";

      add(visual, [0.82, 0.68, 0.62], warmBark, [0, 0.18, 0.05], "body", `${prefix}-rootheart-torso`);
      add(visual, [0.68, 0.42, 0.54], bodyMaterial, [0, -0.12, 0.08], "body", `${prefix}-lower-trunk`);
      add(visual, [1.02, 0.3, 0.54], moss, [0, 0.4, 0.02], undefined, `${prefix}-mossy-shoulder-yoke`);
      for (const side of [-1, 1] as const) {
        const sideName = side < 0 ? "left" : "right";
        add(visual, [0.34, 0.42, 0.5], deepBark, [side * 0.48, 0.33, 0.03], undefined, `${prefix}-${sideName}-bark-shoulder`);

        const leg = pivotBox([0.3, 0.38, 0.3], deepBark, [side * 0.25, -0.02, 0.08], [0, -0.19, 0], "legs", `${prefix}-${sideName}-leg`);
        leg.userData.phase = side < 0 ? 0 : Math.PI;
        leg.userData.restX = 0;
        add(leg, [0.25, 0.32, 0.25], warmBark, [0, targetFootY + 0.22 + 0.02, -0.015], undefined, `${prefix}-${sideName}-root-shin`);
        add(leg, [0.46, 0.16, 0.55], deepBark, [0, targetFootY + 0.08 + 0.02, -0.11], undefined, `${prefix}-${sideName}-root-foot`);
        for (let toe = 0; toe < 3; toe += 1) {
          add(leg, [0.12, 0.1, 0.28], toe === 1 ? warmBark : deepBark,
            [(toe - 1) * 0.14, targetFootY + 0.05 + 0.02, -0.36], undefined, `${prefix}-${sideName}-toe-${toe + 1}`);
        }

        const arm = pivotBox([0.28, 0.5, 0.3], warmBark, [side * 0.57, 0.43, -0.01], [0, -0.21, 0], "arms", `${prefix}-${sideName}-arm`);
        arm.userData.phase = side < 0 ? 0 : Math.PI;
        arm.userData.restX = -0.08;
        arm.rotation.x = -0.08;
        add(arm, [0.36, 0.26, 0.38], moss, [0, -0.08, 0], undefined, `${prefix}-${sideName}-moss-elbow-guard`);
        const elbow = childPivot(arm, `${prefix}-${sideName}-forearm-pivot`, [side * 0.025, -0.36, -0.02]);
        elbow.userData.side = side;
        elbow.userData.restX = -0.12;
        elbow.rotation.x = -0.12;
        add(elbow, [0.34, 0.44, 0.36], deepBark, [side * 0.03, -0.18, -0.02], undefined, `${prefix}-${sideName}-root-forearm`);
        add(elbow, [0.48, 0.29, 0.46], warmBark, [side * 0.035, -0.43, -0.09], undefined, `${prefix}-${sideName}-root-fist`);
        for (let knuckle = 0; knuckle < 3; knuckle += 1) {
          add(elbow, [0.13, 0.12, 0.16], deepBark,
            [side * 0.04 + (knuckle - 1) * 0.14, -0.49, -0.31], undefined, `${prefix}-${sideName}-knuckle-${knuckle + 1}`);
        }
      }

      const head = pivotBox([0.56, 0.48, 0.5], faceLight, [0, 0.67, -0.18], [0, 0, 0], "head", `${prefix}-head`);
      add(head, [0.4, 0.22, 0.32], warmBark, [0, -0.14, -0.36], undefined, `${prefix}-root-muzzle`);
      add(head, [0.17, 0.1, 0.08], deepBark, [0, -0.1, -0.57], undefined, `${prefix}-seed-nose`);
      for (const side of [-1, 1] as const) {
        const sideName = side < 0 ? "left" : "right";
        add(head, [0.16, 0.1, 0.08], deepBark, [side * 0.17, 0.12, -0.33], undefined, `${prefix}-${sideName}-brow`).rotation.z = side * -0.12;
        add(head, [0.09, 0.1, 0.055], crystal, [side * 0.16, 0.035, -0.49], undefined, `${prefix}-${sideName}-eye`);
        add(head, [0.035, 0.045, 0.025], eyeMaterial, [side * 0.16, 0.035, -0.525], undefined, `${prefix}-${sideName}-pupil`);
        add(head, [0.16, 0.13, 0.11], moss, [side * 0.24, -0.1, -0.32], undefined, `${prefix}-${sideName}-moss-cheek`);
      }

      add(visual, [0.31, 0.26, 0.12], moonberry, [0, 0.15, -0.35], undefined, `${prefix}-moonberry-rootheart`);
      add(visual, [0.14, 0.15, 0.06], crystal, [0, 0.15, -0.43], undefined, `${prefix}-star-crystal-kernel`).rotation.y = Math.PI / 4;
      for (let plate = 0; plate < 4; plate += 1) {
        const backPlate = add(visual, [0.36 - plate * 0.035, 0.34, 0.13], deepBark,
          [0, 0.42 - plate * 0.16, 0.36 + plate * 0.05], undefined, `${prefix}-back-bark-plate-${plate + 1}`);
        backPlate.rotation.x = -0.22 + plate * 0.04;
      }
      for (let leafIndex = 0; leafIndex < 4; leafIndex += 1) {
        const side = leafIndex % 2 ? 1 : -1;
        const leafNode = add(visual, [0.32, 0.07, 0.19], leafIndex < 2 ? freshLeaf : moss,
          [side * (0.18 + leafIndex * 0.035), 0.88 - Math.floor(leafIndex / 2) * 0.13, 0.03 + leafIndex * 0.04], undefined, `${prefix}-crown-leaf-${leafIndex + 1}`);
        leafNode.rotation.z = side * (-0.45 + leafIndex * 0.04);
        leafNode.rotation.y = side * 0.22;
      }
      add(visual, [0.12, 0.24, 0.12], warmBark, [0, 0.88, 0.02], undefined, `${prefix}-crown-stem`);
      add(visual, [0.2, 0.14, 0.2], moonberry, [0, 1.02, 0.02], undefined, `${prefix}-crown-berry`).rotation.y = Math.PI / 4;
      return;
    }

    if (moon) {
      add(visual, [0.42, 0.54, 0.4], bodyMaterial, [0, 0.03, 0], "body", `${prefix}-bud-body`);
      add(visual, [0.34, 0.28, 0.32], accentMaterial, [0, 0.3, -0.16], "head", `${prefix}-masked-face`);
      eyePair(0.1, 0.33, -0.335, 0.065, prefix);
      for (let root = 0; root < 3; root += 1) {
        const angle = -Math.PI / 2 + root * TAU / 3;
        const px = Math.cos(angle) * 0.18;
        const pz = Math.sin(angle) * 0.13;
        const rootLength = -0.08 - targetFootY - 0.07;
        const leg = pivotBox([0.09, rootLength, 0.09], bark, [px, -0.08, pz], [0, -rootLength / 2, 0], "legs", `${prefix}-root-${root + 1}`);
        leg.userData.phase = root * TAU / 3;
        add(leg, [0.23, 0.07, 0.16], leaf, [Math.cos(angle) * 0.05, targetFootY + 0.035 + 0.08, Math.sin(angle) * 0.05], undefined, `${prefix}-root-pad-${root + 1}`).rotation.y = -angle;
      }
      add(visual, [0.08, 0.45, 0.08], bark, [0, 0.62, 0], undefined, `${prefix}-flower-stem`);
      for (let petal = 0; petal < 6; petal += 1) {
        const angle = petal * TAU / 6;
        const node = add(visual, [0.34, 0.055, 0.18], material(petal % 2 ? 0x8b83d8 : 0xb5a9ef, false, 0.84), [Math.cos(angle) * 0.15, 0.81, Math.sin(angle) * 0.15], undefined, `${prefix}-moon-petal-${petal + 1}`);
        node.rotation.y = -angle;
      }
      add(visual, [0.24, 0.1, 0.24], glow, [0, 0.86, 0], undefined, `${prefix}-moon-heart`).rotation.y = Math.PI / 4;
      return;
    }

    if (cinder) {
      add(visual, [0.52, 0.42, 0.5], bark, [0, -0.02, 0.04], "body", `${prefix}-charred-core`);
      for (let scale = 0; scale < 4; scale += 1) {
        const y = 0.02 + scale * 0.15;
        const plate = add(visual, [0.68 - scale * 0.09, 0.16, 0.3], scale % 2 ? bodyMaterial : accentMaterial, [0, y, 0.12 - scale * 0.08], undefined, `${prefix}-cone-scale-${scale + 1}`);
        plate.rotation.y = (scale % 2 ? 1 : -1) * 0.36;
      }
      add(visual, [0.34, 0.27, 0.32], accentMaterial, [0, 0.2, -0.38], "head", `${prefix}-seed-face`);
      eyePair(0.1, 0.24, -0.55, 0.06, prefix);
      for (const [root, px, pz] of [[1, -0.19, -0.05], [2, 0.19, -0.05], [3, 0, 0.22]] as const) {
        const rootLength = -0.11 - targetFootY - 0.07;
        const leg = pivotBox([0.11, rootLength, 0.11], bark, [px, -0.11, pz], [0, -rootLength / 2, 0], "legs", `${prefix}-char-root-${root}`);
        leg.userData.phase = root * 2.1;
        add(leg, [0.22, 0.07, 0.2], bark, [0, targetFootY + 0.035 + 0.11, -0.04], undefined, `${prefix}-char-foot-${root}`);
      }
      for (let branch = 0; branch < 3; branch += 1) {
        const twig = add(visual, [0.07, 0.34 - branch * 0.05, 0.07], bark, [-0.16 + branch * 0.16, 0.61 - Math.abs(branch - 1) * 0.05, 0], undefined, `${prefix}-burnt-twig-${branch + 1}`);
        twig.rotation.z = (branch - 1) * -0.34;
        add(visual, [0.12, 0.09, 0.12], glow, [-0.22 + branch * 0.22, 0.78 - Math.abs(branch - 1) * 0.04, 0], undefined, `${prefix}-ember-seed-${branch + 1}`).rotation.y = Math.PI / 4;
      }
      return;
    }

    const bodyY = bog ? -0.03 : 0.02;
    add(visual, [bog ? 0.72 : 0.62, bog ? 0.4 : 0.48, bog ? 0.62 : 0.58], bodyMaterial, [0, bodyY, 0.06], "body", `${prefix}-${bog ? "hummock" : "stump"}-body`);
    add(visual, [0.46, 0.34, 0.4], accentMaterial, [0, 0.22, -0.35], "head", `${prefix}-root-mask`);
    add(visual, [0.34, 0.18, 0.2], bark, [0, 0.12, -0.6], undefined, `${prefix}-muzzle`);
    eyePair(0.13, 0.29, -0.55, 0.065, prefix);
    const roots = bog ? [[-0.25, -0.15], [0.25, -0.15], [-0.25, 0.25], [0.25, 0.25]] : [[-0.19, -0.02], [0.19, -0.02]];
    roots.forEach(([px, pz], index) => {
      const length = -0.12 - targetFootY - 0.07;
      const leg = pivotBox([0.13, length, 0.13], bark, [px, -0.12, pz], [0, -length / 2, 0], "legs", `${prefix}-root-${index + 1}`);
      leg.userData.phase = index % 2 ? Math.PI : 0;
      add(leg, [bog ? 0.3 : 0.22, 0.07, bog ? 0.25 : 0.2], bark, [0, targetFootY + 0.035 + 0.12, -0.05], undefined, `${prefix}-root-toes-${index + 1}`);
    });
    if (bog) {
      add(visual, [0.1, 0.34, 0.1], bark, [0, 0.52, 0.02], undefined, `${prefix}-lantern-stalk`);
      add(visual, [0.5, 0.12, 0.48], leaf, [0, 0.68, 0.02], undefined, `${prefix}-fungus-brim`).rotation.y = Math.PI / 4;
      add(visual, [0.34, 0.22, 0.34], glow, [0, 0.78, 0.02], undefined, `${prefix}-lantern-cap`);
      for (const side of [-1, 1]) add(visual, [0.14, 0.05, 0.26], leaf, [side * 0.28, 0.38, 0.02], undefined, `${prefix}-${side < 0 ? "left" : "right"}-reed-leaf`).rotation.z = side * -0.34;
    } else {
      add(visual, [0.58, 0.08, 0.42], leaf, [0, 0.43, 0.03], undefined, `${prefix}-leaf-mantle`).rotation.y = Math.PI / 4;
      add(visual, [0.06, 0.3, 0.06], bark, [-0.05, 0.66, 0.03], undefined, `${prefix}-sprout-stem`).rotation.z = -0.12;
      for (const side of [-1, 1]) add(visual, [0.24, 0.055, 0.14], leaf, [side * 0.11, 0.76, 0.03], undefined, `${prefix}-${side < 0 ? "left" : "right"}-crown-leaf`).rotation.z = side * -0.42;
      add(visual, [0.16, 0.08, 0.16], glow, [-0.06, 0.86, 0.03], undefined, `${prefix}-golden-bloom`).rotation.y = Math.PI / 4;
    }
  };

  type DeerKind = "thimbledeer" | "frostlace-hart" | "reedcrown-deer";
  const buildDeer = (deerKind: DeerKind) => {
    const prefix = deerKind;
    const frost = deerKind === "frostlace-hart";
    const reed = deerKind === "reedcrown-deer";
    const cream = material(frost ? 0xeaf2ef : reed ? 0xc8b77a : 0xead7b0);
    const antler = material(frost ? 0xd9ffff : reed ? 0x6f7845 : 0xd8c28f, frost, frost ? 0.88 : 1);
    const hoof = material(frost ? 0x526d79 : reed ? 0x3d4934 : 0x4b3628);
    visual.userData.wildlifeRig = "deer";
    add(visual, [frost ? 0.76 : 0.7, 0.56, 1.12], bodyMaterial, [0, 0.08, 0.12], "body", `${prefix}-barrel`);
    add(visual, [0.68, 0.5, 0.46], accentMaterial, [0, 0.12, -0.34], undefined, `${prefix}-shoulder`);
    add(visual, [0.58, 0.5, 0.5], bodyMaterial, [0, 0.12, 0.48], undefined, `${prefix}-haunch`);
    const neck = add(visual, [0.28, frost ? 0.74 : 0.64, 0.3], accentMaterial, [0, 0.48, -0.52], "body", `${prefix}-slender-neck`);
    neck.rotation.x = -0.2;
    const head = pivotBox([0.5, 0.42, 0.5], bodyMaterial, [0, 0.76, -0.74], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.3, 0.2, 0.34], cream, [0, -0.12, -0.38], undefined, `${prefix}-muzzle`);
    add(head, [0.09, 0.06, 0.05], hoof, [0, -0.08, -0.58], undefined, `${prefix}-nose`);
    for (const side of [-1, 1] as const) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.07, 0.07, 0.04], eyeMaterial, [side * 0.16, 0.09, -0.29], undefined, `${prefix}-${sideName}-eye`);
      const ear = childPivot(head, `${prefix}-${sideName}-ear-pivot`, [side * 0.2, 0.19, -0.03]);
      ear.userData.side = side;
      const earMesh = add(ear, [reed ? 0.25 : 0.2, reed ? 0.38 : 0.32, 0.13], accentMaterial, [side * 0.04, 0.13, 0], undefined, `${prefix}-${sideName}-ear`);
      earMesh.rotation.z = side * -0.25;
      add(ear, [0.09, reed ? 0.23 : 0.18, 0.05], cream, [side * 0.04, 0.13, -0.08], undefined, `${prefix}-${sideName}-inner-ear`);
    }
    groundedQuadrupedLegs(prefix, deerKind, frost ? 0.27 : 0.24, -0.3, 0.42, -0.08, frost ? 0.15 : 0.13, accentMaterial, hoof, frost ? [0.31, 0.11, 0.34] : reed ? [0.29, 0.1, 0.32] : [0.19, 0.1, 0.24]);
    if (frost) {
      for (const side of [-1, 1]) {
        for (let branch = 0; branch < 4; branch += 1) {
          const tine = add(head, [0.09, 0.34 - branch * 0.035, 0.09], antler, [side * (0.14 + branch * 0.095), 0.36 + branch * 0.13, 0.02 + branch * 0.02], undefined, `${prefix}-${side < 0 ? "left" : "right"}-ice-tine-${branch + 1}`);
          tine.rotation.z = side * (-0.1 - branch * 0.16);
        }
        add(head, [0.09, 0.52, 0.09], antler, [side * 0.14, 0.42, 0.02], undefined, `${prefix}-${side < 0 ? "left" : "right"}-ice-beam`).rotation.z = side * -0.12;
      }
      for (let spot = 0; spot < 4; spot += 1) add(visual, [0.09, 0.06, 0.09], antler, [(spot % 2 ? 1 : -1) * 0.28, 0.31, -0.15 + spot * 0.22], undefined, `${prefix}-snow-star-${spot + 1}`).rotation.y = Math.PI / 4;
    } else if (reed) {
      for (const side of [-1, 1]) {
        const beam = add(head, [0.62, 0.08, 0.08], antler, [side * 0.34, 0.35, 0.03], undefined, `${prefix}-${side < 0 ? "left" : "right"}-reed-beam`);
        beam.rotation.z = side * -0.18;
        for (let tine = 0; tine < 3; tine += 1) {
          const stalk = add(head, [0.06, 0.27 + tine * 0.04, 0.06], antler, [side * (0.22 + tine * 0.18), 0.45 + tine * 0.025, 0.02], undefined, `${prefix}-${side < 0 ? "left" : "right"}-reed-tine-${tine + 1}`);
          stalk.rotation.z = side * -0.12;
          add(head, [0.11, 0.2, 0.11], material(0x8b6f43), [side * (0.23 + tine * 0.18), 0.63 + tine * 0.04, 0.02], undefined, `${prefix}-${side < 0 ? "left" : "right"}-cattail-${tine + 1}`);
        }
      }
      add(visual, [0.62, 0.07, 0.46], material(0x718454), [0, 0.38, 0.12], undefined, `${prefix}-marsh-saddle`).rotation.y = Math.PI / 4;
    } else {
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const crown = childPivot(head, `${prefix}-${sideName}-antler-crown`, [side * 0.13, 0.18, 0.02]);
        add(crown, [0.16, 0.12, 0.16], antler, [0, 0.03, 0], undefined, `${prefix}-${sideName}-antler-root`);
        const post = add(crown, [0.1, 0.34, 0.1], antler, [0, 0.22, 0], undefined, `${prefix}-${sideName}-antler-post`);
        post.rotation.z = side * -0.08;
        const branch = add(crown, [0.3, 0.085, 0.1], antler, [side * 0.11, 0.36, 0], undefined, `${prefix}-${sideName}-antler-branch`);
        branch.rotation.z = side * 0.18;
        for (const [cap, x, y, scale] of [[1, 0, 0.47, 1], [2, side * 0.25, 0.37, 0.9]] as Array<[number, number, number, number]>) {
          add(crown, [0.075, 0.14, 0.075], antler, [x, y - 0.05, 0], undefined, `${prefix}-${sideName}-thimble-${cap}-stem`);
          add(crown, [0.18 * scale, 0.13, 0.16 * scale], antler, [x, y + 0.045, 0], undefined, `${prefix}-${sideName}-thimble-${cap}-cup`).rotation.y = Math.PI / 4;
          add(crown, [0.22 * scale, 0.045, 0.19 * scale], cream, [x, y + 0.12, 0], undefined, `${prefix}-${sideName}-thimble-${cap}-rim`).rotation.y = Math.PI / 4;
        }
      }
      for (let seed = 0; seed < 4; seed += 1) add(visual, [0.06, 0.06, 0.06], cream, [(seed % 2 ? 1 : -1) * 0.31, 0.33, -0.16 + seed * 0.22], undefined, `${prefix}-seed-spot-${seed + 1}`).rotation.y = Math.PI / 4;
    }
    const tail = pivotBox([0.16, 0.2, 0.4], cream, [0, 0.26, 0.69], [0, 0.02, 0.18], "body", `${prefix}-tail-root`);
    tail.rotation.x = 0.48;
  };

  type CowKind = "meadow-cow" | "sunbloom-longhorn";
  const buildCow = (cowKind: CowKind) => {
    const prefix = cowKind;
    const longhorn = cowKind === "sunbloom-longhorn";
    const cream = material(longhorn ? 0xf0c879 : 0xefe1bf);
    const muzzle = material(longhorn ? 0xd6935d : 0xe5b5a0);
    const horn = material(longhorn ? 0xe9d39a : 0xdfc99a);
    const hoof = material(longhorn ? 0x4a2c20 : 0x4b3a31);
    const green = material(longhorn ? 0xd29a32 : 0x6e9b51);
    visual.userData.wildlifeRig = "cow";
    add(visual, [longhorn ? 1.22 : 1.08, longhorn ? 0.82 : 0.86, longhorn ? 1.62 : 1.5], bodyMaterial, [0, 0.16, 0.16], "body", `${prefix}-barrel`);
    add(visual, [longhorn ? 1.16 : 0.9, longhorn ? 0.86 : 0.72, 0.64], accentMaterial, [0, 0.22, -0.45], undefined, `${prefix}-shoulder`);
    add(visual, [0.9, 0.68, 0.58], bodyMaterial, [0, 0.16, 0.62], undefined, `${prefix}-haunch`);
    const head = pivotBox([longhorn ? 0.78 : 0.72, 0.62, longhorn ? 0.72 : 0.68], accentMaterial, [0, 0.54, -0.88], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.56, 0.3, 0.42], muzzle, [0, -0.16, -0.5], undefined, `${prefix}-broad-muzzle`);
    add(head, [0.14, 0.07, 0.08], hoof, [0, -0.11, -0.74], undefined, `${prefix}-nose`);
    for (const side of [-1, 1] as const) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.075, 0.075, 0.04], eyeMaterial, [side * 0.23, 0.1, -0.38], undefined, `${prefix}-${sideName}-eye`);
      const ear = add(head, [longhorn ? 0.38 : 0.31, 0.13, 0.27], cream, [side * 0.43, 0.17, -0.04], undefined, `${prefix}-${sideName}-ear`);
      ear.rotation.z = side * -0.28;
      if (longhorn) {
        for (let segment = 0; segment < 4; segment += 1) {
          const x = side * (0.42 + segment * 0.22);
          const beam = add(head, [0.28, 0.11, 0.12], horn, [x, 0.31 + segment * 0.035, -0.02 + segment * 0.025], undefined, `${prefix}-${sideName}-horn-${segment + 1}`);
          beam.rotation.z = side * (-0.12 - segment * 0.08);
        }
        const tip = add(head, [0.11, 0.32, 0.11], hoof, [side * 1.13, 0.42, 0.05], undefined, `${prefix}-${sideName}-horn-tip`);
        tip.rotation.z = side * -0.45;
      } else {
        const post = add(head, [0.12, 0.34, 0.12], horn, [side * 0.25, 0.36, 0], undefined, `${prefix}-${sideName}-horn`);
        post.rotation.z = side * -0.42;
      }
    }
    groundedQuadrupedLegs(prefix, cowKind, longhorn ? 0.43 : 0.37, -0.36, 0.52, -0.14, longhorn ? 0.22 : 0.2, accentMaterial, hoof, longhorn ? [0.3, 0.13, 0.38] : [0.25, 0.12, 0.3]);
    add(visual, [0.5, 0.26, 0.4], muzzle, [0, -0.32, 0.28], undefined, `${prefix}-udder`);
    const targetFootY = 0.5 - MOB_DEFS[cowKind].footOffset;
    for (const side of [-1, 1]) add(visual, [0.08, 0.18, 0.08], muzzle, [side * 0.13, targetFootY + 0.09, 0.18], undefined, `${prefix}-${side < 0 ? "left" : "right"}-teat`);
    if (longhorn) {
      add(visual, [0.86, 0.11, 0.72], material(0x6e7a3d), [0, 0.61, 0.1], undefined, `${prefix}-drygrass-saddle`).rotation.y = Math.PI / 4;
      for (let petal = 0; petal < 6; petal += 1) {
        const angle = petal * TAU / 6;
        const flower = add(visual, [0.19, 0.05, 0.09], green, [Math.cos(angle) * 0.16, 0.73, 0.08 + Math.sin(angle) * 0.16], undefined, `${prefix}-sunflower-petal-${petal + 1}`);
        flower.rotation.y = -angle;
      }
      add(visual, [0.17, 0.08, 0.17], material(0x5d3b26), [0, 0.75, 0.08], undefined, `${prefix}-sunflower-heart`);
    } else {
      for (const [index, x, z] of [[1, -0.25, -0.12], [2, 0.2, 0.05], [3, -0.05, 0.32]] as const) {
        for (let leafIndex = 0; leafIndex < 3; leafIndex += 1) {
          const angle = leafIndex * TAU / 3;
          const mark = add(visual, [0.24, 0.045, 0.13], green, [x + Math.cos(angle) * 0.09, 0.6, z + Math.sin(angle) * 0.09], undefined, `${prefix}-clover-${index}-leaf-${leafIndex + 1}`);
          mark.rotation.y = -angle;
        }
      }
      const collar = add(visual, [0.76, 0.12, 0.48], material(0x8b5d3b), [0, 0.47, -0.6], undefined, `${prefix}-bell-collar`);
      collar.rotation.x = -0.18;
      add(visual, [0.16, 0.2, 0.15], material(0xd4aa4f), [0, 0.24, -0.83], undefined, `${prefix}-pasture-bell`);
    }
    const tail = pivotBox([0.13, 0.14, 0.74], hoof, [0, 0.42, 0.93], [0, 0, 0.34], "body", `${prefix}-tail-root`);
    tail.rotation.x = -0.35;
    add(tail, [0.28, 0.3, 0.3], accentMaterial, [0, -0.08, 0.72], undefined, `${prefix}-tail-tuft`);
  };

  type FoxKind = "petalfox" | "emberbrush-fox" | "moonpetal-fox";
  const buildFox = (foxKind: FoxKind) => {
    const prefix = foxKind;
    const ember = foxKind === "emberbrush-fox";
    const moon = foxKind === "moonpetal-fox";
    const pale = material(ember ? 0xf5c77b : moon ? 0xb9a7e7 : 0xffd4b8);
    const dark = material(ember ? 0x382326 : moon ? 0x29344f : 0x5c3040);
    const petalMaterial = material(ember ? 0xf07d3f : moon ? 0xb9a6ef : 0xf2a4ba, moon, moon ? 0.85 : 1);
    visual.userData.wildlifeRig = "fox";
    add(visual, [ember ? 0.58 : 0.64, 0.42, 1.02], bodyMaterial, [0, 0.01, 0.12], "body", `${prefix}-lithe-body`);
    add(visual, [0.58, 0.5, 0.48], accentMaterial, [0, 0.12, -0.34], undefined, `${prefix}-chest`);
    add(visual, [0.62, 0.46, 0.48], bodyMaterial, [0, 0.11, 0.48], undefined, `${prefix}-haunch`);
    const head = pivotBox([0.56, 0.48, 0.52], accentMaterial, [0, 0.3, -0.58], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.34, 0.22, 0.4], pale, [0, -0.13, -0.38], undefined, `${prefix}-muzzle`);
    add(head, [0.08, 0.065, 0.05], dark, [0, -0.08, -0.62], undefined, `${prefix}-nose`);
    for (const side of [-1, 1] as const) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.075, 0.075, 0.04], eyeMaterial, [side * 0.17, 0.08, -0.31], undefined, `${prefix}-${sideName}-eye`);
      const ear = childPivot(head, `${prefix}-${sideName}-ear-pivot`, [side * 0.18, 0.22, -0.02]);
      ear.userData.side = side;
      const earHeight = ember ? 0.58 : moon ? 0.38 : 0.44;
      add(ear, [ember ? 0.23 : 0.2, earHeight, 0.18], dark, [side * 0.03, earHeight * 0.35, 0], undefined, `${prefix}-${sideName}-ear`).rotation.z = side * (ember ? -0.12 : -0.2);
      add(ear, [0.09, earHeight * 0.6, 0.07], pale, [side * 0.03, earHeight * 0.35, -0.11], undefined, `${prefix}-${sideName}-inner-ear`);
    }
    groundedQuadrupedLegs(prefix, foxKind, 0.21, -0.23, 0.34, -0.09, 0.13, bodyMaterial, dark, ember ? [0.2, 0.1, 0.3] : [0.18, 0.1, 0.25]);
    if (moon) {
      for (const side of [-1, 1] as const) {
        const sideName = side < 0 ? "left" : "right";
        const tail = pivotBox([0.28, 0.3, 0.86], side < 0 ? petalMaterial : bodyMaterial, [side * 0.18, 0.23, 0.56], [side * 0.08, 0.11, 0.4], "body", `${prefix}-${sideName === "left" ? "tail-root" : "tail-secondary"}`);
        tail.rotation.x = 0.52;
        tail.rotation.z = side * -0.24;
        for (let petal = 0; petal < 3; petal += 1) {
          const mark = add(tail, [0.27, 0.055, 0.25], petal % 2 ? pale : petalMaterial, [side * (0.12 + petal * 0.04), 0.13 + petal * 0.08, 0.48 + petal * 0.2], undefined, `${prefix}-${sideName}-tail-petal-${petal + 1}`);
          mark.rotation.z = side * (0.22 + petal * 0.12);
        }
        add(tail, [0.11, 0.07, 0.11], material(0xd9fff2, true), [side * 0.12, 0.22, 0.92], undefined, `${prefix}-${sideName}-tail-eye`).rotation.y = Math.PI / 4;
      }
    } else if (ember) {
      const tail = pivotBox([0.28, 0.3, 0.86], dark, [0, 0.2, 0.58], [0, 0.09, 0.4], "body", `${prefix}-tail-root`);
      tail.rotation.x = 0.52;
      for (const side of [-1, 1]) {
        const fork = add(tail, [0.24, 0.24, 0.66], side < 0 ? petalMaterial : pale, [side * 0.2, 0.18, 0.72], undefined, `${prefix}-${side < 0 ? "left" : "right"}-tail-fork`);
        fork.rotation.z = side * -0.28;
        fork.rotation.x = 0.18;
      }
      add(tail, [0.18, 0.18, 0.5], material(0xffb649, true), [0, 0.27, 0.83], undefined, `${prefix}-ember-tail-core`).rotation.x = 0.25;
    } else {
      const tail = pivotBox([0.32, 0.34, 0.94], bodyMaterial, [0, 0.2, 0.56], [0, 0.1, 0.43], "body", `${prefix}-tail-root`);
      tail.rotation.x = 0.5;
      for (let petal = 0; petal < 5; petal += 1) {
        const side = petal % 2 ? 1 : -1;
        const mark = add(tail, [0.28, 0.06, 0.3], petal % 2 ? petalMaterial : pale, [side * (0.14 + petal * 0.015), 0.12 + petal * 0.055, 0.36 + petal * 0.15], undefined, `${prefix}-tail-petal-${petal + 1}`);
        mark.rotation.z = side * (0.26 + petal * 0.04);
      }
    }
  };

  type TortoiseKind = "pebbletortoise" | "reefglide-terrapin";
  const buildTortoise = (tortoiseKind: TortoiseKind) => {
    const prefix = tortoiseKind;
    const aquatic = tortoiseKind === "reefglide-terrapin";
    const shellDark = material(aquatic ? 0x245a58 : 0x4b5144);
    const shellLight = material(aquatic ? 0xd48f72 : 0x9caf73);
    const skin = material(aquatic ? 0x62a99a : 0x68705b);
    const glow = material(0xbff8dc, aquatic, aquatic ? 0.82 : 1);
    visual.userData.wildlifeRig = "tortoise";
    add(visual, [aquatic ? 1.22 : 1.12, aquatic ? 0.34 : 0.46, aquatic ? 1.38 : 1.2], shellDark, [0, aquatic ? 0.04 : 0.02, 0.08], "body", `${prefix}-lower-shell`);
    add(visual, [aquatic ? 1.06 : 0.94, aquatic ? 0.3 : 0.34, aquatic ? 1.12 : 0.98], bodyMaterial, [0, aquatic ? 0.24 : 0.26, 0.06], undefined, `${prefix}-domed-shell`);
    const shellTiles = aquatic
      ? [[-0.28, -0.25, 0.34], [0.26, -0.2, 0.28], [-0.3, 0.25, 0.25], [0.28, 0.28, 0.31], [0, 0.02, 0.38]]
      : [[-0.25, -0.18, 0.3], [0.24, -0.18, 0.27], [-0.28, 0.26, 0.25], [0.25, 0.27, 0.29], [0, 0.05, 0.34]];
    shellTiles.forEach(([x, z, size], index) => {
      const tile = add(visual, [size, 0.09, size], index % 2 ? shellLight : accentMaterial, [x, aquatic ? 0.44 : 0.48, z], undefined, `${prefix}-shell-tile-${index + 1}`);
      tile.rotation.y = Math.PI / 4 + index * 0.1;
    });
    const bed = add(visual, [0.58, 0.08, 0.48], shellDark, [0, aquatic ? 0.54 : 0.57, 0.08], undefined, `${prefix}-shell-bed`);
    bed.rotation.y = Math.PI / 4;
    const modulePalette = { moss: 0x60894f, flower: 0xd98a9e, fungus: 0xb89775, "water-plant": 0x54b5a5 } as const;
    (Object.entries(modulePalette) as Array<[keyof typeof modulePalette, number]>).forEach(([module, color], index) => {
      const planting = add(visual, module === "flower" ? [0.12, 0.22, 0.12] : [0.36, 0.12, 0.28], material(color, module === "water-plant", .75), [0, aquatic ? 0.64 : 0.67, 0.08], undefined, `${prefix}-shell-module-${module}`);
      planting.visible = false;
      if (module === "flower") planting.rotation.z = 0.16;
      if (index % 2) planting.rotation.y = Math.PI / 4;
      planting.userData.creatureShellModule = module;
    });
    if (aquatic) for (let coral = 0; coral < 3; coral += 1) {
      add(visual, [0.1, 0.25 + coral * 0.06, 0.1], coral % 2 ? shellLight : glow, [-0.24 + coral * 0.24, 0.59 + coral * 0.03, 0.08 + (coral % 2) * 0.18], undefined, `${prefix}-coral-${coral + 1}`).rotation.z = (coral - 1) * 0.22;
    }
    const head = pivotBox([aquatic ? 0.46 : 0.42, 0.32, aquatic ? 0.52 : 0.44], skin, [0, 0, aquatic ? -0.78 : -0.7], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.32, 0.18, 0.28], aquatic ? glow : accentMaterial, [0, -0.08, -0.34], undefined, `${prefix}-beak`);
    for (const side of [-1, 1]) add(head, [0.06, 0.06, 0.035], eyeMaterial, [side * 0.14, 0.07, -0.28], undefined, `${prefix}-${side < 0 ? "left" : "right"}-eye`);
    if (aquatic) {
      for (const [side, front] of [[-1, true], [1, true], [-1, false], [1, false]] as const) {
        const sideName = side < 0 ? "left" : "right";
        const position = front ? "front" : "rear";
        const flipper = pivotBox(front ? [0.74, 0.09, 0.48] : [0.52, 0.08, 0.4], skin, [side * 0.46, -0.08, front ? -0.34 : 0.45], [side * (front ? 0.3 : 0.22), -0.02, front ? -0.08 : 0.05], "wings", `${prefix}-${position}-${sideName}-flipper`);
        flipper.userData.side = side;
        flipper.userData.phase = front ? 0 : Math.PI;
        flipper.rotation.z = side * -0.22;
        flipper.rotation.y = side * (front ? -0.16 : 0.12);
      }
    } else {
      groundedQuadrupedLegs(prefix, tortoiseKind, 0.42, -0.3, 0.38, -0.08, 0.16, skin, shellDark, [0.3, 0.12, 0.36]);
    }
    const tail = pivotBox([0.16, 0.14, aquatic ? 0.46 : 0.3], skin, [0, -0.02, aquatic ? 0.76 : 0.7], [0, 0, aquatic ? 0.2 : 0.13], "body", `${prefix}-tail-root`);
    tail.rotation.x = -0.12;
  };

  const buildRidgeback = () => {
    const prefix = "ridgeback";
    const lift = RIDGEBACK_GROUND_LIFT;
    const plate = material(0x4b3328);
    const plateWarm = material(0xa86642);
    const bone = material(0xead8ad);
    const hoof = material(0x34231e);
    visual.userData.wildlifeRig = "ridgeback";
    visual.position.y = lift;
    add(visual, [1.12, 0.68, 1.52], bodyMaterial, [0, -0.05, 0.12], "body", `${prefix}-barrel`);
    add(visual, [1.2, 0.82, 0.64], accentMaterial, [0, 0, -0.38], undefined, `${prefix}-armored-shoulder`);
    add(visual, [1.0, 0.66, 0.58], bodyMaterial, [0, -0.06, 0.68], undefined, `${prefix}-haunch`);
    const head = pivotBox([0.78, 0.6, 0.72], accentMaterial, [0, 0.02, -0.9], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.62, 0.34, 0.5], plateWarm, [0, -0.14, -0.48], undefined, `${prefix}-battering-snout`);
    add(head, [0.22, 0.12, 0.1], hoof, [0, -0.12, -0.76], undefined, `${prefix}-nose`);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.075, 0.075, 0.04], eyeMaterial, [side * 0.24, 0.12, -0.39], undefined, `${prefix}-${sideName}-eye`);
      add(head, [0.32, 0.18, 0.24], plate, [side * 0.39, 0.25, -0.06], undefined, `${prefix}-${sideName}-cheek-plate`).rotation.z = side * -0.16;
      const tuskRoot = childPivot(head, `${prefix}-${sideName}-tusk-root-pivot`, [side * 0.27, -0.17, -0.58]);
      tuskRoot.userData.side = side;
      const lower = add(tuskRoot, [0.1, 0.38, 0.11], bone, [side * 0.05, -0.08, -0.12], undefined, `${prefix}-${sideName}-lower-tusk`);
      lower.rotation.x = 0.48;
      lower.rotation.z = side * -0.25;
      const tip = add(tuskRoot, [0.09, 0.3, 0.09], bone, [side * 0.12, 0.14, -0.3], undefined, `${prefix}-${sideName}-upturned-tusk`);
      tip.rotation.x = -0.42;
      tip.rotation.z = side * -0.45;
    }
    groundedQuadrupedLegs(prefix, "ridgeback", 0.39, -0.38, 0.48, -0.22, 0.24, bodyMaterial, hoof, [0.31, 0.14, 0.38], lift);
    for (let ridge = 0; ridge < 8; ridge += 1) {
      const arc = Math.sin((ridge + 1) / 9 * Math.PI);
      const height = 0.22 + arc * 0.22;
      const plateNode = add(visual, [0.46 - ridge * 0.018, height, 0.18], ridge % 2 ? plateWarm : plate, [0, 0.29 + height / 2, -0.58 + ridge * 0.22], undefined, `${prefix}-sunstone-plate-${ridge + 1}`);
      plateNode.rotation.x = (ridge - 3.5) * 0.018;
      plateNode.rotation.y = (ridge % 2 ? 1 : -1) * 0.035;
    }
    for (const side of [-1, 1]) for (let plateIndex = 0; plateIndex < 3; plateIndex += 1) {
      add(visual, [0.18, 0.34, 0.3], plate, [side * 0.57, 0.14 - plateIndex * 0.12, -0.3 + plateIndex * 0.36], undefined, `${prefix}-${side < 0 ? "left" : "right"}-side-plate-${plateIndex + 1}`).rotation.z = side * -0.12;
    }
    const tail = pivotBox([0.17, 0.18, 0.72], plate, [0, 0.16, 0.85], [0, 0.02, 0.33], "body", `${prefix}-tail-root`);
    tail.rotation.x = 0.55;
    add(tail, [0.26, 0.28, 0.3], plateWarm, [0, 0.12, 0.7], undefined, `${prefix}-tail-club`);
  };

  const buildWoolhorn = () => {
    const prefix = "woolhorn";
    const fleece = material(0xf2f0e7);
    const fleeceShade = material(0xc9c7bd);
    const horn = material(0x544d45);
    const muzzle = material(0x70665e);
    visual.userData.wildlifeRig = "woolhorn";
    add(visual, [1.02, 0.76, 1.14], bodyMaterial, [0, 0.08, 0.1], "body", `${prefix}-core-body`);
    const woolCoat = new THREE.Group();
    woolCoat.name = `${prefix}-wool-coat`;
    woolCoat.userData.woolhornCoat = true;
    visual.add(woolCoat);
    for (const [index, x, y, z, sx, sy, sz] of [
      [1, -0.28, 0.35, -0.28, 0.62, 0.5, 0.52], [2, 0.28, 0.35, -0.22, 0.62, 0.5, 0.54],
      [3, -0.3, 0.34, 0.28, 0.64, 0.52, 0.58], [4, 0.28, 0.34, 0.32, 0.62, 0.52, 0.6],
      [5, 0, 0.52, 0.03, 0.7, 0.44, 0.72],
    ] as Array<[number, number, number, number, number, number, number]>) add(woolCoat, [sx, sy, sz], index % 2 ? fleece : fleeceShade, [x, y, z], undefined, `${prefix}-fleece-cloud-${index}`);
    add(woolCoat, [0.82, 0.62, 0.56], fleeceShade, [0, 0.18, -0.57], undefined, `${prefix}-woolly-shoulder`);
    for (const [index, x, y, z, scale] of [
      [1, -0.48, 0.22, -0.06, 0.3], [2, 0.48, 0.22, -0.02, 0.3],
      [3, -0.43, 0.24, 0.43, 0.32], [4, 0.43, 0.24, 0.46, 0.32],
      [5, -0.2, 0.67, 0.28, 0.34], [6, 0.2, 0.67, 0.3, 0.34],
    ] as Array<[number, number, number, number, number]>) {
      add(woolCoat, [scale, scale, scale], index % 2 ? fleece : fleeceShade, [x, y, z], undefined, `${prefix}-fleece-curl-${index}`);
    }
    const head = pivotBox([0.62, 0.56, 0.54], accentMaterial, [0, 0.31, -0.76], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.42, 0.24, 0.32], muzzle, [0, -0.12, -0.42], undefined, `${prefix}-muzzle`);
    const beard = add(head, [0.2, 0.26, 0.18], fleece, [0, -0.34, -0.18], undefined, `${prefix}-beard`);
    beard.userData.woolhornCoat = true;
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.07, 0.07, 0.04], eyeMaterial, [side * 0.19, 0.1, -0.31], undefined, `${prefix}-${sideName}-eye`);
      add(head, [0.24, 0.12, 0.22], fleeceShade, [side * 0.33, 0.22, -0.02], undefined, `${prefix}-${sideName}-ear`).rotation.z = side * -0.32;
      const hornRoot = childPivot(head, `${prefix}-${sideName}-horn-root-pivot`, [side * 0.25, 0.18, -0.02]);
      hornRoot.userData.side = side;
      const segments = [[0.12, 0.2, -0.01, 0.3], [0.3, 0.12, -0.04, 0.12], [0.39, -0.05, -0.1, -0.15], [0.34, -0.23, -0.19, -0.44], [0.19, -0.34, -0.28, -0.65]];
      segments.forEach(([x, y, z, rotation], index) => {
        const segment = add(hornRoot, [0.2 - index * 0.018, 0.2 - index * 0.018, 0.3], index % 2 ? horn : muzzle, [side * x, y, z], undefined, `${prefix}-${sideName}-curl-${index + 1}`);
        segment.rotation.z = side * rotation;
        segment.rotation.x = index * 0.06;
      });
    }
    groundedQuadrupedLegs(prefix, "woolhorn", 0.34, -0.31, 0.4, -0.17, 0.17, accentMaterial, horn, [0.23, 0.12, 0.29]);
    const tail = pivotBox([0.32, 0.34, 0.42], fleece, [0, 0.24, 0.68], [0, 0.08, 0.17], "body", `${prefix}-tail-root`);
    tail.userData.woolhornCoat = true;
    tail.rotation.x = 0.45;
  };

  const buildSunstepGrazer = () => {
    const prefix = "sunstep-grazer";
    const cream = material(0xf1c96d);
    const dark = material(0x4b2d25);
    const sun = material(0xffd66b, true);
    visual.userData.wildlifeRig = "grazer";
    add(visual, [0.82, 0.64, 1.25], bodyMaterial, [0, 0.2, 0.12], "body", `${prefix}-barrel`);
    add(visual, [0.7, 0.72, 0.5], accentMaterial, [0, 0.28, -0.38], undefined, `${prefix}-high-shoulder`);
    add(visual, [0.6, 0.56, 0.48], bodyMaterial, [0, 0.2, 0.52], undefined, `${prefix}-haunch`);
    const neck = add(visual, [0.3, 0.9, 0.32], accentMaterial, [0, 0.72, -0.54], "body", `${prefix}-upright-neck`);
    neck.rotation.x = -0.18;
    for (let stripe = 0; stripe < 4; stripe += 1) add(visual, [0.31, 0.1, 0.34], stripe % 2 ? cream : dark, [0, 0.47 + stripe * 0.18, -0.64 + stripe * 0.035], undefined, `${prefix}-neck-band-${stripe + 1}`).rotation.x = -0.18;
    const head = pivotBox([0.56, 0.46, 0.6], bodyMaterial, [0, 1.1, -0.76], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.38, 0.22, 0.38], cream, [0, -0.13, -0.44], undefined, `${prefix}-muzzle`);
    add(head, [0.1, 0.065, 0.05], dark, [0, -0.08, -0.66], undefined, `${prefix}-nose`);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.075, 0.075, 0.04], eyeMaterial, [side * 0.17, 0.09, -0.36], undefined, `${prefix}-${sideName}-eye`);
      const ear = childPivot(head, `${prefix}-${sideName}-ear-pivot`, [side * 0.22, 0.18, -0.04]);
      ear.userData.side = side;
      add(ear, [0.45, 0.12, 0.36], accentMaterial, [side * 0.18, 0.03, 0], undefined, `${prefix}-${sideName}-sunshade-ear`).rotation.z = side * -0.28;
      add(ear, [0.27, 0.055, 0.22], cream, [side * 0.22, 0.03, -0.08], undefined, `${prefix}-${sideName}-ear-flash`).rotation.z = side * -0.28;
      add(head, [0.09, 0.32, 0.09], dark, [side * 0.11, 0.34, 0], undefined, `${prefix}-${sideName}-ossicone`);
      add(head, [0.15, 0.1, 0.15], sun, [side * 0.11, 0.52, 0], undefined, `${prefix}-${sideName}-sun-cap`).rotation.y = Math.PI / 4;
    }
    groundedQuadrupedLegs(prefix, "sunstep-grazer", 0.27, -0.33, 0.43, -0.03, 0.14, cream, dark, [0.18, 0.11, 0.25]);
    for (let mark = 0; mark < 6; mark += 1) {
      const side = mark % 2 ? 1 : -1;
      add(visual, [0.13, 0.08, 0.22], mark % 3 ? dark : cream, [side * 0.38, 0.26 + (mark % 3) * 0.13, -0.32 + Math.floor(mark / 2) * 0.35], undefined, `${prefix}-flank-mark-${mark + 1}`).rotation.z = side * 0.12;
    }
    const tail = pivotBox([0.12, 0.13, 0.62], dark, [0, 0.32, 0.81], [0, 0, 0.29], "body", `${prefix}-tail-root`);
    tail.rotation.x = -0.3;
    add(tail, [0.24, 0.28, 0.28], cream, [0, -0.08, 0.61], undefined, `${prefix}-tail-fan`);
  };

  const buildMistmane = () => {
    const prefix = "mistmane";
    const mist = material(0xdff4ef, false, 0.78);
    const mistGlow = material(0xc7fff1, true, 0.7);
    const hoof = material(0x456762);
    visual.userData.wildlifeRig = "mistmane";
    add(visual, [0.82, 0.68, 1.2], bodyMaterial, [0, 0.22, 0.12], "body", `${prefix}-slender-body`);
    add(visual, [0.66, 0.72, 0.46], accentMaterial, [0, 0.36, -0.39], undefined, `${prefix}-cloud-chest`);
    add(visual, [0.62, 0.58, 0.48], bodyMaterial, [0, 0.26, 0.5], undefined, `${prefix}-haunch`);
    add(visual, [0.28, 0.78, 0.3], accentMaterial, [0, 0.72, -0.53], "body", `${prefix}-arched-neck`).rotation.x = -0.18;
    const head = pivotBox([0.56, 0.46, 0.58], bodyMaterial, [0, 0.98, -0.72], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.36, 0.22, 0.4], mist, [0, -0.13, -0.43], undefined, `${prefix}-pale-muzzle`);
    add(head, [0.09, 0.06, 0.05], hoof, [0, -0.08, -0.66], undefined, `${prefix}-nose`);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.07, 0.07, 0.04], eyeMaterial, [side * 0.17, 0.08, -0.35], undefined, `${prefix}-${sideName}-eye`);
      const ear = childPivot(head, `${prefix}-${sideName}-ear-pivot`, [side * 0.18, 0.2, -0.02]);
      ear.userData.side = side;
      add(ear, [0.18, 0.38, 0.15], accentMaterial, [side * 0.03, 0.15, 0], undefined, `${prefix}-${sideName}-glass-ear`).rotation.z = side * -0.18;
    }
    groundedQuadrupedLegs(prefix, "mistmane", 0.26, -0.31, 0.41, -0.06, 0.14, bodyMaterial, hoof, [0.21, 0.1, 0.28]);
    const targetFootY = 0.5 - MOB_DEFS.mistmane.footOffset;
    for (const positionName of ["front-left", "front-right", "rear-left", "rear-right"]) {
      const leg = visual.getObjectByName(`${prefix}-${positionName}-leg-pivot`);
      if (leg) add(leg, [0.28, 0.28, 0.28], mist, [0, targetFootY - leg.position.y + 0.14, 0], undefined, `${prefix}-${positionName}-mist-feather`);
    }
    const maneRoot = childPivot(visual, `${prefix}-mane-root-pivot`, [-0.18, 0.83, -0.38]);
    for (let lock = 0; lock < 7; lock += 1) {
      const cloud = add(maneRoot, [0.25 + (lock % 2) * 0.08, 0.34, 0.24], lock % 3 ? mist : mistGlow, [(lock % 2 ? 1 : -1) * 0.07, -lock * 0.11, lock * 0.14], undefined, `${prefix}-mane-cloud-${lock + 1}`);
      cloud.rotation.z = (lock % 2 ? 1 : -1) * 0.16;
    }
    const tail = pivotBox([0.28, 0.3, 0.78], mist, [0, 0.36, 0.71], [0, 0.05, 0.35], "body", `${prefix}-tail-root`);
    tail.rotation.x = 0.44;
    add(tail, [0.38, 0.44, 0.46], mistGlow, [0, 0.24, 0.72], undefined, `${prefix}-fog-tail-tip`).rotation.x = 0.3;
  };

  const buildBurrowbell = () => {
    const prefix = "burrowbell";
    const cream = material(0xe5c590);
    const claw = material(0x6b4a35);
    const bell = material(0xd4a65f);
    const targetFootY = 0.5 - MOB_DEFS.burrowbell.footOffset;
    visual.userData.wildlifeRig = "burrowbell";
    add(visual, [0.76, 0.62, 0.88], bodyMaterial, [0, -0.01, 0.1], "body", `${prefix}-round-body`);
    add(visual, [0.58, 0.48, 0.5], cream, [0, -0.05, -0.28], undefined, `${prefix}-bib`);
    add(visual, [0.66, 0.54, 0.54], accentMaterial, [0, 0.26, -0.47], "head", `${prefix}-cheeked-head`);
    add(visual, [0.38, 0.24, 0.32], cream, [0, 0.12, -0.82], undefined, `${prefix}-muzzle`);
    add(visual, [0.1, 0.07, 0.05], claw, [0, 0.17, -1.01], undefined, `${prefix}-nose`);
    eyePair(0.19, 0.36, -0.76, 0.075, prefix);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(visual, [0.22, 0.25, 0.17], darkMaterial, [side * 0.23, 0.61, -0.45], undefined, `${prefix}-${sideName}-ear`).rotation.z = side * -0.18;
      add(visual, [0.11, 0.14, 0.07], cream, [side * 0.23, 0.61, -0.54], undefined, `${prefix}-${sideName}-inner-ear`).rotation.z = side * -0.18;
      const arm = pivotBox([0.17, 0.42, 0.18], accentMaterial, [side * 0.22, 0.1, -0.37], [0, -0.2, -0.04], "arms", `${prefix}-${sideName}-digging-arm`);
      arm.userData.side = side;
      arm.userData.phase = side < 0 ? 0 : Math.PI;
      add(arm, [0.3, 0.12, 0.34], claw, [side * 0.03, -0.43, -0.1], undefined, `${prefix}-${sideName}-digging-paw`);
      for (let digit = 0; digit < 3; digit += 1) add(arm, [0.055, 0.055, 0.19], cream, [side * (-0.08 + digit * 0.08), -0.46, -0.28], undefined, `${prefix}-${sideName}-claw-${digit + 1}`);
      const hind = pivotBox([0.28, 0.32, 0.42], darkMaterial, [side * 0.29, -0.16, 0.34], [0, -0.14, 0.02], "legs", `${prefix}-${sideName}-hind-leg`);
      hind.userData.phase = side < 0 ? 0 : Math.PI;
      add(hind, [0.36, 0.12, 0.48], claw, [0, targetFootY + 0.06 + 0.16, -0.14], undefined, `${prefix}-${sideName}-hind-foot`);
      for (let whisker = 0; whisker < 3; whisker += 1) add(visual, [0.42, 0.02, 0.02], cream, [side * 0.34, 0.15 + whisker * 0.07, -0.91], undefined, `${prefix}-${sideName}-whisker-${whisker + 1}`).rotation.z = side * (-0.12 + whisker * 0.12);
    }
    const tail = pivotBox([0.42, 0.44, 0.5], bell, [0, 0.05, 0.62], [0, 0.08, 0.2], "body", `${prefix}-tail-root`);
    tail.rotation.x = 0.3;
    add(tail, [0.3, 0.25, 0.3], cream, [0, 0.1, 0.48], undefined, `${prefix}-hollow-bell-tip`);
    add(tail, [0.09, 0.12, 0.09], claw, [0, -0.04, 0.64], undefined, `${prefix}-bell-clapper`);
  };

  const buildDewbackTapir = () => {
    const prefix = "dewback-tapir";
    const saddle = material(0xb99f78);
    const dark = material(0x392d2a);
    const leaf = material(0x5f8a68);
    const dew = material(0xb9fff2, true, 0.74);
    visual.userData.wildlifeRig = "tapir";
    add(visual, [1.16, 0.8, 1.58], bodyMaterial, [0, 0.13, 0.16], "body", `${prefix}-barrel`);
    add(visual, [1.08, 0.72, 0.66], accentMaterial, [0, 0.18, -0.42], undefined, `${prefix}-shoulder`);
    add(visual, [0.98, 0.65, 0.62], bodyMaterial, [0, 0.15, 0.62], undefined, `${prefix}-haunch`);
    add(visual, [0.88, 0.2, 0.92], saddle, [0, 0.57, 0.13], undefined, `${prefix}-pale-saddle`);
    add(visual, [0.72, 0.56, 0.68], accentMaterial, [0, 0.37, -0.85], "head", `${prefix}-head`);
    const trunkRoot = childPivot(visual, `${prefix}-trunk-root-pivot`, [0, 0.28, -1.12]);
    add(trunkRoot, [0.42, 0.36, 0.58], saddle, [0, -0.03, -0.25], undefined, `${prefix}-upper-trunk`);
    const trunkTip = childPivot(trunkRoot, `${prefix}-trunk-tip-pivot`, [0, -0.1, -0.52]);
    add(trunkTip, [0.31, 0.28, 0.5], saddle, [0, -0.08, -0.2], undefined, `${prefix}-flexible-trunk-tip`);
    add(trunkTip, [0.21, 0.1, 0.09], dark, [0, -0.08, -0.47], undefined, `${prefix}-nostrils`);
    eyePair(0.23, 0.52, -1.18, 0.075, prefix);
    for (const side of [-1, 1]) {
      const ear = childPivot(visual, `${prefix}-${side < 0 ? "left" : "right"}-ear-pivot`, [side * 0.28, 0.66, -0.78]);
      ear.userData.side = side;
      add(ear, [0.28, 0.44, 0.2], dark, [side * 0.03, 0.16, 0], undefined, `${prefix}-${side < 0 ? "left" : "right"}-leaf-ear`).rotation.z = side * -0.26;
      add(ear, [0.12, 0.25, 0.08], saddle, [side * 0.03, 0.16, -0.12], undefined, `${prefix}-${side < 0 ? "left" : "right"}-inner-ear`);
    }
    groundedQuadrupedLegs(prefix, "dewback-tapir", 0.4, -0.36, 0.5, -0.18, 0.25, darkMaterial, dark, [0.37, 0.14, 0.44]);
    const targetFootY = 0.5 - MOB_DEFS["dewback-tapir"].footOffset;
    for (const positionName of ["front-left", "front-right", "rear-left", "rear-right"]) {
      const leg = visual.getObjectByName(`${prefix}-${positionName}-leg-pivot`);
      if (!leg) continue;
      for (let toe = -1; toe <= 1; toe += 1) add(leg, [0.09, 0.06, 0.27], saddle, [toe * 0.1, targetFootY - leg.position.y + 0.03, -0.22], undefined, `${prefix}-${positionName}-toe-${toe + 2}`).rotation.y = toe * -0.14;
    }
    for (let leafIndex = 0; leafIndex < 4; leafIndex += 1) {
      const leafNode = add(visual, [0.34, 0.06, 0.2], leaf, [-0.3 + leafIndex * 0.2, 0.71, -0.12 + (leafIndex % 2) * 0.35], undefined, `${prefix}-saddle-leaf-${leafIndex + 1}`);
      leafNode.rotation.y = -0.5 + leafIndex * 0.32;
      add(visual, [0.1, 0.09, 0.1], dew, [-0.3 + leafIndex * 0.2, 0.79, -0.12 + (leafIndex % 2) * 0.35], undefined, `${prefix}-dew-bead-${leafIndex + 1}`).rotation.y = Math.PI / 4;
    }
    const tail = pivotBox([0.16, 0.18, 0.5], dark, [0, 0.38, 0.96], [0, 0, 0.23], "body", `${prefix}-tail-root`);
    tail.rotation.x = -0.28;
  };

  const buildSlatefin = () => {
    const prefix = "deepwater-shark";
    const slate = material(0x2e4352);
    const pale = material(0xc8d3d1);
    const mouth = material(0x4a2529);
    const tooth = material(0xf1eee3);
    visual.userData.wildlifeRig = "shark";
    add(visual, [0.92, 0.72, 1.58], bodyMaterial, [0, 0, -0.08], "body", `${prefix}-torpedo-body`);
    add(visual, [0.78, 0.6, 0.92], accentMaterial, [0, -0.02, -1.12], "head", `${prefix}-wedge-head`);
    add(visual, [0.62, 0.34, 0.6], slate, [0, 0.05, -1.7], undefined, `${prefix}-slate-snout`);
    add(visual, [0.58, 0.16, 0.16], mouth, [0, -0.24, -1.98], undefined, `${prefix}-mouth`);
    for (const side of [-1, 1]) {
      add(visual, [0.085, 0.085, 0.04], eyeMaterial, [side * 0.29, 0.14, -1.92], undefined, `${prefix}-${side < 0 ? "left" : "right"}-eye`);
      for (let gill = 0; gill < 3; gill += 1) add(visual, [0.035, 0.28, 0.08], mouth, [side * 0.4, -0.02, -1.28 + gill * 0.16], undefined, `${prefix}-${side < 0 ? "left" : "right"}-gill-${gill + 1}`).rotation.x = 0.16;
      const fin = pivotBox([0.98, 0.1, 0.72], slate, [side * 0.38, -0.12, -0.28], [side * 0.44, -0.04, 0.08], "wings", `${prefix}-${side < 0 ? "left" : "right"}-pectoral-fin`);
      fin.userData.side = side;
      fin.rotation.z = side * -0.24;
      fin.rotation.y = side * -0.2;
      for (let toothIndex = 0; toothIndex < 4; toothIndex += 1) add(visual, [0.07, 0.14, 0.07], tooth, [side * (0.08 + toothIndex * 0.07), -0.28, -2.08], undefined, `${prefix}-${side < 0 ? "left" : "right"}-tooth-${toothIndex + 1}`).rotation.x = 0.2;
    }
    add(visual, [0.66, 0.18, 1.42], pale, [0, -0.36, -0.34], undefined, `${prefix}-pale-belly`);
    for (let band = 0; band < 4; band += 1) add(visual, [0.96 - band * 0.08, 0.06, 0.18], slate, [0, 0.38 - band * 0.02, -0.55 + band * 0.38], undefined, `${prefix}-slate-band-${band + 1}`).rotation.y = (band % 2 ? 1 : -1) * 0.08;
    add(visual, [0.16, 0.94, 0.78], slate, [0, 0.6, -0.05], undefined, `${prefix}-dorsal-fin`).rotation.x = 0.12;
    const tailRoot = childPivot(visual, `${prefix}-tail-root-pivot`, [0, 0, 0.72]);
    add(tailRoot, [0.64, 0.52, 1.08], bodyMaterial, [0, 0, 0.48], undefined, `${prefix}-tail-stock`);
    const tailMid = childPivot(tailRoot, `${prefix}-tail-mid-pivot`, [0, 0, 0.96]);
    add(tailMid, [0.34, 0.32, 0.66], slate, [0, 0, 0.28], undefined, `${prefix}-tail-peduncle`);
    add(tailMid, [0.18, 1.28, 0.76], slate, [0, 0, 0.72], undefined, `${prefix}-crescent-tail`);
    add(tailMid, [0.24, 0.58, 0.52], pale, [0, -0.22, 0.75], undefined, `${prefix}-tail-lower-lobe`);
  };

  const buildTidepup = () => {
    const prefix = "tidepup";
    const pale = material(0xcaf0d8);
    const dark = material(0x153b4b);
    const glow = material(0xbaf8f0, true, 0.78);
    visual.userData.wildlifeRig = "tidepup";
    add(visual, [0.82, 0.58, 1.28], bodyMaterial, [0, 0, 0.12], "body", `${prefix}-seal-body`);
    add(visual, [0.7, 0.56, 0.58], accentMaterial, [0, 0.08, -0.49], undefined, `${prefix}-chest`);
    add(visual, [0.64, 0.52, 0.56], bodyMaterial, [0, 0.02, 0.55], undefined, `${prefix}-haunch`);
    const head = pivotBox([0.72, 0.6, 0.68], accentMaterial, [0, 0.18, -0.73], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.25, 0.2, 0.31], pale, [-0.12, -0.1, -0.48], undefined, `${prefix}-left-muzzle-pad`);
    add(head, [0.25, 0.2, 0.31], pale, [0.12, -0.1, -0.48], undefined, `${prefix}-right-muzzle-pad`);
    add(head, [0.28, 0.12, 0.25], pale, [0, -0.24, -0.43], undefined, `${prefix}-chin`);
    add(head, [0.1, 0.075, 0.06], dark, [0, -0.05, -0.69], undefined, `${prefix}-nose`);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.085, 0.085, 0.04], eyeMaterial, [side * 0.22, 0.1, -0.4], undefined, `${prefix}-${sideName}-eye`);
      const ear = childPivot(head, `${prefix}-${sideName}-ear-pivot`, [side * 0.29, 0.21, -0.02]);
      ear.userData.side = side;
      add(ear, [0.36, 0.48, 0.08], dark, [side * 0.1, 0.1, 0], undefined, `${prefix}-${sideName}-ear-fin`).rotation.z = side * -0.38;
      for (let whisker = 0; whisker < 3; whisker += 1) add(head, [0.4, 0.02, 0.02], pale, [side * 0.31, -0.09 + whisker * 0.065, -0.57], undefined, `${prefix}-${sideName}-whisker-${whisker + 1}`).rotation.z = side * (-0.14 + whisker * 0.14);
      const flipper = pivotBox([0.62, 0.1, 0.62], accentMaterial, [side * 0.31, -0.13, -0.02], [side * 0.25, -0.02, 0.05], "wings", `${prefix}-${sideName}-front-flipper`);
      flipper.userData.side = side;
      flipper.rotation.z = side * -0.24;
      flipper.rotation.y = side * -0.18;
    }
    for (let spot = 0; spot < 5; spot += 1) add(visual, [0.1, 0.08, 0.1], glow, [(spot % 2 ? 1 : -1) * 0.31, 0.29, -0.31 + Math.floor(spot / 2) * 0.28], undefined, `${prefix}-bubble-spot-${spot + 1}`).rotation.y = Math.PI / 4;
    const tailRoot = childPivot(visual, `${prefix}-tail-root-pivot`, [0, 0, 0.65]);
    add(tailRoot, [0.42, 0.24, 0.82], dark, [0, 0, 0.36], undefined, `${prefix}-tail-stock`);
    const tailTip = childPivot(tailRoot, `${prefix}-tail-tip-pivot`, [0, 0, 0.75]);
    for (const side of [-1, 1]) add(tailTip, [0.56, 0.1, 0.5], side < 0 ? accentMaterial : pale, [side * 0.22, 0, 0.2], undefined, `${prefix}-${side < 0 ? "left" : "right"}-tail-fan`).rotation.z = side * -0.22;
  };

  const buildPeelop = () => {
    const prefix = "peelop";
    const cream = material(0xffefad);
    const ripe = material(0xf1ca3e);
    const green = material(0x8fa548);
    const brown = material(0x73502b);
    visual.userData.wildlifeRig = "peelop";
    add(visual, [0.76, 0.58, 0.9], bodyMaterial, [0, 0, 0.14], "body", `${prefix}-loaf-body`);
    add(visual, [0.68, 0.54, 0.52], cream, [0, 0.1, -0.33], undefined, `${prefix}-chest`);
    add(visual, [0.7, 0.54, 0.52], bodyMaterial, [0, 0.08, 0.48], undefined, `${prefix}-round-haunch`);
    const head = pivotBox([0.62, 0.56, 0.56], accentMaterial, [0, 0.25, -0.55], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.24, 0.2, 0.27], cream, [-0.11, -0.1, -0.4], undefined, `${prefix}-left-muzzle-pad`);
    add(head, [0.24, 0.2, 0.27], cream, [0.11, -0.1, -0.4], undefined, `${prefix}-right-muzzle-pad`);
    add(head, [0.08, 0.06, 0.045], brown, [0, -0.04, -0.59], undefined, `${prefix}-nose`);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.075, 0.075, 0.04], eyeMaterial, [side * 0.18, 0.09, -0.33], undefined, `${prefix}-${sideName}-eye`);
      const ear = childPivot(head, `${prefix}-${sideName}-ear-pivot`, [side * 0.18, 0.24, -0.01]);
      ear.userData.side = side;
      add(ear, [0.25, 0.82, 0.23], side < 0 ? ripe : bodyMaterial, [side * 0.05, 0.34, 0], undefined, `${prefix}-${sideName}-banana-ear`).rotation.z = side * -0.14;
      add(ear, [0.13, 0.58, 0.08], cream, [side * 0.05, 0.34, -0.14], undefined, `${prefix}-${sideName}-ear-flesh`).rotation.z = side * -0.14;
      add(ear, [0.26, 0.16, 0.24], brown, [side * 0.08, 0.78, 0], undefined, `${prefix}-${sideName}-ripe-tip`).rotation.z = side * 0.12;
    }
    groundedQuadrupedLegs(prefix, "peelop", 0.23, -0.18, 0.36, -0.1, 0.14, accentMaterial, brown, [0.23, 0.11, 0.32]);
    for (const side of [-1, 1]) {
      const peel = add(visual, [0.22, 0.08, 0.68], side < 0 ? ripe : green, [side * 0.33, 0.29, 0.05], undefined, `${prefix}-${side < 0 ? "left" : "right"}-peel-mantle`);
      peel.rotation.z = side * -0.22;
      peel.rotation.y = side * -0.1;
    }
    add(visual, [0.48, 0.08, 0.44], ripe, [0, 0.32, 0.22], undefined, `${prefix}-back-peel`).rotation.y = Math.PI / 4;
    const tail = pivotBox([0.36, 0.38, 0.4], cream, [0, 0.12, 0.69], [0, 0.08, 0.16], "body", `${prefix}-tail-root`);
    tail.rotation.x = 0.38;
  };

  const buildWarg = () => {
    const prefix = "warg";
    const ruff = material(0x2d322e);
    const road = material(0x8c6946);
    const muzzle = material(0x3d302b);
    const fang = material(0xeee2c6);
    const leather = material(0x5f3a28);
    visual.userData.wildlifeRig = "warg";
    add(visual, [1.08, 0.72, 1.66], bodyMaterial, [0, 0.18, 0.14], "body", `${prefix}-long-body`);
    add(visual, [1.0, 0.8, 0.66], ruff, [0, 0.3, -0.46], undefined, `${prefix}-shoulder-ruff`);
    add(visual, [0.92, 0.68, 0.62], bodyMaterial, [0, 0.22, 0.67], undefined, `${prefix}-haunch`);
    const head = pivotBox([0.76, 0.64, 0.72], bodyMaterial, [0, 0.55, -0.93], [0, 0, 0], "head", `${prefix}-head`);
    add(head, [0.58, 0.34, 0.58], muzzle, [0, -0.14, -0.49], undefined, `${prefix}-muzzle`);
    add(head, [0.16, 0.1, 0.08], material(0x171a19), [0, -0.08, -0.8], undefined, `${prefix}-nose`);
    add(head, [0.38, 0.12, 0.3], material(0x7d3d3c), [0, -0.32, -0.49], undefined, `${prefix}-open-mouth`);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.09, 0.09, 0.045], eyeMaterial, [side * 0.23, 0.12, -0.4], undefined, `${prefix}-${sideName}-eye`);
      add(head, [0.25, 0.09, 0.1], road, [side * 0.22, 0.23, -0.34], undefined, `${prefix}-${sideName}-brow`).rotation.z = side * -0.16;
      const ear = childPivot(head, `${prefix}-${sideName}-ear-pivot`, [side * 0.23, 0.28, -0.02]);
      ear.userData.side = side;
      add(ear, [0.25, 0.54, 0.23], ruff, [side * 0.03, 0.21, 0], undefined, `${prefix}-${sideName}-swept-ear`).rotation.z = side * -0.18;
      add(ear, [0.1, 0.32, 0.08], material(0xa87068), [side * 0.03, 0.21, -0.14], undefined, `${prefix}-${sideName}-inner-ear`);
      for (let toothIndex = 0; toothIndex < 2; toothIndex += 1) add(head, [0.08, 0.22, 0.08], fang, [side * (0.13 + toothIndex * 0.12), -0.27, -0.73 + toothIndex * 0.03], undefined, `${prefix}-${sideName}-fang-${toothIndex + 1}`).rotation.x = 0.18;
    }
    groundedQuadrupedLegs(prefix, "warg", 0.36, -0.38, 0.5, -0.12, 0.22, darkMaterial, muzzle, [0.34, 0.15, 0.46]);
    for (let slash = 0; slash < 5; slash += 1) add(visual, [0.11, 0.33, 0.2], road, [(slash % 2 ? 1 : -1) * 0.49, 0.23, -0.35 + slash * 0.28], undefined, `${prefix}-road-stripe-${slash + 1}`).rotation.z = (slash % 2 ? 1 : -1) * 0.15;
    const tailRoot = pivotBox([0.3, 0.32, 1.12], ruff, [0, 0.48, 0.9], [0, 0.08, 0.52], "body", `${prefix}-tail-root`);
    tailRoot.rotation.x = 0.48;
    const tailTip = childPivot(tailRoot, `${prefix}-tail-tip-pivot`, [0, 0.14, 0.99]);
    add(tailTip, [0.38, 0.42, 0.58], road, [0, 0.18, 0.22], undefined, `${prefix}-dust-brush-tail`).rotation.x = 0.32;
    const saddle = new THREE.Group();
    saddle.name = "warg-saddle";
    saddle.visible = false;
    visual.add(saddle);
    add(saddle, [1.0, 0.12, 0.88], leather, [0, 0.62, 0.12], undefined, `${prefix}-saddle-blanket`);
    add(saddle, [0.64, 0.3, 0.58], road, [0, 0.79, 0.12], undefined, `${prefix}-saddle-seat`);
    add(saddle, [0.1, 0.86, 0.12], leather, [-0.52, 0.28, 0.12], undefined, `${prefix}-left-girth`);
    add(saddle, [0.1, 0.86, 0.12], leather, [0.52, 0.28, 0.12], undefined, `${prefix}-right-girth`);
    add(saddle, [0.08, 0.08, 1.55], leather, [0, 0.55, -0.65], undefined, `${prefix}-bridle-rein`);
  };

  const buildDragon = (dragonKind: DragonKind) => {
    const dragonType = dragonKind.replace("-dragon", "") as "fire" | "ice" | "steel" | "sea" | "gold" | "silver";
    const prefix = dragonKind;
    const palette = dragonType === "fire"
      ? { belly: 0x5e211f, membrane: 0xc8462d, horn: 0x3b2925, glow: 0xffc657, metal: 0xb8793e, armor: 0x6f2525 }
      : dragonType === "ice"
        ? { belly: 0x416f8c, membrane: 0x92d5e8, horn: 0xe8f6f4, glow: 0xcaffff, metal: 0x9fc8d2, armor: 0x587f9a }
        : dragonType === "sea"
          ? { belly: 0x1e6576, membrane: 0x5fd6c8, horn: 0xb8f6ec, glow: 0x8affec, metal: 0x66aab3, armor: 0x326c7d }
          : dragonType === "gold"
            ? { belly: 0x765018, membrane: 0xd69a20, horn: 0xffdf68, glow: 0xfffac0, metal: 0xf1c44b, armor: 0x9b6819 }
            : dragonType === "silver"
              ? { belly: 0x48566a, membrane: 0x819ab8, horn: 0xeaf5ff, glow: 0xffffff, metal: 0xbecfe0, armor: 0x657990 }
              : { belly: 0x343f46, membrane: 0x71838c, horn: 0x232a2f, glow: 0xe4fbff, metal: 0xb8c6ca, armor: 0x46545d };
    const bellyMaterial = material(palette.belly);
    const membraneMaterial = material(palette.membrane, false, 0.86);
    const hornMaterial = material(palette.horn);
    const glowMaterial = material(palette.glow, true, 0.94);
    const metalMaterial = material(palette.metal);
    const armorMaterial = material(palette.armor);
    const leatherMaterial = material(0x5a3829);
    // Fire-only redesign materials: charred basalt hide split by molten seams.
    const isFire = dragonType === "fire";
    const charMaterial = material(0x2f1d18);
    const lavaMaterial = material(0xff7a2e, true, 0.95);
    const emberCoreMaterial = material(0xffe08a, true, 0.97);
    const amberHornMaterial = material(0xd9a355);
    const steelDarkMaterial = material(0x273238);
    const steelPlateMaterial = material(0x8b989e);
    const brassRivetMaterial = material(0xb98b4c);
    const seaGlassMaterial = material(0x8ff3e4, false, 0.72);
    const reefMaterial = material(0xd58d72);
    const goldShadowMaterial = material(0x53350c);
    const goldPlateMaterial = material(0xd99e21);
    const sunwhiteMaterial = material(0xfff7b2, true, 0.98);
    const silverShadowMaterial = material(0x2f3a4b);
    const silverPlateMaterial = material(0xa9bed3);
    const moonwhiteMaterial = material(0xf5fbff, true, 0.97);
    const starlightMaterial = material(0xb9dcff, true, 0.92);
    const youngIceCrystalMaterial = material(0xd9f3fb, false, 0.72);
    const youngIceRimeMaterial = material(0xf2fafd);
    const youngIceAuroraMaterial = material(0x9beedd, false, 0.55);

    group.userData.dragonType = dragonType;
    visual.userData.dragonType = dragonType;
    group.userData.dragonSex = id % 2 === 0 ? "female" : "male";
    visual.userData.dragonSex = group.userData.dragonSex;
    group.userData.animatedRig = "dragon-v1";

    const pivot = (parent: THREE.Object3D, suffix: string, position: readonly [number, number, number]) => {
      const node = new THREE.Group();
      node.name = `${prefix}-${suffix}-pivot`;
      node.position.set(...position);
      node.userData.mobId = id;
      node.userData.dragonRigPart = suffix;
      parent.add(node);
      return node;
    };
    const rigBox = (
      parent: THREE.Object3D,
      suffix: string,
      size: [number, number, number],
      meshMaterial: THREE.Material,
      position: [number, number, number],
      rotation: [number, number, number] = [0, 0, 0],
    ) => {
      const mesh = add(parent, size, meshMaterial, position, undefined, `${prefix}-${suffix}`);
      mesh.rotation.set(...rotation);
      mesh.userData.dragonRigPart = suffix;
      return mesh;
    };
    const attachment = (suffix: string, parent: THREE.Object3D = visual) => {
      const node = new THREE.Group();
      node.name = `${prefix}-${suffix}`;
      node.userData.mobId = id;
      node.userData.dragonAttachment = suffix;
      node.visible = false;
      parent.add(node);
      return node;
    };

    const artDirectAdultVariant = (form: THREE.Group, variant: DragonVariantId) => {
      const profile = DRAGON_VARIANT_SILHOUETTES[variant];
      form.name = `${prefix}-adult-${variant}-form`;
      form.userData.dragonVariant = variant;
      form.userData.variantMotif = profile.motif;
      form.traverse((object) => {
        const local = object.name.startsWith(`${prefix}-`) ? object.name.slice(prefix.length + 1) : object.name;
        if (/head-pivot$/u.test(local)) object.scale.multiplyScalar(profile.head);
        if (/neck-\d+-pivot$/u.test(local)) {
          object.position.z *= profile.neck;
          object.scale.z *= profile.neck;
        }
        if (/wing-root-pivot$/u.test(local)) {
          object.position.x *= profile.stance;
          object.scale.x *= profile.wing[0];
          object.scale.z *= profile.wing[1];
        }
        if (/(?:front|rear)-(?:left|right)-hip-pivot$/u.test(local)) {
          object.position.x *= profile.stance;
          object.scale.y *= profile.leg;
        }
        if (/tail-1-pivot$/u.test(local)) object.scale.z *= profile.tail;
        if (object instanceof THREE.Mesh) {
          if (/chest$|haunch|pelvis|waist|shoulder-mantle|shoulder-hump/u.test(local)) {
            object.scale.x *= profile.body[0];
            object.scale.y *= profile.body[1];
            object.scale.z *= profile.body[2];
          }
          if (/snout|muzzle|brow/u.test(local)) object.scale.x *= Math.sqrt(profile.head);
          if (/wing-membrane|wing-sail|aurora-veil|flight-feather|mirror-wing-blade/u.test(local)) object.scale.z *= profile.wing[1];
          if (/upper-leg|lower-leg/u.test(local)) object.scale.y *= profile.leg;
        }
      });

      // Lineage signatures remain cuboid and attach to the adult form so they
      // inherit world scale while never interfering with rig lookup.
      const signature = (suffix: string, size: [number, number, number], position: [number, number, number], rotation: [number, number, number] = [0, 0, 0], mat: THREE.Material = accentMaterial) =>
        rigBox(form, `${variant}-signature-${suffix}`, size, mat, position, rotation);
      if (profile.motif === "coil") {
        for (let index = 0; index < 7; index += 1) signature(`ribbon-keel-${index + 1}`, [.12, .46 + Math.sin(index / 6 * Math.PI) * .48, .38], [0, 2.7, -1.15 + index * .52], [-.28, 0, index % 2 ? .12 : -.12], index % 2 ? glowMaterial : accentMaterial);
      } else if (profile.motif === "crest" || profile.motif === "plume") {
        for (let index = 0; index < 6; index += 1) signature(`mane-${index + 1}`, [.18 + (profile.motif === "plume" ? .16 : 0), .62 + Math.sin(index / 5 * Math.PI) * .62, .34], [(index % 2 ? 1 : -1) * .08, 2.85, -1.2 + index * .58], [-.26, 0, index % 2 ? .16 : -.16], index % 2 ? hornMaterial : glowMaterial);
      } else if (profile.motif === "crown" || profile.motif === "reef" || profile.motif === "idol") {
        for (let index = -2; index <= 2; index += 1) signature(`crown-${index + 3}`, [.16 + (profile.motif === "idol" ? .12 : 0), .7 + (2 - Math.abs(index)) * .24, .18], [index * .28, 3.42 + (2 - Math.abs(index)) * .08, -3.68], [-.24, 0, index * .18], index === 0 ? glowMaterial : profile.motif === "reef" ? reefMaterial : hornMaterial);
      } else if (profile.motif === "manta") {
        for (const side of [-1, 1]) for (let ray = 0; ray < 4; ray += 1) signature(`${side < 0 ? "left" : "right"}-royal-ray-${ray + 1}`, [1.25 + ray * .3, .06, 1.15 + ray * .24], [side * (1.35 + ray * .64), 2.44, -.1 + ray * .42], [.02, side * (.12 + ray * .08), side * -.1], ray % 2 ? seaGlassMaterial : membraneMaterial);
      } else if (profile.motif === "gear" || profile.motif === "anvil" || profile.motif === "razor") {
        for (let index = 0; index < 6; index += 1) signature(`back-plate-${index + 1}`, [profile.motif === "anvil" ? .72 : .22, .38 + index % 3 * .16, .46], [0, 2.9 + index % 2 * .08, -1.08 + index * .58], [-.22, 0, index % 2 ? .18 : -.18], index % 2 ? steelPlateMaterial : brassRivetMaterial);
      } else if (profile.motif === "kite" || profile.motif === "roc") {
        for (const side of [-1, 1]) for (let feather = 0; feather < 5; feather += 1) signature(`${side < 0 ? "left" : "right"}-flight-banner-${feather + 1}`, [.3, .08, 1.4 + feather * .2], [side * (2.0 + feather * .52), 2.24, .55 + feather * .22], [.08, side * (.12 + feather * .04), side * -.06], feather % 2 ? hornMaterial : glowMaterial);
      } else if (profile.motif === "hart") {
        for (const side of [-1, 1]) for (let tine = 0; tine < 4; tine += 1) signature(`${side < 0 ? "left" : "right"}-moon-antler-${tine + 1}`, [.13, .62 + tine * .18, .15], [side * (.42 + tine * .2), 3.54 + tine * .12, -3.32 + tine * .16], [-.4, side * .12, side * (.25 + tine * .08)], tine % 2 ? moonwhiteMaterial : silverPlateMaterial);
      } else if (profile.motif === "moth") {
        for (const side of [-1, 1]) {
          signature(`${side < 0 ? "left" : "right"}-feeler`, [.1, .86, .12], [side * .36, 3.58, -3.62], [-.46, side * .12, side * .28], moonwhiteMaterial);
          for (let spot = 0; spot < 4; spot += 1) signature(`${side < 0 ? "left" : "right"}-moth-eye-${spot + 1}`, [.28 + spot * .06, .07, .28 + spot * .06], [side * (1.5 + spot * .72), 2.28, .35 + spot * .48], [0, 0, Math.PI / 4], spot % 2 ? starlightMaterial : moonwhiteMaterial);
        }
      } else if (profile.motif === "fang" || profile.motif === "crescent") {
        for (const side of [-1, 1]) for (let blade = 0; blade < 3; blade += 1) signature(`${side < 0 ? "left" : "right"}-blade-${blade + 1}`, [.14, .62 + blade * .22, .18], [side * (.48 + blade * .25), 3.44 + blade * .18, -3.52 + blade * .2], [-.38, side * .12, side * (.28 + blade * .1)], blade === 2 ? glowMaterial : hornMaterial);
      }
    };

    /** Builds the compact, big-eyed silhouette used only during Stages 1-2. */
    const buildYoungDragonForm = (stage: 1 | 2) => {
      const formName = stage === 1 ? "hatchling" : "fledgling";
      const form = new THREE.Group();
      form.name = `${prefix}-stage-${stage}-form`;
      form.visible = false;
      form.userData.dragonFormStage = stage;
      form.userData.shoulderCarryCompatible = stage === 1;
      visual.add(form);
      const s = stage === 1 ? 0.9 : 1.12;
      const hatchling = stage === 1;
      const youngShape = hatchling ? {
        chest: [1.38, 0.94, 1.42], haunch: [1.18, 0.78, 0.9], neck: [0.78, 0.56, 0.68],
        head: [1.24, 0.94, 0.88], snout: [0.72, 0.42, 0.58], eye: [0.25, 0.28, 0.08],
        wingUpper: 0.98, wingTip: 0.72, wingDepth: 0.82, legLength: 0.5, paw: [0.54, 0.18, 0.52], tailSegments: 3,
      } : {
        chest: [1.16, 0.78, 1.96], haunch: [1.0, 0.68, 1.12], neck: [0.62, 0.66, 1.12],
        head: [1.02, 0.72, 1.08], snout: [0.58, 0.32, 0.9], eye: [0.17, 0.2, 0.07],
        wingUpper: 1.56, wingTip: 1.24, wingDepth: 1.36, legLength: 0.7, paw: [0.42, 0.14, 0.48], tailSegments: 4,
      };
      const youngPivot = (suffix: string, position: readonly [number, number, number]) => pivot(form, `${formName}-${suffix}`, position);
      const youngBox = (
        parent: THREE.Object3D,
        suffix: string,
        size: [number, number, number],
        meshMaterial: THREE.Material,
        position: [number, number, number],
        rotation: [number, number, number] = [0, 0, 0],
      ) => rigBox(parent, `${formName}-${suffix}`, size, meshMaterial, position, rotation);

      const chest = youngPivot("chest", [0, 1.02 * s, 0]);
      youngBox(chest, "round-chest", youngShape.chest.map((value) => value * s) as [number, number, number], bodyMaterial, [0, 0, 0]);
      youngBox(chest, "soft-belly", [youngShape.chest[0] * 0.58 * s, 0.2 * s, youngShape.chest[2] * 0.84 * s], bellyMaterial, [0, -youngShape.chest[1] * 0.48 * s, -0.05 * s]);
      youngBox(chest, "heart-mark", [0.28 * s, 0.26 * s, 0.07 * s], glowMaterial, [0, -0.1 * s, -youngShape.chest[2] * 0.49 * s], [0, 0, Math.PI / 4]);
      youngBox(form, "pear-haunch", youngShape.haunch.map((value) => value * s) as [number, number, number], accentMaterial, [0, 0.97 * s, youngShape.chest[2] * 0.44 * s]);
      youngBox(form, "neck-bridge", youngShape.neck.map((value) => value * s) as [number, number, number], bodyMaterial, [0, 1.28 * s, -youngShape.chest[2] * 0.47 * s], [hatchling ? -0.32 : -0.18, 0, 0]);

      if (!hatchling) for (let crest = 0; crest < 3; crest += 1) {
        const adolescentCrest = youngBox(form, `adolescent-back-crest-${crest + 1}`, [0.1 * s, (0.3 + crest * 0.08) * s, 0.26 * s], crest === 1 ? glowMaterial : accentMaterial, [0, (1.54 + crest * 0.05) * s, (-0.32 + crest * 0.55) * s], [-0.24, 0, 0]);
        adolescentCrest.userData.dragonIdleAccent = true;
        adolescentCrest.userData.dragonIdlePhase = crest * 0.7;
      }

      const head = youngPivot("head", [0, (hatchling ? 1.62 : 1.7) * s, -(hatchling ? 1.04 : 1.36) * s]);
      youngBox(head, "oversize-head", youngShape.head.map((value) => value * s) as [number, number, number], bodyMaterial, [0, 0, -0.12 * s]);
      youngBox(head, "baby-brow", [youngShape.head[0] * 1.03 * s, 0.15 * s, youngShape.head[2] * 0.5 * s], accentMaterial, [0, youngShape.head[1] * 0.37 * s, -youngShape.head[2] * 0.36 * s], [-0.08, 0, 0]);
      youngBox(head, "button-snout", youngShape.snout.map((value) => value * s) as [number, number, number], bellyMaterial, [0, -0.13 * s, -(youngShape.head[2] * 0.43 + youngShape.snout[2] * 0.47) * s]);
      const jaw = pivot(head, `${formName}-jaw`, [0, -0.3 * s, -0.44 * s]);
      youngBox(jaw, "lower-jaw", [0.6 * s, 0.15 * s, 0.58 * s], bellyMaterial, [0, 0, -0.25 * s]);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const eye = youngBox(head, `${sideName}-wide-eye`, youngShape.eye.map((value) => value * s) as [number, number, number], eyeMaterial, [side * youngShape.head[0] * 0.27 * s, 0.08 * s, -youngShape.head[2] * 0.62 * s]);
        eye.userData.dragonIdleAccent = true;
        eye.userData.dragonIdlePhase = side < 0 ? 0.4 : 2.2;
        youngBox(head, `${sideName}-eye-glint`, [0.07 * s, 0.07 * s, 0.035 * s], material(0xffffff, true), [side * youngShape.head[0] * 0.24 * s, 0.14 * s, -youngShape.head[2] * 0.67 * s]);
        youngBox(head, `${sideName}-nostril`, [0.055 * s, 0.045 * s, 0.035 * s], hornMaterial, [side * youngShape.snout[0] * 0.26 * s, -0.1 * s, -(youngShape.head[2] * 0.43 + youngShape.snout[2] * 0.98) * s]);
      }

      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const wing = youngPivot(`${sideName}-wing`, [side * 0.52 * s, 1.42 * s, -0.25 * s]);
        youngBox(wing, `${sideName}-wing-arm`, [youngShape.wingUpper * s, 0.14 * s, 0.18 * s], hornMaterial, [side * youngShape.wingUpper * 0.46 * s, 0, 0], [0, 0, side * -0.12]);
        youngBox(wing, `${sideName}-inner-sail`, [youngShape.wingUpper * 0.9 * s, 0.04 * s, youngShape.wingDepth * s], membraneMaterial, [side * youngShape.wingUpper * 0.4 * s, -0.04 * s, youngShape.wingDepth * 0.38 * s], [0.03, side * 0.13, side * -0.11]);
        const wingTip = pivot(wing, `${formName}-${sideName}-wing-tip`, [side * youngShape.wingUpper * 0.88 * s, 0, 0]);
        youngBox(wingTip, `${sideName}-wing-tip-bone`, [youngShape.wingTip * s, 0.12 * s, 0.15 * s], hornMaterial, [side * youngShape.wingTip * 0.43 * s, 0, 0.12 * s], [0, side * -0.1, side * -0.2]);
        youngBox(wingTip, `${sideName}-outer-sail`, [youngShape.wingTip * 0.9 * s, 0.038 * s, youngShape.wingDepth * 0.78 * s], membraneMaterial, [side * youngShape.wingTip * 0.38 * s, -0.05 * s, youngShape.wingDepth * 0.36 * s], [0.02, side * -0.17, side * -0.18]);
        youngBox(wingTip, `${sideName}-wing-finger`, [0.1 * s, 0.08 * s, youngShape.wingDepth * 0.72 * s], hornMaterial, [side * youngShape.wingTip * 0.58 * s, -0.02 * s, youngShape.wingDepth * 0.42 * s], [0, side * 0.24, side * -0.12]);
      }

      for (const [front, z] of [[true, -0.48], [false, 0.56]] as const) {
        for (const side of [-1, 1]) {
          const sideName = side < 0 ? "left" : "right";
          const positionName = `${front ? "front" : "rear"}-${sideName}`;
          const leg = youngPivot(`${positionName}-leg`, [side * 0.42 * s, 0.82 * s, z * s]);
          if (hatchling) {
            // Stage I retains the compact single-joint limb that sits cleanly
            // on a player's shoulder and matches its established idle pose.
            youngBox(leg, `${positionName}-soft-leg`, [0.28 * s, youngShape.legLength * s, 0.32 * s], front ? bodyMaterial : accentMaterial, [0, -youngShape.legLength * 0.46 * s, 0]);
            youngBox(leg, `${positionName}-paw`, youngShape.paw.map((value) => value * s) as [number, number, number], bellyMaterial, [0, -youngShape.legLength * 0.92 * s, -0.13 * s]);
            for (const toe of [-1, 1]) youngBox(leg, `${positionName}-toe-${toe < 0 ? "inner" : "outer"}`, [0.08 * s, 0.08 * s, 0.28 * s], hornMaterial, [toe * youngShape.paw[0] * 0.24 * s, -youngShape.legLength * 0.98 * s, -youngShape.paw[2] * 0.72 * s], [0.08, toe * -0.08, 0]);
          } else {
            const upperLength = youngShape.legLength * 0.52 * s;
            const lowerLength = youngShape.legLength * 0.42 * s;
            youngBox(leg, `${positionName}-soft-leg`, [0.3 * s, upperLength, 0.34 * s], front ? bodyMaterial : accentMaterial, [0, -upperLength * 0.46, front ? -0.025 * s : 0.025 * s]);
            const knee = pivot(leg, `${formName}-${positionName}-knee`, [0, -upperLength * 0.9, front ? -0.04 * s : 0.04 * s]);
            youngBox(knee, `${positionName}-soft-calf`, [0.24 * s, lowerLength, 0.28 * s], front ? accentMaterial : bodyMaterial, [0, -lowerLength * 0.46, 0]);
            youngBox(knee, `${positionName}-knee-cap`, [0.34 * s, 0.2 * s, 0.38 * s], accentMaterial, [0, -0.04 * s, front ? -0.04 * s : 0.04 * s]);
            const claw = pivot(knee, `${formName}-${positionName}-claw`, [0, -lowerLength * 0.9, -0.03 * s]);
            youngBox(claw, `${positionName}-paw`, youngShape.paw.map((value) => value * s) as [number, number, number], bellyMaterial, [0, -0.05 * s, -0.13 * s]);
            for (const toe of [-1, 1]) youngBox(claw, `${positionName}-toe-${toe < 0 ? "inner" : "outer"}`, [0.08 * s, 0.08 * s, 0.28 * s], hornMaterial, [toe * youngShape.paw[0] * 0.24 * s, -0.07 * s, -youngShape.paw[2] * 0.72 * s], [0.08, toe * -0.08, 0]);
          }
        }
      }

      let youngTailParent: THREE.Object3D = form;
      for (let segment = 1; segment <= youngShape.tailSegments; segment += 1) {
        const tail = pivot(youngTailParent, `${formName}-tail-${segment}`, segment === 1 ? [0, 1.05 * s, 0.73 * s] : [0, 0, 0.5 * s]);
        youngBox(tail, `tail-${segment}`, [Math.max(0.18, (0.68 - segment * 0.11) * s), Math.max(0.16, (0.5 - segment * 0.08) * s), 0.68 * s], segment % 2 ? bodyMaterial : accentMaterial, [0, 0, 0.28 * s]);
        youngTailParent = tail;
      }

      if (dragonType === "fire") {
        youngBox(chest, "ember-bib", [0.5 * s, 0.1 * s, 0.72 * s], lavaMaterial, [0, -0.5 * s, -0.12 * s]);
        for (let flame = 0; flame < 3; flame += 1) {
          const tuft = youngBox(head, `ember-tuft-${flame + 1}`, [0.12 * s, (0.42 + flame * 0.09) * s, 0.14 * s], flame === 1 ? emberCoreMaterial : lavaMaterial, [(flame - 1) * 0.18 * s, 0.58 * s, -0.02 * s], [-0.28, 0, (flame - 1) * 0.22]);
          tuft.userData.dragonIdleAccent = true;
          tuft.userData.dragonIdlePhase = flame * 0.8;
        }
        youngBox(youngTailParent, "ember-tail-lantern", [0.34 * s, 0.5 * s, 0.34 * s], glowMaterial, [0, 0.2 * s, 0.5 * s], [0.2, Math.PI / 4, 0]);
      } else if (dragonType === "ice") {
        for (let crystal = -1; crystal <= 1; crystal += 1) youngBox(head, `rime-crown-${crystal + 2}`, [0.13 * s, (0.42 + (1 - Math.abs(crystal)) * 0.18) * s, 0.13 * s], youngIceCrystalMaterial, [crystal * 0.22 * s, 0.58 * s, -0.02 * s], [-0.28, Math.PI / 4, crystal * 0.18]);
        youngBox(head, "snowcap-brow", [1.18 * s, 0.09 * s, 0.38 * s], youngIceRimeMaterial, [0, 0.42 * s, -0.34 * s]);
        for (const side of [-1, 1]) youngBox(youngTailParent, `${side < 0 ? "left" : "right"}-rime-tail-fan`, [0.62 * s, 0.04 * s, 0.58 * s], youngIceAuroraMaterial, [side * 0.24 * s, 0, 0.44 * s], [0, side * 0.52, side * 0.16]);
      } else if (dragonType === "steel") {
        youngBox(head, "rounded-visor", [1.17 * s, 0.16 * s, 0.5 * s], steelPlateMaterial, [0, 0.38 * s, -0.34 * s]);
        for (const side of [-1, 1]) {
          youngBox(chest, `${side < 0 ? "left" : "right"}-button-rivet`, [0.11 * s, 0.11 * s, 0.08 * s], brassRivetMaterial, [side * 0.42 * s, 0.18 * s, -0.82 * s]);
          const stack = youngBox(form, `${side < 0 ? "left" : "right"}-tiny-stack`, [0.15 * s, 0.48 * s, 0.15 * s], steelDarkMaterial, [side * 0.42 * s, 1.68 * s, 0.12 * s], [-0.16, 0, side * 0.05]);
          stack.userData.dragonIdleAccent = true;
          stack.userData.dragonIdlePhase = side < 0 ? 0.6 : 2.4;
        }
        youngBox(youngTailParent, "little-hammer-tail", [0.72 * s, 0.42 * s, 0.5 * s], steelPlateMaterial, [0, 0, 0.48 * s], [0, Math.PI / 4, 0]);
      } else if (dragonType === "sea") {
        for (const side of [-1, 1]) for (let frill = 0; frill < 3; frill += 1) {
          const fin = youngBox(head, `${side < 0 ? "left" : "right"}-cheek-frill-${frill + 1}`, [0.06 * s, (0.38 - frill * 0.04) * s, 0.46 * s], frill % 2 ? reefMaterial : seaGlassMaterial, [side * 0.58 * s, (0.18 - frill * 0.18) * s, (-0.12 + frill * 0.12) * s], [-0.2, side * (0.36 + frill * 0.08), side * 0.18]);
          fin.userData.dragonIdleAccent = true;
          fin.userData.dragonIdlePhase = frill + (side < 0 ? 0 : 2.2);
        }
        for (const side of [-1, 1]) youngBox(youngTailParent, `${side < 0 ? "left" : "right"}-tide-tail-fin`, [0.86 * s, 0.05 * s, 0.72 * s], membraneMaterial, [side * 0.35 * s, 0, 0.48 * s], [0, side * 0.54, side * 0.16]);
      } else if (dragonType === "gold") {
        for (let ray = -2; ray <= 2; ray += 1) {
          const petal = youngBox(head, `sun-petal-${ray + 3}`, [0.13 * s, (0.38 + (2 - Math.abs(ray)) * 0.1) * s, 0.14 * s], ray === 0 ? sunwhiteMaterial : goldPlateMaterial, [ray * 0.18 * s, 0.55 * s, -0.03 * s], [-0.28, 0, ray * 0.2]);
          petal.userData.dragonIdleAccent = true;
          petal.userData.dragonIdlePhase = ray + 2;
        }
        const halo = youngBox(youngTailParent, "sun-button-tail", [0.72 * s, 0.72 * s, 0.12 * s], goldPlateMaterial, [0, 0.05 * s, 0.48 * s], [0, 0, Math.PI / 4]);
        halo.userData.dragonShimmer = true;
        halo.userData.shimmerPhase = 1.4;
      } else {
        for (const side of [-1, 1]) {
          const ear = youngBox(head, `${side < 0 ? "left" : "right"}-moon-ear`, [0.16 * s, 0.54 * s, 0.2 * s], silverPlateMaterial, [side * 0.44 * s, 0.52 * s, -0.05 * s], [-0.42, side * 0.12, side * 0.3]);
          ear.userData.dragonIdleAccent = true;
          ear.userData.dragonIdlePhase = side < 0 ? 0.5 : 2.6;
        }
        for (const [x, y] of [[-0.25, 0.08], [0.22, 0.18], [-0.18, -0.12], [0.28, -0.08]] as const) {
          const star = youngBox(head, `star-freckle-${x}-${y}`, [0.07 * s, 0.07 * s, 0.04 * s], starlightMaterial, [x * s, y * s, -0.59 * s], [0, 0, Math.PI / 4]);
          star.userData.dragonShimmer = true;
          star.userData.shimmerPhase = (x + y + 1) * 3;
        }
        for (const side of [-1, 1]) youngBox(youngTailParent, `${side < 0 ? "left" : "right"}-crescent-tail-tip`, [0.24 * s, 0.72 * s, 0.1 * s], side < 0 ? silverPlateMaterial : moonwhiteMaterial, [side * 0.26 * s, 0.12 * s, 0.48 * s], [-0.32, side * 0.28, side * 0.42]);
      }
      return form;
    };

    const finishDragonForms = () => {
      const adultChildren = [...visual.children];
      const adult = new THREE.Group();
      adult.name = `${prefix}-adult-form`;
      adult.userData.dragonFormStage = "adult";
      const template = new THREE.Group();
      for (const child of adultChildren) template.add(child);
      const variants = DRAGON_VARIANTS[dragonType];
      for (const [index, variant] of variants.entries()) {
        const form = (index === 0 ? template : template.clone(true)) as THREE.Group;
        artDirectAdultVariant(form, variant);
        form.visible = false;
        adult.add(form);
      }
      visual.add(adult);
      buildYoungDragonForm(1);
      buildYoungDragonForm(2);
      group.userData.animatedRig = "dragon-v2";
      visual.userData.animatedRig = "dragon-v2";
      visual.userData.authoredDragonLifeStages = 3;
      visual.userData.authoredAdultVariants = variants.length;
      applyDragonLifeStage(group, 5);
      applyDragonVariant(group, dragonVariantForSeed(dragonType, id));
    };

    if (dragonType === "ice") {
      // ===== Rimeveil ice dragon: ground-up geometry on the dragon-v1 rig =====
      // A lean glacial stalker: arched torso under pack-ice plates, a crystal
      // shard spine, crowned wedge skull with an icicle beard, translucent
      // aurora wing sails, tall slender legs, and a whip tail ending in a
      // crystal fan. Every named pivot and attachment of the shared contract
      // is present so gameplay animation and equipment work unchanged.
      const glacierMaterial = material(0x2e5570);
      const crystalMaterial = material(0xd9f3fb, false, 0.72);
      const rimeMaterial = material(0xf2fafd);
      const auroraMaterial = material(0x9beedd, false, 0.55);

      const chest = pivot(visual, "breathing-chest", [0, 2.02, -0.15]);
      rigBox(chest, "chest", [1.5, 1.15, 2.5], bodyMaterial, [0, 0, 0]);
      rigBox(chest, "belly-keel", [0.95, 0.3, 2.3], glacierMaterial, [0, -0.52, -0.05]);
      rigBox(chest, "chest-frost-sternum", [0.5, 0.2, 0.08], rimeMaterial, [0, -0.32, -1.24]);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        for (let rib = 0; rib < 3; rib += 1) {
          rigBox(chest, `${sideName}-frost-rib-${rib + 1}`, [0.05, 0.62 - rib * 0.08, 0.16], rimeMaterial, [side * 0.76, -0.05 - rib * 0.04, -0.62 + rib * 0.55], [0.14 - rib * 0.05, 0, side * 0.22]);
        }
      }
      parts.body.push(chest);
      rigBox(visual, "shoulder-hump", [1.66, 0.42, 1.05], accentMaterial, [0, 2.72, -0.68]);
      rigBox(visual, "shoulder-rime-cap", [1.74, 0.14, 0.85], rimeMaterial, [0, 2.9, -0.66]);
      rigBox(visual, "pelvis", [1.28, 0.95, 1.45], bodyMaterial, [0, 1.9, 1.35]);
      rigBox(visual, "pelvis-keel", [0.85, 0.24, 1.2], glacierMaterial, [0, 1.42, 1.32]);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        rigBox(visual, `${sideName}-haunch-crystal`, [0.2, 0.5, 0.2], crystalMaterial, [side * 0.62, 2.42, 1.28], [0.12, Math.PI / 4, side * 0.3]);
      }
      for (let plate = 0; plate < 3; plate += 1) {
        rigBox(visual, `pack-ice-plate-${plate + 1}`, [1.3 - plate * 0.18, 0.1, 1.05], crystalMaterial, [0, 2.66 - plate * 0.04, 0.15 + plate * 0.72], [-0.06 - plate * 0.03, 0, plate === 1 ? 0.05 : -0.04]);
      }
      for (let shard = 0; shard < 5; shard += 1) {
        const height = 0.55 + Math.sin((shard / 4) * Math.PI) * 0.5;
        rigBox(visual, `spine-crystal-shard-${shard + 1}`, [0.17, height, 0.17], crystalMaterial, [shard % 2 ? 0.08 : -0.08, 2.78 + height / 2, -0.85 + shard * 0.62], [-0.18 + shard * 0.04, Math.PI / 4, shard % 2 ? 0.1 : -0.1]);
        rigBox(visual, `spine-shard-rime-${shard + 1}`, [0.2, 0.09, 0.2], rimeMaterial, [shard % 2 ? 0.08 : -0.08, 2.8, -0.85 + shard * 0.62], [0, Math.PI / 4, 0]);
      }

      let neckParent: THREE.Object3D = visual;
      for (let segment = 1; segment <= DRAGON_MODEL_CONTRACT.neckSegments; segment += 1) {
        const neck = pivot(neckParent, `neck-${segment}`, segment === 1 ? [0, 2.42, -1.15] : [0, 0.24, -0.78]);
        const width = 1.02 - segment * 0.14;
        rigBox(neck, `neck-${segment}`, [width, 0.82 - segment * 0.07, 1.05], segment % 2 ? bodyMaterial : accentMaterial, [0, 0.05, -0.45]);
        rigBox(neck, `neck-${segment}-throat`, [width * 0.62, 0.2, 0.9], glacierMaterial, [0, -0.32, -0.46]);
        rigBox(neck, `neck-${segment}-rime-fringe`, [0.08, 0.3 - segment * 0.04, 0.7], rimeMaterial, [0, 0.5 - segment * 0.04, -0.42], [-0.2, 0, 0]);
        rigBox(neck, `neck-${segment}-throat-icicle`, [0.07, 0.26 - segment * 0.05, 0.07], crystalMaterial, [segment % 2 ? 0.12 : -0.12, -0.5, -0.5], [0.08, 0, segment % 2 ? -0.12 : 0.12]);
        if (segment === 1) {
          for (const side of [-1, 1]) {
            rigBox(neck, `${side < 0 ? "left" : "right"}-collar-crystal`, [0.15, 0.42, 0.15], crystalMaterial, [side * (width * 0.52), 0.3, -0.2], [-0.3, Math.PI / 4, side * 0.55]);
          }
        }
        neckParent = neck;
      }

      const head = pivot(neckParent, "head", [0, 0.22, -0.72]);
      rigBox(head, "head", [1.12, 0.78, 1.0], bodyMaterial, [0, 0, -0.32]);
      rigBox(head, "brow", [1.2, 0.2, 0.5], rimeMaterial, [0, 0.42, -0.48], [-0.1, 0, 0]);
      rigBox(head, "snout", [0.7, 0.48, 1.0], glacierMaterial, [0, -0.1, -1.16]);
      rigBox(head, "snout-rime-tip", [0.52, 0.34, 0.28], rimeMaterial, [0, -0.08, -1.72]);
      parts.head.push(head);
      // Species crown: four crystal spires every Rimeveil carries regardless of sex.
      for (const [dx, dz, tall] of [[-0.3, -0.15, 0.62], [0.3, -0.15, 0.62], [-0.14, 0.22, 0.88], [0.14, 0.22, 0.88]] as const) {
        rigBox(head, `crown-spire-${dx < 0 ? "l" : "r"}${dz < 0 ? "f" : "b"}`, [0.14, tall, 0.14], crystalMaterial, [dx, 0.5 + tall / 2 - 0.08, dz], [-0.3, Math.PI / 4, dx * 0.5]);
      }
      const jaw = pivot(head, "jaw", [0, -0.3, -0.78]);
      rigBox(jaw, "lower-jaw", [0.62, 0.2, 0.95], glacierMaterial, [0, -0.05, -0.42]);
      for (const side of [-1, 1]) {
        for (let tooth = 0; tooth < 3; tooth += 1) {
          rigBox(jaw, `${side < 0 ? "left" : "right"}-tooth-${tooth + 1}`, [0.07, 0.16, 0.08], rimeMaterial, [side * (0.18 + tooth * 0.06), 0.08, -0.2 - tooth * 0.26], [0.1, 0, side * 0.04]);
        }
      }
      for (let icicle = 0; icicle < 3; icicle += 1) {
        rigBox(jaw, `beard-icicle-${icicle + 1}`, [0.08, 0.34 - icicle * 0.09, 0.08], crystalMaterial, [(icicle - 1) * 0.16, -0.28, -0.55 + icicle * 0.22], [icicle * 0.06, Math.PI / 4, (icicle - 1) * 0.1]);
      }
      const emitter = new THREE.Group();
      emitter.name = `${prefix}-breath-emitter`;
      emitter.position.set(0, 0.04, -0.95);
      emitter.visible = false;
      jaw.add(emitter);
      for (let mote = 0; mote < 4; mote += 1) {
        rigBox(emitter, `frost-mote-${mote + 1}`, [0.1 + mote * 0.045, 0.1 + mote * 0.045, 0.14 + mote * 0.08], glowMaterial, [(mote % 2 ? 1 : -1) * mote * 0.09, (mote - 1.5) * 0.07, -mote * 0.22], [mote * 0.3, Math.PI / 4, mote * 0.42]);
      }
      const projectileOrigin = new THREE.Group();
      projectileOrigin.name = `${prefix}-projectile-origin`;
      projectileOrigin.position.set(0, 0.08, -1.3);
      projectileOrigin.visible = false;
      head.add(projectileOrigin);
      rigBox(projectileOrigin, "ice-projectile-core", [0.34, 0.34, 0.92], crystalMaterial, [0, 0, -0.5], [0, 0, Math.PI / 4]);
      rigBox(projectileOrigin, "ice-projectile-tip", [0.2, 0.2, 0.34], glowMaterial, [0, 0, -1.06], [0, 0, Math.PI / 4]);
      for (let trail = 0; trail < 2; trail += 1) {
        rigBox(projectileOrigin, `ice-projectile-shard-${trail + 1}`, [0.11, 0.11, 0.3], trail ? glowMaterial : crystalMaterial, [(trail ? 1 : -1) * 0.16, 0.08 - trail * 0.14, 0.12 + trail * 0.2], [0.2, 0, Math.PI / 4]);
      }

      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const eye = pivot(head, `${sideName}-eye`, [side * 0.46, 0.14, -0.76]);
        rigBox(eye, `${sideName}-eye`, [0.17, 0.15, 0.08], eyeMaterial, [0, 0, -0.02]);
        rigBox(eye, `${sideName}-eye-glint`, [0.05, 0.05, 0.03], glowMaterial, [side * -0.03, 0.03, -0.06]);
        const nostril = rigBox(head, `${sideName}-nostril`, [0.1, 0.07, 0.05], darkMaterial, [side * 0.17, 0.02, -1.84]);
        nostril.userData.breathSource = true;
      }

      const maleHorns = new THREE.Group();
      maleHorns.name = `${prefix}-male-horn-rack`;
      maleHorns.visible = group.userData.dragonSex === "male";
      head.add(maleHorns);
      const femaleHorns = new THREE.Group();
      femaleHorns.name = `${prefix}-female-horn-rack`;
      femaleHorns.visible = group.userData.dragonSex === "female";
      head.add(femaleHorns);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        // Males branch into frost antlers; females raise twin glassy spires.
        rigBox(maleHorns, `${sideName}-antler-beam`, [0.14, 0.14, 0.85], rimeMaterial, [side * 0.42, 0.42, 0.32], [-0.6, side * 0.35, 0]);
        rigBox(maleHorns, `${sideName}-antler-tine-1`, [0.1, 0.1, 0.46], crystalMaterial, [side * 0.6, 0.78, 0.62], [-1.15, side * 0.2, side * 0.3]);
        rigBox(maleHorns, `${sideName}-antler-tine-2`, [0.09, 0.09, 0.4], crystalMaterial, [side * 0.76, 0.6, 0.95], [-0.35, side * 0.62, side * 0.15]);
        const outer = rigBox(femaleHorns, `${sideName}-spire-horn`, [0.12, 0.16, 1.15], crystalMaterial, [side * 0.36, 0.55, 0.5], [-0.52, side * 0.1, side * -0.06]);
        rigBox(femaleHorns, `${sideName}-spire-horn-tip`, [0.08, 0.1, 0.5], rimeMaterial, [side * 0.42, 0.95, 1.22], [-0.78, side * 0.08, side * -0.08]);
        outer.userData.sexMarker = "female";
      }

      const maleMarkings = new THREE.Group();
      maleMarkings.name = `${prefix}-male-wing-markings`;
      maleMarkings.visible = group.userData.dragonSex === "male";
      visual.add(maleMarkings);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const wingRoot = pivot(visual, `${sideName}-wing-root`, [side * 0.66, 2.58, -0.5]);
        wingRoot.userData.side = side;
        wingRoot.userData.phase = side < 0 ? 0 : Math.PI;
        parts.wings.push(wingRoot);
        rigBox(wingRoot, `${sideName}-wing-upper-bone`, [2.3, 0.18, 0.24], rimeMaterial, [side * 1.05, 0, 0], [0, 0, side * -0.06]);
        rigBox(wingRoot, `${sideName}-wing-thumb-crystal`, [0.11, 0.11, 0.42], crystalMaterial, [side * 2.05, 0.05, -0.24], [0.42, side * -0.28, Math.PI / 4]);
        const wingForearm = pivot(wingRoot, `${sideName}-wing-forearm`, [side * 2.15, 0, 0]);
        rigBox(wingForearm, `${sideName}-wing-forearm-bone`, [2.5, 0.16, 0.22], rimeMaterial, [side * 1.18, 0, 0.15], [0, -side * 0.07, side * -0.14]);
        rigBox(wingRoot, `${sideName}-inner-wing-membrane`, [2.1, 0.05, 2.5], membraneMaterial, [side * 0.95, -0.06, 0.92], [0.04, side * 0.09, side * -0.09]);
        rigBox(wingRoot, `${sideName}-inner-aurora-veil`, [1.68, 0.042, 1.9], auroraMaterial, [side * 0.88, -0.13, 1.05], [0.05, side * 0.09, side * -0.09]);
        rigBox(wingForearm, `${sideName}-outer-wing-membrane`, [2.45, 0.045, 2.0], membraneMaterial, [side * 1.1, -0.06, 0.82], [0.03, side * -0.12, side * -0.14]);
        rigBox(wingForearm, `${sideName}-outer-aurora-veil`, [1.95, 0.04, 1.5], auroraMaterial, [side * 1.05, -0.12, 0.92], [0.04, side * -0.12, side * -0.14]);
        for (let finger = 0; finger < 2; finger += 1) {
          rigBox(wingForearm, `${sideName}-wing-finger-${finger + 1}`, [2.2 - finger * 0.3, 0.08, 0.1], rimeMaterial, [side * (0.98 - finger * 0.08), -0.03, 0.42 + finger * 0.85], [0, side * (0.16 + finger * 0.14), side * -0.13]);
        }
        for (let icicle = 0; icicle < 4; icicle += 1) {
          rigBox(wingForearm, `${sideName}-wing-icicle-${icicle + 1}`, [0.07, 0.24 - (icicle % 2) * 0.07, 0.07], crystalMaterial, [side * (0.35 + icicle * 0.6), -0.16, 1.68 + (icicle % 2) * 0.14], [0.06, Math.PI / 4, side * 0.08]);
        }
        for (let sigil = 0; sigil < 3; sigil += 1) {
          const mark = rigBox(wingRoot, `${sideName}-wing-sigil-${sigil + 1}`, [0.3 + sigil * 0.07, 0.06, 0.3 + sigil * 0.07], glowMaterial, [side * (0.62 + sigil * 0.5), -0.1, 0.4 + sigil * 0.5], [0, Math.PI / 4, 0]);
          mark.userData.sexMarker = "male";
          mark.visible = group.userData.dragonSex === "male";
        }
      }

      for (const [front, z] of [[true, -0.75], [false, 1.35]] as const) {
        for (const side of [-1, 1]) {
          const sideName = side < 0 ? "left" : "right";
          const positionName = `${front ? "front" : "rear"}-${sideName}`;
          const hip = pivot(visual, `${positionName}-hip`, [side * 0.6, front ? 1.78 : 1.84, z]);
          hip.userData.phase = (side < 0) !== front ? 0 : Math.PI;
          parts.legs.push(hip);
          rigBox(hip, `${positionName}-upper-leg`, [0.4, 0.92, 0.5], bodyMaterial, [0, -0.42, front ? -0.05 : 0.05], [front ? -0.08 : 0.08, 0, side * 0.04]);
          const knee = pivot(hip, `${positionName}-knee`, [0, -0.86, front ? -0.08 : 0.1]);
          rigBox(knee, `${positionName}-lower-leg`, [0.3, 0.85, 0.36], accentMaterial, [0, -0.38, 0], [front ? 0.06 : -0.06, 0, 0]);
          rigBox(knee, `${positionName}-rime-sock`, [0.36, 0.26, 0.42], rimeMaterial, [0, -0.66, 0]);
          const claw = pivot(knee, `${positionName}-claw`, [0, -0.81, -0.05]);
          rigBox(claw, `${positionName}-foot`, [0.5, 0.2, 0.62], glacierMaterial, [0, -0.07, -0.16]);
          for (let toe = -1; toe <= 1; toe += 1) {
            rigBox(claw, `${positionName}-crystal-talon-${toe + 2}`, [0.1, 0.1, 0.42], crystalMaterial, [toe * 0.16, -0.1, -0.55], [0.06, toe * -0.1, Math.PI / 4]);
          }
          rigBox(claw, `${positionName}-dewclaw`, [0.08, 0.08, 0.26], crystalMaterial, [0, -0.06, 0.22], [-0.18, 0, Math.PI / 4]);
        }
      }

      let tailParent: THREE.Object3D = visual;
      for (let segment = 1; segment <= DRAGON_MODEL_CONTRACT.tailSegments; segment += 1) {
        const tail = pivot(tailParent, `tail-${segment}`, segment === 1 ? [0, 1.95, 1.38] : [0, -0.03, 0.78]);
        const width = 1.05 - segment * 0.12;
        rigBox(tail, `tail-${segment}`, [Math.max(0.2, width), Math.max(0.22, width * 0.68), 1.0], segment % 2 ? bodyMaterial : glacierMaterial, [0, 0, 0.4]);
        if (segment <= 4) rigBox(tail, `tail-${segment}-rime-blade`, [0.07, Math.max(0.16, 0.4 - segment * 0.05), 0.34], rimeMaterial, [0, Math.max(0.18, width * 0.42), 0.36], [-0.3, 0, 0]);
        if (segment >= 2 && segment <= 5) rigBox(tail, `tail-${segment}-icicle`, [0.07, 0.26 - segment * 0.03, 0.07], crystalMaterial, [segment % 2 ? 0.1 : -0.1, -Math.max(0.14, width * 0.36), 0.42], [0.1, Math.PI / 4, segment % 2 ? 0.14 : -0.14]);
        tailParent = tail;
      }
      rigBox(tailParent, "ice-tail-fin-left", [1.05, 0.06, 0.85], crystalMaterial, [-0.45, 0.02, 0.55], [0, 0.55, 0.14]);
      rigBox(tailParent, "ice-tail-fin-right", [1.05, 0.06, 0.85], crystalMaterial, [0.45, 0.02, 0.55], [0, -0.55, -0.14]);
      rigBox(tailParent, "ice-tail-fin-center", [0.14, 0.62, 0.14], crystalMaterial, [0, 0.28, 0.62], [-0.35, Math.PI / 4, 0]);
      rigBox(tailParent, "tail-frost-core", [0.16, 0.16, 0.16], glowMaterial, [0, 0.1, 0.6], [0.3, Math.PI / 4, 0.3]);

      const saddle = attachment("saddle");
      rigBox(saddle, "saddle-seat", [1.18, 0.24, 1.22], leatherMaterial, [0, 2.66, 0.15]);
      rigBox(saddle, "rime-saddle-blanket", [1.34, 0.1, 1.5], auroraMaterial, [0, 2.53, 0.18], [-0.05, 0, 0]);
      rigBox(saddle, "crystal-saddle-pommel", [0.88, 0.18, 0.18], crystalMaterial, [0, 2.88, -0.42], [0, 0, Math.PI / 4]);
      for (const side of [-1, 1]) {
        rigBox(saddle, `${side < 0 ? "left" : "right"}-saddle-strap`, [0.1, 1.0, 0.92], leatherMaterial, [side * 0.64, 2.13, 0.18], [0, 0, side * 0.09]);
        rigBox(saddle, `${side < 0 ? "left" : "right"}-frost-buckle`, [0.14, 0.16, 0.11], rimeMaterial, [side * 0.66, 2.37, -0.16], [0, Math.PI / 4, Math.PI / 4]);
      }
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const cargo = attachment(`${sideName}-cargo`);
        rigBox(cargo, `${sideName}-cargo-chest`, [0.74, 0.74, 1.08], glacierMaterial, [side * 1.02, 1.85, 0.7]);
        rigBox(cargo, `${sideName}-cargo-lid`, [0.8, 0.13, 1.14], crystalMaterial, [side * 1.02, 2.26, 0.7]);
        rigBox(cargo, `${sideName}-cargo-latch`, [0.11, 0.22, 0.08], rimeMaterial, [side * 1.41, 2.03, 0.16]);
        for (const corner of [-1, 1]) rigBox(cargo, `${sideName}-${corner < 0 ? "front" : "rear"}-cargo-icicle`, [0.09, 0.34, 0.09], crystalMaterial, [side * 1.39, 1.57, 0.7 + corner * 0.38], [0.1, Math.PI / 4, side * 0.08]);
      }
      const headArmor = attachment("head-armor", head);
      rigBox(headArmor, "head-armor-crown", [1.28, 0.18, 0.88], crystalMaterial, [0, 0.48, -0.35], [-0.1, 0, 0]);
      rigBox(headArmor, "head-armor-brow", [1.34, 0.26, 0.22], rimeMaterial, [0, 0.2, -0.86]);
      for (const side of [-1, 1]) rigBox(headArmor, `${side < 0 ? "left" : "right"}-head-armor-temple-icicle`, [0.13, 0.54, 0.18], crystalMaterial, [side * 0.62, 0.03, -0.32], [-0.32, side * 0.14, side * 0.22]);
      const neckArmor = attachment("neck-armor", neckParent);
      for (let plate = 0; plate < 3; plate += 1) rigBox(neckArmor, `neck-armor-plate-${plate + 1}`, [0.85 - plate * 0.08, 0.16, 0.45], plate % 2 ? rimeMaterial : crystalMaterial, [0, 0.42 + plate * 0.03, -0.2 - plate * 0.26], [-0.08, 0, 0]);
      const bodyArmor = attachment("body-armor");
      for (let plate = 0; plate < 4; plate += 1) rigBox(bodyArmor, `body-armor-main-${plate + 1}`, [1.58 - plate * 0.08, 0.16, 0.68], plate % 2 ? crystalMaterial : armorMaterial, [0, 2.65 - plate * 0.025, -0.78 + plate * 0.68], [-0.08 + plate * 0.02, 0, 0]);
      for (const side of [-1, 1]) rigBox(bodyArmor, `${side < 0 ? "left" : "right"}-body-armor-flank`, [0.18, 0.88, 1.9], auroraMaterial, [side * 0.8, 2.0, 0.15], [0, 0, side * 0.08]);
      const tailArmor = attachment("tail-armor");
      for (let plate = 0; plate < 4; plate += 1) rigBox(tailArmor, `tail-armor-plate-${plate + 1}`, [0.95 - plate * 0.13, 0.16, 0.7], plate % 2 ? rimeMaterial : crystalMaterial, [0, 2.4 - plate * 0.1, 1.75 + plate * 0.72], [0.04 * plate, 0, plate % 2 ? 0.05 : -0.05]);

      finishDragonForms();
      applyDragonPose(group, { timeSeconds: 0.42, stage: 5, mode: "idle", movement: 0, sex: group.userData.dragonSex });
      return;
    }

    // Every mature species starts from its own proportions. These are not
    // decorative skins over a shared cuboid: shoulder width, torso taper,
    // neck cadence, skull, legs, wings and tail all establish a different
    // locomotion silhouette before the elemental details are added.
    const adultProfile = dragonType === "fire" ? {
      chest: [1.48, 1.02, 3.28], belly: [0.82, 0.24, 2.9], haunch: [1.34, 0.92, 1.72], shoulder: [1.82, 0.38, 1.2], waist: [1.05, 0.74, 1.34],
      neckWidth: 1.14, neckHeight: 0.82, neckDepth: 1.28, neckStep: 1.0, head: [1.42, 0.88, 1.62], snout: [0.84, 0.4, 1.42],
      wingUpper: 2.95, wingForearm: 3.25, wingDepth: 3.2, hipX: 0.58, legScale: 0.9, tailWidth: 1.12, tailStep: 1.06,
    } : dragonType === "steel" ? {
      chest: [2.04, 1.18, 2.72], belly: [1.18, 0.3, 2.38], haunch: [1.86, 1.12, 1.72], shoulder: [2.42, 0.52, 1.26], waist: [1.42, 0.88, 1.16],
      neckWidth: 1.5, neckHeight: 0.98, neckDepth: 1.08, neckStep: 0.86, head: [1.82, 1.04, 1.36], snout: [1.18, 0.52, 1.0],
      wingUpper: 2.48, wingForearm: 2.85, wingDepth: 2.64, hipX: 0.76, legScale: 1.06, tailWidth: 1.58, tailStep: 0.9,
    } : dragonType === "sea" ? {
      chest: [1.26, 0.8, 3.52], belly: [0.72, 0.2, 3.14], haunch: [1.08, 0.74, 1.56], shoulder: [1.56, 0.3, 1.08], waist: [0.88, 0.58, 1.58],
      neckWidth: 0.94, neckHeight: 0.68, neckDepth: 1.48, neckStep: 1.18, head: [1.48, 0.76, 1.58], snout: [0.92, 0.34, 1.36],
      wingUpper: 3.12, wingForearm: 3.48, wingDepth: 3.64, hipX: 0.5, legScale: 0.78, tailWidth: 1.02, tailStep: 1.24,
    } : dragonType === "gold" ? {
      chest: [1.58, 0.92, 3.08], belly: [0.88, 0.22, 2.72], haunch: [1.38, 0.86, 1.62], shoulder: [1.94, 0.34, 1.12], waist: [1.04, 0.68, 1.34],
      neckWidth: 1.12, neckHeight: 0.76, neckDepth: 1.34, neckStep: 1.08, head: [1.72, 0.88, 1.48], snout: [0.94, 0.38, 1.24],
      wingUpper: 3.18, wingForearm: 3.6, wingDepth: 3.48, hipX: 0.62, legScale: 0.92, tailWidth: 1.18, tailStep: 1.12,
    } : {
      chest: [1.28, 0.82, 3.42], belly: [0.7, 0.2, 3.04], haunch: [1.14, 0.76, 1.58], shoulder: [1.62, 0.28, 1.02], waist: [0.86, 0.58, 1.52],
      neckWidth: 0.96, neckHeight: 0.68, neckDepth: 1.5, neckStep: 1.2, head: [1.34, 0.72, 1.66], snout: [0.72, 0.3, 1.46],
      wingUpper: 3.42, wingForearm: 3.84, wingDepth: 3.72, hipX: 0.5, legScale: 0.82, tailWidth: 0.98, tailStep: 1.25,
    };
    const chest = pivot(visual, "breathing-chest", [0, 1.9, -0.12]);
    rigBox(chest, "chest", adultProfile.chest as [number, number, number], bodyMaterial, [0, 0, 0]);
    rigBox(chest, "belly-keel", adultProfile.belly as [number, number, number], bellyMaterial, [0, -adultProfile.chest[1] * 0.45, -0.08], [-0.03, 0, 0]);
    rigBox(visual, "haunches", adultProfile.haunch as [number, number, number], bodyMaterial, [0, 1.82, 1.42], [0.04, 0, 0]);
    rigBox(visual, "tapered-waist", adultProfile.waist as [number, number, number], accentMaterial, [0, 1.83, 0.83], [-0.08, 0, 0]);
    rigBox(visual, "shoulder-mantle", adultProfile.shoulder as [number, number, number], accentMaterial, [0, 2.42, -0.82], [-0.08, 0, 0]);
    for (const side of [-1, 1]) for (let rib = 0; rib < 3; rib += 1) {
      rigBox(chest, `${side < 0 ? "left" : "right"}-streamline-rib-${rib + 1}`, [0.1, adultProfile.chest[1] * (0.54 - rib * 0.07), 0.72], accentMaterial,
        [side * adultProfile.chest[0] * 0.49, 0.15 - rib * 0.18, -0.88 + rib * 0.82], [0.08 - rib * 0.04, side * 0.08, side * (0.18 - rib * 0.04)]);
    }
    parts.body.push(chest);
    if (isFire) {
      // Cracked-basalt hide: molten seams sit proud of the surface so the box
      // renderer reads them, and they scale with the breathing chest pivot.
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        rigBox(chest, `${sideName}-chest-magma-crack-1`, [0.06, 0.52, 1.72], lavaMaterial, [side * 0.97, 0.1, -0.22], [0.12, 0, side * 0.14]);
        rigBox(chest, `${sideName}-chest-magma-crack-2`, [0.06, 0.32, 1.02], lavaMaterial, [side * 0.965, -0.34, 0.58], [-0.16, 0, side * -0.2]);
        rigBox(visual, `${sideName}-haunch-magma-crack`, [0.06, 0.44, 1.08], lavaMaterial, [side * 0.87, 1.92, 1.44], [0.08, 0, side * -0.18]);
      }
      rigBox(chest, "furnace-heart-vent", [0.52, 0.42, 0.09], emberCoreMaterial, [0, -0.26, -1.53], [0.08, 0, Math.PI / 4]);
      rigBox(visual, "shoulder-char-plate", [2.24, 0.16, 0.86], charMaterial, [0, 2.66, -0.78]);
    } else if (dragonType === "steel") {
      rigBox(chest, "pressure-core-housing", [0.78, 0.62, 0.12], steelDarkMaterial, [0, -0.08, -1.56]);
      rigBox(chest, "pressure-core", [0.42, 0.42, 0.08], glowMaterial, [0, -0.08, -1.64], [0, 0, Math.PI / 4]);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        rigBox(chest, `${sideName}-boiler-flank`, [0.08, 0.72, 1.9], steelPlateMaterial, [side * 0.98, 0.02, 0], [0.04, 0, side * 0.08]);
        for (let rivet = 0; rivet < 3; rivet += 1) rigBox(chest, `${sideName}-boiler-rivet-${rivet + 1}`, [0.1, 0.1, 0.1], brassRivetMaterial, [side * 1.04, 0.28 - rivet * 0.3, -0.62 + rivet * 0.62]);
        rigBox(visual, `${sideName}-shoulder-exhaust`, [0.18, 0.72, 0.18], steelDarkMaterial, [side * 0.72, 2.82, -0.72], [-0.14, 0, side * 0.08]);
        rigBox(visual, `${sideName}-exhaust-cap`, [0.28, 0.12, 0.28], brassRivetMaterial, [side * 0.72, 3.18, -0.82]);
      }
    } else if (dragonType === "sea") {
      rigBox(chest, "tideglass-sternum", [0.62, 0.44, 0.09], glowMaterial, [0, -0.2, -1.58], [0, 0, Math.PI / 4]);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        for (let scale = 0; scale < 4; scale += 1) {
          rigBox(chest, `${sideName}-lateral-scale-${scale + 1}`, [0.06, 0.3, 0.42], scale % 2 ? seaGlassMaterial : reefMaterial, [side * 0.98, 0.22 - scale * 0.13, -0.82 + scale * 0.54], [0.08, 0, side * (0.12 + scale * 0.02)]);
        }
        const shoulderFin = rigBox(visual, `${sideName}-shoulder-fin`, [0.08, 0.72, 0.92], membraneMaterial, [side * 1.0, 2.5, -0.66], [-0.16, side * 0.24, side * 0.14]);
        shoulderFin.userData.aquaticFin = true;
      }
    } else if (dragonType === "gold") {
      const core = rigBox(chest, "solar-heart-core", [0.5, 0.5, 0.1], sunwhiteMaterial, [0, -0.16, -1.64], [0, 0, Math.PI / 4]);
      core.userData.dragonShimmer = true;
      core.userData.shimmerPhase = 0.2;
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        for (let row = 0; row < 3; row += 1) for (let plate = 0; plate < 4; plate += 1) {
          const scale = rigBox(chest, `${sideName}-sunscale-${row + 1}-${plate + 1}`, [0.08, 0.28, 0.42], (row + plate) % 3 === 0 ? metalMaterial : goldPlateMaterial,
            [side * (0.98 + row * 0.025), 0.38 - row * 0.25, -0.92 + plate * 0.58], [0.06, side * (0.08 + row * 0.035), side * ((plate - 1.5) * 0.035)]);
          if ((row + plate) % 4 === 0) { scale.userData.dragonShimmer = true; scale.userData.shimmerPhase = row * 1.7 + plate * 0.4; }
        }
        rigBox(visual, `${sideName}-solar-shoulder-pauldrons`, [0.54, 0.48, 1.28], goldPlateMaterial, [side * 1.04, 2.56, -0.64], [-0.15, side * 0.08, side * 0.28]);
        for (let ray = 0; ray < 3; ray += 1) rigBox(visual, `${sideName}-shoulder-ray-${ray + 1}`, [0.12, 0.48 + ray * 0.16, 0.14], ray === 1 ? sunwhiteMaterial : hornMaterial, [side * (1.08 + ray * 0.16), 2.83 + ray * 0.1, -0.64 + ray * 0.18], [-0.28, 0, side * (0.25 + ray * 0.12)]);
      }
      for (let ring = 0; ring < 8; ring += 1) {
        const angle = ring / 8 * TAU;
        const ray = rigBox(chest, `solar-heart-ray-${ring + 1}`, [0.08, 0.24, 0.07], ring % 2 ? glowMaterial : sunwhiteMaterial, [Math.cos(angle) * 0.43, -0.16 + Math.sin(angle) * 0.43, -1.7], [0, 0, angle]);
        ray.userData.dragonShimmer = true;
        ray.userData.shimmerPhase = ring * 0.58;
      }
    } else if (dragonType === "silver") {
      const core = rigBox(chest, "lunar-heart-core", [0.38, 0.38, 0.11], moonwhiteMaterial, [0, -0.12, -1.64], [0, 0, Math.PI / 4]);
      core.userData.dragonShimmer = true;
      core.userData.shimmerPhase = 1.1;
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        for (let row = 0; row < 4; row += 1) for (let plate = 0; plate < 4; plate += 1) {
          const scale = rigBox(chest, `${sideName}-mirrorscale-${row + 1}-${plate + 1}`, [0.065, 0.22 + row * 0.018, 0.36], (row + plate) % 2 ? silverPlateMaterial : metalMaterial,
            [side * (0.97 + row * 0.02), 0.4 - row * 0.2, -0.9 + plate * 0.56], [0.08, side * (0.16 + row * 0.025), side * ((plate - 1.5) * 0.045)]);
          if ((row * 3 + plate) % 5 === 0) { scale.userData.dragonShimmer = true; scale.userData.shimmerPhase = 0.7 + row + plate * 0.41; }
        }
        const crescent = rigBox(visual, `${sideName}-crescent-shoulder`, [0.12, 1.15, 0.82], silverPlateMaterial, [side * 1.03, 2.56, -0.62], [-0.2, side * 0.18, side * 0.22]);
        crescent.userData.moonCrescent = true;
      }
      for (const [x, y, phase] of [[-0.24, 0.16, 0], [0.2, 0.32, 1], [-0.32, -0.12, 2], [0.3, -0.3, 3], [0.04, -0.48, 4]] as Array<[number, number, number]>) {
        const star = rigBox(chest, `constellation-node-${phase + 1}`, [0.09, 0.09, 0.065], phase % 2 ? moonwhiteMaterial : starlightMaterial, [x, y, -1.71], [0, 0, Math.PI / 4]);
        star.userData.dragonShimmer = true;
        star.userData.shimmerPhase = phase * 0.83;
      }
    }

    for (let ridge = 0; ridge < 7; ridge += 1) {
      const height = 0.42 + Math.sin((ridge / 6) * Math.PI) * 0.42;
      if (isFire) {
        // Obsidian crest: raked charred plates over molten seams, with open
        // flame licking through the center of the row.
        const plateHeight = height * 1.3;
        const plate = rigBox(visual, `back-spine-${ridge + 1}`, [0.14, plateHeight, 0.42], charMaterial, [0, 2.6 + plateHeight / 2, -1.18 + ridge * 0.47]);
        plate.rotation.x = -0.36 + ridge * 0.022;
        rigBox(visual, `back-spine-${ridge + 1}-lava-seam`, [0.17, 0.11, 0.36], lavaMaterial, [0, 2.67, -1.18 + ridge * 0.47], [-0.32, 0, 0]);
        if (ridge % 2 === 1) {
          rigBox(visual, `back-crest-flame-${ridge}`, [0.11, 0.36, 0.16], glowMaterial, [0, 2.64 + plateHeight, -1.26 + ridge * 0.47], [-0.42, 0, ridge === 3 ? 0.24 : -0.18]);
        }
      } else if (dragonType === "gold") {
        const plateHeight = height * 1.22;
        rigBox(visual, `back-spine-${ridge + 1}`, [0.34, plateHeight, 0.46], ridge % 2 ? hornMaterial : goldPlateMaterial, [0, 2.57 + plateHeight / 2, -1.18 + ridge * 0.47], [-0.2, 0, ridge % 2 ? Math.PI / 4 : -Math.PI / 4]);
        const gem = rigBox(visual, `back-sun-gem-${ridge + 1}`, [0.14, 0.14, 0.14], ridge % 2 ? sunwhiteMaterial : glowMaterial, [0, 2.7 + plateHeight, -1.18 + ridge * 0.47], [0, Math.PI / 4, Math.PI / 4]);
        gem.userData.dragonShimmer = true;
        gem.userData.shimmerPhase = ridge * 0.77;
      } else if (dragonType === "silver") {
        const plateHeight = height * 1.08;
        rigBox(visual, `back-spine-${ridge + 1}`, [0.15, plateHeight, 0.5], ridge % 2 ? silverPlateMaterial : hornMaterial, [0, 2.6 + plateHeight / 2, -1.18 + ridge * 0.47], [-0.34 + ridge * 0.035, 0, ridge % 2 ? 0.18 : -0.18]);
        if (ridge % 2 === 0) {
          const star = rigBox(visual, `back-star-${ridge + 1}`, [0.12, 0.12, 0.12], starlightMaterial, [0, 2.72 + plateHeight, -1.18 + ridge * 0.47], [0, Math.PI / 4, Math.PI / 4]);
          star.userData.dragonShimmer = true;
          star.userData.shimmerPhase = ridge * 0.63;
        }
      } else {
        const spine = rigBox(visual, `back-spine-${ridge + 1}`, [0.18, height, 0.28], accentMaterial, [0, 2.62 + height / 2, -1.18 + ridge * 0.47]);
        spine.rotation.x = -0.08 + ridge * 0.018;
      }
    }
    if (dragonType === "steel") {
      for (let plate = 0; plate < 5; plate += 1) {
        const left = rigBox(visual, `left-riveted-plate-${plate + 1}`, [0.72, 0.16, 0.62], metalMaterial, [-0.66, 2.42, -0.85 + plate * 0.58], [0, 0, -0.12]);
        const right = rigBox(visual, `right-riveted-plate-${plate + 1}`, [0.72, 0.16, 0.62], metalMaterial, [0.66, 2.42, -0.85 + plate * 0.58], [0, 0, 0.12]);
        left.userData.pressurePlate = true;
        right.userData.pressurePlate = true;
      }
    }

    let neckParent: THREE.Object3D = visual;
    for (let segment = 1; segment <= DRAGON_MODEL_CONTRACT.neckSegments; segment += 1) {
      const neck = pivot(neckParent, `neck-${segment}`, segment === 1 ? [0, 2.02, -1.36] : [0, 0.08, -adultProfile.neckStep]);
      const width = adultProfile.neckWidth - segment * (dragonType === "steel" ? 0.11 : 0.13);
      const neckHeight = adultProfile.neckHeight - segment * 0.055;
      rigBox(neck, `neck-${segment}`, [width, neckHeight, adultProfile.neckDepth], segment % 2 ? bodyMaterial : accentMaterial, [0, 0, -adultProfile.neckDepth * 0.42], [-0.08 + segment * 0.018, 0, 0]);
      rigBox(neck, `neck-${segment}-throat`, [width * 0.62, 0.2, adultProfile.neckDepth * 0.88], bellyMaterial, [0, -neckHeight * 0.44, -adultProfile.neckDepth * 0.43], [-0.08, 0, 0]);
      rigBox(neck, `neck-${segment}-spine`, [0.14, 0.42 - segment * 0.04, 0.34], isFire ? charMaterial : accentMaterial, [0, neckHeight * 0.57, -adultProfile.neckDepth * 0.38], [-0.18, 0, 0]);
      if (isFire) rigBox(neck, `neck-${segment}-throat-ember`, [width * 0.3, 0.11, 0.72], lavaMaterial, [0, -0.57, -0.52]);
      if (dragonType === "steel") {
        rigBox(neck, `neck-${segment}-riveted-collar`, [width + 0.08, 0.12, 0.28], segment % 2 ? brassRivetMaterial : steelPlateMaterial, [0, 0.28, -0.24]);
        for (const side of [-1, 1]) rigBox(neck, `neck-${segment}-${side < 0 ? "left" : "right"}-bolt`, [0.09, 0.09, 0.09], brassRivetMaterial, [side * (width * 0.5), 0.3, -0.38]);
      } else if (dragonType === "sea") {
        for (const side of [-1, 1]) {
          const frill = rigBox(neck, `neck-${segment}-${side < 0 ? "left" : "right"}-frill`, [0.06, 0.4 - segment * 0.04, 0.7], seaGlassMaterial, [side * (width * 0.54), 0.22, -0.4], [-0.18, side * 0.28, side * 0.12]);
          frill.userData.aquaticFin = true;
        }
      } else if (dragonType === "gold") {
        rigBox(neck, `neck-${segment}-sun-collar`, [width + 0.12, 0.14, 0.34], segment % 2 ? goldPlateMaterial : metalMaterial, [0, 0.3, -0.28], [0, 0, Math.PI / 4]);
        for (const side of [-1, 1]) {
          const jewel = rigBox(neck, `neck-${segment}-${side < 0 ? "left" : "right"}-sun-jewel`, [0.11, 0.11, 0.08], sunwhiteMaterial, [side * (width * 0.5), 0.3, -0.42], [0, Math.PI / 4, Math.PI / 4]);
          jewel.userData.dragonShimmer = true;
          jewel.userData.shimmerPhase = segment * 0.8 + side;
        }
      } else if (dragonType === "silver") {
        for (const side of [-1, 1]) {
          const blade = rigBox(neck, `neck-${segment}-${side < 0 ? "left" : "right"}-moon-blade`, [0.07, 0.5 - segment * 0.04, 0.78], segment % 2 ? silverPlateMaterial : hornMaterial, [side * (width * 0.54), 0.22, -0.4], [-0.25, side * 0.36, side * 0.11]);
          blade.userData.lunarFrill = true;
        }
      }
      neckParent = neck;
    }

    const head = pivot(neckParent, "head", [0, 0.05, -adultProfile.neckStep]);
    const headWidth = adultProfile.head[0];
    rigBox(head, "head", adultProfile.head as [number, number, number], bodyMaterial, [0, 0, -adultProfile.head[2] * 0.36], [-0.03, 0, 0]);
    rigBox(head, "brow", [headWidth * 1.04, Math.max(0.18, adultProfile.head[1] * 0.2), adultProfile.head[2] * 0.48], accentMaterial, [0, adultProfile.head[1] * 0.31, -adultProfile.head[2] * 0.67], [-0.12, 0, 0]);
    rigBox(head, "snout", adultProfile.snout as [number, number, number], bellyMaterial, [0, -adultProfile.head[1] * 0.16, -adultProfile.head[2] * 0.72 - adultProfile.snout[2] * 0.42], [0.04, 0, 0]);
    parts.head.push(head);
    if (isFire) {
      rigBox(head, "brow-char-ridge", [headWidth * 1.08, 0.15, 0.52], charMaterial, [0, 0.5, -0.88], [-0.14, 0, 0]);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        rigBox(head, `${sideName}-cheek-spike`, [0.15, 0.15, 0.64], charMaterial, [side * (headWidth * 0.52), -0.02, 0.02], [0.12, side * -0.62, 0]);
        rigBox(head, `${sideName}-snout-fang`, [0.09, 0.3, 0.09], amberHornMaterial, [side * (headWidth * 0.28), -0.52, -1.66], [0.06, 0, side * 0.05]);
      }
    } else if (dragonType === "steel") {
      rigBox(head, "riveted-brow-visor", [headWidth * 1.08, 0.18, 0.64], steelPlateMaterial, [0, 0.49, -0.87], [-0.08, 0, 0]);
      rigBox(head, "snout-ram", [0.54, 0.3, 0.52], steelDarkMaterial, [0, -0.12, -1.82]);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        rigBox(head, `${sideName}-cheek-armor`, [0.16, 0.58, 0.82], steelPlateMaterial, [side * (headWidth * 0.53), -0.08, -0.58], [0.05, side * 0.06, side * 0.08]);
        rigBox(head, `${sideName}-visor-rivet`, [0.11, 0.11, 0.08], brassRivetMaterial, [side * (headWidth * 0.42), 0.51, -1.1]);
      }
    } else if (dragonType === "sea") {
      rigBox(head, "tideglass-brow-crown", [headWidth * 1.08, 0.14, 0.62], seaGlassMaterial, [0, 0.5, -0.82], [-0.12, 0, 0]);
      rigBox(head, "reef-snout-band", [headWidth * 0.72, 0.12, 0.32], reefMaterial, [0, -0.02, -1.78]);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const whisker = rigBox(head, `${sideName}-current-whisker`, [0.06, 0.06, 1.25], seaGlassMaterial, [side * (headWidth * 0.43), -0.12, -1.5], [0.08, side * 0.4, side * -0.12]);
        whisker.userData.aquaticFin = true;
        for (let gill = 0; gill < 3; gill += 1) rigBox(head, `${sideName}-gill-light-${gill + 1}`, [0.05, 0.12, 0.3], glowMaterial, [side * (headWidth * 0.52), 0.12 - gill * 0.16, -0.48 + gill * 0.2], [0, side * 0.08, side * 0.18]);
      }
    } else if (dragonType === "gold") {
      rigBox(head, "solar-brow-mask", [headWidth * 1.12, 0.22, 0.76], goldPlateMaterial, [0, 0.48, -0.86], [-0.08, 0, 0]);
      rigBox(head, "solar-snout-keel", [0.34, 0.34, 1.02], goldShadowMaterial, [0, -0.02, -1.5], [0.1, 0, 0]);
      for (let crown = -3; crown <= 3; crown += 1) {
        const height = 0.42 + (3 - Math.abs(crown)) * 0.14;
        const ray = rigBox(head, `sun-crown-ray-${crown + 4}`, [0.12, height, 0.14], crown === 0 ? sunwhiteMaterial : hornMaterial, [crown * 0.19, 0.72 + height * 0.35, -0.36 + Math.abs(crown) * 0.06], [-0.26, 0, crown * 0.08]);
        if (crown === 0) { ray.userData.dragonShimmer = true; ray.userData.shimmerPhase = 2.4; }
      }
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        rigBox(head, `${sideName}-sun-cheek-fan`, [0.1, 0.75, 0.9], goldPlateMaterial, [side * (headWidth * 0.54), 0.02, -0.42], [0.08, side * 0.28, side * 0.32]);
        for (let fang = 0; fang < 2; fang += 1) rigBox(head, `${sideName}-royal-fang-${fang + 1}`, [0.11, 0.34 + fang * 0.1, 0.11], hornMaterial, [side * (0.34 + fang * 0.14), -0.5, -1.55 + fang * 0.12], [0.08, 0, side * 0.08]);
      }
    } else if (dragonType === "silver") {
      rigBox(head, "moon-brow-visor", [headWidth * 1.08, 0.16, 0.78], silverPlateMaterial, [0, 0.49, -0.86], [-0.12, 0, 0]);
      rigBox(head, "mirror-snout-blade", [0.22, 0.24, 1.28], silverShadowMaterial, [0, -0.04, -1.56], [0.12, 0, 0]);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        rigBox(head, `${sideName}-crescent-cheek`, [0.09, 0.9, 0.76], silverPlateMaterial, [side * (headWidth * 0.52), 0.04, -0.42], [-0.05, side * 0.42, side * 0.28]);
        const star = rigBox(head, `${sideName}-temple-star`, [0.13, 0.13, 0.07], moonwhiteMaterial, [side * (headWidth * 0.46), 0.26, -0.92], [0, 0, Math.PI / 4]);
        star.userData.dragonShimmer = true;
        star.userData.shimmerPhase = side < 0 ? 1.2 : 3.4;
      }
    }

    const jaw = pivot(head, "jaw", [0, -0.39, -1.1]);
    rigBox(jaw, "lower-jaw", [headWidth * 0.72, 0.28, 1.15], bellyMaterial, [0, -0.08, -0.48]);
    if (isFire) rigBox(jaw, "chin-spike", [0.12, 0.36, 0.12], charMaterial, [0, -0.26, -0.92], [0.55, 0, 0]);
    if (dragonType === "steel") {
      rigBox(jaw, "jaw-piston", [0.16, 0.16, 0.88], steelPlateMaterial, [0, -0.24, -0.42]);
      for (const side of [-1, 1]) rigBox(jaw, `${side < 0 ? "left" : "right"}-jaw-hinge`, [0.24, 0.24, 0.18], brassRivetMaterial, [side * (headWidth * 0.36), 0.02, 0.02], [0, Math.PI / 4, 0]);
    } else if (dragonType === "sea") {
      for (const side of [-1, 1]) rigBox(jaw, `${side < 0 ? "left" : "right"}-chin-barbel`, [0.07, 0.48, 0.07], seaGlassMaterial, [side * 0.22, -0.34, -0.55], [0.26, 0, side * 0.14]);
    } else if (dragonType === "gold") {
      rigBox(jaw, "royal-chin-keel", [0.28, 0.58, 0.24], goldPlateMaterial, [0, -0.35, -0.72], [0.42, 0, 0]);
      for (const side of [-1, 1]) rigBox(jaw, `${side < 0 ? "left" : "right"}-chin-ray`, [0.09, 0.46, 0.09], hornMaterial, [side * 0.25, -0.3, -0.54], [0.35, 0, side * 0.22]);
    } else if (dragonType === "silver") {
      for (const side of [-1, 1]) rigBox(jaw, `${side < 0 ? "left" : "right"}-moon-whisker`, [0.055, 0.055, 1.12], hornMaterial, [side * 0.25, -0.24, -0.65], [0.12, side * 0.38, side * -0.14]);
    }
    for (const side of [-1, 1]) {
      for (let tooth = 0; tooth < 4; tooth += 1) {
        rigBox(jaw, `${side < 0 ? "left" : "right"}-tooth-${tooth + 1}`, [0.09, 0.22, 0.1], hornMaterial, [side * (0.2 + tooth * 0.1), 0.1, -0.2 - tooth * 0.23], [0.12, 0, side * 0.05]);
      }
    }
    const emitter = new THREE.Group();
    emitter.name = `${prefix}-breath-emitter`;
    emitter.position.set(0, 0.03, -1.08);
    emitter.visible = false;
    jaw.add(emitter);
    for (let ember = 0; ember < 4; ember += 1) {
      const mote = rigBox(emitter, `breath-mote-${ember + 1}`, [0.12 + ember * 0.04, 0.12 + ember * 0.04, 0.18 + ember * 0.08], glowMaterial, [(ember % 2 ? 1 : -1) * ember * 0.08, (ember - 1.5) * 0.06, -ember * 0.24]);
      mote.rotation.z = ember * 0.38;
    }
    const projectileOrigin = new THREE.Group();
    projectileOrigin.name = `${prefix}-projectile-origin`;
    projectileOrigin.position.set(0, 0.14, -1.45);
    projectileOrigin.visible = false;
    head.add(projectileOrigin);
    if (dragonType === "gold") {
      const core = rigBox(projectileOrigin, "loaded-solar-disc-core", [0.4, 0.4, 0.26], sunwhiteMaterial, [0, 0, -0.32], [0, Math.PI / 4, Math.PI / 4]);
      core.userData.dragonShimmer = true;
      core.userData.shimmerPhase = 0.3;
      for (let ray = 0; ray < 10; ray += 1) {
        const angle = ray / 10 * TAU;
        rigBox(projectileOrigin, `loaded-solar-disc-ray-${ray + 1}`, [0.09, 0.34, 0.09], ray % 2 ? glowMaterial : hornMaterial, [Math.cos(angle) * 0.42, Math.sin(angle) * 0.42, -0.3], [0, 0, angle]);
      }
    } else if (dragonType === "silver") {
      for (let shard = 0; shard < 9; shard += 1) {
        const angle = -1.35 + shard * 0.34;
        rigBox(projectileOrigin, `loaded-moon-crescent-${shard + 1}`, [0.08, 0.28, 0.12], shard % 2 ? starlightMaterial : moonwhiteMaterial, [Math.cos(angle) * 0.4 - 0.12, Math.sin(angle) * 0.4, -0.3], [0, 0, angle + Math.PI / 2]);
      }
    } else if (dragonType === "steel") {
      rigBox(projectileOrigin, "loaded-metal-spear-shaft", [0.12, 0.12, 2.25], metalMaterial, [0, 0, -1.06]);
      rigBox(projectileOrigin, "loaded-metal-spear-head", [0.38, 0.38, 0.68], glowMaterial, [0, 0, -2.45], [0, Math.PI / 4, 0]);
      for (const side of [-1, 1]) rigBox(projectileOrigin, `${side < 0 ? "left" : "right"}-spear-fin`, [0.34, 0.08, 0.42], accentMaterial, [side * 0.18, 0, -0.22], [0, 0, side * 0.35]);
    } else {
      rigBox(projectileOrigin, `${dragonType}-projectile-core`, [0.48, 0.48, 0.48], glowMaterial, [0, 0, -0.25], [0, Math.PI / 4, Math.PI / 4]);
      for (let trail = 0; trail < 3; trail += 1) rigBox(projectileOrigin, `${dragonType}-projectile-trail-${trail + 1}`, [0.15, 0.15, 0.38 + trail * 0.14], trail % 2 ? accentMaterial : glowMaterial, [0, 0, 0.15 + trail * 0.28]);
    }

    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const eye = pivot(head, `${sideName}-eye`, [side * (headWidth * 0.3), 0.16, -1.13]);
      rigBox(eye, `${sideName}-eye`, [0.21, 0.18, 0.09], eyeMaterial, [0, 0, -0.02]);
      rigBox(eye, `${sideName}-eye-glint`, [0.055, 0.055, 0.035], glowMaterial, [side * -0.035, 0.035, -0.075]);
      const nostril = rigBox(head, `${sideName}-nostril`, [0.12, 0.08, 0.055], isFire ? lavaMaterial : darkMaterial, [side * (headWidth * 0.19), -0.08, -1.88]);
      nostril.userData.breathSource = true;
    }

    const maleHorns = new THREE.Group();
    maleHorns.name = `${prefix}-male-horn-rack`;
    maleHorns.visible = group.userData.dragonSex === "male";
    head.add(maleHorns);
    const femaleHorns = new THREE.Group();
    femaleHorns.name = `${prefix}-female-horn-rack`;
    femaleHorns.visible = group.userData.dragonSex === "female";
    head.add(femaleHorns);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      if (isFire) {
        // Males wear heavy two-segment demon-curl horns; females long swept
        // blades. Charred bases fade into polished horn tips.
        rigBox(maleHorns, `${sideName}-straight-horn`, [0.3, 0.3, 0.92], charMaterial, [side * 0.5, 0.44, 0.28], [-0.35, side * 0.32, 0]);
        rigBox(maleHorns, `${sideName}-straight-horn-tip`, [0.2, 0.2, 0.86], amberHornMaterial, [side * 0.76, 0.82, 0.86], [-1.05, side * 0.38, side * 0.1]);
        const outer = rigBox(femaleHorns, `${sideName}-curved-horn-outer`, [0.17, 0.23, 1.32], charMaterial, [side * 0.48, 0.52, 0.44], [-0.42, side * 0.12, side * -0.08]);
        rigBox(femaleHorns, `${sideName}-curved-horn-tip`, [0.12, 0.15, 0.68], amberHornMaterial, [side * 0.56, 0.98, 1.34], [-0.72, side * 0.08, side * -0.1]);
        outer.userData.sexMarker = "female";
      } else if (dragonType === "gold") {
        rigBox(maleHorns, `${sideName}-sun-horn-base`, [0.32, 0.32, 0.95], goldShadowMaterial, [side * 0.5, 0.48, 0.24], [-0.48, side * 0.3, 0]);
        rigBox(maleHorns, `${sideName}-sun-horn-tip`, [0.19, 0.19, 1.02], hornMaterial, [side * 0.78, 0.9, 0.9], [-1.0, side * 0.42, side * 0.08]);
        for (let tine = 0; tine < 3; tine += 1) rigBox(femaleHorns, `${sideName}-sun-tiara-tine-${tine + 1}`, [0.14, 0.42 + tine * 0.12, 0.14], tine === 2 ? sunwhiteMaterial : hornMaterial, [side * (0.28 + tine * 0.18), 0.62 + tine * 0.12, 0.18 + tine * 0.18], [-0.5, side * (0.15 + tine * 0.1), side * -0.05]);
      } else if (dragonType === "silver") {
        rigBox(maleHorns, `${sideName}-crescent-horn-outer`, [0.18, 0.24, 1.24], silverShadowMaterial, [side * 0.5, 0.52, 0.34], [-0.42, side * 0.46, side * 0.12]);
        rigBox(maleHorns, `${sideName}-crescent-horn-tip`, [0.13, 0.17, 0.82], hornMaterial, [side * 0.86, 0.88, 1.04], [-0.98, side * -0.28, side * -0.12]);
        rigBox(femaleHorns, `${sideName}-moon-sickle-outer`, [0.14, 0.2, 1.38], silverPlateMaterial, [side * 0.46, 0.54, 0.38], [-0.4, side * 0.24, side * 0.08]);
        rigBox(femaleHorns, `${sideName}-moon-sickle-tip`, [0.1, 0.14, 0.78], hornMaterial, [side * 0.7, 1.0, 1.22], [-0.9, side * -0.18, side * -0.1]);
      } else {
        rigBox(maleHorns, `${sideName}-straight-horn`, [0.24, 0.24, 1.25], hornMaterial, [side * 0.55, 0.43, 0.18], [-0.55, side * 0.12, side * 0.06]);
        const outer = rigBox(femaleHorns, `${sideName}-curved-horn-outer`, [0.22, 0.22, 0.92], hornMaterial, [side * 0.58, 0.34, 0.08], [-0.5, side * 0.42, side * 0.18]);
        rigBox(femaleHorns, `${sideName}-curved-horn-tip`, [0.18, 0.18, 0.62], hornMaterial, [side * 0.86, 0.62, 0.37], [-0.82, side * -0.2, side * -0.18]);
        outer.userData.sexMarker = "female";
      }
    }

    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const wingRoot = pivot(visual, `${sideName}-wing-root`, [side * (adultProfile.chest[0] * 0.44), 2.4, -0.64]);
      wingRoot.userData.side = side;
      wingRoot.userData.phase = side < 0 ? 0 : Math.PI;
      parts.wings.push(wingRoot);
      rigBox(wingRoot, `${sideName}-wing-upper-bone`, [adultProfile.wingUpper, 0.2, 0.26], hornMaterial, [side * adultProfile.wingUpper * 0.46, 0, 0], [0, 0, side * -0.1]);
      const wingForearm = pivot(wingRoot, `${sideName}-wing-forearm`, [side * adultProfile.wingUpper * 0.9, 0, 0]);
      rigBox(wingForearm, `${sideName}-wing-forearm-bone`, [adultProfile.wingForearm, 0.17, 0.24], hornMaterial, [side * adultProfile.wingForearm * 0.46, 0, 0.16], [0, -side * 0.08, side * -0.18]);
      rigBox(wingRoot, `${sideName}-inner-wing-membrane`, [adultProfile.wingUpper * 0.92, 0.045, adultProfile.wingDepth], membraneMaterial, [side * adultProfile.wingUpper * 0.41, -0.07, adultProfile.wingDepth * 0.35], [0.04, side * 0.12, side * -0.12]);
      rigBox(wingForearm, `${sideName}-outer-wing-membrane`, [adultProfile.wingForearm * 0.94, 0.04, adultProfile.wingDepth * 0.72], membraneMaterial, [side * adultProfile.wingForearm * 0.42, -0.06, adultProfile.wingDepth * 0.3], [0.03, side * -0.15, side * -0.18]);
      for (let finger = 0; finger < 3; finger += 1) {
        const fingerLength = adultProfile.wingForearm * (0.84 - finger * 0.09);
        const wingFinger = rigBox(wingForearm, `${sideName}-wing-finger-${finger + 1}`, [fingerLength, 0.08, 0.1], hornMaterial, [side * adultProfile.wingForearm * (0.4 - finger * 0.025), -0.04, 0.32 + finger * adultProfile.wingDepth * 0.22], [0, side * (0.18 + finger * 0.14), side * -0.17]);
        wingFinger.userData.dragonIdleAccent = true;
        wingFinger.userData.dragonIdlePhase = finger + (side < 0 ? 0 : 2.4);
      }
      if (dragonType === "steel") {
        rigBox(wingRoot, `${sideName}-wing-gear-hub`, [0.46, 0.46, 0.18], brassRivetMaterial, [side * 0.2, 0.02, 0], [Math.PI / 4, 0, Math.PI / 4]);
        for (let brace = 0; brace < 3; brace += 1) {
          rigBox(wingForearm, `${sideName}-wing-panel-brace-${brace + 1}`, [0.1, 0.09, 2.0 - brace * 0.25], brace % 2 ? steelDarkMaterial : steelPlateMaterial, [side * (0.28 + brace * 0.9), -0.02, 0.92 + brace * 0.24], [0, side * (0.15 + brace * 0.08), side * -0.15]);
          rigBox(wingForearm, `${sideName}-wing-brace-rivet-${brace + 1}`, [0.12, 0.12, 0.12], brassRivetMaterial, [side * (0.3 + brace * 0.9), 0.02, 0.08 + brace * 0.2]);
        }
      } else if (dragonType === "sea") {
        rigBox(wingRoot, `${sideName}-wing-pearl-node`, [0.32, 0.32, 0.12], glowMaterial, [side * 0.24, -0.02, 0], [Math.PI / 4, 0, Math.PI / 4]);
        for (let ray = 0; ray < 3; ray += 1) {
          rigBox(wingForearm, `${sideName}-ray-sail-rib-${ray + 1}`, [0.07, 0.07, 2.05 - ray * 0.22], ray % 2 ? seaGlassMaterial : reefMaterial, [side * (0.34 + ray * 0.88), -0.025, 0.88 + ray * 0.28], [0, side * (0.18 + ray * 0.1), side * -0.15]);
          rigBox(wingRoot, `${sideName}-ray-light-${ray + 1}`, [0.13, 0.08, 0.28], glowMaterial, [side * (0.72 + ray * 0.55), -0.11, 0.5 + ray * 0.52]);
        }
      } else if (dragonType === "gold") {
        const hub = rigBox(wingRoot, `${sideName}-solar-wing-hub`, [0.5, 0.5, 0.16], sunwhiteMaterial, [side * 0.22, -0.02, 0], [Math.PI / 4, 0, Math.PI / 4]);
        hub.userData.dragonShimmer = true;
        hub.userData.shimmerPhase = side < 0 ? 0.4 : 2.2;
        for (let tier = 0; tier < 4; tier += 1) {
          rigBox(wingForearm, `${sideName}-gilded-flight-feather-${tier + 1}`, [1.18 - tier * 0.13, 0.08, 1.18 + tier * 0.25], tier % 2 ? hornMaterial : goldPlateMaterial,
            [side * (0.34 + tier * 0.72), -0.11, 1.72 + tier * 0.28], [0.03, side * (-0.12 + tier * 0.09), side * (-0.2 - tier * 0.035)]);
          const vein = rigBox(wingForearm, `${sideName}-sunray-vein-${tier + 1}`, [0.12, 0.075, 1.65 - tier * 0.12], tier % 2 ? glowMaterial : sunwhiteMaterial,
            [side * (0.42 + tier * 0.72), -0.16, 0.82 + tier * 0.35], [0, side * (0.16 + tier * 0.1), side * -0.16]);
          vein.userData.dragonShimmer = true;
          vein.userData.shimmerPhase = tier * 0.7 + (side < 0 ? 0 : 2.5);
        }
      } else if (dragonType === "silver") {
        const hub = rigBox(wingRoot, `${sideName}-lunar-wing-hub`, [0.42, 0.42, 0.15], moonwhiteMaterial, [side * 0.22, -0.02, 0], [Math.PI / 4, 0, Math.PI / 4]);
        hub.userData.dragonShimmer = true;
        hub.userData.shimmerPhase = side < 0 ? 1.1 : 3.1;
        for (let panel = 0; panel < 4; panel += 1) {
          rigBox(wingForearm, `${sideName}-mirror-wing-blade-${panel + 1}`, [0.74 - panel * 0.08, 0.065, 1.42 + panel * 0.22], panel % 2 ? silverPlateMaterial : hornMaterial,
            [side * (0.4 + panel * 0.75), -0.12, 1.68 + panel * 0.22], [0.02, side * (0.05 + panel * 0.11), side * (-0.21 - panel * 0.04)]);
          const star = rigBox(wingForearm, `${sideName}-wing-star-${panel + 1}`, [0.16, 0.08, 0.16], panel % 2 ? starlightMaterial : moonwhiteMaterial,
            [side * (0.56 + panel * 0.7), -0.17, 0.55 + panel * 0.48], [0, 0, Math.PI / 4]);
          star.userData.dragonShimmer = true;
          star.userData.shimmerPhase = panel * 0.91 + (side < 0 ? 0.2 : 2.8);
        }
      }
      if (isFire) {
        // Scorched sails: charred fringe panels trail the membranes with a
        // molten burn line where the fire eats into each sail.
        for (let notch = 0; notch < 3; notch += 1) {
          rigBox(wingForearm, `${sideName}-wing-scorch-fringe-${notch + 1}`, [0.82 - notch * 0.16, 0.045, 0.88], charMaterial, [side * (0.4 + notch * 0.82), -0.08, 2.02 + notch * 0.12], [0.03, side * -0.13, side * -0.16]);
          rigBox(wingForearm, `${sideName}-wing-ember-seam-${notch + 1}`, [0.52 - notch * 0.08, 0.062, 0.12], lavaMaterial, [side * (0.4 + notch * 0.82), -0.06, 1.62 + notch * 0.1], [0.03, side * -0.13, side * -0.16]);
        }
        rigBox(wingRoot, `${sideName}-inner-wing-ember-seam`, [1.92, 0.062, 0.13], lavaMaterial, [side * 1.02, -0.07, 2.38], [0.04, side * 0.1, side * -0.1]);
        rigBox(wingRoot, `${sideName}-wing-thumb-claw`, [0.13, 0.13, 0.52], hornMaterial, [side * 2.28, 0.06, -0.3], [0.4, side * -0.3, 0]);
      }
      for (let spot = 0; spot < 4; spot += 1) {
        const mark = rigBox(wingRoot, `${sideName}-wing-mark-${spot + 1}`, [0.34 + spot * 0.06, 0.07, 0.34 + spot * 0.06], glowMaterial, [side * (0.68 + spot * 0.45), -0.12, 0.35 + spot * 0.42], [0, 0, Math.PI / 4]);
        mark.userData.sexMarker = "male";
        mark.visible = group.userData.dragonSex === "male";
      }
    }
    const maleMarkings = new THREE.Group();
    maleMarkings.name = `${prefix}-male-wing-markings`;
    maleMarkings.visible = group.userData.dragonSex === "male";
    visual.add(maleMarkings);

    for (const [front, z] of [[true, -0.92], [false, 1.12]] as const) {
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const positionName = `${front ? "front" : "rear"}-${sideName}`;
        const hip = pivot(visual, `${positionName}-hip`, [side * adultProfile.hipX, 1.7, z]);
        hip.userData.phase = (side < 0) !== front ? 0 : Math.PI;
        parts.legs.push(hip);
        rigBox(hip, `${positionName}-upper-leg`, [0.48 * adultProfile.legScale, 0.94 * adultProfile.legScale, 0.56 * adultProfile.legScale], bodyMaterial, [0, -0.42 * adultProfile.legScale, front ? -0.08 : 0.08], [front ? -0.14 : 0.14, 0, side * 0.06]);
        const knee = pivot(hip, `${positionName}-knee`, [0, -0.8 * adultProfile.legScale, front ? -0.12 : 0.14]);
        rigBox(knee, `${positionName}-lower-leg`, [0.34 * adultProfile.legScale, 0.9 * adultProfile.legScale, 0.4 * adultProfile.legScale], accentMaterial, [0, -0.42 * adultProfile.legScale, 0.02], [front ? 0.12 : -0.12, 0, 0]);
        if (isFire) rigBox(knee, `${positionName}-knee-ember-crack`, [0.44, 0.1, 0.1], lavaMaterial, [0, -0.14, -0.2]);
        if (dragonType === "steel") {
          rigBox(knee, `${positionName}-knee-plate`, [0.48, 0.24, 0.5], steelPlateMaterial, [0, -0.1, -0.08]);
          rigBox(knee, `${positionName}-piston-rod`, [0.16, 0.62, 0.16], brassRivetMaterial, [0, -0.46, -0.22]);
        } else if (dragonType === "sea") {
          const calfFin = rigBox(knee, `${positionName}-calf-fin`, [0.08, 0.52, 0.62], seaGlassMaterial, [side * 0.22, -0.38, 0.16], [-0.12, side * 0.2, side * 0.18]);
          calfFin.userData.aquaticFin = true;
        } else if (dragonType === "gold") {
          rigBox(knee, `${positionName}-sunscale-greave`, [0.48, 0.48, 0.5], goldPlateMaterial, [0, -0.24, -0.08], [0.08, 0, side * 0.06]);
          rigBox(knee, `${positionName}-sunspur`, [0.14, 0.52, 0.14], hornMaterial, [side * 0.22, -0.36, 0.22], [-0.32, 0, side * 0.28]);
        } else if (dragonType === "silver") {
          rigBox(knee, `${positionName}-mirror-greave`, [0.44, 0.36, 0.48], silverPlateMaterial, [0, -0.2, -0.08], [0.08, 0, side * 0.05]);
          rigBox(knee, `${positionName}-moonblade-spur`, [0.1, 0.6, 0.18], hornMaterial, [side * 0.22, -0.36, 0.18], [-0.42, 0, side * 0.3]);
        }
        const claw = pivot(knee, `${positionName}-claw`, [0, -0.8 * adultProfile.legScale, -0.08]);
        rigBox(claw, `${positionName}-foot`, [0.58 * adultProfile.legScale, 0.2 * adultProfile.legScale, 0.74 * adultProfile.legScale], bellyMaterial, [0, -0.04, -0.24 * adultProfile.legScale]);
        for (let toe = -1; toe <= 1; toe += 1) rigBox(claw, `${positionName}-talon-${toe + 2}`, [0.1 * adultProfile.legScale, 0.1 * adultProfile.legScale, 0.56 * adultProfile.legScale], hornMaterial, [toe * 0.17 * adultProfile.legScale, -0.07, -0.7 * adultProfile.legScale], [0.08, toe * -0.12, 0]);
      }
    }

    let tailParent: THREE.Object3D = visual;
    for (let segment = 1; segment <= DRAGON_MODEL_CONTRACT.tailSegments; segment += 1) {
      const tail = pivot(tailParent, `tail-${segment}`, segment === 1 ? [0, 1.9, 1.42] : [0, -0.015, adultProfile.tailStep * 0.78]);
      const width = adultProfile.tailWidth - segment * (adultProfile.tailWidth - 0.2) / 7.6;
      rigBox(tail, `tail-${segment}`, [Math.max(0.22, width), Math.max(0.24, width * 0.62), adultProfile.tailStep], segment % 2 ? bodyMaterial : accentMaterial, [0, 0, adultProfile.tailStep * 0.4], [-0.015 * segment, 0, 0]);
      if (segment < 6) rigBox(tail, `tail-${segment}-spine`, [0.13, Math.max(0.18, 0.5 - segment * 0.055), 0.22], isFire ? charMaterial : accentMaterial, [0, Math.max(0.23, width * 0.44), 0.4]);
      if (isFire && segment >= 4) rigBox(tail, `tail-${segment}-char-ring`, [Math.max(0.34, width + 0.06), Math.max(0.36, width * 0.67 + 0.06), 0.18], charMaterial, [0, 0, 0.47]);
      if (dragonType === "steel" && segment <= 5) {
        rigBox(tail, `tail-${segment}-armor-band`, [Math.max(0.32, width + 0.08), Math.max(0.32, width * 0.7 + 0.08), 0.16], segment % 2 ? steelPlateMaterial : brassRivetMaterial, [0, 0, 0.48]);
      } else if (dragonType === "sea" && segment >= 2 && segment <= 5) {
        for (const side of [-1, 1]) rigBox(tail, `tail-${segment}-${side < 0 ? "left" : "right"}-finlet`, [0.5, 0.06, 0.46], seaGlassMaterial, [side * Math.max(0.24, width * 0.46), 0, 0.48], [0, side * 0.4, side * 0.12]);
        rigBox(tail, `tail-${segment}-lateral-light`, [0.15, 0.12, 0.15], glowMaterial, [0, Math.max(0.18, width * 0.38), 0.5], [0, Math.PI / 4, Math.PI / 4]);
      } else if (dragonType === "gold" && segment <= 6) {
        rigBox(tail, `tail-${segment}-sun-band`, [Math.max(0.32, width + 0.08), Math.max(0.32, width * 0.69 + 0.08), 0.13], segment % 2 ? hornMaterial : goldPlateMaterial, [0, 0, 0.48], [0, 0, Math.PI / 4]);
        if (segment % 2 === 0) {
          const gem = rigBox(tail, `tail-${segment}-sun-gem`, [0.11, 0.11, 0.11], sunwhiteMaterial, [0, Math.max(0.2, width * 0.43), 0.49], [0, Math.PI / 4, Math.PI / 4]);
          gem.userData.dragonShimmer = true;
          gem.userData.shimmerPhase = segment * 0.66;
        }
      } else if (dragonType === "silver" && segment >= 2) {
        for (const side of [-1, 1]) rigBox(tail, `tail-${segment}-${side < 0 ? "left" : "right"}-mirror-fin`, [0.46, 0.055, 0.52], segment % 2 ? silverPlateMaterial : hornMaterial, [side * Math.max(0.22, width * 0.44), 0.02, 0.48], [0, side * 0.46, side * 0.1]);
      }
      tailParent = tail;
    }
    if (dragonType === "sea") {
      rigBox(tailParent, "sea-tail-fin-left", [1.88, 0.08, 1.52], membraneMaterial, [-0.76, 0.04, 0.64], [0, 0.52, 0.18]);
      rigBox(tailParent, "sea-tail-fin-right", [1.88, 0.08, 1.52], membraneMaterial, [0.76, 0.04, 0.64], [0, -0.52, -0.18]);
      for (let fin = 0; fin < 4; fin += 1) rigBox(visual, `sea-dorsal-fin-${fin + 1}`, [0.12, 0.65 + fin * 0.08, 0.55], membraneMaterial, [0, 2.75, -0.95 + fin * 0.68], [-0.12, 0, 0]);
    } else if (dragonType === "fire") {
      // Inferno tip: a bright core wrapped in leaning lava tongues, with
      // stray ember motes drifting off the burn.
      rigBox(tailParent, "tail-flame-core", [0.3, 0.72, 0.3], emberCoreMaterial, [0, 0.34, 0.88], [0.12, Math.PI / 4, 0]);
      for (let flame = 0; flame < 4; flame += 1) {
        const angle = (flame / 4) * TAU + 0.5;
        rigBox(tailParent, `tail-flame-${flame + 1}`, [0.17, 0.52 - (flame % 2) * 0.14, 0.17], flame % 2 ? glowMaterial : lavaMaterial,
          [Math.cos(angle) * 0.22, 0.3 + (flame % 2) * 0.14, 0.88 + Math.sin(angle) * 0.22],
          [Math.sin(angle) * 0.3, flame * 0.55, Math.cos(angle) * 0.3]);
      }
      for (let ember = 0; ember < 3; ember += 1) {
        rigBox(tailParent, `tail-ember-mote-${ember + 1}`, [0.09 - ember * 0.015, 0.09 - ember * 0.015, 0.09 - ember * 0.015], glowMaterial,
          [(ember % 2 ? 1 : -1) * (0.16 + ember * 0.09), 0.78 + ember * 0.26, 0.94 + ember * 0.06], [0.3, ember * 0.6, 0.3]);
      }
    } else if (dragonType === "gold") {
      const disc = rigBox(tailParent, "solar-tail-disc", [1.36, 1.36, 0.16], goldPlateMaterial, [0, 0.12, 0.74], [0, 0, Math.PI / 4]);
      disc.userData.tailHalo = true;
      const core = rigBox(tailParent, "solar-tail-core", [0.58, 0.58, 0.22], sunwhiteMaterial, [0, 0.12, 0.66], [0, Math.PI / 4, Math.PI / 4]);
      core.userData.dragonShimmer = true;
      core.userData.shimmerPhase = 1.7;
      for (let ray = 0; ray < 8; ray += 1) {
        const angle = ray / 8 * TAU;
        rigBox(tailParent, `solar-tail-ray-${ray + 1}`, [0.18, 0.72 + (ray % 2) * 0.24, 0.13], ray % 2 ? hornMaterial : glowMaterial, [Math.cos(angle) * 0.72, 0.12 + Math.sin(angle) * 0.72, 0.7], [0, 0, angle]);
      }
    } else if (dragonType === "silver") {
      for (const side of [-1, 1]) {
        rigBox(tailParent, `${side < 0 ? "left" : "right"}-lunar-tail-blade`, [0.34, 1.72, 0.16], side < 0 ? silverPlateMaterial : hornMaterial, [side * 0.48, 0.28, 0.82], [-0.38, side * 0.28, side * 0.44]);
        const tip = rigBox(tailParent, `${side < 0 ? "left" : "right"}-lunar-tail-star`, [0.22, 0.22, 0.2], moonwhiteMaterial, [side * 0.8, 0.82, 1.04], [0, Math.PI / 4, Math.PI / 4]);
        tip.userData.dragonShimmer = true;
        tip.userData.shimmerPhase = side < 0 ? 0.9 : 3.3;
      }
      rigBox(tailParent, "lunar-tail-crescent-bridge", [1.18, 0.18, 0.2], starlightMaterial, [0, -0.14, 0.82], [0, 0, 0.18]);
    } else {
      rigBox(tailParent, "steel-tail-hammer", [1.18, 0.72, 0.9], metalMaterial, [0, 0, 0.75], [0, Math.PI / 4, 0]);
      rigBox(tailParent, "steel-tail-hammer-core", [0.46, 0.46, 0.95], glowMaterial, [0, 0, 0.78], [0, Math.PI / 4, 0]);
      for (const side of [-1, 1]) rigBox(tailParent, `${side < 0 ? "left" : "right"}-hammer-rivet`, [0.16, 0.16, 0.16], brassRivetMaterial, [side * 0.5, 0.08, 0.78]);
    }

    const saddle = attachment("saddle");
    const saddleAccent = dragonType === "fire" ? lavaMaterial : dragonType === "steel" ? brassRivetMaterial : dragonType === "sea" ? seaGlassMaterial : dragonType === "gold" ? sunwhiteMaterial : moonwhiteMaterial;
    const saddleShell = dragonType === "fire" ? charMaterial : dragonType === "steel" ? steelPlateMaterial : dragonType === "sea" ? reefMaterial : dragonType === "gold" ? goldPlateMaterial : silverPlateMaterial;
    const seatWidth = dragonType === "steel" ? 1.62 : dragonType === "sea" || dragonType === "silver" ? 1.18 : 1.4;
    rigBox(saddle, "saddle-seat", [seatWidth, dragonType === "steel" ? 0.28 : 0.24, 1.28], leatherMaterial, [0, 2.58, 0.2], [-0.04, 0, 0]);
    rigBox(saddle, "saddle-spine", [seatWidth * 0.78, 0.14, 1.58], saddleShell, [0, 2.5, 0.24], [-0.04, 0, 0]);
    if (dragonType === "steel") {
      rigBox(saddle, "command-pommel", [1.28, 0.42, 0.22], brassRivetMaterial, [0, 2.82, -0.42]);
      for (const side of [-1, 1]) rigBox(saddle, `${side < 0 ? "left" : "right"}-control-lever`, [0.1, 0.52, 0.1], steelDarkMaterial, [side * 0.55, 2.9, -0.22], [-0.34, 0, side * 0.18]);
    } else if (dragonType === "sea") {
      rigBox(saddle, "tideglass-pommel", [0.86, 0.34, 0.2], seaGlassMaterial, [0, 2.78, -0.4], [0, 0, Math.PI / 4]);
      for (const side of [-1, 1]) rigBox(saddle, `${side < 0 ? "left" : "right"}-kelp-rein`, [0.08, 0.08, 1.65], reefMaterial, [side * 0.36, 2.48, -0.62], [0, side * 0.16, 0]);
    } else if (dragonType === "gold") {
      rigBox(saddle, "sun-throne-pommel", [1.08, 0.46, 0.18], goldPlateMaterial, [0, 2.84, -0.42]);
      for (const side of [-1, 1]) rigBox(saddle, `${side < 0 ? "left" : "right"}-sun-wing-rest`, [0.18, 0.58, 0.46], sunwhiteMaterial, [side * 0.68, 2.78, 0.0], [-0.2, side * 0.18, side * 0.32]);
    } else if (dragonType === "silver") {
      rigBox(saddle, "crescent-pommel", [1.0, 0.18, 0.2], moonwhiteMaterial, [0, 2.82, -0.43], [0, 0, 0.18]);
      for (const side of [-1, 1]) rigBox(saddle, `${side < 0 ? "left" : "right"}-moon-hook`, [0.12, 0.56, 0.18], silverPlateMaterial, [side * 0.52, 2.85, -0.35], [-0.4, side * 0.1, side * 0.28]);
    } else {
      rigBox(saddle, "obsidian-pommel", [1.08, 0.48, 0.18], charMaterial, [0, 2.86, -0.42]);
      rigBox(saddle, "ember-ward", [0.34, 0.34, 0.12], saddleAccent, [0, 2.86, -0.56], [0, 0, Math.PI / 4]);
    }
    for (const side of [-1, 1]) {
      rigBox(saddle, `${side < 0 ? "left" : "right"}-saddle-strap`, [0.1, 1.05, 1.0], leatherMaterial, [side * seatWidth * 0.53, 2.02, 0.22], [0, 0, side * 0.1]);
      rigBox(saddle, `${side < 0 ? "left" : "right"}-saddle-buckle`, [0.14, 0.18, 0.12], saddleAccent, [side * seatWidth * 0.56, 2.27, -0.18]);
    }

    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const cargo = attachment(`${sideName}-cargo`);
      const cargoWidth = dragonType === "steel" ? 1.02 : dragonType === "sea" ? 0.72 : 0.84;
      const cargoBody = dragonType === "fire" ? charMaterial : dragonType === "steel" ? steelDarkMaterial : dragonType === "sea" ? seaGlassMaterial : dragonType === "gold" ? goldShadowMaterial : silverShadowMaterial;
      rigBox(cargo, `${sideName}-cargo-chest`, [cargoWidth, 0.76, 1.18], cargoBody, [side * (adultProfile.chest[0] * 0.62 + cargoWidth * 0.45), 1.82, 0.68], [0.02, 0, side * 0.04]);
      rigBox(cargo, `${sideName}-cargo-lid`, [cargoWidth * 1.04, 0.14, 1.22], saddleShell, [side * (adultProfile.chest[0] * 0.62 + cargoWidth * 0.45), 2.24, 0.67]);
      rigBox(cargo, `${sideName}-cargo-latch`, [0.12, 0.24, 0.09], saddleAccent, [side * (adultProfile.chest[0] * 0.62 + cargoWidth), 2.0, 0.1]);
      if (dragonType === "sea") for (let knot = 0; knot < 3; knot += 1) rigBox(cargo, `${sideName}-cargo-kelp-knot-${knot + 1}`, [0.1, 0.1, 1.24], reefMaterial, [side * (adultProfile.chest[0] * 0.62 + cargoWidth * 0.45), 1.72 + knot * 0.25, 0.67], [0, 0, side * 0.14]);
      if (dragonType === "gold" || dragonType === "silver") {
        const sigil = rigBox(cargo, `${sideName}-cargo-sigil`, [0.22, 0.22, 0.07], saddleAccent, [side * (adultProfile.chest[0] * 0.62 + cargoWidth), 2.0, 0.58], [0, Math.PI / 4, Math.PI / 4]);
        sigil.userData.dragonShimmer = true;
        sigil.userData.shimmerPhase = side < 0 ? 0.4 : 2.4;
      }
    }

    const headArmor = attachment("head-armor", head);
    rigBox(headArmor, "head-armor-crown", [headWidth * 1.08, 0.2, adultProfile.head[2] * 0.7], saddleShell, [0, adultProfile.head[1] * 0.48, -adultProfile.head[2] * 0.35], [-0.1, 0, 0]);
    rigBox(headArmor, "head-armor-brow", [headWidth * 1.12, 0.26, 0.24], saddleAccent, [0, adultProfile.head[1] * 0.22, -adultProfile.head[2] * 0.73]);
    for (const side of [-1, 1]) rigBox(headArmor, `${side < 0 ? "left" : "right"}-head-armor-cheek`, [0.16, adultProfile.head[1] * 0.58, 0.64], armorMaterial, [side * headWidth * 0.52, -0.06, -adultProfile.head[2] * 0.35], [0.05, side * 0.08, side * 0.09]);
    const neckArmor = attachment("neck-armor", neckParent);
    for (let plate = 0; plate < 3; plate += 1) rigBox(neckArmor, `neck-armor-plate-${plate + 1}`, [adultProfile.neckWidth * (0.86 - plate * 0.08), 0.16, 0.54], plate % 2 ? saddleAccent : saddleShell, [0, adultProfile.neckHeight * 0.54, -0.2 - plate * 0.32], [-0.08 - plate * 0.02, 0, 0]);
    const bodyArmor = attachment("body-armor");
    for (let plate = 0; plate < 4; plate += 1) rigBox(bodyArmor, `body-armor-main-${plate + 1}`, [adultProfile.chest[0] * (0.96 - plate * 0.05), 0.18, 0.76], plate % 2 ? saddleShell : armorMaterial, [0, 2.48 - plate * 0.02, -0.9 + plate * 0.72], [-0.08 + plate * 0.025, 0, 0]);
    for (const side of [-1, 1]) rigBox(bodyArmor, `${side < 0 ? "left" : "right"}-body-armor-flank`, [0.2, adultProfile.chest[1] * 0.76, adultProfile.chest[2] * 0.7], saddleAccent, [side * adultProfile.chest[0] * 0.51, 1.94, -0.02], [0, 0, side * 0.1]);
    const tailArmor = attachment("tail-armor");
    for (let plate = 0; plate < 4; plate += 1) rigBox(tailArmor, `tail-armor-plate-${plate + 1}`, [Math.max(0.42, adultProfile.tailWidth - plate * 0.16), 0.18, 0.78], plate % 2 ? saddleAccent : saddleShell, [0, 2.38 - plate * 0.07, 1.78 + plate * adultProfile.tailStep * 0.76], [0.04 * plate, 0, plate % 2 ? 0.06 : -0.06]);

    if (dragonType === "gold") visual.scale.set(1.07, 1.04, 1.03);
    if (dragonType === "silver") visual.scale.set(0.94, 1.07, 1.1);
    finishDragonForms();
    applyDragonPose(group, { timeSeconds: 0.42, stage: 5, mode: "idle", movement: 0, sex: group.userData.dragonSex });
  };

  const atlantianNpc = kind.startsWith("atlantian-");
  const sugarcourtNpc = kind.startsWith("sugarcourt-");
  const woodElfNpc = kind.startsWith("wood-elf-");
  const dwarfNpc = kind.startsWith("dwarf-");
  const sentientNpc = kind.startsWith("hobbit-") || kind.startsWith("goblin-") || atlantianNpc || sugarcourtNpc || woodElfNpc || dwarfNpc;
  const buildAtlantianNpc = () => {
    const prefix = kind;
    const skin = material(0x4e9eaa);
    const skinShade = material(0x2c697c);
    const fin = material(0x76d9cc, false, 0.88);
    const pearl = material(0xe7fff5, true);
    const coral = material(0xe08a7e);
    const reefMetal = material(0x82b6bd);
    const darkReef = material(0x294555);
    const glow = material(0x63efda, true, 0.92);

    add(visual, [0.58, 0.76, 0.38], bodyMaterial, [0, 0.93, 0], "body", `${prefix}-current-tunic`);
    add(visual, [0.64, 0.18, 0.42], accentMaterial, [0, 0.6, 0], undefined, `${prefix}-waist-sash`);
    add(visual, [0.52, 0.54, 0.48], skin, [0, 1.54, -0.04], "head", `${prefix}-head`);
    add(visual, [0.28, 0.16, 0.23], skinShade, [0, 1.45, -0.35], undefined, `${prefix}-muzzle`);
    eyePair(0.155, 1.62, -0.295, 0.075, prefix);
    add(visual, [0.19, 0.045, 0.035], darkReef, [0, 1.37, -0.305], undefined, `${prefix}-mouth`);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      for (let slit = 0; slit < 3; slit += 1) {
        const gill = add(visual, [0.13, 0.025, 0.12], coral, [side * 0.29, 1.44 + slit * 0.075, -0.05], undefined, `${prefix}-${sideName}-gill-${slit + 1}`);
        gill.rotation.z = side * -0.18;
      }
      const earFin = add(visual, [0.28, 0.32, 0.045], fin, [side * 0.37, 1.59, -0.02], undefined, `${prefix}-${sideName}-ear-fin`);
      earFin.rotation.z = side * -0.35;
      const arm = pivotBox([0.17, 0.68, 0.18], skin, [side * 0.39, 1.17, 0], [0, -0.34, 0], "arms", `${prefix}-${sideName}-arm`);
      arm.userData.side = side;
      arm.userData.phase = side < 0 ? 0 : Math.PI;
      add(arm, [0.21, 0.2, 0.21], skinShade, [0, -0.72, -0.02], undefined, `${prefix}-${sideName}-webbed-hand`);
      const leg = pivotBox([0.2, 0.76, 0.22], accentMaterial, [side * 0.17, 0.56, 0.03], [0, -0.38, 0], "legs", `${prefix}-${sideName}-leg`);
      leg.userData.phase = side < 0 ? 0 : Math.PI;
      const footFin = add(leg, [0.34, 0.1, 0.46], fin, [0, -0.8, -0.12], undefined, `${prefix}-${sideName}-foot-fin`);
      footFin.rotation.y = side * -0.08;
    }
    for (let ridge = 0; ridge < 4; ridge += 1) {
      const crest = add(visual, [0.1, 0.24 + ridge * 0.025, 0.12], fin, [0, 1.82 + ridge * 0.06, -0.01 + ridge * 0.12], undefined, `${prefix}-crown-fin-${ridge + 1}`);
      crest.rotation.x = -0.12 + ridge * 0.05;
    }
    add(visual, [0.18, 0.42, 0.3], fin, [0, 0.83, 0.31], undefined, `${prefix}-back-fin`).rotation.x = -0.18;

    if (kind === "atlantian-tidewarden") {
      add(visual, [0.62, 0.1, 0.5], reefMetal, [0, 1.86, -0.01], undefined, `${prefix}-shell-circlet`);
      for (const side of [-1, 0, 1]) add(visual, [0.12, 0.22 + (side === 0 ? 0.12 : 0), 0.1], pearl, [side * 0.2, 2.01, -0.03], undefined, `${prefix}-crown-pearl-${side + 2}`);
      add(visual, [0.14, 0.82, 0.06], coral, [-0.15, 1.02, -0.22], undefined, `${prefix}-tidewarden-sash`).rotation.z = -0.28;
    } else if (kind === "atlantian-kelpkeeper") {
      add(visual, [0.56, 0.46, 0.18], material(0x56724c), [0, 0.95, 0.28], undefined, `${prefix}-woven-kelp-basket`);
      for (let frond = 0; frond < 3; frond += 1) add(visual, [0.07, 0.44, 0.08], material(0x76b968), [-0.18 + frond * 0.18, 1.33, 0.32], undefined, `${prefix}-kelp-frond-${frond + 1}`).rotation.z = (frond - 1) * 0.16;
    } else if (kind === "atlantian-coralwright") {
      add(visual, [0.54, 0.16, 0.44], reefMetal, [0, 1.86, 0], undefined, `${prefix}-wright-browguard`);
      add(visual, [0.1, 0.1, 0.92], material(0x6f5038), [0.26, 1.0, -0.48], undefined, `${prefix}-coral-hammer-handle`);
      add(visual, [0.48, 0.26, 0.24], coral, [0.26, 1.0, -0.98], undefined, `${prefix}-coral-hammer-head`);
    } else if (kind === "atlantian-pearlbroker") {
      add(visual, [0.5, 0.46, 0.19], material(0x6a5d84), [0, 0.96, 0.29], undefined, `${prefix}-shell-ledger-pack`);
      for (let bead = 0; bead < 5; bead += 1) add(visual, [0.1, 0.1, 0.1], pearl, [-0.24 + bead * 0.12, 1.2 - Math.abs(2 - bead) * 0.06, -0.23], undefined, `${prefix}-pearl-chain-${bead + 1}`);
    } else if (kind === "atlantian-glowmender") {
      add(visual, [0.48, 0.5, 0.21], darkReef, [0, 0.98, 0.3], undefined, `${prefix}-remedy-pack`);
      for (const [index, x, color] of [[1, -0.15, 0x68f0d7], [2, 0, 0x94b6ff], [3, 0.15, 0xd77cff]] as Array<[number, number, number]>) {
        add(visual, [0.11, 0.26, 0.11], material(color, true, 0.88), [x, 1.05, 0.44], undefined, `${prefix}-glow-vial-${index}`);
      }
      add(visual, [0.11, 0.11, 1.4], reefMetal, [-0.27, 1.1, -0.72], undefined, `${prefix}-mending-staff`);
      add(visual, [0.3, 0.3, 0.3], glow, [-0.27, 1.1, -1.49], undefined, `${prefix}-mending-light`).rotation.y = Math.PI / 4;
    } else if (kind === "atlantian-trident-guard") {
      add(visual, [0.64, 0.16, 0.52], reefMetal, [0, 1.89, 0], undefined, `${prefix}-guard-helm`);
      add(visual, [...ATLANTIAN_TRIDENT_CONTRACT.shaftSize], material(0x78927d), [0.25, 1.05, -0.88], undefined, `${prefix}-trident-shaft`);
      for (const side of [-1, 0, 1]) {
        add(visual, [...ATLANTIAN_TRIDENT_CONTRACT.pointSize], reefMetal, [0.25 + side * 0.18, 1.05, ATLANTIAN_TRIDENT_CONTRACT.centerPointForward + (side === 0 ? -0.08 : 0)], undefined, `${prefix}-trident-point-${side + 2}`);
      }
      add(visual, [0.5, 0.24, 0.08], fin, [0.25, 1.2, -1.7], undefined, `${prefix}-trident-streamer`);
    }
  };
  const buildSugarcourtNpc = () => {
    const prefix = kind;
    const candySkin = material(0xf0b5c9, false, 0.94);
    const candyShade = material(0xc77f9a);
    const cream = material(0xffe8ca);
    const cocoa = material(0x4b3040);
    const mint = material(0x7ad4b1);
    const gold = material(0xf2c65d, true);
    const copper = material(0xa96845);
    const glass = material(0xffc5df, true, 0.82);

    add(visual, [0.58, 0.66, 0.42], bodyMaterial, [0, 0.52, 0], "body", `${prefix}-sugarcoat`);
    add(visual, [0.64, 0.18, 0.46], accentMaterial, [0, 0.25, 0.02], undefined, `${prefix}-fondant-coat-skirt`);
    add(visual, [0.63, 0.09, 0.47], cocoa, [0, 0.47, 0], undefined, `${prefix}-wafer-belt`);
    add(visual, [0.14, 0.15, 0.07], gold, [0, 0.47, -0.255], undefined, `${prefix}-sugarcourt-seal`);
    add(visual, [0.54, 0.5, 0.48], candySkin, [0, 1.08, -0.03], "head", `${prefix}-glazed-head`);
    add(visual, [0.28, 0.17, 0.22], candyShade, [0, 0.99, -0.34], undefined, `${prefix}-candy-nose`);
    eyePair(0.16, 1.16, -0.29, 0.068, prefix);
    add(visual, [0.2, 0.045, 0.035], cocoa, [0, 0.91, -0.295], undefined, `${prefix}-mouth`);
    add(visual, [0.52, 0.15, 0.43], cream, [0, 1.33, 0], undefined, `${prefix}-icing-cap`);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(visual, [0.16, 0.2, 0.1], candySkin, [side * 0.31, 1.08, -0.01], undefined, `${prefix}-${sideName}-candy-ear`);
      add(visual, [0.11, 0.2, 0.11], glass, [side * 0.2, 1.42, -0.02], undefined, `${prefix}-${sideName}-sugar-curl`).rotation.z = side * -0.24;
      const leg = pivotBox([0.2, 0.48, 0.22], accentMaterial, [side * 0.17, 0.22, 0.02], [0, -0.24, 0], "legs", `${prefix}-${sideName}-leg`);
      leg.userData.phase = side < 0 ? 0 : Math.PI;
      add(leg, [0.31, 0.14, 0.4], cocoa, [0, -0.51, -0.08], undefined, `${prefix}-${sideName}-wafer-boot`);
      const arm = pivotBox([0.17, 0.56, 0.18], bodyMaterial, [side * 0.38, 0.82, 0], [0, -0.28, 0], "arms", `${prefix}-${sideName}-arm`);
      arm.userData.side = side;
      arm.userData.phase = side < 0 ? 0 : Math.PI;
      add(arm, [0.2, 0.2, 0.2], candySkin, [0, -0.61, 0], undefined, `${prefix}-${sideName}-hand`);
    }

    const rightArm = parts.arms.at(-1);
    const leftArm = parts.arms.at(-2);
    const readyHands = () => {
      if (rightArm) rightArm.rotation.x = 1.02;
      if (leftArm) leftArm.rotation.x = 0.88;
    };
    if (kind === "sugarcourt-crown-confectioner") {
      add(visual, [0.62, 0.1, 0.5], gold, [0, 1.43, 0], undefined, `${prefix}-spun-sugar-crown-band`);
      for (const side of [-1, 0, 1]) add(visual, [0.11, 0.28 + (side === 0 ? 0.12 : 0), 0.1], glass, [side * 0.2, 1.6, 0], undefined, `${prefix}-crown-spire-${side + 2}`);
      add(visual, [0.14, 0.72, 0.06], gold, [-0.13, 0.72, -0.24], undefined, `${prefix}-mayoral-ribbon`).rotation.z = -0.3;
      add(visual, [0.4, 0.33, 0.08], cocoa, [0.28, 0.48, -0.28], undefined, `${prefix}-borough-ledger`);
    } else if (kind === "sugarcourt-brittle-guard") {
      readyHands();
      add(visual, [0.64, 0.16, 0.5], cream, [0, 1.41, 0], undefined, `${prefix}-brittle-helm`);
      add(visual, [0.1, 0.1, 1.72], material(0xf4f0dd), [0.25, 0.72, -0.84], undefined, `${prefix}-peppermint-pike-shaft`);
      for (let stripe = 0; stripe < 4; stripe += 1) add(visual, [0.115, 0.115, 0.18], material(stripe % 2 ? 0xef5364 : 0xfff7e8), [0.25, 0.72, -0.22 - stripe * 0.38], undefined, `${prefix}-pike-stripe-${stripe + 1}`);
      add(visual, [0.18, 0.2, 0.42], mint, [0.25, 0.72, -1.82], undefined, `${prefix}-peppermint-pike-head`);
      add(visual, [0.5, 0.34, 0.08], cream, [0, 0.67, -0.25], undefined, `${prefix}-sugarplate-breast`);
    } else if (kind === "sugarcourt-gumdrop-gardener") {
      add(visual, [0.48, 0.52, 0.05], cream, [0, 0.53, -0.235], undefined, `${prefix}-garden-apron`);
      add(visual, [0.78, 0.09, 0.66], mint, [0, 1.39, 0], undefined, `${prefix}-leaf-hat-brim`);
      add(visual, [0.42, 0.22, 0.38], accentMaterial, [0, 1.51, 0.02], undefined, `${prefix}-gumdrop-hat-crown`);
      add(visual, [0.46, 0.38, 0.2], cocoa, [0, 0.58, 0.31], undefined, `${prefix}-gumdrop-basket`);
      for (let drop = 0; drop < 3; drop += 1) add(visual, [0.14, 0.16, 0.14], material([0xef6ea8, 0x72d2b2, 0xf0c55e][drop]), [-0.16 + drop * 0.16, 0.7, 0.42], undefined, `${prefix}-basket-gumdrop-${drop + 1}`);
    } else if (kind === "sugarcourt-sweetbroker") {
      add(visual, [0.5, 0.48, 0.06], cream, [0, 0.55, -0.235], undefined, `${prefix}-broker-waistcoat`);
      add(visual, [0.46, 0.35, 0.08], cocoa, [-0.27, 0.55, -0.28], undefined, `${prefix}-striped-ledger`);
      add(visual, [0.08, 0.7, 0.08], gold, [0.28, 0.65, -0.16], undefined, `${prefix}-scale-post`);
      add(visual, [0.54, 0.06, 0.12], gold, [0.28, 0.92, -0.16], undefined, `${prefix}-scale-beam`);
      for (const side of [-1, 1]) add(visual, [0.2, 0.07, 0.2], mint, [0.28 + side * 0.2, 0.72, -0.16], undefined, `${prefix}-${side < 0 ? "left" : "right"}-scale-pan`);
    } else if (kind === "sugarcourt-kennelkeeper") {
      add(visual, [0.5, 0.5, 0.05], mint, [0, 0.54, -0.235], undefined, `${prefix}-kennel-apron`);
      add(visual, [0.18, 0.18, 0.08], gold, [0, 0.67, -0.275], undefined, `${prefix}-paw-badge`);
      add(visual, [0.42, 0.26, 0.18], cocoa, [0.25, 0.45, 0.29], undefined, `${prefix}-treat-pouch`);
      for (const side of [-1, 1]) {
        const loop = add(visual, [0.055, 0.68, 0.055], material(side < 0 ? 0xd96f9f : 0x8c573e), [side * 0.23, 0.59, 0.31], undefined, `${prefix}-${side < 0 ? "hound" : "cat"}-lead-loop`);
        loop.rotation.z = side * 0.4;
      }
    } else if (kind === "sugarcourt-sugarboiler") {
      add(visual, [0.5, 0.52, 0.06], cream, [0, 0.54, -0.235], undefined, `${prefix}-boiler-apron`);
      add(visual, [0.5, 0.4, 0.25], copper, [0, 0.57, 0.34], undefined, `${prefix}-copper-kettle-pack`);
      add(visual, [0.34, 0.1, 0.28], material(0xb96835, true, 0.82), [0, 0.8, 0.36], undefined, `${prefix}-syrup-window`);
      add(visual, [0.08, 0.08, 0.96], copper, [0.28, 0.62, -0.36], undefined, `${prefix}-sugar-ladle-handle`);
      add(visual, [0.3, 0.12, 0.28], gold, [0.28, 0.62, -0.88], undefined, `${prefix}-sugar-ladle-bowl`);
    } else if (kind === "sugarcourt-candysmith") {
      readyHands();
      add(visual, [0.5, 0.54, 0.06], cocoa, [0, 0.55, -0.235], undefined, `${prefix}-smith-apron`);
      add(visual, [0.1, 0.1, 1.0], copper, [0.25, 0.69, -0.5], undefined, `${prefix}-candy-hammer-handle`);
      add(visual, [0.58, 0.3, 0.28], material(0xd76f9f), [0.25, 0.69, -1.05], undefined, `${prefix}-candy-hammer-head`);
      add(visual, [0.17, 0.17, 0.08], mint, [-0.15, 1.17, -0.29], undefined, `${prefix}-goggle-left`);
      add(visual, [0.17, 0.17, 0.08], mint, [0.15, 1.17, -0.29], undefined, `${prefix}-goggle-right`);
    }
  };
  const buildSentientNpc = () => {
    if (atlantianNpc) {
      buildAtlantianNpc();
      return;
    }
    if (sugarcourtNpc) {
      buildSugarcourtNpc();
      return;
    }
    const hobbit = kind.startsWith("hobbit-");
    const woodElf = kind.startsWith("wood-elf-");
    const dwarf = kind.startsWith("dwarf-");
    const prefix = kind;
    const skin = material(woodElf ? 0xb98e72 : dwarf ? 0xb87958 : hobbit ? 0xc9916c : 0x78924e);
    const skinShade = material(woodElf ? 0x8f6859 : dwarf ? 0x8f523f : hobbit ? 0xa96e52 : 0x526b3b);
    const hair = material(woodElf ? 0xd2d6d7 : dwarf ? 0x633a2a : hobbit ? 0x5b3827 : 0x342b26);
    const leather = material(0x5a3d2a);
    const spearWood = material(0x9b6a39);
    const metal = material(woodElf ? 0x7ddabd : dwarf ? 0xb77d49 : hobbit ? 0x8a8f86 : 0x727b72);
    const cloth = bodyMaterial;
    const trim = accentMaterial;
    const baseY = dwarf ? 0 : hobbit ? 0 : 0.05;
    const bodyWidth = dwarf ? 0.7 : hobbit ? 0.62 : 0.52;
    const bodyHeight = dwarf ? 0.58 : hobbit ? 0.62 : 0.72;
    const shoulderY = baseY + (dwarf ? 0.7 : hobbit ? 0.74 : 0.88);
    const headY = baseY + (dwarf ? 1 : hobbit ? 1.05 : 1.2);
    const legLength = dwarf ? 0.42 : hobbit ? 0.48 : 0.6;

    add(visual, [bodyWidth, bodyHeight, 0.42], cloth, [0, baseY + 0.56, 0], "body", `${prefix}-tunic`);
    add(visual, [bodyWidth + 0.05, 0.18, 0.46], trim, [0, baseY + 0.35, 0.01], undefined, `${prefix}-coat-skirt`);
    add(visual, [bodyWidth + 0.08, 0.09, 0.47], leather, [0, baseY + 0.51, 0], undefined, `${prefix}-belt`);
    add(visual, [0.12, 0.14, 0.06], metal, [0, baseY + 0.51, -0.255], undefined, `${prefix}-belt-buckle`);

    const headWidth = dwarf ? 0.62 : hobbit ? 0.56 : 0.5;
    add(visual, [headWidth, dwarf ? 0.5 : hobbit ? 0.48 : 0.52, hobbit ? 0.48 : 0.46], skin, [0, headY, -0.03], "head", `${prefix}-head`);
    if (woodElf) {
      const bridge = add(visual, [0.18, 0.15, 0.2], skinShade, [0, headY - 0.03, -0.35], undefined, `${prefix}-nose-bridge`);
      const tip = add(visual, [0.12, 0.1, 0.2], skin, [0, headY - 0.1, -0.49], undefined, `${prefix}-pointed-nose`);
      bridge.rotation.x = -0.12;
      tip.rotation.x = -0.35;
    } else add(visual, [dwarf ? 0.3 : hobbit ? 0.26 : 0.34, dwarf ? 0.2 : hobbit ? 0.17 : 0.23, 0.22], skinShade, [0, headY - 0.08, -0.34], undefined, `${prefix}-nose`);
    eyePair(dwarf ? 0.18 : hobbit ? 0.16 : 0.15, headY + 0.08, -0.285, dwarf || hobbit ? 0.062 : 0.068, prefix);
    add(visual, [0.2, 0.045, 0.035], material(hobbit || dwarf ? 0x6b3d35 : 0x3a2e28), [0, headY - 0.17, -0.292], undefined, `${prefix}-mouth`);

    if (hobbit || dwarf) {
      add(visual, [0.54, 0.16, 0.45], hair, [0, headY + 0.24, 0.01], undefined, `${prefix}-curly-hair-cap`);
      for (const side of [-1, 1]) {
        add(visual, [0.15, 0.17, 0.15], hair, [side * 0.27, headY + 0.1, 0.03], undefined, `${prefix}-${side < 0 ? "left" : "right"}-curl`);
        add(visual, [0.16, 0.17, 0.08], skin, [side * 0.32, headY, -0.01], undefined, `${prefix}-${side < 0 ? "left" : "right"}-ear`);
      }
      if (dwarf) {
        add(visual, [0.48, 0.5, 0.2], hair, [0, headY - 0.28, -0.17], undefined, `${prefix}-braided-beard`);
        for (const side of [-1, 1]) add(visual, [0.1, 0.4, 0.1], metal, [side * 0.17, headY - 0.5, -0.22], undefined, `${prefix}-${side < 0 ? "left" : "right"}-beard-clasp`);
      }
    } else {
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const ear = add(visual, [woodElf ? 0.27 : 0.36, 0.13, woodElf ? 0.18 : 0.24], skin, [side * 0.35, headY + 0.03, -0.02], undefined, `${prefix}-${sideName}-pointed-ear-base`);
        ear.rotation.z = side * -0.2;
        if (woodElf) {
          const tip = add(visual, [0.24, 0.085, 0.12], skin, [side * 0.53, headY + 0.08, -0.02], undefined, `${prefix}-${sideName}-pointed-ear-tip`);
          tip.rotation.z = side * -0.54;
        }
        if (!woodElf) add(visual, [0.08, 0.13, 0.05], material(0xe9d2a4), [side * 0.12, headY - 0.13, -0.31], undefined, `${prefix}-${side < 0 ? "left" : "right"}-tusk`).rotation.z = side * 0.18;
      }
      add(visual, [0.45, 0.12, 0.38], hair, [0, headY + 0.29, 0.03], undefined, `${prefix}-scalp`);
    }

    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const leg = pivotBox([0.2, legLength, 0.22], trim, [side * (dwarf ? 0.2 : hobbit ? 0.18 : 0.15), baseY + 0.28, 0.01], [0, -legLength / 2, 0], "legs", `${prefix}-${sideName}-leg`);
      leg.userData.phase = side < 0 ? 0 : Math.PI;
      add(leg, [hobbit || dwarf ? 0.34 : 0.26, 0.16, hobbit || dwarf ? 0.48 : 0.36], hobbit ? skin : leather, [0, -legLength - 0.03, -0.1], undefined, `${prefix}-${sideName}-${hobbit ? "broad-foot" : "boot"}`);
      const armLength = dwarf ? 0.5 : hobbit ? 0.54 : 0.62;
      const arm = pivotBox([0.16, armLength, 0.18], cloth, [side * (bodyWidth / 2 + 0.08), shoulderY, 0], [0, -armLength / 2, 0], "arms", `${prefix}-${sideName}-arm`);
      arm.userData.side = side;
      arm.userData.phase = side < 0 ? 0 : Math.PI;
      add(arm, [0.2, 0.2, 0.2], skin, [0, -(armLength + 0.05), 0], undefined, `${prefix}-${sideName}-hand`);
    }

    const rightArm = parts.arms.at(-1);
    const leftArm = parts.arms.at(-2);
    const readyHands = () => {
      if (rightArm) rightArm.rotation.x = 1.02;
      if (leftArm) leftArm.rotation.x = 0.88;
    };
    const addForwardHammer = () => {
      readyHands();
      add(visual, [...FACTION_WEAPON_CONTRACTS.hammer.handleSize], leather, [0.27, baseY + 0.68, -0.56], undefined, `${prefix}-hammer-handle`);
      add(visual, [...FACTION_WEAPON_CONTRACTS.hammer.headSize], metal, [0.27, baseY + 0.68, FACTION_WEAPON_CONTRACTS.hammer.headForward], undefined, `${prefix}-hammer-head`);
      add(visual, [0.18, 0.38, 0.22], trim, [0.27, baseY + 0.68, -1.17], undefined, `${prefix}-hammer-center`);
    };
    const addForwardCrossbow = () => {
      readyHands();
      add(visual, [...FACTION_WEAPON_CONTRACTS.crossbow.stockSize], leather, [0, baseY + 0.69, -0.57], undefined, `${prefix}-crossbow-stock`);
      add(visual, [...FACTION_WEAPON_CONTRACTS.crossbow.lathSize], metal, [0, baseY + 0.7, -1.02], undefined, `${prefix}-crossbow-lath`);
      add(visual, [0.035, 0.64, 0.04], material(0xe7ddbf), [0, baseY + 0.7, -1.04], undefined, `${prefix}-crossbow-string`).rotation.z = Math.PI / 2;
      add(visual, [...FACTION_WEAPON_CONTRACTS.crossbow.boltSize], material(0xa98454), [0, baseY + 0.76, -0.76], undefined, `${prefix}-loaded-bolt`);
      add(visual, [0.2, 0.13, 0.22], metal, [0, baseY + 0.76, FACTION_WEAPON_CONTRACTS.crossbow.boltTipForward], undefined, `${prefix}-bolt-head`);
    };
    const addForwardSpear = () => {
      readyHands();
      add(visual, [...FACTION_WEAPON_CONTRACTS.spear.shaftSize], spearWood, [0.25, baseY + 0.77, -0.78], undefined, `${prefix}-spear-shaft`);
      add(visual, [...FACTION_WEAPON_CONTRACTS.spear.headSize], metal, [0.25, baseY + 0.77, FACTION_WEAPON_CONTRACTS.spear.headForward], undefined, `${prefix}-spear-head`);
      add(visual, [0.32, 0.2, 0.06], trim, [0.25, baseY + 0.91, -1.58], undefined, `${prefix}-spear-pennant`).rotation.z = -0.18;
    };
    const addForwardPick = () => {
      readyHands();
      add(visual, [0.09, 0.09, 1.05], leather, [0.24, baseY + 0.7, -0.5], undefined, `${prefix}-pick-handle`);
      add(visual, [0.68, 0.12, 0.18], metal, [0.24, baseY + 0.7, -1.05], undefined, `${prefix}-pick-head`);
    };
    const addForwardHoe = () => {
      readyHands();
      add(visual, [0.09, 0.09, 1.02], leather, [0.24, baseY + 0.7, -0.52], undefined, `${prefix}-hoe-handle`);
      const blade = add(visual, [0.46, 0.12, 0.3], metal, [0.24, baseY + 0.72, -1.07], undefined, `${prefix}-hoe-blade`);
      blade.rotation.x = -0.24;
    };

    if (kind === "hobbit-hammer-guard") {
      addForwardHammer();
      add(visual, [0.64, 0.12, 0.52], metal, [0, headY + 0.3, -0.01], undefined, `${prefix}-helmet-brim`);
      add(visual, [0.48, 0.28, 0.43], metal, [0, headY + 0.4, 0.01], undefined, `${prefix}-helmet-crown`);
    } else if (kind === "hobbit-crossbow-guard") {
      addForwardCrossbow();
      add(visual, [0.62, 0.38, 0.5], trim, [0, headY + 0.2, 0.05], undefined, `${prefix}-hood`);
    } else if (kind === "goblin-spear-guard") {
      addForwardSpear();
      add(visual, [0.55, 0.16, 0.48], metal, [0, headY + 0.28, 0], undefined, `${prefix}-helmet`);
      add(visual, [0.12, 0.42, 0.14], trim, [0, headY + 0.55, 0.04], undefined, `${prefix}-helmet-crest`).rotation.z = -0.25;
    } else if (kind === "hobbit-miner" || kind === "goblin-miner") {
      addForwardPick();
      add(visual, [0.58, 0.14, 0.5], metal, [0, headY + 0.28, 0], undefined, `${prefix}-miner-helmet`);
      add(visual, [0.16, 0.16, 0.1], material(0xffdb69, true), [0, headY + 0.3, -0.29], undefined, `${prefix}-helmet-lamp`);
    } else if (kind === "hobbit-farmer" || kind === "goblin-worker") {
      add(visual, [0.46, 0.5, 0.05], material(0xe5d3a4), [0, baseY + 0.52, -0.235], undefined, `${prefix}-work-apron`);
      if (hobbit) {
        addForwardHoe();
        add(visual, [0.84, 0.1, 0.7], material(0xd8b560), [0, headY + 0.3, 0], undefined, `${prefix}-straw-hat-brim`);
        add(visual, [0.46, 0.24, 0.42], material(0xc89c4c), [0, headY + 0.43, 0.03], undefined, `${prefix}-straw-hat-crown`);
      } else {
        add(visual, [0.5, 0.22, 0.18], leather, [0, baseY + 0.64, 0.29], undefined, `${prefix}-seed-pouch`);
      }
    } else if (kind === "hobbit-banker") {
      readyHands();
      add(visual, [0.45, 0.5, 0.05], material(0xf1ead1), [0, baseY + 0.59, -0.235], undefined, `${prefix}-waistcoat-front`);
      add(visual, [0.4, 0.28, 0.08], material(0xd9b74e, true), [0.26, baseY + 0.47, -0.28], undefined, `${prefix}-gold-ledger`);
      add(visual, [0.15, 0.15, 0.08], metal, [-0.16, baseY + 0.78, -0.25], undefined, `${prefix}-spectacles-left`);
      add(visual, [0.15, 0.15, 0.08], metal, [0.16, baseY + 0.78, -0.25], undefined, `${prefix}-spectacles-right`);
    } else if (kind === "hobbit-merchant") {
      readyHands();
      add(visual, [0.52, 0.5, 0.2], leather, [0, baseY + 0.57, 0.3], undefined, `${prefix}-merchant-pack`);
      add(visual, [0.34, 0.4, 0.05], material(0xe7d4aa), [-0.26, baseY + 0.63, -0.25], undefined, `${prefix}-price-ledger`);
    } else if (kind === "hobbit-mayor") {
      readyHands();
      add(visual, [0.13, 0.75, 0.06], material(0xe2bf5b), [-0.14, baseY + 0.72, -0.24], undefined, `${prefix}-mayoral-sash`).rotation.z = -0.32;
      add(visual, [0.2, 0.2, 0.08], material(0xf0cf6a, true), [0.14, baseY + 0.64, -0.27], undefined, `${prefix}-town-seal`);
      add(visual, [0.44, 0.36, 0.08], leather, [0.27, baseY + 0.49, -0.28], undefined, `${prefix}-town-ledger`);
    } else if (kind === "goblin-chieftain") {
      addForwardSpear();
      add(visual, [0.64, 0.1, 0.54], metal, [0, headY + 0.29, 0], undefined, `${prefix}-key-crown`);
      for (const side of [-1, 0, 1]) add(visual, [0.08, 0.25 + (side === 0 ? 0.12 : 0), 0.08], metal, [side * 0.2, headY + 0.45, 0], undefined, `${prefix}-crown-key-${side + 2}`);
    } else if (kind === "goblin-alchemist") {
      add(visual, [0.46, 0.52, 0.22], leather, [0, baseY + 0.61, 0.31], undefined, `${prefix}-bottle-pack`);
      for (const [index, x, color] of [[1, -0.17, 0x7bdcc3], [2, 0, 0xe977b9], [3, 0.17, 0xf2c65b]] as Array<[number, number, number]>) {
        add(visual, [0.12, 0.25, 0.12], material(color, true, 0.86), [x, baseY + 0.7, 0.46], undefined, `${prefix}-bottle-${index}`);
      }
      add(visual, [0.18, 0.18, 0.08], metal, [-0.15, headY + 0.11, -0.28], undefined, `${prefix}-goggle-left`);
      add(visual, [0.18, 0.18, 0.08], metal, [0.15, headY + 0.11, -0.28], undefined, `${prefix}-goggle-right`);
    } else if (kind === "wood-elf-grovekeeper") {
      add(visual, [0.52, 0.48, 0.2], material(0x526a48), [0, baseY + 0.58, 0.3], undefined, `${prefix}-seed-satchel`);
      for (let pocket = 0; pocket < 3; pocket += 1) add(visual, [0.12, 0.18, 0.08], material(pocket === 1 ? 0x93edb3 : 0xb9a873, pocket === 1), [-0.18 + pocket * 0.18, baseY + 0.62, 0.43], undefined, `${prefix}-seed-pocket-${pocket + 1}`);
      add(visual, [0.08, 0.08, 0.72], material(0x718d72), [0.3, baseY + 0.62, -0.45], undefined, `${prefix}-moon-sickle-handle`);
      const sickle = add(visual, [0.1, 0.46, 0.08], material(0xc7f5da, true), [0.3, baseY + 0.76, -0.84], undefined, `${prefix}-moon-sickle-blade`);
      sickle.rotation.x = -0.34;
    } else if (kind === "wood-elf-potioner") {
      add(visual, [0.5, 0.46, 0.2], material(0x4b5c55), [0, baseY + 0.6, 0.3], undefined, `${prefix}-potion-satchel`);
      for (const [index, x, color] of [[1, -0.18, 0x79e8bb], [2, 0, 0xaaa8ff], [3, 0.18, 0xe9d479]] as Array<[number, number, number]>) {
        add(visual, [0.11, 0.25, 0.11], material(color, true, 0.88), [x, baseY + 0.66, 0.45], undefined, `${prefix}-moonwell-vial-${index}`);
      }
      add(visual, [0.16, 0.3, 0.16], material(0x8ff0c3, true, 0.88), [0.3, baseY + 0.58, -0.34], undefined, `${prefix}-held-vial`);
    } else if (kind === "wood-elf-moonbroker") {
      add(visual, [0.58, 0.54, 0.24], material(0x425950), [0, baseY + 0.6, 0.32], undefined, `${prefix}-merchant-pack`);
      add(visual, [0.34, 0.4, 0.06], material(0xe4dbb1), [-0.28, baseY + 0.62, -0.25], undefined, `${prefix}-living-ledger`);
      add(visual, [0.14, 0.14, 0.06], material(0xb9f1d5, true), [0.25, baseY + 0.6, -0.28], undefined, `${prefix}-moon-token`).rotation.y = Math.PI / 4;
    } else if (kind === "wood-elf-leafwarden" || kind === "wood-elf-tomekeeper" || kind === "wood-elf-elderweaver") {
      readyHands();
      add(visual, [0.1, 0.1, 1.75], material(0x627d78), [0.24, baseY + 0.82, -0.86], undefined, `${prefix}-moonbough-staff`);
      add(visual, [0.25, 0.25, 0.25], material(0x79e8bb, true, 0.9), [0.24, baseY + 0.82, -1.78], undefined, `${prefix}-staff-moonstone`).rotation.y = Math.PI / 4;
      for (let leaf = 0; leaf < 3; leaf += 1) {
        const blade = add(visual, [0.17, 0.045, 0.3], material(0x8ff0b2, true, 0.9), [0.24 + (leaf - 1) * 0.2, baseY + 0.82 + (leaf === 1 ? 0.14 : -0.02), -1.57 - Math.abs(leaf - 1) * 0.08], undefined, `${prefix}-verdant-leaf-${leaf + 1}`);
        blade.rotation.y = (leaf - 1) * 0.48;
        blade.rotation.z = (leaf - 1) * 0.22;
      }
      if (kind === "wood-elf-tomekeeper") add(visual, [0.36, 0.44, 0.08], material(0xaaa8ff, true, 0.82), [-0.31, baseY + 0.62, -0.3], undefined, `${prefix}-starlight-tome`);
      if (kind === "wood-elf-leafwarden") for (const side of [-1, 1]) add(visual, [0.28, 0.08, 0.34], material(0x6fc596), [side * 0.31, baseY + 1.16, 0], undefined, `${prefix}-${side < 0 ? "left" : "right"}-leaf-pauldrons`).rotation.z = side * 0.2;
      if (kind === "wood-elf-elderweaver") add(visual, [0.62, 0.08, 0.48], material(0xb7f1d5, true), [0, headY + 0.33, 0], undefined, `${prefix}-moonleaf-circlet`);
    } else if (kind === "wood-elf-bow-warden") {
      readyHands();
      const upper = add(visual, [0.08, 0.72, 0.08], material(0x6f8a7c), [0, baseY + 0.94, -0.95], undefined, `${prefix}-glimmerbow-upper`);
      upper.rotation.z = -0.48;
      const lower = add(visual, [0.08, 0.72, 0.08], material(0x6f8a7c), [0, baseY + 0.48, -0.95], undefined, `${prefix}-glimmerbow-lower`);
      lower.rotation.z = 0.48;
      add(visual, [0.035, 1.18, 0.035], material(0xcaffed, true), [0.28, baseY + 0.72, -0.95], undefined, `${prefix}-glimmerbow-string`);
      add(visual, [0.06, 0.06, 1.28], material(0x8bd9ba, true), [0, baseY + 0.72, -1.12], undefined, `${prefix}-glimmer-arrow`);
    } else if (kind === "dwarf-gatewarden" || kind === "dwarf-powderwright") {
      readyHands();
      add(visual, [0.19, 0.17, 0.82], material(0x7f593e), [0.08, baseY + 0.7, -0.62], undefined, `${prefix}-flintlock-stock`);
      add(visual, [0.12, 0.12, 1.2], material(0xa87947), [0.08, baseY + 0.76, -1.25], undefined, `${prefix}-flintlock-barrel`);
      add(visual, [0.22, 0.28, 0.18], metal, [0.08, baseY + 0.82, -0.92], undefined, `${prefix}-flintlock-lock`);
      add(visual, [0.1, 0.16, 0.08], material(0xffd774, true), [0.2, baseY + 0.94, -0.93], undefined, `${prefix}-flintlock-spark`);
    } else if (kind === "dwarf-delver") {
      addForwardPick();
      add(visual, [0.62, 0.14, 0.52], metal, [0, headY + 0.29, 0], undefined, `${prefix}-lantern-helm`);
      add(visual, [0.18, 0.18, 0.11], material(0xffdb69, true), [0, headY + 0.31, -0.3], undefined, `${prefix}-helm-lantern`);
    } else if (kind === "dwarf-gearwright" || kind === "dwarf-golemsmith") {
      addForwardHammer();
      for (let gear = 0; gear < 3; gear += 1) add(visual, [0.22 + gear * 0.05, 0.08, 0.22 + gear * 0.05], material(gear % 2 ? 0xc58b50 : 0x78989d), [-0.2 + gear * 0.2, baseY + 0.72, 0.28], undefined, `${prefix}-back-gear-${gear + 1}`).rotation.y = Math.PI / 4;
      if (kind === "dwarf-golemsmith") {
        add(visual, [0.32, 0.42, 0.06], material(0x8adfd8, true, 0.86), [-0.28, baseY + 0.65, -0.31], undefined, `${prefix}-aether-blueprint`);
        add(visual, [0.18, 0.18, 0.18], material(0x78f2ec, true), [0.27, baseY + 0.83, -0.28], undefined, `${prefix}-mana-key`).rotation.y = Math.PI / 4;
      } else {
        add(visual, [0.16, 0.16, 0.07], material(0x8eb5bb, true), [-0.15, headY + 0.1, -0.3], undefined, `${prefix}-lens-left`);
        add(visual, [0.16, 0.16, 0.07], material(0x8eb5bb, true), [0.15, headY + 0.1, -0.3], undefined, `${prefix}-lens-right`);
      }
    } else if (kind === "dwarf-provisioner") {
      add(visual, [0.66, 0.6, 0.28], material(0x6f4d36), [0, baseY + 0.62, 0.35], undefined, `${prefix}-supply-pack`);
      add(visual, [0.3, 0.36, 0.08], material(0xe1c17b), [-0.29, baseY + 0.6, -0.29], undefined, `${prefix}-stock-ledger`);
      add(visual, [0.18, 0.25, 0.18], material(0xffd875, true), [0.3, baseY + 0.63, -0.31], undefined, `${prefix}-held-lantern`);
    } else if (kind === "dwarf-thane") {
      add(visual, [0.66, 0.1, 0.52], metal, [0, headY + 0.31, 0], undefined, `${prefix}-gear-circlet`);
      for (const side of [-1, 0, 1]) add(visual, [0.1, 0.25 + (side === 0 ? 0.1 : 0), 0.1], material(0xe1b661), [side * 0.2, headY + 0.47, 0], undefined, `${prefix}-crown-tooth-${side + 2}`);
    }
    if (hobbit) visual.scale.set(1.07, 0.84, 1.02);
    if (dwarf) visual.scale.set(1.1, 0.88, 1.06);
  };

  if (kind === "fire-dragon" || kind === "ice-dragon" || kind === "steel-dragon" || kind === "sea-dragon" || kind === "gold-dragon" || kind === "silver-dragon") {
    buildDragon(kind);
  } else if (sentientNpc) {
    buildSentientNpc();
  } else if (kind === "glimmerhart") {
    const glow = material(0x9ffff0, true, 0.93);
    const bark = material(0x29483e);
    const deepBark = material(0x182d29);
    const leaf = material(0x6ab881);
    visual.userData.wildlifeRig = "glimmerhart";
    add(visual, [1.03, 0.72, 1.52], bodyMaterial, [0, 0.5, 0.18], "body", "glimmerhart-body");
    add(visual, [0.78, 0.86, 0.72], accentMaterial, [0, 0.62, -0.48], undefined, "glimmerhart-chest-mantle");
    add(visual, [0.76, 0.64, 0.68], bodyMaterial, [0, 0.53, 0.83], undefined, "glimmerhart-haunch");
    const head = pivotBox([0.68, 0.62, 0.72], accentMaterial, [0, 1.03, -0.9], [0, 0, 0], "head", "glimmerhart-head");
    add(head, [0.48, 0.3, 0.58], bark, [0, -0.16, -0.49], undefined, "glimmerhart-muzzle");
    add(head, [0.22, 0.1, 0.07], deepBark, [0, -0.14, -0.82], undefined, "glimmerhart-nose");
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.085, 0.1, 0.045], glow, [side * 0.21, 0.1, -0.38], undefined, `glimmerhart-${sideName}-eye`);
      const ear = childPivot(head, `glimmerhart-${sideName}-ear-pivot`, [side * 0.28, 0.21, -0.04]);
      add(ear, [0.42, 0.16, 0.3], leaf, [side * 0.17, 0.03, 0], undefined, `glimmerhart-${sideName}-leaf-ear`).rotation.z = side * -0.26;
    }
    groundedQuadrupedLegs("glimmerhart", "glimmerhart", 0.3, -0.42, 0.72, 0.23, 0.17, bark, deepBark, [0.22, 0.13, 0.31]);
    for (const [index, x, y, z] of [[1, -0.42, 0.78, -0.2], [2, 0.42, 0.8, -0.08], [3, -0.36, 0.76, 0.42], [4, 0.34, 0.8, 0.55]] as Array<[number, number, number, number]>) {
      const tuft = add(visual, [0.34, 0.12, 0.28], leaf, [x, y, z], undefined, `glimmerhart-leaf-mantle-${index}`);
      tuft.rotation.z = x * -0.45;
      tuft.rotation.y = Math.PI / 4;
    }
    for (const [index, z] of [-0.26, 0.08, 0.42].entries()) add(visual, [0.34, 0.05, 0.16], glow, [0, 0.87, z], undefined, `glimmerhart-moon-mark-${index + 1}`).rotation.y = Math.PI / 4;
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const root = childPivot(head, `glimmerhart-${sideName}-antler-pivot`, [side * 0.2, 0.25, 0.02]);
      const beam = add(root, [0.13, 1.0, 0.13], glow, [side * 0.18, 0.48, 0.04], undefined, `glimmerhart-${sideName}-antler-beam`);
      beam.rotation.z = side * -0.32;
      for (let tine = 0; tine < 4; tine += 1) {
        const branch = add(root, [0.1, 0.52 - tine * 0.055, 0.1], glow, [side * (0.27 + tine * 0.08), 0.28 + tine * 0.19, -0.03 + tine * 0.02], undefined, `glimmerhart-${sideName}-tine-${tine + 1}`);
        branch.rotation.z = side * -0.72;
      }
    }
    const tail = pivotBox([0.14, 0.15, 0.62], bark, [0, 0.66, 0.92], [0, 0, 0.27], "body", "glimmerhart-tail-root");
    tail.rotation.x = -0.28;
    add(tail, [0.44, 0.28, 0.4], leaf, [0, 0.04, 0.54], undefined, "glimmerhart-tail-leaf");
  } else if (kind === "runeowl") {
    // Rebuilt from two boxes and a pair of planks into a layered owl: a real
    // facial disc, a shoulder-to-primary wing chain, a fanned tail, and
    // articulated legs that end in gripping talons instead of floating pegs.
    visual.userData.wildlifeRig = "runeowl";
    const plumeMid = material(0x6f7099);
    const breastMaterial = material(0x8f8fc0);
    const discPale = material(0xd9d4ff);
    const beakMaterial = material(0xf3cc73);
    const beakDark = material(0xc79a4c);
    const talonMaterial = material(0xf2d17a);
    const talonDark = material(0xbe9142);
    const pupilMaterial = material(0x1e1b30);
    const glow = material(0xb5adff, true, 0.9);

    add(visual, [0.58, 0.56, 0.48], bodyMaterial, [0, 0.46, 0.02], "body", "runeowl-body");
    add(visual, [0.48, 0.32, 0.4], breastMaterial, [0, 0.28, -0.09], "body", "runeowl-breast");
    add(visual, [0.54, 0.32, 0.44], plumeMid, [0, 0.67, 0.06], "body", "runeowl-mantle");
    add(visual, [0.36, 0.3, 0.09], accentMaterial, [0, 0.42, -0.25], undefined, "runeowl-breast-plate");
    add(visual, [0.44, 0.24, 0.32], darkMaterial, [0, 0.34, 0.2], "body", "runeowl-rump");

    const head = childPivot(visual, "runeowl-head-pivot", [0, 0.8, -0.02]);
    add(head, [0.5, 0.4, 0.44], bodyMaterial, [0, 0.08, -0.02], "head", "runeowl-skull");
    add(head, [0.44, 0.12, 0.38], plumeMid, [0, 0.28, -0.02], "head", "runeowl-crown");
    add(head, [0.54, 0.48, 0.14], accentMaterial, [0, 0.05, -0.24], "head", "runeowl-face-disc");
    add(head, [0.09, 0.44, 0.08], discPale, [0, 0.05, -0.31], undefined, "runeowl-face-keel");
    add(head, [0.5, 0.09, 0.13], plumeMid, [0, 0.26, -0.25], undefined, "runeowl-brow");
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.22, 0.34, 0.09], discPale, [side * 0.17, 0.05, -0.3], undefined, `runeowl-${sideName}-face-ring`);
      add(head, [0.15, 0.15, 0.07], eyeMaterial, [side * 0.16, 0.07, -0.34], undefined, `runeowl-${sideName}-eye`);
      add(head, [0.07, 0.085, 0.03], pupilMaterial, [side * 0.16, 0.07, -0.38], undefined, `runeowl-${sideName}-pupil`);
      add(head, [0.1, 0.2, 0.13], plumeMid, [side * 0.26, -0.05, -0.18], undefined, `runeowl-${sideName}-cheek`);
      const tuft = childPivot(head, `runeowl-${sideName}-ear-pivot`, [side * 0.17, 0.26, -0.04]);
      add(tuft, [0.1, 0.17, 0.11], plumeMid, [0, 0.1, 0], undefined, `runeowl-${sideName}-ear-tuft`);
      add(tuft, [0.065, 0.15, 0.075], bodyMaterial, [side * 0.035, 0.24, 0.01], undefined, `runeowl-${sideName}-ear-tip`).rotation.z = side * 0.3;
    }
    add(head, [0.13, 0.12, 0.16], beakMaterial, [0, -0.06, -0.34], undefined, "runeowl-beak-upper").rotation.x = 0.34;
    add(head, [0.075, 0.09, 0.09], beakDark, [0, -0.13, -0.39], undefined, "runeowl-beak-tip").rotation.x = 0.5;
    add(head, [0.16, 0.06, 0.11], beakDark, [0, -0.14, -0.28], undefined, "runeowl-jaw");

    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(visual, [0.17, 0.26, 0.32], plumeMid, [side * 0.29, 0.63, 0.02], undefined, `runeowl-${sideName}-shoulder`);
      const wing = pivotBox([0.22, 0.16, 0.42], bodyMaterial, [side * 0.3, 0.6, 0.0], [side * 0.12, -0.01, 0], "wings", `runeowl-${sideName}-wing`);
      wing.rotation.z = side * 0.16;
      wing.userData.side = side;
      wing.userData.phase = 0;
      add(wing, [0.3, 0.12, 0.46], plumeMid, [side * 0.34, -0.03, 0.02], undefined, `runeowl-${sideName}-wing-covert`);
      add(wing, [0.26, 0.09, 0.36], bodyMaterial, [side * 0.6, -0.06, -0.03], undefined, `runeowl-${sideName}-wing-forearm`);
      add(wing, [0.12, 0.07, 0.16], discPale, [side * 0.43, 0.0, -0.19], undefined, `runeowl-${sideName}-alula`);
      for (let feather = 0; feather < 3; feather += 1) {
        const primary = add(
          wing,
          [0.34, 0.05, 0.13 - feather * 0.014],
          feather % 2 === 0 ? plumeMid : bodyMaterial,
          [side * (0.82 + feather * 0.015), -0.07 - feather * 0.012, -0.11 + feather * 0.13],
          undefined,
          `runeowl-${sideName}-primary-${feather + 1}`,
        );
        primary.rotation.y = side * (0.12 - feather * 0.11);
        primary.rotation.z = side * -0.06;
      }
    }

    const tail = childPivot(visual, "runeowl-tail-root-pivot", [0, 0.36, 0.26]);
    tail.rotation.x = 0.34;
    add(tail, [0.3, 0.13, 0.22], plumeMid, [0, -0.02, 0.08], undefined, "runeowl-tail-base");
    for (let feather = -1; feather <= 1; feather += 1) {
      const quill = add(tail, [0.15, 0.055, 0.42], feather === 0 ? bodyMaterial : plumeMid, [feather * 0.13, -0.03, 0.33], undefined, `runeowl-tail-feather-${feather + 2}`);
      quill.rotation.y = feather * 0.2;
      quill.rotation.x = -0.06;
    }

    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const leg = pivotBox([0.16, 0.19, 0.17], bodyMaterial, [side * 0.11, 0.26, -0.02], [0, -0.07, 0], "legs", `runeowl-${sideName}-leg`);
      leg.userData.side = side;
      leg.userData.phase = side < 0 ? 0 : Math.PI;
      add(leg, [0.115, 0.1, 0.115], plumeMid, [0, -0.18, 0], undefined, `runeowl-${sideName}-knee`);
      add(leg, [0.095, 0.14, 0.095], talonDark, [0, -0.27, -0.01], undefined, `runeowl-${sideName}-shank`);
      add(leg, [0.09, 0.07, 0.09], talonMaterial, [0, -0.355, -0.02], undefined, `runeowl-${sideName}-ankle`);
      add(leg, [0.12, 0.055, 0.14], talonMaterial, [0, -0.4, -0.05], undefined, `runeowl-${sideName}-foot`);
      for (const [toe, toeX] of [[1, -0.04], [2, 0], [3, 0.04]] as const) {
        const claw = add(leg, [0.035, 0.04, 0.13], talonDark, [toeX, -0.415, -0.15], undefined, `runeowl-${sideName}-talon-${toe}`);
        claw.rotation.y = toeX * 4.2;
        claw.rotation.x = 0.16;
      }
      add(leg, [0.033, 0.038, 0.1], talonDark, [0, -0.415, 0.06], undefined, `runeowl-${sideName}-hind-talon`).rotation.x = -0.2;
    }

    for (let rune = 0; rune < 4; rune += 1) {
      const glyph = add(visual, [0.11, 0.05, 0.05], glow, [-0.18 + rune * 0.12, 0.5 + (rune % 2) * 0.12, -0.31], undefined, `runeowl-rune-${rune + 1}`);
      glyph.rotation.z = rune * 0.42;
    }
    add(visual, [0.2, 0.06, 0.2], glow, [0, 0.8, 0.16], undefined, "runeowl-mantle-sigil").rotation.y = 0.5;
  } else if (kind === "copper-mole") {
    const copper = material(0xd28a54);
    const copperDark = material(0x71452f);
    const nose = material(0x372823);
    visual.userData.wildlifeRig = "copper-mole";
    add(visual, [0.98, 0.62, 1.22], bodyMaterial, [0, 0.25, 0.12], "body", "copper-mole-body");
    add(visual, [0.72, 0.58, 0.7], accentMaterial, [0, 0.29, -0.64], "head", "copper-mole-head");
    add(visual, [0.43, 0.28, 0.42], accentMaterial, [0, 0.16, -1.03], undefined, "copper-mole-snout");
    add(visual, [0.27, 0.2, 0.25], nose, [0, 0.17, -1.29], undefined, "copper-mole-nose");
    eyePair(0.21, 0.4, -1.01, 0.052, "copper-mole");
    for (let plate = 0; plate < 4; plate += 1) {
      const armor = add(visual, [0.82 - plate * 0.06, 0.16, 0.34], plate % 2 ? copperDark : copper, [0, 0.57 + (plate % 2) * 0.02, -0.24 + plate * 0.3], undefined, `copper-mole-back-plate-${plate + 1}`);
      armor.rotation.x = (plate - 1.5) * 0.08;
    }
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const paw = pivotBox([0.4, 0.18, 0.42], copper, [side * 0.43, 0.11, -0.52], [side * 0.1, -0.07, -0.1], "legs", `copper-mole-${sideName}-front-paw`);
      paw.rotation.z = side * 0.22;
      for (let claw = 0; claw < 3; claw += 1) add(paw, [0.06, 0.07, 0.34], material(0xe8cf9a), [side * (-0.1 + claw * 0.1), -0.07, -0.34], undefined, `copper-mole-${sideName}-claw-${claw + 1}`).rotation.x = -0.18;
      const rear = pivotBox([0.3, 0.17, 0.34], copperDark, [side * 0.4, 0.08, 0.47], [0, -0.08, 0], "legs", `copper-mole-${sideName}-rear-paw`);
      rear.rotation.z = side * 0.11;
      for (let whisker = 0; whisker < 3; whisker += 1) {
        const whisk = add(visual, [0.34, 0.025, 0.025], material(0xe6d8bb), [side * 0.31, 0.18 + whisker * 0.06, -1.23 + whisker * 0.025], undefined, `copper-mole-${sideName}-whisker-${whisker + 1}`);
        whisk.rotation.z = side * (-0.15 + whisker * 0.14);
        whisk.rotation.y = side * -0.24;
      }
    }
    for (let hair = 0; hair < 7; hair += 1) add(visual, [0.045, 0.26 + (hair % 2) * 0.09, 0.045], copperDark, [-0.35 + hair * 0.115, 0.68, -0.14 + (hair % 3) * 0.28], undefined, `copper-mole-guard-hair-${hair + 1}`).rotation.z = (hair - 3) * 0.09;
    add(visual, [0.2, 0.2, 0.34], copperDark, [0, 0.23, 0.8], undefined, "copper-mole-tail").rotation.x = -0.22;
  } else if ((kind as string) === "clockwork-hound-golem") {
    buildClockworkHoundGolem();
  } else if ((kind as string) === "webspinner-golem") {
    buildWebspinnerGolem();
  } else if (kind === "deepgear-courser-golem") {
    const brass = material(0xc08a4d);
    const darkSteel = material(0x3d484d);
    const piston = material(0xb8c4c4);
    const leather = material(0x4a3328);
    const core = material(0x7df1eb, true, 0.96);
    add(visual, [0.9, 0.7, 1.36], bodyMaterial, [0, 0.63, 0.12], "body", `${kind}-armored-body`);
    add(visual, [0.82, 0.54, 0.56], brass, [0, 0.72, -0.48], "body", `${kind}-chest-plate`);
    add(visual, [0.76, 0.58, 0.58], darkSteel, [0, 0.64, 0.64], "body", `${kind}-rear-housing`);
    const neck = add(visual, [0.48, 0.94, 0.46], darkSteel, [0, 1.16, -0.62], "body", `${kind}-neck-housing`);
    neck.rotation.x = -0.38;
    add(visual, [0.58, 0.46, 0.66], bodyMaterial, [0, 1.63, -1.01], "head", `${kind}-head`);
    add(visual, [0.42, 0.3, 0.58], brass, [0, 1.52, -1.55], undefined, `${kind}-muzzle-plate`);
    add(visual, [0.36, 0.16, 0.14], darkSteel, [0, 1.48, -1.91], undefined, `${kind}-intake-grille`);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(visual, [0.045, 0.15, 0.2], darkSteel, [side * 0.31, 1.72, -1.2], undefined, `${kind}-${sideName}-eye-housing`);
      add(visual, [0.05, 0.08, 0.12], core, [side * 0.338, 1.72, -1.23], undefined, `${kind}-${sideName}-aether-eye`);
      const antenna = add(visual, [0.12, 0.3, 0.15], brass, [side * 0.21, 1.99, -0.94], "head", `${kind}-${sideName}-antenna-ear`);
      antenna.rotation.z = side * -0.2;
      const gear = add(visual, [0.055, 0.42, 0.42], brass, [side * 0.485, 0.72, 0.31], undefined, `${kind}-${sideName}-drive-gear`);
      gear.rotation.x = Math.PI / 4;
      add(visual, [0.07, 0.16, 0.16], core, [side * 0.52, 0.72, 0.31], undefined, `${kind}-${sideName}-gear-core`);
    }
    add(visual, [0.34, 0.34, 0.08], core, [0, 0.75, -0.595], undefined, `${kind}-aether-flywheel`).rotation.z = Math.PI / 4;
    for (const [px, pz, phase, name] of [
      [-0.32, -0.43, 0, "front-left"], [0.32, -0.43, Math.PI, "front-right"],
      [-0.33, 0.56, Math.PI, "rear-left"], [0.33, 0.56, 0, "rear-right"],
    ] as Array<[number, number, number, string]>) {
      const leg = pivotBox([0.25, 0.54, 0.27], darkSteel, [px, 0.5, pz], [0, -0.27, 0], "legs", `${kind}-${name}-upper-piston`);
      leg.userData.phase = phase;
      add(leg, [0.13, 0.42, 0.14], piston, [0, -0.69, 0], undefined, `${kind}-${name}-piston-rod`);
      add(leg, [0.25, 0.2, 0.24], brass, [0, -0.82, 0], undefined, `${kind}-${name}-ankle-housing`);
      add(leg, [0.3, 0.13, 0.4], darkSteel, [0, -0.985, -0.05], undefined, `${kind}-${name}-traction-hoof`);
    }
    for (const [index, y, z] of [[1, 1.88, -0.76], [2, 1.68, -0.58], [3, 1.46, -0.4], [4, 1.24, -0.22]] as Array<[number, number, number]>) {
      const fin = add(visual, [0.15, 0.3, 0.28], brass, [0, y, z], undefined, `${kind}-mane-vent-${index}`);
      fin.rotation.x = -0.38;
      add(visual, [0.06, 0.11, 0.04], core, [0, y + 0.02, z - 0.15], undefined, `${kind}-mane-vent-light-${index}`);
    }
    const tail = pivotBox([0.2, 0.2, 0.62], darkSteel, [0, 0.82, 0.82], [0, -0.04, 0.29], "body", `${kind}-tail-boom`);
    tail.rotation.x = 0.42;
    add(tail, [0.3, 0.3, 0.32], brass, [0, -0.16, 0.66], undefined, `${kind}-tail-counterweight`);
    add(tail, [0.14, 0.14, 0.14], core, [0, -0.16, 0.86], undefined, `${kind}-tail-lamp`);
    const saddle = new THREE.Group();
    saddle.name = `${kind}-saddle`;
    saddle.visible = false;
    visual.add(saddle);
    add(saddle, [0.84, 0.1, 0.78], leather, [0, 1.02, 0.12], undefined, `${kind}-saddle-blanket`);
    add(saddle, [0.58, 0.24, 0.54], brass, [0, 1.17, 0.1], undefined, `${kind}-saddle-seat`);
    add(saddle, [0.09, 0.88, 0.1], leather, [-0.43, 0.62, 0.12], undefined, `${kind}-left-girth`);
    add(saddle, [0.09, 0.88, 0.1], leather, [0.43, 0.62, 0.12], undefined, `${kind}-right-girth`);
    visual.userData.saddleAnchor = [0, 1.12, 0.12];
  } else if (kind === "copper-scout-golem" || kind === "stone-bulwark-golem" || kind === "aetherforged-sentinel") {
    const bulwark = kind === "stone-bulwark-golem";
    const sentinel = kind === "aetherforged-sentinel";
    const scale = bulwark ? 1.4 : sentinel ? 1.75 : 1;
    const metal = material(sentinel ? 0x596a70 : bulwark ? 0x707676 : 0xb37448);
    const brass = material(0xc18b4f);
    const core = material(0x7df1eb, true, 0.94);
    add(visual, [0.92 * scale, 0.9 * scale, 0.62 * scale], metal, [0, 0.68 * scale, 0], "body", `${kind}-body`);
    add(visual, [0.62 * scale, 0.48 * scale, 0.52 * scale], brass, [0, 1.34 * scale, -0.04 * scale], "head", `${kind}-head`);
    add(visual, [0.34 * scale, 0.17 * scale, 0.06 * scale], core, [0, 1.4 * scale, -0.31 * scale], undefined, `${kind}-eye-lamp`);
    add(visual, [0.46 * scale, 0.09 * scale, 0.08 * scale], metal, [0, 1.55 * scale, -0.31 * scale], undefined, `${kind}-brow-visor`);
    add(visual, [0.38 * scale, 0.12 * scale, 0.11 * scale], metal, [0, 1.18 * scale, -0.3 * scale], undefined, `${kind}-lower-jaw-plate`);
    for (const side of [-1, 1]) add(visual, [0.12 * scale, 0.28 * scale, 0.09 * scale], metal, [side * 0.28 * scale, 1.34 * scale, -0.27 * scale], undefined, `${kind}-${side < 0 ? "left" : "right"}-cheek-guard`);
    add(visual, [0.34 * scale, 0.34 * scale, 0.1 * scale], core, [0, 0.75 * scale, -0.37 * scale], undefined, `${kind}-mana-core`).rotation.z = Math.PI / 4;
    add(visual, [0.58 * scale, 0.42 * scale, 0.18 * scale], metal, [0, 0.82 * scale, 0.41 * scale], undefined, `${kind}-back-service-housing`);
    add(visual, [0.4 * scale, 0.08 * scale, 0.05 * scale], brass, [0, 0.82 * scale, 0.51 * scale], undefined, `${kind}-back-service-seam`);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const leg = pivotBox([0.3 * scale, 0.8 * scale, 0.34 * scale], metal, [side * 0.3 * scale, 0.38 * scale, 0], [0, -0.4 * scale, 0], "legs", `${kind}-${side < 0 ? "left" : "right"}-leg`);
      leg.userData.phase = side < 0 ? 0 : Math.PI;
      add(leg, [0.4 * scale, 0.18 * scale, 0.4 * scale], brass, [0, -0.43 * scale, -0.03 * scale], undefined, `${kind}-${sideName}-knee-joint`);
      add(leg, [0.25 * scale, 0.34 * scale, 0.28 * scale], metal, [0, -0.65 * scale, -0.02 * scale], undefined, `${kind}-${sideName}-lower-leg`);
      add(leg, [0.36 * scale, 0.12 * scale, 0.38 * scale], brass, [0, -0.8 * scale, -0.05 * scale], undefined, `${kind}-${sideName}-ankle-cuff`);
      add(leg, [0.48 * scale, 0.2 * scale, 0.58 * scale], brass, [0, -0.86 * scale, -0.08 * scale], undefined, `${kind}-${sideName}-foot`);
      const arm = pivotBox([0.26 * scale, (bulwark ? 0.95 : 0.75) * scale, 0.3 * scale], metal, [side * 0.64 * scale, 0.95 * scale, 0], [0, -0.36 * scale, 0], "arms", `${kind}-${side < 0 ? "left" : "right"}-arm`);
      arm.userData.phase = side < 0 ? 0 : Math.PI;
      add(arm, [0.34 * scale, 0.18 * scale, 0.34 * scale], brass, [0, -0.42 * scale, 0], undefined, `${kind}-${sideName}-elbow-joint`);
      add(arm, [0.23 * scale, 0.3 * scale, 0.27 * scale], metal, [0, -0.58 * scale, 0], undefined, `${kind}-${sideName}-forearm`);
      add(arm, [0.38 * scale, 0.26 * scale, 0.42 * scale], brass, [0, -0.76 * scale, -0.04 * scale], undefined, `${kind}-${sideName}-hand-clamp`);
    }
    if (kind === "copper-scout-golem") {
      add(visual, [0.1, 0.52, 0.1], brass, [0, 1.78, 0], undefined, `${kind}-signal-mast`);
      add(visual, [0.2, 0.2, 0.2], core, [0, 2.05, 0], undefined, `${kind}-signal-lamp`).rotation.y = Math.PI / 4;
      add(visual, [0.58, 0.62, 0.24], metal, [0, 0.82, 0.42], undefined, `${kind}-survey-pack`);
    }
    if (bulwark) {
      for (const side of [-1, 1]) add(visual, [0.62 * scale, 0.32 * scale, 0.72 * scale], brass, [side * 0.66 * scale, 1.23 * scale, 0], undefined, `${kind}-${side < 0 ? "left" : "right"}-shoulder-slab`);
      add(visual, [0.16 * scale, 1.2 * scale, 1.05 * scale], metal, [-0.98 * scale, 0.68 * scale, -0.1 * scale], undefined, `${kind}-tower-shield`);
      for (let rivet = 0; rivet < 3; rivet += 1) add(visual, [0.08 * scale, 0.08 * scale, 0.08 * scale], core, [-1.08 * scale, (0.28 + rivet * 0.34) * scale, -0.66 * scale], undefined, `${kind}-shield-rivet-${rivet + 1}`);
    }
    if (sentinel) {
      for (let coil = 0; coil < 3; coil += 1) add(visual, [0.12 * scale, 0.12 * scale, 0.7 * scale], core, [-0.28 * scale + coil * 0.28 * scale, 1.0 * scale, 0.36 * scale], undefined, `${kind}-aether-coil-${coil + 1}`);
      for (const side of [-1, 1]) {
        const crest = add(visual, [0.14 * scale, 0.72 * scale, 0.26 * scale], core, [side * 0.42 * scale, 1.7 * scale, 0], undefined, `${kind}-${side < 0 ? "left" : "right"}-aether-crest`);
        crest.rotation.z = side * -0.28;
      }
      add(visual, [0.34 * scale, 0.34 * scale, 1.05 * scale], metal, [0.72 * scale, 1.02 * scale, -0.55 * scale], undefined, `${kind}-aether-projector`);
      add(visual, [0.18 * scale, 0.18 * scale, 0.52 * scale], core, [0.72 * scale, 1.02 * scale, -1.28 * scale], undefined, `${kind}-projector-focus`);
    }
  } else if (["mossling", "boglantern-mossling", "cindercone-mossling", "moonbloom-mossling", "moonbrawn-mossling"].includes(kind)) {
    buildMossling(kind as MosslingKind);
  } else if (["grotto-grazer", "lanternray", "prismtail-swift", "glassback-newt", "sailfin-skimmer", "ashnose-bat", "chimewing", "cinder-kite", "veinling"].includes(kind)) {
    const undergroundKind = kind as UndergroundMobKind;
    const glow = material(eyeColor, true, 0.92);
    const pale = material(accentColor, false, 0.82);
    visual.userData.wildlifeRig = undergroundKind;
    if (undergroundKind === "grotto-grazer") {
      const root = material(0x5c432c);
      const rootTip = material(0x8b6843);
      const moss = material(0x5e8d53);
      const lichen = material(0x9ab878);
      add(visual, [1.16, 0.72, 1.52], bodyMaterial, [0, 0.59, 0.14], "body", `${kind}-barrel-body`);
      add(visual, [1.02, 0.76, 0.66], accentMaterial, [0, 0.7, -0.48], "body", `${kind}-root-mantle`);
      add(visual, [0.94, 0.6, 0.62], bodyMaterial, [0, 0.58, 0.68], undefined, `${kind}-rounded-haunch`);
      add(visual, [0.92, 0.14, 1.08], lichen, [0, 0.97, 0.12], undefined, `${kind}-lichen-saddle`);
      add(visual, [0.92, 0.16, 0.58], root, [0, 0.35, -0.4], undefined, `${kind}-root-chest-band`);
      const head = pivotBox([0.74, 0.6, 0.7], bodyMaterial, [0, 0.98, -1.0], [0, 0, 0], "head", `${kind}-head`);
      add(head, [0.56, 0.3, 0.48], rootTip, [0, -0.14, -0.47], undefined, `${kind}-split-lip-muzzle`);
      add(head, [0.34, 0.13, 0.16], darkMaterial, [0, -0.11, -0.72], undefined, `${kind}-velvet-nose`);
      add(head, [0.18, 0.08, 0.09], lichen, [0, -0.28, -0.55], undefined, `${kind}-lichen-chin`);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        add(head, [0.075, 0.09, 0.04], glow, [side * 0.22, 0.08, -0.38], undefined, `${kind}-${sideName}-eye`);
        add(head, [0.17, 0.05, 0.05], darkMaterial, [side * 0.21, 0.18, -0.36], undefined, `${kind}-${sideName}-brow-root`).rotation.z = side * -0.14;
        const horn = add(head, [0.1, 0.62, 0.11], root, [side * 0.25, 0.44, -0.02], undefined, `${kind}-${sideName}-root-horn`);
        horn.rotation.z = side * -0.34;
        for (let tine = 0; tine < 2; tine += 1) {
          const branch = add(head, [0.27 - tine * 0.04, 0.075, 0.08], rootTip, [side * (0.33 + tine * 0.04), 0.43 + tine * 0.18, -0.04 + tine * 0.04], undefined, `${kind}-${sideName}-antler-tine-${tine + 1}`);
          branch.rotation.z = side * (-0.34 - tine * 0.12);
          add(head, [0.09, 0.11, 0.09], tine ? glow : lichen, [side * (0.46 + tine * 0.04), 0.51 + tine * 0.17, -0.04], undefined, `${kind}-${sideName}-antler-bud-${tine + 1}`).rotation.y = Math.PI / 4;
        }
        add(head, [0.34, 0.12, 0.24], moss, [side * 0.43, 0.35, -0.08], undefined, `${kind}-${sideName}-leaf-ear`).rotation.z = side * -0.2;
      }
      quadrupedLegs(0.35, -0.5, 0.55, 0.47, 0.66, 0.2, root, kind);
      for (const [index, x, z] of [[1, -0.34, -0.15], [2, 0.32, 0.12], [3, -0.2, 0.48]] as const) {
        add(visual, [0.42, 0.13, 0.34], index === 2 ? lichen : moss, [x, 1.0, z], undefined, `${kind}-back-moss-${index}`).rotation.y = Math.PI / 4;
        add(visual, [0.09, 0.32, 0.09], index === 2 ? glow : root, [x * 0.8, 1.12, z], undefined, `${kind}-back-root-${index}`);
        add(visual, [0.22, 0.06, 0.2], index === 2 ? glow : accentMaterial, [x * 0.8, 1.3, z], undefined, `${kind}-back-cap-${index}`).rotation.y = Math.PI / 4;
      }
      const tail = pivotBox([0.12, 0.12, 0.5], root, [0, 0.73, 0.82], [0, 0, 0.24], "body", `${kind}-tail-root`);
      tail.rotation.x = 0.42;
      add(tail, [0.32, 0.28, 0.22], moss, [0, 0.08, 0.5], undefined, `${kind}-tail-moss-brush`);
    } else if (undergroundKind === "lanternray") {
      const membrane = material(accentColor, false, 0.68);
      const deepMembrane = material(0x244957, false, 0.84);
      add(visual, [0.62, 0.2, 1.28], bodyMaterial, [0, 0.04, 0.04], "body", `${kind}-spindle-body`);
      add(visual, [0.5, 0.13, 0.78], deepMembrane, [0, 0.17, 0.02], undefined, `${kind}-dorsal-keel`);
      add(visual, [0.5, 0.24, 0.48], accentMaterial, [0, 0.08, -0.64], "head", `${kind}-lantern-brow`);
      add(visual, [0.28, 0.1, 0.38], pale, [0, -0.06, -0.92], undefined, `${kind}-filter-mouth`);
      eyePair(0.17, 0.18, -0.86, 0.055, kind);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const wing = pivotBox([0.84, 0.055, 1.12], membrane, [side * 0.24, 0.06, 0], [side * 0.38, 0, 0.03], "wings", `${kind}-${sideName}-fin`);
        wing.rotation.z = side * -0.08;
        wing.userData.side = side;
        wing.userData.phase = 0;
        const wingTip = add(wing, [0.56, 0.045, 0.82], deepMembrane, [side * 0.72, -0.015, 0.12], undefined, `${kind}-${sideName}-swept-fin-tip`);
        wingTip.rotation.y = side * -0.22;
        add(wing, [0.08, 0.07, 1.04], pale, [side * 0.16, 0.03, 0.02], undefined, `${kind}-${sideName}-leading-ray`).rotation.y = side * -0.12;
        for (let mote = 0; mote < 3; mote += 1) add(wing, [0.12 - mote * 0.015, 0.045, 0.12], glow, [side * (0.28 + mote * 0.22), -0.045, -0.28 + mote * 0.3], undefined, `${kind}-${sideName}-wing-mote-${mote + 1}`).rotation.y = Math.PI / 4;
        add(visual, [0.22, 0.16, 0.25], glow, [side * 0.27, -0.11, -0.42], undefined, `${kind}-${sideName}-lantern-organ`);
        const lobe = add(visual, [0.18, 0.08, 0.44], accentMaterial, [side * 0.19, -0.06, -0.8], undefined, `${kind}-${sideName}-cephalic-lobe`);
        lobe.rotation.y = side * -0.28;
      }
      const tail = pivotBox([0.11, 0.09, 1.34], darkMaterial, [0, 0.04, 0.5], [0, 0, 0.66], "body", `${kind}-tail`);
      for (let band = 0; band < 4; band += 1) add(tail, [0.16 + band * 0.025, 0.05, 0.1], band % 2 ? glow : accentMaterial, [0, 0, 0.24 + band * 0.28], undefined, `${kind}-tail-band-${band + 1}`);
      for (const side of [-1, 1]) {
        const streamer = add(tail, [0.06, 0.055, 0.72], side < 0 ? pale : glow, [side * 0.15, 0, 1.24], undefined, `${kind}-${side < 0 ? "left" : "right"}-tail-streamer`);
        streamer.rotation.y = side * 0.22;
      }
    } else if (undergroundKind === "prismtail-swift") {
      const violet = material(0x7866cb);
      const prismBlue = material(0x71d9ec, false, 0.86);
      const prismRose = material(0xf3a9c8, false, 0.86);
      add(visual, [0.38, 0.38, 0.82], bodyMaterial, [0, 0.02, 0.05], "body", `${kind}-streamlined-body`);
      add(visual, [0.34, 0.26, 0.42], violet, [0, 0.02, -0.5], "head", `${kind}-hooded-head`);
      add(visual, [0.2, 0.1, 0.34], glow, [0, -0.03, -0.79], undefined, `${kind}-crystal-beak`);
      add(visual, [0.28, 0.18, 0.36], pale, [0, -0.2, -0.2], undefined, `${kind}-bright-breast`);
      eyePair(0.12, 0.09, -0.7, 0.055, kind);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const wing = pivotBox([0.72, 0.055, 0.42], violet, [side * 0.17, 0.08, -0.05], [side * 0.34, 0, -0.05], "wings", `${kind}-${sideName}-wing`);
        wing.rotation.z = side * -0.22;
        wing.userData.side = side;
        wing.userData.phase = 0;
        for (let feather = 0; feather < 4; feather += 1) {
          const featherMaterial = [prismBlue, pale, prismRose, glow][feather];
          const primary = add(wing, [0.48 - feather * 0.045, 0.045, 0.18], featherMaterial, [side * (0.52 + feather * 0.19), -0.015, 0.05 + feather * 0.14], undefined, `${kind}-${sideName}-prismatic-primary-${feather + 1}`);
          primary.rotation.y = side * (-0.2 - feather * 0.08);
        }
        add(wing, [0.08, 0.06, 0.76], glow, [side * 0.18, 0.025, 0.08], undefined, `${kind}-${sideName}-light-splitter`).rotation.y = side * -0.18;
      }
      const tail = pivotBox([0.12, 0.1, 0.72], darkMaterial, [0, 0.01, 0.43], [0, 0, 0.34], "body", `${kind}-tail`);
      const tailMaterials = [prismBlue, violet, glow, prismRose, pale];
      for (let fan = -2; fan <= 2; fan += 1) {
        const feather = add(tail, [0.16, 0.055, 0.64 - Math.abs(fan) * 0.05], tailMaterials[fan + 2], [fan * 0.14, 0, 0.76], undefined, `${kind}-prism-tail-feather-${fan + 3}`);
        feather.rotation.y = fan * 0.2;
      }
      for (const side of [-1, 1]) {
        add(visual, [0.07, 0.18, 0.08], darkMaterial, [side * 0.1, -0.25, 0.08], "legs", `${kind}-${side < 0 ? "left" : "right"}-tucked-foot`).rotation.x = 0.42;
      }
    } else if (undergroundKind === "glassback-newt") {
      const glass = material(0xb7f1db, false, 0.62);
      const glassEdge = material(0xe8fff4, true, 0.78);
      add(visual, [0.5, 0.3, 1.14], bodyMaterial, [0, 0.24, 0.08], "body", `${kind}-soft-body`);
      add(visual, [0.6, 0.34, 0.5], accentMaterial, [0, 0.25, -0.58], "head", `${kind}-broad-head`);
      add(visual, [0.4, 0.16, 0.34], pale, [0, 0.17, -0.88], undefined, `${kind}-flat-snout`);
      add(visual, [0.34, 0.1, 0.28], glow, [0, 0.06, -0.84], undefined, `${kind}-luminous-throat`);
      eyePair(0.19, 0.35, -0.82, 0.065, kind);
      for (let plate = 0; plate < 7; plate += 1) {
        const height = 0.16 + Math.sin((plate + 1) / 8 * Math.PI) * 0.18;
        const plateMesh = add(visual, [0.28 - Math.abs(3 - plate) * 0.012, height, 0.14], glass, [0, 0.43 + height / 2, -0.4 + plate * 0.18], undefined, `${kind}-glass-plate-${plate + 1}`);
        plateMesh.rotation.x = (plate - 3) * 0.035;
        add(visual, [0.08, height * 0.82, 0.05], glassEdge, [0, 0.44 + height / 2, -0.47 + plate * 0.18], undefined, `${kind}-glass-plate-edge-${plate + 1}`).rotation.x = plateMesh.rotation.x;
      }
      for (const side of [-1, 1]) for (let spot = 0; spot < 3; spot += 1) add(visual, [0.08, 0.055, 0.12], glassEdge, [side * 0.23, 0.34, -0.15 + spot * 0.31], undefined, `${kind}-${side < 0 ? "left" : "right"}-mineral-spot-${spot + 1}`).rotation.y = Math.PI / 4;
      for (const [x, z, phase, name] of [[-0.3, -0.34, 0, "front-left"], [0.3, -0.34, Math.PI, "front-right"], [-0.28, 0.42, Math.PI, "rear-left"], [0.28, 0.42, 0, "rear-right"]] as const) {
        const leg = pivotBox([0.32, 0.1, 0.32], accentMaterial, [x, 0.2, z], [Math.sign(x) * 0.12, -0.04, 0], "legs", `${kind}-${name}-leg`);
        leg.userData.phase = phase;
        const side = Math.sign(x);
        add(leg, [0.24, 0.055, 0.18], pale, [side * 0.3, -0.09, -0.08], undefined, `${kind}-${name}-webbed-foot`);
        for (let toe = -1; toe <= 1; toe += 1) add(leg, [0.035, 0.04, 0.18], glassEdge, [side * 0.36, -0.095, -0.12 + toe * 0.08], undefined, `${kind}-${name}-toe-${toe + 2}`).rotation.y = side * toe * 0.12;
      }
      const tail = add(visual, [0.24, 0.2, 0.98], bodyMaterial, [0, 0.22, 1.0], "body", `${kind}-tail`); tail.rotation.x = 0.08;
      add(visual, [0.08, 0.38, 0.72], glass, [0, 0.34, 1.08], undefined, `${kind}-tail-glass-keel`).rotation.x = -0.12;
      for (const side of [-1, 1]) for (let gill = 0; gill < 3; gill += 1) {
        const sideName = side < 0 ? "left" : "right";
        const filament = add(visual, [0.055, 0.24 + gill * 0.03, 0.08], glow, [side * (0.31 + gill * 0.045), 0.29 + gill * 0.035, -0.58 + gill * 0.08], undefined, `${kind}-${sideName}-gill-${gill + 1}`);
        filament.rotation.z = side * (-0.48 - gill * 0.08);
        add(visual, [0.11, 0.07, 0.09], glassEdge, [side * (0.4 + gill * 0.065), 0.4 + gill * 0.05, -0.58 + gill * 0.08], undefined, `${kind}-${sideName}-gill-tip-${gill + 1}`).rotation.y = Math.PI / 4;
      }
    } else if (undergroundKind === "sailfin-skimmer") {
      const copper = material(0xd79c4e);
      const sailGlass = material(0xa7f7ea, false, 0.72);
      const ink = material(0x1d4656);
      add(visual, [0.44, 0.36, 1.54], bodyMaterial, [0, 0, 0.02], "body", `${kind}-streamlined-body`);
      add(visual, [0.5, 0.36, 0.5], bodyMaterial, [0, 0.04, -0.83], "head", `${kind}-wedge-head`);
      add(visual, [0.54, 0.1, 0.34], copper, [0, 0.2, -0.86], undefined, `${kind}-copper-brow`);
      add(visual, [0.3, 0.13, 0.34], pale, [0, -0.06, -1.14], undefined, `${kind}-surface-skimming-snout`);
      add(visual, [0.28, 0.16, 0.78], ink, [0, -0.22, 0.02], undefined, `${kind}-water-keel`);
      eyePair(0.18, 0.13, -1.06, 0.06, kind);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        add(visual, [0.08, 0.08, 0.46], copper, [side * 0.24, 0.05, -0.82], undefined, `${kind}-${sideName}-cheek-current-line`).rotation.y = side * -0.18;
        const fin = pivotBox([0.54, 0.055, 0.52], accentMaterial, [side * 0.18, -0.05, -0.1], [side * 0.29, 0, 0], "wings", `${kind}-${sideName}-fin`);
        fin.rotation.z = side * 0.15;
        fin.userData.side = side;
        fin.userData.phase = 0;
        const pennant = add(fin, [0.44, 0.045, 0.3], sailGlass, [side * 0.45, 0, 0.2], undefined, `${kind}-${sideName}-fin-pennant`);
        pennant.rotation.y = side * -0.24;
      }
      const sail = childPivot(visual, `${kind}-dorsal-sail-pivot`, [0, 0.22, 0.03]);
      const sailHeights = [0.3, 0.46, 0.62, 0.76, 0.64, 0.48, 0.32];
      sailHeights.forEach((height, rib) => {
        const panel = add(sail, [0.055, height, 0.3], rib % 2 ? copper : sailGlass, [0, height / 2, -0.51 + rib * 0.17], undefined, `${kind}-sail-panel-${rib + 1}`);
        panel.rotation.x = (rib - 3) * -0.045;
        add(sail, [0.07, height * 0.82, 0.05], glow, [0, height * 0.48, -0.6 + rib * 0.17], undefined, `${kind}-sail-rib-${rib + 1}`).rotation.x = panel.rotation.x;
      });
      add(sail, [0.08, 0.12, 1.05], ink, [0, 0.03, 0.02], undefined, `${kind}-sail-root`);
      const tail = pivotBox([0.12, 0.14, 0.56], ink, [0, 0, 0.84], [0, 0, 0.28], "body", `${kind}-tail-fin`);
      for (const side of [-1, 1]) {
        const fork = add(tail, [0.08, 0.52, 0.5], side < 0 ? copper : sailGlass, [side * 0.12, 0, 0.52], undefined, `${kind}-${side < 0 ? "left" : "right"}-tail-fork`);
        fork.rotation.z = side * -0.22;
      }
      for (const side of [-1, 1]) add(visual, [0.035, 0.035, 0.48], glow, [side * 0.12, -0.1, -1.16], undefined, `${kind}-${side < 0 ? "left" : "right"}-current-feeler`).rotation.y = side * -0.18;
    } else if (undergroundKind === "ashnose-bat") {
      const membrane = material(accentColor, false, 0.68);
      const warm = material(0xf0ad65, true, 0.85);
      add(visual, [0.38, 0.42, 0.7], bodyMaterial, [0, 0, 0.08], "body", `${kind}-furred-body`);
      add(visual, [0.46, 0.4, 0.42], darkMaterial, [0, 0.08, -0.46], "head", `${kind}-hooded-head`);
      add(visual, [0.25, 0.18, 0.28], accentMaterial, [0, -0.04, -0.7], undefined, `${kind}-ash-muzzle`);
      add(visual, [0.11, 0.2, 0.08], warm, [0, 0.02, -0.86], undefined, `${kind}-heat-leaf-nose`).rotation.z = Math.PI / 4;
      add(visual, [0.2, 0.12, 0.24], accentMaterial, [0, -0.22, -0.24], undefined, `${kind}-fur-ruff`);
      eyePair(0.14, 0.15, -0.68, 0.06, kind);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const wing = pivotBox([0.64, 0.05, 0.58], membrane, [side * 0.16, 0.08, 0.02], [side * 0.3, 0, -0.04], "wings", `${kind}-${sideName}-wing`);
        wing.rotation.z = side * -0.22;
        wing.userData.side = side;
        wing.userData.phase = 0;
        const forearm = add(wing, [0.76, 0.065, 0.07], darkMaterial, [side * 0.48, 0.03, -0.18], undefined, `${kind}-${sideName}-wing-forearm`);
        forearm.rotation.y = side * -0.24;
        for (let finger = 0; finger < 3; finger += 1) {
          const digit = add(wing, [0.055, 0.055, 0.7 - finger * 0.12], darkMaterial, [side * (0.5 + finger * 0.17), 0.02, 0.02 + finger * 0.16], undefined, `${kind}-${sideName}-wing-finger-${finger + 1}`);
          digit.rotation.y = side * (0.1 + finger * 0.12);
          const web = add(wing, [0.34 - finger * 0.04, 0.035, 0.42 - finger * 0.05], membrane, [side * (0.56 + finger * 0.17), -0.015, 0.04 + finger * 0.18], undefined, `${kind}-${sideName}-wing-web-${finger + 1}`);
          web.rotation.y = side * (-0.08 - finger * 0.1);
        }
        add(visual, [0.22, 0.43, 0.14], accentMaterial, [side * 0.18, 0.39, -0.42], undefined, `${kind}-${sideName}-ear`).rotation.z = side * -0.26;
        add(visual, [0.1, 0.26, 0.07], warm, [side * 0.18, 0.4, -0.5], undefined, `${kind}-${sideName}-inner-ear`).rotation.z = side * -0.26;
        add(visual, [0.08, 0.2, 0.08], darkMaterial, [side * 0.13, -0.33, 0.25], "legs", `${kind}-${sideName}-hind-leg`).rotation.x = 0.38;
        for (let claw = -1; claw <= 1; claw += 1) add(visual, [0.035, 0.035, 0.2], warm, [side * (0.1 + claw * 0.035), -0.43, 0.36], undefined, `${kind}-${sideName}-roost-claw-${claw + 2}`).rotation.x = -0.3;
      }
      const tail = pivotBox([0.16, 0.08, 0.46], darkMaterial, [0, 0.02, 0.38], [0, 0, 0.22], "body", `${kind}-tail`);
      add(tail, [0.48, 0.04, 0.44], membrane, [0, 0, 0.42], undefined, `${kind}-tail-membrane`);
    } else if (undergroundKind === "chimewing") {
      const crystal = material(0xa8f2dc, false, 0.74);
      const amethyst = material(0x7663a1);
      add(visual, [0.42, 0.42, 0.86], bodyMaterial, [0, 0, 0.05], "body", `${kind}-resonant-body`);
      add(visual, [0.36, 0.28, 0.46], pale, [0, -0.15, -0.22], undefined, `${kind}-pale-breast`);
      add(visual, [0.44, 0.4, 0.42], amethyst, [0, 0.08, -0.5], "head", `${kind}-mineral-crown`);
      add(visual, [0.18, 0.1, 0.34], glow, [0, -0.02, -0.8], undefined, `${kind}-tuning-beak`);
      eyePair(0.14, 0.15, -0.7, 0.06, kind);
      for (let crest = -1; crest <= 1; crest += 1) {
        const vane = add(visual, [0.11, 0.35 - Math.abs(crest) * 0.06, 0.12], crest === 0 ? glow : crystal, [crest * 0.13, 0.4 - Math.abs(crest) * 0.03, -0.4 + Math.abs(crest) * 0.07], undefined, `${kind}-crown-vane-${crest + 2}`);
        vane.rotation.z = crest * -0.18;
      }
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const wing = pivotBox([0.62, 0.055, 0.54], amethyst, [side * 0.17, 0.08, 0.02], [side * 0.3, 0, -0.03], "wings", `${kind}-${sideName}-wing`);
        wing.rotation.z = side * -0.18;
        wing.userData.side = side;
        wing.userData.phase = 0;
        for (let vane = 0; vane < 4; vane += 1) {
          const plate = add(wing, [0.42 - vane * 0.035, 0.055, 0.22], vane % 2 ? crystal : pale, [side * (0.42 + vane * 0.17), 0, -0.1 + vane * 0.17], undefined, `${kind}-${sideName}-hollow-vane-${vane + 1}`);
          plate.rotation.y = side * (-0.14 - vane * 0.07);
          add(wing, [0.055, 0.06, 0.34], glow, [side * (0.38 + vane * 0.17), 0.035, -0.08 + vane * 0.17], undefined, `${kind}-${sideName}-resonant-rail-${vane + 1}`).rotation.y = side * 0.12;
        }
        add(wing, [0.04, 0.28, 0.04], glow, [side * 0.56, -0.18, 0.18], undefined, `${kind}-${sideName}-chime-cord`);
        add(wing, [0.16, 0.18, 0.13], crystal, [side * 0.56, -0.35, 0.18], undefined, `${kind}-${sideName}-wing-chime`);
      }
      const tail = pivotBox([0.14, 0.1, 0.72], amethyst, [0, 0.01, 0.46], [0, 0, 0.34], "body", `${kind}-tail`);
      for (let fan = -1; fan <= 1; fan += 1) {
        const feather = add(tail, [0.18, 0.055, 0.62 - Math.abs(fan) * 0.07], fan === 0 ? glow : crystal, [fan * 0.17, 0, 0.72], undefined, `${kind}-bell-tail-feather-${fan + 2}`);
        feather.rotation.y = fan * 0.22;
        add(tail, [0.12, 0.16, 0.11], fan === 0 ? pale : amethyst, [fan * 0.17, -0.12, 1.02 - Math.abs(fan) * 0.06], undefined, `${kind}-tail-chime-${fan + 2}`);
      }
    } else if (undergroundKind === "cinder-kite") {
      const ember = material(0xffb447, true, 0.95);
      const coal = material(0x321f20);
      const membrane = material(accentColor, false, 0.78);
      add(visual, [0.58, 0.48, 1.08], bodyMaterial, [0, 0, 0.08], "body", `${kind}-thermal-body`);
      add(visual, [0.5, 0.32, 0.58], coal, [0, -0.18, -0.16], undefined, `${kind}-charred-breast`);
      add(visual, [0.64, 0.48, 0.54], darkMaterial, [0, 0.08, -0.67], "head", `${kind}-armored-head`);
      add(visual, [0.28, 0.2, 0.42], ember, [0, -0.03, -1.03], undefined, `${kind}-furnace-beak`);
      add(visual, [0.3, 0.13, 0.18], ember, [0, -0.18, -0.72], undefined, `${kind}-glowing-throat`);
      eyePair(0.2, 0.17, -0.93, 0.075, kind);
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        const horn = add(visual, [0.12, 0.42, 0.14], coal, [side * 0.23, 0.43, -0.58], undefined, `${kind}-${sideName}-heat-horn`);
        horn.rotation.z = side * -0.32;
        const wing = pivotBox([0.92, 0.065, 0.9], membrane, [side * 0.23, 0.1, 0.02], [side * 0.44, 0, 0.08], "wings", `${kind}-${sideName}-wing`);
        wing.rotation.z = side * -0.14;
        wing.userData.side = side;
        wing.userData.phase = 0;
        for (let primary = 0; primary < 3; primary += 1) {
          const slab = add(wing, [0.7 - primary * 0.08, 0.055, 0.26], primary === 1 ? accentMaterial : coal, [side * (0.58 + primary * 0.25), -0.01, -0.2 + primary * 0.3], undefined, `${kind}-${sideName}-vent-primary-${primary + 1}`);
          slab.rotation.y = side * (-0.16 - primary * 0.09);
          add(wing, [0.055, 0.07, 0.54], ember, [side * (0.48 + primary * 0.25), 0.035, -0.16 + primary * 0.3], undefined, `${kind}-${sideName}-ember-vein-${primary + 1}`).rotation.y = side * 0.14;
        }
        add(visual, [0.1, 0.26, 0.11], coal, [side * 0.2, -0.36, 0.12], "legs", `${kind}-${sideName}-talon-leg`).rotation.x = 0.45;
        for (let claw = -1; claw <= 1; claw += 1) add(visual, [0.045, 0.045, 0.24], ember, [side * (0.18 + claw * 0.05), -0.48, 0.24], undefined, `${kind}-${sideName}-talon-${claw + 2}`).rotation.x = -0.25;
      }
      const tail = pivotBox([0.2, 0.14, 1.12], coal, [0, 0.02, 0.58], [0, 0, 0.54], "body", `${kind}-tail`);
      for (const side of [-1, 1]) {
        const streamer = add(tail, [0.24, 0.07, 0.72], side < 0 ? accentMaterial : ember, [side * 0.18, 0, 1.02], undefined, `${kind}-${side < 0 ? "left" : "right"}-cinder-streamer`);
        streamer.rotation.y = side * 0.24;
      }
      for (let vent = 0; vent < 3; vent += 1) add(visual, [0.12, 0.08, 0.18], ember, [-0.16 + vent * 0.16, 0.3, -0.1 + vent * 0.28], undefined, `${kind}-back-vent-${vent + 1}`).rotation.y = Math.PI / 4;
    } else {
      const metal = material(accentColor, false, 0.86);
      const oxidized = material(0x344942);
      const node = material(0xb7e7cc, true, 0.82);
      visual.position.y = VEINLING_GROUND_LIFT;
      add(visual, [0.96, 0.44, 1.06], bodyMaterial, [0, 0.4, 0.03], "body", `${kind}-folded-core`);
      add(visual, [0.76, 0.3, 0.72], oxidized, [0, 0.64, 0.14], undefined, `${kind}-dorsal-carapace`);
      add(visual, [0.54, 0.38, 0.54], metal, [0, 0.48, -0.58], "head", `${kind}-faceted-visor`);
      add(visual, [0.12, 0.24, 0.07], glow, [0, 0.51, -0.87], undefined, `${kind}-seam-eye`);
      for (const side of [-1, 1]) add(visual, [0.13, 0.08, 0.07], node, [side * 0.16, 0.54 + side * 0.04, -0.865], undefined, `${kind}-${side < 0 ? "left" : "right"}-face-fracture`).rotation.z = side * -0.24;
      add(visual, [0.32, 0.14, 0.26], oxidized, [0, 0.32, -0.82], undefined, `${kind}-ore-shear`);
      for (const side of [-1, 1]) for (const front of [-1, 1]) {
        const name = `${front < 0 ? "front" : "rear"}-${side < 0 ? "left" : "right"}`;
        const leg = pivotBox([0.16, 0.48, 0.18], oxidized, [side * 0.37, 0.38, front * 0.37], [side * 0.1, -0.23, front * 0.06], "legs", `${kind}-${name}-leg`);
        leg.userData.phase = side * front > 0 ? 0 : Math.PI;
        leg.rotation.z = side * 0.16;
        leg.rotation.x = front * -0.1;
        add(leg, [0.24, 0.2, 0.24], metal, [side * 0.1, -0.48, front * -0.02], undefined, `${kind}-${name}-ankle-node`).rotation.y = Math.PI / 4;
        add(leg, [0.36, 0.1, 0.36], oxidized, [side * 0.14, -0.62, front * -0.07], undefined, `${kind}-${name}-repair-foot`);
        for (let prong = -1; prong <= 1; prong += 1) add(leg, [0.055, 0.06, 0.28], node, [side * (0.16 + prong * 0.055), -0.67, front * -0.21], undefined, `${kind}-${name}-repair-prong-${prong + 2}`).rotation.y = prong * 0.16;
      }
      for (let vein = 0; vein < 5; vein += 1) {
        const x = -0.28 + vein * 0.14;
        const stripe = add(visual, [0.07, 0.06, 0.56], glow, [x, 0.73 + (vein % 2) * 0.04, -0.04], undefined, `${kind}-living-seam-${vein + 1}`);
        stripe.rotation.y = (vein - 2) * 0.08;
        const branch = add(visual, [0.2, 0.055, 0.06], node, [x + (vein % 2 ? 0.07 : -0.07), 0.75, 0.12 + vein * 0.04], undefined, `${kind}-living-branch-${vein + 1}`);
        branch.rotation.z = (vein % 2 ? 1 : -1) * 0.22;
      }
      for (const side of [-1, 1]) {
        const sideName = side < 0 ? "left" : "right";
        add(visual, [0.3, 0.4, 0.16], metal, [side * 0.5, 0.62, 0.1], undefined, `${kind}-${sideName}-ore-plate`).rotation.z = side * -0.28;
        const feeler = add(visual, [0.07, 0.42, 0.08], oxidized, [side * 0.25, 0.95, -0.2], undefined, `${kind}-${sideName}-survey-feeler`);
        feeler.rotation.z = side * -0.38;
        add(visual, [0.12, 0.12, 0.12], node, [side * 0.33, 1.13, -0.2], undefined, `${kind}-${sideName}-feeler-node`).rotation.y = Math.PI / 4;
      }
      add(visual, [0.3, 0.24, 0.3], node, [0, 0.88, 0.34], undefined, `${kind}-unresolved-heart`).rotation.y = Math.PI / 4;
    }
  } else if (kind === "ridgeback") {
    buildRidgeback();
  } else if (kind === "woolhorn") {
    buildWoolhorn();
  } else if (kind === "glowmoth") {
    visual.userData.wildlifeRig = "glowmoth";
    add(visual, [0.24, 0.22, 0.42], bodyMaterial, [0, 0, -0.02], "body", "glowmoth-body");
    add(visual, [0.2, 0.2, 0.22], darkMaterial, [0, 0.02, -0.31], "head", "glowmoth-head");
    add(visual, [0.16, 0.16, 0.2], material(0xffdb59, true), [0, 0, 0.28], undefined, "glowmoth-lantern");
    for (const side of [-1, 1]) for (const front of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const sectionName = front < 0 ? "fore" : "hind";
      const wingMaterial = material(accentColor, false, 0.78);
      const wing = pivotBox(
        [0.56, 0.045, front < 0 ? 0.42 : 0.32],
        wingMaterial,
        [side * 0.12, 0.05, front * 0.12],
        [side * 0.28, 0, front * 0.05],
        "wings",
        `glowmoth-${sideName}-${sectionName}-wing`,
      );
      wing.userData.side = side;
      wing.userData.phase = front < 0 ? 0 : Math.PI;
      add(wing, [0.16, 0.052, 0.13], material(0xffe58a, true, 0.72), [side * 0.3, 0.012, front * 0.04], undefined, `glowmoth-${sideName}-${sectionName}-eyespot`);
    }
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const root = childPivot(visual, `glowmoth-${sideName}-antenna-pivot`, [side * 0.07, 0.08, -0.39]);
      root.userData.side = side;
      const antenna = add(root, [0.038, 0.038, 0.38], accentMaterial, [side * 0.045, 0.11, -0.15], undefined, `glowmoth-${sideName}-antenna`);
      antenna.rotation.x = 0.58;
      antenna.rotation.z = side * -0.2;
      add(root, [0.075, 0.075, 0.075], material(0xffef9c, true), [side * 0.1, 0.22, -0.31], undefined, `glowmoth-${sideName}-antenna-tip`);
    }
  } else if (kind === "lightning-bug") {
    const glow = material(0xd7ff62, true, 0.96);
    const wing = material(0xd9f4c4, false, 0.62);
    const shell = material(0x283423);
    visual.userData.wildlifeRig = "lightning-bug";
    add(visual, [0.16, 0.14, 0.3], shell, [0, 0, -0.04], "body", "lightning-bug-thorax");
    add(visual, [0.14, 0.13, 0.16], darkMaterial, [0, 0.01, -0.25], "head", "lightning-bug-head");
    add(visual, [0.17, 0.16, 0.28], glow, [0, -0.01, 0.25], undefined, "lightning-bug-lantern");
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const wingRoot = childPivot(visual, `lightning-bug-${sideName}-wing-pivot`, [side * 0.06, 0.07, -0.01]);
      wingRoot.userData.side = side;
      add(wingRoot, [0.3, 0.025, 0.22], wing, [side * 0.14, 0, 0.08], undefined, `lightning-bug-${sideName}-wing`).rotation.y = side * -0.16;
      const antenna = add(visual, [0.025, 0.025, 0.24], darkMaterial, [side * 0.045, 0.075, -0.39], undefined, `lightning-bug-${sideName}-antenna`);
      antenna.rotation.x = 0.36;
      antenna.rotation.z = side * -0.18;
      for (let leg = 0; leg < 3; leg += 1) {
        const limb = add(visual, [0.25, 0.025, 0.025], darkMaterial, [side * 0.13, -0.09, -0.14 + leg * 0.13], "legs", `lightning-bug-${sideName}-leg-${leg + 1}`);
        limb.rotation.z = side * -0.35;
        limb.rotation.y = side * (leg - 1) * 0.25;
      }
    }
  } else if (kind === "shadecrawler") {
    add(visual, [0.86, 0.34, 0.9], bodyMaterial, [0, 0, 0.24], "body", "shadecrawler-abdomen");
    add(visual, [0.5, 0.1, 0.62], darkMaterial, [0, 0.2, 0.3], undefined, "shadecrawler-back-mark");
    add(visual, [0.72, 0.3, 0.62], accentMaterial, [0, 0.03, -0.48], "head", "shadecrawler-head");
    for (const [index, ex] of [-0.2, 0, 0.2].entries()) add(visual, [0.075, 0.075, 0.04], eyeMaterial, [ex, 0.12, -0.81], undefined, `shadecrawler-eye-${index + 1}`);
    const fangMaterial = material(0xe1d5c5);
    for (const side of [-1, 1]) {
      const fang = add(visual, [0.07, 0.18, 0.07], fangMaterial, [side * 0.2, -0.08, -0.82], undefined, `shadecrawler-${side < 0 ? "left" : "right"}-fang`);
      fang.rotation.x = 0.35;
    }
    for (const side of [-1, 1]) for (let legIndex = 0; legIndex < 4; legIndex += 1) {
      const z = -0.46 + legIndex * 0.3;
      const leg = pivotBox([0.56, 0.08, 0.1], darkMaterial, [side * 0.34, -0.05, z], [side * 0.28, -0.08, 0], "legs", `shadecrawler-${side < 0 ? "left" : "right"}-leg-${legIndex + 1}`);
      leg.rotation.z = side * -0.42;
      leg.rotation.y = side * (0.17 - legIndex * 0.1);
      leg.userData.phase = (legIndex % 2) * Math.PI;
      leg.userData.side = side;
    }
    const saddle = new THREE.Group();
    saddle.name = "shadecrawler-saddle";
    saddle.visible = false;
    visual.add(saddle);
    add(saddle, [0.78, 0.12, 0.72], material(0x75492f), [0, 0.31, 0.08], undefined, "shadecrawler-saddle-pad");
    add(saddle, [0.52, 0.22, 0.46], material(0x9a6843), [0, 0.43, 0.08], undefined, "shadecrawler-saddle-seat");
    add(saddle, [0.1, 0.4, 0.12], material(0x493126), [-0.43, 0.12, 0.08], undefined, "shadecrawler-left-girth");
    add(saddle, [0.1, 0.4, 0.12], material(0x493126), [0.43, 0.12, 0.08], undefined, "shadecrawler-right-girth");
  } else if (kind === "caveblob") {
    add(visual, [0.82, 0.58, 0.82], material(bodyColor, false, 0.86), [0, -0.02, 0], "body", "caveblob-body");
    add(visual, [0.58, 0.4, 0.58], material(accentColor, false, 0.88), [0, 0.34, -0.03], "body", "caveblob-crown");
    add(visual, [0.22, 0.2, 0.22], material(0xb9ffd9, true), [0, 0.22, 0.03], undefined, "caveblob-core");
    add(visual, [0.12, 0.12, 0.04], eyeMaterial, [-0.18, 0.37, -0.34], undefined, "caveblob-left-eye");
    add(visual, [0.12, 0.12, 0.04], eyeMaterial, [0.18, 0.37, -0.34], undefined, "caveblob-right-eye");
    add(visual, [0.22, 0.055, 0.045], darkMaterial, [0, 0.22, -0.39], undefined, "caveblob-mouth");
    const crystalMaterial = material(0x92f0cb, true, 0.88);
    for (const [index, px, py, pz, scale, rotation] of [
      [1, -0.26, 0.65, 0.06, 0.18, -0.22], [2, 0.08, 0.68, 0.16, 0.23, 0.12], [3, 0.28, 0.59, -0.02, 0.15, 0.3],
    ] as Array<[number, number, number, number, number, number]>) {
      const crystal = add(visual, [scale, scale * 1.8, scale], crystalMaterial, [px, py, pz], undefined, `caveblob-crystal-${index}`);
      crystal.rotation.z = rotation;
    }
  } else if (kind === "rattlekin") {
    const graveCloth = material(0x40364f);
    const graveGlow = material(0xaac7ff, true, 0.88);
    visual.userData.wildlifeRig = "rattlekin";
    add(visual, [0.42, 0.32, 0.32], darkMaterial, [0, 0.35, 0], "body", "rattlekin-pelvis");
    add(visual, [0.72, 0.18, 0.48], graveCloth, [0, 0.42, 0.1], undefined, "rattlekin-tattered-loincloth");
    add(visual, [0.14, 0.76, 0.14], accentMaterial, [0, 0.74, 0.08], undefined, "rattlekin-spine");
    for (let rib = 0; rib < 4; rib += 1) add(visual, [0.76 - rib * 0.07, 0.075, 0.17], bodyMaterial, [0, 0.59 + rib * 0.145, 0], undefined, `rattlekin-rib-${rib + 1}`);
    add(visual, [0.54, 0.5, 0.48], bodyMaterial, [0, 1.16, -0.04], "head", "rattlekin-skull");
    add(visual, [0.42, 0.14, 0.22], accentMaterial, [0, 0.98, -0.17], undefined, "rattlekin-jaw");
    add(visual, [0.13, 0.13, 0.05], graveGlow, [-0.16, 1.25, -0.3], undefined, "rattlekin-left-eye");
    add(visual, [0.085, 0.085, 0.05], graveGlow, [0.16, 1.25, -0.3], undefined, "rattlekin-right-eye");
    add(visual, [0.22, 0.09, 0.18], darkMaterial, [0, 1.08, -0.29], undefined, "rattlekin-nasal-cavity");
    add(visual, [0.08, 0.3, 0.055], darkMaterial, [-0.13, 1.39, -0.27], undefined, "rattlekin-skull-crack-a").rotation.z = -0.54;
    add(visual, [0.055, 0.2, 0.05], darkMaterial, [-0.02, 1.35, -0.27], undefined, "rattlekin-skull-crack-b").rotation.z = 0.42;
    add(visual, [0.72, 0.16, 0.54], graveCloth, [0, 1.4, 0.06], undefined, "rattlekin-hood-crown");
    add(visual, [0.18, 0.52, 0.18], graveCloth, [0, 1.58, 0.19], undefined, "rattlekin-hood-tail").rotation.x = -0.32;
    for (const [px, phase, name] of [[-0.18, 0, "left"], [0.18, Math.PI, "right"]] as Array<[number, number, string]>) {
      const leg = pivotBox([0.16, 0.78, 0.18], bodyMaterial, [px, 0.32, 0], [0, -0.39, 0], "legs", `rattlekin-${name}-leg`);
      leg.userData.phase = phase;
      add(leg, [0.26, 0.12, 0.38], accentMaterial, [0, -0.8, -0.09], undefined, `rattlekin-${name}-foot`);
    }
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(visual, [0.28, 0.22, 0.25], darkMaterial, [side * 0.4, 0.91, 0], undefined, `rattlekin-${sideName}-shoulder`);
      add(visual, [0.36, 0.1, 0.31], graveCloth, [side * 0.42, 1.02, 0.03], undefined, `rattlekin-${sideName}-shoulder-wrap`).rotation.z = side * -0.15;
      const arm = pivotBox([0.14, 0.72, 0.14], bodyMaterial, [side * 0.42, 0.9, 0], [0, -0.36, 0], "arms", `rattlekin-${sideName}-arm`);
      arm.userData.side = side;
      arm.userData.phase = side < 0 ? 0 : Math.PI;
    }
    const clubRoot = parts.arms[1];
    add(
      clubRoot,
      [...RATTLEKIN_CLUB_CONTRACT.handleSize],
      accentMaterial,
      [...RATTLEKIN_CLUB_CONTRACT.handleCenter],
      undefined,
      "rattlekin-club-handle",
    );
    add(
      clubRoot,
      [...RATTLEKIN_CLUB_CONTRACT.headSize],
      darkMaterial,
      [...RATTLEKIN_CLUB_CONTRACT.headCenter],
      undefined,
      "rattlekin-club-head",
    );
    add(clubRoot, [0.52, 0.18, 0.22], bodyMaterial, [0, -0.72, -1.02], undefined, "rattlekin-club-stone-band");
    add(clubRoot, [0.18, 0.18, 0.2], graveGlow, [0, -0.72, -1.31], undefined, "rattlekin-club-rune").rotation.z = Math.PI / 4;
    for (const side of [-1, 1]) {
      const spike = add(clubRoot, [0.12, 0.18, 0.14], accentMaterial, [side * 0.29, -0.72, -1.02], undefined, `rattlekin-club-spike-${side < 0 ? "left" : "right"}`);
      spike.rotation.z = side * 0.55;
    }
  } else if (kind === "sunstep-grazer") {
    buildSunstepGrazer();
  } else if (kind === "pebbletortoise" || kind === "reefglide-terrapin") {
    buildTortoise(kind);
  } else if (kind === "brambleboar") {
    const thornMaterial = material(0x395a31);
    const leafMaterial = material(0x6f9847);
    const mudMaterial = material(0x49372c);
    visual.userData.wildlifeRig = "brambleboar";
    add(visual, [1.08, 0.76, 1.42], bodyMaterial, [0, 0.06, 0.16], "body", "brambleboar-body");
    add(visual, [0.82, 0.68, 0.74], accentMaterial, [0, 0.14, -0.72], undefined, "brambleboar-shoulder-hump");
    const head = pivotBox([0.76, 0.58, 0.64], bodyMaterial, [0, 0.07, -0.94], [0, 0, 0], "head", "brambleboar-head");
    add(head, [0.56, 0.3, 0.38], mudMaterial, [0, -0.11, -0.44], undefined, "brambleboar-snout");
    add(head, [0.34, 0.1, 0.08], darkMaterial, [0, -0.08, -0.66], undefined, "brambleboar-nose");
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.075, 0.08, 0.045], eyeMaterial, [side * 0.23, 0.11, -0.34], undefined, `brambleboar-${sideName}-eye`);
      const ear = childPivot(head, `brambleboar-${sideName}-ear-pivot`, [side * 0.31, 0.21, -0.03]);
      add(ear, [0.3, 0.14, 0.27], accentMaterial, [side * 0.12, 0.02, 0], undefined, `brambleboar-${sideName}-ear`).rotation.z = side * -0.32;
    }
    const tuskMaterial = material(0xf1dfb4);
    for (const side of [-1, 1]) {
      const tusk = add(head, [0.085, 0.31, 0.085], tuskMaterial, [side * 0.26, -0.13, -0.62], undefined, `brambleboar-${side < 0 ? "left" : "right"}-tusk`);
      tusk.rotation.x = 0.46;
      tusk.rotation.z = side * 0.24;
    }
    groundedQuadrupedLegs("brambleboar", "brambleboar", 0.34, -0.38, 0.48, -0.21, 0.18, mudMaterial, darkMaterial, [0.26, 0.14, 0.35]);
    for (let thorn = 0; thorn < 8; thorn += 1) {
      const spike = add(visual, [0.13, 0.36 + thorn % 3 * 0.08, 0.13], thornMaterial, [0, 0.58 + thorn % 2 * 0.04, -0.58 + thorn * 0.22], undefined, `brambleboar-mane-thorn-${thorn + 1}`);
      spike.rotation.z = (thorn % 2 ? 1 : -1) * 0.18;
    }
    for (let bramble = 0; bramble < 6; bramble += 1) {
      const side = bramble % 2 ? 1 : -1;
      const twig = add(visual, [0.07, 0.45, 0.07], thornMaterial, [side * (0.42 + bramble % 3 * 0.06), 0.48, -0.38 + bramble * 0.22], undefined, `brambleboar-side-bramble-${bramble + 1}`);
      twig.rotation.z = side * (0.35 + (bramble % 3) * 0.08);
      add(visual, [0.22, 0.08, 0.16], leafMaterial, [side * 0.58, 0.59, -0.34 + bramble * 0.22], undefined, `brambleboar-leaf-${bramble + 1}`).rotation.z = side * -0.32;
    }
    const tail = pivotBox([0.11, 0.12, 0.48], thornMaterial, [0, 0.27, 0.94], [0, 0, 0.22], "body", "brambleboar-tail-root");
    tail.rotation.x = -0.45;
    add(tail, [0.28, 0.24, 0.28], leafMaterial, [0, 0.04, 0.44], undefined, "brambleboar-tail-tuft");
  } else if (["petalfox", "emberbrush-fox", "moonpetal-fox"].includes(kind)) {
    buildFox(kind as FoxKind);
  } else if (kind === "duneclatter") {
    add(visual, [0.88, 0.36, 1.02], bodyMaterial, [0, 0, 0.12], "body", "duneclatter-carapace");
    const shellLeft = add(visual, [0.4, 0.14, 0.86], accentMaterial, [-0.22, 0.2, 0.12], "wings", "duneclatter-left-wing-case");
    const shellRight = add(visual, [0.4, 0.14, 0.86], accentMaterial, [0.22, 0.2, 0.12], "wings", "duneclatter-right-wing-case");
    shellLeft.rotation.z = -0.04; shellRight.rotation.z = 0.04;
    add(visual, [0.52, 0.34, 0.44], darkMaterial, [0, 0, -0.58], "head", "duneclatter-head");
    eyePair(0.16, 0.07, -0.805, 0.055, "duneclatter");
    for (const side of [-1, 1]) for (let leg = 0; leg < 3; leg += 1) {
      const limb = pivotBox([0.48, 0.08, 0.1], darkMaterial, [side * 0.31, -0.08, -0.25 + leg * 0.28], [side * 0.23, -0.09, 0], "legs", `duneclatter-${side < 0 ? "left" : "right"}-leg-${leg + 1}`);
      limb.rotation.z = side * -0.38;
      limb.userData.phase = leg % 2 ? Math.PI : 0;
    }
    for (const side of [-1, 1]) {
      const antenna = add(visual, [0.055, 0.055, 0.52], darkMaterial, [side * 0.17, 0.1, -0.91], undefined, `duneclatter-${side < 0 ? "left" : "right"}-antenna`);
      antenna.rotation.y = side * 0.22;
      antenna.rotation.x = -0.2;
    }
  } else if (["thimbledeer", "frostlace-hart", "reedcrown-deer"].includes(kind)) {
    buildDeer(kind as DeerKind);
  } else if (kind === "lanternshell") {
    // Rebuilt from a slab and a cube into an actual gastropod: a rippling
    // muscular foot, a mantle collar, a jointed eyestalk chain, and a turreted
    // spiral shell whose glass whorls carry the lantern glow.
    visual.userData.wildlifeRig = "lanternshell";
    visual.userData.authoredScale = 0.62;
    const flesh = bodyMaterial;
    const fleshPale = material(0x8ba272);
    const sole = darkMaterial;
    const shellMaterial = accentMaterial;
    const shellDeep = material(0x4f6d62);
    const shellPale = material(0xa6e8c6);
    const glowMaterial = material(eyeColor, true, 0.9);
    const pupilMaterial = material(0x21301f);

    add(visual, [0.78, 0.1, 1.26], sole, [0, -0.23, 0.04], "body", "lanternshell-foot-sole");
    for (const [wave, z] of [[1, -0.44], [2, -0.12], [3, 0.2], [4, 0.5]] as const) {
      const ripple = childPivot(visual, `lanternshell-foot-wave-${wave}-pivot`, [0, -0.15, z]);
      ripple.userData.baseY = -0.15;
      add(ripple, [0.82 - Math.abs(z) * 0.12, 0.11, 0.26], fleshPale, [0, 0, 0], undefined, `lanternshell-foot-ripple-${wave}`);
    }
    for (const side of [-1, 1]) {
      add(visual, [0.07, 0.1, 1.18], fleshPale, [side * 0.42, -0.19, 0.06], undefined, `lanternshell-${side < 0 ? "left" : "right"}-foot-fringe`);
    }
    add(visual, [0.62, 0.34, 1.0], flesh, [0, -0.02, -0.12], "body", "lanternshell-body");
    add(visual, [0.74, 0.18, 0.46], shellDeep, [0, 0.12, 0.08], "body", "lanternshell-mantle-collar");
    add(visual, [0.5, 0.2, 0.32], fleshPale, [0, 0.08, -0.44], undefined, "lanternshell-neck");

    const head = childPivot(visual, "lanternshell-head-pivot", [0, 0.1, -0.56]);
    add(head, [0.44, 0.3, 0.4], fleshPale, [0, 0.0, -0.14], "head", "lanternshell-head");
    add(head, [0.36, 0.1, 0.26], flesh, [0, 0.15, -0.2], undefined, "lanternshell-brow");
      add(head, [0.3, 0.19, 0.22], fleshPale, [0, -0.05, -0.32], "head", "lanternshell-muzzle");
    add(head, [0.2, 0.06, 0.09], sole, [0, -0.11, -0.4], undefined, "lanternshell-mouth");
    add(head, [0.26, 0.07, 0.13], flesh, [0, -0.05, -0.4], undefined, "lanternshell-lip");
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.09, 0.19, 0.26], flesh, [side * 0.2, -0.01, -0.16], undefined, `lanternshell-${sideName}-cheek`);
      const stalk = childPivot(head, `lanternshell-${sideName}-stalk-pivot`, [side * 0.13, 0.14, -0.2]);
      stalk.rotation.x = -0.34;
      stalk.rotation.z = side * -0.1;
      add(stalk, [0.06, 0.26, 0.06], flesh, [0, 0.12, 0], undefined, `lanternshell-${sideName}-stalk-lower`);
      const knuckle = childPivot(stalk, `lanternshell-${sideName}-stalk-knuckle-pivot`, [0, 0.25, 0]);
      add(knuckle, [0.07, 0.07, 0.07], fleshPale, [0, 0, 0], undefined, `lanternshell-${sideName}-stalk-joint`);
      add(knuckle, [0.055, 0.2, 0.055], flesh, [0, 0.11, -0.03], undefined, `lanternshell-${sideName}-stalk-upper`);
      add(knuckle, [0.11, 0.11, 0.11], eyeMaterial, [0, 0.24, -0.06], undefined, `lanternshell-${sideName}-eye`);
      add(knuckle, [0.05, 0.05, 0.04], pupilMaterial, [0, 0.25, -0.12], undefined, `lanternshell-${sideName}-pupil`);
      const feeler = childPivot(head, `lanternshell-${sideName}-feeler-pivot`, [side * 0.17, -0.1, -0.36]);
      feeler.rotation.x = 0.42;
      feeler.rotation.y = side * 0.3;
      add(feeler, [0.04, 0.04, 0.28], flesh, [0, 0, -0.14], undefined, `lanternshell-${sideName}-feeler`);
    }

    // A planispiral shell: eight tapering whorl blocks wound around a sideways
    // axis so the coil itself is the silhouette, read from either flank.
    const shell = childPivot(visual, "lanternshell-shell-pivot", [0, 0.3, 0.23]);
    shell.rotation.z = -0.07;
    shell.rotation.x = -0.1;
    shell.userData.restZ = -0.07;
    const WHORLS = 12;
    const coilTurn = (progress: number) => -0.6 + progress * 10;
    const coilRadius = (progress: number) => 0.28 * (1 - progress * 0.78);
    for (let whorl = 1; whorl <= WHORLS; whorl += 1) {
      const progress = (whorl - 1) / (WHORLS - 1);
      const turn = coilTurn(progress);
      const radius = coilRadius(progress);
      const girth = 0.3 * (1 - progress * 0.62);
      const segment = add(
        shell,
        [0.4 * (1 - progress * 0.4), girth, girth],
        whorl % 3 === 0 ? shellPale : shellMaterial,
        [progress * 0.015, Math.sin(turn) * radius, Math.cos(turn) * radius],
        undefined,
        `lanternshell-shell-whorl-${whorl}`,
      );
      segment.rotation.x = -turn;
    }
    add(shell, [0.46, 0.36, 0.15], shellDeep, [0, Math.sin(-0.6) * 0.3, Math.cos(-0.6) * 0.3], undefined, "lanternshell-shell-rim").rotation.x = 0.6;
    add(shell, [0.3, 0.26, 0.1], sole, [0, -0.25, 0.26], undefined, "lanternshell-shell-aperture").rotation.x = 0.6;
    // The lantern is the suture line itself: five glass windows set along the
    // coil, each proud of the whorl it sits in, so the spiral is legible as a
    // glowing groove from either flank.
    for (const [index, progress] of [[1, 0.06], [2, 0.28], [3, 0.5], [4, 0.71], [5, 0.9]] as const) {
      const turn = coilTurn(progress);
      const radius = coilRadius(progress);
      const girth = 0.3 * (1 - progress * 0.62);
      const window = add(
        shell,
        [0.4 * (1 - progress * 0.4) + 0.07, girth * 0.44, girth * 0.44],
        glowMaterial,
        [0, Math.sin(turn) * radius, Math.cos(turn) * radius],
        undefined,
        `lanternshell-spiral-${index}`,
      );
      window.rotation.x = -turn;
    }
  } else if (kind === "puddlehopper") {
    const belly = material(0xe7d57c);
    const spots = material(0x356f61);
    visual.userData.wildlifeRig = "puddlehopper";
    add(visual, [0.82, 0.46, 0.72], bodyMaterial, [0, 0.02, 0.1], "body", "puddlehopper-body");
    add(visual, [0.68, 0.4, 0.53], accentMaterial, [0, 0.12, -0.4], "head", "puddlehopper-head");
    for (const side of [-1, 1]) {
      add(visual, [0.24, 0.2, 0.23], accentMaterial, [side * 0.21, 0.28, -0.46], undefined, `puddlehopper-${side < 0 ? "left" : "right"}-eye-bump`);
      add(visual, [0.11, 0.12, 0.07], eyeMaterial, [side * 0.21, 0.31, -0.59], undefined, `puddlehopper-${side < 0 ? "left" : "right"}-eye`);
    }
    add(visual, [0.28, 0.055, 0.04], darkMaterial, [0, -0.015, -0.69], undefined, "puddlehopper-mouth");
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const thigh = pivotBox([0.42, 0.22, 0.56], spots, [side * 0.31, -0.04, 0.27], [side * 0.13, -0.05, 0.1], "legs", `puddlehopper-${sideName}-rear-leg`);
      thigh.rotation.y = side * -0.34;
      thigh.userData.phase = side < 0 ? 0 : Math.PI;
      const shin = add(thigh, [0.18, 0.16, 0.48], accentMaterial, [side * 0.18, -0.09, 0.36], undefined, `puddlehopper-${sideName}-rear-shin`);
      shin.rotation.y = side * 0.46;
      add(thigh, [0.5, 0.09, 0.42], belly, [side * 0.25, -0.17, 0.63], undefined, `puddlehopper-${sideName}-webbed-foot`);
      const fore = pivotBox([0.15, 0.31, 0.17], accentMaterial, [side * 0.28, 0, -0.31], [0, -0.14, 0], "legs", `puddlehopper-${sideName}-front-leg`);
      fore.rotation.x = -0.2;
      add(fore, [0.34, 0.08, 0.28], belly, [side * 0.08, -0.31, -0.1], undefined, `puddlehopper-${sideName}-front-foot`);
    }
    const throat = add(visual, [0.46, 0.26, 0.09], belly, [0, 0.01, -0.66], undefined, "puddlehopper-throat-pouch");
    throat.userData.restScale = 1;
    for (const [index, x, y, z] of [[1, -0.34, 0.17, -0.16], [2, 0.36, 0.1, 0.08], [3, -0.22, 0.24, 0.25], [4, 0.24, 0.2, 0.36]] as Array<[number, number, number, number]>) add(visual, [0.12, 0.055, 0.12], spots, [x, y, z], undefined, `puddlehopper-spot-${index}`);
  } else if (kind === "reedstrider") {
    const teal = material(0x38a79b);
    const coral = material(0xed6f6c);
    const sun = material(0xf3cb62);
    const indigo = material(0x40567e);
    visual.userData.wildlifeRig = "reedstrider";
    add(visual, [0.62, 0.76, 0.88], teal, [0, 0.6, 0.08], "body", "reedstrider-body");
    add(visual, [0.5, 0.58, 0.62], coral, [0, 0.62, -0.16], undefined, "reedstrider-breast");
    add(visual, [0.27, 0.76, 0.27], sun, [0, 1.0, -0.36], "body", "reedstrider-neck").rotation.x = -0.16;
    const head = pivotBox([0.46, 0.4, 0.45], teal, [0, 1.35, -0.63], [0, 0, 0], "head", "reedstrider-head");
    add(head, [0.17, 0.14, 0.68], material(0xf0b64f), [0, -0.07, -0.54], undefined, "reedstrider-beak").rotation.x = -0.05;
    for (const side of [-1, 1]) add(head, [0.065, 0.075, 0.045], eyeMaterial, [side * 0.14, 0.08, -0.25], undefined, `reedstrider-${side < 0 ? "left" : "right"}-eye`);
    const crest = add(head, [0.14, 0.48, 0.2], coral, [0, 0.38, 0.02], undefined, "reedstrider-hollow-crest");
    crest.rotation.x = -0.28;
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const wing = pivotBox([0.5, 0.13, 0.82], indigo, [side * 0.27, 0.7, 0.08], [side * 0.24, 0, 0], "wings", `reedstrider-${sideName}-wing`);
      wing.rotation.z = side * -0.12;
      wing.userData.side = side;
      add(wing, [0.28, 0.05, 0.58], coral, [side * 0.03, -0.07, 0.02], undefined, `reedstrider-${sideName}-wing-flash`);
      add(wing, [0.18, 0.04, 0.18], sun, [side * 0.03, -0.105, -0.2], undefined, `reedstrider-${sideName}-wing-eye`).rotation.y = Math.PI / 4;
      const leg = pivotBox([0.12, 0.92, 0.13], sun, [side * 0.16, 0.39, 0.08], [0, -0.45, 0], "legs", `reedstrider-${sideName}-leg`);
      leg.userData.phase = side < 0 ? 0 : Math.PI;
      add(leg, [0.32, 0.08, 0.46], indigo, [0, -0.95, -0.13], undefined, `reedstrider-${sideName}-foot`);
    }
    for (const [index, x] of [-0.25, 0, 0.25].entries()) {
      const tail = add(visual, [0.25, 0.13, 0.72], index === 1 ? coral : indigo, [x, 0.64, 0.7], undefined, `reedstrider-tail-feather-${index + 1}`);
      tail.rotation.x = 0.28;
      tail.rotation.z = x * -0.7;
    }
    const reedSaddle = new THREE.Group();
    reedSaddle.name = "reedstrider-saddle";
    reedSaddle.visible = false;
    visual.add(reedSaddle);
    add(reedSaddle, [0.62, 0.1, 0.58], material(0x5b3e2c), [0, 0.95, 0.08], undefined, "reedstrider-saddle-blanket");
    add(reedSaddle, [0.42, 0.2, 0.42], material(0x8c633d), [0, 1.06, 0.06], undefined, "reedstrider-saddle-seat");
    add(reedSaddle, [0.08, 0.72, 0.08], material(0x3f2c23), [-0.31, 0.64, 0.06], undefined, "reedstrider-left-girth");
    add(reedSaddle, [0.08, 0.72, 0.08], material(0x3f2c23), [0.31, 0.64, 0.06], undefined, "reedstrider-right-girth");
    visual.userData.saddleAnchor = [0, 1.03, 0.1];
  } else if (kind === "wild-horse") {
    const courserCreamMaterial = material(0xf0d5a0);
    const courserNoseMaterial = material(0x4a3027);
    const courserHoofMaterial = material(0x30251f);
    const courserForestMaterial = material(0x557044);
    const courserEyeRimMaterial = material(0x211814);

    // Three overlapping masses give the Courser a lifted shoulder, tucked
    // barrel and rounded hindquarter instead of the old single-box torso.
    const chest = add(visual, [0.88, 0.78, 0.62], bodyMaterial, [0, 0.62, -0.4], "body", "wild-horse-chest");
    chest.rotation.x = 0.04;
    add(visual, [0.82, 0.64, 0.92], bodyMaterial, [0, 0.6, 0.12], "body", "wild-horse-barrel");
    const rump = add(visual, [0.9, 0.72, 0.7], bodyMaterial, [0, 0.62, 0.61], "body", "wild-horse-rump");
    rump.rotation.x = -0.08;
    add(visual, [0.7, 0.16, 0.72], accentMaterial, [0, 0.34, 0.12], undefined, "wild-horse-warm-undercoat");

    const neck = add(visual, [0.5, 0.98, 0.48], bodyMaterial, [0, 1.16, -0.64], "body", "wild-horse-neck");
    neck.rotation.x = -0.42;
    const throat = add(visual, [0.32, 0.58, 0.3], accentMaterial, [0, 1.04, -0.8], undefined, "wild-horse-throat");
    throat.rotation.x = -0.42;
    add(visual, [0.52, 0.44, 0.7], bodyMaterial, [0, 1.61, -1.02], "head", "wild-horse-head").rotation.x = -0.08;
    add(visual, [0.54, 0.3, 0.34], bodyMaterial, [0, 1.73, -0.9], "head", "wild-horse-brow");
    const nasalBridge = add(visual, [0.42, 0.34, 0.46], bodyMaterial, [0, 1.56, -1.52], undefined, "wild-horse-nasal-bridge");
    nasalBridge.rotation.x = 0.08;
    const muzzle = add(visual, [0.36, 0.27, 0.36], accentMaterial, [0, 1.46, -1.81], undefined, "wild-horse-muzzle");
    muzzle.rotation.x = 0.04;
    add(visual, [0.33, 0.14, 0.13], courserNoseMaterial, [0, 1.43, -2.015], undefined, "wild-horse-soft-nose");
    add(visual, [0.03, 0.045, 0.025], courserEyeRimMaterial, [-0.085, 1.46, -2.085], undefined, "wild-horse-left-nostril");
    add(visual, [0.03, 0.045, 0.025], courserEyeRimMaterial, [0.085, 1.46, -2.085], undefined, "wild-horse-right-nostril");

    // A narrow cream blaze breaks up the face and remains legible at portrait
    // scale. The eyes sit on the sides of the skull like a real horse's eyes.
    add(visual, [0.13, 0.28, 0.025], courserCreamMaterial, [0, 1.69, -1.377], undefined, "wild-horse-blaze-upper").rotation.z = -0.06;
    add(visual, [0.095, 0.2, 0.025], courserCreamMaterial, [0.025, 1.52, -1.758], undefined, "wild-horse-blaze-lower").rotation.z = 0.08;
    add(visual, [0.18, 0.28, 0.16], darkMaterial, [0, 1.94, -1.09], "head", "wild-horse-forelock").rotation.x = 0.28;
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(visual, [0.035, 0.145, 0.19], courserEyeRimMaterial, [side * 0.277, 1.71, -1.2], undefined, `wild-horse-${sideName}-eye-rim`);
      add(visual, [0.04, 0.09, 0.12], eyeMaterial, [side * 0.299, 1.715, -1.22], undefined, `wild-horse-${sideName}-eye`);
      add(visual, [0.012, 0.025, 0.035], courserCreamMaterial, [side * 0.323, 1.74, -1.255], undefined, `wild-horse-${sideName}-eye-glint`);
      const ear = add(visual, [0.14, 0.32, 0.15], darkMaterial, [side * 0.2, 1.98, -0.94], "head", `wild-horse-${sideName}-ear`);
      ear.rotation.x = side * 0.04 - 0.1;
      ear.rotation.z = side * -0.22;
      const innerEar = add(visual, [0.06, 0.19, 0.035], accentMaterial, [side * 0.208, 1.985, -1.02], undefined, `wild-horse-${sideName}-inner-ear`);
      innerEar.rotation.z = side * -0.22;
    }

    // Each animated leg pivot carries a thigh, cannon, cream sock and broad
    // hoof. This keeps the existing gait contract while adding real joints.
    for (const [px, pz, phase, name, lowerDrift] of [
      [-0.31, -0.43, 0, "front-left", -0.03], [0.31, -0.43, Math.PI, "front-right", -0.03],
      [-0.32, 0.57, Math.PI, "rear-left", 0.05], [0.32, 0.57, 0, "rear-right", 0.05],
    ] as Array<[number, number, number, string, number]>) {
      const leg = pivotBox([0.23, 0.53, 0.25], bodyMaterial, [px, 0.5, pz], [0, -0.265, 0], "legs", `wild-horse-${name}-upper-leg`);
      leg.userData.phase = phase;
      add(leg, [0.18, 0.42, 0.19], accentMaterial, [0, -0.69, lowerDrift], undefined, `wild-horse-${name}-cannon`);
      add(leg, [0.185, 0.2, 0.195], courserCreamMaterial, [0, -0.83, lowerDrift], undefined, `wild-horse-${name}-sock`);
      add(leg, [0.25, 0.13, 0.34], courserHoofMaterial, [0, -0.985, lowerDrift - 0.045], undefined, `wild-horse-${name}-hoof`);
    }

    // Layered mane plates follow the neck slope; small green ties are the
    // Courser's restrained Wildwood signature rather than a glowing effect.
    for (const [index, y, z, height] of [
      [1, 1.88, -0.78, 0.32], [2, 1.7, -0.62, 0.38], [3, 1.49, -0.46, 0.42],
      [4, 1.28, -0.3, 0.4], [5, 1.08, -0.14, 0.34],
    ] as Array<[number, number, number, number]>) {
      const lock = add(visual, [0.17, height, 0.27], darkMaterial, [0, y, z], undefined, `wild-horse-mane-lock-${index}`);
      lock.rotation.x = -0.42;
      if (index === 2 || index === 4) add(visual, [0.19, 0.055, 0.3], courserForestMaterial, [0, y - 0.03, z - 0.015], undefined, `wild-horse-mane-tie-${index}`).rotation.x = -0.42;
    }

    // Offset flank dapples keep the coat readable as chestnut while avoiding
    // a flat, unbroken side panel in profile.
    for (const [index, side, y, z, size] of [
      [1, -1, 0.78, 0.49, 0.14], [2, -1, 0.6, 0.68, 0.11], [3, 1, 0.74, 0.57, 0.13], [4, 1, 0.56, 0.38, 0.1],
    ] as Array<[number, number, number, number, number]>) {
      add(visual, [0.025, size, size * 1.25], accentMaterial, [side * 0.463, y, z], undefined, `wild-horse-flank-dapple-${index}`);
    }

    const tail = pivotBox([0.24, 0.3, 0.62], darkMaterial, [0, 0.85, 0.86], [0, -0.1, 0.3], "body", "wild-horse-tail");
    tail.rotation.x = 0.48;
    add(tail, [0.3, 0.28, 0.5], darkMaterial, [-0.08, -0.18, 0.7], undefined, "wild-horse-tail-left-lock").rotation.z = -0.12;
    add(tail, [0.3, 0.28, 0.5], darkMaterial, [0.08, -0.18, 0.72], undefined, "wild-horse-tail-right-lock").rotation.z = 0.12;
    add(tail, [0.34, 0.07, 0.32], courserForestMaterial, [0, -0.12, 0.48], undefined, "wild-horse-tail-tie");
    const horseSaddle = new THREE.Group();
    horseSaddle.name = "wild-horse-saddle";
    horseSaddle.visible = false;
    visual.add(horseSaddle);
    add(horseSaddle, [0.88, 0.1, 0.82], courserForestMaterial, [0, 1.01, 0.12], undefined, "wild-horse-saddle-blanket");
    add(horseSaddle, [0.72, 0.055, 0.7], courserCreamMaterial, [0, 1.075, 0.12], undefined, "wild-horse-saddle-blanket-trim");
    add(horseSaddle, [0.58, 0.25, 0.56], material(0x765035), [0, 1.19, 0.1], undefined, "wild-horse-saddle-seat");
    add(horseSaddle, [0.09, 0.88, 0.1], material(0x3c2b23), [-0.43, 0.62, 0.12], undefined, "wild-horse-left-girth");
    add(horseSaddle, [0.09, 0.88, 0.1], material(0x3c2b23), [0.43, 0.62, 0.12], undefined, "wild-horse-right-girth");
    visual.userData.saddleAnchor = [0, 1.12, 0.12];
  } else if (kind === "rimehoof-courser" || kind === "sunscar-courser" || kind === "mirestride-courser" || kind === "starbough-courser") {
    const rime = kind === "rimehoof-courser";
    const sun = kind === "sunscar-courser";
    const mire = kind === "mirestride-courser";
    const star = kind === "starbough-courser";
    const trim = material(rime ? 0xf4fbf8 : sun ? 0x513326 : mire ? 0x6f8b54 : 0xa9f3d6);
    const nose = material(sun ? 0x3b2720 : mire ? 0x344238 : 0x4a3b35);
    const hoof = material(rime ? 0x657279 : sun ? 0x3e2b24 : mire ? 0x2f4237 : 0x24323a);
    const signature = material(star ? 0x79cbb0 : rime ? 0xc7ebef : sun ? 0x7d4930 : 0x6f8d54);
    const starGlow = material(eyeColor, true, 0.88);
    const bodyWidth = rime || mire ? 0.94 : sun ? 0.78 : 0.82;
    const bodyHeight = rime ? 0.76 : mire ? 0.68 : sun ? 0.6 : 0.66;
    const chest = add(visual, [bodyWidth, bodyHeight + 0.06, sun ? 0.58 : 0.64], bodyMaterial, [0, 0.62, -0.4], "body", `${kind}-chest`);
    chest.rotation.x = mire ? -0.03 : 0.04;
    add(visual, [bodyWidth - 0.06, bodyHeight, sun ? 0.92 : 1.0], bodyMaterial, [0, 0.6, 0.14], "body", `${kind}-barrel`);
    add(visual, [bodyWidth, bodyHeight + 0.02, 0.68], bodyMaterial, [0, 0.62, 0.62], "body", `${kind}-rump`).rotation.x = -0.08;
    const neckY = mire ? 1.09 : 1.17;
    const neck = add(visual, [rime ? 0.56 : sun ? 0.39 : 0.46, rime ? 0.9 : star ? 1.04 : 0.96, 0.46], bodyMaterial, [0, neckY, -0.64], "body", `${kind}-neck`);
    neck.rotation.x = mire ? -0.32 : -0.42;
    add(visual, [sun ? 0.46 : 0.52, 0.42, sun ? 0.75 : 0.68], bodyMaterial, [0, mire ? 1.54 : 1.62, -1.03], "head", `${kind}-head`).rotation.x = sun ? -0.04 : -0.08;
    add(visual, [sun ? 0.34 : 0.38, 0.28, sun ? 0.54 : 0.48], accentMaterial, [0, mire ? 1.43 : 1.5, -1.52], undefined, `${kind}-muzzle`);
    add(visual, [sun ? 0.31 : 0.34, 0.14, 0.13], nose, [0, mire ? 1.4 : 1.46, -1.82], undefined, `${kind}-nose`);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(visual, [0.035, 0.14, 0.18], darkMaterial, [side * (sun ? 0.25 : 0.28), mire ? 1.61 : 1.72, -1.2], undefined, `${kind}-${sideName}-eye-rim`);
      add(visual, [0.04, 0.085, 0.11], eyeMaterial, [side * (sun ? 0.273 : 0.302), mire ? 1.615 : 1.725, -1.22], undefined, `${kind}-${sideName}-eye`);
      const ear = add(visual, [sun ? 0.13 : 0.15, sun ? 0.36 : 0.32, 0.15], darkMaterial, [side * 0.2, mire ? 1.91 : 1.99, -0.94], "head", `${kind}-${sideName}-ear`);
      ear.rotation.z = side * (sun ? -0.16 : -0.22);
      if (star) {
        const antler = add(visual, [0.08, 0.44, 0.08], trim, [side * 0.15, 2.08, -0.83], undefined, `${kind}-${sideName}-branch-antler`);
        antler.rotation.z = side * -0.25;
        add(visual, [0.22, 0.07, 0.08], trim, [side * 0.23, 2.2, -0.83], undefined, `${kind}-${sideName}-antler-tine`).rotation.z = side * -0.28;
      }
    }
    const hoofWidth = mire ? 0.36 : rime ? 0.3 : 0.25;
    for (const [px, pz, phase, name] of [
      [-0.32, -0.43, 0, "front-left"], [0.32, -0.43, Math.PI, "front-right"],
      [-0.33, 0.58, Math.PI, "rear-left"], [0.33, 0.58, 0, "rear-right"],
    ] as Array<[number, number, number, string]>) {
      const leg = pivotBox([sun ? 0.19 : 0.23, sun ? 0.58 : 0.53, sun ? 0.2 : 0.24], bodyMaterial, [px, 0.5, pz], [0, sun ? -0.29 : -0.265, 0], "legs", `${kind}-${name}-upper-leg`);
      leg.userData.phase = phase;
      add(leg, [sun ? 0.14 : 0.18, sun ? 0.45 : 0.42, sun ? 0.15 : 0.19], accentMaterial, [0, -0.7, mire ? 0.04 : 0], undefined, `${kind}-${name}-cannon`);
      if (rime) add(leg, [0.27, 0.18, 0.25], trim, [0, -0.84, 0], undefined, `${kind}-${name}-shaggy-fetlock`);
      if (sun) add(leg, [0.2, 0.12, 0.2], signature, [0, -0.82, 0], undefined, `${kind}-${name}-desert-wrap`);
      add(leg, [hoofWidth, mire ? 0.12 : 0.13, mire ? 0.46 : 0.35], hoof, [0, mire ? -0.99 : -0.985, mire ? -0.08 : -0.045], undefined, `${kind}-${name}-hoof`);
    }
    const maneCount = sun ? 4 : 6;
    for (let index = 0; index < maneCount; index += 1) {
      const y = (mire ? 1.75 : 1.9) - index * (mire ? 0.16 : 0.17);
      const z = -0.76 + index * 0.15;
      const lock = add(visual, [star ? 0.14 : sun ? 0.13 : 0.19, rime ? 0.38 : mire ? 0.34 : 0.3, mire ? 0.34 : 0.27], star ? signature : index % 2 === 0 ? darkMaterial : signature, [0, y, z], undefined, `${kind}-mane-lock-${index + 1}`);
      lock.rotation.x = mire ? -0.3 : -0.42;
    }
    if (rime) add(visual, [0.68, 0.34, 0.34], trim, [0, 1.27, -0.53], undefined, `${kind}-winter-ruff`).rotation.x = -0.35;
    if (sun) {
      for (const side of [-1, 1]) add(visual, [0.035, 0.07, 0.42], signature, [side * 0.245, 1.65, -1.28], undefined, `${kind}-${side < 0 ? "left" : "right"}-sun-stripe`).rotation.x = -0.08;
    }
    if (mire) {
      for (const side of [-1, 1]) add(visual, [0.03, 0.18, 0.58], signature, [side * 0.485, 0.7, 0.35], undefined, `${kind}-${side < 0 ? "left" : "right"}-reed-mark`).rotation.x = 0.2;
    }
    if (star) {
      for (const [index, side, y, z] of [[1, -1, 0.78, 0.48], [2, -1, 0.57, 0.67], [3, 1, 0.72, 0.6], [4, 1, 0.55, 0.4]] as Array<[number, number, number, number]>) {
        add(visual, [0.028, 0.12, 0.12], starGlow, [side * 0.435, y, z], undefined, `${kind}-star-mark-${index}`).rotation.x = Math.PI / 4;
      }
    }
    const tail = pivotBox([sun ? 0.18 : 0.25, sun ? 0.24 : 0.3, sun ? 0.72 : 0.62], star ? signature : darkMaterial, [0, 0.84, 0.86], [0, -0.1, 0.3], "body", `${kind}-tail`);
    tail.rotation.x = sun ? 0.35 : 0.48;
    const saddle = new THREE.Group();
    saddle.name = `${kind}-saddle`;
    saddle.visible = false;
    visual.add(saddle);
    add(saddle, [bodyWidth - 0.06, 0.1, 0.8], signature, [0, 1.02, 0.12], undefined, `${kind}-saddle-blanket`);
    add(saddle, [0.56, 0.24, 0.54], material(0x765035), [0, 1.17, 0.1], undefined, `${kind}-saddle-seat`);
    add(saddle, [0.09, 0.86, 0.1], material(0x3c2b23), [-0.43, 0.62, 0.12], undefined, `${kind}-left-girth`);
    add(saddle, [0.09, 0.86, 0.1], material(0x3c2b23), [0.43, 0.62, 0.12], undefined, `${kind}-right-girth`);
    visual.userData.saddleAnchor = [0, 1.12, 0.12];
  } else if (kind === "meadow-cow" || kind === "sunbloom-longhorn") {
    buildCow(kind);
  } else if (kind === "mistmane") {
    buildMistmane();
  } else if (kind === "sakurakit") {
    add(visual, [0.62, 0.48, 0.86], bodyMaterial, [0, 0.04, 0.12], "body", "sakurakit-body");
    add(visual, [0.54, 0.5, 0.5], accentMaterial, [0, 0.24, -0.5], "head", "sakurakit-head");
    add(visual, [0.28, 0.2, 0.25], material(0xffe8dc), [0, 0.12, -0.84], undefined, "sakurakit-muzzle");
    eyePair(0.16, 0.3, -0.76, 0.072, "sakurakit");
    add(visual, [0.07, 0.06, 0.045], material(0x4b2d43), [0, 0.16, -0.98], undefined, "sakurakit-nose");
    for (const side of [-1, 1]) {
      const ear = add(visual, [0.2, 0.46, 0.18], darkMaterial, [side * 0.2, 0.62, -0.47], undefined, `sakurakit-${side < 0 ? "left" : "right"}-ear`);
      ear.rotation.z = side * -0.2;
      add(visual, [0.11, 0.3, 0.08], material(0xffc9d8), [side * 0.2, 0.63, -0.57], undefined, `sakurakit-${side < 0 ? "left" : "right"}-inner-ear`).rotation.z = side * -0.2;
    }
    quadrupedLegs(0.21, -0.24, 0.31, -0.08, 0.36, 0.14, darkMaterial, "sakurakit");
    const tail = pivotBox([0.38, 0.38, 1.02], bodyMaterial, [0, 0.24, 0.5], [0, 0.16, 0.46], "body", "sakurakit-blossom-tail");
    tail.rotation.x = 0.5;
    for (const [index, side] of [-1, 1, -1, 1].entries()) {
      const petal = add(tail, [0.25, 0.055, 0.34], material(index % 2 ? 0xffd2df : 0xf08fb4), [(side as number) * 0.17, 0.2 + index * 0.035, 0.35 + index * 0.16], undefined, `sakurakit-tail-petal-${index + 1}`);
      petal.rotation.z = (side as number) * 0.35;
    }
  } else if (kind === "taffy-hound" || kind === "rimecoat-hound") {
    buildHound(kind);
  } else if (kind === "praline-cat" || kind === "bramblewhisk-cat") {
    buildCat(kind);
  } else if (kind === "sprinklebug") {
    add(visual, [0.38, 0.24, 0.5], bodyMaterial, [0, -0.08, 0.05], "body", "sprinklebug-body");
    add(visual, [0.34, 0.2, 0.34], accentMaterial, [0, -0.07, -0.32], "head", "sprinklebug-head");
    add(visual, [0.3, 0.1, 0.42], material(0xffbddc), [0, 0.08, 0.05], undefined, "sprinklebug-shell-crown");
    eyePair(0.1, -0.02, -0.5, 0.045, "sprinklebug");
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      for (let leg = 0; leg < 3; leg += 1) {
        const limb = add(visual, [0.28, 0.1, 0.075], darkMaterial, [side * 0.24, -0.23, -0.18 + leg * 0.2], "legs", `sprinklebug-${sideName}-leg-${leg + 1}`);
        limb.rotation.z = side * -0.32;
        limb.userData.phase = leg % 2 ? Math.PI : 0;
      }
      const antenna = add(visual, [0.035, 0.035, 0.3], darkMaterial, [side * 0.09, 0.05, -0.57], undefined, `sprinklebug-${sideName}-antenna`);
      antenna.rotation.y = side * 0.3;
    }
    for (const [index, x, z, color] of [
      [1, -0.12, -0.04, 0xffec78], [2, 0.11, 0.12, 0x72e1bf], [3, -0.08, 0.2, 0x8ac8ff], [4, 0.09, -0.16, 0xff8eac],
    ] as Array<[number, number, number, number]>) add(visual, [0.055, 0.04, 0.13], material(color, true), [x, 0.145, z], undefined, `sprinklebug-sprinkle-${index}`).rotation.y = index * 0.62;
  } else if (kind === "taffalo") {
    add(visual, [1.2, 0.86, 1.7], bodyMaterial, [0, 0.28, 0.15], "body", "taffalo-body");
    for (let fold = 0; fold < 5; fold += 1) add(visual, [1.28, 0.16, 0.3], material(fold % 2 ? 0xc77da3 : 0xa95d88), [0, 0.18 + fold * 0.13, -0.45 + fold * 0.25], undefined, `taffalo-taffy-fold-${fold + 1}`).rotation.y = (fold % 2 ? 1 : -1) * 0.06;
    add(visual, [0.82, 0.8, 0.7], accentMaterial, [0, 0.58, -0.78], "body", "taffalo-marshmallow-mane");
    add(visual, [0.78, 0.62, 0.72], bodyMaterial, [0, 0.61, -1.2], "head", "taffalo-head");
    add(visual, [0.56, 0.3, 0.42], material(0xf2bdcf), [0, 0.45, -1.68], undefined, "taffalo-gumdrop-muzzle");
    eyePair(0.23, 0.72, -1.56, 0.085, "taffalo");
    add(visual, [0.14, 0.09, 0.06], darkMaterial, [0, 0.5, -1.92], undefined, "taffalo-nose");
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(visual, [0.3, 0.16, 0.27], darkMaterial, [side * 0.46, 0.78, -1.14], undefined, `taffalo-${sideName}-ear`).rotation.z = side * -0.24;
      const horn = add(visual, [0.18, 0.5, 0.18], material(0xf0e0b7), [side * 0.34, 1.16, -1.18], undefined, `taffalo-${sideName}-wafer-horn`);
      horn.rotation.z = side * -0.5;
      add(visual, [0.2, 0.3, 0.2], material(0xe9576a), [side * 0.52, 1.34, -1.18], undefined, `taffalo-${sideName}-peppermint-horn-tip`).rotation.z = side * -0.5;
    }
    const taffaloLegs = quadrupedLegs(0.39, -0.36, 0.48, 0.27, 0.89, 0.23, darkMaterial, "taffalo");
    for (const leg of taffaloLegs.filter((candidate) => String(candidate.userData.legName).startsWith("rear-"))) {
      const sideName = String(leg.userData.legName).endsWith("left") ? "left" : "right";
      add(leg, [0.31, 0.12, 0.35], accentMaterial, [0, -0.83, 0], undefined, `taffalo-${sideName}-marshmallow-ankle`);
    }
    const tail = pivotBox([0.16, 0.16, 0.7], darkMaterial, [0, 0.4, 0.91], [0, -0.08, 0.31], "body", "taffalo-tail");
    tail.rotation.x = -0.22;
    add(tail, [0.32, 0.32, 0.32], accentMaterial, [0, -0.2, 0.67], undefined, "taffalo-tail-tuft");
    const saddle = new THREE.Group();
    saddle.name = "taffalo-saddle";
    saddle.visible = false;
    visual.add(saddle);
    add(saddle, [0.92, 0.2, 0.86], material(0x70483d), [0, 0.83, 0.08], undefined, "taffalo-saddle-seat");
    add(saddle, [1.23, 0.12, 0.2], material(0xd3ad62), [0, 0.71, 0.06], undefined, "taffalo-saddle-girth");
    visual.userData.saddleAnchor = [0, 0.83, 0.08];
  } else if (kind === "sunwash-crab" || kind === "tideglass-crab") {
    buildCrab(kind);
  } else if (kind === "emberjay" || kind === "canopy-lark" || kind === "tidewing-gull" || kind === "frostquill") {
    buildBird(kind);
  } else if (kind === "warg") {
    buildWarg();
  } else if (kind === "burrowbell") {
    buildBurrowbell();
  } else if (kind === "dewback-tapir") {
    buildDewbackTapir();
  } else if (kind === "deepwater-shark") {
    buildSlatefin();
  } else if (kind === "dreadcoil") {
    const segmentCount = 9;
    for (let segment = 0; segment < segmentCount; segment += 1) {
      const taper = 1 - segment * 0.065;
      const x = Math.sin(segment * 0.72) * 0.28;
      const y = Math.cos(segment * 0.58) * 0.1;
      const z = -1.5 + segment * 0.52;
      const pivot = new THREE.Group();
      pivot.name = `dreadcoil-segment-${segment + 1}-pivot`;
      pivot.position.set(x, y, z);
      pivot.userData.phase = segment * 0.58;
      visual.add(pivot);
      add(pivot, [0.92 * taper, 0.72 * taper, 0.66], segment % 2 ? darkMaterial : bodyMaterial, [0, 0, 0], "body", `dreadcoil-segment-${segment + 1}`);
      if (segment < 6) {
        const glowBand = add(pivot, [0.96 * taper, 0.12, 0.12], material(0xe5548a, true, 0.82), [0, 0.25 * taper, 0.1], undefined, `dreadcoil-glow-band-${segment + 1}`);
        glowBand.rotation.y = segment % 2 ? 0.18 : -0.18;
      }
    }
    add(visual, [1.12, 0.86, 1.1], bodyMaterial, [0, 0, -2.03], "head", "dreadcoil-head");
    add(visual, [0.82, 0.38, 0.74], accentMaterial, [0, -0.14, -2.82], undefined, "dreadcoil-jaw");
    eyePair(0.35, 0.18, -2.6, 0.13, "dreadcoil");
    add(visual, [0.58, 0.1, 0.08], material(0x2a1422), [0, -0.26, -3.21], undefined, "dreadcoil-mouth");
    for (const side of [-1, 1]) {
      const crest = add(visual, [0.18, 0.72, 0.64], material(0xb24777, true, 0.88), [side * 0.45, 0.44, -2.03], "wings", `dreadcoil-${side < 0 ? "left" : "right"}-head-fin`);
      crest.rotation.z = side * -0.28;
      crest.userData.side = side;
      add(visual, [0.28, 0.82, 0.7], darkMaterial, [side * 0.12, 0, 3.36], undefined, `dreadcoil-tail-${side < 0 ? "left" : "right"}`).rotation.z = side * 0.24;
    }
    visual.userData.fluidSegmentPrefix = "dreadcoil-segment-";
  } else if (kind === "abyss-skater") {
    add(visual, [1.72, 0.25, 1.28], bodyMaterial, [0, 0.04, 0], "body", "abyss-skater-mantle");
    add(visual, [1.3, 0.12, 0.92], accentMaterial, [0, 0.22, -0.02], undefined, "abyss-skater-glow-mantle");
    add(visual, [0.7, 0.28, 0.58], darkMaterial, [0, 0.02, -0.78], "head", "abyss-skater-head");
    eyePair(0.24, 0.11, -1.08, 0.085, "abyss-skater");
    for (const side of [-1, 1]) for (let leg = 0; leg < 3; leg += 1) {
      const sideName = side < 0 ? "left" : "right";
      const rootZ = -0.42 + leg * 0.42;
      const limb = pivotBox([0.68, 0.07, 0.1], darkMaterial, [side * 0.66, -0.02, rootZ], [side * 0.33, -0.04, 0], "legs", `abyss-skater-${sideName}-stilt-${leg + 1}`);
      limb.rotation.z = side * -0.42;
      limb.userData.phase = leg * Math.PI / 2 + (side < 0 ? 0 : Math.PI);
      add(limb, [0.09, 0.66, 0.09], material(0x62ead7, true, 0.86), [side * 0.63, -0.34, 0], undefined, `abyss-skater-${sideName}-glow-stilt-tip-${leg + 1}`).rotation.z = side * 0.18;
    }
    for (let lamp = 0; lamp < 4; lamp += 1) {
      add(visual, [0.15, 0.15, 0.15], material(lamp % 2 ? 0x65ead6 : 0xc8fff2, true), [-0.48 + lamp * 0.32, 0.34, 0.2], undefined, `abyss-skater-lantern-${lamp + 1}`).rotation.y = Math.PI / 4;
    }
  } else if (kind === "tidepup") {
    buildTidepup();
  } else if (kind === "worldshell-leviathan") {
    add(visual, [6.4, 1.8, 7.2], bodyMaterial, [0, 0.55, 0.2], "body", "worldshell-leviathan-body");
    add(visual, [7.6, 2.05, 7.8], accentMaterial, [0, 1.75, 0.35], "body", "worldshell-leviathan-shell");
    add(visual, [6.6, 0.72, 6.8], darkMaterial, [0, 2.88, 0.35], undefined, "worldshell-leviathan-shell-crown");
    add(visual, [2.1, 1.4, 2.5], bodyMaterial, [0, 0.48, -4.65], "head", "worldshell-leviathan-head");
    add(visual, [1.42, 0.62, 1.1], accentMaterial, [0, 0.32, -6.32], undefined, "worldshell-leviathan-beak");
    eyePair(0.7, 0.72, -5.93, 0.22, "worldshell-leviathan");
    for (const [side, z, phase, name] of [[-1, -1.9, 0, "front-left"], [1, -1.9, Math.PI, "front-right"], [-1, 2.25, Math.PI, "rear-left"], [1, 2.25, 0, "rear-right"]] as Array<[number, number, number, string]>) {
      const flipper = pivotBox([2.45, 0.44, 3.2], bodyMaterial, [side * 3.0, 0.25, z], [side * 1.15, 0, 0], "wings", `worldshell-leviathan-${name}-flipper`);
      flipper.rotation.z = side * -0.16;
      flipper.rotation.y = side * (z < 0 ? -0.18 : 0.18);
      flipper.userData.side = side;
      flipper.userData.phase = phase;
    }
    add(visual, [1.1, 0.65, 2.3], darkMaterial, [0, 0.35, 4.45], "body", "worldshell-leviathan-tail").rotation.x = 0.08;
    for (const [index, x, z, height, color] of [
      [1, -2.1, -0.8, 1.1, 0x5a8c51], [2, 1.7, -1.1, 1.45, 0x6ba35a], [3, -1.2, 1.4, 0.85, 0xe3a5bd], [4, 2.0, 1.25, 1.0, 0x7fbd69],
    ] as Array<[number, number, number, number, number]>) {
      add(visual, [0.34, height, 0.34], material(color), [x, 3.18 + height / 2, z], undefined, `worldshell-leviathan-shell-garden-${index}`);
      add(visual, [0.76, 0.18, 0.7], material(color), [x, 3.22, z], undefined, `worldshell-leviathan-shell-garden-crown-${index}`).rotation.y = index * 0.37;
    }
    const saddle = new THREE.Group();
    saddle.name = "worldshell-leviathan-saddle";
    saddle.visible = false;
    visual.add(saddle);
    add(saddle, [1.55, 0.28, 1.65], material(0x694730), [...LEVIATHAN_VISUAL_CONTRACTS.worldshell.saddleAnchor], undefined, "worldshell-leviathan-saddle-seat");
    LEVIATHAN_VISUAL_CONTRACTS.worldshell.cargoAnchors.forEach((anchor, index) => {
      const cargo = new THREE.Group();
      cargo.name = `worldshell-leviathan-cargo-${index + 1}`;
      cargo.visible = false;
      visual.add(cargo);
      add(cargo, [1.18, 0.9, 1.0], material(0x80522f), [...anchor], undefined, `worldshell-leviathan-chest-${index + 1}`);
      add(cargo, [1.22, 0.12, 1.04], material(0xd0aa53), [anchor[0], anchor[1] + 0.42, anchor[2]], undefined, `worldshell-leviathan-chest-band-${index + 1}`);
    });
    visual.userData.saddleAnchor = [...LEVIATHAN_VISUAL_CONTRACTS.worldshell.saddleAnchor];
    visual.userData.cargoAnchors = LEVIATHAN_VISUAL_CONTRACTS.worldshell.cargoAnchors.map((anchor) => [...anchor]);
    visual.userData.cargoChestLimit = LEVIATHAN_VISUAL_CONTRACTS.worldshell.cargoChestLimit;
    visual.userData.landSpeed = LEVIATHAN_VISUAL_CONTRACTS.worldshell.landSpeed;
  } else if (kind === "aetherbell-larva" || kind === "aetherbell-leviathan") {
    const adult = kind === "aetherbell-leviathan";
    const scale = adult ? 1 : 0.19;
    const bellRoot = new THREE.Group();
    bellRoot.name = `${kind}-bell-root`;
    visual.add(bellRoot);
    add(bellRoot, [5.4 * scale, 1.65 * scale, 5.4 * scale], bodyMaterial, [0, 0.55 * scale, 0], "body", `${kind}-bell`);
    add(bellRoot, [4.55 * scale, 0.78 * scale, 4.55 * scale], accentMaterial, [0, 1.56 * scale, 0], undefined, `${kind}-bell-crown`);
    add(bellRoot, [3.75 * scale, 0.18 * scale, 3.75 * scale], material(0x75f3de, true, 0.88), [0, 1.98 * scale, 0], undefined, `${kind}-crown-glow`);
    for (let ring = 0; ring < 3; ring += 1) add(bellRoot, [5.5 * scale, 0.1 * scale, (4.8 - ring * 0.48) * scale], material(ring % 2 ? 0xb68cff : 0x5be4d3, true, 0.76), [0, (0.15 + ring * 0.42) * scale, 0], undefined, `${kind}-glow-ring-${ring + 1}`);
    for (const side of [-1, 1]) {
      add(bellRoot, [0.24 * scale, 0.24 * scale, 0.12 * scale], eyeMaterial, [side * 1.3 * scale, 0.62 * scale, -2.73 * scale], undefined, `${kind}-${side < 0 ? "left" : "right"}-eye`);
      add(bellRoot, [0.09 * scale, 0.09 * scale, 0.08 * scale], material(0x1f2551), [side * 1.3 * scale, 0.62 * scale, -2.81 * scale], undefined, `${kind}-${side < 0 ? "left" : "right"}-pupil`);
    }
    const tailCount = adult ? 8 : 5;
    for (let tailIndex = 0; tailIndex < tailCount; tailIndex += 1) {
      const angle = tailIndex / tailCount * TAU;
      const radius = (adult ? 1.95 : 1.2) * scale;
      const tail = pivotBox(
        [(adult ? 0.42 : 0.54) * scale, (adult ? 4.8 : 3.4) * scale, (adult ? 0.42 : 0.5) * scale],
        tailIndex % 2 ? accentMaterial : material(0x5fe2d1, true, 0.82),
        [Math.cos(angle) * radius, -0.08 * scale, Math.sin(angle) * radius],
        [0, -(adult ? 2.35 : 1.65) * scale, 0],
        "wings",
        `${kind}-fluid-tail-${tailIndex + 1}`,
      );
      tail.userData.side = tailIndex % 2 ? -1 : 1;
      tail.userData.phase = tailIndex / tailCount * TAU;
      tail.rotation.z = Math.cos(angle) * 0.13;
      tail.rotation.x = Math.sin(angle) * 0.13;
      add(tail, [(adult ? 0.72 : 0.66) * scale, (adult ? 0.55 : 0.42) * scale, (adult ? 0.72 : 0.66) * scale], material(0xd9b5ff, true, 0.68), [0, -(adult ? 4.78 : 3.38) * scale, 0], undefined, `${kind}-tail-light-${tailIndex + 1}`);
    }
    if (adult) {
      const saddle = new THREE.Group();
      saddle.name = "aetherbell-leviathan-saddle";
      saddle.visible = false;
      visual.add(saddle);
      add(saddle, [1.25, 0.3, 1.35], material(0x69436f), [...LEVIATHAN_VISUAL_CONTRACTS.aetherbell.saddleAnchor], undefined, "aetherbell-leviathan-saddle-seat");
      const cargo = new THREE.Group();
      cargo.name = "aetherbell-leviathan-cargo-1";
      cargo.visible = false;
      visual.add(cargo);
      add(cargo, [1.05, 0.82, 0.92], material(0x65465e), [...LEVIATHAN_VISUAL_CONTRACTS.aetherbell.cargoAnchor], undefined, "aetherbell-leviathan-chest");
      add(cargo, [1.09, 0.12, 0.96], material(0x78e4d5, true), [LEVIATHAN_VISUAL_CONTRACTS.aetherbell.cargoAnchor[0], LEVIATHAN_VISUAL_CONTRACTS.aetherbell.cargoAnchor[1] + 0.38, LEVIATHAN_VISUAL_CONTRACTS.aetherbell.cargoAnchor[2]], undefined, "aetherbell-leviathan-chest-band");
      visual.userData.saddleAnchor = [...LEVIATHAN_VISUAL_CONTRACTS.aetherbell.saddleAnchor];
      visual.userData.cargoAnchors = [[...LEVIATHAN_VISUAL_CONTRACTS.aetherbell.cargoAnchor]];
      visual.userData.cargoChestLimit = LEVIATHAN_VISUAL_CONTRACTS.aetherbell.cargoChestLimit;
      visual.userData.airSeaMorph = true;
    }
    visual.userData.bellRootName = `${kind}-bell-root`;
    visual.userData.fluidTailPrefix = `${kind}-fluid-tail-`;
  } else if ((SEA_SLUG_KINDS as readonly MobKind[]).includes(kind)) {
    const slugKind = kind as SeaSlugKind;
    const [baseColor, accentColorValue, signalColor] = MOB_DEFS[slugKind].colors;
    const base = material(baseColor, slugKind === "voidglass-sea-slug", slugKind === "voidglass-sea-slug" ? 0.5 : 1);
    const accent = material(accentColorValue, ["moonlace-sea-slug", "crystal-tipped-nudibranch", "sea-angel-slug", "starlight-choir-sea-slug"].includes(slugKind), 0.88);
    const signal = material(signalColor, ["moonlace-sea-slug", "embercrown-sea-slug", "starlight-choir-sea-slug", "voidglass-sea-slug"].includes(slugKind), 0.86);
    const wideMantle = slugKind === "sunset-sea-slug" || slugKind === "spanish-dancer-sea-slug";
    const pelagic = slugKind === "blue-dragon-sea-slug" || slugKind === "sea-angel-slug";
    const footWidth = wideMantle ? 0.5 : pelagic ? 0.28 : 0.38;
    const footHeight = slugKind === "sea-angel-slug" ? 0.3 : 0.12;
    const footLength = wideMantle ? 0.86 : 0.72;
    add(visual, [footWidth, footHeight, footLength], base, [0, slugKind === "sea-angel-slug" ? 0.08 : -0.04, 0.04], "body", `${kind}-foot`);
    add(visual, [footWidth * 0.86, 0.16, footLength * 0.72], accent, [0, 0.06, 0.03], "body", `${kind}-mantle`);
    add(visual, [footWidth * 0.66, 0.15, 0.25], base, [0, 0.02, -footLength * 0.5], "head", `${kind}-head`);
    eyePair(Math.min(0.09, footWidth * 0.2), 0.075, -footLength * 0.5 - 0.13, 0.038, kind);

    const appendage = (side: -1 | 1, index: number, size: [number, number, number], position: [number, number, number], angle = 0.2) => {
      const sideName = side < 0 ? "left" : "right";
      const pivot = pivotBox(size, index % 2 ? signal : accent, position, [side * size[0] * 0.42, size[1] * 0.35, 0], "body", `${kind}-${sideName}-mantle-frill-${index}`);
      pivot.userData.slugAppendage = true;
      pivot.userData.side = side;
      pivot.userData.phase = index * 0.67;
      pivot.rotation.z = side * -angle;
      return pivot;
    };

    for (const side of [-1, 1] as const) {
      const sideName = side < 0 ? "left" : "right";
      const rhinophore = pivotBox([0.045, 0.045, 0.25], signal, [side * 0.09, 0.12, -footLength * 0.58], [0, 0.05, -0.1], "head", `${kind}-${sideName}-feeler`);
      rhinophore.userData.slugAppendage = true;
      rhinophore.userData.side = side;
      rhinophore.userData.phase = side < 0 ? 0 : Math.PI;

      if (wideMantle) for (let index = 1; index <= 6; index += 1) {
        appendage(side, index, [0.22 + index * 0.008, 0.035, 0.15], [side * 0.2, 0.11, -0.32 + index * 0.115], 0.12);
      }
      if (["blue-dragon-sea-slug", "leafsheep-sea-slug", "crystal-tipped-nudibranch", "embercrown-sea-slug", "kelpwarden-sea-slug", "starlight-choir-sea-slug"].includes(slugKind)) {
        const count = slugKind === "blue-dragon-sea-slug" ? 3 : slugKind === "leafsheep-sea-slug" ? 5 : 6;
        for (let index = 1; index <= count; index += 1) {
          const tall = slugKind === "leafsheep-sea-slug" || slugKind === "kelpwarden-sea-slug";
          appendage(side, index, [tall ? 0.12 : 0.16, tall ? 0.22 : 0.12, 0.09], [side * 0.16, 0.12, -0.28 + index * (0.54 / count)], tall ? 0.32 : 0.5);
        }
      }
      if (slugKind === "sea-angel-slug") appendage(side, 1, [0.38, 0.055, 0.48], [side * 0.15, 0.1, -0.02], 0.25);
      if (["moonlace-sea-slug", "sea-bunny-nudibranch", "ringed-phyllidia", "hooded-melibe", "voidglass-sea-slug"].includes(slugKind)) {
        appendage(side, 1, [0.16, 0.08, 0.15], [side * 0.17, 0.12, 0.16], 0.28);
      }
    }

    if (slugKind === "moonlace-sea-slug" || slugKind === "starlight-choir-sea-slug") {
      for (let branch = 0; branch < 7; branch += 1) {
        const angle = branch / 7 * TAU;
        const gill = pivotBox([0.045, 0.24, 0.045], branch % 2 ? signal : accent, [Math.cos(angle) * 0.11, 0.13, 0.22], [0, 0.1, Math.sin(angle) * 0.04], "body", `${kind}-gill-crown-${branch + 1}`);
        gill.userData.slugAppendage = true;
        gill.userData.phase = branch * 0.45;
        gill.rotation.z = Math.cos(angle) * 0.35;
        gill.rotation.x = Math.sin(angle) * 0.35;
      }
    } else if (slugKind === "sea-bunny-nudibranch") {
      for (let tuft = 0; tuft < 7; tuft += 1) add(visual, [0.045, 0.14 + (tuft % 2) * 0.05, 0.045], tuft % 2 ? signal : accent, [-0.12 + tuft * 0.04, 0.18, 0.18 + (tuft % 2) * 0.04], undefined, `${kind}-bunny-tuft-${tuft + 1}`).rotation.z = (tuft - 3) * 0.12;
    } else if (slugKind === "ringed-phyllidia") {
      for (let ring = 0; ring < 8; ring += 1) {
        const x = (ring % 2 ? 1 : -1) * (0.07 + (ring % 3) * 0.035);
        const z = -0.25 + Math.floor(ring / 2) * 0.16;
        add(visual, [0.11, 0.08, 0.11], signal, [x, 0.17, z], undefined, `${kind}-warning-ring-${ring + 1}`);
      }
    } else if (slugKind === "hooded-melibe") {
      add(visual, [0.5, 0.05, 0.38], material(signalColor, false, 0.55), [0, 0.12, -0.5], undefined, `${kind}-oral-hood`);
      for (const side of [-1, 1]) add(visual, [0.045, 0.22, 0.36], signal, [side * 0.23, 0.16, -0.5], undefined, `${kind}-${side < 0 ? "left" : "right"}-hood-rim`).rotation.z = side * -0.2;
    } else if (slugKind === "voidglass-sea-slug") {
      for (let star = 0; star < 9; star += 1) add(visual, [0.045, 0.045, 0.045], signal, [(star % 3 - 1) * 0.09, 0.16, -0.25 + Math.floor(star / 3) * 0.2], undefined, `${kind}-refracted-star-${star + 1}`);
    }
  } else if (kind === "shoalfin" || kind === "coralback" || kind === "brookdart" || kind === "gloomfin"
    || kind === "silverthread" || kind === "reedneedle" || kind === "emberribbon" || kind === "cavefilament"
    || kind === "redfin-salmon" || kind === "blue-mackerel" || kind === "glassfin" || kind === "lanternjaw" || kind === "syrupfin"
    || kind === "pocket-goldfish" || kind === "glowfin" || kind === "sunwheel-angelfish" || kind === "stonewhisker-loach") {
    const prefix = kind;
    const thin = kind === "silverthread" || kind === "reedneedle" || kind === "emberribbon" || kind === "cavefilament"
      || kind === "redfin-salmon" || kind === "blue-mackerel" || kind === "glassfin";
    const disk = kind === "sunwheel-angelfish";
    const bottomFish = kind === "stonewhisker-loach";
    const round = kind === "pocket-goldfish" || kind === "syrupfin";
    const large = kind === "coralback" ? 1.28 : kind === "brookdart" ? 0.72 : kind === "gloomfin" ? 0.92
      : kind === "redfin-salmon" ? 1.16 : kind === "blue-mackerel" ? 1.02 : kind === "glassfin" ? 0.98
      : kind === "lanternjaw" ? 1.18 : kind === "syrupfin" ? 0.9 : kind === "pocket-goldfish" ? 0.62
        : kind === "glowfin" ? 0.92 : kind === "sunwheel-angelfish" ? 1.04 : kind === "stonewhisker-loach" ? 0.9 : thin ? 0.88 : 0.82;
    const [bodyWidth, bodyHeight, bodyLength] = ({
      shoalfin: [0.52, 0.46, 0.78], coralback: [0.72, 0.58, 1.02], brookdart: [0.3, 0.24, 0.92], gloomfin: [0.56, 0.44, 0.76],
      silverthread: [0.18, 0.16, 1.18], reedneedle: [0.14, 0.12, 1.32], emberribbon: [0.22, 0.18, 1.26], cavefilament: [0.16, 0.15, 1.4],
      "redfin-salmon": [0.46, 0.38, 1.28], "blue-mackerel": [0.42, 0.34, 1.12], glassfin: [0.34, 0.5, 0.9], lanternjaw: [0.7, 0.5, 0.82],
      syrupfin: [0.55, 0.56, 0.72], glowfin: [0.48, 0.44, 0.86], "pocket-goldfish": [0.42, 0.4, 0.54],
      "sunwheel-angelfish": [0.42, 0.9, 0.7], "stonewhisker-loach": [0.7, 0.22, 1.08],
    } satisfies Record<(typeof GENERIC_FISH_KINDS)[number], [number, number, number]>)[kind];
    const headWidth = disk ? 0.38 : bottomFish ? 0.64 : bodyWidth * (kind === "lanternjaw" ? 1.04 : kind === "gloomfin" ? 0.98 : 0.84);
    const headHeight = disk ? 0.54 : bottomFish ? 0.2 : bodyHeight * (kind === "lanternjaw" ? 0.92 : 0.82);
    const headLength = bottomFish ? 0.38 : round ? 0.31 : kind === "lanternjaw" ? 0.46 : Math.max(0.28, bodyLength * 0.32);
    const headZ = -(bodyLength / 2 + headLength * 0.38);
    add(visual, [bodyWidth, bodyHeight, bodyLength], bodyMaterial, [0, 0, 0], "body", `${prefix}-body`);
    add(visual, [bodyWidth * 0.82, bodyHeight * 0.82, bodyLength * 0.34], accentMaterial, [0, 0, -bodyLength * 0.34], "body", `${prefix}-shoulder`);
    add(visual, [bodyWidth * 0.56, bodyHeight * 0.58, bodyLength * 0.32], darkMaterial, [0, 0, bodyLength * 0.48], "body", `${prefix}-tail-peduncle`);
    add(visual, [headWidth, headHeight, headLength], accentMaterial, [0, 0, headZ], "head", `${prefix}-head`);
    eyePair(Math.min(headWidth * 0.34, 0.15 * large), headHeight * 0.2, headZ - headLength / 2 - 0.018, 0.06 * large, prefix);
    add(visual, [headWidth * 0.34, Math.max(0.025, headHeight * 0.08), 0.035], darkMaterial, [0, -headHeight * 0.18, headZ - headLength / 2 - 0.025], undefined, `${prefix}-mouth`);
    for (const side of [-1, 1]) add(visual, [0.035, headHeight * 0.48, headLength * 0.46], darkMaterial, [side * headWidth * 0.47, 0, headZ + headLength * 0.14], undefined, `${prefix}-${side < 0 ? "left" : "right"}-gill`);
    const sideFinWidth = (bottomFish ? 0.48 : disk ? 0.3 : 0.36) * large;
    const sideFinCenterX = bodyWidth / 2 + sideFinWidth / 2 - FISH_FIN_ATTACHMENT_OVERLAP * large;
    for (const side of [-1, 1]) {
      const fin = add(visual, [sideFinWidth, 0.055, 0.34 * large], accentMaterial, [side * sideFinCenterX, -0.03, 0.02], "wings", `${prefix}-${side < 0 ? "left" : "right"}-fin`);
      fin.rotation.z = side * -0.25;
      fin.rotation.y = side * -0.18;
      fin.userData.side = side;
    }
    const tailMaterial = kind === "gloomfin" || kind === "glassfin" || kind === "lanternjaw" ? material(accentColor, true, 0.84) : accentMaterial;
    const tailLength = (round ? 0.62 : disk ? 0.54 : bottomFish ? 0.42 : 0.46) * large;
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const tail = pivotBox(
        [(round ? 0.22 : 0.13) * large, (disk ? 0.72 : round ? 0.62 : 0.44) * large, tailLength], tailMaterial,
        [0, 0, bodyLength / 2 - FISH_FIN_ATTACHMENT_OVERLAP * large], [side * 0.08 * large, 0, tailLength / 2], "body", `${prefix}-tail-${sideName}`,
      );
      tail.rotation.z = side * 0.22;
      tail.userData.side = side;
    }
    const dorsalHeight = (disk ? 0.78 : bottomFish ? 0.18 : 0.34) * large;
    const dorsalCenterY = bodyHeight / 2 + dorsalHeight / 2 - FISH_FIN_ATTACHMENT_OVERLAP * large;
    pivotBox([0.08 * large, dorsalHeight, (disk ? 0.54 : 0.42) * large], darkMaterial, [0, bodyHeight / 2 - FISH_FIN_ATTACHMENT_OVERLAP * large, 0.02], [0, dorsalHeight / 2, 0], "body", `${prefix}-dorsal-fin`).rotation.x = 0.12;
    add(visual, [0.07 * large, disk ? 0.7 * large : 0.2 * large, 0.36 * large], accentMaterial, [0, -bodyHeight / 2 - (disk ? 0.28 : 0.07) * large, 0.08], undefined, `${prefix}-ventral-fin`);
    if (kind === "coralback") {
      const coralMaterial = material(0xf18e7c);
      for (let plate = 0; plate < 4; plate += 1) add(visual, [bodyWidth * 0.82, 0.07, 0.2], plate % 2 ? accentMaterial : darkMaterial, [0, bodyHeight * 0.48, -0.32 + plate * 0.22], undefined, `coralback-armor-plate-${plate + 1}`);
      for (const [index, x, z, height] of [[1, -0.17, 0.14, 0.34], [2, 0.12, 0.03, 0.44], [3, 0.2, 0.25, 0.28]] as Array<[number, number, number, number]>) {
        add(visual, [0.12, height, 0.12], coralMaterial, [x, 0.36 + height / 2, z], undefined, `coralback-coral-${index}`);
      }
    } else if (kind === "gloomfin") {
      add(visual, [0.22, 0.16, 0.12], material(0x89fff1, true), [0, -0.02, -0.82], undefined, "gloomfin-lure");
      add(visual, [0.035, 0.42, 0.035], darkMaterial, [0, 0.36, -0.45], undefined, "gloomfin-lure-stem").rotation.x = -0.46;
    } else if (kind === "redfin-salmon") {
      add(visual, [0.38 * large, 0.07, 0.62 * large], material(0xc84f45), [0, -0.17 * large, 0.06], undefined, "redfin-salmon-ventral-fin");
      add(visual, [0.32 * large, 0.06, 0.42 * large], material(0xc84f45), [0, 0.22 * large, 0.11], undefined, "redfin-salmon-red-dorsal");
      for (const side of [-1, 1]) add(visual, [0.32 * large, 0.04, 0.28 * large], material(0xc84f45), [side * 0.2 * large, -0.03, 0.03], undefined, `redfin-salmon-${side < 0 ? "left" : "right"}-red-fin`);
    } else if (kind === "blue-mackerel") {
      for (let stripe = 0; stripe < 5; stripe += 1) {
        const mark = add(visual, [0.32 * large, 0.04, 0.12 * large], darkMaterial, [0, 0.15 * large, -0.3 * large + stripe * 0.24 * large], undefined, `blue-mackerel-stripe-${stripe + 1}`);
        mark.rotation.y = (stripe % 2 ? 1 : -1) * 0.12;
      }
    } else if (kind === "glassfin") {
      const glass = material(0xc9fff5, true, 0.52);
      add(visual, [bodyWidth * 0.76, bodyHeight * 0.58, bodyLength * 0.72], glass, [0, 0.03, 0.04], undefined, "glassfin-prism-core").rotation.y = Math.PI / 4;
      for (const side of [-1, 1]) add(visual, [0.22 * large, 0.035, 0.54 * large], glass, [side * bodyWidth * 0.48, 0.04, 0.14], undefined, `glassfin-${side < 0 ? "left" : "right"}-glass-sail`).rotation.y = side * -0.16;
      add(visual, [0.06 * large, 0.48 * large, 0.52 * large], glass, [0, dorsalCenterY + 0.08 * large, 0.18], undefined, "glassfin-prismatic-dorsal").rotation.x = 0.1;
    } else if (kind === "lanternjaw") {
      add(visual, [0.58 * large, 0.18 * large, 0.36 * large], darkMaterial, [0, -0.18 * large, headZ - 0.13 * large], undefined, "lanternjaw-lower-jaw");
      for (let lamp = 0; lamp < 5; lamp += 1) add(visual, [0.1 * large, 0.1 * large, 0.06 * large], material(lamp % 2 ? 0x59e4cd : 0xc0fff4, true), [-0.22 * large + lamp * 0.11 * large, -0.09 * large, headZ - 0.35 * large], undefined, `lanternjaw-jaw-light-${lamp + 1}`);
      for (const side of [-1, 1]) add(visual, [0.24 * large, 0.4 * large, 0.08 * large], material(0x5ce5d0, true, 0.74), [side * 0.27 * large, 0.13 * large, -0.08], undefined, `lanternjaw-${side < 0 ? "left" : "right"}-signal-panel`).rotation.z = side * -0.2;
    } else if (kind === "syrupfin") {
      const candyGlass = material(0xffe0a1, false, 0.68);
      add(visual, [bodyWidth * 0.82, bodyHeight * 0.32, bodyLength * 0.74], material(0x794124), [0, 0.04, 0.03], undefined, "syrupfin-molasses-stripe");
      for (const side of [-1, 1]) add(visual, [0.28 * large, 0.04, 0.4 * large], candyGlass, [side * bodyWidth * 0.58, -0.01, 0.08], undefined, `syrupfin-${side < 0 ? "left" : "right"}-glass-fin-overlay`).rotation.y = side * -0.18;
      add(visual, [0.07 * large, 0.42 * large, 0.36 * large], candyGlass, [0, dorsalCenterY + 0.03, 0.04], undefined, "syrupfin-glass-dorsal-overlay");
    } else if (kind === "pocket-goldfish") {
      add(visual, [bodyWidth * 0.7, bodyHeight * 0.24, bodyLength * 0.66], material(0xffd769), [0, 0.04, 0.02], undefined, "pocket-goldfish-golden-belly");
      add(visual, [0.08 * large, 0.22 * large, 0.22 * large], material(0xfff1b0), [0, dorsalCenterY + 0.01, -0.03], undefined, "pocket-goldfish-crest");
      for (const side of [-1, 1]) add(visual, [0.18, 0.035, 0.3], material(0xffe6a1, false, 0.76), [side * bodyWidth * 0.58, -0.06, 0.1], undefined, `pocket-goldfish-${side < 0 ? "left" : "right"}-veil-fin`).rotation.y = side * -0.22;
    } else if (kind === "glowfin") {
      const glow = material(0x77f2dc, true, 0.84);
      for (let node = 0; node < 6; node += 1) add(visual, [0.075, 0.075, 0.045], glow, [(node % 2 ? 1 : -1) * bodyWidth * 0.46, 0.08, -0.34 + Math.floor(node / 2) * 0.3], undefined, `glowfin-lumen-node-${node + 1}`);
      add(visual, [bodyWidth * 0.7, 0.045, bodyLength * 0.7], glow, [0, bodyHeight * 0.45, 0], undefined, "glowfin-lumen-back");
    } else if (kind === "sunwheel-angelfish") {
      const sun = material(0xffd65a, true, 0.9);
      for (let ray = 0; ray < 5; ray += 1) add(visual, [0.05, 0.46 - ray * 0.04, 0.05], ray % 2 ? sun : darkMaterial, [-0.16 + ray * 0.08, 0.1, -0.16 + ray * 0.14], undefined, `sunwheel-angelfish-ray-${ray + 1}`).rotation.x = -0.2;
      for (const side of [-1, 1]) {
        const pennant = pivotBox([0.045, 0.64, 0.045], sun, [side * 0.16, -bodyHeight * 0.36, 0.12], [side * 0.04, -0.3, 0.12], "body", `sunwheel-angelfish-${side < 0 ? "left" : "right"}-pennant`);
        pennant.userData.fishPennant = true;
        pennant.userData.side = side;
      }
    } else if (kind === "stonewhisker-loach") {
      const whisker = material(0xd9c58e);
      for (const side of [-1, 1]) for (let whiskerIndex = 0; whiskerIndex < 3; whiskerIndex += 1) {
        const feeler = pivotBox([0.035, 0.035, 0.34 - whiskerIndex * 0.05], whisker, [side * (0.12 + whiskerIndex * 0.07), -0.02, headZ - headLength * 0.45], [side * 0.05, -0.02 - whiskerIndex * 0.025, -0.15], "head", `stonewhisker-loach-${side < 0 ? "left" : "right"}-barbel-${whiskerIndex + 1}`);
        feeler.rotation.y = side * (0.18 + whiskerIndex * 0.12);
        feeler.userData.fishPennant = true;
        feeler.userData.side = side;
      }
      for (let saddle = 0; saddle < 4; saddle += 1) add(visual, [bodyWidth * 0.9, 0.035, 0.11], darkMaterial, [0, bodyHeight * 0.48, -0.3 + saddle * 0.22], undefined, `stonewhisker-loach-saddle-${saddle + 1}`);
    } else if (kind === "silverthread") {
      for (let scale = 0; scale < 5; scale += 1) add(visual, [bodyWidth * 1.08, 0.035, 0.14], scale % 2 ? accentMaterial : material(0xf4ffff, true, 0.72), [0, bodyHeight * 0.38, -0.42 + scale * 0.22], undefined, `silverthread-flash-scale-${scale + 1}`);
    } else if (kind === "reedneedle") {
      add(visual, [0.06, bodyHeight * 0.82, bodyLength * 0.9], material(0xc2d68a), [0, 0.02, 0], undefined, "reedneedle-current-line");
      add(visual, [0.06, 0.06, 0.42], darkMaterial, [0, -0.02, headZ - headLength * 0.6], undefined, "reedneedle-beak");
    } else if (kind === "emberribbon") {
      const ember = material(0xffa43b, true, 0.82);
      for (let coal = 0; coal < 6; coal += 1) add(visual, [bodyWidth * 1.12, 0.04, 0.1], coal % 2 ? ember : darkMaterial, [0, bodyHeight * 0.36, -0.48 + coal * 0.19], undefined, `emberribbon-heat-band-${coal + 1}`);
    } else if (kind === "cavefilament") {
      const caveGlow = material(0xaaffec, true, 0.7);
      add(visual, [bodyWidth * 0.35, bodyHeight * 1.08, bodyLength * 0.88], caveGlow, [0, 0, 0.03], undefined, "cavefilament-light-core");
      for (let node = 0; node < 5; node += 1) add(visual, [0.055, 0.055, 0.055], material(0xdffff8, true), [0, bodyHeight * 0.5, -0.4 + node * 0.22], undefined, `cavefilament-current-node-${node + 1}`);
    } else if (kind === "brookdart") {
      add(visual, [bodyWidth * 1.05, 0.04, bodyLength * 0.74], material(0x2e65ac), [0, bodyHeight * 0.18, -0.02], undefined, "brookdart-cleanwater-stripe");
      add(visual, [0.07, 0.07, 0.24], material(0xf3c95f), [0, -0.03, headZ - headLength * 0.58], undefined, "brookdart-dart-snout");
    } else if (kind === "shoalfin") {
      for (let scale = 0; scale < 6; scale += 1) add(visual, [0.11, 0.045, 0.11], scale % 2 ? material(0xe8fff7, true, 0.66) : darkMaterial, [(scale % 2 ? 1 : -1) * bodyWidth * 0.46, 0.06, -0.34 + Math.floor(scale / 2) * 0.3], undefined, `shoalfin-mirror-scale-${scale + 1}`);
    } else {
      add(visual, [0.3 * large, 0.055, 0.5 * large], material(eyeColor), [0, 0.18 * large, 0.02], undefined, `${prefix}-back-stripe`);
    }
  } else if (kind === "honeybee" || kind === "hive-queen") {
    const queen = kind === "hive-queen";
    const beeChildStart = visual.children.length;
    const scale = queen ? 1.45 : 1;
    add(visual, [0.24 * scale, 0.22 * scale, 0.34 * scale], bodyMaterial, [0, 0, 0.12], "body", `${kind}-abdomen-back`);
    add(visual, [0.25 * scale, 0.23 * scale, 0.22 * scale], darkMaterial, [0, 0, -0.08], "body", `${kind}-abdomen-band`);
    add(visual, [0.24 * scale, 0.21 * scale, 0.28 * scale], bodyMaterial, [0, 0, -0.29], "body", `${kind}-thorax`);
    add(visual, [0.23 * scale, 0.22 * scale, 0.22 * scale], accentMaterial, [0, 0.02, -0.52 * scale], "head", `${kind}-head`);
    eyePair(0.075 * scale, 0.06 * scale, -0.64 * scale, 0.055 * scale, kind);
    const wingMaterial = material(0xd9f5f0, false, 0.62);
    for (const side of [-1, 1]) {
      const wing = add(visual, [0.34 * scale, 0.035, 0.42 * scale], wingMaterial, [side * 0.21 * scale, 0.12 * scale, -0.08], "wings", `${kind}-${side < 0 ? "left" : "right"}-wing`);
      wing.rotation.z = side * -0.22;
      wing.rotation.y = side * -0.18;
      wing.userData.side = side;
      wing.userData.phase = 0;
      const antenna = add(visual, [0.035, 0.035, 0.28 * scale], darkMaterial, [side * 0.075 * scale, 0.13 * scale, -0.73 * scale], undefined, `${kind}-${side < 0 ? "left" : "right"}-antenna`);
      antenna.rotation.y = side * 0.18;
      antenna.rotation.x = -0.18;
    }
    add(visual, [0.04, 0.04, 0.23 * scale], darkMaterial, [0, -0.02, 0.38 * scale], undefined, `${kind}-stinger`);
    if (queen) for (const [index, x] of [-0.1, 0, 0.1].entries()) add(visual, [0.06, index === 1 ? 0.2 : 0.15, 0.06], material(0xf5d96a, true), [x, 0.27 + (index === 1 ? 0.025 : 0), -0.5], undefined, `hive-queen-crown-${index + 1}`);
    // Workers should read as genuinely tiny pollinators beside butterflies;
    // the queen remains an intentionally oversized, readable encounter.
    const speciesScale = queen ? 0.62 : 0.22;
    for (const child of visual.children.slice(beeChildStart)) {
      child.position.multiplyScalar(speciesScale);
      child.scale.multiplyScalar(speciesScale);
    }
  } else if (kind === "reed-dragonfly") {
    // Rebuilt from four flat planks into a real odonate: compound eyes, a
    // muscled thorax, a segmented abdomen that flexes, a leg basket, and four
    // veined wings that now hinge at their roots instead of spinning around
    // their own centres. The authored wing names stay the flap contract.
    visual.userData.wildlifeRig = "reed-dragonfly";
    const chitin = bodyMaterial;
    const chitinDark = darkMaterial;
    const chitinPale = material(0x7fd6c0);
    const eyeShell = material(0x2f6f78);
    const veinMaterial = material(0x2c5566);
    const wingMaterial = material(0xcff8ed, false, 0.5);
    const stigmaMaterial = material(0x9fd8cc);

    const head = childPivot(visual, "reed-dragonfly-head-pivot", [0, 0.01, -0.44]);
    add(head, [0.18, 0.15, 0.15], accentMaterial, [0, 0, -0.05], "head", "reed-dragonfly-head");
    add(head, [0.09, 0.05, 0.05], chitinDark, [0, -0.09, -0.12], undefined, "reed-dragonfly-mandible");
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(head, [0.11, 0.14, 0.15], eyeShell, [side * 0.08, 0.03, -0.05], undefined, `reed-dragonfly-${sideName}-eye`);
      add(head, [0.07, 0.08, 0.06], eyeMaterial, [side * 0.1, 0.05, -0.12], undefined, `reed-dragonfly-${sideName}-eye-facet`);
      add(head, [0.018, 0.018, 0.09], chitinDark, [side * 0.05, 0.07, -0.15], undefined, `reed-dragonfly-${sideName}-antenna`).rotation.x = -0.3;
    }

    add(visual, [0.16, 0.14, 0.11], chitinDark, [0, 0.01, -0.31], "body", "reed-dragonfly-prothorax");
    add(visual, [0.2, 0.19, 0.26], chitin, [0, 0.03, -0.16], "body", "reed-dragonfly-mesothorax");
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      add(visual, [0.06, 0.13, 0.2], chitinPale, [side * 0.1, 0.05, -0.17], undefined, `reed-dragonfly-${sideName}-thorax-stripe`);
      add(visual, [0.09, 0.09, 0.12], chitinDark, [side * 0.07, 0.09, -0.09], undefined, `reed-dragonfly-${sideName}-flight-muscle`);
    }

    let abdomenParent: THREE.Object3D = childPivot(visual, "reed-dragonfly-abdomen-pivot", [0, 0.01, -0.03]);
    for (let segment = 0; segment < 4; segment += 1) {
      const width = 0.125 - segment * 0.019;
      add(abdomenParent, [width, width * 0.88, 0.19], segment % 2 === 0 ? chitin : chitinDark, [0, 0, 0.09], "body", `reed-dragonfly-abdomen-${segment + 1}`);
      if (segment % 2 === 1) add(abdomenParent, [width + 0.014, 0.03, 0.045], accentMaterial, [0, 0.005, 0.17], undefined, `reed-dragonfly-abdomen-band-${segment + 1}`);
      if (segment === 3) break;
      abdomenParent = childPivot(abdomenParent, `reed-dragonfly-abdomen-${segment + 2}-pivot`, [0, 0, 0.19]);
    }
    for (const side of [-1, 1]) {
      add(abdomenParent, [0.026, 0.026, 0.07], chitinPale, [side * 0.02, 0, 0.22], undefined, `reed-dragonfly-${side < 0 ? "left" : "right"}-clasper`).rotation.y = side * 0.16;
    }

    for (const side of [-1, 1]) for (const [pair, z, chord] of [["front", -0.24, 0.17], ["rear", 0.05, 0.2]] as const) {
      const sideName = side < 0 ? "left" : "right";
      // The pivot itself carries the authored wing name so the shared flap
      // channel rotates the whole membrane about its root hinge.
      const wing = childPivot(visual, `reed-dragonfly-${sideName}-${pair}-wing`, [side * 0.07, 0.1, z]);
      wing.rotation.y = side * (pair === "front" ? -0.14 : 0.12);
      wing.rotation.z = side * -0.08;
      wing.userData.side = side;
      wing.userData.phase = pair === "front" ? 0 : Math.PI * 0.24;
      parts.wings.push(wing);
      add(wing, [0.52, 0.02, chord], wingMaterial, [side * 0.27, 0.002, 0.01], undefined, `reed-dragonfly-${sideName}-${pair}-wing-membrane`);
      add(wing, [0.54, 0.028, 0.028], veinMaterial, [side * 0.27, 0.007, -chord / 2], undefined, `reed-dragonfly-${sideName}-${pair}-wing-vein`);
      add(wing, [0.07, 0.026, 0.04], stigmaMaterial, [side * 0.46, 0.009, -chord / 2 + 0.01], undefined, `reed-dragonfly-${sideName}-${pair}-wing-stigma`);
    }

    for (const side of [-1, 1]) for (const [leg, z, reach] of [[1, -0.27, -0.13], [2, -0.19, -0.03], [3, -0.09, 0.08]] as const) {
      const sideName = side < 0 ? "left" : "right";
      const hip = childPivot(visual, `reed-dragonfly-${sideName}-leg-${leg}-pivot`, [side * 0.06, -0.05, z]);
      hip.rotation.z = side * 0.5;
      hip.userData.side = side;
      hip.userData.phase = leg * 1.9 + (side < 0 ? 0 : Math.PI);
      hip.userData.restZ = side * 0.5;
      add(hip, [0.09, 0.022, 0.022], chitinDark, [side * 0.05, -0.02, 0], undefined, `reed-dragonfly-${sideName}-femur-${leg}`);
      const knee = childPivot(hip, `reed-dragonfly-${sideName}-knee-${leg}-pivot`, [side * 0.09, -0.04, 0]);
      knee.rotation.z = side * 0.9;
      add(knee, [0.02, 0.1, 0.02], chitin, [0, -0.05, reach * 0.3], undefined, `reed-dragonfly-${sideName}-tibia-${leg}`);
      if (leg === 1) add(knee, [0.018, 0.018, 0.06], chitinPale, [0, -0.1, reach * 0.5], undefined, `reed-dragonfly-${sideName}-tarsal-claw-${leg}`);
    }
  } else if (["meadow-cottontail", "russet-rabbit", "frost-hare", "chocolate-bunny"].includes(kind)) {
    const frost = kind === "frost-hare";
    const chocolate = kind === "chocolate-bunny";
    const muzzleMaterial = material(chocolate ? 0xb97345 : 0xead9c5);
    const pink = material(chocolate ? 0xe8a4ae : 0xd9a5a0);
    const whiskerMaterial = material(frost ? 0xfafcff : 0xe8ddcf);
    visual.userData.wildlifeRig = "rabbit";
    visual.userData.authoredScale = 0.82;
    add(visual, [0.68, 0.52, 0.72], bodyMaterial, [0, 0.05, 0.12], "body", `${kind}-body`);
    add(visual, [0.58, 0.5, 0.5], bodyMaterial, [0, 0.08, 0.36], undefined, `${kind}-haunch`);
    add(visual, [0.5, 0.44, 0.48], accentMaterial, [0, 0.2, -0.38], undefined, `${kind}-chest`);
    const head = pivotBox([0.5, 0.43, 0.48], accentMaterial, [0, 0.28, -0.5], [0, 0, 0], "head", `${kind}-head`);
    add(head, [0.31, 0.19, 0.22], muzzleMaterial, [0, -0.08, -0.36], undefined, `${kind}-muzzle`);
    add(head, [0.2, 0.18, 0.18], muzzleMaterial, [-0.15, -0.06, -0.32], undefined, `${kind}-left-cheek`);
    add(head, [0.2, 0.18, 0.18], muzzleMaterial, [0.15, -0.06, -0.32], undefined, `${kind}-right-cheek`);
    for (const side of [-1, 1]) add(head, [0.07, 0.075, 0.045], eyeMaterial, [side * 0.15, 0.08, -0.27], undefined, `${kind}-${side < 0 ? "left" : "right"}-eye`);
    add(head, [0.07, 0.06, 0.04], pink, [0, -0.01, -0.49], undefined, `${kind}-nose`);
    add(head, [0.06, 0.06, 0.04], material(0xffffff), [0, -0.14, -0.48], undefined, `${kind}-front-teeth`);
    for (const side of [-1, 1]) {
      const sideName = side < 0 ? "left" : "right";
      const earLength = frost ? 0.65 : 0.52;
      // The pivot is embedded in the crown instead of hovering above it. A
      // small root tuft bridges the rotated ear to the head in every pose, so
      // runtime, portraits and hopping animation all share the same attachment.
      const ear = pivotBox([0.14, earLength, 0.14], bodyMaterial, [side * 0.14, 0.305, -0.33], [side * 0.025, earLength / 2, 0], "head", `${kind}-${sideName}-ear`);
      ear.rotation.z = side * (frost ? -0.12 : -0.18);
      add(ear, [0.18, 0.13, 0.16], accentMaterial, [0, 0.015, 0.01], undefined, `${kind}-${sideName}-ear-root`);
      add(ear, [0.065, earLength * 0.58, 0.025], material(chocolate ? 0xe7a8ac : 0xd9a5a0), [side * 0.026, earLength / 2, -0.075], undefined, `${kind}-${sideName}-inner-ear`);
      if (frost) add(ear, [0.15, 0.16, 0.15], darkMaterial, [side * 0.025, earLength - 0.055, 0], undefined, `${kind}-${sideName}-ear-tip`);
      const rear = pivotBox([0.28, 0.28, 0.36], darkMaterial, [side * 0.22, -0.05, 0.34], [0, -0.11, 0.03], "legs", `${kind}-${sideName}-rear-leg`);
      rear.userData.phase = side < 0 ? 0 : Math.PI;
      add(rear, [0.3, 0.1, 0.42], accentMaterial, [0, -0.23, -0.04], undefined, `${kind}-${sideName}-rear-foot`);
      const front = pivotBox([0.15, 0.25, 0.21], accentMaterial, [side * 0.16, -0.05, -0.22], [0, -0.11, -0.03], "legs", `${kind}-${sideName}-front-paw`);
      front.userData.phase = side < 0 ? Math.PI : 0;
      for (let whisker = 0; whisker < 3; whisker += 1) {
        const whisk = add(head, [0.34, 0.022, 0.022], whiskerMaterial, [side * 0.27, -0.07 + whisker * 0.065, -0.42], undefined, `${kind}-${sideName}-whisker-${whisker + 1}`);
        whisk.rotation.z = side * (-0.16 + whisker * 0.15);
        whisk.rotation.y = side * -0.12;
      }
    }
    add(visual, [0.32, 0.32, 0.32], material(frost ? 0xffffff : chocolate ? 0xc98b60 : 0xf4eee4), [0, 0.13, 0.65], undefined, `${kind}-cottontail`);
    if (chocolate) {
      const bow = material(0xf5a7b4);
      add(visual, [0.22, 0.12, 0.08], bow, [-0.16, 0.09, -0.63], undefined, `${kind}-left-bow-loop`).rotation.z = -0.38;
      add(visual, [0.22, 0.12, 0.08], bow, [0.16, 0.09, -0.63], undefined, `${kind}-right-bow-loop`).rotation.z = 0.38;
      add(visual, [0.12, 0.12, 0.1], material(0xffd56b), [0, 0.09, -0.68], undefined, `${kind}-bow-knot`);
    }
  } else if (kind === "peelop") {
    buildPeelop();
  } else if (kind === "reliquary-sentinel") {
    add(visual, [0.86, 0.82, 0.62], bodyMaterial, [0, 0.62, 0], "body", "reliquary-sentinel-torso");
    add(visual, [0.34, 0.42, 0.14], material(0xffd36c, true), [0, 0.66, -0.37], undefined, "reliquary-sentinel-core");
    add(visual, [0.62, 0.52, 0.56], accentMaterial, [0, 1.25, -0.02], "head", "reliquary-sentinel-head");
    eyePair(0.17, 1.31, -0.31, 0.09, "reliquary-sentinel");
    for (const side of [-1, 1]) {
      add(visual, [0.32, 0.28, 0.7], darkMaterial, [side * 0.57, 0.91, 0.02], undefined, `reliquary-sentinel-${side < 0 ? "left" : "right"}-shoulder`);
      const arm = pivotBox([0.25, 0.78, 0.28], bodyMaterial, [side * 0.55, 0.82, 0], [0, -0.38, 0], "arms", `reliquary-sentinel-${side < 0 ? "left" : "right"}-arm`);
      arm.userData.side = side;
      arm.userData.phase = side < 0 ? 0 : Math.PI;
      add(arm, [0.38, 0.28, 0.42], darkMaterial, [0, -0.82, -0.04], undefined, `reliquary-sentinel-${side < 0 ? "left" : "right"}-fist`);
      const leg = pivotBox([0.34, 0.74, 0.38], accentMaterial, [side * 0.25, 0.34, 0.04], [0, -0.37, 0], "legs", `reliquary-sentinel-${side < 0 ? "left" : "right"}-leg`);
      leg.userData.phase = side < 0 ? 0 : Math.PI;
      add(leg, [0.48, 0.22, 0.62], darkMaterial, [0, -0.78, -0.11], undefined, `reliquary-sentinel-${side < 0 ? "left" : "right"}-foot`);
    }
    for (const [index, x] of [-0.22, 0, 0.22].entries()) add(visual, [0.13, 0.34 + (index === 1 ? 0.15 : 0), 0.18], bodyMaterial, [x, 1.66 + (index === 1 ? 0.07 : 0), 0], undefined, `reliquary-sentinel-crown-${index + 1}`);
  } else if (kind === "skeleton") {
    const bone = bodyMaterial;
    const graveCloth = material(0x35404f);
    const rust = material(0x76513b);
    visual.userData.wildlifeRig = "skeleton-archer";
    add(visual, [0.42, 0.32, 0.3], darkMaterial, [0, 0.35, 0], "body", "skeleton-pelvis");
    add(visual, [0.68, 0.16, 0.42], graveCloth, [0, 0.39, 0.05], undefined, "skeleton-tattered-skirt");
    add(visual, [0.12, 0.72, 0.12], bone, [0, 0.72, 0.05], undefined, "skeleton-spine");
    for (let rib = 0; rib < 4; rib += 1) add(visual, [0.68 - rib * 0.05, 0.075, 0.14], bone, [0, 0.6 + rib * 0.14, 0], undefined, `skeleton-rib-${rib + 1}`);
    add(visual, [0.52, 0.5, 0.46], bone, [0, 1.28, -0.03], "head", "skeleton-skull");
    add(visual, [0.38, 0.14, 0.2], accentMaterial, [0, 1.08, -0.17], undefined, "skeleton-jaw");
    eyePair(0.15, 1.36, -0.275, 0.11, "skeleton");
    add(visual, [0.68, 0.14, 0.54], graveCloth, [0, 1.52, 0.02], undefined, "skeleton-hood-crown");
    add(visual, [0.16, 0.5, 0.17], graveCloth, [0, 1.68, 0.17], undefined, "skeleton-hood-tail").rotation.x = -0.38;
    add(visual, [0.065, 0.28, 0.05], darkMaterial, [0.12, 1.43, -0.27], undefined, "skeleton-skull-crack").rotation.z = 0.48;
    for (const side of [-1, 1]) {
      const leg = pivotBox([0.14, 0.78, 0.16], bone, [side * 0.18, 0.32, 0], [0, -0.39, 0], "legs", `skeleton-${side < 0 ? "left" : "right"}-leg`);
      leg.userData.phase = side < 0 ? 0 : Math.PI;
      add(leg, [0.24, 0.1, 0.38], accentMaterial, [0, -0.8, -0.1], undefined, `skeleton-${side < 0 ? "left" : "right"}-foot`);
      const arm = pivotBox([0.13, 0.7, 0.13], bone, [side * 0.41, 1.02, 0], [0, -0.35, 0], "arms", `skeleton-${side < 0 ? "left" : "right"}-arm`);
      arm.userData.side = side;
      arm.userData.phase = side < 0 ? 0 : Math.PI;
      add(visual, [0.32, 0.14, 0.28], side < 0 ? graveCloth : rust, [side * 0.42, 1.15, 0.02], undefined, `skeleton-${side < 0 ? "left" : "right"}-shoulder-guard`).rotation.z = side * -0.14;
    }
    const bowMaterial = material(0x7b4d27);
    const bowRoot = parts.arms[0];
    add(bowRoot, [0.09, 0.34, 0.08], bowMaterial, [-0.04, -0.66, -0.23], undefined, "skeleton-bow-grip").rotation.z = -0.18;
    add(bowRoot, [0.08, 0.5, 0.08], bowMaterial, [-0.14, -0.25, -0.23], undefined, "skeleton-bow-upper-limb").rotation.z = 0.2;
    add(bowRoot, [0.08, 0.5, 0.08], bowMaterial, [-0.14, -1.07, -0.23], undefined, "skeleton-bow-lower-limb").rotation.z = -0.56;
    add(bowRoot, [0.025, 0.91, 0.025], material(0xe5d7b6), [0.02, -0.66, -0.25], undefined, "skeleton-bow-string");
    add(bowRoot, [0.035, 0.035, 0.74], material(0x8a6339), [0.02, -0.65, -0.62], undefined, "skeleton-nocked-arrow");
    add(visual, [0.28, 0.62, 0.3], rust, [0.34, 0.94, 0.3], undefined, "skeleton-quiver").rotation.z = -0.2;
    for (let arrow = 0; arrow < 4; arrow += 1) {
      const shaft = add(visual, [0.035, 0.72, 0.035], material(0x8a6339), [0.25 + arrow * 0.06, 1.43 + (arrow % 2) * 0.07, 0.3], undefined, `skeleton-quiver-arrow-${arrow + 1}`);
      shaft.rotation.z = -0.14 + arrow * 0.04;
      add(visual, [0.11, 0.12, 0.05], graveCloth, [0.15 + arrow * 0.09, 1.77 + (arrow % 2) * 0.07, 0.3], undefined, `skeleton-arrow-fletching-${arrow + 1}`);
    }
  } else if (kind === "zombie") {
    const zombie = createZombieSpec();
    const limbPivotPositions: Record<string, [number, number, number]> = {
      leftLeg: [-0.16, 0.74, 0], rightLeg: [0.16, 0.74, 0],
      leftArm: [-0.445, 1.25, 0.09], rightArm: [0.445, 1.25, 0.09],
    };
    const limbPivots = new Map<string, THREE.Group>();
    for (const modelBox of zombie.boxes) {
      const meshMaterial = modelBox.emissive
        ? new THREE.MeshBasicMaterial({ color: modelBox.color })
        : new THREE.MeshLambertMaterial({ color: modelBox.color });
      const semantic: keyof MobVisualParts = modelBox.part.includes("Leg") ? "legs"
        : modelBox.part.includes("Arm") ? "arms"
          : modelBox.part === "head" ? "head" : "body";
      const pivotPosition = limbPivotPositions[modelBox.part];
      let parent: THREE.Object3D = visual;
      let position = [...modelBox.position] as [number, number, number];
      if (pivotPosition) {
        let pivot = limbPivots.get(modelBox.part);
        if (!pivot) {
          pivot = new THREE.Group();
          pivot.name = `zombie-${modelBox.part}-pivot`;
          pivot.position.set(...pivotPosition);
          pivot.userData.phase = modelBox.part === "leftLeg" || modelBox.part === "leftArm" ? 0 : Math.PI;
          visual.add(pivot);
          parts[semantic].push(pivot);
          limbPivots.set(modelBox.part, pivot);
        }
        parent = pivot;
        position = [modelBox.position[0] - pivotPosition[0], modelBox.position[1] - pivotPosition[1], modelBox.position[2] - pivotPosition[2]];
      }
      const mesh = add(parent, [...modelBox.size] as [number, number, number], meshMaterial, position, pivotPosition ? undefined : semantic, `zombie-${modelBox.id}`);
      mesh.rotation.set(...(modelBox.rotation ?? [0, 0, 0]));
      mesh.userData.bodyPart = modelBox.part;
    }
    bodyMaterial.dispose();
    accentMaterial.dispose();
    eyeMaterial.dispose();
    darkMaterial.dispose();
  }

  group.userData.mobId = id;
  return { group, visual, parts };
}

export type CompanionPoseKind = "taffy-hound" | "rimecoat-hound" | "praline-cat" | "bramblewhisk-cat";

/** Adds readable head, ear and segmented-tail motion without replacing the shared gait rig. */
export function applyCompanionPose(
  visual: THREE.Object3D,
  kind: CoreMobKind,
  timeSeconds: number,
  travelAmount = 0,
  alertAmount = 0,
) {
  if (!["taffy-hound", "rimecoat-hound", "praline-cat", "bramblewhisk-cat"].includes(kind)) return false;
  const companionKind = kind as CompanionPoseKind;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const travel = THREE.MathUtils.clamp(Number.isFinite(travelAmount) ? travelAmount : 0, 0, 1);
  const alert = THREE.MathUtils.clamp(Number.isFinite(alertAmount) ? alertAmount : 0, 0, 1);
  const hound = companionKind.endsWith("hound");
  const head = visual.getObjectByName(`${companionKind}-head-pivot`);
  if (head) {
    head.rotation.y = Math.sin(time * (hound ? 1.7 : 1.25)) * (0.045 + alert * 0.06);
    head.rotation.x = Math.sin(time * 2.1) * 0.025 - alert * 0.055;
  }
  for (const sideName of ["left", "right"] as const) {
    const ear = visual.getObjectByName(`${companionKind}-${sideName}-ear-root-pivot`);
    if (!ear) continue;
    const side = sideName === "left" ? -1 : 1;
    const restZ = Number(ear.userData.restZ) || 0;
    ear.rotation.z = restZ + side * Math.sin(time * (hound ? 3.1 : 2.4) + side) * (0.025 + alert * 0.045);
    ear.rotation.x = alert * (hound ? -0.1 : -0.16);
  }
  const tailRoot = visual.getObjectByName(`${companionKind}-tail-root-pivot`);
  const tailMid = visual.getObjectByName(`${companionKind}-tail-mid-pivot`);
  const tailTip = visual.getObjectByName(`${companionKind}-tail-tip-pivot`);
  // Hounds keep their cheerful resting wag, but walking adds weight rather
  // than turning the tail into a high-frequency metronome.
  const wagRate = hound ? 4.2 + travel * 1.15 : 1.35 + travel * 2.1;
  const wag = Math.sin(time * wagRate) * (hound ? 0.14 + travel * 0.18 + alert * 0.1 : 0.08 + travel * 0.12);
  if (tailRoot) {
    tailRoot.rotation.x = (companionKind === "taffy-hound" ? 0.52 : companionKind === "rimecoat-hound" ? 0.35 : companionKind === "praline-cat" ? 0.48 : 0.36) + Math.cos(time * 1.8) * 0.025;
    tailRoot.rotation.y = wag;
  }
  if (tailMid) tailMid.rotation.y = wag * (hound ? 0.72 : 1.4);
  if (tailTip) tailTip.rotation.y = wag * 1.65 + Math.sin(time * 1.9) * 0.08;
  return true;
}

/** Secondary motion for rebuilt wildlife: attentive heads, living ears, tails, trunks, foliage and aquatic propulsion. */
export function applyWildlifePose(
  visual: THREE.Object3D,
  kind: CoreMobKind,
  timeSeconds: number,
  travelAmount = 0,
  alertAmount = 0,
) {
  const rig = String(visual.userData.wildlifeRig ?? "");
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const travel = THREE.MathUtils.clamp(Number.isFinite(travelAmount) ? travelAmount : 0, 0, 1);
  const alert = THREE.MathUtils.clamp(Number.isFinite(alertAmount) ? alertAmount : 0, 0, 1);
  if (rig === "embercarapace-beetle") return applyEmbercarapaceBeetlePose(visual, time, travel, alert);
  // Living Bestiary models carry their own cached rig instead of a legacy
  // `wildlifeRig` tag. Previously this early-return skipped every authored
  // quadruped gait, including the Trufflehog's four articulated legs.
  if (!rig) return applyAdventureMobPose(visual, kind, time, travel, alert)
    || applyLivingBestiaryPose(visual, kind, time, travel, alert);
  const head = visual.getObjectByName(`${kind}-head-pivot`);
  if (head) {
    head.rotation.y = Math.sin(time * 1.35) * (0.035 + alert * 0.07);
    head.rotation.x = Math.sin(time * 1.8) * 0.018 - alert * 0.045;
  }
  for (const sideName of ["left", "right"] as const) {
    const side = sideName === "left" ? -1 : 1;
    const ear = visual.getObjectByName(`${kind}-${sideName}-ear-pivot`);
    if (ear) {
      ear.rotation.z = side * Math.sin(time * 2.35 + side) * (0.025 + alert * 0.045);
      ear.rotation.x = -alert * 0.1;
    }
  }
  const tail = visual.getObjectByName(`${kind}-tail-root-pivot`);
  const secondaryTail = visual.getObjectByName(`${kind}-tail-secondary-pivot`);
  const tailTip = visual.getObjectByName(`${kind}-tail-tip-pivot`);
  const tailCadence = wildlifeTailCadence(rig, travel);
  const wag = Math.sin(time * tailCadence) * (0.06 + travel * 0.14 + alert * 0.06);
  if (tail) tail.rotation.y = wag;
  if (secondaryTail) secondaryTail.rotation.y = -wag * 0.9;
  if (tailTip) tailTip.rotation.y = wag * 1.45;

  if (["prismtail-swift", "ashnose-bat", "chimewing", "cinder-kite"].includes(rig)) {
    const flapRate = rig === "ashnose-bat" ? 14 : rig === "cinder-kite" ? 4.8 : 8.5;
    // A single stroke clock drives both sides. Their Z rotations must be
    // mirrored, not phase-shifted, or one wing rises while its mate falls.
    const wingStroke = -0.16 + Math.sin(time * (flapRate + travel * 4)) * (0.16 + travel * 0.28);
    for (const sideName of ["left", "right"] as const) {
      const side = sideName === "left" ? -1 : 1;
      const wing = visual.getObjectByName(`${kind}-${sideName}-wing-pivot`);
      if (wing) wing.rotation.z = side * wingStroke;
    }
    const flightTail = visual.getObjectByName(`${kind}-tail-pivot`);
    if (flightTail) flightTail.rotation.y = Math.sin(time * 2.1) * (0.08 + travel * 0.12);
    if (rig === "prismtail-swift") {
      for (let feather = 1; feather <= 5; feather += 1) {
        const prism = visual.getObjectByName(`${kind}-prism-tail-feather-${feather}`);
        if (prism) prism.rotation.x = Math.sin(time * 4.1 + feather * 0.45) * (0.025 + travel * 0.035);
      }
    } else if (rig === "ashnose-bat") {
      const nose = visual.getObjectByName(`${kind}-heat-leaf-nose`);
      if (nose) nose.scale.setScalar(1 + Math.sin(time * 3.8) * 0.09);
    } else if (rig === "chimewing") {
      for (const sideName of ["left", "right"] as const) {
        const chime = visual.getObjectByName(`${kind}-${sideName}-wing-chime`);
        if (chime) chime.rotation.z = Math.sin(time * 3.2 + (sideName === "left" ? 0 : Math.PI)) * (0.08 + travel * 0.1);
      }
      for (let chime = 1; chime <= 3; chime += 1) {
        const tailChime = visual.getObjectByName(`${kind}-tail-chime-${chime}`);
        if (tailChime) tailChime.rotation.z = Math.sin(time * 2.6 + chime * 0.7) * 0.07;
      }
    } else if (rig === "cinder-kite") {
      for (let vent = 1; vent <= 3; vent += 1) {
        const emberVent = visual.getObjectByName(`${kind}-back-vent-${vent}`);
        if (!emberVent) continue;
        const pulse = 1 + Math.sin(time * 2.8 + vent * 0.8) * 0.1;
        emberVent.scale.set(pulse, pulse, 1);
      }
    }
  } else if (rig === "glassback-newt") {
    const newtTail = visual.getObjectByName("glassback-newt-tail");
    if (newtTail) newtTail.rotation.y = Math.sin(time * (2.4 + travel * 4.2)) * (0.08 + travel * 0.18);
    for (const sideName of ["left", "right"] as const) for (let gill = 1; gill <= 3; gill += 1) {
      const gillPart = visual.getObjectByName(`glassback-newt-${sideName}-gill-${gill}`);
      if (gillPart) gillPart.rotation.x = Math.sin(time * 2 + gill) * 0.04;
    }
  } else if (rig === "grotto-grazer") {
    const grazerHead = visual.getObjectByName("grotto-grazer-head-pivot");
    if (grazerHead) grazerHead.rotation.x += Math.max(0, Math.sin(time * 0.7)) * 0.09;
    for (let root = 1; root <= 3; root += 1) {
      const sprout = visual.getObjectByName(`grotto-grazer-back-root-${root}`);
      if (sprout) sprout.rotation.z = Math.sin(time * 1.1 + root) * 0.025;
    }
  } else if (rig === "veinling") {
    for (let vein = 1; vein <= 5; vein += 1) {
      const seam = visual.getObjectByName(`veinling-living-seam-${vein}`);
      if (!seam) continue;
      const pulse = 1 + Math.sin(time * 1.4 + vein * 0.55) * 0.08;
      seam.scale.set(pulse, pulse, 1);
    }
    const heart = visual.getObjectByName("veinling-unresolved-heart");
    if (heart) heart.scale.setScalar(1 + Math.sin(time * 1.4 + 0.4) * 0.08);
  } else if (rig === "clockwork-hound-golem") {
    const cadence = time * (2.4 + travel * 6.8);
    const jaw = visual.getObjectByName("clockwork-hound-golem-jaw-attack-pivot");
    if (jaw) jaw.rotation.x = -0.045 - alert * (0.36 + Math.max(0, Math.sin(time * 12)) * 0.14) - Math.max(0, Math.sin(time * 1.2 - 0.8)) * 0.025;
    const houndHead = visual.getObjectByName("clockwork-hound-golem-head-pivot");
    if (houndHead) {
      houndHead.position.z = (Number(houndHead.userData.baseZ) || -0.83) - alert * 0.07;
      houndHead.rotation.x += -alert * 0.075 + Math.sin(time * 2.1) * 0.012;
    }
    for (const sideName of ["left", "right"] as const) {
      const side = sideName === "left" ? -1 : 1;
      const ear = visual.getObjectByName(`clockwork-hound-golem-${sideName}-ear-pivot`);
      if (ear) {
        const restZ = Number(ear.userData.restZ) || side * -0.16;
        ear.rotation.z = restZ + side * Math.sin(time * 3.1 + side) * (0.025 + alert * 0.075);
        ear.rotation.x = (Number(ear.userData.restX) || 0.24) - alert * 0.16 + Math.sin(time * 2.7 + side) * 0.018;
      }
      const gear = visual.getObjectByName(`clockwork-hound-golem-${sideName}-shoulder-gear-pivot`);
      if (gear) gear.rotation.x = cadence * side * -0.72;
    }
    for (const positionName of ["front-left", "front-right", "rear-left", "rear-right"] as const) {
      const leg = visual.getObjectByName(`clockwork-hound-golem-${positionName}-upper-leg-pivot`);
      const knee = visual.getObjectByName(`clockwork-hound-golem-${positionName}-knee-pivot`);
      const paw = visual.getObjectByName(`clockwork-hound-golem-${positionName}-paw-pivot`);
      const phase = Number(knee?.userData.phase) || 0;
      const stride = Math.sin(cadence + phase) * travel * 0.18;
      // Override the broad generic biped swing with a planted canine gait.
      if (leg) leg.rotation.x = stride;
      if (knee) knee.rotation.x = (Number(knee.userData.restX) || 0) - stride * 0.72;
      if (paw) paw.rotation.x = stride * 0.46 - travel * 0.018;
    }
    const core = visual.getObjectByName("clockwork-hound-golem-chest-aether-core");
    if (core) core.scale.setScalar(1 + Math.sin(time * 3.8) * 0.07 + alert * 0.08);
  } else if (rig === "webspinner-golem") {
    const cadence = time * (2 + travel * 6.2);
    const spiderHead = visual.getObjectByName("webspinner-golem-head-pivot");
    if (spiderHead) {
      spiderHead.position.z = (Number(spiderHead.userData.baseZ) || -0.6) - alert * 0.13;
      spiderHead.rotation.x += Math.sin(time * 1.9) * 0.012 - alert * 0.09;
    }
    for (const sideName of ["left", "right"] as const) {
      const side = sideName === "left" ? -1 : 1;
      const fang = visual.getObjectByName(`webspinner-golem-${sideName}-fang-attack-pivot`);
      if (fang) {
        fang.rotation.x = -0.08 - alert * (0.48 + Math.max(0, Math.sin(time * 11 + side)) * 0.12);
        fang.rotation.y = side * (0.1 + alert * 0.12);
      }
      for (let row = 0; row < 4; row += 1) {
        const leg = visual.getObjectByName(`webspinner-golem-${sideName}-leg-${row + 1}-pivot`);
        const knee = visual.getObjectByName(`webspinner-golem-${sideName}-leg-${row + 1}-knee-pivot`);
        const foot = visual.getObjectByName(`webspinner-golem-${sideName}-leg-${row + 1}-foot-pivot`);
        const phase = Number(knee?.userData.phase) || 0;
        const stride = Math.sin(cadence + phase) * travel * 0.17;
        // Keep all eight hooks close to grade instead of inheriting the biped arc.
        if (leg) leg.rotation.x = stride;
        if (knee) knee.rotation.x = (Number(knee.userData.restX) || 0) - stride * 0.82;
        if (foot) {
          foot.rotation.x = stride * 0.52;
          foot.rotation.z = side * Math.cos(cadence + phase) * travel * 0.045;
        }
      }
    }
    const driveRing = visual.getObjectByName("webspinner-golem-drive-ring-pivot");
    if (driveRing) driveRing.rotation.y = cadence * 0.42;
    const spinneret = visual.getObjectByName("webspinner-golem-spinneret-pivot");
    if (spinneret) spinneret.scale.set(1, 1 + Math.sin(time * 2.6) * 0.035 + alert * 0.06, 1 + alert * 0.08);
    const abdomen = visual.getObjectByName("webspinner-golem-spool-abdomen");
    if (abdomen) abdomen.scale.y = 1 + Math.sin(time * 1.35) * 0.025;
    const core = visual.getObjectByName("webspinner-golem-loom-aether-core");
    if (core) core.scale.setScalar(1 + Math.sin(time * 4.1) * 0.09 + alert * 0.07);
  } else if (rig === "mossling") {
    if (kind === "moonbrawn-mossling") {
      const cadence = time * (1.45 + travel * 3.2);
      for (const sideName of ["left", "right"] as const) {
        const side = sideName === "left" ? -1 : 1;
        const arm = visual.getObjectByName(`${kind}-${sideName}-arm-pivot`);
        const forearm = visual.getObjectByName(`${kind}-${sideName}-forearm-pivot`);
        const leg = visual.getObjectByName(`${kind}-${sideName}-leg-pivot`);
        const phase = side < 0 ? 0 : Math.PI;
        if (arm) arm.rotation.x = (Number(arm.userData.restX) || -0.08) + Math.sin(cadence + phase) * travel * 0.24 - alert * 0.16;
        if (forearm) forearm.rotation.x = (Number(forearm.userData.restX) || -0.12) - Math.max(0, Math.sin(cadence + phase)) * travel * 0.16 - alert * 0.2;
        if (leg) leg.rotation.x = Math.sin(cadence + phase) * travel * 0.18;
      }
      const torso = visual.getObjectByName(`${kind}-rootheart-torso`);
      if (torso) torso.scale.y = 1 + Math.sin(time * 1.55) * 0.018;
      const heart = visual.getObjectByName(`${kind}-moonberry-rootheart`);
      if (heart) heart.scale.setScalar(1 + Math.sin(time * 2.15) * 0.045 + alert * 0.04);
    }
    for (const suffix of ["sprout-stem", "flower-stem", "lantern-stalk"]) {
      const stem = visual.getObjectByName(`${kind}-${suffix}`);
      if (stem) stem.rotation.z += Math.sin(time * 1.15) * (0.018 + travel * 0.025);
    }
  } else if (rig === "tapir") {
    const trunk = visual.getObjectByName(`${kind}-trunk-root-pivot`);
    const tip = visual.getObjectByName(`${kind}-trunk-tip-pivot`);
    if (trunk) trunk.rotation.x = Math.sin(time * 1.6) * 0.055 - travel * 0.04;
    if (tip) {
      tip.rotation.x = Math.sin(time * 2.1 + 0.7) * 0.09;
      tip.rotation.y = Math.sin(time * 1.1) * 0.045;
    }
  } else if (rig === "mistmane") {
    const mane = visual.getObjectByName(`${kind}-mane-root-pivot`);
    if (mane) mane.rotation.z = Math.sin(time * (1.2 + travel)) * (0.025 + travel * 0.04);
  } else if (rig === "ridgeback") {
    for (const sideName of ["left", "right"] as const) {
      const tusk = visual.getObjectByName(`${kind}-${sideName}-tusk-root-pivot`);
      if (tusk) tusk.rotation.x = alert * -0.08 + Math.sin(time * 1.2) * 0.012;
    }
  } else if (rig === "shark" || rig === "tidepup") {
    const root = visual.getObjectByName(`${kind}-tail-root-pivot`);
    const mid = visual.getObjectByName(`${kind}-tail-mid-pivot`) ?? visual.getObjectByName(`${kind}-tail-tip-pivot`);
    const sweep = Math.sin(time * (3.2 + travel * 3.8)) * (0.14 + travel * 0.18);
    if (root) root.rotation.y = sweep;
    if (mid) mid.rotation.y = -sweep * 1.35;
  } else if (rig === "tortoise" && kind === "reefglide-terrapin") {
    for (const position of ["front", "rear"] as const) for (const sideName of ["left", "right"] as const) {
      const side = sideName === "left" ? -1 : 1;
      const flipper = visual.getObjectByName(`${kind}-${position}-${sideName}-flipper-pivot`);
      if (flipper) flipper.rotation.x = Math.sin(time * (2.4 + travel * 2.8) + (position === "front" ? 0 : Math.PI)) * (0.12 + travel * 0.2) * side;
    }
  } else if (rig === "puddlehopper") {
    // A hop has a planted half-cycle and eased compression. This preserves
    // the frog's lively character without spamming every leg each frame.
    const phase = time * (1.55 + travel * 2.15);
    const hop = travel > 0.04 ? Math.pow(Math.max(0, Math.sin(phase)), 1.7) : 0;
    const body = visual.getObjectByName("puddlehopper-body");
    if (body) body.scale.set(1 + hop * 0.08, 1 - hop * 0.14, 1 + hop * 0.06);
    const throat = visual.getObjectByName("puddlehopper-throat-pouch");
    if (throat) {
      const croak = 1 + Math.max(0, Math.sin(time * 1.65 - 0.5)) * 0.32;
      throat.scale.set(1 + (croak - 1) * 0.45, croak, croak);
    }
    for (const sideName of ["left", "right"] as const) {
      const rear = visual.getObjectByName(`puddlehopper-${sideName}-rear-leg-pivot`);
      const fore = visual.getObjectByName(`puddlehopper-${sideName}-front-leg-pivot`);
      if (rear) rear.rotation.x = -0.18 + hop * 0.78;
      if (fore) fore.rotation.x = -0.2 - hop * 0.42;
    }
  } else if (rig === "reedstrider") {
    const crest = visual.getObjectByName("reedstrider-hollow-crest");
    if (crest) crest.rotation.z = Math.sin(time * 2.4) * (0.04 + alert * 0.08);
    for (const sideName of ["left", "right"] as const) {
      const side = sideName === "left" ? -1 : 1;
      const wing = visual.getObjectByName(`reedstrider-${sideName}-wing-pivot`);
      if (wing) wing.rotation.z = side * (-0.12 - alert * 0.18 + Math.sin(time * 1.9) * (0.025 + travel * 0.04));
    }
  } else if (rig === "lanternshell") {
    // The glow travels down the coil rather than pulsing in unison, so the
    // shell reads as one living light instead of five separate lamps.
    for (let spiral = 1; spiral <= 5; spiral += 1) {
      const glow = visual.getObjectByName(`lanternshell-spiral-${spiral}`);
      if (!glow) continue;
      const pulse = 1 + Math.sin(time * 1.7 - spiral * 0.7) * 0.1;
      glow.scale.set(1, pulse, pulse);
    }
    // A gastropod pushes itself forward on a wave that runs back to front
    // along the sole, so the ripple phase advances with travel, not with a
    // free-running clock.
    for (let wave = 1; wave <= 4; wave += 1) {
      const ripple = visual.getObjectByName(`lanternshell-foot-wave-${wave}-pivot`);
      if (!ripple) continue;
      const baseY = Number(ripple.userData.baseY) || -0.15;
      const crest = Math.sin(time * (1.6 + travel * 5.4) - wave * 1.15);
      ripple.position.y = baseY + Math.max(0, crest) * (0.012 + travel * 0.05);
      ripple.scale.z = 1 + crest * (0.03 + travel * 0.08);
    }
    // Alert retracts the eyestalks toward the shell instead of hiding them.
    for (const sideName of ["left", "right"] as const) {
      const side = sideName === "left" ? -1 : 1;
      const stalk = visual.getObjectByName(`lanternshell-${sideName}-stalk-pivot`);
      if (stalk) {
        stalk.rotation.x = -0.34 + alert * 0.5 + Math.sin(time * 1.25 + side) * 0.06;
        stalk.rotation.z = side * (-0.1 + Math.sin(time * 0.95 + side * 1.4) * 0.07);
        stalk.scale.y = 1 - alert * 0.42;
      }
      const knuckle = visual.getObjectByName(`lanternshell-${sideName}-stalk-knuckle-pivot`);
      if (knuckle) knuckle.rotation.x = -Math.sin(time * 1.25 + side) * 0.1 + alert * 0.34;
      const feeler = visual.getObjectByName(`lanternshell-${sideName}-feeler-pivot`);
      if (feeler) {
        feeler.rotation.x = 0.42 - travel * 0.14;
        feeler.rotation.y = side * (0.3 + Math.sin(time * 2.05 + side * 0.8) * 0.16);
      }
    }
    const shell = visual.getObjectByName("lanternshell-shell-pivot");
    if (shell) shell.rotation.z = (Number(shell.userData.restZ) || -0.2) + Math.sin(time * (1.6 + travel * 5.4) - 0.6) * (0.012 + travel * 0.026);
  } else if (rig === "runeowl") {
    // Owls turn the whole head rather than the eyes; the generic head channel
    // only nods, so the swivel and its slow settle live here.
    const owlHead = visual.getObjectByName("runeowl-head-pivot");
    if (owlHead) {
      const sweep = Math.sin(time * 0.42) + Math.sin(time * 0.17 + 1.1) * 0.6;
      owlHead.rotation.y = sweep * (0.34 + alert * 0.34);
      owlHead.rotation.z = -sweep * (0.06 + alert * 0.08);
      owlHead.rotation.x += -alert * 0.08;
    }
    for (const sideName of ["left", "right"] as const) {
      const side = sideName === "left" ? -1 : 1;
      for (let feather = 1; feather <= 3; feather += 1) {
        const primary = visual.getObjectByName(`runeowl-${sideName}-primary-${feather}`);
        if (primary) primary.rotation.x = Math.sin(time * (5.2 + travel * 4) - feather * 0.5) * (0.05 + travel * 0.13);
      }
      const alula = visual.getObjectByName(`runeowl-${sideName}-alula`);
      if (alula) alula.rotation.y = side * (0.1 + travel * 0.3);
      // Talons close when the owl is settling and spread as it comes in hot.
      for (let toe = 1; toe <= 3; toe += 1) {
        const claw = visual.getObjectByName(`runeowl-${sideName}-talon-${toe}`);
        if (claw) claw.rotation.x = 0.16 + (1 - travel) * 0.34 - alert * 0.2;
      }
      const hind = visual.getObjectByName(`runeowl-${sideName}-hind-talon`);
      if (hind) hind.rotation.x = -0.2 - (1 - travel) * 0.3;
    }
    for (let feather = 1; feather <= 3; feather += 1) {
      const quill = visual.getObjectByName(`runeowl-tail-feather-${feather}`);
      if (quill) quill.rotation.y = (feather - 2) * (0.16 + travel * 0.2 + Math.sin(time * 1.7) * 0.05);
    }
    for (let rune = 1; rune <= 4; rune += 1) {
      const glyph = visual.getObjectByName(`runeowl-rune-${rune}`);
      if (!glyph) continue;
      const pulse = 1 + Math.sin(time * 1.9 + rune * 1.3) * (0.12 + alert * 0.2);
      glyph.scale.set(pulse, pulse, 1);
    }
    const sigil = visual.getObjectByName("runeowl-mantle-sigil");
    if (sigil) {
      sigil.rotation.y = time * 0.7;
      sigil.scale.setScalar(1 + Math.sin(time * 2.3) * 0.1);
    }
  } else if (rig === "reed-dragonfly") {
    // The abdomen is the dragonfly's rudder: it whips laterally on turns and
    // curls under during the hover, driven down the segment chain.
    for (let segment = 2; segment <= 4; segment += 1) {
      const joint = visual.getObjectByName(`reed-dragonfly-abdomen-${segment}-pivot`);
      if (!joint) continue;
      joint.rotation.y = Math.sin(time * (2.6 + travel * 3.4) - segment * 0.6) * (0.045 + travel * 0.075);
      joint.rotation.x = Math.sin(time * 1.5 - segment * 0.4) * 0.03 - travel * 0.035 * segment;
    }
    const abdomen = visual.getObjectByName("reed-dragonfly-abdomen-pivot");
    if (abdomen) abdomen.rotation.x = -0.04 + travel * 0.12 + Math.sin(time * 2.2) * 0.02;
    // Hovering odonates hold the leg basket forward; cruising tucks it back.
    for (const sideName of ["left", "right"] as const) {
      const side = sideName === "left" ? -1 : 1;
      for (let leg = 1; leg <= 3; leg += 1) {
        const hip = visual.getObjectByName(`reed-dragonfly-${sideName}-leg-${leg}-pivot`);
        if (hip) {
          hip.rotation.z = (Number(hip.userData.restZ) || side * 0.5) + travel * side * 0.3;
          hip.rotation.x = -travel * 0.5 + Math.sin(time * 3.1 + leg) * 0.03;
        }
        const knee = visual.getObjectByName(`reed-dragonfly-${sideName}-knee-${leg}-pivot`);
        if (knee) knee.rotation.z = side * (0.9 + travel * 0.5);
      }
      for (const pair of ["front", "rear"] as const) {
        const stigma = visual.getObjectByName(`reed-dragonfly-${sideName}-${pair}-wing-stigma`);
        if (stigma) stigma.rotation.x = Math.sin(time * 26 + (pair === "front" ? 0 : 1.2)) * 0.08;
      }
    }
  } else if (rig === "glowmoth") {
    for (const sideName of ["left", "right"] as const) {
      const side = sideName === "left" ? -1 : 1;
      const antenna = visual.getObjectByName(`glowmoth-${sideName}-antenna-pivot`);
      if (antenna) antenna.rotation.z = side * Math.sin(time * 1.4 + side) * 0.08;
    }
    const lantern = visual.getObjectByName("glowmoth-lantern");
    if (lantern) lantern.scale.setScalar(1 + Math.sin(time * 2.1) * 0.1);
  } else if (rig === "lightning-bug") {
    for (const sideName of ["left", "right"] as const) {
      const side = sideName === "left" ? -1 : 1;
      const wing = visual.getObjectByName(`lightning-bug-${sideName}-wing-pivot`);
      if (wing) wing.rotation.z = side * (0.15 + Math.sin(time * 24) * 0.48);
    }
    const lantern = visual.getObjectByName("lightning-bug-lantern");
    if (lantern) lantern.scale.setScalar(1 + Math.sin(time * 3.4) * 0.15);
  } else if (rig === "copper-mole") {
    for (const sideName of ["left", "right"] as const) {
      const paw = visual.getObjectByName(`copper-mole-${sideName}-front-paw-pivot`);
      if (paw) paw.rotation.x = Math.sin(time * (2.4 + travel * 5) + (sideName === "left" ? 0 : Math.PI)) * (0.04 + travel * 0.24);
    }
  } else if (rig === "glimmerhart") {
    for (const sideName of ["left", "right"] as const) {
      const antler = visual.getObjectByName(`glimmerhart-${sideName}-antler-pivot`);
      if (antler) antler.rotation.y = Math.sin(time * 0.9 + (sideName === "left" ? 0 : Math.PI)) * 0.025;
    }
  }
  applyLivingBestiaryPose(visual, kind, time, travel, alert);
  return true;
}

/** Heavy terrestrial tails should read as weight and balance, not a rapid metronome. */
export function wildlifeTailCadence(rig: string, travelAmount: number) {
  const travel = THREE.MathUtils.clamp(Number.isFinite(travelAmount) ? travelAmount : 0, 0, 1);
  if (rig === "fox") return 0.72 + travel * 1.08;
  if (["warg", "mistmane", "tapir", "ridgeback", "woolhorn", "grazer", "deer", "cow"].includes(rig)) return 0.95 + travel * 1.65;
  return 1.5 + travel * 3.4;
}

/**
 * Fluid secondary motion shared by runtime mobs, bestiary previews and the
 * inspection tool. `airProgress` is 0 in sea form and 1 in sky-sail form.
 */
export function applyOceanCreaturePose(
  visual: THREE.Object3D,
  kind: CoreMobKind,
  timeSeconds: number,
  travelAmount = 0,
  airProgress = 0,
) {
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const travel = THREE.MathUtils.clamp(Number.isFinite(travelAmount) ? travelAmount : 0, 0, 1);
  const morph = THREE.MathUtils.clamp(Number.isFinite(airProgress) ? airProgress : 0, 0, 1);
  if (kind === "sunwash-crab" || kind === "tideglass-crab") {
    for (const sideName of ["left", "right"] as const) {
      const side = sideName === "left" ? -1 : 1;
      for (let legIndex = 1; legIndex <= 4; legIndex += 1) {
        const leg = visual.getObjectByName(`${kind}-${sideName}-leg-${legIndex}-pivot`);
        if (!leg) continue;
        const phase = legIndex % 2 ? 0 : Math.PI;
        leg.rotation.x = Math.sin(time * (3.2 + travel * 4.8) + phase) * (0.08 + travel * 0.24);
        leg.rotation.z = side * (0.12 + Math.cos(time * 2.7 + phase) * (0.025 + travel * 0.09));
      }
      const claw = visual.getObjectByName(`${kind}-${sideName}-claw-arm-pivot`);
      if (claw) claw.rotation.z = (Number(claw.userData.restZ) || 0) + side * Math.sin(time * 1.8 + side) * (0.035 + travel * 0.06);
      const stalk = visual.getObjectByName(`${kind}-${sideName}-eye-stalk-pivot`);
      if (stalk) stalk.rotation.z = side * Math.sin(time * 1.25 + side) * 0.035;
    }
  } else if (kind === "lanternray") {
    for (const sideName of ["left", "right"] as const) {
      const side = sideName === "left" ? -1 : 1;
      const fin = visual.getObjectByName(`lanternray-${sideName}-fin-pivot`);
      if (fin) fin.rotation.z = side * (-0.08 + Math.sin(time * (2.1 + travel * 1.7) + side) * (0.08 + travel * 0.11));
    }
    const tail = visual.getObjectByName("lanternray-tail-pivot");
    if (tail) tail.rotation.y = Math.sin(time * (2.8 + travel * 2.4)) * (0.1 + travel * 0.14);
    for (const sideName of ["left", "right"] as const) {
      const lantern = visual.getObjectByName(`lanternray-${sideName}-lantern-organ`);
      if (!lantern) continue;
      const pulse = 1 + Math.sin(time * 1.65 + (sideName === "left" ? 0 : Math.PI)) * 0.12;
      lantern.scale.setScalar(pulse);
    }
  } else if (kind === "sailfin-skimmer") {
    const tail = visual.getObjectByName("sailfin-skimmer-tail-fin-pivot");
    if (tail) tail.rotation.y = Math.sin(time * (4.4 + travel * 3.1)) * (0.18 + travel * 0.2);
    const sail = visual.getObjectByName("sailfin-skimmer-dorsal-sail-pivot");
    if (sail) sail.rotation.z = Math.sin(time * 1.7) * 0.045;
    for (const sideName of ["left", "right"] as const) {
      const fin = visual.getObjectByName(`sailfin-skimmer-${sideName}-fin-pivot`) ?? visual.getObjectByName(`sailfin-skimmer-${sideName}-fin`);
      if (fin) fin.rotation.y = (sideName === "left" ? 1 : -1) * (0.14 + Math.sin(time * 2.3) * 0.05);
    }
  } else if ((GENERIC_FISH_KINDS as readonly CoreMobKind[]).includes(kind)) {
    for (const side of ["left", "right"] as const) {
      const tail = visual.getObjectByName(`${kind}-tail-${side}-pivot`) ?? visual.getObjectByName(`${kind}-tail-${side}`);
      if (tail) tail.rotation.y = Math.sin(time * (4.2 + travel * 3) + (side === "left" ? 0 : 0.55)) * (0.15 + travel * 0.16);
      const fin = visual.getObjectByName(`${kind}-${side}-fin`);
      if (fin) fin.rotation.y = (side === "left" ? 1 : -1) * (0.16 + Math.sin(time * 2.1 + (side === "left" ? 0 : Math.PI)) * (0.035 + travel * 0.05));
    }
    const dorsal = visual.getObjectByName(`${kind}-dorsal-fin-pivot`) ?? visual.getObjectByName(`${kind}-dorsal-fin`);
    if (dorsal) dorsal.rotation.z = Math.sin(time * 2.4) * 0.055;
    visual.traverse((part) => {
      if (!part.userData.fishPennant) return;
      const side = Number(part.userData.side) || 1;
      part.rotation.x = Math.sin(time * 2.2 + side) * (0.08 + travel * 0.06);
    });
  } else if (["meadow-cottontail", "russet-rabbit", "frost-hare", "chocolate-bunny"].includes(kind)) {
    const hopWave = Math.max(0, Math.sin(time * 7.4));
    const priorOutputY = Number(visual.userData.rabbitPoseOutputY);
    const priorBaseY = Number(visual.userData.rabbitPoseBaseY);
    const baseY = Number.isFinite(priorOutputY) && Number.isFinite(priorBaseY) && Math.abs(visual.position.y - priorOutputY) < 1e-7
      ? priorBaseY
      : visual.position.y;
    visual.position.y = baseY + hopWave * 0.16 * travel;
    visual.userData.rabbitPoseBaseY = baseY;
    visual.userData.rabbitPoseOutputY = visual.position.y;
    visual.rotation.x = -Math.sin(time * 7.4 * 2) * 0.055 * travel;
    const body = visual.getObjectByName(`${kind}-body`);
    const head = visual.getObjectByName(`${kind}-head-pivot`);
    if (body) body.scale.set(1 + hopWave * 0.05 * travel, 1 - hopWave * 0.09 * travel, 1 + hopWave * 0.04 * travel);
    if (head) head.rotation.x = -hopWave * 0.1 * travel + Math.sin(time * 1.4) * 0.018;
    for (const side of ["left", "right"] as const) {
      const ear = visual.getObjectByName(`${kind}-${side}-ear-pivot`);
      if (ear) ear.rotation.x = -0.05 - hopWave * 0.12 * travel;
      const rear = visual.getObjectByName(`${kind}-${side}-rear-leg-pivot`);
      const front = visual.getObjectByName(`${kind}-${side}-front-paw-pivot`);
      if (rear) rear.rotation.x = hopWave * 0.52 * travel;
      if (front) front.rotation.x = -hopWave * 0.32 * travel;
    }
  } else if ((SEA_SLUG_KINDS as readonly CoreMobKind[]).includes(kind)) {
    visual.traverse((part) => {
      if (!part.userData.slugAppendage) return;
      const side = Number(part.userData.side) || 1;
      const phase = Number(part.userData.phase) || 0;
      part.rotation.z = side * (-0.18 - Math.sin(time * 1.35 + phase) * (0.06 + travel * 0.05));
      part.rotation.x = Math.cos(time * 0.82 + phase) * (0.035 + travel * 0.025);
    });
    const mantle = visual.getObjectByName(`${kind}-mantle`);
    if (mantle) mantle.scale.z = 1 + Math.sin(time * 1.1) * (0.025 + travel * 0.02);
  } else if (kind === "dreadcoil") {
    for (let index = 0; index < 9; index += 1) {
      const segment = visual.getObjectByName(`dreadcoil-segment-${index + 1}-pivot`);
      if (!segment) continue;
      segment.rotation.y = Math.sin(time * (1.8 + travel) - index * 0.62) * (0.18 + index * 0.018);
      segment.rotation.x = Math.cos(time * 1.35 - index * 0.48) * 0.045;
    }
  } else if (kind === "worldshell-leviathan") {
    for (const [index, name] of ["front-left", "front-right", "rear-left", "rear-right"].entries()) {
      const flipper = visual.getObjectByName(`worldshell-leviathan-${name}-flipper-pivot`);
      if (flipper) flipper.rotation.x = Math.sin(time * 0.55 + index * Math.PI / 2) * (0.08 + travel * 0.08);
    }
  }
  if (kind !== "aetherbell-larva" && kind !== "aetherbell-leviathan") return;

  const bell = visual.getObjectByName(`${kind}-bell-root`);
  if (bell) {
    const sea = LEVIATHAN_VISUAL_CONTRACTS.aetherbell.seaBellScale;
    const air = LEVIATHAN_VISUAL_CONTRACTS.aetherbell.airBellScale;
    const pulse = 1 + Math.sin(time * (kind === "aetherbell-larva" ? 2.2 : 1.15)) * 0.035;
    bell.scale.set(
      THREE.MathUtils.lerp(sea[0], air[0], morph) * pulse,
      THREE.MathUtils.lerp(sea[1], air[1], morph) / Math.sqrt(pulse),
      THREE.MathUtils.lerp(sea[2], air[2], morph) * pulse,
    );
  }
  const tailCount = kind === "aetherbell-leviathan" ? 8 : 5;
  for (let index = 0; index < tailCount; index += 1) {
    const tail = visual.getObjectByName(`${kind}-fluid-tail-${index + 1}-pivot`);
    if (!tail) continue;
    const phase = index / tailCount * TAU;
    const seaSweep = Math.sin(time * 1.35 + phase) * 0.18;
    const airSweep = Math.sin(time * 0.62 + phase) * 0.3;
    tail.rotation.x = Math.sin(phase) * 0.13 + THREE.MathUtils.lerp(seaSweep * 0.35, airSweep, morph);
    tail.rotation.z = Math.cos(phase) * 0.13 + THREE.MathUtils.lerp(seaSweep, airSweep * 0.45, morph);
    tail.scale.y = THREE.MathUtils.lerp(1, 0.78, morph);
  }
}

/** Visible arrow mesh used by Skeleton Archer projectiles. Local forward is -Z. */
export function createSkeletonArrowVisual() {
  const group = createArrowVisual();
  group.name = "skeleton-arrow-projectile";
  const names = ["arrow-shaft", "arrow-tip", "arrow-flat-fletching", "arrow-upright-fletching"];
  group.children.forEach((child, index) => { child.name = names[index] ?? `arrow-detail-${index + 1}`; });
  return group;
}
