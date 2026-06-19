// features/pulse/wrapped/constants.js
//
// Wrapped (the Pulse rebuild) shared config. See features/pulse/specs/ for the
// source of truth (story-arc / design-spec / art-direction).
//
// NOTE (flip-time): this `wrapped/` tree is built alongside the LEGACY recap
// (PulsePage1–10 + PulseContainer at /pulse). A later session flips /pulse over
// to this flow and reconciles/retires the legacy files. Until then both coexist.

export const SEASON_LABEL = '2025/26';

// The cover counts as progress segment 0; the 11 beats are segments 1–11.
// edition/theme drive the masthead kicker ("No. 02 — CAPTAIN"). screenCount is
// the default 2-screen template (3 allowed for multi-part beats — set per beat).
// Titles/hooks/payoffs are NOT defined here yet — real beat content is a later
// session. This list exists so the chrome (progress, jump menu) is real now.
export const BEATS = [
  { id: 'set-and-forget', theme: 'SET & FORGET', edition: 'No. 01', screenCount: 2 },
  { id: 'captain',        theme: 'CAPTAIN',       edition: 'No. 02', screenCount: 2 },
  { id: 'transfer-timing',theme: 'TRANSFER TIMING',edition: 'No. 03', screenCount: 2 },
  { id: 'maverick',       theme: 'MAVERICK',      edition: 'No. 04', screenCount: 3 },
  { id: 'fingerprint',    theme: 'FINGERPRINT',   edition: 'No. 05', screenCount: 2 },
  { id: 'gameweek-kings', theme: 'GAMEWEEK KINGS',edition: 'No. 06', screenCount: 2 },
  { id: 'chips',          theme: 'CHIPS',         edition: 'No. 07', screenCount: 2 },
  { id: 'the-bench',      theme: 'THE BENCH',     edition: 'No. 08', screenCount: 3 },
  { id: 'luck-vs-skill',  theme: 'LUCK VS SKILL', edition: 'No. 09', screenCount: 2 },
  { id: 'the-race',       theme: 'THE RACE',      edition: 'No. 10', screenCount: 3 },
  { id: 'coda',           theme: 'ALL-TIME',      edition: 'No. 11', screenCount: 3 },
];

// cover + 11 beats
export const TOTAL_SEGMENTS = BEATS.length + 1;
