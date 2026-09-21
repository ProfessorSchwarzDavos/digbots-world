import { validateChestCells, type ChestCell } from "./chest-body";

export type ChestCustodyOwner = Readonly<
  { kind: "block-chest"; key: string; cells: readonly ChestCell[] }
  | { kind: "boat"; id: string }
  | { kind: "creature-cargo"; creatureId: number; cargoKind: "dragon" | "leviathan" }
  | { kind: "exhibit"; anchorKey: string }
>;
export function parseCustodyCellKey(key: string): ChestCell {
  if (typeof key !== "string" || !/^-?\d+,-?\d+,-?\d+$/.test(key)) throw Error("Invalid canonical storage cell key.");
  const coordinates = key.split(",").map(Number);
  if (!coordinates.every(Number.isSafeInteger) || coordinates.join(",") !== key) throw Error("Noncanonical storage cell identity.");
  const [x, y, z] = coordinates; return [x, y, z];
}

/** Decode only the engine's explicit chest namespaces. An exhibit anchor is NOT
 * its full topology, and mobile IDs are never interpreted as world positions. */
export function chestCustodyOwner(key: string): ChestCustodyOwner {
  if (typeof key !== "string" || !key) throw Error("Missing canonical chest owner.");
  if (key.startsWith("boat:")) {
    const id = key.slice(5);
    if (!id || id.trim() !== id) throw Error("Invalid boat chest owner.");
    return { kind: "boat", id };
  }
  if (key.startsWith("dragon:") || key.startsWith("leviathan:")) {
    const match = /^(dragon|leviathan):(\d+):cargo$/.exec(key), id = Number(match?.[2]);
    if (!match || !Number.isSafeInteger(id) || id < 0 || String(id) !== match[2]) throw Error("Invalid creature cargo owner.");
    return { kind: "creature-cargo", creatureId: id, cargoKind: match[1] as "dragon" | "leviathan" };
  }
  if (key.startsWith("exhibit:")) {
    const anchorKey = key.slice(8); parseCustodyCellKey(anchorKey);
    return { kind: "exhibit", anchorKey };
  }
  const cells = key.split("|").map(parseCustodyCellKey); validateChestCells(cells);
  return { kind: "block-chest", key, cells };
}
