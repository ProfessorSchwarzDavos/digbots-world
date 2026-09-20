import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, rebaseAsteroidCell } from "../app/game/asteroid-attachment-frame";
import { ASTEROID_AQUARIUM_CODEC, ASTEROID_MACHINE_CODEC, captureAsteroidBlocks, opaqueAsteroidBlockCodec, projectAsteroidBlocks } from "../app/game/asteroid-attachment-blocks";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { createMachine } from "../app/game/wayworks";
import { createWorkshopProcess } from "../app/game/wayworks-stores";
import type { AquariumState } from "../app/game/aquarium";

const orbit = locationAddress({ ...homeLocation(universeId("block-owner-test")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 953), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const inside = rebaseAsteroidCell(frame, "0,32,0", "local"), outside = "0,32,0";
test("keyed finite contents have one merge owner with exact outside and opaque metadata retention", () => {
  const input = { [inside]: { count: 31, metadata: { x: 999, locationId: "portable", oxygenMl: 451 } },
    [outside]: { count: 777, metadata: { x: -999, locationId: "outside", oxygenMl: 312 } } };
  const codec = opaqueAsteroidBlockCodec<typeof input[string]>(), before = structuredClone(input), baseline = projectAsteroidBlocks(frame, input, codec);
  assert.deepEqual(Object.keys(baseline), ["0,32,0"]); assert.deepEqual(captureAsteroidBlocks(frame, input, baseline, baseline, codec), input);
  const edited = structuredClone(baseline); edited["0,32,0"].count--;
  const output = captureAsteroidBlocks(frame, input, baseline, edited, codec);
  assert.equal(output[inside].count, 30); assert.deepEqual(output[outside], input[outside]); assert.deepEqual(input, before);
  output[outside].count = 1; assert.deepEqual(input, before);
  const changed = structuredClone(input); changed[inside].count--;
  assert.throws(() => captureAsteroidBlocks(frame, changed, baseline, edited, codec), /Stale/);
  assert.throws(() => captureAsteroidBlocks(frame, input, baseline, { "32,32,0": edited["0,32,0"] }, codec), /outside/);
});
test("machine projection/merge preserves outside stores and rejects duplicate installation identity", () => {
  const a = createMachine("gas-tank", frame.orbitId, "host"), b = createMachine("gas-tank", frame.orbitId, "host");
  a.energyJ = 137; b.energyJ = 931;
  a.workshop.process = { ...createWorkshopProcess(), installationId: "p-1" };
  b.workshop.process = { ...createWorkshopProcess(), installationId: "p-2" };
  const source = { [inside]: a, [outside]: b }, baseline = projectAsteroidBlocks(frame, source, ASTEROID_MACHINE_CODEC);
  assert.equal(baseline["0,32,0"].locationId, frame.localId);
  assert.deepEqual(captureAsteroidBlocks(frame, source, baseline, baseline, ASTEROID_MACHINE_CODEC), source);
  const edited = structuredClone(baseline); edited["0,32,0"].workshop.process!.installationId = "p-2";
  assert.throws(() => captureAsteroidBlocks(frame, source, baseline, edited, ASTEROID_MACHINE_CODEC), /Duplicate/);
});
test("aquarium selection tests the entire component including an outside origin pointing inward", () => {
  const component = (keys: string[], id: string): AquariumState => ({ schema: 1, blockKeys: keys,
    residents: [{ id, storedAt: 13, metadata: {
      schema: 1, entityId: id, kind: "reedneedle", health: 3, maxHealth: 3,
      ageTicks: 48000, baby: false, temperament: "Gentle", hostile: false,
      tamed: false, ownerId: null, name: null, geneticSeed: id.length * 17,
      command: null, custom: { specimenId: id },
    } }], lastBreedingCycle: 8 });
  const source = { [inside]: component([inside, rebaseAsteroidCell(frame, "1,32,0", "local")], "fish-one"),
    [outside]: component([outside, "1,32,0"], "fish-two") };
  const baseline = projectAsteroidBlocks(frame, source, ASTEROID_AQUARIUM_CODEC);
  assert.deepEqual(captureAsteroidBlocks(frame, source, baseline, baseline, ASTEROID_AQUARIUM_CODEC), source);
  assert.throws(() => projectAsteroidBlocks(frame, { [outside]: component([outside, inside], "fish-one") }, ASTEROID_AQUARIUM_CODEC), /crosses/);
  const edited = structuredClone(baseline); edited["0,32,0"] = component(["0,32,0"], "fish-two");
  assert.throws(() => captureAsteroidBlocks(frame, source, baseline, edited, ASTEROID_AQUARIUM_CODEC), /Duplicate/);
});
