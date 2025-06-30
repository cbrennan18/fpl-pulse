import { useNavigate } from 'react-router-dom';
import BaseLayout from '../layouts/BaseLayout';
import OverallRankChart from '../components/OverallRankChart';
import NextDeadlineCard from '../components/NextDeadlineCard';
import TopBar from '../components/TopBar';
import PlaceholderCard from '../components/PlaceholderCard';
import SkeletonHomepage from '../components/SkeletonHomepage';
import useParallax from '../hooks/useParallax';
import { TrophyIcon, HeartbeatIcon } from '@phosphor-icons/react';

export default function Homepage({ manager, summary, history, loading, error, teamId }) {
  const navigate = useNavigate();
  useParallax(); 

  // Handle loading state early
  if (loading) {
    return (
      <BaseLayout>
        <SkeletonHomepage />
      </BaseLayout>
    );
  }

  // Handle error state early
  if (error) {
    return (
      <BaseLayout>
        <div className="text-center mt-10 text-sm text-danger">Team not found. Please try again.</div>
      </BaseLayout>
    );
  }

  // Guard against missing data
  if (!manager || !summary || !history?.length) return null;

  return (
    <BaseLayout>
      {/* Fixed TopBar at top of screen */}
      <TopBar
        title={manager.teamName}
        showBackButton={true}
        onBack={() => navigate('/')}
      />

      {/* Push content below fixed TopBar; height defined in Tailwind config */}
      <div className="pt-safe-bar" />

      {/* Wraps the green stats section + the floating buttons */}
      <div className="relative z-10">
        {/* Green card with rounded bottom, stat content and chart */}
        
        <div id="parallax-bg" className="absolute top-0 left-0 w-full h-[100vw] bg-primary-dark rounded-b-3xl z-0 transition-transform duration-100 ease-out" />
        <div className="relative z-10 px-6 pt-safe-bar pb-24 text-white">
          {/* Flex row of key stats (rank + points), spaced apart */}
          <div className="flex justify-between items-start gap-6">
            <div>
              <p className="text-xs uppercase opacity-80">Overall Rank</p>
              <p className="text-lg font-semibold">{summary.overallRank.toLocaleString()}</p>
              <p className="text-xs opacity-60">
                GW{summary.latestGwNumber}: {summary.lastGwRank.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase opacity-80">Total Points</p>
              <p className="text-lg font-semibold">{summary.totalPoints}</p>
              <p className="text-xs opacity-60">
                GW{summary.latestGwNumber}: {summary.lastGwPoints}
              </p>
            </div>
          </div>

          {/* Chart with some top margin for spacing below stats */}
          <div className="mt-6">
            <OverallRankChart history={history.map(gw => gw.overall_rank)} />
          </div>
        </div>

        {/* Floating buttons overlap the bottom of the green card */}
        <div className="absolute left-0 right-0 -bottom-6 px-4 flex gap-4 z-20">
          {/* Button 1: Navigates to mini league */}
          {/* <button 
            onClick={() => navigate(`/mini-leagues?id=${teamId}`)} 
            className="flex-1 bg-white shadow-md rounded-xl py-4 px-2 flex flex-col items-center justify-center text-center"
          >
            <TrophyIcon size={32} weight="duotone" className="text-primary mb-1" />
            <span className="text-sm font-semibold text-heading">Mini League</span>
            <span className="text-xs text-subtext mt-1">View Analysis</span>
          </button> */}
          <button 
            disabled
            className="flex-1 bg-gray-200 opacity-95 shadow-md rounded-xl py-4 px-2 flex flex-col items-center justify-center text-center cursor-not-allowed"
          >
            <TrophyIcon size={32} weight="duotone" className="text-subtext mb-1" />
            <span className="text-sm font-semibold text-heading">Mini League</span>
            <span className="text-xs text-subtext mt-1 italic">Coming soon...</span>
          </button>
          {/* Button 2: FPL Pulse */}
          <button
            onClick={() => navigate(`/pulse?id=${teamId}`)}
            className="flex-1 bg-white shadow-md rounded-xl py-4 px-2 flex flex-col items-center justify-center text-center"
          >
            <HeartbeatIcon size={32} weight="duotone" className="text-primary mb-1" />
            <span className="text-sm font-semibold text-heading">FPL Pulse</span>
            <span className="text-xs text-subtext mt-1">View Season</span>
          </button>
        </div>
      </div>

      {/* Remaining content below the green section + buttons */}
      <div className="relative mt-10 px-4 space-y-4 z-10">
        {/* Countdown to next deadline */}
        <NextDeadlineCard />

        {/* Placeholders for future sections */}
        {/* <PlaceholderCard message="Player insights coming soon..." />
        <PlaceholderCard message="Weekly insights coming soon..." />
        <PlaceholderCard message="Transfer insights coming soon..." /> */}
      </div>
    </BaseLayout>
  );
}