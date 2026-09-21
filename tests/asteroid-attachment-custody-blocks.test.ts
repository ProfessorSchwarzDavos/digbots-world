import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine } from "../app/game/engine";
import { BlockId } from "../app/game/data";
import { CUSTODY_BLOCK_MODELS, custodyBlockBodyBounds, type CustodyBlockField } from "../app/game/custody-block-body";
import { selectAsteroidCustodyBlocks } from "../app/game/asteroid-attachment-custody-blocks";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { createEmptyCaptureOrb, createOrbRack, createCreatureHealer } from "../app/game/capture-orbs";
import { canonicalJson } from "../app/game/universe-json";
import type { WorldCreatureCustodySource } from "../app/game/creature-custody-sources";

const orbit = locationAddress({ ...homeLocation(universeId("custody-blocks")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 953), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const fields = Object.keys(CUSTODY_BLOCK_MODELS) as CustodyBlockField[];
const center = { x: frame.offset.x, y: frame.offset.y + 32, z: frame.offset.z };
function fixture(field: CustodyBlockField, key: string, facing: 0 | 1 | 2 | 3 = 0) {
  // Payload is deliberately opaque: this selector validates physical holders,
  // not gameplay slot eligibility or nested creature custody.
  const source = { furnaces: {}, [field]: { [key]: { opaque: ["unchanged", { x: 999 }] } } } as unknown as WorldCreatureCustodySource;
  const world = { block: (query: string) => query === key ? CUSTODY_BLOCK_MODELS[field].block : BlockId.Air, facing: () => facing };
  return { source, world };
}
const keyOf = (p: typeof center) => `${p.x},${p.y},${p.z}`;

test("all six actual holder families classify inside and outside without changing opaque stores", () => {
  for (const field of fields) for (const attached of [true, false]) for (const facing of [0, 1, 2, 3] as const) {
    const key = keyOf({ ...center, x: center.x + (attached ? 0 : 100) }), f = fixture(field, key, facing), before = canonicalJson(f.source);
    assert.deepEqual(selectAsteroidCustodyBlocks(frame, f.source, f.world), [{ field, key, attached }]);
    assert.equal(canonicalJson(f.source), before);
    assert(Object.isFrozen(selectAsteroidCustodyBlocks(frame, f.source, f.world)[0]));
  }
});

test("furnace and healer protrusions reject both inside-root and outside-root boundary overlaps in every facing", () => {
  const b = frame.orbitBounds;
  for (const field of ["furnaces", "healingStations"] as const) for (const facing of [0, 1, 2, 3] as const) {
    // Facing north/east/south/west: first root points outward, second inward.
    const inside = { ...center, ...(facing === 0 ? { z: b.minZ } : facing === 1 ? { x: b.maxX } : facing === 2 ? { z: b.maxZ } : { x: b.minX }) };
    const outside = { ...center, ...(facing === 0 ? { z: b.maxZ + 1 } : facing === 1 ? { x: b.minX - 1 } : facing === 2 ? { z: b.minZ - 1 } : { x: b.maxX + 1 }) };
    for (const p of [inside, outside]) {
      const f = fixture(field, keyOf(p), facing);
      assert.throws(() => selectAsteroidCustodyBlocks(frame, f.source, f.world), /crosses/);
    }
  }
});

test("cell-contained bodies may touch all six boundaries, while missing voxels and facings fail closed", () => {
  const b = frame.orbitBounds;
  for (const field of ["wheatMills", "orbRacks", "morphLooms", "fieldPerches"] as const) {
    for (const p of [{ ...center, x: b.minX }, { ...center, x: b.maxX }, { ...center, z: b.minZ }, { ...center, z: b.maxZ },
      { ...center, y: b.minY }, { ...center, y: b.maxY }]) {
      const f = fixture(field, keyOf(p)); assert.equal(selectAsteroidCustodyBlocks(frame, f.source, f.world)[0].attached, true);
    }
  }
  const f = fixture("furnaces", keyOf(center));
  assert.throws(() => selectAsteroidCustodyBlocks(frame, f.source, { ...f.world, block: () => undefined }), /canonical voxel/);
  assert.throws(() => selectAsteroidCustodyBlocks(frame, f.source, { ...f.world, facing: () => undefined }), /facing/);
  assert.throws(() => custodyBlockBodyBounds("furnaces", center, 4 as 0), /pose/);
  assert.throws(() => custodyBlockBodyBounds("furnaces", { ...center, x: .1 }, 0), /pose/);
  assert.throws(() => selectAsteroidCustodyBlocks(frame, fixture("furnaces", "01,2,3").source, f.world), /cell/);
});

test("actual engine rack/healer occupied display vertices fit every facing including full active fuel", () => {
  let vertices = 0;
  for (const field of ["orbRacks", "healingStations"] as const) for (const facing of [0, 1, 2, 3] as const) {
    const engine = Object.assign(Object.create(VoxelEngine.prototype), { world: { blockFacingAt: () => facing } }) as VoxelEngine;
    const slots = Array.from({ length: field === "orbRacks" ? 8 : 4 }, (_, i) => createEmptyCaptureOrb(`orb-${i}`));
    const model = engine.createOrbStationVisual(keyOf(center), field === "orbRacks" ? createOrbRack(slots) : createCreatureHealer(slots, 100, 100),
      field === "orbRacks" ? "orb-rack" : "healing-station");
    const b = custodyBlockBodyBounds(field, center, facing); model.updateMatrixWorld(true);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      const position = object.geometry.getAttribute("position");
      for (let i = 0; i < position.count; i++) {
        const p = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld); vertices++;
        assert(p.x >= b.minX - 1e-6 && p.x <= b.maxX + 1e-6 && p.y >= b.minY - 1e-6 && p.y <= b.maxY + 1e-6
          && p.z >= b.minZ - 1e-6 && p.z <= b.maxZ + 1e-6, `${field}/${facing}/${p.toArray()}`);
      }
    });
    for (const geometry of geometries) geometry.dispose(); for (const material of materials) material.dispose();
  }
  assert(vertices > 10_000);
});
