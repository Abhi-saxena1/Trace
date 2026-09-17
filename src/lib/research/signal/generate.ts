import type { Pattern, Signal } from "../types";

/** Order candidate findings, never campaigns. No arbitrary numerical confidence score. */
export function generateSignals(patterns: Pattern[]): Signal[] {
  return patterns.filter(pattern => pattern.specificity === "structural" && pattern.confidence === "candidate"
    && pattern.evidence_ids.length > 0 && pattern.supporting_events.length >= 2 && pattern.supporting_campaigns.length >= 2)
    .sort((a, b) => Number(b.confidence === "supported") - Number(a.confidence === "supported")
      || b.supporting_events.length - a.supporting_events.length
      || b.supporting_campaigns.length - a.supporting_campaigns.length
      || a.coverage.filter(c => c.status === "unknown").length - b.coverage.filter(c => c.status === "unknown").length
      || a.id.localeCompare(b.id))
    .map(pattern => ({
      analysis_basis: "inferred_analysis" as const,
      id: `signal:${pattern.id}`, pattern_id: pattern.id,
      thesis: `${pattern.title}: observed in ${pattern.supporting_campaigns.length} campaigns in the loaded dataset.`,
      why_non_obvious: `${pattern.description} This is a candidate structural observation beyond a generic launch announcement; novelty has not been established against an external baseline.`,
      supporting_campaigns: pattern.supporting_campaigns, supporting_evidence: pattern.evidence_ids,
      counterexamples: pattern.counterexamples, confidence: pattern.confidence,
      limitations: [...pattern.limitations, "Selection prioritizes structural specificity, qualitative confidence, campaign breadth, then lower unknown coverage. It does not rank campaign success."],
    }));
}
