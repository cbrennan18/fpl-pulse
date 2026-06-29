// features/pulse/wrapped/beat/LegacyPositionChart.jsx
//
// Beat 11 (the Coda), half (b) — your what-if league finish over time, as "DOTS ON
// GROWING TRACKS". Hand-rolled SVG in the chart-on-stock idiom (RaceChart/CaptainChart
// precedent): bordered cream inset, load-bearing hairline axes, NO texture under data.
//
// y-axis = ABSOLUTE RANK (1 at top → the deepest field across your seasons). Per season
// a faint muted-ink hairline TRACK runs from rank 1 down to that season's last place
// (= field size that season) — so tracks lengthen left→right as the league grew. The
// track IS the field-size channel; there is no percentile in the chart (percentile is
// the calc's internal sort key only). Your finish each season is a dot at its true rank
// depth (2nd-of-N sits on row 2).
//
// Markers (calc supplies the flags; the chart never recomputes):
//   • your finish — GREEN dot.
//   • best        — the single GOLD ink-ringed dot (calc's `best`). Gold fill wins.
//   • 2025/26     — the REAL anchor (`real`): an extra ink ring + a "this year" tick
//                   under its label. If 2025/26 is also best → gold fill + the real ring.
// Colour lock: green = you, gold = best only, muted ink = tracks/axes; NO red, no new
// colour. YOU only. 360px: thin tracks, sparse year labels (first / mid / last + this-year).

import { motion } from 'framer-motion';

// Capitalised refs so member-expression JSX counts as uses of the import (motion-alias).
const MotionPath = motion.path;
const MotionCircle = motion.circle;

const W = 320;
const H = 200;
const PAD = { top: 12, right: 14, bottom: 30, left: 30 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export default function LegacyPositionChart({ series }) {
  if (!series?.length) return null;

  const n = series.length;
  const maxField = Math.max(2, ...series.map((s) => s.field)); // spans past + anchor
  const x = (i) => (n === 1 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (n - 1)) * PLOT_W);
  const y = (r) => PAD.top + ((r - 1) / Math.max(1, maxField - 1)) * PLOT_H; // 1 at top

  // Sparse x labels: first / mid / last, plus the real (this-year) column always.
  const labelIdx = new Set([0, Math.floor((n - 1) / 2), n - 1]);
  series.forEach((s, i) => { if (s.real) labelIdx.add(i); });

  const yTicks = maxField >= 4 ? [1, Math.round((1 + maxField) / 2), maxField] : [1, maxField];

  return (
    <div className="border border-wrapped-ink rounded-[2px] bg-wrapped-paper px-2 pt-2 pb-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Your league finish by season (rank, 1 at top)">
        {/* y rank ticks + faint rule */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-wrapped-ink" strokeWidth="0.5" opacity="0.12" />
            <text x={PAD.left - 5} y={y(t) + 3} textAnchor="end" fontSize="9" className="fill-wrapped-muted font-mono tabular-nums">{t}</text>
          </g>
        ))}

        {/* per-season tracks — hairline from rank 1 down to that season's field depth */}
        {series.map((s, i) => (
          <MotionPath
            key={`track-${i}`}
            d={`M${x(i).toFixed(1)},${y(1).toFixed(1)} L${x(i).toFixed(1)},${y(s.field).toFixed(1)}`}
            fill="none" className="stroke-wrapped-muted" strokeWidth="1" opacity="0.5"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
          />
        ))}

        {/* your finish dot per season (gold if best; ink ring if the real anchor) */}
        {series.map((s, i) => {
          const cx = x(i);
          const cy = y(s.position);
          return (
            <g key={`dot-${i}`}>
              {s.real && <circle cx={cx} cy={cy} r="6.5" className="fill-none stroke-wrapped-ink" strokeWidth="1.2" />}
              <MotionCircle
                cx={cx} cy={cy} r="4"
                className={`${s.best ? 'fill-wrapped-gold' : 'fill-wrapped-green'} stroke-wrapped-ink`}
                strokeWidth={s.best ? 1.2 : 0.8}
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.06 }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
            </g>
          );
        })}

        {/* sparse season labels + a "this year" tick under the real column */}
        {series.map((s, i) => (labelIdx.has(i) ? (
          <text key={`xl-${i}`} x={x(i)} y={H - 12} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="8" className="fill-wrapped-muted font-mono">
            {s.season}
          </text>
        ) : null))}
        {series.map((s, i) => (s.real ? (
          <text key={`ty-${i}`} x={x(i)} y={H - 3} textAnchor={i === n - 1 ? 'end' : 'middle'} fontSize="7" className="fill-wrapped-ink font-mono uppercase tracking-[0.1em]">
            this year
          </text>
        ) : null))}
      </svg>

      <div className="flex justify-between px-1 pb-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-wrapped-muted">
        <span className="text-wrapped-green">● Your finish</span>
        <span className="text-wrapped-gold">● Best</span>
        <span>○ This year</span>
      </div>
    </div>
  );
}
