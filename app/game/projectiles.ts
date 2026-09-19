import * as THREE from "three";
import { gravityAcceleration } from "./celestial-environment";

export type ArrowOwner = { kind: "mob" | "player"; id: number | string };

export type ProjectileEffect = Readonly<{
  kind: "verdant-root" | "webspinner-bind";
  seconds: number;
}>;

export type ArrowProjectile = {
  id: number;
  owner: ArrowOwner;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  age: number;
  maxAge: number;
  visual: THREE.Group;
  effect?: ProjectileEffect;
  targetKind?: "player" | "hostile-mob";
};

export type ArrowStepResult =
  | { kind: "flying" }
  | { kind: "block"; position: THREE.Vector3 }
  | { kind: "target"; targetId: string | number; position: THREE.Vector3 }
  | { kind: "expired" };

const GRAVITY = 8.2;
const PROJECTILE_VISUAL_FORWARD = new THREE.Vector3(0, 0, -1);

export function aimArrowVelocity(origin: THREE.Vector3, target: THREE.Vector3, speed = 11.5, gravityG = 1) {
  const delta = target.clone().sub(origin);
  const horizontal = Math.hypot(delta.x, delta.z);
  const travelTime = Math.max(0.12, horizontal / Math.max(0.1, speed));
  // A light ballistic compensation keeps the visible arrow close to the
  // crosshair while still producing an obvious arc over longer distances.
  delta.y += gravityAcceleration(GRAVITY, gravityG) * travelTime * travelTime * 0.5;
  return delta.normalize().multiplyScalar(speed);
}

export function createArrowVisual() {
  const group = new THREE.Group();
  group.name = "visible-arrow-projectile";
  const wood = new THREE.MeshLambertMaterial({ color: 0x744929 });
  const metal = new THREE.MeshLambertMaterial({ color: 0xc7d0cc });
  const feather = new THREE.MeshLambertMaterial({ color: 0xd25b4c, side: THREE.DoubleSide });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.9), wood);
  shaft.position.z = 0.05;
  const point = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.27, 4), metal);
  point.rotation.x = -Math.PI / 2;
  point.position.z = -0.53;
  const leftFletching = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.26), feather);
  const uprightFletching = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.24, 0.26), feather);
  leftFletching.position.z = 0.48;
  uprightFletching.position.z = 0.48;
  group.add(shaft, point, leftFletching, uprightFletching);
  return group;
}

export function orientArrowVisual(projectile: Pick<ArrowProjectile, "visual" | "velocity">) {
  if (projectile.velocity.lengthSq() < 1e-8) return;
  // Every projectile model is authored nose-first on local -Z. Object3D.lookAt
  // points local +Z at its target, which made arrows fly tail-first.
  projectile.visual.quaternion.setFromUnitVectors(PROJECTILE_VISUAL_FORWARD, projectile.velocity.clone().normalize());
}

export function createArrowProjectile(
  id: number,
  owner: ArrowOwner,
  origin: THREE.Vector3,
  target: THREE.Vector3,
  damage = 2,
  speed = 11.5,
  gravityG = 1,
): ArrowProjectile {
  const visual = createArrowVisual();
  visual.position.copy(origin);
  const projectile: ArrowProjectile = {
    id,
    owner,
    position: origin.clone(),
    velocity: aimArrowVelocity(origin, target, speed, gravityG),
    damage,
    age: 0,
    maxAge: 8,
    visual,
  };
  orientArrowVisual(projectile);
  return projectile;
}

/**
 * Leafwardens cast three real leaves in a tight helix. The smaller translucent
 * leaves remain children of the projectile so the trail is visible without
 * allocating particles every simulation step.
 */
export function createVerdantVolleyProjectile(
  id: number,
  owner: ArrowOwner,
  origin: THREE.Vector3,
  target: THREE.Vector3,
  damage = 6,
  speed = 29,
  rootSeconds = 0.8,
  gravityG = 1,
): ArrowProjectile {
  const visual = new THREE.Group();
  visual.name = "visible-verdant-volley-projectile";
  const spiral = new THREE.Group();
  spiral.name = "verdant-volley-spiral";
  const leafGeometry = new THREE.SphereGeometry(0.12, 6, 4);
  const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x7bf0a1, emissive: 0x174d2b, emissiveIntensity: 0.8 });
  for (let index = 0; index < 3; index += 1) {
    const angle = index / 3 * Math.PI * 2;
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf.name = `verdant-volley-leaf-${index + 1}`;
    leaf.scale.set(1.6, 0.38, 0.72);
    leaf.position.set(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, -0.08 - index * 0.025);
    leaf.rotation.set(angle * 0.18, angle + Math.PI / 4, angle);
    spiral.add(leaf);
  }
  const trailMaterial = new THREE.MeshLambertMaterial({
    color: 0x9dffc1,
    emissive: 0x123d24,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  for (let index = 0; index < 4; index += 1) {
    const trail = new THREE.Mesh(leafGeometry, trailMaterial);
    trail.name = `verdant-volley-trail-${index + 1}`;
    trail.scale.set(1.05 - index * 0.12, 0.26, 0.48);
    trail.position.set(index % 2 === 0 ? 0.08 : -0.08, index % 3 === 0 ? 0.06 : -0.04, 0.22 + index * 0.16);
    trail.rotation.set(0.2, index * 0.9, index * 0.7);
    spiral.add(trail);
  }
  visual.add(spiral);
  visual.position.copy(origin);
  const projectile: ArrowProjectile = {
    id,
    owner,
    position: origin.clone(),
    velocity: aimArrowVelocity(origin, target, speed, gravityG),
    damage,
    age: 0,
    maxAge: 4.5,
    visual,
    effect: { kind: "verdant-root", seconds: Math.max(0, rootSeconds) },
  };
  orientArrowVisual(projectile);
  return projectile;
}

/** A compact pressure-web bolt: visible brass hub, pale filament loops and a short steam trail. */
export function createWebspinnerProjectile(
  id: number,
  owner: ArrowOwner,
  origin: THREE.Vector3,
  target: THREE.Vector3,
  damage = 5,
  speed = 18,
  bindSeconds = 3.2,
  gravityG = 1,
): ArrowProjectile {
  const visual = new THREE.Group();
  visual.name = "visible-webspinner-bind-projectile";
  const hubMaterial = new THREE.MeshLambertMaterial({ color: 0xb77d45, emissive: 0x4b2915, emissiveIntensity: 0.45 });
  const threadMaterial = new THREE.MeshLambertMaterial({ color: 0xb7fff4, emissive: 0x25766f, emissiveIntensity: 0.72, transparent: true, opacity: 0.74, depthWrite: false });
  const steamMaterial = new THREE.MeshLambertMaterial({ color: 0xd8eceb, transparent: true, opacity: 0.28, depthWrite: false });
  const hub = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), hubMaterial);
  hub.name = "webspinner-bind-hub";
  visual.add(hub);
  for (let index = 0; index < 3; index += 1) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.2 + index * 0.045, 0.018, 4, 12), threadMaterial);
    loop.name = `webspinner-filament-${index + 1}`;
    loop.rotation.set(index * 0.72, index * 1.05, Math.PI / 2 + index * 0.38);
    visual.add(loop);
  }
  for (let index = 0; index < 3; index += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.12 + index * 0.035, 5, 4), steamMaterial);
    puff.name = `webspinner-steam-${index + 1}`;
    puff.position.z = 0.28 + index * 0.18;
    visual.add(puff);
  }
  visual.position.copy(origin);
  const projectile: ArrowProjectile = {
    id,
    owner,
    position: origin.clone(),
    velocity: aimArrowVelocity(origin, target, speed, gravityG),
    damage,
    age: 0,
    maxAge: 3.5,
    visual,
    effect: { kind: "webspinner-bind", seconds: Math.max(0, bindSeconds) },
  };
  orientArrowVisual(projectile);
  return projectile;
}

/** Swept stepping prevents fast arrows passing through one-block walls. */
export function stepArrowProjectile(
  projectile: ArrowProjectile,
  deltaSeconds: number,
  blockAt: (position: THREE.Vector3) => boolean,
  targetAt: (position: THREE.Vector3, radius: number) => string | number | null,
  gravityG = 1,
): ArrowStepResult {
  const dt = Math.max(0, Math.min(0.1, deltaSeconds));
  projectile.age += dt;
  if (projectile.age >= projectile.maxAge) return { kind: "expired" };
  projectile.velocity.y -= gravityAcceleration(GRAVITY, gravityG) * dt;
  const travel = projectile.velocity.clone().multiplyScalar(dt);
  const distance = travel.length();
  const steps = Math.max(1, Math.ceil(distance / 0.16));
  const delta = travel.multiplyScalar(1 / steps);
  for (let index = 0; index < steps; index += 1) {
    projectile.position.add(delta);
    const targetId = targetAt(projectile.position, 0.22);
    if (targetId !== null) {
      projectile.visual.position.copy(projectile.position);
      return { kind: "target", targetId, position: projectile.position.clone() };
    }
    if (blockAt(projectile.position)) {
      projectile.visual.position.copy(projectile.position);
      return { kind: "block", position: projectile.position.clone() };
    }
  }
  projectile.visual.position.copy(projectile.position);
  orientArrowVisual(projectile);
  const verdantSpiral = projectile.visual.getObjectByName("verdant-volley-spiral");
  if (verdantSpiral) verdantSpiral.rotation.z = projectile.age * 13;
  if (projectile.effect?.kind === "webspinner-bind") {
    const hub = projectile.visual.getObjectByName("webspinner-bind-hub");
    if (hub) hub.rotation.z = projectile.age * 18;
    for (let index = 1; index <= 3; index += 1) {
      const filament = projectile.visual.getObjectByName(`webspinner-filament-${index}`);
      if (filament) filament.rotation.z += dt * (index % 2 === 0 ? -10 : 10);
    }
  }
  return { kind: "flying" };
}

export function disposeArrowVisual(visual: THREE.Object3D) {
  visual.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.dispose();
  });
}
