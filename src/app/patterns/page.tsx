import type { Metadata } from "next";
import { EmptyState, PageIntro } from "@/components/editorial";
import { getResearch } from "@/lib/research";
import { PatternEvidence } from "@/components/research-evidence";
export const metadata: Metadata = { title: "Patterns" };
export default async function Patterns() {
  const research = await getResearch();
  return <><PageIntro number="02" label="The pattern index" title="Beyond the one-off." description="Recurring structures in the loaded source excerpts. Descriptive interpretations, with evidence and missing coverage exposed." />
    <section aria-label="Pattern index"><div className="index-caption eyebrow"><span>Rule-based findings / No causal claims</span><span>{research.patterns.length} recurring patterns</span></div>
      <div className="method-note pattern-methodology"><span className="eyebrow accent">Corpus &amp; methodology limits</span><div>
        <p><strong>Coverage limitation:</strong> This purposively selected portfolio is not representative. Manually retained excerpts can inflate recurrence or suppress counterexamples; an excerpt establishes an observed cue, not absence from a complete post.</p>
        <p><strong>Evidence limitation:</strong> Unknown coverage is not negative evidence. Platform cross-posts are grouped as one launch event and do not add independent support. Exact source captures remain required for quotations.</p>
        <p><strong>Transformation limitation:</strong> Text-only review does not establish visual treatment, creator networks, or research-to-video transformation.</p>
        <p><strong>Response limitation:</strong> Public-response snapshots are not launch-day values. Abbreviated X counters and LinkedIn comment-only coverage prevent sound comparative performance analysis. No causal inference is made.</p>
      </div></div>
      {research.patterns.length ? research.patterns.map(pattern => <PatternEvidence key={pattern.id} pattern={pattern} research={research} />)
        : <EmptyState label="No recurring matches" title="Repetition needs evidence."><p>No rule currently matches material from at least two distinct campaigns.</p></EmptyState>}
      <div className="method-note"><span className="eyebrow accent">Confidence methodology</span><p>Generic cues are weak. Structural recurrence requires two campaigns and two distinct launch events. Automated findings remain candidates at most; contrary evidence can lower confidence.</p></div>
    </section></>;
}
