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

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  parseSeasonParam,
  resolveSeason,
  loadSeasonIndex,
  peekSeasonIndex,
  isArchiveSeason,
  formatSeason,
} from '../utils/seasons';

/**
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
export default function useSeason() {
  const [searchParams] = useSearchParams();
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

  const season = resolveSeason(index, requested);
  const current = index?.current ?? null;

  return {
    season,
    requested,
    ready: requested != null || settled,
    seasons: index?.seasons ?? [],
    current,
    isArchive: isArchiveSeason(season, current),
    label: formatSeason(season),
  };
}
