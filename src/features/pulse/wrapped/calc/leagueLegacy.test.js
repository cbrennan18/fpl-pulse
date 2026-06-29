// features/pulse/wrapped/calc/leagueLegacy.test.js
import { describe, it, expect } from 'vitest';
import { computeLeagueLegacy, LEGACY_MIN_VETERANS } from './leagueLegacy';
import { computeRace } from './race';

const SEASON = '2025/26';
const GWS = [38];

// A pack entry: name (+ a 2025/26 net total in gw_summaries[38] for the real anchor).
function ent(first, total) {
  const e = { summary: { player_first_name: first, player_last_name: '' } };
  if (total != null) e.gw_summaries = { 38: { total } };
  return e;
}
function past(season_name, total_points) {
  return { season_name, total_points, rank: 1 };
}
const run = (args) => computeLeagueLegacy({ finishedGwIds: GWS, seasonLabel: SEASON, ...args });

describe('computeLeagueLegacy — standing, series, anchor, best-ever (hand-reconciled)', () => {
  // members 1-4; 1,2,3 are veterans (2 past counted seasons), 4 is a one-past rookie.
  // 2025/26 net totals → real anchor rank: id2(2400)=1, id1(2200)=2, id4(2100)=3, id3(2000)=4.
  const ENTRIES = { 1: ent('You', 2200), 2: ent('Amy', 2400), 3: ent('Bob', 2000), 4: ent('Cat', 2100) };
  const HIST = {
    1: [past('2022/23', 1800), past('2023/24', 2100)],
    2: [past('2022/23', 2000), past('2023/24', 2050)],
    3: [past('2022/23', 1700), past('2023/24', 1500)],
    4: [past('2023/24', 2000)],
  };

  it('your series is chronological with the anchor rightmost and flagged real', () => {
    const res = run({ historyByMember: HIST, entries: ENTRIES, members: [1, 2, 3, 4], you: 1 });
    // 2022/23 (field 3): Amy 2000, You 1800, Bob 1700 → you 2nd of 3
    // 2023/24 (field 4): You 2100, Amy 2050, Cat 2000, Bob 1500 → you 1st of 4
    // 2025/26 (field 4, real): you 2nd of 4
    expect(res.series).toEqual([
      { season: '2022/23', position: 2, field: 3, real: false, best: false },
      { season: '2023/24', position: 1, field: 4, real: false, best: true },
      { season: '2025/26', position: 2, field: 4, real: true, best: false },
    ]);
    // SEASON_LABEL sorts strictly rightmost against YYYY/YY past labels (fold 2).
    const last = res.series[res.series.length - 1];
    expect(last.season).toBe(SEASON);
    expect(last.real).toBe(true);
    expect(res.series.every((s) => s.season <= SEASON)).toBe(true);
    expect(res.earliest).toBe('2022/23');
  });

  it('anchor position reconciles to Beat 10’s finish (same buildRankSeries)', () => {
    const res = run({ historyByMember: HIST, entries: ENTRIES, members: [1, 2, 3, 4], you: 1 });
    const anchor = res.series.find((s) => s.real);
    const race = computeRace({ entries: ENTRIES, members: [1, 2, 3, 4], you: 1, finishedGwIds: GWS });
    expect(anchor.position).toBe(race.you.finish); // both = 2
  });

  it('best-ever = your best raw placing (1st of 4), with concrete Nth of field', () => {
    const res = run({ historyByMember: HIST, entries: ENTRIES, members: [1, 2, 3, 4], you: 1 });
    expect(res.bestEver).toEqual({ season: '2023/24', position: 1, field: 4 });
    expect(res.series.find((s) => s.best).season).toBe('2023/24');
  });

  it('standing ranks the FULL league (incl. the non-veteran), of = all members', () => {
    const res = run({ historyByMember: HIST, entries: ENTRIES, members: [1, 2, 3, 4], you: 1 });
    expect(res.standing.you).toEqual({ rank: 2, of: 4 });        // Amy ahead of you
    expect(res.standing.ranking.map((r) => r.id)).toEqual([2, 1, 4, 3]);
    expect(res.standing.ranking.find((r) => r.id === 4)).toBeTruthy(); // rookie still placed
    expect(res.standing.you).not.toHaveProperty('topPct');
    expect(res.bestEver).not.toHaveProperty('topPct');
  });
});

describe('computeLeagueLegacy — tenure shrink (realistic veteran/rookie mix)', () => {
  it('a rookie who WON this season cannot top a steady veteran (shrink bites)', () => {
    // 3 veterans (1,2,3) + 2 anchor-only rookies (4,5). 2025/26: rookie id4 finishes 1st.
    const ENTRIES = {
      1: ent('You', 2400), 2: ent('Amy', 2300), 3: ent('Bob', 2200),
      4: ent('Roo', 2500), 5: ent('Sis', 2100),
    };
    const HIST = {
      1: [past('2022/23', 2000), past('2023/24', 2000)], // veteran, ~1st-ish each
      2: [past('2022/23', 1900), past('2023/24', 1900)], // veteran, 2nd each
      3: [past('2022/23', 1800), past('2023/24', 1800)], // veteran, 3rd each
      4: null, // rookie — anchor only
      5: null, // rookie — anchor only
    };
    // 2025/26 anchor (field 5): Roo(2500)=1, You(2400)=2, Amy(2300)=3, Bob(2200)=4, Sis(2100)=5.
    // Raw avg: id4 = .20 (single best season) < id1 ≈ .356 — raw would rank the rookie 1st.
    const res = run({ historyByMember: HIST, entries: ENTRIES, members: [1, 2, 3, 4, 5], you: 1 });
    // After shrink the steady veteran (id1) tops the lucky rookie (id4):
    expect(res.standing.ranking.map((r) => r.id)).toEqual([1, 4, 2, 5, 3]);
    expect(res.standing.you.rank).toBe(1);
    // …and the prior (population mean) includes the anchor-only rookies, so the shrink
    // genuinely reflects the real distribution, not a 1-vs-1 toy.
    expect(res.standing.you.of).toBe(5);
  });
});

describe('computeLeagueLegacy — anchor field, maxField span, full-league of', () => {
  it('2025/26 field = members PRESENT at lastGw, and maxField spans past + anchor', () => {
    // id4 has a past season but NO 2025/26 summary → absent from the anchor field.
    const ENTRIES = { 1: ent('You', 2200), 2: ent('Amy', 2400), 3: ent('Bob', 2000), 4: ent('Cat') };
    const HIST = {
      1: [past('2022/23', 1800), past('2023/24', 2100)],
      2: [past('2022/23', 2000), past('2023/24', 2050)],
      3: [past('2022/23', 1700), past('2023/24', 1500)],
      4: [past('2023/24', 1400)], // present in a past field of 4, absent this season
    };
    const res = run({ historyByMember: HIST, entries: ENTRIES, members: [1, 2, 3, 4], you: 1 });
    const anchor = res.series.find((s) => s.real);
    expect(anchor.field).toBe(3); // id4 (no gw_summaries[38]) excluded from the real field
    // maxField is computed over BOTH the past (2023/24, field 4) and the anchor (field 3):
    const fields = res.series.map((s) => s.field);
    expect(Math.max(...fields)).toBe(4);                 // from the past season
    expect(res.series.some((s) => s.real)).toBe(true);   // anchor present
    expect(res.series.some((s) => !s.real)).toBe(true);  // past present
    // id4 is still ranked all-time (has a past record), so the table isn't veterans-only:
    expect(res.standing.ranking.find((r) => r.id === 4)).toBeTruthy();
    expect(res.standing.you.of).toBe(4);
  });
});

describe('computeLeagueLegacy — best-ever tie-break', () => {
  it('on equal pct prefers the lower raw position (the season actually won)', () => {
    // members 1-4 (1,2 veterans w/ 3 past counted; 3 a veteran w/ 2). You hit pct .5 twice:
    //   2021/22 → 1st of 2 (.5)   and   2023/24 → 2nd of 4 (.5)  → prefer 1st of 2.
    const ENTRIES = { 1: ent('You', 2000), 2: ent('Amy', 2400), 3: ent('Bob', 2300), 4: ent('Cat', 2200) };
    const HIST = {
      1: [past('2021/22', 1700), past('2022/23', 1600), past('2023/24', 1900)],
      2: [past('2021/22', 1600), past('2022/23', 1700), past('2023/24', 2000)],
      3: [past('2022/23', 1500), past('2023/24', 1800)],
      4: [past('2023/24', 1700)],
    };
    // 2021/22 (field 2): You 1700 > Amy 1600 → 1st of 2 (.5)
    // 2022/23 (field 3): Amy 1700, You 1600, Bob 1500 → 2nd of 3 (.667)
    // 2023/24 (field 4): Amy 2000, You 1900, Bob 1800, Cat 1700 → 2nd of 4 (.5)
    const res = run({ historyByMember: HIST, entries: ENTRIES, members: [1, 2, 3, 4], you: 1 });
    expect(res.bestEver).toEqual({ season: '2021/22', position: 1, field: 2 });
  });
});

describe('computeLeagueLegacy — rollover guard + soft-fail', () => {
  it('ignores a past[] row whose season_name === SEASON_LABEL (anchor owns it)', () => {
    const ENTRIES = { 1: ent('You', 2200), 2: ent('Amy', 2400), 3: ent('Bob', 2000) };
    const HIST = {
      1: [past('2022/23', 1800), past('2023/24', 2100), past(SEASON, 9999)], // stray current-season row
      2: [past('2022/23', 2000), past('2023/24', 2050)],
      3: [past('2022/23', 1700), past('2023/24', 1500)],
    };
    const res = run({ historyByMember: HIST, entries: ENTRIES, members: [1, 2, 3], you: 1 });
    // exactly ONE 2025/26 record for you, and it's the real anchor (field 3), not the 9999 row.
    const currents = res.series.filter((s) => s.season === SEASON);
    expect(currents).toHaveLength(1);
    expect(currents[0]).toMatchObject({ real: true, field: 3 });
  });

  it('omits half (b) when fewer than LEGACY_MIN_VETERANS have ≥2 past counted seasons', () => {
    expect(LEGACY_MIN_VETERANS).toBe(3);
    // only 1 & 2 are veterans (2 past counted each); 3 has one → 2 veterans < 3 → null.
    const ENTRIES = { 1: ent('You', 2200), 2: ent('Amy', 2400), 3: ent('Bob', 2000) };
    const HIST = {
      1: [past('2022/23', 1800), past('2023/24', 2100)],
      2: [past('2022/23', 2000), past('2023/24', 2050)],
      3: [past('2023/24', 1500)],
    };
    expect(run({ historyByMember: HIST, entries: ENTRIES, members: [1, 2, 3], you: 1 })).toBeNull();
  });

  it('an errored/empty member never enters a field; gate can still pass on the rest', () => {
    const ENTRIES = { 1: ent('You', 2200), 2: ent('Amy', 2400), 3: ent('Bob', 2000), 4: ent('Cat', 2100) };
    const HIST = {
      1: [past('2022/23', 1800), past('2023/24', 2100)],
      2: [past('2022/23', 2000), past('2023/24', 2050)],
      3: [past('2022/23', 1700), past('2023/24', 1500)],
      4: null, // errored — still gets a real anchor, but no past
    };
    const res = run({ historyByMember: HIST, entries: ENTRIES, members: [1, 2, 3, 4], you: 1 });
    expect(res).not.toBeNull();
    expect(res.standing.ranking.find((r) => r.id === 4)).toBeTruthy(); // ranked via the anchor alone
  });

  it('returns null on empty inputs without throwing', () => {
    expect(run({ historyByMember: {}, entries: {}, members: [], you: 1 })).toBeNull();
    expect(run({ historyByMember: null, entries: {}, members: [1, 2, 3], you: 1 })).toBeNull();
  });
});
