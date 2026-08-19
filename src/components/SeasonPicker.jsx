// src/components/SeasonPicker.jsx
//
// Season selector. A row of segmented chips, not a <select> — at friends-league scale
// there are two or three seasons, and an inline row reads as part of the page furniture
// rather than a form control dropped into it. Type and spacing follow the surrounding
// mono kickers in each palette.
//
// TWO PALETTES, one behaviour. Wrapped is a visual sub-brand with its own warm-stock
// colours and must never take the app's green/dark theme (or vice versa), so the variant
// swaps class strings only — there is no branching logic below it.
//
// Renders NOTHING below two options: a lone chip is a control that cannot be operated,
// and the season is already stated in the copy around it.
//
// A disabled chip is the rollover fortnight made visible — the new season exists, is
// current, and holds nothing yet. Saying so is the point; hiding it would leave the user
// wondering why they are looking at last season.

const VARIANTS = {
  app: {
    row: 'gap-2',
    base: 'font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 border transition-colors',
    active: 'border-[#00e87a] text-[#00e87a]',
    idle: 'border-white/15 text-white/45 hover:border-white/30 hover:text-white/70',
    off: 'border-white/[0.08] text-white/25 cursor-not-allowed',
    note: 'block font-mono text-[8px] tracking-widest text-white/25 mt-0.5',
  },
  wrapped: {
    row: 'gap-2',
    base: 'font-mono text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 border-2 transition-colors',
    active: 'border-wrapped-ink bg-wrapped-ink text-wrapped-paper',
    idle: 'border-wrapped-ink/30 text-wrapped-muted hover:border-wrapped-ink/60',
    off: 'border-wrapped-ink/15 text-wrapped-muted/40 cursor-not-allowed',
    note: 'block font-mono text-[8px] tracking-[0.15em] text-wrapped-muted/60 mt-0.5',
  },
};

export default function SeasonPicker({ options = [], value, onChange, variant = 'app', className = '' }) {
  if (options.length < 2) return null;
  const v = VARIANTS[variant] ?? VARIANTS.app;

  return (
    <div
      role="radiogroup"
      aria-label="Season"
      className={`flex flex-wrap items-start justify-center ${v.row} ${className}`}
    >
      {options.map((o) => {
        const selected = o.season === value;
        return (
          <button
            key={o.season}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={o.disabled}
            onClick={() => !o.disabled && !selected && onChange(o.season)}
            className={`${v.base} ${o.disabled ? v.off : selected ? v.active : v.idle}`}
          >
            {o.label}
            {o.disabled && <span className={v.note}>no data yet</span>}
          </button>
        );
      })}
    </div>
  );
}
