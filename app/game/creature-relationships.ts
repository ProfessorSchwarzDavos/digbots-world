import { cloneCreatureMetadata, type CreatureMetadata, type JsonValue } from "./creature-cage";
import { Item } from "./data";
import { MOB_DEFS, type MobKind, type MobTemperament } from "./mobs";

export const CREATURE_RELATIONSHIP_SCHEMA = 1 as const;
export const CREATURE_STABILIZE_RATIO = 0.75;

export type CreatureRelationshipMode =
  | "care-bond"
  | "covenant"
  | "commission"
  | "recruitment"
  | "summon-lifecycle"
  | "relocation-only"
  | "none";

export type CreatureRelationshipStatus =
  | "contained"
  | "acclimating"
  | "bond-ready"
  | "companion"
  | "covenant"
  | "commissioned"
  | "recruited"
  | "summoned"
  | "relocation-only"
  | "ineligible";

export type CreatureRelationshipPolicy = Readonly<{
  mode: CreatureRelationshipMode;
  orbEligible: boolean;
  companionEligible: boolean;
  title: string;
  explanation: string;
}>;

export type CreatureRelationshipV1 = Readonly<{
  schemaVersion: typeof CREATURE_RELATIONSHIP_SCHEMA;
  mode: CreatureRelationshipMode;
  status: CreatureRelationshipStatus;
  keeperId: string | null;
  captorId: string | null;
  capturedAt: number;
  stabilized: boolean;
  nourished: boolean;
  connectSessions: number;
  requiredConnectSessions: number;
  lastConnectDay: number;
  bondedAt: number | null;
}>;

export type CreatureRehabilitationStage = "stabilize" | "nourish" | "connect" | "form-bond" | "complete" | "unavailable";

const RELATIONSHIP_MODES = new Set<CreatureRelationshipMode>([
  "care-bond", "covenant", "commission", "recruitment", "summon-lifecycle", "relocation-only", "none",
]);
const RELATIONSHIP_STATUSES = new Set<CreatureRelationshipStatus>([
  "contained", "acclimating", "bond-ready", "companion", "covenant", "commissioned", "recruited",
  "summoned", "relocation-only", "ineligible",
]);

const connectSessionsForTemperament = (temperament: MobTemperament) => {
  if (temperament === "Gentle") return 1;
  if (temperament === "Skittish" || temperament === "Defensive") return 2;
  return 3;
};

export function creatureRelationshipPolicy(kind: MobKind): CreatureRelationshipPolicy {
  const definition = MOB_DEFS[kind];
  const family = definition.family ?? "surface";
  if (kind === "vacuum-lantern") {
    return Object.freeze({
      mode: "relocation-only", orbEligible: false, companionEligible: false,
      title: "Sealed Specimen Jar",
      explanation: "A sealed jar relocates this specimen only while keeper and Lantern share a safely pressurized enclosure; Capture Orbs cannot contain it.",
    });
  }
  if (definition.sentient || family === "sentient") {
    return Object.freeze({
      mode: "recruitment", orbEligible: false, companionEligible: true,
      title: "Recruitment",
      explanation: "People join through dialogue, reputation, and quests; a Capture Orb cannot contain them.",
    });
  }
  if (family === "construct") {
    return Object.freeze({
      mode: "commission", orbEligible: false, companionEligible: true,
      title: "Commissioning",
      explanation: "Constructs are assembled, repaired, or commissioned instead of captured.",
    });
  }
  if (family === "undead") {
    return Object.freeze({
      mode: "none", orbEligible: false, companionEligible: false,
      title: "Unbound",
      explanation: "This creature cannot form an ordinary keeper bond.",
    });
  }
  if (family === "summon") {
    return Object.freeze({
      mode: "summon-lifecycle", orbEligible: false, companionEligible: true,
      title: "Summoning",
      explanation: "This being follows its authored summoning and Worldpin lifecycle.",
    });
  }
  if (family === "dragon" || family === "leviathan" || family === "legendary") {
    return Object.freeze({
      mode: "covenant", orbEligible: false, companionEligible: true,
      title: "Covenant",
      explanation: "This exceptional creature keeps its visible authored quest, hatching, or covenant path.",
    });
  }
  if (((family === "fish" || family === "sea-slug" || family === "butterfly") && !definition.tameable)
    || (family === "pollinator" && !definition.tameable)) {
    return Object.freeze({
      mode: "relocation-only", orbEligible: true, companionEligible: false,
      title: "Relocation",
      explanation: "A Capture Orb can safely relocate this creature, but it does not become a field companion.",
    });
  }
  return Object.freeze({
    mode: "care-bond", orbEligible: true, companionEligible: true,
    title: "Care Bond",
    explanation: "Containment grants custody only. Stabilize, nourish, and connect before deliberately forming a bond.",
  });
}

function defaultStatus(mode: CreatureRelationshipMode, metadata: Pick<CreatureMetadata, "tamed">): CreatureRelationshipStatus {
  if (metadata.tamed) {
    if (mode === "covenant") return "covenant";
    if (mode === "commission") return "commissioned";
    if (mode === "recruitment") return "recruited";
    if (mode === "summon-lifecycle") return "summoned";
    return "companion";
  }
  if (mode === "care-bond") return "contained";
  if (mode === "relocation-only") return "relocation-only";
  return "ineligible";
}

function automaticStabilization(metadata: Pick<CreatureMetadata, "health" | "maxHealth">) {
  return metadata.health > 0 && metadata.health >= Math.ceil(metadata.maxHealth * CREATURE_STABILIZE_RATIO);
}

function withDerivedRelationshipStatus(relationship: CreatureRelationshipV1): CreatureRelationshipV1 {
  if (relationship.mode !== "care-bond" || relationship.status === "companion") return relationship;
  if (!relationship.stabilized || !relationship.nourished) return { ...relationship, status: "acclimating" };
  if (relationship.connectSessions < relationship.requiredConnectSessions) return { ...relationship, status: "acclimating" };
  return { ...relationship, status: "bond-ready" };
}

function relationshipFromUnknown(value: unknown, metadata: CreatureMetadata): CreatureRelationshipV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Partial<CreatureRelationshipV1>;
  if (raw.schemaVersion !== CREATURE_RELATIONSHIP_SCHEMA || !RELATIONSHIP_MODES.has(raw.mode as CreatureRelationshipMode)
    || !RELATIONSHIP_STATUSES.has(raw.status as CreatureRelationshipStatus)) return null;
  const policy = creatureRelationshipPolicy(metadata.kind);
  const required = connectSessionsForTemperament(metadata.temperament);
  const keeperId = typeof raw.keeperId === "string" && raw.keeperId.length <= 160 ? raw.keeperId : null;
  const captorId = typeof raw.captorId === "string" && raw.captorId.length <= 160 ? raw.captorId : null;
  const relationship: CreatureRelationshipV1 = {
    schemaVersion: CREATURE_RELATIONSHIP_SCHEMA,
    mode: policy.mode,
    status: raw.status as CreatureRelationshipStatus,
    keeperId,
    captorId,
    capturedAt: Math.max(0, Number.isFinite(raw.capturedAt) ? Number(raw.capturedAt) : 0),
    stabilized: raw.stabilized === true || automaticStabilization(metadata),
    nourished: raw.nourished === true,
    connectSessions: Math.min(required, Math.max(0, Math.floor(Number(raw.connectSessions) || 0))),
    requiredConnectSessions: required,
    lastConnectDay: Number.isFinite(raw.lastConnectDay) ? Math.floor(Number(raw.lastConnectDay)) : -1,
    bondedAt: Number.isFinite(raw.bondedAt) ? Math.max(0, Number(raw.bondedAt)) : null,
  };
  return Object.freeze(withDerivedRelationshipStatus(relationship));
}

export function normalizeCreatureRelationship(metadata: CreatureMetadata): CreatureRelationshipV1 {
  const normalized = relationshipFromUnknown(metadata.custom.relationship, metadata);
  if (normalized) {
    if (metadata.tamed && normalized.status !== "companion" && normalized.mode === "care-bond") {
      return Object.freeze({ ...normalized, status: "companion", keeperId: metadata.ownerId, bondedAt: normalized.bondedAt ?? 0 });
    }
    return normalized;
  }
  const policy = creatureRelationshipPolicy(metadata.kind);
  const required = connectSessionsForTemperament(metadata.temperament);
  return Object.freeze(withDerivedRelationshipStatus({
    schemaVersion: CREATURE_RELATIONSHIP_SCHEMA,
    mode: policy.mode,
    status: defaultStatus(policy.mode, metadata),
    keeperId: metadata.ownerId,
    captorId: metadata.ownerId,
    capturedAt: 0,
    stabilized: automaticStabilization(metadata),
    nourished: metadata.tamed,
    connectSessions: metadata.tamed ? required : 0,
    requiredConnectSessions: required,
    lastConnectDay: -1,
    bondedAt: metadata.tamed ? 0 : null,
  }));
}

function writeRelationship(metadata: CreatureMetadata, relationship: CreatureRelationshipV1): CreatureMetadata {
  return {
    ...cloneCreatureMetadata(metadata),
    custom: {
      ...metadata.custom,
      relationship: relationship as unknown as JsonValue,
    },
  };
}

export function markCreatureCaptured(metadata: CreatureMetadata, captorId: string, capturedAt = Date.now()): CreatureMetadata {
  const policy = creatureRelationshipPolicy(metadata.kind);
  const existing = normalizeCreatureRelationship(metadata);
  // Old valid companion records already carry authoritative tamed/owner state.
  // Derive their relationship at read time so a simple orb round-trip remains
  // byte-for-byte lossless for legacy custom metadata.
  if (metadata.tamed || existing.status === "companion") return cloneCreatureMetadata(metadata);
  const relationship = withDerivedRelationshipStatus({
    ...existing,
    mode: policy.mode,
    status: defaultStatus(policy.mode, metadata),
    captorId: captorId.slice(0, 160),
    capturedAt: Math.max(0, capturedAt),
    stabilized: automaticStabilization(metadata),
  });
  return writeRelationship(metadata, Object.freeze(relationship));
}

export function refreshCreatureStabilization(metadata: CreatureMetadata): CreatureMetadata {
  const relationship = normalizeCreatureRelationship(metadata);
  if (relationship.mode !== "care-bond" || relationship.stabilized || !automaticStabilization(metadata)) return metadata;
  return writeRelationship(metadata, Object.freeze(withDerivedRelationshipStatus({ ...relationship, stabilized: true })));
}

export function nourishCreatureRelationship(metadata: CreatureMetadata): CreatureMetadata {
  const refreshed = refreshCreatureStabilization(metadata);
  const relationship = normalizeCreatureRelationship(refreshed);
  if (relationship.mode !== "care-bond" || !relationship.stabilized || relationship.nourished) return refreshed;
  return writeRelationship(refreshed, Object.freeze(withDerivedRelationshipStatus({ ...relationship, nourished: true })));
}

export function connectWithCreature(metadata: CreatureMetadata, worldDay: number): Readonly<{
  metadata: CreatureMetadata;
  accepted: boolean;
  message: string;
}> {
  const refreshed = refreshCreatureStabilization(metadata);
  const relationship = normalizeCreatureRelationship(refreshed);
  if (relationship.mode !== "care-bond") {
    return Object.freeze({ metadata: refreshed, accepted: false, message: `${creatureRelationshipPolicy(metadata.kind).title} uses a different relationship path.` });
  }
  if (!relationship.stabilized) return Object.freeze({ metadata: refreshed, accepted: false, message: "Stabilize this creature to at least 75% health first." });
  if (!relationship.nourished) return Object.freeze({ metadata: refreshed, accepted: false, message: "Offer its displayed preferred food first." });
  const day = Math.max(0, Math.floor(worldDay));
  if (relationship.lastConnectDay === day) return Object.freeze({ metadata: refreshed, accepted: false, message: "This creature has had enough focused connection for today." });
  if (relationship.connectSessions >= relationship.requiredConnectSessions) {
    return Object.freeze({ metadata: refreshed, accepted: false, message: "Trust is ready. Choose Form Bond when you mean it." });
  }
  const connectSessions = relationship.connectSessions + 1;
  const updated = Object.freeze(withDerivedRelationshipStatus({ ...relationship, connectSessions, lastConnectDay: day }));
  return Object.freeze({
    metadata: writeRelationship(refreshed, updated),
    accepted: true,
    message: connectSessions >= updated.requiredConnectSessions
      ? "Trust is ready. Forming a bond is now an explicit choice."
      : `Connection ${connectSessions}/${updated.requiredConnectSessions} complete.`,
  });
}

export function formCreatureBond(metadata: CreatureMetadata, keeperId: string, bondedAt = Date.now()): Readonly<{
  metadata: CreatureMetadata;
  accepted: boolean;
  message: string;
}> {
  const refreshed = refreshCreatureStabilization(metadata);
  const relationship = normalizeCreatureRelationship(refreshed);
  if (relationship.mode !== "care-bond") {
    return Object.freeze({ metadata: refreshed, accepted: false, message: `${creatureRelationshipPolicy(metadata.kind).title} uses a different relationship path.` });
  }
  if (relationship.status !== "bond-ready" && relationship.status !== "companion") {
    return Object.freeze({ metadata: refreshed, accepted: false, message: "Finish Stabilize, Nourish, and Connect before forming a bond." });
  }
  if (relationship.status === "companion") {
    return Object.freeze({ metadata: refreshed, accepted: false, message: "This creature is already a companion." });
  }
  const ownerId = keeperId.slice(0, 160);
  const updated = Object.freeze({
    ...relationship,
    status: "companion" as const,
    keeperId: ownerId,
    bondedAt: Math.max(0, bondedAt),
  });
  const custom: Record<string, JsonValue> = {
    ...refreshed.custom,
    relationship: updated as unknown as JsonValue,
    creatureOwnerId: ownerId,
    creatureTamed: true,
  };
  const petState = custom.petState;
  if (petState && typeof petState === "object" && !Array.isArray(petState)) {
    custom.petState = { ...petState, tamed: true, ownerId, command: "follow" };
  }
  // Compatibility adapters are written at the one canonical Form Bond
  // boundary. Older controllers may still read one of these authored records,
  // so they must agree with the canonical relationship immediately rather
  // than waiting for another feed or interaction to repair themselves.
  for (const key of ["courserBond", "reedstriderBond", "shadeState", "apiaryBee"] as const) {
    const state = custom[key];
    if (state && typeof state === "object" && !Array.isArray(state)) {
      custom[key] = { ...state, tamed: true, ownerId };
    }
  }
  return Object.freeze({
    metadata: {
      ...refreshed,
      tamed: true,
      hostile: false,
      ownerId,
      command: "follow",
      custom,
    },
    accepted: true,
    message: "Bond formed. This creature is now a friendly, usable companion.",
  });
}

/**
 * Explicitly transfers an existing companion bond between two keepers.
 * Capture-orb custody alone is not sufficient: the current canonical keeper
 * must match, and every legacy controller is updated at the same boundary.
 */
export function transferCreatureBond(
  metadata: CreatureMetadata,
  currentKeeperId: string,
  nextKeeperId: string,
): Readonly<{ metadata: CreatureMetadata; accepted: boolean; message: string }> {
  const relationship = normalizeCreatureRelationship(metadata);
  const current = currentKeeperId.trim().slice(0, 160);
  const next = nextKeeperId.trim().slice(0, 160);
  if (!current || !next || current === next) {
    return Object.freeze({ metadata: cloneCreatureMetadata(metadata), accepted: false, message: "Choose a different connected keeper." });
  }
  if (relationship.status !== "companion" || !metadata.tamed) {
    return Object.freeze({ metadata: cloneCreatureMetadata(metadata), accepted: false, message: "Only a fully bonded companion can be transferred." });
  }
  if ((relationship.keeperId ?? metadata.ownerId) !== current || metadata.ownerId !== current) {
    return Object.freeze({ metadata: cloneCreatureMetadata(metadata), accepted: false, message: "Only the current keeper can offer this companion." });
  }
  const updated = Object.freeze({ ...relationship, keeperId: next });
  const custom: Record<string, JsonValue> = {
    ...metadata.custom,
    relationship: updated as unknown as JsonValue,
    creatureOwnerId: next,
    creatureTamed: true,
  };
  const petState = custom.petState;
  if (petState && typeof petState === "object" && !Array.isArray(petState)) {
    custom.petState = { ...petState, tamed: true, ownerId: next, command: "follow" };
  }
  for (const key of ["courserBond", "reedstriderBond", "shadeState", "apiaryBee"] as const) {
    const state = custom[key];
    if (state && typeof state === "object" && !Array.isArray(state)) custom[key] = { ...state, tamed: true, ownerId: next };
  }
  return Object.freeze({
    metadata: {
      ...cloneCreatureMetadata(metadata),
      ownerId: next,
      command: "follow",
      custom,
    },
    accepted: true,
    message: "Transfer accepted. The companion now recognizes its new keeper.",
  });
}

export function creatureRehabilitationStage(metadata: CreatureMetadata): CreatureRehabilitationStage {
  const relationship = normalizeCreatureRelationship(metadata);
  if (relationship.mode !== "care-bond") return relationship.status === "companion" ? "complete" : "unavailable";
  if (relationship.status === "companion") return "complete";
  if (!relationship.stabilized) return "stabilize";
  if (!relationship.nourished) return "nourish";
  if (relationship.connectSessions < relationship.requiredConnectSessions) return "connect";
  return "form-bond";
}

export function canAttuneCreature(metadata: CreatureMetadata) {
  const relationship = normalizeCreatureRelationship(metadata);
  return metadata.tamed || relationship.status === "companion"
    || relationship.status === "covenant" || relationship.status === "commissioned"
    || relationship.status === "recruited" || relationship.status === "summoned";
}

export function preferredRelationshipFood(kind: MobKind) {
  const definition = MOB_DEFS[kind];
  return definition.tameItems?.[0] ?? definition.diet?.[0] ?? definition.breedingFoods?.[0] ?? null;
}

export function validateCreatureRelationshipPolicies(): readonly string[] {
  const issues: string[] = [];
  for (const kind of Object.keys(MOB_DEFS) as MobKind[]) {
    const definition = MOB_DEFS[kind];
    const policy = creatureRelationshipPolicy(kind);
    if (policy.mode === "care-bond" && (!policy.orbEligible || !policy.companionEligible)) {
      issues.push(`${kind}: care-bond policy must support both capture and companionship`);
    }
    const sealedJar = kind === "vacuum-lantern" && definition.captureItem === Item.SpecimenJar;
    if (policy.mode === "relocation-only" && ((!policy.orbEligible && !sealedJar) || policy.companionEligible)) {
      issues.push(`${kind}: relocation-only policy must capture without companionship`);
    }
    if (policy.mode === "recruitment" && policy.orbEligible) issues.push(`${kind}: sentient recruitment cannot use an orb`);
    if (policy.mode === "commission" && policy.orbEligible) issues.push(`${kind}: construct commissioning cannot use an orb`);
    if (definition.tameable === true && !policy.companionEligible) {
      issues.push(`${kind}: tameable definition has no usable relationship path`);
    }
    if (definition.rideable === true && !policy.companionEligible) {
      issues.push(`${kind}: rideable definition has no ownership path`);
    }
    if (policy.orbEligible && definition.captureItem !== undefined && definition.captureItem !== Item.CaptureOrb) {
      issues.push(`${kind}: capturable definition still names a noncanonical custody item`);
    }
  }
  return Object.freeze(issues);
}
