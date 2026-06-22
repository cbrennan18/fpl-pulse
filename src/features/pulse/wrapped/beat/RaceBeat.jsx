// features/pulse/wrapped/beat/RaceBeat.jsx
//
// Beat 10 — "The Race" (the CLIMAX). Rendered THROUGH BeatShell (chrome untouched).
// A mini-league season reduces to one question — did I beat them? Three screens
// (design-spec §4 — multi-part; slot-10 screenCount: 3):
//   screen 0 — rivalry setup (question). The nemesis is NOT named yet.
//   screen 1 — the race chart (HERO): 3 in-league rank lines across 38 GWs, your
//              line draws in (decorative autoplay, not a gate). Rival un-named.
//   screen 2 — the nemesis RESOLVES OUT OF the chart: a guarded sealed reveal —
//              tap to unseal the named win/loss verdict, tap again to advance.
//
// Calc lives in calc/race.js. Nemesis = the season-long shadow (reading b, pinned
// by design-spec §4). Colour: green = you; ink = nemesis (the rival that matters —
// per-beat exception to art-direction §5, see RaceChart header); muted = winner;
// gold = your single peak rank. NO loss-red.
//
// Guarded sealed reveal (Maverick/Bench guarded-onNext precedent): on screen 2 the
// first body tap UNSEALS (reveals the name + verdict) and does not advance; a fast
// second tap is swallowed (400ms) so the climax can't be skipped past; leaving the
// screen re-seals it. Release valve: if the seal reads gimmicky on a real device,
// drop `sealed`/`handleNext` and render VerdictBody directly (one-line change).

import { useEffect, useMemo, useRef, useState } from 'react';
import BeatShell from './BeatShell';
import RaceChart from './RaceChart';
import { useWrapped } from '../PackContext';
import { computeRace, buildVerdict } from '../calc/race';
import { ordinal } from '../calc/setAndForget';

const REVEAL_SCREEN = 2;

export default function RaceBeat({ screenIndex, ...shell }) {
  const { entries, members, you, finishedGwIds } = useWrapped();

  const result = useMemo(
    () => computeRace({ entries, members, you, finishedGwIds }),
    [entries, members, you, finishedGwIds]
  );

  const [sealed, setSealed] = useState(true);
  const unsealedAtRef = useRef(0);

  // Re-seal whenever we leave the verdict screen (forward or swipe-back).
  useEffect(() => {
    if (screenIndex !== REVEAL_SCREEN) setSealed(true);
  }, [screenIndex]);

  const handleNext = () => {
    if (screenIndex === REVEAL_SCREEN && sealed) {
      setSealed(false);
      unsealedAtRef.current = Date.now();
      return; // first tap unseals — never advances
    }
    if (screenIndex === REVEAL_SCREEN && Date.now() - unsealedAtRef.current < 400) {
      return; // swallow a fast double-tap so the climax isn't skipped
    }
    shell.onNext();
  };

  return (
    <BeatShell {...shell} onNext={handleNext}>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
        {shell.beat.edition} — {shell.beat.theme}
      </p>

      {screenIndex === 0 && <QuestionScreen />}
      {screenIndex === 1 && <RaceScreen result={result} />}
      {screenIndex === 2 && <VerdictScreen result={result} sealed={sealed} />}
    </BeatShell>
  );
}

function QuestionScreen() {
  return (
    <div className="mt-4">
      <h2 className="font-display text-6xl leading-[0.9] tracking-tight">
        All season, it came down to you and one other.
      </h2>
      <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
        Thirty-eight gameweeks of climbing and slipping in your league. One rival
        shadowed you the whole way. Did you beat them?
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-8">
        Tap to run the race →
      </p>
    </div>
  );
}

function RaceScreen({ result }) {
  if (!result?.you) return null;
  const { gws, you, nemesis, context, count, contextLabel } = result;
  const swaps = nemesis?.leadChanges ?? 0;

  return (
    <div className="mt-3 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        League rank · every gameweek
      </p>

      <div className="mt-2">
        <RaceChart
          gws={gws}
          you={you}
          nemesis={nemesis}
          context={context}
          count={count}
          contextLabel={contextLabel}
        />
      </div>

      <p className="font-sans text-[13px] text-wrapped-muted mt-3">
        {swaps > 0
          ? `You and your rival swapped places ${swaps} ${swaps === 1 ? 'time' : 'times'} this season.`
          : 'Your rival shadowed you all season without ever letting go.'}
      </p>

      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-auto">
        Tap to name your nemesis →
      </p>
    </div>
  );
}

function VerdictScreen({ result, sealed }) {
  if (!result?.you || !result.nemesis) return null;

  if (sealed) {
    return (
      <div className="mt-4 flex flex-col h-full">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
          The verdict
        </p>
        <h2 className="font-display text-7xl leading-[0.85] tracking-tight mt-4">
          And your nemesis was…
        </h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-auto animate-pulse">
          Tap to reveal →
        </p>
      </div>
    );
  }

  return <VerdictBody result={result} />;
}

function VerdictBody({ result }) {
  const { nemesis, you, count, youWon, youAreWinner } = result;

  return (
    <div className="mt-3 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        Your nemesis
      </p>

      {/* the named rival — Bebas hero (green if you came out ahead, else ink) */}
      <span
        className={`font-display text-[5rem] leading-[0.85] tracking-tight [overflow-wrap:anywhere] ${
          youWon ? 'text-wrapped-green' : 'text-wrapped-ink'
        }`}
      >
        {nemesis.name}
      </span>

      {/* the two finishes, in-league (comparison-set discipline) */}
      <div className="mt-5 flex items-end gap-6">
        <FinishStat label="You finished" value={you.finish} count={count} you />
        <span className="font-display text-3xl text-wrapped-muted pb-2">vs</span>
        <FinishStat label={`${nemesis.name} finished`} value={nemesis.finish} count={count} />
      </div>

      {/* the win/loss binary — the screenshot payload, both directions */}
      <p className="font-sans text-xl leading-snug mt-auto pt-4 border-t border-wrapped-ink/30 [overflow-wrap:anywhere]">
        {buildVerdict(result)}
        {youAreWinner && ' '}
        {youAreWinner && <span className="text-wrapped-green font-semibold">League champion.</span>}
      </p>
    </div>
  );
}

function FinishStat({ label, value, count, you = false }) {
  return (
    <div>
      <span className={`font-display text-5xl leading-none tabular-nums ${you ? 'text-wrapped-green' : 'text-wrapped-ink'}`}>
        {value != null ? ordinal(value) : '—'}
      </span>
      <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-wrapped-muted mt-1">
        {label} · of {count}
      </span>
    </div>
  );
}
