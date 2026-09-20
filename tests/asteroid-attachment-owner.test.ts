import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry, expandAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, rebaseAsteroidCell } from "../app/game/asteroid-attachment-frame";
import { admitAsteroidAttachmentOwner, advanceAsteroidAttachmentExtent, captureAsteroidOrbitOwner, composeAsteroidOrbitFields, readAsteroidAttachmentOwner } from "../app/game/asteroid-attachment-owner";
import { captureAsteroidEdits, projectAsteroidEdits } from "../app/game/asteroid-runtime";
import { ASTEROID_ATTACHMENT_FIELD_POLICY } from "../app/game/asteroid-attachment-policy";
import { celestialTerrainSeed } from "../app/game/celestial-terrain";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { BlockId, Item } from "../app/game/data";
import { createMachine } from "../app/game/wayworks";
import { createStationRegistry } from "../app/game/orbital-station";
import type { SaveFields } from "../app/game/universe-save";
import type { ChunkEditSave } from "../app/game/world";

const seed = "canonical-metadata-owner", orbit = locationAddress({ ...homeLocation(universeId("attachment-owner")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, celestialTerrainSeed(seed)), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const cell = rebaseAsteroidCell(frame, "0,32,0", "local");
function voxelEdit(key: string, block: BlockId): ChunkEditSave {
  const [x, y, z] = key.split(",").map(Number), cx = Math.floor(x / 16), cz = Math.floor(z / 16);
  return { [`${cx},${cz}`]: [[(y + 64) * 256 + (z - cz * 16) * 16 + x - cx * 16, block]] };
}
function fixture() {
  const machine = createMachine("gas-tank", frame.orbitId, "host"); machine.energyJ = 318;
  const fields = { seed, generatorVersion: 18, weather: "clear", spawn: { x: 0, y: 32, z: 0 },
    mapKnowledge: { fastTravelCharges: 17, opaqueHistory: ["known"] },
    "@guestLocationProgressions": { guest: { respawn: { x: 1, y: 32, z: 0 } } },
    edits: {}, furnaces: {}, chests: { [cell]: [{ item: Item.FieldWrench, count: 1, durability: 43, metadata: { x: 781, locationId: "portable" } }] },
    wayworks: { [cell]: machine }, orbitalStations: createStationRegistry(frame.orbitId),
    agentCustody: { schema: 1, agents: { worker: { inventory: [{ item: BlockId.Stone, count: 17 }], returning: [{ item: BlockId.Stone, count: 90 }], revision: 7 } } },
  };
  return fields;
}
test("admission produces one canonical metadata owner and no physical location mirrors", () => {
  const fields = fixture(), before = structuredClone(fields), result = admitAsteroidAttachmentOwner(registry, null, fields, {});
  assert.deepEqual(Object.keys(result.location).sort(), ["seed", "generatorVersion", "weather", "spawn", "mapKnowledge", "@guestLocationProgressions"].sort());
  assert.deepEqual(result.owner.fields.wayworks, fields.wayworks); assert.deepEqual(result.owner.fields.chests, fields.chests);
  assert.deepEqual(result.owner.fields.orbitalStations, fields.orbitalStations); assert.deepEqual(result.owner.fields.agentCustody, fields.agentCustody);
  assert.deepEqual(composeAsteroidOrbitFields(registry, result.owner, result.location), fields);
  assert.deepEqual(fields, before); assert.ok(Object.isFrozen(result.owner.fields)); assert.ok(!Object.isFrozen(fields));
  assert.deepEqual(readAsteroidAttachmentOwner(JSON.parse(JSON.stringify(result.owner)), registry), result.owner);
  assert.throws(() => admitAsteroidAttachmentOwner(registry, result.owner, fields, {}), /already exists/);
});
test("capture changes one revision, retains view-local state separately and rejects stale/missing custody", () => {
  const fields = fixture(), admitted = admitAsteroidAttachmentOwner(registry, null, fields, {});
  const noop = captureAsteroidOrbitOwner(registry, admitted.owner, { epoch: 1, revision: 0 }, fields, {});
  assert.deepEqual(noop, admitted);
  const edited = structuredClone(fields); edited.wayworks[cell].energyJ--; edited.mapKnowledge.fastTravelCharges--;
  const result = captureAsteroidOrbitOwner(registry, admitted.owner, { epoch: 1, revision: 0 }, edited, {});
  assert.equal(result.owner.revision, 1); assert.equal(result.location.mapKnowledge && (result.location.mapKnowledge as { fastTravelCharges: number }).fastTravelCharges, 16);
  assert.deepEqual(result.owner.fields.chests, admitted.owner.fields.chests);
  assert.deepEqual(result.owner.fields.agentCustody, admitted.owner.fields.agentCustody);
  assert.throws(() => captureAsteroidOrbitOwner(registry, result.owner, { epoch: 1, revision: 0 }, edited, {}), /Stale/);
  assert.throws(() => captureAsteroidOrbitOwner(registry, admitted.owner, { epoch: 2, revision: 0 }, edited, {}), /Stale/);
  const missing = { ...fields } as Record<string, unknown>; delete missing.agentCustody;
  assert.throws(() => captureAsteroidOrbitOwner(registry, admitted.owner, { epoch: 1, revision: 0 }, missing, {}), /omitted/);
  const exhausted = { ...admitted.owner, revision: Number.MAX_SAFE_INTEGER };
  assert.throws(() => captureAsteroidOrbitOwner(registry, exhausted, exhausted, edited, {}), /exhausted/);
  assert.equal(readAsteroidAttachmentOwner(admitted.owner, registry).revision, 0);
});
test("owner admission strips only captured finite pages and hydration can reconstruct exact mined rock", () => {
  const edited = { ...fixture(), edits: voxelEdit(cell, BlockId.Air) };
  assert.throws(() => admitAsteroidAttachmentOwner(registry, null, edited, {}), /Uncaptured/);
  const captured = captureAsteroidEdits({ schema: 1, fields: { [frame.orbitId]: registry } }, orbit, edited.edits).fields[frame.orbitId];
  const admitted = admitAsteroidAttachmentOwner(captured, null, edited, {});
  assert.deepEqual(admitted.owner.fields.edits, {}); assert.ok(!("edits" in admitted.location));
  assert.deepEqual(projectAsteroidEdits(captured, orbit, admitted.owner.fields.edits as Record<string, Array<[number, number]>>), edited.edits);
  assert.throws(() => readAsteroidAttachmentOwner({ ...admitted.owner, fields: { ...admitted.owner.fields, edits: edited.edits } }, captured), /mirrors/);
});
test("unknown fields/extensions, wrong identities and duplicate view-local/physical ownership fail closed", () => {
  const fields = fixture(), admitted = admitAsteroidAttachmentOwner(registry, null, fields, {});
  assert.throws(() => admitAsteroidAttachmentOwner(registry, null, { ...fields, futureCargo: [] }, {}), /Unsupported/);
  assert.throws(() => admitAsteroidAttachmentOwner(registry, null, fields, { opaqueLegacy: { count: 7 } }), /extensions/);
  assert.throws(() => admitAsteroidAttachmentOwner(registry, null, { ...fields, seed: "wrong" }, {}), /seed/);
  assert.throws(() => composeAsteroidOrbitFields(registry, admitted.owner, { ...admitted.location, chests: {} }), /duplicate/);
  for (const owner of [{ ...admitted.owner, schema: 2 }, { ...admitted.owner, epoch: 0 }, { ...admitted.owner, revision: -1 },
    { ...admitted.owner, orbitId: frame.localId }, { ...admitted.owner, fieldSeed: 0 }, { ...admitted.owner, newLedger: {} }])
    assert.throws(() => readAsteroidAttachmentOwner(owner, registry));
  assert.throws(() => readAsteroidAttachmentOwner({ ...admitted.owner, fields: { ...admitted.owner.fields, spawn: fields.spawn } }, registry), /view-local/);
  const expanded = expandAsteroidRegistry(registry, 1, { orbit, seed: registry.seed, epoch: registry.epoch, expectedRevision: registry.revision });
  assert.throws(() => readAsteroidAttachmentOwner(admitted.owner, expanded), /foreign/,
    "field expansion needs an atomic owner-scope reconciliation before new finite regions replace ordinary edit ownership");
});
test("every classified location field has an explicit canonical-or-view-local disposition without value rewriting", () => {
  const fields: Record<string, unknown> = fixture();
  for (const key of Object.keys(ASTEROID_ATTACHMENT_FIELD_POLICY)) if (!Object.hasOwn(fields, key)) fields[key] = { preserved: key, portable: { x: 182, y: -932, count: 73 } };
  const before = structuredClone(fields), result = admitAsteroidAttachmentOwner(registry, null, fields, {});
  const recomposed: SaveFields = composeAsteroidOrbitFields(registry, result.owner, result.location);
  assert.deepEqual(recomposed, fields); assert.deepEqual(fields, before);
  for (const key of Object.keys(fields)) assert.equal(Number(Object.hasOwn(result.owner.fields, key)) + Number(Object.hasOwn(result.location, key)), 1, key);
  // Deliberately structural fixtures: field-specific validation/selector proof is
  // NOT inferred from this opaque disposition test.
});
test("survey expansion transfers newly covered construction exactly once and retains all prior asteroid custody", () => {
  const expanded = expandAsteroidRegistry(registry, 1, { orbit, seed: registry.seed, epoch: registry.epoch, expectedRevision: registry.revision });
  const added = expanded.asteroids.find(entry => !registry.asteroids.some(old => old.descriptor.id === entry.descriptor.id))!.descriptor;
  const { x, y, z } = added.center;
  const fields = { ...fixture(), edits: voxelEdit(`${x},${y},${z}`, BlockId.ReinforcedWindow) };
  const admitted = admitAsteroidAttachmentOwner(registry, null, fields, {}), before = structuredClone({ admitted, registry, expanded, fields });
  assert.deepEqual(admitted.owner.fields.edits, fields.edits, "ordinary construction is not owned by a not-yet-surveyed finite region");
  assert.throws(() => advanceAsteroidAttachmentExtent(registry, expanded, admitted.owner, admitted.owner, fields, {}), /Uncaptured/);
  const captured = captureAsteroidEdits({ schema: 1, fields: { [frame.orbitId]: expanded } }, orbit, fields.edits).fields[frame.orbitId];
  const result = advanceAsteroidAttachmentExtent(registry, captured, admitted.owner, admitted.owner, fields, {});
  assert.equal(result.owner.fieldExtent, 1); assert.equal(result.owner.revision, 1); assert.deepEqual(result.owner.fields.edits, {});
  assert.deepEqual(result.owner.fields.chests, admitted.owner.fields.chests);
  assert.deepEqual(projectAsteroidEdits(captured, orbit, {}), fields.edits);
  assert.deepEqual({ admitted, registry, expanded, fields }, before);
  const changedOld = captureAsteroidEdits({ schema: 1, fields: { [frame.orbitId]: captured } }, orbit,
    { ...fields.edits, ...voxelEdit(cell, BlockId.Air) }).fields[frame.orbitId];
  assert.throws(() => advanceAsteroidAttachmentExtent(registry, changedOld, admitted.owner, admitted.owner, fields, {}), /existing asteroid/);
  assert.throws(() => advanceAsteroidAttachmentExtent(registry, registry, admitted.owner, admitted.owner, fields, {}), /expansion/);
  assert.throws(() => advanceAsteroidAttachmentExtent(registry, captured, admitted.owner, { epoch: 1, revision: 1 }, fields, {}), /Stale/);
  const noop = captureAsteroidOrbitOwner(captured, result.owner, result.owner,
    composeAsteroidOrbitFields(captured, result.owner, result.location), {});
  assert.deepEqual(noop, result);
});
