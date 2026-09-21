import { VoxelEngine } from "../app/game/engine";
import { learnedMovesAtLevel } from "../app/game/creature-moves";
import { creatureProfile } from "../app/game/creature-profiles";
import { migrateCreatureProgression, recordCreatureCaptureHistory } from "../app/game/creature-progression";
import { creatureMaximumHealth } from "../app/game/creature-stats";
import { MOB_DEFS } from "../app/game/mobs";

/** Synthetic live specimen using normal stat derivation and capture serialization.
 * This provisions an already bonded companion, not evidence of earning its bond.
 */
export function producerRecallFixture(level = 10, healthFraction = 1) {
  const definition = MOB_DEFS.petalfox, profile = creatureProfile("petalfox");
  const specimenId = "cf6-r16-recall-specimen", geneticSeed = 321;
  const progression = recordCreatureCaptureHistory(migrateCreatureProgression({
    kind: "petalfox", entityId: specimenId, geneticSeed, age: 2000,
    maximumLevel: profile.stats.maximumLevel, defaultMoveIds: learnedMovesAtLevel(profile.moves, level),
    legacy: { level, shiny: false },
  }), { capturedAt: 1000, captorId: "local", methodId: "capture-orb" });
  const maximum = creatureMaximumHealth(definition, profile.stats, progression.level);
  // Only fields read by the real metadata producer are required for this adapter.
  const mob = {
    id: 23, specimenId, kind: "petalfox", definition, health: maximum * healthFraction, maxHealth: maximum,
    age: 2000, hostile: false, creatureTamed: true, creatureOwnerId: "local", name: "Recall Witness",
    geneticSeed, progression, creatureEquipment: {}, typeSources: [], combatStatuses: [],
    followCommand: "follow", creatureWork: null, factionId: null, settlementId: null,
    aligned: false, persistentPoiResident: false, enclosed: false,
  } as unknown as Parameters<VoxelEngine["creatureMetadataForMob"]>[0];
  const engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  return { mob, progression, maximum, metadata: engine.creatureMetadataForMob(mob) };
}
