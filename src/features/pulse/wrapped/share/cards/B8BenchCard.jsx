// B8 — The Bench share card. Locked re-composition: the corrected finish as hero
// ("Nth not Mth") + a MINI heat-strip of recoverable points by GW (not either full
// beat screen). Support: your recoverable total.
import CardShell from '../CardShell';
import { CARD, FONT } from '../cardTokens';
import { Label, Hero, Verdict } from './cardBits';
import { HeatStrip } from './chartBits';
import { useWrapped } from '../../PackContext';
import { computeBench, buildVerdict, ordinal } from '../../calc/bench';

export default function B8BenchCard({ beat }) {
  const { entries, members, you, seasonElements, finishedGwIds, playerPosition, playerName, leagueName } = useWrapped();
  const r = computeBench({ entries, members, you, seasonElements, finishedGwIds, playerPosition, playerName });
  const shell = { kicker: `${beat.edition} — ${beat.theme}`, leagueName };
  if (!r.you) return <CardShell {...shell} />;

  const climbed = r.correctedFinish < r.actualFinish;

  return (
    <CardShell {...shell}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 24 }}>
        <div>
          <Label>Bench-corrected, you finish</Label>
          <div style={{ marginTop: 12 }}>
            <Hero
              value={ordinal(r.correctedFinish)}
              sub={climbed ? `not ${ordinal(r.actualFinish)} — if everyone's bench was fixed` : `your bench wasn't the difference`}
              color={climbed ? CARD.green : CARD.ink}
            />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: FONT.body, fontSize: 40, color: CARD.ink }}>
            <strong>{r.you.recoverableTotal}</strong> points left on your bench
          </div>
          <div style={{ marginTop: 12 }}>
            <HeatStrip cells={r.you.cells} maxCell={r.you.maxCell} />
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 22, color: CARD.muted, letterSpacing: '0.1em', marginTop: 2 }}>
            RECOVERABLE POINTS BY GAMEWEEK
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <Verdict>{buildVerdict(r)}</Verdict>
        </div>
      </div>
    </CardShell>
  );
}
