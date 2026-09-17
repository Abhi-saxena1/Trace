import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { seedDataset } from "../src/data/seed";
import { runResearch } from "../src/lib/research/pipeline";
import { DeterministicExtractor } from "../src/lib/research/extraction/deterministic";
import { validateDataset, validateExtractions } from "../src/lib/research/validation";
import { queryDataset, searchSources } from "../src/lib/research/questions";
import type { ContentItem, Dataset, ExtractionProvider } from "../src/lib/research/types";
import { canonicalizeSourceUrl } from "../src/lib/research/source-identity";
import { isVerifiedQuote, contentEvidenceState } from "../src/lib/research/source-text";
import { spanFor } from "../src/lib/research/extraction/deterministic";
import { validateResearch } from "../src/lib/research/findings-validation";
import { presentSignal } from "../src/lib/research/signal/presentation";
import { analyzePerformance, calculateEngagementRate } from "../src/lib/research/performance/analyze";
import { publicationFromSource } from "../src/lib/research/publication";
import type { PublicationPrecision } from "../src/lib/research/types";

function setPublication(item: ContentItem, publishedAt: string | null, precision: PublicationPrecision = publishedAt ? "exact" : "unknown") {
  item.publication = {
    published_at: publishedAt,
    precision,
    source_url: item.source_url,
    verification_status: publishedAt ? "verified" : "unavailable",
    evidence: publishedAt ? "Synthetic verified publication evidence." : "No publication timestamp in the synthetic fixture.",
  };
}

// Synthetic test-only material. Never imported by the app or production seed.
function fixture(texts: string[]): Dataset {
  const campaigns = texts.map((_, i) => ({
    id: `test-${i}`, company: `Synthetic test ${i}`, product: null,
    launch_date: null, date_precision: null, campaign_url: null, description: null, category: null,
    content_item_ids: [`test-post-${i}`],
    provenance: { status: "specification_only" as const, source_url: null, note: "Synthetic test fixture" },
  }));
  const content = texts.map((text, i): ContentItem => ({
    id: `test-post-${i}`, campaign_id: `test-${i}`, type: "social_post", platform: "Test",
    source_url: `https://example.com/synthetic/${i}`, retrieved_from_url: `https://example.com/synthetic/${i}`,
    author: null, author_handle: null, text,
    publication: {
      published_at: null, precision: "unknown", source_url: `https://example.com/synthetic/${i}`,
      verification_status: "unavailable", evidence: "No publication timestamp in the synthetic fixture.",
    },
    metrics: null, media: null,
    verified: true, retrieval_status: "retrieved", retrieved_at: "2026-09-16",
    text_scope: "complete", text_starts_at_beginning: true, source_section: "post",
    verification_note: "Synthetic test fixture only",
    source_capture_id: `capture-test-${i}`, launch_event_id: `event-test-${i}`,
  }));
  return { campaigns, content,
    events: content.map(item => ({ id: item.launch_event_id!, campaign_ids: [item.campaign_id],
      grouping_basis: "conservative_campaign", rationale: "Synthetic test grouping", source_urls: [item.source_url] })),
    captures: content.map(item => ({ id: item.source_capture_id!, content_item_id: item.id,
      source_url: item.source_url, retrieved_from_url: item.retrieved_from_url, retrieved_at: "2026-09-17",
      text: item.text!, scope: "complete", representation: "public-page-text", method: "Synthetic test capture",
      sha256: createHash("sha256").update(item.text!).digest("hex") })),
  };
}

function pairedFixture(pairs: Array<[string, string]>): Dataset {
  const dataset = fixture(pairs.flat());
  for (let pair = 0; pair < pairs.length; pair++) {
    const even = pair * 2;
    const odd = even + 1;
    dataset.content[even].platform = "X";
    dataset.content[odd].platform = "LinkedIn";
    dataset.content[odd].campaign_id = `test-${even}`;
    dataset.content[odd].launch_event_id = `event-test-${even}`;
    dataset.campaigns[even].content_item_ids.push(`test-post-${odd}`);
  }
  dataset.campaigns = dataset.campaigns.filter((_, index) => index % 2 === 0);
  dataset.events = dataset.events.filter((_, index) => index % 2 === 0);
  return dataset;
}

test("reviewed dataset has 9 campaigns, 24 sources, 14 exact captures and one withheld excerpt", async () => {
  validateDataset(seedDataset);
  const result = await runResearch(seedDataset);
  assert.equal(result.dataset.campaigns.length, 9);
  assert.equal(result.dataset.content.length, 24);
  assert.equal(result.extractions.length, 14);
  assert.equal(result.dataset.captures.length, 14);
  assert.equal(result.dataset.content.find(item => item.id === "wispr-flow-x")?.text, null);
  assert.ok(result.dataset.content.every(item => item.metrics === null));
  assert.ok(result.dataset.campaigns.every(c => c.provenance.status === "source_verified" && c.date_precision === "month"));
  assert.ok(result.dataset.content.filter(c => c.platform === "X").every(c => c.source_url !== c.retrieved_from_url));
  assert.ok(result.dataset.content.filter(c => c.platform === "LinkedIn").every(c => c.publication.precision === "exact"));
});

test("current corpus runs extraction and preserves supported Cartesia, Gamma and Icon fields", async () => {
  const result = await runResearch(seedDataset);
  assert.equal(result.extractions.length, 14);

  const cartesiaX = result.extractions.find(item => item.content_item_id === "cartesia-x")!;
  assert.equal(cartesiaX.fields.hook?.value, "Funding announcement opening");
  assert.equal(cartesiaX.fields.core_claim?.value, "Author makes a financial milestone claim");
  assert.equal(cartesiaX.fields.core_claim?.evidence.quote, "raised $100M");
  assert.equal(cartesiaX.fields.narrative_structure, null);
  assert.equal(cartesiaX.fields.audience, null);
  assert.equal(cartesiaX.fields.positioning, null);

  const cartesiaLinkedIn = result.extractions.find(item => item.content_item_id === "cartesia-linkedin")!;
  assert.equal(cartesiaLinkedIn.fields.CTA?.value, "Request to comment");
  assert.equal(cartesiaLinkedIn.fields.launch_mechanism?.value, "Public comment tied to resource or benefit delivery");

  const gammaX = result.extractions.find(item => item.content_item_id === "gamma-x")!;
  assert.equal(gammaX.fields.core_claim?.evidence.quote, "$100M ARR");
  assert.equal(gammaX.fields.proof_type?.value, "Financial milestone used as a credibility cue");

  const iconX = result.extractions.find(item => item.content_item_id === "icon-x")!;
  assert.equal(iconX.fields.hook?.value, "Product introduction opening");
  assert.equal(iconX.fields.core_claim?.value, "Explicit product launch claim");
  assert.equal(iconX.fields.positioning?.value, "First-in-category language");
  assert.equal(iconX.fields.positioning?.evidence.quote, "First AI Admaker");

  assert.equal(result.extractions.find(item => item.content_item_id === "playerzero-x")!.fields.core_claim?.value, "Explicit product capability claim");
  assert.equal(result.extractions.find(item => item.content_item_id === "wispr-flow-linkedin")!.fields.core_claim?.value, "Explicit promotional offer claim");
  assert.equal(result.extractions.find(item => item.content_item_id === "airwallex-x")!.fields.core_claim?.value, "Explicit personal challenge claim");
  assert.equal(result.extractions.find(item => item.content_item_id === "deel-x")!.fields.core_claim?.value, "Explicit personal challenge claim");
  assert.equal(result.extractions.find(item => item.content_item_id === "gamma-linkedin")!.fields.audience?.evidence.quote, "our most successful users");
  assert.ok(result.dataset.campaigns.every(campaign => result.extractions
    .filter(extraction => result.dataset.content.find(item => item.id === extraction.content_item_id)?.campaign_id === campaign.id)
    .some(extraction => Object.values(extraction.fields).some(Boolean))));
});

test("all observations reproduce their exact retained source offsets", async () => {
  const result = await runResearch(seedDataset);
  validateExtractions(seedDataset, result.extractions);
  for (const evidence of result.evidence) {
    const item = seedDataset.content.find(c => c.id === evidence.content_item_id)!;
    assert.equal(item.text!.slice(evidence.span.start, evidence.span.end), evidence.span.quote);
    assert.equal(item.source_url, evidence.span.source_url);
  }
});

test("real signal is generated from recurrence, not metrics or a hardcoded campaign list", async () => {
  const result = await runResearch(seedDataset);
  assert.equal(result.signal?.pattern_id, "credibility-to-participation");
  assert.ok(result.signal);
  assert.deepEqual(result.signal.supporting_campaigns, ["cartesia", "gamma", "icon"]);
  assert.equal(result.signal.confidence, "candidate");
  assert.equal(result.patterns.find(p => p.id === "comment-for-benefit")?.coverage.filter(c => c.status === "unknown").length, 6);
  assert.deepEqual(result.patterns.find(p => p.id === "credibility-to-participation")?.counterexamples.map(c => c.campaign_id), ["airwallex", "deel"]);
  assert.equal(result.patterns.find(p => p.id === "financial-proof")?.confidence, "weak");
});

test("empty input produces no extraction, patterns or signal", async () => {
  const result = await runResearch({ campaigns: [], content: [], captures: [], events: [] });
  assert.deepEqual(result.patterns, []);
  assert.equal(result.signal, null);
  assert.deepEqual(result.graph, { nodes: [], edges: [] });
});

test("unverified and unavailable text is excluded", async () => {
  const dataset = fixture(["Comment TEST and we'll send you a guide.", "Comment TEST and we'll send you a guide."]);
  dataset.content[0].verified = false;
  dataset.content[1].text = null;
  dataset.content[1].text_scope = "unavailable";
  dataset.content[1].retrieval_status = "unavailable";
  dataset.content[1].verified = false;
  dataset.content[1].source_capture_id = null;
  dataset.captures.pop();
  const result = await runResearch(dataset);
  assert.equal(result.extractions.length, 0);
  assert.equal(result.signal, null);
});

test("cross-posts within one campaign do not establish recurrence", async () => {
  const dataset = fixture(["Comment TEST and we'll send you a guide.", "Comment TEST and we'll send you a guide."]);
  dataset.content[1].campaign_id = "test-0";
  dataset.content[1].launch_event_id = "event-test-0";
  dataset.campaigns[0].content_item_ids.push("test-post-1");
  dataset.campaigns.pop();
  dataset.events.pop();
  assert.equal((await runResearch(dataset)).patterns.length, 0);
});

test("all campaigns are checked; complete nonmatches and incomplete unknowns stay distinct", async () => {
  const dataset = fixture([
    "Comment TEST and we'll send you a guide.", "Comment TEST and we'll send you a guide.",
    "Our product is available today.", "A fragment with no requested action.",
  ]);
  dataset.content[3].text_scope = "excerpt";
  dataset.content[3].retrieval_status = "partial";
  dataset.captures[3].scope = "excerpt";
  const pattern = (await runResearch(dataset)).patterns[0];
  assert.equal(pattern.coverage.length, 4);
  assert.equal(pattern.coverage[2].status, "not_observed");
  assert.equal(pattern.coverage[3].status, "unknown");
  assert.deepEqual(pattern.counterexamples.map(c => c.campaign_id), ["test-2"]);
});

test("positive recurrence alone is never promoted beyond candidate", async () => {
  const dataset = fixture(Array(3).fill("Comment TEST and we'll send you a guide."));
  assert.equal((await runResearch(dataset)).signal?.confidence, "candidate");
  dataset.content[2].text_scope = "excerpt";
  dataset.captures[2].scope = "excerpt";
  assert.equal((await runResearch(dataset)).signal?.confidence, "candidate");
});

test("missing extraction stages stay null, excerpt middles are not called hooks", () => {
  const item = fixture(["Introducing Test. Download now."]).content[0];
  item.text_starts_at_beginning = false;
  item.text_scope = "excerpt";
  const extracted = new DeterministicExtractor().extract(item);
  assert.equal(extracted.fields.hook, null);
  assert.equal(extracted.fields.visual_strategy, null);
  assert.equal(extracted.sequence.stages.proof, null);
  assert.deepEqual(extracted.sequence.observed_order, ["claim", "CTA"]);
});

test("sequence order follows source positions, not a predetermined launch template", () => {
  const item = fixture(["Download now. We've raised $3M."]).content[0];
  const extracted = new DeterministicExtractor().extract(item);
  assert.equal(extracted.sequence.observed_order[0], "CTA");
  assert.ok(extracted.sequence.stages.proof!.start > extracted.sequence.stages.CTA!.start);
});

test("invalid provenance, duplicate URLs and dangling references are rejected", () => {
  const bad = fixture(["Text", "Other text"]);
  bad.content[1].source_url = bad.content[0].source_url + "?utm_source=test";
  bad.events[1].source_urls = [bad.content[1].source_url];
  assert.throws(() => validateDataset(bad), /duplicate source URL/);
  bad.content[1].source_url = "javascript:alert(1)";
  assert.throws(() => validateDataset(bad), /source/);
  bad.content[1].source_url = "https://example.com/synthetic/1";
  bad.events[1].source_urls = [bad.content[1].source_url];
  bad.content[0].verification_note = null;
  assert.throws(() => validateDataset(bad), /verification provenance/);
  bad.content[0].verification_note = "Test";
  bad.campaigns[0].content_item_ids = ["missing"];
  assert.throws(() => validateDataset(bad), /dangling content reference/);
});

test("nullable metrics preserve the difference between zero and unavailable", () => {
  const dataset = fixture(["Text"]);
  dataset.content[0].metrics = { views: null, likes: 0, comments: null, shares: null,
    verified: true, source_url: "https://example.com/metrics", observed_at: "2026-09-16" };
  validateDataset(dataset);
  assert.equal(dataset.content[0].metrics.likes, 0);
  assert.equal(dataset.content[0].metrics.views, null);
  dataset.content[0].metrics.likes = -1;
  assert.throws(() => validateDataset(dataset), /invalid metric/);
});

test("provider boundary rejects fabricated quotes and supports asynchronous extraction", async () => {
  const dataset = fixture(["Download now."]);
  const base = new DeterministicExtractor();
  const good: ExtractionProvider = { id: base.id, version: base.version, extract: async item => base.extract(item) };
  assert.equal((await runResearch(dataset, good)).extractions.length, 1);
  const bad: ExtractionProvider = { ...good, extract: async item => {
    const extraction = base.extract(item);
    extraction.fields.CTA!.evidence.quote = "Invented evidence";
    return extraction;
  } };
  await assert.rejects(runResearch(dataset, bad), /quote|deterministic claim/);
});

test("every graph edge resolves, with evidence leading to both original and retrieval sources", async () => {
  const result = await runResearch(seedDataset);
  const nodeIds = new Set(result.graph.nodes.map(n => n.id));
  assert.ok(result.graph.edges.every(e => nodeIds.has(e.from) && nodeIds.has(e.to)));
  for (const evidence of result.evidence) {
    assert.ok(result.graph.edges.some(e => e.from === evidence.id && e.to === `source:${canonicalizeSourceUrl(evidence.span.source_url)}`));
    assert.ok(result.graph.edges.some(e => e.from === evidence.id && e.to === `source:${canonicalizeSourceUrl(evidence.span.retrieved_from_url)}`));
  }
});

test("source search returns real excerpts, never an invented answer", async () => {
  const result = await runResearch(seedDataset);
  const response = searchSources(result, "Cartesia credits");
  assert.equal(response.answer, null);
  assert.ok(response.matches.some(m => m.content_item_id === "cartesia-linkedin"));
  assert.equal(searchSources(result, "zyxwvu-unseen").matches.length, 0);
  assert.throws(() => searchSources(result, "a"), /2 and 500/);
  assert.throws(() => searchSources(result, "a".repeat(501)), /2 and 500/);
});

test("exact credibility and participation question returns the validated structured match", async () => {
  const result = queryDataset(await runResearch(seedDataset), "Which campaigns combine a credibility cue on X with a participation mechanism on LinkedIn?");
  assert.equal(result.mode, "structured_pattern");
  if (result.mode !== "structured_pattern") return;
  assert.deepEqual(result.matches.map(match => match.campaign), ["Cartesia", "Gamma", "Icon"]);
  assert.equal(result.coverage.matched, 3);
});

test("equivalent credibility-to-participation phrasings resolve to the same pattern", async () => {
  const research = await runResearch(seedDataset);
  for (const question of [
    "Which campaigns have credibility on X and participation on LinkedIn?",
    "Show campaigns combining X credibility with LinkedIn participation.",
    "Which launches use this credibility-to-participation pattern?",
  ]) {
    const result = queryDataset(research, question);
    assert.equal(result.mode, "structured_pattern", question);
    if (result.mode === "structured_pattern") assert.deepEqual(result.matches.map(match => match.campaign_id), ["cartesia", "gamma", "icon"]);
  }
});

test("dataset query preserves literal source retrieval for ordinary text searches", async () => {
  const result = queryDataset(await runResearch(seedDataset), "raised $100M");
  assert.equal(result.mode, "source_search");
  if (result.mode === "source_search") assert.ok(result.matches.some(match => match.content_item_id === "cartesia-x"));
});

test("unsupported arbitrary questions do not fabricate a structured answer", async () => {
  const result = queryDataset(await runResearch(seedDataset), "Which launch will dominate Mars next decade?");
  assert.equal(result.mode, "source_search");
  assert.equal(result.answer, null);
  if (result.mode === "source_search") assert.equal(result.matches.length, 0);
});

test("structured query evidence retains exact source provenance", async () => {
  const research = await runResearch(seedDataset);
  const result = queryDataset(research, "Which launches use this credibility-to-participation pattern?");
  assert.equal(result.mode, "structured_pattern");
  if (result.mode !== "structured_pattern") return;
  for (const match of result.matches) for (const evidence of [match.x, match.linkedin]) {
    const content = research.dataset.content.find(item => item.id === evidence.content_item_id)!;
    assert.equal(evidence.span.source_url, content.source_url);
    assert.ok(isVerifiedQuote(evidence.span, evidence.capture));
  }
});

test("structured query keeps insufficient coverage separate from counterevidence", async () => {
  const result = queryDataset(await runResearch(seedDataset), "Which campaigns have credibility on X and participation on LinkedIn?");
  assert.equal(result.mode, "structured_pattern");
  if (result.mode !== "structured_pattern") return;
  assert.equal(result.coverage.insufficient, 4);
  assert.equal(result.coverage.counterevidence, 2);
  assert.deepEqual(result.coverage.insufficient_campaigns.map(row => row.campaign_id), ["playerzero", "wispr-flow", "poly-ai", "superblocks"]);
  assert.ok(result.coverage.insufficient_campaigns.every(row => /cannot be assessed/i.test(row.explanation)));
});

test("unrelated or negated comment language is not called benefit-gated distribution", () => {
  for (const text of ["Comment if you don't get it.", "Do not comment TEST and we'll send you a guide.", "The product works. Introducing another idea."]) {
    const extraction = new DeterministicExtractor().extract(fixture([text]).content[0]);
    assert.equal(extraction.fields.launch_mechanism, null);
    assert.equal(extraction.fields.hook, null);
  }
});

test("canonical identity handles tracking, fragments, query order, aliases, media suffixes and activity IDs", () => {
  const equivalents = [
    ["http://EXAMPLE.com:80/%70ath/?b=2&a=1&utm_Source=mail#heading", "https://example.com/path?a=1&b=2"],
    ["https://example.com/path/?fbclid=abc&gclid=xyz", "https://example.com/path"],
    ["https://mobile.twitter.com/Someone/status/123456/photo/1?s=20&t=abc", "https://x.com/other/status/123456"],
    ["https://www.x.com/i/web/status/123456/video/1", "https://x.com/i/status/123456"],
    ["https://www.linkedin.com/posts/author_title-activity-123456-slug?utm_source=share", "https://linkedin.com/feed/update/urn:li:activity:123456/"],
    ["https://sociallcapital.com/work/icon/", "https://www.sociallcapital.com/work/icon"],
  ];
  for (const [a, b] of equivalents) assert.equal(canonicalizeSourceUrl(a), canonicalizeSourceUrl(b));
  assert.notEqual(canonicalizeSourceUrl("https://example.com/post?id=1"), canonicalizeSourceUrl("https://example.com/post?id=2"));
  assert.notEqual(canonicalizeSourceUrl("https://example.com/Case"), canonicalizeSourceUrl("https://example.com/case"));
  assert.notEqual(canonicalizeSourceUrl("https://example.com/x?ref=one"), canonicalizeSourceUrl("https://example.com/x?ref=two"));
  assert.throws(() => canonicalizeSourceUrl("javascript:alert(1)"), /Invalid/);
});

function retarget(dataset: Dataset, index: number, url: string) {
  dataset.content[index].source_url = url;
  dataset.content[index].publication.source_url = url;
  dataset.content[index].retrieved_from_url = url;
  dataset.captures[index].source_url = url;
  dataset.captures[index].retrieved_from_url = url;
  dataset.events[index].source_urls = [url];
}

test("duplicate source variants fail ingestion while original display URLs are preserved", async () => {
  const dataset = fixture(["A source", "A duplicate"]);
  retarget(dataset, 0, "https://twitter.com/Author/status/12345?s=20");
  retarget(dataset, 1, "https://x.com/author/status/12345/video/1#x");
  await assert.rejects(runResearch(dataset), /duplicate source URL/);
  const single = fixture(["A source"]);
  const original = "http://EXAMPLE.com:80/source/?utm_source=mail";
  retarget(single, 0, original);
  assert.equal((await runResearch(single)).dataset.content[0].source_url, original);
});

test("quoted text must exactly match a retained retrieval, including punctuation and whitespace", async () => {
  const dataset = fixture(["Download now."]);
  const item = dataset.content[0];
  const span = spanFor(item, 0, item.text!.length);
  assert.equal(isVerifiedQuote(span, dataset.captures[0]), true);
  for (const quote of ["Download  now.", "Download now!", "A plausible paraphrase"])
    assert.equal(isVerifiedQuote({ ...span, quote }, dataset.captures[0]), false);
  assert.equal(isVerifiedQuote(span, undefined), false);
  assert.equal(isVerifiedQuote({ ...span, capture_id: "made-up" }, dataset.captures[0]), false);
  dataset.content[0].text = "A fabricated replacement.";
  await assert.rejects(runResearch(dataset), /does not match retrieved/);
});

test("altering a stored capture or its source provenance fails validation", () => {
  const changed = fixture(["Download now."]);
  changed.captures[0].text = "Different retrieved text.";
  assert.throws(() => validateDataset(changed), /capture integrity/);
  const wrongSource = fixture(["Download now."]);
  wrongSource.captures[0].source_url = "https://example.com/unrelated";
  assert.throws(() => validateDataset(wrongSource), /capture provenance/);
  const missingCapture = fixture(["Download now."]);
  missingCapture.captures = [];
  assert.throws(() => validateDataset(missingCapture), /capture provenance/);
});

test("same underlying event across multiple campaigns cannot establish independent recurrence", async () => {
  const dataset = fixture(["Comment A and we'll send you a guide.", "Comment B and we'll send you a guide."]);
  dataset.events[0].campaign_ids.push("test-1");
  dataset.events[0].grouping_basis = "reviewed_equivalence";
  dataset.content[1].launch_event_id = dataset.events[0].id;
  dataset.events.pop();
  const result = await runResearch(dataset);
  assert.equal(result.patterns.length, 0);
  assert.equal(result.signal, null);
});

test("platform variants preserve their text but count only once per event", async () => {
  const dataset = fixture(["Comment A and we'll send you a guide.", "Comment B and we'll send you a guide.", "Comment C and we'll send you a guide."]);
  dataset.content[1].campaign_id = "test-0";
  dataset.content[1].launch_event_id = "event-test-0";
  dataset.content[0].platform = "X";
  dataset.content[1].platform = "LinkedIn";
  dataset.campaigns[0].content_item_ids.push("test-post-1");
  dataset.campaigns.splice(1, 1);
  dataset.events.splice(1, 1);
  const result = await runResearch(dataset);
  const pattern = result.patterns[0];
  assert.equal(pattern.supporting_content.length, 3);
  assert.equal(pattern.supporting_events.length, 2);
  assert.equal(pattern.supporting_campaigns.length, 2);
  assert.notEqual(result.dataset.content[0].text, result.dataset.content[1].text);
});

test("explicit contradiction is distinguished from nonmatching full text and incomplete evidence", async () => {
  const dataset = fixture([
    "Comment A and we'll send you a guide.", "Comment B and we'll send you a guide.",
    "No comment is required. Everyone has access.", "Our product is now available.", "A retained fragment.",
  ]);
  dataset.content[2].text_scope = "excerpt";
  dataset.captures[2].scope = "excerpt";
  dataset.content[4].text_scope = "excerpt";
  dataset.captures[4].scope = "excerpt";
  const result = await runResearch(dataset);
  const pattern = result.patterns[0];
  assert.equal(pattern.confidence, "weak");
  assert.equal(result.signal, null);
  assert.deepEqual(pattern.counterexamples.map(c => c.kind), ["contradicts", "not_observed"]);
  assert.equal(pattern.coverage[2].evidence_state, "counterevidence");
  assert.equal(pattern.coverage[4].evidence_state, "insufficient_evidence");
  assert.equal(isVerifiedQuote(pattern.counterexamples[0].spans[0], dataset.captures[2]), true);
});

test("supporting and contrary platform variants remain mixed within one campaign", async () => {
  const dataset = fixture(["Comment A and we'll send you a guide.", "Comment B and we'll send you a guide.", "No comment is required."]);
  dataset.content[2].campaign_id = "test-0";
  dataset.content[2].launch_event_id = "event-test-0";
  dataset.campaigns[0].content_item_ids.push("test-post-2");
  dataset.campaigns.pop(); dataset.events.pop();
  const pattern = (await runResearch(dataset)).patterns[0];
  assert.equal(pattern.coverage[0].status, "mixed");
  assert.equal(pattern.coverage[0].evidence_state, "mixed");
  assert.equal(pattern.confidence, "weak");
});

test("many nonmatching events lower confidence despite several positives", async () => {
  const result = await runResearch(fixture([
    ...Array(3).fill("Comment TEST and we'll send you a guide."),
    ...Array(4).fill("The service is now available to everyone."),
  ]));
  assert.equal(result.patterns[0].confidence, "weak");
  assert.equal(result.patterns[0].counterexamples.length, 4);
  assert.equal(result.signal, null);
});

test("missing campaign, grouping, extraction and capture provenance are rejected", async () => {
  const missingCampaign = fixture(["Download now."]);
  missingCampaign.content[0].campaign_id = "nonexistent";
  await assert.rejects(runResearch(missingCampaign), /source|reference|campaign/);
  const missingEvent = fixture(["Download now."]);
  missingEvent.content[0].launch_event_id = null;
  await assert.rejects(runResearch(missingEvent), /event/);
  const dataset = fixture(["Download now."]);
  assert.throws(() => validateExtractions(dataset, []), /missing extraction/);
  const extraction = new DeterministicExtractor().extract(dataset.content[0]);
  extraction.content_item_id = "orphaned";
  assert.throws(() => validateExtractions(dataset, [extraction]), /unknown/);
  const collision = new DeterministicExtractor().extract(dataset.content[0]);
  collision.id = "campaign:test-0";
  assert.throws(() => validateExtractions(dataset, [collision]), /claim namespace/);
});

test("publication gate rejects unsupported confidence, hidden counterexamples, fabricated findings and orphaned evidence", async () => {
  const result = await runResearch(fixture(["Comment A and we'll send you a guide.", "Comment B and we'll send you a guide.", "A complete nonmatching post."]));
  for (const alter of [
    (r: typeof result) => { r.patterns[0].confidence = "supported"; },
    (r: typeof result) => { r.patterns[0].counterexamples = []; },
    (r: typeof result) => { r.patterns[0].supporting_events.push("made-up"); },
    (r: typeof result) => { r.patterns[0].evidence_ids = []; },
    (r: typeof result) => { r.evidence[0].campaign_id = "unrelated"; },
    (r: typeof result) => { r.evidence[0].extraction_id = "orphaned"; },
    (r: typeof result) => { r.mechanics[0].sequence.order = "x_first"; },
    (r: typeof result) => { r.performance.verified_metrics = 999; },
    (r: typeof result) => { r.signal!.thesis = "This strategy makes launches win."; },
    (r: typeof result) => { r.signal!.supporting_evidence = []; },
    (r: typeof result) => { r.graph.edges[0].to = "missing"; },
  ]) {
    const changed = structuredClone(result); alter(changed);
    assert.throws(() => validateResearch(changed), /Invalid findings/);
  }
});

test("source, retrieval, interpretation and missing-data states remain separate", () => {
  const dataset = fixture(["Download now."]);
  assert.match(contentEvidenceState(dataset.content[0]), /Verified source excerpt/);
  dataset.content[0].verified = false;
  assert.match(contentEvidenceState(dataset.content[0]), /Retrieved source data/);
  dataset.content[0].retrieval_status = "unavailable";
  assert.match(contentEvidenceState(dataset.content[0]), /Unavailable/);
  assert.match(contentEvidenceState(seedDataset.content.find(c => c.id === "wispr-flow-x")!), /quotations withheld/);
});

test("a provider cannot silently mutate retrieved text or claim another provider's identity", async () => {
  const dataset = fixture(["Download now."]);
  const extractor = new DeterministicExtractor();
  const mutating: ExtractionProvider = { id: extractor.id, version: extractor.version, extract: item => {
    item.text = "Comment FAKE and we'll send you a guide.";
    return extractor.extract(item);
  } };
  await assert.rejects(runResearch(dataset, mutating), /deterministic claim/);
  assert.equal(dataset.content[0].text, "Download now.");
  await assert.rejects(runResearch(dataset, { id: "fake", version: "fake", extract: item => extractor.extract(item) }), /provider identity/);
});

test("AI interpretations remain labeled and cannot masquerade as deterministic pattern support", async () => {
  const dataset = fixture(["Comment A and we'll send you a guide.", "Comment B and we'll send you a guide."]);
  const base = new DeterministicExtractor();
  const provider: ExtractionProvider = { id: "test-ai", version: "1", extract: item => {
    const extraction = base.extract(item);
    extraction.provider = "test-ai"; extraction.version = "1";
    for (const field of Object.values(extraction.fields)) if (field) field.basis = "ai_interpretation";
    return extraction;
  } };
  const result = await runResearch(dataset, provider);
  assert.equal(result.extractions[0].fields.CTA?.basis, "ai_interpretation");
  assert.equal(result.patterns.length, 0);
  assert.equal(result.signal, null);
});

// Signal presentation must use the validated pipeline without upgrading its conclusions.
test("unsupported signal is withheld instead of presenting a manufactured conclusion", async () => {
  const research = await runResearch(seedDataset);
  research.signal!.thesis = "A fabricated winning strategy";
  const view = presentSignal(research);
  assert.equal(view.state, "insufficient");
  assert.ok(!("signal" in view));
});

test("candidate signal retains pipeline confidence, coverage and limitations", async () => {
  const research = await runResearch(seedDataset);
  const view = presentSignal(research);
  assert.equal(view.state, "finding");
  if (view.state !== "finding") return;
  assert.equal(view.label, "Candidate");
  assert.equal(view.signal.thesis, research.signal!.thesis);
  assert.equal(view.counts.campaigns, view.pattern.supporting_campaigns.length);
  assert.equal(view.counts.events, view.pattern.supporting_events.length);
  assert.equal(view.counts.content, view.pattern.supporting_content.length);
  assert.equal(view.counts.totalCampaigns, research.dataset.campaigns.length);
  assert.deepEqual(view.limitations, [...new Set(research.signal!.limitations)]);
  assert.equal(view.counts.counterevidence, 2);
  assert.ok(view.counts.insufficient > 0);
});

test("signal with counterevidence preserves exceptions and their source chain", async () => {
  const research = await runResearch(fixture([
    ...Array(3).fill("Comment TEST and we'll send you a guide."),
    "Our product is available today.",
  ]));
  const view = presentSignal(research);
  assert.equal(view.state, "finding");
  if (view.state !== "finding") return;
  assert.equal(view.label, "Candidate");
  assert.equal(view.counts.counterevidence, 1);
  assert.equal(view.counterevidence[0].campaign.id, "test-3");
  assert.equal(view.counterevidence[0].kind, "not_observed");
  assert.equal(view.counterevidence[0].content[0].source_url, research.dataset.content[3].source_url);
  assert.ok(view.counterevidence[0].quotes.every(({ span, capture }) => isVerifiedQuote(span, capture)));
});

test("missing signal evidence, capture, content or campaign fails closed", async () => {
  const original = await runResearch(seedDataset);
  for (const missing of ["evidence", "capture", "content", "campaign"] as const) {
    const research = structuredClone(original);
    const evidence = research.evidence.find(e => e.id === research.signal!.supporting_evidence[0])!;
    if (missing === "evidence") research.evidence = research.evidence.filter(e => e.id !== evidence.id);
    if (missing === "capture") research.dataset.captures = research.dataset.captures.filter(c => c.id !== evidence.span.capture_id);
    if (missing === "content") research.dataset.content = research.dataset.content.filter(c => c.id !== evidence.content_item_id);
    if (missing === "campaign") research.dataset.campaigns = research.dataset.campaigns.filter(c => c.id !== evidence.campaign_id);
    assert.equal(presentSignal(research).state, "insufficient", missing);
  }
});

test("signal presentation resolves the complete signal-pattern-campaign-content-source chain", async () => {
  const research = await runResearch(seedDataset);
  const view = presentSignal(research);
  assert.equal(view.state, "finding");
  if (view.state !== "finding") return;
  assert.equal(view.signal.pattern_id, view.pattern.id);
  assert.deepEqual(view.supporting.map(row => row.evidence.id), view.signal.supporting_evidence);
  assert.ok(view.supporting.length > 0);
  assert.equal(view.supportingItems.length, view.counts.content);
  assert.equal(new Set(view.supportingItems.map(row => row.content.id)).size, view.counts.content);
  assert.deepEqual(view.supportingItems.flatMap(row => row.evidence.map(e => e.id)).sort(), [...view.signal.supporting_evidence].sort());
  assert.ok(view.supportingItems.every(row => isVerifiedQuote(row.span, row.capture)));
  for (const row of view.supporting) {
    assert.equal(row.evidence.pattern_id, view.pattern.id);
    assert.equal(row.evidence.campaign_id, row.campaign.id);
    assert.equal(row.content.campaign_id, row.campaign.id);
    assert.equal(row.content.id, row.evidence.content_item_id);
    assert.equal(row.content.source_url, row.evidence.span.source_url);
    assert.equal(row.capture.content_item_id, row.content.id);
    assert.ok(isVerifiedQuote(row.evidence.span, row.capture));
  }
});

test("empty or nonqualifying evidence explicitly produces an insufficient signal state", async () => {
  for (const dataset of [fixture([]), fixture(["Our product is available today."])]) {
    const view = presentSignal(await runResearch(dataset));
    assert.equal(view.state, "insufficient");
    if (view.state === "insufficient") assert.match(view.reason, /insufficient evidence/i);
  }
});

test("incomplete nonmatches remain unknown and do not become signal counterevidence", async () => {
  const dataset = fixture([
    ...Array(3).fill("Comment TEST and we'll send you a guide."),
    "A short fragment.",
  ]);
  dataset.content[3].text_scope = "excerpt";
  dataset.captures[3].scope = "excerpt";
  const view = presentSignal(await runResearch(dataset));
  assert.equal(view.state, "finding");
  if (view.state !== "finding") return;
  assert.equal(view.counts.counterevidence, 0);
  assert.equal(view.counts.insufficient, 1);
  assert.equal(view.coverage[3].evidence_state, "insufficient_evidence");
  assert.equal(view.coverage[3].unknown[0].source_url, dataset.content[3].source_url);
});

test("launch mechanics create one normalized record per reviewed launch event", async () => {
  const research = await runResearch(seedDataset);
  assert.equal(research.mechanics.length, research.dataset.events.length);
  assert.equal(research.mechanics.length, 9);
  assert.equal(research.mechanics.flatMap(item => item.content).length, 15);
  for (const event of research.dataset.events) {
    const mechanics = research.mechanics.find(item => item.event_id === event.id)!;
    assert.deepEqual(mechanics.campaign_ids, event.campaign_ids);
    assert.ok(mechanics.content.every(item => research.dataset.content.some(content => content.id === item.content_item_id && content.launch_event_id === event.id)));
  }
});

test("publication audit retains exact source metadata and honest unresolved campaigns", async () => {
  const mechanics = (await runResearch(seedDataset)).mechanics;
  assert.equal(mechanics.flatMap(item => item.content).filter(item => item.publication.precision === "exact").length, 15);
  assert.equal(mechanics.filter(item => item.sequence.status === "resolved").length, 6);
  assert.equal(mechanics.filter(item => item.sequence.status === "insufficient").length, 3);
  assert.equal(mechanics.filter(item => item.sequence.delta_minutes !== null).length, 6);
  assert.ok(mechanics.flatMap(item => item.content).every(item => item.publication.source_url === item.source_url));
});

test("exact X and LinkedIn timestamps establish sequence positions and delta", async () => {
  const dataset = pairedFixture([["Introducing Test.", "Comment TEST and we'll send you a guide."]]);
  setPublication(dataset.content[0], "2026-01-02T10:00:00Z");
  setPublication(dataset.content[1], "2026-01-02T11:00:00Z");
  const mechanics = (await runResearch(dataset)).mechanics[0];
  assert.equal(mechanics.sequence.order, "x_first");
  assert.equal(mechanics.sequence.precision, "exact");
  assert.equal(mechanics.sequence.delta_minutes, 60);
  assert.deepEqual(mechanics.content.map(item => item.sequence_position), [1, 2]);
});

test("different verified day-only dates establish order without an exact delta", async () => {
  const dataset = pairedFixture([["Introducing Test.", "Comment TEST and we'll send you a guide."]]);
  setPublication(dataset.content[0], "2026-01-02", "day");
  setPublication(dataset.content[1], "2026-01-03", "day");
  const sequence = (await runResearch(dataset)).mechanics[0].sequence;
  assert.equal(sequence.status, "resolved");
  assert.equal(sequence.order, "x_first");
  assert.equal(sequence.precision, "day");
  assert.equal(sequence.delta_minutes, null);
});

test("same-day day-only evidence keeps platform order unresolved", async () => {
  const dataset = pairedFixture([["Introducing Test.", "Comment TEST and we'll send you a guide."]]);
  setPublication(dataset.content[0], "2026-01-02", "day");
  setPublication(dataset.content[1], "2026-01-02", "day");
  const sequence = (await runResearch(dataset)).mechanics[0].sequence;
  assert.equal(sequence.status, "same_day_unresolved");
  assert.equal(sequence.order, "same_day");
  assert.equal(sequence.delta_minutes, null);
});

test("one known platform timestamp and one missing timestamp remain unresolved", async () => {
  const dataset = pairedFixture([["Introducing Test.", "Comment TEST and we'll send you a guide."]]);
  setPublication(dataset.content[0], "2026-01-02T10:00:00Z");
  const sequence = (await runResearch(dataset)).mechanics[0].sequence;
  assert.equal(sequence.status, "insufficient");
  assert.match(sequence.explanation, /LinkedIn/);
});

test("both missing platform timestamps remain unresolved", async () => {
  const sequence = (await runResearch(pairedFixture([["Introducing Test.", "Comment TEST and we'll send you a guide."]]))).mechanics[0].sequence;
  assert.equal(sequence.status, "insufficient");
  assert.equal(sequence.order, "unknown");
  assert.match(sequence.explanation, /X and LinkedIn/);
});

test("exact timestamps respect timezone offsets", async () => {
  const dataset = pairedFixture([["Introducing Test.", "Comment TEST and we'll send you a guide."]]);
  setPublication(dataset.content[0], "2026-01-02T10:00:00+05:30");
  setPublication(dataset.content[1], "2026-01-02T05:00:00Z");
  const sequence = (await runResearch(dataset)).mechanics[0].sequence;
  assert.equal(sequence.order, "x_first");
  assert.equal(sequence.delta_minutes, 30);
});

test("exact timestamps compare different timezone offsets as instants", async () => {
  const dataset = pairedFixture([["Introducing Test.", "Comment TEST and we'll send you a guide."]]);
  setPublication(dataset.content[0], "2026-01-02T09:00:00-08:00");
  setPublication(dataset.content[1], "2026-01-02T18:30:00+01:00");
  const sequence = (await runResearch(dataset)).mechanics[0].sequence;
  assert.equal(sequence.order, "x_first");
  assert.equal(sequence.delta_minutes, 30);
});

test("unsupported source identifiers do not receive a fabricated fallback timestamp", () => {
  assert.deepEqual(publicationFromSource("X", "https://x.com/example/status/not-a-source-id"), {
    published_at: null,
    precision: "unknown",
    source_url: "https://x.com/example/status/not-a-source-id",
    verification_status: "unavailable",
    evidence: "The retained public source does not provide supported publication timestamp metadata.",
  });
});

test("canonical platform identifiers decode deterministic UTC publication instants", () => {
  const xUrl = "https://x.com/krandiash/status/1983202316397453676";
  const linkedInUrl = "https://www.linkedin.com/posts/krandiash_weve-raised-100m-from-kleiner-perkins-activity-7388968595499728896-0UJn";
  assert.deepEqual(publicationFromSource("X", xUrl, "2025-10-28"), {
    published_at: "2025-10-28T16:00:53.003Z",
    precision: "exact",
    source_url: xUrl,
    verification_status: "verified",
    evidence: "UTC creation instant decoded from the canonical X status identifier; its UTC day matches the source-displayed 2025-10-28 date.",
  });
  assert.equal(publicationFromSource("LinkedIn", linkedInUrl).published_at, "2025-10-28T16:03:13.565Z");
  assert.equal(publicationFromSource("LinkedIn", linkedInUrl).source_url, linkedInUrl);
});

test("publication timestamps require matching source provenance and consistent precision", async () => {
  const mismatchedSource = fixture(["Introducing Test."]);
  setPublication(mismatchedSource.content[0], "2026-01-02T10:00:00Z");
  mismatchedSource.content[0].publication.source_url = "https://example.com/different-source";
  await assert.rejects(runResearch(mismatchedSource), /publication source mismatch/);

  const falsePrecision = fixture(["Introducing Test."]);
  setPublication(falsePrecision.content[0], "2026-01-02T10:00:00Z", "day");
  await assert.rejects(runResearch(falsePrecision), /day publication precision mismatch/);
});

test("campaign month cannot establish platform sequence", async () => {
  const dataset = pairedFixture([["Introducing Test.", "Comment TEST and we'll send you a guide."]]);
  dataset.campaigns[0].launch_date = "2026-01";
  dataset.campaigns[0].date_precision = "month";
  assert.equal((await runResearch(dataset)).mechanics[0].sequence.status, "insufficient");
});

test("content record order cannot establish or reverse platform sequence", async () => {
  const dataset = pairedFixture([["Introducing Test.", "Comment TEST and we'll send you a guide."]]);
  setPublication(dataset.content[0], "2026-01-02T12:00:00Z");
  setPublication(dataset.content[1], "2026-01-02T10:00:00Z");
  dataset.content.reverse();
  const mechanics = (await runResearch(dataset)).mechanics[0];
  assert.equal(mechanics.sequence.order, "linkedin_first");
  assert.equal(mechanics.sequence.delta_minutes, 120);
});

test("cross-posts remain grouped as content relationships inside one event", async () => {
  const research = await runResearch(pairedFixture([["Introducing Test.", "Comment TEST and we'll send you a guide."]]));
  assert.equal(research.dataset.events.length, 1);
  assert.equal(research.mechanics.length, 1);
  assert.equal(research.mechanics[0].content.length, 2);
  assert.ok(research.mechanics[0].content.every(item => item.relationship === "same_launch_event"));
});

test("platform transformation and participation mechanics require cited extracted cues", async () => {
  const research = await runResearch(pairedFixture([["Introducing Test. We've raised $3M.", "Comment TEST and we'll send you a guide."]]));
  const mechanics = research.mechanics[0];
  assert.deepEqual(mechanics.participation.map(item => item.mechanism), ["comment_to_receive"]);
  assert.equal(mechanics.transformations[0].kind, "credibility_to_participation");
  for (const span of [...mechanics.participation.map(item => item.evidence), ...mechanics.transformations.flatMap(item => item.evidence)]) {
    assert.ok(isVerifiedQuote(span, research.dataset.captures.find(capture => capture.id === span.capture_id)));
  }
});

test("compound operational pattern retains supporting events, counterexamples and unknown coverage", async () => {
  const support: [string, string] = ["Introducing Test. We've raised $3M.", "Comment TEST and we'll send you a guide."];
  const continuity: [string, string] = ["This is the story I've never told anyone before.", "I'm going to share a story today I've never told anyone before."];
  const research = await runResearch(pairedFixture([support, support, support, continuity, continuity]));
  const pattern = research.patterns.find(item => item.id === "credibility-to-participation")!;
  assert.equal(pattern.confidence, "candidate");
  assert.equal(pattern.supporting_events.length, 3);
  assert.equal(pattern.counterexamples.length, 2);
  assert.equal(pattern.coverage.filter(item => item.evidence_state === "supported_evidence").length, 3);
  assert.equal(pattern.coverage.filter(item => item.evidence_state === "counterevidence").length, 2);
  assert.equal(research.signal?.pattern_id, pattern.id);
});

test("seed signature signal is a source-verifiable combination, not a timing claim", async () => {
  const research = await runResearch(seedDataset);
  const pattern = research.patterns.find(item => item.id === research.signal?.pattern_id)!;
  assert.equal(pattern.id, "credibility-to-participation");
  assert.deepEqual(pattern.supporting_campaigns, ["cartesia", "gamma", "icon"]);
  assert.deepEqual(pattern.counterexamples.map(item => item.campaign_id), ["airwallex", "deel"]);
  assert.ok(pattern.evidence_ids.length > 0);
  assert.ok(pattern.evidence_ids.every(id => {
    const item = research.evidence.find(evidence => evidence.id === id)!;
    return isVerifiedQuote(item.span, research.dataset.captures.find(capture => capture.id === item.span.capture_id));
  }));
  assert.ok(pattern.limitations.some(limit => /verified timestamp precision supports/i.test(limit)));
});

test("verified public-response snapshots preserve exact and abbreviated source values", async () => {
  const research = await runResearch(seedDataset);
  assert.equal(research.dataset.responses?.length, 15);
  assert.equal(research.performance.verified_snapshots, 13);
  assert.equal(research.performance.verified_metrics, 49);
  assert.equal(research.performance.covered_campaigns, 9);
  const playerzero = research.dataset.responses!.find(record => record.content_item_id === "playerzero-x")!;
  assert.deepEqual(playerzero.metrics.find(metric => metric.type === "views"), {
    type: "views", display_value: "2.7M", numeric_value: null, precision: "abbreviated",
  });
  assert.deepEqual(playerzero.metrics.find(metric => metric.type === "replies"), {
    type: "replies", display_value: "866", numeric_value: 866, precision: "exact",
  });
});

test("missing public response is distinct from a verified zero", async () => {
  const dataset = fixture(["Download now."]);
  dataset.responses = [{
    id: "response:missing", campaign_id: "test-0", launch_event_id: "event-test-0", content_item_id: "test-post-0",
    platform: "Test", source_url: dataset.content[0].source_url, observed_at: "2026-09-17",
    verification_state: "not_retrieved", snapshot_state: null, metrics: [], note: "Metric retrieval not attempted.",
  }];
  const result = await runResearch(dataset);
  assert.equal(result.performance.verified_metrics, 0);
  assert.equal(result.dataset.responses![0].verification_state, "not_retrieved");
});

test("unverified records cannot carry metric values", () => {
  const dataset = fixture(["Download now."]);
  dataset.responses = [{
    id: "response:unverified", campaign_id: "test-0", launch_event_id: "event-test-0", content_item_id: "test-post-0",
    platform: "Test", source_url: dataset.content[0].source_url, observed_at: "2026-09-17",
    verification_state: "unverified", snapshot_state: null,
    metrics: [{ type: "likes", display_value: "10", numeric_value: 10, precision: "exact" }], note: "Unverified test value.",
  }];
  assert.throws(() => validateDataset(dataset), /unverified response/);
});

test("metric records reject source and content provenance mismatches", () => {
  const dataset = structuredClone(seedDataset);
  dataset.responses![0].source_url = "https://example.com/wrong-source";
  assert.throws(() => validateDataset(dataset), /response source mismatch/);
  const wrongContent = structuredClone(seedDataset);
  wrongContent.responses![0].content_item_id = "poly-ai-x";
  assert.throws(() => validateDataset(wrongContent), /provenance chain mismatch/);
});

test("verified snapshots require a valid observation date", () => {
  const dataset = structuredClone(seedDataset);
  dataset.responses![0].observed_at = "not-a-date";
  assert.throws(() => validateDataset(dataset), /observation provenance/);
});

test("multiple metrics remain attached to one exact content item and snapshot", async () => {
  const research = await runResearch(seedDataset);
  const poly = research.dataset.responses!.find(record => record.content_item_id === "poly-ai-x")!;
  assert.deepEqual(poly.metrics.map(metric => metric.type), ["views", "replies", "reposts", "likes", "bookmarks"]);
  assert.ok(poly.metrics.every(() => poly.source_url === research.dataset.content.find(item => item.id === poly.content_item_id)!.source_url));
});

test("cross-post response snapshots remain separate while sharing one launch event", async () => {
  const records = (await runResearch(seedDataset)).dataset.responses!.filter(record => record.campaign_id === "cartesia");
  assert.deepEqual(records.map(record => record.content_item_id).sort(), ["cartesia-linkedin", "cartesia-x"]);
  assert.ok(records.every(record => record.launch_event_id === "cartesia-launch"));
  assert.notEqual(records[0].id, records[1].id);
});

test("engagement rate is withheld without an exact positive denominator", () => {
  const abbreviated = seedDataset.responses!.find(record => record.content_item_id === "poly-ai-x")!;
  assert.equal(calculateEngagementRate(abbreviated, ["likes", "replies", "reposts"]), null);
  const missing = structuredClone(abbreviated);
  missing.metrics = missing.metrics.filter(metric => metric.type !== "views");
  assert.equal(calculateEngagementRate(missing, ["likes"]), null);
  const zero = structuredClone(abbreviated);
  zero.metrics = [{ type: "views", display_value: "0", numeric_value: 0, precision: "exact" }, { type: "likes", display_value: "0", numeric_value: 0, precision: "exact" }];
  assert.equal(calculateEngagementRate(zero, ["likes"]), null);
});

test("insufficient performance coverage produces no comparative analysis", () => {
  const dataset = fixture(["Download now.", "Try for free."]);
  const analysis = analyzePerformance(dataset);
  assert.equal(analysis.covered_campaigns, 0);
  assert.equal(analysis.comparative_state, "insufficient");
  assert.ok(analysis.limitations.some(limit => /No exact view denominator/i.test(limit)));
});

test("signal exposes response coverage without turning metrics into a finding", async () => {
  const research = await runResearch(seedDataset);
  const supporting = new Set(research.patterns.find(pattern => pattern.id === research.signal!.pattern_id)!.supporting_content);
  const covered = research.dataset.responses!.filter(record => record.verification_state === "verified_source_data" && supporting.has(record.content_item_id));
  assert.equal(covered.length, 5);
  assert.equal(supporting.size, 6);
  assert.equal(research.performance.comparative_state, "insufficient");
  assert.equal(research.signal?.pattern_id, "credibility-to-participation");
});

test("every verified metric resolves through response, content, event, campaign and source provenance", async () => {
  const research = await runResearch(seedDataset);
  const nodes = new Set(research.graph.nodes.map(node => node.id));
  for (const response of research.dataset.responses!.filter(record => record.verification_state === "verified_source_data")) {
    assert.ok(research.graph.edges.some(edge => edge.from === `content:${response.content_item_id}` && edge.to === response.id && edge.relation === "public_response"));
    for (const metric of response.metrics) {
      const metricId = `metric:${response.id}:${metric.type}`;
      assert.ok(nodes.has(metricId));
      assert.ok(research.graph.edges.some(edge => edge.from === response.id && edge.to === metricId));
      assert.ok(research.graph.edges.some(edge => edge.from === metricId && edge.relation === "verified_by"));
    }
  }
});
