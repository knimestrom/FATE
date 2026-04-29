import { BinaryPool, Outcome, SellQuote, TradeQuote } from "./types.js";
import { assertPositiveAmount, clamp, round } from "./utils.js";

export function createBinaryPool(initialLiquidity: number, feeBps = 30): BinaryPool {
  assertPositiveAmount(initialLiquidity, "initialLiquidity");

  return {
    yesLiquidity: round(initialLiquidity),
    noLiquidity: round(initialLiquidity),
    collateral: round(initialLiquidity * 2),
    feeBps
  };
}

export function getOutcomePrice(pool: BinaryPool, outcome: Outcome) {
  const total = pool.yesLiquidity + pool.noLiquidity;

  if (total <= 0) {
    return 0.5;
  }

  const yesPrice = clamp(pool.noLiquidity / total, 0.01, 0.99);
  return round(outcome === "YES" ? yesPrice : 1 - yesPrice);
}

export function quoteBuy(marketId: string, pool: BinaryPool, outcome: Outcome, collateralIn: number): TradeQuote {
  assertPositiveAmount(collateralIn, "collateralIn");

  const fee = round(collateralIn * (pool.feeBps / 10_000));
  const netCollateral = round(collateralIn - fee);
  const k = pool.yesLiquidity * pool.noLiquidity;
  const priceBefore = getOutcomePrice(pool, outcome);
  let sharesOut: number;
  let nextPool: BinaryPool;

  if (outcome === "YES") {
    const newNoLiquidity = pool.noLiquidity + netCollateral;
    sharesOut = pool.yesLiquidity - k / newNoLiquidity;
    nextPool = {
      ...pool,
      yesLiquidity: round(pool.yesLiquidity - sharesOut),
      noLiquidity: round(newNoLiquidity),
      collateral: round(pool.collateral + netCollateral)
    };
  } else {
    const newYesLiquidity = pool.yesLiquidity + netCollateral;
    sharesOut = pool.noLiquidity - k / newYesLiquidity;
    nextPool = {
      ...pool,
      yesLiquidity: round(newYesLiquidity),
      noLiquidity: round(pool.noLiquidity - sharesOut),
      collateral: round(pool.collateral + netCollateral)
    };
  }

  const priceAfter = getOutcomePrice(nextPool, outcome);

  return {
    side: "buy",
    marketId,
    outcome,
    collateralIn: round(collateralIn),
    fee,
    netCollateral,
    sharesOut: round(sharesOut),
    averagePrice: round(netCollateral / sharesOut),
    priceBefore,
    priceAfter
  };
}

export function applyBuy(pool: BinaryPool, quote: TradeQuote): BinaryPool {
  if (quote.outcome === "YES") {
    return {
      ...pool,
      yesLiquidity: round(pool.yesLiquidity - quote.sharesOut),
      noLiquidity: round(pool.noLiquidity + quote.netCollateral),
      collateral: round(pool.collateral + quote.netCollateral)
    };
  }

  return {
    ...pool,
    yesLiquidity: round(pool.yesLiquidity + quote.netCollateral),
    noLiquidity: round(pool.noLiquidity - quote.sharesOut),
    collateral: round(pool.collateral + quote.netCollateral)
  };
}

export function quoteSell(marketId: string, pool: BinaryPool, outcome: Outcome, sharesIn: number): SellQuote {
  assertPositiveAmount(sharesIn, "sharesIn");

  const k = pool.yesLiquidity * pool.noLiquidity;
  const priceBefore = getOutcomePrice(pool, outcome);
  let grossCollateralOut: number;
  let nextPool: BinaryPool;

  if (outcome === "YES") {
    const newYesLiquidity = pool.yesLiquidity + sharesIn;
    const newNoLiquidity = k / newYesLiquidity;
    grossCollateralOut = pool.noLiquidity - newNoLiquidity;
    nextPool = {
      ...pool,
      yesLiquidity: round(newYesLiquidity),
      noLiquidity: round(newNoLiquidity),
      collateral: round(pool.collateral - grossCollateralOut)
    };
  } else {
    const newNoLiquidity = pool.noLiquidity + sharesIn;
    const newYesLiquidity = k / newNoLiquidity;
    grossCollateralOut = pool.yesLiquidity - newYesLiquidity;
    nextPool = {
      ...pool,
      yesLiquidity: round(newYesLiquidity),
      noLiquidity: round(newNoLiquidity),
      collateral: round(pool.collateral - grossCollateralOut)
    };
  }

  if (!Number.isFinite(grossCollateralOut) || grossCollateralOut <= 0) {
    throw new Error("Sell quote cannot produce positive collateral.");
  }

  const fee = round(grossCollateralOut * (pool.feeBps / 10_000));
  const collateralOut = round(grossCollateralOut - fee);
  const priceAfter = getOutcomePrice(nextPool, outcome);

  return {
    side: "sell",
    marketId,
    outcome,
    sharesIn: round(sharesIn),
    grossCollateralOut: round(grossCollateralOut),
    fee,
    collateralOut,
    averagePrice: round(collateralOut / sharesIn),
    priceBefore,
    priceAfter
  };
}

export function applySell(pool: BinaryPool, quote: SellQuote): BinaryPool {
  const k = pool.yesLiquidity * pool.noLiquidity;

  if (quote.outcome === "YES") {
    const yesLiquidity = round(pool.yesLiquidity + quote.sharesIn);
    return {
      ...pool,
      yesLiquidity,
      noLiquidity: round(k / yesLiquidity),
      collateral: round(pool.collateral - quote.grossCollateralOut)
    };
  }

  const noLiquidity = round(pool.noLiquidity + quote.sharesIn);
  return {
    ...pool,
    yesLiquidity: round(k / noLiquidity),
    noLiquidity,
    collateral: round(pool.collateral - quote.grossCollateralOut)
  };
}
