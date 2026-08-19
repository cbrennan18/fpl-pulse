// src/utils/seasons.js
//
// Season resolution + the ?season= URL convention. Pure helpers plus one memoized
// loader for the season index; the React surface lives in hooks/useSeason.js.

import { fetchSeasons } from './api';

// The URL param. Season is a QUERY param on the client even though it is a PATH segment
// on the worker — the worker's reason (cacheKeyFor strips query strings, so ?season=
// would collide across seasons in the edge cache) is a Cloudflare cache concern and does
// not transfer to a client-side router.
//
// A query param also sidesteps the `id` overload: `?id=` means the TEAM on /home,
// /mini-leagues and /wrapped but the LEAGUE on /mini-league (where the team becomes
// ?teamId=). `?season=` carries one meaning on every route regardless of what `id` means
// there, so it survives that flip without another positional convention to remember.
export const SEASON_PARAM = 'season';

// Match the worker's parseSeasonToken (and v1Url's guard): a 4-digit year, nothing else.
const SEASON_PATTERN = /^\d{4}$/;

/**
 * Read an explicit season off the URL. Garbage is treated as ABSENT rather than an
 * error: a mistyped link should fall back to the resolved default, never a blank app.
 * @returns {number|null}
 */
export function parseSeasonParam(searchParams) {
  const raw = searchParams.get(SEASON_PARAM);
  if (!raw) return null;
  return SEASON_PATTERN.test(raw) ? Number(raw) : null;
}

/**
 * Decide which season to read data for.
 *
 *   explicit ?season=  → always wins, even if the index doesn't list it. The user asked
 *                        for it; containers surface their own empty/error state if it
 *                        has no data. Validating the choice belongs with the picker.
 *   current has_data   → the live product's normal case.
 *   otherwise          → the most recent season that HAS data. This is the rollover
 *                        window: the new season is current but nothing is ingested yet,
 *                        so every artefact 404s and the app renders empty. Falling back
 *                        one season is what keeps it alive.
 *   no index at all    → null, meaning "send unprefixed and let the worker decide".
 *                        Degrades to exactly the pre-season-selection behaviour rather
 *                        than to a blank screen.
 *
 * @param {{current:number, seasons:Array}|null} index  payload from /v1/seasons
 * @param {number|null} requested                       explicit ?season=
 * @returns {number|null}
 */
export function resolveSeason(index, requested = null) {
  if (requested != null) return requested;

  const seasons = index?.seasons;
  if (!Array.isArray(seasons) || seasons.length === 0) return null;

  const current = seasons.find((s) => s.is_current);
  if (current?.has_data) return current.season;

  // The worker returns newest-first, but sort rather than trust ordering we don't own.
  const withData = seasons.filter((s) => s.has_data).sort((a, b) => b.season - a.season);
  return withData[0]?.season ?? null;
}

/**
 * Display label for a season: 2025 -> "2025/26". The worker addresses seasons by their
 * START year; FPL names them by the span.
 */
export function formatSeason(season) {
  if (season == null) return '';
  return `${season}/${String((season + 1) % 100).padStart(2, '0')}`;
}

/**
 * Is the season being viewed something other than the one FPL is currently playing?
 *
 * This — not "is it closed" — is the distinction the entry flow turns on, because it is
 * exactly the condition under which the LIVE FPL API stops being able to answer. Live
 * only ever serves the current season, and it reassigns entry and league IDs yearly.
 *
 * Unknown `current` (the season index failed) answers false, so the app falls back to
 * the live path it used before season selection existed rather than to a broken one.
 */
export function isArchiveSeason(season, current) {
  return season != null && current != null && season !== current;
}

/**
 * Append the season to an in-app path, preserving whatever query it already carries.
 * Pass the EXPLICIT season (not the resolved one) so an unpinned link stays
 * "whatever is current" instead of being frozen to today's answer.
 */
export function withSeason(path, season) {
  if (season == null) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${SEASON_PARAM}=${season}`;
}

// --- Season index cache -----------------------------------------------------------
//
// One request per session, shared by every consumer. This is request DEDUPLICATION, not
// a state layer: the index is read-only, identical for all callers, and changes at most
// twice a year, so a component-local copy per container would be three redundant round
// trips per navigation with no upside. Season SELECTION still lives in the URL.
//
// Deliberately takes no AbortSignal. The promise is shared, so one component unmounting
// would cancel the fetch for every other consumer awaiting it. Consumers guard their own
// setState instead. The payload is a few hundred bytes.
//
// Failures are not cached — fetchSeasons resolves null on error, so the next caller
// retries. A season rollover mid-session is not picked up until reload, which is
// acceptable for a twice-a-year boundary.
let cachedIndex = null;
let inflight = null;

export function loadSeasonIndex() {
  if (cachedIndex) return Promise.resolve(cachedIndex);
  if (!inflight) {
    inflight = fetchSeasons()
      .then((index) => {
        if (index) cachedIndex = index;
        return index;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Synchronous peek — lets the hook hydrate without a loading beat on later routes. */
export function peekSeasonIndex() {
  return cachedIndex;
}

/** Test seam. */
export function __resetSeasonIndexCache() {
  cachedIndex = null;
  inflight = null;
}
