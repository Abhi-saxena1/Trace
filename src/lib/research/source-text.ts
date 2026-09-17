import type { ContentItem, SourceCapture, SourceSpan } from "./types";
import { canonicalizeSourceUrl } from "./source-identity";

/** Shared server/UI gate. A boolean supplied by a provider is never enough to quote. */
export function isVerifiedQuote(span: SourceSpan, capture: SourceCapture | undefined): boolean {
  if (!capture) return false;
  try {
    return span.capture_id === capture.id && span.content_item_id === capture.content_item_id
      && canonicalizeSourceUrl(span.source_url) === canonicalizeSourceUrl(capture.source_url)
      && canonicalizeSourceUrl(span.retrieved_from_url) === canonicalizeSourceUrl(capture.retrieved_from_url)
      && Number.isInteger(span.start) && Number.isInteger(span.end) && span.start >= 0
      && span.end > span.start && span.end <= capture.text.length
      && capture.text.slice(span.start, span.end) === span.quote;
  } catch { return false; }
}

export function contentEvidenceState(item: ContentItem): string {
  if (item.source_section === "metadata" && item.verified) return "Verified source metadata · no quoted text";
  if (["not_retrieved", "unavailable"].includes(item.retrieval_status)) return "Unavailable / missing source data";
  if (!item.verified) return "Retrieved source data · verification pending";
  if (!item.source_capture_id || !item.text) return "Exact source text unavailable · quotations withheld";
  return "Verified source excerpt · claims not independently verified";
}
