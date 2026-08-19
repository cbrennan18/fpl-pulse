// LeagueViewContainer - Fetches league data via V1 bulk endpoints and computes awards

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LeagueView from './LeagueView';
import * as calcs from './awards';
import { transformBlobData } from './transformBlobData';
import {
  fetchStandingsForSeason,
  fetchLeagueEntriesPack,
  fetchBootstrap,
  fetchSeasonElements,
} from '../../utils/api';
import useSeason from '../../hooks/useSeason';
import { MAX_SAMPLED_MANAGERS } from '../../utils/constants';
import { getLeagueConfig } from './leagueConfig';
import { calculateBiMonthlyPrizes, calculateMonthlyPrizes } from './awards/biMonthlyAwards';


export default function LeagueViewContainer() {
  const [searchParams] = useSearchParams();
  const leagueId = searchParams.get('id');
  const teamId = parseInt(searchParams.get('teamId'), 10);
  const { season, isArchive, label: seasonLabel, ready: seasonReady } = useSeason();

  const [league, setLeague] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [awards, setAwards] = useState([]);
  const [isSampled, setIsSampled] = useState(false);
  const [error, setError] = useState(false);
  // Distinct from `error`: the request succeeded and the answer is "this league has no
  // table for this season". A normal outcome — archive coverage is partial by design.
  const [unavailable, setUnavailable] = useState(null); // null | 'absent' | 'provisional'
  const [biMonthlyMeta, setBiMonthlyMeta] = useState(null);

  useEffect(() => {
    // Hold until the season resolves — see HomepageContainer for why.
    if (!leagueId || !teamId || !seasonReady) return;

    const controller = new AbortController();
    const { signal } = controller;

    const fetchLeague = async () => {
      setUnavailable(null); // clear a previous league/season's verdict before re-reading
      try {
        // 1. Fetch all four data sources in parallel (4 calls total). Standings comes
        // from the archive when the season isn't the live one — FPL reassigns league IDs
        // yearly, so the live proxy answers about a DIFFERENT league under the same id
        // (id 9385 is "Dundanion Road" in 2025 and "FPL GOAT LEAGUE" live).
        const [standingsResult, entriesPack, bootstrap, seasonElements] = await Promise.all([
          fetchStandingsForSeason(leagueId, { season, archive: isArchive, signal }),
          fetchLeagueEntriesPack(leagueId, { season, signal }),
          fetchBootstrap({ season, signal }),
          fetchSeasonElements({ season, signal }),
        ]);

        if (!standingsResult) {
          console.warn('Failed to load league standings');
          return;
        }
        // Not an error: no table was archived for this league/season, or one was captured
        // but never stamped final. Either way there are no rows to rank, and every award
        // is derived from those rows, so there is nothing to render.
        if (standingsResult.status !== 'final') {
          setUnavailable(standingsResult.status === 'provisional' ? 'provisional' : 'absent');
          return;
        }
        const standingsData = standingsResult.data;
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
  }, [leagueId, teamId, season, isArchive, seasonReady]);

  const leagueConfig = getLeagueConfig(leagueId);

  return (
    <LeagueView
      league={league}
      standings={standings}
      managerTeamId={teamId}
      awards={awards}
      isSampled={isSampled}
      unavailable={unavailable}
      seasonLabel={seasonLabel}
      loading={loading || !seasonReady}
      error={error}
      leagueConfig={leagueConfig}
      biMonthlyMeta={biMonthlyMeta}
    />
  );
}
