// features/pulse/wrapped/calc/maverick.js
//
// Beat 4 — "Maverick vs Sheep" calc. Pure functions over the once-fetched pack
// (mirrors setAndForget.js / captain.js: data in, numbers out, NO fetching).
//
// The question (story-arc beat 4): independence of thought, with vindication
// attached. Three league-relative parts:
//   a. the league template + your conformity (the leveller)
//   b. a named sheep -> maverick ranking by template %
//   c. your best AND worst differentials (the honest symmetry), surfaced via a
//      guess-the-best-punt quiz with a straight-reveal fallback.
//
// TWO data spines, deliberately split (see the return-window note below):
//   • OWNERSHIP (template / conformity / differential detection) — squad-based,
//     from each member's picks_by_gw (a player in `picks` at all, positions 1–15).
//   • RETURNS (what a differential actually paid) — the seasonElements points
//     spine via buildGwPointsIndex (reused, DRY), STARTED-only and RAW.
//
// Return window — PINNED: a differential's return = the raw points it scored
// while you STARTED it (saved position <= 11), summed over the season. Benched
// weeks return nothing (you didn't field them); the captain multiplier is ignored
// (RAW) so it's a like-for-like "which punt paid off", not an armband decision
// (that's beat 2). Ownership is squad-based; only returns are started-only.

import { buildGwPointsIndex, memberName, ordinal } from './setAndForget';

// --- Thresholds (league-relative, applied identically to every member) --------
//
// TEMPLATE_EO verified against live league 852082 (15 members, 38 GWs): EO>=0.5
// cleared only 3 players (the <5 fallback fired every time, making 0.5 cosmetic);
// EO>=0.35 clears ~8, so EO is the real mechanism and the fallback is a true edge
// case for genuinely low-consensus leagues.
export const TEMPLATE_EO = 0.35;        // effective-ownership share to be "template"
export const TEMPLATE_MIN = 5;          // below this many, fall back to top-N by EO
export const TEMPLATE_FALLBACK_N = 8;
export const DIFF_MIN_WEEKS = 3;        // your commitment gate (best AND worst)
export const DIFF_MIN_RETURN = 15;      // minimum-impact floor (best + quiz only)

// A differential is owned by <= this many DISTINCT managers (~25% of the league).
export function diffMaxOwners(n) {
  return Math.max(2, Math.ceil(n * 0.25));
}

export function conformityPct(x) {
  return Math.round(x * 100);
}

// --- Ownership ---------------------------------------------------------------

/**
 * One member's per-player ownership across the finished GWs.
 * @returns {Map<number, {weeksInSquad:number, weeksStarted:number, pts:number}>}
 *   pts = raw points scored while STARTED (position <= 11). Benched GWs add to
 *   weeksInSquad but not weeksStarted/pts.
 */
export function memberOwnership(blob, gwIndex, finishedGwIds) {
  const own = new Map();
  for (const gw of finishedGwIds) {
    const pg = blob?.picks_by_gw?.[gw] ?? blob?.picks_by_gw?.[String(gw)];
    const picks = pg?.picks || [];
    const map = gwIndex[gw];
    for (const p of picks) {
      let rec = own.get(p.element);
      if (!rec) {
        rec = { weeksInSquad: 0, weeksStarted: 0, pts: 0 };
        own.set(p.element, rec);
      }
      rec.weeksInSquad += 1;
      if (p.position <= 11) {
        rec.weeksStarted += 1;
        rec.pts += Number(map?.get(p.element)?.points ?? 0);
      }
    }
  }
  return own;
}

function emptyResult() {
  return {
    you: null,
    count: 0,
    maxOwners: 0,
    leagueAvgConformity: 0,
    topTemplate: [],
    templateCount: 0,
    ranking: [],
    maverickNamed: null,
    best: null,
    worst: null,
    quiz: null,
    detailByEntry: {},
  };
}

/**
 * Compute the full Beat 4 dataset for a league.
 */
export function computeMaverick({ entries, members, you, seasonElements, finishedGwIds, playerName }) {
  const nameOf = playerName || ((id) => `#${id}`);
  const gwIndex = buildGwPointsIndex(seasonElements, finishedGwIds);
  const G = finishedGwIds.length;

  const rows = members
    .map((id) => {
      const blob = entries[id];
      if (!blob) return null;
      return {
        entryId: id,
        name: memberName(blob, id),
        isYou: id === you,
        own: memberOwnership(blob, gwIndex, finishedGwIds),
      };
    })
    .filter(Boolean);

  const N = rows.length;
  if (N === 0) return emptyResult();

  // League ownership per player: total squad-weeks + distinct-owner count.
  const leagueWeeks = new Map(); // element -> total squad-weeks across the league
  const owners = new Map(); // element -> distinct owners
  for (const r of rows) {
    for (const [el, rec] of r.own) {
      leagueWeeks.set(el, (leagueWeeks.get(el) || 0) + rec.weeksInSquad);
      owners.set(el, (owners.get(el) || 0) + 1);
    }
  }
  const denom = N * G || 1;
  const eoOf = (el) => (leagueWeeks.get(el) || 0) / denom;

  // Template set: EO >= threshold; if too few clear it (low-consensus league),
  // fall back to the top-N most-owned so conformity always has a stable base.
  const byEo = [...leagueWeeks.keys()].sort((a, b) => eoOf(b) - eoOf(a) || a - b);
  let templateIds = byEo.filter((el) => eoOf(el) >= TEMPLATE_EO);
  if (templateIds.length < TEMPLATE_MIN) templateIds = byEo.slice(0, TEMPLATE_FALLBACK_N);
  const templateSet = new Set(templateIds);
  const topTemplate = byEo.slice(0, 6).map((el) => ({
    element: el,
    name: nameOf(el),
    eo: eoOf(el),
    owners: owners.get(el) || 0,
  }));

  // Conformity per member = template squad-weeks / total squad-weeks (weeks-held
  // weighted: a template player owned longer counts for more). Also captures the
  // named split (template players held vs where they went their own way) for the
  // tap→detail sheet — same ownership pass, no extra work.
  for (const r of rows) {
    let templateWeeks = 0;
    let totalWeeks = 0;
    let templateOwned = 0;
    const templatePlayers = [];
    const offTemplatePlayers = [];
    for (const [el, rec] of r.own) {
      totalWeeks += rec.weeksInSquad;
      if (templateSet.has(el)) {
        templateWeeks += rec.weeksInSquad;
        templateOwned += 1;
        templatePlayers.push({ element: el, name: nameOf(el), weeks: rec.weeksInSquad });
      } else {
        offTemplatePlayers.push({
          element: el,
          name: nameOf(el),
          weeks: rec.weeksInSquad,
          owners: owners.get(el) || 0,
        });
      }
    }
    r.conformity = totalWeeks > 0 ? templateWeeks / totalWeeks : 0;
    r.templateOwned = templateOwned;
    r.templatePlayers = templatePlayers.sort((a, b) => b.weeks - a.weeks || a.element - b.element);
    r.offTemplatePlayers = offTemplatePlayers.sort((a, b) => b.weeks - a.weeks || a.element - b.element);
  }

  // ASCENDING template %: rank 1 = lowest template = MOST maverick (at the top).
  // You're typically high template, so you fall to/near the foot of the list — the
  // RankTable's sticky YOU row keeps you pinned/visible there.
  const ranking = [...rows]
    .sort((a, b) => a.conformity - b.conformity || a.entryId - b.entryId)
    .map((r, i) => ({
      entryId: r.entryId,
      name: r.name,
      conformity: r.conformity,
      isYou: r.isYou,
      rank: i + 1,
    }));

  const youRank = ranking.find((r) => r.isYou) || null;
  const youRow = rows.find((r) => r.isYou) || null;
  const leagueAvgConformity = rows.reduce((s, r) => s + r.conformity, 0) / N;

  // Per-manager lineup breakdown for the ranking's tap→detail sheet, keyed by entryId.
  const detailByEntry = {};
  for (const r of rows) {
    detailByEntry[r.entryId] = {
      conformity: r.conformity,
      templatePlayers: r.templatePlayers,
      offTemplatePlayers: r.offTemplatePlayers,
    };
  }

  // The named "resident contrarian" = the least-conformist OTHER manager. With the
  // ascending sort that's now the FIRST other in the ranking (rank 1 = most maverick).
  const others = ranking.filter((r) => !r.isYou);
  const maverickNamed = others.length ? others[0] : null;

  // Your differentials.
  const maxOwners = diffMaxOwners(N);
  let best = null;
  let worst = null;
  let quiz = null;
  if (youRow) {
    const cands = [...youRow.own.entries()]
      // A template player is never a differential — owning the consensus isn't
      // contrarian, even if its distinct-owner count happens to be low.
      .filter(([el, rec]) =>
        !templateSet.has(el) && (owners.get(el) || 0) <= maxOwners && rec.weeksInSquad >= DIFF_MIN_WEEKS)
      .map(([el, rec]) => ({
        element: el,
        name: nameOf(el),
        owners: owners.get(el) || 0,
        onlyYou: (owners.get(el) || 0) === 1,
        weeksInSquad: rec.weeksInSquad,
        weeksStarted: rec.weeksStarted,
        pts: rec.pts, // started-only raw return
        ppg: rec.weeksStarted > 0 ? rec.pts / rec.weeksStarted : 0, // per started GW
      }));

    if (cands.length) {
      const byReturn = [...cands].sort((a, b) => b.pts - a.pts || a.element - b.element);
      const bestCand = byReturn[0];
      best = bestCand.pts >= DIFF_MIN_RETURN ? bestCand : null;
      const worstCand = byReturn[byReturn.length - 1];
      // Only surface a worst when it's a different player from the best.
      worst = worstCand.element !== bestCand.element ? worstCand : null;
      quiz = pickQuiz(cands);
    }
  }

  return {
    you: youRank ? { ...youRank, templateOwned: youRow.templateOwned } : null,
    count: N,
    maxOwners, // the differential ownership ceiling — drives the screen-2 "punt" copy
    leagueAvgConformity,
    topTemplate,
    templateCount: templateSet.size,
    ranking,
    maverickNamed,
    best,
    worst,
    quiz,
    detailByEntry,
  };
}

// --- Quiz --------------------------------------------------------------------

// Deterministic shuffle (seeded by the cards' element ids) so the card order is
// stable across re-renders — no flicker, no eslint motion churn.
function shuffleSeeded(arr) {
  const a = [...arr];
  let seed = a.reduce((s, c) => s + c.element, 7) & 0x7fffffff;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build the 3-card guess-the-best-punt quiz, or null to trigger the straight
 * reveal. The answer is your best eligible differential; the two distractors are
 * the eligible punts whose returns sit CLOSEST BELOW it (genuinely comparable, so
 * the card FACES — which hide the number — are a real judgment call, not
 * "read 3 numbers, pick the largest"). Needs >= 3 eligible (>= DIFF_MIN_RETURN).
 */
export function pickQuiz(cands) {
  const eligible = cands.filter((c) => c.pts >= DIFF_MIN_RETURN);
  if (eligible.length < 3) return null;
  const sorted = [...eligible].sort((a, b) => b.pts - a.pts || a.element - b.element);
  const answer = sorted[0];
  const distractors = sorted.slice(1, 3); // 2 closest below the best
  const cards = shuffleSeeded([answer, ...distractors]).map((c) => ({
    element: c.element,
    name: c.name,
    weeksInSquad: c.weeksInSquad,
    owners: c.owners,
    onlyYou: c.onlyYou,
    pts: c.pts, // carried for the REVEAL; the card face must not render it pre-reveal
  }));
  return { cards, answerElement: answer.element };
}

// --- Verdict -----------------------------------------------------------------

// Dry, both directions, punch at the DECISION not the person. The bold-and-lost
// manager's line names the streak/call ("going your own way cost"), never a rival.
export function buildVerdict({ you, best, worst, count }) {
  if (!you) return { label: '', line: '' };
  const p = conformityPct(you.conformity);

  // Rank is now ASCENDING by template % — rank 1 = MOST maverick (lowest template),
  // rank `count` = MOST template / least maverick. You typically sit near the foot.
  let label;
  if (you.rank <= Math.ceil(count * 0.34)) {
    label = `You were ${p}% template — one of the league's mavericks, ${ordinal(you.rank)} of ${count}.`;
  } else if (you.rank >= Math.ceil(count * 0.67)) {
    label = `You were ${p}% template — most template, least maverick, ${ordinal(you.rank)} of ${count}.`;
  } else {
    label = `You were ${p}% template — middle of the pack, ${ordinal(you.rank)} of ${count}.`;
  }

  let line;
  const vindicated = best && (!worst || best.pts >= worst.pts + DIFF_MIN_RETURN);
  if (vindicated) {
    const tag = best.onlyYou ? 'owned by you alone' : 'barely owned in your league';
    line = `Your boldest call paid off: ${best.name}, ${tag}, returned ${best.pts}.`;
  } else if (worst) {
    const tag = worst.onlyYou ? 'on your own' : 'against the grain';
    line = `Going your own way cut both ways — ${worst.name} returned just ${worst.pts} over ${worst.weeksInSquad} weeks ${tag}.`;
  } else if (best) {
    const tag = best.onlyYou ? 'owned by you alone' : 'barely owned in your league';
    line = `Your one real punt: ${best.name}, ${tag}, returned ${best.pts}.`;
  } else {
    line = `You stuck close to the league's favourites — not much went against the grain.`;
  }

  return { label, line };
}
