// src/utils/seasons.test.js
//
// resolveSeason is the fallback that keeps the app alive through the rollover window,
// so its cases are pinned here. The live shape these mirror, captured from /v1/seasons
// during the 2026 rollover:
//   {"current":2026,"seasons":[
//     {"season":2026,"is_current":true,"closed":false,"has_data":false},
//     {"season":2025,"is_current":false,"closed":true,"has_data":true}]}

import { describe, it, expect } from 'vitest';
import { resolveSeason, parseSeasonParam, withSeason } from './seasons';

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
