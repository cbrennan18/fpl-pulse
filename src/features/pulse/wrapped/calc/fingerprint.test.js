import { describe, it, expect } from 'vitest';
import {
  scorePositions,
  computeFingerprint,
  buildVerdict,
  weakLinkMinGap,
  POSITION_LABELS,
} from './fingerprint';

// --- scorePositions unit fixtures ------------------------------------------
// gwIndex is the per-GW Map<id,{points,minutes}> that buildGwPointsIndex would
// produce; we build it inline here to exercise the attribution rules directly.
function idx(map) {
  return { 1: new Map(Object.entries(map).map(([id, [points, minutes]]) => [Number(id), { points, minutes }])) };
}
function blobWith(picks) {
  return { picks_by_gw: { 1: { picks } } };
}

describe('scorePositions — attribution pins', () => {
  it('attributes base points to each starter’s position (no captain multiplier)', () => {
    // GK 4, DEF 6, MID 9 (captain), FWD 15; bench unused. Captain stays BASE.
    const gwIndex = idx({ 1: [4, 90], 2: [6, 90], 3: [9, 90], 4: [15, 90], 5: [99, 90] });
    const positionOf = (id) => ({ 1: 1, 2: 2, 3: 3, 4: 4, 5: 3 })[id];
    const blob = blobWith([
      { element: 1, position: 1 },
      { element: 2, position: 2 },
      { element: 3, position: 3, is_captain: true, multiplier: 2 },
      { element: 4, position: 4 },
      { element: 5, position: 12 },
    ]);

    const { raw, total } = scorePositions(blob, gwIndex, [1], positionOf);
    expect(raw).toEqual({ 1: 4, 2: 6, 3: 9, 4: 15 }); // MID is 9, NOT 18
    expect(total).toBe(34); // bench (99) excluded — no blank to cover
  });

  it('is autosub-aware — a blanked DEF’s points land in the SUB’s position', () => {
    // DEF id100 plays 0 mins (blank); bench MID id200 covers it → points go to MID.
    const gwIndex = idx({ 100: [2, 0], 101: [5, 90], 200: [6, 90] });
    const positionOf = (id) => ({ 100: 2, 101: 3, 200: 3 })[id];
    const blob = blobWith([
      { element: 100, position: 5 },
      { element: 101, position: 6 },
      { element: 200, position: 12 },
    ]);

    const { raw } = scorePositions(blob, gwIndex, [1], positionOf);
    expect(raw[2]).toBe(0); // blanked defender contributes nothing
    expect(raw[3]).toBe(11); // 5 (id101) + 6 (autosubbed id200) both in MID
  });

  it('a blanked starter with no eligible bench cover contributes 0', () => {
    const gwIndex = idx({ 100: [9, 0], 200: [7, 0] }); // bench also blanked
    const positionOf = (id) => ({ 100: 4, 200: 4 })[id];
    const blob = blobWith([
      { element: 100, position: 5 },
      { element: 200, position: 12 },
    ]);
    const { raw, total } = scorePositions(blob, gwIndex, [1], positionOf);
    expect(total).toBe(0);
    expect(raw[4]).toBe(0);
  });
});

// --- computeFingerprint fixtures -------------------------------------------
// Each member fields 4 starters (one per position bucket) with fixed points and
// 90 mins (no autosub here). seasonTotal is set independently of position points
// (it includes captain/hits/bench in reality), so overall rank ≠ position ranks.
function buildPack(specs) {
  const elements = [];
  const posMap = {};
  const entries = {};
  for (const s of specs) {
    s.players.forEach((pl) => {
      elements.push({ id: pl.element, stats: { total_points: pl.points, minutes: 90 } });
      posMap[pl.element] = pl.pos;
    });
    entries[s.id] = {
      picks_by_gw: { 1: { picks: s.players.map((pl, i) => ({ element: pl.element, position: i + 1 })) } },
      gw_summaries: { 1: { total: s.seasonTotal } },
      summary: { player_first_name: 'M', player_last_name: String(s.id) },
    };
  }
  return {
    entries,
    members: specs.map((s) => s.id),
    seasonElements: { gws: { 1: { elements } } },
    finishedGwIds: [1],
    playerPosition: (id) => posMap[id] ?? 0,
  };
}
const four = (g, d, m, f, base) => [
  { element: base + 1, pos: 1, points: g },
  { element: base + 2, pos: 2, points: d },
  { element: base + 3, pos: 3, points: m },
  { element: base + 4, pos: 4, points: f },
];

describe('computeFingerprint — split, ranking, diagnosis', () => {
  // 3-member league. YOU (id2) overall 1st, but DEF is your worst position.
  const weakLeague = buildPack([
    { id: 1, seasonTotal: 90, players: four(10, 10, 10, 10, 100) },
    { id: 2, seasonTotal: 100, players: four(8, 1, 8, 8, 200) }, // YOU
    { id: 3, seasonTotal: 80, players: four(6, 6, 6, 6, 300) },
  ]);

  it('keeps the share/raw split — chart is share %, diagnosis is raw points', () => {
    const r = computeFingerprint({ ...weakLeague, you: 2 });
    const def = r.chart.positions.find((p) => p.key === 'DEF');
    // CHART: DEF share = 1 / (8+1+8+8=25) = 0.04
    expect(def.you).toBeCloseTo(0.04, 5);
    // DIAGNOSIS: DEF uses RAW points (1) → ranks LAST despite the tiny share
    const defDiag = r.diagnosis.perPosition.find((p) => p.key === 'DEF');
    expect(defDiag.points).toBe(1);
    expect(defDiag.rank).toBe(3);
  });

  it('selects the weak link by worst rank relative to overall, with its set', () => {
    const r = computeFingerprint({ ...weakLeague, you: 2 });
    expect(r.count).toBe(3);
    expect(r.diagnosis.overallRank).toBe(1); // top season total
    expect(r.diagnosis.weakest.key).toBe('DEF');
    expect(r.diagnosis.weakest.gap).toBe(2); // DEF rank 3 − overall 1
    expect(r.diagnosis.isBalanced).toBe(false);
    const verdict = buildVerdict(r.diagnosis, r.count);
    expect(verdict).toContain('DEF');
    expect(verdict).toContain('of 3'); // comparison set is shown
  });

  it('flags BALANCED when no position diverges enough (no forced weak link)', () => {
    // Every member ranks consistently across all four positions → zero spread.
    const balanced = buildPack([
      { id: 1, seasonTotal: 100, players: four(10, 10, 10, 10, 100) },
      { id: 2, seasonTotal: 90, players: four(8, 8, 8, 8, 200) }, // YOU
      { id: 3, seasonTotal: 80, players: four(6, 6, 6, 6, 300) },
    ]);
    const r = computeFingerprint({ ...balanced, you: 2 });
    expect(r.diagnosis.weakest.gap).toBe(0);
    expect(r.diagnosis.isBalanced).toBe(true);
    expect(buildVerdict(r.diagnosis, r.count).toLowerCase()).toContain('balanced');
  });

  it('winner share distribution reflects the WINNER, not you', () => {
    const lg = buildPack([
      { id: 1, seasonTotal: 200, players: four(0, 0, 0, 40, 100) }, // winner — all FWD
      { id: 2, seasonTotal: 80, players: four(5, 5, 5, 5, 200) }, // YOU — even
    ]);
    const r = computeFingerprint({ ...lg, you: 2 });
    const fwd = r.chart.positions.find((p) => p.key === 'FWD');
    const gk = r.chart.positions.find((p) => p.key === 'GK');
    expect(fwd.winner).toBeCloseTo(1, 5);
    expect(gk.winner).toBeCloseTo(0, 5);
    expect(fwd.you).toBeCloseTo(0.25, 5); // your even 5/5/5/5 split
  });

  it('per-position shares sum to ~1 for each series', () => {
    const r = computeFingerprint({ ...weakLeague, you: 2 });
    const sum = (k) => r.chart.positions.reduce((a, p) => a + p[k], 0);
    expect(sum('you')).toBeCloseTo(1, 5);
    expect(sum('winner')).toBeCloseTo(1, 5);
    expect(sum('avg')).toBeCloseTo(1, 5);
  });

  it('returns a null diagnosis (but a chart) when you are not in the league', () => {
    const r = computeFingerprint({ ...weakLeague, you: 999 });
    expect(r.diagnosis).toBeNull();
    expect(r.you).toBeNull();
    expect(r.chart.positions).toHaveLength(4);
  });
});

describe('weakLinkMinGap — scales with league size', () => {
  it('floors at 2 for small leagues and grows ~20% with N', () => {
    expect(weakLinkMinGap(5)).toBe(2);
    expect(weakLinkMinGap(10)).toBe(2);
    expect(weakLinkMinGap(15)).toBe(3);
    expect(weakLinkMinGap(20)).toBe(4);
  });
});

describe('buildVerdict — both directions, dry, descriptive', () => {
  it('is empty without a diagnosis', () => {
    expect(buildVerdict(null, 0)).toBe('');
  });
  it('names the strongest and weakest positions descriptively', () => {
    const diagnosis = {
      overallRank: 7,
      strongest: { label: 'MID', rank: 5 },
      weakest: { label: 'DEF', rank: 12 },
      isBalanced: false,
      balanceRank: 4,
    };
    const v = buildVerdict(diagnosis, 15);
    expect(v).toContain('7th of 15');
    expect(v).toContain('12th of 15');
    expect(v).toContain('produced the fewest'); // descriptive, not "your defenders are bad"
  });
});

it('POSITION_LABELS cover all four element types', () => {
  expect(POSITION_LABELS).toEqual({ 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' });
});
