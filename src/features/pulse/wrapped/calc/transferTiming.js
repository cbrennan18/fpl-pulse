// features/pulse/wrapped/calc/transferTiming.js
//
// Beat 3 — "Transfer Timing" calc. Pure functions over the once-fetched pack
// (mirrors setAndForget.js / captain.js: data in, numbers out, NO fetching).
//
// The beat plots TWO things at once:
//   • WHEN you transferred  — the corridor (days before that GW's deadline).
//   • HOW WELL it paid off   — the points "swing" the transfer produced.
// So the read isn't "are you early or late" but "do your moves at a given timing
// actually return?".
//
// Swing per transfer (PINNED):
//   targetGw   = transfer.event (the GW the transfer applies to — the immediate
//                "next-GW" payoff).
//   grossSwing = points(element_in, targetGw) − points(element_out, targetGw),
//                RAW unmultiplied total_points from seasonElements (no captain
//                multiplier, no autosub — a two-player head-to-head, not an XI).
//   netSwing   = grossSwing − cost  (FPL `cost` is the hit as a positive points
//                value, e.g. 4). Hits make the swing net, consistent with beat 1's
//                "hits are management value" — this is what produces the negative
//                corridor averages the spec's "−0.4 avg" example shows.
//
// Exclusions (applied IDENTICALLY to every member so the league frame is fair):
//   • the GW1 draft isn't a transfer — absent from FPL /transfers/ anyway.
//   • wildcard / free-hit GWs are bulk one-moment moves (≈15 transfers at one
//     timestamp) — counting each double-counts a single decision and distorts both
//     volume and corridor swing; the chip story lives in beat 7. Excluded.
//   • transfers with no timestamp, an unmappable event, or an unfinished targetGw
//     are dropped (no payoff to measure yet).

import { buildGwPointsIndex, memberName } from './setAndForget';

const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// 8 corridors by days-before-deadline: index 0 = deadline day, … 6 = six days
// early, 7 = "7+ days" (everything a week or more out). x-axis renders 7+ (left)
// → 0 (right), so deadline-day tension sits on the right.
export const CORRIDOR_COUNT = 8;

export function corridorOf(hours) {
  const days = Math.floor(hours / 24);
  if (days <= 0) return 0;
  if (days >= 7) return 7;
  return days;
}

// Short label per corridor index for axis ticks / captions.
export function corridorLabel(corridor) {
  if (corridor === 0) return 'Day 0';
  if (corridor === 7) return 'Day 7+';
  return `Day ${corridor}`;
}

/** { [gw]: deadline epoch ms } from bootstrap.events. */
export function buildDeadlineIndex(bootstrap) {
  const index = {};
  for (const e of bootstrap?.events || []) {
    const t = e?.deadline_time ? Date.parse(e.deadline_time) : NaN;
    if (!Number.isNaN(t)) index[e.id] = t;
  }
  return index;
}

const BULK_CHIPS = new Set(['wildcard', 'freehit']);

/** True if this member played a wildcard / free hit in `event` (bulk move GW). */
export function isChipBulkGw(blob, event) {
  const gw = blob?.picks_by_gw?.[event] ?? blob?.picks_by_gw?.[String(event)];
  return BULK_CHIPS.has(gw?.active_chip);
}

/**
 * Per kept transfer for one member: its timing + corridor + gross/net swing.
 * Drops the GW1 draft (not present), wildcard/free-hit GWs, and transfers with
 * no timestamp / unmappable event / unfinished targetGw.
 */
export function transferSwings(blob, gwIndex, deadlineIndex, finishedSet) {
  const out = [];
  for (const t of blob?.transfers || []) {
    const event = Number(t?.event ?? 0);
    if (!event || !finishedSet.has(event)) continue;     // payoff GW must be played
    if (isChipBulkGw(blob, event)) continue;             // bulk chip move
    const deadline = deadlineIndex[event];
    const when = t?.time ? Date.parse(t.time) : NaN;
    if (deadline == null || Number.isNaN(when)) continue; // unmappable / no timestamp

    const hours = (deadline - when) / MS_PER_HOUR;
    if (hours < 0) continue;                              // anomalous (after deadline)

    const map = gwIndex[event];
    const inPts = map?.get(Number(t.element_in))?.points ?? 0;
    const outPts = map?.get(Number(t.element_out))?.points ?? 0;
    const grossSwing = inPts - outPts;
    const netSwing = grossSwing - Number(t?.cost ?? 0);

    out.push({ event, hours, corridor: corridorOf(hours), grossSwing, netSwing });
  }
  return out;
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// Per-manager summary from their kept transfers (netSwing is the headline metric).
function summarise(name, isYou, entryId, swings) {
  const swingVals = swings.map((s) => s.netSwing);
  const hoursVals = swings.map((s) => s.hours);

  const byCorridorMap = new Map();
  for (const s of swings) {
    const c = byCorridorMap.get(s.corridor) || { sum: 0, count: 0 };
    c.sum += s.netSwing;
    c.count += 1;
    byCorridorMap.set(s.corridor, c);
  }
  const byCorridor = [...byCorridorMap.entries()]
    .map(([corridor, { sum, count }]) => ({ corridor, avgSwing: sum / count, count }))
    .sort((a, b) => a.corridor - b.corridor);

  return {
    entryId,
    name,
    isYou,
    total: swings.length,
    totalSwing: swingVals.reduce((a, b) => a + b, 0),
    avgSwingPerTransfer: mean(swingVals),
    avgHours: mean(hoursVals),
    earliestHours: hoursVals.length ? Math.max(...hoursVals) : 0,
    latestHours: hoursVals.length ? Math.min(...hoursVals) : 0,
    byCorridor,
  };
}

/**
 * Full Beat 3 dataset for a league.
 * @returns {{
 *   you: object|null,
 *   league: object,
 *   dots: Array<{entryId,name,isYou,corridor,avgSwing,count}>,
 *   corridorBaselines: Array<{corridor,leagueAvgSwing,count}>,
 *   count: number
 * }}
 */
export function computeTransferTiming({
  entries,
  members,
  you,
  bootstrap,
  seasonElements,
  finishedGwIds,
}) {
  const gwIndex = buildGwPointsIndex(seasonElements, finishedGwIds);
  const deadlineIndex = buildDeadlineIndex(bootstrap);
  const finishedSet = new Set(finishedGwIds);

  const summaries = members
    .map((id) => {
      const blob = entries[id];
      if (!blob) return null;
      const swings = transferSwings(blob, gwIndex, deadlineIndex, finishedSet);
      if (swings.length === 0) return null; // a manager who never transferred
      return summarise(memberName(blob, id), id === you, id, swings);
    })
    .filter(Boolean);

  // One dot per (manager, corridor) — the aggregation that tames overplotting.
  const dots = [];
  for (const m of summaries) {
    for (const c of m.byCorridor) {
      dots.push({
        entryId: m.entryId,
        name: m.name,
        isYou: m.isYou,
        corridor: c.corridor,
        avgSwing: c.avgSwing,
        count: c.count,
      });
    }
  }

  // League mean swing per corridor (the per-corridor baseline mark).
  const corridorBaselines = [];
  for (let corridor = 0; corridor < CORRIDOR_COUNT; corridor += 1) {
    const here = dots.filter((d) => d.corridor === corridor);
    if (here.length === 0) continue;
    // weight by transfer volume so the baseline reflects transfers, not managers
    const totalCount = here.reduce((a, d) => a + d.count, 0);
    const weighted = here.reduce((a, d) => a + d.avgSwing * d.count, 0);
    corridorBaselines.push({ corridor, leagueAvgSwing: weighted / totalCount, count: totalCount });
  }

  const youRow = summaries.find((m) => m.isYou) || null;

  const leagueAvgVals = summaries.map((m) => m.avgSwingPerTransfer);
  const bySwing = [...summaries].sort(
    (a, b) => b.avgSwingPerTransfer - a.avgSwingPerTransfer || a.entryId - b.entryId
  );
  const byEarliest = [...summaries].sort((a, b) => b.earliestHours - a.earliestHours);
  const byLatest = [...summaries].sort((a, b) => a.latestHours - b.latestHours);

  const top = bySwing[0];
  const bottom = bySwing[bySwing.length - 1];
  const earliest = byEarliest[0];
  const latest = byLatest[0];

  const league = {
    avgSwingPerTransfer: mean(leagueAvgVals),
    best: top ? { name: top.name, swing: top.avgSwingPerTransfer } : null,
    worst: bottom ? { name: bottom.name, swing: bottom.avgSwingPerTransfer } : null,
    avgHours: mean(summaries.map((m) => m.avgHours)),
    earliest: earliest ? { name: earliest.name, hours: earliest.earliestHours } : null,
    latest: latest ? { name: latest.name, hours: latest.latestHours } : null,
  };

  return { you: youRow, league, dots, corridorBaselines, count: summaries.length };
}

// Round to one decimal, signed, for copy ("+2.4" / "−0.4").
export function fmtSwing(v) {
  const r = Math.round(v * 10) / 10;
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)}`;
}

// hours → a human cadence ("2h", "3 days").
export function fmtTiming(hours) {
  if (hours < 24) return `${Math.round(hours)}h`;
  const d = Math.round(hours / 24);
  return `${d} day${d === 1 ? '' : 's'}`;
}

/**
 * Dry, both-directions, punch-at-the-decision verdict. Reads the timing-QUALITY
 * shape: where do your dots sit on the swing axis, early vs late?
 */
export function buildVerdict(you) {
  if (!you || you.total === 0) return '';

  const early = you.byCorridor.filter((c) => c.corridor >= 4);
  const late = you.byCorridor.filter((c) => c.corridor <= 1);
  const earlyAvg = early.length
    ? early.reduce((a, c) => a + c.avgSwing * c.count, 0) / early.reduce((a, c) => a + c.count, 0)
    : null;
  const lateAvg = late.length
    ? late.reduce((a, c) => a + c.avgSwing * c.count, 0) / late.reduce((a, c) => a + c.count, 0)
    : null;

  if (earlyAvg != null && lateAvg != null && Math.abs(earlyAvg - lateAvg) >= 1) {
    if (earlyAvg > lateAvg) {
      return `Your early moves swing ${fmtSwing(earlyAvg)} a transfer; your deadline-day buys, ${fmtSwing(lateAvg)}. The planning pays.`;
    }
    return `You buy best on the buzzer — deadline day swings ${fmtSwing(lateAvg)} a transfer, your early moves only ${fmtSwing(earlyAvg)}.`;
  }

  const avg = you.avgSwingPerTransfer;
  if (avg >= 1) return `Whenever you move, it pays — ${fmtSwing(avg)} a transfer on average.`;
  if (avg <= -1) return `Your transfers cost you ${fmtSwing(avg)} a go on average. The market wasn't kind.`;
  return `Whenever you move, the swing's about the same — timing isn't where you win or lose it.`;
}
