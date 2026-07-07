// Small shared helpers for the beat share cards.

// Top-N rows of an already-sorted list, plus YOUR row appended if it fell outside
// the top N (so a card always shows where you landed).
export function topNPlusYou(sorted, n) {
  const top = sorted.slice(0, n);
  if (top.some((r) => r.isYou)) return top;
  const you = sorted.find((r) => r.isYou);
  return you ? [...top, you] : top;
}

// Signed integer for a card ("+5" / "−5" / "0"), unicode minus to match the calc copy.
export function signed(v) {
  const n = Math.round(v);
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`;
}
