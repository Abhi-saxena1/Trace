# TRACE research audit

Reviewed against the bundled dataset and deterministic pipeline on 2026-09-17.

## Corpus coverage

| Campaign | Product | Portfolio month | Social items | Platforms | Publication timestamps | Exact captures | Metrics | Media records |
|---|---|---:|---:|---|---|---:|---:|---:|
| PlayerZero | PlayerZero | 2026-03 | 1 | X | X exact; LinkedIn not retained | 1 | 0 | 0 |
| Wispr Flow | Wispr Flow | 2026-02 | 2 | X, LinkedIn | Both exact | 1 | 0 | 0 |
| Poly AI | unavailable | 2026-02 | 1 | X | X exact; LinkedIn not retained | 1 | 0 | 0 |
| Airwallex | unavailable | 2025-12 | 2 | X, LinkedIn | Both exact | 2 | 0 | 0 |
| Gamma | Gamma | 2025-11 | 2 | X, LinkedIn | Both exact | 2 | 0 | 0 |
| Cartesia | Sonic-3 | 2025-10 | 2 | X, LinkedIn | Both exact | 2 | 0 | 0 |
| Deel | unavailable | 2025-10 | 2 | X, LinkedIn | Both exact | 2 | 0 | 0 |
| Superblocks | Clark | 2025-05 | 1 | X | X exact; LinkedIn not retained | 1 | 0 | 0 |
| Icon | Icon | 2025-02 | 2 | X, LinkedIn | Both exact | 2 | 0 | 0 |

All nine campaigns have a source-verified portfolio month and author/platform/source metadata. The corpus has 24 source records: nine portfolio metadata pages and 15 social posts. Fourteen social posts have retained exact excerpts. Wispr Flow's X source identity and displayed date are retained, but exact text is unavailable. All captured text is excerpt scope. Public-response snapshots are audited separately in [PERFORMANCE.md](PERFORMANCE.md); no media record is imported.

Creator names are recorded as source metadata. Hook, narrative, positioning, CTA, participation, proof, product and content-sequence fields exist only when a deterministic rule has an exact cited span. Unmatched fields remain null.

## Launch mechanics

Each of the nine conservative launch events has one normalized mechanics record connecting its campaign, content, platform, publication evidence and source. Canonical public X status and LinkedIn activity identifiers supply 15 verified UTC creation instants with explicit source provenance. Six campaigns have paired exact timestamps, so their platform order and elapsed time can be calculated. PlayerZero, Poly AI and Superblocks remain unresolved because no LinkedIn item is retained. See [PUBLICATION_AUDIT.md](PUBLICATION_AUDIT.md) for the complete audit and method.

The sequence analyzer also handles lower-precision evidence without overstating it: different verified calendar dates establish day-level order without a duration; same-day date-only evidence leaves order unresolved. Campaign month and record order are never timing inputs.

Source-cited mechanics found in the retained material:

- Comment-to-receive: Wispr Flow, Cartesia, Icon.
- Research resource offered: Gamma.
- X introduction or credibility cue paired with LinkedIn participation/resource: Cartesia, Gamma, Icon.
- Cross-platform continuity of the previously untold story frame: Airwallex, Deel.

No visual transformation, creator-network coordination, referral mechanics, performance effect, or recurring timing strategy can be established from the loaded records. The timestamp audit describes publication order only; it does not change the pattern or Signal.

## Hypotheses evaluated

The pipeline evaluates all supported recurring rules and retains their coverage rather than applying an opaque numerical score.

| Hypothesis | Result | Reason |
|---|---|---|
| Financial milestones recur as credibility cues | Weak pattern | Broad lexical cue; not an operational mechanism. |
| First-in-category positioning recurs | Weak pattern | Broad positioning language. |
| Product introductions pair with credibility | Candidate pattern | Structural but contained within single items. |
| Previously untold stories recur | Candidate pattern | Narrative recurrence across Airwallex and Deel. |
| Comments gate delivery of a benefit | Candidate pattern | Participation mechanism across three events. |
| X credibility/introduction pairs with LinkedIn participation/resource | Selected candidate signal | A cross-platform operational combination across three events, with two explicit continuity exceptions and four campaigns lacking sufficient paired evidence. |

## Signature signal

The current corpus suggests a candidate division of content roles: in Cartesia, Gamma and Icon, a retained X excerpt foregrounds product introduction or credibility while a retained LinkedIn excerpt carries a resource or audience-participation mechanism. This is a descriptive combination, not evidence that the platform choice caused engagement or that the complete posts follow this structure.

Airwallex and Deel are counterexamples to treating the mechanism as universal: their paired retained excerpts preserve the same previously untold personal-story frame. Wispr Flow cannot be evaluated as a paired transformation because its X text is unavailable. PlayerZero, Poly AI and Superblocks have no LinkedIn content item in the supplied corpus.
