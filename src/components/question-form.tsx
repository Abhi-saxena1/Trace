"use client";

import { useState } from "react";
import type { QuestionResult } from "@/lib/research/questions";
import { SourceQuote } from "./research-evidence";

export function QuestionForm() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    <textarea id="question" required minLength={2} maxLength={500} rows={4} disabled={busy} value={question} onChange={event => { setQuestion(event.target.value); setResult(null); setError(null); }} placeholder="Search a company, claim, or mechanism…" aria-describedby="question-note" />
    <div className="question-bottom"><p id="question-note">Source search only. Queries are sent to this app, not an LLM, and are not saved by TRACE.</p><button className="button button-primary" type="submit" disabled={busy || question.trim().length < 2}>{busy ? "Searching sources…" : "Find source excerpts"} <span aria-hidden="true">↗</span></button></div>
    <p className="form-status" role="status">{error ?? result?.message ?? "Search the retained source excerpts. Generated answers are not enabled."}</p>
    {result?.matches.map(match => <article className="evidence-item" key={match.content_item_id}><h2>{match.campaign} / {match.author}</h2><SourceQuote span={match.span} capture={match.capture} /></article>)}
  </form>;
}
