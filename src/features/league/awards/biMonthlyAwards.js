// Bi-monthly prize calculation using FPL's official phases from bootstrap.

// Pair adjacent monthly phases into 5 bi-monthly windows.
// FPL phases array: [Overall, August, September, October, November, December,
//                    January, February, March, April, May]
// We pair indices: Aug(1)+Sep(2), Oct(3)+Nov(4), Dec(5)+Jan(6), Feb(7)+Mar(8), Apr(9)+May(10)
const BI_MONTHLY_PAIRS = [
  { phaseIndices: [1, 2], label: 'Aug\u2013Sep' },
  { phaseIndices: [3, 4], label: 'Oct\u2013Nov' },
  { phaseIndices: [5, 6], label: 'Dec\u2013Jan' },
  { phaseIndices: [7, 8], label: 'Feb\u2013Mar' },
  { phaseIndices: [9, 10], label: 'Apr\u2013May' },
];

/**
 * Determine period status: 'final' if all GWs finished, 'live' if partially,
 * 'upcoming' if none have started.
 */
function getPeriodStatus(gwsInWindow, finishedGwIds) {
  const finished = new Set(finishedGwIds);
  const finishedInWindow = gwsInWindow.filter(gw => finished.has(gw));
  if (finishedInWindow.length === 0) return 'upcoming';
  if (finishedInWindow.length === gwsInWindow.length) return 'final';
  return 'live';
}

/**
 * Calculate bi-monthly prize winners using FPL bootstrap phases.
 *
 * @param {Object} playerData - keyed by entryId, each with { name, history[] }
 * @param {Array} phases - bootstrap.phases: [{ id, name, start_event, stop_event }]
 * @param {Array} finishedGwIds - array of finished GW numbers (from bootstrap events)
 * @returns {{ awards: Object, meta: Object }}
 *   awards: { biMonthly_1: [...], ..., biMonthly_5: [...] }
 *   meta: { biMonthly_1: { label, gwRange, status, startGw }, ... }
 */
export function calculateBiMonthlyPrizes(playerData, phases, finishedGwIds = []) {
  if (!phases || phases.length < 11) return { awards: {}, meta: {} };

  const awards = {};
  const meta = {};

  BI_MONTHLY_PAIRS.forEach((pair, idx) => {
    const key = `biMonthly_${idx + 1}`;
    const gwsInWindow = [];
    for (const phaseIdx of pair.phaseIndices) {
      const phase = phases[phaseIdx];
      if (!phase) continue;
      for (let gw = phase.start_event; gw <= phase.stop_event; gw++) {
        gwsInWindow.push(gw);
      }
    }
    gwsInWindow.sort((a, b) => a - b);

    if (gwsInWindow.length === 0) {
      awards[key] = [];
      meta[key] = { label: pair.label, gwRange: '', status: 'upcoming', startGw: null };
      return;
    }

    const gwRange = `GW${gwsInWindow[0]}\u2013GW${gwsInWindow[gwsInWindow.length - 1]}`;
    const status = getPeriodStatus(gwsInWindow, finishedGwIds);

    meta[key] = {
      label: pair.label,
      gwRange,
      status,
      startGw: gwsInWindow[0],
    };

    const entries = [];
    for (const [entryId, data] of Object.entries(playerData)) {
      if (entryId === '_meta') continue;

      let total = 0;
      for (const gw of gwsInWindow) {
        const gwEntry = data.history.find(h => h.event === gw);
        if (gwEntry) total += gwEntry.points - (gwEntry.event_transfers_cost || 0);
      }

      entries.push({
        name: data.name,
        score: total,
        value: `${total} pts`,
        context: { period: pair.label, gwRange },
      });
    }

    entries.sort((a, b) => b.score - a.score);
    awards[key] = entries;
  });

  return { awards, meta };
}
