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

// FPL formation minimums for a legal XI. GK is always exactly 1 and only ever
// covered by a GK, so it needs no minimum here.
const FORMATION_MIN = { 2: 3, 3: 2, 4: 1 }; // DEF>=3, MID>=2, FWD>=1
const TYPE_KEY = { 2: 'def', 3: 'mid', 4: 'fwd' };

// Outfield tally of a starting XI, for formation-legal autosubs. GK is implicit.
// Build this from the saved starting XI (position <= 11), pre-autosub.
export function formationCounts(starters, positionOf) {
  const counts = { def: 0, mid: 0, fwd: 0 };
  for (const s of starters) {
    const key = TYPE_KEY[positionOf(s.element)];
    if (key) counts[key] += 1;
  }
  return counts;
}

// First bench player (in saved order) eligible to cover a blanked starter:
//   • matching broad slot — a GK only covers a GK, an outfielder an outfielder;
//   • actually played (minutes > 0);
//   • AND leaves a legal formation. FPL will NOT make a cross-position sub that
//     pulls the vacated line below a minimum it currently meets (>=3 DEF, >=2 MID,
//     >=1 FWD) — it leaves the blanked starter in for 0. Same-position covers never
//     change the shape.
// `counts` (current fielded {def,mid,fwd}) is mutated in place on a successful sub,
// so multi-blank GWs re-validate against the updated shape, in bench order. When
// omitted, falls back to the old GK/outfield-only rule.
// Exported so sibling beats (e.g. fingerprint.js) keep the autosub rule identical.
export function findBenchSub(starter, bench, used, statOf, positionOf, counts) {
  const starterType = positionOf(starter.element);
  const starterIsGk = starterType === 1;
  for (const b of bench) {
    if (used.has(b.element)) continue;
    const benchType = positionOf(b.element);
    if ((benchType === 1) !== starterIsGk) continue;
    if (statOf(b.element).minutes <= 0) continue;
    if (!starterIsGk && counts && benchType !== starterType) {
      const key = TYPE_KEY[starterType];
      const min = FORMATION_MIN[starterType];
      // reject only if removing this starter breaches a minimum it currently meets
      if (key && counts[key] - 1 < min && counts[key] >= min) continue;
    }
    if (!starterIsGk && counts) {
      const sKey = TYPE_KEY[starterType];
      const bKey = TYPE_KEY[benchType];
      if (sKey) counts[sKey] -= 1;
      if (bKey) counts[bKey] += 1;
    }
    return b;
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
    const counts = formationCounts(starters, positionOf);
    let gwPoints = 0;
    for (const starter of starters) {
      const starterStat = statOf(starter.element);
      if (starterStat.minutes > 0) {
        gwPoints += starterStat.points;
        continue;
      }
      const sub = findBenchSub(starter, bench, used, statOf, positionOf, counts);
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

// One manager's frozen GW1 STARTING XI, for the tap→detail sheet (Beat 1). Reads the
// same picks_by_gw[1] spine scoreFrozenSquad scores forward — but returns the named XI
// (ordered by saved slot, with captain/vice flags) rather than a total. positionOf →
// element_type (1 GK … 4 FWD) for the position tag.
export function getGw1Squad(blob, nameOf, positionOf) {
  const gw1 = blob?.picks_by_gw?.[1] ?? blob?.picks_by_gw?.['1'];
  const picks = gw1?.picks || [];
  return picks
    .filter((p) => p.position <= 11)
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      element: p.element,
      name: nameOf ? nameOf(p.element) : `#${p.element}`,
      type: positionOf ? positionOf(p.element) : 0,
      isCaptain: !!p.is_captain,
      isVice: !!p.is_vice,
    }));
}

// Exported so sibling beat calcs (e.g. captain.js) name managers the same way.
export function memberName(blob, id) {
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
