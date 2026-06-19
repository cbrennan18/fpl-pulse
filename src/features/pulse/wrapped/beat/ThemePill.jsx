// features/pulse/wrapped/beat/ThemePill.jsx
//
// The theme pill in the beat chrome. Shows "No. 0X — THEME" and taps open a jump
// menu listing every beat (design-spec §2). Square, ruled, mono — no rounding.

import { useState } from 'react';

export default function ThemePill({ label, beats, currentIndex, onJump }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 border border-wrapped-ink px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em]"
      >
        {label}
        <span aria-hidden className="text-wrapped-muted">▾</span>
      </button>

      {open && (
        <>
          {/* click-away */}
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <ul className="absolute left-0 top-full z-20 mt-1 w-56 max-h-[60vh] overflow-auto border-2 border-wrapped-ink bg-wrapped-paper">
            {beats.map((b, i) => (
              <li key={b.id} className="border-b border-wrapped-ink/20 last:border-b-0">
                <button
                  type="button"
                  onClick={() => { onJump(i); setOpen(false); }}
                  className={
                    'w-full flex items-baseline gap-2 px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.15em] ' +
                    (i === currentIndex ? 'text-wrapped-green' : 'hover:bg-wrapped-ink/[0.05]')
                  }
                >
                  <span className="tabular-nums text-wrapped-muted">{b.edition.replace('No. ', '')}</span>
                  <span className="truncate">{b.theme}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
