import { Account, AccountPortfolio, Market, PortfolioPosition } from "./types.js";
import { getOutcomePrice } from "./pricing.js";
import { round } from "./utils.js";

export function valuePosition(market: Market, yesShares: number, noShares: number): PortfolioPosition {
  const yesValue = round(yesShares * getOutcomePrice(market.pool, "YES"));
  const noValue = round(noShares * getOutcomePrice(market.pool, "NO"));

  return {
    marketId: market.id,
    yesShares,
    noShares,
    yesValue,
    noValue,
    totalValue: round(yesValue + noValue)
  };
}

export function getAccountPortfolio(account: Account, markets: Market[]): AccountPortfolio {
  const positions = Object.entries(account.positions)
    .map(([marketId, position]) => {
      const market = markets.find((item) => item.id === marketId);
      return market ? valuePosition(market, position.yesShares, position.noShares) : null;
    })
    .filter((position): position is PortfolioPosition => position !== null);

  const positionValue = round(positions.reduce((sum, position) => sum + position.totalValue, 0));

  return {
    accountId: account.id,
    collateral: account.collateral,
    positions,
    positionValue,
    totalValue: round(account.collateral + positionValue)
  };
}
