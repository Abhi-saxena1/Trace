import type {
  ContentItem,
  Dataset,
  Extraction,
  LaunchMechanics,
  PublicationEvidence,
  PublicationPrecision,
  SequenceAnalysis,
  SourceSpan,
} from "../types";

const timePrecisionRank: Record<PublicationPrecision, number> = {
  exact: 0,
  minute: 1,
  hour: 2,
  day: 3,
  unknown: 4,
};

function usable(publication: PublicationEvidence): publication is PublicationEvidence & { published_at: string } {
  return publication.verification_status === "verified"
    && publication.precision !== "unknown"
    && publication.published_at !== null;
}

function lessPrecise(a: PublicationPrecision, b: PublicationPrecision): PublicationPrecision {
  return timePrecisionRank[a] >= timePrecisionRank[b] ? a : b;
}

function platformMissing(items: ContentItem[], platform: "X" | "LinkedIn"): string {
  const item = items.find(candidate => candidate.platform === platform);
  return item
    ? `Missing verified publication date for ${platform}.`
    : `No retained ${platform} content item supplies publication timestamp evidence.`;
}

export function analyzePlatformSequence(items: ContentItem[]): SequenceAnalysis {
  const x = items.find(item => item.platform === "X");
  const linkedin = items.find(item => item.platform === "LinkedIn");
  const xUsable = x && usable(x.publication);
  const linkedinUsable = linkedin && usable(linkedin.publication);

  if (!xUsable || !linkedinUsable) {
    const missing = [
      !xUsable ? platformMissing(items, "X") : null,
      !linkedinUsable ? platformMissing(items, "LinkedIn") : null,
    ].filter((reason): reason is string => Boolean(reason));
    return {
      status: "insufficient",
      order: "unknown",
      precision: "unknown",
      delta_minutes: null,
      explanation: missing.length === 2
        ? "Insufficient verified publication timestamp evidence for X and LinkedIn."
        : missing[0],
    };
  }

  const xValue = x.publication.published_at!;
  const linkedinValue = linkedin.publication.published_at!;
  const xDay = x.publication.precision === "day" ? xValue : new Date(xValue).toISOString().slice(0, 10);
  const linkedinDay = linkedin.publication.precision === "day" ? linkedinValue : new Date(linkedinValue).toISOString().slice(0, 10);
  const includesDayPrecision = x.publication.precision === "day" || linkedin.publication.precision === "day";

  if (includesDayPrecision) {
    if (xDay === linkedinDay) return {
      status: "same_day_unresolved",
      order: "same_day",
      precision: "day",
      delta_minutes: null,
      explanation: "Both verified publication values fall on the same calendar day; date-only evidence cannot establish order or elapsed time.",
    };
    return {
      status: "resolved",
      order: xDay < linkedinDay ? "x_first" : "linkedin_first",
      precision: "day",
      delta_minutes: null,
      explanation: "The verified publication dates establish day-level order; exact elapsed time is not calculated from date-only evidence.",
    };
  }

  const xTime = Date.parse(xValue);
  const linkedinTime = Date.parse(linkedinValue);
  const precision = lessPrecise(x.publication.precision, linkedin.publication.precision);
  if (xTime === linkedinTime) return {
    status: "same_day_unresolved",
    order: "same_day",
    precision,
    delta_minutes: null,
    explanation: "The verified publication values resolve to the same available time unit, so platform order is unresolved.",
  };

  const deltaMinutes = precision === "exact" ? Math.abs(linkedinTime - xTime) / 60_000 : null;
  return {
    status: "resolved",
    order: xTime < linkedinTime ? "x_first" : "linkedin_first",
    precision,
    delta_minutes: deltaMinutes,
    explanation: deltaMinutes === null
      ? `The verified publication values establish ${precision}-level order; exact elapsed time requires exact timestamps for both platforms.`
      : "Verified UTC publication instants establish platform order and elapsed time.",
  };
}

function leadEvidence(extraction: Extraction): SourceSpan | null {
  return extraction.fields.proof_type?.evidence ?? extraction.fields.hook?.evidence ?? extraction.fields.positioning?.evidence ?? null;
}

/** Normalizes only mechanics that can be reproduced from publication evidence and cited extractions. */
export function detectLaunchMechanics(dataset: Dataset, extractions: Extraction[]): LaunchMechanics[] {
  return dataset.events.map(event => {
    const items = dataset.content.filter(item => item.launch_event_id === event.id);
    const sequence = analyzePlatformSequence(items);
    const x = items.find(item => item.platform === "X");
    const linkedin = items.find(item => item.platform === "LinkedIn");
    const firstId = sequence.order === "x_first" ? x?.id : sequence.order === "linkedin_first" ? linkedin?.id : null;
    const secondId = sequence.order === "x_first" ? linkedin?.id : sequence.order === "linkedin_first" ? x?.id : null;
    const content = items.map(item => ({
      content_item_id: item.id,
      platform: item.platform,
      publication: item.publication,
      sequence_position: item.id === firstId ? 1 : item.id === secondId ? 2 : null,
      relationship: "same_launch_event" as const,
      source_url: item.source_url,
    }));
    const participation: LaunchMechanics["participation"] = extractions.filter(extraction => items.some(item => item.id === extraction.content_item_id)).flatMap(extraction => {
      const observation = extraction.fields.launch_mechanism;
      if (!observation) return [];
      const mechanism: LaunchMechanics["participation"][number]["mechanism"] | null = observation.rule_id === "comment-for-benefit" ? "comment_to_receive"
        : observation.rule_id === "resource-offer" ? "research_resource"
        : observation.rule_id === "product-challenge" ? "conditional_challenge" : null;
      return mechanism ? [{ content_item_id: extraction.content_item_id, mechanism, evidence: observation.evidence }] : [];
    });
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
      event_id: event.id,
      campaign_ids: event.campaign_ids,
      sequence,
      content,
      participation,
      transformations,
      limitations: [
        sequence.explanation,
        "Transformations describe differences between retained excerpts, not necessarily the full posts or the creator's intent.",
      ],
    };
  });
}
