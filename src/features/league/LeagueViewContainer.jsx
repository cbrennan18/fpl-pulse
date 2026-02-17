// LeagueViewContainer - Fetches FPL data for a given league and computes award stats for top performers

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LeagueView from './LeagueView';
import * as calcs from './awards';
import {
  fetchLeagueStandings,
  fetchTopEntrySummaries,
  fetchBootstrap,
  fetchEntryHistory,
  fetchEntryPicks,
  fetchEntryTransfers,
  fetchLiveData
} from '../../utils/api';
import { MAX_SAMPLED_MANAGERS, TOP_N_ENTRIES } from '../../utils/constants';


export default function LeagueViewContainer() {
  // Parse leagueId and teamId from the URL
  const [searchParams] = useSearchParams();
  const leagueId = searchParams.get('id');
  const teamId = parseInt(searchParams.get('teamId'), 10);

  // State management
  const [league, setLeague] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [awards, setAwards] = useState([]);
  const [isSampled, setIsSampled] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!leagueId || !teamId) return;

    const controller = new AbortController();
    const { signal } = controller;

    const fetchLeague = async () => {
      try {
        // 1. Fetch standings
        const data = await fetchLeagueStandings(leagueId, { signal });
        if (!data?.standings?.results) {
          console.warn('Invalid league standings data:', data);
          return;
        }
        const results = data.standings.results;
        const sorted = [...results].sort((a, b) => a.rank - b.rank);
        setIsSampled(results.length > MAX_SAMPLED_MANAGERS);
        const user = results.find(e => e.entry === teamId);
        setStandings(results);

        const currentGw = data.new_entries?.has_next === false ? 38 : 37;
        const entry_rank = user?.rank ?? null;
        const entry_rank_prev = user?.last_rank ?? null;

        // 2. Fetch profiles for top N entries
        const topEntries = sorted.slice(0, Math.min(TOP_N_ENTRIES, sorted.length));
        const profileResponses = await fetchTopEntrySummaries(topEntries, { signal });
        // 3. Fetch bootstrap (metadata: players, deadlines)
        const bootstrap = await fetchBootstrap({ signal });
        if (!bootstrap?.elements || !bootstrap?.events) {
          console.warn('Invalid bootstrap data:', bootstrap);
          return;
        }
        const salahId = 328;
        const ownershipMap = Object.fromEntries(bootstrap.elements.map(el => [el.id, parseFloat(el.selected_by_percent)]));
        const playerNames = Object.fromEntries(bootstrap.elements.map(el => [el.id, `${el.first_name} ${el.second_name}`]));
        const deadlines = bootstrap.events.map(e => ({ event: e.id, deadline_time: e.deadline_time }));
        const finishedGwIds = bootstrap.events.filter(e => e.finished).map(e => e.id);

        // 4. Loop through top 30 players only for awards
        const sampledResults = results.slice(0, Math.min(MAX_SAMPLED_MANAGERS, results.length));
        const playerData = {};
        await Promise.all(
          sampledResults.map(async ({ entry, player_name }) => {
            try {
              // Fetch entry history
              const entryData = await fetchEntryHistory(entry, { signal });
              const current = entryData?.current || [];
              const totalPointsByGW = {};
              current.forEach(gw => { totalPointsByGW[gw.event] = gw.total_points });

              const chipWeeks = { wildcard: [], freehit: [], bench_boost: [], triple_captain: [] };
              const captainHistory = {}, benchPoints = {}, transfers = [], picksByGW = {}, minutesByGW = {};

              await Promise.all([
                // 4a. Picks and chip/captain/bench data for finished GWs only
                ...finishedGwIds.map(async (gw) => {
                  try {
                    const picksData = await fetchEntryPicks(entry, gw, { signal });
                    if (!Array.isArray(picksData.picks)) throw new Error(`Invalid picks structure for entry ${entry} GW ${gw}`);

                    if (picksData.active_chip && chipWeeks[picksData.active_chip]) chipWeeks[picksData.active_chip].push(gw);
                    benchPoints[gw] = picksData.entry_history?.points_on_bench || 0;
                    picksByGW[gw] = picksData.picks;
                    const captain = picksData.picks.find(p => p.is_captain);
                    if (captain) captainHistory[gw] = captain.element;
                  } catch (err) {
                    console.warn(`Failed to fetch picks for ${entry} GW${gw}`, err);
                  }
                }),
                // 4b. Transfers
                (async () => {
                  try {
                    const transferData = await fetchEntryTransfers(entry, { signal });
                    transfers.push(...transferData);
                  } catch (err) {
                    console.warn(`Failed to fetch transfers for ${entry}`, err);
                  }
                })()
              ]);

              playerData[entry] = {
                name: player_name,
                history: current,
                totalPointsByGW,
                chipWeeks,
                captainHistory,
                viceCaptainHistory: Object.fromEntries(
                  Object.entries(picksByGW).map(([gw, picks]) => {
                    const vc = picks.find(p => p.is_vice_captain);
                    return [gw, vc?.element ?? null];
                  })
                ),
                picks: picksByGW,
                picksByGW,
                benchPoints,
                transfers,
                minutesByGW
              };
            } catch (err) {
              console.warn(`Failed playerData block for ${entry}`, err);
            }
          })
        );

        // 5. Get live stats for each GW
        const liveDataByGW = {};
        await Promise.all(
          finishedGwIds.map(async (gw) => {
            try {
              const data = await fetchLiveData(gw, { signal });
              for (const player of Object.values(playerData)) {
                player.minutesByGW[gw] = Object.fromEntries(data.elements.map(e => [e.id, e.stats.minutes || 0]));
              }
              liveDataByGW[gw] = Object.fromEntries(data.elements.map(e => [e.id, {
                total_points: e.stats.total_points || 0,
                minutes: e.stats.minutes || 0,
                yellow_cards: e.stats.yellow_cards || 0,
                red_cards: e.stats.red_cards || 0,
                bonus: e.stats.bonus || 0
              }]));
            } catch (err) {
              console.warn(`Failed to fetch live data GW ${gw}`, err);
              liveDataByGW[gw] = {};
            }
          })
        );

        // 6. Calculate awards using utility functions
        const dataMap = { ...playerData, _meta: { deadlines, ownershipMap, playerNames } };
        setAwards({
          leagueLeaders: calcs.calculateLeagueLeaders(dataMap),
          oneHitWonders: calcs.calculateOneHitWonders(dataMap),
          hotStreak: calcs.calculateHotStreak(dataMap),
          mostConsistent: calcs.calculateMostConsistent(dataMap),
          mostTransfers: calcs.calculateMostTransfers(dataMap),
          mostHits: calcs.calculateMostHits(dataMap),
          bestWildcard: calcs.calculateWildcards(dataMap).best,
          worstWildcard: calcs.calculateWildcards(dataMap).worst,
          neverGetFancy: calcs.calculateNeverGetFancy(dataMap, liveDataByGW, salahId, playerNames),
          benchDisaster: calcs.calculateBenchDisaster(dataMap),
          earlyBird: calcs.calculateEarlyBird(dataMap),
          lateOwl: calcs.calculateLateOwl(dataMap),
          bestFreeHit: calcs.calculateFreeHits(dataMap).best,
          worstFreeHit: calcs.calculateFreeHits(dataMap).worst,
          mostMinutes: calcs.calculateMostMinutes(dataMap, playerNames),
          mostCards: calcs.calculateMostCards(dataMap, liveDataByGW),
          mostBps: calcs.calculateMostBps(dataMap, liveDataByGW, playerNames),
          bestPunt: calcs.calculateBestPunt(dataMap, liveDataByGW, ownershipMap, playerNames)
        });

        // 7. Final user-specific league summary
        const avg_est_rank = calcs.calculateTop5AvgRank(playerData, results, -1);
        const avg_est_rank_prev = calcs.calculateTop5AvgRank(playerData, results, -2);
        const rank_change = calcs.calculateLeagueRankChange(entry_rank, entry_rank_prev);

        const userHist = playerData[user?.entry]?.history;
        const leaderHist = playerData[sorted[0]?.entry]?.history;
        if (!userHist || !leaderHist) {
          console.warn('Missing user or leader history:', { userHist, leaderHist });
          return;
        }

        const userTotals = playerData[user?.entry]?.totalPointsByGW ?? {};
        const leaderTotals = playerData[sorted[0]?.entry]?.totalPointsByGW ?? {};

        const {
          points_behind,
          points_behind_prev,
          points_behind_change
        } = calcs.calculatePointsBehindChange(userTotals, leaderTotals, currentGw);

        setLeague({
          name: data.league.name,
          current_gw: currentGw,
          entry_rank,
          entry_rank_prev,
          entry_overall_rank: profileResponses.find(p => p?.id === user?.entry)?.summary_overall_rank ?? '—',
          avg_est_rank,
          avg_est_rank_prev,
          points_behind,
          points_behind_prev,
          rank_change,
          points_behind_change,
        });
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load league:', err);
        setError(true);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchLeague();
    return () => controller.abort();
  }, [leagueId, teamId]);

  return (
    <LeagueView
      league={league}
      standings={standings}
      managerTeamId={teamId}
      awards={awards}
      isSampled={isSampled}
      loading={loading}
      error={error}
    />
);
}