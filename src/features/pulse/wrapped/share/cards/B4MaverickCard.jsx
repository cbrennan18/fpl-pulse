// B4 — Maverick share card. Hero: your BEST punt revealed (the vindication frame,
// NOT the template ranking); worst punt as the counter-note. Name-checks the punt's
// league ownership (owned-by-you-alone vs barely-owned), mirroring the beat's copy.
import CardShell from '../CardShell';
import { CARD, FONT } from '../cardTokens';
import { Label, Hero, Verdict } from './cardBits';
import { useWrapped } from '../../PackContext';
import { computeMaverick, buildVerdict } from '../../calc/maverick';

const ownTag = (p) => (p?.onlyYou ? 'owned by you alone' : 'barely owned in your league');

export default function B4MaverickCard({ beat }) {
  const { entries, members, you, seasonElements, finishedGwIds, playerName, leagueName } = useWrapped();
  const r = computeMaverick({ entries, members, you, seasonElements, finishedGwIds, playerName });
  const shell = { kicker: `${beat.edition} — ${beat.theme}`, leagueName };
  if (!r.you) return <CardShell {...shell} />;
  const { label } = buildVerdict(r);

  return (
    <CardShell {...shell}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: 24 }}>
        <div>
          <Label>Your boldest call</Label>
          {r.best ? (
            <div style={{ marginTop: 12 }}>
              <Hero value={r.best.name} color={CARD.green} size={150} />
              <div style={{ fontFamily: FONT.body, fontSize: 40, color: CARD.ink, marginTop: 14 }}>
                Returned <strong>{r.best.pts}</strong> — {ownTag(r.best)}.
              </div>
            </div>
          ) : (
            <Hero value="No real punts" sub="you stuck to the template" size={120} />
          )}
        </div>

        {r.worst && r.worst !== r.best && (
          <div style={{ marginTop: 20, borderTop: `2px solid ${CARD.ink}`, paddingTop: 16 }}>
            <Label color={CARD.stamp}>The one that didn't</Label>
            <div style={{ fontFamily: FONT.body, fontSize: 34, color: CARD.ink, marginTop: 8 }}>
              {r.worst.name} — just {r.worst.pts} over {r.worst.weeksInSquad} weeks.
            </div>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <Verdict>{label}</Verdict>
        </div>
      </div>
    </CardShell>
  );
}
