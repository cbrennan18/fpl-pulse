// src/features/pulse/utils/careerRating.js
// Wraps the frozen career-rating artifact (career-rating-v1.js + rating-to-rank-v1.json)
// into a single call for the Pulse recap. Fetches the manager's history via api.js,
// shapes it into the artifact's input contract (see fpl-career-rating/output/README.md),
// computes the rating + all-time-rank lookup, and normalises the result for the chapter.

import { fetchEntryHistory } from '../../../utils/api';
import { computeCareerRatingWithRank } from './career-rating-v1';
import lookupTable from './rating-to-rank-v1.json';

// The season the artifact's embedded thresholds currently extend to. FPL keeps the
// just-completed season in `current` until the next season launches (~July), so until
// then it isn't in `past` and must be added manually. Bump this together with the
// artifact whenever a new season is baked into career-rating-v1.js (it mirrors the
// pipeline's CURRENT_SEASON).
const CURRENT_SEASON = '2025/26';

// Shape an FPL history response into the artifact's `seasons` input.
function toSeasons(history) {
  const seasons = (history.past || []).map((p) => ({
    season: p.season_name,
    total_points: p.total_points,
    rank: p.rank,
  }));

  // Add the live season from `current` only if FPL hasn't already rolled it into `past`.
  // Post-rollover `past` carries it and this is skipped; the artifact drops any season it
  // has no threshold for, so a not-yet-baked season can't leak in.
  const current = history.current || [];
  const pastSeasons = new Set(seasons.map((s) => s.season));
  if (current.length && !pastSeasons.has(CURRENT_SEASON)) {
    const last = current.reduce((a, b) => (b.event > a.event ? b : a));
    seasons.push({
      season: CURRENT_SEASON,
      total_points: last.total_points,
      rank: last.overall_rank,
    });
  }
  return seasons;
}

// Keep the last trajectory entry per season (guards a known upstream duplicate-season quirk).
function dedupeTrajectory(trajectory) {
  const bySeason = new Map();
  for (const entry of trajectory) bySeason.set(entry.season, entry);
  return [...bySeason.values()];
}

/**
 * Compute a manager's career rating for the Pulse recap.
 *
 * @returns {Promise<null | {rating, bracket, estRank, percentile, trajectory}>}
 *   - resolves to `null` when the manager has too little usable history
 *   - throws on a failed history fetch (caller soft-fails by omitting the chapter)
 */
export async function getCareerRating(teamId, { signal } = {}) {
  const history = await fetchEntryHistory(teamId, { signal });
  if (!history) throw new Error(`Career-rating: history unavailable for ${teamId}`);

  const result = computeCareerRatingWithRank(toSeasons(history), lookupTable);
  if (!result) return null;

  return {
    rating: result.rating,
    bracket: result.rank.bracket,
    estRank: result.rank.est_rank,
    percentile: result.rank.percentile,
    trajectory: dedupeTrajectory(result.trajectory),
  };
}
