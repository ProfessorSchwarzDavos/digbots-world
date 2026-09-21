import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMultiplayerPlayerState, VoxelEngine } from "../app/game/engine";
import type { CreatureAction } from "../app/game/multiplayer";
import { captureIntoOrb, captureOrbInventorySlot, captureOrbFromInventorySlot, createEmptyCaptureOrb } from "../app/game/capture-orbs";
import type { CreatureMetadata } from "../app/game/creature-cage";
import { createPrimeEncounterState, planPrimeEncounter, transferPrimeEncounterCustody } from "../app/game/creature-rarity";
import { LEGENDARY_ENCOUNTERS, applyLegendaryEvent, createLegendaryEncounterState, resolveLegendaryEncounter } from "../app/game/legendary-encounters";
import { createDigitalCreatureArchive } from "../app/game/digital-storage";
import { canonicalJson } from "../app/game/universe-json";

function fixture(family: "ordinary" | "prime" | "legendary") {
  const anchor = "prime:petalfox:0:0", site = "recall-site";
  const kind = family === "legendary" ? LEGENDARY_ENCOUNTERS["walking-spring"].kind : "petalfox";
  const refs: CreatureMetadata["custom"] = family === "prime" ? { primeAnchorId: anchor }
    : family === "legendary" ? { legendaryEncounterId: "walking-spring", legendarySiteId: site } : {};
  const metadata: CreatureMetadata = { schema: 1, entityId: "permanent-specimen", kind, health: 5, maxHealth: 7, ageTicks: 123,
    baby: false, temperament: "Gentle", hostile: false, tamed: true, ownerId: "keeper", name: null, geneticSeed: 321, command: null, custom: refs };
  const orb = { ...captureIntoOrb(createEmptyCaptureOrb("recall-orb"), metadata, 200, "keeper")!,
    attunement: { ownerId: "keeper", attunedAt: 210, activeEntityId: "23", recalledAt: 0, recallCount: 0, fainted: false } };
  const mob = { id: 23, specimenId: metadata.entityId, kind, attunedOrbId: orb.orbId, name: "Companion",
    primeAnchorId: null, legendaryEncounterId: null, legendarySiteId: null, ...refs };
  const prime = transferPrimeEncounterCustody(createPrimeEncounterState(planPrimeEncounter("petalfox", { worldSeed: "fixture", x: 0, z: 0, y: 30,
    surfaceY: 30, biomeName: "Glimmerwood", weather: "clear", daylight: .8 })!, "petalfox", 23, 100), "captured", metadata.entityId, `orb:${orb.orbId}`, 23, 200);
  let legendary = createLegendaryEncounterState("walking-spring", site);
  for (const stage of LEGENDARY_ENCOUNTERS["walking-spring"].stages) for (const objective of stage.objectives)
    legendary = applyLegendaryEvent(legendary, { kind: objective.event, amount: objective.target, siteId: site, sourceId: `${stage.id}:${objective.id}` });
  legendary = resolveLegendaryEncounter(legendary, "capture", "creature:23", 17);
  const effects: string[] = [];
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    multiplayer: null, inventory: [captureOrbInventorySlot(orb)], equipment: { head: null, chest: null, legs: null, feet: null, back: null },
    cursor: null, trash: null, craftGrid: [], chests: new Map(), boats: new Map(), orbRacks: new Map(), healingStations: new Map(),
    digitalCreatureArchive: createDigitalCreatureArchive(), mobs: [mob], sleepingCreatures: [],
    primeEncounters: new Map(family === "prime" ? [[anchor, prime]] : []), legendaryEncounters: new Map(family === "legendary" ? [[site, legendary]] : []),
    creatureMetadataForMob: () => ({ ...metadata, custom: { ...metadata.custom } }), localPlayerId: () => "keeper",
    syncOrbRackVisuals: () => {}, spawnRecallSparkles: () => effects.push("sparkles"),
    audio: { play: () => effects.push("audio") }, events: { onToast: () => effects.push("toast") },
    saveSoon: () => effects.push("save"), emitHud: () => effects.push("hud"),
  }) as VoxelEngine;
  engine.removeMob = index => { engine.mobs.splice(index, 1); effects.push("remove"); };
  return { engine, mob: engine.mobs[0], effects, metadata, prime, legendary, anchor, site };
}

test("actual manual and fainted recall preserves permanent specimen identity and updates current encounter custody", () => {
  for (const family of ["ordinary", "prime", "legendary"] as const) for (const reason of ["manual", "fainted"] as const) {
    const { engine, mob, metadata, prime, legendary, anchor, site } = fixture(family);
    assert.equal(engine.recallAttunedMob(mob, reason), true, `${family}/${reason} should recall numeric body 23 into its stable specimen orb`);
    const orb = captureOrbFromInventorySlot(engine.inventory[0])!;
    assert.equal(orb.creature!.entityId, metadata.entityId); assert.equal(orb.creature!.geneticSeed, metadata.geneticSeed);
    assert.equal(orb.attunement!.activeEntityId, null); assert.equal(orb.attunement!.recallCount, 1);
    assert.equal(orb.creature!.health, reason === "fainted" ? 0 : 5); assert.equal(orb.attunement!.fainted, reason === "fainted");
    assert.equal(engine.mobs.length, 0);
    if (family === "prime") {
      const after = engine.primeEncounters.get(anchor)!;
      assert.equal(after.entityId, null); assert.equal(after.custodyId, "orb:recall-orb");
      assert.equal(after.firstActivatedAt, prime.firstActivatedAt); assert.equal(after.specimenId, metadata.entityId);
    }
    if (family === "legendary") {
      const after = engine.legendaryEncounters.get(site)!;
      assert.equal(after.custodyEntityId, "orb:recall-orb"); assert.equal(after.revision, legendary.revision + 1);
      assert.deepEqual(after.objectiveProgress, legendary.objectiveProgress); assert.equal(after.uniqueResolutionToken, legendary.uniqueResolutionToken);
    }
  }
});

test("wrong live identity or stale encounter ownership refuses recall before inventory, body, history or effects change", () => {
  for (const fault of ["body", "specimen", "seed", "kind", "prime", "legendary", "missing-prime", "missing-legendary", "guest", "stale-host", "removed"] as const) {
    const family = fault.includes("prime") ? "prime" : fault.includes("legendary") ? "legendary" : "ordinary";
    const { engine, mob, effects, anchor, site, metadata } = fixture(family);
    if (fault === "body") mob.id = 24;
    if (fault === "specimen") Object.assign(engine, { creatureMetadataForMob: () => ({ ...metadata, entityId: "other-specimen" }) });
    if (fault === "seed") Object.assign(engine, { creatureMetadataForMob: () => ({ ...metadata, geneticSeed: 999 }) });
    if (fault === "kind") Object.assign(engine, { creatureMetadataForMob: () => ({ ...metadata, kind: "peelop" }) });
    if (fault === "prime") engine.primeEncounters.set(anchor, { ...engine.primeEncounters.get(anchor)!, custodyId: "orb:other" });
    if (fault === "legendary") engine.legendaryEncounters.set(site, { ...engine.legendaryEncounters.get(site)!, custodyEntityId: "creature:999" });
    if (fault === "missing-prime") engine.primeEncounters.clear();
    if (fault === "missing-legendary") engine.legendaryEncounters.clear();
    if (fault === "guest") Object.assign(engine, { multiplayer: { role: "guest", state: "connected" } });
    if (fault === "stale-host") Object.assign(engine, { multiplayer: { role: "host", state: "disconnected" } });
    if (fault === "removed") engine.mobs = [];
    const before = canonicalJson({ inventory: engine.inventory, prime: Object.fromEntries(engine.primeEncounters), legendary: Object.fromEntries(engine.legendaryEncounters) });
    assert.equal(engine.recallAttunedMob(mob, "manual"), false, fault);
    assert.equal(canonicalJson({ inventory: engine.inventory, prime: Object.fromEntries(engine.primeEncounters), legendary: Object.fromEntries(engine.legendaryEncounters) }), before);
    assert.equal(engine.mobs[0], fault === "removed" ? undefined : mob); assert.deepEqual(effects, []);
  }
});

function guestFixture(family: "ordinary" | "prime" | "legendary") {
  const base = fixture(family), { engine, effects } = base;
  const player = normalizeMultiplayerPlayerState({ inventory: engine.inventory, selected: 0 }, "keeper");
  const responses: CreatureAction[] = [];
  Object.assign(engine, {
    inventory: [null],
    multiplayer: { role: "host", state: "hosting", sendCreatureAction: (action: CreatureAction) => { responses.push(action); return 1; } },
    remotePlayers: new Map([["keeper", { target: { x: 0, y: 30, z: 0 } }]]),
    multiplayerPlayerStates: new Map([["keeper", player]]),
    queueCriticalReliableRequest: (_key: string, send: () => number) => { send(); return true; },
    sendMobSnapshotsToConnectedPeers: () => effects.push("mob-frame"),
    sendAuthoritativePlayerState: () => effects.push("player-frame"),
  });
  const invoke = () => (engine as unknown as { handleRemoteCreatureAction(action: CreatureAction, peer: unknown): void })
    .handleRemoteCreatureAction({ requestId: "recall-request", actorId: "keeper", tick: 1, kind: "recall", targetId: 23, status: "request" },
      { identity: { id: "keeper", name: "Keeper", color: "#fff" } });
  return { ...base, player, responses, invoke };
}

test("actual host-served guest recall binds the live ID and preserves current encounter custody", () => {
  for (const family of ["ordinary", "prime", "legendary"] as const) {
    const { engine, player, responses, invoke, metadata, anchor, site, legendary } = guestFixture(family);
    const hostInventory = canonicalJson(engine.inventory);
    invoke();
    assert.equal(responses.at(-1)?.status, "accepted", `${family}: valid guest recall must accept numeric body23`);
    const after = engine.multiplayerPlayerStates.get("keeper")!;
    const orb = captureOrbFromInventorySlot(after.inventory[0])!;
    assert.equal(after.revision, player.revision + 1);
    assert.equal(orb.creature!.entityId, metadata.entityId); assert.equal(orb.creature!.geneticSeed, metadata.geneticSeed);
    assert.equal(orb.attunement!.activeEntityId, null); assert.equal(orb.attunement!.recallCount, 1);
    assert.equal(engine.mobs.length, 0); assert.equal(canonicalJson(engine.inventory), hostInventory);
    if (family === "prime") assert.equal(engine.primeEncounters.get(anchor)!.entityId, null);
    if (family === "legendary") {
      assert.equal(engine.legendaryEncounters.get(site)!.custodyEntityId, "orb:recall-orb");
      assert.equal(engine.legendaryEncounters.get(site)!.uniqueResolutionToken, legendary.uniqueResolutionToken);
    }
  }
});

test("actual host-served guest recall rejects wrong identities and stale encounters without custody or effects changing", () => {
  for (const fault of ["body", "specimen", "seed", "kind", "owner", "prime", "legendary", "missing-prime", "missing-legendary", "removed"] as const) {
    const family = fault.includes("prime") ? "prime" : fault.includes("legendary") ? "legendary" : "ordinary";
    const { engine, mob, effects, metadata, anchor, site, player, invoke, responses } = guestFixture(family);
    if (fault === "body") mob.id = 24;
    if (fault === "specimen") Object.assign(engine, { creatureMetadataForMob: () => ({ ...metadata, entityId: "other-specimen" }) });
    if (fault === "seed") Object.assign(engine, { creatureMetadataForMob: () => ({ ...metadata, geneticSeed: 999 }) });
    if (fault === "kind") Object.assign(engine, { creatureMetadataForMob: () => ({ ...metadata, kind: "peelop" }) });
    if (fault === "owner") {
      const orb = captureOrbFromInventorySlot(player.inventory[0])!;
      engine.multiplayerPlayerStates.set("keeper", normalizeMultiplayerPlayerState({ ...player,
        inventory: [captureOrbInventorySlot({ ...orb, attunement: { ...orb.attunement!, ownerId: "other" } })] }, "keeper"));
    }
    if (fault === "prime") engine.primeEncounters.set(anchor, { ...engine.primeEncounters.get(anchor)!, custodyId: "orb:other" });
    if (fault === "legendary") engine.legendaryEncounters.set(site, { ...engine.legendaryEncounters.get(site)!, custodyEntityId: "creature:999" });
    if (fault === "missing-prime") engine.primeEncounters.clear();
    if (fault === "missing-legendary") engine.legendaryEncounters.clear();
    if (fault === "removed") engine.mobs = [];
    const state = () => canonicalJson({ player: engine.multiplayerPlayerStates.get("keeper"), host: engine.inventory,
      prime: Object.fromEntries(engine.primeEncounters), legendary: Object.fromEntries(engine.legendaryEncounters) });
    const before = state(); invoke();
    assert.equal(responses.at(-1)?.status, "rejected", fault); assert.equal(state(), before, fault);
    assert.equal(engine.mobs[0], fault === "removed" ? undefined : mob); assert.deepEqual(effects, []);
  }
});
