import { createHash } from "node:crypto";
import type { Dataset, Extraction } from "./types";
import { canonicalizeSourceUrl } from "./source-identity";
import { isVerifiedQuote } from "./source-text";
import { DeterministicExtractor, extractionFields, isAnalyzable } from "./extraction/deterministic";

export function isPublicSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      && url.hostname.includes(".") && !url.hostname.endsWith(".local")
      && !url.hostname.endsWith(".localhost") && !url.hostname.endsWith(".internal")
      && !/^[\d.]+$/.test(url.hostname) && !url.hostname.includes(":");
  } catch { return false; }
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid research dataset: ${message}`);
}

export function validateDataset(dataset: Dataset): void {
  const campaignIds = new Set(dataset.campaigns.map(c => c.id));
  const contentIds = new Set(dataset.content.map(c => c.id));
  requireCondition(campaignIds.size === dataset.campaigns.length, "duplicate campaign ID");
  requireCondition(contentIds.size === dataset.content.length, "duplicate content ID");
  const sourceUrls = new Set<string>();
  const eventIds = new Set(dataset.events.map(event => event.id));
  const captureIds = new Set(dataset.captures.map(capture => capture.id));
  const responseIds = new Set((dataset.responses ?? []).map(response => response.id));
  requireCondition(eventIds.size === dataset.events.length, "duplicate launch event ID");
  requireCondition(captureIds.size === dataset.captures.length, "duplicate source capture ID");
  requireCondition(responseIds.size === (dataset.responses ?? []).length, "duplicate public response ID");
  for (const event of dataset.events) {
    requireCondition(event.id.trim() && event.rationale.trim() && event.source_urls.length > 0, "event grouping provenance required");
    requireCondition(event.campaign_ids.length > 0 && new Set(event.campaign_ids).size === event.campaign_ids.length
      && event.campaign_ids.every(id => campaignIds.has(id)), "event references an unknown or duplicate campaign");
    requireCondition(["conservative_campaign", "reviewed_equivalence"].includes(event.grouping_basis), "invalid grouping basis");
    requireCondition(event.source_urls.every(url => isPublicSourceUrl(url) && dataset.content.some(item => event.campaign_ids.includes(item.campaign_id)
      && canonicalizeSourceUrl(item.source_url) === canonicalizeSourceUrl(url))), "event source is not linked to its campaigns");
    requireCondition(dataset.content.some(item => item.launch_event_id === event.id), "orphaned launch event");
  }
  for (const capture of dataset.captures) {
    const item = dataset.content.find(c => c.id === capture.content_item_id);
    requireCondition(item?.source_capture_id === capture.id, "orphaned source capture");
    requireCondition(isPublicSourceUrl(capture.source_url) && isPublicSourceUrl(capture.retrieved_from_url), "missing capture source provenance");
    requireCondition(capture.text.trim() && capture.method.trim() && Number.isFinite(Date.parse(capture.retrieved_at)), "incomplete retrieval record");
    requireCondition(capture.representation === "public-page-text" && ["complete", "excerpt"].includes(capture.scope), "invalid capture representation/scope");
    requireCondition(createHash("sha256").update(capture.text, "utf8").digest("hex") === capture.sha256, "source capture integrity mismatch");
  }
  for (const response of dataset.responses ?? []) {
    const item = dataset.content.find(content => content.id === response.content_item_id);
    requireCondition(item && item.campaign_id === response.campaign_id && item.launch_event_id === response.launch_event_id
      && item.platform === response.platform, "public response provenance chain mismatch");
    requireCondition(isPublicSourceUrl(response.source_url)
      && canonicalizeSourceUrl(response.source_url) === canonicalizeSourceUrl(item.source_url), "public response source mismatch");
    requireCondition(response.note.trim() && response.observed_at !== null && Number.isFinite(Date.parse(response.observed_at)), "public response observation provenance required");
    const verified = response.verification_state === "verified_source_data";
    requireCondition(verified ? response.snapshot_state === "observed_snapshot" && response.metrics.length > 0
      : response.snapshot_state === null && response.metrics.length === 0, "unverified response cannot contain verified metrics");
    requireCondition(new Set(response.metrics.map(metric => metric.type)).size === response.metrics.length, "duplicate public response metric type");
    for (const metric of response.metrics) {
      requireCondition(metric.display_value.trim() && ["exact", "abbreviated"].includes(metric.precision), "invalid public response metric");
      if (metric.precision === "exact") requireCondition(Number.isSafeInteger(metric.numeric_value) && metric.numeric_value! >= 0
        && Number(metric.display_value.replaceAll(",", "")) === metric.numeric_value, "invalid exact public response metric");
      else requireCondition(metric.numeric_value === null && /^\d+(?:\.\d+)?[KM]$/.test(metric.display_value), "abbreviated metric must not be expanded");
    }
  }
  for (const campaign of dataset.campaigns) {
    requireCondition(/^[a-z0-9-]+$/.test(campaign.id) && campaign.company.trim(), "invalid campaign identity");
    requireCondition(campaign.launch_date === null ? campaign.date_precision === null
      : campaign.date_precision === "month" ? /^\d{4}-(0[1-9]|1[0-2])$/.test(campaign.launch_date)
      : campaign.date_precision === "day" && /^\d{4}-\d{2}-\d{2}$/.test(campaign.launch_date)
        && new Date(campaign.launch_date).toISOString().slice(0, 10) === campaign.launch_date,
    `date precision mismatch for ${campaign.id}`);
    requireCondition(!campaign.campaign_url || isPublicSourceUrl(campaign.campaign_url), "invalid campaign URL");
    requireCondition(!campaign.provenance.source_url || isPublicSourceUrl(campaign.provenance.source_url), "invalid provenance URL");
    requireCondition(campaign.provenance.status !== "source_verified" || campaign.provenance.source_url, "verified campaign needs a source");
    requireCondition(new Set(campaign.content_item_ids).size === campaign.content_item_ids.length, "duplicate campaign content reference");
    for (const id of campaign.content_item_ids) {
      requireCondition(dataset.content.some(item => item.id === id && item.campaign_id === campaign.id), `dangling content reference ${id}`);
    }
  }
  for (const item of dataset.content) {
    requireCondition(/^[a-z0-9-]+$/.test(item.id), "invalid content ID");
    requireCondition(campaignIds.has(item.campaign_id), `unknown campaign for ${item.id}`);
    requireCondition(dataset.campaigns.find(c => c.id === item.campaign_id)?.content_item_ids.includes(item.id), `unlisted content ${item.id}`);
    requireCondition(isPublicSourceUrl(item.source_url), `public HTTP(S) source required for ${item.id}`);
    requireCondition(isPublicSourceUrl(item.retrieved_from_url), `retrieval provenance required for ${item.id}`);
    const canonical = canonicalizeSourceUrl(item.source_url);
    requireCondition(!sourceUrls.has(canonical), `duplicate source URL ${canonical}`);
    sourceUrls.add(canonical);
    requireCondition(["retrieved", "partial", "unavailable", "not_retrieved"].includes(item.retrieval_status), "invalid retrieval state");
    requireCondition(["complete", "excerpt", "unavailable"].includes(item.text_scope), "invalid text state");
    requireCondition(!["retrieved", "partial"].includes(item.retrieval_status) || item.retrieved_at, "retrieved data needs retrieval provenance");
    requireCondition(!item.verified || ["retrieved", "partial"].includes(item.retrieval_status), "unavailable data cannot be verified");
    const event = dataset.events.find(e => e.id === item.launch_event_id);
    requireCondition(item.source_section === "metadata" ? item.launch_event_id === null : event?.campaign_ids.includes(item.campaign_id), "missing or mismatched launch event provenance");
    if (item.source_capture_id !== null) {
      const capture = dataset.captures.find(c => c.id === item.source_capture_id);
      requireCondition(capture && capture.content_item_id === item.id
        && canonicalizeSourceUrl(capture.source_url) === canonical
        && canonicalizeSourceUrl(capture.retrieved_from_url) === canonicalizeSourceUrl(item.retrieved_from_url), "missing or mismatched source capture provenance");
      requireCondition(item.text === capture.text && item.text_scope === capture.scope, "content text does not match retrieved source capture");
      requireCondition(["retrieved", "partial"].includes(item.retrieval_status), "capture requires retrieved source state");
    } else {
      requireCondition(item.text === null && item.text_scope === "unavailable", "text without a retrieval capture must remain unavailable");
    }
    requireCondition(!item.verified || Boolean(item.retrieved_at && item.verification_note?.trim()), `verification provenance required for ${item.id}`);
    requireCondition(item.text_scope !== "complete" || (Boolean(item.text?.trim()) && item.retrieval_status === "retrieved"), "complete text must be retrieved");
    requireCondition(item.text_scope !== "excerpt" || Boolean(item.text?.trim()), "excerpt requires text");
    requireCondition(item.text_scope !== "unavailable" || item.text === null, "unavailable text must be null");
    const publication = item.publication;
    requireCondition(publication && ["exact", "minute", "hour", "day", "unknown"].includes(publication.precision)
      && ["verified", "unverified", "unavailable"].includes(publication.verification_status), `invalid publication evidence for ${item.id}`);
    requireCondition(isPublicSourceUrl(publication.source_url)
      && canonicalizeSourceUrl(publication.source_url) === canonical, `publication source mismatch for ${item.id}`);
    requireCondition(Boolean(publication.evidence?.trim()), `publication evidence note required for ${item.id}`);
    requireCondition(publication.verification_status !== "verified"
      || (publication.published_at !== null && publication.precision !== "unknown"), `verified publication timestamp required for ${item.id}`);
    requireCondition(publication.verification_status !== "unavailable"
      || (publication.published_at === null && publication.precision === "unknown"), `unavailable publication data must remain null for ${item.id}`);
    requireCondition(publication.published_at !== null
      || publication.precision === "unknown", `missing publication timestamp must use unknown precision for ${item.id}`);
    if (publication.published_at !== null) {
      requireCondition(Number.isFinite(Date.parse(publication.published_at)), `invalid publication timestamp for ${item.id}`);
      requireCondition(publication.precision !== "day" || (/^\d{4}-\d{2}-\d{2}$/.test(publication.published_at)
        && new Date(publication.published_at).toISOString().slice(0, 10) === publication.published_at), `day publication precision mismatch for ${item.id}`);
      requireCondition(publication.precision !== "exact" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(publication.published_at), `exact publication precision mismatch for ${item.id}`);
    }
    requireCondition(item.retrieved_at === null || Number.isFinite(Date.parse(item.retrieved_at)), "invalid retrieval timestamp");
    if (item.metrics) {
      requireCondition(item.metrics.verified === true && item.verified, "metrics must be verified");
      requireCondition(isPublicSourceUrl(item.metrics.source_url) && Number.isFinite(Date.parse(item.metrics.observed_at)), "metrics need a source and observation date");
      for (const metric of [item.metrics.views, item.metrics.likes, item.metrics.comments, item.metrics.shares]) {
        requireCondition(metric === null || (Number.isSafeInteger(metric) && metric >= 0), "invalid metric; missing must be null");
      }
    }
    for (const media of item.media ?? []) requireCondition(isPublicSourceUrl(media.url), "invalid media URL");
  }
}

export function validateExtractions(dataset: Dataset, extractions: Extraction[]): void {
  const seen = new Set<string>();
  const extractionIds = new Set<string>();
  for (const extraction of extractions) {
    const item = dataset.content.find(c => c.id === extraction.content_item_id);
    requireCondition(item && isAnalyzable(item) && !seen.has(item.id), "unknown, unavailable or duplicate extraction content");
    seen.add(item.id);
    requireCondition(!extractionIds.has(extraction.id), "duplicate extraction ID");
    extractionIds.add(extraction.id);
    requireCondition(extraction.id.startsWith("extraction:") && extraction.id.length > 11
      && extraction.provider.trim() && extraction.version.trim(), "missing extraction provenance or invalid claim namespace");
    requireCondition(Object.keys(extraction.fields).length === extractionFields.length
      && extractionFields.every(field => Object.hasOwn(extraction.fields, field) && extraction.fields[field] !== undefined), "incomplete extraction schema");
    const deterministic = new DeterministicExtractor().extract(item);
    if (extraction.provider === deterministic.provider) {
      requireCondition(extraction.version === deterministic.version
        && JSON.stringify(extraction.fields) === JSON.stringify(deterministic.fields)
        && JSON.stringify(extraction.sequence) === JSON.stringify(deterministic.sequence), "deterministic claim or sequence does not match source text");
    }
    for (const [field, observation] of Object.entries(extraction.fields)) {
      if (observation === null) continue;
      requireCondition(observation.value?.trim() && observation.rule_id?.trim()
        && ["deterministic_interpretation", "ai_interpretation", "reviewed_annotation"].includes(observation.basis), "missing observation provenance or interpretation state");
      if (observation.basis === "deterministic_interpretation") {
        const expected = deterministic.fields[field as keyof Extraction["fields"]];
        requireCondition(JSON.stringify(observation) === JSON.stringify(expected), "deterministic claim is not supported by its rule and source text");
      }
    }
    const spans = [
      ...Object.values(extraction.fields).flatMap(field => field ? [field.evidence] : []),
      ...Object.values(extraction.sequence.stages).filter(span => span !== null),
    ];
    for (const span of spans) {
      requireCondition(item.verified && ["retrieved", "partial"].includes(item.retrieval_status), "extraction from unverified/unavailable content");
      requireCondition(span.content_item_id === item.id && span.source_url === item.source_url
        && span.retrieved_from_url === item.retrieved_from_url, "source mismatch");
      requireCondition(Number.isInteger(span.start) && Number.isInteger(span.end) && span.start >= 0
        && span.end > span.start && span.end <= (item.text?.length ?? 0)
        && item.text?.slice(span.start, span.end) === span.quote, "evidence quote/offset mismatch");
      requireCondition(isVerifiedQuote(span, dataset.captures.find(c => c.id === item.source_capture_id)), "quote does not match retrieved source capture");
    }
    requireCondition(Object.keys(extraction.sequence.stages).length === 6
      && ["hook", "context", "claim", "proof", "product", "CTA"].every(stage => Object.hasOwn(extraction.sequence.stages, stage)), "incomplete sequence schema");
    const order = Object.entries(extraction.sequence.stages).filter(([, span]) => span !== null)
      .sort((a, b) => a[1]!.start - b[1]!.start || a[0].localeCompare(b[0])).map(([stage]) => stage);
    requireCondition(JSON.stringify(order) === JSON.stringify(extraction.sequence.observed_order), "sequence order does not match source offsets");
  }
  requireCondition(seen.size === dataset.content.filter(isAnalyzable).length, "missing extraction for analyzable content");
}
