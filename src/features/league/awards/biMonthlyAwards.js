// Prize calculation using FPL's official phases from bootstrap.

// FPL phases array: [Overall, August, September, October, November, December,
//                    January, February, March, April, May]
// Bi-monthly: pair adjacent months. Monthly: each month standalone.
const BI_MONTHLY_PAIRS = [
  { phaseIndices: [1, 2], label: 'Aug\u2013Sep' },
  { phaseIndices: [3, 4], label: 'Oct\u2013Nov' },
  { phaseIndices: [5, 6], label: 'Dec\u2013Jan' },
  { phaseIndices: [7, 8], label: 'Feb\u2013Mar' },
  { phaseIndices: [9, 10], label: 'Apr\u2013May' },
];

const MONTHLY_PHASES = [
  { phaseIndex: 1, label: 'August' },
  { phaseIndex: 2, label: 'September' },
  { phaseIndex: 3, label: 'October' },
  { phaseIndex: 4, label: 'November' },
  { phaseIndex: 5, label: 'December' },
  { phaseIndex: 6, label: 'January' },
  { phaseIndex: 7, label: 'February' },
  { phaseIndex: 8, label: 'March' },
  { phaseIndex: 9, label: 'April' },
  { phaseIndex: 10, label: 'May' },
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
 * Score each player across a GW window and return sorted entries.
 */
function scorePeriod(playerData, gwsInWindow, periodLabel, gwRange) {
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
      context: { period: periodLabel, gwRange },
    });
  }

  entries.sort((a, b) => b.score - a.score);
  return entries;
}

/**
 * Resolve GWs from phase indices and return sorted array.
 */
function resolveGws(phases, phaseIndices) {
  const gws = [];
  for (const idx of phaseIndices) {
    const phase = phases[idx];
    if (!phase) continue;
    for (let gw = phase.start_event; gw <= phase.stop_event; gw++) {
      gws.push(gw);
    }
  }
  gws.sort((a, b) => a - b);
  return gws;
}

/**
 * Calculate bi-monthly prize winners using FPL bootstrap phases.
 */
export function calculateBiMonthlyPrizes(playerData, phases, finishedGwIds = []) {
  if (!phases || phases.length < 11) return { awards: {}, meta: {} };

  const awards = {};
  const meta = {};

  BI_MONTHLY_PAIRS.forEach((pair, idx) => {
    const key = `biMonthly_${idx + 1}`;
    const gwsInWindow = resolveGws(phases, pair.phaseIndices);

    if (gwsInWindow.length === 0) {
      awards[key] = [];
      meta[key] = { label: pair.label, gwRange: '', status: 'upcoming', startGw: null };
      return;
    }

    const gwRange = `GW${gwsInWindow[0]}\u2013GW${gwsInWindow[gwsInWindow.length - 1]}`;
    const status = getPeriodStatus(gwsInWindow, finishedGwIds);

    meta[key] = { label: pair.label, gwRange, status, startGw: gwsInWindow[0] };
    awards[key] = scorePeriod(playerData, gwsInWindow, pair.label, gwRange);
  });

  return { awards, meta };
}

/**
 * Calculate monthly prize winners — one prize per calendar month.
 */
export function calculateMonthlyPrizes(playerData, phases, finishedGwIds = []) {
  if (!phases || phases.length < 11) return { awards: {}, meta: {} };

  const awards = {};
  const meta = {};

  MONTHLY_PHASES.forEach((month, idx) => {
    const key = `monthly_${idx + 1}`;
    const gwsInWindow = resolveGws(phases, [month.phaseIndex]);

    if (gwsInWindow.length === 0) {
      awards[key] = [];
      meta[key] = { label: month.label, gwRange: '', status: 'upcoming', startGw: null };
      return;
    }

    const gwRange = `GW${gwsInWindow[0]}\u2013GW${gwsInWindow[gwsInWindow.length - 1]}`;
    const status = getPeriodStatus(gwsInWindow, finishedGwIds);

    meta[key] = { label: month.label, gwRange, status, startGw: gwsInWindow[0] };
    awards[key] = scorePeriod(playerData, gwsInWindow, month.label, gwRange);
  });

  return { awards, meta };
}
