import { Evidence, Market, ResolutionEvidence, ResolutionOutcome } from "./types.js";
import { nowIso } from "./utils.js";

function getAverageReliability(evidence: Evidence[]) {
  return evidence.reduce((sum, item) => sum + item.reliability, 0) / evidence.length;
}

export function resolveMarket(
  market: Market,
  outcome: ResolutionOutcome,
  resolver: string,
  evidence: Evidence[],
  resolvedAt = nowIso()
): ResolutionEvidence {
  if (market.status !== "open" && market.status !== "locked") {
    throw new Error(`Market ${market.id} cannot be resolved from status ${market.status}.`);
  }

  if (evidence.length === 0) {
    throw new Error("Resolution requires at least one evidence item.");
  }

  const averageReliability = getAverageReliability(evidence);

  if (outcome !== "VOID" && averageReliability < 0.55) {
    throw new Error("Resolution evidence reliability is below the minimum threshold.");
  }

  market.status = outcome === "VOID" ? "voided" : "resolved";
  market.resolution = outcome;
  market.resolvedAt = resolvedAt;

  return {
    marketId: market.id,
    outcome,
    resolver,
    evidence,
    resolvedAt
  };
}
