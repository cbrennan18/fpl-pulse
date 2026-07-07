// features/pulse/wrapped/share/cardTokens.js
//
// Inline design tokens for the Wrapped SHARE CARDS. Card components are captured
// off-screen by html-to-image, whose <foreignObject> sandbox does NOT run
// Tailwind — so cards must use inline literals, not `text-wrapped-*` classes.
// This mirrors the role of `awards-share/constants.js` PALETTE.
//
// KEEP IN SYNC with the `wrapped` palette in `tailwind.config.js` (the visible
// beats use the class tokens; these are the same values as raw hex for the PNG).
export const CARD = {
  paper: '#ECE3CF', // cream surface
  ink: '#1E1B16', // near-black text / rules
  muted: '#6B6354', // muted ink (kickers, secondary)
  green: '#1C5237', // semantic: you / gain
  gold: '#B08518', // semantic: peak / highlight (fills & marks, not body text)
  stamp: '#B23A2E', // semantic: regret / stamp only
};

// Font-family strings matching the woff2 faces `fontEmbedCss.js` already inlines.
export const FONT = {
  display: "'Bebas Neue', sans-serif", // display + hero numerals
  body: "'Manrope', system-ui, sans-serif", // body
  mono: "'DM Mono', monospace", // tracked kickers, tabular labels
};
