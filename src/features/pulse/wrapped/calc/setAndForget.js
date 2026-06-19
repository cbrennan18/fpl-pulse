// features/pulse/wrapped/calc/setAndForget.js
//
// Beat 1 — "Set & Forget" calc. Pure functions over the once-fetched pack
// (mirrors the pulseCalculations.js pattern: data in, numbers out, NO fetching).
//
// The idea: freeze every manager's GW1 starting XI and run it forward across all
// finished GWs — same 11 every week, GW1 captain doubled every week. The "frozen"
// total is the set-and-forget baseline; (actual final total − baseline) is the
// management delta: did your moves add value or destroy it?
//
// Data spine (resolved): per-player-per-GW points come from seasonElements
// (/v1/season/elements) — the live event payload stored verbatim, which holds
// total_points AND minutes for EVERY player who featured that GW, regardless of
// who owned them. entries-pack alone is insufficient (it only holds points for
// players a member owned that week); seasonElements is the season-wide table.
//
// Autosub rule (v1, deliberately simplified — applied IDENTICALLY to everyone, so
// the relative leaderboard stays fair): each GW, any GW1 starter who played 0 mins
// is replaced by the first GW1 bench player (saved order 12→15) who played ≥1 min
// and matches GK↔GK / outfield↔outfield. Captain ×2 every week; if the GW1 captain
// played 0 mins, the GW1 vice-captain gets the ×2. No formation-validity
// enforcement (that's the rabbit hole the spec told us to skip).

/**
 * Build a per-GW lookup of { elementId -> { points, minutes } } from the season
 * elements blob. One Map per finished GW so scoring is O(1) per player-GW.
 */
export function buildGwPointsIndex(seasonElements, finishedGwIds) {
  const index = {};
  for (const gw of finishedGwIds) {
    const map = new Map();
    const elements = seasonElements?.gws?.[gw]?.elements || [];
    for (const el of elements) {
      map.set(el.id, {
        points: Number(el?.stats?.total_points ?? 0),
        minutes: Number(el?.stats?.minutes ?? 0),
      });
    }
    index[gw] = map;
  }
  return index;
}

// First bench player (in saved order) who played this GW and matches the blanked
// starter's type (GK only covers GK; outfield only covers outfield). null if none.
function findBenchSub(starter, bench, used, statOf, positionOf) {
  const starterIsGk = positionOf(starter.element) === 1;
  for (const b of bench) {
    if (used.has(b.element)) continue;
    const benchIsGk = positionOf(b.element) === 1;
    if (benchIsGk !== starterIsGk) continue;
    if (statOf(b.element).minutes > 0) return b;
  }
  return null;
}

/**
 * Score one manager's frozen GW1 XI forward across all finished GWs.
 * @returns {number} the set-and-forget baseline total.
 */
export function scoreFrozenSquad(blob, gwIndex, finishedGwIds, positionOf) {
  const gw1 = blob?.picks_by_gw?.[1] ?? blob?.picks_by_gw?.['1'];
  const picks = gw1?.picks || [];
  if (picks.length === 0) return 0;

  const starters = picks.filter((p) => p.position <= 11);
  const bench = picks
    .filter((p) => p.position >= 12)
    .sort((a, b) => a.position - b.position);
  const captainId = picks.find((p) => p.is_captain)?.element;
  const viceId = picks.find((p) => p.is_vice)?.element;

  let total = 0;
  for (const gw of finishedGwIds) {
    const map = gwIndex[gw];
    if (!map) continue;
    const statOf = (id) => map.get(id) || { points: 0, minutes: 0 };

    // Resolve the effective XI: keep starters who played, sub in bench cover for
    // those who blanked. A bench player can only cover one slot.
    const used = new Set();
    let gwPoints = 0;
    for (const starter of starters) {
      const starterStat = statOf(starter.element);
      if (starterStat.minutes > 0) {
        gwPoints += starterStat.points;
        continue;
      }
      const sub = findBenchSub(starter, bench, used, statOf, positionOf);
      if (sub) {
        used.add(sub.element);
        gwPoints += statOf(sub.element).points; // bench points count once
      }
      // no eligible sub → the blanked starter contributes 0 (nothing added)
    }

    // Captaincy: GW1 captain doubled (add one extra copy of their points). If the
    // captain blanked, the GW1 vice inherits the armband (if THEY played).
    const captainStat = statOf(captainId);
    if (captainId && captainStat.minutes > 0) {
      gwPoints += captainStat.points;
    } else if (viceId) {
      const viceStat = statOf(viceId);
      if (viceStat.minutes > 0) gwPoints += viceStat.points;
    }

    total += gwPoints;
  }
  return total;
}

function memberName(blob, id) {
  const s = blob?.summary;
  const name = `${s?.player_first_name ?? ''} ${s?.player_last_name ?? ''}`.trim();
  return name || `#${id}`;
}

/**
 * Compute the full Beat 1 dataset for a league.
 * @returns {{
 *   rows: Array<{entryId,name,baselineTotal,actualTotal,delta,isYou}>,
 *   byBaseline: Array, byDelta: Array,
 *   you: object|null, youDeltaRank: number, count: number
 * }}
 */
export function computeSetAndForget({
  entries,
  members,
  you,
  seasonElements,
  finishedGwIds,
  positionOf,
}) {
  const gwIndex = buildGwPointsIndex(seasonElements, finishedGwIds);
  const lastGw = finishedGwIds.length ? Math.max(...finishedGwIds) : 0;

  const rows = members
    .map((id) => {
      const blob = entries[id];
      if (!blob) return null;
      const baselineTotal = scoreFrozenSquad(blob, gwIndex, finishedGwIds, positionOf);
      // gw_summaries total is NET of transfer hits (verified against the FPL
      // history payload), so hits are already counted as management value.
      const summary = blob?.gw_summaries?.[lastGw] ?? blob?.gw_summaries?.[String(lastGw)];
      const actualTotal = Number(summary?.total ?? 0);
      return {
        entryId: id,
        name: memberName(blob, id),
        baselineTotal,
        actualTotal,
        delta: actualTotal - baselineTotal,
        isYou: id === you,
      };
    })
    .filter(Boolean);

  // Stable tie-break by entryId keeps the two orderings deterministic.
  const byBaseline = [...rows].sort(
    (a, b) => b.baselineTotal - a.baselineTotal || a.entryId - b.entryId
  );
  const byDelta = [...rows].sort(
    (a, b) => b.delta - a.delta || a.entryId - b.entryId
  );

  const youRow = rows.find((r) => r.isYou) || null;
  const youDeltaRank = youRow
    ? byDelta.findIndex((r) => r.entryId === youRow.entryId) + 1
    : 0;

  return { rows, byBaseline, byDelta, you: youRow, youDeltaRank, count: rows.length };
}

export function ordinal(n) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

// Dry, works both directions (and a neutral case). Punch at the decision.
export function buildVerdict(youRow, youDeltaRank) {
  if (!youRow) return '';
  const { delta } = youRow;
  if (delta > 0) {
    return `Your moves added +${delta} — ${ordinal(youDeltaRank)} in your league.`;
  }
  if (delta < 0) {
    return `Your moves cost you ${Math.abs(delta)} — the frozen squad would've finished higher.`;
  }
  return 'You finished exactly where the frozen squad would have.';
}
