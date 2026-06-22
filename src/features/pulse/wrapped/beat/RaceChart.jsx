// features/pulse/wrapped/beat/RaceChart.jsx
//
// Beat 10 payoff — the HERO of the climax. Reuses the beat-2 chart-on-stock SVG
// system (CaptainChart) — NOT a new chart type: hand-rolled SVG, bordered inset on
// cream, hairline axes, tabular figures, NO texture under the chart. The one change
// is the y-axis: it plots in-league RANK, INVERTED (1st at the top).
//
// Three lines only (the restraint IS the design — never the full table):
//   • you            — solid GREEN, thick, the hero (draws in on mount)
//   • your nemesis   — solid INK, the rival that matters — NAME WITHHELD here; it
//                      resolves out of the chart on the next screen
//   • winner/context — MUTED, thin, the backdrop
// A single GOLD ink-ringed dot marks your peak (highest rank reached).
//
// COLOUR NOTE (deliberate per-beat exception — do NOT "fix" back to the doc):
// art-direction §5 lists winner=ink / nemesis=muted. We invert it here on purpose:
// THIS beat's narrative subject is the nemesis, so the rival earns the stronger ink
// and the winner recedes to muted context. Spot-red for the nemesis is declined
// (loss-red is banned across Wrapped). Approved as a per-beat call (Session 10).

import { motion } from 'framer-motion';

// Capitalised ref so member-expression JSX counts as a use of the import.
const MotionPath = motion.path;

const W = 320;
const H = 200;
const PAD = { top: 12, right: 12, bottom: 22, left: 34 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

// Path builder that lifts the pen over absent GWs (a joiner's gap), so a missing
// week never draws a false connecting segment.
function toPath(series, x, y) {
  let d = '';
  let pen = false;
  series.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    pen = true;
  });
  return d.trim();
}

export default function RaceChart({ gws, you, nemesis, context, count, contextLabel }) {
  if (!gws?.length || !you?.series) return null;

  const n = gws.length;
  const N = Math.max(2, count); // rank domain 1..N (avoid div-by-zero)

  const x = (i) => (n === 1 ? PAD.left : PAD.left + (i / (n - 1)) * PLOT_W);
  // INVERTED: rank 1 sits at the top of the plot, rank N at the bottom.
  const y = (rank) => PAD.top + ((rank - 1) / (N - 1)) * PLOT_H;

  const rankTicks = N <= 3 ? [1, N] : [1, Math.ceil(N / 2), N];
  const xTickIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <div className="border border-wrapped-ink rounded-[2px] bg-wrapped-paper px-2 pt-2 pb-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="League rank by gameweek">
        {/* horizontal gridlines + rank labels (1st at top) */}
        {rankTicks.map((rk) => (
          <g key={rk}>
            <line
              x1={PAD.left} x2={W - PAD.right} y1={y(rk)} y2={y(rk)}
              className="stroke-wrapped-ink" strokeWidth="0.5" opacity={rk === 1 ? 0.5 : 0.15}
            />
            <text
              x={PAD.left - 4} y={y(rk) + 3} textAnchor="end" fontSize="9"
              className="fill-wrapped-muted font-mono tabular-nums"
            >
              {rk === 1 ? '1st' : `${rk}th`}
            </text>
          </g>
        ))}

        {/* x ticks (gameweek labels) */}
        {xTickIdx.map((i) => (
          <text
            key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9"
            className="fill-wrapped-muted font-mono tabular-nums"
          >
            GW{gws[i]}
          </text>
        ))}

        {/* winner / context — muted thin backdrop */}
        {context?.series && (
          <path d={toPath(context.series, x, y)} fill="none" className="stroke-wrapped-muted" strokeWidth="1.3" strokeLinejoin="round" opacity="0.7" />
        )}

        {/* nemesis — solid ink, the rival (name withheld until the next screen) */}
        {nemesis?.series && (
          <path d={toPath(nemesis.series, x, y)} fill="none" className="stroke-wrapped-ink" strokeWidth="1.8" strokeLinejoin="round" opacity="0.9" />
        )}

        {/* you — solid green hero, draws in on mount, on top of everything */}
        <MotionPath
          d={toPath(you.series, x, y)} fill="none" className="stroke-wrapped-green" strokeWidth="2.8"
          strokeLinejoin="round" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }}
        />

        {/* your peak rank — gold dot, ink-ringed for separation from the green line */}
        {you.series[you.yourPeakIndex] != null && (
          <circle
            cx={x(you.yourPeakIndex)} cy={y(you.series[you.yourPeakIndex])} r="4"
            className="fill-wrapped-gold stroke-wrapped-ink" strokeWidth="1"
          />
        )}
      </svg>

      {/* legend — DM Mono, tracked. The rival stays UN-NAMED (resolves next screen). */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-wrapped-muted">
        <span className="text-wrapped-green">— You</span>
        <span className="text-wrapped-ink">— Your rival</span>
        {context && <span>— {contextLabel}</span>}
        <span className="text-wrapped-gold">● Your peak</span>
      </div>
    </div>
  );
}
