// Scoring and performance award calculations

// Calculates top total point scorers across the season.
// Context: lowest individual GW score to show consistency risk.
export function calculateLeagueLeaders(playerDataMap) {
  return Object.values(playerDataMap)
    .filter(player => player && Array.isArray(player.history))
    .map(player => {
      const totalPoints = player.history.reduce((sum, gw) => sum + gw.points, 0);
      const lowestScore = Math.min(...player.history.map(gw => gw.points));

      return {
        name: player.name,
        score: totalPoints,
        value: totalPoints.toString(),
        context: {
          lowScore: lowestScore
        }
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Finds the highest single GW score for each manager.
// Context: GW number and score where the best haul occurred.
export function calculateOneHitWonders(data) {
  return Object.values(data)
    .filter(d => d && Array.isArray(d.history))
    .map(d => {
      const best = d.history.reduce(
        (acc, g) => g.points > acc.points ? { points: g.points, gw: g.event } : acc,
        { points: 0, gw: null }
      );

      return {
        name: d.name,
        score: best.points,
        value: best.points.toString(),
        context: {
          gw: best.gw,
          points: best.points
        }
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Calculates the longest streak of consecutive overall rank improvements.
// Context: start and end GWs of the streak, and its length.
export function calculateHotStreak(data) {
  return Object.values(data)
    .filter(d => d && Array.isArray(d.history))
    .map(d => {
      let maxStreak = 0, current = 0, lastRank = null;
      let start = null, end = null, bestStart = null, bestEnd = null;

      d.history.forEach((g, idx) => {
        const rank = g.overall_rank ?? g.rank;
        if (typeof rank !== 'number') return;

        if (lastRank !== null && rank < lastRank) {
          current++;
          if (current === 1) start = d.history[idx - 1].event;
          end = g.event;
          if (current > maxStreak) {
            maxStreak = current;
            bestStart = start;
            bestEnd = end;
          }
        } else {
          current = 0;
        }

        lastRank = rank;
      });

      return {
        name: d.name,
        score: maxStreak,
        value: maxStreak.toString(),
        context: {
          start: bestStart,
          end: bestEnd,
          length: maxStreak
        }
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Identifies managers with the smallest average difference from the weekly GW average.
// Context: how many times they scored above vs below the weekly average.
export function calculateMostConsistent(data) {
  const gwScores = {};

  // 1. Collect all player scores per GW
  Object.values(data).forEach(player => {
    if (!Array.isArray(player.history)) return;
    player.history.forEach(g => {
      if (!gwScores[g.event]) gwScores[g.event] = [];
      gwScores[g.event].push(g.points);
    });
  });

  // 2. Compute average score per GW
  const gwAverages = {};
  Object.entries(gwScores).forEach(([gw, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    gwAverages[gw] = avg;
  });

  // 3. Compute consistency data per player
  const results = Object.values(data)
    .filter(player => player && Array.isArray(player.history))
    .map(player => {
      const diffs = [];
      let closestGw = null;
      let closestStdev = Infinity;

      player.history.forEach(g => {
        const avg = gwAverages[g.event];
        const diff = g.points - avg;
        diffs.push(diff);

        const absDiff = Math.abs(diff);
        if (absDiff < closestStdev) {
          closestStdev = absDiff;
          closestGw = g.event;
        }
      });

      const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const variance = diffs.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / diffs.length;
      const stdev = Math.sqrt(variance);

      return {
        name: player.name,
        score: stdev,
        value: stdev.toFixed(1),
        context: {
          closestGw,
          closestStdev: closestStdev
        }
      };
    });

  return results.sort((a, b) => a.score - b.score).slice(0, 3);
}

// Calculates total minutes played by valid starters for each manager.
// Context: most-used player (by minutes) and their total time on pitch.
export function calculateMostMinutes(data, playerNames) {
  return Object.entries(data)
    .filter(([key, player]) => key !== '_meta' && player && player.minutesByGW && player.picksByGW)
    .map(([_, player]) => {
      const playerTotals = {};

      for (let gw = 1; gw <= 38; gw++) {
        const picks = player.picksByGW[gw] || [];
        const starters = picks.filter(p => p.multiplier > 0).map(p => p.element);

        for (const id of starters) {
          const mins = player.minutesByGW?.[gw]?.[id] || 0;
          playerTotals[id] = (playerTotals[id] || 0) + mins;
        }
      }

      const total = Object.values(playerTotals).reduce((a, b) => a + b, 0);

      const [mostUsedId, minutes] = Object.entries(playerTotals).reduce(
        (a, b) => b[1] > a[1] ? b : a,
        [null, 0]
      );

      return {
        name: player.name,
        score: total,
        value: total.toLocaleString(),
        context: {
          player: playerNames[mostUsedId] || `Player ${mostUsedId}`,
          minutes
        }
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Calculates total disciplinary points from yellow (1pt) and red cards (3pts) earned by starting players.
// Context: total number of yellow and red cards.
export function calculateMostCards(playerDataMap, liveDataByGW) {
  const results = Object.values(playerDataMap)
    .filter(p => p && p.name && p.picksByGW)
    .map(player => {
      let yellow = 0;
      let red = 0;

      for (let gw = 1; gw <= 38; gw++) {
        const picks = player.picksByGW?.[gw];
        const liveStats = liveDataByGW?.[gw];

        if (!picks || !liveStats) continue;

        picks.forEach(pick => {
          const stats = liveStats[pick.element];
          if (stats && pick.multiplier > 0 && stats.minutes > 0) {
            yellow += stats.yellow_cards || 0;
            red += stats.red_cards || 0;
          }
        });
      }

      const cardPoints = yellow + red * 3;

      return {
        name: player.name,
        score: cardPoints,
        value: cardPoints.toString(),
        context: {
          yellow,
          red
        }
      };
    });

  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}

// Calculates total bonus points earned from starting players.
// Context: player with the most bonus points and their total.
export function calculateMostBps(playerDataMap, liveDataByGW, playerNames) {
  const results = Object.values(playerDataMap)
    .filter(p => p && p.name && p.picksByGW)
    .map(player => {
      let totalBonus = 0;
      const bonusByPlayer = {};

      for (let gw = 1; gw <= 38; gw++) {
        const picks = player.picksByGW?.[gw];
        const liveStats = liveDataByGW?.[gw];

        if (!picks || !liveStats) continue;

        picks.forEach(pick => {
          const stats = liveStats[pick.element];
          if (stats && pick.multiplier > 0 && stats.minutes > 0) {
            const bonus = (stats.bonus || 0) * pick.multiplier;
            totalBonus += bonus;
            bonusByPlayer[pick.element] = (bonusByPlayer[pick.element] || 0) + bonus;
          }
        });
      }

      const [topPlayerId, bps] = Object.entries(bonusByPlayer).reduce(
        (a, b) => b[1] > a[1] ? b : a,
        [null, 0]
      );

      return {
        name: player.name,
        score: totalBonus,
        value: totalBonus.toString(),
        context: {
          player: playerNames?.[topPlayerId] || `#${topPlayerId}`,
          bps
        }
      };
    });

  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}

// Identifies the best-performing punt (under 5% ownership) in a single gameweek.
// Context: player name, GW it happened, and points scored.
export function calculateBestPunt(playerDataMap, liveDataByGW, ownershipMap, playerNames) {
  const punts = [];

  Object.values(playerDataMap)
    .filter(p => p && p.picksByGW && p.name)
    .forEach(player => {
      let bestPunt = { score: 0 };

      for (let gw = 1; gw <= 38; gw++) {
        const picks = player.picksByGW?.[gw];
        const liveStats = liveDataByGW?.[gw];
        if (!picks || !liveStats) continue;

        for (const pick of picks) {
          const stats = liveStats[pick.element];
          const ownership = ownershipMap[pick.element];

          if (ownership < 5 && stats && stats.minutes > 0 && pick.multiplier > 0) {
            const score = stats.total_points * pick.multiplier;

            if (score > bestPunt.score) {
              bestPunt = {
                name: player.name,
                score,
                value: `${score} pts`,
                gw,
                punt: playerNames[pick.element] || `Player ${pick.element}`,
                context: {
                  player: playerNames[pick.element] || `Player ${pick.element}`,
                  gw,
                  points: score
                }
              };
            }
          }
        }
      }

      if (bestPunt.score > 0) {
        punts.push(bestPunt);
      }
    });

  return punts.sort((a, b) => b.score - a.score).slice(0, 3);
}
