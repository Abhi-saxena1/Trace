import type { Metadata } from "next";
import { PageIntro } from "@/components/editorial";
import { getResearch } from "@/lib/research";
import Link from "next/link";
export const metadata: Metadata = { title: "Network" };
export default async function Network() {
  const research = await getResearch();
  return <><PageIntro number="03" label="The evidence graph" title="Nothing launches alone." description="Follow each campaign through its launch event, mechanics, content, platform, extraction, pattern, signal and original source. These are provenance relationships, not inferred social connections." />
    <div className="index-caption eyebrow"><span>{research.graph.nodes.length} nodes / {research.graph.edges.length} relationships</span><a href="/api/research">Inspect research JSON ↗</a></div>
    <section className="network-stage relationship-index" aria-label="Evidence relationships">
      <p className="network-legend eyebrow">Campaign → Launch event → Mechanics → Content → Platform → Public response → Source → Pattern → Signal</p>
      {research.dataset.campaigns.map(campaign => <article className="relationship-row" key={campaign.id}>
        <Link className="campaign-title" href={`/launches/${campaign.id}`}>{campaign.company} ↗</Link>
        <div><p className="research-note">→ {research.mechanics.find(item => item.campaign_ids.includes(campaign.id))?.event_id} · {research.mechanics.find(item => item.campaign_ids.includes(campaign.id))?.platform_sequence.replaceAll("_", " ")} sequence</p>{research.dataset.content.filter(item => item.campaign_id === campaign.id).map(item => <div className="relationship-content" key={item.id}>
          <Link href={`/launches/${campaign.id}#${item.id}`}>{item.platform} / {item.source_section.replaceAll("_", " ")}</Link>
          <span className="research-note">{research.extractions.some(e => e.content_item_id === item.id) ? "→ Text extraction" : "→ Portfolio metadata"}</span>
          <a href={item.source_url} target="_blank" rel="noreferrer">Source ↗</a>
          <div>{research.patterns.filter(p => p.supporting_content.includes(item.id)).map(p => <Link className="relation-pattern" key={p.id} href={`/patterns#${p.id}`}>→ {p.title} · {p.confidence}</Link>)}</div>
        </div>)}</div>
      </article>)}
    </section>
  </>;
}
