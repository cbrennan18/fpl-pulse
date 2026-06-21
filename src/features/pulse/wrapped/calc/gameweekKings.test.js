import { describe, it, expect } from 'vitest';
import { gwScore, computeGameweekKings, buildVerdict } from './gameweekKings';

// --- Fixtures --------------------------------------------------------------
// Five finished GWs. Per-member gw_summaries carry { points, event_transfers_cost }
// — score is NET (points − cost). Members shaped to exercise every rule:
//   you (1)   — wins GW1 outright, ties GW2; best GW = GW4 (90)
//   brian (2) — the weekly-win leader (wins GW2 tie + GW3 + GW5); holds the
//               season record (GW3 = 101)
//   carl (3)  — a HIT-TAKER: gross-tops GW1 (60) but a −4 makes NET 56, so he
//               loses the GW1 crown to you (58) → proves NET knocks off the crown
//   dawn (4)  — JOINER: only GW4–GW5 present (weeksPresent = 2); never wins
//   ed (5)    — ZERO-WINS manager with a genuine personal best to celebrate

function summaries(map) {
  // map: gw -> [points, cost]
  const gw_summaries = {};
  for (const [gw, [points, cost = 0]] of Object.entries(map)) {
    gw_summaries[gw] = { points, event_transfers_cost: cost };
  }
  return gw_summaries;
}

function blob(first, last, sums) {
  return { summary: { player_first_name: first, player_last_name: last }, gw_summaries: sums };
}

const finishedGwIds = [1, 2, 3, 4, 5];

// you: GW1 58 (win), GW2 70 (tie w/ brian), GW3 40, GW4 90 (personal best, but loses
//       the week to brian's 95), GW5 30 → 2 wins total
const you = blob('You', 'One', summaries({ 1: [58], 2: [70], 3: [40], 4: [90], 5: [30] }));
// brian: GW1 50, GW2 70 (tie), GW3 101 (record + win), GW4 95 (win), GW5 80 (win)
//        → 4 wins, the sole leader
const brian = blob('Brian', 'Two', summaries({ 1: [50], 2: [70], 3: [101], 4: [95], 5: [80] }));
// carl: GW1 gross 60 with a −4 → NET 56 (loses to you's 58), GW2 40, GW3 30, GW4 20, GW5 10
const carl = blob('Carl', 'Three', summaries({ 1: [60, 4], 2: [40], 3: [30], 4: [20], 5: [10] }));
// dawn: JOINER — only GW4 (45) and GW5 (50) present
const dawn = blob('Dawn', 'Four', summaries({ 4: [45], 5: [50] }));
// ed: never wins a week, best is GW2 (65)
const ed = blob('Ed', 'Five', summaries({ 1: [10], 2: [65], 3: [20], 4: [30], 5: [40] }));

const entries = { 1: you, 2: brian, 3: carl, 4: dawn, 5: ed };
const members = [1, 2, 3, 4, 5];

function run(youId = 1) {
  return computeGameweekKings({ entries, members, you: youId, finishedGwIds });
}

// --- gwScore ---------------------------------------------------------------
describe('gwScore', () => {
  it('returns NET of the transfer-hit cost', () => {
    expect(gwScore(carl, 1)).toBe(56); // 60 gross − 4 hit
    expect(gwScore(you, 1)).toBe(58); // no hit
  });
  it('returns null for a GW the member never played (joiner)', () => {
    expect(gwScore(dawn, 1)).toBeNull();
    expect(gwScore(dawn, 4)).toBe(45);
  });
});

// --- weekly wins -----------------------------------------------------------
describe('weekly-win tally', () => {
  it('NET knocks the hit-taker off the GW1 crown (you 58 > carl net 56)', () => {
    const r = run();
    const youWins = r.winsRows.find((x) => x.entryId === 1).wins;
    const carlWins = r.winsRows.find((x) => x.entryId === 3).wins;
    expect(youWins).toBeGreaterThanOrEqual(1); // won GW1
    expect(carlWins).toBe(0); // gross-topped GW1 but the hit cost him the crown
  });

  it('shares the crown on a tie (you + brian both win GW2 at 70)', () => {
    const r = run();
    // GW2: you 70, brian 70 → both credited. you = GW1+GW2 = 2 (the tie is the 2nd);
    // brian = GW2+GW3+GW4+GW5 = 4.
    expect(r.you.wins).toBe(2);
    expect(r.winsRows.find((x) => x.entryId === 2).wins).toBe(4);
  });

  it('crowns brian the leader (most weeks), not shared', () => {
    const r = run();
    expect(r.winsLeaderWins).toBe(4);
    expect(r.leadShared).toBe(false);
    expect(r.winsRows[0].entryId).toBe(2);
  });

  it('ranks you by manager-count, fair to joiners (your rank = 2nd)', () => {
    const r = run();
    expect(r.yourWinsRank).toBe(2); // only brian (4) won more than you (2)
  });
});

// --- best GW + league framing ---------------------------------------------
describe('your best GW + league rank', () => {
  it('finds your best week (GW4, 90) and ranks it against the field', () => {
    const r = run();
    expect(r.youBest).toEqual({ value: 90, gw: 4 });
    expect(r.youBestRank).toBe(2); // only brian's 101 beats it
    expect(r.youHoldRecord).toBe(false);
  });

  it('surfaces the season record (brian GW3, 101)', () => {
    const r = run();
    expect(r.leagueRecord).toMatchObject({ value: 101, gw: 3, name: 'Brian Two', entryId: 2 });
  });

  it('flags youHoldRecord when your best IS the league best', () => {
    const r = run(2); // run as brian — he holds the 101 record
    expect(r.youBest).toEqual({ value: 101, gw: 3 });
    expect(r.youHoldRecord).toBe(true);
    expect(r.youBestRank).toBe(1);
  });
});

// --- mid-season joiner -----------------------------------------------------
describe('mid-season joiner', () => {
  it('counts only weeks present and never fabricates wins', () => {
    const r = run();
    const d = r.winsRows.find((x) => x.entryId === 4);
    expect(d.weeksPresent).toBe(2);
    expect(d.wins).toBe(0); // 45/50 never topped GW4/GW5
  });
});

// --- hand-reconciled member ------------------------------------------------
describe('hand-reconciled member (carl)', () => {
  it('matches a fully hand-worked tally + best week', () => {
    const r = run(3); // run as carl
    // carl net scores: GW1 56, GW2 40, GW3 30, GW4 20, GW5 10 → best GW1 (56), 0 wins
    expect(r.you.wins).toBe(0);
    expect(r.youBest).toEqual({ value: 56, gw: 1 });
    expect(r.you.weeksPresent).toBe(5);
  });
});

// --- verdict copy ----------------------------------------------------------
describe('buildVerdict', () => {
  it('reads for a non-leading manager with a personal peak (you)', () => {
    const v = buildVerdict(run());
    expect(v).toContain('You won 2 weeks');
    expect(v).toContain('Brian Two won 4');
    expect(v).toContain('GW4 (90)');
    expect(v).toContain('2nd-biggest week');
    expect(v).not.toMatch(/haul/i); // NET scoring — no "haul"
  });

  it('reads for the tally leader who also holds the record (brian)', () => {
    const v = buildVerdict(run(2));
    expect(v).toContain('more than anyone');
    expect(v).toContain('biggest week anyone managed all season');
  });

  it('reads for a zero-wins manager — still lands the best-GW positive (ed)', () => {
    const v = buildVerdict(run(5));
    expect(v).toContain('never topped a single week');
    expect(v).toContain('GW2 (65)'); // ed's genuine peak
    expect(v).not.toMatch(/haul/i);
  });

  it('returns empty when there is no you', () => {
    expect(buildVerdict(computeGameweekKings({ entries, members, you: 999, finishedGwIds }))).toBe('');
  });
});
