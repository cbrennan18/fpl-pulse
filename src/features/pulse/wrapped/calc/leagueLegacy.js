// features/pulse/wrapped/calc/leagueLegacy.js
//
// Beat 11 — "The Coda", half (b): the LEAGUE-LEGACY synthetic what-if. Pure
// functions over per-member history + the pack (data in, numbers out, NO fetching —
// the beat owns the fetch and hands `historyByMember` in).
//
// Why synthetic: per the BEAT-11 SPIKE, real per-league historical finish is NOT
// obtainable from the FPL API. What IS free is each manager's OVERALL season history
// (`entry/{id}/history` → past[] = {season_name, total_points, rank}), and the SAME
// fetch carries every prior season — so multi-season costs no extra calls. v1 re-ranks
// TODAY's members against each other within each past season → a what-if POSITION, and
// reads it as a finish-over-time story. THIS SEASON is appended as a REAL anchor (not a
// what-if) reconciled to Beat 10's finish.
//
// SHAPE OF THE OUTPUT:
//   • standing — ALL current members ranked all-time by a TENURE-SHRUNK average
//     percentile (`pct = position/field`). The shrink (empirical-Bayes toward the
//     population mean) stops a one-season member topping the table. Percentile is the
//     sort key ONLY — never surfaced; the UI leads with the resulting RANK.
//   • series  — YOUR per-season records {season, position, field, real, best} for the
//     dots-on-tracks chart. RAW position/field (not the shrunk key) — real placings.
//   • bestEver — your best raw placing (the gold dot), tie-break lower position then recent.
//
// 2025/26 ANCHOR: appended from the REAL current standing (members ranked by 2025/26
// net total, via race.js's `buildRankSeries` — the SAME ranking Beat 10 lands on, so
// the anchor position reconciles by construction). field = members PRESENT at the last
// finished GW (not members.length). Counts toward both the chart and the sort key.
//
// ROLLOVER GUARD (permanent): SEASON_LABEL is excluded from the synthetic-PAST build
// forever — once 2025/26 lands in past[] (~July), the real anchor always owns it. (Same
// guard `careerRating.js` uses for CURRENT_SEASON.)
//
// SOFT-FAIL is a VETERAN-DEPTH gate, not a headcount: half (b) runs iff ≥ LEGACY_MIN_
// VETERANS members have ≥ VETERAN_SEASON_DEPTH PAST counted seasons. An errored/empty
// member just never enters a field; one bad fetch never sinks the beat.

import { memberName } from './setAndForget';
import { buildRankSeries } from './race';

// A season "counts" when ≥2 of today's members have data for it (need a rival to hold a
// position; kills the field-of-1 → pct 1.0 artefact).
const COUNTED_MIN_PRESENT = 2;

// Veteran-depth omit gate (tunable, independent of league size).
export const LEGACY_MIN_VETERANS = 3;     // this many members must be veterans
export const VETERAN_SEASON_DEPTH = 2;    // …with ≥ this many PAST counted seasons

// Empirical-Bayes pseudo-count: shrink each member's avg pct toward the population mean
// by season count, so a thin-history member can't top the all-time table (beat-4 precedent).
export const SHRINK_PSEUDO_COUNT = 2;

/**
 * @param {Object}   args
 * @param {Object}   args.historyByMember  { [entryId]: past[] | null }
 * @param {Object}   args.entries          pack entries (names + gw_summaries for the anchor)
 * @param {number[]} args.members          current league entry IDs
 * @param {number}   args.you              your entry ID
 * @param {number[]} args.finishedGwIds    finished GW ids (for the 2025/26 anchor rank)
 * @param {string}   args.seasonLabel      current season label, e.g. '2025/26'
 * @returns {null | {
 *   earliest: string,
 *   standing: { ranking: Array<{id,name,isYou}>, you: {rank,of} },
 *   series:   Array<{season,position,field,real,best}>,   // YOUR records, chronological
 *   bestEver: null | { season, position, field }
 * }}
 */
export function computeLeagueLegacy({ historyByMember, entries, members, you, finishedGwIds, seasonLabel }) {
  if (!members?.length) return null;

  // 1. Synthetic past, rollover-guarded: id -> Map(season -> points), dedup last-wins,
  //    EXCLUDING seasonLabel (the real anchor always owns the current season).
  const seasonsById = new Map();
  const pastSeasons = new Set();
  for (const id of members) {
    const past = historyByMember?.[id];
    if (!Array.isArray(past)) continue;
    const m = new Map();
    for (const p of past) {
      const season = p?.season_name;
      const points = Number(p?.total_points);
      if (!season || season === seasonLabel || !Number.isFinite(points)) continue;
      m.set(season, points);
      pastSeasons.add(season);
    }
    if (m.size) seasonsById.set(id, m);
  }

  // 2. Past counted seasons (≥2 present) → per-member RAW records + past-season counts.
  const recsByMember = new Map();   // id -> [{ season, position, field, pct, real?, best? }]
  const pastCount = new Map();      // id -> number of past counted seasons
  let earliest = null;
  for (const season of pastSeasons) {
    const present = [];
    for (const [id, m] of seasonsById) {
      if (m.has(season)) present.push({ id, points: m.get(season) });
    }
    if (present.length < COUNTED_MIN_PRESENT) continue;
    present.sort((a, b) => b.points - a.points || a.id - b.id);
    const field = present.length;
    present.forEach((row, i) => {
      const rec = { season, position: i + 1, field, pct: (i + 1) / field };
      if (!recsByMember.has(row.id)) recsByMember.set(row.id, []);
      recsByMember.get(row.id).push(rec);
      pastCount.set(row.id, (pastCount.get(row.id) || 0) + 1);
    });
    if (earliest === null || season < earliest) earliest = season;
  }

  // 3. Veteran-depth gate (the omit check).
  let veterans = 0;
  for (const c of pastCount.values()) if (c >= VETERAN_SEASON_DEPTH) veterans += 1;
  if (veterans < LEGACY_MIN_VETERANS) return null;

  // 4. Real 2025/26 anchor — reuse buildRankSeries (the exact ranking Beat 10 lands on).
  //    field = members PRESENT at the last finished GW; position = your real league rank.
  const lastGw = finishedGwIds?.length ? finishedGwIds[finishedGwIds.length - 1] : null;
  if (lastGw != null && seasonLabel) {
    const ranks = buildRankSeries({ entries, members, finishedGwIds });
    const present = members.filter((id) => ranks[id]?.[lastGw] != null);
    const field = present.length;
    if (field >= COUNTED_MIN_PRESENT) {
      for (const id of present) {
        const position = ranks[id][lastGw];
        const rec = { season: seasonLabel, position, field, pct: position / field, real: true };
        if (!recsByMember.has(id)) recsByMember.set(id, []);
        recsByMember.get(id).push(rec);
      }
    }
  }

  // 5. Standing — ALL members with ≥1 record (≈ the whole league, via the anchor),
  //    ranked by tenure-shrunk average percentile.
  const rows = [...recsByMember.entries()].map(([id, recs]) => ({
    id,
    rawAvg: recs.reduce((s, r) => s + r.pct, 0) / recs.length,
    count: recs.length,
  }));
  if (!rows.length) return null;
  const prior = rows.reduce((s, r) => s + r.rawAvg, 0) / rows.length;
  for (const r of rows) {
    r.shrunk = (r.rawAvg * r.count + prior * SHRINK_PSEUDO_COUNT) / (r.count + SHRINK_PSEUDO_COUNT);
  }
  rows.sort((a, b) => a.shrunk - b.shrunk || a.id - b.id);
  const ranking = rows.map((r) => ({ id: r.id, name: memberName(entries?.[r.id], r.id), isYou: r.id === you }));
  const youIdx = ranking.findIndex((r) => r.isYou);
  const standing = { ranking, you: { rank: youIdx >= 0 ? youIdx + 1 : null, of: ranking.length } };

  // 6. Your series for the chart — RAW records, chronological (seasonLabel sorts last).
  const series = (recsByMember.get(you) || [])
    .map((r) => ({ season: r.season, position: r.position, field: r.field, real: !!r.real, best: false }))
    .sort((a, b) => (a.season < b.season ? -1 : a.season > b.season ? 1 : 0));

  // 7. Best-ever = your best raw placing: min pct → lower position (the season won) →
  //    most recent. Mark it in the series (the chart renders that record gold).
  let best = null;
  for (const rec of series) {
    const pct = rec.position / rec.field;
    if (
      !best ||
      pct < best.pct ||
      (pct === best.pct && rec.position < best.position) ||
      (pct === best.pct && rec.position === best.position && rec.season > best.season)
    ) {
      best = { season: rec.season, position: rec.position, field: rec.field, pct };
    }
  }
  let bestEver = null;
  if (best) {
    const target = series.find((r) => r.season === best.season);
    if (target) target.best = true;
    bestEver = { season: best.season, position: best.position, field: best.field };
  }

  return { earliest, standing, series, bestEver };
}
