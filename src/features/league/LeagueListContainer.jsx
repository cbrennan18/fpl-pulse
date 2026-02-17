// src/containers/LeagueListContainer.jsx
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LeagueList from './LeagueList';
import { fetchEntrySummary } from '../../utils/api';
import { SYSTEM_LEAGUE_THRESHOLD } from '../../utils/constants';

export default function LeagueListContainer() {
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('id') || '';

  const [manager, setManager] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      setLoading(true);
      setError(false);

      try {
        const data = await fetchEntrySummary(teamId, { signal });
        if (!data) throw new Error('Failed to fetch entry summary');

        setManager({
          firstName: data.player_first_name,
          lastName: data.player_last_name,
          teamName: data.name,
        });

        const classicLeagues = (data.leagues?.classic || []).filter((l) => l.id > SYSTEM_LEAGUE_THRESHOLD);
        setLeagues(classicLeagues);
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
  }, [teamId]);

  return (
  <LeagueList
    manager={manager}
    leagues={leagues}
    loading={loading}
    error={error}
  />
);
}