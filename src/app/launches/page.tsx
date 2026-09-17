import type { Metadata } from "next";
import { PageIntro } from "@/components/editorial";
import { LaunchIndex } from "@/components/launch-index";
import { getResearch } from "@/lib/research";
export const metadata: Metadata = { title: "Launches" };
export default async function Launches() {
  const { dataset } = await getResearch();
  return <><PageIntro number="01" label="The launch index" title="Launches, examined." description="A source-led index of Social Capital Inc.’s launch portfolio. Inspect the public material and separate published claims from research interpretations." />
    <p className="research-note">{dataset.campaigns.length} verified portfolio entries · {dataset.content.length} source records · {(dataset.responses ?? []).filter(record => record.verification_state === "verified_source_data").reduce((sum, record) => sum + record.metrics.length, 0)} verified public-response observations. Dates are portfolio months; response values are retrieval-time snapshots.</p>
    <LaunchIndex campaigns={dataset.campaigns} content={dataset.content} />
  </>;
}
