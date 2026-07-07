// B1 — Set & Forget share card. Hero: your management delta + rank; support:
// top-3 of byDelta + YOUR row; verdict line. Parallel render of computeSetAndForget.
import CardShell from '../CardShell';
import { CARD } from '../cardTokens';
import { Label, Hero, Verdict, MiniTable } from './cardBits';
import { useWrapped } from '../../PackContext';
import { computeSetAndForget, buildVerdict, ordinal } from '../../calc/setAndForget';
import { topNPlusYou, signed } from './helpers';

export default function B1SetForgetCard({ beat }) {
  const { entries, members, you, seasonElements, finishedGwIds, playerPosition, leagueName } = useWrapped();
  const r = computeSetAndForget({ entries, members, you, seasonElements, finishedGwIds, positionOf: playerPosition });
  if (!r.you) return <CardShell kicker={`${beat.edition} — ${beat.theme}`} leagueName={leagueName} />;

  const rows = topNPlusYou(r.byDelta, 3).map((row, i) => ({
    rank: r.byDelta.indexOf(row) + 1 || i + 1,
    name: row.isYou ? 'You' : row.name,
    value: signed(row.delta),
    isYou: row.isYou,
  }));

  return (
    <CardShell kicker={`${beat.edition} — ${beat.theme}`} leagueName={leagueName}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 24 }}>
        <div>
          <Label>Your moves were worth</Label>
          <div style={{ marginTop: 12 }}>
            <Hero value={signed(r.you.delta)} sub={`${ordinal(r.youDeltaRank)} of ${r.count} in your league`} color={r.you.delta >= 0 ? CARD.green : CARD.ink} />
          </div>
        </div>
        <div style={{ marginTop: 28 }}>
          <MiniTable rows={rows} />
        </div>
        <div style={{ marginTop: 28 }}>
          <Verdict>{buildVerdict(r.you, r.youDeltaRank)}</Verdict>
        </div>
      </div>
    </CardShell>
  );
}
