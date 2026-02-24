// Transforms V1 entries-pack blobs + season elements into the playerData/liveDataByGW
// shapes that the existing award calculation functions expect.
// This replaces ~1,200 individual API calls with client-side transformation of 4 bulk responses.

/**
 * Build liveDataByGW from season elements (same transform PulseContainer uses).
 * Output: { [gw]: { [elementId]: { total_points, minutes, yellow_cards, red_cards, bonus } } }
 */
export function buildLiveDataByGW(seasonElements, finishedGwIds) {
  const liveDataByGW = {};
  for (const gw of finishedGwIds) {
    if (seasonElements.gws[gw]?.elements) {
      liveDataByGW[gw] = Object.fromEntries(
        seasonElements.gws[gw].elements.map(e => [e.id, {
          total_points: e.stats.total_points || 0,
          minutes: e.stats.minutes || 0,
          yellow_cards: e.stats.yellow_cards || 0,
          red_cards: e.stats.red_cards || 0,
          bonus: e.stats.bonus || 0,
        }])
      );
    }
  }
  return liveDataByGW;
}

/**
 * Transform a single entry blob into the playerData shape that award functions expect.
 *
 * Expected output per entry:
 *   name, history[], totalPointsByGW, chipWeeks, captainHistory, viceCaptainHistory,
 *   picks, picksByGW, benchPoints, transfers[], minutesByGW
 */
function transformEntry(blob, playerName, finishedGwIds, liveDataByGW) {
  // history: array matching FPL API current[] shape
  const gwNumbers = Object.keys(blob.gw_summaries).map(Number).sort((a, b) => a - b);
  const history = gwNumbers.map(gw => {
    const s = blob.gw_summaries[gw];
    return {
      event: gw,
      points: s.points,
      total_points: s.total,
      rank: s.gw_rank,
      overall_rank: s.overall_rank,
      value: s.value,
      bank: s.bank,
      event_transfers: s.event_transfers ?? 0,
      event_transfers_cost: s.event_transfers_cost ?? 0,
    };
  });

  const totalPointsByGW = {};
  for (const gw of gwNumbers) {
    totalPointsByGW[gw] = blob.gw_summaries[gw].total;
  }

  // chipWeeks: group active_chip values by type
  const chipWeeks = { wildcard: [], freehit: [], bench_boost: [], triple_captain: [] };
  const picksByGW = {};
  const benchPoints = {};
  const captainHistory = {};
  const viceCaptainHistory = {};

  for (const gw of finishedGwIds) {
    const gwPicks = blob.picks_by_gw[gw];
    if (!gwPicks) continue;

    // Chip tracking
    if (gwPicks.active_chip && chipWeeks[gwPicks.active_chip]) {
      chipWeeks[gwPicks.active_chip].push(gw);
    }

    // Bench points
    benchPoints[gw] = gwPicks.points_on_bench ?? 0;

    // Picks array (what award calcs iterate over)
    picksByGW[gw] = gwPicks.picks;

    // Captain/vice
    const captain = gwPicks.picks.find(p => p.is_captain);
    if (captain) captainHistory[gw] = captain.element;
    const vice = gwPicks.picks.find(p => p.is_vice);
    viceCaptainHistory[gw] = vice?.element ?? null;
  }

  // minutesByGW: derived from liveDataByGW
  const minutesByGW = {};
  for (const gw of finishedGwIds) {
    if (liveDataByGW[gw]) {
      minutesByGW[gw] = Object.fromEntries(
        Object.entries(liveDataByGW[gw]).map(([id, stats]) => [id, stats.minutes || 0])
      );
    }
  }

  return {
    name: playerName,
    history,
    totalPointsByGW,
    chipWeeks,
    captainHistory,
    viceCaptainHistory,
    picks: picksByGW,
    picksByGW,
    benchPoints,
    transfers: blob.transfers,
    minutesByGW,
  };
}

/**
 * Main transformer: converts V1 bulk responses into the shapes LeagueViewContainer needs.
 *
 * @param {Object} params
 * @param {Object} params.entriesPack - Response from /v1/league/:id/entries-pack
 * @param {Array}  params.standings   - League standings results array
 * @param {Object} params.seasonElements - Response from /v1/season/elements
 * @param {Array}  params.finishedGwIds  - Array of finished GW numbers
 * @param {number} params.maxSampled     - Max entries to process for awards
 * @returns {{ playerData: Object, liveDataByGW: Object }}
 */
export function transformBlobData({ entriesPack, standings, seasonElements, finishedGwIds, maxSampled }) {
  const liveDataByGW = buildLiveDataByGW(seasonElements, finishedGwIds);

  const sampledStandings = standings.slice(0, Math.min(maxSampled, standings.length));
  const playerData = {};

  for (const standing of sampledStandings) {
    const blob = entriesPack.entries[standing.entry];
    if (!blob) continue;

    playerData[standing.entry] = transformEntry(
      blob,
      standing.player_name,
      finishedGwIds,
      liveDataByGW,
    );
  }

  return { playerData, liveDataByGW };
}
