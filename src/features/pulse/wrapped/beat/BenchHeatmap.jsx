// features/pulse/wrapped/beat/BenchHeatmap.jsx
//
// Beat 8 — the 38-cell recoverable-points heatmap, built to the warm-editorial
// mock-lock: INK-DENSITY ON CREAM (not a neon ramp), a HAIRLINE CELL BORDER that
// is load-bearing (it's what makes low cells read on the stock), NO texture under
// the grid, and a GREEN CHECK on "nailed it" weeks (recoverable 0).
//
// Deliberately a DOM grid of bordered cells, NOT the SVG chart system — a heatmap
// isn't a plotted chart, and per-cell tap targets + a swap popup are far simpler
// as DOM. It still sits in a bordered inset panel on the stock (art-direction §5).
//
// Tap a cell → the per-GW swap breakdown. The tap is guarded by the parent
// (stopPropagation) so it never advances the beat.

import { CheckIcon } from '@phosphor-icons/react';

const COLS = 6;

// Ink opacity for a cell: a floor so even a 1-pt week reads, ramping to near-solid
// at your worst week. Nailed/empty cells carry no fill (the check / dash speaks).
function inkOpacity(recoverable, maxCell) {
  if (recoverable <= 0 || maxCell <= 0) return 0;
  return 0.14 + 0.76 * (recoverable / maxCell);
}

function Cell({ cell, maxCell, selected, onSelect }) {
  const opacity = inkOpacity(cell.recoverable, maxCell);
  const dark = opacity > 0.5; // flip the figure to paper on a dense cell
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation(); // a cell tap reveals; it must never advance the beat
        onSelect(cell.gw);
      }}
      className={`relative aspect-square border ${
        selected ? 'border-wrapped-ink ring-1 ring-wrapped-ink' : 'border-wrapped-ink/30'
      }`}
      aria-label={`Gameweek ${cell.gw}${cell.nailed ? ', nailed it' : `, ${cell.recoverable} recoverable`}`}
    >
      {cell.played && cell.recoverable > 0 && (
        <span className="absolute inset-0 bg-wrapped-ink" style={{ opacity }} />
      )}
      <span className="absolute top-0.5 left-1 font-mono text-[8px] text-wrapped-muted leading-none">
        {cell.gw}
      </span>
      <span className="absolute inset-0 flex items-center justify-center">
        {!cell.played ? (
          <span className="font-mono text-[10px] text-wrapped-muted/60">·</span>
        ) : cell.nailed ? (
          <CheckIcon size={13} weight="bold" className="text-wrapped-green" />
        ) : (
          <span
            className={`font-mono text-[11px] tabular-nums ${dark ? 'text-wrapped-paper' : 'text-wrapped-ink'}`}
          >
            {cell.recoverable}
          </span>
        )}
      </span>
    </button>
  );
}

function SwapPopup({ cell }) {
  if (!cell) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-wrapped-muted">
        Tap a week to see what you left on the bench →
      </p>
    );
  }
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-wrapped-ink">
        GW{cell.gw}
        {cell.played && cell.recoverable > 0 && (
          <span className="text-wrapped-green"> · +{cell.recoverable} left out</span>
        )}
      </p>
      {!cell.played ? (
        <p className="font-sans text-sm text-wrapped-muted mt-1">You weren&apos;t in the league this week.</p>
      ) : cell.nailed ? (
        <p className="font-sans text-sm text-wrapped-green mt-1">Nailed it — you started your best XI.</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {cell.swaps.map((s, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 font-sans text-sm">
              <span className="min-w-0 [overflow-wrap:anywhere]">
                <span className="text-wrapped-muted">{s.out}</span>
                <span className="tabular-nums text-wrapped-muted"> {s.outPts}</span>
                <span className="text-wrapped-muted"> → </span>
                <span className="text-wrapped-ink">{s.in}</span>
                <span className="tabular-nums text-wrapped-ink"> {s.inPts}</span>
              </span>
              <span className="shrink-0 tabular-nums font-mono text-wrapped-green">+{s.gain}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BenchHeatmap({ cells, maxCell, selectedGw, onSelect }) {
  const selectedCell = cells.find((c) => c.gw === selectedGw) || null;
  return (
    <div className="mt-3">
      {/* the grid — bordered inset on the stock, hairline cells, no texture */}
      <div
        className="grid border border-wrapped-ink/30 bg-wrapped-paper"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => (
          <Cell
            key={cell.gw}
            cell={cell}
            maxCell={maxCell}
            selected={cell.gw === selectedGw}
            onSelect={onSelect}
          />
        ))}
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-wrapped-muted mt-2 flex items-center gap-1.5">
        <CheckIcon size={12} weight="bold" className="text-wrapped-green" /> nailed it · darker = more left out
      </p>

      {/* the per-GW swap popup */}
      <div className="mt-3 min-h-[5.5rem] border-t border-wrapped-ink/30 pt-3">
        <SwapPopup cell={selectedCell} />
      </div>
    </div>
  );
}
