import assert from "node:assert/strict";
import test from "node:test";
import type { AirZoneState } from "../app/game/airzone";
import type { BodyEnvironment } from "../app/game/celestial-environment";
import { acceptPressurePresentation, buildPressurePresentation, parsePressurePresentation,
  pressurePresentationClosedGateAt, pressurePresentationEnvironmentAt, pressurePresentationOpenDoorAt,
  PRESSURE_PRESENTATION_MAX_BYTES, type PressurePresentationSource } from "../app/game/pressure-presentation";

function zone(zoneId = "habitat", cellKeys = ["0,0,0"]): AirZoneState {
  return { schemaVersion: 1, zoneId, locationId: "test/surface", topologyRevision: 3, resourceRevision: 8,
    cellCount: cellKeys.length, cellKeys, membershipDigest: "test", controllerIds: ["private-controller"], boundaryLeakArea: 0,
    status: "sealed", pressureMilliKPa: 100_000, temperatureMilliC: 20_000,
    oxygenMilliMoles: 20_000, inertMilliMoles: 80_000, co2MilliMoles: 0, thermalEnergyMilliJ: 100_000 };
}
function source(zones = [zone()]): PressurePresentationSource {
  return { host: { locationId: "test/surface", generation: 7, machines: new Map([["2,0,0", { kind: "pressure-door" }], ["5,0,0", { kind: "hangar-pressure-gate" }]]) },
    devices: new Map([["2,0,0", { open: true, locked: false, gateWidth: 3, gateHeight: 3 }], ["5,0,0", { open: false, locked: true, gateWidth: 3, gateHeight: 3 }]]),
    gates: new Map([["5,0,0", [{ x: 5, y: 1, z: 0 }]]]), topology: { revision: 3, zones: new Map(zones.map(z => [z.zoneId, z])) } };
}
const origin = { x: 0, y: 0, z: 0 };
function snapshot() {
  const result = buildPressurePresentation(source(), origin, 12);
  assert.ok(result); return result;
}
const fallback: BodyEnvironment = { policyId: "test/v1", gravityG: 1, pressureKPa: 101, oxygenFraction: .21, co2Fraction: 0, inertFraction: .79,
  breathable: true, requiresPressureSuit: false, temperatureC: [-12, 36], corrosive: false, radiation: .1, liquidMedium: "water", wind: 1,
  weather: ["clear"], sky: { day: "blue", night: "black", dusk: "orange", body: "blue", accent: "green", starColor: "white", starBrightness: 1, aurora: 0, rings: false, bands: false } };

test("host presentation copies only public fields and freezes detached results", () => {
  const host = source(), before = JSON.stringify([...host.topology.zones.values()]);
  const view = buildPressurePresentation(host, origin, 12)!;
  assert.ok(view);
  assert.deepEqual(parsePressurePresentation(JSON.parse(JSON.stringify(view))), view);
  assert.equal(JSON.stringify([...host.topology.zones.values()]), before);
  assert.equal(view.zones[0].oxygenFraction, .2);
  assert.equal(view.zones[0].breathable, true);
  assert.equal(view.zones[0].membershipComplete, true);
  assert.equal(Object.isFrozen(view.zones[0].bounds), true);
  assert.equal(Object.isFrozen(view.zones[0].cellKeys), true);
  for (const forbidden of ["oxygenMilliMoles", "thermalEnergyMilliJ", "installationId", "controllerIds", "workshop", "bindings", "gasStores"]) assert.equal(JSON.stringify(view).includes(forbidden), false);
  const longLocation = "x".repeat(200);
  assert.ok(parsePressurePresentation({ ...view, locationId: longLocation, zones: [{ ...view.zones[0], zoneId: `${longLocation}:air:0123456789abcdef` }] }));
});

test("queries resolve lower and upper doors, formed gate cells and exact room cells", () => {
  const view = snapshot();
  assert.equal(pressurePresentationOpenDoorAt(view, { x: 2.5, y: .2, z: .5 }), true);
  assert.equal(pressurePresentationOpenDoorAt(view, { x: 2, y: 1, z: 0 }), true);
  assert.equal(pressurePresentationOpenDoorAt(view, { x: 2, y: 2, z: 0 }), false);
  assert.equal(pressurePresentationOpenDoorAt(view, { x: 5, y: 1, z: 0 }), false);
  assert.equal(pressurePresentationClosedGateAt(view, { x: 5, y: 1, z: 0 }), true);
  assert.equal(pressurePresentationClosedGateAt(view, { x: 5, y: 2, z: 0 }), false);
  const open = parsePressurePresentation({ ...view, doors: view.doors.map(d => ({ ...d, open: true })) })!;
  assert.equal(pressurePresentationClosedGateAt(open, { x: 5, y: 1, z: 0 }), false);
  assert.equal(pressurePresentationOpenDoorAt(open, { x: 5, y: 1, z: 0 }), true);
  const environment = pressurePresentationEnvironmentAt(view, { x: .9, y: .9, z: .9 }, fallback);
  assert.equal(environment.pressureKPa, 100);
  assert.equal(environment.gravityG, fallback.gravityG);
  assert.equal(environment.breathable, true);
  assert.deepEqual(environment.temperatureC, [20, 20]);
  assert.equal(pressurePresentationEnvironmentAt(view, { x: 1, y: 0, z: 0 }, fallback), fallback);
  assert.equal(pressurePresentationEnvironmentAt(null, origin, fallback), fallback);
});

test("partial local membership fails closed inside room bounds, never floods bounds", () => {
  const cells = Array.from({ length: 31 }, (_, x) => `${x},0,0`);
  const view = buildPressurePresentation(source([zone("long-room", cells)]), origin, 1)!;
  assert.equal(view.zones[0].membershipComplete, false);
  assert.equal(view.zones[0].cellKeys.length, 9);
  assert.deepEqual(view.zones[0].bounds, { min: "0,0,0", max: "30,0,0" });
  assert.equal(pressurePresentationEnvironmentAt(view, { x: 8, y: 0, z: 0 }, fallback).breathable, true);
  const unknown = pressurePresentationEnvironmentAt(view, { x: 9, y: 0, z: 0 }, fallback);
  assert.equal(unknown.breathable, false);
  assert.equal(unknown.requiresPressureSuit, true);
  assert.equal(unknown.pressureKPa, 0);
  assert.equal(pressurePresentationEnvironmentAt(view, { x: 31, y: 0, z: 0 }, fallback), fallback);
});

test("checking rooms stay unbreathable even with retained pressure", () => {
  const pending = { ...zone(), status: "checking" as const };
  const view = buildPressurePresentation(source([pending]), origin, 1)!;
  assert.deepEqual(view.zones[0].reasons, ["checking"]);
  assert.equal(pressurePresentationEnvironmentAt(view, origin, fallback).breathable, false);
  assert.equal(pressurePresentationEnvironmentAt(view, origin, fallback).requiresPressureSuit, true);
});

test("strict parser rejects unknown fields, prototypes, accessors and malformed arrays", () => {
  const good = snapshot();
  let accessorRead = false;
  const getter = { ...good };
  Object.defineProperty(getter, "sequence", { enumerable: true, get: () => { accessorRead = true; return 1; } });
  const cases = [null, [], { ...good, unexpected: 1 }, { ...good, [Symbol("hidden")]: true }, Object.assign(Object.create({ inherited: true }), good), getter,
    { ...good, doors: [{ ...good.doors[0], gasStores: {} }] },
    { ...good, zones: [{ ...good.zones[0], oxygenMilliMoles: 20_000 }] },
    { ...good, zones: [{ ...good.zones[0], bounds: { ...good.zones[0].bounds, extra: 1 } }] },
    { ...good, doors: new Array(1) }, { ...good, doors: Object.assign([], { extra: 1 }) },
    JSON.parse(JSON.stringify(good).replace('"schema":1', '"schema":1,"__proto__":{}'))];
  for (const value of cases) assert.equal(parsePressurePresentation(value), null);
  assert.equal(accessorRead, false);
});

test("strict parser rejects unsafe coordinates, nonfinite values and inconsistent diagnostics", () => {
  const good = snapshot(), room = good.zones[0];
  const cases = [
    ...[NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1].map(sequence => ({ ...good, sequence })),
    ...["30000001,0,0", "0.5,0,0", "-0,0,0", "00,0,0", "1e2,0,0", "0,0,0,0"].map(key => ({ ...good, doors: [{ ...good.doors[0], key }] })),
    ...[NaN, Infinity, -1, .2].map(pressureMilliKPa => ({ ...good, zones: [{ ...room, pressureMilliKPa }] })),
    { ...good, zones: [{ ...room, oxygenFraction: Infinity }] }, { ...good, zones: [{ ...room, oxygenFraction: .9 }] },
    { ...good, zones: [{ ...room, breathable: false }] }, { ...good, zones: [{ ...room, reasons: ["invented"] }] },
    { ...good, zones: [{ ...room, temperatureMilliC: -273_151 }] }, { ...good, zones: [{ ...room, status: "invented" }] },
    { ...good, zones: [{ ...room, cellKeys: ["1,0,0"] }] },
    { ...good, zones: [{ ...room, bounds: { min: "1,0,0", max: "0,0,0" } }] },
    { ...good, doors: [{ ...good.doors[0], gateCells: ["2,1,0"] }] },
    { ...good, doors: [{ ...good.doors[1], gateCells: ["7,1,0"] }] },
    { ...good, doors: [{ ...good.doors[1], gateCells: [], open: true }] },
  ];
  for (const value of cases) assert.equal(parsePressurePresentation(value), null, JSON.stringify(value));
});

test("parser rejects door, gate, zone, cell and byte budgets and overlaps", () => {
  const good = snapshot(), room = good.zones[0];
  const manyCells = Array.from({ length: 32_769 }, (_, x) => `${x},0,0`);
  const cases = [
    { ...good, doors: Array.from({ length: 129 }, (_, x) => ({ ...good.doors[0], key: `${x},0,0` })) },
    { ...good, doors: [{ ...good.doors[1], gateCells: Array(82).fill("5,1,0") }] },
    { ...good, zones: [room, room, room] },
    { ...good, doors: [good.doors[0], good.doors[0]] },
    { ...good, zones: [room, { ...room, zoneId: "other" }] },
    { ...good, zones: [{ ...room, cellKeys: ["0,0,0", "0,0,0"] }] },
    { ...good, zones: [{ ...room, cellKeys: manyCells, bounds: { min: "0,0,0", max: "32768,0,0" } }] },
    { ...good, zones: [{ ...room, cellKeys: manyCells.slice(0, 16_384), bounds: { min: "0,0,0", max: "32768,0,0" } },
      { ...room, zoneId: "other", cellKeys: manyCells.slice(16_384), bounds: { min: "0,0,0", max: "32768,0,0" } }] },
    { ...good, zones: [{ ...room, cellKeys: manyCells.slice(0, 32_768), bounds: { min: "0,0,0", max: "32767,0,0" } }] },
  ];
  for (const value of cases) assert.equal(parsePressurePresentation(value), null);
  assert.ok(new TextEncoder().encode(JSON.stringify(cases.at(-1))).length > PRESSURE_PRESENTATION_MAX_BYTES);
});

test("epoch acceptance rejects replay, older topology and wrong location or generation", () => {
  const good = snapshot(), expected = { locationId: good.locationId, generation: good.generation };
  assert.deepEqual(acceptPressurePresentation(good, null, expected), good);
  assert.equal(acceptPressurePresentation(good, good, expected), null);
  assert.equal(acceptPressurePresentation({ ...good, sequence: 11 }, good, expected), null);
  assert.equal(acceptPressurePresentation({ ...good, sequence: 13, revision: 2 }, good, expected), null);
  assert.ok(acceptPressurePresentation({ ...good, sequence: 13 }, good, expected));
  assert.equal(acceptPressurePresentation({ ...good, sequence: 13, generation: 8 }, good, expected), null);
  assert.equal(acceptPressurePresentation({ ...good, sequence: 13, locationId: "other/surface" }, good, expected), null);
  const switched = { ...good, locationId: "other/surface", generation: 9, sequence: 0, revision: 0 };
  assert.ok(acceptPressurePresentation(switched, good, { locationId: switched.locationId, generation: switched.generation }));
});

test("builder keeps nearest bounded doors and two nearby rooms, and ignores another location", () => {
  const host = source([zone("room-a"), zone("room-b", ["1,0,0"]), zone("room-c", ["2,0,0"]), { ...zone("foreign"), locationId: "elsewhere" }]);
  const many = new Map(Array.from({ length: 150 }, (_, i) => [`${i % 25},0,${Math.floor(i / 25)}`, { open: false, locked: false, gateWidth: 3, gateHeight: 3 }]));
  const view = buildPressurePresentation({ ...host, devices: many, host: { ...host.host, machines: new Map([...many.keys()].map(key => [key, { kind: "pressure-door" }])) } }, origin, 1)!;
  assert.equal(view.doors.length, 128);
  assert.deepEqual(view.zones.map(z => z.zoneId), ["room-a", "room-b"]);
  assert.ok(new TextEncoder().encode(JSON.stringify(view)).length <= PRESSURE_PRESENTATION_MAX_BYTES);
  assert.equal(buildPressurePresentation(host, { x: NaN, y: 0, z: 0 }, 1), null);
  assert.equal(buildPressurePresentation(host, origin, -1), null);
});

test("worst-coordinate dense local room remains below wire budget and preserves nearest cells", () => {
  const base = 29_999_950, cellKeys: string[] = [];
  for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) for (let z = -8; z <= 8; z++) cellKeys.push(`${base + x},${base + y},${base + z}`);
  const host = source([zone("dense", cellKeys)]);
  const view = buildPressurePresentation(host, { x: base, y: base, z: base }, 1)!;
  assert.ok(view);
  assert.equal(view.zones[0].cellKeys[0], `${base},${base},${base}`);
  assert.ok(new TextEncoder().encode(JSON.stringify(view)).length < PRESSURE_PRESENTATION_MAX_BYTES);
});

test("wire pressure preserves both nearby room bounds while trimming distant cells and gates", () => {
  const base = 29_999_950, cellsA: string[] = [], cellsB: string[] = [];
  for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) for (let z = -8; z <= 8; z++)
    (x <= 0 ? cellsA : cellsB).push(`${base + x},${base + y},${base + z}`);
  const devices = new Map(), gates = new Map(), machines = new Map();
  for (const offset of [-24, -8, 8, 24]) for (let z = 1; z <= 32; z++) {
    const x = base + offset, key = `${x},${base},${base + z}`, interior = [];
    devices.set(key, { open: false, locked: true, gateWidth: 9, gateHeight: 9 });
    machines.set(key, { kind: "hangar-pressure-gate" });
    for (let across = -3; across <= 3; across++) for (let y = 1; y <= 7; y++) interior.push({ x: x + across, y: base + y, z: base + z });
    gates.set(key, interior);
  }
  const host = source([zone("a", cellsA), zone("b", cellsB)]);
  const view = buildPressurePresentation({ ...host, host: { ...host.host, machines }, devices, gates }, { x: base, y: base, z: base }, 1)!;
  assert.ok(view);
  assert.ok(view.doors.length > 0 && view.doors.length < 128);
  assert.equal(view.zones.length, 2);
  assert.equal(view.zones[0].membershipComplete, false);
  assert.equal(view.zones[1].membershipComplete, false);
  assert.ok(view.zones.every(z => z.cellKeys.length > 0));
  assert.ok(new TextEncoder().encode(JSON.stringify(view)).length <= PRESSURE_PRESENTATION_MAX_BYTES);
  const omitted = cellsA.find(key => !view.zones[0].cellKeys.includes(key))!;
  const [x, y, z] = omitted.split(",").map(Number);
  assert.equal(pressurePresentationEnvironmentAt(view, { x, y, z }, fallback).breathable, false);
});
