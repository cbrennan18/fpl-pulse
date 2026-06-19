// features/pulse/wrapped/calc/captain.js
//
// Beat 2 — "Captain" calc. Pure functions over the once-fetched pack (mirrors
// setAndForget.js: data in, numbers out, NO fetching).
//
// The question (story-arc beat 2): how good were your armband calls vs your
// league? Two things are measured, deliberately kept apart:
//
//   1. ACCURACY (the stat row) — how often your realised captain WAS your XI's
//      top scorer ("nailed it"). Best-XI-scorer is the yardstick here ONLY.
//   2. The CHART (3 cumulative lines) — your actual captain points, the league
//      WINNER's, and "you if you'd always picked the better of your own C & VC".
//      The C-vs-VC gap is the verdict: the one binary you actually made. We do
//      NOT chart the best-XI ceiling — crediting a player you'd never have
//      armbanded is hindsight, not judgment (spec, beat 2).
//
// Captain/vice identity is read EXPLICITLY from is_captain / is_vice (not
// inferred from multiplier). Triple Captain (captain pick multiplier === 3, or
// active_chip '3xc') applies a ×3 armband that week. Autosub rule mirrors
// setAndForget: if the captain blanked (0 mins) the vice inherits the armband.
//
// Per-player-per-GW points+minutes come from seasonElements (the season-wide
// table), indexed once via buildGwPointsIndex — reused from setAndForget (DRY).

import { buildGwPointsIndex, memberName } from './setAndForget';

function picksForGw(blob, gw) {
  return blob?.picks_by_gw?.[gw] ?? blob?.picks_by_gw?.[String(gw)];
}

/**
 * Score one manager's captaincy across all finished GWs.
 * @returns {{
 *   perGw: Array<{gw,actualReturn,bestCvcReturn,counted,nailed,viceBeat}>,
 *   actualCum: number[], cvcCum: number[],
 *   actualTotal: number, cvcTotal: number, cvcGap: number,
 *   nailed: number, denom: number, accuracy: number, viceWins: number,
 *   peakIndex: number, seasonTotal: number
 * }}
 */
export function scoreCaptaincy(blob, gwIndex, finishedGwIds) {
  const perGw = [];
  const actualCum = [];
  const cvcCum = [];
  let actualTotal = 0;
  let cvcTotal = 0;
  let nailed = 0;
  let denom = 0;
  let viceWins = 0;
  let peakIndex = 0;
  let peakReturn = -Infinity;

  finishedGwIds.forEach((gw, i) => {
    const map = gwIndex[gw];
    const statOf = (id) => (map && map.get(id)) || { points: 0, minutes: 0 };
    const pg = picksForGw(blob, gw);
    const picks = pg?.picks || [];

    let actualReturn = 0;
    let bestCvcReturn = 0;
    let counted = false;
    let nailedThis = false;
    let viceBeat = false;

    if (picks.length > 0) {
      const captainId = picks.find((p) => p.is_captain)?.element;
      const viceId = picks.find((p) => p.is_vice)?.element;
      const captainPick = picks.find((p) => p.is_captain);
      const mult = captainPick?.multiplier === 3 || pg?.active_chip === '3xc' ? 3 : 2;

      const capStat = statOf(captainId);
      const viceStat = statOf(viceId);

      // Realised armband base (autosub-aware): captain if they played, else the
      // vice if THEY played, else nobody (blank).
      const realisedCapBase =
        capStat.minutes > 0 ? capStat.points : viceStat.minutes > 0 ? viceStat.points : 0;

      // Best of C/VC as they actually performed — the achievable what-if.
      const bestCvcBase = Math.max(capStat.points, viceStat.points);

      actualReturn = realisedCapBase * mult;
      bestCvcReturn = bestCvcBase * mult;
      viceBeat = bestCvcBase > realisedCapBase;
      if (viceBeat) viceWins += 1;

      // Accuracy: best scorer in the STARTING XI (position <= 11). Only weeks
      // where the XI actually scored count toward the denominator, so an
      // early/blank-heavy member can't inflate accuracy off a tiny base.
      const xi = picks.filter((p) => p.position <= 11);
      const bestXiBase = xi.reduce((m, p) => Math.max(m, statOf(p.element).points), -Infinity);
      if (bestXiBase > 0) {
        counted = true;
        denom += 1;
        if (realisedCapBase === bestXiBase) {
          nailed += 1;
          nailedThis = true;
        }
      }
    }

    actualTotal += actualReturn;
    cvcTotal += bestCvcReturn;
    actualCum.push(actualTotal);
    cvcCum.push(cvcTotal);
    if (actualReturn > peakReturn) {
      peakReturn = actualReturn;
      peakIndex = i;
    }
    perGw.push({ gw, actualReturn, bestCvcReturn, counted, nailed: nailedThis, viceBeat });
  });

  const lastGw = finishedGwIds.length ? Math.max(...finishedGwIds) : 0;
  const summary = blob?.gw_summaries?.[lastGw] ?? blob?.gw_summaries?.[String(lastGw)];

  return {
    perGw,
    actualCum,
    cvcCum,
    actualTotal,
    cvcTotal,
    cvcGap: cvcTotal - actualTotal,
    nailed,
    denom,
    accuracy: denom > 0 ? nailed / denom : 0,
    viceWins,
    peakIndex,
    seasonTotal: Number(summary?.total ?? 0),
  };
}

/**
 * Compute the full Beat 2 dataset for a league.
 * @returns {{
 *   you: object|null, winner: object|null, bestPicker: object|null,
 *   leagueAvgAccuracy: number,
 *   chart: { gws:number[], youActual:number[], youCvc:number[], winnerActual:number[], peakIndex:number },
 *   count: number
 * }}
 */
export function computeCaptain({ entries, members, you, seasonElements, finishedGwIds }) {
  const gwIndex = buildGwPointsIndex(seasonElements, finishedGwIds);

  const rows = members
    .map((id) => {
      const blob = entries[id];
      if (!blob) return null;
      const s = scoreCaptaincy(blob, gwIndex, finishedGwIds);
      return { entryId: id, name: memberName(blob, id), isYou: id === you, ...s };
    })
    .filter(Boolean);

  if (rows.length === 0) {
    return {
      you: null, winner: null, bestPicker: null, leagueAvgAccuracy: 0,
      chart: { gws: [], youActual: [], youCvc: [], winnerActual: [], peakIndex: 0 },
      count: 0,
    };
  }

  const youRow = rows.find((r) => r.isYou) || null;

  // Winner = top season points (mirrors setAndForget's actualTotal source).
  const winner = [...rows].sort(
    (a, b) => b.seasonTotal - a.seasonTotal || a.entryId - b.entryId
  )[0];

  // Best captain-picker = highest accuracy, but only among members with a
  // meaningful denominator (>= half the finished GWs) so a one-good-week member
  // can't be crowned on a tiny base. Tie-break by actual captain points.
  const minDenom = Math.ceil(finishedGwIds.length / 2);
  const eligible = rows.filter((r) => r.denom >= minDenom);
  const pickPool = eligible.length > 0 ? eligible : rows;
  const bestPicker = [...pickPool].sort(
    (a, b) => b.accuracy - a.accuracy || b.actualTotal - a.actualTotal || a.entryId - b.entryId
  )[0];

  const scored = rows.filter((r) => r.denom > 0);
  const leagueAvgAccuracy = scored.length
    ? scored.reduce((sum, r) => sum + r.accuracy, 0) / scored.length
    : 0;

  return {
    you: youRow,
    winner,
    bestPicker,
    leagueAvgAccuracy,
    chart: {
      gws: finishedGwIds,
      youActual: youRow?.actualCum ?? [],
      youCvc: youRow?.cvcCum ?? [],
      winnerActual: winner?.actualCum ?? [],
      peakIndex: youRow?.peakIndex ?? 0,
    },
    count: rows.length,
  };
}

export function pct(accuracy) {
  return Math.round(accuracy * 100);
}

// Dry, both directions, punches at the decision (the C-vs-VC call), never the
// person. The cvcGap is always >= 0 (best-of-C/VC can't trail your realised pick).
export function buildVerdict(youRow) {
  if (!youRow) return '';
  const { cvcGap, viceWins } = youRow;
  if (cvcGap > 0) {
    return `Backing your vice the weeks they beat your captain would've added ${cvcGap} — they outscored your armband ${viceWins} time${viceWins === 1 ? '' : 's'}.`;
  }
  return 'You never left a vice-captain point behind — every armband beat your vice.';
}
