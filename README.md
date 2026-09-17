# TRACE

The current research audit and signature finding are documented in [RESEARCH.md](RESEARCH.md), and the verified public-response snapshots in [PERFORMANCE.md](PERFORMANCE.md). The evidence validation layer is documented in [VALIDATION.md](VALIDATION.md), including source identity, exact quotations, cross-post grouping, counterevidence, tests and limitations. The historical Phase 1 notes below describe the original frontend foundation; the app now includes the connected research pipeline, normalized launch mechanics, public-response provenance and an evidence-led Signal.

Reverse-engineer the mechanics behind public launches.

TRACE is a research product for examining public launch material from Social Capital Inc. It ships with a bundled, reproducible dataset and deterministic research pipeline; no database, authentication or generated-answer service is required.

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

- Next.js App Router, TypeScript, React and Tailwind CSS. Dependencies are pinned; commit the lockfile for reproducible installs.
- Server components by default. Only navigation and the two interactive inputs use client components.
- Search and filters update local interface state; no records exist to search yet. Clear filters resets both controls.
- Question submission shows an availability message. Questions are not transmitted or persisted, and no answers are generated.
- Network categories are a legend for the planned data model, not verified entities or connections.
- Research status describes this implementation; no research statistics or findings are invented.
- Semantic landmarks, visible labels, skip navigation, focus indicators and reduced-motion styles are included.

## Tooling compatibility

TypeScript is pinned to 6.0.3 because the TypeScript ESLint parser bundled with the current Next.js configuration requires TypeScript below 6.1. ESLint is pinned to 9.39.5 because that configuration's React, import and accessibility plugins do not yet declare ESLint 10 compatibility. npm marks ESLint 9 as unsupported; revisit the pin when those plugins support ESLint 10. The application dependencies use the current stable releases available at implementation time.

## Phase boundary

Dataset ingestion, launch records, source citations, pattern discovery, graph rendering and evidence-backed answers belong to later phases. The current UI deliberately stays empty until verified research exists.
