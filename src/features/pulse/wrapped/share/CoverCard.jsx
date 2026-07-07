// features/pulse/wrapped/share/CoverCard.jsx
//
// The first share-card filling: the cover. Deliberately trivial — just the
// masthead hero + league name + season (mirrors the on-screen Cover). This card
// is the plumbing test: if a real 1080×1080 PNG comes out of THIS, the pipe
// works and later beats are content, not plumbing. INLINE STYLES ONLY.

import CardShell from './CardShell';
import { CARD, FONT } from './cardTokens';

export default function CoverCard({ leagueName }) {
  return (
    <CardShell kicker="The Annual · No. 01" leagueName={leagueName}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: 24,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            color: CARD.muted,
          }}
        >
          FPL Pulse presents
        </span>
        <h1
          style={{
            fontFamily: FONT.display,
            fontSize: 260,
            lineHeight: 0.82,
            letterSpacing: '-0.01em',
            margin: '24px 0 0',
            color: CARD.ink,
          }}
        >
          Your
          <br />
          Season
          <br />
          Wrapped
        </h1>
      </div>
    </CardShell>
  );
}
