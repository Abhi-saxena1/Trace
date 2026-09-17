import type { ContentItem, Extraction, Sequence, SequenceStage, SourceSpan } from "../types";

export function detectSequence(item: ContentItem, fields: Extraction["fields"]): Sequence {
  const stages: Sequence["stages"] = {
    hook: fields.hook?.evidence ?? null,
    context: fields.narrative_structure?.evidence ?? null,
    claim: fields.core_claim?.evidence ?? fields.positioning?.evidence ?? null,
    proof: fields.proof_type?.evidence ?? null,
    product: fields.product_mechanism?.evidence ?? null,
    CTA: fields.CTA?.evidence ?? null,
  };
  const entries = Object.entries(stages).filter((entry): entry is [SequenceStage, SourceSpan] => entry[1] !== null);
  return {
    stages,
    observed_order: entries.sort((a, b) => a[1].start - b[1].start || a[0].localeCompare(b[0])).map(([stage]) => stage),
    limitation: `${item.text_scope === "complete" ? "Stored text" : "Stored excerpt"} only. Stages may overlap; tied offsets do not establish temporal order. This is not a cross-post launch timeline.`,
  };
}
