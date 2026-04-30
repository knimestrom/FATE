import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import {
  buildBuySharesInstruction,
  buildOpenMarketInstruction,
  buildSellSharesInstruction,
  createFateMarketProtocol,
  createMarketFromEvent,
  exitPosition,
  fateMarketBrand,
  fundAccount,
  getPortfolio,
  getOutcomePrice,
  ingestSignals,
  listMarkets,
  lockExpiredMarkets,
  redeem,
  seedSignals,
  settle,
  trade
} from "../src/index.js";

test("Fate Market brand assets are bundled with the protocol package", () => {
  assert.equal(fateMarketBrand.name, "Fate Market");
  assert.equal(fateMarketBrand.ticker, "$FATE");
  assert.equal(fateMarketBrand.socials.x, "https://x.com/Fate_Market");
  assert.equal(fateMarketBrand.assets.logo, "assets/brand/fate-market-logo.png");
  assert.ok(existsSync(fateMarketBrand.assets.logo));
  assert.ok(existsSync(fateMarketBrand.assets.favicon));
  assert.ok(existsSync(fateMarketBrand.assets.publicLogo));
  assert.ok(existsSync(fateMarketBrand.assets.publicFavicon));
});

test("Fate Market discovers events and opens a binary prediction market", () => {
  const state = createFateMarketProtocol();
  const discovered = ingestSignals(state, seedSignals, "2026-04-29T13:00:00.000Z");

  assert.equal(discovered.length, 2);
  assert.equal(discovered[0]?.category, "crypto");
  assert.ok(discovered[0]?.heat && discovered[0].heat > 0.5);

  const market = createMarketFromEvent(state, discovered[0], "2026-05-31T00:00:00.000Z", {
    initialLiquidity: 1_000,
    openedAt: "2026-04-29T13:05:00.000Z"
  });

  assert.equal(market.status, "open");
  assert.equal(market.evidence.length, 3);
  assert.equal(market.pool.collateral, 2_000);
  assert.match(market.question, /^Will /);

  const [snapshot] = listMarkets(state);
  assert.equal(snapshot.id, market.id);
  assert.equal(snapshot.yesPrice, 50);
  assert.equal(snapshot.noPrice, 50);
});

test("buying YES updates price, position, volume, and Solana instruction data", () => {
  const state = createFateMarketProtocol();
  const [candidate] = ingestSignals(state, seedSignals);
  const market = createMarketFromEvent(state, candidate, "2026-05-31T00:00:00.000Z");
  fundAccount(state, "alice", 500);

  const priceBefore = getOutcomePrice(market.pool, "YES");
  const tradeResult = trade(state, market.id, "alice", "YES", 100);
  const priceAfter = getOutcomePrice(market.pool, "YES");
  const account = state.ledger.accounts.get("alice");

  assert.ok(account);
  assert.ok(tradeResult.sharesOut > 0);
  assert.ok(priceAfter > priceBefore);
  assert.equal(account!.positions[market.id]?.yesShares, tradeResult.sharesOut);
  assert.equal(account!.collateral, 400);
  assert.equal(market.tradeCount, 1);
  assert.equal(market.volume, 100);

  const openInstruction = buildOpenMarketInstruction(market, "treasury");
  const buyInstruction = buildBuySharesInstruction(market, "alice", "YES", tradeResult);

  assert.equal(openInstruction.action, "open_market");
  assert.equal(buyInstruction.action, "buy_shares");
  assert.equal(buyInstruction.data.outcome, "YES");
  assert.equal(buyInstruction.data.sharesOut, tradeResult.sharesOut);
});

test("selling shares exits risk before settlement and collects protocol fees", () => {
  const state = createFateMarketProtocol();
  const [candidate] = ingestSignals(state, seedSignals);
  const market = createMarketFromEvent(state, candidate, "2026-05-31T00:00:00.000Z");
  fundAccount(state, "alice", 500);

  const buyTrade = trade(state, market.id, "alice", "YES", 100);
  const priceAfterBuy = getOutcomePrice(market.pool, "YES");
  const sellTrade = exitPosition(state, market.id, "alice", "YES", buyTrade.sharesOut / 2);
  const priceAfterSell = getOutcomePrice(market.pool, "YES");
  const account = state.ledger.accounts.get("alice");
  const sellInstruction = buildSellSharesInstruction(market, "alice", "YES", sellTrade);

  assert.ok(account);
  assert.equal(sellTrade.side, "sell");
  assert.ok(sellTrade.collateralOut > 0);
  assert.ok(priceAfterSell < priceAfterBuy);
  assert.ok(account!.positions[market.id]!.yesShares < buyTrade.sharesOut);
  assert.ok(account!.collateral > 400);
  assert.ok(state.ledger.feesCollected > buyTrade.fee);
  assert.equal(sellInstruction.action, "sell_shares");
  assert.equal(sellInstruction.data.sharesIn, sellTrade.sharesIn);
});

test("portfolio valuation marks open positions against current market prices", () => {
  const state = createFateMarketProtocol();
  const [candidate] = ingestSignals(state, seedSignals);
  const market = createMarketFromEvent(state, candidate, "2026-05-31T00:00:00.000Z");
  fundAccount(state, "alice", 500);
  trade(state, market.id, "alice", "YES", 100);

  const portfolio = getPortfolio(state, "alice");

  assert.equal(portfolio.accountId, "alice");
  assert.equal(portfolio.positions.length, 1);
  assert.equal(portfolio.positions[0]?.marketId, market.id);
  assert.ok(portfolio.positionValue > 0);
  assert.ok(Math.abs(portfolio.totalValue - (portfolio.collateral + portfolio.positionValue)) < 0.0001);
});

test("expired markets lock and reject new trades", () => {
  const state = createFateMarketProtocol();
  const [candidate] = ingestSignals(state, seedSignals);
  const market = createMarketFromEvent(state, candidate, "2026-05-01T00:00:00.000Z", {
    openedAt: "2026-04-29T00:00:00.000Z"
  });
  fundAccount(state, "alice", 500);

  const locked = lockExpiredMarkets(state, "2026-05-02T00:00:00.000Z");

  assert.equal(locked.length, 1);
  assert.equal(market.status, "locked");
  assert.throws(() => trade(state, market.id, "alice", "YES", 50), /not open/);

  const resolution = settle(state, market.id, "NO", "fate-oracle");
  assert.equal(resolution.outcome, "NO");
});

test("market creation and settlement reject invalid core states", () => {
  const state = createFateMarketProtocol();
  const [candidate] = ingestSignals(state, seedSignals);
  const market = createMarketFromEvent(state, candidate, "2026-05-31T00:00:00.000Z");
  const lowReliabilityEvidence = market.evidence.map((item) => ({ ...item, reliability: 0.2 }));

  assert.throws(() => createMarketFromEvent(state, candidate, "2026-05-31T00:00:00.000Z"), /already exists/);
  assert.throws(() => settle(state, market.id, "YES", "fate-oracle", lowReliabilityEvidence), /reliability/);
});

test("resolution evidence settles the market and winning shares redeem", () => {
  const state = createFateMarketProtocol();
  const [candidate] = ingestSignals(state, seedSignals);
  const market = createMarketFromEvent(state, candidate, "2026-05-31T00:00:00.000Z");
  fundAccount(state, "alice", 500);
  const tradeResult = trade(state, market.id, "alice", "YES", 100);

  const resolution = settle(state, market.id, "YES", "fate-oracle");

  assert.equal(resolution.outcome, "YES");
  assert.equal(market.status, "resolved");
  assert.equal(market.resolution, "YES");

  const payout = redeem(state, market.id, "alice");
  const account = state.ledger.accounts.get("alice");

  assert.equal(payout, tradeResult.sharesOut);
  assert.ok(account);
  assert.equal(account!.positions[market.id], undefined);
  assert.ok(Math.abs(account!.collateral - (400 + tradeResult.sharesOut)) < 0.0001);
});
