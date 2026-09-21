import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine } from "../app/game/engine";
import { BlockId } from "../app/game/data";
import { createMachine, advancePowerGrid } from "../app/game/wayworks";
import { PowerTopologyCache } from "../app/game/wayworks-network";
import { MaterialTopologyCache } from "../app/game/wayworks-links";
import { BiomeId } from "../app/game/world";
import type { LiquidCell } from "../app/game/liquids";

test("actual alchemy query retains spherical range, waterlogged sources and tracked-flow exclusion", () => {
  const blocks = new Map<string, BlockId>(), liquidCells = new Map<string, LiquidCell>();
  let reads = 0;
  const engine = Object.assign(Object.create(VoxelEngine.prototype), { liquidCells,
    world: { getBlock: (x: number, y: number, z: number) => { reads++; return blocks.get(`${x},${y},${z}`) ?? BlockId.Air; } },
  }) as { stationHasWaterSource(key: string): boolean };
  const source = "15,20,30", corner = "15,25,30";
  blocks.set(corner, BlockId.Water);
  assert.equal(engine.stationHasWaterSource("10,20,30"), false);
  assert.equal(reads, 515, "the full empty query is a sphere, not a cube");
  for (const block of [BlockId.Water, BlockId.LumenKelp]) {
    blocks.set(source, block);
    assert.equal(engine.stationHasWaterSource("10,20,30"), true);
    liquidCells.set(source, { kind: "water", source: false, level: 1, falling: true });
    assert.equal(engine.stationHasWaterSource("10,20,30"), false);
    liquidCells.set(source, { kind: "water", source: true, level: 0, falling: false });
    assert.equal(engine.stationHasWaterSource("10,20,30"), true);
    liquidCells.clear();
  }
  blocks.delete(source); blocks.set("16,20,30", BlockId.Water);
  assert.equal(engine.stationHasWaterSource("10,20,30"), false);
  const before = reads;
  for (const malformed of ["oops", "Infinity,20,30", "10,NaN,30"])
    assert.equal(engine.stationHasWaterSource(malformed), false);
  assert.equal(reads, before, "invalid origins do not read the world");
});

test("actual host power tick uses complete solar queries and the unchanged eclipse/weather calculation", () => {
  for (const roof of [BlockId.Air, BlockId.ReinforcedWindow, BlockId.Stone, undefined]) {
    const machine = createMachine("sunplate-array", "L", "local"), point = { x: 0, y: 0, z: 0 };
    const engine = Object.assign(Object.create(VoxelEngine.prototype), {
      multiplayer: null, paused: false, agentMode: true, wayworksAccumulator: 0, settings: { simulationDistance: 3 },
      wayworks: new Map([["0,0,0", machine]]), liquidCells: new Map(), position: new THREE.Vector3(),
      wayworksTopology: new PowerTopologyCache(), wayworksMaterialTopology: new MaterialTopologyCache(),
      weatherState: { kind: "rain", windSpeed: .8 }, celestialSample: { eclipse: .25 },
      bodyContext: () => ({ body: { id: "test", orbit: { semiMajorAxisAu: 2 } }, environment: { pressureKPa: 0, wind: 0 } }),
      daylightAmount: () => .6, renderWayworks: () => undefined,
      pressureRuntime: { update: () => undefined, machineThermalBoundary: () => "unknown", exteriorAt: () => false },
      world: { getBlock: (x: number, y: number, z: number) => x === 0 && z === 0 && y === 0 ? BlockId.SunplateArray
        : x === 0 && z === 0 && y === 127 ? roof : BlockId.Air, biomeAt: () => BiomeId.OrbitalVoid },
    }) as VoxelEngine;
    engine.updateWayworks(.25);
    const expected = advancePowerGrid([{ key: "0,0,0", ...point, state: machine,
      solarExposure: roof === BlockId.Air ? .6 * .75 * .35 / 4 : 0, windExposure: 0, waterFlow: 0 }], 250).states["0,0,0"];
    const actual = engine.wayworks.get("0,0,0")!;
    assert.equal(actual.energyJ, expected.energyJ); assert.equal(actual.generationRemainder, expected.generationRemainder);
    if (roof === BlockId.Air) assert(actual.energyJ > 0); else assert.equal(actual.energyJ, 0);
  }
});
