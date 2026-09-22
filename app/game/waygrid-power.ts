import { localFaceForWorldDirection, type MachineState } from "./wayworks";
import { machineKindForBlock } from "./wayworks-integration";
import { workshopRunning } from "./wayworks-stores";

/** Configured dependency, independent of current energy. Direction points from
 * the source machine TO the terminal. Live operations separately pay joules. */
export function configuredWaygridPowerSource(state: MachineState | undefined, sourceBlock: number | undefined | (() => number | undefined),
  locationId: string, dx: number, dy: number, dz: number): boolean {
  if (!state || !state.enabled || !state.workshop || !workshopRunning(state.workshop) || state.ownerId !== "local"
    || state.locationId !== locationId || state.revision >= Number.MAX_SAFE_INTEGER) return false;
  // Live readers may load chunks. Preserve the old cheap exclusions before
  // querying a voxel; detached attachment readers can pass a value directly.
  if (machineKindForBlock(typeof sourceBlock === "function" ? sourceBlock() : sourceBlock) !== state.kind) return false;
  const port = state.ports[localFaceForWorldDirection(state.facing, dx, dy, dz)];
  return port === "output" || port === "both" || port === "service";
}
