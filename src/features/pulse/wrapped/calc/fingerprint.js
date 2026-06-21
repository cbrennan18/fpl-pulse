// features/pulse/wrapped/calc/fingerprint.js
//
// Beat 5 — "Your Fingerprint" calc. Pure functions over the once-fetched pack
// (mirrors setAndForget.js / captain.js: data in, numbers out, NO fetching).
//
// The question (story-arc beat 5): where in your squad are you winning and losing
// the league? We attribute every manager's season points to the four positions
// (GK/DEF/MID/FWD), then diagnose the position you rank WORST in relative to your
// overall standing — the weak link — surfaced league-relatively ("12th of 15").
//
// METRIC PINS (applied IDENTICALLY to every member — this is a relative compare):
//   • Which points count → AUTOSUB-AWARE effective XI. Each GW we take the actual
//     fielded XI; a blanked starter (0 mins) is replaced by the first eligible
//     bench sub using the SAME rule as setAndForget (findBenchSub, reused/DRY).
//     Points are attributed to the position of the player who actually earned them
//     (a DEF blanks, a MID autosubs in → the points land in MID; the defence
//     genuinely produced nothing that week).
//   • Captain multiplier → EXCLUDED. Each player contributes BASE points only; the
//     armband is a captaincy decision (beat 2), not a positional one. (So the four
//     position totals deliberately do NOT sum to the official FPL total.)
//
// THE SPEC-PINNED SPLIT (kept separate, never unified):
//   • the CHART shows % of points by position (share).
//   • the RANKING / DIAGNOSIS uses RAW points per position (raw supports the "this
//     is costing you the league" verdict; share would muddy it — spec beat 5).
//
// Per-player-per-GW points+minutes come from seasonElements via buildGwPointsIndex,
// reused from setAndForget (DRY) alongside memberName / ordinal / findBenchSub.

import {
  buildGwPointsIndex,
  memberName,
  ordinal,
  findBenchSub,
} from './setAndForget';

export const POSITION_IDS = [1, 2, 3, 4];
export const POSITION_LABELS = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

// What gap (positionRank − overallRank) counts as a real weak link. Scales with
// league size N so a tiny league doesn't fire on noise: max(2, ceil(N*0.2)).
// Below the gap → BALANCED (no position diverges enough; balance is a trait).
export function weakLinkMinGap(n) {
  return Math.max(2, Math.ceil(n * 0.2));
}

function picksForGw(blob, gw) {
  return blob?.picks_by_gw?.[gw] ?? blob?.picks_by_gw?.[String(gw)];
}

/**
 * Attribute one manager's season points to the four positions (autosub-aware,
 * captain multiplier EXCLUDED — base points only).
 * @returns {{ raw: {1:number,2:number,3:number,4:number}, total: number }}
 */
export function scorePositions(blob, gwIndex, finishedGwIds, positionOf) {
  const raw = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (const gw of finishedGwIds) {
    const map = gwIndex[gw];
    if (!map) continue;
    const statOf = (id) => map.get(id) || { points: 0, minutes: 0 };

    const picks = picksForGw(blob, gw)?.picks || [];
    if (picks.length === 0) continue;

    const starters = picks.filter((p) => p.position <= 11);
    const bench = picks
      .filter((p) => p.position >= 12)
      .sort((a, b) => a.position - b.position);

    const used = new Set();
    for (const starter of starters) {
      const starterStat = statOf(starter.element);
      if (starterStat.minutes > 0) {
        const pos = positionOf(starter.element);
        if (raw[pos] !== undefined) raw[pos] += starterStat.points;
        continue;
      }
      // blanked starter → first eligible bench sub (same rule as setAndForget).
      const sub = findBenchSub(starter, bench, used, statOf, positionOf);
      if (sub) {
        used.add(sub.element);
        const pos = positionOf(sub.element);
        if (raw[pos] !== undefined) raw[pos] += statOf(sub.element).points;
      }
      // no eligible sub → that slot contributes 0 (nothing added).
    }
  }

  const total = raw[1] + raw[2] + raw[3] + raw[4];
  return { raw, total };
}

// Rank rows by keyFn (descending = best first), stable entryId tie-break.
// Returns a Map<entryId, rank(1-based)>.
function rankMap(rows, keyFn) {
  const sorted = [...rows].sort((a, b) => keyFn(b) - keyFn(a) || a.entryId - b.entryId);
  const m = new Map();
  sorted.forEach((r, i) => m.set(r.entryId, i + 1));
  return m;
}

const shareOf = (row, p) => (row.total > 0 ? row.raw[p] / row.total : 0);

/**
 * Compute the full Beat 5 dataset for a league.
 * @returns {{
 *   you: object|null, winner: object|null, count: number,
 *   chart: { positions: Array<{key,label,you,avg,winner}> },
 *   diagnosis: {
 *     overallRank: number,
 *     perPosition: Array<{key,label,rank,points,gap}>,
 *     weakest: object, strongest: object,
 *     isBalanced: boolean, balanceRank: number
 *   } | null
 * }}
 */
export function computeFingerprint({
  entries,
  members,
  you,
  seasonElements,
  finishedGwIds,
  playerPosition,
}) {
  const gwIndex = buildGwPointsIndex(seasonElements, finishedGwIds);
  const lastGw = finishedGwIds.length ? Math.max(...finishedGwIds) : 0;

  const rows = members
    .map((id) => {
      const blob = entries[id];
      if (!blob) return null;
      const { raw, total } = scorePositions(blob, gwIndex, finishedGwIds, playerPosition);
      const summary = blob?.gw_summaries?.[lastGw] ?? blob?.gw_summaries?.[String(lastGw)];
      return {
        entryId: id,
        name: memberName(blob, id),
        isYou: id === you,
        raw,
        total,
        seasonTotal: Number(summary?.total ?? 0),
      };
    })
    .filter(Boolean);

  const youRow = rows.find((r) => r.isYou) || null;
  const winner = rows.length
    ? [...rows].sort((a, b) => b.seasonTotal - a.seasonTotal || a.entryId - b.entryId)[0]
    : null;

  // CHART — share of points by position (you / league avg / winner).
  const positions = POSITION_IDS.map((p) => {
    const avg = rows.length
      ? rows.reduce((sum, r) => sum + shareOf(r, p), 0) / rows.length
      : 0;
    return {
      key: POSITION_LABELS[p],
      label: POSITION_LABELS[p],
      you: youRow ? shareOf(youRow, p) : 0,
      avg,
      winner: winner ? shareOf(winner, p) : 0,
    };
  });

  if (!youRow || rows.length === 0) {
    return { you: youRow, winner, count: rows.length, chart: { positions }, diagnosis: null };
  }

  // DIAGNOSIS — RAW points per position → league rankings.
  const overallRanks = rankMap(rows, (r) => r.seasonTotal);
  const overallRank = overallRanks.get(youRow.entryId);

  const posRanks = {};
  POSITION_IDS.forEach((p) => {
    posRanks[p] = rankMap(rows, (r) => r.raw[p]);
  });

  const perPosition = POSITION_IDS.map((p) => {
    const rank = posRanks[p].get(youRow.entryId);
    return {
      key: POSITION_LABELS[p],
      label: POSITION_LABELS[p],
      rank,
      points: youRow.raw[p],
      gap: rank - overallRank, // positive = you rank worse here than overall
    };
  });

  // Weakest = worst rank relative to overall; strongest = best. First-on-tie keeps
  // it deterministic (GK→DEF→MID→FWD order).
  const weakest = perPosition.reduce((w, c) => (c.gap > w.gap ? c : w));
  const strongest = perPosition.reduce((s, c) => (c.gap < s.gap ? c : s));
  const isBalanced = weakest.gap < weakLinkMinGap(rows.length);

  // Balance comparison-set: rank members by how tightly their four position-ranks
  // cluster (smaller spread = more balanced) so the balanced verdict stays
  // league-relative ("Nth-most balanced of N").
  const spreadOf = (id) => {
    const ranks = POSITION_IDS.map((p) => posRanks[p].get(id));
    return Math.max(...ranks) - Math.min(...ranks);
  };
  const balanceSorted = [...rows].sort(
    (a, b) => spreadOf(a.entryId) - spreadOf(b.entryId) || a.entryId - b.entryId
  );
  const balanceRank = balanceSorted.findIndex((r) => r.entryId === youRow.entryId) + 1;

  return {
    you: youRow,
    winner,
    count: rows.length,
    chart: { positions },
    diagnosis: { overallRank, perPosition, weakest, strongest, isBalanced, balanceRank },
  };
}

// Dry, both directions, DESCRIPTIVE (states what produced fewest/most, not the
// cause — autosub-aware low points can be weak players OR blanks, which is beat
// 9's job). Punch at the decision, never the person.
export function buildVerdict(diagnosis, count) {
  if (!diagnosis) return '';
  const { overallRank, weakest, strongest, isBalanced, balanceRank } = diagnosis;

  if (isBalanced) {
    return `No area carried you and none let you down — the ${ordinal(balanceRank)}-most balanced squad of ${count} in your league.`;
  }

  return `${ordinal(overallRank)} of ${count} overall, ${ordinal(strongest.rank)} for ${strongest.label} — but your ${weakest.label} produced the fewest, ${ordinal(weakest.rank)} of ${count}. Sort it and you're climbing.`;
}
