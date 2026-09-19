import type { CelestialBodyDefinition } from "./celestial-catalog";
import type { LocationKind } from "./location-address";

export type BodyEnvironment = Readonly<{
  policyId: string; gravityG: number; pressureKPa: number; oxygenFraction: number;
  co2Fraction: number; inertFraction: number; breathable: boolean; requiresPressureSuit: boolean;
  temperatureC: readonly [number, number]; corrosive: boolean; radiation: number;
  liquidMedium: "water" | "brine" | "none"; wind: number;
  weather: readonly string[]; sky: SkyPolicy;
}>;
export type SkyPolicy = Readonly<{
  day: string; night: string; dusk: string; body: string; accent: string;
  starColor: string; starBrightness: number; aurora: number; rings: boolean; bands: boolean;
}>;

// Immutable v1 policy implementations are part of the save contract. New tuning
// gets a new ID/version; old catalog snapshots must keep resolving identically.
type Policy = Readonly<{ temperatureC: readonly [number, number]; corrosive?: boolean; radiation: number;
  liquidMedium?: BodyEnvironment["liquidMedium"]; wind?: number; weather?: readonly string[]; sky: SkyPolicy }>;
const sky = (day: string, night: string, dusk: string, body: string, accent: string, aurora = 0, rings = false, bands = false): SkyPolicy =>
  Object.freeze({ day, night, dusk, body, accent, starColor: "#fff1ce", starBrightness: 1, aurora, rings, bands });
const POLICIES: Readonly<Record<string, Policy>> = Object.freeze({
  waystar: { temperatureC: [4500, 6000], radiation: 100, sky: sky("#fff0c0", "#130c15", "#ffc66e", "#ffdb98", "#fff0c0") },
  cinderhymn: { temperatureC: [-70, 240], corrosive: true, radiation: 4, wind: .35, weather: ["clear", "ashfall"], sky: sky("#67423d", "#130e20", "#c46e42", "#954f39", "#e3956a", .65) },
  blockwild: { temperatureC: [-12, 36], radiation: .1, liquidMedium: "water", wind: 1, weather: ["clear", "overcast", "drizzle", "rain", "thunder", "snow"], sky: sky("#7ab4dd", "#091226", "#f1a46f", "#467b9f", "#99bc89") },
  "blockwild/morrow": { temperatureC: [-170, 105], radiation: 2.5, sky: sky("#050813", "#02040c", "#202133", "#adb8c6", "#667990") },
  talon: { temperatureC: [-95, 22], radiation: .8, liquidMedium: "brine", wind: .6, weather: ["clear", "sandstorm"], sky: sky("#986755", "#21121c", "#e29a6d", "#ad5b40", "#deb08a") },
  "talon/hope": { temperatureC: [-25, 30], radiation: .3, liquidMedium: "water", wind: .7, weather: ["clear", "overcast", "rain"], sky: sky("#9aabb0", "#0e1628", "#d99379", "#ddd5ba", "#a2bea9", .1) },
  suno: { temperatureC: [-20, 42], radiation: .2, liquidMedium: "water", wind: 1.2, weather: ["clear", "rain", "thunder"], sky: sky("#4faaa9", "#071d2b", "#9ebda5", "#478e87", "#a4d4bd", .15) },
  "suno/jun": { temperatureC: [-35, 27], radiation: .45, liquidMedium: "water", wind: 1.4, weather: ["clear", "overcast", "thunder"], sky: sky("#819aa9", "#111729", "#c0a99c", "#98b4ae", "#dae1b6", .15) },
  "suno/styx": { temperatureC: [-180, -25], radiation: 2, sky: sky("#04070e", "#010208", "#182037", "#4c5264", "#8b8ca5") },
  orison: { temperatureC: [-170, -60], radiation: 8, wind: 3, weather: ["thunder"], sky: sky("#b59673", "#211927", "#dba476", "#b79475", "#e4d7b4", .8, true, true) },
  "orison/aerie": { temperatureC: [-80, 12], radiation: 1.2, liquidMedium: "brine", wind: 1.8, weather: ["clear", "thunder"], sky: sky("#aab3b1", "#121627", "#dbbda0", "#b0b7a1", "#d6d7c3", .35) },
  "orison/rimehold": { temperatureC: [-160, -30], radiation: 1.8, wind: .4, weather: ["clear", "snow"], sky: sky("#708ba4", "#0e1528", "#bd9ba7", "#b4c9d7", "#e2e7ed", .6) },
  "orison/vanta": { temperatureC: [-180, -60], radiation: 3, sky: sky("#06060e", "#010208", "#201b31", "#3c354a", "#645c71") },
  hollowmere: { temperatureC: [-210, -95], radiation: 1.1, sky: sky("#101126", "#040515", "#282747", "#657089", "#929aa9", .9) },
  "hollowmere/wick": { temperatureC: [-220, -100], radiation: 1.2, sky: sky("#090b1b", "#020410", "#1f2441", "#a0a3ae", "#dad3bb", .2) },
});
for (const policy of Object.values(POLICIES)) {
  Object.freeze(policy.temperatureC); if (policy.weather) Object.freeze(policy.weather); Object.freeze(policy);
}

export function bodySkyPolicy(body: Pick<CelestialBodyDefinition, "id" | "skyPolicyId">): SkyPolicy {
  const policy = POLICIES[body.id];
  if (!policy || body.skyPolicyId !== `${body.id}/v1`) throw new Error("Unsupported frozen sky policy.");
  return policy.sky;
}

export function bodyEnvironment(body: CelestialBodyDefinition, kind: LocationKind = "surface"): BodyEnvironment {
  const policy = POLICIES[body.id];
  if (!policy || body.environmentPolicyId !== `${body.id}/v1`) throw new Error("Unsupported frozen environment policy.");
  const inSpace = ["orbit", "station", "asteroid", "transit"].includes(kind);
  // A station is vacuum until a real pressurized compartment says otherwise.
  // Artificial gravity and life-support equipment belong to their own systems.
  const pressureKPa = inSpace ? 0 : body.atmosphere.pressureKPa;
  const oxygenFraction = inSpace ? 0 : body.atmosphere.oxygenFraction;
  const oxygenKPa = pressureKPa * oxygenFraction;
  const breathable = oxygenKPa >= 16 && oxygenKPa <= 30 && pressureKPa <= 160
    && body.atmosphere.co2Fraction < .01 && !policy.corrosive;
  return Object.freeze({ policyId: body.environmentPolicyId, gravityG: inSpace ? 0 : body.physical.surfaceGravityG,
    pressureKPa, oxygenFraction, co2Fraction: inSpace ? 0 : body.atmosphere.co2Fraction,
    inertFraction: inSpace ? 0 : body.atmosphere.inertFraction, breathable,
    requiresPressureSuit: pressureKPa < 35 || pressureKPa > 160 || Boolean(policy.corrosive),
    temperatureC: policy.temperatureC, corrosive: !inSpace && Boolean(policy.corrosive), radiation: policy.radiation,
    liquidMedium: inSpace ? "none" : policy.liquidMedium ?? "none", wind: inSpace ? 0 : policy.wind ?? 0,
    weather: inSpace || pressureKPa === 0 ? Object.freeze(["clear"]) : policy.weather ?? Object.freeze(["clear"]),
    // A planet's colored atmospheric dome belongs to its surface, not orbit.
    sky: inSpace ? Object.freeze({ ...bodySkyPolicy(body), day: "#030509", night: "#020307", dusk: "#080911", aurora: 0 }) : bodySkyPolicy(body),
  });
}

/** Shared scale preserves authored Home game feel across all motion systems. */
export function gravityAcceleration(homeAcceleration: number, gravityG = 1): number {
  return homeAcceleration * Math.max(0, Number.isFinite(gravityG) ? gravityG : 1);
}
export function gravityGait(gravityG: number) {
  const g = Math.max(0, gravityG);
  return { supported: g >= .08 && g <= 2.5, minGravityG: .08, maxGravityG: 2.5,
    mode: g === 0 ? "drift" as const : g < .08 || g > 2.5 ? "brace" as const : g < .6 ? "bound" as const : "walk" as const,
    cadence: Math.sqrt(Math.max(.08, g)), stride: Math.min(2.4, 1 / Math.sqrt(Math.max(.08, g))),
    safeDrop: g === 0 ? 0 : Math.min(8, 1 / g) };
}
export const ZERO_G_NUMERICAL_DAMPING = 0; // No hidden air drag in vacuum.
export function contactPushOffSpeed(carriedMassKg: number): number {
  return 240 / (80 + Math.max(0, Number.isFinite(carriedMassKg) ? carriedMassKg : 0));
}
export function effectiveFallDistance(distance: number, gravityG: number): number {
  return Math.max(0, distance) * Math.max(0, gravityG);
}
