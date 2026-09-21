import { BlockId } from "./data";
import { ASTEROID_MACHINE_CODEC, captureAsteroidBlocks, projectAsteroidBlocks } from "./asteroid-attachment-blocks";
import { asteroidAttachmentContainsCell, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { localFaceForWorldDirection, powerTopologyNode, type MachineState, type PowerNode } from "./wayworks";
import { machineKindForBlock } from "./wayworks-integration";
import { materialTopologyNode } from "./wayworks-links";
import { MATERIAL_KINDS, workshopRunning } from "./wayworks-stores";
import { PowerTopologyCache } from "./wayworks-network";
import { validCustodyItem } from "./wayworks-custody";
import { canonicalJson, isUniverseRecord } from "./universe-json";
import { workshopBodyBounds } from "./workshop-body";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";

/** Complete canonical ORBIT voxel preimage/after-image, not loaded chunks only. */
export type AsteroidMachineVoxels = (key: string) => BlockId | undefined;
const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;

function validateMachineComponents(frame: AsteroidAttachmentFrame, machines: Readonly<Record<string, MachineState>>, voxel: AsteroidMachineVoxels) {
  canonicalJson(machines);
  if (!isUniverseRecord(machines)) throw Error("Invalid attached machine map.");
  const nodes = new Map<string, PowerNode>(), sides = new Map<string, boolean>();
  for (const [key, state] of Object.entries(machines)) {
    const side = asteroidAttachmentContainsCell(frame, key, "orbit"), block = voxel(key);
    if (!state || state.locationId !== frame.orbitId || !state.workshop || block === undefined
      || machineKindForBlock(block) !== state.kind || !validCustodyItem({ item: block, count: 1, metadata: { wayworks: state } }))
      throw Error("Invalid attached machine or canonical voxel custody.");
    const [x, y, z] = key.split(",").map(Number);
    nodes.set(key, { key, x, y, z, state, solarExposure: 0 }); sides.set(key, side);
  }
  const topology = new PowerTopologyCache();
  for (const node of nodes.values()) for (const [dx, dy, dz] of directions) {
    const key = `${node.x + dx},${node.y + dy},${node.z + dz}`;
    const side = asteroidAttachmentContainsCell(frame, key, "orbit"), block = voxel(key), other = nodes.get(key);
    if (block === undefined) throw Error("Unresolved attached machine neighborhood.");
    if (machineKindForBlock(block) && !other) throw Error("Missing canonical neighboring machine.");
    if (side === sides.get(node.key)) continue;
    if (other) {
      // A crossing edge is sufficient to split a weak component. Inspect every
      // canonical boundary pair: never truncate the owner to the live 256-node
      // simulation window, and never infer routing from decorative pipe arms.
      const pairs = [[powerTopologyNode(node), powerTopologyNode(other)],
        ...MATERIAL_KINDS.map(resource => [materialTopologyNode(node, resource), materialTopologyNode(other, resource)])];
      for (const pair of pairs) {
        const graph = topology.get(pair);
        if (!graph.ok) throw Error("Invalid attached machine topology.");
        if (graph.edges.get(node.key)!.length || graph.edges.get(other.key)!.length)
          throw Error("Machine network crosses the attached frame boundary.");
      }
    }
    // The terminal is physical; its universe-owned vault is NOT duplicated.
    // Match the live export gate, without waiting for output/power to be present.
    const state = node.state, port = state.workshop.resourcePorts.item[localFaceForWorldDirection(state.facing, dx, dy, dz)];
    if (block === BlockId.WaygridVaultTerminal && state.ownerId === "local" && state.enabled
      && workshopRunning(state.workshop) && state.revision < Number.MAX_SAFE_INTEGER && state.workshop.autoEject
      && ["output", "both"].includes(port)) throw Error("Waygrid terminal coupling crosses the attached frame boundary.");
  }
}

/** Whole configured power/material components, including outside-to-inside
 * connections. Does not simulate, refill, consume, or grant item transfers.
 * Environmental queries, pressure links and machine model bounds are separate
 * global preflight obligations; this is not complete frame admission. */
export function projectAsteroidMachineNetworks(frame: AsteroidAttachmentFrame, canonical: Readonly<Record<string, MachineState>>,
  voxel: AsteroidMachineVoxels): Record<string, MachineState> {
  validateMachineComponents(frame, canonical, voxel);
  return projectAsteroidBlocks(frame, canonical, ASTEROID_MACHINE_CODEC);
}

/** Recheck both complete canonical images against their actual voxel images.
 * Changed stores/configuration still require the host event/resource transaction. */
export function captureAsteroidMachineNetworks(frame: AsteroidAttachmentFrame, canonical: Readonly<Record<string, MachineState>>,
  baseline: Readonly<Record<string, MachineState>>, edited: Readonly<Record<string, MachineState>>,
  voxels: Readonly<{ before: AsteroidMachineVoxels; after: AsteroidMachineVoxels }>): Record<string, MachineState> {
  if (canonicalJson(projectAsteroidMachineNetworks(frame, canonical, voxels.before)) !== canonicalJson(baseline))
    throw Error("Stale attached machine projection.");
  const output = captureAsteroidBlocks(frame, canonical, baseline, edited, ASTEROID_MACHINE_CODEC);
  for (const key of Object.keys(canonical)) if (!Object.hasOwn(output, key)) {
    const block = voxels.after(key);
    if (block === undefined || machineKindForBlock(block)) throw Error("Removed machine state lacks a resolved non-machine voxel.");
  }
  validateMachineComponents(frame, output, voxels.after);
  return output;
}

function assertWholeMachineBodies(frame: AsteroidAttachmentFrame, machines: Readonly<Record<string, MachineState>>) {
  for (const [key, state] of Object.entries(machines)) {
    const [x, y, z] = key.split(",").map(Number), expected = asteroidAttachmentContainsCell(frame, key, "orbit");
    if (asteroidAttachmentVolumeSide(frame, workshopBodyBounds(state.kind, { x, y, z }, state.facing), "orbit") !== expected)
      throw Error("Machine body crosses its attached ownership boundary.");
  }
}
/** Whole configured networks AND conservative all-phase physical models.
 * Environmental queries, pressure links and event/resource authority remain
 * distinct global integration checks, not permissions inferred by this view. */
export function projectAsteroidMachines(frame: AsteroidAttachmentFrame, canonical: Readonly<Record<string, MachineState>>,
  voxel: AsteroidMachineVoxels): Record<string, MachineState> {
  const result = projectAsteroidMachineNetworks(frame, canonical, voxel);
  assertWholeMachineBodies(frame, canonical); return result;
}
export function captureAsteroidMachines(frame: AsteroidAttachmentFrame, canonical: Readonly<Record<string, MachineState>>,
  baseline: Readonly<Record<string, MachineState>>, edited: Readonly<Record<string, MachineState>>,
  voxels: Readonly<{ before: AsteroidMachineVoxels; after: AsteroidMachineVoxels }>): Record<string, MachineState> {
  assertWholeMachineBodies(frame, canonical);
  const result = captureAsteroidMachineNetworks(frame, canonical, baseline, edited, voxels);
  assertWholeMachineBodies(frame, result); return result;
}
