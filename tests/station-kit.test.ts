import assert from "node:assert/strict";
import test from "node:test";
import { BLOCKS, BlockId, ITEMS, RECIPES } from "../app/game/data";
import { STATION_STRUCTURE_CATALOG, stationPanelFace, stationSceneStructureKind, stationSealMask, stationStructureKind } from "../app/game/station-kit";
import { SPACEFLIGHT_CATALOG } from "../app/game/spaceflight-catalog";
import { machineKindForBlock } from "../app/game/wayworks-integration";
import { createAvatarHeldItemModel } from "../app/game/held-items";
import { createMachine } from "../app/game/wayworks";
import { advanceMachine } from "../app/game/wayworks-machines";
import { isSeatBlock, seatAnchorForBlock } from "../app/game/seating";
import { ChunkWorld, MIN_Y, SECTION_HEIGHT } from "../app/game/world";

test("station kit has append-only craftable, stackable ordinary voxel identities and shared authored models", () => {
  assert.deepEqual(Object.values(STATION_STRUCTURE_CATALOG).map(def => def.id), [708, 709, 710, 711]);
  for (const [kind, def] of Object.entries(STATION_STRUCTURE_CATALOG)) {
    assert.equal(stationStructureKind(def.id), kind);
    assert.equal(BLOCKS[def.id as BlockId].name, def.name);
    assert.equal(ITEMS[def.id].placeBlock, def.id);
    assert.equal(ITEMS[def.id].maxStack, 64);
    assert.equal(machineKindForBlock(def.id), undefined, "structural voxels must not consume machine capacity");
    const recipe = RECIPES.find(recipe => recipe.output.item === def.id);
    assert.ok(recipe?.table); assert.ok(recipe.output.count > 0);
    for (const ingredient of recipe.pattern.flat()) if (ingredient) assert.ok(ITEMS[ingredient], `${kind} missing ingredient ${ingredient}`);
    assert.equal(createAvatarHeldItemModel(def.id)?.userData.spaceflightKind, kind);
  }
});

test("collision and airtightness are separate explicit station contracts", () => {
  for (const id of [BlockId.StationHull, BlockId.StationBulkhead]) {
    assert.equal(stationSealMask(id), 63); assert.equal(BLOCKS[id].solid, true);
  }
  for (const id of [BlockId.StationHabitation, BlockId.StationGreenhouse, ...Object.values(SPACEFLIGHT_CATALOG).map(def => def.id)]) {
    assert.equal(stationSealMask(id), 0); assert.equal(BLOCKS[id as BlockId].solid, true);
  }
  for (const id of [BlockId.StoneBrick, BlockId.ReinforcedWindow, BlockId.PressureDoor, BlockId.Air]) assert.equal(stationSealMask(id), undefined);
});

test("sealed station panels cover a face once and share one culled chunk mesh", () => {
  for (const id of [BlockId.StationHull, BlockId.StationBulkhead]) {
    assert.equal(stationSceneStructureKind(id), undefined);
    assert.equal(BLOCKS[id].layer, "opaque"); assert.equal(BLOCKS[id].shape, "cube");
    const patches = stationPanelFace(id)!;
    assert.ok(Math.abs(patches.reduce((sum, { rect: [u0, v0, u1, v1] }) => sum + (u1 - u0) * (v1 - v0), 0) - 1) < 1e-12);
    for (let u = .005; u < 1; u += .01) for (let v = .005; v < 1; v += .01) {
      assert.equal(patches.filter(({ rect: [u0, v0, u1, v1] }) => u >= u0 && u < u1 && v >= v0 && v < v1).length, 1);
    }
  }
  assert.equal(stationSceneStructureKind(BlockId.StationGreenhouse), "station-greenhouse");
  const world = new ChunkWorld(); world.reset("STATION-PANEL-MESH");
  const chunk = world.generateChunk(0, 0), y = 120, section = Math.floor((y - MIN_Y) / SECTION_HEIGHT);
  world.setBlock(4, y, 4, BlockId.StationHull); world.setBlock(5, y, 4, BlockId.StationBulkhead);
  world.rebuildSection(chunk, section);
  const layers = chunk.sections.get(section)!;
  assert.equal(Object.values(layers).filter(Boolean).length, 1, "both walls share one ordinary opaque mesh");
  const mesh = layers.opaque!;
  assert.equal(mesh.geometry.index!.count, 5 * (stationPanelFace(BlockId.StationHull)!.length + stationPanelFace(BlockId.StationBulkhead)!.length) * 6, "the shared internal cube faces are absent");
  world.dispose();
});

test("habitation is a usable seat with no hidden machine or free supply", () => {
  assert.equal(isSeatBlock(BlockId.StationHabitation), true);
  assert.deepEqual(seatAnchorForBlock(BlockId.StationHabitation, 2, 3, 4), { x: 2, y: 2.51, z: 4 });
});

test("radiator rejects only imported finite heat, honors its measured boundary, control and modules", () => {
  const radiator = createMachine("station-radiator", "orbit", "owner");
  radiator.workshop.heatJ = 10000; radiator.energyJ = 123;
  const original = structuredClone(radiator);
  const exposed = advanceMachine(radiator, 250, { radiatorBoundary: "exterior" });
  assert.equal(exposed.radiatedJ, 2000); assert.equal(exposed.state.workshop.heatJ, 8000);
  assert.equal(exposed.state.energyJ, 123); assert.equal(exposed.generatedJ, 0); assert.equal(exposed.consumedJ, 0);
  assert.equal(exposed.state.status, "working"); assert.deepEqual(radiator, original);
  const interior = advanceMachine(radiator, 250, { radiatorBoundary: "room" });
  assert.equal(interior.radiatedJ, 500); assert.equal(interior.state.workshop.heatJ, 9500);
  for (const boundary of [undefined, "unknown"] as const) {
    const unknown = advanceMachine(radiator, 1000, { radiatorBoundary: boundary });
    assert.equal(unknown.radiatedJ, 0); assert.equal(unknown.state.workshop.heatJ, 10000);
  }
  radiator.enabled = false;
  assert.equal(advanceMachine(radiator, 1000, { radiatorBoundary: "exterior" }).radiatedJ, 0);
  radiator.enabled = true; radiator.workshop.control = "signal-on";
  assert.equal(advanceMachine(radiator, 1000, { radiatorBoundary: "exterior" }).radiatedJ, 0);
  radiator.workshop.signal = true; radiator.workshop.upgrades.thermal = 1;
  const empty = advanceMachine(radiator, 1000, { radiatorBoundary: "exterior" });
  assert.equal(empty.radiatedJ, 10000); assert.equal(empty.state.workshop.heatJ, 0);
  assert.equal(advanceMachine(empty.state, 1000, { radiatorBoundary: "exterior" }).radiatedJ, 0);
});
