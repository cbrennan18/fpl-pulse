// features/pulse/wrapped/beat/CaptainChart.jsx
//
// Beat 2 payoff — the first data-viz in the Wrapped flow. Hand-rolled SVG (no
// charting lib: their default aesthetics fight the warm art direction; the
// career-rating sparkline is the in-app precedent). Art-direction §5 "Data
// beats": clean bordered inset on cream, ink + green lines, hairline axes,
// tabular figures, NO texture under the chart.
//
// Three cumulative lines over the finished GWs:
//   • your actual captain points — solid GREEN, the hero (green = you only)
//   • you, best-of-C/VC          — dashed green, the achievable "ghost you"
//   • the league winner          — solid ink, the external benchmark
// A single GOLD dot marks your biggest captain GW (gold = peak only), ringed in
// ink so it stays unambiguous against the green line at mobile width.

import { motion } from 'framer-motion';

// Capitalised refs so member-expression JSX counts as a use of the import.
const MotionPath = motion.path;

const W = 320;
const H = 196;
const PAD = { top: 10, right: 10, bottom: 22, left: 30 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function niceCeil(v) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * pow;
}

export default function CaptainChart({ gws, youActual, youCvc, winnerActual, peakIndex }) {
  if (!gws?.length) return null;

  const n = gws.length;
  const maxVal = Math.max(1, ...youActual, ...youCvc, ...winnerActual);
  const niceMax = niceCeil(maxVal);

  const x = (i) => (n === 1 ? PAD.left : PAD.left + (i / (n - 1)) * PLOT_W);
  const y = (v) => PAD.top + PLOT_H - (v / niceMax) * PLOT_H;
  const toPath = (series) => series.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));
  const xTickIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <div className="border border-wrapped-ink rounded-[2px] bg-wrapped-paper px-2 pt-2 pb-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative captain points by gameweek">
        {/* horizontal gridlines + y labels (tabular) */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)}
              className="stroke-wrapped-ink" strokeWidth="0.5" opacity={t === 0 ? 0.5 : 0.15}
            />
            <text
              x={PAD.left - 4} y={y(t) + 3} textAnchor="end" fontSize="9"
              className="fill-wrapped-muted font-mono tabular-nums"
            >
              {t}
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

        {/* winner — solid ink benchmark */}
        <path d={toPath(winnerActual)} fill="none" className="stroke-wrapped-ink" strokeWidth="1.4" strokeLinejoin="round" opacity="0.75" />

        {/* you, best-of-C/VC — dashed green ghost (the achievable what-if) */}
        <path d={toPath(youCvc)} fill="none" className="stroke-wrapped-green" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" opacity="0.85" />

        {/* you, actual — solid green hero, draws in on mount */}
        <MotionPath
          d={toPath(youActual)} fill="none" className="stroke-wrapped-green" strokeWidth="2.6"
          strokeLinejoin="round" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }}
        />

        {/* peak captain GW — gold dot, ink-ringed for separation from the green line */}
        <circle cx={x(peakIndex)} cy={y(youActual[peakIndex])} r="4" className="fill-wrapped-gold stroke-wrapped-ink" strokeWidth="1" />
      </svg>

      {/* legend — DM Mono, tracked */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-wrapped-muted">
        <span className="text-wrapped-green">— You</span>
        <span className="text-wrapped-green">-- Best of C/VC</span>
        <span>— Winner</span>
        <span className="text-wrapped-gold">● Your peak</span>
      </div>
    </div>
  );
}
