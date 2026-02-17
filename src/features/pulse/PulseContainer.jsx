// /src/pulse/containers/PulseContainer.jsx
// main container, loads data + controls flow

// PulseContainer.jsx

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generatePulse } from './utils/pulseCalculations';
import {
  fetchEntrySeasonBlob,
  fetchBootstrap,
  fetchSeasonElements,
  fetchPlayerHistory,
} from '../../utils/api';
import PulsePageRenderer from './PulsePageRenderer';
import PulseSplash from './PulseSplash';


export default function PulseContainer() {
  const [searchParams] = useSearchParams();
  const teamId = parseInt(searchParams.get('id'), 10);

  const [pulseData, setPulseData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleRestart = () => setCurrentPageIndex(0);
    window.addEventListener('pulse-restart', handleRestart);
    return () => window.removeEventListener('pulse-restart', handleRestart);
  }, []);

  useEffect(() => {
    if (!teamId) return;

    const controller = new AbortController();
    const { signal } = controller;

    const fetchPulse = async () => {
      try {
        // 1. Fetch complete entry blob (replaces 40+ calls!)
        const blob = await fetchEntrySeasonBlob(teamId, { signal });
        if (!blob) throw new Error('Failed to load entry data');

        // Extract manager info
        const managerName = `${blob.summary.player_first_name} ${blob.summary.player_last_name}`;
        const teamName = blob.summary.name;

        // 2. Fetch bootstrap (unchanged)
        const bootstrapData = await fetchBootstrap({ signal });
        if (!bootstrapData?.elements || !bootstrapData?.events) {
          console.warn('Invalid bootstrap data:', bootstrapData);
          throw new Error('Invalid bootstrap data');
        }

        // 3. Fetch season elements (replaces 38 fetchLiveData calls!)
        const elementsData = await fetchSeasonElements({ signal });
        if (!elementsData) throw new Error('Failed to load season elements');

        // 4. Get player names
        const playerNames = Object.fromEntries(
          bootstrapData.elements.map(el => [el.id, `${el.first_name} ${el.second_name}`])
        );

        // 5. Get finished GWs
        const finishedGwIds = bootstrapData.events.filter(e => e.finished).map(e => e.id);

        // 6. Build picksByGW from blob (no API calls!)
        const picksByGW = {};
        finishedGwIds.forEach(gw => {
          if (blob.picks_by_gw[gw]) {
            picksByGW[gw] = blob.picks_by_gw[gw].picks;
          }
        });

        // 7. Build liveDataByGW from elementsData (no API calls!)
        const liveDataByGW = {};
        finishedGwIds.forEach(gw => {
          if (elementsData.gws[gw]?.elements) {
            liveDataByGW[gw] = Object.fromEntries(
              elementsData.gws[gw].elements.map(e => [e.id, {
                total_points: e.stats.total_points || 0,
                minutes: e.stats.minutes || 0,
                yellow_cards: e.stats.yellow_cards || 0,
                red_cards: e.stats.red_cards || 0,
                bonus: e.stats.bonus || 0
              }])
            );
          }
        });

        // 8. Use blob.transfers directly (no API call!)
        const entryTransfersData = blob.transfers;

        // 9. Build set of all player IDs
        const allPlayerIds = bootstrapData.elements.map(el => el.id);

        // 10. Init playerPriceHistory (this still needs individual calls)
        const playerPriceHistory = {};

        await Promise.all(
          allPlayerIds.map(async playerId => {
            try {
              const historyData = await fetchPlayerHistory(playerId, { signal });
              if (historyData?.history) {
                historyData.history.forEach(gw => {
                  if (!playerPriceHistory[playerId]) playerPriceHistory[playerId] = {};
                  playerPriceHistory[playerId][gw.round] = gw.value / 10; // price in millions
                });
              }
            } catch (err) {
              console.warn(`Failed to fetch price history for player ${playerId}:`, err);
            }
          })
        );

        // 11. Convert gw_summaries to entryHistory format for generatePulse
        const entryHistoryData = {
          current: Object.keys(blob.gw_summaries).map(gw => ({
            event: Number(gw),
            points: blob.gw_summaries[gw].points,
            total_points: blob.gw_summaries[gw].total,
            rank: blob.gw_summaries[gw].gw_rank,
            overall_rank: blob.gw_summaries[gw].overall_rank,
            value: blob.gw_summaries[gw].value,
            bank: blob.gw_summaries[gw].bank,
          }))
        };

        // 12. Generate pulse with all data
        const pulse = generatePulse({
          entryHistory: entryHistoryData,
          managerInfo: {
            managerName,
            teamName,
            totalPoints: blob.summary.summary_overall_points ?? 0,
            finalRank: blob.summary.summary_overall_rank ?? 0,
          },
          bootstrap: bootstrapData,
          playerNames,
          picksByGW,
          liveDataByGW,
          entryTransfers: entryTransfersData,
          playerPriceHistory: playerPriceHistory,
        });

        console.log('Pulse Data:', pulse);
        setPulseData(pulse);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load Pulse:', err);
        setError(true);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchPulse();
    return () => controller.abort();
  }, [teamId]);

  if (loading) {
    return <PulseSplash />;
  }

  if (error || !pulseData) {
    return <div>Failed to load your FPL Pulse. Please try again later.</div>;
  }

  const handleAdvance = () => {
    setCurrentPageIndex((prev) =>
      prev + 1 < pulseData.length ? prev + 1 : prev
    );
  };

  const handleBack = () => {
    setCurrentPageIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const togglePause = () => setIsPaused(prev => !prev);


  return (
    <div className="flex flex-col items-center bg-black text-white">
      <PulsePageRenderer
        pageData={pulseData[currentPageIndex]}
        onAdvance={handleAdvance}
        onBack={handleBack}
        isPaused={isPaused}
        togglePause={togglePause}
        currentPageIndex={currentPageIndex}
        totalPages={pulseData.length}
      />
    </div>
  );
}