import assert from "node:assert/strict";
import test from "node:test";
import { BlockId } from "../app/game/data";
import { DOOR_STATES, doorPairFor } from "../app/game/doors";
import { bedCounterpart } from "../app/game/beds";
import { FENCE_POST_TOP, FENCE_GATE_TOP, fenceConnectsTo } from "../app/game/fence-body";
import { pressureDoorUpper } from "../app/game/pressure-devices";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { captureAsteroidEdits } from "../app/game/asteroid-runtime";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { createAsteroidAttachmentWorld } from "../app/game/asteroid-attachment-world";
import { selectAsteroidArchitecture } from "../app/game/asteroid-attachment-architecture";
import { createCelestialTerrain } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { canonicalJson } from "../app/game/universe-json";
import type { BlockFacing } from "../app/game/block-facing";
import type { ChunkEditSave } from "../app/game/world";

const orbit = locationAddress({ ...homeLocation(universeId("architecture-custody")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 953), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const terrain = createCelestialTerrain({ location: orbit, seed: registry.seed })!;
const point = { x: frame.offset.x, y: frame.offset.y + 32, z: frame.offset.z };
const cell = (x = point.x, y = point.y, z = point.z) => `${x},${y},${z}`;
function world(entries: [string, BlockId][], facings: Record<string, BlockFacing> = {}, pagesOnly = false) {
  const edits: ChunkEditSave = {};
  for (const [key, block] of entries) {
    const [x, y, z] = key.split(",").map(Number), cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    (edits[`${cx},${cz}`] ??= []).push([(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, block]);
  }
  const captured = captureAsteroidEdits({ schema: 1, fields: { [frame.orbitId]: registry } }, orbit, edits).fields[frame.orbitId];
  return createAsteroidAttachmentWorld({ locationId: frame.orbitId, terrainVersion: terrain.version, terrainSeed: terrain.seed,
    expansionLevel: 0, registry: captured, edits: pagesOnly ? {} : edits, blockFacings: facings });
}
const select = (reader: ReturnType<typeof world>) => selectAsteroidArchitecture(frame, reader).installations;

test("all sixteen door states bind exact pairs once from finite pages without loaded chunks", () => {
  assert.equal(DOOR_STATES.size, 16);
  for (const [block, state] of DOOR_STATES) {
    const pair = doorPairFor(block), lowerY = point.y - Number(state.upper);
    const a = cell(point.x, lowerY), b = cell(point.x, lowerY + 1);
    const reader = world([[a, pair.lower], [b, pair.upper]], {}, true);
    assert.deepEqual(reader.source.edits, {});
    const selected = select(reader);
    assert.equal(selected.length, 1); assert.equal(selected[0].kind, "door"); assert.equal(selected[0].attached, true);
    assert.deepEqual(selected[0].cells.map(row => [row.key, row.block]), [[a, pair.lower], [b, pair.upper]].sort());
    assert(Object.isFrozen(selected[0].cells));
  }
});

test("door orphans, mixed family/open/axis and opposite-side pairs refuse", () => {
  const a = cell(), b = cell(point.x, point.y + 1);
  for (const other of [BlockId.Air, BlockId.DoorOpenUpper, BlockId.DoorXClosedUpper, BlockId.WroughtIronDoorClosedUpper])
    assert.throws(() => select(world([[a, BlockId.DoorClosedLower], [b, other]])), /counterpart/);
  assert.throws(() => select(world([[b, BlockId.DoorClosedUpper]])), /counterpart/);
  assert.throws(() => select(world([[cell(point.x, frame.orbitBounds.maxY), BlockId.DoorClosedLower],
    [cell(point.x, frame.orbitBounds.maxY + 1), BlockId.DoorClosedUpper]])), /boundary/);
  const outside = point.x + 100;
  assert.throws(() => select(world([[cell(outside), BlockId.DoorClosedLower]])), /counterpart/);
  assert.equal(select(world([[cell(outside), BlockId.DoorClosedLower], [cell(outside, point.y + 1), BlockId.DoorClosedUpper]]))[0].attached, false);
});

test("all bed orientations preserve both cells, exact matching and cross-chunk closure", () => {
  for (const foot of [BlockId.BedNorthFoot, BlockId.BedSouthFoot, BlockId.BedEastFoot, BlockId.BedWestFoot]) {
    const x = Math.floor(point.x / 16) * 16 + 15, partner = bedCounterpart(foot, x, point.y, point.z)!;
    const a = cell(x), b = cell(partner.x, partner.y, partner.z);
    const selected = select(world([[a, foot], [b, partner.type]]));
    assert.equal(selected.length, 1); assert.equal(selected[0].kind, "bed"); assert.equal(selected[0].cells.length, 2);
    assert.throws(() => select(world([[a, foot], [b, BlockId.Air]])), /counterpart/);
    assert.throws(() => select(world([[b, partner.type]])), /counterpart/);
  }
  assert.throws(() => select(world([[cell(frame.orbitBounds.maxX), BlockId.BedEastFoot],
    [cell(frame.orbitBounds.maxX + 1), BlockId.BedEastHead]])), /boundary/);
  assert.throws(() => select(world([[cell(frame.orbitBounds.minX), BlockId.BedWestFoot],
    [cell(frame.orbitBounds.minX - 1), BlockId.BedWestHead]])), /boundary/);
});

test("all pressure door pairs require exact family, same facing and whole geometry", () => {
  for (const lower of [BlockId.PressureDoor, BlockId.HorizonDoor, BlockId.EmergencyShutter]) {
    const upper = pressureDoorUpper(lower)!, a = cell(), b = cell(point.x, point.y + 1);
    for (const facing of [0, 1, 2, 3] as const) {
      assert.equal(select(world([[a, lower], [b, upper]], { [a]: facing, [b]: facing }))[0].kind, "pressure-door");
      assert.throws(() => select(world([[a, lower], [b, upper]], { [a]: facing, [b]: ((facing + 1) % 4) as BlockFacing })), /facing/);
    }
    assert.throws(() => select(world([[a, lower]])), /counterpart/);
    assert.throws(() => select(world([[b, upper]])), /counterpart/);
  }
});

test("fence and every gate pose account for protruding posts on both sides", () => {
  assert.equal(FENCE_POST_TOP, .75); assert.equal(FENCE_GATE_TOP, .72);
  for (const block of [BlockId.WildwoodFence, BlockId.FenceGateNorthSouthClosed, BlockId.FenceGateNorthSouthOpen,
    BlockId.FenceGateEastWestClosed, BlockId.FenceGateEastWestOpen]) {
    assert.equal(select(world([[cell(), block]]))[0].attached, true);
    assert.throws(() => select(world([[cell(point.x, frame.orbitBounds.maxY), block]])), /boundary/);
    if (frame.orbitBounds.minY > -64)
      assert.throws(() => select(world([[cell(point.x, frame.orbitBounds.minY - 1), block]])), /boundary/);
  }
});

test("fence joins retain four exact canonical neighbors including outside/unloaded blocks", () => {
  const x = frame.orbitBounds.maxX, a = cell(x), outside = cell(x + 1);
  const entries: [string, BlockId][] = [[a, BlockId.WildwoodFence], [outside, BlockId.Stone],
    [cell(x - 1), BlockId.FenceGateNorthSouthOpen], [cell(x, point.y, point.z + 1), BlockId.Air],
    [cell(x, point.y, point.z - 1), BlockId.Torch]];
  const selected = select(world(entries)).find(value => value.kind === "fence")!;
  assert.equal(selected.attached, true); assert.equal(selected.neighbors.length, 4);
  assert.deepEqual(selected.neighbors.map(value => value.connects), [true, true, false, false]);
  assert.equal(selected.neighbors[0].key, outside); assert.equal(selected.neighbors[0].block, BlockId.Stone);
  assert.equal(fenceConnectsTo(undefined), false);
});

test("cold repeated architecture observations are immutable, clock-free and frame-bound", () => {
  const reader = world([[cell(), BlockId.DoorClosedLower], [cell(point.x, point.y + 1), BlockId.DoorClosedUpper],
    [cell(point.x + 4), BlockId.WildwoodFence]]), before = canonicalJson(reader.source), expected = canonicalJson(select(reader));
  const now = Date.now; Date.now = () => { throw Error("No clock"); };
  try { for (let i = 0; i < 100; i++) {
    const cold = createAsteroidAttachmentWorld(JSON.parse(before)); assert.equal(canonicalJson(select(cold)), expected);
  } } finally { Date.now = now; }
  assert.equal(canonicalJson(reader.source), before);
  assert.throws(() => selectAsteroidArchitecture({ ...frame, frameId: "foreign" }, reader), /canonical world/);
});
