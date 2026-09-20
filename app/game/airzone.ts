/** Host-authoritative 5 Hz habitat arithmetic. No world, renderer or clock access.
 * Gas: integer mmol; machine gas: 24 mL/mmol at the game reference standard.
 * PressureMilliKPa is numerically Pa. Energy: mJ; Cv = 20 mJ/(mmol K).
 * A cell is 1 m³. BigInt intermediates keep multiplication exact on ES2017 builds.
 */
export const AIRZONE_HZ = 5;
export const AIRZONE_MAX_CELLS = 16_384;
export const AIRZONE_CELLS_PER_CONTROLLER = 2_048;
export const AIRZONE_GAS_ML_PER_MMOL = 24;
export const AIRZONE_MAX_GAS = 1_000_000_000_000;
export const AIRZONE_MAX_ENERGY = 1_000_000_000_000_000;
export const AIRZONE_MAX_TICK_INPUT = 1_000_000;
export const AIRZONE_MAX_CO2_PPM = 5_000;
export const AIR_FACES = ["+x", "-x", "+y", "-y", "+z", "-z"] as const;
export type AirFace = typeof AIR_FACES[number];
export type AirPoint = Readonly<{ x: number; y: number; z: number }>;
export type AirEpochs = Readonly<{ locationId: string; generation: number; topologyRevision: number; requestId: number }>;
export type AirOccupant = Readonly<{ id: string; kind: "player" | "npc" | "creature" | "fire" | "machine" | "plant" }>;
export type AirSnapshotCell = AirPoint & Readonly<{
  passable: boolean; sealMask: number; exterior?: boolean;
  controllerIds?: readonly string[]; ventIds?: readonly string[]; occupants?: readonly AirOccupant[];
  openFaceCauses?: Partial<Record<AirFace, string>>;
}>;
/** 16³ cells: index = x + 16*z + 256*y. Flags: passable bit0,
 * face seals bits1..6, exterior bit7. Origins must be aligned to 16.
 * Explicit cells overlay dense data, carrying sparse device/occupant annotations.
 */
export type AirDenseSection = Readonly<{ origin: AirPoint; flags: Uint8Array }>;
export type AirTopologyRequest = Readonly<{ epochs: AirEpochs; seed: AirPoint; cells: readonly AirSnapshotCell[]; sections?: readonly AirDenseSection[] }>;
export type AirLeak = Readonly<{ cell: AirPoint; face: AirFace; cause: string; unknown: boolean }>;
export type AirBounds = Readonly<{ min: AirPoint; max: AirPoint }>;
export type AirZoneStatus = "unknown" | "checking" | "sealed" | "leaking" | "depressurized" | "over-capacity";
export type AirTopologyResult = Readonly<{
  epochs: AirEpochs; zoneId: string; membershipDigest: string; cellKeys: readonly string[];
  cellCount: number; bounds: AirBounds | null; controllerIds: readonly string[]; ventIds: readonly string[];
  occupants: readonly AirOccupant[]; leaks: readonly AirLeak[]; unknownBoundaries: readonly AirLeak[];
  capacity: number; status: "unknown" | "sealed" | "leaking" | "over-capacity"; truncated: boolean;
  error?: string;
}>;
const DELTAS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
const gasNames = ["oxygenMilliMoles", "inertMilliMoles", "co2MilliMoles"] as const;
export type AirGas = Readonly<{ oxygenMilliMoles: number; inertMilliMoles: number; co2MilliMoles: number }>;
export const EMPTY_AIR_GAS: AirGas = Object.freeze({ oxygenMilliMoles: 0, inertMilliMoles: 0, co2MilliMoles: 0 });
const integer = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max;
const validPoint = (p: AirPoint) => p && [p.x, p.y, p.z].every(v => Number.isSafeInteger(v) && Math.abs(v) <= 30_000_000);
export const airCellKey = (p: AirPoint): string => `${p.x},${p.y},${p.z}`;
export const parseAirCellKey = (key: string): AirPoint => { const [x, y, z] = key.split(",").map(Number); return { x, y, z }; };
const pointFromKey = parseAirCellKey;
const validEpochs = (e: AirEpochs) => e && typeof e.locationId === "string" && e.locationId.length > 0 && e.locationId.length <= 200 && integer(e.generation) && integer(e.topologyRevision) && integer(e.requestId);
const mulDiv = (a: number, b: number, c: number): number => Number(BigInt(a) * BigInt(b) / BigInt(c));
export const totalAirGas = (g: AirGas): number => g.oxygenMilliMoles + g.inertMilliMoles + g.co2MilliMoles;
const validGas = (g: AirGas) => g && gasNames.every(k => integer(g[k], AIRZONE_MAX_GAS)) && totalAirGas(g) <= AIRZONE_MAX_GAS;
const sortedUnique = (values: Iterable<string>): string[] => [...new Set(values)].sort();
function digest(keys: readonly string[]): string {
  let a = 2166136261, b = 5381;
  for (const key of keys) for (const c of `${key};`) { a = Math.imul(a ^ c.charCodeAt(0), 16777619); b = Math.imul(b, 33) ^ c.charCodeAt(0); }
  return `${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}`;
}
/** Missing neighbors are unknown leaks. Explicit exterior cells are known leaks.
 * Nonpassable cells seal; passable cells seal individual faces with bits 0..5.
 * Either side's sealed face closes an edge. Equalization vents MUST seal that edge.
 */
export function discoverAirZone(request: AirTopologyRequest): AirTopologyResult {
  const empty = (error: string): AirTopologyResult => ({ epochs: request.epochs, zoneId: "invalid", membershipDigest: "", cellKeys: [], cellCount: 0, bounds: null, controllerIds: [], ventIds: [], occupants: [], leaks: [], unknownBoundaries: [], capacity: 0, status: "unknown", truncated: false, error });
  if (!validEpochs(request.epochs) || !validPoint(request.seed) || !Array.isArray(request.cells) || request.cells.length > AIRZONE_MAX_CELLS * 7 + 1) return empty("invalid-snapshot");
  const cells = new Map<string, AirSnapshotCell>();
  const sections = new Map<string, AirDenseSection>();
  if (request.sections && (!Array.isArray(request.sections) || request.sections.length > 512)) return empty("invalid-sections");
  for (const section of request.sections ?? []) {
    if (!validPoint(section.origin) || [section.origin.x, section.origin.y, section.origin.z].some(v => v % 16 !== 0) || !(section.flags instanceof Uint8Array) || section.flags.length !== 4096 || sections.has(airCellKey(section.origin))) return empty("invalid-section");
    sections.set(airCellKey(section.origin), section);
  }
  for (const c of request.cells) {
    if (!validPoint(c) || typeof c.passable !== "boolean" || !integer(c.sealMask, 63) || (c.exterior !== undefined && typeof c.exterior !== "boolean")) return empty("invalid-cell");
    for (const ids of [c.controllerIds, c.ventIds]) if (ids && (!Array.isArray(ids) || ids.length > 64 || ids.some(id => typeof id !== "string" || !id || id.length > 200))) return empty("invalid-endpoint");
    if (c.occupants && (!Array.isArray(c.occupants) || c.occupants.length > 128 || c.occupants.some((o: AirOccupant) => !o || typeof o.id !== "string" || !o.id || !["player", "npc", "creature", "fire", "machine", "plant"].includes(o.kind)))) return empty("invalid-occupant");
    const key = airCellKey(c); if (cells.has(key)) return empty("duplicate-cell"); cells.set(key, c);
  }
  const lookup = (p: AirPoint): AirSnapshotCell | undefined => {
    const explicit = cells.get(airCellKey(p)); if (explicit) return explicit;
    const origin = { x: Math.floor(p.x / 16) * 16, y: Math.floor(p.y / 16) * 16, z: Math.floor(p.z / 16) * 16 };
    const section = sections.get(airCellKey(origin)); if (!section) return undefined;
    const flags = section.flags[p.x - origin.x + 16 * (p.z - origin.z) + 256 * (p.y - origin.y)];
    return { ...p, passable: (flags & 1) !== 0, sealMask: (flags >>> 1) & 63, exterior: (flags & 128) !== 0 };
  };
  const seed = lookup(request.seed);
  if (!seed || !seed.passable || seed.exterior) return empty("unavailable-seed");
  const queue = [seed], visited = new Set([airCellKey(seed)]), leaks: AirLeak[] = [];
  const controllers: string[] = [], vents: string[] = [], occupants = new Map<string, AirOccupant>();
  let truncated = false;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const c = queue[cursor]; controllers.push(...c.controllerIds ?? []); vents.push(...c.ventIds ?? []);
    for (const o of c.occupants ?? []) { const old = occupants.get(o.id); if (old && old.kind !== o.kind) return empty("conflicting-occupant"); occupants.set(o.id, { ...o }); }
    for (let f = 0; f < 6; f++) {
      if (c.sealMask & (1 << f)) continue;
      const d = DELTAS[f], p = { x: c.x + d[0], y: c.y + d[1], z: c.z + d[2] }, key = airCellKey(p), next = lookup(p);
      if (next && (!next.passable || (next.sealMask & (1 << (f ^ 1))))) continue;
      if (!next || next.exterior) {
        leaks.push({ cell: { x: c.x, y: c.y, z: c.z }, face: AIR_FACES[f], cause: c.openFaceCauses?.[AIR_FACES[f]] ?? (next ? "exterior" : "unloaded-cell"), unknown: !next }); continue;
      }
      if (!visited.has(key)) {
        if (queue.length >= AIRZONE_MAX_CELLS) { truncated = true; continue; }
        visited.add(key); queue.push(next);
      }
    }
  }
  const cellKeys = [...visited].sort(), membershipDigest = digest(cellKeys);
  const min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const c of queue) for (const axis of ["x", "y", "z"] as const) { min[axis] = Math.min(min[axis], c[axis]); max[axis] = Math.max(max[axis], c[axis]); }
  leaks.sort((a, b) => { const ak = airCellKey(a.cell), bk = airCellKey(b.cell); return (ak < bk ? -1 : ak > bk ? 1 : 0) || AIR_FACES.indexOf(a.face) - AIR_FACES.indexOf(b.face); });
  const controllerIds = sortedUnique(controllers), capacity = Math.min(AIRZONE_MAX_CELLS, controllerIds.length * AIRZONE_CELLS_PER_CONTROLLER);
  const unknownBoundaries = leaks.filter(l => l.unknown);
  return { epochs: { ...request.epochs }, zoneId: `${request.epochs.locationId}:air:${membershipDigest}`, membershipDigest, cellKeys, cellCount: cellKeys.length, bounds: { min, max }, controllerIds, ventIds: sortedUnique(vents), occupants: [...occupants.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0), leaks, unknownBoundaries, capacity, status: truncated || cellKeys.length > capacity ? "over-capacity" : unknownBoundaries.length ? "unknown" : leaks.length ? "leaking" : "sealed", truncated };
}
export function isAirTopologyResultCurrent(result: AirTopologyResult, current: AirEpochs): boolean {
  return validEpochs(current) && ["locationId", "generation", "topologyRevision", "requestId"].every(k => result.epochs[k as keyof AirEpochs] === current[k as keyof AirEpochs]);
}
/** Includes the one-cell boundary shell, so a formerly solid wall edit invalidates. */
export function airZoneIntersectsEdit(zone: Pick<AirTopologyResult, "bounds">, point: AirPoint): boolean {
  const b = zone.bounds; return !!b && ["x", "y", "z"].every(k => { const a = k as keyof AirPoint; return point[a] >= b.min[a] - 1 && point[a] <= b.max[a] + 1; });
}
export type AirZoneState = AirGas & Readonly<{
  schemaVersion: 1; zoneId: string; locationId: string; topologyRevision: number; resourceRevision: number;
  cellCount: number; cellKeys: readonly string[]; membershipDigest: string; controllerIds: readonly string[];
  boundaryLeakArea: number; status: AirZoneStatus; pressureMilliKPa: number; temperatureMilliC: number;
  thermalEnergyMilliJ: number;
}>;
export function airThermalEnergy(gasMilliMoles: number, temperatureMilliC: number): number {
  if (!integer(gasMilliMoles, AIRZONE_MAX_GAS) || !Number.isSafeInteger(temperatureMilliC) || temperatureMilliC < -273_150 || temperatureMilliC > 2_000_000) throw new RangeError("invalid-temperature-or-gas");
  const e = mulDiv(gasMilliMoles, temperatureMilliC + 273_150, 50); if (e > AIRZONE_MAX_ENERGY) throw new RangeError("energy-capacity"); return e;
}
function derive(state: AirZoneState): AirZoneState {
  const total = totalAirGas(state), milliK = total ? mulDiv(state.thermalEnergyMilliJ, 50, total) : 293_150;
  // Substitute n*T = E/Cv directly; never round temperature before pressure.
  const pressure = state.cellCount && total ? Number(BigInt(state.thermalEnergyMilliJ) * BigInt(50 * 8314) / (BigInt(1_000_000_000) * BigInt(state.cellCount))) : 0;
  return { ...state, temperatureMilliC: milliK - 273_150, pressureMilliKPa: pressure, status: state.status === "sealed" || state.status === "depressurized" ? (pressure < 60_000 ? "depressurized" : "sealed") : state.status };
}
/** Newly discovered artificial space is vacuum unless a source explicitly supplies air. */
export function createAirZoneState(topology: AirTopologyResult, gas: AirGas = EMPTY_AIR_GAS, temperatureMilliC = 20_000): AirZoneState {
  if (!validGas(gas)) throw new RangeError("invalid-gas");
  return derive({ ...gas, schemaVersion: 1, zoneId: topology.zoneId, locationId: topology.epochs.locationId, topologyRevision: topology.epochs.topologyRevision, resourceRevision: 0, cellCount: topology.cellCount, cellKeys: [...topology.cellKeys], membershipDigest: topology.membershipDigest, controllerIds: [...topology.controllerIds], boundaryLeakArea: topology.leaks.length, status: topology.status, pressureMilliKPa: 0, temperatureMilliC, thermalEnergyMilliJ: airThermalEnergy(totalAirGas(gas), temperatureMilliC) });
}
/** Saved membership/resources are authority; derived topology must be rechecked on load.
 * Invalid records return null, never a partially repaired breathable room.
 */
export function normalizeAirZoneState(value: unknown): AirZoneState | null {
  if (!value || typeof value !== "object") return null;
  const s = value as AirZoneState;
  if (s.schemaVersion !== 1 || typeof s.zoneId !== "string" || typeof s.locationId !== "string" || !s.locationId || !validGas(s) || !integer(s.thermalEnergyMilliJ, AIRZONE_MAX_ENERGY) || !integer(s.resourceRevision) || !integer(s.topologyRevision) || !integer(s.cellCount, AIRZONE_MAX_CELLS) || s.cellCount === 0 || !Array.isArray(s.cellKeys) || s.cellKeys.length !== s.cellCount || !s.cellKeys.every(k => typeof k === "string" && validPoint(pointFromKey(k)) && airCellKey(pointFromKey(k)) === k)) return null;
  const keys = sortedUnique(s.cellKeys); if (keys.length !== s.cellCount || digest(keys) !== s.membershipDigest || (!totalAirGas(s) && s.thermalEnergyMilliJ)) return null;
  const result = derive({ schemaVersion: 1, zoneId: s.zoneId, locationId: s.locationId, topologyRevision: s.topologyRevision, resourceRevision: s.resourceRevision, cellCount: s.cellCount, membershipDigest: s.membershipDigest, oxygenMilliMoles: s.oxygenMilliMoles, inertMilliMoles: s.inertMilliMoles, co2MilliMoles: s.co2MilliMoles, thermalEnergyMilliJ: s.thermalEnergyMilliJ, pressureMilliKPa: 0, temperatureMilliC: 0, cellKeys: keys, controllerIds: [], boundaryLeakArea: 0, status: "checking" });
  if (result.temperatureMilliC < -273_150 || result.temperatureMilliC > 2_000_000) return null;
  return result;
}
/** Rebase a whole saved room without redistributing gas or re-deriving resources.
 * The caller owns the frame transaction and must reject any crossing installation.
 * Zone IDs are derived location/membership references, not resource identities.
 * Installation IDs live outside this record and stay opaque.
 */
export function rebaseAirZoneState(state: AirZoneState, locationId: string, cellKey: (key: string) => string): AirZoneState {
  if (!normalizeAirZoneState(state) || !locationId || locationId.length > 200) throw new RangeError("invalid-frame-room");
  const cellKeys = state.cellKeys.map(cellKey), controllerIds = state.controllerIds.map(cellKey);
  const membershipDigest = digest(sortedUnique(cellKeys));
  const rebased = { ...state, locationId, cellKeys, controllerIds, membershipDigest, zoneId: `${locationId}:air:${membershipDigest}` };
  if (!normalizeAirZoneState(rebased)) throw new RangeError("invalid-frame-membership");
  return rebased;
}
/** Whole gas quanta only; retain residualMl at the source endpoint. */
export function gasMilliLitersToMilliMoles(volumeMl: number): Readonly<{ milliMoles: number; residualMl: number }> {
  if (!integer(volumeMl)) throw new RangeError("invalid-volume");
  return { milliMoles: Math.floor(volumeMl / AIRZONE_GAS_ML_PER_MMOL), residualMl: volumeMl % AIRZONE_GAS_ML_PER_MMOL };
}
export function gasMilliMolesToMilliLiters(milliMoles: number): number {
  if (!integer(milliMoles, AIRZONE_MAX_GAS)) throw new RangeError("invalid-gas-quantity");
  return milliMoles * AIRZONE_GAS_ML_PER_MMOL;
}
/** Largest remainder allocation. Species ties use O2, inert, CO2 in that order. */
function allocate(quantity: number, weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + BigInt(b), BigInt(0)); if (!total) return weights.map(() => 0);
  const parts = weights.map((w, index) => { const n = BigInt(quantity) * BigInt(w); return { index, value: Number(n / total), remainder: n % total }; });
  let left = quantity - parts.reduce((a, b) => a + b.value, 0);
  for (const p of [...parts].sort((a, b) => a.remainder > b.remainder ? -1 : a.remainder < b.remainder ? 1 : a.index - b.index)) { if (!left) break; p.value++; left--; }
  return parts.map(p => p.value);
}
function portion(state: AirZoneState, amount: number): AirGas & { thermalEnergyMilliJ: number } {
  const total = totalAirGas(state), values = allocate(amount, gasNames.map(k => state[k]));
  return { oxygenMilliMoles: values[0], inertMilliMoles: values[1], co2MilliMoles: values[2], thermalEnergyMilliJ: total ? mulDiv(state.thermalEnergyMilliJ, amount, total) : 0 };
}
/** Resource endpoints can quote a packet without constructing a topology graph.
 * They must atomically debit this exact packet before crediting another authority.
 */
export function quoteAirMixture(gas: AirGas, requestedMilliMoles: number): AirGas {
  if (!validGas(gas) || !integer(requestedMilliMoles, AIRZONE_MAX_GAS)) throw new RangeError("invalid-mixture");
  const parts = allocate(Math.min(requestedMilliMoles, totalAirGas(gas)), gasNames.map(k => gas[k]));
  return Object.freeze({ oxygenMilliMoles: parts[0], inertMilliMoles: parts[1], co2MilliMoles: parts[2] });
}
function change(state: AirZoneState, delta: AirGas & { thermalEnergyMilliJ: number }, sign: 1 | -1): AirZoneState {
  return derive({ ...state, oxygenMilliMoles: state.oxygenMilliMoles + sign * delta.oxygenMilliMoles, inertMilliMoles: state.inertMilliMoles + sign * delta.inertMilliMoles, co2MilliMoles: state.co2MilliMoles + sign * delta.co2MilliMoles, thermalEnergyMilliJ: state.thermalEnergyMilliJ + sign * delta.thermalEnergyMilliJ, resourceRevision: state.resourceRevision + 1 });
}
const fingerprint = (s: AirZoneState) => JSON.stringify([s.zoneId, s.locationId, s.topologyRevision, s.resourceRevision, s.cellCount, s.membershipDigest, s.status, ...gasNames.map(k => s[k]), s.thermalEnergyMilliJ]);
export type AirTransferQuote = Readonly<{ sourceFingerprint: string; targetFingerprint: string; amountMilliMoles: number; gas: AirGas; thermalEnergyMilliJ: number; maxTargetPressureMilliKPa: number }>;
export function quoteAirTransfer(source: AirZoneState, target: AirZoneState, requestedMilliMoles: number, maxTargetPressureMilliKPa = 120_000): AirTransferQuote {
  if (!integer(requestedMilliMoles, AIRZONE_MAX_GAS) || !integer(maxTargetPressureMilliKPa, 10_000_000)) throw new RangeError("invalid-transfer");
  let high = source.zoneId === target.zoneId || source.locationId !== target.locationId || !target.cellCount ? 0 : Math.min(requestedMilliMoles, totalAirGas(source), AIRZONE_MAX_GAS - totalAirGas(target));
  let low = 0;
  while (low < high) { const mid = Math.ceil((low + high) / 2), p = portion(source, mid); if (target.thermalEnergyMilliJ + p.thermalEnergyMilliJ <= AIRZONE_MAX_ENERGY && change(target, p, 1).pressureMilliKPa <= maxTargetPressureMilliKPa) low = mid; else high = mid - 1; }
  const p = portion(source, low);
  return Object.freeze({ sourceFingerprint: fingerprint(source), targetFingerprint: fingerprint(target), amountMilliMoles: low, gas: Object.freeze({ oxygenMilliMoles: p.oxygenMilliMoles, inertMilliMoles: p.inertMilliMoles, co2MilliMoles: p.co2MilliMoles }), thermalEnergyMilliJ: p.thermalEnergyMilliJ, maxTargetPressureMilliKPa });
}
export function commitAirTransfer(source: AirZoneState, target: AirZoneState, quote: AirTransferQuote): Readonly<{ source: AirZoneState; target: AirZoneState; transferredMilliMoles: number; committed: boolean }> {
  if (quote.sourceFingerprint !== fingerprint(source) || quote.targetFingerprint !== fingerprint(target)) return { source, target, transferredMilliMoles: 0, committed: false };
  const expected = quoteAirTransfer(source, target, quote.amountMilliMoles, quote.maxTargetPressureMilliKPa);
  if (JSON.stringify(expected) !== JSON.stringify(quote)) return { source, target, transferredMilliMoles: 0, committed: false };
  const p = { ...quote.gas, thermalEnergyMilliJ: quote.thermalEnergyMilliJ };
  return { source: quote.amountMilliMoles ? change(source, p, -1) : source, target: quote.amountMilliMoles ? change(target, p, 1) : target, transferredMilliMoles: quote.amountMilliMoles, committed: true };
}
export const transferAirGas = (source: AirZoneState, target: AirZoneState, amount: number, pressureCap = 120_000) => commitAirTransfer(source, target, quoteAirTransfer(source, target, amount, pressureCap));
/** A vent transports gas; it never merges memberships. No pressure overshoot. */
export function equalizeAirZones(a: AirZoneState, b: AirZoneState, maxMilliMoles: number): Readonly<{ a: AirZoneState; b: AirZoneState; transferredMilliMoles: number }> {
  if (!integer(maxMilliMoles, AIRZONE_MAX_GAS)) throw new RangeError("invalid-flow");
  const reverse = b.pressureMilliKPa > a.pressureMilliKPa, source = reverse ? b : a, target = reverse ? a : b;
  let low = 0, high = Math.min(maxMilliMoles, totalAirGas(source));
  while (low < high) { const mid = Math.ceil((low + high) / 2), moved = transferAirGas(source, target, mid, Math.min(10_000_000, source.pressureMilliKPa)); if (moved.transferredMilliMoles === mid && moved.source.pressureMilliKPa >= moved.target.pressureMilliKPa) low = mid; else high = mid - 1; }
  const moved = transferAirGas(source, target, low, Math.min(10_000_000, source.pressureMilliKPa));
  return { a: reverse ? moved.target : moved.source, b: reverse ? moved.source : moved.target, transferredMilliMoles: moved.transferredMilliMoles };
}
export type AirConsumer = Readonly<{ id: string; kind: AirOccupant["kind"]; oxygenMilliMoles: number; co2MilliMoles: number }>;
export type AirTickInput = Readonly<{
  consumers?: readonly AirConsumer[];
  /** CO2-to-O2 conversion is 1:1 mmol and requires external light/energy authority. */
  plantConversionMilliMoles?: number; scrubCo2MilliMoles?: number;
  /** Positive energy must be debited from an external source; returned actual delta is authoritative. */
  heatMilliJ?: number; leakMilliMolesPerFace?: number; exteriorPressureMilliKPa?: number;
}>;
export type AirTickResult = Readonly<{ state: AirZoneState; consumedOxygenMilliMoles: number; producedCo2MilliMoles: number; consumerThermalDeltaMilliJ: number; plantConvertedMilliMoles: number; scrubbed: AirGas & { thermalEnergyMilliJ: number }; leaked: AirGas & { thermalEnergyMilliJ: number }; heatAppliedMilliJ: number; unmetConsumerIds: readonly string[] }>;
export function stepAirZone(initial: AirZoneState, input: AirTickInput = {}): AirTickResult {
  const consumers = [...input.consumers ?? []].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (consumers.length > 256 || new Set(consumers.map(c => c.id)).size !== consumers.length || consumers.some(c => !c.id || !integer(c.oxygenMilliMoles, AIRZONE_MAX_TICK_INPUT) || !integer(c.co2MilliMoles, AIRZONE_MAX_TICK_INPUT)) || !integer(input.plantConversionMilliMoles ?? 0, AIRZONE_MAX_TICK_INPUT) || !integer(input.scrubCo2MilliMoles ?? 0, AIRZONE_MAX_TICK_INPUT) || !Number.isSafeInteger(input.heatMilliJ ?? 0) || Math.abs(input.heatMilliJ ?? 0) > AIRZONE_MAX_ENERGY || !integer(input.leakMilliMolesPerFace ?? 0, AIRZONE_MAX_TICK_INPUT) || !integer(input.exteriorPressureMilliKPa ?? 0, 10_000_000)) throw new RangeError("invalid-tick-input");
  let state = initial, consumedOxygenMilliMoles = 0, producedCo2MilliMoles = 0, consumerThermalDeltaMilliJ = 0;
  const unmetConsumerIds: string[] = [];
  for (const c of consumers) {
    // Whole reactions: exhausted O2 or insufficient byproduct room blocks the entire input.
    if (c.oxygenMilliMoles > state.oxygenMilliMoles || totalAirGas(state) - c.oxygenMilliMoles + c.co2MilliMoles > AIRZONE_MAX_GAS || (!c.oxygenMilliMoles && c.co2MilliMoles)) { unmetConsumerIds.push(c.id); continue; }
    const total = totalAirGas(state), deltaGas = c.co2MilliMoles - c.oxygenMilliMoles;
    const deltaEnergy = total ? mulDiv(state.thermalEnergyMilliJ, Math.abs(deltaGas), total) * Math.sign(deltaGas) : 0;
    if (state.thermalEnergyMilliJ + deltaEnergy > AIRZONE_MAX_ENERGY) { unmetConsumerIds.push(c.id); continue; }
    state = derive({ ...state, oxygenMilliMoles: state.oxygenMilliMoles - c.oxygenMilliMoles, co2MilliMoles: state.co2MilliMoles + c.co2MilliMoles, thermalEnergyMilliJ: state.thermalEnergyMilliJ + deltaEnergy, resourceRevision: state.resourceRevision + 1 });
    consumerThermalDeltaMilliJ += deltaEnergy;
    consumedOxygenMilliMoles += c.oxygenMilliMoles; producedCo2MilliMoles += c.co2MilliMoles;
  }
  const plantConvertedMilliMoles = Math.min(state.co2MilliMoles, input.plantConversionMilliMoles ?? 0);
  state = derive({ ...state, oxygenMilliMoles: state.oxygenMilliMoles + plantConvertedMilliMoles, co2MilliMoles: state.co2MilliMoles - plantConvertedMilliMoles });
  const scrubAmount = Math.min(state.co2MilliMoles, input.scrubCo2MilliMoles ?? 0), total = totalAirGas(state);
  const scrubbed = { ...EMPTY_AIR_GAS, co2MilliMoles: scrubAmount, thermalEnergyMilliJ: total ? mulDiv(state.thermalEnergyMilliJ, scrubAmount, total) : 0 };
  state = change(state, scrubbed, -1);
  // Heat cannot exist without gas in this model; structural heat is another authority.
  const maxEnergy = Math.min(AIRZONE_MAX_ENERGY, mulDiv(totalAirGas(state), 2_273_150, 50));
  const heatAppliedMilliJ = totalAirGas(state) ? Math.max(-state.thermalEnergyMilliJ, Math.min(input.heatMilliJ ?? 0, Math.max(0, maxEnergy - state.thermalEnergyMilliJ))) : 0;
  state = derive({ ...state, thermalEnergyMilliJ: state.thermalEnergyMilliJ + heatAppliedMilliJ });
  let low = 0, high = Math.min(totalAirGas(state), (input.leakMilliMolesPerFace ?? 0) * state.boundaryLeakArea);
  // Unknown/checking is never breathable, but gas remains until a quantified leak removes it.
  while (low < high) { const mid = Math.ceil((low + high) / 2); if (change(state, portion(state, mid), -1).pressureMilliKPa >= (input.exteriorPressureMilliKPa ?? 0)) low = mid; else high = mid - 1; }
  const leaked = portion(state, low); state = change(state, leaked, -1);
  return { state, consumedOxygenMilliMoles, producedCo2MilliMoles, consumerThermalDeltaMilliJ, plantConvertedMilliMoles, scrubbed, leaked, heatAppliedMilliJ, unmetConsumerIds };
}
export function airZoneDiagnostics(state: AirZoneState, oxygenConsumptionMilliMolesPerTick = 0): Readonly<{ breathable: boolean; reasons: readonly string[]; oxygenPartsPerMillion: number; co2PartsPerMillion: number; oxygenPartialPressureMilliKPa: number; reserveSeconds: number | null }> {
  const total = totalAirGas(state), oxygenPartsPerMillion = total ? mulDiv(state.oxygenMilliMoles, 1_000_000, total) : 0, co2PartsPerMillion = total ? mulDiv(state.co2MilliMoles, 1_000_000, total) : 0;
  const oxygenPartialPressureMilliKPa = total ? mulDiv(state.pressureMilliKPa, state.oxygenMilliMoles, total) : 0;
  const reasons: string[] = [];
  if (state.status !== "sealed") reasons.push(state.status);
  if (state.pressureMilliKPa < 60_000 || state.pressureMilliKPa > 120_000) reasons.push("unsafe-pressure");
  if (oxygenPartialPressureMilliKPa < 16_000 || oxygenPartialPressureMilliKPa > 30_000) reasons.push("unsafe-oxygen");
  if (co2PartsPerMillion > AIRZONE_MAX_CO2_PPM) reasons.push("high-co2");
  if (state.temperatureMilliC < 0 || state.temperatureMilliC > 45_000) reasons.push("unsafe-temperature");
  // Reserve ends at the 16 kPa O2 threshold, assuming fixed current temperature.
  const minimumOxygen = state.temperatureMilliC > -273_150 ? Number((BigInt(16_000) * BigInt(1_000_000_000) * BigInt(state.cellCount) + BigInt(8314) * BigInt(state.temperatureMilliC + 273_150) - BigInt(1)) / (BigInt(8314) * BigInt(state.temperatureMilliC + 273_150))) : AIRZONE_MAX_GAS;
  const reserveSeconds = integer(oxygenConsumptionMilliMolesPerTick) && oxygenConsumptionMilliMolesPerTick > 0 ? Math.floor(Math.max(0, state.oxygenMilliMoles - minimumOxygen) / (oxygenConsumptionMilliMolesPerTick * AIRZONE_HZ)) : null;
  return { breathable: reasons.length === 0, reasons, oxygenPartsPerMillion, co2PartsPerMillion, oxygenPartialPressureMilliKPa, reserveSeconds };
}
export const isAirZoneBreathable = (state: AirZoneState): boolean => airZoneDiagnostics(state).breathable;
/** Spatial intersections partition every old species/energy total exactly. Vanished
 * cells go to `lost`; unknown/leaking survivors retain their share and leak via ticks.
 * Both memberships must be disjoint, preventing double allocation or double authority.
 */
export function remapAirZones(previous: readonly AirZoneState[], next: readonly AirTopologyResult[]): Readonly<{ zones: readonly AirZoneState[]; lost: AirGas & { thermalEnergyMilliJ: number } }> {
  const oldSeen = new Set<string>(), newSeen = new Set<string>();
  for (const old of previous) { if (!normalizeAirZoneState(old)) throw new RangeError("invalid-old-zone"); for (const k of old.cellKeys) { const key = `${old.locationId}:${k}`; if (oldSeen.has(key)) throw new RangeError("overlapping-old-zones"); oldSeen.add(key); } }
  const ordered = [...next].sort((a, b) => a.zoneId < b.zoneId ? -1 : a.zoneId > b.zoneId ? 1 : 0);
  const zones = ordered.map(t => { if (t.truncated || t.error || t.cellKeys.length !== t.cellCount || digest([...t.cellKeys].sort()) !== t.membershipDigest) throw new RangeError("incomplete-new-zone"); for (const k of t.cellKeys) { const key = `${t.epochs.locationId}:${k}`; if (newSeen.has(key)) throw new RangeError("overlapping-new-zones"); newSeen.add(key); } return createAirZoneState(t); });
  const indices = new Map<string, number>(); zones.forEach((z, index) => z.cellKeys.forEach(k => indices.set(`${z.locationId}:${k}`, index)));
  const lost = { ...EMPTY_AIR_GAS, thermalEnergyMilliJ: 0 };
  for (const old of [...previous].sort((a, b) => a.zoneId < b.zoneId ? -1 : 1)) {
    const weights = zones.map(() => 0); weights.push(0);
    for (const k of old.cellKeys) weights[indices.get(`${old.locationId}:${k}`) ?? zones.length]++;
    const allocatedGas = weights.map(() => 0);
    for (const field of gasNames) {
      const amounts = allocate(old[field], weights);
      zones.forEach((z, index) => { zones[index] = { ...z, [field]: z[field] + amounts[index] }; });
      lost[field] += amounts[zones.length];
      amounts.forEach((amount, index) => allocatedGas[index] += amount);
    }
    const energy = allocate(old.thermalEnergyMilliJ, allocatedGas);
    zones.forEach((z, index) => { zones[index] = { ...z, thermalEnergyMilliJ: z.thermalEnergyMilliJ + energy[index] }; });
    lost.thermalEnergyMilliJ += energy[zones.length];
  }
  if (zones.some(z => !validGas(z) || z.thermalEnergyMilliJ > AIRZONE_MAX_ENERGY) || !validGas(lost) || lost.thermalEnergyMilliJ > AIRZONE_MAX_ENERGY) throw new RangeError("remap-capacity");
  return { zones: zones.map(derive), lost };
}
