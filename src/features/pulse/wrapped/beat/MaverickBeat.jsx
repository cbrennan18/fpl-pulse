// features/pulse/wrapped/beat/MaverickBeat.jsx
//
// Beat 4 — "Maverick vs Sheep". Rendered THROUGH BeatShell (chrome untouched).
// Tables/cards + an interactive quiz — NO chart. FOUR screens, ONE idea each,
// ordered so the beat builds to its character verdict (kicker → title → idea):
//   screen 0 — orient: what "template" means, with the named league favourites as
//              the concrete illustration. No %, no table.
//   screen 1 — the quiz: "which punt paid off most?" — three NAME-ONLY cards; the
//              first tap (a card) reveals points/ownership/weeks on all three, the
//              second tap advances (guarded-onNext, NOT a timer). Falls back to a
//              straight "here's how they landed" when there aren't 3 comparable punts.
//   screen 2 — the payoff: your BEST and WORST punt, full screen, each with points
//              (best gold / worst ink — never red), league ownership and pts/GW.
//   screen 3 — the close: your conformity % hero + the named sheep→maverick ranking
//              + the verdict. The beat lands on the character read, not a bare table.
//
// "Punt" is the user-facing term throughout (no "differential" in copy).
//
// Guarded in-screen reveal (Beat 1 precedent), on the quiz screen only: a card tap
// registers the GUESS + reveals and stopPropagation's (never advances); a stray body
// tap before guessing is swallowed (can't skip); a fast double-tap after the reveal
// is swallowed; leaving the screen resets to unanswered.

import { useEffect, useMemo, useRef, useState } from 'react';
import BeatShell from './BeatShell';
import { useWrapped } from '../PackContext';
import { computeMaverick, buildVerdict, conformityPct } from '../calc/maverick';

const QUIZ_SCREEN = 1;

export default function MaverickBeat({ screenIndex, ...shell }) {
  const { entries, members, you, seasonElements, finishedGwIds, playerName } = useWrapped();

  const result = useMemo(
    () => computeMaverick({ entries, members, you, seasonElements, finishedGwIds, playerName }),
    [entries, members, you, seasonElements, finishedGwIds, playerName]
  );

  const gated = screenIndex === QUIZ_SCREEN && !!result.quiz;
  const [guess, setGuess] = useState(null); // the element id the user tapped
  const revealedAtRef = useRef(0);

  // Re-entering the quiz screen (forward OR swipe-back) always restarts unanswered.
  useEffect(() => {
    if (screenIndex !== QUIZ_SCREEN) setGuess(null);
  }, [screenIndex]);

  const handleGuess = (element) => {
    if (guess != null) return; // first guess locks; later taps are ignored
    setGuess(element);
    revealedAtRef.current = Date.now();
  };

  const handleNext = () => {
    if (gated && guess == null) return; // must guess a card first; body tap can't skip
    if (gated && Date.now() - revealedAtRef.current < 400) return; // swallow fast double-tap
    shell.onNext();
  };

  return (
    <BeatShell {...shell} onNext={handleNext}>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
        {shell.beat.edition} — {shell.beat.theme}
      </p>

      {screenIndex === 0 && <TemplateScreen result={result} />}
      {screenIndex === 1 && <QuizScreen result={result} guess={guess} onGuess={handleGuess} />}
      {screenIndex === 2 && <PuntsScreen result={result} />}
      {screenIndex === 3 && <PlacementScreen result={result} />}
    </BeatShell>
  );
}

// League-relative ownership descriptor — makes the mini-league lens show its work.
function ownLabel(d, n) {
  return d.onlyYou ? 'only you' : `owned by ${d.owners} of ${n}`;
}

// Define a punt by its comparison set, but only cite the fraction when it actually
// reads as "barely anyone" (~10+ leagues). At small N (2 of 5 = 40%) the number
// undercuts the claim, so drop it for a non-numeric phrasing.
function puntDefinition(maxOwners, count) {
  const ratio = count > 0 ? maxOwners / count : 1;
  return ratio <= 0.3
    ? `A punt = a player barely anyone in your league backed (${maxOwners} of ${count} or fewer).`
    : `A punt = a player you backed when almost no one else in your league did.`;
}

// --- Screen 0 — orient + define template --------------------------------------

function TemplateScreen({ result }) {
  const favourites = result.topTemplate.slice(0, 3).map((t) => t.name).join(', ');
  return (
    <div className="mt-4 flex flex-col h-full">
      <h2 className="font-display text-6xl leading-[0.9] tracking-tight">
        Every league has a template.
      </h2>
      <p className="font-sans text-lg text-wrapped-ink mt-6 max-w-sm">
        Template = the players most of your league piled into.
      </p>
      {favourites && (
        <p className="font-sans text-lg text-wrapped-muted mt-3 max-w-sm">
          The league lived on <span className="text-wrapped-ink">{favourites}</span>.
        </p>
      )}
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-auto pt-4">
        Tap to test yourself →
      </p>
    </div>
  );
}

// --- Screen 1 — the quiz ------------------------------------------------------

function QuizCard({ card, guessed, revealed, isAnswer, onGuess, leagueSize }) {
  // Pre-reveal: NAME ONLY (it's "which punt paid off most" from memory). On reveal:
  // points + ownership + weeks on every card; the best/answer gets green ring + gold
  // number; a wrong guess stays plain ink (loss-red is banned).
  const ring = !revealed
    ? 'border-wrapped-ink/40'
    : isAnswer
      ? 'border-wrapped-green'
      : guessed
        ? 'border-wrapped-ink' // your wrong pick — ink, not red
        : 'border-wrapped-ink/20';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // a guess must never reach BeatShell's tap-to-advance
        onGuess(card.element);
      }}
      disabled={revealed}
      className={`w-full text-left px-4 py-2.5 border ${ring} rounded-[2px]`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className={`min-w-0 truncate font-sans text-[15px] ${revealed && isAnswer ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink'}`}>
          {card.name}
        </span>
        {revealed && (
          <span className={`tabular-nums font-display text-2xl shrink-0 ${isAnswer ? 'text-wrapped-gold' : 'text-wrapped-ink'}`}>
            {card.pts}
          </span>
        )}
      </div>
      {revealed && (
        <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-wrapped-muted mt-0.5">
          {ownLabel(card, leagueSize)} · {card.weeksInSquad} wks
        </span>
      )}
    </button>
  );
}

function QuizScreen({ result, guess, onGuess }) {
  const { quiz, count, maxOwners } = result;
  if (!result.you) return null;

  const revealed = guess != null;
  const correct = quiz && guess === quiz.answerElement;

  // Fallback — fewer than 3 comparable punts: no cards, just orient + send on.
  if (!quiz) {
    return (
      <div className="mt-4 flex flex-col h-full">
        <h2 className="font-display text-5xl leading-[0.9] tracking-tight">
          Which of your punts paid off most?
        </h2>
        <p className="font-sans text-base text-wrapped-muted mt-4 max-w-sm">
          {puntDefinition(maxOwners, count)}
        </p>
        <p className="font-sans text-lg text-wrapped-ink mt-6 max-w-sm">
          You didn&apos;t stray far enough for a quiz — here&apos;s how your punts landed.
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-auto pt-4">
          Tap to see your punts →
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col h-full">
      <h2 className="font-display text-4xl leading-[0.95] tracking-tight">
        Which of your punts paid off most?
      </h2>
      <p className="font-sans text-[13px] text-wrapped-muted mt-2">
        {puntDefinition(maxOwners, count)}
      </p>

      <div className="mt-4 space-y-2">
        {quiz.cards.map((card) => (
          <QuizCard
            key={card.element}
            card={card}
            guessed={guess === card.element}
            revealed={revealed}
            isAnswer={card.element === quiz.answerElement}
            onGuess={onGuess}
            leagueSize={count}
          />
        ))}
      </div>

      <p className="font-mono text-[11px] uppercase tracking-[0.2em] mt-auto pt-4 h-5">
        {revealed ? (
          correct ? (
            <span className="text-wrapped-green">Called it. Tap on →</span>
          ) : (
            <span className="text-wrapped-muted">
              You picked {nameOfGuess(quiz, guess)} — it was {nameOfGuess(quiz, quiz.answerElement)}. Even you forgot. Tap on →
            </span>
          )
        ) : (
          <span className="text-wrapped-muted">Tap your guess →</span>
        )}
      </p>
    </div>
  );
}

// --- Screen 2 — best & worst punt (the payoff) --------------------------------

function PuntBlock({ label, diff, tone, leagueSize }) {
  const ptsClass = tone === 'best' ? 'text-wrapped-gold' : 'text-wrapped-ink';
  return (
    <div className="py-3 border-b border-wrapped-ink/20">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-wrapped-muted">{label} punt</p>
      <div className="flex items-baseline justify-between gap-3 mt-1">
        <span className="min-w-0 truncate font-display text-3xl text-wrapped-ink">{diff.name}</span>
        <span className={`tabular-nums font-display text-5xl shrink-0 ${ptsClass}`}>{diff.pts}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3 mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-wrapped-muted">
        <span className="truncate">{ownLabel(diff, leagueSize)} · {diff.weeksInSquad} wks held</span>
        <span className="tabular-nums shrink-0">{diff.ppg.toFixed(1)} pts/gw</span>
      </div>
    </div>
  );
}

function PuntsScreen({ result }) {
  const { best, worst, count } = result;
  if (!result.you) return null;

  if (!best && !worst) {
    return (
      <div className="mt-4 flex flex-col h-full">
        <h2 className="font-display text-5xl leading-[0.9] tracking-tight">
          Where you broke from the pack.
        </h2>
        <p className="font-sans text-lg text-wrapped-muted mt-6 max-w-sm">
          You stuck close to the league&apos;s favourites — no real punts to show.
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-auto pt-4">
          Tap for where you sit →
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col h-full">
      <h2 className="font-display text-4xl leading-[0.95] tracking-tight">
        Where you broke from the pack.
      </h2>
      <div className="mt-5">
        {best && <PuntBlock label="Best" diff={best} tone="best" leagueSize={count} />}
        {worst && <PuntBlock label="Worst" diff={worst} tone="worst" leagueSize={count} />}
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-auto pt-4">
        Tap for where you sit →
      </p>
    </div>
  );
}

// --- Screen 3 — where you sit (the close) -------------------------------------

function RankRow({ rank, name, conformity, isYou }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5 border-b border-wrapped-ink/15">
      <span className="w-5 text-right tabular-nums font-mono text-sm text-wrapped-muted">{rank}</span>
      <span className={`flex-1 truncate font-sans text-[15px] ${isYou ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink'}`}>
        {name}
      </span>
      {/* one decimal so equal-looking rows (32.4 vs 31.9) justify their order */}
      <span className={`w-16 text-right tabular-nums font-sans text-[15px] ${isYou ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink'}`}>
        {(conformity * 100).toFixed(1)}%
      </span>
    </div>
  );
}

function PlacementScreen({ result }) {
  const { you, ranking } = result;
  if (!you) return null;

  const verdict = buildVerdict(result);

  return (
    <div className="mt-3 flex flex-col h-full">
      {/* hero conformity % */}
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[6rem] leading-[0.8] tabular-nums text-wrapped-green">
          {conformityPct(you.conformity)}
        </span>
        <span className="font-display text-3xl text-wrapped-green">%</span>
      </div>
      <p className="font-sans text-sm text-wrapped-muted -mt-1">
        Your <span className="text-wrapped-ink">template %</span> = how much of your season you
        spent on the league&apos;s favourites.
      </p>

      {/* named sheep → maverick ranking */}
      <div className="mt-4 flex flex-col min-h-0 flex-1">
        <div className="flex items-baseline gap-3 pb-1 border-b border-wrapped-ink font-mono text-[10px] uppercase tracking-[0.2em] text-wrapped-muted">
          <span className="w-5 text-right">#</span>
          <span className="flex-1">Sheep → maverick</span>
          <span className="w-16 text-right">Template</span>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {ranking.map((r) => (
            <RankRow key={r.entryId} rank={r.rank} name={r.isYou ? 'You' : r.name} conformity={r.conformity} isYou={r.isYou} />
          ))}
        </div>
      </div>

      {/* the close — character verdict */}
      <p className="font-sans text-lg leading-snug mt-auto pt-3 border-t border-wrapped-ink/30 [overflow-wrap:anywhere]">
        <span className="block">{verdict.label}</span>
        <span className="block text-wrapped-muted text-base mt-1">{verdict.line}</span>
      </p>
    </div>
  );
}

function nameOfGuess(quiz, element) {
  return quiz.cards.find((c) => c.element === element)?.name ?? '—';
}
