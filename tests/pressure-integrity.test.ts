import assert from "node:assert/strict";
import test from "node:test";
import { createAirZoneState, totalAirGas } from "../app/game/airzone.ts";
import { createAirZoneWorkerHandler } from "../app/game/airzone-worker-protocol.ts";
import { mixtureForFraction } from "../app/game/pressure-habitat.ts";
import { PRESSURE_INTEGRITY_INTERVAL_MS, PressureTopology } from "../app/game/pressure-topology.ts";

function fixture() {
  const world = { divided: false, loaded: true, reads: 0, audits: 0, posts: 0 };
  const handler = createAirZoneWorkerHandler();
  const topology: PressureTopology = new PressureTopology({
    beforeIntegrityAudit: () => { world.audits++; },
    sectionLoaded: () => world.loaded,
    flagsAt: p => {
      world.reads++;
      if (!world.loaded) return undefined;
      return p.x >= 1 && p.x <= 3 && p.y >= 1 && p.y <= 3 && p.z >= 1 && p.z <= 3
        && !(world.divided && p.x === 2) ? 1 : 0;
    },
  }, "home", 1, message => { world.posts++; topology.receive(handler(message)); });
  topology.setSources(new Map([["a", { x: 1, y: 1, z: 1 }], ["b", { x: 3, y: 1, z: 1 }]]), new Map(), "0,0");
  for (let i = 0; i < 20; i++) topology.pump(i * 20);
  const zone = [...topology.zones.values()][0];
  topology.replace(createAirZoneState(topology.topologies.get(zone.zoneId)!, mixtureForFraction(27000)));
  return { world, topology };
}

test("integrity audit is infrequent, bounded and does not interrupt unchanged rooms", () => {
  const { world, topology } = fixture(), posts = world.posts, revision = topology.revision;
  const status = [...topology.zones.values()][0].status;
  world.reads = 0;
  for (let t = 1000; t < PRESSURE_INTEGRITY_INTERVAL_MS; t += 1000) topology.pump(t);
  assert.equal(world.reads, 0); assert.equal(world.audits, 0);
  topology.pump(PRESSURE_INTEGRITY_INTERVAL_MS + 1000);
  assert.equal(world.audits, 1); assert.equal(world.reads, 4096);
  assert.equal(world.posts, posts); assert.equal(topology.revision, revision);
  assert.equal([...topology.zones.values()][0].status, status);
  assert.equal(totalAirGas([...topology.zones.values()][0]), 27000);
});

test("missed wall edit is eventually discovered with exact split and displaced-gas custody", () => {
  const { world, topology } = fixture();
  world.divided = true; // Deliberately no invalidate call.
  for (let i = 0; i < 50; i++) topology.pump(PRESSURE_INTEGRITY_INTERVAL_MS + 1000 + i * 20);
  assert.equal(world.audits, 1); assert.equal(topology.zones.size, 2);
  assert.equal([...topology.zones.values()].reduce((sum, zone) => sum + totalAirGas(zone), 0) + totalAirGas(topology.lost), 27000);
  assert.equal(totalAirGas(topology.lost), 9000);
});

test("missed unload fails closed without losing the previous finite gas authority", () => {
  const { world, topology } = fixture(); world.loaded = false;
  for (let i = 0; i < 5; i++) topology.pump(PRESSURE_INTEGRITY_INTERVAL_MS + 1000 + i * 20);
  const zone = [...topology.zones.values()][0];
  assert.equal(zone.status, "unknown"); assert.equal(totalAirGas(zone), 27000);
  const posts = world.posts;
  for (let i = 0; i < 100; i++) topology.pump(PRESSURE_INTEGRITY_INTERVAL_MS + 2000 + i * 20);
  assert.equal(world.posts, posts, "unknown state must not spin an idle flood fill");
});
