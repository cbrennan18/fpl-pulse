// features/pulse/wrapped/beat/SetAndForgetBeat.jsx
//
// Beat 1 — "Set & Forget". Rendered THROUGH BeatShell (chrome stays untouched).
// Two screens:
//   screen 0 — the question (cold open).
//   screen 1 — the data, an in-place reveal: FIRST the frozen set-and-forget
//              table (ranked by baseline total); on tap the rows animate
//              (Framer `layout` = FLIP) into management-delta order.
//
// The A→B reveal is an in-screen state, NOT a third screen — so this beat owns a
// guarded onNext: on the data screen the first tap reveals (does not advance),
// the next tap advances. Guards:
//   • a fast double-tap can't skip the reveal (400ms swallow after revealing).
//   • leaving the data screen resets the reveal, so coming back (forward OR
//     swipe-back) always re-enters baseline-first.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import BeatShell from './BeatShell';
import DetailSheet from './DetailSheet';
import { useWrapped } from '../PackContext';
import { computeSetAndForget, buildVerdict, getGw1Squad } from '../calc/setAndForget';

// Aliased to capitalised refs so they read as components (the project's eslint
// config doesn't treat `motion.div` member-expression JSX as a use of `motion`).
const MotionRow = motion.div;
const MotionCell = motion.span;

const ROW_SPRING = { type: 'spring', stiffness: 500, damping: 42 };
const POS_LABEL = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

function fmtDelta(delta) {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export default function SetAndForgetBeat({ screenIndex, ...shell }) {
  const { entries, members, you, seasonElements, finishedGwIds, playerPosition, playerName } = useWrapped();

  const result = useMemo(
    () =>
      computeSetAndForget({
        entries,
        members,
        you,
        seasonElements,
        finishedGwIds,
        positionOf: playerPosition,
      }),
    [entries, members, you, seasonElements, finishedGwIds, playerPosition]
  );

  // A (baseline) → B (delta) reveal lives on the data screen only.
  const [revealed, setRevealed] = useState(false);
  const revealedAtRef = useRef(0);

  // Tap→detail: the manager whose frozen GW1 XI is open in the sheet.
  const [detailId, setDetailId] = useState(null);

  // Any time we're not on the data screen, drop back to baseline-first AND close any
  // open sheet — so re-entering the screen (forward or via swipe-back) starts clean.
  useEffect(() => {
    if (screenIndex !== 1) {
      setRevealed(false);
      setDetailId(null);
    }
  }, [screenIndex]);

  const detailRow = detailId != null ? result.rows.find((r) => r.entryId === detailId) : null;
  const detailSquad = detailId != null ? getGw1Squad(entries[detailId], playerName, playerPosition) : [];

  const handleNext = () => {
    if (screenIndex === 1 && !revealed) {
      setRevealed(true);
      revealedAtRef.current = Date.now();
      return; // first tap reveals; it must not also advance
    }
    // swallow a fast second tap right after the reveal so it can't skip the beat
    if (screenIndex === 1 && Date.now() - revealedAtRef.current < 400) return;
    shell.onNext();
  };

  return (
    <BeatShell {...shell} onNext={handleNext}>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
        {shell.beat.edition} — {shell.beat.theme}
      </p>

      {screenIndex === 0 ? (
        <QuestionScreen />
      ) : (
        <DataScreen result={result} revealed={revealed} onRowTap={setDetailId} />
      )}

      <DetailSheet
        open={detailId != null}
        onClose={() => setDetailId(null)}
        title={detailRow ? `${detailRow.isYou ? 'You' : detailRow.name} · Frozen GW1 XI` : ''}
      >
        <FrozenXi squad={detailSquad} />
      </DetailSheet>
    </BeatShell>
  );
}

// The frozen opening-day XI, ordered by saved slot, tagged by position, with the
// GW1 captain (gold C) and vice (muted V) marked — the squad this manager froze.
function FrozenXi({ squad }) {
  if (!squad.length) {
    return <p className="font-sans text-sm text-wrapped-muted">No opening-day squad on record.</p>;
  }
  return (
    <ul>
      {squad.map((p) => (
        <li key={p.element} className="flex items-baseline gap-3 py-1.5 border-b border-wrapped-ink/15">
          <span className="w-9 font-mono text-[11px] uppercase tracking-[0.1em] text-wrapped-muted">
            {POS_LABEL[p.type] || '—'}
          </span>
          <span className="flex-1 truncate font-sans text-[15px] text-wrapped-ink">{p.name}</span>
          {p.isCaptain && (
            <span className="font-mono text-[11px] font-bold text-wrapped-gold">C</span>
          )}
          {p.isVice && (
            <span className="font-mono text-[11px] text-wrapped-muted">V</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function QuestionScreen() {
  return (
    <div className="mt-4">
      <h2 className="font-display text-6xl leading-[0.9] tracking-tight">
        Who&apos;d still be winning if they never touched their team?
      </h2>
      <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
        Freeze every manager&apos;s opening-day XI and run it to today — same eleven,
        same captain, every week.
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-8">
        Tap to see the frozen table →
      </p>
    </div>
  );
}

function DataScreen({ result, revealed, onRowTap }) {
  const ordered = revealed ? result.byDelta : result.byBaseline;
  const verdict = buildVerdict(result.you, result.youDeltaRank);

  return (
    <div className="mt-4 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        {revealed ? 'Ranked by your moves' : 'Frozen since August'}
      </p>

      {/* column header */}
      <div className="flex items-baseline gap-3 mt-3 pb-1 border-b border-wrapped-ink font-mono text-[10px] uppercase tracking-[0.2em] text-wrapped-muted">
        <span className="w-5 text-right tabular-nums">#</span>
        <span className="flex-1">Manager</span>
        <span className="w-14 text-right">Frozen</span>
        {revealed && <span className="w-14 text-right">Moves</span>}
      </div>

      {/* rows — Framer `layout` animates the re-sort (FLIP) */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {ordered.map((row, i) => (
          <MotionRow
            layout
            key={row.entryId}
            transition={ROW_SPRING}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation(); // a row tap opens the sheet; never advance/reveal
              onRowTap(row.entryId);
            }}
            className="flex items-baseline gap-3 py-1.5 border-b border-wrapped-ink/15 cursor-pointer"
          >
            <span className="w-5 text-right tabular-nums font-mono text-sm text-wrapped-muted">
              {i + 1}
            </span>
            <span
              className={`flex-1 truncate font-sans text-[15px] ${
                row.isYou
                  ? 'text-wrapped-green font-semibold'
                  : 'text-wrapped-ink'
              }`}
            >
              {row.name}
            </span>
            <span
              className={`w-14 text-right tabular-nums font-sans text-[15px] ${
                revealed ? 'text-wrapped-muted' : 'text-wrapped-ink'
              }`}
            >
              {row.baselineTotal}
            </span>
            {revealed && (
              <MotionCell
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`w-14 text-right tabular-nums font-sans text-[15px] ${
                  row.isYou ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink'
                }`}
              >
                {fmtDelta(row.delta)}
              </MotionCell>
            )}
          </MotionRow>
        ))}
      </div>

      {/* verdict slot — appears once the reveal lands */}
      <p className="font-sans text-lg leading-snug mt-auto pt-4 border-t border-wrapped-ink/30 [overflow-wrap:anywhere]">
        {revealed ? (
          verdict || 'Frozen since August, the table tells the story.'
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
            Tap to reveal who added value →
          </span>
        )}
      </p>
    </div>
  );
}
