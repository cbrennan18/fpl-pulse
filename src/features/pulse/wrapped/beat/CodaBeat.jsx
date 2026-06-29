// features/pulse/wrapped/beat/CodaBeat.jsx
//
// Beat 11 — "The Coda" (the all-time + league-legacy comedown). Rendered THROUGH
// BeatShell (chrome untouched). This is the CODA, not a climax: it lands AFTER
// beat 10's named win/loss verdict and shifts perspective — "who defined your
// season" → "where you stand across all your seasons." It soft-fails to a light
// "come back next year" close when history is thin (the re-engagement hook, not an
// error). FOUR screens (slot-11 screenCount: 4 — the design-spec §4 valve, taken
// because half (b) now carries its own position-over-time chart, so each half earns a
// screen rather than crowding one):
//   screen 0 — zoom-out setup (question).
//   screen 1 — half (a): the all-time CAREER rating (bracket, score, percentile sparkline).
//   screen 2 — half (b): your in-league LEGACY — a dots-on-tracks finish-over-time chart
//              (incl. the REAL 2025/26 anchor) + all-time RANK standing + best-ever year,
//              captioned "this season real, earlier seasons the what-if".
//   screen 3 — the sign-off ("See you next season, [nemesis]") → recap carousel.
// Soft-fail: career and legacy each render their screen or a light note; both null →
// the comeback close split across screens 1–2, flowing into the sign-off.
//
// THE ONE STRUCTURAL DEVIATION: this is the FIRST beat that FETCHES. Every prior
// beat is a pure useMemo over the once-fetched pack — but past-season history
// (entry/{id}/history → past[]) is NOT in the entries-pack (it's this-season only).
// Half (a) reuses getCareerRating(you) UNCHANGED (it fetches your history, worker-
// cached). Half (b) needs every member's past[] → N per-member fetches via
// fetchEntryHistory, parallelized 8-wide, AbortController-cleaned, run LAZILY on
// reach (kept beat-local so early-bailers pay nothing and usePack stays untouched).
//
// Robustness: a member whose fetch errors arrives as `null` and simply drops from
// the legacy coverage count (computeLeagueLegacy handles it) — one bad fetch never
// sinks the beat. Career soft-fails to null; legacy soft-fails by omitting. Both
// null → the comeback close. Warm-stock loader reads as intentional, never a stall.

import { useEffect, useMemo, useState } from 'react';
import BeatShell from './BeatShell';
import CodaSparkline from './CodaSparkline';
import LegacyPositionChart from './LegacyPositionChart';
import { useWrapped } from '../PackContext';
import { fetchEntryHistory } from '../../../../utils/api';
import { getCareerRating } from '../../utils/careerRating';
import { computeLeagueLegacy } from '../calc/leagueLegacy';
import { computeRace } from '../calc/race';
import { ordinal } from '../calc/setAndForget';
import { SEASON_LABEL } from '../constants';

const FETCH_CONCURRENCY = 8;

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
  const [data, setData] = useState({ status: 'loading', career: null, historyByMember: null });

  // The lazy fetch (half a's career + half b's per-member history), on mount.
  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    (async () => {
      try {
        const [career, historyByMember] = await Promise.all([
          // getCareerRating throws on an unavailable history fetch and returns null
          // on too-little-history; both soft-fail to a null career here.
          getCareerRating(you, { signal: ctrl.signal }).catch((err) => {
            if (err?.name === 'AbortError') throw err;
            return null;
          }),
          fetchAllHistories(members, ctrl.signal),
        ]);
        if (alive) setData({ status: 'ready', career, historyByMember });
      } catch (err) {
        if (err?.name === 'AbortError') return; // unmount — drop quietly
        if (alive) setData({ status: 'ready', career: null, historyByMember: {} });
      }
    })();
    return () => { alive = false; ctrl.abort(); };
  }, [you, members]);

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

  // Nemesis for the sign-off — recomputed pack-only (the exact call RaceBeat makes),
  // no fetch. Graceful generic close if there's no nemesis (e.g. a 2-member league).
  const nemesisName = useMemo(() => {
    const r = computeRace({ entries, members, you, finishedGwIds });
    return r?.nemesis?.name ?? null;
  }, [entries, members, you, finishedGwIds]);

  const loading = data.status === 'loading';
  const bothMissing = !loading && !data.career && !legacy;

  return (
    <BeatShell {...shell}>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
        {shell.beat.edition} — {shell.beat.theme}
      </p>

      {screenIndex === 0 && <SetupScreen />}
      {screenIndex === 1 && (
        loading
          ? <LoadingScreen />
          : <CareerScreen career={data.career} bothMissing={bothMissing} />
      )}
      {screenIndex === 2 && (
        loading
          ? <LoadingScreen />
          : <LegacyScreen legacy={legacy} careerPresent={!!data.career} bothMissing={bothMissing} />
      )}
      {screenIndex === 3 && <SignOffScreen nemesisName={nemesisName} />}
    </BeatShell>
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
        Tap for the all-time read →
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
        All-time
      </p>
      <h2 className="font-display text-5xl leading-[0.9] tracking-tight mt-4 animate-pulse">
        Tallying your all-time standing…
      </h2>
      <p className="font-sans text-sm text-wrapped-muted mt-4">
        Reading every season you and your league have played.
      </p>
    </div>
  );
}

// Screen 1 (half a) — the all-time CAREER rating (global). Both halves empty → the
// first beat of the light comeback close (the re-engagement hook, not an error).
function CareerScreen({ career, bothMissing }) {
  if (bothMissing) {
    return (
      <ScreenFrame kicker="All-time">
        <h2 className="font-display text-6xl leading-[0.9] tracking-tight mt-4">
          Not enough seasons yet.
        </h2>
        <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
          One season down. The all-time story needs a few more.
        </p>
      </ScreenFrame>
    );
  }

  if (!career) {
    return (
      <ScreenFrame kicker="All-time">
        <p className="font-sans text-base text-wrapped-ink mt-3 max-w-sm">
          Not enough seasons yet for an all-time rating — but your league legacy is next.
        </p>
      </ScreenFrame>
    );
  }

  const { rating, bracket, estRank, trajectory } = career;
  const peaked = peakSeason(trajectory);

  return (
    <ScreenFrame kicker="All-time · career">
      <div className="mt-2">
        <h2 className="font-display text-6xl leading-[0.85] tracking-tight text-wrapped-green [overflow-wrap:anywhere]">
          {bracket}
        </h2>
        <p className="font-mono text-[12px] tabular-nums text-wrapped-muted mt-1">
          Career score <span className="text-wrapped-ink">{rating.toFixed(1)}</span>
          <span> · est. rank ~{estRank.toLocaleString()}</span>
        </p>

        <div className="mt-3">
          <CodaSparkline trajectory={trajectory} />
        </div>
        {peaked && (
          <p className="font-sans text-[13px] text-wrapped-muted mt-2">Peaked in {peaked}</p>
        )}
      </div>
    </ScreenFrame>
  );
}

// Screen 2 (half b) — your in-league LEGACY: the position-over-time chart + the
// average-percentile standing + best-ever year, captioned as a cross-years what-if.
function LegacyScreen({ legacy, careerPresent, bothMissing }) {
  if (bothMissing) {
    return (
      <ScreenFrame kicker="All-time">
        <h2 className="font-display text-6xl leading-[0.9] tracking-tight mt-4">
          Come back next year.
        </h2>
        <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
          There'll be an all-time story to tell — and a league to settle.
        </p>
      </ScreenFrame>
    );
  }

  if (!legacy) {
    // Career survived but the league lacks enough shared history for a table.
    return (
      <ScreenFrame kicker="League legacy">
        <p className="font-sans text-base text-wrapped-ink mt-3 max-w-sm">
          {careerPresent
            ? 'Not enough shared seasons in this league yet for an all-time table — give it a year.'
            : 'Not enough league history yet — give it a year.'}
        </p>
      </ScreenFrame>
    );
  }

  const { earliest, standing, series, bestEver } = legacy;

  return (
    <ScreenFrame kicker="League legacy · every season">
      <div className="mt-2">
        <LegacyPositionChart series={series} />
      </div>

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

function SignOffScreen({ nemesisName }) {
  return (
    <div className="mt-4 flex flex-col h-full">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted">
        Until next season
      </p>
      <h2 className="font-display text-7xl leading-[0.85] tracking-tight mt-4 [overflow-wrap:anywhere]">
        {nemesisName ? <>See you next season, {nemesisName}.</> : <>See you next season.</>}
      </h2>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-auto">
        Tap to pick your cards →
      </p>
    </div>
  );
}

// Peak season label = highest-percentile season (matches CodaSparkline's gold dot).
function peakSeason(trajectory) {
  if (!trajectory?.length) return '';
  const best = trajectory.reduce((a, b) => (b.percentile > a.percentile ? b : a));
  return best.season;
}
