// features/pulse/wrapped/loading/NotAvailable.jsx
//
// Designed terminal state for leagues we can't open in v1:
//   'not-available' — not ingested (404). The curated list normally prevents
//                     reaching this, but a stale/shared link can.
//   'too-large'     — > friends-only cap (403).
//   'error'         — bootstrap/elements/network failure.
// No browser-side ingestion trigger (admin route is auth-gated). Offers a route
// back to the general entry ("make your own").

import WrappedScreen from '../WrappedScreen';

const COPY = {
  'not-available': {
    kicker: 'Out of print',
    title: 'This edition\nisn’t ready.',
    body: 'This league hasn’t been picked up yet. Only curated friends’ leagues are available for now.',
  },
  'too-large': {
    kicker: 'Too big to print',
    title: 'A friends-only\nannual.',
    body: 'Wrapped is built for small mini-leagues. This one’s over the limit.',
  },
  error: {
    kicker: 'Press jam',
    title: 'Something’s\nstuck.',
    body: 'We couldn’t pull this season together. Try again shortly.',
  },
};

export default function NotAvailable({ variant = 'not-available', onMakeYourOwn, onRetry }) {
  const copy = COPY[variant] || COPY['not-available'];
  return (
    <WrappedScreen className="flex flex-col px-6 pt-safe-bar pb-safe-10">
      <div className="border-b-2 border-wrapped-ink pb-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-wrapped-muted">
          {copy.kicker}
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h1 className="font-display text-6xl leading-[0.9] tracking-tight whitespace-pre-line">
          {copy.title}
        </h1>
        <p className="font-mono text-sm text-wrapped-muted mt-5 max-w-md">{copy.body}</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {variant === 'error' && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="border-2 border-wrapped-ink px-5 py-3 font-mono text-xs uppercase tracking-[0.3em] hover:bg-wrapped-ink hover:text-wrapped-paper transition-colors"
          >
            Try again
          </button>
        )}
        {onMakeYourOwn && (
          <button
            type="button"
            onClick={onMakeYourOwn}
            className="border-2 border-wrapped-green text-wrapped-green px-5 py-3 font-mono text-xs uppercase tracking-[0.3em] hover:bg-wrapped-green hover:text-wrapped-paper transition-colors"
          >
            Make your own →
          </button>
        )}
      </div>
    </WrappedScreen>
  );
}
