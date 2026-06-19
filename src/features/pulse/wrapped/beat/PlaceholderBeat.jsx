// features/pulse/wrapped/beat/PlaceholderBeat.jsx
//
// ONE placeholder beat rendered THROUGH the reusable template, to prove it
// end-to-end (chrome + 2-screen title→payoff→verdict + tap/swipe + jump menu).
// It is parameterised by the beat config, so the single template stands in for
// all 11 slots this session. NO real beat content/charts — that's later sessions.
// It reads one trivial datum from the pack context to prove the data wiring.

import BeatShell from './BeatShell';
import { useWrapped } from '../PackContext';

export default function PlaceholderBeat({ screenIndex, ...shell }) {
  const { meta, you, getMember } = useWrapped();
  const youBlob = getMember(you);
  const youName = youBlob?.summary
    ? `${youBlob.summary.player_first_name} ${youBlob.summary.player_last_name}`
    : `#${you}`;

  return (
    <BeatShell {...shell}>
      {/* Slot: kicker (masthead furniture) */}
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
        {shell.beat.edition} — {shell.beat.theme}
      </p>

      {screenIndex === 0 ? (
        // Screen 1 — title / question slot
        <div className="mt-4">
          <h2 className="font-display text-6xl leading-[0.9] tracking-tight">
            A placeholder beat.
          </h2>
          <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
            Real beats land in later sessions. This one exists to prove the template:
            tap to reveal the payoff.
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-8">
            Tap to continue →
          </p>
        </div>
      ) : (
        // Screen 2 — payoff slot + verdict slot
        <div className="mt-4 flex flex-col h-full">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
            Managers in your league
          </p>
          {/* payoff: a hero squad-numeral */}
          <span className="font-display text-[8rem] leading-[0.8] tabular-nums text-wrapped-green mt-1">
            {meta.count}
          </span>
          {/* verdict slot */}
          <p className="font-sans text-lg leading-snug mt-auto pt-6 border-t border-wrapped-ink/30 [overflow-wrap:anywhere]">
            <span className="text-wrapped-green font-semibold">{youName}</span>, this template
            will carry every real beat — title, payoff, verdict.
          </p>
        </div>
      )}
    </BeatShell>
  );
}
