import { BLOCKS, BlockId } from "./data";
import { localFaceForWorldDirection, machineCapacity, type MachineState } from "./wayworks";
import { machineKindForBlock } from "./wayworks-integration";
import { chemistryReservoirs } from "./pressure-chemistry";
import { workshopReservoirCapacity, workshopRunning } from "./wayworks-stores";
import { portAllowsTransfer, type PowerTopologyFace } from "./wayworks-network";

export const CONNECTION_DIRECTIONS = [
  ["front", 0, 0, -1], ["back", 0, 0, 1], ["left", -1, 0, 0],
  ["right", 1, 0, 0], ["top", 0, 1, 0], ["bottom", 0, -1, 0],
] as const;
export type ConnectionMask = Record<PowerTopologyFace, boolean>;
const emptyMask = (): ConnectionMask => ({ front: false, back: false, left: false, right: false, top: false, bottom: false });
type BlockReader = (x: number, y: number, z: number) => BlockId | undefined;
type Resource = "energy" | "fluid" | "chemical" | "heat";

/** Configured physical joints, not a claim that material is flowing this tick.
 * No stores, revisions, caches or save fields are mutated by presentation. */
export function transportConnections(state: MachineState, x: number, y: number, z: number,
  location: string, blockAt: BlockReader, machineAt: (x: number, y: number, z: number) => MachineState | undefined): ConnectionMask {
  const result = emptyMask();
  const resource: Resource | null = state.kind === "grid-cable" ? "energy" : state.kind === "liquid-pipe" ? "fluid"
    : state.kind === "gasline" ? "chemical" : state.kind === "heat-conduit" ? "heat" : null;
  if (!resource || !state.enabled || !workshopRunning(state.workshop) || state.locationId !== location
    || machineKindForBlock(blockAt(x, y, z)) !== state.kind) return result;
  const port = (machine: MachineState, face: PowerTopologyFace) => {
    const mode = resource === "energy" ? machine.ports[face] : machine.workshop.resourcePorts[resource][face];
    return resource !== "energy" && mode === "both" && machine.workshop.process?.backflow === false ? "input" : mode;
  };
  const capable = (machine: MachineState, direction: "input" | "output") => {
    if (resource === "energy") return machine.kind === "grid-cable" || machineCapacity(machine.kind, machine.workshop) > 0;
    if (resource === "heat") return true; // All workshop stores have a finite heat reservoir.
    return chemistryReservoirs(machine.kind, direction, resource).some(slot => workshopReservoirCapacity(machine.kind, machine.workshop, slot) > 0);
  };
  for (const [, dx, dy, dz] of CONNECTION_DIRECTIONS) {
    const neighbor = machineAt(x + dx, y + dy, z + dz), face = localFaceForWorldDirection(state.facing, dx, dy, dz);
    if (!neighbor || !neighbor.enabled || !workshopRunning(neighbor.workshop) || neighbor.locationId !== location || neighbor.ownerId !== state.ownerId
      || neighbor.workshop.channel !== state.workshop.channel
      || machineKindForBlock(blockAt(x + dx, y + dy, z + dz)) !== neighbor.kind) continue;
    const a = port(state, face), b = port(neighbor, localFaceForWorldDirection(neighbor.facing, -dx, -dy, -dz));
    result[face] = (portAllowsTransfer(a, b) && capable(state, "output") && capable(neighbor, "input"))
      || (portAllowsTransfer(b, a) && capable(neighbor, "output") && capable(state, "input"));
  }
  return result;
}

export type WindowArm = "front" | "back" | "left" | "right";
export type WindowLayout = Readonly<{ flat: boolean; arms: Readonly<Record<WindowArm, boolean>>;
  joined: Readonly<ConnectionMask>; upper: Readonly<Record<WindowArm, boolean>>; lower: Readonly<Record<WindowArm, boolean>> }>;
const horizontal = CONNECTION_DIRECTIONS.slice(0, 4);

/** Local, bounded and order-independent. Horizontal sheets without vertical
 * supports are skylights; vertical glazing follows wall runs, bends and tees.
 * Ambiguous isolated columns use their saved cardinal facing as a stable hint. */
export function windowLayout(x: number, y: number, z: number, facing: number, blockAt: BlockReader): WindowLayout {
  const support = (block: BlockId | undefined) => block === BlockId.ReinforcedWindow ? 2
    : block !== undefined && BLOCKS[block]?.solid && BLOCKS[block]?.shape === "cube" ? 1 : 0;
  const flatAt = (a: number, b: number, c: number) => {
    const sx = support(blockAt(a - 1, b, c)) + support(blockAt(a + 1, b, c));
    const sz = support(blockAt(a, b, c - 1)) + support(blockAt(a, b, c + 1));
    const sy = support(blockAt(a, b - 1, c)) + support(blockAt(a, b + 1, c));
    return sx + sz >= 3 && Math.min(sx, sz) > sy;
  };
  const armsAt = (a: number, b: number, c: number) => {
    const arms = { front: false, back: false, left: false, right: false };
    for (const [face, dx, , dz] of horizontal) arms[face as WindowArm] = blockAt(a + dx, b, c + dz) === BlockId.ReinforcedWindow && !flatAt(a + dx, b, c + dz);
    const hasX = arms.left || arms.right, hasZ = arms.front || arms.back;
    if (hasX && hasZ) return arms; // True corner/tee: half panes meet at the central mullion.
    let axisX = hasX;
    if (!hasX && !hasZ) {
      let sx = 0, sz = 0;
      for (const dy of [-1, 0, 1]) {
        if (dy && blockAt(a, b + dy, c) !== BlockId.ReinforcedWindow) continue;
        sx += support(blockAt(a - 1, b + dy, c)) + support(blockAt(a + 1, b + dy, c));
        sz += support(blockAt(a, b + dy, c - 1)) + support(blockAt(a, b + dy, c + 1));
      }
      axisX = sx === sz ? facing % 2 === 0 : sx > sz;
    }
    arms.left = arms.right = axisX; arms.front = arms.back = !axisX;
    return arms;
  };
  const flat = flatAt(x, y, z), arms = armsAt(x, y, z), joined = emptyMask();
  for (const [face, dx, dy, dz] of CONNECTION_DIRECTIONS) joined[face] = blockAt(x + dx, y + dy, z + dz) === BlockId.ReinforcedWindow
    && flatAt(x + dx, y + dy, z + dz) === flat;
  const upper = armsAt(x, y + 1, z), lower = armsAt(x, y - 1, z);
  for (const [face] of horizontal) {
    upper[face as WindowArm] &&= joined.top; lower[face as WindowArm] &&= joined.bottom;
  }
  return { flat, arms, joined, upper, lower };
}
