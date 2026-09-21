import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine } from "../app/game/engine";
import { BlockId, Item, type InventorySlot } from "../app/game/data";
import { type BlockFacing } from "../app/game/block-facing";
import { chestBodyBounds, type ChestCell } from "../app/game/chest-body";
import { CHEST_MAX_OPEN_ANGLE, chestLidRotation } from "../app/game/chest-model";
import { captureAsteroidBlockChests, projectAsteroidBlockChests, type BlockChestStores, type BlockChestWorld } from "../app/game/asteroid-attachment-chests";
import { createAsteroidAttachmentFrame, rebaseAsteroidCell } from "../app/game/asteroid-attachment-frame";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { canonicalJson } from "../app/game/universe-json";

const orbit = locationAddress({ ...homeLocation(universeId("chest-owner-test")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 953), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const key = (x: number, y = 32, z = 0) => rebaseAsteroidCell(frame, `${x},${y},${z}`, "local");
const slots = (halves = 1): (InventorySlot | null)[] => Array.from({ length: halves * 27 }, (_, i) => i === 0
  ? { item: Item.RawIron, count: 17, metadata: { x: 777, y: .125, z: -999 } } : i === 27 ? { item: Item.RawCopper, count: 9 } : null);
function world(keys: readonly string[], facing: BlockFacing = 0): BlockChestWorld {
  const blocks = new Set(keys.flatMap(key => key.split("|")));
  return { block: key => blocks.has(key) ? BlockId.Chest : BlockId.Air, facing: () => facing };
}

test("actual articulated engine chest vertices stay inside analytic bounds for every facing, pair axis and lid phase", () => {
  const shapes: ChestCell[][] = [[[10, 30, -40]], [[10, 30, -40], [11, 30, -40]], [[11, 30, -40], [10, 30, -40]],
    [[10, 30, -40], [10, 30, -39]], [[10, 30, -39], [10, 30, -40]]];
  let vertices = 0;
  for (const cells of shapes) for (const facing of [0, 1, 2, 3] as const) {
    const engine = Object.assign(Object.create(VoxelEngine.prototype), { scene: new THREE.Scene(),
      world: { atlas: null, setChestVisualHidden: () => {}, blockFacingAt: () => facing }, audio: { playSample: () => {} },
      activeChestModel: null, activeChestBlocks: [], chestLidPivot: null, activeChestKey: cells.map(cell => cell.join(",")).join("|") }) as VoxelEngine;
    const b = chestBodyBounds(cells, facing);
    engine.showChestModel(cells[0].join(","));
    try {
      for (let phase = 0; phase <= 100; phase++) {
        engine.chestLidPivot!.rotation.x = chestLidRotation(phase / 100);
        engine.activeChestModel!.updateMatrixWorld(true);
        engine.activeChestModel!.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          const position = object.geometry.getAttribute("position");
          for (let i = 0; i < position.count; i++) {
            const p = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld); vertices++;
            assert(p.x >= b.minX - 1e-6 && p.x <= b.maxX + 1e-6 && p.y >= b.minY - 1e-6 && p.y <= b.maxY + 1e-6
              && p.z >= b.minZ - 1e-6 && p.z <= b.maxZ + 1e-6, `${cells}/${facing}/${phase}: ${p.toArray()}`);
          }
        });
      }
    } finally { engine.hideChestModel(true); }
  }
  assert(vertices > 100_000); assert.equal(CHEST_MAX_OPEN_ANGLE, 1.08);
  assert(chestBodyBounds([[0, 0, 0]], 0).maxY > .9, "opening lid extends above the closed voxel");
});

test("double chest coordinate rebasing preserves half order and all finite opaque contents for one hundred cold cycles", () => {
  let pair = "";
  for (let x = -28; x < 27; x++) {
    const candidate = [key(x), key(x + 1)].sort().join("|");
    const local = candidate.split("|").map(cell => rebaseAsteroidCell(frame, cell, "orbit"));
    if (local.join("|") !== [...local].sort().join("|")) { pair = candidate; break; }
  }
  assert(pair, "fixture must exercise changed lexical order");
  const outside = `${frame.orbitBounds.maxX + 10},${frame.offset.y + 32},${frame.offset.z}`;
  const source: BlockChestStores = { [pair]: slots(2), [outside]: slots() }, reader = world([pair, outside]);
  let current = source;
  const expectedLocal = pair.split("|").map(cell => rebaseAsteroidCell(frame, cell, "orbit")).join("|");
  for (let i = 0; i < 100; i++) {
    const baseline = projectAsteroidBlockChests(frame, current, reader);
    assert.deepEqual(Object.keys(baseline), [expectedLocal]); assert.deepEqual(baseline[expectedLocal], source[pair]);
    current = JSON.parse(canonicalJson(captureAsteroidBlockChests(frame, current, baseline, JSON.parse(canonicalJson(baseline)), { before: reader, after: reader })));
  }
  assert.equal(canonicalJson(current), canonicalJson(source));
});

test("whole pairs, lid intrusion and potential opening-time joins across a frame boundary refuse", () => {
  const inside = key(31), outside = `${frame.orbitBounds.maxX + 1},${frame.offset.y + 32},${frame.offset.z}`;
  const pair = `${inside}|${outside}`;
  assert.throws(() => projectAsteroidBlockChests(frame, { [pair]: slots(2) }, world([pair])), /crosses/);
  assert.throws(() => projectAsteroidBlockChests(frame, { [inside]: slots() }, world([inside, outside])), /Potential double chest/);
  assert.throws(() => projectAsteroidBlockChests(frame, { [outside]: slots() }, world([inside, outside])), /Potential double chest/);
  const ceiling = `${frame.offset.x},${frame.orbitBounds.maxY},${frame.offset.z}`;
  assert.throws(() => projectAsteroidBlockChests(frame, { [ceiling]: slots() }, world([ceiling])), /crosses/);
  const backEdge = key(0, 32, 31);
  assert.throws(() => projectAsteroidBlockChests(frame, { [backEdge]: slots() }, world([backEdge])), /crosses/);
  // The neighboring block is already in an outside pair and cannot join this one.
  const farther = `${frame.orbitBounds.maxX + 2},${frame.offset.y + 32},${frame.offset.z}`;
  const pairedOutside = `${outside}|${farther}`, stores = { [inside]: slots(), [pairedOutside]: slots(2) };
  assert.equal(Object.keys(projectAsteroidBlockChests(frame, stores, world([inside, pairedOutside]))).length, 1);
});

test("unsupported mobile/exhibit IDs, overlapping halves and unknown canonical voxels/facings reject", () => {
  const a = key(0), b = key(1), pair = `${a}|${b}`;
  const invalid: BlockChestStores[] = [{ "boat:id": slots() }, { "dragon:23:cargo": slots() }, { [`exhibit:${a}`]: slots() },
    { [a]: slots(), [pair]: slots(2) }, { [`${a}|${key(2)}`]: slots(2) }, { [a]: slots(2) }];
  for (const stores of invalid)
    assert.throws(() => projectAsteroidBlockChests(frame, stores, world([a, b, key(2)])));
  assert.throws(() => projectAsteroidBlockChests(frame, { [a]: slots() }, { block: () => undefined, facing: () => 0 }));
  assert.throws(() => projectAsteroidBlockChests(frame, { [a]: slots() }, { block: () => BlockId.Chest, facing: () => undefined }));
  assert.throws(() => projectAsteroidBlockChests(frame, { [a]: slots() }, { block: cell => cell === a ? BlockId.Chest : undefined, facing: () => 0 }), /neighborhood/);
});

test("capture preserves outside storage, rejects stale state and checks complete after-image topology", () => {
  const a = key(0), b = key(1), source = { [a]: slots() }, before = world([a]), baseline = projectAsteroidBlockChests(frame, source, before);
  const edited = { [`0,32,0|1,32,0`]: slots(2) }, after = world([a, b]);
  const result = captureAsteroidBlockChests(frame, source, baseline, edited, { before, after });
  assert.deepEqual(Object.keys(result), [`${a}|${b}`]); assert.deepEqual(result[`${a}|${b}`], edited["0,32,0|1,32,0"]);
  assert.throws(() => captureAsteroidBlockChests(frame, { [a]: source[a].map(() => null) }, baseline, edited, { before, after }), /Stale/);
  assert.throws(() => captureAsteroidBlockChests(frame, source, baseline, edited, { before, after: before }), /Missing/);
  assert.throws(() => captureAsteroidBlockChests(frame, source, baseline, { "31,32,0|32,32,0": slots(2) }, { before, after }), /boundary/);
  assert.deepEqual(source[a], slots());
});
