// src/containers/LeagueListContainer.jsx
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LeagueList from './LeagueList';
import { fetchEntrySummaryForSeason, checkLeaguesAvailability } from '../../utils/api';
import { SYSTEM_LEAGUE_THRESHOLD } from '../../utils/constants';
import useSeason from '../../hooks/useSeason';

export default function LeagueListContainer() {
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('id') || '';
  const { season, requested: seasonParam, isArchive, label, ready: seasonReady } = useSeason();

  const [manager, setManager] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [availableLeagueIds, setAvailableLeagueIds] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!teamId || !seasonReady) return;

    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      setLoading(true);
      setError(false);

      try {
        const data = await fetchEntrySummaryForSeason(teamId, { season, archive: isArchive, signal });
        if (!data) throw new Error('Failed to fetch entry summary');

        setManager({
          firstName: data.player_first_name,
          lastName: data.player_last_name,
          teamName: data.name,
        });

        const classicLeagues = (data.leagues?.classic || [])
          .filter((l) => l.id > SYSTEM_LEAGUE_THRESHOLD)
          .sort((a, b) => a.entry_rank - b.entry_rank);
        setLeagues(classicLeagues);

        // Check which leagues have worker data available (non-blocking). Must be
        // season-scoped: probing 2025's league IDs against 2026 availability marks
        // every one of them unavailable.
        const leagueIds = classicLeagues.map((l) => l.id);
        checkLeaguesAvailability(leagueIds, { season, signal })
          .then((available) => { if (!signal.aborted) setAvailableLeagueIds(available); })
          .catch(() => {});
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('FPL data fetch error:', err);
        setError(true);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [teamId, season, isArchive, seasonReady]);

  return (
    <LeagueList
      manager={manager}
      leagues={leagues}
      availableLeagueIds={availableLeagueIds}
      loading={loading || !seasonReady}
      error={error}
      teamId={teamId}
      seasonParam={seasonParam}
      isArchive={isArchive}
      seasonLabel={label}
    />
  );
}