import { describe, it, expect } from 'vitest';
import {
  chipHalf,
  scoreXiForGw,
  benchBoostGain,
  tripleCaptainGain,
  freeHitGain,
  wildcardGain,
  computeChips,
  buildVerdict,
  H1_LAST_GW,
} from './chips';

// --- Fixture helpers ----------------------------------------------------------
// seasonElements: { gws: { [gw]: { elements: [{ id, stats:{ total_points, minutes } }] } } }
// We declare per-GW stats as { id: [points, minutes] } (minutes default 90).

function gwElements(map) {
  const elements = Object.entries(map).map(([id, [points, minutes = 90]]) => ({
    id: Number(id),
    stats: { total_points: points, minutes },
  }));
  return { elements };
}
function seasonElements(perGw) {
  const gws = {};
  for (const [gw, map] of Object.entries(perGw)) gws[gw] = gwElements(map);
  return { gws };
}
function statOfFrom(perGwForGw) {
  const map = new Map(
    Object.entries(perGwForGw).map(([id, [points, minutes = 90]]) => [Number(id), { points, minutes }])
  );
  return (id) => map.get(id) || { points: 0, minutes: 0 };
}

// pick { element, position, multiplier, is_captain, is_vice }
function pk(element, position, { c = false, v = false, mult = 1 } = {}) {
  return { element, position, multiplier: mult, is_captain: c, is_vice: v };
}
// A standard 15-pick squad from a list of [id, position] starters (11) + bench (4).
function squad(starters, bench, { captain, vice } = {}) {
  const picks = [];
  starters.forEach(([id], i) =>
    picks.push(pk(id, i + 1 < 1 ? 1 : i + 1, { c: id === captain, v: id === vice }))
  );
  // override positions explicitly: starters get position 1..11 in given order
  // (we ignore FPL slot semantics; position<=11 = starter is all the calc needs)
  bench.forEach(([id], i) => picks.push(pk(id, 12 + i)));
  // re-tag captain/vice flags (the loop above set them by id already) and fix
  // starter positions to 1..11
  picks.slice(0, 11).forEach((p, i) => (p.position = i + 1));
  return picks;
}

// positionOf: 1 GK, else outfield. Pass an explicit map where it matters.
function posFrom(map) {
  return (id) => map[id] ?? 2;
}

function blob(first, last, picks_by_gw) {
  return { summary: { player_first_name: first, player_last_name: last }, picks_by_gw };
}

// --- chipHalf / boundary ------------------------------------------------------
describe('chipHalf (H1/H2 boundary, authoritative GW19/20)', () => {
  it('GW <= 19 is H1, GW >= 20 is H2', () => {
    expect(H1_LAST_GW).toBe(19);
    expect(chipHalf(1)).toBe('H1');
    expect(chipHalf(19)).toBe('H1');
    expect(chipHalf(20)).toBe('H2');
    expect(chipHalf(38)).toBe('H2');
  });
});

// --- Bench Boost --------------------------------------------------------------
describe('benchBoostGain', () => {
  it('sums the 4 bench players actual points (no autosub under BB; blanks give 0)', () => {
    const picks = squad(
      [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11]],
      [[12], [13], [14], [15]]
    );
    const statOf = statOfFrom({ 12: [3], 13: [5], 14: [0, 0], 15: [7] });
    expect(benchBoostGain(picks, statOf)).toBe(15); // 3 + 5 + 0 + 7
  });
});

// --- Triple Captain -----------------------------------------------------------
describe('tripleCaptainGain (marginal extra x1)', () => {
  const picks = squad(
    [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11]],
    [[12], [13], [14], [15]],
    { captain: 1, vice: 2 }
  );
  it('equals the captain base points when the captain played', () => {
    const statOf = statOfFrom({ 1: [12, 90] });
    expect(tripleCaptainGain(picks, statOf)).toBe(12);
  });
  it('is 0 when the TC captain blanked (vice plays at x2, not x3)', () => {
    const statOf = statOfFrom({ 1: [0, 0], 2: [9, 90] });
    expect(tripleCaptainGain(picks, statOf)).toBe(0);
  });
});

// --- scoreXiForGw (shared scorer, autosub + captain) --------------------------
describe('scoreXiForGw', () => {
  it('autosubs a 0-min starter with the first same-position bench player who played', () => {
    const picks = squad(
      [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [31, 11]],
      [[32], [33], [34], [35]],
      { captain: 1, vice: 2 }
    );
    // starter 31 blanks; bench 32 is a GK (type mismatch, skipped), 33 outfield plays (+6)
    const statOf = statOfFrom({
      1: [4, 90], 2: [4], 3: [4], 4: [4], 5: [4], 6: [4], 7: [4], 8: [4], 9: [4], 10: [4],
      31: [9, 0], 32: [8, 90], 33: [6, 90],
    });
    const positionOf = posFrom({ 32: 1, 33: 2, 31: 3 });
    // ten 4-pt starters (40) + sub 33 (+6) + captain 1 extra copy (+4) = 50
    expect(scoreXiForGw(picks, statOf, positionOf)).toBe(50);
  });
});

// --- Free Hit -----------------------------------------------------------------
describe('freeHitGain (FH XI − reverted real squad, same GW, gross)', () => {
  it('scores both squads on the FH GW and returns the difference', () => {
    const fhSquad = squad(
      [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11]],
      [[12], [13], [14], [15]],
      { captain: 1, vice: 2 }
    );
    const realSquad = squad(
      [[21, 1], [22, 2], [23, 3], [24, 4], [25, 5], [26, 6], [27, 7], [28, 8], [29, 9], [30, 10], [31, 11]],
      [[32], [33], [34], [35]],
      { captain: 21, vice: 22 }
    );
    const b = blob('Free', 'Hitter', {
      4: { active_chip: null, picks: realSquad },
      5: { active_chip: 'freehit', picks: fhSquad },
    });
    // GW5 stats: FH starters each 5 (55) + captain extra 5 = 60; real starters each
    // 4 (44) + captain extra 4 = 48 → gain 12.
    const gw5 = {};
    for (let i = 1; i <= 11; i++) gw5[i] = [5, 90];
    for (let i = 21; i <= 31; i++) gw5[i] = [4, 90];
    const statOf = statOfFrom(gw5);
    const positionOf = posFrom({});
    expect(freeHitGain(b, 5, statOf, positionOf)).toBe(12);
  });

  it('returns null when the prior GW was itself a free hit (no phantom squad)', () => {
    const sq = squad(
      [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11]],
      [[12], [13], [14], [15]]
    );
    const b = blob('Back', 'ToBack', {
      4: { active_chip: 'freehit', picks: sq },
      5: { active_chip: 'freehit', picks: sq },
    });
    expect(freeHitGain(b, 5, () => ({ points: 0, minutes: 0 }), posFrom({}))).toBeNull();
  });
});

// --- Wildcard -----------------------------------------------------------------
describe('wildcardGain (new XI − held squad, wildcard GW only, gross)', () => {
  it('scores both squads on the wildcard GW (with an autosub on the old squad)', () => {
    const wcSquad = squad(
      [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11]],
      [[12], [13], [14], [15]],
      { captain: 1, vice: 2 }
    );
    const oldSquad = squad(
      [[21, 1], [22, 2], [23, 3], [24, 4], [25, 5], [26, 6], [27, 7], [28, 8], [29, 9], [30, 10], [31, 11]],
      [[32], [33], [34], [35]],
      { captain: 21, vice: 22 }
    );
    const b = blob('Wild', 'Card', {
      5: { active_chip: null, picks: oldSquad },
      6: { active_chip: 'wildcard', picks: wcSquad },
    });
    const gw6 = {};
    for (let i = 1; i <= 11; i++) gw6[i] = [5, 90]; // WC: 55 + captain extra 5 = 60
    for (let i = 21; i <= 30; i++) gw6[i] = [4, 90]; // old: ten 4s = 40
    gw6[31] = [9, 0]; // a blanked old starter → autosub
    gw6[33] = [6, 90]; // outfield bench cover (+6)
    const statOf = statOfFrom(gw6);
    const positionOf = posFrom({ 32: 1, 33: 2, 31: 3 });
    // old: 40 + 6 (sub) + 4 (captain extra) = 50; gain = 60 − 50 = 10
    expect(wildcardGain(b, 6, statOf, positionOf)).toBe(10);
  });

  it('returns null when the prior GW was a free hit', () => {
    const sq = squad(
      [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11]],
      [[12], [13], [14], [15]]
    );
    const b = blob('Wild', 'AfterFH', {
      19: { active_chip: 'freehit', picks: sq },
      20: { active_chip: 'wildcard', picks: sq },
    });
    expect(wildcardGain(b, 20, () => ({ points: 0, minutes: 0 }), posFrom({}))).toBeNull();
  });
});

// --- computeChips: not-played, H1/H2 split, league best, end-to-end -----------
describe('computeChips', () => {
  // A simple all-plays starter squad for a given captain.
  function simpleSquad(base, captain) {
    const starters = Array.from({ length: 11 }, (_, i) => [base + i, i + 1]);
    const bench = [[base + 11], [base + 12], [base + 13], [base + 14]];
    return squad(starters, bench, { captain, vice: base + 1 });
  }

  it('leaves a half null when no chip was played in it, and splits by GW boundary', () => {
    // you: bboost in GW19 (H1) and GW20 (H2); nothing else.
    const sq19 = simpleSquad(100, 100);
    const sq20 = simpleSquad(200, 200);
    const you = blob('You', 'One', {
      19: { active_chip: 'bboost', picks: sq19 },
      20: { active_chip: 'bboost', picks: sq20 },
    });
    const se = seasonElements({
      19: { 111: [4], 112: [3], 113: [0, 0], 114: [2] }, // bench 111..114
      20: { 211: [10], 212: [5], 213: [1], 214: [0, 0] },
    });
    const res = computeChips({
      entries: { 1: you },
      members: [1],
      you: 1,
      seasonElements: se,
      finishedGwIds: [19, 20],
      playerPosition: posFrom({}),
    });
    expect(res.you.chips.H1.bboost).toEqual({ gw: 19, gain: 9 }); // 4+3+0+2
    expect(res.you.chips.H2.bboost).toEqual({ gw: 20, gain: 16 }); // 10+5+1+0
    expect(res.you.chips.H1.wildcard).toBeNull();
    expect(res.you.chips.H2['3xc']).toBeNull();
  });

  it('picks the league best per chip with the right name and GW; skips null gains', () => {
    // Three members all bench-boost in H1, different GWs / bench sums.
    const mk = (first, gw, benchPts) => {
      const base = gw * 10;
      const sq = simpleSquad(base, base);
      return {
        blob: blob(first, 'X', { [gw]: { active_chip: 'bboost', picks: sq } }),
        se: { [gw]: Object.fromEntries(benchPts.map((p, i) => [base + 11 + i, [p]])) },
      };
    };
    const a = mk('Ann', 5, [2, 2, 2, 2]); // 8
    const b = mk('Ben', 8, [9, 9, 9, 9]); // 36 — the best
    const c = mk('Cal', 12, [5, 5, 5, 5]); // 20
    const se = seasonElements({ ...a.se, ...b.se, ...c.se });
    const res = computeChips({
      entries: { 1: a.blob, 2: b.blob, 3: c.blob },
      members: [1, 2, 3],
      you: 1,
      seasonElements: se,
      finishedGwIds: [5, 8, 12],
      playerPosition: posFrom({}),
    });
    const best = res.leagueBest.H1.bboost;
    expect(best.value).toBe(36);
    expect(best.name).toBe('Ben X');
    expect(best.gw).toBe(8);
    expect(res.count).toBe(3);
  });

  it('hand-reconciled member: all four chips across both halves', () => {
    // you play: WC g6, 3xc g13 (H1), bboost g18 (H1), freehit g34 (H2).
    const old5 = simpleSquad(500, 500);
    const wc6 = simpleSquad(600, 600);
    const tc13 = simpleSquad(1300, 1300);
    const bb18 = simpleSquad(1800, 1800);
    const real33 = simpleSquad(3300, 3300);
    const fh34 = simpleSquad(3400, 3400);
    const you = blob('Hand', 'Recon', {
      5: { active_chip: null, picks: old5 },
      6: { active_chip: 'wildcard', picks: wc6 },
      13: { active_chip: '3xc', picks: tc13 },
      18: { active_chip: 'bboost', picks: bb18 },
      33: { active_chip: null, picks: real33 },
      34: { active_chip: 'freehit', picks: fh34 },
    });
    const se = seasonElements({
      // WC g6: old (500..510) each 3 → 33 + captain extra 3 = 36; new (600..610)
      // each 5 → 55 + captain extra 5 = 60 → gain 24.
      6: {
        ...Object.fromEntries(Array.from({ length: 11 }, (_, i) => [500 + i, [3]])),
        ...Object.fromEntries(Array.from({ length: 11 }, (_, i) => [600 + i, [5]])),
      },
      // TC g13: captain 1300 base 11 → gain 11.
      13: { 1300: [11, 90] },
      // BB g18: bench 1811..1814 → 1+2+3+4 = 10.
      18: { 1811: [1], 1812: [2], 1813: [3], 1814: [4] },
      // FH g34: fh (3400..3410) each 6 → 66 + cap extra 6 = 72; real (3300..3310)
      // each 4 → 44 + cap extra 4 = 48 → gain 24.
      34: {
        ...Object.fromEntries(Array.from({ length: 11 }, (_, i) => [3400 + i, [6]])),
        ...Object.fromEntries(Array.from({ length: 11 }, (_, i) => [3300 + i, [4]])),
      },
    });
    const res = computeChips({
      entries: { 1: you },
      members: [1],
      you: 1,
      seasonElements: se,
      finishedGwIds: [5, 6, 13, 18, 33, 34],
      playerPosition: posFrom({}),
    });
    expect(res.you.chips.H1.wildcard).toEqual({ gw: 6, gain: 24 });
    expect(res.you.chips.H1['3xc']).toEqual({ gw: 13, gain: 11 });
    expect(res.you.chips.H1.bboost).toEqual({ gw: 18, gain: 10 });
    expect(res.you.chips.H2.freehit).toEqual({ gw: 34, gain: 24 });
    expect(res.you.chips.H2.wildcard).toBeNull();
  });
});

// --- Verdict ------------------------------------------------------------------
describe('buildVerdict', () => {
  function oneChipResult({ youGain, lbValue, lbName, lbIsYou }) {
    return {
      you: { name: 'You', chips: { H1: { bboost: { gw: 18, gain: youGain }, wildcard: null, freehit: null, '3xc': null }, H2: {} }, extras: {} },
      leagueBest: { H1: { bboost: { value: lbValue, name: lbName, gw: 33, isYou: lbIsYou } }, H2: {} },
      count: 5,
    };
  }
  it('reads as vindication when you hold the league best', () => {
    const v = buildVerdict(oneChipResult({ youGain: 41, lbValue: 41, lbName: 'You', lbIsYou: true }), 'H1');
    expect(v).toMatch(/best Bench Boost return in your league/);
  });
  it('reads the gap implicitly when a rival beat you (never asserts mistiming)', () => {
    const v = buildVerdict(oneChipResult({ youGain: 19, lbValue: 41, lbName: 'Dave', lbIsYou: false }), 'H1');
    expect(v).toContain('Dave got +41');
    expect(v).not.toMatch(/mistim/i);
  });
});
