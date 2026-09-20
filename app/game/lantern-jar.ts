import { Item, type InventorySlot } from "./data";
import { captureCreature, decodeCapturedCreature, encodeCapturedCreature, releaseCreature, type CreatureMetadata } from "./creature-cage";

/** A jar is one physical custody container, never a stack of specimen copies. */
export function captureLanternJar(slot: InventorySlot | null, specimen: CreatureMetadata, jarId: string, at: number): InventorySlot | null {
  if (slot?.item !== Item.SpecimenJar || slot.count !== 1 || specimen.kind !== "vacuum-lantern" || specimen.health <= 0) return null;
  const captured = captureCreature(jarId, specimen, at);
  return captured ? { item: Item.VacuumLanternJar, count: 1, metadata: { capturedCreature: encodeCapturedCreature(captured) } } : null;
}

export function readLanternJar(slot: InventorySlot | null): CreatureMetadata | null {
  if (slot?.item !== Item.VacuumLanternJar || slot.count !== 1 || typeof slot.metadata?.capturedCreature !== "string") return null;
  const captured = decodeCapturedCreature(slot.metadata.capturedCreature);
  return captured?.creature.kind === "vacuum-lantern" && captured.creature.health > 0 ? releaseCreature(captured) : null;
}
