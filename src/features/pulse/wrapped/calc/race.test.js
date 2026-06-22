// features/pulse/wrapped/calc/race.test.js
import { describe, it, expect } from 'vitest';
import {
  totalAt,
  buildRankSeries,
  selectNemesis,
  computeRace,
  buildVerdict,
} from './race';

// A member blob with cumulative NET totals per GW. Omitting a GW key models a
// member who wasn't present that week (mid-season joiner). last name '' so
// memberName returns just the first name (clean assertions).
function mk(first, totalsByGw) {
  return {
    summary: { player_first_name: first, player_last_name: '' },
    gw_summaries: Object.fromEntries(
      Object.entries(totalsByGw).map(([gw, total]) => [gw, { total }])
    ),
  };
}

// ── The see-saw fixture (hand-verified ranks) ──────────────────────────────────
// 4 GWs. Win always 1st. You & Bob trade 2nd/3rd (the see-saw rivalry). Amy is far
// mid-season then jumps to finish 3rd — the NEAREST final finisher, but NOT the
// season-long shadow.
//   ranks  GW1            GW2            GW3            GW4
//   Win     1              1              1              1
//   You     2              3              2              2
//   Bob     3              2              3              4
//   Amy     4              4              4              3
// You [2,3,2,2] · Bob [3,2,3,4] · Amy [4,4,4,3] · Win [1,1,1,1]
const SEESAW_GWS = [1, 2, 3, 4];
const seesaw = {
  1: mk('You', { 1: 15, 2: 30, 3: 50, 4: 66 }),
  2: mk('Bob', { 1: 12, 2: 33, 3: 45, 4: 60 }),
  3: mk('Amy', { 1: 8, 2: 20, 3: 35, 4: 64 }),
  4: mk('Win', { 1: 20, 2: 40, 3: 60, 4: 80 }),
};

describe('totalAt', () => {
  it('reads cumulative net total, null when absent', () => {
    const blob = mk('A', { 1: 10, 2: 22 });
    expect(totalAt(blob, 1)).toBe(10);
    expect(totalAt(blob, 2)).toBe(22);
    expect(totalAt(blob, 3)).toBeNull();
  });
});

describe('buildRankSeries', () => {
  it('ranks members by cumulative total each GW (1 = top), entryId tie-break', () => {
    const entries = {
      1: mk('You', { 1: 8, 2: 16 }),
      2: mk('Bob', { 1: 7, 2: 16 }), // ties You on GW2 → entryId tie-break (1 before 2)
      3: mk('Win', { 1: 10, 2: 20 }),
    };
    const ranks = buildRankSeries({ entries, members: [1, 2, 3], finishedGwIds: [1, 2] });
    expect(ranks[3][1]).toBe(1);
    expect(ranks[1][1]).toBe(2);
    expect(ranks[2][1]).toBe(3);
    expect(ranks[1][2]).toBe(2); // You (id1) wins the 16-16 tie over Bob (id2)
    expect(ranks[2][2]).toBe(3);
  });

  it('excludes absent members from a GW ranking (joiner)', () => {
    const entries = {
      1: mk('You', { 1: 8, 2: 16, 3: 24 }),
      2: mk('Late', { 2: 30, 3: 40 }), // joined at GW2
    };
    const ranks = buildRankSeries({ entries, members: [1, 2], finishedGwIds: [1, 2, 3] });
    expect(ranks[2][1]).toBeUndefined(); // not present GW1
    expect(ranks[1][1]).toBe(1); // only You present
    expect(ranks[2][2]).toBe(1); // Late tops GW2
    expect(ranks[1][2]).toBe(2);
  });
});

describe('selectNemesis — reading (b): the season-long shadow, not the nearest finisher', () => {
  it('picks the see-saw rival (Bob) over the nearest final finisher (Amy)', () => {
    const rankSeries = buildRankSeries({ entries: seesaw, members: [1, 2, 3, 4], finishedGwIds: SEESAW_GWS });
    const nem = selectNemesis({ rankSeries, members: [1, 2, 3, 4], you: 1, finishedGwIds: SEESAW_GWS });
    expect(nem.entryId).toBe(2); // Bob — even though Amy (id3) finished nearer
    expect(nem.meanGap).toBeCloseTo(1.25, 5); // ties the winner's gap…
    expect(nem.leadChanges).toBe(2); // …and wins the tie on lead-changes (the clawing)
  });

  it('tie-breaks equal mean gaps by more lead-changes (the see-saw rival)', () => {
    const rankSeries = {
      1: { 1: 1, 2: 2, 3: 1, 4: 2 }, // you
      2: { 1: 2, 2: 1, 3: 2, 4: 1 }, // C: flips every GW → 3 lead-changes
      3: { 1: 2, 2: 3, 3: 2, 4: 3 }, // D: always below you → 0 lead-changes
    };
    const nem = selectNemesis({ rankSeries, members: [1, 2, 3], you: 1, finishedGwIds: [1, 2, 3, 4] });
    expect(nem.entryId).toBe(2);
    expect(nem.leadChanges).toBe(3);
  });
});

describe('computeRace — roles, margin, win/loss', () => {
  it('resolves you / nemesis (Bob) / context (winner) as three distinct lines', () => {
    const r = computeRace({ entries: seesaw, members: [1, 2, 3, 4], you: 1, finishedGwIds: SEESAW_GWS });
    expect(r.you.entryId).toBe(1);
    expect(r.nemesis.entryId).toBe(2); // Bob
    expect(r.context.entryId).toBe(4); // the winner is the context line
    expect(r.context.isWinner).toBe(true);
    expect(r.contextLabel).toBe('Winner');
    expect(r.you.finish).toBe(2);
  });

  it('you held off the nemesis → positive margin, youWon, "held off"', () => {
    const r = computeRace({ entries: seesaw, members: [1, 2, 3, 4], you: 1, finishedGwIds: SEESAW_GWS });
    expect(r.margin).toBe(6); // You 66 − Bob 60
    expect(r.youWon).toBe(true);
    expect(buildVerdict(r)).toBe('You held off Bob by 6.');
  });

  it('your peak is the highest in-league rank reached', () => {
    const r = computeRace({ entries: seesaw, members: [1, 2, 3, 4], you: 1, finishedGwIds: SEESAW_GWS });
    expect(r.you.peakRank).toBe(2); // never better than 2nd (Win always top)
  });

  it('winner NOT excluded: when the winner shadowed you closest they ARE the nemesis (loss direction)', () => {
    // You always 2nd, Win always 1st (gap 1). C & D swap 3rd/4th → each averages a
    // bigger gap than the winner → the winner is your closest tracker.
    //   ranks  GW1      GW2      GW3      GW4
    //   Win     1        1        1        1
    //   You     2        2        2        2
    //   C       3        4        3        4
    //   D       4        3        4        3
    const gws = [1, 2, 3, 4];
    const entries = {
      1: mk('You', { 1: 15, 2: 30, 3: 50, 4: 66 }),
      2: mk('Cy', { 1: 10, 2: 20, 3: 42, 4: 58 }),
      3: mk('Dee', { 1: 5, 2: 22, 3: 40, 4: 60 }),
      4: mk('Dave', { 1: 20, 2: 40, 3: 60, 4: 80 }),
    };
    const r = computeRace({ entries, members: [1, 2, 3, 4], you: 1, finishedGwIds: gws });
    expect(r.nemesis.entryId).toBe(4); // Dave, the winner — closest mean gap (1.0)
    expect(r.context.isWinner).toBe(false); // winner is the nemesis, so context = a field line
    expect(r.contextLabel).toBe('3rd'); // Dee finished 3rd
    expect(r.margin).toBe(-14); // You 66 − Dave 80
    expect(r.youWon).toBe(false);
    expect(buildVerdict(r)).toBe('Dave got you by 14.');
  });

  it('you-won-the-league: nemesis = the one you held off, context = the next field line', () => {
    const gws = [1, 2, 3, 4];
    const won = {
      1: mk('You', { 1: 10, 2: 20, 3: 30, 4: 40 }),
      2: mk('Bob', { 1: 9, 2: 18, 3: 28, 4: 38 }), // shadows you, finishes 2nd
      3: mk('Amy', { 1: 2, 2: 6, 3: 15, 4: 25 }),
    };
    const r = computeRace({ entries: won, members: [1, 2, 3], you: 1, finishedGwIds: gws });
    expect(r.youAreWinner).toBe(true);
    expect(r.nemesis.entryId).toBe(2); // Bob pushed you closest
    expect(r.context.entryId).toBe(3); // next distinct line (not you/nemesis)
    expect(r.contextLabel).toBe('3rd');
    expect(buildVerdict(r)).toBe('You won it. Bob pushed you closest — held off by 2.');
  });

  it('hand-reconciled margin: final cumulative totals drive the number', () => {
    const r = computeRace({ entries: seesaw, members: [1, 2, 3, 4], you: 1, finishedGwIds: SEESAW_GWS });
    expect(r.margin).toBe(totalAt(seesaw[1], 4) - totalAt(seesaw[2], 4)); // 66 − 60 = 6
  });
});
