# Research validation layer

This phase hardens the existing research pipeline. It adds no new pages, external services or dependencies.

## Source identity

`canonicalizeSourceUrl` separates an original display URL from source identity. It normalizes HTTP/HTTPS, fragments, trailing slashes, default ports, unreserved path encodings, query order and known tracking parameters. It recognizes Twitter/X status IDs (including mobile hosts and photo/video suffixes), LinkedIn activity IDs, and the known Social Capital hostname alias. Different meaningful query values and case-sensitive paths remain distinct. Unknown redirect aliases are not guessed.

Ingestion rejects duplicate canonical sources rather than letting them add evidence. Graph source nodes use the same canonical identity. Display links keep their original URL.

## Exact quotations

`source-captures.json` retains 14 short, contiguous excerpts matched against public-page text retrieved during the 2026-09-17 review. Captures record the original source, retrieval location, content ID, retrieval date, representation and SHA-256 digest. These are excerpts of the retrieval tool's textual representation, not raw HTML archives or independently authenticated original posts.

Content must match its capture exactly, including whitespace and punctuation. Extraction spans must match both the content and its capture at the declared offsets. The shared display gate withholds any quote that fails those checks. Dossiers, pattern evidence and source search all use this gate. Capture digests detect accidental changes; they are not proof of publisher authenticity.

The Wispr Flow X item retains its source link and identity metadata, but its prior normalized excerpt is withheld because a contiguous exact match could not be recovered across the embedded mention. The LinkedIn excerpt preserves the retrieved nonbreaking whitespace instead of normalizing it. No missing quote is reconstructed.

## Underlying events and cross-posts

Platform items link to explicit launch-event records. Current portfolio-linked social items are conservatively grouped as one event per campaign, with rationale and source provenance. This is an evidence-counting policy, not a claim that every platform version has identical wording. A reviewed event may span campaigns; one event appearing in several campaigns still cannot establish independent recurrence.

Pattern results expose campaign, event and platform-item counts separately. At least two campaigns and two events are required. Source content remains available per platform. No automatic semantic claim matching is attempted.

## Counterevidence and confidence

Each rule examines all campaigns and their retained content. Coverage distinguishes supporting evidence, counterevidence, insufficient evidence and mixed coverage:

- A positive match supports the rule only in that retained text.
- A complete nonmatching text is a potential counterexample, not a logical contradiction.
- Explicit contrary wording is recorded separately with exact source spans; an excerpt can establish that wording even when it cannot establish absence.
- An incomplete nonmatch or unavailable source stays insufficient evidence.
- Positive and negative platform versions within one campaign remain visible together.

Generic rules remain weak. Explicit contrary wording, or at least as many nonmatching events as supporting events, limits a structural finding to weak. Other structural recurrence is capped at candidate. The automatic pipeline never promotes a result to supported merely because more examples match. No effectiveness or causality inference is made. Negative relationships are retained in the provenance graph.

Contradiction detection is deliberately narrow and lexical. It requires human interpretation and can miss paraphrases, irony, scope differences and omitted context. All current production captures are excerpts, so non-observation cannot establish campaign-level absence.

## Publication gate and states

The pipeline clones inputs, isolates provider arguments and verifies provider identity. Every analyzable item must have exactly one extraction. Every observation has an interpretation basis and a source span. Deterministic outputs are checked against their actual rule execution; AI-labeled outputs cannot silently supply deterministic support.

`validateResearch` validates the dataset, captures and extraction provenance, then recomputes expected evidence, patterns, coverage, counterexamples, signal candidates and graph relationships. An orphaned claim, altered quote, fabricated signal, hidden counterexample, unsupported confidence label or dangling graph relationship causes publication to fail.

Source identity verification is separate from retrieval and quote availability. Labels distinguish verified source metadata, retrieved but unverified data, exact verified excerpts, deterministic/AI interpretations, inferred analysis and missing data. Verification of wording does not verify the author's business claims.

Publication timing is also separate from source-text capture. Every content item carries a publication value, precision, original source URL, verification status and evidence note. Canonical X status and LinkedIn activity identifiers can supply exact UTC creation instants; unsupported identifiers remain unavailable. Dataset validation rejects verified timestamps without provenance, precision/value mismatches, or publication sources that do not match the content source. Sequence logic uses only verified publication evidence. It supports exact deltas, day-level ordering without a duration, same-day unresolved states and explicit missing-platform reasons. It never falls back to campaign month, record order, retrieval time or the current clock. The corpus audit is in [PUBLICATION_AUDIT.md](PUBLICATION_AUDIT.md).

## Files changed in this phase

- Added `src/data/source-captures.json`.
- Updated `src/data/verified-sources.ts`.
- Added `src/lib/research/source-identity.ts`, `source-text.ts`, and `findings-validation.ts`.
- Updated `src/lib/research/types.ts`, `validation.ts`, `pipeline.ts`, and `questions.ts`.
- Updated `src/lib/research/extraction/deterministic.ts`, `patterns/detect.ts`, `signal/generate.ts`, and `evidence/graph.ts`.
- Updated `src/components/research-evidence.tsx`, `question-form.tsx`, `src/app/launches/[id]/page.tsx`, and `src/app/patterns/page.tsx` only to apply quote validation and expose evidence states/counts.
- Updated `tests/research.test.ts` and `tsconfig.test.json`.
- Added this report and linked it from `README.md`.

## Verification commands

Run from the repository root:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:smoke
```

The smoke command requires the app to be running (`npm run dev`) and checks the existing pages, all nine dossiers, the 404 and research/search APIs. Synthetic fixtures are isolated in tests and never imported by the application dataset.

## Results — 2026-09-17

- `npm run typecheck`: passed, exit 0.
- `npm run lint`: passed, exit 0, no reported warnings or errors.
- `npm test`: passed, 30 tests, zero failures. Fourteen new validation cases extend the original sixteen, with existing fixtures updated for captures/events and candidate-only confidence.
- `npm run build`: passed, exit 0; all 20 static outputs generated, including nine launch dossiers. Both API routes remain dynamic.
- `npm run test:smoke`: passed against the running development server: six main pages, nine dossiers, custom 404, research API, source search and invalid-input responses.
- Browser: inspected the Wispr Flow missing-quote state and source-search results with exact source links. No warnings/errors appeared in the inspected fresh test tab's console.

No dependency was added, no UI was redesigned, and no commits were pushed. The production data still has nine campaigns and 24 source records. Fourteen social excerpts have exact retained captures; one social item's quote is withheld. Source identity, grouping and lexical interpretations remain subject to human review; this layer proves internal traceability and consistency, not the independent truth or effectiveness of launch claims.
