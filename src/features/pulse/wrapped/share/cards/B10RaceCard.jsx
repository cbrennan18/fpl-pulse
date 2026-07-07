// B10 — The Race share card. Hero: the nemesis revealed + win/loss verdict (the
// unsealed end state). Support: the 3-line rank race chart shrunk (you / nemesis /
// context, rank 1 on top). Name-checks the nemesis — the @-them share payload.
import CardShell from '../CardShell';
import { CARD, FONT } from '../cardTokens';
import { Label, Hero, Verdict } from './cardBits';
import { LineChart } from './chartBits';
import { useWrapped } from '../../PackContext';
import { computeRace, buildVerdict } from '../../calc/race';
import { ordinal } from '../../calc/setAndForget';

export default function B10RaceCard({ beat }) {
  const { entries, members, you, finishedGwIds, leagueName } = useWrapped();
  const r = computeRace({ entries, members, you, finishedGwIds });
  const shell = { kicker: `${beat.edition} — ${beat.theme}`, leagueName };
  if (!r.you || !r.nemesis) return <CardShell {...shell} />;

  const lines = [
    { values: r.context?.series ?? [], color: CARD.muted },
    { values: r.nemesis.series, color: CARD.ink },
    { values: r.you.series, color: CARD.green },
  ];

  return (
    <CardShell {...shell} rivalCheck={
      <div style={{ fontFamily: FONT.mono, fontSize: 24, letterSpacing: '0.16em', textTransform: 'uppercase', color: CARD.green }}>
        You vs {r.nemesis.name}
      </div>
    }>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 24 }}>
        <div>
          <Label>Your nemesis</Label>
          <div style={{ marginTop: 12 }}>
            <Hero value={r.nemesis.name} color={CARD.green} size={150} />
            <div style={{ fontFamily: FONT.mono, fontSize: 30, color: CARD.muted, marginTop: 14, fontVariantNumeric: 'tabular-nums' }}>
              You {ordinal(r.you.finish)} · {r.nemesis.name} {ordinal(r.nemesis.finish)} · margin {Math.abs(r.margin)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <LineChart lines={lines} invertY height={280} />
          <div style={{ fontFamily: FONT.mono, fontSize: 22, color: CARD.muted, letterSpacing: '0.1em', marginTop: 2 }}>
            LEAGUE RANK OVER THE SEASON — <span style={{ color: CARD.green }}>YOU</span> vs <span style={{ color: CARD.ink }}>NEMESIS</span>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Verdict>{buildVerdict(r)}</Verdict>
        </div>
      </div>
    </CardShell>
  );
}
