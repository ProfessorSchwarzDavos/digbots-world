import type { WorldSave } from "./engine";
import { expandAsteroidRegistry } from "./asteroid-custody";
import { validateAsteroidFields, withAsteroidField } from "./asteroid-runtime";
import { parseLocationId, type LocationId } from "./location-address";
import { workshopHeatCapacity, workshopRunning } from "./wayworks-stores";

export const ASTEROID_SURVEY_ENERGY_J = 1000;
export type AsteroidSurveyIntent = Readonly<{ kind: "asteroid-survey"; epoch: number; registryRevision: number }>;

/** Pure candidate construction: a survey never edits the currently running view.
 * All existing records and attached location metadata retain their single owner. */
export function prepareAsteroidSurvey(save: WorldSave, location: LocationId, machineKey: string,
  expectedMachineRevision: number, intent: AsteroidSurveyIntent): WorldSave {
  const address = parseLocationId(location), fields = validateAsteroidFields(save.asteroidFields, address.universeId);
  const registry = fields.fields[location], machine = save.wayworks?.[machineKey];
  if (address.kind !== "orbit" || !registry) throw Error("Survey an existing orbital field from its observatory.");
  if (!machine || machine.kind !== "station-observatory" || machine.locationId !== location || machine.ownerId !== "local"
    || !machine.enabled || !workshopRunning(machine.workshop)) throw Error("Use your enabled local observatory.");
  if (!Number.isSafeInteger(expectedMachineRevision) || machine.revision !== expectedMachineRevision || machine.revision >= Number.MAX_SAFE_INTEGER) throw Error("Inspect the observatory again before surveying.");
  if (machine.energyJ < ASTEROID_SURVEY_ENERGY_J || workshopHeatCapacity(machine.workshop) - machine.workshop.heatJ < ASTEROID_SURVEY_ENERGY_J) throw Error("The survey needs 1 kJ and space for 1 kJ of instrument heat.");
  const expanded = expandAsteroidRegistry(registry, registry.expansionLevel + 1, { orbit: address, seed: registry.seed,
    epoch: intent.epoch, expectedRevision: intent.registryRevision });
  return { ...save, asteroidFields: withAsteroidField(fields, expanded), wayworks: { ...save.wayworks,
    [machineKey]: { ...machine, energyJ: machine.energyJ - ASTEROID_SURVEY_ENERGY_J, revision: machine.revision + 1,
      workshop: { ...machine.workshop, heatJ: machine.workshop.heatJ + ASTEROID_SURVEY_ENERGY_J } } } };
}
