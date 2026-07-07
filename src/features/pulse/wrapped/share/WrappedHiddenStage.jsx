// features/pulse/wrapped/share/WrappedHiddenStage.jsx
//
// Off-screen, full-size container the rasteriser captures from — the Wrapped twin
// of `awards-share/HiddenStage.jsx`. The outer wrapper is `position: fixed;
// left: -99999px` so it's invisible; the inner `stageRef` div is in normal flow so
// html-to-image's <foreignObject> lays it out at true pixel dimensions (position:
// fixed collapses inside foreignObject → blank PNG). The rasterised node is this
// hidden CLONE, never the visible screen.
//
// Renders the CARD for the active beat (Session 2), or the Cover card when no beat
// is active (Session 1). Each card pulls its data from useWrapped() + recomputes
// via the beat's exported compute* fn — a parallel render of the calc, not a
// screenshot of the beat JSX.

import { FORMAT_DIMS } from '../../../league/awards-share/constants';
import CoverCard from './CoverCard';
import { BEAT_CARDS } from './beatCardRegistry';

const DIMS = FORMAT_DIMS.whatsapp; // 1080 × 1080

export default function WrappedHiddenStage({ leagueName, beat, stageRef }) {
  const Card = beat ? BEAT_CARDS[beat.id] : null;
  return (
    <div
      style={{
        position: 'fixed',
        left: -99999,
        top: 0,
        width: DIMS.width,
        height: DIMS.height,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <div ref={stageRef} style={{ width: DIMS.width, height: DIMS.height }}>
        {Card ? <Card beat={beat} /> : <CoverCard leagueName={leagueName} />}
      </div>
    </div>
  );
}
