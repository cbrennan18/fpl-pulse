// features/pulse/wrapped/beat/CodaBeat.jsx
//
// Beat 11 — "The Coda" (the league-legacy comedown). Rendered THROUGH BeatShell
// (chrome untouched). This is the CODA, not a climax: it lands AFTER beat 10's named
// win/loss verdict and shifts perspective — "who defined your season" → "where you
// stand across all your seasons in THIS league." It soft-fails to a light "come back
// next year" close when shared history is thin (the re-engagement hook, not an error).
//
// THREE screens (slot-11 screenCount: 3):
//   screen 0 — zoom-out setup (question).
//   screen 1 — your in-league LEGACY — a dots-on-tracks finish-over-time chart
//              (incl. the REAL 2025/26 anchor) + all-time RANK standing + best-ever year,
//              captioned "this season real, earlier seasons the what-if".
//   screen 2 — the sign-off ("See you next season, [you]") → recap carousel.
// Soft-fail: legacy renders its screen, or — when there's not enough shared history —
// the light "come back next year" comeback close, flowing into the sign-off.
//
// 2025/26 UNWIRE: the all-time CAREER rating (the old half (a) / screen 1) is dropped
// for this season — it was the lone GLOBAL screen in a mini-league-relative product,
// so the Coda now lands entirely on the league lens. This is an UNWIRE, not a delete:
// getCareerRating / career-rating-v1 / CodaSparkline all stay on disk for next year's
// career-rating accuracy work to reinstate.
//
// THE ONE STRUCTURAL DEVIATION: this is the FIRST beat that FETCHES. Every prior
// beat is a pure useMemo over the once-fetched pack — but past-season history
// (entry/{id}/history → past[]) is NOT in the entries-pack (it's this-season only).
// Legacy needs every member's past[] → N per-member fetches via fetchEntryHistory,
// parallelized 8-wide, AbortController-cleaned, run LAZILY on reach (kept beat-local
// so early-bailers pay nothing and usePack stays untouched).
//
// Robustness: a member whose fetch errors arrives as `null` and simply drops from
// the legacy coverage count (computeLeagueLegacy handles it) — one bad fetch never
// sinks the beat. Legacy soft-fails to null → the comeback close. Warm-stock loader
// reads as intentional, never a stall.

import { useEffect, useMemo, useState } from 'react';
import BeatShell from './BeatShell';
import DetailSheet from './DetailSheet';
// CodaSparkline is UNWIRED for 2025/26 — it only rendered the dropped career half (a).
// Left on disk (not imported) so next year's career-rating work can reinstate it.
import LegacyPositionChart from './LegacyPositionChart';
import { useWrapped } from '../PackContext';
import { fetchEntryHistory } from '../../../../utils/api';
import { computeLeagueLegacy } from '../calc/leagueLegacy';
import { memberName, ordinal } from '../calc/setAndForget';
import { SEASON_LABEL } from '../constants';

const FETCH_CONCURRENCY = 8;
const LEGACY_SCREEN = 1;

// Fetch every member's past[] in polite 8-wide waves. fetchEntryHistory already
// returns null on a non-abort failure (it never throws except AbortError), so one
// errored member yields { id: null } and the rest proceed. Abort rethrows to unwind.
async function fetchAllHistories(members, signal) {
  const out = {};
  for (let i = 0; i < members.length; i += FETCH_CONCURRENCY) {
    const wave = members.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(
      wave.map((id) =>
        fetchEntryHistory(id, { signal }).then(
          (h) => ({ id, past: h?.past ?? null }),
          (err) => {
            if (err?.name === 'AbortError') throw err;
            return { id, past: null };
          }
        )
      )
    );
    for (const r of results) out[r.id] = r.past;
  }
  return out;
}

export default function CodaBeat({ screenIndex, ...shell }) {
  const { entries, members, you, finishedGwIds } = useWrapped();
  const [data, setData] = useState({ status: 'loading', historyByMember: null });

  // The lazy fetch (every member's per-member history for the legacy chart), on mount.
  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    (async () => {
      try {
        const historyByMember = await fetchAllHistories(members, ctrl.signal);
        if (alive) setData({ status: 'ready', historyByMember });
      } catch (err) {
        if (err?.name === 'AbortError') return; // unmount — drop quietly
        if (alive) setData({ status: 'ready', historyByMember: {} });
      }
    })();
    return () => { alive = false; ctrl.abort(); };
  }, [members]);

  const legacy = useMemo(
    () =>
      data.historyByMember
        ? computeLeagueLegacy({
            historyByMember: data.historyByMember,
            entries, members, you, finishedGwIds, seasonLabel: SEASON_LABEL,
          })
        : null,
    [data.historyByMember, entries, members, you, finishedGwIds]
  );

  // Your own name for the sign-off — the Coda closes by addressing you, not a rival.
  // Pack-only, no fetch; falls back to a generic close if your name is unavailable.
  const yourName = useMemo(
    () => (you != null ? memberName(entries[you], you) : null),
    [entries, you]
  );

  const loading = data.status === 'loading';

  // Tap→detail: the season track whose rank + points + what-if winner is open.
  const [detailSeason, setDetailSeason] = useState(null);
  useEffect(() => {
    if (screenIndex !== LEGACY_SCREEN) setDetailSeason(null);
  }, [screenIndex]);

  const seasonRecord = detailSeason ? legacy?.series?.find((s) => s.season === detailSeason) : null;
  const seasonWinner = detailSeason ? legacy?.winnersBySeason?.[detailSeason] : null;

  return (
    <BeatShell {...shell}>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
        {shell.beat.edition} — {shell.beat.theme}
      </p>

      {screenIndex === 0 && <SetupScreen />}
      {screenIndex === 1 && (
        loading
          ? <LoadingScreen />
          : <LegacyScreen legacy={legacy} onSeasonTap={setDetailSeason} />
      )}
      {screenIndex === 2 && <SignOffScreen yourName={yourName} />}

      <DetailSheet
        open={detailSeason != null}
        onClose={() => setDetailSeason(null)}
        title={detailSeason || ''}
      >
        <SeasonDetail record={seasonRecord} winner={seasonWinner} />
      </DetailSheet>
    </BeatShell>
  );
}

// Your finish that season + the what-if winner. LOCKED FRAMING: for PAST seasons the
// winner is the SYNTHETIC re-run leader (never the real historical winner) — copy stays
// what-if. 2025/26 is the one REAL anchor, so its line states the real current leader.
function SeasonDetail({ record, winner }) {
  if (!record) return null;
  return (
    <div className="space-y-3">
      <p className="font-sans text-lg leading-snug [overflow-wrap:anywhere]">
        You finished{' '}
        <span className="text-wrapped-green font-semibold">{ordinal(record.position)}</span>{' '}
        of {record.field}
        {record.points != null && <> — {record.points} pts</>}.
      </p>
      {winner && (
        <p className="font-sans text-[15px] leading-snug text-wrapped-ink [overflow-wrap:anywhere]">
          {winner.real ? (
            <>
              {record.season} leads with{' '}
              <span className="font-semibold">{winner.isYou ? 'you' : winner.name}</span> out front
              {winner.points != null && <> ({winner.points} pts)</>}.
            </>
          ) : (
            <>
              In this league&apos;s all-time re-run, {record.season} went to{' '}
              <span className="font-semibold">{winner.isYou ? 'you' : winner.name}</span>
              {winner.points != null && <> ({winner.points} pts)</>}.
            </>
          )}
        </p>
      )}
      {winner && !winner.real && (
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-wrapped-muted">
          What-if — re-ranked on that season&apos;s points, not the real result.
        </p>
      )}
    </div>
  );
}

function SetupScreen() {
  return (
    <div className="mt-4">
      <h2 className="font-display text-6xl leading-[0.9] tracking-tight">
        That was 2025/26. But across every season?
      </h2>
      <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
        One season is a story. Your whole history is a verdict. Step back from the
        race and see where you really stand.
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-8">
        Tap for your league legacy →
      </p>
    </div>
  );
}

// Intentional, in-character loader — never a contextless spinner. The fetch starts
// on mount (screen 0), so by the time the user taps through this is usually gone;
// a slow/cold read degrades gracefully to this card, then to content or the close.
function LoadingScreen() {
  return (
    <div className="mt-4 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        League legacy
      </p>
      <h2 className="font-display text-5xl leading-[0.9] tracking-tight mt-4 animate-pulse">
        Tracing your league&apos;s history…
      </h2>
      <p className="font-sans text-sm text-wrapped-muted mt-4">
        Reading every season your league has played.
      </p>
    </div>
  );
}

// Screen 1 — your in-league LEGACY: the position-over-time chart + the
// average-percentile standing + best-ever year, captioned as a cross-years what-if.
// Legacy-null (not enough shared history) is the lone soft-fail now → the light
// "come back next year" comeback close (the re-engagement hook, not an error).
function LegacyScreen({ legacy, onSeasonTap }) {
  if (!legacy) {
    return (
      <ScreenFrame kicker="League legacy">
        <h2 className="font-display text-6xl leading-[0.9] tracking-tight mt-4">
          Come back next year.
        </h2>
        <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
          Not enough shared seasons in this league yet — there&apos;ll be a legacy to
          settle once you&apos;ve all played a few more.
        </p>
      </ScreenFrame>
    );
  }

  const { earliest, standing, series, bestEver } = legacy;

  return (
    <ScreenFrame kicker="League legacy · every season">
      <div className="mt-2">
        <LegacyPositionChart series={series} onSelect={onSeasonTap} />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-wrapped-muted mt-1.5">
        Tap a season for your finish + the what-if winner →
      </p>

      <p className="font-sans text-lg leading-snug mt-3 [overflow-wrap:anywhere]">
        Across every season you&apos;ve played, you rank{' '}
        <span className="text-wrapped-green font-semibold">
          {standing.you.rank != null ? ordinal(standing.you.rank) : '—'}
        </span>
        {' '}of {standing.you.of} all-time in this league.
      </p>

      {bestEver && (
        <p className="font-sans text-[15px] leading-snug text-wrapped-ink mt-2 [overflow-wrap:anywhere]">
          Your best year: <span className="font-semibold">{bestEver.season}</span> —{' '}
          {ordinal(bestEver.position)} of {bestEver.field}.
        </p>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-wrapped-muted mt-3">
        This season&apos;s real — the earlier seasons are the what-if. If today&apos;s league had run since {earliest}, by each season&apos;s points. Ignores who wasn&apos;t playing yet, or has since left.
      </p>
    </ScreenFrame>
  );
}

// Shared screen wrapper: the kicker + a full-height column (so mt-auto pins the
// sign-off cue / verdict to the bottom, matching the other beats).
function ScreenFrame({ kicker, children }) {
  return (
    <div className="mt-3 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        {kicker}
      </p>
      {children}
    </div>
  );
}

function SignOffScreen({ yourName }) {
  return (
    <div className="mt-4 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        Until next season
      </p>
      <h2 className="font-display text-7xl leading-[0.85] tracking-tight mt-4 [overflow-wrap:anywhere]">
        {yourName ? <>See you next season, {yourName}.</> : <>See you next season.</>}
      </h2>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-auto">
        Tap to pick your cards →
      </p>
    </div>
  );
}
