// Per-league customization. Keyed by league ID (string from URL params).
const LEAGUE_CONFIGS = {
  '852082': {
    biMonthly: true,
    oldDoll: {
      title: 'Old Doll Prize',
      qualifyingEntryIds: [7770464, 6433025, 9028327],
    },
    // Only these awards count toward the medal table
    countingAwardKeys: new Set([
      'oneHitWonders', 'benchDisaster', 'bestPunt', 'worstWildcard', 'lateOwl', 'mostHits',
      'oldDoll',
      'biMonthly_1', 'biMonthly_2', 'biMonthly_3', 'biMonthly_4', 'biMonthly_5',
    ]),
  },
  '799148': {
    biMonthly: false,
    oldDoll: false,
    countingAwardKeys: new Set([]),
  },
};

export function getLeagueConfig(leagueId) {
  return LEAGUE_CONFIGS[leagueId] ?? null;
}
