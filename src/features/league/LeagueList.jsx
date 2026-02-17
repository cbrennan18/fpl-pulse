import { useNavigate, useSearchParams } from 'react-router-dom';
import BaseLayout from '../../components/BaseLayout';
import TopBar from '../../components/TopBar';
import SkeletonMiniLeagueList from '../../components/skeletons/SkeletonMiniLeagueList';
import useParallax from '../../hooks/useParallax';
import { ArrowRightIcon } from '@phosphor-icons/react';

export default function MiniLeagueList({ manager, leagues, loading, error }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('id'); // FPL entry ID
  useParallax('parallax-bg');

  if (loading) {
    return (
      <BaseLayout>
        <SkeletonMiniLeagueList />
      </BaseLayout>
    );
  }

  if (error || !manager) {
    return (
      <BaseLayout>
        <div className="text-center mt-10 text-sm text-danger">League data not available.</div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <TopBar
        title={manager.teamName}
        showBackButton={true}
        onBack={() => navigate(`/home?id=${teamId}`)}
      />
      <div className="pt-safe-bar" />

      <div className="relative z-0">
        <div
          id="parallax-bg"
          className="absolute top-0 left-0 w-full h-[100vw] bg-primary-dark rounded-b-3xl z-0 transition-transform duration-100 ease-out"
        />
        <div className="relative z-10 px-6 pt-safe-bar space-y-4 pb-96">
          {leagues.map((league) => (
            <button
              key={league.id}
              onClick={() =>
                navigate(`/mini-league?id=${league.id}&teamId=${teamId}`)
              }
              className="w-full text-left bg-white shadow-md rounded-xl px-4 py-2 flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-sm text-heading truncate max-w-[250px]">
                  {league.name}
                </p>
                <p className="text-xs text-subtext">Rank: {league.entry_rank}</p>
              </div>
              <ArrowRightIcon size={24} weight="bold" className="text-subtext" />
            </button>
          ))}
        </div>
      </div>
    </BaseLayout>
  );
}