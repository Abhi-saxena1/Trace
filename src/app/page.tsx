import Link from "next/link";
import { Arrow, SectionLink } from "@/components/editorial";
import { getResearch } from "@/lib/research";

export default async function Home() {
  const research = await getResearch();
  return <>
    <section className="hero">
      <div className="hero-kicker eyebrow"><span className="status-dot" />Independent research / In development</div>
      <h1>Reverse-engineer<br />the mechanics behind<br /><em>public launches.</em></h1>
      <div className="hero-bottom"><p>TRACE studies public launch material to uncover recurring patterns in narrative, positioning, content, creators and distribution.</p><div className="hero-actions"><Link href="/launches" className="button button-primary">Read a Launch <Arrow /></Link><Link href="/ask" className="text-link">Ask the Dataset <Arrow diagonal /></Link></div></div>
      <span className="hero-margin eyebrow" aria-hidden="true">Look closer. Connect the dots.</span>
    </section>
    <dl className="research-meta"><div><dt>Research focus</dt><dd>Social Capital Inc.</dd></div><div><dt>Source material</dt><dd>{research.dataset.content.length} source records</dd></div><div><dt>Public response</dt><dd><span className="status-dot" />{research.performance.covered_content_items} / {research.performance.total_social_content_items} content snapshots</dd></div><div><dt>Research stage</dt><dd>Mechanics + response / Candidate finding</dd></div></dl>
    <section className="signal-preview"><div className="section-aside"><p className="eyebrow accent">01 / The signal</p><p>The pattern beneath<br />the noise.</p></div><div className="signal-copy"><div className="status-label eyebrow">{research.signal?.confidence ?? "Awaiting evidence"}</div><h2>{research.signal?.thesis ?? "Research in progress."}</h2><p>{research.signal ? "A rule-based candidate from the loaded excerpts. Inspect its sources, campaign coverage, potential counterexamples and limitations before drawing conclusions." : "No qualifying structural candidate is supported by the loaded material."}</p><SectionLink href="/signal">Inspect the evidence</SectionLink></div></section>
    <section className="launch-preview"><div className="section-heading"><div><p className="eyebrow accent">02 / The launch index</p><h2>Every launch leaves a trace.</h2></div><SectionLink href="/launches">View the index</SectionLink></div><div className="index-empty"><span className="eyebrow">{research.dataset.campaigns.length} portfolio entries</span><p>Verified sources. Visible limits.</p><span>Portfolio pages, linked social posts and short evidence excerpts. Every interpretation leads back to its source.</span></div></section>
    <section className="research-lenses"><p className="eyebrow">The research lens</p><div>{["Narrative", "Positioning", "Content", "Creators", "Distribution"].map((lens, i) => <span key={lens}><small>0{i + 1}</small>{lens}</span>)}</div></section>
  </>;
}
