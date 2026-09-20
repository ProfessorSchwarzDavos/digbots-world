import { airCellKey, airZoneIntersectsEdit, isAirTopologyResultCurrent, normalizeAirZoneState, parseAirCellKey,
  remapAirZones, type AirDenseSection, type AirEpochs, type AirPoint, type AirSnapshotCell, type AirTopologyResult, type AirZoneState } from "./airzone";
import type { AirZoneWorkerRequest, AirZoneWorkerResponse } from "./airzone-worker-protocol";

export type PressureWorldView = {
  /** Undefined is unloaded. A defined byte uses AirDenseSection's exact flag layout. */
  flagsAt(point: AirPoint): number | undefined;
  sectionLoaded(origin: AirPoint): boolean;
  annotations?(): readonly AirSnapshotCell[];
  /** Drop derived world visibility caches before the infrequent integrity scan. */
  beforeIntegrityAudit?(): void;
};
type Batch = { old: AirZoneState[]; seeds: Set<string>; seen: Set<string>; results: AirTopologyResult[];
  sections: Map<string, AirDenseSection>; build: Set<string>; seed: AirPoint | null; failed: boolean };
const originOf = (point: AirPoint): AirPoint => ({ x: Math.floor(point.x / 16) * 16, y: Math.floor(point.y / 16) * 16, z: Math.floor(point.z / 16) * 16 });
const DELTAS = { "+x": [1, 0, 0], "-x": [-1, 0, 0], "+y": [0, 1, 0], "-y": [0, -1, 0], "+z": [0, 0, 1], "-z": [0, 0, -1] } as const;
export const PRESSURE_INTEGRITY_INTERVAL_MS = 300_000;

/** Worker-owned traversal with bounded, incremental main-thread section copying.
 * Missing loaded sections are requested on demand, not silently treated as walls.
 * No rendered meshes, serialized graph or second gas authority is retained here. */
export class PressureTopology {
  readonly zones = new Map<string, AirZoneState>();
  readonly topologies = new Map<string, AirTopologyResult>();
  readonly cellZones = new Map<string, string>();
  readonly diagnostics = new Map<string, AirTopologyResult>();
  readonly checkedAt = new Map<string, number>();
  revision = 0;
  lastError: string | null = null;
  lost = { oxygenMilliMoles: 0, inertMilliMoles: 0, co2MilliMoles: 0, thermalEnergyMilliJ: 0 };
  private requestId = 0;
  private inFlight: AirEpochs | null = null;
  private batch: Batch | null = null;
  private cache = new Map<string, AirDenseSection>();
  private dirty = new Set<string>();
  private pending = new Set<string>();
  private controllers = new Map<string, AirPoint>();
  private vents = new Map<string, AirPoint>();
  private sourceSignature = "";
  private loadedSignature = "";
  private nowMs = 0;
  private nextIntegrityAt: number | null = null;
  private integritySections: string[] | null = null;

  constructor(readonly world: PressureWorldView, readonly locationId: string, readonly generation: number,
    readonly post: (message: AirZoneWorkerRequest) => void, saved: readonly unknown[] = []) {
    for (const raw of saved.slice(0, 128)) {
      const state = normalizeAirZoneState(raw);
      if (!state || state.locationId !== locationId || state.cellKeys.some(key => this.cellZones.has(key))) { this.lastError = "invalid-saved-zone"; continue; }
      this.zones.set(state.zoneId, state); this.dirty.add(state.zoneId);
      for (const key of state.cellKeys) this.cellZones.set(key, state.zoneId);
    }
  }
  zoneAt(point: AirPoint) { const id = this.cellZones.get(airCellKey(point)); return id ? this.zones.get(id) : undefined; }
  replace(state: AirZoneState) {
    if (state.locationId !== this.locationId || !this.zones.has(state.zoneId)) throw new Error("unknown-zone-authority");
    this.zones.set(state.zoneId, state);
  }
  private retire() {
    if (this.inFlight) this.post({ type: "cancel", epochs: this.inFlight });
    this.inFlight = null;
    if (this.batch) {
      for (const old of this.batch.old) this.dirty.add(old.zoneId);
      for (const seed of this.batch.seeds) this.pending.add(seed);
      if (this.batch.seed) this.pending.add(airCellKey(this.batch.seed));
    }
    this.batch = null;
  }
  invalidate(point: AirPoint) {
    this.integritySections = null;
    this.revision++; this.retire();
    const editedOrigin = originOf(point);
    // A roof edit changes exterior visibility down the whole section column.
    for (const key of this.cache.keys()) { const origin = parseAirCellKey(key); if (origin.x === editedOrigin.x && origin.z === editedOrigin.z) this.cache.delete(key); }
    for (const [id, zone] of this.zones) {
      const topology = this.topologies.get(id);
      const intersects = topology ? airZoneIntersectsEdit(topology, point) : zone.cellKeys.some(key => {
        const p = parseAirCellKey(key); return Math.abs(p.x - point.x) <= 1 && Math.abs(p.y - point.y) <= 1 && Math.abs(p.z - point.z) <= 1;
      });
      if (intersects) { this.dirty.add(id); this.zones.set(id, { ...zone, status: "checking" }); }
    }
    for (const seed of this.controllers.values()) {
      const key = airCellKey(seed), id = this.cellZones.get(key), diagnostic = this.diagnostics.get(key);
      if (id && this.dirty.has(id) || diagnostic && airZoneIntersectsEdit(diagnostic, point)
        || Math.max(Math.abs(seed.x - point.x), Math.abs(seed.y - point.y), Math.abs(seed.z - point.z)) <= 1) this.pending.add(key);
    }
  }
  /** One cached section per idle frame, every five minutes. Compare before
   * invalidating: unchanged rooms never flicker to checking or interrupt cycles.
   * This is a bounded safety net for a missed edit event, not a per-tick fill. */
  private auditIntegrity(nowMs: number) {
    if (this.nextIntegrityAt === null) this.nextIntegrityAt = nowMs + PRESSURE_INTEGRITY_INTERVAL_MS;
    if (!this.integritySections) {
      if (nowMs < this.nextIntegrityAt) return;
      this.nextIntegrityAt = nowMs + PRESSURE_INTEGRITY_INTERVAL_MS;
      this.world.beforeIntegrityAudit?.();
      this.integritySections = [...this.cache.keys()];
    }
    const key = this.integritySections.shift();
    if (!this.integritySections.length) this.integritySections = null;
    if (!key) return;
    const section = this.cache.get(key);
    if (!section) return;
    const origin = section.origin;
    let changed = !this.world.sectionLoaded(origin);
    for (let y = 0; y < 16 && !changed; y++) for (let z = 0; z < 16 && !changed; z++) for (let x = 0; x < 16 && !changed; x++) {
      changed = this.world.flagsAt({ x: origin.x + x, y: origin.y + y, z: origin.z + z }) !== section.flags[x + 16 * z + 256 * y];
    }
    if (!changed) return;
    this.revision++; this.retire();
    // A missed roof change can affect visibility lower in the same column.
    // Adjacent columns cover cells whose boundary lies across a section edge.
    const touchesColumn = (point: AirPoint) => Math.floor((point.x - 1) / 16) <= origin.x / 16
      && Math.floor((point.x + 1) / 16) >= origin.x / 16
      && Math.floor((point.z - 1) / 16) <= origin.z / 16
      && Math.floor((point.z + 1) / 16) >= origin.z / 16;
    for (const cached of this.cache.keys()) {
      const p = parseAirCellKey(cached);
      if (p.x === origin.x && p.z === origin.z) this.cache.delete(cached);
    }
    for (const [id, zone] of this.zones) if (zone.cellKeys.some(cell => touchesColumn(parseAirCellKey(cell)))) {
      this.dirty.add(id); this.zones.set(id, { ...zone, status: "checking" });
    }
    for (const seed of this.controllers.values()) if (touchesColumn(seed)) this.pending.add(airCellKey(seed));
  }
  setSources(controllers: ReadonlyMap<string, AirPoint>, vents: ReadonlyMap<string, AirPoint>, loadedSignature: string) {
    const signature = JSON.stringify([[...controllers].sort(), [...vents].sort()]);
    if (loadedSignature !== this.loadedSignature) {
      const before = new Set(this.loadedSignature.split(";").filter(Boolean)), after = new Set(loadedSignature.split(";").filter(Boolean));
      const changed = [...new Set([...before, ...after])].filter(key => before.has(key) !== after.has(key)).map(key => key.split(",").map(Number));
      const intersects = (point: AirPoint) => changed.some(([x, z]) => Number.isInteger(x) && Number.isInteger(z)
        && Math.floor((point.x - 1) / 16) <= x && Math.floor((point.x + 1) / 16) >= x
        && Math.floor((point.z - 1) / 16) <= z && Math.floor((point.z + 1) / 16) >= z);
      this.loadedSignature = loadedSignature;
      let affected = false;
      for (const [id, zone] of this.zones) if (zone.cellKeys.some(key => intersects(parseAirCellKey(key)))) {
        this.dirty.add(id); this.zones.set(id, { ...zone, status: "checking" }); affected = true;
      }
      for (const [seed, result] of this.diagnostics) if (result.unknownBoundaries.some(leak => intersects(leak.cell))) { this.pending.add(seed); affected = true; }
      for (const p of controllers.values()) if (intersects(p) || !this.cellZones.has(airCellKey(p))) { this.pending.add(airCellKey(p)); affected = true; }
      for (const key of this.cache.keys()) { const p = parseAirCellKey(key); if (changed.some(([x, z]) => p.x / 16 === x && p.z / 16 === z)) this.cache.delete(key); }
      if (affected) { this.revision++; this.retire(); }
    }
    if (signature === this.sourceSignature) return;
    this.sourceSignature = signature;
    const before = new Map([...this.controllers, ...this.vents]), after = new Map([...controllers, ...vents]);
    this.controllers = new Map(controllers); this.vents = new Map(vents);
    for (const [id, point] of before) if (!after.has(id) || airCellKey(after.get(id)!) !== airCellKey(point)) this.invalidate(point);
    for (const [id, point] of after) if (!before.has(id) || airCellKey(before.get(id)!) !== airCellKey(point)) this.invalidate(point);
  }
  private annotations(): AirSnapshotCell[] {
    const entries = new Map<string, AirSnapshotCell>((this.world.annotations?.() ?? []).map(cell => [airCellKey(cell), cell]));
    for (const [kind, sources] of [["controllerIds", this.controllers], ["ventIds", this.vents]] as const) {
      for (const [id, point] of sources) {
        const flags = this.world.flagsAt(point); if (flags === undefined) continue;
        const key = airCellKey(point), previous = entries.get(key);
        entries.set(key, { ...point, passable: !!(flags & 1), sealMask: (flags >>> 1) & 63, exterior: !!(flags & 128),
          ...previous, [kind]: [...previous?.[kind] ?? [], id] });
      }
    }
    return [...entries.values()];
  }
  /** Call every frame; at most four 16³ sections are copied per call. */
  pump(nowMs: number) {
    this.nowMs = nowMs;
    if (this.inFlight) return;
    if (!this.batch && !this.dirty.size && !this.pending.size) this.auditIntegrity(nowMs);
    if (!this.batch) {
      if (!this.dirty.size && !this.pending.size) return;
      const old = [...this.dirty].flatMap(id => this.zones.get(id) ? [this.zones.get(id)!] : []);
      const seeds = new Set(this.pending);
      for (const zone of old) for (const key of zone.cellKeys) seeds.add(key);
      this.dirty.clear(); this.pending.clear();
      this.batch = { old, seeds, seen: new Set(), results: [], sections: new Map(), build: new Set(), seed: null, failed: false };
    }
    const batch = this.batch;
    if (batch.failed) { this.finish(); return; }
    if (!batch.seed) {
      for (const key of batch.seeds) {
        batch.seeds.delete(key); if (batch.seen.has(key)) continue;
        const point = parseAirCellKey(key), flags = this.world.flagsAt(point);
        if (flags === undefined) { batch.failed = true; continue; }
        if (!(flags & 1) || (flags & 128)) continue;
        batch.seed = point; const sectionKey = airCellKey(originOf(point));
        if (!batch.sections.has(sectionKey)) batch.build.add(sectionKey);
        break;
      }
      if (!batch.seed) { this.finish(); return; }
    }
    for (const key of [...batch.build].slice(0, 4)) {
      batch.build.delete(key);
      const origin = parseAirCellKey(key);
      if (!this.world.sectionLoaded(origin)) continue;
      if (batch.sections.size >= 512) { batch.failed = true; this.lastError = "snapshot-section-budget"; continue; }
      let section = this.cache.get(key);
      if (!section) {
        const flags = new Uint8Array(4096);
        let complete = true;
        for (let y = 0; y < 16; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
          const value = this.world.flagsAt({ x: origin.x + x, y: origin.y + y, z: origin.z + z });
          if (value === undefined) complete = false; else flags[x + 16 * z + 256 * y] = value;
        }
        if (!complete) { batch.failed = true; continue; }
        section = { origin, flags }; this.cache.set(key, section);
        // Ephemeral read cache is bounded independently of saved zones.
        if (this.cache.size > 1024) this.cache.delete(this.cache.keys().next().value!);
      }
      batch.sections.set(key, section);
    }
    if (batch.build.size) return;
    this.inFlight = { locationId: this.locationId, generation: this.generation, topologyRevision: this.revision, requestId: ++this.requestId };
    this.post({ type: "discover", request: { epochs: this.inFlight, seed: batch.seed, cells: this.annotations(), sections: [...batch.sections.values()] } });
  }
  receive(message: AirZoneWorkerResponse) {
    if (!this.inFlight || !this.batch) return false;
    const epochs = message.type === "result" ? message.result.epochs : message.epochs;
    if (!isAirTopologyResultCurrent({ epochs } as AirTopologyResult, this.inFlight)) return false;
    this.inFlight = null;
    const batch = this.batch;
    if (message.type !== "result") { batch.failed = true; this.lastError = message.type === "error" ? message.message : "cancelled"; batch.seed = null; return false; }
    const result = message.result;
    this.diagnostics.set(airCellKey(batch.seed!), result);
    if (result.error || result.truncated) { batch.failed = true; this.lastError = result.error ?? "over-capacity"; batch.seed = null; return false; }
    for (const leak of result.unknownBoundaries) {
      const d = DELTAS[leak.face], origin = originOf({ x: leak.cell.x + d[0], y: leak.cell.y + d[1], z: leak.cell.z + d[2] });
      const key = airCellKey(origin);
      if (!batch.sections.has(key) && this.world.sectionLoaded(origin)) batch.build.add(key);
    }
    if (batch.build.size && batch.sections.size < 512) return true;
    if (batch.build.size) { batch.failed = true; this.lastError = "snapshot-section-budget"; batch.build.clear(); }
    batch.results.push(result); for (const key of result.cellKeys) batch.seen.add(key);
    batch.seed = null;
    return true;
  }
  private finish() {
    const batch = this.batch!; this.batch = null;
    if (batch.failed) {
      // Keep every old species and membership on partial discovery. Retry only
      // after a material edit/load/source change, never spin a flood fill each tick.
      for (const zone of batch.old) this.zones.set(zone.zoneId, { ...this.zones.get(zone.zoneId) ?? zone, status: "unknown" });
      return;
    }
    const old = batch.old.map(zone => this.zones.get(zone.zoneId) ?? zone);
    try {
      // A new controller can rediscover an unchanged retained zone. Include its
      // old authority exactly once if the result intersects that membership.
      const oldIds = new Set(old.map(zone => zone.zoneId));
      for (const result of batch.results) for (const key of result.cellKeys) {
        const id = this.cellZones.get(key);
        if (id && !oldIds.has(id)) { old.push(this.zones.get(id)!); oldIds.add(id); }
      }
      const remapped = remapAirZones(old, batch.results);
      for (const zone of old) { this.zones.delete(zone.zoneId); this.topologies.delete(zone.zoneId); for (const key of zone.cellKeys) this.cellZones.delete(key); }
      for (const zone of remapped.zones) { this.zones.set(zone.zoneId, zone); this.checkedAt.set(zone.zoneId, this.nowMs); for (const key of zone.cellKeys) this.cellZones.set(key, zone.zoneId); }
      for (const result of batch.results) this.topologies.set(result.zoneId, result);
      for (const field of ["oxygenMilliMoles", "inertMilliMoles", "co2MilliMoles", "thermalEnergyMilliJ"] as const) this.lost[field] += remapped.lost[field];
      this.lastError = null;
    } catch (error) { this.lastError = error instanceof Error ? error.message : "remap-failed"; }
  }
  snapshot() { return [...this.zones.values()].map(zone => ({ ...zone, cellKeys: [...zone.cellKeys], controllerIds: [...zone.controllerIds] })); }
  dispose() { this.retire(); this.cache.clear(); this.integritySections = null; }
}
