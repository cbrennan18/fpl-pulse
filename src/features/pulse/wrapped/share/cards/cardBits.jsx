// features/pulse/wrapped/share/cards/cardBits.jsx
//
// Shared inline-styled building blocks for the beat share cards (hero numeral,
// verdict line, mini top-N table). Inline styles only — rasterised off-screen.

import { CARD, FONT } from '../cardTokens';

export function Label({ children, color = CARD.muted }) {
  return (
    <div
      style={{
        fontFamily: FONT.mono,
        fontSize: 24,
        textTransform: 'uppercase',
        letterSpacing: '0.28em',
        color,
      }}
    >
      {children}
    </div>
  );
}

// Big Bebas hero numeral/phrase + optional supporting caption.
export function Hero({ value, sub, color = CARD.ink, size = 220 }) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT.display,
          fontSize: size,
          lineHeight: 0.86,
          letterSpacing: '-0.01em',
          color,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </div>
      {sub ? (
        <div style={{ fontFamily: FONT.body, fontSize: 34, color: CARD.muted, marginTop: 8 }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

// The dry verdict line — the payoff copy each beat already writes.
export function Verdict({ children }) {
  if (!children) return null;
  return (
    <div style={{ fontFamily: FONT.body, fontSize: 36, lineHeight: 1.28, color: CARD.ink }}>
      {children}
    </div>
  );
}

// Rank · name · value rows. YOU is marked green (the ownable behaviour). `rows`:
// [{ rank, name, value, isYou }].
export function MiniTable({ rows }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, i) => (
        <div
          key={r.rank ?? i}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 20,
            paddingBottom: 8,
            borderBottom: `1px solid ${CARD.ink}22`,
          }}
        >
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 30,
              width: 52,
              flexShrink: 0,
              color: r.isYou ? CARD.green : CARD.muted,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {r.rank}
          </span>
          <span
            style={{
              fontFamily: FONT.body,
              fontSize: 38,
              fontWeight: r.isYou ? 700 : 500,
              color: r.isYou ? CARD.green : CARD.ink,
              flex: 1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {r.name}
          </span>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 36,
              color: r.isYou ? CARD.green : CARD.ink,
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// A left/right split row for the corridor strip or small stat stacks.
export function StatRow({ left, right, strong }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 20,
        paddingBottom: 8,
        borderBottom: `1px solid ${CARD.ink}22`,
      }}
    >
      <span style={{ fontFamily: FONT.body, fontSize: 34, color: strong ? CARD.green : CARD.ink, fontWeight: strong ? 700 : 500 }}>
        {left}
      </span>
      <span style={{ fontFamily: FONT.mono, fontSize: 34, color: strong ? CARD.green : CARD.ink, fontVariantNumeric: 'tabular-nums' }}>
        {right}
      </span>
    </div>
  );
}
