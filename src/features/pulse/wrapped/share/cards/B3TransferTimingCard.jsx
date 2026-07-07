// B3 — Transfer Timing share card. Hero: your average swing per transfer; support:
// a simplified you-vs-field strip (your dot per corridor + the league baseline
// mark; no dot selected, per the locked framing). Name-checks the best mover.
import CardShell from '../CardShell';
import { CARD, FONT } from '../cardTokens';
import { Label, Hero, Verdict } from './cardBits';
import { useWrapped } from '../../PackContext';
import { computeTransferTiming, buildVerdict, fmtSwing, corridorLabel } from '../../calc/transferTiming';

// Corridors along x (early → deadline), your swing (green dot) vs the league
// baseline (ink tick), around a zero line. Re-authored small; no interactivity.
function Strip({ dots, baselines }) {
  const width = 900;
  const height = 240;
  const corridors = [...new Set([...baselines.map((b) => b.corridor), ...dots.map((d) => d.corridor)])].sort((a, b) => b - a);
  const vals = [...baselines.map((b) => b.leagueAvgSwing), ...dots.map((d) => d.avgSwing), 0];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i) => 40 + (corridors.length <= 1 ? 0.5 : i / (corridors.length - 1)) * (width - 80);
  const y = (v) => 30 + (1 - (v - min) / span) * (height - 90);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <line x1={20} y1={y(0)} x2={width - 20} y2={y(0)} stroke={CARD.ink} strokeWidth={2} opacity={0.25} />
      {corridors.map((c, i) => {
        const base = baselines.find((b) => b.corridor === c);
        const mine = dots.find((d) => d.corridor === c);
        return (
          <g key={c}>
            {base && <line x1={x(i) - 22} y1={y(base.leagueAvgSwing)} x2={x(i) + 22} y2={y(base.leagueAvgSwing)} stroke={CARD.ink} strokeWidth={5} opacity={0.4} />}
            {mine && <circle cx={x(i)} cy={y(mine.avgSwing)} r={16} fill={CARD.green} />}
            <text x={x(i)} y={height - 12} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={CARD.muted}>
              {corridorLabel(c)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function B3TransferTimingCard({ beat }) {
  const { entries, members, you, bootstrap, seasonElements, finishedGwIds, leagueName } = useWrapped();
  const r = computeTransferTiming({ entries, members, you, bootstrap, seasonElements, finishedGwIds });
  if (!r.you) return <CardShell kicker={`${beat.edition} — ${beat.theme}`} leagueName={leagueName} />;

  const myDots = r.dots.filter((d) => d.isYou);
  return (
    <CardShell kicker={`${beat.edition} — ${beat.theme}`} leagueName={leagueName}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 24 }}>
        <div>
          <Label>Every transfer you made swung</Label>
          <div style={{ marginTop: 12 }}>
            <Hero value={fmtSwing(r.you.avgSwingPerTransfer)} sub="points, on average" color={r.you.avgSwingPerTransfer >= 0 ? CARD.green : CARD.ink} />
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <Strip dots={myDots} baselines={r.corridorBaselines} />
        </div>
        <div style={{ marginTop: 20 }}>
          <Verdict>{buildVerdict(r.you)}</Verdict>
        </div>
      </div>
    </CardShell>
  );
}
