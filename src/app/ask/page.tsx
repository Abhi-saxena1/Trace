import type { Metadata } from "next";
import { PageIntro } from "@/components/editorial";
import { QuestionForm } from "@/components/question-form";
export const metadata: Metadata = { title: "Ask the Dataset" };
export default function Ask() { return <><PageIntro number="05" label="Interrogate the research" title="ASK THE DATASET" description="Find source excerpts in the research dataset. This is literal text retrieval, with citations you can inspect; it does not generate answers." /><QuestionForm /><div className="method-note"><span className="eyebrow accent">Evidence, not conjecture</span><p>Search covers short retained excerpts, not entire posts or videos. A missing result is a coverage limitation, not proof that the original source lacks an answer.</p></div></>; }
