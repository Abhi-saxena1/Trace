import type { PublicResponseMetric, PublicResponseRecord } from "../lib/research/types";

const observedAt = "2026-09-17";
const exact = (type: PublicResponseMetric["type"], value: number): PublicResponseMetric => ({
  type, display_value: value.toLocaleString("en-US"), numeric_value: value, precision: "exact",
});
const abbreviated = (type: PublicResponseMetric["type"], value: string): PublicResponseMetric => ({
  type, display_value: value, numeric_value: null, precision: "abbreviated",
});

const xSources = {
  "playerzero-x": ["playerzero", "https://x.com/akoratana/status/2036111467016319074", "2.7M", "866", "738", "5.1K", "4.9K"],
  "wispr-flow-x": ["wispr-flow", "https://x.com/tankots/status/2025981424470479008", "4.4M", "4.4K", "2.8K", "10K", "3.1K"],
  "poly-ai-x": ["poly-ai", "https://x.com/polyaivoice/status/2023789465509015972", "3.5M", "1.4K", "535", "4.7K", "4.3K"],
  "airwallex-x": ["airwallex", "https://x.com/awxjack/status/1998015620072587516", "46.9M", "1.5K", "1.9K", "29K", "9.4K"],
  "gamma-x": ["gamma", "https://x.com/thisisgrantlee/status/1987880600661889356", "4.4M", "403", "306", "2.7K", "1.8K"],
  "cartesia-x": ["cartesia", "https://x.com/krandiash/status/1983202316397453676", "4.8M", "1.4K", "1.2K", "8.4K", "4.8K"],
  "deel-x": ["deel", "https://x.com/Bouazizalex/status/1978809723727012176", "2.9M", "462", "661", "5.3K", "2.7K"],
  "superblocks-x": ["superblocks", "https://x.com/bradmenezes/status/1927414638632735069", "1.8M", "755", "745", "5.2K", "6.4K"],
  "icon-x": ["icon", "https://x.com/kennandavison/status/1886836061378372064", "2.3M", "1.4K", "1.3K", "8K", "10K"],
} as const;

const parsed = (type: PublicResponseMetric["type"], value: string) => /^[\d,]+$/.test(value)
  ? exact(type, Number(value.replaceAll(",", ""))) : abbreviated(type, value);

const xResponses: PublicResponseRecord[] = Object.entries(xSources).map(([contentId, values]) => {
  const [campaign, source, views, replies, reposts, likes, bookmarks] = values;
  return {
    id: `response:${contentId}:${observedAt}`, campaign_id: campaign, launch_event_id: `${campaign}-launch`,
    content_item_id: contentId, platform: "X", source_url: source, observed_at: observedAt,
    verification_state: "verified_source_data", snapshot_state: "observed_snapshot",
    metrics: [parsed("views", views), parsed("replies", replies), parsed("reposts", reposts), parsed("likes", likes), parsed("bookmarks", bookmarks)],
    note: "Current public X counters observed on the exact post. Abbreviated values are stored exactly as displayed and are not expanded into estimated integers.",
  };
});

const linkedIn = [
  ["wispr-flow", "https://www.linkedin.com/posts/tankots_we-offered-5-people-a-porsche-911-gt3-rs-activity-7431748842519318528-RY-e", 1636],
  ["airwallex", "https://www.linkedin.com/posts/jack-zhang-05200222_stripe-offered-to-acquire-us-for-12-billion-activity-7403782045119967232-9-Ne", 1452],
  ["cartesia", "https://www.linkedin.com/posts/krandiash_weve-raised-100m-from-kleiner-perkins-activity-7388968595499728896-0UJn", 3624],
  ["icon", "https://www.linkedin.com/posts/kennandavison_introducing-icon-the-worlds-first-ai-admaker-activity-7292601719627079680-39q7", 9578],
] as const;

const linkedInResponses: PublicResponseRecord[] = linkedIn.map(([campaign, source, comments]) => ({
  id: `response:${campaign}-linkedin:${observedAt}`, campaign_id: campaign, launch_event_id: `${campaign}-launch`,
  content_item_id: `${campaign}-linkedin`, platform: "LinkedIn", source_url: source, observed_at: observedAt,
  verification_state: "verified_source_data", snapshot_state: "observed_snapshot", metrics: [exact("comments", comments)],
  note: "Current public comment total observed in the exact LinkedIn post document title. This is a retrieval-time snapshot, not a launch-day value.",
}));

const unavailable: PublicResponseRecord[] = [
  ["gamma", "https://www.linkedin.com/posts/grantslee_today-as-shared-by-the-new-york-times-we-activity-7393646492839763968-Bws-"],
  ["deel", "https://www.linkedin.com/posts/alexbouaziz_deel-has-raised-300m-at-a-173b-valuation-activity-7384573205698568193-FtqD"],
].map(([campaign, source]) => ({
  id: `response:${campaign}-linkedin:unavailable`, campaign_id: campaign, launch_event_id: `${campaign}-launch`,
  content_item_id: `${campaign}-linkedin`, platform: "LinkedIn", source_url: source, observed_at: observedAt,
  verification_state: "not_publicly_available", snapshot_state: null, metrics: [],
  note: "The reviewed public page did not expose a post-level response total in the accessible document surface. No value is inferred from visible individual comments.",
}));

export const publicResponseRecords = [...xResponses, ...linkedInResponses, ...unavailable];
