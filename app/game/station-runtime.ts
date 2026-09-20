import { BlockId, cloneSlot, type InventorySlot } from "./data";
import { parseLocationId, type LocationId } from "./location-address";
import { applyStationAction, STATION_CLAIM_RADIUS, validateStationRegistrySave, type StationActor, type StationPosition, type StationRegistrySave } from "./orbital-station";
import { validateSpacefleetSave, type SpacefleetSave, type SpaceVehicleState } from "./space-vehicle";

export type StationBlock = { x: number; y: number; z: number; type: BlockId };
export type StationDockReference = { stationId: string; dockId: string; locationId: LocationId };
export function shipDock(ship: SpaceVehicleState): StationDockReference | null {
  const value = ship.modules.find(module => module.kind === "avionics")?.metadata.stationDock;
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Malformed spacecraft dock reference.");
  const ref = value as StationDockReference;
  if (typeof ref.stationId !== "string" || typeof ref.dockId !== "string" || ref.locationId !== ship.locationId || Object.keys(ref).length !== 3) throw Error("Malformed spacecraft dock reference.");
  return ref;
}

/** A finite EVA construction operation, never a free platform or atmosphere. */
export function planStationFoundation(input: { registry: StationRegistrySave; actor: StationActor; ship: SpaceVehicleState;
  inventory: readonly (InventorySlot | null)[]; name: string; actionId: string; stationId: string;
  blockAt(x: number, y: number, z: number): BlockId | undefined; blocked(point: StationPosition): boolean }) {
  const { registry, actor, ship } = input, address = parseLocationId(registry.locationId);
  if (address.kind !== "orbit" || ship.locationId !== registry.locationId || ship.ownerId !== actor.actorId || ship.phase !== "orbit" || ship.trip || shipDock(ship)) throw Error("Found a station from your stationary, undocked orbital ship.");
  const center: StationPosition = [Math.round(ship.transform.position[0]) + 4, Math.floor(ship.transform.position[1] - .5), Math.round(ship.transform.position[2])];
  const core: StationPosition = [center[0] + 2, center[1], center[2]];
  if (Object.values(registry.stations).some(entry => entry.corePosition.every((value, axis) => Math.abs(value - core[axis]) <= STATION_CLAIM_RADIUS * 2))) throw Error("Move outside the existing station claim before founding another.");
  const blocks: StationBlock[] = [];
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) blocks.push({ x: center[0] + dx, y: center[1], z: center[2] + dz, type: dx === 0 && dz === 0 ? BlockId.OrbitalDock : BlockId.StationTruss });
  blocks.push({ x: core[0], y: core[1], z: core[2], type: BlockId.StationCore });
  for (const block of blocks) if (input.blockAt(block.x, block.y, block.z) !== BlockId.Air || input.blocked([block.x, block.y, block.z])) throw Error("The starter deck needs loaded, empty, unoccupied space beside the ship.");
  const inventory = input.inventory.map(cloneSlot);
  for (const [item, required] of [[BlockId.StationTruss, 8], [BlockId.OrbitalDock, 1], [BlockId.StationCore, 1]]) {
    let remaining = required;
    for (let index = 0; index < inventory.length && remaining; index++) {
      const slot = inventory[index];
      // Sealed machines carry custody metadata and cannot be flattened into a fresh block.
      if (slot?.item !== item || slot.metadata) continue;
      const amount = Math.min(remaining, slot.count); remaining -= amount;
      inventory[index] = slot.count === amount ? null : { ...slot, count: slot.count - amount };
    }
    if (remaining) throw Error("Carry one empty Station Claim Core, one empty Orbital Dock and eight Station Trusses.");
  }
  const context = { actor, locationId: registry.locationId, expectedRevision: registry.revision,
    placements: [{ receiptId: `${input.actionId}:core`, actorId: actor.actorId, locationId: registry.locationId, expectedRevision: registry.revision, kind: "core" as const, position: core },
      { receiptId: `${input.actionId}:dock`, actorId: actor.actorId, locationId: registry.locationId, expectedRevision: registry.revision, kind: "docking-collar" as const, position: center }] };
  const result = applyStationAction(registry, context, { type: "create", actionId: input.actionId, stationId: input.stationId,
    band: address.instanceId as "low" | "high" | "moon-transfer", name: input.name.trim(), icon: "station", coreReceiptId: context.placements[0].receiptId,
    dockId: `${input.stationId}:dock`, dockReceiptId: context.placements[1].receiptId });
  return { registry: result.registry, inventory, blocks };
}

/** Registry occupancy and exact ship pose are a single proposed host checkpoint. */
export function planStationDock(input: { registry: StationRegistrySave; fleet: SpacefleetSave; actor: StationActor; vehicleId: string;
  stationId: string; dockId: string; expectedRegistryRevision: number; expectedVehicleRevision: number; actionId: string; undock: boolean;
  blockAt(x: number, y: number, z: number): BlockId | undefined; blocked?(point: StationPosition): boolean }) {
  const registry = validateStationRegistrySave(input.registry), fleet = structuredClone(validateSpacefleetSave(input.fleet));
  const ship = fleet.vehicles[input.vehicleId], station = registry.stations[input.stationId], dock = station?.docks[input.dockId];
  if (!ship || !station || !dock || ship.revision !== input.expectedVehicleRevision || ship.trip || ship.phase !== "orbit") throw Error("Inspect a stationary orbital ship and its current dock again.");
  if (input.blockAt(...station.corePosition) !== BlockId.StationCore || input.blockAt(...dock.position) !== BlockId.OrbitalDock) throw Error("Repair the physical station core and docking collar first.");
  const current = shipDock(ship);
  if (input.undock ? !current || current.stationId !== station.id || current.dockId !== dock.id : current !== null) throw Error("The ship docking state changed.");
  if (!input.undock && Math.hypot(...ship.transform.position.map((value, axis) => value - dock.position[axis])) > 8) throw Error("Bring the spacecraft within eight blocks of the collar.");
  if (!input.undock) for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) for (let y = 1; y <= 5; y++) {
    const point: StationPosition = [dock.position[0] + x, dock.position[1] + y, dock.position[2] + z];
    if (input.blockAt(...point) !== BlockId.Air || input.blocked?.(point)) throw Error("Clear the docking approach of blocks and other occupants.");
  }
  const result = applyStationAction(registry, { actor: input.actor, locationId: ship.locationId, expectedRevision: input.expectedRegistryRevision,
    vehicle: { vehicleId: ship.vehicleId, ownerId: ship.ownerId, locationId: ship.locationId, revision: ship.revision } },
  { type: input.undock ? "undock" : "dock", actionId: input.actionId, stationId: station.id, dockId: dock.id, vehicleId: ship.vehicleId, vehicleRevision: ship.revision });
  if (result.replayed) return { registry: result.registry, fleet: input.fleet };
  const avionics = ship.modules.find(module => module.kind === "avionics");
  if (!avionics) throw Error("The spacecraft needs its original avionics.");
  if (input.undock) delete avionics.metadata.stationDock;
  else {
    avionics.metadata.stationDock = { stationId: station.id, dockId: dock.id, locationId: registry.locationId };
    ship.transform.position = [dock.position[0], dock.position[1] + .51, dock.position[2]]; ship.velocity = [0, 0, 0];
  }
  ship.journal.push({ actionId: input.actionId, kind: input.undock ? "undock" : "dock", revision: ++ship.revision, transactionId: null });
  const nextFleet = validateSpacefleetSave(fleet);
  validateStationFleetCustody(result.registry, nextFleet);
  return { registry: result.registry, fleet: nextFleet };
}

export function validateStationFleetCustody(registry: StationRegistrySave, fleet: SpacefleetSave): void {
  for (const station of Object.values(registry.stations)) for (const dock of Object.values(station.docks)) if (dock.occupant) {
    const ship = fleet.vehicles[dock.occupant.vehicleId], ref = ship && shipDock(ship);
    if (!ship || ship.locationId !== registry.locationId || ship.ownerId !== dock.occupant.ownerId || ship.revision < dock.occupant.vehicleRevision
      || !ref || ref.stationId !== station.id || ref.dockId !== dock.id || ship.trip || ship.phase !== "orbit"
      || ship.velocity.some(value => value !== 0)
      || ship.transform.position.some((value, axis) => value !== dock.position[axis] + (axis === 1 ? .51 : 0))) throw Error("Station and spacecraft dock custody disagree.");
  }
  for (const ship of Object.values(fleet.vehicles)) if (ship.locationId === registry.locationId) {
    const ref = shipDock(ship);
    if (ref && registry.stations[ref.stationId]?.docks[ref.dockId]?.occupant?.vehicleId !== ship.vehicleId) throw Error("Spacecraft has no matching station dock.");
  }
}
