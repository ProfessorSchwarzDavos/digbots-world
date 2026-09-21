import * as THREE from "three";

/** Detached analytic maxima for translating/scaling authored model branches.
 * Rotation is unrestricted: triangle inequality covers every animation phase. */
export type ModelMotionEnvelope = Readonly<{ translationRadius: number; scale: number }>;
export type ModelMotionEnvelopes = ReadonlyMap<THREE.Object3D, ModelMotionEnvelope>;
export function includeModelMotion(map: Map<THREE.Object3D, ModelMotionEnvelope>, object: THREE.Object3D,
  translationRadius: number, scale = 1): void {
  if (![translationRadius, scale].every(Number.isFinite) || translationRadius < 0 || scale < 0)
    throw Error("Invalid authored model motion envelope.");
  const old = map.get(object);
  map.set(object, { translationRadius: Math.max(old?.translationRadius ?? 0, translationRadius), scale: Math.max(old?.scale ?? 0, scale) });
}
export function includeModelFill(map: Map<THREE.Object3D, ModelMotionEnvelope>, object: THREE.Object3D, base: number, height: number): void {
  includeModelMotion(map, object, Math.hypot(object.position.x, Math.max(Math.abs(base), Math.abs(base + height / 2)), object.position.z));
}
/** Includes currently hidden authored alternatives, not only the present pose.
 * No cached model, materials, save fields or animation samples are retained. */
export function authoredModelMotionRadius(root: THREE.Object3D, envelopes: ModelMotionEnvelopes): number {
  const branch = (node: THREE.Object3D): number => {
    let radius = 0;
    if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.Points) {
      const positions = node.geometry.getAttribute("position");
      if (!positions?.count) throw Error("Missing authored model geometry.");
      for (let i = 0; i < positions.count; i++) {
        const r = Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i));
        if (!Number.isFinite(r)) throw Error("Nonfinite authored model vertex.");
        radius = Math.max(radius, r);
      }
    }
    for (const child of node.children) {
      const envelope = envelopes.get(child), translation = Math.max(child.position.length(), envelope?.translationRadius ?? 0);
      const scale = Math.max(Math.abs(child.scale.x), Math.abs(child.scale.y), Math.abs(child.scale.z), envelope?.scale ?? 0);
      radius = Math.max(radius, translation + scale * branch(child));
    }
    return radius;
  };
  const radius = branch(root) * Math.max(Math.abs(root.scale.x), Math.abs(root.scale.y), Math.abs(root.scale.z));
  if (!Number.isFinite(radius) || radius <= 0) throw Error("Invalid authored model body envelope.");
  return radius;
}
