// features/pulse/wrapped/share/cards/chartBits.jsx
//
// Minimal inline-SVG chart primitives for the share cards, RE-AUTHORED small for
// the 1080 square (NOT the live Tailwind/animated beat chart components). Inline
// styles / SVG attributes only — the rasteriser's <foreignObject> skips Tailwind.

import { CARD, FONT } from '../cardTokens';

// Generic multi-line sparkline. `lines`: [{ values:(number|null)[], color, dashed }].
// Shared x-index across lines; y scaled to the combined finite range. `invertY`
// puts low values at the top (rank charts: 1st on top). Nulls break the path.
export function LineChart({ lines, width = 900, height = 260, invertY = false, strokeWidth = 5 }) {
  const all = lines.flatMap((l) => l.values.filter((v) => Number.isFinite(v)));
  if (all.length === 0) return <svg width={width} height={height} />;
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) { min -= 1; max += 1; }
  const n = Math.max(...lines.map((l) => l.values.length));
  const x = (i) => (n <= 1 ? 0 : (i / (n - 1)) * width);
  const y = (v) => {
    const t = (v - min) / (max - min);
    return (invertY ? t : 1 - t) * (height - strokeWidth) + strokeWidth / 2;
  };
  const pathFor = (values) => {
    let d = '';
    let pen = false;
    values.forEach((v, i) => {
      if (!Number.isFinite(v)) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {lines.map((l, i) => (
        <path
          key={i}
          d={pathFor(l.values)}
          fill="none"
          stroke={l.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={l.dashed ? '10 12' : undefined}
        />
      ))}
    </svg>
  );
}

// Grouped bars — one group per label, `bars` per group [{ value, color }]. Values
// are shares/percentages; scaled to the max across all bars.
export function Bars({ groups, width = 900, height = 300, gap = 40 }) {
  const all = groups.flatMap((g) => g.bars.map((b) => b.value));
  const max = Math.max(1, ...all);
  const gw = (width - gap * (groups.length - 1)) / groups.length;
  const labelH = 44;
  const chartH = height - labelH;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {groups.map((g, gi) => {
        const gx = gi * (gw + gap);
        const bw = gw / g.bars.length;
        return (
          <g key={gi}>
            {g.bars.map((b, bi) => {
              const bh = (b.value / max) * chartH;
              return (
                <rect
                  key={bi}
                  x={gx + bi * bw}
                  y={chartH - bh}
                  width={bw - 6}
                  height={bh}
                  fill={b.color}
                />
              );
            })}
            <text
              x={gx + gw / 2}
              y={height - 10}
              textAnchor="middle"
              fontFamily={FONT.mono}
              fontSize={26}
              fill={CARD.muted}
            >
              {g.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// 38-column "heat strip": each finished GW a column whose height ∝ recoverable
// points. Nailed weeks (0 recoverable) render as a faint baseline tick.
export function HeatStrip({ cells, maxCell, width = 900, height = 200 }) {
  const max = Math.max(1, maxCell);
  const n = cells.length || 1;
  const cw = width / n;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {cells.map((c, i) => {
        const h = c.recoverable > 0 ? Math.max(4, (c.recoverable / max) * height) : 3;
        return (
          <rect
            key={i}
            x={i * cw}
            y={height - h}
            width={Math.max(1, cw - 3)}
            height={h}
            fill={c.recoverable > 0 ? CARD.ink : CARD.muted}
            opacity={c.recoverable > 0 ? 0.35 + 0.65 * (c.recoverable / max) : 0.25}
          />
        );
      })}
    </svg>
  );
}

// Dots-on-tracks: one dot per season at y = position/field (inverted so 1st is
// top). `best` renders gold; `real` gets an ink ring. Season labels beneath.
export function DotTracks({ series, width = 900, height = 300 }) {
  if (!series?.length) return <svg width={width} height={height} />;
  const labelH = 44;
  const chartH = height - labelH;
  const n = series.length;
  const x = (i) => (n <= 1 ? width / 2 : 24 + (i / (n - 1)) * (width - 48));
  const y = (rec) => {
    const t = rec.field > 1 ? (rec.position - 1) / (rec.field - 1) : 0; // 0 = 1st
    return 20 + t * (chartH - 40);
  };
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <line x1={24} y1={chartH} x2={width - 24} y2={chartH} stroke={CARD.ink} strokeWidth={2} opacity={0.25} />
      {series.map((rec, i) => (
        <g key={rec.season}>
          <circle
            cx={x(i)}
            cy={y(rec)}
            r={rec.best ? 18 : 13}
            fill={rec.best ? CARD.gold : CARD.green}
            stroke={rec.real ? CARD.ink : 'none'}
            strokeWidth={rec.real ? 4 : 0}
          />
          <text
            x={x(i)}
            y={height - 10}
            textAnchor="middle"
            fontFamily={FONT.mono}
            fontSize={22}
            fill={CARD.muted}
          >
            {rec.season.slice(2)}
          </text>
        </g>
      ))}
    </svg>
  );
}
