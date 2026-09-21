import * as THREE from "three";
import { isAquariumCrawler, isAquariumCreature, sampleAquariumPose, type AquariumResident, type AquariumTopology } from "./aquarium";
import { exteriorExhibitFrameEdges, isSmallExhibitCreature, type ExhibitResident, type ExhibitTopology } from "./butterfly-exhibit";
import { createButterflyVisual } from "./butterflies";
import type { CelestialBounds } from "./celestial-terrain";
import { createMobVisual } from "./mob-models";
import { authoredModelMotionRadius, includeModelMotion, type ModelMotionEnvelope } from "./model-motion-bounds";
import { LEVIATHAN_VISUAL_CONTRACTS } from "./model-specs";
import { BUTTERFLY_ORDER, MOB_DEFS, type ButterflyKind, type MobKind } from "./mobs";
import { isSharedModelGeometry } from "./shared-model-geometry";

// Reviewed against applyOceanCreaturePose. The living-bestiary aquarium kinds
// receive no other pose function in syncAquariumVisuals. Adding a kind requires
// reviewing that consumer's translations/scales; unrestricted joint rotation is
// already covered by authoredModelMotionRadius's triangle inequality.
const AQUARIUM_BODY_KINDS: readonly MobKind[] = [
  "shoalfin", "coralback", "brookdart", "gloomfin", "silverthread", "reedneedle", "emberribbon", "cavefilament",
  "redfin-salmon", "blue-mackerel", "glassfin", "lanternjaw", "syrupfin", "glowfin", "pocket-goldfish",
  "sunwheel-angelfish", "stonewhisker-loach", "sunset-sea-slug", "moonlace-sea-slug", "blue-dragon-sea-slug",
  "leafsheep-sea-slug", "sea-bunny-nudibranch", "spanish-dancer-sea-slug", "crystal-tipped-nudibranch",
  "ringed-phyllidia", "hooded-melibe", "sea-angel-slug", "embercrown-sea-slug", "kelpwarden-sea-slug",
  "starlight-choir-sea-slug", "voidglass-sea-slug", "inkveil-cuttle", "prismclaw-mantis-shrimp",
  "reefmender-shrimp", "currentweaver-eel", "shellcarrier-hermit", "fossilback-trilobite",
  "sunwash-crab", "tideglass-crab", "lanternray", "sailfin-skimmer", "aetherbell-larva", "aetherbell-leviathan",
];

const PAD = 1e-7; // Enclose the production geometry's Float32 vertex rounding.
function bounds(minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number): CelestialBounds {
  if (![minX, maxX, minY, maxY, minZ, maxZ].every(Number.isFinite)
    || minX > maxX || minY > maxY || minZ > maxZ) throw Error("Invalid habitat physical bounds.");
  return Object.freeze({ minX: minX - PAD, maxX: maxX + PAD, minY: minY - PAD, maxY: maxY + PAD, minZ: minZ - PAD, maxZ: maxZ + PAD });
}
function box(x: number, y: number, z: number, width: number, height: number, depth: number, rotation = new THREE.Euler()): CelestialBounds {
  const matrix = new THREE.Matrix4().makeRotationFromEuler(rotation), half = new THREE.Vector3(width / 2, height / 2, depth / 2);
  const e = matrix.elements;
  const hx = Math.abs(e[0]) * half.x + Math.abs(e[4]) * half.y + Math.abs(e[8]) * half.z;
  const hy = Math.abs(e[1]) * half.x + Math.abs(e[5]) * half.y + Math.abs(e[9]) * half.z;
  const hz = Math.abs(e[2]) * half.x + Math.abs(e[6]) * half.y + Math.abs(e[10]) * half.z;
  return bounds(x - hx, x + hx, y - hy, y + hy, z - hz, z + hz);
}
function validateCells(blocks: readonly { x: number; y: number; z: number; key: string }[]) {
  if (!blocks.length || blocks.length > 20 || new Set(blocks.map(cell => cell.key)).size !== blocks.length)
    throw Error("Invalid habitat body topology.");
  for (const cell of blocks) if (![cell.x, cell.y, cell.z].every(Number.isSafeInteger) || cell.key !== `${cell.x},${cell.y},${cell.z}`)
    throw Error("Invalid habitat body cell.");
}
function disposeDetached(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return;
    if (!isSharedModelGeometry(object.geometry)) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
function isolateSharedGeometry(root: THREE.Object3D) {
  // Box3 computes cached geometry bounds. Never mutate/dispose the renderer's
  // shared geometry cache while measuring a detached production model.
  const clones = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !isSharedModelGeometry(object.geometry)) return;
    let clone = clones.get(object.geometry);
    if (!clone) {
      const created: THREE.BufferGeometry = object.geometry.clone();
      delete created.userData.blockwildSharedGeometry;
      clones.set(object.geometry, created);
      clone = created;
    }
    object.geometry = clone;
  });
}
function fittedMob(kind: MobKind, aquarium: boolean, id: number) {
  const model = createMobVisual(kind, id).group;
  try {
    isolateSharedGeometry(model);
    model.updateMatrixWorld(true);
    // Static bounds are used ONLY for the identical production fitting step.
    const fit = new THREE.Box3().setFromObject(model), size = fit.getSize(new THREE.Vector3()), center = fit.getCenter(new THREE.Vector3());
    const target = aquarium ? [.52, .44, .52] : [.62, .62, .62];
    const scale = Math.min(1, target[0] / Math.max(.001, size.x), target[1] / Math.max(.001, size.y), target[2] / Math.max(.001, size.z));
    model.scale.setScalar(scale);
    model.position.copy(center).multiplyScalar(-scale);
    const motion = new Map<THREE.Object3D, ModelMotionEnvelope>();
    if (aquarium) {
      model.traverse(part => {
        if (part.name === `${kind}-mantle`) includeModelMotion(motion, part, part.position.length(), 1.045);
        if (part.name === "lanternray-left-lantern-organ" || part.name === "lanternray-right-lantern-organ")
          includeModelMotion(motion, part, part.position.length(), 1.12);
        if (part.name === `${kind}-bell-root` && (kind === "aetherbell-larva" || kind === "aetherbell-leviathan")) {
          const sea = LEVIATHAN_VISUAL_CONTRACTS.aetherbell.seaBellScale;
          // Aquarium morph is exactly zero, pulse is [0.965, 1.035].
          includeModelMotion(motion, part, part.position.length(), Math.max(sea[0] * 1.035, sea[1] / Math.sqrt(.965), sea[2] * 1.035));
        }
      });
    }
    // The centered model offset also rotates with resident yaw; include it in
    // the sphere. This covers every joint/wing rotation, including hidden parts.
    return { radius: model.position.length() + authoredModelMotionRadius(model, motion),
      yOffset: (aquarium ? isAquariumCrawler(kind) : !MOB_DEFS[kind].flying) ? size.y * scale / 2 : 0 };
  } finally { disposeDetached(model); }
}

/** All-phase physical decoration and resident envelopes from canonical data.
 * No live renderer, metadata normalization, save writes, or sampled-phase proof.
 * The caller must separately prove canonical component closure and ownership.
 * Conservative spheres may reject a close boundary even when one pose fits. */
export function aquariumBodyBounds(topology: AquariumTopology, residents: readonly AquariumResident[]): readonly CelestialBounds[] {
  validateCells(topology.blocks);
  const result: CelestialBounds[] = [];
  for (const [cellIndex, cell] of topology.blocks.entries()) {
    if (!cell.floor) continue;
    for (let pebble = 0; pebble < 6; pebble++) {
      const seed = (cellIndex * 37 + pebble * 17) % 97;
      result.push(box(cell.x + (seed * 13 % 61) / 100 - .3, cell.y - .465, cell.z + (seed * 29 % 59) / 100 - .29,
        .1 + seed % 3 * .025, .035 + seed % 2 * .018, .09 + seed % 4 * .018, new THREE.Euler(0, seed * .23, 0)));
    }
    if (cell.decoration === "pebbles-flora") {
      result.push(box(cell.x + .26, cell.y - .31, cell.z - .22, .035, .28, .035));
      result.push(box(cell.x + .18, cell.y - .26, cell.z - .22, .18, .08, 0, new THREE.Euler(0, .3, .45)));
      result.push(box(cell.x + .34, cell.y - .19, cell.z - .22, .18, .08, 0, new THREE.Euler(0, -.3, -.45)));
    }
  }
  residents.forEach((resident, index) => {
    const kind = resident.metadata.kind;
    if (!AQUARIUM_BODY_KINDS.includes(kind) || !isAquariumCreature(kind)) throw Error(`Unsupported aquarium body kind: ${kind}.`);
    // The producer's cellKey is time-invariant; no sampled coordinate is used
    // to infer an envelope. Sine/cosine extrema below cover all elapsed times.
    const cellKey = sampleAquariumPose(resident, topology, 0).cellKey;
    const cell = topology.blocks.find(block => block.key === cellKey)!;
    const { radius, yOffset } = fittedMob(kind, true, -(5000 + index));
    const crawling = isAquariumCrawler(kind), horizontal = crawling ? .28 : .31;
    const lowY = crawling ? -.37 : -.22, highY = crawling ? -.37 : .22;
    result.push(bounds(cell.x - horizontal - radius, cell.x + horizontal + radius,
      cell.y + lowY + yOffset - radius, cell.y + highY + yOffset + radius, cell.z - horizontal - radius, cell.z + horizontal + radius));
  });
  return Object.freeze(result);
}

/** Includes exterior rails, landing decoration, and whole animated residents. */
export function exhibitBodyBounds(topology: ExhibitTopology, residents: readonly ExhibitResident[]): readonly CelestialBounds[] {
  validateCells(topology.blocks);
  if (topology.truncated) throw Error("Truncated exhibit body topology.");
  const result: CelestialBounds[] = [];
  for (const edge of exteriorExhibitFrameEdges(topology)) {
    result.push(box(...edge.center, edge.axis === "x" ? edge.length + .035 : .055,
      edge.axis === "y" ? edge.length + .035 : .055, edge.axis === "z" ? edge.length + .035 : .055));
  }
  topology.landingSites.forEach((site, index) => {
    if (site.tier === "flower-floor") {
      const x = site.x + site.localOffset[0], y = site.y - .25 + site.localOffset[1], z = site.z + site.localOffset[2];
      result.push(box(x, y, z, .055, .28, .055), box(x, y + .15, z, .28, .07, .28));
    } else {
      result.push(box(site.x, site.y - .18 + site.localOffset[1], site.z, .72, .065, .08, new THREE.Euler(0, index % 2 * Math.PI / 2, 0)));
    }
  });
  residents.forEach((resident, index) => {
    const kind = resident.kind, butterfly = (resident.source ?? "butterfly") === "butterfly";
    if (butterfly ? !BUTTERFLY_ORDER.includes(kind as ButterflyKind) : resident.source !== "cage" || !isSmallExhibitCreature(kind))
      throw Error(`Unsupported exhibit body kind/source: ${kind}/${resident.source}.`);
    let radius: number, yOffset = 0;
    if (butterfly) {
      const model = createButterflyVisual(kind as ButterflyKind, resident.id).group;
      try { radius = authoredModelMotionRadius(model, new Map()); } finally { disposeDetached(model); }
    } else ({ radius, yOffset } = fittedMob(kind, false, -(index + 1)));
    const cell = topology.blocks[(resident.geneticSeed >>> 0) % topology.blocks.length];
    const flying = Boolean(MOB_DEFS[kind].flying || MOB_DEFS[kind].family === "butterfly");
    const horizontal = butterfly ? .24 : flying ? .16 : .11;
    let minX = cell.x - horizontal, maxX = cell.x + horizontal, minZ = cell.z - horizontal, maxZ = cell.z + horizontal;
    let minY = cell.y + (flying ? -.04 : -.43), maxY = cell.y + (flying ? .2 : kind === "puddlehopper" ? -.31 : -.43);
    const site = topology.landingSites.find(candidate => candidate.x === cell.x && candidate.y === cell.y && candidate.z === cell.z);
    if (flying && site) {
      minX = Math.min(minX, site.x + site.localOffset[0]); maxX = Math.max(maxX, site.x + site.localOffset[0]);
      minZ = Math.min(minZ, site.z + site.localOffset[2]); maxZ = Math.max(maxZ, site.z + site.localOffset[2]);
      const y = site.y + Math.min(.31, site.localOffset[1]); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    result.push(bounds(minX - radius, maxX + radius, minY + yOffset - radius, maxY + yOffset + radius, minZ - radius, maxZ + radius));
  });
  return Object.freeze(result);
}
