# TRACE

Reverse-engineer the mechanics behind public launches.

TRACE is a source-led research tool for examining Social Capital Inc.'s public launch material across campaigns, platforms, content and distribution.

It turns public launch material into structured evidence, surfaces recurring patterns across campaigns, and lets researchers inspect the source excerpts, counterevidence and coverage limits behind each finding.

**Live demo:** https://trace-gamma-two.vercel.app/
## Run locally

Use Node.js 22 LTS or newer and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No environment variables or external services are required. Fonts use local system stacks, so rendering and builds do not require a font download.

## Commands

```sh
npm run typecheck
npm run lint
npm run build
npm start
```

`npm start` serves an existing production build. Stop either server with Ctrl+C.

## Structure

```text
src/
  app/
    layout.tsx          Shared shell, metadata, navigation and footer
    globals.css         Tailwind import, visual tokens and responsive styles
    page.tsx            Research overview
    launches/page.tsx   Launch index
    patterns/page.tsx   Evidence-supported pattern index
    network/page.tsx    Relationship map framework
    signal/page.tsx     The Signal framework
    ask/page.tsx        Dataset question interface
    not-found.tsx       Custom 404
    icon.svg            TRACE favicon
  components/
    editorial.tsx       Shared headings, empty states and links
    site-header.tsx     Route-aware navigation
    launch-index.tsx    Local search/filter state
    question-form.tsx   Local question input and honest availability feedback
```

## Foundation decisions

- The application ships with a bundled, reproducible research dataset.
- Dataset questions operate against the loaded evidence rather than a general-purpose chat model.
- Findings preserve source provenance, exact excerpts, counterevidence and coverage limitations.
- Publication sequence is shown only where the underlying timestamp can be verified.
- Network relationships represent provenance relationships, not inferred social connections.
- No causal claims are made from the observed patterns.

## Tooling compatibility

TypeScript is pinned to 6.0.3 because the TypeScript ESLint parser bundled with the current Next.js configuration requires TypeScript below 6.1. ESLint is pinned to 9.39.5 because that configuration's React, import and accessibility plugins do not yet declare ESLint 10 compatibility. npm marks ESLint 9 as unsupported; revisit the pin when those plugins support ESLint 10. The application dependencies use the current stable releases available at implementation time.

## Research corpus

TRACE currently uses a focused corpus of Social Capital Inc.'s public launch portfolio.

- 9 campaign records
- 24 source records
- 15 retained social content items
- 49 verified public-response metric values across 13 dated snapshots
- 15 exact verified social publication timestamps
- 6 campaigns with resolvable cross-platform sequence
- 3 campaigns with insufficient paired-platform evidence for sequence analysis

## Methodology

TRACE separates:

- observed source material
- deterministic extraction
- interpreted patterns
- candidate findings
- unavailable or insufficient evidence

Patterns are supported with source excerpts and campaign-level evidence. Counterevidence and insufficient coverage are surfaced explicitly.

TRACE does not infer causality, campaign effectiveness, or a universally successful launch strategy from the corpus.

The portfolio is purposively selected and should not be treated as a representative sample of all Social Capital campaigns. Public-response values are retrieval-time snapshots, not necessarily launch-day measurements.
