import { describe, it, expect } from 'vitest';
import { buildGwPointsIndex } from './setAndForget';
import { scoreCaptaincy, computeCaptain, buildVerdict, pct } from './captain';

// --- Fixture ---------------------------------------------------------------
// XI = ids 1..11 (captain id7, vice id10); bench 12..15 (irrelevant to captain).
// Five finished GWs, each chosen to exercise one rule:
//   GW1 normal      — captain is the top XI scorer (nailed), ×2
//   GW2 vice beats  — vice outscores the captain (a "vice win"), captain not top
//   GW3 triple cap  — multiplier ×3 + active_chip '3xc'
//   GW4 captain blank — captain 0 mins → vice inherits the armband
//   GW5 zero week   — whole XI scores 0 → excluded from the accuracy denominator
function p(element, position, opts = {}) {
  return {
    element,
    position,
    multiplier: position <= 11 ? (opts.mult ?? (opts.is_captain ? 2 : 1)) : 0,
    is_captain: !!opts.is_captain,
    is_vice: !!opts.is_vice,
  };
}

function picks({ tc } = {}) {
  return [
    p(1, 1), p(2, 2), p(3, 3), p(4, 4), p(5, 5), p(6, 6),
    p(7, 7, { is_captain: true, mult: tc ? 3 : 2 }),
    p(8, 8), p(9, 9), p(10, 10, { is_vice: true }), p(11, 11),
    p(12, 12), p(13, 13), p(14, 14), p(15, 15),
  ];
}

function gwBlock(map) {
  return {
    elements: Object.entries(map).map(([id, [points, minutes]]) => ({
      id: Number(id),
      stats: { total_points: points, minutes },
    })),
  };
}

const base = { 1: [2, 90], 2: [2, 90], 3: [2, 90], 4: [2, 90], 5: [2, 90], 6: [2, 90], 8: [2, 90], 9: [2, 90] };
const GW1 = gwBlock({ ...base, 7: [10, 90], 10: [5, 90], 11: [3, 90] }); // cap top (10) → nailed
const GW2 = gwBlock({ ...base, 7: [4, 90], 10: [9, 90], 11: [12, 90] }); // vice 9 > cap 4; top is id11 (12)
const GW3 = gwBlock({ ...base, 7: [7, 90], 10: [3, 90], 11: [5, 90] });  // cap top (7), ×3
const GW4 = gwBlock({ ...base, 7: [0, 0], 10: [8, 90], 11: [10, 90] });  // cap blank → vice 8; top id11 (10)
const GW5 = gwBlock({ ...base, 7: [0, 90], 10: [0, 90], 11: [0, 90], 1: [0, 90], 2: [0, 90], 3: [0, 90], 4: [0, 90], 5: [0, 90], 6: [0, 90], 8: [0, 90], 9: [0, 90] });

const seasonElements = { gws: { 1: GW1, 2: GW2, 3: GW3, 4: GW4, 5: GW5 } };
const finishedGwIds = [1, 2, 3, 4, 5];

function fullBlob(seasonTotal, names) {
  return {
    picks_by_gw: {
      1: { active_chip: null, picks: picks() },
      2: { active_chip: null, picks: picks() },
      3: { active_chip: '3xc', picks: picks({ tc: true }) },
      4: { active_chip: null, picks: picks() },
      5: { active_chip: null, picks: picks() },
    },
    gw_summaries: { 5: { total: seasonTotal } },
    summary: names,
  };
}

// A manager who only fielded a team in GW1 (nailed it) → denom 1, 100% accuracy.
// Must NOT be crowned best-picker on that tiny base.
function blankHeavyBlob(seasonTotal, names) {
  return {
    picks_by_gw: { 1: { active_chip: null, picks: picks() } },
    gw_summaries: { 5: { total: seasonTotal } },
    summary: names,
  };
}

describe('scoreCaptaincy', () => {
  const idx = buildGwPointsIndex(seasonElements, finishedGwIds);
  const s = scoreCaptaincy(fullBlob(150), idx, finishedGwIds);

  it('returns per-GW captain points = realised base × armband multiplier', () => {
    // GW1 10×2, GW2 4×2, GW3 7×3 (TC), GW4 vice 8×2 (cap blank), GW5 0
    expect(s.perGw.map((g) => g.actualReturn)).toEqual([20, 8, 21, 16, 0]);
  });

  it('applies ×3 on a Triple Captain week', () => {
    expect(s.perGw[2].actualReturn).toBe(21);
  });

  it('hands the armband to the vice when the captain blanks (0 mins)', () => {
    expect(s.perGw[3].actualReturn).toBe(16); // vice 8 × 2, captain played 0 mins
  });

  it('counts best-of-C/VC and flags vice wins', () => {
    expect(s.perGw.map((g) => g.bestCvcReturn)).toEqual([20, 18, 21, 16, 0]);
    expect(s.viceWins).toBe(1); // only GW2 (vice 9 beat captain 4)
    expect(s.cvcTotal - s.actualTotal).toBe(s.cvcGap);
    expect(s.cvcGap).toBe(10); // 75 − 65
  });

  it('measures accuracy off scoring weeks only (the zero week is excluded)', () => {
    expect(s.denom).toBe(4); // GW5 (all-zero XI) excluded
    expect(s.nailed).toBe(2); // GW1 + GW3
    expect(s.accuracy).toBeCloseTo(0.5);
  });

  it('reports cumulative series and the peak GW index', () => {
    expect(s.actualCum).toEqual([20, 28, 49, 65, 65]);
    expect(s.cvcCum).toEqual([20, 38, 59, 75, 75]);
    expect(s.peakIndex).toBe(2); // GW3, the ×3 week, was the biggest single haul
  });
});

describe('computeCaptain', () => {
  const entries = {
    100: fullBlob(150, { player_first_name: 'Ada', player_last_name: 'Lovelace' }), // you
    200: fullBlob(200, { player_first_name: 'Alan', player_last_name: 'Turing' }),   // winner (top total)
    300: blankHeavyBlob(50, { player_first_name: 'Grace', player_last_name: 'Hopper' }), // 100% on 1 wk
  };
  const result = computeCaptain({
    entries, members: [100, 200, 300], you: 100, seasonElements, finishedGwIds,
  });

  it('computes your captaincy line', () => {
    expect(result.you).toMatchObject({
      entryId: 100, isYou: true, actualTotal: 65, cvcTotal: 75, cvcGap: 10, viceWins: 1, denom: 4, nailed: 2,
    });
    expect(result.you.accuracy).toBeCloseTo(0.5);
  });

  it('picks the league winner by season points (not identity)', () => {
    expect(result.winner.entryId).toBe(200);
  });

  it('does not crown a tiny-denominator manager as best picker', () => {
    expect(result.bestPicker.entryId).not.toBe(300); // 300 is 100% but only 1 scoring week
    expect(result.bestPicker.entryId).toBe(100);     // tie on 0.5 → entryId tie-break
  });

  it('averages accuracy across members who actually scored', () => {
    expect(result.leagueAvgAccuracy).toBeCloseTo((0.5 + 0.5 + 1) / 3);
  });

  it('exposes the three chart series aligned to finished GWs', () => {
    expect(result.chart.gws).toEqual(finishedGwIds);
    expect(result.chart.youActual).toEqual([20, 28, 49, 65, 65]);
    expect(result.chart.youCvc).toEqual([20, 38, 59, 75, 75]);
    expect(result.chart.winnerActual).toEqual([20, 28, 49, 65, 65]);
    expect(result.chart.peakIndex).toBe(2);
  });

  it('returns empty shape when no members resolve', () => {
    const empty = computeCaptain({ entries: {}, members: [], you: 1, seasonElements, finishedGwIds });
    expect(empty.count).toBe(0);
    expect(empty.you).toBeNull();
    expect(empty.chart.youActual).toEqual([]);
  });
});

describe('buildVerdict / pct', () => {
  it('reads as a cost when the vice would have helped', () => {
    expect(buildVerdict({ cvcGap: 10, viceWins: 1 })).toBe(
      "Backing your vice the weeks they beat your captain would've added 10 — they outscored your armband 1 time."
    );
  });

  it('pluralises vice wins', () => {
    expect(buildVerdict({ cvcGap: 18, viceWins: 3 })).toBe(
      "Backing your vice the weeks they beat your captain would've added 18 — they outscored your armband 3 times."
    );
  });

  it('reads as vindication when no vice point was left behind', () => {
    expect(buildVerdict({ cvcGap: 0, viceWins: 0 })).toBe(
      'You never left a vice-captain point behind — every armband beat your vice.'
    );
  });

  it('formats a percentage', () => {
    expect(pct(0.5)).toBe(50);
    expect(pct(0.666)).toBe(67);
  });
});
