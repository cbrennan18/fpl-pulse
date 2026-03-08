import { useState } from 'react';
import StatCard from './StatCard';
import { getAwardLabel } from './awardLabels';

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

function renderStatCard({ title, titleSuffix, description, key, variant, awards, currentGw, userName, userPositions, statusPill, isUpcoming, upcomingStartGw }) {
  const entriesWithContext = (awards[key] || []).map((entry) => ({
    ...entry,
    contextString: getAwardLabel(key, entry.context),
  }));
  const desc = GW_SPECIFIC_KEYS.has(key) && currentGw
    ? `${description} \u00B7 GW${currentGw}`
    : description;

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
      statusPill={statusPill}
      isUpcoming={isUpcoming}
      upcomingStartGw={upcomingStartGw}
    />
  );
}

/**
 * Sort bi-monthly cards: live first, then completed (reverse chrono), then upcoming.
 */
function sortBiMonthlyCards(cards, meta) {
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

export default function AwardsCard({ awards, isSampled, userName, userPositions, currentGw, leagueConfig, biMonthlyMeta }) {
  const [showMore, setShowMore] = useState(false);
  const gwSuffix = currentGw ? ` \u00B7 GW${currentGw}` : '';
  const hasBiMonthly = leagueConfig?.biMonthly && awards.biMonthly_1;
  const hasOldDoll = awards.oldDoll?.length > 0;
  const countingKeys = leagueConfig?.countingAwardKeys;

  // For leagues with counting keys, split main awards into counting vs other
  const countingMainCards = countingKeys
    ? mainAwardCards.filter(c => countingKeys.has(c.key))
    : mainAwardCards;
  const nonCountingMainCards = countingKeys
    ? mainAwardCards.filter(c => !countingKeys.has(c.key))
    : [];

  // Collapsible cards: always the behavioural stats + any non-counting main awards
  const allCollapsibleCards = [...nonCountingMainCards, ...collapsibleAwardCards];

  const cardProps = { awards, currentGw, userName, userPositions };

  // Sort bi-monthly cards by status
  const sortedBiMonthly = sortBiMonthlyCards(biMonthlyCards, biMonthlyMeta);

  return (
    <div>
      {/* Spot prizes / League awards section */}
      <div className="px-4 pt-8 pb-3 flex items-center gap-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-[#525252] shrink-0">
          {hasBiMonthly ? 'Spot Prizes' : 'League Awards'}{gwSuffix}
        </p>
        <div className="flex-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
      </div>

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

      {/* Bi-monthly prizes section */}
      {hasBiMonthly && (
        <>
          <div className="px-4 pt-8 pb-3 flex items-center gap-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-[#525252] shrink-0">
              Bi-Monthly Prizes{gwSuffix}
            </p>
            <div className="flex-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
          </div>

          <div className="px-4 pt-3 pb-8 space-y-3">
            {sortedBiMonthly.map(({ label, key }) => {
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

      {/* Collapsible lower-engagement awards */}
      {allCollapsibleCards.length > 0 && (
        <>
          {!showMore && (
            <div className="px-4 pt-2 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button
                onClick={() => setShowMore(true)}
                className="w-full flex items-center justify-center py-5"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#525252]">
                  MORE AWARDS ({allCollapsibleCards.length}) &#9660;
                </span>
              </button>
            </div>
          )}

          {showMore && (
            <div className="px-4 pt-1 pb-4 space-y-3">
              {allCollapsibleCards.map(({ title, description, key, variant }) =>
                renderStatCard({ title, description, key, variant, ...cardProps })
              )}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button
                  onClick={() => setShowMore(false)}
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
