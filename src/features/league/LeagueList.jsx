import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import PulseLogo from '../../assets/logo-mark.svg';
import SkeletonLeagueList from '../../components/skeletons/SkeletonLeagueList';
import { GOLD, SILVER, BRONZE } from '../../utils/constants';

const stagger = (i) => ({ delay: i * 0.04, duration: 0.3 });
const fadeUp = (i) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: stagger(i),
});

const getMedal = (rank, totalMembers) => {
  if (!totalMembers || totalMembers <= 0) return null;
  if (rank === 1) return 'gold';
  if (totalMembers < 10) {
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return null;
  }
  const pct = rank / totalMembers;
  if (pct <= 0.10) return 'silver';
  if (pct <= 0.20) return 'bronze';
  return null;
};

const medalColor = (medal) => {
  if (medal === 'gold') return GOLD;
  if (medal === 'silver') return SILVER;
  if (medal === 'bronze') return BRONZE;
  return null;
};

const medalBg = (medal) => {
  if (medal === 'gold') return 'rgba(240,180,41,0.04)';
  if (medal === 'silver') return 'rgba(159,179,190,0.04)';
  if (medal === 'bronze') return 'rgba(205,127,50,0.04)';
  return undefined;
};

const formatRank = (r) => {
  if (r >= 1_000_000) return `${(r / 1_000_000).toFixed(2)}M`;
  if (r >= 1_000) return `${(r / 1_000).toFixed(1)}K`;
  return r.toString();
};

const rankColor = (rank, medal) => {
  if (medal) return medalColor(medal);
  return '#525252';
};

export default function LeagueList({ manager, leagues, loading, error, teamId }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <SkeletonLeagueList />
      </div>
    );
  }

  if (error || !manager) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="font-body text-sm text-[#e5484d]">League data not available.</p>
      </div>
    );
  }

  // Compute medals for all leagues
  const leaguesWithMedals = leagues.map((league) => ({
    ...league,
    medal: getMedal(league.entry_rank, league.rank_count),
  }));

  const goldCount = leaguesWithMedals.filter((l) => l.medal === 'gold').length;
  const silverCount = leaguesWithMedals.filter((l) => l.medal === 'silver').length;
  const bronzeCount = leaguesWithMedals.filter((l) => l.medal === 'bronze').length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Navigation bar */}
      <motion.div {...fadeUp(0)}>
        <div className="px-5 pt-safe-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate(`/home?id=${teamId}`)}>
              <ArrowLeftIcon size={28} weight="light" className="text-white/55" />
            </button>
            <div className="text-center">
              <span className="font-body font-semibold text-[16px] text-white block">MY LEAGUES</span>
              <span className="font-body font-normal text-[12px] text-[#525252] block">{manager.teamName}</span>
            </div>
            <img src={PulseLogo} alt="FPL Pulse" className="w-6 h-6" />
          </div>
        </div>
      </motion.div>

      {/* Summary strip */}
      <motion.div {...fadeUp(1)}>
        <div className="bg-[#141414] px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="font-mono text-[9px] uppercase tracking-widest text-[#525252] text-center">
            {leagues.length} LEAGUES
            <span className="mx-1.5">&middot;</span>
            <span style={{ color: GOLD }}>GOLD: {goldCount || '\u2014'}</span>
            <span className="mx-1.5">&middot;</span>
            <span style={{ color: SILVER }}>SILVER: {silverCount || '\u2014'}</span>
            <span className="mx-1.5">&middot;</span>
            <span style={{ color: BRONZE }}>BRONZE: {bronzeCount || '\u2014'}</span>
          </p>
        </div>
      </motion.div>

      {/* League rows */}
      <div>
        {leaguesWithMedals.map((league, i) => {
          const rank = league.entry_rank;
          const { medal } = league;
          const accent = medalColor(medal);
          const bg = medalBg(medal);
          const diff = league.entry_last_rank ? league.entry_last_rank - rank : 0;

          return (
            <motion.button
              key={league.id}
              {...fadeUp(i + 2)}
              onClick={() => navigate(`/mini-league?id=${league.id}&teamId=${teamId}`)}
              className="w-full min-h-[64px] flex items-center text-left active:bg-[#141414] transition-colors duration-150 relative"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                backgroundColor: bg,
              }}
            >
              {/* Medal accent bar */}
              {accent && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ backgroundColor: accent }}
                />
              )}

              {/* Rank column — fixed 72px, right-aligned */}
              <div className="w-[72px] shrink-0 flex items-center justify-end pr-3 gap-1.5">
                {accent && (
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: accent }}
                  />
                )}
                <span
                  className="font-mono text-[15px] tabular-nums text-right"
                  style={{ color: rankColor(rank, medal) }}
                >
                  {formatRank(rank)}
                </span>
              </div>

              {/* League info */}
              <div className="flex-1 py-3 min-w-0">
                <p className="font-body font-medium text-[14px] text-white leading-tight">
                  {league.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {league.rank_count > 0 && (
                    <span className="font-mono text-[10px] text-[#525252]">
                      {league.rank_count.toLocaleString()} members
                    </span>
                  )}
                  {league.rank_count >= 10000 && (
                    <span className="font-mono text-[8px] text-[#525252] uppercase border border-[#525252]/15 rounded px-1 py-px leading-none">
                      Large
                    </span>
                  )}
                  {diff !== 0 ? (
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: diff > 0 ? '#00e87a' : '#e5484d' }}
                    >
                      {diff > 0 ? `\u2191${formatRank(diff)}` : `\u2193${formatRank(Math.abs(diff))}`}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-[#525252]">&mdash;</span>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <CaretRightIcon size={16} className="text-[#525252] shrink-0 mr-4" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
