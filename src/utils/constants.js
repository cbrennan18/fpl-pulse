// src/utils/constants.js

// FPL league IDs ≤ this threshold are global/system leagues (e.g. "Overall", "Gameweek 1", country leagues).
// Only user-created mini-leagues have IDs above this value.
export const SYSTEM_LEAGUE_THRESHOLD = 321;

// Maximum number of managers sampled for award calculations in league view.
export const MAX_SAMPLED_MANAGERS = 30;

// Number of top entries to fetch profiles for in league view.
export const TOP_N_ENTRIES = 5;
