import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine } from "../app/game/engine";
import { attuneCaptureOrb, captureIntoOrb, captureOrbFromInventorySlot, captureOrbInventorySlot,
  createEmptyCaptureOrb, deployAttunedCaptureOrb, recallAttunedCreature } from "../app/game/capture-orbs";
import { creatureProfile } from "../app/game/creature-profiles";
import { creatureMaximumHealth } from "../app/game/creature-stats";
import { MOB_DEFS } from "../app/game/mobs";
import { producerRecallFixture } from "./creature-recall-stat-fixtures";

for (const level of [1, 10, 50]) for (const fraction of [1, .75]) {
  test(`normal producer preserves level ${level}, health fraction ${fraction} through recall serialization`, () => {
    const { metadata, progression, maximum, mob } = producerRecallFixture(level, fraction);
    const original = structuredClone(metadata);
    assert.deepEqual(metadata.custom.progression, progression);
    if (level > 1) assert(maximum > MOB_DEFS.petalfox.health, "Above-base maximum is supported, not clamped");
    const captured = captureIntoOrb(createEmptyCaptureOrb(`stat-contract-${level}-${fraction}`), metadata, 1000, "local");
    assert(captured);
    const stored = captureOrbFromInventorySlot(captureOrbInventorySlot(captured)); assert(stored);
    const attuned = attuneCaptureOrb(stored, "local", 2000); assert(attuned);
    const deployment = deployAttunedCaptureOrb(attuned, "local"); assert(deployment);

    const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
    let forwarded: Parameters<VoxelEngine["spawnMob"]>[2];
    engine.creatureReleasePosition = (_metadata, position) => position;
    // Rendering/world placement are exercised in the separately declared browser
    // journey. This adapter checks actual producer/consumer option forwarding.
    engine.spawnMob = (kind, position, options = {}) => {
      forwarded = options;
      return { ...mob, id: 47, group: { position: position.clone() }, ...options,
        maxHealth: creatureMaximumHealth(MOB_DEFS[kind], creatureProfile(kind).stats, options.progression?.level ?? 1),
      } as ReturnType<VoxelEngine["spawnMob"]>;
    };
    const restored = engine.spawnCreatureMetadata(deployment.creature, new THREE.Vector3(4, 65, 4)); assert(restored);
    assert.deepEqual(forwarded?.progression, progression);
    assert.equal(restored.maxHealth, maximum); assert.equal(restored.health, metadata.health);
    const linked = { ...deployment.orb, attunement: { ...deployment.orb.attunement!, activeEntityId: String(restored.id) } };
    const recalled = recallAttunedCreature(linked, engine.creatureMetadataForMob(restored), "local", "manual", 3000, String(restored.id));
    assert(recalled);
    const cold = captureOrbFromInventorySlot(JSON.parse(JSON.stringify(captureOrbInventorySlot(recalled.orb)))); assert(cold);
    assert.equal(cold.creature!.health, metadata.health); assert.equal(cold.creature!.maxHealth, maximum);
    assert.equal(cold.creature!.entityId, metadata.entityId); assert.equal(cold.creature!.geneticSeed, metadata.geneticSeed);
    assert.deepEqual(cold.creature!.custom.progression, progression);
    assert.equal(cold.attunement!.activeEntityId, null); assert.equal(cold.attunement!.recallCount, 1);
    assert.deepEqual(metadata, original, "Source capture record is immutable");
  });
}
