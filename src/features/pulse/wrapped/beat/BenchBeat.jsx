// features/pulse/wrapped/beat/BenchBeat.jsx
//
// Beat 8 — "The Bench". Rendered THROUGH BeatShell (chrome untouched). The story's
// single concentrated regret trough — stated flat and dry, turned once. Three
// screens (design-spec §4):
//   screen 0 — the question.
//   screen 1 — your total recoverable points (hero) + the 38-cell heatmap; tap a
//              cell to reveal that week's same-position swaps.
//   screen 2 — the corrected-finish verdict: re-rank the whole league with every
//              bench corrected the same way → your true counterfactual finish.
//
// Metric + re-rank live in calc/bench.js. The heatmap follows the warm-editorial
// mock-lock (ink-density on cream, hairline cell border load-bearing, green check
// for nailed-it). Interaction: cell taps are in-screen state and stopPropagation
// so they never advance the beat; leaving the heatmap screen resets the selection.
//
// Colour: green = nailed-it / you. The recoverable hero is INK (it's a regret
// figure, not a gain — green would misread, red is banned). Gold is OMITTED (a
// regret beat has no celebratory peak). NO loss-red anywhere.

import { useEffect, useState } from 'react';
import BeatShell from './BeatShell';
import BenchHeatmap from './BenchHeatmap';
import { useWrapped } from '../PackContext';
import { computeBench, buildVerdict, ordinal } from '../calc/bench';

const HEATMAP_SCREEN = 1;

export default function BenchBeat({ screenIndex, ...shell }) {
  const { entries, members, you, seasonElements, finishedGwIds, playerPosition, playerName } = useWrapped();

  const result = computeBench({
    entries,
    members,
    you,
    seasonElements,
    finishedGwIds,
    playerPosition,
    playerName,
  });

  const [selectedGw, setSelectedGw] = useState(null);

  // Leaving the heatmap (forward or swipe-back) resets the selection.
  useEffect(() => {
    if (screenIndex !== HEATMAP_SCREEN) setSelectedGw(null);
  }, [screenIndex]);

  return (
    <BeatShell {...shell}>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
        {shell.beat.edition} — {shell.beat.theme}
      </p>

      {screenIndex === 0 && <QuestionScreen />}
      {screenIndex === 1 && (
        <HeatmapScreen result={result} selectedGw={selectedGw} onSelect={setSelectedGw} />
      )}
      {screenIndex === 2 && <VerdictScreen result={result} />}
    </BeatShell>
  );
}

function QuestionScreen() {
  return (
    <div className="mt-4">
      <h2 className="font-display text-6xl leading-[0.9] tracking-tight">
        How much was sat on your bench?
      </h2>
      <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
        Your formation, week by week — but the best XI you could have started from
        it. Same shape, same positions. Just the right players.
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-8">
        Tap to count the cost →
      </p>
    </div>
  );
}

function HeatmapScreen({ result, selectedGw, onSelect }) {
  if (!result.you) return null;
  const { recoverableTotal, cells, maxCell } = result.you;
  return (
    <div className="mt-3 flex flex-col h-full">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-7xl leading-none tabular-nums text-wrapped-ink">
          {recoverableTotal}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-wrapped-muted">
          recoverable points
          <br />left on your bench
        </span>
      </div>

      <BenchHeatmap
        cells={cells}
        maxCell={maxCell}
        selectedGw={selectedGw}
        onSelect={onSelect}
      />
    </div>
  );
}

function VerdictScreen({ result }) {
  if (!result.you) return null;
  const { actualFinish, correctedFinish, count } = result;
  return (
    <div className="mt-3 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        Corrected for everyone&apos;s bench
      </p>

      <div className="mt-6 flex items-end gap-6">
        <FinishStat label="As it finished" value={actualFinish} count={count} />
        <span className="font-display text-4xl text-wrapped-muted pb-2">→</span>
        <FinishStat label="Bench corrected" value={correctedFinish} count={count} you />
      </div>

      <p className="font-sans text-lg leading-snug mt-auto pt-4 border-t border-wrapped-ink/30 [overflow-wrap:anywhere]">
        {buildVerdict(result)}
      </p>
    </div>
  );
}

function FinishStat({ label, value, count, you = false }) {
  return (
    <div>
      <span className={`font-display text-6xl leading-none tabular-nums ${you ? 'text-wrapped-green' : 'text-wrapped-ink'}`}>
        {ordinal(value)}
      </span>
      <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-wrapped-muted mt-1">
        {label} · of {count}
      </span>
    </div>
  );
}
