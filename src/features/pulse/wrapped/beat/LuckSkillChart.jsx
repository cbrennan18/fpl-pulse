// features/pulse/wrapped/beat/LuckSkillChart.jsx
//
// Beat 9 payoff — hand-rolled SVG (no charting lib; same system as CaptainChart /
// the career-rating sparkline). Art-direction §5 "Data beats": bordered inset on
// cream, ink hairline axes, tabular figures, NO texture under the data.
//
// Two CUMULATIVE edge lines over the finished GWs, both GREEN (green = you):
//   • actual edge (your rP − field rP)     — SOLID, heavy, opaque: the hero, draws in
//   • expected edge (your xP − field xP)   — DASHED, lighter, thinner: the "process"
// The two are distinguished by WEIGHT + OPACITY, not a second hue (the colour lock
// is deliberate: one voice is you). The GAP between them is cumulative luck, shaded
// MUTED (never loss-red, either sign). Edges are SIGNED — you can trail the field —
// so the y-domain spans negatives with an emphasised ZERO baseline.

import { motion } from 'framer-motion';

const MotionPath = motion.path; // capitalised so member-expression JSX counts as a use

const W = 320;
const H = 200;
const PAD = { top: 10, right: 10, bottom: 22, left: 34 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

// Round a magnitude up to a clean tick. A finer mantissa ladder than the plain
// 1/2/5 (adds 1.5/2.5/3/4/7.5) — signed cumulative edges can reach a few hundred,
// and the coarse ladder (e.g. 232 → 500) wastes half the plot and squashes the
// thin-gap read. This keeps the data filling the frame.
function niceCeil(v) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];
  return steps.find((s) => n <= s + 1e-9) * pow;
}

export default function LuckSkillChart({ gws, expectedEdge, actualEdge }) {
  if (!gws?.length) return null;

  const n = gws.length;
  const all = [...expectedEdge, ...actualEdge, 0];
  const rawLo = Math.min(...all);
  const rawHi = Math.max(...all);
  // Signed, zero-anchored domain: round each side out to a clean tick.
  const dHi = rawHi > 0 ? niceCeil(rawHi) : 0;
  const dLo = rawLo < 0 ? -niceCeil(-rawLo) : 0;
  const span = dHi - dLo || 1;

  const x = (i) => (n === 1 ? PAD.left : PAD.left + (i / (n - 1)) * PLOT_W);
  const y = (v) => PAD.top + ((dHi - v) / span) * PLOT_H;
  const toPath = (series) => series.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  // Shaded luck gap: actual forward, expected back — a closed band between the lines.
  const gapPath =
    actualEdge.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ') +
    ' ' +
    expectedEdge
      .map((v, i) => `L${x(expectedEdge.length - 1 - i).toFixed(1)},${y(expectedEdge[expectedEdge.length - 1 - i]).toFixed(1)}`)
      .join(' ') +
    ' Z';

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((dLo + f * span) * 10) / 10);
  const xTickIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <div className="border border-wrapped-ink rounded-[2px] bg-wrapped-paper px-2 pt-2 pb-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative expected and actual edge over the league by gameweek">
        {/* gridlines + y labels (tabular, signed) */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)}
              className="stroke-wrapped-ink" strokeWidth="0.5" opacity={t === 0 ? 0.55 : 0.12}
            />
            <text
              x={PAD.left - 4} y={y(t) + 3} textAnchor="end" fontSize="9"
              className="fill-wrapped-muted font-mono tabular-nums"
            >
              {t > 0 ? `+${t}` : t}
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

        {/* luck gap — muted band between the lines (never red) */}
        <path d={gapPath} className="fill-wrapped-muted" opacity="0.16" stroke="none" />

        {/* expected edge — dashed, lighter, thinner (the process line) */}
        <path
          d={toPath(expectedEdge)} fill="none" className="stroke-wrapped-green"
          strokeWidth="1.4" strokeDasharray="4 3" strokeLinejoin="round" opacity="0.65"
        />

        {/* actual edge — solid green hero, heavy + opaque, draws in on mount */}
        <MotionPath
          d={toPath(actualEdge)} fill="none" className="stroke-wrapped-green" strokeWidth="2.6"
          strokeLinejoin="round" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>

      {/* legend — DM Mono, tracked. Weight/opacity carry the you-vs-process split. */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-wrapped-muted">
        <span className="text-wrapped-green">— Actual edge</span>
        <span className="text-wrapped-green opacity-70">-- Expected edge</span>
        <span>▨ Luck (gap)</span>
      </div>
    </div>
  );
}
