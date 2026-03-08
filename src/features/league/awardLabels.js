// src/features/league/awardLabels.js

export function getAwardLabel(awardKey, data) {
  if (!data) return '';

  switch (awardKey) {
    case 'leagueLeaders':
      return `Lowest GW: ${data.lowScore} pts`;

    case 'oneHitWonders':
      return `GW${data.gw}`;

    case 'hotStreak':
      return data.start ? `GW${data.start}\u2013GW${data.end}` : '';

    case 'mostConsistent':
      return `GW${data.closestGw} \u00B7 stdev ${data.closestStdev.toFixed(2)}`;

    case 'bestWildcard':
    case 'worstWildcard':
      return `GW${data.gw} wildcard`;

    case 'bestFreeHit':
    case 'worstFreeHit':
      return `GW${data.gw} free hit`;

    case 'bestPunt':
      if (data.ownership != null) {
        return `${data.player} \u00B7 ${data.ownership}% \u00B7 GW${data.gw}`;
      }
      return `${data.player} \u00B7 GW${data.gw}`;

    case 'mostMinutes':
      return `${data.player} \u00B7 ${data.minutes} mins`;

    case 'mostBps':
      return `${data.player} \u00B7 ${data.bps} BPs`;

    case 'mostHits':
      return `GW${data.gw} \u00B7 ${data.points} pts on transfers`;

    case 'neverGetFancy':
      return `${data.fancyWeeksCount} weeks`;

    case 'benchDisaster':
      return `GW${data.gw} \u00B7 ${data.points} pts on bench`;

    case 'earlyBird':
      return data.earliestFormatted;

    case 'lateOwl':
      return data.latestFormatted;

    case 'mostCards':
      return `${data.yellow}Y \u00B7 ${data.red}R`;

    case 'biMonthly_1':
    case 'biMonthly_2':
    case 'biMonthly_3':
    case 'biMonthly_4':
    case 'biMonthly_5':
    case 'monthly_1':
    case 'monthly_2':
    case 'monthly_3':
    case 'monthly_4':
    case 'monthly_5':
    case 'monthly_6':
    case 'monthly_7':
    case 'monthly_8':
    case 'monthly_9':
    case 'monthly_10':
      return '';

    case 'oldDoll':
      return `${data.totalPoints} pts`;

    default:
      return `TBD`;
  }
}
