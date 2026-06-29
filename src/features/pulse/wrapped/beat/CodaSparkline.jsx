// features/pulse/wrapped/beat/CodaSparkline.jsx
//
// Beat 11 (the Coda), half (a) — the per-season percentile sparkline, rebuilt in
// the warm chart-on-stock idiom (CaptainChart is the precedent). The legacy
// CareerRatingPage drew this in app-theme green/purple; here it is re-skinned to
// the Wrapped palette: bordered cream inset, hairline ink axes, a GREEN line that
// draws in (green = you), a single GOLD dot at the peak season (gold = peak only,
// ink-ringed for separation), DM Mono tabular labels, NO texture under the data.
//
// Plots trajectory[].percentile (0–100, y inverted so a higher percentile sits
// higher). Single-season careers degrade to one gold dot (mirrors the legacy).

import { motion } from 'framer-motion';

// Capitalised ref so member-expression JSX counts as a use of the import (motion-alias).
const MotionPath = motion.path;

const W = 280;
const H = 76;
const PAD = { top: 8, right: 12, bottom: 18, left: 24 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export default function CodaSparkline({ trajectory }) {
  if (!trajectory?.length) return null;

  const n = trajectory.length;
  const pct = trajectory.map((t) => t.percentile);
  const x = (i) => (n === 1 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (n - 1)) * PLOT_W);
  const y = (p) => PAD.top + PLOT_H - (Math.max(0, Math.min(100, p)) / 100) * PLOT_H;

  // Peak season = highest percentile (matches the "Peaked in [season]" line).
  let peakIndex = 0;
  pct.forEach((p, i) => { if (p > pct[peakIndex]) peakIndex = i; });

  const path = pct.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  const yTicks = [0, 50, 100];

  return (
    <div className="border border-wrapped-ink rounded-[2px] bg-wrapped-paper px-2 pt-2 pb-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Per-season percentile trajectory">
        {/* hairline gridlines + percentile labels (tabular) */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)}
              className="stroke-wrapped-ink" strokeWidth="0.5" opacity={t === 0 ? 0.4 : 0.13}
            />
            <text
              x={PAD.left - 4} y={y(t) + 3} textAnchor="end" fontSize="8"
              className="fill-wrapped-muted font-mono tabular-nums"
            >
              {t}
            </text>
          </g>
        ))}

        {/* end-season labels */}
        <text x={x(0)} y={H - 5} textAnchor="start" fontSize="8" className="fill-wrapped-muted font-mono">
          {trajectory[0].season}
        </text>
        {n > 1 && (
          <text x={x(n - 1)} y={H - 5} textAnchor="end" fontSize="8" className="fill-wrapped-muted font-mono">
            {trajectory[n - 1].season}
          </text>
        )}

        {/* the trajectory — green hero line, draws in on mount (single season: no line) */}
        {n > 1 && (
          <MotionPath
            d={path} fill="none" className="stroke-wrapped-green" strokeWidth="2.4"
            strokeLinejoin="round" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        )}

        {/* peak season — gold dot, ink-ringed */}
        <circle cx={x(peakIndex)} cy={y(pct[peakIndex])} r="4" className="fill-wrapped-gold stroke-wrapped-ink" strokeWidth="1" />
      </svg>

      <div className="flex justify-between px-1 pb-0.5 font-mono text-[8px] uppercase tracking-[0.15em] text-wrapped-muted">
        <span>Season percentile</span>
        <span className="text-wrapped-gold">● Peak</span>
      </div>
    </div>
  );
}
