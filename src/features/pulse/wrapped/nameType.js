// features/pulse/wrapped/nameType.js
//
// Shared type-size step-down for user-set names (league / team / manager). FPL
// names are often long AND spaceless ("EXTREMELYGOODLOOKINGPEOPLE+KEV"), so in
// Bebas hero/row contexts a long name should drop a size or two rather than
// dominate four wrapped lines. Pair this with `[overflow-wrap:anywhere]` so the
// name still wraps (never mid-word truncates) once stepped down.
//
// `ladder` is the call site's own size classes, largest → smallest; the step is
// chosen by length and clamped to the ladder.

export function nameSizeClass(name, ladder) {
  const n = (name || '').length;
  const step = n <= 14 ? 0 : n <= 22 ? 1 : n <= 30 ? 2 : 3;
  return ladder[Math.min(step, ladder.length - 1)];
}
