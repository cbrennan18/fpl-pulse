// src/utils/fetchFplData.js

const BASE = 'https://fpl-pulse.ciaranbrennan18.workers.dev';

// General-purpose fetch wrapper with error handling
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed for ${url}`);
  return res.json();
}

// --- Fetch summary information for a team by entry ID ---
export async function fetchEntrySummary(id) {
  try {
    return await fetchJson(`${BASE}/fpl/entry/${id}/summary`);
  } catch (err) {
    console.warn(`Failed to fetch entry summary for ${id}:`, err);
    return null;
  }
}

// --- Fetch gameweek-by-gameweek history for a team ---
export async function fetchEntryHistory(id) {
  try {
    return await fetchJson(`${BASE}/fpl/entry/${id}`);
  } catch (err) {
    console.warn(`Failed to fetch entry history for ${id}:`, err);
    return null;
  }
}

// --- Fetch picks for a specific entry and gameweek ---
export async function fetchEntryPicks(entryId, gw) {
  try {
    const data = await fetchJson(`${BASE}/fpl/entry/${entryId}/event/${gw}/picks`);
    if (!Array.isArray(data.picks)) throw new Error('Invalid picks format');
    return data;
  } catch (err) {
    console.warn(`Failed to fetch picks for entry ${entryId} GW${gw}:`, err);
    return null;
  }
}

// --- Fetch all transfers for a team ---
export async function fetchEntryTransfers(entryId) {
  try {
    const data = await fetchJson(`${BASE}/fpl/entry/${entryId}/transfers`);
    if (!Array.isArray(data)) throw new Error('Transfers response is not an array');
    return data;
  } catch (err) {
    console.warn(`Failed to fetch transfers for entry ${entryId}:`, err);
    return [];
  }
}

// --- Fetch live data (points, minutes, etc) for a given gameweek ---
export async function fetchLiveData(gw) {
  try {
    const data = await fetchJson(`${BASE}/fpl/live/${gw}`);
    if (!Array.isArray(data.elements)) throw new Error('Live data missing elements');
    return data;
  } catch (err) {
    console.warn(`Failed to fetch live data for GW${gw}:`, err);
    return { elements: [] };
  }
}

// --- Fetch bootstrap static data: players, teams, events, etc ---
export async function fetchBootstrap() {
  try {
    const data = await fetchJson(`${BASE}/fpl/bootstrap`);
    if (!Array.isArray(data.elements)) throw new Error('Invalid bootstrap format');
    return data;
  } catch (err) {
    console.warn('Failed to fetch bootstrap:', err);
    return null;
  }
}

// --- Fetch league standings and metadata ---
export async function fetchLeagueStandings(leagueId) {
  try {
    const data = await fetchJson(`${BASE}/fpl/league/${leagueId}`);
    if (!data?.standings?.results) throw new Error('Invalid league data');
    return data;
  } catch (err) {
    console.warn(`Failed to fetch league standings for ${leagueId}:`, err);
    return null;
  }
}

// --- Fetch top entry summaries (wrapper around fetchEntrySummary) ---
export async function fetchTopEntrySummaries(entries) {
  return Promise.all(entries.map(e => fetchEntrySummary(e.entry)));
}

// --- Fetch player history ---
export async function fetchPlayerHistory(playerId) {
  try {
    return await fetchJson(`${BASE}/fpl/element-summary/${playerId}`);
  } catch (err) {
    console.warn(`Failed to fetch element-summary for player ${playerId}:`, err);
    return null;
  }
}

// --- NEW: Fetch complete entry season blob (uses /v1/ endpoint) ---
export async function fetchEntrySeasonBlob(entryId) {
  try {
    const response = await fetch(`${BASE}/v1/entry/${entryId}`);

    // Handle 202 status (entry still building)
    if (response.status === 202) {
      const state = await response.json();
      console.log(`Entry ${entryId} is ${state.status}, last GW: ${state.last_gw_processed}`);
      return null;  // Frontend can retry or show loading state
    }

    if (!response.ok) throw new Error(`Failed to fetch entry blob: ${response.status}`);

    const blob = await response.json();

    // Validate blob structure
    if (!blob.gw_summaries || !blob.picks_by_gw || !Array.isArray(blob.transfers)) {
      throw new Error('Invalid entry blob structure');
    }

    return blob;
  } catch (err) {
    console.warn(`Failed to fetch entry season blob for ${entryId}:`, err);
    return null;
  }
}

// --- NEW: Fetch season elements (all GW live data in one call) ---
export async function fetchSeasonElements() {
  try {
    const data = await fetchJson(`${BASE}/v1/season/elements`);
    if (!data.gws || typeof data.gws !== 'object') {
      throw new Error('Invalid season elements format');
    }
    return data;
  } catch (err) {
    console.warn('Failed to fetch season elements:', err);
    return null;
  }
}
