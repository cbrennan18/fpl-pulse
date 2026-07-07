// B9 — Luck vs Skill share card. Freezes the MINI-LEAGUE tab (locked, never AE64).
// Hero: process rank vs results rank (the luck/skill verdict); support: the 2-line
// expected-vs-actual edge chart shrunk (shaded gap = luck). Aggregate field, no rival.
import CardShell from '../CardShell';
import { CARD, FONT } from '../cardTokens';
import { Label, Hero, Verdict } from './cardBits';
import { LineChart } from './chartBits';
import { useWrapped } from '../../PackContext';
import { computeLuckVsSkill, buildVerdict, ordinal } from '../../calc/luckVsSkill';

const TONE_COLOR = { lucky: CARD.gold, unlucky: CARD.stamp, even: CARD.ink };

export default function B9LuckSkillCard({ beat }) {
  const { entries, members, you, seasonElements, finishedGwIds, playerPosition, leagueName } = useWrapped();
  const r = computeLuckVsSkill({ entries, members, you, seasonElements, finishedGwIds, playerPosition });
  const shell = { kicker: `${beat.edition} — ${beat.theme}`, leagueName };
  if (!r.you || r.processRank == null) return <CardShell {...shell} />;

  return (
    <CardShell {...shell}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 24 }}>
        <div>
          <Label>Your process ranked</Label>
          <div style={{ marginTop: 12 }}>
            <Hero value={`${ordinal(r.processRank)} of ${r.count}`} sub={`your results came in ${ordinal(r.resultsRank)}`} color={TONE_COLOR[r.verdictTone]} size={150} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <LineChart
            lines={[
              { values: r.expectedEdge, color: CARD.green, dashed: true },
              { values: r.actualEdge, color: CARD.green },
            ]}
          />
          <div style={{ fontFamily: FONT.mono, fontSize: 22, color: CARD.muted, letterSpacing: '0.1em', marginTop: 2 }}>
            EXPECTED EDGE (DASHED) vs ACTUAL (SOLID) — THE GAP IS LUCK
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <Verdict>{buildVerdict(r)}</Verdict>
        </div>
      </div>
    </CardShell>
  );
}
