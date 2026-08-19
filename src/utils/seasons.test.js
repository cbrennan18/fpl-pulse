// src/utils/seasons.test.js
//
// resolveSeason is the fallback that keeps the app alive through the rollover window,
// so its cases are pinned here. The live shape these mirror, captured from /v1/seasons
// during the 2026 rollover:
//   {"current":2026,"seasons":[
//     {"season":2026,"is_current":true,"closed":false,"has_data":false},
//     {"season":2025,"is_current":false,"closed":true,"has_data":true}]}

import { describe, it, expect } from 'vitest';
import { resolveSeason, parseSeasonParam, withSeason, seasonOptions, resolveClosedSeason } from './seasons';

const params = (qs) => new URLSearchParams(qs);

const ROLLOVER = {
  current: 2026,
  seasons: [
    { season: 2026, is_current: true, closed: false, has_data: false },
    { season: 2025, is_current: false, closed: true, has_data: true },
  ],
};

const MID_SEASON = {
  current: 2026,
  seasons: [
    { season: 2026, is_current: true, closed: false, has_data: true },
    { season: 2025, is_current: false, closed: true, has_data: true },
  ],
};

describe('resolveSeason', () => {
  it('uses the current season when it has data', () => {
    expect(resolveSeason(MID_SEASON)).toBe(2026);
  });

  it('falls back to the most recent season with data during rollover', () => {
    // The live outage this stage exists to fix: 2026 is current but 404s everywhere.
    expect(resolveSeason(ROLLOVER)).toBe(2025);
  });

  it('picks the newest with data regardless of index ordering', () => {
    const shuffled = {
      current: 2026,
      seasons: [
        { season: 2024, is_current: false, closed: true, has_data: true },
        { season: 2026, is_current: true, closed: false, has_data: false },
        { season: 2025, is_current: false, closed: true, has_data: true },
      ],
    };
    expect(resolveSeason(shuffled)).toBe(2025);
  });

  it('lets an explicit season win over the resolved default', () => {
    expect(resolveSeason(MID_SEASON, 2025)).toBe(2025);
  });

  it('honours an explicit season the index does not list', () => {
    // Validation belongs to the picker; the container surfaces its own empty state.
    expect(resolveSeason(ROLLOVER, 2019)).toBe(2019);
    expect(resolveSeason(null, 2019)).toBe(2019);
  });

  it('answers null when there is no index, so callers send unprefixed', () => {
    // The defined failure mode: degrade to today's behaviour, never to a blank app.
    for (const empty of [null, undefined, {}, { seasons: [] }]) {
      expect(resolveSeason(empty)).toBeNull();
    }
  });

  it('answers null when no season has data at all', () => {
    expect(resolveSeason({
      current: 2026,
      seasons: [{ season: 2026, is_current: true, closed: false, has_data: false }],
    })).toBeNull();
  });
});

describe('parseSeasonParam', () => {
  it('reads a 4-digit season as a number', () => {
    expect(parseSeasonParam(params('id=51776&season=2025'))).toBe(2025);
  });

  it('treats an absent season as null', () => {
    // Existing share links carry no season and must keep working.
    expect(parseSeasonParam(params('id=51776'))).toBeNull();
  });

  it('treats garbage as absent rather than erroring', () => {
    for (const bad of ['abc', '25', '2025/26', '', ' 2025', '20255']) {
      expect(parseSeasonParam(params(`season=${encodeURIComponent(bad)}`))).toBeNull();
    }
  });
});

describe('withSeason', () => {
  it('leaves a path untouched when no season is pinned', () => {
    expect(withSeason('/mini-leagues?id=51776', null)).toBe('/mini-leagues?id=51776');
  });

  it('appends to a path that already has a query', () => {
    expect(withSeason('/mini-league?id=9385&teamId=51776', 2025))
      .toBe('/mini-league?id=9385&teamId=51776&season=2025');
  });

  it('starts a query when the path has none', () => {
    expect(withSeason('/wrapped', 2025)).toBe('/wrapped?season=2025');
  });
});


describe('seasonOptions', () => {
  it('offers the empty current season DISABLED during the rollover fortnight', () => {
    // The whole point: without this row the user sees only last season and no
    // explanation for why the app fell back to it.
    expect(seasonOptions(ROLLOVER)).toEqual([
      { season: 2026, label: '2026/27', disabled: true },
      { season: 2025, label: '2025/26', disabled: false },
    ]);
  });

  it('enables the current season once it has data', () => {
    expect(seasonOptions(MID_SEASON)).toEqual([
      { season: 2026, label: '2026/27', disabled: false },
      { season: 2025, label: '2025/26', disabled: false },
    ]);
  });

  it('omits the in-progress season entirely for Wrapped', () => {
    // Not "pending" — a season still being played is out of scope for a recap.
    expect(seasonOptions(ROLLOVER, { closedOnly: true })).toEqual([
      { season: 2025, label: '2025/26', disabled: false },
    ]);
    expect(seasonOptions(MID_SEASON, { closedOnly: true })).toEqual([
      { season: 2025, label: '2025/26', disabled: false },
    ]);
  });

  it('drops seasons that are neither current nor populated', () => {
    const withDud = { current: 2026, seasons: [
      { season: 2026, is_current: true, closed: false, has_data: false },
      { season: 2025, is_current: false, closed: true, has_data: true },
      { season: 2024, is_current: false, closed: true, has_data: false },
    ] };
    expect(seasonOptions(withDud).map(o => o.season)).toEqual([2026, 2025]);
    // Wrapped keeps 2024 but disabled — it IS closed, just not ingested.
    expect(seasonOptions(withDud, { closedOnly: true })).toEqual([
      { season: 2025, label: '2025/26', disabled: false },
      { season: 2024, label: '2024/25', disabled: true },
    ]);
  });

  it('returns nothing when the index is missing, so the picker hides', () => {
    for (const empty of [null, undefined, {}]) expect(seasonOptions(empty)).toEqual([]);
  });

  it('never offers a season the matching resolver would not pick by default', () => {
    // Guards the two policies against drifting apart.
    for (const index of [ROLLOVER, MID_SEASON]) {
      expect(seasonOptions(index).map(o => o.season)).toContain(resolveSeason(index));
      expect(seasonOptions(index, { closedOnly: true }).map(o => o.season))
        .toContain(resolveClosedSeason(index));
    }
  });
});
