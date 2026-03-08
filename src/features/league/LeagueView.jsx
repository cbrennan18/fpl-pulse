import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import PulseLogo from '../../assets/logo-mark.svg';
import MedalTable from './MedalTable';
import AwardsCard from './AwardsCard';
import SkeletonLeagueView from '../../components/skeletons/SkeletonLeagueView';
import { HEADER_GRADIENT } from '../../utils/constants';
import useUmami from '../../hooks/useUmami';

const stagger = (i) => ({ delay: i * 0.04, duration: 0.3 });
const fadeUp = (i) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: stagger(i),
});

const rankDisplayColor = (rank) => {
  if (rank === 1) return '#f0b429';
  if (rank === 2) return '#9fb3be';
  if (rank === 3) return '#a0522d';
  return '#ffffff';
};

const AWARD_LABELS = {
  leagueLeaders: 'No Hitter',
  oneHitWonders: 'One Week Wonder',
  hotStreak: 'Hot Streak',
  mostConsistent: 'Most Consistent',
  bestWildcard: 'Best Wildcard',
  bestFreeHit: 'Best Free Hit',
  bestPunt: 'Best Punt',
  mostMinutes: 'Most Minutes',
  mostBps: 'Most BPs',
  mostHits: 'Harry Redknapp Wheeler Dealer',
  worstWildcard: 'Worst Wildcard',
  worstFreeHit: 'Worst Free Hit',
  neverGetFancy: 'Never Get Fancy',
  benchDisaster: 'Divock Origi Award',
  earlyBird: 'Early Bird',
  lateOwl: 'AndyFPL Prize',
  mostCards: 'Most Cards',
  biMonthly_1: 'Aug–Sep',
  biMonthly_2: 'Oct–Nov',
  biMonthly_3: 'Dec–Jan',
  biMonthly_4: 'Feb–Mar',
  biMonthly_5: 'Apr–May',
  monthly_1: 'August',
  monthly_2: 'September',
  monthly_3: 'October',
  monthly_4: 'November',
  monthly_5: 'December',
  monthly_6: 'January',
  monthly_7: 'February',
  monthly_8: 'March',
  monthly_9: 'April',
  monthly_10: 'May',
  oldDoll: 'Old Doll Prize',
};

/**
 * Build medal table data: count gold/silver/bronze per manager across all award categories.
 * Returns sorted array of { name, gold, silver, bronze, total }.
 */
function buildMedalTable(awards, countingKeys, standings) {
  const counts = {};

  // Seed with all league members so everyone gets a row
  if (standings) {
    for (const s of standings) {
      counts[s.player_name] = { name: s.player_name, gold: 0, silver: 0, bronze: 0, leagueRank: s.rank };
    }
  }

  for (const [key, entries] of Object.entries(awards)) {
    if (!Array.isArray(entries) || !AWARD_LABELS[key]) continue;
    if (countingKeys && !countingKeys.has(key)) continue;
    entries.slice(0, 3).forEach((entry, idx) => {
      if (!counts[entry.name]) counts[entry.name] = { name: entry.name, gold: 0, silver: 0, bronze: 0, leagueRank: null };
      if (idx === 0) counts[entry.name].gold++;
      else if (idx === 1) counts[entry.name].silver++;
      else if (idx === 2) counts[entry.name].bronze++;
    });
  }

  return Object.values(counts)
  .map((m) => ({ ...m, total: m.gold + m.silver + m.bronze }))
  .sort(
    (a, b) =>
      b.gold - a.gold ||
      b.silver - a.silver ||
      b.bronze - a.bronze ||
      (a.leagueRank ?? 999) - (b.leagueRank ?? 999)
  );
}

/**
 * Compute user's position (1-indexed) in each award category.
 * Returns { [awardKey]: number | null }.
 */
function getUserPositions(awards, userName) {
  const positions = {};
  if (!userName) return positions;

  for (const [key, entries] of Object.entries(awards)) {
    if (!Array.isArray(entries) || !AWARD_LABELS[key]) continue;
    const idx = entries.findIndex((e) => e.name === userName);
    positions[key] = idx >= 0 ? idx + 1 : null;
  }
  return positions;
}

export default function LeagueView({ league, standings, managerTeamId, awards, isSampled, loading, error, leagueConfig, biMonthlyMeta }) {
  const [searchParams] = useSearchParams();
  const leagueId = searchParams.get('id');
  const teamId = searchParams.get('teamId');
  const navigate = useNavigate();
  const { track } = useUmami();

  // Track error and success states
  useEffect(() => {
    if (loading) return;
    if (error || !league) {
      track('league_error', { leagueId });
    } else {
      track('league_view_loaded', { leagueId, name: league.name });
    }
  }, [loading, error, league, leagueId, track]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <SkeletonLeagueView />
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-6">
        <p className="font-body text-sm text-[#525252] text-center">
          League data isn't available right now. Try again later.
        </p>
        <button
          onClick={() => navigate(`/mini-leagues?id=${teamId}`)}
          className="font-mono text-[11px] uppercase tracking-wider text-white/70 border border-white/15 rounded px-4 py-2"
        >
          Back to leagues
        </button>
      </div>
    );
  }

  const {
    name,
    entry_rank,
    points_behind,
  } = league;

  // Compute user data for child components
  const user = standings.find((e) => Number(e.entry) === Number(managerTeamId));
  const userName = user?.player_name;
  const isAwardsReady = awards && typeof awards === 'object' && !Array.isArray(awards);
  const medalTable = isAwardsReady ? buildMedalTable(awards, leagueConfig?.countingAwardKeys, standings) : [];
  const userPositions = isAwardsReady ? getUserPositions(awards, userName) : {};

  // Medal rank + breakdown for header
  const userMedalIdx = medalTable.findIndex((m) => m.name === userName);
  const userMedalRank = userMedalIdx >= 0 ? userMedalIdx + 1 : null;
  const userMedals = userMedalIdx >= 0 ? medalTable[userMedalIdx] : null;

  // Leader info for points gap caption
  const sorted = [...standings].sort((a, b) => a.rank - b.rank);
  const leader = sorted[0];
  const leaderName = leader?.player_name;
  const isLeading = entry_rank === 1;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Navigation bar */}
      <motion.div {...fadeUp(0)}>
        <div className="px-5 pt-safe-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate(`/mini-leagues?id=${teamId}`)}>
              <ArrowLeftIcon size={28} weight="light" className="text-white/55" />
            </button>
            <span className="font-body font-semibold text-[15px] text-white text-center max-w-[65%] leading-tight">
              {name}
            </span>
            <img src={PulseLogo} alt="FPL Pulse" className="w-6 h-6" />
          </div>
        </div>
      </motion.div>

      {/* Header block — gradient */}
      <motion.div {...fadeUp(1)}>
        <div style={{ background: HEADER_GRADIENT }}>
          <div className="grid grid-cols-2 gap-4 px-5 pb-2 pt-2">
            {/* Medal Rank */}
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-[#525252] mb-1">Medal Rank</p>
              <p
                className="font-display text-[80px] leading-[0.85]"
                style={{ color: rankDisplayColor(userMedalRank) }}
              >
                {userMedalRank ?? '\u2014'}
              </p>
              {userMedals && (
                <p className="font-mono text-[11px] mt-1.5">
                  <span style={{ color: '#f0b429' }}>{userMedals.gold}</span>
                  <span className="text-[#525252]"> &middot; </span>
                  <span style={{ color: '#9fb3be' }}>{userMedals.silver}</span>
                  <span className="text-[#525252]"> &middot; </span>
                  <span style={{ color: '#a0522d' }}>{userMedals.bronze}</span>
                </p>
              )}
            </div>

            {/* League Rank */}
            <div className="text-right">
              <p className="font-mono text-[9px] uppercase tracking-widest text-[#525252] mb-1">League Rank</p>
              <p className="font-display text-[80px] leading-[0.85] text-white">
                {entry_rank ?? '\u2014'}
              </p>
              <p className="font-mono text-[11px] text-[#525252] mt-1.5">
                {isLeading
                  ? `Leading by ${Math.abs((sorted[1]?.total ?? 0) - (sorted[0]?.total ?? 0))} pts`
                  : `${points_behind} pts behind ${leaderName}`}
              </p>
            </div>
          </div>

          {/* GW context line — inside header block */}
          {league.current_gw && (
            <p className="font-mono text-[9px] text-[#525252] px-5 mt-2 pb-3">
              UPDATED AFTER GW{league.current_gw}
            </p>
          )}
        </div>
      </motion.div>

      {/* Spacer between header and medal table */}
      <div className="h-5" />

      {/* Medal Table */}
      {medalTable.length > 0 && (
        <motion.div {...fadeUp(3)}>
          <MedalTable
            medalTable={medalTable}
            standings={standings}
            userName={userName}
          />
        </motion.div>
      )}

      {/* Awards */}
      <motion.div {...fadeUp(4)}>
        <AwardsCard
          awards={awards}
          isSampled={isSampled}
          userName={userName}
          userPositions={userPositions}
          currentGw={league.current_gw}
          leagueConfig={leagueConfig}
          biMonthlyMeta={biMonthlyMeta}
        />
      </motion.div>
    </div>
  );
}
