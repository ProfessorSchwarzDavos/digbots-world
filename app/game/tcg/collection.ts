import {
  TCG_CATALOG,
  defaultPrintingForDefinition,
  starterDeckPrintingIds,
  tcgDefinitionForPrinting,
} from "./catalog";
import { tcgStableId } from "./rng";
import {
  TCG_CATALOG_REVISION,
  TCG_DECK_SIZE,
  TCG_MAX_COUNT,
  TCG_MAX_DECKS,
  type TcgCatalog,
  type TcgDeck,
  type TcgDeckValidation,
  type TcgDexEntry,
  type TcgHolding,
  type TcgLocation,
  type TcgLooseCardBatch,
  type TcgMatchAction,
  type TcgMatchActionRecord,
  type TcgMatchCard,
  type TcgMatchPlayerState,
  type TcgMatchState,
  type TcgMerchantEntry,
  type TcgMerchantStock,
  type TcgChallenge,
  type TcgPlayerState,
  type TcgPrinting,
  type TcgTradeAsset,
  type TcgTradeEscrow,
  type TcgWorldState,
} from "./types";

const EVENT_HISTORY_LIMIT = 512;
const REWARD_CLAIM_LIMIT = 32_768;
const DEX_LIMIT = 16_384;
const HOLDING_LIMIT = 32_768;
export const TCG_ARCHIVE_CAPACITY: Readonly<Record<1 | 2 | 3, number>> = Object.freeze({
  1: 1_000,
  2: 10_000,
  3: 250_000,
});
export const TCG_ARCHIVE_UPGRADE_PRICE: Readonly<Record<1 | 2, number>> = Object.freeze({ 1: 500, 2: 2_500 });

const boundedInteger = (value: unknown, minimum = 0, maximum = TCG_MAX_COUNT) => {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : minimum;
  return Math.max(minimum, Math.min(maximum, numeric));
};

const boundedString = (value: unknown, fallback = "", maximum = 160) => (
  typeof value === "string" ? value.trim().slice(0, maximum) : fallback
);

const recent = (values: readonly string[], value: string, limit = EVENT_HISTORY_LIMIT) => (
  Object.freeze([...values.filter((entry) => entry !== value), value].slice(-limit))
);

export function createTcgPlayerState(ownerId: string): TcgPlayerState {
  return Object.freeze({
    schema: 1,
    revision: 0,
    ownerId: boundedString(ownerId, "player"),
    holdings: Object.freeze({}),
    archiveTier: 1,
    dex: Object.freeze({}),
    decks: Object.freeze([]),
    activeDeckId: null,
    tutorial: Object.freeze({ loanerAvailable: true, tutorialCompleted: false, starterClaimed: false }),
    npcProgress: Object.freeze({}),
    rewardClaims: Object.freeze([]),
    recentEventIds: Object.freeze([]),
  });
}

export function createTcgWorldState(authorityId: string): TcgWorldState {
  return Object.freeze({
    schema: 1,
    revision: 0,
    authorityId: boundedString(authorityId, "world:cardforge", 512),
    catalogRevision: TCG_CATALOG_REVISION,
    players: Object.freeze({}),
    packBatches: Object.freeze({}),
    looseCardBatches: Object.freeze({}),
    merchantStock: Object.freeze({}),
    activeTrades: Object.freeze({}),
    activeMatches: Object.freeze({}),
    challenges: Object.freeze({}),
    worldGrantClaims: Object.freeze([]),
    recentEventIds: Object.freeze([]),
    recoveryIssues: Object.freeze([]),
  });
}

function normalizeHolding(value: unknown): TcgHolding {
  const record = value && typeof value === "object" ? value as Partial<TcgHolding> : {};
  return Object.freeze({
    physical: boundedInteger(record.physical),
    archived: boundedInteger(record.archived),
  });
}

function normalizeDexEntry(value: unknown, definitionId: string): TcgDexEntry {
  const record = value && typeof value === "object" ? value as Partial<TcgDexEntry> : {};
  const variantSet = new Set(["standard", "showcase", "full-art", "capture", "boss-signature", "promo"]);
  const finishSet = new Set(["standard", "foil", "etched", "signature"]);
  return Object.freeze({
    definitionId,
    everOwned: record.everOwned === true,
    firstAcquiredAt: boundedInteger(record.firstAcquiredAt, 0, Number.MAX_SAFE_INTEGER),
    lastAcquiredAt: boundedInteger(record.lastAcquiredAt, 0, Number.MAX_SAFE_INTEGER),
    acquiredCount: boundedInteger(record.acquiredCount),
    variantsSeen: Object.freeze(Array.isArray(record.variantsSeen)
      ? [...new Set(record.variantsSeen.filter((entry) => typeof entry === "string" && variantSet.has(entry)))].slice(0, 8) as TcgDexEntry["variantsSeen"]
      : []),
    finishesSeen: Object.freeze(Array.isArray(record.finishesSeen)
      ? [...new Set(record.finishesSeen.filter((entry) => typeof entry === "string" && finishSet.has(entry)))].slice(0, 8) as TcgDexEntry["finishesSeen"]
      : []),
  });
}

function normalizeDeck(value: unknown, catalog: TcgCatalog): TcgDeck | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<TcgDeck>;
  const id = boundedString(record.id, "", 96);
  if (!id) return null;
  const printingIds = Array.isArray(record.printingIds)
    ? record.printingIds.filter((entry): entry is string => typeof entry === "string" && Boolean(catalog.printings[entry])).slice(0, 60)
    : [];
  return Object.freeze({
    id,
    name: boundedString(record.name, "Untitled Deck", 48),
    format: record.format === "core" ? "core" : "open",
    printingIds: Object.freeze(printingIds),
    createdAt: boundedInteger(record.createdAt, 0, Number.MAX_SAFE_INTEGER),
    updatedAt: boundedInteger(record.updatedAt, 0, Number.MAX_SAFE_INTEGER),
  });
}

const normalizedGold = (value: unknown) => (
  typeof value === "string" && /^\d{1,80}$/u.test(value) ? value : "0"
);

const normalizedEventIds = (value: unknown, limit = EVENT_HISTORY_LIMIT) => Object.freeze(
  Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0 && entry.length <= 192))].slice(-limit)
    : [],
);

function normalizeTradeAsset(value: unknown, catalog: TcgCatalog): TcgTradeAsset | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<TcgTradeAsset>;
  const printingId = boundedString(record.printingId, "", 192);
  if (!catalog.printings[printingId] || (record.location !== "physical" && record.location !== "archived")) return null;
  const count = boundedInteger(record.count, 0, 4_096);
  return count > 0 ? Object.freeze({ printingId, count, location: record.location }) : null;
}

function normalizeMerchantStock(value: unknown, id: string, catalog: TcgCatalog): TcgMerchantStock | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<TcgMerchantStock>;
  const merchantId = boundedString(record.merchantId, id, 160);
  if (!merchantId) return null;
  const entries: TcgMerchantEntry[] = [];
  for (const raw of Array.isArray(record.entries) ? record.entries.slice(0, 24) : []) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Partial<TcgMerchantEntry>;
    const entryId = boundedString(entry.id, "", 192);
    const quantity = boundedInteger(entry.quantity, 0, 4_096);
    const unitPrice = boundedInteger(entry.unitPrice, 1, 1_000_000);
    const tags = Object.freeze(Array.isArray(entry.tags)
      ? [...new Set(entry.tags.filter((tag): tag is string => typeof tag === "string" && tag.length <= 64))].slice(0, 16)
      : []);
    if (!entryId || quantity <= 0) continue;
    if (entry.kind === "pack" && catalog.packs[boundedString(entry.productId, "", 160)]) {
      entries.push(Object.freeze({ id: entryId, kind: "pack", productId: boundedString(entry.productId, "", 160), quantity, unitPrice, tags }));
    } else if (entry.kind === "card" && catalog.printings[boundedString(entry.printingId, "", 192)]) {
      entries.push(Object.freeze({ id: entryId, kind: "card", printingId: boundedString(entry.printingId, "", 192), quantity, unitPrice, tags }));
    }
  }
  return Object.freeze({
    schema: 1,
    merchantId,
    revision: boundedInteger(record.revision, 0, Number.MAX_SAFE_INTEGER),
    restockDay: boundedInteger(record.restockDay, 0, Number.MAX_SAFE_INTEGER),
    restockSeed: boundedString(record.restockSeed, "cardforge", 192),
    gold: normalizedGold(record.gold),
    entries: Object.freeze(entries),
    recentEventIds: normalizedEventIds(record.recentEventIds),
  });
}

function normalizeTrade(value: unknown, id: string, players: Readonly<Record<string, TcgPlayerState>>, catalog: TcgCatalog): TcgTradeEscrow | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<TcgTradeEscrow>;
  const initiatorId = boundedString(record.initiatorId, "", 160);
  const recipientId = boundedString(record.recipientId, "", 160);
  if (!initiatorId || !recipientId || initiatorId === recipientId || !players[initiatorId] || !players[recipientId]) return null;
  const initiatorAssets = Object.freeze((Array.isArray(record.initiatorAssets) ? record.initiatorAssets : [])
    .map((asset) => normalizeTradeAsset(asset, catalog)).filter((asset): asset is TcgTradeAsset => Boolean(asset)).slice(0, 64));
  const recipientAssets = Object.freeze((Array.isArray(record.recipientAssets) ? record.recipientAssets : [])
    .map((asset) => normalizeTradeAsset(asset, catalog)).filter((asset): asset is TcgTradeAsset => Boolean(asset)).slice(0, 64));
  const status = ["open", "committed", "cancelled", "expired"].includes(record.status as string)
    ? record.status as TcgTradeEscrow["status"] : "cancelled";
  return Object.freeze({
    schema: 1,
    id,
    revision: boundedInteger(record.revision, 0, Number.MAX_SAFE_INTEGER),
    initiatorId,
    recipientId,
    initiatorAssets,
    recipientAssets,
    initiatorGold: normalizedGold(record.initiatorGold),
    recipientGold: normalizedGold(record.recipientGold),
    initiatorAccepted: record.initiatorAccepted === true,
    recipientAccepted: record.recipientAccepted === true,
    expiresAt: boundedInteger(record.expiresAt, 0, Number.MAX_SAFE_INTEGER),
    status,
  });
}

function normalizeMatchCard(value: unknown, catalog: TcgCatalog): TcgMatchCard | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<TcgMatchCard>;
  const instanceId = boundedString(record.instanceId, "", 192);
  const printingId = boundedString(record.printingId, "", 192);
  const printing = catalog.printings[printingId];
  if (!instanceId || !printing || record.definitionId !== printing.cardDefinitionId) return null;
  return Object.freeze({
    instanceId,
    printingId,
    definitionId: printing.cardDefinitionId,
    generated: record.generated === true,
    damage: boundedInteger(record.damage, 0, 1_000_000),
    exhausted: record.exhausted === true,
    enteredTurn: boundedInteger(record.enteredTurn, 0, 100_000),
    temporaryPower: boundedInteger(record.temporaryPower, -1_000, 1_000),
    temporaryGuard: boundedInteger(record.temporaryGuard, -1_000, 1_000),
    ...(record.submergedUntilTurn === undefined ? {} : { submergedUntilTurn: boundedInteger(record.submergedUntilTurn, 0, 100_000) }),
  });
}

function normalizeMatchPlayer(value: unknown, catalog: TcgCatalog): TcgMatchPlayerState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<TcgMatchPlayerState>;
  const playerId = boundedString(record.playerId, "", 160);
  if (!playerId) return null;
  const zone = (raw: unknown, maximum: number) => Object.freeze((Array.isArray(raw) ? raw : [])
    .map((card) => normalizeMatchCard(card, catalog)).filter((card): card is TcgMatchCard => Boolean(card)).slice(0, maximum));
  const boardRaw = Array.isArray(record.board) ? record.board.slice(0, 3) : [];
  const board = Object.freeze(Array.from({ length: 3 }, (_, index) => boardRaw[index] === null ? null : normalizeMatchCard(boardRaw[index], catalog))) as TcgMatchPlayerState["board"];
  return Object.freeze({
    playerId,
    displayName: boundedString(record.displayName, "Cardforger", 48),
    npc: record.npc === true,
    resolve: boundedInteger(record.resolve, 0, 100),
    maxEnergy: boundedInteger(record.maxEnergy, 0, 10),
    energy: boundedInteger(record.energy, 0, 10),
    deck: zone(record.deck, 60),
    hand: zone(record.hand, 9),
    board,
    relics: zone(record.relics, 12),
    place: record.place ? normalizeMatchCard(record.place, catalog) : null,
    discard: zone(record.discard, 60),
    mulliganComplete: record.mulliganComplete === true,
    failedDraw: record.failedDraw === true,
  });
}

function normalizeMatchAction(value: unknown): TcgMatchAction | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.kind === "mulligan") {
    const handIndexes = Array.isArray(record.handIndexes)
      ? [...new Set(record.handIndexes.filter((entry): entry is number => Number.isInteger(entry) && entry >= 0 && entry <= 8))].slice(0, 9)
      : [];
    return Object.freeze({ kind: "mulligan", handIndexes: Object.freeze(handIndexes) });
  }
  if (record.kind === "play" && Number.isInteger(record.handIndex) && Number(record.handIndex) >= 0 && Number(record.handIndex) <= 8) {
    return Object.freeze({
      kind: "play",
      handIndex: Number(record.handIndex),
      ...(Number.isInteger(record.boardSlot) && Number(record.boardSlot) >= 0 && Number(record.boardSlot) <= 2 ? { boardSlot: Number(record.boardSlot) } : {}),
      ...(record.targetPlayerIndex === 0 || record.targetPlayerIndex === 1 ? { targetPlayerIndex: record.targetPlayerIndex } : {}),
      ...(Number.isInteger(record.targetBoardSlot) && Number(record.targetBoardSlot) >= 0 && Number(record.targetBoardSlot) <= 2 ? { targetBoardSlot: Number(record.targetBoardSlot) } : {}),
    });
  }
  if (record.kind === "attack" && Number.isInteger(record.boardSlot) && Number(record.boardSlot) >= 0 && Number(record.boardSlot) <= 2
    && (record.target === "resolve" || record.target === "being")) {
    return Object.freeze({
      kind: "attack",
      boardSlot: Number(record.boardSlot),
      target: record.target,
      ...(Number.isInteger(record.targetBoardSlot) && Number(record.targetBoardSlot) >= 0 && Number(record.targetBoardSlot) <= 2 ? { targetBoardSlot: Number(record.targetBoardSlot) } : {}),
    });
  }
  if (record.kind === "end-turn" || record.kind === "concede") return Object.freeze({ kind: record.kind });
  return null;
}

function normalizeMatch(value: unknown, id: string, players: Readonly<Record<string, TcgPlayerState>>, catalog: TcgCatalog): TcgMatchState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<TcgMatchState>;
  if (!Array.isArray(record.players) || record.players.length !== 2) return null;
  const left = normalizeMatchPlayer(record.players[0], catalog);
  const right = normalizeMatchPlayer(record.players[1], catalog);
  if (!left || !right || left.playerId === right.playerId) return null;
  if ((!left.npc && !players[left.playerId]) || (!right.npc && !players[right.playerId])) return null;
  const phase = ["mulligan", "playing", "complete", "cancelled"].includes(record.phase as string)
    ? record.phase as TcgMatchState["phase"] : "cancelled";
  const reason = record.reason === null || ["resolve", "deck-out", "concede", "timeout", "cancelled"].includes(record.reason as string)
    ? record.reason as TcgMatchState["reason"] : "cancelled";
  const winnerId = record.winnerId === left.playerId || record.winnerId === right.playerId ? record.winnerId : null;
  const log = Object.freeze((Array.isArray(record.log) ? record.log : []).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as TcgMatchState["log"][number];
    const text = boundedString(row.text, "", 240);
    return text ? [Object.freeze({
      revision: boundedInteger(row.revision, 0, Number.MAX_SAFE_INTEGER),
      turn: boundedInteger(row.turn, 0, 100_000),
      actorId: boundedString(row.actorId, "system", 160),
      text,
    })] : [];
  }).slice(-256));
  const commitments = ([0, 1] as const).map((index) => {
    const raw = Array.isArray(record.deckCommitments) ? record.deckCommitments[index] : null;
    return Object.freeze(Array.isArray(raw)
      ? raw.filter((printingId): printingId is string => typeof printingId === "string" && Boolean(catalog.printings[printingId])).slice(0, 60)
      : []);
  }) as unknown as readonly [readonly string[], readonly string[]];
  if ((phase === "mulligan" || phase === "playing")
    && commitments.some((printingIds) => !validateTcgDeck(printingIds, null, catalog).valid)) return null;
  const actionLog = Object.freeze((Array.isArray(record.actionLog) ? record.actionLog : []).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Partial<TcgMatchActionRecord>;
    const actionId = boundedString(row.actionId, "", 192);
    const actorId = boundedString(row.actorId, "", 160);
    const action = normalizeMatchAction(row.action);
    return actionId && actorId && action ? [Object.freeze({
      actionId,
      actorId,
      expectedRevision: boundedInteger(row.expectedRevision, 0, Number.MAX_SAFE_INTEGER),
      action,
      appliedAt: boundedInteger(row.appliedAt, 0, Number.MAX_SAFE_INTEGER),
    })] : [];
  }).slice(-2_048));
  const disconnectedRaw = Array.isArray(record.disconnectedAt) ? record.disconnectedAt : [];
  const disconnectedAt = Object.freeze(([0, 1] as const).map((index) => (
    disconnectedRaw[index] === null || disconnectedRaw[index] === undefined
      ? null
      : boundedInteger(disconnectedRaw[index], 0, Number.MAX_SAFE_INTEGER)
  ))) as readonly [number | null, number | null];
  return Object.freeze({
    schema: 1,
    id,
    revision: boundedInteger(record.revision, 0, Number.MAX_SAFE_INTEGER),
    seed: boundedString(record.seed, id, 192),
    catalogRevision: catalog.revision,
    format: record.format === "core" ? "core" : "open",
    phase,
    players: Object.freeze([left, right]) as TcgMatchState["players"],
    activePlayerIndex: record.activePlayerIndex === 1 ? 1 : 0,
    firstPlayerIndex: record.firstPlayerIndex === 1 ? 1 : 0,
    turn: boundedInteger(record.turn, 0, 100_000),
    winnerId,
    reason,
    createdAt: boundedInteger(record.createdAt, 0, Number.MAX_SAFE_INTEGER),
    updatedAt: boundedInteger(record.updatedAt, 0, Number.MAX_SAFE_INTEGER),
    turnDeadlineAt: record.turnDeadlineAt === null || record.turnDeadlineAt === undefined
      ? null
      : boundedInteger(record.turnDeadlineAt, 0, Number.MAX_SAFE_INTEGER),
    disconnectedAt,
    deckCommitments: commitments,
    log,
    actionLog,
    processedActionIds: normalizedEventIds(record.processedActionIds, 1_024),
  });
}

function normalizeChallenge(value: unknown, id: string, players: Readonly<Record<string, TcgPlayerState>>, matches: Readonly<Record<string, TcgMatchState>>): TcgChallenge | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<TcgChallenge>;
  const challengerId = boundedString(record.challengerId, "", 160);
  const recipientId = boundedString(record.recipientId, "", 160);
  if (!challengerId || !recipientId || challengerId === recipientId || !players[challengerId] || !players[recipientId]) return null;
  const matchId = typeof record.matchId === "string" && matches[record.matchId] ? record.matchId : null;
  let status = ["pending", "accepted", "declined", "expired"].includes(record.status as string)
    ? record.status as TcgChallenge["status"] : "expired";
  if (status === "accepted" && !matchId) status = "expired";
  return Object.freeze({
    id,
    revision: boundedInteger(record.revision, 0, Number.MAX_SAFE_INTEGER),
    challengerId,
    recipientId,
    createdAt: boundedInteger(record.createdAt, 0, Number.MAX_SAFE_INTEGER),
    expiresAt: boundedInteger(record.expiresAt, 0, Number.MAX_SAFE_INTEGER),
    status,
    matchId,
  });
}

export function normalizeTcgPlayerState(value: unknown, ownerId: string, catalog = TCG_CATALOG): TcgPlayerState {
  const record = value && typeof value === "object" ? value as Partial<TcgPlayerState> : {};
  const holdings: Record<string, TcgHolding> = {};
  for (const [printingId, raw] of Object.entries(record.holdings ?? {}).slice(0, HOLDING_LIMIT)) {
    if (!catalog.printings[printingId]) continue;
    const holding = normalizeHolding(raw);
    if (holding.physical + holding.archived > 0) holdings[printingId] = holding;
  }
  const dex: Record<string, TcgDexEntry> = {};
  for (const [definitionId, raw] of Object.entries(record.dex ?? {}).slice(0, DEX_LIMIT)) {
    if (catalog.definitions[definitionId]) dex[definitionId] = normalizeDexEntry(raw, definitionId);
  }
  const decks = Array.isArray(record.decks)
    ? record.decks.map((entry) => normalizeDeck(entry, catalog)).filter((entry): entry is TcgDeck => Boolean(entry)).slice(0, TCG_MAX_DECKS)
    : [];
  const activeDeckId = decks.some((deck) => deck.id === record.activeDeckId) ? record.activeDeckId as string : null;
  const tutorial = record.tutorial && typeof record.tutorial === "object" ? record.tutorial : null;
  const rewardClaims = Array.isArray(record.rewardClaims)
    ? [...new Set(record.rewardClaims.filter((entry): entry is string => typeof entry === "string" && entry.length <= 192))].slice(-REWARD_CLAIM_LIMIT)
    : [];
  const events = Array.isArray(record.recentEventIds)
    ? [...new Set(record.recentEventIds.filter((entry): entry is string => typeof entry === "string" && entry.length <= 192))].slice(-EVENT_HISTORY_LIMIT)
    : [];
  const npcProgress = Object.fromEntries(Object.entries(record.npcProgress ?? {}).slice(0, 128).flatMap(([opponentId, raw]) => {
    if (!raw || typeof raw !== "object") return [];
    const entry = raw as TcgPlayerState["npcProgress"][string];
    const safeId = boundedString(opponentId, "", 96);
    if (!safeId) return [];
    return [[safeId, Object.freeze({
      opponentId: safeId,
      wins: boundedInteger(entry.wins, 0, 1_000_000),
      losses: boundedInteger(entry.losses, 0, 1_000_000),
      firstWinClaimed: entry.firstWinClaimed === true,
      lastRewardDay: boundedInteger(entry.lastRewardDay, 0, Number.MAX_SAFE_INTEGER),
    })]];
  }));
  return Object.freeze({
    schema: 1,
    revision: boundedInteger(record.revision, 0, Number.MAX_SAFE_INTEGER),
    ownerId: boundedString(ownerId, "player"),
    holdings: Object.freeze(holdings),
    archiveTier: record.archiveTier === 2 || record.archiveTier === 3 ? record.archiveTier : 1,
    dex: Object.freeze(dex),
    decks: Object.freeze(decks),
    activeDeckId,
    tutorial: Object.freeze({
      loanerAvailable: tutorial?.loanerAvailable !== false,
      tutorialCompleted: tutorial?.tutorialCompleted === true,
      starterClaimed: tutorial?.starterClaimed === true,
    }),
    npcProgress: Object.freeze(npcProgress),
    rewardClaims: Object.freeze(rewardClaims),
    recentEventIds: Object.freeze(events),
  });
}

export function normalizeTcgWorldState(value: unknown, authorityId: string, catalog = TCG_CATALOG): TcgWorldState {
  const record = value && typeof value === "object" ? value as Partial<TcgWorldState> : {};
  const recoveryIssues: string[] = [];
  const players: Record<string, TcgPlayerState> = {};
  for (const [ownerId, raw] of Object.entries(record.players ?? {}).slice(0, 64)) {
    const safeOwner = boundedString(ownerId, "", 160);
    if (!safeOwner) continue;
    const rawPlayer = raw && typeof raw === "object" ? raw as Partial<TcgPlayerState> : {};
    for (const [printingId, holding] of Object.entries(rawPlayer.holdings ?? {}).slice(0, HOLDING_LIMIT)) {
      if (!catalog.printings[printingId]) recoveryIssues.push(`player:${safeOwner}:holding:${printingId}:unknown`);
      else if (!holding || typeof holding !== "object"
        || Number((holding as Partial<TcgHolding>).physical) < 0
        || Number((holding as Partial<TcgHolding>).archived) < 0) recoveryIssues.push(`player:${safeOwner}:holding:${printingId}:invalid-count`);
    }
    players[safeOwner] = normalizeTcgPlayerState(raw, safeOwner, catalog);
    if (totalTcgArchived(players[safeOwner]) > TCG_ARCHIVE_CAPACITY[players[safeOwner].archiveTier]) {
      recoveryIssues.push(`player:${safeOwner}:archive-over-capacity`);
    }
  }
  const packBatches = Object.fromEntries(Object.entries(record.packBatches ?? {}).slice(0, 8_192).flatMap(([id, raw]) => {
    if (!raw || typeof raw !== "object") { recoveryIssues.push(`pack:${id}:invalid`); return []; }
    const batch = raw as TcgWorldState["packBatches"][string];
    if (!catalog.packs[batch.productId] || !players[batch.ownerId]) { recoveryIssues.push(`pack:${id}:unknown-reference`); return []; }
    const quantity = boundedInteger(batch.quantity, 0, 1_000_000);
    const nextIndex = boundedInteger(batch.nextIndex, 0, quantity);
    if (quantity <= nextIndex) return [];
    return [[id, Object.freeze({
      schema: 1 as const,
      id,
      ownerId: boundedString(batch.ownerId),
      productId: batch.productId,
      source: boundedString(batch.source, "unknown", 120),
      quantity,
      nextIndex,
      createdRevision: boundedInteger(batch.createdRevision, 0, Number.MAX_SAFE_INTEGER),
    })]];
  }));
  const looseCardBatches: Record<string, TcgLooseCardBatch> = {};
  const looseAllocations = new Map<string, number>();
  for (const [id, raw] of Object.entries(record.looseCardBatches ?? {}).slice(0, 8_192)) {
    if (!raw || typeof raw !== "object") { recoveryIssues.push(`loose-card:${id}:invalid`); continue; }
    const batch = raw as Partial<TcgLooseCardBatch>;
    const safeId = boundedString(id, "", 192);
    const ownerId = boundedString(batch.ownerId, "", 160);
    const printingId = boundedString(batch.printingId, "", 192);
    const count = boundedInteger(batch.count, 0, 4_096);
    if (!safeId || !players[ownerId] || !catalog.printings[printingId] || count <= 0) {
      recoveryIssues.push(`loose-card:${id}:unknown-reference`);
      continue;
    }
    let status: TcgLooseCardBatch["status"] = ["active", "deposited", "quarantined"].includes(batch.status as string)
      ? batch.status as TcgLooseCardBatch["status"] : "quarantined";
    const key = `${ownerId}\u0000${printingId}`;
    if (status === "active") {
      const allocated = (looseAllocations.get(key) ?? 0) + count;
      if (allocated > (players[ownerId].holdings[printingId]?.physical ?? 0)) {
        status = "quarantined";
        recoveryIssues.push(`loose-card:${id}:overdrawn`);
      } else looseAllocations.set(key, allocated);
    }
    looseCardBatches[safeId] = Object.freeze({
      schema: 1,
      id: safeId,
      ownerId,
      printingId,
      count,
      createdAt: boundedInteger(batch.createdAt, 0, Number.MAX_SAFE_INTEGER),
      status,
    });
  }
  const merchantStock = Object.fromEntries(Object.entries(record.merchantStock ?? {}).slice(0, 2_048).flatMap(([id, raw]) => {
    const safeId = boundedString(id, "", 160);
    const merchant = safeId ? normalizeMerchantStock(raw, safeId, catalog) : null;
    if (!merchant) recoveryIssues.push(`merchant:${id}:invalid`);
    return merchant ? [[safeId, merchant]] : [];
  }));
  const activeTrades: Record<string, TcgTradeEscrow> = {};
  const locked = new Map<string, number>();
  for (const [id, raw] of Object.entries(record.activeTrades ?? {}).slice(0, 1_024)) {
    const safeId = boundedString(id, "", 192);
    const trade = safeId ? normalizeTrade(raw, safeId, players, catalog) : null;
    if (!trade) { recoveryIssues.push(`trade:${id}:invalid`); continue; }
    let normalized = trade;
    if (trade.status === "open") {
      const additions = [...trade.initiatorAssets.map((asset) => [trade.initiatorId, asset] as const), ...trade.recipientAssets.map((asset) => [trade.recipientId, asset] as const)];
      const overdrawn = additions.some(([ownerId, asset]) => {
        const key = `${ownerId}\u0000${asset.printingId}\u0000${asset.location}`;
        return (locked.get(key) ?? 0) + asset.count > availableTcgHolding(players[ownerId], asset.printingId, asset.location);
      });
      if (overdrawn) {
        normalized = Object.freeze({ ...trade, status: "cancelled" as const, revision: trade.revision + 1 });
        recoveryIssues.push(`trade:${id}:overdrawn-cancelled`);
      }
      else for (const [ownerId, asset] of additions) {
        const key = `${ownerId}\u0000${asset.printingId}\u0000${asset.location}`;
        locked.set(key, (locked.get(key) ?? 0) + asset.count);
      }
    }
    activeTrades[safeId] = normalized;
  }
  const activeMatches = Object.fromEntries(Object.entries(record.activeMatches ?? {}).slice(0, 128).flatMap(([id, raw]) => {
    const safeId = boundedString(id, "", 192);
    const match = safeId ? normalizeMatch(raw, safeId, players, catalog) : null;
    if (!match) recoveryIssues.push(`match:${id}:invalid`);
    return match ? [[safeId, match]] : [];
  }));
  const challenges = Object.fromEntries(Object.entries(record.challenges ?? {}).slice(0, 256).flatMap(([id, raw]) => {
    const safeId = boundedString(id, "", 192);
    const challenge = safeId ? normalizeChallenge(raw, safeId, players, activeMatches) : null;
    if (!challenge) recoveryIssues.push(`challenge:${id}:invalid`);
    return challenge ? [[safeId, challenge]] : [];
  }));
  return Object.freeze({
    ...createTcgWorldState(authorityId),
    revision: boundedInteger(record.revision, 0, Number.MAX_SAFE_INTEGER),
    authorityId: boundedString(authorityId, "world:cardforge", 512),
    catalogRevision: catalog.revision,
    players: Object.freeze(players),
    packBatches: Object.freeze(packBatches),
    looseCardBatches: Object.freeze(looseCardBatches),
    merchantStock: Object.freeze(merchantStock),
    activeTrades: Object.freeze(activeTrades),
    activeMatches: Object.freeze(activeMatches),
    challenges: Object.freeze(challenges),
    worldGrantClaims: Object.freeze(Array.isArray(record.worldGrantClaims)
      ? [...new Set(record.worldGrantClaims.filter((entry): entry is string => typeof entry === "string" && entry.length <= 192))].slice(-REWARD_CLAIM_LIMIT)
      : []),
    recentEventIds: Object.freeze(Array.isArray(record.recentEventIds)
      ? [...new Set(record.recentEventIds.filter((entry): entry is string => typeof entry === "string" && entry.length <= 192))].slice(-EVENT_HISTORY_LIMIT)
      : []),
    recoveryIssues: Object.freeze([
      ...normalizedEventIds(record.recoveryIssues, 512),
      ...recoveryIssues,
    ].slice(-512)),
  });
}

export function ensureTcgPlayer(world: TcgWorldState, ownerId: string) {
  const existing = world.players[ownerId];
  if (existing) return Object.freeze({ state: world, player: existing, created: false });
  const player = createTcgPlayerState(ownerId);
  return Object.freeze({
    state: Object.freeze({
      ...world,
      revision: world.revision + 1,
      players: Object.freeze({ ...world.players, [ownerId]: player }),
    }),
    player,
    created: true,
  });
}

function replacePlayer(world: TcgWorldState, player: TcgPlayerState, eventId?: string): TcgWorldState {
  return Object.freeze({
    ...world,
    revision: world.revision + 1,
    players: Object.freeze({ ...world.players, [player.ownerId]: player }),
    ...(eventId ? { recentEventIds: recent(world.recentEventIds, eventId) } : {}),
  });
}

export function totalTcgHolding(player: TcgPlayerState, printingId: string) {
  const holding = player.holdings[printingId];
  return (holding?.physical ?? 0) + (holding?.archived ?? 0);
}

export function totalTcgArchived(player: TcgPlayerState) {
  return Object.values(player.holdings).reduce((sum, holding) => Math.min(TCG_MAX_COUNT, sum + holding.archived), 0);
}

export function availableTcgArchiveCapacity(player: TcgPlayerState) {
  return Math.max(0, TCG_ARCHIVE_CAPACITY[player.archiveTier] - totalTcgArchived(player));
}

export function availableTcgHolding(player: TcgPlayerState, printingId: string, location?: TcgLocation) {
  const holding = player.holdings[printingId];
  return location ? holding?.[location] ?? 0 : totalTcgHolding(player, printingId);
}

export function grantTcgPrintings(
  worldInput: TcgWorldState,
  ownerId: string,
  printingIds: readonly string[],
  eventId: string,
  input: Readonly<{ location?: TcgLocation; acquiredAt?: number; claimId?: string }> = {},
  catalog = TCG_CATALOG,
) {
  const ensured = ensureTcgPlayer(worldInput, ownerId);
  const world = ensured.state;
  const player = ensured.player;
  const safeEvent = boundedString(eventId, "", 192);
  if (!safeEvent) return Object.freeze({ applied: false, reason: "invalid-event", state: world, player, granted: Object.freeze([] as string[]) });
  if (world.recentEventIds.includes(safeEvent) || player.recentEventIds.includes(safeEvent)) {
    return Object.freeze({ applied: false, reason: "duplicate", state: world, player, granted: Object.freeze([] as string[]) });
  }
  const claimId = boundedString(input.claimId, "", 192);
  if (claimId && (world.worldGrantClaims.includes(claimId) || player.rewardClaims.includes(claimId))) {
    return Object.freeze({ applied: false, reason: "claimed", state: world, player, granted: Object.freeze([] as string[]) });
  }
  const valid = printingIds.filter((id) => Boolean(catalog.printings[id])).slice(0, 4_096);
  if (valid.length === 0) return Object.freeze({ applied: false, reason: "no-valid-printings", state: world, player, granted: Object.freeze([] as string[]) });
  const counts = new Map<string, number>();
  for (const id of valid) counts.set(id, (counts.get(id) ?? 0) + 1);
  const holdings: Record<string, TcgHolding> = { ...player.holdings };
  const dex: Record<string, TcgDexEntry> = { ...player.dex };
  const location = input.location ?? "physical";
  if (location === "archived" && valid.length > availableTcgArchiveCapacity(player)) {
    return Object.freeze({ applied: false, reason: "archive-full", state: world, player, granted: Object.freeze([] as string[]) });
  }
  const acquiredAt = boundedInteger(input.acquiredAt ?? Date.now(), 0, Number.MAX_SAFE_INTEGER);
  for (const [printingId, count] of counts) {
    const printing = catalog.printings[printingId];
    const current = holdings[printingId] ?? { physical: 0, archived: 0 };
    holdings[printingId] = Object.freeze({
      ...current,
      [location]: boundedInteger(current[location] + count),
    });
    const previous = dex[printing.cardDefinitionId];
    dex[printing.cardDefinitionId] = Object.freeze({
      definitionId: printing.cardDefinitionId,
      everOwned: true,
      firstAcquiredAt: previous?.firstAcquiredAt || acquiredAt,
      lastAcquiredAt: acquiredAt,
      acquiredCount: boundedInteger((previous?.acquiredCount ?? 0) + count),
      variantsSeen: Object.freeze([...new Set([...(previous?.variantsSeen ?? []), printing.variant])]),
      finishesSeen: Object.freeze([...new Set([...(previous?.finishesSeen ?? []), printing.finish])]),
    });
  }
  const nextPlayer: TcgPlayerState = Object.freeze({
    ...player,
    revision: player.revision + 1,
    holdings: Object.freeze(holdings),
    dex: Object.freeze(dex),
    rewardClaims: claimId ? recent(player.rewardClaims, claimId, REWARD_CLAIM_LIMIT) : player.rewardClaims,
    recentEventIds: recent(player.recentEventIds, safeEvent),
  });
  const nextWorld = Object.freeze({
    ...replacePlayer(world, nextPlayer, safeEvent),
    worldGrantClaims: claimId ? recent(world.worldGrantClaims, claimId, REWARD_CLAIM_LIMIT) : world.worldGrantClaims,
  });
  return Object.freeze({ applied: true, reason: "ok", state: nextWorld, player: nextPlayer, granted: Object.freeze(valid) });
}

export function moveTcgCards(
  worldInput: TcgWorldState,
  ownerId: string,
  printingId: string,
  count: number,
  from: TcgLocation,
  to: TcgLocation,
  eventId: string,
) {
  const ensured = ensureTcgPlayer(worldInput, ownerId);
  const world = ensured.state;
  const player = ensured.player;
  const quantity = boundedInteger(count, 0, 100_000);
  if (!TCG_CATALOG.printings[printingId] || quantity <= 0 || from === to) return Object.freeze({ applied: false, reason: "invalid", state: world, player });
  if (player.recentEventIds.includes(eventId)) return Object.freeze({ applied: false, reason: "duplicate", state: world, player });
  const current = player.holdings[printingId] ?? { physical: 0, archived: 0 };
  if (current[from] < quantity) return Object.freeze({ applied: false, reason: "insufficient-cards", state: world, player });
  if (to === "archived" && quantity > availableTcgArchiveCapacity(player)) return Object.freeze({ applied: false, reason: "archive-full", state: world, player });
  const holding = Object.freeze({
    ...current,
    [from]: current[from] - quantity,
    [to]: boundedInteger(current[to] + quantity),
  });
  const nextPlayer = Object.freeze({
    ...player,
    revision: player.revision + 1,
    holdings: Object.freeze({ ...player.holdings, [printingId]: holding }),
    recentEventIds: recent(player.recentEventIds, eventId),
  });
  return Object.freeze({ applied: true, reason: "ok", state: replacePlayer(world, nextPlayer, eventId), player: nextPlayer });
}

export function archiveTcgDuplicates(worldInput: TcgWorldState, ownerId: string, eventId: string) {
  const ensured = ensureTcgPlayer(worldInput, ownerId);
  const world = ensured.state;
  const player = ensured.player;
  if (player.recentEventIds.includes(eventId)) return Object.freeze({ applied: false, reason: "duplicate", state: world, player, moved: 0 });
  const activeDeck = player.decks.find((deck) => deck.id === player.activeDeckId) ?? null;
  const deckNeeds = new Map<string, number>();
  for (const printingId of activeDeck?.printingIds ?? []) deckNeeds.set(printingId, (deckNeeds.get(printingId) ?? 0) + 1);
  const transfers: Array<readonly [string, number]> = [];
  for (const [printingId, holding] of Object.entries(player.holdings)) {
    const neededOutsideArchive = Math.max(0, (deckNeeds.get(printingId) ?? 0) - holding.archived);
    const candidate = Math.max(0, holding.physical - neededOutsideArchive);
    const unlocked = availableUnlockedTcgHolding(world, ownerId, printingId, "physical");
    const quantity = Math.min(candidate, unlocked);
    if (quantity > 0) transfers.push(Object.freeze([printingId, quantity]));
  }
  const moved = transfers.reduce((sum, [, quantity]) => sum + quantity, 0);
  if (moved === 0) return Object.freeze({ applied: false, reason: "nothing-to-archive", state: world, player, moved: 0 });
  if (moved > availableTcgArchiveCapacity(player)) return Object.freeze({ applied: false, reason: "archive-full", state: world, player, moved: 0 });
  const holdings: Record<string, TcgHolding> = { ...player.holdings };
  for (const [printingId, quantity] of transfers) {
    const holding = holdings[printingId];
    holdings[printingId] = Object.freeze({
      physical: holding.physical - quantity,
      archived: boundedInteger(holding.archived + quantity),
    });
  }
  const nextPlayer = Object.freeze({
    ...player,
    revision: player.revision + 1,
    holdings: Object.freeze(holdings),
    recentEventIds: recent(player.recentEventIds, eventId),
  });
  return Object.freeze({ applied: true, reason: "ok", state: replacePlayer(world, nextPlayer, eventId), player: nextPlayer, moved });
}

export function upgradeTcgArchive(worldInput: TcgWorldState, ownerId: string, eventId: string) {
  const ensured = ensureTcgPlayer(worldInput, ownerId);
  const world = ensured.state;
  const player = ensured.player;
  if (player.recentEventIds.includes(eventId)) return Object.freeze({ applied: false, reason: "duplicate", state: world, player, price: 0 });
  if (player.archiveTier >= 3) return Object.freeze({ applied: false, reason: "max-tier", state: world, player, price: 0 });
  const price = TCG_ARCHIVE_UPGRADE_PRICE[player.archiveTier === 1 ? 1 : 2];
  const nextPlayer = Object.freeze({
    ...player,
    revision: player.revision + 1,
    archiveTier: (player.archiveTier + 1) as 2 | 3,
    recentEventIds: recent(player.recentEventIds, eventId),
  });
  return Object.freeze({ applied: true, reason: "ok", state: replacePlayer(world, nextPlayer, eventId), player: nextPlayer, price });
}

export function validateTcgDeck(printingIds: readonly string[], player?: TcgPlayerState | null, catalog = TCG_CATALOG): TcgDeckValidation {
  const errors: string[] = [];
  if (printingIds.length !== TCG_DECK_SIZE) errors.push(`A constructed deck needs exactly ${TCG_DECK_SIZE} cards.`);
  const definitionCounts: Record<string, number> = {};
  const printingCounts: Record<string, number> = {};
  let beings = 0;
  let places = 0;
  for (const printingId of printingIds) {
    const definition = tcgDefinitionForPrinting(printingId, catalog);
    if (!definition) { errors.push(`Unknown printing: ${printingId}`); continue; }
    definitionCounts[definition.id] = (definitionCounts[definition.id] ?? 0) + 1;
    printingCounts[printingId] = (printingCounts[printingId] ?? 0) + 1;
    if (definition.class === "creature" || definition.class === "character") beings += 1;
    if (definition.class === "place") places += 1;
  }
  for (const [definitionId, count] of Object.entries(definitionCounts)) {
    const definition = catalog.definitions[definitionId];
    const maximum = definition?.rarity === "legendary" || definition?.keywords.includes("prime") ? 1 : 3;
    if (count > maximum) errors.push(`${definition?.name ?? definitionId} exceeds its ${maximum}-copy limit.`);
  }
  if (beings < 12) errors.push("A constructed deck needs at least 12 Being cards.");
  if (places > 4) errors.push("A constructed deck may contain at most 4 Place cards.");
  if (player) for (const [printingId, count] of Object.entries(printingCounts)) {
    if (totalTcgHolding(player, printingId) < count) errors.push(`Not enough owned copies of ${catalog.definitions[catalog.printings[printingId].cardDefinitionId]?.name ?? printingId}.`);
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), definitionCounts: Object.freeze(definitionCounts) });
}

export function saveTcgDeck(
  worldInput: TcgWorldState,
  ownerId: string,
  input: Readonly<{ id?: string; name: string; printingIds: readonly string[]; format?: "open" | "core" }>,
  eventId: string,
  now = Date.now(),
) {
  const ensured = ensureTcgPlayer(worldInput, ownerId);
  const world = ensured.state;
  const player = ensured.player;
  if (player.recentEventIds.includes(eventId)) return Object.freeze({ applied: false, reason: "duplicate", state: world, player, deck: null, validation: validateTcgDeck(input.printingIds, player) });
  const validation = validateTcgDeck(input.printingIds, player);
  if (!validation.valid) return Object.freeze({ applied: false, reason: "invalid-deck", state: world, player, deck: null, validation });
  const existing = input.id ? player.decks.find((deck) => deck.id === input.id) : null;
  if (!existing && player.decks.length >= TCG_MAX_DECKS) return Object.freeze({ applied: false, reason: "deck-limit", state: world, player, deck: null, validation });
  const id = existing?.id ?? tcgStableId("deck", ownerId, input.name, now, player.revision);
  const deck: TcgDeck = Object.freeze({
    id,
    name: boundedString(input.name, "Cardforge Deck", 48),
    format: input.format === "core" ? "core" : "open",
    printingIds: Object.freeze([...input.printingIds]),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  const decks = existing ? player.decks.map((entry) => entry.id === deck.id ? deck : entry) : [...player.decks, deck];
  const nextPlayer = Object.freeze({
    ...player,
    revision: player.revision + 1,
    decks: Object.freeze(decks),
    activeDeckId: player.activeDeckId ?? deck.id,
    recentEventIds: recent(player.recentEventIds, eventId),
  });
  return Object.freeze({ applied: true, reason: "ok", state: replacePlayer(world, nextPlayer, eventId), player: nextPlayer, deck, validation });
}

export function setActiveTcgDeck(worldInput: TcgWorldState, ownerId: string, deckId: string, eventId: string) {
  const ensured = ensureTcgPlayer(worldInput, ownerId);
  const world = ensured.state;
  const player = ensured.player;
  const deck = player.decks.find((entry) => entry.id === deckId);
  if (!deck || !validateTcgDeck(deck.printingIds, player).valid) return Object.freeze({ applied: false, reason: "invalid-deck", state: world, player });
  const nextPlayer = Object.freeze({
    ...player,
    revision: player.revision + 1,
    activeDeckId: deck.id,
    recentEventIds: recent(player.recentEventIds, eventId),
  });
  return Object.freeze({ applied: true, reason: "ok", state: replacePlayer(world, nextPlayer, eventId), player: nextPlayer });
}

export function claimTcgStarter(worldInput: TcgWorldState, ownerId: string, eventId: string, now = Date.now()) {
  const ensured = ensureTcgPlayer(worldInput, ownerId);
  if (ensured.player.tutorial.starterClaimed) return Object.freeze({ applied: false, reason: "claimed", state: ensured.state, player: ensured.player });
  if (!ensured.player.tutorial.tutorialCompleted) return Object.freeze({ applied: false, reason: "tutorial-incomplete", state: ensured.state, player: ensured.player });
  const recipe = starterDeckPrintingIds();
  const grant = grantTcgPrintings(ensured.state, ownerId, recipe, `${eventId}:cards`, {
    location: "archived",
    acquiredAt: now,
    claimId: `starter:${ownerId}`,
  });
  if (!grant.applied) return grant;
  const deckResult = saveTcgDeck(grant.state, ownerId, {
    name: "Wildroads Starter",
    printingIds: recipe,
    format: "core",
  }, `${eventId}:deck`, now);
  if (!deckResult.applied) return Object.freeze({ applied: false, reason: deckResult.reason, state: grant.state, player: grant.player });
  const player = deckResult.player;
  const nextPlayer = Object.freeze({
    ...player,
    revision: player.revision + 1,
    tutorial: Object.freeze({ loanerAvailable: false, tutorialCompleted: true, starterClaimed: true }),
  });
  return Object.freeze({ applied: true, reason: "ok", state: replacePlayer(deckResult.state, nextPlayer, `${eventId}:complete`), player: nextPlayer });
}

export function capturePrintingForMob(mobKind: string, catalog = TCG_CATALOG) {
  const definitionId = `card:mob:${mobKind}`;
  return (catalog.printingsByDefinition[definitionId] ?? [])
    .map((id) => catalog.printings[id])
    .find((printing) => printing.variant === "capture") ?? defaultPrintingForDefinition(definitionId, catalog);
}

export function signaturePrintingForMob(mobKind: string, catalog = TCG_CATALOG) {
  const definitionId = `card:mob:${mobKind}`;
  return (catalog.printingsByDefinition[definitionId] ?? [])
    .map((id) => catalog.printings[id])
    .find((printing) => printing.variant === "boss-signature") ?? null;
}

function lockedTradeCount(world: TcgWorldState, playerId: string, printingId: string, location: TcgLocation) {
  return Object.values(world.activeTrades).filter((trade) => trade.status === "open").reduce((total, trade) => {
    const assets = trade.initiatorId === playerId ? trade.initiatorAssets : trade.recipientId === playerId ? trade.recipientAssets : [];
    return total + assets.filter((asset) => asset.printingId === printingId && asset.location === location).reduce((sum, asset) => sum + asset.count, 0);
  }, 0);
}

function lockedMatchCount(world: TcgWorldState, playerId: string, printingId: string) {
  return Object.values(world.activeMatches)
    .filter((match) => match.phase === "mulligan" || match.phase === "playing")
    .flatMap((match) => match.players.filter((player) => player.playerId === playerId))
    .reduce((total, player) => total + [...player.deck, ...player.hand, ...player.board.filter((card): card is TcgMatchCard => Boolean(card)), ...player.relics, ...(player.place ? [player.place] : []), ...player.discard]
      .filter((card) => !card.generated && card.printingId === printingId).length, 0);
}

function allocatedLooseCardCount(world: TcgWorldState, playerId: string, printingId: string) {
  return Object.values(world.looseCardBatches).filter((batch) => batch.status === "active"
    && batch.ownerId === playerId && batch.printingId === printingId).reduce((sum, batch) => sum + batch.count, 0);
}

export function availableUnlockedTcgHolding(world: TcgWorldState, playerId: string, printingId: string, location?: TcgLocation) {
  const player = world.players[playerId];
  if (!player) return 0;
  const custody = availableTcgHolding(player, printingId, location);
  const tradeLocks = location
    ? lockedTradeCount(world, playerId, printingId, location)
    : (["physical", "archived"] as const).reduce((sum, entry) => sum + lockedTradeCount(world, playerId, printingId, entry), 0);
  const looseLocks = location === "archived" ? 0 : allocatedLooseCardCount(world, playerId, printingId);
  return Math.max(0, custody - tradeLocks - lockedMatchCount(world, playerId, printingId) - looseLocks);
}

export function deckAvailableForTcgMatch(world: TcgWorldState, playerId: string, deck: TcgDeck) {
  const counts = new Map<string, number>();
  for (const printingId of deck.printingIds) counts.set(printingId, (counts.get(printingId) ?? 0) + 1);
  return [...counts].every(([printingId, count]) => availableUnlockedTcgHolding(world, playerId, printingId) >= count);
}

export function createTcgTrade(
  worldInput: TcgWorldState,
  initiatorId: string,
  recipientId: string,
  assets: readonly TcgTradeAsset[],
  eventId: string,
  now = Date.now(),
  requestedAssets: readonly TcgTradeAsset[] = [],
) {
  const left = ensureTcgPlayer(worldInput, initiatorId);
  const right = ensureTcgPlayer(left.state, recipientId);
  if (initiatorId === recipientId || right.state.recentEventIds.includes(eventId)) return Object.freeze({ applied: false, reason: "invalid", state: right.state, trade: null });
  for (const asset of assets) {
    const quantity = boundedInteger(asset.count, 1, 4_096);
    if (!TCG_CATALOG.printings[asset.printingId]
      || availableUnlockedTcgHolding(right.state, initiatorId, asset.printingId, asset.location) < quantity) {
      return Object.freeze({ applied: false, reason: "insufficient-cards", state: right.state, trade: null });
    }
  }
  for (const asset of requestedAssets) {
    const quantity = boundedInteger(asset.count, 1, 4_096);
    if (!TCG_CATALOG.printings[asset.printingId]
      || availableUnlockedTcgHolding(right.state, recipientId, asset.printingId, asset.location) < quantity) {
      return Object.freeze({ applied: false, reason: "recipient-insufficient-cards", state: right.state, trade: null });
    }
  }
  const id = tcgStableId("trade", initiatorId, recipientId, eventId);
  const trade: TcgTradeEscrow = Object.freeze({
    schema: 1,
    id,
    revision: 0,
    initiatorId,
    recipientId,
    initiatorAssets: Object.freeze(assets.map((asset) => Object.freeze({ ...asset, count: boundedInteger(asset.count, 1, 4_096) }))),
    recipientAssets: Object.freeze(requestedAssets.slice(0, 64).map((asset) => Object.freeze({ ...asset, count: boundedInteger(asset.count, 1, 4_096) }))),
    initiatorGold: "0",
    recipientGold: "0",
    initiatorAccepted: true,
    recipientAccepted: false,
    expiresAt: now + 120_000,
    status: "open",
  });
  const state = Object.freeze({
    ...right.state,
    revision: right.state.revision + 1,
    activeTrades: Object.freeze({ ...right.state.activeTrades, [id]: trade }),
    recentEventIds: recent(right.state.recentEventIds, eventId),
  });
  return Object.freeze({ applied: true, reason: "ok", state, trade });
}

function transferAssets(playerFrom: TcgPlayerState, playerTo: TcgPlayerState, assets: readonly TcgTradeAsset[]) {
  const fromHoldings: Record<string, TcgHolding> = { ...playerFrom.holdings };
  const toHoldings: Record<string, TcgHolding> = { ...playerTo.holdings };
  for (const asset of assets) {
    const from = fromHoldings[asset.printingId] ?? { physical: 0, archived: 0 };
    const to = toHoldings[asset.printingId] ?? { physical: 0, archived: 0 };
    fromHoldings[asset.printingId] = Object.freeze({ ...from, [asset.location]: from[asset.location] - asset.count });
    toHoldings[asset.printingId] = Object.freeze({ ...to, archived: boundedInteger(to.archived + asset.count) });
  }
  return Object.freeze({
    from: Object.freeze({ ...playerFrom, revision: playerFrom.revision + 1, holdings: Object.freeze(fromHoldings) }),
    to: Object.freeze({ ...playerTo, revision: playerTo.revision + 1, holdings: Object.freeze(toHoldings) }),
  });
}

export function acceptTcgTrade(world: TcgWorldState, tradeId: string, actorId: string, eventId: string, now = Date.now()) {
  const trade = world.activeTrades[tradeId];
  if (!trade || trade.status !== "open" || trade.recipientId !== actorId || trade.expiresAt < now) return Object.freeze({ applied: false, reason: "unavailable", state: world, trade: trade ?? null });
  const initiator = world.players[trade.initiatorId];
  const recipient = world.players[trade.recipientId];
  if (!initiator || !recipient) return Object.freeze({ applied: false, reason: "missing-player", state: world, trade });
  const recipientIncomingCount = trade.initiatorAssets.reduce((sum, asset) => sum + asset.count, 0);
  const initiatorIncomingCount = trade.recipientAssets.reduce((sum, asset) => sum + asset.count, 0);
  if (recipientIncomingCount > availableTcgArchiveCapacity(recipient)) return Object.freeze({ applied: false, reason: "recipient-archive-full", state: world, trade });
  if (initiatorIncomingCount > availableTcgArchiveCapacity(initiator)) return Object.freeze({ applied: false, reason: "initiator-archive-full", state: world, trade });
  for (const asset of trade.initiatorAssets) if (availableTcgHolding(initiator, asset.printingId, asset.location) < asset.count) {
    return Object.freeze({ applied: false, reason: "stale", state: world, trade });
  }
  for (const asset of trade.recipientAssets) if (availableTcgHolding(recipient, asset.printingId, asset.location) < asset.count) {
    return Object.freeze({ applied: false, reason: "stale", state: world, trade });
  }
  const movedLeft = transferAssets(initiator, recipient, trade.initiatorAssets);
  const movedRight = transferAssets(movedLeft.to, movedLeft.from, trade.recipientAssets);
  const committed = Object.freeze({ ...trade, revision: trade.revision + 1, recipientAccepted: true, status: "committed" as const });
  const state = Object.freeze({
    ...world,
    revision: world.revision + 1,
    players: Object.freeze({ ...world.players, [initiator.ownerId]: movedRight.to, [recipient.ownerId]: movedRight.from }),
    activeTrades: Object.freeze({ ...world.activeTrades, [tradeId]: committed }),
    recentEventIds: recent(world.recentEventIds, eventId),
  });
  return Object.freeze({ applied: true, reason: "ok", state, trade: committed });
}

export function cancelTcgTrade(world: TcgWorldState, tradeId: string, actorId: string, eventId: string) {
  const trade = world.activeTrades[tradeId];
  if (!trade || trade.status !== "open" || ![trade.initiatorId, trade.recipientId].includes(actorId)) return Object.freeze({ applied: false, reason: "unavailable", state: world, trade: trade ?? null });
  const cancelled = Object.freeze({ ...trade, revision: trade.revision + 1, status: "cancelled" as const });
  return Object.freeze({
    applied: true,
    reason: "ok",
    state: Object.freeze({
      ...world,
      revision: world.revision + 1,
      activeTrades: Object.freeze({ ...world.activeTrades, [tradeId]: cancelled }),
      recentEventIds: recent(world.recentEventIds, eventId),
    }),
    trade: cancelled,
  });
}

export function expireTcgTransactions(world: TcgWorldState, now = Date.now()) {
  let changed = false;
  const activeTrades = Object.fromEntries(Object.entries(world.activeTrades).map(([id, trade]) => {
    if (trade.status === "open" && trade.expiresAt <= now) {
      changed = true;
      return [id, Object.freeze({ ...trade, revision: trade.revision + 1, status: "expired" as const })];
    }
    return [id, trade];
  }));
  const challenges = Object.fromEntries(Object.entries(world.challenges).map(([id, challenge]) => {
    if (challenge.status === "pending" && challenge.expiresAt <= now) {
      changed = true;
      return [id, Object.freeze({ ...challenge, revision: challenge.revision + 1, status: "expired" as const })];
    }
    return [id, challenge];
  }));
  return changed ? Object.freeze({
    ...world,
    revision: world.revision + 1,
    activeTrades: Object.freeze(activeTrades),
    challenges: Object.freeze(challenges),
  }) : world;
}

export function deckForPlayer(player: TcgPlayerState) {
  return player.decks.find((deck) => deck.id === player.activeDeckId) ?? null;
}

export function physicalPrintingToken(printing: TcgPrinting, count: number, batchId: string) {
  return Object.freeze({
    schema: 1,
    printingId: printing.id,
    count: boundedInteger(count, 1, 4_096),
    custodyBatchId: boundedString(batchId, "", 160),
  });
}

export function allocateTcgLooseCards(
  worldInput: TcgWorldState,
  ownerId: string,
  printingId: string,
  countInput: number,
  eventId: string,
  now = Date.now(),
) {
  const ensured = ensureTcgPlayer(worldInput, ownerId);
  const count = boundedInteger(countInput, 0, 4_096);
  if (!TCG_CATALOG.printings[printingId] || count <= 0) return Object.freeze({ applied: false, reason: "invalid", state: ensured.state, batch: null });
  if (ensured.state.recentEventIds.includes(eventId)) return Object.freeze({ applied: false, reason: "duplicate", state: ensured.state, batch: null });
  if (availableUnlockedTcgHolding(ensured.state, ownerId, printingId, "physical") < count) {
    return Object.freeze({ applied: false, reason: "insufficient-unlocked-cards", state: ensured.state, batch: null });
  }
  const id = tcgStableId("loose", ensured.state.authorityId, ownerId, printingId, eventId);
  const batch: TcgLooseCardBatch = Object.freeze({
    schema: 1,
    id,
    ownerId,
    printingId,
    count,
    createdAt: boundedInteger(now, 0, Number.MAX_SAFE_INTEGER),
    status: "active",
  });
  return Object.freeze({
    applied: true,
    reason: "ok",
    state: Object.freeze({
      ...ensured.state,
      revision: ensured.state.revision + 1,
      looseCardBatches: Object.freeze({ ...ensured.state.looseCardBatches, [id]: batch }),
      recentEventIds: recent(ensured.state.recentEventIds, eventId),
    }),
    batch,
  });
}

export function depositTcgLooseCards(
  world: TcgWorldState,
  ownerId: string,
  batchId: string,
  eventId: string,
) {
  const batch = world.looseCardBatches[batchId];
  if (!batch || batch.ownerId !== ownerId || batch.status !== "active") return Object.freeze({ applied: false, reason: "unavailable", state: world, batch: batch ?? null });
  if (world.recentEventIds.includes(eventId)) return Object.freeze({ applied: false, reason: "duplicate", state: world, batch });
  const deposited = Object.freeze({ ...batch, status: "deposited" as const });
  return Object.freeze({
    applied: true,
    reason: "ok",
    state: Object.freeze({
      ...world,
      revision: world.revision + 1,
      looseCardBatches: Object.freeze({ ...world.looseCardBatches, [batch.id]: deposited }),
      recentEventIds: recent(world.recentEventIds, eventId),
    }),
    batch: deposited,
  });
}
