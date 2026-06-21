import { describe, it, expect } from 'vitest';
import {
  bestInFormationByPosition,
  actualFieldedByPosition,
  recoverableForGw,
  computeBench,
  buildVerdict,
} from './bench';

// --- Fixture helpers ----------------------------------------------------------
// Per-GW stats declared as { id: [points, minutes] } (minutes default 90, i.e.
// "played"). element_type (1 GK / 2 DEF / 3 MID / 4 FWD) is a separate map.

function statOfFrom(map) {
  const m = new Map(
    Object.entries(map).map(([id, [points, minutes = 90]]) => [Number(id), { points, minutes }])
  );
  return (id) => m.get(id) || { points: 0, minutes: 0 };
}
function posFrom(map) {
  return (id) => map[id] ?? 2; // default DEF (outfield)
}
// pick { element, position }: position <= 11 = starter, >= 12 = bench.
function pk(element, position) {
  return { element, position };
}
const name = (id) => `P${id}`;

// --- recoverableForGw: the swing (+8) -----------------------------------------
describe('recoverableForGw — counts the swing, not the gross', () => {
  it('started DEF 2, benched DEF 10 (same position) → +8', () => {
    const picks = [pk(10, 1), pk(1, 2), pk(2, 12)]; // GK starter, DEF starter, DEF bench
    const stat = statOfFrom({ 10: [5], 1: [2], 2: [10] });
    const pos = posFrom({ 10: 1, 1: 2, 2: 2 });
    const r = recoverableForGw(picks, stat, pos, name, true);
    expect(r.best).toBe(15); // GK 5 + best DEF 10
    expect(r.actual).toBe(7); // GK 5 + started DEF 2
    expect(r.recoverable).toBe(8); // the swing, not the gross 10
    expect(r.nailed).toBe(false);
    expect(r.swaps).toEqual([{ in: 'P2', inPts: 10, out: 'P1', outPts: 2, gain: 8 }]);
  });

  // --- nailed-it (0 recoverable) ----------------------------------------------
  it('benched player scored less than the started one → 0 recoverable, nailed', () => {
    const picks = [pk(10, 1), pk(1, 2), pk(2, 12)];
    const stat = statOfFrom({ 10: [5], 1: [2], 2: [1] }); // bench DEF only 1
    const pos = posFrom({ 10: 1, 1: 2, 2: 2 });
    const r = recoverableForGw(picks, stat, pos, name, true);
    expect(r.recoverable).toBe(0);
    expect(r.nailed).toBe(true);
    expect(r.swaps).toEqual([]);
  });

  // --- autosub already recovered (no double-count) ----------------------------
  it('a 0-min starter covered by a same-position sub is in actual, not recoverable', () => {
    const picks = [pk(10, 1), pk(1, 2), pk(2, 12)];
    const stat = statOfFrom({ 10: [5], 1: [0, 0], 2: [10] }); // DEF starter blanked (0 min)
    const pos = posFrom({ 10: 1, 1: 2, 2: 2 });
    const r = recoverableForGw(picks, stat, pos, name, true);
    expect(r.actual).toBe(15); // GK 5 + autosub DEF 10 already counted
    expect(r.best).toBe(15);
    expect(r.recoverable).toBe(0); // Saliba's 10 is NOT double-counted as recoverable
    expect(r.nailed).toBe(true);
  });

  // --- formation-fixed on an AUTOSUB week (the same-position constraint) -------
  it('a high cross-position bench player never covers a different-position blank', () => {
    // DEF starter blanks (0 min). Bench has a FWD on 15 AND a DEF on 5. The blank
    // is filled strictly by the DEF (5), never the FWD. The FWD's 15 only counts
    // against the FWD starter (a legit same-position swing of +9).
    const picks = [
      pk(10, 1), // GK starter
      pk(1, 2), // DEF starter — blanks
      pk(4, 3), // FWD starter
      pk(3, 12), // FWD bench (15)
      pk(2, 13), // DEF bench (5)
    ];
    const stat = statOfFrom({ 10: [5], 1: [0, 0], 4: [6], 3: [15], 2: [5] });
    const pos = posFrom({ 10: 1, 1: 2, 4: 4, 3: 4, 2: 2 });
    const r = recoverableForGw(picks, stat, pos, name, true);
    // actual: GK 5 + DEF blank→strict DEF sub 5 + FWD 6 = 16
    expect(r.actual).toBe(16);
    // best: GK 5 + best DEF 5 + best FWD 15 = 25
    expect(r.best).toBe(25);
    // recoverable = 9 (FWD same-position swing only); the FWD 15 did NOT leak
    // into the DEF blank
    expect(r.recoverable).toBe(9);
    expect(r.swaps).toEqual([{ in: 'P3', inPts: 15, out: 'P4', outPts: 6, gain: 9 }]);
  });

  it('no picks → not played, 0 recoverable, not nailed', () => {
    const r = recoverableForGw([], statOfFrom({}), posFrom({}), name);
    expect(r.played).toBe(false);
    expect(r.nailed).toBe(false);
    expect(r.recoverable).toBe(0);
  });
});

// --- best/actual building blocks ----------------------------------------------
describe('bestInFormationByPosition / actualFieldedByPosition', () => {
  it('best takes top-K per element_type over starters ∪ bench', () => {
    // 2 DEF started (1,2), 1 DEF benched (3) → K=2, top-2 of {4,6,9} = 9+6
    const picks = [pk(1, 1), pk(2, 2), pk(3, 12)];
    const stat = statOfFrom({ 1: [4], 2: [6], 3: [9] });
    const pos = posFrom({ 1: 2, 2: 2, 3: 2 });
    expect(bestInFormationByPosition(picks, stat, pos).total).toBe(15);
    expect(actualFieldedByPosition(picks, stat, pos).total).toBe(10); // 4 + 6
  });
});

// --- computeBench: the league re-rank -----------------------------------------
// Each member: GK starter + 1 DEF starter + 1 DEF bench on GW1. recoverable =
// max(0, benchDef − startDef). actualTotal comes from gw_summaries[1].total.

function memberPicks(gk, dStart, dBench) {
  return [pk(gk, 1), pk(dStart, 2), pk(dBench, 12)];
}
function memberBlob(first, picks, total) {
  return {
    summary: { player_first_name: first, player_last_name: '' },
    picks_by_gw: { 1: { picks } },
    gw_summaries: { 1: { total } },
  };
}

describe('computeBench — corrected re-rank changes a finish', () => {
  const finishedGwIds = [1];

  it('you CLIMB when everyone is corrected (the gut-punch)', () => {
    // You: actual 100, recoverable 20 → corrected 120
    // B  : actual 110, recoverable 0  → corrected 110
    // C  : actual 105, recoverable 2  → corrected 107
    const stat = {
      101: [5], 102: [2], 103: [22], // you: recoverable 20
      201: [5], 202: [4], 203: [4], //  B: recoverable 0
      301: [5], 302: [3], 303: [5], //  C: recoverable 2
    };
    const pos = {
      101: 1, 102: 2, 103: 2, 201: 1, 202: 2, 203: 2, 301: 1, 302: 2, 303: 2,
    };
    const entries = {
      1: memberBlob('You', memberPicks(101, 102, 103), 100),
      2: memberBlob('Bea', memberPicks(201, 202, 203), 110),
      3: memberBlob('Cal', memberPicks(301, 302, 303), 105),
    };
    const result = computeBench({
      entries,
      members: [1, 2, 3],
      you: 1,
      seasonElements: { gws: { 1: { elements: Object.entries(stat).map(([id, [p, m = 90]]) => ({ id: Number(id), stats: { total_points: p, minutes: m } })) } } },
      finishedGwIds,
      playerPosition: posFrom(pos),
      playerName: name,
    });
    expect(result.you.recoverableTotal).toBe(20);
    expect(result.actualFinish).toBe(3); // B 110, C 105, You 100
    expect(result.correctedFinish).toBe(1); // You 120, B 110, C 107
    expect(buildVerdict(result)).toContain("you'd have finished 1st of 3 — not 3rd");
  });

  it('you SLIP when rivals had more to recover (backhanded compliment)', () => {
    // You: actual 110, recoverable 2 → corrected 112
    // B  : actual 105, recoverable 20 → corrected 125
    const stat = {
      101: [5], 102: [3], 103: [5], // you: recoverable 2
      201: [5], 202: [2], 203: [22], //  B: recoverable 20
    };
    const pos = { 101: 1, 102: 2, 103: 2, 201: 1, 202: 2, 203: 2 };
    const entries = {
      1: memberBlob('You', memberPicks(101, 102, 103), 110),
      2: memberBlob('Bea', memberPicks(201, 202, 203), 105),
    };
    const result = computeBench({
      entries,
      members: [1, 2],
      you: 1,
      seasonElements: { gws: { 1: { elements: Object.entries(stat).map(([id, [p, m = 90]]) => ({ id: Number(id), stats: { total_points: p, minutes: m } })) } } },
      finishedGwIds,
      playerPosition: posFrom(pos),
      playerName: name,
    });
    expect(result.actualFinish).toBe(1);
    expect(result.correctedFinish).toBe(2);
    expect(buildVerdict(result)).toContain('slip to 2nd of 2');
  });

  it('SHRUG: everyone recovers the same amount, the order is unchanged', () => {
    const stat = {
      101: [5], 102: [2], 103: [12], // you: recoverable 10
      201: [5], 202: [2], 203: [12], //  B: recoverable 10
    };
    const pos = { 101: 1, 102: 2, 103: 2, 201: 1, 202: 2, 203: 2 };
    const entries = {
      1: memberBlob('You', memberPicks(101, 102, 103), 110),
      2: memberBlob('Bea', memberPicks(201, 202, 203), 100),
    };
    const result = computeBench({
      entries,
      members: [1, 2],
      you: 1,
      seasonElements: { gws: { 1: { elements: Object.entries(stat).map(([id, [p, m = 90]]) => ({ id: Number(id), stats: { total_points: p, minutes: m } })) } } },
      finishedGwIds,
      playerPosition: posFrom(pos),
      playerName: name,
    });
    expect(result.actualFinish).toBe(1);
    expect(result.correctedFinish).toBe(1);
    expect(buildVerdict(result)).toContain("your bench wasn't the difference");
  });
});

// --- hand-reconciled member ---------------------------------------------------
describe('computeBench — hand-reconciled member', () => {
  it('two GWs sum the per-GW recoverable into the total + cells', () => {
    // GW1: DEF swing +8 (start 2, bench 10). GW2: nailed (start 7, bench 1).
    const entries = {
      1: {
        summary: { player_first_name: 'You', player_last_name: '' },
        picks_by_gw: {
          1: { picks: [pk(10, 1), pk(1, 2), pk(2, 12)] },
          2: { picks: [pk(10, 1), pk(1, 2), pk(2, 12)] },
        },
        gw_summaries: { 2: { total: 90 } },
      },
    };
    const seasonElements = {
      gws: {
        1: { elements: [
          { id: 10, stats: { total_points: 5, minutes: 90 } },
          { id: 1, stats: { total_points: 2, minutes: 90 } },
          { id: 2, stats: { total_points: 10, minutes: 90 } },
        ] },
        2: { elements: [
          { id: 10, stats: { total_points: 4, minutes: 90 } },
          { id: 1, stats: { total_points: 7, minutes: 90 } },
          { id: 2, stats: { total_points: 1, minutes: 90 } },
        ] },
      },
    };
    const result = computeBench({
      entries,
      members: [1],
      you: 1,
      seasonElements,
      finishedGwIds: [1, 2],
      playerPosition: posFrom({ 10: 1, 1: 2, 2: 2 }),
      playerName: name,
    });
    expect(result.you.recoverableTotal).toBe(8); // 8 + 0
    expect(result.you.maxCell).toBe(8);
    expect(result.you.cells.map((c) => c.recoverable)).toEqual([8, 0]);
    expect(result.you.cells[1].nailed).toBe(true);
  });
});
