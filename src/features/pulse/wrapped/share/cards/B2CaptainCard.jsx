// B2 — Captain share card. Hero: your captain accuracy %; support: the
// you/best-picker/winner/league-avg stat-stack (the locked framing — the shrunk
// 3-line chart reads as noise at 1080). Name-checks the best-picker.
import CardShell from '../CardShell';
import { Label, Hero, Verdict, StatRow } from './cardBits';
import { useWrapped } from '../../PackContext';
import { computeCaptain, buildVerdict, pct } from '../../calc/captain';

export default function B2CaptainCard({ beat }) {
  const { entries, members, you, seasonElements, finishedGwIds, leagueName } = useWrapped();
  const r = computeCaptain({ entries, members, you, seasonElements, finishedGwIds });
  if (!r.you) return <CardShell kicker={`${beat.edition} — ${beat.theme}`} leagueName={leagueName} />;

  return (
    <CardShell kicker={`${beat.edition} — ${beat.theme}`} leagueName={leagueName}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 24 }}>
        <div>
          <Label>You nailed the armband</Label>
          <div style={{ marginTop: 12 }}>
            <Hero value={`${pct(r.you.accuracy)}%`} sub="of the weeks" />
          </div>
        </div>
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatRow left="You" right={`${pct(r.you.accuracy)}%`} strong />
          {r.bestPicker && <StatRow left={`Best · ${r.bestPicker.name}`} right={`${pct(r.bestPicker.accuracy)}%`} />}
          {r.winner && <StatRow left={`Winner · ${r.winner.name}`} right={`${pct(r.winner.accuracy)}%`} />}
          <StatRow left="League average" right={`${pct(r.leagueAvgAccuracy)}%`} />
        </div>
        <div style={{ marginTop: 24 }}>
          <Verdict>{buildVerdict(r.you)}</Verdict>
        </div>
      </div>
    </CardShell>
  );
}
