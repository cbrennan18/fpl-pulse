// src/utils/awardContext.js

export function getAwardContext(awardKey, data) {
  if (!data) return '';

  switch (awardKey) {
    case 'leagueLeaders':
      return `Lowest GW Score: ${data.lowScore} pts`;

    case 'oneHitWonders':
      return `Gameweek ${data.gw}`;

    case 'hotStreak':
      return `GW${data.start} to GW${data.end}`;

    case 'mostConsistent':
      return `GW${data.closestGw}: closest to avg stdev (${data.closestStdev.toFixed(2)})`;

    case 'bestWildcard':
    case 'worstWildcard':
      return `Wildcard in GW${data.gw}`;

    case 'bestFreeHit':
    case 'worstFreeHit':
      return `Free Hit in GW${data.gw}`;

    case 'bestPunt':
      return `${data.player} in GW${data.gw}`;

    case 'mostMinutes':
      return `${data.player} – ${data.minutes} mins`;

    case 'mostBps':
      return `${data.player} – ${data.bps} BPs`;

    case 'mostHits':
      return `GW${data.gw}: ${data.points} pts on transfers`;

    case 'neverGetFancy':
      return `You got fancy ${data.fancyWeeksCount} times`;

    case 'benchDisaster':
      return `GW${data.gw} – ${data.points} pts on bench`;

    case 'earlyBird':
      return `Earliest transfer: ${data.earliestFormatted}`;

    case 'lateOwl':
      return `Latest transfer: ${data.latestFormatted}`;

    case 'mostCards':
      return `${data.yellow}Y / ${data.red}R cards total`;

    default:
      return `TBD`;
  }
}
