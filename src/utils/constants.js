// src/utils/constants.js

// FPL league IDs ≤ this threshold are global/system leagues (e.g. "Overall", "Gameweek 1", country leagues).
// Only user-created mini-leagues have IDs above this value.
export const SYSTEM_LEAGUE_THRESHOLD = 321;

// Maximum number of managers sampled for award calculations in league view.
export const MAX_SAMPLED_MANAGERS = 30;

// Number of top entries to fetch profiles for in league view.
export const TOP_N_ENTRIES = 5;

// Medal colors used in league standings, medal table, and award cards.
export const GOLD = '#f0b429';
export const SILVER = '#9fb3be';
export const BRONZE = '#a0522d';
export const MEDAL_COLORS = [GOLD, SILVER, BRONZE];

// Shared header gradient for league/home hero sections and skeletons.
export const HEADER_GRADIENT = 'linear-gradient(180deg, #0a1a0e 0%, #0d1f12 40%, #0a0a0a 100%)';

// Default season length fallback.
export const MAX_GAMEWEEKS = 38;
