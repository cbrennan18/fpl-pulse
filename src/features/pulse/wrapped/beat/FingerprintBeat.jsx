// features/pulse/wrapped/beat/FingerprintBeat.jsx
//
// Beat 5 — "Your Fingerprint". Rendered THROUGH BeatShell (chrome untouched).
// Three linear screens (design-spec defaults to 2, but the 12-bar chart + the
// raw-rank diagnosis + verdict starve a single 360px screen — beats 2 & 3 took
// the same extra screen; constants.js slot-5 screenCount is bumped to 3). The
// split also reinforces the deliberate share-vs-raw separation:
//   screen 0 — the question (cold open).
//   screen 1 — the SHARE picture: position bars (you / winner / avg).
//   screen 2 — the RAW-rank diagnosis (each rank shown "of N") + the verdict.
//
// Linear navigation = the shell's default onNext; no guarded-onNext (that's only
// for skip-risk in-place reveals, which three plain screens avoid).

import { useMemo } from 'react';
import BeatShell from './BeatShell';
import FingerprintBars from './FingerprintBars';
import { useWrapped } from '../PackContext';
import { computeFingerprint, buildVerdict } from '../calc/fingerprint';
import { ordinal } from '../calc/setAndForget';

export default function FingerprintBeat({ screenIndex, ...shell }) {
  const { entries, members, you, seasonElements, finishedGwIds, playerPosition } = useWrapped();

  const result = useMemo(
    () => computeFingerprint({ entries, members, you, seasonElements, finishedGwIds, playerPosition }),
    [entries, members, you, seasonElements, finishedGwIds, playerPosition]
  );

  return (
    <BeatShell {...shell}>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
        {shell.beat.edition} — {shell.beat.theme}
      </p>

      {screenIndex === 0 && <QuestionScreen />}
      {screenIndex === 1 && <ChartScreen result={result} />}
      {screenIndex === 2 && <DiagnosisScreen result={result} />}
    </BeatShell>
  );
}

function QuestionScreen() {
  return (
    <div className="mt-4">
      <h2 className="font-display text-6xl leading-[0.9] tracking-tight">
        Where did your season&apos;s points actually come from?
      </h2>
      <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
        Every point your XI scored, sorted into goalkeeper, defence, midfield and
        attack — then measured against your league.
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-8">
        Tap to see the shape of your season →
      </p>
    </div>
  );
}

function ChartScreen({ result }) {
  const { you, winner, chart } = result;
  if (!you || !winner) return null;

  return (
    <div className="mt-4 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        Points by position · share
      </p>

      <div className="mt-3">
        <FingerprintBars positions={chart.positions} winnerName={winner.name} />
      </div>

      <p className="font-sans text-sm text-wrapped-muted mt-4">
        Green is you. Ink is <span className="text-wrapped-ink font-semibold">{winner.name}</span>,
        your league winner — where the shapes part is where the season was won and lost.
      </p>

      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-auto pt-4">
        Tap for the diagnosis →
      </p>
    </div>
  );
}

// Per-position raw-rank row (programme table idiom; ink/muted only — the weak
// position is never coloured red). The weak link carries a quiet mono tag.
function RankRow({ pos, count, isWeak }) {
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-wrapped-ink/15">
      <span className="w-12 font-mono text-[13px] uppercase tracking-[0.1em] text-wrapped-ink">
        {pos.label}
      </span>
      <span className="flex-1 font-sans text-[15px] text-wrapped-ink tabular-nums">
        {ordinal(pos.rank)}{' '}
        <span className="text-wrapped-muted text-[12px]">of {count}</span>
        {isWeak && (
          <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.15em] text-wrapped-muted">
            weak link
          </span>
        )}
      </span>
      <span className="w-14 text-right tabular-nums font-sans text-[15px] text-wrapped-muted">
        {pos.points}
      </span>
    </div>
  );
}

function DiagnosisScreen({ result }) {
  const { diagnosis, count } = result;
  if (!diagnosis) return null;
  const { overallRank, perPosition, weakest } = diagnosis;

  return (
    <div className="mt-4 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        Where you rank, position by position
      </p>

      {/* hero numeral — your overall league rank */}
      <div className="flex items-baseline gap-2 mt-1">
        <span className="font-display text-[7rem] leading-[0.8] tabular-nums text-wrapped-ink">
          {ordinal(overallRank)}
        </span>
        <span className="font-sans text-sm text-wrapped-muted">of {count} overall</span>
      </div>

      {/* programme table — RAW points per position, each rank shown "of N" */}
      <div className="mt-4">
        <div className="flex items-baseline gap-3 pb-1 border-b border-wrapped-ink font-mono text-[10px] uppercase tracking-[0.2em] text-wrapped-muted">
          <span className="w-12">Pos</span>
          <span className="flex-1">League rank</span>
          <span className="w-14 text-right">Points</span>
        </div>
        {perPosition.map((pos) => (
          <RankRow key={pos.key} pos={pos} count={count} isWeak={!diagnosis.isBalanced && pos.key === weakest.key} />
        ))}
      </div>

      <p className="font-sans text-lg leading-snug mt-auto pt-4 border-t border-wrapped-ink/30 [overflow-wrap:anywhere]">
        {buildVerdict(diagnosis, count)}
      </p>
    </div>
  );
}
