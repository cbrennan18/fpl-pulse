// src/containers/HomepageContainer.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Homepage from '../pages/Homepage';
import { fetchEntrySummary, fetchEntryHistory } from '../utils/fetchFplData';

export default function HomepageContainer() {
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('id') || '';

  const [manager, setManager] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(false);

      try {
        const teamData = await fetchEntrySummary(teamId);
        const historyData = await fetchEntryHistory(teamId);

        if (!teamData || !historyData) throw new Error('Missing required data');

        setManager({
          firstName: teamData.player_first_name,
          lastName: teamData.player_last_name,
          teamName: teamData.name,
        });

        const classicLeagues = (teamData.leagues?.classic || []).filter(l => l.id > 321);
        setLeagues(classicLeagues);

        const current = Array.isArray(historyData.current) ? historyData.current : [];
        const latestGw = current[current.length - 1] || {};

        setSummary({
          totalPoints: latestGw.total_points || 0,
          overallRank: latestGw.overall_rank || 0,
          lastGwPoints: latestGw.points || 0,
          lastGwRank: latestGw.rank || 0,
          latestGwNumber: latestGw.event || current.length || 0,
        });

        setHistory(current);
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
    <Homepage
      teamId={teamId}
      manager={manager}
      leagues={leagues}
      summary={summary}
      history={history}
      loading={loading}
      error={error}
    />
  );
}