import { Account, Ledger, Market, Outcome, SellTrade, Trade } from "./types.js";
import { applyBuy, applySell, quoteBuy, quoteSell } from "./pricing.js";
import { assertPositiveAmount, round, stableId } from "./utils.js";

export function createLedger(accounts: Account[] = []): Ledger {
  return {
    accounts: new Map(accounts.map((account) => [account.id, account])),
    trades: [],
    feesCollected: 0
  };
}

export function createAccount(id: string, collateral = 0): Account {
  return {
    id,
    collateral,
    positions: {}
  };
}

export function deposit(ledger: Ledger, accountId: string, amount: number) {
  assertPositiveAmount(amount);
  const account = ledger.accounts.get(accountId) ?? createAccount(accountId);
  account.collateral = round(account.collateral + amount);
  ledger.accounts.set(accountId, account);
  return account;
}

function assertTradable(market: Market, executedAt: string) {
  if (market.status !== "open") {
    throw new Error(`Market ${market.id} is not open for trading.`);
  }

  const tradeTime = Date.parse(executedAt);
  const closeTime = Date.parse(market.closeTime);

  if (Number.isFinite(tradeTime) && Number.isFinite(closeTime) && tradeTime >= closeTime) {
    throw new Error(`Market ${market.id} is closed for trading.`);
  }
}

export function buyShares(
  ledger: Ledger,
  market: Market,
  accountId: string,
  outcome: Outcome,
  collateralIn: number,
  executedAt = new Date().toISOString()
): Trade {
  assertTradable(market, executedAt);

  const account = ledger.accounts.get(accountId);
  if (!account) {
    throw new Error(`Account ${accountId} does not exist.`);
  }

  const quote = quoteBuy(market.id, market.pool, outcome, collateralIn);

  if (account.collateral < quote.collateralIn) {
    throw new Error(`Account ${accountId} has insufficient collateral.`);
  }

  account.collateral = round(account.collateral - quote.collateralIn);
  ledger.feesCollected = round(ledger.feesCollected + quote.fee);
  const position = account.positions[market.id] ?? { yesShares: 0, noShares: 0 };

  if (outcome === "YES") {
    position.yesShares = round(position.yesShares + quote.sharesOut);
  } else {
    position.noShares = round(position.noShares + quote.sharesOut);
  }

  account.positions[market.id] = position;
  market.pool = applyBuy(market.pool, quote);
  market.volume = round(market.volume + quote.collateralIn);
  market.tradeCount += 1;

  const trade: Trade = {
    ...quote,
    id: stableId("trd", `${accountId}:${market.id}:${outcome}:${collateralIn}:${executedAt}:${ledger.trades.length}`),
    accountId,
    executedAt
  };

  ledger.trades.push(trade);
  return trade;
}

export function sellShares(
  ledger: Ledger,
  market: Market,
  accountId: string,
  outcome: Outcome,
  sharesIn: number,
  executedAt = new Date().toISOString()
): SellTrade {
  assertTradable(market, executedAt);

  const account = ledger.accounts.get(accountId);
  if (!account) {
    throw new Error(`Account ${accountId} does not exist.`);
  }

  const position = account.positions[market.id] ?? { yesShares: 0, noShares: 0 };
  const availableShares = outcome === "YES" ? position.yesShares : position.noShares;

  if (availableShares < sharesIn) {
    throw new Error(`Account ${accountId} has insufficient ${outcome} shares.`);
  }

  const quote = quoteSell(market.id, market.pool, outcome, sharesIn);

  if (outcome === "YES") {
    position.yesShares = round(position.yesShares - quote.sharesIn);
  } else {
    position.noShares = round(position.noShares - quote.sharesIn);
  }

  if (position.yesShares === 0 && position.noShares === 0) {
    delete account.positions[market.id];
  } else {
    account.positions[market.id] = position;
  }

  account.collateral = round(account.collateral + quote.collateralOut);
  ledger.feesCollected = round(ledger.feesCollected + quote.fee);
  market.pool = applySell(market.pool, quote);
  market.volume = round(market.volume + quote.grossCollateralOut);
  market.tradeCount += 1;

  const trade: SellTrade = {
    ...quote,
    id: stableId("trd", `${accountId}:${market.id}:${outcome}:sell:${sharesIn}:${executedAt}:${ledger.trades.length}`),
    accountId,
    executedAt
  };

  ledger.trades.push(trade);
  return trade;
}

export function redeemResolvedMarket(ledger: Ledger, market: Market, accountId: string) {
  if (market.status !== "resolved" && market.status !== "voided") {
    throw new Error(`Market ${market.id} is not settled.`);
  }

  const account = ledger.accounts.get(accountId);
  if (!account) {
    throw new Error(`Account ${accountId} does not exist.`);
  }

  const position = account.positions[market.id] ?? { yesShares: 0, noShares: 0 };
  let payout = 0;

  if (market.resolution === "YES") {
    payout = position.yesShares;
  } else if (market.resolution === "NO") {
    payout = position.noShares;
  } else if (market.resolution === "VOID") {
    payout = position.yesShares + position.noShares;
  }

  account.collateral = round(account.collateral + payout);
  delete account.positions[market.id];

  return round(payout);
}
