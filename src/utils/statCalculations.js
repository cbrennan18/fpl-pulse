// src/utils/statCalculations.js

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

// Calculates the total number of transfers made by each manager.
// Context: total number of transfers across all gameweeks.
export function calculateMostTransfers(data) {
  return Object.values(data)
    .filter(d => d && Array.isArray(d.history))
    .map(d => {
      const totalTransfers = d.history.reduce((s, g) => s + g.event_transfers, 0);
      return {
        name: d.name,
        score: totalTransfers,
        value: totalTransfers.toString(),
        context: {
          totalTransfers
        }
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Calculates total hit points from transfers (transfer costs) across the season.
// Context: worst hit GW with number of hits and points lost.
export function calculateMostHits(data) {
  return Object.values(data)
    .filter(d => d && Array.isArray(d.history))
    .map(d => {
      const totalCost = d.history.reduce((s, g) => s + g.event_transfers_cost, 0);

      const worstGW = d.history.reduce((acc, g) => {
        if (g.event_transfers_cost > acc.points) {
          return {
            gw: g.event,
            hits: Math.floor(g.event_transfers_cost / 4),
            points: g.event_transfers_cost
          };
        }
        return acc;
      }, { gw: null, hits: 0, points: 0 });

      return {
        name: d.name,
        score: totalCost,
        value: totalCost.toString(), // total points lost to hits across season
        context: {
          gw: worstGW.gw,
          hits: worstGW.hits,
          points: worstGW.points
        }
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Evaluates Wildcard chip performance.
// Context: gameweek and score of best and worst Wildcard plays.
export function calculateWildcards(data) {
  const results = Object.values(data)
    .filter(d => d && Array.isArray(d.history) && d.chipWeeks?.wildcard?.length)
    .map(d => {
      const scores = d.chipWeeks.wildcard.map(gw => {
        const gwData = d.history.find(g => g.event === gw);
        return { gw, points: gwData?.points || 0 };
      });

      if (!scores.length) return null;

      const best = scores.reduce((a, b) => (b.points > a.points ? b : a));
      const worst = scores.reduce((a, b) => (b.points < a.points ? b : a));

      return {
        name: d.name,
        best,
        worst
      };
    }).filter(Boolean);

  return {
    best: results
      .sort((a, b) => b.best.points - a.best.points)
      .slice(0, 3)
      .map(p => ({
        name: p.name,
        score: p.best.points,
        value: p.best.points.toString(),
        context: { gw: p.best.gw, points: p.best.points }
      })),
    worst: results
      .sort((a, b) => a.worst.points - b.worst.points)
      .slice(0, 3)
      .map(p => ({
        name: p.name,
        score: p.worst.points,
        value: p.worst.points.toString(),
        context: { gw: p.worst.gw, points: p.worst.points }
      }))
  };
}

// Calculates total points difference by not captaining Salah each week when he outscored the actual captain.
// Context: total times you got fancy and didn't captain Salah.
export function calculateNeverGetFancy(data, liveData, salahId, playerNames = {}) {
  return Object.values(data)
    .filter(player => player && player.captainHistory)
    .map(player => {
      let fancyWeeksCount = 0;
      let totalPointsDiff = 0;
      let weeksLostCount = 0;
      let worstLoss = 0;
      let worstGw = null;
      let worstPlayer = null;

      for (let gw = 1; gw <= 38; gw++) {
        const picks = player.picks[gw];
        if (!Array.isArray(picks)) {
          console.warn(`Missing picks for ${player.name} GW${gw}`);
          continue;
        }

        const actualCaptainPick = picks.find(pick => pick.multiplier === 2 || pick.multiplier === 3);
        if (!actualCaptainPick) {
          console.warn(`No captain multiplier for ${player.name} GW${gw} — assigning 0 diff`);
          continue; // This week doesn’t contribute to fancyWeeksCount or losses
        }

        const actualCapId = actualCaptainPick.element;
        const actualCapPts = liveData[gw]?.[actualCapId]?.total_points ?? 0;
        const salahPts = liveData[gw]?.[salahId]?.total_points ?? 0;

        const gotFancy = actualCapId !== salahId;

        if (gotFancy) {
          fancyWeeksCount++;

          const diff = actualCapPts - salahPts;
          totalPointsDiff += diff;

          if (diff < 0) {
            weeksLostCount++;
            const loss = -diff;
            if (loss > worstLoss) {
              worstLoss = loss;
              worstGw = gw;
              worstPlayer = playerNames[actualCapId] || `ID ${actualCapId}`;
            }
          }
        }
      }

      const result = {
        name: player.name,
        score: -totalPointsDiff,
        value: Math.round(totalPointsDiff),
        context: {
          fancyWeeksCount,
          totalPointsDiff: Math.round(totalPointsDiff),
          weeksLostCount,
          worstGw: worstGw ?? null,
          worstPlayer: worstPlayer ?? null,
          worstPointsLost: Math.round(worstLoss),
        }
      };

      return result;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Calculates total points left on the bench outside of Bench Boost weeks.
// Context: the worst single week of bench points wasted.
export function calculateBenchDisaster(data) {
  return Object.values(data)
    .filter(player => player && player.benchPoints && player.chipWeeks)
    .map(player => {
      const benchGW = player.chipWeeks.bench_boost || [];
      let totalBench = 0;
      let worstGW = { gw: null, points: 0 };

      for (let gw = 1; gw <= 38; gw++) {
        if (benchGW.includes(gw)) continue;

        const pts = player.benchPoints?.[gw] || 0;
        totalBench += pts;

        if (pts > worstGW.points) {
          worstGW = { gw, points: pts };
        }
      }

      return {
        name: player.name,
        score: totalBench,
        value: totalBench.toString(),
        context: {
          gw: worstGW.gw,
          points: worstGW.points
        }
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Calculates average time before deadline when transfers are made (in hours).
// Context: exact weekday and time of the earliest transfer made all season.
function formatTimeDiff(deadlineTime, transferTime) {
  const diffMs = deadlineTime - transferTime;
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${hours}h ${minutes}m before deadline`;
}
export function calculateEarlyBird(playerDataMap) {
  const deadlines = playerDataMap._meta?.deadlines || [];

  return Object.entries(playerDataMap)
    .filter(([k, p]) => k !== '_meta' && p && Array.isArray(p.transfers) && p.transfers.length > 0)
    .map(([entryId, player]) => {
      const times = player.transfers.map(t => {
        const deadlineObj = deadlines.find(d => d.event === t.event);
        if (!deadlineObj) return null;

        const deadlineTime = new Date(deadlineObj.deadline_time).getTime();
        const transferTime = new Date(t.time).getTime();

        return {
          hoursBeforeDeadline: (deadlineTime - transferTime) / (1000 * 60 * 60),
          deadlineTime,
          transferTime
        };
      }).filter(Boolean);

      if (times.length === 0) return null;

      const avg =
        times.reduce((sum, t) => sum + t.hoursBeforeDeadline, 0) / times.length;

      const earliest = times.reduce((a, b) =>
        (a.deadlineTime - a.transferTime) > (b.deadlineTime - b.transferTime) ? a : b
      );

      return {
        name: player.name,
        score: avg,
        value: avg.toFixed(1) + 'h',
        context: {
          earliestFormatted: formatTimeDiff(earliest.deadlineTime, earliest.transferTime)
        }
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Calculates average time before deadline when transfers are made (in hours).
// Context: exact weekday and time of the latest transfer made all season.
function formatHHMMSS(deadlineTime, transferTime) {
  const diffMs = deadlineTime - transferTime;
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s before deadline`;
}
export function calculateLateOwl(playerDataMap) {
  const deadlines = playerDataMap._meta?.deadlines || [];

  return Object.entries(playerDataMap)
    .filter(([k, p]) => k !== '_meta' && p && Array.isArray(p.transfers) && p.transfers.length > 0)
    .map(([entryId, player]) => {
      const times = player.transfers.map(t => {
        const deadlineObj = deadlines.find(d => d.event === t.event);
        if (!deadlineObj) return null;

        const deadlineTime = new Date(deadlineObj.deadline_time).getTime();
        const transferTime = new Date(t.time).getTime();

        return {
          hoursBeforeDeadline: (deadlineTime - transferTime) / (1000 * 60 * 60),
          deadlineTime,
          transferTime
        };
      }).filter(Boolean);

      if (times.length === 0) return null;

      const avg =
        times.reduce((sum, t) => sum + t.hoursBeforeDeadline, 0) / times.length;

      const latest = times.reduce((a, b) =>
        (a.deadlineTime - a.transferTime) < (b.deadlineTime - b.transferTime) ? a : b
      );

      return {
        name: player.name,
        score: avg,
        value: avg.toFixed(1) + 'h',
        context: {
          latestFormatted: formatHHMMSS(latest.deadlineTime, latest.transferTime)
        }
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
}

// Evaluates performance of Free Hit chips played by each manager.
// Context: GW and points for best and worst Free Hit usage.
export function calculateFreeHits(data) {
  const results = Object.values(data)
    .filter(player => player && player.chipWeeks?.freehit?.length > 0 && Array.isArray(player.history))
    .map(player => {
      const scores = player.chipWeeks.freehit.map(gw => {
        const gwData = player.history.find(g => g.event === gw);
        return { gw, points: gwData?.points || 0 };
      });

      const best = scores.reduce((a, b) => (b.points > a.points ? b : a));
      const worst = scores.reduce((a, b) => (b.points < a.points ? b : a));

      return {
        name: player.name,
        best,
        worst
      };
    });

  return {
    best: results
      .sort((a, b) => b.best.points - a.best.points)
      .slice(0, 3)
      .map(p => ({
        name: p.name,
        score: p.best.points,
        value: p.best.points.toString(),
        context: {
          gw: p.best.gw,
          points: p.best.points
        }
      })),
    worst: results
      .sort((a, b) => a.worst.points - b.worst.points)
      .slice(0, 3)
      .map(p => ({
        name: p.name,
        score: p.worst.points,
        value: p.worst.points.toString(),
        context: {
          gw: p.worst.gw,
          points: p.worst.points
        }
      }))
  };
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