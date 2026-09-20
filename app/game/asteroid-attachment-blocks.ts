import type { AquariumState } from "./aquarium";
import type { MachineState } from "./wayworks";
import { canonicalJson, cloneUniverseJson } from "./universe-json";
import { asteroidAttachmentContainsCell, rebaseAsteroidAquariums, rebaseAsteroidKeyed, rebaseAsteroidMachines,
  type AsteroidAttachmentFrame, type AsteroidAttachmentView } from "./asteroid-attachment-frame";

/** Explicit field-specific semantics; never recursively infer spatial values. */
export type AsteroidBlockCodec<T> = Readonly<{
  cells(key: string, value: T): readonly string[];
  identities(value: T): readonly string[];
  rebase(frame: AsteroidAttachmentFrame, values: Readonly<Record<string, T>>, from: AsteroidAttachmentView): Record<string, T>;
}>;
export function opaqueAsteroidBlockCodec<T>(): AsteroidBlockCodec<T> {
  return { cells: key => [key], identities: () => [], rebase: rebaseAsteroidKeyed };
}
export const ASTEROID_MACHINE_CODEC: AsteroidBlockCodec<MachineState> = {
  cells: key => [key], identities: state => state.workshop.process?.installationId ? [state.workshop.process.installationId] : [],
  rebase: rebaseAsteroidMachines,
};
export const ASTEROID_AQUARIUM_CODEC: AsteroidBlockCodec<AquariumState> = {
  cells: (key, state) => [key, ...state.blockKeys], identities: state => state.residents.map(resident => resident.id),
  rebase: rebaseAsteroidAquariums,
};
function selectedKeys<T>(frame: AsteroidAttachmentFrame, values: Readonly<Record<string, T>>, codec: AsteroidBlockCodec<T>, view: AsteroidAttachmentView) {
  const selected = new Set<string>(), occupied = new Set<string>(), identities = new Set<string>();
  for (const [key, value] of Object.entries(values)) {
    const cells = [...new Set([key, ...codec.cells(key, value)])];
    const hits = cells.filter(cell => asteroidAttachmentContainsCell(frame, cell, view)).length;
    if (hits !== 0 && hits !== cells.length) throw Error("Block component crosses the attached ownership boundary.");
    if (hits) selected.add(key);
    for (const cell of cells) {
      if (occupied.has(cell)) throw Error("Overlapping attached block components.");
      occupied.add(cell);
    }
    for (const id of codec.identities(value)) {
      if (!id || identities.has(id)) throw Error("Duplicate attached block identity.");
      identities.add(id);
    }
  }
  return selected;
}
/** An ephemeral selected view; the returned JSON is never another save owner. */
export function projectAsteroidBlocks<T>(frame: AsteroidAttachmentFrame, canonical: Readonly<Record<string, T>>, codec: AsteroidBlockCodec<T>): Record<string, T> {
  const selected = selectedKeys(frame, canonical, codec, "orbit");
  return codec.rebase(frame, Object.fromEntries(Object.entries(canonical).filter(([key]) => selected.has(key))), "orbit");
}
/** Selected contents may change only against their exact baseline. Outside
 * entries remain byte-equivalent JSON and are never reconstructed from the view.
 * The host must bind the owner revision and include inventory debits/credits in
 * the same durable transaction; this data merge grants no action authority.
 */
export function captureAsteroidBlocks<T>(frame: AsteroidAttachmentFrame, canonical: Readonly<Record<string, T>>,
  baseline: Readonly<Record<string, T>>, edited: Readonly<Record<string, T>>, codec: AsteroidBlockCodec<T>): Record<string, T> {
  if (canonicalJson(projectAsteroidBlocks(frame, canonical, codec)) !== canonicalJson(baseline)) throw Error("Stale asteroid block projection.");
  const editedKeys = selectedKeys(frame, edited, codec, "local");
  if (editedKeys.size !== Object.keys(edited).length) throw Error("Edited block component is outside the attached frame.");
  const incoming = codec.rebase(frame, edited, "local"), selected = selectedKeys(frame, canonical, codec, "orbit");
  const output = { ...cloneUniverseJson(Object.fromEntries(Object.entries(canonical).filter(([key]) => !selected.has(key)))), ...incoming };
  selectedKeys(frame, output, codec, "orbit");
  return output;
}
