// features/pulse/wrapped/share/CardShell.jsx
//
// The shared 1080×1080 frame every Wrapped share card sits inside. Pure
// presentational, INLINE STYLES ONLY (html-to-image's <foreignObject> doesn't
// run Tailwind — a class here renders blank in the PNG). Cream painted
// edge-to-edge (square 2px corners) so the rasteriser's dark backgroundColor
// never bleeds through.
//
// Every card carries the LEAGUE-NAME + "FPL Pulse · 2025/26" stamp in the
// footer — that's the viral name-check (a recipient must recognise their
// league). `rivalCheck` is an optional footer slot for per-beat rival names
// (unused by the Cover, exposed for later beats).

import { SEASON_LABEL } from '../constants';
import { nameSizeClass } from '../nameType';
import { CARD, FONT } from './cardTokens';

const PAD = 72;

export default function CardShell({ kicker, leagueName, rivalCheck, children }) {
  const displayName = leagueName || 'Your league';
  // Reuse the shared long-name step-down, but with a PIXEL ladder (inline styles
  // can't take Tailwind size classes).
  const nameSize = nameSizeClass(displayName, [40, 34, 28, 24]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        background: CARD.paper,
        color: CARD.ink,
        fontFamily: FONT.body,
        padding: PAD,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Masthead: tracked mono kicker over a heavy rule */}
      <div style={{ borderBottom: `2px solid ${CARD.ink}`, paddingBottom: 14 }}>
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: 20,
            textTransform: 'uppercase',
            letterSpacing: '0.4em',
            color: CARD.muted,
          }}
        >
          {kicker || 'FPL Pulse'}
        </span>
      </div>

      {/* Filling */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>

      {/* Footer stamp: league name-check + edition. Always present. */}
      <div style={{ borderTop: `2px solid ${CARD.ink}`, paddingTop: 18 }}>
        {rivalCheck ? <div style={{ marginBottom: 14 }}>{rivalCheck}</div> : null}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          <span
            style={{
              fontFamily: FONT.display,
              fontSize: nameSize,
              lineHeight: 1,
              letterSpacing: '0.01em',
              color: CARD.ink,
              minWidth: 0,
              overflowWrap: 'anywhere',
            }}
          >
            {displayName}
          </span>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 22,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: CARD.muted,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            FPL Pulse · {SEASON_LABEL}
          </span>
        </div>
      </div>
    </div>
  );
}
