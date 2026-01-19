// src/containers/MiniLeagueListContainer.jsx
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import MiniLeagueList from '../pages/MiniLeagueList';
import { fetchEntrySummary } from '../utils/fetchFplData';

export default function MiniLeagueContainer() {
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('id') || '';

  const [manager, setManager] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(false);

      try {
        const data = await fetchEntrySummary(teamId);
        if (!data) throw new Error('Failed to fetch entry summary');

        setManager({
          firstName: data.player_first_name,
          lastName: data.player_last_name,
          teamName: data.name,
        });

        const classicLeagues = (data.leagues?.classic || []).filter((l) => l.id > 321);
        setLeagues(classicLeagues);
      } catch (err) {
        console.error('FPL data fetch error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teamId]);

  return (
  <MiniLeagueList
    manager={manager}
    leagues={leagues}
    loading={loading}
    error={error}
  />
);
}