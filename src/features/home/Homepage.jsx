import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import OverallRankChart from './OverallRankChart';
import DeadlineStrip from './DeadlineStrip';
import SkeletonHomepage from '../../components/skeletons/SkeletonHomepage';
import { CaretRightIcon, ArrowLeftIcon } from '@phosphor-icons/react';
import PulseLogo from '../../assets/logo-mark.svg';
import { HEADER_GRADIENT } from '../../utils/constants';
import useUmami from '../../hooks/useUmami';

const stagger = (i) => ({ delay: i * 0.04, duration: 0.3 });
const fadeUp = (i) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: stagger(i),
});

export default function Homepage({ manager, summary, history, nextDeadline, loading, error, teamId }) {
  const navigate = useNavigate();
  const { track } = useUmami();
  const [scrubIndex, setScrubIndex] = useState(null);

  const handleScrub = useCallback((idx) => setScrubIndex(idx), []);
  const handleScrubEnd = useCallback(() => setScrubIndex(null), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <SkeletonHomepage />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="font-body text-sm text-[#e5484d]">Team not found. Please try again.</p>
      </div>
    );
  }

  if (!manager || !summary || !history?.length) return null;

  const avgPtsPerGw = (summary.totalPoints / (summary.latestGwNumber || 1)).toFixed(1);

  const ranks = history.map(gw => gw.overall_rank);
  const peakRank = Math.min(...ranks);
  const peakGw = history.find(gw => gw.overall_rank === peakRank)?.event || 0;

  let rising = 0;
  let falling = 0;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] < ranks[i - 1]) rising++;
    else if (ranks[i] > ranks[i - 1]) falling++;
  }

  const formatRank = (r) => {
    if (r >= 1_000_000) return `${(r / 1_000_000).toFixed(1)}m`;
    if (r >= 1_000) return `${(r / 1_000).toFixed(0)}k`;
    return r.toLocaleString();
  };

  // Scrub state
  const isScrubbing = scrubIndex !== null;
  const scrubGw = isScrubbing ? history[scrubIndex] : null;
  const displayRank = isScrubbing ? scrubGw.overall_rank : summary.overallRank;
  const displayPoints = isScrubbing ? scrubGw.total_points : summary.totalPoints;
  const displayCaption = isScrubbing
    ? `GW${scrubGw.event} \u00b7 ${formatRank(scrubGw.overall_rank)}`
    : `Peak: ${formatRank(peakRank)} \u00b7 GW${peakGw}`;
  const displayPointsCaption = isScrubbing
    ? `GW${scrubGw.event} \u00b7 ${scrubGw.points} pts`
    : `${avgPtsPerGw} pts / GW`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* ── HEADER + CHART: one seamless gradient ── */}
      <motion.div {...fadeUp(0)}>
        <div style={{ background: HEADER_GRADIENT }}>
          <div className="px-5 pt-safe-6">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => navigate('/')}>
                <ArrowLeftIcon size={28} weight="light" className="text-white/55" />
              </button>
              <span className="font-body font-semibold text-[16px] text-white truncate max-w-[60%] text-center">
                {manager.teamName}
              </span>
              <img src={PulseLogo} alt="FPL Pulse" className="w-6 h-6" />
            </div>

            {/* Hero stats */}
            <div className="grid grid-cols-2 gap-4 pb-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 mb-1">Overall Rank</p>
                <p className="font-display text-[64px] leading-[0.85] text-white" style={{ transition: 'opacity 0.3s ease' }}>
                  {formatRank(displayRank)}
                </p>
                <p className="font-mono text-[11px] text-[#707070] mt-1.5" style={{ transition: 'opacity 0.3s ease' }}>
                  {displayCaption}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 mb-1">Total Points</p>
                <p className="font-display text-[64px] leading-[0.85] text-white" style={{ transition: 'opacity 0.3s ease' }}>
                  {displayPoints}
                </p>
                <p className="font-mono text-[11px] text-[#707070] mt-1.5" style={{ transition: 'opacity 0.3s ease' }}>
                  {displayPointsCaption}
                </p>
              </div>
            </div>
          </div>

          {/* Chart — inside same gradient, no seam */}
          <div className="touch-none">
            <OverallRankChart history={history} activeIndex={scrubIndex} onScrub={handleScrub} onScrubEnd={handleScrubEnd} />
          </div>
        </div>
      </motion.div>

      {/* ── RISING / FALLING ── */}
      <motion.div {...fadeUp(2)}>
        <div className="flex items-center justify-center gap-5 py-1">
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-[20px] text-[#00e87a] leading-none">&uarr;</span>
              <span className="font-display text-[52px] leading-none text-white">{rising}</span>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[#525252]">Rising</p>
          </div>
          <span className="font-mono text-[28px] text-[#525252] leading-none select-none">/</span>
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-[20px] text-[#e5484d] leading-none">&darr;</span>
              <span className="font-display text-[52px] leading-none text-white">{falling}</span>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[#525252]">Falling</p>
          </div>
        </div>
      </motion.div>

      {/* ── GW SUMMARY ── */}
      <motion.div {...fadeUp(3)}>
        <div className="mx-4 mt-1 bg-white/[0.04] rounded-xl overflow-hidden">
          <div className="flex">
            <GwStat label="GW Pts" value={summary.lastGwPoints} />
            <GwDivider />
            <GwStat label="GW Rank" value={formatRank(summary.lastGwRank)} />
            <GwDivider />
            <GwStat label="Transfers" value={summary.lastGwTransfers} />
            <GwDivider />
            <GwStat label="Hits" value={summary.lastGwHits} accent={summary.lastGwHits > 0 ? '#e5484d' : null} />
          </div>
        </div>
      </motion.div>

      {/* ── DESTINATION BANNERS ── */}
      <div className="px-4 mt-2.5 space-y-2">
        <motion.div
          {...fadeUp(4)}
          className="w-full text-left rounded-xl h-[130px] flex items-center justify-between pointer-events-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', padding: '18px 20px', opacity: 0.45 }}
        >
          <div>
            <p className="font-display text-[56px] leading-[0.9] text-[#00e87a]/20">FPL</p>
            <p className="font-display text-[56px] leading-[0.9] text-white/20 -mt-0.5">WRAPPED</p>
            <p className="font-mono text-[9px] uppercase text-[#525252] mt-1.5" style={{ letterSpacing: '0.1em' }}>COMING AT SEASON END</p>
          </div>
          <LockIcon />
        </motion.div>

        <motion.button
          {...fadeUp(5)}
          onClick={() => { track('leagues_banner_clicked'); navigate(`/mini-leagues?id=${teamId}`); }}
          className="w-full text-left rounded-xl border-l-2 border-[#f0b429] h-[130px] flex items-center justify-between"
          style={{ backgroundColor: 'rgba(240,180,41,0.04)', padding: '18px 20px' }}
        >
          <div>
            <p className="font-display text-[56px] leading-[0.9] text-[#f0b429]">LEAGUE</p>
            <p className="font-display text-[56px] leading-[0.9] text-white -mt-0.5">AWARDS</p>
            <p className="font-mono text-[9px] uppercase text-[#525252] mt-1.5" style={{ letterSpacing: '0.1em' }}>WHO WON? WHO BOTTLED IT? FIND OUT.</p>
          </div>
          <CaretRightIcon size={28} weight="bold" className="text-[#f0b429] shrink-0 ml-4" />
        </motion.button>
      </div>

      {/* ── DEADLINE ── */}
      {nextDeadline && (
        <motion.div {...fadeUp(6)} className="pt-3">
          <DeadlineStrip deadline={nextDeadline} />
        </motion.div>
      )}
    </div>
  );
}

/* ── SUBCOMPONENTS ── */
function GwStat({ label, value, accent }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-3">
      <p className="font-mono text-[9px] uppercase tracking-widest text-[#707070] mb-1">{label}</p>
      <p
        className="font-body font-bold text-[26px] leading-none"
        style={{ color: accent || '#ffffff' }}
      >
        {value}
      </p>
    </div>
  );
}

function GwDivider() {
  return <div className="w-px self-stretch my-3 bg-white/[0.07]" />;
}

function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-4">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
