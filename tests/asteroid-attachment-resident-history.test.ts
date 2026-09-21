import assert from "node:assert/strict";
import test from "node:test";
import { GUILD_RECRUIT_COMPANIONS, ROAD_EVENT_RESIDENTS, historicalResidentReference } from "../app/game/authored-residents";
import { resolveAsteroidResidentHistory, type AsteroidResidentHistorySources } from "../app/game/asteroid-attachment-resident-history";
import { asteroidEntityRelationshipPartition, type AsteroidRelationshipContext, type AsteroidEntityDependency } from "../app/game/asteroid-attachment-relationships";
import { projectAsteroidEntityCollection, captureAsteroidEntityCollection } from "../app/game/asteroid-attachment-entity-selection";
import { GUILD_NPCS, createGuildBook, recordGuildServiceFlag } from "../app/game/guilds";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { humanBodyBounds } from "../app/game/player-body";
import { canonicalJson } from "../app/game/universe-json";
import type { SavedCreature } from "../app/game/engine";
import type { RoadEventState } from "../app/game/surface-roads";
import type { AsteroidAttachedEntities } from "../app/game/asteroid-attachment-entities";

const orbit = locationAddress({ ...homeLocation(universeId("resident-history")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const point = { x: frame.offset.x + .125, y: frame.offset.y + 32.1, z: frame.offset.z - .375 };
const creature = (id = 1, x = 0, kind: SavedCreature["kind"] = "thimbledeer"): SavedCreature => ({ id, specimenId: `specimen-${id}`,
  kind, ...point, x: point.x + x, yaw: 0, health: 5, age: 42, residentId: "road-event:opaque:anchor:12,-500" });
const records = (creatures: SavedCreature[], sleepingCreatures: SavedCreature[] = []): AsteroidAttachedEntities => ({ creatures, sleepingCreatures, boats: [], drops: [], leads: [] });
const road = (kind: RoadEventState["kind"] = "creature-crossing"): RoadEventState => ({ schema: 1, anchorId: "opaque:anchor:12,-500",
  kind, status: kind === "quiet" ? "quiet" : "triggered", triggeredDay: 7, revision: kind === "quiet" ? 0 : 1 });
function sources(kind: RoadEventState["kind"] = "creature-crossing"): AsteroidResidentHistorySources {
  return { roadEvents: { [road(kind).anchorId]: road(kind) }, guildBook: structuredClone(createGuildBook()) };
}
function context(input: AsteroidAttachedEntities, source = sources()): AsteroidRelationshipContext {
  return { localActorId: "host", dependencies: resolveAsteroidResidentHistory([...input.creatures, ...input.sleepingCreatures], source),
    actors: [0, 80].map(x => { const position = { ...point, x: point.x + x }; return { id: x ? "outside" : "host", position,
      bounds: humanBodyBounds(position, { variant: "female", race: "wayfarer", crouching: false }), mountedCreatureId: null, followingCreatureIds: [] }; }) };
}
function rejectsUnchanged(creatures: SavedCreature[], source: AsteroidResidentHistorySources, pattern: RegExp) {
  const before = structuredClone({ creatures, source });
  assert.throws(() => resolveAsteroidResidentHistory(creatures, source), pattern);
  assert.deepEqual({ creatures, source }, before);
}

test("shared authored spawn catalog retains every previous road and companion definition", () => {
  assert.deepEqual(ROAD_EVENT_RESIDENTS, {
    quiet: [], repair: [], ambush: [{ kind: "warg", name: "Roadside Prowler", hostile: true }],
    "creature-crossing": [{ kind: "thimbledeer", name: "Crossing Thimbledeer" }, { kind: "thimbledeer", name: "Crossing Fawn" }],
    caravan: [{ kind: "taffalo", name: "Hearthroad Pack Taffalo" }],
    "lost-traveler": [{ kind: "hobbit-merchant", name: "Lost Wayfarer", factionId: "hobbits", profession: "general" }],
    toll: [{ kind: "goblin-worker", name: "Road Tollkeeper", factionId: "goblins", profession: "general" }],
  });
  assert.deepEqual(GUILD_RECRUIT_COMPANIONS, {
    "pella-reedshoe": { kind: "burrowbell", name: "Button" }, "sela-wakequiet": { kind: "currentweaver-eel", name: "Wakecoil" },
    "bram-coalgrin": { kind: "warg", name: "Toll" }, "hessa-deepnote": { kind: "copper-mole", name: "Pipet" },
    "rowan-mileglass": { kind: "petalfox", name: "Blankmile" }, "taff-ribbons": { kind: "taffy-hound", name: "Knot" },
  });
  for (const [id, companion] of Object.entries(GUILD_RECRUIT_COMPANIONS)) {
    assert.ok(GUILD_NPCS.find(npc => npc.id === id)?.recruitable); assert.ok(Object.isFrozen(companion));
  }
  for (const entries of Object.values(ROAD_EVENT_RESIDENTS)) {
    assert.ok(Object.isFrozen(entries)); for (const entry of entries) assert.ok(Object.isFrozen(entry));
  }
});

test("two crossing deer share canonical history without becoming one physical settlement", () => {
  const input = records([creature()], [creature(2, 80)]), source = sources(), before = structuredClone({ input, source });
  const ctx = context(input, source);
  assert.deepEqual(ctx.dependencies, [{ kind: "road-event", id: "opaque:anchor:12,-500", attached: null }]);
  assert.deepEqual(asteroidEntityRelationshipPartition(frame, input, "orbit", ctx).creatureIds, [1]);
  assert.deepEqual({ input, source }, before);
  const grouped = records([{ ...creature(), socialGroupId: "actual-herd" }], [{ ...creature(2, 80), socialGroupId: "actual-herd" }]);
  assert.throws(() => asteroidEntityRelationshipPartition(frame, grouped, "orbit", context(grouped)), /Social group/);
});

test("all road resident kinds require exact existing event history and authored multiplicity", () => {
  for (const [kind, entries] of Object.entries(ROAD_EVENT_RESIDENTS)) {
    const source = sources(kind as RoadEventState["kind"]);
    const spawned = entries.map((entry, i) => ({ ...creature(i + 1, i * 2, entry.kind), name: "Player renamed this NPC" }));
    if (spawned.length) {
      assert.equal(resolveAsteroidResidentHistory(spawned, source).length, 1);
      rejectsUnchanged([...spawned, { ...spawned[0], id: 99, specimenId: "extra" }], source, /authored spawn/);
      rejectsUnchanged([{ ...spawned[0], kind: "peelop" }], source, /authored spawn/);
    } else rejectsUnchanged([creature()], source, /Unresolved|authored spawn/);
  }
  rejectsUnchanged([creature()], { ...sources(), roadEvents: {} }, /Unresolved/);
  const wrong = sources(); Object.assign(wrong.roadEvents[road().anchorId], { anchorId: "foreign" });
  rejectsUnchanged([creature()], wrong, /normalization/);
});

test("all six companions bind actual recruit history without dragging the guild hall", () => {
  for (const [id, companion] of Object.entries(GUILD_RECRUIT_COMPANIONS)) {
    const npc = GUILD_NPCS.find(entry => entry.id === id)!;
    const source = { ...sources(), guildBook: recordGuildServiceFlag(createGuildBook(), npc.guildId, `recruit:${id}`) };
    const mob = { ...creature(1, 0, companion.kind), residentId: `guild-companion:${id}`, persistentPoiResident: true };
    assert.deepEqual(resolveAsteroidResidentHistory([mob], source), [{ kind: "guild-companion", id, attached: null }]);
    assert.deepEqual(asteroidEntityRelationshipPartition(frame, records([mob]), "orbit", context(records([mob]), source)).creatureIds, [1]);
    rejectsUnchanged([mob], sources(), /Unresolved/);
    rejectsUnchanged([{ ...mob, kind: "peelop" }], source, /Unresolved/);
    rejectsUnchanged([mob, { ...mob, id: 2, specimenId: "duplicate-companion" }], source, /Unresolved/);
  }
});

test("history resolution never waives active owner or actual POI requirements", () => {
  const source = { ...sources(), guildBook: recordGuildServiceFlag(createGuildBook(), "waykeeper", "recruit:pella-reedshoe") };
  const mob = { ...creature(1, 0, "burrowbell"), residentId: "guild-companion:pella-reedshoe", persistentPoiResident: true,
    hiredByPlayerId: "outside", followCommand: "follow" as const };
  const input = records([mob]);
  assert.throws(() => asteroidEntityRelationshipPartition(frame, input, "orbit", context(input, source)), /Configured follower/);
  const held = records([{ ...mob, followCommand: "hold", poiMarkerId: "real-structure" }]);
  assert.throws(() => asteroidEntityRelationshipPartition(frame, held, "orbit", context(held, source)), /Unresolved attachment poi/);
});

test("prefixes and malformed dependency modes cannot assert canonical history", () => {
  for (const id of ["road-event:", "guild-companion: ", "resident", "guild-companion:__proto__", "guild-companion:odelia-fen"])
    rejectsUnchanged([{ ...creature(), residentId: id }], sources(), /Unresolved/);
  assert.deepEqual(historicalResidentReference("road-event:a:b,c"), { kind: "road-event", id: "a:b,c" });
  const input = records([creature()]), ctx = context(input);
  assert.throws(() => asteroidEntityRelationshipPartition(frame, input, "orbit", { ...ctx, dependencies: [] }), /Unresolved/);
  for (const dependency of [{ kind: "road-event", id: road().anchorId, attached: true }, { kind: "poi", id: "site", attached: null }])
    assert.throws(() => asteroidEntityRelationshipPartition(frame, input, "orbit", { ...ctx,
      dependencies: [dependency as AsteroidEntityDependency] }), /Invalid/);
  assert.throws(() => asteroidEntityRelationshipPartition(frame, records([]), "orbit", ctx), /Unmatched/);
});

test("settlement residents still resolve only through their separate whole settlement owner", () => {
  const mob = { ...creature(), settlementId: "actual-settlement" }, input = records([mob]);
  assert.deepEqual(resolveAsteroidResidentHistory([mob], sources()), []);
  assert.throws(() => asteroidEntityRelationshipPartition(frame, input, "orbit", context(input)), /Unresolved attachment settlement/);
});

test("history snapshots reject unknown fields, truncation and malformed canonical books without mutation", () => {
  const variants = [sources(), sources(), sources(), sources(), sources(), sources(), sources()];
  Object.assign(variants[0].roadEvents[road().anchorId], { futureCustody: 1 });
  Object.assign(variants[1].roadEvents[road().anchorId], { triggeredDay: 1.5 });
  Object.assign(variants[2].guildBook, { futureOwner: "missing" });
  Object.assign(variants[3].guildBook.guilds.waykeeper, { serviceFlags: Array.from({ length: 129 }, (_, i) => `history-${i}`) });
  Object.assign(variants[4].guildBook.guilds.waykeeper, { restitutionState: { reason: "fine", progress: .5, futureField: true } });
  Object.assign(variants[5].guildBook.guilds.waykeeper, { objectiveProgress: { unknown: -1 } });
  Object.assign(variants[6].guildBook.guilds.waykeeper, { guildId: "tideglass" });
  for (const variant of variants) rejectsUnchanged([creature()], variant, /unsupported|normalization|Invalid/);
});

test("one hundred cold full-collection captures retain historical IDs and fractional coordinates exactly", () => {
  const initial = records([creature()], [creature(2, 80)]), source = sources(), originalHistory = canonicalJson(source);
  let current = structuredClone(initial);
  for (let i = 0; i < 100; i++) {
    const ctx = context(current, source), baseline = projectAsteroidEntityCollection(frame, current, ctx);
    current = JSON.parse(JSON.stringify(captureAsteroidEntityCollection(frame, current, baseline,
      JSON.parse(JSON.stringify(baseline.entities)), { before: ctx, after: ctx }, [])));
  }
  assert.equal(canonicalJson(current), canonicalJson(initial)); assert.equal(canonicalJson(source), originalHistory);
});
