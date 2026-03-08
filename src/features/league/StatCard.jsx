import {
  TrophyIcon,
  NumberCircleOneIcon,
  FlameIcon,
  EqualsIcon,
  ShieldCheckIcon,
  LightningIcon,
  SpadeIcon,
  ClockIcon,
  SoccerBallIcon,
  CoinsIcon,
  ShieldWarningIcon,
  QuestionIcon,
  CouchIcon,
  WatchIcon,
  AlarmIcon,
  CardsIcon,
} from '@phosphor-icons/react';
import { MEDAL_COLORS } from '../../utils/constants';

const iconMap = {
  leagueLeaders: TrophyIcon,
  oneHitWonders: NumberCircleOneIcon,
  hotStreak: FlameIcon,
  mostConsistent: EqualsIcon,
  bestWildcard: ShieldCheckIcon,
  bestFreeHit: LightningIcon,
  bestPunt: SpadeIcon,
  mostMinutes: ClockIcon,
  mostBps: SoccerBallIcon,
  mostHits: CoinsIcon,
  worstWildcard: ShieldWarningIcon,
  worstFreeHit: ShieldWarningIcon,
  neverGetFancy: QuestionIcon,
  benchDisaster: CouchIcon,
  earlyBird: WatchIcon,
  lateOwl: AlarmIcon,
  mostCards: CardsIcon,
};

const CHIP_KEYS = new Set(['bestFreeHit', 'worstFreeHit', 'bestWildcard', 'worstWildcard']);

const ACCENT_MAP = {
  hotStreak: '#f0b429',
  mostConsistent: '#f0b429',
  bestPunt: '#9b59b6',
  earlyBird: '#9b59b6',
  lateOwl: '#9b59b6',
  oldDoll: '#3b82f6',
};

const awardAccent = (category, variant) =>
  ACCENT_MAP[category]
  || (category.startsWith('biMonthly_') || category.startsWith('monthly_') ? '#f0b429' : null)
  || (variant === 'fame' ? '#00e87a' : '#e5484d');

export default function StatCard({
  title, titleSuffix, description, entries = [], variant = 'fame', category,
  userPosition, userName, statusPill, isUpcoming, upcomingStartGw,
}) {
  const accent = awardAccent(category, variant);
  const Icon = iconMap[category];
  const winner = entries[0];
  const runnersUp = entries.slice(1, 3);
  const userInTop3 = entries.slice(0, 3).some((e) => e.name === userName);
  const isChipAward = CHIP_KEYS.has(category);

  const userInEntries = entries.some((e) => e.name === userName);
  const userEntry = entries.find((e) => e.name === userName);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: '#141414',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTop: `2px solid ${accent}`,
        opacity: isUpcoming ? 0.5 : 1,
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="font-display text-[22px] text-white leading-tight">
            {title}
            {titleSuffix && (
              <span className="font-mono text-[10px] text-[#525252] ml-2 align-middle">{titleSuffix}</span>
            )}
          </h3>
          {description && (
            <p className="font-body font-normal text-[11px] text-[#525252] mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3 mt-1">
          {statusPill}
          {Icon && <Icon size={36} weight="light" style={{ color: accent }} />}
        </div>
      </div>

      {/* Entries */}
      <div className="px-4 pb-4">
        {isUpcoming ? (
          <div className="py-6 flex items-center justify-center">
            <span className="font-display text-[24px] text-[#525252]">
              STARTS GW{upcomingStartGw}
            </span>
          </div>
        ) : winner ? (
          <>
            {/* Winner row */}
            <div className="flex items-center py-2" style={{ borderLeft: '2px solid transparent' }}>
              <span className="font-mono text-[13px] tabular-nums text-[#525252] w-[28px] shrink-0 text-right pr-2">1</span>
              <div
                className="w-2 h-2 rounded-full shrink-0 mr-2"
                style={{ backgroundColor: MEDAL_COLORS[0] }}
              />
              <div className="flex-1 min-w-0">
                <span className="font-body font-medium text-[13px] text-white leading-tight">
                  {winner.name}
                </span>
                {winner.contextString && (
                  <p className="font-mono text-[10px] text-[#525252] mt-0.5">{winner.contextString}</p>
                )}
              </div>
              <span
                className="font-display text-[36px] leading-[0.85] shrink-0 ml-3"
                style={{ color: accent }}
              >
                {winner.value}
              </span>
            </div>

            {/* Runners up */}
            {runnersUp.map((entry, i) => (
              <div
                key={`${entry.name}-${entry.score}`}
                className="flex items-center py-1.5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderLeft: '2px solid transparent' }}
              >
                <span className="font-mono text-[13px] tabular-nums text-[#525252] w-[28px] shrink-0 text-right pr-2">{i + 2}</span>
                <div
                  className="w-2 h-2 rounded-full shrink-0 mr-2"
                  style={{ backgroundColor: MEDAL_COLORS[i + 1] }}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-body font-medium text-[13px] text-[#a8a8a8] leading-tight">
                    {entry.name}
                  </span>
                  {entry.contextString && (
                    <p className="font-mono text-[10px] text-[#525252] mt-0.5">{entry.contextString}</p>
                  )}
                </div>
                <span className="font-mono text-[13px] text-[#a8a8a8] shrink-0 ml-3">
                  {entry.value}
                </span>
              </div>
            ))}

            {/* User position row — shown when user is NOT in top 3 */}
            {!userInTop3 && (
              <>
                {isChipAward && !userInEntries ? (
                  <div
                    className="flex items-center min-h-[40px] py-1.5"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderLeft: '2px solid #525252' }}
                  >
                    <span className="font-mono text-[10px] text-[#525252] pl-[28px]">
                      YOU DIDN&apos;T USE THIS CHIP
                    </span>
                  </div>
                ) : category === 'hotStreak' && userEntry?.score === 0 ? (
                  <div
                    className="flex items-center min-h-[40px] py-1.5"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderLeft: '2px solid #525252' }}
                  >
                    <span className="font-mono text-[10px] text-[#525252] pl-[28px]">
                      NO STREAK THIS SEASON
                    </span>
                  </div>
                ) : userPosition ? (
                  <div
                    className="flex items-center py-1.5"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderLeft: '2px solid #00e87a' }}
                  >
                    <span className="font-mono text-[13px] tabular-nums text-[#525252] w-[28px] shrink-0 text-right pr-2">
                      {userPosition}
                    </span>
                    <div className="w-2 h-2 shrink-0 mr-2" />
                    <div className="flex-1 min-w-0">
                      <span className="font-body font-medium text-[13px] text-[#00e87a] leading-tight">
                        {userName}
                      </span>
                      {userEntry?.contextString && (
                        <p className="font-mono text-[10px] text-[#525252] mt-0.5">{userEntry.contextString}</p>
                      )}
                    </div>
                    {userEntry && (
                      <span className="font-mono text-[13px] text-[#a8a8a8] shrink-0 ml-3">
                        {userEntry.value}
                      </span>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : (
          <p className="font-mono text-[11px] text-[#525252]">Calculating...</p>
        )}
      </div>
    </div>
  );
}
