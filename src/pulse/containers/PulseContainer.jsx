// /src/pulse/containers/PulseContainer.jsx
// main container, loads data + controls flow

// PulseContainer.jsx

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generatePulse } from '../utils/pulseCalculations';
import { retryFetch } from '../../utils/retryFetch';
import {
  fetchEntrySummary,
  fetchEntryHistory,
  fetchEntryPicks,
  fetchEntryTransfers,
  fetchBootstrap,
  fetchLiveData,
  fetchPlayerHistory,
} from '../../utils/fetchFplData';
import PulsePageRenderer from '../components/PulsePageRenderer';
import PulseSplash from '../components/PulseSplash';


export default function PulseContainer() {
  const [searchParams] = useSearchParams();
  const teamId = parseInt(searchParams.get('id'), 10);

  const [entryHistory, setEntryHistory] = useState(null);
  const [managerInfo, setManagerInfo] = useState(null);
  const [bootstrap, setBootstrap] = useState(null);
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

    const fetchPulse = async () => {
      try {
        // 1. Fetch entry history
        const entryHistoryData = await retryFetch(fetchEntryHistory, [teamId]);
        if (!entryHistoryData?.current) {
          console.warn('Invalid entryHistory data:', entryHistoryData);
          throw new Error('Invalid entryHistory data');
        }
        setEntryHistory(entryHistoryData);

        // 2. Fetch manager info
        const managerInfoData = await retryFetch(fetchEntrySummary, [teamId]);
        if (!managerInfoData) throw new Error('Failed to load entry info');

        const managerName = managerInfoData?.player_first_name + ' ' + managerInfoData?.player_last_name;
        const teamName = managerInfoData?.name;
        setManagerInfo({
        managerName,
        teamName,
        });

        // 3. Fetch bootstrap
        const bootstrapData = await retryFetch(fetchBootstrap);
        if (!bootstrapData?.elements || !bootstrapData?.events) {
          console.warn('Invalid bootstrap data:', bootstrapData);
          throw new Error('Invalid bootstrap data');
        }
        setBootstrap(bootstrapData);

        // 4. Get player names
        const playerNames = Object.fromEntries(
          bootstrapData.elements.map(el => [el.id, `${el.first_name} ${el.second_name}`])
        );

        // 5. Get finished GWs
        const finishedGwIds = bootstrapData.events.filter(e => e.finished).map(e => e.id);

        const picksByGW = {};
        const liveDataByGW = {};

        // 6. Get Transfer History
        const entryTransfersData = await retryFetch(fetchEntryTransfers, [teamId]);

        // 7. Get Player History
        await Promise.all(
          finishedGwIds.map(async (gw) => {
            try {
              const picksData = await retryFetch(fetchEntryPicks, [teamId, gw]);
              if (Array.isArray(picksData.picks)) {
                picksByGW[gw] = picksData.picks;
              }

              const liveData = await retryFetch(fetchLiveData, [gw]);
              if (Array.isArray(liveData.elements)) {
                liveDataByGW[gw] = Object.fromEntries(
                  liveData.elements.map(e => [e.id, {
                    total_points: e.stats.total_points || 0,
                    minutes: e.stats.minutes || 0,
                    yellow_cards: e.stats.yellow_cards || 0,
                    red_cards: e.stats.red_cards || 0,
                    bonus: e.stats.bonus || 0
                  }])
                );
              }
            } catch (err) {
              console.warn(`Failed to fetch picks or live data for GW${gw}`, err);
            }
          })
        );

        // Build set of all player IDs
        const allPlayerIds = bootstrapData.elements.map(el => el.id);

        // Init playerPriceHistory
        const playerPriceHistory = {};

        await Promise.all(
          allPlayerIds.map(async playerId => {
            try {
              const historyData = await retryFetch(fetchPlayerHistory, [playerId]);
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

        // === At this point we can already generate page 1 ===
        const pulse = generatePulse({
          entryHistory: entryHistoryData,
          managerInfo: {
            managerName,
            teamName,
            totalPoints: managerInfoData?.summary_overall_points ?? 0,
            finalRank: managerInfoData?.summary_overall_rank ?? 0,
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
        console.error('Failed to load Pulse:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPulse();
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