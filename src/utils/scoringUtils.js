// Shared scoring calculations used by both league and pulse features.

// Calculates top 5 players by points earned while owned.
export function calculateTop5Earned(picksByGW, liveDataByGW, playerNames) {
  const pointsByPlayer = {};

  for (let gw = 1; gw <= 38; gw++) {
    const picks = picksByGW[gw];
    const liveStats = liveDataByGW?.[gw];

    if (!picks || !liveStats) continue;

    picks.forEach(pick => {
      const stats = liveStats[pick.element];
      if (!stats) return;

      const earned = (stats.total_points || 0) * pick.multiplier;
      pointsByPlayer[pick.element] = (pointsByPlayer[pick.element] || 0) + earned;
    });
  }

  return Object.entries(pointsByPlayer)
    .map(([id, pts]) => ({
      player: playerNames[id]?.web_name || `#${id}`,
      points: Math.round(pts)
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);
}

// Calculates top 5 players by points missed (not owned).
export function calculateTop5Missed(picksByGW, liveDataByGW, playerNames) {
  const pointsMissed = {};
  const gwMissedCount = {};

  for (let gw = 1; gw <= 38; gw++) {
    const picks = picksByGW[gw] || [];
    const ownedIds = new Set(picks.map(p => p.element));
    const liveStats = liveDataByGW?.[gw];

    if (!liveStats) continue;

    Object.entries(liveStats).forEach(([id, stats]) => {
      const playerId = parseInt(id, 10);

      if (!ownedIds.has(playerId)) {
        const pts = stats.total_points || 0;
        pointsMissed[playerId] = (pointsMissed[playerId] || 0) + pts;
        gwMissedCount[playerId] = (gwMissedCount[playerId] || 0) + 1;
      }
    });
  }

  return Object.entries(pointsMissed)
    .map(([id, pts]) => ({
      player: playerNames[id]?.web_name || `#${id}`,
      points: Math.round(pts),
      gwsMissed: gwMissedCount[id]
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);
}
