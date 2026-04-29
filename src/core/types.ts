export type Outcome = "YES" | "NO";

export type ResolutionOutcome = Outcome | "VOID";

export type EventSource = "news" | "social" | "onchain" | "market" | "manual";

export type MarketStatus = "drafted" | "open" | "locked" | "resolved" | "voided";

export type TradeSide = "buy" | "sell";

export type Evidence = {
  id: string;
  source: EventSource;
  title: string;
  url?: string;
  observedAt: string;
  reliability: number;
  summary: string;
};

export type EventSignal = {
  id: string;
  title: string;
  summary: string;
  source: EventSource;
  category: string;
  observedAt: string;
  strength: number;
  tags: string[];
  evidence: Evidence[];
};

export type EventCandidate = {
  id: string;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  evidence: Evidence[];
  heat: number;
  confidence: number;
  discoveredAt: string;
};

export type MarketCase = {
  title: string;
  points: string[];
  weight: number;
};

export type MarketIntelligence = {
  eventId: string;
  probability: number;
  confidence: number;
  yesCase: MarketCase;
  noCase: MarketCase;
  catalysts: string[];
  riskNotes: string[];
  updatedAt: string;
};

export type MarketDraft = {
  id: string;
  eventId: string;
  question: string;
  slug: string;
  description: string;
  category: string;
  closeTime: string;
  resolutionRules: string[];
  tags: string[];
  evidence: Evidence[];
  intelligence: MarketIntelligence;
};

export type BinaryPool = {
  yesLiquidity: number;
  noLiquidity: number;
  collateral: number;
  feeBps: number;
};

export type Market = MarketDraft & {
  status: MarketStatus;
  createdAt: string;
  openedAt: string;
  resolvedAt?: string;
  resolution?: ResolutionOutcome;
  pool: BinaryPool;
  volume: number;
  tradeCount: number;
};

export type TradeQuote = {
  side: "buy";
  marketId: string;
  outcome: Outcome;
  collateralIn: number;
  fee: number;
  netCollateral: number;
  sharesOut: number;
  averagePrice: number;
  priceBefore: number;
  priceAfter: number;
};

export type SellQuote = {
  side: "sell";
  marketId: string;
  outcome: Outcome;
  sharesIn: number;
  grossCollateralOut: number;
  fee: number;
  collateralOut: number;
  averagePrice: number;
  priceBefore: number;
  priceAfter: number;
};

export type Trade = TradeQuote & {
  id: string;
  accountId: string;
  executedAt: string;
};

export type SellTrade = SellQuote & {
  id: string;
  accountId: string;
  executedAt: string;
};

export type Position = {
  yesShares: number;
  noShares: number;
};

export type Account = {
  id: string;
  collateral: number;
  positions: Record<string, Position>;
};

export type Ledger = {
  accounts: Map<string, Account>;
  trades: Array<Trade | SellTrade>;
  feesCollected: number;
};

export type PortfolioPosition = {
  marketId: string;
  yesShares: number;
  noShares: number;
  yesValue: number;
  noValue: number;
  totalValue: number;
};

export type AccountPortfolio = {
  accountId: string;
  collateral: number;
  positions: PortfolioPosition[];
  positionValue: number;
  totalValue: number;
};

export type ResolutionEvidence = {
  marketId: string;
  outcome: ResolutionOutcome;
  resolver: string;
  evidence: Evidence[];
  resolvedAt: string;
};

export type FateSolanaInstruction = {
  program: "fate_market";
  action: "open_market" | "buy_shares" | "sell_shares" | "resolve_market" | "redeem";
  accounts: string[];
  data: Record<string, string | number | boolean>;
};

export type ProtocolState = {
  events: EventCandidate[];
  markets: Market[];
  ledger: Ledger;
  resolutions: ResolutionEvidence[];
};
