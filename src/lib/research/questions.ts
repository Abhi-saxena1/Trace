import type { Evidence, ResearchSnapshot, SourceSpan, SourceCapture } from "./types";
import { isVerifiedQuote } from "./source-text";
import { isAnalyzable, spanFor } from "./extraction/deterministic";

export interface SourceSearchResult {
  mode: "source_search";
  answer: null;
  query: string;
  matches: { content_item_id: string; campaign: string; author: string | null; span: SourceSpan; capture: SourceCapture }[];
  message: string;
}

export interface StructuredPatternResult {
  mode: "structured_pattern";
  answer: null;
  query: string;
  pattern_id: "credibility-to-participation";
  pattern_title: string;
  matches: {
    campaign_id: string;
    campaign: string;
    x: { content_item_id: string; interpretation: string; span: SourceSpan; capture: SourceCapture };
    linkedin: { content_item_id: string; interpretation: string; span: SourceSpan; capture: SourceCapture };
  }[];
  coverage: {
    matched: number;
    counterevidence: number;
    insufficient: number;
    insufficient_campaigns: { campaign_id: string; campaign: string; explanation: string }[];
  };
  message: string;
}

export type QuestionResult = SourceSearchResult | StructuredPatternResult;

const stopwords = new Set(["what", "which", "where", "when", "does", "with", "from", "that", "this", "have", "about", "their", "they", "would", "could", "launch", "launches"]);

export function searchSources(snapshot: ResearchSnapshot, question: string): SourceSearchResult {
  const query = question.trim();
  if (query.length < 2 || query.length > 500) throw new Error("Use between 2 and 500 characters.");
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].filter(term => term.length > 2 && !stopwords.has(term));
  const matches = terms.length ? snapshot.dataset.content.filter(isAnalyzable).flatMap(item => {
    const campaign = snapshot.dataset.campaigns.find(c => c.id === item.campaign_id)!;
    const searchable = `${campaign.company} ${item.author ?? ""} ${item.text}`.toLowerCase();
    if (!terms.some(term => searchable.includes(term))) return [];
    const span = spanFor(item, 0, item.text!.length);
    const capture = snapshot.dataset.captures.find(c => c.id === item.source_capture_id);
    if (!capture || !isVerifiedQuote(span, capture)) return [];
    return [{ content_item_id: item.id, campaign: campaign.company, author: item.author, span, capture }];
  }).slice(0, 10) : [];
  return {
    mode: "source_search", answer: null, query, matches,
    message: matches.length ? "Matching source excerpts, not a generated answer. Lexical search returns up to 10 matches in dataset order."
      : "No matching excerpts. This does not establish that the original sources lack an answer.",
  };
}

function isCredibilityParticipationQuery(question: string) {
  const normalized = question.toLowerCase().replaceAll(/[-–—_/]+/g, " ").replaceAll(/[^a-z0-9\s]+/g, " ").replaceAll(/\s+/g, " ").trim();
  const hasConcepts = normalized.includes("credibility") && normalized.includes("participation");
  const namesPlatforms = /\bx\b/.test(normalized) && normalized.includes("linkedin");
  const namesRelationship = /credibility\s+(?:to|and|with)\s+participation/.test(normalized);
  return hasConcepts && (namesPlatforms || namesRelationship);
}

function sameSpan(left: SourceSpan, right: SourceSpan) {
  return left.capture_id === right.capture_id && left.content_item_id === right.content_item_id
    && left.start === right.start && left.end === right.end && left.quote === right.quote;
}

function preferredInterpretation(evidence: Evidence[], contentItemId: string, span: SourceSpan, fields: string[]) {
  const candidates = evidence.filter(item => item.content_item_id === contentItemId && sameSpan(item.span, span));
  const rank = (field: string) => { const index = fields.indexOf(field); return index < 0 ? fields.length : index; };
  return [...candidates].sort((a, b) => rank(a.field) - rank(b.field))[0]?.observation ?? "Validated pattern evidence";
}

function structuredCredibilityParticipation(snapshot: ResearchSnapshot, query: string): StructuredPatternResult {
  const pattern = snapshot.patterns.find(item => item.id === "credibility-to-participation");
  if (!pattern) return {
    mode: "structured_pattern", answer: null, query, pattern_id: "credibility-to-participation",
    pattern_title: "Credibility on X, participation on LinkedIn", matches: [],
    coverage: { matched: 0, counterevidence: 0, insufficient: snapshot.dataset.campaigns.length,
      insufficient_campaigns: snapshot.dataset.campaigns.map(campaign => ({ campaign_id: campaign.id, campaign: campaign.company, explanation: "The validated pattern is unavailable." })) },
    message: "No validated structured match is available. No answer was generated.",
  };
  const patternEvidence = snapshot.evidence.filter(item => item.pattern_id === pattern.id);
  const matches = pattern.supporting_campaigns.flatMap(campaignId => {
    const campaign = snapshot.dataset.campaigns.find(item => item.id === campaignId)!;
    const mechanic = snapshot.mechanics.find(item => item.campaign_ids.includes(campaignId)
      && item.transformations.some(transformation => transformation.kind === "credibility_to_participation"));
    const transformation = mechanic?.transformations.find(item => item.kind === "credibility_to_participation");
    if (!transformation) return [];
    const xSpan = transformation.evidence.find(span => snapshot.dataset.content.find(item => item.id === span.content_item_id)?.platform === "X");
    const linkedInSpan = transformation.evidence.find(span => snapshot.dataset.content.find(item => item.id === span.content_item_id)?.platform === "LinkedIn");
    const xCapture = xSpan && snapshot.dataset.captures.find(item => item.id === xSpan.capture_id);
    const linkedInCapture = linkedInSpan && snapshot.dataset.captures.find(item => item.id === linkedInSpan.capture_id);
    if (!xSpan || !linkedInSpan || !xCapture || !linkedInCapture || !isVerifiedQuote(xSpan, xCapture) || !isVerifiedQuote(linkedInSpan, linkedInCapture)) return [];
    return [{ campaign_id: campaign.id, campaign: campaign.company,
      x: { content_item_id: xSpan.content_item_id, interpretation: preferredInterpretation(patternEvidence, xSpan.content_item_id, xSpan, ["proof_type", "hook", "positioning"]), span: xSpan, capture: xCapture },
      linkedin: { content_item_id: linkedInSpan.content_item_id, interpretation: preferredInterpretation(patternEvidence, linkedInSpan.content_item_id, linkedInSpan, ["launch_mechanism", "CTA"]), span: linkedInSpan, capture: linkedInCapture },
    }];
  });
  const insufficientRows = pattern.coverage.filter(row => row.evidence_state === "insufficient_evidence");
  return {
    mode: "structured_pattern", answer: null, query, pattern_id: "credibility-to-participation", pattern_title: pattern.title, matches,
    coverage: {
      matched: matches.length,
      counterevidence: pattern.coverage.filter(row => row.evidence_state === "counterevidence").length,
      insufficient: insufficientRows.length,
      insufficient_campaigns: insufficientRows.map(row => ({ campaign_id: row.campaign_id,
        campaign: snapshot.dataset.campaigns.find(item => item.id === row.campaign_id)!.company, explanation: row.explanation })),
    },
    message: `${matches.length} campaigns match the requested combination. Structured dataset match; no answer was generated.`,
  };
}

export function queryDataset(snapshot: ResearchSnapshot, question: string): QuestionResult {
  const query = question.trim();
  if (query.length < 2 || query.length > 500) throw new Error("Use between 2 and 500 characters.");
  return isCredibilityParticipationQuery(query) ? structuredCredibilityParticipation(snapshot, query) : searchSources(snapshot, query);
}
