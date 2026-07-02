// features/pulse/wrapped/beat/LuckSkillBeat.jsx
//
// Beat 9 — "Luck vs Skill". Rendered THROUGH BeatShell (chrome untouched). Two
// screens:
//   screen 0 — the question ("Were you good — or lucky?").
//   screen 1 — the two-line cumulative chart (expected edge dashed, actual solid,
//              luck gap shaded) + the verdict, under a two-tab in-screen toggle.
//
// Tabs (mirrors ChipsBeat's in-screen HalfToggle: local state, stopPropagation so
// a tab tap never advances the beat):
//   Tab 1 — MINI-LEAGUE (default): built fully from computeLuckVsSkill.
//   Tab 2 — AE64: DEFERRED this session — soft-disabled placeholder, no data.
//
// AE64 IDENTITY (captured, NOT built): AE64 = "Analytics Elite 64", FPL classic
// league 1373455. The benchmark is that league's membership run through the SAME
// xP model + shared spine — an aggregate field, identical decomposition to Tab 1,
// just a different member set. Its own later track: pull 1373455 standings → run
// members through the model → cache as a static benchmark. Do NOT fetch it here.
//
// Colour: green = you (both edge lines; weight/opacity separate them); muted =
// context + the luck gap. NO loss-red. Copy frames luck as deviation from EXPECTED
// (retrospective finishing variance), never forecast-deviation.

import { useState } from 'react';
import BeatShell from './BeatShell';
import { useWrapped } from '../PackContext';
import LuckSkillChart from './LuckSkillChart';
import { computeLuckVsSkill, buildVerdict, computeAe64Benchmark, buildAe64Verdict } from '../calc/luckVsSkill';

const CHART_SCREEN = 1;

export default function LuckSkillBeat({ screenIndex, ...shell }) {
  const { entries, members, you, seasonElements, finishedGwIds, playerPosition } = useWrapped();
  const [tab, setTab] = useState('league');

  const result = computeLuckVsSkill({
    entries,
    members,
    you,
    seasonElements,
    finishedGwIds,
    playerPosition,
  });

  // Tab 2 reuses YOUR already-scored series from Tab 1 (never re-scored) against the
  // frozen AE64 field. Null until you have a scored season to insert.
  const ae64 = result.youSeries
    ? computeAe64Benchmark({ youSeries: result.youSeries, youTotals: result.you, finishedGwIds })
    : null;

  return (
    <BeatShell {...shell}>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
        {shell.beat.edition} — {shell.beat.theme}
      </p>

      {screenIndex === 0 && <QuestionScreen />}
      {screenIndex === CHART_SCREEN && (
        <ChartScreen result={result} ae64={ae64} tab={tab} onTab={setTab} />
      )}
    </BeatShell>
  );
}

function QuestionScreen() {
  return (
    <div className="mt-4">
      <h2 className="font-display text-6xl leading-[0.9] tracking-tight">
        Were you good — or lucky?
      </h2>
      <p className="font-sans text-base text-wrapped-muted mt-5 max-w-sm">
        We re-scored your season on expected points — what your picks were worth
        on the underlying numbers — and measured it against your league. The gap to
        what actually happened is luck.
      </p>
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted mt-8">
        Tap for the verdict →
      </p>
    </div>
  );
}

// --- Two-tab toggle (ruled segmented control, ChipsBeat precedent) ------------

function TabToggle({ tab, onTab }) {
  const seg = (key, label) => {
    const active = key === tab;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // never advance the beat
          onTab(key);
        }}
        className={`flex-1 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] border border-wrapped-ink rounded-[2px] ${
          active ? 'bg-wrapped-ink text-wrapped-paper' : 'text-wrapped-ink'
        }`}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="flex gap-2 mt-3">
      {seg('league', 'Your league')}
      {seg('ae64', 'AE64')}
    </div>
  );
}

function ChartScreen({ result, ae64, tab, onTab }) {
  return (
    <div className="mt-3 flex flex-col h-full">
      <TabToggle tab={tab} onTab={onTab} />
      {tab === 'league' ? <LeaguePanel result={result} /> : <Ae64Panel result={ae64} />}
    </div>
  );
}

function LeaguePanel({ result }) {
  if (!result?.you || !result.gws.length) {
    return (
      <p className="font-sans text-base text-wrapped-muted mt-6">
        Not enough finished gameweeks to read luck from skill yet.
      </p>
    );
  }

  return (
    <>
      <div className="mt-3">
        <LuckSkillChart
          gws={result.gws}
          expectedEdge={result.expectedEdge}
          actualEdge={result.actualEdge}
        />
      </div>

      <Credit misses={result.misses} attribution={result.attribution} />

      <p className="font-sans text-lg leading-snug mt-auto pt-3 border-t border-wrapped-ink/30 [overflow-wrap:anywhere]">
        {buildVerdict(result)}
      </p>
    </>
  );
}

// Attribution (owed wherever xP surfaces) + retrospective note + an honest data-
// quality line when the artefact missed any fielded players.
function Credit({ misses, attribution }) {
  return (
    <p className="font-mono text-[9px] leading-relaxed uppercase tracking-[0.12em] text-wrapped-muted mt-1.5">
      Expected points: retrospective model · {attribution}
      {misses?.total > 0 && ` · ${misses.total} unmodelled player-week${misses.total === 1 ? '' : 's'} filled at par`}
    </p>
  );
}

// Tab 2 — the humbling benchmark. YOUR line reused from Tab 1's scorer; the field
// is the frozen AE64 artefact (read-only). Same chart, colour lock, no loss-red.
// Copy is a what-if — your season dropped into their league, never a claim you
// played in it. No misses clause here: the artefact folded those in at freeze.
function Ae64Panel({ result }) {
  if (!result || !result.gws.length) {
    return (
      <p className="font-sans text-base text-wrapped-muted mt-6">
        Not enough finished gameweeks to measure against AE64 yet.
      </p>
    );
  }

  return (
    <>
      <p className="font-sans text-sm text-wrapped-muted mt-2 [overflow-wrap:anywhere]">
        {result.descriptor}
      </p>

      <div className="mt-2">
        <LuckSkillChart
          gws={result.gws}
          expectedEdge={result.expectedEdge}
          actualEdge={result.actualEdge}
        />
      </div>

      <Credit attribution={result.attribution} />

      <p className="font-sans text-lg leading-snug mt-auto pt-3 border-t border-wrapped-ink/30 [overflow-wrap:anywhere]">
        {buildAe64Verdict(result)}
      </p>
    </>
  );
}
