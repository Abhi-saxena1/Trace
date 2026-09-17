import type { Dataset, PerformanceAnalysis, PublicResponseMetricType, PublicResponseRecord } from "../types";

export function calculateEngagementRate(record: PublicResponseRecord, numeratorTypes: PublicResponseMetricType[]): number | null {
  if (record.verification_state !== "verified_source_data" || record.snapshot_state !== "observed_snapshot") return null;
  const denominator = record.metrics.find(metric => metric.type === "views");
  const numerators = numeratorTypes.map(type => record.metrics.find(metric => metric.type === type));
  if (!denominator || denominator.precision !== "exact" || denominator.numeric_value === null || denominator.numeric_value <= 0
    || numerators.some(metric => !metric || metric.precision !== "exact" || metric.numeric_value === null)) return null;
  return numerators.reduce((sum, metric) => sum + metric!.numeric_value!, 0) / denominator.numeric_value;
}

export function analyzePerformance(dataset: Dataset): PerformanceAnalysis {
  const social = dataset.content.filter(item => item.source_section !== "metadata");
  const verified = (dataset.responses ?? []).filter(record => record.verification_state === "verified_source_data");
  return {
    verified_snapshots: verified.length,
    verified_metrics: verified.reduce((sum, record) => sum + record.metrics.length, 0),
    covered_content_items: new Set(verified.map(record => record.content_item_id)).size,
    total_social_content_items: social.length,
    covered_campaigns: new Set(verified.map(record => record.campaign_id)).size,
    total_campaigns: dataset.campaigns.length,
    comparative_state: "insufficient",
    limitations: [
      "X exposes rounded display counters for many values; TRACE preserves those strings and does not convert them to exact integers.",
      "LinkedIn coverage contains comment totals only and is unavailable for two reviewed posts. Raw counts are not compared across platforms.",
      "No exact view denominator is available for engagement-rate calculation. Snapshots were observed after publication and are not launch-day performance.",
      "Public response is observational and cannot establish that a launch mechanic caused engagement.",
    ],
  };
}
