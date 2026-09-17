import type { Dataset, Evidence, EvidenceGraph, Extraction, LaunchMechanics, Pattern, Signal } from "../types";
import { canonicalizeSourceUrl } from "../source-identity";

export function buildEvidenceGraph(dataset: Dataset, extractions: Extraction[], mechanics: LaunchMechanics[], patterns: Pattern[], evidence: Evidence[], signals: Signal[]): EvidenceGraph {
  const nodes = new Map<string, EvidenceGraph["nodes"][number]>();
  const edges: EvidenceGraph["edges"] = [];
  const add = (node: EvidenceGraph["nodes"][number]) => nodes.set(node.id, node);
  const link = (from: string, to: string, relation: string) => edges.push({ from, to, relation });
  const source = (url: string) => {
    const id = `source:${canonicalizeSourceUrl(url)}`;
    add({ id, type: "source", label: url, source_url: url });
    return id;
  };
  for (const campaign of dataset.campaigns) {
    add({ id: `campaign:${campaign.id}`, type: "campaign", label: campaign.company });
    if (campaign.provenance.source_url) link(`campaign:${campaign.id}`, source(campaign.provenance.source_url), "documented_by");
  }
  for (const item of dataset.content) {
    if (item.platform) add({ id: `platform:${item.platform.toLowerCase()}`, type: "platform", label: item.platform });
    add({ id: `content:${item.id}`, type: "content", label: `${item.platform ?? item.type} · ${item.id}` });
    link(`campaign:${item.campaign_id}`, `content:${item.id}`, "contains");
    link(`content:${item.id}`, source(item.source_url), "published_at");
    if (item.retrieved_from_url !== item.source_url) link(`content:${item.id}`, source(item.retrieved_from_url), "verified_via");
    if (item.platform) link(`content:${item.id}`, `platform:${item.platform.toLowerCase()}`, "published_on");
  }
  for (const response of dataset.responses ?? []) {
    add({ id: response.id, type: "response", label: `${response.platform} · ${response.verification_state.replaceAll("_", " ")}` });
    link(`content:${response.content_item_id}`, response.id, "public_response");
    link(response.id, source(response.source_url), "observed_at_source");
    for (const metric of response.metrics) {
      const id = `metric:${response.id}:${metric.type}`;
      add({ id, type: "metric", label: `${metric.type} · ${metric.display_value}` });
      link(response.id, id, "reports_metric");
      link(id, source(response.source_url), "verified_by");
    }
  }
  for (const item of mechanics) {
    add({ id: `mechanics:${item.event_id}`, type: "mechanics", label: `Mechanics · ${item.event_id}` });
    link(`event:${item.event_id}`, `mechanics:${item.event_id}`, "analyzed_as");
    for (const content of item.content) link(`mechanics:${item.event_id}`, `content:${content.content_item_id}`, "relates_content");
  }
  for (const event of dataset.events) {
    add({ id: `event:${event.id}`, type: "event", label: event.id });
    for (const campaign of event.campaign_ids) link(`campaign:${campaign}`, `event:${event.id}`, "launch_event");
    for (const item of dataset.content.filter(item => item.launch_event_id === event.id)) link(`event:${event.id}`, `content:${item.id}`, "platform_version");
  }
  for (const extraction of extractions) {
    add({ id: extraction.id, type: "extraction", label: `${extraction.provider} · ${extraction.content_item_id}` });
    link(`content:${extraction.content_item_id}`, extraction.id, "interpreted_as");
  }
  for (const pattern of patterns) add({ id: `pattern:${pattern.id}`, type: "pattern", label: pattern.title });
  for (const pattern of patterns) for (const event of pattern.supporting_events) link(`mechanics:${event}`, `pattern:${pattern.id}`, "supports_pattern");
  for (const signal of signals) {
    add({ id: signal.id, type: "signal", label: signal.thesis });
    link(signal.id, `pattern:${signal.pattern_id}`, "derived_from");
  }
  for (const pattern of patterns) {
    for (const counterexample of pattern.counterexamples) {
      for (const id of counterexample.content_item_ids) {
        link(`pattern:${pattern.id}`, `content:${id}`, counterexample.kind === "contradicts" ? "contrary_wording_in" : "not_observed_in");
      }
    }
  }
  for (const item of evidence) {
    add({ id: item.id, type: "evidence", label: item.observation });
    link(item.extraction_id, `pattern:${item.pattern_id}`, "supports");
    link(`pattern:${item.pattern_id}`, item.id, "cites");
    link(item.id, source(item.span.source_url), "original_source");
    link(item.id, source(item.span.retrieved_from_url), "verified_via");
    link(item.id, `content:${item.content_item_id}`, "claim_in_content");
    link(`content:${item.content_item_id}`, `campaign:${item.campaign_id}`, "belongs_to_campaign");
  }
  const uniqueEdges = [...new Map(edges.map(edge => [JSON.stringify(edge), edge])).values()];
  for (const edge of uniqueEdges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) throw new Error("Dangling evidence graph edge");
  }
  return { nodes: [...nodes.values()], edges: uniqueEdges };
}
