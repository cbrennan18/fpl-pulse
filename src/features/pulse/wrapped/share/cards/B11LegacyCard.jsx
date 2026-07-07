// B11 — Legacy / Coda share card. Hero: your all-time standing ("Nth of N
// all-time"); support: the dots-on-tracks legacy chart shrunk + best-ever year;
// name-checks the all-time leader. Reads CodaBeat's lifted history (never re-fetches)
// and SOFT-FAILS to a clean "come back next year" frame when legacy is null/empty.
import { useMemo } from 'react';
import CardShell from '../CardShell';
import { CARD, FONT } from '../cardTokens';
import { Label, Hero } from './cardBits';
import { DotTracks } from './chartBits';
import { useWrapped } from '../../PackContext';
import { useLegacyHistory } from '../LegacyHistoryContext';
import { computeLeagueLegacy } from '../../calc/leagueLegacy';
import { ordinal } from '../../calc/setAndForget';
import { SEASON_LABEL } from '../../constants';

function ComeBack({ shell }) {
  return (
    <CardShell {...shell}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Label>League legacy</Label>
        <div style={{ marginTop: 12 }}>
          <Hero value="Come back next year" size={120} />
        </div>
        <div style={{ fontFamily: FONT.body, fontSize: 34, color: CARD.muted, marginTop: 16, maxWidth: 760 }}>
          Not enough shared seasons in this league yet — there&apos;ll be a legacy to settle once
          you&apos;ve all played a few more.
        </div>
      </div>
    </CardShell>
  );
}

export default function B11LegacyCard({ beat }) {
  const { entries, members, you, finishedGwIds, leagueName } = useWrapped();
  const { historyByMember } = useLegacyHistory();
  const shell = { kicker: `${beat.edition} — ${beat.theme}`, leagueName };

  const legacy = useMemo(
    () =>
      historyByMember
        ? computeLeagueLegacy({ historyByMember, entries, members, you, finishedGwIds, seasonLabel: SEASON_LABEL })
        : null,
    [historyByMember, entries, members, you, finishedGwIds]
  );
  if (!legacy || legacy.standing?.you?.rank == null) return <ComeBack shell={shell} />;

  const { standing, series, bestEver } = legacy;
  const leader = standing.ranking[0];

  return (
    <CardShell {...shell}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 24 }}>
        <div>
          <Label>All-time in this league, you rank</Label>
          <div style={{ marginTop: 12 }}>
            <Hero value={`${ordinal(standing.you.rank)} of ${standing.you.of}`} sub={leader && !leader.isYou ? `${leader.name} leads all-time` : 'top of the pile'} color={CARD.green} size={150} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <DotTracks series={series} />
          <div style={{ fontFamily: FONT.mono, fontSize: 22, color: CARD.muted, letterSpacing: '0.1em', marginTop: 2 }}>
            YOUR FINISH EACH SEASON — <span style={{ color: CARD.gold }}>●</span> BEST EVER · RINGED = REAL
          </div>
        </div>
        {bestEver && (
          <div style={{ fontFamily: FONT.body, fontSize: 36, color: CARD.ink, marginTop: 16 }}>
            Your best year: <strong>{bestEver.season}</strong> — {ordinal(bestEver.position)} of {bestEver.field}.
          </div>
        )}
      </div>
    </CardShell>
  );
}
