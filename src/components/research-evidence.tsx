import Link from "next/link";
import type { ReactNode } from "react";
import type { LaunchMechanics, Pattern, PublicResponseRecord, ResearchSnapshot, SourceSpan, SourceCapture } from "@/lib/research/types";
import { isVerifiedQuote } from "@/lib/research/source-text";
import { spanFor } from "@/lib/research/extraction/deterministic";

export function SourceQuote({ span, capture }: { span: SourceSpan; capture?: SourceCapture }) {
  if (!isVerifiedQuote(span, capture)) return <p className="research-note">Quote unavailable: exact source text could not be validated.</p>;
  return <figure className="source-quote">
    <blockquote>{span.quote}</blockquote>
    <figcaption>
      <a href={span.source_url} target="_blank" rel="noreferrer">Original source ↗</a>
      {span.retrieved_from_url !== span.source_url && <a href={span.retrieved_from_url} target="_blank" rel="noreferrer">Verified via campaign embed ↗</a>}
    </figcaption>
  </figure>;
}

export function SourceVerificationDetails({ children }: { children: ReactNode }) {
  return <details className="verification-details">
    <summary>Source verification details</summary>
    <div className="verification-details-body">{children}</div>
  </details>;
}

export function LaunchMechanicsView({ mechanics, research, compactLimitations = false }: { mechanics: LaunchMechanics; research: ResearchSnapshot; compactLimitations?: boolean }) {
  const company = mechanics.campaign_ids.map(id => research.dataset.campaigns.find(c => c.id === id)?.company ?? id).join(" + ");
  return <article id={mechanics.event_id} className="evidence-item launch-mechanics-item">
    <h3>{company} / {mechanics.event_id}</h3>
    <p className="eyebrow">Platform sequence: {mechanics.platform_sequence.replaceAll("_", " ")} · {mechanics.sequence_basis.replaceAll("_", " ")}</p>
    <ul className="limitations">{mechanics.content.map(item => <li key={item.content_item_id}>
      <Link href={`/launches/${mechanics.campaign_ids[0]}#${item.content_item_id}`}>{item.platform ?? "Unknown platform"}</Link>
      {` · Published: ${item.timestamp ?? "unavailable"} · Sequence position: ${item.sequence_position ?? "unavailable"} · Delta: ${item.time_delta_minutes === null ? "unavailable" : `${item.time_delta_minutes} minutes`}`}
      {" · "}<a href={item.source_url} target="_blank" rel="noreferrer">Source ↗</a>
    </li>)}</ul>
    {mechanics.participation.map(item => <div key={`${item.content_item_id}:${item.mechanism}`}>
      <p className="research-note">Participation mechanism / {item.mechanism.replaceAll("_", " ")}</p>
      <SourceQuote span={item.evidence} capture={research.dataset.captures.find(c => c.id === item.evidence.capture_id)} />
    </div>)}
    {mechanics.transformations.map(item => <div key={`${item.from_content_id}:${item.to_content_id}:${item.kind}`}>
      <p>{item.description}</p><p className="eyebrow">Inferred analysis / {item.kind.replaceAll("_", " ")}</p>
      <div className="mechanics-evidence-grid">{item.evidence.map(span => {
        const content = research.dataset.content.find(candidate => candidate.id === span.content_item_id);
        return <div key={`${span.content_item_id}:${span.start}`}><p className="eyebrow accent">{content?.platform ?? "Source"} evidence</p><SourceQuote span={span} capture={research.dataset.captures.find(c => c.id === span.capture_id)} /></div>;
      })}</div>
    </div>)}
    {!compactLimitations && <p className="research-note">{mechanics.limitations.join(" ")}</p>}
  </article>;
}

export function PublicResponseView({ records }: { records: PublicResponseRecord[] }) {
  return <div>{records.map(record => <article className="evidence-item" key={record.id}>
    <h3>{record.platform}</h3>
    {record.verification_state === "verified_source_data" ? <>
      <p className="eyebrow accent">Verified snapshot / Observed {record.observed_at}</p>
      <dl className="extraction-fields">{record.metrics.map(metric => <div key={metric.type}>
        <dt>{metric.type}</dt><dd>{metric.display_value}</dd>
      </div>)}</dl>
    </> : <>
      <p className="eyebrow">Engagement not verified / {record.verification_state.replaceAll("_", " ")}</p>
      <p>No verified public engagement snapshot is currently available for this content item.</p>
    </>}
    <a className="text-link" href={record.source_url} target="_blank" rel="noreferrer">Inspect metric source ↗</a>
    <SourceVerificationDetails>
      <p className="research-note">{record.note}</p>
      {record.metrics.some(metric => metric.precision === "abbreviated") && <p className="research-note">Displayed abbreviations are preserved exactly; no integer value is inferred.</p>}
    </SourceVerificationDetails>
  </article>)}</div>;
}

function isSharedPatternLimitation(limitation: string) {
  return /purposively selected|representative sample|excerpts were selected manually|only retained excerpts|unknown coverage|cross-posts|no visual inspection/i.test(limitation);
}

function limitationLabel(limitation: string) {
  if (/timestamp|publication sequence|time delta/i.test(limitation)) return "Timing limitation";
  if (/transform|visual|creator/i.test(limitation)) return "Transformation limitation";
  if (/response|performance/i.test(limitation)) return "Response limitation";
  return "Interpretation limitation";
}

export function PatternEvidence({ pattern, research }: { pattern: Pattern; research: ResearchSnapshot }) {
  const name = (id: string) => research.dataset.campaigns.find(c => c.id === id)?.company ?? id;
  const items = pattern.supporting_content.map(id => research.dataset.content.find(c => c.id === id)!);
  const responseCoverage = new Set((research.dataset.responses ?? []).filter(response => response.verification_state === "verified_source_data" && pattern.supporting_content.includes(response.content_item_id)).map(response => response.content_item_id)).size;
  const specificLimitations = pattern.limitations.filter(limitation => !isSharedPatternLimitation(limitation));
  const counterevidenceCount = new Set(pattern.counterexamples.map(example => example.campaign_id)).size;
  const insufficientCount = pattern.coverage.filter(row => row.evidence_state === "insufficient_evidence").length;
  const coveragePriority: Record<Pattern["coverage"][number]["evidence_state"], number> = { counterevidence: 0, mixed: 1, insufficient_evidence: 2, supported_evidence: 3 };
  const coverageRows = [...pattern.coverage].sort((a, b) => coveragePriority[a.evidence_state] - coveragePriority[b.evidence_state]);
  return <article id={pattern.id} className="pattern-entry">
    <p className="eyebrow accent">{pattern.confidence} / Inferred analysis</p>
    <h2>{pattern.title}</h2>
    <p>{pattern.description}</p>
    <p className="research-note">{pattern.confidence_reason}</p>
    <dl className="research-meta pattern-coverage" aria-label={`${pattern.title} coverage`}>
      <div><dt>Supporting campaigns</dt><dd>{pattern.supporting_campaigns.length}</dd></div>
      <div><dt>Launch events</dt><dd>{pattern.supporting_events.length}</dd></div>
      <div><dt>Supporting content items</dt><dd>{items.length}</dd></div>
      <div><dt>Counterevidence</dt><dd>{counterevidenceCount}</dd></div>
    </dl>
    <p className="research-note">{insufficientCount} campaigns have insufficient coverage. Missing material is not counted as negative evidence.</p>
    <p className="research-note">Public-response coverage: {responseCoverage} / {pattern.supporting_content.length} supporting content items.</p>
    <details><summary>Inspect launch mechanics</summary>{pattern.supporting_events.map(id => <LaunchMechanicsView key={id} mechanics={research.mechanics.find(item => item.event_id === id)!} research={research} compactLimitations />)}</details>
    <details>
      <summary>Inspect supporting evidence and source links</summary>
      {items.map(item => {
        const evidence = research.evidence.filter(e => e.pattern_id === pattern.id && e.content_item_id === item.id);
        return <div className="evidence-item" key={item.id}>
          <Link href={`/launches/${item.campaign_id}#${item.id}`}>{name(item.campaign_id)} / {item.platform}</Link>
          <p className="research-note">{item.source_section === "video_transcript" ? "Video transcript excerpt" : "Post excerpt"} · {item.text_scope}</p>
          <p className="research-note">{evidence.map(e => e.observation).join(" · ")}</p>
          <SourceQuote span={spanFor(item, 0, item.text!.length)} capture={research.dataset.captures.find(c => c.id === item.source_capture_id)} />
          <SourceVerificationDetails><p className="research-note">{item.verification_note}</p></SourceVerificationDetails>
        </div>;
      })}
    </details>
    <details>
      <summary>Counterevidence &amp; coverage — {counterevidenceCount} counterevidence, {insufficientCount} insufficient</summary>
      <p className="research-note">Complete nonmatching items are potential counterexamples, not conclusive refutations. Excerpt-only nonmatches remain unknown.</p>
      <ul className="coverage-list">{coverageRows.map(row => <li key={row.campaign_id}>
        <Link href={`/launches/${row.campaign_id}`}>{name(row.campaign_id)}</Link>
        <span className="eyebrow">{row.evidence_state.replaceAll("_", " ")}</span>
        <p>{row.explanation}</p>
        {row.nonmatching_content_ids.map(id => <Link className="research-note" key={id} href={`/launches/${row.campaign_id}#${id}`}>Inspect nonmatching item: {id} →</Link>)}
        {row.contradicting_content_ids.map(id => <Link className="research-note" key={id} href={`/launches/${row.campaign_id}#${id}`}>Inspect contrary wording: {id} →</Link>)}
        {row.unknown_content_ids.length > 0 && <p className="research-note">Unknown item coverage: {row.unknown_content_ids.join(", ")}</p>}
      </li>)}</ul>
      <p className="research-note">{counterevidenceCount} campaign(s) with counterevidence. Missing material is not counted as a counterexample.</p>
      {pattern.counterexamples.filter(example => example.kind === "contradicts").flatMap(example => example.spans.map(span => <SourceQuote key={`${span.content_item_id}:${span.start}`} span={span} capture={research.dataset.captures.find(c => c.id === span.capture_id)} />))}
    </details>
    {specificLimitations.length > 0 && <details><summary>Pattern-specific limitations</summary><ul className="limitations">{specificLimitations.map(limit => <li key={limit}><strong>{limitationLabel(limit)}:</strong> {limit}</li>)}</ul></details>}
  </article>;
}
