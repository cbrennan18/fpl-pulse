// Picker grouping for the awards-share BottomSheet. Mirrors AwardsCard.jsx
// (../AwardsCard.jsx, top of file) — keep in sync if the league screen
// regroups its sections.
//
// Each entry is the calculator's award key, which weeklyHighlights.js sets as
// `awardKey` on every highlight. The picker matches highlights to categories
// by that key (with one exception: 'medalLeader' is the fallback for missing
// 'oldDoll' and lives in the spot-prizes group).

export const SPOT_PRIZE_KEYS = [
  'leagueLeaders',
  'oneHitWonders',
  'hotStreak',
  'benchDisaster',
  'bestFreeHit',
  'worstFreeHit',
  'bestWildcard',
  'worstWildcard',
  'mostHits',
  'bestPunt',
  'lateOwl',
  // oldDoll/medalLeader appended at the end when present
  'oldDoll',
  'medalLeader',
];

export const MORE_AWARDS_KEYS = [
  'earlyBird',
  'mostCards',
  'mostMinutes',
  'mostBps',
  'mostConsistent',
];

// Periodic prize keys are dynamic (biMonthly_1..5 or monthly_1..10) — the
// picker enumerates highlights with awardKey starting with these prefixes.
export const PERIODIC_PREFIXES = ['biMonthly_', 'monthly_'];

export const CATEGORY_LABELS = {
  spot: 'Spot Prizes',
  periodic: 'Periodic Prizes',
  more: 'More Awards',
};

// Group an array of highlights into the three picker categories. Highlights
// that don't match any known key fall under 'more' so we never silently drop
// one. Order within each group preserves the input order (ALL_FIXED_FACTORIES
// already orders things to mirror the league screen).
export function groupHighlightsForPicker(highlights) {
  const spot = [];
  const periodic = [];
  const more = [];
  const spotSet = new Set(SPOT_PRIZE_KEYS);

  for (const h of highlights) {
    const key = h.awardKey ?? '';
    if (PERIODIC_PREFIXES.some((p) => key.startsWith(p))) {
      periodic.push(h);
    } else if (spotSet.has(key)) {
      spot.push(h);
    } else {
      // Known "more" keys and unknown keys both end up here so nothing is
      // silently dropped from the picker.
      more.push(h);
    }
  }

  return [
    { id: 'spot', label: CATEGORY_LABELS.spot, items: spot },
    { id: 'periodic', label: CATEGORY_LABELS.periodic, items: periodic },
    { id: 'more', label: CATEGORY_LABELS.more, items: more },
  ].filter((g) => g.items.length > 0);
}
