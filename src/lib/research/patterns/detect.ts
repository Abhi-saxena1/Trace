import type { Coverage, Dataset, Evidence, Extraction, ExtractionField, LaunchMechanics, Pattern } from "../types";
import { isAnalyzable, spanFor } from "../extraction/deterministic";

interface PatternRule {
  id: string;
  title: string;
  description: string;
  specificity: Pattern["specificity"];
  fields: ExtractionField[];
  match: (extraction: Extraction) => boolean;
  contradiction?: RegExp;
}

const rules: PatternRule[] = [
  {
    id: "comment-for-benefit", title: "Comment-to-receive distribution",
    description: "The communication connects a public comment to delivery of a resource or benefit.",
    specificity: "structural", fields: ["CTA", "launch_mechanism"],
    match: e => e.fields.CTA?.rule_id === "comment-cta" && e.fields.launch_mechanism?.rule_id === "comment-for-benefit",
    contradiction: /\b(?:no comment is required|no need to comment|do not comment|don['’]t comment)\b/i,
  },
  {
    id: "untold-story", title: "The previously untold story",
    description: "A personal account is framed as something the speaker has not previously shared.",
    specificity: "structural", fields: ["narrative_structure"],
    match: e => e.fields.narrative_structure?.rule_id === "untold-story",
    contradiction: /\b(?:I['’]ve|I have) (?:already )?(?:shared|told) (?:this|the story) before\b/i,
  },
  {
    id: "financial-proof", title: "Financial milestones as credibility cues",
    description: "Funding or revenue claims serve as credibility cues in the communication. Their truth is not independently established here.",
    specificity: "generic", fields: ["proof_type"],
    match: e => e.fields.proof_type?.rule_id === "financial-proof",
  },
  {
    id: "category-first", title: "First-in-category positioning",
    description: "The copy uses first-in-category language to describe the product.",
    specificity: "generic", fields: ["positioning"],
    match: e => e.fields.positioning?.rule_id === "category-first",
  },
  {
    id: "introduction-and-proof", title: "Product introduction paired with credibility",
    description: "An introduction opening appears with an explicit funding or investor-backing cue in the same retained excerpt.",
    specificity: "structural", fields: ["hook", "proof_type"],
    match: e => e.fields.hook?.rule_id === "opening-introduction" && Boolean(e.fields.proof_type),
  },
];

export function detectPatterns(dataset: Dataset, extractions: Extraction[], mechanics: LaunchMechanics[]): { patterns: Pattern[]; evidence: Evidence[] } {
  const patterns: Pattern[] = [];
  const evidence: Evidence[] = [];
  for (const rule of rules) {
    const contradictions = dataset.content.filter(isAnalyzable).flatMap(item => {
      const match = rule.contradiction?.exec(item.text!);
      return match ? [{ item, span: spanFor(item, match.index, match.index + match[0].length) }] : [];
    });
    const matched = extractions.filter(e => rule.match(e)
      && rule.fields.every(field => e.fields[field]?.basis === "deterministic_interpretation")
      && !contradictions.some(c => c.item.id === e.content_item_id));
    const items = dataset.content.filter(item => matched.some(e => e.content_item_id === item.id));
    const supportingCampaigns = [...new Set(items.map(item => item.campaign_id))].sort();
    const supportingEvents = [...new Set(items.map(item => item.launch_event_id!))].sort();
    // Multiple cross-posts from a single campaign cannot establish recurrence.
    if (supportingCampaigns.length < 2 || supportingEvents.length < 2) continue;
    const patternEvidence: Evidence[] = matched.flatMap(extraction => {
      const item = dataset.content.find(c => c.id === extraction.content_item_id)!;
      return rule.fields.flatMap(field => {
        const observation = extraction.fields[field];
        if (!observation) return [];
        return [{
          id: `evidence:${rule.id}:${item.id}:${field}`, pattern_id: rule.id,
          campaign_id: item.campaign_id, content_item_id: item.id, extraction_id: extraction.id,
          launch_event_id: item.launch_event_id!,
          field, observation: observation.value, basis: observation.basis, span: observation.evidence,
        }];
      });
    });
    const coverage: Coverage[] = dataset.campaigns.map(campaign => {
      const candidates = dataset.content.filter(c => c.campaign_id === campaign.id && c.source_section !== "metadata");
      const supporting = candidates.filter(c => items.some(i => i.id === c.id));
      const contradicting = candidates.filter(c => contradictions.some(negative => negative.item.id === c.id));
      const nonmatching = candidates.filter(c => !supporting.includes(c) && !contradicting.includes(c) && isAnalyzable(c) && c.text_scope === "complete"
        && extractions.some(e => e.content_item_id === c.id && e.provider === "trace-lexical"));
      const unknown = candidates.filter(c => !supporting.includes(c) && !nonmatching.includes(c) && !contradicting.includes(c));
      const negative = nonmatching.length > 0 || contradicting.length > 0;
      return {
        campaign_id: campaign.id,
        status: supporting.length ? negative ? "mixed" : "supports" : negative && !unknown.length ? "not_observed" : "unknown",
        evidence_state: supporting.length ? negative || unknown.length ? "mixed" : "supported_evidence" : negative ? unknown.length ? "mixed" : "counterevidence" : "insufficient_evidence",
        supporting_event_ids: [...new Set(supporting.map(c => c.launch_event_id!))].sort(),
        contradicting_content_ids: contradicting.map(c => c.id),
        supporting_content_ids: supporting.map(c => c.id), nonmatching_content_ids: nonmatching.map(c => c.id),
        unknown_content_ids: unknown.map(c => c.id),
        explanation: supporting.length ? negative ? "Both supporting and contrary/nonmatching material are retained; platform variants do not add independent events." : "Matched in retained source text; other items may differ."
          : nonmatching.length && !unknown.length ? "Rule did not match the complete stored items. This is not proof of absence across the whole campaign."
          : "Missing or excerpt-only text prevents an absence claim; the rule did not match the available excerpt(s).",
      };
    });
    const contraryEvents = new Set(coverage.flatMap(row => [...row.nonmatching_content_ids, ...row.contradicting_content_ids])
      .map(id => dataset.content.find(c => c.id === id)!.launch_event_id));
    // Automatic recurrence is never a strong finding. Counterevidence can only lower confidence.
    const confidence = rule.specificity === "generic" || contradictions.length > 0 || contraryEvents.size >= supportingEvents.length ? "weak" : "candidate";
    patterns.push({
      id: rule.id, title: rule.title, description: rule.description, specificity: rule.specificity,
      confidence,
      confidence_reason: rule.specificity === "generic" ? "A broad lexical cue; recurrence alone provides limited structural insight."
        : confidence === "weak" ? "Explicit contrary wording or at least as many nonmatching events as supporting events limits this finding."
        : "Structural recurrence across at least two campaigns and distinct events. Automated analysis is capped at candidate; positive matches alone cannot establish a strong finding.",
      supporting_campaigns: supportingCampaigns, supporting_content: items.map(i => i.id).sort(),
      supporting_events: supportingEvents, analysis_basis: "inferred_analysis",
      evidence_ids: patternEvidence.map(e => e.id), coverage,
      counterexamples: coverage.flatMap(c => [
        ...(c.nonmatching_content_ids.length ? [{
          campaign_id: c.campaign_id, content_item_ids: c.nonmatching_content_ids, kind: "not_observed" as const,
          spans: c.nonmatching_content_ids.map(id => { const item = dataset.content.find(item => item.id === id)!; return spanFor(item, 0, item.text!.length); }),
          explanation: "Potential counterexample: this rule is not observed in complete stored text. Lexical rules can miss paraphrases; non-observation is not explicit contradiction.",
        }] : []),
        ...(c.contradicting_content_ids.length ? [{
          campaign_id: c.campaign_id, content_item_ids: c.contradicting_content_ids, kind: "contradicts" as const,
          spans: contradictions.filter(negative => negative.item.campaign_id === c.campaign_id).map(negative => negative.span),
          explanation: "Explicit contrary wording detected in retained source text. Its meaning and scope still require human review.",
        }] : []),
      ]),
      limitations: [
        "Purposively selected portfolio, not a representative sample of launches. No causal or performance inference.",
        "Excerpts were selected manually; selection can inflate apparent recurrence and suppress counterexamples.",
        "Unknown coverage is not negative evidence. Cross-posts are grouped by underlying launch event; content counts are not independent evidence counts.",
        "No visual inspection, creator-network inference or research-to-video transformation is inferred from text alone.",
      ],
    });
    evidence.push(...patternEvidence);
  }
  const compoundId = "credibility-to-participation";
  const supportingMechanics = mechanics.filter(item => item.transformations.some(t => t.kind === "credibility_to_participation"));
  const continuityMechanics = mechanics.filter(item => item.transformations.some(t => t.kind === "narrative_continuity"));
  if (supportingMechanics.length >= 2 && new Set(supportingMechanics.flatMap(item => item.campaign_ids)).size >= 2) {
    const supportingContent = [...new Set(supportingMechanics.flatMap(item => item.transformations
      .filter(t => t.kind === "credibility_to_participation").flatMap(t => [t.from_content_id, t.to_content_id])))].sort();
    const supportingCampaigns = [...new Set(supportingMechanics.flatMap(item => item.campaign_ids))].sort();
    const supportingEvents = supportingMechanics.map(item => item.event_id).sort();
    const patternEvidence = supportingContent.flatMap(contentId => {
      const extraction = extractions.find(item => item.content_item_id === contentId)!;
      const contentItem = dataset.content.find(item => item.id === contentId)!;
      return Object.entries(extraction.fields).flatMap(([field, observation]) => {
        if (!observation || !supportingMechanics.some(mechanic => mechanic.transformations.some(t =>
          t.kind === "credibility_to_participation" && t.evidence.some(span => JSON.stringify(span) === JSON.stringify(observation.evidence))))) return [];
        return [{
          id: `evidence:${compoundId}:${contentId}:${field}`, pattern_id: compoundId,
          campaign_id: contentItem.campaign_id, launch_event_id: contentItem.launch_event_id!, content_item_id: contentId,
          extraction_id: extraction.id, field: field as ExtractionField, observation: observation.value,
          basis: observation.basis, span: observation.evidence,
        }];
      });
    });
    const coverage: Coverage[] = dataset.campaigns.map(campaign => {
      const support = supportingMechanics.find(item => item.campaign_ids.includes(campaign.id));
      const continuity = continuityMechanics.find(item => item.campaign_ids.includes(campaign.id));
      const campaignItems = dataset.content.filter(item => item.campaign_id === campaign.id && item.source_section !== "metadata");
      const supportIds = support ? supportingContent.filter(id => campaignItems.some(item => item.id === id)) : [];
      const counterIds = continuity ? continuity.transformations.filter(t => t.kind === "narrative_continuity").flatMap(t => [t.from_content_id, t.to_content_id]) : [];
      const unknownIds = support || continuity ? [] : campaignItems.map(item => item.id);
      return {
        campaign_id: campaign.id,
        status: support ? "supports" : continuity ? "not_observed" : "unknown",
        evidence_state: support ? "supported_evidence" : continuity ? "counterevidence" : "insufficient_evidence",
        supporting_event_ids: support ? [support.event_id] : [], contradicting_content_ids: [],
        supporting_content_ids: supportIds, nonmatching_content_ids: counterIds, unknown_content_ids: unknownIds,
        explanation: support
          ? "A source-cited introduction/credibility cue in the retained X excerpt is paired with a source-cited participation/resource mechanism in the retained LinkedIn excerpt."
          : continuity ? "The paired retained excerpts preserve the same personal-story frame across platforms rather than showing this role shift."
          : "Both platform roles cannot be assessed from the available retained material.",
      };
    });
    const counterexamples = continuityMechanics.flatMap(item => item.campaign_ids.map(campaignId => {
      const transformation = item.transformations.find(t => t.kind === "narrative_continuity")!;
      return {
        campaign_id: campaignId, content_item_ids: [transformation.from_content_id, transformation.to_content_id], kind: "not_observed" as const,
        spans: transformation.evidence,
        explanation: "Counterexample to a universal platform-role shift: both retained excerpts use the same previously-untold-story frame. The excerpts do not establish that the complete posts are identical.",
      };
    }));
    patterns.push({
      id: compoundId,
      title: "Credibility on X, participation on LinkedIn",
      description: "Across paired launch material, an X introduction or credibility cue appears alongside a LinkedIn resource or audience-participation mechanism.",
      specificity: "structural", confidence: counterexamples.length >= supportingEvents.length ? "weak" : "candidate",
      confidence_reason: "A cross-platform combination recurs across distinct launch events, with continuity cases retained as counterevidence. Automated analysis remains capped at candidate.",
      supporting_campaigns: supportingCampaigns, supporting_content: supportingContent,
      supporting_events: supportingEvents, analysis_basis: "inferred_analysis", evidence_ids: patternEvidence.map(item => item.id),
      coverage, counterexamples,
      limitations: [
        "The relationship is descriptive and does not establish intent, performance, causality or a platform-wide strategy.",
        "Only retained excerpts are compared. An excerpt can establish an observed cue but cannot characterize the complete post.",
        "Publication order and elapsed time are reported only where verified timestamp precision supports them.",
        "The portfolio is purposively selected and is not a representative sample of launches.",
      ],
    });
    evidence.push(...patternEvidence);
  }
  return { patterns: patterns.sort((a, b) => a.id.localeCompare(b.id)), evidence };
}
