import { analyzeCandidate, draftMarket } from "./ai.js";
import { discoverEventCandidates } from "./events.js";
import { buyShares, createLedger, deposit, redeemResolvedMarket, sellShares } from "./ledger.js";
import { lockMarket, openMarket, snapshotMarket } from "./markets.js";
import { getAccountPortfolio } from "./portfolio.js";
import { resolveMarket } from "./settlement.js";
import {
  Account,
  EventCandidate,
  EventSignal,
  Market,
  Outcome,
  ProtocolState,
  ResolutionOutcome
} from "./types.js";

export function createFateMarketProtocol(seedAccounts: Account[] = []): ProtocolState {
  return {
    events: [],
    markets: [],
    ledger: createLedger(seedAccounts),
    resolutions: []
  };
}

export function ingestSignals(state: ProtocolState, signals: EventSignal[], discoveredAt?: string) {
  const candidates = discoverEventCandidates(signals, discoveredAt);
  const existingIds = new Set(state.events.map((event) => event.id));
  const incoming = candidates.filter((candidate) => !existingIds.has(candidate.id));
  state.events.push(...incoming);
  state.events.sort((left, right) => right.heat - left.heat);
  return incoming;
}

export function createMarketFromEvent(
  state: ProtocolState,
  candidate: EventCandidate,
  closeTime: string,
  options?: { initialLiquidity?: number; feeBps?: number; openedAt?: string }
) {
  const draft = draftMarket(candidate, closeTime, options?.openedAt);

  if (state.markets.some((market) => market.id === draft.id)) {
    throw new Error(`Market ${draft.id} already exists.`);
  }

  const market = openMarket(draft, options);
  state.markets.push(market);
  return market;
}

export function refreshMarketIntelligence(market: Market, candidate: EventCandidate, updatedAt?: string) {
  market.intelligence = analyzeCandidate(candidate, updatedAt);
  return market.intelligence;
}

export function fundAccount(state: ProtocolState, accountId: string, amount: number) {
  return deposit(state.ledger, accountId, amount);
}

export function trade(state: ProtocolState, marketId: string, accountId: string, outcome: Outcome, collateralIn: number) {
  const market = state.markets.find((item) => item.id === marketId);

  if (!market) {
    throw new Error(`Market ${marketId} not found.`);
  }

  return buyShares(state.ledger, market, accountId, outcome, collateralIn);
}

export function exitPosition(
  state: ProtocolState,
  marketId: string,
  accountId: string,
  outcome: Outcome,
  sharesIn: number
) {
  const market = state.markets.find((item) => item.id === marketId);

  if (!market) {
    throw new Error(`Market ${marketId} not found.`);
  }

  return sellShares(state.ledger, market, accountId, outcome, sharesIn);
}

export function lockExpiredMarkets(state: ProtocolState, currentTime = new Date().toISOString()) {
  const current = Date.parse(currentTime);
  const locked: Market[] = [];

  for (const market of state.markets) {
    const closeTime = Date.parse(market.closeTime);

    if (market.status === "open" && Number.isFinite(current) && Number.isFinite(closeTime) && current >= closeTime) {
      locked.push(lockMarket(market, currentTime));
    }
  }

  return locked;
}

export function settle(
  state: ProtocolState,
  marketId: string,
  outcome: ResolutionOutcome,
  resolver: string,
  evidence = state.markets.find((market) => market.id === marketId)?.evidence ?? []
) {
  const market = state.markets.find((item) => item.id === marketId);

  if (!market) {
    throw new Error(`Market ${marketId} not found.`);
  }

  const resolution = resolveMarket(market, outcome, resolver, evidence);
  state.resolutions.push(resolution);
  return resolution;
}

export function redeem(state: ProtocolState, marketId: string, accountId: string) {
  const market = state.markets.find((item) => item.id === marketId);

  if (!market) {
    throw new Error(`Market ${marketId} not found.`);
  }

  return redeemResolvedMarket(state.ledger, market, accountId);
}

export function listMarkets(state: ProtocolState) {
  return state.markets.map(snapshotMarket);
}

export function getPortfolio(state: ProtocolState, accountId: string) {
  const account = state.ledger.accounts.get(accountId);

  if (!account) {
    throw new Error(`Account ${accountId} does not exist.`);
  }

  return getAccountPortfolio(account, state.markets);
}
