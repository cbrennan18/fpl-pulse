// Hand-crafted awards blob matching the shape built in LeagueViewContainer.
// Used by /dev/awards-preview and for ad-hoc verification of weeklyHighlights.

const MANAGERS = [
  'Ciaran Brennan',
  'Andy Smith',
  'Paul Murphy',
  'Rob Kelly',
  'Jane Hughes',
  'Mike O’Connor',
  'Sarah Walsh',
];

// Each entry mirrors the base shape the calculators emit.
export const awardsFixture = {
  oneHitWonders: [
    // Top two intentionally tied to exercise the adapter's tie collapse.
    { name: MANAGERS[0], score: 134, value: '134', context: { gw: 22, points: 134 } },
    { name: 'Ryan Callanan', score: 134, value: '134', context: { gw: 28, points: 134 } },
    { name: MANAGERS[2], score: 121, value: '121', context: { gw: 14, points: 121 } },
    { name: MANAGERS[1], score: 118, value: '118', context: { gw: 28, points: 118 } },
  ],
  benchDisaster: [
    { name: MANAGERS[3], score: 240, value: '240', context: { gw: 19, points: 42 } },
    { name: MANAGERS[1], score: 198, value: '198', context: { gw: 21, points: 35 } },
    { name: MANAGERS[5], score: 172, value: '172', context: { gw: 11, points: 28 } },
  ],
  worstWildcard: [
    { name: MANAGERS[4], score: 31, value: '31', context: { gw: 24, points: 31 } },
    { name: MANAGERS[6], score: 38, value: '38', context: { gw: 16, points: 38 } },
    { name: MANAGERS[2], score: 44, value: '44', context: { gw: 20, points: 44 } },
  ],
  bestWildcard: [
    { name: MANAGERS[0], score: 92, value: '92', context: { gw: 27, points: 92 } },
  ],
  mostHits: [
    { name: MANAGERS[5], score: 28, value: '28', context: { gw: 12, hits: 4, points: 16 } },
    { name: MANAGERS[2], score: 20, value: '20', context: { gw: 18, hits: 3, points: 12 } },
    { name: MANAGERS[3], score: 16, value: '16', context: { gw: 9, hits: 2, points: 8 } },
  ],
  bestPunt: [
    {
      name: MANAGERS[6],
      score: 21,
      value: '21 pts',
      gw: 31,
      punt: 'Matheus Cunha',
      context: { player: 'Matheus Cunha', ownership: 3.8, gw: 31, points: 21 },
    },
    {
      name: MANAGERS[1],
      score: 18,
      value: '18 pts',
      gw: 17,
      punt: 'Hwang Hee-chan',
      context: { player: 'Hwang Hee-chan', ownership: 4.2, gw: 17, points: 18 },
    },
    {
      name: MANAGERS[0],
      score: 17,
      value: '17 pts',
      gw: 25,
      punt: 'Bryan Mbeumo',
      context: { player: 'Bryan Mbeumo', ownership: 2.9, gw: 25, points: 17 },
    },
  ],
  lateOwl: [
    {
      name: MANAGERS[2],
      score: 0.25,
      value: '0.3h',
      context: { latestFormatted: '0h 4m 12s before deadline' },
    },
    {
      name: MANAGERS[5],
      score: 0.8,
      value: '0.8h',
      context: { latestFormatted: '0h 18m 03s before deadline' },
    },
    {
      name: MANAGERS[3],
      score: 1.4,
      value: '1.4h',
      context: { latestFormatted: '1h 21m 40s before deadline' },
    },
  ],
  oldDoll: [
    { name: MANAGERS[4], score: 3, value: '1892 pts', context: { totalPoints: 1892, rank: 3 } },
    { name: MANAGERS[5], score: 6, value: '1821 pts', context: { totalPoints: 1821, rank: 6 } },
    { name: MANAGERS[6], score: 9, value: '1762 pts', context: { totalPoints: 1762, rank: 9 } },
  ],

  // ---- Additional awards exercised by the picker ----
  leagueLeaders: [
    { name: MANAGERS[0], score: 1923, value: '1923', context: { lowScore: 28 } },
    { name: MANAGERS[1], score: 1894, value: '1894', context: { lowScore: 31 } },
    { name: MANAGERS[2], score: 1856, value: '1856', context: { lowScore: 24 } },
  ],
  hotStreak: [
    { name: MANAGERS[2], score: 6, value: '6', context: { start: 14, end: 20, length: 6 } },
    { name: MANAGERS[5], score: 5, value: '5', context: { start: 22, end: 27, length: 5 } },
    { name: MANAGERS[0], score: 4, value: '4', context: { start: 4, end: 8, length: 4 } },
  ],
  bestFreeHit: [
    { name: MANAGERS[1], score: 88, value: '88', context: { gw: 26, points: 88 } },
    { name: MANAGERS[3], score: 82, value: '82', context: { gw: 19, points: 82 } },
  ],
  worstFreeHit: [
    { name: MANAGERS[6], score: 33, value: '33', context: { gw: 11, points: 33 } },
    { name: MANAGERS[2], score: 41, value: '41', context: { gw: 25, points: 41 } },
  ],
  earlyBird: [
    { name: MANAGERS[0], score: 96.4, value: '96.4h', context: { earliestFormatted: '6d 2h 12m before deadline' } },
    { name: MANAGERS[4], score: 72.1, value: '72.1h', context: { earliestFormatted: '4d 8h 30m before deadline' } },
    { name: MANAGERS[1], score: 54.8, value: '54.8h', context: { earliestFormatted: '3d 1h 45m before deadline' } },
  ],
  mostCards: [
    { name: MANAGERS[5], score: 38, value: '38', context: { yellow: 32, red: 2 } },
    { name: MANAGERS[3], score: 31, value: '31', context: { yellow: 28, red: 1 } },
    { name: MANAGERS[1], score: 24, value: '24', context: { yellow: 24, red: 0 } },
  ],
  mostMinutes: [
    { name: MANAGERS[0], score: 19842, value: '19,842', context: { player: 'Mohamed Salah', minutes: 2840 } },
    { name: MANAGERS[1], score: 18931, value: '18,931', context: { player: 'Erling Haaland', minutes: 2710 } },
    { name: MANAGERS[2], score: 17880, value: '17,880', context: { player: 'Cole Palmer', minutes: 2680 } },
  ],
  mostBps: [
    { name: MANAGERS[0], score: 187, value: '187', context: { player: 'Mohamed Salah', bps: 64 } },
    { name: MANAGERS[2], score: 162, value: '162', context: { player: 'Bukayo Saka', bps: 51 } },
    { name: MANAGERS[1], score: 148, value: '148', context: { player: 'Erling Haaland', bps: 49 } },
  ],
  mostConsistent: [
    { name: MANAGERS[4], score: 8.2, value: '8.2', context: { closestGw: 18, closestStdev: 0.4 } },
    { name: MANAGERS[1], score: 9.7, value: '9.7', context: { closestGw: 22, closestStdev: 0.6 } },
    { name: MANAGERS[6], score: 11.4, value: '11.4', context: { closestGw: 9, closestStdev: 0.9 } },
  ],

  // Periodic prize — exercises the dynamic biMonthly factory + grouping.
  biMonthly_3: [
    { name: MANAGERS[0], score: 612, value: '612 pts', context: { period: 'Dec–Jan', gwRange: 'GW15–GW22' } },
    { name: MANAGERS[2], score: 588, value: '588 pts', context: { period: 'Dec–Jan', gwRange: 'GW15–GW22' } },
    { name: MANAGERS[1], score: 571, value: '571 pts', context: { period: 'Dec–Jan', gwRange: 'GW15–GW22' } },
  ],
};

// Matches biMonthlyMeta from LeagueViewContainer (same key shape).
export const biMonthlyMetaFixture = {
  biMonthly_3: { label: 'Dec–Jan', gwRange: 'GW15–GW22', status: 'final', startGw: 15 },
};

// Matches the shape built by buildMedalTable() in LeagueView.jsx.
export const medalTableFixture = [
  { name: MANAGERS[0], gold: 4, silver: 2, bronze: 1, total: 7, leagueRank: 1 },
  { name: MANAGERS[1], gold: 2, silver: 3, bronze: 2, total: 7, leagueRank: 2 },
  { name: MANAGERS[2], gold: 2, silver: 1, bronze: 3, total: 6, leagueRank: 4 },
  { name: MANAGERS[4], gold: 1, silver: 2, bronze: 1, total: 4, leagueRank: 3 },
];

export const gameweekFixture = 33;
