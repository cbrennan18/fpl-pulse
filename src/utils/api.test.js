// src/utils/api.test.js
//
// The season path helper's failure mode is subtle: the two GLOBAL artefacts remap
// between the unprefixed and prefixed forms rather than simply gaining a prefix, so a
// naive `/v1/${season}${path}` builds /v1/2025/season/elements. The deployed worker
// happens to answer that 200 today (an incidental fallthrough in its remap, not a
// documented form), which is exactly why it needs pinning: the wrong URL is currently
// indistinguishable from the right one at runtime. These tests fix all six
// season-scoped routes to their canonical shape in both forms.

import { describe, it, expect } from 'vitest';
import { v1Url } from './api';

// Assert on the path only — BASE varies with VITE_API_BASE.
const path = (url) => new URL(url).pathname;

// [resource, unprefixed path, prefixed path]
const ROUTES = [
  ['/bootstrap',                 '/v1/season/bootstrap',        '/v1/2025/bootstrap'],
  ['/elements',                  '/v1/season/elements',         '/v1/2025/elements'],
  ['/entry/123',                 '/v1/entry/123',               '/v1/2025/entry/123'],
  ['/league/9/entries-pack',     '/v1/league/9/entries-pack',   '/v1/2025/league/9/entries-pack'],
  ['/league/9/members',          '/v1/league/9/members',        '/v1/2025/league/9/members'],
  ['/league/9/standings',        '/v1/league/9/standings',      '/v1/2025/league/9/standings'],
];

describe('v1Url', () => {
  describe.each(ROUTES)('%s', (resource, unprefixed, prefixed) => {
    it('resolves to the current season when no season is given', () => {
      expect(path(v1Url(resource))).toBe(unprefixed);
    });

    it('prefixes an explicit season', () => {
      expect(path(v1Url(resource, 2025))).toBe(prefixed);
    });

    it('treats null/undefined/empty season as absent', () => {
      for (const absent of [null, undefined, '']) {
        expect(path(v1Url(resource, absent))).toBe(unprefixed);
      }
    });
  });

  it('never emits the literal "season" segment alongside a year', () => {
    // Canonical-form guard. The worker tolerates /v1/2025/season/elements today, so
    // runtime won't catch a regression here — this assertion is the only thing that will.
    for (const resource of ['/bootstrap', '/elements']) {
      expect(path(v1Url(resource, 2025))).not.toContain('/season/');
    }
  });

  it('accepts a season as number or string', () => {
    expect(v1Url('/elements', 2025)).toBe(v1Url('/elements', '2025'));
  });

  it('rejects anything that is not a 4-digit year', () => {
    // A bare Number() would accept these and build a URL addressing nothing.
    for (const bad of [' 2025', '2e3', '25', 'season', '2025/26', -2025, 20255]) {
      expect(() => v1Url('/elements', bad)).toThrow(/Invalid season/);
    }
  });
});
