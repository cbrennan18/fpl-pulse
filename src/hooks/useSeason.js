// src/hooks/useSeason.js
//
// The one hook containers read the season from. Combines the explicit ?season= on the
// URL with the season index to answer "which season should I fetch?".
//
// Returned `ready` is the important part: it is false only while we genuinely don't know
// yet. Containers gate their effect on it and fold it into their existing skeleton, so a
// cold load shows a beat of loading rather than a flash of the wrong season's data —
// which, in the rollover window, would be a flash of an empty app.
//
// An explicit ?season= makes `ready` true immediately: the answer doesn't depend on the
// index, so a shared archive link never waits on a round trip it doesn't need.

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  parseSeasonParam,
  resolveSeason,
  resolveClosedSeason,
  loadSeasonIndex,
  peekSeasonIndex,
  isArchiveSeason,
  formatSeason,
  seasonOptions,
  SEASON_PARAM,
} from '../utils/seasons';

/**
 * @param {{closedOnly?: boolean}} [options]  closedOnly: resolve Wrapped's retrospective
 *   default (most recent closed season) instead of the live product's (most recent with
 *   data). Only the default changes — the ?season= param is identical either way.
 * @returns {{
 *   season: number|null,    the season to fetch with; null means "unprefixed, worker decides"
 *   requested: number|null, the explicit ?season=, or null when the URL doesn't pin one
 *   ready: boolean,         false only while the season is genuinely unknown
 *   seasons: Array,         the index rows (for the pickers in a later stage)
 *   current: number|null,   the worker's current season
 *   isArchive: boolean,     true when the live FPL API cannot answer for this season
 *   label: string,          display form, e.g. "2025/26"
 * }}
 */
export default function useSeason({ closedOnly = false } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = parseSeasonParam(searchParams);

  // Hydrate synchronously from the module cache so only the first route in a session
  // pays a loading beat.
  const [index, setIndex] = useState(peekSeasonIndex);
  const [settled, setSettled] = useState(() => peekSeasonIndex() != null);

  useEffect(() => {
    if (peekSeasonIndex()) {
      setIndex(peekSeasonIndex());
      setSettled(true);
      return;
    }
    let alive = true;
    // Never rejects: fetchSeasons resolves null on failure, which resolveSeason reads as
    // "no information" and answers with the unprefixed fallback.
    loadSeasonIndex().then((loaded) => {
      if (!alive) return;
      setIndex(loaded);
      setSettled(true);
    });
    return () => { alive = false; };
  }, []);

  // Same ?season= convention everywhere; only the DEFAULT differs. Wrapped needs the
  // most recent CLOSED season, the live product the most recent one with data.
  // CANONICALISATION: a DELIBERATE choice pins ?season=; the resolved default does not.
  // An unpinned link keeps meaning "the latest season with data", which is what you want
  // from a link you expect to stay current — but once a user has actually chosen, the URL
  // has to say so, or the choice is lost the moment they copy it. replace:true because a
  // season switch refines the current view rather than being a new destination; Back
  // should return you to where you came from, not step through your toggles.
  const setSeason = useCallback((year) => {
    const next = new URLSearchParams(searchParams);
    if (year == null) next.delete(SEASON_PARAM);
    else next.set(SEASON_PARAM, String(year));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const season = closedOnly
    ? resolveClosedSeason(index, requested)
    : resolveSeason(index, requested);
  const current = index?.current ?? null;
  const row = index?.seasons?.find((s) => s.season === season);

  return {
    season,
    requested,
    ready: requested != null || settled,
    seasons: index?.seasons ?? [],
    current,
    isArchive: isArchiveSeason(season, current),
    label: formatSeason(season),
    // null when we can't tell (no index, or a hand-typed season the index doesn't list).
    // Only an explicit `false` means "this season exists and holds nothing".
    hasData: row ? !!row.has_data : null,
    options: seasonOptions(index, { closedOnly }),
    setSeason,
  };
}
