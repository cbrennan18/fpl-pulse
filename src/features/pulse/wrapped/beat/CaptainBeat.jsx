// features/pulse/wrapped/beat/CaptainBeat.jsx
//
// Beat 2 — "Captain". Rendered THROUGH BeatShell (chrome untouched). Three linear
// screens (design-spec §4 allows >2 for data-heavy beats; the chart gets its own
// screen so it stays legible at mobile width — art-direction "one idea per
// screen"):
//   screen 0 — the question (cold open).
//   screen 1 — your accuracy hero + the league comparison table.
//   screen 2 — the 3-line cumulative chart + the C-vs-VC verdict.
//
// Linear navigation = the shell's default onNext; no guarded-onNext (that pattern
// is only for skip-risk in-place reveals, which 3 plain screens avoid).

import { useMemo } from 'react';
import BeatShell from './BeatShell';
import CaptainChart from './CaptainChart';
import { useWrapped } from '../PackContext';
import { computeCaptain, buildVerdict, pct } from '../calc/captain';

export default function CaptainBeat({ screenIndex, ...shell }) {
  const { entries, members, you, seasonElements, finishedGwIds } = useWrapped();

  const result = useMemo(
    () => computeCaptain({ entries, members, you, seasonElements, finishedGwIds }),
    [entries, members, you, seasonElements, finishedGwIds]
  );

  return (
    <BeatShell {...shell}>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
        {shell.beat.edition} — {shell.beat.theme}
      </p>

      {screenIndex === 0 && <QuestionScreen />}
      {screenIndex === 1 && <AccuracyScreen result={result} />}
      {screenIndex === 2 && <ChartScreen result={result} />}
    </BeatShell>
  );
}

function QuestionScreen() {
  return (
    <div className="mt-4">
      <h2 className="font-display text-6xl leading-[0.9] tracking-tight">
        Who in your league actually nailed the armband?
      </h2>
      <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
        Every week you doubled someone. We checked how often it was the right call —
        and what your vice would&apos;ve done instead.
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-8">
        Tap to see how you ranked →
      </p>
    </div>
  );
}

function ComparisonRow({ label, accuracy, isYou }) {
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-wrapped-ink/15">
      <span className={`flex-1 truncate font-sans text-[15px] ${isYou ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink'}`}>
        {label}
      </span>
      <span className={`w-16 text-right tabular-nums font-sans text-[15px] ${isYou ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink'}`}>
        {pct(accuracy)}%
      </span>
    </div>
  );
}

function AccuracyScreen({ result }) {
  const { you, winner, bestPicker, leagueAvgAccuracy } = result;
  if (!you) return null;

  return (
    <div className="mt-4 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        Captain accuracy
      </p>

      {/* hero numeral — your accuracy */}
      <div className="flex items-baseline gap-2 mt-1">
        <span className="font-display text-[7rem] leading-[0.8] tabular-nums text-wrapped-green">
          {pct(you.accuracy)}
        </span>
        <span className="font-display text-4xl text-wrapped-green">%</span>
      </div>
      <p className="font-sans text-sm text-wrapped-muted -mt-1">
        You nailed your top XI scorer {you.nailed} of {you.denom} weeks.
      </p>

      {/* programme table */}
      <div className="mt-5">
        <div className="flex items-baseline gap-3 pb-1 border-b border-wrapped-ink font-mono text-[10px] uppercase tracking-[0.2em] text-wrapped-muted">
          <span className="flex-1">Manager</span>
          <span className="w-16 text-right">Nailed</span>
        </div>
        <ComparisonRow label="You" accuracy={you.accuracy} isYou />
        <ComparisonRow label={`${winner.name} · winner`} accuracy={winner.accuracy} isYou={winner.isYou} />
        <ComparisonRow label={`${bestPicker.name} · best picker`} accuracy={bestPicker.accuracy} isYou={bestPicker.isYou} />
        <ComparisonRow label="League average" accuracy={leagueAvgAccuracy} />
      </div>

      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-auto pt-4">
        Tap for the season-long picture →
      </p>
    </div>
  );
}

function ChartScreen({ result }) {
  const { you, chart } = result;
  if (!you) return null;

  return (
    <div className="mt-4 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        Cumulative captain points
      </p>

      <div className="mt-3">
        <CaptainChart
          gws={chart.gws}
          youActual={chart.youActual}
          youCvc={chart.youCvc}
          winnerActual={chart.winnerActual}
          peakIndex={chart.peakIndex}
        />
      </div>

      <p className="font-sans text-lg leading-snug mt-auto pt-4 border-t border-wrapped-ink/30 [overflow-wrap:anywhere]">
        {buildVerdict(you)}
      </p>
    </div>
  );
}
