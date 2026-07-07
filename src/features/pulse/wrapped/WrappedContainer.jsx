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

import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
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

  const sessionId = Number(searchParams.get('id')) || null;
  const viaLink = searchParams.get('via') === 'link';
  const leagueParam = Number(searchParams.get('league')) || null;

  const [leagueId, setLeagueId] = useState(leagueParam);
  const [leagueName, setLeagueName] = useState('');
  const [you, setYou] = useState(viaLink ? null : sessionId);
  const [stage, setStage] = useState('cover'); // post-ready: cover | beats | recap
  // Beat 11's fetched history, lifted out of CodaBeat so its share card can read it
  // (the one beat that fetches — see LegacyHistoryContext). CodaBeat writes; card reads.
  const [historyByMember, setHistoryByMember] = useState(null);

  const pack = usePack(leagueId);
  const nav = useBeatNavigation({ beats: BEATS, onComplete: () => setStage('recap') });
  // Share pipe: rasterise the off-screen card node → 1080² PNG → native share.
  // Session 1 exports the Cover card behind every beat's onShare (per-beat cards
  // swap in later behind the same handle).
  const { stageRef, share: handleShare } = useShareCard({ leagueName });
  const legacyHistory = useMemo(() => ({ historyByMember, setHistoryByMember }), [historyByMember]);

  const goMakeYourOwn = () => navigate('/'); // general entry establishes identity at the dashboard

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
        onPick={(entry, name) => { setYou(entry); setLeagueName(name); }}
        onMakeYourOwn={goMakeYourOwn}
      />
    );
  }

  // General ramp: choose a league (gated to ingested ones).
  if (!leagueId) {
    return (
      <LeagueSelect
        teamId={sessionId}
        onChoose={(id, name) => { setLeagueId(id); setLeagueName(name); }}
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
  // The card the hidden stage rasterises: the active beat's card while in the beats
  // stage, else the Cover card (cover/recap). Share fires against whatever's mounted.
  const shareBeat = stage === 'beats' ? activeBeat : null;

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
          onClose={goMakeYourOwn}
          onShare={handleShare}
        />
      )}

      {stage === 'recap' && (
        <RecapCarousel
          onReplay={() => { nav.jumpTo(0); setStage('cover'); }}
          onClose={goMakeYourOwn}
        />
      )}
     </LegacyHistoryContext.Provider>
    </PackContext.Provider>
  );
}
