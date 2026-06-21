// features/pulse/wrapped/calc/gameweekKings.js
//
// Beat 6 — "Gameweek Kings". Pure functions over the once-fetched pack (data in,
// numbers out, NO fetching). Opens Act III on an UP energy: who owned the most
// individual gameweeks, plus YOUR single best gameweek (a guaranteed personal
// peak for everyone, not just the strong managers).
//
// Data source (resolved): each manager's per-GW score is read straight from
// blob.gw_summaries[gw] — no seasonElements spine, no recompute from picks (this
// beat is the OFFICIAL weekly result, not a reconstruction).
//
// Score = NET of transfer hits: points − event_transfers_cost. The `points`
// field is GROSS (verified live: total[gw] = total[gw-1] + points − cost), so we
// subtract the hit here. This keeps Beat 6 consistent with Beat 1's principle
// that hits are management value already counted in the net total — a manager
// who took a −4 to chase a big week is judged on what actually counted.
//
// Mid-season joiners: a member who joined late competes for fewer crowns (their
// raw win tally is mechanically capped by weeks-present). We do NOT fully solve
// this (audience is stable friends' leagues), but we keep the comparison FAIR by
// framing standing as a manager-count rank ("Nth of N managers") rather than a
// "wins of 38 weeks" fraction, and the best-GW record is absolute points — both
// fair regardless of when you joined. weeksPresent is exposed for honest copy.

import { memberName, ordinal } from './setAndForget';

// One member's net score for a single GW, or null if they didn't play it
// (mid-season join / no summary row). Net = points − transfer-hit cost.
export function gwScore(blob, gw) {
  const s = blob?.gw_summaries?.[gw] ?? blob?.gw_summaries?.[String(gw)];
  if (!s) return null;
  return Number(s.points ?? 0) - Number(s.event_transfers_cost ?? 0);
}

/**
 * Compute the full Beat 6 dataset for a league.
 * @returns {{
 *   winsRows: Array<{entryId,name,wins,weeksPresent,isYou}>,
 *   winsLeaderWins: number, leadShared: boolean, count: number,
 *   you: {entryId,name,wins,weeksPresent,isYou}|null, yourWinsRank: number,
 *   youBest: {value,gw}|null, youBestRank: number, youHoldRecord: boolean,
 *   leagueRecord: {value,gw,name,entryId}|null
 * }}
 */
export function computeGameweekKings({ entries, members, you, finishedGwIds }) {
  // Per-member shell: name, identity, per-GW net scores, weeks actually played.
  const rows = members
    .map((id) => {
      const blob = entries[id];
      if (!blob) return null;
      const scores = {};
      let weeksPresent = 0;
      let best = null;
      for (const gw of finishedGwIds) {
        const score = gwScore(blob, gw);
        if (score === null) continue;
        scores[gw] = score;
        weeksPresent += 1;
        if (!best || score > best.value) best = { value: score, gw };
      }
      return {
        entryId: id,
        name: memberName(blob, id),
        isYou: id === you,
        scores,
        weeksPresent,
        bestGw: best,
        wins: 0,
      };
    })
    .filter(Boolean);

  // Weekly wins: per GW, every member at the week's max score gets a win (shared
  // crown — generous, on-theme for a brag beat).
  for (const gw of finishedGwIds) {
    let max = -Infinity;
    const present = [];
    for (const r of rows) {
      const score = r.scores[gw];
      if (score === undefined) continue;
      present.push(r);
      if (score > max) max = score;
    }
    if (present.length === 0) continue;
    for (const r of present) {
      if (r.scores[gw] === max) r.wins += 1;
    }
  }

  // Standing by wins (entryId tie-break keeps it deterministic).
  const winsRows = [...rows].sort(
    (a, b) => b.wins - a.wins || a.entryId - b.entryId
  );
  const winsLeaderWins = winsRows.length ? winsRows[0].wins : 0;
  const leadShared = winsRows.filter((r) => r.wins === winsLeaderWins).length > 1;

  const youRow = rows.find((r) => r.isYou) || null;
  // Generous rank: 1 + how many managers won strictly more weeks than you (ties share).
  const yourWinsRank = youRow
    ? 1 + winsRows.filter((r) => r.wins > youRow.wins).length
    : 0;

  // Best single GW anyone managed all season (absolute points; entryId tie-break).
  let leagueRecord = null;
  for (const r of rows) {
    if (!r.bestGw) continue;
    if (
      !leagueRecord ||
      r.bestGw.value > leagueRecord.value ||
      (r.bestGw.value === leagueRecord.value && r.entryId < leagueRecord.entryId)
    ) {
      leagueRecord = { value: r.bestGw.value, gw: r.bestGw.gw, name: r.name, entryId: r.entryId };
    }
  }

  const youBest = youRow?.bestGw ?? null;
  // Generous rank of your best week among members' best weeks (ties share).
  const youBestRank = youBest
    ? 1 + rows.filter((r) => r.bestGw && r.bestGw.value > youBest.value).length
    : 0;
  const youHoldRecord = !!(youBest && leagueRecord && youBest.value === leagueRecord.value);

  // Public row shape: drop the internal per-GW `scores` map.
  const publicRow = (r) =>
    r && { entryId: r.entryId, name: r.name, wins: r.wins, weeksPresent: r.weeksPresent, isYou: r.isYou };

  return {
    winsRows: winsRows.map(publicRow),
    winsLeaderWins,
    leadShared,
    count: rows.length,
    you: publicRow(youRow) || null,
    yourWinsRank,
    youBest,
    youBestRank,
    youHoldRecord,
    leagueRecord,
  };
}

/**
 * The verdict: league standing + the guaranteed personal peak. Dry, punches at
 * the decision, reads in both directions (tally-leader AND zero-wins manager,
 * record-holder AND just-your-own-peak). Avoids "haul" (NET scoring → "week").
 */
export function buildVerdict(result) {
  const { you, winsRows, winsLeaderWins, leadShared, youBest, youBestRank, youHoldRecord, leagueRecord } = result;
  if (!you) return '';

  // --- standing clause ---
  const leader = winsRows[0];
  let standing;
  if (you.wins === winsLeaderWins && winsLeaderWins > 0) {
    standing = leadShared
      ? `You won ${you.wins} weeks — as many as anyone in your league.`
      : `You won ${you.wins} weeks — more than anyone in your league.`;
  } else if (you.wins > 0) {
    const w = you.wins === 1 ? 'week' : 'weeks';
    standing = `You won ${you.wins} ${w}; ${leader.name} won ${leader.wins} — the most in your league.`;
  } else {
    standing = `You never topped a single week; ${leader.name} won ${leader.wins}.`;
  }

  // --- personal-peak clause (always a positive) ---
  if (!youBest) return standing;
  let peak;
  if (youHoldRecord) {
    peak = `But your GW${youBest.gw} (${youBest.value}) was the biggest week anyone managed all season.`;
  } else {
    peak = `But your GW${youBest.gw} (${youBest.value}) was your best — the ${ordinal(youBestRank)}-biggest week in your league (${leagueRecord.name} hit ${leagueRecord.value} in GW${leagueRecord.gw}).`;
  }
  return `${standing} ${peak}`;
}
