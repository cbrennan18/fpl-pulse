// B7 — Chips share card. Freezes the BIGGER-HAUL HALF (locked): per half, sum your
// played chip gains, pick the larger; one-half managers get that half; none → a
// graceful "no clean read" card. Hero: your best chip + gain; name-checks the
// league-best holder for that chip.
import CardShell from '../CardShell';
import { CARD, FONT } from '../cardTokens';
import { Label, Hero, Verdict, StatRow } from './cardBits';
import { useWrapped } from '../../PackContext';
import { computeChips, buildVerdict, CHIP_KEYS, CHIP_LABEL } from '../../calc/chips';

const HALF_LABEL = { H1: 'First half · GW1–19', H2: 'Second half · GW20+' };

// Played chip keys in a half (gain present), and their summed gain.
function playedIn(mine) {
  const keys = CHIP_KEYS.filter((k) => mine[k] && mine[k].gain != null);
  return { keys, sum: keys.reduce((a, k) => a + mine[k].gain, 0) };
}

export default function B7ChipsCard({ beat }) {
  const { entries, members, you, seasonElements, finishedGwIds, playerPosition, leagueName } = useWrapped();
  const r = computeChips({ entries, members, you, seasonElements, finishedGwIds, playerPosition });
  const shell = { kicker: `${beat.edition} — ${beat.theme}`, leagueName };
  if (!r.you) return <CardShell {...shell} />;

  const h1 = playedIn(r.you.chips.H1);
  const h2 = playedIn(r.you.chips.H2);
  let half = null;
  if (h1.keys.length && h2.keys.length) half = h1.sum >= h2.sum ? 'H1' : 'H2';
  else if (h1.keys.length) half = 'H1';
  else if (h2.keys.length) half = 'H2';

  if (!half) {
    return (
      <CardShell {...shell}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Label>Chips</Label>
          <div style={{ marginTop: 12 }}>
            <Hero value="No clean read" sub="on your chips this season" size={130} />
          </div>
        </div>
      </CardShell>
    );
  }

  const mine = r.you.chips[half];
  const played = playedIn(mine).keys;
  const top = played.reduce((a, b) => (mine[b].gain > mine[a].gain ? b : a));
  const holder = r.leagueBest[half]?.[top];

  return (
    <CardShell {...shell}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 24 }}>
        <div>
          <Label>{HALF_LABEL[half]} · your best lever</Label>
          <div style={{ marginTop: 12 }}>
            <Hero value={`+${mine[top].gain}`} sub={`${CHIP_LABEL[top]} · GW${mine[top].gw}`} color={holder?.isYou ? CARD.gold : CARD.green} />
          </div>
          {holder && !holder.isYou && (
            <div style={{ fontFamily: FONT.body, fontSize: 30, color: CARD.muted, marginTop: 10 }}>
              League best: {holder.name} +{holder.value} (GW{holder.gw})
            </div>
          )}
        </div>
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CHIP_KEYS.map((k) => (
            <StatRow
              key={k}
              left={CHIP_LABEL[k]}
              right={mine[k] && mine[k].gain != null ? `+${mine[k].gain} · GW${mine[k].gw}` : 'not played'}
              strong={k === top}
            />
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <Verdict>{buildVerdict(r, half)}</Verdict>
        </div>
      </div>
    </CardShell>
  );
}
