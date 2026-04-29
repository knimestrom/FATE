import { Market, MarketDraft } from "./types.js";
import { createBinaryPool, getOutcomePrice } from "./pricing.js";
import { nowIso, round } from "./utils.js";

export function openMarket(draft: MarketDraft, options?: { initialLiquidity?: number; feeBps?: number; openedAt?: string }): Market {
  const openedAt = options?.openedAt ?? nowIso();
  const openedAtTime = Date.parse(openedAt);
  const closeTime = Date.parse(draft.closeTime);

  if (!Number.isFinite(closeTime)) {
    throw new Error(`Market ${draft.id} has an invalid close time.`);
  }

  if (Number.isFinite(openedAtTime) && closeTime <= openedAtTime) {
    throw new Error(`Market ${draft.id} close time must be after open time.`);
  }

  const pool = createBinaryPool(options?.initialLiquidity ?? 1_000, options?.feeBps ?? 30);

  return {
    ...draft,
    status: "open",
    createdAt: openedAt,
    openedAt,
    pool,
    volume: 0,
    tradeCount: 0
  };
}

export function lockMarket(market: Market, lockedAt = nowIso()) {
  if (market.status !== "open") {
    throw new Error(`Market ${market.id} cannot be locked from status ${market.status}.`);
  }

  const lockedTime = Date.parse(lockedAt);
  const closeTime = Date.parse(market.closeTime);

  if (Number.isFinite(lockedTime) && Number.isFinite(closeTime) && lockedTime < closeTime) {
    throw new Error(`Market ${market.id} cannot be locked before close time.`);
  }

  market.status = "locked";
  return market;
}

export function snapshotMarket(market: Market) {
  return {
    id: market.id,
    slug: market.slug,
    question: market.question,
    category: market.category,
    status: market.status,
    closeTime: market.closeTime,
    yesPrice: round(getOutcomePrice(market.pool, "YES") * 100, 2),
    noPrice: round(getOutcomePrice(market.pool, "NO") * 100, 2),
    liquidity: round(market.pool.collateral),
    volume: round(market.volume),
    tradeCount: market.tradeCount,
    probability: round(market.intelligence.probability * 100, 2)
  };
}
