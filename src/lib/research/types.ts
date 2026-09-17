export type Confidence = "weak" | "candidate" | "supported";
export type RetrievalStatus = "retrieved" | "partial" | "unavailable" | "not_retrieved";
export type ExtractionField =
  | "hook" | "core_claim" | "narrative_structure" | "audience"
  | "positioning" | "proof_type" | "CTA" | "emotional_trigger"
  | "visual_strategy" | "creator_role" | "product_mechanism" | "launch_mechanism";

export interface Campaign {
  id: string;
  company: string;
  product: string | null;
  launch_date: string | null;
  date_precision: "month" | "day" | null;
  campaign_url: string | null;
  description: string | null;
  category: string | null;
  content_item_ids: string[];
  provenance: { status: "specification_only" | "source_verified"; source_url: string | null; note: string };
}

export interface Metrics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  observed_at: string;
  source_url: string;
  verified: true;
}

export type PublicResponseMetricType = "views" | "likes" | "replies" | "reposts" | "bookmarks" | "comments" | "reactions" | "shares" | "saves";
export interface PublicResponseMetric {
  type: PublicResponseMetricType;
  display_value: string;
  numeric_value: number | null;
  precision: "exact" | "abbreviated";
}

export interface PublicResponseRecord {
  id: string;
  campaign_id: string;
  launch_event_id: string;
  content_item_id: string;
  platform: string;
  source_url: string;
  observed_at: string | null;
  verification_state: "verified_source_data" | "unverified" | "not_retrieved" | "not_publicly_available";
  snapshot_state: "observed_snapshot" | null;
  metrics: PublicResponseMetric[];
  note: string;
}

export type PublicationPrecision = "exact" | "minute" | "hour" | "day" | "unknown";
export type PublicationVerificationStatus = "verified" | "unverified" | "unavailable";

export interface PublicationEvidence {
  published_at: string | null;
  precision: PublicationPrecision;
  source_url: string;
  verification_status: PublicationVerificationStatus;
  evidence: string | null;
}

export interface ContentItem {
  id: string;
  campaign_id: string;
  type: "campaign_page" | "social_post" | "video" | "article" | "other";
  platform: string | null;
  source_url: string;
  author: string | null;
  author_handle: string | null;
  text: string | null;
  publication: PublicationEvidence;
  metrics: Metrics | null;
  media: { url: string; type: "image" | "video" | "audio"; description: string | null }[] | null;
  verified: boolean;
  retrieval_status: RetrievalStatus;
  retrieved_at: string | null;
  text_scope: "complete" | "excerpt" | "unavailable";
  verification_note: string | null;
  retrieved_from_url: string;
  text_starts_at_beginning: boolean;
  source_section: "metadata" | "post" | "video_transcript";
  source_capture_id: string | null;
  launch_event_id: string | null;
}

export interface SourceCapture {
  id: string;
  content_item_id: string;
  source_url: string;
  retrieved_from_url: string;
  retrieved_at: string;
  text: string;
  scope: "excerpt" | "complete";
  representation: "public-page-text";
  method: string;
  sha256: string;
}

export interface LaunchEvent {
  id: string;
  campaign_ids: string[];
  grouping_basis: "conservative_campaign" | "reviewed_equivalence";
  rationale: string;
  source_urls: string[];
}

export type PlatformSequence = "x_first" | "linkedin_first" | "same_day" | "unknown";
export interface SequenceAnalysis {
  status: "resolved" | "same_day_unresolved" | "insufficient";
  order: PlatformSequence;
  precision: PublicationPrecision;
  delta_minutes: number | null;
  explanation: string;
}

export interface LaunchMechanics {
  event_id: string;
  campaign_ids: string[];
  sequence: SequenceAnalysis;
  content: {
    content_item_id: string;
    platform: string | null;
    publication: PublicationEvidence;
    sequence_position: number | null;
    relationship: "same_launch_event";
    source_url: string;
  }[];
  participation: {
    content_item_id: string;
    mechanism: "comment_to_receive" | "research_resource" | "conditional_challenge";
    evidence: SourceSpan;
  }[];
  transformations: {
    from_content_id: string;
    to_content_id: string;
    kind: "credibility_to_participation" | "narrative_continuity";
    description: string;
    evidence: SourceSpan[];
  }[];
  limitations: string[];
}

export interface Dataset { campaigns: Campaign[]; content: ContentItem[]; captures: SourceCapture[]; events: LaunchEvent[]; responses?: PublicResponseRecord[] }

/** Exact offsets refer to the stored source text, never to generated prose. */
export interface SourceSpan {
  capture_id: string;
  content_item_id: string;
  source_url: string;
  quote: string;
  retrieved_from_url: string;
  start: number;
  end: number;
}

export interface Observation {
  value: string;
  rule_id: string;
  basis: "deterministic_interpretation" | "ai_interpretation" | "reviewed_annotation";
  evidence: SourceSpan;
}

export type SequenceStage = "hook" | "context" | "claim" | "proof" | "product" | "CTA";
export interface Sequence {
  stages: Record<SequenceStage, SourceSpan | null>;
  observed_order: SequenceStage[];
  limitation: string;
}

export interface Extraction {
  id: string;
  content_item_id: string;
  provider: string;
  version: string;
  fields: Record<ExtractionField, Observation | null>;
  sequence: Sequence;
  limitations: string[];
}

export interface ExtractionProvider {
  readonly id: string;
  readonly version: string;
  extract(item: ContentItem): Extraction | Promise<Extraction>;
}

export interface Evidence {
  id: string;
  pattern_id: string;
  campaign_id: string;
  launch_event_id: string;
  content_item_id: string;
  extraction_id: string;
  field: ExtractionField;
  observation: string;
  basis: Observation["basis"];
  span: SourceSpan;
}

export interface Coverage {
  campaign_id: string;
  status: "supports" | "not_observed" | "unknown" | "mixed";
  evidence_state: "supported_evidence" | "counterevidence" | "insufficient_evidence" | "mixed";
  supporting_event_ids: string[];
  contradicting_content_ids: string[];
  supporting_content_ids: string[];
  nonmatching_content_ids: string[];
  unknown_content_ids: string[];
  explanation: string;
}

export interface Pattern {
  id: string;
  title: string;
  description: string;
  specificity: "generic" | "structural";
  confidence: Confidence;
  confidence_reason: string;
  supporting_campaigns: string[];
  supporting_content: string[];
  supporting_events: string[];
  analysis_basis: "inferred_analysis";
  evidence_ids: string[];
  coverage: Coverage[];
  counterexamples: { campaign_id: string; content_item_ids: string[]; kind: "not_observed" | "contradicts"; spans: SourceSpan[]; explanation: string }[];
  limitations: string[];
}

export interface Signal {
  analysis_basis: "inferred_analysis";
  id: string;
  pattern_id: string;
  thesis: string;
  why_non_obvious: string;
  supporting_campaigns: string[];
  supporting_evidence: string[];
  counterexamples: Pattern["counterexamples"];
  confidence: Confidence;
  limitations: string[];
}

export interface EvidenceGraph {
  nodes: { id: string; type: "campaign" | "event" | "mechanics" | "platform" | "content" | "response" | "metric" | "extraction" | "pattern" | "evidence" | "signal" | "source"; label: string; source_url?: string }[];
  edges: { from: string; to: string; relation: string }[];
}

export interface ResearchSnapshot {
  dataset: Dataset;
  extractions: Extraction[];
  mechanics: LaunchMechanics[];
  performance: PerformanceAnalysis;
  patterns: Pattern[];
  evidence: Evidence[];
  graph: EvidenceGraph;
  signal_candidates: Signal[];
  signal: Signal | null;
  methodology_version: string;
}

export interface PerformanceAnalysis {
  verified_snapshots: number;
  verified_metrics: number;
  covered_content_items: number;
  total_social_content_items: number;
  covered_campaigns: number;
  total_campaigns: number;
  comparative_state: "sufficient" | "insufficient";
  limitations: string[];
}
