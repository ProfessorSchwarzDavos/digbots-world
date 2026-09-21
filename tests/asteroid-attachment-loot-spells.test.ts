import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame, asteroidAttachmentPhysicalBounds } from "../app/game/asteroid-attachment-frame";
import { projectAsteroidLoot, captureAsteroidLoot, projectAsteroidSpells, captureAsteroidSpells, asteroidTidemendSiteKey } from "../app/game/asteroid-attachment-loot-spells";
import type { ContextualLootWorldState } from "../app/game/contextual-loot";
import type { WorldSave } from "../app/game/engine";
import type { AttachmentActorBody } from "../app/game/attachment-actor-bodies";
import { humanBodyBounds } from "../app/game/player-body";
import { tidemendSiteKeyAt } from "../app/game/magic";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { canonicalJson } from "../app/game/universe-json";

const orbit = locationAddress({ ...homeLocation(universeId("loot-spell-selection")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const point = { x: frame.offset.x + .125, y: 32.1, z: frame.offset.z - .375 };
const key = (x: number) => `${frame.offset.x + x},32,${frame.offset.z}`;
function human(outside = false): AttachmentActorBody {
  const position = { ...point, x: point.x + (outside ? 80 : 0) };
  return { id: "host", kind: "human", position, bounds: humanBodyBounds(position, { variant: "female", race: "dwarf", crouching: true }),
    connectionId: null, poseTick: null, agentUpdatedAt: null, boatId: null, boatSeat: null, mountedCreatureId: null, mountedCreatureSeat: null };
}
function loot(): ContextualLootWorldState {
  const record = { generatorVersion: 2, familyId: "prospector" as const, ownership: "private" as const, theft: true, theftReported: false };
  return { schema: 1, acquiredUniqueIds: ["old-one", "old-two"], containers: { [key(80)]: { ...record }, [key(0)]: { ...record }, [key(-80)]: { ...record } } };
}
type SpellRecords = NonNullable<WorldSave["spellWorldState"]>;
function spells(): SpellRecords {
  const b = asteroidAttachmentPhysicalBounds(frame, "orbit");
  return { schema: 1, ironwakeWard: { fragments: 3, expiresAt: 178.125 }, tidemendSites: {
    [tidemendSiteKeyAt(point.x, point.z)]: 244.333,
    [tidemendSiteKeyAt(b.minX, b.minZ)]: 177.125,
    [tidemendSiteKeyAt(point.x + 200, point.z + 200)]: 912.75,
  } };
}

test("loot container coordinates move while global unique reward history and outside records remain exact across cold cycles", () => {
  const original = loot(), projected = projectAsteroidLoot(frame, original);
  assert.deepEqual(Object.keys(projected.containers), [`0,${32 - frame.offset.y},0`]);
  assert.deepEqual(projected.acquiredUniqueIds, original.acquiredUniqueIds);
  let current = structuredClone(original);
  for (let i = 0; i < 100; i++) {
    const baseline = projectAsteroidLoot(frame, current);
    current = JSON.parse(JSON.stringify(captureAsteroidLoot(frame, current, baseline, JSON.parse(JSON.stringify(baseline)))));
  }
  assert.equal(canonicalJson(current), canonicalJson(original));
  const localKey = Object.keys(projected.containers)[0];
  const result = captureAsteroidLoot(frame, original, projected, { ...projected, acquiredUniqueIds: [...projected.acquiredUniqueIds, "new-reward"],
    containers: { [localKey]: { ...projected.containers[localKey], theftReported: true } } });
  assert.equal(result.containers[key(0)].theftReported, true);
  assert.deepEqual(result.containers[key(80)], original.containers[key(80)]);
  assert.deepEqual(result.acquiredUniqueIds, ["old-one", "old-two", "new-reward"]);
  Object.assign(result.containers[key(80)], { theftReported: true }); assert.equal(original.containers[key(80)].theftReported, false);
});

test("loot rejects lossy normalization, unknown fields, stale state and unique-history deletion/reorder", () => {
  const input = loot(), baseline = projectAsteroidLoot(frame, input);
  for (const acquiredUniqueIds of [["old-two"], ["old-two", "old-one"], ["old-one", "old-two", "old-two"]])
    assert.throws(() => captureAsteroidLoot(frame, input, baseline, { ...baseline, acquiredUniqueIds }));
  for (const invalid of [{ ...input, future: 1 }, { ...input, containers: { ...input.containers, [key(80)]: { ...input.containers[key(80)], future: 1 } } },
    { ...input, containers: { ...input.containers, [key(80)]: { ...input.containers[key(80)], generatorVersion: 2.5 } } },
    { ...input, acquiredUniqueIds: Array.from({ length: 513 }, (_, i) => `reward-${i}`) }])
    assert.throws(() => projectAsteroidLoot(frame, invalid));
  assert.throws(() => captureAsteroidLoot(frame, input, { ...baseline, acquiredUniqueIds: [] }, baseline), /Stale/);
  assert.throws(() => captureAsteroidLoot(frame, input, baseline, { ...baseline,
    containers: { "1000,32,1000": Object.values(baseline.containers)[0] } }), /outside/);
});

test("Tidemend queries retain original 16-block region keys at negative borders, every local quadrant and every generated frame", () => {
  for (const entry of registry.asteroids) {
    const f = createAsteroidAttachmentFrame(registry, entry.descriptor.id), b = asteroidAttachmentPhysicalBounds(f, "local");
    for (const x of [b.minX, -32, -16.1, -16, -.1, 0, 16, b.maxX - .001]) for (const z of [b.minZ, -16, 0, 16, b.maxZ - .001]) {
      const expected = tidemendSiteKeyAt(x + f.offset.x, z + f.offset.z);
      assert.equal(asteroidTidemendSiteKey(f, x, z, "local"), expected);
      assert.equal(asteroidTidemendSiteKey(f, x + f.offset.x, z + f.offset.z, "orbit"), expected);
    }
    assert.throws(() => asteroidTidemendSiteKey(f, b.maxX, 0, "local"), /outside/);
  }
});

test("spell cold capture preserves absent/null distinctions, exact deadlines and the local human's finite ward", () => {
  const actor = human();
  for (const original of [{ schema: 1 } as SpellRecords, { schema: 1, ironwakeWard: null, tidemendSites: {} } as SpellRecords, spells()]) {
    let current = structuredClone(original);
    for (let i = 0; i < 100; i++) {
      const baseline = projectAsteroidSpells(frame, current, actor);
      current = JSON.parse(JSON.stringify(captureAsteroidSpells(frame, current, baseline,
        JSON.parse(JSON.stringify(baseline)), { before: actor, after: actor })));
    }
    assert.equal(canonicalJson(current), canonicalJson(original));
  }
  const input = spells(), baseline = projectAsteroidSpells(frame, input, actor), selected = Object.keys(baseline.fields.tidemendSites!)[0];
  assert.equal(baseline.wardActorId, "host"); assert.equal(Object.keys(baseline.fields.tidemendSites!).length, 2);
  const edited = { ...baseline, fields: { ...baseline.fields, ironwakeWard: { fragments: 2, expiresAt: 178.125 },
    tidemendSites: { ...baseline.fields.tidemendSites, [selected]: 400 } } };
  const output = captureAsteroidSpells(frame, input, baseline, edited, { before: actor, after: actor });
  assert.equal(output.ironwakeWard!.fragments, 2); assert.equal(output.tidemendSites![selected], 400);
  for (const key of Object.keys(input.tidemendSites!).filter(key => key !== selected)) assert.equal(output.tidemendSites![key], input.tidemendSites![key]);
  assert.equal(input.ironwakeWard!.fragments, 3);
  const cleared = captureAsteroidSpells(frame, input, baseline, { ...baseline, fields: { ...baseline.fields, ironwakeWard: null } }, { before: actor, after: actor });
  assert.equal(cleared.ironwakeWard, null);
});

test("an outside local human retains its ward in the canonical owner and cannot grant a copy to an agent view", () => {
  const input = spells(), actor = human(true), baseline = projectAsteroidSpells(frame, input, actor);
  assert.equal(baseline.wardActorId, null); assert.equal("ironwakeWard" in baseline.fields, false);
  assert.deepEqual(captureAsteroidSpells(frame, input, baseline, baseline, { before: actor, after: actor }), input);
  assert.throws(() => captureAsteroidSpells(frame, input, baseline, { ...baseline, fields: { ...baseline.fields, ironwakeWard: input.ironwakeWard } },
    { before: actor, after: actor }), /outside local human/);
  assert.throws(() => projectAsteroidSpells(frame, input, { ...actor, kind: "drone" }), /local human/);
});

test("spell capture rejects stale human bindings, reconnects, frame crossings, timer rewind/deletion and malformed state", () => {
  const input = spells(), actor = human(), baseline = projectAsteroidSpells(frame, input, actor), fields = baseline.fields;
  for (const after of [human(true), { ...actor, id: "new-host" }, { ...actor, connectionId: "new" }])
    assert.throws(() => captureAsteroidSpells(frame, input, baseline, baseline, { before: actor, after }), /membership/);
  assert.throws(() => captureAsteroidSpells(frame, input, baseline, baseline, { before: { ...actor, poseTick: 2 }, after: actor }), /Stale/);
  assert.throws(() => captureAsteroidSpells(frame, input, baseline, { ...baseline, actorBaseline: "forged" }, { before: actor, after: actor }), /binding/);
  const selected = Object.keys(fields.tidemendSites!)[0];
  const changes: SpellRecords[] = [
    { schema: 1, tidemendSites: fields.tidemendSites }, { schema: 1, ironwakeWard: fields.ironwakeWard },
    { ...fields, tidemendSites: {} }, { ...fields, tidemendSites: { ...fields.tidemendSites, [selected]: 0 } },
    { ...fields, tidemendSites: input.tidemendSites }, { ...fields, ironwakeWard: { fragments: 7, expiresAt: 10 } },
    { ...fields, ironwakeWard: { fragments: 1.5, expiresAt: 10 } }, { ...fields, tidemendSites: { "01,0": 10 } },
  ];
  for (const changed of changes) assert.throws(() => captureAsteroidSpells(frame, input, baseline, { ...baseline, fields: changed }, { before: actor, after: actor }));
  for (const invalid of [{ ...input, future: 1 }, { ...input, ironwakeWard: { ...input.ironwakeWard!, future: 1 } },
    { ...input, tidemendSites: { "0,0": Infinity } }, { ...input, tidemendSites: Object.fromEntries(Array.from({ length: 513 }, (_, i) => [`${i},0`, 10])) }])
    assert.throws(() => projectAsteroidSpells(frame, invalid, actor));
});
