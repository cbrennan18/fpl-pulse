// features/pulse/wrapped/beat/FingerprintBars.jsx
//
// Beat 5 payoff — % of points by position, you vs league avg vs winner. Hand-rolled
// SVG, inherits the beat-2/3 chart-on-stock system (art-direction §5: bordered inset
// on cream, hairline baseline, tabular DM Mono labels, NO texture under data).
//
// HORIZONTAL grouped bars (four position ROWS, three bars each) rather than 12
// cramped vertical columns — this keeps it legible at 360px. Within each group the
// hero pairing is adjacent so the eye compares them directly:
//   • You    — GREEN, top, heaviest (green = you only)
//   • Winner — INK, directly beneath (the sharp comparison, per spec)
//   • Avg    — MUTED, thin, recedes
// No loss-red anywhere; gold (peak only) is deliberately omitted — a share
// distribution has no single natural peak, so the semantic stays reserved.

import { motion } from 'framer-motion';

const MotionRect = motion.rect;

const W = 320;
const LEFT = 40; // position label gutter
const RIGHT = 36; // % label gutter
const TOP = 6;
const PLOT_W = W - LEFT - RIGHT;

// per-group bar geometry (you slightly taller = the hero)
const BAR = { you: 9, winner: 7, avg: 6 };
const INTRA = 3; // gap between the 3 bars in a group
const GROUP_GAP = 13;
const GROUP_H = BAR.you + BAR.winner + BAR.avg + INTRA * 2;
const H = TOP * 2 + GROUP_H * 4 + GROUP_GAP * 3;

const pctLabel = (s) => `${Math.round(s * 100)}%`;

export default function FingerprintBars({ positions, winnerName }) {
  if (!positions?.length) return null;

  const maxShare = Math.max(
    0.0001,
    ...positions.flatMap((p) => [p.you, p.winner, p.avg])
  );
  const len = (s) => (s / maxShare) * PLOT_W;

  return (
    <div className="border border-wrapped-ink rounded-[2px] bg-wrapped-paper px-2 pt-2 pb-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Share of points by position: you versus league average versus winner">
        {/* baseline rule at x=0 (load-bearing hairline) */}
        <line x1={LEFT} x2={LEFT} y1={TOP} y2={H - TOP} className="stroke-wrapped-ink" strokeWidth="0.75" opacity="0.5" />

        {positions.map((p, gi) => {
          const groupTop = TOP + gi * (GROUP_H + GROUP_GAP);
          const yYou = groupTop;
          const yWin = groupTop + BAR.you + INTRA;
          const yAvg = yWin + BAR.winner + INTRA;
          const rows = [
            { key: 'you', y: yYou, h: BAR.you, share: p.you, cls: 'fill-wrapped-green', txt: 'fill-wrapped-green' },
            { key: 'win', y: yWin, h: BAR.winner, share: p.winner, cls: 'fill-wrapped-ink', txt: 'fill-wrapped-ink' },
            { key: 'avg', y: yAvg, h: BAR.avg, share: p.avg, cls: 'fill-wrapped-muted', txt: 'fill-wrapped-muted' },
          ];
          return (
            <g key={p.key}>
              {/* position label, centred on the group */}
              <text
                x={LEFT - 6} y={groupTop + GROUP_H / 2 + 3} textAnchor="end" fontSize="11"
                className="fill-wrapped-ink font-mono uppercase tracking-[0.1em]"
              >
                {p.label}
              </text>
              {rows.map((r) => (
                <g key={r.key}>
                  <MotionRect
                    x={LEFT} y={r.y} height={r.h} rx="1"
                    className={r.cls}
                    initial={{ width: 0 }}
                    animate={{ width: Math.max(1, len(r.share)) }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: gi * 0.05 }}
                  />
                  <text
                    x={LEFT + len(r.share) + 4} y={r.y + r.h - 1} fontSize="8"
                    className={`${r.txt} font-mono tabular-nums`}
                  >
                    {pctLabel(r.share)}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>

      {/* legend — DM Mono, tracked */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-wrapped-muted">
        <span className="text-wrapped-green">▮ You</span>
        <span className="text-wrapped-ink">▮ {winnerName || 'Winner'} · winner</span>
        <span>▮ League avg</span>
      </div>
    </div>
  );
}
