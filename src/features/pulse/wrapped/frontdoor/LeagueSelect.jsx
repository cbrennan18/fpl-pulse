// features/pulse/wrapped/frontdoor/LeagueSelect.jsx
//
// General-ramp front door. Enumerates the manager's classic leagues from
// fetchEntrySummary(id).leagues.classic[] (same source as LeagueListContainer),
// filters out system leagues, then annotates with checkLeaguesAvailability so we
// only let the user into ingested ("curated") leagues — the v1 ingestion gate.
//
// Identity is the session team id (?id=); a chosen league hands off via onChoose.
// (Member count is not in the entry-summary classic[] payload, so rows show your
// finish only; a count can be sourced from the pack meta after selection later.)

import { useEffect, useState } from 'react';
import { fetchEntrySummaryForSeason, checkLeaguesAvailability } from '../../../../utils/api';
import { SYSTEM_LEAGUE_THRESHOLD } from '../../../../utils/constants';
import useSeason from '../../../../hooks/useSeason';
import SeasonPicker from '../../../../components/SeasonPicker';
import WrappedScreen from '../WrappedScreen';
import { nameSizeClass } from '../nameType';

export default function LeagueSelect({ teamId, onChoose }) {
  const [leagues, setLeagues] = useState(null); // null = loading
  const [available, setAvailable] = useState(new Set());
  const [error, setError] = useState(false);
  // Wrapped is retrospective: CLOSED seasons only, never the one in progress. Same
  // resolution WrappedContainer uses, so the two always agree on the season.
  const { season, isArchive, label, options, setSeason, ready: seasonReady } =
    useSeason({ closedOnly: true });

  useEffect(() => {
    if (!teamId || !seasonReady) return;
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      try {
        const data = await fetchEntrySummaryForSeason(teamId, { season, archive: isArchive, signal });
        if (!data) throw new Error('no summary');
        const classic = (data.leagues?.classic || [])
          .filter((l) => l.id > SYSTEM_LEAGUE_THRESHOLD)
          .sort((a, b) => a.entry_rank - b.entry_rank);
        if (signal.aborted) return;
        setLeagues(classic);

        const set = await checkLeaguesAvailability(classic.map((l) => l.id), { season, signal });
        if (!signal.aborted) setAvailable(set);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(true);
      }
    })();

    return () => controller.abort();
  }, [teamId, season, isArchive, seasonReady]);

  return (
    <WrappedScreen className="flex flex-col px-6 pt-safe-bar pb-safe-10">
      <header className="border-b-2 border-wrapped-ink pb-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
          FPL Pulse · The Annual
        </p>
        <h1 className="font-display text-5xl leading-[0.9] tracking-tight mt-2">
          Choose your league
        </h1>
      </header>

      <SeasonPicker
        options={options}
        value={season}
        onChange={setSeason}
        variant="wrapped"
        className="mt-4"
      />

      {error && (
        <p className="font-mono text-sm text-wrapped-stamp mt-6">
          Couldn&apos;t load your leagues. Check the team ID and try again.
        </p>
      )}

      {!error && leagues === null && (
        <p className="font-mono text-sm text-wrapped-muted mt-6">Loading your leagues…</p>
      )}

      <ul className="mt-2 divide-y divide-wrapped-ink/30">
        {(leagues || []).map((l) => {
          const ready = available.has(l.id);
          return (
            <li key={l.id}>
              <button
                type="button"
                disabled={!ready}
                onClick={() => ready && onChoose(l.id, l.name)}
                className={
                  'w-full flex items-baseline justify-between gap-4 py-4 text-left ' +
                  (ready ? 'hover:bg-wrapped-ink/[0.04]' : 'opacity-40 cursor-not-allowed')
                }
              >
                <span className="min-w-0">
                  <span className={`block font-display ${nameSizeClass(l.name, ['text-2xl', 'text-xl', 'text-lg', 'text-base'])} leading-none tracking-tight [overflow-wrap:anywhere]`}>
                    {l.name}
                  </span>
                  {!ready && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-wrapped-muted">
                      {isArchive ? `not covered in ${label}` : 'not available yet'}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-wrapped-muted">
                    your finish
                  </span>
                  <span className="block font-display text-3xl leading-none tabular-nums">
                    {l.entry_rank}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </WrappedScreen>
  );
}
