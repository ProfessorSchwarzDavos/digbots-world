import { BlockId } from "./data";
import { farmHash01, type BlockPosition } from "./farming";

export type LeafParticle = {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: number;
  spin: number;
  age: number;
  lifetime: number;
  color: string;
};

export const LEAF_PARTICLE_COLORS: Readonly<Partial<Record<BlockId, string>>> = Object.freeze({
  [BlockId.WildwoodLeaves]: "#4f913e",
  [BlockId.PineLeaves]: "#376c49",
  [BlockId.BirchLeaves]: "#8bb557",
  [BlockId.BloomLeaves]: "#da8fb4",
  [BlockId.AppleLeaves]: "#5b9845",
  [BlockId.FrostpearLeaves]: "#5b887d",
});

/**
 * Produces at most a handful of deterministic emitters each half-second. The
 * cap keeps foliage ambience effectively constant-cost at long view distances.
 */
export function planLeafParticles(
  seed: string | number,
  timeMs: number,
  leaves: readonly (BlockPosition & { type: BlockId })[],
  camera: BlockPosition,
  maximum = 3,
) {
  const cycle = Math.floor(timeMs / 500);
  const max = Math.max(0, Math.min(6, Math.floor(maximum)));
  const candidates = leaves
    .filter((leaf) => LEAF_PARTICLE_COLORS[leaf.type])
    .filter((leaf) => (leaf.x - camera.x) ** 2 + (leaf.y - camera.y) ** 2 + (leaf.z - camera.z) ** 2 <= 32 ** 2)
    .filter((leaf) => farmHash01(seed, leaf.x, leaf.y, leaf.z, cycle) > 0.982)
    .sort((a, b) => farmHash01(seed, a.x, a.y, a.z, cycle + 31) - farmHash01(seed, b.x, b.y, b.z, cycle + 31))
    .slice(0, max);
  return candidates.map((leaf, index): LeafParticle => {
    const lateral = farmHash01(seed, leaf.x, leaf.y, leaf.z, cycle + 101 + index);
    const depth = farmHash01(seed, leaf.x, leaf.y, leaf.z, cycle + 211 + index);
    return {
      position: { x: leaf.x + lateral - 0.5, y: leaf.y - 0.2, z: leaf.z + depth - 0.5 },
      velocity: { x: (lateral - 0.5) * 0.18, y: -0.22, z: (depth - 0.5) * 0.18 },
      rotation: lateral * Math.PI * 2,
      spin: (depth - 0.5) * 2.6,
      age: 0,
      lifetime: 3.5 + lateral * 2.2,
      color: LEAF_PARTICLE_COLORS[leaf.type] ?? "#6e9f4b",
    };
  });
}

/** Returns null immediately on terrain impact, as requested, or at expiry. */
export function stepLeafParticle(particle: LeafParticle, dt: number, groundY: number | undefined, gravityG = 1, atmosphere = true): LeafParticle | null {
  const seconds = Math.max(0, Math.min(dt, 0.1));
  const next: LeafParticle = {
    ...particle,
    position: { ...particle.position },
    velocity: { ...particle.velocity },
    age: particle.age + seconds,
    rotation: particle.rotation + particle.spin * seconds,
  };
  if (next.age >= next.lifetime) return null;
  const flutter = Math.sin(next.age * 5.2 + next.rotation) * 0.16;
  if (atmosphere) {
    next.velocity.x = next.velocity.x * 0.985 + flutter * seconds;
    next.velocity.z = next.velocity.z * 0.985 + Math.cos(next.age * 4.3 + next.rotation) * 0.13 * seconds;
  }
  next.velocity.y = gravityG === 0 ? next.velocity.y : Math.max(atmosphere ? -1.35 : -Infinity, next.velocity.y - 0.38 * Math.max(0, gravityG) * seconds);
  next.position.x += next.velocity.x * seconds;
  next.position.y += next.velocity.y * seconds;
  next.position.z += next.velocity.z * seconds;
  if (groundY !== undefined && next.position.y <= groundY + 0.03) return null;
  return next;
}

export type TorchAnimation = Readonly<{
  flameScale: number;
  flameOffsetX: number;
  flameOffsetY: number;
  flameOffsetZ: number;
  lightIntensity: number;
  lightRadius: number;
  atlasFrame: number;
}>;

/** One sample drives both in-world and held torches without allocating lights. */
export function torchAnimationSample(timeSeconds: number, position: BlockPosition, held = false): TorchAnimation {
  const phase = position.x * 0.73 + position.y * 0.41 + position.z * 0.59 + (held ? 1.37 : 0);
  const fast = Math.sin(timeSeconds * 14.7 + phase);
  const slow = Math.sin(timeSeconds * 5.3 + phase * 1.7);
  const flicker = 0.5 + 0.34 * fast + 0.16 * slow;
  return {
    flameScale: 0.92 + flicker * 0.16,
    flameOffsetX: fast * (held ? 0.012 : 0.018),
    flameOffsetY: Math.abs(slow) * 0.016,
    flameOffsetZ: slow * (held ? 0.008 : 0.014),
    lightIntensity: 0.88 + flicker * 0.24,
    lightRadius: 7.7 + flicker * 0.65,
    atlasFrame: Math.floor((timeSeconds * 9 + phase) % 4 + 4) % 4,
  };
}
