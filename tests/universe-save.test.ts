import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import type { WorldSave } from "../app/game/engine.ts";
import { composeUniverseSave, splitUniverseSave, WORLD_SAVE_OWNERS } from "../app/game/universe-save.ts";

const minimal = (): WorldSave => ({ version: 2, generatorVersion: 18, seed: "CF1", mode: "builder", edits: {}, player: { x: -17, y: 33, z: 0, yaw: 0, pitch: 0 }, spawn: { x: -17, y: 33, z: 0 }, inventory: [], selected: 0, health: 10, hunger: 10, xp: 0, level: 0, time: 0.32, day: 1, weather: "clear", furnaces: {}, chests: {}, savedAt: 1 });

test("every WorldSave field has exactly one explicit owner, checked against source AST", () => {
  const source = ts.createSourceFile("engine.ts", readFileSync("app/game/engine.ts", "utf8"), ts.ScriptTarget.Latest, true);
  const type = source.statements.find((node) => ts.isTypeAliasDeclaration(node) && node.name.text === "WorldSave") as ts.TypeAliasDeclaration;
  assert.ok(type && ts.isTypeLiteralNode(type.type));
  const fields = type.type.members.map((member) => member.name!.getText(source)).sort();
  assert.deepEqual(Object.keys(WORLD_SAVE_OWNERS).sort(), fields);
  assert.equal(fields.length, 92);
});

test("all optional fields, absent/null/empty and unknown metadata survive partition round trips", () => {
  const save = minimal() as WorldSave & Record<string, unknown>;
  for (const key of Object.keys(WORLD_SAVE_OWNERS)) if (!Object.hasOwn(save, key)) save[key] = { syntheticField: key, nested: [null, [], { unicode: "雪", negative: -16 }] };
  save.agentCustody = { schema: 1, agents: {} };
  save.universeTimeSeconds = 1234.5;
  save.locationPlayerState = { schema: 1, creativeFlying: false, boatId: null, creatureId: null, creatureSeat: null };
  save.multiplayerProgressions = {};
  save.futureLegacyMetadata = { keep: [1, null, "exact"] };
  const partitioned = splitUniverseSave(save);
  assert.deepEqual(composeUniverseSave(partitioned), save);
  assert.deepEqual(composeUniverseSave(splitUniverseSave(minimal())), minimal());
  const changed = splitUniverseSave({ ...minimal(), inventory: [null], cursor: null, craftGrid: [] });
  assert.equal(composeUniverseSave(changed).cursor, null);
  assert.deepEqual(composeUniverseSave(changed).craftGrid, []);
  assert.throws(() => composeUniverseSave({ ...changed, location: { ...changed.location, inventory: [] } }));
});

test("same-coordinate location payloads have independent mutable copies", () => {
  const source = minimal(); source.chests["-17,33,0"] = [null];
  const a = splitUniverseSave(source), b = splitUniverseSave(source);
  const restored = composeUniverseSave(a);
  restored.chests["-17,33,0"].push(null);
  assert.equal(composeUniverseSave(b).chests["-17,33,0"].length, 1);
  assert.equal(source.chests["-17,33,0"].length, 1);
});

test("universe clock survives location composition and fails closed on invalid time", () => {
  const origin = splitUniverseSave({ ...minimal(), universeTimeSeconds: 12345.5 });
  const target = splitUniverseSave({ ...minimal(), universeTimeSeconds: 1, time: .8, day: 5 });
  assert.equal(composeUniverseSave({ ...origin, location: target.location }).universeTimeSeconds, 12345.5);
  for (const value of [-1, "42", null]) {
    assert.throws(() => composeUniverseSave({ ...origin, universe: { ...origin.universe, universeTimeSeconds: value } }));
  }
});

test("guest journals follow the universe but maps and respawns stay with their location", () => {
  const a = minimal(), b = minimal();
  a.multiplayerProgressions = { guest: { revision: 4, state: { questBook: { preserved: true }, mapKnowledge: { worldId: "A", markers: ["same-marker"] }, respawn: { x: -17, y: 33, z: 0 } } } } as never;
  b.multiplayerProgressions = { guest: { revision: 2, state: { questBook: {}, mapKnowledge: { worldId: "B", markers: ["different-marker"] }, respawn: { x: 44, y: 33, z: 0 } } } } as never;
  const origin = splitUniverseSave(a), target = splitUniverseSave(b);
  assert.deepEqual(composeUniverseSave(origin), a);
  const moved = composeUniverseSave({ ...origin, location: target.location });
  assert.deepEqual(moved.multiplayerProgressions!.guest.state.questBook, { preserved: true });
  assert.deepEqual(moved.multiplayerProgressions!.guest.state.mapKnowledge, { worldId: "B", markers: ["different-marker"] });
  assert.equal(moved.multiplayerProgressions!.guest.state.respawn!.x, 44);
  assert.throws(() => composeUniverseSave({ ...origin, universe: { ...origin.universe, multiplayerProgressions: a.multiplayerProgressions } }));
});
