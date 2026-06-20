// features/pulse/wrapped/beat/TransferTimingBeat.jsx
//
// Beat 3 — "Transfer Timing". Rendered THROUGH BeatShell (chrome untouched). Two
// screens (design-spec §4 gives beat 3 exactly two; the lighter breather doesn't
// need a third):
//   screen 0 — the question (cold open).
//   screen 1 — the payoff: your swing hero numeral + the per-corridor swing strip
//              plot + the timing-facts stat row + the timing-quality verdict.
//
// Linear navigation = the shell's default onNext. The strip plot's dot-selection
// is in-screen state (a caption beneath the plot), NOT a nav step — and it
// stopPropagation's so a dot tap never advances the beat.

import { useMemo, useState } from 'react';
import BeatShell from './BeatShell';
import TransferStrip from './TransferStrip';
import { useWrapped } from '../PackContext';
import {
  computeTransferTiming,
  buildVerdict,
  corridorLabel,
  fmtSwing,
  fmtTiming,
} from '../calc/transferTiming';

// Caption for a tapped dot: "Dave · Day 0 · 12 transfers · −0.4 avg".
function dotCaption(d) {
  if (!d) return null;
  const n = d.count;
  return `${d.name} · ${corridorLabel(d.corridor)} · ${n} transfer${n === 1 ? '' : 's'} · ${fmtSwing(d.avgSwing)} avg`;
}

export default function TransferTimingBeat({ screenIndex, ...shell }) {
  const { entries, members, you, bootstrap, seasonElements, finishedGwIds } = useWrapped();

  const result = useMemo(
    () => computeTransferTiming({ entries, members, you, bootstrap, seasonElements, finishedGwIds }),
    [entries, members, you, bootstrap, seasonElements, finishedGwIds]
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
        When you pull the trigger, does it actually pay off?
      </h2>
      <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
        Early planner or deadline-day gambler — we lined up every transfer against
        when you made it, and what it swung the week you made it.
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-8">
        Tap to see where you land &rarr;
      </p>
    </div>
  );
}

function StatRow({ label, value, isYou }) {
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-wrapped-ink/15">
      <span className={`flex-1 truncate font-sans text-[15px] ${isYou ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink'}`}>
        {label}
      </span>
      <span className={`text-right tabular-nums font-sans text-[15px] ${isYou ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink'}`}>
        {value}
      </span>
    </div>
  );
}

function PayoffScreen({ result }) {
  const { you, league, dots, corridorBaselines } = result;
  const [selected, setSelected] = useState(null);

  if (!you) {
    return (
      <p className="font-sans text-base text-wrapped-muted mt-8">
        Not enough transfers this season to call it — you mostly left it alone.
      </p>
    );
  }

  const avg = you.avgSwingPerTransfer;
  const heroColor = avg >= 0 ? 'text-wrapped-green' : 'text-wrapped-ink';

  return (
    <div className="mt-3 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        Avg swing per transfer
      </p>

      {/* hero numeral — your average net swing per transfer (signed) */}
      <div className="flex items-baseline gap-2 -mt-1">
        <span className={`font-display text-[6rem] leading-[0.8] tabular-nums ${heroColor}`}>
          {fmtSwing(avg)}
        </span>
        <span className="font-sans text-sm text-wrapped-muted">
          over {you.total} transfers
        </span>
      </div>

      <div className="mt-3">
        <TransferStrip
          dots={dots}
          corridorBaselines={corridorBaselines}
          selectedId={selected?.entryId ?? null}
          onSelect={setSelected}
        />
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-wrapped-muted mt-1 h-4">
          {selected ? dotCaption(selected) : 'Tap a dot for a manager’s corridor'}
        </p>
      </div>

      {/* timing facts — a compact programme table */}
      <div className="mt-3">
        <StatRow label="You · average move" value={fmtTiming(you.avgHours)} isYou />
        <StatRow label="Your earliest" value={fmtTiming(you.earliestHours)} isYou />
        {league.latest && (
          <StatRow label={`${league.latest.name} · latest in league`} value={fmtTiming(league.latest.hours)} />
        )}
      </div>

      <p className="font-sans text-lg leading-snug mt-auto pt-3 border-t border-wrapped-ink/30 [overflow-wrap:anywhere]">
        {buildVerdict(you)}
      </p>
    </div>
  );
}
