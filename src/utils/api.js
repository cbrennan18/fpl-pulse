// src/utils/api.js

const BASE = import.meta.env.VITE_API_BASE || 'https://fpl-pulse.ciaranbrennan18.workers.dev';

const MAX_RETRIES = 3;
const BASE_DELAY = 500;

// === Season addressing ===
//
// Season is a PATH segment, never a query param: the worker's cacheKeyFor() strips the
// query string when building edge cache keys, so ?season= would collide across seasons
// and serve one season's blob for another's request.
//
// Every /v1 artefact is reachable two ways — unprefixed (the season the worker detects)
// and prefixed (an explicit season, including closed ones). The two GLOBAL artefacts are
// asymmetric between the forms, and that asymmetry is the whole reason this helper
// exists:
//
//   unprefixed                    prefixed
//   /v1/season/bootstrap    <->   /v1/2025/bootstrap
//   /v1/season/elements     <->   /v1/2025/elements
//   /v1/entry/123           <->   /v1/2025/entry/123
//   /v1/league/9/standings  <->   /v1/2025/league/9/standings
//
// The literal word "season" sits in the SAME positional slot the year uses, so a naive
// `/v1/${season}${path}` yields /v1/2025/season/elements. VERIFIED against the deployed
// worker: that form currently answers 200 — its remap in routes/public.js doesn't match
// "/season/elements" as a global, falls through to the generic `/v1${rest}` branch, and
// lands on the right handler with the right season by coincidence. Do not rely on it.
// It is undocumented, and the comment above that matcher calls its ordering load-bearing,
// so a future reorder can drop it without notice. This helper emits the canonical form
// (/v1/2025/elements), which is the one the worker's remap is actually written to serve.
const SEASON_GLOBAL_RESOURCES = new Set(['/bootstrap', '/elements']);

// Match the worker's parseSeasonToken: a 4-digit year and nothing else. A bare Number()
// would accept " 2025" and "2e3" and then build a URL that silently addresses nothing.
const SEASON_PATTERN = /^\d{4}$/;

/**
 * Build a /v1 URL for a resource, with or without a season prefix.
 * Exported for tests — prefer the fetch functions below in application code.
 *
 * @param {string} resource  path below /v1 in its PREFIXED form, e.g. '/bootstrap',
 *                           '/entry/123', '/league/9/entries-pack'
 * @param {number|string} [season]  4-digit year; absent means the current season
 */
export function v1Url(resource, season) {
  if (season === null || season === undefined || season === '') {
    return SEASON_GLOBAL_RESOURCES.has(resource)
      ? `${BASE}/v1/season${resource}`
      : `${BASE}/v1${resource}`;
  }

  const year = String(season);
  if (!SEASON_PATTERN.test(year)) {
    throw new Error(`Invalid season "${season}" — expected a 4-digit year (e.g. 2025).`);
  }
  return `${BASE}/v1/${year}${resource}`;
}

// General-purpose fetch with retry and abort support. Returns the Response for any
// status the caller might reasonably act on (2xx, 3xx, 4xx) so callers can branch on
// 202/404 themselves; throws once 5xx or network failures exhaust the retries.
//
// 4xx FAILS FAST. Retrying a permanent condition just re-asks a question already
// answered — and season addressing makes 404 routine rather than exceptional (a season
// with no blob for this league is a normal answer, not a fault), so the old behaviour
// spent three round-trips and ~1.5s of backoff on the common path. 5xx and network
// errors stay retryable: those are the transient ones.
async function fetchWithRetry(url, { signal, method = 'GET' } = {}) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let res;
    try {
      res = await fetch(url, { method, signal });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (attempt === MAX_RETRIES) throw err;
      console.warn(`Fetch attempt ${attempt} failed for ${url} (${err.message}), retrying...`);
      await new Promise(r => setTimeout(r, BASE_DELAY * attempt));
      continue;
    }

    if (res.status < 500) return res;

    if (attempt === MAX_RETRIES) {
      const err = new Error(`Fetch failed for ${url} after ${MAX_RETRIES} attempts (${res.status})`);
      err.status = res.status;
      throw err;
    }
    console.warn(`Fetch attempt ${attempt} failed for ${url} (${res.status}), retrying...`);
    await new Promise(r => setTimeout(r, BASE_DELAY * attempt));
  }
}

// Retrying JSON fetch. NOTE: 202 counts as ok here, so any endpoint that answers 202
// meaningfully must use fetchWithRetry directly and branch itself.
async function fetchJson(url, { signal } = {}) {
  const res = await fetchWithRetry(url, { signal });
  if (!res.ok) {
    const err = new Error(`Fetch failed for ${url} (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// --- Fetch summary information for a team by entry ID ---
// LIVE PROXY: hits the FPL API, which only ever serves the CURRENT season. Not
// season-parameterisable — archive callers use fetchEntrySeasonBlob's summary instead.
export async function fetchEntrySummary(id, { signal } = {}) {
  try {
    return await fetchJson(`${BASE}/fpl/entry/${id}/summary`, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch entry summary for ${id}:`, err);
    return null;
  }
}

// --- Fetch a manager's full history (past seasons + current) ---
// LIVE PROXY: worker proxies FPL's entry/{id}/history/ at /fpl/entry/:id. Current-season
// entry IDs only; not season-parameterisable.
export async function fetchEntryHistory(id, { signal } = {}) {
  try {
    return await fetchJson(`${BASE}/fpl/entry/${id}`, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch entry history for ${id}:`, err);
    return null;
  }
}

// --- Fetch bootstrap static data: players, teams, events, etc ---
// Despite the historical /fpl/bootstrap alias this was never a live proxy — the worker
// serves it from KV (season:bootstrap), season-scoped, exactly like the /v1 reads. It is
// therefore season-parameterised here: without it, archive mode renders one season's
// picks against another's fixtures, finished-flags and ownership figures, silently.
export async function fetchBootstrap({ season, signal } = {}) {
  try {
    const data = await fetchJson(v1Url('/bootstrap', season), { signal });
    if (!Array.isArray(data.elements)) throw new Error('Invalid bootstrap format');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn('Failed to fetch bootstrap:', err);
    return null;
  }
}

// --- Fetch league standings and metadata ---
// LIVE PROXY: current season only. For archived seasons use fetchArchivedStandings,
// which normalises to this same { league, standings: { results } } envelope.
export async function fetchLeagueStandings(leagueId, { signal } = {}) {
  try {
    const data = await fetchJson(`${BASE}/fpl/league/${leagueId}`, { signal });
    if (!data?.standings?.results) throw new Error('Invalid league data');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch league standings for ${leagueId}:`, err);
    return null;
  }
}

// --- Fetch archived league standings for a season (uses /v1/ endpoint) ---
//
// Three meaningful outcomes, which the caller MUST be able to tell apart — collapsing
// them to null is what made a provisional table read as a failure:
//   { status: 'final',       data, ... }  200 — table is stamped final
//   { status: 'provisional', ... }        202 — captured but not yet final
//   { status: 'absent' }                  404 — no table for this league/season
//   null                                  network / malformed blob
//
// `data` is normalised to the LIVE envelope ({ league, standings: { results } }) because
// the archive blob holds rows top-level while /fpl/league/:id nests them. Adapting once
// here means both consumers read one shape and neither owns the adapter. Rows are stored
// untrimmed by the worker, so entry / player_name / entry_name / rank / total are present.
export async function fetchArchivedStandings(leagueId, { season, signal } = {}) {
  try {
    const res = await fetchWithRetry(v1Url(`/league/${leagueId}/standings`, season), { signal });

    if (res.status === 404) return { status: 'absent' };

    if (res.status === 202) {
      const body = await res.json();
      return {
        status: 'provisional',
        season: body?.season ?? null,
        harvestedAt: body?.harvested_at ?? null,
        memberCount: body?.member_count ?? null,
      };
    }

    if (!res.ok) throw new Error(`Failed to fetch archived standings: ${res.status}`);

    const blob = await res.json();
    if (!Array.isArray(blob?.results)) throw new Error('Invalid archived standings blob');

    return {
      status: 'final',
      season: blob.season,
      harvestedAt: blob.harvested_at,
      memberCount: blob.member_count,
      data: {
        league: blob.league ?? { id: Number(leagueId), name: null },
        standings: { results: blob.results },
      },
    };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch archived standings for league ${leagueId}:`, err);
    return null;
  }
}

// --- Fetch the season index: which seasons exist, and what state each is in ---
// NOT season-scoped itself (it is how you discover the seasons), so it bypasses v1Url —
// /v1/2025/seasons is not a route. `closed` and `has_data` are deliberately independent:
// Wrapped is retrospective and filters on `closed`, the live league product on `has_data`.
export async function fetchSeasons({ signal } = {}) {
  try {
    const data = await fetchJson(`${BASE}/v1/seasons`, { signal });
    if (!Number.isInteger(data?.current) || !Array.isArray(data?.seasons)) {
      throw new Error('Invalid seasons format');
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn('Failed to fetch seasons:', err);
    return null;
  }
}

// --- Fetch complete entry season blob (uses /v1/ endpoint) ---
export async function fetchEntrySeasonBlob(entryId, { season, signal } = {}) {
  try {
    const response = await fetchWithRetry(v1Url(`/entry/${entryId}`, season), { signal });

    // Handle 202 status (entry still building)
    if (response.status === 202) {
      const state = await response.json();
      console.warn(`Entry ${entryId} is ${state.status}, last GW: ${state.last_gw_processed}`);
      return null;
    }

    if (!response.ok) throw new Error(`Failed to fetch entry blob: ${response.status}`);

    const blob = await response.json();

    // Validate blob structure
    if (!blob.gw_summaries || !blob.picks_by_gw || !Array.isArray(blob.transfers)) {
      throw new Error('Invalid entry blob structure');
    }

    return blob;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch entry season blob for ${entryId}:`, err);
    return null;
  }
}

// --- Fetch all entry blobs for a league in one call (uses /v1/ endpoint) ---
export async function fetchLeagueEntriesPack(leagueId, { season, signal } = {}) {
  try {
    const data = await fetchJson(v1Url(`/league/${leagueId}/entries-pack`, season), { signal });
    if (!data?.entries || !Array.isArray(data?.members)) {
      throw new Error('Invalid entries-pack format');
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch entries-pack for league ${leagueId}:`, err);
    return null;
  }
}

// --- Check which leagues have entries-pack data available (HEAD-style) ---
// Deliberately on bare fetch, not fetchWithRetry: this is an availability PROBE run
// N-wide across a league list, where 404 is a valid answer and any other failure means
// the same thing to the caller ("don't offer this league").
export async function checkLeaguesAvailability(leagueIds, { season, signal } = {}) {
  const results = await Promise.all(
    leagueIds.map(async (id) => {
      try {
        const res = await fetch(v1Url(`/league/${id}/entries-pack`, season), { method: 'HEAD', signal });
        if (res.ok) return { id, available: true };
        if (res.status === 404) return { id, available: false };
        console.error(`[FPL Pulse] Unexpected status ${res.status} checking league ${id}`);
        return { id, available: false };
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.error(`[FPL Pulse] Network error checking league ${id}:`, err);
        return { id, available: false };
      }
    })
  );

  const unavailableIds = results.filter((r) => !r.available).map((r) => r.id);
  if (unavailableIds.length > 0) {
    console.warn('[FPL Pulse] Leagues not yet available in data pack:', unavailableIds);
  }

  return new Set(results.filter((r) => r.available).map((r) => r.id));
}

// --- Fetch season elements (all GW live data in one call) ---
export async function fetchSeasonElements({ season, signal } = {}) {
  try {
    const data = await fetchJson(v1Url('/elements', season), { signal });
    if (!data.gws || typeof data.gws !== 'object') {
      throw new Error('Invalid season elements format');
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn('Failed to fetch season elements:', err);
    return null;
  }
}
