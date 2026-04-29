import { EventCandidate, EventSignal } from "./types.js";
import { clamp, round, stableId } from "./utils.js";

function scoreSignal(signal: EventSignal) {
  const evidenceQuality =
    signal.evidence.length === 0
      ? 0.35
      : signal.evidence.reduce((sum, item) => sum + item.reliability, 0) / signal.evidence.length;
  const sourceWeight = signal.source === "onchain" || signal.source === "market" ? 1.08 : 1;
  const tagWeight = 1 + Math.min(signal.tags.length, 8) * 0.035;

  return clamp(signal.strength * evidenceQuality * sourceWeight * tagWeight, 0, 1);
}

export function discoverEventCandidates(signals: EventSignal[], discoveredAt = new Date().toISOString()): EventCandidate[] {
  const grouped = new Map<string, EventSignal[]>();

  for (const signal of signals) {
    const key = `${signal.category}:${signal.title.toLowerCase()}`;
    grouped.set(key, [...(grouped.get(key) ?? []), signal]);
  }

  return Array.from(grouped.values())
    .map((items) => {
      const primary = items[0];
      const allEvidence = items.flatMap((item) => item.evidence);
      const heat = round(clamp(items.reduce((sum, item) => sum + scoreSignal(item), 0) / Math.sqrt(items.length), 0, 1));
      const confidence = round(
        clamp((heat * 0.62 + Math.min(allEvidence.length, 6) * 0.055 + Math.min(items.length, 5) * 0.035), 0, 1)
      );

      return {
        id: stableId("evt", `${primary.category}:${primary.title}:${items.map((item) => item.id).join("|")}`),
        title: primary.title,
        category: primary.category,
        summary: primary.summary,
        tags: Array.from(new Set(items.flatMap((item) => item.tags))).sort(),
        evidence: allEvidence,
        heat,
        confidence,
        discoveredAt
      };
    })
    .filter((candidate) => candidate.heat >= 0.22)
    .sort((left, right) => right.heat - left.heat || right.confidence - left.confidence);
}
