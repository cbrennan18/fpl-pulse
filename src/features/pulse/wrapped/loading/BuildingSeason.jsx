// features/pulse/wrapped/loading/BuildingSeason.jsx
//
// Designed cold-path loader — NOT a bare spinner. Covers two states:
//   'loading'  — first fetch in flight (incl. slow cold KV reads)
//   'building' — pack served but some members' blobs still building on the cron
// Editorial treatment: paper, masthead kicker, a big Bebas line, a hairline
// "press" progress rule. The 'building' variant offers a manual retry (we do not
// auto-poll an admin/ingest endpoint — that's a future worker session).

import { useEffect, useState } from 'react';
import WrappedScreen from '../WrappedScreen';

const LINES = [
  'Setting the type…',
  'Counting every captain call…',
  'Reading the transfer market…',
  'Pressing the back pages…',
];

export default function BuildingSeason({ variant = 'loading', progress, onRetry }) {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLine((n) => (n + 1) % LINES.length), 1600);
    return () => clearInterval(t);
  }, []);

  const building = variant === 'building';

  return (
    <WrappedScreen className="flex flex-col px-6 pt-safe-bar pb-safe-10">
      <div className="border-b-2 border-wrapped-ink pb-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-wrapped-muted">
          {building ? 'Going to press' : 'Composing your edition'}
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h1 className="font-display text-6xl leading-[0.9] tracking-tight whitespace-pre-line">
          {building ? 'Still at\nthe presses.' : 'Building your\nseason…'}
        </h1>
        <p className="font-mono text-sm text-wrapped-muted mt-5">
          {building
            ? `${progress?.missing ?? 'Some'} of ${progress?.total ?? 'your league'} managers are still being set. Check back in a moment.`
            : LINES[line]}
        </p>

        {/* hairline "press" progress rule */}
        <div className="mt-6 h-px w-full bg-wrapped-ink/20 overflow-hidden">
          <div className="h-px w-1/3 bg-wrapped-green animate-pulse" />
        </div>
      </div>

      {building && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-8 self-start border-2 border-wrapped-ink px-5 py-3 font-mono text-xs uppercase tracking-[0.3em] hover:bg-wrapped-ink hover:text-wrapped-paper transition-colors"
        >
          Check again
        </button>
      )}
    </WrappedScreen>
  );
}
