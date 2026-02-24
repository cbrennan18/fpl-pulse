// LeagueViewContainer - Fetches league data via V1 bulk endpoints and computes awards

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LeagueView from './LeagueView';
import * as calcs from './awards';
import { transformBlobData } from './transformBlobData';
import {
  fetchLeagueStandings,
  fetchLeagueEntriesPack,
  fetchBootstrap,
  fetchSeasonElements,
} from '../../utils/api';
import { MAX_SAMPLED_MANAGERS } from '../../utils/constants';


export default function LeagueViewContainer() {
  const [searchParams] = useSearchParams();
  const leagueId = searchParams.get('id');
  const teamId = parseInt(searchParams.get('teamId'), 10);

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
        // 1. Fetch all four data sources in parallel (4 calls total)
        const [standingsData, entriesPack, bootstrap, seasonElements] = await Promise.all([
          fetchLeagueStandings(leagueId, { signal }),
          fetchLeagueEntriesPack(leagueId, { signal }),
          fetchBootstrap({ signal }),
          fetchSeasonElements({ signal }),
        ]);

        if (!standingsData?.standings?.results) {
          console.warn('Invalid league standings data:', standingsData);
          return;
        }
        if (!entriesPack) {
          console.warn('Failed to load entries pack');
          return;
        }
        if (!bootstrap?.elements || !bootstrap?.events) {
          console.warn('Invalid bootstrap data:', bootstrap);
          return;
        }
        if (!seasonElements) {
          console.warn('Failed to load season elements');
          return;
        }

        // 2. Extract standings info
        const results = standingsData.standings.results;
        const sorted = [...results].sort((a, b) => a.rank - b.rank);
        setIsSampled(results.length > MAX_SAMPLED_MANAGERS);
        setStandings(results);

        const user = results.find(e => e.entry === teamId);
        const entry_rank = user?.rank ?? null;
        const entry_rank_prev = user?.last_rank ?? null;

        // 3. Derive currentGw from bootstrap events (replaces fragile heuristic)
        const finishedGwIds = bootstrap.events.filter(e => e.finished).map(e => e.id);
        const currentGw = finishedGwIds.length > 0 ? Math.max(...finishedGwIds) : 1;

        // 4. Build lookup maps from bootstrap
        const salahEl = bootstrap.elements.find(el => el.second_name === 'Salah' && el.element_type === 4);
        const salahId = salahEl?.id ?? null;
        const ownershipMap = Object.fromEntries(
          bootstrap.elements.map(el => [el.id, parseFloat(el.selected_by_percent)])
        );
        const playerNames = Object.fromEntries(
          bootstrap.elements.map(el => [el.id, `${el.first_name} ${el.second_name}`])
        );
        const deadlines = bootstrap.events.map(e => ({ event: e.id, deadline_time: e.deadline_time }));

        // 5. Transform V1 blobs into award-compatible shapes (no API calls!)
        const { playerData, liveDataByGW } = transformBlobData({
          entriesPack,
          standings: results,
          seasonElements,
          finishedGwIds,
          maxSampled: MAX_SAMPLED_MANAGERS,
        });

        // 6. Calculate awards
        const dataMap = { ...playerData, _meta: { deadlines, ownershipMap, playerNames } };
        const wildcards = calcs.calculateWildcards(dataMap);
        const freeHits = calcs.calculateFreeHits(dataMap);
        setAwards({
          leagueLeaders: calcs.calculateLeagueLeaders(dataMap),
          oneHitWonders: calcs.calculateOneHitWonders(dataMap),
          hotStreak: calcs.calculateHotStreak(dataMap),
          mostConsistent: calcs.calculateMostConsistent(dataMap),
          mostTransfers: calcs.calculateMostTransfers(dataMap),
          mostHits: calcs.calculateMostHits(dataMap),
          bestWildcard: wildcards.best,
          worstWildcard: wildcards.worst,
          neverGetFancy: calcs.calculateNeverGetFancy(dataMap, liveDataByGW, salahId, playerNames),
          benchDisaster: calcs.calculateBenchDisaster(dataMap),
          earlyBird: calcs.calculateEarlyBird(dataMap),
          lateOwl: calcs.calculateLateOwl(dataMap),
          bestFreeHit: freeHits.best,
          worstFreeHit: freeHits.worst,
          mostMinutes: calcs.calculateMostMinutes(dataMap, playerNames),
          mostCards: calcs.calculateMostCards(dataMap, liveDataByGW),
          mostBps: calcs.calculateMostBps(dataMap, liveDataByGW, playerNames),
          bestPunt: calcs.calculateBestPunt(dataMap, liveDataByGW, ownershipMap, playerNames),
        });

        // 7. User-specific league summary
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
          points_behind_change,
        } = calcs.calculatePointsBehindChange(userTotals, leaderTotals, currentGw);

        // entry_overall_rank from the blob's summary (no extra API call)
        const userBlob = entriesPack.entries[user?.entry];
        const entry_overall_rank = userBlob?.summary?.summary_overall_rank ?? '—';

        setLeague({
          name: standingsData.league.name,
          current_gw: currentGw,
          entry_rank,
          entry_rank_prev,
          entry_overall_rank,
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
