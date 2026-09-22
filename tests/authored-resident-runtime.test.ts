import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine } from "../app/game/engine";
import { GUILD_RECRUIT_COMPANIONS, ROAD_EVENT_RESIDENTS } from "../app/game/authored-residents";
import { GUILD_NPCS, createGuildBook } from "../app/game/guilds";
import { planRoadEvent, type RoadEventState } from "../app/game/surface-roads";
import { MOB_DEFS, type MobKind } from "../app/game/mobs";
import { BlockId } from "../app/game/data";

test("actual road runtime retains spawn order, options and once-only canonical event history", () => {
  const anchors = new Map<RoadEventState["kind"], string>();
  for (let i = 0; i < 3000 && anchors.size < 7; i++) {
    const id = `surface-road:a<->b:${i}`, event = planRoadEvent("resident-runtime", id, 7, 2);
    if (!anchors.has(event.kind)) anchors.set(event.kind, id);
  }
  assert.equal(anchors.size, 7);
  for (const [eventKind, anchorId] of anchors) {
    const spawned: { kind: MobKind; position: THREE.Vector3; options: Record<string, unknown>; hostile: boolean; group: { userData: Record<string, unknown> } }[] = [];
    const engine = Object.assign(Object.create(VoxelEngine.prototype), {
      multiplayer: null, position: new THREE.Vector3(0, 40, 0), mobs: [], day: 7, roadEvents: new Map(),
      world: { seedText: "resident-runtime", structureMarkers: new Map([[anchorId,
        { type: "landmark", tag: "surface-road:fixture", position: { x: 0, y: 40, z: 0 } }]]), findWalkableY: () => 40 },
      spawnMob: (kind: MobKind, position: THREE.Vector3, options: Record<string, unknown>) => {
        const mob = { kind, position, options, hostile: false, group: { userData: {} } }; spawned.push(mob); return mob;
      }, events: { onToast: () => undefined }, dispatchGuildEvent: () => undefined, saveSoon: () => undefined,
    }) as VoxelEngine;
    const runtime = engine as unknown as { triggerNearbyRoadEvent(): boolean };
    assert.equal(runtime.triggerNearbyRoadEvent(), eventKind !== "quiet");
    assert.deepEqual([...engine.roadEvents], [[anchorId, planRoadEvent("resident-runtime", anchorId, 7, 2)]]);
    assert.equal(spawned.length, ROAD_EVENT_RESIDENTS[eventKind].length);
    ROAD_EVENT_RESIDENTS[eventKind].forEach((expected, i) => {
      assert.equal(spawned[i].kind, expected.kind); assert.equal(spawned[i].hostile, expected.hostile ?? false);
      assert.deepEqual(spawned[i].position.toArray(), [3, 40 + MOB_DEFS[expected.kind].footOffset, 3]);
      assert.deepEqual(spawned[i].options, { newSpecimen: true, name: expected.name, factionId: expected.factionId ?? null,
        profession: expected.profession ?? null, residentId: `road-event:${anchorId}`, persistentPoiResident: false });
      assert.deepEqual(spawned[i].group.userData, { roadEventId: anchorId });
    });
    assert.equal(runtime.triggerNearbyRoadEvent(), false); assert.equal(spawned.length, ROAD_EVENT_RESIDENTS[eventKind].length);
  }
});

test("actual guild recruitment retains all authored companions and records history without duplicate recruitment", () => {
  for (const npc of GUILD_NPCS.filter(value => value.recruitable)) {
    const spawned: { kind: MobKind; position: THREE.Vector3; options: Record<string, unknown> }[] = [];
    const principal = { group: { position: new THREE.Vector3(0, 40, 0), userData: {} }, angle: 0, hiredByPlayerId: null };
    const engine = Object.assign(Object.create(VoxelEngine.prototype), {
      multiplayer: null, activeSentient: principal, mobs: [], guildBook: createGuildBook(),
      guildNpcForMob: () => npc, guildRecruitReady: () => true,
      world: { surfaceAt: () => 40, getBlock: () => BlockId.Water },
      spawnMob: (kind: MobKind, position: THREE.Vector3, options: Record<string, unknown>) => { spawned.push({ kind, position, options }); },
      events: { onToast: () => undefined }, audio: { play: () => undefined }, saveSoon: () => undefined, emitHud: () => undefined,
    }) as VoxelEngine;
    assert.equal(engine.recruitGuildNpc(npc.id), true);
    assert.ok(engine.guildBook.guilds[npc.guildId].serviceFlags.includes(`recruit:${npc.id}`));
    assert.equal(principal.hiredByPlayerId, "local");
    const companion = GUILD_RECRUIT_COMPANIONS[npc.id];
    assert.equal(spawned.length, companion ? 1 : 0);
    if (companion) {
      assert.equal(spawned[0].kind, companion.kind);
      assert.deepEqual(spawned[0].options, { name: companion.name, residentId: `guild-companion:${npc.id}`, persistentPoiResident: true,
        aligned: true, factionId: "player", hiredByPlayerId: "local", creatureTamed: true, creatureOwnerId: "local", progression: { bondPoints: 90 } });
    }
    assert.equal(engine.recruitGuildNpc(npc.id), true); assert.equal(spawned.length, companion ? 1 : 0);
  }
});

test("guest runtime cannot create road or guild history or spawn either resident family", () => {
  const engine = Object.assign(Object.create(VoxelEngine.prototype), { multiplayer: { role: "guest" },
    events: { onToast: () => undefined } }) as VoxelEngine;
  assert.equal(engine.recruitGuildNpc("pella-reedshoe"), false);
  assert.equal((engine as unknown as { triggerNearbyRoadEvent(): boolean }).triggerNearbyRoadEvent(), false);
});
