import { normalizeAirZoneState } from "./airzone";
import type { PressureSave } from "./pressure-runtime";
import { canonicalJson, cloneUniverseJson } from "./universe-json";
import { asteroidAttachmentContainsCell, rebaseAsteroidPressure, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";

const fluxKinds = ["admitted", "released", "topologyLost"] as const;
const fluxFields = ["oxygenMilliMoles", "inertMilliMoles", "co2MilliMoles", "thermalEnergyMilliJ"] as const;
function validateLedger(save: PressureSave) {
  if (save.schema !== 1 || !Number.isSafeInteger(save.nextInstallation) || save.nextInstallation < 1) throw Error("Invalid pressure installation counter.");
  if (save.boundary) for (const kind of fluxKinds) for (const field of fluxFields)
    if (!Number.isSafeInteger(save.boundary[kind]?.[field]) || save.boundary[kind][field] < 0) throw Error("Invalid pressure boundary ledger.");
}
/** Select whole rooms/devices; reject references crossing the projected region
 * in EITHER direction. Global counters/flux totals are a transient baseline,
 * never a second persistent ledger. Inputs and unselected components are intact.
 */
export function projectAsteroidPressure(frame: AsteroidAttachmentFrame, canonical: PressureSave): PressureSave {
  validateLedger(canonical);
  const inside = (key: string) => asteroidAttachmentContainsCell(frame, key, "orbit");
  const zones = new Map<string, boolean>(), occupied = new Set<string>(), installations = new Set<string>();
  for (const zone of canonical.zones) {
    if (!normalizeAirZoneState(zone) || zone.locationId !== frame.orbitId || zones.has(zone.zoneId)) throw Error("Invalid canonical pressure room.");
    const hits = zone.cellKeys.filter(inside).length;
    if (hits !== 0 && hits !== zone.cellKeys.length) throw Error("Pressure room crosses the attached ownership boundary.");
    const selected = hits > 0;
    for (const key of zone.cellKeys) { if (occupied.has(key)) throw Error("Overlapping canonical pressure rooms."); occupied.add(key); }
    if (zone.controllerIds.some(key => inside(key) !== selected)) throw Error("Pressure controller crosses the attached ownership boundary.");
    zones.set(zone.zoneId, selected);
  }
  const reference = (key: string, selected: boolean) => {
    if (key === "exterior") return;
    const target = zones.get(key) ?? inside(key);
    if (target !== selected) throw Error("Pressure link crosses the attached ownership boundary.");
  };
  for (const [key, device] of Object.entries(canonical.devices)) {
    const selected = inside(key);
    if (device.schema !== 1 || !device.installationId || installations.has(device.installationId)) throw Error("Duplicate or unsupported canonical pressure device.");
    installations.add(device.installationId);
    for (const target of Object.values(device.links)) reference(target, selected);
    for (const target of Object.keys(device.bindings)) reference(target, selected);
    if (device.airlock?.links) for (const target of Object.values(device.airlock.links)) reference(target, selected);
  }
  return rebaseAsteroidPressure(frame, { ...canonical,
    zones: canonical.zones.filter(zone => zones.get(zone.zoneId)),
    devices: Object.fromEntries(Object.entries(canonical.devices).filter(([key]) => inside(key))),
  }, "orbit");
}

/** Merge one exclusive host view into its canonical ORBIT pressure owner.
 * No authority is inferred from this function: the storage adapter must bind its
 * owner revision/lease and commit all other changed resources atomically.
 * Baseline matching rejects stale selected state/counters/ledgers; independent
 * outside state is retained, never reconstructed from the local projection.
 */
export function captureAsteroidPressure(frame: AsteroidAttachmentFrame, canonical: PressureSave,
  baseline: PressureSave, edited: PressureSave): PressureSave {
  const expected = projectAsteroidPressure(frame, canonical);
  if (canonicalJson(expected) !== canonicalJson(baseline)) throw Error("Stale asteroid pressure projection.");
  validateLedger(edited);
  if (edited.nextInstallation < baseline.nextInstallation) throw Error("Pressure installation counter cannot rewind.");
  if (baseline.boundary && !edited.boundary) throw Error("Pressure boundary ledger cannot be discarded.");
  for (const kind of fluxKinds) for (const field of fluxFields) {
    const before = baseline.boundary?.[kind][field] ?? 0, after = edited.boundary?.[kind][field] ?? 0;
    if (after < before) throw Error("Pressure boundary ledger cannot rewind.");
  }
  // This also validates every edited membership, link, identity and frame bound.
  const incoming = rebaseAsteroidPressure(frame, edited, "local"), output = cloneUniverseJson(canonical);
  const selected = (key: string) => asteroidAttachmentContainsCell(frame, key, "orbit");
  let inserted = false;
  output.zones = output.zones.flatMap(zone => {
    if (!zone.cellKeys.some(selected)) return [zone];
    if (inserted) return [];
    inserted = true; return incoming.zones;
  });
  if (!inserted) output.zones.push(...incoming.zones);
  output.devices = { ...Object.fromEntries(Object.entries(output.devices).filter(([key]) => !selected(key))), ...incoming.devices };
  output.nextInstallation = incoming.nextInstallation;
  if (incoming.boundary) output.boundary = incoming.boundary;
  else delete output.boundary;
  // Re-admission catches new collisions with an outside installation or room.
  // The shared counters/ledger have ONE value, not canonical + projected totals.
  projectAsteroidPressure(frame, output);
  return output;
}
