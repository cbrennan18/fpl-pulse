// features/pulse/wrapped/WrappedContainer.jsx
//
// Route element for /wrapped. Owns the two-ramp navigation state machine, the
// selected league, and identity ("you"), and provides the once-fetched pack to
// every beat via PackContext. Thin orchestrator — each phase is its own screen.
//
// NOTE (flip-time): this lives at /wrapped and runs ALONGSIDE the legacy recap
// (PulseContainer at /pulse, PulsePage1–10). A later session flips /pulse to this
// flow and retires/reconciles the legacy files. Until then both routes coexist.
//
// Ramps (design-spec §3):
//   General : ?id=<teamId>            → league-select → cover → beats → recap
//   Link    : ?league=<id>&via=link   → roster-pick (identity) → cover → beats → recap
// Bare /wrapped (no identity, no usable link) → redirect to landing to identify.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import useUmami from '../../../hooks/useUmami';
import usePack from './usePack';
import useBeatNavigation from './beat/useBeatNavigation';
import { PackContext } from './PackContext';
import { BEATS, TOTAL_SEGMENTS } from './constants';
import LeagueSelect from './frontdoor/LeagueSelect';
import RosterPicker from './frontdoor/RosterPicker';
import Cover from './frontdoor/Cover';
import BuildingSeason from './loading/BuildingSeason';
import NotAvailable from './loading/NotAvailable';
import PlaceholderBeat from './beat/PlaceholderBeat';
import SetAndForgetBeat from './beat/SetAndForgetBeat';
import CaptainBeat from './beat/CaptainBeat';
import TransferTimingBeat from './beat/TransferTimingBeat';
import MaverickBeat from './beat/MaverickBeat';
import FingerprintBeat from './beat/FingerprintBeat';
import GameweekKingsBeat from './beat/GameweekKingsBeat';
import ChipsBeat from './beat/ChipsBeat';
import BenchBeat from './beat/BenchBeat';
import LuckSkillBeat from './beat/LuckSkillBeat';
import RaceBeat from './beat/RaceBeat';
import CodaBeat from './beat/CodaBeat';
import RecapCarousel from './recap/RecapCarousel';
import WrappedHiddenStage from './share/WrappedHiddenStage';
import useShareCard from './share/useShareCard';
import { LegacyHistoryContext } from './share/LegacyHistoryContext';

// Real beats land here as they're built; every other slot falls back to the
// placeholder so the chrome stays exercised for the whole arc.
const BEAT_COMPONENTS = {
  'set-and-forget': SetAndForgetBeat,
  'captain': CaptainBeat,
  'transfer-timing': TransferTimingBeat,
  'maverick': MaverickBeat,
  'fingerprint': FingerprintBeat,
  'gameweek-kings': GameweekKingsBeat,
  'chips': ChipsBeat,
  'the-bench': BenchBeat,
  'luck-vs-skill': LuckSkillBeat,
  'the-race': RaceBeat,
  'coda': CodaBeat,
};

export default function WrappedContainer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { track } = useUmami();

  const sessionId = Number(searchParams.get('id')) || null;
  const viaLink = searchParams.get('via') === 'link';
  const leagueParam = Number(searchParams.get('league')) || null;

  const [leagueId, setLeagueId] = useState(leagueParam);
  const [leagueName, setLeagueName] = useState('');
  const [you, setYou] = useState(viaLink ? null : sessionId);
  const [stage, setStage] = useState('cover'); // post-ready: cover | beats | recap
  const [recapIndex, setRecapIndex] = useState(0); // selected card in the recap carousel
  // Beat 11's fetched history, lifted out of CodaBeat so its share card can read it
  // (the one beat that fetches — see LegacyHistoryContext). CodaBeat writes; card reads.
  const [historyByMember, setHistoryByMember] = useState(null);

  const pack = usePack(leagueId);
  const nav = useBeatNavigation({
    beats: BEATS,
    onComplete: () => { track('wrapped_recap_reached', { leagueId }); setStage('recap'); },
  });
  // Share pipe: rasterise the off-screen card node → 1080² PNG → native share /
  // download. Captures whatever card the hidden stage currently renders — the
  // active beat's card, or the recap-selected card.
  const { stageRef, share: handleShare, download: handleDownload } = useShareCard({ leagueName });
  const legacyHistory = useMemo(() => ({ historyByMember, setHistoryByMember }), [historyByMember]);

  // --- Funnel instrumentation (Umami) ----------------------------------------
  // All guarded so re-renders / back-nav / replay don't double-fire.

  // Link-ramp arrival — the #2 shared-link verification metric. Once per mount,
  // from the URL param (not state), only when the link ramp is actually usable.
  useEffect(() => {
    if (viaLink && leagueParam) track('wrapped_link_arrival', { leagueId: leagueParam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cover reached (funnel entry). Ref keyed on leagueId: fires the first time the
  // ready cover shows for a league; blocks back-nav/replay/re-render, but a genuine
  // different-league re-selection fires fresh.
  const coverFiredForRef = useRef(null);
  useEffect(() => {
    if (pack.status === 'complete' && stage === 'cover' && coverFiredForRef.current !== leagueId) {
      coverFiredForRef.current = leagueId;
      track('wrapped_cover_viewed', { leagueId });
    }
  }, [pack.status, stage, leagueId, track]);

  // Beat first-view (drop-off curve). Keyed on beatIndex only — screenIndex is NOT
  // a dep, so screen-advance within a beat doesn't re-fire; the seen-set blocks
  // back-nav re-fires. Furthest-progress per mount.
  const seenBeatsRef = useRef(new Set());
  useEffect(() => {
    if (stage !== 'beats' || seenBeatsRef.current.has(nav.beatIndex)) return;
    seenBeatsRef.current.add(nav.beatIndex);
    const beat = BEATS[nav.beatIndex];
    track('wrapped_beat_viewed', { beatId: beat.id, beatIndex: nav.beatIndex });
  }, [stage, nav.beatIndex, track]);

  const goMakeYourOwn = () => navigate('/'); // general entry establishes identity at the dashboard
  // X from any beat → back to league-select, uniformly for both ramps. Clearing
  // leagueId hits the `!leagueId` early return (above the provider), so the whole
  // beats/hidden-stage subtree unmounts — no stale card, no stuck stage.
  const closeToLeagueSelect = () => {
    setLeagueId(null);
    setStage('cover');
    setRecapIndex(0);
    nav.jumpTo(0);
  };

  // --- Front-door routing ----------------------------------------------------

  // Bare entry: no session identity and no usable shared link → identify first.
  const generalPossible = !!sessionId;
  const linkPossible = viaLink && !!leagueParam;
  if (!generalPossible && !linkPossible) {
    return <Navigate to="/" replace />;
  }

  // Link ramp: the roster pick IS the identity step.
  if (viaLink && !you) {
    return (
      <RosterPicker
        leagueId={leagueParam}
        onPick={(entry, name) => { track('wrapped_roster_picked', { leagueId: leagueParam }); setYou(entry); setLeagueName(name); }}
        onMakeYourOwn={goMakeYourOwn}
      />
    );
  }

  // League-select (gated to ingested leagues). Gated from `you`, not sessionId, so
  // a link-ramp arrival (no ?id=, but a roster-picked `you`) still gets its own
  // league list here — e.g. when the X close returns them to this stage.
  if (!leagueId) {
    return (
      <LeagueSelect
        teamId={you ?? sessionId}
        onChoose={(id, name) => { track('wrapped_league_selected', { leagueId: id }); setLeagueId(id); setLeagueName(name); }}
      />
    );
  }

  // --- Data / cold-path states -----------------------------------------------

  if (pack.status === 'loading' || pack.status === 'idle') {
    return <BuildingSeason variant="loading" />;
  }
  if (pack.status === 'building') {
    return <BuildingSeason variant="building" progress={pack.data} onRetry={pack.retry} />;
  }
  if (pack.status === 'not-available') {
    return <NotAvailable variant="not-available" onMakeYourOwn={goMakeYourOwn} />;
  }
  if (pack.status === 'error') {
    return <NotAvailable variant="error" onRetry={pack.retry} onMakeYourOwn={goMakeYourOwn} />;
  }

  // --- Ready: provide the pack + identity to the beats -----------------------

  const value = { ...pack.data, you, leagueName };
  const activeBeat = BEATS[nav.beatIndex];
  const BeatComponent = BEAT_COMPONENTS[activeBeat.id] ?? PlaceholderBeat;
  // The card the hidden stage rasterises: the active beat's card while in beats, the
  // carousel-selected card during recap, else null → the Cover card (cover stage).
  const shareBeat =
    stage === 'beats' ? activeBeat : stage === 'recap' ? BEATS[recapIndex] : null;

  return (
    <PackContext.Provider value={value}>
     <LegacyHistoryContext.Provider value={legacyHistory}>
      {/* Off-screen 1080² card the share pipe rasterises (not the visible screen). */}
      <WrappedHiddenStage leagueName={leagueName} beat={shareBeat} stageRef={stageRef} />

      {stage === 'cover' && (
        <Cover leagueName={leagueName} onBegin={() => setStage('beats')} />
      )}

      {stage === 'beats' && (
        <BeatComponent
          beat={BEATS[nav.beatIndex]}
          beats={BEATS}
          beatIndex={nav.beatIndex}
          screenIndex={nav.screenIndex}
          totalSegments={TOTAL_SEGMENTS}
          onNext={nav.next}
          onPrev={() => {
            // step back into the cover from the very first screen
            if (nav.beatIndex === 0 && nav.screenIndex === 0) setStage('cover');
            else nav.prev();
          }}
          onJump={nav.jumpTo}
          onClose={closeToLeagueSelect}
          onShare={handleShare}
        />
      )}

      {stage === 'recap' && (
        <RecapCarousel
          index={recapIndex}
          onIndex={setRecapIndex}
          onShare={handleShare}
          onDownload={handleDownload}
          onReplay={() => { nav.jumpTo(0); setStage('cover'); }}
          onClose={goMakeYourOwn}
        />
      )}
     </LegacyHistoryContext.Provider>
    </PackContext.Provider>
  );
}
