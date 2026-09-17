import type { ContentItem, Dataset, SourceCapture } from "../lib/research/types";
import { publicationFromSource, unavailablePublication } from "../lib/research/publication";
import capturedText from "./source-captures.json";
import { publicResponseRecords } from "./public-response";

const captures = capturedText as SourceCapture[];

// Reviewed 2026-09-16. Short source excerpts; never generated social post text.
const reviewedAt = "2026-09-16";
const work = (id: string) => `https://www.sociallcapital.com/work/${id}`;
const campaigns = [
  { id: "playerzero", company: "PlayerZero", month: "2026-03", product: "PlayerZero" },
  { id: "wispr-flow", company: "Wispr Flow", month: "2026-02", product: "Wispr Flow" },
  { id: "poly-ai", company: "Poly AI", month: "2026-02", product: null },
  { id: "airwallex", company: "Airwallex", month: "2025-12", product: null },
  { id: "gamma", company: "Gamma", month: "2025-11", product: "Gamma" },
  { id: "cartesia", company: "Cartesia", month: "2025-10", product: "Sonic-3" },
  { id: "deel", company: "Deel", month: "2025-10", product: null },
  { id: "superblocks", company: "Superblocks", month: "2025-05", product: "Clark" },
  { id: "icon", company: "Icon", month: "2025-02", product: "Icon" },
];

interface ReviewedPost {
  campaign: string;
  platform: "X" | "LinkedIn";
  url: string;
  author: string;
  handle: string | null;
  date: string | null;
  beginning?: boolean;
  section?: "post" | "video_transcript";
  note?: string;
}

const posts: ReviewedPost[] = [
  {
    campaign: "playerzero", platform: "X", author: "Animesh Koratana", handle: "@akoratana", date: "2026-03-23",
    url: "https://x.com/akoratana/status/2036111467016319074",
    beginning: true,
  },
  {
    campaign: "wispr-flow", platform: "X", author: "Tanay Kothari", handle: "@tankots", date: "2026-02-23",
    url: "https://x.com/tankots/status/2025981424470479008",
    beginning: true,
  },
  {
    campaign: "poly-ai", platform: "X", author: "PolyAI", handle: "@polyaivoice", date: "2026-02-17",
    url: "https://x.com/polyaivoice/status/2023789465509015972",
    beginning: true,
  },
  {
    campaign: "airwallex", platform: "X", author: "Jack Zhang", handle: "@awxjack", date: "2025-12-08",
    url: "https://x.com/awxjack/status/1998015620072587516",
  },
  {
    campaign: "gamma", platform: "X", author: "Grant Lee", handle: "@thisisgrantlee", date: "2025-11-10",
    url: "https://x.com/thisisgrantlee/status/1987880600661889356",
  },
  {
    campaign: "cartesia", platform: "X", author: "Karan Goel", handle: "@krandiash", date: "2025-10-28",
    url: "https://x.com/krandiash/status/1983202316397453676",
    beginning: true,
  },
  {
    campaign: "deel", platform: "X", author: "Alex Bouaziz", handle: "@Bouazizalex", date: "2025-10-16",
    url: "https://x.com/Bouazizalex/status/1978809723727012176",
  },
  {
    campaign: "superblocks", platform: "X", author: "Brad Menezes", handle: "@bradmenezes", date: "2025-05-27",
    url: "https://x.com/bradmenezes/status/1927414638632735069",
    beginning: true,
  },
  {
    campaign: "icon", platform: "X", author: "Kennan Frost", handle: "@kennandavison", date: "2025-02-04",
    url: "https://x.com/kennandavison/status/1886836061378372064",
    beginning: true,
    note: "The campaign's LinkedIn preview uses Kennan Davison; the current embed displays Kennan Frost. Handle preserved as displayed.",
  },
  {
    campaign: "wispr-flow", platform: "LinkedIn", author: "Tanay Kothari", handle: null, date: null,
    url: "https://www.linkedin.com/posts/tankots_we-offered-5-people-a-porsche-911-gt3-rs-activity-7431748842519318528-RY-e",
  },
  {
    campaign: "airwallex", platform: "LinkedIn", author: "Jack Zhang", handle: null, date: null,
    url: "https://www.linkedin.com/posts/jack-zhang-05200222_stripe-offered-to-acquire-us-for-12-billion-activity-7403782045119967232-9-Ne",
    note: "Post is marked Edited. The campaign link preview says $12 billion while the linked post says $1.2 billion; neither is treated as an independently verified financial fact.",
  },
  {
    campaign: "gamma", platform: "LinkedIn", author: "Grant Lee", handle: null, date: null,
    url: "https://www.linkedin.com/posts/grantslee_today-as-shared-by-the-new-york-times-we-activity-7393646492839763968-Bws-",
  },
  {
    campaign: "cartesia", platform: "LinkedIn", author: "Karan Goel", handle: null, date: null,
    url: "https://www.linkedin.com/posts/krandiash_weve-raised-100m-from-kleiner-perkins-activity-7388968595499728896-0UJn",
  },
  {
    campaign: "deel", platform: "LinkedIn", author: "Alex Bouaziz", handle: null, date: null,
    url: "https://www.linkedin.com/posts/alexbouaziz_deel-has-raised-300m-at-a-173b-valuation-activity-7384573205698568193-FtqD",
    note: "The linked post is marked Edited. Only the inspected excerpt is retained; historical versions are not available.",
  },
  {
    campaign: "icon", platform: "LinkedIn", author: "Kennan Frost", handle: null, date: null,
    url: "https://www.linkedin.com/posts/kennandavison_introducing-icon-the-worlds-first-ai-admaker-activity-7292601719627079680-39q7",
    section: "video_transcript",
    note: "Current post caption is edited and differs from the campaign preview. This excerpt is from the public video transcript, not the caption. Transcript accuracy and original visuals have not been independently assessed.",
  },
];

const content: ContentItem[] = [
  ...campaigns.map((campaign): ContentItem => ({
    id: `${campaign.id}-page`, campaign_id: campaign.id, type: "campaign_page", platform: "Web",
    source_url: work(campaign.id), retrieved_from_url: work(campaign.id), author: "Social Capital Inc.", author_handle: null,
    text: null, publication: unavailablePublication(work(campaign.id), "Campaign portfolio pages do not establish a social-post publication timestamp."), metrics: null, media: null, verified: true,
    retrieval_status: "retrieved", retrieved_at: reviewedAt, text_scope: "unavailable",
    text_starts_at_beginning: false, source_section: "metadata",
    source_capture_id: null, launch_event_id: null,
    verification_note: "Campaign title and month verified on the supplied portfolio page. This record documents portfolio membership; embedded social text is stored only in its own record, to avoid double counting.",
  })),
  ...posts.map((post): ContentItem => ({
    id: `${post.campaign}-${post.platform.toLowerCase()}`, campaign_id: post.campaign,
    type: "social_post", platform: post.platform, source_url: post.url,
    retrieved_from_url: post.platform === "X" ? work(post.campaign) : post.url,
    author: post.author, author_handle: post.handle,
    text: captures.find(c => c.content_item_id === `${post.campaign}-${post.platform.toLowerCase()}`)?.text ?? null,
    source_capture_id: captures.find(c => c.content_item_id === `${post.campaign}-${post.platform.toLowerCase()}`)?.id ?? null,
    launch_event_id: `${post.campaign}-launch`, publication: publicationFromSource(post.platform, post.url, post.date),
    metrics: null, media: null, verified: true, retrieval_status: "partial",
    retrieved_at: captures.find(c => c.content_item_id === `${post.campaign}-${post.platform.toLowerCase()}`)?.retrieved_at ?? reviewedAt,
    text_scope: captures.some(c => c.content_item_id === `${post.campaign}-${post.platform.toLowerCase()}`) ? "excerpt" : "unavailable",
    text_starts_at_beginning: post.beginning ?? false, source_section: post.section ?? "post",
    verification_note: [
      post.platform === "X"
        ? "Source identity and displayed publication day were identified in the campaign page's X embed. The canonical status identifier supplies the retained UTC creation instant."
        : "Public LinkedIn source inspected. The canonical activity identifier supplies the retained UTC creation instant; the visible relative date is not converted or used as a fallback.",
      "Source identity is verified separately from exact quote availability. Quotations require a retained contiguous source-text capture. Public-response values, when available, are stored separately as dated snapshots.",
      post.campaign === "wispr-flow" && post.platform === "X" ? "Exact contiguous text could not be recovered across the embedded mention in this retrieval. The earlier normalized excerpt is withheld from quotes and analysis." : "Exact excerpt rechecked against the retrieved public-page text on 2026-09-17; original whitespace is preserved.",
      post.note,
    ].filter(Boolean).join(" "),
  })),
];

export const verifiedDataset: Dataset = {
  captures,
  responses: publicResponseRecords,
  events: campaigns.map(campaign => ({
    id: `${campaign.id}-launch`, campaign_ids: [campaign.id], grouping_basis: "conservative_campaign",
    rationale: "All social material linked by this portfolio entry is conservatively treated as one launch event. Platform versions are not assumed independent.",
    source_urls: [work(campaign.id)],
  })),
  campaigns: campaigns.map(campaign => ({
    id: campaign.id, company: campaign.company, product: campaign.product,
    launch_date: campaign.month, date_precision: "month", campaign_url: work(campaign.id),
    description: null, category: null,
    content_item_ids: content.filter(item => item.campaign_id === campaign.id).map(item => item.id),
    provenance: {
      status: "source_verified", source_url: work(campaign.id),
      note: "Portfolio title and campaign month verified on the supplied page. Month is a portfolio label, not an inferred day-level product release date. Product name, where available, is stated in the linked launch material.",
    },
  })),
  content,
};
