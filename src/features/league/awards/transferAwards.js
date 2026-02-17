// Transfer and timing award calculations

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
        value: totalCost.toString(),
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
          continue;
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

function formatTimeDiff(deadlineTime, transferTime) {
  const diffMs = deadlineTime - transferTime;
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${hours}h ${minutes}m before deadline`;
}

// Calculates average time before deadline when transfers are made (in hours).
// Context: exact weekday and time of the earliest transfer made all season.
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

function formatHHMMSS(deadlineTime, transferTime) {
  const diffMs = deadlineTime - transferTime;
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s before deadline`;
}

// Calculates average time before deadline when transfers are made (in hours).
// Context: exact weekday and time of the latest transfer made all season.
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
