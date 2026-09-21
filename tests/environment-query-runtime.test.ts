import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { VoxelEngine } from "../app/game/engine";
import { BlockId } from "../app/game/data";
import { createMachine, advancePowerGrid } from "../app/game/wayworks";
import { PowerTopologyCache } from "../app/game/wayworks-network";
import { MaterialTopologyCache } from "../app/game/wayworks-links";
import { BiomeId } from "../app/game/world";

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
