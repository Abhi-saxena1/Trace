import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResearch } from "@/lib/research";
import { PageIntro } from "@/components/editorial";
import { LaunchMechanicsView, PublicResponseView, SourceQuote, SourceVerificationDetails } from "@/components/research-evidence";
import { spanFor } from "@/lib/research/extraction/deterministic";
import { contentEvidenceState } from "@/lib/research/source-text";

export async function generateStaticParams() {
  return (await getResearch()).dataset.campaigns.map(campaign => ({ id: campaign.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getResearch()).dataset.campaigns.find(c => c.id === id)?.company ?? "Launch not found" };
}

export default async function Launch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const research = await getResearch();
  const campaign = research.dataset.campaigns.find(c => c.id === id);
  if (!campaign) notFound();
  const items = research.dataset.content.filter(c => c.campaign_id === id);
  const patterns = research.patterns.filter(p => p.supporting_campaigns.includes(id));
  const mechanics = research.mechanics.filter(item => item.campaign_ids.includes(id));
  const responses = (research.dataset.responses ?? []).filter(item => item.campaign_id === id);
  return <>
    <PageIntro number={campaign.launch_date ?? "—"} label="Portfolio month" title={campaign.company} description={campaign.description ?? "A source dossier: published material, retained excerpts and deterministic interpretations."} />
    <p className="research-note dossier-product"><span className="eyebrow">Product:</span> {campaign.product ?? "Not stated in source"}</p>
    {campaign.campaign_url && <a className="text-link" href={campaign.campaign_url} target="_blank" rel="noreferrer">Open portfolio source ↗</a>}
    <SourceVerificationDetails><p className="research-note">{campaign.provenance.note}</p></SourceVerificationDetails>
    <section className="pattern-entry" aria-label="Launch mechanics"><p className="eyebrow accent">Inferred analysis / Launch mechanics</p><h2>How the observed launch material relates</h2>
      {mechanics.map(item => <LaunchMechanicsView key={item.event_id} mechanics={item} research={research} />)}
    </section>
    <section className="pattern-entry" aria-label="Public response"><p className="eyebrow accent">Verified source data / Public response</p><h2>Observed response snapshots</h2>
      <p>Current public counters tied to the exact content source. These are retrieval-time snapshots, not launch-day performance.</p>
      <PublicResponseView records={responses} />
    </section>
    <section className="dossier" aria-label="Campaign sources">{items.map(item => {
      const extraction = research.extractions.find(e => e.content_item_id === item.id);
      const establishedFields = extraction ? Object.entries(extraction.fields).filter(([, observation]) => observation !== null) : [];
      const unavailableFields = extraction ? Object.entries(extraction.fields).filter(([, observation]) => observation === null).map(([field]) => field.replaceAll("_", " ")) : [];
      return <article className="source-entry" id={item.id} key={item.id}>
        <p className="eyebrow accent">{item.platform} / {item.source_section.replaceAll("_", " ")}</p>
        <h2>{item.author ?? "Author unavailable"}</h2>
        <p className="research-note">{item.author_handle ?? ""} · Published: {item.published_at ?? "exact date unavailable"} · Reviewed: {item.retrieved_at ?? "not retrieved"}</p>
        <p className="research-note">{contentEvidenceState(item)}{item.launch_event_id ? ` · Event: ${item.launch_event_id}` : ""}</p>
        {item.text && item.verified && item.source_capture_id ? <SourceQuote span={spanFor(item, 0, item.text.length)} capture={research.dataset.captures.find(c => c.id === item.source_capture_id)} /> : <a className="text-link" href={item.source_url} target="_blank" rel="noreferrer">Inspect source ↗</a>}
        <SourceVerificationDetails><p className="research-note">{item.verification_note}</p></SourceVerificationDetails>
        <p className="eyebrow">Text: {item.text_scope} · Public response: {responses.some(response => response.content_item_id === item.id && response.verification_state === "verified_source_data") ? "verified snapshot" : "unavailable"}</p>
        {extraction && <details><summary>Inspect extraction — interpretations, not source facts</summary>
          <p className="research-note">Evidence-backed interpretations for this source item.</p>
          <dl className="extraction-fields">{establishedFields.map(([field, observation]) => {
            if (!observation) return null;
            return <div key={field}>
              <dt>{field.replaceAll("_", " ")}</dt><dd>{observation.value}<p className="research-note">{observation.basis.replaceAll("_", " ")} · {observation.rule_id}</p><SourceQuote span={observation.evidence} capture={research.dataset.captures.find(c => c.id === item.source_capture_id)} /></dd>
            </div>;
          })}</dl>
          {unavailableFields.length > 0 && <div className="extraction-unavailable"><p className="eyebrow">Not established from this source</p><p className="research-note">{unavailableFields.join(" · ")}</p></div>}
          <h3>Observed sequence cues</h3><p className="research-note">{extraction.sequence.limitation}</p>
          <ol className="sequence-list">{extraction.sequence.observed_order.map(stage => <li key={stage}>{stage} <span className="research-note">at character {extraction.sequence.stages[stage]!.start}</span></li>)}</ol>
          <p className="research-note">Missing stages: {Object.entries(extraction.sequence.stages).filter(([, value]) => value === null).map(([stage]) => stage).join(", ") || "none"}.</p>
        </details>}
      </article>;
    })}</section>
    <div className="method-note"><span className="eyebrow accent">Related patterns</span><div>{patterns.length ? patterns.map(pattern => <p key={pattern.id}><Link className="text-link" href={`/patterns#${pattern.id}`}>{pattern.title} →</Link></p>) : <p>No recurring rule matches yet.</p>}</div></div>
    <Link className="text-link mb-12" href="/launches">← Return to the index</Link>
  </>;
}
