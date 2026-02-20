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

// League-specific stat helpers (used only by LeagueViewContainer)

export function calculateTop5AvgRank(playerData, standings, gwOffset = -1) {
  const valid = standings.filter(e => playerData[e.entry]?.history?.length >= Math.abs(gwOffset));
  const sorted = [...valid].sort((a, b) => {
    const aRank = playerData[a.entry].history.at(gwOffset)?.overall_rank;
    const bRank = playerData[b.entry].history.at(gwOffset)?.overall_rank;
    return aRank - bRank;
  });

  const top5 = sorted.slice(0, 5);
  const ranks = top5.map(p => playerData[p.entry].history.at(gwOffset)?.overall_rank).filter(Number.isFinite);

  return ranks.length ? Math.round(ranks.reduce((sum, r) => sum + r, 0) / ranks.length) : null;
}

export function calculateLeagueRankChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return previous - current;
}

export function calculatePointsBehindChange(userTotals, leaderTotals, gw) {
  if (!userTotals || !leaderTotals) return {};

  const now = gw;
  const prev = gw - 1;

  const points_behind = (leaderTotals[now] ?? 0) - (userTotals[now] ?? 0);
  const points_behind_prev = (leaderTotals[prev] ?? 0) - (userTotals[prev] ?? 0);
  const points_behind_change = points_behind - points_behind_prev;

  return { points_behind, points_behind_prev, points_behind_change };
}
