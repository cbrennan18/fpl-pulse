// src/containers/LeagueListContainer.jsx
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LeagueList from './LeagueList';
import { fetchEntrySummary } from '../../utils/api';

export default function LeagueListContainer() {
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

        // IDs ≤ 321 are FPL's global/system leagues — filter to user-created mini-leagues only
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
  <LeagueList
    manager={manager}
    leagues={leagues}
    loading={loading}
    error={error}
  />
);
}