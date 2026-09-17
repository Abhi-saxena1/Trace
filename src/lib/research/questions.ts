import type { ResearchSnapshot, SourceSpan, SourceCapture } from "./types";
import { isVerifiedQuote } from "./source-text";
import { isAnalyzable, spanFor } from "./extraction/deterministic";

export interface QuestionResult {
  mode: "source_search";
  answer: null;
  query: string;
  matches: { content_item_id: string; campaign: string; author: string | null; span: SourceSpan; capture: SourceCapture }[];
  message: string;
}

const stopwords = new Set(["what", "which", "where", "when", "does", "with", "from", "that", "this", "have", "about", "their", "they", "would", "could", "launch", "launches"]);

export function searchSources(snapshot: ResearchSnapshot, question: string): QuestionResult {
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
