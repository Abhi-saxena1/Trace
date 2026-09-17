import type { Dataset, Extraction, LaunchMechanics, PlatformSequence, SourceSpan } from "../types";

function timestampPrecision(value: string | null): "instant" | "day" | "unavailable" {
  if (!value) return "unavailable";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? "day" : "instant";
}

function sequence(items: { platform: string | null; published_at: string | null }[]): PlatformSequence {
  const x = items.find(item => item.platform === "X");
  const linkedin = items.find(item => item.platform === "LinkedIn");
  if (!x?.published_at || !linkedin?.published_at || timestampPrecision(x.published_at) !== "instant" || timestampPrecision(linkedin.published_at) !== "instant") return "unknown";
  const delta = Date.parse(linkedin.published_at) - Date.parse(x.published_at);
  if (Math.abs(delta) <= 15 * 60_000) return "same_window";
  return delta > 0 ? "x_first" : "linkedin_first";
}

function leadEvidence(extraction: Extraction): SourceSpan | null {
  return extraction.fields.proof_type?.evidence ?? extraction.fields.hook?.evidence ?? extraction.fields.positioning?.evidence ?? null;
}

/** Normalizes only mechanics that can be reproduced from timestamps and cited extractions. */
export function detectLaunchMechanics(dataset: Dataset, extractions: Extraction[]): LaunchMechanics[] {
  return dataset.events.map(event => {
    const items = dataset.content.filter(item => item.launch_event_id === event.id);
    const platformSequence = sequence(items);
    const precise = items.filter(item => timestampPrecision(item.published_at) === "instant")
      .sort((a, b) => Date.parse(a.published_at!) - Date.parse(b.published_at!));
    const firstTime = precise[0]?.published_at ? Date.parse(precise[0].published_at) : null;
    const content = items.map(item => {
      const precision = timestampPrecision(item.published_at);
      const preciseIndex = precise.findIndex(candidate => candidate.id === item.id);
      return {
        content_item_id: item.id, platform: item.platform, timestamp: item.published_at,
        timestamp_precision: precision,
        sequence_position: precision === "instant" && precise.length === items.length ? preciseIndex + 1 : null,
        relationship: "same_launch_event" as const,
        time_delta_minutes: precision === "instant" && firstTime !== null ? (Date.parse(item.published_at!) - firstTime) / 60_000 : null,
        source_url: item.source_url,
      };
    });
    const participation: LaunchMechanics["participation"] = extractions.filter(extraction => items.some(item => item.id === extraction.content_item_id)).flatMap(extraction => {
      const observation = extraction.fields.launch_mechanism;
      if (!observation) return [];
      const mechanism: LaunchMechanics["participation"][number]["mechanism"] | null = observation.rule_id === "comment-for-benefit" ? "comment_to_receive"
        : observation.rule_id === "resource-offer" ? "research_resource"
        : observation.rule_id === "product-challenge" ? "conditional_challenge" : null;
      return mechanism ? [{ content_item_id: extraction.content_item_id, mechanism, evidence: observation.evidence }] : [];
    });
    const x = items.find(item => item.platform === "X");
    const linkedin = items.find(item => item.platform === "LinkedIn");
    const xExtraction = extractions.find(extraction => extraction.content_item_id === x?.id);
    const linkedinExtraction = extractions.find(extraction => extraction.content_item_id === linkedin?.id);
    const transformations: LaunchMechanics["transformations"] = [];
    const xLead = xExtraction && leadEvidence(xExtraction);
    const linkedinParticipation = linkedinExtraction?.fields.launch_mechanism?.evidence;
    if (x && linkedin && xLead && linkedinParticipation) transformations.push({
      from_content_id: x.id, to_content_id: linkedin.id, kind: "credibility_to_participation",
      description: "The retained X excerpt foregrounds product introduction or credibility while the retained LinkedIn excerpt contains a resource or participation mechanism.",
      evidence: [xLead, linkedinParticipation],
    });
    const xNarrative = xExtraction?.fields.narrative_structure;
    const linkedinNarrative = linkedinExtraction?.fields.narrative_structure;
    if (x && linkedin && xNarrative?.rule_id === "untold-story" && linkedinNarrative?.rule_id === "untold-story") transformations.push({
      from_content_id: x.id, to_content_id: linkedin.id, kind: "narrative_continuity",
      description: "The same extracted personal-story frame appears in retained excerpts on both platforms.",
      evidence: [xNarrative.evidence, linkedinNarrative.evidence],
    });
    return {
      event_id: event.id, campaign_ids: event.campaign_ids,
      platform_sequence: platformSequence,
      sequence_basis: platformSequence === "unknown" ? "insufficient_timestamps" : "verified_timestamps",
      content, participation, transformations,
      limitations: [
        "Date-only values do not establish post order or elapsed time; sequence requires precise timestamps for both platforms.",
        "Transformations describe differences between retained excerpts, not necessarily the full posts or the creator's intent.",
      ],
    };
  });
}
