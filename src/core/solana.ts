import { FateSolanaInstruction, Market, Outcome, ResolutionOutcome, SellQuote, TradeQuote } from "./types.js";

export function buildOpenMarketInstruction(market: Market, treasuryAccount: string): FateSolanaInstruction {
  return {
    program: "fate_market",
    action: "open_market",
    accounts: [market.id, treasuryAccount],
    data: {
      marketId: market.id,
      slug: market.slug,
      closeTime: market.closeTime,
      initialCollateral: market.pool.collateral,
      feeBps: market.pool.feeBps
    }
  };
}

export function buildBuySharesInstruction(
  market: Market,
  traderAccount: string,
  outcome: Outcome,
  quote: TradeQuote
): FateSolanaInstruction {
  return {
    program: "fate_market",
    action: "buy_shares",
    accounts: [market.id, traderAccount],
    data: {
      marketId: market.id,
      outcome,
      collateralIn: quote.collateralIn,
      netCollateral: quote.netCollateral,
      sharesOut: quote.sharesOut,
      priceAfter: quote.priceAfter
    }
  };
}

export function buildSellSharesInstruction(
  market: Market,
  traderAccount: string,
  outcome: Outcome,
  quote: SellQuote
): FateSolanaInstruction {
  return {
    program: "fate_market",
    action: "sell_shares",
    accounts: [market.id, traderAccount],
    data: {
      marketId: market.id,
      outcome,
      sharesIn: quote.sharesIn,
      collateralOut: quote.collateralOut,
      priceAfter: quote.priceAfter
    }
  };
}

export function buildResolveMarketInstruction(
  market: Market,
  resolverAccount: string,
  outcome: ResolutionOutcome
): FateSolanaInstruction {
  return {
    program: "fate_market",
    action: "resolve_market",
    accounts: [market.id, resolverAccount],
    data: {
      marketId: market.id,
      outcome,
      evidenceCount: market.evidence.length
    }
  };
}

export function buildRedeemInstruction(market: Market, traderAccount: string): FateSolanaInstruction {
  return {
    program: "fate_market",
    action: "redeem",
    accounts: [market.id, traderAccount],
    data: {
      marketId: market.id,
      resolution: market.resolution ?? "VOID"
    }
  };
}
