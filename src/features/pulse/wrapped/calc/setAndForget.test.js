import { describe, it, expect } from 'vitest';
import {
  buildGwPointsIndex,
  scoreFrozenSquad,
  computeSetAndForget,
  ordinal,
  buildVerdict,
} from './setAndForget';

// --- Fixture ---------------------------------------------------------------
// 15-man GW1 squad in position order (1-11 start, 12-15 bench):
//   pos 1     id1   GK   (type 1)
//   pos 2-5   id2-5 DEF  (type 2)
//   pos 6-9   id6-9 MID  (type 3)
//   pos 10-11 id10,11 FWD(type 4)
//   bench 12  id12  MID  (type 3, outfield)
//   bench 13  id13  DEF  (type 2, outfield)
//   bench 14  id14  FWD  (type 4, outfield)
//   bench 15  id15  GK   (type 1)
// Captain = id7 (MID), Vice = id10 (FWD).
const ELEMENT_TYPE = {
  1: 1, 2: 2, 3: 2, 4: 2, 5: 2, 6: 3, 7: 3, 8: 3, 9: 3, 10: 4, 11: 4,
  12: 3, 13: 2, 14: 4, 15: 1,
};
const positionOf = (id) => ELEMENT_TYPE[id] ?? 0;

function pick(element, position, opts = {}) {
  return {
    element,
    position,
    multiplier: position <= 11 ? (opts.is_captain ? 2 : 1) : 0,
    is_captain: !!opts.is_captain,
    is_vice: !!opts.is_vice,
  };
}

const GW1_PICKS = [
  pick(1, 1), pick(2, 2), pick(3, 3), pick(4, 4), pick(5, 5),
  pick(6, 6), pick(7, 7, { is_captain: true }), pick(8, 8), pick(9, 9),
  pick(10, 10, { is_vice: true }), pick(11, 11),
  pick(12, 12), pick(13, 13), pick(14, 14), pick(15, 15),
];

// helper to turn { id: [points, minutes] } into a season-elements GW block
function gwBlock(map) {
  return {
    elements: Object.entries(map).map(([id, [points, minutes]]) => ({
      id: Number(id),
      stats: { total_points: points, minutes },
    })),
  };
}

// GW1: everyone plays 90. Starters score 2..12, bench score 5 (unused).
const GW1 = gwBlock({
  1: [2, 90], 2: [3, 90], 3: [4, 90], 4: [5, 90], 5: [6, 90],
  6: [7, 90], 7: [8, 90], 8: [9, 90], 9: [10, 90], 10: [11, 90], 11: [12, 90],
  12: [5, 90], 13: [5, 90], 14: [5, 90], 15: [5, 90],
});
// GW1 baseline = sum(2..12)=77 + captain id7 doubled(+8) = 85.

// GW2: id3 (DEF) and id7 (captain, MID) blank (0 mins).
//  - id3 → first outfield bench that played = id12 (6 pts)
//  - id7 → next outfield bench that played = id13 (4 pts); id12 already used
//  - captain id7 blanked → vice id10 (9 pts, played) gets the double
const GW2 = gwBlock({
  1: [2, 90], 2: [2, 90], 3: [99, 0], 4: [2, 90], 5: [2, 90],
  6: [2, 90], 7: [99, 0], 8: [2, 90], 9: [2, 90], 10: [9, 90], 11: [2, 90],
  12: [6, 90], 13: [4, 90], 14: [3, 0], 15: [5, 90],
});
// GW2 effective XI = eight 2's(id1,2,4,5,6,8,9,11)=16 + id10(9) + subs id12(6)+id13(4)=10 -> 35
// captain blanked -> vice id10 doubled(+9) => GW2 = 44.
// Baseline total = 85 + 44 = 129.

const seasonElements = { gws: { 1: GW1, 2: GW2 } };
const finishedGwIds = [1, 2];

function memberBlob(entryId, actualTotal, names) {
  return {
    entry_id: entryId,
    picks_by_gw: { 1: { active_chip: null, points_on_bench: 0, picks: GW1_PICKS } },
    gw_summaries: { 1: { total: 50 }, 2: { total: actualTotal } },
    summary: names,
  };
}

describe('buildGwPointsIndex', () => {
  it('maps elementId -> {points, minutes} per finished GW', () => {
    const idx = buildGwPointsIndex(seasonElements, finishedGwIds);
    expect(idx[1].get(7)).toEqual({ points: 8, minutes: 90 });
    expect(idx[2].get(3)).toEqual({ points: 99, minutes: 0 });
    expect(idx[1].size).toBe(15);
  });
});

describe('scoreFrozenSquad', () => {
  it('reconciles a known squad: captain doubling + GW1 sum', () => {
    const idx = buildGwPointsIndex(seasonElements, [1]);
    expect(scoreFrozenSquad(memberBlob(1, 0), idx, [1], positionOf)).toBe(85);
  });

  it('applies same-position bench autosubs and vice-captain fallback', () => {
    const idx = buildGwPointsIndex(seasonElements, finishedGwIds);
    // GW1 (85) + GW2 (44) = 129
    expect(scoreFrozenSquad(memberBlob(1, 0), idx, finishedGwIds, positionOf)).toBe(129);
  });

  it('returns 0 when the GW1 squad is missing', () => {
    const idx = buildGwPointsIndex(seasonElements, finishedGwIds);
    expect(scoreFrozenSquad({ picks_by_gw: {} }, idx, finishedGwIds, positionOf)).toBe(0);
  });
});

describe('computeSetAndForget', () => {
  const entries = {
    100: memberBlob(100, 150, { player_first_name: 'Ada', player_last_name: 'Lovelace' }), // delta +21
    200: memberBlob(200, 100, { player_first_name: 'Alan', player_last_name: 'Turing' }),   // delta -29
  };
  const result = computeSetAndForget({
    entries,
    members: [100, 200],
    you: 100,
    seasonElements,
    finishedGwIds,
    positionOf,
  });

  it('computes baseline, actual and delta per member', () => {
    const you = result.rows.find((r) => r.entryId === 100);
    expect(you).toMatchObject({ baselineTotal: 129, actualTotal: 150, delta: 21, isYou: true });
    const rival = result.rows.find((r) => r.entryId === 200);
    expect(rival).toMatchObject({ baselineTotal: 129, actualTotal: 100, delta: -29, isYou: false });
  });

  it('ranks by delta (you first) and reports your delta rank', () => {
    expect(result.byDelta.map((r) => r.entryId)).toEqual([100, 200]);
    expect(result.youDeltaRank).toBe(1);
    expect(result.you.entryId).toBe(100);
  });

  it('ranks by baseline with a deterministic entryId tie-break', () => {
    expect(result.byBaseline.map((r) => r.entryId)).toEqual([100, 200]);
  });

  it('resolves manager names, falling back to #id', () => {
    expect(result.rows.find((r) => r.entryId === 100).name).toBe('Ada Lovelace');
    const noName = computeSetAndForget({
      entries: { 300: memberBlob(300, 120, undefined) },
      members: [300],
      you: 300,
      seasonElements,
      finishedGwIds,
      positionOf,
    });
    expect(noName.rows[0].name).toBe('#300');
  });
});

describe('ordinal / buildVerdict', () => {
  it('formats ordinals', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(21)).toBe('21st');
  });

  it('reads correctly for a positive delta', () => {
    expect(buildVerdict({ delta: 21 }, 1)).toBe('Your moves added +21 — 1st in your league.');
  });

  it('reads correctly for a negative delta', () => {
    expect(buildVerdict({ delta: -29 }, 8)).toBe(
      "Your moves cost you 29 — the frozen squad would've finished higher."
    );
  });

  it('handles the neutral case', () => {
    expect(buildVerdict({ delta: 0 }, 5)).toBe(
      'You finished exactly where the frozen squad would have.'
    );
  });
});
