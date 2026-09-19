import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { Item, type ItemCode } from "../app/game/data.ts";
import { createWayworksItemModel, isWayworksItem } from "../app/game/wayworks-item-models.ts";

const items = [
  Item.CrushedIron, Item.EnrichedIron, Item.StoneDust, Item.MachineAlloy,
  Item.IronSheet, Item.CopperSheet, Item.Sawdust, Item.BiofuelPellet,
  Item.FluidCanister, Item.GasCylinder, Item.SpeedModule, Item.EfficiencyModule,
  Item.CapacityModule, Item.FilterModule, Item.MufflingModule, Item.SealModule, Item.ThermalModule,
];

function resources(root: THREE.Group) {
  const owned = new Set<THREE.BufferGeometry | THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    owned.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) owned.add(material);
  });
  return owned;
}

test("all 17 CF4 items have finite centered portable geometry and restrained materials", () => {
  assert.equal(items.length, 17);
  for (const item of items) {
    assert.ok(isWayworksItem(item));
    const root = createWayworksItemModel(item)!;
    const bounds = new THREE.Box3().setFromObject(root, true);
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok(bounds.getCenter(new THREE.Vector3()).length() < 1e-6, `center of ${item}`);
    assert.ok(Math.max(size.x, size.y, size.z) < .7, `portable bounds of ${item}`);
    assert.ok(Math.min(size.x, size.y, size.z) > .07, `solid silhouette of ${item}`);
    assert.ok(root.children.length >= 4, `authored parts of ${item}`);
    for (const resource of resources(root)) {
      if (resource instanceof THREE.BufferGeometry) {
        for (const value of resource.getAttribute("position").array) assert.ok(Number.isFinite(value));
        for (const value of resource.getAttribute("normal").array) assert.ok(Number.isFinite(value));
      } else {
        assert.ok(resource instanceof THREE.MeshStandardMaterial);
        assert.ok(resource.metalness <= .15);
        assert.ok(resource.emissiveIntensity <= .12);
        assert.equal(resource.map, null);
      }
    }
  }
  assert.equal(isWayworksItem(Item.FieldWrench), false);
  assert.equal(createWayworksItemModel(Item.FieldWrench), null);
  assert.equal(createWayworksItemModel(-1 as ItemCode), null);
});

test("fluid and gas vessels have distinct shells, closures, and real handle space", () => {
  const canister = createWayworksItemModel(Item.FluidCanister)!;
  const gas = createWayworksItemModel(Item.GasCylinder)!;
  const vessel = canister.getObjectByName("rectangular-fluid-vessel") as THREE.Mesh;
  const cylinder = gas.getObjectByName("round-gas-pressure-vessel") as THREE.Mesh;
  assert.ok(vessel.geometry instanceof THREE.BoxGeometry);
  assert.ok(cylinder.geometry instanceof THREE.CylinderGeometry);
  for (const name of ["canister-sealed-cap", "canister-handle-bridge", "fluid-level-sight-strip"]) assert.ok(canister.getObjectByName(name));
  for (const name of ["gas-valve-crossbar", "gas-outlet", "gas-cylinder-domed-end"]) assert.ok(gas.getObjectByName(name));
  const bridge = canister.getObjectByName("canister-handle-bridge")!;
  const ray = new THREE.Raycaster(new THREE.Vector3(bridge.position.x, bridge.position.y - .06, -.5), new THREE.Vector3(0, 0, 1));
  assert.equal(ray.intersectObject(canister, true).length, 0, "handle hole has no filled geometry");
});

test("module identity is expressed with distinct physical components", () => {
  const features: [ItemCode, string, number][] = [
    [Item.SpeedModule, "speed-copper-coil", 7],
    [Item.EfficiencyModule, "efficiency-leaf", 2],
    [Item.CapacityModule, "capacity-reservoir", 3],
    [Item.FilterModule, "filter-mesh-vertical", 5],
    [Item.MufflingModule, "muffling-felt-baffle", 4],
    [Item.SealModule, "seal-rubber-gasket", 1],
    [Item.ThermalModule, "thermal-cooling-fin", 5],
  ];
  const faceColors = new Set<number>();
  for (const [item, feature, count] of features) {
    const root = createWayworksItemModel(item)!;
    assert.equal(root.children.filter((part) => part.name === feature).length, count);
    assert.equal(root.children.filter((part) => part.name === "module-contact-pin").length, 4);
    const face = root.getObjectByName("module-faceplate") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    faceColors.add(face.material.color.getHex());
  }
  assert.equal(faceColors.size, 7);
});

test("processed materials distinguish grains, powder, shavings, billets, sheets, and pellets", () => {
  const features: [ItemCode, string][] = [
    [Item.CrushedIron, "crushed-rust-rock"], [Item.EnrichedIron, "bright-refined-facet"],
    [Item.StoneDust, "dust-granule"], [Item.Sawdust, "wood-shaving"],
    [Item.MachineAlloy, "hexagonal-alloy-billet"], [Item.IronSheet, "sheet-edge-fold"],
    [Item.CopperSheet, "sheet-edge-fold"], [Item.BiofuelPellet, "compressed-biofuel-pellet"],
  ];
  for (const [item, feature] of features) assert.ok(createWayworksItemModel(item)!.getObjectByName(feature));
  const iron = createWayworksItemModel(Item.IronSheet)!.getObjectByName("rolled-metal-sheet") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const copper = createWayworksItemModel(Item.CopperSheet)!.getObjectByName("rolled-metal-sheet") as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  assert.notEqual(iron.material.color.getHex(), copper.material.color.getHex());
});

test("every model owns disjoint disposable GPU resources across items and instances", () => {
  const seen = new Set<THREE.BufferGeometry | THREE.Material>();
  for (const item of [...items, ...items]) {
    const owned = resources(createWayworksItemModel(item)!);
    let disposed = 0;
    for (const resource of owned) {
      assert.ok(!seen.has(resource), `no global GPU resource shared for ${item}`);
      seen.add(resource);
      resource.addEventListener("dispose", () => { disposed += 1; });
      resource.dispose();
    }
    assert.equal(disposed, owned.size);
  }
});
