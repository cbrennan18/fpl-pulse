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

// --- Fetch all entry blobs for a league in one call (uses /v1/ endpoint) ---
export async function fetchLeagueEntriesPack(leagueId, { signal } = {}) {
  try {
    const data = await fetchJson(`${BASE}/v1/league/${leagueId}/entries-pack`, { signal });
    if (!data?.entries || !Array.isArray(data?.members)) {
      throw new Error('Invalid entries-pack format');
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn(`Failed to fetch entries-pack for league ${leagueId}:`, err);
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
