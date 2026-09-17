import type { ContentItem, Extraction, ExtractionField, ExtractionProvider, Observation, SourceSpan } from "../types";
import { detectSequence } from "../sequence/detect";

export const extractionFields: ExtractionField[] = [
  "hook", "core_claim", "narrative_structure", "audience", "positioning", "proof_type",
  "CTA", "emotional_trigger", "visual_strategy", "creator_role", "product_mechanism", "launch_mechanism",
];

export function isAnalyzable(item: ContentItem): boolean {
  return item.verified && Boolean(item.source_capture_id) && item.source_section !== "metadata" && Boolean(item.text?.trim())
    && item.text_scope !== "unavailable" && ["retrieved", "partial"].includes(item.retrieval_status);
}

export function spanFor(item: ContentItem, start: number, end: number): SourceSpan {
  if (!isAnalyzable(item) || !Number.isInteger(start) || !Number.isInteger(end)
    || start < 0 || end <= start || end > item.text!.length) throw new Error("Unverified or invalid quote span");
  return {
    capture_id: item.source_capture_id!,
    content_item_id: item.id, source_url: item.source_url, retrieved_from_url: item.retrieved_from_url,
    start, end, quote: item.text!.slice(start, end),
  };
}

/** Rules label observable language, not business performance or the truth of claims. */
export class DeterministicExtractor implements ExtractionProvider {
  readonly id = "trace-lexical";
  readonly version = "1.0.0";

  extract(item: ContentItem): Extraction {
    const fields = Object.fromEntries(extractionFields.map(field => [field, null])) as Extraction["fields"];
    if (isAnalyzable(item)) {
      const text = item.text!;
      const observe = (field: ExtractionField, value: string, rule: string, expression: RegExp) => {
        const match = expression.exec(text);
        if (!match) return;
        fields[field] = {
          value, rule_id: rule, basis: "deterministic_interpretation",
          evidence: spanFor(item, match.index, match.index + match[0].length),
        } satisfies Observation;
      };

      if (item.text_starts_at_beginning) {
        observe("hook", "Product introduction opening", "opening-introduction", /^[^.!?\n]{0,35}\bintroduc(?:e|ing)\b[^.!?\n]*/i);
        if (!fields.hook) observe("hook", "Funding announcement opening", "opening-funding", /^[^.!?\n]{0,45}\braised\s+\$[\d.]+[MBK]?[^.!?\n]*/i);
        if (!fields.hook) observe("hook", "Conditional challenge opening", "opening-challenge", /^We offered\b[^\n]+\bif\b[^\n]+/i);
        if (!fields.hook) observe("hook", "Question opening", "opening-question", /^[^?\n]+\?/);
      }
      observe("core_claim", "Author makes a financial milestone claim", "financial-claim", /(?:raised\s+\$[\d.]+[MBK]?|\$[\d.]+[MBK]?\s+ARR)\b/i);
      observe("proof_type", "Financial milestone used as a credibility cue", "financial-proof", /(?:raised\s+\$[\d.]+[MBK]?|\$[\d.]+[MBK]?\s+ARR)\b/i);
      if (!fields.proof_type) observe("proof_type", "Named investor backing used as a credibility cue", "backer-proof", /backed by [^.!?\n]+/i);
      observe("narrative_structure", "Previously untold personal story framing", "untold-story", /(?:story[^.!?\n]{0,45}never told[^.!?\n]*|never shared this before[^.!?\n]*)/i);
      observe("positioning", "First-in-category language", "category-first", /(?:world['’]s\s+)?first\s+(?:AI\s+[^.!?\n]+|Engineering World Model)/i);
      observe("audience", "Enterprise application context is explicit", "enterprise-audience", /internal enterprise apps/i);
      observe("emotional_trigger", "Embarrassment is explicitly named", "named-embarrassment", /embarrassing[^.!?\n]*/i);
      observe("product_mechanism", "Code workflow automation is claimed", "code-automation", /debugging, fixing, and testing your code on autopilot/i);
      observe("creator_role", "Speaker explicitly identifies as a founder", "explicit-founder", /(?:I['’]m|I am)[^.!?\n]{0,30}\bfounder\b[^.!?\n]*/i);
      observe("visual_strategy", "Speaker describes an AI-generated presenter", "explicit-ai-presenter", /(?:I['’]m|I am) AI generated/i);
      observe("CTA", "Request to comment", "comment-cta", /\bcomment\b[^.!?\n]*/i);
      if (!fields.CTA) observe("CTA", "Direct trial or download request", "trial-cta", /\b(?:download now|try for free|book a demo)\b[^.!?\n]*/i);
      // Both the action and promised delivery must be in the same contiguous excerpt.
      if (!/\b(?:do not|don['’]t|never)\s+comment\b/i.test(text)) {
        observe("launch_mechanism", "Public comment tied to resource or benefit delivery", "comment-for-benefit", /(?:\bcomment\b[^\n]{0,80}\band we['’]ll send you\b[^\n]*|\bgiving away\b[^\n]{0,180}\bcomment\b[^\n]{0,60}\bto get it\b[^\n]*)/i);
      }
      if (!fields.launch_mechanism) observe("launch_mechanism", "Research resource offered alongside the launch", "resource-offer", /sharing[^.!?\n]{0,50}\b(?:guide|research)\b[^.!?\n]*/i);
      if (!fields.launch_mechanism) observe("launch_mechanism", "Conditional product challenge", "product-challenge", /We offered[^\n]+\bif\b[^\n]+\bmistake\b/i);
    }

    return {
      id: `extraction:${item.id}:${this.version}`, content_item_id: item.id,
      provider: this.id, version: this.version, fields,
      sequence: detectSequence(item, fields),
      limitations: [
        "Rule-based interpretation of wording; not independently verified business facts or evidence of effectiveness.",
        "Unmatched fields remain null. No inference of visuals, emotions, audience or creator role without an explicit textual cue.",
        ...(item.text_scope !== "complete" ? ["Only selected source excerpts are stored. Absence of a cue does not establish absence from the original content."] : []),
      ],
    };
  }
}
