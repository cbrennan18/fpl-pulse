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
import { getLeagueConfig } from './leagueConfig';
import { calculateBiMonthlyPrizes, calculateMonthlyPrizes } from './awards/biMonthlyAwards';


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
  const [biMonthlyMeta, setBiMonthlyMeta] = useState(null);

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


        // 3. Derive currentGw from bootstrap events (replaces fragile heuristic)
        const finishedGwIds = bootstrap.events.filter(e => e.finished).map(e => e.id);
        const currentGw = finishedGwIds.length > 0 ? Math.max(...finishedGwIds) : 1;
        const seasonFinished = finishedGwIds.length >= 38;

        // 4. Build lookup maps from bootstrap
        const haalandEl = bootstrap.elements.find(el => el.second_name === 'Haaland' && el.element_type === 4);
        const haalandId = haalandEl?.id ?? null;
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
        const dataMap = { ...playerData, _meta: { deadlines, ownershipMap, playerNames, finishedGwIds } };
        const wildcards = calcs.calculateWildcards(dataMap);
        const freeHits = calcs.calculateFreeHits(dataMap);
        const leagueConfig = getLeagueConfig(leagueId);

        const allAwards = {
          leagueLeaders: calcs.calculateLeagueLeaders(dataMap),
          oneHitWonders: calcs.calculateOneHitWonders(dataMap),
          hotStreak: calcs.calculateHotStreak(dataMap),
          mostConsistent: calcs.calculateMostConsistent(dataMap),
          mostTransfers: calcs.calculateMostTransfers(dataMap),
          mostHits: calcs.calculateMostHits(dataMap),
          bestWildcard: wildcards.best,
          worstWildcard: wildcards.worst,
          neverGetFancy: calcs.calculateNeverGetFancy(dataMap, liveDataByGW, haalandId, playerNames),
          benchDisaster: calcs.calculateBenchDisaster(dataMap),
          earlyBird: calcs.calculateEarlyBird(dataMap),
          lateOwl: calcs.calculateLateOwl(dataMap),
          bestFreeHit: freeHits.best,
          worstFreeHit: freeHits.worst,
          mostMinutes: calcs.calculateMostMinutes(dataMap, playerNames),
          mostCards: calcs.calculateMostCards(dataMap, liveDataByGW),
          mostBps: calcs.calculateMostBps(dataMap, liveDataByGW, playerNames),
          bestPunt: calcs.calculateBestPunt(dataMap, liveDataByGW, ownershipMap, playerNames),
        };

        // League-specific periodic prizes
        if (leagueConfig?.biMonthly) {
          const biMonthly = calculateBiMonthlyPrizes(playerData, bootstrap.phases, finishedGwIds);
          Object.assign(allAwards, biMonthly.awards);
          setBiMonthlyMeta(biMonthly.meta);
        } else if (leagueConfig?.monthly) {
          const monthly = calculateMonthlyPrizes(playerData, bootstrap.phases, finishedGwIds);
          Object.assign(allAwards, monthly.awards);
          setBiMonthlyMeta(monthly.meta);
        }

        if (leagueConfig?.oldDoll?.qualifyingEntryIds?.length > 0) {
          const qualifying = results
            .filter(e => leagueConfig.oldDoll.qualifyingEntryIds.includes(e.entry))
            .sort((a, b) => a.rank - b.rank)
            .map(e => ({
              name: e.player_name,
              score: e.rank,
              value: `${e.total} pts`,
              context: { totalPoints: e.total, rank: e.rank },
            }));
          allAwards.oldDoll = qualifying;
        }

        setAwards(allAwards);

        // 7. User-specific league summary
        const userTotals = playerData[user?.entry]?.totalPointsByGW ?? {};
        const leaderTotals = playerData[sorted[0]?.entry]?.totalPointsByGW ?? {};

        const { points_behind } = calcs.calculatePointsBehindChange(userTotals, leaderTotals, currentGw);

        setLeague({
          name: standingsData.league.name,
          current_gw: currentGw,
          entry_rank,
          points_behind,
          seasonFinished,
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

  const leagueConfig = getLeagueConfig(leagueId);

  return (
    <LeagueView
      league={league}
      standings={standings}
      managerTeamId={teamId}
      awards={awards}
      isSampled={isSampled}
      loading={loading}
      error={error}
      leagueConfig={leagueConfig}
      biMonthlyMeta={biMonthlyMeta}
    />
  );
}
