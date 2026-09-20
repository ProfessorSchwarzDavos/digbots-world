/** Append-only hardware identities. The existing workshop owns power/materials. */
export const SPACEFLIGHT_CATALOG = {
  "launch-pad": { id: 693, name: "Launch Pad", color: "#969e98", joules: 0, watts: 0, fluid: 0, gas: 0 },
  "fuel-gantry": { id: 694, name: "Fuel Gantry", color: "#c59367", joules: 240000, watts: 24000, fluid: 120000, gas: 240000 },
  "mission-console": { id: 695, name: "Mission Console", color: "#7dafaa", joules: 16000, watts: 2000, fluid: 0, gas: 0 },
  "tracking-beacon": { id: 696, name: "Tracking Beacon", color: "#d4b979", joules: 32000, watts: 2000, fluid: 0, gas: 0 },
  "orbital-dock": { id: 697, name: "Orbital Dock", color: "#b1bcaf", joules: 240000, watts: 24000, fluid: 120000, gas: 240000 },
  "recovery-crane": { id: 698, name: "Recovery Crane", color: "#c29965", joules: 128000, watts: 12000, fluid: 0, gas: 0 },
  "station-core": { id: 699, name: "Station Claim Core", color: "#9eb6ad", joules: 128000, watts: 8000, fluid: 0, gas: 0 },
  "station-truss": { id: 700, name: "Station Truss", color: "#899b99", joules: 0, watts: 0, fluid: 0, gas: 0 },
  "station-radiator": { id: 701, name: "Station Radiator", color: "#a9bab4", joules: 32000, watts: 4000, fluid: 16000, gas: 0 },
  "station-observatory": { id: 702, name: "Station Observatory", color: "#c0b490", joules: 64000, watts: 4000, fluid: 0, gas: 0 },
} as const;
export type SpaceflightMachineKind = keyof typeof SPACEFLIGHT_CATALOG;
export const spaceflightMachineKind = (kind: string): kind is SpaceflightMachineKind => Object.hasOwn(SPACEFLIGHT_CATALOG, kind);
export const spaceflightMachineMeta = (kind: string) => spaceflightMachineKind(kind) ? SPACEFLIGHT_CATALOG[kind] : undefined;
