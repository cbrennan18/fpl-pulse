// features/pulse/wrapped/calc/race.js
//
// Beat 10 — "The Race" (the CLIMAX). Pure functions over the once-fetched pack
// (data in, numbers out, NO fetching). A mini-league season reduces to one
// question — did I beat them? — so this resolves to a single NAMED nemesis with
// an explicit win/loss verdict.
//
// Data source (resolved): each member's IN-LEAGUE rank per finished GW, recomputed
// from cumulative net totals already in the pack — blob.gw_summaries[gw].total
// (verified live: total[gw] = total[gw-1] + points − event_transfers_cost, i.e.
// NET of hits, consistent with beats 1/5/6). This is the member's rank WITHIN the
// mini-league each week, NOT their global overall_rank. No seasonElements spine,
// no recompute from picks.
//
// Nemesis = reading (b), pinned by design-spec §4: "the season-long rival whose
// rank line tracked yours most (not merely the final-table neighbour)." Metric:
// smallest MEAN ABSOLUTE rank gap across GWs where both were present (the line that
// stayed nearest yours all season), tie-broken by MORE LEAD-CHANGES (the rival you
// actually traded places with — the "clawing"), then entryId. The league winner is
// NOT excluded from candidates: if your closest season-long tracker IS the winner
// (you lost the title race to them), that genuine rivalry is the honest climax.

import { memberName, ordinal } from './setAndForget';

export { ordinal };

// One member's cumulative NET total at a GW, or null if they weren't present that
// week (mid-season join / no summary row).
export function totalAt(blob, gw) {
  const s = blob?.gw_summaries?.[gw] ?? blob?.gw_summaries?.[String(gw)];
  if (!s) return null;
  return Number(s.total ?? 0);
}

/**
 * Per-GW in-league rank for every member, present-aware.
 * @returns {{ [entryId:number]: { [gw:number]: number } }} rank (1 = top) among
 *          members present that GW; absent members get no entry for that GW.
 */
export function buildRankSeries({ entries, members, finishedGwIds }) {
  const ranks = {};
  for (const id of members) ranks[id] = {};
  for (const gw of finishedGwIds) {
    const present = [];
    for (const id of members) {
      const t = totalAt(entries[id], gw);
      if (t === null) continue;
      present.push({ id, total: t });
    }
    // Rank by cumulative net total desc; entryId tie-break for determinism.
    present.sort((a, b) => b.total - a.total || a.id - b.id);
    present.forEach((m, i) => { ranks[m.id][gw] = i + 1; });
  }
  return ranks;
}

/**
 * The nemesis: closest season-long tracker (reading b). Mean abs rank gap →
 * lead-changes → entryId. Compares only GWs where BOTH were present. Excludes you;
 * the winner is a valid candidate.
 * @returns {{ entryId:number, meanGap:number, leadChanges:number }|null}
 */
export function selectNemesis({ rankSeries, members, you, finishedGwIds }) {
  const youRanks = rankSeries[you] || {};
  let best = null;
  for (const id of members) {
    if (id === you) continue;
    const theirRanks = rankSeries[id] || {};
    let sumGap = 0;
    let n = 0;
    let leadChanges = 0;
    let prevSign = null;
    for (const gw of finishedGwIds) {
      const ry = youRanks[gw];
      const rt = theirRanks[gw];
      if (ry == null || rt == null) continue; // both present only
      sumGap += Math.abs(ry - rt);
      n += 1;
      const sign = Math.sign(ry - rt); // <0 you ahead, >0 they ahead
      if (sign !== 0) {
        if (prevSign !== null && sign !== prevSign) leadChanges += 1;
        prevSign = sign;
      }
    }
    if (n === 0) continue;
    const cand = { entryId: id, meanGap: sumGap / n, leadChanges };
    if (
      !best ||
      cand.meanGap < best.meanGap ||
      (cand.meanGap === best.meanGap && cand.leadChanges > best.leadChanges) ||
      (cand.meanGap === best.meanGap && cand.leadChanges === best.leadChanges && cand.entryId < best.entryId)
    ) {
      best = cand;
    }
  }
  return best;
}

/**
 * The full Beat 10 dataset for a league. Resolves the three plotted lines
 * (you / nemesis / context), their aligned rank series, your peak, and the final
 * named margin + win/loss.
 */
export function computeRace({ entries, members, you, finishedGwIds }) {
  if (!finishedGwIds?.length || !members?.length || !entries?.[you]) {
    return { you: null };
  }

  const rankSeries = buildRankSeries({ entries, members, finishedGwIds });
  const lastGw = finishedGwIds[finishedGwIds.length - 1];
  const count = members.length;

  const finalTotal = (id) => totalAt(entries[id], lastGw) ?? -Infinity;
  const finalRankOf = (id) => rankSeries[id]?.[lastGw] ?? null;
  const nameOf = (id) => (id == null ? null : memberName(entries[id], id));
  const seriesOf = (id) =>
    id == null ? null : finishedGwIds.map((gw) => rankSeries[id]?.[gw] ?? null);

  // Winner = final rank 1 (max final total; entryId tie-break).
  let winnerId = null;
  for (const id of members) {
    if (
      winnerId === null ||
      finalTotal(id) > finalTotal(winnerId) ||
      (finalTotal(id) === finalTotal(winnerId) && id < winnerId)
    ) {
      winnerId = id;
    }
  }

  const nem = selectNemesis({ rankSeries, members, you, finishedGwIds });
  const nemesisId = nem?.entryId ?? null;

  // Context line = the winner, unless the winner is already you or the nemesis;
  // then it's the best-finishing OTHER member (so we still get a distinct 3rd line).
  let contextId = winnerId;
  if (contextId === you || contextId === nemesisId) {
    const others = members
      .filter((id) => id !== you && id !== nemesisId)
      .sort((a, b) => finalTotal(b) - finalTotal(a) || a - b);
    contextId = others[0] ?? null;
  }

  // Your peak = highest in-league rank reached (lowest number).
  const youSeries = seriesOf(you);
  let yourPeakIndex = 0;
  let peakRank = Infinity;
  youSeries.forEach((r, i) => {
    if (r != null && r < peakRank) {
      peakRank = r;
      yourPeakIndex = i;
    }
  });

  const youFinish = finalRankOf(you);
  const nemFinish = nemesisId == null ? null : finalRankOf(nemesisId);
  const youAreWinner = winnerId === you;

  const margin =
    nemesisId == null
      ? 0
      : (totalAt(entries[you], lastGw) ?? 0) - (totalAt(entries[nemesisId], lastGw) ?? 0);
  // Win/loss by final standing (robust to a points tie via the rank tie-break).
  const youWon = nemFinish != null && youFinish != null ? youFinish < nemFinish : margin > 0;

  // Legend label for the muted third line: the winner if it is one, else its
  // actual finishing position ("3rd") — always accurate, never mislabelled.
  const contextLabel = !contextId
    ? null
    : contextId === winnerId
      ? 'Winner'
      : ordinal(finalRankOf(contextId));

  return {
    you: {
      entryId: you,
      name: nameOf(you),
      series: youSeries,
      finish: youFinish,
      peakRank,
      yourPeakIndex,
    },
    nemesis:
      nemesisId == null
        ? null
        : {
            entryId: nemesisId,
            name: nameOf(nemesisId),
            series: seriesOf(nemesisId),
            finish: nemFinish,
            meanGap: nem.meanGap,
            leadChanges: nem.leadChanges,
          },
    context:
      contextId == null
        ? null
        : {
            entryId: contextId,
            name: nameOf(contextId),
            series: seriesOf(contextId),
            finish: finalRankOf(contextId),
            isWinner: contextId === winnerId,
          },
    contextLabel,
    winnerId,
    gws: finishedGwIds,
    count,
    margin,
    youWon,
    youAreWinner,
  };
}

/**
 * The climax verdict: named, explicit win/loss binary, dry, reads both directions.
 * Punches at the RESULT, never the person. Handles the you-won-the-league framing.
 */
export function buildVerdict(result) {
  if (!result?.you || !result.nemesis) return '';
  const { nemesis, margin, youWon, youAreWinner } = result;
  const m = Math.abs(margin);

  if (m === 0) {
    return youWon
      ? `Dead level on points — you edged ${nemesis.name} on the table.`
      : `Dead level on points — ${nemesis.name} edged you on the table.`;
  }
  if (youAreWinner) {
    return `You won it. ${nemesis.name} pushed you closest — held off by ${m}.`;
  }
  if (youWon) {
    return `You held off ${nemesis.name} by ${m}.`;
  }
  return `${nemesis.name} got you by ${m}.`;
}
