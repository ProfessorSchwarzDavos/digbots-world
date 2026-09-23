import assert from "node:assert/strict";
import test from "node:test";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { selectUniverseGuildResidentHistory } from "../app/game/universe-resident-history";
import { GUILD_RECRUIT_COMPANIONS } from "../app/game/authored-residents";
import { createGuildBook, recordGuildServiceFlag } from "../app/game/guilds";
import { homeLocation, locationAddress, locationId, universeId } from "../app/game/location-address";
import type { UniverseSnapshot } from "../app/game/universe-storage";
import type { SavedCreature } from "../app/game/engine";

const universe = universeId("guild-source-history"), home = locationId(homeLocation(universe));
const orbitAddress = locationAddress({ ...homeLocation(universe), kind: "orbit", instanceId: "low" });
const orbit = locationId(orbitAddress), registry = createAsteroidRegistry(orbitAddress, 773);
const npcId = "pella-reedshoe", kind = GUILD_RECRUIT_COMPANIONS[npcId].kind;
const recruited = () => recordGuildServiceFlag(createGuildBook(), "waykeeper", `recruit:${npcId}`);
const body = (id: number): SavedCreature => ({ id, kind, x: 0, y: 32, z: 0, yaw: 0, health: 5, age: 20,
  residentId: `guild-companion:${npcId}`, persistentPoiResident: true });
function snapshot(hostBook: unknown, guestBook: unknown = undefined): UniverseSnapshot {
  return { manifest: { id: universe, universeId: universe, deletedAt: null, currentLocationId: orbit, currentPlayerId: "host" },
    universe: { fields: { asteroidFields: { schema: 1, fields: { [orbit]: registry } } } },
    players: [{ playerId: "host", locationId: orbit, fields: { guildBook: hostBook } },
      { playerId: "guest", locationId: home, fields: guestBook === undefined ? {} : { guildBook: guestBook } }],
    locations: [{ descriptor: { id: orbit, universeId: universe }, fields: {} },
      { descriptor: { id: home, universeId: universe }, fields: {} }],
  } as unknown as UniverseSnapshot;
}
const live = (guildBook = recruited()) => ({ locationId: orbit, playerId: "host", guildBook });

test("current companion resolves its unique player book, not the body's location or hired actor", () => {
  const current = { ...body(1), hiredByPlayerId: "guest" };
  const source = snapshot(createGuildBook());
  const before = structuredClone(source);
  const result = selectUniverseGuildResidentHistory(source, live(), [current]);
  assert.deepEqual(result.dependencies, [{ kind: "guild-companion", id: npcId, attached: null }]);
  assert.deepEqual(result.origins, [{ id: npcId, playerId: "host" }]);
  assert.deepEqual(source, before);
});

test("a remote player book may own current companion history but cannot double-own it", () => {
  const source = snapshot(createGuildBook(), recruited());
  assert.deepEqual(selectUniverseGuildResidentHistory(source, live(createGuildBook()), [body(1)]).origins,
    [{ id: npcId, playerId: "guest" }]);
  assert.throws(() => selectUniverseGuildResidentHistory(snapshot(recruited(), recruited()), live(), [body(1)]),
    /Ambiguous guild-companion history/);
  assert.throws(() => selectUniverseGuildResidentHistory(snapshot(createGuildBook()), live(createGuildBook()), [body(1)]),
    /Unresolved source-qualified guild-companion history/);
});

test("saved current recruit cannot disappear; a second remote body exceeds authored multiplicity", () => {
  assert.throws(() => selectUniverseGuildResidentHistory(snapshot(recruited()), live(createGuildBook()), [body(1)]),
    /Saved guild-companion recruit provenance/);
  const source = snapshot(recruited());
  (source.locations[1].fields as Record<string, unknown>).creatures = [body(2)];
  assert.throws(() => selectUniverseGuildResidentHistory(source, live(), [body(1)]),
    /Unresolved canonical guild-companion resident/);
});

test("unknown or malformed player books cannot qualify a companion", () => {
  const source = snapshot({ ...recruited(), futureOwner: "unreviewed" });
  assert.throws(() => selectUniverseGuildResidentHistory(source, live(), [body(1)]), /unsupported|Invalid/);
  const invalid = snapshot(createGuildBook(), { ...recruited(), revision: -1 });
  assert.throws(() => selectUniverseGuildResidentHistory(invalid, live(createGuildBook()), [body(1)]), /Invalid|normalization/);
});
