// features/pulse/wrapped/beat/RankTable.jsx
//
// A ranked-leaderboard primitive for the Wrapped detail sheet: #, manager, value,
// with YOU marked green (the sub-brand's one consistent behaviour). Purely
// presentational — the caller supplies PRE-RANKED rows.
//
// Built for Beat 5b's full-league-by-position table, and the SAME primitive the
// Pattern-4 full-league tables (Beats 8b / 11b) will drop in unchanged — hence the
// generic { rank, name, value, isYou } row shape and the configurable value header.

export default function RankTable({ rows, valueHeader = 'Points' }) {
  return (
    <div>
      <div className="flex items-baseline gap-3 pb-1 border-b border-wrapped-ink font-mono text-[10px] uppercase tracking-[0.2em] text-wrapped-muted">
        <span className="w-6 text-right">#</span>
        <span className="flex-1">Manager</span>
        <span className="w-16 text-right">{valueHeader}</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.entryId ?? r.rank}
          className="flex items-baseline gap-3 py-1.5 border-b border-wrapped-ink/15"
        >
          <span className="w-6 text-right tabular-nums font-mono text-sm text-wrapped-muted">
            {r.rank}
          </span>
          <span
            className={`flex-1 truncate font-sans text-[15px] ${
              r.isYou ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink'
            }`}
          >
            {r.name}
          </span>
          <span
            className={`w-16 text-right tabular-nums font-sans text-[15px] ${
              r.isYou ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink'
            }`}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
