// /src/pulse/utils/pulseCalculations.js 
// main logic (calls per-page functions)

import { pulseTextTemplates } from './pulseTextTemplates';
import { calculateTop5Earned, calculateTop5Missed } from '../../../utils/scoringUtils';

// Main function: returns array of 9 pages
export function generatePulse(data) {
  const page3 = buildPage3_CaptaincyMVP(data);
  const page4 = buildPage4_Transfers(data);
  const page5 = buildPage5_TransfersHitsMisses(data);
  const page6 = buildPage6_Streaks(data);
  const page7 = buildPage7_PlayerLoyalty(data);
  const page8 = buildPage8_BenchAndChipFails(data);
  const page9 = buildPage9_Outro(data);
  const page10 = buildPage10_CTA(data);

  return [
    buildPage1_SeasonIntro(data),
    buildPage2_RankJourney(data),
    page3,
    page4,
    page5,
    page6,
    page7,
    page8,
    page9,
    page10
  ];
}

// === Page 1: Season Intro ===
function buildPage1_SeasonIntro(data) {
  const { managerInfo } = data;

  const totalPoints = managerInfo?.totalPoints || 0;
  const finalRank = managerInfo?.finalRank || 0;
  const teamName = managerInfo?.teamName || 'Your Team';

  const narrative = pulseTextTemplates.page1_intro({
    totalPoints,
    finalRank,
    teamName,
  });

  return {
    page: 1,
    title: "Your FPL Season 2024/25",
    stats: {
      totalPoints,
      finalRank,
      teamName,
    },
    narrative,
  };
}

// === Page 2: Rank Journey ===
function buildPage2_RankJourney(data) {
  const { entryHistory } = data;
  const ranks = entryHistory?.current?.map(e => e.overall_rank).filter(Boolean) || [];

  const peakRank = Math.min(...ranks);
  const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
  const variance = ranks.reduce((sum, r) => sum + (r - mean) ** 2, 0) / ranks.length;
  const stdDev = Math.round(Math.sqrt(variance));

  const narrative = pulseTextTemplates.page2_rankJourney({
    entryHistory,
  });

  return {
    page: 2,
    title: "Rank Journey",
    stats: {
      peakRank,
      stdDev
    },
    narrative,
  };
}

// === Page 3: Captaincy & MVP ===
function buildPage3_CaptaincyMVP(data) {
  const { picksByGW, liveDataByGW, bootstrap } = data;

  const playerNames = {};
  bootstrap.elements.forEach(el => {
    playerNames[el.id] = {
      full_name: `${el.first_name} ${el.second_name}`,
      web_name: el.web_name,
    };
  });

  // 1: Calculate top 5 MVPs
  const top5Earned = calculateTop5Earned(picksByGW, liveDataByGW, playerNames);

  // 2: Calculate top 5 Missed
  const top5Missed = calculateTop5Missed(picksByGW, liveDataByGW, playerNames);

  // 3: Wrapped narrative line
  const narrative = pulseTextTemplates.page3_captaincyMVP({
    top5Earned,
    top5Missed
  });

  return {
    page: 3,
    title: "Who You Built Around",
    stats: {
      top5Earned,
      top5Missed
    },
    narrative
  };
}

// === Page 4: Transfer Timing ===
function buildPage4_Transfers(data) {
  const { entryTransfers, bootstrap } = data;
  const deadlines = bootstrap?.events?.map(e => ({
    event: e.id,
    deadline_time: e.deadline_time
  })) || [];

  const transfers = entryTransfers || [];
  const times = transfers.map(t => {
    const deadlineObj = deadlines.find(d => d.event === t.event);
    if (!deadlineObj) return null;

    const deadlineTime = new Date(deadlineObj.deadline_time).getTime();
    const transferTime = new Date(t.time).getTime();

    return (deadlineTime - transferTime) / (1000 * 60 * 60); // hours before deadline
  }).filter(Boolean);

  const avgHours = times.length ? Math.round((times.reduce((sum, h) => sum + h, 0) / times.length) * 10) / 10 : null;

  let profile = null;
  if (avgHours !== null) {
    if (avgHours > 72) {
      profile = "Michael Edwards";
    } else if (avgHours > 24) {
      profile = "Tony Bloom";
    } else {
      profile = "Daniel Levy";
    }
  }

  const narrative = pulseTextTemplates.page4_transfers({
    profile
  });

  return {
    page: 4,
    title: "Working the Transfer Market",
    stats: {
      avgHoursBeforeDeadline: avgHours,
      profile
    },
    narrative
  };
}

// === Page 5: Transfer Hits and Misses ===
function buildPage5_TransfersHitsMisses(data) {
  const { playerPriceHistory, bootstrap, picksByGW, entryHistory, liveDataByGW, playerNames } = data;

  const freeHitWeeks = entryHistory?.chips
    ?.filter(c => c.name === "freehit")
    .map(c => c.event) || [];

  const playerStints = [];
  const activeStints = {};

  for (let gw = 1; gw <= 38; gw++) {
    const picks = picksByGW[gw] || [];
    const ownedIds = picks.map(p => p.element);

    let prevGw = gw - 1;
    while (freeHitWeeks.includes(prevGw) && prevGw > 0) {
      prevGw -= 1;
    }
    const prevPicks = picksByGW[prevGw] || [];
    const prevOwnedIds = prevPicks.map(p => p.element);

    ownedIds.forEach(playerId => {
      if (freeHitWeeks.includes(gw)) return;

      if (!prevOwnedIds.includes(playerId) && !activeStints[playerId]) {
        const gwPrice = playerPriceHistory?.[playerId]?.[gw] ?? null;
        const gwBank = entryHistory?.current.find(e => e.event === gw)?.bank / 10 || 0;

        activeStints[playerId] = {
          playerId,
          playerName: bootstrap.elements.find(p => p.id === playerId)?.web_name,
          gwIn: gw,
          gwOut: 38,
          weeksHeld: 1, 
          points: liveDataByGW[gw]?.[playerId]?.total_points || 0,
          priceAtGwIn: gwPrice,
          bankAtGwIn: gwBank,
        };
      } else if (activeStints[playerId]) {
        activeStints[playerId].weeksHeld += 1;
        const gwPoints = liveDataByGW[gw]?.[playerId]?.total_points || 0;
        activeStints[playerId].points += gwPoints;
      }
    });

    Object.keys(activeStints).forEach(playerId => {
      if (!ownedIds.includes(parseInt(playerId))) {
        activeStints[playerId].gwOut = gw - 1;
        playerStints.push({
          playerId: activeStints[playerId].playerId,
          playerName: activeStints[playerId].playerName,
          gwIn: activeStints[playerId].gwIn,
          gwOut: activeStints[playerId].gwOut,
          weeksHeld: activeStints[playerId].weeksHeld,
          points: activeStints[playerId].points,
          pointsPerWeek: (activeStints[playerId].points / activeStints[playerId].weeksHeld).toFixed(2),
          priceAtGwIn: activeStints[playerId].priceAtGwIn,
          bankAtGwIn: activeStints[playerId].bankAtGwIn,
        });
        delete activeStints[playerId];
      }
    });
  }

  Object.values(activeStints).forEach(stint => {
    playerStints.push({
      playerId: stint.playerId,
      playerName: stint.playerName,
      gwIn: stint.gwIn,
      gwOut: stint.gwOut,
      weeksHeld: stint.weeksHeld,
      points: stint.points,
      pointsPerWeek: (stint.points / stint.weeksHeld).toFixed(2),
      priceAtGwIn: stint.priceAtGwIn,
      bankAtGwIn: stint.bankAtGwIn,
    });
  });

  const playerSeasonData = bootstrap.elements.map(el => {
    const priceByGW = {};
    const pointsByGW = {};
    
    let prevPrice = null;
    
    for (let gw = 1; gw <= 38; gw++) {
      const currentPrice = playerPriceHistory?.[el.id]?.[gw] ?? prevPrice;
      priceByGW[gw] = currentPrice;
      prevPrice = currentPrice;
      
      pointsByGW[gw] = liveDataByGW[gw]?.[el.id]?.total_points ?? 0;
    }

    return {
      playerId: el.id,
      playerName: `${el.first_name} ${el.second_name}`,
      position: el.element_type,
      priceByGW,
      pointsByGW
    };
  });

  playerStints.forEach(stint => {
    const position = playerSeasonData.find(player => player.playerId === stint.playerId)?.position;
    const priceLimit = (stint.priceAtGwIn || 0) + (stint.bankAtGwIn || 0);

    const weeks = [];
    for (let gw = stint.gwIn; gw <= stint.gwOut; gw++) {
      weeks.push(gw);
    }

    const candidates = playerSeasonData
      .filter(player => player.position === position)
      .filter(player => player.playerId !== stint.playerId)
      .filter(player => {
        const priceAtGwIn = player.priceByGW[stint.gwIn];
        return priceAtGwIn !== null && priceAtGwIn <= priceLimit;
      });

    let bestAlt = null;

    candidates.forEach(player => {
      // Exclude weeks where this player was in another stint
      const weeksAvailable = weeks.filter(gw => {
        const stintOfThisPlayer = playerStints.find(
          stint2 =>
            stint2.playerId === player.playerId &&
            gw >= stint2.gwIn &&
            gw <= stint2.gwOut
        );
        return !stintOfThisPlayer;
      });

      const totalPts = weeksAvailable.reduce((sum, gw) => {
        return sum + (player.pointsByGW[gw] || 0);
      }, 0);

      if (!bestAlt || totalPts > bestAlt.points) {
        const pointsDiff = totalPts - stint.points;
        const ppwDiff = weeksAvailable.length > 0
          ? ((totalPts / weeksAvailable.length) - (stint.points / weeks.length)).toFixed(2)
          : 0;

        bestAlt = {
          playerId: player.playerId,
          playerName: player.playerName,
          priceAtGwIn: player.priceByGW[stint.gwIn],
          points: totalPts,
          pointsDiff,
          ppwDiff
        };
      }
    });

    stint.bestAlt = bestAlt;
  });

  const bestOverallAlt = playerStints
    .filter(stint => stint.bestAlt)
    .sort((a, b) => b.bestAlt.pointsDiff - a.bestAlt.pointsDiff)[0]?.bestAlt || null;

  const top5Stints = playerStints
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map(stint => ({
      playerId: stint.playerId,
      playerName: stint.playerName,
      gwIn: stint.gwIn,
      gwOut: stint.gwOut,
      weeksHeld: stint.weeksHeld,
      points: stint.points,
      pointsPerWeek: stint.pointsPerWeek,
      priceAtGwIn: stint.priceAtGwIn,
      bankAtGwIn: stint.bankAtGwIn
    }));

  const bestAltCombos = playerStints
    .filter(stint => stint.bestAlt)
    .sort((a, b) => b.bestAlt.pointsDiff - a.bestAlt.pointsDiff)
    .slice(0, 5);

  const bestPointsDiffStint = playerStints
    .filter(stint => stint.bestAlt)
    .sort((a, b) => b.bestAlt.pointsDiff - a.bestAlt.pointsDiff)[0] || null;

  const bestPpwDiffStint = playerStints
    .filter(stint => stint.bestAlt)
    .sort((a, b) => b.bestAlt.ppwDiff - a.bestAlt.ppwDiff)[0] || null;

  const narrative = pulseTextTemplates.page5_transfersHitsMisses({
    top5Stints,
    bestAltCombos,
    bestOverallAlt,
    bestPointsDiffStint,
    bestPpwDiffStint
  });

  return {
    page: 5,
    title: "Your Transfer Hits & Misses",
    stats: {
      top5Stints,
    },
    ...narrative
  };
}

// === Page 6: Hot and Cold Streaks ===
function calculateGreenRedStreaks(entryHistory) {
  const history = entryHistory?.current || [];
  if (!history.length) return {
    longestGreenStreak: null,
    longestRedStreak: null
  };

  let longestGreen = { length: 0 };
  let longestRed = { length: 0 };

  let currentGreen = { length: 0 };
  let currentRed = { length: 0 };

  let lastRank = null;

  history.forEach((g, idx) => {
    const rank = g.overall_rank ?? g.rank;
    if (typeof rank !== 'number') return;

    if (lastRank !== null) {
      if (rank < lastRank) {
        // Green arrow
        currentGreen.length++;
        if (currentGreen.length === 1) {
          currentGreen.startGW = history[idx - 1].event;
          currentGreen.startRank = lastRank;
        }
        currentGreen.endGW = g.event;
        currentGreen.endRank = rank;

        currentRed.length = 0;

        if (currentGreen.length > longestGreen.length) {
          longestGreen = { ...currentGreen };
        }
      } else if (rank > lastRank) {
        // Red arrow
        currentRed.length++;
        if (currentRed.length === 1) {
          currentRed.startGW = history[idx - 1].event;
          currentRed.startRank = lastRank;
        }
        currentRed.endGW = g.event;
        currentRed.endRank = rank;

        currentGreen.length = 0;

        if (currentRed.length > longestRed.length) {
          longestRed = { ...currentRed };
        }
      } else {
        // No change
        currentGreen.length = 0;
        currentRed.length = 0;
      }
    }

    lastRank = rank;
  });

  return {
    longestGreenStreak: longestGreen.length > 0 ? longestGreen : null,
    longestRedStreak: longestRed.length > 0 ? longestRed : null
  };
}
function buildPage6_Streaks(data) {
  const { entryHistory } = data;

  const { longestGreenStreak, longestRedStreak } = calculateGreenRedStreaks(entryHistory);

  const narrative = pulseTextTemplates.page6_streaks({
    longestGreenStreak,
    longestRedStreak
  });

  return {
    page: 6,
    title: "Hot & Cold Streaks",
    stats: {
      longestGreenStreak,
      longestRedStreak
    },
    narrative
  };
}

// === Page 7: Player Loyalty ===
function buildPage7_PlayerLoyalty(data) {
  const { picksByGW, liveDataByGW, entryTransfers, playerNames } = data;

  // 1 Most Weeks Owned
  const ownershipCounts = {};
  for (let gw = 1; gw <= 38; gw++) {
    const picks = picksByGW[gw] || [];
    picks.forEach(pick => {
      const pid = pick.element;
      ownershipCounts[pid] = (ownershipCounts[pid] || 0) + 1;
    });
  }

  const mostWeeksOwnedId = Object.keys(ownershipCounts)
    .sort((a, b) => ownershipCounts[b] - ownershipCounts[a])[0];

  const mostWeeksOwned = {
    playerId: parseInt(mostWeeksOwnedId),
    playerName: playerNames?.[mostWeeksOwnedId] || `Player ${mostWeeksOwnedId}`,
    weeksOwned: ownershipCounts[mostWeeksOwnedId] || 0
  };

  // 2 Most Weeks Benched
  const benchCounts = {};
  for (let gw = 1; gw <= 38; gw++) {
    const picks = picksByGW[gw] || [];
    picks.forEach(pick => {
      if (pick.multiplier === 0) {
        const pid = pick.element;
        benchCounts[pid] = (benchCounts[pid] || 0) + 1;
      }
    });
  }

  const mostWeeksBenchedId = Object.keys(benchCounts)
    .sort((a, b) => benchCounts[b] - benchCounts[a])[0];

  const mostWeeksBenched = mostWeeksBenchedId
    ? {
        playerId: parseInt(mostWeeksBenchedId),
        playerName: playerNames?.[mostWeeksBenchedId] || `Player ${mostWeeksBenchedId}`,
        weeksBenched: benchCounts[mostWeeksBenchedId] || 0
      }
    : null;

  // 3 Most Transferred In
  const transferInCounts = {};
  const transferHistoryByPlayer = {};

  entryTransfers?.forEach(t => {
    const pid = t.element_in;
    transferInCounts[pid] = (transferInCounts[pid] || 0) + 1;
    if (!transferHistoryByPlayer[pid]) {
      transferHistoryByPlayer[pid] = [];
    }
    transferHistoryByPlayer[pid].push(t.event); // record GW of transfer in
  });

  const mostTransferredInId = Object.keys(transferInCounts)
    .sort((a, b) => transferInCounts[b] - transferInCounts[a])[0];

  let totalPointsAfterIn = 0;
  let weeksPlayedAfterIn = 0;

  if (mostTransferredInId) {
    const gwsIn = transferHistoryByPlayer[mostTransferredInId] || [];
    gwsIn.forEach(gwIn => {
      for (let gw = gwIn; gw <= 38; gw++) {
        const picks = picksByGW[gw] || [];
        const owned = picks.some(pick => pick.element === parseInt(mostTransferredInId));
        if (owned) {
          totalPointsAfterIn += liveDataByGW[gw]?.[mostTransferredInId]?.total_points || 0;
          weeksPlayedAfterIn += 1;
        } else {
          break; // player no longer owned after transfer out
        }
      }
    });
  }

  const mostTransferredIn = mostTransferredInId
    ? {
        playerId: parseInt(mostTransferredInId),
        playerName: playerNames?.[mostTransferredInId] || `Player ${mostTransferredInId}`,
        timesTransferredIn: transferInCounts[mostTransferredInId] || 0,
        totalPointsAfterIn,
        weeksPlayedAfterIn,
        avgPointsPerWeek: weeksPlayedAfterIn > 0
          ? (totalPointsAfterIn / weeksPlayedAfterIn).toFixed(1)
          : "0.0"
      }
    : null;

  const narrative = pulseTextTemplates.page7_playerLoyalty({
    mostWeeksOwned,
    mostWeeksBenched,
    mostTransferredIn
  });

  return {
    page: 7,
    title: "Player Loyalty",
    stats: {
      mostWeeksOwned,
      mostWeeksBenched,
      mostTransferredIn
    },
    narrative,
  };
}

// === Page 8: Bench and Chip Fails ===
function buildPage8_BenchAndChipFails(data) {
  const { picksByGW, liveDataByGW, entryHistory } = data;

  const chipsUsed = entryHistory?.chips || [];

  // === TRIPLE CAPTAIN ===
  let tcWeek = null;
  let tcPoints = 0;
  const captainWeeks = [];

  for (let gw = 1; gw <= 38; gw++) {
    const picks = picksByGW[gw] || [];

    const tcPick = picks.find(pick => pick.multiplier === 3);
    const captainPick = picks.find(pick => pick.multiplier === 2);

    if (tcPick) {
      tcWeek = gw;
      tcPoints = (liveDataByGW[gw]?.[tcPick.element]?.total_points || 0) * 3;
    } else if (captainPick) {
      const capPoints = (liveDataByGW[gw]?.[captainPick.element]?.total_points || 0);
      captainWeeks.push({
        gw,
        capPoints,
        potentialTCPoints: capPoints * 3
      });
    }
  }

  const bestCaptainWeek = captainWeeks.sort((a, b) => b.potentialTCPoints - a.potentialTCPoints)[0] || null;
  const tcBetterWeeks = captainWeeks.filter(week => week.potentialTCPoints > tcPoints).length;

  const tcSummary = {
    tcUsed: tcWeek !== null,
    tcWeek,
    tcPoints,
    bestPossibleWeek: bestCaptainWeek?.gw || null,
    bestPossiblePoints: bestCaptainWeek?.potentialTCPoints || 0,
    betterWeeksThanPlayed: tcBetterWeeks
  };

  // === BENCH BOOST ===
  const bbChip = chipsUsed.find(chip => chip.name === "bboost");
  const bbWeek = bbChip?.event || null;
  const bbPoints = bbWeek
    ? (picksByGW[bbWeek]
        ?.filter(p => p.position >= 12)
        .reduce((sum, p) => {
          return sum + (liveDataByGW[bbWeek]?.[p.element]?.total_points || 0);
        }, 0))
    : 0;

  const benchWeeks = [];

  for (let gw = 1; gw <= 38; gw++) {
    if (gw === bbWeek) continue; // skip actual BB week
    const benchPts = (picksByGW[gw] || []).filter(p => p.multiplier === 0).reduce((sum, p) => {
      return sum + (liveDataByGW[gw]?.[p.element]?.total_points || 0);
    }, 0);
    benchWeeks.push({ gw, benchPoints: benchPts });
  }

  const bestBenchWeek = benchWeeks.sort((a, b) => b.benchPoints - a.benchPoints)[0] || null;
  const bbBetterWeeks = benchWeeks.filter(week => week.benchPoints > bbPoints).length;

  const bbSummary = {
    bbUsed: bbWeek !== null,
    bbWeek,
    bbPoints,
    bestPossibleWeek: bestBenchWeek?.gw || null,
    bestPossiblePoints: bestBenchWeek?.benchPoints || 0,
    betterWeeksThanPlayed: bbBetterWeeks
  };

  const narrative = pulseTextTemplates.page8_benchAndChipFails({
    tcSummary,
    bbSummary
  });

  // === RETURN FULL PAGE ===
  return {
    page: 8,
    title: "Benching & Chip Fails",
    stats: {
      tcSummary,
      bbSummary
    },
    narrative,
  };
}

// === Page 9: Team of the Year ===
function buildPage9_Outro(data) {
  const { picksByGW, liveDataByGW, playerNames, bootstrap } = data;

  const playerMap = {};
  const playerDisplayName = {};
  const playerPositions = {};

  bootstrap.elements.forEach(el => {
    playerMap[el.id] = `${el.first_name} ${el.second_name}`;
    playerDisplayName[el.id] = el.web_name || el.second_name;
    playerPositions[el.id] = el.element_type;
  });

  const playerSummary = {};

  for (let gw = 1; gw <= 38; gw++) {
    const picks = picksByGW[gw] || [];
    picks.forEach(pick => {
      const pid = pick.element;
      if (!playerSummary[pid]) {
        playerSummary[pid] = {
          playerId: pid,
          playerName: playerNames?.[pid] || playerMap[pid] || `Player ${pid}`,
          displayName: playerDisplayName[pid] || `Player ${pid}`,
          position: playerPositions[pid] || 1,
          totalPoints: 0,
          caps: 0,
          weeksOwned: 0,
          weeksBenched: 0
        };
      }

      playerSummary[pid].weeksOwned += 1;

      const gwPoints = liveDataByGW[gw]?.[pid]?.total_points || 0;

      // Captain points double
      if (pick.multiplier >= 2) {
        playerSummary[pid].totalPoints += gwPoints * 2;
        playerSummary[pid].caps += 1;
      } else {
        playerSummary[pid].totalPoints += gwPoints;
      }

      if (pick.multiplier === 0) {
        playerSummary[pid].weeksBenched += 1;
      }
    });
  }

  const players = Object.values(playerSummary).map(p => ({
    ...p,
    avgPointsPerWeek: p.weeksOwned > 0 ? (p.totalPoints / p.weeksOwned).toFixed(1) : "0.0"
  }));

  // Sort by total points then avgPts
  players.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return b.avgPointsPerWeek - a.avgPointsPerWeek;
  });

  // === Formation helper ===
  const formations = [
    [3,5,2],
    [3,4,3],
    [4,4,2],
    [4,5,1],
    [5,4,1],
    [4,3,3],
    [5,3,2],
  ];

  const buildTeamXI = (formation) => {
    const [defCount, midCount, fwdCount] = formation;
    const gk = players.filter(p => p.position === 1).slice(0,1);
    const def = players.filter(p => p.position === 2).slice(0,defCount);
    const mid = players.filter(p => p.position === 3).slice(0,midCount);
    const fwd = players.filter(p => p.position === 4).slice(0,fwdCount);
    return [...gk, ...def, ...mid, ...fwd];
  };

  let teamXI = [];
  for (const formation of formations) {
    const attempt = buildTeamXI(formation);
    if (attempt.length === 11) {
      teamXI = attempt;
      break;
    }
  }

  // === Narrative lines ===
  const talisman = players[0] || null;
  const unsungHero = players.find(p => p !== talisman && p.weeksOwned >= 10 && p.avgPointsPerWeek >= 5) || null;
  const benchFlop = players.find(p => p.weeksOwned >= 8 && p.totalPoints < 60 && p.avgPointsPerWeek < 5) || null;

  const narrative = pulseTextTemplates.page9_outro({
    talisman,
    unsungHero,
    benchFlop
  });

  return {
    page: 9,
    title: "Team of the Year",
    stats: {
      teamXI
    },
    narrative
  };
}

// === Page 10: CTA ===
function buildPage10_CTA(data) {
  const narrative = pulseTextTemplates.page10_CTA();

  return {
    page: 10,
    title: "See You Next Season?",
    narrative
  };
}
