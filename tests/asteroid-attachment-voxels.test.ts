import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { captureAsteroidEdits, projectAsteroidEdits } from "../app/game/asteroid-runtime";
import { createAsteroidAttachmentFrame, rebaseAsteroidCell } from "../app/game/asteroid-attachment-frame";
import { captureAsteroidVoxelEdits, projectAsteroidVoxelEdits, stripCapturedAsteroidEditMirrors } from "../app/game/asteroid-attachment-voxels";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import { BlockId } from "../app/game/data";
import type { ChunkEditSave } from "../app/game/world";

const orbit = locationAddress({ ...homeLocation(universeId("voxel-frames")), kind: "orbit", instanceId: "high" });
const registry = createAsteroidRegistry(orbit, 371), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const local = locationAddress({ ...orbit, kind: "asteroid", instanceId: frame.asteroidId });
function edits(...entries: Array<[string, BlockId]>): ChunkEditSave {
  const result: ChunkEditSave = {};
  for (const [key, block] of entries) {
    const [x, y, z] = key.split(",").map(Number), cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    (result[`${cx},${cz}`] ??= []).push([(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, block]);
  }
  return result;
}
const canonical = (key: string) => rebaseAsteroidCell(frame, key, "local");
test("voxel views preserve negative chunk/index layout, vertical offsets and exact unchanged ordering", () => {
  const source = { ...edits([canonical("-17,31,-1"), BlockId.ReinforcedWindow], [canonical("-18,32,-1"), BlockId.StationTruss],
    [canonical("31,33,31"), BlockId.Air], ["0,12,0", BlockId.GoldOre]), "100,100": [] };
  const before = structuredClone(source), baseline = projectAsteroidVoxelEdits(frame, source);
  assert.deepEqual(baseline, edits(["-17,31,-1", BlockId.ReinforcedWindow], ["-18,32,-1", BlockId.StationTruss], ["31,33,31", BlockId.Air]));
  assert.deepEqual(captureAsteroidVoxelEdits(frame, source, baseline, baseline), source);
  assert.deepEqual(source, before);
  baseline["-2,-1"][0][1] = BlockId.Air; assert.deepEqual(source, before);
});
test("edited local voxels merge only their frame and reject stale or outside proposals", () => {
  const source = edits([canonical("0,32,0"), BlockId.StationTruss], ["0,12,0", BlockId.GoldOre]);
  const baseline = projectAsteroidVoxelEdits(frame, source), edited = edits(["0,32,0", BlockId.Air], ["-32,32,0", BlockId.ReinforcedWindow]);
  const output = captureAsteroidVoxelEdits(frame, source, baseline, edited);
  assert.deepEqual(output, edits([canonical("0,32,0"), BlockId.Air], ["0,12,0", BlockId.GoldOre], [canonical("-32,32,0"), BlockId.ReinforcedWindow]));
  assert.throws(() => captureAsteroidVoxelEdits(frame, source, {}, edited), /Stale/);
  assert.throws(() => captureAsteroidVoxelEdits(frame, source, baseline, edits(["32,32,0", BlockId.StationTruss])), /outside/);
  const outsideChange = edits([canonical("0,32,0"), BlockId.StationTruss], ["0,12,0", BlockId.Air]);
  assert.deepEqual(captureAsteroidVoxelEdits(frame, outsideChange, baseline, baseline), outsideChange);
});
test("finite voxel mirrors disappear only after canonical page capture, then cold projection reconstructs them", () => {
  const mined = edits([canonical("0,32,0"), BlockId.Air], [canonical("30,32,0"), BlockId.ReinforcedWindow], ["0,12,0", BlockId.GoldOre]);
  const before = structuredClone(mined), original = structuredClone(registry);
  assert.throws(() => stripCapturedAsteroidEditMirrors(registry, orbit, mined), /Uncaptured/);
  const saved = captureAsteroidEdits({ schema: 1, fields: { [frame.orbitId]: registry } }, orbit, mined), captured = saved.fields[frame.orbitId];
  const stripped = stripCapturedAsteroidEditMirrors(captured, orbit, mined);
  assert.deepEqual(stripped, edits([canonical("30,32,0"), BlockId.ReinforcedWindow], ["0,12,0", BlockId.GoldOre]));
  const cold = JSON.parse(JSON.stringify(captured));
  assert.deepEqual(projectAsteroidEdits(cold, orbit, stripped), mined);
  const localMined = projectAsteroidVoxelEdits(frame, mined), localStripped = stripCapturedAsteroidEditMirrors(cold, local, localMined);
  assert.deepEqual(localStripped, edits(["30,32,0", BlockId.ReinforcedWindow]));
  assert.deepEqual(projectAsteroidEdits(cold, local, localStripped), localMined);
  assert.deepEqual(mined, before); assert.deepEqual(registry, original);
  assert.throws(() => stripCapturedAsteroidEditMirrors(cold, { ...orbit, universeId: universeId("foreign") }, mined), /Foreign/);
  assert.throws(() => stripCapturedAsteroidEditMirrors(cold, { ...local, instanceId: "asteroid-high-missing" }, mined), /unknown/);
  assert.equal(locationId(cold.orbit), frame.orbitId);
});
test("chunk aliases, duplicate indices, unknown blocks and out-of-height entries fail closed", () => {
  const invalid: ChunkEditSave[] = [{ "-0,0": [] }, { "01,0": [] }, { "0,0": [[0, BlockId.Air], [0, BlockId.Air]] },
    { "0,0": [[-1, BlockId.Air]] }, { "0,0": [[49152, BlockId.Air]] }, { "0,0": [[0, 999999]] }];
  for (const source of invalid) {
    const before = structuredClone(source);
    assert.throws(() => projectAsteroidVoxelEdits(frame, source), /attached|Noncanonical/);
    assert.deepEqual(source, before);
  }
});
