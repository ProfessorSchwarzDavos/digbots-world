import { CELESTIAL_TERRAIN_VERSION, type CelestialTerrain } from "./celestial-terrain";

/** Bump when a generation/restore path changes authored-site semantics. This is
 * cache/worker provenance, not a save migration or a transfer permission. */
export const AUTHORED_GENERATION_RULE_VERSION = 1;

/** Shared by actual cave/features dispatch and direct feature entry. Celestial
 * content is produced by its own factory, not the legacy authored-site pass. */
export function generatesLegacyAuthoredSites(terrain: CelestialTerrain | null): boolean {
  return terrain === null;
}

export function isEmptyAuthoredOrbitFactory(terrain: CelestialTerrain | null): terrain is CelestialTerrain {
  return terrain !== null && terrain.kind === "orbit" && terrain.version === CELESTIAL_TERRAIN_VERSION
    && terrain.sites.length === 0;
}
