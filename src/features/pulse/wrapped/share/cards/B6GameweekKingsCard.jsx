// B6 — Gameweek Kings share card. Hero: your best single-GW peak; support: the
// weekly-wins leaderboard (top-N + YOUR row); name-checks the wins leader.
import CardShell from '../CardShell';
import { CARD } from '../cardTokens';
import { Label, Hero, Verdict, MiniTable } from './cardBits';
import { useWrapped } from '../../PackContext';
import { computeGameweekKings, buildVerdict } from '../../calc/gameweekKings';
import { topNPlusYou } from './helpers';

export default function B6GameweekKingsCard({ beat }) {
  const { entries, members, you, finishedGwIds, leagueName } = useWrapped();
  const r = computeGameweekKings({ entries, members, you, finishedGwIds });
  const shell = { kicker: `${beat.edition} — ${beat.theme}`, leagueName };
  if (!r.you) return <CardShell {...shell} />;

  const rows = topNPlusYou(r.winsRows, 3).map((row) => ({
    rank: r.winsRows.indexOf(row) + 1,
    name: row.isYou ? 'You' : row.name,
    value: String(row.wins),
    isYou: row.isYou,
  }));

  return (
    <CardShell {...shell}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 24 }}>
        <div>
          <Label>Your biggest week</Label>
          {r.youBest ? (
            <div style={{ marginTop: 12 }}>
              <Hero value={String(r.youBest.value)} sub={`points — GW${r.youBest.gw}`} color={r.youHoldRecord ? CARD.gold : CARD.green} />
            </div>
          ) : (
            <Hero value="—" sub="no finished weeks yet" />
          )}
        </div>
        <div style={{ marginTop: 24 }}>
          <Label>Weeks won</Label>
          <div style={{ marginTop: 12 }}>
            <MiniTable rows={rows} />
          </div>
        </div>
        <div style={{ marginTop: 22 }}>
          <Verdict>{buildVerdict(r)}</Verdict>
        </div>
      </div>
    </CardShell>
  );
}
