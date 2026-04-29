import { EventSignal } from "../core/types.js";

export const seedSignals: EventSignal[] = [
  {
    id: "sig-btc-etf-flow-001",
    title: "Bitcoin spot ETF net inflows exceed 1B USD this week",
    summary:
      "ETF flow desks and market data providers report accelerating spot Bitcoin ETF inflows across the current week.",
    source: "market",
    category: "crypto",
    observedAt: "2026-04-29T09:00:00.000Z",
    strength: 0.76,
    tags: ["bitcoin", "etf", "flows", "crypto"],
    evidence: [
      {
        id: "ev-btc-flow-001",
        source: "market",
        title: "ETF flow dashboard records elevated weekly inflows",
        observedAt: "2026-04-29T09:00:00.000Z",
        reliability: 0.86,
        summary: "The flow dashboard reports a multi-day acceleration in net inflows."
      },
      {
        id: "ev-btc-flow-002",
        source: "news",
        title: "Market desk note highlights renewed institutional demand",
        observedAt: "2026-04-29T10:30:00.000Z",
        reliability: 0.78,
        summary: "The desk note ties rising ETF demand to stronger spot market activity."
      }
    ]
  },
  {
    id: "sig-btc-etf-flow-002",
    title: "Bitcoin spot ETF net inflows exceed 1B USD this week",
    summary:
      "Onchain exchange balances and ETF desk commentary continue to point toward institutional Bitcoin accumulation.",
    source: "onchain",
    category: "crypto",
    observedAt: "2026-04-29T11:20:00.000Z",
    strength: 0.68,
    tags: ["bitcoin", "onchain", "liquidity"],
    evidence: [
      {
        id: "ev-btc-flow-003",
        source: "onchain",
        title: "Exchange balance tracker shows net withdrawals",
        observedAt: "2026-04-29T11:20:00.000Z",
        reliability: 0.82,
        summary: "Tracked wallets show a reduction in liquid exchange inventory."
      }
    ]
  },
  {
    id: "sig-fed-cut-001",
    title: "Federal Reserve announces a rate cut at the next meeting",
    summary:
      "Macro desks are repricing the next FOMC meeting after softer inflation and labor market signals.",
    source: "news",
    category: "economy",
    observedAt: "2026-04-29T12:00:00.000Z",
    strength: 0.54,
    tags: ["fed", "rates", "macro", "economy"],
    evidence: [
      {
        id: "ev-fed-cut-001",
        source: "news",
        title: "Inflation print comes in below market expectations",
        observedAt: "2026-04-29T12:00:00.000Z",
        reliability: 0.76,
        summary: "The latest inflation reading increases pressure for a dovish policy path."
      }
    ]
  }
];
