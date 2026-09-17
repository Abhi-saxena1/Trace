"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { QuestionResult } from "@/lib/research/questions";
import { SourceQuote } from "./research-evidence";

const DEMO_QUESTION = "Which campaigns combine a credibility cue on X with a participation mechanism on LinkedIn?";

export function QuestionForm() {
  const [question, setQuestion] = useState(DEMO_QUESTION);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null); setResult(null);
    try {
      const response = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Source search failed.");
      setResult(data as QuestionResult);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Source search failed. Please retry."); }
    finally { setBusy(false); }
  }
  return <form className="question-form" onSubmit={submit}>
    <label htmlFor="question" className="eyebrow">Your research question</label>
    <textarea id="question" required minLength={2} maxLength={500} rows={2} disabled={busy} value={question} onChange={event => { setQuestion(event.target.value); setResult(null); setError(null); }} placeholder="Search a company, claim, or supported pattern…" aria-describedby="question-note" />
    <div className="question-bottom"><p id="question-note">Literal source search plus explicitly supported structured pattern queries. Queries are sent to this app, not an LLM, and are not saved by TRACE.</p><button className="button button-primary" type="submit" disabled={busy || question.trim().length < 2}>{busy ? "Searching dataset…" : "Search dataset"} <span aria-hidden="true">↗</span></button></div>
    <p className="form-status" role="status">{error ?? result?.message ?? "Search the retained source excerpts. Generated answers are not enabled."}</p>
    <div ref={resultRef} className="question-results">
    {result?.mode === "source_search" && result.matches.map(match => <article className="evidence-item" key={match.content_item_id}><h2>{match.campaign} / {match.author}</h2><SourceQuote span={match.span} capture={match.capture} /></article>)}
    {result?.mode === "structured_pattern" && <section className="structured-result" aria-label="Structured dataset match">
      <p className="eyebrow accent">Structured dataset match</p><h2>{result.pattern_title}</h2>
      <dl className="research-meta" aria-label="Structured query coverage">
        <div><dt>Matched campaigns</dt><dd>{result.coverage.matched}</dd></div>
        <div><dt>Counterevidence</dt><dd>{result.coverage.counterevidence}</dd></div>
        <div><dt>Insufficient coverage</dt><dd>{result.coverage.insufficient}</dd></div>
      </dl>
      <div className="structured-campaign-grid">{result.matches.map(match => <article className="evidence-item" key={match.campaign_id}>
        <div className="structured-campaign-heading"><h2>{match.campaign}</h2><Link className="text-link" href={`/launches/${match.campaign_id}#${match.campaign_id}-launch`}>Open dossier <span aria-hidden="true">→</span></Link></div>
        <h3>X — credibility evidence</h3><p className="research-note">{match.x.interpretation}</p><SourceQuote span={match.x.span} capture={match.x.capture} />
        <h3>LinkedIn — participation evidence</h3><p className="research-note">{match.linkedin.interpretation}</p><SourceQuote span={match.linkedin.span} capture={match.linkedin.capture} />
      </article>)}</div>
      <details><summary>Campaigns with insufficient evidence</summary><ul className="limitations">{result.coverage.insufficient_campaigns.map(row => <li key={row.campaign_id}><strong>{row.campaign}:</strong> {row.explanation}</li>)}</ul></details>
    </section>}
    </div>
  </form>;
}
