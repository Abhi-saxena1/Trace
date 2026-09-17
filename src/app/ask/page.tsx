import type { Metadata } from "next";
import { PageIntro } from "@/components/editorial";
import { QuestionForm } from "@/components/question-form";
export const metadata: Metadata = { title: "Ask the Dataset" };
export default function Ask() { return <><PageIntro number="05" label="Interrogate the research" title="ASK THE DATASET" description="Retrieve source excerpts or an explicitly supported structured pattern match. Results come from validated dataset relationships; TRACE does not generate answers." /><QuestionForm /><div className="method-note"><span className="eyebrow accent">Evidence, not conjecture</span><p>Literal search covers short retained excerpts, not entire posts or videos. Structured retrieval is limited to explicitly recognized validated patterns. A missing result is a coverage limitation, not proof that the original source lacks an answer.</p></div></>; }
