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
    └── pulse/           # Story-style season recap (self-contained) — IN REDESIGN
        ├── specs/       # story-arc.md, design-spec.md, art-direction.md (SOURCE OF TRUTH)
        └── utils/       # pulseCalculations.js, pulseTextTemplates.js, careerRating.js,
                         #   career-rating-v1.js + rating-to-rank-v1.json (frozen artifacts)
```

**Career-rating artifacts:** `features/pulse/utils/career-rating-v1.js` and `rating-to-rank-v1.json` are **frozen, versioned** copies lifted from the sibling `fpl-career-rating/` repo (do not hand-edit — changes go upstream, then re-copy; the `-v1` suffix lets a future fpl-elo model swap in via a one-line import change). `careerRating.js` is the in-app wrapper around them. The forthcoming **beat-9 xP model** (see Pulse/Wrapped below) will follow the same frozen-artifact pattern from its own pipeline repo.

**Pattern:** Container/Presentational — `*Container.jsx` files handle data fetching, sibling page components handle layout and rendering.

**Routes:**
- `/` → Landing
- `/home` → Homepage (team summary, rank chart)
- `/mini-leagues` → League list
- `/mini-league` → League detail (standings + awards)
- `/pulse` → Pulse Wrapped (season recap). **In active redesign** per `features/pulse/specs/`. Target: a mini-league-relative, story-style recap — Cloudflare-gated league-select → cover → 11 tap/swipe beats (2 screens each, 3 for multi-part) → share/recap carousel, plus a shared-link roster landing. `PulsePage1–10` + the career-rating chapter (page 11) are the **legacy** recap being replaced.

**Data fetching:** All FPL API calls go through `src/utils/api.js`, which wraps the worker's endpoints (configurable via `VITE_API_BASE` env var, defaults to `fpl-pulse.ciaranbrennan18.workers.dev`). Two endpoint styles: `/fpl/*` for proxied FPL API data, `/v1/*` for processed season blobs from KV.

**Styling:** Tailwind with custom theme colors (primary green `#28C76F`, accent purple `#8B5CF6` / class `accent-purple`, Manrope font). Custom safe-area utilities for mobile (`safe-p`, `pt-safe-bar`, etc) defined in `tailwind.config.js`. **Note:** Wrapped is a visual **sub-brand** with its own warm-stock palette (see Pulse/Wrapped below) — it deliberately diverges from the app theme. Do not apply the app's green/purple/dark theme to Wrapped beats, and do not apply Wrapped's warm palette elsewhere in the app.

## Deployment & hosting (GitHub Pages)

Static SPA on GitHub Pages under `base: /fpl-pulse/`, custom domain `cbrennan.ie` (the `postbuild` script writes `dist/CNAME` + `.nojekyll`). Deploy with `npm run deploy` (gh-pages → `dist`).

- **Deep-link SPA shim — LOAD-BEARING, do not naively edit.** GH Pages 404s any deep path on a cold load (e.g. a shared `/fpl-pulse/wrapped?league=X&via=link`). `public/404.html` encodes the full path + query into a single `?/…` param and redirects to the app root; an inline decode script at the **top of `index.html` `<head>`** (before the deferred bundle) restores the real URL via `history.replaceState` so BrowserRouter boots on the correct route. Standard rafgraph/spa-github-pages pair, `pathSegmentsToKeep = 1` (keeps the `/fpl-pulse/` segment; 0 double-prepends the basename, 2 leaves a still-404ing target). If you revert `404.html` to a plain redirect, **every shared link 404s to Landing** — the two files are a matched pair.
- **OG / unfurl meta is STATIC in `index.html`** (wrapped-framed), one shell for the whole app — no per-route/per-league variation, because unfurl crawlers don't run JS (so meta must **never** be react-helmet / JS-injected). `public/og-wrapped.png` (declared 1200×630, shipped 2× retina) is the share card; hrefs are literal absolute `cbrennan.ie` URLs. Per-league dynamic OG would need worker head-injection (deferred).
- **Analytics:** `hooks/useUmami.js` — self-hosted Umami, **prod-gated by hostname** (nothing fires in dev/preview), exposes `track(name, props)`. House style is to fire events **inline at the interaction/transition point** (see `league/`, `landing/`, and the wrapped funnel in `WrappedContainer`); no analytics wrapper/context.

## Pulse / Wrapped (active redesign)

Pulse is being rebuilt from a generic 10-page stats recap into a mini-league-relative, story-style "Wrapped."

**Source of truth — READ before touching Pulse:** `features/pulse/specs/story-arc.md` (narrative), `design-spec.md` (structure/flow/interaction), `art-direction.md` (visual language).

**Build log (living, reverse-chronological):** `features/pulse/specs/wrapped-build-log.md` — one entry per build session (most recent on top), recording what shipped, the locked decisions future sessions must respect, deviations, and open flags. Read the top entries for current state before resuming Wrapped work. Like the specs, it's gitignored (kept local).

### Build rules

- Beat-by-beat. Reflect intent back against the specs before writing code (reflection gate).
- Shared dependency: an **N-manager fetch** (every league member's picks × 38 GWs, via `api.js`) underpins almost every beat — **build it first**.
- **Beat 9 (luck/skill) builds LAST.** Its xP model is a separate Python pipeline repo; the frontend consumes only its frozen output artifact (same pattern as the career-rating artifacts — `-v1` suffix, do not hand-edit, changes go upstream then re-copy).
- The new recap uses a **reusable 2-screen beat template** (title/question → data), manual tap/swipe advance, progress per-beat. This **replaces** the deliberately-duplicated `PulsePage1–10`. Refactor toward the template; do not invest in the legacy pages.
- Two pre-build verifications: per-league historical standings API (beat 11 depends on it); N-manager fetch holds at volume.

### Wrapped visual language (scoped to `features/pulse/` ONLY — not the app theme)

Warm-stock editorial — "programme paper."

- **Surface:** cream `#ECE3CF` · ink `#1E1B16` · muted ink `#6B6354`.
- **Accent is SEMANTIC:** green `#1C5237` = you / gain; gold `#B08518` = peak / highlight (fills & marks, **not** body text — fails contrast on cream); red `#B23A2E` = regret / stamp only. Everything else is ink/muted. (Marking *you* in green while rivals stay quiet is a consistent, ownable behaviour.)
- **Type:** Bebas (display + hero numerals), Manrope body, **tabular figures** in all stat tables.
- **Layout:** rules & borders over shadows; **square / 2px corners**; one idea per screen; editorial grid with generous warm-paper margins; tracked masthead kickers + edition numbering.
- **Share cards:** square 1080×1080, reuse the `awards-share/` rasteriser (its inline-literal constraint applies — the `<foreignObject>` doesn't run Tailwind).

### DO NOT (anti-default guard — Wrapped)

No **Inter**; no **purple/blue gradient**; no **bento grid**; no **rounded-everything** (square/2px here); no **single-side coloured borders**; no **emoji-as-icons**; no **soft drop shadows** (use rules/borders); no **dark-mode-neon** (Wrapped is warm stock); no **glossy photo collage**; no **whitespace-as-crutch**. Copy: avoid "delve into" / "transform your X"; limit em-dashes; verdicts stay dry and punch at the decision, not the person.

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
- Styling that bypasses theme — raw `#28C76F` / `#8B5CF6`, inline `font-family: 'Manrope'`, hand-rolled safe-area padding instead of `safe-p`/`pt-safe-bar`. Exception: components inside `features/league/awards-share/` (and Wrapped share cards) that get rasterised by `html-to-image` must use inline literals (the rasteriser's `<foreignObject>` doesn't run Tailwind); the source of truth there is `awards-share/constants.js`. Wrapped beats use the warm-stock palette above, not the app theme.
- Functions that return JSX must be mounted as components (`<Foo />`), not called as helpers (`Foo({...})`) — calling them loses keys, hooks, and React's dev warnings.

### Skip

ESLint-handled issues, Prettier formatting, naming bikeshedding (`foo` vs `fooData`), import ordering, speculative race conditions, low-probability key collisions, micro-optimisations of single-render code paths.

### Heuristics, not laws

- **Legacy Pulse:** `PulsePage1`–`PulsePage10` + the career-rating chapter (`CareerRatingPage`, page 11) deliberately mirror each other — duplication aids the legacy story-flow read; don't push abstraction on them. They are array-driven: `PulseContainer` builds the `pulseData` array and injects page 11 before the page-10 share finale; `PulsePageRenderer` switches on each entry's `.page`. **These are being replaced** by the reusable 2-screen beat template (see Pulse/Wrapped) — refactor toward the template rather than abstracting the old pages.
- One-off award calculators in `features/league/awards/` are config-as-code by design; don't demand a base class.
- Container/presentational split is a strong default, not a rule — a 30-line page with no fetching can stay one file.
- Don't flag React `key` collisions unless the underlying data has realistic ambiguity — FPL manager names are not.

### Output format

`path/file.ext:line — Principle — why it's a problem — concrete fix.` Group by **Critical** (broken/unsafe), **Suggestion** (should fix), **Nitpick** (taste). End with `Tally: N critical · N suggestions · N nitpicks.`