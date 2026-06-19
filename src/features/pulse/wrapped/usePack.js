// features/pulse/wrapped/usePack.js
//
// The N-manager data layer. Fetches the whole league in ONE cached worker
// aggregate (/v1/league/{id}/entries-pack) plus the two shared static datasets
// (bootstrap, season elements) — once, on entry. Spike-confirmed: the aggregate
// is ~30x faster than a raw FPL picks fan-out and never rate-limits.
//
// Returns a small state machine for the front-door cold paths:
//   loading        — request in flight (covers slow cold KV reads)
//   building       — pack served but some members' blobs aren't built yet
//   not-available  — league not ingested (404) or refused (403 too-large)
//   error          — bootstrap/elements/network failure
//   ready          — data + helpers available
//
// Ingestion is NOT triggered here: /admin/league/:id/ingest is auth-gated and a
// browser can't hold the token. The curated, availability-gated league list IS
// the v1 ingestion strategy (design-spec §3); 404 surfaces as a designed state.

import { useEffect, useState } from 'react';
import {
  fetchLeagueEntriesPack,
  fetchBootstrap,
  fetchSeasonElements,
  checkLeaguesAvailability,
} from '../../../utils/api';

const INITIAL = { status: 'idle', data: null };

export default function usePack(leagueId) {
  const [state, setState] = useState(INITIAL);
  // bump to re-run after a manual retry from the "building" / "error" states
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!leagueId) {
      setState(INITIAL);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    setState({ status: 'loading', data: null });

    (async () => {
      try {
        // Gate on availability first — distinguishes "not ingested" (404) from a
        // real failure, since fetchLeagueEntriesPack collapses all errors to null.
        const available = await checkLeaguesAvailability([leagueId], { signal });
        if (signal.aborted) return;
        if (!available.has(leagueId)) {
          setState({ status: 'not-available', data: null });
          return;
        }

        const [pack, bootstrap, seasonElements] = await Promise.all([
          fetchLeagueEntriesPack(leagueId, { signal }),
          fetchBootstrap({ signal }),
          fetchSeasonElements({ signal }),
        ]);
        if (signal.aborted) return;

        if (!pack || !bootstrap?.elements || !seasonElements?.gws) {
          setState({ status: 'error', data: null });
          return;
        }

        // Partial pack: a member listed but whose season blob isn't built yet is
        // omitted from `entries` (worker behaviour) → still building on the cron.
        const missing = pack.members.filter((id) => !pack.entries[id]);
        if (missing.length > 0) {
          setState({ status: 'building', data: { missing: missing.length, total: pack.members.length } });
          return;
        }

        const playerById = new Map(bootstrap.elements.map((el) => [el.id, el]));
        const finishedGwIds = (bootstrap.events || [])
          .filter((e) => e.finished)
          .map((e) => e.id);

        setState({
          status: 'ready',
          data: {
            leagueId,
            members: pack.members,
            entries: pack.entries,
            meta: pack.meta,
            bootstrap,
            seasonElements,
            finishedGwIds,
            getMember: (id) => pack.entries[id],
            playerName: (id) => {
              const el = playerById.get(id);
              return el ? `${el.first_name} ${el.second_name}` : `#${id}`;
            },
            playerPosition: (id) => playerById.get(id)?.element_type ?? 0,
          },
        });
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('[Wrapped] pack load failed:', err);
        setState({ status: 'error', data: null });
      }
    })();

    return () => controller.abort();
  }, [leagueId, attempt]);

  const retry = () => setAttempt((n) => n + 1);
  return { ...state, retry };
}
