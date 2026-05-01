// Pure adapter: turns the awards blob from LeagueViewContainer into normalised
// WeeklyHighlight objects for the share graphic. No new calc logic — we read
// the existing `context` fields the calculators in ../awards/* emit.
//
// Variant shapes ({best, worst}, {awards, meta}) are flattened upstream by
// LeagueViewContainer, so every awards[key] is a plain Array<Entry>. The 17
// fixed highlights are config-driven through `buildHighlightFromConfig`;
// periodic prizes (biMonthly_N / monthly_N) are dynamic so they have a
// dedicated loop.

import { PERIODIC_PREFIXES } from './pickerCategories';

const TOP_N = 3;

function topN(entries, n = TOP_N) {
  if (!Array.isArray(entries)) return [];
  return entries.slice(0, n);
}

// ---- Shared formatters ----

const gwLabel = (ctx) => (ctx?.gw ? `GW${ctx.gw}` : null);

const valFromCtxPoints = (w) => String(w.context?.points ?? w.score ?? '');
const valFromScore = (w) => String(w.score ?? 0);
const valFixedHours = (w) =>
  typeof w.score === 'number' ? w.score.toFixed(1) : String(w.value ?? '');

// Standard per-GW leaderboard row: rank by context.points / score.
const rowGwPoints = (e) => ({
  name: e.name,
  value: String(e.context?.points ?? e.score ?? ''),
});

// Season-total leaderboard row: rank by score.
const rowScore = (e) => ({ name: e.name, value: String(e.score ?? 0) });

// ---- Generic factory ----

function buildHighlightFromConfig(awards, config) {
  const entries = awards[config.awardKey];
  if (!entries?.length) return null;
  const w = entries[0];
  return {
    id: config.id,
    awardKey: config.awardKey,
    title: config.title,
    iconKey: config.iconKey,
    label: config.label,
    value: config.value(w),
    unit: config.unit ?? 'pts',
    winner: {
      name: w.name,
      meta: config.meta ? config.meta(w) : null,
    },
    leaderboard: topN(entries).map((e) => config.row(e)).filter(Boolean),
  };
}

// ---- Configs (data, not code) ----

const FIXED_CONFIGS = [
  {
    id: 'league-leaders',
    awardKey: 'leagueLeaders',
    title: 'THE 115 CLUB',
    iconKey: 'trophy',
    label: 'TOP 3 MANAGERS BY TOTAL POINTS',
    value: valFromScore,
    meta: (w) => (w.context?.lowScore ? `Low GW: ${w.context.lowScore}` : null),
    row: rowScore,
  },
  {
    id: 'one-week-wonder',
    awardKey: 'oneHitWonders',
    title: 'ONE WEEK WONDER',
    iconKey: 'lightning',
    label: 'HIGHEST GW SCORE THIS SEASON',
    value: valFromCtxPoints,
    meta: (w) => gwLabel(w.context),
    row: rowGwPoints,
  },
  {
    id: 'hot-streak',
    awardKey: 'hotStreak',
    title: 'HOT STREAK',
    iconKey: 'trendUp',
    label: 'LONGEST RUN OF RANK GAINS',
    unit: 'wks',
    value: valFromScore,
    meta: (w) =>
      w.context?.start && w.context?.end ? `GW${w.context.start}–GW${w.context.end}` : null,
    row: (e) => ({ name: e.name, value: `${e.score ?? 0}w` }),
  },
  {
    id: 'divock-origi',
    awardKey: 'benchDisaster',
    title: 'DIVOCK ORIGI AWARD',
    iconKey: 'couch',
    label: 'MOST POINTS LEFT ON THE BENCH',
    value: valFromScore, // season total; context.points is single-week worst
    meta: (w) => (w.context?.gw ? `Worst: GW${w.context.gw}` : null),
    row: rowScore,
  },
  {
    id: 'vardy-party',
    awardKey: 'bestFreeHit',
    title: 'THE VARDY PARTY',
    iconKey: 'chartLineUp',
    label: 'HIGHEST SCORE ON A FREE HIT',
    value: valFromCtxPoints,
    meta: (w) => gwLabel(w.context),
    row: rowGwPoints,
  },
  {
    id: 'pep-roulette',
    awardKey: 'worstFreeHit',
    title: 'PEP ROULETTE AWARD',
    iconKey: 'shieldWarning',
    label: 'LOWEST SCORE ON A FREE HIT',
    value: valFromCtxPoints,
    meta: (w) => gwLabel(w.context),
    row: rowGwPoints,
  },
  {
    id: 'tuchel-bounce',
    awardKey: 'bestWildcard',
    title: 'TUCHEL BOUNCE AWARD',
    iconKey: 'sealCheck',
    label: 'HIGHEST SCORE THE WEEK AFTER A WILDCARD',
    value: valFromCtxPoints,
    meta: (w) => gwLabel(w.context),
    row: rowGwPoints,
  },
  {
    id: 'eddie-howe',
    awardKey: 'worstWildcard',
    title: 'EDDIE HOWE AWARD',
    iconKey: 'shieldWarning',
    label: 'LOWEST SCORE AFTER A WILDCARD',
    value: valFromCtxPoints,
    meta: (w) => gwLabel(w.context),
    row: rowGwPoints,
  },
  {
    id: 'harry-redknapp',
    awardKey: 'mostHits',
    title: 'HARRY REDKNAPP',
    iconKey: 'coins',
    label: 'MOST POINTS SPENT ON HITS',
    value: valFromScore,
    meta: (w) => gwLabel(w.context),
    row: rowScore,
  },
  {
    id: 'lord-lundstram',
    awardKey: 'bestPunt',
    title: 'LORD LUNDSTRAM',
    iconKey: 'sparkle',
    label: 'BEST PICK UNDER 5% OWNED',
    value: valFromCtxPoints,
    meta: (w) => {
      const player = w.context?.player ?? w.punt ?? null;
      const gw = w.context?.gw ?? w.gw ?? null;
      return player && gw ? `${player} · GW${gw}` : player ?? (gw ? `GW${gw}` : null);
    },
    row: (e) => ({
      name: e.name,
      value: String(e.context?.points ?? e.score),
    }),
  },
  {
    id: 'andyfpl',
    awardKey: 'lateOwl',
    title: 'ANDYFPL PRIZE',
    iconKey: 'timer',
    label: 'LATEST AVERAGE TRANSFER TIME',
    unit: 'h',
    value: valFixedHours,
    meta: (w) => w.context?.latestFormatted ?? null,
    row: (e) => ({
      name: e.name,
      value: typeof e.score === 'number' ? `${e.score.toFixed(1)}h` : String(e.value ?? ''),
    }),
  },
  {
    id: 'early-bird',
    awardKey: 'earlyBird',
    title: 'MONDAY MORNING KNEEJERK',
    iconKey: 'calendar',
    label: 'EARLIEST AVERAGE TRANSFER TIME',
    unit: 'h',
    value: valFixedHours,
    meta: (w) => w.context?.earliestFormatted ?? null,
    row: (e) => ({
      name: e.name,
      value: typeof e.score === 'number' ? `${e.score.toFixed(1)}h` : String(e.value ?? ''),
    }),
  },
  {
    id: 'most-cards',
    awardKey: 'mostCards',
    title: 'LEE CATTERMOLE AWARD',
    iconKey: 'cards',
    label: 'MOST CARD POINTS (Y=1, R=3)',
    value: valFromScore,
    meta: (w) =>
      w.context != null ? `${w.context.yellow ?? 0}Y · ${w.context.red ?? 0}R` : null,
    row: rowScore,
  },
  {
    id: 'most-minutes',
    awardKey: 'mostMinutes',
    title: 'BRAD FRIEDEL AWARD',
    iconKey: 'sneaker',
    label: 'TOTAL SQUAD MINUTES',
    unit: 'min',
    value: (w) =>
      typeof w.score === 'number' ? w.score.toLocaleString() : String(w.value ?? ''),
    meta: (w) => (w.context?.player ? `Top: ${w.context.player}` : null),
    row: (e) => ({
      name: e.name,
      value: typeof e.score === 'number' ? e.score.toLocaleString() : String(e.value ?? ''),
    }),
  },
  {
    id: 'most-bps',
    awardKey: 'mostBps',
    title: 'THE TRENT AWARD',
    iconKey: 'star',
    label: 'MOST BONUS POINTS',
    unit: 'bps',
    value: valFromScore,
    meta: (w) => (w.context?.player ? `Top: ${w.context.player}` : null),
    row: rowScore,
  },
  {
    id: 'most-consistent',
    awardKey: 'mostConsistent',
    title: 'THE MOYESY MEDAL',
    iconKey: 'equalizer',
    label: 'CLOSEST TO LEAGUE GW AVERAGE',
    unit: 'σ',
    value: (w) =>
      typeof w.score === 'number' ? w.score.toFixed(1) : String(w.value ?? ''),
    meta: (w) => (w.context?.closestGw ? `GW${w.context.closestGw}` : null),
    row: (e) => ({
      name: e.name,
      value: typeof e.score === 'number' ? e.score.toFixed(1) : String(e.value ?? ''),
    }),
  },
];

// ---- Special-case factories ----

// oldDoll has two paths: configured `awards.oldDoll` (when leagueConfig
// declares the prize), or fallback to the top of the medal table when not.
function highlightOldDoll(awards, medalTable) {
  const oldDoll = awards.oldDoll;
  if (oldDoll?.length) {
    const w = oldDoll[0];
    return {
      id: 'old-doll',
      awardKey: 'oldDoll',
      title: 'OLD DOLL PRIZE',
      iconKey: 'crown',
      value: String(w.context?.totalPoints ?? ''),
      unit: 'pts',
      label: 'TOP-RANKED QUALIFYING MANAGER',
      winner: {
        name: w.name,
        meta: w.context?.rank ? `League rank #${w.context.rank}` : null,
      },
      leaderboard: topN(oldDoll).map((e) => ({
        name: e.name,
        value: String(e.context?.totalPoints ?? ''),
      })),
    };
  }
  if (medalTable?.length) {
    const w = medalTable[0];
    return {
      id: 'old-doll',
      awardKey: 'medalLeader',
      title: 'MEDAL LEADER',
      iconKey: 'crown',
      value: String(w.total ?? 0),
      unit: null,
      label: 'MOST MEDALS THIS SEASON',
      winner: {
        name: w.name,
        meta: w.leagueRank ? `League rank #${w.leagueRank}` : null,
      },
      leaderboard: topN(medalTable).map((e) => ({
        name: e.name,
        value: String(e.total ?? 0),
      })),
    };
  }
  return null;
}

// Periodic prizes are dynamic — one per `biMonthly_N` / `monthly_N` key in
// the awards blob. biMonthlyMeta from LeagueViewContainer carries label /
// gwRange / status. Pattern: winner meta = "{gwRange} · {STATUS}".
function buildPeriodicHighlights(awards, biMonthlyMeta) {
  const out = [];
  for (const key of Object.keys(awards)) {
    if (!PERIODIC_PREFIXES.some((p) => key.startsWith(p))) continue;
    const entries = awards[key];
    if (!entries?.length) continue;
    const meta = biMonthlyMeta?.[key] ?? {};
    if (meta.status === 'upcoming') continue;
    const w = entries[0];
    const rangeAndStatus = [meta.gwRange, meta.status ? meta.status.toUpperCase() : null]
      .filter(Boolean)
      .join(' · ');
    out.push({
      id: `period-${key}`,
      awardKey: key,
      title: (meta.label ?? key).toUpperCase(),
      iconKey: 'calendar',
      value: String(w.score ?? 0),
      unit: 'pts',
      label: 'MOST NET POINTS IN PERIOD',
      winner: { name: w.name, meta: rangeAndStatus || null },
      leaderboard: topN(entries).map(rowScore),
    });
  }
  return out;
}

// ---- Public API ----

// Curated default selection. `oldDoll` is appended via highlightOldDoll, so
// it isn't in this set; it's added to DEFAULT_SELECTED_IDS below.
const CURATED_KEYS = new Set([
  'oneHitWonders',
  'benchDisaster',
  'worstWildcard',
  'mostHits',
  'bestPunt',
  'lateOwl',
]);

function fixedHighlights(awards) {
  return FIXED_CONFIGS.map((c) => buildHighlightFromConfig(awards, c)).filter(Boolean);
}

export function buildWeeklyHighlights({ awards, medalTable }) {
  if (!awards) return [];
  // Curated 7 = the six configs in CURATED_KEYS, plus oldDoll (with fallback).
  const curated = FIXED_CONFIGS
    .filter((c) => CURATED_KEYS.has(c.awardKey))
    .map((c) => buildHighlightFromConfig(awards, c))
    .filter(Boolean);
  const od = highlightOldDoll(awards, medalTable);
  return od ? [...curated, od] : curated;
}

export function buildAllHighlights({ awards, medalTable, biMonthlyMeta }) {
  if (!awards) return [];
  const fixed = fixedHighlights(awards);
  const od = highlightOldDoll(awards, medalTable);
  const periodic = buildPeriodicHighlights(awards, biMonthlyMeta);
  return [...fixed, ...(od ? [od] : []), ...periodic];
}

// Derived from CURATED_KEYS so editing the set above is the single source of
// truth. `old-doll` is the id assigned by highlightOldDoll; appended last.
export const DEFAULT_SELECTED_IDS = [
  ...FIXED_CONFIGS.filter((c) => CURATED_KEYS.has(c.awardKey)).map((c) => c.id),
  'old-doll',
];
