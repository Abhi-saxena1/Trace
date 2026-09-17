import type { Metadata } from "next";
import { EmptyState, PageIntro } from "@/components/editorial";
import { getResearch } from "@/lib/research";
import { PatternEvidence } from "@/components/research-evidence";
export const metadata: Metadata = { title: "Patterns" };
export default async function Patterns() {
  const research = await getResearch();
  return <><PageIntro number="02" label="The pattern index" title="Beyond the one-off." description="Recurring structures in the loaded source excerpts. Descriptive interpretations, with evidence and missing coverage exposed." />
    <section aria-label="Pattern index"><div className="index-caption eyebrow"><span>Rule-based findings / No causal claims</span><span>{research.patterns.length} recurring patterns</span></div>
      {research.patterns.length ? research.patterns.map(pattern => <PatternEvidence key={pattern.id} pattern={pattern} research={research} />)
        : <EmptyState label="No recurring matches" title="Repetition needs evidence."><p>No rule currently matches material from at least two distinct campaigns.</p></EmptyState>}
      <div className="method-note"><span className="eyebrow accent">Confidence methodology</span><p>Generic cues are weak. Structural recurrence requires two campaigns and two distinct launch events. Automated findings remain candidates at most; contrary evidence can lower confidence. Exact source captures are required for quotations. Excerpts cannot establish absence, and platform versions do not add independent events.</p></div>
    </section></>;
}
