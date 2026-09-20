import * as THREE from "three";
import { pressurePoint } from "./pressure-devices";
import type { PressureRuntime } from "./pressure-runtime";

/** Read-only wrench diagnostics. Bounds are labeled as extents, not a seal. */
export function createPressureOverlay(key: string, diagnostic: ReturnType<PressureRuntime["diagnosticsFor"]>): THREE.Group {
  const root = new THREE.Group(); root.name = "pressure-wrench-overlay";
  const origin = pressurePoint(key); if (!origin) return root;
  const line = (name: string, points: THREE.Vector3[], color: number) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const shape = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: .9, depthTest: false }));
    shape.name = name; shape.renderOrder = 9; root.add(shape);
  };
  for (const [role, target] of Object.entries(diagnostic.device?.links ?? {})) {
    const point = pressurePoint(target); if (!point) continue;
    line(`link-${role}`, [new THREE.Vector3(origin.x, origin.y + .3, origin.z), new THREE.Vector3(point.x, point.y + .3, point.z)],
      role === "outer" || role === "exterior" ? 0xd79d72 : role === "pump" || role === "reserve" ? 0x88b7d0 : 0xa4d2ad);
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(.13), new THREE.MeshBasicMaterial({ color: 0xd4b477, depthTest: false }));
    marker.position.set(point.x, point.y + .3, point.z); marker.name = `target-${role}`; marker.renderOrder = 10; root.add(marker);
  }
  const bounds = diagnostic.bounds;
  if (bounds) {
    const helper = new THREE.Box3Helper(new THREE.Box3(new THREE.Vector3(bounds.min.x - .5, bounds.min.y - .5, bounds.min.z - .5),
      new THREE.Vector3(bounds.max.x + .5, bounds.max.y + .5, bounds.max.z + .5)), diagnostic.zone?.status === "sealed" ? 0x8cceb2 : 0xddaf74);
    helper.name = "room-bounding-extent-not-seal"; helper.renderOrder = 8;
    const material = helper.material as THREE.LineBasicMaterial; material.depthTest = false; material.transparent = true; material.opacity = .45; root.add(helper);
  }
  const leak = diagnostic.leak;
  if (leak) {
    const direction = new THREE.Vector3(leak.face.endsWith("x") ? 1 : 0, leak.face.endsWith("y") ? 1 : 0, leak.face.endsWith("z") ? 1 : 0).multiplyScalar(leak.face[0] === "+" ? 1 : -1);
    const start = new THREE.Vector3(leak.cell.x, leak.cell.y, leak.cell.z).addScaledVector(direction, .5), tip = start.clone().addScaledVector(direction, 1.2);
    line(leak.unknown ? "unknown-boundary-ray" : "actual-leak-ray", [start, tip], 0xf09573);
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(.2), new THREE.MeshBasicMaterial({ color: 0xf09573, wireframe: true, depthTest: false }));
    marker.position.copy(start); marker.renderOrder = 10; root.add(marker);
  }
  return root;
}

export function disposePressureOverlay(group: THREE.Group | null) {
  if (!group) return; group.removeFromParent();
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  group.traverse(object => { const renderable = object as THREE.Mesh; if (renderable.geometry) geometries.add(renderable.geometry);
    if (renderable.material) for (const material of Array.isArray(renderable.material) ? renderable.material : [renderable.material]) materials.add(material); });
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose());
}
