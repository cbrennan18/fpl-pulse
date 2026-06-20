import { describe, it, expect } from 'vitest';
import {
  computeMaverick,
  pickQuiz,
  buildVerdict,
  diffMaxOwners,
  conformityPct,
  memberOwnership,
  DIFF_MIN_RETURN,
} from './maverick';
import { buildGwPointsIndex } from './setAndForget';

// --- Fixtures ----------------------------------------------------------------
// 5-member league (you=1, plus 2,3,4,5), 4 finished GWs. EO denom = 5 * 4 = 20.
const finishedGwIds = [1, 2, 3, 4];
const playerName = (id) => `P${id}`;

// seasonElements: per-GW raw points for every element that featured.
function gwBlock(map) {
  return {
    elements: Object.entries(map).map(([id, points]) => ({
      id: Number(id),
      stats: { total_points: points, minutes: 90 },
    })),
  };
}
const seasonElements = {
  gws: {
    1: gwBlock({ 100: 5, 101: 4, 102: 3, 103: 3, 104: 3, 200: 10, 201: 8, 202: 6, 203: 5, 204: 2 }),
    2: gwBlock({ 100: 5, 101: 4, 102: 3, 103: 3, 104: 3, 200: 10, 201: 8, 202: 5, 203: 5, 204: 2 }),
    3: gwBlock({ 100: 5, 101: 4, 102: 3, 103: 3, 104: 3, 200: 10, 201: 8, 202: 5, 203: 5, 204: 2 }),
    4: gwBlock({ 100: 5, 101: 4, 102: 3, 103: 3, 104: 3, 200: 10, 201: 100, 202: 4, 204: 2 }), // 201 huge but BENCHED for you in gw4
  },
};

// Build a blob from a per-GW list of [element, position] picks.
function blob(name, perGw) {
  const picks_by_gw = {};
  for (const gw of finishedGwIds) {
    picks_by_gw[gw] = { picks: (perGw[gw] || []).map(([element, position]) => ({ element, position })) };
  }
  return { summary: { player_first_name: name, player_last_name: '' }, picks_by_gw };
}

// Template core 100–104 owned by everyone every GW (EO = 1.0 → clears the 0.35
// cut, no fallback). Differentials 200–204 are yours.
// YOU (1): the 5 templates started all 4; diffs 200 (only-you, 10/gw=40),
// 202 (only-you, 6+5+5+4=20), 203 (only-you, started gw1-3 =15, sold gw4),
// 204 (only-you, 2/gw=8 below floor), 201 (you+#2, started gw1-3 @8=24, BENCHED gw4).
const TEMPLATES = [[100, 1], [101, 2], [102, 3], [103, 4], [104, 5]];
const you = blob('You', {
  1: [...TEMPLATES, [200, 6], [202, 7], [203, 8], [204, 9], [201, 10]],
  2: [...TEMPLATES, [200, 6], [202, 7], [203, 8], [204, 9], [201, 10]],
  3: [...TEMPLATES, [200, 6], [202, 7], [203, 8], [204, 9], [201, 10]],
  4: [...TEMPLATES, [200, 6], [202, 7], [204, 9], [201, 12]], // 201 benched, 203 sold
});
// #2 owns 201 for two GWs only → its EO = (4+2)/20 = 0.30 < 0.35, so it stays a
// 2-owner DIFFERENTIAL (not template) and exercises the non-only-you path.
const m2 = blob('Alex', {
  1: [...TEMPLATES, [201, 6]],
  2: [...TEMPLATES, [201, 6]],
  3: [...TEMPLATES],
  4: [...TEMPLATES],
});
// #3,#4,#5 own only the templates (pure sheep).
const sheep = (name) =>
  blob(name, { 1: [...TEMPLATES], 2: [...TEMPLATES], 3: [...TEMPLATES], 4: [...TEMPLATES] });

const entries = { 1: you, 2: m2, 3: sheep('Bo'), 4: sheep('Cy'), 5: sheep('Di') };
const members = [1, 2, 3, 4, 5];

function run() {
  return computeMaverick({ entries, members, you: 1, seasonElements, finishedGwIds, playerName });
}

describe('diffMaxOwners', () => {
  it('is ~25% of the league, floored at 2', () => {
    expect(diffMaxOwners(5)).toBe(2); // ceil(1.25)=2
    expect(diffMaxOwners(15)).toBe(4); // ceil(3.75)=4
    expect(diffMaxOwners(2)).toBe(2);
  });
});

describe('memberOwnership — return window (started-only, raw)', () => {
  const gwIndex = buildGwPointsIndex(seasonElements, finishedGwIds);
  const own = memberOwnership(you, gwIndex, finishedGwIds);

  it('counts points only while STARTED (benched GW returns nothing)', () => {
    // 201: started gw1-3 at 8 each = 24; gw4 it scored 100 but was BENCHED → ignored.
    expect(own.get(201).pts).toBe(24);
    expect(own.get(201).weeksStarted).toBe(3);
    expect(own.get(201).weeksInSquad).toBe(4);
  });

  it('sums raw started points across the season', () => {
    expect(own.get(200).pts).toBe(40); // 10 * 4
    expect(own.get(202).pts).toBe(20); // 6+5+5+4
    expect(own.get(203).pts).toBe(15); // started gw1-3 at 5 (absent gw4)
    expect(own.get(204).pts).toBe(8); // 2 * 4
  });
});

describe('template detection (EO) + conformity', () => {
  const r = run();
  it('marks the widely-owned players as template', () => {
    // 100 & 101 owned by all 5 every GW → EO = 1.0; 200–204 are low-EO diffs.
    const names = r.topTemplate.map((t) => t.name);
    expect(names).toContain('P100');
    expect(names).toContain('P101');
    expect(r.templateCount).toBeGreaterThanOrEqual(2);
  });
  it('computes weeks-held-weighted conformity and ranks sheep above mavericks', () => {
    // Pure-sheep members (Bo/Cy/Di) own only templates → conformity 1.0, top ranks.
    const top = r.ranking[0];
    expect(top.conformity).toBeCloseTo(1, 5);
    // You hold many non-template diffs → lower conformity than the sheep.
    expect(r.you.conformity).toBeLessThan(1);
    expect(conformityPct(r.you.conformity)).toBeGreaterThan(0);
  });
  it('names the least-conformist OTHER manager as the resident contrarian', () => {
    expect(r.maverickNamed).toBeTruthy();
    expect(r.maverickNamed.isYou).toBeFalsy();
  });
});

describe('template fallback when too few clear EO', () => {
  it('falls back to top-N most-owned in a low-consensus league', () => {
    // Everyone owns a totally different set → almost nothing clears EO 0.35.
    const e = {
      1: blob('You', { 1: [[10, 1]], 2: [[10, 1]], 3: [[10, 1]], 4: [[10, 1]] }),
      2: blob('A', { 1: [[20, 1]], 2: [[20, 1]], 3: [[20, 1]], 4: [[20, 1]] }),
      3: blob('B', { 1: [[30, 1]], 2: [[30, 1]], 3: [[30, 1]], 4: [[30, 1]] }),
    };
    const res = computeMaverick({
      entries: e, members: [1, 2, 3], you: 1, seasonElements, finishedGwIds, playerName,
    });
    // 3 distinct players, each EO = 4/12 = 0.33 (< 0.35) → fallback uses top-N (all 3).
    expect(res.templateCount).toBe(3);
  });
});

describe('differential detection', () => {
  const r = run();
  it('flags your best differential and the "only you" case', () => {
    expect(r.best.element).toBe(200);
    expect(r.best.pts).toBe(40);
    expect(r.best.onlyYou).toBe(true);
  });
  it('surfaces a worst differential distinct from the best', () => {
    expect(r.worst).toBeTruthy();
    expect(r.worst.element).not.toBe(r.best.element);
    expect(r.worst.element).toBe(204); // the 8-pt flop, committed 4 weeks
    expect(r.worst.pts).toBe(8);
  });
  it('exposes points-per-GW (started pts / weeks started) on best + worst', () => {
    expect(r.best.ppg).toBeCloseTo(10, 5); // 200: 40 / 4 started weeks
    expect(r.worst.ppg).toBeCloseTo(2, 5); // 204: 8 / 4 started weeks
  });
  it('exposes the differential ownership ceiling (maxOwners) for the punt copy', () => {
    expect(r.maxOwners).toBe(2); // diffMaxOwners(5) = max(2, ceil(1.25)) = 2
  });
  it('excludes a sub-floor punt from "best"', () => {
    // 204 returned 8 (< DIFF_MIN_RETURN) so it can never be the best.
    expect(r.best.pts).toBeGreaterThanOrEqual(DIFF_MIN_RETURN);
  });
});

describe('quiz selection + fallback', () => {
  const r = run();
  it('builds a 3-card quiz with the best as the answer and closest-below distractors', () => {
    expect(r.quiz).toBeTruthy();
    expect(r.quiz.cards).toHaveLength(3);
    expect(r.quiz.answerElement).toBe(200);
    const els = r.quiz.cards.map((c) => c.element).sort((a, b) => a - b);
    // eligible (>=15): 200(40),201(24),202(20),203(15). closest-below 40 → 201,202.
    expect(els).toEqual([200, 201, 202]);
  });
  it('exposes per-card weeks-held, ownership and points for the screen-2 reveal', () => {
    expect(r.quiz.cards.every((c) =>
      typeof c.pts === 'number' &&
      typeof c.weeksInSquad === 'number' &&
      typeof c.owners === 'number'
    )).toBe(true);
  });
  it('returns null (straight-reveal fallback) with fewer than 3 eligible punts', () => {
    const cands = [
      { element: 1, name: 'A', pts: 40, weeksInSquad: 4, onlyYou: true },
      { element: 2, name: 'B', pts: 20, weeksInSquad: 4, onlyYou: true },
      { element: 3, name: 'C', pts: 9, weeksInSquad: 4, onlyYou: true }, // below floor
    ];
    expect(pickQuiz(cands)).toBeNull();
  });
});

describe('buildVerdict — both directions, punches at the decision', () => {
  it('vindication when the boldest call paid off', () => {
    const v = buildVerdict({
      you: { conformity: 0.4, rank: 5, templateOwned: 2 },
      best: { name: 'Mateta', pts: 71, onlyYou: true },
      worst: { name: 'Awoniyi', pts: 9, onlyYou: true, weeksInSquad: 6 },
      count: 6,
    });
    expect(v.label).toContain('maverick');
    expect(v.line).toContain('Mateta');
    expect(v.line).toContain('paid off');
  });
  it('comeuppance reads as cost of the streak, never a person', () => {
    const v = buildVerdict({
      you: { conformity: 0.3, rank: 6, templateOwned: 1 },
      best: { name: 'Wood', pts: 18, onlyYou: true },
      worst: { name: 'Awoniyi', pts: 9, onlyYou: true, weeksInSquad: 8 },
      count: 6,
    });
    expect(v.line).toContain('Going your own way');
    expect(v.line).not.toMatch(/worse than|than Dave|than your/i);
  });
  it('handles the pure-sheep case (no differentials)', () => {
    const v = buildVerdict({ you: { conformity: 0.95, rank: 1 }, best: null, worst: null, count: 6 });
    expect(v.label).toContain('most conformist');
    expect(v.line).toContain("league's favourites");
  });
});
