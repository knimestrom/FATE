import { EventCandidate, MarketDraft, MarketIntelligence } from "./types.js";
import { clamp, round, slugify, stableId } from "./utils.js";

function inferProbability(candidate: EventCandidate) {
  const evidencePressure = Math.min(candidate.evidence.length, 8) * 0.025;
  const hotEventPressure = (candidate.heat - 0.5) * 0.28;
  const confidencePressure = (candidate.confidence - 0.5) * 0.18;

  return round(clamp(0.5 + evidencePressure + hotEventPressure + confidencePressure, 0.08, 0.92));
}

export function analyzeCandidate(candidate: EventCandidate, updatedAt = new Date().toISOString()): MarketIntelligence {
  const probability = inferProbability(candidate);
  const topEvidence = candidate.evidence.slice(0, 3).map((item) => item.title);
  const tags = candidate.tags.slice(0, 4);

  return {
    eventId: candidate.id,
    probability,
    confidence: candidate.confidence,
    yesCase: {
      title: "YES thesis",
      points: [
        `Event heat is ${Math.round(candidate.heat * 100)} based on the current signal set.`,
        topEvidence.length > 0 ? `Evidence cluster: ${topEvidence.join("; ")}.` : "The event has an active signal cluster.",
        tags.length > 0 ? `Relevant tags: ${tags.join(", ")}.` : "The market is driven by current event momentum."
      ],
      weight: round(probability)
    },
    noCase: {
      title: "NO thesis",
      points: [
        "Resolution depends on a clearly observable future condition.",
        "Signal strength can fade if confirming evidence does not continue.",
        "Market participants can price uncertainty directly through the NO side."
      ],
      weight: round(1 - probability)
    },
    catalysts: [
      "New primary-source evidence",
      "High-volume market activity",
      "Onchain liquidity movement",
      "Resolution source updates"
    ],
    riskNotes: [
      "Ambiguous wording can increase resolution risk.",
      "Low-liquidity markets can move sharply on small trades.",
      "Conflicting sources should be resolved before market close."
    ],
    updatedAt
  };
}

export function draftMarket(candidate: EventCandidate, closeTime: string, updatedAt = new Date().toISOString()): MarketDraft {
  const intelligence = analyzeCandidate(candidate, updatedAt);
  const question = `Will ${candidate.title}?`;

  return {
    id: stableId("mkt", `${candidate.id}:${closeTime}`),
    eventId: candidate.id,
    question,
    slug: slugify(question),
    description: candidate.summary,
    category: candidate.category,
    closeTime,
    resolutionRules: [
      "The market resolves YES if the event condition is confirmed by the listed resolution source before close.",
      "The market resolves NO if the event condition is not confirmed before close.",
      "The market resolves VOID if the event is canceled, impossible to verify, or the question becomes materially ambiguous."
    ],
    tags: candidate.tags,
    evidence: candidate.evidence,
    intelligence
  };
}
