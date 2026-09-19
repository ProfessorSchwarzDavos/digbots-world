import { bodyId, systemId, type BodyId, type LocationAddress, type SystemId } from "./location-address";
import { assertExactKeys, canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord, universeSha256 } from "./universe-json";

export const CELESTIAL_CATALOG_VERSION = 1;
export type CelestialBodyKind = "star" | "planet" | "gas-giant" | "moon" | "dwarf-world";
export type CelestialBodyDefinition = Readonly<{
  id: BodyId;
  name: string;
  kind: CelestialBodyKind;
  parentId: BodyId | null;
  orbit: Readonly<{ semiMajorAxisAu: number; eccentricity: number; inclinationDegrees: number; ascendingNodeDegrees: number; phaseAtEpoch: number; orbitalPeriodDays: number }> | null;
  rotation: Readonly<{ dayLengthMinutes: number; axialTiltDegrees: number; phaseAtEpoch: number }>;
  physical: Readonly<{ massEarths: number; radiusEarths: number; surfaceGravityG: number }>;
  atmosphere: Readonly<{ pressureKPa: number; oxygenFraction: number; co2Fraction: number; inertFraction: number }>;
  environmentPolicyId: string;
  skyPolicyId: string;
  generator: Readonly<{ id: string; version: number }>;
  biomeCatalogId: string;
  contentCatalogId: string;
  travel: Readonly<{ solidSurface: boolean; playerAvailable: boolean }>;
}>;
export type CelestialCatalogSnapshot = Readonly<{
  schemaVersion: 1;
  catalogVersion: number;
  systemId: SystemId;
  bodies: readonly CelestialBodyDefinition[];
}>;

function record(value: unknown, keys: readonly string[], name: string): Record<string, unknown> {
  if (!isUniverseRecord(value)) throw new Error(`Invalid ${name}.`);
  assertExactKeys(value, keys, name);
  return value;
}
function number(value: unknown, min: number, max: number, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${name}.`);
  return value;
}
function text(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 160 || /[\u0000-\u001f]/.test(value)) throw new Error(`Invalid ${name}.`);
  return value;
}

/** Validates and takes a detached, deeply immutable snapshot, never a registry reference. */
export function validateCelestialCatalog(value: unknown): CelestialCatalogSnapshot {
  const input = record(value, ["schemaVersion", "catalogVersion", "systemId", "bodies"], "celestial catalog");
  if (input.schemaVersion !== 1 || input.catalogVersion !== CELESTIAL_CATALOG_VERSION) throw new Error("Unsupported celestial catalog version.");
  const system = systemId(input.systemId);
  if (!Array.isArray(input.bodies) || !input.bodies.length || input.bodies.length > 256) throw new Error("Invalid celestial body count.");
  const seen = new Set<string>();
  const bodies: CelestialBodyDefinition[] = input.bodies.map((raw) => {
    const body = record(raw, ["id", "name", "kind", "parentId", "orbit", "rotation", "physical", "atmosphere", "environmentPolicyId", "skyPolicyId", "generator", "biomeCatalogId", "contentCatalogId", "travel"], "celestial body");
    const id = bodyId(body.id);
    if (seen.has(id)) throw new Error("Duplicate celestial body ID.");
    seen.add(id);
    if (!["star", "planet", "gas-giant", "moon", "dwarf-world"].includes(String(body.kind))) throw new Error("Unknown celestial body kind.");
    const kind = body.kind as CelestialBodyKind;
    const parentId = body.parentId === null ? null : bodyId(body.parentId);
    let orbit: CelestialBodyDefinition["orbit"] = null;
    if (body.orbit !== null) {
      const o = record(body.orbit, ["semiMajorAxisAu", "eccentricity", "inclinationDegrees", "ascendingNodeDegrees", "phaseAtEpoch", "orbitalPeriodDays"], "orbit");
      orbit = {
        semiMajorAxisAu: number(o.semiMajorAxisAu, Number.MIN_VALUE, 1e6, "orbital radius"),
        eccentricity: number(o.eccentricity, 0, 0.95, "eccentricity"),
        inclinationDegrees: number(o.inclinationDegrees, -180, 180, "inclination"),
        ascendingNodeDegrees: number(o.ascendingNodeDegrees, 0, 360, "ascending node"),
        phaseAtEpoch: number(o.phaseAtEpoch, 0, 1, "orbital phase"),
        orbitalPeriodDays: number(o.orbitalPeriodDays, Number.MIN_VALUE, 1e9, "orbital period"),
      };
    }
    if ((kind === "star") !== (parentId === null && orbit === null) || (kind !== "star" && (parentId === null || orbit === null))) throw new Error("Invalid star/parent/orbit relationship.");
    const r = record(body.rotation, ["dayLengthMinutes", "axialTiltDegrees", "phaseAtEpoch"], "rotation");
    const p = record(body.physical, ["massEarths", "radiusEarths", "surfaceGravityG"], "physical policy");
    const massEarths = number(p.massEarths, 1e-9, 1e9, "mass");
    const radiusEarths = number(p.radiusEarths, 1e-6, 1e6, "radius");
    const surfaceGravityG = number(p.surfaceGravityG, 1e-9, 1e9, "gravity");
    if (Math.abs(surfaceGravityG - massEarths / radiusEarths ** 2) > Math.max(1, surfaceGravityG) * 1e-10) throw new Error("Gravity does not match mass/radius.");
    const a = record(body.atmosphere, ["pressureKPa", "oxygenFraction", "co2Fraction", "inertFraction"], "atmosphere");
    const atmosphere = { pressureKPa: number(a.pressureKPa, 0, 1e6, "pressure"), oxygenFraction: number(a.oxygenFraction, 0, 1, "oxygen"), co2Fraction: number(a.co2Fraction, 0, 1, "CO2"), inertFraction: number(a.inertFraction, 0, 1, "inert fraction") };
    const total = atmosphere.oxygenFraction + atmosphere.co2Fraction + atmosphere.inertFraction;
    if (Math.abs(total - (atmosphere.pressureKPa === 0 ? 0 : 1)) > 1e-9) throw new Error("Atmosphere fractions are not normalized.");
    const g = record(body.generator, ["id", "version"], "body generator");
    if (!Number.isSafeInteger(g.version) || Number(g.version) < 1) throw new Error("Invalid body generator version.");
    const t = record(body.travel, ["solidSurface", "playerAvailable"], "travel policy");
    if (typeof t.solidSurface !== "boolean" || typeof t.playerAvailable !== "boolean" || (kind === "star" || kind === "gas-giant") && t.solidSurface) throw new Error("Invalid surface access policy.");
    if (t.playerAvailable && id !== "blockwild") throw new Error("This runtime exposes only the home destination.");
    return {
      id, name: text(body.name, "body name"), kind, parentId, orbit,
      rotation: { dayLengthMinutes: number(r.dayLengthMinutes, Number.MIN_VALUE, 1e9, "day length"), axialTiltDegrees: number(r.axialTiltDegrees, -180, 180, "axial tilt"), phaseAtEpoch: number(r.phaseAtEpoch, 0, 1, "rotation phase") },
      physical: { massEarths, radiusEarths, surfaceGravityG }, atmosphere,
      environmentPolicyId: text(body.environmentPolicyId, "environment policy"), skyPolicyId: text(body.skyPolicyId, "sky policy"),
      generator: { id: text(g.id, "generator ID"), version: g.version as number },
      biomeCatalogId: text(body.biomeCatalogId, "biome catalog"), contentCatalogId: text(body.contentCatalogId, "content catalog"),
      travel: { solidSurface: t.solidSurface, playerAvailable: t.playerAvailable },
    };
  });
  const byId = new Map(bodies.map((body) => [body.id, body]));
  if (bodies.filter((body) => body.kind === "star").length !== 1) throw new Error("A catalog requires one root star.");
  for (const body of bodies) {
    const path = new Set<BodyId>();
    let current: CelestialBodyDefinition | undefined = body;
    while (current) {
      if (path.has(current.id)) throw new Error("Cyclic celestial parent graph.");
      path.add(current.id);
      if (current.parentId === null) break;
      const parent = byId.get(current.parentId);
      if (!parent) throw new Error("Unknown celestial parent.");
      if (current.kind === "moon" && (parent.kind === "moon" || parent.kind === "star")) throw new Error("Moon requires a primary body parent.");
      current = parent;
    }
  }
  return freezeUniverseJson({ schemaVersion: 1 as const, catalogVersion: input.catalogVersion, systemId: system, bodies }) as CelestialCatalogSnapshot;
}

// Mass/radius values follow source lines 356–369. Orbital/day/atmosphere numbers
// are versioned authored starting constants, not CF2 physics or released worlds.
const ROSTER = [
  ["waystar", "Waystar", "star", null, 332_946, 109, 0, 1, 500, 0],
  ["cinderhymn", "Cinderhymn", "planet", "waystar", 0.34, 0.72, 0.38, 88, 1760, 8],
  ["blockwild", "Blockwild", "planet", "waystar", 1, 1, 1, 365, 20, 101.3],
  ["blockwild/morrow", "Morrow", "moon", "blockwild", 0.012, 0.25, 0.00257, 27.3, 546, 0],
  ["talon", "Talon", "planet", "waystar", 0.16, 0.64, 1.52, 687, 24, 42],
  ["talon/hope", "Hope", "moon", "talon", 0.045, 0.36, 0.0018, 18, 360, 84],
  ["suno", "Suno", "planet", "waystar", 1.28, 1.18, 2.3, 1275, 28, 125],
  ["suno/jun", "Jun", "moon", "suno", 0.22, 0.57, 0.0032, 16, 320, 104],
  ["suno/styx", "Styx", "moon", "suno", 0.018, 0.28, 0.0051, 33, 660, 0],
  ["orison", "Orison", "gas-giant", "waystar", 72, 8.7, 5.6, 4840, 12, 100],
  ["orison/aerie", "Aerie", "moon", "orison", 0.06, 0.38, 0.005, 7, 140, 68],
  ["orison/rimehold", "Rimehold", "moon", "orison", 0.11, 0.47, 0.008, 14, 280, 19],
  ["orison/vanta", "Vanta", "moon", "orison", 0.03, 0.31, 0.012, 26, 520, 0],
  ["hollowmere", "Hollowmere", "dwarf-world", "waystar", 0.08, 0.42, 12.8, 16_000, 40, 0],
  ["hollowmere/wick", "Wick", "moon", "hollowmere", 0.006, 0.18, 0.0012, 9, 180, 0],
] as const;

export function createWaystarCatalog(homeDayLengthMinutes = 20): CelestialCatalogSnapshot {
  return validateCelestialCatalog({ schemaVersion: 1, catalogVersion: CELESTIAL_CATALOG_VERSION, systemId: "waystar", bodies: ROSTER.map(([id, name, kind, parentId, massEarths, radiusEarths, distance, period, day, pressure], index) => {
    const oxygen = ["blockwild", "talon/hope", "suno", "suno/jun"].includes(id) ? 0.21 : 0;
    const co2 = pressure === 0 ? 0 : oxygen ? 0.0004 : id === "orison" ? 0 : 0.94;
    return {
      id, name, kind, parentId,
      orbit: parentId === null ? null : { semiMajorAxisAu: distance, eccentricity: 0.02, inclinationDegrees: index % 5, ascendingNodeDegrees: index * 23, phaseAtEpoch: index / ROSTER.length, orbitalPeriodDays: period },
      rotation: { dayLengthMinutes: id === "blockwild" ? homeDayLengthMinutes : day, axialTiltDegrees: id === "blockwild" ? 23.4 : 5, phaseAtEpoch: 0 },
      physical: { massEarths, radiusEarths, surfaceGravityG: massEarths / radiusEarths ** 2 },
      atmosphere: { pressureKPa: pressure, oxygenFraction: oxygen, co2Fraction: co2, inertFraction: pressure === 0 ? 0 : 1 - oxygen - co2 },
      environmentPolicyId: `${id}/v1`, skyPolicyId: `${id}/v1`,
      generator: { id: id === "blockwild" ? "typescript-home" : `${id}/planned`, version: id === "blockwild" ? 18 : 1 },
      biomeCatalogId: `${id}/v1`, contentCatalogId: `${id}/v1`, travel: { solidSurface: kind !== "star" && kind !== "gas-giant", playerAvailable: id === "blockwild" },
    };
  }) });
}

export function catalogBody(catalog: CelestialCatalogSnapshot, address: LocationAddress): CelestialBodyDefinition {
  if (catalog.systemId !== address.systemId) throw new Error("Location references an unknown system.");
  const body = catalog.bodies.find((entry) => entry.id === address.bodyId);
  if (!body) throw new Error("Location references an unknown body.");
  if (address.kind === "surface" && !body.travel.solidSurface) throw new Error("This body has no solid surface.");
  return body;
}

export async function celestialCatalogDigest(catalog: CelestialCatalogSnapshot): Promise<string> {
  return universeSha256(canonicalJson(validateCelestialCatalog(cloneUniverseJson(catalog))));
}
