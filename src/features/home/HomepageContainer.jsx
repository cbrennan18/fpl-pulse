// src/containers/HomepageContainer.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Homepage from './Homepage';
import { fetchEntrySeasonBlob } from '../../utils/api';

export default function HomepageContainer() {
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('id') || '';

  const [manager, setManager] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
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
        const blob = await fetchEntrySeasonBlob(teamId, { signal });

        if (!blob) throw new Error('Failed to load entry data');

        // Extract summary from blob
        setManager({
          firstName: blob.summary.player_first_name,
          lastName: blob.summary.player_last_name,
          teamName: blob.summary.name,
        });

        // Extract latest GW summary
        const gwNumbers = Object.keys(blob.gw_summaries).map(Number).sort((a,b) => a - b);
        const latestGwNum = gwNumbers[gwNumbers.length - 1] || 0;
        const latestGw = blob.gw_summaries[latestGwNum] || {};

        setSummary({
          totalPoints: latestGw.total || 0,
          overallRank: latestGw.overall_rank || 0,
          lastGwPoints: latestGw.points || 0,
          lastGwRank: latestGw.gw_rank || 0,
          latestGwNumber: latestGwNum,
        });

        // Convert gw_summaries object to array for chart
        const history = gwNumbers.map(gw => ({
          event: gw,
          points: blob.gw_summaries[gw].points,
          total_points: blob.gw_summaries[gw].total,
          rank: blob.gw_summaries[gw].gw_rank,
          overall_rank: blob.gw_summaries[gw].overall_rank,
          value: blob.gw_summaries[gw].value / 10,  // IMPORTANT: Divide by 10!
          bank: blob.gw_summaries[gw].bank / 10,     // IMPORTANT: Divide by 10!
        }));
        setHistory(history);
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
    <Homepage
      teamId={teamId}
      manager={manager}
      summary={summary}
      history={history}
      loading={loading}
      error={error}
    />
  );
}