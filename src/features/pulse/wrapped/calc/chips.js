// features/pulse/wrapped/calc/chips.js
//
// Beat 7 — "Chips". Pure functions over the once-fetched pack (mirrors
// setAndForget.js / captain.js: data in, numbers out, NO fetching).
//
// The question (story-arc beat 7): did your biggest single-week levers pay off
// vs your rivals? FOUR chips, and the spec defines each chip's "gain" DIFFERENTLY
// — they are NOT unified into one "chip value". Each is computed by its own rule:
//
//   BENCH BOOST   — your 4 bench players' actual points that GW (under BB all 15
//                   count, so there is no autosub that week).
//   TRIPLE CAPTAIN— the MARGINAL extra ×1 over a normal ×2 captain = your
//                   captain's BASE points that GW. If the captain played 0 mins
//                   the chip is wasted (the vice plays at the normal ×2, not ×3),
//                   so the marginal third copy is 0.
//   FREE HIT      — the FH XI's points that GW minus what your REAL (reverted)
//                   team would have scored that GW. One-GW window, gross.
//   WILDCARD      — the wildcarded XI's points that GW minus the squad you held
//                   going in, scored that same GW. Measured in the WILDCARD GW
//                   ONLY (see window note below). Gross.
//
// GROSS note (NOT an exception to the net-of-hit cross-beat standard): WC + FH
// gains are gross by spec ("ignore hypothetical hits"). This is consistent, not
// an exception — a wildcard/free-hit incurs NO hits, so there is nothing to net
// out. BB/TC are single-week point counts with no hit dimension either.
//
// WILDCARD WINDOW (judgment call, pinned): the wildcard GW only. It's the only
// window where "the old XI" is unambiguous — beyond one GW the counterfactual
// "old squad" requires assuming you'd have made ZERO transfers without the
// wildcard, which is false and manufactures the hypothetical hits the spec says
// to ignore. FLAG: this UNDERSTATES a wildcard's true multi-week reshape value;
// a future refinement could score both squads forward to the next chip in the
// half (heavier, and reintroduces the no-transfers fiction). Not built here.
//
// Per-player-per-GW points+minutes come off the seasonElements spine via
// buildGwPointsIndex; autosubs via findBenchSub — both reused from setAndForget
// (DRY: the autosub rule stays single-sourced). memberName/ordinal reused too.

import { buildGwPointsIndex, findBenchSub, memberName, ordinal } from './setAndForget';

// H1/H2 boundary — authoritative from bootstrap chips[] (every chip's H1
// stop_event = 19, H2 start_event = 20). A member plays each chip <= once/half.
export const H1_LAST_GW = 19;
export const CHIP_KEYS = ['wildcard', 'freehit', 'bboost', '3xc'];

export function chipHalf(gw) {
  return gw <= H1_LAST_GW ? 'H1' : 'H2';
}

function picksForGw(blob, gw) {
  return blob?.picks_by_gw?.[gw] ?? blob?.picks_by_gw?.[String(gw)];
}

/**
 * Score one XI for ONE gw: autosub-aware (same-position cover for 0-min
 * starters, saved bench order 12->15), plus the captain's points x captainMult
 * (vice inherits at x captainMult if the captain blanked). The SAME helper
 * scores both sides of the FH/WC comparison so the marginal is apples-to-apples.
 */
export function scoreXiForGw(picks, statOf, positionOf, { captainMult = 2 } = {}) {
  if (!picks || picks.length === 0) return 0;

  const starters = picks.filter((p) => p.position <= 11);
  const bench = picks
    .filter((p) => p.position >= 12)
    .sort((a, b) => a.position - b.position);
  const captainId = picks.find((p) => p.is_captain)?.element;
  const viceId = picks.find((p) => p.is_vice)?.element;

  const used = new Set();
  let total = 0;
  for (const starter of starters) {
    const s = statOf(starter.element);
    if (s.minutes > 0) {
      total += s.points;
      continue;
    }
    const sub = findBenchSub(starter, bench, used, statOf, positionOf);
    if (sub) {
      used.add(sub.element);
      total += statOf(sub.element).points;
    }
    // no eligible sub -> the blanked starter contributes 0
  }

  // Captaincy: extra copies for the armband. If the captain blanked, the vice
  // inherits (if THEY played).
  const capStat = statOf(captainId);
  if (captainId && capStat.minutes > 0) {
    total += capStat.points * (captainMult - 1);
  } else if (viceId) {
    const viceStat = statOf(viceId);
    if (viceStat.minutes > 0) total += viceStat.points * (captainMult - 1);
  }
  return total;
}

// --- the four per-chip gain formulas (each by its OWN rule) -------------------

// BENCH BOOST: sum of the 4 bench players' (position 12-15) actual points that
// GW. Under BB all 15 count, so no autosub; blanked bench players give 0.
export function benchBoostGain(picks, statOf) {
  return (picks || [])
    .filter((p) => p.position >= 12)
    .reduce((sum, p) => sum + statOf(p.element).points, 0);
}

// TRIPLE CAPTAIN marginal: captain's BASE points that GW (the extra x1 beyond a
// normal x2). Wasted if the captain blanked -> 0 (vice plays at x2, same as no
// TC), so the marginal third copy never materialises.
export function tripleCaptainGain(picks, statOf) {
  const captainId = (picks || []).find((p) => p.is_captain)?.element;
  const cap = statOf(captainId);
  return captainId && cap.minutes > 0 ? cap.points : 0;
}

// FREE HIT / WILDCARD share a structure: the chip XI this GW minus the squad you
// reverted from / held going in, scored that same GW. Returns null when the prior
// squad isn't a real reverted squad (missing, or the prior GW was ITSELF a free
// hit -> that temporary squad has vanished, so there is nothing honest to revert
// to and we must not score a phantom).
function marginalVsPriorSquad(blob, chipGw, statOf, positionOf) {
  const chipPg = picksForGw(blob, chipGw);
  const priorPg = picksForGw(blob, chipGw - 1);
  if (!chipPg?.picks || !priorPg?.picks) return null;
  if (priorPg.active_chip === 'freehit') return null; // back-to-back chip guard
  const chipPts = scoreXiForGw(chipPg.picks, statOf, positionOf);
  const priorPts = scoreXiForGw(priorPg.picks, statOf, positionOf);
  return chipPts - priorPts;
}

export function freeHitGain(blob, fhGw, statOf, positionOf) {
  return marginalVsPriorSquad(blob, fhGw, statOf, positionOf);
}

export function wildcardGain(blob, wcGw, statOf, positionOf) {
  return marginalVsPriorSquad(blob, wcGw, statOf, positionOf);
}

// Dispatch a chip key to its own formula. gw is the GW the chip was played.
function gainForChip(chipKey, blob, gw, gwIndex, positionOf) {
  const map = gwIndex[gw];
  const statOf = (id) => (map && map.get(id)) || { points: 0, minutes: 0 };
  const picks = picksForGw(blob, gw)?.picks;
  switch (chipKey) {
    case 'bboost':
      return benchBoostGain(picks, statOf);
    case '3xc':
      return tripleCaptainGain(picks, statOf);
    case 'freehit':
      return freeHitGain(blob, gw, statOf, positionOf);
    case 'wildcard':
      return wildcardGain(blob, gw, statOf, positionOf);
    default:
      return null;
  }
}

// Walk a member's picks_by_gw, find which GW each chip was played in each half,
// and compute that chip's gain by its own formula.
function scoreMemberChips(blob, gwIndex, finishedGwIds, positionOf) {
  const result = { H1: {}, H2: {} };
  for (const key of CHIP_KEYS) {
    result.H1[key] = null;
    result.H2[key] = null;
  }
  for (const gw of finishedGwIds) {
    const pg = picksForGw(blob, gw);
    const chip = pg?.active_chip;
    if (!chip || !CHIP_KEYS.includes(chip)) continue;
    const half = chipHalf(gw);
    // first occurrence per chip-half wins (each chip is once per half anyway)
    if (result[half][chip]) continue;
    result[half][chip] = { gw, gain: gainForChip(chip, blob, gw, gwIndex, positionOf) };
  }
  return result;
}

// Regret layer (your data only, per half): your best-possible bench week and
// best captain week — a SECONDARY hindsight line on the BB/TC cards.
function scoreMemberExtras(blob, gwIndex, finishedGwIds) {
  const extras = {
    H1: { bestBenchGw: null, bestBench: 0, bestCaptainGw: null, bestCaptain: 0 },
    H2: { bestBenchGw: null, bestBench: 0, bestCaptainGw: null, bestCaptain: 0 },
  };
  for (const gw of finishedGwIds) {
    const map = gwIndex[gw];
    const statOf = (id) => (map && map.get(id)) || { points: 0, minutes: 0 };
    const picks = picksForGw(blob, gw)?.picks;
    if (!picks || picks.length === 0) continue;
    const half = chipHalf(gw);
    const bench = benchBoostGain(picks, statOf);
    if (bench > extras[half].bestBench) {
      extras[half].bestBench = bench;
      extras[half].bestBenchGw = gw;
    }
    const cap = tripleCaptainGain(picks, statOf);
    if (cap > extras[half].bestCaptain) {
      extras[half].bestCaptain = cap;
      extras[half].bestCaptainGw = gw;
    }
  }
  return extras;
}

/**
 * Compute the full Beat 7 dataset for a league.
 * @returns {{
 *   you: { name, chips, extras } | null,
 *   leagueBest: { H1: Object, H2: Object },   // per chip: {value,name,gw} | null
 *   count: number
 * }}
 */
export function computeChips({ entries, members, you, seasonElements, finishedGwIds, playerPosition }) {
  const gwIndex = buildGwPointsIndex(seasonElements, finishedGwIds);
  const positionOf = playerPosition;

  const rows = members
    .map((id) => {
      const blob = entries[id];
      if (!blob) return null;
      return {
        entryId: id,
        name: memberName(blob, id),
        isYou: id === you,
        chips: scoreMemberChips(blob, gwIndex, finishedGwIds, positionOf),
        extras: scoreMemberExtras(blob, gwIndex, finishedGwIds),
      };
    })
    .filter(Boolean);

  // League best per chip per half: highest gain among members who played it
  // (null gains — e.g. back-to-back chip — are skipped). Tie-break by entryId.
  const leagueBest = { H1: {}, H2: {} };
  for (const half of ['H1', 'H2']) {
    for (const key of CHIP_KEYS) {
      let best = null;
      for (const r of rows) {
        const played = r.chips[half][key];
        if (!played || played.gain == null) continue;
        if (
          !best ||
          played.gain > best.value ||
          (played.gain === best.value && r.entryId < best.entryId)
        ) {
          best = { value: played.gain, name: r.name, gw: played.gw, entryId: r.entryId, isYou: r.isYou };
        }
      }
      leagueBest[half][key] = best;
    }
  }

  const youRow = rows.find((r) => r.isYou) || null;

  return {
    you: youRow ? { name: youRow.name, chips: youRow.chips, extras: youRow.extras } : null,
    leagueBest,
    count: rows.length,
  };
}

// Display label for each chip key (user-facing).
export const CHIP_LABEL = {
  wildcard: 'Wildcard',
  freehit: 'Free Hit',
  bboost: 'Bench Boost',
  '3xc': 'Triple Captain',
};

export { ordinal };

// Dry verdict, both directions, implicit from the gaps — punch at the decision,
// never the person. Reads your best-returning chip this half against the league
// best for it; if you led the league on a chip, that's the vindication.
export function buildVerdict(result, half) {
  if (!result?.you) return '';
  const mine = result.you.chips[half];
  const played = CHIP_KEYS.filter((k) => mine[k] && mine[k].gain != null);
  if (played.length === 0) return `No chips with a clean read in ${half === 'H1' ? 'the first half' : 'the second half'}.`;

  // Your best chip outcome this half.
  const top = played.reduce((a, b) => (mine[b].gain > mine[a].gain ? b : a));
  const topGain = mine[top].gain;
  const lb = result.leagueBest[half][top];

  if (lb && lb.isYou) {
    return `Your GW${mine[top].gw} ${CHIP_LABEL[top]} (+${topGain}) was the best ${CHIP_LABEL[top]} return in your league.`;
  }
  if (lb) {
    const gap = lb.value - topGain;
    if (gap > 0) {
      return `Your best lever was the GW${mine[top].gw} ${CHIP_LABEL[top]} (+${topGain}); ${lb.name} got +${lb.value} from theirs in GW${lb.gw}.`;
    }
  }
  return `Your best lever this half was the GW${mine[top].gw} ${CHIP_LABEL[top]} (+${topGain}).`;
}
