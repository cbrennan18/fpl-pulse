// features/pulse/wrapped/beat/ChipsBeat.jsx
//
// Beat 7 — "Chips". Rendered THROUGH BeatShell (chrome untouched). Two screens:
//   screen 0 — the question.
//   screen 1 — the chip board: an H1/H2 toggle + four per-chip cards (Bench Boost,
//              Triple Captain, Free Hit, Wildcard). Each card shows the chip, the
//              GW it was played (or "not played this half") and your gain; tap a
//              card to REVEAL the league-best return for that chip + when it was
//              played (the implicit timing read), plus a quiet secondary regret
//              line on BB/TC.
//
// Each chip's gain is computed by its OWN formula (see calc/chips.js) — not a
// unified "chip value". The verdict reads implicitly from the gaps; we never
// assert "you mistimed it".
//
// Interaction (beat-4 precedent, lighter): the H1/H2 toggle and the card reveals
// are IN-SCREEN state, not nav steps. Toggle + card taps stopPropagation so they
// never reach BeatShell's tap-to-advance; a body tap still advances (no gate —
// reveals carry no skip-risk). Leaving the board screen, or flipping the half,
// resets the revealed set. No timers.
//
// Colour: green = you; GOLD marks a chip where you hold the league-best return
// (a legit peak). A chip that gained little stays ink — NO loss-red.

import { useEffect, useState } from 'react';
import BeatShell from './BeatShell';
import Reveal from './Reveal';
import { useWrapped } from '../PackContext';
import { computeChips, buildVerdict, CHIP_KEYS, CHIP_LABEL } from '../calc/chips';

const BOARD_SCREEN = 1;

export default function ChipsBeat({ screenIndex, ...shell }) {
  const { entries, members, you, seasonElements, finishedGwIds, playerPosition } = useWrapped();

  const result = computeChips({
    entries,
    members,
    you,
    seasonElements,
    finishedGwIds,
    playerPosition,
  });

  const [half, setHalf] = useState('H1');
  const [revealed, setRevealed] = useState(() => new Set());

  // Leaving the board (forward or swipe-back) resets reveals to a clean board.
  useEffect(() => {
    if (screenIndex !== BOARD_SCREEN) setRevealed(new Set());
  }, [screenIndex]);

  const selectHalf = (h) => {
    if (h === half) return;
    setHalf(h);
    setRevealed(new Set()); // a fresh half starts unrevealed
  };

  const reveal = (key) => {
    setRevealed((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  return (
    <BeatShell {...shell}>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
        {shell.beat.edition} — {shell.beat.theme}
      </p>

      {screenIndex === 0 && <QuestionScreen />}
      {screenIndex === 1 && (
        <BoardScreen
          result={result}
          half={half}
          onHalf={selectHalf}
          revealed={revealed}
          onReveal={reveal}
        />
      )}
    </BeatShell>
  );
}

function QuestionScreen() {
  return (
    <div className="mt-4">
      <h2 className="font-display text-6xl leading-[0.9] tracking-tight">
        Did your big levers pay off?
      </h2>
      <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
        Two of each chip this season — one per half. We worked out what each one
        actually won you, and who in your league timed theirs best.
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-8">
        Tap to open the board →
      </p>
    </div>
  );
}

// --- H1/H2 toggle (ruled segmented control) -----------------------------------

function HalfToggle({ half, onHalf }) {
  const seg = (h, label) => {
    const active = h === half;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // never advance the beat
          onHalf(h);
        }}
        className={`flex-1 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] border border-wrapped-ink rounded-[2px] ${
          active ? 'bg-wrapped-ink text-wrapped-paper' : 'text-wrapped-ink'
        }`}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="flex gap-2 mt-3">
      {seg('H1', 'First half · GW1–19')}
      {seg('H2', 'Second half · GW20+')}
    </div>
  );
}

// --- a single chip card -------------------------------------------------------

function ChipCard({ chipKey, played, leagueBest, extras, revealed, onReveal }) {
  const label = CHIP_LABEL[chipKey];
  const youHoldBest = revealed && leagueBest && leagueBest.isYou;
  const gainTone = youHoldBest ? 'text-wrapped-gold' : 'text-wrapped-green';

  // The right-hand figure: your gain, "n/a" for a played-but-uncomputable chip
  // (back-to-back chip), or nothing for a chip you didn't play this half.
  let figure = null;
  if (played && played.gain != null) {
    figure = (
      <span className={`tabular-nums font-display text-4xl shrink-0 ${gainTone}`}>
        {played.gain >= 0 ? '+' : ''}{played.gain}
      </span>
    );
  } else if (played) {
    figure = <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-wrapped-muted shrink-0">gain n/a</span>;
  }

  const subline = played
    ? `GW${played.gw}`
    : 'Not played this half';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // a card tap reveals; it must never advance the beat
        onReveal(chipKey);
      }}
      className="w-full text-left px-3 py-2.5 border border-wrapped-ink/30 rounded-[2px]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <span className="block font-display text-2xl text-wrapped-ink leading-none">{label}</span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-wrapped-muted mt-1">
            {subline}
          </span>
        </div>
        {figure}
      </div>

      <Reveal show={revealed} className="mt-2 pt-2 border-t border-wrapped-ink/15">
        <LeagueBestLine youHoldBest={youHoldBest} leagueBest={leagueBest} />
        <RegretLine chipKey={chipKey} played={played} extras={extras} />
      </Reveal>
    </button>
  );
}

function LeagueBestLine({ youHoldBest, leagueBest }) {
  if (!leagueBest) {
    return (
      <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-wrapped-muted">
        No one played it this half
      </span>
    );
  }
  if (youHoldBest) {
    return (
      <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-wrapped-gold">
        Best return in your league
      </span>
    );
  }
  // implicit timing read — the GW-vs-GW + points gap speaks for itself
  return (
    <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-wrapped-muted">
      Best: {leagueBest.name} · +{leagueBest.value} · GW{leagueBest.gw}
    </span>
  );
}

// Secondary (never the headline) hindsight line, BB/TC only.
function RegretLine({ chipKey, played, extras }) {
  if (!played || played.gain == null || !extras) return null;
  if (chipKey === 'bboost' && extras.bestBenchGw && extras.bestBench > played.gain) {
    return (
      <span className="block font-sans text-[11px] text-wrapped-muted mt-0.5">
        Your bench peaked GW{extras.bestBenchGw} (+{extras.bestBench}).
      </span>
    );
  }
  if (chipKey === '3xc' && extras.bestCaptainGw && extras.bestCaptain > played.gain) {
    return (
      <span className="block font-sans text-[11px] text-wrapped-muted mt-0.5">
        Your best captain week was GW{extras.bestCaptainGw} (+{extras.bestCaptain}).
      </span>
    );
  }
  return null;
}

// --- the board screen ---------------------------------------------------------

function BoardScreen({ result, half, onHalf, revealed, onReveal }) {
  if (!result.you) return null;
  const mine = result.you.chips[half];
  const best = result.leagueBest[half];
  const extras = result.you.extras[half];

  return (
    <div className="mt-3 flex flex-col h-full">
      <HalfToggle half={half} onHalf={onHalf} />

      <div className="mt-3 space-y-2">
        {CHIP_KEYS.map((key) => (
          <ChipCard
            key={key}
            chipKey={key}
            played={mine[key]}
            leagueBest={best[key]}
            extras={extras}
            revealed={revealed.has(key)}
            onReveal={onReveal}
          />
        ))}
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-wrapped-muted mt-2">
        Tap a chip to reveal the league&apos;s best →
      </p>

      <p className="font-sans text-lg leading-snug mt-auto pt-3 border-t border-wrapped-ink/30 [overflow-wrap:anywhere]">
        {buildVerdict(result, half)}
      </p>
    </div>
  );
}
