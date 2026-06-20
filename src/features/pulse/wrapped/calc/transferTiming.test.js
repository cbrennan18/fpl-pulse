import { describe, it, expect } from 'vitest';
import {
  corridorOf,
  buildDeadlineIndex,
  isChipBulkGw,
  transferSwings,
  computeTransferTiming,
  buildVerdict,
  fmtSwing,
} from './transferTiming';
import { buildGwPointsIndex } from './setAndForget';

// --- Fixtures --------------------------------------------------------------
// Finished GWs 2..5 (GW1 is the draft, never a transfer). Deadlines a week apart.
const DEADLINES = {
  2: '2025-08-22T11:00:00Z',
  3: '2025-08-29T11:00:00Z',
  4: '2025-09-13T11:00:00Z',
  5: '2025-09-20T11:00:00Z',
};
const bootstrap = {
  events: Object.entries(DEADLINES).map(([id, deadline_time]) => ({
    id: Number(id),
    deadline_time,
  })),
};
const finishedGwIds = [2, 3, 4, 5];
const finishedSet = new Set(finishedGwIds);

function gwBlock(map) {
  return {
    elements: Object.entries(map).map(([id, points]) => ({
      id: Number(id),
      stats: { total_points: points, minutes: 90 },
    })),
  };
}

// player 100 scores 8 in GW2 but only 1 in GW3 — proves the swing reads the
// transfer's OWN target GW, not an adjacent one.
const seasonElements = {
  gws: {
    2: gwBlock({ 100: 8, 200: 2 }),
    3: gwBlock({ 100: 1, 101: 5, 201: 2 }),
    4: gwBlock({ 102: 1, 202: 4 }),
    5: gwBlock({ 103: 20, 203: 0 }),
  },
};
const gwIndex = buildGwPointsIndex(seasonElements, finishedGwIds);
const deadlineIndex = buildDeadlineIndex(bootstrap);

function timeBefore(gw, hours) {
  return new Date(Date.parse(DEADLINES[gw]) - hours * 3600000).toISOString();
}
function tr(event, element_in, element_out, hours, cost = 0) {
  return { event, element_in, element_out, time: timeBefore(event, hours), cost };
}

// "You": three kept transfers exercising sign + corridor + net-of-hit, plus a
// wildcard transfer in GW5 that must be excluded.
const youTransfers = [
  tr(2, 100, 200, 168), //  7 days early → corridor 7; gross +6, net +6
  tr(3, 101, 201, 2, 4), //  deadline day  → corridor 0; gross +3, net −1 (hit)
  tr(4, 102, 202, 24), //   1 day early   → corridor 1; gross −3, net −3
  tr(5, 103, 203, 2), //    deadline day BUT wildcard GW → excluded (+20 ignored)
];
function youBlob() {
  return {
    summary: { player_first_name: 'You', player_last_name: 'Manager' },
    transfers: youTransfers,
    picks_by_gw: { 5: { active_chip: 'wildcard', picks: [] } },
  };
}

// A rival who moves early and does well — gives the league frame something to compare.
function rivalBlob() {
  return {
    summary: { player_first_name: 'Dave', player_last_name: 'Rival' },
    transfers: [
      tr(2, 100, 200, 150), // corridor 6; gross +6
      tr(3, 101, 201, 140), // corridor 5; gross +3
    ],
    picks_by_gw: {},
  };
}

describe('corridorOf', () => {
  it('buckets days-before-deadline with a 7+ cap and a deadline-day floor', () => {
    expect(corridorOf(0)).toBe(0);
    expect(corridorOf(23)).toBe(0);
    expect(corridorOf(24)).toBe(1); // exactly one day
    expect(corridorOf(25)).toBe(1);
    expect(corridorOf(167)).toBe(6);
    expect(corridorOf(168)).toBe(7); // exactly seven days
    expect(corridorOf(500)).toBe(7); // anything beyond
  });
});

describe('buildDeadlineIndex', () => {
  it('maps gw → epoch ms and skips bad deadlines', () => {
    expect(deadlineIndex[2]).toBe(Date.parse(DEADLINES[2]));
    const idx = buildDeadlineIndex({ events: [{ id: 9, deadline_time: null }] });
    expect(idx[9]).toBeUndefined();
  });
});

describe('isChipBulkGw', () => {
  it('flags wildcard / free-hit GWs only', () => {
    const blob = {
      picks_by_gw: { 5: { active_chip: 'wildcard' }, 6: { active_chip: 'freehit' }, 7: { active_chip: '3xc' }, 8: { active_chip: null } },
    };
    expect(isChipBulkGw(blob, 5)).toBe(true);
    expect(isChipBulkGw(blob, 6)).toBe(true);
    expect(isChipBulkGw(blob, 7)).toBe(false); // triple captain is not a bulk move
    expect(isChipBulkGw(blob, 8)).toBe(false);
  });
});

describe('transferSwings', () => {
  const swings = transferSwings(youBlob(), gwIndex, deadlineIndex, finishedSet);

  it('keeps exactly the non-wildcard, mappable, finished transfers', () => {
    expect(swings.map((s) => s.event)).toEqual([2, 3, 4]); // GW5 wildcard excluded
  });

  it('computes gross swing from the transfer OWN target GW (in − out)', () => {
    expect(swings[0].grossSwing).toBe(6); // GW2: 100→8, 200→2
    expect(swings[2].grossSwing).toBe(-3); // GW4: 102→1, 202→4 (in < out)
  });

  it('makes swing NET of the hit cost', () => {
    expect(swings[1].grossSwing).toBe(3); // GW3: 101→5, 201→2
    expect(swings[1].netSwing).toBe(-1); // 3 − 4 (cost)
  });

  it('buckets each transfer into its corridor', () => {
    expect(swings.map((s) => s.corridor)).toEqual([7, 0, 1]);
  });

  it('drops transfers with no timestamp', () => {
    const blob = {
      picks_by_gw: {},
      transfers: [{ event: 2, element_in: 100, element_out: 200, time: null, cost: 0 }],
    };
    expect(transferSwings(blob, gwIndex, deadlineIndex, finishedSet)).toHaveLength(0);
  });

  it('drops transfers with an unmappable (no-deadline) event', () => {
    const blob = { picks_by_gw: {}, transfers: [tr(2, 100, 200, 10)] };
    expect(transferSwings(blob, gwIndex, {}, finishedSet)).toHaveLength(0);
  });

  it('drops transfers whose target GW is not finished', () => {
    const blob = {
      picks_by_gw: {},
      transfers: [{ event: 6, element_in: 100, element_out: 200, time: '2025-10-01T11:00:00Z', cost: 0 }],
    };
    expect(transferSwings(blob, gwIndex, deadlineIndex, finishedSet)).toHaveLength(0);
  });
});

describe('computeTransferTiming', () => {
  const entries = { 1: youBlob(), 2: rivalBlob() };
  const result = computeTransferTiming({
    entries,
    members: [1, 2],
    you: 1,
    bootstrap,
    seasonElements,
    finishedGwIds,
  });

  it('hand-reconciles the you summary', () => {
    const you = result.you;
    expect(you.total).toBe(3);
    expect(you.totalSwing).toBe(2); // +6 −1 −3
    expect(you.avgSwingPerTransfer).toBeCloseTo(2 / 3, 5);
    expect(you.earliestHours).toBe(168);
    expect(you.latestHours).toBe(2);
    expect(you.avgHours).toBeCloseTo((168 + 2 + 24) / 3, 5);
  });

  it('builds per-corridor aggregates for you (one entry per occupied corridor)', () => {
    const c = Object.fromEntries(result.you.byCorridor.map((x) => [x.corridor, x]));
    expect(c[7]).toMatchObject({ avgSwing: 6, count: 1 });
    expect(c[0]).toMatchObject({ avgSwing: -1, count: 1 });
    expect(c[1]).toMatchObject({ avgSwing: -3, count: 1 });
  });

  it('emits one dot per (manager, corridor) and skips never-transferred members', () => {
    // you: 3 corridors, rival: 2 corridors → 5 dots; no empty members
    expect(result.dots).toHaveLength(5);
    expect(result.count).toBe(2);
  });

  it('names the league swing extremes', () => {
    // rival avg = (6+3)/2 = 4.5 (best); you = 0.667 (worst of the two)
    expect(result.league.best.name).toBe('Dave Rival');
    expect(result.league.worst.name).toBe('You Manager');
  });
});

describe('buildVerdict', () => {
  it('reads early-pays when early corridors swing higher', () => {
    const you = {
      total: 4,
      avgSwingPerTransfer: 2,
      byCorridor: [
        { corridor: 6, avgSwing: 5, count: 2 },
        { corridor: 0, avgSwing: -1, count: 2 },
      ],
    };
    expect(buildVerdict(you)).toMatch(/early moves swing/i);
  });

  it('reads buzzer-pays when late corridors swing higher', () => {
    const you = {
      total: 4,
      avgSwingPerTransfer: 2,
      byCorridor: [
        { corridor: 6, avgSwing: -1, count: 2 },
        { corridor: 0, avgSwing: 6, count: 2 },
      ],
    };
    expect(buildVerdict(you)).toMatch(/buzzer/i);
  });

  it('returns empty for a non-transferrer', () => {
    expect(buildVerdict({ total: 0, byCorridor: [] })).toBe('');
  });
});

describe('fmtSwing', () => {
  it('signs and rounds', () => {
    expect(fmtSwing(2.44)).toBe('+2.4');
    expect(fmtSwing(-0.41)).toBe('−0.4');
    expect(fmtSwing(0)).toBe('0');
  });
});
