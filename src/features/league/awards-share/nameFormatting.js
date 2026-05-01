// Splits a manager's name into first token vs. the rest, for the two-line
// hero rendering on WhatsApp/Instagram cards. Leaderboard rows and the
// Twitter compact layout don't use this.
//
// Examples:
//   "Ciarán Brennan"   → { firstName: "Ciarán",  rest: "Brennan",     isMononym: false }
//   "Mike O'Connor"    → { firstName: "Mike",    rest: "O'Connor",    isMononym: false }
//   "Maria van der B." → { firstName: "Maria",   rest: "van der B.",  isMononym: false }
//   "Spaceman"         → { firstName: "",        rest: "Spaceman",    isMononym: true  }

export function formatWinnerName(name) {
  if (!name || typeof name !== 'string') return { firstName: '', rest: name ?? '', isMononym: true };
  const trimmed = name.trim();
  const idx = trimmed.search(/\s/);
  if (idx === -1) return { firstName: '', rest: trimmed, isMononym: true };
  return {
    firstName: trimmed.slice(0, idx),
    rest: trimmed.slice(idx + 1),
    isMononym: false,
  };
}
