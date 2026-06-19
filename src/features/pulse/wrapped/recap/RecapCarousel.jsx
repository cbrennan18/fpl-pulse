// features/pulse/wrapped/recap/RecapCarousel.jsx
//
// Endpoint of the flow — proves the state machine reaches the recap. This is a
// STRUCTURAL STUB only: the real "select a card to share" carousel and the
// html-to-image rasteriser (reused from features/league/awards-share/) are a
// later session. No card rendering / sharing here yet.

import WrappedScreen from '../WrappedScreen';
import { BEATS } from '../constants';

export default function RecapCarousel({ onReplay, onClose }) {
  return (
    <WrappedScreen className="flex flex-col px-6 pt-safe-bar pb-safe-10">
      <header className="border-b-2 border-wrapped-ink pb-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
          Back page · Select a card
        </p>
        <h1 className="font-display text-5xl leading-[0.9] tracking-tight mt-2">The recap</h1>
      </header>

      <div className="flex-1 flex flex-col justify-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
          0 / {BEATS.length} cards
        </p>
        <div className="mt-3 aspect-square w-full max-w-xs border-2 border-wrapped-ink/40 flex items-center justify-center">
          <p className="font-mono text-xs text-wrapped-muted text-center px-6">
            share cards land in a later session
          </p>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="border-2 border-wrapped-ink px-5 py-3 font-mono text-xs uppercase tracking-[0.3em] hover:bg-wrapped-ink hover:text-wrapped-paper transition-colors"
        >
          ↺ Replay
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-3 font-mono text-xs uppercase tracking-[0.3em] text-wrapped-muted underline underline-offset-4"
        >
          Close
        </button>
      </div>
    </WrappedScreen>
  );
}
