// features/pulse/wrapped/beat/TransferStrip.jsx
//
// Beat 3 payoff — the per-corridor swing strip plot. Hand-rolled SVG, inheriting
// the beat-2 chart-on-stock system (CaptainChart): bordered inset on cream, ink +
// green + muted marks, hairline axes load-bearing, tabular DM Mono labels, NO
// texture. Art-direction §5 "data beats".
//
// TWO real axes:
//   • x = corridor (Day-7+ left → Day-0 right): WHEN the transfer was made.
//   • y = average points swing per transfer: HOW WELL it paid off. A heavier ink
//     ZERO RULE is breakeven — dots above gained, below cost. This good-vs-bad
//     read is the whole point, so the zero rule is drawn distinctly heavier than
//     the other gridlines and labelled "0".
//
// One dot per (manager, corridor): you = green, ink-ringed, drawn LAST (the hero);
// league = muted-ink low-opacity cloud (context). Volume = dot radius. A
// deterministic in-corridor x-jitter (seeded by entryId, stable across renders)
// separates co-corridor managers WITHOUT disturbing y, which carries real meaning.
// Y-domain is a robust bound (≈85th pct of |avg swing|) with outliers clamped to
// the rim, so one noisy corridor can't blow out the scale and flatten the field.

const W = 320;
const H = 212;
const PAD = { top: 10, right: 10, bottom: 28, left: 28 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const BAND = PLOT_W / 8;
const MID_Y = PAD.top + PLOT_H / 2;

function niceCeil(v) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * pow;
}

// Robust y bound: the ~85th percentile of |avg swing|, floored at 2 and rounded
// up to a "nice" number. Keeps a single extreme corridor from crushing everyone.
function robustDomain(vals) {
  if (!vals.length) return 2;
  const abs = vals.map((v) => Math.abs(v)).sort((a, b) => a - b);
  const p = abs[Math.floor(0.85 * (abs.length - 1))];
  return Math.max(2, niceCeil(p));
}

// Stable [-1, 1] from an entry id — deterministic jitter, no per-render flicker.
function jitterFrac(entryId) {
  const x = Math.sin(entryId * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

// corridor 7 (left) … 0 (right)
const bandCenter = (corridor) => PAD.left + (7 - corridor + 0.5) * BAND;

export default function TransferStrip({ dots, corridorBaselines, selectedId, onSelect }) {
  if (!dots?.length) return null;

  // Selecting a dot must NOT bubble to BeatShell's tap-to-advance.
  const select = (e, d) => {
    e.stopPropagation();
    onSelect(d);
  };

  const domain = robustDomain(dots.map((d) => d.avgSwing));
  const maxCount = Math.max(1, ...dots.map((d) => d.count));

  const y = (v) => MID_Y - (Math.max(-domain, Math.min(domain, v)) / domain) * (PLOT_H / 2);
  const radius = (count) => 2 + 3 * Math.sqrt(count / maxCount); // 2 → 5px
  const dotX = (d) => bandCenter(d.corridor) + jitterFrac(d.entryId) * (BAND * 0.32);

  const league = dots.filter((d) => !d.isYou);
  const mine = dots.filter((d) => d.isYou);
  const yTicks = [domain, domain / 2, 0, -domain / 2, -domain];

  return (
    <div className="border border-wrapped-ink rounded-[2px] bg-wrapped-paper px-2 pt-2 pb-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Average points swing per transfer, by how early the transfer was made">
        {/* y gridlines + labels (light) */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)}
              className="stroke-wrapped-ink" strokeWidth="0.5" opacity={t === 0 ? 0 : 0.12}
            />
            <text
              x={PAD.left - 4} y={y(t) + 3} textAnchor="end" fontSize="9"
              className="fill-wrapped-muted font-mono tabular-nums"
            >
              {t > 0 ? `+${t}` : t}
            </text>
          </g>
        ))}

        {/* ZERO RULE — heavier + labelled, the breakeven the whole read hangs on */}
        <line
          x1={PAD.left} x2={W - PAD.right} y1={MID_Y} y2={MID_Y}
          className="stroke-wrapped-ink" strokeWidth="1.1" opacity="0.7"
        />
        <text x={W - PAD.right} y={MID_Y - 3} textAnchor="end" fontSize="8" className="fill-wrapped-muted font-mono uppercase tracking-[0.15em]">
          breakeven
        </text>

        {/* corridor dividers + x labels */}
        {Array.from({ length: 7 }, (_, i) => PAD.left + (i + 1) * BAND).map((cx, i) => (
          <line key={i} x1={cx} x2={cx} y1={PAD.top} y2={PAD.top + PLOT_H} className="stroke-wrapped-ink" strokeWidth="0.5" opacity="0.1" />
        ))}
        {[7, 6, 5, 4, 3, 2, 1, 0].map((c) => (
          <text
            key={c} x={bandCenter(c)} y={H - 14} textAnchor="middle" fontSize="8"
            className="fill-wrapped-muted font-mono tabular-nums"
          >
            {c === 7 ? '7+' : c}
          </text>
        ))}
        <text x={PAD.left} y={H - 4} textAnchor="start" fontSize="7.5" className="fill-wrapped-muted font-mono uppercase tracking-[0.12em]">
          days early
        </text>
        <text x={W - PAD.right} y={H - 4} textAnchor="end" fontSize="7.5" className="fill-wrapped-muted font-mono uppercase tracking-[0.12em]">
          deadline
        </text>

        {/* per-corridor league baseline — a short ink dash at the field mean */}
        {corridorBaselines.map((b) => (
          <line
            key={b.corridor}
            x1={bandCenter(b.corridor) - BAND * 0.3}
            x2={bandCenter(b.corridor) + BAND * 0.3}
            y1={y(b.leagueAvgSwing)} y2={y(b.leagueAvgSwing)}
            className="stroke-wrapped-ink" strokeWidth="1" opacity="0.35" strokeDasharray="2 1.5"
          />
        ))}

        {/* league cloud — muted, low opacity (context) */}
        {league.map((d) => {
          const cx = dotX(d);
          const isSel = d.entryId === selectedId;
          return (
            <g key={`l${d.entryId}-${d.corridor}`} onClick={(e) => select(e, d)} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={y(d.avgSwing)} r={Math.max(8, radius(d.count) + 4)} fill="transparent" />
              <circle
                cx={cx} cy={y(d.avgSwing)} r={radius(d.count)}
                className="fill-wrapped-muted" opacity={isSel ? 0.85 : 0.3}
                stroke={isSel ? 'currentColor' : 'none'} strokeWidth="0.75"
              />
            </g>
          );
        })}

        {/* you — green, ink-ringed, drawn LAST so it never sinks into the cloud */}
        {mine.map((d) => {
          const cx = dotX(d);
          const isSel = d.entryId === selectedId;
          return (
            <g key={`y${d.corridor}`} onClick={(e) => select(e, d)} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={y(d.avgSwing)} r={Math.max(9, radius(d.count) + 5)} fill="transparent" />
              <circle
                cx={cx} cy={y(d.avgSwing)} r={radius(d.count) + 1.5}
                className="fill-wrapped-green stroke-wrapped-ink" strokeWidth={isSel ? 1.6 : 1}
              />
            </g>
          );
        })}
      </svg>

      {/* legend — DM Mono, tracked */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-wrapped-muted">
        <span className="text-wrapped-green">● You</span>
        <span>● League</span>
        <span>above 0 = gain</span>
      </div>
    </div>
  );
}
