// features/pulse/wrapped/frontdoor/Cover.jsx
//
// The cover: a title card only (league name + season + CTA), no stats. Built to
// the locked art-direction look — masthead furniture, big Bebas, ruled, square.

import WrappedScreen from '../WrappedScreen';
import { SEASON_LABEL } from '../constants';
import { nameSizeClass } from '../nameType';

export default function Cover({ leagueName, onBegin }) {
  const displayName = leagueName || 'Your league';
  return (
    <WrappedScreen className="flex flex-col px-6 pt-safe-bar pb-safe-10">
      <div className="border-b-2 border-wrapped-ink pb-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-wrapped-muted">
          The Annual · No. 01
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-wrapped-muted">
          FPL Pulse presents
        </p>
        <h1 className="font-display text-[5.5rem] leading-[0.82] tracking-tight mt-3">
          Your<br />Season<br />Wrapped
        </h1>
        <div className="mt-6 border-t border-wrapped-ink/40 pt-3 flex items-baseline justify-between">
          <span className={`font-display ${nameSizeClass(displayName, ['text-3xl', 'text-2xl', 'text-xl', 'text-lg'])} leading-none tracking-tight pr-4 min-w-0 [overflow-wrap:anywhere]`}>
            {displayName}
          </span>
          <span className="font-mono text-sm tabular-nums text-wrapped-muted">{SEASON_LABEL}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onBegin}
        className="mt-8 w-full border-2 border-wrapped-ink bg-wrapped-ink text-wrapped-paper py-4 font-mono text-sm uppercase tracking-[0.3em] hover:bg-wrapped-green hover:border-wrapped-green transition-colors"
      >
        Unwrap my season →
      </button>
    </WrappedScreen>
  );
}
