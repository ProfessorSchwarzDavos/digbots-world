/** Leaf catalog: no renderer/engine/data imports. Numeric IDs are append-only save identities. */
export const PRESSURE_CATALOG = {
  "liquid-pipe": { id: 659, name: "Liquid Pipe", color: "#78b7bf", joules: 0, watts: 0, fluid: 2000, gas: 0 },
  gasline: { id: 660, name: "Gasline", color: "#abc98e", joules: 0, watts: 0, fluid: 0, gas: 4800 },
  "heat-conduit": { id: 661, name: "Heat Conduit", color: "#ca9168", joules: 0, watts: 0, fluid: 0, gas: 0 },
  "atmospheric-condenser": { id: 662, name: "Atmospheric Condenser", color: "#9ac5bc", joules: 64000, watts: 4000, fluid: 8000, gas: 48000 },
  electrolyzer: { id: 663, name: "Electrolyzer", color: "#a3cbc5", joules: 96000, watts: 12000, fluid: 8000, gas: 48000 },
  "gas-compressor": { id: 664, name: "Gas Compressor", color: "#b6b98d", joules: 64000, watts: 6000, fluid: 0, gas: 240000 },
  "fluid-refinery": { id: 665, name: "Fluid Refinery", color: "#bf986a", joules: 96000, watts: 8000, fluid: 32000, gas: 24000 },
  "chemical-mixer": { id: 666, name: "Chemical Mixer", color: "#8daaba", joules: 64000, watts: 6000, fluid: 16000, gas: 24000 },
  "reaction-chamber": { id: 667, name: "Reaction Chamber", color: "#b7a27c", joules: 128000, watts: 10000, fluid: 16000, gas: 192000 },
  "carbon-scrubber": { id: 668, name: "Carbon Scrubber", color: "#aaa68b", joules: 64000, watts: 4000, fluid: 0, gas: 48000 },
  "life-support-controller": { id: 669, name: "Life-Support Controller", color: "#8ebeb0", joules: 128000, watts: 8000, fluid: 0, gas: 240000 },
  "thermal-regulator": { id: 670, name: "Thermal Regulator", color: "#a9b7b0", joules: 96000, watts: 8000, fluid: 16000, gas: 0 },
  "hydrogen-turbine": { id: 671, name: "Hydrogen Turbine", color: "#9dbcbf", joules: 96000, watts: 8000, fluid: 16000, gas: 48000 },
  "methane-reformer": { id: 672, name: "Methane Reformer", color: "#a9b585", joules: 96000, watts: 8000, fluid: 16000, gas: 144000 },
  "gas-engine": { id: 673, name: "Gas Engine", color: "#b8946c", joules: 96000, watts: 8000, fluid: 16000, gas: 144000 },
  "pressure-door": { id: 674, name: "Pressure Door", color: "#9caeab", joules: 12000, watts: 1000, fluid: 0, gas: 0 },
  "horizon-door": { id: 675, name: "Horizon Door", color: "#c3d4cc", joules: 18000, watts: 2000, fluid: 0, gas: 0 },
  "hangar-pressure-gate": { id: 676, name: "Hangar Pressure Gate", color: "#9ab5b7", joules: 64000, watts: 6000, fluid: 0, gas: 0 },
  "airlock-controller": { id: 677, name: "Airlock Controller", color: "#c4af7e", joules: 64000, watts: 4000, fluid: 0, gas: 0 },
  "atmosphere-vent": { id: 678, name: "Atmosphere Vent", color: "#85b9b2", joules: 32000, watts: 2000, fluid: 0, gas: 48000 },
  "equalization-vent": { id: 679, name: "Equalization Vent", color: "#9baeb2", joules: 24000, watts: 2000, fluid: 0, gas: 48000 },
  "recovery-pump": { id: 680, name: "Recovery Pump", color: "#b19c7a", joules: 64000, watts: 6000, fluid: 0, gas: 240000 },
  "pressure-sensor": { id: 681, name: "Pressure Sensor", color: "#b8bd9e", joules: 8000, watts: 500, fluid: 0, gas: 0 },
  "emergency-shutter": { id: 682, name: "Emergency Shutter", color: "#b79e7d", joules: 24000, watts: 2000, fluid: 0, gas: 0 },
} as const;
export type PressureMachineKind = keyof typeof PRESSURE_CATALOG;
export const pressureMachineKind = (kind: string): kind is PressureMachineKind => Object.hasOwn(PRESSURE_CATALOG, kind);
export const pressureMachineMeta = (kind: string) => pressureMachineKind(kind) ? PRESSURE_CATALOG[kind] : undefined;
export const TRANSPORT_KINDS = ["liquid-pipe", "gasline", "heat-conduit"] as const;
export const CHEMISTRY_KINDS = ["atmospheric-condenser", "electrolyzer", "gas-compressor", "fluid-refinery", "chemical-mixer", "reaction-chamber", "carbon-scrubber", "hydrogen-turbine", "methane-reformer", "gas-engine"] as const;
export const chemistryMachine = (kind: string) => (CHEMISTRY_KINDS as readonly string[]).includes(kind);
export const pressureDoorKind = (kind: string) => ["pressure-door", "horizon-door", "hangar-pressure-gate", "emergency-shutter"].includes(kind);
