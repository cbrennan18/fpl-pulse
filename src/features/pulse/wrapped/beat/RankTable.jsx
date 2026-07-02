// features/pulse/wrapped/beat/RankTable.jsx
//
// A ranked-leaderboard primitive for the Wrapped detail sheet: #, manager, value,
// with YOU marked green (the sub-brand's one consistent behaviour). Purely
// presentational — the caller supplies PRE-RANKED rows.
//
// Built for Beat 5b's full-league-by-position table, and the SAME primitive the
// Pattern-4 full-league tables (Beats 8b / 11b) and the inverted Beat 4 ranking
// reuse unchanged — hence the generic { rank, name, value, isYou } row shape and
// the configurable value header.
//
// SHARED PIN-YOUR-ROW MECHANISM (Pattern 4): the YOU row is `sticky bottom-0` with
// an opaque paper background, so when your natural position is below the fold it
// pins to the bottom edge and is never scrolled away; when scrolled into view it
// detaches in-flow. Pure CSS — needs only a bounded scrollable ancestor (the
// DetailSheet body, or a beat's own overflow-y-auto column). Works identically for
// the in-sheet full-league tables and Beat 4's inline inverted ranking, where you
// fall to the foot of the maverick order.
//
// Rows are optionally tappable: pass `onRowTap` and each row becomes a guarded
// button (stopPropagation → onRowTap(row)), so it never advances the beat. Beat 4
// uses this to open a manager's lineup detail; the plain full-league tables omit it.

function Row({ row, onRowTap, pinned = false }) {
  const nameCls = `flex-1 truncate font-sans text-[15px] ${
    row.isYou ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink'
  }`;
  const valueCls = `w-16 text-right tabular-nums font-sans text-[15px] ${
    row.isYou ? 'text-wrapped-green font-semibold' : 'text-wrapped-ink'
  }`;

  // The YOU row sticks to the bottom of the scroll container; opaque paper bg + a
  // top hairline keep scrolled rows from bleeding through underneath it.
  const containerCls = `flex items-baseline gap-3 py-1.5 border-b border-wrapped-ink/15 ${
    pinned ? 'sticky bottom-0 z-10 bg-wrapped-paper border-t border-wrapped-ink/30' : ''
  } ${onRowTap ? 'w-full text-left' : ''}`;

  const inner = (
    <>
      <span className="w-6 text-right tabular-nums font-mono text-sm text-wrapped-muted">
        {row.rank}
      </span>
      <span className={nameCls}>{row.name}</span>
      <span className={valueCls}>{row.value}</span>
    </>
  );

  if (onRowTap) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // a row tap opens the detail sheet; never advance the beat
          onRowTap(row);
        }}
        className={containerCls}
      >
        {inner}
      </button>
    );
  }

  return <div className={containerCls}>{inner}</div>;
}

export default function RankTable({ rows, valueHeader = 'Points', onRowTap }) {
  return (
    <div>
      <div className="flex items-baseline gap-3 pb-1 border-b border-wrapped-ink font-mono text-[10px] uppercase tracking-[0.2em] text-wrapped-muted">
        <span className="w-6 text-right">#</span>
        <span className="flex-1">Manager</span>
        <span className="w-16 text-right">{valueHeader}</span>
      </div>
      {rows.map((r) => (
        <Row
          key={r.entryId ?? r.rank}
          row={r}
          onRowTap={onRowTap}
          pinned={r.isYou}
        />
      ))}
    </div>
  );
}
