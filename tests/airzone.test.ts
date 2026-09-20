import assert from "node:assert/strict";
import test from "node:test";
import {
  AIRZONE_MAX_CELLS, AIR_FACES, EMPTY_AIR_GAS, airCellKey, airThermalEnergy,
  airZoneDiagnostics, airZoneIntersectsEdit, commitAirTransfer, createAirZoneState,
  discoverAirZone, equalizeAirZones, gasMilliLitersToMilliMoles, gasMilliMolesToMilliLiters, isAirTopologyResultCurrent,
  isAirZoneBreathable, normalizeAirZoneState, quoteAirMixture, quoteAirTransfer, remapAirZones,
  stepAirZone, totalAirGas, transferAirGas,
  type AirGas, type AirPoint, type AirSnapshotCell, type AirTopologyResult,
} from "../app/game/airzone";

const epochs = { locationId: "home", generation: 1, topologyRevision: 3, requestId: 7 };
const point = (x: number, y = 0, z = 0): AirPoint => ({ x, y, z });
function room(points: readonly AirPoint[], controllers = [0]): AirTopologyResult {
  const keys = new Set(points.map(airCellKey));
  const ds = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const cells = points.map((p, i) => ({ ...p, passable: true, sealMask: ds.reduce((mask, d, f) => keys.has(airCellKey({ x: p.x + d[0], y: p.y + d[1], z: p.z + d[2] })) ? mask : mask | (1 << f), 0), controllerIds: controllers.includes(i) ? [`controller-${i}`] : [] }));
  return discoverAirZone({ epochs, seed: points[0], cells });
}
const air: AirGas = { oxygenMilliMoles: 8_700, inertMilliMoles: 32_800, co2MilliMoles: 10 };
const gasFields = ["oxygenMilliMoles", "inertMilliMoles", "co2MilliMoles", "thermalEnergyMilliJ"] as const;

test("varied connected rooms return stable sorted membership, controllers, bounds", () => {
  const points = [point(0), point(1), point(1, 1), point(1, 1, 1), point(2, 1, 1)];
  const result = room(points);
  assert.equal(result.status, "sealed"); assert.equal(result.cellCount, 5);
  assert.deepEqual(result.bounds, { min: point(0), max: point(2, 1, 1) });
  const cells: AirSnapshotCell[] = [{ ...point(0), passable: true, sealMask: 62, controllerIds: ["b", "a"], ventIds: ["v2", "v1"] }, { ...point(1), passable: true, sealMask: 61 }];
  const first = discoverAirZone({ epochs, seed: point(0), cells });
  const reverse = discoverAirZone({ epochs, seed: point(1), cells: [...cells].reverse() });
  assert.deepEqual(first, reverse); assert.deepEqual(first.controllerIds, ["a", "b"]);
  assert.deepEqual(first.ventIds, ["v1", "v2"]);
});

test("unloaded edges fail closed and known open doors report precise leak", () => {
  const c: AirSnapshotCell = { ...point(0), passable: true, sealMask: 62, controllerIds: ["c"], openFaceCauses: { "+x": "outer-door-7" } };
  const unknown = discoverAirZone({ epochs, seed: point(0), cells: [c] });
  assert.equal(unknown.status, "unknown"); assert.deepEqual(unknown.unknownBoundaries, [{ cell: point(0), face: "+x", cause: "outer-door-7", unknown: true }]);
  assert.equal(isAirZoneBreathable(createAirZoneState(unknown, air)), false);
  const exterior = discoverAirZone({ epochs, seed: point(0), cells: [c, { ...point(1), passable: true, sealMask: 0, exterior: true }] });
  assert.equal(exterior.status, "leaking"); assert.equal(exterior.cellCount, 1);
  assert.equal(exterior.leaks[0].face, "+x"); assert.equal(exterior.unknownBoundaries.length, 0);
});

test("capacity adds controllers, hard cap and malformed snapshots fail closed", () => {
  const points = Array.from({ length: 2050 }, (_, x) => point(x));
  assert.equal(room(points).status, "over-capacity");
  const supported = room(points, [0, 2049]); assert.equal(supported.capacity, 4096); assert.equal(supported.status, "sealed");
  const tooLarge = room(Array.from({ length: AIRZONE_MAX_CELLS + 1 }, (_, x) => point(x)), Array.from({ length: 9 }, (_, i) => i * 2048));
  assert.equal(tooLarge.cellCount, AIRZONE_MAX_CELLS); assert.equal(tooLarge.truncated, true); assert.equal(tooLarge.status, "over-capacity");
  const c = { ...point(0), passable: true, sealMask: 63 };
  assert.equal(discoverAirZone({ epochs, seed: point(0), cells: [c, c] }).error, "duplicate-cell");
  assert.equal(discoverAirZone({ epochs, seed: point(0), cells: [{ ...c, sealMask: -1 }] }).status, "unknown");
});

test("dense section snapshots use explicit overlays and unknown adjacent sections", () => {
  const flags = new Uint8Array(4096);
  flags[1 + 16 * 2 + 256 * 3] = 1;
  flags[2 + 16 * 2 + 256 * 3] = 1;
  const seed = point(1, 3, 2), overlay = { ...seed, passable: true, sealMask: 0, controllerIds: ["c"] };
  const topology = discoverAirZone({ epochs, seed, cells: [overlay], sections: [{ origin: point(0), flags }] });
  assert.equal(topology.cellCount, 2); assert.equal(topology.status, "sealed");
  const edge = new Uint8Array(4096); edge[15] = 1;
  const missing = discoverAirZone({ epochs, seed: point(15), cells: [{ ...point(15), passable: true, sealMask: 0, controllerIds: ["c"] }], sections: [{ origin: point(0), flags: edge }] });
  assert.equal(missing.status, "unknown"); assert.ok(missing.unknownBoundaries.some(l => l.face === "+x"));
});

test("epoch guards and boundary edit invalidation include all authoritative epochs", () => {
  const topology = room([point(0), point(1)]);
  assert.equal(isAirTopologyResultCurrent(topology, epochs), true);
  for (const changed of [{ locationId: "moon" }, { generation: 2 }, { topologyRevision: 4 }, { requestId: 8 }]) assert.equal(isAirTopologyResultCurrent(topology, { ...epochs, ...changed }), false);
  assert.equal(airZoneIntersectsEdit(topology, point(2)), true);
  assert.equal(airZoneIntersectsEdit(topology, point(3)), false);
});

test("reference gas volume retains subquantum residual; pressure is ideal-gas Pa", () => {
  assert.deepEqual(gasMilliLitersToMilliMoles(49), { milliMoles: 2, residualMl: 1 });
  assert.deepEqual(gasMilliLitersToMilliMoles(23), { milliMoles: 0, residualMl: 23 });
  assert.throws(() => gasMilliLitersToMilliMoles(0.5));
  assert.equal(gasMilliMolesToMilliLiters(2), 48);
  assert.deepEqual(quoteAirMixture({ oxygenMilliMoles: 1, inertMilliMoles: 1, co2MilliMoles: 1 }, 2), { oxygenMilliMoles: 1, inertMilliMoles: 1, co2MilliMoles: 0 });
  const zone = createAirZoneState(room([point(0)]), air);
  assert.equal(zone.pressureMilliKPa, Math.floor(41_510 * 8.314 * 293.15 / 1000));
  assert.equal(zone.temperatureMilliC, 20_000);
  assert.equal(createAirZoneState(room([point(0)])).pressureMilliKPa, 0);
  assert.equal(totalAirGas(createAirZoneState(room([point(0)]))), 0);
  const huge = createAirZoneState(room([point(0)]), { ...EMPTY_AIR_GAS, inertMilliMoles: 100_000_000_000 });
  assert.equal(huge.pressureMilliKPa, Number(BigInt(100_000_000_000) * BigInt(8314) * BigInt(293150) / BigInt(1_000_000_000)));
});

test("immutable transfer quotes conserve each species and energy, reject replay", () => {
  let source = createAirZoneState(room([point(0)]), air), target = createAirZoneState(room([point(4)]));
  const originals = [source, target];
  for (let i = 0; i < 100; i++) {
    const quote = quoteAirTransfer(source, target, i % 11 + 1);
    assert.ok(Object.isFrozen(quote)); assert.ok(Object.isFrozen(quote.gas));
    const moved = commitAirTransfer(source, target, quote);
    assert.equal(moved.committed, true);
    assert.equal(commitAirTransfer(moved.source, moved.target, quote).committed, false);
    source = moved.source; target = moved.target;
  }
  for (const field of gasFields) assert.equal(source[field] + target[field], originals[0][field] + originals[1][field]);
  assert.equal(originals[1].oxygenMilliMoles, 0);
  const quote = quoteAirTransfer(source, target, 3);
  assert.equal(commitAirTransfer(source, target, { ...quote, gas: { ...quote.gas, oxygenMilliMoles: quote.gas.oxygenMilliMoles + 1 } }).committed, false);
});

test("backpressure, finite recovery, and equalization do not merge topology", () => {
  const a = createAirZoneState(room([point(0)]), air), b = createAirZoneState(room([point(5)]));
  const capped = transferAirGas(a, b, 40_000, 20_000);
  assert.ok(capped.target.pressureMilliKPa <= 20_000); assert.ok(capped.transferredMilliMoles > 0 && capped.transferredMilliMoles < 40_000);
  const equal = equalizeAirZones(a, b, 100_000);
  assert.ok(Math.abs(equal.a.pressureMilliKPa - equal.b.pressureMilliKPa) <= 3);
  assert.equal(equal.a.zoneId, a.zoneId); assert.equal(equal.b.zoneId, b.zoneId);
  assert.deepEqual(equal.a.cellKeys, a.cellKeys); assert.deepEqual(equal.b.cellKeys, b.cellKeys);
  for (const field of gasFields) assert.equal(equal.a[field] + equal.b[field], a[field] + b[field]);
  assert.equal(transferAirGas(a, a, 100).transferredMilliMoles, 0);
  assert.equal(transferAirGas(a, { ...b, locationId: "moon" }, 100).transferredMilliMoles, 0);
});

test("5Hz consumers, plants, scrubber, heat and leaks have explicit ledgers", () => {
  const initial = { ...createAirZoneState(room([point(0)]), air), boundaryLeakArea: 2, status: "leaking" as const };
  const tick = stepAirZone(initial, { consumers: [{ id: "player", kind: "player", oxygenMilliMoles: 5, co2MilliMoles: 5 }, { id: "fire", kind: "fire", oxygenMilliMoles: 3, co2MilliMoles: 2 }], plantConversionMilliMoles: 1, scrubCo2MilliMoles: 2, heatMilliJ: 1000, leakMilliMolesPerFace: 9 });
  assert.equal(tick.consumedOxygenMilliMoles, 8); assert.equal(tick.producedCo2MilliMoles, 7); assert.equal(totalAirGas(tick.leaked), 18);
  assert.equal(tick.state.oxygenMilliMoles + tick.leaked.oxygenMilliMoles, initial.oxygenMilliMoles - 8 + 1);
  assert.equal(tick.state.co2MilliMoles + tick.leaked.co2MilliMoles + tick.scrubbed.co2MilliMoles, initial.co2MilliMoles + 7 - 1);
  assert.equal(tick.state.thermalEnergyMilliJ + tick.leaked.thermalEnergyMilliJ + tick.scrubbed.thermalEnergyMilliJ, initial.thermalEnergyMilliJ + tick.heatAppliedMilliJ + tick.consumerThermalDeltaMilliJ);
  const exhausted = stepAirZone(createAirZoneState(room([point(0)])), { consumers: [{ id: "p", kind: "player", oxygenMilliMoles: 1, co2MilliMoles: 1 }], plantConversionMilliMoles: 10, heatMilliJ: 50 });
  assert.deepEqual(exhausted.unmetConsumerIds, ["p"]); assert.equal(totalAirGas(exhausted.state), 0); assert.equal(exhausted.heatAppliedMilliJ, 0);
  assert.throws(() => stepAirZone(initial, { scrubCo2MilliMoles: -1 }));
  const vacuum = stepAirZone(createAirZoneState(room([point(0)]), { ...EMPTY_AIR_GAS, oxygenMilliMoles: 1 }), { consumers: [{ id: "sink", kind: "machine", oxygenMilliMoles: 1, co2MilliMoles: 0 }] });
  assert.equal(totalAirGas(vacuum.state), 0); assert.equal(vacuum.state.thermalEnergyMilliJ, 0);
});

test("breathability checks topology, oxygen partial pressure, CO2 and temperature", () => {
  const good = createAirZoneState(room([point(0)]), air);
  assert.equal(isAirZoneBreathable(good), true); assert.ok(airZoneDiagnostics(good, 2).reserveSeconds! > 0);
  assert.equal(isAirZoneBreathable({ ...good, status: "checking" }), false);
  assert.equal(isAirZoneBreathable(createAirZoneState(room([point(0)]), { ...EMPTY_AIR_GAS, inertMilliMoles: 41_500 })), false);
  assert.equal(isAirZoneBreathable(createAirZoneState(room([point(0)]), { ...air, co2MilliMoles: 1000 })), false);
  assert.equal(isAirZoneBreathable(createAirZoneState(room([point(0)]), air, -1000)), false);
  assert.equal(airZoneDiagnostics(good).reserveSeconds, null);
});

test("save normalization discards derived readiness and rejects malformed custody", () => {
  const good = createAirZoneState(room([point(0)]), air);
  const loaded = normalizeAirZoneState(JSON.parse(JSON.stringify(good)))!;
  assert.equal(loaded.status, "checking"); assert.equal(loaded.pressureMilliKPa, good.pressureMilliKPa);
  assert.deepEqual(loaded.controllerIds, []); assert.equal(isAirZoneBreathable(loaded), false);
  for (const corrupt of [{ oxygenMilliMoles: -1 }, { inertMilliMoles: 0.5 }, { thermalEnergyMilliJ: Infinity }, { cellKeys: ["1,0,0"] }, { schemaVersion: 2 }, { cellCount: 0 }]) assert.equal(normalizeAirZoneState({ ...good, ...corrupt }), null);
});

test("split, merge and disappearing cells conserve every species and energy", () => {
  const whole = room([point(0), point(1), point(2)]);
  const old = createAirZoneState(whole, { oxygenMilliMoles: 17, inertMilliMoles: 11, co2MilliMoles: 5 });
  const split = remapAirZones([old], [room([point(0)]), room([point(1), point(2)])]);
  for (const field of gasFields) assert.equal(split.zones.reduce((sum, z) => sum + z[field], split.lost[field]), old[field]);
  assert.equal(totalAirGas(split.lost), 0);
  const merged = remapAirZones(split.zones, [whole]);
  for (const field of gasFields) assert.equal(merged.zones[0][field], old[field]);
  const gone = remapAirZones([old], [room([point(0)])]);
  for (const field of gasFields) assert.equal(gone.zones[0][field] + gone.lost[field], old[field]);
  assert.ok(totalAirGas(gone.lost) > 0);
  assert.deepEqual(remapAirZones([old], [room([point(1), point(2)]), room([point(0)])]), split);
  assert.throws(() => remapAirZones([old, old], [whole]), /overlapping-old/);
  assert.throws(() => remapAirZones([old], [whole, whole]), /overlapping-new/);
});

test("one-mmol remapping never leaves heat in zero-gas children", () => {
  const old = createAirZoneState(room([point(0), point(1), point(2)]), { ...EMPTY_AIR_GAS, oxygenMilliMoles: 1 });
  const split = remapAirZones([old], [room([point(0)]), room([point(1)]), room([point(2)])]);
  for (const z of split.zones) { assert.ok(normalizeAirZoneState(z)); if (totalAirGas(z) === 0) assert.equal(z.thermalEnergyMilliJ, 0); }
  assert.equal(split.zones.reduce((n, z) => n + z.thermalEnergyMilliJ, 0), airThermalEnergy(1, 20_000));
});

test("each face bit seals its own neighbor and keeps equalization rooms separate", () => {
  for (let face = 0; face < AIR_FACES.length; face++) {
    const zone = discoverAirZone({ epochs, seed: point(0), cells: [{ ...point(0), passable: true, sealMask: 63 ^ (1 << face), controllerIds: ["c"] }] });
    assert.equal(zone.unknownBoundaries.length, 1); assert.equal(zone.unknownBoundaries[0].face, AIR_FACES[face]);
  }
});

test("known leaks retain custody across discovery and stop at exterior backpressure", () => {
  const topology = discoverAirZone({ epochs, seed: point(0), cells: [{ ...point(0), passable: true, sealMask: 62, controllerIds: ["c"] }, { ...point(1), passable: true, sealMask: 0, exterior: true }] });
  const old = createAirZoneState(room([point(0)]), air);
  const remapped = remapAirZones([old], [topology]);
  assert.equal(remapped.zones[0].status, "leaking"); assert.equal(totalAirGas(remapped.lost), 0);
  const result = stepAirZone(remapped.zones[0], { leakMilliMolesPerFace: 1_000_000, exteriorPressureMilliKPa: 20_000 });
  assert.ok(result.state.pressureMilliKPa >= 20_000 && result.state.pressureMilliKPa <= 20_003);
  for (const field of gasFields) assert.equal(result.state[field] + result.leaked[field], old[field]);
  const vacuum = stepAirZone(result.state, { leakMilliMolesPerFace: 1_000_000 });
  assert.equal(totalAirGas(vacuum.state), 0); assert.equal(vacuum.state.thermalEnergyMilliJ, 0);
});
