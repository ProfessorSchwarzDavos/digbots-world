import { BLOCKS, BlockId, Item } from "./data";
import { blockFacingFront, normalizeBlockFacing } from "./block-facing";
import { airCellKey, airZoneDiagnostics, equalizeAirZones, stepAirZone, totalAirGas, type AirConsumer, type AirPoint, type AirZoneState } from "./airzone";
import type { AirZoneWorkerResponse } from "./airzone-worker-protocol";
import { pressureDoorKind, pressureMachineKind } from "./pressure-catalog";
import { createPressureDevice, normalizePressureDevice, parsePressureAction, pressureDoorLower, pressurePoint,
  PRESSURE_LINK_RANGE, type PressureAction, type PressureDevice } from "./pressure-devices";
import { commandAirlock, createAirlockState, stepAirlock, validateHangarGate, type AirlockObservation, type AirlockResult } from "./pressure-airlock";
import { admitAmbientAir, drawHabitatCarbon, equalizeHabitat, operateAtmosphereVent, recoverHabitat, regulateHabitat, supplyHabitat } from "./pressure-habitat";
import { PressureTopology } from "./pressure-topology";
import { workshopAuthorized, workshopGasCapacity, workshopRunning, workshopStoredTotal } from "./wayworks-stores";
import type { MachineState } from "./wayworks";
import type { BodyEnvironment } from "./celestial-environment";

type BoundaryFlux = { oxygenMilliMoles: number; inertMilliMoles: number; co2MilliMoles: number; thermalEnergyMilliJ: number };
export type PressureSave = { schema: 1; nextInstallation: number; zones: AirZoneState[]; devices: Record<string, PressureDevice>;
  boundary?: { admitted: BoundaryFlux; released: BoundaryFlux; topologyLost: BoundaryFlux } };
export type PressureOccupant = AirConsumer & { point: AirPoint };
export type PressureHost = {
  locationId: string; generation: number; minY: number; maxY: number;
  blockAt(point: AirPoint): BlockId | undefined;
  skyTopAt(x: number, z: number): number | undefined;
  loadedColumns(): string[];
  machines: Map<string, MachineState>;
  environment(): BodyEnvironment;
  daylight(): number;
  occupants(): readonly PressureOccupant[];
  obstructed(point: AirPoint): boolean;
  actorStillHolding(actorId: string, key: string): boolean;
  changed(): void; alarm(message: string): void;
};
type Hold = { key: string; installationId: string; command: Extract<PressureAction, { kind: "hold" }>["command"]; start: number; renewed: number; completed: boolean };
export type PressureRates = { oxygenConsumedMmolPerSecond: number; oxygenProducedMmolPerSecond: number; co2ProducedMmolPerSecond: number;
  co2RemovedMmolPerSecond: number; inflowMmolPerSecond: number; outflowMmolPerSecond: number;
  majorConsumers: { kind: string; oxygenMmolPerSecond: number }[] };
const emptyRates = (): PressureRates => ({ oxygenConsumedMmolPerSecond: 0, oxygenProducedMmolPerSecond: 0, co2ProducedMmolPerSecond: 0,
  co2RemovedMmolPerSecond: 0, inflowMmolPerSecond: 0, outflowMmolPerSecond: 0, majorConsumers: [] });

/** Location-owned coordinator. The graph is ephemeral; only machine vessels and
 * saved AirZone memberships own gas. Guests never construct this authority. */
export class PressureRuntime {
  readonly topology: PressureTopology;
  readonly devices = new Map<string, PressureDevice>();
  readonly gates = new Map<string, readonly AirPoint[]>();
  readonly gateErrors = new Map<string, string>();
  readonly consumers = new Map<string, number>();
  private rates = new Map<string, PressureRates>();
  private powerDraw = new Map<string, number>();
  private worker: Worker | null = null;
  private nextInstallation = 1;
  private roof = new Map<string, number>();
  private holds = new Map<string, Hold>();
  private alarms = new Map<string, string>();
  private staticConsumers = new Map<string, { revision: number; fire: number; plants: number }>();
  private elapsed = 0;
  private now = 0;
  private gateSignature = "";
  readonly boundary = { admitted: { oxygenMilliMoles: 0, inertMilliMoles: 0, co2MilliMoles: 0, thermalEnergyMilliJ: 0 },
    released: { oxygenMilliMoles: 0, inertMilliMoles: 0, co2MilliMoles: 0, thermalEnergyMilliJ: 0 } };

  constructor(readonly host: PressureHost, saved?: PressureSave) {
    if (saved?.schema === 1) {
      if (Number.isSafeInteger(saved.nextInstallation) && saved.nextInstallation > 0) this.nextInstallation = saved.nextInstallation;
      for (const [key, raw] of Object.entries(saved.devices ?? {}).slice(0, 256)) {
        const value = normalizePressureDevice(raw); if (pressurePoint(key) && value) this.devices.set(key, value);
      }
    }
    this.topology = new PressureTopology({ flagsAt: point => this.flagsAt(point),
      beforeIntegrityAudit: () => { this.roof.clear(); this.gateSignature = ""; this.refreshGates(); },
      sectionLoaded: point => this.host.blockAt({ x: point.x, y: Math.max(host.minY, Math.min(host.maxY, point.y)), z: point.z }) !== undefined,
      annotations: () => [...this.devices].flatMap(([key, device]) => {
        if (!device.open) return [];
        return this.doorCells(key).map(point => ({ ...point, passable: true, sealMask: 0,
          openFaceCauses: { "+x": `open-door:${key}`, "-x": `open-door:${key}`, "+y": `open-door:${key}`, "-y": `open-door:${key}`, "+z": `open-door:${key}`, "-z": `open-door:${key}` } }));
      }) }, host.locationId, host.generation, message => this.worker?.postMessage(message), saved?.schema === 1 ? saved.zones : []);
    if (typeof Worker !== "undefined") {
      this.worker = new Worker(new URL("./airzone-worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (event: MessageEvent<AirZoneWorkerResponse>) => { if (this.topology.receive(event.data)) host.changed(); };
      this.worker.onerror = () => { this.topology.lastError = "discovery-worker-failed"; host.alarm("Habitat check failed. Keep your helmet sealed."); };
    } else this.topology.lastError = "discovery-worker-unavailable";
    this.syncMachines();
    if (saved?.boundary) for (const kind of ["admitted", "released", "topologyLost"] as const) {
      const flux = saved.boundary[kind];
      if (flux && ["oxygenMilliMoles", "inertMilliMoles", "co2MilliMoles", "thermalEnergyMilliJ"].every(key => Number.isSafeInteger(flux[key as keyof BoundaryFlux]) && flux[key as keyof BoundaryFlux] >= 0))
        Object.assign(kind === "topologyLost" ? this.topology.lost : this.boundary[kind], flux);
    }
  }
  private recordBoundary(kind: "admitted" | "released", flux: BoundaryFlux) {
    for (const key of Object.keys(this.boundary[kind]) as (keyof BoundaryFlux)[]) this.boundary[kind][key] += flux[key];
    if (totalAirGas(flux)) this.host.changed();
  }
  private front(key: string, reverse = false): AirPoint {
    const point = pressurePoint(key)!, machine = this.host.machines.get(key);
    const face = blockFacingFront(normalizeBlockFacing(machine?.facing ?? 0)), sign = reverse ? -1 : 1;
    return { x: point.x + face.x * sign, y: point.y, z: point.z + face.z * sign };
  }
  roomPoint(key: string): AirPoint { return pressurePoint(this.devices.get(key)?.links.room ?? "") ?? this.front(key); }
  zoneAt(point: AirPoint) { return this.topology.zoneAt(point); }
  private solid(point: AirPoint): boolean {
    if (this.closedGateAt(point)) return true;
    if (this.openDoorAt(point)) return false;
    const type = this.host.blockAt(point); return type === undefined || (BLOCKS[type]?.solid ?? false);
  }
  private flagsAt(point: AirPoint): number | undefined {
    const type = this.host.blockAt(point); if (type === undefined) return undefined;
    if (this.solid(point)) return 0;
    const column = `${point.x},${point.z}`; let top = this.roof.get(column);
    if (top === undefined) {
      const opaque = this.host.skyTopAt(point.x, point.z); if (opaque === undefined) return undefined;
      top = opaque;
      for (let y = this.host.maxY; y > opaque; y--) if (this.solid({ x: point.x, y, z: point.z })) { top = y; break; }
      this.roof.set(column, top);
    }
    return 1 | (point.y > top ? 128 : 0);
  }
  exteriorAt(point: AirPoint) { const flags = this.flagsAt(point); return flags !== undefined && (flags & 129) === 129; }
  radiateMachineHeat(key: string, joules: number): number {
    if (!Number.isSafeInteger(joules) || joules <= 0) return 0;
    const zone = this.zoneAt(this.roomPoint(key));
    if (!zone || !["sealed", "depressurized", "leaking"].includes(zone.status)) return 0;
    const result = stepAirZone(zone, { heatMilliJ: joules * 1000 });
    this.topology.replace(result.state); if (result.heatAppliedMilliJ) this.host.changed();
    return result.heatAppliedMilliJ;
  }
  onEdit(point: AirPoint) {
    this.roof.delete(`${point.x},${point.z}`); this.gateSignature = "";
    this.topology.invalidate(point);
  }
  private syncMachines() {
    const usedIds = new Set<string>();
    for (const [key, raw] of this.host.machines) {
      if (!pressureMachineKind(raw.kind) || !raw.workshop.process) continue;
      let machine = raw, id = raw.workshop.process.installationId;
      if (!id || usedIds.has(id)) {
        while ([...this.devices.values()].some(device => device.installationId === `p-${this.nextInstallation}`)) this.nextInstallation++;
        id = `p-${this.nextInstallation++}`;
        machine = { ...raw, revision: raw.revision + 1, workshop: { ...raw.workshop, process: { ...raw.workshop.process, installationId: id } } };
        this.host.machines.set(key, machine); this.host.changed();
      }
      usedIds.add(id);
      if (this.devices.get(key)?.installationId !== id) {
        this.clearSignal(this.devices.get(key));
        this.devices.set(key, createPressureDevice(id));
      }
    }
    for (const key of this.devices.keys()) if (!this.host.machines.get(key)?.workshop.process) { this.clearSignal(this.devices.get(key)); this.devices.delete(key); this.gates.delete(key); }
    this.refreshGates();
  }
  private clearSignal(device: PressureDevice | undefined) {
    const key = device?.links.signal, target = key ? this.host.machines.get(key) : undefined;
    // Release only the exact installation previously bound by this sensor.
    if (key && target && device?.bindings[key] && target.workshop.process?.installationId === device.bindings[key] && target.workshop.signal) {
      this.host.machines.set(key, { ...target, revision: target.revision + 1, workshop: { ...target.workshop, signal: false } }); this.host.changed();
    }
  }
  private refreshGates() {
    const signature = [...this.devices].filter(([key]) => this.host.machines.get(key)?.kind === "hangar-pressure-gate")
      .map(([key, d]) => `${key}:${d.gateWidth}:${d.gateHeight}:${this.host.machines.get(key)!.facing}`).join(";");
    if (this.gateSignature === signature) return; this.gateSignature = signature;
    this.gates.clear(); this.gateErrors.clear();
    for (const [key, device] of this.devices) {
      const machine = this.host.machines.get(key); if (machine?.kind !== "hangar-pressure-gate") continue;
      const center = pressurePoint(key)!, axis = machine.facing % 2 ? "z" : "x";
      const anchor = { ...center, [axis]: center[axis] - Math.floor(device.gateWidth / 2) };
      const result = validateHangarGate({ anchor, axis, width: device.gateWidth, height: device.gateHeight }, point => {
        const type = this.host.blockAt(point);
        return type === undefined ? { kind: "unloaded" } : type === BlockId.HangarFrame || airCellKey(point) === key ? { kind: "frame" }
          : !BLOCKS[type]?.solid ? { kind: "clear" } : { kind: "obstructed" };
      });
      if (result.valid) this.gates.set(key, result.interior);
      else {
        // Frame validity already gates setDoor. Do not turn an unfinished build
        // into an unrelated permanent airlock/alarm lock that repair cannot clear.
        this.gateErrors.set(key, result.reason); device.open = false;
      }
    }
  }
  doorCells(key: string): readonly AirPoint[] {
    const point = pressurePoint(key); if (!point) return [];
    const kind = this.host.machines.get(key)?.kind;
    return kind === "hangar-pressure-gate" ? this.gates.get(key) ?? [] : kind && pressureDoorKind(kind) ? [point, { ...point, y: point.y + 1 }] : [];
  }
  private doorAt(point: AirPoint): string | undefined {
    const key = airCellKey(point), direct = this.host.machines.get(key);
    if (direct && pressureDoorKind(direct.kind)) return key;
    const type = this.host.blockAt(point);
    if (type !== undefined && pressureDoorLower(type)) return airCellKey({ ...point, y: point.y - 1 });
    for (const [gate, cells] of this.gates) if (cells.some(cell => cell.x === point.x && cell.y === point.y && cell.z === point.z)) return gate;
    return undefined;
  }
  openDoorAt(point: AirPoint) { const key = this.doorAt(point); return !!key && !!this.devices.get(key)?.open; }
  closedGateAt(point: AirPoint) {
    for (const [key, cells] of this.gates) if (!this.devices.get(key)?.open && cells.some(cell => cell.x === point.x && cell.y === point.y && cell.z === point.z)) return true;
    return false;
  }
  private setDoor(key: string, open: boolean, locked?: boolean): boolean {
    const device = this.devices.get(key), machine = this.host.machines.get(key);
    if (!device || !machine || !pressureDoorKind(machine.kind) || (machine.kind === "hangar-pressure-gate" && !this.gates.has(key))) return false;
    if (!open && this.doorCells(key).some(point => this.host.obstructed(point))) return false;
    const changed = device.open !== open, lockChanged = locked !== undefined && device.locked !== locked; device.open = open;
    if (locked !== undefined) device.locked = locked;
    if (changed) for (const point of this.doorCells(key)) this.onEdit(point);
    if (changed || lockChanged) { this.host.machines.set(key, { ...machine, revision: machine.revision + 1 }); this.host.changed(); }
    return true;
  }
  private resolve(reference: string | undefined) { const point = reference ? pressurePoint(reference) : null; return point ? this.zoneAt(point) : undefined; }
  private chamberVentIntact(device: PressureDevice) {
    const key = device.links.vent, vent = key ? this.host.machines.get(key) : undefined;
    const controller = device.airlock?.links?.controllerKey ? this.host.machines.get(device.airlock.links.controllerKey)
      : [...this.host.machines.values()].find(machine => machine.workshop.process?.installationId === device.installationId);
    return !!key && vent?.kind === "atmosphere-vent" && vent.ownerId === controller?.ownerId
      && !!device.bindings[key] && vent.workshop.process?.installationId === device.bindings[key];
  }
  private observation(key: string, heldMs = 0): AirlockObservation {
    const device = this.devices.get(key)!, links = device.airlock?.links, machine = this.host.machines.get(key)!;
    const chamber = this.resolve(links?.chamberZoneId), interior = this.resolve(links?.interiorZoneId), exterior = this.resolve(links?.exteriorZoneId);
    const outsidePa = links?.exteriorZoneId === "exterior" ? Math.round(this.host.environment().pressureKPa * 1000) : exterior?.pressureMilliKPa ?? 0;
    const reserve = links ? this.host.machines.get(links.reserveKey) : undefined;
    const bound = Object.entries(device.bindings).every(([point, id]) => this.host.machines.get(point)?.workshop.process?.installationId === id);
    const good = (zone: AirZoneState | undefined) => !!zone && ["sealed", "depressurized", "leaking"].includes(zone.status);
    return { linksIntact: !!links && bound && !!this.devices.get(links.innerDoorKey) && !!this.devices.get(links.outerDoorKey)
      && this.host.machines.get(links.recoveryPumpKey)?.kind === "recovery-pump" && !!reserve?.workshop.process && this.chamberVentIntact(device),
      topologyCurrent: good(chamber) && good(interior) && (links?.exteriorZoneId === "exterior" || good(exterior))
        && !!device.links.vent && this.zoneAt(this.roomPoint(device.links.vent))?.zoneId === chamber?.zoneId,
      powerAvailableJ: machine.enabled && workshopRunning(machine.workshop) ? machine.energyJ : 0,
      chamberPressurePa: chamber?.pressureMilliKPa ?? 0, interiorPressurePa: interior?.pressureMilliKPa ?? 0, exteriorPressurePa: outsidePa,
      innerDoorOpen: !!this.devices.get(links?.innerDoorKey ?? "")?.open, outerDoorOpen: !!this.devices.get(links?.outerDoorKey ?? "")?.open,
      innerDoorObstructed: !!links && this.doorCells(links.innerDoorKey).some(point => this.host.obstructed(point)),
      outerDoorObstructed: !!links && this.doorCells(links.outerDoorKey).some(point => this.host.obstructed(point)),
      occupants: chamber ? this.consumers.get(chamber.zoneId) ?? 0 : 0,
      recoveryRequiredMmol: chamber && chamber.pressureMilliKPa > outsidePa ? Math.ceil(totalAirGas(chamber) * (1 - outsidePa / chamber.pressureMilliKPa)) : 0,
      reserveRoomMmol: reserve ? Math.floor((workshopGasCapacity(reserve.kind, reserve.workshop) - workshopStoredTotal(reserve.workshop, "chemical")) / 24) : 0,
      hostValidatedHeldMs: Math.max(0, Math.floor(heldMs)) };
  }
  private applyAirlock(key: string, result: AirlockResult) {
    const device = this.devices.get(key), machine = this.host.machines.get(key);
    if (!result.accepted || !device?.airlock || !machine || device.airlock.sequence !== result.expectedSequence || machine.energyJ < result.energyCostJ) return false;
    // Resource commands first, then passage changes invalidate derived topology.
    for (const effect of result.commands) {
      if (effect.kind === "recover") {
        const zone = this.resolve(effect.chamberZoneId), reserve = this.host.machines.get(effect.reserveKey), pump = this.host.machines.get(effect.pumpKey);
        if (!zone || !reserve || !pump?.enabled || !workshopRunning(pump.workshop)) continue;
        const moved = recoverHabitat(reserve, zone, Math.min(effect.maxMmol, Math.floor(pump.energyJ * 10)), "capture");
        if (moved.movedMmol) { this.recordFlow(zone, moved.zone); this.host.machines.set(effect.reserveKey, moved.machine); this.topology.replace(moved.zone);
          this.host.machines.set(effect.pumpKey, { ...pump, energyJ: pump.energyJ - Math.ceil(moved.movedMmol / 10), revision: pump.revision + 1 }); }
      } else if (effect.kind === "equalize" || effect.kind === "decompress") {
        let chamber = this.resolve(effect.chamberZoneId);
        const target = this.resolve(effect.targetZoneId); if (!chamber) continue;
        const maximum = effect.kind === "decompress" ? totalAirGas(chamber) : effect.maxMmol;
        if (effect.kind === "equalize" && device.airlock.phase === "equalize-to-interior-target" && device.airlock.links && target) {
          const reserveKey = device.airlock.links.reserveKey, reserve = this.host.machines.get(reserveKey);
          if (reserve) {
            const released = recoverHabitat(reserve, chamber, maximum, "release", target.pressureMilliKPa);
            if (released.movedMmol) { this.recordFlow(chamber, released.zone); this.host.machines.set(reserveKey, released.machine); this.topology.replace(released.zone); chamber = released.zone; }
          }
        }
        if (target && target.zoneId !== chamber.zoneId) {
          const moved = equalizeAirZones(chamber, target, maximum); this.recordFlow(chamber, moved.a); this.recordFlow(target, moved.b); this.topology.replace(moved.a); this.topology.replace(moved.b);
        } else if (effect.targetZoneId === "exterior") {
          const stepped = stepAirZone({ ...chamber, boundaryLeakArea: Math.max(1, chamber.boundaryLeakArea) },
            { leakMilliMolesPerFace: Math.min(1_000_000, maximum), exteriorPressureMilliKPa: Math.round(this.host.environment().pressureKPa * 1000) });
          const admitted = admitAmbientAir({ ...stepped.state, boundaryLeakArea: chamber.boundaryLeakArea }, this.host.environment(), Math.min(1_000_000, effect.kind === "decompress" ? 1_000_000 : maximum));
          this.recordFlow(chamber, stepped.state); this.recordFlow(stepped.state, admitted.zone);
          this.topology.replace(admitted.zone); this.recordBoundary("admitted", admitted.admitted); this.recordBoundary("released", stepped.leaked);
        }
      }
    }
    for (const effect of result.commands) if ("doorKey" in effect && effect.kind !== "decompress") {
      const current = this.devices.get(effect.doorKey);
      const bound = device.bindings[effect.doorKey];
      if (current && bound && current.installationId === bound) current.alarmLocked = false;
      if (current && bound && current.installationId === bound && this.host.machines.get(effect.doorKey)?.workshop.process?.installationId === bound) this.setDoor(effect.doorKey, effect.kind === "open-door" ? true : effect.kind === "close-door" ? false : current.open,
        effect.kind === "lock-door" ? true : effect.kind === "unlock-door" ? false : undefined);
    }
    device.airlock = result.state;
    const current = this.host.machines.get(key)!;
    this.host.machines.set(key, { ...current, energyJ: current.energyJ - result.energyCostJ, revision: current.revision + 1 }); this.host.changed();
    return true;
  }
  /** Facility routing may use this narrow exception after authenticating actor,
   * range, wrench, capability and player revision. It never authorizes a new hold. */
  continuesHold(key: string, actorId: string, action: PressureAction, now: number): boolean {
    const machine = this.host.machines.get(key), device = this.devices.get(key);
    const existingHold = this.holds.get(actorId);
    return action.kind === "hold" && existingHold?.key === key && existingHold.command === action.command
      && existingHold.installationId === device?.installationId && existingHold.installationId === machine?.workshop.process?.installationId
      && (!action.active || now - existingHold.renewed <= 600);
  }
  operate(key: string, actorId: string, heldItem: number | undefined, expectedRevision: number, raw: PressureAction, now: number) {
    const action = parsePressureAction(raw), machine = this.host.machines.get(key), device = this.devices.get(key);
    const fail = (reason: string) => ({ ok: false, reason });
    const continuingHold = !!action && this.continuesHold(key, actorId, action, now);
    if (!action || !machine || !device || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision > machine.revision
      || expectedRevision !== machine.revision && !continuingHold) return fail("Machine changed; inspect it again.");
    if (heldItem !== Item.FieldWrench || !workshopAuthorized(machine.workshop, machine.ownerId, actorId)) return fail("An authorized Field Wrench operator is required.");
    if ((action.kind === "link" || action.kind === "unlink") && device.airlock && (!["idle-inner-safe", "fault"].includes(device.airlock.phase) ||
      device.airlock.links && (this.devices.get(device.airlock.links.innerDoorKey)?.open || this.devices.get(device.airlock.links.outerDoorKey)?.open))) return fail("Stop the cycle and close both doors before changing its links.");
    if (action.kind === "link") {
      const origin = pressurePoint(key)!, target = pressurePoint(action.target);
      if (action.target !== "exterior" && (!target || Math.hypot(target.x - origin.x, target.y - origin.y, target.z - origin.z) > PRESSURE_LINK_RANGE || this.host.blockAt(target) === undefined)) return fail("Links require loaded targets within sixteen blocks.");
      if (machine.kind === "airlock-controller") {
        const hardware = ["inner", "outer", "pump", "reserve", "vent"] as const;
        const samples = ["chamber", "interior", "exterior"] as const;
        if (hardware.some(role => role === action.role) && (action.target === key || hardware.some(role => role !== action.role && device.links[role] === action.target)))
          return fail("Use separate inner door, outer door, recovery pump and gas reserve hardware. The controller cannot fill these roles.");
        if (samples.some(role => role === action.role) && samples.some(role => role !== action.role && device.links[role] === action.target))
          return fail("Chamber, interior and exterior need distinct air-cell samples.");
      }
      const linked = this.host.machines.get(action.target);
      if (["inner", "outer", "pump", "reserve", "vent", "shutter", "signal"].includes(action.role)) {
        if (!linked?.workshop.process?.installationId || linked.ownerId !== machine.ownerId) return fail("Link compatible hardware owned by this workshop.");
        if (["inner", "outer", "shutter"].includes(action.role) && !pressureDoorKind(linked.kind) || action.role === "pump" && linked.kind !== "recovery-pump"
          || action.role === "reserve" && workshopGasCapacity(linked.kind, linked.workshop) <= 0
          || action.role === "vent" && linked.kind !== "atmosphere-vent"
          || action.role === "signal" && (machine.kind !== "pressure-sensor" || action.target === key || linked.kind === "pressure-sensor")) return fail("The target has the wrong hardware role.");
        if (action.role === "signal" && [...this.devices].some(([otherKey, other]) => otherKey !== key && other.links.signal === action.target)) return fail("This signal input already has a pressure sensor owner.");
        device.bindings[action.target] = linked.workshop.process.installationId;
      }
      if (action.role === "signal" && device.links.signal !== action.target) this.clearSignal(device);
      device.links[action.role] = action.target;
    } else if (action.kind === "unlink") { if (action.role === "signal") this.clearSignal(device); delete device.links[action.role]; }
    else if (action.kind === "mode") {
      if (action.mode === "balanced" && machine.kind !== "atmosphere-vent") return fail("Balanced mode requires an Atmosphere Vent.");
      device.mode = action.mode;
    }
    else if (action.kind === "mixture") {
      if (machine.kind !== "atmosphere-vent") return fail("Mixture targets require an Atmosphere Vent.");
      device.mixture = { oxygenPermille: action.oxygenPermille, co2Permille: action.co2Permille };
    }
    else if (action.kind === "valve") {
      if (machine.kind !== "equalization-vent") return fail("Check-valve direction requires an Equalization Vent.");
      device.valveDirection = action.direction;
    }
    else if (action.kind === "sensor") {
      if (machine.kind !== "pressure-sensor") return fail("Threshold settings require a Pressure Sensor.");
      device.sensor = { minimumPressurePa: action.minimumPressurePa, maximumPressurePa: action.maximumPressurePa,
        minimumOxygenPpm: action.minimumOxygenPpm, maximumCo2Ppm: action.maximumCo2Ppm, output: action.output };
    }
    else if (action.kind === "target") { device.targetPressurePa = action.pressurePa; device.targetTemperatureMilliC = action.temperatureMilliC; }
    else if (action.kind === "gate") {
      if (machine.kind !== "hangar-pressure-gate" || device.open) return fail("Close a hangar controller before resizing its formed frame.");
      device.gateWidth = action.width; device.gateHeight = action.height; this.gateSignature = ""; this.refreshGates(); this.onEdit(pressurePoint(key)!);
    } else if (action.kind === "door") {
      if (!pressureDoorKind(machine.kind)) return fail("Use this action on a pressure door.");
      if (device.locked || [...this.devices.values()].some(other => other.airlock?.links && [other.airlock.links.innerDoorKey, other.airlock.links.outerDoorKey].includes(key))) return fail("This door is interlocked. Use its airlock controller.");
      const a = this.zoneAt(this.front(key)), b = this.zoneAt(this.front(key, true));
      const outside = Math.round(this.host.environment().pressureKPa * 1000);
      const unresolved = (zone: AirZoneState | undefined, reverse: boolean) => zone ? !["sealed", "depressurized", "leaking"].includes(zone.status) : !this.exteriorAt(this.front(key, reverse));
      if (action.open && (unresolved(a, false) || unresolved(b, true) || Math.abs((a?.pressureMilliKPa ?? outside) - (b?.pressureMilliKPa ?? outside)) > 5000)) return fail("Unsafe or unchecked differential. Link an airlock for held override.");
      if (machine.energyJ < 100) return fail("The powered door needs 100 J. A linked controller supports a safe manual crank.");
      if (!this.setDoor(key, action.open)) return fail("Door is obstructed or its frame is incomplete.");
      const after = this.host.machines.get(key)!; this.host.machines.set(key, { ...after, energyJ: after.energyJ - 100 });
    } else if (action.kind === "cycle") {
      if (!device.airlock || !this.chamberVentIntact(device)) return fail("Link inner/outer doors, chamber/interior/exterior, chamber vent, recovery pump and reserve first.");
      const result = commandAirlock(device.airlock, { kind: action.command, expectedSequence: device.airlock.sequence }, this.observation(key));
      if (!this.applyAirlock(key, result)) return fail(result.reason ?? result.state.error ?? "Airlock cannot start.");
    } else if (action.kind === "hold") {
      if (!device.airlock) return fail("A configured airlock is required for manual control.");
      const hold = this.holds.get(actorId);
      if (!action.active) this.holds.delete(actorId);
      else {
        const continuing = continuingHold && hold;
        this.holds.set(actorId, { key, installationId: device.installationId, command: action.command, start: continuing ? hold.start : now, renewed: now, completed: continuing ? hold.completed : false });
      }
    }
    if (action.kind === "link" || action.kind === "unlink") {
      const activeTargets = new Set(Object.values(device.links));
      for (const target of Object.keys(device.bindings)) if (!activeTargets.has(target)) delete device.bindings[target];
      const l = device.links;
      if (machine.kind === "airlock-controller" && l.inner && l.outer && l.chamber && l.interior && l.exterior && l.pump && l.reserve && l.vent) device.airlock = createAirlockState({ controllerKey: key,
        innerDoorKey: l.inner, outerDoorKey: l.outer, chamberZoneId: l.chamber, interiorZoneId: l.interior, exteriorZoneId: l.exterior, recoveryPumpKey: l.pump, reserveKey: l.reserve });
      else device.airlock = null;
      this.onEdit(pressurePoint(key)!);
    }
    const current = this.host.machines.get(key)!; this.host.machines.set(key, { ...current, revision: current.revision + 1 }); this.host.changed();
    return { ok: true, reason: "Pressure control updated." };
  }
  update(dt: number, nowMs: number) {
    this.now = nowMs; this.syncMachines();
    const controllers = new Map<string, AirPoint>(), vents = new Map<string, AirPoint>();
    for (const [key, machine] of this.host.machines) {
      if (machine.kind === "life-support-controller" || machine.kind === "airlock-controller") controllers.set(key, this.roomPoint(key));
      if (["atmosphere-vent", "equalization-vent", "recovery-pump", "carbon-scrubber", "thermal-regulator", "pressure-sensor"].includes(machine.kind)) vents.set(key, this.roomPoint(key));
    }
    this.topology.setSources(controllers, vents, this.host.loadedColumns().sort().join(";"));
    this.topology.pump(nowMs);
    this.updateHolds();
    this.elapsed = Math.min(1, this.elapsed + Math.max(0, dt));
    while (this.elapsed >= .2) { this.elapsed -= .2; this.tick(); }
  }
  private tick() {
    this.consumers.clear();
    this.rates.clear();
    const shutterRequests = new Set<string>();
    const startingEnergy = new Map([...this.host.machines].map(([key, machine]) => [key, machine.energyJ]));
    const occupants = this.host.occupants();
    for (const [id, original] of this.topology.zones) {
      if (!["sealed", "depressurized", "leaking"].includes(original.status)) continue;
      const present = occupants.filter(occupant => this.zoneAt(occupant.point)?.zoneId === id).slice(0, 240);
      this.consumers.set(id, present.length);
      let staticEffects = this.staticConsumers.get(id);
      if (!staticEffects || staticEffects.revision !== original.topologyRevision) {
        let fire = 0, plants = 0;
        for (const cell of original.cellKeys) {
          const point = pressurePoint(cell)!, block = this.host.blockAt(point), name = block === undefined ? "" : BLOCKS[block]?.name ?? "";
          if (/fire|torch/i.test(name)) fire++;
          if (/crop|sapling|flower/i.test(name) && (this.host.skyTopAt(point.x, point.z) ?? Infinity) <= point.y + 6) plants++;
        }
        staticEffects = { revision: original.topologyRevision, fire, plants }; this.staticConsumers.set(id, staticEffects);
      }
      const consumers: AirConsumer[] = [...present.map(({ id, kind, oxygenMilliMoles, co2MilliMoles }) => ({ id, kind, oxygenMilliMoles, co2MilliMoles })),
        ...(staticEffects.fire ? [{ id: `fire:${id}`, kind: "fire" as const, oxygenMilliMoles: Math.min(1000, staticEffects.fire * 2), co2MilliMoles: Math.min(1000, staticEffects.fire * 2) }] : [])];
      const stepped = stepAirZone(original, { consumers, plantConversionMilliMoles: this.host.daylight() >= .2 ? Math.min(1000, staticEffects.plants) : 0,
        leakMilliMolesPerFace: original.status === "leaking" ? 2000 : 0, exteriorPressureMilliKPa: Math.round(this.host.environment().pressureKPa * 1000) });
      const admitted = original.status === "leaking" ? admitAmbientAir(stepped.state, this.host.environment(), Math.min(1_000_000, original.boundaryLeakArea * 2000)) : null;
      const rates = emptyRates(), byKind = new Map<string, number>();
      for (const consumer of consumers) if (!stepped.unmetConsumerIds.includes(consumer.id)) byKind.set(consumer.kind, (byKind.get(consumer.kind) ?? 0) + consumer.oxygenMilliMoles * 5);
      rates.majorConsumers = [...byKind].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([kind, oxygenMmolPerSecond]) => ({ kind, oxygenMmolPerSecond }));
      rates.oxygenConsumedMmolPerSecond = stepped.consumedOxygenMilliMoles * 5;
      rates.co2ProducedMmolPerSecond = stepped.producedCo2MilliMoles * 5;
      rates.oxygenProducedMmolPerSecond = stepped.plantConvertedMilliMoles * 5;
      rates.co2RemovedMmolPerSecond = stepped.plantConvertedMilliMoles * 5;
      rates.inflowMmolPerSecond = (admitted?.movedMmol ?? 0) * 5;
      rates.outflowMmolPerSecond = totalAirGas(stepped.leaked) * 5; this.rates.set(id, rates);
      this.topology.replace(admitted?.zone ?? stepped.state); this.recordBoundary("released", stepped.leaked);
      if (admitted) this.recordBoundary("admitted", admitted.admitted);
      if (stepped.consumedOxygenMilliMoles || stepped.plantConvertedMilliMoles || totalAirGas(stepped.leaked)) this.host.changed();
    }
    for (const [key, device] of this.devices) {
      let machine = this.host.machines.get(key)!;
      const interlocked = [...this.devices.values()].some(other => other.airlock?.links && [other.airlock.links.innerDoorKey, other.airlock.links.outerDoorKey].includes(key));
      if (pressureDoorKind(machine.kind) && !interlocked && device.open && (!machine.enabled || machine.energyJ === 0 || !workshopRunning(machine.workshop))) this.setDoor(key, false);
      const zone = this.zoneAt(this.roomPoint(key));
      if (zone && machine.enabled && workshopRunning(machine.workshop) && device.mode !== "off") {
        const flow = Math.floor(2000 * (machine.workshop.process?.flowPermille ?? 1000) / 1000);
        const result = machine.kind === "life-support-controller" ? supplyHabitat(machine, zone, flow, device.targetPressurePa)
          : machine.kind === "atmosphere-vent" ? operateAtmosphereVent(machine, zone, device, flow)
          : machine.kind === "carbon-scrubber" ? drawHabitatCarbon(machine, zone, flow)
            : machine.kind === "thermal-regulator" ? regulateHabitat(machine, zone, device.targetTemperatureMilliC)
              : machine.kind === "recovery-pump" && (device.mode === "capture" || device.mode === "release") ? recoverHabitat(machine, zone, flow, device.mode, device.targetPressurePa) : null;
        if (result && result.machine !== machine) { this.recordFlow(zone, result.zone); machine = result.machine; this.host.machines.set(key, machine); this.topology.replace(result.zone); this.host.changed(); }
        if (machine.kind === "equalization-vent" && machine.energyJ >= 100) {
          const other = this.zoneAt(this.front(key, true));
          if (other && other.zoneId !== zone.zoneId && ["sealed", "depressurized", "leaking"].includes(other.status)) {
            const moved = equalizeHabitat(zone, other, flow, device.targetPressurePa, device.valveDirection);
            if (moved.transferredMilliMoles) { this.recordFlow(zone, moved.a); this.recordFlow(other, moved.b); this.topology.replace(moved.a); this.topology.replace(moved.b); this.host.machines.set(key, { ...machine, energyJ: machine.energyJ - 100, revision: machine.revision + 1 }); this.host.changed(); }
          }
        }
      }
      if (device.airlock) this.applyAirlock(key, stepAirlock(device.airlock, this.observation(key), 200));
      const currentZone = this.zoneAt(this.roomPoint(key));
      if (["life-support-controller", "pressure-sensor", "airlock-controller"].includes(machine.kind)) {
        let danger = currentZone ? airZoneDiagnostics(currentZone).reasons.join(", ") : "room unknown";
        if (machine.kind === "pressure-sensor") {
          const readings = currentZone ? airZoneDiagnostics(currentZone) : null, settings = device.sensor;
          const ready = machine.enabled && workshopRunning(machine.workshop) && device.mode !== "off" && machine.energyJ >= 10;
          danger = !ready ? "sensor unpowered or disabled" : !currentZone || !["sealed", "depressurized", "leaking"].includes(currentZone.status) ? "room unchecked"
            : currentZone.pressureMilliKPa < settings.minimumPressurePa || currentZone.pressureMilliKPa > settings.maximumPressurePa ? "pressure threshold"
              : readings!.oxygenPartsPerMillion < settings.minimumOxygenPpm ? "oxygen threshold" : readings!.co2PartsPerMillion > settings.maximumCo2Ppm ? "carbon dioxide threshold" : "";
          const signal = ready && (settings.output === "alarm" ? !!danger : !danger);
          const current = this.host.machines.get(key)!;
          if (ready || current.workshop.signal !== signal) this.host.machines.set(key, { ...current, energyJ: current.energyJ - (ready ? 10 : 0), revision: current.revision + 1, workshop: { ...current.workshop, signal } });
          const targetKey = device.links.signal, target = targetKey ? this.host.machines.get(targetKey) : undefined;
          if (targetKey && target?.ownerId === machine.ownerId && device.bindings[targetKey] && target.workshop.process?.installationId === device.bindings[targetKey] && target.workshop.signal !== signal) {
            this.host.machines.set(targetKey, { ...target, revision: target.revision + 1, workshop: { ...target.workshop, signal } }); this.host.changed();
          }
          if (ready || current.workshop.signal !== signal) this.host.changed();
        }
        const shutter = device.links.shutter, bound = shutter ? device.bindings[shutter] : undefined;
        const validShutter = !!shutter && !!bound && this.devices.get(shutter)?.installationId === bound && this.host.machines.get(shutter)?.workshop.process?.installationId === bound
          && pressureDoorKind(this.host.machines.get(shutter)!.kind) && this.host.machines.get(shutter)?.ownerId === machine.ownerId;
        const message = shutter && !validShutter ? "broken-shutter-link" : device.airlock?.error ?? danger;
        if (this.alarms.get(key) !== message) { this.alarms.set(key, message); if (message) this.host.alarm(`Habitat ${key}: ${message}.`); }
        if (shutter && validShutter && message) shutterRequests.add(shutter);
      }
    }
    // Alarm ownership is aggregated so one safe sensor cannot unlock another's
    // alarm, an airlock, or an independently locked shutter. Clearing never opens.
    for (const shutter of shutterRequests) {
      const device = this.devices.get(shutter)!;
      if ([...this.devices.values()].some(other => other.airlock?.links && [other.airlock.links.innerDoorKey, other.airlock.links.outerDoorKey].includes(shutter))) continue;
      if (!device.locked) device.alarmLocked = true;
      this.setDoor(shutter, false, true);
    }
    for (const [shutter, device] of this.devices) if (device.alarmLocked && !shutterRequests.has(shutter)) {
      if ([...this.devices.values()].some(other => other.airlock?.links && [other.airlock.links.innerDoorKey, other.airlock.links.outerDoorKey].includes(shutter))) continue;
      if (this.setDoor(shutter, false, false)) device.alarmLocked = false;
    }
    this.powerDraw.clear();
    for (const [key, before] of startingEnergy) this.powerDraw.set(key, Math.max(0, before - (this.host.machines.get(key)?.energyJ ?? before)) * 5);
  }
  private recordFlow(before: AirZoneState, after: AirZoneState) {
    const rates = this.rates.get(before.zoneId); if (!rates) return;
    rates.inflowMmolPerSecond += Math.max(0, totalAirGas(after) - totalAirGas(before)) * 5;
    rates.outflowMmolPerSecond += Math.max(0, totalAirGas(before) - totalAirGas(after)) * 5;
    rates.co2RemovedMmolPerSecond += Math.max(0, before.co2MilliMoles - after.co2MilliMoles) * 5;
  }
  private updateHolds() {
    for (const [actor, hold] of this.holds) {
      if (this.now - hold.renewed > 600 || !this.host.actorStillHolding(actor, hold.key)
        || this.devices.get(hold.key)?.installationId !== hold.installationId || this.host.machines.get(hold.key)?.workshop.process?.installationId !== hold.installationId) { this.holds.delete(actor); continue; }
      // One continuous physical hold is one command. Heartbeats after completion
      // must not rearm against the topology invalidated by that same door opening.
      if (hold.completed || this.now - hold.start < (hold.command.startsWith("dangerous") ? 3000 : 8000)) continue;
      const device = this.devices.get(hold.key); if (!device?.airlock) continue;
      const result = commandAirlock(device.airlock, { kind: hold.command, expectedSequence: device.airlock.sequence }, this.observation(hold.key, this.now - hold.start));
      if (result.accepted) { this.applyAirlock(hold.key, result); hold.completed = true; }
    }
  }
  environmentAt(point: AirPoint): BodyEnvironment {
    const outside = this.host.environment(), zone = this.zoneAt(point); if (!zone) return outside;
    const total = totalAirGas(zone), diagnostics = airZoneDiagnostics(zone);
    return { ...outside, pressureKPa: zone.pressureMilliKPa / 1000, oxygenFraction: total ? zone.oxygenMilliMoles / total : 0,
      inertFraction: total ? zone.inertMilliMoles / total : 0, co2Fraction: total ? zone.co2MilliMoles / total : 0,
      breathable: diagnostics.breathable, requiresPressureSuit: zone.status !== "sealed" || zone.pressureMilliKPa < 35000 || zone.pressureMilliKPa > 160000,
      temperatureC: [zone.temperatureMilliC / 1000, zone.temperatureMilliC / 1000], corrosive: false };
  }
  diagnosticsFor(key: string) {
    const point = this.roomPoint(key), zone = this.zoneAt(point), device = this.devices.get(key), topology = (zone ? this.topology.topologies.get(zone.zoneId) : undefined) ?? this.topology.diagnostics.get(airCellKey(point));
    const rates = zone ? this.rates.get(zone.zoneId) : undefined;
    const drawW = this.powerDraw.get(key);
    return { device, zone, ...(rates ? { rates } : {}), ...(drawW !== undefined ? { power: { drawW, source: "local-buffer" as const } } : {}), ...(zone ? airZoneDiagnostics(zone, (rates?.oxygenConsumedMmolPerSecond ?? 0) / 5) : {}),
      occupants: zone ? this.consumers.get(zone.zoneId) ?? 0 : 0, capacity: topology?.capacity ?? 0, bounds: topology?.bounds ?? null,
      leak: topology?.leaks[0] ?? topology?.unknownBoundaries[0] ?? null, checkAgeMs: zone ? this.now - (this.topology.checkedAt.get(zone.zoneId) ?? this.now) : 0,
      topologyRevision: this.topology.revision, error: this.host.machines.get(key)?.kind === "airlock-controller" && !this.chamberVentIntact(device!) ? "link-chamber-vent" : this.gateErrors.get(key) ?? this.topology.lastError };
  }
  snapshot(): PressureSave { return { schema: 1, nextInstallation: this.nextInstallation, zones: this.topology.snapshot(), boundary: { ...structuredClone(this.boundary), topologyLost: { ...this.topology.lost } }, devices: Object.fromEntries([...this.devices].map(([key, value]) => [key, structuredClone(value)])) }; }
  dispose() { this.holds.clear(); this.topology.dispose(); this.worker?.terminate(); this.worker = null; }
}
