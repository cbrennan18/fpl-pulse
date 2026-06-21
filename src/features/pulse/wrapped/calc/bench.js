// features/pulse/wrapped/calc/bench.js
//
// Beat 8 — "The Bench". Pure functions over the once-fetched pack (mirrors
// setAndForget.js / chips.js: data in, numbers out, NO fetching).
//
// The question (story-arc beat 8): how many points did you leave on your bench?
// This is the season's single concentrated regret trough — stated flat, dry.
//
// THE METRIC — RECOVERABLE POINTS, per GW per manager:
//
//   recoverable(gw) = max(0, bestInFormationXI(gw) − actualFieldedXI(gw))
//
// on BASE points (no captain multiplier) on BOTH sides. It measures whether you
// STARTED THE RIGHT PLAYERS, not whether a different shape was better:
//
//   * FORMATION HELD FIXED — and ONE shape defines it: the SAVED starting XI
//     (picks position <= 11) that GW, NEVER the post-autosub as-played shape. The
//     fixed formation is the element_type counts of those 11 (e.g. 1/4/4/2).
//   * SAME-POSITION SWAPS ONLY — a benched DEF can only replace a started DEF.
//     So bestInFormationXI decomposes per element_type into independent top-K
//     picks (K = number of that type in the saved XI), taken over ALL squad
//     players of that type (starters ∪ bench). ~4 tiny sorts per cell — cheap.
//   * `actual` AND `best` live under the SAME strict same-element_type discipline.
//     `actual` = the saved starters, each 0-min starter replaced by the best
//     same-element_type bench player who played (a STRICT sub — DEF only covers
//     DEF). We deliberately do NOT reuse the loose cross-beat findBenchSub (which
//     only distinguishes GK↔outfield): the same-position metric requires a strict
//     sub, and keeping best+actual under one discipline makes a cross-position
//     gain STRUCTURALLY IMPOSSIBLE (e.g. a bench FWD outscoring a started DEF can
//     never count). Under one discipline best >= actual always holds, so the
//     max(0,…) clamp is a non-binding defensive guard, not load-bearing.
//   * AUTOSUB-AWARE, no double-count: `actual` is post-(strict)-autosub, so points
//     an autosub already recovered are part of `actual`, never counted as still
//     recoverable.
//   * CAPTAIN MULTIPLIER EXCLUDED both sides — captaincy is beat 2's story; this
//     measures bench decisions. Excluding also sidesteps an optimal-XI-drops-the-
//     captain edge.
//   * NO CHIP EXCLUSION — computed on whatever squad was fielded each GW (incl.
//     WC/FH/BB). Under BB the bench bonus was already collected (beat 7), so it
//     doesn't reappear here as "recoverable".
//
// THE VERDICT — the league re-rank (the real causal claim): we compute recoverable
// for EVERY member, every finished GW, then re-rank the league by
//   correctedTotal = actualTotal (net, gw_summaries[lastGw].total) + recoverableTotal.
// "Fix everyone's bench and you'd have finished Z, not Y" is only TRUE because
// everyone's correction is applied, not just yours.
//
// Per-player-per-GW points+minutes come off the seasonElements spine via
// buildGwPointsIndex; memberName/ordinal reused from setAndForget (DRY).

import { buildGwPointsIndex, memberName, ordinal } from './setAndForget';

function picksForGw(blob, gw) {
  return blob?.picks_by_gw?.[gw] ?? blob?.picks_by_gw?.[String(gw)];
}

// Group a list of picks by element_type (GK 1 / DEF 2 / MID 3 / FWD 4).
function byPosition(picks, positionOf) {
  const groups = new Map();
  for (const p of picks) {
    const type = positionOf(p.element);
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(p);
  }
  return groups;
}

/**
 * The best XI achievable WITHIN the saved formation, same-position swaps only.
 * For each element_type the saved XI uses, take the top-K scorers (by actual GW
 * base points) from ALL squad players of that type. Returns the total AND the
 * chosen element ids per type (so the swap breakdown can pair best vs actual).
 */
export function bestInFormationByPosition(picks, statOf, positionOf) {
  const starters = picks.filter((p) => p.position <= 11);
  const allByType = byPosition(picks, positionOf);
  const startersByType = byPosition(starters, positionOf);

  let total = 0;
  const chosenByType = new Map(); // type -> array of {element, points}
  for (const [type, startersOfType] of startersByType) {
    const k = startersOfType.length;
    const pool = (allByType.get(type) || [])
      .map((p) => ({ element: p.element, points: statOf(p.element).points }))
      .sort((a, b) => b.points - a.points || a.element - b.element);
    const chosen = pool.slice(0, k);
    chosenByType.set(type, chosen);
    total += chosen.reduce((s, c) => s + c.points, 0);
  }
  return { total, chosenByType };
}

/**
 * The actual fielded XI, post-(strict)-autosub, on base points. Each saved
 * starter who played (>=1 min) keeps their slot; a 0-min starter is replaced by
 * the best same-element_type bench player who played (strict sub). Returns the
 * total AND the fielded element ids per type.
 */
export function actualFieldedByPosition(picks, statOf, positionOf) {
  const starters = picks.filter((p) => p.position <= 11);
  const bench = picks
    .filter((p) => p.position >= 12)
    .sort((a, b) => a.position - b.position);

  let total = 0;
  const fieldedByType = new Map(); // type -> array of {element, points}
  const used = new Set();
  for (const starter of starters) {
    const type = positionOf(starter.element);
    if (!fieldedByType.has(type)) fieldedByType.set(type, []);
    const sStat = statOf(starter.element);
    if (sStat.minutes > 0) {
      total += sStat.points;
      fieldedByType.get(type).push({ element: starter.element, points: sStat.points });
      continue;
    }
    // strict same-element_type sub: best bench player of THIS type who played
    let bestSub = null;
    for (const b of bench) {
      if (used.has(b.element)) continue;
      if (positionOf(b.element) !== type) continue;
      const bStat = statOf(b.element);
      if (bStat.minutes <= 0) continue;
      if (!bestSub || bStat.points > bestSub.points) {
        bestSub = { element: b.element, points: bStat.points };
      }
    }
    if (bestSub) {
      used.add(bestSub.element);
      total += bestSub.points;
      fieldedByType.get(type).push(bestSub);
    }
    // no eligible same-position sub → the blanked starter contributes 0
  }
  return { total, fieldedByType };
}

/**
 * Per-position pairing of best vs actual-fielded → the human-readable swaps that
 * make up the recoverable total ("Gabriel 2 → Saliba 10: +8"). For each type,
 * the players in best-but-not-fielded (in) are paired with the players in
 * fielded-but-not-best (out), highest in vs lowest out, descending gain.
 */
function diffSwaps(bestChosenByType, actualFieldedByType, playerName) {
  const swaps = [];
  for (const [type, chosen] of bestChosenByType) {
    const fielded = actualFieldedByType.get(type) || [];
    const fieldedIds = new Set(fielded.map((c) => c.element));
    const chosenIds = new Set(chosen.map((c) => c.element));
    const ins = chosen
      .filter((c) => !fieldedIds.has(c.element))
      .sort((a, b) => b.points - a.points);
    const outs = fielded
      .filter((c) => !chosenIds.has(c.element))
      .sort((a, b) => a.points - b.points);
    const n = Math.min(ins.length, outs.length);
    for (let i = 0; i < n; i += 1) {
      const inP = ins[i];
      const outP = outs[i];
      swaps.push({
        in: playerName(inP.element),
        inPts: inP.points,
        out: playerName(outP.element),
        outPts: outP.points,
        gain: inP.points - outP.points,
      });
    }
  }
  return swaps.sort((a, b) => b.gain - a.gain);
}

/**
 * Recoverable points for one manager, one GW. `withSwaps` builds the per-swap
 * breakdown (only the YOU member needs it — every other member needs the number
 * only, so the league re-rank stays cheap).
 */
export function recoverableForGw(picks, statOf, positionOf, playerName, withSwaps = false) {
  if (!picks || picks.length === 0) {
    return { played: false, actual: 0, best: 0, recoverable: 0, nailed: false, swaps: [] };
  }
  const best = bestInFormationByPosition(picks, statOf, positionOf);
  const actual = actualFieldedByPosition(picks, statOf, positionOf);
  const recoverable = Math.max(0, best.total - actual.total);
  return {
    played: true,
    actual: actual.total,
    best: best.total,
    recoverable,
    nailed: recoverable === 0,
    swaps: withSwaps && recoverable > 0
      ? diffSwaps(best.chosenByType, actual.fieldedByType, playerName)
      : [],
  };
}

// Walk a member's finished GWs, returning per-GW cells + the recoverable total.
function scoreMember(blob, gwIndex, finishedGwIds, positionOf, playerName, withSwaps) {
  const cells = [];
  let recoverableTotal = 0;
  for (const gw of finishedGwIds) {
    const map = gwIndex[gw];
    const statOf = (id) => (map && map.get(id)) || { points: 0, minutes: 0 };
    const picks = picksForGw(blob, gw)?.picks;
    const r = recoverableForGw(picks, statOf, positionOf, playerName, withSwaps);
    recoverableTotal += r.recoverable;
    cells.push({
      gw,
      recoverable: r.recoverable,
      nailed: r.played && r.nailed,
      played: r.played,
      swaps: r.swaps,
    });
  }
  return { cells, recoverableTotal };
}

/**
 * Compute the full Beat 8 dataset for a league.
 * @returns {{
 *   you: { name, cells, recoverableTotal, maxCell } | null,
 *   actualFinish: number, correctedFinish: number, count: number
 * }}
 */
export function computeBench({
  entries,
  members,
  you,
  seasonElements,
  finishedGwIds,
  playerPosition,
  playerName,
}) {
  const gwIndex = buildGwPointsIndex(seasonElements, finishedGwIds);
  const positionOf = playerPosition;
  const lastGw = finishedGwIds.length ? Math.max(...finishedGwIds) : 0;

  // Every member's recoverable total (the ~570-cell cost) for the re-rank; swap
  // breakdowns are built only for YOU.
  const rows = members
    .map((id) => {
      const blob = entries[id];
      if (!blob) return null;
      const isYou = id === you;
      const { cells, recoverableTotal } = scoreMember(
        blob, gwIndex, finishedGwIds, positionOf, playerName, isYou
      );
      const summary = blob?.gw_summaries?.[lastGw] ?? blob?.gw_summaries?.[String(lastGw)];
      const actualTotal = Number(summary?.total ?? 0);
      return {
        entryId: id,
        name: memberName(blob, id),
        isYou,
        cells,
        recoverableTotal,
        actualTotal,
        correctedTotal: actualTotal + recoverableTotal,
      };
    })
    .filter(Boolean);

  // Two orderings, both deterministic (tie-break entryId).
  const byActual = [...rows].sort(
    (a, b) => b.actualTotal - a.actualTotal || a.entryId - b.entryId
  );
  const byCorrected = [...rows].sort(
    (a, b) => b.correctedTotal - a.correctedTotal || a.entryId - b.entryId
  );

  const youRow = rows.find((r) => r.isYou) || null;
  const actualFinish = youRow
    ? byActual.findIndex((r) => r.entryId === youRow.entryId) + 1
    : 0;
  const correctedFinish = youRow
    ? byCorrected.findIndex((r) => r.entryId === youRow.entryId) + 1
    : 0;

  const maxCell = youRow
    ? youRow.cells.reduce((m, c) => Math.max(m, c.recoverable), 0)
    : 0;

  return {
    you: youRow
      ? { name: youRow.name, cells: youRow.cells, recoverableTotal: youRow.recoverableTotal, maxCell }
      : null,
    actualFinish,
    correctedFinish,
    count: rows.length,
  };
}

export { ordinal };

// Dry, flat verdict — reads all three directions off the corrected vs actual
// finish. Punch at the decision, never the person. NO loss-red framing.
export function buildVerdict(result) {
  if (!result?.you) return '';
  const { recoverableTotal } = result.you;
  const { actualFinish, correctedFinish, count } = result;
  const Y = `${ordinal(actualFinish)} of ${count}`;
  const Z = `${ordinal(correctedFinish)} of ${count}`;

  if (correctedFinish < actualFinish) {
    // you climb when everyone is corrected — the gut-punch
    return `You left ${recoverableTotal} recoverable points on your bench. Fix everyone's, and you'd have finished ${Z} — not ${Y}.`;
  }
  if (correctedFinish > actualFinish) {
    // you slip — a backhanded compliment: your bench was relatively tidy
    return `You barely left anything on your bench — it's your rivals' that were hiding the points. Correct everyone's and you'd slip to ${Z}.`;
  }
  // shrug — the correction doesn't move you; don't manufacture a regret
  return `Everyone left points out there — your bench wasn't the difference. Still ${Y}.`;
}
