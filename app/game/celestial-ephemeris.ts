import type { CelestialBodyDefinition, CelestialCatalogSnapshot } from "./celestial-catalog";
import type { LocationKind } from "./location-address";

export type CelestialVector = readonly [number, number, number];
export const EARTH_RADIUS_AU = 6371 / 149_597_870.7;
export const CELESTIAL_EPOCH = "waystar-v1:0";
const TAU = Math.PI * 2;
const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
const add = (a: CelestialVector, b: CelestialVector): CelestialVector => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: CelestialVector, b: CelestialVector): CelestialVector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: CelestialVector, b: CelestialVector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: CelestialVector) => Math.hypot(...a);
const unit = (a: CelestialVector): CelestialVector => { const n = length(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
export const cyclicPhase = (n: number) => ((n % 1) + 1) % 1;
export function localBodyClock(body: CelestialBodyDefinition, universeSeconds: number) {
  const cycles = Math.max(0, universeSeconds) / Math.max(60, body.rotation.dayLengthMinutes * 60) + body.rotation.phaseAtEpoch;
  return { day: Math.floor(cycles) + 1, time: cyclicPhase(cycles), dayLengthMinutes: body.rotation.dayLengthMinutes };
}
export function secondsFromLocalClock(body: CelestialBodyDefinition, day: number, time: number) {
  return Math.max(0, (Math.max(1, day) - 1 + time - body.rotation.phaseAtEpoch) * Math.max(60, body.rotation.dayLengthMinutes * 60));
}

/** Bounded Newton solve, with a bisection fallback for highly eccentric saves. */
export function solveEccentricAnomaly(meanAnomaly: number, eccentricity: number): number {
  if (!Number.isFinite(meanAnomaly) || !Number.isFinite(eccentricity) || eccentricity < 0 || eccentricity >= 1) throw new Error("Invalid Kepler input.");
  const m = cyclicPhase(meanAnomaly / TAU) * TAU;
  let e = eccentricity < .8 ? m : Math.PI;
  for (let i = 0; i < 12; i++) {
    const error = e - eccentricity * Math.sin(e) - m;
    if (Math.abs(error) < 1e-12) return e;
    e -= error / (1 - eccentricity * Math.cos(e));
  }
  let low = 0, high = TAU;
  for (let i = 0; i < 48; i++) { e = (low + high) / 2; if (e - eccentricity * Math.sin(e) < m) low = e; else high = e; }
  return e;
}

/** Parent-relative ellipses in AU. Orbital days use the frozen Home day scale. */
export function celestialPositions(catalog: CelestialCatalogSnapshot, universeSeconds: number): ReadonlyMap<string, CelestialVector> {
  if (!Number.isFinite(universeSeconds) || universeSeconds < 0) throw new Error("Invalid universe clock.");
  const daySeconds = Math.max(60, (catalog.bodies.find(b => b.id === "blockwild")?.rotation.dayLengthMinutes ?? 20) * 60);
  const byId = new Map(catalog.bodies.map(b => [b.id as string, b]));
  const result = new Map<string, CelestialVector>();
  const visit = (body: CelestialBodyDefinition): CelestialVector => {
    const cached = result.get(body.id); if (cached) return cached;
    let position: CelestialVector = [0, 0, 0];
    if (body.orbit && body.parentId) {
      const o = body.orbit, parent = byId.get(body.parentId);
      if (!parent) throw new Error("Missing ephemeris parent.");
      const e = solveEccentricAnomaly((o.phaseAtEpoch + universeSeconds / daySeconds / o.orbitalPeriodDays) * TAU, o.eccentricity);
      const x = o.semiMajorAxisAu * (Math.cos(e) - o.eccentricity);
      const z = o.semiMajorAxisAu * Math.sqrt(1 - o.eccentricity ** 2) * Math.sin(e);
      const i = o.inclinationDegrees * Math.PI / 180, n = o.ascendingNodeDegrees * Math.PI / 180;
      position = add(visit(parent), [x * Math.cos(n) - z * Math.cos(i) * Math.sin(n), z * Math.sin(i), x * Math.sin(n) + z * Math.cos(i) * Math.cos(n)]);
    }
    result.set(body.id, position); return position;
  };
  for (const body of catalog.bodies) visit(body);
  return result;
}

/** Fraction of a luminous disc occluded; render readability floors never enter physics. */
export function discOcclusion(starRadius: number, occluderRadius: number, separation: number): number {
  const r = Math.max(1e-12, starRadius), R = Math.max(0, occluderRadius), d = Math.max(0, separation);
  if (d >= r + R) return 0;
  if (d <= Math.abs(R - r)) return Math.min(1, R * R / (r * r));
  const area = r * r * Math.acos(clamp((d * d + r * r - R * R) / (2 * d * r)))
    + R * R * Math.acos(clamp((d * d + R * R - r * r) / (2 * d * R)))
    - .5 * Math.sqrt(Math.max(0, (-d + r + R) * (d + r - R) * (d - r + R) * (d + r + R)));
  return clamp(area / (Math.PI * r * r), 0, 1);
}
export type SkyBodySample = Readonly<{ id: string; direction: CelestialVector; starDirection: CelestialVector;
  axisDirection: CelestialVector; rotationRadians: number;
  distanceAu: number; angularRadius: number; displayRadius: number; illuminatedFraction: number; parent: boolean; shadow: number }>;
export type CelestialSkySample = Readonly<{ universeSeconds: number; bodies: readonly SkyBodySample[];
  sunDirection: CelestialVector; sunAngularRadius: number; irradiance: number; eclipse: number; localTime: number }>;

/** Versioned circular test orbits; fixed instance phase/inclination, no integration drift. */
export function authoredSpaceOffset(body: CelestialBodyDefinition, seconds: number, kind: LocationKind, instanceId: string, homeDaySeconds = 1200): CelestialVector {
  let hash = 2166136261;
  for (const char of `${body.id}:${kind}:${instanceId}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const radiusEarths = body.physical.radiusEarths * (kind === "asteroid" ? 6 : kind === "station" ? 3.4 : 3);
  const period = Math.max(60, TAU * Math.sqrt((radiusEarths * 6_371_000) ** 3 / (3.986004418e14 * body.physical.massEarths)) * homeDaySeconds / 86400);
  const angle = TAU * cyclicPhase(hash / 0x100000000 + seconds / period);
  const inclination = ((hash >>> 8) % 51 - 25) * Math.PI / 180;
  const radius = radiusEarths * EARTH_RADIUS_AU;
  return [Math.cos(angle) * radius, Math.sin(angle) * Math.sin(inclination) * radius, Math.sin(angle) * Math.cos(inclination) * radius];
}

export function sampleCelestialSky(catalog: CelestialCatalogSnapshot, observerBody: CelestialBodyDefinition, universeSeconds: number, kind: LocationKind = "surface", instanceId = "main"): CelestialSkySample {
  const positions = celestialPositions(catalog, universeSeconds), epoch = celestialPositions(catalog, 0);
  const star = catalog.bodies.find(b => b.kind === "star")!;
  const center = positions.get(observerBody.id)!, starPosition = positions.get(star.id)!;
  // Canonical moon surfaces are authored on the near side, so a tidally locked
  // moon keeps its parent overhead. Planet surfaces retain midnight at epoch.
  const moon = observerBody.kind === "moon" && observerBody.parentId !== null;
  const epochReference = sub(epoch.get(moon ? observerBody.parentId! : star.id)!, epoch.get(observerBody.id)!);
  const clock = localBodyClock(observerBody, universeSeconds);
  const turn = Math.atan2(epochReference[2], epochReference[0]) + clock.time * TAU - (moon ? 0 : Math.PI);
  const tilt = observerBody.rotation.axialTiltDegrees * Math.PI / 180;
  const up: CelestialVector = [Math.cos(turn) * Math.cos(tilt), Math.sin(tilt), Math.sin(turn) * Math.cos(tilt)];
  const east: CelestialVector = [Math.sin(turn), 0, -Math.cos(turn)];
  const north: CelestialVector = [-Math.cos(turn) * Math.sin(tilt), Math.cos(tilt), -Math.sin(turn) * Math.sin(tilt)];
  const local = (v: CelestialVector): CelestialVector => unit([dot(v, east), dot(v, up), dot(v, north)]);
  const inSpace = ["orbit", "station", "asteroid", "transit"].includes(kind);
  const altitude = observerBody.physical.radiusEarths * EARTH_RADIUS_AU * 1.000001;
  const observer = add(center, inSpace ? authoredSpaceOffset(observerBody, universeSeconds, kind, instanceId,
    Math.max(60, (catalog.bodies.find(body => body.id === "blockwild")?.rotation.dayLengthMinutes ?? 20) * 60))
    : [up[0] * altitude, up[1] * altitude, up[2] * altitude]);
  const sunVector = sub(starPosition, observer), sunDistance = length(sunVector);
  const sunAngularRadius = Math.asin(clamp(star.physical.radiusEarths * EARTH_RADIUS_AU / sunDistance, 0, 1));
  const sunDirection = local(sunVector);
  let eclipse = 0;
  const bodies: SkyBodySample[] = [];
  for (const body of catalog.bodies) {
    if (body.kind === "star" || (!inSpace && body.id === observerBody.id)) continue;
    const bodyPosition = positions.get(body.id)!, relative = sub(bodyPosition, observer), distanceAu = length(relative);
    const angularRadius = Math.asin(clamp(body.physical.radiusEarths * EARTH_RADIUS_AU / distanceAu, 0, 1));
    const direction = local(relative), bodyToStar = sub(starPosition, bodyPosition), bodyToObserver = sub(observer, bodyPosition);
    const parent = inSpace ? body.id === observerBody.id : body.id === observerBody.parentId;
    const separation = Math.acos(clamp(dot(unit(relative), unit(sunVector))));
    if (distanceAu < sunDistance) eclipse = Math.max(eclipse, discOcclusion(sunAngularRadius, angularRadius, separation));
    let shadow = 0;
    if (body.parentId && body.parentId !== star.id) {
      const parentBody = catalog.bodies.find(b => b.id === body.parentId)!;
      const toParent = sub(positions.get(parentBody.id)!, bodyPosition);
      if (length(toParent) < length(bodyToStar)) shadow = discOcclusion(
        Math.asin(clamp(star.physical.radiusEarths * EARTH_RADIUS_AU / length(bodyToStar), 0, 1)),
        Math.asin(clamp(parentBody.physical.radiusEarths * EARTH_RADIUS_AU / length(toParent), 0, 1)),
        Math.acos(clamp(dot(unit(toParent), unit(bodyToStar)))));
    }
    const bodyTilt = body.rotation.axialTiltDegrees * Math.PI / 180;
    bodies.push({ id: body.id, direction, starDirection: local(bodyToStar), axisDirection: local([Math.sin(bodyTilt), Math.cos(bodyTilt), 0]),
      rotationRadians: localBodyClock(body, universeSeconds).time * TAU, distanceAu, angularRadius,
      displayRadius: Math.max(angularRadius, parent ? .09 : body.parentId === observerBody.id ? .024 : .0025),
      illuminatedFraction: (1 + dot(unit(bodyToStar), unit(bodyToObserver))) / 2, parent, shadow });
  }
  return { universeSeconds, bodies, sunDirection, sunAngularRadius, irradiance: 1 / (sunDistance * sunDistance), eclipse, localTime: clock.time };
}
