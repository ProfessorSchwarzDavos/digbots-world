import { Item, type InventorySlot } from "./data";
import { decodeCaptureOrb, LEGACY_LENS_ORB_ITEMS, LEGACY_SPECIES_ORB_ITEMS, type CaptureOrb } from "./capture-orbs";
import { decodeCapturedCreature, normalizeCreatureMetadata, type CapturedCreature, type CreatureMetadata } from "./creature-cage";
import { custodyJsonIdentity, validCustodyItem } from "./wayworks-custody";
import { readCreatureMetadataOrigins } from "./creature-origins";
import { assertExactKeys, canonicalJson, cloneUniverseJson, freezeUniverseJson, isUniverseRecord } from "./universe-json";

/** A read result, not a replacement item or a new custody owner. The original
 * encoded bytes remain available; consumers must never save decoded defaults. */
export type StoredCreatureCustody = Readonly<{
  format: "capture-orb" | "legacy-cage" | "lantern-jar";
  containerId: string; capturedAt: number; creature: CreatureMetadata;
  attunement: CaptureOrb["attunement"];
  encoded: string; legacyMirror?: string;
}>;
const orbFields = ["schema", "orbId", "capturedAt", "creature"] as const;
function parse(encoded: string): Record<string, unknown> {
  if (typeof encoded !== "string" || !encoded || encoded.length > 65_536) throw Error("Invalid stored creature encoding.");
  const value: unknown = JSON.parse(encoded);
  if (!isUniverseRecord(value)) throw Error("Invalid stored creature record.");
  canonicalJson(value); return value;
}
function identity(value: unknown, maximum: number): asserts value is string {
  if (typeof value !== "string" || !value || value.length > maximum || value.trim() !== value) throw Error("Invalid stored creature identity.");
}
function checkCreature(raw: unknown, decoded: CreatureMetadata | null | undefined) {
  if (!decoded || canonicalJson(raw) !== canonicalJson(decoded)) throw Error("Stored creature requires migration or lossy normalization.");
  identity(decoded.entityId, 160);
  readCreatureMetadataOrigins(decoded.custom);
}

/** Housed residents have creature metadata but no invented orb or cage. */
export function readExactCreatureMetadata(value: CreatureMetadata): CreatureMetadata {
  custodyJsonIdentity(value);
  checkCreature(value, normalizeCreatureMetadata(value));
  return freezeUniverseJson(cloneUniverseJson(value));
}

/** Parse an existing orb without species-stock migration, clock reads, ID
 * allocation, lens removal, health repair or rewriting any opaque custom data.
 * Supported old absent optional fields stay absent in the returned raw record. */
export function readExactEncodedCaptureOrb(encoded: string): CaptureOrb {
  const raw = parse(encoded);
  assertExactKeys(raw, [...orbFields, ...(Object.hasOwn(raw, "lens") ? ["lens"] : []),
    ...(Object.hasOwn(raw, "attunement") ? ["attunement"] : [])], "Stored capture orb");
  identity(raw.orbId, 80);
  const decoded = decodeCaptureOrb(encoded);
  if (!decoded || raw.schema !== 1 || raw.capturedAt !== decoded.capturedAt) throw Error("Invalid stored capture orb.");
  if (raw.creature !== null) checkCreature(raw.creature, decoded.creature);
  if (raw.attunement !== undefined && raw.attunement !== null) {
    if (!isUniverseRecord(raw.attunement) || !raw.creature) throw Error("Invalid stored orb attunement.");
    assertExactKeys(raw.attunement, ["ownerId", "attunedAt", "activeEntityId", "recalledAt", "recallCount", "fainted"], "Stored orb attunement");
    identity(raw.attunement.ownerId, 160);
    if (raw.attunement.activeEntityId !== null) identity(raw.attunement.activeEntityId, 160);
    if (!Number.isSafeInteger(raw.attunement.recallCount) || canonicalJson(raw.attunement) !== canonicalJson(decoded.attunement))
      throw Error("Stored orb attunement requires lossy normalization.");
  }
  // A legacy lens is non-spatial portable configuration. Decoding ordinarily
  // clears it; this read deliberately preserves the original supported value.
  return freezeUniverseJson(cloneUniverseJson(raw)) as CaptureOrb;
}
function readExactCage(encoded: string): CapturedCreature {
  const raw = parse(encoded);
  assertExactKeys(raw, ["schema", "cageId", "capturedAt", "creature"], "Stored creature cage");
  identity(raw.cageId, 80);
  const decoded = decodeCapturedCreature(encoded);
  if (!decoded || canonicalJson(raw) !== canonicalJson(decoded)) throw Error("Stored cage requires migration or lossy normalization.");
  checkCreature(raw.creature, decoded.creature);
  return freezeUniverseJson(cloneUniverseJson(raw)) as CapturedCreature;
}

/** Reads only this exact slot, not nested machine sockets or another inventory.
 * Complete owner traversal and deployed-body reconciliation are separate gates.
 * Legacy stock with no identity is refused, not materialized during preflight. */
export function readStoredCreatureCustody(slot: InventorySlot | null): StoredCreatureCustody | null {
  if (slot === null) return null;
  if (!validCustodyItem(slot)) throw Error("Invalid stored creature inventory slot.");
  const metadata = slot.metadata ?? {}, isOrb = slot.item === Item.CaptureOrb || slot.item === Item.LegacyCaptureOrb
    || LEGACY_LENS_ORB_ITEMS.includes(slot.item) || LEGACY_SPECIES_ORB_ITEMS.includes(slot.item);
  const hasOrb = Object.hasOwn(metadata, "captureOrb"), hasCage = Object.hasOwn(metadata, "capturedCreature");
  if (!hasOrb && !hasCage) {
    if (LEGACY_SPECIES_ORB_ITEMS.includes(slot.item)) throw Error("Unmaterialized legacy species stock requires explicit migration before custody preflight.");
    if (slot.item === Item.VacuumLanternJar) throw Error("Filled lantern jar has no creature custody.");
    return null;
  }
  if (slot.count !== 1 || !isOrb && slot.item !== Item.VacuumLanternJar) throw Error("Stored creature must have one supported physical vessel.");
  const cage = hasCage ? readExactCage(metadata.capturedCreature as string) : null;
  if (hasOrb) {
    if (!isOrb) throw Error("Capture orb payload is attached to another vessel.");
    const orb = readExactEncodedCaptureOrb(metadata.captureOrb as string);
    if (cage && (cage.cageId !== orb.orbId || cage.capturedAt !== orb.capturedAt || canonicalJson(cage.creature) !== canonicalJson(orb.creature)))
      throw Error("Capture orb and legacy mirror disagree about creature custody.");
    if (!orb.creature) return null;
    return freezeUniverseJson({ format: "capture-orb", containerId: orb.orbId, capturedAt: orb.capturedAt, creature: orb.creature,
      attunement: orb.attunement ?? null, encoded: metadata.captureOrb as string,
      ...(hasCage ? { legacyMirror: metadata.capturedCreature as string } : {}) });
  }
  if (!cage || slot.item === Item.VacuumLanternJar && cage.creature.kind !== "vacuum-lantern") throw Error("Invalid lantern jar species custody.");
  return freezeUniverseJson({ format: slot.item === Item.VacuumLanternJar ? "lantern-jar" : "legacy-cage", containerId: cage.cageId,
    capturedAt: cage.capturedAt, creature: cage.creature, attunement: null, encoded: metadata.capturedCreature as string });
}
