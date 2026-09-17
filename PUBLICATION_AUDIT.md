# TRACE publication timestamp audit

Reviewed 2026-09-17. This audit covers all 15 retained social content items across the nine campaigns. Original public source URLs are preserved on every publication record.

## Verification method

TRACE decodes the creation instant carried by canonical platform identifiers only when the URL has the recognized public X status or LinkedIn activity form. X documentation pairs status ID `1346889436626259968` with `2021-01-06 18:40:40 UTC`; decoding its time component reproduces that instant. LinkedIn documentation pairs activity ID `6422861848709726123` with a `created.time` value at `2018-07-11 18:39:55 UTC`; decoding its time component reproduces the documented time to the activity/share creation boundary.

- X source identifiers use the platform epoch plus the high-order timestamp component.
- LinkedIn activity identifiers use the high-order timestamp component as Unix milliseconds.
- Existing X source-displayed days are cross-checked against each decoded UTC day.
- An unrecognized or inconsistent identifier produces unavailable evidence. No campaign month, page order, record order, retrieval date or current time is used as a fallback.

Reference examples: [X timeline response with ID and `created_at`](https://docs.x.com/x-api/users/get-timeline) and [LinkedIn activity URN with `created.time`](https://learn.microsoft.com/en-us/linkedin/compliance/integrations/compliance-events/decoration-change-with-activityurn).

## Campaign audit

| Campaign | X timestamp / precision | LinkedIn timestamp / precision | Sequence result | Delta | Unresolved reason |
|---|---|---|---|---:|---|
| PlayerZero | [2026-03-23T16:02:57.515Z](https://x.com/akoratana/status/2036111467016319074) / exact | unavailable / unknown | unresolved | unavailable | No retained LinkedIn content item supplies publication timestamp evidence. |
| Wispr Flow | [2026-02-23T17:09:47.165Z](https://x.com/tankots/status/2025981424470479008) / exact | [2026-02-23T17:16:39.273Z](https://www.linkedin.com/posts/tankots_we-offered-5-people-a-porsche-911-gt3-rs-activity-7431748842519318528-RY-e) / exact | X → LinkedIn | +6m 52s | — |
| Poly AI | [2026-02-17T15:59:43.424Z](https://x.com/polyaivoice/status/2023789465509015972) / exact | unavailable / unknown | unresolved | unavailable | No retained LinkedIn content item supplies publication timestamp evidence. |
| Airwallex | [2025-12-08T13:03:39.817Z](https://x.com/awxjack/status/1998015620072587516) / exact | [2025-12-08T13:06:35.175Z](https://www.linkedin.com/posts/jack-zhang-05200222_stripe-offered-to-acquire-us-for-12-billion-activity-7403782045119967232-9-Ne) / exact | X → LinkedIn | +2m 55s | — |
| Gamma | [2025-11-10T13:50:42.890Z](https://x.com/thisisgrantlee/status/1987880600661889356) / exact | [2025-11-10T13:51:31.202Z](https://www.linkedin.com/posts/grantslee_today-as-shared-by-the-new-york-times-we-activity-7393646492839763968-Bws-) / exact | X → LinkedIn | +48s | — |
| Cartesia | [2025-10-28T16:00:53.003Z](https://x.com/krandiash/status/1983202316397453676) / exact | [2025-10-28T16:03:13.565Z](https://www.linkedin.com/posts/krandiash_weve-raised-100m-from-kleiner-perkins-activity-7388968595499728896-0UJn) / exact | X → LinkedIn | +2m 21s | — |
| Deel | [2025-10-16T13:06:17.300Z](https://x.com/Bouazizalex/status/1978809723727012176) / exact | [2025-10-16T12:57:30.974Z](https://www.linkedin.com/posts/alexbouaziz_deel-has-raised-300m-at-a-173b-valuation-activity-7384573205698568193-FtqD) / exact | LinkedIn → X | +8m 46s | — |
| Superblocks | [2025-05-27T17:20:34.139Z](https://x.com/bradmenezes/status/1927414638632735069) / exact | unavailable / unknown | unresolved | unavailable | No retained LinkedIn content item supplies publication timestamp evidence. |
| Icon | [2025-02-04T17:55:47.408Z](https://x.com/kennandavison/status/1886836061378372064) / exact | [2025-02-04T17:55:39.947Z](https://www.linkedin.com/posts/kennandavison_introducing-icon-the-worlds-first-ai-admaker-activity-7292601719627079680-39q7) / exact | LinkedIn → X | +7s | — |

## Coverage

- 15 retained social items have exact verified timestamps: 9 X and 6 LinkedIn.
- 6 of 9 campaigns have resolvable sequence at exact precision.
- 0 campaigns rely on day-level ordering in the current corpus.
- 3 campaigns remain unresolved because no LinkedIn content item is retained.
- 6 campaigns have calculable elapsed-time deltas.

These sequence results describe only the retained items. They do not establish intent, effectiveness, causality, or a recurring timing strategy, and they do not alter TRACE's pattern or Signal definitions.
