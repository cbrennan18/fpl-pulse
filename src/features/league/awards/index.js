// Barrel export for all award calculations
export {
  calculateLeagueLeaders,
  calculateOneHitWonders,
  calculateHotStreak,
  calculateMostConsistent,
  calculateMostMinutes,
  calculateMostCards,
  calculateMostBps,
  calculateBestPunt,
} from './scoringAwards';

export { calculateTop5Earned, calculateTop5Missed } from '../../../utils/scoringUtils';

export {
  calculateWildcards,
  calculateFreeHits,
} from './chipAwards';

export {
  calculateMostTransfers,
  calculateMostHits,
  calculateNeverGetFancy,
  calculateBenchDisaster,
  calculateEarlyBird,
  calculateLateOwl,
} from './transferAwards';

export function calculatePointsBehindChange(userTotals, leaderTotals, gw) {
  if (!userTotals || !leaderTotals) return {};

  const now = gw;
  const prev = gw - 1;

  const points_behind = (leaderTotals[now] ?? 0) - (userTotals[now] ?? 0);
  const points_behind_prev = (leaderTotals[prev] ?? 0) - (userTotals[prev] ?? 0);
  const points_behind_change = points_behind - points_behind_prev;

  return { points_behind, points_behind_prev, points_behind_change };
}
