// Shared constants for the awards-share feature. Lives in its own file so
// GwAwardsGraphic.jsx can be a pure component file (react-refresh).

export const FORMAT_DIMS = {
  twitter: { width: 1200, height: 675 },
  whatsapp: { width: 1080, height: 1080 },
  instagram: { width: 1080, height: 1350 },
};

// Inline literals (not Tailwind classes) because GwAwardsGraphic is captured
// off-screen by html-to-image — the rasteriser doesn't run Tailwind. Real-DOM
// components in this folder use the `accent.purple` Tailwind token instead;
// keep `PALETTE.accent` in sync with `tailwind.config.js`.
export const PALETTE = {
  bg: '#0a0a0a',
  panel: '#141414',
  border: 'rgba(255,255,255,0.06)',
  accent: '#8B5CF6',
  subtext: '#8a8a8a',
  micro: '#525252',
};

export const THUMB_SIZE = 88;
