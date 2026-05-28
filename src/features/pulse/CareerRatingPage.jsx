// /src/pulse/components/CareerRatingPage.jsx
// Presentational closing chapter: all-time career rating. No data fetching here —
// the container hands the computed rating object in via pageData.careerRating.

import { motion } from 'framer-motion';
import PulseLayout from './PulseLayout';

// Inline SVG sparkline of within-season percentile across the manager's career.
// This is the friends'-league differentiator: engaged populations cluster top-heavy
// in the all-time bracket, so the per-season shape carries the story.
function PercentileSparkline({ trajectory }) {
  const W = 280;
  const H = 64;
  const pts = trajectory.map((t) => t.percentile);
  if (pts.length === 1) {
    const cy = H - (pts[0] / 100) * H;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs" role="img" aria-label="Career percentile">
        <circle cx={W / 2} cy={cy} r="4" className="fill-primary" />
      </svg>
    );
  }
  const stepX = W / (pts.length - 1);
  const coords = pts.map((p, i) => [i * stepX, H - (p / 100) * H]);
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs" role="img" aria-label="Per-season percentile trajectory">
      <polyline
        points={line}
        fill="none"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map(([x, y], i) => (
        <circle key={trajectory[i].season} cx={x} cy={y} r="3" className="fill-accent-purple" />
      ))}
    </svg>
  );
}

function flavourLine(trajectory) {
  if (!trajectory.length) return '';
  const best = trajectory.reduce((a, b) => (b.percentile > a.percentile ? b : a));
  return `Peaked in ${best.season}`;
}

export default function CareerRatingPage({ pageData }) {
  const { careerRating } = pageData || {};

  if (!careerRating) {
    return (
      <PulseLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-3"
        >
          <h2 className="text-3xl font-bold text-white leading-snug">Not enough history</h2>
          <p className="text-white/50 text-sm font-extrabold">Check back next season.</p>
        </motion.div>
      </PulseLayout>
    );
  }

  const { rating, bracket, estRank, trajectory } = careerRating;

  return (
    <PulseLayout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: [1.08, 1] }}
          transition={{ duration: 1 }}
          className="space-y-1"
        >
          <p className="text-white/50 text-sm font-extrabold uppercase tracking-wide">All-time rank</p>
          <h2 className="text-5xl font-black text-primary leading-none">{bracket}</h2>
          <p className="text-white/60 text-base font-medium">
            Career score <span className="text-white font-bold">{rating.toFixed(1)}</span>
            <span className="text-white/40"> · est. rank ~{estRank.toLocaleString()}</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="space-y-2"
        >
          <PercentileSparkline trajectory={trajectory} />
          <p className="text-white/50 text-sm font-semibold">{flavourLine(trajectory)}</p>
        </motion.div>
      </div>
    </PulseLayout>
  );
}
