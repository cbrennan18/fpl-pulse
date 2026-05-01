# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FPL Pulse frontend — a React SPA for tracking Fantasy Premier League mini-leagues. Deployed to GitHub Pages at `cbrennan.ie/fpl-pulse`. The backend is a Cloudflare Worker (`../fpl-pulse-worker/`) with its own repo and CLAUDE.md.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # Production build (outputs to dist/)
npm run preview    # Preview production build
npm run deploy     # Build + deploy to GitHub Pages
npx eslint .       # Lint
```

## Architecture

React 19 + Vite + Tailwind CSS 3 + React Router (basename `/fpl-pulse/`).

**Structure:** Feature-folder architecture. Each feature owns its containers, pages, and feature-specific components. Shared UI lives in top-level `components/`.

```
src/
├── components/          # Shared UI (TopBar, BaseLayout, Logo, skeletons/)
├── hooks/               # Shared hooks (useParallax, useStepProgression)
├── utils/
│   ├── api.js           # Centralized data fetching with retry + AbortController
│   ├── constants.js     # Shared constants (medal colors, gradients, thresholds)
│   └── scoringUtils.js  # Shared scoring calculations (top 5 earned/missed)
└── features/
    ├── landing/         # Team ID input (entry point)
    ├── home/            # Team summary dashboard
    ├── league/          # Mini-league browser + standings + awards
    │   └── awards/      # Award calculation modules (scoring, chip, transfer)
    └── pulse/           # Story-style season recap (self-contained)
        └── utils/       # pulseCalculations.js, pulseTextTemplates.js
```

**Pattern:** Container/Presentational — `*Container.jsx` files handle data fetching, sibling page components handle layout and rendering.

**Routes:**
- `/` → Landing
- `/home` → Homepage (team summary, rank chart)
- `/mini-leagues` → League list
- `/mini-league` → League detail (standings + awards)
- `/pulse` → Pulse (swipeable story-style GW recap, PulsePage1–10)

**Data fetching:** All FPL API calls go through `src/utils/api.js`, which wraps the worker's endpoints (configurable via `VITE_API_BASE` env var, defaults to `fpl-pulse.ciaranbrennan18.workers.dev`). Two endpoint styles: `/fpl/*` for proxied FPL API data, `/v1/*` for processed season blobs from KV.

**Styling:** Tailwind with custom theme colors (primary green `#28C76F`, accent purple `#8B5CF6` / class `accent-purple`, Manrope font). Custom safe-area utilities for mobile (`safe-p`, `pt-safe-bar`, etc) defined in `tailwind.config.js`.

## Code Review Standards

### Principles (flag concrete violations only)

- **SOLID** — flag a component/module doing two unrelated jobs (e.g. a container fetching, transforming *and* rendering markup).
- **DRY** — flag the same calc or fetch shape repeated in 2+ files; not three similar lines.
- **KISS** — flag config-driven indirection where a switch on `format`/`type` would read clearer (or vice versa).
- **YAGNI** — flag args/props/configs not consumed today (`gameweek` passed but never read; `extras` threaded through unused).
- **Separation of concerns** — flag presentational components calling `fetch`/`useEffect` for data, or containers writing inline `style={}` beyond layout glue.
- **Composition over inheritance** — N/A in practice; flag HOC chains or class components if they appear.

### Codebase-specific

- Data fetching outside `src/utils/api.js` — every `fetch`/`axios` call must go through it (retry, AbortController, base URL).
- Feature logic in `components/` or `hooks/` — shared dirs are for genuinely cross-feature code; move feature-coupled code into `features/<name>/`.
- Containers rendering JSX beyond a thin wrapper — they should hand off to a sibling presentational component.
- Duplicated scoring/aggregation logic — consolidate into `utils/scoringUtils.js` or `features/pulse/utils/pulseCalculations.js`.
- Magic numbers/strings (medal thresholds, gradient stops, GW counts) — move to `utils/constants.js` or a feature-local `constants.js`. The season length (`38`) and the periodic-award prefixes (`biMonthly_`, `monthly_`) are recurring offenders; flag any inline duplication.
- Styling that bypasses theme — raw `#28C76F` / `#8B5CF6`, inline `font-family: 'Manrope'`, hand-rolled safe-area padding instead of `safe-p`/`pt-safe-bar`. Exception: components inside `features/league/awards-share/` that get rasterised by `html-to-image` must use inline literals (the rasteriser's `<foreignObject>` doesn't run Tailwind); the source of truth there is `awards-share/constants.js`.
- Functions that return JSX must be mounted as components (`<Foo />`), not called as helpers (`Foo({...})`) — calling them loses keys, hooks, and React's dev warnings.

### Skip

ESLint-handled issues, Prettier formatting, naming bikeshedding (`foo` vs `fooData`), import ordering, speculative race conditions, low-probability key collisions, micro-optimisations of single-render code paths.

### Heuristics, not laws

- `PulsePage1`–`PulsePage10` deliberately mirror each other — duplication aids the story-flow read; don't push abstraction here.
- One-off award calculators in `features/league/awards/` are config-as-code by design; don't demand a base class.
- Container/presentational split is a strong default, not a rule — a 30-line page with no fetching can stay one file.
- Don't flag React `key` collisions unless the underlying data has realistic ambiguity — FPL manager names are not.

### Output format

`path/file.ext:line — Principle — why it's a problem — concrete fix.` Group by **Critical** (broken/unsafe), **Suggestion** (should fix), **Nitpick** (taste). End with `Tally: N critical · N suggestions · N nitpicks.`
