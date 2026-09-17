import Link from "next/link";
import { PageIntro } from "@/components/editorial";
export default function NotFound() { return <><PageIntro number="404" label="Outside the index" title="No trace here." description="This page could not be found. Return to the research overview to pick up the trail." /><Link className="button button-primary mb-24" href="/">Return to research <span aria-hidden="true">→</span></Link></>; }
