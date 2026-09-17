import type { ResearchSnapshot } from "../types";
import { validateResearch } from "../findings-validation";
import { spanFor } from "../extraction/deterministic";

/** Presentation only: confidence and eligibility remain owned by the research pipeline. */
export function presentSignal(research: ResearchSnapshot) {
  try {
    validateResearch(research);
  } catch {
    return { state: "insufficient" as const, reason: "The evidence chain could not be validated. The observation and quotations are withheld until its references can be verified." };
  }
  const signal = research.signal;
  if (!signal) return { state: "insufficient" as const, reason: "No structural pattern currently qualifies for a signal. There is insufficient evidence for a supported conclusion in the loaded dataset." };
  const pattern = research.patterns.find(p => p.id === signal.pattern_id)!;
  const supporting = signal.supporting_evidence.map(id => {
    const evidence = research.evidence.find(e => e.id === id)!;
    const content = research.dataset.content.find(c => c.id === evidence.content_item_id)!;
    const campaign = research.dataset.campaigns.find(c => c.id === evidence.campaign_id)!;
    const capture = research.dataset.captures.find(c => c.id === evidence.span.capture_id)!;
    return { evidence, content, campaign, capture };
  });
  const coverage = pattern.coverage.map(row => ({
    ...row,
    label: [
      row.supporting_content_ids.length > 0 ? "Supported evidence" : null,
      row.nonmatching_content_ids.length > 0 || row.contradicting_content_ids.length > 0 ? "Counterevidence" : null,
      row.unknown_content_ids.length > 0 || row.status === "unknown" ? "Insufficient evidence" : null,
    ].filter(Boolean).join(" + "),
    campaign: research.dataset.campaigns.find(c => c.id === row.campaign_id)!,
    unknown: row.unknown_content_ids.map(id => research.dataset.content.find(c => c.id === id)!),
  }));
  // Several extraction fields can cite one post. Present that post once, without
  // changing its evidence references or making it look like independent support.
  const supportingItems = pattern.supporting_content.map(id => {
    const matches = supporting.filter(row => row.content.id === id);
    const { content, campaign, capture } = matches[0];
    return { content, campaign, capture, evidence: matches.map(row => row.evidence),
      span: spanFor(content, 0, content.text!.length) };
  });
  const counterevidence = pattern.counterexamples.map(example => ({
    ...example,
    campaign: research.dataset.campaigns.find(c => c.id === example.campaign_id)!,
    content: example.content_item_ids.map(id => research.dataset.content.find(c => c.id === id)!),
    quotes: example.spans.map(span => ({ span, capture: research.dataset.captures.find(c => c.id === span.capture_id)! })),
  }));
  const mechanics = pattern.supporting_events.map(id => research.mechanics.find(item => item.event_id === id)!);
  return {
    state: "finding" as const, signal, pattern, mechanics, supporting, supportingItems, coverage, counterevidence,
    label: signal.confidence === "supported" ? "Supported" : "Candidate",
    counts: {
      campaigns: pattern.supporting_campaigns.length,
      totalCampaigns: coverage.length,
      events: pattern.supporting_events.length,
      content: pattern.supporting_content.length,
      counterevidence: new Set(counterevidence.map(row => row.campaign_id)).size,
      insufficient: coverage.filter(row => row.unknown.length > 0 || row.status === "unknown").length,
    },
    limitations: [...new Set(signal.limitations)],
  };
}
