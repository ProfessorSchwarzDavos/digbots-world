import { cloneUniverseJson } from "./universe-json";

/** Merge one explicitly selected identity set, preserving outside rows and old
 * same-list slots. New/moved rows append in edited order. Never overwrite an
 * outside identity: the caller's complete schema/identity validator must reject
 * any resulting collision. This grants no creation/removal/resource authority. */
export function mergeSelectedAttachmentRecords<T, K extends string | number>(canonical: readonly T[], incoming: readonly T[],
  selected: ReadonlySet<K>, key: (value: T) => K): T[] {
  const changes = new Map(incoming.map(value => [key(value), value])), used = new Set<K>(), output: T[] = [];
  for (const value of canonical) {
    const id = key(value);
    if (!selected.has(id)) output.push(cloneUniverseJson(value));
    else if (changes.has(id)) { output.push(changes.get(id)!); used.add(id); }
  }
  for (const value of incoming) if (!used.has(key(value))) output.push(value);
  return output;
}
