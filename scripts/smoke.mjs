import assert from "node:assert/strict";

const base = process.env.TRACE_TEST_URL ?? "http://localhost:3000";
const routes = ["/", "/launches", "/patterns", "/network", "/signal", "/ask"];
for (const route of routes) {
  const response = await fetch(new URL(route, base));
  assert.equal(response.status, 200, route);
  assert.match(await response.text(), /TRACE/);
}
const response = await fetch(new URL("/api/research", base));
assert.equal(response.status, 200);
const research = await response.json();
assert.equal(research.dataset.campaigns.length, 9);
assert.equal(research.dataset.content.length, 24);
assert.equal(research.patterns.length, 6);
assert.equal(research.mechanics.length, 9);
assert.equal(research.signal.pattern_id, "credibility-to-participation");
assert.equal(research.performance.verified_snapshots, 13);
assert.equal(research.performance.verified_metrics, 49);
assert.equal(research.performance.covered_campaigns, 9);
assert.equal(research.performance.comparative_state, "insufficient");
const signalPage = await (await fetch(new URL("/signal", base))).text();
assert.match(signalPage, /Signal evidence chain/);
assert.match(signalPage, /Insufficient evidence for a supported conclusion/);
assert.match(signalPage, /Insufficient comparable coverage for a performance-related signal/);
for (const section of ["signal-support", "signal-sources", "signal-counterevidence", "signal-coverage", "signal-limitations"]) {
  assert.ok(signalPage.includes(`id="${section}"`), `visible signal section: ${section}`);
}
const escapeHtml = value => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
assert.ok(research.signal, "seed has a pipeline-generated candidate");
assert.ok(signalPage.includes(escapeHtml(research.signal.thesis)));
assert.ok(signalPage.includes(`/patterns#${research.signal.pattern_id}`));
for (const id of research.signal.supporting_evidence) {
  const evidence = research.evidence.find(e => e.id === id);
  assert.ok(signalPage.includes(`/launches/${evidence.campaign_id}#${evidence.content_item_id}`));
  assert.ok(signalPage.includes(escapeHtml(evidence.span.source_url)));
  assert.ok(signalPage.includes(escapeHtml(evidence.span.quote)));
}
for (const limitation of research.signal.limitations) assert.ok(signalPage.includes(escapeHtml(limitation)));
for (const campaign of research.dataset.campaigns) {
  const page = await fetch(new URL(`/launches/${campaign.id}`, base));
  assert.equal(page.status, 200, campaign.id);
  const dossier = await page.text();
  assert.ok(dossier.includes(campaign.campaign_url), `${campaign.id} source citation`);
  assert.match(dossier, /PUBLIC RESPONSE/i);
  for (const response of research.dataset.responses.filter(item => item.campaign_id === campaign.id)) {
    assert.ok(dossier.includes(escapeHtml(response.source_url)), `${response.id} metric source`);
    for (const metric of response.metrics) assert.ok(dossier.includes(metric.display_value), `${response.id} ${metric.type}`);
  }
}
assert.equal((await fetch(new URL("/launches/not-a-campaign", base))).status, 404);
const ask = (body, headers = { "Content-Type": "application/json" }) => fetch(new URL("/api/ask", base), {
  method: "POST", headers, body,
});
const found = await ask(JSON.stringify({ question: "Cartesia credits" }));
assert.equal(found.status, 200);
const answer = await found.json();
assert.equal(answer.answer, null);
assert.ok(answer.matches.some(m => m.content_item_id === "cartesia-linkedin"));
assert.equal((await ask(JSON.stringify({ question: " " }))).status, 400);
assert.equal((await ask(JSON.stringify({ question: "a".repeat(501) }))).status, 400);
assert.equal((await ask("not-json")).status, 400);
assert.equal((await ask("a".repeat(4097))).status, 413);
assert.equal((await ask("text", { "Content-Type": "text/plain" })).status, 415);
console.log("Smoke checks passed: 6 pages, signal evidence chain/quotes/limitations, 9 dossiers, 404, research API, source search and input validation.");
