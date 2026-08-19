// features/pulse/wrapped/frontdoor/RosterPicker.jsx
//
// Link-ramp landing. A shared link encodes the league AND (since season selection) the
// season; this screen lists that season's roster and the pick IS the identity step —
// choosing a name sets "you". Non-members route out via "make your own".
//
// The roster MUST come from the archive for a past season: FPL reassigns league IDs
// yearly, so the live table for the same id is a different league's (id 9385 is
// "Dundanion Road" in 2025/26 and "FPL GOAT LEAGUE" live). Picking a name off the live
// table would set `you` to a stranger's entry id.

import { useEffect, useState } from 'react';
import { fetchStandingsForSeason } from '../../../../utils/api';
import WrappedScreen from '../WrappedScreen';
import { nameSizeClass } from '../nameType';

export default function RosterPicker({ leagueId, season, archive, seasonLabel, onPick, onMakeYourOwn }) {
  const [roster, setRoster] = useState(null); // [{ entry, player_name, entry_name }]
  const [leagueName, setLeagueName] = useState('');
  const [error, setError] = useState(false);
  // Distinct from `error`: the league simply isn't covered for this season.
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!leagueId) return;
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      try {
        const result = await fetchStandingsForSeason(leagueId, { season, archive, signal });
        if (!result) throw new Error('no standings');
        if (signal.aborted) return;
        if (result.status !== 'final') {
          setUnavailable(true);
          return;
        }
        const data = result.data;
        setLeagueName(data.league?.name || '');
        setRoster(data.standings.results.map((r) => ({
          entry: r.entry,
          playerName: r.player_name,
          entryName: r.entry_name,
        })));
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(true);
      }
    })();

    return () => controller.abort();
  }, [leagueId, season, archive]);

  return (
    <WrappedScreen className="flex flex-col px-6 pt-safe-bar pb-safe-10">
      <header className="border-b-2 border-wrapped-ink pb-3">
        {/* B: tracking on the static label only — never on the variable name token */}
        <p className="font-mono text-[11px] uppercase text-wrapped-muted flex items-baseline gap-1 min-w-0">
          <span className="truncate max-w-[60%]">{leagueName || 'Mini-league'}</span>
          <span className="tracking-[0.3em] whitespace-nowrap">· {seasonLabel}</span>
        </p>
        <h1 className="font-display text-5xl leading-[0.9] tracking-tight mt-2">
          Which one are you?
        </h1>
      </header>

      {error && (
        <p className="font-mono text-sm text-wrapped-stamp mt-6">Couldn&apos;t load this league.</p>
      )}
      {unavailable && (
        <p className="font-mono text-sm text-wrapped-muted mt-6">
          This league isn&apos;t covered for {seasonLabel}.
        </p>
      )}
      {!error && !unavailable && roster === null && (
        <p className="font-mono text-sm text-wrapped-muted mt-6">Loading the roster…</p>
      )}

      <ul className="mt-2 divide-y divide-wrapped-ink/30">
        {(roster || []).map((m) => (
          <li key={m.entry}>
            <button
              type="button"
              onClick={() => onPick(m.entry, leagueName)}
              className="w-full flex items-baseline justify-between gap-4 py-4 text-left hover:bg-wrapped-ink/[0.04]"
            >
              <span className={`font-display ${nameSizeClass(m.playerName, ['text-2xl', 'text-xl', 'text-lg', 'text-base'])} leading-none tracking-tight flex-1 min-w-0 [overflow-wrap:anywhere]`}>
                {m.playerName}
              </span>
              <span className="font-mono text-xs text-wrapped-muted truncate max-w-[45%]">
                {m.entryName}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onMakeYourOwn}
        className="mt-8 self-start font-mono text-xs uppercase tracking-[0.2em] text-wrapped-green underline underline-offset-4"
      >
        Not in this league? Make your own →
      </button>
    </WrappedScreen>
  );
}
