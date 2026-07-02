import { describe, it, expect, vi } from 'vitest';

// Deterministic artefact so the decomposition is hand-checkable (the real
// xp-by-gw-v1.json would return live values for element ids 1..841). Only the
// (id, gw) pairs the tests need are present; id 999 is intentionally ABSENT to
// exercise the neutral-fallback + miss-count path.
vi.mock('../../utils/xp-by-gw-v1.json', () => ({
  default: {
    meta: { attribution: 'TEST-ATTR' },
    xp: {
      1: { 1: 6, 2: 10 }, // A: gw1 xP=6 (≠ realized); gw2 xP=10 (== realized, identity)
      2: { 1: 3, 2: 8 }, // B: gw1 xP=3;               gw2 xP=8 (== realized)
      3: { 1: 4, 2: 2 }, // C: gw1 xP=4;               gw2 xP=2 (== realized)
    },
  },
}));

import { computeLuckVsSkill, buildVerdict, scoreForGw, xpOf, ATTRIBUTION } from './luckVsSkill';

// --- Fixture builders ---------------------------------------------------------
// A minimal squad: starters (position 1..) + optional bench (position 12..). The
// calc only needs position<=11 = starter; formation semantics are irrelevant.
function pk(element, position, { c = false, v = false } = {}) {
  return { element, position, is_captain: c, is_vice: v };
}
// starters: [id, ...]; first-listed captain via `captain`.
function makePicks(starters, bench = [], { captain, vice } = {}) {
  const picks = starters.map((id, i) => pk(id, i + 1, { c: id === captain, v: id === vice }));
  bench.forEach((id, i) => picks.push(pk(id, 12 + i)));
  return picks;
}
function blob(first, last, picks_by_gw, gw_summaries) {
  return { summary: { player_first_name: first, player_last_name: last }, picks_by_gw, gw_summaries };
}
// seasonElements: { [gw]: { id: [points, minutes=90] } }
function seasonElements(perGw) {
  const gws = {};
  for (const [gw, map] of Object.entries(perGw)) {
    gws[gw] = {
      elements: Object.entries(map).map(([id, [points, minutes = 90]]) => ({
        id: Number(id),
        stats: { total_points: points, minutes },
      })),
    };
  }
  return { gws };
}
const positionOf = () => 2; // all outfield; no autosub fires in these fixtures

// --- scoreForGw (chip-aware shared scorer) ------------------------------------
describe('scoreForGw', () => {
  const statOf = (id) => ({ 1: { points: 10, minutes: 90 }, 2: { points: 8, minutes: 90 } }[id] || { points: 0, minutes: 0 });
  const picks = makePicks([1, 2], [], { captain: 1, vice: 2 });

  it('normal week doubles the captain (×2)', () => {
    expect(scoreForGw(picks, statOf, positionOf, null)).toBe(28); // 10 + 8 + 10
  });
  it('Triple Captain trebles the captain (×3)', () => {
    expect(scoreForGw(picks, statOf, positionOf, '3xc')).toBe(38); // 10 + 8 + 20
  });
  it('Bench Boost counts all 15 with no autosub', () => {
    const bbPicks = makePicks([1, 2], [3, 4], { captain: 1, vice: 2 });
    const bbStat = (id) => ({ 1: { points: 10, minutes: 90 }, 2: { points: 8, minutes: 90 }, 3: { points: 5, minutes: 0 }, 4: { points: 3, minutes: 90 } }[id] || { points: 0, minutes: 0 });
    // 10 + 8 + 5 + 3 bench-boost (blanked bench 3 still counts under BB) + captain extra 10
    expect(scoreForGw(bbPicks, bbStat, positionOf, 'bboost')).toBe(36);
  });
});

describe('xpOf', () => {
  it('returns the artefact value or undefined on a miss', () => {
    expect(xpOf(1, 1)).toBe(6);
    expect(xpOf(999, 1)).toBeUndefined();
    expect(xpOf(1, 99)).toBeUndefined();
  });
});

// --- The decomposition (hand-computed) ----------------------------------------
// GW1, 2 managers. Players A=1 (captain, both), B=2 (your differential), C=3 (rival's).
// Realized gw1: A=10, B=8, C=2. xP gw1: A=6, B=3, C=4. No hits.
//   YOU  rP = 10 + 8 + 10 = 28 ; xP = 6 + 3 + 6 = 15
//   RIV  rP = 10 + 2 + 10 = 22 ; xP = 6 + 4 + 6 = 16
//   field_rP = 25 ; field_xP = 15.5
//   skill = 15 − 15.5 = −0.5 ; actualEdge = 28 − 25 = 3 ; luck = 3 − (−0.5) = 3.5
function scenarioGw1() {
  const you = blob('You', 'One', { 1: { active_chip: null, picks: makePicks([1, 2], [], { captain: 1, vice: 2 }) } }, { 1: { points: 28, event_transfers_cost: 0 } });
  const riv = blob('Riv', 'Two', { 1: { active_chip: null, picks: makePicks([1, 3], [], { captain: 1, vice: 3 }) } }, { 1: { points: 22, event_transfers_cost: 0 } });
  return {
    entries: { 100: you, 200: riv },
    members: [100, 200],
    you: 100,
    seasonElements: seasonElements({ 1: { 1: [10], 2: [8], 3: [2] } }),
    finishedGwIds: [1],
    playerPosition: positionOf,
  };
}

describe('computeLuckVsSkill — decomposition', () => {
  const r = computeLuckVsSkill(scenarioGw1());

  it('cumulative expected/actual/luck match the hand-worked GW', () => {
    expect(r.expectedEdge).toEqual([-0.5]);
    expect(r.actualEdge).toEqual([3]);
    expect(r.luckCumulative).toEqual([3.5]);
  });

  it('gap is identically actual − expected (the invariant)', () => {
    r.gws.forEach((_, i) => {
      expect(r.luckCumulative[i]).toBeCloseTo(r.actualEdge[i] - r.expectedEdge[i], 10);
    });
  });

  it('ranks: process by xP (2nd), results by rP (1st) → lucky', () => {
    expect(r.processRank).toBe(2); // your xP 15 < rival 16
    expect(r.resultsRank).toBe(1); // your rP 28 > rival 22
    expect(r.verdictTone).toBe('lucky');
    expect(r.count).toBe(2);
    expect(r.you.luck).toBe(3.5);
  });

  it('carries the artefact attribution through', () => {
    expect(r.attribution).toBe('TEST-ATTR');
    expect(ATTRIBUTION).toBe('TEST-ATTR');
  });
});

// --- Spine-shared xP path: identical minutes ⇒ identical XI decisions ----------
// GW2 sets xP == realized for every fielded player, so the xP run must reproduce
// the rP run exactly (same autosub/captain/XI — only the value swaps, and here the
// values are equal). Edges collapse: expected == actual, luck == 0.
describe('computeLuckVsSkill — shared spine (xP == realized ⇒ zero luck)', () => {
  const you = blob('You', 'One', { 2: { active_chip: null, picks: makePicks([1, 2], [], { captain: 1, vice: 2 }) } }, { 2: { points: 28, event_transfers_cost: 0 } });
  const riv = blob('Riv', 'Two', { 2: { active_chip: null, picks: makePicks([1, 3], [], { captain: 1, vice: 3 }) } }, { 2: { points: 22, event_transfers_cost: 0 } });
  const r = computeLuckVsSkill({
    entries: { 100: you, 200: riv }, members: [100, 200], you: 100,
    seasonElements: seasonElements({ 2: { 1: [10], 2: [8], 3: [2] } }), // == xP gw2
    finishedGwIds: [2], playerPosition: positionOf,
  });

  it('expected edge equals actual edge and luck is zero', () => {
    expect(r.expectedEdge).toEqual(r.actualEdge);
    expect(r.luckCumulative).toEqual([0]);
    expect(r.you.luck).toBe(0);
  });
});

// --- Neutral fallback + miss count on an unmodelled player --------------------
describe('computeLuckVsSkill — artefact-miss neutral fallback', () => {
  // Single manager fields id 999 (no xP entry) alongside captain A.
  const you = blob('You', 'One', { 1: { active_chip: null, picks: makePicks([1, 999], [], { captain: 1, vice: 999 }) } }, { 1: { points: 25, event_transfers_cost: 0 } });
  const r = computeLuckVsSkill({
    entries: { 100: you }, members: [100], you: 100,
    seasonElements: seasonElements({ 1: { 1: [10], 999: [5] } }),
    finishedGwIds: [1], playerPosition: positionOf,
  });

  it('counts the miss (per-manager + total) and does not crash', () => {
    expect(r.misses.total).toBe(1);
    expect(r.misses.byManager[100]).toBe(1);
  });

  it('neutral fill: the missing player adds no luck (single-manager field = you ⇒ luck 0)', () => {
    // field == you, so every edge is 0 regardless; the point is it did not throw
    // and 999 fell back to realized on both ledgers.
    expect(r.luckCumulative).toEqual([0]);
  });
});

// --- Hits come out of BOTH ledgers (cancel from luck, ding skill) --------------
// Same GW1 scenario + a −4 hit for YOU. Luck must be UNCHANGED (3.5); skill drops.
describe('computeLuckVsSkill — hits on both ledgers', () => {
  const s = scenarioGw1();
  s.entries[100] = blob('You', 'One', s.entries[100].picks_by_gw, { 1: { points: 28, event_transfers_cost: 4 } });
  const r = computeLuckVsSkill(s);

  it('luck is unchanged by the hit', () => {
    expect(r.luckCumulative).toEqual([3.5]); // identical to the no-hit run
  });
  it('the hit lands in skill (expected edge drops vs the no-hit run)', () => {
    const noHit = computeLuckVsSkill(scenarioGw1());
    expect(r.expectedEdge[0]).toBeLessThan(noHit.expectedEdge[0]);
  });
});

// --- Reconciliation gate: reconstructed gross rP vs gw_summaries.points --------
describe('computeLuckVsSkill — reconciliation gate', () => {
  it('reports zero mismatches when reconstruction equals the official gross', () => {
    const r = computeLuckVsSkill(scenarioGw1());
    expect(r.reconciliation.checked).toBe(2);
    expect(r.reconciliation.mismatches).toEqual([]);
  });

  it('flags a mismatch (with the diff) when the official gross disagrees', () => {
    const s = scenarioGw1();
    s.entries[100] = blob('You', 'One', s.entries[100].picks_by_gw, { 1: { points: 99, event_transfers_cost: 0 } });
    const r = computeLuckVsSkill(s);
    const m = r.reconciliation.mismatches.find((x) => x.entryId === 100);
    expect(m).toBeTruthy();
    expect(m.grossRp).toBe(28);
    expect(m.official).toBe(99);
    expect(m.diff).toBe(28 - 99);
  });
});

// --- Verdict copy -------------------------------------------------------------
describe('buildVerdict', () => {
  it('reads both ranks as "of N" and names the tone directionally', () => {
    const v = buildVerdict(computeLuckVsSkill(scenarioGw1()));
    expect(v).toContain('of 2');
    expect(v.toLowerCase()).toContain('ahead'); // lucky direction
  });
});
