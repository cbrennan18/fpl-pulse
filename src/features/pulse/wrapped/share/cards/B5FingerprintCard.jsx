// B5 — Fingerprint share card. Hero: the weak-link diagnosis ("Nth for defence");
// support: position-share bars (you vs winner) shrunk; name-checks the winner.
import CardShell from '../CardShell';
import { CARD, FONT } from '../cardTokens';
import { Label, Hero, Verdict } from './cardBits';
import { Bars } from './chartBits';
import { useWrapped } from '../../PackContext';
import { computeFingerprint, buildVerdict } from '../../calc/fingerprint';
import { ordinal } from '../../calc/setAndForget';

export default function B5FingerprintCard({ beat }) {
  const { entries, members, you, seasonElements, finishedGwIds, playerPosition, leagueName } = useWrapped();
  const r = computeFingerprint({ entries, members, you, seasonElements, finishedGwIds, playerPosition });
  const shell = { kicker: `${beat.edition} — ${beat.theme}`, leagueName };
  if (!r.you || !r.diagnosis) return <CardShell {...shell} />;

  const { weakest } = r.diagnosis;
  const groups = r.chart.positions.map((p) => ({
    label: p.label,
    bars: [
      { value: p.you, color: CARD.green },
      { value: p.winner, color: CARD.ink },
    ],
  }));

  return (
    <CardShell {...shell}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 24 }}>
        <div>
          <Label>Your weak link</Label>
          <div style={{ marginTop: 12 }}>
            <Hero value={`${ordinal(weakest.rank)} of ${r.count}`} sub={`for ${weakest.label} in your league`} color={CARD.ink} size={160} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Bars groups={groups} />
          <div style={{ fontFamily: FONT.mono, fontSize: 22, color: CARD.muted, letterSpacing: '0.1em', marginTop: 4 }}>
            <span style={{ color: CARD.green }}>■</span> YOU &nbsp; <span style={{ color: CARD.ink }}>■</span> WINNER{r.winner ? ` · ${r.winner.name}` : ''} — % OF POINTS BY POSITION
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <Verdict>{buildVerdict(r.diagnosis, r.count)}</Verdict>
        </div>
      </div>
    </CardShell>
  );
}
