import { useSearchParams, useNavigate } from 'react-router-dom';
import BaseLayout from '../../components/BaseLayout';
import TopBar from '../../components/TopBar';
import LeagueStandings from './LeagueStandings';
import AwardsCard from './AwardsCard';
import SkeletonMiniLeagueView from '../../components/skeletons/SkeletonMiniLeagueView';
import useParallax from '../../hooks/useParallax';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
} from '@phosphor-icons/react';

export default function MiniLeagueView({ league, standings, managerTeamId, awards, isSampled, loading, error }) {

  if (loading) {
    return (
      <BaseLayout>
        <SkeletonMiniLeagueView />
      </BaseLayout>
    );
  }

  if (error || !league) {
    return (
      <BaseLayout>
        <div className="text-center mt-10 text-sm text-danger">
          League data could not be loaded. Please try again later.
        </div>
      </BaseLayout>
    );
  }

  const {
    name,
    avg_est_rank,
    avg_est_rank_prev,
    entry_rank,
    rank_change,
    points_behind,
    points_behind_prev,
    points_behind_change,
  } = league;

  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('teamId');
  const navigate = useNavigate();
  useParallax('parallax-bg');

  const format = (val) =>
    typeof val === 'number' ? val.toLocaleString() : val ?? '—';

  return (
    <BaseLayout>
      <TopBar
        title={name}
        showBackButton={true}
        onBack={() => navigate(`/mini-leagues?id=${teamId}`)}
      />
      <div className="pt-safe-bar" />

      {/* Green card + floating grid wrapper */}
      <div className="relative z-0">
        <div
          id="parallax-bg"
          className="absolute top-0 left-0 w-full h-[100vw] bg-primary-dark rounded-b-3xl z-0 transition-transform duration-100 ease-out"
        />
        <div className="relative z-10 text-white px-6 pt-safe-bar pb-24">
          {/* Flex row of key stats (top 5 avg + user rank), spaced apart */}
          <div className="flex justify-between items-start gap-6">
            <div>
              <p className="text-xs uppercase opacity-80">Top 5 Avg OR</p>
              <p className="text-lg font-semibold">{format(avg_est_rank)}</p>
              <p className="text-xs opacity-80 italic flex items-center gap-1">
                Chg: {renderChange(avg_est_rank, avg_est_rank_prev)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase opacity-80">Your League Rank</p>
              <p className="text-lg font-semibold flex items-center justify-end gap-1">
                {format(entry_rank)}
                {Number.isFinite(rank_change) && (
                  <span className="text-xs opacity-80 flex items-center gap-1">
                    (
                    {Math.abs(rank_change)}
                    {rank_change > 0 && <ArrowUpIcon size={12} weight="bold" />}
                    {rank_change < 0 && <ArrowDownIcon size={12} weight="bold" />}
                    {rank_change === 0 && <MinusIcon size={12} weight="bold" />}
                    )
                  </span>
                )}
              </p>
              <p className="text-xs opacity-80 italic flex items-center justify-end gap-1">
                Behind Leader: {format(points_behind)} pts
                {Number.isFinite(points_behind_change) && (
                  <span className="flex items-center gap-1">
                    (<span>{Math.abs(points_behind_change)}</span>
                    {points_behind_change > 0 && <ArrowUpIcon size={12} weight="bold" />}
                    {points_behind_change < 0 && <ArrowDownIcon size={12} weight="bold" />}
                    {points_behind_change === 0 && <MinusIcon size={12} weight="bold" />}
                    )
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Replace this with Awards or Chart if needed */}
          <div className="mt-6" />
        </div>

        {/* Floating content overlaps bottom of green card */}
        <div className="relative px-4 -translate-y-24 z-20">
          <div className="space-y-6">
            <LeagueStandings
              standings={standings}
              league={league}
              highlightEntry={managerTeamId}
            />
            {isSampled && (
              <div className="text-center text-sm italic text-subtext">
                Only top 30 managers sampled for award calculations.
              </div>
            )}
            <AwardsCard awards={awards} />
          </div>
        </div>
      </div>
    </BaseLayout>
  );
}