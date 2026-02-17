// src/utils/api.js

const BASE = import.meta.env.VITE_API_BASE || 'https://fpl-pulse.ciaranbrennan18.workers.dev';

// General-purpose fetch wrapper with retry and abort support.
// Retries up to 3 times with linear backoff (500ms, 1000ms, 1500ms).
async function fetchJson(url, { signal } = {}) {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 500;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { signal });
    if (res.ok) return res.json();

    if (attempt < MAX_RETRIES) {
      console.warn(`Fetch attempt ${attempt} failed for ${url} (${res.status}), retrying...`);
      await new Promise(r => setTimeout(r, BASE_DELAY * attempt));
    } else {
      throw new Error(`Fetch failed for ${url} after ${MAX_RETRIES} attempts (${res.status})`);
    }
  }
}

// --- Fetch summary information for a team by entry ID ---
export async function fetchEntrySummary(id, { signal } = {}) {
  try {
    return await fetchJson(`${BASE}/fpl/entry/${id}/summary`, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch entry summary for ${id}:`, err);
    return null;
  }
}

// --- Fetch gameweek-by-gameweek history for a team ---
export async function fetchEntryHistory(id, { signal } = {}) {
  try {
    return await fetchJson(`${BASE}/fpl/entry/${id}`, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch entry history for ${id}:`, err);
    return null;
  }
}

// --- Fetch picks for a specific entry and gameweek ---
export async function fetchEntryPicks(entryId, gw, { signal } = {}) {
  try {
    const data = await fetchJson(`${BASE}/fpl/entry/${entryId}/event/${gw}/picks`, { signal });
    if (!Array.isArray(data.picks)) throw new Error('Invalid picks format');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch picks for entry ${entryId} GW${gw}:`, err);
    return null;
  }
}

// --- Fetch all transfers for a team ---
export async function fetchEntryTransfers(entryId, { signal } = {}) {
  try {
    const data = await fetchJson(`${BASE}/fpl/entry/${entryId}/transfers`, { signal });
    if (!Array.isArray(data)) throw new Error('Transfers response is not an array');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch transfers for entry ${entryId}:`, err);
    return [];
  }
}

// --- Fetch live data (points, minutes, etc) for a given gameweek ---
export async function fetchLiveData(gw, { signal } = {}) {
  try {
    const data = await fetchJson(`${BASE}/fpl/live/${gw}`, { signal });
    if (!Array.isArray(data.elements)) throw new Error('Live data missing elements');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch live data for GW${gw}:`, err);
    return { elements: [] };
  }
}

// --- Fetch bootstrap static data: players, teams, events, etc ---
export async function fetchBootstrap({ signal } = {}) {
  try {
    const data = await fetchJson(`${BASE}/fpl/bootstrap`, { signal });
    if (!Array.isArray(data.elements)) throw new Error('Invalid bootstrap format');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn('Failed to fetch bootstrap:', err);
    return null;
  }
}

// --- Fetch league standings and metadata ---
export async function fetchLeagueStandings(leagueId, { signal } = {}) {
  try {
    const data = await fetchJson(`${BASE}/fpl/league/${leagueId}`, { signal });
    if (!data?.standings?.results) throw new Error('Invalid league data');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch league standings for ${leagueId}:`, err);
    return null;
  }
}

// --- Fetch top entry summaries (wrapper around fetchEntrySummary) ---
export async function fetchTopEntrySummaries(entries, { signal } = {}) {
  return Promise.all(entries.map(e => fetchEntrySummary(e.entry, { signal })));
}

// --- Fetch player history ---
export async function fetchPlayerHistory(playerId, { signal } = {}) {
  try {
    return await fetchJson(`${BASE}/fpl/element-summary/${playerId}`, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch element-summary for player ${playerId}:`, err);
    return null;
  }
}

// --- Fetch complete entry season blob (uses /v1/ endpoint) ---
export async function fetchEntrySeasonBlob(entryId, { signal } = {}) {
  try {
    const response = await fetch(`${BASE}/v1/entry/${entryId}`, { signal });

    // Handle 202 status (entry still building)
    if (response.status === 202) {
      const state = await response.json();
      console.log(`Entry ${entryId} is ${state.status}, last GW: ${state.last_gw_processed}`);
      return null;
    }

    if (!response.ok) throw new Error(`Failed to fetch entry blob: ${response.status}`);

    const blob = await response.json();

    // Validate blob structure
    if (!blob.gw_summaries || !blob.picks_by_gw || !Array.isArray(blob.transfers)) {
      throw new Error('Invalid entry blob structure');
    }

    return blob;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch entry season blob for ${entryId}:`, err);
    return null;
  }
}

// --- Fetch season elements (all GW live data in one call) ---
export async function fetchSeasonElements({ signal } = {}) {
  try {
    const data = await fetchJson(`${BASE}/v1/season/elements`, { signal });
    if (!data.gws || typeof data.gws !== 'object') {
      throw new Error('Invalid season elements format');
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn('Failed to fetch season elements:', err);
    return null;
  }
}
