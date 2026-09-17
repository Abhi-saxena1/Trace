import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, SectionLink } from "@/components/editorial";
import { getResearch } from "@/lib/research";
import { LaunchMechanicsView, PublicResponseView, SourceQuote, SourceVerificationDetails } from "@/components/research-evidence";
import { presentSignal } from "@/lib/research/signal/presentation";
import { contentEvidenceState } from "@/lib/research/source-text";

export const metadata: Metadata = { title: "The Signal" };

export default async function Signal() {
  const research = await getResearch();
  const finding = presentSignal(research);
  const signalResponses = finding.state === "finding" ? (research.dataset.responses ?? []).filter(response => finding.pattern.supporting_content.includes(response.content_item_id)) : [];
  return <><PageIntro number="04" label="An evidence-led observation" title="THE SIGNAL" description="A research observation from the loaded evidence. Read the pattern, inspect its sources, and weigh what remains unknown." />
    {finding.state === "insufficient" ? <section className="signal-framework">
      <p className="eyebrow accent">Insufficient evidence</p>
      <h2>First the evidence. Then the signal.</h2>
      <p>{finding.reason}</p>
      <SectionLink href="/patterns">Inspect the pattern index</SectionLink>
    </section> : <>
      <section id="observation" className="signal-framework">
        <div className="signal-status eyebrow"><span className="status-dot" />{finding.label} / Inferred analysis</div>
        <h2>{finding.signal.thesis}</h2>
        <p>{finding.pattern.description}</p>
        <p className="research-note">{finding.label === "Candidate" ? "Insufficient evidence for a supported conclusion. This candidate describes recurrence in the inspected material; it does not establish novelty, effectiveness, or a winning strategy." : "Supported within the scope of the loaded evidence; this does not establish novelty or causal effectiveness."}</p>
        <p className="research-note">Evidence chain validated against the loaded dataset. Validation checks provenance and exact text; it does not independently verify source claims.</p>
        <nav aria-label="Signal evidence chain" className="research-note">
          <a href="#observation">Signal</a> → <Link href={`/patterns#${finding.pattern.id}`}>Pattern</Link> → <a href="#signal-mechanics">Launch mechanics</a> → <a href="#signal-response">Public response</a> → <a href="#signal-coverage">Campaigns</a> → <a href="#signal-support">Content</a> → <a href="#signal-sources">Source</a>
        </nav>
        <dl className="research-meta" aria-label="Evidence coverage">
          <div><dt>Supporting campaigns</dt><dd>{finding.counts.campaigns} / {finding.counts.totalCampaigns}</dd></div>
          <div><dt>Underlying launch events</dt><dd>{finding.counts.events}</dd></div>
          <div><dt>Supporting content items</dt><dd>{finding.counts.content}</dd></div>
          <div><dt>Campaigns with counterevidence</dt><dd>{finding.counts.counterevidence}</dd></div>
        </dl>
        <p className="research-note">{finding.counts.insufficient} campaigns have insufficient item coverage. Categories may overlap: a campaign can have both supporting and missing material. Platform versions of one event do not count as independent evidence.</p>
      </section>

      <section className="pattern-entry" aria-labelledby="signal-pattern">
        <p className="eyebrow accent">Why it surfaced / The underlying pattern</p>
        <h2 id="signal-pattern">{finding.pattern.title}</h2>
        <p>{finding.pattern.confidence_reason}</p>
        <SectionLink href={`/patterns#${finding.pattern.id}`}>Inspect this pattern</SectionLink>
        <p className="research-note">Candidate means a recurring observation eligible for further research. Supported means the pipeline has established stronger support; the current methodology caps automated findings at Candidate. Counterevidence and insufficient evidence describe coverage, not stronger confidence levels.</p>
      </section>

      <section id="signal-mechanics" className="pattern-entry" aria-labelledby="mechanism-title">
        <p className="eyebrow accent">The mechanism</p>
        <h2 id="mechanism-title">Observed roles inside each launch event</h2>
        <p>The pipeline compares source-cited cues across content grouped into the same launch event. Timing is reported only when both platforms have precise timestamps.</p>
        {finding.mechanics.map(item => <LaunchMechanicsView key={item.event_id} mechanics={item} research={research} />)}
      </section>

      <section id="signal-response" className="pattern-entry" aria-labelledby="response-title">
        <p className="eyebrow accent">Observed public response</p>
        <h2 id="response-title">Snapshot evidence, without a performance claim</h2>
        <p>{signalResponses.filter(response => response.verification_state === "verified_source_data").length} / {finding.pattern.supporting_content.length} supporting content items have a verified public-response snapshot.</p>
        <p className="research-note">Insufficient comparable coverage for a performance-related signal. X counters are frequently abbreviated, LinkedIn exposes only comment totals in this corpus, and the snapshots were observed after publication. No engagement rate, platform comparison, or causal relationship is calculated.</p>
        <PublicResponseView records={signalResponses} />
      </section>

      <section id="signal-support" className="pattern-entry" aria-labelledby="support-title">
        <p className="eyebrow accent">Supporting evidence</p>
        <h2 id="support-title">From campaigns to source text</h2>
        <p id="signal-sources" className="research-note">Each passage below is an exact retained source span. The extracted observation is an interpretation, shown separately from the quotation.</p>
        {finding.supportingItems.map(({ evidence, content, campaign, capture, span }) => <article className="evidence-item" key={content.id}>
          <h3><Link href={`/launches/${campaign.id}`}>{campaign.company}</Link> / <Link href={`/launches/${campaign.id}#${content.id}`}>{content.platform ?? content.type}</Link></h3>
          <p className="research-note">{contentEvidenceState(content)} · {content.text_scope} · {content.source_section.replaceAll("_", " ")}</p>
          {evidence.map(claim => <div key={claim.id}><p>{claim.observation}</p><p className="eyebrow">{claim.basis.replaceAll("_", " ")} · Inferred pattern support</p></div>)}
          <SourceQuote span={span} capture={capture} />
          <SourceVerificationDetails><p className="research-note">{content.verification_note}</p></SourceVerificationDetails>
        </article>)}
      </section>

      <section id="signal-counterevidence" className="pattern-entry" aria-labelledby="counter-title">
        <p className="eyebrow accent">Counterevidence</p>
        <h2 id="counter-title">Exceptions and contrary material</h2>
        {finding.counterevidence.length === 0 ? <p>No counterevidence has been established in the inspected material. Missing or incomplete material is not evidence that the pattern is universal.</p> : finding.counterevidence.map(example => <article className="evidence-item" key={`${example.campaign_id}:${example.kind}`}>
          <h3><Link href={`/launches/${example.campaign_id}`}>{example.campaign.company}</Link></h3>
          <p className="eyebrow">{example.kind === "contradicts" ? "Contrary wording" : "Pattern not observed in complete material"}</p>
          <p>{example.explanation}</p>
          {example.content.map(item => <p key={item.id} className="research-note"><Link href={`/launches/${item.campaign_id}#${item.id}`}>{item.platform ?? item.type} content</Link> · <a href={item.source_url} target="_blank" rel="noreferrer">Original source ↗</a> · {contentEvidenceState(item)}</p>)}
          {example.quotes.map(({ span, capture }) => <SourceQuote key={`${span.content_item_id}:${span.start}:${span.end}`} span={span} capture={capture} />)}
        </article>)}
        <p className="research-note">A complete nonmatching item is a potential counterexample, not a conclusive refutation. Excerpt-only nonmatches remain insufficient evidence.</p>
      </section>

      <section id="signal-coverage" className="pattern-entry" aria-labelledby="coverage-title">
        <p className="eyebrow accent">Evidence coverage</p>
        <h2 id="coverage-title">Every campaign, including the unknowns</h2>
        <ul className="coverage-list">{finding.coverage.map(row => <li key={row.campaign_id}>
          <Link href={`/launches/${row.campaign_id}`}>{row.campaign.company}</Link>
          <span className="eyebrow">{row.label}</span>
          <p>{row.explanation}</p>
          {row.unknown.map(item => <p className="research-note" key={item.id}>Insufficient evidence: <Link href={`/launches/${item.campaign_id}#${item.id}`}>{item.platform ?? item.type} content</Link> · <a href={item.source_url} target="_blank" rel="noreferrer">Source ↗</a> · {contentEvidenceState(item)}</p>)}
        </li>)}</ul>
      </section>

      <section id="signal-limitations" className="pattern-entry" aria-labelledby="limits-title">
        <p className="eyebrow accent">Research limits</p>
        <h2 id="limits-title">What this observation cannot establish</h2>
        <ul className="limitations">{finding.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>
      </section>
    </>}
  </>;
}
