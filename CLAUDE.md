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
├── hooks/               # Shared hooks (useParallax)
├── utils/               # Shared utilities (api.js, retryFetch.js)
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

**Styling:** Tailwind with custom theme colors (primary green `#28C76F`, Manrope font). Custom safe-area utilities for mobile (`safe-p`, `pt-safe-bar`, etc) defined in `tailwind.config.js`.
