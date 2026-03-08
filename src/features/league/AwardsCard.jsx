import { useState } from 'react';
import StatCard from './StatCard';
import { getAwardLabel } from './awardLabels';
import useUmami from '../../hooks/useUmami';

// High-engagement awards — always visible, never collapsed
const mainAwardCards = [
  { title: 'The 115 Club', description: 'Top 3 managers. No hits taken, no rules either.', key: 'leagueLeaders', variant: 'fame' },
  { title: 'One Week Wonder', description: 'Highest single gameweek score', key: 'oneHitWonders', variant: 'fame' },
  { title: 'Hot Streak', description: 'Longest run of rank gains week to week', key: 'hotStreak', variant: 'fame' },
  { title: 'Divock Origi Award', description: 'Most points left watching from the bench', key: 'benchDisaster', variant: 'trenches' },
  { title: 'The Vardy Party', description: 'Highest score on a Free Hit gameweek', key: 'bestFreeHit', variant: 'fame' },
  { title: 'Pep Roulette Award', description: 'Lowest score on a Free Hit gameweek', key: 'worstFreeHit', variant: 'trenches' },
  { title: 'Tuchel Bounce Award', description: 'Highest scoring week after playing a Wildcard', key: 'bestWildcard', variant: 'fame' },
  { title: 'Eddie Howe Award', description: 'Lowest scoring week after playing a Wildcard', key: 'worstWildcard', variant: 'trenches' },
  { title: 'Harry Redknapp Wheeler Dealer', description: 'Most points spent on transfer hits all season', key: 'mostHits', variant: 'trenches' },
  { title: 'Lord Lundstram Award', description: 'Biggest gameweek score from a <5% owned pick', key: 'bestPunt', variant: 'fame' },
  { title: 'Never Get Fancy', description: 'Points lost by not captaining Haaland', key: 'neverGetFancy', variant: 'trenches' },
  { title: 'AndyFPL Prize', description: 'Latest average transfer time', key: 'lateOwl', variant: 'fame' },
];

// Lower-engagement behavioural stats — collapsed by default
const collapsibleAwardCards = [
  { title: 'Monday Morning Kneejerk', description: 'Earliest average transfer time', key: 'earlyBird', variant: 'fame' },
  { title: 'Lee Cattermole Award', description: 'Most yellow and red cards accumulated by squad', key: 'mostCards', variant: 'trenches' },
  { title: 'Brad Friedel Award', description: 'Total minutes played by squad', key: 'mostMinutes', variant: 'fame' },
  { title: 'The Trent Award', description: 'Most bonus points accumulated', key: 'mostBps', variant: 'fame' },
  { title: 'The Moyesy Medal', description: 'Closest to the league average score every week', key: 'mostConsistent', variant: 'fame' },
];

const biMonthlyCards = [
  { label: 'Aug\u2013Sep', key: 'biMonthly_1' },
  { label: 'Oct\u2013Nov', key: 'biMonthly_2' },
  { label: 'Dec\u2013Jan', key: 'biMonthly_3' },
  { label: 'Feb\u2013Mar', key: 'biMonthly_4' },
  { label: 'Apr\u2013May', key: 'biMonthly_5' },
];

const monthlyCards = [
  { label: 'August', key: 'monthly_1' },
  { label: 'September', key: 'monthly_2' },
  { label: 'October', key: 'monthly_3' },
  { label: 'November', key: 'monthly_4' },
  { label: 'December', key: 'monthly_5' },
  { label: 'January', key: 'monthly_6' },
  { label: 'February', key: 'monthly_7' },
  { label: 'March', key: 'monthly_8' },
  { label: 'April', key: 'monthly_9' },
  { label: 'May', key: 'monthly_10' },
];

// Awards where the stat accumulates across the season (GW-context relevant)
const GW_SPECIFIC_KEYS = new Set([
  'leagueLeaders', 'mostConsistent', 'mostTransfers', 'mostHits',
  'neverGetFancy', 'benchDisaster', 'mostMinutes', 'mostCards', 'mostBps',
]);

function StatusPill({ status }) {
  if (status === 'live') {
    return (
      <span
        className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5"
        style={{ color: '#00e87a', border: '1px solid #00e87a', borderRadius: 4 }}
      >
        LIVE
      </span>
    );
  }
  if (status === 'final') {
    return (
      <span
        className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5"
        style={{ color: '#525252', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4 }}
      >
        FINAL
      </span>
    );
  }
  if (status === 'upcoming') {
    return (
      <span
        className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5"
        style={{ color: '#525252', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4 }}
      >
        UPCOMING
      </span>
    );
  }
  return null;
}

function renderStatCard({ title, titleSuffix, description, key, variant, awards, currentGw, userName, userPositions, statusPill, isUpcoming, upcomingStartGw, seasonFinished, countingKeys }) {
  const entriesWithContext = (awards[key] || []).map((entry) => ({
    ...entry,
    contextString: getAwardLabel(key, entry.context),
  }));
  const desc = GW_SPECIFIC_KEYS.has(key) && currentGw
    ? `${description} \u00B7 GW${currentGw}`
    : description;

  // Auto-inject LIVE pill for counting awards when season is active (periodic prizes handle their own pill)
  const isPeriodic = key.startsWith('biMonthly_') || key.startsWith('monthly_');
  const isCounting = !countingKeys || countingKeys.has(key);
  const livePill = !seasonFinished && isCounting && !isPeriodic
    ? <StatusPill status="live" />
    : null;

  return (
    <StatCard
      key={key}
      title={title}
      titleSuffix={titleSuffix}
      description={desc}
      entries={entriesWithContext}
      variant={variant}
      category={key}
      userName={userName}
      userPosition={userPositions?.[key]}
      statusPill={statusPill || livePill}
      isUpcoming={isUpcoming}
      upcomingStartGw={upcomingStartGw}
    />
  );
}

/**
 * Sort periodic cards: live first, then completed (reverse chrono), then upcoming.
 */
function sortPeriodicCards(cards, meta) {
  if (!meta) return cards;

  const live = [];
  const final = [];
  const upcoming = [];

  for (const card of cards) {
    const m = meta[card.key];
    if (!m) { upcoming.push(card); continue; }
    if (m.status === 'live') live.push(card);
    else if (m.status === 'final') final.push(card);
    else upcoming.push(card);
  }

  // Completed in reverse chronological (later periods first)
  final.reverse();

  return [...live, ...final, ...upcoming];
}

function SectionHeader({ label }) {
  return (
    <div className="px-4 pt-8 pb-3 flex items-center gap-3">
      <p className="font-mono text-[9px] uppercase tracking-widest text-[#525252] shrink-0">
        {label}
      </p>
      <div className="flex-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
    </div>
  );
}

export default function AwardsCard({ awards, isSampled, userName, userPositions, currentGw, leagueConfig, biMonthlyMeta, seasonFinished }) {
  const [showMore, setShowMore] = useState(false);
  const { track } = useUmami();
  const gwSuffix = currentGw ? ` \u00B7 GW${currentGw}` : '';
  const hasBiMonthly = leagueConfig?.biMonthly && awards.biMonthly_1;
  const hasMonthly = leagueConfig?.monthly && awards.monthly_1;
  const hasPeriodicPrizes = hasBiMonthly || hasMonthly;
  const hasOldDoll = awards.oldDoll?.length > 0;
  const countingKeys = leagueConfig?.countingAwardKeys;
  const periodicOnly = leagueConfig?.periodicOnly ?? false;

  // Split main awards into counting vs non-counting
  const countingMainCards = countingKeys
    ? mainAwardCards.filter(c => countingKeys.has(c.key))
    : mainAwardCards;
  const nonCountingMainCards = countingKeys
    ? mainAwardCards.filter(c => !countingKeys.has(c.key))
    : [];

  // Non-counting: main non-counting awards + behavioural stats, behind collapsible
  const allNonCountingCards = [...nonCountingMainCards, ...collapsibleAwardCards];

  const cardProps = { awards, currentGw, userName, userPositions, seasonFinished, countingKeys };

  // Periodic prize cards
  const periodicCards = hasMonthly ? monthlyCards : biMonthlyCards;
  const sortedPeriodic = sortPeriodicCards(periodicCards, biMonthlyMeta);
  const periodicLabel = hasMonthly ? 'Monthly Prizes' : 'Bi-Monthly Prizes';

  return (
    <div>
      {/* Counting awards section — hidden when periodicOnly (no spot prizes for monthly-only leagues) */}
      {!periodicOnly && (
        <>
          <SectionHeader label={`${hasPeriodicPrizes ? 'Spot Prizes' : 'League Awards'}${gwSuffix}`} />

          {isSampled && (
            <p className="font-mono text-[9px] text-[#525252] text-center px-4 py-3">
              Only top 30 managers sampled for award calculations.
            </p>
          )}

          <div className="px-4 pt-3 pb-8 space-y-3">
            {countingMainCards.map(({ title, description, key, variant }) =>
              renderStatCard({ title, description, key, variant, ...cardProps })
            )}

            {hasOldDoll && renderStatCard({
              title: 'Old Doll Prize',
              description: 'Top-ranked qualifying manager',
              key: 'oldDoll',
              variant: 'fame',
              ...cardProps,
            })}
          </div>
        </>
      )}

      {/* Periodic prizes section (bi-monthly or monthly) */}
      {hasPeriodicPrizes && (
        <>
          <SectionHeader label={`${periodicLabel}${gwSuffix}`} />

          <div className="px-4 pt-3 pb-8 space-y-3">
            {sortedPeriodic.map(({ label, key }) => {
              const m = biMonthlyMeta?.[key];
              const status = m?.status || 'upcoming';
              const gwRange = m?.gwRange || '';

              return renderStatCard({
                title: label,
                titleSuffix: gwRange ? `\u00B7 ${gwRange}` : undefined,
                description: 'Most net points in period',
                key,
                variant: 'fame',
                statusPill: <StatusPill status={status} />,
                isUpcoming: status === 'upcoming',
                upcomingStartGw: m?.startGw,
                ...cardProps,
              });
            })}
          </div>
        </>
      )}

      {/* Non-counting awards — always below the split */}
      {allNonCountingCards.length > 0 && (
        <>
          {!showMore && (
            <div className="px-4 pt-2 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button
                onClick={() => { track('awards_expanded'); setShowMore(true); }}
                className="w-full flex items-center justify-center py-5"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#525252]">
                  MORE AWARDS ({allNonCountingCards.length}) &#9660;
                </span>
              </button>
            </div>
          )}

          {showMore && (
            <div className="px-4 pt-1 pb-4 space-y-3">
              {allNonCountingCards.map(({ title, description, key, variant }) =>
                renderStatCard({ title, description, key, variant, ...cardProps })
              )}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button
                  onClick={() => { track('awards_collapsed'); setShowMore(false); }}
                  className="w-full flex items-center justify-center py-5"
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#525252]">
                    COLLAPSE &#9650;
                  </span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
