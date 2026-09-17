import type { PublicationEvidence } from "./types";

const X_EPOCH_MS = BigInt("1288834974657");

function decodedInstant(platform: string | null, sourceUrl: string): string | null {
  const match = platform === "X"
    ? sourceUrl.match(/^https:\/\/(?:www\.)?x\.com\/[^/]+\/status\/(\d+)(?:[/?#]|$)/i)
    : platform === "LinkedIn"
      ? sourceUrl.match(/^https:\/\/(?:www\.)?linkedin\.com\/posts\/[^?#]*activity-(\d+)(?:-|[/?#]|$)/i)
      : null;
  if (!match) return null;

  try {
    const sourceId = BigInt(match[1]);
    const milliseconds = (sourceId >> BigInt(22)) + (platform === "X" ? X_EPOCH_MS : BigInt(0));
    const value = Number(milliseconds);
    if (!Number.isSafeInteger(value)) return null;
    const instant = new Date(value);
    return Number.isFinite(instant.getTime()) ? instant.toISOString() : null;
  } catch {
    return null;
  }
}

/**
 * Reads time metadata only from canonical public post identifiers. It never falls
 * back to campaign dates, array order, retrieval time, or the current clock.
 */
export function publicationFromSource(
  platform: string | null,
  sourceUrl: string,
  displayedDay: string | null = null,
): PublicationEvidence {
  const instant = decodedInstant(platform, sourceUrl);
  if (instant && (!displayedDay || instant.slice(0, 10) === displayedDay)) {
    return {
      published_at: instant,
      precision: "exact",
      source_url: sourceUrl,
      verification_status: "verified",
      evidence: platform === "X"
        ? `UTC creation instant decoded from the canonical X status identifier; its UTC day matches the source-displayed ${displayedDay ?? instant.slice(0, 10)} date.`
        : "UTC creation instant decoded from the canonical LinkedIn activity identifier in this public source URL.",
    };
  }
  if (displayedDay && /^\d{4}-\d{2}-\d{2}$/.test(displayedDay)) {
    return {
      published_at: displayedDay,
      precision: "day",
      source_url: sourceUrl,
      verification_status: "verified",
      evidence: `Calendar date displayed by the public source (${displayedDay}); no supported time-level metadata was retained.`,
    };
  }
  return unavailablePublication(sourceUrl, "The retained public source does not provide supported publication timestamp metadata.");
}

export function unavailablePublication(sourceUrl: string, reason: string): PublicationEvidence {
  return {
    published_at: null,
    precision: "unknown",
    source_url: sourceUrl,
    verification_status: "unavailable",
    evidence: reason,
  };
}
