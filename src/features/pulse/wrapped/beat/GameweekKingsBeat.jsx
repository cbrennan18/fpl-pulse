// features/pulse/wrapped/beat/GameweekKingsBeat.jsx
//
// Beat 6 — "Gameweek Kings". Rendered THROUGH BeatShell (chrome untouched).
// Opens Act III on an UP energy. Two screens (design-spec §4 — not multi-part):
//   screen 0 — the question (cold open).
//   screen 1 — weekly-wins leaderboard + your best-GW hero + the dry verdict.
//
// Linear navigation = the shell's default onNext; no guarded-onNext (no skip-risk
// in-place reveal here). `WinRow` is the per-beat ComparisonRow duplication the
// convention sanctions.
//
// Colour: green = you (your row + your hero numeral); gold = the single season
// record GW (one legit peak — if you hold it, your numeral is gold). NO loss-red.
//
// 360px note: leaderboard + hero + verdict is dense (beats 2 & 5 split for less).
// If a real-device eyeball starves, split to 3 screens (leaderboard / hero+verdict)
// and bump constants slot-6 screenCount 2 → 3.

import { useMemo } from 'react';
import BeatShell from './BeatShell';
import { useWrapped } from '../PackContext';
import { computeGameweekKings, buildVerdict } from '../calc/gameweekKings';
import { ordinal } from '../calc/setAndForget';

// Show the leader, you, and a few of the top tally — not all N (density).
function leaderboardRows(result) {
  const { winsRows, you } = result;
  const top = winsRows.slice(0, 5);
  if (you && !top.some((r) => r.entryId === you.entryId)) {
    const youRow = winsRows.find((r) => r.entryId === you.entryId);
    if (youRow) top.push(youRow);
  }
  return top;
}

export default function GameweekKingsBeat({ screenIndex, ...shell }) {
  const { entries, members, you, finishedGwIds } = useWrapped();

  const result = useMemo(
    () => computeGameweekKings({ entries, members, you, finishedGwIds }),
    [entries, members, you, finishedGwIds]
  );

  return (
    <BeatShell {...shell}>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
        {shell.beat.edition} — {shell.beat.theme}
      </p>

      {screenIndex === 0 && <QuestionScreen />}
      {screenIndex === 1 && <PayoffScreen result={result} />}
    </BeatShell>
  );
}

function QuestionScreen() {
  return (
    <div className="mt-4">
      <h2 className="font-display text-6xl leading-[0.9] tracking-tight">
        Who actually owned the weeks?
      </h2>
      <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
        Thirty-eight gameweeks, one top score each. We tallied who topped your
        league the most — and dug out your single biggest week.
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-8">
        Tap to crown the kings →
      </p>
    </div>
  );
}

function WinRow({ row }) {
  const { name, wins, isYou } = row;
  const tone = isYou ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink';
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-wrapped-ink/15">
      <span className={`flex-1 truncate font-sans text-[15px] ${tone}`}>
        {isYou ? 'You' : name}
      </span>
      <span className={`w-20 text-right tabular-nums font-sans text-[15px] ${tone}`}>
        {wins} {wins === 1 ? 'week' : 'weeks'}
      </span>
    </div>
  );
}

function PayoffScreen({ result }) {
  const { you, leagueRecord, youBest, youHoldRecord } = result;
  if (!you) return null;
  const rows = leaderboardRows(result);
  const heroTone = youHoldRecord ? 'text-wrapped-gold' : 'text-wrapped-green';

  return (
    <div className="mt-4 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        Weekly wins
      </p>

      {/* programme table — who topped the most gameweeks */}
      <div className="mt-2">
        <div className="flex items-baseline gap-3 pb-1 border-b border-wrapped-ink font-mono text-[10px] uppercase tracking-[0.2em] text-wrapped-muted">
          <span className="flex-1">Manager</span>
          <span className="w-20 text-right">GWs won</span>
        </div>
        {rows.map((r) => (
          <WinRow key={r.entryId} row={r} />
        ))}
      </div>
      <p className="font-sans text-[13px] text-wrapped-muted mt-2">
        You: {you.wins} {you.wins === 1 ? 'win' : 'wins'} · {ordinal(result.yourWinsRank)} of {result.count}
      </p>

      {/* hero — your single best gameweek (gold if it's the season record) */}
      {youBest && (
        <div className="mt-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
            Your best gameweek
          </p>
          <div className="flex items-baseline gap-3 mt-1">
            <span className={`font-display text-[6.5rem] leading-[0.8] tabular-nums ${heroTone}`}>
              {youBest.value}
            </span>
            <div className="leading-tight">
              <span className="block font-display text-3xl text-wrapped-ink">GW{youBest.gw}</span>
              <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-wrapped-muted">
                {youHoldRecord
                  ? "league's best"
                  : `${ordinal(result.youBestRank)} of ${result.count}`}
              </span>
            </div>
          </div>
          {!youHoldRecord && leagueRecord && (
            <p className="font-sans text-[13px] text-wrapped-muted mt-1">
              League record: {leagueRecord.value} — {leagueRecord.name}, GW{leagueRecord.gw}.
            </p>
          )}
        </div>
      )}

      <p className="font-sans text-lg leading-snug mt-auto pt-4 border-t border-wrapped-ink/30 [overflow-wrap:anywhere]">
        {buildVerdict(result)}
      </p>
    </div>
  );
}
