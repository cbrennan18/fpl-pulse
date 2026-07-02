// features/pulse/wrapped/calc/luckVsSkill.js
//
// Beat 9 — "Luck vs Skill". Pure functions over the once-fetched pack (data in,
// numbers out, NO fetching). The verdict-colouring beat: re-reads the season
// through a luck/skill lens right before the Race climax.
//
// xP SOURCE: the frozen, read-only artefact features/pulse/utils/xp-by-gw-v1.json
// (per-player-per-GW scalar expected points, built by the private fpl-xp-model
// pipeline — see wrapped-build-log SESSION 13). Same frozen-artefact contract as
// career-rating-v1: do NOT hand-edit; changes go upstream then re-copy. The model
// is RETROSPECTIVE (expected given actual minutes/fixtures — not a forecast).
//
// THE SHARED SPINE (load-bearing — no parallel xP path):
// per-manager xP and rP both route through the SAME scoreXiForGw. That function
// takes an injected statOf(id) -> { points, minutes } closure; every selection
// decision (findBenchSub autosub, captain-blank/vice-inherit, x-mult) keys off it.
// We build TWO closures over the SAME realized minutes:
//   • realizedStatOf: { points: total_points, minutes }
//   • xpStatOf:       { points: xpOf(id,gw) ?? realized_points, minutes: realized }
// Minutes stay REALIZED in both, so the XI/captain/autosub decisions are byte-
// identical — only the per-player VALUE swaps (realized -> xP). If the two paths
// diverged, the luck term would be garbage; they cannot, because there is one path.
//
// THE INVARIANT: luck = (rP - xP) contains ONLY finishing variance — never
// decisions (transfer hits) and never artefact gaps (unmodelled players):
//   • Hits (event_transfers_cost) are subtracted from BOTH rP and xP, so they
//     cancel from luck and correctly ding skill (a hit is a decision, not luck).
//   • A fielded player missing from the artefact falls back to xP := realized
//     points (neutral: contributes 0 to rP - xP) and is COUNTED, never silent.
//
// DECOMPOSITION (field-relative; the field is the SAME spine averaged across the
// N league members — which IS effective-ownership weighting by construction, so
// we do NOT reuse maverick's bench-inclusive eoOf):
//   skill(gw) = your_xP - field_xP                                    (expected edge)
//   luck(gw)  = (your_rP - your_xP) - (field_rP - field_xP)
//   actual edge = your_rP - field_rP ;  gap = actual - expected = cumulative luck
// Cumulative over finished GWs.

import xpArtifact from '../../utils/xp-by-gw-v1.json';
import ae64Artifact from '../../utils/ae64-field-v1.json';
import { buildGwPointsIndex, memberName, ordinal } from './setAndForget';
import { scoreXiForGw } from './chips';

export const ATTRIBUTION =
  xpArtifact?.meta?.attribution ??
  'Expected-points inputs derived from FPL-Core-Insights (retrospective model).';

const XP = xpArtifact?.xp ?? {};

// Per-player-per-GW expected points from the frozen artefact, or undefined on a
// miss (fringe player / coverage gap). Keys are stringified in the JSON; number
// indexing coerces, so a single lookup suffices.
export function xpOf(elementId, gw) {
  const row = XP[elementId];
  if (!row) return undefined;
  const v = row[gw];
  return v == null ? undefined : Number(v);
}

function picksForGw(blob, gw) {
  return blob?.picks_by_gw?.[gw] ?? blob?.picks_by_gw?.[String(gw)];
}
function gwSummary(blob, gw) {
  return blob?.gw_summaries?.[gw] ?? blob?.gw_summaries?.[String(gw)];
}

// Round to 2dp — xP is fractional; keep the series clean without lying about it.
const r2 = (n) => Math.round(n * 100) / 100;

/**
 * Score one XI for one GW, chip-aware, through the shared spine. Normal weeks and
 * Triple Captain (x3) go straight through scoreXiForGw (captainMult swap). Bench
 * Boost is the one structural exception: all 15 count and there is NO autosub, so
 * we sum every pick + the captain's extra copy. Free Hit / Wildcard need no special
 * case — the picks already ARE the FH/WC squad, scored normally. Used for BOTH the
 * realized and xP closures, so the two stay apples-to-apples.
 */
export function scoreForGw(picks, statOf, positionOf, activeChip) {
  const captainMult = activeChip === '3xc' ? 3 : 2;
  if (activeChip !== 'bboost') {
    return scoreXiForGw(picks, statOf, positionOf, { captainMult });
  }
  // Bench Boost: all 15 active, no autosub; captain still gets the extra copy.
  let total = 0;
  for (const p of picks) total += statOf(p.element).points;
  const captainId = picks.find((p) => p.is_captain)?.element;
  const viceId = picks.find((p) => p.is_vice)?.element;
  const capStat = statOf(captainId);
  if (captainId && capStat.minutes > 0) {
    total += capStat.points * (captainMult - 1);
  } else if (viceId) {
    const viceStat = statOf(viceId);
    if (viceStat.minutes > 0) total += viceStat.points * (captainMult - 1);
  }
  return total;
}

function sumMapValues(map) {
  let s = 0;
  for (const v of map.values()) s += v;
  return s;
}

// 1-based rank of `you` among rows by a numeric field, descending (1 = best).
// Ties share the better rank (standard competition ranking).
function rankOf(rows, field, you) {
  const mine = rows.find((r) => r.entryId === you);
  if (!mine) return null;
  let rank = 1;
  for (const r of rows) if (r[field] > mine[field]) rank += 1;
  return rank;
}

/**
 * Cumulative luck/skill decomposition — the ONE math path BOTH tabs share. Your
 * per-GW rP/xP always come from scoreMemberSeason (never re-scored a second way);
 * the field is injected as (gw) -> number|undefined lookups — Tab 1 passes its
 * mini-league mean Map, Tab 2 passes the frozen AE64 artefact. A GW is included
 * only where you have a score AND the field covers it; a field gap DROPS the GW
 * (never zero-filled). Signed, cumulative, rounded to 2dp via r2.
 */
export function decompose(youRpByGw, youXpByGw, fieldRpLookup, fieldXpLookup, finishedGwIds) {
  const gws = finishedGwIds.filter(
    (gw) => youRpByGw.has(gw) && fieldRpLookup(gw) != null && fieldXpLookup(gw) != null,
  );
  const expectedEdge = [];
  const actualEdge = [];
  const luckCumulative = [];
  let cumExpected = 0;
  let cumActual = 0;
  for (const gw of gws) {
    cumExpected += youXpByGw.get(gw) - fieldXpLookup(gw);
    cumActual += youRpByGw.get(gw) - fieldRpLookup(gw);
    expectedEdge.push(r2(cumExpected));
    actualEdge.push(r2(cumActual));
    luckCumulative.push(r2(cumActual - cumExpected));
  }
  return {
    gws,
    expectedEdge,
    actualEdge,
    luckCumulative,
    edgeExpected: expectedEdge.length ? expectedEdge[expectedEdge.length - 1] : 0,
    edgeActual: actualEdge.length ? actualEdge[actualEdge.length - 1] : 0,
    luck: luckCumulative.length ? luckCumulative[luckCumulative.length - 1] : 0,
  };
}

/**
 * Compute the full Beat 9 dataset for a league.
 * @returns {{
 *   gws: number[],
 *   expectedEdge: number[], actualEdge: number[], luckCumulative: number[],
 *   processRank: number|null, resultsRank: number|null, count: number,
 *   verdictTone: 'lucky'|'unlucky'|'even'|null,
 *   you: { name, xpTotal, rpTotal, edgeExpected, edgeActual, luck }|null,
 *   misses: { total: number, byManager: Object<string,number> },
 *   reconciliation: { checked: number, mismatches: Array<{entryId,gw,grossRp,official,diff,activeChip}> },
 *   attribution: string,
 * }}
 */
/**
 * Score ONE member's whole season through the shared spine — the load-bearing unit
 * Tab 1 (per-member field decomposition) and Tab 2 (AE64 benchmark precompute) both
 * consume, so both are scored byte-identically. Returns per-member locals only; the
 * caller aggregates misses/recon across the field.
 * @returns {{ rpByGw: Map<number,number>, xpByGw: Map<number,number>, misses: number,
 *   reconChecked: number, reconMismatches: Array<{gw,grossRp,official,diff,activeChip}> }}
 */
export function scoreMemberSeason(blob, { finishedGwIds, gwIndex, positionOf }) {
  let misses = 0;
  let reconChecked = 0;
  const reconMismatches = [];
  const rpByGw = new Map();
  const xpByGw = new Map();

  for (const gw of finishedGwIds) {
    const pg = picksForGw(blob, gw);
    const picks = pg?.picks;
    if (!picks || picks.length === 0) continue; // mid-season join / no squad this GW
    const activeChip = pg.active_chip;
    const map = gwIndex[gw];
    const realizedStatOf = (pid) => (map && map.get(pid)) || { points: 0, minutes: 0 };
    const xpStatOf = (pid) => {
      const real = realizedStatOf(pid);
      const xp = xpOf(pid, gw);
      if (xp === undefined) {
        // neutral fallback — count only players who actually counted (played),
        // so a benched-and-blank fringe player doesn't inflate the tally.
        if (real.minutes > 0) {
          misses += 1;
        }
        return real;
      }
      return { points: xp, minutes: real.minutes };
    };

    const cost = Number(gwSummary(blob, gw)?.event_transfers_cost ?? 0);
    const grossRp = scoreForGw(picks, realizedStatOf, positionOf, activeChip);
    const grossXp = scoreForGw(picks, xpStatOf, positionOf, activeChip);
    rpByGw.set(gw, grossRp - cost);
    xpByGw.set(gw, grossXp - cost);

    // Reconciliation gate: reconstructed GROSS rP must equal the official
    // gw_summaries[gw].points (pre-hit). A mismatch means the shared spine is
    // reconstructing the XI wrongly — and since xP rides the SAME spine, the
    // decomposition would be unsound. Surfaced for the build-time gate.
    const official = gwSummary(blob, gw)?.points;
    if (official != null) {
      reconChecked += 1;
      const diff = grossRp - Number(official);
      if (diff !== 0) {
        reconMismatches.push({ gw, grossRp, official: Number(official), diff, activeChip: activeChip ?? null });
      }
    }
  }

  return { rpByGw, xpByGw, misses, reconChecked, reconMismatches };
}

export function computeLuckVsSkill({ entries, members, you, seasonElements, finishedGwIds, playerPosition }) {
  const gwIndex = buildGwPointsIndex(seasonElements, finishedGwIds);
  const positionOf = playerPosition || (() => 2);

  const missByManager = {};
  let missTotal = 0;
  const reconMismatches = [];
  let reconChecked = 0;

  const rows = members
    .map((id) => {
      const blob = entries[id];
      if (!blob) return null;
      const s = scoreMemberSeason(blob, { finishedGwIds, gwIndex, positionOf });
      missByManager[id] = s.misses;
      missTotal += s.misses;
      reconChecked += s.reconChecked;
      for (const m of s.reconMismatches) {
        reconMismatches.push({ entryId: id, gw: m.gw, grossRp: m.grossRp, official: m.official, diff: m.diff, activeChip: m.activeChip });
      }
      return { entryId: id, name: memberName(blob, id), isYou: id === you, rpByGw: s.rpByGw, xpByGw: s.xpByGw };
    })
    .filter(Boolean);

  const empty = {
    gws: [], expectedEdge: [], actualEdge: [], luckCumulative: [],
    processRank: null, resultsRank: null, count: rows.length, verdictTone: null,
    you: null,
    misses: { total: missTotal, byManager: missByManager },
    reconciliation: { checked: reconChecked, mismatches: reconMismatches },
    attribution: ATTRIBUTION,
  };
  const youRow = rows.find((r) => r.isYou);
  if (!youRow || rows.length === 0) return empty;

  // Field per GW = mean across members present that GW (EO-weighting by construction).
  const fieldRp = new Map();
  const fieldXp = new Map();
  for (const gw of finishedGwIds) {
    let sr = 0;
    let sx = 0;
    let n = 0;
    for (const r of rows) {
      if (r.rpByGw.has(gw)) {
        sr += r.rpByGw.get(gw);
        sx += r.xpByGw.get(gw);
        n += 1;
      }
    }
    if (n > 0) {
      fieldRp.set(gw, sr / n);
      fieldXp.set(gw, sx / n);
    }
  }

  // Your cumulative edges over the finished GWs you played (shared math path).
  const { gws, expectedEdge, actualEdge, luckCumulative, edgeExpected, edgeActual, luck } =
    decompose(youRow.rpByGw, youRow.xpByGw, (gw) => fieldRp.get(gw), (gw) => fieldXp.get(gw), finishedGwIds);

  // Ranks by season totals: process by xP, results by rP.
  const totals = rows.map((r) => ({
    entryId: r.entryId,
    xpTotal: sumMapValues(r.xpByGw),
    rpTotal: sumMapValues(r.rpByGw),
  }));
  const processRank = rankOf(totals, 'xpTotal', you);
  const resultsRank = rankOf(totals, 'rpTotal', you);
  const count = totals.length;

  // Lower rank number = better. Results better than process => you finished ahead
  // of your process (variance broke your way) => lucky, and vice versa.
  let verdictTone = 'even';
  if (processRank != null && resultsRank != null) {
    if (resultsRank < processRank) verdictTone = 'lucky';
    else if (resultsRank > processRank) verdictTone = 'unlucky';
  }

  const mine = totals.find((t) => t.entryId === you);
  return {
    gws,
    expectedEdge,
    actualEdge,
    luckCumulative,
    processRank,
    resultsRank,
    count,
    verdictTone,
    you: {
      name: youRow.name,
      xpTotal: r2(mine.xpTotal),
      rpTotal: r2(mine.rpTotal),
      edgeExpected,
      edgeActual,
      luck,
    },
    // Your raw scored series, exposed so Tab 2 (AE64) reuses the EXACT same numbers
    // — one scoring path, no divergence.
    youSeries: { rpByGw: youRow.rpByGw, xpByGw: youRow.xpByGw },
    misses: { total: missTotal, byManager: missByManager },
    reconciliation: { checked: reconChecked, mismatches: reconMismatches },
    attribution: ATTRIBUTION,
  };
}

export { ordinal };

// Dry verdict, both directions, punching at the outcome not the person. Every rank
// shows "of N". Luck is framed as deviation from EXPECTED (retrospective finishing
// variance) — never forecast-deviation.
export function buildVerdict(result) {
  if (!result?.you || result.processRank == null) return '';
  const { processRank, resultsRank, count, verdictTone, you } = result;
  const proc = `${ordinal(processRank)} of ${count}`;
  const res = `${ordinal(resultsRank)} of ${count}`;
  const swing = Math.round(Math.abs(you.luck));

  if (verdictTone === 'lucky') {
    return `Your process ranked ${proc}; your results came in ${res}. The finish ran ${swing} points ahead of what the underlying numbers expected — variance broke your way.`;
  }
  if (verdictTone === 'unlucky') {
    return `Your process ranked ${proc}; your results came in ${res}. The finish landed ${swing} points short of what the underlying numbers expected — the variance didn't.`;
  }
  return `Your process ranked ${proc} and your results matched it at ${res}. What you built is what you got — no free lunch, no robbery.`;
}

export const AE64_DESCRIPTOR = 'Analytics Elite 64. The best FPL managers who live by xG and data.';

/**
 * Beat 9 Tab 2 — the AE64 "humbling benchmark". Drops YOUR already-scored season
 * (reused from computeLuckVsSkill.youSeries — never re-scored) into the frozen
 * ae64-field-v1.json field. Same decomposition as Tab 1, but the field is the
 * artefact's per-GW mean (which EXCLUDES you — you are compared against AE64, not
 * a member of it). The rank is a what-if: your season totals inserted against the
 * meta.n anonymised member totals, counting how many you'd have OUTSCORED
 * (strictly greater — a tie is not an outscore; you are never counted among them).
 * All "of N" copy reads meta.n; nothing is hard-coded.
 * @param {{ youSeries: { rpByGw: Map<number,number>, xpByGw: Map<number,number> },
 *   youTotals: { xpTotal: number, rpTotal: number }, finishedGwIds: number[] }} args
 */
export function computeAe64Benchmark({ youSeries, youTotals, finishedGwIds }) {
  const { meta, members } = ae64Artifact;
  const dec = decompose(
    youSeries.rpByGw,
    youSeries.xpByGw,
    (gw) => ae64Artifact.field_rP[gw],
    (gw) => ae64Artifact.field_xP[gw],
    finishedGwIds,
  );

  const n = meta.n;
  const processBeat = members.filter((m) => youTotals.xpTotal > m.xp).length;
  const resultsBeat = members.filter((m) => youTotals.rpTotal > m.rp).length;

  // More results-placings than process-placings ⇒ variance broke your way (lucky).
  let verdictTone = 'even';
  if (resultsBeat > processBeat) verdictTone = 'lucky';
  else if (resultsBeat < processBeat) verdictTone = 'unlucky';

  return {
    gws: dec.gws,
    expectedEdge: dec.expectedEdge,
    actualEdge: dec.actualEdge,
    luckCumulative: dec.luckCumulative,
    processBeat,
    resultsBeat,
    n,
    verdictTone,
    you: { xpTotal: youTotals.xpTotal, rpTotal: youTotals.rpTotal, luck: dec.luck },
    attribution: meta.attribution,
    descriptor: AE64_DESCRIPTOR,
  };
}

// Tab 2 verdict — dry, CONDITIONAL ("dropped into…", "would have"): a what-if,
// never a claim you played in AE64. Mirrors buildVerdict's three tones, framed as
// "outscored N of {n}" (never a rank of 63/64 — no naming collision, no self-count).
export function buildAe64Verdict(result) {
  if (!result?.you || !result.gws.length) return '';
  const { processBeat, resultsBeat, n, verdictTone, you } = result;
  const proc = `${processBeat} of ${n}`;
  const res = `${resultsBeat} of ${n}`;
  const swing = Math.round(Math.abs(you.luck));

  if (verdictTone === 'lucky') {
    return `Dropped into Analytics Elite 64, your process would have outscored ${proc}; your results, ${res}. The finish ran ${swing} points ahead of what the underlying numbers expected — variance broke your way.`;
  }
  if (verdictTone === 'unlucky') {
    return `Dropped into Analytics Elite 64, your process would have outscored ${proc}; your results, ${res}. The finish landed ${swing} points short of what the underlying numbers expected — the variance didn't follow.`;
  }
  return `Dropped into Analytics Elite 64, your process would have outscored ${proc} and your results matched it at ${res}. Against the best, what you built is what you'd get.`;
}
