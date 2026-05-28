/**
 * FPL Career Rating — Algorithm B (FPL Research-style, points-normalised).
 *
 * See README.md in this folder for the full contract. Returns are UNROUNDED —
 * round at display time.
 *
 * @param {Array<{season: string, rank?: number, total_points: number, total_managers?: number}>} seasons
 * @returns {{rating: number, trajectory: Array<{season: string, rating: number, percentile: number}>} | null}
 */

const SEASON_THRESHOLDS = {
  "2006/07": 2075,
  "2007/08": 2267,
  "2008/09": 2107,
  "2009/10": 2407,
  "2010/11": 2159,
  "2011/12": 2222,
  "2012/13": 2264,
  "2013/14": 2436,
  "2014/15": 2245,
  "2015/16": 2291,
  "2016/17": 2340,
  "2017/18": 2336,
  "2018/19": 2403,
  "2019/20": 2368,
  "2020/21": 2498,
  "2021/22": 2629,
  "2022/23": 2607,
  "2023/24": 2570,
  "2024/25": 2595,
  "2025/26": 2391
};

const TOTAL_PLAYERS = {
  "2006/07": 900000,
  "2007/08": 1500000,
  "2008/09": 2000000,
  "2009/10": 2500000,
  "2010/11": 2800000,
  "2011/12": 3000000,
  "2012/13": 3200000,
  "2013/14": 3500000,
  "2014/15": 3500000,
  "2015/16": 3870000,
  "2016/17": 4500000,
  "2017/18": 5200000,
  "2018/19": 6300000,
  "2019/20": 7600000,
  "2020/21": 8200000,
  "2021/22": 9100000,
  "2022/23": 9800000,
  "2023/24": 11300000,
  "2024/25": 11500000,
  "2025/26": 13107732
};

const SEEDING_COEFFS = [0.004626689601418145, -0.2981370678777188, 75.72911790034557];  // degree-2 polynomial [a, b, c]
const BASE_WEIGHT = 0.190558;
const WEIGHT_SCALE = 1.94128;
const DECLINE_FACTOR = 0.999969;  // weight multiplier when norm < rating

function applySeedingCurve(normScore) {
  const [a, b, c] = SEEDING_COEFFS;
  return a * normScore * normScore + b * normScore + c;
}

function toPercentile(rank, totalManagers) {
  if (!totalManagers || totalManagers <= 0) return 50;
  return (1 - rank / totalManagers) * 100;
}

export function computeCareerRating(seasons) {
  if (!seasons || seasons.length === 0) return null;

  const sorted = [...seasons]
    .filter(s => s.total_points && SEASON_THRESHOLDS[s.season])
    .sort((a, b) => a.season.localeCompare(b.season));

  if (!sorted.length) return null;

  let rating = null;
  const trajectory = [];

  for (const s of sorted) {
    const threshold = SEASON_THRESHOLDS[s.season];
    const normScore = (s.total_points / threshold) * 100;

    if (rating === null) {
      rating = applySeedingCurve(normScore);
    } else {
      let weight = BASE_WEIGHT + WEIGHT_SCALE * (1 - rating / 100);
      if (normScore < rating) weight *= DECLINE_FACTOR;
      weight = Math.max(0.05, Math.min(0.95, weight));
      rating = weight * normScore + (1 - weight) * rating;
    }

    const totalManagers = s.total_managers || TOTAL_PLAYERS[s.season] || 0;
    const percentile = toPercentile(s.rank, totalManagers);
    trajectory.push({ season: s.season, rating, percentile });
  }

  return { rating: trajectory[trajectory.length - 1].rating, trajectory };
}

/**
 * Map a raw rating to its all-time-rank lookup row.
 *
 * Clamps ratings above 100 to the top bin and below 0 to the bottom bin, so
 * out-of-range ratings never miss the table. Returns null for a null/undefined
 * rating (e.g. when computeCareerRating returned null for empty input).
 *
 * @param {number | null} rating
 * @param {Array<{rating: number, est_all_time_rank: number, percentile: number, bracket: string}>} lookupTable
 *        The contents of rating_to_rank_b.json (201 rows, ratings 0..100 step 0.5).
 * @returns {{rating: number, est_rank: number, percentile: number, bracket: string} | null}
 */
export function lookupRank(rating, lookupTable) {
  if (rating === null || rating === undefined || Number.isNaN(rating)) return null;
  const clamped = Math.max(0, Math.min(100, rating));
  const idx = Math.round(clamped * 2);  // 0.5-step grid → array index
  const row = lookupTable[idx];
  if (!row) return null;
  return {
    rating: row.rating,
    est_rank: row.est_all_time_rank,
    percentile: row.percentile,
    bracket: row.bracket,
  };
}

/**
 * Convenience: compute the rating and resolve its rank lookup in one call.
 * Returns null when the input history is empty/unusable. The frontend should
 * not need to handle edge cases itself.
 *
 * @returns {{rating: number, trajectory: Array, rank: object | null} | null}
 */
export function computeCareerRatingWithRank(seasons, lookupTable) {
  const result = computeCareerRating(seasons);
  if (result === null) return null;
  return {
    rating: result.rating,
    trajectory: result.trajectory,
    rank: lookupRank(result.rating, lookupTable),
  };
}
